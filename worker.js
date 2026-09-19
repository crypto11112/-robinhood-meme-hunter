🧪 Evidence Completion Regression Audit — V823

Qualification rows retained: 1,000
Compatible detailed rows: 912
Rows without compatible detail: 88

🎯 Last V4-active / V254-relevant status — V821
Recorded: 2026-09-19T03:55:23.920Z
Eligible / attempted / recovered: 0 / 0 / 0
Candidate: 0x9210acbb1989c3a76ec33995cc42fd7d536cbf10
Prequal gates — ERC20:YES · swaps:1 · risk:NO · exactPool:YES · needsUSD:YES
Matched / handoff-merged pools: 0 / 0

📈 Post-recovery authoritative scoring — V823
Recorded: 2026-09-19T04:30:48.471Z
Candidate: 0x2e8c31162b855a2ffa90f6f8634643ad6f111e18
Verified flow: YES · records 110 · pools 3
Recompute applied: YES · source VERIFIED_ONCHAIN_USD_FLOW_V212_V801
Momentum: 0 WEAK
Opportunity: 25 · Confidence: 25 LOW
Telegram-qualified after recompute: NO

🧩 Still UNVERIFIED at final decision
• Directional USD: 909 (99.7%)
• Momentum: 912 (100.0%)
• Market: 757 (83.0%)
• Market Quality: 757 (83.0%)
• Whale Flow: 912 (100.0%)
• Verified launch age: 757 (83.0%)
• Exact pool identity: 727 (79.7%)

⚠️ Likely pre-score gate starvation: 774 (84.9%)

💵 Directional completion lanes
V175 early lane: eligible 138 · selected 139 · attempted 2 · verified 1
V151 prequal lane: eligible 162 · selected 139 · attempted 2 · verified 1
V254 exact-USD lane: eligible 5 · selected 7 · attempted 7 · recovered 2

⏱ Launch-age completion V258
Needed 757 · selected 339 · attempted 84 · recovered 0

🔬 NO_BOT_OBSERVED_SWAPS coverage diagnostic — audit runtime V823
Forward-only classified rows: 352
Known exact/canonical pool but no observed swap: 63
Selected into production V4 lane: 118
• NOT_SELECTED_FOR_PRODUCTION_V4_AND_NO_KNOWN_POOL: 170
• SELECTED_V4_NO_ACTIVE_TARGET_MATCH: 84
• KNOWN_POOL_IDENTITY_BUT_NO_OBSERVED_SWAP: 41
• SELECTED_V4_NOT_ATTEMPTED: 32
• MARKET_PAIR_KNOWN_BUT_V4_POOL_UNLINKED: 23
• NO_KNOWN_POOL_OR_LIVE_SWAP: 2

🧭 Production V4 routing diagnostic — V823
Selection: NONE
Normal / rescue / selected: NONE / NONE / NONE
Rescue eligible now: 0 · ranked: 0 · normal displaced rescue: NO
Gates — candidates:4 · ERC20:4 · riskOK:2 · zeroSwaps:4 · noExactPool:1 · analysedEvidence:4 · rescueEligible:0
Budget at selection — total 33/42 · analysis 26/21 · can fund 3: YES

🚧 Top completion-gate blockers
• v254:NO_BOT_OBSERVED_SWAPS: 858
• v175:OPPORTUNITY_BELOW_60: 773
• v175:CONFIDENCE_BELOW_55: 688
• v175:MARKET_OR_POOL_IDENTITY_UNVERIFIED: 612
• v151:MARKET_PAIR_OR_POOL_IDENTITY_UNVERIFIED: 612
• v175:RISK_NOT_ACCEPTABLE: 513
• v151:RISK_NOT_ACCEPTABLE: 513
• v254:EXACT_POOL_IDENTITY_UNAVAILABLE: 399

📡 Selected-lane outcomes
• v258:ANALYSIS_BUDGET_UNAVAILABLE: 128
• v258:BLOCK_TIMESTAMP_FETCH_FAILED: 126
• v258:NO_VERIFIED_LAUNCH_EVENT_EVIDENCE: 85
• v175:GECKO_DIRECTIONAL_DEFER_UNRESOLVED_429_V432: 56
• v151:GECKO_DIRECTIONAL_DEFER_UNRESOLVED_429_V432: 56
• v175:TARGET_POOL_SIDE_UNVERIFIED: 54

🧬 V823+ evidence handoff cohort
Rows: 2
Directional selected / attempted / verified: 1 / 0 / 0
V254 selected / attempted / recovered: 0 / 0 / 0
Final directional / exact-pool / launch-age verified: 0 / 1 / 1
FLOW reserve reserved / consumed / released-unused: 0 / 0 / 2
FOUNDATION reserve reserved / consumed: 0 / 2

🛟 Protected completion slot — V730
Consumed rows: 757
Reserved but unused rows: 155
• COINGECKO_DEMO_FALLBACK_V660: 400
• RPC:eth_getBlockByNumber: 223
• COINMARKETCAP_FALLBACK_V739: 129
• GECKOTERMINAL_DIRECTIONAL_TRADES: 5

Read-only command. Zero provider requests, zero state writes, no scoring/qualification changes.
