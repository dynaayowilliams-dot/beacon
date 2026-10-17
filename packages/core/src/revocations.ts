import { hashMessage, isAddress, verifyMessage, type Address, type Hex } from 'viem';
import { CHAIN_ID, PROJECT, signedNoticeMessage, verifySignedNotice, type SignedNotice } from './index.js';
import { isEntityKey } from './sharing.js';

export type Revocation = {
  version: 1; chainId: typeof CHAIN_ID; project: typeof PROJECT; action: 'revoke';
  noticeEntityKey: Hex; noticeDigest: Hex; publisher: Address; reason: string; timestamp: number;
  expiresAtBlock: string;
};
export type SignedRevocation = { revocation: Revocation; signature: Hex };
export function originalNoticeDigest(envelope: SignedNotice): Hex { return hashMessage(signedNoticeMessage(envelope.notice)); }
export function revocationMessage(r: Revocation): string {
  return JSON.stringify({ domain: 'Beacon signed revocation v1', version: r.version, chainId: r.chainId, project: r.project, action: r.action,
    noticeEntityKey: r.noticeEntityKey.toLowerCase(), noticeDigest: r.noticeDigest.toLowerCase(), publisher: r.publisher.toLowerCase(), reason: r.reason, timestamp: r.timestamp, expiresAtBlock: r.expiresAtBlock });
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, fields: string[]) => Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));
export function parseRevocation(value: unknown): SignedRevocation | undefined {
  if (!object(value) || !exact(value, ['revocation', 'signature']) || typeof value.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(value.signature)) return;
  const r = value.revocation;
  if (!object(r) || !exact(r, ['version', 'chainId', 'project', 'action', 'noticeEntityKey', 'noticeDigest', 'publisher', 'reason', 'timestamp', 'expiresAtBlock'])) return;
  if (r.version !== 1 || r.chainId !== CHAIN_ID || r.project !== PROJECT || r.action !== 'revoke' || !isEntityKey(r.noticeEntityKey) || !isEntityKey(r.noticeDigest)) return;
  if (typeof r.publisher !== 'string' || !isAddress(r.publisher, { strict: false }) || typeof r.reason !== 'string' || !r.reason.trim() || r.reason.length > 1000) return;
  if (typeof r.timestamp !== 'number' || !Number.isSafeInteger(r.timestamp) || r.timestamp <= 0 || r.timestamp > 8_640_000_000) return;
  if (typeof r.expiresAtBlock !== 'string' || !/^[1-9][0-9]{0,19}$/.test(r.expiresAtBlock) || BigInt(r.expiresAtBlock) > 2n ** 64n - 1n) return;
  return value as unknown as SignedRevocation;
}
export async function verifyRevocation(value: unknown, original: SignedNotice, entityKey: Hex): Promise<SignedRevocation | undefined> {
  const parsed = parseRevocation(value);
  if (!parsed || !isEntityKey(entityKey)) return;
  const originalCheck = await verifySignedNotice(original, original.signer);
  if (originalCheck.status !== 'valid') return;
  const r = parsed.revocation;
  if (r.noticeEntityKey.toLowerCase() !== entityKey.toLowerCase() || r.noticeDigest.toLowerCase() !== originalNoticeDigest(original).toLowerCase() || r.publisher.toLowerCase() !== original.signer.toLowerCase()) return;
  try {
    if (await verifyMessage({ address: original.signer, message: revocationMessage(r), signature: parsed.signature })) return parsed;
  } catch { /* Untrusted revocation is ignored, never treated as authorization. */ }
}
