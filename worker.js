/**
 * ROBINHOOD CHAIN MEME HUNTER — V18
 *
 * Multi-query DEX discovery
 * Verified liquidity + volume
 * Buy/sell pressure
 * Pair age
 * Market-cap targets
 * Telegram alerts
 *
 * Chain ID: 4663
 *
 * Cloudflare:
 *
 * Secret:
 * TELEGRAM_BOT_TOKEN
 *
 * Variable:
 * TELEGRAM_CHAT_ID
 */

const CONFIG = {

  VERSION: "V18",

  CHAIN_ID: 4663,

  CHAIN: "robinhood",

  RPC:
    "https://rpc.mainnet.chain.robinhood.com",

  DEX:
    "https://api.dexscreener.com",

  MAX_REQUESTS: 10,

  MAX_RESULTS: 100,

  MAX_MARKET_CAP: 50000000,

  MIN_MARKET_CAP: 0,

  MIN_LIQUIDITY: 25000,

  MIN_VOLUME: 10000,

  ALERT_SCORE: 65,

  SEARCHES: [
    "dog",
    "cat",
    "frog",
    "pepe",
    "meme",
    "inu",
    "wojak",
    "hood"
  ]

};

let requestCount = 0;


/* ============================================================
   FETCH
============================================================ */

async function getJson(url) {

  if (
    requestCount >=
    CONFIG.MAX_REQUESTS
  ) {

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
              "application/json",
            "user-agent":
              "Robinhood-Meme-Hunter-V18"
          }
        }
      );

    if (
      !response.ok
    ) {

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

  }
  catch (error) {

    return {
      ok: false,
      error:
        String(
          error?.message ||
          "REQUEST_FAILED"
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


function money(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "N/A";

  }

  if (
    value >= 1000000
  ) {

    return (
      "$" +
      (
        value /
        1000000
      ).toFixed(2) +
      "M"
    );

  }

  if (
    value >= 1000
  ) {

    return (
      "$" +
      (
        value /
        1000
      ).toFixed(1) +
      "K"
    );

  }

  return (
    "$" +
    Number(value)
      .toFixed(2)
  );

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
    target /
    marketCap,
    2
  );

}


/* ============================================================
   MEME SCORING
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
    "pussy",
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
    "bear",
    "bull",
    "ape",
    "degen",
    "shit",
    "woof",
    "wen",
    "yolo",
    "hood",
    "pup",
    "froge",
    "panda",
    "monkey"
  ];

  let score = 0;

  for (
    const word
    of words
  ) {

    if (
      text.includes(word)
    ) {

      score += 4;

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

function isExcluded(
  token
) {

  const name =
    String(
      token?.name ||
      ""
    )
      .toLowerCase();

  const symbol =
    String(
      token?.symbol ||
      ""
    )
      .toLowerCase();


  const excludedWords = [

    "wrapped ether",
    "weth",
    "usd coin",
    "usdc",
    "tether",
    "usdt",
    "usdg",
    "stablecoin",
    "wrapped",
    "stock token",
    "tokenized",
    "treasury",
    "index",
    "etf",
    "fund",
    "nasdaq",
    "gameStop"

  ];


  for (
    const word
    of excludedWords
  ) {

    if (
      name.includes(word)
    ) {

      return true;

    }

  }


  if (
    [
      "weth",
      "usdc",
      "usdt",
      "usdg"
    ].includes(symbol)
  ) {

    return true;

  }


  return false;

}


/* ============================================================
   DISCOVER USING MULTIPLE SEARCHES
============================================================ */

async function discoverPairs() {

  const allPairs = [];

  const seenPairs =
    new Set();


  for (
    const query
    of CONFIG.SEARCHES
  ) {

    if (
      requestCount >=
      CONFIG.MAX_REQUESTS
    ) {

      break;

    }


    const url =
      `${CONFIG.DEX}/latest/dex/search?q=` +
      encodeURIComponent(
        query
      );


    const result =
      await getJson(
        url
      );


    if (
      !result.ok
    ) {

      continue;

    }


    const pairs =
      Array.isArray(
        result.data?.pairs
      )
        ? result.data.pairs
        : [];


    for (
      const pair
      of pairs
    ) {

      if (
        String(
          pair?.chainId ||
          ""
        )
          .toLowerCase() !==
        CONFIG.CHAIN
      ) {

        continue;

      }


      const pairAddress =
        String(
          pair?.pairAddress ||
          ""
        )
          .toLowerCase();


      if (
        !pairAddress ||
        seenPairs.has(
          pairAddress
        )
      ) {

        continue;

      }


      seenPairs.add(
        pairAddress
      );

      allPairs.push(
        pair
      );

    }

  }


  return allPairs;

}


/* ============================================================
   PAIR ANALYSIS
============================================================ */

function analysePair(
  pair
) {

  const base =
    pair?.baseToken;

  const quote =
    pair?.quoteToken;


  if (
    !base?.address ||
    !quote?.address
  ) {

    return null;

  }


  /*
   * Pick the actual meme candidate.
   *
   * Usually the base token is the
   * project token and the quote is
   * WETH/ETH/USDG.
   */

  let token =
    base;


  if (
    isExcluded(base) &&
    !isExcluded(quote)
  ) {

    token =
      quote;

  }


  if (
    isExcluded(token)
  ) {

    return null;

  }


  const name =
    token.name ||
    "Unknown";

  const symbol =
    token.symbol ||
    "UNKNOWN";


  const marketCap =
    num(
      pair.marketCap
    ) ??
    num(
      pair.fdv
    );


  if (
    marketCap === null
  ) {

    return null;

  }


  if (
    marketCap <
    CONFIG.MIN_MARKET_CAP
  ) {

    return null;

  }


  if (
    marketCap >
    CONFIG.MAX_MARKET_CAP
  ) {

    return null;

  }


  const liquidity =
    num(
      pair?.liquidity?.usd
    );


  const volume =
    num(
      pair?.volume?.h24
    );


  if (
    liquidity === null ||
    volume === null
  ) {

    return null;

  }


  const buys =
    num(
      pair?.txns?.h24?.buys
    ) || 0;


  const sells =
    num(
      pair?.txns?.h24?.sells
    ) || 0;


  const transactions =
    buys +
    sells;


  const buySellRatio =
    sells > 0
      ? round(
          buys /
          sells,
          2
        )
      : null;


  let pressure =
    "NEUTRAL";


  if (
    buys >
    sells * 1.30
  ) {

    pressure =
      "BUY_PRESSURE";

  }
  else if (
    sells >
    buys * 1.30
  ) {

    pressure =
      "SELL_PRESSURE";

  }


  const liquidityRatio =
    marketCap > 0
      ? liquidity /
        marketCap
      : null;


  const volumeRatio =
    marketCap > 0
      ? volume /
        marketCap
      : null;


  const meme =
    memeScore(
      name,
      symbol
    );


  /*
   * Pair age
   */

  let ageHours =
    null;


  if (
    pair.pairCreatedAt
  ) {

    ageHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) /
      3600000;


    if (
      ageHours < 0
    ) {

      ageHours =
        null;

    }

  }


  /*
   * Liquidity quality
   */

  let liquidityQuality =
    "LOW";


  if (
    liquidityRatio !== null &&
    liquidityRatio >=
    0.20
  ) {

    liquidityQuality =
      "STRONG";

  }
  else if (
    liquidityRatio !== null &&
    liquidityRatio >=
    0.10
  ) {

    liquidityQuality =
      "GOOD";

  }
  else if (
    liquidityRatio !== null &&
    liquidityRatio >=
    0.05
  ) {

    liquidityQuality =
      "MODERATE";

  }


  /*
   * Volume quality
   */

  let volumeQuality =
    "LOW";


  if (
    volumeRatio !== null &&
    volumeRatio >=
    0.50
  ) {

    volumeQuality =
      "VERY_HIGH";

  }
  else if (
    volumeRatio !== null &&
    volumeRatio >=
    0.20
  ) {

    volumeQuality =
      "HIGH";

  }
  else if (
    volumeRatio !== null &&
    volumeRatio >=
    0.05
  ) {

    volumeQuality =
      "HEALTHY";

  }


  return {

    contract:
      token.address,

    name,

    symbol,

    priceUsd:
      num(
        pair.priceUsd
      ),

    marketCap,

    fdv:
      num(
        pair.fdv
      ),

    liquidityUsd:
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    transactions24h:
      transactions,

    buySellRatio,

    pressure,

    memeScore:
      meme,

    ageHours:
      ageHours !== null
        ? round(
            ageHours,
            1
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

    liquidityQuality,

    volumeQuality,

    dex:
      pair.dexId ||
      "unknown",

    pairAddress:
      pair.pairAddress,

    url:
      pair.url,

    pairCreatedAt:
      pair.pairCreatedAt ||
      null

  };

}


/* ============================================================
   SCORE
============================================================ */

function scoreToken(
  data
) {

  let score = 0;


  /*
   * Early market cap
   */

  if (
    data.marketCap <
    250000
  ) {

    score += 20;

  }
  else if (
    data.marketCap <
    1000000
  ) {

    score += 18;

  }
  else if (
    data.marketCap <
    5000000
  ) {

    score += 15;

  }
  else if (
    data.marketCap <
    10000000
  ) {

    score += 12;

  }
  else if (
    data.marketCap <
    25000000
  ) {

    score += 8;

  }
  else {

    score += 4;

  }


  /*
   * Meme identity
   */

  score +=
    Math.min(
      15,
      Math.round(
        data.memeScore *
        0.75
      )
    );


  /*
   * Liquidity
   */

  if (
    data.liquidityQuality ===
    "STRONG"
  ) {

    score += 15;

  }
  else if (
    data.liquidityQuality ===
    "GOOD"
  ) {

    score += 12;

  }
  else if (
    data.liquidityQuality ===
    "MODERATE"
  ) {

    score += 7;

  }


  /*
   * Volume
   */

  if (
    data.volumeQuality ===
    "VERY_HIGH"
  ) {

    score += 15;

  }
  else if (
    data.volumeQuality ===
    "HIGH"
  ) {

    score += 12;

  }
  else if (
    data.volumeQuality ===
    "HEALTHY"
  ) {

    score += 7;

  }


  /*
   * Buy pressure
   */

  if (
    data.pressure ===
    "BUY_PRESSURE"
  ) {

    score += 15;

  }
  else if (
    data.pressure ===
    "NEUTRAL"
  ) {

    score += 5;

  }


  /*
   * Transaction activity
   */

  if (
    data.transactions24h >=
    5000
  ) {

    score += 5;

  }
  else if (
    data.transactions24h >=
    1000
  ) {

    score += 3;

  }


  /*
   * New pair bonus
   */

  if (
    data.ageHours !== null
  ) {

    if (
      data.ageHours <= 6
    ) {

      score += 10;

    }
    else if (
      data.ageHours <= 24
    ) {

      score += 7;

    }
    else if (
      data.ageHours <= 72
    ) {

      score += 4;

    }

  }


  return Math.min(
    100,
    score
  );

}


/* ============================================================
   RISK FLAGS
============================================================ */

function riskFlags(
  data
) {

  const flags = [];


  if (
    data.liquidityUsd <
    CONFIG.MIN_LIQUIDITY
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

  }


  if (
    data.volume24h <
    CONFIG.MIN_VOLUME
  ) {

    flags.push(
      "LOW_VOLUME"
    );

  }


  if (
    data.pressure ===
    "SELL_PRESSURE"
  ) {

    flags.push(
      "SELL_PRESSURE"
    );

  }


  if (
    data.liquidityToMarketCap !==
      null &&
    data.liquidityToMarketCap <
      0.03
  ) {

    flags.push(
      "THIN_LIQUIDITY"
    );

  }


  return flags;

}


/* ============================================================
   CATEGORY
============================================================ */

function category(
  score,
  data
) {

  if (
    score >= 75 &&
    data.liquidityUsd >=
      CONFIG.MIN_LIQUIDITY &&
    data.volume24h >=
      CONFIG.MIN_VOLUME &&
    !data.riskFlags.includes(
      "SELL_PRESSURE"
    )
  ) {

    return "HIGH-POTENTIAL";

  }


  if (
    score >= 60
  ) {

    return "WATCH";

  }


  if (
    score >= 40
  ) {

    return "EARLY";

  }


  return "LOW-CONVICTION";

}


/* ============================================================
   BUILD CANDIDATE
============================================================ */

function buildCandidate(
  pair
) {

  const data =
    analysePair(
      pair
    );


  if (!data) {

    return null;

  }


  /*
   * Hard liquidity/volume filter
   */

  if (
    data.liquidityUsd <
    CONFIG.MIN_LIQUIDITY
  ) {

    return null;

  }


  if (
    data.volume24h <
    CONFIG.MIN_VOLUME
  ) {

    return null;

  }


  const score =
    scoreToken(
      data
    );


  const flags =
    riskFlags(
      data
    );


  data.riskFlags =
    flags;


  const result = {

    ...data,

    discoveryScore:
      score,

    scoreMaximum:
      100,

    category:
      category(
        score,
        data
      ),

    targets: {

      to100M:
        multiple(
          data.marketCap,
          100000000
        ),

      to250M:
        multiple(
          data.marketCap,
          250000000
        ),

      to500M:
        multiple(
          data.marketCap,
          500000000
        )

    }

  };


  return result;

}


/* ============================================================
   TELEGRAM
============================================================ */

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
        "TELEGRAM_NOT_CONFIGURED"

    };

  }


  const url =
    `https://api.telegram.org/bot` +
    `${env.TELEGRAM_BOT_TOKEN}` +
    `/sendMessage`;


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

              parse_mode:
                "HTML",

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

  }
  catch (error) {

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
   ESCAPE HTML
============================================================ */

function esc(value) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    );

}


/* ============================================================
   ALERT FORMAT
============================================================ */

function formatAlert(
  token
) {

  const emoji =
    token.category ===
      "HIGH-POTENTIAL"
      ? "🚨"
      : token.category ===
        "WATCH"
        ? "👀"
        : "🟢";


  return `
${emoji} <b>ROBINHOOD MEME HUNTER</b>

<b>${esc(token.name)}</b> (${
    esc(token.symbol)
  })

<b>Score:</b> ${token.discoveryScore}/100
<b>Category:</b> ${token.category}

<b>Market Cap:</b> ${money(token.marketCap)}
<b>Liquidity:</b> ${money(token.liquidityUsd)}
<b>24h Volume:</b> ${money(token.volume24h)}

<b>Buys:</b> ${token.buys24h}
<b>Sells:</b> ${token.sells24h}
<b>Buy/Sell:</b> ${
    token.buySellRatio ??
    "N/A"
  }
<b>Pressure:</b> ${token.pressure}

<b>Transactions:</b> ${
    token.transactions24h
  }

<b>Pair Age:</b> ${
    token.ageHours !== null
      ? token.ageHours +
        " hours"
      : "Unknown"
  }

<b>Meme Score:</b> ${
    token.memeScore
  }/20

<b>Liquidity / MC:</b> ${
    token.liquidityToMarketCap
      !== null
      ? (
          token.liquidityToMarketCap *
          100
        ).toFixed(1) +
        "%"
      : "N/A"
  }

<b>Volume / MC:</b> ${
    token.volumeToMarketCap
      !== null
      ? (
          token.volumeToMarketCap *
          100
        ).toFixed(1) +
        "%"
      : "N/A"
  }

<b>Potential multiples</b>

$100M → ${
    token.targets.to100M
  }x

$250M → ${
    token.targets.to250M
  }x

$500M → ${
    token.targets.to500M
  }x

<b>Contract:</b>
<code>${esc(
    token.contract
  )}</code>

<b>DEX:</b> ${
    esc(token.dex)
  }

<a href="${
    token.url
  }">View on DEX Screener</a>

⚠️ Automated signal. Not financial advice.
`.trim();

}


/* ============================================================
   SCAN
============================================================ */

async function runScan(
  env
) {

  requestCount = 0;


  /*
   * Discover actual pairs
   */

  const pairs =
    await discoverPairs();


  if (
    !pairs.length
  ) {

    return {

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "NO_DISCOVERY_DATA",

      pairsDiscovered:
        0,

      candidates: [],

      alerts: [],

      requestCount,

      timestamp:
        new Date()
          .toISOString()

    };

  }


  /*
   * Analyse
   */

  const candidates = [];

  const seenTokens =
    new Set();


  for (
    const pair
    of pairs
  ) {

    const candidate =
      buildCandidate(
        pair
      );


    if (!candidate) {

      continue;

    }


    const address =
      candidate.contract
        .toLowerCase();


    /*
     * One candidate per token.
     */

    if (
      seenTokens.has(
        address
      )
    ) {

      continue;

    }


    seenTokens.add(
      address
    );


    candidates.push(
      candidate
    );

  }


  /*
   * Rank strongest first
   */

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );


  const top =
    candidates.slice(
      0,
      CONFIG.MAX_RESULTS
    );


  /*
   * Telegram
   */

  const alerts = [];


  for (
    const candidate
    of top
  ) {

    /*
     * Only alert on strong signals.
     */

    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    ) {

      continue;

    }


    /*
     * Do not alert obvious
     * sell-pressure setups.
     */

    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {

      continue;

    }


    const message =
      formatAlert(
        candidate
      );


    const sent =
      await sendTelegram(
        env,
        message
      );


    alerts.push({

      contract:
        candidate.contract,

      symbol:
        candidate.symbol,

      score:
        candidate.discoveryScore,

      category:
        candidate.category,

      telegramSent:
        sent.ok,

      error:
        sent.ok
          ? null
          : (
              sent.error ||
              sent.data?.description ||
              "SEND_FAILED"
            )

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
      "Discover early-stage Robinhood Chain meme coins using multi-query DEX market discovery.",

    chain: {

      name:
        "Robinhood Chain",

      chainId:
        CONFIG.CHAIN_ID,

      dexChain:
        CONFIG.CHAIN

    },

    telegram: {

      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      chatId:
        env.TELEGRAM_CHAT_ID ||
        null,

      alertsSent:
        alerts.filter(
          x =>
            x.telegramSent
        ).length

    },

    scan: {

      pairsDiscovered:
        pairs.length,

      uniqueCandidates:
        candidates.length,

      returned:
        top.length,

      requests:
        requestCount,

      requestLimit:
        CONFIG.MAX_REQUESTS

    },

    candidates:
      top,

    alerts,

    validation: {

      marketData:
        "DEX SCREENER",

      liquidity:
        "VERIFIED",

      volume:
        "VERIFIED",

      buySell:
        "VERIFIED FROM DEX TRANSACTIONS",

      pairAge:
        "VERIFIED WHEN PROVIDED",

      holderConcentration:
        "NOT YET INCLUDED",

      walletActivity:
        "NOT YET INCLUDED",

      smartMoney:
        "NOT YET INCLUDED"

    },

    dataIntegrity: {

      noFabricatedMetrics:
        true,

      unavailableData:
        "UNVERIFIED"

    },

    timestamp:
      new Date()
        .toISOString()

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

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.CHAIN_ID,

        dex:
          "DEX Screener",

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          )

      });

    }


    /*
     * TELEGRAM TEST
     */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(
          env,

          `
🤖 <b>Robinhood Chain Meme Hunter V18</b>

Telegram connection successful.

Scanner V18 is ready.
`.trim()

        );


      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),

        success:
          result.ok,

        error:
          result.ok
            ? null
            : (
                result.error ||
                result.data?.description ||
                "TEST_FAILED"
              )

      });

    }


    /*
     * SCAN
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
      catch (error) {

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
              new Date()
                .toISOString()

          },

          {

            status: 500

          }

        );

      }

    }


    /*
     * ROOT
     */

    return Response.json({

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      routes: [

        "/health",

        "/test-telegram",

        "/scan"

      ]

    });

  }

};
