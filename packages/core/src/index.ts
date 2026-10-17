import { verifyMessage, type Address, type Hex } from 'viem';
export * from './notices.js';

export const CHAIN_ID = 7738577;
export const RPC_URL = 'https://rpc.tiramisu.db-chain.testnet.arkiv.network';
export const PROJECT = 'beacon.synthetic.v1';
export type Notice = {
  version: 1;
  id: string;
  publisher: string;
  title: string;
  body: string;
  issuedAt: number;
};

// Fixed field order and domain separate Beacon notices from arbitrary messages.
export function noticeMessage(notice: Notice): string {
  return JSON.stringify({
    domain: 'Beacon synthetic notice v1', chainId: CHAIN_ID,
    version: notice.version, id: notice.id, publisher: notice.publisher,
    title: notice.title, body: notice.body, issuedAt: notice.issuedAt,
  });
}

export async function verifyNotice(notice: Notice, address: Address, signature: Hex): Promise<boolean> {
  try { return await verifyMessage({ address, signature, message: noticeMessage(notice) }); }
  catch { return false; }
}
