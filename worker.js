/*
============================================================
ROBINHOOD CHAIN MEME HUNTER — V15
============================================================

FREE-FIRST TELEGRAM MEME COIN SCANNER

Chain:
  Robinhood Chain
  Chain ID: 4663

Cloudflare bindings required:

SECRET:
  TELEGRAM_BOT_TOKEN

VARIABLE:
  TELEGRAM_CHAT_ID
  value: -1004466114680

Routes:

  /
  /health
  /test-telegram
  /scan

Cron:
  scheduled()

============================================================
*/

const CONFIG = {
  VERSION: "V15",

  CHAIN_NAME: "Robinhood Chain",
  CHAIN_ID: 4663,

  BLOCKSCOUT:
    "https://robinhoodchain.blockscout.com/api/v2",

  DEXSCREENER:
    "https://api.dexscreener.com",

  MAX_REQUESTS: 10,

  CANDIDATE_LIMIT: 15,

  MIN_MARKET_CAP: 1_000,

  MAX_MARKET_CAP:
    50_000_000,

  MIN_LIQUIDITY:
    25_000,

  MIN_VOLUME:
    10_000,

  MIN_SCORE:
    55,

  ALERT_SCORE:
    65,

  TARGETS: [
    100_000_000,
    250_000_000,
    500_000_000
  ]
};


/* ============================================================
REQUEST COUNTER
============================================================ */

let requestCount = 0;


/* ============================================================
FETCH JSON
============================================================ */

async function getJSON(url, options = {}) {

  if (requestCount >= CONFIG.MAX_REQUESTS) {

    return {
      ok: false,
      error: "REQUEST_BUDGET_EXCEEDED"
    };

  }

  requestCount++;

  try {

    const response = await fetch(url, {
      ...options,

      headers: {
        "accept": "application/json",
        ...(options.headers || {})
      }
    });

    if (!response.ok) {

      return {
        ok: false,
        status: response.status,
        error: `HTTP_${response.status}`
      };

    }

    return {
      ok: true,
      data: await response.json()
    };

  } catch (error) {

    return {
      ok: false,
      error: String(
        error?.message || error
      )
    };

  }
}


/* ============================================================
HELPERS
============================================================ */

function number(value) {

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;

}


function round(value, decimals = 2) {

  if (value === null || value === undefined) {
    return null;
  }

  return Number(
    Number(value).toFixed(decimals)
  );

}


function cleanAddress(address) {

  return String(address || "")
    .toLowerCase();

}


function multiple(marketCap, target) {

  if (!marketCap || marketCap <= 0) {
    return null;
  }

  return round(
    target / marketCap,
    2
  );

}


/* ============================================================
MEME DETECTION
============================================================ */

const MEME_WORDS = [
  "dog",
  "doge",
  "inu",
  "shib",
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
  "bull",
  "bear",
  "penguin",
  "panda",
  "hamster",
  "rat",
  "fish",
  "cult",
  "baby"
];


function memeScore(name, symbol) {

  const text =
    `${name || ""} ${symbol || ""}`
      .toLowerCase();

  let score = 0;

  for (const word of MEME_WORDS) {

    if (text.includes(word)) {
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

const EXCLUDED_WORDS = [
  "wrapped",
  "usd coin",
  "usdc",
  "tether",
  "usdt",
  "stablecoin",
  "tokenized stock",
  "tokenized",
  "gold",
  "treasury"
];


function isExcluded(token) {

  const text =
    `${token.name || ""} ${token.symbol || ""}`
      .toLowerCase();

  return EXCLUDED_WORDS.some(
    word => text.includes(word)
  );

}


/* ============================================================
BLOCKSCOUT TOKEN DISCOVERY
============================================================ */

async function discoverTokens() {

  const result = await getJSON(
    `${CONFIG.BLOCKSCOUT}/tokens?type=ERC-20`
  );

  if (!result.ok) {

    return {
      status: "UNVERIFIED",
      tokens: [],
      error: result.error
    };

  }

  const items =
    Array.isArray(result.data?.items)
      ? result.data.items
      : [];

  const tokens = items
    .filter(token => {

      if (!token?.address) {
        return false;
      }

      if (isExcluded(token)) {
        return false;
      }

      return true;

    })
    .map(token => {

      const marketCap =
        number(
          token.circulating_market_cap
        );

      const price =
        number(
          token.exchange_rate
        );

      const holders =
        number(
          token.holders
        );

      return {

        contract:
          token.address,

        name:
          token.name ||
          "Unknown",

        symbol:
          token.symbol ||
          "UNKNOWN",

        marketCap,

        price,

        holders,

        decimals:
          number(token.decimals),

        memeLikelihood:
          memeScore(
            token.name,
            token.symbol
          )

      };

    })
    .filter(token => {

      if (
        token.marketCap === null
      ) {
        return false;
      }

      if (
        token.marketCap <
        CONFIG.MIN_MARKET_CAP
      ) {
        return false;
      }

      if (
        token.marketCap >
        CONFIG.MAX_MARKET_CAP
      ) {
        return false;
      }

      return true;

    });

  return {
    status: "VERIFIED",
    tokens
  };

}


/* ============================================================
DEX SCREENER
============================================================ */

async function getDexData(addresses) {

  if (!addresses.length) {

    return {
      status: "UNVERIFIED",
      pairs: []
    };

  }

  /*
   * DEX Screener accepts comma-separated
   * token addresses.
   */

  const unique = [
    ...new Set(
      addresses.map(cleanAddress)
    )
  ];

  const chunks = [];

  for (
    let i = 0;
    i < unique.length;
    i += 30
  ) {

    chunks.push(
      unique.slice(i, i + 30)
    );

  }

  const pairs = [];

  for (const chunk of chunks) {

    if (
      requestCount >=
      CONFIG.MAX_REQUESTS
    ) {
      break;
    }

    const result = await getJSON(
      `${CONFIG.DEXSCREENER}/tokens/v1/robinhood/${chunk.join(",")}`
    );

    if (
      !result.ok
    ) {
      continue;
    }

    if (
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
    cleanAddress(
      token.contract
    );

  const matches =
    pairs.filter(pair => {

      const base =
        cleanAddress(
          pair?.baseToken?.address
        );

      const quote =
        cleanAddress(
          pair?.quoteToken?.address
        );

      return (
        base === address ||
        quote === address
      );

    });

  if (!matches.length) {

    return {
      status: "UNVERIFIED",
      liquidity: null,
      volume: null,
      buys: null,
      sells: null,
      ratio: null,
      pressure: "UNKNOWN",
      pair: null
    };

  }

  let liquidity = 0;
  let volume = 0;
  let buys = 0;
  let sells = 0;

  let bestPair = null;
  let bestLiquidity = 0;

  for (const pair of matches) {

    const l =
      number(
        pair?.liquidity?.usd
      ) || 0;

    const v =
      number(
        pair?.volume?.h24
      ) || 0;

    liquidity += l;
    volume += v;

    buys +=
      number(
        pair?.txns?.h24?.buys
      ) || 0;

    sells +=
      number(
        pair?.txns?.h24?.sells
      ) || 0;

    if (
      l >
      bestLiquidity
    ) {

      bestLiquidity = l;
      bestPair = pair;

    }

  }

  let pressure = "NEUTRAL";

  if (
    buys >
    sells * 1.5
  ) {

    pressure =
      "STRONG_BUY_PRESSURE";

  } else if (
    buys >
    sells * 1.2
  ) {

    pressure =
      "BUY_PRESSURE";

  } else if (
    sells >
    buys * 1.5
  ) {

    pressure =
      "STRONG_SELL_PRESSURE";

  } else if (
    sells >
    buys * 1.2
  ) {

    pressure =
      "SELL_PRESSURE";

  }

  const marketCap =
    number(
      bestPair?.marketCap
    ) ??
    number(
      bestPair?.fdv
    ) ??
    token.marketCap;

  const liquidityRatio =
    marketCap
      ? liquidity / marketCap
      : null;

  const volumeRatio =
    marketCap
      ? volume / marketCap
      : null;

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

  return {

    status: "VERIFIED",

    liquidity:
      round(liquidity),

    volume:
      round(volume),

    buys,

    sells,

    ratio:
      sells > 0
        ? round(
            buys / sells,
            2
          )
        : null,

    pressure,

    liquidityQuality,

    volumeQuality,

    liquidityRatio:
      round(
        liquidityRatio,
        4
      ),

    volumeRatio:
      round(
        volumeRatio,
        4
      ),

    pair:
      bestPair
        ? {

            dex:
              bestPair.dexId ||
              null,

            address:
              bestPair.pairAddress ||
              null,

            url:
              bestPair.url ||
              null,

            priceUsd:
              number(
                bestPair.priceUsd
              ),

            createdAt:
              bestPair.pairCreatedAt ||
              null

          }
        : null

  };

}


/* ============================================================
SCORE
============================================================ */

function scoreToken(
  token,
  dex
) {

  let score = 0;

  /*
   * Early market cap
   */

  if (
    token.marketCap <
    1_000_000
  ) {

    score += 20;

  } else if (
    token.marketCap <
    5_000_000
  ) {

    score += 17;

  } else if (
    token.marketCap <
    10_000_000
  ) {

    score += 14;

  } else if (
    token.marketCap <
    25_000_000
  ) {

    score += 10;

  } else {

    score += 5;

  }


  /*
   * Meme identity
   */

  score +=
    token.memeLikelihood;


  /*
   * Liquidity
   */

  if (
    dex.status ===
    "VERIFIED"
  ) {

    if (
      dex.liquidityQuality ===
      "STRONG"
    ) {
      score += 15;
    }

    else if (
      dex.liquidityQuality ===
      "GOOD"
    ) {
      score += 12;
    }

    else if (
      dex.liquidityQuality ===
      "MODERATE"
    ) {
      score += 8;
    }

  }


  /*
   * Volume
   */

  if (
    dex.status ===
    "VERIFIED"
  ) {

    if (
      dex.volumeQuality ===
      "VERY_HIGH"
    ) {
      score += 15;
    }

    else if (
      dex.volumeQuality ===
      "HIGH"
    ) {
      score += 12;
    }

    else if (
      dex.volumeQuality ===
      "HEALTHY"
    ) {
      score += 7;
    }

  }


  /*
   * Buy pressure
   */

  if (
    dex.pressure ===
    "STRONG_BUY_PRESSURE"
  ) {
    score += 15;
  }

  else if (
    dex.pressure ===
    "BUY_PRESSURE"
  ) {
    score += 10;
  }

  else if (
    dex.pressure ===
    "NEUTRAL"
  ) {
    score += 4;
  }


  return Math.min(
    100,
    score
  );

}


/* ============================================================
TARGETS
============================================================ */

function targetAnalysis(
  marketCap
) {

  return {

    "$100M":
      multiple(
        marketCap,
        100_000_000
      ),

    "$250M":
      multiple(
        marketCap,
        250_000_000
      ),

    "$500M":
      multiple(
        marketCap,
        500_000_000
      )

  };

}


/* ============================================================
CLASSIFICATION
============================================================ */

function classification(
  score
) {

  if (
    score >= 80
  ) {
    return "HIGH-POTENTIAL";
  }

  if (
    score >= 65
  ) {
    return "STRONG-WATCH";
  }

  if (
    score >= 55
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
ANALYSE TOKEN
============================================================ */

function analyseToken(
  token,
  dexPairs
) {

  const dex =
    analyseDex(
      token,
      dexPairs
    );

  const score =
    scoreToken(
      token,
      dex
    );

  const riskFlags = [];

  if (
    dex.status ===
      "VERIFIED" &&
    dex.liquidity <
      CONFIG.MIN_LIQUIDITY
  ) {

    riskFlags.push(
      "LOW_LIQUIDITY"
    );

  }

  if (
    dex.status ===
      "VERIFIED" &&
    dex.volume <
      CONFIG.MIN_VOLUME
  ) {

    riskFlags.push(
      "LOW_VOLUME"
    );

  }

  if (
    dex.pressure ===
    "STRONG_SELL_PRESSURE"
  ) {

    riskFlags.push(
      "STRONG_SELL_PRESSURE"
    );

  }

  return {

    contract:
      token.contract,

    name:
      token.name,

    symbol:
      token.symbol,

    price:
      token.price,

    marketCap:
      token.marketCap,

    holders:
      token.holders,

    memeLikelihood:
      token.memeLikelihood,

    score,

    category:
      classification(score),

    dex,

    riskFlags,

    targets:
      targetAnalysis(
        token.marketCap
      )

  };

}


/* ============================================================
SCAN
============================================================ */

async function runScan() {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  const discovered =
    discovery.tokens || [];

  if (!discovered.length) {

    return {

      status:
        "NO_CANDIDATES",

      tokensDiscovered:
        0,

      candidates: [],

      requestCount

    };

  }


  /*
   * Prioritise meme-like tokens
   * and smaller market caps.
   */

  discovered.sort(
    (a, b) => {

      const aScore =
        a.memeLikelihood * 10 -
        Math.log10(
          Math.max(
            1,
            a.marketCap
          )
        );

      const bScore =
        b.memeLikelihood * 10 -
        Math.log10(
          Math.max(
            1,
            b.marketCap
          )
        );

      return bScore - aScore;

    }
  );


  const selected =
    discovered.slice(
      0,
      CONFIG.CANDIDATE_LIMIT
    );


  const dex =
    await getDexData(
      selected.map(
        token =>
          token.contract
      )
    );


  const results =
    selected
      .map(token =>
        analyseToken(
          token,
          dex.pairs || []
        )
      )
      .filter(
        token =>
          token.dex.status ===
            "VERIFIED" &&
          token.dex.liquidity >=
            CONFIG.MIN_LIQUIDITY &&
          token.dex.volume >=
            CONFIG.MIN_VOLUME
      )
      .sort(
        (a, b) =>
          b.score -
          a.score
      );


  return {

    status:
      "OK",

    tokensDiscovered:
      discovered.length,

    candidates:
      results,

    requestCount

  };

}


/* ============================================================
TELEGRAM
============================================================ */

function telegramConfigured(env) {

  return Boolean(
    env.TELEGRAM_BOT_TOKEN &&
    env.TELEGRAM_CHAT_ID
  );

}


async function sendTelegram(
  env,
  text
) {

  if (
    !telegramConfigured(env)
  ) {

    return {

      ok: false,

      error:
        "TELEGRAM_NOT_CONFIGURED"

    };

  }


  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;


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

              text,

              disable_web_page_preview:
                false

            })

        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.ok
    ) {

      return {

        ok: false,

        error:
          data?.description ||
          `HTTP_${response.status}`

      };

    }


    return {
      ok: true
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
FORMAT TELEGRAM ALERT
============================================================ */

function formatAlert(
  candidate
) {

  const marketCap =
    candidate.marketCap;

  const liquidity =
    candidate.dex.liquidity;

  const volume =
    candidate.dex.volume;

  const ratio =
    candidate.dex.ratio;

  const pressure =
    candidate.dex.pressure;


  let message =
`🚨 ROBINHOOD CHAIN MEME ALERT

🔥 ${candidate.name} ($${candidate.symbol})

⭐ Score: ${candidate.score}/100
🏷️ Category: ${candidate.category}

💰 Market Cap: $${marketCap.toLocaleString()}
💧 Liquidity: $${liquidity.toLocaleString()}
📊 24h Volume: $${volume.toLocaleString()}

🟢 Buys: ${candidate.dex.buys.toLocaleString()}
🔴 Sells: ${candidate.dex.sells.toLocaleString()}
⚖️ Buy/Sell: ${ratio ?? "N/A"}
📈 Pressure: ${pressure}

👥 Holders: ${
  candidate.holders !== null
    ? candidate.holders.toLocaleString()
    : "UNVERIFIED"
}

🎯 Theoretical multiples:
$100M: ${
  candidate.targets["$100M"] ?? "N/A"
}x

$250M: ${
  candidate.targets["$250M"] ?? "N/A"
}x

$500M: ${
  candidate.targets["$500M"] ?? "N/A"
}

📄 Contract:
${candidate.contract}`;

  if (
    candidate.dex.pair?.url
  ) {

    message +=
      `\n\n🔎 DEX:
${candidate.dex.pair.url}`;

  }


  message +=
    `\n\n⚠️ Research alert only — not financial advice.`;

  return message;

}


/* ============================================================
SEND ALERTS
============================================================ */

async function processAlerts(
  env,
  candidates
) {

  const alerts = [];

  for (
    const candidate
    of candidates
  ) {

    if (
      candidate.score <
      CONFIG.ALERT_SCORE
    ) {

      continue;

    }


    /*
     * Avoid obvious bad candidates.
     */

    if (
      candidate.riskFlags.includes(
        "LOW_LIQUIDITY"
      ) ||
      candidate.riskFlags.includes(
        "LOW_VOLUME"
      ) ||
      candidate.riskFlags.includes(
        "STRONG_SELL_PRESSURE"
      )
    ) {

      continue;

    }


    const message =
      formatAlert(
        candidate
      );


    const result =
      await sendTelegram(
        env,
        message
      );


    alerts.push({

      contract:
        candidate.contract,

      score:
        candidate.score,

      sent:
        result.ok,

      error:
        result.error ||
        null

    });

  }

  return alerts;

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

    chain:
      CONFIG.CHAIN_NAME,

    chainId:
      CONFIG.CHAIN_ID,

    telegram: {

      configured:
        telegramConfigured(env),

      chatId:
        env.TELEGRAM_CHAT_ID
          ? env.TELEGRAM_CHAT_ID
          : null

    },

    freeFirst:
      true,

    timestamp:
      new Date().toISOString()

  };

}


/* ============================================================
MAIN
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


    /* HEALTH */

    if (
      url.pathname ===
      "/health"
    ) {

      return Response.json(
        health(env)
      );

    }


    /* TELEGRAM TEST */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(
          env,

          `🤖 Robinhood Chain Meme Hunter V15

✅ Telegram connection test successful.

Chat ID:
${env.TELEGRAM_CHAT_ID || "NOT CONFIGURED"}

Time:
${new Date().toISOString()}`
        );


      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        telegram:
          result

      });

    }


    /* MANUAL SCAN */

    if (
      url.pathname ===
      "/scan"
    ) {

      const scan =
        await runScan();


      let alerts = [];

      if (
        scan.candidates?.length
      ) {

        alerts =
          await processAlerts(
            env,
            scan.candidates
          );

      }


      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        telegram: {

          configured:
            telegramConfigured(env),

          chatId:
            env.TELEGRAM_CHAT_ID ||
            null

        },

        scan,

        alerts,

        timestamp:
          new Date().toISOString()

      });

    }


    /* DEFAULT */

    return Response.json({

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "ONLINE",

      routes: [

        "/health",

        "/test-telegram",

        "/scan"

      ],

      telegramConfigured:
        telegramConfigured(env)

    });

  },


  /*
   * CLOUDFLARE CRON
   *
   * Runs automatically when the
   * Cron Trigger fires.
   */

  async scheduled(
    controller,
    env,
    ctx
  ) {

    ctx.waitUntil(

      (async () => {

        try {

          const scan =
            await runScan();


          if (
            scan.candidates?.length
          ) {

            await processAlerts(
              env,
              scan.candidates
            );

          }


          console.log(
            JSON.stringify({

              event:
                "scheduled_scan",

              tokensDiscovered:
                scan.tokensDiscovered,

              candidates:
                scan.candidates?.length ||
                0,

              requestCount:
                scan.requestCount,

              timestamp:
                new Date().toISOString()

            })
          );


        } catch (error) {

          console.error(
            "Scheduled scan failed:",
            error
          );

        }

      })()

    );

  }

};
