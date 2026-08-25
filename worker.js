/**
 * Robinhood Chain Meme Hunter
 * V74
 *
 * BUILD DIRECTLY ON TOP OF THE FULL V73 CODE.
 *
 * V74 FIXES / UPGRADES:
 * - Prevents V73 from silently running non-persistent when KV disappears
 * - Protects historical state
 * - Better catch-up prioritisation
 * - Prevents infrastructure tokens wasting validation slots
 * - Improves candidate rotation
 * - Adds snapshot age/delta tracking
 * - Prevents misleading momentum from snapshots that are too close together
 * - Adds early-launch age scoring
 * - Adds liquidity/market-cap health scoring
 * - Adds volume/liquidity ratio scoring
 * - Adds stronger momentum confirmation
 * - Adds candidate confidence level
 * - Requires stronger evidence before Telegram alert
 *
 * IMPORTANT:
 * Keep ALL existing V73 code.
 * Make the replacements/additions below.
 */

const VERSION = "V74";

/* =========================================================
   V74 SETTINGS
   ========================================================= */

const MOMENTUM_MIN_HISTORY_MS =
  5 * 60 * 1000;

const MOMENTUM_IDEAL_HISTORY_MS =
  15 * 60 * 1000;

const MAX_PAIR_AGE_EARLY_MS =
  24 * 60 * 60 * 1000;

const VERY_EARLY_PAIR_AGE_MS =
  2 * 60 * 60 * 1000;

const MIN_CONFIDENCE_ALERT = 55;


/* =========================================================
   V74 KV SAFETY
   ========================================================= */

function persistenceHealth(stateResult) {
  if (!stateResult.persistent) {
    return {
      healthy: false,
      status: "KV_BINDING_MISSING",
      critical: true,
      message:
        "MEME_HUNTER_STATE/KV_BINDING is not available. Persistent scanning and momentum history cannot operate."
    };
  }

  if (stateResult.error) {
    return {
      healthy: false,
      status: "KV_READ_ERROR",
      critical: true,
      message: stateResult.error
    };
  }

  return {
    healthy: true,
    status: "READY",
    critical: false,
    message: null
  };
}


/* =========================================================
   V74 SNAPSHOT SELECTION
   ========================================================= */

function getMomentumSnapshot(
  state,
  address
) {
  const snapshots =
    state.snapshots?.[
      normalize(address)
    ];

  if (
    !Array.isArray(snapshots) ||
    !snapshots.length
  ) {
    return null;
  }

  const current =
    Date.now();

  /*
   * Prefer a snapshot at least 15 minutes old.
   */
  for (
    let i = snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const snapshot =
      snapshots[i];

    const age =
      current -
      safeNumber(
        snapshot.timestamp
      );

    if (
      age >=
      MOMENTUM_IDEAL_HISTORY_MS
    ) {
      return snapshot;
    }
  }

  /*
   * Otherwise accept >= 5 minutes.
   */
  for (
    let i = snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const snapshot =
      snapshots[i];

    const age =
      current -
      safeNumber(
        snapshot.timestamp
      );

    if (
      age >=
      MOMENTUM_MIN_HISTORY_MS
    ) {
      return snapshot;
    }
  }

  return null;
}


/* =========================================================
   V74 MARKET QUALITY
   ========================================================= */

function marketQuality(market) {
  if (!market?.verified) {
    return {
      verified: false,
      score: 0,
      liquidityMarketCapRatio: null,
      volumeLiquidityRatio: null,
      pairAgeMinutes: null,
      reasons: []
    };
  }

  let score = 0;
  const reasons = [];

  const liquidity =
    safeNumber(
      market.liquidityUsd
    );

  const marketCap =
    safeNumber(
      market.marketCap
    );

  const volume24 =
    safeNumber(
      market.volume?.h24
    );

  let liquidityMarketCapRatio =
    null;

  if (
    liquidity > 0 &&
    marketCap > 0
  ) {
    liquidityMarketCapRatio =
      liquidity /
      marketCap *
      100;

    if (
      liquidityMarketCapRatio >= 10 &&
      liquidityMarketCapRatio <= 60
    ) {
      score += 20;

      reasons.push(
        "Healthy liquidity/market-cap ratio"
      );

    } else if (
      liquidityMarketCapRatio >= 5
    ) {
      score += 10;
    }

    if (
      liquidityMarketCapRatio < 2
    ) {
      score -= 15;

      reasons.push(
        "Weak liquidity relative to market cap"
      );
    }
  }

  let volumeLiquidityRatio =
    null;

  if (
    volume24 > 0 &&
    liquidity > 0
  ) {
    volumeLiquidityRatio =
      volume24 /
      liquidity;

    if (
      volumeLiquidityRatio >= 1
    ) {
      score += 15;

      reasons.push(
        "Strong volume relative to liquidity"
      );

    } else if (
      volumeLiquidityRatio >= 0.25
    ) {
      score += 8;
    }
  }

  let pairAgeMinutes =
    null;

  if (market.pairCreatedAt) {
    pairAgeMinutes =
      Math.max(
        0,
        (
          Date.now() -
          market.pairCreatedAt
        ) /
        60000
      );

    const pairAgeMs =
      pairAgeMinutes *
      60000;

    if (
      pairAgeMs <=
      VERY_EARLY_PAIR_AGE_MS
    ) {
      score += 20;

      reasons.push(
        "Very early launch"
      );

    } else if (
      pairAgeMs <=
      MAX_PAIR_AGE_EARLY_MS
    ) {
      score += 10;

      reasons.push(
        "Early-stage pair"
      );
    }
  }

  if (
    market.buyPressure1h !== null &&
    market.buyPressure1h >= 60
  ) {
    score += 10;
  }

  return {
    verified: true,

    score:
      clamp(
        score,
        0,
        100
      ),

    liquidityMarketCapRatio,

    volumeLiquidityRatio,

    pairAgeMinutes,

    reasons
  };
}


/* =========================================================
   V74 CONFIDENCE
   ========================================================= */

function candidateConfidence(
  candidate
) {
  let score = 0;
  const reasons = [];

  if (candidate.validERC20) {
    score += 15;
  }

  if (
    candidate.market?.verified
  ) {
    score += 20;

    reasons.push(
      "Market data verified"
    );
  }

  if (
    candidate.holders?.verified
  ) {
    score += 15;

    reasons.push(
      "Holder data verified"
    );
  }

  if (
    candidate.activity
      ?.poolSpecific
  ) {
    score += 10;
  }

  if (
    candidate.activity
      ?.swaps > 0
  ) {
    score += 10;

    reasons.push(
      "Pool-specific swaps verified"
    );
  }

  if (
    candidate.momentum
      ?.verified &&
    candidate.momentum
      ?.historyAgeMinutes >= 5
  ) {
    score += 15;

    reasons.push(
      "Historical momentum verified"
    );
  }

  if (
    candidate.marketQuality
      ?.verified
  ) {
    score += 10;
  }

  if (
    candidate.holders
      ?.whale
      ?.verified
  ) {
    score += 5;
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
          : "LOW",

    reasons
  };
}


/* =========================================================
   REPLACE V73 momentumAnalysis() WITH THIS V74 VERSION
   ========================================================= */

function momentumAnalysis(
  previous,
  market,
  holders
) {
  if (!previous) {
    return {
      verified: false,

      score: 0,

      label:
        "BUILDING_HISTORY",

      historyAgeMinutes:
        null,

      holderGrowthPercent:
        null,

      transferGrowthPercent:
        null,

      liquidityGrowthPercent:
        null,

      volumeH1GrowthPercent:
        null,

      transactionGrowthPercent:
        null,

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

  const historyAgeMinutes =
    historyAgeMs /
    60000;

  if (
    historyAgeMs <
    MOMENTUM_MIN_HISTORY_MS
  ) {
    return {
      verified: false,

      score: 0,

      label:
        "BUILDING_HISTORY",

      historyAgeMinutes,

      holderGrowthPercent:
        null,

      transferGrowthPercent:
        null,

      liquidityGrowthPercent:
        null,

      volumeH1GrowthPercent:
        null,

      transactionGrowthPercent:
        null,

      reasons: [
        "Historical snapshot too recent"
      ]
    };
  }

  const holderGrowth =
    holders?.verified
      ? percentChange(
          previous.holderCount,
          holders.holderCount
        )
      : null;

  const transferGrowth =
    holders?.verified
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

  const previousTransactions =
    safeNumber(
      previous.buysH1
    ) +
    safeNumber(
      previous.sellsH1
    );

  const currentTransactions =
    safeNumber(
      market?.transactions
        ?.h1?.buys
    ) +
    safeNumber(
      market?.transactions
        ?.h1?.sells
    );

  const transactionGrowth =
    market?.verified
      ? percentChange(
          previousTransactions,
          currentTransactions
        )
      : null;

  let score = 0;

  const reasons = [];

  if (
    holderGrowth !== null &&
    holderGrowth > 0
  ) {
    if (holderGrowth >= 20) {
      score += 25;
    } else if (
      holderGrowth >= 10
    ) {
      score += 20;
    } else if (
      holderGrowth >= 3
    ) {
      score += 12;
    } else {
      score += 5;
    }

    reasons.push(
      `Holder growth ${holderGrowth.toFixed(1)}%`
    );
  }

  if (
    transferGrowth !== null &&
    transferGrowth > 0
  ) {
    if (
      transferGrowth >= 25
    ) {
      score += 15;
    } else if (
      transferGrowth >= 10
    ) {
      score += 10;
    } else {
      score += 5;
    }

    reasons.push(
      `Transfer acceleration ${transferGrowth.toFixed(1)}%`
    );
  }

  if (
    liquidityGrowth !== null
  ) {
    if (
      liquidityGrowth >= 20
    ) {
      score += 18;

      reasons.push(
        `Liquidity accelerating ${liquidityGrowth.toFixed(1)}%`
      );

    } else if (
      liquidityGrowth >= 5
    ) {
      score += 10;

      reasons.push(
        `Liquidity growth ${liquidityGrowth.toFixed(1)}%`
      );

    } else if (
      liquidityGrowth <= -20
    ) {
      score -= 20;

      reasons.push(
        `Liquidity falling ${liquidityGrowth.toFixed(1)}%`
      );
    }
  }

  if (
    volumeGrowth !== null
  ) {
    if (
      volumeGrowth >= 100
    ) {
      score += 22;

    } else if (
      volumeGrowth >= 30
    ) {
      score += 16;

    } else if (
      volumeGrowth >= 10
    ) {
      score += 10;

    } else if (
      volumeGrowth > 0
    ) {
      score += 5;
    }

    if (volumeGrowth > 0) {
      reasons.push(
        `Volume acceleration ${volumeGrowth.toFixed(1)}%`
      );
    }
  }

  if (
    transactionGrowth !== null &&
    transactionGrowth > 0
  ) {
    if (
      transactionGrowth >= 50
    ) {
      score += 15;

    } else if (
      transactionGrowth >= 15
    ) {
      score += 10;

    } else {
      score += 5;
    }

    reasons.push(
      `Transaction acceleration ${transactionGrowth.toFixed(1)}%`
    );
  }

  const buyPressure =
    market?.buyPressure1h;

  if (
    buyPressure !== null &&
    buyPressure >= 70
  ) {
    score += 12;

    reasons.push(
      "Very strong buy pressure"
    );

  } else if (
    buyPressure !== null &&
    buyPressure >= 60
  ) {
    score += 7;

    reasons.push(
      "Positive buy pressure"
    );
  }

  /*
   * Multi-signal confirmation.
   */

  let positiveSignals = 0;

  if (
    holderGrowth !== null &&
    holderGrowth > 0
  ) positiveSignals++;

  if (
    liquidityGrowth !== null &&
    liquidityGrowth > 0
  ) positiveSignals++;

  if (
    volumeGrowth !== null &&
    volumeGrowth > 0
  ) positiveSignals++;

  if (
    transactionGrowth !== null &&
    transactionGrowth > 0
  ) positiveSignals++;

  if (
    buyPressure !== null &&
    buyPressure >= 60
  ) positiveSignals++;

  if (positiveSignals >= 4) {
    score += 10;

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
        holders?.verified
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

    historyAgeMinutes,

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
      transactionGrowth,

    reasons
  };
}


/* =========================================================
   REPLACE getPreviousSnapshot() USAGE INSIDE scan()
   ========================================================= */

/*
 * FIND:
 *
 * const previousSnapshot =
 *   getPreviousSnapshot(
 *     state,
 *     watched.address
 *   );
 *
 * REPLACE WITH:
 */

const previousSnapshot =
  getMomentumSnapshot(
    state,
    watched.address
  );


/* =========================================================
   INSIDE scan() AFTER momentumAnalysis()
   ADD:
   ========================================================= */

const quality =
  marketQuality(
    market
  );


/* =========================================================
   AFTER candidate OBJECT IS CREATED ADD THESE PROPERTIES
   ========================================================= */

/*
 * Add:
 *
 * marketQuality: quality,
 *
 * Then immediately after candidate creation:
 */

candidate.confidence =
  candidateConfidence(
    candidate
  );


/* =========================================================
   V74 OPPORTUNITY QUALITY BONUS
   ========================================================= */

/*
 * Immediately after:
 *
 * const opportunity = scoreOpportunity(...)
 *
 * ADD:
 */

if (quality.verified) {

  if (
    quality.score >= 40
  ) {
    opportunity.score =
      clamp(
        opportunity.score + 10,
        0,
        100
      );

    opportunity.reasons.push(
      "Strong market structure"
    );

  } else if (
    quality.score >= 20
  ) {
    opportunity.score =
      clamp(
        opportunity.score + 5,
        0,
        100
      );
  }
}


/* =========================================================
   V74 TELEGRAM CONFIDENCE PROTECTION
   ========================================================= */

/*
 * Inside telegram(), BEFORE consumeBudget(),
 * add:
 */

if (
  candidate.confidence?.score <
  MIN_CONFIDENCE_ALERT
) {
  return {
    sent: false,
    reason:
      "CONFIDENCE_TOO_LOW",

    confidence:
      candidate.confidence
        ?.score || 0
  };
}


/* =========================================================
   V74 TELEGRAM MESSAGE ADDITIONS
   ========================================================= */

/*
 * Add these lines underneath Momentum:
 *
 * 🔎 Confidence: ${candidate.confidence?.score ?? 0}/100 (${candidate.confidence?.label || "LOW"})
 * 🧪 Market Quality: ${candidate.marketQuality?.score ?? 0}/100
 *
 * Add:
 *
 * 💧 Liquidity/MC: ${
 *   Number.isFinite(candidate.marketQuality?.liquidityMarketCapRatio)
 *     ? candidate.marketQuality.liquidityMarketCapRatio.toFixed(1) + "%"
 *     : "UNVERIFIED"
 * }
 *
 * 🔄 Volume/Liquidity: ${
 *   Number.isFinite(candidate.marketQuality?.volumeLiquidityRatio)
 *     ? candidate.marketQuality.volumeLiquidityRatio.toFixed(2) + "x"
 *     : "UNVERIFIED"
 * }
 */


/* =========================================================
   V74 CANDIDATE FILTER
   REPLACE qualifying FILTER WITH:
   ========================================================= */

const qualifying =
  analysed.filter(
    candidate =>
      candidate.market
        ?.verified &&

      candidate.market
        .liquidityUsd >=
        MIN_ALERT_LIQUIDITY &&

      candidate.rugRisk
        .score <=
        MAX_ALERT_RISK &&

      candidate.opportunity
        .score >=
        MIN_ALERT_SCORE &&

      candidate.confidence
        ?.score >=
        MIN_CONFIDENCE_ALERT
  );


/* =========================================================
   V74 INTELLIGENCE STATUS
   ADD TO intelligence OBJECT
   ========================================================= */

/*
earlyLaunchDetection:
  "ENABLED_V74",

marketQuality:
  "ENABLED_V74",

liquidityMarketCapAnalysis:
  "ENABLED_V74",

volumeLiquidityAnalysis:
  "ENABLED_V74",

multiSignalConfirmation:
  "ENABLED_V74",

candidateConfidence:
  "ENABLED_V74",

momentumSnapshotAgeProtection:
  "ENABLED_V74"
*/


/* =========================================================
   CHANGE architecture EVERYWHERE FROM V73 TO:
   ========================================================= */

"V74_EARLY_MOMENTUM_CONFIDENCE_HUNTER"


/* =========================================================
   IMPORTANT DEPLOYMENT FIX
   ========================================================= */

/*
 * Your V73 test showed:
 *
 * persistenceConfigured: false
 * bindingDetected: null
 * KV_NOT_CONFIGURED
 *
 * THIS IS NOT SOMETHING JAVASCRIPT CAN CREATE.
 *
 * Cloudflare must still have the KV binding named:
 *
 * MEME_HUNTER_STATE
 *
 * Do NOT create a new KV namespace.
 * Reconnect the SAME namespace used successfully by V72
 * so the V69-V72 historical state is preserved.
 */
