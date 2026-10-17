import { isAddress, verifyMessage, type Address, type Hex } from 'viem';
import { CHAIN_ID, PROJECT, noticeMessage, type Notice } from './index.js';

export const TOPICS = ['Community', 'Maintenance', 'Event', 'Safety'] as const;
export const SEVERITIES = ['info', 'warning', 'urgent'] as const;
export type NoticeV2 = {
  version: 2; chainId: typeof CHAIN_ID; project: typeof PROJECT; synthetic: true;
  id: string; publisher: Address; publisherLabel: string; title: string; body: string;
  topic: typeof TOPICS[number]; severity: typeof SEVERITIES[number];
  issuedAt: number; expiresAt: number;
};
export type SignedNotice = { notice: Notice | NoticeV2; signer: Address; signature: Hex };
export type ParseResult = { ok: true; value: SignedNotice } | { ok: false; reason: string };
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const exact = (value: Record<string, unknown>, keys: string[]) => Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const text = (value: unknown, max: number): value is string => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
const seconds = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0 && value <= 8_640_000_000;
const address = (value: unknown): value is Address => typeof value === 'string' && isAddress(value, { strict: false });
const legacyKeys = ['version', 'id', 'publisher', 'title', 'body', 'issuedAt'];
const v2Keys = ['version', 'chainId', 'project', 'synthetic', 'id', 'publisher', 'publisherLabel', 'title', 'body', 'topic', 'severity', 'issuedAt', 'expiresAt'];

/** Validate untrusted payloads before using any field in the UI or verifier. */
export function parseSignedNotice(input: unknown): ParseResult {
  const fail = (reason: string): ParseResult => ({ ok: false, reason });
  if (!object(input) || !exact(input, ['notice', 'signer', 'signature'])) return fail('Unsupported signed envelope.');
  if (!address(input.signer)) return fail('Invalid publisher wallet address.');
  if (typeof input.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(input.signature)) return fail('Invalid EIP-191 signature encoding.');
  const n = input.notice;
  if (!object(n) || (n.version !== 1 && n.version !== 2)) return fail('Unsupported notice version.');
  if (!exact(n, n.version === 1 ? legacyKeys : v2Keys)) return fail('Missing or unexpected notice fields.');
  if (!text(n.id, 80) || !/^[a-zA-Z0-9_-]+$/.test(n.id) || !text(n.title, 140) || !text(n.body, 4000) || !seconds(n.issuedAt)) return fail('Invalid notice content or issued time.');
  if (n.version === 1) {
    if (!text(n.publisher, 100)) return fail('Invalid legacy publisher label.');
  } else {
    if (n.chainId !== CHAIN_ID || n.project !== PROJECT || n.synthetic !== true) return fail('Wrong network, project, or synthetic-data marker.');
    if (!address(n.publisher) || n.publisher.toLowerCase() !== input.signer.toLowerCase()) return fail('Publisher does not match signing wallet.');
    if (!text(n.publisherLabel, 100) || !TOPICS.includes(n.topic as NoticeV2['topic']) || !SEVERITIES.includes(n.severity as NoticeV2['severity'])) return fail('Invalid publisher label, topic or severity.');
    if (!seconds(n.expiresAt) || n.expiresAt <= n.issuedAt || n.expiresAt - n.issuedAt > 168 * 3600) return fail('Invalid signed expiration (maximum seven days).');
  }
  return { ok: true, value: input as unknown as SignedNotice };
}

/** Versioned fixed-field serialization. No trimming or defaults on verification. */
export function signedNoticeMessage(notice: Notice | NoticeV2): string {
  if (notice.version === 1) return noticeMessage(notice);
  return JSON.stringify({
    domain: 'Beacon synthetic notice v2', version: notice.version,
    chainId: notice.chainId, project: notice.project, synthetic: notice.synthetic,
    id: notice.id, publisher: notice.publisher.toLowerCase(), publisherLabel: notice.publisherLabel,
    title: notice.title, body: notice.body, topic: notice.topic, severity: notice.severity,
    issuedAt: notice.issuedAt, expiresAt: notice.expiresAt,
  });
}

export type Verification =
  | { status: 'valid'; label: 'Valid wallet signature'; envelope: SignedNotice; creatorMatches: boolean }
  | { status: 'invalid'; label: 'Invalid wallet signature'; envelope: SignedNotice }
  | { status: 'malformed'; label: 'Malformed notice'; reason: string };

export async function verifySignedNotice(input: unknown, creator: Address): Promise<Verification> {
  const parsed = parseSignedNotice(input);
  if (!parsed.ok) return { status: 'malformed', label: 'Malformed notice', reason: parsed.reason };
  const envelope = parsed.value;
  try {
    const valid = await verifyMessage({ address: envelope.signer, signature: envelope.signature, message: signedNoticeMessage(envelope.notice) });
    if (valid) return { status: 'valid', label: 'Valid wallet signature', envelope, creatorMatches: creator.toLowerCase() === envelope.signer.toLowerCase() };
  } catch { /* Bad recovery is an invalid signature, not a connection error. */ }
  return { status: 'invalid', label: 'Invalid wallet signature', envelope };
}
