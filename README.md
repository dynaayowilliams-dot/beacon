# Beacon

Tamper-evident synthetic public notices on Arkiv, the Web3 database. A fictional publisher signs a notice; changing its signed content must fail verification. A valid signature proves wallet control, not an organization's identity. All Arkiv entities are public and have Entity Expiration.

This is setup only: `packages/core` contains signing-message and verification helpers; `apps/web` is a Vite/React placeholder; `scripts/connection-proof.ts` is a Node-only write/query proof. No CLI package or OpenAI integration.

## Current status
Canonical hackathon AGENTS.md, RULES.md, rubric and checklist were read before changes. SDK 0.8.1 is now installed and inspected. Workspace typecheck and build passed. Builder reported successful Tiramisu read (count 0). Agent-session tests and reads via tsx hit a local uv_os_get_passwd ENOMEM startup error. No live write or on-chain evidence yet. See [friction](arkiv/friction.md).

## Install and check (Windows PowerShell)
Use Node >=22.12. In normal PowerShell with internet access:
```powershell
Set-Location 'C:\Users\HP\Documents\beacon'
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
corepack pnpm install
corepack pnpm exec tsc --noEmit
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm proof:read
```
Corepack uses the pinned pnpm version without a global install. Commit `pnpm-lock.yaml` after successful installation; subsequent installs should use `corepack pnpm install --frozen-lockfile`.

Inspect the actual installed SDK before sending a transaction:
```powershell
corepack pnpm list @arkiv-network/sdk viem
$sdkPath = (Resolve-Path 'node_modules/@arkiv-network/sdk').Path
Get-Content (Join-Path $sdkPath 'package.json')
Get-ChildItem $sdkPath -Recurse -File -Include *.d.ts | Select-String -Pattern 'createEntity|ExpirationTime|createdBy|select\(|expires|jsonToPayload'
```
Compare declarations with [official installation docs](https://docs.arkiv.network/start-here/installation/) and [query docs](https://docs.arkiv.network/typescript-sdk/querying-data/). Dependency range restricts SDK to 0.8.x. Stop and fix any type errors before writing.

## Fund and run the proof locally
Create a dedicated test-only account in your wallet application and label it `Beacon Tiramisu Test`. Do not use an account holding real funds. Add Tiramisu: chain ID `7738577`, RPC `https://rpc.tiramisu.db-chain.testnet.arkiv.network`, native token GLM, explorer `https://tiramisu.explorer.arkiv.network`. The [official network documentation](https://docs.arkiv.network/networks/tiramisu/) links directly to the [official faucet](https://hub.arkiv.network/faucet), verified 2026-10-17. Open that faucet in your browser, connect the dedicated account when prompted, and follow its displayed claim instructions. Verify the selected account matches your dedicated public address. The faucet says one claim per wallet per cooldown window; exact amounts and cooldown duration were not available in the browser text. Do not guess them. No faucet needs your private key or recovery phrase.

Configure the root ignored `.env` in a local editor. Never paste the key in chat, a shell command, screenshots, or frontend files. Run:
```powershell
Set-Location 'C:\Users\HP\Documents\beacon'
if (-not (Test-Path -LiteralPath '.env')) { Copy-Item -LiteralPath '.env.example' -Destination '.env' }
notepad.exe .env
```
Use your wallet application's account-specific export-private-key function for this dedicated test account. Put its 0x-prefixed key after `BEACON_PRIVATE_KEY=` in Notepad, save, and close the editor. Do not export your recovery phrase. The root Node script loads this file only for wallet commands; Vite's frontend lives under apps/web and has no key-loading code. `.env` and `.local/` are ignored. The folder currently has no Git repository, so Git index checks are unavailable until one is initialized.

Check the public address and balance without sending anything:
```powershell
$env:COREPACK_HOME = Join-Path (Get-Location) '.local/corepack'
pnpm.cmd proof:wallet
```
Confirm its public address matches the faucet account and `funded` is true. Then tell the coding agent that the local wallet is ready, without sharing the key. The agent can run the already authorized transaction. To run it yourself instead, run once:
```powershell
pnpm.cmd proof:write
```
Each write run creates one new synthetic notice with explicit 168-hour Entity Expiration. It confirms transaction success, queries by attributes and immutable creator, compares payload, verifies signature, and rejects tampered text. Successful output ends with `PASS` and includes actual `expiresAtBlock` (a block height, not a Unix time), public creator, transaction hash, entity key and query. A public receipt is saved under ignored `.local` before readback and updated with `verified: true` only after checks pass. If a write succeeds but readback fails, preserve the receipt and investigate before writing again. Raw transport errors and SDK debug output are suppressed.

Read-only checks need no key. Start the placeholder with `corepack pnpm dev` after checks pass. [Schema](arkiv/schema.md) documents the data contract. Signature helpers are a prototype, not a full untrusted-payload parser.

## Later submission work (outside this task)
Proposed track: Security; builder must choose tracks on Devfolio. Build the actual notice interface with creator provenance. Publish the MIT repo and a working Tiramisu deployment, record creator wallets and reproduction query, make a <=3 minute demo, and answer all required form questions. Keep deployment available through 23 October. Follow the [official checklist](https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/submission-checklist.md); setup alone does not pass the submission gates. No pre-existing project files were present; third-party dependencies and AI assistance must be disclosed accurately.
