import test from 'node:test';
import assert from 'node:assert/strict';
import type { BrowserProvider } from './arkiv.js';
import { observeWallet, revocationEligibility, type WalletSnapshot } from './wallet-session.js';

const publisher = '0x98Ee00009c448c0D83aFE306E4cE29f6B8Fdb77a';
const other = '0x0000000000000000000000000000000000000001';
test('revoke eligibility uses verified publisher and case-insensitive equality', () => {
  assert.equal(revocationEligibility(publisher, publisher.toLowerCase(), false).eligible, true);
  assert.equal(revocationEligibility(publisher, other, false).eligible, false);
  assert.match(revocationEligibility(publisher, undefined, false).reason, /Connect/);
  assert.equal(revocationEligibility(undefined, publisher, false).eligible, false);
  assert.equal(revocationEligibility(publisher, publisher, true).eligible, false);
});

test('wallet restores silently, updates accounts/network, clears on disconnect and unsubscribes', async () => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const methods: string[] = [];
  let accounts = [publisher];
  let chain = '0x7614d1';
  const provider = {
    request: async ({ method }: { method: string }) => { methods.push(method); return method === 'eth_accounts' ? accounts : chain; },
    on: (event: string, callback: (...args: unknown[]) => void) => { listeners.set(event, callback); },
    removeListener: (event: string) => { listeners.delete(event); },
  } as unknown as BrowserProvider;
  let state: WalletSnapshot = {};
  const session = observeWallet(provider, value => { state = value; });
  await session.refresh();
  assert.equal(state.address, publisher);
  assert.equal(methods.includes('eth_requestAccounts'), false);
  accounts = [other]; chain = '0x1';
  listeners.get('accountsChanged')?.();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.address, other); assert.equal(state.chain, 1);
  chain = '0x7614d1'; listeners.get('chainChanged')?.();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.equal(state.chain, Number(chain));
  accounts = []; listeners.get('accountsChanged')?.();
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(state, {});
  listeners.get('disconnect')?.(); assert.deepEqual(state, {});
  session.stop(); assert.equal(listeners.size, 0);
});

test('late wallet responses cannot restore an account after disconnect or cleanup', async () => {
  const listeners = new Map<string, (...args: unknown[]) => void>();
  const pending: ((value: string[]) => void)[] = [];
  const provider = {
    request: ({ method }: { method: string }) => method === 'eth_accounts' ? new Promise<string[]>(resolve => pending.push(resolve)) : Promise.resolve('0x1'),
    on: (event: string, callback: (...args: unknown[]) => void) => { listeners.set(event, callback); },
    removeListener: (event: string) => { listeners.delete(event); },
  } as unknown as BrowserProvider;
  let state: WalletSnapshot = {};
  const session = observeWallet(provider, value => { state = value; });
  listeners.get('disconnect')?.();
  pending.shift()?.([publisher]);
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(state, {});
  const refresh = session.refresh(); session.stop();
  pending.shift()?.([publisher]); await refresh;
  assert.deepEqual(state, {});
});
