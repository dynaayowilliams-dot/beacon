# Beacon

A tamper-evident public notice board on Arkiv Tiramisu. Use only synthetic notices and fictional publishers. A valid wallet signature proves control of a wallet, not an organization's identity or the truth of a notice.

## Run locally (Windows PowerShell)

Use Node >=22.12 (tested with 24.20.0). Open normal PowerShell:

```powershell
Set-Location 'C:\Users\HP\Documents\beacon'
$env:Path = "$HOME\.local\bin;$env:Path"
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
pnpm.cmd install --frozen-lockfile
pnpm.cmd dev
```

Open the Local URL Vite prints (normally http://localhost:5173): `/` is the landing page, `/app` is the working notice board, `/demo` is the wallet-free tampering demo, and `/notice/<entity-key>` is an exact shared notice. Keep PowerShell open. Press Ctrl+C to stop. If pnpm.cmd is unavailable, use `corepack pnpm` in its place.

If Vite's development optimizer reports a filesystem access error, use the production preview instead (this path was HTTP-smoke-tested in the agent session):

```powershell
pnpm.cmd build
pnpm.cmd --filter @beacon/web preview --host 127.0.0.1 --port 4173 --strictPort
```

Then open http://127.0.0.1:4173. It serves the built app; rebuild after changing source files. It still reads real Tiramisu data and uses the browser wallet.

**The web app needs no .env file or private key.** Read without connecting a wallet. Publishing uses Rabby or another injected EIP-1193 browser wallet. No backend or OpenAI service is involved. The ignored root .env is exclusively for the earlier Node connection-proof script; never copy it into apps/web or create VITE_ secret variables.

## What the app does

The interface uses warm ivory, lavender, blush and restrained champagne-gold accents with dark plum text. Compact introductory content keeps the notice board central. Cards have generous spacing, soft borders and shadows; serif headings use installed system fonts, with no decorative dependencies or remote font requests. Signature, expired and pending states pair explicit text with icons. Layouts stack on narrow screens; focus rings and reduced-motion preferences are supported.

- Queries real entities from the public Tiramisu RPC through `@beacon/core/arkiv`. It never substitutes mock notices. Loading, empty, connection-error and stale-data states are explicit.
- Reads 50 entities per cursor page. Load more to continue the same snapshot; refresh starts a new snapshot. Orders loaded entities by on-chain creation block in the browser. This is not a globally ordered server query.
- Shows signed content, claimed publisher wallet, immutable creator, topic, severity, actual Entity Expiration block and signed deadline. Expand on-chain provenance for the entity key.
- Verifies EIP-191 signatures locally. Labels are exactly `Valid wallet signature`, `Invalid wallet signature` or `Malformed notice`. Creator mismatch and unsigned/indexed metadata mismatch are separate warnings. Publisher display labels are self-asserted.
- New notices use message v2. Existing v1 connection-proof notices remain readable and verifiable, with explicit warnings that their topic, severity and expiration were not signed. Those fields are not invented for v1.
- Lets visitors edit the body of an in-memory copy of a retrieved notice. The same verifier runs on the altered copy. Reset restores verification for a valid original. No transaction or original-entity update occurs.
- Each notice has an Open notice link and Copy link button using its exact Arkiv entity key. Direct loading verifies that entity rather than selecting a substitute. Absent/deleted/expired data, malformed content and RPC failure are distinguished as far as the SDK allows.
- The landing-page demo opens `/demo`, reusing the same simulation. It searches up to five feed pages for a valid signed notice. If none is found or RPC fails, it clearly labels a locally signed synthetic example as NOT on Arkiv. No mock records are substituted in the public board or shared links.
- A matching connected publisher can sign and publish a separate revocation entity. The notice is never patched or deleted. Readers verify the original wallet's signature, exact target key and original message digest independently; signature validity remains separate from revocation status.

## Shared links and wallet-free demo

The landing page contains only a clearly labeled Illustrative example, not an invented live record or verification claim. Navigation and footer link to the board, demo, explanations and the GitHub URL confirmed from this checkout's Git remote.

On a real card, choose Copy link or Open notice. Share `/notice/0x...` using that exact entity key. A copied link is stable as an identifier, not a storage availability guarantee. SDK NoEntityFoundError does not distinguish never-created, deleted and expired entities, so the UI says Missing or expired rather than inventing a cause. A retrieved entity past its signed deadline is explicitly expired. Malformed entity keys never reach RPC. Actual known creation hashes link to the explorer; missing transaction evidence is not invented.

The demo is available without a wallet. Real retrieved data is identified as such; otherwise the local example uses fresh Web Crypto entropy and the existing secp256k1 implementation (@noble/curves 1.9.1, now an explicit core dependency) to produce an actual EIP-191 signature. The entropy buffer is cleared immediately after signing, and no funded account, environment key, entity key or transaction is involved. Change body text to fail verification; Reset copy restores the original signed body. No signature is fabricated and no local example is presented as an on-chain record.

## Signed revocation

Connect the original signing wallet on `/app` or a shared notice. Only cards with a valid original signature and a matching connected publisher show Issue signed revocation. On Tiramisu, provide a synthetic reason and approve the separate message and transaction. A wallet check and fresh exact-entity lookup run before publishing. Only a createEntity call is made: the original stays untouched. Publication and revocation share a UI transaction lock to prevent concurrent wallet prompts.

The deterministic revocation message binds domain/protocol version, chain, project, action, exact notice entity key, EIP-191 digest of the original canonical message, original publisher, reason, timestamp and signed expiration block. A reader verifies against the original notice signer, not an unsigned attribute or current owner. Valid signed records may be relayed by another creator; creator metadata alone cannot authorize a revocation.

Status is separate from the original signature: Revoked by publisher, No verified live revocation found, or Revocation status unknown. A failed/incomplete query never means active. Results show the checked block. Discovery walks up to 20 pages of 100 candidates; exceeding that bound returns unknown unless a valid positive record was already found. Wrong-wallet, wrong-target, wrong-digest, malformed, expired and more-than-five-minutes-future timestamp records are ignored. No verified live revocation found does not prove that no earlier revocation ever existed.

Entity Expiration is an explicit absolute block: the notice's freshly fetched expiration block plus 302400 blocks (seven nominal days at two seconds per block). That retention bound is signed. Actual storage expiration and signed retention both constrain acceptance. Deletion or expiration can remove the record; later Lifetime Extension of the original does not renew it. Revocation is not permanent. This app does not provide complete historical revocation indexing.

## Publish with Rabby

Builder-reported validation: publishing through Rabby works. This is a manual report, not an agent-executed browser test. A v2 browser transaction receipt has not yet been added to this repository; the two saved receipts below document the earlier v1 script proofs. Test the deployed origin separately, including wallet-free reading.

1. Open the app in the browser that has Rabby installed. Select Rabby if more than one wallet is listed, then click Connect wallet. Confirm the public address matches your dedicated funded test account.
2. If the app says Wrong network, click Switch to Tiramisu and approve. Unknown-chain handling offers to add the official network. Chain ID is 7738577, native token GLM, RPC https://rpc.tiramisu.db-chain.testnet.arkiv.network.
3. Enter a fictional label, title, body, topic and severity; choose 1 hour, 24 hours or 7 days of Entity Expiration. Confirm the synthetic-data checkbox. Everything is public.
4. Click Sign & publish notice. First approve the deterministic EIP-191 message, then approve the transaction using test GLM. Account and chain are rechecked between those steps; transaction chain checks also run in viem.
5. Wait for confirmation and attribute readback. `Published and verified` means the receipt succeeded and a query returned the same entity, creator, indexed fields, payload and valid signature. The feed refreshes automatically. A confirmed transaction with incomplete readback shows its public identifiers with a warning; do not blindly publish again.

Wallet account/network changes update the UI. Rejected requests show a safe rejection message. Other failures never render raw wallet/SDK errors. If the SDK reports a public transaction hash on failure, publishing pauses and links to its explorer outcome to reduce accidental duplicate writes.

Faucet: https://hub.arkiv.network/faucet, linked from the [official network docs](https://docs.arkiv.network/networks/tiramisu/). The faucet never needs a private key or seed phrase.

## Checks

Latest agent results for landing/sharing/demo/revocation work: typecheck passed; 16 tests passed, 0 failed; production build passed; all four generated browser artifacts passed the bundle audit. Production-preview route checks returned HTTP 200 with the React entry for `/`, `/app`, `/demo` and an exact-key notice URL. These are HTTP/code checks, not rendered-browser or deployed Vercel verification. Live Tiramisu reads remained blocked in the agent session; live Rabby revocation has not been exercised here. No new transaction success is claimed.

```powershell
Set-Location 'C:\Users\HP\Documents\beacon'
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd check:bundle
```

Core tests compile TypeScript and run JavaScript using Node's test runner, avoiding the agent sandbox's tsx startup ENOMEM. Tests cover legacy signatures, every v2 signed field, malformed input, local-copy isolation, creator mismatch, untrusted entity metadata, wrong-chain/account guards and signature rejection before transactions, plus exact shared-link loading, unavailable/missing/expired/malformed states, valid and forged revocations, all signed revocation fields, wrong targets/digests, incomplete lookup, expired retention and a real locally signed demo. `check:bundle` scans only built browser artifacts for secret patterns, unexpected sensitive files, Node-only imports and private-key account helpers; it never reads .env or secret environment values. This is a pattern/architecture check, not a guarantee of detecting every possible unknown credential. Actual Rabby approvals and a live browser write use the manual checklist below; they are not claimed as automated tests.

## Manual checklist

- Without a connected wallet, load the feed and inspect a notice. If the query is genuinely empty, see the empty state, not samples. Disconnect the internet and Refresh: see connection error; reconnect and retry.
- Connect Rabby; confirm the public address. Switch to another chain: publishing must be blocked. Switch to Tiramisu using the app.
- Fill synthetic data and reject the first signature request: see rejection and no transaction request. Retry; sign the message but reject the transaction: see rejection and no success banner.
- Approve both requests once. Wait for `Published and verified`, note the explorer link, actual Entity Expiration block and entity key, and find the notice in the refreshed feed (or Load more).
- Open the local tampering simulation on that notice. Change the body: see Invalid wallet signature. Reset: see Valid wallet signature. No wallet prompt should appear and the original notice must stay unchanged.
- Test keyboard navigation and a narrow browser window. Use a separate test-only account; do not put any real personal data in notices.
- Visit `/`, follow Open Beacon to `/app`, and try the demo without connecting a wallet. If RPC is offline, confirm the demo explicitly labels its local example NOT on Arkiv; the board must still show a connection error.
- Copy a real notice link. Open it in a new tab and refresh. It must load that exact entity. Try a malformed key, an unavailable RPC and a genuinely absent/expired key; check the honest status messages.
- On a notice signed by your connected test wallet, issue one synthetic revocation. Approve both requests, wait for confirmation/readback, and confirm Revoked by publisher appears while Valid wallet signature remains separate. The original entity key/content must remain unchanged. Connect another wallet: the revoke action must not appear. These live revocation steps have not been performed by the agent.
- Disable RPC access and recheck revocation: status must be unknown, never active. On the deployed origin directly refresh `/app`, `/demo`, and a known `/notice/<entity-key>` link to check the Vercel rewrites.

## Connection proof and verification limits

Two earlier v1 synthetic entities were successfully written and queried back by the builder's existing script. Its supplied JSON includes `verified: true` and the final PASS line. Public receipts are retained in [first proof](arkiv/connection-proof.json) and [second proof](arkiv/connection-proof-second.json). Latest transaction: `0xed7dc8e52998bc9821ad7755b55f0fc2df588492c9bec59ffe9a457ba10afc8f`; creator `0x98Ee00009c448c0D83aFE306E4cE29f6B8Fdb77a`; readback block 696028, expiration block 998427. This is historical builder-executed evidence; the agent's fresh RPC attempt remained blocked. Expired or deleted entities may no longer appear in the feed.

The existing Node-only scripts remain `pnpm.cmd proof:read`, `pnpm.cmd proof:wallet` and `pnpm.cmd proof:write`. Do not rerun a write merely to refresh an existing proof. If intentionally running a Node write, edit ignored root .env locally to set BEACON_PRIVATE_KEY; never paste it in chat or a command. Browser publication never reads it.

## Deploy publicly with Vercel

Deployment preparation is complete locally; no Vercel project, build or live URL is claimed yet. The current Git remote is https://github.com/dynaayowilliams-dot/beacon.git. The agent session cannot write Git's index or reach GitHub, so the latest working-tree code must be committed and pushed in normal PowerShell before importing it. No force-push or history rewrite is needed.

First save the reviewed project files to GitHub:

```powershell
Set-Location 'C:\Users\HP\Documents\beacon'
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
pnpm.cmd check:bundle
if ($LASTEXITCODE -ne 0) { throw 'Bundle audit failed. Stop here.' }
git -c safe.directory=C:/Users/HP/Documents/beacon add -- .
if ($LASTEXITCODE -ne 0) { throw 'Staging failed. Stop here.' }
git -c safe.directory=C:/Users/HP/Documents/beacon diff --cached --stat
git -c safe.directory=C:/Users/HP/Documents/beacon diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Staged diff check failed.' }
git -c safe.directory=C:/Users/HP/Documents/beacon commit -m "Prepare Beacon public app for Vercel deployment"
if ($LASTEXITCODE -ne 0) { throw 'Commit failed. Stop here.' }
git -c safe.directory=C:/Users/HP/Documents/beacon push origin main
if ($LASTEXITCODE -ne 0) { throw 'Push failed. Do not force-push.' }
$beaconLocalCommit = git -c safe.directory=C:/Users/HP/Documents/beacon rev-parse HEAD
$beaconRemoteRef = git -c safe.directory=C:/Users/HP/Documents/beacon ls-remote origin refs/heads/main
if ($LASTEXITCODE -ne 0 -or -not $beaconRemoteRef) { throw 'Remote verification failed.' }
if (($beaconRemoteRef -split '\s+')[0] -ne $beaconLocalCommit) { throw 'Local and remote main differ.' }
Write-Output "Verified pushed commit: $beaconLocalCommit"
```

`.env`, `.local/`, `.vercel/`, node_modules, built output, generated tests and common wallet exports are ignored. The only .env-style file intended for Git is the empty .env.example template. Never force-add ignored files. These instructions affect Beacon only.

Then use the Vercel website (no CLI installation needed):

1. Sign in at https://vercel.com using GitHub. Choose Add New > Project, grant access to dynaayowilliams-dot/beacon, and Import it. Confirm the selected production branch is main.
2. Keep **Root Directory at the repository root**, displayed as `./` or empty. Do not select apps/web: this configuration intentionally builds the workspace from the root where the lockfile and shared core package are available.
3. Use Framework Preset **Vite**, Node.js **24.x**, and the settings below. The tracked root vercel.json supplies the install/build/output settings.
4. Under Environment Variables add only **ENABLE_EXPERIMENTAL_COREPACK = 1** for Production and Preview. This is a nonsecret build-tool flag so Vercel honors packageManager pnpm@10.18.3. Do not upload .env or add BEACON_PRIVATE_KEY, seed phrases, wallet keys, RPC access secrets or VITE_ secrets. The app itself requires no environment variables.
5. Click Deploy. If settings differ from the table, correct them before retrying. Do not replace pnpm with npm. Copy the live Production URL only after Vercel reports Ready.
6. In Project Settings > Deployment Protection, ensure the production URL is publicly accessible without Vercel sign-in, then confirm in a signed-out/private browser window. Do not assume a preview URL is public.

| Vercel setting | Exact value |
| --- | --- |
| Root Directory | Repository root (`./`), not apps/web |
| Framework Preset | Vite |
| Node.js Version | 24.x |
| Install Command | `corepack pnpm install --frozen-lockfile` |
| Build Command | `corepack pnpm typecheck && corepack pnpm test && corepack pnpm build && corepack pnpm check:bundle` |
| Output Directory | `apps/web/dist` |
| Production Branch | main |
| Build-tool variable | `ENABLE_EXPERIMENTAL_COREPACK=1` |
| Application secrets | None |

Only apps/web/dist is served. No functions, backend, wallet keys or Node proof scripts are deployed. Root vercel.json rewrites `/app`, `/demo` and `/notice/:path*` to index.html so direct navigation and browser refresh load the React entry. Static assets retain their normal paths. The ivory/lavender/champagne styling is part of the built CSS and remains unchanged.

Official references checked for this configuration: [Vercel build settings and Corepack](https://vercel.com/docs/builds/configure-a-build), [package-manager selection](https://vercel.com/docs/package-managers), [supported Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

After deployment, verify the actual public URL: read a real notice with no wallet connected; confirm an empty feed is shown honestly if entities have expired; test a narrow screen; connect Rabby on the new origin; publish one intentional synthetic notice and retain its transaction/key/readback evidence; change a local copy and confirm signature failure. A private browser session can check reading without any wallet extension. A wallet connection on localhost does not automatically authorize a new deployment origin.

## Remaining submission work

- Push the latest reviewed code and confirm the remote main commit; this session has not done so.
- Deploy and verify the public production URL without wallet or Vercel sign-in; keep it available through 23 October.
- Record the actual v2 browser publication transaction/entity and creator wallet; do not fabricate missing evidence. Existing v1 proof receipts remain available even after live Entity Expiration.
- Complete a <=3-minute demo covering independent reading, wallet publishing, provenance and tampering. No video is recorded here.
- Confirm track choice (Security remains proposed), register/submit on Devfolio, and answer every required form question including why Arkiv, actual friction, surfaces used, time to first write, AI assistance and pre-existing work.
- Check eligibility and final links against the canonical rules. Deadline is 18 October 2026 22:59 UTC. Do not rewrite deadline history. Submission completion has not been verified.

## Architecture and license

[Schema](arkiv/schema.md) specifies v1/v2 fields, signed serialization, expiration and exact queries. [Friction](arkiv/friction.md) records actual integration results and environment issues. SDK 0.8.1 and viem are locked in pnpm-lock.yaml. packages/core contains browser-safe validation, verification, querying and wallet publication; apps/web contains React UI; scripts contains Node-only proof tooling.

MIT licensed. No backend, CLI package, encryption, co-signing, identity registry or OpenAI integration. Public publishing is permissionless; a matching namespace is not trust. EOA message signatures are supported; smart-contract wallet signature standards are outside this flow. No permanence is claimed: all notices and revocations have Entity Expiration and may be deleted. Lifetime Extension is not implemented; signed deadlines/retention bounds are not automatically renewed.

This local app is not yet a full hackathon submission. A public deployment, <=3 minute demo, chosen track, creator wallet evidence and completed Devfolio answers are still required by the [canonical checklist](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/submission-checklist.md). Current proposed track is Security.

### Finding the revoke action
Open `/app`, then **Open notice** on your own signed notice (`/notice/<entity-key>`). Select Rabby in the wallet panel and connect the original publishing account on Tiramisu. An already-authorized account is restored silently on page load. The prominent **Revoke notice** button appears beneath the signature/revocation status when the verified publisher matches your account (case-insensitive). Unavailable actions explain why; pending checks, wrong network, and transactions in progress disable submission. A verified existing revocation prevents another submission. Revocation signatures are still independently checked on publication and readback.
