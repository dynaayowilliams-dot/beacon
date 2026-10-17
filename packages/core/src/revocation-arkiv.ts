import { createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { str, u64 } from '@arkiv-network/sdk/attr';
import { eq } from '@arkiv-network/sdk/query';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { custom, type Hex } from 'viem';
import { CHAIN_ID, PROJECT } from './index.js';
import { publicClient, checkWallet, WalletFlowError, type BrowserProvider, type FeedNotice, type PublishedNotice, type PublishStage } from './arkiv.js';
import { loadSharedNotice } from './sharing.js';
import { originalNoticeDigest, revocationMessage, verifyRevocation, type Revocation, type SignedRevocation } from './revocations.js';

export const REVOCATION_GRACE_BLOCKS = 302400n; // Seven days at Tiramisu's nominal two-second blocks.
type RevocationEntity = { key: Hex; creator: `0x${string}`; payload: Uint8Array; contentType: string; expiresAt: bigint };
export type RevocationPage = { entities: readonly RevocationEntity[]; blockNumber: bigint; cursor: string | undefined; next: () => Promise<RevocationPage> };
export type RevocationStatus =
  | { status: 'revoked'; key: Hex; record: SignedRevocation; expiresAtBlock: bigint; checkedAtBlock: bigint }
  | { status: 'not-found'; checkedAtBlock: bigint; ignored: number }
  | { status: 'unknown'; reason: string };

async function firstPage(key: Hex): Promise<RevocationPage> {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('Wrong RPC chain.');
  return publicClient.select().where(eq('project', str(PROJECT)), eq('type', str('revocation')), eq('notice_key', str(key.toLowerCase()))).limit(100).fetch();
}
export async function readRevocationStatus(original: FeedNotice, query: (key: Hex) => Promise<RevocationPage> = firstPage): Promise<RevocationStatus> {
  if (original.verification.status !== 'valid') return { status: 'unknown', reason: 'Cannot establish a valid original publisher signature.' };
  let ignored = 0;
  try {
    let page = await query(original.key);
    const snapshot = page.blockNumber;
    for (let count = 0; count < 20; count++) {
      if (page.blockNumber !== snapshot) throw new Error('Inconsistent revocation snapshot.');
      for (const entity of page.entities) {
        if (entity.contentType !== 'application/json' || entity.payload.length > 12000 || entity.expiresAt <= snapshot) { ignored++; continue; }
        let value: unknown;
        try { value = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entity.payload)); } catch { ignored++; continue; }
        const record = await verifyRevocation(value, original.verification.envelope, original.key);
        // Signed retention bound also applies if somebody extends the storage externally.
        if (record && BigInt(record.revocation.expiresAtBlock) > snapshot && record.revocation.timestamp <= Math.floor(Date.now() / 1000) + 300) {
          return { status: 'revoked', key: entity.key, record, expiresAtBlock: entity.expiresAt < BigInt(record.revocation.expiresAtBlock) ? entity.expiresAt : BigInt(record.revocation.expiresAtBlock), checkedAtBlock: snapshot };
        }
        ignored++;
      }
      if (!page.cursor) return { status: 'not-found', checkedAtBlock: snapshot, ignored };
      if (count === 19) return { status: 'unknown', reason: 'Revocation lookup exceeded 2,000 candidates. No active status can be inferred.' };
      page = await page.next();
    }
  } catch { return { status: 'unknown', reason: 'Revocation lookup failed or was incomplete. Retry when Tiramisu is available.' }; }
  return { status: 'unknown', reason: 'Revocation lookup did not finish.' };
}

/** Separate signed entity only: never deletes, patches or transfers the notice. */
export async function publishRevocation(provider: BrowserProvider, original: FeedNotice, reason: string, onStage: (stage: PublishStage) => void): Promise<PublishedNotice> {
  if (original.verification.status !== 'valid') throw new WalletFlowError('Only a notice with a valid original signature can be revoked.');
  const signer = original.verification.envelope.signer;
  await checkWallet(provider, signer);
  if (!reason.trim() || reason.trim().length > 1000) throw new WalletFlowError('Enter a synthetic revocation reason, at most 1000 characters.');
  // Fetch the exact entity again so a stale feed or modified local row cannot choose the target.
  const fresh = await loadSharedNotice(original.key);
  if (!('row' in fresh) || fresh.row.verification.status !== 'valid') throw new WalletFlowError('The original notice could not be loaded and verified. Nothing was revoked.');
  const row = fresh.row;
  const envelope = fresh.row.verification.envelope;
  if (envelope.signer.toLowerCase() !== signer.toLowerCase() || originalNoticeDigest(envelope) !== originalNoticeDigest(original.verification.envelope)) throw new WalletFlowError('The original notice changed. Refresh before revoking.');
  if (row.expiresAtBlock <= fresh.blockNumber) throw new WalletFlowError('The original entity has expired.');
  const revocation: Revocation = { version: 1, chainId: CHAIN_ID, project: PROJECT, action: 'revoke', noticeEntityKey: row.key, noticeDigest: originalNoticeDigest(envelope), publisher: signer, reason: reason.trim(), timestamp: Math.floor(Date.now() / 1000), expiresAtBlock: (row.expiresAtBlock + REVOCATION_GRACE_BLOCKS).toString() };
  const wallet = createWalletClient({ chain: tiramisu, account: signer, transport: custom(provider) });
  onStage('signature');
  const signature = await wallet.signMessage({ account: signer, message: revocationMessage(revocation) });
  const payload = { revocation, signature };
  if (!await verifyRevocation(payload, envelope, row.key)) throw new WalletFlowError('Revocation signature could not be verified. Nothing was submitted.');
  await checkWallet(provider, signer);
  onStage('transaction');
  const result = await wallet.createEntity({ payload: jsonToPayload(payload), contentType: 'application/json', attributes: { project: str(PROJECT), type: str('revocation'), notice_key: str(row.key.toLowerCase()), notice_digest: str(revocation.noticeDigest.toLowerCase()), timestamp: u64(revocation.timestamp), protocol_version: u64(1) }, expires: ExpirationTime.atBlock(BigInt(revocation.expiresAtBlock)) });
  onStage('confirmation');
  let receipt;
  try { receipt = await publicClient.waitForTransactionReceipt({ hash: result.txHash, timeout: 60_000 }); }
  catch { return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: result.expiresAt, readback: false }; }
  if (receipt.status !== 'success') throw Object.assign(new WalletFlowError('Revocation transaction reverted. No revocation success is claimed.'), { txHash: result.txHash });
  onStage('readback');
  try {
    for (let i = 0; i < 8; i++) {
      const status = await readRevocationStatus(row);
      if (status.status === 'revoked') {
        const entity = await publicClient.getEntity(result.entityKey);
        if (entity.toText() === JSON.stringify(payload) && await verifyRevocation(entity.toJson(), envelope, row.key)) return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: entity.expiresAt, readback: true };
      }
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  } catch { /* createEntity already confirmed via wallet transport; preserve its public receipt. */ }
  return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: result.expiresAt, readback: false };
}
