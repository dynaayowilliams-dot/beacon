import { useEffect, useState } from 'react';
import { revocationEligibility } from '@beacon/core/wallet-session';
import { CHAIN_ID } from '@beacon/core';
import { explorer, transactionHash, walletError, type BrowserProvider, type FeedNotice, type PublishedNotice, type PublishStage } from '@beacon/core/arkiv';
import { publishRevocation, readRevocationStatus, type RevocationStatus } from '@beacon/core/revocation-arkiv';

export type WalletActions = { provider: BrowserProvider; address: `0x${string}`; chain?: number; busy: boolean; acquire: () => boolean; release: () => void };
export function RevocationPanel({ row, wallet }: { row: FeedNotice; wallet?: WalletActions }) {
  const [status, setStatus] = useState<RevocationStatus>();
  const [refresh, setRefresh] = useState(0);
  const [form, setForm] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [failedHash, setFailedHash] = useState<`0x${string}`>();
  const [receipt, setReceipt] = useState<PublishedNotice>();
  useEffect(() => {
    let active = true; setStatus(undefined);
    void readRevocationStatus(row).then(result => { if (active) setStatus(result); });
    return () => { active = false; };
  }, [row, refresh]);
  const eligibility = revocationEligibility(row.verification.status === 'valid' ? row.verification.envelope.signer : undefined, wallet?.address, status?.status === 'revoked');
  const canRevoke = eligibility.eligible;
  const unavailable = !eligibility.eligible ? eligibility.reason : receipt ? 'A revocation transaction has already confirmed. Recheck its verified status above.' : failedHash ? 'A transaction was submitted with an uncertain outcome. Check it before submitting again.' : busy || wallet?.busy ? 'A wallet transaction is in progress.' : wallet?.chain !== CHAIN_ID ? 'Switch the connected wallet to Tiramisu in the wallet panel first.' : !status ? 'Waiting for the revocation status check.' : '';
  const blocked = !!unavailable;
  async function revoke(event: React.FormEvent) {
    event.preventDefault();
    if (!wallet || !canRevoke || blocked || !wallet.acquire()) return;
    setBusy(true); setError('');
    try {
      const labels: Record<PublishStage, string> = { signature: 'Approve the separate revocation message in your wallet.', transaction: 'Approve the revocation transaction. Waiting for confirmation…', confirmation: 'Confirming the revocation transaction…', readback: 'Querying and verifying the separate revocation entity…' };
      const result = await publishRevocation(wallet.provider, row, reason, stage => setProgress(labels[stage]));
      setReceipt(result); setForm(false); setRefresh(value => value + 1);
    } catch (failure) { setError(walletError(failure)); setFailedHash(transactionHash(failure)); }
    finally { setBusy(false); setProgress(''); wallet.release(); }
  }
  return <section className="revocation-panel" aria-label="Publisher revocation status">
    <div role="status" className="revocation-summary"><span className="status-icon" aria-hidden="true">{status?.status === 'revoked' ? '⊘' : status?.status === 'not-found' ? '◇' : '◷'}</span><strong>{status?.status === 'revoked' ? 'Revoked by publisher' : status?.status === 'not-found' ? 'No verified live revocation found' : status ? 'Revocation status unknown' : 'Checking revocation status…'}</strong></div>
    {status?.status === 'revoked' && <div><p className="revocation-reason">{status.record.revocation.reason}</p><p className="small-muted">Revoked at {new Date(status.record.revocation.timestamp * 1000).toLocaleString()} · checked at block {status.checkedAtBlock.toString()}. Signature validity of the original notice is a separate result.</p><p className="small-muted">Revocation entity: <code>{status.key}</code><br />Effective Entity Expiration: block {status.expiresAtBlock.toString()}. Revocation is not permanent.</p></div>}
    {status?.status === 'not-found' && <p className="small-muted">Checked at block {status.checkedAtBlock.toString()}. This does not prove the notice was never revoked: records can expire or be deleted.{status.ignored > 0 ? ` ${status.ignored} invalid, unrelated or non-live candidates were ignored.` : ''}</p>}
    {status?.status === 'unknown' && <p className="small-muted">{status.reason} Do not infer that the notice is active.</p>}
    <button className="text-button" disabled={busy} onClick={() => setRefresh(value => value + 1)}>Recheck revocation status</button>
    <div className="revocation-actions">
      {canRevoke && !receipt && !failedHash && <button className="revoke-button" disabled={blocked} onClick={() => setForm(!form)} aria-expanded={form}>{form ? 'Cancel revocation' : 'Revoke notice'}</button>}
      <p className="small-muted" role="status">{unavailable || eligibility.reason}</p>
      {(!wallet || wallet.chain !== CHAIN_ID) && <a className="text-button" href="#wallet-connection">Open wallet panel</a>}
    </div>
    {form && canRevoke && wallet && !receipt && !failedHash && <form className="revoke-form" onSubmit={event => void revoke(event)}><p>This creates a separate signed Arkiv entity. The original notice is not edited or deleted. Retention is set to the notice's current expiration block plus seven nominal days, and is not permanent.</p><label>Synthetic reason<textarea required maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} placeholder="e.g. This fictional practice update has been superseded." /></label>
      {wallet.chain !== CHAIN_ID && <p className="inline-warning">Switch the connected wallet to Tiramisu in the wallet panel first.</p>}
      <button className="secondary" disabled={blocked || !reason.trim()} type="submit">Sign & publish revocation</button></form>}
    {progress && <p role="status" className="progress"><span aria-hidden="true">◷</span>{progress}</p>}
    {error && <div role="alert" className="inline-warning"><p>{error}</p>{failedHash && <><a href={`${explorer}/tx/${failedHash}`} target="_blank" rel="noreferrer">Check actual transaction outcome ↗</a><p>Do not submit again until the outcome is known.</p></>}</div>}
    {receipt && <div className="state-card" role="status"><strong>{receipt.readback ? 'Revocation confirmed and queried back' : 'Revocation confirmed; readback not yet verified'}</strong><p>The original notice remains unchanged.</p><a href={`${explorer}/tx/${receipt.txHash}`} target="_blank" rel="noreferrer">Revocation transaction ↗</a><code>{receipt.entityKey}</code><p>Entity Expiration: block {receipt.expiresAtBlock.toString()}</p>{!receipt.readback && <p>Recheck the status. Do not blindly submit another transaction.</p>}</div>}
  </section>;
}
