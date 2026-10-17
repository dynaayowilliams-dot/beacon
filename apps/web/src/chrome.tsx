// Confirmed against this checkout's Git origin, not a guessed repository.
export const GITHUB_URL = 'https://github.com/dynaayowilliams-dot/beacon';
export function SiteHeader() {
  return <><div className="network-strip"><span><i /> TIRAMISU TESTNET</span><span>Synthetic notices only · Publicly readable</span></div>
    <header className="site-header"><a href="/" className="brand" aria-label="Bearkiv home"><span className="brand-icon" aria-hidden="true">b</span>Bearkiv<span className="brand-dot">.</span></a>
      <nav className="site-nav" aria-label="Main navigation"><a href="/#how-it-works">How it works</a><a href="/#why-beacon">Why Bearkiv</a><a href="/app" className="nav-app">Open app ↗</a></nav></header></>;
}
export function SiteFooter() {
  return <footer><a className="footer-brand" href="/">Bearkiv.</a><p>Independent project built on Arkiv.</p><span>Tiramisu testnet · Chain 7738577</span><a href={GITHUB_URL} target="_blank" rel="noreferrer">GitHub ↗</a></footer>;
}
