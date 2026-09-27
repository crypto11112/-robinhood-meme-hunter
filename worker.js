Registry present / token match: YES / YES
Decoded verified / candidate-match / exact-USD: 0 / 0 / 0
V179 rows for token+PoolId: 0
Targeted rows fed into V179 by V888 path: NO
Diagnosis: V899_CHUNKED_WINDOW_INCOMPLETE_BUDGET_LIMIT

🧬 Exact-pool → V151 handoff diagnostic — V905/V906
Recorded: 2026-09-27T06:30:14.768Z
Production target: NONE  · mode NONE
V151 target: NONE · same target NO · V887 requested NO
Exact identity pre/post: NO/NO · post PoolId NONE · source NONE
Local exact-pool evidence — registry matches 0 · V254-known pools 0
V772 production — attempted NO · applied NO · status NONE · requests 0 · recent swaps 0 · live pools 0 · checked 0 · matched 0
V906 canonical pool — verified NO · PoolId NONE · eligible pools 0 · swaps 0 · latest block 0
Identity discovery — current-live NO · strategy NONE · registry candidates/added 0/0 · retained 0/0
Initialize recent — attempted/ok NO/NO · rows 0 · token matches 0 · active matches 0
Initialize indexed — c0/c1 attempted NO/NO · ok NO/NO · decoded matches 0 · active matches 0
Uniswap identity — attempted NO · ok NO · matches 0 · status NONE
Budget at V905 snapshot — total 0/0 · analysis 0/0
Diagnosis: NO_PRODUCTION_V4_TARGET_V905

🧭 Production V4 routing diagnostic — V908
Selection: NONE
Normal / rescue / selected: NONE / NONE / NONE
Rescue eligible now: 0 · ranked: 0 · normal displaced rescue: NO
Gates — candidates:2 · ERC20:2 · riskOK:0 · zeroSwaps:2 · noExactPool:1 · analysedEvidence:2 · rescueEligible:0
Budget at selection — total 44/48 · analysis 31/27 · can fund 3: NO

🚧 Top completion-gate blockers
• v254:NO_BOT_OBSERVED_SWAPS: 881
• v175:OPPORTUNITY_BELOW_60: 849
• v254:EXACT_POOL_IDENTITY_UNAVAILABLE: 770
• v175:CONFIDENCE_BELOW_55: 727
• v175:MARKET_OR_POOL_IDENTITY_UNVERIFIED: 657
• v151:MARKET_PAIR_OR_POOL_IDENTITY_UNVERIFIED: 657
• v175:RISK_NOT_ACCEPTABLE: 629
• v151:RISK_NOT_ACCEPTABLE: 629

📡 Selected-lane outcomes
• v258:BLOCK_TIMESTAMP_FETCH_FAILED: 178
• v258:VERIFIED_LAUNCH_AGE_RECOVERED_V258: 103
• v258:NO_VERIFIED_LAUNCH_EVENT_EVIDENCE: 94
• v175:GECKO_DIRECTIONAL_DEFER_ACTIVE_429_COOLDOWN_V824: 65
• v151:GECKO_DIRECTIONAL_DEFER_ACTIVE_429_COOLDOWN_V824: 65
• v175:TARGET_POOL_SIDE_UNVERIFIED: 24

🧬 V823+ evidence handoff cohort
Rows: 0
Directional selected / attempted / verified: 0 / 0 / 0
V254 selected / attempted / recovered: 0 / 0 / 0
Final directional / exact-pool / launch-age verified: 0 / 0 / 0
FLOW reserve reserved / consumed / released-unused: 0 / 0 / 0
FOUNDATION reserve reserved / consumed: 0 / 0

🛟 Protected completion slot — V730
Consumed rows: 822
Reserved but unused rows: 140
• COINGECKO_DEMO_FALLBACK_V660: 496
• COINMARKETCAP_FALLBACK_V739: 163
• RPC:eth_getBlockByNumber: 160
• GECKOTERMINAL_DIRECTIONAL_TRADES: 3

Read-only command. Zero provider requests, zero state writes, no scoring/qualification changes.
