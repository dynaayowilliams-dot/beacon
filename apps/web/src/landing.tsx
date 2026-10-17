import { SiteHeader, SiteFooter } from './chrome';

export function Landing() {
  return <><SiteHeader /><main className="landing">
    <section className="landing-intro" aria-labelledby="landing-title"><div className="landing-copy"><span className="section-kicker">PUBLIC NOTICES, WITH A SIGNATURE</span>
      <h1 id="landing-title">A clear signal.<br /><em>A verifiable source.</em></h1>
      <p className="landing-description">Publish signed public notices. Verify the publishing wallet. Spot altered messages.</p>
      <div className="landing-actions"><a className="primary-link" href="/app">Open Bearkiv ↗</a><a className="secondary-link" href="/demo">Try the tampering demo</a></div>
      <p className="small-muted">Read and try the demo without connecting a wallet.</p></div>
      <article className="illustrative-notice"><div className="section-kicker">ILLUSTRATIVE EXAMPLE</div><div className="card-top"><span className="severity">Info</span><span className="topic">Community</span></div>
        <h2>A small update.<br />A source you can check.</h2><p>The fictional Lavender House reading room opens at 10 tomorrow. This notice is an example, not a live Arkiv record.</p>
        <div className="example-publisher"><span className="wallet-mark" aria-hidden="true">↗</span><span>Fictional Lavender House<br /><small>Publisher wallet shown on real notices</small></span></div>
        <div className="example-footnote">Real notices display their actual signature result and Entity Expiration. No signature or transaction is claimed for this illustration.</div>
      </article>
    </section>
    <section className="landing-section" id="how-it-works"><div className="section-kicker">SIMPLE TO PUBLISH. OPEN TO VERIFY.</div><h2>From an update to a signed record.</h2><div className="landing-grid steps">
      <article><span className="step-number">01</span><h3>Write</h3><p>Compose a synthetic notice with a fictional label, topic, severity and expiration deadline.</p></article>
      <article><span className="step-number">02</span><h3>Sign and publish</h3><p>Approve the message and the Tiramisu transaction in your browser wallet. Your key stays in the wallet.</p></article>
      <article><span className="step-number">03</span><h3>Verify</h3><p>Read the notice, check its wallet signature and on-chain creator, and try changing a local copy.</p></article>
    </div></section>
    <section className="landing-section" id="why-beacon"><div className="section-kicker">CLARITY FOR SHARED UPDATES</div><h2>A place for the notices people rely on.</h2><p className="section-description">Explore these use cases with fictional examples only.</p><div className="landing-grid use-cases">
      <article><span className="use-icon" aria-hidden="true">◇</span><h3>Community announcements</h3><p>Make a shared update discoverable and let readers check which wallet published it.</p></article>
      <article><span className="use-icon" aria-hidden="true">◷</span><h3>Event updates</h3><p>Share a schedule change with signed content and a link readers can verify for themselves.</p></article>
      <article><span className="use-icon" aria-hidden="true">✓</span><h3>Security advisories</h3><p>Help readers detect altered advisory text without treating a signature as proof that the advice is true.</p></article>
    </div></section>
    <section className="landing-grid trust-grid"><article><div className="section-kicker">STORED ON ARKIV</div><h2>Public, queryable,<br />and time-scoped.</h2><p>Bearkiv is an independent project built on Arkiv, the Web3 database. It uses Arkiv to store public notices and query their attributes. Anyone can read without a Bearkiv backend or a connected wallet.</p><p>Every entity has explicit <strong>Entity Expiration</strong>. Notices may expire or be deleted. Storage and revocation records are not permanent.</p></article>
      <article className="trust-explanation"><span className="section-kicker">WHAT TRUST MEANS HERE</span><h2>A signature has<br />a specific meaning.</h2><p>A valid signature proves control of a wallet. It does not prove the truth of a notice or an organization's identity.</p><p>Check the publishing wallet, immutable creator and signature result. Then make your own decision about the source.</p><a className="text-button" href="/demo">See why changing a message matters →</a></article></section>
    <section className="landing-cta"><div><span className="section-kicker">YOUR NEXT CLEAR SIGNAL</span><h2>Open the board. Check the source.</h2></div><a className="primary-link" href="/app">Open Bearkiv ↗</a></section>
    <SiteFooter />
  </main></>;
}
