# Beacon notice data contract

Network: Arkiv Tiramisu, chain ID 7738577, public RPC https://rpc.tiramisu.db-chain.testnet.arkiv.network. SDK 0.8.1. Entity types `notice` and `revocation`, namespace `beacon.synthetic.v1` retained for compatibility. The namespace is not a trust boundary. All notices are synthetic; all entities are publicly readable.

## Deployment and actual validation

The Vercel preparation serves only apps/web/dist from a repository-root pnpm build (see root vercel.json). No entity schema changes or backend are introduced by deployment. Public feed reads use an HTTP public client with no signer, wallet connection or secret; wallet permission is requested only for publication. The browser never imports the Node proof scripts or root .env. Tiramisu RPC must be reachable from visitors' browsers; hosting the static app does not remove RPC rate limits or network failures.

The builder reports that publication through Rabby works. This report does not include a new v2 transaction hash/entity key, so browser-publication evidence is not fabricated. The two saved v1 receipts include verified attribute readback. A Vercel deployment URL and signed-out production read have not yet been verified. All signed-field, creator, metadata and expiration checks below remain the actual implemented contract.

## New browser notices: message version 2

Envelope: `{ notice, signer, signature }`. No extra or missing fields are accepted. signer is the claimed EOA publisher address; signature is a 65-byte EIP-191 message signature. Display labels are fictional and self-asserted.

The notice has exactly these fields:

| Field | Type | Meaning |
| --- | --- | --- |
| version | number | 2 |
| chainId | number | 7738577 |
| project | string | beacon.synthetic.v1 |
| synthetic | boolean | true |
| id | string | Random UUID, <=80 alphanumeric/hyphen/underscore characters |
| publisher | address | Same wallet as envelope signer |
| publisherLabel | string | Fictional label, 1–100 characters |
| title | string | 1–140 characters |
| body | string | 1–4000 characters, plain text |
| topic | string | Community, Maintenance, Event or Safety |
| severity | string | info, warning or urgent |
| issuedAt | number | Safe-integer Unix seconds |
| expiresAt | number | Signed Unix-seconds deadline, later than issuedAt, at most seven days later |

`signedNoticeMessage` serializes fixed-order JSON with domain `Beacon synthetic notice v2`, then version, chainId, project, synthetic, id, publisher (lowercase address), publisherLabel, title, body, topic, severity, issuedAt, expiresAt. Every displayed content/security field is covered. Signatures are generated with personal_sign through viem signMessage and verified client-side with verifyMessage. Case differences in the same publisher address are semantically equivalent. No whitespace/default normalization occurs during verification. Unknown versions, oversized text, invalid field types/enums/addresses and unexpected fields are malformed.

## Indexed attributes

| Attribute | SDK type | Versions | Use |
| --- | --- | --- | --- |
| project | str | 1,2 | Namespace |
| type | str | 1,2 | notice |
| notice_id | str | 1,2 | Exact attribute readback |
| issued_at | u64 | 1,2 | Numeric issue timestamp |
| schema_version | u64 | 2 | 2 |
| topic | str | 2 | Signed topic copy |
| severity | str | 2 | Signed severity copy |
| expires_at | u64 | 2 | Signed deadline copy |

Payload is not queryable. The reader checks these attributes against the signed payload and warns on mismatch. It always uses payload values for display, never trusts a publisher-label attribute. Immutable `$creator` is fetched separately and compared to the signer. A valid copied signature under another creator is explicitly flagged. `$owner` is mutable and is not used for provenance.

## Entity Expiration

UI choices: 1 hour, 24 hours or 7 days. The issue time and deadline are generated once when the user clicks publish; the exact deadline is signed. The SDK receives `expires: ExpirationTime.atDate(new Date(notice.expiresAt * 1000))`. Actual on-chain `expiresAt` is a block height, shown separately from the signed deadline; SDK conversion depends on block timing. A live entity past its signed deadline is flagged. Entity Expiration can remove it from live queries, and deletion is possible. No Lifetime Extension is implemented. Extending storage would not change the signed content deadline. Revocation uses a separate entity, defined below; it never deletes or modifies the notice.

## Exact queries

Public feed (wallet not required):
```ts
publicClient.select()
  .where(eq('project', str('beacon.synthetic.v1')), eq('type', str('notice')))
  .limit(50).fetch()
```
For later pages, use the same query with `.cursor(previousPage.cursor)` before fetch. Cursor pages share a chain snapshot; refresh starts a fresh query. The app sorts only loaded entities by on-chain createdAt block in descending order, not a claimed issue timestamp. No server-side ordering is claimed. Invalid/malformed rows stay visible. Connection errors never substitute mocks.

Publication readback:
```ts
publicClient.select()
  .where(eq('project', str('beacon.synthetic.v1')), eq('type', str('notice')),
    eq('notice_id', str(notice.id)))
  .createdBy(publisher).limit(10).fetch()
```
Match the returned entity key, exact JSON payload, immutable creator, signed/indexed fields and live expiration block, then verify the signature. Check transaction receipt success before reporting publication. Confirmed writes with delayed readback retain public identifiers and show a warning; no automatic duplicate writes.

## Legacy proof notices: message version 1

Retained to read the two real setup entities. Envelope `{ notice, signer, signature }`; notice exactly `{ version: 1, id, publisher, title, body, issuedAt }`. publisher is a fictional label, while envelope signer identifies the wallet. Existing `noticeMessage` remains byte-compatible: fixed JSON `{ domain: 'Beacon synthetic notice v1', chainId: 7738577, version, id, publisher, title, body, issuedAt }`.

Legacy indexed attributes are project, type, notice_id and issued_at. Explicit requested Entity Expiration was 168 hours from creation. Topic, severity and expiration were not signed; UI identifies the row as a legacy proof and does not fabricate those fields. Public transaction/readback receipts are retained in connection-proof.json and connection-proof-second.json, based on builder-supplied verified script output. The agent's fresh network check was blocked.

## Tampering simulation and architecture

Routes: `/` landing, `/app` board, `/notice/<entity-key>` exact entity, `/demo` wallet-free simulation. Vercel rewrites app/demo/notice paths to the static React entry for refresh; no backend is introduced. Shared links validate 32-byte entity keys before `getEntity(key)`, confirm the exact returned key and network, validate project/type, and verify the returned payload. Malformed, expired, missing-or-expired and unavailable outcomes are explicit; no substitute entity is fetched. SDK NoEntityFoundError cannot establish which of never-created/deleted/expired occurred.

A visitor changes only the body in a new in-memory envelope/notice object; the original signature is retained and the same validator/verifier reruns. Reset restores the retrieved body. Nothing is written to Arkiv, local storage or a backend by this simulation.

The standalone demo searches up to five feed pages for an actual valid signature. If none is found or the query fails, it explicitly shows a locally signed synthetic example, NOT a live Arkiv record. Web Crypto generates ephemeral unfunded signing entropy, secp256k1 signs the canonical EIP-191 digest, and the source entropy buffer is cleared. Only the resulting notice/public address/signature remain in memory. No transaction or entity key is claimed for a local example. This fallback is not used by the feed or shared notice loader.

## Separate signed revocation entities

Entity type `revocation` in the same project namespace. JSON envelope exactly `{ revocation, signature }`. Revocation fields exactly:

| Field | Value/type |
| --- | --- |
| version | 1 |
| chainId | 7738577 |
| project | beacon.synthetic.v1 |
| action | revoke |
| noticeEntityKey | Exact original 32-byte entity key |
| noticeDigest | `hashMessage(signedNoticeMessage(original.notice))`, a 32-byte EIP-191 digest |
| publisher | Original envelope signer address |
| reason | Nonblank synthetic string, <=1000 characters |
| timestamp | Safe-integer Unix seconds |
| expiresAtBlock | Canonical positive decimal u64 string |

`revocationMessage` uses fixed JSON field order: domain `Beacon signed revocation v1`, version, chainId, project, action, noticeEntityKey (lowercase), noticeDigest (lowercase), publisher (lowercase), reason, timestamp, expiresAtBlock. EIP-191 signature is checked against the original notice signer after revalidating the original signature and exact target/digest. Unknown or extra fields and malformed signatures are rejected. Timestamp must not be over five minutes ahead of local time for a live status result.

Attributes: `project: str`, `type: str('revocation')`, `notice_key: str(lowercase entity key)`, `notice_digest: str(lowercase digest)`, `timestamp: u64`, `protocol_version: u64(1)`. Attributes are discovery hints, not authorization. Neither an unsigned publisher attribute, `$owner`, nor the revocation entity's `$creator` can replace signature verification. A correctly signed record may be relayed by a different creator.

Explicit Entity Expiration: freshly fetched notice expiration block plus 302400 blocks (seven nominal days at Tiramisu's two-second block interval), using `ExpirationTime.atBlock(...)`. The same absolute block is signed. Acceptance requires both actual entity expiration and signed retention to be later than the query snapshot block. External Lifetime Extension of storage does not bypass signed retention, and extension of the notice does not renew its revocation. A deleted/expired record is no longer live; revocation is not permanent or a complete historical archive.

Revocation lookup:
```ts
publicClient.select()
  .where(eq('project', str('beacon.synthetic.v1')), eq('type', str('revocation')),
    eq('notice_key', str(originalKey.toLowerCase())))
  .limit(100).fetch()
```
Walk cursor pages at the same snapshot, at most 20 pages/2000 candidates. A valid original signature first establishes the publisher; a valid positive target-bound revocation then yields Revoked by publisher as a separate status from the original signature result. No valid live record after a complete walk yields No verified live revocation found, never a claim that the notice was never revoked. Lookup failure, snapshot mismatch or a candidate limit without a valid positive result yields Revocation status unknown, not active.

Publishing rechecks wallet/account and fetches the exact original entity again before signing, then creates only the separate revocation, confirms the transaction and queries its record back. UI offers the action only to the matching connected original signer. Reader verification enforces authorization independently of that UI condition. Wallet rejection/unknown transaction outcomes are explicit and do not modify the original.

Arkiv supplies primary public notice storage, attribute discovery and immutable creator metadata independently of a Beacon server. Signatures alone can work on other storage; this is not claimed as unique to Arkiv. Frontend assets and ephemeral UI state stay off Arkiv. Real publishing keys stay in the connected wallet; root ignored .env is used only by separate Node scripts. The explicitly labeled local demo uses a separate ephemeral unfunded scalar in browser memory, never an environment or wallet key.
