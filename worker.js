/**
 * ROBINHOOD CHAIN MEME HUNTER — V16
 *
 * FREE-FIRST
 *
 * Discovery:
 *   DEX Screener latest token profiles
 *   DEX Screener latest boosted tokens
 *   DEX Screener top boosted tokens
 *
 * Verification:
 *   DEX Screener token/pair data
 *   Blockscout holders where available
 *
 * Alerts:
 *   Telegram Bot API
 *
 * Chain:
 *   Robinhood Chain
 *   Chain ID: 4663
 *
 * REQUIRED CLOUDFLARE VARIABLES:
 *
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_CHAT_ID
 *
 * TELEGRAM_CHAT_ID should be:
 * -1004466114680
 *
 * IMPORTANT:
 * Never fabricate unavailable data.
 */

const CONFIG = {

  VERSION: "V16",

  CHAIN_ID: "4663",

  CHAIN_NAME: "Robinhood Chain",

  RPC_URL:
    "https://rpc.mainnet.chain.robinhood.com",

  BLOCKSCOUT_URL:
    "https://robinhoodchain.blockscout.com/api/v2",

  DEX_URL:
    "https://api.dexscreener.com",

  MAX_REQUESTS: 10,

  MAX_CANDIDATES: 20,

  MINIMUMS: {

    LIQUIDITY: 25000,

    VOLUME_24H: 10000,

    MARKET_CAP_MAX: 50000000

  },

  ALERT_SCORE: 65,

  ALERT_COOLDOWN_MS:
    6 * 60 * 60 * 1000

};


/* ============================================================
   REQUEST BUDGET
============================================================ */

let requestCount = 0;


function canRequest() {

  return requestCount <
    CONFIG.MAX_REQUESTS;

}


/* ============================================================
   GENERIC FETCH
============================================================ */

async function getJson(url) {

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
      await fetch(
        url,
        {
          headers: {
            "accept":
              "application/json"
          }
        }
      );

    if (!response.ok) {

      return {

        ok: false,

        status:
          response.status,

        error:
          `HTTP_${response.status}`

      };

    }

    return {

      ok: true,

      data:
        await response.json()

    };

  } catch (error) {

    return {

      ok: false,

      error:
        String(
          error?.message ||
          error
        )

    };

  }

}


/* ============================================================
   HELPERS
============================================================ */

function num(value) {

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


function address(value) {

  return String(
    value || ""
  ).toLowerCase();

}


function multiple(
  marketCap,
  target
) {

  if (
    !marketCap ||
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
   MEME SCORE
============================================================ */

function memeScore(
  name,
  symbol
) {

  const text =
    `${name || ""} ${symbol || ""}`
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
    "chad",
    "based",
    "goat",
    "ape",
    "degen",
    "shit",
    "woof",
    "wen",
    "yolo",
    "rat",
    "bear",
    "bull",
    "hood",
    "cash",
    "pump",
    "stonk"

  ];

  let score = 0;

  for (
    const word of words
  ) {

    if (
      text.includes(word)
    ) {

      score += 5;

    }

  }

  return Math.min(
    20,
    score
  );

}


/* ============================================================
   EXCLUSIONS
============================================================ */

const EXCLUDED = new Set([

  "0x0bd7d308f8e1639fab988df18a8011f41eacad73",

  "0x5fc5360d0400a0fd4f2af552add042d716f1d168"

]);


function isExcluded(
  token
) {

  const a =
    address(
      token.tokenAddress ||
      token.address
    );

  if (
    EXCLUDED.has(a)
  ) {

    return true;

  }

  const text =
    (
      `${token.name || ""} ` +
      `${token.symbol || ""}`
    )
      .toLowerCase();

  const excludedWords = [

    "wrapped ether",
    "weth",
    "usd coin",
    "usdc",
    "usdt",
    "tether",
    "tokenized stock",
    "stock token",
    "wrapped"

  ];

  return excludedWords.some(
    word =>
      text.includes(word)
  );

}


/* ============================================================
   DEX SCREENER DISCOVERY
============================================================ */

async function discoverFromDex() {

  const discovered =
    new Map();

  const endpoints = [

    "/token-profiles/latest/v1",

    "/token-boosts/latest/v1",

    "/token-boosts/top/v1"

  ];

  for (
    const endpoint
    of endpoints
  ) {

    if (
      !canRequest()
    ) {

      break;

    }

    const result =
      await getJson(
        CONFIG.DEX_URL +
        endpoint
      );

    if (
      !result.ok
    ) {

      continue;

    }

    const items =
      Array.isArray(
        result.data
      )
        ? result.data
        : [];

    for (
      const item
      of items
    ) {

      if (
        String(
          item.chainId
        ) !==
        CONFIG.CHAIN_ID
      ) {

        continue;

      }

      const tokenAddress =
        item.tokenAddress;

      if (
        !tokenAddress
      ) {

        continue;

      }

      if (
        isExcluded(item)
      ) {

        continue;

      }

      discovered.set(
        address(tokenAddress),
        {

          address:
            tokenAddress,

          source:
            endpoint,

          boosts:
            num(item.amount) || 0,

          totalBoosts:
            num(item.totalAmount) || 0

        }
      );

    }

  }

  return [
    ...discovered.values()
  ];

}


/* ============================================================
   DEX PAIR DATA
============================================================ */

async function getTokenPairs(
  tokenAddresses
) {

  const results = [];

  const unique =
    [
      ...new Set(
        tokenAddresses.map(
          address
        )
      )
    ];

  for (
    let i = 0;
    i < unique.length;
    i += 30
  ) {

    if (
      !canRequest()
    ) {

      break;

    }

    const batch =
      unique.slice(
        i,
        i + 30
      );

    const url =
      CONFIG.DEX_URL +
      "/tokens/v1/" +
      CONFIG.CHAIN_ID +
      "/" +
      batch.join(",");

    const result =
      await getJson(url);

    if (
      !result.ok
    ) {

      continue;

    }

    if (
      Array.isArray(
        result.data
      )
    ) {

      results.push(
        ...result.data
      );

    }

  }

  return results;

}


/* ============================================================
   ANALYSE PAIRS
============================================================ */

function analysePairs(
  tokenAddress,
  pairs
) {

  const matching =
    pairs.filter(
      pair => {

        const base =
          address(
            pair?.baseToken?.address
          );

        const quote =
          address(
            pair?.quoteToken?.address
          );

        return (
          base ===
            address(tokenAddress) ||
          quote ===
            address(tokenAddress)
        );

      }
    );

  if (
    !matching.length
  ) {

    return {

      verified: false,

      liquidityUsd: null,

      volume24h: null,

      buys24h: null,

      sells24h: null,

      buySellRatio: null,

      pressure:
        "UNKNOWN",

      marketCap: null,

      fdv: null,

      priceUsd: null,

      pairAgeHours: null,

      bestPair: null

    };

  }

  let liquidity = 0;

  let volume = 0;

  let buys = 0;

  let sells = 0;

  let bestPair = null;

  let bestLiquidity = -1;

  for (
    const pair
    of matching
  ) {

    const l =
      num(
        pair?.liquidity?.usd
      ) || 0;

    const v =
      num(
        pair?.volume?.h24
      ) || 0;

    const tx =
      pair?.txns?.h24 || {};

    liquidity += l;

    volume += v;

    buys +=
      num(tx.buys) || 0;

    sells +=
      num(tx.sells) || 0;

    if (
      l >
      bestLiquidity
    ) {

      bestLiquidity =
        l;

      bestPair =
        pair;

    }

  }

  let pressure =
    "NEUTRAL";

  if (
    buys >
    sells * 1.25
  ) {

    pressure =
      "BUY_PRESSURE";

  }

  if (
    sells >
    buys * 1.25
  ) {

    pressure =
      "SELL_PRESSURE";

  }

  const marketCap =
    num(
      bestPair?.marketCap
    ) ??
    num(
      bestPair?.fdv
    );

  const fdv =
    num(
      bestPair?.fdv
    );

  let pairAgeHours =
    null;

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
      3600000;

  }

  return {

    verified: true,

    liquidityUsd:
      round(
        liquidity
      ),

    volume24h:
      round(
        volume
      ),

    buys24h:
      buys,

    sells24h:
      sells,

    buySellRatio:
      sells > 0
        ? round(
            buys / sells
          )
        : null,

    pressure,

    marketCap,

    fdv,

    priceUsd:
      num(
        bestPair?.priceUsd
      ),

    pairAgeHours:
      pairAgeHours !== null
        ? round(
            pairAgeHours,
            2
          )
        : null,

    liquidityToMarketCap:
      marketCap > 0
        ? round(
            liquidity /
            marketCap,
            4
          )
        : null,

    volumeToMarketCap:
      marketCap > 0
        ? round(
            volume /
            marketCap,
            4
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

            liquidityUsd:
              num(
                bestPair?.liquidity?.usd
              ),

            volume24h:
              num(
                bestPair?.volume?.h24
              )

          }
        : null

  };

}


/* ============================================================
   BLOCKSCOUT HOLDERS
============================================================ */

async function getHolders(
  tokenAddress
) {

  if (
    !canRequest()
  ) {

    return {

      status:
        "UNVERIFIED",

      count: null,

      top10Share: null,

      top20Share: null,

      risk:
        "UNKNOWN"

    };

  }

  const url =
    CONFIG.BLOCKSCOUT_URL +
    "/tokens/" +
    tokenAddress +
    "/holders";

  const result =
    await getJson(url);

  if (
    !result.ok
  ) {

    return {

      status:
        "UNVERIFIED",

      count: null,

      top10Share: null,

      top20Share: null,

      risk:
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

  if (
    !items.length
  ) {

    return {

      status:
        "UNVERIFIED",

      count: null,

      top10Share: null,

      top20Share: null,

      risk:
        "UNKNOWN"

    };

  }

  const balances =
    items
      .map(
        x =>
          num(x.value)
      )
      .filter(
        x =>
          x !== null
      )
      .sort(
        (a, b) =>
          b - a
      );

  if (
    !balances.length
  ) {

    return {

      status:
        "UNVERIFIED",

      count: null,

      top10Share: null,

      top20Share: null,

      risk:
        "UNKNOWN"

    };

  }

  const total =
    balances.reduce(
      (a, b) =>
        a + b,
      0
    );

  if (
    total <= 0
  ) {

    return {

      status:
        "UNVERIFIED",

      count:
        balances.length,

      top10Share: null,

      top20Share: null,

      risk:
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
      100
    );

  const top20Share =
    round(
      top20 /
      total *
      100
    );

  let risk =
    "LOW";

  if (
    top10Share >
    50
  ) {

    risk =
      "VERY_HIGH";

  } else if (
    top10Share >
    35
  ) {

    risk =
      "HIGH";

  } else if (
    top10Share >
    20
  ) {

    risk =
      "MODERATE";

  }

  return {

    status:
      "VERIFIED",

    count:
      balances.length,

    top10Share,

    top20Share,

    risk

  };

}


/* ============================================================
   SCORE
============================================================ */

function scoreToken(
  token,
  dex,
  holders
) {

  let score = 0;

  const reasons = [];

  if (
    dex.marketCap !== null &&
    dex.marketCap <=
      CONFIG.MINIMUMS.MARKET_CAP_MAX
  ) {

    if (
      dex.marketCap <
      1_000_000
    ) {

      score += 20;

      reasons.push(
        "Very early market cap"
      );

    } else if (
      dex.marketCap <
      10_000_000
    ) {

      score += 15;

      reasons.push(
        "Early market cap"
      );

    } else if (
      dex.marketCap <
      25_000_000
    ) {

      score += 10;

    } else {

      score += 5;

    }

  }

  const meme =
    memeScore(
      token.name,
      token.symbol
    );

  if (
    meme >= 15
  ) {

    score += 15;

    reasons.push(
      "Strong meme-name signal"
    );

  } else if (
    meme >= 10
  ) {

    score += 10;

  } else if (
    meme >= 5
  ) {

    score += 5;

  }

  if (
    dex.liquidityUsd !== null
  ) {

    if (
      dex.liquidityUsd >=
      100000
    ) {

      score += 15;

      reasons.push(
        "Strong liquidity"
      );

    } else if (
      dex.liquidityUsd >=
      50000
    ) {

      score += 12;

    } else if (
      dex.liquidityUsd >=
      25000
    ) {

      score += 7;

    }

  }

  if (
    dex.volume24h !== null
  ) {

    if (
      dex.volume24h >=
      500000
    ) {

      score += 15;

      reasons.push(
        "Very high 24h volume"
      );

    } else if (
      dex.volume24h >=
      100000
    ) {

      score += 12;

      reasons.push(
        "High 24h volume"
      );

    } else if (
      dex.volume24h >=
      10000
    ) {

      score += 7;

    }

  }

  if (
    dex.pressure ===
    "BUY_PRESSURE"
  ) {

    score += 10;

    reasons.push(
      "Buy pressure"
    );

  } else if (
    dex.pressure ===
    "NEUTRAL"
  ) {

    score += 4;

  }

  if (
    holders.status ===
    "VERIFIED"
  ) {

    if (
      holders.risk ===
      "LOW"
    ) {

      score += 10;

      reasons.push(
        "Low holder concentration"
      );

    } else if (
      holders.risk ===
      "MODERATE"
    ) {

      score += 5;

    }

  }

  if (
    token.boosts >
    0
  ) {

    score += 3;

    reasons.push(
      "DEX Screener boost activity"
    );

  }

  if (
    dex.pairAgeHours !== null &&
    dex.pairAgeHours <
    24
  ) {

    score += 5;

    reasons.push(
      "Very young trading pair"
    );

  }

  return {

    score:
      Math.min(
        100,
        score
      ),

    memeScore:
      meme,

    reasons

  };

}


/* ============================================================
   RISK FLAGS
============================================================ */

function riskFlags(
  dex,
  holders
) {

  const flags = [];

  if (
    dex.liquidityUsd !== null &&
    dex.liquidityUsd <
    CONFIG.MINIMUMS.LIQUIDITY
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

  }

  if (
    dex.volume24h !== null &&
    dex.volume24h <
    CONFIG.MINIMUMS.VOLUME_24H
  ) {

    flags.push(
      "LOW_VOLUME"
    );

  }

  if (
    dex.pressure ===
    "SELL_PRESSURE"
  ) {

    flags.push(
      "SELL_PRESSURE"
    );

  }

  if (
    holders.status ===
    "VERIFIED"
  ) {

    if (
      holders.risk ===
      "VERY_HIGH"
    ) {

      flags.push(
        "VERY_HIGH_HOLDER_CONCENTRATION"
      );

    } else if (
      holders.risk ===
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
   TARGET ANALYSIS
============================================================ */

function targets(
  marketCap
) {

  return {

    to100M:
      multiple(
        marketCap,
        100000000
      ),

    to250M:
      multiple(
        marketCap,
        250000000
      ),

    to500M:
      multiple(
        marketCap,
        500000000
      )

  };

}


/* ============================================================
   TELEGRAM
============================================================ */

async function telegram(
  env,
  message
) {

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {

    return {

      sent: false,

      error:
        "TELEGRAM_NOT_CONFIGURED"

    };

  }

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

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

              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                message,

              disable_web_page_preview:
                false

            })

        }
      );

    const data =
      await response.json();

    return {

      sent:
        response.ok &&
        data.ok === true,

      data

    };

  } catch (error) {

    return {

      sent: false,

      error:
        String(
          error?.message ||
          error
        )

    };

  }

}


/* ============================================================
   FORMAT ALERT
============================================================ */

function formatAlert(
  token
) {

  const dex =
    token.dex;

  const holder =
    token.holders;

  let text =

    `🚨 ROBINHOOD CHAIN MEME ALERT\n\n` +

    `🪙 ${token.name} (${token.symbol})\n` +

    `📊 Score: ${token.score}/100\n` +

    `💰 Market Cap: $${formatMoney(dex.marketCap)}\n` +

    `💧 Liquidity: $${formatMoney(dex.liquidityUsd)}\n` +

    `📈 24h Volume: $${formatMoney(dex.volume24h)}\n` +

    `🟢 Buys: ${dex.buys24h ?? "UNVERIFIED"}\n` +

    `🔴 Sells: ${dex.sells24h ?? "UNVERIFIED"}\n` +

    `⚖️ Pressure: ${dex.pressure}\n` +

    `👥 Holders: ${
      holder.status === "VERIFIED"
        ? holder.count
        : "UNVERIFIED"
    }\n` +

    `🐋 Top 10: ${
      holder.top10Share !== null
        ? holder.top10Share + "%"
        : "UNVERIFIED"
    }\n\n` +

    `🔥 Reasons:\n` +

    token.reasons
      .slice(0, 6)
      .map(
        x => `• ${x}`
      )
      .join("\n") +

    `\n\n⚠️ Risk:\n` +

    (
      token.riskFlags.length
        ? token.riskFlags
            .map(
              x => `• ${x}`
            )
            .join("\n")
        : "• No detected critical flags"
    ) +

    `\n\n🎯 Theoretical MC multiples:\n` +

    `100M: ${token.targets.to100M}x\n` +

    `250M: ${token.targets.to250M}x\n` +

    `500M: ${token.targets.to500M}x\n\n` +

    `📄 Contract:\n${token.address}\n\n` +

    `🔎 DEX:\n${
      dex.bestPair?.url ||
      "Unavailable"
    }\n\n` +

    `⚠️ Research alert only — not financial advice.`;

  return text;

}


function formatMoney(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "UNVERIFIED";

  }

  if (
    value >=
    1000000
  ) {

    return (
      value /
      1000000
    ).toFixed(2) +
    "M";

  }

  if (
    value >=
    1000
  ) {

    return (
      value /
      1000
    ).toFixed(1) +
    "K";

  }

  return String(
    Math.round(value)
  );

}


/* ============================================================
   MAIN SCAN
============================================================ */

async function scan(env) {

  requestCount = 0;

  const discovered =
    await discoverFromDex();

  if (
    !discovered.length
  ) {

    return {

      status:
        "NO_DISCOVERY_DATA",

      candidates: [],

      alerts: [],

      requestCount

    };

  }

  /*
   * Get DEX data.
   */

  const pairs =
    await getTokenPairs(
      discovered
        .map(
          x =>
            x.address
        )
    );

  /*
   * Group pairs by token.
   */

  const candidates = [];

  for (
    const token
    of discovered
  ) {

    const dex =
      analysePairs(
        token.address,
        pairs
      );

    if (
      !dex.verified
    ) {

      continue;

    }

    /*
     * Only analyse plausible
     * early-stage candidates.
     */

    if (
      dex.marketCap === null
    ) {

      continue;

    }

    if (
      dex.marketCap >
      CONFIG.MINIMUMS.MARKET_CAP_MAX
    ) {

      continue;

    }

    if (
      dex.liquidityUsd === null
    ) {

      continue;

    }

    if (
      dex.volume24h === null
    ) {

      continue;

    }

    /*
     * Holder lookup.
     */

    let holders = {

      status:
        "UNVERIFIED",

      count: null,

      top10Share: null,

      top20Share: null,

      risk:
        "UNKNOWN"

    };

    if (
      canRequest()
    ) {

      holders =
        await getHolders(
          token.address
        );

    }

    /*
     * Score.
     */

    const scoring =
      scoreToken(
        token,
        dex,
        holders
      );

    const risks =
      riskFlags(
        dex,
        holders
      );

    const candidate = {

      address:
        token.address,

      name:
        "Unknown",

      symbol:
        "UNKNOWN",

      source:
        token.source,

      boosts:
        token.boosts,

      totalBoosts:
        token.totalBoosts,

      score:
        scoring.score,

      memeScore:
        scoring.memeScore,

      reasons:
        scoring.reasons,

      dex,

      holders,

      riskFlags:
        risks,

      targets:
        targets(
          dex.marketCap
        )

    };

    candidates.push(
      candidate
    );

  }

  /*
   * Rank.
   */

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const ranked =
    candidates.slice(
      0,
      CONFIG.MAX_CANDIDATES
    );

  /*
   * Telegram alerts.
   *
   * We deliberately only alert on
   * verified liquidity + volume.
   */

  const alerts = [];

  for (
    const candidate
    of ranked
  ) {

    if (
      candidate.score <
      CONFIG.ALERT_SCORE
    ) {

      continue;

    }

    if (
      candidate.riskFlags.includes(
        "VERY_HIGH_HOLDER_CONCENTRATION"
      )
    ) {

      continue;

    }

    if (
      candidate.riskFlags.includes(
        "LOW_LIQUIDITY"
      )
    ) {

      continue;

    }

    if (
      candidate.riskFlags.includes(
        "LOW_VOLUME"
      )
    ) {

      continue;

    }

    const message =
      formatAlert(
        candidate
      );

    const result =
      await telegram(
        env,
        message
      );

    alerts.push({

      contract:
        candidate.address,

      score:
        candidate.score,

      sent:
        result.sent,

      error:
        result.error ||
        null

    });

  }

  return {

    status:
      "ONLINE",

    discovered:
      discovered.length,

    pairs:
      pairs.length,

    candidates:
      ranked,

    alerts,

    requestCount,

    requestLimit:
      CONFIG.MAX_REQUESTS

  };

}


/* ============================================================
   HEALTH
============================================================ */

function health(env) {

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      CONFIG.VERSION,

    status:
      "ONLINE",

    chain: {

      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC_URL

    },

    telegram: {

      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      chatId:
        env.TELEGRAM_CHAT_ID ||
        null

    },

    dataSources: [

      "DEX Screener",

      "Robinhood Chain Blockscout"

    ],

    cost:
      "FREE-FIRST",

    noFabrication:
      true,

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
    env
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

      return Response.json(
        health(env),
        {
          headers: {
            "access-control-allow-origin":
              "*",
            "cache-control":
              "no-store"
          }
        }
      );

    }


    /*
     * TEST TELEGRAM
     */

    if (
      url.pathname ===
      "/telegram-test"
    ) {

      const result =
        await telegram(
          env,
          "🤖 Robinhood Chain Meme Hunter V16\n\nTelegram connection test successful."
        );

      return Response.json(
        result,
        {
          headers: {
            "access-control-allow-origin":
              "*"
          }
        }
      );

    }


    /*
     * SCAN
     */

    if (
      url.pathname ===
      "/" ||
      url.pathname ===
      "/scan"
    ) {

      try {

        const result =
          await scan(env);

        return Response.json(
          {
            agent:
              "Robinhood Chain Meme Hunter",

            version:
              CONFIG.VERSION,

            ...result,

            timestamp:
              new Date().toISOString()

          },
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
            status: 500
          }
        );

      }

    }


    return new Response(
      "Robinhood Chain Meme Hunter V16 ONLINE",
      {
        status: 200
      }
    );

  }

};
