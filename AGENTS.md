# Beacon project instructions

Read the canonical hackathon sources before changing requirements:
- https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/AGENTS.md
- https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/RULES.md
- https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/scoring-rubric.md
- https://github.com/Arkiv-Network/global-tour-stop-pre-devcon/blob/main/docs/submission-checklist.md

Sources reviewed 2026-10-17. Work in this folder. Explain user actions with exact Windows PowerShell commands. Do not claim unrun checks passed.

## Scope and security
Beacon is a tamper-evident public notice board using Arkiv, the Web3 database. Only synthetic notices and fictional publishers. A signature proves wallet control, never organizational identity. Proposed track: Security, pending builder confirmation. Readers harmed by forged notices are the intended users.
Current scope: TypeScript/pnpm core, connection proof, landing page, public board at /app, shareable notice links, browser-wallet publishing, signature verification, local tampering demo and separate signed revocation entities. No backend, CLI package, encryption, co-signing or OpenAI integration. Frontend publishing uses browser-wallet approvals only. Preserve legacy v1 proof signatures; use the fully signed v2 schema for new browser notices. Revocation must independently verify the original publisher signature, exact target key and original notice digest; failed lookup means unknown status, not active. Both notices and revocations have explicit Entity Expiration.
Never request, log, commit, or store secrets or real personal data (including hashes) in Arkiv. A root ignored .env may configure the Node-only wallet script locally; keys must never enter frontend code or VITE_ variables. Do not inspect or print secret file contents or environment values. Report sanitized errors only.

## Arkiv contract
Use @arkiv-network/sdk 0.8.x and viem. Verify APIs against both installed package and official docs. Target Tiramisu chain 7738577 at https://rpc.tiramisu.db-chain.testnet.arkiv.network.
Queryable fields belong in attributes; payload is not queryable. Numeric ranges require numeric attributes. Queries use select/where/limit/fetch, with at most 200 results per page and cursor pagination when needed. No server-side ordering. Trust immutable $creator; $owner can change and controls writes. Project/publisher attributes alone prove nothing.
All Arkiv entities are publicly readable and expire. Set explicit Entity Expiration. Use the term Lifetime Extension for renewal; extendEntity must move expiration later. Do not describe entities as permanent or undeletable. Live sockets require WebSocket transport and no fromBlock.
Keep arkiv/schema.md and arkiv/friction.md accurate. Record real expected/actual behavior, versions and reproduction steps; never invent results.

## Delivery
Run core tests, TypeScript checks and workspace build after installing dependencies. Keep the lockfile once generated. Submission later needs public MIT repo, working public Tiramisu app, exact reproduction query, creator wallets, demo <=3 minutes, a chosen track and all Devfolio answers. Preserve transaction evidence if entities expire. Work period: 9–18 October 2026; deadline 18 October 22:59 UTC. Keep deployment through 23 October. Never rewrite deadline history. This setup alone is not a complete submission.
