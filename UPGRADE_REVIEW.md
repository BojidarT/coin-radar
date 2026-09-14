# Coin Radar upgrade review

Prepared from GitHub main 5f3e9b2836c25cfe6a037d73242540c03a92e745. The project execution environment was unavailable on 2026-09-14. These changes are a draft; no new release has been built or deployed.

## User-facing improvements

- The maximum additional principal accounts for every recorded position in the same token, across pools, and preserves a configurable USD cash reserve.
- Four separate manual acknowledgements cover the exact contract, authorities, holder/liquidity evidence and an exit-route review. They are not automated token verification.
- A cost calculator shows hypothetical net outcomes and the price rise required to cover user-entered slippage/impact and extra fees.
- Entry evidence uses the selected pool. Responses retain actual retrieval times on cache hits, and do not pretend that the underlying provider quote time is known.
- Live status labels expose stale evidence, stale account data, disabled monitoring and overdue checks. Old P&L snapshots are hidden.
- Current position conditions are separate from history. Alerts can trigger again after an observed recovery. Missing data does not count as recovery.
- Zero or missing liquidity is conspicuous even when price data is missing.
- Marking a position closed asks whether the wallet sale is complete; it never executes a sale.
- An X response for a previously selected token cannot populate a new token's social panel.
- Phantom links use the documented URL format, with a full-contract search fallback explanation.

## Executed validation in this session

- 63 assertions for the exact JavaScript control module and its committed test body.
- 30 cache and normalization assertions using the market module with TypeScript annotations removed, mocked fetch and a timeout stub.
- 16 existing advisor regression assertions using the advisor module with TypeScript annotations removed.
- Reviewed the existing D1 schema: the positions table already has a revision column. Alert state is stored inside the existing position JSON. No schema migration is added.
- Checked the DEX Screener response schema and Phantom URL format against official docs; checked D1 batch transaction semantics against Cloudflare docs.

These are JavaScript logic checks in the available in-memory runtime. They are not a TypeScript type check, an npm build, a live-provider test, a database execution test or a browser test.

## Required before merge and deployment

Run in the restored project environment:

```sh
npm run install:ci
node scripts/check-trade-controls.mjs
node --experimental-strip-types scripts/check-market-cache.mjs
node --experimental-strip-types scripts/check-research.mjs
npx tsc --noEmit
npm run build
```

Use the project's configured runtime for build commands. Review any compiler or runtime errors before merging.

Database integration checks on disposable test data:

1. First threshold crossing creates one event and updates the position alert state in one transaction.
2. A continuing crossing produces no duplicate event.
3. A recovered rule crosses again and produces the next episode.
4. Missing price or liquidity does not rearm a rule that cannot be evaluated.
5. A concurrent close or revision change blocks both the stale position update and the event insert.
6. A failure in the event/position batch rolls back the whole batch.
7. Partial pool responses mark unresolved positions and do not show stale P&L.

Browser checks:

- Small USD budgets, reserves, existing same-token positions and invalid numeric inputs.
- Switching token or pool with a request in flight; delayed X and account responses.
- Evidence expiry, account load failure, tab suspension and visibility return.
- Manual review acknowledgement reset after a recorded trade.
- Fee scenarios at loss, break-even and profit; blank/invalid assumptions.
- Both denied and granted desktop-notification permission, actual received notifications, and recurring episodes after reload.
- Mobile layout, keyboard access and the close-position confirmation.

## Remaining limitations

No wallet balance or fill synchronization, no automated contract-authority/holder/lock/sellability verification, no automatic EUR conversion, no always-on runner, and no phone push channel. Quotes are provider snapshots, not executable sell prices. Desktop notification creation does not acknowledge delivery. Missed checks can miss peaks, recoveries and crashes.

Until a runner and an independently tested delivery channel exist, this dashboard is not an emergency exit service. This draft does not place trades or change paid X request limits.

## Official references

- https://docs.dexscreener.com/api/reference
- https://docs.phantom.com/developer-powertools/token-pages
- https://developers.cloudflare.com/d1/worker-api/d1-database/#batch
