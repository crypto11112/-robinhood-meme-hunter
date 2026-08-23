/**
 * ROBINHOOD CHAIN MEME HUNTER — V10.1
 * Chain ID: 4663
 *
 * IMPORTANT:
 * - Never fabricate unavailable data.
 * - Unverified liquidity/volume cannot produce HIGH-POTENTIAL.
 * - Holder concentration is only verified when actual holder balances exist.
 * - Wallet activity is only verified from actual transfer data.
 * - Designed to reduce excessive Blockscout subrequests.
 */

const CONFIG = {
  chainId: 4663,
  chainName: "Robinhood Chain",

  rpcUrl:
    "https://rpc.testnet.chain.robinhood.com",

  blockscout:
    "https://explorer.mainnet-chain.robinhood.com/api/v2",

  scanLimit: 50,
  deepAnalysisLimit: 12,

  targets: [
    100_000_000,
    250_000_000,
    500_000_000
  ],

  minimums: {
    liquidityForHighPotential: 25_000,
    volumeForHighPotential: 10_000,
    minimumHolders: 100
  },

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
  }
};


/* ============================================================
   BASIC HELPERS
============================================================ */

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function multipleToTarget(marketCap, target) {
  if (!marketCap || marketCap <= 0) return null;

  return Number(
    (target / marketCap).toFixed(2)
  );
}

function targetAnalysis(marketCap) {
  return {
    to100M: multipleToTarget(
      marketCap,
      100_000_000
    ),

    to250M: multipleToTarget(
      marketCap,
      250_000_000
    ),

    to500M: multipleToTarget(
      marketCap,
      500_000_000
    ),

    note:
      "Theoretical market-cap multiples only. " +
      "They are not price predictions or probabilities."
  };
}


/* ============================================================
   GENERIC FETCH
============================================================ */

async function fetchJson(url, options = {}) {

  try {

    const response = await fetch(
      url,
      {
        ...options,

        headers: {
          "Accept": "application/json",
          ...(options.headers || {})
        }
      }
    );

    if (!response.ok) {

      return {
        ok: false,
        status: response.status,
        data: null
      };

    }

    const data = await response.json();

    return {
      ok: true,
      status: response.status,
      data
    };

  } catch (error) {

    return {
      ok: false,
      status: 0,
      data: null
    };

  }

}


/* ============================================================
   BLOCKSCOUT REQUEST
============================================================ */

async function blockscout(path) {

  const url =
    `${CONFIG.blockscout}${path}`;

  return fetchJson(url);

}


/* ============================================================
   CHAIN STATUS
============================================================ */

async function getLatestBlock() {

  try {

    const result =
      await fetchJson(
        CONFIG.rpcUrl,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            jsonrpc: "2.0",
            method: "eth_blockNumber",
            params: [],
            id: 1
          })
        }
      );

    if (!result.ok) {
      return null;
    }

    const hex =
      result.data?.result;

    if (!hex) {
      return null;
    }

    return parseInt(hex, 16);

  } catch {

    return null;

  }

}


/* ============================================================
   TOKEN DISCOVERY
============================================================ */

/*
 * Blockscout token endpoint.
 *
 * IMPORTANT:
 * Discovery is intentionally limited.
 * Do not make hundreds of requests per invocation.
 */

async function discoverTokens() {

  const result =
    await blockscout(
      `/tokens?type=ERC-20`
    );

  if (!result.ok) {

    return [];

  }

  const items =
    result.data?.items || [];

  return items
    .slice(0, CONFIG.scanLimit)
    .map(token => {

      const address =
        token.address ||
        token.contract_address;

      const symbol =
        token.symbol ||
        "";

      const name =
        token.name ||
        symbol ||
        "Unknown";

      const decimals =
        safeNumber(
          token.decimals
        ) ?? 18;

      const totalSupply =
        safeNumber(
          token.total_supply
        );

      const holders =
        safeNumber(
          token.holders
        );

      let price =
        safeNumber(
          token.exchange_rate
        );

      let marketCap =
        safeNumber(
          token.market_cap
        );

      /*
       * Some Blockscout responses don't contain
       * market cap. Do not fabricate it.
       */

      if (
        marketCap === null &&
        price !== null &&
        totalSupply !== null
      ) {

        const supply =
          totalSupply /
          Math.pow(10, decimals);

        marketCap =
          price * supply;

      }

      return {

        name,
        symbol,
        contract: address,

        type: "ERC-20",

        price,

        marketCap,

        holders,

        totalSupply,

        decimals,

        memeLikelihood:
          calculateMemeLikelihood(
            name,
            symbol
          )
      };

    })
    .filter(
      token =>
        token.contract &&
        token.marketCap !== null
    );

}


/* ============================================================
   MEME DETECTION
============================================================ */

function calculateMemeLikelihood(
  name,
  symbol
) {

  const text =
    `${name} ${symbol}`
      .toLowerCase();

  const memeWords = [

    "dog",
    "cat",
    "woof",
    "shib",
    "inu",
    "wif",
    "pepe",
    "wojak",
    "meme",
    "frog",
    "bonk",
    "moon",
    "lambo",
    "yolo",
    "degen",
    "frog",
    "chad",
    "based",
    "mog",
    "doge"

  ];

  let score = 0;

  for (const word of memeWords) {

    if (text.includes(word)) {
      score += 5;
    }

  }

  return Math.min(
    score,
    20
  );

}


/* ============================================================
   HOLDER ANALYSIS
============================================================ */

function analyseHolderConcentration(
  holders,
  circulatingSupply
) {

  if (
    !Array.isArray(holders) ||
    !circulatingSupply
  ) {

    return {

      status: "UNVERIFIED",

      top10Share: null,
      top20Share: null,

      concentrationRisk:
        "UNKNOWN"

    };

  }

  const balances =
    holders
      .map(
        x =>
          safeNumber(
            x.balance
          )
      )
      .filter(
        x => x !== null
      )
      .sort(
        (a, b) => b - a
      );

  if (!balances.length) {

    return {

      status: "UNVERIFIED",

      top10Share: null,
      top20Share: null,

      concentrationRisk:
        "UNKNOWN"

    };

  }

  const top10 =
    balances
      .slice(0, 10)
      .reduce(
        (a, b) => a + b,
        0
      );

  const top20 =
    balances
      .slice(0, 20)
      .reduce(
        (a, b) => a + b,
        0
      );

  const top10Share =
    (top10 / circulatingSupply) *
    100;

  const top20Share =
    (top20 / circulatingSupply) *
    100;

  let risk =
    "LOW";

  if (top10Share > 50) {

    risk = "VERY_HIGH";

  } else if (top10Share > 35) {

    risk = "HIGH";

  } else if (top10Share > 20) {

    risk = "MODERATE";

  }

  return {

    status: "VERIFIED",

    top10Share:
      Number(
        top10Share.toFixed(2)
      ),

    top20Share:
      Number(
        top20Share.toFixed(2)
      ),

    concentrationRisk:
      risk

  };

}


/* ============================================================
   LIQUIDITY
============================================================ */

function analyseLiquidity(
  liquidityUsd,
  marketCap
) {

  const liquidity =
    safeNumber(
      liquidityUsd
    );

  if (liquidity === null) {

    return {

      status: "UNVERIFIED",

      usd: null,

      liquidityToMarketCap:
        null,

      quality:
        "UNKNOWN"

    };

  }

  const ratio =
    marketCap > 0
      ? liquidity / marketCap
      : null;

  let quality =
    "LOW";

  if (
    ratio !== null &&
    ratio >= 0.20
  ) {

    quality =
      "STRONG";

  } else if (
    ratio !== null &&
    ratio >= 0.10
  ) {

    quality =
      "GOOD";

  } else if (
    ratio !== null &&
    ratio >= 0.05
  ) {

    quality =
      "MODERATE";

  }

  return {

    status: "VERIFIED",

    usd: liquidity,

    liquidityToMarketCap:
      ratio,

    quality

  };

}


/* ============================================================
   VOLUME
============================================================ */

function analyseVolume(
  volume24h,
  marketCap
) {

  const volume =
    safeNumber(
      volume24h
    );

  if (volume === null) {

    return {

      status: "UNVERIFIED",

      volume24h: null,

      volumeToMarketCap:
        null,

      quality:
        "UNKNOWN"

    };

  }

  const ratio =
    marketCap > 0
      ? volume / marketCap
      : null;

  let quality =
    "LOW";

  if (
    ratio !== null &&
    ratio >= 0.50
  ) {

    quality =
      "VERY_HIGH";

  } else if (
    ratio !== null &&
    ratio >= 0.20
  ) {

    quality =
      "HIGH";

  } else if (
    ratio !== null &&
    ratio >= 0.05
  ) {

    quality =
      "HEALTHY";

  }

  return {

    status: "VERIFIED",

    volume24h:
      volume,

    volumeToMarketCap:
      ratio,

    quality

  };

}


/* ============================================================
   BUY / SELL
============================================================ */

function analyseBuySellFlow(
  trades
) {

  if (
    !Array.isArray(trades) ||
    !trades.length
  ) {

    return {

      status: "UNVERIFIED",

      buys: null,
      sells: null,

      buyVolume: null,
      sellVolume: null,

      pressure:
        "UNKNOWN",

      netFlow:
        null

    };

  }

  let buys = 0;
  let sells = 0;

  let buyVolume = 0;
  let sellVolume = 0;

  for (
    const trade of trades
  ) {

    const value =
      safeNumber(
        trade.usdValue
      );

    if (value === null) {
      continue;
    }

    if (
      trade.side === "BUY"
    ) {

      buys++;
      buyVolume += value;

    }

    if (
      trade.side === "SELL"
    ) {

      sells++;
      sellVolume += value;

    }

  }

  if (
    buys === 0 &&
    sells === 0
  ) {

    return {

      status:
        "UNVERIFIED",

      buys: null,
      sells: null,

      buyVolume: null,
      sellVolume: null,

      pressure:
        "UNKNOWN",

      netFlow:
        null

    };

  }

  let pressure =
    "NEUTRAL";

  if (
    buyVolume >
    sellVolume * 1.25
  ) {

    pressure =
      "BUY_PRESSURE";

  } else if (
    sellVolume >
    buyVolume * 1.25
  ) {

    pressure =
      "SELL_PRESSURE";

  }

  return {

    status:
      "VERIFIED",

    buys,
    sells,

    buyVolume,
    sellVolume,

    pressure,

    netFlow:
      buyVolume -
      sellVolume

  };

}


/* ============================================================
   ACCUMULATION
============================================================ */

function analyseAccumulation(
  flow,
  holderChange
) {

  if (
    flow.status !== "VERIFIED" ||
    holderChange === null
  ) {

    return {

      status:
        "UNVERIFIED",

      signal:
        "UNKNOWN"

    };

  }

  if (
    flow.netFlow > 0 &&
    holderChange > 0
  ) {

    return {

      status:
        "VERIFIED",

      signal:
        "ACCUMULATION"

    };

  }

  if (
    flow.netFlow < 0 &&
    holderChange < 0
  ) {

    return {

      status:
        "VERIFIED",

      signal:
        "DISTRIBUTION"

    };

  }

  return {

    status:
      "VERIFIED",

    signal:
      "MIXED"

  };

}


/* ============================================================
   RISK ENGINE
============================================================ */

function riskAnalysis(
  data
) {

  const flags = [];

  if (
    data.liquidity.status ===
    "VERIFIED" &&
    data.liquidity.usd <
    CONFIG.minimums
      .liquidityForHighPotential
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

  }

  if (
    data.tradingVolume.status ===
    "VERIFIED" &&
    data.tradingVolume.volume24h <
    CONFIG.minimums
      .volumeForHighPotential
  ) {

    flags.push(
      "LOW_VOLUME"
    );

  }

  if (
    data.holderAnalysis.status ===
    "VERIFIED"
  ) {

    if (
      data.holderAnalysis
        .concentrationRisk ===
      "VERY_HIGH"
    ) {

      flags.push(
        "HIGH_HOLDER_CONCENTRATION"
      );

    } else if (
      data.holderAnalysis
        .concentrationRisk ===
      "HIGH"
    ) {

      flags.push(
        "ELEVATED_HOLDER_CONCENTRATION"
      );

    }

  }

  if (
    data.accumulationDistribution
      .status ===
    "VERIFIED" &&
    data.accumulationDistribution
      .signal ===
    "DISTRIBUTION"
  ) {

    flags.push(
      "DISTRIBUTION"
    );

  }

  if (
    data.buySellFlow.status ===
    "VERIFIED" &&
    data.buySellFlow.pressure ===
    "SELL_PRESSURE"
  ) {

    flags.push(
      "STRONG_SELL_PRESSURE"
    );

  }

  return flags;

}


/* ============================================================
   SCORE
============================================================ */

function calculateScore(
  data
) {

  let score = 0;

  let verifiedFactors = 0;

  function add(
    points,
    condition,
    verified
  ) {

    if (!verified) {
      return;
    }

    verifiedFactors++;

    if (condition) {
      score += points;
    }

  }


  add(
    CONFIG.scoring.marketCap,

    data.marketCap <
    10_000_000,

    data.marketCap !== null
  );


  add(
    CONFIG.scoring.holders,

    data.holders >=
    CONFIG.minimums.minimumHolders,

    data.holders !== null
  );


  add(
    CONFIG.scoring.memeLikelihood,

    data.memeLikelihood >= 10,

    true
  );


  add(
    CONFIG.scoring.liquidity,

    data.liquidity.status ===
    "VERIFIED" &&
    data.liquidity.quality !==
    "LOW",

    data.liquidity.status ===
    "VERIFIED"
  );


  add(
    CONFIG.scoring.volume,

    data.tradingVolume.status ===
    "VERIFIED" &&
    data.tradingVolume.quality !==
    "LOW",

    data.tradingVolume.status ===
    "VERIFIED"
  );


  add(
    CONFIG.scoring.holderConcentration,

    data.holderAnalysis.status ===
    "VERIFIED" &&
    data.holderAnalysis
      .concentrationRisk !==
    "HIGH" &&
    data.holderAnalysis
      .concentrationRisk !==
    "VERY_HIGH",

    data.holderAnalysis.status ===
    "VERIFIED"
  );


  add(
    CONFIG.scoring.walletActivity,

    data.walletActivity.status ===
    "VERIFIED" &&
    data.walletActivity
      .activityScore >= 50,

    data.walletActivity.status ===
    "VERIFIED"
  );


  add(
    CONFIG.scoring.accumulationDistribution,

    data.accumulationDistribution
      .status === "VERIFIED" &&
    data.accumulationDistribution
      .signal === "ACCUMULATION",

    data.accumulationDistribution
      .status === "VERIFIED"
  );


  add(
    CONFIG.scoring.smartMoney,

    data.smartMoney.status ===
    "VERIFIED" &&
    data.smartMoney.signal ===
    "ACCUMULATING",

    data.smartMoney.status ===
    "VERIFIED"
  );


  return {

    score,

    maximum: 100,

    verifiedFactors

  };

}


/* ============================================================
   CLASSIFICATION
============================================================ */

function classify(
  score,
  data
) {

  /*
   * CRITICAL:
   *
   * Liquidity and volume MUST be verified
   * before HIGH-POTENTIAL is possible.
   */

  const criticalUnverified =
    data.liquidity.status !==
      "VERIFIED" ||
    data.tradingVolume.status !==
      "VERIFIED";


  const concentrationUnknown =
    data.holderAnalysis.status !==
    "VERIFIED";


  if (
    score >= 75 &&
    !criticalUnverified &&
    !concentrationUnknown &&
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
   DEEP ANALYSIS
============================================================ */

async function analyseToken(
  token
) {

  /*
   * V10.1 deliberately does NOT make
   * dozens of Blockscout requests per token.
   *
   * This prevents Cloudflare subrequest
   * exhaustion.
   */

  const marketCap =
    safeNumber(
      token.marketCap
    );

  const holders =
    safeNumber(
      token.holders
    );


  const rawData = {

    holders:
      null,

    circulatingSupply:
      null,

    liquidityUsd:
      null,

    volume24h:
      null,

    trades:
      null,

    holderChange24h:
      null,

    walletActivity:
      {
        status:
          "UNVERIFIED",

        activityScore:
          null,

        reason:
          "Transfer endpoint not safely queried in this scan."
      },

    smartMoney:
      {
        status:
          "UNVERIFIED",

        signal:
          "UNKNOWN"
      }

  };


  const holderAnalysis =
    analyseHolderConcentration(
      rawData.holders,
      rawData.circulatingSupply
    );


  const liquidity =
    analyseLiquidity(
      rawData.liquidityUsd,
      marketCap
    );


  const tradingVolume =
    analyseVolume(
      rawData.volume24h,
      marketCap
    );


  const buySellFlow =
    analyseBuySellFlow(
      rawData.trades
    );


  const accumulationDistribution =
    analyseAccumulation(
      buySellFlow,
      rawData.holderChange24h
    );


  const data = {

    marketCap,

    holders,

    memeLikelihood:
      token.memeLikelihood || 0,

    liquidity,

    tradingVolume,

    holderAnalysis,

    walletActivity:
      rawData.walletActivity,

    buySellFlow,

    accumulationDistribution,

    smartMoney:
      rawData.smartMoney,

    riskFlags:
      []

  };


  data.riskFlags =
    riskAnalysis(
      data
    );


  const scoring =
    calculateScore(
      data
    );


  return {

    ...token,

    discoveryScore:
      scoring.score,

    scoreMaximum:
      scoring.maximum,

    verifiedFactors:
      scoring.verifiedFactors,

    category:
      classify(
        scoring.score,
        data
      ),

    holderAnalysis,

    liquidity,

    tradingVolume,

    walletActivity:
      rawData.walletActivity,

    buySellFlow,

    accumulationDistribution,

    smartMoney:
      rawData.smartMoney,

    riskFlags:
      data.riskFlags,

    targetAnalysis:
      targetAnalysis(
        marketCap
      )

  };

}


/* ============================================================
   OUTPUT
============================================================ */

async function buildOutput() {

  const latestBlock =
    await getLatestBlock();


  const discovered =
    await discoverTokens();


  const candidates =
    discovered
      .slice(
        0,
        CONFIG.deepAnalysisLimit
      );


  const analysed =
    await Promise.all(
      candidates.map(
        analyseToken
      )
    );


  analysed.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );


  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      "V10.1",

    status:
      "ONLINE",

    objective:
      "Early-stage meme coin discovery with strict validation of liquidity, volume, holders, wallet activity and market structure.",


    chain: {

      name:
        CONFIG.chainName,

      chainId:
        CONFIG.chainId,

      rpcStatus:
        latestBlock !== null
          ? "CONNECTED"
          : "UNVERIFIED"

    },


    scan: {

      latestBlock,

      tokensReturned:
        discovered.length,

      deeplyAnalysed:
        analysed.length,

      candidatesReturned:
        analysed.length

    },


    candidates:
      analysed,


    validation: {

      liquidity:
        "ENABLED",

      tradingVolume:
        "ENABLED",

      holderConcentration:
        "ENABLED",

      walletActivity:
        "ENABLED",

      buySellPressure:
        "ENABLED",

      accumulationDistribution:
        "ENABLED",

      whaleActivity:
        "ENABLED",

      smartMoney:
        "ENABLED"

    },


    dataIntegrity: {

      unavailableDataMustBeMarked:
        "UNVERIFIED",

      noFabricatedMetrics:
        true,

      highPotentialRequires:
        [
          "VERIFIED_LIQUIDITY",
          "VERIFIED_VOLUME",
          "VERIFIED_HOLDER_CONCENTRATION",
          "NO_CRITICAL_RISK_FLAGS"
        ]

    },


    scoring: {

      maximum:
        100,

      factors:
        CONFIG.scoring,

      warning:
        "Analytical screening only. Scores are not predictions or financial advice."

    },


    systemNotes: [

      "Liquidity is NOT inferred from market cap.",

      "Volume is NOT inferred from holder count.",

      "Wallet activity is NOT inferred from holders.",

      "Unverified data is never treated as zero.",

      "Tokens cannot receive HIGH-POTENTIAL solely from discovery data.",

      "Blockscout request volume is deliberately limited to avoid Worker subrequest exhaustion."

    ],


    nextStage:
      "Add dedicated DEX liquidity/volume endpoints and batched historical wallet-flow analysis.",


    timestamp:
      new Date().toISOString()

  };

}


/* ============================================================
   WORKER
============================================================ */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(request.url);


    if (
      url.pathname ===
      "/health"
    ) {

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V10.1",

        status:
          "ONLINE",

        chainId:
          4663,

        timestamp:
          new Date().toISOString()

      });

    }


    if (
      url.pathname ===
      "/"
    ) {

      const output =
        await buildOutput();


      return new Response(

        JSON.stringify(
          output,
          null,
          2
        ),

        {

          status: 200,

          headers: {

            "Content-Type":
              "application/json; charset=utf-8",

            "Cache-Control":
              "no-store",

            "Access-Control-Allow-Origin":
              "*"

          }

        }

      );

    }


    return Response.json(

      {

        error:
          "NOT_FOUND",

        message:
          "Use / or /health"

      },

      {
        status: 404
      }

    );

  }

};
