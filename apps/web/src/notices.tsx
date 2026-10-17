import { useEffect, useState } from 'react';
import { verifySignedNotice, type SignedNotice, type Verification } from '@beacon/core';
import { explorer, type FeedNotice } from '@beacon/core/arkiv';
import { noticePath } from '@beacon/core/sharing';
import { RevocationPanel, type WalletActions } from './revocations';
import { PROOF_TRANSACTIONS } from './evidence';
const date = (seconds: number) => new Date(seconds * 1000).toLocaleString();

export function SignatureBadge({ verification }: { verification: Verification | null }) {
  const status = verification?.status ?? 'pending';
  return <span className={`verification ${status === 'valid' ? 'good' : status === 'pending' ? 'pending' : 'bad'}`}>
    <span className="status-icon" aria-hidden="true">{status === 'valid' ? '✓' : status === 'invalid' ? '×' : status === 'malformed' ? '!' : '◷'}</span>
    {verification?.label ?? 'Checking signature…'}
  </span>;
}

export function Simulation({ envelope, creator }: { envelope: SignedNotice; creator: `0x${string}` }) {
  const [body, setBody] = useState(envelope.notice.body);
  const [result, setResult] = useState<Verification | null>(null);
  useEffect(() => {
    let active = true;
    const copy = { ...envelope, notice: { ...envelope.notice, body } };
    void verifySignedNotice(copy, creator).then(value => { if (active) setResult(value); });
    return () => { active = false; };
  }, [body, envelope, creator]);
  return <section className="simulation" aria-label="Local tampering simulation">
    <div className="section-kicker">LOCAL SIMULATION · NO TRANSACTION</div><h4>Change the words. Check the signature.</h4>
    <p>This edits a copy in your browser. The original Arkiv entity stays untouched.</p>
    <label>Local copy of notice body<textarea value={body} maxLength={4000} onChange={event => { setResult(null); setBody(event.target.value); }} /></label>
    <div className="simulation-actions"><button className="secondary" onClick={() => { if (body !== envelope.notice.body) { setResult(null); setBody(envelope.notice.body); } }}>Reset copy</button><span role="status"><SignatureBadge verification={result} /></span></div>
    {result?.status === 'invalid' && <p>The copy no longer matches the signed message.</p>}{result?.status === 'malformed' && <p>{result.reason}</p>}
  </section>;
}

export function NoticeCard({ row, wallet, txHash }: { row: FeedNotice; wallet?: WalletActions; txHash?: string }) {
  const [simulate, setSimulate] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  async function copyLink() {
    try { await navigator.clipboard.writeText(new URL(noticePath(row.key), window.location.origin).href); setCopyMessage('Link copied'); }
    catch { setCopyMessage('Copy unavailable. Open the notice and copy its address from your browser.'); }
  }
  const v = row.verification;
  const envelope = v.status === 'malformed' ? null : v.envelope;
  const n = envelope?.notice;
  const knownTransaction = txHash ?? PROOF_TRANSACTIONS[row.key.toLowerCase()];
  return <article className={`notice-card ${v.status !== 'valid' || row.attributeMismatch ? 'flagged' : ''}`}>
    <div className="card-top"><span className={`severity ${n?.version === 2 ? n.severity : 'legacy'}`}>{n?.version === 2 ? n.severity : 'Legacy proof'}</span><span className="topic">{n?.version === 2 ? n.topic : 'Topic not specified'}</span></div>
    <h3>{n?.title ?? 'Malformed notice'}</h3>{n && <p className="notice-body">{n.body}</p>}
    <div className="publisher"><span className="wallet-mark" aria-hidden="true">↗</span><div><strong>{n?.version === 2 ? n.publisherLabel : n?.publisher ?? 'Unknown publisher'}</strong><span>Claimed publisher wallet</span><code>{envelope?.signer ?? 'Unavailable'}</code></div></div>
    <div className="verification-line"><SignatureBadge verification={v} /><span className="small-muted">{n ? `Message v${n.version}` : 'Unrecognized payload'}</span></div>
    <RevocationPanel row={row} wallet={wallet} />
    {v.status === 'malformed' && <p className="inline-warning">{v.reason}</p>}{v.status === 'invalid' && <p className="inline-warning">The content does not match this wallet's signature. Treat this notice as unverified.</p>}
    {v.status === 'valid' && !v.creatorMatches && <p className="inline-warning">Creator mismatch: this entity was created by a different wallet. A copied signature does not prove direct publication.</p>}
    {row.attributeMismatch && <p className="inline-warning">Indexed attributes do not match the signed notice. Discovery metadata is untrusted.</p>}
    {n?.version === 1 && <p className="small-muted">Legacy proof: topic, severity and expiration were not part of the signed message.</p>}
    {n?.version === 2 && n.expiresAt * 1000 <= Date.now() && <p className="expired-status"><span className="status-icon" aria-hidden="true">◷</span><span><strong>Expired · signed deadline passed.</strong> A valid signature does not make this notice current.</span></p>}
    <dl className="notice-meta"><div><dt>Entity Expiration</dt><dd>Block {row.expiresAtBlock.toString()}</dd></div><div><dt>{n?.version === 2 ? 'Signed deadline' : 'Issued'}</dt><dd>{n ? date(n.version === 2 ? n.expiresAt : n.issuedAt) : 'Unavailable'}</dd></div></dl>
    <details className="provenance"><summary>View on-chain provenance</summary><p>Immutable creator</p><code>{row.creator}</code><p>Entity key</p><code>{row.key}</code><p>Created at block {row.createdAtBlock.toString()}. Entity Expiration is a block height; the signed deadline is the publisher's requested time.</p></details>
    {knownTransaction && <p><a className="small-muted" href={`${explorer}/tx/${knownTransaction}`} target="_blank" rel="noreferrer">Known creation transaction ↗</a></p>}
    <div className="notice-link-actions"><a className="text-button" href={noticePath(row.key)}>Open notice ↗</a><button className="secondary" onClick={() => void copyLink()}>Copy link</button><span role="status" className="small-muted">{copyMessage}</span></div>
    {envelope && <button className="text-button" aria-expanded={simulate} onClick={() => setSimulate(!simulate)}>{simulate ? 'Close simulation ↑' : 'Try a local tampering simulation →'}</button>}
    {simulate && envelope && <Simulation envelope={envelope} creator={row.creator} />}
  </article>;
}

