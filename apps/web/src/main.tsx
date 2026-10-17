import { StrictMode, useEffect, useRef, useState, type FormEvent } from 'react';
import { createRoot } from 'react-dom/client';
import { CHAIN_ID, PROJECT, TOPICS, SEVERITIES, type NoticeV2 } from '@beacon/core';
import { explorer, fetchNoticePage, publishNotice, switchToTiramisu, transactionHash, walletAddress, walletError, type FeedNotice, type PublishedNotice, type PublishStage } from '@beacon/core/arkiv';
import { observeWallet } from '@beacon/core/wallet-session';
import { discoverWallets, type WalletOption } from './wallets';
import { loadSharedNotice } from '@beacon/core/sharing';
import { NoticeCard } from './notices';
import { Landing } from './landing';
import { DemoPage } from './demo';
import { SiteHeader, SiteFooter } from './chrome';
import { PROOF_TRANSACTIONS } from './evidence';
import './styles.css';

const short = (value: string) => `${value.slice(0, 8)}…${value.slice(-6)}`;
const stageText: Record<PublishStage, string> = {
  signature: '1 of 3 · Approve the message signature in your wallet.',
  transaction: '2 of 3 · Approve the Tiramisu transaction. Waiting for inclusion…',
  confirmation: 'Confirming the transaction on Tiramisu…',
  readback: '3 of 3 · Querying the published entity and verifying it…',
};

function App({ entityKey }: { entityKey?: string }) {
  const [notices, setNotices] = useState<FeedNotice[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState('');
  const [sharedMessage, setSharedMessage] = useState('');
  const [cursor, setCursor] = useState<string>();
  const [block, setBlock] = useState<bigint>();
  const feedRequest = useRef(0);
  const [wallets, setWallets] = useState<WalletOption[]>([]);
  const [selected, setSelected] = useState('');
  const [address, setAddress] = useState<`0x${string}`>();
  const [chain, setChain] = useState<number>();
  const [connecting, setConnecting] = useState(false);
  const [walletMessage, setWalletMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const publishing = useRef(false);
  const walletSession = useRef<ReturnType<typeof observeWallet> | undefined>(undefined);
  const [progress, setProgress] = useState('');
  const [publishStage, setPublishStage] = useState<PublishStage | 'checking'>('checking');
  const [publishError, setPublishError] = useState('');
  const [failedTx, setFailedTx] = useState<`0x${string}`>();
  const [published, setPublished] = useState<PublishedNotice>();
  const [label, setLabel] = useState('Fictional Bearkiv Practice Office');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [topic, setTopic] = useState<NoticeV2['topic']>('Community');
  const [severity, setSeverity] = useState<NoticeV2['severity']>('info');
  const [hours, setHours] = useState(24);
  const [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState(false);
  const wallet = wallets.find(item => item.id === selected) ?? wallets[0];
  const knownSharedTransaction = entityKey ? PROOF_TRANSACTIONS[entityKey.toLowerCase()] : undefined;

  async function loadFeed(append = false) {
    const request = ++feedRequest.current;
    setLoading(true); setFeedError('');
    try {
      if (entityKey !== undefined) {
        const shared = await loadSharedNotice(entityKey);
        if (request !== feedRequest.current) return;
        setCursor(undefined);
        if ('row' in shared) {
          setNotices([shared.row]); setBlock(shared.blockNumber);
          setSharedMessage(shared.status === 'expired' ? 'Expired: the signed deadline or entity expiration has passed.' : shared.status === 'malformed' ? 'This entity has a malformed or unsupported notice payload.' : 'Fetched this exact Arkiv entity. Signature and revocation status are checked separately.');
        } else {
          setNotices([]);
          const messages = { 'invalid-link': 'Malformed notice link: expected a 32-byte Arkiv entity key.', 'missing-or-expired': 'No live entity found. It may never have existed, have expired, or have been deleted. This link does not guarantee continued availability.', unavailable: 'This notice is unavailable: Tiramisu could not be reached or the response could not be trusted. Please retry.' };
          setSharedMessage(messages[shared.status]);
          if (shared.status === 'unavailable') setFeedError(messages[shared.status]);
        }
        return;
      }
      const page = await fetchNoticePage(append ? cursor : undefined);
      if (request !== feedRequest.current) return;
      setNotices(previous => {
        const merged = append ? [...previous, ...page.notices] : page.notices;
        return [...new Map(merged.map(row => [row.key, row])).values()].sort((a, b) => a.createdAtBlock === b.createdAtBlock ? a.key.localeCompare(b.key) : a.createdAtBlock > b.createdAtBlock ? -1 : 1);
      });
      setCursor(page.cursor); setBlock(page.blockNumber);
    } catch {
      if (request === feedRequest.current) setFeedError('Could not read Tiramisu. Check your internet connection or try again; the public RPC may be rate limited. No sample notices have been substituted.');
    } finally { if (request === feedRequest.current) setLoading(false); }
  }
  useEffect(() => { void loadFeed(); return () => { feedRequest.current++; }; }, []);
  useEffect(() => discoverWallets(option => setWallets(previous => previous.some(item => item.provider === option.provider || item.id === option.id) ? previous : [...previous, option])), []);
  useEffect(() => {
    if (!wallet) return;
    const session = observeWallet(wallet.provider, state => { setAddress(state.address); setChain(state.chain); });
    walletSession.current = session;
    return () => { session.stop(); walletSession.current = undefined; };
  }, [wallet]);

  async function connect() {
    if (!wallet) { setWalletMessage('Install or unlock Rabby (or another injected browser wallet), then reload. Reading needs no wallet.'); return; }
    setConnecting(true); setWalletMessage('');
    try { await walletAddress(wallet.provider, true); await walletSession.current?.refresh(); }
    catch (error) { setWalletMessage(walletError(error)); }
    finally { setConnecting(false); }
  }
  async function switchChain() {
    if (!wallet) return;
    setConnecting(true); setWalletMessage('');
    try { await switchToTiramisu(wallet.provider); await walletSession.current?.refresh(); }
    catch (error) { setWalletMessage(walletError(error)); }
    finally { setConnecting(false); }
  }
  async function publish(event: FormEvent) {
    event.preventDefault();
    if (!wallet || !address || !consent || publishing.current || published || failedTx) return;
    publishing.current = true; setBusy(true); setPublishError(''); setPublishStage('checking'); setProgress('Checking wallet and network…');
    const now = Math.floor(Date.now() / 1000);
    const notice: NoticeV2 = { version: 2, chainId: CHAIN_ID, project: PROJECT, synthetic: true, id: crypto.randomUUID(), publisher: address, publisherLabel: label.trim(), title: title.trim(), body: body.trim(), topic, severity, issuedAt: now, expiresAt: now + hours * 3600 };
    try { const result = await publishNotice(wallet.provider, notice, stage => { setPublishStage(stage); setProgress(stageText[stage]); }); setPublished(result); setProgress(''); await loadFeed(); }
    catch (error) { setProgress(''); setFailedTx(transactionHash(error)); setPublishError(walletError(error)); }
    finally { publishing.current = false; setBusy(false); }
  }

  return <>
    <a className="skip-link" href="#feed-heading">Skip to the notice board</a>
    <SiteHeader />
    <main><section className="hero"><div><div className="section-kicker">PUBLIC NOTICES. VERIFIABLE ORIGINS.</div><h1>A little clarity.<br className="mobile-break" /> <span>A verifiable record.</span></h1></div><p>Read fictional community updates, verify wallet signatures, and publish a synthetic notice. No wallet needed to read.</p></section>
      <section id="how-it-works" className="trust-banner"><span className="shield" aria-hidden="true">✓</span><div><strong>A wallet signature is a proof of wallet control.</strong><p>It does not verify an organization's identity or guarantee that a notice is true. Check the immutable on-chain creator as well as the signature.</p></div></section>
      <div className="workspace"><section className="feed" aria-labelledby="feed-heading"><div className="section-heading"><div><div className="section-kicker">READ WITHOUT CONNECTING</div><h2 id="feed-heading" tabIndex={-1}>The notice board <span className="count">{notices.length}</span></h2></div><button className="secondary" disabled={loading} onClick={() => void loadFeed()}>{loading ? 'Reading…' : '↻ Refresh'}</button></div>
        <p className="feed-caption">{entityKey ? 'Shared notice · Exact entity lookup' : 'Real Arkiv entities · Newest creation block among loaded notices'}{block !== undefined ? ` · Read at block ${block}` : ''}</p>
        {entityKey !== undefined && sharedMessage && <div className="state-card" role="status"><p>{sharedMessage}</p><a href="/app">Browse the notice board →</a>{knownSharedTransaction && <p><a href={`${explorer}/tx/${knownSharedTransaction}`} target="_blank" rel="noreferrer">Known historical creation transaction ↗</a><br /><span className="small-muted">Creation evidence does not guarantee the entity is still live.</span></p>}</div>}
        {feedError && <div role="alert" className="state-card error"><h3>Connection interrupted</h3><p>{feedError}</p>{notices.length > 0 && <p>Previously fetched notices remain below; they may be stale.</p>}<button className="secondary" onClick={() => void loadFeed()}>Try again</button></div>}
        {loading && <div role="status" className="loading"><span className="spinner" /> Reading and verifying notices from Tiramisu…</div>}
        {entityKey === undefined && !loading && !feedError && notices.length === 0 && <div className="state-card empty"><span aria-hidden="true">↗</span><h3>A quiet board, for now.</h3><p>No live notices matched the Bearkiv query. Publish a synthetic notice to get started. Earlier entities may have expired.</p></div>}
        <div className="notice-list">{notices.map(row => <NoticeCard key={row.key} row={row} txHash={published?.entityKey.toLowerCase() === row.key.toLowerCase() ? published.txHash : undefined} wallet={wallet && address ? { provider: wallet.provider, address, chain, busy, acquire: () => { if (publishing.current) return false; publishing.current = true; setBusy(true); return true; }, release: () => { publishing.current = false; setBusy(false); } } : undefined} />)}</div>{cursor && !feedError && <button className="secondary load-more" disabled={loading} onClick={() => void loadFeed(true)}>Load more notices</button>}
      </section>
      <aside id="wallet-connection" className="composer" aria-labelledby="publish-heading"><div className="section-kicker">ADD YOUR VOICE</div><h2 id="publish-heading">Publish a notice</h2><p className="composer-intro">A fictional update, signed by your wallet and stored on Tiramisu.</p>
        <div className="wallet-box"><label>Browser wallet<select value={wallet?.id ?? ''} disabled={busy || connecting} onChange={event => { setSelected(event.target.value); setAddress(undefined); setChain(undefined); }}><option value="" disabled>Select a wallet</option>{wallets.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="wallet-button" disabled={busy || connecting} onClick={() => void connect()}>{connecting ? 'Waiting for wallet…' : address ? 'Reconnect wallet' : 'Connect wallet'}</button>
          {address && <><span className="connected">Connected · {short(address)}</span><code className="full-address">{address}</code><span className={chain === CHAIN_ID ? 'small-muted' : 'inline-warning'}>{chain === CHAIN_ID ? 'Tiramisu · Chain 7738577' : 'Wrong network. Publishing is blocked.'}</span>{chain !== CHAIN_ID && <button className="secondary" disabled={busy || connecting} onClick={() => void switchChain()}>Switch to Tiramisu</button>}</>}{walletMessage && <p role="alert" className="inline-warning">{walletMessage}</p>}
        </div>
        <form onSubmit={event => void publish(event)}><fieldset disabled={busy || !!published || !!failedTx}>
          <label>Fictional publisher label<input required maxLength={100} value={label} onChange={event => setLabel(event.target.value)} /></label><label>Notice title<input required maxLength={140} value={title} onChange={event => setTitle(event.target.value)} placeholder="e.g. Practice hall closed for a drill" /></label>
          <label>Notice body<textarea required maxLength={4000} value={body} onChange={event => setBody(event.target.value)} placeholder="Write a synthetic update. Do not include real personal information." /><span className="field-hint">{body.length}/4000 characters · Plain text only</span></label>
          <div className="form-row"><label>Topic<select value={topic} onChange={event => setTopic(event.target.value as NoticeV2['topic'])}>{TOPICS.map(item => <option key={item}>{item}</option>)}</select></label><label>Severity<select value={severity} onChange={event => setSeverity(event.target.value as NoticeV2['severity'])}>{SEVERITIES.map(item => <option key={item} value={item}>{item[0]!.toUpperCase() + item.slice(1)}</option>)}</select></label></div>
          <label>Entity Expiration<select value={hours} onChange={event => setHours(Number(event.target.value))}><option value={1}>After 1 hour</option><option value={24}>After 24 hours</option><option value={168}>After 7 days</option></select><span className="field-hint">The requested deadline is included in your signed message.</span></label>
          <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} required /><span>This is synthetic data from a fictional publisher. It is safe to make publicly readable.</span></label>
          <button className="text-button" type="button" onClick={() => setPreview(!preview)} aria-expanded={preview}>{preview ? 'Hide signing details ↑' : 'What am I signing? ↓'}</button>{preview && <div className="signing-preview"><p>EIP-191 message v2: legacy Beacon protocol domain (retained for compatibility), network, project, synthetic marker, unique ID, wallet, label, title, body, topic, severity, issue time and expiration deadline. ID and times are generated on publish. Your wallet shows the exact message before approval.</p><p>Two approvals: a message signature, then a transaction using test GLM.</p></div>}
          <button className="publish-button" disabled={!address || chain !== CHAIN_ID || !consent || busy || !!published || !!failedTx} type="submit">{busy ? 'Publishing…' : 'Sign & publish notice ↗'}</button><p className="field-hint">Uses test GLM. Your private key stays in your wallet.</p>
        </fieldset></form>
        {progress && <div className="progress" role="status"><span className="status-icon" aria-hidden="true">◷</span><div><strong>{publishStage === 'signature' || publishStage === 'checking' ? 'Awaiting wallet approval' : publishStage === 'readback' ? 'Verifying readback' : 'Transaction pending · approval or confirmation'}</strong><p>{progress}</p></div></div>}{publishError && <div role="alert" className="state-card error"><strong><span aria-hidden="true">! </span>Publication did not complete</strong><p>{publishError}</p><p>If you approved a transaction, check your wallet activity before retrying. Confirmation can be delayed.</p>{failedTx && <><a href={`${explorer}/tx/${failedTx}`} target="_blank" rel="noreferrer">Check transaction outcome ↗</a><code>{failedTx}</code><p>Publishing is paused to avoid a duplicate. After checking the outcome, reload to start a different notice.</p></>}</div>}
        {published && <div className={`state-card ${published.readback ? 'success' : 'error'}`} role="status"><strong><span aria-hidden="true">{published.readback ? '✓ ' : '◷ '}</span>{published.readback ? 'Published and verified' : 'Confirmed; readback not yet verified'}</strong><p>{published.readback ? 'The transaction succeeded and the entity was queried back with matching content, creator and signature.' : 'The transaction succeeded, but indexing or verification did not finish. Refresh the board; do not publish the same notice again.'}</p><a href={`${explorer}/tx/${published.txHash}`} target="_blank" rel="noreferrer">View transaction ↗</a><code>{published.txHash}</code><p>Entity key</p><code>{published.entityKey}</code>{published.readback && <p>Entity Expiration: block {published.expiresAtBlock.toString()}</p>}<button className="secondary" onClick={() => { setPublished(undefined); setTitle(''); setBody(''); setConsent(false); }}>Write a different notice</button></div>}
      </aside></div>
      <SiteFooter />
    </main>
  </>;
}
const path = window.location.pathname.replace(/\/$/, '') || '/';
const content = path === '/' ? <Landing /> : path === '/app' ? <App /> : path === '/demo' ? <DemoPage /> : path.startsWith('/notice/') ? <App entityKey={path.slice('/notice/'.length)} /> : <><SiteHeader /><main><div className="state-card"><h1>Page not found</h1><a href="/app">Open the notice board</a></div><SiteFooter /></main></>;
createRoot(document.getElementById('root')!).render(<StrictMode>{content}</StrictMode>);
