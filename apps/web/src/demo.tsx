import { useEffect, useState } from 'react';
import { fetchNoticePage, type FeedNotice } from '@beacon/core/arkiv';
import { createLocalDemo } from '@beacon/core/demo';
import type { SignedNotice } from '@beacon/core';
import { noticePath } from '@beacon/core/sharing';
import { SiteHeader, SiteFooter } from './chrome';
import { Simulation } from './notices';

type DemoSource = { kind: 'live'; row: FeedNotice; envelope: SignedNotice } | { kind: 'local'; envelope: SignedNotice; explanation: string };
export function DemoPage() {
  const [source, setSource] = useState<DemoSource>();
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        let page = await fetchNoticePage();
        for (let searched = 0; searched < 5; searched++) {
          const row = page.notices.find(item => item.verification.status === 'valid');
          if (row && row.verification.status === 'valid') { if (active) setSource({ kind: 'live', row, envelope: row.verification.envelope }); return; }
          if (!page.cursor || searched === 4 || !active) break;
          page = await fetchNoticePage(page.cursor);
        }
        if (active) setSource({ kind: 'local', envelope: createLocalDemo(), explanation: 'No valid signed notice was found in the searched feed pages (up to five pages). This locally signed synthetic example is not a live Arkiv record.' });
      } catch {
        try { if (active) setSource({ kind: 'local', envelope: createLocalDemo(), explanation: 'Tiramisu could not be read. This locally signed synthetic example is not a live Arkiv record.' }); }
        catch { if (active) setError('Could not prepare a local signature. Use a current browser on HTTPS or localhost and retry.'); }
      }
    })();
    return () => { active = false; };
  }, []);
  return <><SiteHeader /><main className="demo-page"><div className="section-kicker">TRY IT WITHOUT A WALLET</div><h1>A small edit. A different result.</h1><p>A signature binds a message to a wallet. Change the words below, then reset them. The source notice is never edited.</p>
    {!source && !error && <p role="status">Looking for a retrieved signed notice…</p>}{error && <p role="alert" className="inline-warning">{error}</p>}
    {source && <><div className={`state-card ${source.kind === 'local' ? 'local-example' : ''}`}><strong>{source.kind === 'live' ? 'Retrieved signed notice · Tiramisu' : 'Locally signed synthetic example · NOT on Arkiv'}</strong>
      <p>{source.kind === 'local' ? source.explanation : 'The following copy came from a real retrieved entity with a valid wallet signature. Signature validity does not establish truth, identity or revocation status.'}</p>
      {source.kind === 'live' && <a href={noticePath(source.row.key)}>Open the original and check its status ↗</a>}<h2>{source.envelope.notice.title}</h2><p>Signing wallet: <code>{source.envelope.signer}</code></p>
      {source.kind === 'local' && <p>No funded wallet, entity key or transaction exists for this local example. Its ephemeral signing entropy is generated in memory and cleared immediately; it is never stored.</p>}</div>
      <Simulation envelope={source.envelope} creator={source.kind === 'live' ? source.row.creator : source.envelope.signer} /></>}
    <p><a className="secondary-link" href="/app">Open the notice board →</a></p><SiteFooter /></main></>;
}
