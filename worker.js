/**
 * ROBINHOOD CHAIN MEME HUNTER — V17
 *
 * FREE-FIRST
 *
 * Discovery:
 *   DEX Screener latest token profiles
 *   DEX Screener latest boosted tokens
 *
 * Analysis:
 *   DEX liquidity
 *   24h volume
 *   buys / sells
 *   market cap / FDV
 *   pair age
 *   liquidity / market-cap ratio
 *   volume / market-cap ratio
 *   Blockscout holders where available
 *
 * Telegram:
 *   Automatic alerts
 *   /test-telegram
 *   /scan
 *   /health
 *
 * Cloudflare Worker
 */

const CONFIG = {
  VERSION: "V17",

  CHAIN_NAME: "Robinhood Chain",

  // DEX Screener chain identifier
  DEX_CHAIN: "robinhood",

  BLOCKSCOUT_URL:
    "https://robinhoodchain.blockscout.com/api/v2",

  DEX_URL:
    "https://api.dexscreener.com",

  MAX_DISCOVERY: 60,

  MAX_CANDIDATES: 12,

  MAX_HOLDER_CHECKS: 5,

  ALERT_SCORE: 70,

  MIN_LIQUIDITY: 25000,

  MIN_VOLUME_24H: 10000,

  MAX_MARKET_CAP: 50000000,

  MIN_MARKET_CAP: 1000,

  MAX_PAIR_AGE_HOURS: 720,

  TARGETS: [
    100000000,
    250000000,
    500000000
  ]
};


/* ============================================================
   ENVIRONMENT
============================================================ */

function getTelegramToken(env) {
  return (
    env.TELEGRAM_BOT_TOKEN ||
    env.TELEGRAM_TOKEN ||
    ""
  );
}

function getTelegramChatId(env) {
  return (
    env.TELEGRAM_CHAT_ID ||
    env.CHAT_ID ||
    ""
  );
}


/* ============================================================
   FETCH
============================================================ */

async function fetchJson(url) {

  try {

    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
        "user-agent":
          "Robinhood-Chain-Meme-Hunter/17"
      }
    });

    if (!response.ok) {

      return {
        ok: false,
        status: response.status,
        error: `HTTP_${response.status}`
      };

    }

    const data =
      await response.json();

    return {
      ok: true,
      data
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

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;

}


function round(value, decimals = 2) {

  if (
    value === null ||
    value === undefined
  ) {
    return null;
  }

  return Number(
    Number(value).toFixed(decimals)
  );

}


function lower(value) {

  return String(
    value || ""
  ).toLowerCase();

}


function formatMoney(value) {

  if (
    value === null ||
    value === undefined
  ) {
    return "UNVERIFIED";
  }

  if (value >= 1000000000) {
    return `$${round(value / 1000000000, 2)}B`;
  }

  if (value >= 1000000) {
    return `$${round(value / 1000000, 2)}M`;
  }

  if (value >= 1000) {
    return `$${round(value / 1000, 1)}K`;
  }

  return `$${round(value, 2)}`;

}


function hoursSince(timestamp) {

  if (!timestamp) {
    return null;
  }

  const t = Number(timestamp);

  if (!Number.isFinite(t)) {
    return null;
  }

  return (
    Date.now() -
    t
  ) / 3600000;

}


function targetMultiple(
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
   MEME / NARRATIVE SCORE
============================================================ */

function memeScore(profile, pair) {

  const text = (
    lower(profile?.description) +
    " " +
    lower(profile?.name) +
    " " +
    lower(profile?.symbol) +
    " " +
    lower(pair?.baseToken?.name) +
    " " +
    lower(pair?.baseToken?.symbol)
  );

  const words = [

    "meme",
    "dog",
    "doge",
    "shib",
    "inu",
    "cat",
    "kitty",
    "pepe",
    "frog",
    "wojak",
    "bonk",
    "wif",
    "goat",
    "chad",
    "ape",
    "degen",
    "moon",
    "shit",
    "woof",
    "yolo",
    "based",
    "bull",
    "bear",
    "frog",
    "penguin",
    "panda",
    "trump",
    "elon",
    "ai"
  ];

  let score = 0;

  for (
    const word of words
  ) {

    if (
      text.includes(word)
    ) {
      score += 3;
    }

  }

  /*
   * Social links increase narrative confidence,
   * but are NOT proof of quality.
   */

  if (
    Array.isArray(profile?.links)
  ) {

    if (
      profile.links.some(
        x =>
          lower(x?.type)
            .includes("twitter") ||
          lower(x?.label)
            .includes("twitter") ||
          lower(x?.type)
            .includes("telegram") ||
          lower(x?.label)
            .includes("telegram")
      )
    ) {
      score += 3;
    }

  }

  return Math.min(
    15,
    score
  );

}


/* ============================================================
   DISCOVERY
============================================================ */

async function discoverTokens() {

  const sources = [];

  /*
   * Latest profiles
   */

  const profiles =
    await fetchJson(
      CONFIG.DEX_URL +
      "/token-profiles/latest/v1"
    );

  if (
    profiles.ok &&
    Array.isArray(
      profiles.data
    )
  ) {

    sources.push(
      ...profiles.data
    );

  }


  /*
   * Latest boosts
   *
   * Boosts are ONLY used as discovery.
   * They do NOT automatically make a token bullish.
   */

  const boosts =
    await fetchJson(
      CONFIG.DEX_URL +
      "/token-boosts/latest/v1"
    );

  if (
    boosts.ok &&
    Array.isArray(
      boosts.data
    )
  ) {

    sources.push(
      ...boosts.data
    );

  }


  /*
   * Filter Robinhood Chain
   */

  const map =
    new Map();

  for (
    const item of sources
  ) {

    if (
      lower(item?.chainId) !==
      CONFIG.DEX_CHAIN
    ) {
      continue;
    }

    const address =
      lower(
        item?.tokenAddress
      );

    if (
      !address ||
      address.length < 20
    ) {
      continue;
    }

    if (
      !map.has(address)
    ) {

      map.set(
        address,
        {
          address,
          profile: item
        }
      );

    }

  }

  return [
    ...map.values()
  ].slice(
    0,
    CONFIG.MAX_DISCOVERY
  );

}


/* ============================================================
   GET DEX DATA
============================================================ */

async function getDexData(
  addresses
) {

  if (
    !addresses.length
  ) {

    return [];

  }

  const clean =
    [
      ...new Set(
        addresses.map(
          lower
        )
      )
    ].slice(
      0,
      30
    );

  const url =
    CONFIG.DEX_URL +
    "/tokens/v1/" +
    CONFIG.DEX_CHAIN +
    "/" +
    clean.join(",");

  const result =
    await fetchJson(url);

  if (
    !result.ok ||
    !Array.isArray(
      result.data
    )
  ) {

    return [];

  }

  return result.data;

}


/* ============================================================
   SELECT BEST PAIR
============================================================ */

function bestPairForToken(
  address,
  pairs
) {

  const matches =
    pairs.filter(
      pair => {

        const base =
          lower(
            pair?.baseToken?.address
          );

        const quote =
          lower(
            pair?.quoteToken?.address
          );

        return (
          base === address ||
          quote === address
        );

      }
    );

  if (
    !matches.length
  ) {

    return null;

  }

  matches.sort(
    (a, b) => {

      const la =
        num(
          a?.liquidity?.usd
        ) || 0;

      const lb =
        num(
          b?.liquidity?.usd
        ) || 0;

      return lb - la;

    }
  );

  return matches[0];

}


/* ============================================================
   HOLDER ANALYSIS
============================================================ */

async function holderAnalysis(
  address
) {

  const result =
    await fetchJson(
      CONFIG.BLOCKSCOUT_URL +
      "/tokens/" +
      address +
      "/holders"
    );

  if (
    !result.ok
  ) {

    return {
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN",
      error: result.error
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
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN"
    };

  }

  const balances =
    items
      .map(
        holder =>
          num(
            holder?.value
          )
      )
      .filter(
        x =>
          x !== null &&
          x > 0
      )
      .sort(
        (a, b) =>
          b - a
      );

  if (
    !balances.length
  ) {

    return {
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN"
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
      status: "UNVERIFIED",
      top10Share: null,
      top20Share: null,
      concentrationRisk: "UNKNOWN"
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

    status: "VERIFIED",

    holdersSampled:
      balances.length,

    top10Share,

    top20Share,

    concentrationRisk:
      risk

  };

}


/* ============================================================
   ANALYSE TOKEN
============================================================ */

function analyseToken(
  discovered,
  pair
) {

  if (!pair) {

    return {
      status: "NO_DEX_PAIR",
      address:
        discovered.address
    };

  }

  const liquidity =
    num(
      pair?.liquidity?.usd
    );

  const volume =
    num(
      pair?.volume?.h24
    );

  const buys =
    num(
      pair?.txns?.h24?.buys
    );

  const sells =
    num(
      pair?.txns?.h24?.sells
    );

  const marketCap =
    num(
      pair?.marketCap
    ) ??
    num(
      pair?.fdv
    );

  const pairAgeHours =
    hoursSince(
      pair?.pairCreatedAt
    );

  const buySellRatio =
    sells !== null &&
    sells > 0
      ? round(
          buys / sells,
          2
        )
      : null;

  const liquidityRatio =
    marketCap &&
    marketCap > 0 &&
    liquidity !== null
      ? liquidity /
        marketCap
      : null;

  const volumeRatio =
    marketCap &&
    marketCap > 0 &&
    volume !== null
      ? volume /
        marketCap
      : null;

  let pressure =
    "UNKNOWN";

  if (
    buys !== null &&
    sells !== null
  ) {

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

    } else {

      pressure =
        "NEUTRAL";

    }

  }


  /*
   * Score
   */

  let score = 0;

  const reasons = [];

  /*
   * Early market cap
   */

  if (
    marketCap !== null
  ) {

    if (
      marketCap < 250000
    ) {

      score += 20;
      reasons.push(
        "VERY_EARLY_MC"
      );

    } else if (
      marketCap < 1000000
    ) {

      score += 18;
      reasons.push(
        "EARLY_MC"
      );

    } else if (
      marketCap < 5000000
    ) {

      score += 15;

    } else if (
      marketCap < 10000000
    ) {

      score += 10;

    } else if (
      marketCap < 25000000
    ) {

      score += 5;

    }

  }


  /*
   * Liquidity
   */

  if (
    liquidity !== null
  ) {

    if (
      liquidity >= 100000
    ) {

      score += 15;
      reasons.push(
        "STRONG_LIQUIDITY"
      );

    } else if (
      liquidity >= 50000
    ) {

      score += 12;

    } else if (
      liquidity >= 25000
    ) {

      score += 8;

    }

  }


  /*
   * Volume
   */

  if (
    volume !== null
  ) {

    if (
      volume >= 500000
    ) {

      score += 15;
      reasons.push(
        "VERY_HIGH_VOLUME"
      );

    } else if (
      volume >= 100000
    ) {

      score += 12;
      reasons.push(
        "HIGH_VOLUME"
      );

    } else if (
      volume >= 25000
    ) {

      score += 8;

    } else if (
      volume >= 10000
    ) {

      score += 5;

    }

  }


  /*
   * Buy pressure
   */

  if (
    pressure ===
    "BUY_PRESSURE"
  ) {

    score += 15;
    reasons.push(
      "BUY_PRESSURE"
    );

  } else if (
    pressure ===
    "NEUTRAL"
  ) {

    score += 5;

  }


  /*
   * Liquidity ratio
   */

  if (
    liquidityRatio !== null
  ) {

    if (
      liquidityRatio >= 0.20
    ) {

      score += 10;
      reasons.push(
        "STRONG_LIQUIDITY_RATIO"
      );

    } else if (
      liquidityRatio >= 0.10
    ) {

      score += 7;

    } else if (
      liquidityRatio >= 0.05
    ) {

      score += 4;

    }

  }


  /*
   * Volume ratio
   */

  if (
    volumeRatio !== null
  ) {

    if (
      volumeRatio >= 0.50
    ) {

      score += 10;
      reasons.push(
        "EXTREME_VOLUME_RATIO"
      );

    } else if (
      volumeRatio >= 0.20
    ) {

      score += 7;

    } else if (
      volumeRatio >= 0.05
    ) {

      score += 4;

    }

  }


  /*
   * Pair age
   */

  if (
    pairAgeHours !== null
  ) {

    if (
      pairAgeHours <= 6
    ) {

      score += 10;
      reasons.push(
        "VERY_NEW_PAIR"
      );

    } else if (
      pairAgeHours <= 24
    ) {

      score += 8;

    } else if (
      pairAgeHours <= 72
    ) {

      score += 5;

    }

  }


  /*
   * Meme score
   */

  const meme =
    memeScore(
      discovered.profile,
      pair
    );

  if (
    meme >= 10
  ) {

    score += 5;

    reasons.push(
      "MEME_NARRATIVE"
    );

  } else if (
    meme >= 5
  ) {

    score += 3;

  }


  /*
   * Risk flags
   */

  const riskFlags = [];

  if (
    liquidity !== null &&
    liquidity <
    CONFIG.MIN_LIQUIDITY
  ) {

    riskFlags.push(
      "LOW_LIQUIDITY"
    );

  }

  if (
    volume !== null &&
    volume <
    CONFIG.MIN_VOLUME_24H
  ) {

    riskFlags.push(
      "LOW_VOLUME"
    );

  }

  if (
    pressure ===
    "SELL_PRESSURE"
  ) {

    riskFlags.push(
      "SELL_PRESSURE"
    );

  }

  if (
    liquidityRatio !== null &&
    liquidityRatio < 0.03
  ) {

    riskFlags.push(
      "WEAK_LIQUIDITY_RATIO"
    );

  }


  /*
   * Classification
   */

  let category =
    "WATCH";

  if (
    score >=
    CONFIG.ALERT_SCORE &&
    liquidity !== null &&
    liquidity >=
      CONFIG.MIN_LIQUIDITY &&
    volume !== null &&
    volume >=
      CONFIG.MIN_VOLUME_24H &&
    pressure !==
      "SELL_PRESSURE" &&
    !riskFlags.includes(
      "WEAK_LIQUIDITY_RATIO"
    )
  ) {

    category =
      "HIGH-POTENTIAL";

  } else if (
    score >= 55
  ) {

    category =
      "WATCH";

  } else if (
    score >= 35
  ) {

    category =
      "EARLY";

  } else {

    category =
      "LOW-CONVICTION";

  }


  return {

    status:
      "VERIFIED",

    address:
      discovered.address,

    name:
      pair?.baseToken?.name ||
      discovered.profile?.name ||
      "Unknown",

    symbol:
      pair?.baseToken?.symbol ||
      "UNKNOWN",

    marketCap,

    fdv:
      num(
        pair?.fdv
      ),

    priceUsd:
      num(
        pair?.priceUsd
      ),

    liquidityUsd:
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    buySellRatio,

    pressure,

    pairAgeHours:
      pairAgeHours !== null
        ? round(
            pairAgeHours,
            2
          )
        : null,

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

    memeScore:
      meme,

    discoveryScore:
      score,

    category,

    reasons,

    riskFlags,

    dex:
      pair?.dexId ||
      null,

    pairAddress:
      pair?.pairAddress ||
      null,

    dexUrl:
      pair?.url ||
      null,

    profileUrl:
      discovered.profile?.url ||
      null,

    targetAnalysis: {

      to100M:
        targetMultiple(
          marketCap,
          100000000
        ),

      to250M:
        targetMultiple(
          marketCap,
          250000000
        ),

      to500M:
        targetMultiple(
          marketCap,
          500000000
        )

    }

  };

}


/* ============================================================
   TELEGRAM
============================================================ */

async function telegramSend(
  env,
  message
) {

  const token =
    getTelegramToken(env);

  const chatId =
    getTelegramChatId(env);

  if (
    !token ||
    !chatId
  ) {

    return {
      ok: false,
      error:
        "TELEGRAM_NOT_CONFIGURED"
    };

  }

  const url =
    `https://api.telegram.org/bot${token}/sendMessage`;

  try {

    const response =
      await fetch(
        url,
        {

          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({

              chat_id:
                chatId,

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

      ok:
        response.ok &&
        data?.ok === true,

      data

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
   TELEGRAM FORMAT
============================================================ */

function telegramAlert(
  coin
) {

  const lines = [

    "🚨 ROBINHOOD CHAIN ALERT",

    "",

    `🔥 ${coin.name} ($${coin.symbol})`,

    `⭐ Score: ${coin.discoveryScore}/100`,

    `🎯 ${coin.category}`,

    "",

    `💰 Market Cap: ${formatMoney(coin.marketCap)}`,

    `💧 Liquidity: ${formatMoney(coin.liquidityUsd)}`,

    `📊 24h Volume: ${formatMoney(coin.volume24h)}`,

    `🟢 Buys: ${coin.buys24h ?? "UNVERIFIED"}`,

    `🔴 Sells: ${coin.sells24h ?? "UNVERIFIED"}`,

    `⚖️ Buy/Sell: ${coin.buySellRatio ?? "UNVERIFIED"}`,

    `📈 Pressure: ${coin.pressure}`,

    `⏱ Pair Age: ${
      coin.pairAgeHours !== null
        ? coin.pairAgeHours + "h"
        : "UNVERIFIED"
    }`,

    `💦 Liquidity/MC: ${
      coin.liquidityToMarketCap !== null
        ? (coin.liquidityToMarketCap * 100).toFixed(2) + "%"
        : "UNVERIFIED"
    }`,

    `📊 Volume/MC: ${
      coin.volumeToMarketCap !== null
        ? (coin.volumeToMarketCap * 100).toFixed(2) + "%"
        : "UNVERIFIED"
    }`,

    `🐸 Meme Score: ${coin.memeScore}/15`,

    "",

    "🎯 THEORETICAL MC MULTIPLES",

    `100M: ${coin.targetAnalysis.to100M ?? "UNVERIFIED"}x`,

    `250M: ${coin.targetAnalysis.to250M ?? "UNVERIFIED"}x`,

    `500M: ${coin.targetAnalysis.to500M ?? "UNVERIFIED"}x`,

    "",

    `🧠 Reasons: ${
      coin.reasons.length
        ? coin.reasons.join(", ")
        : "None"
    }`,

    `⚠️ Risks: ${
      coin.riskFlags.length
        ? coin.riskFlags.join(", ")
        : "None detected"
    }`,

    "",

    `📄 Contract:`,

    coin.address,

    "",

    coin.dexUrl ||
      "DEX Screener link unavailable"

  ];

  return lines.join("\n");

}


/* ============================================================
   SCAN
============================================================ */

async function runScan(env) {

  const discovered =
    await discoverTokens();

  if (
    !discovered.length
  ) {

    return {

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "NO_DISCOVERY_DATA",

      discoverySources:
        [
          "DEXSCREENER_LATEST_PROFILES",
          "DEXSCREENER_LATEST_BOOSTS"
        ],

      candidates: [],

      alerts: [],

      timestamp:
        new Date().toISOString()

    };

  }


  const addresses =
    discovered.map(
      x =>
        x.address
    );


  const pairs =
    await getDexData(
      addresses
    );


  const analysed = [];


  for (
    const token
    of discovered
  ) {

    const pair =
      bestPairForToken(
        token.address,
        pairs
      );

    if (!pair) {
      continue;
    }

    const result =
      analyseToken(
        token,
        pair
      );

    if (
      result.status ===
      "VERIFIED"
    ) {

      analysed.push(
        result
      );

    }

  }


  analysed.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );


  const candidates =
    analysed.slice(
      0,
      CONFIG.MAX_CANDIDATES
    );


  /*
   * Holder analysis on the strongest
   * candidates only.
   *
   * Blockscout supports a token-holder
   * endpoint, but availability/rate
   * limits can vary by instance.
   */

  const holderResults = [];

  for (
    const coin of candidates.slice(
      0,
      CONFIG.MAX_HOLDER_CHECKS
    )
  ) {

    const holder =
      await holderAnalysis(
        coin.address
      );

    holderResults.push({

      address:
        coin.address,

      holder

    });

  }


  /*
   * Attach holder data
   */

  for (
    const item of holderResults
  ) {

    const coin =
      candidates.find(
        x =>
          lower(x.address) ===
          lower(item.address)
      );

    if (
      coin
    ) {

      coin.holderAnalysis =
        item.holder;

      if (
        item.holder.status ===
        "VERIFIED"
      ) {

        if (
          item.holder.top10Share >
          50
        ) {

          coin.riskFlags.push(
            "VERY_HIGH_HOLDER_CONCENTRATION"
          );

          coin.category =
            "WATCH";

        } else if (
          item.holder.top10Share >
          35
        ) {

          coin.riskFlags.push(
            "HIGH_HOLDER_CONCENTRATION"
          );

        }

      }

    }

  }


  /*
   * Telegram alerts
   */

  const alerts = [];


  for (
    const coin of candidates
  ) {

    if (
      coin.discoveryScore <
      CONFIG.ALERT_SCORE
    ) {

      continue;

    }

    if (
      coin.liquidityUsd === null ||
      coin.liquidityUsd <
      CONFIG.MIN_LIQUIDITY
    ) {

      continue;

    }

    if (
      coin.volume24h === null ||
      coin.volume24h <
      CONFIG.MIN_VOLUME_24H
    ) {

      continue;

    }

    if (
      coin.pressure ===
      "SELL_PRESSURE"
    ) {

      continue;

    }


    /*
     * Avoid alerting on extreme
     * holder concentration.
     */

    if (
      coin.holderAnalysis?.status ===
      "VERIFIED" &&
      coin.holderAnalysis
        ?.top10Share >
      50
    ) {

      continue;

    }


    const message =
      telegramAlert(
        coin
      );

    const sent =
      await telegramSend(
        env,
        message
      );

    alerts.push({

      address:
        coin.address,

      name:
        coin.name,

      score:
        coin.discoveryScore,

      telegram:
        sent.ok
          ? "SENT"
          : "FAILED",

      telegramError:
        sent.ok
          ? null
          : sent.error ||
            sent.data?.description ||
            null

    });

  }


  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      CONFIG.VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins and automatically alert Telegram when verified conditions are met.",

    telegram: {

      configured:
        Boolean(
          getTelegramToken(env) &&
          getTelegramChatId(env)
        ),

      chatId:
        getTelegramChatId(env)
          ? getTelegramChatId(env)
          : null,

      alertsSent:
        alerts.filter(
          x =>
            x.telegram ===
            "SENT"
        ).length

    },

    discovery: {

      sources: [

        "DEXSCREENER_LATEST_PROFILES",

        "DEXSCREENER_LATEST_BOOSTS"

      ],

      discovered:
        discovered.length,

      dexPairs:
        pairs.length

    },

    candidates,

    alerts,

    validation: {

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

      holderConcentration:
        "BLOCKSCOUT WHEN AVAILABLE",

      walletActivity:
        "NOT VERIFIED",

      accumulationDistribution:
        "NOT VERIFIED",

      smartMoney:
        "NOT VERIFIED"

    },

    dataIntegrity: {

      noFabricatedMetrics:
        true,

      unavailableData:
        "UNVERIFIED",

      highPotentialRequires: [

        "verified liquidity",

        "verified 24h volume",

        "no sell-pressure requirement",

        "acceptable liquidity ratio"

      ]

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

        chain:
          CONFIG.CHAIN_NAME,

        telegramConfigured:
          Boolean(
            getTelegramToken(env) &&
            getTelegramChatId(env)
          ),

        routes: [

          "/health",

          "/test-telegram",

          "/scan"

        ],

        discovery:
          "DEX Screener latest profiles + boosts",

        cost:
          "FREE",

        timestamp:
          new Date().toISOString()

      });

    }


    /*
     * TEST TELEGRAM
     */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await telegramSend(
          env,
          [
            "🤖 ROBINHOOD CHAIN MEME HUNTER",

            "",

            "✅ Telegram connection working.",

            `Version: ${CONFIG.VERSION}`,

            "",

            "The bot is ready to receive scanner alerts."

          ].join("\n")
        );

      return Response.json({

        telegramConfigured:
          Boolean(
            getTelegramToken(env) &&
            getTelegramChatId(env)
          ),

        result

      });

    }


    /*
     * MANUAL SCAN
     */

    if (
      url.pathname ===
      "/scan"
    ) {

      try {

        const result =
          await runScan(
            env
          );

        return Response.json(
          result
        );

      } catch (error) {

        return Response.json({

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

        }, {
          status: 500
        });

      }

    }


    return new Response(
      "Robinhood Chain Meme Hunter V17 ONLINE",
      {
        status: 200
      }
    );

  },


  /*
   * CLOUDFLARE CRON
   *
   * Configure a cron trigger in Cloudflare,
   * e.g. every 5 minutes:
   *
   * */5 * * * *
   */

  async scheduled(
    event,
    env,
    ctx
  ) {

    ctx.waitUntil(
      runScan(env)
    );

  }

};
