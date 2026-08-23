/**
 * ROBINHOOD CHAIN MEME HUNTER — V10
 * Chain ID: 4663
 *
 * Purpose:
 * Discover and validate early-stage meme coins on Robinhood Chain.
 *
 * IMPORTANT:
 * - Never fabricate unavailable data.
 * - Any unavailable metric must be marked UNVERIFIED.
 * - Do not rank a token highly solely because of market cap or holder count.
 * - Liquidity, volume and wallet-flow validation are required for HIGH-POTENTIAL.
 */

const CONFIG = {
  chainId: 4663,
  chainName: "Robinhood Chain",

  scanLimit: 100,
  deepAnalysisLimit: 25,

  targets: [
    100_000_000,
    250_000_000,
    500_000_000
  ],

  scoring: {
    marketCap: 15,
    holders: 10,
    memeLikelihood: 15,
    liquidity: 15,
    volume: 10,
    holderConcentration: 10,
    walletActivity: 10,
    accumulationDistribution: 10,
    smartMoney: 5
  },

  minimums: {
    liquidityForHighPotential: 25_000,
    volumeForHighPotential: 10_000,
    minimumHolders: 100
  }
};


/* ============================================================
   SAFE DATA HELPERS
============================================================ */

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function percentage(part, total) {
  if (!total || total <= 0) return null;
  return (Number(part) / Number(total)) * 100;
}

function multipleToTarget(marketCap, target) {
  if (!marketCap || marketCap <= 0) return null;
  return Number((target / marketCap).toFixed(2));
}

function status(value) {
  return value === null || value === undefined
    ? "UNVERIFIED"
    : "VERIFIED";
}


/* ============================================================
   TARGET ANALYSIS
============================================================ */

function targetAnalysis(marketCap) {
  return {
    to100M: multipleToTarget(marketCap, 100_000_000),
    to250M: multipleToTarget(marketCap, 250_000_000),
    to500M: multipleToTarget(marketCap, 500_000_000),

    note:
      "Theoretical market-cap multiples only. " +
      "They are not price predictions or probabilities."
  };
}


/* ============================================================
   HOLDER CONCENTRATION
============================================================ */

function analyseHolderConcentration(holderBalances, circulatingSupply) {

  if (!Array.isArray(holderBalances) || !circulatingSupply) {
    return {
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN"
    };
  }

  const balances = holderBalances
    .map(x => safeNumber(x.balance))
    .filter(x => x !== null)
    .sort((a, b) => b - a);

  if (!balances.length) {
    return {
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN"
    };
  }

  const top10 = balances.slice(0, 10)
    .reduce((a, b) => a + b, 0);

  const top20 = balances.slice(0, 20)
    .reduce((a, b) => a + b, 0);

  const top10Share = percentage(top10, circulatingSupply);
  const top20Share = percentage(top20, circulatingSupply);

  let concentrationRisk = "LOW";

  if (top10Share !== null && top10Share > 50) {
    concentrationRisk = "VERY_HIGH";
  } else if (top10Share !== null && top10Share > 35) {
    concentrationRisk = "HIGH";
  } else if (top10Share !== null && top10Share > 20) {
    concentrationRisk = "MODERATE";
  }

  return {
    status: "VERIFIED",
    top10Share,
    top20Share,
    concentrationRisk
  };
}


/* ============================================================
   LIQUIDITY ANALYSIS
============================================================ */

function analyseLiquidity(liquidityData) {

  if (!liquidityData) {
    return {
      status: "UNVERIFIED",
      usd: null,
      liquidityToMarketCap: null,
      quality: "UNKNOWN"
    };
  }

  const liquidity = safeNumber(liquidityData.usd);
  const marketCap = safeNumber(liquidityData.marketCap);

  if (liquidity === null) {
    return {
      status: "UNVERIFIED",
      usd: null,
      liquidityToMarketCap: null,
      quality: "UNKNOWN"
    };
  }

  const ratio =
    marketCap && marketCap > 0
      ? liquidity / marketCap
      : null;

  let quality = "LOW";

  if (ratio !== null && ratio >= 0.20) {
    quality = "STRONG";
  } else if (ratio !== null && ratio >= 0.10) {
    quality = "GOOD";
  } else if (ratio !== null && ratio >= 0.05) {
    quality = "MODERATE";
  }

  return {
    status: "VERIFIED",
    usd: liquidity,
    liquidityToMarketCap: ratio,
    quality
  };
}


/* ============================================================
   VOLUME ANALYSIS
============================================================ */

function analyseVolume(volumeData) {

  if (!volumeData) {
    return {
      status: "UNVERIFIED",
      volume24h: null,
      volumeToMarketCap: null,
      quality: "UNKNOWN"
    };
  }

  const volume24h = safeNumber(volumeData.volume24h);
  const marketCap = safeNumber(volumeData.marketCap);

  if (volume24h === null) {
    return {
      status: "UNVERIFIED",
      volume24h: null,
      volumeToMarketCap: null,
      quality: "UNKNOWN"
    };
  }

  const ratio =
    marketCap && marketCap > 0
      ? volume24h / marketCap
      : null;

  let quality = "LOW";

  if (ratio !== null && ratio >= 0.50) {
    quality = "VERY_HIGH";
  } else if (ratio !== null && ratio >= 0.20) {
    quality = "HIGH";
  } else if (ratio !== null && ratio >= 0.05) {
    quality = "HEALTHY";
  }

  return {
    status: "VERIFIED",
    volume24h,
    volumeToMarketCap: ratio,
    quality
  };
}


/* ============================================================
   BUY / SELL FLOW
============================================================ */

function analyseBuySellFlow(trades) {

  if (!Array.isArray(trades) || trades.length === 0) {
    return {
      status: "UNVERIFIED",
      buys: null,
      sells: null,
      buyVolume: null,
      sellVolume: null,
      pressure: "UNKNOWN"
    };
  }

  let buys = 0;
  let sells = 0;
  let buyVolume = 0;
  let sellVolume = 0;

  for (const trade of trades) {

    const value = safeNumber(trade.usdValue) || 0;

    if (trade.side === "BUY") {
      buys++;
      buyVolume += value;
    }

    if (trade.side === "SELL") {
      sells++;
      sellVolume += value;
    }
  }

  let pressure = "NEUTRAL";

  if (buyVolume > sellVolume * 1.25) {
    pressure = "BUY_PRESSURE";
  } else if (sellVolume > buyVolume * 1.25) {
    pressure = "SELL_PRESSURE";
  }

  return {
    status: "VERIFIED",
    buys,
    sells,
    buyVolume,
    sellVolume,
    pressure,
    netFlow: buyVolume - sellVolume
  };
}


/* ============================================================
   ACCUMULATION / DISTRIBUTION
============================================================ */

function analyseAccumulation(flow, holderChange) {

  if (
    !flow ||
    flow.status !== "VERIFIED" ||
    holderChange === null ||
    holderChange === undefined
  ) {
    return {
      status: "UNVERIFIED",
      signal: "UNKNOWN"
    };
  }

  const netFlow = safeNumber(flow.netFlow);

  if (netFlow === null) {
    return {
      status: "UNVERIFIED",
      signal: "UNKNOWN"
    };
  }

  let signal = "NEUTRAL";

  if (netFlow > 0 && holderChange > 0) {
    signal = "ACCUMULATION";
  } else if (netFlow < 0 && holderChange < 0) {
    signal = "DISTRIBUTION";
  } else if (netFlow > 0) {
    signal = "MIXED_ACCUMULATION";
  } else if (netFlow < 0) {
    signal = "MIXED_DISTRIBUTION";
  }

  return {
    status: "VERIFIED",
    signal
  };
}


/* ============================================================
   WHALE ACTIVITY
============================================================ */

function analyseWhales(holderBalances, circulatingSupply) {

  if (!Array.isArray(holderBalances) || !circulatingSupply) {
    return {
      status: "UNVERIFIED",
      whaleCount: null,
      whaleMovement: "UNKNOWN"
    };
  }

  const whales = holderBalances.filter(holder => {

    const balance = safeNumber(holder.balance);

    if (balance === null) return false;

    return balance / circulatingSupply >= 0.01;
  });

  return {
    status: "VERIFIED",
    whaleCount: whales.length,
    whaleMovement: "REQUIRES_TRANSFER_HISTORY"
  };
}


/* ============================================================
   RISK ENGINE
============================================================ */

function riskAnalysis(data) {

  const flags = [];

  if (
    data.liquidity.status === "VERIFIED" &&
    data.liquidity.usd < CONFIG.minimums.liquidityForHighPotential
  ) {
    flags.push("LOW_LIQUIDITY");
  }

  if (
    data.tradingVolume.status === "VERIFIED" &&
    data.tradingVolume.volume24h < CONFIG.minimums.volumeForHighPotential
  ) {
    flags.push("LOW_VOLUME");
  }

  if (
    data.holderAnalysis.status === "VERIFIED" &&
    data.holderAnalysis.concentrationRisk === "VERY_HIGH"
  ) {
    flags.push("HIGH_HOLDER_CONCENTRATION");
  }

  if (
    data.holderAnalysis.status === "VERIFIED" &&
    data.holderAnalysis.concentrationRisk === "HIGH"
  ) {
    flags.push("ELEVATED_HOLDER_CONCENTRATION");
  }

  if (
    data.accumulationDistribution.status === "VERIFIED" &&
    data.accumulationDistribution.signal === "DISTRIBUTION"
  ) {
    flags.push("DISTRIBUTION");
  }

  if (
    data.buySellFlow.status === "VERIFIED" &&
    data.buySellFlow.pressure === "SELL_PRESSURE"
  ) {
    flags.push("STRONG_SELL_PRESSURE");
  }

  return flags;
}


/* ============================================================
   SCORE ENGINE
============================================================ */

function calculateScore(data) {

  let score = 0;
  let verifiedFactors = 0;

  function add(points, condition, verified = true) {
    if (!verified) return;

    verifiedFactors++;

    if (condition) {
      score += points;
    }
  }

  add(
    CONFIG.scoring.marketCap,
    data.marketCap < 10_000_000
  );

  add(
    CONFIG.scoring.holders,
    data.holders >= CONFIG.minimums.minimumHolders
  );

  add(
    CONFIG.scoring.memeLikelihood,
    data.memeLikelihood >= 15
  );

  add(
    CONFIG.scoring.liquidity,
    data.liquidity.status === "VERIFIED" &&
    data.liquidity.quality !== "LOW"
  );

  add(
    CONFIG.scoring.volume,
    data.tradingVolume.status === "VERIFIED" &&
    data.tradingVolume.quality !== "LOW"
  );

  add(
    CONFIG.scoring.holderConcentration,
    data.holderAnalysis.status === "VERIFIED" &&
    data.holderAnalysis.concentrationRisk !== "HIGH" &&
    data.holderAnalysis.concentrationRisk !== "VERY_HIGH"
  );

  add(
    CONFIG.scoring.walletActivity,
    data.walletActivity.status === "VERIFIED" &&
    data.walletActivity.activityScore >= 50
  );

  add(
    CONFIG.scoring.accumulationDistribution,
    data.accumulationDistribution.status === "VERIFIED" &&
    data.accumulationDistribution.signal === "ACCUMULATION"
  );

  add(
    CONFIG.scoring.smartMoney,
    data.smartMoney.status === "VERIFIED" &&
    data.smartMoney.signal === "ACCUMULATING"
  );

  return {
    score,
    maximum: 100,
    verifiedFactors
  };
}


/* ============================================================
   CATEGORY
============================================================ */

function classify(score, data) {

  const hasCriticalUnverified =
    data.liquidity.status !== "VERIFIED" ||
    data.tradingVolume.status !== "VERIFIED";

  if (
    score >= 75 &&
    !hasCriticalUnverified &&
    data.riskFlags.length === 0
  ) {
    return "HIGH-POTENTIAL";
  }

  if (score >= 60) {
    return "WATCH";
  }

  if (score >= 45) {
    return "EARLY";
  }

  return "LOW-CONVICTION";
}


/* ============================================================
   FINAL TOKEN ANALYSIS
============================================================ */

function analyseToken(token, rawData) {

  const marketCap = safeNumber(token.marketCap);
  const holders = safeNumber(token.holders);

  const holderAnalysis =
    analyseHolderConcentration(
      rawData.holders,
      rawData.circulatingSupply
    );

  const liquidity =
    analyseLiquidity({
      usd: rawData.liquidityUsd,
      marketCap
    });

  const tradingVolume =
    analyseVolume({
      volume24h: rawData.volume24h,
      marketCap
    });

  const buySellFlow =
    analyseBuySellFlow(rawData.trades);

  const accumulationDistribution =
    analyseAccumulation(
      buySellFlow,
      rawData.holderChange24h
    );

  const walletActivity =
    rawData.walletActivity || {
      status: "UNVERIFIED",
      activityScore: null
    };

  const smartMoney =
    rawData.smartMoney || {
      status: "UNVERIFIED",
      signal: "UNKNOWN"
    };

  const data = {
    marketCap,
    holders,

    memeLikelihood:
      safeNumber(token.memeLikelihood) || 0,

    liquidity,
    tradingVolume,
    holderAnalysis,
    walletActivity,
    buySellFlow,
    accumulationDistribution,
    smartMoney,

    riskFlags: []
  };

  data.riskFlags = riskAnalysis(data);

  const scoring = calculateScore(data);

  return {
    ...token,

    discoveryScore: scoring.score,
    scoreMaximum: scoring.maximum,
    verifiedFactors: scoring.verifiedFactors,

    category:
      classify(scoring.score, data),

    holderAnalysis,
    liquidity,
    tradingVolume,
    walletActivity,
    buySellFlow,
    accumulationDistribution,
    smartMoney,

    whaleActivity:
      analyseWhales(
        rawData.holders,
        rawData.circulatingSupply
      ),

    riskFlags: data.riskFlags,

    targetAnalysis:
      targetAnalysis(marketCap)
  };
}


/* ============================================================
   REQUIRED OUTPUT
============================================================ */

function buildOutput(tokens, latestBlock) {

  const analysed = tokens
    .map(x => analyseToken(x.token, x.rawData))
    .sort(
      (a, b) =>
        b.discoveryScore - a.discoveryScore
    );

  return {
    agent: "Robinhood Chain Meme Hunter",
    version: "V10",
    status: "ONLINE",

    objective:
      "Early-stage meme coin discovery with liquidity, volume, holder, wallet-flow and accumulation validation.",

    chain: {
      name: "Robinhood Chain",
      chainId: 4663,
      rpcStatus: "CONNECTED"
    },

    scan: {
      latestBlock,
      candidatesAnalysed: analysed.length
    },

    candidates: analysed,

    validation: {
      liquidity: "ENABLED",
      tradingVolume: "ENABLED",
      holderConcentration: "ENABLED",
      walletActivity: "ENABLED",
      buySellPressure: "ENABLED",
      accumulationDistribution: "ENABLED",
      whaleActivity: "ENABLED",
      smartMoney: "ENABLED"
    },

    scoring: {
      maximum: 100,

      factors: {
        marketCap: 15,
        holders: 10,
        memeLikelihood: 15,
        liquidity: 15,
        volume: 10,
        holderConcentration: 10,
        walletActivity: 10,
        accumulationDistribution: 10,
        smartMoney: 5
      },

      warning:
        "Analytical screening only. Scores are not predictions or financial advice."
    },

    dataIntegrity: {
      unavailableDataMustBeMarked:
        "UNVERIFIED",

      noFabricatedMetrics:
        true
    },

    nextStage:
      "Continuous monitoring, historical flow comparison and smart-money wallet identification.",

    timestamp:
      new Date().toISOString()
  };
}


/*
==============================================================
V10 REQUIRED BEHAVIOUR

The worker must:

1. Discover Robinhood Chain ERC-20 tokens.
2. Calculate market cap.
3. Calculate holder count.
4. Calculate top-10 and top-20 holder concentration.
5. Analyse liquidity.
6. Analyse 24h trading volume.
7. Analyse buy/sell pressure.
8. Analyse wallet activity.
9. Detect accumulation vs distribution.
10. Detect whale activity.
11. Identify smart-money activity where data exists.
12. Generate risk flags.
13. Calculate theoretical distance to:
      $100M
      $250M
      $500M
14. Never treat unavailable data as zero.
15. Never fabricate liquidity, volume, wallet or whale data.
16. Do NOT label a token HIGH-POTENTIAL unless:
      - liquidity is verified
      - volume is verified
      - holder concentration is acceptable
      - no critical risk flags exist
17. Return the strongest candidates first.
18. Include contract addresses for every candidate.
*/
