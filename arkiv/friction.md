# Actual build observations

## Follow-up: installed SDK and wallet preparation
Builder reports pnpm install and typecheck passed, and proof:read returned chainId 7738577, namespace/type query, count 0. This confirms the builder's read path; zero matches is not a connection failure. Installed package inspected directly: SDK 0.8.1. Checked createEntity source (explicit expires, returns entityKey/txHash/expiresAt), query result blockNumber, creator filtering, payload helper and expiration declarations. Root ignored .env loading is now Node-only. Public proof output is delayed until transaction and attribute readback verify successfully, including actual expiration block.
Official network docs https://docs.arkiv.network/networks/tiramisu/ link to https://hub.arkiv.network/faucet. Opened the faucet: test GLM claim page, one claim per wallet per cooldown window; interactive wallet controls not fully rendered in browser text. No claim, wallet funding or write tested yet.
Local shell initially rejected pnpm.ps1 under execution policy; pnpm.cmd avoids changing policy. Default Corepack cache also failed with EPERM; setting COREPACK_HOME to .local/corepack uses the builder's existing cache. Read attempt then failed in tsx startup with uv_os_get_passwd ENOMEM before script execution. This session failure does not invalidate the builder's successful read. Do not inspect .env contents to troubleshoot.
Follow-up validation: workspace typecheck and both package builds passed here after the changes. Core signature tests were attempted but hit the same tsx startup ENOMEM. SDK debug output is explicitly disabled in the proof script. Root .env does not exist yet (existence check only); transaction waits for builder's wallet setup.

Date: 2026-10-17. Windows PowerShell; Node 24.20.0, npm 11.19.0, Git 2.55.0.windows.5, Corepack 0.35.0. SDK requested: ~0.8.0; installed SDK version: unavailable.

## Local environment: dependency access blocked
Steps: in the initially empty folder, run `corepack pnpm --version` and `npm.cmd view @arkiv-network/sdk@0.8 version`.
Expected: resolve pnpm and SDK from npm registry.
Actual: Corepack registry request failed with connect EACCES on HTTPS. npm metadata request did not promptly complete. No cached SDK was found by `npm.cmd cache ls @arkiv-network/sdk`. pnpm was absent from PATH.
Impact: cannot install dependencies, inspect installed SDK, generate a lockfile, compile, execute signature tests, or run the connection script in this restricted session. This is an environment issue, not evidence of an SDK defect.
Workaround: run the documented Corepack and install commands in normal PowerShell with network access. Improvement: allow registry access in the coding environment.

Follow-up: install/build/typecheck/test/read-proof commands were attempted, but pinned Corepack first failed with EPERM creating its default cache outside the workspace. Retried installation with COREPACK_HOME under `.local/corepack` to keep cache writes inside the workspace. JSON parsing passed for all seven package/TypeScript manifests. These static checks do not verify TypeScript or SDK behavior.
The workspace-cache retry passed the cache-location obstacle but failed downloading pnpm-10.18.3.tgz with connect EACCES. Dependency access remains the blocker.

## Official rules and documentation access
Steps: open the four canonical GitHub files with the browser tool; also try PowerShell Invoke-WebRequest to raw.githubusercontent.com.
Expected: read canonical requirements before setup.
Actual: browser read succeeded for all four files; PowerShell reported unable to connect. Official Arkiv installation and querying documentation were readable in the browser. Used those examples for createPublicClient/createWalletClient, createEntity, ExpirationTime.fromHours, typed str/u64 attributes, select/where/limit/fetch and createdBy. Installed-package confirmation remains pending; docs alone do not establish compatibility with the resolved 0.8.x package.
References: https://docs.arkiv.network/start-here/installation/ and https://docs.arkiv.network/typescript-sdk/querying-data/.

## Transaction proof: not executed
No wallet was supplied or inspected. No entity, creator address or transaction hash is claimed. Read-only connection also remains unverified. Faucet, indexing latency, expiration behavior and SDK transaction handling are untested. Update this report with the resolved SDK version and real results after installation; retain any public receipt before retrying a failed write.
