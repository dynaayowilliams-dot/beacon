import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { noticeMessage, verifyNotice, type Notice } from './index.js';

test('signature accepts original notice and rejects tampering and another wallet', async () => {
  // Ephemeral test accounts: never funded, persisted or printed.
  const signer = privateKeyToAccount(generatePrivateKey());
  const other = privateKeyToAccount(generatePrivateKey());
  const notice: Notice = { version: 1, id: 'synthetic-test', publisher: 'Fictional Beacon Office', title: 'Practice', body: 'Synthetic drill notice.', issuedAt: 1792195200 };
  const signature = await signer.signMessage({ message: noticeMessage(notice) });
  assert.equal(await verifyNotice(notice, signer.address, signature), true);
  assert.equal(await verifyNotice({ ...notice, body: 'Altered' }, signer.address, signature), false);
  assert.equal(await verifyNotice(notice, other.address, signature), false);
});
