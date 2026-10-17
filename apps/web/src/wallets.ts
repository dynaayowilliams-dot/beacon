import type { BrowserProvider } from '@beacon/core/arkiv';
export type WalletOption = { id: string; name: string; provider: BrowserProvider };
type Injected = BrowserProvider & { isRabby?: boolean; providers?: Injected[] };
declare global { interface Window { ethereum?: Injected } }
export function discoverWallets(onWallet: (wallet: WalletOption) => void): () => void {
  const receive = (event: Event) => {
    const detail = (event as CustomEvent).detail as { info?: { uuid?: string; name?: string }; provider?: BrowserProvider } | undefined;
    if (detail?.provider && typeof detail.provider.request === 'function' && typeof detail.info?.uuid === 'string' && typeof detail.info.name === 'string') onWallet({ id: detail.info.uuid, name: detail.info.name.slice(0, 60), provider: detail.provider });
  };
  window.addEventListener('eip6963:announceProvider', receive);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  const injected = window.ethereum;
  const providers = injected?.providers ?? (injected ? [injected] : []);
  [...providers].sort((a, b) => Number(!!b.isRabby) - Number(!!a.isRabby)).forEach((provider, index) => onWallet({ id: `injected-${index}`, name: provider.isRabby ? 'Rabby' : 'Browser wallet', provider }));
  return () => window.removeEventListener('eip6963:announceProvider', receive);
}
