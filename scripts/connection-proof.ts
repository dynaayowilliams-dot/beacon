import { randomUUID } from 'node:crypto';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createPublicClient, createWalletClient, ExpirationTime } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { str, u64 } from '@arkiv-network/sdk/attr';
import { eq } from '@arkiv-network/sdk/query';
import { jsonToPayload } from '@arkiv-network/sdk/utils';
import { http, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { CHAIN_ID, PROJECT, RPC_URL, noticeMessage, verifyNotice, type Notice } from '@beacon/core';

let stage = 'network connection';
async function main() {
  // Only Node wallet modes load secrets. Vite and public reads never load this file.
  if (process.argv.includes('--write') || process.argv.includes('--wallet')) {
    stage = 'loading local .env';
    if (existsSync('.env')) loadEnvFile('.env');
  }
  // Disable SDK debug output even when the parent shell or .env enables it.
  process.env.DEBUG = '';
  stage = 'network connection';
  if (tiramisu.id !== CHAIN_ID) throw new Error('Unexpected SDK chain configuration.');
  const client = createPublicClient({ chain: tiramisu, transport: http(RPC_URL, { timeout: 15_000, retryCount: 0 }) });
  if (await client.getChainId() !== CHAIN_ID) throw new Error('RPC chain ID mismatch.');
  const query = (id?: string) => {
    const builder = client.select().where(eq('project', str(PROJECT)), eq('type', str('notice')));
    return id ? builder.where(eq('notice_id', str(id))).limit(10) : builder.limit(10);
  };
  if (!process.argv.includes('--write') && !process.argv.includes('--wallet')) {
    const page = await query().fetch();
    console.log(JSON.stringify({ chainId: CHAIN_ID, query: query().toString(), count: page.entities.length }));
    return;
  }
  const secret = process.env.BEACON_PRIVATE_KEY;
  stage = 'local wallet configuration (BEACON_PRIVATE_KEY must be a valid 0x-prefixed key)';
  if (!secret || !/^0x[0-9a-fA-F]{64}$/.test(secret)) {
    throw new Error('Set BEACON_PRIVATE_KEY locally for a dedicated funded Tiramisu test wallet.');
  }
  const account = privateKeyToAccount(secret as Hex);
  stage = 'checking test GLM balance';
  const balance = await client.getBalance({ address: account.address });
  if (process.argv.includes('--wallet')) {
    console.log(JSON.stringify({ chainId: CHAIN_ID, publicAddress: account.address, balanceWei: balance.toString(), funded: balance > 0n }));
    return;
  }
  if (balance === 0n) throw new Error('Test wallet needs faucet GLM.');
  const wallet = createWalletClient({ chain: tiramisu, account, transport: http(RPC_URL, { timeout: 30_000, retryCount: 0 }) });
  const notice: Notice = {
    version: 1, id: randomUUID(), publisher: 'Fictional Beacon Practice Office',
    title: 'Synthetic drill announcement', body: 'This fictional notice is only a connection test.',
    issuedAt: Math.floor(Date.now() / 1000),
  };
  const signature = await account.signMessage({ message: noticeMessage(notice) });
  const payload = { notice, signer: account.address, signature };
  stage = 'publishing entity; inspect .local receipts before retrying if this fails';
  const { entityKey, txHash } = await wallet.createEntity({
    payload: jsonToPayload(payload), contentType: 'application/json',
    attributes: { project: str(PROJECT), type: str('notice'), notice_id: str(notice.id), issued_at: u64(notice.issuedAt) },
    expires: ExpirationTime.fromHours(24 * 7),
  });
  // Save public receipt immediately. A failed query must not hide a successful write.
  await mkdir('.local', { recursive: true });
  const receipt = { chainId: CHAIN_ID, creator: account.address, entityKey, txHash, noticeId: notice.id, query: query(notice.id).createdBy(account.address).toString(), expirationHours: 168 };
  await writeFile(`.local/${notice.id}.json`, JSON.stringify(receipt, null, 2));
  stage = 'transaction receipt confirmation';
  const transaction = await client.waitForTransactionReceipt({ hash: txHash });
  if (transaction.status !== 'success') throw new Error('Transaction failed.');
  stage = 'attribute query and verification; public receipt saved in .local';
  for (let attempt = 0; attempt < 12; attempt++) {
    const page = await query(notice.id).createdBy(account.address).fetch();
    const entity = page.entities.find(item => item.key.toLowerCase() === entityKey.toLowerCase());
    if (entity) {
      if (entity.creator.toLowerCase() !== account.address.toLowerCase()) throw new Error('Creator mismatch.');
      if (entity.toText() !== JSON.stringify(payload)) throw new Error('Payload mismatch.');
      if (!await verifyNotice(notice, account.address, signature)) throw new Error('Signature failed.');
      if (await verifyNotice({ ...notice, body: 'Tampered synthetic text' }, account.address, signature)) throw new Error('Tamper check failed.');
      if (entity.expiresAt <= page.blockNumber) throw new Error('Entity already expired.');
      const verified = { ...receipt, verified: true, expiresAtBlock: entity.expiresAt.toString(), verifiedAtBlock: page.blockNumber.toString() };
      await writeFile(`.local/${notice.id}.json`, JSON.stringify(verified, null, 2));
      console.log(JSON.stringify(verified, null, 2));
      console.log('PASS: attribute query, creator, payload, signature and tamper rejection.');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Write completed; attribute query did not return it within 24 seconds. Do not blindly repeat the write; use the saved public receipt.');
}

main().catch(() => {
  // SDK/transport errors may contain signed transaction material. Never dump them.
  console.error(`Connection proof failed during: ${stage}. No raw error was printed.`);
  process.exitCode = 1;
});
