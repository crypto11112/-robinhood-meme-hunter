/**
 * Robinhood Chain Meme Hunter
 * V237: exact-PoolId realtime Bitquery liquidity evidence inside the existing shared request; zero extra HTTP; evidence-only until live-proven.
 * V236
 *
 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER
 *
 *
 * V236 VERIFIED 12H BUY/SELL USD WINDOW
 * - Adds a 12h aggregation window over the existing already-verified directional USD records
 * - Adds 12h verified buys/sells, USD amounts, net flow and USD buy pressure to Telegram verified on-chain evidence
 * - Adds the same 12h display for verified Pons V2 curve flow when available
 * - Reuses the existing 24h retained evidence; zero extra HTTP requests and no new data source
 * - Does NOT change swap decoding, BUY/SELL classification, exact USD maths, Momentum, scoring, qualification thresholds, KV or request ceilings
 *
 * V235 SEPARATE PERSISTED MARKET-EVIDENCE TARGET HANDOFF
 * - Separates Bitquery market targeting from the V228 unresolved-holder target
 * - Persists the best viable post-analysis candidate still missing verified market evidence for the NEXT shared Bitquery request
 * - Market target must remain watched, valid/non-excluded, non-terminal and still market-unverified when consumed
 * - Gives Trading.Tokens V233 and rank-1 Trading.Pairs V234 their own candidate-specific target while holder fallback keeps its independent target
 * - Reuses the same shared Bitquery HTTP request: zero extra HTTP requests
 * - Does NOT promote market.verified or infer liquidity
 * - No changes to Momentum, verified BUY/SELL USD, holder maths, Telegram thresholds, KV key/binding or request ceilings
 *
 * V234 BITQUERY RANK-1 PAIR MARKET-EVIDENCE FALLBACK — STAGE 2
 * - Preserves V233 Trading.Tokens evidence unchanged
 * - Adds Bitquery Trading.Pairs for the same exact priority token with Ranking.Position = 1
 * - Requires USD-quoted price, exact token-address match and a fresh 1-second top-market row
 * - Captures top-market address/protocol/quote token, rank weight, price, market cap, FDV and current interval USD volume
 * - Reuses the same shared Bitquery HTTP request: zero extra HTTP requests
 * - Does NOT infer total 24h token volume from one pair and does NOT infer/verify liquidity
 * - Does NOT promote market.verified or bypass existing market/liquidity Telegram gates
 * - No changes to Momentum, verified BUY/SELL USD, holder maths, Telegram thresholds, KV key/binding or request ceilings
 *
 * V233 BITQUERY PRIORITY MARKET-EVIDENCE FALLBACK — STAGE 1
 * - Reuses the existing shared Bitquery HTTP request: zero extra HTTP requests
 * - Targets the same persisted/current priority address already available at request assembly
 * - Adds documented Robinhood Trading.Tokens evidence for exact-token USD price, market cap, FDV and 24h USD volume
 * - Uses NetworkBid bid:robinhood and exact token-address matching
 * - Requires a recent 1-second snapshot before evidence is marked fresh/verified
 * - Stores evidence separately as PARTIAL market evidence; liquidity is NOT inferred or promoted in V233
 * - DexScreener/GeckoTerminal remain primary full-market sources
 * - V233 does NOT set market.verified and therefore cannot bypass existing liquidity/market Telegram gates
 * - No changes to Momentum, verified BUY/SELL USD, holder maths, Telegram thresholds, KV key/binding or request ceilings
 *
 * V232 VERIFIED BEARISH-FLOW TELEGRAM PROTECTION
 * - Adds a conservative Telegram-only suppression gate for strongly bearish candidate-matched verified on-chain USD flow
 * - Requires Momentum <= 0 plus a meaningful verified short-term V4 sample before suppression can trigger
 * - Does not alter Momentum scoring or any verified BUY/SELL USD calculation
 * - Does not alter Opportunity, Confidence, holder maths, existing Telegram score/risk thresholds, KV or request budgets
 * - Adds zero external requests and exposes the suppression reason in Telegram qualification diagnostics
 *
 * V231 TELEGRAM PRESENTATION CLEANUP
 * - Renames broad market transaction section to Market Activity Counts — NOT USD VERIFIED
 * - Removes duplicated UNVERIFIED USD/net-flow fields from the broad count section
 * - Preserves the stricter Verified On-chain USD section unchanged
 * - No scoring, Momentum, verified USD, holder, qualification, KV or request-budget changes
 *
 * CURRENT BUILD: V231
 * - FIX: Bitquery holder fallback now uses dataset: realtime, matching the entitlement proven by V229 diagnostics
 * - FIX: removes the combined-dataset entitlement 403 that blocked the shared Bitquery launch/trading/holder request
 * - SAFETY: realtime holder rows are still exact-token matched, positive-balance filtered, freshness bounded and passed through existing holder-integrity maths before concentration can be verified
 * - SAFETY: Pons V2 remains excluded from Bitquery concentration promotion until dynamic protocol-owned balances are explicitly reconciled
 * - Adds zero HTTP requests and preserves V228 holder-target handoff, V229 sanitized diagnostics, Momentum, verified BUY/SELL USD, Telegram thresholds and 42/21 request ceilings
 *
 * CURRENT BUILD: V229
 * - V229 adds sanitized Bitquery shared-request 401/403 diagnostics without exposing credentials
 * - Verifies current V2 Bearer auth/header path and current EVM.Holders query shape while preserving V228 holder-target handoff
 * - Captures response content-type, bounded redacted error preview and conservative rejection classification
 * - Adds zero external requests; Momentum, verified BUY/SELL USD, Telegram thresholds and request ceilings unchanged
 * - FIX: persists the best non-Pons candidate still missing verified holder concentration after analysis so the NEXT existing Bitquery shared request can target it
 * - FIX: next-scan persisted holder target is selected before the older completion/live fallback, closing the V227 timing gap that produced NOT_TARGETED when candidates were selected after the shared request
 * - SAFETY: persisted targets expire after 6 hours, must still be watched/non-terminal/non-excluded, and are cleared when matching fresh Bitquery holder evidence is already verified
 * - SAFETY: Pons V2 remains excluded from Bitquery concentration targeting until its dynamic bonding-curve/locker infrastructure is explicitly reconciled
 * - Adds zero HTTP requests; reuses the existing shared Bitquery request and preserves the 42-request / 21-analysis ceilings
 * - Preserves V227 holder validation, V226 request allocation, V225 holder-count recovery, Momentum, verified BUY/SELL USD maths and Telegram thresholds
 *
 * CURRENT BUILD: V227
 * - NEW: Bitquery EVM.Holders evidence is folded into the existing shared Bitquery HTTP request for one priority/live target
 * - NEW: uses dataset: combined with a separate EVM alias for current holder rows + verified distinct holder count
 * - NEW: when Blockscout V2 + legacy rows fail, matching fresh Bitquery holder rows can satisfy the existing holder-integrity/concentration pipeline before spending Blockscout PRO
 * - NEW: Bitquery holder count can fill a missing Blockscout count only when the same targeted EVM.Holders response is verified and positive
 * - SAFETY: exact token-address match, positive balances, bounded 25-row cache, 10-minute freshness, raw-unit conversion from token decimals, and existing holder-integrity maths remain authoritative
 * - SAFETY: Pons V2 curve tokens are not promoted through the Bitquery concentration fallback yet because dynamic curve/locker infrastructure requires explicit exclusion before concentration can be trusted
 * - Adds zero HTTP requests: holder aliases share the existing Bitquery launch/Pons request; 42-request and 21-analysis ceilings are unchanged
 * - Preserves V226 request allocation, V225 holder-count display recovery, V224 launch coverage, V223 launch age, Momentum functions, verified BUY/SELL USD maths and Telegram thresholds
 *
 * CURRENT BUILD: V226
 * - NEW: priority holder-evidence completion can yield the V182 directional-USD reserve only when that reserve would otherwise block the next holder fallback
 * - SAFETY: yield is limited to the active top/priority-completion candidate after V2 holder rows are unavailable; lower-priority candidates cannot consume it through this path
 * - NEW: explicit V226 telemetry records reserve-yield address, reason, timestamp and whether the reserve was actually blocking
 * - Adds zero external requests and does not increase the 42-request hard ceiling or 21-request analysis ceiling
 * - Preserves V225 holder-count recovery, V224 launch coverage, V223 launch age, Momentum, verified BUY/SELL USD maths and Telegram thresholds
 *
 * CURRENT BUILD: V225
 * - NEW: display-only verified holder-count recovery from current Blockscout counters, verified holder cache, or recent verified snapshots
 * - NEW: holder-count cache is independent from holder concentration and never promotes concentration, momentum, confidence or Telegram qualification
 * - NEW: Telegram distinguishes FRESH verified holder counts from VERIFIED CACHE counts; absent trustworthy evidence remains UNVERIFIED
 * - SAFETY: cached holder count is display/telemetry only and does not set countersVerified or alter scoring/confirmation logic
 * - CONFIRMED: V224 already uses separate ClankerLaunchesV224 and VirtualsLaunchesV224 GraphQL aliases, so no anti-crowding code change was required
 * - Adds zero external requests and preserves V224 launch discovery, V223 launch age, Momentum, verified USD, holder integrity, Telegram thresholds and 42-request ceiling
 * CURRENT BUILD: V224
 * - NEW: verified Clanker discovery using Bitquery exact factory + zero-address 100B launch mint
 * - NEW: verified Virtuals discovery using Bitquery exact factory + zero-address mint without a fixed-supply assumption
 * - NEW: Clanker/Virtuals launches enter watch/live/new-token priority in the same scan and inherit V223 verified launch-age/Telegram age support
 * - SAFETY: separate supply-rule branches; no pool, DEX, quote or graduation model is guessed
 * - Adds zero HTTP requests by sharing the existing Bitquery GraphQL request
 * - Momentum, verified Pons/V4 USD, holder logic, Telegram thresholds and 42-request ceiling remain unchanged
 * - Preserves full V223/V222 behavior and KV history
 *
 * CURRENT BUILD: V223
 * - NEW: verified launch age from persisted positive-identification launch timestamps
 * - NEW: scanner age is tracked separately from verified launch age
 * - NEW: Telegram shows verified launch age and scanner age
 * - SAFETY: scanner first-seen time is never substituted for launch time
 * - SAFETY: missing/invalid launch timestamps remain UNVERIFIED
 * - Adds zero external requests and does not alter Momentum, verified Pons/V4 USD, holder logic, Telegram thresholds or the 42-request ceiling
 * - Preserves full V222 launchpad expansion and all prior protections
 *
 * CURRENT BUILD: V222
 * - V222 expands the existing shared Bitquery zero-address 1B mint discovery to four additional documented Robinhood launchpads
 * - NEW: hood.fun current factory 0x5fcc1df0dc020cf454e742e9a8ae2554c37a452c
 * - NEW: Klik Finance 0x16cf6788b762ee8969744586ed16fc5705140dd7
 * - NEW: Bankr Bot 0xeb7c034704ef8dcd2d32324c1545f62fb4ad0862
 * - NEW: Ape.store 0x6e4910ea5a04376032f6564da9a9e4e88b7a87c1
 * - All V222 additions require exact Transaction.To + zero-address sender + decimal-normalized 1B launch mint
 * - Verified V222 launches enter watch/live/new-token priority in the same scan; no pool, DEX, quote or graduation model is guessed
 * - Shared transfer row cap raised from 10 to 50 to reduce cross-launchpad crowd-out as documented launch coverage expands
 * - Adds zero external requests; preserves Momentum, verified Pons/V4 USD, holder logic, Telegram thresholds and 42-request ceiling
 * - Clanker and Virtuals intentionally remain excluded from V222 because their documented mint-supply rules differ
 * - FIX: returns current-run LaunchHood V220 discovery fields from the shared Bitquery discovery result
 * - FIX: verified LaunchHood launches now reach the existing same-scan liveTokens/newTokens priority handoff
 * - FIX: /scan current-run LaunchHood telemetry no longer shows zero/empty solely because result fields were omitted
 * - Preserves the persisted launchHoodDiscoveryV220 KV schema and all V220 verification semantics
 * - Adds zero external requests; preserves scoring, Telegram thresholds, provider protections and 42-request ceiling
 * - FIX: removed discovery-result variables accidentally inserted into readState() migration scope
 * - FIX: KV migration now reads only persisted LaunchHood state and cannot fail on function-local discovery variables
 * - V220 adds verified LaunchHood launch discovery using Bitquery's documented zero-address 1B mint pattern
 * - Exact LaunchHood factory Transaction.To verification: 0x62b33a039d289cbda50ebeb72fe4261449e61bcf
 * - Shares the existing Bags/Flap launch-transfer GraphQL request, adding zero external requests versus V219
 * - LaunchHood tokens enter the watch/new-token pipeline immediately, but no Uniswap pool/version is guessed
 * - Preserves V219 momentum/confirmation, V217 Pons targeting, verified Pons/V4 USD, Telegram protection and 42-request ceiling
 * - V219 integrates verified Pons curve evidence into confirmation/confidence without double-counting Opportunity
 * - Opportunity keeps using Momentum only; no separate Pons opportunity bonus is added
 * - Adds conservative Pons confirmation based on verified trades + unique traders + real USD flow
 * - Weak verified Momentum no longer receives the same Confidence bonus as meaningful Momentum
 * - Verified Pons directional USD can satisfy evidence-quality confirmation even when the flow is bearish
 * - Adds zero requests and leaves V218 Momentum, V217 targeting, Pons USD and V4 verified USD calculations unchanged
 * - V218 integrates verified Pons V2 curve evidence into Momentum scoring conservatively
 * - Uses one canonical Pons window only (15m preferred, then 5m, then 1h) to avoid double-counting the same trades
 * - Rewards breadth (unique traders), activity, meaningful verified USD buy pressure and positive net flow
 * - Tiny samples / tiny USD flow are deliberately capped; trade count or volume alone cannot create strong momentum
 * - Pons evidence can produce an EARLY score before a historical snapshot exists, but cannot create GOOD/STRONG momentum by itself
 * - Preserves V217 targeting, V216 verified Pons USD, frozen V4 verified USD, Telegram protection and 42-request ceiling
 * - FIX: top-level Pons targeting telemetry now reads the function result instead of referencing a function-local variable
 * - V217 targets the existing Pons Trading query to the newest verified Pons token addresses already persisted in KV
 * - Prevents older/high-activity Pons tokens from dominating the bounded 100-row trade result
 * - Uses Pair.Token.Address in [...] and keeps newest trades first
 * - Newly discovered Pons tokens become targetable on the next scan without adding a second request
 * - Adds zero external requests and preserves V216 verified Pons USD, frozen V4 verified USD, Telegram protection and 42-request ceiling
 * - V216 adds verified Pons V2 bonding-curve trade tracking through Bitquery Trading
 * - Uses Protocol pons_v2 / ProtocolFamily Pons and exact known Pons token addresses only
 * - Uses AmountsInUsd.Quote as verified USD trade value; zero/missing USD rows are not promoted as verified
 * - Tracks BUY/SELL USD, net flow, USD buy pressure, trade count and unique traders in 5m/15m/1h/6h/24h windows
 * - Shares the existing Bags/Flap/Pons Bitquery HTTP request, adding zero external requests versus V215
 * - Does not alter the frozen Uniswap V4 verified-dollar calculation or force Pons curve trades through V4
 * - V215 adds verified Pons V2 TokenLaunched discovery using Bitquery's decoded factory event
 * - Shares the existing Bags/Flap Bitquery GraphQL HTTP request, so no extra external request is added
 * - Captures token, bonding-curve, deployer, pair token, launch config and graduation threshold
 * - Pons bonding-curve activity stays separate from Uniswap V4 until graduation is positively identified
 * - Preserves V214 Flap, V210 Bags, pools.trade, V213 Telegram diagnostics, verified USD, KV and 42-request ceiling
 * - V214 expands the existing single Bitquery launch-mint request to discover verified Flap.sh launches alongside Bags.fm
 * - Uses Bitquery's documented Robinhood Flap.sh router mint pattern: zero-address mint, normalized 1B supply, Transaction.To router
 * - Flap.sh tokens are source-labelled separately and are NOT passed into Uniswap V4 bonding-curve trade decoding
 * - Adds zero external requests versus V213 by sharing the existing Bags Bitquery request
 * - Preserves verified BUY/SELL USD, V213 Telegram observability, pools.trade, KV state, Telegram protection and 42-request ceiling
 * - V213 adds zero-request Telegram verified-USD observability
 * - Per candidate exposes exact token match, verified PoolIds, verified record counts by window, and render eligibility
 * - Adds explicit reason when Telegram verified-dollar section is not included
 * - Does not change V212 Telegram wiring or the frozen verified BUY/SELL USD calculation
 * - Preserves V211 launch priority, V210 Bags discovery, KV state, Telegram protection and 42-request ceiling
 * - V212 wires each candidate's existing verified on-chain V4 USD ledger into Telegram
 * - Adds VERIFIED OBSERVED on-chain BUY/SELL USD so partial scanner coverage is never misrepresented as a full market window
 * - Candidate matching is exact by token address; records retain their already-verified PoolId identity
 * - Adds zero external requests and does not alter the frozen V179/V187/V192 USD calculation
 * - Preserves V211 launch priority, V210 Bags discovery, KV state, Telegram protection and the 42-request ceiling
 * - V211 gives newly verified pools.trade launch tokens immediate same-scan analysis priority
 * - Newly verified launch PoolIds are carried directly into the live token priority set
 * - Preserves V210 Bags discovery and the frozen verified BUY/SELL USD pipeline
 * - Preserves KV history, Telegram protection and the 42-request hard ceiling
 * - V210 adds verified Bags.fm token discovery via Bitquery's documented factory mint-transfer pattern
 * - Bags tokens are source-labelled separately; bonding-curve trades are NOT passed into the Uniswap V4 decoder
 * - Uses the existing BITQUERY_ACCESS_TOKEN and existing request-budget protections
 * - Preserves V209 pools.trade discovery, verified BUY/SELL USD path, KV history, Telegram protection and 42-request ceiling
 * - V209 persists cumulative verified pools.trade launch telemetry in the existing KV state
 * - Live and backlog launch detection now surface independently in /scan
 * - Recent verified launches are retained (bounded to 25) without extra RPC/API requests
 * - Preserves V208 verified ABI decode, pool registration, watch insertion, BUY/SELL USD path and 42-request ceiling
 * - V208 decodes verified pools.trade TokenCreated and TokenLaunched events from existing discovery logs
 * - TokenLaunched validates PoolId + token + five-word PoolKey before registry/watchlist insertion
 * - Verified launch candidates now feed the existing analysis pipeline with zero extra requests
 * - /scan now exposes poolsTradeLaunchEventsV208 telemetry
 * - V207 expands the EXISTING generic discovery eth_getLogs address filter to PoolManager + verified pools.trade emitters
 * - No additional RPC call is added; request ceiling remains 42
 * - Targeted PoolManager Initialize resolvers remain PoolManager-only
 * - V205 launch-event recognizer can now actually receive verified pools.trade emitter logs
 * - V205 wires zero-request pools.trade launch-event recognition into existing discovery batches
 * - Only events from the verified V204 entry/factory/launchpad registry are accepted
 * - V205 does NOT guess token-address ABI positions; observed launch logs are surfaced for verification first
 * - Adds no external requests and preserves the 42-request ceiling
 * - V196 verified USD, V200 native normalization, scoring, Telegram, KV and existing decoder are unchanged
 * - V204 adds verified pools.trade launch infrastructure as a positive-identification registry
 * - Tracks both active entry contracts and all four verified TokenLaunched emitters
 * - PoolManager activity alone is explicitly NOT treated as pools.trade proof
 * - This checkpoint does not yet alter scoring, decoding, Telegram, KV or request budgets
 * - Preserves V196 verified USD path and all V203 safety gates
 * - V203 preserves the strict candidate/quote gate after V202 proved BOTH_SIDES_NONQUOTE dominates failures
 * - Adds explicit safety telemetry: token-to-token/non-meme V4 pools remain unresolved rather than guessed
 * - Does NOT add arbitrary ERC-20s or Robinhood Stock Tokens to knownQuote()
 * - Preserves V200 native-ETH normalization, V196 verified USD pricing, scoring, Telegram, KV and request budgets
 * - V202 captures up to 20 exact CANDIDATE_QUOTE_IDENTITY_UNRESOLVED identity failures
 * - Records PoolId, both currencies, native/known-quote status and failure classification
 * - Adds zero external requests and does not alter decoder behavior
 * - Preserves V200 Bitquery native-ETH normalization and V196 verified USD pricing
 * - Preserves request hard limit, Telegram protection, scoring, KV state and discovery logic
 * - V200 normalizes Bitquery DEXPoolEvents native currency "0x" to canonical V4 ZERO
 * - Normalization is restricted to the Bitquery PoolId-first identity boundary
 * - Existing strict identity validation, registry persistence/replay, request budgets and V196 verified USD path are unchanged
 * - V192 adds strict native-ETH quote valuation without changing V191 resolution/replay
 * - Robinhood Chain native ETH (ZERO currency in Uniswap V4) is treated as 18-decimal ETH
 * - Native ETH uses the same canonical WETH/USDG on-chain reference via 1:1 ETH/WETH wrapping denomination
 * - No off-chain ETH price, symbol inference or guessed conversion is accepted
 * - Without the same-batch canonical WETH/USDG reference, native-ETH trades remain USD UNVERIFIED
 * - No extra external requests; V191 Bitquery live-pool priority remains unchanged
 * - V191 fixes the V190 live-test integration gap
 * - V190 already replayed live logs after resolution; the real issue was resolver target selection
 * - Bitquery now prioritises UNKNOWN PoolIds present in the CURRENT live batch
 * - The strongest current-live unknown pool gets the single Bitquery slot before stale tracker pools
 * - Existing V179 same-scan reprocessing then immediately reuses the newly registered mapping
 * - No extra external requests; Bitquery remains max 1 lookup per scan
 * - V190 Bitquery resolver, KV persistence, USD maths, scoring and Telegram thresholds remain unchanged
 * - V190 integrates the proven Bitquery Robinhood realtime Initialize resolver
 * - Exact unknown PoolId is matched as an indexed Initialize topic
 * - Decoded currency0/currency1 are persisted into the existing canonical poolRegistry
 * - Successful mappings are immediately available to the existing directional USD decoder
 * - Uses BITQUERY_ACCESS_TOKEN secret; never guesses pool identity
 * - One Bitquery lookup consumes one existing resolver/discovery request slot
 * - Existing RPC blockHash, Blockscout and range crawlers remain fallback-only
 * - No Telegram thresholds, scoring rules, USD maths, KV binding/key or 42-request ceiling changed
 * - V189 is the controlled checkpoint build for UNKNOWN_POOL_IDENTITY
 * - Reserves the first 2 unknown-pool resolver requests exclusively for the RPC blockHash Initialize test
 * - The old range crawler and Blockscout wide resolver cannot consume those two requests first
 * - Emits explicit checkpoint telemetry even when the blockHash test cannot run: ATTEMPTED / RESOLVED / EMPTY / ERROR / BUDGET_BLOCKED
 * - No new scoring, Telegram, USD maths or market-data behavior is introduced
 * - V187 WETH/USDG valuation and all earlier protections remain unchanged
 * - V188 adds an RPC blockHash exact-Initialize resolver for unknown V4 pools
 * - Uses eth_getLogs blockHash filtering on the pool's first observed active block, avoiding provider multi-block range limits entirely
 * - Filters by PoolManager + Initialize topic + exact indexed PoolId; no pool identity guessing
 * - Tries the firstActiveBlock hash before the existing backward range crawler because launch activity commonly begins in the initialization block
 * - Uses existing discovery-live resolver budget only; no request ceilings are increased
 * - Successful resolution is registered immediately and can feed the existing directional/WETH/USDG pipeline
 * - Existing V184 Blockscout wide lookup remains fallback-only, and V187 valuation logic is unchanged
 * - V187 adds zero-extra-request on-chain WETH -> USDG valuation from canonical WETH/USDG V4 Swap logs already present in the live discovery batch
 * - Canonical Robinhood Chain WETH and USDG addresses are used; no symbol guessing and no off-chain price is promoted to verified
 * - WETH/USDG reference price is derived from signed PoolManager amount0/amount1 deltas, using USDG 6 decimals and WETH 18 decimals
 * - The median of valid same-batch WETH/USDG swap prices is used to reduce single-swap distortion
 * - Successfully decoded meme/WETH swaps can now receive an exact USDG-derived USD amount when a same-batch canonical WETH/USDG reference exists
 * - If no canonical WETH/USDG reference swap exists in the batch, WETH-quoted trades remain UNVERIFIED rather than inventing a dollar value
 * - Adds zero external requests and preserves V186 self-heal, V185 retention, V184 fallback resolver, V183 backoff, V182 budget protection and all Telegram/request ceilings
 * - V186 strengthens pool identity locally before spending any external resolver requests
 * - Rebuilds missing poolRegistry entries from canonical pool objects already persisted inside watchedTokens[].pools
 * - Removes time-based pool-registry expiry; the registry is now LRU/cap controlled at the existing 2,500 mappings so valid identities are not forgotten merely because 30 days passed
 * - Known Swap/ModifyLiquidity activity still refreshes lastSeenAt from V185
 * - Recovered local mappings immediately clear matching unknown-pool tracker entries
 * - Local self-heal runs before prune/scan so recovered identities can decode the same run's live swaps
 * - Adds zero external requests and preserves V184 fallback resolver, V183 backoff, V182 budget protection, V181 block handoff, Telegram thresholds and USD verification rules
 * - V185 fixes a local pool-registry expiry weakness found while investigating UNKNOWN_POOL_IDENTITY
 * - Existing pool mappings were retained for only 48 hours from lastSeenAt; active Swap/ModifyLiquidity logs did not refresh that timestamp
 * - V185 refreshes a known pool mapping whenever the normal live/backlog scan sees Swap or ModifyLiquidity activity for that pool
 * - Extends inactive pool-registry retention from 48 hours to 30 days, still capped at the existing 2,500 mappings
 * - Initialize events already collected by live/backlog discovery continue to register canonically with zero extra requests
 * - Adds telemetry for same-run pool-registry activity refreshes and Initialize-based unknown-tracker recovery
 * - No external requests are added; V184 Blockscout resolver remains fallback-only and all request ceilings/Telegram/USD verification rules stay unchanged
 * - V184 attacks the current UNKNOWN_POOL_IDENTITY bottleneck directly
 * - Adds one budgeted wide exact-pool Blockscout Initialize lookup per scan for the highest-priority unresolved V4 pool
 * - Exact topic0+topic1 filtering lets the resolver search far behind first activity without walking backward 10 Alchemy blocks at a time
 * - Wide lookup is capped, counted inside the existing unknown-pool resolver budget, and falls back to the existing RPC resolver
 * - Adds persistent 429 cooldown/backoff for the wide Initialize route so it cannot hammer Blockscout
 * - Successful Initialize identity is decoded with the existing canonical decoder, persisted in poolRegistry, and immediately re-used by same-run directional decoding
 * - No pool identity is guessed; no request ceilings, scoring, Telegram thresholds, V181/V182/V183 protections, or USD verification rules are weakened
 * - V183 adds persistent 429 cooldown/backoff specifically for the Blockscout exact-pool USDG directional-history route
 * - Known Blockscout directional 429 cooldowns are checked BEFORE consuming the protected V182 request
 * - A 429 now backs off 5m -> 10m -> 20m -> 30m max; a successful response clears the streak/cooldown
 * - If the directional route is cooling down, the V182 reserved request is released for normal analysis instead of being wasted
 * - Preserves V182 protected-request ordering, V181 latestNumber/toBlock fix, 42-request hard ceiling, 21-request analysis ceiling, Telegram thresholds and all existing verified-window rules
 * - V182 reserves one protected pre-Telegram analysis request for Blockscout V4 USDG directional verification
 * - Prevents ordinary analysis from consuming the final request needed by BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180
 * - Reservation is released automatically when the protected request is consumed
 * - Preserves the V181 latestNumber/toBlock handoff fix
 * - No change to the 42-request hard ceiling, 21-request analysis ceiling, notification reserve, scoring, Telegram thresholds, V4 decoding, or 5m/15m/1h/6h/24h windows
 * - V181 fixes the V180 Blockscout directional-USD upper-block handoff bug
 * - V180 accidentally passed the latestBlock function object into the historical USDG reader instead of the already-confirmed numeric latestNumber
 * - V181 now passes latestNumber directly and adds explicit block-range input telemetry so this cannot silently regress
 * - No scoring, Telegram thresholds, request ceilings, V4 decoding, 15m/6h windows, or existing protections are changed
 * - V180 adds exact-pool Blockscout history for verified Uniswap V4 USDG pools so directional USD can be reconstructed from timestamped on-chain Swap logs
 * - V180 uses canonical USDG's 6-decimal quote amount and its official 1:1 USD redemption denomination as the USD basis; no WETH/unknown-quote USD value is inferred
 * - V180 only marks a rolling window VERIFIED when the queried pool history is complete (response below the 1,000-log API ceiling) and every included trade decodes cleanly
 * - V180 adds decoder rejection telemetry proving whether failures are UNKNOWN_POOL_IDENTITY vs ABI/direction failures instead of guessing
 * - V180 preserves V179 live zero-extra-request ledger, V178 queue ordering, V177 15m/6h windows, Telegram thresholds, and the 42-request hard ceiling
 * - V179 adds a zero-extra-provider-request on-chain Uniswap V4 directional-swap ledger from the existing live eth_getLogs batch
 * - V179 decodes signed amount0/amount1 directly from the canonical PoolManager Swap event and classifies candidate BUY/SELL from verified pool currency0/currency1 identity
 * - V179 records exact raw candidate/quote deltas, tx/log identity and block number, deduplicated in KV; no USD value is invented
 * - V179 recognises canonical Robinhood Chain USDG quote amounts separately (6 decimals) as verified USDG-denominated value, but does NOT silently promote USDG to exact USD
 * - V179 is the on-chain foundation for the next step: timestamped rolling 5m/15m/1h/6h/24h USD verification
 * - V178 fixes analysis-queue priority ordering so persistent V176 directional-USD retries cannot jump ahead of protected carried/fresh candidate completion
 * - V178 keeps carried retry completion first when V159/V166 handoff rules require it, then the current fresh-market target, then the unresolved directional-USD target
 * - V178 preserves V177 verified 15m/6h windows, V176 persistence, the 42-request hard ceiling, provider cooldowns, Telegram reserve and all qualification thresholds
 * - V177 adds verified 15m and 6h buy/sell windows from the existing GeckoTerminal directional-trade feed and rolling ledger
 * - V177 adds 15m/6h verified buy USD, sell USD, net flow and USD buy pressure with no extrapolation
 * - V177 makes no extra provider request per window; all five windows reuse the same trade batch / persistent ledger
 * - V177 keeps incomplete coverage UNVERIFIED and preserves V176 request limits, cooldowns, Telegram reserve and thresholds
 * - V176 persists unresolved high-value directional-USD targets across scans
 * - V176 puts that target at the front of the next analysis queue while still watched
 * - V176 clears the target as soon as verified directional USD is obtained
 * - V176 never fabricates USD flow and never bypasses GeckoTerminal cooldown/429 protection
 * - V176 adds no provider and keeps the 42-request hard ceiling, phase limits, Telegram reserve and thresholds unchanged
 * - Preserves V175 early directional enrichment and all V174/V173 protections
 *
 * V175
 * - V175 prioritises verified directional USD trade enrichment before lower-priority analysis can exhaust the analysis budget
 * - V175 attempts the existing GeckoTerminal pool-trades feed immediately for strong viable candidates (opportunity >= 60, confidence >= 55, verified market/pool identity)
 * - V175 recomputes momentum/opportunity/confidence after verified USD flow is obtained, before Telegram qualification and snapshot persistence
 * - V175 never fabricates buy/sell USD; incomplete/limited coverage remains UNVERIFIED
 * - V175 adds no new provider and preserves the existing one-Gecko-fresh-request-per-scan guard, 42-request hard ceiling, Telegram reserve and thresholds
 * - V174 protects Telegram delivery capacity against global-budget exhaustion
 * - V174 counts each Telegram network request separately (photo and text fallback)
 * - V174 releases unused notification reserve only after Telegram processing
 * - V174 allows post-analysis backlog reclaim to use only genuinely released headroom
 * - Preserves V173 verified stale-cache priority release and all prior safety logic
 * - Hard global limit remains 42; phase limits and Telegram qualification thresholds unchanged
 *
 * V169:
 * - FIX: Telegram freshness telemetry now distinguishes FRESH / STALE_CACHE / UNVERIFIED
 * - FIX: missing or currently unavailable market evidence is no longer mislabeled as stale
 * - FIX: missing or currently unavailable holder evidence is no longer mislabeled as stale
 * - FIX: stale alert reasons are emitted only for genuinely verified cached evidence beyond its allowed alert age
 * - Preserves V168 alert-safety behavior, scoring, Telegram thresholds, request budgets and provider cadence
 * - Adds no external requests
 *
 * V168:
 * - NEW: Telegram-only core evidence freshness protection
 * - NEW: verified market/holder caches remain usable for tracking/scoring but cannot silently age into an alert
 * - NEW: normal alerts require fresh core market + holder evidence (10-minute alert freshness window)
 * - NEW: holder evidence up to the existing 20-minute normal holder-cache TTL may still qualify only with strong current confirmation
 * - Strong current confirmation requires verified 5m directional USD evidence OR live V4 swap acceleration with positive momentum
 * - Preserves all existing scoring thresholds, request budgets, provider spacing and cache reuse
 * - No Telegram-threshold or external request-rate increase
 *
 * V167:
 * - FIX: V166 partial-holder fresh-slot telemetry now reports authoritative post-selection retry/analysis preservation state
 * - FIX: normal V139 handoff preservation is reflected separately from the V166-specific bypass branch
 * - No selection, request-rate, scoring or Telegram-threshold changes
 *
 * V166:
 * - NEW: active V149 partial-holder retries can release the scarce fresh-market slot
 * - NEW: a better viable challenger may take that slot without the normal V139 +20 lead
 * - NEW: carried partial-holder retry state/history remains preserved and analysed
 * - SAFETY: ordinary V139 fairness remains unchanged for candidates without an active V149 blocker
 * - No Telegram-threshold, request-budget or normal external request-rate increase
 *
 * V165:
 * - NEW: same-run terminal replacement candidates inherit protected residual analysis budget
 * - NEW: bounded replacement analysis may proceed when conservative estimated cost exceeds residual budget
 * - NEW: actual per-request budget checks remain authoritative; the 42-request hard ceiling is unchanged
 * - NEW: terminal handoff chains can protect the next viable replacement in the same run
 * - Preserves V164 holder-provider telemetry correction and V162/V163 holder-integrity safety
 * - No Telegram-threshold or normal external request-rate increase
 *
 * V164:
 * - FIX: same-run Blockscout outage-deferred candidates retain true PRO configuration telemetry
 * - FIX: deferred holder paths explicitly report PRO not attempted due run circuit breaker
 * - Preserves V163 holder-reconciliation hotfix and V162 quarantine semantics
 * - No scoring, Telegram-threshold, request-budget or external-rate changes
 *
 * V163:
 * - HOTFIX: holderIntegrityReconciliationV162 now calls validateHolderIntegrity directly
 * - HOTFIX: real holder-analysis path now executes V162 reconciliation helper
 * - Preserves V162 structural-invalid quarantine and exact safety semantics
 * - No scoring, Telegram-threshold, request-budget or external-rate changes
 *
 * V162:
 * - Strict holder-integrity reconciliation telemetry
 * - Same-address duplicate holder rows can be reconciled deterministically
 * - TOP_HOLDERS_EXCEED_TOTAL_SUPPLY remains UNVERIFIED unless math reconciles
 * - Known infrastructure is diagnostic only and never subtracted to force validity
 * - 5-minute structural-invalid holder quarantine reduces repeated API waste
 * - No guessed/rescaled balances and no extra normal external request rate
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

 *
 * V155 HOTFIX:
 * - Preserves V154/V153 functionality
 * - Fixes V154 runtime ReferenceError: candidates is not defined
 * - V153 top-level pool-identity telemetry had been inserted inside
 *   momentumAnalysis(), where the scan-level candidates array is unavailable
 * - Moves that telemetry to the scan response where candidates is in scope
 * - Restores momentumAnalysis() to candidate-local telemetry only
 * - No request-rate, scoring, verification or Telegram-threshold changes

 *
 * V156:
 * - Preserves all V155/V153 directional USD pool-identity logic
 * - Adds bounded eth_getLogs abort/timeout recovery to live and backlog scans
 * - Recovery tries an available alternate provider once; if none is usable,
 *   it retries the same provider once for that exact range
 * - Recovery occurs only after a real abort/timeout, so normal request rate
 *   is unchanged; all recovery requests still consume the existing budget
 * - Failed backlog ranges never advance the backlog cursor
 * - Adds explicit V156 recovery telemetry
 * - No scoring, alert threshold, Gecko spacing or market-verification changes

 *
 * V157:
 * - Preserves V156 RPC abort recovery and V153 on-chain pool identity
 * - NEW: DexScreener/GeckoTerminal recovery staggering after HTTP 429
 * - A fresh Dex 429 no longer immediately burns the Gecko recovery request
 * - Provider recovery state is persisted in the existing KV state
 * - Only one provider that is recovering from a 429 is allowed a probe per scan
 * - A short cross-provider stagger prevents both services being re-hit together
 * - Any non-429 provider response clears that provider's recovery-pending state
 * - Existing cooldowns, 5m fresh spacing and one-Gecko-fresh-per-scan remain
 * - No increase to normal request rate and no Telegram/scoring threshold changes

 *
 * V158:
 * - Preserves all V157 market-provider recovery staggering
 * - NEW: evidence-quality protection derived from the BOD false-positive case
 * - Weak/unverified momentum + no verified directional USD + no verified holder
 *   counters can no longer produce an unjustified HIGH confidence score
 * - If that evidence stack also relies on stale holder-cache concentration,
 *   opportunity is capped below the existing Telegram alert threshold
 * - Scores are recalculated after successful directional enrichment, so genuine
 *   verified USD flow can remove the cap automatically
 * - Existing Telegram thresholds remain exactly 60 / 59 / $1000 / 55
 * - No new external requests and no request-rate changes

 *
 * V159:
 * - Preserves full V158 evidence-quality protection and all prior safety gates
 * - NEW: a carried priority candidate with a fresh usable VERIFIED market cache
 *   no longer monopolizes the scarce fresh-market request slot
 * - NEW: only the fresh-market reservation is handed to the next highest-ranked
 *   viable candidate that still needs market verification
 * - The carried retry candidate remains first in analysis and retains priority
 *   holder/risk completion so unresolved evidence continues to be worked
 * - V139 fairness, V141/V148 handoffs and V150 terminal guards remain intact
 * - Dex fresh spacing remains 5 minutes; Gecko remains max one fresh per scan
 * - Existing Telegram thresholds remain exactly 60 / 59 / $1000 / 55
 * - No increase to normal external request rate
 *
 * V160:
 * - Preserves full V159 fresh-market slot handoff and all prior protections
 * - FIX: Blockscout PRO HTTP 500 is now treated as a transient server outage
 * - HTTP 500 joins 502/503/504 in the existing persistent 10-minute PRO cooldown
 * - Public Blockscout remains primary; missing holder evidence is never promoted
 * - A verified PRO success still clears/de-escalates the outage state normally
 * - Existing KV binding/key, request budgets and Telegram thresholds are unchanged
*/
const VERSION = "V237";

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

const HOLDER_INTEGRITY_RETRY_MS_V162 =
  5 * 60 * 1000;

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const BITQUERY_GRAPHQL_V2 =
  "https://streaming.bitquery.io/graphql";

const BITQUERY_HOLDER_EVIDENCE_MAX_AGE_MS_V227 =
  10 * 60 * 1000;

const BITQUERY_HOLDER_ROW_LIMIT_V227 =
  25;

const BITQUERY_HOLDER_TARGET_MAX_AGE_MS_V228 =
  6 * 60 * 60 * 1000;

/* V233: Bitquery Trading.Tokens evidence is partial until pool liquidity is independently verified. */
const BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233 =
  10 * 60 * 1000;

/* V234: freshness bound for exact-token rank-1 Trading.Pairs evidence. */
const BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234 =
  10 * 60 * 1000;

/* V235: separate market-evidence target may wait for the next shared Bitquery request. */
const BITQUERY_MARKET_TARGET_MAX_AGE_MS_V235 =
  6 * 60 * 60 * 1000;

/* V237: exact-PoolId realtime Bitquery liquidity evidence; shares existing Bitquery HTTP request. */
const BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237 =
  10 * 60 * 1000;

const BITQUERY_LIQUIDITY_TARGET_MAX_AGE_MS_V237 =
  6 * 60 * 60 * 1000;

/* =========================================================
   V210 VERIFIED BAGS.FM DISCOVERY
   ========================================================= */

const BAGS_FACTORY_V210 =
  "0xe8cc4431adf8b5a847c113ef0c6af9043219cb37";

const BAGS_PROTOCOL_FAMILY_V210 =
  "Bags";

const BAGS_PROTOCOL_V210 =
  "bags_v2";


const FLAP_ROUTER_V214 =
  "0x26605f322f7ff986f381bb9a6e3f5dab0beaeb09";

const FLAP_PROTOCOL_FAMILY_V214 =
  "Flap.sh";

const FLAP_PROTOCOL_V214 =
  "flap_sh";


const LAUNCHHOOD_FACTORY_V220 =
  "0x62b33a039d289cbda50ebeb72fe4261449e61bcf";

const LAUNCHHOOD_PROTOCOL_V220 =
  "LaunchHood";

/* =========================================================
   V222 VERIFIED FIXED-1B LAUNCHPAD DISCOVERY
   ========================================================= */

const HOOD_FUN_FACTORY_V222 =
  "0x5fcc1df0dc020cf454e742e9a8ae2554c37a452c";

const KLIK_FINANCE_FACTORY_V222 =
  "0x16cf6788b762ee8969744586ed16fc5705140dd7";

const BANKR_BOT_FACTORY_V222 =
  "0xeb7c034704ef8dcd2d32324c1545f62fb4ad0862";

const APE_STORE_FACTORY_V222 =
  "0x6e4910ea5a04376032f6564da9a9e4e88b7a87c1";

const FIXED_1B_LAUNCHPADS_V222 = {
  [HOOD_FUN_FACTORY_V222]: {
    protocol: "hood.fun",
    source: "BITQUERY_HOOD_FUN_FACTORY_MINT_V222"
  },
  [KLIK_FINANCE_FACTORY_V222]: {
    protocol: "Klik Finance",
    source: "BITQUERY_KLIK_FINANCE_FACTORY_MINT_V222"
  },
  [BANKR_BOT_FACTORY_V222]: {
    protocol: "Bankr Bot",
    source: "BITQUERY_BANKR_BOT_FACTORY_MINT_V222"
  },
  [APE_STORE_FACTORY_V222]: {
    protocol: "Ape.store",
    source: "BITQUERY_APE_STORE_FACTORY_MINT_V222"
  }
};

/* =========================================================
   V224 VERIFIED CLANKER + VIRTUALS DISCOVERY
   ========================================================= */
const CLANKER_FACTORY_V224 =
  "0xd3f2cc1731b7fd17f28798835c2e02f0a1839a94";
const CLANKER_MINT_AMOUNT_V224 =
  "100000000000";
const VIRTUALS_FACTORY_V224 =
  "0xd4ccbfa37e2f35611b3042e4096ad7a3459bd007";



const PONS_V2_FACTORY_V215 =
  "0x7ed598bcef8bd9edd8c97a195c6d13f40801ec7e";

const PONS_V2_ROUTER_V215 =
  "0xe33e9e479df8802cb0866d5d05258bec4cf62948";

const PONS_V2_MEME_HOOK_V215 =
  "0xe5e702641ea86f4ae6cc3cdaed2b886f976be044";

const PONS_V2_TOKEN_LAUNCHED_TOPIC_V215 =
  "0x8d4aad4953d0ca700d468f3753aa14432d1b35b43ec6409f051fb6aa43a89607";

const PONS_V2_POOL_GRADUATED_TOPIC_V215 =
  "0x0a44ef75df69c534f43cd6c1aa3ef8983065fe5fe79ef9e79f6494e6f258c259";

const PONS_PROTOCOL_V215 =
  "pons_v2";


const UNISWAP_V3_FACTORY_V195 =
  "0x1f7d7550b1b028f7571e69a784071f0205fd2efa";

const UNISWAP_TRADE_API_V196 =
  "https://trade-api.gateway.uniswap.org/v1/quote";

const UNISWAP_REFERENCE_SWAPPER_V196 =
  "0x0000000000000000000000000000000000000001";

const ONE_NATIVE_ETH_WEI_V196 =
  "1000000000000000000";

const V3_STANDARD_FEES_V195 = [
  100,
  500,
  3000,
  10000
];


const ZERO =
  "0x0000000000000000000000000000000000000000";

// V204: verified pools.trade launch infrastructure on Robinhood Chain.
// Source identity is intentionally explicit: the shared V4 PoolManager alone
// is NOT sufficient to classify a token as pools.trade.
const POOLS_TRADE_ENTRY_CONTRACTS_V204 = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const POOLS_TRADE_TOKEN_FACTORY_V204 =
  "0x000000e200088d55c39a11f609e5f667729ad49b";

const POOLS_TRADE_LAUNCHPADS_V204 = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const POOLS_TRADE_TOKEN_CREATED_TOPIC_V204 =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TRADE_TOKEN_LAUNCHED_TOPIC_V204 =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

function poolsTradeEmitterV205(address) {
  const a = normalize(address);
  return (
    POOLS_TRADE_ENTRY_CONTRACTS_V204.includes(a) ||
    POOLS_TRADE_LAUNCHPADS_V204.includes(a) ||
    a === POOLS_TRADE_TOKEN_FACTORY_V204
  );
}

function abiWordAddressV208(word) {
  const raw = String(word || "").replace(/^0x/i, "").toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(raw)) return null;
  const address = "0x" + raw.slice(24);
  return isAddress(address) ? normalize(address) : null;
}

function abiDataWordsV208(data) {
  const raw = String(data || "").replace(/^0x/i, "").toLowerCase();
  if (!raw || raw.length % 64 !== 0 || !/^[0-9a-f]+$/.test(raw)) return [];
  const words = [];
  for (let i = 0; i < raw.length; i += 64) words.push(raw.slice(i, i + 64));
  return words;
}

function signedInt24WordV208(word) {
  try {
    const raw = BigInt("0x" + String(word || ""));
    const v = Number(raw & 0xffffffn);
    return v >= 0x800000 ? v - 0x1000000 : v;
  } catch {
    return null;
  }
}

function decodePoolsTradeLaunchLogV208(log) {
  const emitter = normalize(log?.address);
  const topic0 = normalize(log?.topics?.[0]);
  const topics = Array.isArray(log?.topics) ? log.topics.map(normalize) : [];

  if (!poolsTradeEmitterV205(emitter)) return null;

  if (
    POOLS_TRADE_ENTRY_CONTRACTS_V204.includes(emitter) &&
    topic0 === POOLS_TRADE_TOKEN_CREATED_TOPIC_V204
  ) {
    /*
     * TokenCreated(address): accept the token only if it can be decoded
     * unambiguously from one ABI address word, whether the deployed ABI
     * places it in topic1 or data.
     */
    const candidates = [];
    if (topics[1]) {
      const a = abiWordAddressV208(topics[1]);
      if (a) candidates.push(a);
    }
    for (const word of abiDataWordsV208(log?.data)) {
      const a = abiWordAddressV208(word);
      if (a) candidates.push(a);
    }
    const unique = [...new Set(candidates)].filter(a => a !== ZERO);
    return {
      event: "TokenCreated",
      verifiedEmitter: true,
      token: unique.length === 1 ? unique[0] : null,
      decodeVerified: unique.length === 1,
      decodeReason: unique.length === 1
        ? "UNAMBIGUOUS_TOKEN_CREATED_ADDRESS"
        : "TOKEN_CREATED_ADDRESS_NOT_UNAMBIGUOUS",
      emitter,
      blockNumber: log?.blockNumber || null,
      transactionHash: normalize(log?.transactionHash) || null
    };
  }

  if (
    POOLS_TRADE_LAUNCHPADS_V204.includes(emitter) &&
    topic0 === POOLS_TRADE_TOKEN_LAUNCHED_TOPIC_V204
  ) {
    /*
     * Verified pools.trade ABI:
     * TokenLaunched(bytes32,address,address,(address,address,uint24,int24,address))
     * poolId/token/finalPositionRecipient are indexed; LogHeader.Data is the
     * five-word PoolKey: currency0,currency1,fee,tickSpacing,hooks.
     */
    const words = abiDataWordsV208(log?.data);
    const poolId = topics[1] && /^0x[0-9a-f]{64}$/.test(topics[1])
      ? topics[1]
      : null;
    const token = topics[2] ? abiWordAddressV208(topics[2]) : null;
    const finalPositionRecipient = topics[3]
      ? abiWordAddressV208(topics[3])
      : null;

    if (words.length !== 5) {
      return {
        event: "TokenLaunched",
        verifiedEmitter: true,
        decodeVerified: false,
        decodeReason: "POOLKEY_DATA_WORD_COUNT_NOT_5",
        poolId,
        token,
        emitter,
        dataWordCount: words.length,
        blockNumber: log?.blockNumber || null,
        transactionHash: normalize(log?.transactionHash) || null
      };
    }

    const currency0 = abiWordAddressV208(words[0]);
    const currency1 = abiWordAddressV208(words[1]);
    let fee = null;
    try { fee = Number(BigInt("0x" + words[2])); } catch {}
    const tickSpacing = signedInt24WordV208(words[3]);
    const hooks = abiWordAddressV208(words[4]);

    const tokenMatchesPoolKey =
      token && (token === currency0 || token === currency1);

    const valid =
      Boolean(
        poolId &&
        token &&
        currency0 &&
        currency1 &&
        Number.isInteger(fee) &&
        fee >= 0 &&
        fee <= 0xffffff &&
        Number.isInteger(tickSpacing) &&
        hooks &&
        tokenMatchesPoolKey
      );

    return {
      event: "TokenLaunched",
      verifiedEmitter: true,
      decodeVerified: valid,
      decodeReason: valid
        ? "VERIFIED_POOLS_TRADE_TOKEN_LAUNCHED_POOLKEY"
        : "TOKEN_LAUNCHED_VALIDATION_FAILED",
      poolId,
      token,
      finalPositionRecipient,
      currency0,
      currency1,
      fee,
      tickSpacing,
      hooks,
      tokenMatchesPoolKey,
      emitter,
      blockNumber: log?.blockNumber || null,
      transactionHash: normalize(log?.transactionHash) || null
    };
  }

  return null;
}

function recognizePoolsTradeLaunchLogsV205(logs) {
  return (logs || [])
    .map(decodePoolsTradeLaunchLogV208)
    .filter(Boolean);
}
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
   V179 CANONICAL QUOTE IDENTITIES
   ========================================================= */

/*
 * Robinhood Chain canonical contracts:
 * - USDG: 0x5fc5...d168 (6 decimals)
 * - WETH: 0x0bd7...ad73
 *
 * V179 uses USDG raw units only as verified USDG-denominated quote value.
 * It intentionally does NOT assert 1 USDG == 1 exact USD for alert verification.
 */
const CANONICAL_USDG_V179 =
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168";

const CANONICAL_WETH_V179 =
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73";

const CANONICAL_USDG_DECIMALS_V179 = 6;
const CANONICAL_WETH_DECIMALS_V187 = 18;
const NATIVE_ETH_DECIMALS_V192 = 18;

const ONCHAIN_DIRECTIONAL_MAX_RECORDS_V179 = 6000;
const ONCHAIN_DIRECTIONAL_MAX_TOKENS_V179 = 8;
const ONCHAIN_DIRECTIONAL_RETENTION_MS_V179 =
  26 * 60 * 60 * 1000;

const BLOCKSCOUT_LOGS_MAX_ROWS_V180 = 1000;

const BLOCKSCOUT_DIRECTIONAL_429_BASE_MS_V183 =
  5 * 60 * 1000;

const BLOCKSCOUT_DIRECTIONAL_429_MAX_MS_V183 =
  30 * 60 * 1000;

const BLOCKSCOUT_WIDE_INITIALIZE_LOOKBACK_BLOCKS_V184 =
  250000;

const BLOCKSCOUT_WIDE_INITIALIZE_BASE_BACKOFF_MS_V184 =
  10 * 60 * 1000;

const BLOCKSCOUT_WIDE_INITIALIZE_MAX_BACKOFF_MS_V184 =
  60 * 60 * 1000;
const V180_WINDOW_MS = Object.freeze({
  m5: 5 * 60 * 1000,
  m15: 15 * 60 * 1000,
  h1: 60 * 60 * 1000,
  h6: 6 * 60 * 60 * 1000,
  h12: 12 * 60 * 60 * 1000,
  h24: 24 * 60 * 60 * 1000
});

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

/*
 * V170:
 * After candidate analysis + Telegram have completed, reclaim only the
 * otherwise-unused discovery capacity. This never raises the 42-request
 * ceiling, never raises the 24-request discovery ceiling, and never borrows
 * from the 21-request analysis phase.
 */
const V170_POST_ANALYSIS_BACKLOG_RECLAIM_MAX_REQUESTS = 5;

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


/*
 * V173:
 * - Preserves V171 mature-zero-activity priority release and V170 residual backlog catch-up
 * - FIX: temporary market-provider unavailability can use the token's existing
 *   VERIFIED stale market cache for the V171 release decision
 * - SAFETY: fallback cache must be verified, must contain exact 24h volume and
 *   transaction evidence, and must be <= existing MARKET_STALE_CACHE_MS (30m)
 * - SAFETY: maturity is recomputed from the cached verified pairCreatedAt using
 *   the existing launchStage() definition; no age/stage is guessed
 * - SAFETY: unverified/negative/older caches never trigger priority release
 * - This only releases priority state; the token remains on the watchlist
 * - Existing V138 retry caps, V140 7-day relevance expiry, scoring, Telegram
 *   thresholds, request budgets, provider rates and KV history remain unchanged
 */

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

const MARKET_PROVIDER_CROSS_STAGGER_MS_V157 =
  2 * 60 * 1000;


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
  30 * 24 * 60 * 60 * 1000;

const MAX_POOL_REGISTRY = 2500;

/* V91: holder intelligence reuse / outage protection. */
const HOLDER_CACHE_MS =
  20 * 60 * 1000;

const HOLDER_STALE_CACHE_MS =
  2 * 60 * 60 * 1000;

/* V225: display-only verified holder-count recovery.
 * This cache never changes countersVerified, concentration, scoring or qualification.
 */
const HOLDER_COUNT_DISPLAY_CACHE_MS_V225 =
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

/*
 * V168 TELEGRAM CORE-EVIDENCE FRESHNESS
 *
 * These limits affect alert eligibility only. Existing market/holder caches
 * remain available to ranking, tracking, scoring and provider-outage fallbacks.
 * No provider request cadence is increased.
 */
const TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168 =
  10 * 60 * 1000;

const TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168 =
  10 * 60 * 1000;

const TELEGRAM_HOLDER_STRONG_CONFIRMATION_MAX_AGE_MS_V168 =
  HOLDER_CACHE_MS;

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

      postAnalysisBacklogReclaimV170:
        false,

      originalBacklogLimitV170:
        BACKLOG_DISCOVERY_REQUEST_LIMIT,

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
        ANALYSIS_REQUEST_LIMIT,

      blockscoutUsdGReserveV182: {
        enabled:
          true,

        active:
          true,

        reservedRequests:
          1,

        requestType:
          "BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180",

        consumed:
          false,

        consumedAt:
          null,

        releasedWithoutUse:
          false,

        releasedAt:
          null
      },

      priorityHolderEvidenceCompletionV226: {
        enabled: true,
        yields: 0,
        address: null,
        reason: null,
        yieldedAt: null,
        reserveWasBlocking: false
      }
    },

    notification: {
      used:
        0,

      limit:
        NOTIFICATION_REQUEST_LIMIT,

      globalReserveActiveV174:
        true,

      reserveReleasedAtV174:
        null
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
  /*
   * V174:
   * Before Telegram processing finishes, keep the still-unused notification
   * allowance inside the 42-request hard ceiling. This fixes the V173 case
   * where analysis could consume all 42 global requests while the separate
   * notification phase still reported 2 requests "remaining".
   */
  const notificationReserveRemainingV174 =
    (
      budget.notification
        ?.globalReserveActiveV174 ===
        true &&
      phase !==
        "notification"
    )
      ? Math.max(
          0,
          safeNumber(
            budget.notification
              ?.limit
          ) -
          safeNumber(
            budget.notification
              ?.used
          )
        )
      : 0;

  const effectiveGlobalLimitV174 =
    Math.max(
      0,
      budget.totalLimit -
        notificationReserveRemainingV174
    );

  if (
    budget.totalUsed +
      amount >
    effectiveGlobalLimitV174
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
    const postAnalysisReclaimV170 =
      budget.discovery
        .postAnalysisBacklogReclaimV170 ===
      true;

    const leavesProtectedReserve =
      postAnalysisReclaimV170
        ? budget.totalUsed +
            amount <=
          budget.totalLimit
        : budget.totalUsed +
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

function v182ReserveBlocksAnalysisRequestV226(
  budget,
  amount = 1
) {
  const reserve = budget?.analysis?.blockscoutUsdGReserveV182;
  if (reserve?.active !== true || safeNumber(reserve?.reservedRequests) <= 0) return false;
  const reserved = Math.max(0, safeNumber(reserve.reservedRequests));
  const notificationReserveRemaining =
    budget?.notification?.globalReserveActiveV174 === true
      ? Math.max(0, safeNumber(budget?.notification?.limit) - safeNumber(budget?.notification?.used))
      : 0;
  const preTelegramGlobalLimit = Math.max(0, safeNumber(budget?.totalLimit) - notificationReserveRemaining);
  const analysisBlocked = safeNumber(budget?.analysis?.used) + amount > Math.max(0, safeNumber(budget?.analysis?.limit) - reserved);
  const globalBlocked = safeNumber(budget?.totalUsed) + amount > Math.max(0, preTelegramGlobalLimit - reserved);
  return analysisBlocked || globalBlocked;
}

function yieldV182ReserveToPriorityHolderEvidenceV226(budget, token, reason) {
  const reserve = budget?.analysis?.blockscoutUsdGReserveV182;
  const wasBlocking = v182ReserveBlocksAnalysisRequestV226(budget, 1);
  if (reserve?.active !== true || !wasBlocking) return false;
  reserve.active = false;
  reserve.releasedWithoutUse = true;
  reserve.releasedAt = Date.now();
  reserve.releaseReasonV226 = reason || "PRIORITY_HOLDER_EVIDENCE_COMPLETION";
  reserve.yieldedToPriorityHolderEvidenceV226 = true;
  reserve.yieldedForAddressV226 = normalize(token) || null;
  reserve.wasBlockingAtYieldV226 = true;
  const t = budget.analysis.priorityHolderEvidenceCompletionV226 || (budget.analysis.priorityHolderEvidenceCompletionV226 = {enabled:true,yields:0,address:null,reason:null,yieldedAt:null,reserveWasBlocking:false});
  t.yields = safeNumber(t.yields) + 1;
  t.address = normalize(token) || null;
  t.reason = reserve.releaseReasonV226;
  t.yieldedAt = reserve.releasedAt;
  t.reserveWasBlocking = true;
  return true;
}

function consumeBudget(
  budget,
  phase,
  type,
  amount = 1
) {
  /*
   * V182:
   * Keep one analysis request and one slot inside the current pre-Telegram
   * global allowance available for the exact Blockscout V4 USDG history call.
   * This does NOT raise any request ceiling. It only changes ordering/priority.
   */
  const usdGReserveV182 =
    budget.analysis
      ?.blockscoutUsdGReserveV182;

  const protectedUsdGTypeV182 =
    "BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180";

  if (
    phase ===
      "analysis" &&
    usdGReserveV182
      ?.active ===
      true &&
    type !==
      protectedUsdGTypeV182
  ) {
    const reservedRequestsV182 =
      Math.max(
        0,
        safeNumber(
          usdGReserveV182
            .reservedRequests
        )
      );

    const notificationReserveRemainingV182 =
      (
        budget.notification
          ?.globalReserveActiveV174 ===
          true
      )
        ? Math.max(
            0,
            safeNumber(
              budget.notification
                ?.limit
            ) -
            safeNumber(
              budget.notification
                ?.used
            )
          )
        : 0;

    const preTelegramGlobalLimitV182 =
      Math.max(
        0,
        budget.totalLimit -
          notificationReserveRemainingV182
      );

    const analysisCapacityProtectedV182 =
      budget.analysis.used +
        amount <=
      Math.max(
        0,
        budget.analysis.limit -
          reservedRequestsV182
      );

    const globalCapacityProtectedV182 =
      budget.totalUsed +
        amount <=
      Math.max(
        0,
        preTelegramGlobalLimitV182 -
          reservedRequestsV182
      );

    if (
      !analysisCapacityProtectedV182 ||
      !globalCapacityProtectedV182
    ) {
      budget.skipped.push({
        phase,
        type,
        amount,
        reason:
          "V182_BLOCKSCOUT_USDG_REQUEST_RESERVED"
      });

      return false;
    }
  }

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
      "analysis" &&
    type ===
      "BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180" &&
    budget.analysis
      ?.blockscoutUsdGReserveV182
      ?.active ===
      true
  ) {
    budget.analysis
      .blockscoutUsdGReserveV182
      .active =
        false;

    budget.analysis
      .blockscoutUsdGReserveV182
      .consumed =
        true;

    budget.analysis
      .blockscoutUsdGReserveV182
      .consumedAt =
        Date.now();
  }

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

function releaseNotificationReserveV174(
  budget
) {
  const wasActive =
    budget.notification
      ?.globalReserveActiveV174 ===
    true;

  const unusedAtRelease =
    Math.max(
      0,
      safeNumber(
        budget.notification
          ?.limit
      ) -
      safeNumber(
        budget.notification
          ?.used
      )
    );

  if (
    budget.notification
  ) {
    budget.notification
      .globalReserveActiveV174 =
        false;

    budget.notification
      .reserveReleasedAtV174 =
        Date.now();
  }

  return {
    enabled:
      true,
    wasActive,
    unusedRequestsReleased:
      unusedAtRelease,
    notificationUsed:
      safeNumber(
        budget.notification
          ?.used
      ),
    notificationLimit:
      safeNumber(
        budget.notification
          ?.limit
      ),
    hardRequestLimit:
      budget.totalLimit,
    releasedAfterTelegram:
      true
  };
}

function activatePostAnalysisBacklogReclaimV170(
  budget
) {
  const discoveryRemaining =
    Math.max(
      0,
      budget.discovery.limit -
        budget.discovery.used
    );

  const reclaimCapacity =
    Math.min(
      V170_POST_ANALYSIS_BACKLOG_RECLAIM_MAX_REQUESTS,
      discoveryRemaining
    );

  const originalBacklogLimit =
    safeNumber(
      budget.discovery
        .originalBacklogLimitV170
    ) ||
    BACKLOG_DISCOVERY_REQUEST_LIMIT;

  budget.discovery
    .postAnalysisBacklogReclaimV170 =
      reclaimCapacity > 0;

  budget.discovery.backlogLimit =
    Math.min(
      budget.discovery.limit,
      Math.max(
        budget.discovery.backlogLimit,
        budget.discovery.backlogUsed +
          reclaimCapacity
      )
    );

  return {
    enabled:
      true,
    activated:
      reclaimCapacity > 0,
    reclaimCapacityRequests:
      reclaimCapacity,
    originalBacklogLimit,
    effectiveBacklogLimit:
      budget.discovery.backlogLimit,
    discoveryRemainingBeforeReclaim:
      discoveryRemaining,
    analysisUsed:
      budget.analysis.used,
    analysisLimit:
      budget.analysis.limit,
    notificationUsed:
      budget.notification.used,
    notificationLimit:
      budget.notification.limit,
    hardRequestLimit:
      budget.totalLimit,
    discoveryLimit:
      budget.discovery.limit,
    analysisLimitUnchanged:
      budget.analysis.limit ===
        ANALYSIS_REQUEST_LIMIT,
    hardRequestLimitUnchanged:
      budget.totalLimit ===
        MAX_EXTERNAL_REQUESTS
  };
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
          ),

        originalLimitV170:
          safeNumber(
            budget.discovery
              .originalBacklogLimitV170
          ) ||
          BACKLOG_DISCOVERY_REQUEST_LIMIT,

        postAnalysisReclaimActiveV170:
          budget.discovery
            .postAnalysisBacklogReclaimV170 ===
          true
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
        true,

      priorityHolderEvidenceCompletionV226:
        budget.analysis
          ?.priorityHolderEvidenceCompletionV226 ||
        {
          enabled: true,
          yields: 0,
          address: null,
          reason: null,
          yieldedAt: null,
          reserveWasBlocking: false
        },

      blockscoutUsdGReserveV182: {
        active:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.active === true,
        consumed:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.consumed === true,
        releasedWithoutUse:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.releasedWithoutUse === true,
        yieldedToPriorityHolderEvidenceV226:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.yieldedToPriorityHolderEvidenceV226 === true,
        yieldedForAddressV226:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.yieldedForAddressV226 || null,
        releaseReasonV226:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.releaseReasonV226 || null
      }
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
        true,

      globalReserveActiveV174:
        budget.notification
          .globalReserveActiveV174 ===
        true,

      globalReserveRemainingV174:
        budget.notification
          .globalReserveActiveV174 ===
        true
          ? Math.max(
              0,
              budget.notification.limit -
                budget.notification.used
            )
          : 0,

      reserveReleasedAtV174:
        budget.notification
          .reserveReleasedAtV174 ||
        null,

      exactNetworkRequestAccountingV174:
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

    bitqueryHolderEvidenceV227: {
      address: null,
      targetReason: null,
      attempted: false,
      verified: false,
      status: "NOT_TARGETED",
      fetchedAt: null,
      holderCount: null,
      rowCount: 0,
      rows: [],
      dataset: "realtime",
      externalRequestsAdded: 0
    },

    bitqueryHolderTargetV228: {
      address: null,
      reason: null,
      selectedAt: null,
      analysisPriority: null,
      symbol: null,
      sourceVersion: "V228",
      status: "NONE"
    },

    bitqueryMarketTargetV235: {
      address: null,
      reason: null,
      selectedAt: null,
      analysisPriority: null,
      symbol: null,
      sourceVersion: "V235",
      status: "NONE"
    },

    bitqueryLiquidityTargetV237: {
      address: null,
      poolId: null,
      quoteAddress: null,
      reason: null,
      selectedAt: null,
      analysisPriority: null,
      symbol: null,
      sourceVersion: "V237",
      status: "NONE"
    },

    bitqueryMarketEvidenceV233: {
      address: null,
      targetReason: null,
      attempted: false,
      verified: false,
      status: "NOT_TARGETED",
      fetchedAt: null,
      snapshotTime: null,
      snapshotAgeMs: null,
      priceUsd: null,
      marketCap: null,
      fdv: null,
      volume24hUsd: null,
      dataset: "trading_realtime",
      source: "BITQUERY_TRADING_TOKENS_V233",
      partialMarketOnly: true,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },

    bitqueryRankedPairEvidenceV234: {
      address: null,
      targetReason: null,
      attempted: false,
      verified: false,
      status: "NOT_TARGETED",
      fetchedAt: null,
      snapshotTime: null,
      snapshotAgeMs: null,
      priceUsd: null,
      marketCap: null,
      fdv: null,
      intervalVolumeUsd: null,
      marketAddress: null,
      marketProtocol: null,
      quoteTokenAddress: null,
      quoteTokenSymbol: null,
      rankingPosition: null,
      rankingWeight: null,
      dataset: "trading_realtime",
      source: "BITQUERY_TRADING_PAIRS_RANK1_V234",
      partialMarketOnly: true,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },

    bitqueryLiquidityEvidenceV237: {
      address: null,
      poolId: null,
      targetReason: null,
      attempted: false,
      verified: false,
      status: "NOT_TARGETED",
      fetchedAt: null,
      snapshotTime: null,
      snapshotAgeMs: null,
      currencyAAddress: null,
      currencyASymbol: null,
      currencyBAddress: null,
      currencyBSymbol: null,
      amountCurrencyA: null,
      amountCurrencyAInUSD: null,
      amountCurrencyB: null,
      amountCurrencyBInUSD: null,
      liquidityUsd: null,
      calculationMethod: null,
      dataset: "realtime",
      source: "BITQUERY_DEXPOOLEVENTS_POOLID_V237",
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },

    launchHoodDiscoveryV220: {
      totalQueriesShared: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      recentVerifiedLaunches: []
    },

    fixedMintLaunchpadDiscoveryV222: {
      totalQueriesShared: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      lastProtocol: null,
      byProtocol: {},
      recentVerifiedLaunches: []
    },

    clankerVirtualsDiscoveryV224: {
      totalQueriesShared: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      lastProtocol: null,
      byProtocol: {},
      recentVerifiedLaunches: []
    },

    ponsCurveTradesV216: {
      totalRowsSeen: 0,
      totalVerifiedTrades: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastTradeAt: null,
      lastToken: null,
      recentTrades: []
    },

    ponsDiscoveryV215: {
      totalQueriesShared: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      lastVerifiedCurve: null,
      lastPairToken: null,
      recentVerifiedLaunches: []
    },

    flapDiscoveryV214: {
      totalQueriesShared: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      recentVerifiedLaunches: []
    },

    bagsDiscoveryV210: {
      totalQueries: 0,
      totalLaunchesSeen: 0,
      totalVerifiedTokensAdded: 0,
      lastQueryAt: null,
      lastStatus: null,
      lastHttpStatus: null,
      lastLaunchAt: null,
      lastLaunchBlock: null,
      lastVerifiedToken: null,
      recentVerifiedLaunches: []
    },

    poolsTradeLaunchTelemetryV209: {
      totalEventsSeen: 0,
      totalDecodedVerified: 0,
      totalVerifiedTokensAdded: 0,
      totalVerifiedPoolsRegistered: 0,
      tokenCreatedSeen: 0,
      tokenLaunchedSeen: 0,
      firstVerifiedLaunchAt: null,
      lastVerifiedLaunchAt: null,
      lastVerifiedLaunchBlock: null,
      lastVerifiedToken: null,
      lastVerifiedPoolId: null,
      recentVerifiedLaunches: []
    },

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

        bitqueryHolderEvidenceV227: {
          ...fresh.bitqueryHolderEvidenceV227,
          ...(parsed.bitqueryHolderEvidenceV227 &&
          typeof parsed.bitqueryHolderEvidenceV227 === "object"
            ? parsed.bitqueryHolderEvidenceV227
            : {}),
          rows: Array.isArray(parsed.bitqueryHolderEvidenceV227?.rows)
            ? parsed.bitqueryHolderEvidenceV227.rows.slice(0, BITQUERY_HOLDER_ROW_LIMIT_V227)
            : []
        },

        bitqueryHolderTargetV228: {
          ...fresh.bitqueryHolderTargetV228,
          ...(parsed.bitqueryHolderTargetV228 &&
          typeof parsed.bitqueryHolderTargetV228 === "object"
            ? parsed.bitqueryHolderTargetV228
            : {})
        },
        bitqueryMarketTargetV235: {
          ...fresh.bitqueryMarketTargetV235,
          ...(parsed.bitqueryMarketTargetV235 &&
          typeof parsed.bitqueryMarketTargetV235 === "object"
            ? parsed.bitqueryMarketTargetV235
            : {})
        },

        bitqueryLiquidityTargetV237: {
          ...fresh.bitqueryLiquidityTargetV237,
          ...(parsed.bitqueryLiquidityTargetV237 &&
          typeof parsed.bitqueryLiquidityTargetV237 === "object"
            ? parsed.bitqueryLiquidityTargetV237
            : {})
        },

        bitqueryMarketEvidenceV233: {
          ...fresh.bitqueryMarketEvidenceV233,
          ...(parsed.bitqueryMarketEvidenceV233 &&
          typeof parsed.bitqueryMarketEvidenceV233 === "object"
            ? parsed.bitqueryMarketEvidenceV233
            : {})
        },

        bitqueryRankedPairEvidenceV234: {
          ...fresh.bitqueryRankedPairEvidenceV234,
          ...(parsed.bitqueryRankedPairEvidenceV234 &&
          typeof parsed.bitqueryRankedPairEvidenceV234 === "object"
            ? parsed.bitqueryRankedPairEvidenceV234
            : {})
        },

        bitqueryLiquidityEvidenceV237: {
          ...fresh.bitqueryLiquidityEvidenceV237,
          ...(parsed.bitqueryLiquidityEvidenceV237 &&
          typeof parsed.bitqueryLiquidityEvidenceV237 === "object"
            ? parsed.bitqueryLiquidityEvidenceV237
            : {})
        },

        launchHoodDiscoveryV220: {
          ...fresh.launchHoodDiscoveryV220,
          ...(
            parsed.launchHoodDiscoveryV220 &&
            typeof parsed.launchHoodDiscoveryV220 === "object"
              ? parsed.launchHoodDiscoveryV220
              : {}
          ),
          recentVerifiedLaunches:
            Array.isArray(
              parsed.launchHoodDiscoveryV220?.recentVerifiedLaunches
            )
              ? parsed.launchHoodDiscoveryV220.recentVerifiedLaunches.slice(-25)
              : []
        },

        fixedMintLaunchpadDiscoveryV222: {
          ...fresh.fixedMintLaunchpadDiscoveryV222,
          ...(
            parsed.fixedMintLaunchpadDiscoveryV222 &&
            typeof parsed.fixedMintLaunchpadDiscoveryV222 === "object"
              ? parsed.fixedMintLaunchpadDiscoveryV222
              : {}
          ),
          byProtocol:
            parsed.fixedMintLaunchpadDiscoveryV222?.byProtocol &&
            typeof parsed.fixedMintLaunchpadDiscoveryV222.byProtocol === "object"
              ? parsed.fixedMintLaunchpadDiscoveryV222.byProtocol
              : {},
          recentVerifiedLaunches:
            Array.isArray(
              parsed.fixedMintLaunchpadDiscoveryV222?.recentVerifiedLaunches
            )
              ? parsed.fixedMintLaunchpadDiscoveryV222.recentVerifiedLaunches.slice(-50)
              : []
        },


        clankerVirtualsDiscoveryV224: {
          ...fresh.clankerVirtualsDiscoveryV224,
          ...(parsed.clankerVirtualsDiscoveryV224 && typeof parsed.clankerVirtualsDiscoveryV224 === "object"
            ? parsed.clankerVirtualsDiscoveryV224 : {}),
          byProtocol:
            parsed.clankerVirtualsDiscoveryV224?.byProtocol &&
            typeof parsed.clankerVirtualsDiscoveryV224.byProtocol === "object"
              ? parsed.clankerVirtualsDiscoveryV224.byProtocol : {},
          recentVerifiedLaunches:
            Array.isArray(parsed.clankerVirtualsDiscoveryV224?.recentVerifiedLaunches)
              ? parsed.clankerVirtualsDiscoveryV224.recentVerifiedLaunches.slice(-50) : []
        },

      ponsCurveTradesV216: {
          ...fresh.ponsCurveTradesV216,
          ...(
            parsed.ponsCurveTradesV216 &&
            typeof parsed.ponsCurveTradesV216 === "object"
              ? parsed.ponsCurveTradesV216
              : {}
          ),
          recentTrades:
            Array.isArray(
              parsed.ponsCurveTradesV216?.recentTrades
            )
              ? parsed.ponsCurveTradesV216.recentTrades.slice(-500)
              : []
        },

        ponsDiscoveryV215: {
          ...fresh.ponsDiscoveryV215,
          ...(
            parsed.ponsDiscoveryV215 &&
            typeof parsed.ponsDiscoveryV215 === "object"
              ? parsed.ponsDiscoveryV215
              : {}
          ),
          recentVerifiedLaunches:
            Array.isArray(
              parsed.ponsDiscoveryV215?.recentVerifiedLaunches
            )
              ? parsed.ponsDiscoveryV215.recentVerifiedLaunches.slice(-25)
              : []
        },

        flapDiscoveryV214: {
          ...fresh.flapDiscoveryV214,
          ...(
            parsed.flapDiscoveryV214 &&
            typeof parsed.flapDiscoveryV214 === "object"
              ? parsed.flapDiscoveryV214
              : {}
          ),
          recentVerifiedLaunches:
            Array.isArray(parsed.flapDiscoveryV214?.recentVerifiedLaunches)
              ? parsed.flapDiscoveryV214.recentVerifiedLaunches.slice(-25)
              : []
        },

        bagsDiscoveryV210: {
          ...fresh.bagsDiscoveryV210,
          ...(
            parsed.bagsDiscoveryV210 &&
            typeof parsed.bagsDiscoveryV210 === "object"
              ? parsed.bagsDiscoveryV210
              : {}
          ),
          recentVerifiedLaunches:
            Array.isArray(parsed.bagsDiscoveryV210?.recentVerifiedLaunches)
              ? parsed.bagsDiscoveryV210.recentVerifiedLaunches.slice(-25)
              : []
        },

        poolsTradeLaunchTelemetryV209: {
          ...fresh.poolsTradeLaunchTelemetryV209,
          ...(
            parsed.poolsTradeLaunchTelemetryV209 &&
            typeof parsed.poolsTradeLaunchTelemetryV209 === "object"
              ? parsed.poolsTradeLaunchTelemetryV209
              : {}
          ),
          recentVerifiedLaunches:
            Array.isArray(parsed.poolsTradeLaunchTelemetryV209?.recentVerifiedLaunches)
              ? parsed.poolsTradeLaunchTelemetryV209.recentVerifiedLaunches.slice(-25)
              : []
        },

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
    return {
      registered: false,
      recoveredUnknownTracker:
        false
    };
  }

  const recoveredUnknownTracker =
    Boolean(
      state.unknownPools?.[poolId]
    );

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
    return {
      registered: false,
      recoveredUnknownTracker:
        false
    };
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

  if (
    recoveredUnknownTracker &&
    state.unknownPools
  ) {
    delete state.unknownPools[
      poolId
    ];
  }

  return {
    registered: true,
    recoveredUnknownTracker
  };
}

function refreshKnownPoolActivityV185(
  state,
  logs
) {
  state.poolRegistry =
    state.poolRegistry &&
    typeof state.poolRegistry ===
      "object"
      ? state.poolRegistry
      : {};

  const now =
    Date.now();

  const refreshedPoolIds =
    new Set();

  for (
    const log
    of logs || []
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    if (
      topic0 !== SWAP_TOPIC &&
      topic0 !== MODIFY_LIQUIDITY_TOPIC
    ) {
      continue;
    }

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    const entry =
      poolId
        ? state.poolRegistry?.[
            poolId
          ]
        : null;

    if (!entry) {
      continue;
    }

    entry.lastSeenAt =
      now;

    let blockNumber =
      null;

    try {
      blockNumber =
        Number(
          BigInt(
            log?.blockNumber ||
            "0x0"
          )
        ) || null;
    } catch {
      blockNumber =
        null;
    }

    if (
      blockNumber &&
      (
        !safeNumber(
          entry.lastActivityBlock
        ) ||
        blockNumber >
          safeNumber(
            entry.lastActivityBlock
          )
      )
    ) {
      entry.lastActivityBlock =
        blockNumber;
    }

    entry.lastActivitySourceV185 =
      "NORMAL_DISCOVERY_LOG";

    refreshedPoolIds.add(
      poolId
    );
  }

  return {
    enabled: true,
    zeroExtraRequests: true,
    refreshedMappings:
      refreshedPoolIds.size,
    refreshedPoolIds:
      [
        ...refreshedPoolIds
      ].slice(
        0,
        25
      )
  };
}

function rebuildPoolRegistryFromWatchedPoolsV186(
  state
) {
  state.poolRegistry =
    state.poolRegistry &&
    typeof state.poolRegistry === "object"
      ? state.poolRegistry
      : {};

  state.watchedTokens =
    Array.isArray(
      state.watchedTokens
    )
      ? state.watchedTokens
      : [];

  let inspectedPoolRows =
    0;

  let recoveredMappings =
    0;

  let refreshedMappings =
    0;

  let clearedUnknownTrackers =
    0;

  const recoveredPoolIds =
    [];

  for (
    const token
    of state.watchedTokens
  ) {
    const pools =
      Array.isArray(
        token?.pools
      )
        ? token.pools
        : [];

    for (
      const pool
      of pools
    ) {
      inspectedPoolRows++;

      const poolId =
        normalize(
          pool?.poolId
        );

      const currency0 =
        normalize(
          pool?.currency0
        );

      const currency1 =
        normalize(
          pool?.currency1
        );

      if (
        !poolId ||
        !isAddress(currency0) ||
        !isAddress(currency1)
      ) {
        continue;
      }

      const existing =
        state.poolRegistry[
          poolId
        ];

      const hadUnknownTracker =
        Boolean(
          state.unknownPools?.[
            poolId
          ]
        );

      if (
        existing
      ) {
        /*
         * Never replace canonical currencies with guesses. Only refresh an
         * existing mapping when the persisted watched-token pool agrees.
         */
        if (
          normalize(
            existing.currency0
          ) === currency0 &&
          normalize(
            existing.currency1
          ) === currency1
        ) {
          existing.lastSeenAt =
            Math.max(
              safeNumber(
                existing.lastSeenAt
              ),
              safeNumber(
                token?.lastSeenAt
              ),
              Date.now()
            );

          existing.lastSelfHealAtV186 =
            Date.now();

          refreshedMappings++;
        }
      } else {
        const result =
          registerPoolMapping(
            state,
            {
              poolId,
              currency0,
              currency1,
              blockNumber:
                pool?.blockNumber ||
                null,
              transactionHash:
                pool?.transactionHash ||
                null
            }
          );

        if (
          result?.registered ===
            true
        ) {
          recoveredMappings++;

          recoveredPoolIds.push(
            poolId
          );
        }
      }

      if (
        hadUnknownTracker &&
        state.poolRegistry?.[
          poolId
        ] &&
        state.unknownPools?.[
          poolId
        ]
      ) {
        delete state.unknownPools[
          poolId
        ];

        clearedUnknownTrackers++;
      } else if (
        hadUnknownTracker &&
        state.poolRegistry?.[
          poolId
        ] &&
        !state.unknownPools?.[
          poolId
        ]
      ) {
        /*
         * registerPoolMapping() already removed it.
         */
        clearedUnknownTrackers++;
      }
    }
  }

  return {
    enabled: true,
    source:
      "PERSISTED_WATCHED_TOKEN_CANONICAL_POOL_OBJECTS",
    inspectedPoolRows,
    recoveredMappings,
    refreshedMappings,
    clearedUnknownTrackers,
    recoveredPoolIds:
      recoveredPoolIds.slice(
        0,
        50
      ),
    zeroExtraRequests:
      true,
    guessing:
      false
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

  /*
   * V186:
   * Pool identity is immutable once Initialize establishes the PoolKey.
   * Do not throw away a valid identity purely because of age. Keep the
   * existing LRU/cap protection so KV growth remains bounded.
   */
  const entries =
    Object.entries(
      state.poolRegistry
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



function sortV4CurrenciesV199(
  a,
  b
) {
  const x = normalize(a);
  const y = normalize(b);

  if (
    !isAddress(x) ||
    !isAddress(y) ||
    x === y
  ) {
    return null;
  }

  try {
    return BigInt(x) < BigInt(y)
      ? [x, y]
      : [y, x];
  } catch {
    return null;
  }
}

async function getPoolIdentityBitqueryDexPoolEventsV199(
  env,
  poolId,
  budget
) {
  const normalizedPoolId =
    normalize(poolId);

  const base = {
    attempted: false,
    externalRequestsUsed: 0,
    provider: "BITQUERY",
    resolver:
      "DEXPoolEvents_POOLID_FIRST_V199",
    poolId:
      normalizedPoolId,
    returnedPoolId: null,
    poolManager: null,
    protocolName: null,
    protocolVersion: null,
    currencyA: null,
    currencyB: null,
    currency0: null,
    currency1: null,
    blockNumber: null,
    transactionHash: null,
    resolvedPool: null,
    status: null,
    httpStatus: null,
    error: null
  };

  const token =
    String(
      env.BITQUERY_ACCESS_TOKEN ||
      ""
    ).trim();

  if (!token) {
    return {
      ...base,
      status: "NOT_CONFIGURED"
    };
  }

  if (
    !/^0x[a-f0-9]{64}$/.test(
      normalizedPoolId
    )
  ) {
    return {
      ...base,
      status: "INVALID_POOL_ID"
    };
  }

  if (
    !budgetAvailable(
      budget,
      "discovery-live"
    ) ||
    !consumeBudget(
      budget,
      "discovery-live",
      "BITQUERY_DEXPOOLEVENTS_POOLID_V199"
    )
  ) {
    return {
      ...base,
      status:
        "DISCOVERY_LIVE_BUDGET_PROTECTED"
    };
  }

  /*
   * Bitquery documents DEXPoolEvents on Robinhood as realtime-only and
   * directly keyed by the Uniswap v4 PoolId. This is intentionally queried
   * without dataset: archive/combined.
   */
  const query = `
    {
      EVM(network: robinhood) {
        DEXPoolEvents(
          limit: {count: 1}
          orderBy: {descending: Block_Time}
          where: {
            PoolEvent: {
              Pool: {
                PoolId: {
                  is: "${normalizedPoolId}"
                }
              }
            }
          }
        ) {
          Block {
            Number
            Time
          }
          Transaction {
            Hash
          }
          PoolEvent {
            Dex {
              ProtocolName
              ProtocolVersion
            }
            Pool {
              PoolId
              SmartContract
              CurrencyA {
                SmartContract
                Symbol
                Name
              }
              CurrencyB {
                SmartContract
                Symbol
                Name
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response =
      await fetch(
        BITQUERY_GRAPHQL_V2,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            accept:
              "application/json",
            authorization:
              `Bearer ${token}`
          },
          body:
            JSON.stringify({query})
        }
      );

    const httpStatus =
      response.status;

    let payload = null;

    try {
      payload =
        await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          `HTTP_${httpStatus}`,
        error:
          payload?.errors?.[0]?.message ||
          `BITQUERY_HTTP_${httpStatus}`
      };
    }

    if (
      Array.isArray(
        payload?.errors
      ) &&
      payload.errors.length
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status: "GRAPHQL_ERROR",
        error:
          payload.errors
            .map(
              row =>
                String(
                  row?.message ||
                  "GRAPHQL_ERROR"
                )
            )
            .slice(0, 3)
            .join(" | ")
      };
    }

    const row =
      payload?.data?.EVM
        ?.DEXPoolEvents?.[0] ||
      null;

    if (!row) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "EMPTY_REALTIME_WINDOW"
      };
    }

    const returnedPoolId =
      normalize(
        row?.PoolEvent?.Pool?.PoolId
      );

    const poolManager =
      normalize(
        row?.PoolEvent?.Pool
          ?.SmartContract
      );

    const protocolName =
      String(
        row?.PoolEvent?.Dex
          ?.ProtocolName ||
        ""
      ).toLowerCase();

    const protocolVersion =
      String(
        row?.PoolEvent?.Dex
          ?.ProtocolVersion ||
        ""
      );

    // V200: Bitquery DEXPoolEvents uses "0x" for Robinhood native ETH.
    // Normalize only this provider-specific representation to canonical
    // Uniswap V4 native currency ZERO before the existing strict validation.
    const normalizeBitqueryCurrencyV200 =
      value => {
        const raw =
          String(value || "")
            .trim()
            .toLowerCase();

        if (raw === "0x") {
          return ZERO;
        }

        return normalize(raw);
      };

    const currencyA =
      normalizeBitqueryCurrencyV200(
        row?.PoolEvent?.Pool
          ?.CurrencyA?.SmartContract
      );

    const currencyB =
      normalizeBitqueryCurrencyV200(
        row?.PoolEvent?.Pool
          ?.CurrencyB?.SmartContract
      );

    if (
      returnedPoolId !==
        normalizedPoolId
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        returnedPoolId,
        poolManager,
        protocolName,
        protocolVersion,
        currencyA,
        currencyB,
        status:
          "POOL_ID_MISMATCH",
        error:
          "BITQUERY_DEXPOOLEVENTS_RETURNED_DIFFERENT_POOL_ID"
      };
    }

    if (
      protocolName &&
      protocolName !==
        "uniswap_v4"
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        returnedPoolId,
        poolManager,
        protocolName,
        protocolVersion,
        currencyA,
        currencyB,
        status:
          "PROTOCOL_UNVERIFIED",
        error:
          "POOL_NOT_IDENTIFIED_AS_UNISWAP_V4"
      };
    }

    if (
      isAddress(poolManager) &&
      poolManager !==
        normalize(POOL_MANAGER)
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        returnedPoolId,
        poolManager,
        protocolName,
        protocolVersion,
        currencyA,
        currencyB,
        status:
          "POOL_MANAGER_MISMATCH",
        error:
          "DEXPOOLEVENTS_POOL_MANAGER_DOES_NOT_MATCH_ROBINHOOD_V4_MANAGER"
      };
    }

    const sorted =
      sortV4CurrenciesV199(
        currencyA,
        currencyB
      );

    if (!sorted) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        returnedPoolId,
        poolManager,
        protocolName,
        protocolVersion,
        currencyA,
        currencyB,
        status:
          "CURRENCIES_UNVERIFIED",
        error:
          "DEXPOOLEVENTS_MISSING_OR_INVALID_CURRENCIES"
      };
    }

    const [
      currency0,
      currency1
    ] = sorted;

    const resolvedPool = {
      poolId:
        normalizedPoolId,
      currency0,
      currency1,
      blockNumber:
        safeNumber(
          row?.Block?.Number
        ) || null,
      transactionHash:
        normalize(
          row?.Transaction?.Hash
        ) || null,
      source:
        "V199_BITQUERY_DEXPOOLEVENTS_POOLID_FIRST"
    };

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      httpStatus,
      returnedPoolId,
      poolManager,
      protocolName,
      protocolVersion,
      currencyA,
      currencyB,
      currency0,
      currency1,
      blockNumber:
        resolvedPool.blockNumber,
      transactionHash:
        resolvedPool
          .transactionHash,
      resolvedPool,
      status: "RESOLVED"
    };
  } catch (error) {
    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status: "FETCH_ERROR",
      error:
        errorString(error)
    };
  }
}

async function getInitializeForPoolBitqueryV190(
  env,
  state,
  poolId,
  budget
) {
  const base = {
    attempted: false,
    externalRequestsUsed: 0,
    provider: "BITQUERY",
    poolId:
      normalize(poolId),
    blockNumber: null,
    transactionHash: null,
    currency0: null,
    currency1: null,
    resolvedPool: null,
    status: null,
    httpStatus: null,
    error: null
  };

  const normalizedPoolId =
    normalize(poolId);

  const token =
    String(
      env.BITQUERY_ACCESS_TOKEN ||
      ""
    ).trim();

  if (!token) {
    return {
      ...base,
      status:
        "NOT_CONFIGURED"
    };
  }

  if (
    !/^0x[a-f0-9]{64}$/.test(
      normalizedPoolId
    )
  ) {
    return {
      ...base,
      status:
        "INVALID_POOL_ID"
    };
  }

  if (
    !budgetAvailable(
      budget,
      "discovery-live"
    )
  ) {
    return {
      ...base,
      status:
        "DISCOVERY_LIVE_BUDGET_PROTECTED"
    };
  }

  if (
    !consumeBudget(
      budget,
      "discovery-live",
      "BITQUERY_EXACT_POOL_INITIALIZE_V190"
    )
  ) {
    return {
      ...base,
      status:
        "DISCOVERY_LIVE_BUDGET_PROTECTED"
    };
  }

  /*
   * This is the exact query proven manually against a real V189
   * UNKNOWN_POOL_IDENTITY. PoolId is indexed in Initialize, so match it
   * through Topics rather than guessing or crawling historical ranges.
   */
  const query = `
    {
      EVM(network: robinhood, dataset: realtime) {
        Events(
          limit: {count: 1}
          where: {
            LogHeader: {
              Address: {
                is: "${POOL_MANAGER}"
              }
            }
            Log: {
              Signature: {
                Name: {
                  is: "Initialize"
                }
              }
            }
            Topics: {
              includes: {
                Hash: {
                  is: "${normalizedPoolId}"
                }
              }
            }
          }
        ) {
          Block {
            Number
            Time
          }
          Transaction {
            Hash
          }
          Arguments {
            Name
            Type
            Value {
              ... on EVM_ABI_Address_Value_Arg {
                address
              }
              ... on EVM_ABI_Bytes_Value_Arg {
                hex
              }
              ... on EVM_ABI_BigInt_Value_Arg {
                bigInteger
              }
              ... on EVM_ABI_Integer_Value_Arg {
                integer
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response =
      await fetch(
        BITQUERY_GRAPHQL_V2,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            accept:
              "application/json",
            authorization:
              `Bearer ${token}`
          },
          body:
            JSON.stringify({
              query
            })
        }
      );

    const httpStatus =
      response.status;

    let payload =
      null;

    try {
      payload =
        await response.json();
    } catch {
      payload =
        null;
    }

    if (!response.ok) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          `HTTP_${httpStatus}`,
        error:
          payload?.errors?.[0]?.message ||
          `BITQUERY_HTTP_${httpStatus}`
      };
    }

    if (
      Array.isArray(
        payload?.errors
      ) &&
      payload.errors.length
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "GRAPHQL_ERROR",
        error:
          payload.errors
            .map(
              item =>
                String(
                  item?.message ||
                  "GRAPHQL_ERROR"
                )
            )
            .slice(
              0,
              3
            )
            .join(" | ")
      };
    }

    const event =
      payload?.data?.EVM?.Events?.[0] ||
      null;

    if (!event) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "EMPTY_REALTIME_WINDOW"
      };
    }

    let currency0 =
      null;

    let currency1 =
      null;

    for (
      const argument
      of event.Arguments || []
    ) {
      const name =
        String(
          argument?.Name ||
          ""
        ).toLowerCase();

      const address =
        normalize(
          argument?.Value?.address
        );

      if (
        name === "currency0" &&
        isAddress(address)
      ) {
        currency0 =
          address;
      }

      if (
        name === "currency1" &&
        isAddress(address)
      ) {
        currency1 =
          address;
      }
    }

    if (
      !isAddress(currency0) ||
      !isAddress(currency1)
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        blockNumber:
          safeNumber(
            event?.Block?.Number
          ) || null,
        transactionHash:
          normalize(
            event?.Transaction?.Hash
          ) || null,
        currency0,
        currency1,
        status:
          "EVENT_FOUND_CURRENCIES_UNVERIFIED",
        error:
          "BITQUERY_INITIALIZE_MISSING_CURRENCY0_OR_CURRENCY1"
      };
    }

    const resolvedPool = {
      poolId:
        normalizedPoolId,
      currency0,
      currency1,
      blockNumber:
        safeNumber(
          event?.Block?.Number
        ) || null,
      transactionHash:
        normalize(
          event?.Transaction?.Hash
        ) || null,
      source:
        "BITQUERY_REALTIME_INITIALIZE_V190"
    };

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      httpStatus,
      blockNumber:
        resolvedPool.blockNumber,
      transactionHash:
        resolvedPool.transactionHash,
      currency0,
      currency1,
      resolvedPool,
      status:
        "RESOLVED"
    };
  } catch (error) {
    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status:
        "FETCH_ERROR",
      error:
        errorString(error)
    };
  }
}

async function getInitializeForPoolBlockHashV188(
  env,
  state,
  poolId,
  blockNumber,
  budget,
  externalRequestAllowance = 2
) {
  const base = {
    attempted: false,
    externalRequestsUsed: 0,
    provider: null,
    blockNumber:
      safeNumber(blockNumber) || null,
    blockHash: null,
    logs: [],
    resolvedPool: null,
    error: null,
    status: null
  };

  const normalizedPoolId =
    normalize(poolId);

  const targetBlock =
    safeNumber(blockNumber);

  if (
    !normalizedPoolId ||
    targetBlock <= 0
  ) {
    return {
      ...base,
      status:
        "INVALID_POOL_OR_BLOCK"
    };
  }

  const providers = [
    "ALCHEMY",
    "ROBINHOOD_PUBLIC_RPC"
  ];

  let used = 0;
  let lastError = null;

  for (
    const provider
    of providers
  ) {
    if (
      used >=
        externalRequestAllowance ||
      !budgetAvailable(
        budget,
        "discovery-live"
      ) ||
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

    try {
      /*
       * Request #1: obtain the exact block hash. A blockHash log query then
       * avoids the provider's restrictive multi-block eth_getLogs range.
       */
      used++;

      const block =
        await rpcCall(
          url,
          "eth_getBlockByNumber",
          [
            "0x" +
              BigInt(
                targetBlock
              ).toString(16),
            false
          ],
          budget,
          "discovery-live"
        );

      const blockHash =
        normalize(
          block?.hash
        );

      if (
        !blockHash ||
        used >=
          externalRequestAllowance ||
        !budgetAvailable(
          budget,
          "discovery-live"
        )
      ) {
        lastError =
          "BLOCK_HASH_UNAVAILABLE_OR_BUDGET_PROTECTED";
        continue;
      }

      used++;

      const logs =
        await rpcCall(
          url,
          "eth_getLogs",
          [{
            blockHash,
            address:
              POOL_MANAGER,
            topics: [
              INITIALIZE_TOPIC,
              normalizedPoolId
            ]
          }],
          budget,
          "discovery-live"
        );

      const rows =
        Array.isArray(logs)
          ? logs
          : [];

      let resolvedPool =
        null;

      for (
        const row
        of rows
      ) {
        const decoded =
          decodeInitialize(row);

        if (
          decoded &&
          normalize(
            decoded.poolId
          ) ===
            normalizedPoolId
        ) {
          resolvedPool =
            decoded;
          break;
        }
      }

      return {
        ...base,
        attempted: true,
        externalRequestsUsed:
          used,
        provider,
        blockHash,
        logs: rows,
        resolvedPool,
        error: null,
        status:
          resolvedPool
            ? "RESOLVED"
            : "EMPTY"
      };
    } catch (error) {
      const message =
        String(
          error?.message ||
          error
        );

      lastError =
        message;

      if (
        is429(message)
      ) {
        markDiscovery429(
          state,
          provider
        );
      }

      /*
       * A provider may not support EIP-234 blockHash filtering. Preserve
       * the existing range resolver as fallback rather than treating that
       * as a fatal scan error.
       */
      continue;
    }
  }

  return {
    ...base,
    attempted:
      used > 0,
    externalRequestsUsed:
      used,
    error:
      lastError,
    status:
      used > 0
        ? "UNRESOLVED"
        : "NOT_ATTEMPTED"
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

function blockscoutWideInitializeServiceV184(
  state
) {
  state.services =
    state.services ||
    {};

  const existing =
    state.services
      .blockscoutWideInitializeV184;

  state.services
    .blockscoutWideInitializeV184 = {
      totalRequests: 0,
      total429s: 0,
      consecutive429s: 0,
      lastRequestAt: null,
      lastSuccessAt: null,
      last429At: null,
      lastStatus: null,
      cooldownUntil: null,
      lastBackoffMs: null,
      ...(
        existing &&
        typeof existing === "object" &&
        !Array.isArray(existing)
          ? existing
          : {}
      )
    };

  return state.services
    .blockscoutWideInitializeV184;
}

function blockscoutWideInitializeTelemetryV184(
  state
) {
  const service =
    blockscoutWideInitializeServiceV184(
      state
    );

  const now =
    Date.now();

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    ) || null;

  return {
    enabled: true,
    totalRequests:
      safeNumber(service.totalRequests),
    total429s:
      safeNumber(service.total429s),
    consecutive429s:
      safeNumber(service.consecutive429s),
    lastRequestAt:
      safeNumber(service.lastRequestAt) || null,
    lastSuccessAt:
      safeNumber(service.lastSuccessAt) || null,
    last429At:
      safeNumber(service.last429At) || null,
    lastStatus:
      service.lastStatus || null,
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
    lastBackoffMs:
      safeNumber(service.lastBackoffMs) || null,
    lookbackBlocks:
      BLOCKSCOUT_WIDE_INITIALIZE_LOOKBACK_BLOCKS_V184
  };
}

function registerBlockscoutWideInitialize429V184(
  state
) {
  const service =
    blockscoutWideInitializeServiceV184(
      state
    );

  service.consecutive429s =
    Math.max(
      1,
      safeNumber(service.consecutive429s) + 1
    );

  service.total429s =
    safeNumber(service.total429s) + 1;

  const backoffMs =
    Math.min(
      BLOCKSCOUT_WIDE_INITIALIZE_MAX_BACKOFF_MS_V184,
      BLOCKSCOUT_WIDE_INITIALIZE_BASE_BACKOFF_MS_V184 *
        (2 ** Math.max(
          0,
          service.consecutive429s - 1
        ))
    );

  const now =
    Date.now();

  service.last429At =
    now;

  service.lastStatus =
    "HTTP_429";

  service.lastBackoffMs =
    backoffMs;

  service.cooldownUntil =
    now + backoffMs;

  return backoffMs;
}

async function blockscoutWideInitializeForPoolV184(
  state,
  budget,
  poolId,
  firstActiveBlock
) {
  const base = {
    attempted: false,
    externalRequestsUsed: 0,
    provider: "BLOCKSCOUT",
    logs: [],
    resolvedPool: null,
    status: null,
    fromBlock: null,
    toBlock: null
  };

  const normalizedPoolId =
    normalize(poolId);

  const activeBlock =
    safeNumber(firstActiveBlock);

  if (
    !normalizedPoolId ||
    activeBlock <= 0
  ) {
    return {
      ...base,
      status:
        "INVALID_POOL_OR_ACTIVE_BLOCK"
    };
  }

  const service =
    blockscoutWideInitializeServiceV184(
      state
    );

  const now =
    Date.now();

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    ) || null;

  if (
    cooldownUntil &&
    cooldownUntil > now
  ) {
    service.lastStatus =
      "COOLDOWN_ACTIVE";

    return {
      ...base,
      status:
        "BLOCKSCOUT_WIDE_INITIALIZE_COOLDOWN_V184",
      cooldownUntil,
      retryAfterMs:
        cooldownUntil - now
    };
  }

  if (
    !consumeBudget(
      budget,
      "discovery-live",
      "BLOCKSCOUT_WIDE_EXACT_INITIALIZE_V184"
    )
  ) {
    return {
      ...base,
      status:
        "DISCOVERY_LIVE_BUDGET_PROTECTED"
    };
  }

  const toBlock =
    Math.max(
      0,
      Math.floor(activeBlock)
    );

  const fromBlock =
    Math.max(
      0,
      toBlock -
        BLOCKSCOUT_WIDE_INITIALIZE_LOOKBACK_BLOCKS_V184 +
        1
    );

  const url =
    `${BLOCKSCOUT}/api?module=logs&action=getLogs` +
    `&fromBlock=${fromBlock}` +
    `&toBlock=${toBlock}` +
    `&address=${POOL_MANAGER}` +
    `&topic0=${INITIALIZE_TOPIC}` +
    `&topic1=${normalizedPoolId}` +
    `&topic0_1_opr=and`;

  service.totalRequests =
    safeNumber(service.totalRequests) + 1;

  service.lastRequestAt =
    Date.now();

  service.lastStatus =
    "REQUESTING";

  try {
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
      response.status === 429
    ) {
      const backoffMs =
        registerBlockscoutWideInitialize429V184(
          state
        );

      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        status:
          "BLOCKSCOUT_HTTP_429",
        fromBlock,
        toBlock,
        backoffMs,
        cooldownUntil:
          safeNumber(
            blockscoutWideInitializeServiceV184(
              state
            ).cooldownUntil
          ) || null
      };
    }

    if (
      !response.ok
    ) {
      service.lastStatus =
        `HTTP_${response.status}`;

      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        status:
          `BLOCKSCOUT_HTTP_${response.status}`,
        fromBlock,
        toBlock
      };
    }

    const payload =
      await response.json();

    const rows =
      Array.isArray(payload?.result)
        ? payload.result
        : [];

    let resolvedPool =
      null;

    for (
      const row
      of rows
    ) {
      const decoded =
        decodeInitialize(row);

      if (
        decoded &&
        normalize(decoded.poolId) ===
          normalizedPoolId
      ) {
        resolvedPool =
          decoded;
        break;
      }
    }

    service.lastStatus =
      resolvedPool
        ? "RESOLVED"
        : "EMPTY";

    service.lastSuccessAt =
      Date.now();

    service.consecutive429s =
      0;

    service.cooldownUntil =
      null;

    service.lastBackoffMs =
      null;

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      logs: rows,
      resolvedPool,
      status:
        resolvedPool
          ? "RESOLVED"
          : "EMPTY",
      fromBlock,
      toBlock
    };
  } catch (error) {
    service.lastStatus =
      "FETCH_ERROR";

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status:
        "FETCH_ERROR",
      error:
        errorString(error),
      fromBlock,
      toBlock
    };
  }
}

async function resolvePersistentUnknownPools(
  env,
  state,
  budget,
  preferredLivePoolIdsV191 = null
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

  /*
   * V190: the first available resolver slot belongs to Bitquery when its
   * access token is configured. This does not raise any request ceiling.
   */
  const bitqueryConfiguredV190 =
    Boolean(
      String(
        env.BITQUERY_ACCESS_TOKEN ||
        ""
      ).trim()
    );

  const tracker =
    ensureUnknownPoolState(
      state
    );

  const livePriorityPoolIdsV191 =
    new Set(
      Array.from(
        preferredLivePoolIdsV191 ||
        []
      )
        .map(normalize)
        .filter(Boolean)
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

  let candidates =
    selectedCandidates;

  /*
   * V191: V190 proved Bitquery resolution itself works. The first V190 live
   * test also proved V179 already runs after resolver completion. The actual
   * gap was that Bitquery's one lookup could target an older tracker pool
   * instead of a PoolId causing UNKNOWN_POOL_IDENTITY in this live batch.
   */
  const livePriorityCandidatesV191 =
    eligibleCandidates
      .filter(
        entry =>
          livePriorityPoolIdsV191.has(
            normalize(
              entry?.poolId
            )
          )
      )
      .sort((a, b) => {
        const activityDiff =
          activityScore(b) -
          activityScore(a);

        if (activityDiff !== 0) {
          return activityDiff;
        }

        const seenDiff =
          safeNumber(b?.lastSeenBlock) -
          safeNumber(a?.lastSeenBlock);

        if (seenDiff !== 0) {
          return seenDiff;
        }

        return byOldestWait(a, b);
      });

  const bitqueryPriorityPoolV191 =
    livePriorityCandidatesV191[0] ||
    null;

  if (bitqueryPriorityPoolV191) {
    const livePriorityIdsV193 =
      new Set(
        livePriorityCandidatesV191
          .map(
            entry =>
              normalize(
                entry?.poolId
              )
          )
          .filter(Boolean)
      );

    const liveRowsV193 =
      livePriorityCandidatesV191.map(
        entry => {
          const id =
            normalize(
              entry?.poolId
            );

          const existing =
            candidates.find(
              item =>
                normalize(
                  item?.entry?.poolId
                ) === id
            );

          return {
            entry,
            lane:
              existing?.lane ||
              "LIVE_BITQUERY_RETRY_PRIORITY_V193"
          };
        }
      );

    candidates = [
      ...liveRowsV193,
      ...candidates.filter(
        item =>
          !livePriorityIdsV193.has(
            normalize(
              item?.entry?.poolId
            )
          )
      )
    ];
  }

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
    livePoolPriorityV191: {
      enabled: true,
      currentLiveUnknownPoolCount:
        livePriorityPoolIdsV191.size,
      eligibleCurrentLiveUnknownPoolCount:
        livePriorityCandidatesV191.length,
      selectedPoolId:
        bitqueryPriorityPoolV191
          ? normalize(
              bitqueryPriorityPoolV191.poolId
            )
          : null,
      selectedActivityScore:
        bitqueryPriorityPoolV191
          ? activityScore(
              bitqueryPriorityPoolV191
            )
          : null,
      bitqueryAttemptForcedToCurrentLivePool:
        Boolean(
          bitqueryPriorityPoolV191
        ),
      sameScanReplayAlreadyPresentFromV179:
        true,
      extraExternalRequests:
        0
,
      retryUpgradeV193:
        "UP_TO_4_DISTINCT_CURRENT_LIVE_POOLS_V197",
      stopOnFirstResolvedV193:
        true    },
    bitqueryDexPoolEventsV199: {
      enabled: true,
      configured:
        bitqueryConfiguredV190,
      endpoint:
        BITQUERY_GRAPHQL_V2,
      dataset:
        "realtime_only",
      poolIdFirst:
        true,
      maxAttemptsPerRun: 4,
      attempts: 0,
      requestsUsed: 0,
      resolved: 0,
      selectedPoolId: null,
      currencyA: null,
      currencyB: null,
      currency0: null,
      currency1: null,
      blockNumber: null,
      transactionHash: null,
      httpStatus: null,
      status:
        bitqueryConfiguredV190
          ? "NOT_REACHED"
          : "NOT_CONFIGURED",
      error: null,
      exactPoolIdRequired: true,
      currencyOrdering:
        "UNISWAP_V4_NUMERIC_ADDRESS_SORT",
      identityGuessing: false,
      attemptHistoryV199: []
    },
    bitqueryInitializeV190: {
      enabled: true,
      configured:
        bitqueryConfiguredV190,
      endpoint:
        BITQUERY_GRAPHQL_V2,
      dataset:
        "realtime",
      maxAttemptsPerRun: 4,
      attempts: 0,
      requestsUsed: 0,
      resolved: 0,
      selectedPoolId: null,
      currency0: null,
      currency1: null,
      blockNumber: null,
      transactionHash: null,
      httpStatus: null,
      status:
        bitqueryConfiguredV190
          ? "NOT_REACHED"
          : "NOT_CONFIGURED",
      error: null,
      fallbackToLegacyResolver: false,
      exactTopicPoolIdLookup: true,
      identityGuessing: false
    },
    blockscoutWideInitializeV184: {
      enabled: true,
      maxAttemptsPerRun: 1,
      attempts: 0,
      requestsUsed: 0,
      resolved: 0,
      status: null,
      selectedPoolId: null,
      fromBlock: null,
      toBlock: null,
      fallbackToRpc: false,
      service:
        blockscoutWideInitializeTelemetryV184(
          state
        )
    },
    rpcBlockHashInitializeV188: {
      enabled: true,
      forcedCheckpointV189: true,
      reservedRequestsV189: 2,
      maxPoolsPerRun: 1,
      attempts: 0,
      requestsUsed: 0,
      resolved: 0,
      selectedPoolId: null,
      blockNumber: null,
      blockHash: null,
      provider: null,
      status: "NOT_REACHED",
      checkpointOutcomeV189: "NOT_REACHED",
      error: null,
      fallbackToRangeCrawler: false
    },
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

    /*
     * V199: CURRENT-live PoolId-first identity lookup.
     * DEXPoolEvents is realtime-only and keyed directly by the exact V4
     * PoolId. If it cannot resolve, preserve the proven V190 exact
     * Initialize lookup as fallback.
     */
    let bitqueryResolvedPoolV190 =
      null;

    let bitqueryResolutionPathV199 =
      null;

    if (
      output.bitqueryDexPoolEventsV199
        .attempts <
          output.bitqueryDexPoolEventsV199
            .maxAttemptsPerRun &&
      bitqueryConfiguredV190 &&
      livePriorityPoolIdsV191.has(
        normalize(poolId)
      ) &&
      output.requestsUsed <
        resolverRequestLimit
    ) {
      const dexPoolV199 =
        await getPoolIdentityBitqueryDexPoolEventsV199(
          env,
          poolId,
          budget
        );

      output.bitqueryDexPoolEventsV199
        .attempts +=
          dexPoolV199.attempted
            ? 1
            : 0;

      output.bitqueryDexPoolEventsV199
        .requestsUsed +=
          safeNumber(
            dexPoolV199
              .externalRequestsUsed
          );

      output.requestsUsed +=
        safeNumber(
          dexPoolV199
            .externalRequestsUsed
        );

      output.bitqueryDexPoolEventsV199
        .selectedPoolId =
          poolId;

      output.bitqueryDexPoolEventsV199
        .currencyA =
          dexPoolV199.currencyA;

      output.bitqueryDexPoolEventsV199
        .currencyB =
          dexPoolV199.currencyB;

      output.bitqueryDexPoolEventsV199
        .currency0 =
          dexPoolV199.currency0;

      output.bitqueryDexPoolEventsV199
        .currency1 =
          dexPoolV199.currency1;

      output.bitqueryDexPoolEventsV199
        .blockNumber =
          dexPoolV199.blockNumber;

      output.bitqueryDexPoolEventsV199
        .transactionHash =
          dexPoolV199.transactionHash;

      output.bitqueryDexPoolEventsV199
        .httpStatus =
          dexPoolV199.httpStatus;

      output.bitqueryDexPoolEventsV199
        .status =
          dexPoolV199.status;

      output.bitqueryDexPoolEventsV199
        .error =
          dexPoolV199.error;

      output.bitqueryDexPoolEventsV199
        .attemptHistoryV199.push({
          poolId,
          status:
            dexPoolV199.status,
          httpStatus:
            dexPoolV199.httpStatus,
          returnedPoolId:
            dexPoolV199.returnedPoolId,
          poolManager:
            dexPoolV199.poolManager,
          protocolName:
            dexPoolV199.protocolName,
          currencyA:
            dexPoolV199.currencyA,
          currencyB:
            dexPoolV199.currencyB,
          currency0:
            dexPoolV199.currency0,
          currency1:
            dexPoolV199.currency1,
          resolved:
            Boolean(
              dexPoolV199.resolvedPool
            )
        });

      if (
        dexPoolV199.resolvedPool
      ) {
        bitqueryResolvedPoolV190 =
          dexPoolV199.resolvedPool;

        bitqueryResolutionPathV199 =
          "V199_BITQUERY_DEXPOOLEVENTS_POOLID_FIRST";

        output.bitqueryDexPoolEventsV199
          .resolved += 1;
      }
    }

    /*
     * Preserve V190 Initialize lookup as fallback. It is only attempted
     * when V199 did not resolve and request budget remains.
     */
    if (
      !bitqueryResolvedPoolV190 &&
      output.bitqueryInitializeV190
        .attempts <
          output.bitqueryInitializeV190
            .maxAttemptsPerRun &&
      bitqueryConfiguredV190 &&
      livePriorityPoolIdsV191.has(
        normalize(poolId)
      ) &&
      output.requestsUsed <
        resolverRequestLimit
    ) {
      const bitqueryV190 =
        await getInitializeForPoolBitqueryV190(
          env,
          state,
          poolId,
          budget
        );

      output.bitqueryInitializeV190
        .attempts +=
          bitqueryV190.attempted
            ? 1
            : 0;

      output.bitqueryInitializeV190
        .requestsUsed +=
          safeNumber(
            bitqueryV190.externalRequestsUsed
          );

      output.requestsUsed +=
        safeNumber(
          bitqueryV190.externalRequestsUsed
        );

      if (
        !Array.isArray(
          output.bitqueryInitializeV190
            .attemptHistoryV193
        )
      ) {
        output.bitqueryInitializeV190
          .attemptHistoryV193 = [];
      }

      output.bitqueryInitializeV190
        .attemptHistoryV193.push({
          poolId,
          status:
            bitqueryV190.status,
          httpStatus:
            bitqueryV190.httpStatus,
          currency0:
            bitqueryV190.currency0,
          currency1:
            bitqueryV190.currency1,
          resolved:
            Boolean(
              bitqueryV190.resolvedPool
            )
        });

      output.bitqueryInitializeV190
        .selectedPoolId =
          poolId;

      output.bitqueryInitializeV190
        .currency0 =
          bitqueryV190.currency0;

      output.bitqueryInitializeV190
        .currency1 =
          bitqueryV190.currency1;

      output.bitqueryInitializeV190
        .blockNumber =
          bitqueryV190.blockNumber;

      output.bitqueryInitializeV190
        .transactionHash =
          bitqueryV190.transactionHash;

      output.bitqueryInitializeV190
        .httpStatus =
          bitqueryV190.httpStatus;

      output.bitqueryInitializeV190
        .status =
          bitqueryV190.status;

      output.bitqueryInitializeV190
        .error =
          bitqueryV190.error;

      if (
        bitqueryV190.resolvedPool
      ) {
        bitqueryResolvedPoolV190 =
          bitqueryV190.resolvedPool;

        bitqueryResolutionPathV199 =
          "V190_BITQUERY_REALTIME_INITIALIZE";

        output.bitqueryInitializeV190
          .resolved = 1;
      } else if (
        bitqueryV190.attempted
      ) {
        output.bitqueryInitializeV190
          .fallbackToLegacyResolver =
            true;
      }
    }

    if (
      bitqueryResolvedPoolV190
    ) {
      entry.lastResolvedSearchDistance =
        unknownPoolSearchDistance(
          entry
        );

      entry.consecutiveEmptySearches =
        0;

      registerPoolMapping(
        state,
        bitqueryResolvedPoolV190
      );

      for (
        const address
        of [
          bitqueryResolvedPoolV190.currency0,
          bitqueryResolvedPoolV190.currency1
        ]
      ) {
        if (
          !isAddress(address) ||
          address === ZERO ||
          knownQuote(address)
        ) {
          continue;
        }

        addWatch(
          state,
          address,
          bitqueryResolvedPoolV190,
          bitqueryResolutionPathV199 ||
            "V190_BITQUERY_REALTIME_INITIALIZE"
        );
      }

      delete tracker[
        poolId
      ];

      output.resolved++;

      output.resolvedPoolIds.push(
        poolId
      );

      output.probes.push({
        poolId,
        resolverLane,
        activityScore:
          activityScore(entry),
        swapEvents:
          safeNumber(entry.swapEvents),
        liquidityEvents:
          safeNumber(entry.liquidityEvents),
        appearances:
          safeNumber(entry.appearances),
        fromBlock:
          bitqueryResolvedPoolV190.blockNumber,
        toBlock:
          bitqueryResolvedPoolV190.blockNumber,
        requestedBlocks: 0,
        desiredChunkBlocks: 0,
        externalRequestsUsed: 1,
        provider:
          "BITQUERY",
        logs: 1,
        resolved: true,
        resolutionPath:
          bitqueryResolutionPathV199 ||
          "V190_BITQUERY_REALTIME_INITIALIZE",
        error: null
      });

      continue;
    }

    /*
     * V188: first try the exact first-active block using blockHash.
     * This needs two RPC calls (block -> hash, then exact log query) but
     * completely avoids the provider's 10-block/limited range constraint.
     */
    let blockHashResolvedPoolV188 =
      null;

    if (
      output.rpcBlockHashInitializeV188
        .attempts < 1 &&
      (
        resolverRequestLimit -
        output.requestsUsed
      ) >= 2
    ) {
      const blockHashV188 =
        await getInitializeForPoolBlockHashV188(
          env,
          state,
          poolId,
          entry.firstActiveBlock,
          budget,
          Math.min(
            2,
            resolverRequestLimit -
              output.requestsUsed
          )
        );

      output.rpcBlockHashInitializeV188
        .attempts +=
          blockHashV188.attempted
            ? 1
            : 0;

      output.rpcBlockHashInitializeV188
        .requestsUsed +=
          safeNumber(
            blockHashV188.externalRequestsUsed
          );

      output.requestsUsed +=
        safeNumber(
          blockHashV188.externalRequestsUsed
        );

      output.rpcBlockHashInitializeV188
        .selectedPoolId =
          poolId;

      output.rpcBlockHashInitializeV188
        .blockNumber =
          blockHashV188.blockNumber;

      output.rpcBlockHashInitializeV188
        .blockHash =
          blockHashV188.blockHash;

      output.rpcBlockHashInitializeV188
        .provider =
          blockHashV188.provider;

      output.rpcBlockHashInitializeV188
        .status =
          blockHashV188.status;

      output.rpcBlockHashInitializeV188
        .checkpointOutcomeV189 =
          blockHashV188.resolvedPool
            ? "RESOLVED"
            : (
                blockHashV188.status === "EMPTY"
                  ? "EMPTY"
                  : (
                      blockHashV188.attempted
                        ? "ERROR"
                        : "BUDGET_BLOCKED"
                    )
              );

      output.rpcBlockHashInitializeV188
        .error =
          blockHashV188.error;

      if (
        blockHashV188.resolvedPool
      ) {
        blockHashResolvedPoolV188 =
          blockHashV188.resolvedPool;

        output.rpcBlockHashInitializeV188
          .resolved = 1;
      } else if (
        blockHashV188.attempted
      ) {
        output.rpcBlockHashInitializeV188
          .fallbackToRangeCrawler =
            true;
      }
    }

    if (
      blockHashResolvedPoolV188
    ) {
      entry.lastResolvedSearchDistance =
        unknownPoolSearchDistance(
          entry
        );

      entry.consecutiveEmptySearches =
        0;

      registerPoolMapping(
        state,
        blockHashResolvedPoolV188
      );

      for (
        const address
        of [
          blockHashResolvedPoolV188.currency0,
          blockHashResolvedPoolV188.currency1
        ]
      ) {
        if (
          !isAddress(address) ||
          address === ZERO ||
          knownQuote(address)
        ) {
          continue;
        }

        addWatch(
          state,
          address,
          blockHashResolvedPoolV188,
          "V188_RPC_BLOCKHASH_INITIALIZE"
        );
      }

      delete tracker[
        poolId
      ];

      output.resolved++;

      output.resolvedPoolIds.push(
        poolId
      );

      output.probes.push({
        poolId,
        resolverLane,
        activityScore:
          activityScore(entry),
        swapEvents:
          safeNumber(entry.swapEvents),
        liquidityEvents:
          safeNumber(entry.liquidityEvents),
        appearances:
          safeNumber(entry.appearances),
        fromBlock:
          blockHashV188.blockNumber,
        toBlock:
          blockHashV188.blockNumber,
        requestedBlocks: 1,
        desiredChunkBlocks: 1,
        externalRequestsUsed:
          safeNumber(
            blockHashV188.externalRequestsUsed
          ),
        provider:
          blockHashV188.provider,
        logs:
          blockHashV188.logs?.length ||
          0,
        resolved: true,
        resolutionPath:
          "V188_RPC_BLOCKHASH_INITIALIZE",
        error: null
      });

      continue;
    }

    /*
     * V184: spend at most one of the EXISTING resolver requests on a wide,
     * exact pool-id Initialize lookup. This is especially valuable while
     * Alchemy's proven exact-range size is only 10 blocks.
     */
    let wideResolvedPoolV184 =
      null;

    if (
      output.blockscoutWideInitializeV184
        .attempts < 1 &&
      output.requestsUsed <
        resolverRequestLimit
    ) {
      const wideV184 =
        await blockscoutWideInitializeForPoolV184(
          state,
          budget,
          poolId,
          entry.firstActiveBlock
        );

      output.blockscoutWideInitializeV184
        .attempts +=
          wideV184.attempted
            ? 1
            : 0;

      output.blockscoutWideInitializeV184
        .requestsUsed +=
          safeNumber(
            wideV184.externalRequestsUsed
          );

      output.blockscoutWideInitializeV184
        .status =
          wideV184.status ||
          null;

      output.blockscoutWideInitializeV184
        .selectedPoolId =
          poolId;

      output.blockscoutWideInitializeV184
        .fromBlock =
          wideV184.fromBlock;

      output.blockscoutWideInitializeV184
        .toBlock =
          wideV184.toBlock;

      output.blockscoutWideInitializeV184
        .service =
          blockscoutWideInitializeTelemetryV184(
            state
          );

      output.requestsUsed +=
        safeNumber(
          wideV184.externalRequestsUsed
        );

      if (
        wideV184.resolvedPool
      ) {
        wideResolvedPoolV184 =
          wideV184.resolvedPool;

        output.blockscoutWideInitializeV184
          .resolved = 1;
      } else if (
        wideV184.attempted
      ) {
        output.blockscoutWideInitializeV184
          .fallbackToRpc = true;
      }
    }

    if (
      wideResolvedPoolV184
    ) {
      entry.lastResolvedSearchDistance =
        unknownPoolSearchDistance(
          entry
        );

      entry.consecutiveEmptySearches =
        0;

      registerPoolMapping(
        state,
        wideResolvedPoolV184
      );

      for (
        const address
        of [
          wideResolvedPoolV184.currency0,
          wideResolvedPoolV184.currency1
        ]
      ) {
        if (
          !isAddress(address) ||
          address === ZERO ||
          knownQuote(address)
        ) {
          continue;
        }

        addWatch(
          state,
          address,
          wideResolvedPoolV184,
          "V184_BLOCKSCOUT_WIDE_EXACT_INITIALIZE"
        );
      }

      delete tracker[poolId];

      output.resolved++;

      output.resolvedPoolIds.push(
        poolId
      );

      output.probes.push({
        poolId,
        resolverLane,
        activityScore:
          activityScore(entry),
        swapEvents:
          safeNumber(entry.swapEvents),
        liquidityEvents:
          safeNumber(entry.liquidityEvents),
        appearances:
          safeNumber(entry.appearances),
        fromBlock:
          output.blockscoutWideInitializeV184.fromBlock,
        toBlock:
          output.blockscoutWideInitializeV184.toBlock,
        requestedBlocks:
          output.blockscoutWideInitializeV184.fromBlock !== null &&
          output.blockscoutWideInitializeV184.toBlock !== null
            ? (
                output.blockscoutWideInitializeV184.toBlock -
                output.blockscoutWideInitializeV184.fromBlock +
                1
              )
            : 0,
        desiredChunkBlocks:
          BLOCKSCOUT_WIDE_INITIALIZE_LOOKBACK_BLOCKS_V184,
        externalRequestsUsed: 1,
        provider: "BLOCKSCOUT",
        logs: 1,
        resolved: true,
        resolutionPath:
          "V184_BLOCKSCOUT_WIDE_EXACT_INITIALIZE",
        error: null
      });

      continue;
    }

    if (
      output.requestsUsed >=
        resolverRequestLimit
    ) {
      continue;
    }

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


function isRpcAbortLikeV156(
  value
) {
  const text =
    String(
      value ||
      ""
    ).toLowerCase();

  return (
    text.includes(
      "operation was aborted"
    ) ||
    text.includes(
      "aborterror"
    ) ||
    text.includes(
      "aborted"
    ) ||
    text.includes(
      "timeout"
    ) ||
    text.includes(
      "timed out"
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

            address: [
              POOL_MANAGER,
              ...POOLS_TRADE_ENTRY_CONTRACTS_V204,
              POOLS_TRADE_TOKEN_FACTORY_V204,
              ...POOLS_TRADE_LAUNCHPADS_V204
            ]
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

  let abortRecoveryAttemptsV156 =
    0;

  let abortRecoverySuccessesV156 =
    0;

  let abortAlternateProviderRetriesV156 =
    0;

  let abortSameProviderRetriesV156 =
    0;

  const abortRecoveryKeysV156 =
    new Set();

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
      isRpcAbortLikeV156(
        response.error
      )
    ) {
      const recoveryKeyV156 =
        `${provider}:${cursor.toString()}:${chunkTo.toString()}`;

      if (
        !abortRecoveryKeysV156.has(
          recoveryKeyV156
        ) &&
        budgetAvailable(
          budget,
          "discovery-live"
        )
      ) {
        abortRecoveryKeysV156.add(
          recoveryKeyV156
        );

        abortRecoveryAttemptsV156++;

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
          abortAlternateProviderRetriesV156++;

          const retry =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-live",
              alternate
            );

          if (
            Array.isArray(
              retry.result
            )
          ) {
            provider =
              alternate;

            response =
              retry;

            abortRecoverySuccessesV156++;
          }
        }

        else if (
          budgetAvailable(
            budget,
            "discovery-live"
          )
        ) {
          abortSameProviderRetriesV156++;

          const retry =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-live",
              provider
            );

          response =
            retry;

          if (
            Array.isArray(
              retry.result
            )
          ) {
            abortRecoverySuccessesV156++;
          }
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

    providerHeadRetries,

    abortRecoveryV156: {
      enabled:
        true,
      attempts:
        abortRecoveryAttemptsV156,
      successes:
        abortRecoverySuccessesV156,
      alternateProviderRetries:
        abortAlternateProviderRetriesV156,
      sameProviderRetries:
        abortSameProviderRetriesV156
    }
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

  let abortRecoveryAttemptsV156 =
    0;

  let abortRecoverySuccessesV156 =
    0;

  let abortAlternateProviderRetriesV156 =
    0;

  let abortSameProviderRetriesV156 =
    0;

  const abortRecoveryKeysV156 =
    new Set();

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
      ) &&
      isRpcAbortLikeV156(
        response.error
      )
    ) {
      const recoveryKeyV156 =
        `${provider}:${cursor.toString()}:${chunkTo.toString()}`;

      if (
        !abortRecoveryKeysV156.has(
          recoveryKeyV156
        ) &&
        budgetAvailable(
          budget,
          "discovery-backlog"
        )
      ) {
        abortRecoveryKeysV156.add(
          recoveryKeyV156
        );

        abortRecoveryAttemptsV156++;

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
          abortAlternateProviderRetriesV156++;

          const retry =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-backlog",
              alternate
            );

          if (
            Array.isArray(
              retry.result
            )
          ) {
            provider =
              alternate;

            response =
              retry;

            abortRecoverySuccessesV156++;
          }
        }

        else if (
          budgetAvailable(
            budget,
            "discovery-backlog"
          )
        ) {
          abortSameProviderRetriesV156++;

          const retry =
            await getLogsSingleProvider(
              env,
              cursor,
              chunkTo,
              budget,
              "discovery-backlog",
              provider
            );

          response =
            retry;

          if (
            Array.isArray(
              retry.result
            )
          ) {
            abortRecoverySuccessesV156++;
          }
        }
      }
    }

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

    abortRecoveryV156: {
      enabled:
        true,
      attempts:
        abortRecoveryAttemptsV156,
      successes:
        abortRecoverySuccessesV156,
      alternateProviderRetries:
        abortAlternateProviderRetriesV156,
      sameProviderRetries:
        abortSameProviderRetriesV156
    },

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


/* =========================================================
   V179 ON-CHAIN V4 DIRECTIONAL SWAP LEDGER
   ========================================================= */

/*
 * Canonical Uniswap v4 PoolManager Swap event:
 * Swap(
 *   PoolId indexed id,
 *   address indexed sender,
 *   int128 amount0,
 *   int128 amount1,
 *   uint160 sqrtPriceX96,
 *   uint128 liquidity,
 *   int24 tick,
 *   uint24 fee
 * )
 *
 * amount0/amount1 are POOL balance deltas:
 * positive => pool receives that currency
 * negative => pool sends that currency
 *
 * Therefore for a candidate token:
 * candidate delta < 0 => candidate was bought
 * candidate delta > 0 => candidate was sold
 *
 * V179 deliberately keeps USD verification separate. It records exact
 * quote-token amounts and exposes canonical USDG amounts, but does not
 * claim exact USD until a separately verified USD conversion exists.
 */

function abiWordV179(
  data,
  index
) {
  const clean =
    String(
      data ||
      ""
    ).replace(
      /^0x/,
      ""
    );

  const start =
    index * 64;

  if (
    clean.length <
      start + 64
  ) {
    return null;
  }

  return clean.slice(
    start,
    start + 64
  );
}

function decodeSignedInt128WordV179(
  word
) {
  if (
    !/^[0-9a-fA-F]{64}$/.test(
      String(
        word ||
        ""
      )
    )
  ) {
    return null;
  }

  try {
    const raw =
      BigInt(
        "0x" +
        word
      );

    const mask =
      (1n << 128n) -
      1n;

    const low =
      raw &
      mask;

    const signBit =
      1n << 127n;

    return (
      low &
      signBit
    ) !==
      0n
      ? low -
        (1n << 128n)
      : low;
  } catch {
    return null;
  }
}

function absBigIntV179(
  value
) {
  return value <
    0n
    ? -value
    : value;
}

function decimalBigIntStringV179(
  rawValue,
  decimals
) {
  try {
    const value =
      BigInt(
        rawValue
      );

    const negative =
      value <
      0n;

    const absolute =
      negative
        ? -value
        : value;

    const d =
      Math.max(
        0,
        Math.floor(
          safeNumber(
            decimals
          )
        )
      );

    if (
      d === 0
    ) {
      return (
        negative
          ? "-"
          : ""
      ) +
        absolute.toString();
    }

    const base =
      10n **
      BigInt(
        d
      );

    const whole =
      absolute /
      base;

    const fraction =
      (
        absolute %
        base
      )
        .toString()
        .padStart(
          d,
          "0"
        )
        .replace(
          /0+$/,
          ""
        );

    return (
      negative
        ? "-"
        : ""
    ) +
      whole.toString() +
      (
        fraction
          ? "." +
            fraction
          : ""
      );
  } catch {
    return null;
  }
}

function bigintDecimalToNumberV187(
  raw,
  decimals
) {
  try {
    const value =
      BigInt(raw);

    const negative =
      value < 0n;

    const abs =
      negative
        ? -value
        : value;

    const scale =
      10n ** BigInt(decimals);

    const whole =
      abs / scale;

    const fraction =
      abs % scale;

    const fractionString =
      fraction
        .toString()
        .padStart(
          decimals,
          "0"
        )
        .slice(
          0,
          Math.min(
            decimals,
            12
          )
        );

    const numeric =
      Number(
        `${negative ? "-" : ""}${whole.toString()}.${fractionString || "0"}`
      );

    return Number.isFinite(numeric)
      ? numeric
      : null;
  } catch {
    return null;
  }
}

function medianNumberV187(
  values
) {
  const clean =
    (values || [])
      .map(safeNumber)
      .filter(
        value =>
          Number.isFinite(value) &&
          value > 0
      )
      .sort(
        (a, b) => a - b
      );

  if (!clean.length) {
    return null;
  }

  const middle =
    Math.floor(
      clean.length / 2
    );

  if (
    clean.length % 2 === 1
  ) {
    return clean[middle];
  }

  return (
    clean[middle - 1] +
    clean[middle]
  ) / 2;
}



function encodeAddressWordV195(
  address
) {
  return normalize(address)
    .replace(/^0x/, "")
    .padStart(64, "0");
}

function encodeUint24WordV195(
  value
) {
  return Math.max(
    0,
    Math.floor(
      safeNumber(value)
    )
  )
    .toString(16)
    .padStart(64, "0");
}

function decodeAddressWordV195(
  hex
) {
  const clean =
    String(hex || "")
      .replace(/^0x/, "");

  if (clean.length < 64) {
    return null;
  }

  const address =
    normalize(
      "0x" +
      clean.slice(24, 64)
    );

  return isAddress(address)
    ? address
    : null;
}

function decodeUint256WordV195(
  hex,
  wordIndex = 0
) {
  const clean =
    String(hex || "")
      .replace(/^0x/, "");

  const start =
    wordIndex * 64;

  const word =
    clean.slice(
      start,
      start + 64
    );

  if (word.length !== 64) {
    return null;
  }

  try {
    return BigInt(
      "0x" + word
    );
  } catch {
    return null;
  }
}

async function ethCallV195(
  env,
  state,
  budget,
  to,
  data,
  label
) {
  if (
    !budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    return {
      ok: false,
      status:
        "ANALYSIS_BUDGET_PROTECTED",
      result: null,
      externalRequestsUsed: 0,
      error: null
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      label
    )
  ) {
    return {
      ok: false,
      status:
        "ANALYSIS_BUDGET_PROTECTED",
      result: null,
      externalRequestsUsed: 0,
      error: null
    };
  }

  const rpcUrl =
    String(
      env.ALCHEMY_RPC_URL ||
      env.ROBINHOOD_RPC_URL ||
      PUBLIC_RPC
    ).trim();

  try {
    const response =
      await fetch(
        rpcUrl,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json"
          },
          body:
            JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "eth_call",
              params: [
                {
                  to,
                  data
                },
                "latest"
              ]
            })
        }
      );

    const payload =
      await response.json();

    if (
      !response.ok ||
      payload?.error
    ) {
      return {
        ok: false,
        status:
          payload?.error
            ? "RPC_ERROR"
            : `HTTP_${response.status}`,
        result: null,
        externalRequestsUsed: 1,
        error:
          payload?.error?.message ||
          null
      };
    }

    return {
      ok: true,
      status: "OK",
      result:
        payload?.result ||
        null,
      externalRequestsUsed: 1,
      error: null
    };
  } catch (error) {
    return {
      ok: false,
      status:
        "FETCH_ERROR",
      result: null,
      externalRequestsUsed: 1,
      error:
        errorString(error)
    };
  }
}

function sqrtPriceX96ToUsdGPerWethV195(
  sqrtPriceX96,
  token0,
  token1
) {
  if (
    sqrtPriceX96 === null ||
    sqrtPriceX96 <= 0n
  ) {
    return null;
  }

  const t0 =
    normalize(token0);

  const t1 =
    normalize(token1);

  const pairValid =
    (
      t0 === CANONICAL_WETH_V179 &&
      t1 === CANONICAL_USDG_V179
    ) ||
    (
      t1 === CANONICAL_WETH_V179 &&
      t0 === CANONICAL_USDG_V179
    );

  if (!pairValid) {
    return null;
  }

  /*
   * raw token1/token0 = sqrtPriceX96^2 / 2^192.
   * Convert with token decimals. Use Number only after scaling the ratio;
   * ETH/USD values are comfortably inside IEEE finite range.
   */
  const sqrt =
    Number(
      sqrtPriceX96
    );

  if (
    !Number.isFinite(sqrt) ||
    sqrt <= 0
  ) {
    return null;
  }

  const rawToken1PerToken0 =
    (sqrt * sqrt) /
    Math.pow(2, 192);

  if (
    !Number.isFinite(
      rawToken1PerToken0
    ) ||
    rawToken1PerToken0 <= 0
  ) {
    return null;
  }

  const wethDecimals =
    CANONICAL_WETH_DECIMALS_V187;

  const usdgDecimals =
    CANONICAL_USDG_DECIMALS_V179;

  if (
    t0 === CANONICAL_WETH_V179
  ) {
    return (
      rawToken1PerToken0 *
      Math.pow(
        10,
        wethDecimals -
        usdgDecimals
      )
    );
  }

  const token0PerToken1 =
    1 /
    rawToken1PerToken0;

  return (
    token0PerToken1 *
    Math.pow(
      10,
      wethDecimals -
      usdgDecimals
    )
  );
}


async function getUniswapEthUsdGReferenceV196(
  env,
  budget
) {
  const apiKey =
    String(
      env.UNISWAP_API_KEY ||
      ""
    ).trim();

  const base = {
    attempted: false,
    configured:
      Boolean(apiKey),
    chainId: 4663,
    tokenIn: ZERO,
    tokenOut:
      CANONICAL_USDG_V179,
    inputWei:
      ONE_NATIVE_ETH_WEI_V196,
    outputRaw: null,
    routing: null,
    verified: false,
    priceUsdGPerWeth: null,
    source:
      "UNISWAP_AGGREGATED_NATIVE_ETH_TO_CANONICAL_USDG_QUOTE_V196",
    status: null,
    httpStatus: null,
    externalRequestsUsed: 0,
    error: null
  };

  if (!apiKey) {
    return {
      ...base,
      status:
        "UNISWAP_API_KEY_NOT_CONFIGURED"
    };
  }

  if (
    !budgetAvailable(
      budget,
      "analysis"
    ) ||
    !consumeBudget(
      budget,
      "analysis",
      "UNISWAP_ETH_USDG_REFERENCE_V196"
    )
  ) {
    return {
      ...base,
      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  try {
    const response =
      await fetch(
        UNISWAP_TRADE_API_V196,
        {
          method: "POST",
          headers: {
            "x-api-key":
              apiKey,
            "content-type":
              "application/json",
            accept:
              "application/json",
            /*
             * We only need a quote, never execution. Keeping this false allows
             * CLASSIC routing without requiring an EIP-7914 smart wallet.
             */
            "x-erc20eth-enabled":
              "false"
          },
          body:
            JSON.stringify({
              type:
                "EXACT_INPUT",
              amount:
                ONE_NATIVE_ETH_WEI_V196,
              tokenInChainId:
                4663,
              tokenOutChainId:
                4663,
              tokenIn:
                ZERO,
              tokenOut:
                CANONICAL_USDG_V179,
              swapper:
                UNISWAP_REFERENCE_SWAPPER_V196,
              routingPreference:
                "BEST_PRICE",
              slippageTolerance:
                0.5
            })
        }
      );

    const httpStatus =
      response.status;

    let payload =
      null;

    try {
      payload =
        await response.json();
    } catch {
      payload =
        null;
    }

    if (!response.ok) {
      return {
        ...base,
        attempted: true,
        httpStatus,
        externalRequestsUsed: 1,
        status:
          `HTTP_${httpStatus}`,
        error:
          payload?.detail ||
          payload?.error ||
          payload?.message ||
          payload?.errors?.[0]?.message ||
          null
      };
    }

    const quote =
      payload?.quote ||
      null;

    const output =
      quote?.output ||
      quote?.aggregatedOutputs?.[0] ||
      null;

    const outputToken =
      normalize(
        output?.token
      );

    const outputRaw =
      String(
        output?.amount ||
        output?.startAmount ||
        ""
      ).trim();

    let outputBigInt =
      null;

    try {
      outputBigInt =
        BigInt(outputRaw);
    } catch {
      outputBigInt =
        null;
    }

    if (
      outputToken !==
        CANONICAL_USDG_V179 ||
      outputBigInt === null ||
      outputBigInt <= 0n
    ) {
      return {
        ...base,
        attempted: true,
        httpStatus,
        externalRequestsUsed: 1,
        routing:
          payload?.routing ||
          null,
        outputRaw:
          outputRaw || null,
        status:
          "QUOTE_OUTPUT_UNVERIFIED",
        error:
          outputToken &&
          outputToken !==
            CANONICAL_USDG_V179
            ? "OUTPUT_TOKEN_NOT_CANONICAL_USDG"
            : "OUTPUT_AMOUNT_INVALID"
      };
    }

    const usdGAmount =
      bigintDecimalToNumberV187(
        outputBigInt,
        CANONICAL_USDG_DECIMALS_V179
      );

    if (
      !Number.isFinite(
        usdGAmount
      ) ||
      usdGAmount <= 0
    ) {
      return {
        ...base,
        attempted: true,
        httpStatus,
        externalRequestsUsed: 1,
        routing:
          payload?.routing ||
          null,
        outputRaw,
        status:
          "QUOTE_PRICE_UNVERIFIED"
      };
    }

    return {
      ...base,
      attempted: true,
      httpStatus,
      externalRequestsUsed: 1,
      routing:
        payload?.routing ||
        null,
      outputRaw,
      verified: true,
      priceUsdGPerWeth:
        usdGAmount,
      status:
        "VERIFIED"
    };
  } catch (error) {
    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status:
        "FETCH_ERROR",
      error:
        errorString(error)
    };
  }
}

async function getV3WethUsdGReferenceV195(
  env,
  state,
  budget
) {
  const factory =
    normalize(
      UNISWAP_V3_FACTORY_V195
    );

  const base = {
    attempted: false,
    configured:
      isAddress(factory) &&
      factory !== ZERO,
    factory:
      isAddress(factory)
        ? factory
        : null,
    feeTiersChecked: [],
    selectedFee: null,
    poolAddress: null,
    token0: null,
    token1: null,
    liquidity: null,
    sqrtPriceX96: null,
    verified: false,
    priceUsdGPerWeth: null,
    source:
      "UNISWAP_V3_CANONICAL_WETH_USDG_SLOT0_V195",
    status: null,
    externalRequestsUsed: 0,
    error: null
  };

  if (
    !isAddress(factory) ||
    factory === ZERO
  ) {
    return {
      ...base,
      status:
        "V3_FACTORY_NOT_CONFIGURED"
    };
  }

  /*
   * getPool(address,address,uint24)
   * selector = 0x1698ee82
   */
  const getPoolSelector =
    "1698ee82";

  let requestsUsed =
    0;

  for (
    const fee
    of V3_STANDARD_FEES_V195
  ) {
    const data =
      "0x" +
      getPoolSelector +
      encodeAddressWordV195(
        CANONICAL_WETH_V179
      ) +
      encodeAddressWordV195(
        CANONICAL_USDG_V179
      ) +
      encodeUint24WordV195(
        fee
      );

    const result =
      await ethCallV195(
        env,
        state,
        budget,
        factory,
        data,
        `V195_V3_GETPOOL_${fee}`
      );

    requestsUsed +=
      safeNumber(
        result.externalRequestsUsed
      );

    base.feeTiersChecked.push({
      fee,
      status:
        result.status
    });

    if (!result.ok) {
      continue;
    }

    const pool =
      decodeAddressWordV195(
        result.result
      );

    if (
      !isAddress(pool) ||
      pool === ZERO
    ) {
      continue;
    }

    /*
     * token0() 0x0dfe1681
     * token1() 0xd21220a7
     * slot0()  0x3850c7bd
     * liquidity() 0x1a686502
     */
    const calls = [];

    for (
      const [name, selector]
      of [
        ["token0", "0x0dfe1681"],
        ["token1", "0xd21220a7"],
        ["slot0", "0x3850c7bd"],
        ["liquidity", "0x1a686502"]
      ]
    ) {
      const call =
        await ethCallV195(
          env,
          state,
          budget,
          pool,
          selector,
          `V195_V3_${name.toUpperCase()}`
        );

      requestsUsed +=
        safeNumber(
          call.externalRequestsUsed
        );

      calls.push([
        name,
        call
      ]);
    }

    const map =
      Object.fromEntries(
        calls
      );

    if (
      !map.token0?.ok ||
      !map.token1?.ok ||
      !map.slot0?.ok ||
      !map.liquidity?.ok
    ) {
      continue;
    }

    const token0 =
      decodeAddressWordV195(
        map.token0.result
      );

    const token1 =
      decodeAddressWordV195(
        map.token1.result
      );

    const sqrtPriceX96 =
      decodeUint256WordV195(
        map.slot0.result,
        0
      );

    const liquidity =
      decodeUint256WordV195(
        map.liquidity.result,
        0
      );

    const price =
      sqrtPriceX96ToUsdGPerWethV195(
        sqrtPriceX96,
        token0,
        token1
      );

    if (
      liquidity === null ||
      liquidity <= 0n ||
      !Number.isFinite(price) ||
      price <= 0
    ) {
      continue;
    }

    state.v3WethUsdGReferenceV195 = {
      factory,
      poolAddress:
        pool,
      fee,
      token0,
      token1,
      liquidity:
        liquidity.toString(),
      sqrtPriceX96:
        sqrtPriceX96.toString(),
      priceUsdGPerWeth:
        price,
      verifiedAt:
        nowIso()
    };

    return {
      ...base,
      attempted: true,
      selectedFee:
        fee,
      poolAddress:
        pool,
      token0,
      token1,
      liquidity:
        liquidity.toString(),
      sqrtPriceX96:
        sqrtPriceX96.toString(),
      verified: true,
      priceUsdGPerWeth:
        price,
      status:
        "VERIFIED",
      externalRequestsUsed:
        requestsUsed
    };
  }

  return {
    ...base,
    attempted:
      requestsUsed > 0,
    status:
      requestsUsed > 0
        ? "NO_VERIFIED_V3_WETH_USDG_POOL"
        : "ANALYSIS_BUDGET_PROTECTED",
    externalRequestsUsed:
      requestsUsed
  };
}

function canonicalWethUsdGPoolIdsV194(
  state
) {
  const ids =
    [];

  for (
    const [poolId, pool]
    of Object.entries(
      state?.poolRegistry ||
      {}
    )
  ) {
    const c0 =
      normalize(
        pool?.currency0
      );

    const c1 =
      normalize(
        pool?.currency1
      );

    if (
      (
        c0 === CANONICAL_WETH_V179 &&
        c1 === CANONICAL_USDG_V179
      ) ||
      (
        c1 === CANONICAL_WETH_V179 &&
        c0 === CANONICAL_USDG_V179
      )
    ) {
      ids.push(
        normalize(poolId)
      );
    }
  }

  return ids.filter(
    id =>
      /^0x[a-f0-9]{64}$/.test(id)
  );
}

function bitquerySignedIntegerV194(
  value
) {
  const candidates = [
    value?.bigInteger,
    value?.integer,
    value?.value,
    value?.string
  ];

  for (
    const raw
    of candidates
  ) {
    if (
      raw === null ||
      raw === undefined ||
      raw === ""
    ) {
      continue;
    }

    try {
      return BigInt(
        String(raw)
      );
    } catch {
      // continue
    }
  }

  return null;
}

async function getBitqueryWethUsdGReferenceV194(
  env,
  state,
  budget
) {
  const poolIds =
    canonicalWethUsdGPoolIdsV194(
      state
    );

  const base = {
    attempted: false,
    configured:
      Boolean(
        String(
          env.BITQUERY_ACCESS_TOKEN ||
          ""
        ).trim()
      ),
    poolIdsKnown:
      poolIds.length,
    selectedPoolId:
      poolIds[0] || null,
    status: null,
    httpStatus: null,
    verified: false,
    source:
      "BITQUERY_CANONICAL_WETH_USDG_LATEST_SWAP_V194",
    priceUsdGPerWeth: null,
    blockNumber: null,
    transactionHash: null,
    externalRequestsUsed: 0,
    error: null
  };

  const token =
    String(
      env.BITQUERY_ACCESS_TOKEN ||
      ""
    ).trim();

  if (!token) {
    return {
      ...base,
      status: "NOT_CONFIGURED"
    };
  }

  const poolId =
    poolIds[0];

  if (!poolId) {
    return {
      ...base,
      status:
        "NO_VERIFIED_CANONICAL_WETH_USDG_POOL_IN_REGISTRY"
    };
  }

  if (
    !budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    return {
      ...base,
      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "BITQUERY_WETH_USDG_REFERENCE_V194"
    )
  ) {
    return {
      ...base,
      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  const query = `
    {
      EVM(network: robinhood, dataset: realtime) {
        Events(
          limit: {count: 1}
          orderBy: {descending: Block_Time}
          where: {
            LogHeader: {
              Address: {
                is: "${POOL_MANAGER}"
              }
            }
            Log: {
              Signature: {
                Name: {
                  is: "Swap"
                }
              }
            }
            Topics: {
              includes: {
                Hash: {
                  is: "${poolId}"
                }
              }
            }
          }
        ) {
          Block {
            Number
            Time
          }
          Transaction {
            Hash
          }
          Arguments {
            Name
            Type
            Value {
              ... on EVM_ABI_BigInt_Value_Arg {
                bigInteger
              }
              ... on EVM_ABI_Integer_Value_Arg {
                integer
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response =
      await fetch(
        BITQUERY_GRAPHQL_V2,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            accept:
              "application/json",
            authorization:
              `Bearer ${token}`
          },
          body:
            JSON.stringify({
              query
            })
        }
      );

    const httpStatus =
      response.status;

    let payload =
      null;

    try {
      payload =
        await response.json();
    } catch {
      payload =
        null;
    }

    if (!response.ok) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          `HTTP_${httpStatus}`,
        error:
          payload?.errors?.[0]?.message ||
          `BITQUERY_HTTP_${httpStatus}`
      };
    }

    if (
      Array.isArray(
        payload?.errors
      ) &&
      payload.errors.length
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "GRAPHQL_ERROR",
        error:
          payload.errors
            .map(
              row =>
                String(
                  row?.message ||
                  "GRAPHQL_ERROR"
                )
            )
            .slice(0, 3)
            .join(" | ")
      };
    }

    const event =
      payload?.data?.EVM?.Events?.[0] ||
      null;

    if (!event) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "EMPTY_REALTIME_WINDOW"
      };
    }

    let amount0 =
      null;

    let amount1 =
      null;

    for (
      const argument
      of event.Arguments || []
    ) {
      const name =
        String(
          argument?.Name ||
          ""
        ).toLowerCase();

      if (name === "amount0") {
        amount0 =
          bitquerySignedIntegerV194(
            argument?.Value
          );
      }

      if (name === "amount1") {
        amount1 =
          bitquerySignedIntegerV194(
            argument?.Value
          );
      }
    }

    if (
      amount0 === null ||
      amount1 === null ||
      amount0 === 0n ||
      amount1 === 0n
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "SWAP_AMOUNTS_UNVERIFIED",
        blockNumber:
          safeNumber(
            event?.Block?.Number
          ) || null,
        transactionHash:
          normalize(
            event?.Transaction?.Hash
          ) || null
      };
    }

    const pool =
      state?.poolRegistry?.[
        poolId
      ] || {};

    const c0 =
      normalize(
        pool.currency0
      );

    const wethRaw =
      c0 ===
        CANONICAL_WETH_V179
        ? absBigIntV179(amount0)
        : absBigIntV179(amount1);

    const usdGRaw =
      c0 ===
        CANONICAL_USDG_V179
        ? absBigIntV179(amount0)
        : absBigIntV179(amount1);

    const wethAmount =
      bigintDecimalToNumberV187(
        wethRaw,
        CANONICAL_WETH_DECIMALS_V187
      );

    const usdGAmount =
      bigintDecimalToNumberV187(
        usdGRaw,
        CANONICAL_USDG_DECIMALS_V179
      );

    const price =
      wethAmount > 0 &&
      usdGAmount > 0
        ? usdGAmount /
          wethAmount
        : null;

    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus,
        status:
          "PRICE_UNVERIFIED",
        blockNumber:
          safeNumber(
            event?.Block?.Number
          ) || null,
        transactionHash:
          normalize(
            event?.Transaction?.Hash
          ) || null
      };
    }

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      httpStatus,
      status:
        "VERIFIED",
      verified: true,
      priceUsdGPerWeth:
        price,
      blockNumber:
        safeNumber(
          event?.Block?.Number
        ) || null,
      transactionHash:
        normalize(
          event?.Transaction?.Hash
        ) || null
    };
  } catch (error) {
    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status:
        "FETCH_ERROR",
      error:
        errorString(error)
    };
  }
}

function deriveCanonicalWethUsdGReferenceV187(
  state,
  logs
) {
  const prices =
    [];

  const referenceTrades =
    [];

  for (
    const log
    of logs || []
  ) {
    if (
      normalize(
        log?.topics?.[0]
      ) !== SWAP_TOPIC
    ) {
      continue;
    }

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    const pool =
      state?.poolRegistry?.[
        poolId
      ];

    const currency0 =
      normalize(
        pool?.currency0
      );

    const currency1 =
      normalize(
        pool?.currency1
      );

    const canonicalPair =
      (
        currency0 ===
          CANONICAL_WETH_V179 &&
        currency1 ===
          CANONICAL_USDG_V179
      ) ||
      (
        currency1 ===
          CANONICAL_WETH_V179 &&
        currency0 ===
          CANONICAL_USDG_V179
      );

    if (!canonicalPair) {
      continue;
    }

    const amount0 =
      decodeSignedInt128WordV179(
        abiWordV179(
          log?.data,
          0
        )
      );

    const amount1 =
      decodeSignedInt128WordV179(
        abiWordV179(
          log?.data,
          1
        )
      );

    if (
      amount0 === null ||
      amount1 === null ||
      amount0 === 0n ||
      amount1 === 0n ||
      (
        amount0 > 0n &&
        amount1 > 0n
      ) ||
      (
        amount0 < 0n &&
        amount1 < 0n
      )
    ) {
      continue;
    }

    const wethRaw =
      currency0 ===
        CANONICAL_WETH_V179
        ? absBigIntV179(amount0)
        : absBigIntV179(amount1);

    const usdGRaw =
      currency0 ===
        CANONICAL_USDG_V179
        ? absBigIntV179(amount0)
        : absBigIntV179(amount1);

    const wethAmount =
      bigintDecimalToNumberV187(
        wethRaw,
        CANONICAL_WETH_DECIMALS_V187
      );

    const usdGAmount =
      bigintDecimalToNumberV187(
        usdGRaw,
        CANONICAL_USDG_DECIMALS_V179
      );

    if (
      !wethAmount ||
      !usdGAmount ||
      wethAmount <= 0 ||
      usdGAmount <= 0
    ) {
      continue;
    }

    const priceUsdGPerWeth =
      usdGAmount /
      wethAmount;

    if (
      !Number.isFinite(
        priceUsdGPerWeth
      ) ||
      priceUsdGPerWeth <= 0
    ) {
      continue;
    }

    prices.push(
      priceUsdGPerWeth
    );

    referenceTrades.push({
      poolId,
      blockNumber:
        (() => {
          try {
            return Number(
              BigInt(
                log?.blockNumber ||
                "0x0"
              )
            ) || null;
          } catch {
            return null;
          }
        })(),
      transactionHash:
        normalize(
          log?.transactionHash
        ) || null,
      priceUsdGPerWeth
    });
  }

  const medianPrice =
    medianNumberV187(
      prices
    );

  return {
    verified:
      Number.isFinite(
        medianPrice
      ) &&
      medianPrice > 0,
    source:
      "CANONICAL_WETH_USDG_V4_SWAP_SAME_BATCH_V187",
    wethAddress:
      CANONICAL_WETH_V179,
    usdGAddress:
      CANONICAL_USDG_V179,
    referenceSwapCount:
      prices.length,
    priceUsdGPerWeth:
      Number.isFinite(
        medianPrice
      )
        ? medianPrice
        : null,
    aggregation:
      "MEDIAN_VALID_SAME_BATCH_SWAP_RATIOS",
    zeroExtraRequests:
      true,
    referenceTrades:
      referenceTrades.slice(
        -10
      )
  };
}

function decodeV4SwapDirectionalV179(
  state,
  log,
  wethUsdGReferenceV187 = null
) {
  if (
    normalize(
      log?.topics?.[0]
    ) !==
      SWAP_TOPIC
  ) {
    return null;
  }

  const poolId =
    normalize(
      log?.topics?.[1]
    );

  const pool =
    state
      ?.poolRegistry
      ?.[poolId];

  const currency0 =
    normalize(
      pool?.currency0
    );

  const currency1 =
    normalize(
      pool?.currency1
    );

  if (
    !/^0x[0-9a-f]{64}$/.test(
      String(
        poolId ||
        ""
      )
    ) ||
    !isAddress(
      currency0
    ) ||
    !isAddress(
      currency1
    )
  ) {
    return null;
  }

  const amount0 =
    decodeSignedInt128WordV179(
      abiWordV179(
        log?.data,
        0
      )
    );

  const amount1 =
    decodeSignedInt128WordV179(
      abiWordV179(
        log?.data,
        1
      )
    );

  if (
    amount0 ===
      null ||
    amount1 ===
      null ||
    amount0 ===
      0n ||
    amount1 ===
      0n
  ) {
    return null;
  }

  /*
   * A normal swap must move currencies in opposite pool-delta directions.
   * Reject malformed/non-swap-shaped data rather than infer.
   */
  if (
    (
      amount0 >
        0n &&
      amount1 >
        0n
    ) ||
    (
      amount0 <
        0n &&
      amount1 <
        0n
    )
  ) {
    return null;
  }

  let candidateAddress =
    null;

  let quoteTokenAddress =
    null;

  let candidateDelta =
    null;

  let quoteDelta =
    null;

  let candidateCurrencyIndex =
    null;

  if (
    isAddress(
      currency0
    ) &&
    currency0 !==
      ZERO &&
    !knownQuote(
      currency0
    ) &&
    (
      currency1 ===
        ZERO ||
      knownQuote(
        currency1
      )
    )
  ) {
    candidateAddress =
      currency0;

    quoteTokenAddress =
      currency1;

    candidateDelta =
      amount0;

    quoteDelta =
      amount1;

    candidateCurrencyIndex =
      0;
  }

  else if (
    isAddress(
      currency1
    ) &&
    currency1 !==
      ZERO &&
    !knownQuote(
      currency1
    ) &&
    (
      currency0 ===
        ZERO ||
      knownQuote(
        currency0
      )
    )
  ) {
    candidateAddress =
      currency1;

    quoteTokenAddress =
      currency0;

    candidateDelta =
      amount1;

    quoteDelta =
      amount0;

    candidateCurrencyIndex =
      1;
  }

  else {
    return null;
  }

  const side =
    candidateDelta <
      0n
      ? "buy"
      : "sell";

  /*
   * For a valid two-currency swap, quote delta should have the opposite sign.
   * Keep this explicit as a second direction-integrity check.
   */
  const directionConsistent =
    (
      side ===
        "buy" &&
      quoteDelta >
        0n
    ) ||
    (
      side ===
        "sell" &&
      quoteDelta <
        0n
    );

  if (
    !directionConsistent
  ) {
    return null;
  }

  const quoteRaw =
    absBigIntV179(
      quoteDelta
    );

  const candidateRaw =
    absBigIntV179(
      candidateDelta
    );

  const txHash =
    normalize(
      log?.transactionHash
    );

  const logIndex =
    String(
      log?.logIndex ||
      ""
    ).toLowerCase();

  const blockNumberHex =
    String(
      log?.blockNumber ||
      ""
    );

  let blockNumber =
    null;

  try {
    blockNumber =
      Number(
        BigInt(
          blockNumberHex ||
          "0x0"
        )
      );
  } catch {
    blockNumber =
      null;
  }

  const canonicalUsdG =
    quoteTokenAddress ===
      CANONICAL_USDG_V179;

  const usdGAmount =
    canonicalUsdG
      ? decimalBigIntStringV179(
          quoteRaw,
          CANONICAL_USDG_DECIMALS_V179
        )
      : null;

  const canonicalWeth =
    quoteTokenAddress ===
      CANONICAL_WETH_V179;

  const wethAmount =
    canonicalWeth
      ? bigintDecimalToNumberV187(
          quoteRaw,
          CANONICAL_WETH_DECIMALS_V187
        )
      : null;

  const nativeEthQuoteV192 =
    quoteTokenAddress === ZERO;

  const nativeEthAmountV192 =
    nativeEthQuoteV192
      ? bigintDecimalToNumberV187(
          quoteRaw,
          NATIVE_ETH_DECIMALS_V192
        )
      : null;

  const wethUsdGPriceV187 =
    safeNumber(
      wethUsdGReferenceV187
        ?.priceUsdGPerWeth
    );

  const wethUsdConvertedV187 =
    canonicalWeth &&
    wethAmount > 0 &&
    wethUsdGReferenceV187
      ?.verified === true &&
    wethUsdGPriceV187 > 0
      ? wethAmount *
        wethUsdGPriceV187
      : null;

  const nativeEthUsdConvertedV192 =
    nativeEthQuoteV192 &&
    nativeEthAmountV192 > 0 &&
    wethUsdGReferenceV187?.verified === true &&
    wethUsdGPriceV187 > 0
      ? nativeEthAmountV192 * wethUsdGPriceV187
      : null;

  const exactUsdAmountV187 =
    canonicalUsdG &&
    usdGAmount !== null
      ? safeNumber(usdGAmount)
      : (
          Number.isFinite(wethUsdConvertedV187) &&
          wethUsdConvertedV187 > 0
            ? wethUsdConvertedV187
            : (
                Number.isFinite(nativeEthUsdConvertedV192) &&
                nativeEthUsdConvertedV192 > 0
                  ? nativeEthUsdConvertedV192
                  : null
              )
        );

  return {
    verified:
      true,

    source:
      "UNISWAP_V4_POOLMANAGER_SWAP_V179",

    poolId,

    candidateAddress,

    quoteTokenAddress,

    candidateCurrencyIndex,

    side,

    amount0Raw:
      amount0.toString(),

    amount1Raw:
      amount1.toString(),

    candidateAmountRaw:
      candidateRaw.toString(),

    quoteAmountRaw:
      quoteRaw.toString(),

    canonicalUsdGQuote:
      canonicalUsdG,

    usdGAmountVerified:
      canonicalUsdG &&
      usdGAmount !==
        null,

    usdGAmount,

    canonicalWethQuote:
      canonicalWeth,

    wethAmountVerified:
      canonicalWeth &&
      wethAmount !== null,

    wethAmount:
      canonicalWeth
        ? wethAmount
        : null,

    wethUsdGReferenceVerifiedV187:
      canonicalWeth &&
      wethUsdGReferenceV187
        ?.verified === true,

    wethUsdGPriceV187:
      (canonicalWeth || nativeEthQuoteV192) &&
      wethUsdGPriceV187 > 0
        ? wethUsdGPriceV187
        : null,

    nativeEthQuoteV192,

    nativeEthAmountVerifiedV192:
      nativeEthQuoteV192 &&
      nativeEthAmountV192 !== null,

    nativeEthAmountV192:
      nativeEthQuoteV192
        ? nativeEthAmountV192
        : null,

    nativeEthUsesCanonicalWethUsdGReferenceV192:
      nativeEthQuoteV192 &&
      wethUsdGReferenceV187?.verified === true,

    nativeEthWrappedParityBasisV192:
      nativeEthQuoteV192
        ? "NATIVE_ETH_1_TO_1_WETH_WRAPPING_DENOMINATION"
        : null,

    exactUsdVerified:
      Number.isFinite(
        exactUsdAmountV187
      ) &&
      exactUsdAmountV187 > 0,

    exactUsdAmount:
      Number.isFinite(
        exactUsdAmountV187
      )
        ? exactUsdAmountV187
        : null,

    exactUsdSource:
      canonicalUsdG &&
      usdGAmount !== null
        ? "CANONICAL_USDG_DIRECT_V187"
        : (
            Number.isFinite(
              wethUsdConvertedV187
            )
              ? "CANONICAL_WETH_X_CANONICAL_WETH_USDG_ONCHAIN_REFERENCE_V187"
              : (
                  Number.isFinite(nativeEthUsdConvertedV192)
                    ? "NATIVE_ETH_1_TO_1_WETH_X_CANONICAL_WETH_USDG_ONCHAIN_REFERENCE_V192"
                    : null
                )
          ),

    blockNumber,

    transactionHash:
      txHash ||
      null,

    logIndex:
      logIndex ||
      null,

    tradeKey:
      [
        txHash ||
        "NO_TX",
        logIndex ||
        "NO_LOG",
        poolId
      ].join(
        ":"
      )
  };
}

function onChainDirectionalStoreV179(
  state
) {
  state.onChainDirectionalV179 =
    state.onChainDirectionalV179 &&
    typeof state.onChainDirectionalV179 ===
      "object" &&
    !Array.isArray(
      state.onChainDirectionalV179
    )
      ? state.onChainDirectionalV179
      : {};

  return state
    .onChainDirectionalV179;
}

function pruneOnChainDirectionalStoreV179(
  state
) {
  const store =
    onChainDirectionalStoreV179(
      state
    );

  const now =
    Date.now();

  const entries =
    Object.entries(
      store
    );

  for (
    const [
      address,
      ledger
    ]
    of entries
  ) {
    if (
      now -
      safeNumber(
        ledger?.lastSeenAt
      ) >
        ONCHAIN_DIRECTIONAL_RETENTION_MS_V179
    ) {
      delete store[
        address
      ];
    }
  }

  const remaining =
    Object.entries(
      store
    ).sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b?.[1]
            ?.lastSeenAt
        ) -
        safeNumber(
          a?.[1]
            ?.lastSeenAt
        )
    );

  for (
    const [
      address
    ]
    of remaining.slice(
      ONCHAIN_DIRECTIONAL_MAX_TOKENS_V179
    )
  ) {
    delete store[
      address
    ];
  }

  return store;
}


function resolvedPoolReplayDiagnosticV198(
  state,
  liveLogs,
  unknownPoolResolution,
  decodedOutput
) {
  const attempts =
    unknownPoolResolution
      ?.bitqueryInitializeV190
      ?.attemptHistoryV193 || [];

  const resolvedIds =
    Array.from(
      new Set(
        attempts
          .filter(
            row =>
              row?.resolved === true
          )
          .map(
            row =>
              normalize(
                row?.poolId
              )
          )
          .filter(Boolean)
      )
    );

  const swapTopic =
    normalize(
      SWAP_TOPIC
    );

  const traces =
    resolvedIds.map(
      poolId => {
        const pool =
          state?.poolRegistry?.[
            poolId
          ] || null;

        const matchingLogs =
          (liveLogs || [])
            .filter(
              log =>
                normalize(
                  log?.topics?.[0]
                ) === swapTopic &&
                normalize(
                  log?.topics?.[1]
                ) === poolId
            );

        const decodedTrades =
          (
            decodedOutput
              ?.sampleDecodedTrades ||
            decodedOutput
              ?.decodedTrades ||
            []
          ).filter(
            trade =>
              normalize(
                trade?.poolId
              ) === poolId
          );

        const rawSamples =
          matchingLogs
            .slice(0, 5)
            .map(
              log => {
                let decoded =
                  null;

                try {
                  decoded =
                    decodeV4SwapAmountsV179(
                      log
                    );
                } catch {
                  decoded =
                    null;
                }

                return {
                  blockNumber:
                    (() => {
                      try {
                        const value =
                          log?.blockNumber;

                        if (
                          value === null ||
                          value === undefined
                        ) {
                          return null;
                        }

                        if (
                          typeof value === "number"
                        ) {
                          return Number.isFinite(value)
                            ? value
                            : null;
                        }

                        return Number(
                          BigInt(value)
                        );
                      } catch {
                        return null;
                      }
                    })(),
                  transactionHash:
                    normalize(
                      log?.transactionHash
                    ),
                  amount0:
                    decoded?.amount0 !==
                      undefined &&
                    decoded?.amount0 !==
                      null
                      ? String(
                          decoded.amount0
                        )
                      : null,
                  amount1:
                    decoded?.amount1 !==
                      undefined &&
                    decoded?.amount1 !==
                      null
                      ? String(
                          decoded.amount1
                        )
                      : null,
                  rawData:
                    String(
                      log?.data ||
                      ""
                    ).slice(0, 194)
                };
              }
            );

        return {
          poolId,
          registryPresent:
            Boolean(pool),
          currency0:
            normalize(
              pool?.currency0
            ) || null,
          currency1:
            normalize(
              pool?.currency1
            ) || null,
          hooks:
            normalize(
              pool?.hooks
            ) || null,
          fee:
            pool?.fee ?? null,
          tickSpacing:
            pool?.tickSpacing ?? null,
          matchingLiveSwapCount:
            matchingLogs.length,
          decodedTradeCount:
            decodedTrades.length,
          rawSamples
        };
      }
    );

  return {
    enabled: true,
    externalRequestsAdded: 0,
    resolvedCurrentScanPoolCount:
      resolvedIds.length,
    resolvedCurrentScanPoolIds:
      resolvedIds,
    pools:
      traces,
    summary: {
      resolvedPoolsWithMatchingLiveSwaps:
        traces.filter(
          row =>
            row.matchingLiveSwapCount >
            0
        ).length,
      resolvedPoolsWithDecodedTrades:
        traces.filter(
          row =>
            row.decodedTradeCount >
            0
        ).length,
      resolvedPoolsMissingRegistryEntry:
        traces.filter(
          row =>
            !row.registryPresent
        ).length
    }
  };
}

function collectOnChainDirectionalSwapsV179(
  state,
  logs,
  externalWethUsdGReferenceV194 = null,
  v3WethUsdGReferenceV195 = null,
  uniswapEthUsdGReferenceV196 = null
) {
  const now =
    Date.now();

  const store =
    pruneOnChainDirectionalStoreV179(
      state
    );

  let swapLogsSeen =
    0;

  let decoded =
    0;

  let buys =
    0;

  let sells =
    0;

  let usdGQuoted =
    0;

  let wethQuotedV187 =
    0;

  let wethUsdConvertedV187 =
    0;

  let exactUsdVerified =
    0;

  let nativeEthQuotedDecodedV192 =
    0;

  let nativeEthExactUsdVerifiedV192 =
    0;

  const sameBatchWethUsdGReferenceV187 =
    deriveCanonicalWethUsdGReferenceV187(
      state,
      logs
    );

  const wethUsdGReferenceV187 =
    sameBatchWethUsdGReferenceV187
      ?.verified === true
      ? sameBatchWethUsdGReferenceV187
      : (
          uniswapEthUsdGReferenceV196
            ?.verified === true
            ? uniswapEthUsdGReferenceV196
            : (
                v3WethUsdGReferenceV195
                  ?.verified === true
                  ? v3WethUsdGReferenceV195
                  : (
                      externalWethUsdGReferenceV194
                        ?.verified === true
                        ? externalWethUsdGReferenceV194
                        : sameBatchWethUsdGReferenceV187
                    )
              )
        );

  let deduplicated =
    0;

  const rejectionReasons = {
    UNKNOWN_POOL_IDENTITY: 0,
    AMOUNT_DECODE_OR_ZERO: 0,
    SAME_SIGN_DELTAS: 0,
    CANDIDATE_QUOTE_IDENTITY_UNRESOLVED: 0,
    DIRECTION_INCONSISTENT: 0,
    OTHER: 0
  };

  const touchedTokens =
    new Set();

  // V202 diagnostic only: bounded local samples, zero external requests.
  // Captures the exact identities that fail the existing V180 candidate/quote gate.
  const candidateQuoteIdentitySamplesV202 = [];
  const candidateQuoteIdentitySampleLimitV202 = 20;

  for (
    const log
    of logs ||
    []
  ) {
    if (
      normalize(
        log?.topics?.[0]
      ) !==
        SWAP_TOPIC
    ) {
      continue;
    }

    swapLogsSeen++;

    const poolIdV180 =
      normalize(
        log?.topics?.[1]
      );

    const poolV180 =
      state
        ?.poolRegistry
        ?.[poolIdV180];

    if (
      !poolV180 ||
      !isAddress(
        normalize(
          poolV180?.currency0
        )
      ) ||
      !isAddress(
        normalize(
          poolV180?.currency1
        )
      )
    ) {
      rejectionReasons.UNKNOWN_POOL_IDENTITY++;
      continue;
    }

    const amount0V180 =
      decodeSignedInt128WordV179(
        abiWordV179(
          log?.data,
          0
        )
      );

    const amount1V180 =
      decodeSignedInt128WordV179(
        abiWordV179(
          log?.data,
          1
        )
      );

    if (
      amount0V180 === null ||
      amount1V180 === null ||
      amount0V180 === 0n ||
      amount1V180 === 0n
    ) {
      rejectionReasons.AMOUNT_DECODE_OR_ZERO++;
      continue;
    }

    if (
      (
        amount0V180 > 0n &&
        amount1V180 > 0n
      ) ||
      (
        amount0V180 < 0n &&
        amount1V180 < 0n
      )
    ) {
      rejectionReasons.SAME_SIGN_DELTAS++;
      continue;
    }

    const currency0V180 =
      normalize(
        poolV180?.currency0
      );

    const currency1V180 =
      normalize(
        poolV180?.currency1
      );

    const identityResolvableV180 =
      (
        currency0V180 !== ZERO &&
        !knownQuote(currency0V180) &&
        (
          currency1V180 === ZERO ||
          knownQuote(currency1V180)
        )
      ) ||
      (
        currency1V180 !== ZERO &&
        !knownQuote(currency1V180) &&
        (
          currency0V180 === ZERO ||
          knownQuote(currency0V180)
        )
      );

    if (
      !identityResolvableV180
    ) {
      rejectionReasons.CANDIDATE_QUOTE_IDENTITY_UNRESOLVED++;

      if (
        candidateQuoteIdentitySamplesV202.length <
          candidateQuoteIdentitySampleLimitV202
      ) {
        const c0IsZeroV202 =
          currency0V180 === ZERO;
        const c1IsZeroV202 =
          currency1V180 === ZERO;
        const c0KnownQuoteV202 =
          knownQuote(currency0V180);
        const c1KnownQuoteV202 =
          knownQuote(currency1V180);

        candidateQuoteIdentitySamplesV202.push({
          poolId: poolIdV180,
          currency0: currency0V180,
          currency1: currency1V180,
          currency0IsNativeZero: c0IsZeroV202,
          currency1IsNativeZero: c1IsZeroV202,
          currency0KnownQuote: c0KnownQuoteV202,
          currency1KnownQuote: c1KnownQuoteV202,
          currency0CandidateLike:
            !c0IsZeroV202 &&
            !c0KnownQuoteV202,
          currency1CandidateLike:
            !c1IsZeroV202 &&
            !c1KnownQuoteV202,
          classification:
            (
              !c0IsZeroV202 &&
              !c0KnownQuoteV202 &&
              !c1IsZeroV202 &&
              !c1KnownQuoteV202
            )
              ? "BOTH_SIDES_NONQUOTE"
              : (
                  (
                    c0IsZeroV202 ||
                    c0KnownQuoteV202
                  ) &&
                  (
                    c1IsZeroV202 ||
                    c1KnownQuoteV202
                  )
                )
                  ? "BOTH_SIDES_QUOTE_OR_NATIVE"
                  : "OTHER_IDENTITY_GATE_FAILURE",

          v203SafetyDecision:
            (
              !c0IsZeroV202 &&
              !c0KnownQuoteV202 &&
              !c1IsZeroV202 &&
              !c1KnownQuoteV202
            )
              ? "KEEP_UNRESOLVED_DO_NOT_GUESS_CANDIDATE"
              : "EXISTING_GATE_CLASSIFICATION",

          v203Reason:
            (
              !c0IsZeroV202 &&
              !c0KnownQuoteV202 &&
              !c1IsZeroV202 &&
              !c1KnownQuoteV202
            )
              ? "ROBINHOOD_V4_CONTAINS_NON_MEME_AND_TOKEN_TO_TOKEN_POOLS_POOLMANAGER_IS_NOT_POOLS_TRADE_ONLY"
              : null
        });
      }

      continue;
    }

    const trade =
      decodeV4SwapDirectionalV179(
        state,
        log,
        wethUsdGReferenceV187
      );

    if (
      !trade?.verified
    ) {
      rejectionReasons.DIRECTION_INCONSISTENT++;
      continue;
    }

    decoded++;

    if (
      trade.side ===
        "buy"
    ) {
      buys++;
    }

    else if (
      trade.side ===
        "sell"
    ) {
      sells++;
    }

    if (
      trade.usdGAmountVerified
    ) {
      usdGQuoted++;
    }

    if (
      trade.canonicalWethQuote
    ) {
      wethQuotedV187++;
    }

    if (
      trade.canonicalWethQuote &&
      trade.exactUsdVerified &&
      trade.exactUsdSource ===
        "CANONICAL_WETH_X_CANONICAL_WETH_USDG_ONCHAIN_REFERENCE_V187"
    ) {
      wethUsdConvertedV187++;
    }

    if (trade.nativeEthQuoteV192) {
      nativeEthQuotedDecodedV192++;
    }

    if (
      trade.nativeEthQuoteV192 &&
      trade.exactUsdVerified
    ) {
      nativeEthExactUsdVerifiedV192++;
    }

    if (
      trade.exactUsdVerified
    ) {
      exactUsdVerified++;
    }

    const token =
      normalize(
        trade.candidateAddress
      );

    if (
      !token
    ) {
      continue;
    }

    touchedTokens.add(
      token
    );

    const previous =
      store[token] &&
      typeof store[token] ===
        "object"
        ? store[token]
        : {};

    const records =
      Array.isArray(
        previous.records
      )
        ? previous.records
        : [];

    const keys =
      new Set(
        records.map(
          row =>
            String(
              row?.tradeKey ||
              ""
            )
        )
      );

    if (
      keys.has(
        trade.tradeKey
      )
    ) {
      deduplicated++;
      continue;
    }

    records.push({
      ...trade,
      observedAt:
        now
    });

    records.sort(
      (
        a,
        b
      ) =>
        safeNumber(
          a?.blockNumber
        ) -
        safeNumber(
          b?.blockNumber
        )
    );

    if (
      records.length >
        ONCHAIN_DIRECTIONAL_MAX_RECORDS_V179
    ) {
      records.splice(
        0,
        records.length -
          ONCHAIN_DIRECTIONAL_MAX_RECORDS_V179
      );
    }

    store[token] = {
      version:
        "V179",

      tokenAddress:
        token,

      firstSeenAt:
        safeNumber(
          previous.firstSeenAt
        ) ||
        now,

      lastSeenAt:
        now,

      poolIds:
        Array.from(
          new Set(
            records.map(
              row =>
                row.poolId
            )
          )
        ).slice(
          -8
        ),

      records
    };
  }

  pruneOnChainDirectionalStoreV179(
    state
  );

  return {
    enabled:
      true,

    source:
      "EXISTING_LIVE_ETH_GETLOGS_NO_EXTRA_REQUESTS",

    canonicalSwapAbiVerified:
      true,

    poolDeltaDirectionRule:
      "POSITIVE_POOL_RECEIVES_NEGATIVE_POOL_SENDS",

    swapLogsSeen,

    decoded,

    buys,

    sells,

    usdGQuoted,

    wethQuotedV187,

    wethUsdConvertedV187,

    wethUsdGReferenceV187,

    exactUsdVerified,

    nativeEthQuotedDecodedV192,

    nativeEthExactUsdVerifiedV192,

    nativeEthUsdValuationV192:
      "NATIVE_ETH_18_DECIMALS_X_SAME_BATCH_CANONICAL_WETH_USDG_REFERENCE",

    nativeEthUsdFallbackPolicyV192:
      "UNVERIFIED_IF_CANONICAL_WETH_USDG_REFERENCE_UNAVAILABLE",

    deduplicated,

    touchedTokens:
      Array.from(
        touchedTokens
      ),

    trackedTokenLedgers:
      Object.keys(
        onChainDirectionalStoreV179(
          state
        )
      ).length,

    rejectionReasons,

    knownPoolDecodeSuccessRate:
      (
        swapLogsSeen -
        safeNumber(
          rejectionReasons.UNKNOWN_POOL_IDENTITY
        )
      ) > 0
        ? decoded /
          (
            swapLogsSeen -
            safeNumber(
              rejectionReasons.UNKNOWN_POOL_IDENTITY
            )
          )
        : null,

    candidateQuoteIdentityDiagnosticV202: {
      enabled: true,
      mode: "LOCAL_ZERO_EXTERNAL_REQUESTS",
      purpose:
        "CAPTURE_EXACT_IDENTITY_GATE_FAILURE_PATTERN_WITHOUT_CHANGING_DECODER",
      rejectionCount:
        safeNumber(
          rejectionReasons
            .CANDIDATE_QUOTE_IDENTITY_UNRESOLVED
        ),
      sampleLimit:
        candidateQuoteIdentitySampleLimitV202,
      samplesCaptured:
        candidateQuoteIdentitySamplesV202.length,
      samples:
        candidateQuoteIdentitySamplesV202,
      externalRequestsAdded: 0,
      verifiedUsdPathChanged: false,
      decoderBehaviorChanged: false,
      v203ResearchGuard:
        "DO_NOT_PROMOTE_BOTH_SIDES_NONQUOTE_TO_KNOWN_QUOTE_WITHOUT_VERIFIED_IDENTITY",
      v203PoolsTradeIsolationRule:
        "POOLMANAGER_ALONE_IS_NOT_A_POOLS_TRADE_FILTER",
      poolsTradeLaunchRecognitionV204: {
        enabled: true,
        mode: "VERIFIED_INFRASTRUCTURE_REGISTRY",
        entryContracts:
          POOLS_TRADE_ENTRY_CONTRACTS_V204,
        tokenFactory:
          POOLS_TRADE_TOKEN_FACTORY_V204,
        launchpads:
          POOLS_TRADE_LAUNCHPADS_V204,
        tokenCreatedTopic:
          POOLS_TRADE_TOKEN_CREATED_TOPIC_V204,
        tokenLaunchedTopic:
          POOLS_TRADE_TOKEN_LAUNCHED_TOPIC_V204,
        poolManagerAloneClassifiesPoolsTrade: false,
        positiveIdentificationRequired: true,
        scoringBehaviorChanged: false,
        decoderBehaviorChanged: false,
        externalRequestsAdded: 0
      }
    },

    noExtraExternalRequests:
      true,

    usdPolicy:
      "V196_DIRECT_USDG_OR_ETH_WETH_WITH_VERIFIED_SAME_BATCH_OR_UNISWAP_AGGREGATED_OR_V3_OR_BITQUERY_REFERENCE"
  };
}


/* =========================================================
   V180 BLOCKSCOUT EXACT-POOL V4 USDG DIRECTIONAL USD
   ========================================================= */

function blockscoutLogTimestampMsV180(
  row
) {
  const raw =
    row?.timeStamp ??
    row?.timestamp ??
    null;

  if (
    raw === null ||
    raw === undefined
  ) {
    return null;
  }

  try {
    const seconds =
      String(raw).startsWith("0x")
        ? Number(BigInt(String(raw)))
        : Number(raw);

    return Number.isFinite(seconds) &&
      seconds > 0
      ? seconds * 1000
      : null;
  } catch {
    return null;
  }
}

function blockNumberFromAnyV180(
  value
) {
  try {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    if (
      typeof value === "number"
    ) {
      return Number.isFinite(value)
        ? Math.floor(value)
        : null;
    }

    const s =
      String(value);

    return s.startsWith("0x")
      ? Number(BigInt(s))
      : Number(s);
  } catch {
    return null;
  }
}

function v180PoolIdentityMatchesCandidate(
  candidate
) {
  const identity =
    candidate
      ?.onChainPoolIdentityV153;

  if (
    identity?.verified !== true
  ) {
    return false;
  }

  if (
    normalize(
      identity?.quoteTokenAddress
    ) !==
      CANONICAL_USDG_V179
  ) {
    return false;
  }

  if (
    normalize(
      identity?.candidateAddress
    ) !==
      normalize(
        candidate?.address
      )
  ) {
    return false;
  }

  return /^0x[0-9a-f]{64}$/.test(
    normalize(
      identity?.poolId
    )
  );
}

function v180DecodeExactPoolLog(
  candidate,
  row
) {
  const identity =
    candidate
      ?.onChainPoolIdentityV153;

  const data =
    row?.data;

  const amount0 =
    decodeSignedInt128WordV179(
      abiWordV179(
        data,
        0
      )
    );

  const amount1 =
    decodeSignedInt128WordV179(
      abiWordV179(
        data,
        1
      )
    );

  if (
    amount0 === null ||
    amount1 === null ||
    amount0 === 0n ||
    amount1 === 0n
  ) {
    return {
      verified: false,
      reason: "AMOUNT_DECODE_OR_ZERO"
    };
  }

  if (
    (
      amount0 > 0n &&
      amount1 > 0n
    ) ||
    (
      amount0 < 0n &&
      amount1 < 0n
    )
  ) {
    return {
      verified: false,
      reason: "SAME_SIGN_DELTAS"
    };
  }

  const candidateAddress =
    normalize(
      candidate?.address
    );

  const pool =
    candidateAddress &&
    identity?.poolId
      ? null
      : null;

  /*
   * V153 identity stores BASE/QUOTE semantics but V180 needs actual
   * currency index. Resolve it from the persistent pool registry when
   * available; never guess the index from display-side wording.
   */
  const poolId =
    normalize(
      identity?.poolId
    );

  const registryPool =
    candidate
      ? candidate.__v180RegistryPool
      : null;

  const currency0 =
    normalize(
      registryPool?.currency0
    );

  const currency1 =
    normalize(
      registryPool?.currency1
    );

  let candidateDelta =
    null;

  let quoteDelta =
    null;

  if (
    currency0 === candidateAddress &&
    currency1 === CANONICAL_USDG_V179
  ) {
    candidateDelta =
      amount0;
    quoteDelta =
      amount1;
  }

  else if (
    currency1 === candidateAddress &&
    currency0 === CANONICAL_USDG_V179
  ) {
    candidateDelta =
      amount1;
    quoteDelta =
      amount0;
  }

  else {
    return {
      verified: false,
      reason: "REGISTRY_CURRENCY_IDENTITY_UNAVAILABLE"
    };
  }

  const side =
    candidateDelta < 0n
      ? "buy"
      : "sell";

  const directionConsistent =
    (
      side === "buy" &&
      quoteDelta > 0n
    ) ||
    (
      side === "sell" &&
      quoteDelta < 0n
    );

  if (
    !directionConsistent
  ) {
    return {
      verified: false,
      reason: "DIRECTION_INCONSISTENT"
    };
  }

  const timestampMs =
    blockscoutLogTimestampMsV180(
      row
    );

  if (
    !timestampMs
  ) {
    return {
      verified: false,
      reason: "TIMESTAMP_UNAVAILABLE"
    };
  }

  const quoteRaw =
    absBigIntV179(
      quoteDelta
    );

  const usdString =
    decimalBigIntStringV179(
      quoteRaw,
      CANONICAL_USDG_DECIMALS_V179
    );

  const usdAmount =
    Number(
      usdString
    );

  if (
    !Number.isFinite(
      usdAmount
    ) ||
    usdAmount < 0
  ) {
    return {
      verified: false,
      reason: "USDG_AMOUNT_INVALID"
    };
  }

  return {
    verified: true,
    source: "BLOCKSCOUT_V4_SWAP_USDG_V180",
    poolId,
    side,
    timestampMs,
    blockNumber:
      blockNumberFromAnyV180(
        row?.blockNumber
      ),
    transactionHash:
      normalize(
        row?.transactionHash
      ) ||
      null,
    logIndex:
      String(
        row?.logIndex ??
        ""
      ),
    usdAmount,
    usdBasis:
      "CANONICAL_USDG_1_TO_1_USD_REDEMPTION",
    usdGQuoteVerified: true
  };
}

function v180WindowFromTrades(
  trades,
  now,
  windowKey,
  historyComplete
) {
  const windowMs =
    V180_WINDOW_MS[
      windowKey
    ];

  if (
    !windowMs
  ) {
    return {
      verified: false,
      reason: "UNKNOWN_WINDOW"
    };
  }

  if (
    historyComplete !== true
  ) {
    return {
      verified: false,
      source: "BLOCKSCOUT_V4_SWAP_USDG_V180",
      reason: "HISTORY_INCOMPLETE_OR_API_ROW_CEILING",
      coverageComplete: false
    };
  }

  const cutoff =
    now -
    windowMs;

  const rows =
    (trades || [])
      .filter(
        row =>
          row?.verified === true &&
          safeNumber(
            row?.timestampMs
          ) >= cutoff &&
          safeNumber(
            row?.timestampMs
          ) <= now + 60000
      );

  let buyVolumeUsd =
    0;

  let sellVolumeUsd =
    0;

  let buys =
    0;

  let sells =
    0;

  for (
    const row
    of rows
  ) {
    if (
      row.side === "buy"
    ) {
      buys++;
      buyVolumeUsd +=
        safeNumber(
          row.usdAmount
        );
    }

    else if (
      row.side === "sell"
    ) {
      sells++;
      sellVolumeUsd +=
        safeNumber(
          row.usdAmount
        );
    }
  }

  const totalUsd =
    buyVolumeUsd +
    sellVolumeUsd;

  return {
    verified: true,
    source: "BLOCKSCOUT_V4_SWAP_USDG_V180",
    usdBasis:
      "CANONICAL_USDG_1_TO_1_USD_REDEMPTION",
    asOfAt: now,
    coverageStartAt: cutoff,
    coverageEndAt: now,
    coverageComplete: true,
    buys,
    sells,
    returnedTrades:
      rows.length,
    buyVolumeUsd,
    sellVolumeUsd,
    netFlowUsd:
      buyVolumeUsd -
      sellVolumeUsd,
    buyPressureUsd:
      totalUsd > 0
        ? (
            buyVolumeUsd /
            totalUsd
          ) * 100
        : 0
  };
}

function blockscoutDirectionalUsdServiceV183(
  state
) {
  state.services =
    state.services ||
    {};

  const existing =
    state.services
      .blockscoutDirectionalUsdV183;

  state.services
    .blockscoutDirectionalUsdV183 = {
      lastStatus: null,
      lastRequestAt: null,
      lastSuccessAt: null,
      last429At: null,
      cooldownUntil: null,
      consecutive429s: 0,
      total429s: 0,
      totalRequests: 0,
      lastBackoffMs: null,
      ...(
        existing &&
        typeof existing === "object" &&
        !Array.isArray(existing)
          ? existing
          : {}
      )
    };

  return state.services
    .blockscoutDirectionalUsdV183;
}

function blockscoutDirectionalUsdTelemetryV183(
  state
) {
  const service =
    blockscoutDirectionalUsdServiceV183(
      state
    );

  const now =
    Date.now();

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    ) || null;

  return {
    enabled: true,
    lastStatus:
      service.lastStatus || null,
    lastRequestAt:
      safeNumber(service.lastRequestAt) || null,
    lastSuccessAt:
      safeNumber(service.lastSuccessAt) || null,
    last429At:
      safeNumber(service.last429At) || null,
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
    consecutive429s:
      safeNumber(
        service.consecutive429s
      ),
    total429s:
      safeNumber(
        service.total429s
      ),
    totalRequests:
      safeNumber(
        service.totalRequests
      ),
    lastBackoffMs:
      safeNumber(
        service.lastBackoffMs
      ) || null,
    baseBackoffMs:
      BLOCKSCOUT_DIRECTIONAL_429_BASE_MS_V183,
    maxBackoffMs:
      BLOCKSCOUT_DIRECTIONAL_429_MAX_MS_V183
  };
}

function registerBlockscoutDirectional429V183(
  state
) {
  const service =
    blockscoutDirectionalUsdServiceV183(
      state
    );

  const now =
    Date.now();

  service.consecutive429s =
    Math.max(
      1,
      safeNumber(
        service.consecutive429s
      ) + 1
    );

  service.total429s =
    safeNumber(
      service.total429s
    ) + 1;

  const exponent =
    Math.max(
      0,
      service.consecutive429s - 1
    );

  const backoffMs =
    Math.min(
      BLOCKSCOUT_DIRECTIONAL_429_MAX_MS_V183,
      BLOCKSCOUT_DIRECTIONAL_429_BASE_MS_V183 *
        (2 ** exponent)
    );

  service.last429At =
    now;

  service.lastStatus =
    "HTTP_429";

  service.lastBackoffMs =
    backoffMs;

  service.cooldownUntil =
    now + backoffMs;

  return backoffMs;
}

function registerBlockscoutDirectionalSuccessV183(
  state
) {
  const service =
    blockscoutDirectionalUsdServiceV183(
      state
    );

  service.lastStatus =
    "SUCCESS";

  service.lastSuccessAt =
    Date.now();

  service.consecutive429s =
    0;

  service.cooldownUntil =
    null;

  service.lastBackoffMs =
    null;
}

function releaseBlockscoutUsdGReserveV182ForV183(
  budget,
  reason
) {
  const reserve =
    budget.analysis
      ?.blockscoutUsdGReserveV182;

  if (
    reserve?.active !== true
  ) {
    return false;
  }

  reserve.active =
    false;

  reserve.releasedWithoutUse =
    true;

  reserve.releasedAt =
    Date.now();

  reserve.releaseReasonV183 =
    reason ||
    "V183_DIRECTIONAL_ROUTE_NOT_REQUESTED";

  return true;
}

async function blockscoutV4UsdGDirectionalV180(
  candidate,
  budget,
  state,
  latestBlock
) {
  const base = {
    enabled: true,
    attempted: false,
    verifiedAnyWindow: false,
    source: "BLOCKSCOUT_V4_SWAP_USDG_V180",
    usdBasis:
      "CANONICAL_USDG_1_TO_1_USD_REDEMPTION",
    apiRowCeiling:
      BLOCKSCOUT_LOGS_MAX_ROWS_V180,
    windows: {}
  };

  if (
    !v180PoolIdentityMatchesCandidate(
      candidate
    )
  ) {
    return {
      ...base,
      status:
        "NOT_ELIGIBLE_REQUIRES_VERIFIED_V4_USDG_POOL"
    };
  }

  const identity =
    candidate
      ?.onChainPoolIdentityV153;

  const poolId =
    normalize(
      identity?.poolId
    );

  const registryPool =
    state
      ?.poolRegistry
      ?.[poolId];

  if (
    !registryPool ||
    !isAddress(
      normalize(
        registryPool?.currency0
      )
    ) ||
    !isAddress(
      normalize(
        registryPool?.currency1
      )
    )
  ) {
    return {
      ...base,
      status:
        "POOL_REGISTRY_IDENTITY_UNAVAILABLE"
    };
  }

  const rawFromBlockV181 =
    identity?.blockNumber;

  const rawToBlockV181 =
    latestBlock;

  const fromBlock =
    blockNumberFromAnyV180(
      rawFromBlockV181
    );

  const toBlock =
    blockNumberFromAnyV180(
      rawToBlockV181
    );

  const blockRangeInputV181 = {
    fromRaw:
      rawFromBlockV181 ??
      null,
    toRaw:
      rawToBlockV181 ??
      null,
    fromType:
      typeof rawFromBlockV181,
    toType:
      typeof rawToBlockV181,
    parsedFromBlock:
      fromBlock,
    parsedToBlock:
      toBlock,
    expectedToSource:
      "SCAN_LATEST_NUMBER"
  };

  if (
    !Number.isFinite(
      fromBlock
    ) ||
    !Number.isFinite(
      toBlock
    ) ||
    fromBlock <= 0 ||
    toBlock < fromBlock
  ) {
    return {
      ...base,
      status:
        "INVALID_BLOCK_RANGE",
      fromBlock,
      toBlock,
      blockRangeInputV181
    };
  }

  const directionalServiceV183 =
    blockscoutDirectionalUsdServiceV183(
      state
    );

  const nowV183 =
    Date.now();

  const directionalCooldownUntilV183 =
    safeNumber(
      directionalServiceV183.cooldownUntil
    ) || null;

  if (
    directionalCooldownUntilV183 &&
    directionalCooldownUntilV183 > nowV183
  ) {
    directionalServiceV183.lastStatus =
      "COOLDOWN_ACTIVE";

    return {
      ...base,
      attempted: false,
      status:
        "BLOCKSCOUT_DIRECTIONAL_429_COOLDOWN_V183",
      fromBlock,
      toBlock,
      blockRangeInputV181,
      cooldownUntil:
        directionalCooldownUntilV183,
      retryAfterMs:
        directionalCooldownUntilV183 - nowV183,
      serviceV183:
        blockscoutDirectionalUsdTelemetryV183(
          state
        )
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180"
    )
  ) {
    return {
      ...base,
      status:
        "ANALYSIS_BUDGET_PROTECTED",
      fromBlock,
      toBlock,
      blockRangeInputV181
    };
  }

  const url =
    `${BLOCKSCOUT}/api?module=logs&action=getLogs` +
    `&fromBlock=${fromBlock}` +
    `&toBlock=${toBlock}` +
    `&address=${POOL_MANAGER}` +
    `&topic0=${SWAP_TOPIC}` +
    `&topic1=${poolId}` +
    `&topic0_1_opr=and`;

  try {
    directionalServiceV183.totalRequests =
      safeNumber(
        directionalServiceV183.totalRequests
      ) + 1;

    directionalServiceV183.lastRequestAt =
      Date.now();

    directionalServiceV183.lastStatus =
      "REQUESTING";

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
      response.status === 429
    ) {
      const backoffMsV183 =
        registerBlockscoutDirectional429V183(
          state
        );

      return {
        ...base,
        attempted: true,
        status:
          "BLOCKSCOUT_HTTP_429",
        fromBlock,
        toBlock,
        blockRangeInputV181,
        backoffMsV183,
        cooldownUntil:
          safeNumber(
            blockscoutDirectionalUsdServiceV183(
              state
            ).cooldownUntil
          ) || null,
        serviceV183:
          blockscoutDirectionalUsdTelemetryV183(
            state
          )
      };
    }

    if (
      !response.ok
    ) {
      directionalServiceV183.lastStatus =
        `HTTP_${response.status}`;

      return {
        ...base,
        attempted: true,
        status:
          `BLOCKSCOUT_HTTP_${response.status}`,
        fromBlock,
        toBlock,
        blockRangeInputV181,
        serviceV183:
          blockscoutDirectionalUsdTelemetryV183(
            state
          )
      };
    }

    registerBlockscoutDirectionalSuccessV183(
      state
    );

    const payload =
      await response.json();

    const rows =
      Array.isArray(
        payload?.result
      )
        ? payload.result
        : [];

    /*
     * Blockscout documents a maximum of 1,000 returned event logs.
     * Exactly 1,000 is therefore treated as potentially truncated.
     */
    const historyComplete =
      rows.length <
      BLOCKSCOUT_LOGS_MAX_ROWS_V180;

    const decodeFailures = {};

    const trades = [];

    /*
     * Pass registry identity without changing the persisted candidate shape.
     */
    Object.defineProperty(
      candidate,
      "__v180RegistryPool",
      {
        value: registryPool,
        configurable: true,
        enumerable: false,
        writable: true
      }
    );

    try {
      for (
        const row
        of rows
      ) {
        const decoded =
          v180DecodeExactPoolLog(
            candidate,
            row
          );

        if (
          decoded?.verified === true
        ) {
          trades.push(
            decoded
          );
        }

        else {
          const reason =
            decoded?.reason ||
            "UNKNOWN";

          decodeFailures[
            reason
          ] =
            safeNumber(
              decodeFailures[
                reason
              ]
            ) +
            1;
        }
      }
    }

    finally {
      try {
        delete candidate
          .__v180RegistryPool;
      } catch {}
    }

    const now =
      Date.now();

    const windows = {};

    for (
      const key
      of [
        "m5",
        "m15",
        "h1",
        "h6",
        "h24"
      ]
    ) {
      windows[key] =
        v180WindowFromTrades(
          trades,
          now,
          key,
          historyComplete
        );
    }

    const verifiedAnyWindow =
      Object.values(
        windows
      ).some(
        row =>
          row?.verified === true
      );

    return {
      ...base,
      attempted: true,
      verifiedAnyWindow,
      status:
        verifiedAnyWindow
          ? "VERIFIED_ONCHAIN_USDG_DIRECTIONAL_WINDOWS"
          : historyComplete
            ? "NO_VERIFIED_TRADES_IN_WINDOWS"
            : "BLOCKSCOUT_1000_LOG_CEILING_HISTORY_INCOMPLETE",
      fromBlock,
      toBlock,
      blockRangeInputV181,
      poolId,
      quoteTokenAddress:
        CANONICAL_USDG_V179,
      returnedLogs:
        rows.length,
      decodedTrades:
        trades.length,
      decodeFailures,
      historyComplete,
      windows,
      serviceV183:
        blockscoutDirectionalUsdTelemetryV183(
          state
        )
    };
  }

  catch (
    error
  ) {
    directionalServiceV183.lastStatus =
      "FETCH_ERROR";

    return {
      ...base,
      attempted: true,
      status:
        "BLOCKSCOUT_FETCH_ERROR",
      error:
        errorString(
          error
        ),
      fromBlock,
      toBlock,
      blockRangeInputV181,
      serviceV183:
        blockscoutDirectionalUsdTelemetryV183(
          state
        )
    };
  }
}


async function discoverVerifiedBagsLaunchesV210(
  env,
  state,
  budget,
  holderTargetV227 = null,
  marketTargetV235 = null,
  liquidityTargetV237 = null
) {
  const telemetry =
    state.bagsDiscoveryV210 &&
    typeof state.bagsDiscoveryV210 === "object"
      ? state.bagsDiscoveryV210
      : newState().bagsDiscoveryV210;

  state.bagsDiscoveryV210 = telemetry;

  const flapTelemetry =
    state.flapDiscoveryV214 &&
    typeof state.flapDiscoveryV214 === "object"
      ? state.flapDiscoveryV214
      : newState().flapDiscoveryV214;

  state.flapDiscoveryV214 =
    flapTelemetry;

  const ponsTelemetry =
    state.ponsDiscoveryV215 &&
    typeof state.ponsDiscoveryV215 === "object"
      ? state.ponsDiscoveryV215
      : newState().ponsDiscoveryV215;

  state.ponsDiscoveryV215 =
    ponsTelemetry;

  const launchHoodTelemetryV220 =
    state.launchHoodDiscoveryV220 &&
    typeof state.launchHoodDiscoveryV220 === "object"
      ? state.launchHoodDiscoveryV220
      : newState().launchHoodDiscoveryV220;

  state.launchHoodDiscoveryV220 =
    launchHoodTelemetryV220;

  const fixedMintLaunchpadTelemetryV222 =
    state.fixedMintLaunchpadDiscoveryV222 &&
    typeof state.fixedMintLaunchpadDiscoveryV222 === "object"
      ? state.fixedMintLaunchpadDiscoveryV222
      : newState().fixedMintLaunchpadDiscoveryV222;

  state.fixedMintLaunchpadDiscoveryV222 =
    fixedMintLaunchpadTelemetryV222;

  const clankerVirtualsTelemetryV224 =
    state.clankerVirtualsDiscoveryV224 &&
    typeof state.clankerVirtualsDiscoveryV224 === "object"
      ? state.clankerVirtualsDiscoveryV224
      : newState().clankerVirtualsDiscoveryV224;
  state.clankerVirtualsDiscoveryV224 = clankerVirtualsTelemetryV224;

  /*
   * V217: build a bounded target list from already-verified Pons launches
   * persisted before this request. Newly discovered launches in the current
   * GraphQL response are intentionally not targeted until the next scan so
   * we do not add a second external request.
   */
  const ponsTradeTargetTokensV217 =
    (
      Array.isArray(
        ponsTelemetry.recentVerifiedLaunches
      )
        ? ponsTelemetry.recentVerifiedLaunches
        : []
    )
      .slice()
      .sort(
        (a, b) =>
          safeNumber(b?.blockNumber) -
          safeNumber(a?.blockNumber)
      )
      .map(row => normalize(row?.token))
      .filter(
        (token, index, all) =>
          isAddress(token) &&
          token !== ZERO &&
          all.indexOf(token) === index
      )
      .slice(0, 20);

  const ponsTradeTargetGraphqlV217 =
    ponsTradeTargetTokensV217.length
      ? ponsTradeTargetTokensV217
          .map(token => `"${token}"`)
          .join(", ")
      : `"${ZERO}"`;

  const bitqueryHolderTargetAddressV227 =
    isAddress(holderTargetV227?.address) &&
    normalize(holderTargetV227?.address) !== ZERO
      ? normalize(holderTargetV227.address)
      : null;

  const bitqueryHolderTargetReasonV227 =
    bitqueryHolderTargetAddressV227
      ? String(holderTargetV227?.reason || "PRIORITY_OR_LIVE_TARGET")
      : null;

  const bitqueryHolderGraphqlV227 =
    bitqueryHolderTargetAddressV227
      ? `
      HolderEvidenceV227: EVM(network: robinhood, dataset: realtime) {
        PriorityHolderRowsV227: Holders(
          limit: {count: ${BITQUERY_HOLDER_ROW_LIMIT_V227}}
          orderBy: {descending: Balance_Amount}
          where: {Currency: {SmartContract: {is: "${bitqueryHolderTargetAddressV227}"}}}
        ) {
          Holder { Address }
          Balance {
            Amount(selectWhere: {gt: "0"})
            FirstChangeTime
            LastChangeTime
            UpdateCount
          }
        }
        PriorityHolderCountV227: Holders(
          where: {Currency: {SmartContract: {is: "${bitqueryHolderTargetAddressV227}"}}}
        ) {
          holderCount: uniq(of: Holder_Address, if: {Balance: {Amount: {gt: "0"}}})
        }
      }
      `
      : "";

  /*
   * V235: market evidence now has its own persisted/current target. This is
   * intentionally independent of V228 holder targeting; both aliases still
   * share this single existing Bitquery HTTP request.
   */
  const bitqueryMarketTargetAddressV233 =
    isAddress(marketTargetV235?.address) &&
    normalize(marketTargetV235?.address) !== ZERO
      ? normalize(marketTargetV235.address)
      : null;

  const bitqueryMarketTargetReasonV233 =
    bitqueryMarketTargetAddressV233
      ? String(marketTargetV235?.reason || "PERSISTED_MARKET_EVIDENCE_TARGET_V235")
      : null;

  const bitqueryMarketGraphqlV233 =
    bitqueryMarketTargetAddressV233
      ? `
        MarketSnapshotV233: Tokens(
          limit: {count: 1}
          orderBy: {descending: Interval_Time_Start}
          where: {
            Token: {
              Address: {is: "${bitqueryMarketTargetAddressV233}"}
              NetworkBid: {is: "bid:robinhood"}
            }
            Interval: {Time: {Duration: {eq: 1}}}
          }
        ) {
          Interval { Time { Start End } }
          Token { Name Symbol Address }
          Price { Ohlc { Close } }
          Supply { MarketCap FullyDilutedValuationUsd }
          Volume { Usd }
        }

        MarketVolume24hV233: Tokens(
          where: {
            Interval: {Time: {Start: {since_relative: {days_ago: 1}}, Duration: {eq: 1}}}
            Token: {
              Address: {is: "${bitqueryMarketTargetAddressV233}"}
              NetworkBid: {is: "bid:robinhood"}
            }
          }
        ) {
          volume24hUsd: sum(of: Volume_Usd)
        }
      `
      : "";

  /* V234: recommended single-token price path — exact token, rank-1 USD pair. */
  const bitqueryRankedPairTargetAddressV234 =
    bitqueryMarketTargetAddressV233;

  const bitqueryRankedPairTargetReasonV234 =
    bitqueryRankedPairTargetAddressV234
      ? String(bitqueryMarketTargetReasonV233 || "PRIORITY_RANKED_PAIR_EVIDENCE_V234")
      : null;

  const bitqueryRankedPairGraphqlV234 =
    bitqueryRankedPairTargetAddressV234
      ? `
        RankedPairSnapshotV234: Pairs(
          limit: {count: 1}
          orderBy: {descending: Block_Time}
          where: {
            Token: {
              Address: {is: "${bitqueryRankedPairTargetAddressV234}"}
              NetworkBid: {is: "bid:robinhood"}
            }
            Ranking: {Position: {eq: 1}}
            Interval: {Time: {Duration: {eq: 1}}}
            Price: {IsQuotedInUsd: true}
          }
        ) {
          Block { Time }
          Interval { Time { Start End } }
          Token { Name Symbol Address }
          QuoteToken { Name Symbol Address }
          Market { Protocol Address }
          Price { IsQuotedInUsd Ohlc { Close } }
          Ranking { Position Weight }
          Volume { Usd }
          Supply { MarketCap FullyDilutedValuationUsd }
        }
      `
      : "";

  /* V237: exact-PoolId live liquidity snapshot, independent from holder/market targets. */
  const bitqueryLiquidityTargetAddressV237 =
    isAddress(liquidityTargetV237?.address) && normalize(liquidityTargetV237?.address) !== ZERO
      ? normalize(liquidityTargetV237.address)
      : null;
  const bitqueryLiquidityTargetPoolIdV237 =
    /^0x[a-f0-9]{64}$/.test(normalize(liquidityTargetV237?.poolId))
      ? normalize(liquidityTargetV237.poolId)
      : null;
  const bitqueryLiquidityTargetReasonV237 =
    bitqueryLiquidityTargetAddressV237 && bitqueryLiquidityTargetPoolIdV237
      ? String(liquidityTargetV237?.reason || "PERSISTED_EXACT_POOL_LIQUIDITY_TARGET_V237")
      : null;

  const bitqueryLiquidityGraphqlV237 =
    bitqueryLiquidityTargetAddressV237 && bitqueryLiquidityTargetPoolIdV237
      ? `
      LiquidityEvidenceV237: EVM(network: robinhood) {
        DEXPoolEvents(
          limit: {count: 1}
          orderBy: {descending: Block_Time}
          where: {
            PoolEvent: {
              Pool: {PoolId: {is: "${bitqueryLiquidityTargetPoolIdV237}"}}
            }
          }
        ) {
          Block { Time Number }
          Log { Signature { Name } }
          PoolEvent {
            Dex { ProtocolName ProtocolVersion }
            Pool {
              PoolId
              SmartContract
              CurrencyA { SmartContract Symbol Name }
              CurrencyB { SmartContract Symbol Name }
            }
            Liquidity {
              AmountCurrencyA
              AmountCurrencyAInUSD
              AmountCurrencyB
              AmountCurrencyBInUSD
            }
          }
        }
      }
      `
      : "";

  const base = {
    enabled: true,
    provider: "BITQUERY",
    verification:
      "BAGS_FACTORY_MINT_TRANSFER_PATTERN",
    factory: BAGS_FACTORY_V210,
    protocolFamily: BAGS_PROTOCOL_FAMILY_V210,
    protocol: BAGS_PROTOCOL_V210,
    attempted: false,
    externalRequestsUsed: 0,
    launchesSeen: 0,
    verifiedTokensAdded: 0,
    launches: [],
    flapLaunchesSeen: 0,
    flapVerifiedTokensAdded: 0,
    flapLaunches: [],
    ponsLaunchesSeen: 0,
    ponsVerifiedTokensAdded: 0,
    ponsLaunches: [],
    launchHoodLaunchesSeen: 0,
    launchHoodVerifiedTokensAdded: 0,
    launchHoodLaunches: [],
    fixedMintLaunchpadLaunchesSeenV222: 0,
    fixedMintLaunchpadNewlyObservedV222: 0,
    fixedMintLaunchpadVerifiedTokensAddedV222: 0,
    fixedMintLaunchpadLaunchesV222: [],
    fixedMintLaunchpadStatusV222: null,
    clankerVirtualsLaunchesSeenV224: 0,
    clankerVirtualsNewlyObservedV224: 0,
    clankerVirtualsVerifiedTokensAddedV224: 0,
    clankerVirtualsLaunchesV224: [],
    clankerVirtualsStatusV224: null,
    bitqueryHolderEvidenceV227: {
      targetAddress: bitqueryHolderTargetAddressV227,
      targetReason: bitqueryHolderTargetReasonV227,
      attempted: Boolean(bitqueryHolderTargetAddressV227),
      verified: false,
      status: bitqueryHolderTargetAddressV227 ? "PENDING_SHARED_QUERY" : "NOT_TARGETED",
      holderCount: null,
      rowCount: 0,
      dataset: "realtime",
      externalRequestsAdded: 0,
      sharedRequestHttpStatusV229: null,
      sharedRequestContentTypeV229: null,
      sharedRequestErrorClassV229: null,
      sharedRequestErrorPreviewV229: null,
      bearerHeaderConfiguredV229: Boolean(String(env.BITQUERY_ACCESS_TOKEN || "").trim()),
      endpointV229: BITQUERY_GRAPHQL_V2
    },
    bitqueryMarketEvidenceV233: {
      targetAddress: bitqueryMarketTargetAddressV233,
      targetReason: bitqueryMarketTargetReasonV233,
      attempted: Boolean(bitqueryMarketTargetAddressV233),
      verified: false,
      status: bitqueryMarketTargetAddressV233 ? "PENDING_SHARED_QUERY" : "NOT_TARGETED",
      snapshotTime: null,
      snapshotAgeMs: null,
      priceUsd: null,
      marketCap: null,
      fdv: null,
      volume24hUsd: null,
      dataset: "trading_realtime",
      source: "BITQUERY_TRADING_TOKENS_V233",
      partialMarketOnly: true,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },
    bitqueryRankedPairEvidenceV234: {
      targetAddress: bitqueryRankedPairTargetAddressV234,
      targetReason: bitqueryRankedPairTargetReasonV234,
      attempted: Boolean(bitqueryRankedPairTargetAddressV234),
      verified: false,
      status: bitqueryRankedPairTargetAddressV234 ? "PENDING_SHARED_QUERY" : "NOT_TARGETED",
      snapshotTime: null,
      snapshotAgeMs: null,
      priceUsd: null,
      marketCap: null,
      fdv: null,
      intervalVolumeUsd: null,
      marketAddress: null,
      marketProtocol: null,
      quoteTokenAddress: null,
      quoteTokenSymbol: null,
      rankingPosition: null,
      rankingWeight: null,
      dataset: "trading_realtime",
      source: "BITQUERY_TRADING_PAIRS_RANK1_V234",
      partialMarketOnly: true,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },
    bitqueryLiquidityEvidenceV237: {
      targetAddress: bitqueryLiquidityTargetAddressV237,
      poolId: bitqueryLiquidityTargetPoolIdV237,
      targetReason: bitqueryLiquidityTargetReasonV237,
      attempted: Boolean(bitqueryLiquidityTargetAddressV237 && bitqueryLiquidityTargetPoolIdV237),
      verified: false,
      status: bitqueryLiquidityTargetPoolIdV237 ? "PENDING_SHARED_QUERY" : "NOT_TARGETED",
      snapshotTime: null,
      snapshotAgeMs: null,
      currencyAAddress: null,
      currencyASymbol: null,
      currencyBAddress: null,
      currencyBSymbol: null,
      amountCurrencyA: null,
      amountCurrencyAInUSD: null,
      amountCurrencyB: null,
      amountCurrencyBInUSD: null,
      liquidityUsd: null,
      calculationMethod: null,
      dataset: "realtime",
      source: "BITQUERY_DEXPOOLEVENTS_POOLID_V237",
      exactPoolIdRequired: true,
      exactCandidateTokenRequired: true,
      expectedQuoteRequired: true,
      marketVerifiedPromoted: false,
      externalRequestsAdded: 0
    },
    status: null,
    httpStatus: null,
    error: null
  };

  const token =
    String(env.BITQUERY_ACCESS_TOKEN || "").trim();

  if (!token) {
    return {
      ...base,
      status: "NOT_CONFIGURED"
    };
  }

  /*
   * One bounded discovery request only when the discovery-live budget has
   * room. Telegram/global reserves and the 42-request hard ceiling remain
   * controlled by the existing consumeBudget() implementation.
   */
  if (
    !budgetAvailable(budget, "discovery-live") ||
    !consumeBudget(
      budget,
      "discovery-live",
      "BITQUERY_SHARED_LAUNCH_DISCOVERY_V224"
    )
  ) {
    return {
      ...base,
      status: "DISCOVERY_LIVE_BUDGET_PROTECTED"
    };
  }

  const query = `
    {
      EVM(network: robinhood) {
        Transfers(
          orderBy: {descending: Block_Time}
          limit: {count: 50}
          where: {
            Transaction: {
              To: {in: [
                "${BAGS_FACTORY_V210}",
                "${FLAP_ROUTER_V214}",
                "${LAUNCHHOOD_FACTORY_V220}",
                "${HOOD_FUN_FACTORY_V222}",
                "${KLIK_FINANCE_FACTORY_V222}",
                "${BANKR_BOT_FACTORY_V222}",
                "${APE_STORE_FACTORY_V222}"
              ]}
            }
            Transfer: {
              Amount: {eq: "1000000000"}
              Sender: {is: "${ZERO}"}
            }
          }
        ) {
          Block {
            Time
            Number
          }
          Transaction {
            Hash
            From
            To
          }
          TransactionStatus {
            Success
          }
          Transfer {
            Amount
            Sender
            Receiver
            Currency {
              Name
              Symbol
              SmartContract
              Decimals
              Fungible
              Native
              ProtocolName
            }
          }
        }

        ClankerLaunchesV224: Transfers(
          orderBy: {descending: Block_Time}
          limit: {count: 50}
          where: {
            Transaction: {To: {is: "${CLANKER_FACTORY_V224}"}}
            Transfer: {
              Amount: {eq: "${CLANKER_MINT_AMOUNT_V224}"}
              Sender: {is: "${ZERO}"}
            }
          }
        ) {
          Block { Time Number }
          Transaction { Hash From To }
          TransactionStatus { Success }
          Transfer { Amount Sender Receiver Currency { Name Symbol SmartContract Decimals Fungible Native ProtocolName } }
        }

        VirtualsLaunchesV224: Transfers(
          orderBy: {descending: Block_Time}
          limit: {count: 50}
          where: {
            Transaction: {To: {is: "${VIRTUALS_FACTORY_V224}"}}
            Transfer: {Sender: {is: "${ZERO}"}}
          }
        ) {
          Block { Time Number }
          Transaction { Hash From To }
          TransactionStatus { Success }
          Transfer { Amount Sender Receiver Currency { Name Symbol SmartContract Decimals Fungible Native ProtocolName } }
        }

        PonsLaunches: Events(
          limit: {count: 10}
          orderBy: {descending: Block_Time}
          where: {
            LogHeader: {
              Address: {is: "${PONS_V2_FACTORY_V215}"}
            }
            Log: {
              Signature: {
                Name: {is: "TokenLaunched"}
              }
            }
          }
        ) {
          Block {
            Time
            Number
          }
          Transaction {
            Hash
            From
            To
          }
          Log {
            Signature {
              Name
            }
          }
          Arguments {
            Name
            Type
            Value {
              ... on EVM_ABI_Address_Value_Arg {
                address
              }
              ... on EVM_ABI_BigInt_Value_Arg {
                bigInteger
              }
              ... on EVM_ABI_Integer_Value_Arg {
                integer
              }
              ... on EVM_ABI_Bytes_Value_Arg {
                hex
              }
            }
          }
        }
      }

      ${bitqueryHolderGraphqlV227}
      ${bitqueryLiquidityGraphqlV237}

      Trading {
        ${bitqueryMarketGraphqlV233}
        ${bitqueryRankedPairGraphqlV234}

        PonsTradesV216: Trades(
          limit: {count: 100}
          orderBy: {descending: Block_Time}
          where: {
            Pair: {
              Token: {
                Address: {
                  in: [${ponsTradeTargetGraphqlV217}]
                }
              }
              Market: {
                Protocol: {is: "pons_v2"}
                ProtocolFamily: {is: "Pons"}
                Network: {is: "Robinhood"}
              }
            }
          }
        ) {
          Block {
            Time
          }
          Side
          PriceInUsd
          Amounts {
            Base
            Quote
          }
          AmountsInUsd {
            Base
            Quote
          }
          Trader {
            Address
          }
          TransactionHeader {
            Hash
          }
          Pair {
            Token {
              Address
              Symbol
              Name
            }
            QuoteToken {
              Address
              Symbol
              Name
            }
            Market {
              Protocol
              ProtocolFamily
              Network
            }
          }
        }
      }
    }
  `;

  telemetry.totalQueries =
    safeNumber(telemetry.totalQueries) + 1;
  telemetry.lastQueryAt = Date.now();

  flapTelemetry.totalQueriesShared =
    safeNumber(flapTelemetry.totalQueriesShared) + 1;
  flapTelemetry.lastQueryAt = Date.now();

  ponsTelemetry.totalQueriesShared =
    safeNumber(ponsTelemetry.totalQueriesShared) + 1;
  ponsTelemetry.lastQueryAt = Date.now();

  launchHoodTelemetryV220.totalQueriesShared =
    safeNumber(launchHoodTelemetryV220.totalQueriesShared) + 1;
  launchHoodTelemetryV220.lastQueryAt =
    Date.now();

  fixedMintLaunchpadTelemetryV222.totalQueriesShared =
    safeNumber(fixedMintLaunchpadTelemetryV222.totalQueriesShared) + 1;
  fixedMintLaunchpadTelemetryV222.lastQueryAt =
    Date.now();

  clankerVirtualsTelemetryV224.totalQueriesShared =
    safeNumber(clankerVirtualsTelemetryV224.totalQueriesShared) + 1;
  clankerVirtualsTelemetryV224.lastQueryAt = Date.now();

  try {
    const response =
      await fetch(
        BITQUERY_GRAPHQL_V2,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
            authorization: `Bearer ${token}`
          },
          body: JSON.stringify({query})
        }
      );

    const bitqueryResponseContentTypeV229 =
      String(response.headers.get("content-type") || "").slice(0, 120);

    let responseTextV229 = "";
    try {
      responseTextV229 = await response.text();
    } catch {
      responseTextV229 = "";
    }

    let payload = null;
    try {
      payload = responseTextV229 ? JSON.parse(responseTextV229) : null;
    } catch {
      payload = null;
    }

    /*
     * V229 diagnostic only. Never expose the configured secret or full gateway
     * response. The preview is bounded and redacts bearer-like/token-like values.
     */
    const sanitizeBitqueryErrorPreviewV229 = value =>
      String(value || "")
        .replace(/Bearer\s+[^\s\"']+/gi, "Bearer [REDACTED]")
        .replace(/ory_[A-Za-z0-9._~-]+/g, "ory_[REDACTED]")
        .replace(/(token|apikey|api_key|authorization)([\s\"'=:\-]+)[A-Za-z0-9._~-]{12,}/gi, "$1$2[REDACTED]")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 320);

    const bitqueryRawErrorV229 =
      payload?.errors?.map(row => row?.message).filter(Boolean).join(" | ") ||
      payload?.message ||
      payload?.error ||
      responseTextV229 ||
      "";

    const bitqueryErrorPreviewV229 =
      sanitizeBitqueryErrorPreviewV229(bitqueryRawErrorV229);

    const bitqueryErrorTextLowerV229 =
      bitqueryErrorPreviewV229.toLowerCase();

    const bitqueryErrorClassV229 =
      response.status === 401
        ? "AUTHENTICATION_REJECTED"
        : response.status === 403 &&
          /(plan|billing|entitle|permission|scope|upgrade|subscription|access denied)/.test(bitqueryErrorTextLowerV229)
          ? "ACCESS_OR_ENTITLEMENT_REJECTED"
          : response.status === 403 &&
            /(token|oauth|authori[sz]|credential|expired|invalid)/.test(bitqueryErrorTextLowerV229)
            ? "AUTH_OR_TOKEN_REJECTED"
            : response.status === 403
              ? "HTTP_403_GATEWAY_REJECTED_UNCLASSIFIED"
              : response.status >= 400
                ? `HTTP_${response.status}_REJECTED`
                : null;

    telemetry.lastHttpStatus = response.status;

    if (!response.ok) {
      telemetry.lastStatus = `HTTP_${response.status}`;
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus: response.status,
        status: telemetry.lastStatus,
        error:
          payload?.errors?.[0]?.message ||
          `BITQUERY_HTTP_${response.status}`,
        bitqueryHolderEvidenceV227: {
          ...base.bitqueryHolderEvidenceV227,
          attempted: Boolean(bitqueryHolderTargetAddressV227),
          verified: false,
          status: bitqueryHolderTargetAddressV227
            ? `SHARED_REQUEST_HTTP_${response.status}`
            : "NOT_TARGETED",
          sharedRequestHttpStatusV229: response.status,
          sharedRequestContentTypeV229: bitqueryResponseContentTypeV229 || null,
          sharedRequestErrorClassV229: bitqueryErrorClassV229,
          sharedRequestErrorPreviewV229: bitqueryErrorPreviewV229 || null
        },
        bitqueryMarketEvidenceV233: {
          ...base.bitqueryMarketEvidenceV233,
          attempted: Boolean(bitqueryMarketTargetAddressV233),
          verified: false,
          status: bitqueryMarketTargetAddressV233
            ? `SHARED_REQUEST_HTTP_${response.status}`
            : "NOT_TARGETED"
        },
        bitqueryRankedPairEvidenceV234: {
          ...base.bitqueryRankedPairEvidenceV234,
          attempted: Boolean(bitqueryRankedPairTargetAddressV234),
          verified: false,
          status: bitqueryRankedPairTargetAddressV234
            ? `SHARED_REQUEST_HTTP_${response.status}`
            : "NOT_TARGETED"
        }
      };
    }

    if (Array.isArray(payload?.errors) && payload.errors.length) {
      telemetry.lastStatus = "GRAPHQL_ERROR";
      return {
        ...base,
        attempted: true,
        externalRequestsUsed: 1,
        httpStatus: response.status,
        status: "GRAPHQL_ERROR",
        error: payload.errors
          .map(row => String(row?.message || "GRAPHQL_ERROR"))
          .slice(0, 3)
          .join(" | ")
      };
    }

    const rows =
      Array.isArray(payload?.data?.EVM?.Transfers)
        ? payload.data.EVM.Transfers
        : [];

    const clankerRowsV224 =
      Array.isArray(payload?.data?.EVM?.ClankerLaunchesV224)
        ? payload.data.EVM.ClankerLaunchesV224 : [];
    const virtualsRowsV224 =
      Array.isArray(payload?.data?.EVM?.VirtualsLaunchesV224)
        ? payload.data.EVM.VirtualsLaunchesV224 : [];

    const ponsRows =
      Array.isArray(payload?.data?.EVM?.PonsLaunches)
        ? payload.data.EVM.PonsLaunches
        : [];

    const ponsTradeRowsV216 =
      Array.isArray(payload?.data?.Trading?.PonsTradesV216)
        ? payload.data.Trading.PonsTradesV216
        : [];

    const bitqueryHolderRowsRawV227 =
      bitqueryHolderTargetAddressV227 &&
      Array.isArray(payload?.data?.HolderEvidenceV227?.PriorityHolderRowsV227)
        ? payload.data.HolderEvidenceV227.PriorityHolderRowsV227
        : [];

    const bitqueryHolderCountRowsV227 =
      bitqueryHolderTargetAddressV227 &&
      Array.isArray(payload?.data?.HolderEvidenceV227?.PriorityHolderCountV227)
        ? payload.data.HolderEvidenceV227.PriorityHolderCountV227
        : [];

    const bitqueryHolderCountV227Number =
      Number(bitqueryHolderCountRowsV227?.[0]?.holderCount);

    const bitqueryHolderCountV227 =
      Number.isFinite(bitqueryHolderCountV227Number) && bitqueryHolderCountV227Number > 0
        ? Math.floor(bitqueryHolderCountV227Number)
        : null;

    const bitqueryHolderRowsV227 =
      bitqueryHolderRowsRawV227
        .map(row => ({
          address: normalize(row?.Holder?.Address),
          amount: row?.Balance?.Amount ?? null,
          firstChangeTime: row?.Balance?.FirstChangeTime || null,
          lastChangeTime: row?.Balance?.LastChangeTime || null,
          updateCount: safeNumber(row?.Balance?.UpdateCount)
        }))
        .filter(row => isAddress(row.address) && row.address !== ZERO && row.amount !== null && Number(row.amount) > 0)
        .slice(0, BITQUERY_HOLDER_ROW_LIMIT_V227);

    if (bitqueryHolderTargetAddressV227) {
      const bitqueryHolderVerifiedV227 = bitqueryHolderRowsV227.length > 0;
      state.bitqueryHolderEvidenceV227 = {
        address: bitqueryHolderTargetAddressV227,
        targetReason: bitqueryHolderTargetReasonV227,
        attempted: true,
        verified: bitqueryHolderVerifiedV227,
        status: bitqueryHolderVerifiedV227
          ? "VERIFIED_HOLDER_ROWS_V227"
          : "NO_POSITIVE_HOLDER_ROWS_V227",
        fetchedAt: Date.now(),
        holderCount: bitqueryHolderCountV227,
        rowCount: bitqueryHolderRowsV227.length,
        rows: bitqueryHolderRowsV227,
        dataset: "realtime",
        source: "BITQUERY_EVM_HOLDERS_V227",
        externalRequestsAdded: 0,
        sharedRequestHttpStatusV229: response.status,
        sharedRequestContentTypeV229: bitqueryResponseContentTypeV229 || null,
        sharedRequestErrorClassV229: null,
        sharedRequestErrorPreviewV229: null,
        bearerHeaderConfiguredV229: true,
        endpointV229: BITQUERY_GRAPHQL_V2
      };
    }



    /* V233: exact-token Trading.Tokens evidence. No liquidity/full-market promotion. */
    const bitqueryMarketSnapshotRowsV233 =
      bitqueryMarketTargetAddressV233 &&
      Array.isArray(payload?.data?.Trading?.MarketSnapshotV233)
        ? payload.data.Trading.MarketSnapshotV233
        : [];

    const bitqueryMarketVolumeRowsV233 =
      bitqueryMarketTargetAddressV233 &&
      Array.isArray(payload?.data?.Trading?.MarketVolume24hV233)
        ? payload.data.Trading.MarketVolume24hV233
        : [];

    if (bitqueryMarketTargetAddressV233) {
      const snapshotV233 = bitqueryMarketSnapshotRowsV233[0] || null;
      const returnedAddressV233 = normalize(snapshotV233?.Token?.Address);
      const exactTokenMatchV233 = returnedAddressV233 === bitqueryMarketTargetAddressV233;
      const snapshotTimeV233 = snapshotV233?.Interval?.Time?.End || snapshotV233?.Interval?.Time?.Start || null;
      const parsedSnapshotTimeV233 = snapshotTimeV233 ? Date.parse(snapshotTimeV233) : NaN;
      const snapshotAgeMsV233 = Number.isFinite(parsedSnapshotTimeV233)
        ? Math.max(0, Date.now() - parsedSnapshotTimeV233)
        : null;
      const freshSnapshotV233 = snapshotAgeMsV233 !== null &&
        snapshotAgeMsV233 <= BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233;

      const priceUsdV233 = safeNumber(snapshotV233?.Price?.Ohlc?.Close);
      const marketCapV233 = safeNumber(snapshotV233?.Supply?.MarketCap);
      const fdvV233 = safeNumber(snapshotV233?.Supply?.FullyDilutedValuationUsd);
      const volume24hUsdV233 = safeNumber(bitqueryMarketVolumeRowsV233?.[0]?.volume24hUsd);

      const verifiedPartialMarketV233 = Boolean(
        exactTokenMatchV233 && freshSnapshotV233 && priceUsdV233 > 0 &&
        (marketCapV233 > 0 || fdvV233 > 0 || volume24hUsdV233 > 0)
      );

      const statusV233 = verifiedPartialMarketV233
        ? "VERIFIED_PARTIAL_MARKET_FIELDS_V233"
        : !snapshotV233
          ? "NO_TRADING_TOKEN_SNAPSHOT_V233"
          : !exactTokenMatchV233
            ? "TOKEN_IDENTITY_MISMATCH_V233"
            : !freshSnapshotV233
              ? "STALE_TRADING_TOKEN_SNAPSHOT_V233"
              : priceUsdV233 <= 0
                ? "INVALID_OR_MISSING_USD_PRICE_V233"
                : "INSUFFICIENT_PARTIAL_MARKET_FIELDS_V233";

      const marketEvidenceV233 = {
        address: bitqueryMarketTargetAddressV233,
        targetReason: bitqueryMarketTargetReasonV233,
        attempted: true,
        verified: verifiedPartialMarketV233,
        status: statusV233,
        fetchedAt: Date.now(),
        snapshotTime: snapshotTimeV233,
        snapshotAgeMs: snapshotAgeMsV233,
        priceUsd: priceUsdV233 > 0 ? priceUsdV233 : null,
        marketCap: marketCapV233 > 0 ? marketCapV233 : null,
        fdv: fdvV233 > 0 ? fdvV233 : null,
        volume24hUsd: volume24hUsdV233 > 0 ? volume24hUsdV233 : null,
        dataset: "trading_realtime",
        source: "BITQUERY_TRADING_TOKENS_V233",
        exactTokenMatch: exactTokenMatchV233,
        maxFreshAgeMs: BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233,
        partialMarketOnly: true,
        liquidityUsd: null,
        liquidityVerified: false,
        marketVerifiedPromoted: false,
        externalRequestsAdded: 0
      };

      state.bitqueryMarketEvidenceV233 = marketEvidenceV233;
      const marketWatchedV233 = state.watchedTokens.find(
        row => normalize(row?.address) === bitqueryMarketTargetAddressV233
      );
      if (marketWatchedV233) {
        marketWatchedV233.bitqueryMarketEvidenceV233 = marketEvidenceV233;
      }
    }

    /* V234: exact-token rank-1 Trading.Pairs evidence. Still partial; no liquidity promotion. */
    const bitqueryRankedPairRowsV234 =
      bitqueryRankedPairTargetAddressV234 &&
      Array.isArray(payload?.data?.Trading?.RankedPairSnapshotV234)
        ? payload.data.Trading.RankedPairSnapshotV234
        : [];

    if (bitqueryRankedPairTargetAddressV234) {
      const pairV234 = bitqueryRankedPairRowsV234[0] || null;
      const returnedAddressV234 = normalize(pairV234?.Token?.Address);
      const exactTokenMatchV234 =
        returnedAddressV234 === bitqueryRankedPairTargetAddressV234;
      const usdQuotedV234 = pairV234?.Price?.IsQuotedInUsd === true;
      const rankingPositionV234 = safeNumber(pairV234?.Ranking?.Position);
      const rankOneV234 = rankingPositionV234 === 1;
      const snapshotTimeV234 =
        pairV234?.Block?.Time ||
        pairV234?.Interval?.Time?.End ||
        pairV234?.Interval?.Time?.Start ||
        null;
      const parsedSnapshotTimeV234 = snapshotTimeV234
        ? Date.parse(snapshotTimeV234)
        : NaN;
      const snapshotAgeMsV234 = Number.isFinite(parsedSnapshotTimeV234)
        ? Math.max(0, Date.now() - parsedSnapshotTimeV234)
        : null;
      const freshSnapshotV234 =
        snapshotAgeMsV234 !== null &&
        snapshotAgeMsV234 <= BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234;

      const priceUsdV234 = safeNumber(pairV234?.Price?.Ohlc?.Close);
      const marketCapV234 = safeNumber(pairV234?.Supply?.MarketCap);
      const fdvV234 = safeNumber(pairV234?.Supply?.FullyDilutedValuationUsd);
      const intervalVolumeUsdV234 = safeNumber(pairV234?.Volume?.Usd);
      const marketAddressV234 = normalize(pairV234?.Market?.Address) || null;
      const marketProtocolV234 = pairV234?.Market?.Protocol || null;
      const quoteTokenAddressV234 = normalize(pairV234?.QuoteToken?.Address) || null;
      const quoteTokenSymbolV234 = pairV234?.QuoteToken?.Symbol || null;
      const rankingWeightV234 = safeNumber(pairV234?.Ranking?.Weight);

      const verifiedRankedPairV234 = Boolean(
        exactTokenMatchV234 &&
        usdQuotedV234 &&
        rankOneV234 &&
        freshSnapshotV234 &&
        priceUsdV234 > 0 &&
        (marketCapV234 > 0 || fdvV234 > 0 || intervalVolumeUsdV234 > 0)
      );

      const statusV234 = verifiedRankedPairV234
        ? "VERIFIED_RANK1_PAIR_MARKET_FIELDS_V234"
        : !pairV234
          ? "NO_RANK1_TRADING_PAIR_SNAPSHOT_V234"
          : !exactTokenMatchV234
            ? "TOKEN_IDENTITY_MISMATCH_V234"
            : !usdQuotedV234
              ? "PAIR_NOT_USD_QUOTED_V234"
              : !rankOneV234
                ? "PAIR_NOT_RANK_ONE_V234"
                : !freshSnapshotV234
                  ? "STALE_RANK1_PAIR_SNAPSHOT_V234"
                  : priceUsdV234 <= 0
                    ? "INVALID_OR_MISSING_USD_PRICE_V234"
                    : "INSUFFICIENT_RANK1_PAIR_MARKET_FIELDS_V234";

      const rankedPairEvidenceV234 = {
        address: bitqueryRankedPairTargetAddressV234,
        targetReason: bitqueryRankedPairTargetReasonV234,
        attempted: true,
        verified: verifiedRankedPairV234,
        status: statusV234,
        fetchedAt: Date.now(),
        snapshotTime: snapshotTimeV234,
        snapshotAgeMs: snapshotAgeMsV234,
        priceUsd: priceUsdV234 > 0 ? priceUsdV234 : null,
        marketCap: marketCapV234 > 0 ? marketCapV234 : null,
        fdv: fdvV234 > 0 ? fdvV234 : null,
        intervalVolumeUsd: intervalVolumeUsdV234 > 0 ? intervalVolumeUsdV234 : null,
        marketAddress: isAddress(marketAddressV234) ? marketAddressV234 : null,
        marketProtocol: marketProtocolV234,
        quoteTokenAddress: isAddress(quoteTokenAddressV234) ? quoteTokenAddressV234 : null,
        quoteTokenSymbol: quoteTokenSymbolV234,
        rankingPosition: rankOneV234 ? 1 : (rankingPositionV234 > 0 ? rankingPositionV234 : null),
        rankingWeight: rankingWeightV234 > 0 ? rankingWeightV234 : null,
        exactTokenMatch: exactTokenMatchV234,
        usdQuoted: usdQuotedV234,
        maxFreshAgeMs: BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234,
        dataset: "trading_realtime",
        source: "BITQUERY_TRADING_PAIRS_RANK1_V234",
        partialMarketOnly: true,
        total24hTokenVolumeInferred: false,
        liquidityUsd: null,
        liquidityVerified: false,
        marketVerifiedPromoted: false,
        externalRequestsAdded: 0
      };

      state.bitqueryRankedPairEvidenceV234 = rankedPairEvidenceV234;
      const pairWatchedV234 = state.watchedTokens.find(
        row => normalize(row?.address) === bitqueryRankedPairTargetAddressV234
      );
      if (pairWatchedV234) {
        pairWatchedV234.bitqueryRankedPairEvidenceV234 = rankedPairEvidenceV234;
      }
    }

    /* V237: exact-PoolId realtime DEXPoolEvents liquidity evidence. */
    const bitqueryLiquidityRowsV237 =
      bitqueryLiquidityTargetPoolIdV237 &&
      Array.isArray(payload?.data?.LiquidityEvidenceV237?.DEXPoolEvents)
        ? payload.data.LiquidityEvidenceV237.DEXPoolEvents
        : [];

    if (bitqueryLiquidityTargetAddressV237 && bitqueryLiquidityTargetPoolIdV237) {
      const rowV237 = bitqueryLiquidityRowsV237[0] || null;
      const returnedPoolIdV237 = normalize(rowV237?.PoolEvent?.Pool?.PoolId);
      const exactPoolIdMatchV237 = returnedPoolIdV237 === bitqueryLiquidityTargetPoolIdV237;
      const rawAAddressV237 = String(rowV237?.PoolEvent?.Pool?.CurrencyA?.SmartContract || "").toLowerCase();
      const rawBAddressV237 = String(rowV237?.PoolEvent?.Pool?.CurrencyB?.SmartContract || "").toLowerCase();
      const currencyAAddressV237 = rawAAddressV237 === "0x" ? ZERO : normalize(rawAAddressV237);
      const currencyBAddressV237 = rawBAddressV237 === "0x" ? ZERO : normalize(rawBAddressV237);
      const exactCandidateTokenMatchV237 =
        currencyAAddressV237 === bitqueryLiquidityTargetAddressV237 ||
        currencyBAddressV237 === bitqueryLiquidityTargetAddressV237;
      const quoteAddressV237 = currencyAAddressV237 === bitqueryLiquidityTargetAddressV237
        ? currencyBAddressV237
        : currencyBAddressV237 === bitqueryLiquidityTargetAddressV237
          ? currencyAAddressV237
          : null;
      const expectedQuoteV237 =
        quoteAddressV237 === ZERO ||
        quoteAddressV237 === CANONICAL_WETH_V179 ||
        quoteAddressV237 === CANONICAL_USDG_V179;
      const snapshotTimeV237 = rowV237?.Block?.Time || null;
      const parsedSnapshotTimeV237 = snapshotTimeV237 ? Date.parse(snapshotTimeV237) : NaN;
      const snapshotAgeMsV237 = Number.isFinite(parsedSnapshotTimeV237)
        ? Math.max(0, Date.now() - parsedSnapshotTimeV237)
        : null;
      const freshSnapshotV237 = snapshotAgeMsV237 !== null &&
        snapshotAgeMsV237 <= BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237;
      const amountAV237 = safeNumber(rowV237?.PoolEvent?.Liquidity?.AmountCurrencyA);
      const amountAUsdV237 = safeNumber(rowV237?.PoolEvent?.Liquidity?.AmountCurrencyAInUSD);
      const amountBV237 = safeNumber(rowV237?.PoolEvent?.Liquidity?.AmountCurrencyB);
      const amountBUsdV237 = safeNumber(rowV237?.PoolEvent?.Liquidity?.AmountCurrencyBInUSD);

      let liquidityUsdV237 = null;
      let calculationMethodV237 = null;
      if (amountAUsdV237 > 0 && amountBUsdV237 > 0) {
        liquidityUsdV237 = amountAUsdV237 + amountBUsdV237;
        calculationMethodV237 = "DIRECT_TWO_SIDED_USD_RESERVE_SUM_V237";
      } else if (expectedQuoteV237) {
        const quoteUsdV237 = currencyAAddressV237 === quoteAddressV237
          ? amountAUsdV237
          : amountBUsdV237;
        if (quoteUsdV237 > 0) {
          liquidityUsdV237 = quoteUsdV237 * 2;
          calculationMethodV237 = "EXPECTED_QUOTE_SIDE_USD_X2_BALANCED_POOL_ESTIMATE_V237";
        }
      }

      const verifiedLiquidityV237 = Boolean(
        rowV237 && exactPoolIdMatchV237 && exactCandidateTokenMatchV237 &&
        expectedQuoteV237 && freshSnapshotV237 && liquidityUsdV237 > 0
      );
      const statusV237 = verifiedLiquidityV237
        ? "VERIFIED_EXACT_POOL_LIQUIDITY_V237"
        : !rowV237
          ? "NO_DEXPOOLEVENTS_LIQUIDITY_SNAPSHOT_V237"
          : !exactPoolIdMatchV237
            ? "POOL_IDENTITY_MISMATCH_V237"
            : !exactCandidateTokenMatchV237
              ? "CANDIDATE_TOKEN_NOT_IN_POOL_V237"
              : !expectedQuoteV237
                ? "UNEXPECTED_OR_UNVERIFIED_QUOTE_ASSET_V237"
                : !freshSnapshotV237
                  ? "STALE_LIQUIDITY_SNAPSHOT_V237"
                  : "NO_USD_LIQUIDITY_VALUE_V237";

      const liquidityEvidenceV237 = {
        address: bitqueryLiquidityTargetAddressV237,
        poolId: bitqueryLiquidityTargetPoolIdV237,
        targetReason: bitqueryLiquidityTargetReasonV237,
        attempted: true,
        verified: verifiedLiquidityV237,
        status: statusV237,
        fetchedAt: Date.now(),
        snapshotTime: snapshotTimeV237,
        snapshotAgeMs: snapshotAgeMsV237,
        currencyAAddress: currencyAAddressV237 || null,
        currencyASymbol: rowV237?.PoolEvent?.Pool?.CurrencyA?.Symbol || null,
        currencyBAddress: currencyBAddressV237 || null,
        currencyBSymbol: rowV237?.PoolEvent?.Pool?.CurrencyB?.Symbol || null,
        quoteAddress: quoteAddressV237,
        expectedQuoteVerified: expectedQuoteV237,
        amountCurrencyA: amountAV237 > 0 ? amountAV237 : null,
        amountCurrencyAInUSD: amountAUsdV237 > 0 ? amountAUsdV237 : null,
        amountCurrencyB: amountBV237 > 0 ? amountBV237 : null,
        amountCurrencyBInUSD: amountBUsdV237 > 0 ? amountBUsdV237 : null,
        liquidityUsd: liquidityUsdV237 > 0 ? liquidityUsdV237 : null,
        calculationMethod: calculationMethodV237,
        exactPoolIdMatch: exactPoolIdMatchV237,
        exactCandidateTokenMatch: exactCandidateTokenMatchV237,
        maxFreshAgeMs: BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237,
        dataset: "realtime",
        source: "BITQUERY_DEXPOOLEVENTS_POOLID_V237",
        marketVerifiedPromoted: false,
        externalRequestsAdded: 0
      };
      state.bitqueryLiquidityEvidenceV237 = liquidityEvidenceV237;
      const liquidityWatchedV237 = state.watchedTokens.find(
        watched => normalize(watched?.address) === bitqueryLiquidityTargetAddressV237
      );
      if (liquidityWatchedV237) liquidityWatchedV237.bitqueryLiquidityEvidenceV237 = liquidityEvidenceV237;
    }

    const launches = [];
    const flapLaunches = [];
    const ponsLaunches = [];
    const launchHoodLaunchesV220 = [];
    const fixedMintLaunchpadLaunchesV222 = [];
    const clankerVirtualsLaunchesV224 = [];

    let verifiedTokensAdded = 0;
    let flapVerifiedTokensAdded = 0;
    let ponsVerifiedTokensAdded = 0;
    let launchHoodVerifiedTokensAddedV220 = 0;
    let fixedMintLaunchpadVerifiedTokensAddedV222 = 0;
    let clankerVirtualsVerifiedTokensAddedV224 = 0;

    for (const row of rows) {
      const success =
        row?.TransactionStatus?.Success;

      if (success === false) continue;

      const txTo =
        normalize(row?.Transaction?.To);

      const sender =
        normalize(row?.Transfer?.Sender);

      const tokenAddress =
        normalize(
          row?.Transfer?.Currency?.SmartContract
        );

      const amount =
        String(row?.Transfer?.Amount ?? "");

      const commonVerifiedMint =
        sender === ZERO &&
        amount === "1000000000" &&
        isAddress(tokenAddress) &&
        tokenAddress !== ZERO &&
        !knownQuote(tokenAddress);

      if (!commonVerifiedMint) {
        continue;
      }

      const commonLaunch = {
        verified: true,
        token: tokenAddress,
        name:
          row?.Transfer?.Currency?.Name || null,
        symbol:
          row?.Transfer?.Currency?.Symbol || null,
        decimals:
          safeNumber(
            row?.Transfer?.Currency?.Decimals
          ) || null,
        receiver:
          normalize(row?.Transfer?.Receiver) || null,
        creator:
          normalize(row?.Transaction?.From) || null,
        transactionHash:
          normalize(row?.Transaction?.Hash) || null,
        blockNumber:
          safeNumber(row?.Block?.Number) || null,
        blockTime:
          row?.Block?.Time || null
      };

      if (txTo === BAGS_FACTORY_V210) {
        const launch = {
          ...commonLaunch,
          source:
            "BITQUERY_BAGS_FACTORY_MINT_V210",
          protocolFamily:
            BAGS_PROTOCOL_FAMILY_V210,
          protocol:
            BAGS_PROTOCOL_V210,
          factory:
            BAGS_FACTORY_V210
        };

        launches.push(launch);

        const watched =
          addWatch(
            state,
            tokenAddress,
            null,
            "BITQUERY_BAGS_VERIFIED_LAUNCH_V210"
          );

        if (watched?.token) {
          watched.token.launchpadV210 = {
            verified: true,
            family:
              BAGS_PROTOCOL_FAMILY_V210,
            protocol:
              BAGS_PROTOCOL_V210,
            factory:
              BAGS_FACTORY_V210,
            launchBlock:
              launch.blockNumber,
            launchTime:
              launch.blockTime,
            transactionHash:
              launch.transactionHash
          };
        }

        if (watched?.added) {
          verifiedTokensAdded++;
        }

        continue;
      }

      if (
        txTo ===
        LAUNCHHOOD_FACTORY_V220
      ) {
        const launch = {
          ...commonLaunch,
          source:
            "BITQUERY_LAUNCHHOOD_FACTORY_MINT_V220",
          protocol:
            LAUNCHHOOD_PROTOCOL_V220,
          factory:
            LAUNCHHOOD_FACTORY_V220,
          launchModel:
            "DIRECT_TO_UNISWAP_AT_CREATION",
          uniswapPoolVersion:
            "UNVERIFIED_DO_NOT_GUESS",
          poolId:
            null
        };

        launchHoodLaunchesV220.push(
          launch
        );

        const watched =
          addWatch(
            state,
            tokenAddress,
            null,
            "BITQUERY_LAUNCHHOOD_VERIFIED_LAUNCH_V220"
          );

        if (watched?.token) {
          watched.token.launchpadV220 = {
            verified: true,
            protocol:
              LAUNCHHOOD_PROTOCOL_V220,
            factory:
              LAUNCHHOOD_FACTORY_V220,
            launchBlock:
              launch.blockNumber,
            launchTime:
              launch.blockTime,
            transactionHash:
              launch.transactionHash,
            launchModel:
              launch.launchModel,
            uniswapPoolVersion:
              launch.uniswapPoolVersion,
            poolId:
              null
          };
        }

        if (watched?.added) {
          launchHoodVerifiedTokensAddedV220++;
        }

        continue;
      }

      const fixedMintLaunchpadV222 =
        FIXED_1B_LAUNCHPADS_V222[txTo];

      if (fixedMintLaunchpadV222) {
        const launch = {
          ...commonLaunch,
          source: fixedMintLaunchpadV222.source,
          protocol: fixedMintLaunchpadV222.protocol,
          factory: txTo,
          verification:
            "BITQUERY_ZERO_MINT_1B_TRANSACTION_TO_EXACT_FACTORY_V222",
          venueModel:
            "UNVERIFIED_DO_NOT_GUESS",
          poolId: null
        };

        fixedMintLaunchpadLaunchesV222.push(launch);

        const watched =
          addWatch(
            state,
            tokenAddress,
            null,
            `BITQUERY_${String(fixedMintLaunchpadV222.protocol)
              .toUpperCase()
              .replace(/[^A-Z0-9]+/g, "_")}_VERIFIED_LAUNCH_V222`
          );

        if (watched?.token) {
          watched.token.launchpadV222 = {
            verified: true,
            protocol: fixedMintLaunchpadV222.protocol,
            factory: txTo,
            launchBlock: launch.blockNumber,
            launchTime: launch.blockTime,
            transactionHash: launch.transactionHash,
            verification: launch.verification,
            venueModel: launch.venueModel,
            poolId: null
          };
        }

        if (watched?.added) {
          fixedMintLaunchpadVerifiedTokensAddedV222++;
        }

        continue;
      }

      if (txTo === FLAP_ROUTER_V214) {
        const launch = {
          ...commonLaunch,
          source:
            "BITQUERY_FLAP_ROUTER_MINT_V214",
          protocolFamily:
            FLAP_PROTOCOL_FAMILY_V214,
          protocol:
            FLAP_PROTOCOL_V214,
          router:
            FLAP_ROUTER_V214,
          tradeDecoder:
            "SEPARATE_BONDING_CURVE_DO_NOT_ASSUME_UNISWAP_V4"
        };

        flapLaunches.push(launch);

        const watched =
          addWatch(
            state,
            tokenAddress,
            null,
            "BITQUERY_FLAP_VERIFIED_LAUNCH_V214"
          );

        if (watched?.token) {
          watched.token.launchpadV214 = {
            verified: true,
            family:
              FLAP_PROTOCOL_FAMILY_V214,
            protocol:
              FLAP_PROTOCOL_V214,
            router:
              FLAP_ROUTER_V214,
            launchBlock:
              launch.blockNumber,
            launchTime:
              launch.blockTime,
            transactionHash:
              launch.transactionHash,
            tradeDecoder:
              "SEPARATE_BONDING_CURVE_DO_NOT_ASSUME_UNISWAP_V4"
          };
        }

        if (watched?.added) {
          flapVerifiedTokensAdded++;
        }
      }
    }


    /*
     * V215 Pons V2 launch decoding.
     * Bitquery's current Robinhood realtime decoder exposes the six
     * TokenLaunched arguments by name. We require all three core indexed
     * identities (token, curve, deployer) plus a valid pairToken. No V4
     * PoolId is invented here: Pons does not have a V4 pool until graduation.
     */
    const processV224LaunchRows = (rowsV224, protocol, factory, verification) => {
      for (const row of rowsV224) {
        if (row?.TransactionStatus?.Success === false) continue;
        const txTo = normalize(row?.Transaction?.To);
        const sender = normalize(row?.Transfer?.Sender);
        const tokenAddress = normalize(row?.Transfer?.Currency?.SmartContract);
        if (txTo !== factory || sender !== ZERO || !isAddress(tokenAddress) || tokenAddress === ZERO || knownQuote(tokenAddress)) continue;
        if (protocol === "Clanker" && String(row?.Transfer?.Amount ?? "") !== CLANKER_MINT_AMOUNT_V224) continue;

        const launch = {
          verified: true,
          token: tokenAddress,
          name: row?.Transfer?.Currency?.Name || null,
          symbol: row?.Transfer?.Currency?.Symbol || null,
          decimals: safeNumber(row?.Transfer?.Currency?.Decimals) || null,
          receiver: normalize(row?.Transfer?.Receiver) || null,
          creator: normalize(row?.Transaction?.From) || null,
          transactionHash: normalize(row?.Transaction?.Hash) || null,
          blockNumber: safeNumber(row?.Block?.Number) || null,
          blockTime: row?.Block?.Time || null,
          mintAmount: String(row?.Transfer?.Amount ?? "") || null,
          source: `BITQUERY_${protocol.toUpperCase()}_VERIFIED_LAUNCH_V224`,
          protocol,
          factory,
          verification,
          venueModel: "UNVERIFIED_DO_NOT_GUESS",
          poolId: null
        };
        clankerVirtualsLaunchesV224.push(launch);
        const watched = addWatch(state, tokenAddress, null, `BITQUERY_${protocol.toUpperCase()}_VERIFIED_LAUNCH_V224`);
        if (watched?.token) {
          watched.token.launchpadV224 = {
            verified: true,
            protocol,
            factory,
            launchBlock: launch.blockNumber,
            launchTime: launch.blockTime,
            transactionHash: launch.transactionHash,
            mintAmount: launch.mintAmount,
            verification,
            venueModel: launch.venueModel,
            poolId: null
          };
        }
        if (watched?.added) clankerVirtualsVerifiedTokensAddedV224++;
      }
    };

    processV224LaunchRows(clankerRowsV224, "Clanker", CLANKER_FACTORY_V224,
      "BITQUERY_ZERO_MINT_100B_TRANSACTION_TO_EXACT_FACTORY_V224");
    processV224LaunchRows(virtualsRowsV224, "Virtuals", VIRTUALS_FACTORY_V224,
      "BITQUERY_ZERO_MINT_EXACT_FACTORY_NO_FIXED_SUPPLY_ASSUMPTION_V224");

    const ponsArgumentValueV215 =
      (row, name) => {
        const arg =
          Array.isArray(row?.Arguments)
            ? row.Arguments.find(
                item =>
                  String(item?.Name || "") === name
              )
            : null;

        const value =
          arg?.Value;

        if (!value) {
          return null;
        }

        if (
          value.address !== undefined &&
          value.address !== null
        ) {
          return normalize(value.address);
        }

        if (
          value.bigInteger !== undefined &&
          value.bigInteger !== null
        ) {
          return String(value.bigInteger);
        }

        if (
          value.integer !== undefined &&
          value.integer !== null
        ) {
          return String(value.integer);
        }

        if (
          value.hex !== undefined &&
          value.hex !== null
        ) {
          return String(value.hex);
        }

        return null;
      };

    for (const row of ponsRows) {
      const signatureName =
        String(
          row?.Log?.Signature?.Name || ""
        );

      if (signatureName !== "TokenLaunched") {
        continue;
      }

      const tokenAddress =
        ponsArgumentValueV215(
          row,
          "token"
        );

      const curve =
        ponsArgumentValueV215(
          row,
          "curve"
        );

      const deployer =
        ponsArgumentValueV215(
          row,
          "deployer"
        );

      const rawPairToken =
        ponsArgumentValueV215(
          row,
          "pairToken"
        );

      const pairToken =
        String(rawPairToken || "").toLowerCase() === "0x"
          ? ZERO
          : normalize(rawPairToken);

      const launchConfigId =
        ponsArgumentValueV215(
          row,
          "launchConfigId"
        );

      const graduationThreshold =
        ponsArgumentValueV215(
          row,
          "graduationThreshold"
        );

      if (
        !isAddress(tokenAddress) ||
        tokenAddress === ZERO ||
        !isAddress(curve) ||
        curve === ZERO ||
        !isAddress(deployer) ||
        !isAddress(pairToken) ||
        pairToken === tokenAddress
      ) {
        continue;
      }

      const launch = {
        verified: true,
        source:
          "BITQUERY_PONS_V2_TOKENLAUNCHED_V215",
        protocol:
          PONS_PROTOCOL_V215,
        factory:
          PONS_V2_FACTORY_V215,
        router:
          PONS_V2_ROUTER_V215,
        memeHook:
          PONS_V2_MEME_HOOK_V215,
        token:
          tokenAddress,
        curve,
        deployer,
        pairToken,
        launchConfigId:
          launchConfigId !== null
            ? String(launchConfigId)
            : null,
        graduationThreshold:
          graduationThreshold !== null
            ? String(graduationThreshold)
            : null,
        transactionHash:
          normalize(
            row?.Transaction?.Hash
          ) || null,
        blockNumber:
          safeNumber(
            row?.Block?.Number
          ) || null,
        blockTime:
          row?.Block?.Time || null,
        lifecycle:
          "BONDING_CURVE_PRE_GRADUATION_UNLESS_SEPARATELY_PROVEN",
        tradeDecoder:
          "PONS_V2_SEPARATE_DO_NOT_ASSUME_UNISWAP_V4",
        v4PoolVerified:
          false
      };

      ponsLaunches.push(launch);

      const watched =
        addWatch(
          state,
          tokenAddress,
          null,
          "BITQUERY_PONS_V2_VERIFIED_LAUNCH_V215"
        );

      if (watched?.token) {
        watched.token.launchpadV215 = {
          verified: true,
          protocol:
            PONS_PROTOCOL_V215,
          factory:
            PONS_V2_FACTORY_V215,
          router:
            PONS_V2_ROUTER_V215,
          memeHook:
            PONS_V2_MEME_HOOK_V215,
          curve,
          deployer,
          pairToken,
          launchConfigId:
            launch.launchConfigId,
          graduationThreshold:
            launch.graduationThreshold,
          launchBlock:
            launch.blockNumber,
          launchTime:
            launch.blockTime,
          transactionHash:
            launch.transactionHash,
          lifecycle:
            launch.lifecycle,
          tradeDecoder:
            launch.tradeDecoder,
          v4PoolVerified:
            false
        };
      }

      if (watched?.added) {
        ponsVerifiedTokensAdded++;
      }
    }


    /*
     * V216: verified Pons V2 curve-trade ingestion.
     *
     * Verification requirements:
     * - exact Trading market labels: Pons / pons_v2 / Robinhood
     * - token must be in the verified Pons V2 launch set (persisted or found
     *   in this same response)
     * - Side must be BUY or SELL
     * - AmountsInUsd.Quote must be finite and > 0
     *
     * We intentionally do not infer USD from EVM DEXTrades because Bitquery
     * documents PriceInUSD=0 there for Pons curve trades.
     */
    const ponsCurveTelemetryV216 =
      state.ponsCurveTradesV216 &&
      typeof state.ponsCurveTradesV216 === "object"
        ? state.ponsCurveTradesV216
        : newState().ponsCurveTradesV216;

    state.ponsCurveTradesV216 =
      ponsCurveTelemetryV216;

    ponsCurveTelemetryV216.lastQueryAt =
      Date.now();

    const verifiedPonsTokensV216 =
      new Set(
        ponsTradeTargetTokensV217
      );

    const verifiedPonsTradesV216 = [];

    for (const row of ponsTradeRowsV216) {
      const protocol =
        String(
          row?.Pair?.Market?.Protocol || ""
        ).toLowerCase();

      const family =
        String(
          row?.Pair?.Market?.ProtocolFamily || ""
        ).toLowerCase();

      const network =
        String(
          row?.Pair?.Market?.Network || ""
        ).toLowerCase();

      const tokenAddress =
        normalize(
          row?.Pair?.Token?.Address
        );

      const rawQuoteAddress =
        String(
          row?.Pair?.QuoteToken?.Address || ""
        )
          .trim()
          .toLowerCase();

      const quoteAddress =
        rawQuoteAddress === "0x"
          ? ZERO
          : normalize(rawQuoteAddress);

      const sideRaw =
        String(row?.Side || "")
          .trim()
          .toLowerCase();

      const side =
        sideRaw === "buy"
          ? "buy"
          : (
              sideRaw === "sell"
                ? "sell"
                : null
            );

      const quoteUsd =
        Number(
          row?.AmountsInUsd?.Quote
        );

      if (
        protocol !== "pons_v2" ||
        family !== "pons" ||
        network !== "robinhood" ||
        !isAddress(tokenAddress) ||
        !verifiedPonsTokensV216.has(
          tokenAddress
        ) ||
        !side ||
        !Number.isFinite(quoteUsd) ||
        quoteUsd <= 0
      ) {
        continue;
      }

      const txHash =
        normalize(
          row?.TransactionHeader?.Hash
        );

      if (
        !/^0x[a-f0-9]{64}$/.test(txHash)
      ) {
        continue;
      }

      const trader =
        normalize(
          row?.Trader?.Address
        );

      const trade = {
        verified: true,
        source:
          "BITQUERY_TRADING_PONS_V2_V216",
        protocol:
          "pons_v2",
        protocolFamily:
          "Pons",
        network:
          "Robinhood",
        token:
          tokenAddress,
        tokenSymbol:
          row?.Pair?.Token?.Symbol || null,
        quoteToken:
          isAddress(quoteAddress)
            ? quoteAddress
            : null,
        quoteSymbol:
          row?.Pair?.QuoteToken?.Symbol || null,
        side,
        tradeUsd:
          quoteUsd,
        quoteAmount:
          Number.isFinite(
            Number(row?.Amounts?.Quote)
          )
            ? Number(row.Amounts.Quote)
            : null,
        baseAmount:
          Number.isFinite(
            Number(row?.Amounts?.Base)
          )
            ? Number(row.Amounts.Base)
            : null,
        priceInUsd:
          Number.isFinite(
            Number(row?.PriceInUsd)
          ) &&
          Number(row.PriceInUsd) > 0
            ? Number(row.PriceInUsd)
            : null,
        trader:
          isAddress(trader)
            ? trader
            : null,
        transactionHash:
          txHash,
        blockTime:
          row?.Block?.Time || null,
        observedAt:
          Date.parse(
            row?.Block?.Time || ""
          ) || Date.now(),
        usdVerification:
          "BITQUERY_TRADING_AMOUNTSINUSD_QUOTE",
        exactCandidateMatch:
          true,
        v4PoolVerified:
          false
      };

      verifiedPonsTradesV216.push(
        trade
      );
    }

    ponsCurveTelemetryV216.recentTrades =
      Array.isArray(
        ponsCurveTelemetryV216.recentTrades
      )
        ? ponsCurveTelemetryV216.recentTrades
        : [];

    const knownPonsTradesV216 =
      new Set(
        ponsCurveTelemetryV216.recentTrades.map(
          row =>
            `${normalize(row?.transactionHash)}:${String(row?.side || "")}:${normalize(row?.token)}`
        )
      );

    let newVerifiedPonsTradesV216 = 0;

    for (const trade of verifiedPonsTradesV216) {
      const key =
        `${normalize(trade.transactionHash)}:${trade.side}:${normalize(trade.token)}`;

      if (
        knownPonsTradesV216.has(key)
      ) {
        continue;
      }

      knownPonsTradesV216.add(key);
      newVerifiedPonsTradesV216++;

      ponsCurveTelemetryV216.recentTrades.push(
        trade
      );

      ponsCurveTelemetryV216.lastTradeAt =
        trade.observedAt;
      ponsCurveTelemetryV216.lastToken =
        trade.token;
    }

    ponsCurveTelemetryV216.recentTrades =
      ponsCurveTelemetryV216.recentTrades.slice(
        -500
      );

    ponsCurveTelemetryV216.totalRowsSeen =
      safeNumber(
        ponsCurveTelemetryV216.totalRowsSeen
      ) +
      ponsTradeRowsV216.length;

    ponsCurveTelemetryV216.totalVerifiedTrades =
      safeNumber(
        ponsCurveTelemetryV216.totalVerifiedTrades
      ) +
      newVerifiedPonsTradesV216;

    ponsCurveTelemetryV216.lastStatus =
      verifiedPonsTradesV216.length
        ? "VERIFIED_PONS_V2_TRADES_FOUND"
        : (
            ponsTradeRowsV216.length
              ? "ROWS_RETURNED_NONE_MATCHED_VERIFIED_PONS_TOKENS"
              : "NO_PONS_V2_TRADES_RETURNED"
          );

    /*
     * Deduplicate by token+tx because the bounded latest-launch query can
     * overlap between scans. Persistent totals count only launch identities
     * not already retained in recentVerifiedLaunches.
     */
    telemetry.recentVerifiedLaunches =
      Array.isArray(telemetry.recentVerifiedLaunches)
        ? telemetry.recentVerifiedLaunches
        : [];

    const known =
      new Set(
        telemetry.recentVerifiedLaunches.map(
          row =>
            `${normalize(row?.token)}:${normalize(row?.transactionHash)}`
        )
      );

    let newlyObserved = 0;

    for (const launch of launches) {
      const key =
        `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;

      if (known.has(key)) continue;
      known.add(key);
      newlyObserved++;

      telemetry.lastLaunchAt = Date.now();
      telemetry.lastLaunchBlock = launch.blockNumber;
      telemetry.lastVerifiedToken = launch.token;
      telemetry.recentVerifiedLaunches.push(launch);
    }

    telemetry.recentVerifiedLaunches =
      telemetry.recentVerifiedLaunches.slice(-25);

    telemetry.totalLaunchesSeen =
      safeNumber(telemetry.totalLaunchesSeen) + newlyObserved;
    telemetry.totalVerifiedTokensAdded =
      safeNumber(telemetry.totalVerifiedTokensAdded) +
      verifiedTokensAdded;
    telemetry.lastStatus =
      launches.length ? "VERIFIED_LAUNCHES_FOUND" : "NO_LAUNCHES_RETURNED";

    flapTelemetry.recentVerifiedLaunches =
      Array.isArray(
        flapTelemetry.recentVerifiedLaunches
      )
        ? flapTelemetry.recentVerifiedLaunches
        : [];

    const knownFlap =
      new Set(
        flapTelemetry.recentVerifiedLaunches.map(
          row =>
            `${normalize(row?.token)}:${normalize(row?.transactionHash)}`
        )
      );

    let newlyObservedFlap = 0;

    for (const launch of flapLaunches) {
      const key =
        `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;

      if (knownFlap.has(key)) {
        continue;
      }

      knownFlap.add(key);
      newlyObservedFlap++;

      flapTelemetry.lastLaunchAt =
        Date.now();
      flapTelemetry.lastLaunchBlock =
        launch.blockNumber;
      flapTelemetry.lastVerifiedToken =
        launch.token;

      flapTelemetry.recentVerifiedLaunches.push(
        launch
      );
    }

    flapTelemetry.recentVerifiedLaunches =
      flapTelemetry.recentVerifiedLaunches.slice(
        -25
      );

    flapTelemetry.totalLaunchesSeen =
      safeNumber(
        flapTelemetry.totalLaunchesSeen
      ) + newlyObservedFlap;

    flapTelemetry.totalVerifiedTokensAdded =
      safeNumber(
        flapTelemetry.totalVerifiedTokensAdded
      ) + flapVerifiedTokensAdded;

    flapTelemetry.lastStatus =
      flapLaunches.length
        ? "VERIFIED_FLAP_LAUNCHES_FOUND"
        : "NO_FLAP_LAUNCHES_RETURNED";

    ponsTelemetry.recentVerifiedLaunches =
      Array.isArray(
        ponsTelemetry.recentVerifiedLaunches
      )
        ? ponsTelemetry.recentVerifiedLaunches
        : [];

    const knownPons =
      new Set(
        ponsTelemetry.recentVerifiedLaunches.map(
          row =>
            `${normalize(row?.token)}:${normalize(row?.transactionHash)}`
        )
      );

    let newlyObservedPons = 0;

    for (const launch of ponsLaunches) {
      const key =
        `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;

      if (knownPons.has(key)) {
        continue;
      }

      knownPons.add(key);
      newlyObservedPons++;

      ponsTelemetry.lastLaunchAt =
        Date.now();
      ponsTelemetry.lastLaunchBlock =
        launch.blockNumber;
      ponsTelemetry.lastVerifiedToken =
        launch.token;
      ponsTelemetry.lastVerifiedCurve =
        launch.curve;
      ponsTelemetry.lastPairToken =
        launch.pairToken;

      ponsTelemetry.recentVerifiedLaunches.push(
        launch
      );
    }

    ponsTelemetry.recentVerifiedLaunches =
      ponsTelemetry.recentVerifiedLaunches.slice(
        -25
      );

    ponsTelemetry.totalLaunchesSeen =
      safeNumber(
        ponsTelemetry.totalLaunchesSeen
      ) + newlyObservedPons;

    ponsTelemetry.totalVerifiedTokensAdded =
      safeNumber(
        ponsTelemetry.totalVerifiedTokensAdded
      ) + ponsVerifiedTokensAdded;

    ponsTelemetry.lastStatus =
      ponsLaunches.length
        ? "VERIFIED_PONS_V2_LAUNCHES_FOUND"
        : "NO_PONS_V2_LAUNCHES_RETURNED";

    launchHoodTelemetryV220.recentVerifiedLaunches =
      Array.isArray(
        launchHoodTelemetryV220.recentVerifiedLaunches
      )
        ? launchHoodTelemetryV220.recentVerifiedLaunches
        : [];

    const knownLaunchHoodV220 =
      new Set(
        launchHoodTelemetryV220.recentVerifiedLaunches.map(
          row =>
            `${normalize(row?.token)}:${normalize(row?.transactionHash)}`
        )
      );

    let launchHoodNewlyObservedV220 = 0;

    for (const launch of launchHoodLaunchesV220) {
      const key =
        `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;

      if (knownLaunchHoodV220.has(key)) {
        continue;
      }

      knownLaunchHoodV220.add(key);
      launchHoodNewlyObservedV220++;

      launchHoodTelemetryV220.lastLaunchAt =
        Date.now();
      launchHoodTelemetryV220.lastLaunchBlock =
        launch.blockNumber;
      launchHoodTelemetryV220.lastVerifiedToken =
        launch.token;

      launchHoodTelemetryV220.recentVerifiedLaunches.push(
        launch
      );
    }

    launchHoodTelemetryV220.recentVerifiedLaunches =
      launchHoodTelemetryV220.recentVerifiedLaunches.slice(
        -25
      );

    launchHoodTelemetryV220.totalLaunchesSeen =
      safeNumber(
        launchHoodTelemetryV220.totalLaunchesSeen
      ) + launchHoodNewlyObservedV220;

    launchHoodTelemetryV220.totalVerifiedTokensAdded =
      safeNumber(
        launchHoodTelemetryV220.totalVerifiedTokensAdded
      ) + launchHoodVerifiedTokensAddedV220;

    launchHoodTelemetryV220.lastStatus =
      launchHoodLaunchesV220.length
        ? "VERIFIED_LAUNCHHOOD_LAUNCHES_FOUND"
        : "NO_LAUNCHHOOD_LAUNCHES_RETURNED";

    fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches =
      Array.isArray(
        fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches
      )
        ? fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches
        : [];

    fixedMintLaunchpadTelemetryV222.byProtocol =
      fixedMintLaunchpadTelemetryV222.byProtocol &&
      typeof fixedMintLaunchpadTelemetryV222.byProtocol === "object"
        ? fixedMintLaunchpadTelemetryV222.byProtocol
        : {};

    const knownFixedMintV222 =
      new Set(
        fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches.map(
          row =>
            `${normalize(row?.token)}:${normalize(row?.transactionHash)}`
        )
      );

    let fixedMintLaunchpadNewlyObservedV222 = 0;

    for (const launch of fixedMintLaunchpadLaunchesV222) {
      const key =
        `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;

      if (knownFixedMintV222.has(key)) {
        continue;
      }

      knownFixedMintV222.add(key);
      fixedMintLaunchpadNewlyObservedV222++;

      fixedMintLaunchpadTelemetryV222.lastLaunchAt =
        Date.now();
      fixedMintLaunchpadTelemetryV222.lastLaunchBlock =
        launch.blockNumber;
      fixedMintLaunchpadTelemetryV222.lastVerifiedToken =
        launch.token;
      fixedMintLaunchpadTelemetryV222.lastProtocol =
        launch.protocol;

      const protocolState =
        fixedMintLaunchpadTelemetryV222.byProtocol[launch.protocol] &&
        typeof fixedMintLaunchpadTelemetryV222.byProtocol[launch.protocol] === "object"
          ? fixedMintLaunchpadTelemetryV222.byProtocol[launch.protocol]
          : {
              totalLaunchesSeen: 0,
              lastLaunchAt: null,
              lastLaunchBlock: null,
              lastVerifiedToken: null
            };

      protocolState.totalLaunchesSeen =
        safeNumber(protocolState.totalLaunchesSeen) + 1;
      protocolState.lastLaunchAt = Date.now();
      protocolState.lastLaunchBlock = launch.blockNumber;
      protocolState.lastVerifiedToken = launch.token;
      fixedMintLaunchpadTelemetryV222.byProtocol[launch.protocol] =
        protocolState;

      fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches.push(
        launch
      );
    }

    fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches =
      fixedMintLaunchpadTelemetryV222.recentVerifiedLaunches.slice(-50);

    fixedMintLaunchpadTelemetryV222.totalLaunchesSeen =
      safeNumber(
        fixedMintLaunchpadTelemetryV222.totalLaunchesSeen
      ) + fixedMintLaunchpadNewlyObservedV222;

    fixedMintLaunchpadTelemetryV222.totalVerifiedTokensAdded =
      safeNumber(
        fixedMintLaunchpadTelemetryV222.totalVerifiedTokensAdded
      ) + fixedMintLaunchpadVerifiedTokensAddedV222;


    fixedMintLaunchpadTelemetryV222.lastStatus =
      fixedMintLaunchpadLaunchesV222.length
        ? "VERIFIED_FIXED_1B_LAUNCHPAD_LAUNCHES_FOUND_V222"
        : "NO_FIXED_1B_LAUNCHPAD_LAUNCHES_RETURNED_V222";

    clankerVirtualsTelemetryV224.recentVerifiedLaunches =
      Array.isArray(clankerVirtualsTelemetryV224.recentVerifiedLaunches)
        ? clankerVirtualsTelemetryV224.recentVerifiedLaunches : [];
    clankerVirtualsTelemetryV224.byProtocol =
      clankerVirtualsTelemetryV224.byProtocol && typeof clankerVirtualsTelemetryV224.byProtocol === "object"
        ? clankerVirtualsTelemetryV224.byProtocol : {};
    const knownV224 = new Set(clankerVirtualsTelemetryV224.recentVerifiedLaunches.map(
      row => `${normalize(row?.token)}:${normalize(row?.transactionHash)}`));
    let clankerVirtualsNewlyObservedV224 = 0;
    for (const launch of clankerVirtualsLaunchesV224) {
      const key = `${normalize(launch.token)}:${normalize(launch.transactionHash)}`;
      if (knownV224.has(key)) continue;
      knownV224.add(key);
      clankerVirtualsNewlyObservedV224++;
      clankerVirtualsTelemetryV224.lastLaunchAt = Date.now();
      clankerVirtualsTelemetryV224.lastLaunchBlock = launch.blockNumber;
      clankerVirtualsTelemetryV224.lastVerifiedToken = launch.token;
      clankerVirtualsTelemetryV224.lastProtocol = launch.protocol;
      const p = clankerVirtualsTelemetryV224.byProtocol[launch.protocol] && typeof clankerVirtualsTelemetryV224.byProtocol[launch.protocol] === "object"
        ? clankerVirtualsTelemetryV224.byProtocol[launch.protocol]
        : {totalLaunchesSeen: 0, lastLaunchAt: null, lastLaunchBlock: null, lastVerifiedToken: null};
      p.totalLaunchesSeen = safeNumber(p.totalLaunchesSeen) + 1;
      p.lastLaunchAt = Date.now();
      p.lastLaunchBlock = launch.blockNumber;
      p.lastVerifiedToken = launch.token;
      clankerVirtualsTelemetryV224.byProtocol[launch.protocol] = p;
      clankerVirtualsTelemetryV224.recentVerifiedLaunches.push(launch);
    }
    clankerVirtualsTelemetryV224.recentVerifiedLaunches = clankerVirtualsTelemetryV224.recentVerifiedLaunches.slice(-50);
    clankerVirtualsTelemetryV224.totalLaunchesSeen = safeNumber(clankerVirtualsTelemetryV224.totalLaunchesSeen) + clankerVirtualsNewlyObservedV224;
    clankerVirtualsTelemetryV224.totalVerifiedTokensAdded = safeNumber(clankerVirtualsTelemetryV224.totalVerifiedTokensAdded) + clankerVirtualsVerifiedTokensAddedV224;
    clankerVirtualsTelemetryV224.lastStatus = clankerVirtualsLaunchesV224.length
      ? "VERIFIED_CLANKER_VIRTUALS_LAUNCHES_FOUND_V224"
      : "NO_CLANKER_VIRTUALS_LAUNCHES_RETURNED_V224";

    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      httpStatus: response.status,
      launchesSeen: launches.length,
      newlyObserved,
      verifiedTokensAdded,
      launches: launches.slice(0, 10),
      flapLaunchesSeen:
        flapLaunches.length,
      flapNewlyObserved:
        newlyObservedFlap,
      flapVerifiedTokensAdded,
      flapLaunches:
        flapLaunches.slice(0, 10),
      flapStatus:
        flapTelemetry.lastStatus,
      ponsLaunchesSeen:
        ponsLaunches.length,
      ponsNewlyObserved:
        newlyObservedPons,
      ponsVerifiedTokensAdded,
      ponsLaunches:
        ponsLaunches.slice(0, 10),
      ponsStatus:
        ponsTelemetry.lastStatus,
      launchHoodLaunchesSeenV220:
        launchHoodLaunchesV220.length,
      launchHoodNewlyObservedV220,
      launchHoodVerifiedTokensAddedV220,
      launchHoodLaunchesV220:
        launchHoodLaunchesV220.slice(0, 10),
      launchHoodStatusV220:
        launchHoodTelemetryV220.lastStatus,
      fixedMintLaunchpadLaunchesSeenV222:
        fixedMintLaunchpadLaunchesV222.length,
      fixedMintLaunchpadNewlyObservedV222,
      fixedMintLaunchpadVerifiedTokensAddedV222,
      fixedMintLaunchpadLaunchesV222:
        fixedMintLaunchpadLaunchesV222.slice(0, 50),
      fixedMintLaunchpadStatusV222:
        fixedMintLaunchpadTelemetryV222.lastStatus,
      clankerVirtualsLaunchesSeenV224: clankerVirtualsLaunchesV224.length,
      clankerVirtualsNewlyObservedV224,
      clankerVirtualsVerifiedTokensAddedV224,
      clankerVirtualsLaunchesV224: clankerVirtualsLaunchesV224.slice(0, 50),
      clankerVirtualsStatusV224: clankerVirtualsTelemetryV224.lastStatus,
      bitqueryHolderEvidenceV227: {
        targetAddress: bitqueryHolderTargetAddressV227,
        targetReason: bitqueryHolderTargetReasonV227,
        attempted: Boolean(bitqueryHolderTargetAddressV227),
        verified: state.bitqueryHolderEvidenceV227?.verified === true &&
          normalize(state.bitqueryHolderEvidenceV227?.address) === bitqueryHolderTargetAddressV227,
        status: bitqueryHolderTargetAddressV227
          ? state.bitqueryHolderEvidenceV227?.status || "NO_RESPONSE_STATE"
          : "NOT_TARGETED",
        holderCount: bitqueryHolderTargetAddressV227
          ? state.bitqueryHolderEvidenceV227?.holderCount ?? null
          : null,
        rowCount: bitqueryHolderTargetAddressV227
          ? safeNumber(state.bitqueryHolderEvidenceV227?.rowCount)
          : 0,
        dataset: "realtime",
        externalRequestsAdded: 0
      },
      bitqueryMarketEvidenceV233: bitqueryMarketTargetAddressV233
        ? {
            ...(state.bitqueryMarketEvidenceV233 || base.bitqueryMarketEvidenceV233),
            targetAddress: bitqueryMarketTargetAddressV233,
            targetReason: bitqueryMarketTargetReasonV233
          }
        : base.bitqueryMarketEvidenceV233,
      bitqueryRankedPairEvidenceV234: bitqueryRankedPairTargetAddressV234
        ? {
            ...(state.bitqueryRankedPairEvidenceV234 || base.bitqueryRankedPairEvidenceV234),
            targetAddress: bitqueryRankedPairTargetAddressV234,
            targetReason: bitqueryRankedPairTargetReasonV234
          }
        : base.bitqueryRankedPairEvidenceV234,
      bitqueryLiquidityEvidenceV237: bitqueryLiquidityTargetPoolIdV237
        ? {
            ...(state.bitqueryLiquidityEvidenceV237 || base.bitqueryLiquidityEvidenceV237),
            targetAddress: bitqueryLiquidityTargetAddressV237,
            poolId: bitqueryLiquidityTargetPoolIdV237,
            targetReason: bitqueryLiquidityTargetReasonV237
          }
        : base.bitqueryLiquidityEvidenceV237,
      ponsCurveTradesV216: {
        targetingVersion:
          "V217_NEWEST_VERIFIED_PONS_KV_TARGETING",
        targetTokenCount:
          ponsTradeTargetTokensV217.length,
        targetTokens:
          ponsTradeTargetTokensV217,
        currentScanLaunchesExcludedUntilNextScan:
          true,
        rowsSeen:
          ponsTradeRowsV216.length,
        verifiedTrades:
          verifiedPonsTradesV216.length,
        newlyObserved:
          newVerifiedPonsTradesV216,
        verifiedPonsTokenSetSize:
          verifiedPonsTokensV216.size,
        status:
          ponsCurveTelemetryV216.lastStatus,
        trades:
          verifiedPonsTradesV216.slice(0, 25)
      },
      status: telemetry.lastStatus
    };
  } catch (error) {
    telemetry.lastStatus = "FETCH_ERROR";
    return {
      ...base,
      attempted: true,
      externalRequestsUsed: 1,
      status: "FETCH_ERROR",
      error: errorString(error)
    };
  }
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

  let initializeRecoveredUnknownPoolsV185 =
    0;

  const poolRegistryActivityV185 =
    refreshKnownPoolActivityV185(
      state,
      logs
    );

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

    const registrationV185 =
      registerPoolMapping(
        state,
        pool
      );

    if (
      registrationV185
        ?.recoveredUnknownTracker ===
        true
    ) {
      initializeRecoveredUnknownPoolsV185++;
    }

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

  const poolsTradeLaunchEventsV205 =
    recognizePoolsTradeLaunchLogsV205(logs);

  let poolsTradeVerifiedTokensAddedV208 = 0;
  let poolsTradeVerifiedPoolsRegisteredV208 = 0;

  for (const event of poolsTradeLaunchEventsV205) {
    if (event?.decodeVerified !== true || !isAddress(event?.token)) continue;

    if (event.event === "TokenLaunched") {
      const pool = {
        poolId: event.poolId,
        currency0: event.currency0,
        currency1: event.currency1,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        source: "POOLS_TRADE_TOKEN_LAUNCHED_V208",
        poolsTradeVerifiedV208: true
      };

      const registration = registerPoolMapping(state, pool);
      if (registration?.registered === true) {
        poolsTradeVerifiedPoolsRegisteredV208++;
      }

      const watched = addWatch(
        state,
        event.token,
        pool,
        source === "LIVE"
          ? "LIVE_POOLS_TRADE_VERIFIED_V208"
          : "BACKLOG_POOLS_TRADE_VERIFIED_V208"
      );

      if (watched?.token) seenTokens.add(normalize(event.token));
      if (watched?.added) {
        newTokens.add(normalize(event.token));
        poolsTradeVerifiedTokensAddedV208++;
      }
    } else if (event.event === "TokenCreated") {
      const watched = addWatch(
        state,
        event.token,
        null,
        source === "LIVE"
          ? "LIVE_POOLS_TRADE_TOKEN_CREATED_V208"
          : "BACKLOG_POOLS_TRADE_TOKEN_CREATED_V208"
      );
      if (watched?.token) seenTokens.add(normalize(event.token));
      if (watched?.added) {
        newTokens.add(normalize(event.token));
        poolsTradeVerifiedTokensAddedV208++;
      }
    }
  }

  state.poolsTradeLaunchTelemetryV209 =
    state.poolsTradeLaunchTelemetryV209 &&
    typeof state.poolsTradeLaunchTelemetryV209 === "object"
      ? state.poolsTradeLaunchTelemetryV209
      : newState().poolsTradeLaunchTelemetryV209;

  const cumulativeV209 = state.poolsTradeLaunchTelemetryV209;
  cumulativeV209.totalEventsSeen =
    safeNumber(cumulativeV209.totalEventsSeen) + poolsTradeLaunchEventsV205.length;
  cumulativeV209.totalDecodedVerified =
    safeNumber(cumulativeV209.totalDecodedVerified) +
    poolsTradeLaunchEventsV205.filter(row => row?.decodeVerified === true).length;
  cumulativeV209.totalVerifiedTokensAdded =
    safeNumber(cumulativeV209.totalVerifiedTokensAdded) +
    poolsTradeVerifiedTokensAddedV208;
  cumulativeV209.totalVerifiedPoolsRegistered =
    safeNumber(cumulativeV209.totalVerifiedPoolsRegistered) +
    poolsTradeVerifiedPoolsRegisteredV208;
  cumulativeV209.tokenCreatedSeen =
    safeNumber(cumulativeV209.tokenCreatedSeen) +
    poolsTradeLaunchEventsV205.filter(row => row?.event === "TokenCreated").length;
  cumulativeV209.tokenLaunchedSeen =
    safeNumber(cumulativeV209.tokenLaunchedSeen) +
    poolsTradeLaunchEventsV205.filter(row => row?.event === "TokenLaunched").length;

  for (const event of poolsTradeLaunchEventsV205) {
    if (event?.decodeVerified !== true) continue;
    const at = Date.now();
    if (!cumulativeV209.firstVerifiedLaunchAt) cumulativeV209.firstVerifiedLaunchAt = at;
    cumulativeV209.lastVerifiedLaunchAt = at;
    try {
      cumulativeV209.lastVerifiedLaunchBlock =
        event?.blockNumber ? Number(BigInt(event.blockNumber)) : null;
    } catch {
      cumulativeV209.lastVerifiedLaunchBlock = null;
    }
    cumulativeV209.lastVerifiedToken = event?.token || cumulativeV209.lastVerifiedToken || null;
    if (event?.poolId) cumulativeV209.lastVerifiedPoolId = event.poolId;
    cumulativeV209.recentVerifiedLaunches =
      Array.isArray(cumulativeV209.recentVerifiedLaunches)
        ? cumulativeV209.recentVerifiedLaunches
        : [];
    cumulativeV209.recentVerifiedLaunches.push({
      event: event.event,
      token: event.token || null,
      poolId: event.poolId || null,
      blockNumber: cumulativeV209.lastVerifiedLaunchBlock,
      transactionHash: event.transactionHash || null,
      source,
      seenAt: at
    });
    cumulativeV209.recentVerifiedLaunches =
      cumulativeV209.recentVerifiedLaunches.slice(-25);
  }

  return {
    rawLogs:
      logs.length,

    poolsTradeLaunchEventsV205: {
      enabled: true,
      positiveEmitterVerification: true,
      externalRequestsAdded: 0,
      eventsSeen: poolsTradeLaunchEventsV205.length,
      decodedVerified:
        poolsTradeLaunchEventsV205.filter(row => row?.decodeVerified === true).length,
      verifiedTokensAdded:
        poolsTradeVerifiedTokensAddedV208,
      verifiedPoolsRegistered:
        poolsTradeVerifiedPoolsRegisteredV208,
      events: poolsTradeLaunchEventsV205.slice(0, 20),
      tokenExtractionStatus:
        poolsTradeLaunchEventsV205.some(row => row?.decodeVerified === true)
          ? "VERIFIED_ABI_DECODE_ACTIVE_V208"
          : poolsTradeLaunchEventsV205.length
            ? "EVENT_SEEN_BUT_VALIDATION_FAILED"
            : "NO_VERIFIED_LAUNCH_EVENT_IN_BATCH"
    },

    initializeEvents,

    swapTopicMatches,

    liquidityTopicMatches,

    initializeRecoveredUnknownPoolsV185,

    poolRegistryActivityV185,

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



function marketProviderRecoveryV157(
  state
) {
  state.services =
    state.services ||
    {};

  const existing =
    state.services
      .marketProviderRecoveryV157;

  state.services
    .marketProviderRecoveryV157 =
    existing &&
    typeof existing ===
      "object"
      ? existing
      : {
          scanStartedAt:
            null,
          recoveringProviderUsedThisScan:
            null,
          recoveringProviderUsedAt:
            null,
          blockDexUntil:
            null,
          blockGeckoUntil:
            null,
          last429Provider:
            null,
          last429At:
            null,
          lastRecoverySuccessProvider:
            null,
          lastRecoverySuccessAt:
            null
        };

  return state.services
    .marketProviderRecoveryV157;
}

function beginMarketProviderRecoveryScanV157(
  state,
  startedAt
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  recovery.scanStartedAt =
    safeNumber(
      startedAt
    ) ||
    Date.now();

  recovery
    .recoveringProviderUsedThisScan =
    null;

  recovery
    .recoveringProviderUsedAt =
    null;

  return recovery;
}

function providerServiceV157(
  state,
  provider
) {
  return provider ===
    "DEX"
    ? dexService(
        state
      )
    : geckoService(
        state
      );
}

function marketProviderRecoveryEligibilityV157(
  state,
  provider
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  const service =
    providerServiceV157(
      state,
      provider
    );

  const now =
    Date.now();

  const blockedUntil =
    provider ===
      "DEX"
      ? safeNumber(
          recovery.blockDexUntil
        )
      : safeNumber(
          recovery.blockGeckoUntil
        );

  if (
    blockedUntil &&
    now <
      blockedUntil
  ) {
    return {
      eligible:
        false,
      reason:
        `${provider}_CROSS_PROVIDER_STAGGER_V157`,
      eligibleAt:
        blockedUntil,
      recoveryPending:
        service
          .recoveryProbePendingV157 ===
        true
    };
  }

  const recoveryPending =
    service
      .recoveryProbePendingV157 ===
    true;

  const usedProvider =
    String(
      recovery
        .recoveringProviderUsedThisScan ||
      ""
    );

  if (
    recoveryPending &&
    usedProvider &&
    usedProvider !==
      provider
  ) {
    return {
      eligible:
        false,
      reason:
        `${provider}_RECOVERY_PROBE_DEFERRED_V157`,
      eligibleAt:
        Math.max(
          now,
          safeNumber(
            recovery.scanStartedAt
          ) +
          MARKET_PROVIDER_CROSS_STAGGER_MS_V157
        ),
      recoveryPending:
        true
    };
  }

  return {
    eligible:
      true,
    reason:
      null,
    eligibleAt:
      now,
    recoveryPending
  };
}

function markMarketRecoveryProbeV157(
  state,
  provider
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  const service =
    providerServiceV157(
      state,
      provider
    );

  if (
    service
      .recoveryProbePendingV157 ===
      true
  ) {
    recovery
      .recoveringProviderUsedThisScan =
      provider;

    recovery
      .recoveringProviderUsedAt =
      Date.now();
  }
}

function markMarket429V157(
  state,
  provider
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  const service =
    providerServiceV157(
      state,
      provider
    );

  const now =
    Date.now();

  service
    .recoveryProbePendingV157 =
    true;

  service
    .recoveryProbeSetAtV157 =
    now;

  recovery.last429Provider =
    provider;

  recovery.last429At =
    now;

  recovery
    .recoveringProviderUsedThisScan =
    provider;

  recovery
    .recoveringProviderUsedAt =
    now;

  if (
    provider ===
      "DEX"
  ) {
    recovery.blockGeckoUntil =
      Math.max(
        safeNumber(
          recovery.blockGeckoUntil
        ),
        now +
        MARKET_PROVIDER_CROSS_STAGGER_MS_V157
      );
  }

  else {
    recovery.blockDexUntil =
      Math.max(
        safeNumber(
          recovery.blockDexUntil
        ),
        now +
        MARKET_PROVIDER_CROSS_STAGGER_MS_V157
      );
  }
}

function markMarketNon429V157(
  state,
  provider
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  const service =
    providerServiceV157(
      state,
      provider
    );

  if (
    service
      .recoveryProbePendingV157 ===
      true
  ) {
    recovery
      .lastRecoverySuccessProvider =
      provider;

    recovery
      .lastRecoverySuccessAt =
      Date.now();
  }

  service
    .recoveryProbePendingV157 =
    false;

  service
    .recoveryProbeSetAtV157 =
    null;
}

function marketProviderRecoveryTelemetryV157(
  state
) {
  const recovery =
    marketProviderRecoveryV157(
      state
    );

  const dex =
    dexService(
      state
    );

  const gecko =
    geckoService(
      state
    );

  const now =
    Date.now();

  return {
    enabled:
      true,
    crossProviderStaggerMs:
      MARKET_PROVIDER_CROSS_STAGGER_MS_V157,
    recoveringProviderUsedThisScan:
      recovery
        .recoveringProviderUsedThisScan ||
      null,
    recoveringProviderUsedAt:
      safeNumber(
        recovery
          .recoveringProviderUsedAt
      ) ||
      null,
    dexRecoveryPending:
      dex
        .recoveryProbePendingV157 ===
      true,
    geckoRecoveryPending:
      gecko
        .recoveryProbePendingV157 ===
      true,
    blockDexUntil:
      safeNumber(
        recovery.blockDexUntil
      ) ||
      null,
    blockGeckoUntil:
      safeNumber(
        recovery.blockGeckoUntil
      ) ||
      null,
    blockDexActive:
      safeNumber(
        recovery.blockDexUntil
      ) >
      now,
    blockGeckoActive:
      safeNumber(
        recovery.blockGeckoUntil
      ) >
      now,
    last429Provider:
      recovery.last429Provider ||
      null,
    last429At:
      safeNumber(
        recovery.last429At
      ) ||
      null,
    lastRecoverySuccessProvider:
      recovery
        .lastRecoverySuccessProvider ||
      null,
    lastRecoverySuccessAt:
      safeNumber(
        recovery
          .lastRecoverySuccessAt
      ) ||
      null
  };
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

  service.recoveryProbePendingV157 =
    true;

  service.recoveryProbeSetAtV157 =
    now;

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

  service.recoveryProbePendingV157 =
    false;

  service.recoveryProbeSetAtV157 =
    null;

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

  const dexRecoveryV157 =
    marketProviderRecoveryEligibilityV157(
      state,
      "DEX"
    );

  const dexEligible =
    dexEligibleAt <= now &&
    dexRecoveryV157
      .eligible ===
      true;

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
        ),
      recoveryReasonV157:
        dexRecoveryV157
          .reason ||
        null,
      recoveryPendingV157:
        dexRecoveryV157
          .recoveryPending ===
        true
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

  const recoveryV157 =
    marketProviderRecoveryEligibilityV157(
      state,
      "GECKO"
    );

  if (
    recoveryV157
      .eligible !==
      true
  ) {
    return {
      eligible:
        false,
      reason:
        recoveryV157
          .reason ||
        "GECKOTERMINAL_RECOVERY_STAGGER_V157",
      eligibleAt:
        recoveryV157
          .eligibleAt ||
        now,
      recoveryPendingV157:
        recoveryV157
          .recoveryPending ===
        true
    };
  }

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

  service.recoveryProbePendingV157 =
    true;

  service.recoveryProbeSetAtV157 =
    now;

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

  service.recoveryProbePendingV157 =
    false;

  service.recoveryProbeSetAtV157 =
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

  markMarketRecoveryProbeV157(
    state,
    "GECKO"
  );

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

      markMarket429V157(
        state,
        "GECKO"
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

    markMarketNon429V157(
      state,
      "GECKO"
    );

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

  markMarketRecoveryProbeV157(
    state,
    "GECKO"
  );

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

      markMarket429V157(
        state,
        "GECKO"
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

    markMarketNon429V157(
      state,
      "GECKO"
    );

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

    const directM15 =
      geckoDirectionalWindow(
        parsedTrades,
        returnedCount,
        15 * 60 * 1000,
        null
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

    const directH6 =
      geckoDirectionalWindow(
        parsedTrades,
        returnedCount,
        6 * 60 * 60 * 1000,
        null
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

    const rollingM15 =
      ledgerUpdate
        ?.ledger
        ? rollingDirectionalWindow(
            ledgerUpdate.ledger,
            15 * 60 * 1000,
            null,
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

    const rollingH6 =
      ledgerUpdate
        ?.ledger
        ? rollingDirectionalWindow(
            ledgerUpdate.ledger,
            6 * 60 * 60 * 1000,
            null,
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

    const m15 =
      rollingM15?.verified
        ? rollingM15
        : directM15;

    const h1 =
      rollingH1?.verified
        ? rollingH1
        : directH1;

    const h6 =
      rollingH6?.verified
        ? rollingH6
        : directH6;

    const h24 =
      rollingH24?.verified
        ? rollingH24
        : directH24;

    const verifiedAnyWindow =
      m5.verified ||
      m15.verified ||
      h1.verified ||
      h6.verified ||
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
        m15,
        h1,
        h6,
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
      "m15",
      "h1",
      "h6",
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

      /*
       * V177: 15m and 6h do not exist in the normal DexScreener summary.
       * When the individual-trade window itself has complete verified coverage,
       * expose its real trade counts as transactions for Telegram/telemetry.
       * No counts are guessed when coverage is incomplete.
       */
      if (
        window === "m15" ||
        window === "h6"
      ) {
        candidate.market.transactions =
          candidate.market.transactions || {};

        const total =
          safeNumber(row.buys) +
          safeNumber(row.sells);

        candidate.market.transactions[window] = {
          buys: safeNumber(row.buys),
          sells: safeNumber(row.sells),
          total,
          buyPressure:
            total > 0
              ? (safeNumber(row.buys) / total) * 100
              : 0,
          directionalUsdVerified: true,
          buyVolumeUsd: row.buyVolumeUsd,
          sellVolumeUsd: row.sellVolumeUsd,
          netFlowUsd: row.netFlowUsd
        };
      }
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

  const dexRecoveryV157 =
    marketProviderRecoveryEligibilityV157(
      state,
      "DEX"
    );

  if (
    dexRecoveryV157
      .eligible !==
      true
  ) {
    const originalV157 = {
      verified:
        false,
      status:
        "DEXSCREENER_RECOVERY_STAGGER_V157",
      rateLimited:
        true,
      recoveryReasonV157:
        dexRecoveryV157
          .reason ||
        null,
      recoveryEligibleAtV157:
        dexRecoveryV157
          .eligibleAt ||
        null
    };

    return await priorityMarketFallback(
      token,
      budget,
      watched,
      state,
      priority,
      "DEXSCREENER_RECOVERY_STAGGER_V157",
      originalV157
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

  markMarketRecoveryProbeV157(
    state,
    "DEX"
  );

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

      markMarket429V157(
        state,
        "DEX"
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

    markMarketNon429V157(
      state,
      "DEX"
    );

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

            markMarket429V157(
              state,
              "DEX"
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
        response.status === 500 ||
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
   V225 VERIFIED HOLDER-COUNT DISPLAY RECOVERY
   ========================================================= */

function holderCountDisplayEvidenceV225(
  watched,
  holders,
  state,
  address
) {
  const now = Date.now();

  const currentCount =
    holders?.countersVerified === true &&
    holders?.holderCount !== null &&
    Number.isFinite(Number(holders.holderCount))
      ? Number(holders.holderCount)
      : null;

  if (currentCount !== null) {
    if (watched && typeof watched === "object") {
      watched.holderCountCacheV225 = {
        timestamp: now,
        holderCount: currentCount,
        source:
          holders?.counterSource ||
          holders?.holderSource ||
          "BLOCKSCOUT"
      };
    }

    return {
      verified: true,
      holderCount: currentCount,
      cached: false,
      freshness: "FRESH",
      ageMs: 0,
      source:
        holders?.counterSource ||
        holders?.holderSource ||
        "BLOCKSCOUT"
    };
  }

  const candidates = [];

  const directCache = watched?.holderCountCacheV225;
  if (
    directCache &&
    typeof directCache === "object" &&
    directCache.holderCount !== null &&
    directCache.holderCount !== undefined &&
    Number.isFinite(Number(directCache.holderCount))
  ) {
    candidates.push({
      timestamp: safeNumber(directCache.timestamp),
      holderCount: Number(directCache.holderCount),
      source: directCache.source || "HOLDER_COUNT_CACHE_V225"
    });
  }

  const holderCache = watched?.holderCache;
  if (
    holderCache &&
    typeof holderCache === "object" &&
    holderCache.data?.countersVerified === true &&
    holderCache.data?.holderCount !== null &&
    Number.isFinite(Number(holderCache.data.holderCount))
  ) {
    candidates.push({
      timestamp: safeNumber(holderCache.timestamp),
      holderCount: Number(holderCache.data.holderCount),
      source:
        holderCache.data?.counterSource ||
        holderCache.data?.holderSource ||
        "VERIFIED_HOLDER_CACHE"
    });
  }

  const snapshots =
    state?.snapshots &&
    Array.isArray(state.snapshots[normalize(address)])
      ? state.snapshots[normalize(address)]
      : [];

  for (let i = snapshots.length - 1; i >= 0; i--) {
    const row = snapshots[i];
    if (
      row?.holderCount !== null &&
      Number.isFinite(Number(row?.holderCount)) &&
      safeNumber(row?.timestamp) > 0
    ) {
      candidates.push({
        timestamp: safeNumber(row.timestamp),
        holderCount: Number(row.holderCount),
        source: "VERIFIED_SNAPSHOT_CACHE"
      });
      break;
    }
  }

  const best = candidates
    .filter(row =>
      row.timestamp > 0 &&
      now - row.timestamp >= 0 &&
      now - row.timestamp <= HOLDER_COUNT_DISPLAY_CACHE_MS_V225
    )
    .sort((a, b) => b.timestamp - a.timestamp)[0] || null;

  if (!best) {
    return {
      verified: false,
      holderCount: null,
      cached: false,
      freshness: "UNVERIFIED",
      ageMs: null,
      source: null
    };
  }

  if (watched && typeof watched === "object") {
    watched.holderCountCacheV225 = {
      timestamp: best.timestamp,
      holderCount: best.holderCount,
      source: best.source
    };
  }

  return {
    verified: true,
    holderCount: best.holderCount,
    cached: true,
    freshness: "VERIFIED_CACHE",
    ageMs: now - best.timestamp,
    source: best.source
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


/* =========================================================
   HOLDER INTEGRITY RECONCILIATION — V162
   ========================================================= */

function holderIntegrityReconciliationV162(
  items,
  totalSupply,
  token,
  verifiedPairAddress,
  duplicateHolderRowsRemoved = 0
) {
  const integrity =
    validateHolderIntegrity(
      items,
      totalSupply
    );

  let supply = null;
  let holderBalanceSum = null;

  try {
    supply =
      BigInt(
        String(
          totalSupply
        )
      );
  } catch {}

  try {
    holderBalanceSum =
      BigInt(
        String(
          integrity?.topHolderBalanceSum ||
          "0"
        )
      );
  } catch {}

  let knownInfrastructureBalanceSum =
    0n;

  let knownInfrastructureRows =
    0;

  const infrastructureReasons =
    [];

  for (
    const item
    of Array.isArray(items)
      ? items
      : []
  ) {
    const address =
      normalize(
        extractHolderAddress(
          item
        )
      );

    const reason =
      infrastructureHolderReason(
        address,
        normalize(token),
        normalize(
          verifiedPairAddress ||
          ""
        ) || null
      );

    if (!reason) {
      continue;
    }

    let value = 0n;

    try {
      value =
        BigInt(
          extractHolderValue(
            item
          )
        );
    } catch {}

    if (value > 0n) {
      knownInfrastructureRows++;
      knownInfrastructureBalanceSum +=
        value;

      if (
        !infrastructureReasons.includes(
          reason
        )
      ) {
        infrastructureReasons.push(
          reason
        );
      }
    }
  }

  let excessBalance = null;
  let excessPercent = null;

  if (
    supply !== null &&
    holderBalanceSum !== null &&
    supply > 0n &&
    holderBalanceSum > supply
  ) {
    excessBalance =
      holderBalanceSum -
      supply;

    excessPercent =
      Number(
        excessBalance *
          100000000n /
          supply
      ) /
      1000000;
  }

  const duplicateAddressRepairProven =
    duplicateHolderRowsRemoved > 0 &&
    integrity.verified === true;

  const unresolvedStructuralExcess =
    integrity.status ===
      "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY";

  return {
    ...integrity,

    reconciliationV162: {
      enabled:
        true,

      duplicateHolderRowsRemoved:
        Math.max(
          0,
          safeNumber(
            duplicateHolderRowsRemoved
          )
        ),

      duplicateAddressRepairProven,

      knownInfrastructureRows,

      knownInfrastructureBalanceSum:
        knownInfrastructureBalanceSum
          .toString(),

      infrastructureReasons,

      excessBalance:
        excessBalance !== null
          ? excessBalance.toString()
          : null,

      excessPercent,

      possibleInfrastructureOverlap:
        Boolean(
          unresolvedStructuralExcess &&
          excessBalance !== null &&
          excessBalance > 0n &&
          knownInfrastructureBalanceSum >=
            excessBalance
        ),

      independentlyReconciled:
        integrity.verified === true,

      concentrationPromotionAllowed:
        integrity.verified === true,

      unresolvedStructuralExcess,

      classification:
        duplicateAddressRepairProven
          ? "DUPLICATE_ADDRESS_ROWS_RECONCILED"
          : unresolvedStructuralExcess
            ? "STRUCTURAL_EXCESS_UNRESOLVED"
            : integrity.verified
              ? "NO_RECONCILIATION_REQUIRED"
              : integrity.status,

      guessedOrRescaledBalances:
        false
    }
  };
}

function cachedHolderIntegrityQuarantineV162(
  watched,
  verifiedPairAddress = null
) {
  const cache =
    watched?.holderIntegrityQuarantineV162;

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
      HOLDER_INTEGRITY_RETRY_MS_V162
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
    cache?.data?.integrity?.status !==
      "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY"
  ) {
    return null;
  }

  return {
    ...cache.data,

    verified:
      Boolean(
        cache.data?.countersVerified
      ),

    concentrationVerified:
      false,

    holderSource:
      `INTEGRITY_QUARANTINE_V162:${cache.source || "UNKNOWN"}`,

    holderIntegrityQuarantineV162: {
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
        HOLDER_INTEGRITY_RETRY_MS_V162,
      retryAfterMs:
        Math.max(
          0,
          timestamp +
            HOLDER_INTEGRITY_RETRY_MS_V162 -
            Date.now()
        ),
      concentrationStillUnverified:
        true,
      promotionAllowed:
        false
    }
  };
}

function saveHolderIntegrityQuarantineV162(
  watched,
  data,
  holderSource,
  verifiedPairAddress = null
) {
  if (
    !watched ||
    !data ||
    data?.integrity?.status !==
      "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY"
  ) {
    return;
  }

  watched.holderIntegrityQuarantineV162 = {
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

function clearHolderIntegrityQuarantineV162(
  watched
) {
  if (
    watched &&
    watched.holderIntegrityQuarantineV162
  ) {
    delete watched.holderIntegrityQuarantineV162;
  }
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

/*
 * V166:
 * Detect only the still-active V149 partial-holder retry states that deliberately
 * keep concentration unverified. This is read-only scheduling telemetry: it does
 * not promote holder evidence, alter retry timing, or add any external request.
 */
function activePartialHolderRetryBlockerV166(
  watched
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

  const status =
    cache?.data
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
    status,
    source:
      cache.source ||
      cache?.data?.holderSource ||
      null,
    cachedAt:
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
      )
  };
}

/* =========================================================
   V227 BITQUERY HOLDER FALLBACK — ZERO EXTRA HTTP REQUESTS
   ========================================================= */

function decimalTokenAmountToRawV227(value, decimals) {
  const d = Number(decimals);
  if (!Number.isInteger(d) || d < 0 || d > 36) return null;
  let text = String(value ?? "").trim();
  if (!text || text.startsWith("-")) return null;
  if (text.startsWith("+")) text = text.slice(1);
  const match = text.match(/^(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
  if (!match) return null;
  const whole = match[1] || "0";
  const fraction = match[2] || "";
  const exponent = Number(match[3] || 0);
  if (!Number.isInteger(exponent) || Math.abs(exponent) > 100) return null;
  let digits = (whole + fraction).replace(/^0+(?=\d)/, "");
  if (!digits) digits = "0";
  const decimalPlaces = fraction.length - exponent;
  const scalePower = d - decimalPlaces;
  try {
    let raw = BigInt(digits);
    if (scalePower >= 0) raw *= 10n ** BigInt(scalePower);
    else {
      const divisor = 10n ** BigInt(-scalePower);
      if (raw % divisor !== 0n) return null;
      raw /= divisor;
    }
    return raw > 0n ? raw.toString() : null;
  } catch { return null; }
}

function bitqueryHolderFallbackV227(state, token, decimals, watched = null) {
  const evidence = state?.bitqueryHolderEvidenceV227;
  const address = normalize(token);
  if (!evidence || evidence.verified !== true || normalize(evidence.address) !== address ||
      !safeNumber(evidence.fetchedAt) || Date.now() - safeNumber(evidence.fetchedAt) > BITQUERY_HOLDER_EVIDENCE_MAX_AGE_MS_V227 ||
      !Array.isArray(evidence.rows) || evidence.rows.length === 0) return null;

  if (watched?.launchpadV215?.verified === true) {
    return {
      blocked: true,
      status: "PONS_DYNAMIC_INFRASTRUCTURE_EXCLUSION_REQUIRED_V227",
      holderCount: safeNumber(evidence.holderCount) || null
    };
  }

  const items = evidence.rows
    .map(row => ({
      address: normalize(row?.address),
      value: decimalTokenAmountToRawV227(row?.amount, decimals)
    }))
    .filter(row => isAddress(row.address) && row.address !== ZERO && row.value !== null)
    .slice(0, BITQUERY_HOLDER_ROW_LIMIT_V227);

  if (!items.length) return null;
  return {
    items,
    bitqueryV227: true,
    holderCount: safeNumber(evidence.holderCount) || null,
    fetchedAt: safeNumber(evidence.fetchedAt) || null,
    source: "BITQUERY_EVM_HOLDERS_V227",
    status: "VERIFIED_HOLDER_ROWS_V227"
  };
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
  state = null,
  tokenDecimals = null
) {
  if (
    !totalSupply
  ) {
    return unverifiedHolders(
      "TOTAL_SUPPLY_UNAVAILABLE"
    );
  }

  /*
   * V164: configuration truth must survive same-run outage deferral.
   * A request suppressed by the V134 circuit breaker is NOT the same as
   * BLOCKSCOUT_PRO_API_KEY being absent.
   */
  const blockscoutProConfiguredV164 =
    Boolean(
      String(
        env?.BLOCKSCOUT_PRO_API_KEY ||
        ""
      ).trim()
    );

  const blockscoutProDeferredTelemetryV164 = () => ({
    configured:
      blockscoutProConfiguredV164,
    attempted: false,
    success: false,
    status:
      "BLOCKSCOUT_RUN_CIRCUIT_BREAKER_DEFERRED",
    transientOutageV145: false,
    cooldownUntil: null,
    retryAfterMs: 0,
    http404V146: false,
    httpStatus: null,
    retryUntilV146: null
  });

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

  const holderIntegrityQuarantineV162 =
    cachedHolderIntegrityQuarantineV162(
      watched,
      verifiedPairAddress
    );

  if (
    holderIntegrityQuarantineV162
  ) {
    return holderIntegrityQuarantineV162;
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
          true,

        blockscoutProHolderFallbackV143:
          blockscoutProDeferredTelemetryV164()
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
        "BLOCKSCOUT_OUTAGE_DEFERRED",

      blockscoutProHolderFallbackV143:
        blockscoutProDeferredTelemetryV164()
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
      blockscoutProConfiguredV164,
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
    !holders ||
    !Array.isArray(holders.items)
  ) {
    /* V226: only the priority candidate may yield V182, and only if V182 is the actual blocker. */
    if (priorityCompletion === true) {
      yieldV182ReserveToPriorityHolderEvidenceV226(
        budget,
        token,
        "PRIORITY_HOLDER_LEGACY_FALLBACK_BLOCKED_BY_V182"
      );
    }
  }

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


  /* V227: reuse matching Bitquery EVM.Holders evidence before spending PRO. */
  let bitqueryHolderFallbackTelemetryV227 = {
    checked: false, matched: false, used: false, status: "NOT_NEEDED",
    holderCount: null, externalRequestsAdded: 0
  };

  if (v2HolderRowsUnavailable && legacyHolderRowsUnavailable) {
    bitqueryHolderFallbackTelemetryV227.checked = true;
    const bitqueryFallbackV227 = bitqueryHolderFallbackV227(state, token, tokenDecimals, watched);
    if (bitqueryFallbackV227?.blocked === true) {
      bitqueryHolderFallbackTelemetryV227.matched = true;
      bitqueryHolderFallbackTelemetryV227.status = bitqueryFallbackV227.status;
      bitqueryHolderFallbackTelemetryV227.holderCount = bitqueryFallbackV227.holderCount ?? null;
      if (counterData.holderCount === null && bitqueryFallbackV227.holderCount) {
        counterData.holderCount = bitqueryFallbackV227.holderCount;
        counterSource = "BITQUERY_HOLDERS_COUNT_ONLY_V227";
      }
    } else if (bitqueryFallbackV227 && Array.isArray(bitqueryFallbackV227.items)) {
      bitqueryHolderFallbackTelemetryV227.matched = true;
      bitqueryHolderFallbackTelemetryV227.used = true;
      bitqueryHolderFallbackTelemetryV227.status = "USED_VERIFIED_ROWS_V227";
      bitqueryHolderFallbackTelemetryV227.holderCount = bitqueryFallbackV227.holderCount ?? null;
      holders = bitqueryFallbackV227;
      v2HolderRowsUnavailable = false;
      legacyHolderRowsUnavailable = false;
      if (counterData.holderCount === null && bitqueryFallbackV227.holderCount) {
        counterData.holderCount = bitqueryFallbackV227.holderCount;
        counterSource = "BITQUERY_HOLDERS_V227";
      }
    } else {
      bitqueryHolderFallbackTelemetryV227.status = "NO_MATCHING_FRESH_VERIFIED_ROWS_V227";
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
    priorityCompletion === true
  ) {
    yieldV182ReserveToPriorityHolderEvidenceV226(
      budget,
      token,
      "PRIORITY_HOLDER_PRO_FALLBACK_BLOCKED_BY_V182"
    );
  }

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
    holders?.bitqueryV227
      ? "BITQUERY_EVM_HOLDERS_V227"
      : holders?.proV143
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
    holderIntegrityReconciliationV162(
      items,
      totalSupply,
      token,
      verifiedPairAddress,
      duplicateHolderRowsRemoved
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
    const unresolvedIntegrityResultV162 = {
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
      },

      holderIntegrityQuarantineV162: {
        reused:
          false,
        retryMs:
          HOLDER_INTEGRITY_RETRY_MS_V162,
        concentrationStillUnverified:
          true,
        promotionAllowed:
          false
      }
    };

    if (
      integrity.status ===
        "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY"
    ) {
      saveHolderIntegrityQuarantineV162(
        watched,
        unresolvedIntegrityResultV162,
        holderSource,
        verifiedPairAddress
      );
    }

    return unresolvedIntegrityResultV162;
  }

  clearHolderIntegrityQuarantineV162(
    watched
  );

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
  liveActivityV152 = null,
  ponsCurveFlowV216 = null
) {
  /*
   * V218 verified Pons V2 curve momentum.
   *
   * Research/safety rationale:
   * - unique-trader breadth is more meaningful than raw trade count alone;
   * - meme-token volume can be wash/manipulation-prone, so volume/activity
   *   never produces a large score by itself;
   * - one canonical window is used so the same trade is not counted in 5m,
   *   15m, 1h, 6h and 24h simultaneously;
   * - tiny USD samples cap directional-pressure points.
   */
  const ponsWindowsV218 =
    ponsCurveFlowV216?.windows || {};

  const ponsWindowOrderV218 = [
    ["m15", "15m"],
    ["m5", "5m"],
    ["h1", "1h"]
  ];

  let ponsMomentumWindowKeyV218 =
    null;

  let ponsMomentumWindowLabelV218 =
    null;

  let ponsMomentumWindowV218 =
    null;

  for (
    const [
      key,
      label
    ]
    of ponsWindowOrderV218
  ) {
    const row =
      ponsWindowsV218?.[key];

    if (
      row?.verified === true &&
      safeNumber(row?.observedTrades) > 0
    ) {
      ponsMomentumWindowKeyV218 =
        key;
      ponsMomentumWindowLabelV218 =
        label;
      ponsMomentumWindowV218 =
        row;
      break;
    }
  }

  const ponsMomentumUsableV218 =
    ponsCurveFlowV216?.verified === true &&
    Boolean(
      ponsMomentumWindowV218
    );

  const ponsMomentumEvidenceV218 =
    (() => {
      const empty = {
        verified: false,
        window: null,
        scoreContribution: 0,
        positiveSignals: 0,
        observedTrades: 0,
        uniqueTraders: 0,
        buys: 0,
        sells: 0,
        totalUsd: 0,
        buyVolumeUsd: 0,
        sellVolumeUsd: 0,
        netFlowUsd: 0,
        buyPressureUsd: null,
        sampleQuality: "NONE",
        reasons: []
      };

      if (!ponsMomentumUsableV218) {
        return empty;
      }

      const row =
        ponsMomentumWindowV218;

      const observedTrades =
        safeNumber(
          row?.observedTrades
        );

      const uniqueTraders =
        safeNumber(
          row?.uniqueTraders
        );

      const buys =
        safeNumber(row?.buys);

      const sells =
        safeNumber(row?.sells);

      const buyVolumeUsd =
        Math.max(
          0,
          safeNumber(
            row?.buyVolumeUsd
          )
        );

      const sellVolumeUsd =
        Math.max(
          0,
          safeNumber(
            row?.sellVolumeUsd
          )
        );

      const totalUsd =
        buyVolumeUsd +
        sellVolumeUsd;

      const netFlowUsd =
        buyVolumeUsd -
        sellVolumeUsd;

      const buyPressureUsd =
        totalUsd > 0
          ? (
              buyVolumeUsd /
              totalUsd
            ) * 100
          : null;

      let contribution =
        0;

      let signals =
        0;

      const ponsReasons =
        [];

      /*
       * Require at least 3 verified trades and 2 distinct traders before
       * Pons contributes to momentum at all.
       */
      if (
        observedTrades < 3 ||
        uniqueTraders < 2
      ) {
        return {
          ...empty,
          verified: true,
          window:
            ponsMomentumWindowLabelV218,
          observedTrades,
          uniqueTraders,
          buys,
          sells,
          totalUsd,
          buyVolumeUsd,
          sellVolumeUsd,
          netFlowUsd,
          buyPressureUsd,
          sampleQuality:
            "TOO_SMALL_TO_SCORE",
          reasons: [
            "Verified Pons activity present but sample too small to score"
          ]
        };
      }

      /*
       * Breadth: capped at 12.
       * This is intentionally worth more than raw trade count.
       */
      signals++;

      const breadthPoints =
        uniqueTraders >= 10
          ? 12
          : uniqueTraders >= 6
            ? 9
            : uniqueTraders >= 4
              ? 7
              : 4;

      contribution +=
        breadthPoints;

      ponsReasons.push(
        `Verified Pons trader breadth ${uniqueTraders} unique (${ponsMomentumWindowLabelV218})`
      );

      /*
       * Activity: capped at 8. High transaction count alone is not enough
       * for a strong score because meme launch activity can be synthetic.
       */
      const activityPoints =
        observedTrades >= 20
          ? 8
          : observedTrades >= 10
            ? 6
            : observedTrades >= 6
              ? 4
              : 2;

      contribution +=
        activityPoints;

      ponsReasons.push(
        `Verified Pons activity ${observedTrades} trades (${ponsMomentumWindowLabelV218})`
      );

      /*
       * Directional USD pressure: only scored with at least two buys and a
       * non-trivial USD sample. Tiny dollar samples are heavily capped.
       */
      if (
        buys >= 2 &&
        buyPressureUsd !== null &&
        buyPressureUsd >= 60 &&
        totalUsd >= 10
      ) {
        signals++;

        let pressurePoints =
          buyPressureUsd >= 80
            ? 12
            : buyPressureUsd >= 70
              ? 9
              : 6;

        if (totalUsd < 50) {
          pressurePoints =
            Math.min(
              pressurePoints,
              4
            );
        }

        else if (totalUsd < 250) {
          pressurePoints =
            Math.min(
              pressurePoints,
              8
            );
        }

        contribution +=
          pressurePoints;

        ponsReasons.push(
          `Verified Pons USD buy pressure ${buyPressureUsd.toFixed(1)}% on $${totalUsd.toFixed(2)} observed flow`
        );
      }

      /*
       * Positive net flow: requires meaningful absolute dollars. The point
       * cap prevents one small directional burst from dominating momentum.
       */
      if (
        netFlowUsd > 0 &&
        buyPressureUsd !== null &&
        buyPressureUsd >= 55 &&
        totalUsd >= 25
      ) {
        signals++;

        const netPoints =
          netFlowUsd >= 500
            ? 10
            : netFlowUsd >= 100
              ? 7
              : netFlowUsd >= 25
                ? 4
                : 2;

        contribution +=
          netPoints;

        ponsReasons.push(
          `Verified Pons positive net flow $${netFlowUsd.toFixed(2)} (${ponsMomentumWindowLabelV218})`
        );
      }

      /*
       * Strong sell pressure can subtract modestly. We do not punish a
       * balanced book simply because sells exist.
       */
      if (
        totalUsd >= 50 &&
        buyPressureUsd !== null &&
        buyPressureUsd <= 35 &&
        sellVolumeUsd >
          buyVolumeUsd
      ) {
        const penalty =
          buyPressureUsd <= 20
            ? 10
            : 6;

        contribution -=
          penalty;

        ponsReasons.push(
          `Verified Pons sell pressure ${buyPressureUsd.toFixed(1)}% buy share`
        );
      }

      /*
       * Pons-only evidence is capped at 34 points. That allows a genuinely
       * active launch to become EARLY before history exists, but never GOOD
       * or STRONG without independent/historical confirmation.
       */
      contribution =
        clamp(
          contribution,
          0,
          34
        );

      const sampleQuality =
        observedTrades >= 10 &&
        uniqueTraders >= 6 &&
        totalUsd >= 100
          ? "GOOD"
          : observedTrades >= 5 &&
            uniqueTraders >= 3
            ? "USABLE"
            : "THIN";

      return {
        verified: true,
        window:
          ponsMomentumWindowLabelV218,
        windowKey:
          ponsMomentumWindowKeyV218,
        scoreContribution:
          contribution,
        positiveSignals:
          signals,
        observedTrades,
        uniqueTraders,
        buys,
        sells,
        totalUsd,
        buyVolumeUsd,
        sellVolumeUsd,
        netFlowUsd,
        buyPressureUsd,
        sampleQuality,
        reasons:
          ponsReasons
      };
    })();

  if (!previous) {
    if (
      ponsMomentumEvidenceV218
        .verified === true &&
      ponsMomentumEvidenceV218
        .scoreContribution > 0
    ) {
      const ponsOnlyScoreV218 =
        clamp(
          ponsMomentumEvidenceV218
            .scoreContribution,
          0,
          34
        );

      return {
        verified: true,
        score:
          ponsOnlyScoreV218,
        label:
          ponsOnlyScoreV218 >= 25
            ? "EARLY"
            : "WEAK",
        positiveSignals:
          ponsMomentumEvidenceV218
            .positiveSignals,
        historyAgeMinutes:
          null,
        historyStatus:
          "NO_HISTORICAL_SNAPSHOT_PONS_EVIDENCE_ONLY",
        ponsCurveMomentumV218:
          ponsMomentumEvidenceV218,
        reasons: [
          ...ponsMomentumEvidenceV218
            .reasons,
          "Historical snapshot still building; Pons-only momentum capped below GOOD"
        ]
      };
    }

    return {
      verified:
        ponsMomentumEvidenceV218
          .verified === true,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

      ponsCurveMomentumV218:
        ponsMomentumEvidenceV218,

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
    if (
      ponsMomentumEvidenceV218
        .verified === true &&
      ponsMomentumEvidenceV218
        .scoreContribution > 0
    ) {
      const ponsYoungHistoryScoreV218 =
        clamp(
          ponsMomentumEvidenceV218
            .scoreContribution,
          0,
          34
        );

      return {
        verified: true,
        score:
          ponsYoungHistoryScoreV218,
        label:
          ponsYoungHistoryScoreV218 >= 25
            ? "EARLY"
            : "WEAK",
        positiveSignals:
          ponsMomentumEvidenceV218
            .positiveSignals,
        historyAgeMinutes:
          historyAgeMs /
          60000,
        historyStatus:
          "HISTORY_TOO_RECENT_PONS_EVIDENCE_ONLY",
        ponsCurveMomentumV218:
          ponsMomentumEvidenceV218,
        reasons: [
          ...ponsMomentumEvidenceV218
            .reasons,
          "Historical snapshot too recent; Pons-only momentum capped below GOOD"
        ]
      };
    }

    return {
      verified:
        ponsMomentumEvidenceV218
          .verified === true,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

      historyAgeMinutes:
        historyAgeMs /
        60000,

      ponsCurveMomentumV218:
        ponsMomentumEvidenceV218,

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

  /*
   * V218: with mature historical context, verified Pons curve evidence can
   * contribute alongside the existing independent signals. It remains
   * capped at 34 and never replaces holder/liquidity/history evidence.
   */
  if (
    ponsMomentumEvidenceV218
      .verified === true &&
    ponsMomentumEvidenceV218
      .scoreContribution > 0
  ) {
    score +=
      ponsMomentumEvidenceV218
        .scoreContribution;

    positiveSignals +=
      ponsMomentumEvidenceV218
        .positiveSignals;

    reasons.push(
      ...ponsMomentumEvidenceV218
        .reasons
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
        onChainActivityUsableV152 ||
        ponsMomentumEvidenceV218
          .verified === true
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

    ponsCurveMomentumV218:
      ponsMomentumEvidenceV218,

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


function evidenceQualityProtectionV158(
  candidate
) {
  const holderSource =
    String(
      candidate
        ?.holders
        ?.holderSource ||
      ""
    ).toUpperCase();

  const staleHolderEvidence =
    holderSource.includes(
      "STALE_CACHE"
    );

  const holderCountersVerified =
    candidate
      ?.holders
      ?.countersVerified ===
    true;

  const ponsConfirmationV219 =
    ponsConfirmationQualityV219(
      candidate
    );

  const directionalUsdVerified =
    candidate
      ?.market
      ?.directionalTradeFeed
      ?.verifiedAnyWindow ===
      true ||
    candidate
      ?.momentum
      ?.directionalUsdPressureV151
      ?.verified ===
      true ||
    ponsConfirmationV219
      .directionalUsdVerified ===
      true;

  const momentumVerified =
    candidate
      ?.momentum
      ?.verified ===
    true;

  const momentumScore =
    safeNumber(
      candidate
        ?.momentum
        ?.score
    );

  const weakMomentum =
    !momentumVerified ||
    momentumScore <
      25;

  const missingCoreConfirmation =
    !holderCountersVerified &&
    !directionalUsdVerified &&
    weakMomentum;

  const originalOpportunity =
    safeNumber(
      candidate
        ?.opportunity
        ?.score
    );

  const originalConfidence =
    safeNumber(
      candidate
        ?.confidence
        ?.score
    );

  let opportunityCap =
    null;

  let confidenceCap =
    null;

  const reasons =
    [];

  /*
   * V158: HIGH confidence requires more than verified market structure
   * plus generic activity. At least one of holder breadth, verified USD
   * direction, or non-weak momentum must substantively confirm the move.
   */
  if (
    missingCoreConfirmation
  ) {
    confidenceCap =
      69;

    reasons.push(
      "No verified holder counters, directional USD or non-weak momentum"
    );
  }

  /*
   * BOD-specific failure class:
   * stale concentration evidence + no live holder counters + no verified
   * directional dollars + weak momentum must not reach the existing alert
   * threshold through market/activity bonuses alone.
   */
  if (
    missingCoreConfirmation &&
    staleHolderEvidence
  ) {
    opportunityCap =
      59;

    confidenceCap =
      54;

    reasons.push(
      "Stale holder concentration cannot support an alert while core confirmation is missing"
    );
  }

  if (
    opportunityCap !==
      null &&
    candidate
      ?.opportunity
  ) {
    candidate.opportunity.score =
      Math.min(
        originalOpportunity,
        opportunityCap
      );

    if (
      candidate.opportunity
        .score <
      originalOpportunity
    ) {
      candidate.opportunity
        .reasons =
        Array.isArray(
          candidate.opportunity
            .reasons
        )
          ? [
              ...candidate.opportunity
                .reasons,
              "V158 evidence-quality opportunity cap"
            ]
          : [
              "V158 evidence-quality opportunity cap"
            ];
    }
  }

  if (
    confidenceCap !==
      null &&
    candidate
      ?.confidence
  ) {
    candidate.confidence.score =
      Math.min(
        originalConfidence,
        confidenceCap
      );

    candidate.confidence.label =
      candidate.confidence.score >=
        80
        ? "HIGH"
        : candidate.confidence.score >=
            55
          ? "MEDIUM"
          : "LOW";
  }

  const applied =
    (
      opportunityCap !==
        null &&
      originalOpportunity >
        opportunityCap
    ) ||
    (
      confidenceCap !==
        null &&
      originalConfidence >
        confidenceCap
    );

  const telemetry = {
    enabled:
      true,

    applied,

    holderSource:
      holderSource ||
      null,

    staleHolderEvidence,

    holderCountersVerified,

    directionalUsdVerified,

    ponsConfirmationV219,

    momentumVerified,

    momentumScore,

    weakMomentum,

    missingCoreConfirmation,

    originalOpportunity,

    finalOpportunity:
      safeNumber(
        candidate
          ?.opportunity
          ?.score
      ),

    opportunityCap,

    originalConfidence,

    finalConfidence:
      safeNumber(
        candidate
          ?.confidence
          ?.score
      ),

    confidenceCap,

    reasons
  };

  candidate
    .evidenceQualityProtectionV158 =
    telemetry;

  return telemetry;
}


/* =========================================================
   V219 PONS CONFIRMATION QUALITY
   ========================================================= */

function ponsConfirmationQualityV219(
  candidate
) {
  const flow =
    candidate?.ponsCurveFlowV216;

  const empty = {
    verified: false,
    usable: false,
    strong: false,
    directionalUsdVerified: false,
    window: null,
    observedTrades: 0,
    uniqueTraders: 0,
    totalUsd: 0,
    netFlowUsd: null,
    buyPressureUsd: null,
    reason:
      "NO_VERIFIED_PONS_CURVE_FLOW"
  };

  if (flow?.verified !== true) {
    return empty;
  }

  const choices = [
    ["m15", "15m"],
    ["m5", "5m"],
    ["h1", "1h"]
  ];

  let row = null;
  let label = null;

  for (const [key, name] of choices) {
    const current =
      flow?.windows?.[key];

    if (
      current?.verified === true &&
      safeNumber(
        current?.observedTrades
      ) > 0
    ) {
      row = current;
      label = name;
      break;
    }
  }

  if (!row) {
    return {
      ...empty,
      verified: true,
      reason:
        "NO_VERIFIED_PONS_WINDOW"
    };
  }

  const observedTrades =
    safeNumber(
      row?.observedTrades
    );

  const uniqueTraders =
    safeNumber(
      row?.uniqueTraders
    );

  const buyVolumeUsd =
    Math.max(
      0,
      safeNumber(
        row?.buyVolumeUsd
      )
    );

  const sellVolumeUsd =
    Math.max(
      0,
      safeNumber(
        row?.sellVolumeUsd
      )
    );

  const totalUsd =
    buyVolumeUsd +
    sellVolumeUsd;

  const netFlowUsd =
    buyVolumeUsd -
    sellVolumeUsd;

  const buyPressureUsd =
    totalUsd > 0
      ? (
          buyVolumeUsd /
          totalUsd
        ) * 100
      : null;

  /*
   * "usable" is evidence-quality confirmation, not bullish confirmation.
   * It proves we have enough candidate-specific verified curve data to stop
   * treating the token as directionally unobserved.
   */
  const usable =
    observedTrades >= 5 &&
    uniqueTraders >= 3 &&
    totalUsd >= 25;

  /*
   * "strong" is deliberately harder: breadth + activity + meaningful USD
   * plus positive direction. This is one confirmation signal only.
   */
  const strong =
    observedTrades >= 10 &&
    uniqueTraders >= 6 &&
    totalUsd >= 100 &&
    netFlowUsd > 0 &&
    buyPressureUsd !== null &&
    buyPressureUsd >= 55;

  return {
    verified: true,
    usable,
    strong,
    directionalUsdVerified:
      usable,
    window:
      label,
    observedTrades,
    uniqueTraders,
    buys:
      safeNumber(row?.buys),
    sells:
      safeNumber(row?.sells),
    buyVolumeUsd,
    sellVolumeUsd,
    totalUsd,
    netFlowUsd,
    buyPressureUsd,
    reason:
      strong
        ? "STRONG_VERIFIED_PONS_CONFIRMATION"
        : usable
          ? "USABLE_VERIFIED_PONS_CONFIRMATION"
          : "VERIFIED_PONS_SAMPLE_BELOW_CONFIRMATION_THRESHOLD"
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

  const ponsConfirmationV219 =
    ponsConfirmationQualityV219(
      candidate
    );

  /*
   * V219: Pons curve activity can replace the missing V4-activity style
   * confirmation for a pre-graduation token. It counts as ONE signal only.
   * No separate Opportunity bonus is added, preventing double-counting with
   * V218 Momentum.
   */
  if (
    ponsConfirmationV219.strong === true
  ) {
    signals++;

    score +=
      14;

    reasons.push(
      `Verified Pons curve confirmation: ${ponsConfirmationV219.observedTrades} trades / ${ponsConfirmationV219.uniqueTraders} traders / ${ponsConfirmationV219.buyPressureUsd.toFixed(1)}% USD buy pressure`
    );
  }

  else if (
    ponsConfirmationV219.usable === true &&
    safeNumber(
      candidate?.activity?.swaps
    ) <= 0
  ) {
    signals++;

    score +=
      8;

    reasons.push(
      `Verified Pons curve activity: ${ponsConfirmationV219.observedTrades} trades / ${ponsConfirmationV219.uniqueTraders} traders`
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

    reasons,

    ponsConfirmationV219
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

  /*
   * V219: a verified flag alone is no longer worth the full +15.
   * V218 can legitimately mark a thin/weak Pons sample as verified, so
   * confidence now scales with actual momentum strength.
   */
  if (
    candidate.momentum
      ?.verified &&
    safeNumber(
      candidate.momentum.score
    ) >=
      50
  ) {
    score +=
      15;
  }

  else if (
    candidate.momentum
      ?.verified &&
    safeNumber(
      candidate.momentum.score
    ) >=
      25
  ) {
    score +=
      10;
  }

  else if (
    candidate.momentum
      ?.verified &&
    safeNumber(
      candidate.momentum.score
    ) > 0
  ) {
    score +=
      4;
  }

  const ponsConfirmationV219 =
    ponsConfirmationQualityV219(
      candidate
    );

  /*
   * Strong verified Pons breadth/flow can add modest confidence, but this is
   * deliberately small because the same underlying Pons evidence can also
   * influence Momentum. This is confidence in evidence coverage, not an
   * Opportunity/price-prediction bonus.
   */
  if (
    ponsConfirmationV219.strong === true
  ) {
    score +=
      8;
  }

  else if (
    ponsConfirmationV219.usable === true
  ) {
    score +=
      4;
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

  const telegramBase =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}`;

  try {
    /*
     * V174 exact notification accounting:
     * consume one notification request immediately before each real Telegram
     * fetch. A failed photo plus text fallback therefore costs 2, not 1.
     */
    if (imageUrl) {
      if (
        budget &&
        !consumeBudget(
          budget,
          "notification",
          "TELEGRAM_SEND_PHOTO"
        )
      ) {
        return {
          success: false,
          skipped: true,
          reason: "NOTIFICATION_BUDGET_EXHAUSTED"
        };
      }

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

        const photoData =
          await photoResponse.json();

        if (
          photoResponse.ok &&
          photoData?.ok
        ) {
          return {
            success: true,
            status: photoResponse.status,
            mode: "PHOTO",
            imageUrl,
            data: photoData,
            notificationRequestsUsedV174:
              1
          };
        }
      } catch (photoError) {
        /* Fall through to the proven text-only alert path. */
      }

      if (
        budget &&
        !consumeBudget(
          budget,
          "notification",
          "TELEGRAM_SEND_TEXT_FALLBACK"
        )
      ) {
        return {
          success: false,
          skipped: true,
          reason: "NOTIFICATION_BUDGET_EXHAUSTED",
          photoAttempted: true
        };
      }
    } else if (
      budget &&
      !consumeBudget(
        budget,
        "notification",
        "TELEGRAM_SEND_TEXT"
      )
    ) {
      return {
        success: false,
        skipped: true,
        reason: "NOTIFICATION_BUDGET_EXHAUSTED"
      };
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

    const data =
      await response.json();

    return {
      success:
        response.ok &&
        Boolean(
          data?.ok
        ),
      status:
        response.status,
      mode:
        imageUrl
          ? "TEXT_FALLBACK"
          : "TEXT",
      data,
      notificationRequestsUsedV174:
        imageUrl
          ? 2
          : 1
    };
  } catch (error) {
    return {
      success: false,
      error: errorString(
        error
      )
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

function telegramCoreEvidenceFreshnessV169(
  candidate
) {
  const market =
    candidate?.market || {};

  const holders =
    candidate?.holders || {};

  const marketCached =
    market?.cached === true ||
    String(
      market?.source ||
      ""
    ).toUpperCase() ===
      "CACHE";

  const holderSource =
    String(
      holders?.holderSource ||
      ""
    ).toUpperCase();

  const holderCached =
    holders?.cached === true ||
    holderSource ===
      "CACHE" ||
    holderSource.startsWith(
      "STALE_CACHE"
    );

  const marketAgeMs =
    marketCached
      ? safeNumber(
          market?.cacheAgeMs
        )
      : 0;

  const holderAgeMs =
    holderCached
      ? safeNumber(
          holders?.holderCacheAgeMs
        )
      : 0;

  const marketEvidenceVerified =
    market?.verified === true;

  const holderEvidenceVerified =
    holders?.integrity?.verified ===
      true &&
    holders?.concentrationVerified ===
      true &&
    holders?.whale?.verified ===
      true;

  /*
   * V169 truth classification:
   * - UNVERIFIED means there is no verified core evidence to age.
   * - STALE_CACHE means verified cached evidence exists and exceeded
   *   the normal Telegram freshness window.
   * - FRESH preserves V168 semantics: verified non-cache evidence, or
   *   verified cache evidence still inside the normal freshness window.
   */
  const marketFreshnessState =
    !marketEvidenceVerified
      ? "UNVERIFIED"
      : (
          marketCached &&
          marketAgeMs >
            TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168
        )
        ? "STALE_CACHE"
        : "FRESH";

  const holderFreshnessState =
    !holderEvidenceVerified
      ? "UNVERIFIED"
      : (
          holderCached &&
          holderAgeMs >
            TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168
        )
        ? "STALE_CACHE"
        : "FRESH";

  /*
   * Preserve V168 alert behavior exactly.
   */
  const marketFresh =
    marketEvidenceVerified &&
    (
      !marketCached ||
      (
        marketAgeMs >= 0 &&
        marketAgeMs <=
          TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168
      )
    );

  const holderFresh =
    holderEvidenceVerified &&
    (
      !holderCached ||
      (
        holderAgeMs >= 0 &&
        holderAgeMs <=
          TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168
      )
    );

  const m5DirectionalUsdVerified =
    market
      ?.directionalFlow
      ?.m5
      ?.verified ===
      true ||
    market
      ?.transactions
      ?.m5
      ?.directionalUsdVerified ===
      true;

  const liveMomentum =
    candidate
      ?.momentum
      ?.onChainActivityMomentumV152;

  const positiveLiveSwapAcceleration =
    liveMomentum?.verified ===
      true &&
    safeNumber(
      liveMomentum
        ?.currentLiveSwaps
    ) >= 5 &&
    safeNumber(
      liveMomentum
        ?.swapDelta
    ) > 0 &&
    candidate?.momentum?.verified ===
      true &&
    safeNumber(
      candidate?.momentum?.score
    ) > 0;

  const strongCurrentConfirmation =
    m5DirectionalUsdVerified ||
    positiveLiveSwapAcceleration;

  /*
   * Preserve the V168 holder exception exactly: verified cached holder
   * evidence older than the normal 10-minute alert window may remain
   * acceptable up to the existing holder-cache TTL only when strong,
   * current independent confirmation exists.
   */
  const holderFreshEnoughWithCurrentConfirmation =
    holderEvidenceVerified &&
    holderCached &&
    holderAgeMs >= 0 &&
    holderAgeMs <=
      TELEGRAM_HOLDER_STRONG_CONFIRMATION_MAX_AGE_MS_V168 &&
    strongCurrentConfirmation;

  const holderAlertEvidenceAcceptable =
    holderFresh ||
    holderFreshEnoughWithCurrentConfirmation;

  const passes =
    marketFresh &&
    holderAlertEvidenceAcceptable;

  return {
    enabled: true,
    passes,
    marketFresh,
    holderFresh,
    marketFreshnessState,
    holderFreshnessState,
    marketEvidenceVerified,
    holderEvidenceVerified,
    marketCached,
    holderCached,
    marketAgeMs:
      marketCached
        ? marketAgeMs
        : 0,
    holderAgeMs:
      holderCached
        ? holderAgeMs
        : 0,
    marketMaxAgeMs:
      TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168,
    holderMaxAgeMs:
      TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168,
    holderStrongConfirmationMaxAgeMs:
      TELEGRAM_HOLDER_STRONG_CONFIRMATION_MAX_AGE_MS_V168,
    holderFreshEnoughWithCurrentConfirmation,
    holderAlertEvidenceAcceptable,
    strongCurrentConfirmation,
    m5DirectionalUsdVerified,
    positiveLiveSwapAcceleration,
    staleEvidenceMayStillTrackAndScore: true,
    externalRequestsAdded: 0,
    telegramThresholdsUnchanged: true
  };
}

/* =========================================================
   V232 VERIFIED BEARISH-FLOW TELEGRAM PROTECTION
   ========================================================= */

function telegramVerifiedBearishFlowProtectionV232(
  candidate
) {
  const flow =
    candidate?.onChainVerifiedFlowV212;

  const empty = {
    enabled: true,
    suppresses: false,
    reason: "NO_STRONG_VERIFIED_BEARISH_SHORT_TERM_FLOW_V232",
    window: null,
    momentumScore:
      safeNumber(candidate?.momentum?.score),
    observedTrades: 0,
    buys: 0,
    sells: 0,
    buyVolumeUsd: 0,
    sellVolumeUsd: 0,
    totalObservedUsd: 0,
    netFlowUsd: null,
    buyPressureUsd: null,
    minimumObservedTrades: 5,
    minimumObservedUsd: 500,
    minimumSellUsd: 500,
    maximumBuyPressureUsd: 15,
    maximumNetFlowUsd: -500,
    verifiedUsdMathChanged: false,
    momentumMathChanged: false,
    externalRequestsAdded: 0
  };

  if (flow?.verified !== true) {
    return {
      ...empty,
      reason:
        "NO_CANDIDATE_MATCHED_VERIFIED_ONCHAIN_USD_V232"
    };
  }

  /*
   * Prefer the freshest verified short-term window. The underlying V212
   * values are read only; V232 never recomputes or rewrites verified swaps.
   */
  const choices = [
    ["m5", "5m"],
    ["m15", "15m"]
  ];

  let row = null;
  let windowLabel = null;

  for (const [key, label] of choices) {
    const current = flow?.windows?.[key];

    if (
      current?.verified === true &&
      safeNumber(current?.observedTrades) > 0
    ) {
      row = current;
      windowLabel = label;
      break;
    }
  }

  if (!row) {
    return {
      ...empty,
      reason:
        "NO_VERIFIED_5M_OR_15M_FLOW_WINDOW_V232"
    };
  }

  const observedTrades =
    safeNumber(row?.observedTrades);

  const buys =
    safeNumber(row?.buys);

  const sells =
    safeNumber(row?.sells);

  const buyVolumeUsd =
    Math.max(
      0,
      safeNumber(row?.buyVolumeUsd)
    );

  const sellVolumeUsd =
    Math.max(
      0,
      safeNumber(row?.sellVolumeUsd)
    );

  const totalObservedUsd =
    buyVolumeUsd + sellVolumeUsd;

  const netFlowUsd =
    Number.isFinite(Number(row?.netFlowUsd))
      ? Number(row.netFlowUsd)
      : buyVolumeUsd - sellVolumeUsd;

  const buyPressureUsd =
    Number.isFinite(Number(row?.buyPressureUsd))
      ? Number(row.buyPressureUsd)
      : totalObservedUsd > 0
        ? (buyVolumeUsd / totalObservedUsd) * 100
        : null;

  const momentumScore =
    safeNumber(candidate?.momentum?.score);

  const meaningfulVerifiedSample =
    observedTrades >= 5 &&
    totalObservedUsd >= 500;

  const stronglyBearishVerifiedFlow =
    meaningfulVerifiedSample &&
    sellVolumeUsd >= 500 &&
    netFlowUsd <= -500 &&
    buyPressureUsd !== null &&
    buyPressureUsd <= 15 &&
    sells >= 3 &&
    sells >= buys * 2;

  const suppresses =
    momentumScore <= 0 &&
    stronglyBearishVerifiedFlow;

  return {
    enabled: true,
    suppresses,
    reason:
      suppresses
        ? "VERIFIED_BEARISH_SHORT_TERM_FLOW_WITH_NO_POSITIVE_MOMENTUM_V232"
        : meaningfulVerifiedSample
          ? "VERIFIED_SHORT_TERM_FLOW_NOT_STRONGLY_BEARISH_ENOUGH_V232"
          : "VERIFIED_SHORT_TERM_SAMPLE_BELOW_BEARISH_PROTECTION_THRESHOLD_V232",
    window: windowLabel,
    momentumScore,
    observedTrades,
    buys,
    sells,
    buyVolumeUsd,
    sellVolumeUsd,
    totalObservedUsd,
    netFlowUsd,
    buyPressureUsd,
    minimumObservedTrades: 5,
    minimumObservedUsd: 500,
    minimumSellUsd: 500,
    maximumBuyPressureUsd: 15,
    maximumNetFlowUsd: -500,
    verifiedUsdMathChanged: false,
    momentumMathChanged: false,
    externalRequestsAdded: 0
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

  const evidenceFreshnessV169 =
    telegramCoreEvidenceFreshnessV169(
      candidate
    );

  if (
    !evidenceFreshnessV169
      .passes
  ) {
    return false;
  }

  const bearishFlowProtectionV232 =
    telegramVerifiedBearishFlowProtectionV232(
      candidate
    );

  if (
    bearishFlowProtectionV232
      .suppresses
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

  else {
    const evidenceFreshnessV169 =
      telegramCoreEvidenceFreshnessV169(
        candidate
      );

    if (
      evidenceFreshnessV169
        .marketFreshnessState ===
      "STALE_CACHE"
    ) {
      reasons.push(
        "MARKET_EVIDENCE_STALE_FOR_ALERT_V169"
      );
    }

    if (
      evidenceFreshnessV169
        .holderFreshnessState ===
        "STALE_CACHE" &&
      !evidenceFreshnessV169
        .holderAlertEvidenceAcceptable
    ) {
      reasons.push(
        "HOLDER_EVIDENCE_STALE_FOR_ALERT_V169"
      );
    }
  }

  const bearishFlowProtectionV232 =
    telegramVerifiedBearishFlowProtectionV232(
      candidate
    );

  if (
    bearishFlowProtectionV232
      .suppresses
  ) {
    reasons.push(
      "VERIFIED_BEARISH_SHORT_TERM_FLOW_V232"
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
      reasons,
      verifiedBearishFlowProtectionV232:
        telegramVerifiedBearishFlowProtectionV232(
          candidate
        )
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
   V216 VERIFIED PONS V2 CURVE FLOW
   ========================================================= */

function candidateVerifiedPonsCurveFlowV216(
  candidate,
  state
) {
  const token =
    normalize(candidate?.address);

  const records =
    Array.isArray(
      state?.ponsCurveTradesV216?.recentTrades
    )
      ? state.ponsCurveTradesV216.recentTrades
      : [];

  const valid =
    records.filter(
      row =>
        row?.verified === true &&
        normalize(row?.token) === token &&
        row?.protocol === "pons_v2" &&
        (
          row?.side === "buy" ||
          row?.side === "sell"
        ) &&
        Number.isFinite(
          Number(row?.tradeUsd)
        ) &&
        Number(row.tradeUsd) > 0 &&
        safeNumber(row?.observedAt) > 0
    );

  const now =
    Date.now();

  const summarize =
    windowMs => {
      const rows =
        valid.filter(
          row =>
            safeNumber(row?.observedAt) >=
              now - windowMs &&
            safeNumber(row?.observedAt) <= now
        );

      let buys = 0;
      let sells = 0;
      let buyVolumeUsd = 0;
      let sellVolumeUsd = 0;

      const traders =
        new Set();

      for (const row of rows) {
        const usd =
          Number(row.tradeUsd);

        if (row.side === "buy") {
          buys++;
          buyVolumeUsd += usd;
        } else {
          sells++;
          sellVolumeUsd += usd;
        }

        const trader =
          normalize(row?.trader);

        if (isAddress(trader)) {
          traders.add(trader);
        }
      }

      const totalUsd =
        buyVolumeUsd +
        sellVolumeUsd;

      return {
        verified:
          rows.length > 0,
        observedTrades:
          rows.length,
        uniqueTraders:
          traders.size,
        buys,
        sells,
        buyVolumeUsd:
          rows.length
            ? buyVolumeUsd
            : null,
        sellVolumeUsd:
          rows.length
            ? sellVolumeUsd
            : null,
        netFlowUsd:
          rows.length
            ? buyVolumeUsd -
              sellVolumeUsd
            : null,
        buyPressureUsd:
          rows.length &&
          totalUsd > 0
            ? (
                buyVolumeUsd /
                totalUsd
              ) * 100
            : null,
        source:
          "BITQUERY_TRADING_PONS_V2_V216"
      };
    };

  const windows = {
    m5:
      summarize(V180_WINDOW_MS.m5),
    m15:
      summarize(V180_WINDOW_MS.m15),
    h1:
      summarize(V180_WINDOW_MS.h1),
    h6:
      summarize(V180_WINDOW_MS.h6),
    h12:
      summarize(V180_WINDOW_MS.h12),
    h24:
      summarize(V180_WINDOW_MS.h24)
  };

  return {
    verified:
      Object.values(windows).some(
        row => row.verified
      ),
    tokenAddress:
      token || null,
    protocol:
      "pons_v2",
    venue:
      "PONS_BONDING_CURVE",
    recordCount:
      valid.length,
    windows,
    source:
      "BITQUERY_TRADING_PONS_V2_V216",
    status:
      valid.length
        ? "VERIFIED_PONS_CURVE_FLOW_AVAILABLE"
        : "NO_VERIFIED_PONS_CURVE_FLOW"
  };
}

/* =========================================================
   V212 CANDIDATE-MATCHED VERIFIED ON-CHAIN USD → TELEGRAM
   ========================================================= */

/*
 * Important truth rule:
 * V179 records are exact decoded V4 swaps with verified candidate identity
 * and verified USD amounts, but the live scanner does not prove that its
 * locally retained records represent every market trade in a 5m/15m/1h/6h/
 * 12h/24h period. Therefore V212 exposes them as VERIFIED OBSERVED flow and does
 * not overwrite DexScreener/Gecko full-window counts or pretend partial
 * scanner coverage is complete.
 */
function candidateVerifiedOnChainFlowV212(
  candidate,
  state
) {
  const token =
    normalize(candidate?.address);

  const empty = {
    verified: false,
    source:
      "ONCHAIN_DIRECTIONAL_V179_CANDIDATE_MATCHED_V212",
    interpretation:
      "VERIFIED_OBSERVED_NOT_FULL_MARKET_WINDOW",
    tokenAddress:
      token || null,
    poolIds: [],
    recordCount: 0,
    windows: {},
    status:
      "NO_CANDIDATE_MATCHED_VERIFIED_ONCHAIN_USD"
  };

  if (!isAddress(token)) {
    return empty;
  }

  const ledger =
    onChainDirectionalStoreV179(state)?.[token];

  if (
    !ledger ||
    !Array.isArray(ledger.records)
  ) {
    return empty;
  }

  const now =
    Date.now();

  const valid =
    ledger.records.filter(
      row =>
        normalize(row?.candidateAddress) === token &&
        (
          row?.side === "buy" ||
          row?.side === "sell"
        ) &&
        row?.exactUsdVerified === true &&
        Number.isFinite(
          Number(row?.exactUsdAmount)
        ) &&
        Number(row?.exactUsdAmount) > 0 &&
        safeNumber(row?.observedAt) > 0
    );

  const summarize =
    windowMs => {
      const cutoff =
        now - windowMs;

      const rows =
        valid.filter(
          row =>
            safeNumber(row?.observedAt) >= cutoff &&
            safeNumber(row?.observedAt) <= now
        );

      let buys = 0;
      let sells = 0;
      let buyVolumeUsd = 0;
      let sellVolumeUsd = 0;

      const poolIds =
        new Set();

      for (const row of rows) {
        const usd =
          Number(row.exactUsdAmount);

        if (row.side === "buy") {
          buys++;
          buyVolumeUsd += usd;
        } else if (row.side === "sell") {
          sells++;
          sellVolumeUsd += usd;
        }

        const poolId =
          normalize(row?.poolId);

        if (
          /^0x[a-f0-9]{64}$/.test(poolId)
        ) {
          poolIds.add(poolId);
        }
      }

      const totalUsd =
        buyVolumeUsd +
        sellVolumeUsd;

      return {
        verified:
          rows.length > 0,
        fullMarketCoverageVerified:
          false,
        interpretation:
          "VERIFIED_OBSERVED_BY_BOT",
        observedTrades:
          rows.length,
        buys,
        sells,
        buyVolumeUsd:
          rows.length
            ? buyVolumeUsd
            : null,
        sellVolumeUsd:
          rows.length
            ? sellVolumeUsd
            : null,
        netFlowUsd:
          rows.length
            ? buyVolumeUsd -
              sellVolumeUsd
            : null,
        buyPressureUsd:
          rows.length &&
          totalUsd > 0
            ? (
                buyVolumeUsd /
                totalUsd
              ) * 100
            : null,
        poolIds:
          Array.from(poolIds)
      };
    };

  const windows = {
    m5:
      summarize(V180_WINDOW_MS.m5),
    m15:
      summarize(V180_WINDOW_MS.m15),
    h1:
      summarize(V180_WINDOW_MS.h1),
    h6:
      summarize(V180_WINDOW_MS.h6),
    h12:
      summarize(V180_WINDOW_MS.h12),
    h24:
      summarize(V180_WINDOW_MS.h24)
  };

  const verifiedAnyWindow =
    Object.values(windows).some(
      row =>
        row?.verified === true
    );

  return {
    verified:
      verifiedAnyWindow,
    source:
      "ONCHAIN_DIRECTIONAL_V179_CANDIDATE_MATCHED_V212",
    interpretation:
      "VERIFIED_OBSERVED_NOT_FULL_MARKET_WINDOW",
    tokenAddress:
      token,
    poolIds:
      Array.from(
        new Set(
          valid
            .map(row => normalize(row?.poolId))
            .filter(
              poolId =>
                /^0x[a-f0-9]{64}$/.test(poolId)
            )
        )
      ),
    recordCount:
      valid.length,
    windows,
    status:
      verifiedAnyWindow
        ? "CANDIDATE_MATCHED_VERIFIED_ONCHAIN_USD_AVAILABLE"
        : "NO_RECENT_CANDIDATE_MATCHED_VERIFIED_ONCHAIN_USD"
  };
}

function applyCandidateVerifiedOnChainFlowV212(
  candidate,
  state
) {
  const flow =
    candidateVerifiedOnChainFlowV212(
      candidate,
      state
    );

  candidate.onChainVerifiedFlowV212 =
    flow;

  return flow;
}



function telegramVerifiedUsdDiagnosticV213(
  candidate
) {
  const token =
    normalize(candidate?.address);

  const flow =
    candidate?.onChainVerifiedFlowV212;

  const windows = [
    ["m5", "5m"],
    ["m15", "15m"],
    ["h1", "1h"],
    ["h6", "6h"],
    ["h12", "12h"],
    ["h24", "24h"]
  ];

  const perWindow = {};

  for (const [key, label] of windows) {
    const row =
      flow?.windows?.[key];

    perWindow[key] = {
      label,
      verified:
        row?.verified === true,
      observedTrades:
        safeNumber(
          row?.observedTrades
        ),
      buys:
        safeNumber(row?.buys),
      sells:
        safeNumber(row?.sells),
      buyVolumeUsd:
        Number.isFinite(
          Number(row?.buyVolumeUsd)
        )
          ? Number(row.buyVolumeUsd)
          : null,
      sellVolumeUsd:
        Number.isFinite(
          Number(row?.sellVolumeUsd)
        )
          ? Number(row.sellVolumeUsd)
          : null,
      netFlowUsd:
        Number.isFinite(
          Number(row?.netFlowUsd)
        )
          ? Number(row.netFlowUsd)
          : null,
      buyPressureUsd:
        Number.isFinite(
          Number(row?.buyPressureUsd)
        )
          ? Number(row.buyPressureUsd)
          : null,
      fullMarketCoverageVerified:
        row?.fullMarketCoverageVerified === true
    };
  }

  const verifiedWindows =
    Object.entries(perWindow)
      .filter(([, row]) => row.verified)
      .map(([key]) => key);

  const eligible =
    flow?.verified === true &&
    verifiedWindows.length > 0;

  let reason = null;

  if (!isAddress(token)) {
    reason =
      "INVALID_CANDIDATE_ADDRESS";
  } else if (!flow) {
    reason =
      "V212_FLOW_NOT_ATTACHED_TO_CANDIDATE";
  } else if (flow.verified !== true) {
    reason =
      "NO_CANDIDATE_MATCHED_VERIFIED_ONCHAIN_USD";
  } else if (!verifiedWindows.length) {
    reason =
      "NO_VERIFIED_WINDOWS_AVAILABLE";
  }

  return {
    enabled: true,
    candidateAddress:
      token || null,
    exactTokenMatch:
      isAddress(token) &&
      normalize(flow?.tokenAddress) === token,
    matchedPoolIds:
      Array.isArray(flow?.poolIds)
        ? flow.poolIds
        : [],
    totalVerifiedRecords:
      safeNumber(
        flow?.recordCount
      ),
    verifiedWindows,
    windows:
      perWindow,
    telegramVerifiedUsdSectionEligible:
      eligible,
    telegramVerifiedUsdSectionReason:
      eligible
        ? "ELIGIBLE_AND_SHOULD_RENDER"
        : reason,
    interpretation:
      "VERIFIED_OBSERVED_NOT_FULL_MARKET_WINDOW",
    source:
      flow?.source ||
      "ONCHAIN_DIRECTIONAL_V179_CANDIDATE_MATCHED_V212"
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

  const holderCountDisplayV225 =
    holders?.holderCountDisplayV225;

  const holderText =
    holders?.countersVerified &&
    holders?.holderCount !== null
      ? `${formatNumber(holders.holderCount)} (VERIFIED)`
      : holderCountDisplayV225?.verified === true &&
        holderCountDisplayV225?.holderCount !== null
        ? `${formatNumber(holderCountDisplayV225.holderCount)} (VERIFIED CACHE)`
        : "UNVERIFIED";

  const holderCountSourceTextV225 =
    holders?.countersVerified &&
    holders?.holderCount !== null
      ? (holders?.counterSource || holders?.holderSource || "BLOCKSCOUT")
      : holderCountDisplayV225?.verified === true
        ? (holderCountDisplayV225?.source || "VERIFIED_CACHE")
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

    const derivedDirectionalWindow =
      window === "m15" ||
      window === "h6";

    const verifiedDerivedCounts =
      !derivedDirectionalWindow ||
      flow?.verified === true;

    return {
      buys:
        verifiedDerivedCounts
          ? safeNumber(tx?.buys)
          : "UNVERIFIED",
      sells:
        verifiedDerivedCounts
          ? safeNumber(tx?.sells)
          : "UNVERIFIED",
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

  const trade15m =
    tradeWindow("m15");

  const trade1h =
    tradeWindow("h1");

  const trade6h =
    tradeWindow("h6");

  const trade24h =
    tradeWindow("h24");

  const verifiedObservedV212 =
    candidate?.onChainVerifiedFlowV212;

  const verifiedObservedWindowV212 =
    window => {
      const row =
        verifiedObservedV212
          ?.windows
          ?.[window];

      if (
        verifiedObservedV212?.verified !== true ||
        row?.verified !== true
      ) {
        return null;
      }

      return {
        buys:
          safeNumber(row.buys),
        sells:
          safeNumber(row.sells),
        buyUsd:
          money(row.buyVolumeUsd),
        sellUsd:
          money(row.sellVolumeUsd),
        netUsd:
          money(row.netFlowUsd),
        pressureUsd:
          row.buyPressureUsd !== null &&
          row.buyPressureUsd !== undefined
            ? percentDisplay(
                row.buyPressureUsd
              )
            : "UNVERIFIED",
        observedTrades:
          safeNumber(
            row.observedTrades
          )
      };
    };

  const verifiedObserved5mV212 =
    verifiedObservedWindowV212("m5");

  const verifiedObserved15mV212 =
    verifiedObservedWindowV212("m15");

  const verifiedObserved1hV212 =
    verifiedObservedWindowV212("h1");

  const verifiedObserved6hV212 =
    verifiedObservedWindowV212("h6");

  const verifiedObserved12hV236 =
    verifiedObservedWindowV212("h12");

  const verifiedObserved24hV212 =
    verifiedObservedWindowV212("h24");

  const verifiedObservedLinesV212 = [];

  const ponsCurveFlowV216 =
    candidate?.ponsCurveFlowV216;

  const ponsCurveLinesV216 = [];

  if (ponsCurveFlowV216?.verified === true) {
    ponsCurveLinesV216.push(
      "",
      "🟣 <b>Verified Pons Curve USD</b>"
    );

    const ponsWindowV216 =
      (
        label,
        key
      ) => {
        const row =
          ponsCurveFlowV216
            ?.windows
            ?.[key];

        if (row?.verified !== true) {
          return;
        }

        ponsCurveLinesV216.push(
          `🟢 ${label} Curve Buys: <b>${safeNumber(row.buys)}</b> — <b>${money(row.buyVolumeUsd)}</b>`,
          `🔴 ${label} Curve Sells: <b>${safeNumber(row.sells)}</b> — <b>${money(row.sellVolumeUsd)}</b>`,
          `📈 ${label} Curve Net: <b>${money(row.netFlowUsd)}</b>`,
          `👤 ${label} Unique Traders: <b>${safeNumber(row.uniqueTraders)}</b>`,
          `💵 ${label} USD Buy Pressure: <b>${
            row.buyPressureUsd !== null &&
            row.buyPressureUsd !== undefined
              ? percentDisplay(
                  row.buyPressureUsd
                )
              : "UNVERIFIED"
          }</b>`
        );
      };

    ponsWindowV216("5m", "m5");
    ponsWindowV216("15m", "m15");
    ponsWindowV216("1h", "h1");
    ponsWindowV216("6h", "h6");
    ponsWindowV216("12h", "h12");
    ponsWindowV216("24h", "h24");

    ponsCurveLinesV216.push(
      "ℹ️ <i>Verified Pons V2 bonding-curve trades from Bitquery Trading; kept separate from Uniswap V4.</i>"
    );
  }

  const telegramVerifiedUsdDiagnosticV213 =
    candidate?.telegramVerifiedUsdDiagnosticV213 ||
    telegramVerifiedUsdDiagnosticV213(
      candidate
    );

  const telegramVerifiedUsdWillRenderV213 =
    verifiedObservedV212?.verified === true &&
    telegramVerifiedUsdDiagnosticV213
      ?.telegramVerifiedUsdSectionEligible === true;

  telegramVerifiedUsdDiagnosticV213.telegramVerifiedUsdSectionRendered =
    telegramVerifiedUsdWillRenderV213;

  telegramVerifiedUsdDiagnosticV213.telegramVerifiedUsdRenderStatus =
    telegramVerifiedUsdWillRenderV213
      ? "RENDERED"
      : (
          telegramVerifiedUsdDiagnosticV213
            ?.telegramVerifiedUsdSectionReason ||
          "NOT_RENDERED"
        );

  if (telegramVerifiedUsdWillRenderV213) {
    verifiedObservedLinesV212.push(
      "",
      "✅ <b>Verified On-chain USD (observed by bot)</b>"
    );

    const pushObserved =
      (
        label,
        row
      ) => {
        if (!row) {
          return;
        }

        verifiedObservedLinesV212.push(
          `🟢 ${label} Verified Buys: <b>${row.buys}</b> — <b>${row.buyUsd}</b>`,
          `🔴 ${label} Verified Sells: <b>${row.sells}</b> — <b>${row.sellUsd}</b>`,
          `📈 ${label} Verified Net: <b>${row.netUsd}</b>`,
          `💵 ${label} Verified USD Buy Pressure: <b>${row.pressureUsd}</b>`
        );
      };

    pushObserved(
      "5m",
      verifiedObserved5mV212
    );
    pushObserved(
      "15m",
      verifiedObserved15mV212
    );
    pushObserved(
      "1h",
      verifiedObserved1hV212
    );
    pushObserved(
      "6h",
      verifiedObserved6hV212
    );
    pushObserved(
      "12h",
      verifiedObserved12hV236
    );
    pushObserved(
      "24h",
      verifiedObserved24hV212
    );

    verifiedObservedLinesV212.push(
      "ℹ️ <i>Verified exact V4 swaps observed by this bot; not claimed as complete market-window totals.</i>"
    );
  }

  const verifiedLaunchAgeV223Data =
    candidate?.verifiedLaunchAgeV223 ||
    {
      verified: false,
      launchAgeDisplay: "UNVERIFIED",
      scannerAgeDisplay: "UNVERIFIED",
      protocol: null
    };

  const verifiedLaunchAgeTextV223 =
    verifiedLaunchAgeV223Data?.verified === true
      ? verifiedLaunchAgeV223Data.launchAgeDisplay
      : "UNVERIFIED";

  const scannerAgeTextV223 =
    verifiedLaunchAgeV223Data?.scannerAgeDisplay ||
    "UNVERIFIED";

  const lines = [
    `🚨 <b>Robinhood Chain Meme Hunter ${VERSION}</b>`,
    `📣 <b>${escapeHtml(alertClass.title)}</b>`,
    "",
    `🪙 <b>${escapeHtml(candidate.name || "Unknown Token")} (${escapeHtml(candidate.symbol || "UNKNOWN")})</b>`,
    "",
    "<b>Contract:</b>",
    `<code>${escapeHtml(candidate.address)}</code>`,
    "",
    `⏱ Verified launch age: <b>${escapeHtml(verifiedLaunchAgeTextV223)}</b>`,
    `🔭 Scanner age: <b>${escapeHtml(scannerAgeTextV223)}</b>`,
    verifiedLaunchAgeV223Data?.verified === true &&
    verifiedLaunchAgeV223Data?.protocol
      ? `🏷 Launch source: <b>${escapeHtml(verifiedLaunchAgeV223Data.protocol)}</b>`
      : `🏷 Launch source: <b>UNVERIFIED</b>`,
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
    "📊 <b>Market Activity Counts — NOT USD VERIFIED</b>",
    `🟢 5m Buys: <b>${trade5m.buys}</b>`,
    `🔴 5m Sells: <b>${trade5m.sells}</b>`,
    "",
    `🟢 15m Buys: <b>${trade15m.buys}</b>`,
    `🔴 15m Sells: <b>${trade15m.sells}</b>`,
    "",
    `🟢 1h Buys: <b>${trade1h.buys}</b>`,
    `🔴 1h Sells: <b>${trade1h.sells}</b>`,
    "",
    `🟢 6h Buys: <b>${trade6h.buys}</b>`,
    `🔴 6h Sells: <b>${trade6h.sells}</b>`,
    "",
    `🟢 24h Buys: <b>${trade24h.buys}</b>`,
    `🔴 24h Sells: <b>${trade24h.sells}</b>`,
    ...verifiedObservedLinesV212,
    ...ponsCurveLinesV216,
    "",
    `👥 Holder count: <b>${escapeHtml(holderText)}</b>`,
    `🧾 Holder count source: <b>${escapeHtml(holderCountSourceTextV225)}</b>`,
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
          options?.marketPriority ??
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
          options?.holderPriorityCompletion ??
          options?.priorityCompletion
        ),
        env,
        state,
        validation.decimals
      );
  }

  /* V225: recover a verified holder count for display/telemetry only.
   * Do not mutate countersVerified: scoring and qualification stay unchanged.
   */
  holders = {
    ...holders,
    holderCountDisplayV225:
      holderCountDisplayEvidenceV225(
        watched,
        holders,
        state,
        address
      )
  };

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

    verifiedLaunchAgeV223:
      verifiedLaunchAgeV223(
        watched
      ),

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

  evidenceQualityProtectionV158(
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

function formatAgeV223(
  ageMs
) {
  if (
    !Number.isFinite(ageMs) ||
    ageMs < 0
  ) {
    return "UNVERIFIED";
  }

  const totalSeconds =
    Math.floor(ageMs / 1000);

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes =
    Math.floor(totalSeconds / 60);
  const seconds =
    totalSeconds % 60;

  if (totalMinutes < 60) {
    return `${totalMinutes}m ${seconds}s`;
  }

  const totalHours =
    Math.floor(totalMinutes / 60);
  const minutes =
    totalMinutes % 60;

  if (totalHours < 24) {
    return `${totalHours}h ${minutes}m`;
  }

  const days =
    Math.floor(totalHours / 24);
  const hours =
    totalHours % 24;

  return `${days}d ${hours}h`;
}

function verifiedLaunchAgeV223(
  watched
) {
  /*
   * V223 only accepts timestamps attached to an already VERIFIED launchpad
   * identity. firstSeenAt / scanner age is intentionally never used as a
   * substitute for launch time.
   */
  const launchRecords = [
    watched?.launchpadV210,
    watched?.launchpadV214,
    watched?.launchpadV215,
    watched?.launchpadV220,
    watched?.launchpadV222,
    watched?.launchpadV224
  ]
    .filter(
      row =>
        row?.verified === true &&
        row?.launchTime
    )
    .map(row => {
      const parsed =
        Date.parse(
          String(row.launchTime)
        );

      return {
        row,
        timestamp:
          Number.isFinite(parsed)
            ? parsed
            : null
      };
    })
    .filter(
      item =>
        item.timestamp !== null &&
        item.timestamp > 0
    )
    .sort(
      (a, b) =>
        a.timestamp - b.timestamp
    );

  const scannerFirstSeenAt =
    safeNumber(
      watched?.firstSeenAt
    );

  const scannerAgeMs =
    scannerFirstSeenAt > 0
      ? Math.max(
          0,
          Date.now() - scannerFirstSeenAt
        )
      : null;

  if (!launchRecords.length) {
    return {
      verified: false,
      source:
        "VERIFIED_LAUNCH_TIMESTAMP_UNAVAILABLE",
      protocol: null,
      launchTime: null,
      launchTimestampMs: null,
      launchAgeMs: null,
      launchAgeSeconds: null,
      launchAgeMinutes: null,
      launchAgeDisplay:
        "UNVERIFIED",
      scannerFirstSeenAt:
        scannerFirstSeenAt || null,
      scannerAgeMs,
      scannerAgeSeconds:
        scannerAgeMs !== null
          ? Math.floor(scannerAgeMs / 1000)
          : null,
      scannerAgeDisplay:
        scannerAgeMs !== null
          ? formatAgeV223(scannerAgeMs)
          : "UNVERIFIED",
      scannerAgeIsNotLaunchAge: true
    };
  }

  const selected =
    launchRecords[0];
  const launchAgeMs =
    Math.max(
      0,
      Date.now() - selected.timestamp
    );

  return {
    verified: true,
    source:
      "VERIFIED_LAUNCHPAD_EVENT_TIMESTAMP_V223",
    protocol:
      selected.row?.protocol ||
      selected.row?.family ||
      null,
    launchTime:
      selected.row.launchTime,
    launchTimestampMs:
      selected.timestamp,
    launchAgeMs,
    launchAgeSeconds:
      Math.floor(launchAgeMs / 1000),
    launchAgeMinutes:
      launchAgeMs / 60000,
    launchAgeDisplay:
      formatAgeV223(launchAgeMs),
    scannerFirstSeenAt:
      scannerFirstSeenAt || null,
    scannerAgeMs,
    scannerAgeSeconds:
      scannerAgeMs !== null
        ? Math.floor(scannerAgeMs / 1000)
        : null,
    scannerAgeDisplay:
      scannerAgeMs !== null
        ? formatAgeV223(scannerAgeMs)
        : "UNVERIFIED",
    scannerAgeIsNotLaunchAge: true
  };
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

/*
 * V159: A verified market cache only frees the scarce fresh slot while it is
 * still inside the normal verified market-cache TTL. Stale verified data can
 * remain useful for analysis, but it must not suppress a needed refresh.
 */
function freshUsableVerifiedMarketCacheV159(
  token
) {
  const timestamp =
    safeNumber(
      token?.marketCache?.timestamp
    );

  if (
    !timestamp ||
    !verifiedUsableMarketCache(
      token
    )
  ) {
    return false;
  }

  const ageMs =
    Date.now() -
    timestamp;

  return (
    ageMs >= 0 &&
    ageMs <= MARKET_CACHE_MS
  );
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

function matureZeroActivityPriorityReleaseV172(
  candidate,
  watched = null
) {
  if (!candidate) {
    return {
      release: false,
      reason: null,
      evidence: "CANDIDATE_UNAVAILABLE"
    };
  }

  if (
    candidate?.newlyDiscovered ||
    candidate?.liveDiscovery ||
    candidate?.newlyLaunched
  ) {
    return {
      release: false,
      reason: null,
      evidence: "NEW_OR_LIVE_CLASSIFICATION"
    };
  }

  let marketEvidence =
    candidate?.market?.verified === true
      ? candidate.market
      : null;

  let marketEvidenceSource =
    marketEvidence
      ? "CURRENT_VERIFIED_MARKET"
      : null;

  let cacheAgeMs = null;

  if (!marketEvidence) {
    const cache = watched?.marketCache;
    const timestamp = safeNumber(cache?.timestamp);
    const ageMs = timestamp > 0
      ? Date.now() - timestamp
      : null;
    const data = cache?.data;

    const cacheWithinExistingStaleWindow =
      ageMs !== null &&
      ageMs >= 0 &&
      ageMs <= MARKET_STALE_CACHE_MS;

    const exact24hEvidencePresent =
      data?.verified === true &&
      Number.isFinite(Number(data?.volume?.h24)) &&
      Number.isFinite(Number(data?.transactions?.h24?.total));

    if (
      cacheWithinExistingStaleWindow &&
      exact24hEvidencePresent
    ) {
      marketEvidence = data;
      marketEvidenceSource = "VERIFIED_STALE_MARKET_CACHE_V172";
      cacheAgeMs = ageMs;
    }
  }

  if (!marketEvidence) {
    return {
      release: false,
      reason: null,
      evidence: "MARKET_NOT_VERIFIED",
      marketEvidenceSource,
      cacheAgeMs,
      cacheMaxAgeMs: MARKET_STALE_CACHE_MS
    };
  }

  const stageEvidence = launchStage(marketEvidence);

  if (
    stageEvidence?.verified !== true ||
    stageEvidence?.stage !== "MATURE"
  ) {
    return {
      release: false,
      reason: null,
      evidence: "NOT_MATURE",
      marketEvidenceSource,
      cacheAgeMs,
      cacheMaxAgeMs: MARKET_STALE_CACHE_MS,
      stage: stageEvidence?.stage || "UNVERIFIED",
      ageMinutes: stageEvidence?.ageMinutes ?? null
    };
  }

  const rawVolume24h = marketEvidence?.volume?.h24;
  const rawTxns24h = marketEvidence?.transactions?.h24?.total;

  if (
    !Number.isFinite(Number(rawVolume24h)) ||
    !Number.isFinite(Number(rawTxns24h))
  ) {
    return {
      release: false,
      reason: null,
      evidence: "VERIFIED_MARKET_24H_ACTIVITY_INCOMPLETE",
      marketEvidenceSource,
      cacheAgeMs,
      cacheMaxAgeMs: MARKET_STALE_CACHE_MS
    };
  }

  const volume24h = safeNumber(rawVolume24h);
  const txns24h = safeNumber(rawTxns24h);

  const onChainSwaps = safeNumber(candidate?.activity?.swaps);
  const onChainLiquidityEvents = safeNumber(candidate?.activity?.liquidityEvents);

  const zeroVerified24hActivity =
    volume24h === 0 &&
    txns24h === 0;

  const noCurrentOnChainActivity =
    onChainSwaps === 0 &&
    onChainLiquidityEvents === 0;

  if (
    !zeroVerified24hActivity ||
    !noCurrentOnChainActivity
  ) {
    return {
      release: false,
      reason: null,
      evidence: "ACTIVITY_PRESENT",
      marketEvidenceSource,
      cacheAgeMs,
      cacheMaxAgeMs: MARKET_STALE_CACHE_MS,
      volume24h,
      txns24h,
      onChainSwaps,
      onChainLiquidityEvents
    };
  }

  return {
    release: true,
    reason: "MATURE_ZERO_ACTIVITY_PRIORITY_RELEASE_V172",
    evidence: "VERIFIED_MATURE_ZERO_24H_AND_ONCHAIN_ACTIVITY",
    marketEvidenceSource,
    cacheAgeMs,
    cacheMaxAgeMs: MARKET_STALE_CACHE_MS,
    stage: stageEvidence.stage,
    ageMinutes: stageEvidence.ageMinutes ?? null,
    volume24h,
    txns24h,
    onChainSwaps,
    onChainLiquidityEvents,
    removesFromWatchlist: false
  };
}

function shouldKeepCompletionCandidate(
  candidate,
  previousCompletion = null,
  watched = null
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

  const matureZeroActivityRelease =
    matureZeroActivityPriorityReleaseV172(
      candidate,
      watched
    );

  if (
    matureZeroActivityRelease.release
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

  /*
   * V186 local identity recovery must happen BEFORE pruneState so a valid
   * pool mapping already persisted inside watchedTokens[].pools can be
   * restored before unknown-pool resolution and live directional decoding.
   */
  const poolRegistrySelfHealV186 =
    rebuildPoolRegistryFromWatchedPoolsV186(
      state
    );

  pruneState(
    state,
    false
  );

  beginMarketProviderRecoveryScanV157(
    state,
    startedAt
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

  
  /*
   * V211: newly verified pools.trade launches must not wait behind ordinary
   * watch/backlog ordering. The existing V208 recognizer has already
   * validated emitter + event + PoolKey + token membership and registered
   * the PoolId through registerPoolMapping(). We only promote already-
   * verified launch outputs here; no inference and no extra external request.
   */
  const verifiedLaunchPriorityTokensV211 = new Set();
  const verifiedLaunchPriorityPoolsV211 = new Set();

  for (
    const launch
    of (
      liveDiscovery?.poolsTradeLaunchEventsV208?.events ||
      liveDiscovery?.poolsTradeLaunchEventsV205?.events ||
      []
    )
  ) {
    if (!launch?.decodeVerified && launch?.verified !== true) {
      continue;
    }

    const launchToken =
      normalize(
        launch?.token ||
        launch?.tokenAddress
      );

    const launchPoolId =
      normalize(
        launch?.poolId
      );

    if (isAddress(launchToken)) {
      verifiedLaunchPriorityTokensV211.add(launchToken);
    }

    if (/^0x[a-f0-9]{64}$/.test(launchPoolId)) {
      verifiedLaunchPriorityPoolsV211.add(launchPoolId);
    }
  }

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
   * V211 fallback bridge: V209 persistent launch telemetry retains the
   * latest verified pools.trade launch even when the compact per-batch
   * telemetry does not expose a full events array. Only a launch observed
   * in the current live block range is promoted from this fallback.
   */
  const liveFromV211 =
    safeNumber(liveDiscovery?.fromBlock);
  const liveToV211 =
    safeNumber(liveDiscovery?.toBlock);

  const recentPoolsTradeLaunchesV211 =
    Array.isArray(
      state?.poolsTradeLaunchTelemetryV209?.recentVerifiedLaunches
    )
      ? state.poolsTradeLaunchTelemetryV209.recentVerifiedLaunches
      : [];

  for (const launch of recentPoolsTradeLaunchesV211) {
    const blockNumber =
      safeNumber(launch?.blockNumber);

    if (
      !blockNumber ||
      !liveFromV211 ||
      !liveToV211 ||
      blockNumber < liveFromV211 ||
      blockNumber > liveToV211
    ) {
      continue;
    }

    const launchToken =
      normalize(
        launch?.token ||
        launch?.tokenAddress
      );

    const launchPoolId =
      normalize(launch?.poolId);

    if (isAddress(launchToken)) {
      verifiedLaunchPriorityTokensV211.add(launchToken);
      liveTokens.add(launchToken);
      newTokens.add(launchToken);
    }

    if (/^0x[a-f0-9]{64}$/.test(launchPoolId)) {
      verifiedLaunchPriorityPoolsV211.add(launchPoolId);
    }
  }

  for (const launchToken of verifiedLaunchPriorityTokensV211) {
    liveTokens.add(launchToken);
    newTokens.add(launchToken);
  }

  /*
   * V228: V227 could only target a candidate that already existed before this
   * shared Bitquery request. Persist the best unresolved holder candidate from
   * the previous scan and consume it here on the next existing request.
   */
  const persistedBitqueryHolderTargetV228 =
    state.bitqueryHolderTargetV228 &&
    typeof state.bitqueryHolderTargetV228 === "object"
      ? state.bitqueryHolderTargetV228
      : null;

  const persistedBitqueryHolderTargetAddressV228 =
    isAddress(persistedBitqueryHolderTargetV228?.address)
      ? normalize(persistedBitqueryHolderTargetV228.address)
      : null;

  const persistedBitqueryHolderTargetAgeV228 =
    persistedBitqueryHolderTargetAddressV228 &&
    safeNumber(persistedBitqueryHolderTargetV228?.selectedAt)
      ? Date.now() - safeNumber(persistedBitqueryHolderTargetV228.selectedAt)
      : null;

  const persistedBitqueryHolderWatchedV228 =
    persistedBitqueryHolderTargetAddressV228
      ? state.watchedTokens.find(
          row => normalize(row?.address) === persistedBitqueryHolderTargetAddressV228
        ) || null
      : null;

  const persistedBitqueryEvidenceAlreadyFreshV228 =
    persistedBitqueryHolderTargetAddressV228 &&
    state.bitqueryHolderEvidenceV227?.verified === true &&
    normalize(state.bitqueryHolderEvidenceV227?.address) ===
      persistedBitqueryHolderTargetAddressV228 &&
    safeNumber(state.bitqueryHolderEvidenceV227?.fetchedAt) > 0 &&
    Date.now() - safeNumber(state.bitqueryHolderEvidenceV227.fetchedAt) <=
      BITQUERY_HOLDER_EVIDENCE_MAX_AGE_MS_V227;

  const persistedBitqueryHolderTargetEligibleV228 = Boolean(
    persistedBitqueryHolderTargetAddressV228 &&
    persistedBitqueryHolderWatchedV228 &&
    persistedBitqueryHolderTargetAgeV228 !== null &&
    persistedBitqueryHolderTargetAgeV228 <= BITQUERY_HOLDER_TARGET_MAX_AGE_MS_V228 &&
    !persistedBitqueryEvidenceAlreadyFreshV228 &&
    !preMarketExcludedToken(persistedBitqueryHolderWatchedV228).excluded &&
    !terminalPriorityRejectFromWatched(persistedBitqueryHolderWatchedV228).terminal &&
    persistedBitqueryHolderWatchedV228?.launchpadV215?.verified !== true
  );

  if (persistedBitqueryHolderTargetAddressV228 && !persistedBitqueryHolderTargetEligibleV228) {
    state.bitqueryHolderTargetV228 = {
      ...newState().bitqueryHolderTargetV228,
      status: persistedBitqueryEvidenceAlreadyFreshV228
        ? "CLEARED_MATCHING_FRESH_EVIDENCE"
        : "CLEARED_STALE_OR_INELIGIBLE"
    };
  }

  const persistedHolderTargetAddressV227 = completionCandidateAddress(state);
  const liveHolderTargetRowV227 = state.watchedTokens
    .filter(row => {
      const address = normalize(row?.address);
      return isAddress(address) &&
        (newTokens.has(address) || liveTokens.has(address)) &&
        !preMarketExcludedToken(row).excluded &&
        !terminalPriorityRejectFromWatched(row).terminal;
    })
    .sort((a, b) =>
      watchPriority(b, newTokens, liveTokens) - watchPriority(a, newTokens, liveTokens)
    )[0] || null;

  const bitqueryHolderTargetV227 = persistedBitqueryHolderTargetEligibleV228
    ? {
        address: persistedBitqueryHolderTargetAddressV228,
        reason: "PERSISTED_UNRESOLVED_HOLDER_TARGET_V228"
      }
    : isAddress(persistedHolderTargetAddressV227)
      ? {address: persistedHolderTargetAddressV227, reason: "PERSISTED_PRIORITY_COMPLETION_V227"}
      : isAddress(liveHolderTargetRowV227?.address)
        ? {address: normalize(liveHolderTargetRowV227.address), reason: "HIGHEST_PRIORITY_CURRENT_LIVE_OR_NEW_V227"}
        : null;

  /*
   * V235: consume a separately persisted market-evidence target. It must still
   * be watched, viable/non-terminal and market-unverified at request assembly.
   * Fresh matching Bitquery market evidence clears the handoff rather than
   * repeatedly querying the same token.
   */
  const persistedBitqueryMarketTargetV235 =
    state.bitqueryMarketTargetV235 &&
    typeof state.bitqueryMarketTargetV235 === "object"
      ? state.bitqueryMarketTargetV235
      : null;

  const persistedBitqueryMarketTargetAddressV235 =
    isAddress(persistedBitqueryMarketTargetV235?.address)
      ? normalize(persistedBitqueryMarketTargetV235.address)
      : null;

  const persistedBitqueryMarketTargetAgeV235 =
    persistedBitqueryMarketTargetAddressV235 &&
    safeNumber(persistedBitqueryMarketTargetV235?.selectedAt)
      ? Date.now() - safeNumber(persistedBitqueryMarketTargetV235.selectedAt)
      : null;

  const persistedBitqueryMarketWatchedV235 =
    persistedBitqueryMarketTargetAddressV235
      ? state.watchedTokens.find(
          row => normalize(row?.address) === persistedBitqueryMarketTargetAddressV235
        ) || null
      : null;

  const matchingBitqueryTokensFreshV235 = Boolean(
    persistedBitqueryMarketTargetAddressV235 &&
    state.bitqueryMarketEvidenceV233?.verified === true &&
    normalize(state.bitqueryMarketEvidenceV233?.address) === persistedBitqueryMarketTargetAddressV235 &&
    safeNumber(state.bitqueryMarketEvidenceV233?.fetchedAt) > 0 &&
    Date.now() - safeNumber(state.bitqueryMarketEvidenceV233.fetchedAt) <=
      BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233
  );

  const matchingBitqueryPairFreshV235 = Boolean(
    persistedBitqueryMarketTargetAddressV235 &&
    state.bitqueryRankedPairEvidenceV234?.verified === true &&
    normalize(state.bitqueryRankedPairEvidenceV234?.address) === persistedBitqueryMarketTargetAddressV235 &&
    safeNumber(state.bitqueryRankedPairEvidenceV234?.fetchedAt) > 0 &&
    Date.now() - safeNumber(state.bitqueryRankedPairEvidenceV234.fetchedAt) <=
      BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234
  );

  const persistedBitqueryMarketTargetEligibleV235 = Boolean(
    persistedBitqueryMarketTargetAddressV235 &&
    persistedBitqueryMarketWatchedV235 &&
    persistedBitqueryMarketTargetAgeV235 !== null &&
    persistedBitqueryMarketTargetAgeV235 <= BITQUERY_MARKET_TARGET_MAX_AGE_MS_V235 &&
    !matchingBitqueryTokensFreshV235 &&
    !matchingBitqueryPairFreshV235 &&
    !preMarketExcludedToken(persistedBitqueryMarketWatchedV235).excluded &&
    !terminalPriorityRejectFromWatched(persistedBitqueryMarketWatchedV235).terminal &&
    !freshUsableVerifiedMarketCacheV159(persistedBitqueryMarketWatchedV235)
  );

  if (persistedBitqueryMarketTargetAddressV235 && !persistedBitqueryMarketTargetEligibleV235) {
    state.bitqueryMarketTargetV235 = {
      ...newState().bitqueryMarketTargetV235,
      status: matchingBitqueryTokensFreshV235 || matchingBitqueryPairFreshV235
        ? "CLEARED_MATCHING_FRESH_MARKET_EVIDENCE"
        : "CLEARED_STALE_OR_INELIGIBLE"
    };
  }

  const bitqueryMarketTargetV235 = persistedBitqueryMarketTargetEligibleV235
    ? {
        address: persistedBitqueryMarketTargetAddressV235,
        reason: "PERSISTED_MARKET_UNVERIFIED_TARGET_V235"
      }
    : null;

  /* V237: consume separately persisted exact-PoolId liquidity target. */
  const persistedBitqueryLiquidityTargetV237 =
    state.bitqueryLiquidityTargetV237 && typeof state.bitqueryLiquidityTargetV237 === "object"
      ? state.bitqueryLiquidityTargetV237
      : null;
  const persistedBitqueryLiquidityTargetAddressV237 = isAddress(persistedBitqueryLiquidityTargetV237?.address)
    ? normalize(persistedBitqueryLiquidityTargetV237.address)
    : null;
  const persistedBitqueryLiquidityTargetPoolIdV237 = /^0x[a-f0-9]{64}$/.test(normalize(persistedBitqueryLiquidityTargetV237?.poolId))
    ? normalize(persistedBitqueryLiquidityTargetV237.poolId)
    : null;
  const persistedBitqueryLiquidityTargetAgeV237 =
    persistedBitqueryLiquidityTargetAddressV237 && safeNumber(persistedBitqueryLiquidityTargetV237?.selectedAt)
      ? Date.now() - safeNumber(persistedBitqueryLiquidityTargetV237.selectedAt)
      : null;
  const persistedBitqueryLiquidityWatchedV237 = persistedBitqueryLiquidityTargetAddressV237
    ? state.watchedTokens.find(row => normalize(row?.address) === persistedBitqueryLiquidityTargetAddressV237) || null
    : null;
  const matchingLiquidityFreshV237 = Boolean(
    persistedBitqueryLiquidityTargetAddressV237 && persistedBitqueryLiquidityTargetPoolIdV237 &&
    state.bitqueryLiquidityEvidenceV237?.verified === true &&
    normalize(state.bitqueryLiquidityEvidenceV237?.address) === persistedBitqueryLiquidityTargetAddressV237 &&
    normalize(state.bitqueryLiquidityEvidenceV237?.poolId) === persistedBitqueryLiquidityTargetPoolIdV237 &&
    safeNumber(state.bitqueryLiquidityEvidenceV237?.fetchedAt) > 0 &&
    Date.now() - safeNumber(state.bitqueryLiquidityEvidenceV237.fetchedAt) <= BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237
  );
  const persistedBitqueryLiquidityTargetEligibleV237 = Boolean(
    persistedBitqueryLiquidityTargetAddressV237 && persistedBitqueryLiquidityTargetPoolIdV237 &&
    persistedBitqueryLiquidityWatchedV237 && persistedBitqueryLiquidityTargetAgeV237 !== null &&
    persistedBitqueryLiquidityTargetAgeV237 <= BITQUERY_LIQUIDITY_TARGET_MAX_AGE_MS_V237 &&
    !matchingLiquidityFreshV237 && !preMarketExcludedToken(persistedBitqueryLiquidityWatchedV237).excluded &&
    !terminalPriorityRejectFromWatched(persistedBitqueryLiquidityWatchedV237).terminal
  );
  if (persistedBitqueryLiquidityTargetAddressV237 && !persistedBitqueryLiquidityTargetEligibleV237) {
    state.bitqueryLiquidityTargetV237 = {
      ...newState().bitqueryLiquidityTargetV237,
      status: matchingLiquidityFreshV237 ? "CLEARED_MATCHING_FRESH_LIQUIDITY_EVIDENCE" : "CLEARED_STALE_OR_INELIGIBLE"
    };
  }
  const bitqueryLiquidityTargetV237 = persistedBitqueryLiquidityTargetEligibleV237
    ? {
        address: persistedBitqueryLiquidityTargetAddressV237,
        poolId: persistedBitqueryLiquidityTargetPoolIdV237,
        quoteAddress: normalize(persistedBitqueryLiquidityTargetV237?.quoteAddress) || null,
        reason: "PERSISTED_EXACT_POOL_LIQUIDITY_TARGET_V237"
      }
    : null;

  const bagsDiscoveryV210 =
    await discoverVerifiedBagsLaunchesV210(
      env,
      state,
      budget,
      bitqueryHolderTargetV227,
      bitqueryMarketTargetV235,
      bitqueryLiquidityTargetV237
    );

  for (const launch of bagsDiscoveryV210.launches || []) {
    if (isAddress(launch?.token)) {
      liveTokens.add(normalize(launch.token));
      newTokens.add(normalize(launch.token));
    }
  }

  for (const launch of bagsDiscoveryV210.flapLaunches || []) {
    if (isAddress(launch?.token)) {
      liveTokens.add(normalize(launch.token));
      newTokens.add(normalize(launch.token));
    }
  }

  for (const launch of bagsDiscoveryV210.ponsLaunches || []) {
    if (isAddress(launch?.token)) {
      liveTokens.add(normalize(launch.token));
      newTokens.add(normalize(launch.token));
    }
  }

  for (
    const launch
    of (
      bagsDiscoveryV210
        .launchHoodLaunchesV220 ||
      []
    )
  ) {
    if (isAddress(launch?.token)) {
      liveTokens.add(
        normalize(launch.token)
      );
      newTokens.add(
        normalize(launch.token)
      );
    }
  }

  for (
    const launch
    of (
      bagsDiscoveryV210
        .fixedMintLaunchpadLaunchesV222 ||
      []
    )
  ) {
    if (isAddress(launch?.token)) {
      liveTokens.add(normalize(launch.token));
      newTokens.add(normalize(launch.token));
    }
  }

  for (const launch of (bagsDiscoveryV210.clankerVirtualsLaunchesV224 || [])) {
    if (isAddress(launch?.token)) {
      liveTokens.add(normalize(launch.token));
      newTokens.add(normalize(launch.token));
    }
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
    recoveredUnknownPoolsV185: 0,
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

      const registrationV185 =
        registerPoolMapping(
          state,
          pool
        );

      liveInitializeLookback.initializeEvents++;

      if (
        registrationV185
          ?.recoveredUnknownTracker ===
          true
      ) {
        liveInitializeLookback
          .recoveredUnknownPoolsV185++;
      }
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
      budget,
      liveActivity.unknownPoolIds
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

  /*
   * V179: decode known-pool live Swap logs after all same-run pool-resolution
   * opportunities have completed. This reuses liveOutput.logs and adds zero
   * external requests.
   */
  const sameBatchWethUsdGReferencePrecheckV194 =
    deriveCanonicalWethUsdGReferenceV187(
      state,
      liveOutput.logs
    );

  const uniswapEthUsdGReferenceV196 =
    sameBatchWethUsdGReferencePrecheckV194
      ?.verified === true
      ? {
          attempted: false,
          configured:
            Boolean(
              String(
                env.UNISWAP_API_KEY ||
                ""
              ).trim()
            ),
          verified: false,
          status:
            "SKIPPED_SAME_BATCH_REFERENCE_ALREADY_VERIFIED",
          source:
            "UNISWAP_AGGREGATED_NATIVE_ETH_TO_CANONICAL_USDG_QUOTE_V196",
          priceUsdGPerWeth: null,
          externalRequestsUsed: 0
        }
      : await getUniswapEthUsdGReferenceV196(
          env,
          budget
        );

  const v3WethUsdGReferenceV195 =
    (
      sameBatchWethUsdGReferencePrecheckV194
        ?.verified === true ||
      uniswapEthUsdGReferenceV196
        ?.verified === true
    )
      ? {
          attempted: false,
          configured:
            Boolean(
              normalize(
                UNISWAP_V3_FACTORY_V195
              )
            ),
          verified: false,
          status:
            "SKIPPED_VERIFIED_REFERENCE_ALREADY_AVAILABLE",
          source:
            "UNISWAP_V3_CANONICAL_WETH_USDG_SLOT0_V195",
          priceUsdGPerWeth: null,
          externalRequestsUsed: 0
        }
      : await getV3WethUsdGReferenceV195(
          env,
          state,
          budget
        );

  const bitqueryWethUsdGReferenceV194 =
    (
      sameBatchWethUsdGReferencePrecheckV194
        ?.verified === true ||
      uniswapEthUsdGReferenceV196
        ?.verified === true ||
      v3WethUsdGReferenceV195
        ?.verified === true
    )
      ? {
          attempted: false,
          configured:
            Boolean(
              String(
                env.BITQUERY_ACCESS_TOKEN ||
                ""
              ).trim()
            ),
          poolIdsKnown:
            canonicalWethUsdGPoolIdsV194(
              state
            ).length,
          selectedPoolId: null,
          status:
            "SKIPPED_VERIFIED_REFERENCE_ALREADY_AVAILABLE",
          httpStatus: null,
          verified: false,
          source:
            "BITQUERY_CANONICAL_WETH_USDG_LATEST_SWAP_V194",
          priceUsdGPerWeth: null,
          blockNumber: null,
          transactionHash: null,
          externalRequestsUsed: 0,
          error: null
        }
      : await getBitqueryWethUsdGReferenceV194(
          env,
          state,
          budget
        );

  const onChainDirectionalV179 =
    collectOnChainDirectionalSwapsV179(
      state,
      liveOutput.logs,
      bitqueryWethUsdGReferenceV194,
      v3WethUsdGReferenceV195,
      uniswapEthUsdGReferenceV196
    );

  onChainDirectionalV179
    .bitqueryWethUsdGReferenceV194 =
      bitqueryWethUsdGReferenceV194;

  onChainDirectionalV179
    .v3WethUsdGReferenceV195 =
      v3WethUsdGReferenceV195;

  onChainDirectionalV179
    .uniswapEthUsdGReferenceV196 =
      uniswapEthUsdGReferenceV196;

  onChainDirectionalV179
    .resolvedPoolReplayDiagnosticV198 =
      resolvedPoolReplayDiagnosticV198(
        state,
        liveOutput.logs,
        unknownPoolResolution,
        onChainDirectionalV179
      );

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

  /*
   * V166:
   * A carried candidate waiting on an active V149 partial-holder retry must not
   * monopolize the scarce fresh-market slot. Preserve the carried retry itself,
   * but allow a strictly better viable market-unverified challenger to own the
   * slot even when its score lead is below the ordinary V139 +20 threshold.
   */
  const partialHolderRetryBlockerV166 =
    pendingCompletionToken
      ? activePartialHolderRetryBlockerV166(
          pendingCompletionToken
        )
      : null;

  const partialHolderFreshSlotChallengerRowV166 =
    pendingCompletionToken &&
    partialHolderRetryBlockerV166 &&
    !retryFairnessOverrideV139
      ? rankedMarketFreshCandidates.find(
          row => {
            const item =
              row?.token ||
              null;

            const address =
              normalize(
                item?.address
              );

            if (
              !item ||
              !address ||
              address ===
                pendingCompletionAddress ||
              safeNumber(
                row?.score
              ) <=
                safeNumber(
                  pendingCompletionPriorityScore
                ) ||
              terminalPriorityRejectFromWatched(
                item
              )?.terminal === true ||
              !preMarketCandidateAllowed(
                item
              ) ||
              freshUsableVerifiedMarketCacheV159(
                item
              )
            ) {
              return false;
            }

            return true;
          }
        ) ||
        null
      : null;

  const partialHolderFreshSlotReleaseTriggeredV166 =
    Boolean(
      partialHolderRetryBlockerV166 &&
      partialHolderFreshSlotChallengerRowV166
    );

  let partialHolderRetryFreshSlotReleaseV166 = {
    enabled: true,
    triggered:
      partialHolderFreshSlotReleaseTriggeredV166,
    carriedAddress:
      pendingCompletionAddress ||
      null,
    carriedSymbol:
      pendingCompletionToken
        ?.metadata?.symbol ||
      pendingCompletionToken
        ?.symbol ||
      null,
    carriedScore:
      pendingCompletionPriorityScore ??
      null,
    activePartialHolderBlocker:
      partialHolderRetryBlockerV166,
    normalV139OverrideTriggered:
      retryFairnessOverrideV139,
    normalV139MinimumLead:
      RETRY_FAIRNESS_MIN_SCORE_LEAD_V139,
    challengerAddress:
      normalize(
        partialHolderFreshSlotChallengerRowV166
          ?.token
          ?.address
      ) ||
      null,
    challengerSymbol:
      partialHolderFreshSlotChallengerRowV166
        ?.token
        ?.metadata
        ?.symbol ||
      partialHolderFreshSlotChallengerRowV166
        ?.token
        ?.symbol ||
      null,
    challengerScore:
      partialHolderFreshSlotChallengerRowV166
        ?.score ??
      null,
    carriedRetryPreserved:
      Boolean(
        partialHolderFreshSlotReleaseTriggeredV166
      ),
    carriedAnalysisPreserved:
      Boolean(
        partialHolderFreshSlotReleaseTriggeredV166
      ),
    noExtraNormalRequests: true,
    telegramThresholdsUnchanged: true
  };

  let marketFreshTarget =
    retryFairnessOverrideV139
      ? retryFairnessChallengerRow
          ?.token ||
        null
      : partialHolderFreshSlotReleaseTriggeredV166
        ? partialHolderFreshSlotChallengerRowV166
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
    retryFairnessOverrideV139 ||
    partialHolderFreshSlotReleaseTriggeredV166
      ? pendingCompletionAddress
      : marketFreshTargetAddress;

  const retryPersistenceTokenV139 =
    retryFairnessOverrideV139 ||
    partialHolderFreshSlotReleaseTriggeredV166
      ? pendingCompletionToken
      : marketFreshTarget;

  /*
   * V159:
   * Keep completion of unresolved holder/risk evidence separate from ownership
   * of the scarce fresh-market slot. If a carried retry already has a fresh,
   * usable VERIFIED market cache, keep it first in analysis but hand only the
   * fresh market reservation to the next viable market-unverified candidate.
   */
  const carriedAnalysisTargetV159 =
    pendingCompletionToken &&
    !retryFairnessOverrideV139
      ? pendingCompletionToken
      : null;

  const carriedAnalysisAddressV159 =
    normalize(
      carriedAnalysisTargetV159
        ?.address
    );

  const carriedFreshUsableMarketV159 =
    Boolean(
      carriedAnalysisTargetV159 &&
      carriedAnalysisAddressV159 &&
      carriedAnalysisAddressV159 ===
        pendingCompletionAddress &&
      freshUsableVerifiedMarketCacheV159(
        carriedAnalysisTargetV159
      )
    );

  let freshMarketSlotHandoffV159 = {
    enabled: true,
    triggered: false,
    carriedAddress:
      carriedAnalysisAddressV159 ||
      null,
    carriedSymbol:
      carriedAnalysisTargetV159
        ?.metadata?.symbol ||
      carriedAnalysisTargetV159
        ?.symbol ||
      null,
    carriedFreshVerifiedMarket:
      carriedFreshUsableMarketV159,
    carriedMarketCacheAgeMs:
      carriedFreshUsableMarketV159
        ? Math.max(
            0,
            Date.now() -
              safeNumber(
                carriedAnalysisTargetV159
                  ?.marketCache
                  ?.timestamp
              )
          )
        : null,
    releasedFreshReservation: false,
    replacementAddress: null,
    replacementSymbol: null,
    replacementScore: null,
    carriedRemainsAnalysisPriority: false,
    carriedRetainsHolderRetryPriority: false,
    noExtraNormalRequests: true
  };

  if (
    carriedFreshUsableMarketV159 &&
    !partialHolderFreshSlotReleaseTriggeredV166
  ) {
    const replacementRowV159 =
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
              itemAddress ===
                carriedAnalysisAddressV159 ||
              terminalPriorityRejectFromWatched(
                item
              )?.terminal === true ||
              !preMarketCandidateAllowed(
                item
              )
            ) {
              return false;
            }

            return (
              !freshUsableVerifiedMarketCacheV159(
                item
              )
            );
          }
        ) ||
      null;

    if (
      replacementRowV159?.token
    ) {
      clearPriorityFreshReservation(
        state,
        carriedAnalysisAddressV159
      );

      marketFreshTarget =
        replacementRowV159.token;

      marketFreshTargetAddress =
        normalize(
          marketFreshTarget?.address
        );

      if (
        marketFreshTargetAddress
      ) {
        reservePriorityFreshMarket(
          state,
          marketFreshTargetAddress
        );
      }

      freshMarketSlotHandoffV159 = {
        ...freshMarketSlotHandoffV159,
        triggered: true,
        releasedFreshReservation: true,
        replacementAddress:
          marketFreshTargetAddress ||
          null,
        replacementSymbol:
          marketFreshTarget
            ?.metadata?.symbol ||
          marketFreshTarget
            ?.symbol ||
          null,
        replacementScore:
          safeNumber(
            replacementRowV159.score
          ),
        carriedRemainsAnalysisPriority:
          true,
        carriedRetainsHolderRetryPriority:
          true
      };
    }
  }

  /*
   * V176:
   * Persist unresolved directional-USD completion across scans. This changes
   * analysis ordering only; it creates no extra request and bypasses no
   * provider/rate-limit guard.
   */
  const pendingDirectionalUsdAddressV176 =
    normalize(state?.directionalUsdPriorityV176?.address);

  const pendingDirectionalUsdTokenV176 =
    pendingDirectionalUsdAddressV176
      ? (
          state.watchedTokens.find(
            token =>
              normalize(token?.address) === pendingDirectionalUsdAddressV176
          ) || null
        )
      : null;

  /*
   * V133:
   * The fresh-market / priority-completion target is the candidate the bot
   * has already decided is most important to finish. Analyse it before lower
   * priority candidates so they cannot consume its required budget first.
   */
  /*
   * V179 preserves V178 queue ordering unchanged.
   * V178:
   * V176 persistence must not outrank protected candidate completion.
   * Order is now:
   *   1) carried retry completion when V159/V166 explicitly preserves it,
   *   2) current fresh-market / completion target,
   *   3) unresolved V176 directional-USD target,
   *   4) remaining selected candidates.
   * This is ordering-only: no new request class, no higher request limit,
   * and no provider cadence or Telegram-threshold change.
   */
  const protectedCarriedAnalysisTargetV178 =
    (
      (
        freshMarketSlotHandoffV159
          .triggered ||
        partialHolderFreshSlotReleaseTriggeredV166
      ) &&
      carriedAnalysisTargetV159
    )
      ? carriedAnalysisTargetV159
      : null;

  const analysisSelectedRawV142 =
    marketFreshTarget ||
    protectedCarriedAnalysisTargetV178 ||
    pendingDirectionalUsdTokenV176
      ? uniqueBy(
          [
            ...(
              protectedCarriedAnalysisTargetV178
                ? [protectedCarriedAnalysisTargetV178]
                : []
            ),
            ...(
              marketFreshTarget
                ? [marketFreshTarget]
                : []
            ),
            ...(
              pendingDirectionalUsdTokenV176
                ? [pendingDirectionalUsdTokenV176]
                : []
            ),
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

    matureZeroActivityPriorityReleaseV172:
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

  /*
   * V175: opportunistically secure the existing single Gecko directional-trade
   * request for the first strong viable candidate before lower-priority analysis
   * can consume the remaining analysis budget. This does not add a new request
   * class or raise any request limit.
   */
  let earlyDirectionalTradeEnrichmentV175 = {
    enabled: true,
    selectedAddress: null,
    symbol: null,
    eligible: false,
    attempted: false,
    verifiedAnyWindow: false,
    status: "NO_EARLY_DIRECTIONAL_TARGET",
    opportunityMinimum: 60,
    confidenceMinimum: 55,
    oneGeckoFreshPerScanPreserved: true,
    strictUsdVerificationPreserved: true,
    noExternalRequestRateIncrease: true
  };

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

  /* V165: bounded residual-budget protection for verified same-run terminal handoffs. */
  const V165_MIN_BOUNDED_REPLACEMENT_REQUESTS = 3;

  const v165ProtectedReplacementAddresses =
    new Set();

  const terminalReplacementBudgetRecoveryV165 = {
    enabled: true,
    minimumBoundedRequests: V165_MIN_BOUNDED_REPLACEMENT_REQUESTS,
    protectedAddresses: [],
    handoffChainCount: 0,
    boundedAttempts: 0,
    candidates: [],
    hardRequestLimitUnchanged: true,
    analysisPhaseLimitUnchanged: true,
    perRequestBudgetChecksAuthoritative: true,
    noExternalRequestRateIncrease: true,
    telegramThresholdsUnchanged: true
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

          v165ProtectedReplacementAddresses.add(
            replacementAddressV148
          );

          if (
            !terminalReplacementBudgetRecoveryV165
              .protectedAddresses
              .includes(replacementAddressV148)
          ) {
            terminalReplacementBudgetRecoveryV165
              .protectedAddresses
              .push(replacementAddressV148);
          }

          terminalReplacementBudgetRecoveryV165
            .handoffChainCount++;

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

    const v165AnalysisRemaining = Math.max(
      0,
      safeNumber(budget?.analysis?.limit) -
        safeNumber(budget?.analysis?.used)
    );

    const v165TotalRemaining = Math.max(
      0,
      safeNumber(budget?.totalLimit) -
        safeNumber(budget?.totalUsed)
    );

    const v165ResidualAllowance = Math.min(
      v165AnalysisRemaining,
      v165TotalRemaining
    );

    const v165ProtectedReplacement =
      v165ProtectedReplacementAddresses.has(address);

    const v165FullEstimateAffordable =
      budgetAvailable(
        budget,
        "analysis",
        required
      );

    const v165BoundedReplacementAttempt =
      !v165FullEstimateAffordable &&
      v165ProtectedReplacement &&
      v165ResidualAllowance >=
        V165_MIN_BOUNDED_REPLACEMENT_REQUESTS;

    if (
      !v165FullEstimateAffordable &&
      !v165BoundedReplacementAttempt
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
          required,

        terminalReplacementBudgetRecoveryV165:
          v165ProtectedReplacement
            ? {
                protected: true,
                boundedAttemptEligible: false,
                residualAllowance: v165ResidualAllowance,
                minimumBoundedRequests:
                  V165_MIN_BOUNDED_REPLACEMENT_REQUESTS
              }
            : null
      });

      continue;
    }

    const v165BudgetUsedBeforeCandidate =
      safeNumber(budget?.analysis?.used);

    if (
      v165BoundedReplacementAttempt
    ) {
      terminalReplacementBudgetRecoveryV165
        .boundedAttempts++;

      terminalReplacementBudgetRecoveryV165
        .candidates
        .push({
          address,
          symbol:
            watched?.metadata?.symbol ||
            watched?.symbol ||
            null,
          estimatedRequests: required,
          residualAllowanceBefore:
            v165ResidualAllowance,
          boundedAttempt: true,
          actualAnalysisRequestsUsed: null,
          candidateReturned: false,
          analysisDeferred: null
        });
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

          marketPriority:
            isPriorityCompletion,

          holderPriorityCompletion:
            freshMarketSlotHandoffV159
              .triggered
              ? address ===
                retryPersistenceAddressV139
              : isPriorityCompletion,

          liveMomentumActivityV152
        }
      );

    if (
      v165BoundedReplacementAttempt
    ) {
      const v165TelemetryRow =
        terminalReplacementBudgetRecoveryV165
          .candidates
          .find(
            row =>
              row.address === address &&
              row.actualAnalysisRequestsUsed === null
          ) || null;

      if (
        v165TelemetryRow
      ) {
        v165TelemetryRow.actualAnalysisRequestsUsed =
          Math.max(
            0,
            safeNumber(budget?.analysis?.used) -
              v165BudgetUsedBeforeCandidate
          );

        v165TelemetryRow.candidateReturned =
          Boolean(candidate);

        v165TelemetryRow.analysisDeferred =
          Boolean(candidate?.analysisDeferred);
      }
    }

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

    /* =====================================================
       V175 EARLY VERIFIED DIRECTIONAL USD PRIORITY
       ===================================================== */
    if (
      !earlyDirectionalTradeEnrichmentV175.selectedAddress &&
      candidate?.validERC20 === true &&
      candidate?.risk?.severeOverride !== true &&
      String(candidate?.risk?.label || "").toUpperCase() !== "HIGH" &&
      (
        candidate?.market?.verified === true ||
        candidate?.onChainPoolIdentityV153?.verified === true
      ) &&
      safeNumber(candidate?.opportunity?.score) >= 60 &&
      safeNumber(candidate?.confidence?.score) >= 55
    ) {
      earlyDirectionalTradeEnrichmentV175 = {
        ...earlyDirectionalTradeEnrichmentV175,
        selectedAddress: normalize(candidate.address),
        symbol: candidate.symbol || null,
        eligible: true,
        status: "SELECTED_BEFORE_LOWER_PRIORITY_ANALYSIS"
      };

      const earlyEnrichmentV175 =
        await geckoDirectionalTradeFlow(
          candidate,
          budget,
          state
        );

      applyDirectionalTradeFlow(
        candidate,
        earlyEnrichmentV175
      );

      if (
        earlyEnrichmentV175?.verifiedAnyWindow === true
      ) {
        const historicalV175 =
          getHistoricalSnapshot(
            state,
            candidate.address
          );

        candidate.momentum =
          momentumAnalysis(
            historicalV175,
            candidate.market,
            candidate.holders,
            candidate.liveMomentumActivityV152
          );

        candidate.opportunity =
          scoreOpportunity(
            candidate.validation,
            candidate.market,
            candidate.holders,
            candidate.activity,
            candidate.momentum,
            candidate.marketQuality,
            candidate.whaleFlow,
            candidate.launchStage
          );

        candidate.signalConfirmation =
          signalConfirmation(candidate);

        candidate.confidence =
          candidateConfidence(candidate);

        evidenceQualityProtectionV158(candidate);

        candidate.analysisPriority =
          analysisPriority(candidate);
      }

      earlyDirectionalTradeEnrichmentV175 = {
        ...earlyDirectionalTradeEnrichmentV175,
        attempted: Boolean(earlyEnrichmentV175?.attempted),
        verifiedAnyWindow: Boolean(earlyEnrichmentV175?.verifiedAnyWindow),
        status: earlyEnrichmentV175?.status || "UNKNOWN",
        source: earlyEnrichmentV175?.source || null,
        poolAddress: earlyEnrichmentV175?.poolAddress || null,
        targetTokenSide: earlyEnrichmentV175?.targetTokenSide || null,
        returnedCount: earlyEnrichmentV175?.returnedCount ?? null,
        windows: earlyEnrichmentV175?.windows || null,
        rollingLedger: earlyEnrichmentV175?.rollingLedger || null,
        candidateQualifiesAfterEnrichment: qualifiesTelegram(candidate)
      };

      /* V176 persistent directional-USD completion lane. */
      if (earlyEnrichmentV175?.verifiedAnyWindow === true) {
        if (
          normalize(state?.directionalUsdPriorityV176?.address) ===
            normalize(candidate.address)
        ) {
          state.directionalUsdPriorityV176 = null;
        }
      } else {
        const sameDirectionalTargetV176 =
          normalize(state?.directionalUsdPriorityV176?.address) ===
            normalize(candidate.address);

        state.directionalUsdPriorityV176 = {
          address: normalize(candidate.address),
          symbol: candidate.symbol || null,
          firstQueuedAt:
            sameDirectionalTargetV176
              ? (
                  safeNumber(state?.directionalUsdPriorityV176?.firstQueuedAt) ||
                  Date.now()
                )
              : Date.now(),
          lastQueuedAt: Date.now(),
          lastStatus: earlyEnrichmentV175?.status || "UNVERIFIED",
          attempts:
            (sameDirectionalTargetV176
              ? safeNumber(state?.directionalUsdPriorityV176?.attempts)
              : 0) +
            (earlyEnrichmentV175?.attempted === true ? 1 : 0),
          verifiedAnyWindow: false,
          strictUsdVerificationPreserved: true
        };
      }
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

        v165ProtectedReplacementAddresses.add(
          replacementAddress
        );

        if (
          !terminalReplacementBudgetRecoveryV165
            .protectedAddresses
            .includes(replacementAddress)
        ) {
          terminalReplacementBudgetRecoveryV165
            .protectedAddresses
            .push(replacementAddress);
        }

        terminalReplacementBudgetRecoveryV165
          .handoffChainCount++;

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
    const completionWatched =
      state.watchedTokens?.find(
        watched =>
          normalize(watched?.address) ===
          normalize(completionCandidate?.address)
      ) ||
      null;

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

    const matureZeroActivityReleaseV173 =
      matureZeroActivityPriorityReleaseV172(
        completionCandidate,
        completionWatched
      );

    const keepForRetry =
      !terminalReject.terminal &&
      shouldKeepCompletionCandidate(
        completionCandidate,
        state.priorityCandidateCompletion,
        completionWatched
      );

    priorityCompletionTelemetry
      .relevanceExpiryV140 =
      relevanceExpiryV140;

    priorityCompletionTelemetry
      .matureZeroActivityPriorityReleaseV172 =
      matureZeroActivityReleaseV173;

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

    else if (
      matureZeroActivityReleaseV173.release
    ) {
      priorityCompletionTelemetry.blockers = [
        matureZeroActivityReleaseV173.reason
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
   * V161:
   * Synchronize the scarce fresh-market reservation after same-run terminal
   * handoff/reselection. The carried completion candidate may remain the
   * holder/risk analysis priority, but no terminal/superseded candidate may
   * remain in fresh-market reservation state or telemetry.
   */
  const freshMarketReservationBeforeV161 =
    normalize(
      dexService(state)
        ?.priorityFreshReservation
        ?.address
    );

  if (
    effectiveMarketFreshTargetAddress
  ) {
    reservePriorityFreshMarket(
      state,
      effectiveMarketFreshTargetAddress
    );
  } else {
    clearPriorityFreshReservation(
      state,
      null
    );
  }

  const freshMarketReservationAfterV161 =
    normalize(
      dexService(state)
        ?.priorityFreshReservation
        ?.address
    );

  const finalPriorityFreshScheduleV161 =
    priorityFreshSchedule(
      state,
      effectiveMarketFreshTargetAddress
    );

  priorityCompletionTelemetry
    .priorityFreshSchedule =
      finalPriorityFreshScheduleV161;

  const freshMarketReservationSyncV161 = {
    enabled: true,
    synchronized:
      freshMarketReservationAfterV161 ===
        normalize(
          effectiveMarketFreshTargetAddress
        ),
    beforeAddress:
      freshMarketReservationBeforeV161 ||
      null,
    finalAddress:
      effectiveMarketFreshTargetAddress ||
      null,
    afterAddress:
      freshMarketReservationAfterV161 ||
      null,
    staleReservationCleared:
      Boolean(
        freshMarketReservationBeforeV161 &&
        freshMarketReservationBeforeV161 !==
          freshMarketReservationAfterV161
      ),
    terminalAddressesExcluded:
      [...sameRunTerminalAddresses]
        .filter(Boolean)
        .slice(0, 10),
    carriedCompletionAddress:
      retryPersistenceAddressV139 ||
      null,
    carriedCompletionPreserved:
      Boolean(
        retryPersistenceAddressV139 &&
        normalize(
          state
            ?.priorityCandidateCompletion
            ?.address
        ) ===
          retryPersistenceAddressV139
      ),
    noExtraExternalRequests: true,
    telegramThresholdsUnchanged: true
  };

  /*
   * V180:
   * Before spending the remaining directional slot on Gecko, try one exact,
   * timestamped Blockscout history request for the highest-priority candidate
   * whose verified V4 quote is canonical USDG. This is the first path capable
   * of producing directly summed USD-denominated buy/sell amounts without
   * inferring them from transaction counts or total volume.
   */
  const v180UsdGDirectionalTarget =
    candidates
      .filter(
        candidate =>
          candidate?.validERC20 === true &&
          v180PoolIdentityMatchesCandidate(
            candidate
          ) &&
          candidate?.risk?.severeOverride !== true &&
          candidate?.risk?.label !== "HIGH" &&
          !sameRunTerminalAddresses.has(
            normalize(
              candidate?.address
            )
          )
      )
      .sort(
        (a, b) =>
          safeNumber(
            b?.analysisPriority
          ) -
          safeNumber(
            a?.analysisPriority
          )
      )[0] ||
    null;

  let blockscoutDirectionalUsdV180 = {
    enabled: true,
    attempted: false,
    verifiedAnyWindow: false,
    status:
      v180UsdGDirectionalTarget
        ? "PENDING"
        : "NO_ELIGIBLE_V4_USDG_CANDIDATE",
    address:
      normalize(
        v180UsdGDirectionalTarget
          ?.address
      ) ||
      null,
    symbol:
      v180UsdGDirectionalTarget
        ?.symbol ||
      null
  };

  if (
    !v180UsdGDirectionalTarget &&
    budget.analysis
      ?.blockscoutUsdGReserveV182
      ?.active ===
      true
  ) {
    budget.analysis
      .blockscoutUsdGReserveV182
      .active =
        false;

    budget.analysis
      .blockscoutUsdGReserveV182
      .releasedWithoutUse =
        true;

    budget.analysis
      .blockscoutUsdGReserveV182
      .releasedAt =
        Date.now();
  }

  if (
    v180UsdGDirectionalTarget
  ) {
    const v180Result =
      await blockscoutV4UsdGDirectionalV180(
        v180UsdGDirectionalTarget,
        budget,
        state,
        latestNumber
      );

    if (
      v180Result?.attempted !== true &&
      v180Result?.status ===
        "BLOCKSCOUT_DIRECTIONAL_429_COOLDOWN_V183"
    ) {
      releaseBlockscoutUsdGReserveV182ForV183(
        budget,
        "BLOCKSCOUT_DIRECTIONAL_429_COOLDOWN_V183"
      );
    }

    blockscoutDirectionalUsdV180 = {
      address:
        normalize(
          v180UsdGDirectionalTarget
            ?.address
        ),
      symbol:
        v180UsdGDirectionalTarget
          ?.symbol ||
        null,
      ...v180Result,
      requestReservationV182: {
        enabled:
          true,
        consumed:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.consumed ===
          true,
        active:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.active ===
          true,
        requestType:
          "BLOCKSCOUT_V4_USDG_DIRECTIONAL_V180",
        releasedWithoutUse:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.releasedWithoutUse === true,
        releaseReasonV183:
          budget.analysis
            ?.blockscoutUsdGReserveV182
            ?.releaseReasonV183 || null,
        hardRequestLimitUnchanged:
          MAX_EXTERNAL_REQUESTS,
        analysisRequestLimitUnchanged:
          ANALYSIS_REQUEST_LIMIT
      }
    };

    if (
      v180Result
        ?.verifiedAnyWindow === true
    ) {
      applyDirectionalTradeFlow(
        v180UsdGDirectionalTarget,
        v180Result
      );

      const historicalV180 =
        getHistoricalSnapshot(
          state,
          v180UsdGDirectionalTarget
            .address
        );

      v180UsdGDirectionalTarget.momentum =
        momentumAnalysis(
          historicalV180,
          v180UsdGDirectionalTarget.market,
          v180UsdGDirectionalTarget.holders,
          v180UsdGDirectionalTarget
            .liveMomentumActivityV152
        );

      v180UsdGDirectionalTarget.opportunity =
        scoreOpportunity(
          v180UsdGDirectionalTarget.validation,
          v180UsdGDirectionalTarget.market,
          v180UsdGDirectionalTarget.holders,
          v180UsdGDirectionalTarget.activity,
          v180UsdGDirectionalTarget.momentum,
          v180UsdGDirectionalTarget.marketQuality,
          v180UsdGDirectionalTarget.whaleFlow,
          v180UsdGDirectionalTarget.launchStage
        );

      v180UsdGDirectionalTarget.signalConfirmation =
        signalConfirmation(
          v180UsdGDirectionalTarget
        );

      v180UsdGDirectionalTarget.confidence =
        candidateConfidence(
          v180UsdGDirectionalTarget
        );

      evidenceQualityProtectionV158(
        v180UsdGDirectionalTarget
      );

      v180UsdGDirectionalTarget.analysisPriority =
        analysisPriority(
          v180UsdGDirectionalTarget
        );
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
    earlyDirectionalTradeEnrichmentV175.selectedAddress
  ) {
    directionalTradeEnrichment = {
      address: earlyDirectionalTradeEnrichmentV175.selectedAddress,
      symbol: earlyDirectionalTradeEnrichmentV175.symbol,
      selectionMode: "V175_EARLY_STRONG_VIABLE_CANDIDATE",
      preQualification: true,
      candidateWasQualifiedBeforeEnrichment: null,
      candidateQualifiesAfterEnrichment:
        earlyDirectionalTradeEnrichmentV175.candidateQualifiesAfterEnrichment === true,
      attempted: earlyDirectionalTradeEnrichmentV175.attempted,
      verifiedAnyWindow: earlyDirectionalTradeEnrichmentV175.verifiedAnyWindow,
      status: earlyDirectionalTradeEnrichmentV175.status,
      source: earlyDirectionalTradeEnrichmentV175.source || null,
      poolAddress: earlyDirectionalTradeEnrichmentV175.poolAddress || null,
      targetTokenSide: earlyDirectionalTradeEnrichmentV175.targetTokenSide || null,
      returnedCount: earlyDirectionalTradeEnrichmentV175.returnedCount ?? null,
      rollingLedger: earlyDirectionalTradeEnrichmentV175.rollingLedger || null,
      windows: earlyDirectionalTradeEnrichmentV175.windows || null
    };
  }

  else if (
    directionalTarget
  ) {
    const sameAsV180Target =
      normalize(
        directionalTarget?.address
      ) ===
        normalize(
          blockscoutDirectionalUsdV180
            ?.address
        );

    const v180AlreadyVerified =
      sameAsV180Target &&
      blockscoutDirectionalUsdV180
        ?.verifiedAnyWindow === true;

    const enrichment =
      v180AlreadyVerified
        ? {
            attempted: false,
            verifiedAnyWindow: true,
            status:
              "V180_ONCHAIN_USDG_ALREADY_VERIFIED",
            source:
              "BLOCKSCOUT_V4_SWAP_USDG_V180",
            windows:
              blockscoutDirectionalUsdV180
                ?.windows ||
              {}
          }
        : await geckoDirectionalTradeFlow(
            directionalTarget,
            budget,
            state
          );

    if (
      enrichment?.status !==
        "V180_ONCHAIN_USDG_ALREADY_VERIFIED"
    ) {
      applyDirectionalTradeFlow(
        directionalTarget,
        enrichment
      );
    }

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

      evidenceQualityProtectionV158(
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

  /*
   * V212: zero-request candidate-specific bridge.
   * This is intentionally applied after all discovery/enrichment so Telegram
   * sees the freshest already-verified V179 records from this scan.
   */
  const telegramVerifiedOnChainUsdV212 = [];

  for (const candidate of candidates) {
    const verifiedFlowV212 =
      applyCandidateVerifiedOnChainFlowV212(
        candidate,
        state
      );

    candidate.ponsCurveFlowV216 =
      candidateVerifiedPonsCurveFlowV216(
        candidate,
        state
      );

    /*
     * V218: the main candidate was originally scored before V216 attached
     * Pons curve data. Recompute only when verified Pons evidence exists,
     * then refresh the downstream score/confidence gates from the same
     * existing functions.
     */
    if (
      candidate
        ?.ponsCurveFlowV216
        ?.verified === true
    ) {
      const historicalV218 =
        getHistoricalSnapshot(
          state,
          candidate.address
        );

      candidate.momentum =
        momentumAnalysis(
          historicalV218,
          candidate.market,
          candidate.holders,
          candidate.liveMomentumActivityV152,
          candidate.ponsCurveFlowV216
        );

      candidate.opportunity =
        scoreOpportunity(
          candidate.validation,
          candidate.market,
          candidate.holders,
          candidate.activity,
          candidate.momentum,
          candidate.marketQuality,
          candidate.whaleFlow,
          candidate.launchStage
        );

      candidate.signalConfirmation =
        signalConfirmation(
          candidate
        );

      candidate.confidence =
        candidateConfidence(
          candidate
        );

      evidenceQualityProtectionV158(
        candidate
      );

      candidate.analysisPriority =
        analysisPriority(
          candidate
        );

      candidate.momentumPonsRecomputedV218 = {
        applied: true,
        source:
          "VERIFIED_PONS_CURVE_FLOW_V216",
        score:
          safeNumber(
            candidate?.momentum?.score
          ),
        label:
          candidate?.momentum?.label ||
          null,
        ponsEvidence:
          candidate
            ?.momentum
            ?.ponsCurveMomentumV218 ||
          null
      };


      candidate.ponsScoreIntegrationV219 = {
        enabled: true,
        opportunityDoubleCountProtection:
          "NO_DIRECT_PONS_OPPORTUNITY_BONUS",
        confirmation:
          candidate?.signalConfirmation
            ?.ponsConfirmationV219 ||
          ponsConfirmationQualityV219(
            candidate
          ),
        momentumScore:
          safeNumber(
            candidate?.momentum?.score
          ),
        opportunityScore:
          safeNumber(
            candidate?.opportunity?.score
          ),
        signalScore:
          safeNumber(
            candidate?.signalConfirmation?.score
          ),
        signalCount:
          safeNumber(
            candidate?.signalConfirmation?.signals
          ),
        confidenceScore:
          safeNumber(
            candidate?.confidence?.score
          ),
        evidenceQuality:
          candidate?.evidenceQualityProtectionV158 ||
          null
      };
    } else {
      candidate.momentumPonsRecomputedV218 = {
        applied: false,
        source:
          "NO_VERIFIED_PONS_CURVE_FLOW",
        score:
          safeNumber(
            candidate?.momentum?.score
          ),
        label:
          candidate?.momentum?.label ||
          null
      };


      candidate.ponsScoreIntegrationV219 = {
        enabled: true,
        opportunityDoubleCountProtection:
          "NO_DIRECT_PONS_OPPORTUNITY_BONUS",
        confirmation:
          ponsConfirmationQualityV219(
            candidate
          ),
        status:
          "NO_VERIFIED_PONS_CURVE_FLOW"
      };
    }

    candidate.telegramVerifiedUsdDiagnosticV213 =
      telegramVerifiedUsdDiagnosticV213(
        candidate
      );

    if (verifiedFlowV212?.verified === true) {
      telegramVerifiedOnChainUsdV212.push({
        address:
          normalize(candidate?.address),
        symbol:
          candidate?.symbol || null,
        recordCount:
          verifiedFlowV212.recordCount,
        poolIds:
          verifiedFlowV212.poolIds,
        windows:
          verifiedFlowV212.windows,
        telegramDiagnosticV213:
          candidate.telegramVerifiedUsdDiagnosticV213
      });
    }
  }

  const telegramVerifiedUsdObservabilityV213 =
    candidates.map(
      candidate =>
        candidate?.telegramVerifiedUsdDiagnosticV213 ||
        telegramVerifiedUsdDiagnosticV213(
          candidate
        )
    );

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

  /*
   * V174:
   * Telegram evaluation/sending is now finished. Any notification capacity
   * that was not actually used may safely rejoin the global pool before the
   * existing V170 post-analysis backlog reclaim runs.
   */
  const notificationReserveReleaseV174 =
    releaseNotificationReserveV174(
      budget
    );

  /*
   * =======================================================
   * V170 POST-ANALYSIS RESIDUAL BACKLOG CATCH-UP
   * =======================================================
   * Candidate analysis and Telegram notification work are complete.
   * Reclaim only unused discovery capacity.
   */
  const postAnalysisBacklogReclaimV170 =
    activatePostAnalysisBacklogReclaimV170(
      budget
    );

  let postAnalysisBacklogResultV170 =
    null;

  let postAnalysisBacklogDiscoveryV170 = {
    rawLogs: 0,
    initializeEvents: 0,
    swapTopicMatches: 0,
    liquidityTopicMatches: 0,
    newTokens: new Set(),
    seenTokens: new Set()
  };

  const postAnalysisBacklogStartV170 =
    state.lastScannedBlock !==
      null &&
    state.lastScannedBlock !==
      undefined
      ? BigInt(
          safeNumber(
            state.lastScannedBlock
          ) + 1
        )
      : backlogFrom;

  if (
    postAnalysisBacklogReclaimV170
      .activated &&
    postAnalysisBacklogStartV170 !==
      null &&
    postAnalysisBacklogStartV170 <=
      backlogTargetBlock &&
    budgetAvailable(
      budget,
      "discovery-backlog"
    )
  ) {
    const residualOutputV170 = {
      logs: [],
      ranges: []
    };

    postAnalysisBacklogResultV170 =
      await scanBacklogSequential(
        env,
        state,
        postAnalysisBacklogStartV170,
        backlogTargetBlock,
        budget,
        residualOutputV170
      );

    if (
      residualOutputV170.logs.length
    ) {
      backlogOutput.logs.push(
        ...residualOutputV170.logs
      );

      backlogOutput.ranges.push(
        ...residualOutputV170.ranges
      );

      postAnalysisBacklogDiscoveryV170 =
        processDiscoveryLogs(
          state,
          residualOutputV170.logs,
          "BACKLOG"
        );

      for (
        const token
        of postAnalysisBacklogDiscoveryV170
          .newTokens
      ) {
        newTokens.add(
          token
        );
      }
    }

    if (
      postAnalysisBacklogResultV170
        ?.processedThrough !==
          null &&
      postAnalysisBacklogResultV170
        ?.processedThrough !==
          undefined
    ) {
      state.lastScannedBlock =
        Number(
          postAnalysisBacklogResultV170
            .processedThrough
        );
    }
  }

  postAnalysisBacklogReclaimV170
    .requestsUsed =
      Math.max(
        0,
        budget.discovery.backlogUsed -
          BACKLOG_DISCOVERY_REQUEST_LIMIT
      );

  postAnalysisBacklogReclaimV170
    .blocksAdvanced =
      postAnalysisBacklogResultV170
        ?.blocksProcessed ||
      0;

  postAnalysisBacklogReclaimV170
    .provider =
      postAnalysisBacklogResultV170
        ?.probeHistory
        ?.length
        ? postAnalysisBacklogResultV170
            .probeHistory[
              postAnalysisBacklogResultV170
                .probeHistory.length - 1
            ]
            ?.provider ||
          null
        : null;

  postAnalysisBacklogReclaimV170
    .alchemyFreeTierRangePreserved =
      getProviderBacklogSize(
        state,
        "ALCHEMY"
      ) <= 10;

  postAnalysisBacklogReclaimV170
    .noAnalysisCapacityBorrowed =
      true;

  postAnalysisBacklogReclaimV170
    .telegramCompletedBeforeReclaim =
      true;

  postAnalysisBacklogReclaimV170
    .notificationReserveReleasedV174 =
      notificationReserveReleaseV174;

  postAnalysisBacklogReclaimV170
    .notificationCapacityProtectedUntilTelegramV174 =
      true;

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

  /*
   * V228 next-scan holder-target handoff. Selection happens AFTER candidate
   * analysis, which is exactly the timing gap V227 could not bridge. Only a
   * viable non-Pons candidate still missing verified concentration is queued.
   * The address is consumed by the next scan's already-existing Bitquery call.
   */
  const bitqueryHolderTargetCandidatesV228 = candidates
    .filter(candidate => {
      const address = normalize(candidate?.address);
      if (!isAddress(address) || address === ZERO) return false;
      if (candidate?.validERC20 !== true) return false;
      if (candidate?.excludedReason) return false;
      if (candidate?.holders?.concentrationVerified === true &&
          candidate?.holders?.integrity?.verified === true) return false;
      if (terminalPriorityReject(candidate)?.terminal === true) return false;
      const watched = state.watchedTokens.find(row => normalize(row?.address) === address) || null;
      if (!watched) return false;
      if (watched?.launchpadV215?.verified === true) return false;
      return true;
    })
    .slice()
    .sort((a, b) => analysisPriority(b) - analysisPriority(a));

  const nextBitqueryHolderTargetV228 = bitqueryHolderTargetCandidatesV228[0] || null;

  if (nextBitqueryHolderTargetV228) {
    const nextAddressV228 = normalize(nextBitqueryHolderTargetV228.address);
    const matchingEvidenceFreshV228 =
      state.bitqueryHolderEvidenceV227?.verified === true &&
      normalize(state.bitqueryHolderEvidenceV227?.address) === nextAddressV228 &&
      safeNumber(state.bitqueryHolderEvidenceV227?.fetchedAt) > 0 &&
      Date.now() - safeNumber(state.bitqueryHolderEvidenceV227.fetchedAt) <=
        BITQUERY_HOLDER_EVIDENCE_MAX_AGE_MS_V227;

    state.bitqueryHolderTargetV228 = matchingEvidenceFreshV228
      ? {
          ...newState().bitqueryHolderTargetV228,
          status: "NOT_QUEUED_MATCHING_FRESH_EVIDENCE"
        }
      : {
          address: nextAddressV228,
          reason: "POST_ANALYSIS_MISSING_VERIFIED_HOLDER_CONCENTRATION",
          selectedAt: Date.now(),
          analysisPriority: analysisPriority(nextBitqueryHolderTargetV228),
          symbol: nextBitqueryHolderTargetV228?.symbol || null,
          sourceVersion: "V228",
          status: "QUEUED_FOR_NEXT_SHARED_BITQUERY_REQUEST"
        };
  } else if (!persistedBitqueryHolderTargetEligibleV228) {
    state.bitqueryHolderTargetV228 = {
      ...newState().bitqueryHolderTargetV228,
      status: "NO_ELIGIBLE_UNRESOLVED_HOLDER_TARGET"
    };
  }

  /*
   * V235 next-scan market-target handoff. Selection is intentionally separate
   * from holder completion. Prefer a viable analysed candidate that still has
   * no verified usable market evidence and has candidate-matched verified
   * on-chain trading evidence; then rank by the existing analysisPriority().
   */
  const bitqueryMarketTargetCandidatesV235 = candidates
    .filter(candidate => {
      const address = normalize(candidate?.address);
      if (!isAddress(address) || address === ZERO) return false;
      if (candidate?.validERC20 !== true) return false;
      if (candidate?.excludedReason) return false;
      if (terminalPriorityReject(candidate)?.terminal === true) return false;
      if (candidate?.market?.verified === true &&
          safeNumber(candidate?.market?.priceUsd) > 0 &&
          safeNumber(candidate?.market?.liquidityUsd) > 0) return false;
      const watched = state.watchedTokens.find(row => normalize(row?.address) === address) || null;
      if (!watched) return false;
      if (preMarketExcludedToken(watched).excluded) return false;
      if (terminalPriorityRejectFromWatched(watched).terminal) return false;
      const flow = candidate?.onChainVerifiedFlowV212;
      if (flow?.verified !== true || safeNumber(flow?.recordCount) <= 0) return false;
      return true;
    })
    .slice()
    .sort((a, b) => analysisPriority(b) - analysisPriority(a));

  const nextBitqueryMarketTargetV235 = bitqueryMarketTargetCandidatesV235[0] || null;

  if (nextBitqueryMarketTargetV235) {
    const nextAddressV235 = normalize(nextBitqueryMarketTargetV235.address);
    const matchingTokensFreshV235 =
      state.bitqueryMarketEvidenceV233?.verified === true &&
      normalize(state.bitqueryMarketEvidenceV233?.address) === nextAddressV235 &&
      safeNumber(state.bitqueryMarketEvidenceV233?.fetchedAt) > 0 &&
      Date.now() - safeNumber(state.bitqueryMarketEvidenceV233.fetchedAt) <=
        BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233;
    const matchingPairFreshV235 =
      state.bitqueryRankedPairEvidenceV234?.verified === true &&
      normalize(state.bitqueryRankedPairEvidenceV234?.address) === nextAddressV235 &&
      safeNumber(state.bitqueryRankedPairEvidenceV234?.fetchedAt) > 0 &&
      Date.now() - safeNumber(state.bitqueryRankedPairEvidenceV234.fetchedAt) <=
        BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234;

    state.bitqueryMarketTargetV235 = matchingTokensFreshV235 || matchingPairFreshV235
      ? {
          ...newState().bitqueryMarketTargetV235,
          status: "NOT_QUEUED_MATCHING_FRESH_MARKET_EVIDENCE"
        }
      : {
          address: nextAddressV235,
          reason: "POST_ANALYSIS_MARKET_UNVERIFIED_WITH_VERIFIED_ONCHAIN_ACTIVITY_V235",
          selectedAt: Date.now(),
          analysisPriority: analysisPriority(nextBitqueryMarketTargetV235),
          symbol: nextBitqueryMarketTargetV235?.symbol || null,
          sourceVersion: "V235",
          status: "QUEUED_FOR_NEXT_SHARED_BITQUERY_REQUEST"
        };
  } else if (!persistedBitqueryMarketTargetEligibleV235) {
    state.bitqueryMarketTargetV235 = {
      ...newState().bitqueryMarketTargetV235,
      status: "NO_ELIGIBLE_MARKET_UNVERIFIED_TARGET"
    };
  }

  /*
   * V237 next-scan liquidity-target handoff. Require candidate-matched verified
   * on-chain activity plus an exact pool registry mapping containing the token
   * and a canonical ETH/WETH/USDG quote. No unidentified pool is targeted.
   */
  const bitqueryLiquidityTargetCandidatesV237 = candidates
    .map(candidate => {
      const address = normalize(candidate?.address);
      if (!isAddress(address) || address === ZERO || candidate?.validERC20 !== true || candidate?.excludedReason) return null;
      if (terminalPriorityReject(candidate)?.terminal === true) return null;
      if (candidate?.market?.verified === true && safeNumber(candidate?.market?.liquidityUsd) > 0) return null;
      const watched = state.watchedTokens.find(row => normalize(row?.address) === address) || null;
      if (!watched || preMarketExcludedToken(watched).excluded || terminalPriorityRejectFromWatched(watched).terminal) return null;
      const flow = candidate?.onChainVerifiedFlowV212;
      if (flow?.verified !== true || safeNumber(flow?.recordCount) <= 0) return null;
      const poolIds = Array.isArray(flow?.poolIds) ? flow.poolIds : [];
      for (const rawPoolId of poolIds) {
        const poolId = normalize(rawPoolId);
        if (!/^0x[a-f0-9]{64}$/.test(poolId)) continue;
        const reg = state.poolRegistry?.[poolId];
        if (!reg) continue;
        const c0 = normalize(reg?.currency0);
        const c1 = normalize(reg?.currency1);
        if (c0 !== address && c1 !== address) continue;
        const quoteAddress = c0 === address ? c1 : c0;
        if (![ZERO, CANONICAL_WETH_V179, CANONICAL_USDG_V179].includes(quoteAddress)) continue;
        return {candidate, address, poolId, quoteAddress};
      }
      return null;
    })
    .filter(Boolean)
    .sort((a, b) => analysisPriority(b.candidate) - analysisPriority(a.candidate));

  const nextBitqueryLiquidityTargetV237 = bitqueryLiquidityTargetCandidatesV237[0] || null;
  if (nextBitqueryLiquidityTargetV237) {
    const matchingFreshV237 = state.bitqueryLiquidityEvidenceV237?.verified === true &&
      normalize(state.bitqueryLiquidityEvidenceV237?.address) === nextBitqueryLiquidityTargetV237.address &&
      normalize(state.bitqueryLiquidityEvidenceV237?.poolId) === nextBitqueryLiquidityTargetV237.poolId &&
      safeNumber(state.bitqueryLiquidityEvidenceV237?.fetchedAt) > 0 &&
      Date.now() - safeNumber(state.bitqueryLiquidityEvidenceV237.fetchedAt) <= BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237;
    state.bitqueryLiquidityTargetV237 = matchingFreshV237
      ? {...newState().bitqueryLiquidityTargetV237, status: "NOT_QUEUED_MATCHING_FRESH_LIQUIDITY_EVIDENCE"}
      : {
          address: nextBitqueryLiquidityTargetV237.address,
          poolId: nextBitqueryLiquidityTargetV237.poolId,
          quoteAddress: nextBitqueryLiquidityTargetV237.quoteAddress,
          reason: "POST_ANALYSIS_LIQUIDITY_UNVERIFIED_EXACT_POOL_WITH_VERIFIED_ACTIVITY_V237",
          selectedAt: Date.now(),
          analysisPriority: analysisPriority(nextBitqueryLiquidityTargetV237.candidate),
          symbol: nextBitqueryLiquidityTargetV237.candidate?.symbol || null,
          sourceVersion: "V237",
          status: "QUEUED_FOR_NEXT_SHARED_BITQUERY_REQUEST"
        };
  } else if (!persistedBitqueryLiquidityTargetEligibleV237) {
    state.bitqueryLiquidityTargetV237 = {
      ...newState().bitqueryLiquidityTargetV237,
      status: "NO_ELIGIBLE_EXACT_POOL_LIQUIDITY_TARGET"
    };
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
      "V199_BITQUERY_POOLID_FIRST_IDENTITY_HUNTER",

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
        (
          postAnalysisBacklogResultV170
            ?.processedThrough ??
          backlogResult
            ?.processedThrough
        ) !==
          null &&
        (
          postAnalysisBacklogResultV170
            ?.processedThrough ??
          backlogResult
            ?.processedThrough
        ) !==
          undefined
          ? Number(
              postAnalysisBacklogResultV170
                ?.processedThrough ??
              backlogResult
                ?.processedThrough
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

    marketProviderRecoveryStaggerV157:
      marketProviderRecoveryTelemetryV157(
        state
      ),

    requestBudget:
      budgetTelemetry(
        budget
      ),

    notificationReserveReleaseV174,

    postAnalysisBacklogReclaimV170,

    onChainDirectionalV179,

    poolsTradeLaunchCumulativeV209:
      state.poolsTradeLaunchTelemetryV209,

    verifiedLaunchPriorityV211: {
      enabled: true,
      sameScanPriority: true,
      externalRequestsAdded: 0,
      verifiedTokensPrioritized:
        Array.from(verifiedLaunchPriorityTokensV211),
      verifiedPoolIdsPrioritized:
        Array.from(verifiedLaunchPriorityPoolsV211),
      tokenCount:
        verifiedLaunchPriorityTokensV211.size,
      poolCount:
        verifiedLaunchPriorityPoolsV211.size,
      status:
        verifiedLaunchPriorityTokensV211.size
          ? "VERIFIED_LAUNCH_PROMOTED"
          : "NO_CURRENT_LIVE_VERIFIED_LAUNCH"
    },

    bagsVerifiedDiscoveryV210:
      bagsDiscoveryV210,

    bitqueryHolderTargetHandoffV228: {
      enabled: true,
      persistedTargetAtRequestStart: persistedBitqueryHolderTargetAddressV228 || null,
      persistedTargetEligibleAtRequestStart: persistedBitqueryHolderTargetEligibleV228,
      targetActuallySentToSharedRequest: bitqueryHolderTargetV227?.address || null,
      targetReasonSentToSharedRequest: bitqueryHolderTargetV227?.reason || null,
      nextQueuedTarget: state.bitqueryHolderTargetV228?.address || null,
      nextQueuedSymbol: state.bitqueryHolderTargetV228?.symbol || null,
      nextQueuedReason: state.bitqueryHolderTargetV228?.reason || null,
      nextQueuedStatus: state.bitqueryHolderTargetV228?.status || "NONE",
      nextQueuedAnalysisPriority: state.bitqueryHolderTargetV228?.analysisPriority ?? null,
      maxPersistAgeMs: BITQUERY_HOLDER_TARGET_MAX_AGE_MS_V228,
      ponsV2ExcludedUntilDynamicInfrastructureReconciled: true,
      externalRequestsAdded: 0
    },

    bitqueryMarketTargetHandoffV235: {
      enabled: true,
      independentFromHolderTarget: true,
      persistedTargetAtRequestStart: persistedBitqueryMarketTargetAddressV235 || null,
      persistedTargetEligibleAtRequestStart: persistedBitqueryMarketTargetEligibleV235,
      targetActuallySentToSharedRequest: bitqueryMarketTargetV235?.address || null,
      targetReasonSentToSharedRequest: bitqueryMarketTargetV235?.reason || null,
      holderTargetSentSeparately: bitqueryHolderTargetV227?.address || null,
      nextQueuedTarget: state.bitqueryMarketTargetV235?.address || null,
      nextQueuedSymbol: state.bitqueryMarketTargetV235?.symbol || null,
      nextQueuedReason: state.bitqueryMarketTargetV235?.reason || null,
      nextQueuedStatus: state.bitqueryMarketTargetV235?.status || "NONE",
      nextQueuedAnalysisPriority: state.bitqueryMarketTargetV235?.analysisPriority ?? null,
      requiresCandidateMatchedVerifiedOnChainActivity: true,
      maxPersistAgeMs: BITQUERY_MARKET_TARGET_MAX_AGE_MS_V235,
      externalRequestsAdded: 0,
      momentumMathChanged: false,
      verifiedUsdPathChanged: false,
      marketVerifiedPromoted: false,
      liquidityVerified: false
    },

    bitqueryLiquidityTargetHandoffV237: {
      enabled: true,
      independentFromHolderAndMarketTargets: true,
      persistedTargetAtRequestStart: persistedBitqueryLiquidityTargetAddressV237 || null,
      persistedPoolIdAtRequestStart: persistedBitqueryLiquidityTargetPoolIdV237 || null,
      persistedTargetEligibleAtRequestStart: persistedBitqueryLiquidityTargetEligibleV237,
      targetActuallySentToSharedRequest: bitqueryLiquidityTargetV237?.address || null,
      poolIdActuallySentToSharedRequest: bitqueryLiquidityTargetV237?.poolId || null,
      nextQueuedTarget: state.bitqueryLiquidityTargetV237?.address || null,
      nextQueuedPoolId: state.bitqueryLiquidityTargetV237?.poolId || null,
      nextQueuedSymbol: state.bitqueryLiquidityTargetV237?.symbol || null,
      nextQueuedStatus: state.bitqueryLiquidityTargetV237?.status || "NONE",
      exactPoolIdRequired: true,
      canonicalQuoteRequired: true,
      maxPersistAgeMs: BITQUERY_LIQUIDITY_TARGET_MAX_AGE_MS_V237,
      externalRequestsAdded: 0,
      momentumMathChanged: false,
      verifiedUsdPathChanged: false,
      marketVerifiedPromoted: false
    },

    bitqueryHolderEvidenceV227: {
      enabled: true,
      sharedExistingBitqueryHttpRequest: true,
      externalRequestsAdded: 0,
      targetAddress: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.targetAddress || null,
      targetReason: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.targetReason || null,
      attempted: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.attempted === true,
      verified: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.verified === true,
      status: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.status || "NOT_TARGETED",
      holderCount: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.holderCount ?? null,
      rowCount: safeNumber(bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.rowCount),
      dataset: "realtime",
      sharedRequestHttpStatusV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.sharedRequestHttpStatusV229 ?? bagsDiscoveryV210?.httpStatus ?? null,
      sharedRequestContentTypeV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.sharedRequestContentTypeV229 || null,
      sharedRequestErrorClassV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.sharedRequestErrorClassV229 || null,
      sharedRequestErrorPreviewV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.sharedRequestErrorPreviewV229 || null,
      bearerHeaderConfiguredV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.bearerHeaderConfiguredV229 === true,
      endpointV229: bagsDiscoveryV210?.bitqueryHolderEvidenceV227?.endpointV229 || BITQUERY_GRAPHQL_V2,
      holderQueryShapeV229: "EVM_ROBINHOOD_DATASET_REALTIME_HOLDERS_BALANCE_SELECTWHERE_GT_ZERO_UNIQ_HOLDER_ADDRESS",
      ponsConcentrationSafety: "BLOCKED_UNTIL_DYNAMIC_PROTOCOL_INFRASTRUCTURE_EXCLUSION_IS_EXPLICIT"
    },

    bitqueryMarketEvidenceV233: {
      enabled: true,
      sharedExistingBitqueryHttpRequest: true,
      externalRequestsAdded: 0,
      targetAddress: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.targetAddress || null,
      targetReason: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.targetReason || null,
      attempted: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.attempted === true,
      verified: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.verified === true,
      status: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.status || "NOT_TARGETED",
      snapshotTime: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.snapshotTime || null,
      snapshotAgeMs: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.snapshotAgeMs ?? null,
      priceUsd: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.priceUsd ?? null,
      marketCap: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.marketCap ?? null,
      fdv: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.fdv ?? null,
      volume24hUsd: bagsDiscoveryV210?.bitqueryMarketEvidenceV233?.volume24hUsd ?? null,
      source: "BITQUERY_TRADING_TOKENS_V233",
      networkBid: "bid:robinhood",
      maxFreshAgeMs: BITQUERY_MARKET_EVIDENCE_MAX_AGE_MS_V233,
      partialMarketOnly: true,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      fullMarketQualificationChanged: false,
      momentumMathChanged: false,
      verifiedUsdPathChanged: false
    },

    bitqueryRankedPairEvidenceV234: {
      enabled: true,
      sharedExistingBitqueryHttpRequest: true,
      externalRequestsAdded: 0,
      targetAddress: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.targetAddress || null,
      targetReason: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.targetReason || null,
      attempted: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.attempted === true,
      verified: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.verified === true,
      status: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.status || "NOT_TARGETED",
      snapshotTime: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.snapshotTime || null,
      snapshotAgeMs: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.snapshotAgeMs ?? null,
      priceUsd: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.priceUsd ?? null,
      marketCap: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.marketCap ?? null,
      fdv: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.fdv ?? null,
      intervalVolumeUsd: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.intervalVolumeUsd ?? null,
      marketAddress: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.marketAddress || null,
      marketProtocol: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.marketProtocol || null,
      quoteTokenAddress: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.quoteTokenAddress || null,
      quoteTokenSymbol: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.quoteTokenSymbol || null,
      rankingPosition: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.rankingPosition ?? null,
      rankingWeight: bagsDiscoveryV210?.bitqueryRankedPairEvidenceV234?.rankingWeight ?? null,
      source: "BITQUERY_TRADING_PAIRS_RANK1_V234",
      networkBid: "bid:robinhood",
      rankRequired: 1,
      usdQuoteRequired: true,
      maxFreshAgeMs: BITQUERY_RANKED_PAIR_EVIDENCE_MAX_AGE_MS_V234,
      partialMarketOnly: true,
      total24hTokenVolumeInferred: false,
      liquidityVerified: false,
      marketVerifiedPromoted: false,
      fullMarketQualificationChanged: false,
      momentumMathChanged: false,
      verifiedUsdPathChanged: false
    },

    bitqueryLiquidityEvidenceV237: {
      enabled: true,
      sharedExistingBitqueryHttpRequest: true,
      externalRequestsAdded: 0,
      targetAddress: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.targetAddress || null,
      poolId: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.poolId || null,
      targetReason: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.targetReason || null,
      attempted: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.attempted === true,
      verified: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.verified === true,
      status: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.status || "NOT_TARGETED",
      snapshotTime: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.snapshotTime || null,
      snapshotAgeMs: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.snapshotAgeMs ?? null,
      currencyAAddress: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.currencyAAddress || null,
      currencyASymbol: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.currencyASymbol || null,
      currencyBAddress: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.currencyBAddress || null,
      currencyBSymbol: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.currencyBSymbol || null,
      amountCurrencyA: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.amountCurrencyA ?? null,
      amountCurrencyAInUSD: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.amountCurrencyAInUSD ?? null,
      amountCurrencyB: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.amountCurrencyB ?? null,
      amountCurrencyBInUSD: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.amountCurrencyBInUSD ?? null,
      liquidityUsd: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.liquidityUsd ?? null,
      calculationMethod: bagsDiscoveryV210?.bitqueryLiquidityEvidenceV237?.calculationMethod || null,
      source: "BITQUERY_DEXPOOLEVENTS_POOLID_V237",
      dataset: "realtime",
      exactPoolIdRequired: true,
      exactCandidateTokenRequired: true,
      canonicalQuoteRequired: true,
      maxFreshAgeMs: BITQUERY_LIQUIDITY_EVIDENCE_MAX_AGE_MS_V237,
      marketVerifiedPromoted: false,
      fullMarketQualificationChanged: false,
      momentumMathChanged: false,
      verifiedUsdPathChanged: false
    },

    bagsVerifiedDiscoveryCumulativeV210:
      state.bagsDiscoveryV210,

    flapVerifiedDiscoveryV214: {
      enabled: true,
      verification:
        "BITQUERY_ZERO_MINT_1B_TRANSACTION_TO_FLAP_ROUTER",
      router:
        FLAP_ROUTER_V214,
      launchesSeen:
        safeNumber(
          bagsDiscoveryV210?.flapLaunchesSeen
        ),
      newlyObserved:
        safeNumber(
          bagsDiscoveryV210?.flapNewlyObserved
        ),
      verifiedTokensAdded:
        safeNumber(
          bagsDiscoveryV210?.flapVerifiedTokensAdded
        ),
      launches:
        Array.isArray(
          bagsDiscoveryV210?.flapLaunches
        )
          ? bagsDiscoveryV210.flapLaunches
          : [],
      status:
        bagsDiscoveryV210?.flapStatus ||
        state.flapDiscoveryV214?.lastStatus ||
        "NOT_RUN",
      sharedExternalRequest:
        true,
      externalRequestsAddedVsV213:
        0,
      bondingCurveTradeDecoder:
        "NOT_ASSUMED"
    },

    flapVerifiedDiscoveryCumulativeV214:
      state.flapDiscoveryV214,

    ponsVerifiedDiscoveryV215: {
      enabled: true,
      protocol:
        PONS_PROTOCOL_V215,
      factory:
        PONS_V2_FACTORY_V215,
      router:
        PONS_V2_ROUTER_V215,
      memeHook:
        PONS_V2_MEME_HOOK_V215,
      verification:
        "BITQUERY_DECODED_TOKENLAUNCHED_FROM_EXACT_PONS_V2_FACTORY",
      launchesSeen:
        safeNumber(
          bagsDiscoveryV210?.ponsLaunchesSeen
        ),
      newlyObserved:
        safeNumber(
          bagsDiscoveryV210?.ponsNewlyObserved
        ),
      verifiedTokensAdded:
        safeNumber(
          bagsDiscoveryV210?.ponsVerifiedTokensAdded
        ),
      launches:
        Array.isArray(
          bagsDiscoveryV210?.ponsLaunches
        )
          ? bagsDiscoveryV210.ponsLaunches
          : [],
      status:
        bagsDiscoveryV210?.ponsStatus ||
        state.ponsDiscoveryV215?.lastStatus ||
        "NOT_RUN",
      sharedExternalRequest:
        true,
      externalRequestsAddedVsV214:
        0,
      preGraduationVenue:
        "PONS_V2_BONDING_CURVE",
      v4PoolPolicy:
        "DO_NOT_ASSUME_V4_UNTIL_GRADUATION_VERIFIED"
    },

    launchHoodVerifiedDiscoveryV220: {
      enabled: true,
      verification:
        "BITQUERY_ZERO_MINT_1B_TRANSACTION_TO_EXACT_LAUNCHHOOD_FACTORY",
      factory:
        LAUNCHHOOD_FACTORY_V220,
      launchesSeen:
        safeNumber(
          bagsDiscoveryV210
            ?.launchHoodLaunchesSeenV220
        ),
      newlyObserved:
        safeNumber(
          bagsDiscoveryV210
            ?.launchHoodNewlyObservedV220
        ),
      verifiedTokensAdded:
        safeNumber(
          bagsDiscoveryV210
            ?.launchHoodVerifiedTokensAddedV220
        ),
      launches:
        Array.isArray(
          bagsDiscoveryV210
            ?.launchHoodLaunchesV220
        )
          ? bagsDiscoveryV210
              .launchHoodLaunchesV220
          : [],
      status:
        bagsDiscoveryV210
          ?.launchHoodStatusV220 ||
        state.launchHoodDiscoveryV220
          ?.lastStatus ||
        "NOT_RUN",
      launchModel:
        "DIRECT_TO_UNISWAP_AT_CREATION",
      poolVersionPolicy:
        "UNVERIFIED_DO_NOT_GUESS",
      sharedExternalRequest:
        true,
      externalRequestsAddedVsV219:
        0
    },

    launchHoodVerifiedDiscoveryCumulativeV220:
      state.launchHoodDiscoveryV220,

    fixedMintLaunchpadDiscoveryV222: {
      enabled: true,
      verification:
        "BITQUERY_ZERO_MINT_1B_TRANSACTION_TO_EXACT_FACTORY_V222",
      supportedLaunchpads: [
        {protocol: "hood.fun", factory: HOOD_FUN_FACTORY_V222},
        {protocol: "Klik Finance", factory: KLIK_FINANCE_FACTORY_V222},
        {protocol: "Bankr Bot", factory: BANKR_BOT_FACTORY_V222},
        {protocol: "Ape.store", factory: APE_STORE_FACTORY_V222}
      ],
      launchesSeen:
        safeNumber(
          bagsDiscoveryV210?.fixedMintLaunchpadLaunchesSeenV222
        ),
      newlyObserved:
        safeNumber(
          bagsDiscoveryV210?.fixedMintLaunchpadNewlyObservedV222
        ),
      verifiedTokensAdded:
        safeNumber(
          bagsDiscoveryV210?.fixedMintLaunchpadVerifiedTokensAddedV222
        ),
      launches:
        Array.isArray(
          bagsDiscoveryV210?.fixedMintLaunchpadLaunchesV222
        )
          ? bagsDiscoveryV210.fixedMintLaunchpadLaunchesV222
          : [],
      status:
        bagsDiscoveryV210?.fixedMintLaunchpadStatusV222 ||
        state.fixedMintLaunchpadDiscoveryV222?.lastStatus ||
        "NOT_RUN",
      sameScanPriority: true,
      venueModelPolicy: "UNVERIFIED_DO_NOT_GUESS",
      sharedExternalRequest: true,
      externalRequestsAddedVsV221: 0,
      transferRowLimit: 50,
      differentSupplyRulesHandledSeparatelyV224: [
        "Virtuals",
        "Clanker"
      ]
    },

    fixedMintLaunchpadDiscoveryCumulativeV222:
      state.fixedMintLaunchpadDiscoveryV222,

    clankerVirtualsDiscoveryV224: {
      enabled: true,
      verification: "BITQUERY_EXACT_FACTORY_ZERO_MINT_SUPPLY_RULE_PER_PROTOCOL_V224",
      supportedLaunchpads: [
        {protocol: "Clanker", factory: CLANKER_FACTORY_V224, mintAmount: CLANKER_MINT_AMOUNT_V224},
        {protocol: "Virtuals", factory: VIRTUALS_FACTORY_V224, mintAmount: "ANY_NO_FIXED_SUPPLY"}
      ],
      launchesSeen: safeNumber(bagsDiscoveryV210?.clankerVirtualsLaunchesSeenV224),
      newlyObserved: safeNumber(bagsDiscoveryV210?.clankerVirtualsNewlyObservedV224),
      verifiedTokensAdded: safeNumber(bagsDiscoveryV210?.clankerVirtualsVerifiedTokensAddedV224),
      launches: Array.isArray(bagsDiscoveryV210?.clankerVirtualsLaunchesV224) ? bagsDiscoveryV210.clankerVirtualsLaunchesV224 : [],
      status: bagsDiscoveryV210?.clankerVirtualsStatusV224 || state.clankerVirtualsDiscoveryV224?.lastStatus || "NOT_RUN",
      sameScanPriority: true,
      launchAgeSupportedV223: true,
      venueModelPolicy: "UNVERIFIED_DO_NOT_GUESS",
      sharedExternalRequest: true,
      externalRequestsAddedVsV223: 0
    },
    clankerVirtualsDiscoveryCumulativeV224:
      state.clankerVirtualsDiscoveryV224,

    ponsVerifiedDiscoveryCumulativeV215:
      state.ponsDiscoveryV215,

    ponsCurveTradesV216:
      bagsDiscoveryV210?.ponsCurveTradesV216 || {
        rowsSeen: 0,
        verifiedTrades: 0,
        newlyObserved: 0,
        verifiedPonsTokenSetSize: 0,
        status: "NOT_RUN",
        trades: []
      },

    ponsCurveTradesCumulativeV216:
      state.ponsCurveTradesV216,

    ponsTradeTargetingV217: {
      enabled: true,
      strategy:
        "NEWEST_VERIFIED_PONS_TOKENS_FROM_PERSISTED_KV",
      targetTokenCount:
        safeNumber(
          bagsDiscoveryV210
            ?.ponsCurveTradesV216
            ?.targetTokenCount
        ),
      targetTokens:
        Array.isArray(
          bagsDiscoveryV210
            ?.ponsCurveTradesV216
            ?.targetTokens
        )
          ? bagsDiscoveryV210
              .ponsCurveTradesV216
              .targetTokens
          : [],
      maxTargetTokens: 20,
      maxTradeRows: 100,
      sort:
        "Block_Time_DESC",
      currentScanNewLaunchesTargetableNextScan:
        true,
      externalRequestsAddedVsV216: 0
    },

    blockscoutDirectionalUsdV180,

    blockscoutDirectionalUsd429ProtectionV183:
      blockscoutDirectionalUsdTelemetryV183(
        state
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

        poolsTradeLaunchEventsV208:
          liveDiscovery.poolsTradeLaunchEventsV205,

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

        rpcAbortRecoveryV156:
          liveScan
            .abortRecoveryV156 ||
          {
            enabled: true,
            attempts: 0,
            successes: 0,
            alternateProviderRetries: 0,
            sameProviderRetries: 0
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

              poolsTradeLaunchEventsV209:
                backlogDiscovery
                  .poolsTradeLaunchEventsV205,

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

              rpcAbortRecoveryV156:
                backlogResult
                  ?.abortRecoveryV156 ||
                {
                  enabled: true,
                  attempts: 0,
                  successes: 0,
                  alternateProviderRetries: 0,
                  sameProviderRetries: 0
                },

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

    poolRegistrySelfHealV186,

    poolRegistryRetentionV185: {
      enabled: true,
      maxAgeMs:
        null,
      maxAgeDays:
        null,
      timeExpiryDisabledV186:
        true,
      retentionPolicyV186:
        "LRU_CAP_ONLY",
      maxMappings:
        MAX_POOL_REGISTRY,
      activityRefreshFromNormalLogs:
        true,
      zeroExtraRequests:
        true,
      liveRefreshedMappings:
        safeNumber(
          liveDiscovery
            ?.poolRegistryActivityV185
            ?.refreshedMappings
        ),
      backlogRefreshedMappings:
        safeNumber(
          backlogDiscovery
            ?.poolRegistryActivityV185
            ?.refreshedMappings
        ),
      liveInitializeRecoveredUnknownPools:
        safeNumber(
          liveDiscovery
            ?.initializeRecoveredUnknownPoolsV185
        ),
      backlogInitializeRecoveredUnknownPools:
        safeNumber(
          backlogDiscovery
            ?.initializeRecoveredUnknownPoolsV185
        ),
      lookbackInitializeRecoveredUnknownPools:
        safeNumber(
          liveInitializeLookback
            ?.recoveredUnknownPoolsV185
        )
    },

    unknownPoolTrackerCount:
      Object.keys(
        state.unknownPools || {}
      ).length,

    blockscoutWideInitializeResolverV184:
      blockscoutWideInitializeTelemetryV184(
        state
      ),

    marketFreshTarget:
      effectiveMarketFreshTargetAddress ||
      null,

    freshMarketReservationSyncV161,

    freshMarketSlotHandoffV159: {
      ...freshMarketSlotHandoffV159,
      effectiveFreshMarketAddress:
        effectiveMarketFreshTargetAddress ||
        null,
      carriedPriorityRetryAddress:
        retryPersistenceAddressV139 ||
        null,
      dexFreshSpacingMs:
        DEXSCREENER_MIN_FRESH_INTERVAL_MS,
      geckoOneFreshPerScan:
        1,
      telegramThresholdsUnchanged:
        true
    },

    partialHolderRetryFreshSlotReleaseV166: {
      ...partialHolderRetryFreshSlotReleaseV166,

      // V167 telemetry-truth fix:
      // Report the authoritative post-selection state rather than only whether
      // the V166-specific <20-point bypass branch fired. Normal V139 fairness
      // can also hand off the fresh slot while preserving the carried retry.
      carriedRetryPreserved:
        Boolean(
          pendingCompletionAddress &&
          retryPersistenceAddressV139 ===
            pendingCompletionAddress
        ),

      carriedAnalysisPreserved:
        Boolean(
          pendingCompletionAddress &&
          analysisSelected.some(
            token =>
              normalize(
                token?.address
              ) ===
              pendingCompletionAddress
          )
        ),

      telemetryTruthSourceV167:
        "POST_SELECTION_AUTHORITATIVE_STATE",

      normalV139HandoffPreservationReflectedV167:
        Boolean(
          retryFairnessOverrideV139 &&
          pendingCompletionAddress &&
          retryPersistenceAddressV139 ===
            pendingCompletionAddress
        ),

      v166SpecificBypassTriggered:
        partialHolderFreshSlotReleaseTriggeredV166,

      effectiveFreshMarketAddress:
        effectiveMarketFreshTargetAddress ||
        null,
      persistedRetryAddress:
        retryPersistenceAddressV139 ||
        null,
      dexFreshSpacingMs:
        DEXSCREENER_MIN_FRESH_INTERVAL_MS,
      geckoFreshSpacingMs:
        GECKOTERMINAL_MIN_FRESH_INTERVAL_MS,
      geckoOneFreshPerScan:
        1
    },

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
        "V168_TELEGRAM_EVIDENCE_FRESHNESS_PROTECTION_DIRECTIONAL_USD_HUNTER",

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
      finalPriorityFreshScheduleV161,

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
        freshMarketSlotHandoffV159
          .triggered
          ? retryPersistenceAddressV139 ||
            null
          : marketFreshTargetAddress ||
            null,

      analysedFirst:
        Boolean(
          freshMarketSlotHandoffV159
            .triggered
            ? retryPersistenceAddressV139
            : marketFreshTargetAddress
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

    terminalReplacementBudgetRecoveryV165,

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

    holderIntegrityReconciliationV162: {
      enabled:
        true,
      retryMs:
        HOLDER_INTEGRITY_RETRY_MS_V162,
      duplicateAddressRepairOnly:
        true,
      infrastructureNeverSubtractedToForceValidity:
        true,
      guessedOrRescaledBalances:
        false,
      concentrationPromotionRequiresReconciledMath:
        true,
      activeQuarantines: state.watchedTokens
        .map(
          watched => {
            const cache =
              watched?.holderIntegrityQuarantineV162;

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
                HOLDER_INTEGRITY_RETRY_MS_V162
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
              source:
                cache.source ||
                null,
              status:
                cache?.data?.integrity?.status ||
                null,
              percentageSum:
                cache?.data?.integrity?.percentageSum ??
                null,
              excessPercent:
                cache?.data?.integrity
                  ?.reconciliationV162
                  ?.excessPercent ??
                null,
              duplicateHolderRowsRemoved:
                cache?.data?.integrity
                  ?.reconciliationV162
                  ?.duplicateHolderRowsRemoved ??
                0,
              knownInfrastructureRows:
                cache?.data?.integrity
                  ?.reconciliationV162
                  ?.knownInfrastructureRows ??
                0,
              independentlyReconciled:
                false,
              promotionAllowed:
                false,
              retryAt:
                timestamp +
                HOLDER_INTEGRITY_RETRY_MS_V162,
              retryAfterMs:
                Math.max(
                  0,
                  timestamp +
                    HOLDER_INTEGRITY_RETRY_MS_V162 -
                    Date.now()
                )
            };
          }
        )
        .filter(Boolean)
        .slice(0, 10)
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
    telegramVerifiedUsdObservabilityV213: {
      enabled: true,
      externalRequestsAdded: 0,
      verifiedUsdCalculationChanged: false,
      candidates: telegramVerifiedUsdObservabilityV213
    },

    qualifyingCandidates:
      candidates.filter(
        qualifiesTelegram
      ).length,

    onChainPoolIdentityDirectionalV153: {
      enabled:
        true,
      externalRequestsAdded:
        0,
      marketVerificationPromoted:
        false,
      strictDirectionalUsdVerificationPreserved:
        true,
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
              identity:
                candidate
                  .onChainPoolIdentityV153 ||
                null
            })
          )
          .slice(
            0,
            10
          )
    },

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

    evidenceQualityProtectionV158: {
      enabled:
        true,
      noExternalRequestsAdded:
        true,
      telegramThresholdsUnchanged:
        true,
      candidates:
        candidates.map(
          candidate => ({
            address:
              candidate.address,
            symbol:
              candidate.symbol ||
              null,
            protection:
              candidate
                .evidenceQualityProtectionV158 ||
              null
          })
        )
    },

    telegramEvidenceFreshnessProtectionV169: {
      enabled:
        true,
      marketMaxAgeMs:
        TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168,
      holderMaxAgeMs:
        TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168,
      holderStrongConfirmationMaxAgeMs:
        TELEGRAM_HOLDER_STRONG_CONFIRMATION_MAX_AGE_MS_V168,
      staleCachesStillUsableForTrackingAndScoring:
        true,
      noExternalRequestsAdded:
        true,
      telegramThresholdsUnchanged:
        true,
      candidates:
        candidates.map(
          candidate => ({
            address:
              normalize(
                candidate.address
              ),
            symbol:
              candidate.symbol ||
              null,
            freshness:
              telegramCoreEvidenceFreshnessV169(
                candidate
              )
          })
        )
    },

    directionalTradeEnrichment,

    earlyDirectionalTradeEnrichmentV175,

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

      poolIdentityTelemetryScopeHotfix:
        "FIXED_V155",

      scanCandidatesTelemetryScopedCorrectlyV155:
        "ENABLED_V155",

      momentumCandidateLocalScopeRestoredV155:
        "ENABLED_V155",

      onChainPoolIdentityDirectionalUnchangedV155:
        "ENABLED_V155",

      noExternalRequestRateChangeV155:
        "ENABLED_V155",

      telegramThresholdsUnchangedV155:
        "ENABLED_V155",

      rpcAbortRecovery:
        "ENABLED_V156",

      liveGetLogsAbortRetryV156:
        "ENABLED_V156",

      backlogGetLogsAbortRetryV156:
        "ENABLED_V156",

      boundedAbortRecoveryPerRangeV156:
        "ENABLED_V156",

      alternateProviderAbortFailoverV156:
        "ENABLED_V156",

      sameProviderAbortRetryWhenNoAlternateV156:
        "ENABLED_V156",

      normalRequestRateUnchangedV156:
        "ENABLED_V156",

      failedBacklogCursorNeverAdvancedV156:
        "ENABLED_V156",

      directionalUsdPoolIdentityUnchangedV156:
        "ENABLED_V156",

      telegramThresholdsUnchangedV156:
        "ENABLED_V156",

      marketProviderRecoveryStagger:
        "ENABLED_V157",

      freshDex429DoesNotImmediatelyBurnGeckoV157:
        "ENABLED_V157",

      oneRecoveringProviderProbePerScanV157:
        "ENABLED_V157",

      crossProviderRecoveryStaggerMsV157:
        MARKET_PROVIDER_CROSS_STAGGER_MS_V157,

      providerNon429ClearsRecoveryPendingV157:
        "ENABLED_V157",

      dexAndGeckoNormalFreshRatesUnchangedV157:
        "ENABLED_V157",

      geckoFreshSpacingUnchangedV157:
        "ENABLED_V157",

      geckoOneFreshPerScanUnchangedV157:
        "ENABLED_V157",

      rpcAbortRecoveryUnchangedV157:
        "ENABLED_V157",

      directionalUsdPoolIdentityUnchangedV157:
        "ENABLED_V157",

      telegramThresholdsUnchangedV157:
        "ENABLED_V157",

      evidenceQualityScoreProtection:
        "ENABLED_V158",

      weakMomentumEvidenceProtectionV158:
        "ENABLED_V158",

      missingDirectionalUsdConfidenceProtectionV158:
        "ENABLED_V158",

      missingHolderCounterConfidenceProtectionV158:
        "ENABLED_V158",

      staleHolderAlertOpportunityCapV158:
        59,

      staleHolderAlertConfidenceCapV158:
        54,

      highConfidenceCoreConfirmationCapV158:
        69,

      postDirectionalEvidenceQualityRecomputeV158:
        "ENABLED_V158",

      noExternalRequestsAddedV158:
        "ENABLED_V158",

      marketProviderRecoveryStaggerUnchangedV158:
        "ENABLED_V158",

      rpcAbortRecoveryUnchangedV158:
        "ENABLED_V158",

      directionalUsdPoolIdentityUnchangedV158:
        "ENABLED_V158",

      telegramThresholdsUnchangedV158:
        "ENABLED_V158",

      priorityFreshMarketSlotHandoff:
        "ENABLED_V159",

      freshVerifiedCacheReleasesMarketSlotV159:
        "ENABLED_V159",

      carriedRetryStillAnalysedFirstV159:
        "ENABLED_V159",

      carriedHolderRiskCompletionPreservedV159:
        "ENABLED_V159",

      nextViableMarketUnverifiedCandidateGetsSlotV159:
        "ENABLED_V159",

      retryFairnessUnchangedV159:
        "ENABLED_V159",

      terminalHandoffsUnchangedV159:
        "ENABLED_V159",

      evidenceQualityProtectionUnchangedV159:
        "ENABLED_V159",

      dexFreshSpacingUnchangedV159:
        "ENABLED_V159",

      geckoOneFreshPerScanUnchangedV159:
        "ENABLED_V159",

      noNormalRequestRateIncreaseV159:
        "ENABLED_V159",

      telegramThresholdsUnchangedV159:
        "ENABLED_V159",

      blockscoutProHttp500TransientOutageProtection:
        "ENABLED_V160",

      blockscoutProTransientStatusesV160:
        [
          500,
          502,
          503,
          504
        ],

      blockscoutProHttp500UsesExistingCooldownV160:
        "ENABLED_V160",

      blockscoutProCooldownStoredInExistingKvUnchangedV160:
        "ENABLED_V160",

      publicBlockscoutPriorityUnchangedV160:
        "ENABLED_V160",

      missingHolderEvidenceNeverPromotedV160:
        "ENABLED_V160",

      verifiedProSuccessClearsCooldownUnchangedV160:
        "ENABLED_V160",

      freshMarketSlotHandoffUnchangedV160:
        "ENABLED_V160",

      noExternalRequestRateIncreaseV160:
        "ENABLED_V160",

      telegramThresholdsUnchangedV160:
        "ENABLED_V160",

      freshMarketReservationSynchronization:
        "ENABLED_V161",

      postTerminalFreshReservationSyncV161:
        "ENABLED_V161",

      priorityCompletionFreshScheduleSyncV161:
        "ENABLED_V161",

      terminalCandidateCannotRetainFreshReservationV161:
        "ENABLED_V161",

      carriedHolderRiskCompletionPreservedV161:
        "ENABLED_V161",

      noExternalRequestRateIncreaseV161:
        "ENABLED_V161",

      telegramThresholdsUnchangedV161:
        "ENABLED_V161",

      strictHolderIntegrityReconciliation:
        "ENABLED_V162",

      duplicateAddressHolderRepairTelemetryV162:
        "ENABLED_V162",

      topHoldersExceedSupplyQuarantineV162:
        "ENABLED_V162",

      holderIntegrityRetryMsV162:
        HOLDER_INTEGRITY_RETRY_MS_V162,

      infrastructureNeverSubtractedToForceValidityV162:
        "ENABLED_V162",

      holderBalanceGuessingDisabledV162:
        "ENABLED_V162",

      concentrationPromotionRequiresReconciledMathV162:
        "ENABLED_V162",

      freshMarketReservationSyncUnchangedV162:
        "ENABLED_V162",

      noExternalRequestRateIncreaseV162:
        "ENABLED_V162",

      telegramThresholdsUnchangedV162:
        "ENABLED_V162",

      holderReconciliationRecursionHotfix:
        "FIXED_V163",

      holderAnalysisUsesReconciliationHelperV163:
        "ENABLED_V163",

      holderIntegrityQuarantineUnchangedV163:
        "ENABLED_V163",

      noExternalRequestRateIncreaseV163:
        "ENABLED_V163",

      telegramThresholdsUnchangedV163:
        "ENABLED_V163",

      holderProviderDeferredTelemetryCorrection:
        "ENABLED_V164",

      blockscoutProConfiguredTruthPreservedWhenDeferredV164:
        "ENABLED_V164",

      blockscoutRunCircuitBreakerExplicitProStatusV164:
        "ENABLED_V164",

      noExternalRequestRateIncreaseV164:
        "ENABLED_V164",

      telegramThresholdsUnchangedV164:
        "ENABLED_V164",

      terminalReplacementBudgetRecovery:
        "ENABLED_V165",

      sameRunTerminalReplacementResidualBudgetV165:
        "ENABLED_V165",

      boundedReplacementAnalysisUsesActualBudgetV165:
        "ENABLED_V165",

      terminalHandoffChainBudgetProtectionV165:
        "ENABLED_V165",

      hardRequestLimitUnchangedV165:
        42,

      analysisRequestLimitUnchangedV165:
        21,

      noExternalRequestRateIncreaseV165:
        "ENABLED_V165",

      telegramThresholdsUnchangedV165:
        "ENABLED_V165",

      partialHolderRetryFreshSlotRelease:
        "ENABLED_V166",

      activeV149PartialHolderCannotMonopolizeFreshSlotV166:
        "ENABLED_V166",

      betterViableChallengerCanBypassV139LeadOnlyForPartialHolderV166:
        "ENABLED_V166",

      carriedPartialHolderRetryPreservedV166:
        "ENABLED_V166",

      ordinaryRetryFairnessUnchangedV166:
        "ENABLED_V166",

      noExternalRequestRateIncreaseV166:
        "ENABLED_V166",

      telegramThresholdsUnchangedV166:
        "ENABLED_V166",

      partialHolderRetryTelemetryTruthFix:
        "ENABLED_V167",

      v139PreservationReflectedInV166TelemetryV167:
        "ENABLED_V167",

      carriedAnalysisPresenceUsesFinalAnalysisQueueV167:
        "ENABLED_V167",

      v166SpecificBypassLogicUnchangedV167:
        "ENABLED_V167",

      noExternalRequestRateIncreaseV167:
        "ENABLED_V167",

      telegramThresholdsUnchangedV167:
        "ENABLED_V167",

      telegramCoreEvidenceFreshnessProtection:
        "ENABLED_V168",

      telegramMarketEvidenceMaxAgeMsV168:
        TELEGRAM_MARKET_EVIDENCE_MAX_AGE_MS_V168,

      telegramHolderEvidenceMaxAgeMsV168:
        TELEGRAM_HOLDER_EVIDENCE_MAX_AGE_MS_V168,

      telegramHolderStrongConfirmationMaxAgeMsV168:
        TELEGRAM_HOLDER_STRONG_CONFIRMATION_MAX_AGE_MS_V168,

      staleVerifiedCachesStillTrackAndScoreV168:
        "ENABLED_V168",

      staleCoreEvidenceCannotSilentlyQualifyTelegramV168:
        "ENABLED_V168",

      verified5mDirectionalUsdCanConfirmCurrentEvidenceV168:
        "ENABLED_V168",

      liveSwapAccelerationCanConfirmCurrentEvidenceV168:
        "ENABLED_V168",

      noExternalRequestRateIncreaseV168:
        "ENABLED_V168",

      telegramThresholdsUnchangedV168:
        "ENABLED_V168",

      telegramEvidenceFreshnessClassificationFix:
        "ENABLED_V169",

      telegramMarketFreshnessStateV169:
        "FRESH_STALE_CACHE_UNVERIFIED",

      telegramHolderFreshnessStateV169:
        "FRESH_STALE_CACHE_UNVERIFIED",

      unverifiedEvidenceNeverLabeledStaleV169:
        "ENABLED_V169",

      staleReasonRequiresVerifiedCachedEvidenceV169:
        "ENABLED_V169",

      v168AlertSafetySemanticsPreservedV169:
        "ENABLED_V169",

      noExternalRequestRateIncreaseV169:
        "ENABLED_V169",

      telegramThresholdsUnchangedV169:
        "ENABLED_V169",

      postAnalysisResidualBacklogCatchup:
        "ENABLED_V170",

      unusedDiscoveryCapacityReclaimV170:
        "ENABLED_V170",

      postAnalysisBacklogReclaimMaxRequestsV170:
        V170_POST_ANALYSIS_BACKLOG_RECLAIM_MAX_REQUESTS,

      alchemyFreeTierTenBlockRangePreservedV170:
        "ENABLED_V170",

      candidateAnalysisCompletesBeforeReclaimV170:
        "ENABLED_V170",

      telegramCompletesBeforeReclaimV170:
        "ENABLED_V170",

      hardRequestLimitUnchangedV170:
        MAX_EXTERNAL_REQUESTS,

      analysisRequestLimitUnchangedV170:
        ANALYSIS_REQUEST_LIMIT,

      discoveryRequestLimitUnchangedV170:
        DISCOVERY_REQUEST_LIMIT,

      telegramThresholdsUnchangedV170:
        "ENABLED_V170",

      matureZeroActivityPriorityRelease:
        "ENABLED_V171",

      matureStageUsesExistingLaunchDefinitionV171:
        "ENABLED_V171",

      verifiedZero24hMarketActivityRequiredV171:
        "ENABLED_V171",

      noCurrentOnChainActivityRequiredV171:
        "ENABLED_V171",

      newLiveCandidatesNeverReleasedByV171:
        "ENABLED_V171",

      priorityReleaseDoesNotRemoveWatchlistV171:
        "ENABLED_V171",

      v140SevenDayRelevanceExpiryUnchangedV171:
        "ENABLED_V171",

      v170BacklogReclaimUnchangedV171:
        "ENABLED_V171",

      hardRequestLimitUnchangedV171:
        42,

      analysisRequestLimitUnchangedV171:
        21,

      telegramThresholdsUnchangedV171:
        "ENABLED_V171",

      verifiedStaleMarketCachePriorityReleaseV172:
        "ENABLED_V172",

      priorityReleaseCacheMaxAgeMsV172:
        MARKET_STALE_CACHE_MS,

      cachedMaturityRecomputedWithLaunchStageV172:
        "ENABLED_V172",

      negativeOrUnverifiedCacheCannotReleaseV172:
        "ENABLED_V172",

      currentOnChainZeroActivityStillRequiredV172:
        "ENABLED_V172",

      v171PrioritySafetyPreservedV172:
        "ENABLED_V172",

      v170BacklogReclaimUnchangedV172:
        "ENABLED_V172",

      hardRequestLimitUnchangedV172:
        42,

      analysisRequestLimitUnchangedV172:
        21,

      telegramThresholdsUnchangedV172:
        "ENABLED_V172",

      telegramGlobalRequestReserveV174:
        "ENABLED_V174",

      telegramExactNetworkRequestAccountingV174:
        "ENABLED_V174",

      telegramPhotoFallbackCountsSecondRequestV174:
        "ENABLED_V174",

      notificationReserveReleasedOnlyAfterTelegramV174:
        "ENABLED_V174",

      v170BacklogReclaimUsesOnlyReleasedHeadroomV174:
        "ENABLED_V174",

      hardRequestLimitUnchangedV174:
        MAX_EXTERNAL_REQUESTS,

      analysisRequestLimitUnchangedV174:
        ANALYSIS_REQUEST_LIMIT,

      notificationRequestLimitUnchangedV174:
        NOTIFICATION_REQUEST_LIMIT,

      telegramThresholdsUnchangedV174:
        "ENABLED_V174",

      earlyVerifiedDirectionalUsdPriorityV175:
        "ENABLED_V175",

      strongCandidateDirectionalOpportunityMinimumV175:
        60,

      strongCandidateDirectionalConfidenceMinimumV175:
        55,

      directionalEnrichmentBeforeLowerPriorityAnalysisV175:
        "ENABLED_V175",

      recomputeScoresAfterVerifiedDirectionalUsdV175:
        "ENABLED_V175",

      oneGeckoFreshPerScanUnchangedV175:
        "ENABLED_V175",

      strictUsdVerificationUnchangedV175:
        "ENABLED_V175",

      hardRequestLimitUnchangedV175:
        MAX_EXTERNAL_REQUESTS,

      analysisRequestLimitUnchangedV175:
        ANALYSIS_REQUEST_LIMIT,

      telegramThresholdsUnchangedV175:
        "ENABLED_V175",

      persistentDirectionalUsdCompletion:
        "ENABLED_V176",


      directional15mAnd6hWindowsV177:
        "ENABLED_V177",

      verified15m6hUsdFlowV177:
        "ENABLED_V177",

      derivedWindowsReuseExistingGeckoBatchV177:
        "ENABLED_V177",

      incomplete15m6hCoverageRemainsUnverifiedV177:
        "ENABLED_V177",

      noExtraWindowRequestsV177:
        "ENABLED_V177",

      unresolvedDirectionalTargetNextScanPriorityV176:
        "ENABLED_V176",

      verifiedDirectionalUsdClearsPersistentTargetV176:
        "ENABLED_V176",

      geckoCooldownAnd429ProtectionsUnchangedV176:
        "ENABLED_V176",

      oneGeckoFreshPerScanUnchangedV176:
        "ENABLED_V176",

      hardRequestLimitUnchangedV176:
        MAX_EXTERNAL_REQUESTS,

      telegramThresholdsUnchangedV176:
        "ENABLED_V176",

      protectedCompletionQueueOrderV178:
        "ENABLED_V178",

      carriedRetryBeforeDirectionalUsdV178:
        "ENABLED_V178",

      freshMarketTargetBeforeDirectionalUsdV178:
        "ENABLED_V178",

      persistentDirectionalUsdStillPrioritizedV178:
        "ENABLED_V178",

      noExternalRequestRateIncreaseV178:
        "ENABLED_V178",

      hardRequestLimitUnchangedV178:
        MAX_EXTERNAL_REQUESTS,

      analysisRequestLimitUnchangedV178:
        ANALYSIS_REQUEST_LIMIT,

      telegramThresholdsUnchangedV178:
        "ENABLED_V178",

      onChainV4DirectionalSwapLedger:
        "ENABLED_V179",

      canonicalPoolManagerSwapAbiV179:
        "VERIFIED_UNISWAP_V4",

      signedAmount0Amount1DecodeV179:
        "ENABLED_V179",

      poolDeltaDirectionClassificationV179:
        "ENABLED_V179",

      exactQuoteRawAmountPersistenceV179:
        "ENABLED_V179",

      canonicalUsdGQuoteAmountV179:
        "ENABLED_V179",

      usdGNotSilentlyPromotedToExactUsdV179:
        "ENABLED_V179",

      onChainDirectionalZeroExtraRequestsV179:
        "ENABLED_V179",

      hardRequestLimitUnchangedV179:
        42,

      analysisRequestLimitUnchangedV179:
        21,

      telegramThresholdsUnchangedV179:
        "ENABLED_V179",

      blockscoutExactPoolDirectionalUsd:
        "ENABLED_V180",

      blockscoutTimestampedSwapHistoryV180:
        "ENABLED_V180",

      canonicalUsdGOneToOneUsdBasisV180:
        "OFFICIAL_REDEMPTION_BASIS",

      blockscout1000LogCeilingProtectionV180:
        "ENABLED_V180",

      exactOnChainBuySellUsdSummationV180:
        "ENABLED_V180",

      decoderRejectionTelemetryV180:
        "ENABLED_V180",

      unknownPoolIdentityNeverGuessedV180:
        "ENABLED_V180",

      geckoSkippedWhenV180AlreadyVerifiedV180:
        "ENABLED_V180",

      hardRequestLimitUnchangedV180:
        42,

      analysisRequestLimitUnchangedV180:
        21,

      telegramThresholdsUnchangedV180:
        "ENABLED_V180",

      blockscoutLatestBlockHandoffFix:
        "ENABLED_V181",

      blockscoutHistoricalToBlockSourceV181:
        "SCAN_LATEST_NUMBER",

      blockRangeInputTelemetryV181:
        "ENABLED_V181",

      v180DirectionalUsdLogicUnchangedV181:
        "ENABLED_V181",

      hardRequestLimitUnchangedV181:
        42,

      analysisRequestLimitUnchangedV181:
        21,

      telegramThresholdsUnchangedV181:
        "ENABLED_V181",

      protectedBlockscoutUsdGDirectionalRequest:
        "ENABLED_V182",

      blockscoutUsdGReservedAnalysisRequestsV182:
        1,

      blockscoutUsdGPreTelegramGlobalSlotProtectionV182:
        "ENABLED_V182",

      reservationAutoReleaseWhenNoEligibleTargetV182:
        "ENABLED_V182",

      v181LatestBlockHandoffFixUnchangedV182:
        "ENABLED_V182",

      hardRequestLimitUnchangedV182:
        42,

      analysisRequestLimitUnchangedV182:
        21,

      telegramThresholdsUnchangedV182:
        "ENABLED_V182",

      blockscoutDirectionalUsd429Protection:
        "ENABLED_V183",

      blockscoutDirectionalUsd429BaseBackoffMsV183:
        300000,

      blockscoutDirectionalUsd429MaxBackoffMsV183:
        1800000,

      blockscoutDirectionalCooldownPrecheckV183:
        "ENABLED_V183",

      v182ReservationReleasedDuringDirectionalCooldownV183:
        "ENABLED_V183",

      blockscoutDirectionalSuccessClears429StateV183:
        "ENABLED_V183",

      v182ProtectedRequestOrderingUnchangedV183:
        "ENABLED_V183",

      v181LatestBlockHandoffFixUnchangedV183:
        "ENABLED_V183",

      hardRequestLimitUnchangedV183:
        42,

      analysisRequestLimitUnchangedV183:
        21,

      telegramThresholdsUnchangedV183:
        "ENABLED_V183",

      wideExactInitializeResolver:
        "ENABLED_V184",

      wideExactInitializeProviderV184:
        "BLOCKSCOUT_EXACT_TOPIC0_TOPIC1",

      wideExactInitializeLookbackBlocksV184:
        250000,

      wideExactInitializeMaxAttemptsPerRunV184:
        1,

      wideExactInitializeUsesExistingResolverBudgetV184:
        "ENABLED_V184",

      wideExactInitializeRpcFallbackV184:
        "ENABLED_V184",

      wideExactInitialize429ProtectionV184:
        "ENABLED_V184",

      poolIdentityGuessingStillForbiddenV184:
        "ENABLED_V184",

      sameRunResolvedIdentityFeedsDirectionalDecoderV184:
        "ENABLED_V184",

      hardRequestLimitUnchangedV184:
        42,

      analysisRequestLimitUnchangedV184:
        21,

      telegramThresholdsUnchangedV184:
        "ENABLED_V184",

      activePoolRegistryRetention:
        "ENABLED_V185",

      poolRegistryRetentionDaysV185:
        30,

      poolRegistryActivityRefreshFromSwapAndLiquidityV185:
        "ENABLED_V185",

      initializeClearsUnknownTrackerV185:
        "ENABLED_V185",

      initializeHarvestFromExistingLiveAndBacklogV185:
        "ENABLED_V185",

      extraExternalRequestsForRegistryRetentionV185:
        0,

      maxPoolRegistryUnchangedV185:
        2500,

      v184WideResolverPreservedAsFallbackV185:
        "ENABLED_V185",

      hardRequestLimitUnchangedV185:
        42,

      analysisRequestLimitUnchangedV185:
        21,

      telegramThresholdsUnchangedV185:
        "ENABLED_V185",

      localPoolRegistrySelfHeal:
        "ENABLED_V186",

      watchedTokenCanonicalPoolRecoveryV186:
        "ENABLED_V186",

      poolRegistryTimeExpiryDisabledV186:
        "ENABLED_V186",

      poolRegistryRetentionPolicyV186:
        "LRU_CAP_ONLY",

      poolRegistryMaxMappingsUnchangedV186:
        2500,

      recoveredLocalPoolClearsUnknownTrackerV186:
        "ENABLED_V186",

      selfHealBeforePruneAndLiveDecodeV186:
        "ENABLED_V186",

      extraExternalRequestsForSelfHealV186:
        0,

      v185ActivityRefreshPreservedV186:
        "ENABLED_V186",

      v184WideResolverFallbackPreservedV186:
        "ENABLED_V186",

      hardRequestLimitUnchangedV186:
        42,

      analysisRequestLimitUnchangedV186:
        21,

      telegramThresholdsUnchangedV186:
        "ENABLED_V186",

      canonicalWethUsdGOnchainReference:
        "ENABLED_V187",

      canonicalWethAddressV187:
        "0x0bd7d308f8e1639fab988df18a8011f41eacad73",

      canonicalUsdGAddressV187:
        "0x5fc5360d0400a0fd4f2af552add042d716f1d168",

      wethUsdReferenceSourceV187:
        "SAME_BATCH_CANONICAL_WETH_USDG_V4_SWAPS",

      wethUsdReferenceAggregationV187:
        "MEDIAN",

      wethQuoteExactUsdConversionV187:
        "ENABLED_ONLY_WITH_VERIFIED_ONCHAIN_REFERENCE",

      noOffchainPricePromotedToVerifiedV187:
        "ENABLED_V187",

      extraExternalRequestsForWethUsdV187:
        0,

      v186DirectionalDecoderPreservedV187:
        "ENABLED_V187",

      hardRequestLimitUnchangedV187:
        42,

      analysisRequestLimitUnchangedV187:
        21,

      telegramThresholdsUnchangedV187:
        "ENABLED_V187",

      rpcBlockHashInitializeResolver:
        "ENABLED_V188",

      rpcBlockHashInitializeFilterV188:
        "POOL_MANAGER_PLUS_INITIALIZE_TOPIC_PLUS_EXACT_POOL_ID",

      rpcBlockHashAvoidsMultiBlockRangeLimitV188:
        "ENABLED_V188",

      rpcBlockHashFirstActiveBlockPriorityV188:
        "ENABLED_V188",

      poolIdentityGuessingStillForbiddenV188:
        "ENABLED_V188",

      v187WethUsdValuationPreservedV188:
        "ENABLED_V188",

      v184WideBlockscoutFallbackPreservedV188:
        "ENABLED_V188",

      hardRequestLimitUnchangedV188:
        42,

      analysisRequestLimitUnchangedV188:
        21,

      telegramThresholdsUnchangedV188:
        "ENABLED_V188",

      nativeEthDirectionalUsdValuation:
        "ENABLED_V192",

      nativeEthDecimalsV192:
        18,

      nativeEthWethWrappingParityBasisV192:
        "STRICT_1_TO_1_DENOMINATION",

      nativeEthUsesSameBatchCanonicalWethUsdGReferenceV192:
        "ENABLED_V192",

      nativeEthOffchainPriceInferenceV192:
        "DISABLED",

      nativeEthUsdUnverifiedWithoutReferenceV192:
        "ENABLED_V192",

      noExtraExternalRequestsV192:
        "ENABLED_V192",

      hardRequestLimitUnchangedV192:
        42,

      telegramThresholdsUnchangedV192:
        "ENABLED_V192",

      bitqueryDexPoolEventsPoolIdFirstV199:
        "ENABLED_V199",

      bitqueryDexPoolEventsDatasetV199:
        "REALTIME_ONLY",

      bitqueryDexPoolEventsExactPoolIdRequiredV199:
        "ENABLED_V199",

      bitqueryDexPoolEventsCurrencyOrderingV199:
        "UNISWAP_V4_NUMERIC_ADDRESS_SORT",

      bitqueryInitializeFallbackPreservedV199:
        "ENABLED_V199",

      successfulPoolIdentityPersistedImmediatelyV199:
        "ENABLED_V199",

      verifiedUsdPricingFrozenFromV196V199:
        "ENABLED_V199",

      identityGuessingV199:
        "DISABLED",

      hardRequestLimitUnchangedV199:
        42,

      telegramThresholdsUnchangedV199:
        "ENABLED_V199",

      resolvedPoolReplayDiagnosticV198:
        "ENABLED_V198",

      resolvedPoolDiagnosticExternalRequestsV198:
        0,

      bitqueryResolverAttemptCapUnchangedV198:
        4,

      diagnosticRawSwapSamplesPerResolvedPoolV198:
        5,

      verifiedUsdPricingStillFrozenV198:
        "ENABLED_V198",

      resolverExpansionV198:
        "NO",

      hardRequestLimitUnchangedV198:
        42,

      telegramThresholdsUnchangedV198:
        "ENABLED_V198",

      verifiedUsdPricingFrozenFromV196:
        "ENABLED_V197",

      liveUnknownPoolCoverageUpgradeV197:
        "ENABLED_V197",

      bitqueryMaxCurrentLiveAttemptsV197:
        4,

      bitqueryAttemptsStillBoundByExistingResolverBudgetV197:
        "ENABLED_V197",

      currentLivePoolsRemainAheadOfStaleTrackerPoolsV197:
        "ENABLED_V197",

      uniswapEthUsdGMathChangedV197:
        "NO",

      exactUsdAggregationChangedV197:
        "NO",

      hardRequestLimitUnchangedV197:
        42,

      telegramThresholdsUnchangedV197:
        "ENABLED_V197",

      uniswapAggregatedEthUsdGReferenceV196:
        "ENABLED_V196",

      uniswapApiKeyEnvV196:
        "UNISWAP_API_KEY",

      uniswapReferenceInputV196:
        "1_NATIVE_ETH",

      uniswapReferenceOutputV196:
        "CANONICAL_USDG",

      uniswapReferenceChainIdV196:
        4663,

      uniswapReferenceMaxRequestsPerScanV196:
        1,

      uniswapReferenceUsesExistingAnalysisBudgetV196:
        "ENABLED_V196",

      uniswapReferenceOutputTokenStrictlyVerifiedV196:
        "ENABLED_V196",

      v3FallbackPreservedV196:
        "ENABLED_V196",

      bitqueryReferenceFallbackPreservedV196:
        "ENABLED_V196",

      hardRequestLimitUnchangedV196:
        42,

      telegramThresholdsUnchangedV196:
        "ENABLED_V196",

      uniswapV3CanonicalWethUsdGReferenceV195:
        "ENABLED_V195",

      uniswapV3FactoryAddressV195:
        UNISWAP_V3_FACTORY_V195,

      uniswapV3FactoryConfigurationV195:
        "HARDCODED_VERIFIED_PUBLIC_DEPLOYMENT",

      uniswapV3StandardFeeTiersV195:
        "100,500,3000,10000",

      v3PoolMustBeFactoryReturnedV195:
        "ENABLED_V195",

      v3PoolTokenPairReverifiedV195:
        "ENABLED_V195",

      v3LiquidityMustBeNonZeroV195:
        "ENABLED_V195",

      v3Slot0PriceDecimalCorrectionV195:
        "ENABLED_V195",

      v3ReferenceCachedInKvStateV195:
        "ENABLED_V195",

      v4BitqueryReferenceFallbackPreservedV195:
        "ENABLED_V195",

      poolAndPriceGuessingV195:
        "DISABLED",

      hardRequestLimitUnchangedV195:
        42,

      telegramThresholdsUnchangedV195:
        "ENABLED_V195",

      bitqueryCanonicalWethUsdGReferenceV194:
        "ENABLED_V194",

      sameBatchWethUsdGReferenceStillPreferredV194:
        "ENABLED_V194",

      canonicalReferencePoolMustExistInRegistryV194:
        "ENABLED_V194",

      bitqueryReferenceMaxRequestsPerScanV194:
        1,

      bitqueryReferenceUsesExistingAnalysisBudgetV194:
        "ENABLED_V194",

      poolIdentityGuessingV194:
        "DISABLED",

      nativeEthUsdValuationPreservedV194:
        "ENABLED_V194",

      hardRequestLimitUnchangedV194:
        42,

      telegramThresholdsUnchangedV194:
        "ENABLED_V194",

      bitqueryCurrentLiveRetryV193:
        "ENABLED_V193",

      bitqueryMaxAttemptsPerRunV193:
        4,

      bitqueryDistinctCurrentLivePoolsOnlyV193:
        "ENABLED_V193",

      bitqueryStopOnFirstResolvedV193:
        "ENABLED_V193",

      bitqueryRetryUsesExistingResolverBudgetV193:
        "ENABLED_V193",

      nativeEthUsdValuationPreservedV193:
        "ENABLED_V193",

      hardRequestLimitUnchangedV193:
        42,

      telegramThresholdsUnchangedV193:
        "ENABLED_V193",

      bitqueryCurrentLivePoolPriority:
        "ENABLED_V191",

      sameScanReplayConfirmedExistingV179:
        "ENABLED_V191",

      staleTrackerCannotPreemptBitqueryLiveSlotV191:
        "ENABLED_V191",

      bitqueryMaxOneLookupPerScanUnchangedV191:
        "ENABLED_V191",

      noExtraExternalRequestsV191:
        "ENABLED_V191",

      hardRequestLimitUnchangedV191:
        42,

      telegramThresholdsUnchangedV191:
        "ENABLED_V191",

      bitqueryExactPoolIdResolver:
        "ENABLED_V190",

      bitqueryDatasetV190:
        "REALTIME",

      bitqueryPoolIdTopicMatchV190:
        "ENABLED_V190",

      bitqueryCanonicalCurrencyPersistenceV190:
        "ENABLED_V190",

      bitqueryIdentityGuessingV190:
        "DISABLED",

      bitquerySecretNameV190:
        "BITQUERY_ACCESS_TOKEN",

      bitqueryUsesExistingResolverBudgetV190:
        "ENABLED_V190",

      legacyResolversFallbackOnlyV190:
        "ENABLED_V190",

      hardRequestLimitUnchangedV190:
        42,

      telegramThresholdsUnchangedV190:
        "ENABLED_V190",

      forcedBlockHashCheckpoint:
        "ENABLED_V189",

      blockHashResolverReservedFirstRequestsV189:
        2,

      oldRangeCrawlerCannotPreemptCheckpointV189:
        "ENABLED_V189",

      blockscoutCannotPreemptCheckpointV189:
        "ENABLED_V189",

      checkpointOutcomeTelemetryV189:
        "ATTEMPTED_RESOLVED_EMPTY_ERROR_BUDGET_BLOCKED",

      noNewUsdMathV189:
        "ENABLED_V189",

      hardRequestLimitUnchangedV189:
        42,

      analysisRequestLimitUnchangedV189:
        21,

      telegramThresholdsUnchangedV189:
        "ENABLED_V189",

      socialMomentum:
        "NOT_VERIFIED"
    },

    architecture:
      "V199_BITQUERY_POOLID_FIRST_IDENTITY_V77_TELEGRAM_HUNTER",

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
      "V158_CORE_EVIDENCE_QUALITY_SCORE_PROTECTION_V77_TELEGRAM_HUNTER",

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
      "V158_CORE_EVIDENCE_QUALITY_SCORE_PROTECTION_V77_TELEGRAM_HUNTER",

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
            "V158_CORE_EVIDENCE_QUALITY_SCORE_PROTECTION_V77_TELEGRAM_HUNTER",

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
