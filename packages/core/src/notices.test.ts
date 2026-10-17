import assert from 'node:assert/strict';
import test from 'node:test';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { CHAIN_ID, PROJECT, parseSignedNotice, signedNoticeMessage, verifySignedNotice, type NoticeV2 } from './index.js';
import { checkWallet, inspectEntity, publishNotice, walletError, type BrowserProvider } from './arkiv.js';

const account = privateKeyToAccount(generatePrivateKey());
const other = privateKeyToAccount(generatePrivateKey());
const fixture = (): NoticeV2 => ({ version: 2, chainId: CHAIN_ID, project: PROJECT, synthetic: true, id: 'synthetic-test-v2', publisher: account.address, publisherLabel: 'Fictional Practice Office', title: 'Synthetic drill', body: 'Fictional practice notice.', topic: 'Safety', severity: 'info', issuedAt: 1792195200, expiresAt: 1792281600 });
const sign = async (notice = fixture()) => ({ notice, signer: account.address, signature: await account.signMessage({ message: signedNoticeMessage(notice) }) });

test('v2 signatures survive property reordering and reject every changed signed field', async () => {
  const envelope = await sign();
  assert.equal((await verifySignedNotice(envelope, account.address)).status, 'valid');
  const reordered = Object.fromEntries(Object.entries(envelope.notice).reverse()) as NoticeV2;
  assert.equal(signedNoticeMessage(reordered), signedNoticeMessage(envelope.notice));
  for (const [key, value] of Object.entries({ version: 3, chainId: 1, project: 'other', synthetic: false, id: 'changed', publisher: other.address, publisherLabel: 'Other fictional label', title: 'Changed', body: 'Changed', topic: 'Event', severity: 'urgent', issuedAt: 1792195201, expiresAt: 1792281601 })) {
    const altered = { ...envelope, notice: { ...envelope.notice, [key]: value } };
    assert.notEqual((await verifySignedNotice(altered, account.address)).status, 'valid', key);
  }
  assert.notEqual((await verifySignedNotice({ ...envelope, signer: other.address }, account.address)).status, 'valid');
});

test('copied signature does not imply creator provenance', async () => {
  const result = await verifySignedNotice(await sign(), other.address);
  assert.equal(result.status, 'valid');
  if (result.status === 'valid') assert.equal(result.creatorMatches, false);
});

test('untrusted malformed payloads never reach signature success', async () => {
  const envelope = await sign();
  const bad: unknown[] = [null, [], 'text', {}, { ...envelope, signature: '0x1234' }, { ...envelope, signer: 'not-a-wallet' }, { ...envelope, unexpected: 'unsigned' }];
  for (const notice of [{ ...envelope.notice, title: '' }, { ...envelope.notice, body: 'x'.repeat(4001) }, { ...envelope.notice, issuedAt: NaN }, { ...envelope.notice, expiresAt: envelope.notice.issuedAt }, { ...envelope.notice, expiresAt: envelope.notice.issuedAt + 168 * 3600 + 1 }, { ...envelope.notice, severity: '<script>' }, { ...envelope.notice, unsignedField: 'hidden' }]) bad.push({ ...envelope, notice });
  for (const value of bad) {
    assert.equal(parseSignedNotice(value).ok, false);
    assert.equal((await verifySignedNotice(value, account.address)).status, 'malformed');
  }
});

test('a local tampered copy leaves the retrieved envelope untouched', async () => {
  const original = await sign();
  const saved = JSON.stringify(original);
  const local = { ...original, notice: { ...original.notice, body: 'A local simulation edit.' } };
  assert.equal((await verifySignedNotice(local, account.address)).status, 'invalid');
  assert.equal(JSON.stringify(original), saved);
  assert.equal((await verifySignedNotice(original, account.address)).status, 'valid');
});

test('entity reader reports invalid JSON and mismatched query metadata', async () => {
  const envelope = await sign();
  const base = { key: `0x${'ab'.repeat(32)}` as `0x${string}`, creator: account.address, createdAt: 10n, expiresAt: 20n, contentType: 'application/json', attributes: {} };
  assert.equal((await inspectEntity({ ...base, payload: new TextEncoder().encode('{broken') })).verification.status, 'malformed');
  const result = await inspectEntity({ ...base, payload: new TextEncoder().encode(JSON.stringify(envelope)) });
  assert.equal(result.verification.status, 'valid');
  assert.equal(result.attributeMismatch, true);
});

test('wrong chain and changed accounts stop before any signing or transaction request', async () => {
  const calls: string[] = [];
  const provider = { request: async ({ method }: { method: string }) => { calls.push(method); if (method === 'eth_chainId') return '0x1'; throw new Error('Must not sign.'); } } as BrowserProvider;
  await assert.rejects(() => publishNotice(provider, fixture(), () => {}), /Tiramisu/);
  assert.deepEqual(calls, ['eth_chainId']);
  const changed = { request: async ({ method }: { method: string }) => method === 'eth_chainId' ? `0x${CHAIN_ID.toString(16)}` : [other.address] } as BrowserProvider;
  await assert.rejects(() => checkWallet(changed, account.address), /account changed/);
  assert.match(walletError({ cause: { code: 4001 } }), /rejected/);
  assert.equal(walletError(new Error('secret-material')), 'Wallet or transaction failed. Check the selected network, test GLM balance and wallet activity before retrying.');
});

test('wallet signature rejection never advances to a transaction', async () => {
  const calls: string[] = [];
  const stages: string[] = [];
  const now = Math.floor(Date.now() / 1000);
  const notice = { ...fixture(), issuedAt: now, expiresAt: now + 3600 };
  const provider = { request: async ({ method }: { method: string }) => {
    calls.push(method);
    if (method === 'eth_chainId') return `0x${CHAIN_ID.toString(16)}`;
    if (method === 'eth_accounts') return [account.address];
    if (method === 'personal_sign') throw { code: 4001 };
    throw new Error('Unexpected wallet request.');
  } } as BrowserProvider;
  await assert.rejects(() => publishNotice(provider, notice, stage => stages.push(stage)));
  assert.deepEqual(stages, ['signature']);
  assert.ok(calls.includes('personal_sign'));
  assert.equal(calls.includes('eth_sendTransaction'), false);
});
