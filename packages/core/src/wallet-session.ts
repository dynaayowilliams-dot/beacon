import { isAddress, type Address } from 'viem';
import type { BrowserProvider } from './arkiv.js';

export type WalletSnapshot = { address?: Address; chain?: number };
/** Restore authorization without prompting; never cache an account as authorization. */
export function observeWallet(provider: BrowserProvider, update: (state: WalletSnapshot) => void) {
  let active = true;
  let revision = 0;
  const refresh = async () => {
    if (!active) return;
    const request = ++revision;
    update({});
    try {
      const [accounts, chain] = await Promise.all([
        provider.request({ method: 'eth_accounts' }),
        provider.request({ method: 'eth_chainId' }),
      ]);
      const address = accounts[0];
      if (active && request === revision) update(address && isAddress(address) ? { address, chain: Number(chain) } : {});
    } catch { if (active && request === revision) update({}); }
  };
  const changed = () => { void refresh(); };
  const disconnected = () => { ++revision; if (active) update({}); };
  provider.on?.('accountsChanged', changed);
  provider.on?.('chainChanged', changed);
  provider.on?.('disconnect', disconnected);
  void refresh();
  return {
    refresh,
    stop: () => {
      active = false; ++revision;
      provider.removeListener?.('accountsChanged', changed);
      provider.removeListener?.('chainChanged', changed);
      provider.removeListener?.('disconnect', disconnected);
    },
  };
}

/** UI eligibility only; publication and readback independently verify signatures. */
export function revocationEligibility(publisher: string | undefined, account: string | undefined, revoked: boolean) {
  if (!publisher) return { eligible: false, reason: 'Revocation is unavailable because this notice does not have a valid wallet signature.' };
  if (revoked) return { eligible: false, reason: 'This notice already has a verified publisher revocation.' };
  if (!account) return { eligible: false, reason: 'Connect the original publishing wallet in the wallet panel to revoke this notice.' };
  if (publisher.toLowerCase() !== account.toLowerCase()) return { eligible: false, reason: 'The connected wallet is not the verified publisher. Select the original publishing account in Rabby.' };
  return { eligible: true, reason: 'Your connected wallet matches the verified notice publisher.' };
}
