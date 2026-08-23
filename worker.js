/**
 * ROBINHOOD CHAIN MEME HUNTER — V13
 *
 * FREE TELEGRAM ALERT BOT
 * Chain ID: 4663
 *
 * FREE DATA SOURCES:
 * - Robinhood Chain RPC
 * - Robinhood Chain Blockscout
 * - DEX Screener public API
 * - Telegram Bot API
 *
 * Cloudflare Secrets required:
 *
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_CHAT_ID
 *
 * Telegram chat ID:
 * -1004466114680
 *
 * IMPORTANT:
 * - Never fabricate unavailable data.
 * - UNVERIFIED data is never treated as zero.
 * - Telegram alerts only use verified market data.
 * - This is an opportunity scanner, NOT a guarantee of profit.
 */
const CONFIG = {
  VERSION: "V13",
  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",
  RPC_URL:
    "https://rpc.mainnet.chain.robinhood.com",
  BLOCKSCOUT_URL:
    "https://robinhoodchain.blockscout.com/api/v2",
  DEXSCREENER_URL:
    "https://api.dexscreener.com",
  MAX_REQUESTS: 12,
  TOKEN_LIMIT: 50,
  CANDIDATE_LIMIT: 12,
  DEX_BATCH_SIZE: 30,
  ALERT_COOLDOWN_SECONDS: 900,
  MINIMUMS: {
    LIQUIDITY: 25000,
    VOLUME_24H: 10000,
    MARKET_CAP_MAX: 50_000_000
  },
  TARGETS: [
    100_000_000,
    250_000_000,
    500_000_000
  ]
};
let requestCount = 0;
/* ============================================================
   REQUEST BUDGET
============================================================ */
function canRequest() {
  return requestCount <
    CONFIG.MAX_REQUESTS;
}
/* ============================================================
   HTTP JSON
============================================================ */
async function getJson(url) {
  if (!canRequest()) {
    return {
      ok: false,
      error: "REQUEST_BUDGET_EXCEEDED"
    };
  }
  requestCount++;
  try {
    const response =
      await fetch(url, {
        headers: {
          "accept":
            "application/json"
        }
      });
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error:
          `HTTP_${response.status}`
      };
    }
    return {
      ok: true,
      data:
        await response.json()
    };
  } catch {
    return {
      ok: false,
      error:
        "REQUEST_FAILED"
    };
  }
}
/* ============================================================
   POST JSON
============================================================ */
async function postJson(
  url,
  body
) {
  if (!canRequest()) {
    return {
      ok: false,
      error:
        "REQUEST_BUDGET_EXCEEDED"
    };
  }
  requestCount++;
  try {
    const response =
      await fetch(url, {
        method: "POST",
        headers: {
          "content-type":
            "application/json",
          "accept":
            "application/json"
        },
        body:
          JSON.stringify(body)
      });
    const data =
      await response.json()
        .catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status:
          response.status,
        error:
          data?.description ||
          `HTTP_${response.status}`
      };
    }
    return {
      ok: true,
      data
    };
  } catch {
    return {
      ok: false,
      error:
        "REQUEST_FAILED"
    };
  }
}
/* ============================================================
   HELPERS
============================================================ */
function num(value) {
  const n = Number(value);
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
function money(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "UNVERIFIED";
  }
  if (value >= 1_000_000_000) {
    return "$" +
      round(
        value / 1_000_000_000,
        2
      ) +
      "B";
  }
  if (value >= 1_000_000) {
    return "$" +
      round(
        value / 1_000_000,
        2
      ) +
      "M";
  }
  if (value >= 1_000) {
    return "$" +
      round(
        value / 1_000,
        1
      ) +
      "K";
  }
  return "$" +
    round(value, 2);
}
function multiple(
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
function targetAnalysis(
  marketCap
) {
  return {
    to100M:
      multiple(
        marketCap,
        100_000_000
      ),
    to250M:
      multiple(
        marketCap,
        250_000_000
      ),
    to500M:
      multiple(
        marketCap,
        500_000_000
      )
  };
}
/* ============================================================
   MEME SCORE
============================================================ */
function memeScore(token) {
  const text =
    (
      `${token.name || ""} ` +
      `${token.symbol || ""}`
    )
      .toLowerCase();
  const words = [
    "dog",
    "doge",
    "shib",
    "inu",
    "cat",
    "kitty",
    "frog",
    "pepe",
    "wojak",
    "bonk",
    "wif",
    "meme",
    "moon",
    "lambo",
    "chad",
    "based",
    "goat",
    "bear",
    "bull",
    "ape",
    "degen",
    "shit",
    "woof",
    "wen",
    "yolo"
  ];
  let score = 0;
  for (const word of words) {
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
   EXCLUSIONS
============================================================ */
const EXCLUDED = new Set([
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
]);
function isExcluded(token) {
  const address =
    String(
      token.address || ""
    )
      .toLowerCase();
  if (
    EXCLUDED.has(address)
  ) {
    return true;
  }
  const name =
    String(
      token.name || ""
    )
      .toLowerCase();
  const symbol =
    String(
      token.symbol || ""
    )
      .toLowerCase();
  const excludedWords = [
    "wrapped ether",
    "weth",
    "usd coin",
    "usdc",
    "tether",
    "usdt",
    "tokenized",
    "stock token"
  ];
  return excludedWords.some(
    word =>
      name.includes(word) ||
      symbol === word
  );
}
/* ============================================================
   TOKEN DISCOVERY
============================================================ */
async function discoverTokens() {
  const url =
    CONFIG.BLOCKSCOUT_URL +
    "/tokens?type=ERC-20";
  const result =
    await getJson(url);
  if (!result.ok) {
    return {
      status:
        "UNVERIFIED",
      tokens: [],
      error:
        result.error
    };
  }
  const items =
    Array.isArray(
      result.data?.items
    )
      ? result.data.items
      : [];
  const tokens =
    items
      .filter(
        token =>
          token &&
          token.address &&
          !isExcluded(token)
      )
      .map(token => {
        const marketCap =
          num(
            token.circulating_market_cap
          );
        const price =
          num(
            token.exchange_rate
          );
        const holders =
          num(
            token.holders
          );
        return {
          name:
            token.name ||
            "Unknown",
          symbol:
            token.symbol ||
            "UNKNOWN",
          contract:
            token.address,
          price,
          marketCap,
          holders,
          decimals:
            num(token.decimals),
          memeLikelihood:
            memeScore(token)
        };
      });
  return {
    status:
      "VERIFIED",
    tokens
  };
}
/* ============================================================
   DEX SCREENER
============================================================ */
async function getDexPairs(
  addresses
) {
  const unique =
    [
      ...new Set(
        addresses
          .map(
            x =>
              String(x)
                .toLowerCase()
          )
      )
    ];
  if (!unique.length) {
    return {
      status:
        "UNVERIFIED",
      pairs: []
    };
  }
  const batches = [];
  for (
    let i = 0;
    i < unique.length;
    i += CONFIG.DEX_BATCH_SIZE
  ) {
    batches.push(
      unique.slice(
        i,
        i +
        CONFIG.DEX_BATCH_SIZE
      )
    );
  }
  const pairs = [];
  for (
    const batch of batches
  ) {
    if (!canRequest()) {
      break;
    }
    const url =
      CONFIG.DEXSCREENER_URL +
      "/tokens/v1/robinhood/" +
      batch.join(",");
    const result =
      await getJson(url);
    if (
      result.ok &&
      Array.isArray(result.data)
    ) {
      pairs.push(
        ...result.data
      );
    }
  }
  return {
    status:
      pairs.length
        ? "VERIFIED"
        : "UNVERIFIED",
    pairs
  };
}
/* ============================================================
   DEX ANALYSIS
============================================================ */
function analyseDex(
  token,
  pairs
) {
  const address =
    String(
      token.contract
    )
      .toLowerCase();
  const matching =
    pairs.filter(pair => {
      const base =
        String(
          pair?.baseToken?.address ||
          ""
        )
          .toLowerCase();
      const quote =
        String(
          pair?.quoteToken?.address ||
          ""
        )
          .toLowerCase();
      return (
        base === address ||
        quote === address
      );
    });
  if (!matching.length) {
    return {
      status:
        "UNVERIFIED",
      liquidityUsd:
        null,
      volume24h:
        null,
      buys24h:
        null,
      sells24h:
        null,
      buySellRatio:
        null,
      pressure:
        "UNKNOWN",
      liquidityQuality:
        "UNKNOWN",
      volumeQuality:
        "UNKNOWN",
      pairAgeHours:
        null,
      bestPair:
        null
    };
  }
  let liquidity = 0;
  let volume = 0;
  let buys = 0;
  let sells = 0;
  let bestPair = null;
  let bestLiquidity = 0;
  for (
    const pair of matching
  ) {
    const pairLiquidity =
      num(
        pair?.liquidity?.usd
      ) || 0;
    const pairVolume =
      num(
        pair?.volume?.h24
      ) || 0;
    liquidity +=
      pairLiquidity;
    volume +=
      pairVolume;
    buys +=
      num(
        pair?.txns?.h24?.buys
      ) || 0;
    sells +=
      num(
        pair?.txns?.h24?.sells
      ) || 0;
    if (
      pairLiquidity >
      bestLiquidity
    ) {
      bestLiquidity =
        pairLiquidity;
      bestPair =
        pair;
    }
  }
  const marketCap =
    num(
      bestPair?.marketCap
    ) ??
    num(
      bestPair?.fdv
    ) ??
    token.marketCap;
  const liquidityRatio =
    marketCap &&
    marketCap > 0
      ? liquidity / marketCap
      : null;
  const volumeRatio =
    marketCap &&
    marketCap > 0
      ? volume / marketCap
      : null;
  let pressure =
    "NEUTRAL";
  if (
    buys >
    sells * 1.25
  ) {
    pressure =
      "BUY_PRESSURE";
  } else if (
    sells >
    buys * 1.25
  ) {
    pressure =
      "SELL_PRESSURE";
  }
  let liquidityQuality =
    "LOW";
  if (
    liquidityRatio >= 0.20
  ) {
    liquidityQuality =
      "STRONG";
  } else if (
    liquidityRatio >= 0.10
  ) {
    liquidityQuality =
      "GOOD";
  } else if (
    liquidityRatio >= 0.05
  ) {
    liquidityQuality =
      "MODERATE";
  }
  let volumeQuality =
    "LOW";
  if (
    volumeRatio >= 0.50
  ) {
    volumeQuality =
      "VERY_HIGH";
  } else if (
    volumeRatio >= 0.20
  ) {
    volumeQuality =
      "HIGH";
  } else if (
    volumeRatio >= 0.05
  ) {
    volumeQuality =
      "HEALTHY";
  }
  let pairAgeHours = null;
  if (
    bestPair?.pairCreatedAt
  ) {
    pairAgeHours =
      (
        Date.now() -
        Number(
          bestPair.pairCreatedAt
        )
      ) /
      1000 /
      60 /
      60;
  }
  return {
    status:
      "VERIFIED",
    liquidityUsd:
      round(
        liquidity,
        2
      ),
    volume24h:
      round(
        volume,
        2
      ),
    buys24h:
      buys,
    sells24h:
      sells,
    buySellRatio:
      sells > 0
        ? round(
            buys / sells,
            2
          )
        : null,
    pressure,
    liquidityToMarketCap:
      liquidityRatio !== null
        ? round(
            liquidityRatio,
            4
          )
        : null,
    volumeToMarketCap:
      volumeRatio !== null
        ? round(
            volumeRatio,
            4
          )
        : null,
    liquidityQuality,
    volumeQuality,
    pairAgeHours:
      pairAgeHours !== null
        ? round(
            pairAgeHours,
            2
          )
        : null,
    bestPair:
      bestPair
        ? {
            dex:
              bestPair.dexId ||
              null,
            pairAddress:
              bestPair.pairAddress ||
              null,
            url:
              bestPair.url ||
              null,
            priceUsd:
              num(
                bestPair.priceUsd
              ),
            marketCap:
              num(
                bestPair.marketCap
              ) ??
              token.marketCap,
            fdv:
              num(
                bestPair.fdv
              )
          }
        : null
  };
}
/* ============================================================
   HOLDER CONCENTRATION
============================================================ */
async function getHolderConcentration(
  address
) {
  if (!canRequest()) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      concentrationRisk:
        "UNKNOWN"
    };
  }
  const url =
    CONFIG.BLOCKSCOUT_URL +
    "/tokens/" +
    address +
    "/holders";
  const result =
    await getJson(url);
  if (!result.ok) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      concentrationRisk:
        "UNKNOWN",
      error:
        result.error
    };
  }
  const items =
    Array.isArray(
      result.data?.items
    )
      ? result.data.items
      : [];
  if (!items.length) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      concentrationRisk:
        "UNKNOWN"
    };
  }
  const balances =
    items
      .map(
        holder =>
          num(
            holder.value
          )
      )
      .filter(
        x =>
          x !== null
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
        null,
      concentrationRisk:
        "UNKNOWN"
    };
  }
  const total =
    balances.reduce(
      (a, b) =>
        a + b,
      0
    );
  if (total <= 0) {
    return {
      status:
        "UNVERIFIED",
      top10Share:
        null,
      top20Share:
        null,
      concentrationRisk:
        "UNKNOWN"
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
      top10 /
      total *
      100,
      2
    );
  const top20Share =
    round(
      top20 /
      total *
      100,
      2
    );
  let risk =
    "LOW";
  if (
    top10Share > 50
  ) {
    risk =
      "VERY_HIGH";
  } else if (
    top10Share > 35
  ) {
    risk =
      "HIGH";
  } else if (
    top10Share > 20
  ) {
    risk =
      "MODERATE";
  }
  return {
    status:
      "VERIFIED",
    holdersSampled:
      balances.length,
    top10Share,
    top20Share,
    concentrationRisk:
      risk
  };
}
/* ============================================================
   SCORING
============================================================ */
function scoreToken(data) {
  let score = 0;
  let verified = 0;
  if (
    data.marketCap !== null
  ) {
    verified++;
    if (
      data.marketCap <
      10_000_000
    ) {
      score += 15;
    } else if (
      data.marketCap <
      25_000_000
    ) {
      score += 10;
    } else if (
      data.marketCap <
      50_000_000
    ) {
      score += 5;
    }
  }
  verified++;
  if (
    data.memeLikelihood >= 15
  ) {
    score += 15;
  } else if (
    data.memeLikelihood >= 10
  ) {
    score += 10;
  } else if (
    data.memeLikelihood >= 5
  ) {
    score += 5;
  }
  if (
    data.dex.status ===
    "VERIFIED"
  ) {
    verified++;
    if (
      data.dex.liquidityQuality ===
      "STRONG"
    ) {
      score += 15;
    } else if (
      data.dex.liquidityQuality ===
      "GOOD"
    ) {
      score += 12;
    } else if (
      data.dex.liquidityQuality ===
      "MODERATE"
    ) {
      score += 7;
    }
    verified++;
    if (
      data.dex.volumeQuality ===
      "VERY_HIGH"
    ) {
      score += 10;
    } else if (
      data.dex.volumeQuality ===
      "HIGH"
    ) {
      score += 8;
    } else if (
      data.dex.volumeQuality ===
      "HEALTHY"
    ) {
      score += 5;
    }
    verified++;
    if (
      data.dex.pressure ===
      "BUY_PRESSURE"
    ) {
      score += 10;
    } else if (
      data.dex.pressure ===
      "NEUTRAL"
    ) {
      score += 5;
    }
  }
  if (
    data.holderAnalysis.status ===
    "VERIFIED"
  ) {
    verified++;
    if (
      data.holderAnalysis
        .concentrationRisk ===
      "LOW"
    ) {
      score += 10;
    } else if (
      data.holderAnalysis
        .concentrationRisk ===
      "MODERATE"
    ) {
      score += 5;
    }
  }
  return {
    score,
    maximum:
      100,
    verifiedFactors:
      verified
  };
}
/* ============================================================
   RISK FLAGS
============================================================ */
function riskFlags(data) {
  const flags = [];
  if (
    data.dex.status ===
      "VERIFIED" &&
    data.dex.liquidityUsd <
      CONFIG.MINIMUMS.LIQUIDITY
  ) {
    flags.push(
      "LOW_LIQUIDITY"
    );
  }
  if (
    data.dex.status ===
      "VERIFIED" &&
    data.dex.volume24h <
      CONFIG.MINIMUMS.VOLUME_24H
  ) {
    flags.push(
      "LOW_VOLUME"
    );
  }
  if (
    data.dex.pressure ===
    "SELL_PRESSURE"
  ) {
    flags.push(
      "SELL_PRESSURE"
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
   CLASSIFICATION
============================================================ */
function classify(
  score,
  data
) {
  const verifiedMarket =
    data.dex.status ===
    "VERIFIED";
  const validLiquidity =
    verifiedMarket &&
    data.dex.liquidityUsd >=
    CONFIG.MINIMUMS.LIQUIDITY;
  const validVolume =
    verifiedMarket &&
    data.dex.volume24h >=
    CONFIG.MINIMUMS.VOLUME_24H;
  const noCriticalFlags =
    !data.riskFlags.some(
      flag =>
        flag ===
          "LOW_LIQUIDITY" ||
        flag ===
          "LOW_VOLUME" ||
        flag ===
          "VERY_HIGH_HOLDER_CONCENTRATION"
    );
  /*
   * HIGH-POTENTIAL requires
   * holder data too.
   */
  if (
    score >= 75 &&
    verifiedMarket &&
    validLiquidity &&
    validVolume &&
    data.holderAnalysis.status ===
      "VERIFIED" &&
    noCriticalFlags
  ) {
    return "HIGH-POTENTIAL";
  }
  if (score >= 60) {
    return "WATCH";
  }
  if (score >= 40) {
    return "EARLY";
  }
  return "LOW-CONVICTION";
}
/* ============================================================
   ANALYSE TOKEN
============================================================ */
async function analyseToken(
  token,
  pairs
) {
  const dex =
    analyseDex(
      token,
      pairs
    );
  let holderAnalysis = {
    status:
      "UNVERIFIED",
    top10Share:
      null,
    top20Share:
      null,
    concentrationRisk:
      "UNKNOWN"
  };
  if (canRequest()) {
    holderAnalysis =
      await getHolderConcentration(
        token.contract
      );
  }
  const data = {
    marketCap:
      token.marketCap,
    holders:
      token.holders,
    memeLikelihood:
      token.memeLikelihood,
    dex,
    holderAnalysis,
    riskFlags: []
  };
  data.riskFlags =
    riskFlags(data);
  const scoring =
    scoreToken(data);
  const category =
    classify(
      scoring.score,
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
    category,
    dex,
    holderAnalysis,
    whaleActivity: {
      status:
        holderAnalysis.status,
      top10Share:
        holderAnalysis.top10Share,
      top20Share:
        holderAnalysis.top20Share
    },
    walletActivity: {
      status:
        "UNVERIFIED",
      signal:
        "NOT_YET_AVAILABLE"
    },
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
    socialMomentum: {
      status:
        "UNVERIFIED",
      signal:
        "UNKNOWN"
    },
    riskFlags:
      data.riskFlags,
    targetAnalysis:
      targetAnalysis(
        token.marketCap
      )
  };
}
/* ============================================================
   TELEGRAM
============================================================ */
function escapeHtml(value) {
  return String(value ?? "")
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
    );
}
async function sendTelegram(
  env,
  message
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      ok: false,
      error:
        "TELEGRAM_SECRETS_MISSING"
    };
  }
  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";
  return await postJson(
    url,
    {
      chat_id:
        env.TELEGRAM_CHAT_ID,
      text:
        message,
      parse_mode:
        "HTML",
      disable_web_page_preview:
        false
    }
  );
}
/* ============================================================
   TELEGRAM ALERT
============================================================ */
function buildTelegramAlert(
  token
) {
  const dex =
    token.dex;
  const target =
    token.targetAnalysis;
  const pairUrl =
    dex?.bestPair?.url;
  let message =
    "🚨 <b>ROBINHOOD CHAIN MEME ALERT</b>\n\n" +
    "🪙 <b>" +
    escapeHtml(
      token.name
    ) +
    "</b>\n" +
    "🔤 $" +
    escapeHtml(
      token.symbol
    ) +
    "\n\n" +
    "⭐ <b>Score:</b> " +
    token.discoveryScore +
    "/" +
    token.scoreMaximum +
    "\n" +
    "🎯 <b>Category:</b> " +
    escapeHtml(
      token.category
    ) +
    "\n\n" +
    "💰 <b>Market Cap:</b> " +
    money(
      token.marketCap
    ) +
    "\n" +
    "💧 <b>Liquidity:</b> " +
    money(
      dex.liquidityUsd
    ) +
    "\n" +
    "📊 <b>24h Volume:</b> " +
    money(
      dex.volume24h
    ) +
    "\n" +
    "🟢 <b>Buys:</b> " +
    (dex.buys24h ?? "UNVERIFIED") +
    "\n" +
    "🔴 <b>Sells:</b> " +
    (dex.sells24h ?? "UNVERIFIED") +
    "\n" +
    "⚖️ <b>Buy/Sell:</b> " +
    (dex.buySellRatio ?? "UNVERIFIED") +
    "\n" +
    "📈 <b>Pressure:</b> " +
    escapeHtml(
      dex.pressure
    ) +
    "\n\n" +
    "👥 <b>Top 10:</b> " +
    (
      token.holderAnalysis
        .top10Share !== null
        ? token.holderAnalysis
            .top10Share + "%"
        : "UNVERIFIED"
    ) +
    "\n" +
    "👥 <b>Top 20:</b> " +
    (
      token.holderAnalysis
        .top20Share !== null
        ? token.holderAnalysis
            .top20Share + "%"
        : "UNVERIFIED"
    ) +
    "\n\n" +
    "🎯 <b>Market Cap Targets</b>\n" +
    "100M: " +
    (
      target.to100M !== null
        ? target.to100M + "x"
        : "N/A"
    ) +
    "\n" +
    "250M: " +
    (
      target.to250M !== null
        ? target.to250M + "x"
        : "N/A"
    ) +
    "\n" +
    "500M: " +
    (
      target.to500M !== null
        ? target.to500M + "x"
        : "N/A"
    ) +
    "\n\n" +
    "🧾 <b>Contract:</b>\n<code>" +
    escapeHtml(
      token.contract
    ) +
    "</code>\n\n";
  if (pairUrl) {
    message +=
      "🔗 <a href=\"" +
      escapeHtml(pairUrl) +
      "\">View on DEX Screener</a>\n\n";
  }
  message +=
    "⚠️ <i>Early-stage signal only. " +
    "Not financial advice. " +
    "Market-cap targets are theoretical multiples, not predictions.</i>";
  return message;
}
/* ============================================================
   ALERT FILTER
============================================================ */
function shouldAlert(token) {
  /*
   * We do NOT alert every token.
   *
   * Alert threshold:
   *
   * WATCH with verified DEX data
   * OR
   * HIGH-POTENTIAL
   */
  if (
    token.category ===
    "HIGH-POTENTIAL"
  ) {
    return true;
  }
  if (
    token.category ===
    "WATCH" &&
    token.dex.status ===
    "VERIFIED" &&
    token.dex.liquidityUsd >=
      CONFIG.MINIMUMS.LIQUIDITY &&
    token.dex.volume24h >=
      CONFIG.MINIMUMS.VOLUME_24H
  ) {
    return true;
  }
  return false;
}
/* ============================================================
   TELEGRAM DEDUPLICATION
============================================================ */
async function alreadyAlerted(
  token
) {
  const cache =
    caches.default;
  const key =
    "https://rh-alert-cache.local/" +
    encodeURIComponent(
      token.contract.toLowerCase()
    );
  const request =
    new Request(key);
  const existing =
    await cache.match(
      request
    );
  if (existing) {
    return true;
  }
  const response =
    new Response(
      "alerted",
      {
        headers: {
          "cache-control":
            `max-age=${CONFIG.ALERT_COOLDOWN_SECONDS}`
        }
      }
    );
  await cache.put(
    request,
    response
  );
  return false;
}
/* ============================================================
   MAIN SCANNER
============================================================ */
async function runScanner(
  env
) {
  requestCount = 0;
  /*
   * 1. Discover tokens
   */
  const discovery =
    await discoverTokens();
  let tokens =
    discovery.tokens || [];
  /*
   * 2. Keep early-stage candidates
   */
  tokens =
    tokens
      .filter(token => {
        if (
          token.marketCap === null
        ) {
          return false;
        }
        return (
          token.marketCap <=
          CONFIG.MINIMUMS.MARKET_CAP_MAX
        );
      })
      .sort((a, b) => {
        const aScore =
          (
            a.memeLikelihood * 3
          ) +
          Math.min(
            10,
            Math.log10(
              Math.max(
                1,
                a.holders || 1
              )
            )
          );
        const bScore =
          (
            b.memeLikelihood * 3
          ) +
          Math.min(
            10,
            Math.log10(
              Math.max(
                1,
                b.holders || 1
              )
            )
          );
        return bScore - aScore;
      })
      .slice(
        0,
        CONFIG.CANDIDATE_LIMIT
      );
  /*
   * 3. DEX data
   */
  const dex =
    await getDexPairs(
      tokens.map(
        token =>
          token.contract
      )
    );
  const analysed = [];
  /*
   * 4. Analyse candidates
   */
  for (
    const token of tokens
  ) {
    if (!canRequest()) {
      break;
    }
    const result =
      await analyseToken(
        token,
        dex.pairs || []
      );
    analysed.push(
      result
    );
  }
  /*
   * 5. Rank
   */
  analysed.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );
  /*
   * 6. Telegram alerts
   */
  const alerts = [];
  for (
    const token of analysed
  ) {
    if (
      !shouldAlert(token)
    ) {
      continue;
    }
    /*
     * Stop if request budget
     * is exhausted.
     */
    if (!canRequest()) {
      break;
    }
    const duplicate =
      await alreadyAlerted(
        token
      );
    if (duplicate) {
      continue;
    }
    const telegramMessage =
      buildTelegramAlert(
        token
      );
    const telegram =
      await sendTelegram(
        env,
        telegramMessage
      );
    alerts.push({
      contract:
        token.contract,
      symbol:
        token.symbol,
      category:
        token.category,
      score:
        token.discoveryScore,
      telegram:
        telegram.ok
          ? "SENT"
          : telegram.error
    });
  }
  return {
    agent:
      "Robinhood Chain Meme Hunter",
    version:
      CONFIG.VERSION,
    status:
      "ONLINE",
    telegram:
      {
        configured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
        chatId:
          env.TELEGRAM_CHAT_ID
            ? env.TELEGRAM_CHAT_ID
            : "NOT_CONFIGURED",
        alertsSent:
          alerts.filter(
            x =>
              x.telegram ===
              "SENT"
          ).length
      },
    chain: {
      name:
        CONFIG.CHAIN_NAME,
      chainId:
        CONFIG.CHAIN_ID,
      rpc:
        CONFIG.RPC_URL
    },
    scan: {
      tokensDiscovered:
        discovery.tokens?.length ||
        0,
      candidatesAnalysed:
        analysed.length,
      requestCount,
      requestLimit:
        CONFIG.MAX_REQUESTS
    },
    candidates:
      analysed,
    alerts,
    validation: {
      liquidity:
        dex.status ===
        "VERIFIED"
          ? "VERIFIED FROM DEX SCREENER"
          : "UNVERIFIED",
      volume:
        dex.status ===
        "VERIFIED"
          ? "VERIFIED FROM DEX SCREENER"
          : "UNVERIFIED",
      buySellPressure:
        "CALCULATED FROM DEX TRANSACTIONS",
      holderConcentration:
        "ATTEMPTED VIA BLOCKSCOUT",
      smartMoney:
        "NOT YET VERIFIED",
      socialMomentum:
        "NOT YET VERIFIED"
    },
    dataIntegrity: {
      noFabricatedMetrics:
        true,
      unavailableData:
        "UNVERIFIED"
    },
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
    /*
     * HEALTH
     */
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
        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
        telegramChatId:
          env.TELEGRAM_CHAT_ID
            ? env.TELEGRAM_CHAT_ID
            : "NOT_CONFIGURED",
        cost:
          "FREE"
      });
    }
    /*
     * TEST TELEGRAM
     *
     * Open:
     *
     * https://YOUR-WORKER.workers.dev/test-telegram
     */
    if (
      url.pathname ===
      "/test-telegram"
    ) {
      if (
        !env.TELEGRAM_BOT_TOKEN ||
        !env.TELEGRAM_CHAT_ID
      ) {
        return Response.json({
          status:
            "ERROR",
          message:
            "Telegram secrets are missing."
        });
      }
      const testMessage =
        "🤖 <b>Robinhood Chain Meme Hunter</b>\n\n" +
        "✅ Telegram connection successful.\n\n" +
        "Chain: Robinhood Chain\n" +
        "Chain ID: 4663\n\n" +
        "V13 is ready to scan.";
      const result =
        await sendTelegram(
          env,
          testMessage
        );
      return Response.json({
        status:
          result.ok
            ? "TELEGRAM_OK"
            : "TELEGRAM_ERROR",
        result
      });
    }
    /*
     * MAIN SCANNER
     */
    if (
      url.pathname ===
      "/"
    ) {
      try {
        const result =
          await runScanner(
            env
          );
        return Response.json(
          result,
          {
            headers: {
              "access-control-allow-origin":
                "*",
              "cache-control":
                "no-store"
            }
          }
        );
      } catch (error) {
        return Response.json(
          {
            agent:
              "Robinhood Chain Meme Hunter",
            version:
              CONFIG.VERSION,
            status:
              "ERROR",
            error:
              String(
                error?.message ||
                error
              ),
            dataIntegrity: {
              noFabricatedMetrics:
                true
            },
            timestamp:
              new Date().toISOString()
          },
          {
            status:
              500,
            headers: {
              "access-control-allow-origin":
                "*"
            }
          }
        );
      }
    }
    return new Response(
      "Robinhood Chain Meme Hunter V13",
      {
        status: 200
      }
    );
  }
};
