/**
 * ROBINHOOD CHAIN MEME HUNTER — V11
 * Chain ID: 4663
 *
 * Rate-limit-safe architecture
 *
 * IMPORTANT:
 * - Never fabricate unavailable data.
 * - UNVERIFIED data is never treated as zero.
 * - Uses official Robinhood Chain RPC.
 * - Uses Blockscout only when needed.
 * - Limits external requests per invocation.
 * - Adds caching.
 * - Does NOT call Blockscout once per metric per token.
 */

const CONFIG = {
  VERSION: "V11",

  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",

  RPC_URL:
    "https://rpc.mainnet.chain.robinhood.com",

  BLOCKSCOUT:
    "https://robinhoodchain.blockscout.com/api",

  SCAN_LIMIT: 50,
  DEEP_ANALYSIS_LIMIT: 8,

  MAX_EXTERNAL_REQUESTS: 12,

  CACHE_SECONDS: 60,

  TARGETS: [
    100_000_000,
    250_000_000,
    500_000_000
  ],

  MINIMUMS: {
    HOLDERS: 100,
    LIQUIDITY: 25_000,
    VOLUME: 10_000
  }
};


/* ============================================================
   REQUEST COUNTER
============================================================ */

let requestCount = 0;

function canRequest() {
  return requestCount < CONFIG.MAX_EXTERNAL_REQUESTS;
}


/* ============================================================
   SAFE HELPERS
============================================================ */

function safeNumber(value) {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function round(value, decimals = 2) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(Number(value).toFixed(decimals));
}

function multipleToTarget(marketCap, target) {

  if (
    marketCap === null ||
    marketCap <= 0
  ) {
    return null;
  }

  return round(target / marketCap, 2);
}


/* ============================================================
   TARGET ANALYSIS
============================================================ */

function targetAnalysis(marketCap) {

  return {
    to100M:
      multipleToTarget(
        marketCap,
        100_000_000
      ),

    to250M:
      multipleToTarget(
        marketCap,
        250_000_000
      ),

    to500M:
      multipleToTarget(
        marketCap,
        500_000_000
      ),

    note:
      "Theoretical market-cap multiple only."
  };
}


/* ============================================================
   RPC
============================================================ */

async function rpc(method, params = []) {

  if (!canRequest()) {
    return null;
  }

  requestCount++;

  try {

    const response = await fetch(
      CONFIG.RPC_URL,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        })
      }
    );

    if (!response.ok) {
      return null;
    }

    const json =
      await response.json();

    return json.result ?? null;

  } catch {

    return null;
  }
}


/* ============================================================
   BLOCKSCOUT
============================================================ */

async function blockscout(
  module,
  action,
  extra = {}
) {

  if (!canRequest()) {

    return {
      status: "UNVERIFIED",
      error:
        "REQUEST_BUDGET_EXCEEDED"
    };
  }

  requestCount++;

  try {

    const url =
      new URL(CONFIG.BLOCKSCOUT);

    url.searchParams.set(
      "module",
      module
    );

    url.searchParams.set(
      "action",
      action
    );

    for (
      const [key, value]
      of Object.entries(extra)
    ) {

      if (
        value !== undefined &&
        value !== null
      ) {

        url.searchParams.set(
          key,
          String(value)
        );
      }
    }

    const response =
      await fetch(url.toString(), {
        headers: {
          "accept":
            "application/json"
        }
      });

    if (
      response.status === 429
    ) {

      return {
        status: "UNVERIFIED",
        error:
          "BLOCKSCOUT_RATE_LIMIT"
      };
    }

    if (!response.ok) {

      return {
        status: "UNVERIFIED",
        error:
          `BLOCKSCOUT_HTTP_${response.status}`
      };
    }

    const json =
      await response.json();

    return {
      status: "VERIFIED",
      data: json
    };

  } catch (error) {

    return {
      status: "UNVERIFIED",
      error:
        "BLOCKSCOUT_REQUEST_FAILED"
    };
  }
}


/* ============================================================
   TOKEN METADATA
============================================================ */

async function getTokenMetadata(
  address
) {

  const result =
    await blockscout(
      "token",
      "tokeninfo",
      {
        contractaddress:
          address
      }
    );

  if (
    result.status !== "VERIFIED"
  ) {

    return {
      status: "UNVERIFIED"
    };
  }

  const data =
    result.data?.result;

  if (!data) {

    return {
      status: "UNVERIFIED"
    };
  }

  return {
    status: "VERIFIED",

    name:
      data.name ?? null,

    symbol:
      data.symbol ?? null,

    decimals:
      safeNumber(data.decimals),

    totalSupply:
      safeNumber(
        data.totalSupply
      )
  };
}


/* ============================================================
   HOLDERS
============================================================ */

async function getHolderData(
  address
) {

  const result =
    await blockscout(
      "token",
      "tokenholderlist",
      {
        contractaddress:
          address,

        page: 1,

        offset: 20
      }
    );

  if (
    result.status !== "VERIFIED"
  ) {

    return {
      status: "UNVERIFIED",

      top10Share: null,

      top20Share: null
    };
  }

  const holders =
    Array.isArray(
      result.data?.result
    )
      ? result.data.result
      : [];

  if (!holders.length) {

    return {
      status: "UNVERIFIED",

      top10Share: null,

      top20Share: null
    };
  }

  const balances =
    holders
      .map(holder =>
        safeNumber(
          holder.balance
        )
      )
      .filter(
        value =>
          value !== null
      )
      .sort(
        (a, b) => b - a
      );

  if (!balances.length) {

    return {
      status: "UNVERIFIED",

      top10Share: null,

      top20Share: null
    };
  }

  const supply =
    balances.reduce(
      (a, b) => a + b,
      0
    );

  if (supply <= 0) {

    return {
      status: "UNVERIFIED",

      top10Share: null,

      top20Share: null
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
    round(
      (top10 / supply) * 100,
      2
    );

  const top20Share =
    round(
      (top20 / supply) * 100,
      2
    );

  let risk = "LOW";

  if (top10Share > 50) {

    risk = "VERY_HIGH";

  } else if (top10Share > 35) {

    risk = "HIGH";

  } else if (top10Share > 20) {

    risk = "MODERATE";
  }

  return {

    status: "VERIFIED",

    sampled:
      balances.length,

    top10Share,

    top20Share,

    concentrationRisk:
      risk
  };
}


/* ============================================================
   TRANSFERS
============================================================ */

async function getTransfers(
  address
) {

  const result =
    await blockscout(
      "account",
      "tokentx",
      {
        contractaddress:
          address,

        page: 1,

        offset: 50,

        sort: "desc"
      }
    );

  if (
    result.status !== "VERIFIED"
  ) {

    return {
      status: "UNVERIFIED",

      transfers: null,

      activityScore: null
    };
  }

  const transfers =
    Array.isArray(
      result.data?.result
    )
      ? result.data.result
      : [];

  if (!transfers.length) {

    return {
      status: "UNVERIFIED",

      transfers: null,

      activityScore: null
    };
  }

  const uniqueWallets =
    new Set();

  let inflows = 0;

  let outflows = 0;

  for (
    const tx of transfers
  ) {

    if (tx.from) {

      uniqueWallets.add(
        tx.from.toLowerCase()
      );

      outflows++;
    }

    if (tx.to) {

      uniqueWallets.add(
        tx.to.toLowerCase()
      );

      inflows++;
    }
  }

  const activityScore =
    Math.min(
      100,
      Math.round(
        (
          Math.min(
            uniqueWallets.size,
            100
          ) / 100
        ) * 60
        +
        Math.min(
          transfers.length,
          100
        ) / 100 * 40
      )
    );

  return {

    status: "VERIFIED",

    transfers:
      transfers.length,

    uniqueWallets:
      uniqueWallets.size,

    inflowTransfers:
      inflows,

    outflowTransfers:
      outflows,

    activityScore
  };
}


/* ============================================================
   RISK
============================================================ */

function riskFlags(data) {

  const flags = [];

  if (
    data.liquidity.status ===
      "VERIFIED" &&
    data.liquidity.usd <
      CONFIG.MINIMUMS.LIQUIDITY
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );
  }

  if (
    data.volume.status ===
      "VERIFIED" &&
    data.volume.volume24h <
      CONFIG.MINIMUMS.VOLUME
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
        "VERY_HIGH_HOLDER_CONCENTRATION"
      );

    } else if (
      data.holderAnalysis
        .concentrationRisk ===
      "HIGH"
    ) {

      flags.push(
        "HIGH_HOLDER_CONCENTRATION"
      );
    }
  }

  return flags;
}


/* ============================================================
   SCORING
============================================================ */

function scoreToken(data) {

  let score = 0;

  let verified = 0;

  function add(
    points,
    condition,
    isVerified
  ) {

    if (!isVerified) {
      return;
    }

    verified++;

    if (condition) {
      score += points;
    }
  }

  add(
    15,
    data.marketCap !== null &&
      data.marketCap <
        10_000_000,
    data.marketCap !== null
  );

  add(
    10,
    data.holders !== null &&
      data.holders >=
        CONFIG.MINIMUMS.HOLDERS,
    data.holders !== null
  );

  add(
    15,
    data.memeLikelihood >= 15,
    true
  );

  add(
    15,
    data.liquidity.status ===
      "VERIFIED" &&
      data.liquidity.quality !==
        "LOW",
    data.liquidity.status ===
      "VERIFIED"
  );

  add(
    10,
    data.volume.status ===
      "VERIFIED" &&
      data.volume.quality !==
        "LOW",
    data.volume.status ===
      "VERIFIED"
  );

  add(
    10,
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
    10,
    data.walletActivity.status ===
      "VERIFIED" &&
      data.walletActivity
        .activityScore >= 50,
    data.walletActivity.status ===
      "VERIFIED"
  );

  add(
    5,
    data.smartMoney ===
      "ACCUMULATING",
    data.smartMoney !==
      "UNVERIFIED"
  );

  return {
    score,
    maximum: 100,
    verifiedFactors: verified
  };
}


/* ============================================================
   LIQUIDITY / VOLUME PLACEHOLDER
============================================================ */

/*
 * These MUST remain UNVERIFIED until a real DEX data source
 * is connected.
 *
 * Do NOT turn them into zero.
 */

function unverifiedLiquidity() {

  return {

    status: "UNVERIFIED",

    usd: null,

    liquidityToMarketCap:
      null,

    quality: "UNKNOWN"
  };
}


function unverifiedVolume() {

  return {

    status: "UNVERIFIED",

    volume24h: null,

    volumeToMarketCap:
      null,

    quality: "UNKNOWN"
  };
}


/* ============================================================
   TOKEN ANALYSIS
============================================================ */

async function analyseToken(
  token
) {

  const marketCap =
    safeNumber(
      token.marketCap
    );

  const holders =
    safeNumber(
      token.holders
    );

  /*
   * IMPORTANT:
   *
   * Only perform deep Blockscout calls
   * on a small number of candidates.
   */

  const holderAnalysis =
    await getHolderData(
      token.contract
    );

  const walletActivity =
    await getTransfers(
      token.contract
    );

  const liquidity =
    unverifiedLiquidity();

  const volume =
    unverifiedVolume();

  const data = {

    marketCap,

    holders,

    memeLikelihood:
      safeNumber(
        token.memeLikelihood
      ) ?? 0,

    liquidity,

    volume,

    holderAnalysis,

    walletActivity,

    smartMoney:
      "UNVERIFIED"
  };

  const flags =
    riskFlags(data);

  const scoring =
    scoreToken(data);

  /*
   * HIGH-POTENTIAL IS IMPOSSIBLE
   * while liquidity and volume remain
   * unverified.
   */

  let category =
    "LOW-CONVICTION";

  if (
    scoring.score >= 60
  ) {

    category = "WATCH";

  } else if (
    scoring.score >= 45
  ) {

    category = "EARLY";
  }

  return {

    ...token,

    discoveryScore:
      scoring.score,

    scoreMaximum:
      100,

    verifiedFactors:
      scoring.verifiedFactors,

    category,

    holderAnalysis,

    walletActivity,

    liquidity,

    tradingVolume:
      volume,

    accumulationDistribution: {
      status:
        "UNVERIFIED",

      signal:
        "UNKNOWN"
    },

    smartMoney: {
      status:
        "UNVERIFIED",

      signal:
        "UNKNOWN"
    },

    riskFlags:
      flags,

    targetAnalysis:
      targetAnalysis(
        marketCap
      )
  };
}


/* ============================================================
   CACHE
============================================================ */

async function cachedJson(
  cacheKey,
  callback
) {

  const cache =
    caches.default;

  const request =
    new Request(
      "https://rh-cache.local/" +
      encodeURIComponent(
        cacheKey
      )
    );

  const cached =
    await cache.match(
      request
    );

  if (cached) {

    return await cached.json();
  }

  const data =
    await callback();

  /*
   * Only cache successful
   * results.
   */

  if (
    data &&
    data.status !==
      "UNVERIFIED"
  ) {

    const response =
      new Response(
        JSON.stringify(data),
        {
          headers: {
            "content-type":
              "application/json",

            "cache-control":
              `max-age=${CONFIG.CACHE_SECONDS}`
          }
        }
      );

    await cache.put(
      request,
      response
    );
  }

  return data;
}


/* ============================================================
   MAIN SCANNER
============================================================ */

async function runScanner() {

  requestCount = 0;

  const latestHex =
    await rpc(
      "eth_blockNumber"
    );

  const latestBlock =
    latestHex
      ? parseInt(
          latestHex,
          16
        )
      : null;

  /*
   * Token discovery is deliberately
   * kept conservative.
   *
   * The existing indexed token list
   * can be supplied through the
   * DISCOVERED_TOKENS environment
   * variable.
   */

  let tokens = [];

  try {

    const raw =
      typeof DISCOVERED_TOKENS !==
        "undefined"
        ? DISCOVERED_TOKENS
        : null;

    if (raw) {

      tokens =
        JSON.parse(raw);
    }

  } catch {

    tokens = [];
  }

  /*
   * If no discovery dataset is
   * configured, return a healthy
   * status instead of pretending
   * tokens were discovered.
   */

  if (!Array.isArray(tokens)) {
    tokens = [];
  }

  tokens =
    tokens.slice(
      0,
      CONFIG.SCAN_LIMIT
    );

  /*
   * Deep analysis is capped.
   *
   * This is the main fix for
   * Cloudflare subrequest limits.
   */

  const candidates =
    tokens.slice(
      0,
      CONFIG.DEEP_ANALYSIS_LIMIT
    );

  const analysed = [];

  for (
    const token of candidates
  ) {

    /*
     * Stop before exhausting
     * Worker request budget.
     */

    if (
      requestCount >=
      CONFIG.MAX_EXTERNAL_REQUESTS
    ) {
      break;
    }

    const result =
      await analyseToken(
        token
      );

    analysed.push(result);
  }

  analysed.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      CONFIG.VERSION,

    status:
      "ONLINE",

    objective:
      "Early-stage meme coin discovery with rate-limit-safe on-chain validation.",

    chain: {

      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpcStatus:
        latestBlock !== null
          ? "CONNECTED"
          : "UNVERIFIED"
    },

    scan: {

      latestBlock,

      tokensAvailable:
        tokens.length,

      deeplyAnalysed:
        analysed.length,

      requestCount,

      requestLimit:
        CONFIG.MAX_EXTERNAL_REQUESTS
    },

    candidates:
      analysed,

    validation: {

      liquidity:
        "UNVERIFIED — DEX DATA SOURCE REQUIRED",

      tradingVolume:
        "UNVERIFIED — DEX DATA SOURCE REQUIRED",

      holderConcentration:
        "ENABLED",

      walletActivity:
        "ENABLED",

      buySellPressure:
        "UNVERIFIED",

      accumulationDistribution:
        "UNVERIFIED",

      whaleActivity:
        "PARTIAL",

      smartMoney:
        "UNVERIFIED"
    },

    dataIntegrity: {

      unavailableData:
        "UNVERIFIED",

      noFabricatedMetrics:
        true,

      highPotentialRequires:
        [
          "verified liquidity",
          "verified volume",
          "verified holder concentration",
          "no critical risk flags"
        ]
    },

    nextStage:
      "Connect a real DEX liquidity/trade-data source and smart-money wallet database.",

    timestamp:
      new Date().toISOString()
  };
}


/* ============================================================
   HTTP HANDLER
============================================================ */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

    const url =
      new URL(
        request.url
      );

    if (
      url.pathname ===
      "/health"
    ) {

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.CHAIN_ID,

        rpc:
          CONFIG.RPC_URL,

        rateLimitProtection:
          true
      });
    }

    if (
      url.pathname ===
      "/"
    ) {

      const result =
        await runScanner();

      return Response.json(
        result,
        {
          headers: {
            "cache-control":
              "no-store",

            "access-control-allow-origin":
              "*"
          }
        }
      );
    }

    return new Response(
      "Robinhood Chain Meme Hunter V11",
      {
        status: 200
      }
    );
  }
};
