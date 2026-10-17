import { NoEntityFoundError } from '@arkiv-network/sdk';
import type { Hex } from 'viem';
import { CHAIN_ID, PROJECT } from './index.js';
import { publicClient, inspectEntity, type FeedNotice } from './arkiv.js';

export const isEntityKey = (key: unknown): key is Hex => typeof key === 'string' && /^0x[0-9a-fA-F]{64}$/.test(key);
export function noticePath(key: string): string {
  if (!isEntityKey(key)) throw new Error('Invalid entity key.');
  return `/notice/${key.toLowerCase()}`;
}
export type NoticeReader = Pick<typeof publicClient, 'getChainId' | 'getEntity' | 'getBlockNumber'>;
export type SharedNoticeResult =
  | { status: 'ready' | 'expired' | 'malformed'; row: FeedNotice; blockNumber: bigint }
  | { status: 'invalid-link' | 'missing-or-expired' | 'unavailable' };

/** One exact entity key, no wallet and no silently substituted feed record. */
export async function loadSharedNotice(key: string, source: NoticeReader = publicClient): Promise<SharedNoticeResult> {
  if (!isEntityKey(key)) return { status: 'invalid-link' };
  try {
    if (await source.getChainId() !== CHAIN_ID) return { status: 'unavailable' };
    const entity = await source.getEntity(key);
    if (entity.key.toLowerCase() !== key.toLowerCase()) return { status: 'unavailable' };
    const blockNumber = await source.getBlockNumber();
    const row = await inspectEntity(entity);
    const inProject = entity.attributes.project?.type === 'str' && entity.attributes.project.value === PROJECT && entity.attributes.type?.type === 'str' && entity.attributes.type.value === 'notice';
    if (!inProject) row.verification = { status: 'malformed', label: 'Malformed notice', reason: 'This entity is not indexed as a Beacon notice.' };
    if (row.verification.status === 'malformed') return { status: 'malformed', row, blockNumber };
    const n = row.verification.envelope.notice;
    const expired = entity.expiresAt <= blockNumber || (n.version === 2 && n.expiresAt <= Math.floor(Date.now() / 1000));
    return { status: expired ? 'expired' : 'ready', row, blockNumber };
  } catch (error) {
    // SDK intentionally cannot distinguish never-created, deleted and expired entities.
    return { status: error instanceof NoEntityFoundError ? 'missing-or-expired' : 'unavailable' };
  }
}
