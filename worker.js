/**
 * ============================================================
 * ROBINHOOD CHAIN MEME HUNTER — V12
 * Chain ID: 4663
 *
 * PURPOSE
 * Discover early-stage meme coins on Robinhood Chain using:
 *
 *   1. DEX Screener discovery + market data
 *   2. Robinhood Chain RPC
 *   3. Blockscout on-chain holder/transfer data
 *
 * IMPORTANT
 * ------------------------------------------------------------
 * - Never fabricate unavailable data.
 * - UNVERIFIED is never treated as zero.
 * - HIGH-POTENTIAL requires verified liquidity + volume.
 * - DEX Screener is used for real DEX market data.
 * - Blockscout is used selectively to reduce rate limits.
 * - Deep analysis is limited.
 * - Contract addresses are always returned.
 * - Target calculations are theoretical multiples only.
 * ============================================================
 */
const CONFIG = {
  VERSION: "V12",
  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",
  DEX_CHAIN_ID: "robinhood",
  RPC_URL:
    "https://rpc.mainnet.chain.robinhood.com",
  BLOCKSCOUT:
    "https://robinhoodchain.blockscout.com/api",
  DEXSCREENER:
    "https://api.dexscreener.com",
  SCAN_LIMIT: 100,
  DEEP_ANALYSIS_LIMIT: 10,
  MAX_EXTERNAL_REQUESTS: 18,
  TARGETS: [
    100_000_000,
    250_000_000,
    500_000_000
  ],
  MINIMUMS: {
    HOLDERS: 100,
    LIQUIDITY: 25_000,
    VOLUME_24H: 10_000
  },
  HIGH_POTENTIAL_SCORE: 75
};
/* ============================================================
   REQUEST CONTROL
============================================================ */
let requestCount = 0;
function canRequest() {
  return (
    requestCount <
    CONFIG.MAX_EXTERNAL_REQUESTS
  );
}
/* ============================================================
   SAFE HELPERS
============================================================ */
function safeNumber(value) {
  const n =
    Number(value);
  return Number.isFinite(n)
    ? n
    : null;
}
function round(
  value,
  decimals = 2
) {
  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }
  return Number(
    Number(value)
      .toFixed(decimals)
  );
}
function multipleToTarget(
  marketCap,
  target
) {
  if (
    marketCap === null ||
    marketCap <= 0
  ) {
    return null;
  }
  return round(
    target / marketCap,
    2
  );
}
/* ============================================================
   TARGET ANALYSIS
============================================================ */
function targetAnalysis(
  marketCap
) {
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
      "Theoretical market-cap multiple only. " +
      "Not a price prediction or probability."
  };
}
/* ============================================================
   GENERIC FETCH
============================================================ */
async function externalFetch(
  url,
  options = {}
) {
  if (!canRequest()) {
    return {
      status:
        "UNVERIFIED",
      error:
        "REQUEST_BUDGET_EXCEEDED"
    };
  }
  requestCount++;
  try {
    const response =
      await fetch(
        url,
        options
      );
    if (!response.ok) {
      return {
        status:
          "UNVERIFIED",
        error:
          `HTTP_${response.status}`
      };
    }
    const data =
      await response.json();
    return {
      status:
        "VERIFIED",
      data
    };
  } catch {
    return {
      status:
        "UNVERIFIED",
      error:
        "REQUEST_FAILED"
    };
  }
}
/* ============================================================
   RPC
============================================================ */
async function rpc(
  method,
  params = []
) {
  if (!canRequest()) {
    return null;
  }
  requestCount++;
  try {
    const response =
      await fetch(
        CONFIG.RPC_URL,
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
            })
        }
      );
    if (!response.ok) {
      return null;
    }
    const json =
      await response.json();
    return (
      json.result ??
      null
    );
  } catch {
    return null;
  }
}
/* ============================================================
   DEX SCREENER DISCOVERY
============================================================ */
/*
 * DEX Screener exposes latest token profiles and boosted tokens.
 *
 * We filter everything down to Robinhood Chain.
 *
 * This gives the worker a continuously changing discovery pool
 * without relying on a manually supplied DISCOVERED_TOKENS list.
 */
async function discoverFromDexScreener() {
  const discovered =
    new Map();
  /* ----------------------------------------------------------
     Latest token profiles
  ---------------------------------------------------------- */
  const profiles =
    await externalFetch(
      CONFIG.DEXSCREENER +
      "/token-profiles/latest/v1"
    );
  if (
    profiles.status ===
    "VERIFIED"
  ) {
    const list =
      Array.isArray(
        profiles.data
      )
        ? profiles.data
        : [];
    for (
      const item of list
    ) {
      if (
        String(
          item.chainId
        ).toLowerCase() !==
        CONFIG.DEX_CHAIN_ID
      ) {
        continue;
      }
      if (
        !item.tokenAddress
      ) {
        continue;
      }
      discovered.set(
        item.tokenAddress
          .toLowerCase(),
        {
          contract:
            item.tokenAddress,
          name:
            null,
          symbol:
            null,
          source:
            "DEXSCREENER_PROFILE",
          profile:
            item
        }
      );
    }
  }
  /* ----------------------------------------------------------
     Latest boosts
  ---------------------------------------------------------- */
  if (canRequest()) {
    const boosts =
      await externalFetch(
        CONFIG.DEXSCREENER +
        "/token-boosts/latest/v1"
      );
    if (
      boosts.status ===
      "VERIFIED"
    ) {
      const list =
        Array.isArray(
          boosts.data
        )
          ? boosts.data
          : [];
      for (
        const item of list
      ) {
        if (
          String(
            item.chainId
          ).toLowerCase() !==
          CONFIG.DEX_CHAIN_ID
        ) {
          continue;
        }
        if (
          !item.tokenAddress
        ) {
          continue;
        }
        const key =
          item.tokenAddress
            .toLowerCase();
        const existing =
          discovered.get(key);
        if (existing) {
          existing.boosts = {
            active:
              safeNumber(
                item.amount
              ),
            total:
              safeNumber(
                item.totalAmount
              )
          };
        } else {
          discovered.set(
            key,
            {
              contract:
                item.tokenAddress,
              name:
                null,
              symbol:
                null,
              source:
                "DEXSCREENER_BOOST",
              boosts: {
                active:
                  safeNumber(
                    item.amount
                  ),
                total:
                  safeNumber(
                    item.totalAmount
                  )
              }
            }
          );
        }
      }
    }
  }
  return Array.from(
    discovered.values()
  );
}
/* ============================================================
   DEX MARKET DATA
============================================================ */
function analyseDexPairs(
  pairs,
  contract
) {
  if (
    !Array.isArray(pairs) ||
    !pairs.length
  ) {
    return {
      status:
        "UNVERIFIED",
      liquidity:
        null,
      volume24h:
        null,
      buys24h:
        null,
      sells24h:
        null,
      buyVolume24h:
        null,
      sellVolume24h:
        null,
      marketCap:
        null,
      fdv:
        null,
      priceUsd:
        null,
      pairAgeHours:
        null,
      dex:
        null,
      pairAddress:
        null,
      url:
        null
    };
  }
  /*
   * Only consider actual Robinhood Chain pairs
   * containing the requested token.
   */
  const valid =
    pairs.filter(
      pair =>
        String(
          pair.chainId
        ).toLowerCase() ===
        CONFIG.DEX_CHAIN_ID
    );
  if (!valid.length) {
    return {
      status:
        "UNVERIFIED"
    };
  }
  /*
   * Select the strongest liquid pair.
   *
   * Liquidity is preferred over raw volume because
   * tiny pools can generate misleading volume ratios.
   */
  valid.sort(
    (a, b) => {
      const la =
        safeNumber(
          a?.liquidity?.usd
        ) || 0;
      const lb =
        safeNumber(
          b?.liquidity?.usd
        ) || 0;
      return lb - la;
    }
  );
  const pair =
    valid[0];
  const liquidity =
    safeNumber(
      pair?.liquidity?.usd
    );
  const volume24h =
    safeNumber(
      pair?.volume?.h24
    );
  const txns24h =
    pair?.txns?.h24 || {};
  const buys24h =
    safeNumber(
      txns24h.buys
    );
  const sells24h =
    safeNumber(
      txns24h.sells
    );
  /*
   * DEX Screener supplies transaction counts,
   * but not necessarily USD buy/sell volume separately
   * in every response version.
   *
   * Therefore we do NOT invent buy/sell USD volume.
   */
  const buySellPressure =
    (
      buys24h !== null &&
      sells24h !== null
    )
      ? (
          buys24h >
          sells24h * 1.25
            ? "BUY_PRESSURE"
            : sells24h >
              buys24h * 1.25
                ? "SELL_PRESSURE"
                : "NEUTRAL"
        )
      : "UNVERIFIED";
  const marketCap =
    safeNumber(
      pair.marketCap
    );
  const fdv =
    safeNumber(
      pair.fdv
    );
  const priceUsd =
    safeNumber(
      pair.priceUsd
    );
  let pairAgeHours =
    null;
  const pairCreatedAt =
    safeNumber(
      pair.pairCreatedAt
    );
  if (
    pairCreatedAt !== null
  ) {
    pairAgeHours =
      Math.max(
        0,
        (
          Date.now() -
          pairCreatedAt
        ) /
        3_600_000
      );
  }
  let liquidityQuality =
    "LOW";
  if (
    liquidity !== null
  ) {
    if (
      liquidity >= 100_000
    ) {
      liquidityQuality =
        "STRONG";
    } else if (
      liquidity >= 50_000
    ) {
      liquidityQuality =
        "GOOD";
    } else if (
      liquidity >=
      CONFIG.MINIMUMS.LIQUIDITY
    ) {
      liquidityQuality =
        "MODERATE";
    }
  }
  let volumeQuality =
    "LOW";
  if (
    volume24h !== null
  ) {
    if (
      volume24h >= 100_000
    ) {
      volumeQuality =
        "VERY_HIGH";
    } else if (
      volume24h >= 50_000
    ) {
      volumeQuality =
        "HIGH";
    } else if (
      volume24h >=
      CONFIG.MINIMUMS.VOLUME_24H
    ) {
      volumeQuality =
        "HEALTHY";
    }
  }
  return {
    status:
      "VERIFIED",
    liquidity:
      liquidity !== null
        ? {
            status:
              "VERIFIED",
            usd:
              liquidity,
            quality:
              liquidityQuality
          }
        : {
            status:
              "UNVERIFIED",
            usd:
              null,
            quality:
              "UNKNOWN"
          },
    volume24h:
      volume24h,
    volumeQuality,
    buys24h,
    sells24h,
    buySellPressure,
    marketCap,
    fdv,
    priceUsd,
    pairAgeHours:
      round(
        pairAgeHours,
        2
      ),
    dex:
      pair.dexId ??
      null,
    pairAddress:
      pair.pairAddress ??
      null,
    url:
      pair.url ??
      null,
    pairsFound:
      valid.length
  };
}
/* ============================================================
   GET DEX DATA FOR TOKEN
============================================================ */
async function getDexData(
  contract
) {
  const url =
    CONFIG.DEXSCREENER +
    "/tokens/v1/" +
    CONFIG.DEX_CHAIN_ID +
    "/" +
    encodeURIComponent(
      contract
    );
  const result =
    await externalFetch(
      url
    );
  if (
    result.status !==
    "VERIFIED"
  ) {
    return {
      status:
        "UNVERIFIED",
      error:
        result.error ??
        "DEX_REQUEST_FAILED"
    };
  }
  return analyseDexPairs(
    result.data,
    contract
  );
}
/* ============================================================
   BLOCKSCOUT HOLDERS
============================================================ */
async function getHolderData(
  address
) {
  const url =
    CONFIG.BLOCKSCOUT +
    "?module=token" +
    "&action=tokenholderlist" +
    "&contractaddress=" +
    encodeURIComponent(
      address
    ) +
    "&page=1" +
    "&offset=20";
  const result =
    await externalFetch(
      url
    );
  if (
    result.status !==
    "VERIFIED"
  ) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      error:
        result.error
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
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null
    };
  }
  const balances =
    holders
      .map(
        holder =>
          safeNumber(
            holder.balance
          )
      )
      .filter(
        value =>
          value !== null
      )
      .sort(
        (a, b) =>
          b - a
      );
  if (!balances.length) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null
    };
  }
  /*
   * IMPORTANT:
   *
   * Do NOT divide top holders by the sum
   * of the sampled holders.
   *
   * That would falsely make the sampled
   * top 10 appear to own 100%+ of supply.
   *
   * We therefore require total supply.
   */
  const totalSupply =
    safeNumber(
      result.data?.totalSupply
    );
  if (
    totalSupply === null ||
    totalSupply <= 0
  ) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      sampled:
        balances.length,
      reason:
        "TOTAL_SUPPLY_REQUIRED"
    };
  }
  const top10 =
    balances
      .slice(0, 10)
      .reduce(
        (a, b) =>
          a + b,
        0
      );
  const top20 =
    balances
      .slice(0, 20)
      .reduce(
        (a, b) =>
          a + b,
        0
      );
  const top10Share =
    round(
      (
        top10 /
        totalSupply
      ) * 100,
      2
    );
  const top20Share =
    round(
      (
        top20 /
        totalSupply
      ) * 100,
      2
    );
  let concentrationRisk =
    "LOW";
  if (
    top10Share > 50
  ) {
    concentrationRisk =
      "VERY_HIGH";
  } else if (
    top10Share > 35
  ) {
    concentrationRisk =
      "HIGH";
  } else if (
    top10Share > 20
  ) {
    concentrationRisk =
      "MODERATE";
  }
  return {
    status:
      "VERIFIED",
    sampled:
      balances.length,
    top10Share,
    top20Share,
    concentrationRisk
  };
}
/* ============================================================
   BLOCKSCOUT TRANSFERS
============================================================ */
async function getTransfers(
  address
) {
  const url =
    CONFIG.BLOCKSCOUT +
    "?module=account" +
    "&action=tokentx" +
    "&contractaddress=" +
    encodeURIComponent(
      address
    ) +
    "&page=1" +
    "&offset=50" +
    "&sort=desc";
  const result =
    await externalFetch(
      url
    );
  if (
    result.status !==
    "VERIFIED"
  ) {
    return {
      status:
        "UNVERIFIED",
      transfers:
        null,
      uniqueWallets:
        null,
      activityScore:
        null,
      error:
        result.error
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
      status:
        "UNVERIFIED",
      transfers:
        null,
      uniqueWallets:
        null,
      activityScore:
        null
    };
  }
  const wallets =
    new Set();
  for (
    const tx of transfers
  ) {
    if (tx.from) {
      wallets.add(
        tx.from.toLowerCase()
      );
    }
    if (tx.to) {
      wallets.add(
        tx.to.toLowerCase()
      );
    }
  }
  const activityScore =
    Math.min(
      100,
      Math.round(
        (
          Math.min(
            wallets.size,
            100
          ) *
          0.6
        ) +
        (
          Math.min(
            transfers.length,
            100
          ) *
          0.4
        )
      )
    );
  return {
    status:
      "VERIFIED",
    transfers:
      transfers.length,
    uniqueWallets:
      wallets.size,
    activityScore
  };
}
/* ============================================================
   MEME LIKELIHOOD
============================================================ */
function calculateMemeLikelihood(
  token
) {
  const text =
    (
      String(
        token.name ??
        ""
      ) +
      " " +
      String(
        token.symbol ??
        ""
      )
    ).toLowerCase();
  const memeTerms = [
    "dog",
    "cat",
    "pepe",
    "wojak",
    "frog",
    "shib",
    "inu",
    "wif",
    "bonk",
    "meme",
    "moon",
    "lambo",
    "hood",
    "frog",
    "goat",
    "doge",
    "rat",
    "bear",
    "bull",
    "woof",
    "pooch",
    "degen",
    "chad",
    "based",
    "trenches"
  ];
  let matches = 0;
  for (
    const term of memeTerms
  ) {
    if (
      text.includes(term)
    ) {
      matches++;
    }
  }
  return Math.min(
    20,
    matches * 5
  );
}
/* ============================================================
   RISK FLAGS
============================================================ */
function getRiskFlags(
  data
) {
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
    CONFIG.MINIMUMS.VOLUME_24H
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
  if (
    data.buySellPressure ===
    "SELL_PRESSURE"
  ) {
    flags.push(
      "SELL_PRESSURE"
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
  /*
   * Market cap
   */
  add(
    15,
    data.marketCap !== null &&
    data.marketCap <
    10_000_000,
    data.marketCap !== null
  );
  /*
   * Holder count
   */
  add(
    10,
    data.holders !== null &&
    data.holders >=
    CONFIG.MINIMUMS.HOLDERS,
    data.holders !== null
  );
  /*
   * Meme likelihood
   */
  add(
    15,
    data.memeLikelihood >= 15,
    true
  );
  /*
   * Liquidity
   */
  add(
    15,
    data.liquidity.status ===
    "VERIFIED" &&
    data.liquidity.usd >=
    CONFIG.MINIMUMS.LIQUIDITY,
    data.liquidity.status ===
    "VERIFIED"
  );
  /*
   * Volume
   */
  add(
    10,
    data.volume.status ===
    "VERIFIED" &&
    data.volume.volume24h >=
    CONFIG.MINIMUMS.VOLUME_24H,
    data.volume.status ===
    "VERIFIED"
  );
  /*
   * Holder concentration
   */
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
  /*
   * Wallet activity
   */
  add(
    10,
    data.walletActivity.status ===
    "VERIFIED" &&
    data.walletActivity.activityScore >=
    50,
    data.walletActivity.status ===
    "VERIFIED"
  );
  /*
   * Buy pressure
   */
  add(
    5,
    data.buySellPressure ===
    "BUY_PRESSURE",
    data.buySellPressure !==
    "UNVERIFIED"
  );
  return {
    score,
    maximum:
      100,
    verifiedFactors
  };
}
/* ============================================================
   CATEGORY
============================================================ */
function classify(
  score,
  data
) {
  const criticalUnverified =
    data.liquidity.status !==
    "VERIFIED" ||
    data.volume.status !==
    "VERIFIED";
  /*
   * HIGH-POTENTIAL is impossible without
   * verified liquidity + volume.
   */
  if (
    score >=
    CONFIG.HIGH_POTENTIAL_SCORE &&
    !criticalUnverified &&
    data.riskFlags.length === 0
  ) {
    return "HIGH-POTENTIAL";
  }
  if (
    score >= 60
  ) {
    return "WATCH";
  }
  if (
    score >= 45
  ) {
    return "EARLY";
  }
  return "LOW-CONVICTION";
}
/* ============================================================
   TOKEN ANALYSIS
============================================================ */
async function analyseToken(
  token
) {
  /*
   * DEX data first.
   *
   * This is the key V12 improvement.
   */
  const dex =
    await getDexData(
      token.contract
    );
  const marketCap =
    dex.marketCap !== null
      ? dex.marketCap
      : null;
  /*
   * Holder and transfer calls are
   * deliberately limited to deep
   * candidates only.
   */
  const holderAnalysis =
    await getHolderData(
      token.contract
    );
  const walletActivity =
    await getTransfers(
      token.contract
    );
  const memeLikelihood =
    calculateMemeLikelihood(
      {
        name:
          token.name,
        symbol:
          token.symbol
      }
    );
  const data = {
    marketCap,
    holders:
      safeNumber(
        token.holders
      ),
    memeLikelihood,
    liquidity:
      dex.liquidity ??
      {
        status:
          "UNVERIFIED",
        usd:
          null,
        quality:
          "UNKNOWN"
      },
    volume:
      dex.volume24h !== null
        ? {
            status:
              "VERIFIED",
            volume24h:
              dex.volume24h,
            quality:
              dex.volumeQuality
          }
        : {
            status:
              "UNVERIFIED",
            volume24h:
              null,
            quality:
              "UNKNOWN"
          },
    holderAnalysis,
    walletActivity,
    buySellPressure:
      dex.buySellPressure ??
      "UNVERIFIED"
  };
  data.riskFlags =
    getRiskFlags(
      data
    );
  const scoring =
    calculateScore(
      data
    );
  const category =
    classify(
      scoring.score,
      data
    );
  return {
    ...token,
    name:
      token.name ??
      null,
    symbol:
      token.symbol ??
      null,
    contract:
      token.contract,
    price:
      dex.priceUsd,
    marketCap,
    fdv:
      dex.fdv,
    holders:
      data.holders,
    memeLikelihood,
    discoveryScore:
      scoring.score,
    scoreMaximum:
      100,
    verifiedFactors:
      scoring.verifiedFactors,
    category,
    liquidity:
      data.liquidity,
    tradingVolume:
      data.volume,
    buySellPressure:
      dex.buySellPressure,
    buys24h:
      dex.buys24h,
    sells24h:
      dex.sells24h,
    holderAnalysis,
    walletActivity,
    accumulationDistribution: {
      status:
        "UNVERIFIED",
      signal:
        "UNKNOWN"
    },
    whaleActivity: {
      status:
        "UNVERIFIED",
      signal:
        "TRANSFER_HISTORY_REQUIRED"
    },
    smartMoney: {
      status:
        "UNVERIFIED",
      signal:
        "UNKNOWN"
    },
    pair: {
      dex:
        dex.dex,
      address:
        dex.pairAddress,
      ageHours:
        dex.pairAgeHours,
      url:
        dex.url,
      pairsFound:
        dex.pairsFound
    },
    boosts:
      token.boosts ??
      null,
    riskFlags:
      data.riskFlags,
    targetAnalysis:
      targetAnalysis(
        marketCap
      )
  };
}
/* ============================================================
   MAIN SCANNER
============================================================ */
async function runScanner() {
  requestCount = 0;
  /*
   * 1. Get current block.
   */
  const latestHex =
    await rpc(
      "eth_blockNumber"
    );
  const latestBlock =
    latestHex !== null
      ? parseInt(
          latestHex,
          16
        )
      : null;
  /*
   * 2. Automatically discover
   * Robinhood Chain candidates.
   */
  const discovered =
    await discoverFromDexScreener();
  /*
   * Remove duplicates.
   */
  const unique =
    new Map();
  for (
    const token of discovered
  ) {
    if (
      token.contract
    ) {
      unique.set(
        token.contract.toLowerCase(),
        token
      );
    }
  }
  const candidates =
    Array.from(
      unique.values()
    )
    .slice(
      0,
      CONFIG.SCAN_LIMIT
    );
  /*
   * 3. First pass:
   *
   * DEX data is used to rank candidates
   * before expensive Blockscout calls.
   *
   * This is critical for avoiding
   * Cloudflare subrequest exhaustion.
   */
  const marketCandidates = [];
  for (
    const token of candidates
  ) {
    if (
      !canRequest()
    ) {
      break;
    }
    const dex =
      await getDexData(
        token.contract
      );
    marketCandidates.push({
      ...token,
      dex
    });
  }
  /*
   * 4. Rank by a preliminary,
   * evidence-based DEX score.
   */
  marketCandidates.sort(
    (a, b) => {
      function preliminary(
        item
      ) {
        const dex =
          item.dex;
        if (
          !dex ||
          dex.status !==
          "VERIFIED"
        ) {
          return -1;
        }
        const liquidity =
          dex.liquidity?.usd ||
          0;
        const volume =
          dex.volume24h ||
          0;
        const marketCap =
          dex.marketCap ||
          Infinity;
        let score = 0;
        if (
          marketCap <
          10_000_000
        ) {
          score += 30;
        }
        if (
          liquidity >=
          25_000
        ) {
          score += 25;
        }
        if (
          volume >=
          10_000
        ) {
          score += 20;
        }
        if (
          dex.buySellPressure ===
          "BUY_PRESSURE"
        ) {
          score += 15;
        }
        if (
          dex.pairAgeHours !== null &&
          dex.pairAgeHours < 720
        ) {
          score += 10;
        }
        return score;
      }
      return (
        preliminary(b) -
        preliminary(a)
      );
    }
  );
  /*
   * 5. Deep analyse strongest candidates.
   */
  const deep =
    marketCandidates.slice(
      0,
      CONFIG.DEEP_ANALYSIS_LIMIT
    );
  const analysed = [];
  for (
    const token of deep
  ) {
    if (
      !canRequest()
    ) {
      break;
    }
    const result =
      await analyseToken(
        token
      );
    analysed.push(
      result
    );
  }
  /*
   * Final ranking.
   */
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
      "Early-stage meme coin discovery using DEX liquidity, volume, holder concentration and wallet activity.",
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
      tokensDiscovered:
        candidates.length,
      candidatesMarketScreened:
        marketCandidates.length,
      deeplyAnalysed:
        analysed.length,
      requestCount,
      requestLimit:
        CONFIG.MAX_EXTERNAL_REQUESTS
    },
    candidates:
      analysed,
    validation: {
      dexLiquidity:
        "ENABLED",
      tradingVolume:
        "ENABLED",
      buySellPressure:
        "ENABLED",
      holderConcentration:
        "ENABLED",
      walletActivity:
        "ENABLED",
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
          "verified 24h volume",
          "verified holder concentration",
          "no critical risk flags"
        ]
    },
    nextStage:
      "Historical flow comparison and smart-money wallet identification.",
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
        dex:
          "DEXSCREENER_ENABLED",
        blockscout:
          "ENABLED",
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
      "Robinhood Chain Meme Hunter V12",
      {
        status:
          200
      }
    );
  }
};
