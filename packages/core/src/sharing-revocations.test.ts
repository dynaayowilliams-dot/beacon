import assert from 'node:assert/strict';
import test from 'node:test';
import { NoEntityFoundError } from '@arkiv-network/sdk';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { CHAIN_ID, PROJECT, signedNoticeMessage, verifySignedNotice, type NoticeV2 } from './index.js';
import { inspectEntity } from './arkiv.js';
import { loadSharedNotice, noticePath, type NoticeReader } from './sharing.js';
import { originalNoticeDigest, revocationMessage, verifyRevocation, type Revocation } from './revocations.js';
import { readRevocationStatus, type RevocationPage } from './revocation-arkiv.js';
import { createLocalDemo } from './demo.js';

const publisher = privateKeyToAccount(generatePrivateKey());
const wrongWallet = privateKeyToAccount(generatePrivateKey());
const key = `0x${'a1'.repeat(32)}` as const;
const differentKey = `0x${'b2'.repeat(32)}` as const;
async function fixture() {
  const now = Math.floor(Date.now() / 1000);
  const notice: NoticeV2 = { version: 2, chainId: CHAIN_ID, project: PROJECT, synthetic: true, id: 'shared-synthetic-test', publisher: publisher.address, publisherLabel: 'Fictional Test Office', title: 'Synthetic event', body: 'This test uses synthetic data only.', topic: 'Event', severity: 'info', issuedAt: now - 10, expiresAt: now + 3600 };
  const envelope = { notice, signer: publisher.address, signature: await publisher.signMessage({ message: signedNoticeMessage(notice) }) };
  const attributes = { project: { type: 'str', value: PROJECT }, type: { type: 'str', value: 'notice' }, notice_id: { type: 'str', value: notice.id }, issued_at: { type: 'u64', value: BigInt(notice.issuedAt) }, schema_version: { type: 'u64', value: 2n }, topic: { type: 'str', value: notice.topic }, severity: { type: 'str', value: notice.severity }, expires_at: { type: 'u64', value: BigInt(notice.expiresAt) } };
  const entity = { key, creator: publisher.address, createdAt: 90n, expiresAt: 500n, contentType: 'application/json', payload: new TextEncoder().encode(JSON.stringify(envelope)), attributes };
  const row = await inspectEntity(entity);
  const r: Revocation = { version: 1, chainId: CHAIN_ID, project: PROJECT, action: 'revoke', noticeEntityKey: key, noticeDigest: originalNoticeDigest(envelope), publisher: publisher.address, reason: 'Synthetic event canceled.', timestamp: now, expiresAtBlock: '302900' };
  const revocation = { revocation: r, signature: await publisher.signMessage({ message: revocationMessage(r) }) };
  return { envelope, entity, row, revocation };
}

test('shared link loads only its exact entity, validates and verifies without a wallet', async () => {
  const { entity } = await fixture();
  const requested: string[] = [];
  const source = { getChainId: async () => CHAIN_ID, getBlockNumber: async () => 100n, getEntity: async (target: string) => { requested.push(target); return entity; } } as unknown as NoticeReader;
  const result = await loadSharedNotice(key, source);
  assert.equal(noticePath(key), `/notice/${key}`);
  assert.equal(result.status, 'ready');
  assert.deepEqual(requested, [key]);
  if ('row' in result) { assert.equal(result.row.verification.status, 'valid'); assert.equal(result.row.attributeMismatch, false); }
  assert.equal((await loadSharedNotice('not-a-key', source)).status, 'invalid-link');
  assert.deepEqual(requested, [key]);
  const wrong = { ...source, getEntity: async () => ({ ...entity, key: differentKey }) } as unknown as NoticeReader;
  assert.equal((await loadSharedNotice(key, wrong)).status, 'unavailable');
});

test('shared links distinguish malformed, expired, absent and RPC unavailable', async () => {
  const { entity } = await fixture();
  const reader = (getEntity: () => Promise<unknown>) => ({ getChainId: async () => CHAIN_ID, getBlockNumber: async () => 100n, getEntity }) as NoticeReader;
  assert.equal((await loadSharedNotice(key, reader(async () => ({ ...entity, payload: new TextEncoder().encode('{bad') })))).status, 'malformed');
  assert.equal((await loadSharedNotice(key, reader(async () => ({ ...entity, expiresAt: 99n })))).status, 'expired');
  const absent = await loadSharedNotice(key, reader(async () => { throw new NoEntityFoundError(key); }));
  assert.equal(absent.status, 'missing-or-expired');
  const offline = await loadSharedNotice(key, reader(async () => { throw new Error('RPC unavailable'); }));
  assert.equal(offline.status, 'unavailable');
});

test('valid separate revocation is bound to canonical original digest and target', async () => {
  const { envelope, revocation } = await fixture();
  assert.ok(await verifyRevocation(revocation, envelope, key));
  const reordered = { ...revocation, revocation: Object.fromEntries(Object.entries(revocation.revocation).reverse()) as Revocation };
  assert.equal(revocationMessage(reordered.revocation), revocationMessage(revocation.revocation));
  assert.ok(await verifyRevocation(reordered, envelope, key));
  assert.equal((await verifySignedNotice(envelope, publisher.address)).status, 'valid');
});

test('wrong-wallet revocation is rejected even if attributes or owner claim the publisher', async () => {
  const { envelope, revocation } = await fixture();
  const forged = { ...revocation, signature: await wrongWallet.signMessage({ message: revocationMessage(revocation.revocation) }) };
  assert.equal(await verifyRevocation(forged, envelope, key), undefined);
  const otherPublisher = { ...revocation.revocation, publisher: wrongWallet.address };
  assert.equal(await verifyRevocation({ revocation: otherPublisher, signature: await wrongWallet.signMessage({ message: revocationMessage(otherPublisher) }) }, envelope, key), undefined);
});

test('tampering with any signed revocation field, wrong target or original content fails', async () => {
  const { envelope, revocation } = await fixture();
  for (const [field, value] of Object.entries({ version: 2, chainId: 1, project: 'wrong', action: 'update', noticeEntityKey: differentKey, noticeDigest: differentKey, publisher: wrongWallet.address, reason: 'Altered reason', timestamp: revocation.revocation.timestamp + 1, expiresAtBlock: '302901' })) {
    assert.equal(await verifyRevocation({ ...revocation, revocation: { ...revocation.revocation, [field]: value } }, envelope, key), undefined, field);
  }
  assert.equal(await verifyRevocation(revocation, envelope, differentKey), undefined);
  const wrongTarget = { ...revocation.revocation, noticeEntityKey: differentKey };
  assert.equal(await verifyRevocation({ revocation: wrongTarget, signature: await publisher.signMessage({ message: revocationMessage(wrongTarget) }) }, envelope, key), undefined);
  const alteredNotice = { ...envelope, notice: { ...envelope.notice, body: 'Different content' } };
  assert.equal(await verifyRevocation(revocation, alteredNotice, key), undefined);
  const resignedNotice = { ...alteredNotice, signature: await publisher.signMessage({ message: signedNoticeMessage(alteredNotice.notice) }) };
  assert.equal(await verifyRevocation(revocation, resignedNotice, key), undefined);
});

test('reader requires cryptographic authorization, not revocation entity creator', async () => {
  const { row, revocation } = await fixture();
  const record = { key: differentKey, creator: wrongWallet.address, payload: new TextEncoder().encode(JSON.stringify(revocation)), contentType: 'application/json', expiresAt: 302900n };
  const page = { entities: [record], blockNumber: 100n, cursor: undefined, next: async () => { throw new Error(); } };
  const valid = await readRevocationStatus(row, async () => page);
  assert.equal(valid.status, 'revoked');
  const forged = { ...revocation, signature: await wrongWallet.signMessage({ message: revocationMessage(revocation.revocation) }) };
  assert.equal((await readRevocationStatus(row, async () => ({ ...page, entities: [{ ...record, creator: publisher.address, payload: new TextEncoder().encode(JSON.stringify(forged)) }] }))).status, 'not-found');
});

test('failed/incomplete lookup is unknown; expired storage or signed retention is not accepted', async () => {
  const { row, revocation } = await fixture();
  assert.equal((await readRevocationStatus(row, async () => { throw new Error('Offline'); })).status, 'unknown');
  const page: RevocationPage = { entities: [], blockNumber: 100n, cursor: 'remaining', next: async () => { throw new Error('Next page unavailable'); } };
  assert.equal((await readRevocationStatus(row, async () => page)).status, 'unknown');
  const extended = { key: differentKey, creator: publisher.address, payload: new TextEncoder().encode(JSON.stringify(revocation)), contentType: 'application/json', expiresAt: 999999n };
  assert.equal((await readRevocationStatus(row, async () => ({ ...page, entities: [extended], blockNumber: 302901n, cursor: undefined }))).status, 'not-found');
  assert.equal((await readRevocationStatus(row, async () => ({ ...page, entities: [{ ...extended, expiresAt: 99n }], cursor: undefined }))).status, 'not-found');
});

test('wallet-free local demo creates a valid synthetic signature and detects local tampering', async () => {
  const example = createLocalDemo();
  assert.equal((await verifySignedNotice(example, example.signer)).status, 'valid');
  const changed = { ...example, notice: { ...example.notice, body: 'Local edit' } };
  assert.equal((await verifySignedNotice(changed, example.signer)).status, 'invalid');
  assert.equal((await verifySignedNotice(example, example.signer)).status, 'valid');
  assert.equal(example.notice.version, 2);
  assert.equal('entityKey' in example, false);
});
