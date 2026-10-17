import { createPublicClient, createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { str, u64 } from '@arkiv-network/sdk/attr';
import { eq } from '@arkiv-network/sdk/query';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { custom, http, isAddress, type Address, type EIP1193Provider, type Hex } from 'viem';
import { CHAIN_ID, PROJECT, RPC_URL, parseSignedNotice, signedNoticeMessage, verifySignedNotice, type NoticeV2, type Verification } from './index.js';

export type BrowserProvider = EIP1193Provider & {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
};
export const explorer = 'https://tiramisu.explorer.arkiv.network';
export const publicClient = createPublicClient({ chain: tiramisu, transport: http(RPC_URL, { timeout: 15_000, retryCount: 0 }) });
export type FeedNotice = {
  key: Hex; creator: Address; createdAtBlock: bigint; expiresAtBlock: bigint;
  verification: Verification; attributeMismatch: boolean;
};
export type FeedPage = { notices: FeedNotice[]; cursor: string | undefined; blockNumber: bigint };

type EntityInput = {
  key: Hex; creator: Address; createdAt: bigint; expiresAt: bigint;
  contentType: string; payload: Uint8Array;
  attributes: Record<string, { type: string; value: unknown }>;
};
/** Malformed data is an explicit row, never silently dropped or replaced. */
export async function inspectEntity(entity: EntityInput): Promise<FeedNotice> {
  let payload: unknown;
  let verification: Verification;
  try {
    if (entity.contentType !== 'application/json' || entity.payload.length > 32_000) throw new Error();
    payload = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(entity.payload));
    verification = await verifySignedNotice(payload, entity.creator);
  } catch {
    verification = { status: 'malformed', label: 'Malformed notice', reason: 'Unreadable or oversized JSON payload.' };
  }
  let attributeMismatch = false;
  if (verification.status !== 'malformed') {
    const n = verification.envelope.notice;
    const expected: Record<string, string | bigint> = { project: PROJECT, type: 'notice', notice_id: n.id, issued_at: BigInt(n.issuedAt) };
    if (n.version === 2) Object.assign(expected, { schema_version: 2n, topic: n.topic, severity: n.severity, expires_at: BigInt(n.expiresAt) });
    attributeMismatch = Object.entries(expected).some(([name, value]) => {
      const actual = entity.attributes[name];
      return !actual || actual.type !== (typeof value === 'bigint' ? 'u64' : 'str') || actual.value !== value;
    });
  }
  return { key: entity.key, creator: entity.creator, createdAtBlock: entity.createdAt, expiresAtBlock: entity.expiresAt, verification, attributeMismatch };
}

export async function fetchNoticePage(cursor?: string): Promise<FeedPage> {
  if (await publicClient.getChainId() !== CHAIN_ID) throw new Error('Unexpected RPC network.');
  const query = publicClient.select().where(eq('project', str(PROJECT)), eq('type', str('notice'))).limit(50);
  if (cursor) query.cursor(cursor);
  const page = await query.fetch();
  const notices = await Promise.all(page.entities.map(entity => inspectEntity(entity)));
  // Sort only fetched entities. Cursor pages do not imply global server ordering.
  notices.sort((a, b) => a.createdAtBlock === b.createdAtBlock ? a.key.localeCompare(b.key) : a.createdAtBlock > b.createdAtBlock ? -1 : 1);
  return { notices, cursor: page.cursor, blockNumber: page.blockNumber };
}

export class WalletFlowError extends Error {}
/** Extract only a public transaction hash from SDK failure metadata. */
export function transactionHash(error: unknown): Hex | undefined {
  let current: unknown = error;
  for (let i = 0; i < 8 && current && typeof current === 'object'; i++) {
    const item = current as { txHash?: unknown; cause?: unknown };
    if (typeof item.txHash === 'string' && /^0x[0-9a-fA-F]{64}$/.test(item.txHash)) return item.txHash as Hex;
    current = item.cause;
  }
}
export async function walletAddress(provider: BrowserProvider, prompt = false): Promise<Address> {
  const accounts = await provider.request({ method: prompt ? 'eth_requestAccounts' : 'eth_accounts' });
  const account = accounts[0];
  if (!account || !isAddress(account)) throw new WalletFlowError('Connect a browser wallet first.');
  return account;
}
export async function checkWallet(provider: BrowserProvider, expected?: Address): Promise<Address> {
  if (Number(await provider.request({ method: 'eth_chainId' })) !== CHAIN_ID) throw new WalletFlowError('Switch your wallet to Tiramisu before signing or publishing.');
  const account = await walletAddress(provider);
  if (expected && account.toLowerCase() !== expected.toLowerCase()) throw new WalletFlowError('The selected wallet account changed. Reconnect and try again.');
  return account;
}
export async function switchToTiramisu(provider: BrowserProvider): Promise<void> {
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
  } catch (error) {
    if (Number((error as { code?: number }).code) !== 4902) throw error;
    await provider.request({ method: 'wallet_addEthereumChain', params: [{
      chainId: `0x${CHAIN_ID.toString(16)}`, chainName: 'Arkiv Tiramisu', nativeCurrency: tiramisu.nativeCurrency,
      rpcUrls: [RPC_URL], blockExplorerUrls: [explorer],
    }] });
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }] });
  }
}

/** Return only safe messages; never render SDK errors or raw wallet requests. */
export function walletError(error: unknown): string {
  let current: unknown = error;
  for (let i = 0; i < 8 && current && typeof current === 'object'; i++) {
    const item = current as { code?: number; cause?: unknown };
    if (item.code === 4001) return 'Request rejected in your wallet. Nothing further was requested.';
    current = item.cause;
  }
  if (error instanceof WalletFlowError) return error.message;
  if (transactionHash(error)) return 'A transaction was submitted, but publication did not finish. Check its explorer receipt before trying another notice.';
  return 'Wallet or transaction failed. Check the selected network, test GLM balance and wallet activity before retrying.';
}
export type PublishedNotice = { txHash: Hex; entityKey: Hex; expiresAtBlock: bigint; readback: boolean };
export type PublishStage = 'signature' | 'transaction' | 'confirmation' | 'readback';
export async function publishNotice(provider: BrowserProvider, notice: NoticeV2, onStage: (stage: PublishStage) => void): Promise<PublishedNotice> {
  const account = await checkWallet(provider, notice.publisher);
  // Validate before asking for a signature. Dummy bytes are used only for shape validation.
  if (!parseSignedNotice({ notice, signer: account, signature: `0x${'00'.repeat(65)}` }).ok || notice.expiresAt <= Math.floor(Date.now() / 1000)) throw new WalletFlowError('Check the notice fields and expiration before publishing.');
  const wallet = createWalletClient({ chain: tiramisu, account, transport: custom(provider) });
  onStage('signature');
  const signature = await wallet.signMessage({ account, message: signedNoticeMessage(notice) });
  const envelope = { notice, signer: account, signature };
  const checked = await verifySignedNotice(envelope, account);
  if (checked.status !== 'valid') throw new WalletFlowError('The wallet signature could not be verified. Nothing was published.');
  await checkWallet(provider, account);
  if (notice.expiresAt <= Math.floor(Date.now() / 1000)) throw new WalletFlowError('The signed deadline passed. Create a fresh notice.');
  onStage('transaction');
  const result = await wallet.createEntity({
    payload: jsonToPayload(envelope), contentType: 'application/json',
    attributes: { project: str(PROJECT), type: str('notice'), notice_id: str(notice.id), issued_at: u64(notice.issuedAt), schema_version: u64(2), topic: str(notice.topic), severity: str(notice.severity), expires_at: u64(notice.expiresAt) },
    expires: ExpirationTime.atDate(new Date(notice.expiresAt * 1000)),
  });
  onStage('confirmation');
  // createEntity already waits internally; the independent public receipt check confirms the chain outcome.
  let confirmed;
  try { confirmed = await publicClient.waitForTransactionReceipt({ hash: result.txHash, timeout: 60_000 }); }
  catch {
    // SDK createEntity already checked its wallet transport receipt. Preserve public identifiers.
    return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: result.expiresAt, readback: false };
  }
  if (confirmed.status !== 'success') throw new WalletFlowError('Transaction reverted. The notice was not published.');
  onStage('readback');
  for (let i = 0; i < 8; i++) {
    try {
      const page = await publicClient.select().where(eq('project', str(PROJECT)), eq('type', str('notice')), eq('notice_id', str(notice.id))).createdBy(account).limit(10).fetch();
      const entity = page.entities.find(item => item.key.toLowerCase() === result.entityKey.toLowerCase());
      if (entity) {
        const row = await inspectEntity(entity);
        if (row.verification.status === 'valid' && row.verification.creatorMatches && !row.attributeMismatch && entity.toText() === JSON.stringify(envelope) && entity.expiresAt > page.blockNumber) return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: entity.expiresAt, readback: true };
      }
    } catch { /* A confirmed transaction must remain visible even if indexing/RPC is delayed. */ }
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  return { txHash: result.txHash, entityKey: result.entityKey, expiresAtBlock: result.expiresAt, readback: false };
}
