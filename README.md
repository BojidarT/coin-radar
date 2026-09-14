# Coin Radar

Private Solana research dashboard with market discovery, X evidence, budget-based conditional allocation, recorded manual positions and entry/exit review alerts. No wallet connection, signing, swaps or custody.

## Runtime and setup

Vinext/React on Cloudflare Workers. Cloudflare D1 is declared as DB in `.openai/hosting.json`. Production migrations must be applied before using the research routes. The Site remains private.

X requires an `X_BEARER_TOKEN` server-side secret set in Sites environment settings and a publication applying that environment revision. Never put credentials in browser storage, source, or chat. Configure an X developer-console spending limit, then set a daily request cap in Advisor. Default cap is zero. No paid requests run automatically.

## API

- `GET /api/market`: latest DEX Screener profiles + promoted Solana tokens; up to 30 addresses, highest-liquidity pool per base token.
- `GET /api/market?q=<symbol-or-address>`: Solana-only search. Confirm exact contracts.
- `GET /api/market?addresses=<addresses>`: watchlist batch, up to 30.
- `GET /api/news`: CoinDesk RSS headlines, five-minute best-effort cache.
- `GET /api/portfolio`: authenticated user config, open recorded positions, latest 100 events.
- `POST /api/portfolio`: authenticated same-origin config/record-position/mark-closed actions. Validates input. Position IDs make retries idempotent. No trade execution.
- `GET /api/advisor?address=<mint>&pair=<pool>`: fresh market screening plus conditional position ceiling. API allocation remains zero while safety is unverified. Frontend can calculate a conditional amount after explicit manual review.
- `POST /api/monitor`: authenticated same-origin position check. Reads exact recorded pools, updates observed peaks, emits durable events per position, rule and observed breach episode, and returns active conditions separately. Per-user lock prevents overlapping checks. Closed positions excluded.
- `GET /api/social[?address=<mint>]`: connection state, cached evidence, daily usage. No paid request.
- `POST /api/social` with `{address}`: authenticated same-origin on-demand exact-contract X recent search; max 25 posts, author IDs and engagement counts, 15-minute D1 cache. No user expansions. Includes sample deduplication; does not claim whole-market social velocity. Per-contract lock and atomic per-user UTC daily request cap. Failed attempts conservatively consume the request allowance. Provider billing can differ from request count; enforce dollar spend at X.

All monetary inputs are USD. Access relies on private Sites sign-in. Do not make public with paid integrations without reviewing access and abuse protection.

## Advisor rules

Heuristic screen: liquidity 0/15/25 points; daily volume 0/20; positive hourly change up to 20; buy-count bias 0/20; pool age 0/15. Candidate needs >=65 and no market flags. Paid boosts/social posts add no points. Weights have no validated predictive performance.

Conditional amount = max(0, min(min(total speculative budget × chosen full-loss percent, budget × allocation cap percent) − all recorded open principal in this token, budget − all recorded open principal − cash reserve)), rounded down to cents. Invalid budget or exposure, failed market screen, unusable price/liquidity, missing or expired evidence, or incomplete manual review produces zero. Frontend account data expires after 60 seconds and is refreshed every 30 seconds; entry evidence expires after 90 seconds using the actual server retrieval time. Exposure is recorded principal, not wallet-synchronized balances. The entire suggested principal can be lost; a loss alert is not a guaranteed stop. Inputs and default percentages are user-controlled examples, not an optimization or personalized financial assessment.

Holder concentration, mint/freeze authorities, sellability and liquidity locks are still not automatically verified. Manual safety acknowledgement is explicitly labelled as user review, not a safety certificate. X posts cannot override safety flags or increase position size.

## Positions and alerts

Positions, risk config, observed peaks, X cache/usage and exit events persist in D1 by authenticated user. Entry watchlist/settings/history remain device-local from version 1. Record only manually completed trades with actual entry price and amount; inferred quantity excludes fees. All open exposure must be recorded for the allocation ceiling to be meaningful. Mark a position closed only after manually closing; update the configured budget for realized P&L. Wallet balances and fills are not synced.

Position rules: profit target, loss threshold, trailing pullback from observed peak, liquidity drop from opening snapshot, unavailable price/liquidity. Thresholds are fixed at position creation; default edits affect future positions. One event per continuous breach episode, persisted across reloads. A rule rearms only after an observed recovery. Missing data does not count as recovery of a price or liquidity rule. State changes and event records use a D1 transaction with a position revision check. Historical events and active conditions are displayed separately. The first scan after this upgrade may repeat a currently active legacy alert once to initialize the new episode state.

Monitoring runs every 15 seconds only while the mounted dashboard is open and monitoring is enabled. Remains mounted when switching dashboard tabs. Provider snapshots may be delayed; the 10-second best-effort server cache is not a freshness guarantee. Cached responses preserve the original server retrieval timestamp. The provider's underlying quote age is unknown; the UI labels recent retrieval separately from market freshness. Position P&L is hidden after 45 seconds since retrieval, and excludes fees and price impact. Background tabs may be throttled. The recording liquidity baseline uses recently retrieved evidence for the exact selected pool, or null if unavailable; it is not historical entry liquidity. Only observed peaks are known. User notification permission and browser support required for desktop alerts; no successful delivery guarantee.

**Always-on scheduler and mobile push are not configured or implemented in this hosting integration. Closing the app stops monitoring. This version must not be relied upon as an emergency exit system.** A hosted background runner and a delivery channel are required before making that claim. No automated buy/sell transactions are in scope.

## Cost preview

The Advisor includes a user-input what-if calculator for principal, assumed exit slippage/price impact, and extra round-trip fees. It shows net P&L and the hypothetical break-even price increase. Empty cost fields do not silently assume free trading. Principal excludes the extra fees. Cash reserve remains in the user budget and is not an automatic SOL/network-fee calculation. All inputs remain USD; there is no automatic EUR conversion. A scenario never raises the allocation ceiling or verifies that a sell route exists.

## Validation

`node scripts/check-trade-controls.mjs` checks capital limits, reserves, cost scenarios, evidence expiry and alert recovery. `node --experimental-strip-types scripts/check-market-cache.mjs` checks cache timestamps and malformed provider data with mocked fetch. `node --experimental-strip-types scripts/check-research.mjs` checks financial caps, entry vetoes, exact alert boundaries, outage behavior and social sample deduplication. Type check and production build through existing scripts. SQL migration/reservation/lock/event deduplication queries were checked against SQLite. X live API calls require credentials and were not exercised. No browser QA performed.

See `UPGRADE_REVIEW.md` for this draft's executed checks and the outstanding build, database, browser and delivery verification. This upgrade has not been deployed.

## Provider documentation

- https://docs.dexscreener.com/api/reference
- https://docs.phantom.com/developer-powertools/token-pages
- https://docs.x.com/x-api/getting-started/pricing
- https://developers.cloudflare.com/workers/configuration/cron-triggers/
