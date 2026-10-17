# Bearkiv submission readiness and draft answers

Audit: 17 October 2026. Code baseline: [0eaa687](https://github.com/dynaayowilliams-dot/beacon/commit/0eaa687d3c1fb10aaf1a4ed64074ea20ee2d3604). This document is preparation, not a completed Devfolio submission or security certification. No product features were added.

Canonical sources read: [checklist](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/submission-checklist.md), [rules](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/RULES.md), [rubric](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/scoring-rubric.md), [agent guidance](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/AGENTS.md). Consult these for the complete requirements; numbered answers below map to the submission questions.

## Readiness checklist

- [x] MIT LICENSE and README Windows setup instructions exist.
- [x] Schema describes notice/revocation payloads, typed attributes, expiration and queries.
- [x] Friction report records actual failures/successes, versions and reproduction details; older entries describe historical states.
- [x] Two saved Tiramisu creation/readback proofs contain public evidence and an evidence-source label.
- [x] Root Vercel configuration installs all workspaces and runs all checks; refresh rewrites cover /app, /demo and /notice/:path*.
- [x] .env, .local/, dependencies, build/test output and common wallet exports are ignored; the corresponding local paths are not Git-tracked.
- [x] Most recent executed automated validation passed: typecheck, 19 tests, production build and browser-artifact security scan; see evidence boundaries below.
- [x] Builder confirmed public wallet-free board loading and /app refresh.
- [ ] TODO: confirm actual deployed SHA and judge-accessible public repo/site. Agent web fetching of both URLs failed during this audit; this does not establish an outage.
- [ ] TODO: deployed-origin shared-link refresh, tampering/reset and full Rabby publish/revoke checks.
- [ ] TODO: public video <=3 minutes, project media, current v2 notice/revocation receipts and verified explorer links.
- [ ] TODO: choose tracks, complete personal/team declarations and required Devfolio fields, submit there.
- [ ] TODO: commit/push this document and final evidence, preserve final submission SHA.

## Project fields

**Name:** Bearkiv.

**Relationship to Arkiv:** Bearkiv is an independent project built on Arkiv; it does not represent Arkiv or verify organizational identities.

**Tagline:** A clear signal. A verifiable source.

**Problem solved — draft:** Readers of community announcements, event updates and security advisories can be misled by altered or unattributed notices. Bearkiv lets a fictional publisher sign a synthetic public notice and readers verify it without connecting a wallet. It displays signature validity, immutable Arkiv creator provenance, expiration and independently verified publisher revocation. A local-copy simulation demonstrates how changing signed content fails verification. This protects integrity and identifies a signing wallet; it does not prove the content is true or a wallet represents an organization. No real-user research or impact statistics are claimed.

**Challenges encountered — draft:** We separated typed searchable attributes from signed payloads, distinguished creator provenance from message signatures, and handled expiring records and unavailable readback honestly. Revocation required binding the exact entity key and original digest independently of owner/attributes. Windows/sandbox issues included restricted RPC/npm access and a tsx startup error. Vercel initially ran root-intended commands from the web package; a subsequent root-only install omitted web dependencies. Explicit root script execution, recursive workspace installation and diagnostic build output addressed the locally reproduced configuration failures. These were our configuration/environment issues, not established Arkiv defects.

**Repository:** https://github.com/dynaayowilliams-dot/beacon

**Live app:** https://beacon-green-five.vercel.app — builder-reported public access; agent could not independently fetch it.

**Demo video:** TODO: public URL, duration <=3 minutes, signed-out access check.

**Builders and media:** TODO: team roster, Devfolio profiles and cover/demo media.

## Tracks: prioritize Security

**Security — proposed; builder must confirm selection.** Affected users are readers who might act on forged notices. Bearkiv verifies EIP-191 signatures, rejects changed/malformed content, surfaces immutable entity creator metadata and warns when a signed payload was copied by another creator. Publication readback filters by actual creator. Revocations require the original signing wallet and exact target/digest, not unsigned fields or mutable ownership. Evidence: [notice verification](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/notices.ts#L60), [creator warning/provenance](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/apps/web/src/notices.tsx#L53), [creator-filtered readback](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L140), [revocation authorization](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/revocations.ts#L28). The public feed is not a publisher allowlist; a valid signature is never an official-identity label.

Possible secondary tracks, subject to builder confirmation:

- **Censorship Resistance:** anyone can query the documented Arkiv dataset without Bearkiv's backend; there is no backend. Not immunity to RPC failure, hosting censorship, entity deletion or expiration.
- **Open Source:** MIT code and a reusable documented data contract. No external adopters are evidenced.
- **Privacy:** not recommended; content is public and no encryption/confidentiality feature exists.
- **Best Indian Use Case:** TODO eligibility and relevant use-case evidence. Do not select by assumption.

## Devfolio draft answers

### 1. Live app

https://beacon-green-five.vercel.app — /app is the notice board; /demo is the wallet-free simulation. Builder confirmed public reading and /app refresh; public exact-notice refresh is still TODO.

### 2. Indian-nationality eligibility

TODO — builder answers privately in Devfolio. No nationality inferred from name, account or location.

### 3. Why Arkiv?

Arkiv is Bearkiv's primary public data layer: wallet-submitted entities, immutable creator metadata, typed attribute queries, cursor retrieval and explicit Entity Expiration share one integration. Readers can retrieve records and verify signatures without trusting a Bearkiv-operated API to return the original payload. Another client can use the same data contract.

This app is possible with another database. A Postgres/API implementation could retain signatures but would depend on that operator for availability and canonical retrieval unless a separate public distribution/verification layer were added. IPFS can hold signed content, but this design would need an attribute index and availability/retention arrangements. A subgraph could index a custom contract, requiring additional contract/indexing infrastructure. Arkiv supplies this particular public entity/query/creator/expiration model together. EIP-191 cryptography is not an Arkiv-exclusive capability.

Tradeoffs: all entities are public; writes need test funds and wallet approval; RPC/indexing may fail; entities expire or may be deleted. Client-side sorting covers loaded records, not a globally ordered server feed. Missing revocations do not establish complete history. Bearkiv has no independent archival backend. Wallet secrets, signing, verification and local simulation stay off Arkiv; only synthetic signed envelopes and searchable metadata are stored.

### 4. Implemented Arkiv features and exact code links

Links are pinned to the audited code, not future main changes.

| Use | Purpose and limits | Code |
| --- | --- | --- |
| HTTP public client, Tiramisu 7738577 | Wallet-free reads; network checked before queries | [client](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L14) |
| createEntity, JSON payload, str/u64 attributes | Store signatures/content in payload; query metadata separately and compare it to signed fields | [publication](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L110), [inspection](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L27) |
| Compound select/where/limit/fetch, cursor | Feed pages of 50; sort loaded rows locally | [feed](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L50) |
| Immutable creator and createdBy | Show provenance; publication readback filters actual creator | [UI](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/apps/web/src/notices.tsx#L53), [readback](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L140) |
| getEntity and exact shared key | Verify exactly the linked record, with honest missing/expired/malformed/unavailable states | [loader](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/sharing.ts#L17) |
| Entity Expiration | Browser signed deadline via atDate; UI choices 1/24/168 hours; legacy proof uses fromHours(168) | [write](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L123), [UI](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/apps/web/src/main.tsx#L141), [proof](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/scripts/connection-proof.ts#L58) |
| Separate revocation entity, atBlock | Fresh original expiration +302400 blocks (seven nominal days), also signed; both storage and signed bounds limit acceptance | [write](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/revocation-arkiv.ts#L52) |
| Revocation query/cursor pages | 100/page, max 20 pages; independent signature/target/digest checks; failed/incomplete lookup is unknown | [reader](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/revocation-arkiv.ts#L20), [verifier](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/revocations.ts#L28) |
| Receipt confirmation and verified readback | Preserve genuine public identifiers on uncertain readback, discourage duplicate submission | [notice](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/arkiv.ts#L129), [revocation](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/packages/core/src/revocation-arkiv.ts#L71) |

Not implemented/claimed: Lifetime Extension, ownership transfer, creation flags, batch writes, WebSocket events, access keys, encryption or backend indexing. Numeric attributes exist, but the current app does not issue numeric range filters. Revocations neither delete nor alter the original and are not permanent. Correctly signed relayed revocations are accepted even if another account submitted them; wallet ownership or creator metadata alone cannot authorize revocation.

### 5. Friction report

https://github.com/dynaayowilliams-dot/beacon/blob/main/arkiv/friction.md

Includes exact-key loading, SDK/browser-wallet integration, retention decisions, tooling and deployment failures. Historical observations are retained alongside later results. TODO: add final deployed-origin outcomes; make documentation/faucet/explorer coverage as reproducible as the detailed SDK/tooling entries. Some sections share global version context rather than repeating it per surface. Do not describe sandbox restrictions or our Vercel mistakes as SDK bugs.

### 6. Public entity-creator wallets

| Address | Evidenced role |
| --- | --- |
| 0x98Ee00009c448c0D83aFE306E4cE29f6B8Fdb77a | Dedicated funded Tiramisu test account; creator/signing account for both saved v1 Node-script notice proofs. Builder reported successful browser flows, but no saved browser receipt establishes a specific v2/revocation creator yet. |

TODO: obtain the exact public creator of the browser v2 notice and revocation from verified receipts. If the same address is confirmed, extend its roles; do not invent another address. Visitors can publish from their own wallets, which are not enumerated in advance. Ephemeral unit-test and local-demo accounts are not funded Arkiv entity creators. This is not a prize payout-wallet declaration.

### 7. Schema

https://github.com/dynaayowilliams-dot/beacon/blob/main/arkiv/schema.md

Schema covers both entity types and legacy v1 compatibility. TODO: refresh historical top-level deployment wording in schema/README/friction before final submission; their earlier unverified deployment/test summaries are not current claims.

### 8. Reproduction commands, queries and real examples

PowerShell, no secret needed for reading/building:

```powershell
git clone https://github.com/dynaayowilliams-dot/beacon.git
Set-Location .\beacon
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
corepack pnpm --recursive install --frozen-lockfile --prod=false
corepack pnpm --workspace-root run build:vercel
corepack pnpm proof:read
corepack pnpm --filter @beacon/web preview --host 127.0.0.1 --port 4175 --strictPort
```

Requires Git, Node>=22.12 and Corepack (tested Node 24.20.0, pnpm 10.18.3). Preview: http://127.0.0.1:4175/app. Stop an old preview with Ctrl+C if the port is occupied. Install Corepack through normal Node tooling if unavailable; do not weaken execution policy. The web app needs no .env or private key. Judge installation uses the registry; the clean local validation used a complete offline cache.

1. Read /app without connecting a wallet; inspect signature and immutable creator under on-chain provenance.
2. Open a notice, copy its link and refresh that exact URL. Do not substitute another record when missing/expired.
3. Visit /demo, edit the local body, observe invalid verification, then reset. Its explicitly labeled synthetic local fallback is not on-chain evidence.
4. Optional synthetic write: connect a dedicated funded Rabby Tiramisu account, choose explicit expiration, approve the message and transaction, wait for verified readback and save public receipt details. Never add a key to Vercel/frontend.
5. From that notice, use the matching publisher to issue a synthetic revocation, approve both prompts, verify readback and refresh. The original remains; its signature result is separate. Save exact target, revocation key/hash/creator/expiration. Different-wallet UI and unavailable-lookup states must be honest.

Exact feed query, generated locally by the installed SDK toString during this audit (not a live fetch):

```text
project = str('beacon.synthetic.v1') AND type = str('notice')
```

Web page limit 50; Node proof reader limit 10. Cursor/limit are separate query-builder parameters. Exact historical readback:

```text
project = str('beacon.synthetic.v1') AND type = str('notice') AND notice_id = str('a51ba19c-fef2-4a65-9db7-55eb29be8812') AND $creator = addr(0x98Ee00009c448c0D83aFE306E4cE29f6B8Fdb77a)
```

Exact revocation query for that real notice key; no claim a matching revocation exists:

```text
project = str('beacon.synthetic.v1') AND type = str('revocation') AND notice_key = str('0x68f15efc9bb3d659fd21a67f338bf7dde1ed97b60d65fb943c7c4edeeb067cd2')
```

Run these exact queries read-only in PowerShell from the repository root:

```powershell
@'
import { createPublicClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { str } from '@arkiv-network/sdk/attr';
import { eq } from '@arkiv-network/sdk/query';
import { http } from 'viem';
const client = createPublicClient({ chain: tiramisu, transport: http('https://rpc.tiramisu.db-chain.testnet.arkiv.network') });
if (await client.getChainId() !== 7738577) throw new Error('Wrong chain');
const publisher = '0x98Ee00009c448c0D83aFE306E4cE29f6B8Fdb77a';
const key = '0x68f15efc9bb3d659fd21a67f338bf7dde1ed97b60d65fb943c7c4edeeb067cd2';
const queries = [
  client.select().where(eq('project', str('beacon.synthetic.v1')), eq('type', str('notice')), eq('notice_id', str('a51ba19c-fef2-4a65-9db7-55eb29be8812'))).createdBy(publisher).limit(10),
  client.select().where(eq('project', str('beacon.synthetic.v1')), eq('type', str('revocation')), eq('notice_key', str(key))).limit(100),
];
for (const query of queries) {
  console.log(query.toString());
  const page = await query.fetch();
  console.log(JSON.stringify({ block: page.blockNumber.toString(), cursor: page.cursor ?? null, entities: page.entities.map(e => ({ key: e.key, creator: e.creator, expiresAtBlock: e.expiresAt.toString() })) }, null, 2));
}
'@ | node --input-type=module -
```

Only public metadata is printed. Query hits alone do not verify signatures: use Bearkiv's verifier. If cursor is nonempty, this command shows only the first page; app readers paginate. A zero count after expiration does not invalidate historical creation evidence.

Real examples copied from saved builder-supplied verified output:

- First v1: [receipt](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/arkiv/connection-proof.json), entity `0x5092e2b26a8e5a3fa6e4c729979c27918b91ac9eb088d028c3532d2c7c32583e`, [transaction](https://tiramisu.explorer.arkiv.network/tx/0xa36ea77c2810a8af8692fdf6e288f540b2fbb27f355560d77e865609b423de35), readback block 693750, expiration block 996149, requested 168 hours.
- Second v1: [receipt](https://github.com/dynaayowilliams-dot/beacon/blob/0eaa687/arkiv/connection-proof-second.json), entity `0x68f15efc9bb3d659fd21a67f338bf7dde1ed97b60d65fb943c7c4edeeb067cd2`, [transaction](https://tiramisu.explorer.arkiv.network/tx/0xed7dc8e52998bc9821ad7755b55f0fc2df588492c9bec59ffe9a457ba10afc8f), readback block 696028, expiration block 998427, requested 168 hours.

[Second historical shared URL](https://beacon-green-five.vercel.app/notice/0x68f15efc9bb3d659fd21a67f338bf7dde1ed97b60d65fb943c7c4edeeb067cd2). Current availability and explorer reachability are unverified. Preserve receipts/video beyond expiration. TODO: current v2 example and matching revocation with exact query and creation receipts.

### 9. Pre-existing work and third-party components

Git history inspected: d8fdb32 initial workspace (17 October 2026 12:31:39+01:00); aa2508d proof documentation; 0760d3e browser/sharing/revocation; 3bd4610 root build runner; 0eaa687 workspace install correction. No earlier history is present. Commit dates do not prove when each line was originally authored.

**Pre-existing builder work:** TODO: builder confirms whether code/templates/assets from before 9 October were reused. Do not answer None solely from Git dates. If yes, disclose baseline SHA/source and components. No QuickHealth files/packages appear in the tracked Bearkiv project list; this does not prove absence of all prior work.

**Verified third-party dependencies:** Arkiv SDK 0.8.1; viem 2.57.7; React/React DOM 19.3.1; Vite 7.3.7; TypeScript 5.9.3; tsx 4.23.15; Node/React type packages; @noble/curves 1.9.1 for the local simulation's real secp256k1 signatures. See manifests and pnpm-lock.yaml for transitive dependencies. Upstream licenses still apply; MIT project licensing does not replace them. Inspected UI uses custom CSS/system fonts, with no generated bitmap assets or decorative dependency observed. TODO: disclose any copied snippets/templates/assets not evident in Git; review upstream attribution obligations.

### 10–11. Arkiv surfaces actually used

- **TypeScript SDK:** yes, code imports and historical entity proof.
- **Docs:** yes, query/mutation/browser integration/network docs consulted and recorded in friction.
- **Faucet:** yes, builder reported claiming Tiramisu tokens; official faucet instructions checked earlier. No automated funding claimed.
- **Hub:** faucet was accessed through Hub; select only for that limited use if appropriate, not other unverified Hub functionality.
- **Block Explorer:** genuine transaction links are provided in UI/receipts. TODO: builder confirms inspecting those receipts; agent could not fetch them. Do not claim successful explorer verification.
- **Direct JSON-RPC:** no distinct handwritten integration; SDK/viem use HTTP RPC internally. Do not claim a separate direct-RPC development surface.
- **WebSocket events, access keys, Data Explorer, Arkiv MCP, Arkiv skills, Arkiv Plugin:** no evidence of use; do not select.
- **Other:** none evidenced; TODO only if builder used another surface.

### 12. Time to first entity

TODO — builder chooses the appropriate elapsed-time category privately. Git timestamps do not establish elapsed builder time.

### 13. Actual tools and LLMs

Recorded workflow: OpenAI Codex coding agent, ChatGPT guidance/conversations, PowerShell, Node/Corepack/pnpm, TypeScript, Git/GitHub, React/Vite, Arkiv SDK, viem, @noble/curves, Rabby, Tiramisu faucet, Vercel and web documentation tools. Builder reported GitHub CLI installed/authenticated; most final Git actions ran in PowerShell Git. Git Bash reproduced the silent missing-script failure. Tests use Node's built-in runner.

**LLM answer draft:** OpenAI Codex and ChatGPT assisted implementation, debugging, tests, documentation and deployment guidance. Exact model names/versions: TODO, not reliably recorded. TODO: builder confirms any other assistants/models. No OpenAI API/LLM integration is part of the product. Do not answer None for AI assistance.

### 14. One evidence-based Arkiv improvement

**Draft:** publish one version-pinned, tested SDK 0.8 browser-wallet/pnpm workspace reference app covering typed metadata versus signed payload, immutable creator provenance, Entity Expiration, receipt confirmation and verified attribute readback. Bearkiv needed installed-package inspection and a handwritten retry/readback path alongside framework/workspace integration. A tested end-to-end recipe would reduce uncertainty for a beginner. This is a documentation/example recommendation inferred from this build, not a measured user-feedback claim or accusation that Arkiv caused our Vercel errors. It should distinguish RPC/indexing issues from SDK errors and preserve public transaction evidence when readback is uncertain. See friction for actual observations.

### 15–18. Personal declarations — builder only

TODO: feedback-call preference; work-period/ownership and third-party disclosure acknowledgement; public-link/MIT acknowledgement; optional Devcon attendance. This document gives no consent or acknowledgement on the builder's behalf.

Registration-only private TODOs: team/age/organizer eligibility, nationality, contact/Telegram, residence, communities/background, previous Arkiv use, discovery source, payout wallet, KYC and contact-use consent. Do not publish personal declarations or payout details in this file.

## Evidence boundaries and remaining audit findings

| Evidence | Established | Limit |
| --- | --- | --- |
| Code/Git audit this turn | MIT, setup commands, source exports, expiration, query text, creator UI, independent signature/target checks, ignore rules, five commits through 0eaa687 | Not a penetration test or full security certification |
| Most recent executed automated checks | Fresh Git clone without node_modules/dist; actual frozen recursive install from complete offline cache; React/DOM/types/Vite resolved; typecheck, 19 tests, build, four-artifact security scan passed | Preceding deployment-fix work, not rerun for documentation-only changes; Windows rather than cloud/Linux validation; nonfatal >500kB JS warning |
| Historical chain evidence | Two builder-run v1 writes with receipt, attribute/creator/payload readback, signature and tamper checks preserved in JSON | Agent did not independently re-fetch; current liveness unknown |
| Builder manual reports | Rabby publication worked; local-preview revocation showed success and survived refresh; public /app read without wallet and survived refresh | No public v2/revocation receipt supplied; deployed-origin full flow and shared-link refresh remain TODO |
| Public links | Builder-supplied URL and successful Git push output | Agent web tool could not fetch repo/site, so independent accessibility check is open |
| Secret exclusions | Ignored paths verified and absent from tracked list; earlier source/artifact pattern scans passed; document contains public evidence only | Pattern checks are not proof of absence of every unknown secret; no secret files/values were read |

Schema/README/friction retain stale historical deployment/test summaries; align their top-level wording with current verified outcomes before final submission. Some friction entries use shared version context; concise per-surface reproduction coverage could improve reviewability. No write transaction was performed for this audit.

## Blockers in priority order

1. **Video/live reproducibility:** public <=3-minute demo; verify deployed-origin shared-link refresh, tamper/reset, publish/revoke; confirm deployed SHA and signed-out public access.
2. **Current on-chain evidence:** save a verified v2 notice and revocation with public creator/hash/key/query/expiration; inspect real explorer receipts. Historical v1 evidence alone does not show the entire browser flow.
3. **Devfolio completion:** confirm Security and any justified secondary track, eligibility/team/prior-work disclosures and required personal acknowledgements; submit on Devfolio, not only in GitHub.
4. **Final documentation snapshot:** resolve TODOs, refresh stale summaries, commit/push this document and final evidence before 18 October 2026 22:59 UTC. Preserve deadline history and keep deployment available through 23 October.

Branding compatibility: the visible product is Bearkiv. Existing repository/deployment URLs, `@beacon/*` packages, `beacon.synthetic.v1` query namespace and Beacon signature domains remain unchanged for existing notices. The rename does not modify stored entities.
