/**
 * Robinhood Chain Meme Hunter
 * V154
 *
 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER
 *
 * V117:
 * - Builds directly forward from confirmed V116
 * - Preserves V116 priority-candidate persistence and fresh-request scheduling
 * - Preserves DexScreener 429 cooldown/rate-limit protection
 * - NEW: independent GeckoTerminal market-data fallback for Robinhood Chain
 * - NEW: priority candidates can recover market verification when DexScreener
 *        is in 429 cooldown, fresh-guard, or returns no market
 * - NEW: fallback verifies real USD price, liquidity, FDV/market cap, volume
 *        and transaction counts when GeckoTerminal has valid pool data
 * - NEW: fallback is priority-only and limited to one fresh request per scan
 * - NEW: independent GeckoTerminal 429/cooldown telemetry
 * - SAFETY: fallback is VERIFIED only when the returned pool actually contains
 *        the target token and has positive USD price + positive USD liquidity
 * - Does NOT lower Telegram score, confidence, risk or liquidity thresholds
 * - Preserves V116 discovery, backlog, holder integrity, scoring, state,
 *        notification and Telegram behaviour
 
 *
 * V118:
 * - Preserves full V117 multi-source market fallback
 * - NEW: verified terminal-risk candidates are immediately removed from the
 *        persistent priority-completion lane
 * - NEW: severe risk / HIGH holder concentration / extreme top-holder
 *        ownership cannot monopolize future market-data requests
 * - NEW: explicit on-chain V4 market-activity evidence is attached to
 *        candidates from already verified pool-specific swaps/liquidity
 * - SAFETY: on-chain activity evidence never fabricates USD price/liquidity
 * - DexScreener and GeckoTerminal remain supplemental market-data sources
 * - Telegram thresholds remain unchanged

 *
 * V119:
 * - Preserves the complete V118 capability set
 * - NEW: terminal holder-risk pruning occurs BEFORE a fresh market request
 * - NEW: cached verified HIGH concentration / extreme top-holder candidates
 *        cannot consume the scarce DexScreener/GeckoTerminal priority slot
 * - NEW: if the carried priority candidate is terminal, its completion state
 *        and fresh reservation are cleared before selecting the next target
 * - NEW: fresh-market target selection skips other cached terminal candidates
 * - NEW: pre-market pruning telemetry explains exactly what was removed
 * - FIX: current scanMode/architecture labels now report V119 consistently
 * - Preserves V118 on-chain V4 activity evidence without inventing USD data
 * - Preserves all Telegram thresholds unchanged

 *
 * V120:
 * - Preserves full V119 end-to-end Telegram success path
 * - NEW: separates NEW_TO_SCANNER from NEWLY_LAUNCHED
 * - NEW: pair creation age is authoritative when verified market age exists
 * - NEW: mature backlog discoveries no longer receive new-launch priority
 * - NEW: market-fresh ranking prefers viable candidates still missing market
 * - NEW: low/medium verified concentration improves fresh-market priority
 * - NEW: explicit launch/discovery classification telemetry
 * - Preserves all Telegram thresholds unchanged

 *
 * V121:
 * - Preserves full V120 capability set
 * - FIX: market-unverified viable candidates strongly outrank mature tokens
 *        whose market data is already verified
 * - FIX: mature verified-market tokens cannot monopolize the fresh market slot
 * - NEW: Telegram qualification requires verified holder concentration evidence
 * - NEW: holder-unverified candidates remain tracked instead of being alerted
 * - NEW: diagnostics expose HOLDER_EVIDENCE_UNVERIFIED
 * - Preserves all existing Telegram score/risk/liquidity/confidence thresholds

 *
 * V122:
 * - Preserves full V121 capability set
 * - NEW: known/cached excluded assets are removed before fresh-market targeting
 * - NEW: tokenized securities cannot consume DexScreener/GeckoTerminal priority
 * - NEW: excluded priority completion state is cleared immediately
 * - NEW: excluded market target is reselected to the next viable candidate
 * - NEW: pre-market exclusion telemetry explains any removed target
 * - Preserves V121 Telegram holder gate and all existing thresholds unchanged

 *
 * V123:
 * - Preserves full V122 intended capability set
 * - HOTFIX: pre-market exclusion now uses existing proven exclusion helpers
 * - FIX: reuses tokenizedSecurityReason(name, symbol)
 * - FIX: known quote/infrastructure metadata is excluded pre-market
 * - Preserves V121/V120/V119/V118 functionality and Telegram thresholds

 *
 * V124:
 * - Preserves full V123 capability set
 * - FIX: every fresh-market candidate is screened for cached terminal holder risk
 *        before ranking, not only carried priority candidates
 * - FIX: HIGH concentration / extreme top1 cached candidates cannot enter the
 *        fresh-market priority pool
 * - NEW: verified cached market data is explicitly preferred over unnecessary
 *        repeat external lookups while provider cooldowns are active
 * - NEW: fresh-market telemetry exposes terminal-pruned ranking candidates
 * - Preserves DexScreener cooldown spacing; does not increase external request rate
 * - Preserves all Telegram thresholds unchanged

 *
 * V125:
 * - Preserves full V124 capability set
 * - NEW: same-run holder results can terminal-prune candidates immediately
 * - FIX: current-scan HIGH concentration / extreme top1 candidates cannot
 *        persist as priority-completion retries
 * - NEW: same-run terminal cleanup telemetry
 * - NEW: Telegram alerts distinguish NEW/EARLY/MATURE launch stage
 * - FIX: mature opportunities no longer use misleading early-stage wording
 * - Preserves DexScreener timing/cooldowns and all Telegram thresholds unchanged

 *
 * V126:
 * - Preserves full V125 capability set
 * - NEW: GeckoTerminal trade-feed enrichment for the highest-priority
 *        Telegram-qualifying candidate, max one request per scan
 * - NEW: verifies directional BUY USD / SELL USD / NET USD from individual trades
 * - NEW: aggregates exact returned trade USD into rolling 5m / 1h / 24h windows
 * - NEW: candidate-side correction when the meme token is the quote token
 * - SAFETY: a window is VERIFIED only when the latest-300 trade feed proves
 *           complete coverage of that whole requested window
 * - SAFETY: incomplete 24h coverage stays UNVERIFIED rather than extrapolated
 * - SAFETY: no USD amount is inferred from buy/sell counts or total volume
 * - Preserves existing DexScreener spacing/cooldowns and Telegram thresholds

 *
 * V127:
 * - Preserves full V126 capability set
 * - FIX: same-run terminal target is immediately replaced by next viable candidate
 * - FIX: final fresh-market telemetry reflects the post-analysis viable target
 * - FIX: replacement target is reserved/persisted for the next scan
 * - NEW: GeckoTerminal global 5-minute fresh spacing across fallback + trade feed
 * - NEW: adaptive GeckoTerminal 429 cooldown escalation
 * - NEW: Gecko rate-limit level persists in existing KV state
 * - Preserves one-Gecko-request-per-scan, Dex timing and Telegram thresholds

 *
 * V128:
 * - Preserves full V127 capability set
 * - NEW: verified market pair/pool addresses are treated as holder infrastructure
 * - SAFETY: LP exclusion requires a VERIFIED market and exact pair-address match
 * - FIX: prevents verified liquidity pools from being scored as whale owners
 * - FIX: a cached holder result is refreshed once if its verified pair was
 *        previously classified as an ordinary holder
 * - FIX: adjusted ownership supply and concentration are recalculated correctly
 * - FIX: Gecko historical 429 seeding happens once only; successful requests
 *        can now de-escalate consecutive429s all the way back to zero
 * - Preserves V126 directional USD flow, V127 reselection/spacing/backoff,
 *   Dex timing, KV history, /sendPhoto and all Telegram thresholds

 *
 * V129:
 * - Preserves full V128 capability set
 * - FIX: concentration trend requires a genuinely comparable prior snapshot
 * - FIX: trackedWallets=0 can no longer produce INCREASING/DECREASING trend
 * - FIX: first/basis-mismatched holder measurement cannot masquerade as whale movement
 * - NEW: holder ownership-basis signature tracks infrastructure-address methodology
 * - NEW: old snapshots without a V129 basis signature are safely treated as non-comparable
 * - NEW: concentrationTrendResetReason explains why trend is NOT_VERIFIED
 * - V126 directional USD trade logic is intentionally unchanged
 * - Preserves V128 LP exclusion, V127 API guards/reselection, Dex timing,
 *   exact KV key, /sendPhoto and all Telegram thresholds

 *
 * V130:
 * - Preserves the full V129 capability set
 * - LIVE-PROVEN V129/V126 5m directional USD path is preserved
 * - NEW: persistent Gecko trade ledger for qualifying candidates
 * - NEW: deduplicates overlapping Gecko trade batches by stable trade key
 * - NEW: detects batch continuity before combining multiple requests
 * - NEW: builds verified rolling 1h/24h USD windows only after continuous coverage
 * - NEW: capped compact trade history prevents unbounded KV growth
 * - NEW: a gap or trade-cap loss resets coverage instead of extrapolating
 * - FIX: concentration increase no longer earns a whale-flow bonus unless
 *   tracked wallet balance movement supports accumulation
 * - Does NOT increase Gecko/Dex request frequency or loosen Telegram thresholds
 * - Preserves V129 concentration-basis guards, V128 LP exclusion,
 *   V127 API guards/reselection, exact KV key, /sendPhoto and all safety gates

 *
 * V131:
 * - Preserves the full V130 rolling directional USD ledger unchanged
 * - NEW: persists ownershipSupply/infrastructureBalanceSum in holder snapshots
 * - NEW: detects material circulating-ownership denominator changes
 * - NEW: concentration trend is NOT_VERIFIED when a material denominator move
 *   could explain the percentage change and tracked wallets do not confirm it
 * - NEW: exposes ownershipSupplyChangePercent and denominator reset reason
 * - Prevents liquidity/PoolManager supply movement from looking like whale
 *   accumulation or distribution
 * - Does NOT increase Gecko/Dex request frequency
 * - Does NOT loosen Telegram thresholds or any existing safety gates

 *
 * V132:
 * - Preserves the full V131 ownership-denominator guard
 * - Preserves the full V130 rolling directional USD ledger
 * - NEW: candidate-analysis reserve protects high-priority token analysis
 *   from low-yield unknown-pool resolver spending
 * - Unknown-pool hard ceiling remains 7 requests
 * - When the watchlist/priority pipeline is active, resolver dynamically
 *   limits itself to 4 requests, reserving 3 additional requests for analysis
 * - If the candidate pipeline is effectively empty, resolver can still use
 *   the existing full 7-request ceiling
 * - Adds resolver telemetry for dynamic request limit / protected requests
 * - Does NOT increase any API request rate
 * - Does NOT loosen Telegram thresholds or safety gates

 *
 * V133:
 * - Preserves V132 dynamic unknown-pool analysis reserve
 * - Preserves V131 ownership-denominator guard
 * - Preserves V130 rolling directional USD ledger
 * - NEW: the selected fresh-market / completion target is analysed FIRST
 * - NEW: if that top target cannot be completed because analysis budget is
 *   insufficient, lower-priority candidates are deferred for that run rather
 *   than consuming the remaining budget
 * - NEW: explicit top-candidate analysis-order / budget-protection telemetry
 * - Does NOT increase the 42-request hard budget
 * - Does NOT increase provider/API request frequency
 * - Does NOT loosen Telegram thresholds or safety gates

 *
 * V134:
 * - Preserves V133 top-candidate-first completion
 * - Preserves V132 dynamic unknown-pool analysis reserve
 * - Preserves V131 ownership-denominator guard
 * - Preserves V130 rolling directional USD ledger
 * - NEW: same-run Blockscout holder-outage circuit breaker
 * - The priority/top candidate always gets the first real holder attempt
 * - If both V2 and legacy holder sources fail for that candidate, lower-
 *   priority candidates stop hammering the same unavailable holder service
 * - Lower-priority candidates reuse fresh/stale verified holder cache when
 *   available; otherwise holder evidence remains explicitly UNVERIFIED
 * - No stale/unverified holder evidence can create a Telegram qualification
 * - Adds Blockscout holder-outage telemetry
 * - Does NOT increase provider/API request frequency
 * - Does NOT loosen Telegram thresholds or safety gates

 *
 * V135:
 * - Preserves V134 Blockscout outage resilience
 * - Preserves V133 top-candidate-first completion
 * - Preserves V132 dynamic unknown-pool analysis reserve
 * - Preserves V131 ownership-denominator guard
 * - Preserves V130 rolling directional USD ledger
 * - NEW: carried priority candidates that become terminal in the same run
 *   immediately yield priority to the next viable fresh-market target
 * - NEW: replacement target is inserted into the same-run analysis queue
 * - FIXED BUILD: mutable market target + valid ranked replacement source
 * - No increase to the 42-request cap, API frequency, or Telegram thresholds

 *
 * V136:
 * - Preserves V135 terminal-priority handoff and all earlier protections
 * - NEW: LOW concentration only earns a healthy-holder bonus when there is
 *   meaningful holder breadth behind it
 * - Minimum 10 holders + 3 positive non-infrastructure holder rows
 * - Thin-holder tokens remain LOW if mathematically valid, but cannot gain
 *   false healthy-concentration opportunity or signal-confirmation bonuses
 * - Telegram thresholds, API rates and request caps unchanged

 *
 * V137:
 * - Preserves V136 organic-holder breadth protection
 * - Preserves V135 terminal-priority handoff architecture
 * - FIX: same-run terminal handoff no longer depends on persisted
 *   state.priorityCandidateCompletion.address during analysis
 * - FIX: handoff uses the actual local isPriorityCompletion flag for the
 *   candidate currently being analysed
 * - FIX: terminal priority candidate can immediately yield to the next viable
 *   ranked target in the same run before lower-priority budget is consumed
 * - Telegram thresholds, API rates and request caps unchanged

 *
 * V138:
 * - Preserves V137 local priority handoff
 * - Preserves V136 organic-holder breadth protection
 * - NEW: unresolved priority candidates persist across transient provider
 *   failures/guards instead of being marked complete too early
 * - Controlled retry policy: maximum 12 attempts or 6 hours
 * - Retry persistence covers unverified market, holder evidence, or risk
 * - Terminal, excluded, invalid, fully resolved, expired, or retry-exhausted
 *   candidates still leave the priority lane
 * - Retry counters are address-scoped so a new target cannot inherit another
 *   token's retry history
 * - Telegram thresholds, API rates and request caps unchanged

 *
 * V139:
 * - Preserves V138 transient retry persistence
 * - Preserves V137 local terminal-priority handoff
 * - Preserves V136 organic-holder breadth protection
 * - NEW: retry fairness prevents an unresolved carried token monopolising the
 *   fresh market slot when a clearly stronger new/live candidate appears
 * - A challenger must lead the carried candidate by at least 20 priority
 *   points and have new/live/recent-live evidence
 * - The carried retry candidate remains persisted and is still analysed
 * - The challenger temporarily receives first analysis + fresh-market priority
 * - Retry state cannot be accidentally overwritten by the temporary challenger
 * - Telegram thresholds, API rates and request caps unchanged

 *
 * V140:
 * - Preserves V139 retry fairness
 * - Preserves V138 transient retry persistence
 * - Preserves V137 local terminal-priority handoff
 * - Preserves V136 organic-holder breadth protection
 * - NEW: relevance expiry only removes a token from the PRIORITY RETRY lane;
 *   it does not delete it from the watchlist
 * - Relevance expiry requires VERIFIED market age >= 7 days plus extremely
 *   weak verified 24h activity (<= $10 volume, <= 2 transactions), no current
 *   on-chain V4 activity, and no new/live classification
 * - Provider outage alone can never trigger relevance expiry
 * - A mature token that becomes active again can still be ranked normally
 * - Conservative 7-day / near-zero-activity policy protects the bot's stated
 *   early-discovery mission without treating ordinary 24h maturity as stale
 * - Telegram thresholds, API request frequency and hard budgets unchanged

 *
 * V141:
 * - Preserves V140 retry relevance expiry
 * - Preserves V139 retry fairness
 * - Preserves V138 transient retry persistence
 * - Preserves V137 local terminal-priority handoff
 * - Preserves V136 organic-holder breadth protection
 * - NEW: immediate same-run fresh-target handoff when validation rejects the
 *   selected target as a tokenized security, infrastructure token or invalid ERC-20
 * - Replacement comes from the existing ranked viable set and is moved to the
 *   next analysis position so it inherits the remaining fresh-market opportunity
 * - Existing carried retry state remains separate from the temporary fresh target
 * - Telegram thresholds, external API frequency and hard request caps unchanged

 *
 * V142:
 * - Preserves V141 excluded-target same-run handoff
 * - Preserves V140 retry relevance expiry
 * - Preserves V139 retry fairness
 * - Preserves V138 transient retry persistence
 * - Preserves V137 local terminal-priority handoff
 * - Preserves V136 organic-holder breadth protection
 * - NEW: verified cached terminal candidates are pruned before expensive analysis
 * - A carried retry candidate already proven HIGH/extreme concentration is cleared
 *   before analysis and cannot be re-persisted as ANALYSIS_NOT_COMPLETED
 * - Only existing verified terminalPriorityRejectFromWatched evidence is used
 * - Unverified holder states are never pre-pruned
 * - Watchlist entries remain available for future reactivation/history
 * - Telegram thresholds, provider frequencies and hard request caps unchanged

 *
 * V143:
 * - Preserves V142 pre-analysis verified terminal pruning
 * - Preserves V141 excluded-target same-run handoff
 * - Preserves V140 retry relevance expiry and V139 fairness
 * - NEW: optional Blockscout PRO holder-row fallback after BOTH public
 *   Blockscout holder routes fail
 * - PRO route is only attempted when env.BLOCKSCOUT_PRO_API_KEY exists
 * - Uses official multichain PRO REST shape:
 *   https://api.blockscout.com/4663/api/v2/tokens/{token}/holders?apikey=...
 * - PRO failure/unsupported-chain response never fabricates holder evidence
 * - V134 same-run holder-outage circuit opens only after public V2, legacy,
 *   AND configured PRO fallback fail
 * - Existing public routes remain first; no extra request when they succeed
 * - Telegram holder safety gate and all alert thresholds remain unchanged

 *
 * V144:
 * - Preserves V143 Blockscout PRO holder fallback
 * - Preserves V142 pre-analysis terminal pruning and V141 excluded-target handoff
 * - NEW: successful holder intelligence exposes its exact provider
 * - NEW: PRO configured/attempted/success/status retained per candidate
 * - NEW: response-level holder-provider audit telemetry
 * - NEW: Telegram distinguishes holder count from holder concentration
 * - NEW: Telegram shows holder-data source when concentration is verified
 * - No alert thresholds, safety gates, request frequency or provider priority changed

 *
 * V145:
 * - Preserves V144 holder-provider telemetry and Telegram wording
 * - Preserves V143 Blockscout PRO holder fallback
 * - NEW: persistent 10-minute PRO cooldown after HTTP 502/503/504
 * - NEW: cooldown uses the existing KV state key and survives scheduled runs
 * - NEW: no PRO analysis request is spent while cooldown is active
 * - NEW: successful PRO response clears transient outage cooldown
 * - NEW: response telemetry exposes PRO cooldown/failure/recovery state
 * - Public Blockscout remains primary; verified holder cache remains available
 * - Alert thresholds, scoring and holder safety gates are unchanged

 *
 * V146:
 * - Preserves V145 persistent 502/503/504 PRO outage protection
 * - Preserves V144 exact holder-provider telemetry
 * - NEW: HTTP 404 is classified separately from provider outage
 * - NEW: 404 does NOT claim the token is unindexed; it is treated as
 *   holder data currently unavailable from the PRO route
 * - NEW: address-scoped 5-minute retry delay prevents repeated PRO 404 calls
 * - NEW: public Blockscout routes remain first and are still checked normally
 * - NEW: verified stale holder cache remains usable during a 404 retry delay
 * - NEW: later successful PRO response automatically clears the token 404 delay
 * - NEW: response telemetry exposes 404 retry state without changing safety gates
 * - Telegram thresholds, scoring, request cap and holder evidence rules unchanged

 *
 * V147:
 * - Preserves V146 Blockscout PRO 404 retry handling
 * - Preserves V145 Blockscout PRO outage protection
 * - NEW: adaptive DexScreener 429 backoff capped at 30 minutes
 * - NEW: Dex 429 backoff state persists in the existing KV state
 * - NEW: successful Dex market response de-escalates the 429 level
 * - NEW: Dex/Gecko availability is coordinated before fallback
 * - NEW: Gecko fallback telemetry distinguishes checked from HTTP-requested
 * - NEW: exact earliest market retry is exposed when both providers unavailable
 * - Existing verified fresh/stale market cache remains preferred
 * - No request-frequency increase, threshold change or safety-gate change

 *
 * V148:
 * - Preserves V147 Dex/Gecko 429 coordination unchanged
 * - Preserves V146/V145 Blockscout PRO retry/outage protection
 * - NEW: re-checks verified cached terminal holder evidence immediately before
 *   every queued analysis, not only once when the queue is first constructed
 * - NEW: terminal candidates that become known while a scan is running are
 *   removed before they can consume another full analysis allocation
 * - NEW: terminal fresh-target pruning transfers priority to the next viable
 *   ranked candidate in the same run
 * - NEW: telemetry shows dynamically pruned candidates and estimated requests saved
 * - FIX: marketProviderCoordinationV147.address now receives an address string,
 *   never the marketFreshTarget object
 * - Watchlist records are retained; no terminal evidence is fabricated
 * - Alert thresholds, scoring, request limits and safety gates unchanged

 *
 * V149:
 * - Preserves V148 dynamic terminal queue pruning
 * - Preserves V147 market-provider 429 coordination
 * - NEW: short address-scoped cache for verified holder responses that contain
 *   infrastructure balances but no usable positive ownership balances
 * - NEW: cached partial holder state remains UNVERIFIED and can never qualify
 *   as healthy concentration or bypass the Telegram holder-evidence gate
 * - NEW: 5-minute retry interval lets newly launched ownership distribution
 *   develop without repeating the same full Blockscout holder work every scan
 * - NEW: verified holder counters are retained in the partial cache
 * - NEW: partial cache is invalidated when the verified pair basis changes
 * - FIX: holderSource/provider fallback metadata is retained on partial and
 *   integrity-failure holder results instead of becoming null
 * - Alert thresholds, request ceilings, scoring and safety gates unchanged

 *
 * V150:
 * - Preserves V149 partial holder retry cache
 * - Preserves V148 dynamic terminal queue pruning
 * - Freezes verified terminal addresses before analysis begins
 * - Initial analysis queue excludes the frozen terminal set
 * - Same-run replacement paths cannot reinsert frozen terminal addresses
 * - marketFreshPriority terminalPruned now reports only pre-analysis evidence
 * - postAnalysisTerminalDiscoveriesV150 separates risks learned during analysis
 * - Watchlist retention and all safety/Telegram thresholds unchanged

 *
 * V151:
 * - Preserves V150 terminal snapshot queue guard
 * - Allows the best viable VERIFIED-market candidate to receive the single
 *   protected Gecko directional-trade opportunity before Telegram qualification
 * - Already-qualified candidate remains preferred when one exists
 * - Never requests directional trades without verified market/pool/token side
 * - Preserves Gecko cooldown, 5m spacing and one-fresh-request-per-scan limits
 * - Excludes same-run terminal/high-risk-pruned candidates
 * - Recomputes momentum/opportunity/signals/confidence after verified USD flow
 * - Momentum prefers VERIFIED directional USD buy pressure when available
 * - Transaction-count pressure remains separate and never becomes fake USD
 * - Telegram thresholds unchanged

 *
 * V152:
 * - Preserves V151 pre-qualification directional USD enrichment
 * - NEW: persistent live-only Uniswap V4 activity momentum
 * - NEW: snapshots store live-window swap/liquidity counts separately from
 *   combined backlog activity, preventing old backlog events from faking momentum
 * - NEW: scores verified live V4 swap acceleration and liquidity-event acceleration
 * - NEW: sustained live swap intensity can contribute a small momentum signal
 *   even when external market APIs are unavailable
 * - NEW: on-chain activity can verify the momentum evidence layer without
 *   inventing USD price, liquidity, volume or buy/sell direction
 * - Existing holder/market/directional momentum inputs remain intact
 * - No extra external requests and all Telegram thresholds remain unchanged

 *
 * V153:
 * - Preserves V152 live-only on-chain momentum
 * - Derives Gecko-compatible V4 pool identity from decoded Initialize mappings
 * - Uses the Uniswap V4 32-byte poolId directly for Gecko pool trade queries
 * - Only accepts candidate + known quote/native ZERO quote pools
 * - Allows protected Gecko directional USD enrichment without Dex market
 *   verification when the on-chain pool identity is verified
 * - Gecko trade rows still provide the actual USD amounts
 * - Does not promote price/liquidity/marketCap/FDV or market.verified
 * - Keeps Gecko cooldown, 5m spacing and one-fresh-request-per-scan
 * - Adds no external requests and changes no Telegram thresholds

 *
 * V154 HOTFIX:
 * - Preserves all V153 functionality
 * - Fixes the V153 Gecko pool-identity scope ReferenceError
 * - Keeps the pool identity source variable inside directional enrichment
 * - No request-rate, scoring, market-verification or Telegram changes
*/
const VERSION = "V154";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const DEXSCREENER_BASE =
  "https://api.dexscreener.com";

/* V117 independent market-data fallback. */
const GECKOTERMINAL_BASE =
  "https://api.geckoterminal.com/api/v2";

const GECKOTERMINAL_NETWORK =
  "robinhood";

const GECKOTERMINAL_429_COOLDOWN_MS =
  2 * 60 * 1000;

const GECKOTERMINAL_MIN_FRESH_INTERVAL_MS =
  5 * 60 * 1000;

const GECKOTERMINAL_MAX_429_COOLDOWN_MS =
  30 * 60 * 1000;

const GECKOTERMINAL_MAX_FRESH_PER_SCAN =
  1;

/*
 * V130 rolling verified directional-trade history.
 * Compact per-trade arrays are capped to protect the shared KV state.
 * If the cap prevents full coverage of a requested window, that window
 * remains UNVERIFIED rather than being extrapolated.
 */
const DIRECTIONAL_LEDGER_WINDOW_MS =
  24 * 60 * 60 * 1000;

const DIRECTIONAL_LEDGER_MAX_TRADES =
  12000;

const DIRECTIONAL_LEDGER_MAX_POOLS =
  2;

/*
 * V131: if the circulating ownership denominator moves by this much between
 * comparable snapshots, concentration percentage direction must also be
 * supported by actual tracked-wallet balance movement.
 */
const MATERIAL_OWNERSHIP_SUPPLY_CHANGE_PERCENT =
  10;

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com";

const BLOCKSCOUT_PRO =
  "https://api.blockscout.com";

const BLOCKSCOUT_PRO_CHAIN_ID =
  4663;

const BLOCKSCOUT_PRO_OUTAGE_COOLDOWN_MS_V145 =
  10 * 60 * 1000;

const BLOCKSCOUT_PRO_404_RETRY_MS_V146 =
  5 * 60 * 1000;

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const DEAD =
  "0x000000000000000000000000000000000000dead";

/*
 * IMPORTANT:
 * DO NOT CHANGE.
 *
 * Preserves V69 -> V88 history.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

/* =========================================================
   KNOWN INFRASTRUCTURE / QUOTES
   ========================================================= */

const KNOWN_QUOTES = new Set([
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73"
]);

const KNOWN_QUOTE_SYMBOLS = new Set([
  "WETH",
  "ETH",
  "USDC",
  "USDT",
  "DAI",
  "USD"
]);

/* =========================================================
   UNISWAP V4 TOPICS
   ========================================================= */

const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/* =========================================================
   LIVE SCANNING
   ========================================================= */

const LIVE_SCAN_BLOCKS = 20;

const LIVE_SAFE_CHUNK_DEFAULT = 10;
const LIVE_SAFE_CHUNK_MIN = 5;
const LIVE_SAFE_CHUNK_MAX = 20;

/* =========================================================
   V88 BACKLOG LEARNING
   ========================================================= */

/*
 * V87 test proved:
 *
 * Alchemy:
 * 31 -> HTTP 400
 * 15 -> HTTP 400
 * 10 -> SUCCESS
 * 20 -> HTTP 400
 *
 * Therefore V88 stores the LAST PROVEN SUCCESSFUL RANGE,
 * not the proposed next range.
 */

const BACKLOG_MIN_CHUNK_BLOCKS = 10;

const PUBLIC_BACKLOG_DEFAULT = 31;

const ALCHEMY_BACKLOG_DEFAULT = 10;

const BACKLOG_MAX_CHUNK_BLOCKS = 250;

const BACKLOG_LIVE_GUARD_BLOCKS =
  LIVE_SCAN_BLOCKS;

/*
 * No automatic growth during every successful request.
 *
 * This prevents:
 * 10 success -> save 20 -> 20 failure -> 10 success -> repeat.
 */
const BACKLOG_SUCCESS_PROBE_THRESHOLD = 12;

const BACKLOG_PROBE_INCREMENT = 5;

/* =========================================================
   DISCOVERY RPC COOLDOWN
   ========================================================= */

const DISCOVERY_RPC_429_COOLDOWN_MS =
  60 * 1000;

/* =========================================================
   HARD REQUEST BUDGET
   ========================================================= */

const MAX_EXTERNAL_REQUESTS = 42;

const SYSTEM_REQUEST_LIMIT = 2;

const DISCOVERY_REQUEST_LIMIT = 24;
const LIVE_DISCOVERY_REQUEST_LIMIT = 12;
const BACKLOG_DISCOVERY_REQUEST_LIMIT = 12;

const ANALYSIS_REQUEST_LIMIT = 21;

const NOTIFICATION_REQUEST_LIMIT = 2;

/* V90: protect downstream intelligence even while accelerating backlog catch-up. */
const BACKLOG_GLOBAL_RESERVE = 20;

/*
 * V108: live discovery/unknown-pool resolution must leave enough global
 * headroom for at least one meaningful fresh analysis plus notification.
 */
const LIVE_GLOBAL_RESERVE = 10;

const FRESH_ANALYSIS_COST_ALCHEMY = 8;
const FRESH_ANALYSIS_COST_FALLBACK = 11;
const CACHED_ANALYSIS_COST = 3;


/* =========================================================
   V118 ON-CHAIN V4 MARKET ACTIVITY EVIDENCE
   ========================================================= */

function onChainV4MarketEvidence(
  watched,
  activity
) {
  const swaps =
    safeNumber(
      activity?.swaps
    );

  const liquidityEvents =
    safeNumber(
      activity?.liquidityEvents
    );

  const poolSpecific =
    activity?.poolSpecific ===
      true;

  const poolId =
    normalize(
      watched?.poolId ||
      watched?.primaryPoolId ||
      watched?.lastPoolId
    ) ||
    null;

  const marketExists =
    poolSpecific &&
    (
      swaps >
        0 ||
      liquidityEvents >
        0
    );

  return {
    verified:
      marketExists,

    status:
      marketExists
        ? "ONCHAIN_V4_MARKET_ACTIVITY_VERIFIED"
        : "ONCHAIN_V4_MARKET_ACTIVITY_UNVERIFIED",

    source:
      "ONCHAIN_V4",

    poolSpecific,

    poolId,

    swaps,

    liquidityEvents,

    /*
     * Important safety distinction:
     * raw V4 activity proves an active market/pool, but does NOT by itself
     * prove a USD price or USD liquidity amount.
     */
    usdPriceVerified:
      false,

    usdLiquidityVerified:
      false
  };
}

/* =========================================================
   TOKEN ANALYSIS
   ========================================================= */

const MAX_TOKEN_CHECKS = 4;

const METADATA_REUSE_MS =
  30 * 60 * 1000;

/* =========================================================
   DEXSCREENER
   ========================================================= */

const MARKET_CACHE_MS =
  9 * 60 * 1000;

/*
 * V96: negative DexScreener results must expire much sooner than
 * verified market data. Newly-created Robinhood Chain pools can be
 * indexed shortly after our first lookup; caching NO_MARKET_FOUND for
 * the full verified-data TTL can hide the exact early launch we want.
 */
const MARKET_NEGATIVE_CACHE_MS =
  90 * 1000;

const MARKET_STALE_CACHE_MS =
  30 * 60 * 1000;

const DEXSCREENER_429_COOLDOWN_MS =
  10 * 60 * 1000;

const DEXSCREENER_MAX_429_COOLDOWN_MS_V147 =
  30 * 60 * 1000;

const DEXSCREENER_429_CHAIN_WINDOW_MS_V147 =
  30 * 60 * 1000;

/* V116: align the fresh-market guard with the existing ~5-minute
 * scheduled scanner cadence. HTTP-429 protection remains 10 minutes. */
const DEXSCREENER_MIN_FRESH_INTERVAL_MS =
  5 * 60 * 1000;

const DEXSCREENER_MAX_FRESH_PER_SCAN = 1;

/* V116 priority fresh-market reservation. */
const PRIORITY_FRESH_RESERVATION_MAX_AGE_MS =
  24 * 60 * 60 * 1000;

/* V98: one short initialize-only lookback catches pools created just before the live window. */
const LIVE_INITIALIZE_LOOKBACK_BLOCKS = 10;

/* V100 persistent unknown-pool resolver */
const UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS = 10;
const UNKNOWN_POOL_SEARCH_MAX_CHUNK_BLOCKS = 40;

/*
 * V110 exact-pool Initialize capability learning.
 *
 * Start from the provider's already-proven generic safe range, not an
 * optimistic 100/500 block jump. After repeated exact-query successes,
 * test one larger range. At most one growth probe per provider per run.
 */
const UNKNOWN_POOL_EXACT_GROW_SUCCESS_STREAK = 3;
const UNKNOWN_POOL_EXACT_MAX_BLOCKS = 1000;
const UNKNOWN_POOL_EXACT_PROBE_COOLDOWN_MS =
  5 * 60 * 1000;

/*
 * V112 stalled-pool protection.
 * A pool that has already consumed many contiguous empty searches should
 * not take one or more resolver slots every scheduled run forever.
 */
const UNKNOWN_POOL_STALLED_ATTEMPTS = 12;
const UNKNOWN_POOL_SEVERE_STALLED_ATTEMPTS = 24;
const UNKNOWN_POOL_STALLED_RETRY_MS = 10 * 60 * 1000;
const UNKNOWN_POOL_SEVERE_STALLED_RETRY_MS = 30 * 60 * 1000;

/*
 * V113 provider-specific failed growth-probe suppression.
 */
const UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_PUBLIC_MS =
  10 * 60 * 1000;
const UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_ALCHEMY_MS =
  30 * 60 * 1000;

/*
 * When Public RPC is unavailable, Alchemy's proven exact range is only
 * 10 blocks. Do not grind old pools indefinitely at that width.
 */
const UNKNOWN_POOL_ALCHEMY_DEEP_SEARCH_DISTANCE_BLOCKS = 60;
const UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN = 7;

/*
 * V132: unknown-pool resolution is useful, but it is downstream of the
 * bot's primary purpose: completing analysis on promising tokens.
 *
 * Keep the proven hard ceiling at 7, but protect three requests whenever
 * the candidate pipeline is active. This turns the effective resolver cap
 * into 4 in normal operation without increasing any request frequency.
 */
const UNKNOWN_POOL_ANALYSIS_PROTECTED_REQUESTS = 3;
const UNKNOWN_POOL_ACTIVE_PIPELINE_REQUEST_LIMIT =
  Math.max(
    1,
    UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN -
      UNKNOWN_POOL_ANALYSIS_PROTECTED_REQUESTS
  );
const UNKNOWN_POOL_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_UNKNOWN_POOL_TRACKER = 500;

/*
 * V101: when at least this many unresolved pools are active in the
 * current live window, targeted exact-pool history is more valuable
 * than another generic 10-block Initialize-only lookback.
 */
const UNKNOWN_POOL_TARGETED_PRIORITY_THRESHOLD = 3;

/* =========================================================
   WATCHLIST
   ========================================================= */

const WATCH_MAX_AGE =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

/* V91: retain pool->token mappings beyond the 50-token watchlist. */
const POOL_REGISTRY_MAX_AGE =
  48 * 60 * 60 * 1000;

const MAX_POOL_REGISTRY = 2500;

/* V91: holder intelligence reuse / outage protection. */
const HOLDER_CACHE_MS =
  20 * 60 * 1000;

const HOLDER_STALE_CACHE_MS =
  2 * 60 * 60 * 1000;

const HOLDER_PARTIAL_RETRY_MS_V149 =
  5 * 60 * 1000;

/* =========================================================
   TELEGRAM
   ========================================================= */

const ALERT_COOLDOWN =
  6 * 60 * 60 * 1000;

const MIN_ALERT_SCORE = 60;

const MAX_ALERT_RISK = 59;

const MIN_ALERT_LIQUIDITY = 1000;

const MIN_CONFIDENCE_ALERT = 55;

/* =========================================================
   SNAPSHOTS
   ========================================================= */

const MAX_SNAPSHOTS_PER_TOKEN = 24;

const SNAPSHOT_MAX_AGE =
  24 * 60 * 60 * 1000;

const MIN_SNAPSHOT_INTERVAL =
  2 * 60 * 1000;

const MOMENTUM_MIN_HISTORY_MS =
  5 * 60 * 1000;

const MOMENTUM_IDEAL_HISTORY_MS =
  15 * 60 * 1000;

/* =========================================================
   HELPERS
   ========================================================= */

function now() {
  return new Date().toISOString();
}

function safeNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function clamp(
  value,
  min,
  max
) {
  return Math.max(
    min,
    Math.min(
      max,
      value
    )
  );
}

function normalize(value) {
  return String(
    value || ""
  ).toLowerCase();
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(
      value || ""
    )
  );
}

function errorString(error) {
  return String(
    error?.message ||
    error ||
    "UNKNOWN_ERROR"
  );
}

function is429(error) {
  return String(
    error || ""
  ).includes(
    "HTTP_429"
  );
}

function is400(error) {
  return String(
    error || ""
  ).includes(
    "HTTP_400"
  );
}

function topicAddress(topic) {
  const value =
    String(
      topic || ""
    );

  if (
    !/^0x[a-fA-F0-9]{64}$/.test(
      value
    )
  ) {
    return null;
  }

  return (
    "0x" +
    value.slice(-40)
  ).toLowerCase();
}

function knownQuote(address) {
  return KNOWN_QUOTES.has(
    normalize(
      address
    )
  );
}

function knownQuoteMetadata(
  address,
  symbol
) {
  if (
    knownQuote(
      address
    )
  ) {
    return true;
  }

  return KNOWN_QUOTE_SYMBOLS.has(
    String(
      symbol || ""
    ).toUpperCase()
  );
}

function percentChange(
  previous,
  current
) {
  const a =
    safeNumber(
      previous
    );

  const b =
    safeNumber(
      current
    );

  if (
    a <= 0
  ) {
    return null;
  }

  return (
    (
      b - a
    ) /
    a
  ) * 100;
}

function uniqueBy(
  array,
  keyFunction
) {
  const map =
    new Map();

  for (
    const item
    of array
  ) {
    const key =
      keyFunction(
        item
      );

    if (!key) {
      continue;
    }

    map.set(
      key,
      item
    );
  }

  return Array.from(
    map.values()
  );
}

function jsonResponse(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",

        "access-control-allow-origin":
          "*"
      }
    }
  );
}

function yesNo(value) {
  return value
    ? "YES"
    : "NO";
}

/* =========================================================
   TOKENIZED SECURITY FILTER
   ========================================================= */

function tokenizedSecurityReason(
  name,
  symbol
) {
  const n =
    String(
      name || ""
    ).trim();

  const upper =
    n.toUpperCase();

  if (
    upper.includes(
      "• ROBINHOOD TOKEN"
    )
  ) {
    return "ROBINHOOD_TOKENIZED_SECURITY";
  }

  if (
    upper.includes(
      "ROBINHOOD TOKEN"
    ) &&
    (
      upper.includes(
        "COMMON STOCK"
      ) ||
      upper.includes(
        "CLASS A"
      ) ||
      upper.includes(
        "CLASS B"
      ) ||
      upper.includes(
        "CLASS C"
      ) ||
      upper.includes(
        "ETF"
      )
    )
  ) {
    return "ROBINHOOD_TOKENIZED_SECURITY";
  }

  if (
    /CLASS\s+[A-Z]\s+COMMON\s+STOCK/i.test(
      n
    )
  ) {
    return "TOKENIZED_COMMON_STOCK";
  }

  if (
    upper.includes(
      "ONDO TOKENIZED"
    ) ||
    /\(\s*ONDO\s+TOKENIZED\s*\)/i.test(
      n
    )
  ) {
    return "ONDO_TOKENIZED_SECURITY";
  }

  if (
    upper.includes(
      "TOKENIZED"
    ) &&
    (
      upper.includes(
        "MARKETS"
      ) ||
      upper.includes(
        "STOCK"
      ) ||
      upper.includes(
        "SHARES"
      ) ||
      upper.includes(
        "EQUITY"
      ) ||
      upper.includes(
        "ETF"
      ) ||
      upper.includes(
        "SECURITY"
      )
    )
  ) {
    return "TOKENIZED_SECURITY";
  }

  return null;
}

/* =========================================================
   REQUEST BUDGET
   ========================================================= */

function createBudget() {
  return {
    totalUsed:
      0,

    totalLimit:
      MAX_EXTERNAL_REQUESTS,

    system: {
      used:
        0,

      limit:
        SYSTEM_REQUEST_LIMIT
    },

    discovery: {
      used:
        0,

      limit:
        DISCOVERY_REQUEST_LIMIT,

      liveUsed:
        0,

      liveLimit:
        LIVE_DISCOVERY_REQUEST_LIMIT,

      backlogUsed:
        0,

      backlogLimit:
        BACKLOG_DISCOVERY_REQUEST_LIMIT
    },

    analysis: {
      used:
        0,

      limit:
        ANALYSIS_REQUEST_LIMIT
    },

    notification: {
      used:
        0,

      limit:
        NOTIFICATION_REQUEST_LIMIT
    },

    skipped:
      []
  };
}

function budgetAvailable(
  budget,
  phase,
  amount = 1
) {
  if (
    budget.totalUsed +
      amount >
    budget.totalLimit
  ) {
    return false;
  }

  if (
    phase ===
    "system"
  ) {
    return (
      budget.system.used +
        amount <=
      budget.system.limit
    );
  }

  if (
    phase ===
    "analysis"
  ) {
    return (
      budget.analysis.used +
        amount <=
      budget.analysis.limit
    );
  }

  if (
    phase ===
    "notification"
  ) {
    return (
      budget.notification.used +
        amount <=
      budget.notification.limit
    );
  }

  if (
    phase ===
    "discovery-live"
  ) {
    const leavesDownstreamReserve =
      budget.totalUsed +
        amount <=
      budget.totalLimit -
        LIVE_GLOBAL_RESERVE;

    return (
      leavesDownstreamReserve &&
      budget.discovery.used +
          amount <=
        budget.discovery.limit &&
      budget.discovery.liveUsed +
          amount <=
        budget.discovery.liveLimit
    );
  }

  if (
    phase ===
    "discovery-backlog"
  ) {
    const leavesProtectedReserve =
      budget.totalUsed +
        amount <=
      budget.totalLimit -
        BACKLOG_GLOBAL_RESERVE;

    return (
      leavesProtectedReserve &&
      budget.discovery.used +
          amount <=
        budget.discovery.limit &&
      budget.discovery.backlogUsed +
          amount <=
        budget.discovery.backlogLimit
    );
  }

  return false;
}

function consumeBudget(
  budget,
  phase,
  type,
  amount = 1
) {
  if (
    !budgetAvailable(
      budget,
      phase,
      amount
    )
  ) {
    budget.skipped.push({
      phase,
      type,
      amount,

      reason:
        "PHASE_BUDGET_EXHAUSTED"
    });

    return false;
  }

  budget.totalUsed +=
    amount;

  if (
    phase ===
    "system"
  ) {
    budget.system.used +=
      amount;
  }

  else if (
    phase ===
    "analysis"
  ) {
    budget.analysis.used +=
      amount;
  }

  else if (
    phase ===
    "notification"
  ) {
    budget.notification.used +=
      amount;
  }

  else if (
    phase ===
    "discovery-live"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.liveUsed +=
      amount;
  }

  else if (
    phase ===
    "discovery-backlog"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.backlogUsed +=
      amount;
  }

  return true;
}

function budgetTelemetry(
  budget
) {
  return {
    used:
      budget.totalUsed,

    limit:
      budget.totalLimit,

    remaining:
      Math.max(
        0,
        budget.totalLimit -
          budget.totalUsed
      ),

    system: {
      used:
        budget.system.used,

      limit:
        budget.system.limit,

      remaining:
        Math.max(
          0,
          budget.system.limit -
            budget.system.used
        )
    },

    discovery: {
      used:
        budget.discovery.used,

      limit:
        budget.discovery.limit,

      remaining:
        Math.max(
          0,
          budget.discovery.limit -
            budget.discovery.used
        ),

      live: {
        used:
          budget.discovery.liveUsed,

        limit:
          budget.discovery.liveLimit,

        remaining:
          Math.max(
            0,
            budget.discovery.liveLimit -
              budget.discovery.liveUsed
          )
      },

      backlog: {
        used:
          budget.discovery.backlogUsed,

        limit:
          budget.discovery.backlogLimit,

        remaining:
          Math.max(
            0,
            budget.discovery.backlogLimit -
              budget.discovery.backlogUsed
          )
      }
    },

    analysis: {
      used:
        budget.analysis.used,

      limit:
        budget.analysis.limit,

      remaining:
        Math.max(
          0,
          budget.analysis.limit -
            budget.analysis.used
        ),

      protected:
        true
    },

    notification: {
      used:
        budget.notification.used,

      limit:
        budget.notification.limit,

      remaining:
        Math.max(
          0,
          budget.notification.limit -
            budget.notification.used
        ),

      protected:
        true
    },

    hardPhaseIsolation:
      true,

    liveDownstreamReserve:
      LIVE_GLOBAL_RESERVE,

    liveFirstIsolation:
      true,

    telegramBudgeted:
      true,

    skipped:
      budget.skipped
  };
}

/* =========================================================
   KV
   ========================================================= */

function getKV(env) {
  if (
    env.MEME_HUNTER_STATE &&
    typeof env.MEME_HUNTER_STATE.get ===
      "function" &&
    typeof env.MEME_HUNTER_STATE.put ===
      "function"
  ) {
    return {
      kv:
        env.MEME_HUNTER_STATE,

      binding:
        "MEME_HUNTER_STATE"
    };
  }

  if (
    env.KV_BINDING &&
    typeof env.KV_BINDING.get ===
      "function" &&
    typeof env.KV_BINDING.put ===
      "function"
  ) {
    return {
      kv:
        env.KV_BINDING,

      binding:
        "KV_BINDING"
    };
  }

  return {
    kv:
      null,

    binding:
      null
  };
}

function defaultDiscoveryRpcState() {
  return {
    publicCooldownUntil:
      null,

    publicLast429At:
      null,

    publicTotal429s:
      0,

    alchemyCooldownUntil:
      null,

    alchemyLast429At:
      null,

    alchemyTotal429s:
      0,

    /*
     * V88 provider-specific proven sizes.
     */
    publicBacklogChunkBlocks:
      PUBLIC_BACKLOG_DEFAULT,

    alchemyBacklogChunkBlocks:
      ALCHEMY_BACKLOG_DEFAULT,

    publicBacklogFailedUpperBound:
      null,

    alchemyBacklogFailedUpperBound:
      null,

    publicBacklogSuccessStreak:
      0,

    alchemyBacklogSuccessStreak:
      0,

    /*
     * V110 exact-pool Initialize lookup learning.
     * Values begin at 0 so migration can seed them from each provider's
     * proven generic range after state is loaded.
     */
    publicUnknownPoolExactChunkBlocks:
      0,

    alchemyUnknownPoolExactChunkBlocks:
      0,

    publicUnknownPoolExactFailedUpperBound:
      null,

    alchemyUnknownPoolExactFailedUpperBound:
      null,

    publicUnknownPoolExactSuccessStreak:
      0,

    alchemyUnknownPoolExactSuccessStreak:
      0,

    publicUnknownPoolExactLastProbeAt:
      null,

    alchemyUnknownPoolExactLastProbeAt:
      null,

    publicUnknownPoolExactProbeFailures:
      0,

    alchemyUnknownPoolExactProbeFailures:
      0,

    publicUnknownPoolExactProbeSuccesses:
      0,

    alchemyUnknownPoolExactProbeSuccesses:
      0,

    lastUnknownPoolExactProvider:
      null,

    lastUnknownPoolExactSuccessAt:
      null,

    lastBacklogSuccessAt:
      null,

    lastBacklogProvider:
      null,

    liveChunkBlocks:
      LIVE_SAFE_CHUNK_DEFAULT,

    lastLiveSuccessAt:
      null,

    lastLiveProvider:
      null
  };
}

function newState() {
  return {
    version:
      VERSION,

    lastScannedBlock:
      null,

    lastLiveScannedBlock:
      null,

    watchedTokens:
      [],

    alerts:
      {},

    snapshots:
      {},

    poolRegistry:
      {},

    unknownPools:
      {},

    scheduler: {
      scheduledRunCount:
        0,

      lastScheduledRunAt:
        null,

      lastScheduledSuccessAt:
        null,

      lastScheduledStatus:
        null,

      lastScheduledLatestBlock:
        null
    },

    services: {
      dexscreener: {
        cooldownUntil:
          null,

        last429At:
          null,

        lastSuccessAt:
          null,

        lastStatus:
          null,

        total429s:
          0,

        consecutive429s:
          0,

        lastBackoffMs:
          0,

        lastRequestAt:
          null,

        priorityFreshReservation: {
          address:
            null,
          reservedAt:
            null,
          eligibleAt:
            null,
          lastServedAt:
            null,
          attempts:
            0
        }
      },

      geckoterminal: {
        cooldownUntil:
          null,

        last429At:
          null,

        lastSuccessAt:
          null,

        lastStatus:
          null,

        total429s:
          0,

        totalRequests:
          0,

        lastRequestAt:
          null
      },

      blockscoutPro: {
        lastStatus:
          null,

        lastSuccessAt:
          null,

        lastFailureAt:
          null,

        cooldownUntil:
          null,

        totalTransientFailures:
          0,

        consecutiveTransientFailures:
          0,

        totalRequests:
          0
      },

      discoveryRpc:
        defaultDiscoveryRpcState()
    },

    createdAt:
      now(),

    updatedAt:
      now()
  };
}

async function readState(env) {
  const {
    kv,
    binding
  } = getKV(
    env
  );

  if (!kv) {
    return {
      persistent:
        false,

      binding:
        null,

      state:
        newState(),

      error:
        null
    };
  }

  try {
    const raw =
      await kv.get(
        STATE_KEY
      );

    if (!raw) {
      return {
        persistent:
          true,

        binding,

        state:
          newState(),

        error:
          null
      };
    }

    const parsed =
      JSON.parse(
        raw
      );

    let watchedTokens =
      [];

    if (
      Array.isArray(
        parsed.watchedTokens
      )
    ) {
      watchedTokens =
        parsed.watchedTokens;
    }

    else if (
      parsed.watchedTokens &&
      typeof parsed.watchedTokens ===
        "object"
    ) {
      watchedTokens =
        Object.values(
          parsed.watchedTokens
        );
    }

    const fresh =
      newState();

    const previousDiscovery =
      parsed.services
        ?.discoveryRpc &&
      typeof parsed.services.discoveryRpc ===
        "object"
        ? parsed.services.discoveryRpc
        : {};

    /*
     * V87 -> V88 migration.
     *
     * V87 stableBacklogChunkBlocks may have contained an
     * unproven value. We deliberately do NOT trust it for
     * Alchemy.
     */
    const migratedPublic =
      safeNumber(
        previousDiscovery
          .publicBacklogChunkBlocks
      ) ||
      Math.min(
        PUBLIC_BACKLOG_DEFAULT,
        safeNumber(
          previousDiscovery
            .stableBacklogChunkBlocks
        ) ||
          PUBLIC_BACKLOG_DEFAULT
      );

    const migratedAlchemy =
      safeNumber(
        previousDiscovery
          .alchemyBacklogChunkBlocks
      ) ||
      ALCHEMY_BACKLOG_DEFAULT;

    return {
      persistent:
        true,

      binding,

      state: {
        ...fresh,
        ...parsed,

        watchedTokens,

        alerts:
          parsed.alerts &&
          typeof parsed.alerts ===
            "object"
            ? parsed.alerts
            : {},

        snapshots:
          parsed.snapshots &&
          typeof parsed.snapshots ===
            "object"
            ? parsed.snapshots
            : {},

        poolRegistry:
          parsed.poolRegistry &&
          typeof parsed.poolRegistry ===
            "object"
            ? parsed.poolRegistry
            : {},

        unknownPools:
          parsed.unknownPools &&
          typeof parsed.unknownPools ===
            "object"
            ? parsed.unknownPools
            : {},

        scheduler: {
          ...fresh.scheduler,

          ...(
            parsed.scheduler &&
            typeof parsed.scheduler ===
              "object"
              ? parsed.scheduler
              : {}
          )
        },

        services: {
          ...fresh.services,

          ...(
            parsed.services &&
            typeof parsed.services ===
              "object"
              ? parsed.services
              : {}
          ),

          dexscreener: {
            ...fresh.services.dexscreener,

            ...(
              parsed.services
                ?.dexscreener &&
              typeof parsed.services.dexscreener ===
                "object"
                ? parsed.services.dexscreener
                : {}
            )
          },

          blockscoutPro: {
            ...fresh.services.blockscoutPro,

            ...(
              parsed.services
                ?.blockscoutPro &&
              typeof parsed.services.blockscoutPro ===
                "object"
                ? parsed.services.blockscoutPro
                : {}
            )
          },

          discoveryRpc: {
            ...fresh.services.discoveryRpc,
            ...previousDiscovery,

            publicBacklogChunkBlocks:
              clamp(
                migratedPublic,
                BACKLOG_MIN_CHUNK_BLOCKS,
                BACKLOG_MAX_CHUNK_BLOCKS
              ),

            alchemyBacklogChunkBlocks:
              clamp(
                migratedAlchemy,
                BACKLOG_MIN_CHUNK_BLOCKS,
                BACKLOG_MAX_CHUNK_BLOCKS
              ),

            /*
             * V110 migration:
             * If no exact-pool range has yet been proven, seed it from
             * the provider's proven generic range. Existing V110 values
             * persist through ...previousDiscovery above.
             */
            publicUnknownPoolExactChunkBlocks:
              clamp(
                safeNumber(
                  previousDiscovery
                    .publicUnknownPoolExactChunkBlocks
                ) ||
                clamp(
                  migratedPublic,
                  BACKLOG_MIN_CHUNK_BLOCKS,
                  BACKLOG_MAX_CHUNK_BLOCKS
                ),
                1,
                UNKNOWN_POOL_EXACT_MAX_BLOCKS
              ),

            alchemyUnknownPoolExactChunkBlocks:
              clamp(
                safeNumber(
                  previousDiscovery
                    .alchemyUnknownPoolExactChunkBlocks
                ) ||
                clamp(
                  migratedAlchemy,
                  BACKLOG_MIN_CHUNK_BLOCKS,
                  BACKLOG_MAX_CHUNK_BLOCKS
                ),
                1,
                UNKNOWN_POOL_EXACT_MAX_BLOCKS
              )
          }
        }
      },

      error:
        null
    };
  }

  catch (error) {
    return {
      persistent:
        true,

      binding,

      state:
        newState(),

      error:
        errorString(
          error
        )
    };
  }
}

async function writeState(
  env,
  state
) {
  const {
    kv,
    binding
  } = getKV(
    env
  );

  if (!kv) {
    return {
      saved:
        false,

      binding:
        null,

      error:
        "KV_NOT_CONFIGURED"
    };
  }

  try {
    state.version =
      VERSION;

    state.updatedAt =
      now();

    await kv.put(
      STATE_KEY,
      JSON.stringify(
        state
      )
    );

    return {
      saved:
        true,

      binding,

      error:
        null
    };
  }

  catch (error) {
    return {
      saved:
        false,

      binding,

      error:
        errorString(
          error
        )
    };
  }
}

function discoveryService(state) {
  state.services =
    state.services ||
    {};

  state.services.discoveryRpc = {
    ...defaultDiscoveryRpcState(),

    ...(
      state.services.discoveryRpc &&
      typeof state.services.discoveryRpc ===
        "object"
        ? state.services.discoveryRpc
        : {}
    )
  };

  return state.services.discoveryRpc;
}

/* =========================================================
   PROVIDER-SPECIFIC LEARNING
   ========================================================= */

function getProviderBacklogSize(
  state,
  provider
) {
  const service =
    discoveryService(
      state
    );

  if (
    provider ===
    "ALCHEMY"
  ) {
    return clamp(
      safeNumber(
        service.alchemyBacklogChunkBlocks
      ) ||
        ALCHEMY_BACKLOG_DEFAULT,

      BACKLOG_MIN_CHUNK_BLOCKS,
      BACKLOG_MAX_CHUNK_BLOCKS
    );
  }

  return clamp(
    safeNumber(
      service.publicBacklogChunkBlocks
    ) ||
      PUBLIC_BACKLOG_DEFAULT,

    BACKLOG_MIN_CHUNK_BLOCKS,
    BACKLOG_MAX_CHUNK_BLOCKS
  );
}

function getProviderFailedUpperBound(
  state,
  provider
) {
  const service =
    discoveryService(
      state
    );

  return provider ===
    "ALCHEMY"
    ? safeNumber(
        service.alchemyBacklogFailedUpperBound
      ) ||
      null
    : safeNumber(
        service.publicBacklogFailedUpperBound
      ) ||
      null;
}

function setProviderFailedUpperBound(
  state,
  provider,
  size
) {
  const service =
    discoveryService(
      state
    );

  const existing =
    getProviderFailedUpperBound(
      state,
      provider
    );

  const next =
    existing
      ? Math.min(
          existing,
          size
        )
      : size;

  if (
    provider ===
    "ALCHEMY"
  ) {
    service.alchemyBacklogFailedUpperBound =
      next;

    service.alchemyBacklogSuccessStreak =
      0;
  }

  else {
    service.publicBacklogFailedUpperBound =
      next;

    service.publicBacklogSuccessStreak =
      0;
  }
}

function setProviderSuccessfulBacklogSize(
  state,
  provider,
  size
) {
  const service =
    discoveryService(
      state
    );

  /*
   * V88 CRITICAL:
   * Only called AFTER an actual successful request.
   */
  if (
    provider ===
    "ALCHEMY"
  ) {
    service.alchemyBacklogChunkBlocks =
      size;

    service.alchemyBacklogSuccessStreak =
      safeNumber(
        service.alchemyBacklogSuccessStreak
      ) + 1;
  }

  else {
    service.publicBacklogChunkBlocks =
      size;

    service.publicBacklogSuccessStreak =
      safeNumber(
        service.publicBacklogSuccessStreak
      ) + 1;
  }

  service.lastBacklogProvider =
    provider;

  service.lastBacklogSuccessAt =
    Date.now();
}

function providerSuccessStreak(
  state,
  provider
) {
  const service =
    discoveryService(
      state
    );

  return provider ===
    "ALCHEMY"
    ? safeNumber(
        service.alchemyBacklogSuccessStreak
      )
    : safeNumber(
        service.publicBacklogSuccessStreak
      );
}

/* =========================================================
   DISCOVERY COOLDOWN
   ========================================================= */

function markDiscovery429(
  state,
  provider
) {
  const service =
    discoveryService(
      state
    );

  const until =
    Date.now() +
    DISCOVERY_RPC_429_COOLDOWN_MS;

  if (
    provider ===
    "ROBINHOOD_PUBLIC_RPC"
  ) {
    service.publicLast429At =
      Date.now();

    service.publicCooldownUntil =
      until;

    service.publicTotal429s =
      safeNumber(
        service.publicTotal429s
      ) + 1;
  }

  if (
    provider ===
    "ALCHEMY"
  ) {
    service.alchemyLast429At =
      Date.now();

    service.alchemyCooldownUntil =
      until;

    service.alchemyTotal429s =
      safeNumber(
        service.alchemyTotal429s
      ) + 1;
  }
}

function discoveryProviderCooling(
  state,
  provider
) {
  const service =
    discoveryService(
      state
    );

  if (
    provider ===
    "ROBINHOOD_PUBLIC_RPC"
  ) {
    return (
      safeNumber(
        service.publicCooldownUntil
      ) >
      Date.now()
    );
  }

  if (
    provider ===
    "ALCHEMY"
  ) {
    return (
      safeNumber(
        service.alchemyCooldownUntil
      ) >
      Date.now()
    );
  }

  return false;
}

function preferredDiscoveryProvider(
  env,
  state
) {
  if (
    !discoveryProviderCooling(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    )
  ) {
    return "ROBINHOOD_PUBLIC_RPC";
  }

  if (
    env.ALCHEMY_API_KEY &&
    !discoveryProviderCooling(
      state,
      "ALCHEMY"
    )
  ) {
    return "ALCHEMY";
  }

  return null;
}

function alternateDiscoveryProvider(
  env,
  state,
  current
) {
  if (
    current !==
      "ROBINHOOD_PUBLIC_RPC" &&
    !discoveryProviderCooling(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    )
  ) {
    return "ROBINHOOD_PUBLIC_RPC";
  }

  if (
    current !==
      "ALCHEMY" &&
    env.ALCHEMY_API_KEY &&
    !discoveryProviderCooling(
      state,
      "ALCHEMY"
    )
  ) {
    return "ALCHEMY";
  }

  return null;
}

/* =========================================================
   V91 POOL REGISTRY
   ========================================================= */

function registerPoolMapping(
  state,
  pool
) {
  const poolId =
    normalize(
      pool?.poolId
    );

  if (!poolId) {
    return;
  }

  state.poolRegistry =
    state.poolRegistry &&
    typeof state.poolRegistry ===
      "object"
      ? state.poolRegistry
      : {};

  const tokens =
    [
      pool.currency0,
      pool.currency1
    ]
      .map(normalize)
      .filter(
        address =>
          isAddress(address) &&
          address !== ZERO &&
          !knownQuote(address)
      );

  if (!tokens.length) {
    return;
  }

  state.poolRegistry[
    poolId
  ] = {
    poolId,
    currency0:
      normalize(pool.currency0),
    currency1:
      normalize(pool.currency1),
    tokens,
    lastSeenAt:
      Date.now(),
    blockNumber:
      pool.blockNumber ||
      null,
    transactionHash:
      pool.transactionHash ||
      null
  };
}

function prunePoolRegistry(
  state
) {
  state.poolRegistry =
    state.poolRegistry &&
    typeof state.poolRegistry ===
      "object"
      ? state.poolRegistry
      : {};

  const current =
    Date.now();

  const entries =
    Object.entries(
      state.poolRegistry
    )
      .filter(
        ([, entry]) => {
          const seen =
            safeNumber(
              entry?.lastSeenAt
            );

          return (
            !seen ||
            current - seen <=
              POOL_REGISTRY_MAX_AGE
          );
        }
      )
      .sort(
        (a, b) =>
          safeNumber(
            b[1]?.lastSeenAt
          ) -
          safeNumber(
            a[1]?.lastSeenAt
          )
      )
      .slice(
        0,
        MAX_POOL_REGISTRY
      );

  state.poolRegistry =
    Object.fromEntries(
      entries
    );
}


/* =========================================================
   V100 PERSISTENT UNKNOWN V4 POOL TRACKER
   ========================================================= */

function ensureUnknownPoolState(state) {
  state.unknownPools =
    state.unknownPools &&
    typeof state.unknownPools === "object"
      ? state.unknownPools
      : {};

  return state.unknownPools;
}

function observeUnknownPools(
  state,
  logs,
  unknownPoolIds
) {
  const tracker =
    ensureUnknownPoolState(state);

  const unknownSet =
    unknownPoolIds instanceof Set
      ? unknownPoolIds
      : new Set();

  const now = Date.now();

  for (const log of logs || []) {
    const topic0 =
      normalize(log?.topics?.[0]);

    if (
      topic0 !== SWAP_TOPIC &&
      topic0 !== MODIFY_LIQUIDITY_TOPIC
    ) {
      continue;
    }

    const poolId =
      normalize(log?.topics?.[1]);

    if (
      !poolId ||
      !unknownSet.has(poolId) ||
      state.poolRegistry?.[poolId]
    ) {
      continue;
    }

    let blockNumber = 0;

    try {
      blockNumber =
        Number(
          BigInt(
            log?.blockNumber ||
            "0x0"
          )
        );
    } catch {
      blockNumber = 0;
    }

    const previous =
      tracker[poolId] &&
      typeof tracker[poolId] ===
        "object"
        ? tracker[poolId]
        : {};

    const priorFirst =
      safeNumber(
        previous.firstActiveBlock
      );

    const firstActiveBlock =
      priorFirst > 0
        ? (
            blockNumber > 0
              ? Math.min(
                  priorFirst,
                  blockNumber
                )
              : priorFirst
          )
        : (
            blockNumber > 0
              ? blockNumber
              : null
          );

    const isSwap =
      topic0 === SWAP_TOPIC;

    const isLiquidity =
      topic0 === MODIFY_LIQUIDITY_TOPIC;

    const swapEvents =
      safeNumber(
        previous.swapEvents
      ) +
      (isSwap ? 1 : 0);

    const liquidityEvents =
      safeNumber(
        previous.liquidityEvents
      ) +
      (isLiquidity ? 1 : 0);

    const appearances =
      safeNumber(
        previous.appearances
      ) + 1;

    tracker[poolId] = {
      poolId,
      firstSeenAt:
        safeNumber(
          previous.firstSeenAt
        ) || now,
      lastSeenAt:
        now,
      firstActiveBlock,
      lastActiveBlock:
        Math.max(
          safeNumber(
            previous.lastActiveBlock
          ),
          blockNumber
        ) || null,
      searchCursorBlock:
        safeNumber(
          previous.searchCursorBlock
        ) > 0
          ? safeNumber(
              previous.searchCursorBlock
            )
          : (
              firstActiveBlock &&
              firstActiveBlock > 0
                ? firstActiveBlock - 1
                : null
            ),
      attempts:
        safeNumber(
          previous.attempts
        ),
      searchedBlocks:
        safeNumber(
          previous.searchedBlocks
        ),
      swapEvents,
      liquidityEvents,
      appearances,
      activityScore:
        swapEvents * 3 +
        liquidityEvents * 5 +
        Math.min(
          appearances,
          20
        ),
      lastAttemptAt:
        previous.lastAttemptAt ||
        null,
      lastSuccessfulSearchAt:
        previous.lastSuccessfulSearchAt ||
        null,
      consecutiveEmptySearches:
        safeNumber(
          previous.consecutiveEmptySearches
        ),
      lastResolvedSearchDistance:
        safeNumber(
          previous.lastResolvedSearchDistance
        ) || null,
      lastError:
        previous.lastError ||
        null
    };
  }
}

function pruneUnknownPools(state) {
  const tracker =
    ensureUnknownPoolState(state);

  const now = Date.now();

  const entries =
    Object.entries(tracker)
      .filter(([poolId, entry]) => {
        if (
          state.poolRegistry?.[
            poolId
          ]
        ) {
          return false;
        }

        const seen =
          safeNumber(
            entry?.lastSeenAt
          );

        return (
          !seen ||
          now - seen <=
            UNKNOWN_POOL_MAX_AGE_MS
        );
      })
      .sort(
        (a, b) =>
          safeNumber(
            b[1]?.lastSeenAt
          ) -
          safeNumber(
            a[1]?.lastSeenAt
          )
      )
      .slice(
        0,
        MAX_UNKNOWN_POOL_TRACKER
      );

  state.unknownPools =
    Object.fromEntries(
      entries
    );
}

function exactPoolLearningState(
  state
) {
  return discoveryService(
    state
  );
}

function exactPoolProviderFields(
  provider
) {
  const isAlchemy =
    provider ===
    "ALCHEMY";

  return {
    chunk:
      isAlchemy
        ? "alchemyUnknownPoolExactChunkBlocks"
        : "publicUnknownPoolExactChunkBlocks",

    failedUpper:
      isAlchemy
        ? "alchemyUnknownPoolExactFailedUpperBound"
        : "publicUnknownPoolExactFailedUpperBound",

    streak:
      isAlchemy
        ? "alchemyUnknownPoolExactSuccessStreak"
        : "publicUnknownPoolExactSuccessStreak",

    lastProbeAt:
      isAlchemy
        ? "alchemyUnknownPoolExactLastProbeAt"
        : "publicUnknownPoolExactLastProbeAt",

    probeFailures:
      isAlchemy
        ? "alchemyUnknownPoolExactProbeFailures"
        : "publicUnknownPoolExactProbeFailures",

    probeSuccesses:
      isAlchemy
        ? "alchemyUnknownPoolExactProbeSuccesses"
        : "publicUnknownPoolExactProbeSuccesses",

    genericChunk:
      isAlchemy
        ? "alchemyBacklogChunkBlocks"
        : "publicBacklogChunkBlocks"
  };
}

function exactPoolSafeChunk(
  state,
  provider
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  const generic =
    Math.max(
      1,
      safeNumber(
        service[
          fields.genericChunk
        ]
      ) ||
      UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS
    );

  const learned =
    safeNumber(
      service[
        fields.chunk
      ]
    );

  const verifiedPromotions =
    safeNumber(
      service[
        fields.probeSuccesses
      ]
    );

  /*
   * V111 contamination repair:
   *
   * V109/V110 could leave optimistic 500/100 values in KV even though
   * those ranges had never succeeded. A range larger than the provider's
   * proven generic range is trusted only after a real capability-probe
   * success has been recorded. Otherwise it is immediately sanitized.
   */
  if (
    learned <= 0 ||
    (
      learned >
        generic &&
      verifiedPromotions <= 0
    )
  ) {
    service[
      fields.chunk
    ] =
      generic;

    service[
      fields.streak
    ] =
      0;

    return generic;
  }

  return clamp(
    learned,
    1,
    UNKNOWN_POOL_EXACT_MAX_BLOCKS
  );
}

function exactPoolDemoteOn400(
  state,
  provider,
  failedBlocks
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  const generic =
    Math.max(
      1,
      safeNumber(
        service[
          fields.genericChunk
        ]
      ) ||
      UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS
    );

  const previousFailed =
    exactPoolFailedUpper(
      state,
      provider
    );

  service[
    fields.failedUpper
  ] =
    previousFailed
      ? Math.min(
          previousFailed,
          failedBlocks
        )
      : failedBlocks;

  /*
   * Persist the demotion. This is deliberately different from a failed
   * growth probe: here the currently-used "safe" range itself failed.
   */
  service[
    fields.chunk
  ] =
    Math.min(
      exactPoolSafeChunk(
        state,
        provider
      ),
      generic
    );

  service[
    fields.streak
  ] =
    0;

  service[
    fields.lastProbeAt
  ] =
    Date.now();

  return generic;
}

function exactPoolFailedUpper(
  state,
  provider
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  return (
    safeNumber(
      service[
        fields.failedUpper
      ]
    ) ||
    null
  );
}

function exactPoolCanGrowthProbe(
  state,
  provider,
  runProbeState
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  if (
    runProbeState?.has(
      provider
    )
  ) {
    return false;
  }

  const streak =
    safeNumber(
      service[
        fields.streak
      ]
    );

  if (
    streak <
    UNKNOWN_POOL_EXACT_GROW_SUCCESS_STREAK
  ) {
    return false;
  }

  const lastProbeAt =
    safeNumber(
      service[
        fields.lastProbeAt
      ]
    );

  const probeFailures =
    safeNumber(
      service[
        fields.probeFailures
      ]
    );

  const effectiveProbeCooldown =
    probeFailures > 0
      ? (
          provider ===
            "ALCHEMY"
            ? UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_ALCHEMY_MS
            : UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_PUBLIC_MS
        )
      : UNKNOWN_POOL_EXACT_PROBE_COOLDOWN_MS;

  if (
    lastProbeAt > 0 &&
    Date.now() -
      lastProbeAt <
      effectiveProbeCooldown
  ) {
    return false;
  }

  const safeChunk =
    exactPoolSafeChunk(
      state,
      provider
    );

  const failedUpper =
    exactPoolFailedUpper(
      state,
      provider
    );

  const candidate =
    Math.min(
      UNKNOWN_POOL_EXACT_MAX_BLOCKS,
      safeChunk * 2
    );

  if (
    candidate <=
    safeChunk
  ) {
    return false;
  }

  if (
    failedUpper &&
    candidate >=
      failedUpper
  ) {
    return false;
  }

  return true;
}

function exactPoolRecordNormalSuccess(
  state,
  provider
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  service[
    fields.streak
  ] =
    safeNumber(
      service[
        fields.streak
      ]
    ) + 1;

  service.lastUnknownPoolExactProvider =
    provider;

  service.lastUnknownPoolExactSuccessAt =
    Date.now();
}

function exactPoolRecordProbeSuccess(
  state,
  provider,
  promotedBlocks
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  service[
    fields.chunk
  ] =
    clamp(
      promotedBlocks,
      1,
      UNKNOWN_POOL_EXACT_MAX_BLOCKS
    );

  service[
    fields.streak
  ] =
    0;

  service[
    fields.lastProbeAt
  ] =
    Date.now();

  service[
    fields.probeSuccesses
  ] =
    safeNumber(
      service[
        fields.probeSuccesses
      ]
    ) + 1;

  service.lastUnknownPoolExactProvider =
    provider;

  service.lastUnknownPoolExactSuccessAt =
    Date.now();
}

function exactPoolRecordProbeFailure(
  state,
  provider,
  failedBlocks
) {
  const service =
    exactPoolLearningState(
      state
    );

  const fields =
    exactPoolProviderFields(
      provider
    );

  const previousFailed =
    exactPoolFailedUpper(
      state,
      provider
    );

  service[
    fields.failedUpper
  ] =
    previousFailed
      ? Math.min(
          previousFailed,
          failedBlocks
        )
      : failedBlocks;

  /*
   * IMPORTANT:
   * Do NOT replace the already-proven safe chunk with the failed size.
   * This is the V109 regression V110 explicitly fixes.
   */
  service[
    fields.streak
  ] =
    0;

  service[
    fields.lastProbeAt
  ] =
    Date.now();

  service[
    fields.probeFailures
  ] =
    safeNumber(
      service[
        fields.probeFailures
      ]
    ) + 1;
}

function providerSafeUnknownPoolChunks(
  state,
  desiredChunkBlocks
) {
  const discoveryRpcState =
    state?.services
      ?.discoveryRpc ||
    state?.discoveryRpc ||
    {};

  const publicGenericSafe =
    Math.max(
      1,
      safeNumber(
        discoveryRpcState
          ?.publicBacklogChunkBlocks
      ) ||
      UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS
    );

  const alchemyGenericSafe =
    Math.max(
      1,
      safeNumber(
        discoveryRpcState
          ?.alchemyBacklogChunkBlocks
      ) ||
      UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS
    );

  const publicSafe =
    exactPoolSafeChunk(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    );

  const alchemySafe =
    exactPoolSafeChunk(
      state,
      "ALCHEMY"
    );

  return {
    desiredChunkBlocks,

    publicChunkBlocks:
      publicSafe,

    alchemyChunkBlocks:
      alchemySafe,

    publicSafe,
    alchemySafe,

    publicGenericSafe,
    alchemyGenericSafe,

    publicFailedUpper:
      exactPoolFailedUpper(
        state,
        "ROBINHOOD_PUBLIC_RPC"
      ),

    alchemyFailedUpper:
      exactPoolFailedUpper(
        state,
        "ALCHEMY"
      ),

    learningStatePath:
      state?.services
        ?.discoveryRpc
        ? "state.services.discoveryRpc"
        : (
            state?.discoveryRpc
              ? "state.discoveryRpc"
              : "fallback-defaults"
          )
  };
}

async function getInitializeForPoolRange(
  env,
  state,
  poolId,
  cursorBlock,
  desiredChunkBlocks,
  budget,
  runProbeState,
  externalRequestAllowance =
    UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN
) {
  if (
    !poolId ||
    cursorBlock <= 0 ||
    !budgetAvailable(
      budget,
      "discovery-live"
    )
  ) {
    return {
      logs: [],
      provider: null,
      error: null,
      fromBlock: null,
      toBlock: null,
      requestedBlocks: 0,
      desiredChunkBlocks,
      providerSafeChunkBlocks: 0,
      publicProvenChunkBlocks: 0,
      alchemyProvenChunkBlocks: 0,
      publicGenericSafeBlocks: 0,
      alchemyGenericSafeBlocks: 0,
      growthProbeAttempted: false,
      growthProbeSucceeded: false,
      growthProbeBlocks: null,
      exactRangeFallbackUsed: false,
      externalRequestsUsed: 0,
      learningStatePath:
        "NOT_EVALUATED"
    };
  }

  const safeChunks =
    providerSafeUnknownPoolChunks(
      state,
      desiredChunkBlocks
    );

  const preferred = [
    {
      provider:
        "ROBINHOOD_PUBLIC_RPC",
      safeBlocks:
        safeChunks.publicChunkBlocks,
      genericSafe:
        safeChunks.publicGenericSafe
    },
    {
      provider:
        "ALCHEMY",
      safeBlocks:
        safeChunks.alchemyChunkBlocks,
      genericSafe:
        safeChunks.alchemyGenericSafe
    }
  ];

  let lastError = null;
  let externalRequestsUsed = 0;
  let growthProbeAttempted = false;
  let growthProbeSucceeded = false;
  let growthProbeBlocks = null;
  let exactRangeFallbackUsed = false;

  const executeRange =
    async (
      provider,
      url,
      requestedBlocks
    ) => {
      if (
        externalRequestsUsed >=
          externalRequestAllowance
      ) {
        return {
          logs: [],
          provider: null,
          error:
            "UNKNOWN_POOL_HARD_REQUEST_LIMIT",
          fromBlock: null,
          toBlock: null,
          requestedBlocks: 0
        };
      }

      if (
        !budgetAvailable(
          budget,
          "discovery-live"
        )
      ) {
        return {
          logs: [],
          provider: null,
          error:
            "DISCOVERY_LIVE_BUDGET_PROTECTED",
          fromBlock: null,
          toBlock: null,
          requestedBlocks: 0
        };
      }

      const to =
        BigInt(
          cursorBlock
        );

      const blocks =
        Math.max(
          1,
          requestedBlocks
        );

      const span =
        BigInt(
          blocks - 1
        );

      const from =
        to > span
          ? to - span
          : 0n;

      externalRequestsUsed++;

      try {
        const logs =
          await rpcCall(
            url,
            "eth_getLogs",
            [{
              fromBlock:
                "0x" +
                from.toString(16),
              toBlock:
                "0x" +
                to.toString(16),
              address:
                POOL_MANAGER,
              topics: [
                INITIALIZE_TOPIC,
                poolId
              ]
            }],
            budget,
            "discovery-live"
          );

        return {
          logs:
            Array.isArray(
              logs
            )
              ? logs
              : [],
          provider,
          error: null,
          fromBlock:
            Number(from),
          toBlock:
            Number(to),
          requestedBlocks:
            Number(
              to -
              from +
              1n
            )
        };
      } catch (error) {
        const message =
          String(
            error?.message ||
            error
          );

        if (
          is429(
            message
          )
        ) {
          markDiscovery429(
            state,
            provider
          );
        }

        return {
          logs: [],
          provider,
          error:
            message,
          fromBlock:
            Number(from),
          toBlock:
            Number(to),
          requestedBlocks:
            Number(
              to -
              from +
              1n
            )
        };
      }
    };

  for (
    const option
    of preferred
  ) {
    const provider =
      option.provider;

    if (
      discoveryProviderCooling(
        state,
        provider
      )
    ) {
      continue;
    }

    const url =
      rpcProviderUrl(
        env,
        provider
      );

    if (!url) {
      continue;
    }

    const shouldProbe =
      exactPoolCanGrowthProbe(
        state,
        provider,
        runProbeState
      );

    if (
      shouldProbe &&
      (
        externalRequestAllowance -
        externalRequestsUsed
      ) >= 2 &&
      budgetAvailable(
        budget,
        "discovery-live",
        2
      )
    ) {
      runProbeState?.add(
        provider
      );

      growthProbeAttempted =
        true;

      growthProbeBlocks =
        Math.min(
          UNKNOWN_POOL_EXACT_MAX_BLOCKS,
          option.safeBlocks * 2
        );

      const probe =
        await executeRange(
          provider,
          url,
          growthProbeBlocks
        );

      if (
        !probe.error
      ) {
        exactPoolRecordProbeSuccess(
          state,
          provider,
          probe.requestedBlocks
        );

        growthProbeSucceeded =
          true;

        return {
          ...probe,
          desiredChunkBlocks,
          providerSafeChunkBlocks:
            probe.requestedBlocks,
          publicProvenChunkBlocks:
            exactPoolSafeChunk(
              state,
              "ROBINHOOD_PUBLIC_RPC"
            ),
          alchemyProvenChunkBlocks:
            exactPoolSafeChunk(
              state,
              "ALCHEMY"
            ),
          publicGenericSafeBlocks:
            safeChunks.publicGenericSafe,
          alchemyGenericSafeBlocks:
            safeChunks.alchemyGenericSafe,
          growthProbeAttempted,
          growthProbeSucceeded,
          growthProbeBlocks,
          exactRangeFallbackUsed,
          externalRequestsUsed,
          learningStatePath:
            safeChunks.learningStatePath
        };
      }

      lastError =
        probe.error;

      if (
        is400(
          probe.error
        )
      ) {
        exactPoolRecordProbeFailure(
          state,
          provider,
          growthProbeBlocks
        );

        exactRangeFallbackUsed =
          true;

        /*
         * Fall back ONCE to the already-proven exact safe size.
         * The failed size is persisted as an upper bound and will not
         * be re-probed on every pool.
         */
        const fallback =
          await executeRange(
            provider,
            url,
            option.safeBlocks
          );

        if (
          !fallback.error
        ) {
          exactPoolRecordNormalSuccess(
            state,
            provider
          );

          return {
            ...fallback,
            desiredChunkBlocks,
            providerSafeChunkBlocks:
              fallback.requestedBlocks,
            publicProvenChunkBlocks:
              exactPoolSafeChunk(
                state,
                "ROBINHOOD_PUBLIC_RPC"
              ),
            alchemyProvenChunkBlocks:
              exactPoolSafeChunk(
                state,
                "ALCHEMY"
              ),
            publicGenericSafeBlocks:
              safeChunks.publicGenericSafe,
            alchemyGenericSafeBlocks:
              safeChunks.alchemyGenericSafe,
            growthProbeAttempted,
            growthProbeSucceeded,
            growthProbeBlocks,
            exactRangeFallbackUsed,
            externalRequestsUsed,
            learningStatePath:
              safeChunks.learningStatePath
          };
        }

        lastError =
          fallback.error;
      }

      /*
       * On 429 or non-400 errors, do not immediately hammer the same
       * provider again. Allow the normal provider loop to fail over.
       */
      continue;
    }

    let result =
      await executeRange(
        provider,
        url,
        option.safeBlocks
      );

    if (
      !result.error
    ) {
      exactPoolRecordNormalSuccess(
        state,
        provider
      );

      return {
        ...result,
        desiredChunkBlocks,
        providerSafeChunkBlocks:
          result.requestedBlocks,
        publicProvenChunkBlocks:
          exactPoolSafeChunk(
            state,
            "ROBINHOOD_PUBLIC_RPC"
          ),
        alchemyProvenChunkBlocks:
          exactPoolSafeChunk(
            state,
            "ALCHEMY"
          ),
        publicGenericSafeBlocks:
          safeChunks.publicGenericSafe,
        alchemyGenericSafeBlocks:
          safeChunks.alchemyGenericSafe,
        growthProbeAttempted,
        growthProbeSucceeded,
        growthProbeBlocks,
        exactRangeFallbackUsed,
        externalRequestsUsed,
        learningStatePath:
          safeChunks.learningStatePath
      };
    }

    lastError =
      result.error;

    /*
     * V111:
     * If a currently-learned exact range itself 400s, immediately
     * demote/persist to the proven generic provider range and retry the
     * SAME cursor contiguously once. This repairs stale/contaminated KV
     * without sacrificing resolver progress.
     */
    if (
      is400(
        result.error
      )
    ) {
      const demotedSafe =
        exactPoolDemoteOn400(
          state,
          provider,
          Math.max(
            1,
            option.safeBlocks
          )
        );

      if (
        demotedSafe <
          option.safeBlocks &&
        budgetAvailable(
          budget,
          "discovery-live"
        )
      ) {
        exactRangeFallbackUsed =
          true;

        result =
          await executeRange(
            provider,
            url,
            demotedSafe
          );

        if (
          !result.error
        ) {
          exactPoolRecordNormalSuccess(
            state,
            provider
          );

          return {
            ...result,
            desiredChunkBlocks,
            providerSafeChunkBlocks:
              result.requestedBlocks,
            publicProvenChunkBlocks:
              exactPoolSafeChunk(
                state,
                "ROBINHOOD_PUBLIC_RPC"
              ),
            alchemyProvenChunkBlocks:
              exactPoolSafeChunk(
                state,
                "ALCHEMY"
              ),
            publicGenericSafeBlocks:
              safeChunks.publicGenericSafe,
            alchemyGenericSafeBlocks:
              safeChunks.alchemyGenericSafe,
            growthProbeAttempted,
            growthProbeSucceeded,
            growthProbeBlocks,
            exactRangeFallbackUsed,
            externalRequestsUsed,
            learningStatePath:
              safeChunks.learningStatePath
          };
        }

        lastError =
          result.error;
      }
    }
  }

  return {
    logs: [],
    provider: null,
    error:
      lastError ||
      "UNKNOWN_POOL_LOOKUP_UNAVAILABLE",
    fromBlock: null,
    toBlock: null,
    requestedBlocks: 0,
    desiredChunkBlocks,
    providerSafeChunkBlocks: 0,
    publicProvenChunkBlocks:
      exactPoolSafeChunk(
        state,
        "ROBINHOOD_PUBLIC_RPC"
      ),
    alchemyProvenChunkBlocks:
      exactPoolSafeChunk(
        state,
        "ALCHEMY"
      ),
    publicGenericSafeBlocks:
      safeChunks.publicGenericSafe,
    alchemyGenericSafeBlocks:
      safeChunks.alchemyGenericSafe,
    growthProbeAttempted,
    growthProbeSucceeded,
    growthProbeBlocks,
    exactRangeFallbackUsed,
    externalRequestsUsed,
    learningStatePath:
      safeChunks.learningStatePath
  };
}


function unknownPoolRetryBackoffMs(
  entry
) {
  const attempts =
    safeNumber(
      entry?.attempts
    );

  if (
    attempts >=
    UNKNOWN_POOL_SEVERE_STALLED_ATTEMPTS
  ) {
    return UNKNOWN_POOL_SEVERE_STALLED_RETRY_MS;
  }

  if (
    attempts >=
    UNKNOWN_POOL_STALLED_ATTEMPTS
  ) {
    return UNKNOWN_POOL_STALLED_RETRY_MS;
  }

  return 0;
}

function unknownPoolBackoffActive(
  entry,
  now = Date.now()
) {
  const retryMs =
    unknownPoolRetryBackoffMs(
      entry
    );

  if (
    retryMs <= 0
  ) {
    return false;
  }

  const lastAttemptAt =
    safeNumber(
      entry?.lastAttemptAt
    );

  return (
    lastAttemptAt > 0 &&
    now - lastAttemptAt <
      retryMs
  );
}

function unknownPoolSearchDistance(
  entry
) {
  const firstActive =
    safeNumber(
      entry?.firstActiveBlock
    );

  const cursor =
    safeNumber(
      entry?.searchCursorBlock
    );

  if (
    firstActive <= 0 ||
    cursor <= 0
  ) {
    return 0;
  }

  return Math.max(
    0,
    firstActive - cursor - 1
  );
}



function unknownPoolLaunchProximityScore(
  entry
) {
  const distance =
    unknownPoolSearchDistance(
      entry
    );

  const liquidityEvents =
    safeNumber(
      entry?.liquidityEvents
    );

  const swaps =
    safeNumber(
      entry?.swapEvents
    );

  let score = 0;

  if (distance <= 10) {
    score += 40;
  } else if (distance <= 30) {
    score += 25;
  } else if (distance <= 60) {
    score += 10;
  }

  score += Math.min(
    30,
    liquidityEvents * 6
  );

  score += Math.min(
    10,
    swaps
  );

  return score;
}

function unknownPoolDeepSearchAllowedNow(
  state,
  entry
) {
  const distance =
    unknownPoolSearchDistance(
      entry
    );

  const publicAvailable =
    !discoveryProviderCooling(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    );

  const publicRange =
    exactPoolSafeChunk(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    );

  const alchemyRange =
    exactPoolSafeChunk(
      state,
      "ALCHEMY"
    );

  if (
    publicAvailable &&
    publicRange >
      alchemyRange
  ) {
    return true;
  }

  return (
    distance <=
    UNKNOWN_POOL_ALCHEMY_DEEP_SEARCH_DISTANCE_BLOCKS
  );
}


function unknownPoolDynamicRequestLimit(
  state,
  budget
) {
  const watchedCount =
    Array.isArray(
      state?.watchedTokens
    )
      ? state.watchedTokens.length
      : 0;

  const pendingPriorityAddress =
    normalize(
      state
        ?.priorityCandidateCompletion
        ?.address
    );

  const pendingPriorityCompleted =
    state
      ?.priorityCandidateCompletion
      ?.completed ===
      true;

  const priorityPipelineActive =
    Boolean(
      pendingPriorityAddress &&
      !pendingPriorityCompleted
    );

  /*
   * Any meaningful watchlist means later validation/market/holder work may
   * require the protected analysis budget. A pending priority completion is
   * an even stronger signal.
   */
  const candidatePipelineActive =
    priorityPipelineActive ||
    watchedCount >= 4;

  const desiredLimit =
    candidatePipelineActive
      ? UNKNOWN_POOL_ACTIVE_PIPELINE_REQUEST_LIMIT
      : UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN;

  /*
   * Also respect the current global live-discovery reserve. This calculation
   * cannot increase the hard ceiling; it can only reduce resolver spending.
   */
  const totalHeadroom =
    Math.max(
      0,
      safeNumber(
        budget?.totalLimit
      ) -
      safeNumber(
        budget?.totalUsed
      ) -
      LIVE_GLOBAL_RESERVE
    );

  const effectiveLimit =
    Math.max(
      0,
      Math.min(
        UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,
        desiredLimit,
        totalHeadroom
      )
    );

  return {
    effectiveLimit,

    hardLimit:
      UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,

    protectedRequests:
      Math.max(
        0,
        UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN -
          effectiveLimit
      ),

    configuredAnalysisProtectedRequests:
      UNKNOWN_POOL_ANALYSIS_PROTECTED_REQUESTS,

    candidatePipelineActive,

    priorityPipelineActive,

    watchedCount,

    reason:
      candidatePipelineActive
        ? "CANDIDATE_ANALYSIS_BUDGET_PROTECTED"
        : "FULL_RESOLVER_BUDGET_AVAILABLE"
  };
}

async function resolvePersistentUnknownPools(
  env,
  state,
  budget
) {
  pruneUnknownPools(
    state
  );

  const dynamicRequestBudget =
    unknownPoolDynamicRequestLimit(
      state,
      budget
    );

  const resolverRequestLimit =
    dynamicRequestBudget
      .effectiveLimit;

  const tracker =
    ensureUnknownPoolState(
      state
    );

  /*
   * V110: prevents repeated capability probes against the same provider
   * during one scan run.
   */
  const exactPoolGrowthProbedProviders =
    new Set();

  const allUnresolvedCandidates =
    Object.values(
      tracker
    )
      .filter(entry => {
        const poolId =
          normalize(
            entry?.poolId
          );

        return (
          poolId &&
          !state.poolRegistry?.[
            poolId
          ] &&
          safeNumber(
            entry
              ?.searchCursorBlock
          ) > 0
        );
      });

  const now =
    Date.now();

  const backedOffCandidates =
    allUnresolvedCandidates
      .filter(
        entry =>
          unknownPoolBackoffActive(
            entry,
            now
          )
      );

  const eligibleCandidates =
    allUnresolvedCandidates
      .filter(
        entry =>
          !unknownPoolBackoffActive(
            entry,
            now
          )
      );

  const byOldestWait = (
    a,
    b
  ) => {
    const aAttemptAt =
      safeNumber(
        a?.lastAttemptAt
      );

    const bAttemptAt =
      safeNumber(
        b?.lastAttemptAt
      );

    if (
      !aAttemptAt &&
      bAttemptAt
    ) {
      return -1;
    }

    if (
      aAttemptAt &&
      !bAttemptAt
    ) {
      return 1;
    }

    if (
      aAttemptAt !==
      bAttemptAt
    ) {
      return (
        aAttemptAt -
        bAttemptAt
      );
    }

    const attemptDiff =
      safeNumber(
        a?.attempts
      ) -
      safeNumber(
        b?.attempts
      );

    if (
      attemptDiff !== 0
    ) {
      return attemptDiff;
    }

    return (
      safeNumber(
        a?.firstSeenAt
      ) -
      safeNumber(
        b?.firstSeenAt
      )
    );
  };

  const activityScore = entry =>
    safeNumber(
      entry?.activityScore
    ) ||
    (
      safeNumber(
        entry?.swapEvents
      ) * 3 +
      safeNumber(
        entry?.liquidityEvents
      ) * 5 +
      Math.min(
        safeNumber(
          entry?.appearances
        ),
        20
      )
    );

  const freshLane =
    eligibleCandidates
      .filter(
        entry =>
          safeNumber(
            entry?.attempts
          ) <= 0
      )
      .sort((a, b) => {
        const activityDiff =
          activityScore(b) -
          activityScore(a);

        if (
          activityDiff !== 0
        ) {
          return activityDiff;
        }

        return byOldestWait(
          a,
          b
        );
      });

  const deepLane =
    eligibleCandidates
      .filter(
        entry =>
          safeNumber(
            entry?.attempts
          ) > 0 &&
          unknownPoolDeepSearchAllowedNow(
            state,
            entry
          )
      )
      .sort((a, b) => {
        const activityDiff =
          activityScore(b) -
          activityScore(a);

        if (
          activityDiff !== 0
        ) {
          return activityDiff;
        }

        const attemptDiff =
          safeNumber(
            b?.attempts
          ) -
          safeNumber(
            a?.attempts
          );

        if (
          attemptDiff !== 0
        ) {
          return attemptDiff;
        }

        return byOldestWait(
          a,
          b
        );
      });

  const selectedCandidates =
    [];

  const selectedPoolIds =
    new Set();

  const pushCandidate = (
    entry,
    lane
  ) => {
    if (!entry) {
      return;
    }

    const poolId =
      normalize(
        entry?.poolId
      );

    if (
      !poolId ||
      selectedPoolIds.has(
        poolId
      )
    ) {
      return;
    }

    selectedPoolIds.add(
      poolId
    );

    selectedCandidates.push({
      entry,
      lane
    });
  };

  /*
   * V103 MIXED-DEPTH SCHEDULER
   *
   * Probe #1: breadth / new pool
   * Probe #2: depth / already-searched pool
   * Probe #3: oldest waiting remaining pool, regardless of lane
   */
  pushCandidate(
    freshLane[0],
    "FRESH"
  );

  pushCandidate(
    deepLane[0],
    "DEEP"
  );

  const remainingByOldest =
    eligibleCandidates
      .filter(entry => {
        const poolId =
          normalize(
            entry?.poolId
          );

        return (
          poolId &&
          !selectedPoolIds.has(
            poolId
          )
        );
      })
      .sort((a, b) => {
        const fair =
          byOldestWait(
            a,
            b
          );

        if (
          fair !== 0
        ) {
          return fair;
        }

        return (
          activityScore(b) -
          activityScore(a)
        );
      });

  pushCandidate(
    remainingByOldest[0],
    "OLDEST_WAIT"
  );

  /*
   * V108 BALANCED BREADTH + DEPTH SCHEDULER
   *
   * Keep the original three fairness lanes, then use two slots on the
   * highest-activity unresolved pools not already selected. Finally use
   * at most two contiguous DEEP_BURST requests on the strongest DEEP
   * pool. This prevents one pool consuming almost the whole resolver
   * budget while still making meaningful backwards progress.
   */
  const activityBreadth =
    eligibleCandidates
      .filter(entry => {
        const poolId =
          normalize(
            entry?.poolId
          );

        return (
          poolId &&
          !selectedPoolIds.has(
            poolId
          )
        );
      })
      .sort((a, b) => {
        const proximityDiff =
          unknownPoolLaunchProximityScore(
            b
          ) -
          unknownPoolLaunchProximityScore(
            a
          );

        if (
          proximityDiff !== 0
        ) {
          return proximityDiff;
        }

        const activityDiff =
          activityScore(b) -
          activityScore(a);

        if (
          activityDiff !== 0
        ) {
          return activityDiff;
        }

        return byOldestWait(
          a,
          b
        );
      });

  for (
    const entry
    of activityBreadth.slice(
      0,
      2
    )
  ) {
    pushCandidate(
      entry,
      "ACTIVITY_BREADTH"
    );
  }

  const strongestDeep =
    deepLane[0] ||
    null;

  const publicDeepBurstUsable =
    !discoveryProviderCooling(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    ) &&
    exactPoolSafeChunk(
      state,
      "ROBINHOOD_PUBLIC_RPC"
    ) >
    exactPoolSafeChunk(
      state,
      "ALCHEMY"
    );

  const strongestDeepAttempts =
    safeNumber(
      strongestDeep?.attempts
    );

  const allowDeepBurst =
    Boolean(
      strongestDeep
    ) &&
    publicDeepBurstUsable &&
    strongestDeepAttempts <
      UNKNOWN_POOL_STALLED_ATTEMPTS;

  let deepBurstAdded = 0;

  while (
    allowDeepBurst &&
    deepBurstAdded < 2 &&
    selectedCandidates.length <
      resolverRequestLimit
  ) {
    selectedCandidates.push({
      entry:
        strongestDeep,
      lane:
        "DEEP_BURST"
    });

    deepBurstAdded++;
  }

  /*
   * Fill any remaining resolver slots fairly if a lane was unavailable.
   */
  const fillCandidates =
    eligibleCandidates
      .filter(entry => {
        const poolId =
          normalize(
            entry?.poolId
          );

        return (
          poolId &&
          !selectedPoolIds.has(
            poolId
          )
        );
      })
      .sort((a, b) => {
        const proximityDiff =
          unknownPoolLaunchProximityScore(
            b
          ) -
          unknownPoolLaunchProximityScore(
            a
          );

        if (
          proximityDiff !== 0
        ) {
          return proximityDiff;
        }

        return byOldestWait(
          a,
          b
        );
      });

  for (
    const entry
    of fillCandidates
  ) {
    if (
      selectedCandidates.length >=
      resolverRequestLimit
    ) {
      break;
    }

    pushCandidate(
      entry,
      "FAIR_FILL"
    );
  }

  const candidates =
    selectedCandidates;

  const output = {
    attempted: 0,
    requestsUsed: 0,
    requestLimit:
      resolverRequestLimit,

    hardRequestLimit:
      UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,

    protectedAnalysisRequests:
      dynamicRequestBudget
        .protectedRequests,

    configuredAnalysisProtectedRequests:
      dynamicRequestBudget
        .configuredAnalysisProtectedRequests,

    candidatePipelineActive:
      dynamicRequestBudget
        .candidatePipelineActive,

    priorityPipelineActive:
      dynamicRequestBudget
        .priorityPipelineActive,

    requestLimitReason:
      dynamicRequestBudget
        .reason,
    scheduler:
      "BALANCED_BREADTH_DEPTH_V108",
    selectedLanes:
      candidates.map(
        item =>
          item.lane
      ),
    resolved: 0,
    resolvedPoolIds: [],
    searchedBlocks: 0,
    activityBreadthSelections:
      candidates.filter(
        item =>
          item.lane ===
          "ACTIVITY_BREADTH"
      ).length,
    deepBurstSelections:
      candidates.filter(
        item =>
          item.lane ===
          "DEEP_BURST"
      ).length,
    downstreamReserveRequests:
      LIVE_GLOBAL_RESERVE,
    hardExternalRequestLimit:
      UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,
    stalledPoolBackoff:
      "ENABLED_V112",
    backedOffPoolCount:
      backedOffCandidates.length,
    stalledPoolCount:
      allUnresolvedCandidates.filter(
        entry =>
          safeNumber(
            entry?.attempts
          ) >=
          UNKNOWN_POOL_STALLED_ATTEMPTS
      ).length,
    severeStalledPoolCount:
      allUnresolvedCandidates.filter(
        entry =>
          safeNumber(
            entry?.attempts
          ) >=
          UNKNOWN_POOL_SEVERE_STALLED_ATTEMPTS
      ).length,
    publicDeepBurstUsable,
    providerAwareDeepSearch:
      "ENABLED_V113",
    alchemyDeepSearchDistanceLimit:
      UNKNOWN_POOL_ALCHEMY_DEEP_SEARCH_DISTANCE_BLOCKS,
    deepSearchEligibleCount:
      eligibleCandidates.filter(
        entry =>
          unknownPoolDeepSearchAllowedNow(
            state,
            entry
          )
      ).length,
    deepSearchDeferredCount:
      eligibleCandidates.filter(
        entry =>
          !unknownPoolDeepSearchAllowedNow(
            state,
            entry
          )
      ).length,
    exactPoolCapabilityLearning:
      "ENABLED_V110",
    capabilityProbesThisRun:
      Array.from(
        exactPoolGrowthProbedProviders
      ),
    exactPoolLearnedRanges: {
      public:
        exactPoolSafeChunk(
          state,
          "ROBINHOOD_PUBLIC_RPC"
        ),
      alchemy:
        exactPoolSafeChunk(
          state,
          "ALCHEMY"
        )
    },
    exactPoolFailedUpperBounds: {
      public:
        exactPoolFailedUpper(
          state,
          "ROBINHOOD_PUBLIC_RPC"
        ),
      alchemy:
        exactPoolFailedUpper(
          state,
          "ALCHEMY"
        )
    },
    trackerCount:
      Object.keys(
        tracker
      ).length,
    probes: []
  };

  for (
    const selected
    of candidates
  ) {
    const entry =
      selected.entry;

    const resolverLane =
      selected.lane;
    if (
      output.requestsUsed >=
        resolverRequestLimit ||
      !budgetAvailable(
        budget,
        "discovery-live"
      )
    ) {
      break;
    }

    const poolId =
      normalize(
        entry.poolId
      );

    const cursor =
      safeNumber(
        entry.searchCursorBlock
      );

    if (
      !poolId ||
      cursor <= 0 ||
      state.poolRegistry?.[
        poolId
      ]
    ) {
      continue;
    }

    const to =
      BigInt(
        cursor
      );

    const priorAttempts =
      safeNumber(
        entry.attempts
      );

    const desiredChunkBlocks =
      Math.min(
        UNKNOWN_POOL_SEARCH_MAX_CHUNK_BLOCKS,
        UNKNOWN_POOL_SEARCH_CHUNK_BLOCKS *
          (
            priorAttempts <= 0
              ? 1
              : priorAttempts === 1
                ? 2
                : 4
          )
      );

    output.attempted++;

    const result =
      await getInitializeForPoolRange(
        env,
        state,
        poolId,
        cursor,
        desiredChunkBlocks,
        budget,
        exactPoolGrowthProbedProviders,
        Math.max(
          0,
          resolverRequestLimit -
          output.requestsUsed
        )
      );

    output.requestsUsed +=
      safeNumber(
        result.externalRequestsUsed
      );

    output.searchedBlocks +=
      safeNumber(
        result.requestedBlocks
      );

    entry.attempts =
      safeNumber(
        entry.attempts
      ) + 1;

    entry.lastAttemptAt =
      Date.now();

    entry.searchedBlocks =
      safeNumber(
        entry.searchedBlocks
      ) +
      safeNumber(
        result.requestedBlocks
      );

    entry.lastError =
      result.error ||
      null;

    if (
      !result.error &&
      safeNumber(
        result.requestedBlocks
      ) > 0
    ) {
      entry.lastSuccessfulSearchAt =
        Date.now();

      entry.consecutiveEmptySearches =
        safeNumber(
          entry.consecutiveEmptySearches
        ) + 1;
    }

    let resolvedPool =
      null;

    for (
      const log
      of result.logs
    ) {
      const pool =
        decodeInitialize(
          log
        );

      if (
        pool &&
        normalize(
          pool.poolId
        ) ===
          poolId
      ) {
        resolvedPool =
          pool;
        break;
      }
    }

    output.probes.push({
      poolId,
      resolverLane,
      activityScore:
        activityScore(
          entry
        ),
      swapEvents:
        safeNumber(
          entry.swapEvents
        ),
      liquidityEvents:
        safeNumber(
          entry.liquidityEvents
        ),
      appearances:
        safeNumber(
          entry.appearances
        ),
      fromBlock:
        result.fromBlock,
      toBlock:
        result.toBlock,
      requestedBlocks:
        safeNumber(
          result.requestedBlocks
        ),
      desiredChunkBlocks,
      adaptiveChunkBlocks:
        safeNumber(
          result.providerSafeChunkBlocks
        ),
      providerSafeChunkBlocks:
        safeNumber(
          result.providerSafeChunkBlocks
        ),
      publicProvenChunkBlocks:
        safeNumber(
          result.publicProvenChunkBlocks
        ),
      alchemyProvenChunkBlocks:
        safeNumber(
          result.alchemyProvenChunkBlocks
        ),
      publicGenericSafeBlocks:
        safeNumber(
          result.publicGenericSafeBlocks
        ),
      alchemyGenericSafeBlocks:
        safeNumber(
          result.alchemyGenericSafeBlocks
        ),
      growthProbeAttempted:
        Boolean(
          result.growthProbeAttempted
        ),
      growthProbeSucceeded:
        Boolean(
          result.growthProbeSucceeded
        ),
      growthProbeBlocks:
        result.growthProbeBlocks ??
        null,
      exactRangeFallbackUsed:
        Boolean(
          result.exactRangeFallbackUsed
        ),
      externalRequestsUsed:
        safeNumber(
          result.externalRequestsUsed
        ),
      learningStatePath:
        result.learningStatePath ||
        null,
      priorAttempts,
      searchDistanceFromFirstActivity:
        unknownPoolSearchDistance(
          entry
        ),
      launchProximityScore:
        unknownPoolLaunchProximityScore(
          entry
        ),
      deepSearchAllowedNow:
        unknownPoolDeepSearchAllowedNow(
          state,
          entry
        ),
      retryBackoffMs:
        unknownPoolRetryBackoffMs(
          entry
        ),
      consecutiveEmptySearches:
        safeNumber(
          entry.consecutiveEmptySearches
        ),
      provider:
        result.provider,
      logs:
        result.logs.length,
      resolved:
        Boolean(
          resolvedPool
        ),
      error:
        result.error
    });

    if (
      resolvedPool
    ) {
      entry.lastResolvedSearchDistance =
        unknownPoolSearchDistance(
          entry
        );

      entry.consecutiveEmptySearches =
        0;

      registerPoolMapping(
        state,
        resolvedPool
      );

      for (
        const address
        of [
          resolvedPool
            .currency0,
          resolvedPool
            .currency1
        ]
      ) {
        if (
          !isAddress(
            address
          ) ||
          address ===
            ZERO ||
          knownQuote(
            address
          )
        ) {
          continue;
        }

        addWatch(
          state,
          address,
          resolvedPool,
          "V100_UNKNOWN_POOL_RESOLUTION"
        );
      }

      delete tracker[
        poolId
      ];

      output.resolved++;
      output
        .resolvedPoolIds
        .push(
          poolId
        );

      continue;
    }

    /*
     * Do not advance after a provider error. Successful empty ranges
     * advance by the complete adaptive window and continue next run.
     */
    if (
      !result.error &&
      result.fromBlock !== null &&
      result.fromBlock !== undefined
    ) {
      entry.searchCursorBlock =
        result.fromBlock > 0
          ? result.fromBlock - 1
          : 0;
    }
  }

  output.trackerCount =
    Object.keys(
      ensureUnknownPoolState(
        state
      )
    ).length;

  output.capabilityProbesThisRun =
    Array.from(
      exactPoolGrowthProbedProviders
    );

  output.hardRequestLimitRespected =
    output.requestsUsed <=
    UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN;

  output.dynamicRequestLimitRespected =
    output.requestsUsed <=
    resolverRequestLimit;

  output.remainingResolverRequests =
    Math.max(
      0,
      resolverRequestLimit -
      output.requestsUsed
    );

  output.requestsReturnedToAnalysis =
    Math.max(
      0,
      UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN -
        resolverRequestLimit
    );

  return output;
}

/* =========================================================
   PRUNE
   ========================================================= */

function pruneState(
  state,
  trimWatchlist = true
) {
  const current =
    Date.now();

  prunePoolRegistry(
    state
  );

  pruneUnknownPools(
    state
  );

  state.watchedTokens =
    Array.isArray(
      state.watchedTokens
    )
      ? state.watchedTokens
      : [];

  state.watchedTokens =
    state.watchedTokens.filter(
      token => {
        const firstSeen =
          safeNumber(
            token.firstSeenAt
          );

        if (!firstSeen) {
          return true;
        }

        return (
          current -
            firstSeen <=
          WATCH_MAX_AGE
        );
      }
    );

  if (
    trimWatchlist
  ) {
    state.watchedTokens =
      state.watchedTokens.slice(
        0,
        MAX_WATCHED_TOKENS
      );
  }

  state.alerts =
    state.alerts &&
    typeof state.alerts ===
      "object"
      ? state.alerts
      : {};

  for (
    const [
      address,
      alert
    ]
    of Object.entries(
      state.alerts
    )
  ) {
    const timestamp =
      typeof alert ===
        "object"
        ? safeNumber(
            alert.timestamp
          )
        : safeNumber(
            alert
          );

    if (
      timestamp &&
      current -
        timestamp >
        ALERT_COOLDOWN
    ) {
      delete state.alerts[
        address
      ];
    }
  }

  state.snapshots =
    state.snapshots &&
    typeof state.snapshots ===
      "object"
      ? state.snapshots
      : {};

  for (
    const [
      address,
      snapshots
    ]
    of Object.entries(
      state.snapshots
    )
  ) {
    let list =
      Array.isArray(
        snapshots
      )
        ? snapshots
        : snapshots &&
          typeof snapshots ===
            "object"
          ? [
              snapshots
            ]
          : [];

    list =
      list
        .filter(
          snapshot => {
            const timestamp =
              safeNumber(
                snapshot.timestamp
              );

            return (
              timestamp &&
              current -
                timestamp <=
                SNAPSHOT_MAX_AGE
            );
          }
        )
        .slice(
          -MAX_SNAPSHOTS_PER_TOKEN
        );

    if (
      list.length
    ) {
      state.snapshots[
        address
      ] = list;
    }

    else {
      delete state.snapshots[
        address
      ];
    }
  }

  state.scheduler =
    state.scheduler &&
    typeof state.scheduler ===
      "object"
      ? state.scheduler
      : newState()
          .scheduler;

  discoveryService(
    state
  );
}

/* =========================================================
   WATCHLIST
   ========================================================= */

function findWatched(
  state,
  address
) {
  const key =
    normalize(
      address
    );

  return state.watchedTokens.find(
    token =>
      normalize(
        token.address
      ) ===
      key
  );
}

function addWatch(
  state,
  address,
  pool,
  source
) {
  address =
    normalize(
      address
    );

  if (
    !isAddress(
      address
    ) ||
    address ===
      ZERO ||
    knownQuote(
      address
    )
  ) {
    return {
      added:
        false,

      token:
        null
    };
  }

  let token =
    findWatched(
      state,
      address
    );

  let added =
    false;

  if (!token) {
    token = {
      address,

      firstSeenAt:
        Date.now(),

      lastSeenAt:
        Date.now(),

      lastLiveSeenAt:
        null,

      lastCheckedAt:
        null,

      checks:
        0,

      invalidChecks:
        0,

      lastValidationReason:
        null,

      excludedReason:
        null,

      pools:
        [],

      metadata:
        null,

      marketCache:
        null,

      discoverySource:
        source ||
        "UNKNOWN"
    };

    state.watchedTokens.push(
      token
    );

    added =
      true;
  }

  token.lastSeenAt =
    Date.now();

  if (
    source ===
    "LIVE"
  ) {
    token.discoverySource =
      "LIVE";

    token.lastLiveSeenAt =
      Date.now();
  }

  token.pools =
    Array.isArray(
      token.pools
    )
      ? token.pools
      : [];

  if (pool) {
    const exists =
      token.pools.some(
        existing =>
          normalize(
            existing.poolId
          ) ===
          normalize(
            pool.poolId
          )
      );

    if (!exists) {
      token.pools.push(
        pool
      );
    }
  }

  return {
    added,
    token
  };
}

/* =========================================================
   RPC
   ========================================================= */

async function rpcCall(
  url,
  method,
  params,
  budget,
  phase
) {
  if (
    !consumeBudget(
      budget,
      phase,
      `RPC:${method}`
    )
  ) {
    throw new Error(
      `REQUEST_BUDGET_EXHAUSTED_${String(
        phase
      )
        .toUpperCase()
        .replace(
          /-/g,
          "_"
        )}`
    );
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      4500
    );

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              jsonrpc:
                "2.0",

              id:
                Date.now(),

              method,

              params
            }),

          signal:
            controller.signal
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `HTTP_${response.status}`
      );
    }

    const body =
      await response.json();

    if (
      body.error
    ) {
      throw new Error(
        body.error.message ||
        "RPC_ERROR"
      );
    }

    return body.result;
  }

  finally {
    clearTimeout(
      timer
    );
  }
}

async function rpc(
  env,
  method,
  params,
  budget,
  phase
) {
  const alchemyUrl =
    env.ALCHEMY_API_KEY
      ? ALCHEMY_BASE +
        env.ALCHEMY_API_KEY
      : null;

  const providers =
    phase ===
      "analysis"
      ? [
          {
            name:
              "ALCHEMY",

            url:
              alchemyUrl
          },

          {
            name:
              "ROBINHOOD_PUBLIC_RPC",

            url:
              PUBLIC_RPC
          }
        ]
      : [
          {
            name:
              "ROBINHOOD_PUBLIC_RPC",

            url:
              PUBLIC_RPC
          },

          ...(
            alchemyUrl
              ? [
                  {
                    name:
                      "ALCHEMY",

                    url:
                      alchemyUrl
                  }
                ]
              : []
          )
        ];

  const errors =
    [];

  for (
    const provider
    of providers
  ) {
    if (
      !provider.url
    ) {
      continue;
    }

    if (
      !budgetAvailable(
        budget,
        phase
      )
    ) {
      break;
    }

    try {
      const result =
        await rpcCall(
          provider.url,
          method,
          params,
          budget,
          phase
        );

      return {
        result,

        provider:
          provider.name,

        error:
          null
      };
    }

    catch (error) {
      const message =
        errorString(
          error
        );

      errors.push(
        `${provider.name}: ${message}`
      );

      if (
        message.startsWith(
          "REQUEST_BUDGET_EXHAUSTED"
        )
      ) {
        break;
      }
    }
  }

  return {
    result:
      null,

    provider:
      null,

    error:
      errors.length
        ? errors.join(
            " | "
          )
        : "REQUEST_BUDGET_EXHAUSTED"
  };
}

async function latestBlock(
  env,
  budget
) {
  const response =
    await rpc(
      env,
      "eth_blockNumber",
      [],
      budget,
      "system"
    );

  if (
    !response.result
  ) {
    throw new Error(
      response.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return {
    block:
      BigInt(
        response.result
      ),

    provider:
      response.provider
  };
}

function isBeyondProviderHeadError(
  value
) {
  const text =
    String(
      value ||
      ""
    ).toLowerCase();

  return (
    text.includes(
      "beyond current head"
    ) ||
    text.includes(
      "extends beyond current head"
    ) ||
    (
      text.includes(
        "block range"
      ) &&
      text.includes(
        "head block"
      )
    )
  );
}

async function providerHeadBlock(
  env,
  budget,
  provider
) {
  const url =
    rpcProviderUrl(
      env,
      provider
    );

  if (!url) {
    return {
      block: null,
      provider,
      error:
        "PROVIDER_UNAVAILABLE"
    };
  }

  if (
    !budgetAvailable(
      budget,
      "system"
    )
  ) {
    return {
      block: null,
      provider,
      error:
        "SYSTEM_BUDGET_PROTECTED"
    };
  }

  try {
    const result =
      await rpcCall(
        url,
        "eth_blockNumber",
        [],
        budget,
        "system"
      );

    return {
      block:
        result
          ? BigInt(
              result
            )
          : null,
      provider,
      error:
        result
          ? null
          : "PROVIDER_HEAD_UNAVAILABLE"
    };
  }

  catch (error) {
    return {
      block: null,
      provider,
      error:
        errorString(
          error
        )
    };
  }
}

function rpcProviderUrl(
  env,
  provider
) {
  if (
    provider ===
    "ROBINHOOD_PUBLIC_RPC"
  ) {
    return PUBLIC_RPC;
  }

  if (
    provider ===
      "ALCHEMY" &&
    env.ALCHEMY_API_KEY
  ) {
    return (
      ALCHEMY_BASE +
      env.ALCHEMY_API_KEY
    );
  }

  return null;
}

async function getLogsSingleProvider(
  env,
  from,
  to,
  budget,
  phase,
  provider
) {
  const url =
    rpcProviderUrl(
      env,
      provider
    );

  if (!url) {
    return {
      result:
        null,

      provider,

      error:
        "PROVIDER_UNAVAILABLE"
    };
  }

  try {
    const result =
      await rpcCall(
        url,
        "eth_getLogs",

        [
          {
            fromBlock:
              "0x" +
              from.toString(
                16
              ),

            toBlock:
              "0x" +
              to.toString(
                16
              ),

            address:
              POOL_MANAGER
          }
        ],

        budget,
        phase
      );

    return {
      result,

      provider,

      error:
        null
    };
  }

  catch (error) {
    return {
      result:
        null,

      provider,

      error:
        errorString(
          error
        )
    };
  }
}

/* =========================================================
   LIVE SCAN
   ========================================================= */

async function scanLiveRange(
  env,
  state,
  from,
  to,
  budget,
  output
) {
  const service =
    discoveryService(
      state
    );

  let chunkSize =
    clamp(
      safeNumber(
        service.liveChunkBlocks
      ) ||
        LIVE_SAFE_CHUNK_DEFAULT,

      LIVE_SAFE_CHUNK_MIN,
      LIVE_SAFE_CHUNK_MAX
    );

  const requestedTo =
    to;

  let effectiveTo =
    to;

  let cursor =
    from;

  let processedThrough =
    null;

  let error =
    null;

  let providerHead =
    null;

  let providerHeadProvider =
    null;

  let providerHeadClamped =
    false;

  let providerHeadRefreshes =
    0;

  let providerHeadRetries =
    0;

  while (
    cursor <=
      effectiveTo &&
    budgetAvailable(
      budget,
      "discovery-live"
    )
  ) {
    let chunkTo =
      cursor +
      BigInt(
        chunkSize -
        1
      );

    if (
      chunkTo >
      effectiveTo
    ) {
      chunkTo =
        effectiveTo;
    }

    let provider =
      preferredDiscoveryProvider(
        env,
        state
      );

    if (!provider) {
      error =
        "DISCOVERY_PROVIDERS_COOLING_DOWN";

      break;
    }

    let response =
      await getLogsSingleProvider(
        env,
        cursor,
        chunkTo,
        budget,
        "discovery-live",
        provider
      );

    if (
      !Array.isArray(
        response.result
      ) &&
      isBeyondProviderHeadError(
        response.error
      )
    ) {
      const head =
        await providerHeadBlock(
          env,
          budget,
          provider
        );

      providerHeadRefreshes++;

      if (
        head.block !==
          null
      ) {
        providerHead =
          head.block;

        providerHeadProvider =
          provider;

        if (
          providerHead <
          effectiveTo
        ) {
          effectiveTo =
            providerHead;

          providerHeadClamped =
            true;
        }

        if (
          cursor <=
            effectiveTo &&
          budgetAvailable(
            budget,
            "discovery-live"
          )
        ) {
          chunkTo =
            cursor +
            BigInt(
              chunkSize -
              1
            );

          if (
            chunkTo >
            effectiveTo
          ) {
            chunkTo =
              effectiveTo;
          }

          response =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-live",
              provider
            );

          providerHeadRetries++;
        }

        else if (
          cursor >
          effectiveTo
        ) {
          processedThrough =
            effectiveTo;

          error =
            null;

          break;
        }
      }
    }

    if (
      !Array.isArray(
        response.result
      ) &&
      is429(
        response.error
      )
    ) {
      markDiscovery429(
        state,
        provider
      );

      const alternate =
        alternateDiscoveryProvider(
          env,
          state,
          provider
        );

      if (
        alternate &&
        budgetAvailable(
          budget,
          "discovery-live"
        )
      ) {
        provider =
          alternate;

        response =
          await getLogsSingleProvider(
            env,
            cursor,
            chunkTo,
            budget,
            "discovery-live",
            provider
          );

        if (
          !Array.isArray(
            response.result
          ) &&
          is429(
            response.error
          )
        ) {
          markDiscovery429(
            state,
            provider
          );
        }
      }
    }

    if (
      Array.isArray(
        response.result
      )
    ) {
      output.logs.push(
        ...response.result
      );

      output.ranges.push({
        fromBlock:
          Number(
            cursor
          ),

        toBlock:
          Number(
            chunkTo
          ),

        blocks:
          Number(
            chunkTo -
            cursor +
            1n
          ),

        logs:
          response.result.length,

        provider:
          response.provider,

        phase:
          "discovery-live",

        chunkSize
      });

      processedThrough =
        chunkTo;

      service.lastLiveSuccessAt =
        Date.now();

      service.lastLiveProvider =
        response.provider;

      service.liveChunkBlocks =
        chunkSize;

      cursor =
        chunkTo +
        1n;

      continue;
    }

    if (
      chunkSize >
      LIVE_SAFE_CHUNK_MIN &&
      !isBeyondProviderHeadError(
        response.error
      )
    ) {
      chunkSize =
        Math.max(
          LIVE_SAFE_CHUNK_MIN,

          Math.floor(
            chunkSize /
            2
          )
        );

      service.liveChunkBlocks =
        chunkSize;

      continue;
    }

    error =
      response.error ||
      "LIVE_GET_LOGS_FAILED";

    break;
  }

  const success =
    !error &&
    (
      processedThrough ===
        effectiveTo ||
      cursor >
        effectiveTo
    );

  return {
    success,

    processedThrough,

    nextBlock:
      processedThrough !==
        null
        ? processedThrough +
          1n
        : from,

    chunkSize,

    error,

    requestedTo,

    effectiveTo,

    providerHead,

    providerHeadProvider,

    providerHeadClamped,

    providerHeadRefreshes,

    providerHeadRetries
  };
}

/* =========================================================
   V88 BACKLOG SCAN
   ========================================================= */

async function scanBacklogSequential(
  env,
  state,
  start,
  targetLatest,
  budget,
  output
) {
  const startedAt =
    Date.now();

  let cursor =
    start;

  let processedThrough =
    null;

  let successfulChunks =
    0;

  let failedRequests =
    0;

  let providerSwitches =
    0;

  let probeAttempts =
    0;

  let blockedRepeatProbes =
    0;

  let error =
    null;

  const probeHistory =
    [];

  /*
   * V89:
   * A failed speculative range is blocked immediately for
   * the rest of this invocation even if legacy persisted
   * success-streak state is unexpectedly high.
   */
  const failedProbeKeys =
    new Set();

  /*
   * If a previously-proven range itself fails, shrink only
   * in memory. The smaller size becomes persistent ONLY
   * after it has actually succeeded.
   */
  const temporaryChunkOverrides =
    new Map();

  while (
    cursor <=
      targetLatest &&
    budgetAvailable(
      budget,
      "discovery-backlog"
    )
  ) {
    let provider =
      preferredDiscoveryProvider(
        env,
        state
      );

    if (!provider) {
      error =
        "DISCOVERY_PROVIDERS_COOLING_DOWN";

      break;
    }

    let provenSize =
      getProviderBacklogSize(
        state,
        provider
      );

    const temporaryOverride =
      temporaryChunkOverrides.get(
        provider
      );

    let chunkSize =
      temporaryOverride ||
      provenSize;

    const failedUpper =
      getProviderFailedUpperBound(
        state,
        provider
      );

    const streak =
      providerSuccessStreak(
        state,
        provider
      );

    /*
     * Conservative growth probing. A known failed upper
     * bound always wins. A failed size is never retried in
     * the same scan.
     */
    if (
      provider !==
        "ALCHEMY" &&
      !temporaryOverride &&
      streak >=
        BACKLOG_SUCCESS_PROBE_THRESHOLD
    ) {
      const proposed =
        Math.min(
          BACKLOG_MAX_CHUNK_BLOCKS,

          provenSize +
          BACKLOG_PROBE_INCREMENT
        );

      const probeKey =
        `${provider}:${proposed}`;

      const allowedByUpperBound =
        !failedUpper ||
        proposed <
          failedUpper;

      if (
        allowedByUpperBound &&
        !failedProbeKeys.has(
          probeKey
        )
      ) {
        chunkSize =
          proposed;

        probeAttempts++;
      }

      else if (
        !allowedByUpperBound ||
        failedProbeKeys.has(
          probeKey
        )
      ) {
        blockedRepeatProbes++;
      }
    }

    const remaining =
      Number(
        targetLatest -
        cursor +
        1n
      );

    chunkSize =
      Math.min(
        chunkSize,
        remaining
      );

    chunkSize =
      Math.max(
        1,
        chunkSize
      );

    let chunkTo =
      cursor +
      BigInt(
        chunkSize -
        1
      );

    if (
      chunkTo >
      targetLatest
    ) {
      chunkTo =
        targetLatest;
    }

    const beforeRequests =
      budget.discovery
        .backlogUsed;

    let response =
      await getLogsSingleProvider(
        env,
        cursor,
        chunkTo,
        budget,
        "discovery-backlog",
        provider
      );

    if (
      !Array.isArray(
        response.result
      )
    ) {
      failedRequests++;

      if (
        is429(
          response.error
        )
      ) {
        markDiscovery429(
          state,
          provider
        );

        const alternate =
          alternateDiscoveryProvider(
            env,
            state,
            provider
          );

        if (
          alternate &&
          budgetAvailable(
            budget,
            "discovery-backlog"
          )
        ) {
          providerSwitches++;

          provider =
            alternate;

          provenSize =
            getProviderBacklogSize(
              state,
              provider
            );

          const alternateOverride =
            temporaryChunkOverrides.get(
              provider
            );

          const alternateRemaining =
            Number(
              targetLatest -
              cursor +
              1n
            );

          const alternateSize =
            Math.min(
              alternateOverride ||
              provenSize,
              alternateRemaining
            );

          chunkTo =
            cursor +
            BigInt(
              alternateSize -
              1
            );

          response =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-backlog",
              provider
            );

          if (
            !Array.isArray(
              response.result
            )
          ) {
            failedRequests++;

            if (
              is429(
                response.error
              )
            ) {
              markDiscovery429(
                state,
                provider
              );
            }
          }
        }
      }
    }

    const requestsUsed =
      budget.discovery
        .backlogUsed -
      beforeRequests;

    const actualBlocks =
      Number(
        chunkTo -
        cursor +
        1n
      );

    if (
      Array.isArray(
        response.result
      )
    ) {
      output.logs.push(
        ...response.result
      );

      output.ranges.push({
        fromBlock:
          Number(
            cursor
          ),

        toBlock:
          Number(
            chunkTo
          ),

        blocks:
          actualBlocks,

        logs:
          response.result.length,

        provider:
          response.provider,

        phase:
          "discovery-backlog",

        strategy:
          "V96_PROTECTED_ACCELERATED_PROVEN_RANGE"
      });

      probeHistory.push({
        fromBlock:
          Number(
            cursor
          ),

        toBlock:
          Number(
            chunkTo
          ),

        requestedBlocks:
          actualBlocks,

        provider:
          response.provider,

        requestsUsed,

        success:
          true,

        logs:
          response.result.length,

        learned:
          true
      });

      /*
       * Persist only an actually successful size.
       */
      setProviderSuccessfulBacklogSize(
        state,
        response.provider,
        actualBlocks
      );

      temporaryChunkOverrides.delete(
        response.provider
      );

      processedThrough =
        chunkTo;

      successfulChunks++;

      cursor =
        chunkTo +
        1n;

      continue;
    }

    probeHistory.push({
      fromBlock:
        Number(
          cursor
        ),

      toBlock:
        Number(
          chunkTo
        ),

      requestedBlocks:
        actualBlocks,

      provider:
        response.provider ||
        provider,

      requestsUsed,

      success:
        false,

      error:
        response.error
    });

    const lastProven =
      getProviderBacklogSize(
        state,
        provider
      );

    if (
      is400(
        response.error
      )
    ) {
      setProviderFailedUpperBound(
        state,
        provider,
        actualBlocks
      );

      failedProbeKeys.add(
        `${provider}:${actualBlocks}`
      );

      /*
       * Failed speculative growth: immediately return to
       * the proven size and continue using the remaining
       * request budget. This is the V88 -> V89 core fix.
       */
      if (
        actualBlocks >
        lastProven
      ) {
        temporaryChunkOverrides.delete(
          provider
        );

        continue;
      }

      /*
       * A proven size unexpectedly failed. Test a smaller
       * temporary size without persisting it yet.
       */
      if (
        lastProven >
        BACKLOG_MIN_CHUNK_BLOCKS
      ) {
        const reduced =
          Math.max(
            BACKLOG_MIN_CHUNK_BLOCKS,

            Math.floor(
              lastProven /
              2
            )
          );

        temporaryChunkOverrides.set(
          provider,
          reduced
        );

        continue;
      }
    }

    if (
      discoveryProviderCooling(
        state,
        "ROBINHOOD_PUBLIC_RPC"
      ) &&
      (
        !env.ALCHEMY_API_KEY ||
        discoveryProviderCooling(
          state,
          "ALCHEMY"
        )
      )
    ) {
      error =
        "DISCOVERY_RPC_COOLDOWN";

      break;
    }

    error =
      response.error ||
      "BACKLOG_REQUEST_FAILED";

    break;
  }

  const blocksProcessed =
    processedThrough !==
      null
      ? Number(
          processedThrough -
          start +
          1n
        )
      : 0;

  const durationMs =
    Date.now() -
    startedAt;

  const service =
    discoveryService(
      state
    );

  return {
    success:
      blocksProcessed >
      0,

    complete:
      cursor >
      targetLatest,

    processedThrough,

    nextBlock:
      cursor <=
        targetLatest
        ? cursor
        : null,

    publicLearnedChunk:
      service
        .publicBacklogChunkBlocks,

    alchemyLearnedChunk:
      service
        .alchemyBacklogChunkBlocks,

    publicFailedUpperBound:
      service
        .publicBacklogFailedUpperBound,

    alchemyFailedUpperBound:
      service
        .alchemyBacklogFailedUpperBound,

    successfulChunks,

    failedRequests,

    providerSwitches,

    probeAttempts,

    blockedRepeatProbes,

    blocksProcessed,

    durationMs,

    blocksPerSecond:
      durationMs >
      0
        ? (
            blocksProcessed /
            durationMs
          ) *
          1000
        : 0,

    probeHistory,

    error
  };
}

/* =========================================================
   V98 TARGETED INITIALIZE LOOKBACK
   ========================================================= */

async function getInitializeLookback(
  env,
  state,
  from,
  to,
  budget
) {
  if (from > to || !budgetAvailable(budget, "discovery-live")) {
    return { logs: [], provider: null, error: null };
  }

  const preferred = ["ROBINHOOD_PUBLIC_RPC", "ALCHEMY"];

  for (const provider of preferred) {
    if (discoveryProviderCooling(state, provider)) continue;

    const url = rpcProviderUrl(env, provider);
    if (!url) continue;

    try {
      const logs = await rpcCall(
        url,
        "eth_getLogs",
        [{
          fromBlock: "0x" + from.toString(16),
          toBlock: "0x" + to.toString(16),
          address: POOL_MANAGER,
          topics: [INITIALIZE_TOPIC]
        }],
        budget,
        "discovery-live"
      );

      return {
        logs: Array.isArray(logs) ? logs : [],
        provider,
        error: null
      };
    } catch (error) {
      const message = String(error?.message || error);
      if (message.includes("429")) {
        /* provider cooldown is already handled by the normal discovery path */
      }
    }
  }

  return { logs: [], provider: null, error: "LOOKBACK_UNAVAILABLE" };
}

/* =========================================================
   V4 DECODING
   ========================================================= */

function decodeInitialize(
  log
) {
  if (
    normalize(
      log?.topics?.[0]
    ) !==
    INITIALIZE_TOPIC
  ) {
    return null;
  }

  if (
    !Array.isArray(
      log.topics
    ) ||
    log.topics.length <
      4
  ) {
    return null;
  }

  const currency0 =
    topicAddress(
      log.topics[2]
    );

  const currency1 =
    topicAddress(
      log.topics[3]
    );

  if (
    !currency0 ||
    !currency1
  ) {
    return null;
  }

  return {
    poolId:
      normalize(
        log.topics[1]
      ),

    currency0,

    currency1,

    blockNumber:
      log.blockNumber,

    transactionHash:
      log.transactionHash
  };
}

function processDiscoveryLogs(
  state,
  logs,
  source
) {
  const newTokens =
    new Set();

  const seenTokens =
    new Set();

  let initializeEvents =
    0;

  let swapTopicMatches =
    0;

  let liquidityTopicMatches =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swapTopicMatches++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityTopicMatches++;
    }

    const pool =
      decodeInitialize(
        log
      );

    if (!pool) {
      continue;
    }

    initializeEvents++;

    registerPoolMapping(
      state,
      pool
    );

    for (
      const address
      of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        !isAddress(
          address
        ) ||
        address ===
          ZERO ||
        knownQuote(
          address
        )
      ) {
        continue;
      }

      const result =
        addWatch(
          state,
          address,
          pool,
          source
        );

      if (
        result.token
      ) {
        seenTokens.add(
          normalize(
            address
          )
        );
      }

      if (
        result.added
      ) {
        newTokens.add(
          normalize(
            address
          )
        );
      }
    }
  }

  return {
    rawLogs:
      logs.length,

    initializeEvents,

    swapTopicMatches,

    liquidityTopicMatches,

    newTokens,

    seenTokens
  };
}

/* =========================================================
   LIVE POOL ACTIVITY
   ========================================================= */

function activeTokensFromLogs(
  state,
  logs
) {
  const poolToTokens =
    new Map();

  for (
    const watched
    of state.watchedTokens
  ) {
    const address =
      normalize(
        watched.address
      );

    if (
      !isAddress(
        address
      ) ||
      knownQuote(
        address
      )
    ) {
      continue;
    }

    for (
      const pool
      of watched.pools ||
      []
    ) {
      const poolId =
        normalize(
          pool.poolId
        );

      if (!poolId) {
        continue;
      }

      if (
        !poolToTokens.has(
          poolId
        )
      ) {
        poolToTokens.set(
          poolId,
          new Set()
        );
      }

      poolToTokens
        .get(
          poolId
        )
        .add(
          address
        );
    }
  }

  /*
   * V91: merge persistent pool registry mappings. This lets a
   * token become live-active again even if it previously fell
   * outside the 50-token watchlist.
   */
  for (
    const entry
    of Object.values(
      state.poolRegistry || {}
    )
  ) {
    const poolId =
      normalize(
        entry?.poolId
      );

    if (!poolId) {
      continue;
    }

    if (
      !poolToTokens.has(
        poolId
      )
    ) {
      poolToTokens.set(
        poolId,
        new Set()
      );
    }

    for (
      const address
      of entry.tokens || []
    ) {
      if (
        isAddress(address) &&
        !knownQuote(address)
      ) {
        poolToTokens
          .get(poolId)
          .add(
            normalize(address)
          );
      }
    }
  }

  const active =
    new Set();

  const unknownPoolIds =
    new Set();

  let swapEvents =
    0;

  let liquidityEvents =
    0;

  let unknownSwapEvents =
    0;

  let unknownLiquidityEvents =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    if (
      topic0 !==
        SWAP_TOPIC &&
      topic0 !==
        MODIFY_LIQUIDITY_TOPIC
    ) {
      continue;
    }

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    const tokens =
      poolToTokens.get(
        poolId
      );

    if (!tokens) {
      if (poolId) {
        unknownPoolIds.add(
          poolId
        );
      }

      if (
        topic0 ===
        SWAP_TOPIC
      ) {
        unknownSwapEvents++;
      }

      if (
        topic0 ===
        MODIFY_LIQUIDITY_TOPIC
      ) {
        unknownLiquidityEvents++;
      }

      continue;
    }

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swapEvents++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityEvents++;
    }

    for (
      const address
      of tokens
    ) {
      active.add(
        address
      );

      let watched =
        findWatched(
          state,
          address
        );

      if (!watched) {
        const registryPool =
          state.poolRegistry
            ?.[poolId] ||
          null;

        if (registryPool) {
          watched =
            addWatch(
              state,
              address,
              registryPool,
              "LIVE_REGISTRY_REACTIVATION"
            ).token;
        }
      }

      if (watched) {
        watched.lastLiveSeenAt =
          Date.now();
      }
    }
  }

  return {
    tokens:
      active,

    swapEvents,

    liquidityEvents,

    unknownPoolIds,

    unknownSwapEvents,

    unknownLiquidityEvents
  };
}


function onChainPoolIdentityV153(
  watched
) {
  const token =
    normalize(
      watched?.address
    );

  if (
    !isAddress(token) ||
    token === ZERO ||
    knownQuote(token)
  ) {
    return {
      verified: false,
      status: "TOKEN_NOT_ELIGIBLE"
    };
  }

  const pools =
    Array.isArray(watched?.pools)
      ? watched.pools
      : [];

  const matches = [];

  for (const pool of pools) {
    const poolId =
      normalize(pool?.poolId);

    const currency0 =
      normalize(pool?.currency0);

    const currency1 =
      normalize(pool?.currency1);

    if (
      !/^0x[0-9a-f]{64}$/.test(
        String(poolId || "")
      ) ||
      !isAddress(currency0) ||
      !isAddress(currency1)
    ) {
      continue;
    }

    const tokenIs0 =
      currency0 === token;

    const tokenIs1 =
      currency1 === token;

    if (!tokenIs0 && !tokenIs1) {
      continue;
    }

    const quoteToken =
      tokenIs0
        ? currency1
        : currency0;

    const quoteVerified =
      quoteToken === ZERO ||
      knownQuote(quoteToken);

    if (!quoteVerified) {
      continue;
    }

    matches.push({
      verified: true,
      status:
        "ONCHAIN_V4_POOL_IDENTITY_VERIFIED",
      source:
        "UNISWAP_V4_INITIALIZE_POOL_ID",
      poolId,
      pairAddress: poolId,
      candidateAddress: token,
      quoteTokenAddress: quoteToken,
      nativeQuote:
        quoteToken === ZERO,
      /*
       * For candidate/known-quote Gecko V4 pools the candidate is represented
       * as the base asset. This is only asserted for deterministic quote pools.
       */
      targetTokenSide: "BASE",
      blockNumber:
        pool?.blockNumber || null,
      transactionHash:
        pool?.transactionHash || null
    });
  }

  if (!matches.length) {
    return {
      verified: false,
      status:
        "NO_KNOWN_QUOTE_V4_POOL"
    };
  }

  matches.sort(
    (a, b) =>
      safeNumber(b?.blockNumber) -
      safeNumber(a?.blockNumber)
  );

  return matches[0];
}

function activityForToken(
  watched,
  logs
) {
  const poolIds =
    new Set(
      (
        watched.pools ||
        []
      )
        .map(
          pool =>
            normalize(
              pool.poolId
            )
        )
        .filter(
          Boolean
        )
    );

  let swaps =
    0;

  let liquidityEvents =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    if (
      !poolIds.has(
        poolId
      )
    ) {
      continue;
    }

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swaps++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityEvents++;
    }
  }

  return {
    swaps,

    liquidityEvents,

    poolSpecific:
      poolIds.size >
      0
  };
}

/* =========================================================
   ERC20
   ========================================================= */

async function ethCall(
  env,
  token,
  data,
  budget
) {
  const response =
    await rpc(
      env,
      "eth_call",

      [
        {
          to:
            token,

          data
        },

        "latest"
      ],

      budget,
      "analysis"
    );

  if (
    !response.result
  ) {
    throw new Error(
      response.error ||
      "ETH_CALL_FAILED"
    );
  }

  return response.result;
}

function decodeUint(hex) {
  try {
    return BigInt(
      hex
    );
  }

  catch {
    return null;
  }
}

function decodeBytes32String(
  hex
) {
  try {
    const raw =
      String(
        hex || ""
      ).replace(
        /^0x/,
        ""
      );

    if (
      raw.length !==
      64
    ) {
      return null;
    }

    const bytes =
      new Uint8Array(
        (
          raw.match(
            /.{2}/g
          ) || []
        ).map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    return (
      new TextDecoder()
        .decode(
          bytes
        )
        .replace(
          /\0/g,
          ""
        )
        .trim() ||
      null
    );
  }

  catch {
    return null;
  }
}

function decodeString(hex) {
  try {
    const raw =
      String(
        hex || ""
      ).replace(
        /^0x/,
        ""
      );

    if (!raw) {
      return null;
    }

    if (
      raw.length ===
      64
    ) {
      return decodeBytes32String(
        "0x" +
        raw
      );
    }

    if (
      raw.length <
      128
    ) {
      return null;
    }

    const offset =
      Number(
        BigInt(
          "0x" +
          raw.slice(
            0,
            64
          )
        )
      ) * 2;

    if (
      offset < 0 ||
      offset + 64 >
        raw.length
    ) {
      return null;
    }

    const length =
      Number(
        BigInt(
          "0x" +
          raw.slice(
            offset,
            offset + 64
          )
        )
      );

    if (
      length <= 0 ||
      length >
        1024
    ) {
      return null;
    }

    const data =
      raw.slice(
        offset + 64,
        offset +
          64 +
          length * 2
      );

    const bytes =
      new Uint8Array(
        (
          data.match(
            /.{2}/g
          ) || []
        ).map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    return (
      new TextDecoder()
        .decode(
          bytes
        )
        .replace(
          /\0/g,
          ""
        )
        .trim() ||
      null
    );
  }

  catch {
    return null;
  }
}

function reusableMetadata(
  watched
) {
  const metadata =
    watched?.metadata;

  if (
    !metadata ||
    !metadata.validERC20
  ) {
    return null;
  }

  const verifiedAt =
    safeNumber(
      metadata.verifiedAt
    );

  if (
    !verifiedAt ||
    Date.now() -
      verifiedAt >
      METADATA_REUSE_MS
  ) {
    return null;
  }

  return {
    ...metadata,

    reused:
      true
  };
}

function estimatedAnalysisCost(
  env,
  watched
) {
  if (
    watched
      ?.excludedReason
  ) {
    return 1;
  }

  if (
    reusableMetadata(
      watched
    )
  ) {
    return CACHED_ANALYSIS_COST;
  }

  return env.ALCHEMY_API_KEY
    ? FRESH_ANALYSIS_COST_ALCHEMY
    : FRESH_ANALYSIS_COST_FALLBACK;
}

async function verifyERC20(
  env,
  address,
  budget,
  watched
) {
  const cached =
    reusableMetadata(
      watched
    );

  if (cached) {
    return cached;
  }

  if (
    !budgetAvailable(
      budget,
      "analysis",
      5
    )
  ) {
    return {
      validERC20:
        false,

      deferred:
        true,

      reason:
        "ANALYSIS_BUDGET_PROTECTED",

      requiredRequests:
        5
    };
  }

  const code =
    await rpc(
      env,
      "eth_getCode",

      [
        address,
        "latest"
      ],

      budget,
      "analysis"
    );

  if (
    !code.result ||
    code.result ===
      "0x" ||
    code.result ===
      "0x0"
  ) {
    return {
      validERC20:
        false,

      deferred:
        false,

      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  let name =
    null;

  let symbol =
    null;

  let decimals =
    null;

  let totalSupply =
    null;

  try {
    name =
      decodeString(
        await ethCall(
          env,
          address,
          "0x06fdde03",
          budget
        )
      );
  }

  catch {}

  try {
    symbol =
      decodeString(
        await ethCall(
          env,
          address,
          "0x95d89b41",
          budget
        )
      );
  }

  catch {}

  try {
    const value =
      decodeUint(
        await ethCall(
          env,
          address,
          "0x313ce567",
          budget
        )
      );

    if (
      value !==
      null
    ) {
      decimals =
        Number(
          value
        );
    }
  }

  catch {}

  try {
    totalSupply =
      decodeUint(
        await ethCall(
          env,
          address,
          "0x18160ddd",
          budget
        )
      );
  }

  catch {}

  const score =
    (
      name
        ? 1
        : 0
    ) +
    (
      symbol
        ? 1
        : 0
    ) +
    (
      Number.isFinite(
        decimals
      )
        ? 1
        : 0
    ) +
    (
      totalSupply !==
        null &&
      totalSupply >
        0n
        ? 1
        : 0
    );

  if (
    score <
    3
  ) {
    return {
      validERC20:
        false,

      deferred:
        false,

      reason:
        "ERC20_METHODS_NOT_VERIFIED",

      name,

      symbol,

      decimals,

      totalSupply:
        totalSupply !==
          null
          ? totalSupply.toString()
          : null
    };
  }

  return {
    validERC20:
      true,

    deferred:
      false,

    reason:
      "VERIFIED",

    address,

    name,

    symbol,

    decimals,

    totalSupply:
      totalSupply !==
        null
        ? totalSupply.toString()
        : null,

    verifiedAt:
      Date.now(),

    reused:
      false
  };
}

/* =========================================================
   DEXSCREENER
   ========================================================= */

function cachedMarket(
  watched,
  maxAge
) {
  const cache =
    watched?.marketCache;

  if (
    !cache ||
    typeof cache !==
      "object"
  ) {
    return null;
  }

  const timestamp =
    safeNumber(
      cache.timestamp
    );

  if (!timestamp) {
    return null;
  }

  const age =
    Date.now() -
    timestamp;

  if (
    !cache.data ||
    typeof cache.data !==
      "object"
  ) {
    return null;
  }

  /*
   * V96 NEGATIVE-CACHE PROTECTION
   *
   * A verified pair may use the caller's normal cache TTL.
   * An unverified/NO_MARKET_FOUND result gets only a short TTL so
   * DexScreener indexing delay cannot suppress a new token for 9m.
   */
  const effectiveMaxAge =
    cache.data?.verified === true
      ? maxAge
      : Math.min(
          maxAge,
          MARKET_NEGATIVE_CACHE_MS
        );

  if (
    age < 0 ||
    age >
      effectiveMaxAge
  ) {
    return null;
  }

  return {
    ...cache.data,

    cached:
      true,

    cacheAgeMs:
      age
  };
}

function saveMarketCache(
  watched,
  data
) {
  if (!watched) {
    return;
  }

  if (
    data?.status ===
      "HTTP_429" ||
    data?.status ===
      "DEXSCREENER_COOLDOWN"
  ) {
    return;
  }

  watched.marketCache = {
    timestamp:
      Date.now(),

    data: {
      ...data,

      cached:
        false,

      cacheAgeMs:
        0
    }
  };
}

function dexService(state) {
  state.services =
    state.services ||
    {};

  state.services.dexscreener =
    state.services.dexscreener ||
    {
      cooldownUntil:
        null,

      last429At:
        null,

      lastSuccessAt:
        null,

      lastStatus:
        null,

      total429s:
        0,

      consecutive429s:
        0,

      lastBackoffMs:
        0,

      lastRequestAt:
        null
    };

  state.services.dexscreener.consecutive429s =
    safeNumber(
      state.services.dexscreener.consecutive429s
    );

  state.services.dexscreener.lastBackoffMs =
    safeNumber(
      state.services.dexscreener.lastBackoffMs
    );

  const reservation =
    state.services.dexscreener.priorityFreshReservation;

  if (
    !reservation ||
    typeof reservation !== "object"
  ) {
    state.services.dexscreener.priorityFreshReservation = {
      address: null,
      reservedAt: null,
      eligibleAt: null,
      lastServedAt: null,
      attempts: 0
    };
  }

  return state.services.dexscreener;
}


function registerDex429V147(
  service
) {
  const now =
    Date.now();

  const previous429At =
    safeNumber(
      service.last429At
    );

  let level =
    safeNumber(
      service.consecutive429s
    );

  if (
    previous429At &&
    now - previous429At <=
      DEXSCREENER_429_CHAIN_WINDOW_MS_V147
  ) {
    level =
      Math.min(
        3,
        Math.max(
          1,
          level + 1
        )
      );
  }

  else {
    level = 1;
  }

  const backoffMs =
    Math.min(
      DEXSCREENER_MAX_429_COOLDOWN_MS_V147,
      DEXSCREENER_429_COOLDOWN_MS *
        Math.pow(
          2,
          Math.max(
            0,
            level - 1
          )
        )
    );

  service.consecutive429s =
    level;
  service.last429At =
    now;
  service.cooldownUntil =
    now + backoffMs;
  service.lastBackoffMs =
    backoffMs;
  service.lastStatus =
    "HTTP_429";
  service.total429s =
    safeNumber(
      service.total429s
    ) + 1;

  return backoffMs;
}

function registerDexSuccessV147(
  service,
  status = "VERIFIED"
) {
  service.cooldownUntil =
    null;
  service.lastSuccessAt =
    Date.now();
  service.lastStatus =
    status;

  service.consecutive429s =
    Math.max(
      0,
      safeNumber(
        service.consecutive429s
      ) - 1
    );

  if (
    service.consecutive429s === 0
  ) {
    service.lastBackoffMs =
      0;
  }
}

function marketProviderAvailabilityV147(
  state,
  address = null
) {
  const dex =
    dexService(
      state
    );
  const now =
    Date.now();

  const dexCooldownUntil =
    safeNumber(
      dex.cooldownUntil
    );

  const dexSpacingAt =
    safeNumber(
      dex.lastRequestAt
    )
      ? safeNumber(
          dex.lastRequestAt
        ) +
        DEXSCREENER_MIN_FRESH_INTERVAL_MS
      : now;

  const dexEligibleAt =
    Math.max(
      now,
      dexCooldownUntil || 0,
      dexSpacingAt || 0
    );

  const gecko =
    geckoFreshEligibility(
      state
    );

  const geckoEligibleAt =
    safeNumber(
      gecko.eligibleAt
    ) || now;

  const dexEligible =
    dexEligibleAt <= now;

  const geckoEligible =
    gecko.eligible === true;

  const bothUnavailable =
    !dexEligible &&
    !geckoEligible;

  const earliestEligibleAt =
    bothUnavailable
      ? Math.min(
          dexEligibleAt,
          geckoEligibleAt
        )
      : now;

  return {
    address:
      normalize(
        address
      ) || null,

    dex: {
      eligible:
        dexEligible,
      eligibleAt:
        dexEligibleAt,
      cooldownUntil:
        dexCooldownUntil || null,
      consecutive429s:
        safeNumber(
          dex.consecutive429s
        ),
      lastBackoffMs:
        safeNumber(
          dex.lastBackoffMs
        )
    },

    gecko: {
      eligible:
        geckoEligible,
      reason:
        gecko.reason || null,
      eligibleAt:
        geckoEligibleAt,
      cooldownUntil:
        gecko.reason ===
          "GECKOTERMINAL_COOLDOWN"
          ? geckoEligibleAt
          : null
    },

    bothUnavailable,

    earliestEligibleAt:
      earliestEligibleAt || now,

    retryAfterMs:
      bothUnavailable
        ? Math.max(
            0,
            earliestEligibleAt - now
          )
        : 0
  };
}

function priorityFreshSchedule(
  state,
  address = null
) {
  const service = dexService(state);
  const reservation =
    service.priorityFreshReservation || {};
  const lastRequestAt =
    safeNumber(service.lastRequestAt);
  const cooldownUntil =
    safeNumber(service.cooldownUntil);
  const intervalEligibleAt =
    lastRequestAt
      ? lastRequestAt + DEXSCREENER_MIN_FRESH_INTERVAL_MS
      : Date.now();
  const eligibleAt =
    Math.max(
      intervalEligibleAt,
      cooldownUntil || 0
    );
  const retryAfterMs =
    Math.max(0, eligibleAt - Date.now());

  return {
    enabled: true,
    address:
      normalize(address) ||
      normalize(reservation.address) ||
      null,
    reserved: Boolean(reservation.address),
    reservedAt:
      safeNumber(reservation.reservedAt) || null,
    eligibleAt:
      eligibleAt || null,
    retryAfterMs,
    cooldownUntil:
      cooldownUntil || null,
    lastRequestAt:
      lastRequestAt || null
  };
}

function reservePriorityFreshMarket(
  state,
  address
) {
  const normalized = normalize(address);
  const service = dexService(state);
  const reservation =
    service.priorityFreshReservation || {};

  if (!normalized) {
    service.priorityFreshReservation = {
      address: null,
      reservedAt: null,
      eligibleAt: null,
      lastServedAt:
        safeNumber(reservation.lastServedAt) || null,
      attempts:
        safeNumber(reservation.attempts)
    };
    return;
  }

  const sameAddress =
    normalize(reservation.address) === normalized;
  const firstReservedAt =
    sameAddress && safeNumber(reservation.reservedAt)
      ? safeNumber(reservation.reservedAt)
      : Date.now();

  if (
    Date.now() - firstReservedAt >
    PRIORITY_FRESH_RESERVATION_MAX_AGE_MS
  ) {
    service.priorityFreshReservation = {
      address: normalized,
      reservedAt: Date.now(),
      eligibleAt:
        safeNumber(service.lastRequestAt)
          ? safeNumber(service.lastRequestAt) + DEXSCREENER_MIN_FRESH_INTERVAL_MS
          : Date.now(),
      lastServedAt:
        safeNumber(reservation.lastServedAt) || null,
      attempts: 0
    };
    return;
  }

  service.priorityFreshReservation = {
    address: normalized,
    reservedAt: firstReservedAt,
    eligibleAt:
      safeNumber(service.lastRequestAt)
        ? safeNumber(service.lastRequestAt) + DEXSCREENER_MIN_FRESH_INTERVAL_MS
        : Date.now(),
    lastServedAt:
      safeNumber(reservation.lastServedAt) || null,
    attempts:
      safeNumber(reservation.attempts)
  };
}

function clearPriorityFreshReservation(
  state,
  address
) {
  const service = dexService(state);
  const reservation =
    service.priorityFreshReservation || {};

  if (
    !address ||
    normalize(reservation.address) === normalize(address)
  ) {
    service.priorityFreshReservation = {
      address: null,
      reservedAt: null,
      eligibleAt: null,
      lastServedAt:
        safeNumber(reservation.lastServedAt) || Date.now(),
      attempts:
        safeNumber(reservation.attempts)
    };
  }
}


/* =========================================================
   V117 GECKOTERMINAL MARKET FALLBACK
   ========================================================= */

function geckoService(
  state
) {
  state.services =
    state.services ||
    {};

  state.services.geckoterminal =
    state.services.geckoterminal &&
    typeof state.services.geckoterminal ===
      "object"
      ? state.services.geckoterminal
      : {
          cooldownUntil:
            null,
          last429At:
            null,
          lastSuccessAt:
            null,
          lastStatus:
            null,
          total429s:
            0,
          totalRequests:
            0,
          lastRequestAt:
            null
        };

  const service =
    state.services.geckoterminal;

  service.consecutive429s =
    safeNumber(
      service.consecutive429s
    );

  service.lastBackoffMs =
    safeNumber(
      service.lastBackoffMs
    );

  /*
   * V128:
   * V127 migrated historical 429 state by seeding level 2 whenever the level
   * was zero. That meant a fully recovered service could be re-seeded later.
   * Seed historical state once, persist the migration marker, then allow
   * successful requests to de-escalate naturally to zero.
   */
  if (
    service.rateLimitHistorySeeded !==
      true
  ) {
    if (
      service.consecutive429s <=
        0 &&
      safeNumber(
        service.total429s
      ) >=
        10
    ) {
      service.consecutive429s =
        2;
    }

    service.rateLimitHistorySeeded =
      true;
  }

  return service;
}

function geckoFreshEligibility(
  state
) {
  const service =
    geckoService(
      state
    );

  const now =
    Date.now();

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    );

  if (
    cooldownUntil &&
    now <
      cooldownUntil
  ) {
    return {
      eligible:
        false,

      reason:
        "GECKOTERMINAL_COOLDOWN",

      eligibleAt:
        cooldownUntil
    };
  }

  const lastRequestAt =
    safeNumber(
      service.lastRequestAt
    );

  const spacingEligibleAt =
    lastRequestAt
      ? lastRequestAt +
        GECKOTERMINAL_MIN_FRESH_INTERVAL_MS
      : 0;

  if (
    spacingEligibleAt &&
    now <
      spacingEligibleAt
  ) {
    return {
      eligible:
        false,

      reason:
        "GECKOTERMINAL_FRESH_SPACING",

      eligibleAt:
        spacingEligibleAt
    };
  }

  return {
    eligible:
      true,

    reason:
      null,

    eligibleAt:
      now
  };
}

function registerGecko429(
  service
) {
  const now =
    Date.now();

  const previous429At =
    safeNumber(
      service.last429At
    );

  let level =
    safeNumber(
      service.consecutive429s
    );

  if (
    previous429At &&
    now -
      previous429At <=
      30 * 60 * 1000
  ) {
    level =
      Math.min(
        4,
        Math.max(
          1,
          level +
            1
        )
      );
  }

  else {
    level =
      1;
  }

  const backoffMs =
    Math.min(
      GECKOTERMINAL_MAX_429_COOLDOWN_MS,
      GECKOTERMINAL_429_COOLDOWN_MS *
        Math.pow(
          2,
          Math.max(
            0,
            level -
              1
          )
        )
    );

  service.consecutive429s =
    level;

  service.last429At =
    now;

  service.cooldownUntil =
    now +
    backoffMs;

  service.lastBackoffMs =
    backoffMs;

  service.lastStatus =
    "HTTP_429";

  service.total429s =
    safeNumber(
      service.total429s
    ) +
    1;

  return backoffMs;
}

function registerGeckoSuccess(
  service,
  status
) {
  service.lastSuccessAt =
    Date.now();

  service.lastStatus =
    status;

  service.cooldownUntil =
    null;

  service.rateLimitHistorySeeded =
    true;

  const previousLevel =
    Math.max(
      0,
      Number(
        service.consecutive429s
      ) ||
      0
    );

  service.consecutive429s =
    Math.max(
      0,
      previousLevel -
        1
    );

  if (
    service.consecutive429s ===
      0
  ) {
    service.lastBackoffMs =
      0;
  }
}

function geckoRelationshipAddress(
  relationship
) {
  const id =
    String(
      relationship
        ?.data
        ?.id ||
      ""
    );

  const splitAt =
    id.lastIndexOf(
      "_"
    );

  const address =
    normalize(
      splitAt >= 0
        ? id.slice(
            splitAt + 1
          )
        : id
    );

  return isAddress(
    address
  )
    ? address
    : null;
}

function tokenSupplyNumber(
  watched
) {
  const raw =
    watched
      ?.metadata
      ?.totalSupply;

  const decimals =
    safeNumber(
      watched
        ?.metadata
        ?.decimals
    );

  if (
    raw ===
      null ||
    raw ===
      undefined
  ) {
    return null;
  }

  const numeric =
    Number(
      String(
        raw
      )
    );

  if (
    !Number.isFinite(
      numeric
    ) ||
    numeric <=
      0
  ) {
    return null;
  }

  const supply =
    numeric /
    Math.pow(
      10,
      clamp(
        decimals,
        0,
        36
      )
    );

  return Number.isFinite(
    supply
  ) &&
  supply >
    0
    ? supply
    : null;
}

function geckoTxWindow(
  attributes,
  window
) {
  const row =
    attributes
      ?.transactions
      ?.[window] ||
    {};

  const buys =
    safeNumber(
      row?.buys
    );

  const sells =
    safeNumber(
      row?.sells
    );

  const total =
    buys +
    sells;

  return {
    buys,
    sells,
    total,

    buyPressure:
      total > 0
        ? (
            buys /
            total
          ) *
          100
        : null,

    directionalUsdVerified:
      false,

    buyVolumeUsd:
      null,

    sellVolumeUsd:
      null,

    netFlowUsd:
      null
  };
}

function parseGeckoPoolMarket(
  token,
  watched,
  row
) {
  const target =
    normalize(
      token
    );

  const attributes =
    row
      ?.attributes ||
    {};

  const relationships =
    row
      ?.relationships ||
    {};

  const baseAddress =
    geckoRelationshipAddress(
      relationships.base_token
    );

  const quoteAddress =
    geckoRelationshipAddress(
      relationships.quote_token
    );

  const targetIsBase =
    baseAddress ===
    target;

  const targetIsQuote =
    quoteAddress ===
    target;

  if (
    !targetIsBase &&
    !targetIsQuote
  ) {
    return null;
  }

  const priceUsd =
    safeNumber(
      targetIsBase
        ? attributes
            .base_token_price_usd
        : attributes
            .quote_token_price_usd
    );

  const liquidityUsd =
    safeNumber(
      attributes
        .reserve_in_usd
    );

  /*
   * Never turn an incomplete fallback response into "verified" market
   * intelligence. Both USD price and real USD pool reserve are required.
   */
  if (
    priceUsd <=
      0 ||
    liquidityUsd <=
      0
  ) {
    return null;
  }

  const supply =
    tokenSupplyNumber(
      watched
    );

  const computedValue =
    supply &&
    priceUsd
      ? supply *
        priceUsd
      : null;

  const marketCap =
    targetIsBase &&
    safeNumber(
      attributes
        .market_cap_usd
    ) >
      0
      ? safeNumber(
          attributes
            .market_cap_usd
        )
      : computedValue;

  const fdv =
    targetIsBase &&
    safeNumber(
      attributes
        .fdv_usd
    ) >
      0
      ? safeNumber(
          attributes
            .fdv_usd
        )
      : computedValue;

  const txM5 =
    geckoTxWindow(
      attributes,
      "m5"
    );

  const txH1 =
    geckoTxWindow(
      attributes,
      "h1"
    );

  const txH24 =
    geckoTxWindow(
      attributes,
      "h24"
    );

  const poolAddress =
    String(
      attributes.address ||
      ""
    ) ||
    null;

  const parsedCreatedAt =
    attributes
      .pool_created_at
      ? Date.parse(
          attributes
            .pool_created_at
        )
      : NaN;

  return {
    verified:
      true,

    status:
      "VERIFIED",

    cached:
      false,

    source:
      "GECKOTERMINAL",

    pairAddress:
      poolAddress,

    baseTokenAddress:
      baseAddress,

    quoteTokenAddress:
      quoteAddress,

    targetTokenSide:
      targetIsBase
        ? "BASE"
        : "QUOTE",

    url:
      poolAddress
        ? `https://www.geckoterminal.com/${GECKOTERMINAL_NETWORK}/pools/${poolAddress}`
        : null,

    priceUsd:
      String(
        priceUsd
      ),

    liquidityUsd,

    marketCap:
      Number.isFinite(
        marketCap
      ) &&
      marketCap >
        0
        ? marketCap
        : null,

    fdv:
      Number.isFinite(
        fdv
      ) &&
      fdv >
        0
        ? fdv
        : null,

    volume: {
      m5:
        safeNumber(
          attributes
            ?.volume_usd
            ?.m5
        ),

      h1:
        safeNumber(
          attributes
            ?.volume_usd
            ?.h1
        ),

      h24:
        safeNumber(
          attributes
            ?.volume_usd
            ?.h24
        )
    },

    transactions: {
      m5:
        txM5,

      h1:
        txH1,

      h24:
        txH24
    },

    buyPressure5m:
      txM5
        .buyPressure,

    buyPressure1h:
      txH1
        .buyPressure,

    buyPressure24h:
      txH24
        .buyPressure,

    directionalFlow: {
      m5: {
        verified:
          false,
        buyVolumeUsd:
          null,
        sellVolumeUsd:
          null,
        netFlowUsd:
          null
      },

      h1: {
        verified:
          false,
        buyVolumeUsd:
          null,
        sellVolumeUsd:
          null,
        netFlowUsd:
          null
      },

      h24: {
        verified:
          false,
        buyVolumeUsd:
          null,
        sellVolumeUsd:
          null,
        netFlowUsd:
          null
      }
    },

    pairCreatedAt:
      Number.isFinite(
        parsedCreatedAt
      )
        ? parsedCreatedAt
        : null,

    imageUrl:
      null,

    fallbackVerified:
      true
  };
}

async function geckoTerminalMarketData(
  token,
  budget,
  watched,
  state,
  trigger
) {
  const service =
    geckoService(
      state
    );

  const freshEligibility =
    geckoFreshEligibility(
      state
    );

  if (
    !freshEligibility.eligible
  ) {
    return {
      verified:
        false,

      status:
        freshEligibility.reason,

      source:
        "GECKOTERMINAL",

      fallbackTrigger:
        trigger,

      cooldownUntil:
        freshEligibility.reason ===
          "GECKOTERMINAL_COOLDOWN"
          ? freshEligibility.eligibleAt
          : null,

      freshEligibleAt:
        freshEligibility.eligibleAt
    };
  }

  budget.analysis.geckoFreshUsed =
    safeNumber(
      budget.analysis.geckoFreshUsed
    );

  if (
    budget.analysis.geckoFreshUsed >=
    GECKOTERMINAL_MAX_FRESH_PER_SCAN
  ) {
    return {
      verified:
        false,

      status:
        "GECKOTERMINAL_SCAN_LIMIT",

      source:
        "GECKOTERMINAL",

      fallbackTrigger:
        trigger
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "GECKOTERMINAL_FALLBACK"
    )
  ) {
    return {
      verified:
        false,

      status:
        "GECKOTERMINAL_BUDGET_PROTECTED",

      source:
        "GECKOTERMINAL",

      fallbackTrigger:
        trigger
    };
  }

  budget.analysis.geckoFreshUsed++;

  service.lastRequestAt =
    Date.now();

  service.totalRequests =
    safeNumber(
      service.totalRequests
    ) +
    1;

  try {
    const response =
      await fetch(
        `${GECKOTERMINAL_BASE}/networks/${GECKOTERMINAL_NETWORK}/tokens/${token}/pools`,

        {
          headers: {
            accept:
              "application/json;version=20230203"
          }
        }
      );

    if (
      response.status ===
      429
    ) {
      const backoffMs =
        registerGecko429(
          service
        );

      return {
        verified:
          false,

        status:
          "GECKOTERMINAL_HTTP_429",

        source:
          "GECKOTERMINAL",

        fallbackTrigger:
          trigger,

        rateLimited:
          true,

        cooldownUntil:
          service.cooldownUntil,

        adaptiveBackoffMs:
          backoffMs,

        rateLimitLevel:
          service.consecutive429s
      };
    }

    if (
      !response.ok
    ) {
      service.lastStatus =
        `HTTP_${response.status}`;

      return {
        verified:
          false,

        status:
          `GECKOTERMINAL_HTTP_${response.status}`,

        source:
          "GECKOTERMINAL",

        fallbackTrigger:
          trigger
      };
    }

    const payload =
      await response.json();

    const rows =
      Array.isArray(
        payload?.data
      )
        ? payload.data
        : [];

    const markets =
      rows
        .map(
          row =>
            parseGeckoPoolMarket(
              token,
              watched,
              row
            )
        )
        .filter(
          Boolean
        )
        .sort(
          (a, b) =>
            safeNumber(
              b.liquidityUsd
            ) -
            safeNumber(
              a.liquidityUsd
            )
        );

    if (
      !markets.length
    ) {
      service.lastStatus =
        "NO_MARKET_FOUND";

      return {
        verified:
          false,

        status:
          "GECKOTERMINAL_NO_MARKET_FOUND",

        source:
          "GECKOTERMINAL",

        fallbackTrigger:
          trigger
      };
    }

    const market = {
      ...markets[0],

      source:
        `GECKOTERMINAL_FALLBACK_${String(
          trigger ||
          "DEXSCREENER_UNAVAILABLE"
        )
          .replace(
            /[^A-Z0-9_]/gi,
            "_"
          )
          .toUpperCase()}`,

      fallbackTrigger:
        trigger
    };

    registerGeckoSuccess(
      service,
      "VERIFIED"
    );

    saveMarketCache(
      watched,
      market
    );

    return market;
  }

  catch (
    error
  ) {
    service.lastStatus =
      "FETCH_ERROR";

    return {
      verified:
        false,

      status:
        "GECKOTERMINAL_FETCH_ERROR",

      source:
        "GECKOTERMINAL",

      fallbackTrigger:
        trigger,

      error:
        errorString(
          error
        )
    };
  }
}

async function priorityMarketFallback(
  token,
  budget,
  watched,
  state,
  priority,
  trigger,
  original
) {
  if (
    !priority
  ) {
    return original;
  }

  const availabilityV147 =
    marketProviderAvailabilityV147(
      state,
      watched?.address ||
      token
    );

  if (
    !availabilityV147
      .gecko
      .eligible
  ) {
    return {
      ...original,

      marketProviderAvailabilityV147:
        availabilityV147,

      alternativeMarketData: {
        attempted:
          false,
        checked:
          true,
        requestSent:
          false,
        source:
          "GECKOTERMINAL",
        status:
          availabilityV147
            .gecko
            .reason ||
          "GECKOTERMINAL_NOT_ELIGIBLE",
        fallbackTrigger:
          trigger,
        cooldownUntil:
          availabilityV147
            .gecko
            .cooldownUntil,
        freshEligibleAt:
          availabilityV147
            .gecko
            .eligibleAt,
        bothProvidersUnavailable:
          availabilityV147
            .bothUnavailable,
        earliestMarketRetryAt:
          availabilityV147
            .earliestEligibleAt,
        retryAfterMs:
          availabilityV147
            .retryAfterMs
      }
    };
  }

  const fallback =
    await geckoTerminalMarketData(
      token,
      budget,
      watched,
      state,
      trigger
    );

  if (
    fallback?.verified
  ) {
    return {
      ...fallback,
      marketProviderAvailabilityV147:
        marketProviderAvailabilityV147(
          state,
          watched?.address ||
          token
        )
    };
  }

  return {
    ...original,

    marketProviderAvailabilityV147:
      marketProviderAvailabilityV147(
        state,
        watched?.address ||
        token
      ),

    alternativeMarketData: {
      attempted:
        true,
      checked:
        true,
      requestSent:
        ![
          "GECKOTERMINAL_COOLDOWN",
          "GECKOTERMINAL_FRESH_SPACING",
          "GECKOTERMINAL_SCAN_LIMIT",
          "GECKOTERMINAL_BUDGET_PROTECTED"
        ].includes(
          fallback?.status
        ),
      source:
        "GECKOTERMINAL",
      status:
        fallback?.status ||
        "UNAVAILABLE",
      fallbackTrigger:
        trigger,
      cooldownUntil:
        fallback?.cooldownUntil ||
        null,
      freshEligibleAt:
        fallback?.freshEligibleAt ||
        null
    }
  };
}


/* =========================================================
   V126 VERIFIED DIRECTIONAL USD TRADE FEED
   ========================================================= */

/*
 * GeckoTerminal's public pool-trades endpoint returns the latest 300 trades
 * from the past 24 hours. We NEVER pretend that 300 rows necessarily cover
 * 24 hours. A requested window becomes verified only when:
 *
 * 1. all rows inside the window have valid timestamp / kind / USD volume; and
 * 2. the returned trade history demonstrably reaches the beginning of that
 *    window, OR fewer than 300 rows were returned (meaning the endpoint did
 *    not hit its documented row cap).
 *
 * This gives us useful verified 5m/1h directional USD on active pools while
 * keeping 24h UNVERIFIED whenever 300 rows do not cover the full day.
 */

function normalizeGeckoTradeKind(
  rawKind,
  targetTokenSide
) {
  const kind =
    String(
      rawKind ||
      ""
    ).toLowerCase();

  if (
    kind !==
      "buy" &&
    kind !==
      "sell"
  ) {
    return null;
  }

  /*
   * Gecko's pool trade "kind" is expressed relative to the base token.
   * If our candidate is the quote token, invert the side.
   */
  if (
    String(
      targetTokenSide ||
      ""
    ).toUpperCase() ===
      "QUOTE"
  ) {
    return kind ===
      "buy"
      ? "sell"
      : "buy";
  }

  if (
    String(
      targetTokenSide ||
      ""
    ).toUpperCase() !==
      "BASE"
  ) {
    return null;
  }

  return kind;
}

function geckoDirectionalWindow(
  parsedTrades,
  returnedCount,
  windowMs,
  dexCounts
) {
  const now =
    Date.now();

  const cutoff =
    now -
    windowMs;

  const validTimestamps =
    parsedTrades
      .map(
        trade =>
          safeNumber(
            trade.timestamp
          )
      )
      .filter(
        value =>
          value >
          0
      );

  const oldestTimestamp =
    validTimestamps.length
      ? Math.min(
          ...validTimestamps
        )
      : null;

  const hitApiRowCap =
    returnedCount >=
      300;

  /*
   * If fewer than 300 trades came back, Gecko did not hit the documented
   * latest-300 cap. Otherwise the oldest returned trade must reach beyond
   * the start of the requested window.
   */
  const coverageComplete =
    !hitApiRowCap ||
    (
      oldestTimestamp !==
        null &&
      oldestTimestamp <=
        cutoff
    );

  const rows =
    parsedTrades
      .filter(
        trade =>
          safeNumber(
            trade.timestamp
          ) >=
          cutoff
      );

  const validRows =
    rows.filter(
      trade =>
        (
          trade.side ===
            "buy" ||
          trade.side ===
            "sell"
        ) &&
        Number.isFinite(
          Number(
            trade.volumeUsd
          )
        ) &&
        Number(
          trade.volumeUsd
        ) >=
          0
    );

  const dataComplete =
    validRows.length ===
      rows.length;

  let buys =
    0;

  let sells =
    0;

  let buyVolumeUsd =
    0;

  let sellVolumeUsd =
    0;

  for (
    const trade
    of validRows
  ) {
    const usd =
      Number(
        trade.volumeUsd
      );

    if (
      trade.side ===
        "buy"
    ) {
      buys++;
      buyVolumeUsd +=
        usd;
    }

    else {
      sells++;
      sellVolumeUsd +=
        usd;
    }
  }

  const verified =
    coverageComplete &&
    dataComplete;

  const dexBuys =
    dexCounts?.buys !==
      null &&
    dexCounts?.buys !==
      undefined
      ? safeNumber(
          dexCounts.buys
        )
      : null;

  const dexSells =
    dexCounts?.sells !==
      null &&
    dexCounts?.sells !==
      undefined
      ? safeNumber(
          dexCounts.sells
        )
      : null;

  const countCrossCheck =
    dexBuys !==
      null &&
    dexSells !==
      null
      ? (
          buys ===
            dexBuys &&
          sells ===
            dexSells
        )
      : null;

  return {
    verified,

    coverageComplete,
    dataComplete,
    hitApiRowCap,

    returnedTrades:
      rows.length,

    oldestReturnedTimestamp:
      oldestTimestamp,

    buys,
    sells,

    buyVolumeUsd:
      verified
        ? buyVolumeUsd
        : null,

    sellVolumeUsd:
      verified
        ? sellVolumeUsd
        : null,

    netFlowUsd:
      verified
        ? buyVolumeUsd -
          sellVolumeUsd
        : null,

    buyPressureUsd:
      verified &&
      (
        buyVolumeUsd +
        sellVolumeUsd
      ) >
        0
        ? (
            buyVolumeUsd /
            (
              buyVolumeUsd +
              sellVolumeUsd
            )
          ) *
          100
        : verified
          ? 0
          : null,

    countCrossCheck,

    dexCounts:
      {
        buys:
          dexBuys,

        sells:
          dexSells
      }
  };
}


function directionalTradeKey(
  row,
  timestamp,
  side,
  volumeUsd
) {
  const rowId =
    String(
      row?.id ||
      ""
    ).trim();

  if (
    rowId
  ) {
    return rowId;
  }

  const txHash =
    String(
      row
        ?.attributes
        ?.tx_hash ||
      ""
    ).toLowerCase();

  return [
    txHash,
    String(
      timestamp
    ),
    String(
      side ||
      ""
    ),
    String(
      volumeUsd
    )
  ].join(
    ":"
  );
}

function directionalLedgerStore(
  state
) {
  const service =
    geckoService(
      state
    );

  service.directionalTradeLedgers =
    service.directionalTradeLedgers &&
    typeof service.directionalTradeLedgers ===
      "object" &&
    !Array.isArray(
      service.directionalTradeLedgers
    )
      ? service.directionalTradeLedgers
      : {};

  return service
    .directionalTradeLedgers;
}

function pruneDirectionalLedgers(
  ledgers,
  keepPoolKey
) {
  const now =
    Date.now();

  for (
    const [
      key,
      ledger
    ]
    of Object.entries(
      ledgers
    )
  ) {
    if (
      key ===
        keepPoolKey
    ) {
      continue;
    }

    const age =
      now -
      safeNumber(
        ledger?.lastUpdatedAt
      );

    if (
      age >
        DIRECTIONAL_LEDGER_WINDOW_MS
    ) {
      delete ledgers[
        key
      ];
    }
  }

  const entries =
    Object.entries(
      ledgers
    ).sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b?.[1]
            ?.lastUpdatedAt
        ) -
        safeNumber(
          a?.[1]
            ?.lastUpdatedAt
        )
    );

  for (
    const [
      key
    ]
    of entries.slice(
      DIRECTIONAL_LEDGER_MAX_POOLS
    )
  ) {
    if (
      key !==
        keepPoolKey
    ) {
      delete ledgers[
        key
      ];
    }
  }
}

function validDirectionalLedgerRecord(
  row
) {
  return (
    Array.isArray(
      row
    ) &&
    row.length >=
      4 &&
    typeof row[0] ===
      "string" &&
    safeNumber(
      row[1]
    ) >
      0 &&
    (
      row[2] ===
        "buy" ||
      row[2] ===
        "sell"
    ) &&
    Number.isFinite(
      Number(
        row[3]
      )
    ) &&
    Number(
      row[3]
    ) >=
      0
  );
}

function updateDirectionalTradeLedger(
  state,
  candidate,
  parsedTrades,
  returnedCount,
  requestAt
) {
  const market =
    candidate?.market ||
    {};

  const onChainIdentityV153 =
    candidate
      ?.onChainPoolIdentityV153;

  const poolKey =
    String(
      market.pairAddress ||
      onChainIdentityV153
        ?.pairAddress ||
      ""
    ).toLowerCase();

  const tokenAddress =
    normalize(
      candidate?.address
    );

  const targetSide =
    String(
      (
        String(
          market.targetTokenSide ||
          ""
        ).toUpperCase() ===
          "BASE" ||
        String(
          market.targetTokenSide ||
          ""
        ).toUpperCase() ===
          "QUOTE"
      )
        ? market.targetTokenSide
        : onChainIdentityV153
            ?.targetTokenSide ||
          ""
    ).toUpperCase();

  if (
    !poolKey ||
    !tokenAddress ||
    (
      targetSide !==
        "BASE" &&
      targetSide !==
        "QUOTE"
    )
  ) {
    return {
      verified:
        false,

      status:
        "LEDGER_IDENTITY_UNVERIFIED",

      ledger:
        null,

      continuity:
        false,

      resetReason:
        "LEDGER_IDENTITY_UNVERIFIED"
    };
  }

  const ledgers =
    directionalLedgerStore(
      state
    );

  pruneDirectionalLedgers(
    ledgers,
    poolKey
  );

  let previous =
    ledgers[
      poolKey
    ];

  if (
    previous &&
    (
      normalize(
        previous.tokenAddress
      ) !==
        tokenAddress ||
      String(
        previous.targetTokenSide ||
        ""
      ).toUpperCase() !==
        targetSide
    )
  ) {
    previous =
      null;
  }

  const validTrades =
    (
      parsedTrades ||
      []
    )
      .filter(
        trade =>
          trade.tradeKey &&
          safeNumber(
            trade.timestamp
          ) >
            0 &&
          (
            trade.side ===
              "buy" ||
            trade.side ===
              "sell"
          ) &&
          Number.isFinite(
            Number(
              trade.volumeUsd
            )
          ) &&
          Number(
            trade.volumeUsd
          ) >=
            0
      );

  const freshRecords =
    validTrades.map(
      trade => [
        String(
          trade.tradeKey
        ),
        safeNumber(
          trade.timestamp
        ),
        trade.side,
        Number(
          trade.volumeUsd
        )
      ]
    );

  const previousRecords =
    Array.isArray(
      previous?.records
    )
      ? previous.records.filter(
          validDirectionalLedgerRecord
        )
      : [];

  const hitApiRowCap =
    safeNumber(
      returnedCount
    ) >=
      300;

  const newKeys =
    new Set(
      freshRecords.map(
        row =>
          row[0]
      )
    );

  const overlapCount =
    previousRecords.reduce(
      (
        count,
        row
      ) =>
        count +
        (
          newKeys.has(
            row[0]
          )
            ? 1
            : 0
        ),
      0
    );

  let continuity =
    false;

  let resetReason =
    null;

  let coverageStartAt =
    null;

  let records =
    [];

  if (
    !hitApiRowCap
  ) {
    records =
      freshRecords;

    coverageStartAt =
      requestAt -
      DIRECTIONAL_LEDGER_WINDOW_MS;

    continuity =
      true;

    resetReason =
      previous
        ? "FULL_HISTORY_REFRESH_BELOW_API_CAP"
        : "FULL_HISTORY_INITIALIZED_BELOW_API_CAP";
  }

  else if (
    previous &&
    previousRecords.length &&
    overlapCount >
      0
  ) {
    const merged =
      new Map();

    for (
      const row
      of previousRecords
    ) {
      merged.set(
        row[0],
        row
      );
    }

    for (
      const row
      of freshRecords
    ) {
      merged.set(
        row[0],
        row
      );
    }

    records =
      Array.from(
        merged.values()
      );

    coverageStartAt =
      safeNumber(
        previous.coverageStartAt
      ) ||
      (
        records.length
          ? Math.min(
              ...records.map(
                row =>
                  safeNumber(
                    row[1]
                  )
              )
            )
          : requestAt
      );

    continuity =
      true;
  }

  else {
    records =
      freshRecords;

    coverageStartAt =
      records.length
        ? Math.min(
            ...records.map(
              row =>
                safeNumber(
                  row[1]
                )
            )
          )
        : requestAt;

    continuity =
      false;

    resetReason =
      previous
        ? "CAPPED_BATCH_NO_OVERLAP_GAP_RESET"
        : "CAPPED_BATCH_INITIAL_PARTIAL_HISTORY";
  }

  const cutoff24h =
    requestAt -
    DIRECTIONAL_LEDGER_WINDOW_MS;

  records =
    records
      .filter(
        row =>
          safeNumber(
            row[1]
          ) >=
            cutoff24h
      )
      .sort(
        (
          a,
          b
        ) =>
          safeNumber(
            a[1]
          ) -
          safeNumber(
            b[1]
          )
      );

  let trimmedByRecordCap =
    false;

  if (
    records.length >
      DIRECTIONAL_LEDGER_MAX_TRADES
  ) {
    records =
      records.slice(
        -DIRECTIONAL_LEDGER_MAX_TRADES
      );

    trimmedByRecordCap =
      true;

    coverageStartAt =
      records.length
        ? safeNumber(
            records[0][1]
          )
        : requestAt;

    resetReason =
      "LEDGER_RECORD_CAP_TRIMMED";
  }

  if (
    coverageStartAt <
      cutoff24h
  ) {
    coverageStartAt =
      cutoff24h;
  }

  const ledger = {
    version:
      "V130",

    tokenAddress,

    poolAddress:
      poolKey,

    targetTokenSide:
      targetSide,

    coverageStartAt,

    coverageEndAt:
      requestAt,

    lastUpdatedAt:
      requestAt,

    lastBatchCount:
      safeNumber(
        returnedCount
      ),

    lastBatchHitApiCap:
      hitApiRowCap,

    lastBatchOverlapCount:
      overlapCount,

    continuity,

    resetReason,

    trimmedByRecordCap,

    records
  };

  ledgers[
    poolKey
  ] =
    ledger;

  pruneDirectionalLedgers(
    ledgers,
    poolKey
  );

  return {
    verified:
      true,

    status:
      continuity
        ? "LEDGER_CONTINUOUS"
        : "LEDGER_PARTIAL",

    ledger,

    continuity,

    resetReason,

    overlapCount,

    recordCount:
      records.length,

    trimmedByRecordCap
  };
}

function rollingDirectionalWindow(
  ledger,
  windowMs,
  dexCounts,
  requestAt
) {
  const cutoff =
    requestAt -
    windowMs;

  const records =
    Array.isArray(
      ledger?.records
    )
      ? ledger.records.filter(
          validDirectionalLedgerRecord
        )
      : [];

  const coverageStartAt =
    safeNumber(
      ledger?.coverageStartAt
    );

  const coverageEndAt =
    safeNumber(
      ledger?.coverageEndAt
    );

  const coverageComplete =
    coverageStartAt >
      0 &&
    coverageStartAt <=
      cutoff &&
    coverageEndAt >=
      requestAt;

  const rows =
    records.filter(
      row =>
        safeNumber(
          row[1]
        ) >=
          cutoff &&
        safeNumber(
          row[1]
        ) <=
          requestAt
    );

  let buys =
    0;

  let sells =
    0;

  let buyVolumeUsd =
    0;

  let sellVolumeUsd =
    0;

  for (
    const row
    of rows
  ) {
    const side =
      row[2];

    const usd =
      Number(
        row[3]
      );

    if (
      side ===
        "buy"
    ) {
      buys++;
      buyVolumeUsd +=
        usd;
    }

    else if (
      side ===
        "sell"
    ) {
      sells++;
      sellVolumeUsd +=
        usd;
    }
  }

  const dexBuys =
    dexCounts?.buys !==
      null &&
    dexCounts?.buys !==
      undefined
      ? safeNumber(
          dexCounts.buys
        )
      : null;

  const dexSells =
    dexCounts?.sells !==
      null &&
    dexCounts?.sells !==
      undefined
      ? safeNumber(
          dexCounts.sells
        )
      : null;

  const countCrossCheck =
    dexBuys !==
      null &&
    dexSells !==
      null
      ? (
          buys ===
            dexBuys &&
          sells ===
            dexSells
        )
      : null;

  return {
    verified:
      coverageComplete,

    coverageComplete,

    source:
      "GECKOTERMINAL_POOL_TRADES_ROLLING_V130",

    asOfAt:
      requestAt,

    coverageStartAt,

    coverageEndAt,

    returnedTrades:
      rows.length,

    ledgerRecordCount:
      records.length,

    buys,

    sells,

    buyVolumeUsd:
      coverageComplete
        ? buyVolumeUsd
        : null,

    sellVolumeUsd:
      coverageComplete
        ? sellVolumeUsd
        : null,

    netFlowUsd:
      coverageComplete
        ? buyVolumeUsd -
          sellVolumeUsd
        : null,

    buyPressureUsd:
      coverageComplete &&
      (
        buyVolumeUsd +
        sellVolumeUsd
      ) >
        0
        ? (
            buyVolumeUsd /
            (
              buyVolumeUsd +
              sellVolumeUsd
            )
          ) *
          100
        : coverageComplete
          ? 0
          : null,

    countCrossCheck,

    dexCounts: {
      buys:
        dexBuys,

      sells:
        dexSells
    }
  };
}

async function geckoDirectionalTradeFlow(
  candidate,
  budget,
  state
) {
  const market =
    candidate?.market;

  const onChainIdentityV153 =
    candidate
      ?.onChainPoolIdentityV153;

  const marketIdentityVerifiedV153 =
    market?.verified === true;

  const onChainIdentityVerifiedV153 =
    onChainIdentityV153
      ?.verified === true;

  if (
    !marketIdentityVerifiedV153 &&
    !onChainIdentityVerifiedV153
  ) {
    return {
      attempted: false,
      verifiedAnyWindow: false,
      status:
        "MARKET_AND_ONCHAIN_POOL_IDENTITY_UNVERIFIED"
    };
  }

  const poolAddress =
    String(
      marketIdentityVerifiedV153
        ? (
            market?.pairAddress ||
            onChainIdentityV153
              ?.pairAddress ||
            ""
          )
        : (
            onChainIdentityV153
              ?.pairAddress ||
            ""
          )
    );

  if (
    !poolAddress
  ) {
    return {
      attempted:
        false,

      verifiedAnyWindow:
        false,

      status:
        "POOL_ADDRESS_UNAVAILABLE"
    };
  }

  const targetSide =
    String(
      (
        marketIdentityVerifiedV153 &&
        (
          String(
            market?.targetTokenSide ||
            ""
          ).toUpperCase() ===
            "BASE" ||
          String(
            market?.targetTokenSide ||
            ""
          ).toUpperCase() ===
            "QUOTE"
        )
      )
        ? market.targetTokenSide
        : onChainIdentityV153
            ?.targetTokenSide ||
          ""
    ).toUpperCase();

  if (
    targetSide !==
      "BASE" &&
    targetSide !==
      "QUOTE"
  ) {
    return {
      attempted:
        false,

      verifiedAnyWindow:
        false,

      status:
        "TARGET_POOL_SIDE_UNVERIFIED"
    };
  }

  const poolIdentitySourceV153 =
    marketIdentityVerifiedV153
      ? "VERIFIED_MARKET"
      : "ONCHAIN_V4_POOL_IDENTITY_V153";

  const service =
    geckoService(
      state
    );

  const freshEligibility =
    geckoFreshEligibility(
      state
    );

  if (
    !freshEligibility.eligible
  ) {
    return {
      attempted:
        false,

      verifiedAnyWindow:
        false,

      status:
        freshEligibility.reason,

      cooldownUntil:
        freshEligibility.reason ===
          "GECKOTERMINAL_COOLDOWN"
          ? freshEligibility.eligibleAt
          : null,

      freshEligibleAt:
        freshEligibility.eligibleAt
    };
  }

  budget.analysis.geckoFreshUsed =
    safeNumber(
      budget.analysis.geckoFreshUsed
    );

  /*
   * Share V117's one-Gecko-request-per-scan guard. Market fallback and
   * directional enrichment can never both create a Gecko request burst.
   */
  if (
    budget.analysis.geckoFreshUsed >=
      GECKOTERMINAL_MAX_FRESH_PER_SCAN
  ) {
    return {
      attempted:
        false,

      verifiedAnyWindow:
        false,

      status:
        "GECKOTERMINAL_SCAN_LIMIT"
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "GECKOTERMINAL_DIRECTIONAL_TRADES"
    )
  ) {
    return {
      attempted:
        false,

      verifiedAnyWindow:
        false,

      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  budget.analysis.geckoFreshUsed++;

  service.lastRequestAt =
    Date.now();

  service.totalRequests =
    safeNumber(
      service.totalRequests
    ) +
    1;

  try {
    const response =
      await fetch(
        `${GECKOTERMINAL_BASE}/networks/${GECKOTERMINAL_NETWORK}/pools/${poolAddress}/trades`,

        {
          headers: {
            accept:
              "application/json;version=20230203"
          }
        }
      );

    if (
      response.status ===
        429
    ) {
      const backoffMs =
        registerGecko429(
          service
        );

      return {
        attempted:
          true,

        verifiedAnyWindow:
          false,

        status:
          "GECKOTERMINAL_TRADES_HTTP_429",

        rateLimited:
          true,

        cooldownUntil:
          service.cooldownUntil,

        adaptiveBackoffMs:
          backoffMs,

        rateLimitLevel:
          service.consecutive429s
      };
    }

    if (
      !response.ok
    ) {
      service.lastStatus =
        `TRADES_HTTP_${response.status}`;

      return {
        attempted:
          true,

        verifiedAnyWindow:
          false,

        status:
          `GECKOTERMINAL_TRADES_HTTP_${response.status}`
      };
    }

    const payload =
      await response.json();

    const rows =
      Array.isArray(
        payload?.data
      )
        ? payload.data
        : [];

    const parsedTrades =
      rows
        .map(
          row => {
            const attributes =
              row?.attributes ||
              {};

            const timestamp =
              Date.parse(
                attributes
                  .block_timestamp ||
                ""
              );

            const side =
              normalizeGeckoTradeKind(
                attributes.kind,
                targetSide
              );

            const volumeUsd =
              attributes
                .volume_in_usd !==
                null &&
              attributes
                .volume_in_usd !==
                undefined &&
              Number.isFinite(
                Number(
                  attributes
                    .volume_in_usd
                )
              )
                ? Number(
                    attributes
                      .volume_in_usd
                  )
                : null;

            const normalizedTimestamp =
              Number.isFinite(
                timestamp
              )
                ? timestamp
                : null;

            return {
              timestamp:
                normalizedTimestamp,

              side,

              volumeUsd,

              txHash:
                attributes
                  .tx_hash ||
                null,

              tradeKey:
                normalizedTimestamp !==
                  null
                  ? directionalTradeKey(
                      row,
                      normalizedTimestamp,
                      side,
                      volumeUsd
                    )
                  : null
            };
          }
        )
        .filter(
          trade =>
            trade.timestamp !==
              null
        );

    const returnedCount =
      rows.length;

    const requestAt =
      Date.now();

    const directM5 =
      geckoDirectionalWindow(
        parsedTrades,
        returnedCount,
        5 * 60 * 1000,
        market
          ?.transactions
          ?.m5
      );

    const directH1 =
      geckoDirectionalWindow(
        parsedTrades,
        returnedCount,
        60 * 60 * 1000,
        market
          ?.transactions
          ?.h1
      );

    const directH24 =
      geckoDirectionalWindow(
        parsedTrades,
        returnedCount,
        24 * 60 * 60 * 1000,
        market
          ?.transactions
          ?.h24
      );

    /*
     * V130: merge this same request into persistent verified history.
     * No extra Gecko request is created.
     */
    const ledgerUpdate =
      updateDirectionalTradeLedger(
        state,
        candidate,
        parsedTrades,
        returnedCount,
        requestAt
      );

    const rollingM5 =
      ledgerUpdate
        ?.ledger
        ? rollingDirectionalWindow(
            ledgerUpdate.ledger,
            5 * 60 * 1000,
            market
              ?.transactions
              ?.m5,
            requestAt
          )
        : null;

    const rollingH1 =
      ledgerUpdate
        ?.ledger
        ? rollingDirectionalWindow(
            ledgerUpdate.ledger,
            60 * 60 * 1000,
            market
              ?.transactions
              ?.h1,
            requestAt
          )
        : null;

    const rollingH24 =
      ledgerUpdate
        ?.ledger
        ? rollingDirectionalWindow(
            ledgerUpdate.ledger,
            24 * 60 * 60 * 1000,
            market
              ?.transactions
              ?.h24,
            requestAt
          )
        : null;

    const m5 =
      rollingM5?.verified
        ? rollingM5
        : directM5;

    const h1 =
      rollingH1?.verified
        ? rollingH1
        : directH1;

    const h24 =
      rollingH24?.verified
        ? rollingH24
        : directH24;

    const verifiedAnyWindow =
      m5.verified ||
      h1.verified ||
      h24.verified;

    registerGeckoSuccess(
      service,
      verifiedAnyWindow
        ? "VERIFIED_DIRECTIONAL_TRADES"
        : "DIRECTIONAL_TRADES_PARTIAL"
    );

    return {
      attempted:
        true,

      verifiedAnyWindow,

      status:
        verifiedAnyWindow
          ? "VERIFIED_DIRECTIONAL_TRADES"
          : "DIRECTIONAL_TRADES_INCOMPLETE_COVERAGE",

      source:
        "GECKOTERMINAL_POOL_TRADES",

      poolIdentitySourceV153,

      onChainPoolIdentityUsedV153:
        !marketIdentityVerifiedV153 &&
        onChainIdentityVerifiedV153,

      marketVerifiedForPoolIdentityV153:
        marketIdentityVerifiedV153,

      poolAddress,

      targetTokenSide:
        targetSide,

      returnedCount,

      documentedMaxRows:
        300,

      rollingLedger: {
        status:
          ledgerUpdate
            ?.status ||
          "UNAVAILABLE",

        continuity:
          Boolean(
            ledgerUpdate
              ?.continuity
          ),

        resetReason:
          ledgerUpdate
            ?.resetReason ||
          null,

        overlapCount:
          safeNumber(
            ledgerUpdate
              ?.overlapCount
          ),

        recordCount:
          safeNumber(
            ledgerUpdate
              ?.recordCount
          ),

        trimmedByRecordCap:
          Boolean(
            ledgerUpdate
              ?.trimmedByRecordCap
          ),

        maxTrades:
          DIRECTIONAL_LEDGER_MAX_TRADES,

        maxPools:
          DIRECTIONAL_LEDGER_MAX_POOLS
      },

      windows: {
        m5,
        h1,
        h24
      }
    };
  }

  catch (
    error
  ) {
    service.lastStatus =
      "TRADES_FETCH_ERROR";

    return {
      attempted:
        true,

      verifiedAnyWindow:
        false,

      status:
        "GECKOTERMINAL_TRADES_FETCH_ERROR",

      error:
        errorString(
          error
        )
    };
  }
}

function applyDirectionalTradeFlow(
  candidate,
  enrichment
) {
  candidate.market =
    candidate.market ||
    {};

  candidate.market
    .directionalTradeFeed =
    enrichment;

  if (
    !enrichment
      ?.windows
  ) {
    return candidate;
  }

  candidate.market
    .directionalFlow =
    candidate.market
      .directionalFlow ||
    {};

  for (
    const window
    of [
      "m5",
      "h1",
      "h24"
    ]
  ) {
    const row =
      enrichment
        .windows
        ?.[window];

    if (
      !row
    ) {
      continue;
    }

    /*
     * Never overwrite a previously verified directional source with an
     * incomplete trade-feed window.
     */
    if (
      row.verified
    ) {
      candidate.market
        .directionalFlow[
          window
        ] = {
          verified:
            true,

          source:
            row.source ||
            "GECKOTERMINAL_POOL_TRADES",

          asOfAt:
            row.asOfAt ||
            Date.now(),

          coverageStartAt:
            row.coverageStartAt ||
            null,

          coverageEndAt:
            row.coverageEndAt ||
            null,

          buyVolumeUsd:
            row.buyVolumeUsd,

          sellVolumeUsd:
            row.sellVolumeUsd,

          netFlowUsd:
            row.netFlowUsd,

          buyPressureUsd:
            row.buyPressureUsd,

          coverageComplete:
            row.coverageComplete,

          returnedTrades:
            row.returnedTrades,

          countCrossCheck:
            row.countCrossCheck
        };
    }
  }

  return candidate;
}

async function marketData(
  token,
  budget,
  watched,
  state,
  allowFresh = true,
  priority = false
) {
  const freshCache =
    cachedMarket(
      watched,
      MARKET_CACHE_MS
    );

  if (
    freshCache
  ) {
    return {
      ...freshCache,

      source:
        "CACHE"
    };
  }

  const service =
    dexService(
      state
    );

  if (priority) {
    reservePriorityFreshMarket(
      state,
      watched?.address || token
    );
  }

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    );

  if (
    cooldownUntil &&
    Date.now() <
      cooldownUntil
  ) {
    const stale =
      cachedMarket(
        watched,
        MARKET_STALE_CACHE_MS
      );

    if (
      stale
    ) {
      return {
        ...stale,

        source:
          "STALE_CACHE_429",

        rateLimited:
          true,

        cooldownUntil,
        priorityFreshSchedule:
          priorityFreshSchedule(
            state,
            watched?.address || token
          )
      };
    }

    return await priorityMarketFallback(
      token,
      budget,
      watched,
      state,
      priority,
      "DEXSCREENER_COOLDOWN",
      {
        verified:
          false,

        status:
          "DEXSCREENER_COOLDOWN",

        rateLimited:
          true,

        cooldownUntil,

        cached:
          false
      }
    );
  }

  /*
   * V91: reserve the scarce fresh DexScreener request for the
   * highest-priority live/new candidate. Other candidates still
   * receive verified cached/stale intelligence when available.
   */
  if (!allowFresh) {
    const stale =
      cachedMarket(
        watched,
        MARKET_STALE_CACHE_MS
      );

    if (stale) {
      return {
        ...stale,
        source:
          "STALE_CACHE_PRIORITY_RESERVE",
        freshReserved:
          true
      };
    }

    return {
      verified:
        false,
      status:
        "DEXSCREENER_FRESH_RESERVED_FOR_PRIORITY",
      freshReserved:
        true
    };
  }

  /*
   * V89: avoid hammering DexScreener during manual/repeated
   * scans. Cached/stale data is preferred when available.
   */
  const sinceLastFreshRequest =
    Date.now() -
    safeNumber(
      service.lastRequestAt
    );

  if (
    safeNumber(
      service.lastRequestAt
    ) &&
    sinceLastFreshRequest <
      DEXSCREENER_MIN_FRESH_INTERVAL_MS
  ) {
    const stale =
      cachedMarket(
        watched,
        MARKET_STALE_CACHE_MS
      );

    if (stale) {
      return {
        ...stale,

        source:
          "STALE_CACHE_FRESH_GUARD",

        freshGuard:
          true
      };
    }

    return await priorityMarketFallback(
      token,
      budget,
      watched,
      state,
      priority,
      "DEXSCREENER_FRESH_GUARD",
      {
        verified:
          false,

        status:
          "DEXSCREENER_FRESH_GUARD",

        freshGuard:
          true,

        retryAfterMs:
          Math.max(
            0,
            DEXSCREENER_MIN_FRESH_INTERVAL_MS -
            sinceLastFreshRequest
          ),

        priorityFreshSchedule:
          priorityFreshSchedule(
            state,
            watched?.address || token
          )
      }
    );
  }

  budget.analysis.dexFreshUsed =
    safeNumber(
      budget.analysis.dexFreshUsed
    );

  if (
    budget.analysis.dexFreshUsed >=
    DEXSCREENER_MAX_FRESH_PER_SCAN
  ) {
    const stale =
      cachedMarket(
        watched,
        MARKET_STALE_CACHE_MS
      );

    if (stale) {
      return {
        ...stale,

        source:
          "STALE_CACHE_SCAN_LIMIT",

        scanFreshLimit:
          true
      };
    }

    return {
      verified:
        false,

      status:
        "DEXSCREENER_SCAN_FRESH_LIMIT",

      scanFreshLimit:
        true
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "DEXSCREENER"
    )
  ) {
    return {
      verified:
        false,

      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  budget.analysis.dexFreshUsed++;

  service.lastRequestAt =
    Date.now();

  if (priority) {
    const reservation =
      service.priorityFreshReservation || {};
    service.priorityFreshReservation = {
      ...reservation,
      address:
        normalize(watched?.address || token),
      lastServedAt:
        Date.now(),
      attempts:
        safeNumber(reservation.attempts) + 1,
      eligibleAt:
        Date.now() + DEXSCREENER_MIN_FRESH_INTERVAL_MS
    };
  }

  try {
    const response =
      await fetch(
        `${DEXSCREENER_BASE}/token-pairs/v1/robinhood/${token}`,

        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (
      response.status ===
      429
    ) {
      const dexBackoffMsV147 =
        registerDex429V147(
          service
        );

      const stale =
        cachedMarket(
          watched,
          MARKET_STALE_CACHE_MS
        );

      if (stale) {
        return {
          ...stale,

          source:
            "STALE_CACHE_AFTER_429",

          rateLimited:
            true,

          cooldownUntil:
            service.cooldownUntil,

          adaptiveBackoffMsV147:
            dexBackoffMsV147,

          rateLimitLevelV147:
            safeNumber(
              service.consecutive429s
            )
        };
      }

      return await priorityMarketFallback(
        token,
        budget,
        watched,
        state,
        priority,
        "DEXSCREENER_HTTP_429",
        {
          verified:
            false,

          status:
            "HTTP_429",

          rateLimited:
            true,

          cooldownUntil:
            service.cooldownUntil,

          adaptiveBackoffMsV147:
            dexBackoffMsV147,

          rateLimitLevelV147:
            safeNumber(
              service.consecutive429s
            ),

          cached:
            false
        }
      );
    }

    if (
      !response.ok
    ) {
      service.lastStatus =
        `HTTP_${response.status}`;

      return {
        verified:
          false,

        status:
          `HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(
        data
      )
        ? data
        : [];

    if (
      !pairs.length
    ) {
      /*
       * V95: DexScreener exposes both token-pairs/v1 and
       * tokens/v1. A newly indexed token can occasionally be
       * absent from one route, so use the second documented
       * route before declaring NO_MARKET_FOUND.
       */
      /*
       * V98: do NOT immediately fire the second DexScreener route after
       * a zero-result first route. Back-to-back route calls were a major
       * source of 429s. The short V96 negative cache lets a later scan retry.
       */
      if (
        false &&
        consumeBudget(
          budget,
          "analysis",
          "DEXSCREENER_TOKEN_FALLBACK"
        )
      ) {
        try {
          const fallbackResponse =
            await fetch(
              `${DEXSCREENER_BASE}/tokens/v1/robinhood/${token}`,
              {
                headers: {
                  accept:
                    "application/json"
                }
              }
            );

          if (
            fallbackResponse.status ===
              429
          ) {
            registerDex429V147(
              service
            );
          }

          else if (
            fallbackResponse.ok
          ) {
            const fallbackData =
              await fallbackResponse.json();

            const fallbackPairs =
              Array.isArray(
                fallbackData
              )
                ? fallbackData
                : [];

            if (
              fallbackPairs.length
            ) {
              pairs.push(
                ...fallbackPairs
              );
              service.lastStatus =
                "VERIFIED_TOKEN_FALLBACK";
            }
          }
        }

        catch {
          /* Preserve the normal NO_MARKET_FOUND path below. */
        }
      }

      if (
        !pairs.length
      ) {
        service.lastStatus =
          "NO_MARKET_FOUND";

        const result = {
          verified:
            false,

          status:
            "NO_MARKET_FOUND",

          cached:
            false,

          source:
            "DEXSCREENER_BOTH_TOKEN_ROUTES"
        };

        saveMarketCache(
          watched,
          result
        );

        return await priorityMarketFallback(
          token,
          budget,
          watched,
          state,
          priority,
          "DEXSCREENER_NO_MARKET_FOUND",
          result
        );
      }
    }

    pairs.sort(
      (a, b) =>
        safeNumber(
          b?.liquidity?.usd
        ) -
        safeNumber(
          a?.liquidity?.usd
        )
    );

    const pair =
      pairs[0];

    const txWindow = window => {
      const row =
        pair?.txns?.[window] ||
        {};

      const buys =
        safeNumber(
          row?.buys
        );

      const sells =
        safeNumber(
          row?.sells
        );

      const total =
        buys +
        sells;

      /*
       * V99 STRICT DIRECTIONAL-USD RULE
       *
       * DexScreener normally exposes total window volume plus buy/sell
       * transaction counts, not a guaranteed buy-USD / sell-USD split.
       * We therefore only mark directional USD as verified if BOTH
       * explicit directional fields are actually present in the payload.
       * We never infer dollar flow from counts or split total volume.
       */
      const explicitBuyUsd =
        row?.buyVolumeUsd ??
        row?.buysVolumeUsd ??
        null;

      const explicitSellUsd =
        row?.sellVolumeUsd ??
        row?.sellsVolumeUsd ??
        null;

      const buyUsd =
        explicitBuyUsd !== null &&
        explicitBuyUsd !== undefined &&
        Number.isFinite(
          Number(explicitBuyUsd)
        )
          ? Number(explicitBuyUsd)
          : null;

      const sellUsd =
        explicitSellUsd !== null &&
        explicitSellUsd !== undefined &&
        Number.isFinite(
          Number(explicitSellUsd)
        )
          ? Number(explicitSellUsd)
          : null;

      const directionalUsdVerified =
        buyUsd !== null &&
        sellUsd !== null &&
        buyUsd >= 0 &&
        sellUsd >= 0;

      return {
        buys,
        sells,
        total,
        buyPressure:
          total > 0
            ? (
                buys /
                total
              ) *
              100
            : null,
        directionalUsdVerified,
        buyVolumeUsd:
          directionalUsdVerified
            ? buyUsd
            : null,
        sellVolumeUsd:
          directionalUsdVerified
            ? sellUsd
            : null,
        netFlowUsd:
          directionalUsdVerified
            ? buyUsd -
              sellUsd
            : null
      };
    };

    const txM5 =
      txWindow("m5");

    const txH1 =
      txWindow("h1");

    const txH24 =
      txWindow("h24");

    const result = {
      verified:
        true,

      status:
        "VERIFIED",

      cached:
        false,

      source:
        service.lastStatus ===
          "VERIFIED_TOKEN_FALLBACK"
          ? "DEXSCREENER_TOKENS_V1_FALLBACK"
          : "DEXSCREENER",

      pairAddress:
        pair?.pairAddress ||
        null,

      baseTokenAddress:
        normalize(
          pair
            ?.baseToken
            ?.address
        ) ||
        null,

      quoteTokenAddress:
        normalize(
          pair
            ?.quoteToken
            ?.address
        ) ||
        null,

      targetTokenSide:
        normalize(
          pair
            ?.baseToken
            ?.address
        ) ===
        normalize(
          token
        )
          ? "BASE"
          : normalize(
              pair
                ?.quoteToken
                ?.address
            ) ===
            normalize(
              token
            )
            ? "QUOTE"
            : "UNVERIFIED",

      url:
        pair?.url ||
        null,

      priceUsd:
        pair?.priceUsd ||
        null,

      liquidityUsd:
        safeNumber(
          pair?.liquidity?.usd
        ),

      marketCap:
        safeNumber(
          pair?.marketCap
        ) ||
        null,

      fdv:
        safeNumber(
          pair?.fdv
        ) ||
        null,

      volume: {
        m5:
          safeNumber(
            pair?.volume?.m5
          ),

        h1:
          safeNumber(
            pair?.volume?.h1
          ),

        h24:
          safeNumber(
            pair?.volume?.h24
          )
      },

      transactions: {
        m5: txM5,
        h1: txH1,
        h24: txH24
      },

      buyPressure5m:
        txM5.buyPressure,

      buyPressure1h:
        txH1.buyPressure,

      buyPressure24h:
        txH24.buyPressure,

      directionalFlow: {
        m5: {
          verified:
            txM5.directionalUsdVerified,
          buyVolumeUsd:
            txM5.buyVolumeUsd,
          sellVolumeUsd:
            txM5.sellVolumeUsd,
          netFlowUsd:
            txM5.netFlowUsd
        },
        h1: {
          verified:
            txH1.directionalUsdVerified,
          buyVolumeUsd:
            txH1.buyVolumeUsd,
          sellVolumeUsd:
            txH1.sellVolumeUsd,
          netFlowUsd:
            txH1.netFlowUsd
        },
        h24: {
          verified:
            txH24.directionalUsdVerified,
          buyVolumeUsd:
            txH24.buyVolumeUsd,
          sellVolumeUsd:
            txH24.sellVolumeUsd,
          netFlowUsd:
            txH24.netFlowUsd
        }
      },

      pairCreatedAt:
        safeNumber(
          pair?.pairCreatedAt
        ) ||
        null,

      imageUrl:
        pair?.info?.imageUrl ||
        pair?.info?.header ||
        null
    };

    registerDexSuccessV147(
      service,
      "VERIFIED"
    );

    saveMarketCache(
      watched,
      result
    );

    return result;
  }

  catch (error) {
    service.lastStatus =
      "DEXSCREENER_ERROR";

    return {
      verified:
        false,

      status:
        "DEXSCREENER_ERROR",

      error:
        errorString(
          error
        )
    };
  }
}

/* =========================================================
   BLOCKSCOUT
   ========================================================= */

async function blockscout(
  path,
  budget
) {
  if (
    !consumeBudget(
      budget,
      "analysis",
      "BLOCKSCOUT"
    )
  ) {
    return null;
  }

  try {
    const response =
      await fetch(
        BLOCKSCOUT +
          path,

        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    return await response.json();
  }

  catch {
    return null;
  }
}


async function blockscoutLegacyHolders(
  token,
  budget
) {
  if (
    !consumeBudget(
      budget,
      "analysis",
      "BLOCKSCOUT_LEGACY_HOLDERS"
    )
  ) {
    return null;
  }

  try {
    const url =
      `${BLOCKSCOUT}/api?module=token&action=getTokenHolders&contractaddress=${token}&page=1&offset=10`;

    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(
        data.result
      )
    ) {
      return null;
    }

    return {
      items:
        data.result.map(
          item => ({
            address:
              item?.address ||
              null,
            value:
              item?.value ||
              "0"
          })
        ),
      legacy:
        true
    };
  }

  catch {
    return null;
  }
}



function blockscoutProServiceV145(
  state
) {
  state.services =
    state.services ||
    {};

  state.services.blockscoutPro =
    state.services.blockscoutPro ||
    {
      lastStatus: null,
      lastSuccessAt: null,
      lastFailureAt: null,
      cooldownUntil: null,
      totalTransientFailures: 0,
      consecutiveTransientFailures: 0,
      totalRequests: 0
    };

  return state.services.blockscoutPro;
}

function blockscoutProOutageTelemetryV145(
  state
) {
  const service =
    blockscoutProServiceV145(
      state
    );

  const now =
    Date.now();

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    ) || null;

  return {
    lastStatus:
      service.lastStatus ||
      null,
    lastSuccessAt:
      safeNumber(
        service.lastSuccessAt
      ) || null,
    lastFailureAt:
      safeNumber(
        service.lastFailureAt
      ) || null,
    cooldownUntil,
    cooldownActive:
      Boolean(
        cooldownUntil &&
        cooldownUntil > now
      ),
    retryAfterMs:
      cooldownUntil &&
      cooldownUntil > now
        ? cooldownUntil - now
        : 0,
    totalTransientFailures:
      safeNumber(
        service.totalTransientFailures
      ),
    consecutiveTransientFailures:
      safeNumber(
        service.consecutiveTransientFailures
      ),
    totalRequests:
      safeNumber(
        service.totalRequests
      )
  };
}


function blockscoutPro404RetryV146(
  watched
) {
  const raw =
    watched?.blockscoutPro404RetryV146;

  if (
    !raw ||
    typeof raw !==
      "object"
  ) {
    return {
      active:
        false,
      retryUntil:
        null,
      retryAfterMs:
        0,
      last404At:
        null,
      total404s:
        0
    };
  }

  const retryUntil =
    safeNumber(
      raw.retryUntil
    ) || null;

  const now =
    Date.now();

  return {
    active:
      Boolean(
        retryUntil &&
        retryUntil > now
      ),
    retryUntil,
    retryAfterMs:
      retryUntil &&
      retryUntil > now
        ? retryUntil - now
        : 0,
    last404At:
      safeNumber(
        raw.last404At
      ) || null,
    total404s:
      safeNumber(
        raw.total404s
      )
  };
}

function setBlockscoutPro404RetryV146(
  watched
) {
  if (!watched) {
    return null;
  }

  const previous =
    blockscoutPro404RetryV146(
      watched
    );

  const now =
    Date.now();

  watched.blockscoutPro404RetryV146 = {
    retryUntil:
      now +
      BLOCKSCOUT_PRO_404_RETRY_MS_V146,
    last404At:
      now,
    total404s:
      previous.total404s + 1
  };

  return blockscoutPro404RetryV146(
    watched
  );
}

function clearBlockscoutPro404RetryV146(
  watched
) {
  if (
    watched &&
    watched.blockscoutPro404RetryV146
  ) {
    delete watched.blockscoutPro404RetryV146;
  }
}

async function blockscoutProHoldersV143(
  token,
  budget,
  env,
  state,
  watched
) {
  const apiKey =
    String(
      env?.BLOCKSCOUT_PRO_API_KEY ||
      ""
    ).trim();

  if (
    !apiKey
  ) {
    return {
      configured: false,
      attempted: false,
      success: false,
      status:
        "BLOCKSCOUT_PRO_NOT_CONFIGURED",
      data: null
    };
  }

  const proServiceV145 =
    blockscoutProServiceV145(
      state
    );

  const existingCooldownUntilV145 =
    safeNumber(
      proServiceV145.cooldownUntil
    );

  if (
    existingCooldownUntilV145 &&
    existingCooldownUntilV145 >
      Date.now()
  ) {
    return {
      configured: true,
      attempted: false,
      success: false,
      status:
        "BLOCKSCOUT_PRO_COOLDOWN_V145",
      cooldownUntil:
        existingCooldownUntilV145,
      retryAfterMs:
        existingCooldownUntilV145 -
        Date.now(),
      data: null
    };
  }

  const token404RetryV146 =
    blockscoutPro404RetryV146(
      watched
    );

  if (
    token404RetryV146.active
  ) {
    return {
      configured: true,
      attempted: false,
      success: false,
      status:
        "BLOCKSCOUT_PRO_404_RETRY_DELAY_V146",
      http404V146:
        true,
      retryUntilV146:
        token404RetryV146.retryUntil,
      retryAfterMs:
        token404RetryV146.retryAfterMs,
      data: null
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "BLOCKSCOUT_PRO_HOLDERS_V143"
    )
  ) {
    return {
      configured: true,
      attempted: false,
      success: false,
      status:
        "ANALYSIS_BUDGET_UNAVAILABLE",
      data: null
    };
  }

  try {
    proServiceV145.totalRequests =
      safeNumber(
        proServiceV145.totalRequests
      ) + 1;

    const url =
      `${BLOCKSCOUT_PRO}/${BLOCKSCOUT_PRO_CHAIN_ID}/api/v2/tokens/${token}/holders?apikey=${encodeURIComponent(apiKey)}`;

    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (
      !response.ok
    ) {
      const status =
        `HTTP_${response.status}`;

      const transientOutageV145 =
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504;

      const http404V146 =
        response.status ===
        404;

      proServiceV145.lastStatus =
        status;

      proServiceV145.lastFailureAt =
        Date.now();

      let token404StateV146 =
        null;

      if (
        http404V146
      ) {
        token404StateV146 =
          setBlockscoutPro404RetryV146(
            watched
          );
      }

      if (
        transientOutageV145
      ) {
        proServiceV145.totalTransientFailures =
          safeNumber(
            proServiceV145.totalTransientFailures
          ) + 1;

        proServiceV145.consecutiveTransientFailures =
          safeNumber(
            proServiceV145.consecutiveTransientFailures
          ) + 1;

        proServiceV145.cooldownUntil =
          Date.now() +
          BLOCKSCOUT_PRO_OUTAGE_COOLDOWN_MS_V145;
      }

      return {
        configured: true,
        attempted: true,
        success: false,
        status:
          http404V146
            ? "BLOCKSCOUT_PRO_HOLDER_DATA_UNAVAILABLE_404_V146"
            : status,
        httpStatus:
          response.status,
        http404V146,
        transientOutageV145,
        cooldownUntil:
          safeNumber(
            proServiceV145.cooldownUntil
          ) || null,
        retryUntilV146:
          token404StateV146
            ?.retryUntil ||
          null,
        retryAfterMs:
          token404StateV146
            ?.retryAfterMs ||
          0,
        data: null
      };
    }

    const data =
      await response.json();

    if (
      !data ||
      !Array.isArray(
        data.items
      )
    ) {
      return {
        configured: true,
        attempted: true,
        success: false,
        status:
          "INVALID_RESPONSE",
        data: null
      };
    }

    clearBlockscoutPro404RetryV146(
      watched
    );

    proServiceV145.lastStatus =
      "VERIFIED_RESPONSE";

    proServiceV145.lastSuccessAt =
      Date.now();

    proServiceV145.cooldownUntil =
      null;

    proServiceV145.consecutiveTransientFailures =
      0;

    return {
      configured: true,
      attempted: true,
      success: true,
      status:
        "VERIFIED_RESPONSE",
      data: {
        ...data,
        proV143:
          true
      }
    };
  }

  catch (error) {
    proServiceV145.lastStatus =
      "FETCH_ERROR";

    proServiceV145.lastFailureAt =
      Date.now();

    return {
      configured: true,
      attempted: true,
      success: false,
      status:
        "FETCH_ERROR",
      error:
        errorString(
          error
        ),
      data: null
    };
  }
}

function extractCounterData(
  data
) {
  if (
    !data ||
    typeof data !==
      "object"
  ) {
    return {
      holderCount:
        null,

      transferCount:
        null
    };
  }

  const holderRaw =
    data.token_holders_count ??
    data.holders_count ??
    data.holders ??
    data.holder_count ??
    null;

  const transferRaw =
    data.transfers_count ??
    data.token_transfers_count ??
    data.transfer_count ??
    null;

  const holderNumber =
    Number(
      holderRaw
    );

  const transferNumber =
    Number(
      transferRaw
    );

  return {
    holderCount:
      Number.isFinite(
        holderNumber
      )
        ? holderNumber
        : null,

    transferCount:
      Number.isFinite(
        transferNumber
      )
        ? transferNumber
        : null
  };
}

/* =========================================================
   HOLDER HELPERS
   ========================================================= */

function holderPercent(
  value,
  supply
) {
  try {
    const held =
      BigInt(
        String(
          value
        )
      );

    const total =
      BigInt(
        String(
          supply
        )
      );

    if (
      held < 0n ||
      total <= 0n ||
      held >
        total
    ) {
      return null;
    }

    const percentage =
      Number(
        held *
          100000000n /
          total
      ) /
      1000000;

    if (
      !Number.isFinite(
        percentage
      ) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return null;
    }

    return percentage;
  }

  catch {
    return null;
  }
}

function extractHolderAddress(
  item
) {
  if (
    typeof item?.address ===
      "string"
  ) {
    return item.address;
  }

  if (
    typeof item?.address?.hash ===
      "string"
  ) {
    return item.address.hash;
  }

  if (
    typeof item?.address_hash ===
      "string"
  ) {
    return item.address_hash;
  }

  return null;
}

function extractHolderValue(
  item
) {
  const value =
    item?.value ??
    item?.token?.value ??
    item?.balance ??
    item?.token_balance ??
    null;

  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return "0";
  }

  return String(
    value
  );
}

function positiveHolderBalance(
  holder
) {
  try {
    return (
      BigInt(
        String(
          holder?.value ||
          "0"
        )
      ) >
      0n
    );
  }

  catch {
    return false;
  }
}

function infrastructureHolderReason(
  holderAddress,
  tokenAddress,
  verifiedPairAddress = null
) {
  const address =
    normalize(
      holderAddress
    );

  const token =
    normalize(
      tokenAddress
    );

  const pair =
    normalize(
      verifiedPairAddress
    );

  if (!address) {
    return null;
  }

  if (
    address ===
    normalize(
      POOL_MANAGER
    )
  ) {
    return "UNISWAP_V4_POOL_MANAGER";
  }

  if (
    address ===
    ZERO
  ) {
    return "ZERO_ADDRESS";
  }

  if (
    address ===
    DEAD
  ) {
    return "DEAD_ADDRESS";
  }

  if (
    token &&
    address ===
      token
  ) {
    return "TOKEN_CONTRACT";
  }

  /*
   * V128:
   * Only a pair address supplied by a VERIFIED market result is accepted here.
   * The caller never passes an unverified / guessed pool address.
   */
  if (
    pair &&
    address ===
      pair
  ) {
    return "VERIFIED_MARKET_PAIR_OR_POOL";
  }

  return null;
}

/* =========================================================
   HOLDER INTEGRITY — V97
   ========================================================= */

/*
 * V97:
 * Blockscout can occasionally return duplicate holder rows while
 * indexing a young token. Summing duplicate rows can incorrectly
 * produce >100% of totalSupply.
 *
 * Safety rule:
 * - normalize by address
 * - for duplicate addresses keep the largest observed balance
 * - never add duplicate balances together
 * - unresolved >100% data still remains UNVERIFIED
 */
function normalizeHolderRows(
  rawHolders
) {
  const byAddress =
    new Map();

  const anonymous =
    [];

  for (
    const item
    of Array.isArray(
      rawHolders
    )
      ? rawHolders
      : []
  ) {
    const address =
      normalize(
        extractHolderAddress(
          item
        )
      );

    if (!address) {
      anonymous.push(
        item
      );
      continue;
    }

    let value =
      0n;

    try {
      value =
        BigInt(
          extractHolderValue(
            item
          )
        );
    }

    catch {
      anonymous.push(
        item
      );
      continue;
    }

    const existing =
      byAddress.get(
        address
      );

    if (!existing) {
      byAddress.set(
        address,
        item
      );
      continue;
    }

    let existingValue =
      0n;

    try {
      existingValue =
        BigInt(
          extractHolderValue(
            existing
          )
        );
    }

    catch {}

    if (
      value >
      existingValue
    ) {
      byAddress.set(
        address,
        item
      );
    }
  }

  return [
    ...byAddress.values(),
    ...anonymous
  ];
}

function validateHolderIntegrity(
  rawHolders,
  totalSupply
) {
  let supply;

  try {
    supply =
      BigInt(
        String(
          totalSupply
        )
      );
  }

  catch {
    return {
      verified:
        false,

      status:
        "INVALID_TOTAL_SUPPLY",

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        String(
          totalSupply ||
          ""
        ),

      topHolderBalanceSum:
        null
    };
  }

  if (
    supply <=
    0n
  ) {
    return {
      verified:
        false,

      status:
        "INVALID_TOTAL_SUPPLY",

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        null
    };
  }

  let balanceSum =
    0n;

  let impossibleBalanceCount =
    0;

  for (
    const item
    of rawHolders
  ) {
    try {
      const value =
        BigInt(
          extractHolderValue(
            item
          )
        );

      if (
        value < 0n ||
        value >
          supply
      ) {
        impossibleBalanceCount++;

        continue;
      }

      balanceSum +=
        value;
    }

    catch {
      impossibleBalanceCount++;
    }
  }

  const percentageSum =
    Number(
      balanceSum *
        100000000n /
        supply
    ) /
    1000000;

  if (
    impossibleBalanceCount >
    0
  ) {
    return {
      verified:
        false,

      status:
        "IMPOSSIBLE_HOLDER_BALANCE",

      impossibleBalanceCount,

      percentageSum,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  if (
    balanceSum >
      supply ||
    percentageSum >
      100.000001
  ) {
    return {
      verified:
        false,

      status:
        "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY",

      impossibleBalanceCount,

      percentageSum,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  return {
    verified:
      true,

    status:
      "VERIFIED",

    impossibleBalanceCount:
      0,

    percentageSum,

    supply:
      supply.toString(),

    topHolderBalanceSum:
      balanceSum.toString()
  };
}

function unverifiedHolders(
  reason =
    "NOT_VERIFIED"
) {
  return {
    verified:
      false,

    countersVerified:
      false,

    concentrationVerified:
      false,

    integrity: {
      verified:
        false,

      status:
        reason,

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        null,

      ownershipSupply:
        null,

      infrastructureBalanceSum:
        null,

      infrastructureRows:
        0,

      topHolderBalanceSum:
        null
    },

    holderCount:
      null,

    transferCount:
      null,

    topHolders:
      [],

    infrastructureHolders:
      [],

    positiveHolderRows:
      0,

    whale: {
      verified:
        false,

      whaleCount:
        null,

      top1Percent:
        null,

      top5Percent:
        null,

      top10Percent:
        null,

      concentrationRisk:
        "UNVERIFIED",

      smartMoneyScore:
        0,

      smartMoneyCandidate:
        false
    }
  };
}

/* =========================================================
   V91 HOLDER CACHE
   ========================================================= */

function cachedHolderIntelligence(
  watched,
  maxAge
) {
  const cache =
    watched?.holderCache;

  if (
    !cache ||
    typeof cache !==
      "object"
  ) {
    return null;
  }

  const timestamp =
    safeNumber(
      cache.timestamp
    );

  if (
    !timestamp ||
    Date.now() - timestamp >
      maxAge
  ) {
    return null;
  }

  if (
    !cache.data ||
    typeof cache.data !==
      "object"
  ) {
    return null;
  }

  return {
    ...cache.data,
    cached:
      true,
    holderCacheAgeMs:
      Date.now() - timestamp
  };
}

function saveHolderIntelligence(
  watched,
  data
) {
  if (
    !watched ||
    !data ||
    typeof data !==
      "object"
  ) {
    return;
  }

  if (
    !data.countersVerified &&
    !data.concentrationVerified
  ) {
    return;
  }

  watched.holderCache = {
    timestamp:
      Date.now(),
    data: {
      ...data,
      cached:
        false,
      holderCacheAgeMs:
        0
    }
  };
}

function cachedPartialHolderStateV149(
  watched,
  verifiedPairAddress = null
) {
  const cache =
    watched?.partialHolderCacheV149;

  if (
    !cache ||
    typeof cache !==
      "object"
  ) {
    return null;
  }

  const timestamp =
    safeNumber(
      cache.timestamp
    );

  if (
    !timestamp ||
    Date.now() - timestamp >
      HOLDER_PARTIAL_RETRY_MS_V149
  ) {
    return null;
  }

  const cachedPairBasis =
    normalize(
      cache.verifiedPairAddress ||
      ""
    ) || null;

  const currentPairBasis =
    normalize(
      verifiedPairAddress ||
      ""
    ) || null;

  if (
    cachedPairBasis !==
      currentPairBasis
  ) {
    return null;
  }

  if (
    !cache.data ||
    typeof cache.data !==
      "object"
  ) {
    return null;
  }

  const status =
    cache.data
      ?.integrity
      ?.status;

  if (
    status !==
      "NO_POSITIVE_OWNERSHIP_BALANCES" &&
    status !==
      "NO_POSITIVE_OWNERSHIP_SUPPLY"
  ) {
    return null;
  }

  return {
    ...cache.data,

    verified:
      Boolean(
        cache.data
          .countersVerified
      ),

    concentrationVerified:
      false,

    holderSource:
      `PARTIAL_CACHE_V149:${cache.source || "UNKNOWN"}`,

    partialHolderCacheV149: {
      reused:
        true,
      originalSource:
        cache.source ||
        null,
      cachedAt:
        timestamp,
      cacheAgeMs:
        Date.now() -
        timestamp,
      retryAt:
        timestamp +
        HOLDER_PARTIAL_RETRY_MS_V149,
      retryAfterMs:
        Math.max(
          0,
          timestamp +
            HOLDER_PARTIAL_RETRY_MS_V149 -
            Date.now()
        ),
      concentrationStillUnverified:
        true
    }
  };
}

function savePartialHolderStateV149(
  watched,
  data,
  holderSource,
  verifiedPairAddress = null
) {
  if (
    !watched ||
    !data ||
    typeof data !==
      "object"
  ) {
    return;
  }

  const status =
    data?.integrity?.status;

  if (
    status !==
      "NO_POSITIVE_OWNERSHIP_BALANCES" &&
    status !==
      "NO_POSITIVE_OWNERSHIP_SUPPLY"
  ) {
    return;
  }

  watched.partialHolderCacheV149 = {
    timestamp:
      Date.now(),

    source:
      holderSource ||
      null,

    verifiedPairAddress:
      normalize(
        verifiedPairAddress ||
        ""
      ) || null,

    data: {
      ...data,

      concentrationVerified:
        false,

      holderSource:
        holderSource ||
        data.holderSource ||
        null
    }
  };
}

function clearPartialHolderStateV149(
  watched
) {
  if (
    watched &&
    watched.partialHolderCacheV149
  ) {
    delete watched.partialHolderCacheV149;
  }
}

/* =========================================================
   HOLDER INTELLIGENCE — V88
   ========================================================= */

async function holderIntelligence(
  token,
  totalSupply,
  budget,
  watched,
  market = null,
  priorityCompletion = false,
  env = null,
  state = null
) {
  if (
    !totalSupply
  ) {
    return unverifiedHolders(
      "TOTAL_SUPPLY_UNAVAILABLE"
    );
  }

  const verifiedPairAddress =
    market?.verified ===
      true
      ? normalize(
          market.pairAddress
        )
      : null;

  const freshHolderCache =
    cachedHolderIntelligence(
      watched,
      HOLDER_CACHE_MS
    );

  /*
   * V128:
   * Old cache entries may have been created before LP/pair infrastructure
   * exclusion existed. If the now-verified pair address is present as an
   * ordinary holder, bypass that cache exactly once and rebuild holder
   * concentration from Blockscout. The corrected result is then cached.
   */
  const cachedPairMisclassified =
    Boolean(
      freshHolderCache &&
      verifiedPairAddress &&
      Array.isArray(
        freshHolderCache.topHolders
      ) &&
      freshHolderCache.topHolders.some(
        holder =>
          normalize(
            holder?.address
          ) ===
            verifiedPairAddress &&
          holder?.infrastructure !==
            true
      )
    );

  if (
    freshHolderCache &&
    !cachedPairMisclassified
  ) {
    return {
      ...freshHolderCache,
      holderSource:
        "CACHE"
    };
  }

  /*
   * V149: repeated newly-launched PoolManager-dominant holder responses can
   * contain no usable external ownership rows yet. Reuse that unverified
   * state briefly instead of repeating the same holder API work every scan.
   * This cache never upgrades concentration verification.
   */
  const partialHolderStateV149 =
    cachedPartialHolderStateV149(
      watched,
      verifiedPairAddress
    );

  if (
    partialHolderStateV149
  ) {
    return partialHolderStateV149;
  }

  /*
   * V134 same-run outage circuit breaker.
   *
   * V133 guarantees the priority candidate is analysed first. If that first
   * candidate proves both Blockscout holder routes unavailable, do not spend
   * more analysis requests repeating the same holder calls on lower-ranked
   * candidates in the same scan.
   *
   * Safety rule: stale holder data can preserve previously VERIFIED evidence,
   * but missing evidence never becomes healthy/verified evidence.
   */
  if (
    budget
      ?.blockscoutHolderOutage
      ?.active ===
      true &&
    !priorityCompletion
  ) {
    const staleHolderCache =
      cachedHolderIntelligence(
        watched,
        HOLDER_STALE_CACHE_MS
      );

    if (
      staleHolderCache
    ) {
      budget
        .blockscoutHolderOutage
        .lowerPriorityCacheFallbacks =
        safeNumber(
          budget
            .blockscoutHolderOutage
            .lowerPriorityCacheFallbacks
        ) +
        1;

      return {
        ...staleHolderCache,

        holderSource:
          "STALE_CACHE_BLOCKSCOUT_RUN_OUTAGE",

        blockscoutUnavailable:
          true,

        blockscoutRunCircuitBreaker:
          true
      };
    }

    budget
      .blockscoutHolderOutage
      .lowerPriorityFreshRequestsSuppressed =
      safeNumber(
        budget
          .blockscoutHolderOutage
          .lowerPriorityFreshRequestsSuppressed
      ) +
      1;

    return {
      ...unverifiedHolders(
        "BLOCKSCOUT_HOLDER_OUTAGE_DEFERRED"
      ),

      blockscoutUnavailable:
        true,

      blockscoutRunCircuitBreaker:
        true,

      holderSource:
        "BLOCKSCOUT_OUTAGE_DEFERRED"
    };
  }

  /*
   * V89 request order:
   * 1. holder rows (needed for concentration)
   * 2. token details (usually enough for counters)
   * 3. counters endpoint only when rows exist and details
   *    did not expose counters.
   *
   * During a Blockscout holder outage this normally uses
   * only two requests instead of three.
   */
  let holders =
    null;

  let v2HolderRowsUnavailable =
    false;

  let legacyHolderRowsUnavailable =
    false;

  let blockscoutProHolderFallbackV143 = {
    configured:
      Boolean(
        String(
          env?.BLOCKSCOUT_PRO_API_KEY ||
          ""
        ).trim()
      ),
    attempted: false,
    success: false,
    status:
      String(
        env?.BLOCKSCOUT_PRO_API_KEY ||
        ""
      ).trim()
        ? "NOT_NEEDED_YET"
        : "BLOCKSCOUT_PRO_NOT_CONFIGURED"
  };

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    holders =
      await blockscout(
        `/api/v2/tokens/${token}/holders`,
        budget
      );

    v2HolderRowsUnavailable =
      !holders ||
      !Array.isArray(
        holders.items
      );
  }

  let details =
    null;

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    details =
      await blockscout(
        `/api/v2/tokens/${token}`,
        budget
      );
  }

  let counterData =
    extractCounterData(
      details
    );

  let counterSource =
    details
      ? "TOKEN_DETAILS_FALLBACK"
      : null;

  /*
   * V95: counters are useful even if the V2 holder-row endpoint
   * is temporarily unavailable. Do not tie counter recovery to
   * successful holder-row retrieval.
   */
  if (
    (
      counterData.holderCount ===
        null ||
      counterData.transferCount ===
        null
    ) &&
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    const counters =
      await blockscout(
        `/api/v2/tokens/${token}/counters`,
        budget
      );

    if (counters) {
      const fallback =
        extractCounterData(
          counters
        );

      if (
        counterData.holderCount ===
        null
      ) {
        counterData.holderCount =
          fallback.holderCount;
      }

      if (
        counterData.transferCount ===
        null
      ) {
        counterData.transferCount =
          fallback.transferCount;
      }

      counterSource =
        "COUNTERS_ENDPOINT";
    }
  }

  /*
   * V95: Blockscout documents a legacy token-holder endpoint.
   * Use it only when V2 holder rows are unavailable and budget
   * remains. The returned rows are normalized into the same
   * shape used by the existing concentration/integrity logic.
   */
  if (
    (
      !holders ||
      !Array.isArray(
        holders.items
      )
    ) &&
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    const legacyHolders =
      await blockscoutLegacyHolders(
        token,
        budget
      );

    if (
      legacyHolders &&
      Array.isArray(
        legacyHolders.items
      )
    ) {
      holders =
        legacyHolders;

      legacyHolderRowsUnavailable =
        false;
    }

    else {
      legacyHolderRowsUnavailable =
        true;
    }
  }


  /*
   * V143:
   * Public Blockscout remains first choice. Only after both public holder-row
   * routes fail do we spend one protected analysis request on PRO, and only
   * when a key has been configured.
   */
  if (
    v2HolderRowsUnavailable &&
    legacyHolderRowsUnavailable &&
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    const proResult =
      await blockscoutProHoldersV143(
        token,
        budget,
        env,
        state,
        watched
      );

    blockscoutProHolderFallbackV143 = {
      configured:
        proResult.configured,
      attempted:
        proResult.attempted,
      success:
        proResult.success,
      status:
        proResult.status,
      transientOutageV145:
        Boolean(
          proResult.transientOutageV145
        ),
      cooldownUntil:
        proResult.cooldownUntil ??
        null,
      retryAfterMs:
        safeNumber(
          proResult.retryAfterMs
        ),
      http404V146:
        Boolean(
          proResult.http404V146
        ),
      httpStatus:
        safeNumber(
          proResult.httpStatus
        ) || null,
      retryUntilV146:
        proResult.retryUntilV146 ??
        null
    };

    if (
      proResult.success &&
      proResult.data &&
      Array.isArray(
        proResult.data.items
      )
    ) {
      holders =
        proResult.data;

      v2HolderRowsUnavailable =
        false;

      legacyHolderRowsUnavailable =
        false;
    }
  }

  /*
   * V134/V143: open the same-run circuit only after the public holder-row
   * paths and any configured PRO fallback have failed. Token details/counters
   * may still be healthy and are not treated
   * as proof that holder concentration is available.
   */
  if (
    v2HolderRowsUnavailable &&
    legacyHolderRowsUnavailable
  ) {
    if (
      !budget.blockscoutHolderOutage ||
      typeof budget.blockscoutHolderOutage !==
        "object"
    ) {
      budget.blockscoutHolderOutage = {
        active:
          false,

        detectedAt:
          null,

        detectedToken:
          null,

        lowerPriorityFreshRequestsSuppressed:
          0,

        lowerPriorityCacheFallbacks:
          0
      };
    }

    budget
      .blockscoutHolderOutage
      .active =
      true;

    budget
      .blockscoutHolderOutage
      .detectedAt =
      Date.now();

    budget
      .blockscoutHolderOutage
      .detectedToken =
      normalize(
        token
      );
  }

  const holderCount =
    counterData.holderCount;

  const transferCount =
    counterData.transferCount;

  const countersVerified =
    holderCount !==
      null ||
    transferCount !==
      null;

  if (
    !holders ||
    !Array.isArray(
      holders.items
    )
  ) {
    const staleHolderCache =
      cachedHolderIntelligence(
        watched,
        HOLDER_STALE_CACHE_MS
      );

    if (staleHolderCache) {
      return {
        ...staleHolderCache,
        holderSource:
          "STALE_CACHE_BLOCKSCOUT_OUTAGE",
        blockscoutUnavailable:
          true,
        blockscoutProHolderFallbackV143
      };
    }

    return {
      ...unverifiedHolders(
        "BLOCKSCOUT_HOLDERS_UNAVAILABLE"
      ),

      verified:
        countersVerified,

      countersVerified,

      counterSource,

      holderCount,

      transferCount,

      holderSource:
        "BLOCKSCOUT",
      blockscoutProHolderFallbackV143
    };
  }

  if (
    holders.items.length ===
    0
  ) {
    const emptyHolderSourceV144 =
      holders?.proV143
        ? "BLOCKSCOUT_PRO_V143"
        : holders?.legacy
          ? "BLOCKSCOUT_LEGACY"
          : "BLOCKSCOUT_V2";

    return {
      ...unverifiedHolders(
        "NO_HOLDER_ROWS"
      ),

      verified:
        countersVerified,

      countersVerified,

      counterSource,

      holderCount,

      transferCount,

      holderSource:
        emptyHolderSourceV144,

      blockscoutProHolderFallbackV143
    };
  }

  const holderSource =
    holders?.proV143
      ? "BLOCKSCOUT_PRO_V143"
      : holders?.legacy
        ? "BLOCKSCOUT_LEGACY"
        : "BLOCKSCOUT_V2";

  const rawItems =
    holders.items.slice(
      0,
      25
    );

  const items =
    normalizeHolderRows(
      rawItems
    )
      .slice(
        0,
        10
      );

  const duplicateHolderRowsRemoved =
    Math.max(
      0,
      rawItems.length -
      normalizeHolderRows(
        rawItems
      ).length
    );

  const integrity =
    validateHolderIntegrity(
      items,
      totalSupply
    );

  if (
    duplicateHolderRowsRemoved >
      0
  ) {
    integrity.duplicateHolderRowsRemoved =
      duplicateHolderRowsRemoved;
  }

  if (
    !integrity.verified
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity,

      holderCount,

      transferCount,

      topHolders:
        [],

      infrastructureHolders:
        [],

      positiveHolderRows:
        0,

      holderSource,

      blockscoutProHolderFallbackV143,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false,

        reason:
          integrity.status
      }
    };
  }

  let supply;

  try {
    supply =
      BigInt(
        String(
          totalSupply
        )
      );
  }

  catch {
    return unverifiedHolders(
      "INVALID_TOTAL_SUPPLY"
    );
  }

  let infrastructureBalanceSum =
    0n;

  const prepared =
    items.map(
      item => {
        const address =
          extractHolderAddress(
            item
          );

        const value =
          extractHolderValue(
            item
          );

        let valueBig =
          0n;

        try {
          valueBig =
            BigInt(
              value
            );
        }

        catch {}

        const infrastructureReason =
          infrastructureHolderReason(
            address,
            token,
            verifiedPairAddress
          );

        if (
          infrastructureReason &&
          valueBig >
            0n
        ) {
          infrastructureBalanceSum +=
            valueBig;
        }

        return {
          address,

          value,

          valueBig,

          infrastructureReason
        };
      }
    );

  const ownershipSupply =
    supply -
    infrastructureBalanceSum;

  if (
    ownershipSupply <=
    0n
  ) {
    const partialResultV149 = {
      ...unverifiedHolders(
        "NO_POSITIVE_OWNERSHIP_SUPPLY"
      ),

      verified:
        countersVerified,

      countersVerified,

      counterSource,

      holderCount,

      transferCount,

      holderSource,

      blockscoutProHolderFallbackV143,

      partialHolderStateV149: {
        status:
          "NO_POSITIVE_OWNERSHIP_SUPPLY",
        concentrationStillUnverified:
          true,
        retryMs:
          HOLDER_PARTIAL_RETRY_MS_V149
      }
    };

    savePartialHolderStateV149(
      watched,
      partialResultV149,
      holderSource,
      verifiedPairAddress
    );

    return partialResultV149;
  }

  const topHolders =
    prepared.map(
      holder => ({
        address:
          holder.address,

        value:
          holder.value,

        percentage:
          holder.infrastructureReason
            ? null
            : holderPercent(
                holder.value,
                ownershipSupply.toString()
              ),

        rawSupplyPercentage:
          holderPercent(
            holder.value,
            supply.toString()
          ),

        infrastructure:
          Boolean(
            holder.infrastructureReason
          ),

        infrastructureReason:
          holder.infrastructureReason
      })
    );

  const infrastructureHolders =
    topHolders.filter(
      holder =>
        holder.infrastructure
    );

  const positiveHolders =
    topHolders.filter(
      holder =>
        !holder.infrastructure &&
        holder.address &&
        holder.percentage !==
          null &&
        positiveHolderBalance(
          holder
        )
    );

  if (
    positiveHolders.length ===
    0
  ) {
    const partialResultV149 = {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "NO_POSITIVE_OWNERSHIP_BALANCES",

        ownershipSupply:
          ownershipSupply.toString(),

        infrastructureBalanceSum:
          infrastructureBalanceSum.toString(),

        infrastructureRows:
          infrastructureHolders.length
      },

      holderCount,

      transferCount,

      topHolders,

      infrastructureHolders,

      positiveHolderRows:
        0,

      holderSource,

      blockscoutProHolderFallbackV143,

      partialHolderStateV149: {
        status:
          "NO_POSITIVE_OWNERSHIP_BALANCES",
        concentrationStillUnverified:
          true,
        retryMs:
          HOLDER_PARTIAL_RETRY_MS_V149
      },

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false
      }
    };

    savePartialHolderStateV149(
      watched,
      partialResultV149,
      holderSource,
      verifiedPairAddress
    );

    return partialResultV149;
  }

  positiveHolders.sort(
    (a, b) =>
      safeNumber(
        b.percentage
      ) -
      safeNumber(
        a.percentage
      )
  );

  const percentages =
    positiveHolders
      .map(
        holder =>
          holder.percentage
      )
      .filter(
        value =>
          Number.isFinite(
            value
          ) &&
          value >= 0 &&
          value <= 100
      );

  if (
    !percentages.length
  ) {
    return {
      ...unverifiedHolders(
        "NO_VALID_OWNERSHIP_PERCENTAGES"
      ),

      verified:
        countersVerified,

      countersVerified,

      counterSource,

      holderCount,

      transferCount
    };
  }

  const top1 =
    percentages[0];

  const top5 =
    percentages
      .slice(
        0,
        5
      )
      .reduce(
        (
          a,
          b
        ) =>
          a + b,
        0
      );

  const top10 =
    percentages
      .slice(
        0,
        10
      )
      .reduce(
        (
          a,
          b
        ) =>
          a + b,
        0
      );

  if (
    top5 >
      100.000001 ||
    top10 >
      100.000001
  ) {
    return {
    holderSource,
    blockscoutProHolderFallbackV143,
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "OWNERSHIP_PERCENTAGE_SUM_EXCEEDS_100"
      },

      holderCount,

      transferCount,

      topHolders,

      infrastructureHolders,

      positiveHolderRows:
        positiveHolders.length,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false
      }
    };
  }

  const whales =
    positiveHolders.filter(
      holder =>
        holder.percentage >=
        1
    );

  let concentrationRisk =
    "LOW";

  if (
    top1 >= 20 ||
    top10 >= 80
  ) {
    concentrationRisk =
      "HIGH";
  }

  else if (
    top1 >= 10 ||
    top10 >= 60
  ) {
    concentrationRisk =
      "MEDIUM";
  }

  let smartMoneyScore =
    0;

  if (
    whales.length >=
    2
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    whales.length >=
    4
  ) {
    smartMoneyScore +=
      15;
  }

  if (
    top10 >
      0 &&
    top10 <=
      60
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    top1 <=
    15
  ) {
    smartMoneyScore +=
      15;
  }

  if (
    concentrationRisk ===
    "HIGH"
  ) {
    smartMoneyScore =
      Math.min(
        smartMoneyScore,
        25
      );
  }

  const result = {
    verified:
      true,

    holderSource,

    blockscoutProHolderFallbackV143,

    countersVerified,

    counterSource,

    concentrationVerified:
      true,

    integrity: {
      ...integrity,

      ownershipSupply:
        ownershipSupply.toString(),

      infrastructureBalanceSum:
        infrastructureBalanceSum.toString(),

      infrastructureRows:
        infrastructureHolders.length,

      ownershipConcentrationBasis:
        "TOTAL_SUPPLY_MINUS_KNOWN_INFRASTRUCTURE"
    },

    holderCount,

    transferCount,

    topHolders,

    infrastructureHolders,

    positiveHolderRows:
      positiveHolders.length,

    verifiedPairInfrastructureApplied:
      Boolean(
        verifiedPairAddress &&
        infrastructureHolders.some(
          holder =>
            normalize(
              holder.address
            ) ===
            verifiedPairAddress
        )
      ),

    holderCachePairCorrection:
      cachedPairMisclassified,

    whale: {
      verified:
        true,

      whaleCount:
        whales.length,

      top1Percent:
        top1,

      top5Percent:
        top5,

      top10Percent:
        top10,

      concentrationRisk,

      smartMoneyScore:
        clamp(
          smartMoneyScore,
          0,
          100
        ),

      smartMoneyCandidate:
        smartMoneyScore >=
        55,

      infrastructureExcluded:
        infrastructureHolders.length
    }
  };

  clearPartialHolderStateV149(
    watched
  );

  saveHolderIntelligence(
    watched,
    result
  );

  return result;
}

/* =========================================================
   SNAPSHOTS
   ========================================================= */

function getHistoricalSnapshot(
  state,
  address
) {
  const snapshots =
    state.snapshots[
      normalize(
        address
      )
    ];

  if (
    !Array.isArray(
      snapshots
    ) ||
    !snapshots.length
  ) {
    return null;
  }

  const current =
    Date.now();

  for (
    let i =
      snapshots.length -
      1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i]
          .timestamp
      );

    if (
      age >=
      MOMENTUM_IDEAL_HISTORY_MS
    ) {
      return snapshots[i];
    }
  }

  for (
    let i =
      snapshots.length -
      1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i]
          .timestamp
      );

    if (
      age >=
      MOMENTUM_MIN_HISTORY_MS
    ) {
      return snapshots[i];
    }
  }

  return null;
}


function holderOwnershipBasisSignature(
  holders
) {
  if (
    holders?.concentrationVerified !==
      true ||
    holders?.whale?.verified !==
      true
  ) {
    return null;
  }

  const basis =
    holders?.integrity
      ?.ownershipConcentrationBasis ||
    "UNVERIFIED_BASIS";

  const infrastructure =
    Array.isArray(
      holders.infrastructureHolders
    )
      ? holders.infrastructureHolders
          .map(
            holder => {
              const address =
                normalize(
                  holder?.address
                );

              if (
                !address
              ) {
                return null;
              }

              return [
                address,
                String(
                  holder
                    ?.infrastructureReason ||
                  "UNSPECIFIED"
                )
              ].join(
                ":"
              );
            }
          )
          .filter(
            Boolean
          )
          .sort()
      : [];

  return [
    basis,
    ...infrastructure
  ].join(
    "|"
  );
}

function concentrationSnapshotComparison(
  previous,
  holders,
  trackedWallets
) {
  if (
    !previous
  ) {
    return {
      comparable:
        false,

      reason:
        "NO_PREVIOUS_SNAPSHOT"
    };
  }

  if (
    safeNumber(
      trackedWallets
    ) <=
      0
  ) {
    return {
      comparable:
        false,

      reason:
        "NO_TRACKED_WALLETS_FOR_TREND"
    };
  }

  const previousSignature =
    previous
      .holderOwnershipBasisSignature ||
    null;

  const currentSignature =
    holderOwnershipBasisSignature(
      holders
    );

  if (
    !previousSignature
  ) {
    return {
      comparable:
        false,

      reason:
        "PREVIOUS_SNAPSHOT_BASIS_UNAVAILABLE"
    };
  }

  if (
    !currentSignature
  ) {
    return {
      comparable:
        false,

      reason:
        "CURRENT_OWNERSHIP_BASIS_UNAVAILABLE"
    };
  }

  if (
    previousSignature !==
      currentSignature
  ) {
    return {
      comparable:
        false,

      reason:
        "OWNERSHIP_BASIS_CHANGED"
    };
  }

  return {
    comparable:
      true,

    reason:
      null
  };
}

function createSnapshot(
  candidate
) {
  const concentrationVerified =
    Boolean(
      candidate.holders
        ?.concentrationVerified &&
      candidate.holders
        ?.whale?.verified
    );

  return {
    timestamp:
      Date.now(),

    holderCount:
      candidate.holders
        ?.countersVerified
        ? candidate.holders
            .holderCount
        : null,

    transferCount:
      candidate.holders
        ?.countersVerified
        ? candidate.holders
            .transferCount
        : null,

    liquidityUsd:
      candidate.market
        ?.verified
        ? candidate.market
            .liquidityUsd
        : null,

    marketCap:
      candidate.market
        ?.verified
        ? candidate.market
            .marketCap
        : null,

    volumeH1:
      candidate.market
        ?.verified
        ? candidate.market
            .volume?.h1
        : null,

    buysH1:
      candidate.market
        ?.verified
        ? candidate.market
            .transactions
            ?.h1?.buys
        : null,

    sellsH1:
      candidate.market
        ?.verified
        ? candidate.market
            .transactions
            ?.h1?.sells
        : null,

    v4LiveActivityVerifiedV152:
      candidate
        ?.liveMomentumActivityV152
        ?.verified ===
      true,

    v4LiveSwapsV152:
      candidate
        ?.liveMomentumActivityV152
        ?.verified ===
      true
        ? safeNumber(
            candidate
              .liveMomentumActivityV152
              .swaps
          )
        : null,

    v4LiveLiquidityEventsV152:
      candidate
        ?.liveMomentumActivityV152
        ?.verified ===
      true
        ? safeNumber(
            candidate
              .liveMomentumActivityV152
              .liquidityEvents
          )
        : null,

    top1Percent:
      concentrationVerified
        ? candidate.holders
            .whale
            .top1Percent
        : null,

    top10Percent:
      concentrationVerified
        ? candidate.holders
            .whale
            .top10Percent
        : null,

    ownershipSupply:
      concentrationVerified &&
      candidate.holders
        ?.integrity
        ?.ownershipSupply
        ? String(
            candidate.holders
              .integrity
              .ownershipSupply
          )
        : null,

    infrastructureBalanceSum:
      concentrationVerified &&
      candidate.holders
        ?.integrity
        ?.infrastructureBalanceSum !==
          null &&
      candidate.holders
        ?.integrity
        ?.infrastructureBalanceSum !==
          undefined
        ? String(
            candidate.holders
              .integrity
              .infrastructureBalanceSum
          )
        : null,

    whaleBalances:
      concentrationVerified
        ? (
            candidate.holders
              .topHolders ||
            []
          )
            .filter(
              holder =>
                holder.address &&
                !holder.infrastructure &&
                holder.percentage !==
                  null &&
                positiveHolderBalance(
                  holder
                )
            )
            .map(
              holder => ({
                address:
                  holder.address,

                value:
                  holder.value,

                percentage:
                  holder.percentage
              })
            )
        : [],

    holderIntegrity:
      candidate.holders
        ?.integrity
        ?.status ||
      "UNVERIFIED",

    holderOwnershipBasisSignature:
      holderOwnershipBasisSignature(
        candidate.holders
      )
  };
}

function saveSnapshot(
  state,
  candidate
) {
  const address =
    normalize(
      candidate.address
    );

  let snapshots =
    state.snapshots[
      address
    ];

  if (
    !Array.isArray(
      snapshots
    )
  ) {
    snapshots =
      [];
  }

  const last =
    snapshots.length
      ? snapshots[
          snapshots.length -
          1
        ]
      : null;

  if (
    last &&
    Date.now() -
      safeNumber(
        last.timestamp
      ) <
      MIN_SNAPSHOT_INTERVAL
  ) {
    return;
  }

  snapshots.push(
    createSnapshot(
      candidate
    )
  );

  state.snapshots[
    address
  ] =
    snapshots.slice(
      -MAX_SNAPSHOTS_PER_TOKEN
    );
}

/* =========================================================
   MOMENTUM
   ========================================================= */

function momentumAnalysis(
  previous,
  market,
  holders,
  liveActivityV152 = null
) {
  if (!previous) {
    return {
      verified:
        false,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

      reasons: [
        "Waiting for historical snapshot"
      ]
    };
  }

  const historyAgeMs =
    Date.now() -
    safeNumber(
      previous.timestamp
    );

  if (
    historyAgeMs <
    MOMENTUM_MIN_HISTORY_MS
  ) {
    return {
      verified:
        false,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

      historyAgeMinutes:
        historyAgeMs /
        60000,

      reasons: [
        "Historical snapshot too recent"
      ]
    };
  }

  const countersUsable =
    Boolean(
      holders
        ?.countersVerified
    );

  const holderGrowth =
    countersUsable
      ? percentChange(
          previous.holderCount,
          holders.holderCount
        )
      : null;

  const transferGrowth =
    countersUsable
      ? percentChange(
          previous.transferCount,
          holders.transferCount
        )
      : null;

  const liquidityGrowth =
    market?.verified
      ? percentChange(
          previous.liquidityUsd,
          market.liquidityUsd
        )
      : null;

  const volumeGrowth =
    market?.verified
      ? percentChange(
          previous.volumeH1,
          market.volume?.h1
        )
      : null;

  const oldTx =
    safeNumber(
      previous.buysH1
    ) +
    safeNumber(
      previous.sellsH1
    );

  const newTx =
    safeNumber(
      market?.transactions
        ?.h1?.buys
    ) +
    safeNumber(
      market?.transactions
        ?.h1?.sells
    );

  const txGrowth =
    market?.verified
      ? percentChange(
          oldTx,
          newTx
        )
      : null;

  const onChainActivityUsableV152 =
    liveActivityV152?.verified ===
      true;

  const previousOnChainUsableV152 =
    previous
      ?.v4LiveActivityVerifiedV152 ===
      true &&
    previous
      ?.v4LiveSwapsV152 !==
      null &&
    previous
      ?.v4LiveSwapsV152 !==
      undefined &&
    previous
      ?.v4LiveLiquidityEventsV152 !==
      null &&
    previous
      ?.v4LiveLiquidityEventsV152 !==
      undefined;

  const currentLiveSwapsV152 =
    onChainActivityUsableV152
      ? safeNumber(
          liveActivityV152.swaps
        )
      : null;

  const currentLiveLiquidityV152 =
    onChainActivityUsableV152
      ? safeNumber(
          liveActivityV152
            .liquidityEvents
        )
      : null;

  const previousLiveSwapsV152 =
    previousOnChainUsableV152
      ? safeNumber(
          previous.v4LiveSwapsV152
        )
      : null;

  const previousLiveLiquidityV152 =
    previousOnChainUsableV152
      ? safeNumber(
          previous
            .v4LiveLiquidityEventsV152
        )
      : null;

  const liveSwapDeltaV152 =
    onChainActivityUsableV152 &&
    previousOnChainUsableV152
      ? currentLiveSwapsV152 -
        previousLiveSwapsV152
      : null;

  const liveLiquidityDeltaV152 =
    onChainActivityUsableV152 &&
    previousOnChainUsableV152
      ? currentLiveLiquidityV152 -
        previousLiveLiquidityV152
      : null;

  let score =
    0;

  let positiveSignals =
    0;

  const reasons =
    [];

  if (
    holderGrowth !==
      null &&
    holderGrowth >
      0
  ) {
    positiveSignals++;

    score +=
      holderGrowth >= 20
        ? 25
        : holderGrowth >= 10
          ? 20
          : holderGrowth >= 3
            ? 12
            : 5;

    reasons.push(
      `Holder growth ${holderGrowth.toFixed(1)}%`
    );
  }

  if (
    transferGrowth !==
      null &&
    transferGrowth >
      0
  ) {
    positiveSignals++;

    score +=
      transferGrowth >= 25
        ? 15
        : transferGrowth >= 10
          ? 10
          : 5;

    reasons.push(
      `Transfer growth ${transferGrowth.toFixed(1)}%`
    );
  }

  if (
    liquidityGrowth !==
    null
  ) {
    if (
      liquidityGrowth >=
      20
    ) {
      positiveSignals++;

      score +=
        18;

      reasons.push(
        `Liquidity acceleration ${liquidityGrowth.toFixed(1)}%`
      );
    }

    else if (
      liquidityGrowth >=
      5
    ) {
      positiveSignals++;

      score +=
        10;
    }

    else if (
      liquidityGrowth <=
      -20
    ) {
      score -=
        20;

      reasons.push(
        `Liquidity falling ${liquidityGrowth.toFixed(1)}%`
      );
    }
  }

  if (
    volumeGrowth !==
      null &&
    volumeGrowth >
      0
  ) {
    positiveSignals++;

    score +=
      volumeGrowth >= 100
        ? 22
        : volumeGrowth >= 30
          ? 16
          : volumeGrowth >= 10
            ? 10
            : 5;

    reasons.push(
      `Volume acceleration ${volumeGrowth.toFixed(1)}%`
    );
  }

  if (
    txGrowth !==
      null &&
    txGrowth >
      0
  ) {
    positiveSignals++;

    score +=
      txGrowth >= 50
        ? 15
        : txGrowth >= 15
          ? 10
          : 5;

    reasons.push(
      `Transaction acceleration ${txGrowth.toFixed(1)}%`
    );
  }

  /*
   * V152 live-only on-chain momentum.
   *
   * These signals prove activity/intensity only. They never imply USD value
   * or buy/sell direction. Backlog logs are deliberately excluded.
   */
  if (
    onChainActivityUsableV152 &&
    previousOnChainUsableV152 &&
    liveSwapDeltaV152 >
      0
  ) {
    positiveSignals++;

    const swapAccelerationStrongV152 =
      previousLiveSwapsV152 >
        0
        ? currentLiveSwapsV152 >=
          previousLiveSwapsV152 * 2
        : currentLiveSwapsV152 >=
          3;

    score +=
      swapAccelerationStrongV152
        ? 18
        : 10;

    reasons.push(
      `Live V4 swap acceleration ${previousLiveSwapsV152}→${currentLiveSwapsV152}`
    );
  }

  else if (
    onChainActivityUsableV152 &&
    currentLiveSwapsV152 >=
      3
  ) {
    positiveSignals++;

    score +=
      currentLiveSwapsV152 >=
        10
        ? 10
        : 6;

    reasons.push(
      previousOnChainUsableV152
        ? `Sustained live V4 swap activity ${currentLiveSwapsV152}`
        : `Live V4 swap activity ${currentLiveSwapsV152}`
    );
  }

  if (
    onChainActivityUsableV152 &&
    previousOnChainUsableV152 &&
    liveLiquidityDeltaV152 >
      0
  ) {
    positiveSignals++;

    score +=
      liveLiquidityDeltaV152 >=
        3
        ? 10
        : 6;

    reasons.push(
      `Live V4 liquidity-event acceleration ${previousLiveLiquidityV152}→${currentLiveLiquidityV152}`
    );
  }

  const directionalPressureH1V151 =
    market?.directionalFlow?.h1?.verified === true
      ? safeNumber(
          market.directionalFlow.h1.buyPressureUsd
        )
      : null;

  const directionalPressureM5V151 =
    market?.directionalFlow?.m5?.verified === true
      ? safeNumber(
          market.directionalFlow.m5.buyPressureUsd
        )
      : null;

  const verifiedDirectionalPressureV151 =
    directionalPressureH1V151 !== null
      ? directionalPressureH1V151
      : directionalPressureM5V151;

  if (
    verifiedDirectionalPressureV151 !== null &&
    verifiedDirectionalPressureV151 >= 60
  ) {
    positiveSignals++;

    score +=
      verifiedDirectionalPressureV151 >= 70
        ? 12
        : 7;

    reasons.push(
      directionalPressureH1V151 !== null
        ? "Verified USD buy pressure (1h)"
        : "Verified USD buy pressure (5m)"
    );
  }

  else if (
    market
      ?.buyPressure1h !==
      null &&
    market
      ?.buyPressure1h >=
      60
  ) {
    positiveSignals++;

    score +=
      market.buyPressure1h >=
        70
        ? 12
        : 7;

    reasons.push(
      "Positive transaction-count buy pressure"
    );
  }

  if (
    positiveSignals >=
    4
  ) {
    score +=
      10;

    reasons.push(
      "Multi-signal momentum confirmation"
    );
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    verified:
      Boolean(
        market?.verified ||
        countersUsable ||
        onChainActivityUsableV152
      ),

    score,

    label:
      score >= 75
        ? "STRONG"
        : score >= 50
          ? "GOOD"
          : score >= 25
            ? "EARLY"
            : "WEAK",

    historyAgeMinutes:
      historyAgeMs /
      60000,

    positiveSignals,

    holderGrowthPercent:
      holderGrowth,

    transferGrowthPercent:
      transferGrowth,

    liquidityGrowthPercent:
      liquidityGrowth,

    volumeH1GrowthPercent:
      volumeGrowth,

    transactionGrowthPercent:
      txGrowth,

    onChainPoolIdentityDirectionalV153: {
      enabled: true,
      externalRequestsAdded: 0,
      marketVerificationPromoted: false,
      strictDirectionalUsdVerificationPreserved: true,
      candidates:
        candidates
          .map(
            candidate => ({
              address:
                normalize(
                  candidate.address
                ),
              symbol:
                candidate.symbol || null,
              identity:
                candidate
                  .onChainPoolIdentityV153 ||
                null
            })
          )
          .slice(0, 10)
    },

    onChainActivityMomentumV152: {
      verified:
        onChainActivityUsableV152,
      historicalComparable:
        previousOnChainUsableV152,
      currentLiveSwaps:
        currentLiveSwapsV152,
      previousLiveSwaps:
        previousLiveSwapsV152,
      swapDelta:
        liveSwapDeltaV152,
      currentLiveLiquidityEvents:
        currentLiveLiquidityV152,
      previousLiveLiquidityEvents:
        previousLiveLiquidityV152,
      liquidityEventDelta:
        liveLiquidityDeltaV152,
      source:
        "UNISWAP_V4_LIVE_WINDOW_ONLY",
      usdValueInferred:
        false,
      directionInferred:
        false
    },

    directionalUsdPressureV151: {
      verified:
        verifiedDirectionalPressureV151 !== null,
      window:
        directionalPressureH1V151 !== null
          ? "h1"
          : directionalPressureM5V151 !== null
            ? "m5"
            : null,
      buyPressureUsd:
        verifiedDirectionalPressureV151
    },

    reasons
  };
}

/* =========================================================
   WHALE FLOW + CONCENTRATION TREND
   ========================================================= */

function ownershipDenominatorComparison(
  previous,
  holders,
  concentrationChange,
  increasing,
  decreasing
) {
  const previousRaw =
    previous
      ?.ownershipSupply;

  const currentRaw =
    holders
      ?.integrity
      ?.ownershipSupply;

  if (
    previousRaw ===
      null ||
    previousRaw ===
      undefined
  ) {
    return {
      verified:
        false,

      materialChange:
        false,

      changePercent:
        null,

      walletDirectionConfirmed:
        false,

      reason:
        "PREVIOUS_OWNERSHIP_SUPPLY_UNAVAILABLE"
    };
  }

  if (
    currentRaw ===
      null ||
    currentRaw ===
      undefined
  ) {
    return {
      verified:
        false,

      materialChange:
        false,

      changePercent:
        null,

      walletDirectionConfirmed:
        false,

      reason:
        "CURRENT_OWNERSHIP_SUPPLY_UNAVAILABLE"
    };
  }

  let previousSupply;
  let currentSupply;

  try {
    previousSupply =
      BigInt(
        String(
          previousRaw
        )
      );

    currentSupply =
      BigInt(
        String(
          currentRaw
        )
      );
  }

  catch {
    return {
      verified:
        false,

      materialChange:
        false,

      changePercent:
        null,

      walletDirectionConfirmed:
        false,

      reason:
        "OWNERSHIP_SUPPLY_PARSE_FAILED"
    };
  }

  if (
    previousSupply <=
      0n ||
    currentSupply <=
      0n
  ) {
    return {
      verified:
        false,

      materialChange:
        false,

      changePercent:
        null,

      walletDirectionConfirmed:
        false,

      reason:
        "OWNERSHIP_SUPPLY_NON_POSITIVE"
    };
  }

  /*
   * Integer basis-points calculation avoids lossy BigInt -> Number conversion
   * on ERC-20 supply-sized values.
   */
  const delta =
    currentSupply -
    previousSupply;

  const absDelta =
    delta < 0n
      ? -delta
      : delta;

  const basisPoints =
    Number(
      (
        absDelta *
        10000n
      ) /
      previousSupply
    );

  const changePercent =
    basisPoints /
    100;

  const materialChange =
    changePercent >=
      MATERIAL_OWNERSHIP_SUPPLY_CHANGE_PERCENT;

  let walletDirectionConfirmed =
    false;

  if (
    Number.isFinite(
      concentrationChange
    )
  ) {
    if (
      concentrationChange >
        1
    ) {
      walletDirectionConfirmed =
        increasing >
          decreasing &&
        increasing >
          0;
    }

    else if (
      concentrationChange <
        -1
    ) {
      walletDirectionConfirmed =
        decreasing >
          increasing &&
        decreasing >
          0;
    }

    else {
      walletDirectionConfirmed =
        true;
    }
  }

  return {
    verified:
      true,

    materialChange,

    changePercent,

    walletDirectionConfirmed,

    reason:
      materialChange &&
      !walletDirectionConfirmed
        ? "MATERIAL_OWNERSHIP_DENOMINATOR_CHANGE_UNCONFIRMED_BY_WALLETS"
        : null
  };
}

function analyseWhaleFlow(
  previous,
  holders
) {
  if (
    !previous ||
    !holders
      ?.concentrationVerified ||
    !holders
      ?.whale?.verified
  ) {
    return {
      verified:
        false,

      flow:
        "BUILDING_HISTORY",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      concentrationTrend:
        "NOT_VERIFIED",

      concentrationChange:
        null,

      concentrationTrendComparable:
        false,

      concentrationTrendResetReason:
        !previous
          ? "NO_PREVIOUS_SNAPSHOT"
          : "CURRENT_OWNERSHIP_BASIS_UNAVAILABLE",

      ownershipBasisSignature:
        holderOwnershipBasisSignature(
          holders
        ),

      ownershipSupplyChangePercent:
        null,

      ownershipDenominatorMaterialChange:
        false,

      ownershipDenominatorWalletConfirmed:
        false,

      trackedWallets:
        0,

      increasingWallets:
        0,

      decreasingWallets:
        0,

      score:
        0,

      reasons:
        holders?.integrity &&
        holders.integrity
          .verified ===
          false
          ? [
              `Holder concentration unavailable: ${holders.integrity.status}`
            ]
          : []
    };
  }

  const previousMap =
    new Map(
      (
        previous.whaleBalances ||
        []
      )
        .filter(
          holder =>
            holder.address
        )
        .map(
          holder => [
            normalize(
              holder.address
            ),

            holder
          ]
        )
    );

  let increasing =
    0;

  let decreasing =
    0;

  let comparable =
    0;

  for (
    const holder
    of holders.topHolders ||
      []
  ) {
    if (
      holder.infrastructure ||
      !holder.address ||
      holder.percentage ===
        null
    ) {
      continue;
    }

    const old =
      previousMap.get(
        normalize(
          holder.address
        )
      );

    if (!old) {
      continue;
    }

    try {
      const oldValue =
        BigInt(
          String(
            old.value ||
            "0"
          )
        );

      const newValue =
        BigInt(
          String(
            holder.value ||
            "0"
          )
        );

      comparable++;

      if (
        newValue >
        oldValue
      ) {
        increasing++;
      }

      if (
        newValue <
        oldValue
      ) {
        decreasing++;
      }
    }

    catch {}
  }

  let score =
    0;

  const reasons =
    [];

  let flow =
    "MIXED";

  if (
    comparable >=
      2 &&
    increasing >
      decreasing
  ) {
    flow =
      "NET_ACCUMULATION";

    score +=
      25;

    reasons.push(
      `${increasing} tracked top wallets increased balances`
    );
  }

  if (
    comparable >=
      2 &&
    decreasing >
      increasing
  ) {
    flow =
      "NET_DISTRIBUTION";

    score -=
      20;

    reasons.push(
      `${decreasing} tracked top wallets reduced balances`
    );
  }

  let concentrationTrend =
    "NOT_VERIFIED";

  let concentrationChange =
    null;

  const oldTop10 =
    Number(
      previous.top10Percent
    );

  const newTop10 =
    Number(
      holders.whale.top10Percent
    );

  const concentrationComparison =
    concentrationSnapshotComparison(
      previous,
      holders,
      comparable
    );

  if (
    concentrationComparison
      .comparable &&
    Number.isFinite(
      oldTop10
    ) &&
    Number.isFinite(
      newTop10
    ) &&
    oldTop10 >=
      0 &&
    oldTop10 <=
      100 &&
    newTop10 >=
      0 &&
    newTop10 <=
      100
  ) {
    concentrationChange =
      newTop10 -
      oldTop10;

    if (
      concentrationChange >
        1
    ) {
      concentrationTrend =
        "INCREASING";
    }

    else if (
      concentrationChange <
        -1
    ) {
      concentrationTrend =
        "DECREASING";
    }

    else {
      concentrationTrend =
        "STABLE";
    }
  }

  const denominatorComparison =
    ownershipDenominatorComparison(
      previous,
      holders,
      concentrationChange,
      increasing,
      decreasing
    );

  /*
   * V131: the methodology/address-set can be identical while the amount
   * excluded as infrastructure moves sharply. That changes ownershipSupply
   * and can mechanically move top-10 percentages without any whale buying
   * or selling. Never label that as a verified trend without wallet support.
   */
  if (
    concentrationComparison
      .comparable &&
    concentrationTrend !==
      "NOT_VERIFIED" &&
    (
      !denominatorComparison
        .verified ||
      (
        denominatorComparison
          .materialChange &&
        !denominatorComparison
          .walletDirectionConfirmed
      )
    )
  ) {
    concentrationTrend =
      "NOT_VERIFIED";

    concentrationChange =
      null;
  }

  if (
    concentrationTrend ===
      "INCREASING" &&
    concentrationChange >=
      2 &&
    newTop10 <
      70 &&
    increasing >
      decreasing &&
    increasing >
      0
  ) {
    score +=
      10;

    reasons.push(
      "Top-holder concentration increasing with tracked-wallet accumulation"
    );
  }

  else if (
    concentrationTrend ===
      "INCREASING" &&
    concentrationChange >=
      2 &&
    newTop10 <
      70
  ) {
    reasons.push(
      "Concentration increased without tracked-wallet accumulation confirmation"
    );
  }

  if (
    denominatorComparison
      .materialChange &&
    !denominatorComparison
      .walletDirectionConfirmed
  ) {
    reasons.push(
      "Material ownership-supply denominator change; concentration trend reset"
    );
  }

  /*
   * Dangerous current concentration remains a valid current-state penalty.
   * It does not require historical comparability.
   */
  if (
    Number.isFinite(
      newTop10
    ) &&
    newTop10 >=
      80
  ) {
    score -=
      20;

    reasons.push(
      "Dangerous concentration"
    );
  }

  return {
    verified:
      comparable >
        0 ||
      concentrationTrend !==
        "NOT_VERIFIED",

    flow,

    accumulation:
      flow ===
      "NET_ACCUMULATION"
        ? "OBSERVED"
        : "NOT_OBSERVED",

    distribution:
      flow ===
      "NET_DISTRIBUTION"
        ? "OBSERVED"
        : "NOT_OBSERVED",

    concentrationTrend,

    concentrationChange,

    concentrationTrendComparable:
      concentrationComparison
        .comparable &&
      concentrationTrend !==
        "NOT_VERIFIED",

    concentrationTrendResetReason:
      !concentrationComparison
        .comparable
        ? concentrationComparison
            .reason
        : (
            concentrationTrend ===
              "NOT_VERIFIED"
              ? denominatorComparison
                  .reason ||
                "OWNERSHIP_DENOMINATOR_COMPARISON_UNAVAILABLE"
              : null
          ),

    ownershipBasisSignature:
      holderOwnershipBasisSignature(
        holders
      ),

    ownershipSupplyChangePercent:
      denominatorComparison
        .changePercent,

    ownershipDenominatorMaterialChange:
      denominatorComparison
        .materialChange,

    ownershipDenominatorWalletConfirmed:
      denominatorComparison
        .walletDirectionConfirmed,

    trackedWallets:
      comparable,

    increasingWallets:
      increasing,

    decreasingWallets:
      decreasing,

    score:
      clamp(
        score,
        -50,
        50
      ),

    reasons
  };
}

/* =========================================================
   MARKET QUALITY
   ========================================================= */

function marketQuality(
  market
) {
  if (
    !market?.verified
  ) {
    return {
      verified:
        false,

      score:
        0,

      reasons:
        []
    };
  }

  const liquidity =
    safeNumber(
      market.liquidityUsd
    );

  const marketCap =
    safeNumber(
      market.marketCap
    );

  const volume =
    safeNumber(
      market.volume?.h24
    );

  let score =
    0;

  const reasons =
    [];

  let liquidityMarketCapRatio =
    null;

  if (
    liquidity >
      0 &&
    marketCap >
      0
  ) {
    liquidityMarketCapRatio =
      (
        liquidity /
        marketCap
      ) *
      100;

    if (
      liquidityMarketCapRatio >=
        10 &&
      liquidityMarketCapRatio <=
        60
    ) {
      score +=
        20;

      reasons.push(
        "Healthy liquidity/market-cap ratio"
      );
    }

    else if (
      liquidityMarketCapRatio >=
      5
    ) {
      score +=
        10;
    }

    if (
      liquidityMarketCapRatio <
      2
    ) {
      score -=
        15;
    }
  }

  let volumeLiquidityRatio =
    null;

  if (
    volume >
      0 &&
    liquidity >
      0
  ) {
    volumeLiquidityRatio =
      volume /
      liquidity;

    if (
      volumeLiquidityRatio >=
      1
    ) {
      score +=
        15;

      reasons.push(
        "Strong volume/liquidity ratio"
      );
    }

    else if (
      volumeLiquidityRatio >=
      0.25
    ) {
      score +=
        8;
    }
  }

  if (
    market.buyPressure1h !==
      null &&
    market.buyPressure1h >=
      60
  ) {
    score +=
      10;
  }

  return {
    verified:
      true,

    score:
      clamp(
        score,
        0,
        100
      ),

    liquidityMarketCapRatio,

    volumeLiquidityRatio,

    reasons
  };
}

/* =========================================================
   LAUNCH STAGE
   ========================================================= */

function launchStage(
  market
) {
  if (
    !market?.verified ||
    !safeNumber(
      market.pairCreatedAt
    )
  ) {
    return {
      verified:
        false,

      ageMinutes:
        null,

      stage:
        "UNVERIFIED",

      score:
        0
    };
  }

  const ageMs =
    Math.max(
      0,

      Date.now() -
      safeNumber(
        market.pairCreatedAt
      )
    );

  const ageMinutes =
    ageMs /
    60000;

  let stage =
    "MATURE";

  let score =
    0;

  if (
    ageMs <=
    15 * 60 * 1000
  ) {
    stage =
      "JUST_LAUNCHED";

    score =
      100;
  }

  else if (
    ageMs <=
    60 * 60 * 1000
  ) {
    stage =
      "VERY_EARLY";

    score =
      90;
  }

  else if (
    ageMs <=
    2 * 60 * 60 * 1000
  ) {
    stage =
      "EARLY";

    score =
      80;
  }

  else if (
    ageMs <=
    6 * 60 * 60 * 1000
  ) {
    stage =
      "EMERGING";

    score =
      65;
  }

  else if (
    ageMs <=
    24 * 60 * 60 * 1000
  ) {
    stage =
      "YOUNG";

    score =
      45;
  }

  return {
    verified:
      true,

    ageMinutes,

    stage,

    score
  };
}

/* =========================================================
   V88 RISK
   ========================================================= */

function scoreRisk(
  token,
  market,
  holders,
  activity,
  whaleFlow
) {
  const evidence = {
    market:
      Boolean(
        market?.verified
      ),

    concentration:
      Boolean(
        holders
          ?.concentrationVerified &&
        holders
          ?.whale?.verified
      ),

    liveActivity:
      safeNumber(
        activity?.swaps
      ) >
      0,

    liquidityActivity:
      safeNumber(
        activity?.liquidityEvents
      ) >
      0,

    holderCounters:
      Boolean(
        holders
          ?.countersVerified
      )
  };

  const independentEvidence =
    [
      evidence.market,
      evidence.concentration,
      evidence.liveActivity,
      evidence.holderCounters
    ].filter(
      Boolean
    ).length;

  const whale =
    holders?.whale;

  /*
   * V97 HOLDER-INTEGRITY SAFETY GATE
   *
   * If holder rows were returned but failed integrity validation,
   * the token cannot be classified LOW risk from unrelated signals.
   * This preserves the existing false-positive protection while
   * Blockscout catches up.
   */
  const holderIntegrityInvalid =
    Boolean(
      holders?.integrity &&
      holders.integrity.status &&
      !holders.integrity.verified &&
      ![
        "BLOCKSCOUT_HOLDERS_UNAVAILABLE",
        "BLOCKSCOUT_HOLDER_OUTAGE_DEFERRED",
        "NO_HOLDER_ROWS"
      ].includes(
        holders.integrity.status
      )
    );

  if (
    holderIntegrityInvalid &&
    !evidence.concentration
  ) {
    return {
      verified:
        false,

      severeOverride:
        false,

      score:
        null,

      label:
        "UNVERIFIED",

      evidence,

      independentEvidence,

      reasons: [
        `Holder integrity unresolved: ${holders.integrity.status}`
      ]
    };
  }

  /*
   * V88 SEVERE RED-FLAG OVERRIDE
   *
   * Two evidence classes are NOT required to identify
   * something clearly dangerous.
   */
  if (
    evidence.concentration &&
    (
      whale
        ?.concentrationRisk ===
        "HIGH" ||
      safeNumber(
        whale?.top1Percent
      ) >=
        40 ||
      safeNumber(
        whale?.top10Percent
      ) >=
        80
    )
  ) {
    let score =
      80;

    const reasons = [
      "Verified dangerous holder concentration"
    ];

    if (
      safeNumber(
        whale?.top1Percent
      ) >=
      40
    ) {
      score +=
        10;

      reasons.push(
        "Extreme top-holder ownership"
      );
    }

    if (
      safeNumber(
        whale?.top1Percent
      ) >=
      80
    ) {
      score =
        100;

      reasons.push(
        "Single non-infrastructure owner controls most circulating ownership"
      );
    }

    return {
      verified:
        true,

      severeOverride:
        true,

      score:
        clamp(
          score,
          0,
          100
        ),

      label:
        "HIGH",

      evidence,

      independentEvidence,

      reasons
    };
  }

  /*
   * Extremely low verified liquidity is also a direct
   * severe warning.
   */
  if (
    market?.verified &&
    safeNumber(
      market.liquidityUsd
    ) >
      0 &&
    safeNumber(
      market.liquidityUsd
    ) <
      250
  ) {
    return {
      verified:
        true,

      severeOverride:
        true,

      score:
        85,

      label:
        "HIGH",

      evidence,

      independentEvidence,

      reasons: [
        "Extremely low verified liquidity"
      ]
    };
  }

  /*
   * V87/V88 safety gate:
   * One swap alone cannot classify LOW risk.
   */
  if (
    independentEvidence <
    2
  ) {
    return {
      verified:
        false,

      severeOverride:
        false,

      score:
        null,

      label:
        "UNVERIFIED",

      evidence,

      independentEvidence,

      reasons: [
        "At least two independent safety evidence classes are required"
      ]
    };
  }

  let score =
    50;

  const reasons =
    [];

  if (
    token.validERC20
  ) {
    score -=
      15;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    activity.swaps >
    0
  ) {
    score -=
      5;

    reasons.push(
      "Active V4 swaps"
    );
  }

  if (
    market?.verified
  ) {
    score -=
      5;

    if (
      market.liquidityUsd >=
      10000
    ) {
      score -=
        8;
    }

    if (
      market.liquidityUsd <
      1000
    ) {
      score +=
        15;

      reasons.push(
        "Very low liquidity"
      );
    }
  }

  if (
    evidence.concentration
  ) {
    if (
      whale.concentrationRisk ===
      "MEDIUM"
    ) {
      score +=
        10;

      reasons.push(
        "Medium whale concentration"
      );
    }
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_DISTRIBUTION"
  ) {
    score +=
      10;

    reasons.push(
      "Observed whale distribution"
    );
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    verified:
      true,

    severeOverride:
      false,

    score,

    label:
      score >= 80
        ? "HIGH"
        : score >= 60
          ? "MEDIUM"
          : "LOW",

    evidence,

    independentEvidence,

    reasons
  };
}

const MIN_HEALTHY_HOLDER_COUNT_V136 =
  10;

const MIN_HEALTHY_POSITIVE_HOLDER_ROWS_V136 =
  3;

function healthyHolderBreadthV136(
  holders
) {
  const holderCount =
    safeNumber(
      holders?.holderCount
    );

  const positiveHolderRows =
    safeNumber(
      holders?.positiveHolderRows
    );

  if (
    !holders?.concentrationVerified ||
    !holders?.whale?.verified ||
    holders?.whale?.concentrationRisk !==
      "LOW"
  ) {
    return {
      eligible: false,
      reason: "CONCENTRATION_NOT_VERIFIED_LOW",
      holderCount,
      positiveHolderRows
    };
  }

  if (
    holderCount <
      MIN_HEALTHY_HOLDER_COUNT_V136
  ) {
    return {
      eligible: false,
      reason: "INSUFFICIENT_HOLDER_COUNT",
      holderCount,
      positiveHolderRows
    };
  }

  if (
    positiveHolderRows <
      MIN_HEALTHY_POSITIVE_HOLDER_ROWS_V136
  ) {
    return {
      eligible: false,
      reason: "INSUFFICIENT_POSITIVE_HOLDER_ROWS",
      holderCount,
      positiveHolderRows
    };
  }

  return {
    eligible: true,
    reason: "VERIFIED_HEALTHY_HOLDER_BREADTH",
    holderCount,
    positiveHolderRows
  };
}

/* =========================================================
   OPPORTUNITY
   ========================================================= */

function scoreOpportunity(
  token,
  market,
  holders,
  activity,
  momentum,
  quality,
  whaleFlow,
  launch
) {
  let score =
    0;

  const reasons =
    [];

  if (
    token.validERC20
  ) {
    score +=
      20;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    token.name &&
    token.symbol
  ) {
    score +=
      5;
  }

  if (
    activity.swaps >
    0
  ) {
    score +=
      10;

    reasons.push(
      "V4 swaps detected"
    );
  }

  if (
    activity.liquidityEvents >
    0
  ) {
    score +=
      5;
  }

  if (
    market?.verified
  ) {
    score +=
      10;

    if (
      market.liquidityUsd >=
      5000
    ) {
      score +=
        5;
    }

    if (
      market.liquidityUsd >=
      25000
    ) {
      score +=
        5;
    }

    if (
      market.volume?.h24 >=
      10000
    ) {
      score +=
        5;
    }

    if (
      market.volume?.h24 >=
      50000
    ) {
      score +=
        5;
    }

    if (
      market.buyPressure1h !==
        null &&
      market.buyPressure1h >=
        60
    ) {
      score +=
        7;

      reasons.push(
        "Strong buy pressure"
      );
    }

    if (
      market.marketCap &&
      market.marketCap >=
        25000 &&
      market.marketCap <=
        5000000
    ) {
      score +=
        5;

      reasons.push(
        "Early market-cap range"
      );
    }
  }

  if (
    launch?.verified
  ) {
    if (
      launch.stage ===
      "JUST_LAUNCHED"
    ) {
      score +=
        10;

      reasons.push(
        "Just launched"
      );
    }

    else if (
      launch.stage ===
        "VERY_EARLY" ||
      launch.stage ===
        "EARLY"
    ) {
      score +=
        7;

      reasons.push(
        "Early launch"
      );
    }

    else if (
      launch.stage ===
      "EMERGING"
    ) {
      score +=
        4;
    }
  }

  if (
    holders
      ?.countersVerified
  ) {
    if (
      safeNumber(
        holders.holderCount
      ) >=
      50
    ) {
      score +=
        4;
    }

    if (
      safeNumber(
        holders.holderCount
      ) >=
      200
    ) {
      score +=
        4;
    }
  }

  const healthyHolderBreadth =
    healthyHolderBreadthV136(
      holders
    );

  if (
    healthyHolderBreadth
      .eligible
  ) {
    score +=
      5;

    reasons.push(
      "Healthy holder concentration"
    );
  }

  else if (
    holders?.concentrationVerified &&
    holders?.whale?.verified &&
    holders?.whale?.concentrationRisk ===
      "LOW"
  ) {
    reasons.push(
      "Low concentration but holder breadth too thin for healthy-holder bonus"
    );
  }

  if (
    holders
      ?.concentrationVerified &&
    holders.whale
      ?.verified &&
    holders.whale
      ?.smartMoneyCandidate
  ) {
    score +=
      5;
  }

  if (
    holders
      ?.concentrationVerified &&
    holders.whale
      ?.verified &&
    holders.whale
      ?.concentrationRisk ===
      "HIGH"
  ) {
    score -=
      15;

    reasons.push(
      "Whale concentration penalty"
    );
  }

  if (
    momentum?.verified
  ) {
    if (
      momentum.score >=
      75
    ) {
      score +=
        15;

      reasons.push(
        "Strong momentum"
      );
    }

    else if (
      momentum.score >=
      50
    ) {
      score +=
        10;
    }

    else if (
      momentum.score >=
      25
    ) {
      score +=
        5;
    }
  }

  if (
    quality?.verified
  ) {
    if (
      quality.score >=
      40
    ) {
      score +=
        10;
    }

    else if (
      quality.score >=
      20
    ) {
      score +=
        5;
    }
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_ACCUMULATION"
  ) {
    score +=
      10;

    reasons.push(
      "Whale accumulation"
    );
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_DISTRIBUTION"
  ) {
    score -=
      10;

    reasons.push(
      "Whale distribution"
    );
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    reasons
  };
}

/* =========================================================
   SIGNAL CONFIRMATION
   ========================================================= */

function signalConfirmation(
  candidate
) {
  let signals =
    0;

  let score =
    0;

  const reasons =
    [];

  if (
    candidate.activity
      ?.swaps >
    0
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "V4 swap activity"
    );
  }

  if (
    candidate.activity
      ?.liquidityEvents >
    0
  ) {
    signals++;

    score +=
      8;

    reasons.push(
      "V4 liquidity activity"
    );
  }

  if (
    candidate.market
      ?.verified &&
    safeNumber(
      candidate.market
        .liquidityUsd
    ) >=
      5000
  ) {
    signals++;

    score +=
      12;

    reasons.push(
      "Liquidity confirmed"
    );
  }

  if (
    candidate.market
      ?.verified &&
    safeNumber(
      candidate.market
        .volume?.h24
    ) >=
      10000
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Trading volume confirmed"
    );
  }

  if (
    candidate.market
      ?.buyPressure1h !==
      null &&
    candidate.market
      ?.buyPressure1h >=
      60
  ) {
    signals++;

    score +=
      12;

    reasons.push(
      "Buy pressure confirmed"
    );
  }

  if (
    candidate.holders
      ?.countersVerified &&
    safeNumber(
      candidate.holders
        .holderCount
    ) >=
      50
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Holder base confirmed"
    );
  }

  if (
    candidate.momentum
      ?.verified &&
    candidate.momentum
      .score >=
      50
  ) {
    signals++;

    score +=
      18;

    reasons.push(
      "Momentum confirmed"
    );
  }

  if (
    candidate.whaleFlow
      ?.verified &&
    candidate.whaleFlow
      .flow ===
      "NET_ACCUMULATION"
  ) {
    signals++;

    score +=
      15;

    reasons.push(
      "Whale accumulation confirmed"
    );
  }

  const healthySignalHolderBreadth =
    healthyHolderBreadthV136(
      candidate.holders
    );

  if (
    healthySignalHolderBreadth
      .eligible
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Healthy concentration confirmed"
    );
  }

  else if (
    candidate.holders
      ?.concentrationVerified &&
    candidate.holders
      ?.whale
      ?.verified &&
    candidate.holders
      ?.whale
      ?.concentrationRisk ===
      "LOW"
  ) {
    reasons.push(
      "Low concentration not counted: holder breadth too thin"
    );
  }

  if (
    signals >=
    5
  ) {
    score +=
      10;
  }

  return {
    verified:
      signals >=
      2,

    signals,

    score:
      clamp(
        score,
        0,
        100
      ),

    label:
      signals >= 7
        ? "VERY_STRONG"
        : signals >= 5
          ? "STRONG"
          : signals >= 3
            ? "DEVELOPING"
            : signals >= 2
              ? "EARLY"
              : "WEAK",

    reasons
  };
}

/* =========================================================
   CONFIDENCE
   ========================================================= */

function candidateConfidence(
  candidate
) {
  let score =
    0;

  if (
    candidate.validERC20
  ) {
    score +=
      15;
  }

  if (
    candidate.market
      ?.verified
  ) {
    score +=
      20;
  }

  if (
    candidate.holders
      ?.countersVerified
  ) {
    score +=
      15;
  }

  if (
    candidate.activity
      ?.poolSpecific
  ) {
    score +=
      10;
  }

  if (
    candidate.activity
      ?.swaps >
    0
  ) {
    score +=
      10;
  }

  if (
    candidate.momentum
      ?.verified
  ) {
    score +=
      15;
  }

  if (
    candidate.marketQuality
      ?.verified
  ) {
    score +=
      10;
  }

  if (
    candidate.holders
      ?.concentrationVerified &&
    candidate.holders
      ?.whale?.verified
  ) {
    score +=
      5;
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    label:
      score >= 80
        ? "HIGH"
        : score >= 55
          ? "MEDIUM"
          : "LOW"
  };
}

/* =========================================================
   PRIORITY
   ========================================================= */

function watchPriority(
  watched,
  newTokens,
  liveTokens
) {
  let score =
    1000;

  const address =
    normalize(
      watched.address
    );

  if (
    knownQuoteMetadata(
      address,
      watched.metadata?.symbol
    )
  ) {
    return -10000;
  }

  if (
    watched.excludedReason
  ) {
    return -9000;
  }

  if (
    liveTokens?.has(
      address
    )
  ) {
    score +=
      2500;
  }

  if (
    newTokens?.has(
      address
    )
  ) {
    score +=
      1500;
  }

  if (
    watched.metadata
      ?.validERC20
  ) {
    score +=
      200;
  }

  const lastLive =
    safeNumber(
      watched.lastLiveSeenAt
    );

  if (
    lastLive &&
    Date.now() -
      lastLive <
      30 * 60 * 1000
  ) {
    score +=
      250;
  }

  const lastChecked =
    safeNumber(
      watched.lastCheckedAt
    );

  if (
    !lastChecked
  ) {
    score +=
      600;
  }

  else {
    score +=
      Math.min(
        500,

        Math.floor(
          (
            Date.now() -
            lastChecked
          ) /
          60000
        )
      );
  }

  const age =
    Date.now() -
    safeNumber(
      watched.firstSeenAt
    );

  if (
    age >= 0 &&
    age <
      30 * 60 * 1000
  ) {
    score +=
      200;
  }

  else if (
    age >= 0 &&
    age <
      60 * 60 * 1000
  ) {
    score +=
      125;
  }

  score +=
    Math.min(
      80,

      (
        watched.pools?.length ||
        0
      ) *
      15
    );

  score -=
    Math.min(
      900,

      safeNumber(
        watched.invalidChecks
      ) *
      300
    );

  return score;
}

function analysisPriority(
  candidate
) {
  let score =
    safeNumber(
      candidate.opportunity
        ?.score
    ) *
    2;

  score +=
    safeNumber(
      candidate.confidence
        ?.score
    );

  score +=
    safeNumber(
      candidate.momentum
        ?.score
    );

  score +=
    safeNumber(
      candidate.marketQuality
        ?.score
    );

  score +=
    safeNumber(
      candidate.signalConfirmation
        ?.score
    );

  if (
    candidate.newlyDiscovered
  ) {
    score +=
      25;
  }

  if (
    candidate.liveDiscovery
  ) {
    score +=
      100;
  }

  if (
    candidate.whaleFlow
      ?.flow ===
      "NET_ACCUMULATION"
  ) {
    score +=
      30;
  }

  if (
    candidate.whaleFlow
      ?.flow ===
      "NET_DISTRIBUTION"
  ) {
    score -=
      30;
  }

  return score;
}

/* =========================================================
   TELEGRAM
   ========================================================= */

function escapeHtml(
  value
) {
  return String(
    value ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function formatNumber(
  value
) {
  const n =
    Number(
      value
    );

  if (
    !Number.isFinite(
      n
    )
  ) {
    return "UNVERIFIED";
  }

  if (
    n >=
    1e9
  ) {
    return (
      n /
      1e9
    ).toFixed(
      2
    ) +
      "B";
  }

  if (
    n >=
    1e6
  ) {
    return (
      n /
      1e6
    ).toFixed(
      2
    ) +
      "M";
  }

  if (
    n >=
    1e3
  ) {
    return (
      n /
      1e3
    ).toFixed(
      2
    ) +
      "K";
  }

  return n.toFixed(
    2
  );
}

function percentDisplay(
  value
) {
  const n =
    Number(
      value
    );

  return Number.isFinite(
    n
  )
    ? `${n.toFixed(2)}%`
    : "UNVERIFIED";
}

async function sendTelegram(
  env,
  message,
  budget = null,
  imageUrl = null
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      success: false,
      skipped: true,
      reason: "TELEGRAM_NOT_CONFIGURED"
    };
  }

  if (
    budget &&
    !consumeBudget(
      budget,
      "notification",
      "TELEGRAM_SEND"
    )
  ) {
    return {
      success: false,
      skipped: true,
      reason: "NOTIFICATION_BUDGET_EXHAUSTED"
    };
  }

  const telegramBase =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

  try {
    /* V94: Prefer the token artwork as the Telegram photo. */
    if (imageUrl) {
      try {
        const photoResponse = await fetch(
          `${telegramBase}/sendPhoto`,
          {
            method: "POST",
            headers: {
              "content-type": "application/json"
            },
            body: JSON.stringify({
              chat_id: env.TELEGRAM_CHAT_ID,
              photo: imageUrl,
              caption: message,
              parse_mode: "HTML"
            })
          }
        );

        const photoData = await photoResponse.json();

        if (photoResponse.ok && photoData?.ok) {
          return {
            success: true,
            status: photoResponse.status,
            mode: "PHOTO",
            imageUrl,
            data: photoData
          };
        }
      } catch (photoError) {
        /* Fall through to the proven V94 text-only alert path. */
      }
    }

    const response = await fetch(
      `${telegramBase}/sendMessage`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true
        })
      }
    );

    const data = await response.json();

    return {
      success: response.ok && Boolean(data?.ok),
      status: response.status,
      mode: imageUrl ? "TEXT_FALLBACK" : "TEXT",
      data
    };
  } catch (error) {
    return {
      success: false,
      error: errorString(error)
    };
  }
}


function sameRunTerminalReject(
  candidate
) {
  const holders =
    candidate?.holders;

  const evidenceVerified =
    holders
      ?.integrity
      ?.verified ===
      true &&
    holders
      ?.concentrationVerified ===
      true &&
    holders
      ?.whale
      ?.verified ===
      true;

  if (
    !evidenceVerified
  ) {
    return {
      terminal:
        false,
      reason:
        null,
      top1Percent:
        null,
      concentrationRisk:
        "UNVERIFIED"
    };
  }

  const top1Percent =
    safeNumber(
      holders
        ?.whale
        ?.top1Percent
    );

  const concentrationRisk =
    String(
      holders
        ?.whale
        ?.concentrationRisk ||
      "UNVERIFIED"
    ).toUpperCase();

  if (
    concentrationRisk ===
      "HIGH"
  ) {
    return {
      terminal:
        true,
      reason:
        "SAME_RUN_VERIFIED_HIGH_CONCENTRATION",
      top1Percent,
      concentrationRisk
    };
  }

  if (
    top1Percent >=
      50
  ) {
    return {
      terminal:
        true,
      reason:
        "SAME_RUN_VERIFIED_EXTREME_TOP1",
      top1Percent,
      concentrationRisk
    };
  }

  return {
    terminal:
      false,
    reason:
      null,
    top1Percent,
    concentrationRisk
  };
}

function qualifiesTelegram(
  candidate
) {
  if (
    sameRunTerminalReject(
      candidate
    ).terminal
  ) {
    return false;
  }

  if (
    candidate.opportunity
      .score <
    MIN_ALERT_SCORE
  ) {
    return false;
  }

  if (
    candidate.confidence
      .score <
    MIN_CONFIDENCE_ALERT
  ) {
    return false;
  }

  if (
    !candidate.risk
      ?.verified
  ) {
    return false;
  }

  if (
    safeNumber(
      candidate.risk.score
    ) >
    MAX_ALERT_RISK
  ) {
    return false;
  }

  if (
    safeNumber(
      candidate.market
        ?.liquidityUsd
    ) <
    MIN_ALERT_LIQUIDITY
  ) {
    return false;
  }

  const holderEvidenceVerified =
    candidate
      ?.holders
      ?.integrity
      ?.verified ===
      true &&
    candidate
      ?.holders
      ?.concentrationVerified ===
      true &&
    candidate
      ?.holders
      ?.whale
      ?.verified ===
      true;

  if (
    !holderEvidenceVerified
  ) {
    return false;
  }

  if (
    candidate
      .signalConfirmation
      .signals <
    2
  ) {
    return false;
  }

  return true;
}


function telegramQualificationReasons(
  candidate
) {
  const reasons = [];

  const sameRunTerminal =
    sameRunTerminalReject(
      candidate
    );

  if (
    sameRunTerminal.terminal
  ) {
    reasons.push(
      sameRunTerminal.reason ||
      "SAME_RUN_TERMINAL_RISK"
    );
  }

  if (
    safeNumber(
      candidate?.opportunity?.score
    ) <
    MIN_ALERT_SCORE
  ) {
    reasons.push(
      "OPPORTUNITY_SCORE"
    );
  }

  if (
    safeNumber(
      candidate?.confidence?.score
    ) <
    MIN_CONFIDENCE_ALERT
  ) {
    reasons.push(
      "CONFIDENCE_SCORE"
    );
  }

  if (
    !candidate?.risk?.verified
  ) {
    reasons.push(
      "RISK_UNVERIFIED"
    );
  }

  else if (
    safeNumber(
      candidate?.risk?.score
    ) >
    MAX_ALERT_RISK
  ) {
    reasons.push(
      "RISK_TOO_HIGH"
    );
  }

  if (
    !candidate?.market?.verified
  ) {
    reasons.push(
      "MARKET_UNVERIFIED"
    );
  }

  if (
    safeNumber(
      candidate?.market?.liquidityUsd
    ) <
    MIN_ALERT_LIQUIDITY
  ) {
    reasons.push(
      "LIQUIDITY_TOO_LOW_OR_UNVERIFIED"
    );
  }

  const holderEvidenceVerified =
    candidate
      ?.holders
      ?.integrity
      ?.verified ===
      true &&
    candidate
      ?.holders
      ?.concentrationVerified ===
      true &&
    candidate
      ?.holders
      ?.whale
      ?.verified ===
      true;

  if (
    !holderEvidenceVerified
  ) {
    reasons.push(
      "HOLDER_EVIDENCE_UNVERIFIED"
    );
  }

  if (
    safeNumber(
      candidate?.signalConfirmation?.signals
    ) <
    2
  ) {
    reasons.push(
      "INSUFFICIENT_SIGNALS"
    );
  }

  return reasons;
}

function buildTelegramQualificationDiagnostics(
  candidates
) {
  const blockedBy = {};
  const candidateResults = [];

  for (
    const candidate
    of candidates
  ) {
    const reasons =
      telegramQualificationReasons(
        candidate
      );

    for (
      const reason
      of reasons
    ) {
      blockedBy[
        reason
      ] =
        safeNumber(
          blockedBy[
            reason
          ]
        ) +
        1;
    }

    candidateResults.push({
      address:
        candidate.address,
      symbol:
        candidate.symbol,
      qualifies:
        reasons.length ===
        0,
      reasons
    });
  }

  return {
    evaluated:
      candidates.length,
    qualifying:
      candidateResults.filter(
        item =>
          item.qualifies
      ).length,
    blockedBy,
    candidates:
      candidateResults.slice(
        0,
        10
      )
  };
}


/* =========================================================
   V88 RICH V77-STYLE TELEGRAM CALL
   ========================================================= */


function telegramAlertClass(
  candidate
) {
  const freshness =
    candidate
      ?.discoveryClassification
      ?.launchFreshness ||
    candidate
      ?.launchStage ||
    null;

  const label =
    String(
      freshness?.label ||
      freshness?.stage ||
      "UNVERIFIED"
    ).toUpperCase();

  if (
    label ===
      "NEWLY_LAUNCHED"
  ) {
    return {
      code:
        "NEW_LAUNCH",
      title:
        "New Launch Alert",
      footer:
        "Automated new-launch screening. High risk."
    };
  }

  if (
    label ===
      "EARLY"
  ) {
    return {
      code:
        "EARLY_STAGE",
      title:
        "Early Opportunity Alert",
      footer:
        "Automated early-stage screening. High risk."
    };
  }

  if (
    label ===
      "MATURE"
  ) {
    return {
      code:
        "MATURE_OPPORTUNITY",
      title:
        "Mature Opportunity Alert",
      footer:
        "Automated mature-market opportunity screening. High risk."
    };
  }

  return {
    code:
      "UNVERIFIED_STAGE",
    title:
      "Opportunity Alert",
    footer:
      "Automated opportunity screening. Launch stage unverified. High risk."
  };
}

function telegramMessage(
  candidate
) {
  const alertClass =
    telegramAlertClass(
      candidate
    );

  const holders = candidate.holders;
  const whale = holders?.whale;
  const market = candidate.market;

  const riskScore =
    candidate.risk?.verified &&
    candidate.risk?.score !== null
      ? `${candidate.risk.score}/100 (${candidate.risk.label})`
      : "UNVERIFIED";

  const marketQualityText =
    candidate.marketQuality?.verified
      ? `${candidate.marketQuality.score}/100`
      : "UNVERIFIED";

  const holderText =
    holders?.countersVerified &&
    holders?.holderCount !== null
      ? formatNumber(holders.holderCount)
      : "UNVERIFIED";

  const holderConcentrationStatusV144 =
    holders?.concentrationVerified === true &&
    holders?.integrity?.verified === true
      ? "VERIFIED"
      : "UNVERIFIED";

  const holderProviderV144 =
    holders?.holderSource ||
    (
      holders?.cached
        ? "CACHED_VERIFIED_HOLDER_DATA"
        : "UNVERIFIED"
    );

  const whaleWallets =
    holders?.concentrationVerified && whale?.verified
      ? String(whale.whaleCount)
      : "UNVERIFIED";

  const topHolder =
    holders?.concentrationVerified && whale?.verified
      ? percentDisplay(whale.top1Percent)
      : "UNVERIFIED";

  const top10 =
    holders?.concentrationVerified && whale?.verified
      ? percentDisplay(whale.top10Percent)
      : "UNVERIFIED";

  const concentration =
    holders?.concentrationVerified && whale?.verified
      ? whale.concentrationRisk
      : "UNVERIFIED";

  const tradeWindow = window => {
    if (!market?.verified) {
      return {
        buys: "UNVERIFIED",
        sells: "UNVERIFIED",
        buyUsd: "UNVERIFIED",
        sellUsd: "UNVERIFIED",
        netUsd: "UNVERIFIED",
        pressure: "UNVERIFIED",
        pressureUsd: "UNVERIFIED"
      };
    }

    const tx =
      market.transactions?.[window] ||
      {};

    const flow =
      market.directionalFlow?.[window] ||
      {};

    return {
      buys:
        safeNumber(tx?.buys),
      sells:
        safeNumber(tx?.sells),
      buyUsd:
        flow?.verified
          ? money(flow.buyVolumeUsd)
          : "UNVERIFIED",
      sellUsd:
        flow?.verified
          ? money(flow.sellVolumeUsd)
          : "UNVERIFIED",
      netUsd:
        flow?.verified
          ? money(flow.netFlowUsd)
          : "UNVERIFIED",
      pressure:
        tx?.buyPressure !== null &&
        tx?.buyPressure !== undefined
          ? percentDisplay(
              tx.buyPressure
            )
          : "UNVERIFIED",

      pressureUsd:
        flow?.verified &&
        flow?.buyPressureUsd !==
          null &&
        flow?.buyPressureUsd !==
          undefined
          ? percentDisplay(
              flow.buyPressureUsd
            )
          : "UNVERIFIED"
    };
  };

  const smartMoneyCandidate =
    holders?.concentrationVerified && whale?.verified
      ? yesNo(whale.smartMoneyCandidate)
      : "NO";

  const money = value =>
    value !== null && value !== undefined
      ? "$" + formatNumber(value)
      : "UNVERIFIED";

  const trade5m =
    tradeWindow("m5");

  const trade1h =
    tradeWindow("h1");

  const trade24h =
    tradeWindow("h24");

  const lines = [
    `🚨 <b>Robinhood Chain Meme Hunter ${VERSION}</b>`,
    `📣 <b>${escapeHtml(alertClass.title)}</b>`,
    "",
    `🪙 <b>${escapeHtml(candidate.name || "Unknown Token")} (${escapeHtml(candidate.symbol || "UNKNOWN")})</b>`,
    "",
    "<b>Contract:</b>",
    `<code>${escapeHtml(candidate.address)}</code>`,
    "",
    `🎯 Opportunity: <b>${candidate.opportunity.score}/100</b>`,
    `🚀 Momentum: <b>${candidate.momentum.score}/100 (${candidate.momentum.label})</b>`,
    `🔎 Confidence: <b>${candidate.confidence.score}/100 (${candidate.confidence.label})</b>`,
    `🧪 Market Quality: <b>${marketQualityText}</b>`,
    `🛡 Rug Risk: <b>${riskScore}</b>`,
    "",
    `💰 Market Cap: <b>${market?.verified ? money(market.marketCap) : "UNVERIFIED"}</b>`,
    `💧 Liquidity: <b>${market?.verified ? money(market.liquidityUsd) : "UNVERIFIED"}</b>`,
    `📊 24h Volume: <b>${market?.verified ? money(market.volume?.h24) : "UNVERIFIED"}</b>`,
    "",
    "📊 <b>Trading Activity</b>",
    `🟢 5m Buys: <b>${trade5m.buys}</b> — <b>${trade5m.buyUsd}</b>`,
    `🔴 5m Sells: <b>${trade5m.sells}</b> — <b>${trade5m.sellUsd}</b>`,
    `📈 5m Net Flow: <b>${trade5m.netUsd}</b>`,
    `💵 5m USD Buy Pressure: <b>${trade5m.pressureUsd}</b>`,
    "",
    `🟢 1h Buys: <b>${trade1h.buys}</b> — <b>${trade1h.buyUsd}</b>`,
    `🔴 1h Sells: <b>${trade1h.sells}</b> — <b>${trade1h.sellUsd}</b>`,
    `📈 1h Net Flow: <b>${trade1h.netUsd}</b>`,
    `🟢 1h Buy Pressure: <b>${trade1h.pressure}</b>`,
    `💵 1h USD Buy Pressure: <b>${trade1h.pressureUsd}</b>`,
    "",
    `🟢 24h Buys: <b>${trade24h.buys}</b> — <b>${trade24h.buyUsd}</b>`,
    `🔴 24h Sells: <b>${trade24h.sells}</b> — <b>${trade24h.sellUsd}</b>`,
    `📈 24h Net Flow: <b>${trade24h.netUsd}</b>`,
    `💵 24h USD Buy Pressure: <b>${trade24h.pressureUsd}</b>`,
    "",
    `👥 Holder count: <b>${holderText}</b>`,
    `🔎 Holder concentration: <b>${holderConcentrationStatusV144}</b>`,
    `🛰 Holder data source: <b>${escapeHtml(holderProviderV144)}</b>`,
    "",
    `🐋 Whale wallets: <b>${whaleWallets}</b>`,
    `🐋 Top holder: <b>${topHolder}</b>`,
    `🐋 Top 10: <b>${top10}</b>`,
    `🐋 Concentration: <b>${concentration}</b>`,
    "",
    `🐋 Whale Flow: <b>${candidate.whaleFlow.flow}</b>`,
    `📥 Accumulation: <b>${candidate.whaleFlow.accumulation}</b>`,
    `📤 Distribution: <b>${candidate.whaleFlow.distribution}</b>`,
    `📊 Concentration Trend: <b>${candidate.whaleFlow.concentrationTrend}</b>`,
    "",
    `🧠 Smart-money candidate: <b>${smartMoneyCandidate}</b>`,
    "🧠 Smart-money identity verified: <b>NO</b>",
    "",
    `📡 Pool V4 swaps: <b>${candidate.activity.swaps}</b>`,
    `💦 Pool liquidity events: <b>${candidate.activity.liquidityEvents}</b>`,
    "",
    `⚠️ <b>${escapeHtml(alertClass.footer)}</b>`
  ];

  return lines.join("\n");
}

/* =========================================================
   TOKEN ANALYSIS
   ========================================================= */

async function analyzeToken(
  env,
  budget,
  state,
  watched,
  activity,
  options
) {
  const address =
    normalize(
      watched.address
    );

  const previous =
    getHistoricalSnapshot(
      state,
      address
    );

  if (
    watched.excludedReason
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      excludedAsset:
        true,

      exclusionReason:
        watched.excludedReason,

      validation:
        watched.metadata ||
        null,

      reason:
        watched.excludedReason
    };
  }

  const validation =
    await verifyERC20(
      env,
      address,
      budget,
      watched
    );

  if (
    validation.deferred
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        true,

      validation,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  if (
    !validation.validERC20
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      validation,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  if (
    knownQuoteMetadata(
      address,
      validation.symbol
    )
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      infrastructureToken:
        true,

      validation,

      reason:
        "KNOWN_QUOTE_OR_INFRASTRUCTURE"
    };
  }

  const exclusionReason =
    tokenizedSecurityReason(
      validation.name,
      validation.symbol
    );

  if (
    exclusionReason
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      excludedAsset:
        true,

      exclusionReason,

      validation,

      reason:
        exclusionReason,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  let market = {
    verified:
      false,

    status:
      "LOOKUP_SKIPPED"
  };

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    market =
      await marketData(
        address,
        budget,
        watched,
        state,
        Boolean(
          options?.marketFreshEligible
        ),
        Boolean(
          options?.priorityCompletion
        )
      );
  }

  const onChainPoolIdentity =
    onChainPoolIdentityV153(
      watched
    );

  const onChainMarketEvidence =
    onChainV4MarketEvidence(
      watched,
      activity
    );

  market = {
    ...market,

    onChainEvidence:
      onChainMarketEvidence,

    onChainMarketVerified:
      onChainMarketEvidence
        .verified ===
      true
  };

  let holders =
    unverifiedHolders();

  if (
    validation.totalSupply &&
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    holders =
      await holderIntelligence(
        address,
        validation.totalSupply,
        budget,
        watched,
        market,
        Boolean(
          options?.priorityCompletion
        ),
        env,
        state
      );
  }

  const whaleFlow =
    analyseWhaleFlow(
      previous,
      holders
    );

  const liveMomentumActivityV152 = {
    swaps:
      safeNumber(
        options
          ?.liveMomentumActivityV152
          ?.swaps
      ),

    liquidityEvents:
      safeNumber(
        options
          ?.liveMomentumActivityV152
          ?.liquidityEvents
      ),

    poolSpecific:
      Boolean(
        options
          ?.liveMomentumActivityV152
          ?.poolSpecific
      ),

    verified:
      options
        ?.liveMomentumActivityV152
        ?.verified ===
      true
  };

  const momentum =
    momentumAnalysis(
      previous,
      market,
      holders,
      liveMomentumActivityV152
    );

  const quality =
    marketQuality(
      market
    );

  const launch =
    launchStage(
      market
    );

  const risk =
    scoreRisk(
      validation,
      market,
      holders,
      activity,
      whaleFlow
    );

  const opportunity =
    scoreOpportunity(
      validation,
      market,
      holders,
      activity,
      momentum,
      quality,
      whaleFlow,
      launch
    );

  const candidate = {
    address,

    name:
      validation.name,

    symbol:
      validation.symbol,

    decimals:
      validation.decimals,

    totalSupply:
      validation.totalSupply,

    validERC20:
      true,

    analysisDeferred:
      false,

    validation,

    market,

    holders,

    activity,

    onChainPoolIdentityV153:
      onChainPoolIdentity,

    liveMomentumActivityV152,

    momentum,

    marketQuality:
      quality,

    launchStage:
      launch,

    whaleFlow,

    risk,

    opportunity,

    /*
     * V120: newlyDiscovered means NEW_TO_SCANNER only.
     * It is intentionally separate from verified pair launch age.
     */
    newlyDiscovered:
      Boolean(
        options?.newlyDiscovered
      ),

    discoveryClassification: {
      newToScanner:
        Boolean(
          options?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options?.liveDiscovery
        ),

      launchFreshness:
        trueLaunchFreshness(
          watched
        )
    },

    newlyLaunched:
      trueLaunchFreshness(
        watched
      ).newlyLaunched,

    liveDiscovery:
      Boolean(
        options?.liveDiscovery
      )
  };

  candidate.signalConfirmation =
    signalConfirmation(
      candidate
    );

  candidate.confidence =
    candidateConfidence(
      candidate
    );

  candidate.holderBreadthV136 =
    healthyHolderBreadthV136(
      holders
    );

  candidate.analysisPriority =
    analysisPriority(
      candidate
    );

  return candidate;
}

/* =========================================================
   RANGE HELPERS
   ========================================================= */

function liveRange(
  latest
) {
  return {
    from:
      latest -
        BigInt(
          LIVE_SCAN_BLOCKS -
          1
        ) >=
      0n
        ? latest -
          BigInt(
            LIVE_SCAN_BLOCKS -
            1
          )
        : 0n,

    to:
      latest
  };
}

function backlogStart(
  lastScanned,
  latest
) {
  if (
    lastScanned ===
      null ||
    lastScanned ===
      undefined
  ) {
    return latest >
      2000n
      ? latest -
        2000n
      : 0n;
  }

  const from =
    BigInt(
      lastScanned
    ) +
    1n;

  return from >
    latest
    ? null
    : from;
}

function backlogTarget(
  latest
) {
  if (
    latest <
    BigInt(
      BACKLOG_LIVE_GUARD_BLOCKS
    )
  ) {
    return 0n;
  }

  return latest -
    BigInt(
      BACKLOG_LIVE_GUARD_BLOCKS
    );
}

function backlogLagLabel(
  remaining
) {
  const blocks =
    safeNumber(
      remaining
    );

  if (
    blocks >=
    500000
  ) {
    return "VERY_LARGE";
  }

  if (
    blocks >=
    100000
  ) {
    return "LARGE";
  }

  if (
    blocks >=
    20000
  ) {
    return "MEDIUM";
  }

  if (
    blocks >=
    1000
  ) {
    return "SMALL";
  }

  if (
    blocks >
    0
  ) {
    return "NEAR_TIP";
  }

  return "CAUGHT_UP";
}


/* =========================================================
   V116 PRIORITY CANDIDATE COMPLETION
   ========================================================= */


function terminalPriorityReject(
  candidate
) {
  if (
    !candidate ||
    candidate?.risk?.verified !==
      true
  ) {
    return {
      terminal:
        false,
      reason:
        null
    };
  }

  const riskScore =
    safeNumber(
      candidate
        ?.risk
        ?.score
    );

  const severeOverride =
    candidate
      ?.risk
      ?.severeOverride ===
      true;

  const concentrationRisk =
    candidate
      ?.holders
      ?.whale
      ?.concentrationRisk ||
    null;

  const top1Percent =
    safeNumber(
      candidate
        ?.holders
        ?.whale
        ?.top1Percent
    );

  if (
    severeOverride
  ) {
    return {
      terminal:
        true,
      reason:
        "VERIFIED_SEVERE_RISK"
    };
  }

  if (
    concentrationRisk ===
      "HIGH"
  ) {
    return {
      terminal:
        true,
      reason:
        "VERIFIED_HIGH_CONCENTRATION"
    };
  }

  if (
    top1Percent >=
      50
  ) {
    return {
      terminal:
        true,
      reason:
        "VERIFIED_EXTREME_TOP1"
    };
  }

  if (
    riskScore >
      MAX_ALERT_RISK
  ) {
    return {
      terminal:
        true,
      reason:
        "VERIFIED_RISK_ABOVE_ALERT_MAXIMUM"
    };
  }

  return {
    terminal:
      false,
    reason:
      null
  };
}


/*
 * V119 PRE-MARKET TERMINAL PRUNING
 *
 * This deliberately uses only persisted holder evidence that was previously
 * verified by the normal holder-integrity pipeline. It never guesses risk
 * from an empty/invalid holder list.
 */
function terminalPriorityRejectFromWatched(
  watched
) {
  const cache =
    watched?.holderCache;

  if (
    !cache ||
    typeof cache !==
      "object"
  ) {
    return {
      terminal:
        false,
      reason:
        null,
      evidence:
        "NO_HOLDER_CACHE"
    };
  }

  const cacheTimestamp =
    safeNumber(
      cache.timestamp
    );

  const cacheAgeMs =
    cacheTimestamp
      ? Date.now() -
        cacheTimestamp
      : null;

  /*
   * Do not pre-prune from indefinitely old holder evidence.
   * V119 reuses the same two-hour maximum stale-holder window already
   * accepted elsewhere by the bot.
   */
  if (
    !cacheTimestamp ||
    cacheAgeMs >
      HOLDER_STALE_CACHE_MS
  ) {
    return {
      terminal:
        false,
      reason:
        null,
      evidence:
        "HOLDER_CACHE_TOO_OLD",
      cacheAgeMs
    };
  }

  const holders =
    cache.data;

  const integrityVerified =
    holders
      ?.integrity
      ?.verified ===
      true &&
    holders
      ?.integrity
      ?.status ===
      "VERIFIED";

  const concentrationVerified =
    holders
      ?.concentrationVerified ===
      true &&
    holders
      ?.whale
      ?.verified ===
      true;

  if (
    !integrityVerified ||
    !concentrationVerified
  ) {
    return {
      terminal:
        false,
      reason:
        null,
      evidence:
        "CACHED_CONCENTRATION_NOT_VERIFIED",
      cacheAgeMs
    };
  }

  const concentrationRisk =
    holders
      ?.whale
      ?.concentrationRisk ||
    "UNVERIFIED";

  const top1Percent =
    safeNumber(
      holders
        ?.whale
        ?.top1Percent
    );

  if (
    concentrationRisk ===
      "HIGH"
  ) {
    return {
      terminal:
        true,
      reason:
        "CACHED_VERIFIED_HIGH_CONCENTRATION",
      evidence:
        "VERIFIED_HOLDER_CACHE",
      cacheAgeMs,
      top1Percent,
      concentrationRisk
    };
  }

  if (
    top1Percent >=
      50
  ) {
    return {
      terminal:
        true,
      reason:
        "CACHED_VERIFIED_EXTREME_TOP1",
      evidence:
        "VERIFIED_HOLDER_CACHE",
      cacheAgeMs,
      top1Percent,
      concentrationRisk
    };
  }

  return {
    terminal:
      false,
    reason:
      null,
    evidence:
      "VERIFIED_HOLDER_CACHE",
    cacheAgeMs,
    top1Percent,
    concentrationRisk
  };
}


function marketPairAgeMinutes(
  watched
) {
  const createdAt =
    safeNumber(
      watched
        ?.marketCache
        ?.data
        ?.pairCreatedAt
    );

  if (
    !createdAt ||
    createdAt <=
      0
  ) {
    return null;
  }

  return Math.max(
    0,
    (
      Date.now() -
      createdAt
    ) /
    60000
  );
}

function trueLaunchFreshness(
  watched
) {
  const ageMinutes =
    marketPairAgeMinutes(
      watched
    );

  if (
    ageMinutes ===
      null
  ) {
    return {
      verified:
        false,
      ageMinutes:
        null,
      newlyLaunched:
        false,
      label:
        "UNVERIFIED"
    };
  }

  if (
    ageMinutes <=
      60
  ) {
    return {
      verified:
        true,
      ageMinutes,
      newlyLaunched:
        true,
      label:
        "NEWLY_LAUNCHED"
    };
  }

  if (
    ageMinutes <=
      24 * 60
  ) {
    return {
      verified:
        true,
      ageMinutes,
      newlyLaunched:
        false,
      label:
        "EARLY"
    };
  }

  return {
    verified:
      true,
    ageMinutes,
    newlyLaunched:
      false,
    label:
      "MATURE"
  };
}


function preMarketExcludedToken(
  token
) {
  const meta =
    token?.metadata ||
    token?.validationCache?.data ||
    token?.validation ||
    null;

  const name =
    String(
      meta?.name ||
      token?.name ||
      ""
    ).trim();

  const symbol =
    String(
      meta?.symbol ||
      token?.symbol ||
      ""
    ).trim();

  /*
   * Reuse exclusion helpers that already exist in this worker.
   */
  const tokenizedReason =
    tokenizedSecurityReason(
      name,
      symbol
    );

  if (
    tokenizedReason
  ) {
    return {
      excluded:
        true,
      reason:
        tokenizedReason,
      name,
      symbol
    };
  }

  if (
    knownQuoteMetadata(
      normalize(
        token?.address
      ),
      symbol
    )
  ) {
    return {
      excluded:
        true,
      reason:
        "KNOWN_QUOTE_OR_INFRASTRUCTURE",
      name,
      symbol
    };
  }

  const cachedReason =
    token
      ?.excludedReason ||
    token
      ?.validationCache
      ?.data
      ?.reason ||
    token
      ?.validation
      ?.reason ||
    null;

  const cachedExcluded =
    Boolean(
      token?.excludedReason
    ) ||
    token
      ?.validationCache
      ?.data
      ?.excluded ===
      true ||
    token
      ?.validation
      ?.excluded ===
      true;

  if (
    cachedExcluded
  ) {
    return {
      excluded:
        true,
      reason:
        cachedReason ||
        "CACHED_EXCLUDED_ASSET",
      name,
      symbol
    };
  }

  return {
    excluded:
      false,
    reason:
      null,
    name,
    symbol
  };
}

function preMarketCandidateAllowed(
  token
) {
  const terminal =
    terminalPriorityRejectFromWatched(
      token
    );

  return (
    marketFreshCandidateAllowed(
      token
    ) &&
    !preMarketExcludedToken(
      token
    ).excluded &&
    !terminal.terminal
  );
}


function verifiedUsableMarketCache(
  token
) {
  const cache =
    token?.marketCache;

  const data =
    cache?.data;

  if (
    !data ||
    data.verified !==
      true
  ) {
    return false;
  }

  if (
    safeNumber(
      data.liquidityUsd
    ) <=
      0 ||
    safeNumber(
      data.priceUsd
    ) <=
      0
  ) {
    return false;
  }

  return true;
}

function marketFreshPriorityScore(
  token,
  newTokens,
  liveTokens
) {
  if (
    !preMarketCandidateAllowed(
      token
    )
  ) {
    return -1000000;
  }

  const address =
    normalize(
      token.address
    );

  const launch =
    trueLaunchFreshness(
      token
    );

  const cachedMarketVerified =
    token
      ?.marketCache
      ?.data
      ?.verified ===
      true;

  const holders =
    token
      ?.holderCache
      ?.data;

  const holderVerified =
    holders
      ?.integrity
      ?.verified ===
      true &&
    holders
      ?.concentrationVerified ===
      true &&
    holders
      ?.whale
      ?.verified ===
      true;

  const concentration =
    holders
      ?.whale
      ?.concentrationRisk ||
    "UNVERIFIED";

  const top1 =
    safeNumber(
      holders
        ?.whale
        ?.top1Percent
    );

  let score =
    0;

  /*
   * Main V120 goal: use the scarce fresh market request on a viable token
   * whose market data is still missing.
   */
  if (
    !cachedMarketVerified
  ) {
    score +=
      220;
  }
  else {
    score -=
      160;
  }

  if (
    verifiedUsableMarketCache(
      token
    )
  ) {
    score -=
      40;
  }

  /*
   * "New to this scanner" is useful discovery information, but is no longer
   * treated as proof that the token itself was newly launched.
   */
  if (
    newTokens.has(
      address
    )
  ) {
    score +=
      25;
  }

  if (
    liveTokens.has(
      address
    )
  ) {
    score +=
      30;
  }

  if (
    safeNumber(
      token.lastLiveSeenAt
    ) >
      0 &&
    Date.now() -
      safeNumber(
        token.lastLiveSeenAt
      ) <
      30 * 60 * 1000
  ) {
    score +=
      20;
  }

  if (
    launch.verified
  ) {
    if (
      launch.label ===
        "NEWLY_LAUNCHED"
    ) {
      score +=
        40;
    }
    else if (
      launch.label ===
        "EARLY"
    ) {
      score +=
        20;
    }
    else if (
      launch.label ===
        "MATURE"
    ) {
      score -=
        50;
    }
  }

  if (
    holderVerified
  ) {
    if (
      concentration ===
        "LOW"
    ) {
      score +=
        35;
    }
    else if (
      concentration ===
        "MEDIUM"
    ) {
      score +=
        15;
    }

    if (
      top1 >
        0 &&
      top1 <=
        10
    ) {
      score +=
        15;
    }
    else if (
      top1 >
        10 &&
      top1 <=
        20
    ) {
      score +=
        8;
    }
  }

  score +=
    Math.min(
      30,
      safeNumber(
        token.analysisPriority
      ) /
      10
    );

  return score;
}

function marketFreshCandidateAllowed(
  watched
) {
  return !terminalPriorityRejectFromWatched(
    watched
  ).terminal;
}

function completionCandidateStillEligible(
  watched
) {
  return Boolean(
    watched &&
    normalize(
      watched.address
    ) &&
    !watched.excludedReason
  );
}

function completionCandidateAddress(
  state
) {
  return normalize(
    state
      ?.priorityCandidateCompletion
      ?.address
  );
}

function completionCandidateBlockers(
  candidate
) {
  if (!candidate) {
    return [
      "ANALYSIS_NOT_COMPLETED"
    ];
  }

  const blockers = [];

  if (
    !candidate?.market?.verified
  ) {
    blockers.push(
      "MARKET_UNVERIFIED"
    );
  }

  if (
    !candidate?.holders?.concentrationVerified &&
    !candidate?.holders?.countersVerified
  ) {
    blockers.push(
      "HOLDER_EVIDENCE_UNVERIFIED"
    );
  }

  if (
    !candidate?.risk?.verified
  ) {
    blockers.push(
      "RISK_UNVERIFIED"
    );
  }

  if (
    candidate?.market?.verified &&
    safeNumber(
      candidate?.market?.liquidityUsd
    ) <
    MIN_ALERT_LIQUIDITY
  ) {
    blockers.push(
      "LIQUIDITY_BELOW_ALERT_MINIMUM"
    );
  }

  if (
    safeNumber(
      candidate?.confidence?.score
    ) <
    MIN_CONFIDENCE_ALERT
  ) {
    blockers.push(
      "CONFIDENCE_BELOW_ALERT_MINIMUM"
    );
  }

  if (
    safeNumber(
      candidate?.opportunity?.score
    ) <
    MIN_ALERT_SCORE
  ) {
    blockers.push(
      "OPPORTUNITY_BELOW_ALERT_MINIMUM"
    );
  }

  return blockers;
}

const PRIORITY_RELEVANCE_MIN_AGE_MS_V140 =
  7 * 24 * 60 * 60 * 1000;

const PRIORITY_RELEVANCE_MAX_VOLUME_24H_USD_V140 =
  10;

const PRIORITY_RELEVANCE_MAX_TXNS_24H_V140 =
  2;

const RETRY_FAIRNESS_MIN_SCORE_LEAD_V139 =
  20;

const PRIORITY_COMPLETION_MAX_ATTEMPTS_V138 =
  12;

const PRIORITY_COMPLETION_MAX_AGE_MS_V138 =
  6 * 60 * 60 * 1000;

function priorityRetryRelevanceExpiryV140(
  candidate
) {
  if (
    !candidate ||
    !candidate?.market?.verified
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "MARKET_NOT_VERIFIED"
    };
  }

  const pairCreatedAt =
    safeNumber(
      candidate
        ?.market
        ?.pairCreatedAt
    );

  if (
    pairCreatedAt <= 0
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "PAIR_AGE_UNAVAILABLE"
    };
  }

  const ageMs =
    Math.max(
      0,
      Date.now() -
        pairCreatedAt
    );

  if (
    ageMs <
      PRIORITY_RELEVANCE_MIN_AGE_MS_V140
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "AGE_BELOW_RELEVANCE_EXPIRY"
    };
  }

  if (
    candidate?.newlyDiscovered ||
    candidate?.liveDiscovery ||
    candidate?.newlyLaunched
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "NEW_OR_LIVE_CLASSIFICATION"
    };
  }

  const onChainSwaps =
    safeNumber(
      candidate
        ?.activity
        ?.swaps
    );

  const onChainLiquidityEvents =
    safeNumber(
      candidate
        ?.activity
        ?.liquidityEvents
    );

  if (
    onChainSwaps > 0 ||
    onChainLiquidityEvents > 0
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "CURRENT_ONCHAIN_ACTIVITY"
    };
  }

  const volume24h =
    safeNumber(
      candidate
        ?.market
        ?.volume
        ?.h24
    );

  const txns24h =
    safeNumber(
      candidate
        ?.market
        ?.transactions
        ?.h24
        ?.total
    );

  const nearZeroVerifiedActivity =
    volume24h <=
      PRIORITY_RELEVANCE_MAX_VOLUME_24H_USD_V140 &&
    txns24h <=
      PRIORITY_RELEVANCE_MAX_TXNS_24H_V140;

  if (
    !nearZeroVerifiedActivity
  ) {
    return {
      expired: false,
      reason: null,
      evidence:
        "VERIFIED_MARKET_ACTIVITY_PRESENT",
      ageMs,
      volume24h,
      txns24h
    };
  }

  return {
    expired: true,
    reason:
      "PRIORITY_RETRY_RELEVANCE_EXPIRED_V140",
    evidence:
      "VERIFIED_OLD_AND_NEAR_ZERO_ACTIVITY",
    ageMs,
    ageDays:
      ageMs /
      (
        24 *
        60 *
        60 *
        1000
      ),
    volume24h,
    txns24h,
    onChainSwaps,
    onChainLiquidityEvents
  };
}

function shouldKeepCompletionCandidate(
  candidate,
  previousCompletion = null
) {

  const terminal =
    terminalPriorityReject(
      candidate
    );

  if (
    terminal.terminal
  ) {
    return false;
  }

  if (
    !candidate ||
    !candidate.validERC20 ||
    candidate.excludedAsset ||
    candidate.infrastructureToken
  ) {
    return false;
  }

  const relevanceExpiry =
    priorityRetryRelevanceExpiryV140(
      candidate
    );

  if (
    relevanceExpiry.expired
  ) {
    return false;
  }

  /*
   * Once market and risk are verified, the candidate has enough evidence for
   * a real Telegram qualification decision and must not monopolize retries.
   */
  if (
    candidate?.market?.verified &&
    candidate?.risk?.verified
  ) {
    return false;
  }

  const candidateAddress =
    normalize(
      candidate?.address
    );

  const previousAddress =
    normalize(
      previousCompletion?.address
    );

  const samePreviousCandidate =
    Boolean(
      candidateAddress &&
      previousAddress &&
      candidateAddress ===
        previousAddress
    );

  const attempts =
    samePreviousCandidate
      ? safeNumber(
          previousCompletion?.attempts
        )
      : 0;

  const firstQueuedAt =
    samePreviousCandidate
      ? safeNumber(
          previousCompletion?.firstQueuedAt
        )
      : 0;

  const ageMs =
    firstQueuedAt > 0
      ? Math.max(
          0,
          Date.now() -
            firstQueuedAt
        )
      : 0;

  const retryExhausted =
    attempts >=
      PRIORITY_COMPLETION_MAX_ATTEMPTS_V138 ||
    ageMs >=
      PRIORITY_COMPLETION_MAX_AGE_MS_V138;

  if (
    retryExhausted
  ) {
    return false;
  }

  const holderEvidenceVerified =
    Boolean(
      candidate
        ?.holders
        ?.concentrationVerified ||
      candidate
        ?.holders
        ?.countersVerified
    );

  const transientEvidenceGap =
    !candidate
      ?.market
      ?.verified ||
    !holderEvidenceVerified ||
    !candidate
      ?.risk
      ?.verified;

  /*
   * V138:
   * Provider guards/cooldowns/outages can leave an otherwise valid candidate
   * unresolved. Preserve it for a bounded retry even if it has not yet built
   * enough activity signals to satisfy the older V115/V116 persistence rule.
   */
  if (
    transientEvidenceGap
  ) {
    return true;
  }

  return (
    Boolean(
      candidate?.newlyDiscovered
    ) ||
    Boolean(
      candidate?.liveDiscovery
    ) ||
    safeNumber(
      candidate?.activity?.swaps
    ) > 0 ||
    safeNumber(
      candidate?.activity?.liquidityEvents
    ) > 0 ||
    safeNumber(
      candidate?.signalConfirmation?.signals
    ) >= 2
  );
}


/* =========================================================
   MAIN SCAN
   ========================================================= */

async function scan(
  env,
  options = {}
) {
  const startedAt =
    Date.now();

  const budget =
    createBudget();

  const stateResult =
    await readState(
      env
    );

  const state =
    stateResult.state;

  pruneState(
    state,
    false
  );

  const scheduled =
    Boolean(
      options.scheduled
    );

  if (
    scheduled
  ) {
    state.scheduler
      .scheduledRunCount =
      safeNumber(
        state.scheduler
          .scheduledRunCount
      ) +
      1;

    state.scheduler
      .lastScheduledRunAt =
      Date.now();
  }

  const latest =
    await latestBlock(
      env,
      budget
    );

  const latestNumber =
    Number(
      latest.block
    );

  const previousBacklogCursor =
    state.lastScannedBlock;

  const liveOutput = {
    logs:
      [],

    ranges:
      []
  };

  const backlogOutput = {
    logs:
      [],

    ranges:
      []
  };

  const newTokens =
    new Set();

  const liveTokens =
    new Set();

  /* =======================================================
     LIVE FIRST
     ======================================================= */

  const live =
    liveRange(
      latest.block
    );

  const liveScan =
    await scanLiveRange(
      env,
      state,
      live.from,
      live.to,
      budget,
      liveOutput
    );

  const liveError =
    liveScan.success
      ? null
      : liveScan.error;

  const liveDiscovery =
    processDiscoveryLogs(
      state,
      liveOutput.logs,
      "LIVE"
    );

  for (
    const token
    of liveDiscovery.newTokens
  ) {
    newTokens.add(
      token
    );
  }

  for (
    const token
    of liveDiscovery.seenTokens
  ) {
    liveTokens.add(
      token
    );
  }

  /*
   * V98: a pool can be active in the 20-block live window while its
   * Initialize event sits just outside that window. Fetch one cheap,
   * initialize-only lookback range and register those mappings before
   * classifying live swaps as unknown.
   */
  const preLookbackActivity =
    activeTokensFromLogs(
      state,
      liveOutput.logs
    );

  const prioritizeTargetedResolution =
    preLookbackActivity
      .unknownPoolIds
      .size >=
    UNKNOWN_POOL_TARGETED_PRIORITY_THRESHOLD;

  let liveInitializeLookback = {
    attempted: false,
    skipped: false,
    skippedReason: null,
    fromBlock: null,
    toBlock: null,
    logs: 0,
    initializeEvents: 0,
    provider: null,
    error: null
  };

  if (
    live.from > 0n &&
    !prioritizeTargetedResolution
  ) {
    const lookbackTo = live.from - 1n;
    const lookbackFrom =
      lookbackTo >= BigInt(LIVE_INITIALIZE_LOOKBACK_BLOCKS - 1)
        ? lookbackTo - BigInt(LIVE_INITIALIZE_LOOKBACK_BLOCKS - 1)
        : 0n;

    const lookback = await getInitializeLookback(
      env, state, lookbackFrom, lookbackTo, budget
    );

    liveInitializeLookback = {
      attempted: true,
      fromBlock: Number(lookbackFrom),
      toBlock: Number(lookbackTo),
      logs: lookback.logs.length,
      initializeEvents: 0,
      provider: lookback.provider,
      error: lookback.error
    };

    for (const log of lookback.logs) {
      const pool = decodeInitialize(log);
      if (!pool) continue;
      registerPoolMapping(state, pool);
      liveInitializeLookback.initializeEvents++;
    }
  } else if (
    live.from > 0n &&
    prioritizeTargetedResolution
  ) {
    liveInitializeLookback.skipped =
      true;

    liveInitializeLookback.skippedReason =
      "TARGETED_UNKNOWN_POOL_RESOLUTION_PRIORITY";
  }

  let liveActivity =
    activeTokensFromLogs(
      state,
      liveOutput.logs
    );

  observeUnknownPools(
    state,
    liveOutput.logs,
    liveActivity
      .unknownPoolIds
  );

  const unknownPoolResolution =
    await resolvePersistentUnknownPools(
      env,
      state,
      budget
    );

  if (
    unknownPoolResolution
      .resolved > 0
  ) {
    liveActivity =
      activeTokensFromLogs(
        state,
        liveOutput.logs
      );
  }

  for (
    const token
    of liveActivity.tokens
  ) {
    liveTokens.add(
      token
    );
  }

  if (
    liveScan.success &&
    liveScan.processedThrough !==
      null &&
    liveScan.processedThrough !==
      undefined
  ) {
    state.lastLiveScannedBlock =
      Number(
        liveScan.processedThrough
      );
  }

  /* =======================================================
     BACKLOG
     ======================================================= */

  const backlogFrom =
    backlogStart(
      previousBacklogCursor,
      latest.block
    );

  const backlogTargetBlock =
    backlogTarget(
      latest.block
    );

  let backlogResult =
    null;

  let backlogError =
    null;

  let backlogDiscovery = {
    rawLogs:
      0,

    initializeEvents:
      0,

    swapTopicMatches:
      0,

    liquidityTopicMatches:
      0,

    newTokens:
      new Set(),

    seenTokens:
      new Set()
  };

  if (
    backlogFrom !==
      null &&
    backlogFrom <=
      backlogTargetBlock &&
    budgetAvailable(
      budget,
      "discovery-backlog"
    )
  ) {
    backlogResult =
      await scanBacklogSequential(
        env,
        state,
        backlogFrom,
        backlogTargetBlock,
        budget,
        backlogOutput
      );

    backlogDiscovery =
      processDiscoveryLogs(
        state,
        backlogOutput.logs,
        "BACKLOG"
      );

    for (
      const token
      of backlogDiscovery.newTokens
    ) {
      newTokens.add(
        token
      );
    }

    if (
      backlogResult.processedThrough !==
        null &&
      backlogResult.processedThrough !==
        undefined
    ) {
      state.lastScannedBlock =
        Number(
          backlogResult
            .processedThrough
        );
    }

    backlogError =
      backlogResult.error;
  }

  else if (
    backlogFrom !==
      null &&
    backlogFrom >
      backlogTargetBlock &&
    liveScan.success
  ) {
    state.lastScannedBlock =
      latestNumber;
  }

  /* =======================================================
     PRIORITY
     ======================================================= */

  state.watchedTokens =
    uniqueBy(
      state.watchedTokens,

      token =>
        normalize(
          token.address
        )
    );

  state.watchedTokens.sort(
    (
      a,
      b
    ) =>
      watchPriority(
        b,
        newTokens,
        liveTokens
      ) -
      watchPriority(
        a,
        newTokens,
        liveTokens
      )
  );

  state.watchedTokens =
    state.watchedTokens.slice(
      0,
      MAX_WATCHED_TOKENS
    );

  const selectedBase =
    state.watchedTokens.slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const pendingCompletionAddress =
    completionCandidateAddress(
      state
    );

  const pendingCompletionTokenRaw =
    pendingCompletionAddress
      ? state.watchedTokens.find(
          token =>
            normalize(
              token.address
            ) ===
              pendingCompletionAddress &&
            completionCandidateStillEligible(
              token
            )
        ) ||
        null
      : null;

  const pendingPreMarketReject =
    pendingCompletionTokenRaw
      ? terminalPriorityRejectFromWatched(
          pendingCompletionTokenRaw
        )
      : {
          terminal:
            false,
          reason:
            null,
          evidence:
            "NO_PENDING_COMPLETION"
        };

  const pendingPreMarketExclusion =
    pendingCompletionTokenRaw
      ? preMarketExcludedToken(
          pendingCompletionTokenRaw
        )
      : {
          excluded:
            false,
          reason:
            null
        };

  if (
    pendingCompletionTokenRaw &&
    (
      pendingPreMarketReject.terminal ||
      pendingPreMarketExclusion.excluded
    )
  ) {
    state.priorityCandidateCompletion =
      null;

    clearPriorityFreshReservation(
      state,
      pendingCompletionAddress
    );
  }

  const pendingCompletionToken =
    (
      pendingPreMarketReject.terminal ||
      pendingPreMarketExclusion.excluded
    )
      ? null
      : pendingCompletionTokenRaw;

  const selected =
    pendingCompletionToken
      ? uniqueBy(
          [
            pendingCompletionToken,
            ...selectedBase
          ],
          token =>
            normalize(
              token.address
            )
        ).slice(
          0,
          MAX_TOKEN_CHECKS
        )
      : selectedBase;

  /*
   * V116:
   * A pending incomplete candidate owns the next available fresh-market
   * slot. Only when there is no pending completion target do new/live
   * candidates compete for it.
   */
  const rankedMarketFreshCandidates =
    selected
      .filter(
        token =>
          preMarketCandidateAllowed(
            token
          )
      )
      .map(
        token => ({
          token,

          score:
            marketFreshPriorityScore(
              token,
              newTokens,
              liveTokens
            )
        })
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );

  const pendingCompletionRankedRow =
    pendingCompletionToken
      ? rankedMarketFreshCandidates.find(
          row =>
            normalize(
              row?.token?.address
            ) ===
              pendingCompletionAddress
        ) ||
        null
      : null;

  const pendingCompletionPriorityScore =
    pendingCompletionRankedRow
      ?.score ??
    (
      pendingCompletionToken
        ? marketFreshPriorityScore(
            pendingCompletionToken,
            newTokens,
            liveTokens
          )
        : null
    );

  const retryFairnessChallengerRow =
    pendingCompletionToken
      ? rankedMarketFreshCandidates.find(
          row => {
            const address =
              normalize(
                row?.token?.address
              );

            if (
              !address ||
              address ===
                pendingCompletionAddress
            ) {
              return false;
            }

            const isNew =
              newTokens.has(
                address
              );

            const isLive =
              liveTokens.has(
                address
              );

            const recentlyLive =
              safeNumber(
                row?.token?.lastLiveSeenAt
              ) > 0 &&
              Date.now() -
                safeNumber(
                  row?.token?.lastLiveSeenAt
                ) <
                30 * 60 * 1000;

            const clearlyStronger =
              safeNumber(
                row?.score
              ) >=
              safeNumber(
                pendingCompletionPriorityScore
              ) +
                RETRY_FAIRNESS_MIN_SCORE_LEAD_V139;

            return (
              clearlyStronger &&
              (
                isNew ||
                isLive ||
                recentlyLive
              )
            );
          }
        ) ||
        null
      : null;

  const retryFairnessOverrideV139 =
    Boolean(
      pendingCompletionToken &&
      retryFairnessChallengerRow
    );

  let marketFreshTarget =
    retryFairnessOverrideV139
      ? retryFairnessChallengerRow
          ?.token ||
        null
      : pendingCompletionToken ||
        rankedMarketFreshCandidates
          [0]
          ?.token ||
        null;

  let marketFreshTargetAddress =
    normalize(
      marketFreshTarget?.address
    );

  const retryPersistenceAddressV139 =
    retryFairnessOverrideV139
      ? pendingCompletionAddress
      : marketFreshTargetAddress;

  const retryPersistenceTokenV139 =
    retryFairnessOverrideV139
      ? pendingCompletionToken
      : marketFreshTarget;

  /*
   * V133:
   * The fresh-market / priority-completion target is the candidate the bot
   * has already decided is most important to finish. Analyse it before lower
   * priority candidates so they cannot consume its required budget first.
   */
  const analysisSelectedRawV142 =
    marketFreshTarget
      ? uniqueBy(
          [
            marketFreshTarget,
            ...selected
          ],
          token =>
            normalize(
              token.address
            )
        ).slice(
          0,
          MAX_TOKEN_CHECKS
        )
      : selected;

  const preAnalysisTerminalRowsV142 =
    analysisSelectedRawV142
      .map(
        token => ({
          token,
          terminal:
            terminalPriorityRejectFromWatched(
              token
            )
        })
      )
      .filter(
        row =>
          row?.terminal?.terminal ===
          true
      );

  const preAnalysisTerminalAddressesV142 =
    new Set(
      preAnalysisTerminalRowsV142
        .map(
          row =>
            normalize(
              row?.token?.address
            )
        )
        .filter(
          Boolean
        )
    );

  const preAnalysisTerminalSnapshotV150 =
    preAnalysisTerminalRowsV142
      .map(
        row => ({
          address:
            normalize(
              row?.token?.address
            ),
          symbol:
            row?.token?.metadata?.symbol ||
            row?.token?.symbol ||
            null,
          reason:
            row?.terminal?.reason ||
            null,
          top1Percent:
            row?.terminal?.top1Percent ??
            null,
          concentrationRisk:
            row?.terminal?.concentrationRisk ||
            null,
          evidence:
            row?.terminal?.evidence ||
            "VERIFIED_CACHED_HOLDER_EVIDENCE"
        })
      )
      .filter(
        row =>
          Boolean(
            row.address
          )
      );

  const terminalSnapshotAddressesV150 =
    new Set(
      preAnalysisTerminalSnapshotV150
        .map(
          row =>
            row.address
        )
    );

  const v142CarriedTerminalPruned =
    Boolean(
      retryPersistenceAddressV139 &&
      preAnalysisTerminalAddressesV142
        .has(
          retryPersistenceAddressV139
        )
    );

  const preAnalysisTerminalPruningV142 = {
    enabled: true,
    prunedCount:
      preAnalysisTerminalRowsV142.length,
    carriedPriorityCleared:
      v142CarriedTerminalPruned,
    carriedPriorityAddress:
      v142CarriedTerminalPruned
        ? retryPersistenceAddressV139
        : null,
    pruned:
      preAnalysisTerminalRowsV142
        .map(
          row => ({
            address:
              normalize(
                row?.token?.address
              ),
            symbol:
              row?.token
                ?.metadata
                ?.symbol ||
              row?.token
                ?.symbol ||
              null,
            reason:
              row?.terminal?.reason ||
              null,
            top1Percent:
              row?.terminal
                ?.top1Percent ??
              null,
            concentrationRisk:
              row?.terminal
                ?.concentrationRisk ||
              null
          })
        )
  };

  if (
    v142CarriedTerminalPruned
  ) {
    state.priorityCandidateCompletion =
      null;

    clearPriorityFreshReservation(
      state,
      retryPersistenceAddressV139
    );
  }

  const analysisSelected =
    analysisSelectedRawV142
      .filter(
        token =>
          !terminalSnapshotAddressesV150
            .has(
              normalize(
                token?.address
              )
            )
      );

  if (marketFreshTargetAddress) {
    reservePriorityFreshMarket(
      state,
      marketFreshTargetAddress
    );
  }

  const priorityFreshScheduleTelemetry =
    priorityFreshSchedule(
      state,
      marketFreshTargetAddress
    );

  const priorityCompletionTelemetry = {
    enabled:
      true,

    carriedFromPreviousRun:
      Boolean(
        pendingCompletionToken
      ),

    address:
      retryPersistenceAddressV139 ||
      null,

    symbol:
      retryPersistenceTokenV139
        ?.metadata
        ?.symbol ||
      null,

    completed:
      false,

    persistedForRetry:
      false,

    blockers:
      [],

    retryPolicyV138: {
      maxAttempts:
        PRIORITY_COMPLETION_MAX_ATTEMPTS_V138,

      maxAgeMs:
        PRIORITY_COMPLETION_MAX_AGE_MS_V138
    },

    relevancePolicyV140: {
      minimumAgeMs:
        PRIORITY_RELEVANCE_MIN_AGE_MS_V140,

      maxVolume24hUsd:
        PRIORITY_RELEVANCE_MAX_VOLUME_24H_USD_V140,

      maxTransactions24h:
        PRIORITY_RELEVANCE_MAX_TXNS_24H_V140,

      requiresVerifiedMarket:
        true,

      requiresNoOnChainActivity:
        true,

      removesFromWatchlist:
        false
    },

    relevanceExpiryV140:
      null,

    priorityFreshSchedule:
      priorityFreshScheduleTelemetry,

    preMarketTerminalPruning: {
      evaluatedPending:
        Boolean(
          pendingCompletionTokenRaw
        ),

      terminalRejected:
        Boolean(
          pendingPreMarketReject
            ?.terminal
        ),

      rejectedAddress:
        pendingPreMarketReject
          ?.terminal
          ? pendingCompletionAddress
          : null,

      reason:
        pendingPreMarketReject
          ?.reason ||
        null,

      evidence:
        pendingPreMarketReject
          ?.evidence ||
        null,

      cacheAgeMs:
        pendingPreMarketReject
          ?.cacheAgeMs ??
        null,

      top1Percent:
        pendingPreMarketReject
          ?.top1Percent ??
        null,

      concentrationRisk:
        pendingPreMarketReject
          ?.concentrationRisk ||
        null
    }
  };

  if (
    v142CarriedTerminalPruned
  ) {
    const carriedTerminalRowV142 =
      preAnalysisTerminalRowsV142.find(
        row =>
          normalize(
            row?.token?.address
          ) ===
            retryPersistenceAddressV139
      ) ||
      null;

    priorityCompletionTelemetry.completed =
      true;

    priorityCompletionTelemetry.persistedForRetry =
      false;

    priorityCompletionTelemetry.blockers = [
      carriedTerminalRowV142
        ?.terminal
        ?.reason ||
      "CACHED_VERIFIED_TERMINAL_PREANALYSIS_V142"
    ];

    priorityCompletionTelemetry.terminalRejected =
      true;

    priorityCompletionTelemetry.terminalRejectReason =
      carriedTerminalRowV142
        ?.terminal
        ?.reason ||
      "CACHED_VERIFIED_TERMINAL_PREANALYSIS_V142";
  }

  const combinedLogs = [
    ...liveOutput.logs,
    ...backlogOutput.logs
  ];

  const candidates =
    [];

  const validationResults =
    [];

  let deferredAnalysis =
    0;

  let excludedAssets =
    0;

  let marketLookups =
    0;

  let holderLookups =
    0;

  /* =======================================================
     ANALYSIS
     ======================================================= */

  let topCandidateAnalysisDeferred =
    false;

  let topCandidateRequiredRequests =
    null;

  let topCandidateDeferredReason =
    null;

  const v135AnalysisQueue =
    [
      ...analysisSelected
    ];

  const v141AnalysedAddresses =
    new Set();

  let excludedTargetHandoffV141 = {
    enabled: true,
    triggered: false,
    rejectedAddress: null,
    rejectedSymbol: null,
    rejectedReason: null,
    replacementAddress: null,
    replacementSymbol: null,
    replacementScore: null,
    replacementInserted: false,
    freshSlotTransferred: false
  };

  let v135TerminalPriorityHandoff = {
    triggered: false,
    rejectedAddress: null,
    rejectedSymbol: null,
    rejectedReason: null,
    replacementAddress: null,
    replacementSymbol: null,
    replacementInserted: false
  };

  const dynamicTerminalPruningV148 = {
    enabled: true,
    prunedCount: 0,
    estimatedAnalysisRequestsSaved: 0,
    priorityHandoffs: 0,
    pruned: []
  };

  const handoffExcludedFreshTargetV141 = (
    rejectedWatched,
    rejectedCandidate,
    rejectedAddress,
    currentIndex
  ) => {
    const rejected =
      normalize(
        rejectedAddress
      );

    if (
      !rejected ||
      rejected !==
        marketFreshTargetAddress
    ) {
      return false;
    }

    const replacementRow =
      rankedMarketFreshCandidates
        .find(
          row => {
            const item =
              row?.token ||
              null;

            const itemAddress =
              normalize(
                item?.address
              );

            if (
              !item ||
              !itemAddress ||
              itemAddress === rejected ||
              v141AnalysedAddresses.has(
                itemAddress
              ) ||
              terminalSnapshotAddressesV150.has(
                itemAddress
              )
            ) {
              return false;
            }

            if (
              item?.excludedReason
            ) {
              return false;
            }

            const terminal =
              terminalPriorityRejectFromWatched(
                item
              );

            return !terminal?.terminal;
          }
        ) ||
      null;

    excludedTargetHandoffV141 = {
      enabled: true,
      triggered: true,
      rejectedAddress:
        rejected,
      rejectedSymbol:
        rejectedCandidate
          ?.validation
          ?.symbol ||
        rejectedWatched
          ?.metadata
          ?.symbol ||
        null,
      rejectedReason:
        rejectedCandidate
          ?.exclusionReason ||
        rejectedCandidate
          ?.reason ||
        rejectedCandidate
          ?.validation
          ?.reason ||
        (
          rejectedCandidate
            ?.infrastructureToken
            ? "KNOWN_QUOTE_OR_INFRASTRUCTURE"
            : "INVALID_ERC20"
        ),
      replacementAddress: null,
      replacementSymbol: null,
      replacementScore: null,
      replacementInserted: false,
      freshSlotTransferred: false
    };

    if (
      !replacementRow?.token
    ) {
      return true;
    }

    const replacement =
      replacementRow.token;

    const replacementAddress =
      normalize(
        replacement.address
      );

    marketFreshTarget =
      replacement;

    marketFreshTargetAddress =
      replacementAddress;

    excludedTargetHandoffV141
      .replacementAddress =
      replacementAddress;

    excludedTargetHandoffV141
      .replacementSymbol =
      replacement?.metadata?.symbol ||
      replacement?.symbol ||
      null;

    excludedTargetHandoffV141
      .replacementScore =
      safeNumber(
        replacementRow.score
      );

    for (
      let i =
        v135AnalysisQueue.length - 1;
      i > currentIndex;
      i--
    ) {
      if (
        normalize(
          v135AnalysisQueue[i]?.address
        ) ===
          replacementAddress
      ) {
        v135AnalysisQueue.splice(
          i,
          1
        );
      }
    }

    v135AnalysisQueue.splice(
      currentIndex + 1,
      0,
      replacement
    );

    excludedTargetHandoffV141
      .replacementInserted =
      true;

    excludedTargetHandoffV141
      .freshSlotTransferred =
      true;

    topCandidateAnalysisDeferred =
      false;

    topCandidateDeferredReason =
      null;

    topCandidateRequiredRequests =
      null;

    return true;
  };

  for (
    let v135Index = 0;
    v135Index < v135AnalysisQueue.length;
    v135Index++
  ) {
    const watched =
      v135AnalysisQueue[
        v135Index
      ];
    const address =
      normalize(
        watched.address
      );

    if (
      address
    ) {
      v141AnalysedAddresses.add(
        address
      );
    }

    let isPriorityCompletion =
      address ===
      marketFreshTargetAddress;

    /*
     * V150: frozen pre-analysis terminal evidence is authoritative for this
     * run. A later handoff cannot accidentally reinsert one of these tokens.
     */
    if (
      terminalSnapshotAddressesV150
        .has(
          address
        )
    ) {
      const snapshotRowV150 =
        preAnalysisTerminalSnapshotV150
          .find(
            row =>
              row.address ===
              address
          ) ||
        null;

      validationResults.push({
        address,
        validERC20:
          watched?.metadata?.validERC20 ===
          true
            ? true
            : null,
        deferred:
          false,
        terminalPruned:
          true,
        reason:
          snapshotRowV150?.reason ||
          "PREANALYSIS_TERMINAL_SNAPSHOT_V150"
      });

      continue;
    }

    /*
     * V148:
     * V142 evaluated terminal cache once before the mutable analysis queue
     * started. Holder caches can become verified during this same run, and
     * handoffs can insert/reorder candidates afterwards. Re-check immediately
     * before every expensive analysis allocation.
     */
    const dynamicTerminalV148 =
      terminalPriorityRejectFromWatched(
        watched
      );

    if (
      dynamicTerminalV148
        ?.terminal ===
        true
    ) {
      const avoidedRequestsV148 =
        estimatedAnalysisCost(
          env,
          watched
        );

      dynamicTerminalPruningV148
        .prunedCount++;

      dynamicTerminalPruningV148
        .estimatedAnalysisRequestsSaved +=
        safeNumber(
          avoidedRequestsV148
        );

      dynamicTerminalPruningV148
        .pruned.push({
          address,
          symbol:
            watched?.metadata?.symbol ||
            watched?.symbol ||
            null,
          reason:
            dynamicTerminalV148.reason ||
            "VERIFIED_TERMINAL_CACHE_V148",
          top1Percent:
            dynamicTerminalV148
              .top1Percent ??
            null,
          concentrationRisk:
            dynamicTerminalV148
              .concentrationRisk ||
            null,
          estimatedRequestsAvoided:
            avoidedRequestsV148,
          wasPriority:
            isPriorityCompletion
        });

      validationResults.push({
        address,
        validERC20:
          watched?.metadata?.validERC20 ===
          true
            ? true
            : null,
        deferred:
          false,
        terminalPruned:
          true,
        reason:
          dynamicTerminalV148.reason ||
          "VERIFIED_TERMINAL_CACHE_V148"
      });

      if (
        isPriorityCompletion
      ) {
        clearPriorityFreshReservation(
          state,
          address
        );

        if (
          state?.priorityCandidateCompletion &&
          normalize(
            state
              .priorityCandidateCompletion
              .address
          ) ===
            address
        ) {
          state.priorityCandidateCompletion =
            null;
        }

        const replacementRowV148 =
          rankedMarketFreshCandidates
            .find(
              row => {
                const item =
                  row?.token ||
                  null;

                const replacementAddress =
                  normalize(
                    item?.address
                  );

                if (
                  !item ||
                  !replacementAddress ||
                  replacementAddress ===
                    address ||
                  v141AnalysedAddresses
                    .has(
                      replacementAddress
                    ) ||
                  terminalSnapshotAddressesV150
                    .has(
                      replacementAddress
                    )
                ) {
                  return false;
                }

                const terminal =
                  terminalPriorityRejectFromWatched(
                    item
                  );

                return (
                  !terminal?.terminal &&
                  preMarketCandidateAllowed(
                    item
                  )
                );
              }
            ) ||
          null;

        if (
          replacementRowV148
            ?.token
        ) {
          const replacementV148 =
            replacementRowV148.token;

          const replacementAddressV148 =
            normalize(
              replacementV148.address
            );

          marketFreshTarget =
            replacementV148;

          marketFreshTargetAddress =
            replacementAddressV148;

          reservePriorityFreshMarket(
            state,
            replacementAddressV148
          );

          for (
            let i =
              v135AnalysisQueue.length - 1;
            i >
              v135Index;
            i--
          ) {
            if (
              normalize(
                v135AnalysisQueue[i]
                  ?.address
              ) ===
                replacementAddressV148
            ) {
              v135AnalysisQueue.splice(
                i,
                1
              );
            }
          }

          v135AnalysisQueue.splice(
            v135Index + 1,
            0,
            replacementV148
          );

          dynamicTerminalPruningV148
            .priorityHandoffs++;

          topCandidateAnalysisDeferred =
            false;

          topCandidateDeferredReason =
            null;

          topCandidateRequiredRequests =
            null;
        }
      }

      continue;
    }

    const required =
      estimatedAnalysisCost(
        env,
        watched
      );

    if (
      isPriorityCompletion
    ) {
      topCandidateRequiredRequests =
        required;
    }

    /*
     * V133:
     * If the top target itself could not be afforded, do not let lower-ranked
     * candidates spend the residual budget. Preserve that headroom for the
     * next scheduled retry of the priority candidate.
     */
    if (
      !isPriorityCompletion &&
      topCandidateAnalysisDeferred
    ) {
      deferredAnalysis++;

      validationResults.push({
        address:
          normalize(
            watched.address
          ),

        validERC20:
          null,

        deferred:
          true,

        reason:
          "TOP_CANDIDATE_COMPLETION_BUDGET_PROTECTED",

        reservedForTopCandidate:
          marketFreshTargetAddress,

        topCandidateRequiredRequests:
          topCandidateRequiredRequests,

        topCandidateDeferredReason:
          topCandidateDeferredReason
      });

      continue;
    }

    if (
      !budgetAvailable(
        budget,
        "analysis",
        required
      )
    ) {
      deferredAnalysis++;

      if (
        isPriorityCompletion
      ) {
        topCandidateAnalysisDeferred =
          true;

        topCandidateDeferredReason =
          "FULL_ANALYSIS_BUDGET_PROTECTED";
      }

      validationResults.push({
        address:
          normalize(
            watched.address
          ),

        validERC20:
          null,

        deferred:
          true,

        reason:
          "FULL_ANALYSIS_BUDGET_PROTECTED",

        estimatedRequests:
          required
      });

      continue;
    }

    const activity =
      activityForToken(
        watched,
        combinedLogs
      );

    const liveMomentumActivityV152Raw =
      activityForToken(
        watched,
        liveOutput.logs
      );

    const liveMomentumActivityV152 = {
      ...liveMomentumActivityV152Raw,

      verified:
        !liveError &&
        liveMomentumActivityV152Raw
          .poolSpecific ===
        true,

      source:
        "UNISWAP_V4_LIVE_WINDOW_ONLY",

      fromBlock:
        liveOutput?.fromBlock ??
        null,

      toBlock:
        liveOutput?.toBlock ??
        null
    };

    const candidate =
      await analyzeToken(
        env,
        budget,
        state,
        watched,
        activity,

        {
          newlyDiscovered:
            newTokens.has(
              address
            ),

          liveDiscovery:
            liveTokens.has(
              address
            ),

          marketFreshEligible:
            isPriorityCompletion,

          priorityCompletion:
            isPriorityCompletion,

          liveMomentumActivityV152
        }
      );

    if (
      candidate.analysisDeferred
    ) {
      deferredAnalysis++;

      if (
        isPriorityCompletion
      ) {
        topCandidateAnalysisDeferred =
          true;

        topCandidateDeferredReason =
          candidate.validation
            ?.reason ||
          "ANALYSIS_DEFERRED";
      }

      validationResults.push({
        address,

        validERC20:
          null,

        deferred:
          true,

        reason:
          candidate.validation
            ?.reason ||
          "ANALYSIS_DEFERRED"
      });

      continue;
    }

    watched.lastCheckedAt =
      Date.now();

    watched.checks =
      safeNumber(
        watched.checks
      ) +
      1;

    watched.lastValidationReason =
      candidate.validation
        ?.reason ||
      candidate.reason ||
      null;

    if (
      candidate.excludedAsset
    ) {
      excludedAssets++;

      watched.excludedReason =
        candidate.exclusionReason ||
        candidate.reason ||
        "EXCLUDED_ASSET";

      if (
        candidate.validation
          ?.validERC20
      ) {
        watched.metadata = {
          validERC20:
            true,

          name:
            candidate.validation
              .name,

          symbol:
            candidate.validation
              .symbol,

          decimals:
            candidate.validation
              .decimals,

          totalSupply:
            candidate.validation
              .totalSupply,

          verifiedAt:
            candidate.validation
              .verifiedAt ||
            Date.now()
        };
      }

      validationResults.push({
        address,

        validERC20:
          false,

        deferred:
          false,

        excluded:
          true,

        reason:
          watched.excludedReason,

        name:
          candidate.validation
            ?.name ||
          null,

        symbol:
          candidate.validation
            ?.symbol ||
          null
      });

      handoffExcludedFreshTargetV141(
        watched,
        candidate,
        address,
        v135Index
      );

      continue;
    }

    validationResults.push({
      address,

      validERC20:
        candidate.validERC20,

      deferred:
        false,

      excluded:
        false,

      reason:
        candidate.validation
          ?.reason ||
        candidate.reason ||
        null,

      name:
        candidate.validation
          ?.name ||
        null,

      symbol:
        candidate.validation
          ?.symbol ||
        null
    });

    if (
      !candidate.validERC20
    ) {
      watched.invalidChecks =
        safeNumber(
          watched.invalidChecks
        ) +
        1;

      handoffExcludedFreshTargetV141(
        watched,
        candidate,
        address,
        v135Index
      );

      continue;
    }

    watched.invalidChecks =
      0;

    watched.excludedReason =
      null;

    watched.metadata = {
      validERC20:
        true,

      name:
        candidate.name,

      symbol:
        candidate.symbol,

      decimals:
        candidate.decimals,

      totalSupply:
        candidate.totalSupply,

      verifiedAt:
        candidate.validation
          ?.verifiedAt ||
        Date.now()
    };

    if (
      candidate.market
        ?.verified &&
      candidate.market
        ?.source ===
        "DEXSCREENER"
    ) {
      marketLookups++;
    }

    if (
      candidate.holders
        ?.verified
    ) {
      holderLookups++;
    }

    saveSnapshot(
      state,
      candidate
    );


    const v135CurrentAddress =
      normalize(
        candidate?.address
      );

    const v137ActivePriorityAddress =
      isPriorityCompletion
        ? v135CurrentAddress
        : normalize(
            marketFreshTargetAddress
          );

    const v135HolderTerminalEvidence =
      Boolean(
        candidate?.holders?.integrity?.verified &&
        candidate?.holders?.concentrationVerified &&
        candidate?.holders?.whale?.verified
      );

    const v135Top1Percent =
      safeNumber(
        candidate?.holders?.whale?.top1Percent
      );

    const v135ConcentrationRisk =
      String(
        candidate?.holders?.whale?.concentrationRisk || ""
      ).toUpperCase();

    const v135SameRunTerminal =
      v135HolderTerminalEvidence &&
      (
        v135ConcentrationRisk === "HIGH" ||
        v135Top1Percent >= 50
      )
        ? {
            terminal: true,
            reason:
              v135Top1Percent >= 50
                ? "SAME_RUN_VERIFIED_EXTREME_TOP1"
                : "SAME_RUN_VERIFIED_HIGH_CONCENTRATION"
          }
        : {
            terminal: false,
            reason: null
          };

    if (
      isPriorityCompletion &&
      v137ActivePriorityAddress &&
      v135CurrentAddress ===
        v137ActivePriorityAddress &&
      v135SameRunTerminal
        ?.terminal ===
        true
    ) {
      v135TerminalPriorityHandoff = {
        triggered: true,
        rejectedAddress: v135CurrentAddress,
        rejectedSymbol: candidate?.symbol || null,
        rejectedReason:
          v135SameRunTerminal?.reason ||
          "SAME_RUN_TERMINAL_RISK",
        replacementAddress: null,
        replacementSymbol: null,
        replacementInserted: false
      };

      const v135RankedReplacement =
        rankedMarketFreshCandidates
          .map(
            ranked =>
              ranked?.token ||
              null
          )
          .filter(
            Boolean
          )
          .find(
            item => {
              const address =
                normalize(
                  item?.address
                );

              if (
                !address ||
                address === v135CurrentAddress
              ) {
                return false;
              }

              const terminal =
                terminalPriorityRejectFromWatched(
                  item
                );

              return !terminal?.terminal;
            }
          );

      if (
        v135RankedReplacement
      ) {
        const replacementAddress =
          normalize(
            v135RankedReplacement?.address
          );

        v135TerminalPriorityHandoff
          .replacementAddress =
          replacementAddress;

        v135TerminalPriorityHandoff
          .replacementSymbol =
          v135RankedReplacement?.symbol ||
          null;

        marketFreshTarget =
          v135RankedReplacement;

        marketFreshTargetAddress =
          replacementAddress;

        for (
          let i = v135AnalysisQueue.length - 1;
          i > v135Index;
          i--
        ) {
          if (
            normalize(
              v135AnalysisQueue[i]?.address
            ) === replacementAddress
          ) {
            v135AnalysisQueue.splice(
              i,
              1
            );
          }
        }

        v135AnalysisQueue.splice(
          v135Index + 1,
          0,
          v135RankedReplacement
        );

        v135TerminalPriorityHandoff
          .replacementInserted =
          true;

        if (
          state?.priorityCandidateCompletion &&
          normalize(
            state
              .priorityCandidateCompletion
              .address
          ) ===
            v135CurrentAddress
        ) {
          state
            .priorityCandidateCompletion
            .completed =
            true;

          state
            .priorityCandidateCompletion
            .persistedForRetry =
            false;

          state
            .priorityCandidateCompletion
            .terminalRejected =
            true;

          state
            .priorityCandidateCompletion
            .terminalRejectReason =
            v135TerminalPriorityHandoff
              .rejectedReason;
        }

        topCandidateAnalysisDeferred =
          false;

        topCandidateDeferredReason =
          null;

        topCandidateRequiredRequests =
          null;
      }
    }

    /*
     * V148:
     * An analysis can populate holderCache for a token referenced elsewhere
     * in the mutable queue. Strip any now-terminal queued entries before the
     * next loop iteration. This only acts on verified cached terminal evidence.
     */
    for (
      let v148QueueIndex =
        v135AnalysisQueue.length - 1;
      v148QueueIndex >
        v135Index;
      v148QueueIndex--
    ) {
      const queuedV148 =
        v135AnalysisQueue[
          v148QueueIndex
        ];

      const queuedAddressV148 =
        normalize(
          queuedV148?.address
        );

      if (
        !queuedAddressV148 ||
        queuedAddressV148 ===
          marketFreshTargetAddress
      ) {
        continue;
      }

      const queuedTerminalV148 =
        terminalPriorityRejectFromWatched(
          queuedV148
        );

      if (
        queuedTerminalV148
          ?.terminal !==
        true
      ) {
        continue;
      }

      const avoidedV148 =
        estimatedAnalysisCost(
          env,
          queuedV148
        );

      dynamicTerminalPruningV148
        .prunedCount++;

      dynamicTerminalPruningV148
        .estimatedAnalysisRequestsSaved +=
        safeNumber(
          avoidedV148
        );

      dynamicTerminalPruningV148
        .pruned.push({
          address:
            queuedAddressV148,
          symbol:
            queuedV148
              ?.metadata
              ?.symbol ||
            queuedV148
              ?.symbol ||
            null,
          reason:
            queuedTerminalV148
              .reason ||
            "VERIFIED_TERMINAL_CACHE_V148",
          top1Percent:
            queuedTerminalV148
              .top1Percent ??
            null,
          concentrationRisk:
            queuedTerminalV148
              .concentrationRisk ||
            null,
          estimatedRequestsAvoided:
            avoidedV148,
          wasPriority:
            false
        });

      v135AnalysisQueue.splice(
        v148QueueIndex,
        1
      );
    }

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (
      a,
      b
    ) =>
      safeNumber(
        b.analysisPriority
      ) -
      safeNumber(
        a.analysisPriority
      )
  );

  const holderProviderTelemetryV144 =
    candidates.map(
      candidate => ({
        address:
          normalize(candidate?.address),
        symbol:
          candidate?.symbol ||
          null,
        holderSource:
          candidate?.holders?.holderSource ||
          null,
        countVerified:
          Boolean(
            candidate?.holders?.countersVerified &&
            candidate?.holders?.holderCount !== null
          ),
        concentrationVerified:
          Boolean(
            candidate?.holders?.concentrationVerified &&
            candidate?.holders?.integrity?.verified
          ),
        proConfigured:
          Boolean(
            candidate?.holders
              ?.blockscoutProHolderFallbackV143
              ?.configured
          ),
        proAttempted:
          Boolean(
            candidate?.holders
              ?.blockscoutProHolderFallbackV143
              ?.attempted
          ),
        proSuccess:
          Boolean(
            candidate?.holders
              ?.blockscoutProHolderFallbackV143
              ?.success
          ),
        proStatus:
          candidate?.holders
            ?.blockscoutProHolderFallbackV143
            ?.status ||
          null,
        proTransientOutageV145:
          Boolean(
            candidate?.holders
              ?.blockscoutProHolderFallbackV143
              ?.transientOutageV145
          ),
        proCooldownUntilV145:
          candidate?.holders
            ?.blockscoutProHolderFallbackV143
            ?.cooldownUntil ||
          null,
        proHttp404V146:
          Boolean(
            candidate?.holders
              ?.blockscoutProHolderFallbackV143
              ?.http404V146
          ),
        proHttpStatusV146:
          candidate?.holders
            ?.blockscoutProHolderFallbackV143
            ?.httpStatus ||
          null,
        partialHolderCacheV149:
          candidate?.holders
            ?.partialHolderCacheV149 ||
          candidate?.holders
            ?.partialHolderStateV149 ||
          null,

        pro404RetryUntilV146:
          candidate?.holders
            ?.blockscoutProHolderFallbackV143
            ?.retryUntilV146 ||
          blockscoutPro404RetryV146(
            state.watchedTokens?.find(
              watched =>
                normalize(
                  watched?.address
                ) ===
                normalize(
                  candidate?.address
                )
            )
          ).retryUntil ||
          null
      })
    );

  const sameRunTerminalCandidates =
    candidates
      .map(
        candidate => ({
          candidate,
          terminal:
            sameRunTerminalReject(
              candidate
            )
        })
      )
      .filter(
        row =>
          row
            .terminal
            .terminal
      );

  const postAnalysisTerminalDiscoveriesV150 =
    sameRunTerminalCandidates
      .filter(
        row =>
          !terminalSnapshotAddressesV150
            .has(
              normalize(
                row?.candidate?.address
              )
            )
      )
      .map(
        row => ({
          address:
            normalize(
              row?.candidate?.address
            ),
          symbol:
            row?.candidate?.symbol ||
            null,
          reason:
            row?.terminal?.reason ||
            null,
          top1Percent:
            row?.candidate?.holders?.whale?.top1Percent ??
            null,
          concentrationRisk:
            row?.candidate?.holders?.whale?.concentrationRisk ||
            null,
          discoveredAfterAnalysis:
            true
        })
      );

  const sameRunTerminalAddresses =
    new Set(
      sameRunTerminalCandidates
        .map(
          row =>
            normalize(
              row
                .candidate
                .address
            )
        )
    );

  const completionCandidate =
    candidates.find(
      candidate =>
        normalize(
          candidate.address
        ) ===
        retryPersistenceAddressV139
    ) ||
    null;

  if (
    completionCandidate
  ) {
    const blockers =
      completionCandidateBlockers(
        completionCandidate
      );

    const sameRunTerminal =
      sameRunTerminalReject(
        completionCandidate
      );

    const cachedOrGeneralTerminal =
      terminalPriorityReject(
        completionCandidate
      );

    const terminalReject =
      sameRunTerminal.terminal
        ? sameRunTerminal
        : cachedOrGeneralTerminal;

    const relevanceExpiryV140 =
      priorityRetryRelevanceExpiryV140(
        completionCandidate
      );

    const keepForRetry =
      !terminalReject.terminal &&
      shouldKeepCompletionCandidate(
        completionCandidate,
        state.priorityCandidateCompletion
      );

    priorityCompletionTelemetry
      .relevanceExpiryV140 =
      relevanceExpiryV140;

    priorityCompletionTelemetry.symbol =
      completionCandidate.symbol ||
      priorityCompletionTelemetry.symbol;

    priorityCompletionTelemetry.blockers =
      blockers;

    priorityCompletionTelemetry.completed =
      !keepForRetry;

    priorityCompletionTelemetry.persistedForRetry =
      keepForRetry;


    priorityCompletionTelemetry.terminalRejected =
      terminalReject.terminal;

    priorityCompletionTelemetry.terminalRejectReason =
      terminalReject.reason;

    if (
      terminalReject.terminal
    ) {
      priorityCompletionTelemetry.blockers = [
        terminalReject.reason
      ];
    }

    else if (
      relevanceExpiryV140.expired
    ) {
      priorityCompletionTelemetry.blockers = [
        relevanceExpiryV140.reason
      ];
    }

    if (
      keepForRetry
    ) {
      const previousCompletionRaw =
        state.priorityCandidateCompletion ||
        {};

      const previousCompletion =
        normalize(
          previousCompletionRaw.address
        ) ===
          normalize(
            retryPersistenceAddressV139
          )
          ? previousCompletionRaw
          : {};

      state.priorityCandidateCompletion = {
        address:
          retryPersistenceAddressV139,

        symbol:
          completionCandidate.symbol ||
          null,

        firstQueuedAt:
          safeNumber(
            previousCompletion.firstQueuedAt
          ) ||
          Date.now(),

        lastAttemptAt:
          Date.now(),

        attempts:
          safeNumber(
            previousCompletion.attempts
          ) +
          1,

        blockers,

        marketStatus:
          completionCandidate.market
            ?.status ||
          null,

        holderStatus:
          completionCandidate.holders
            ?.integrity
            ?.status ||
          null
      };
    }

    else {
      state.priorityCandidateCompletion =
        null;
      clearPriorityFreshReservation(
        state,
        retryPersistenceAddressV139
      );
    }
  }

  else if (
    retryPersistenceAddressV139 &&
    !v142CarriedTerminalPruned
  ) {
    const previousCompletionRaw =
      state.priorityCandidateCompletion ||
      {};

    const previousCompletion =
      normalize(
        previousCompletionRaw.address
      ) ===
        normalize(
          retryPersistenceAddressV139
        )
        ? previousCompletionRaw
        : {};

    state.priorityCandidateCompletion = {
      address:
        retryPersistenceAddressV139,

      symbol:
        retryPersistenceTokenV139
          ?.metadata
          ?.symbol ||
        null,

      firstQueuedAt:
        safeNumber(
          previousCompletion.firstQueuedAt
        ) ||
        Date.now(),

      lastAttemptAt:
        Date.now(),

      attempts:
        safeNumber(
          previousCompletion.attempts
        ),

      blockers: [
        "ANALYSIS_NOT_COMPLETED"
      ],

      marketStatus:
        null,

      holderStatus:
        null
    };

    priorityCompletionTelemetry.persistedForRetry =
      true;

    priorityCompletionTelemetry.blockers = [
      "ANALYSIS_NOT_COMPLETED"
    ];
  }

  if (
    state
      ?.priorityCandidateCompletion
      ?.address &&
    sameRunTerminalAddresses
      .has(
        normalize(
          state
            .priorityCandidateCompletion
            .address
        )
      )
  ) {
    const terminalAddress =
      normalize(
        state
          .priorityCandidateCompletion
          .address
      );

    state.priorityCandidateCompletion =
      null;

    clearPriorityFreshReservation(
      state,
      terminalAddress
    );
  }

  /*
   * V127:
   * If the original fresh target becomes terminal after holder analysis,
   * replace it immediately for the NEXT scan. This cannot reclaim an already
   * spent current-run request, but it removes stale terminal priority state.
   */
  let effectiveMarketFreshTarget =
    marketFreshTarget;

  let effectiveMarketFreshTargetAddress =
    marketFreshTargetAddress;

  let sameRunTargetReselection = {
    triggered:
      false,

    rejectedAddress:
      null,

    rejectedReason:
      null,

    replacementAddress:
      null,

    replacementSymbol:
      null,

    replacementPersisted:
      false
  };

  if (
    marketFreshTargetAddress &&
    sameRunTerminalAddresses
      .has(
        marketFreshTargetAddress
      )
  ) {
    const rejectedRow =
      sameRunTerminalCandidates
        .find(
          row =>
            normalize(
              row.candidate.address
            ) ===
            marketFreshTargetAddress
        ) ||
      null;

    clearPriorityFreshReservation(
      state,
      marketFreshTargetAddress
    );

    const replacementRow =
      rankedMarketFreshCandidates
        .find(
          row => {
            const address =
              normalize(
                row.token.address
              );

            return (
              address &&
              address !==
                marketFreshTargetAddress &&
              !sameRunTerminalAddresses
                .has(
                  address
                ) &&
              preMarketCandidateAllowed(
                row.token
              )
            );
          }
        ) ||
      null;

    effectiveMarketFreshTarget =
      replacementRow
        ?.token ||
      null;

    effectiveMarketFreshTargetAddress =
      normalize(
        effectiveMarketFreshTarget
          ?.address
      );

    sameRunTargetReselection = {
      triggered:
        true,

      rejectedAddress:
        marketFreshTargetAddress,

      rejectedReason:
        rejectedRow
          ?.terminal
          ?.reason ||
        "SAME_RUN_TERMINAL_RISK",

      replacementAddress:
        effectiveMarketFreshTargetAddress ||
        null,

      replacementSymbol:
        effectiveMarketFreshTarget
          ?.metadata
          ?.symbol ||
        null,

      replacementPersisted:
        false
    };

    if (
      effectiveMarketFreshTargetAddress
    ) {
      reservePriorityFreshMarket(
        state,
        effectiveMarketFreshTargetAddress
      );

      const analyzedReplacement =
        candidates.find(
          candidate =>
            normalize(
              candidate.address
            ) ===
            effectiveMarketFreshTargetAddress
        ) ||
        null;

      state.priorityCandidateCompletion = {
        address:
          effectiveMarketFreshTargetAddress,

        symbol:
          analyzedReplacement
            ?.symbol ||
          effectiveMarketFreshTarget
            ?.metadata
            ?.symbol ||
          null,

        firstQueuedAt:
          Date.now(),

        lastAttemptAt:
          Date.now(),

        attempts:
          0,

        blockers:
          analyzedReplacement
            ? completionCandidateBlockers(
                analyzedReplacement
              )
            : [
                "RESELECTED_AFTER_SAME_RUN_TERMINAL"
              ],

        marketStatus:
          analyzedReplacement
            ?.market
            ?.status ||
          null,

        holderStatus:
          analyzedReplacement
            ?.holders
            ?.integrity
            ?.status ||
          null
      };

      sameRunTargetReselection
        .replacementPersisted =
          true;
    }

    else {
      state.priorityCandidateCompletion =
        null;
    }
  }

  /*
   * V151:
   * Directional USD is discovery intelligence, not merely alert decoration.
   * Existing provider guards remain authoritative; this only changes which
   * candidate may receive the already-capped single Gecko fresh opportunity.
   */
  let directionalTradeEnrichment = {
    attempted:
      false,
    address:
      null,
    status:
      "NO_DIRECTIONAL_ELIGIBLE_CANDIDATE",
    verifiedAnyWindow:
      false,
    selectionMode:
      null
  };

  const alreadyQualifiedDirectionalTargetV151 =
    candidates.find(
      candidate =>
        qualifiesTelegram(
          candidate
        ) &&
        candidate?.market?.verified === true &&
        !sameRunTerminalAddresses.has(
          normalize(
            candidate?.address
          )
        )
    ) ||
    null;

  const preQualificationDirectionalPoolV151 =
    candidates
      .filter(
        candidate =>
          candidate?.validERC20 === true &&
          (
            (
              candidate?.market?.verified === true &&
              Boolean(
                candidate?.market?.pairAddress
              ) &&
              (
                String(
                  candidate?.market?.targetTokenSide || ""
                ).toUpperCase() === "BASE" ||
                String(
                  candidate?.market?.targetTokenSide || ""
                ).toUpperCase() === "QUOTE"
              )
            ) ||
            candidate
              ?.onChainPoolIdentityV153
              ?.verified === true
          ) &&
          !sameRunTerminalAddresses.has(
            normalize(
              candidate?.address
            )
          ) &&
          candidate?.risk?.severeOverride !== true &&
          candidate?.risk?.label !== "HIGH"
      )
      .sort(
        (a, b) =>
          safeNumber(
            b?.analysisPriority
          ) -
          safeNumber(
            a?.analysisPriority
          )
      );

  const directionalTarget =
    alreadyQualifiedDirectionalTargetV151 ||
    preQualificationDirectionalPoolV151[0] ||
    null;

  const directionalSelectionModeV151 =
    alreadyQualifiedDirectionalTargetV151
      ? "ALREADY_TELEGRAM_QUALIFIED"
      : directionalTarget
        ? "PREQUAL_HIGHEST_PRIORITY_VERIFIED_MARKET_OR_ONCHAIN_POOL"
        : "NO_VERIFIED_MARKET_CANDIDATE";

  if (
    directionalTarget
  ) {
    const enrichment =
      await geckoDirectionalTradeFlow(
        directionalTarget,
        budget,
        state
      );

    applyDirectionalTradeFlow(
      directionalTarget,
      enrichment
    );

    if (
      enrichment?.verifiedAnyWindow === true
    ) {
      const historicalV151 =
        getHistoricalSnapshot(
          state,
          directionalTarget.address
        );

      directionalTarget.momentum =
        momentumAnalysis(
          historicalV151,
          directionalTarget.market,
          directionalTarget.holders,
          directionalTarget
            .liveMomentumActivityV152
        );

      directionalTarget.opportunity =
        scoreOpportunity(
          directionalTarget.validation,
          directionalTarget.market,
          directionalTarget.holders,
          directionalTarget.activity,
          directionalTarget.momentum,
          directionalTarget.marketQuality,
          directionalTarget.whaleFlow,
          directionalTarget.launchStage
        );

      directionalTarget.signalConfirmation =
        signalConfirmation(
          directionalTarget
        );

      directionalTarget.confidence =
        candidateConfidence(
          directionalTarget
        );

      directionalTarget.analysisPriority =
        analysisPriority(
          directionalTarget
        );
    }

    directionalTradeEnrichment = {
      address:
        normalize(
          directionalTarget.address
        ),
      symbol:
        directionalTarget.symbol || null,
      selectionMode:
        directionalSelectionModeV151,
      preQualification:
        !Boolean(
          alreadyQualifiedDirectionalTargetV151
        ),
      candidateWasQualifiedBeforeEnrichment:
        Boolean(
          alreadyQualifiedDirectionalTargetV151
        ),
      candidateQualifiesAfterEnrichment:
        qualifiesTelegram(
          directionalTarget
        ),
      ...enrichment
    };
  }

  else {
    directionalTradeEnrichment = {
      ...directionalTradeEnrichment,
      selectionMode:
        directionalSelectionModeV151,
      eligibleVerifiedMarketCandidates:
        preQualificationDirectionalPoolV151.length
    };
  }

  const telegramQualificationDiagnostics =
    buildTelegramQualificationDiagnostics(
      candidates
    );

  /* =======================================================
     TELEGRAM
     ======================================================= */

  const telegramResults =
    [];

  for (
    const candidate
    of candidates
  ) {
    if (
      !qualifiesTelegram(
        candidate
      )
    ) {
      continue;
    }

    const address =
      normalize(
        candidate.address
      );

    const previous =
      state.alerts[
        address
      ];

    const previousTimestamp =
      typeof previous ===
        "object"
        ? safeNumber(
            previous.timestamp
          )
        : safeNumber(
            previous
          );

    const previousScore =
      typeof previous ===
        "object"
        ? safeNumber(
            previous.score
          )
        : 0;

    const cooldownExpired =
      !previousTimestamp ||
      Date.now() -
        previousTimestamp >=
        ALERT_COOLDOWN;

    const scoreImproved =
      candidate
        .opportunity
        .score -
        previousScore >=
      10;

    const newAccumulation =
      candidate.whaleFlow
        .flow ===
        "NET_ACCUMULATION" &&
      previous
        ?.whaleFlow !==
        "NET_ACCUMULATION";

    if (
      !cooldownExpired &&
      !scoreImproved &&
      !newAccumulation
    ) {
      telegramResults.push({
        address,

        sent:
          false,

        reason:
          "ALERT_COOLDOWN"
      });

      continue;
    }

    if (
      !budgetAvailable(
        budget,
        "notification"
      )
    ) {
      telegramResults.push({
        address,

        sent:
          false,

        reason:
          "NOTIFICATION_BUDGET_EXHAUSTED"
      });

      continue;
    }

    const result =
      await sendTelegram(
        env,
        telegramMessage(
          candidate
        ),
        budget,
        candidate.market?.imageUrl || null
      );

    telegramResults.push({
      address,

      symbol:
        candidate.symbol,

      sent:
        result.success,

      result
    });

    if (
      result.success
    ) {
      state.alerts[
        address
      ] = {
        timestamp:
          Date.now(),

        score:
          candidate.opportunity
            .score,

        confidence:
          candidate.confidence
            .score,

        whaleFlow:
          candidate.whaleFlow
            .flow
      };
    }
  }

  pruneState(
    state,
    true
  );

  const currentCursor =
    state.lastScannedBlock;

  const backlogRemaining =
    currentCursor ===
      null ||
    currentCursor ===
      undefined
      ? null
      : Math.max(
          0,

          latestNumber -
          safeNumber(
            currentCursor
          )
        );

  const backlogBlocksAdvanced =
    currentCursor !==
      null &&
    previousBacklogCursor !==
      null &&
    previousBacklogCursor !==
      undefined
      ? Math.max(
          0,

          safeNumber(
            currentCursor
          ) -
          safeNumber(
            previousBacklogCursor
          )
        )
      : backlogResult
          ?.blocksProcessed ||
        0;

  let status =
    "SCAN_COMPLETE";

  if (
    backlogRemaining !==
      null &&
    backlogRemaining >
      0
  ) {
    status =
      "LIVE_SCAN_COMPLETE_CATCHUP_CONTINUING";
  }

  if (
    liveError
  ) {
    status =
      "PARTIAL_SCAN_FAILED_LIVE_RANGE";
  }

  else if (
    backlogError &&
    !backlogResult
      ?.processedThrough
  ) {
    status =
      "LIVE_SCAN_COMPLETE_BACKLOG_RETRY_PENDING";
  }

  if (
    scheduled
  ) {
    state.scheduler
      .lastScheduledStatus =
      status;

    state.scheduler
      .lastScheduledLatestBlock =
      latestNumber;

    if (
      !liveError
    ) {
      state.scheduler
        .lastScheduledSuccessAt =
        Date.now();
    }
  }

  const save =
    await writeState(
      env,
      state
    );

  const discoveryRpc =
    discoveryService(
      state
    );

  const dex =
    dexService(
      state
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status,

    scanMode:
      "V154_CORE_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_HUNTER",

    scheduledRun:
      scheduled,

    durationMs:
      Date.now() -
      startedAt,

    latestBlock:
      latestNumber,

    rpcProvider:
      latest.provider,

    persistence: {
      enabled:
        stateResult.persistent,

      binding:
        stateResult.binding,

      readError:
        stateResult.error,

      stateSaved:
        save.saved,

      saveError:
        save.error,

      previousLastScannedBlock:
        previousBacklogCursor,

      currentLastScannedBlock:
        currentCursor,

      lastLiveScannedBlock:
        state.lastLiveScannedBlock,

      backlogProcessedThrough:
        backlogResult
          ?.processedThrough !==
          null &&
        backlogResult
          ?.processedThrough !==
          undefined
          ? Number(
              backlogResult
                .processedThrough
            )
          : null,

      backlogBlocksAdvanced,

      backlogRemaining,

      backlogLag:
        backlogRemaining ===
          null
          ? "UNKNOWN"
          : backlogLagLabel(
              backlogRemaining
            )
    },

    scheduler: {
      scheduledRunCount:
        safeNumber(
          state.scheduler
            ?.scheduledRunCount
        ),

      lastScheduledRunAt:
        state.scheduler
          ?.lastScheduledRunAt ||
        null,

      lastScheduledSuccessAt:
        state.scheduler
          ?.lastScheduledSuccessAt ||
        null,

      lastScheduledStatus:
        state.scheduler
          ?.lastScheduledStatus ||
        null,

      lastScheduledLatestBlock:
        state.scheduler
          ?.lastScheduledLatestBlock ||
        null
    },

    discoveryRpc: {
      publicCooldownActive:
        discoveryProviderCooling(
          state,
          "ROBINHOOD_PUBLIC_RPC"
        ),

      publicCooldownUntil:
        discoveryRpc
          .publicCooldownUntil,

      publicTotal429s:
        safeNumber(
          discoveryRpc
            .publicTotal429s
        ),

      alchemyCooldownActive:
        discoveryProviderCooling(
          state,
          "ALCHEMY"
        ),

      alchemyCooldownUntil:
        discoveryRpc
          .alchemyCooldownUntil,

      alchemyTotal429s:
        safeNumber(
          discoveryRpc
            .alchemyTotal429s
        ),

      publicLearnedBacklogChunkBlocks:
        safeNumber(
          discoveryRpc
            .publicBacklogChunkBlocks
        ),

      alchemyLearnedBacklogChunkBlocks:
        safeNumber(
          discoveryRpc
            .alchemyBacklogChunkBlocks
        ),

      publicFailedUpperBound:
        discoveryRpc
          .publicBacklogFailedUpperBound,

      alchemyFailedUpperBound:
        discoveryRpc
          .alchemyBacklogFailedUpperBound,

      learnedLiveChunkBlocks:
        safeNumber(
          discoveryRpc
            .liveChunkBlocks
        ),

      lastBacklogProvider:
        discoveryRpc
          .lastBacklogProvider,

      lastLiveProvider:
        discoveryRpc
          .lastLiveProvider
    },

    services: {
      dexscreener: {
        lastStatus:
          dex.lastStatus,

        lastSuccessAt:
          dex.lastSuccessAt,

        last429At:
          dex.last429At,

        cooldownUntil:
          dex.cooldownUntil,

        cooldownActive:
          safeNumber(
            dex.cooldownUntil
          ) >
          Date.now(),

        total429s:
          safeNumber(
            dex.total429s
          ),

        consecutive429s:
          safeNumber(
            dex.consecutive429s
          ),

        lastBackoffMs:
          safeNumber(
            dex.lastBackoffMs
          ) ||
          null,

        max429CooldownMsV147:
          DEXSCREENER_MAX_429_COOLDOWN_MS_V147,

        lastRequestAt:
          dex.lastRequestAt ||
          null
      },

      geckoterminal: (() => {
        const gecko =
          geckoService(
            state
          );

        return {
          lastStatus:
            gecko.lastStatus,

          lastSuccessAt:
            gecko.lastSuccessAt,

          last429At:
            gecko.last429At,

          cooldownUntil:
            gecko.cooldownUntil,

          cooldownActive:
            safeNumber(
              gecko.cooldownUntil
            ) >
            Date.now(),

          total429s:
            safeNumber(
              gecko.total429s
            ),

          totalRequests:
            safeNumber(
              gecko.totalRequests
            ),

          consecutive429s:
            safeNumber(
              gecko.consecutive429s
            ),

          rateLimitHistorySeeded:
            gecko.rateLimitHistorySeeded ===
            true,

          lastBackoffMs:
            safeNumber(
              gecko.lastBackoffMs
            ) ||
            null,

          minFreshIntervalMs:
            GECKOTERMINAL_MIN_FRESH_INTERVAL_MS,

          nextFreshEligibleAt:
            safeNumber(
              gecko.lastRequestAt
            )
              ? safeNumber(
                  gecko.lastRequestAt
                ) +
                GECKOTERMINAL_MIN_FRESH_INTERVAL_MS
              : null,

          lastRequestAt:
            gecko.lastRequestAt ||
            null
        };
      })()
    },

    requestBudget:
      budgetTelemetry(
        budget
      ),

    marketProviderCoordinationV147:
      marketProviderAvailabilityV147(
        state,
        effectiveMarketFreshTargetAddress ||
        marketFreshTargetAddress ||
        null
      ),

    discovery: {
      live: {
        fromBlock:
          Number(
            live.from
          ),

        toBlock:
          Number(
            live.to
          ),

        chunkSize:
          liveScan.chunkSize,

        rawLogs:
          liveDiscovery.rawLogs,

        initializeEvents:
          liveDiscovery
            .initializeEvents,

        swapTopicMatches:
          liveDiscovery
            .swapTopicMatches,

        modifyLiquidityTopicMatches:
          liveDiscovery
            .liquidityTopicMatches,

        tokensSeen:
          liveDiscovery
            .seenTokens.size,

        newTokens:
          liveDiscovery
            .newTokens.size,

        activeWatchedTokens:
          liveActivity
            .tokens.size,

        unknownPoolCount:
          liveActivity
            .unknownPoolIds.size,
        initializeLookback:
          liveInitializeLookback,

        persistentUnknownResolution:
          unknownPoolResolution,

        unknownSwapEvents:
          liveActivity
            .unknownSwapEvents,

        unknownLiquidityEvents:
          liveActivity
            .unknownLiquidityEvents,

        error:
          liveError,

        providerHeadSync: {
          requestedTo:
            liveScan.requestedTo !==
              null &&
            liveScan.requestedTo !==
              undefined
              ? Number(
                  liveScan.requestedTo
                )
              : null,

          effectiveTo:
            liveScan.effectiveTo !==
              null &&
            liveScan.effectiveTo !==
              undefined
              ? Number(
                  liveScan.effectiveTo
                )
              : null,

          providerHead:
            liveScan.providerHead !==
              null &&
            liveScan.providerHead !==
              undefined
              ? Number(
                  liveScan.providerHead
                )
              : null,

          provider:
            liveScan.providerHeadProvider ||
            null,

          clamped:
            Boolean(
              liveScan.providerHeadClamped
            ),

          refreshes:
            safeNumber(
              liveScan.providerHeadRefreshes
            ),

          retries:
            safeNumber(
              liveScan.providerHeadRetries
            )
        },

        ranges:
          liveOutput.ranges
      },

      backlog:
        backlogFrom !==
          null
          ? {
              fromBlock:
                Number(
                  backlogFrom
                ),

              targetBlock:
                Number(
                  backlogTargetBlock
                ),

              strategy:
                "V96_PROTECTED_ACCELERATED_PROVEN_RANGE",

              publicLearnedChunk:
                backlogResult
                  ?.publicLearnedChunk ??
                discoveryRpc
                  .publicBacklogChunkBlocks,

              alchemyLearnedChunk:
                backlogResult
                  ?.alchemyLearnedChunk ??
                discoveryRpc
                  .alchemyBacklogChunkBlocks,

              publicFailedUpperBound:
                backlogResult
                  ?.publicFailedUpperBound ??
                discoveryRpc
                  .publicBacklogFailedUpperBound,

              alchemyFailedUpperBound:
                backlogResult
                  ?.alchemyFailedUpperBound ??
                discoveryRpc
                  .alchemyBacklogFailedUpperBound,

              successfulChunks:
                backlogResult
                  ?.successfulChunks ||
                0,

              failedRequests:
                backlogResult
                  ?.failedRequests ||
                0,

              providerSwitches:
                backlogResult
                  ?.providerSwitches ||
                0,

              probeAttempts:
                backlogResult
                  ?.probeAttempts ||
                0,

              blockedRepeatProbes:
                backlogResult
                  ?.blockedRepeatProbes ||
                0,

              rawLogs:
                backlogDiscovery
                  .rawLogs,

              initializeEvents:
                backlogDiscovery
                  .initializeEvents,

              swapTopicMatches:
                backlogDiscovery
                  .swapTopicMatches,

              modifyLiquidityTopicMatches:
                backlogDiscovery
                  .liquidityTopicMatches,

              newTokens:
                backlogDiscovery
                  .newTokens.size,

              blocksProcessed:
                backlogResult
                  ?.blocksProcessed ||
                0,

              blocksAdvanced:
                backlogBlocksAdvanced,

              blocksPerSecond:
                backlogResult
                  ?.blocksPerSecond ||
                0,

              processedThrough:
                backlogResult
                  ?.processedThrough !==
                  null &&
                backlogResult
                  ?.processedThrough !==
                  undefined
                  ? Number(
                      backlogResult
                        .processedThrough
                    )
                  : null,

              nextBlock:
                backlogResult
                  ?.nextBlock !==
                  null &&
                backlogResult
                  ?.nextBlock !==
                  undefined
                  ? Number(
                      backlogResult
                        .nextBlock
                    )
                  : null,

              error:
                backlogError,

              probes:
                backlogResult
                  ?.probeHistory ||
                [],

              ranges:
                backlogOutput.ranges
            }
          : null
    },

    v4: {
      poolManager:
        POOL_MANAGER,

      newTokenCandidates:
        newTokens.size,

      liveTokenCandidates:
        liveTokens.size,

      unknownLivePools:
        liveActivity
          .unknownPoolIds.size,

      liveActivityPromotion:
        "ENABLED_V96",

      providerSpecificBacklogLearning:
        "ENABLED_V96"
    },

    watchedTokens:
      state.watchedTokens.length,

    poolRegistryCount:
      Object.keys(
        state.poolRegistry || {}
      ).length,

    unknownPoolTrackerCount:
      Object.keys(
        state.unknownPools || {}
      ).length,

    marketFreshTarget:
      effectiveMarketFreshTargetAddress ||
      null,

    preMarketExclusion: {
      enabled:
        true,

      carriedAddress:
        pendingCompletionAddress ||
        null,

      carriedExcluded:
        Boolean(
          pendingPreMarketExclusion
            ?.excluded
        ),

      excludedReason:
        pendingPreMarketExclusion
          ?.reason ||
        null,

      selectedAddress:
        effectiveMarketFreshTargetAddress ||
        null
    },

    preMarketTerminalPruning: {
      enabled:
        true,

      carriedAddress:
        pendingCompletionAddress ||
        null,

      rejectedBeforeMarketLookup:
        Boolean(
          pendingPreMarketReject
            ?.terminal
        ),

      rejectedAddress:
        pendingPreMarketReject
          ?.terminal
          ? pendingCompletionAddress
          : null,

      reason:
        pendingPreMarketReject
          ?.reason ||
        null,

      nextMarketFreshTarget:
        effectiveMarketFreshTargetAddress ||
        null
    },

    marketFreshPriority: {
      strategy:
        "V154_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_DIRECTIONAL_USD_HUNTER",

      selectedAddress:
        effectiveMarketFreshTargetAddress ||
        null,

      ranked:
        rankedMarketFreshCandidates
          .slice(
            0,
            5
          )
          .map(
            row => ({
              address:
                normalize(
                  row.token.address
                ),

              symbol:
                row.token
                  ?.metadata
                  ?.symbol ||
                null,

              score:
                row.score,

              launchFreshness:
                trueLaunchFreshness(
                  row.token
                ),

              cachedMarketVerified:
                row.token
                  ?.marketCache
                  ?.data
                  ?.verified ===
                true,

              usableVerifiedMarketCache:
                verifiedUsableMarketCache(
                  row.token
                ),

              concentrationRisk:
                row.token
                  ?.holderCache
                  ?.data
                  ?.whale
                  ?.concentrationRisk ||
                "UNVERIFIED"
            })
          ),

      terminalPruned:
        preAnalysisTerminalSnapshotV150
          .slice(
            0,
            10
          )
    },

    retryFairnessV139: {
      enabled:
        true,

      triggered:
        retryFairnessOverrideV139,

      minimumScoreLead:
        RETRY_FAIRNESS_MIN_SCORE_LEAD_V139,

      carriedAddress:
        pendingCompletionAddress ||
        null,

      carriedScore:
        pendingCompletionPriorityScore ??
        null,

      challengerAddress:
        normalize(
          retryFairnessChallengerRow
            ?.token
            ?.address
        ) ||
        null,

      challengerSymbol:
        retryFairnessChallengerRow
          ?.token
          ?.metadata
          ?.symbol ||
        null,

      challengerScore:
        retryFairnessChallengerRow
          ?.score ??
        null,

      freshSlotAddress:
        marketFreshTargetAddress ||
        null,

      persistedRetryAddress:
        retryPersistenceAddressV139 ||
        null,

      carriedRetryPreserved:
        Boolean(
          retryFairnessOverrideV139 &&
          retryPersistenceAddressV139 ===
            pendingCompletionAddress
        )
    },

    priorityFreshMarketSchedule:
      priorityFreshSchedule(
        state,
        effectiveMarketFreshTargetAddress
      ),

    priorityCandidateCompletion:
      priorityCompletionTelemetry,

    tokenValidationChecks:
      validationResults.length,

    deferredAnalysis,

    excludedAssets,

    validERC20Tokens:
      candidates.length,

    validationResults,

    topCandidateCompletionBudget: {
      enabled:
        true,

      address:
        marketFreshTargetAddress ||
        null,

      analysedFirst:
        Boolean(
          marketFreshTargetAddress
        ),

      deferred:
        topCandidateAnalysisDeferred,

      requiredRequests:
        topCandidateRequiredRequests,

      deferredReason:
        topCandidateDeferredReason,

      lowerPriorityProtected:
        topCandidateAnalysisDeferred
    },

    terminalPriorityHandoff: {
      enabled: true,
      triggered:
        v135TerminalPriorityHandoff
          .triggered,
      rejectedAddress:
        v135TerminalPriorityHandoff
          .rejectedAddress,
      rejectedSymbol:
        v135TerminalPriorityHandoff
          .rejectedSymbol,
      rejectedReason:
        v135TerminalPriorityHandoff
          .rejectedReason,
      replacementAddress:
        v135TerminalPriorityHandoff
          .replacementAddress,
      replacementSymbol:
        v135TerminalPriorityHandoff
          .replacementSymbol,
      replacementInserted:
        v135TerminalPriorityHandoff
          .replacementInserted,

      prioritySource:
        "LOCAL_IS_PRIORITY_COMPLETION_V137"
    },

    excludedTargetHandoffV141,

    preAnalysisTerminalPruningV142,

    terminalSnapshotQueueGuardV150: {
      enabled:
        true,
      snapshottedBeforeAnalysis:
        preAnalysisTerminalSnapshotV150.length,
      addresses:
        preAnalysisTerminalSnapshotV150
          .slice(
            0,
            10
          ),
      reinsertionBlocked:
        true,
      watchlistEntriesRetained:
        true
    },

    postAnalysisTerminalDiscoveriesV150:
      postAnalysisTerminalDiscoveriesV150
        .slice(
          0,
          10
        ),

    dynamicTerminalPruningV148: {
      ...dynamicTerminalPruningV148,
      pruned:
        dynamicTerminalPruningV148
          .pruned
          .slice(
            0,
            10
          )
    },

    partialHolderRetryCacheV149: {
      enabled:
        true,
      retryMs:
        HOLDER_PARTIAL_RETRY_MS_V149,
      concentrationPromotionAllowed:
        false,
      active: state.watchedTokens
        .map(
          watched => {
            const cache =
              watched
                ?.partialHolderCacheV149;

            if (
              !cache ||
              typeof cache !==
                "object"
            ) {
              return null;
            }

            const timestamp =
              safeNumber(
                cache.timestamp
              );

            if (
              !timestamp ||
              Date.now() -
                timestamp >
                HOLDER_PARTIAL_RETRY_MS_V149
            ) {
              return null;
            }

            return {
              address:
                normalize(
                  watched.address
                ),
              symbol:
                watched?.metadata?.symbol ||
                watched?.symbol ||
                null,
              status:
                cache?.data
                  ?.integrity
                  ?.status ||
                null,
              source:
                cache.source ||
                null,
              countersVerified:
                Boolean(
                  cache?.data
                    ?.countersVerified
                ),
              holderCount:
                cache?.data
                  ?.holderCount ??
                null,
              transferCount:
                cache?.data
                  ?.transferCount ??
                null,
              retryAt:
                timestamp +
                HOLDER_PARTIAL_RETRY_MS_V149,
              retryAfterMs:
                Math.max(
                  0,
                  timestamp +
                    HOLDER_PARTIAL_RETRY_MS_V149 -
                    Date.now()
                )
            };
          }
        )
        .filter(
          Boolean
        )
        .slice(
          0,
          10
        )
    },

    holderProviderTelemetryV144,

    blockscoutPro404RetryProtectionV146: {
      enabled:
        true,
      retryMs:
        BLOCKSCOUT_PRO_404_RETRY_MS_V146,
      classification:
        "HOLDER_DATA_CURRENTLY_UNAVAILABLE",
      doesNotAssumeIndexingCause:
        true,
      addressScoped:
        true,
      publicBlockscoutStillCheckedFirst:
        true,
      activeRetries:
        state.watchedTokens
          .map(
            watched => ({
              address:
                normalize(
                  watched?.address
                ),
              symbol:
                watched?.symbol ||
                null,
              ...blockscoutPro404RetryV146(
                watched
              )
            })
          )
          .filter(
            row =>
              row.active
          )
          .slice(
            0,
            10
          )
    },

    blockscoutProOutageProtectionV145: {
      enabled:
        true,
      cooldownMs:
        BLOCKSCOUT_PRO_OUTAGE_COOLDOWN_MS_V145,
      ...blockscoutProOutageTelemetryV145(
        state
      )
    },

    blockscoutProV143: {
      configured:
        Boolean(
          String(
            env?.BLOCKSCOUT_PRO_API_KEY ||
            ""
          ).trim()
        ),
      chainId:
        BLOCKSCOUT_PRO_CHAIN_ID,
      publicRoutesRemainPrimary:
        true,
      holderFallbackOnly:
        true
    },

    blockscoutHolderOutageProtection: {
      enabled:
        true,

      active:
        budget
          ?.blockscoutHolderOutage
          ?.active ===
        true,

      detectedAt:
        budget
          ?.blockscoutHolderOutage
          ?.detectedAt ||
        null,

      detectedToken:
        budget
          ?.blockscoutHolderOutage
          ?.detectedToken ||
        null,

      lowerPriorityFreshRequestsSuppressed:
        safeNumber(
          budget
            ?.blockscoutHolderOutage
            ?.lowerPriorityFreshRequestsSuppressed
        ),

      lowerPriorityCacheFallbacks:
        safeNumber(
          budget
            ?.blockscoutHolderOutage
            ?.lowerPriorityCacheFallbacks
        )
    },

    marketLookups,

    holderLookups,

    candidates,

    qualifyingCandidates:
      candidates.filter(
        qualifiesTelegram
      ).length,

    onChainActivityMomentumV152: {
      enabled:
        true,
      source:
        "UNISWAP_V4_LIVE_WINDOW_ONLY",
      externalRequestsAdded:
        0,
      usdValueInferred:
        false,
      buySellDirectionInferred:
        false,
      candidates:
        candidates
          .map(
            candidate => ({
              address:
                normalize(
                  candidate.address
                ),
              symbol:
                candidate.symbol ||
                null,
              momentumScore:
                candidate.momentum?.score ??
                0,
              momentumVerified:
                candidate.momentum?.verified ===
                true,
              activity:
                candidate
                  .momentum
                  ?.onChainActivityMomentumV152 ||
                null
            })
          )
          .slice(
            0,
            10
          )
    },

    directionalTradeEnrichment,

    preQualificationDirectionalEnrichmentV151: {
      enabled:
        true,
      selectionMode:
        directionalTradeEnrichment?.selectionMode || null,
      address:
        directionalTradeEnrichment?.address || null,
      attempted:
        directionalTradeEnrichment?.attempted === true,
      verifiedAnyWindow:
        directionalTradeEnrichment?.verifiedAnyWindow === true,
      candidateWasQualifiedBeforeEnrichment:
        directionalTradeEnrichment
          ?.candidateWasQualifiedBeforeEnrichment === true,
      candidateQualifiesAfterEnrichment:
        directionalTradeEnrichment
          ?.candidateQualifiesAfterEnrichment === true,
      oneGeckoFreshPerScanPreserved:
        true,
      strictUsdVerificationPreserved:
        true
    },

    sameRunTargetReselection,

    sameRunTerminalCleanup: {
      enabled:
        true,

      prunedCount:
        sameRunTerminalCandidates.length,

      pruned:
        sameRunTerminalCandidates
          .slice(
            0,
            10
          )
          .map(
            row => ({
              address:
                normalize(
                  row
                    .candidate
                    .address
                ),

              symbol:
                row
                  .candidate
                  ?.symbol ||
                null,

              reason:
                row
                  .terminal
                  .reason ||
                null,

              top1Percent:
                row
                  .terminal
                  .top1Percent ??
                null,

              concentrationRisk:
                row
                  .terminal
                  .concentrationRisk ||
                null
            })
          )
    },

    telegramQualificationDiagnostics,

    telegramResults,

    intelligence: {
      trueLiveFirstScanning:
        "ENABLED_V96",

      persistentPoolRegistry:
        "ENABLED_V96",

      livePoolReactivation:
        "ENABLED_V96",

      holderIntelligenceCache:
        "ENABLED_V96",

      staleHolderOutageFallback:
        "ENABLED_V96",

      priorityMarketFreshSlot:
        "ENABLED_V96",

      protectedBacklogAcceleration:
        "ENABLED_V96",

      backlogGlobalReserveRequests:
        BACKLOG_GLOBAL_RESERVE,

      providerSpecificBacklogLearning:
        "ENABLED_V96",

      provenSuccessRangePersistence:
        "ENABLED_V96",

      failedUpperBoundLearning:
        "ENABLED_V96",

      persistentRpc429Cooldown:
        "ENABLED",

      providerCooldownSwitching:
        "ENABLED",

      guaranteedSequentialBacklog:
        "ENABLED",

      richV77StyleTelegram:
        "ENABLED_V96",

      oneStrikeFailedRangeLearning:
        "ENABLED_V96",

      dexscreenerFreshRequestGuard:
        "ENABLED_V96",

      blockscoutEfficientFallback:
        "ENABLED_V96",

      severeRiskOverride:
        "ENABLED_V96",

      singleSwapLowRiskProtection:
        "ENABLED",

      twoEvidenceLowRiskRequirement:
        "ENABLED",

      holderCounterFallback:
        "ENABLED_V96",

      tokenizedSecurityFiltering:
        "ENABLED",

      ondoSecurityFiltering:
        "ENABLED",

      infrastructureHolderFiltering:
        "ENABLED",

      poolManagerWhaleExclusion:
        "ENABLED",

      adjustedOwnershipSupply:
        "ENABLED",

      holderIntegrityValidation:
        "ENABLED",

      emptyHolderFalsePositiveProtection:
        "ENABLED",

      zeroBalanceConcentrationProtection:
        "ENABLED",

      impossibleConcentrationProtection:
        "ENABLED",

      dexscreener429Protection:
        "ENABLED",

      dexscreenerMarketCache:
        "ENABLED",

      dexscreenerStaleFallback:
        "ENABLED",

      metadataReuse:
        "ENABLED",

      momentum:
        "ENABLED",

      whaleFlow:
        "ENABLED",

      concentrationTrend:
        "ENABLED_V96",

      candidateRanking:
        "ENABLED",

      telegramTokenImages:
        "ENABLED_V96",

      telegramSendPhotoFallback:
        "ENABLED_V96",

      telegram:
        "ENABLED",

      blockscoutLegacyHolderFallback:
        "ENABLED_V96",

      blockscoutIndependentCounters:
        "ENABLED_V96",

      dexscreenerSecondTokenRoute:
        "ENABLED_V96",

      liveInitializeLookback:
        "ENABLED_V98",
      dexscreenerBurstSuppression:
        "ENABLED_V98",

      multiWindowTradeCounts:
        "ENABLED_V99",

      directionalUsdStrictVerification:
        "ENABLED_V99",

      telegramTradeFlowSection:
        "ENABLED_V99",

      persistentUnknownPoolTracker:
        "ENABLED_V100",

      targetedUnknownPoolInitializeResolution:
        "ENABLED_V100",

      boundedUnknownPoolSearchCursor:
        "ENABLED_V100",

      sameRunResolvedPoolReactivation:
        "ENABLED_V100",

      acceleratedUnknownPoolResolution:
        "ENABLED_V101",

      targetedResolutionRequestLimit:
        UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,

      adaptiveInitializeLookbackPriority:
        "ENABLED_V101",

      fairUnknownPoolRotation:
        "ENABLED_V102",

      adaptiveUnknownPoolSearchWindows:
        "ENABLED_V102",

      maxUnknownPoolSearchChunkBlocks:
        UNKNOWN_POOL_SEARCH_MAX_CHUNK_BLOCKS,

      dexscreenerFreshSpacingMs:
        DEXSCREENER_MIN_FRESH_INTERVAL_MS,

      mixedDepthUnknownPoolScheduler:
        "ENABLED_V103",

      unknownPoolResolverLanes:
        [
          "FRESH",
          "DEEP",
          "OLDEST_WAIT"
        ],

      providerSafeDeepPoolResolution:
        "ENABLED_V104",

      deepPoolDesiredVsActualChunkTelemetry:
        "ENABLED_V104",

      providerSpecificUnknownPoolRanges:
        "ENABLED_V105",

      unknownPoolActivityPriority:
        "ENABLED_V105",

      persistentUnknownPoolActivityCounters:
        "ENABLED_V105",

      rpcLearningStatePathFix:
        "ENABLED_V106",

      rpcLearningStatePath:
        "state.services.discoveryRpc",

      alchemySpeculativeBacklogGrowth:
        "DISABLED_V107",

      contiguousDeepPoolBurst:
        "ENABLED_V107",

      unknownPoolResolutionRequestsPerRun:
        UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,

      liveDiscoveryRequestLimit:
        LIVE_DISCOVERY_REQUEST_LIMIT,

      balancedUnknownPoolBreadthDepth:
        "ENABLED_V108",

      activityBreadthSlotsPerRun:
        2,

      maxDeepBurstSlotsPerRun:
        2,

      liveGlobalDownstreamReserve:
        LIVE_GLOBAL_RESERVE,

      exactPoolCapabilityLearning:
        "ENABLED_V110",

      exactPoolStartsFromProvenSafeRange:
        "ENABLED_V110",

      exactPoolOneGrowthProbePerProviderPerRun:
        "ENABLED_V110",

      exactPoolGrowthSuccessStreak:
        UNKNOWN_POOL_EXACT_GROW_SUCCESS_STREAK,

      exactPoolGrowthMaxBlocks:
        UNKNOWN_POOL_EXACT_MAX_BLOCKS,

      exactPoolFailedUpperBoundPersistence:
        "ENABLED_V110",

      exactPoolProbeFailureSafeFallback:
        "ENABLED_V110",

      exactPool429PersistentCooldown:
        "ENABLED_V110",

      actualResolverRequestAccounting:
        "ENABLED_V110",

      contiguousInitializeCoverage:
        "ENABLED_V110",

      contaminatedExactRangeKvSanitizer:
        "ENABLED_V111",

      exactSafeRange400Demotion:
        "ENABLED_V111",

      exactSafeRange400ContiguousRetry:
        "ENABLED_V111",

      hardUnknownPoolExternalRequestLimit:
        "ENABLED_V112",

      stalledUnknownPoolAdaptiveBackoff:
        "ENABLED_V112",

      severeStalledUnknownPoolBackoff:
        "ENABLED_V112",

      providerAwareDeepBurst:
        "ENABLED_V112",

      deepBurstStallMonopolyProtection:
        "ENABLED_V112",

      providerAwareInitializeLocality:
        "ENABLED_V113",

      alchemyDeepSearchGrindingProtection:
        "ENABLED_V113",

      launchProximityUnknownPoolPriority:
        "ENABLED_V113",

      failedExactProbeProviderCooldown:
        "ENABLED_V113",

      alchemyFailedExactProbeCooldownMs:
        UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_ALCHEMY_MS,

      publicFailedExactProbeCooldownMs:
        UNKNOWN_POOL_EXACT_FAILED_PROBE_COOLDOWN_PUBLIC_MS,

      contiguousInitializeCoverage:
        "ENABLED_V113",

      providerAwareLiveHeadSync:
        "ENABLED_V114",

      liveHeadClampRetry:
        "ENABLED_V114",

      actualLiveScannedBlockPersistence:
        "ENABLED_V114",

      telegramQualificationDiagnostics:
        "ENABLED_V114",

      telegramThresholdsUnchanged:
        "ENABLED_V114",

      persistentPriorityCandidateCompletion:
        "ENABLED_V116",

      priorityCandidateFirstAnalysis:
        "ENABLED_V116",

      priorityMarketTargetPersistence:
        "ENABLED_V116",

      telegramThresholdsStillUnchanged:
        "ENABLED_V116",

      schedulerAlignedDexFreshInterval:
        "ENABLED_V116",
      persistentPriorityFreshReservation:
        "ENABLED_V116",
      priorityFreshEligibilityTelemetry:
        "ENABLED_V116",
      priorityCandidateNextFreshRequest:
        "ENABLED_V116",
      dexscreener429CooldownPreserved:
        "ENABLED_V116",

      geckoTerminalMarketFallback:
        "ENABLED_V117",

      robinhoodGeckoNetwork:
        GECKOTERMINAL_NETWORK,

      priorityOnlyMarketFallback:
        "ENABLED_V117",

      oneGeckoFreshRequestPerScan:
        GECKOTERMINAL_MAX_FRESH_PER_SCAN,

      verifiedFallbackRequiresPositivePriceAndLiquidity:
        "ENABLED_V117",

      dexScreenerNoLongerSingleMarketGateway:
        "ENABLED_V117",

      telegramThresholdsUnchangedV117:
        "ENABLED_V117",

      terminalPriorityCandidatePruning:
        "ENABLED_V118",

      severeRiskPriorityMonopolyProtection:
        "ENABLED_V118",

      highConcentrationPriorityPruning:
        "ENABLED_V118",

      onChainV4MarketActivityEvidence:
        "ENABLED_V118",

      onChainEvidenceNeverInventsUsdPriceOrLiquidity:
        "ENABLED_V118",

      dexAndGeckoRemainSupplemental:
        "ENABLED_V118",

      telegramThresholdsUnchangedV118:
        "ENABLED_V118",

      preMarketTerminalPriorityPruning:
        "ENABLED_V119",

      cachedVerifiedRiskFreshSlotProtection:
        "ENABLED_V119",

      terminalCandidateRequestWasteProtection:
        "ENABLED_V119",

      nextViableFreshMarketTargetSelection:
        "ENABLED_V119",

      currentArchitectureLabelsClean:
        "ENABLED_V119",

      telegramThresholdsUnchangedV119:
        "ENABLED_V119",

      trueLaunchAgeClassification:
        "ENABLED_V120",

      newToScannerVsNewlyLaunched:
        "ENABLED_V120",

      matureBacklogDiscoveryDemotion:
        "ENABLED_V120",

      viableUnverifiedMarketPriority:
        "ENABLED_V120",

      launchAgeAwareFreshMarketRanking:
        "ENABLED_V120",

      telegramThresholdsUnchangedV120:
        "ENABLED_V120",

      marketUnverifiedFreshSlotDominance:
        "ENABLED_V121",

      matureVerifiedMarketFreshSlotDemotion:
        "ENABLED_V121",

      telegramHolderEvidenceGate:
        "ENABLED_V121",

      holderUnverifiedTrackInsteadOfAlert:
        "ENABLED_V121",

      telegramThresholdsUnchangedV121:
        "ENABLED_V121",

      preMarketAssetExclusion:
        "ENABLED_V122",

      tokenizedSecurityFreshSlotProtection:
        "ENABLED_V122",

      excludedPriorityStateCleanup:
        "ENABLED_V122",

      excludedTargetReselection:
        "ENABLED_V122",

      telegramThresholdsUnchangedV122:
        "ENABLED_V122",

      preMarketExclusionRuntimeHotfix:
        "FIXED_V123",

      existingTokenizedSecurityReasonReuse:
        "ENABLED_V123",

      knownQuotePremarketExclusion:
        "ENABLED_V123",

      telegramThresholdsUnchangedV123:
        "ENABLED_V123",

      freshMarketTerminalRiskFilter:
        "ENABLED_V124",

      highConcentrationRankingPrune:
        "ENABLED_V124",

      extremeTop1RankingPrune:
        "ENABLED_V124",

      verifiedMarketCachePreference:
        "ENABLED_V124",

      externalRequestRateUnchanged:
        "ENABLED_V124",

      telegramThresholdsUnchangedV124:
        "ENABLED_V124",

      sameRunTerminalRiskCleanup:
        "ENABLED_V125",

      sameRunHighConcentrationPriorityCleanup:
        "ENABLED_V125",

      telegramLaunchStageClassification:
        "ENABLED_V125",

      matureAlertWording:
        "ENABLED_V125",

      externalRequestRateStillUnchanged:
        "ENABLED_V125",

      telegramThresholdsUnchangedV125:
        "ENABLED_V125",

      geckoTerminalIndividualTradeFeed:
        "ENABLED_V126",

      verifiedDirectionalUsd5m1h24h:
        "ENABLED_V126_STRICT_WINDOW_COVERAGE",

      latest300CoverageProtection:
        "ENABLED_V126",

      incomplete24hNeverExtrapolated:
        "ENABLED_V126",

      candidateBaseQuoteSideCorrection:
        "ENABLED_V126",

      directionalUsdNeverInferredFromCounts:
        "ENABLED_V126",

      oneGeckoRequestPerScanStillEnforced:
        "ENABLED_V126",

      telegramUsdNetFlow:
        "ENABLED_V126",

      telegramThresholdsUnchangedV126:
        "ENABLED_V126",

      sameRunTerminalTargetReselection:
        "ENABLED_V127",

      postAnalysisFreshTargetTelemetry:
        "ENABLED_V127",

      nextViableTargetPersistence:
        "ENABLED_V127",

      geckoGlobalFreshSpacingMs:
        GECKOTERMINAL_MIN_FRESH_INTERVAL_MS,

      geckoAdaptive429Backoff:
        "ENABLED_V127",

      geckoMax429CooldownMs:
        GECKOTERMINAL_MAX_429_COOLDOWN_MS,

      geckoRateLimitHistoryPersistence:
        "ENABLED_V127",

      telegramThresholdsUnchangedV127:
        "ENABLED_V127",

      verifiedMarketPairHolderExclusion:
        "ENABLED_V128",

      dynamicLpInfrastructureClassification:
        "ENABLED_V128_VERIFIED_MARKET_ONLY",

      cachedHolderLpMisclassificationRepair:
        "ENABLED_V128",

      adjustedOwnershipSupplyIncludesVerifiedLp:
        "ENABLED_V128",

      lpFalseWhaleProtection:
        "ENABLED_V128",

      gecko429HistorySeedOnce:
        "ENABLED_V128",

      geckoSuccessBackoffDeescalationFix:
        "ENABLED_V128",

      telegramThresholdsUnchangedV128:
        "ENABLED_V128",

      concentrationComparableSnapshotGuard:
        "ENABLED_V129",

      ownershipBasisSignature:
        "ENABLED_V129",

      infrastructureBasisChangeTrendReset:
        "ENABLED_V129",

      zeroTrackedWalletTrendProtection:
        "ENABLED_V129",

      firstMeasurementTrendProtection:
        "ENABLED_V129",

      directionalUsdLogicUnchangedV129:
        "ENABLED_V129",

      telegramThresholdsUnchangedV129:
        "ENABLED_V129",

      rollingDirectionalTradeLedger:
        "ENABLED_V130",

      rollingDirectionalTradeDeduplication:
        "ENABLED_V130",

      directionalBatchContinuityProof:
        "ENABLED_V130",

      directionalGapResetNoExtrapolation:
        "ENABLED_V130",

      rollingDirectional1h24h:
        "ENABLED_V130_STRICT_CONTINUOUS_COVERAGE",

      directionalLedgerMaxTrades:
        DIRECTIONAL_LEDGER_MAX_TRADES,

      directionalLedgerMaxPools:
        DIRECTIONAL_LEDGER_MAX_POOLS,

      geckoRequestRateUnchangedV130:
        "ENABLED_V130",

      whaleConcentrationBonusRequiresWalletMovement:
        "ENABLED_V130",

      telegramThresholdsUnchangedV130:
        "ENABLED_V130",

      ownershipSupplySnapshotPersistence:
        "ENABLED_V131",

      materialOwnershipDenominatorGuard:
        "ENABLED_V131",

      materialOwnershipSupplyChangePercent:
        MATERIAL_OWNERSHIP_SUPPLY_CHANGE_PERCENT,

      denominatorChangeWalletConfirmation:
        "ENABLED_V131",

      falseConcentrationTrendDenominatorProtection:
        "ENABLED_V131",

      rollingDirectionalUsdUnchangedV131:
        "ENABLED_V131",

      externalRequestRateUnchangedV131:
        "ENABLED_V131",

      telegramThresholdsUnchangedV131:
        "ENABLED_V131",

      dynamicUnknownPoolAnalysisReserve:
        "ENABLED_V132",

      unknownPoolHardCeilingPreservedV132:
        UNKNOWN_POOL_RESOLUTION_REQUESTS_PER_RUN,

      unknownPoolActivePipelineRequestLimitV132:
        UNKNOWN_POOL_ACTIVE_PIPELINE_REQUEST_LIMIT,

      unknownPoolAnalysisProtectedRequestsV132:
        UNKNOWN_POOL_ANALYSIS_PROTECTED_REQUESTS,

      candidateAnalysisBudgetPriorityV132:
        "ENABLED_V132",

      rollingDirectionalUsdUnchangedV132:
        "ENABLED_V132",

      ownershipDenominatorGuardUnchangedV132:
        "ENABLED_V132",

      externalRequestRateUnchangedV132:
        "ENABLED_V132",

      telegramThresholdsUnchangedV132:
        "ENABLED_V132",

      topCandidateFirstAnalysisOrder:
        "ENABLED_V133",

      topCandidateCompletionBudgetProtection:
        "ENABLED_V133",

      lowerPriorityDeferralAfterTopBudgetFailure:
        "ENABLED_V133",

      hardRequestBudgetUnchangedV133:
        42,

      unknownPoolBudgetProtectionUnchangedV133:
        "ENABLED_V133",

      ownershipDenominatorGuardUnchangedV133:
        "ENABLED_V133",

      rollingDirectionalUsdUnchangedV133:
        "ENABLED_V133",

      externalRequestRateUnchangedV133:
        "ENABLED_V133",

      telegramThresholdsUnchangedV133:
        "ENABLED_V133",

      sameRunBlockscoutHolderOutageCircuitBreaker:
        "ENABLED_V134",

      priorityCandidateAlwaysGetsHolderRetryV134:
        "ENABLED_V134",

      lowerPriorityHolderRequestSuppressionOnOutage:
        "ENABLED_V134",

      staleVerifiedHolderCacheOutageFallbackV134:
        "ENABLED_V134",

      missingHolderEvidenceNeverPromotedV134:
        "ENABLED_V134",

      topCandidateCompletionUnchangedV134:
        "ENABLED_V134",

      unknownPoolBudgetProtectionUnchangedV134:
        "ENABLED_V134",

      ownershipDenominatorGuardUnchangedV134:
        "ENABLED_V134",

      rollingDirectionalUsdUnchangedV134:
        "ENABLED_V134",

      externalRequestRateUnchangedV134:
        "ENABLED_V134",

      telegramThresholdsUnchangedV134:
        "ENABLED_V134",

      terminalCarriedPriorityEviction:
        "ENABLED_V135",

      sameRunPriorityBudgetHandoff:
        "ENABLED_V135",

      replacementTargetImmediateAnalysis:
        "ENABLED_V135",

      terminalPriorityMonopolyProtectionV135:
        "ENABLED_V135",

      blockscoutOutageResilienceUnchangedV135:
        "ENABLED_V135",

      topCandidateCompletionUnchangedV135:
        "ENABLED_V135",

      unknownPoolBudgetProtectionUnchangedV135:
        "ENABLED_V135",

      ownershipDenominatorGuardUnchangedV135:
        "ENABLED_V135",

      rollingDirectionalUsdUnchangedV135:
        "ENABLED_V135",

      externalRequestRateUnchangedV135:
        "ENABLED_V135",

      telegramThresholdsUnchangedV135:
        "ENABLED_V135",

      organicHolderBreadthGuard:
        "ENABLED_V136",

      minimumHealthyHolderCountV136:
        MIN_HEALTHY_HOLDER_COUNT_V136,

      minimumHealthyPositiveHolderRowsV136:
        MIN_HEALTHY_POSITIVE_HOLDER_ROWS_V136,

      lowConcentrationThinHolderBonusProtection:
        "ENABLED_V136",

      terminalPriorityHandoffUnchangedV136:
        "ENABLED_V136",

      blockscoutOutageResilienceUnchangedV136:
        "ENABLED_V136",

      rollingDirectionalUsdUnchangedV136:
        "ENABLED_V136",

      externalRequestRateUnchangedV136:
        "ENABLED_V136",

      telegramThresholdsUnchangedV136:
        "ENABLED_V136",

      localPriorityCompletionHandoffFix:
        "ENABLED_V137",

      persistedPriorityAddressDependencyRemovedV137:
        "ENABLED_V137",

      immediateTerminalPriorityBudgetHandoffV137:
        "ENABLED_V137",

      organicHolderBreadthUnchangedV137:
        "ENABLED_V137",

      blockscoutOutageResilienceUnchangedV137:
        "ENABLED_V137",

      rollingDirectionalUsdUnchangedV137:
        "ENABLED_V137",

      externalRequestRateUnchangedV137:
        "ENABLED_V137",

      telegramThresholdsUnchangedV137:
        "ENABLED_V137",

      transientPriorityRetryPersistence:
        "ENABLED_V138",

      priorityRetryMaxAttemptsV138:
        PRIORITY_COMPLETION_MAX_ATTEMPTS_V138,

      priorityRetryMaxAgeMsV138:
        PRIORITY_COMPLETION_MAX_AGE_MS_V138,

      addressScopedPriorityRetryHistoryV138:
        "ENABLED_V138",

      localPriorityHandoffUnchangedV138:
        "ENABLED_V138",

      organicHolderBreadthUnchangedV138:
        "ENABLED_V138",

      blockscoutOutageResilienceUnchangedV138:
        "ENABLED_V138",

      rollingDirectionalUsdUnchangedV138:
        "ENABLED_V138",

      externalRequestRateUnchangedV138:
        "ENABLED_V138",

      telegramThresholdsUnchangedV138:
        "ENABLED_V138",

      retryFairnessFreshSlot:
        "ENABLED_V139",

      retryFairnessMinimumScoreLeadV139:
        RETRY_FAIRNESS_MIN_SCORE_LEAD_V139,

      strongerNewLiveCandidateCanPreemptFreshSlotV139:
        "ENABLED_V139",

      carriedRetryStatePreservedDuringFairnessV139:
        "ENABLED_V139",

      transientRetryPersistenceUnchangedV139:
        "ENABLED_V139",

      localPriorityHandoffUnchangedV139:
        "ENABLED_V139",

      organicHolderBreadthUnchangedV139:
        "ENABLED_V139",

      blockscoutOutageResilienceUnchangedV139:
        "ENABLED_V139",

      rollingDirectionalUsdUnchangedV139:
        "ENABLED_V139",

      externalRequestRateUnchangedV139:
        "ENABLED_V139",

      telegramThresholdsUnchangedV139:
        "ENABLED_V139",

      priorityRetryRelevanceExpiry:
        "ENABLED_V140",

      priorityRetryRelevanceMinimumAgeMsV140:
        PRIORITY_RELEVANCE_MIN_AGE_MS_V140,

      priorityRetryRelevanceMaxVolume24hUsdV140:
        PRIORITY_RELEVANCE_MAX_VOLUME_24H_USD_V140,

      priorityRetryRelevanceMaxTransactions24hV140:
        PRIORITY_RELEVANCE_MAX_TXNS_24H_V140,

      providerOutageAloneNeverExpiresPriorityV140:
        "ENABLED_V140",

      relevanceExpiryOnlyLeavesPriorityLaneV140:
        "ENABLED_V140",

      retryFairnessUnchangedV140:
        "ENABLED_V140",

      transientRetryPersistenceUnchangedV140:
        "ENABLED_V140",

      localPriorityHandoffUnchangedV140:
        "ENABLED_V140",

      organicHolderBreadthUnchangedV140:
        "ENABLED_V140",

      blockscoutOutageResilienceUnchangedV140:
        "ENABLED_V140",

      rollingDirectionalUsdUnchangedV140:
        "ENABLED_V140",

      externalRequestRateUnchangedV140:
        "ENABLED_V140",

      telegramThresholdsUnchangedV140:
        "ENABLED_V140",

      immediateExcludedFreshTargetHandoff:
        "ENABLED_V141",

      tokenizedSecuritySameRunFreshSlotRecoveryV141:
        "ENABLED_V141",

      infrastructureSameRunFreshSlotRecoveryV141:
        "ENABLED_V141",

      invalidErc20SameRunFreshSlotRecoveryV141:
        "ENABLED_V141",

      nextRankedReplacementImmediateAnalysisV141:
        "ENABLED_V141",

      retryRelevanceExpiryUnchangedV141:
        "ENABLED_V141",

      retryFairnessUnchangedV141:
        "ENABLED_V141",

      transientRetryPersistenceUnchangedV141:
        "ENABLED_V141",

      localPriorityHandoffUnchangedV141:
        "ENABLED_V141",

      organicHolderBreadthUnchangedV141:
        "ENABLED_V141",

      blockscoutOutageResilienceUnchangedV141:
        "ENABLED_V141",

      rollingDirectionalUsdUnchangedV141:
        "ENABLED_V141",

      externalRequestRateUnchangedV141:
        "ENABLED_V141",

      telegramThresholdsUnchangedV141:
        "ENABLED_V141",

      preAnalysisVerifiedTerminalPruning:
        "ENABLED_V142",

      carriedPriorityVerifiedTerminalClearV142:
        "ENABLED_V142",

      noAnalysisNotCompletedRepersistAfterTerminalPruneV142:
        "ENABLED_V142",

      verifiedTerminalEvidenceOnlyV142:
        "ENABLED_V142",

      unverifiedHolderStatesNeverPrePrunedV142:
        "ENABLED_V142",

      excludedTargetHandoffUnchangedV142:
        "ENABLED_V142",

      retryRelevanceExpiryUnchangedV142:
        "ENABLED_V142",

      retryFairnessUnchangedV142:
        "ENABLED_V142",

      transientRetryPersistenceUnchangedV142:
        "ENABLED_V142",

      localPriorityHandoffUnchangedV142:
        "ENABLED_V142",

      organicHolderBreadthUnchangedV142:
        "ENABLED_V142",

      blockscoutOutageResilienceUnchangedV142:
        "ENABLED_V142",

      rollingDirectionalUsdUnchangedV142:
        "ENABLED_V142",

      externalRequestRateUnchangedV142:
        "ENABLED_V142",

      telegramThresholdsUnchangedV142:
        "ENABLED_V142",

      blockscoutProHolderFallback:
        "ENABLED_V143",

      blockscoutProChainIdV143:
        BLOCKSCOUT_PRO_CHAIN_ID,

      blockscoutProOptionalSecretV143:
        "BLOCKSCOUT_PRO_API_KEY",

      publicBlockscoutStillPrimaryV143:
        "ENABLED_V143",

      proFallbackOnlyAfterPublicHolderFailureV143:
        "ENABLED_V143",

      noHolderEvidencePromotionOnProFailureV143:
        "ENABLED_V143",

      preAnalysisTerminalPruningUnchangedV143:
        "ENABLED_V143",

      excludedTargetHandoffUnchangedV143:
        "ENABLED_V143",

      retryRelevanceExpiryUnchangedV143:
        "ENABLED_V143",

      retryFairnessUnchangedV143:
        "ENABLED_V143",

      transientRetryPersistenceUnchangedV143:
        "ENABLED_V143",

      localPriorityHandoffUnchangedV143:
        "ENABLED_V143",

      organicHolderBreadthUnchangedV143:
        "ENABLED_V143",

      rollingDirectionalUsdUnchangedV143:
        "ENABLED_V143",

      externalRequestRateUnchangedV143:
        "ENABLED_V143",

      telegramThresholdsUnchangedV143:
        "ENABLED_V143",

      explicitHolderProviderTelemetry:
        "ENABLED_V144",

      successfulHolderSourceRetentionV144:
        "ENABLED_V144",

      proAttemptStatusPerCandidateV144:
        "ENABLED_V144",

      telegramHolderCountVsConcentrationV144:
        "ENABLED_V144",

      telegramHolderProviderAuditV144:
        "ENABLED_V144",

      blockscoutProFallbackUnchangedV144:
        "ENABLED_V144",

      preAnalysisTerminalPruningUnchangedV144:
        "ENABLED_V144",

      excludedTargetHandoffUnchangedV144:
        "ENABLED_V144",

      retryRelevanceExpiryUnchangedV144:
        "ENABLED_V144",

      retryFairnessUnchangedV144:
        "ENABLED_V144",

      rollingDirectionalUsdUnchangedV144:
        "ENABLED_V144",

      externalRequestRateUnchangedV144:
        "ENABLED_V144",

      telegramThresholdsUnchangedV144:
        "ENABLED_V144",

      blockscoutProTransientOutageCooldown:
        "ENABLED_V145",

      blockscoutProTransientStatusesV145:
        [
          502,
          503,
          504
        ],

      blockscoutProOutageCooldownMsV145:
        BLOCKSCOUT_PRO_OUTAGE_COOLDOWN_MS_V145,

      blockscoutProCooldownStoredInExistingKvV145:
        "ENABLED_V145",

      blockscoutProCooldownSkipsAnalysisRequestV145:
        "ENABLED_V145",

      blockscoutProSuccessClearsCooldownV145:
        "ENABLED_V145",

      holderProviderTelemetryUnchangedV145:
        "ENABLED_V145",

      telegramHolderWordingUnchangedV145:
        "ENABLED_V145",

      preAnalysisTerminalPruningUnchangedV145:
        "ENABLED_V145",

      excludedTargetHandoffUnchangedV145:
        "ENABLED_V145",

      retryFairnessUnchangedV145:
        "ENABLED_V145",

      rollingDirectionalUsdUnchangedV145:
        "ENABLED_V145",

      externalRequestRateUnchangedV145:
        "ENABLED_V145",

      telegramThresholdsUnchangedV145:
        "ENABLED_V145",

      blockscoutPro404Classification:
        "ENABLED_V146",

      blockscoutPro404ClassificationV146:
        "HOLDER_DATA_CURRENTLY_UNAVAILABLE",

      blockscoutPro404CauseNotAssumedV146:
        "ENABLED_V146",

      blockscoutPro404RetryMsV146:
        BLOCKSCOUT_PRO_404_RETRY_MS_V146,

      addressScopedPro404RetryV146:
        "ENABLED_V146",

      pro404RetrySkipsAnalysisRequestV146:
        "ENABLED_V146",

      proSuccessClears404RetryV146:
        "ENABLED_V146",

      publicBlockscoutPriorityUnchangedV146:
        "ENABLED_V146",

      blockscoutProOutageProtectionUnchangedV146:
        "ENABLED_V146",

      holderProviderTelemetryUnchangedV146:
        "ENABLED_V146",

      telegramHolderWordingUnchangedV146:
        "ENABLED_V146",

      preAnalysisTerminalPruningUnchangedV146:
        "ENABLED_V146",

      excludedTargetHandoffUnchangedV146:
        "ENABLED_V146",

      retryFairnessUnchangedV146:
        "ENABLED_V146",

      rollingDirectionalUsdUnchangedV146:
        "ENABLED_V146",

      externalRequestRateUnchangedV146:
        "ENABLED_V146",

      telegramThresholdsUnchangedV146:
        "ENABLED_V146",

      marketProvider429Coordination:
        "ENABLED_V147",

      dexAdaptive429BackoffV147:
        "ENABLED_V147",

      dex429BaseCooldownMsV147:
        DEXSCREENER_429_COOLDOWN_MS,

      dex429MaxCooldownMsV147:
        DEXSCREENER_MAX_429_COOLDOWN_MS_V147,

      dex429SuccessDeescalationV147:
        "ENABLED_V147",

      geckoKnownCooldownPrecheckV147:
        "ENABLED_V147",

      fallbackAttemptTelemetryAccuracyV147:
        "ENABLED_V147",

      bothProvidersUnavailableRetryTelemetryV147:
        "ENABLED_V147",

      noMarketProviderRequestRateIncreaseV147:
        "ENABLED_V147",

      blockscoutPro404RetryUnchangedV147:
        "ENABLED_V147",

      blockscoutProOutageProtectionUnchangedV147:
        "ENABLED_V147",

      holderProviderTelemetryUnchangedV147:
        "ENABLED_V147",

      preAnalysisTerminalPruningUnchangedV147:
        "ENABLED_V147",

      excludedTargetHandoffUnchangedV147:
        "ENABLED_V147",

      retryFairnessUnchangedV147:
        "ENABLED_V147",

      rollingDirectionalUsdUnchangedV147:
        "ENABLED_V147",

      telegramThresholdsUnchangedV147:
        "ENABLED_V147",

      dynamicVerifiedTerminalQueuePruning:
        "ENABLED_V148",

      terminalRecheckBeforeEveryAnalysisV148:
        "ENABLED_V148",

      sameRunMutableQueueTerminalPruneV148:
        "ENABLED_V148",

      terminalFreshTargetPriorityTransferV148:
        "ENABLED_V148",

      terminalWatchlistRetentionV148:
        "ENABLED_V148",

      marketProviderAddressTelemetryFixV148:
        "ENABLED_V148",

      marketProvider429CoordinationUnchangedV148:
        "ENABLED_V148",

      blockscoutPro404RetryUnchangedV148:
        "ENABLED_V148",

      blockscoutProOutageProtectionUnchangedV148:
        "ENABLED_V148",

      holderProviderTelemetryUnchangedV148:
        "ENABLED_V148",

      preAnalysisTerminalPruningUnchangedV148:
        "ENABLED_V148",

      excludedTargetHandoffUnchangedV148:
        "ENABLED_V148",

      retryFairnessUnchangedV148:
        "ENABLED_V148",

      rollingDirectionalUsdUnchangedV148:
        "ENABLED_V148",

      telegramThresholdsUnchangedV148:
        "ENABLED_V148",

      partialHolderRetryCache:
        "ENABLED_V149",

      partialHolderRetryMsV149:
        HOLDER_PARTIAL_RETRY_MS_V149,

      poolManagerDominantNoOwnershipProtectionV149:
        "ENABLED_V149",

      partialHolderNeverPromotesConcentrationV149:
        "ENABLED_V149",

      partialHolderCounterRetentionV149:
        "ENABLED_V149",

      partialHolderPairBasisInvalidationV149:
        "ENABLED_V149",

      partialHolderProviderSourceRetentionV149:
        "ENABLED_V149",

      dynamicTerminalQueuePruningUnchangedV149:
        "ENABLED_V149",

      marketProvider429CoordinationUnchangedV149:
        "ENABLED_V149",

      blockscoutPro404RetryUnchangedV149:
        "ENABLED_V149",

      blockscoutProOutageProtectionUnchangedV149:
        "ENABLED_V149",

      telegramThresholdsUnchangedV149:
        "ENABLED_V149",

      deterministicTerminalSnapshotQueueGuard:
        "ENABLED_V150",

      terminalSnapshotFrozenBeforeAnalysisV150:
        "ENABLED_V150",

      terminalSnapshotReinsertionGuardV150:
        "ENABLED_V150",

      preVsPostAnalysisTerminalTelemetryV150:
        "ENABLED_V150",

      marketFreshTerminalTelemetryNoPostHocMutationV150:
        "ENABLED_V150",

      partialHolderRetryCacheUnchangedV150:
        "ENABLED_V150",

      dynamicTerminalQueuePruningUnchangedV150:
        "ENABLED_V150",

      marketProvider429CoordinationUnchangedV150:
        "ENABLED_V150",

      blockscoutPro404RetryUnchangedV150:
        "ENABLED_V150",

      blockscoutProOutageProtectionUnchangedV150:
        "ENABLED_V150",

      telegramThresholdsUnchangedV150:
        "ENABLED_V150",

      preQualificationDirectionalUsdEnrichment:
        "ENABLED_V151",

      highestPriorityVerifiedMarketDirectionalTargetV151:
        "ENABLED_V151",

      alreadyQualifiedDirectionalTargetStillPreferredV151:
        "ENABLED_V151",

      verifiedDirectionalUsdMomentumInputV151:
        "ENABLED_V151",

      postDirectionalMomentumRecomputeV151:
        "ENABLED_V151",

      geckoOneFreshPerScanUnchangedV151:
        "ENABLED_V151",

      geckoFreshSpacingUnchangedV151:
        "ENABLED_V151",

      strictDirectionalUsdVerificationUnchangedV151:
        "ENABLED_V151",

      terminalSnapshotQueueGuardUnchangedV151:
        "ENABLED_V151",

      partialHolderRetryCacheUnchangedV151:
        "ENABLED_V151",

      telegramThresholdsUnchangedV151:
        "ENABLED_V151",

      liveOnlyOnChainActivityMomentum:
        "ENABLED_V152",

      persistentV4ActivitySnapshotsV152:
        "ENABLED_V152",

      backlogExcludedFromMomentumV152:
        "ENABLED_V152",

      v4SwapAccelerationMomentumV152:
        "ENABLED_V152",

      v4LiquidityEventAccelerationMomentumV152:
        "ENABLED_V152",

      onChainMomentumNeverInventsUsdV152:
        "ENABLED_V152",

      onChainMomentumNeverInventsDirectionV152:
        "ENABLED_V152",

      externalRequestRateUnchangedV152:
        "ENABLED_V152",

      preQualificationDirectionalUsdUnchangedV152:
        "ENABLED_V152",

      terminalSnapshotQueueGuardUnchangedV152:
        "ENABLED_V152",

      partialHolderRetryCacheUnchangedV152:
        "ENABLED_V152",

      telegramThresholdsUnchangedV152:
        "ENABLED_V152",

      onChainV4PoolIdentityForDirectionalUsd:
        "ENABLED_V153",

      uniswapV4PoolIdAsGeckoPoolIdV153:
        "ENABLED_V153",

      knownQuoteOnlyPoolIdentityV153:
        "ENABLED_V153",

      nativeZeroQuoteIdentityV153:
        "ENABLED_V153",

      directionalUsdNoLongerRequiresDexVerifiedMarketV153:
        "ENABLED_V153",

      marketVerificationNeverPromotedByPoolIdentityV153:
        "ENABLED_V153",

      geckoTradeRowsStillRequiredForUsdV153:
        "ENABLED_V153",

      noExtraExternalRequestsV153:
        "ENABLED_V153",

      geckoFreshSpacingUnchangedV153:
        "ENABLED_V153",

      geckoOneFreshPerScanUnchangedV153:
        "ENABLED_V153",

      onChainActivityMomentumUnchangedV153:
        "ENABLED_V153",

      telegramThresholdsUnchangedV153:
        "ENABLED_V153",

      geckoPoolIdentityScopeHotfix:
        "FIXED_V154",

      marketIdentityReferenceScopedToDirectionalFlowV154:
        "ENABLED_V154",

      onChainPoolIdentityDirectionalUnchangedV154:
        "ENABLED_V154",

      noExternalRequestRateChangeV154:
        "ENABLED_V154",

      telegramThresholdsUnchangedV154:
        "ENABLED_V154",

      socialMomentum:
        "NOT_VERIFIED"
    },

    architecture:
      "V154_CORE_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_V77_TELEGRAM_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   HEALTH
   ========================================================= */

async function health(
  env
) {
  const budget =
    createBudget();

  const result =
    await readState(
      env
    );

  const state =
    result.state;

  pruneState(
    state,
    true
  );

  let latest =
    null;

  let provider =
    null;

  let error =
    null;

  try {
    const response =
      await latestBlock(
        env,
        budget
      );

    latest =
      Number(
        response.block
      );

    provider =
      response.provider;
  }

  catch (err) {
    error =
      errorString(
        err
      );
  }

  const discovery =
    discoveryService(
      state
    );

  const dex =
    dexService(
      state
    );

  const lastScheduledRun =
    safeNumber(
      state.scheduler
        ?.lastScheduledRunAt
    );

  const scheduledAgeMinutes =
    lastScheduledRun
      ? (
          Date.now() -
          lastScheduledRun
        ) /
        60000
      : null;

  const backlogRemaining =
    latest !==
      null &&
    state.lastScannedBlock !==
      null &&
    state.lastScannedBlock !==
      undefined
      ? Math.max(
          0,

          latest -
          safeNumber(
            state.lastScannedBlock
          )
        )
      : null;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      error
        ? "DEGRADED"
        : "ONLINE",

    routes: [
      "/health",
      "/rpc-test",
      "/scan",
      "/state",
      "/diagnostics",
      "/run-all",
      "/test-telegram"
    ],

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    rpcStatus:
      error
        ? "ERROR"
        : "CONNECTED",

    latestBlock:
      latest,

    rpcProvider:
      provider,

    error,

    alchemyConfigured:
      Boolean(
        env.ALCHEMY_API_KEY
      ),

    persistence: {
      kvConfigured:
        result.persistent,

      binding:
        result.binding,

      stateKey:
        STATE_KEY,

      lastScannedBlock:
        state.lastScannedBlock,

      lastLiveScannedBlock:
        state.lastLiveScannedBlock,

      backlogRemaining,

      backlogLag:
        backlogRemaining ===
          null
          ? "UNKNOWN"
          : backlogLagLabel(
              backlogRemaining
            ),

      watchedTokens:
        state.watchedTokens.length,

      snapshotTokens:
        Object.keys(
          state.snapshots ||
          {}
        ).length,

      stateError:
        result.error
    },

    scheduler: {
      scheduledRunCount:
        safeNumber(
          state.scheduler
            ?.scheduledRunCount
        ),

      lastScheduledRunAt:
        state.scheduler
          ?.lastScheduledRunAt ||
        null,

      lastScheduledSuccessAt:
        state.scheduler
          ?.lastScheduledSuccessAt ||
        null,

      lastScheduledStatus:
        state.scheduler
          ?.lastScheduledStatus ||
        null,

      lastScheduledLatestBlock:
        state.scheduler
          ?.lastScheduledLatestBlock ||
        null,

      minutesSinceScheduledRun:
        scheduledAgeMinutes,

      fiveMinuteCronLikelyActive:
        scheduledAgeMinutes !==
          null &&
        scheduledAgeMinutes <=
          10
    },

    discoveryRpc: {
      publicLearnedBacklogChunkBlocks:
        discovery
          .publicBacklogChunkBlocks,

      alchemyLearnedBacklogChunkBlocks:
        discovery
          .alchemyBacklogChunkBlocks,

      publicFailedUpperBound:
        discovery
          .publicBacklogFailedUpperBound,

      alchemyFailedUpperBound:
        discovery
          .alchemyBacklogFailedUpperBound,

      learnedLiveChunkBlocks:
        discovery
          .liveChunkBlocks,

      publicCooldownActive:
        discoveryProviderCooling(
          state,
          "ROBINHOOD_PUBLIC_RPC"
        ),

      publicTotal429s:
        discovery
          .publicTotal429s,

      alchemyCooldownActive:
        discoveryProviderCooling(
          state,
          "ALCHEMY"
        ),

      alchemyTotal429s:
        discovery
          .alchemyTotal429s
    },

    services: {
      dexscreener: {
        lastStatus:
          dex.lastStatus,

        cooldownActive:
          safeNumber(
            dex.cooldownUntil
          ) >
          Date.now(),

        cooldownUntil:
          dex.cooldownUntil,

        total429s:
          dex.total429s
      }
    },

    telegram: {
      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      automaticCalls:
        true,

      richV77Style:
        true,

      minimumScore:
        MIN_ALERT_SCORE,

      minimumConfidence:
        MIN_CONFIDENCE_ALERT,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY,

      verifiedRiskRequired:
        true
    },

    architecture:
      "V154_CORE_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_V77_TELEGRAM_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   RPC TEST
   ========================================================= */

async function rpcTest(
  env
) {
  const budget =
    createBudget();

  const startedAt =
    Date.now();

  try {
    const latest =
      await latestBlock(
        env,
        budget
      );

    const from =
      latest.block >
      2n
        ? latest.block -
          2n
        : 0n;

    const logs =
      await getLogsSingleProvider(
        env,
        from,
        latest.block,
        budget,
        "discovery-live",
        latest.provider ||
          "ROBINHOOD_PUBLIC_RPC"
      );

    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        Array.isArray(
          logs.result
        ),

      latestBlock:
        Number(
          latest.block
        ),

      provider:
        logs.provider ||
        latest.provider,

      poolManager:
        POOL_MANAGER,

      poolManagerLogs:
        Array.isArray(
          logs.result
        )
          ? logs.result.length
          : 0,

      error:
        logs.error,

      requestBudget:
        budgetTelemetry(
          budget
        ),

      durationMs:
        Date.now() -
        startedAt,

      timestamp:
        now()
    };
  }

  catch (error) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      error:
        errorString(
          error
        ),

      requestBudget:
        budgetTelemetry(
          budget
        ),

      timestamp:
        now()
    };
  }
}

/* =========================================================
   STATE
   ========================================================= */

async function stateStatus(
  env
) {
  const result =
    await readState(
      env
    );

  const state =
    result.state;

  pruneState(
    state,
    true
  );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    persistenceConfigured:
      result.persistent,

    bindingDetected:
      result.binding,

    stateKey:
      STATE_KEY,

    error:
      result.error,

    lastScannedBlock:
      state.lastScannedBlock,

    lastLiveScannedBlock:
      state.lastLiveScannedBlock,

    scheduler:
      state.scheduler,

    discoveryRpc:
      discoveryService(
        state
      ),

    watchedTokenCount:
      state.watchedTokens.length,

    poolRegistryCount:
      Object.keys(
        state.poolRegistry || {}
      ).length,

    unknownPoolTrackerCount:
      Object.keys(
        state.unknownPools || {}
      ).length,

    watchedTokens:
      state.watchedTokens.map(
        token => ({
          address:
            token.address,

          name:
            token.metadata
              ?.name ||
            null,

          symbol:
            token.metadata
              ?.symbol ||
            null,

          checks:
            safeNumber(
              token.checks
            ),

          invalidChecks:
            safeNumber(
              token.invalidChecks
            ),

          excludedReason:
            token.excludedReason ||
            null,

          lastValidationReason:
            token
              .lastValidationReason ||
            null,

          marketCacheAt:
            token.marketCache
              ?.timestamp ||
            null,

          firstSeenAt:
            token.firstSeenAt,

          lastSeenAt:
            token.lastSeenAt,

          lastLiveSeenAt:
            token.lastLiveSeenAt ||
            null,

          lastCheckedAt:
            token.lastCheckedAt,

          poolCount:
            token.pools
              ?.length ||
            0
        })
      ),

    snapshotTokenCount:
      Object.keys(
        state.snapshots ||
        {}
      ).length,

    alertHistoryCount:
      Object.keys(
        state.alerts ||
        {}
      ).length,

    updatedAt:
      state.updatedAt,

    timestamp:
      now()
  };
}

/* =========================================================
   DIAGNOSTICS
   ========================================================= */

async function diagnostics(
  env
) {
  const result =
    await readState(
      env
    );

  const state =
    result.state;

  const rpcResult =
    await rpcTest(
      env
    );

  const discovery =
    discoveryService(
      state
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      rpcResult.success,

    status:
      rpcResult.success
        ? result.persistent
          ? "READY"
          : "READY_WITH_KV_FIX_REQUIRED"
        : "DEGRADED",

    checks: {
      rpc: {
        success:
          rpcResult.success,

        latestBlock:
          rpcResult.latestBlock,

        provider:
          rpcResult.provider,

        error:
          rpcResult.error
      },

      kv: {
        configured:
          result.persistent,

        binding:
          result.binding,

        stateKey:
          STATE_KEY,

        readError:
          result.error
      },

      v88: {
        richV77Telegram:
          true,

        providerSpecificLearning:
          true,

        provenRangePersistence:
          true,

        failedUpperBoundLearning:
          true,

        publicLearnedChunk:
          discovery
            .publicBacklogChunkBlocks,

        alchemyLearnedChunk:
          discovery
            .alchemyBacklogChunkBlocks,

        publicFailedUpperBound:
          discovery
            .publicBacklogFailedUpperBound,

        alchemyFailedUpperBound:
          discovery
            .alchemyBacklogFailedUpperBound,

        severeRiskOverride:
          true,

        singleSwapLowRiskProtection:
          true,

        holderCountFallback:
          true,

        poolManagerWhaleExclusion:
          true,

        tokenizedSecurityFiltering:
          true,

        ondoFiltering:
          true,

        momentum:
          true,

        whaleFlow:
          true,

        concentrationTrend:
          true,

        telegram:
          true
      }
    },

    architecture:
      "V154_CORE_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_V77_TELEGRAM_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   TELEGRAM TEST
   ========================================================= */

async function telegramTest(
  env
) {
  const result =
    await sendTelegram(
      env,

`✅ <b>Robinhood Chain Meme Hunter ${VERSION}</b>

Telegram connection test successful.

📨 Rich V77-style calls restored
⚡ Live-first discovery active
🧠 Provider-specific RPC learning active
✅ Only proven successful ranges are saved
🛡 Stronger rug-risk logic active
🐋 Pool Manager whale exclusion active
👥 Holder counter fallback active
📈 Momentum tracking active
🐋 Whale-flow tracking active
🧯 DexScreener protection active

No fake token call was generated by this test.`
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.success,

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ),

    result,

    timestamp:
      now()
  };
}

/* =========================================================
   RUN ALL
   ========================================================= */

async function runAll(
  env
) {
  const startedAt =
    Date.now();

  const result =
    await scan(
      env,
      {
        scheduled:
          false
      }
    );

  const state =
    await stateStatus(
      env
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    status:
      "ALL_CORE_TESTS_COMPLETED",

    durationMs:
      Date.now() -
      startedAt,

    results: {
      scan:
        result,

      state
    },

    timestamp:
      now()
  };
}

/* =========================================================
   ROUTER
   ========================================================= */

async function handleRequest(
  request,
  env
) {
  const url =
    new URL(
      request.url
    );

  const path =
    url.pathname
      .replace(
        /\/+$/,
        ""
      ) ||
    "/";

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status:
          204,

        headers: {
          "access-control-allow-origin":
            "*",

          "access-control-allow-methods":
            "GET, OPTIONS",

          "access-control-allow-headers":
            "content-type"
        }
      }
    );
  }

  if (
    request.method !==
    "GET"
  ) {
    return jsonResponse(
      {
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          false,

        error:
          "METHOD_NOT_ALLOWED",

        timestamp:
          now()
      },

      405
    );
  }

  if (
    path ===
      "/" ||
    path ===
      "/health"
  ) {
    return jsonResponse(
      await health(
        env
      )
    );
  }

  if (
    path ===
    "/rpc-test"
  ) {
    return jsonResponse(
      await rpcTest(
        env
      )
    );
  }

  if (
    path ===
    "/scan"
  ) {
    return jsonResponse(
      await scan(
        env,
        {
          scheduled:
            false
        }
      )
    );
  }

  if (
    path ===
    "/state"
  ) {
    return jsonResponse(
      await stateStatus(
        env
      )
    );
  }

  if (
    path ===
    "/diagnostics"
  ) {
    return jsonResponse(
      await diagnostics(
        env
      )
    );
  }

  if (
    path ===
    "/run-all"
  ) {
    return jsonResponse(
      await runAll(
        env
      )
    );
  }

  if (
    path ===
    "/test-telegram"
  ) {
    return jsonResponse(
      await telegramTest(
        env
      )
    );
  }

  return jsonResponse(
    {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      error:
        "NOT_FOUND",

      routes: [
        "/health",
        "/rpc-test",
        "/scan",
        "/state",
        "/diagnostics",
        "/run-all",
        "/test-telegram"
      ],

      timestamp:
        now()
    },

    404
  );
}

/* =========================================================
   SCHEDULED
   ========================================================= */

async function scheduledScan(
  env
) {
  const result =
    await scan(
      env,
      {
        scheduled:
          true
      }
    );

  console.log(
    JSON.stringify({
      event:
        "V97_SCHEDULED_SCAN",

      status:
        result.status,

      latestBlock:
        result.latestBlock,

      backlogAdvanced:
        result.persistence
          ?.backlogBlocksAdvanced,

      backlogRemaining:
        result.persistence
          ?.backlogRemaining,

      publicLearnedChunk:
        result.discoveryRpc
          ?.publicLearnedBacklogChunkBlocks,

      alchemyLearnedChunk:
        result.discoveryRpc
          ?.alchemyLearnedBacklogChunkBlocks,

      publicFailedUpperBound:
        result.discoveryRpc
          ?.publicFailedUpperBound,

      alchemyFailedUpperBound:
        result.discoveryRpc
          ?.alchemyFailedUpperBound,

      candidates:
        result.candidates
          ?.length,

      qualifying:
        result.qualifyingCandidates,

      excludedAssets:
        result.excludedAssets,

      deferredAnalysis:
        result.deferredAnalysis,

      requests:
        result.requestBudget
          ?.used,

      discoveryRequests:
        result.requestBudget
          ?.discovery
          ?.used,

      analysisRequests:
        result.requestBudget
          ?.analysis
          ?.used,

      notifications:
        result.requestBudget
          ?.notification
          ?.used,

      timestamp:
        now()
    })
  );

  return result;
}

/* =========================================================
   CLOUDFLARE EXPORT
   ========================================================= */

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    try {
      return await handleRequest(
        request,
        env
      );
    }

    catch (error) {
      console.error(
        "V97 request failed",
        error
      );

      return jsonResponse(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          error:
            errorString(
              error
            ),

          architecture:
            "V154_CORE_ONCHAIN_POOL_IDENTITY_SCOPE_HOTFIX_V77_TELEGRAM_HUNTER",

          timestamp:
            now()
        },

        500
      );
    }
  },

  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      scheduledScan(
        env
      )
    );
  }
};
