import { secp256k1 } from '@noble/curves/secp256k1';
import { hashMessage, hexToBytes, keccak256, toHex, type Address, type Hex } from 'viem';
import { CHAIN_ID, PROJECT, signedNoticeMessage, type NoticeV2, type SignedNotice } from './index.js';

/** Browser-only demo signer: unfunded ephemeral entropy, never saved or printed. */
export function createLocalDemo(): SignedNotice {
  const demoScalar = new Uint8Array(32);
  do { globalThis.crypto.getRandomValues(demoScalar); } while (!secp256k1.utils.isValidPrivateKey(demoScalar));
  try {
    const publicPoint = secp256k1.getPublicKey(demoScalar, false);
    const publisher = `0x${keccak256(publicPoint.slice(1)).slice(-40)}` as Address;
    const now = Math.floor(Date.now() / 1000);
    const notice: NoticeV2 = { version: 2, chainId: CHAIN_ID, project: PROJECT, synthetic: true, id: globalThis.crypto.randomUUID(), publisher, publisherLabel: 'Fictional Local Demo Studio', title: 'A locally signed practice notice', body: 'The fictional reading room opens at ten. Edit this local copy to see its signature fail.', topic: 'Community', severity: 'info', issuedAt: now, expiresAt: now + 3600 };
    const signed = secp256k1.sign(hexToBytes(hashMessage(signedNoticeMessage(notice))), demoScalar, { lowS: true });
    const signature = `${toHex(signed.toCompactRawBytes())}${(27 + signed.recovery).toString(16)}` as Hex;
    return { notice, signer: publisher, signature };
  } finally { demoScalar.fill(0); }
}
