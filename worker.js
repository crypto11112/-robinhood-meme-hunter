/**
 * ROBINHOOD CHAIN MEME HUNTER — V14
 *
 * Automatic Telegram meme-coin scanner
 *
 * Chain:
 * Robinhood Chain
 * Chain ID: 4663
 *
 * FREE-FIRST DATA:
 * - Robinhood Chain RPC
 * - Blockscout
 * - DEX Screener
 * - Telegram Bot API
 *
 * ENVIRONMENT VARIABLES:
 *
 * TELEGRAM_BOT_TOKEN = Telegram bot token SECRET
 * TELEGRAM_CHAT_ID   = -1004466114680
 *
 * IMPORTANT:
 * Never fabricate unavailable data.
 */

const CONFIG = {

  VERSION: "V14",

  CHAIN_ID: 4663,

  CHAIN_NAME: "Robinhood Chain",

  RPC_URL:
    "https://rpc.mainnet.chain.robinhood.com",

  BLOCKSCOUT_URL:
    "https://robinhoodchain.blockscout.com/api/v2",

  DEX_URL:
    "https://api.dexscreener.com",

  MAX_REQUESTS: 12,

  DISCOVERY_LIMIT: 50,

  CANDIDATE_LIMIT: 10,

  MIN_MARKET_CAP: 1000,

  MAX_MARKET_CAP:
    50_000_000,

  MIN_LIQUIDITY:
    25_000,

  MIN_VOLUME:
    10_000,

  ALERT_SCORE:
    60,

  TARGETS: [
    100_000_000,
    250_000_000,
    500_000_000
  ]

};


let requestCount = 0;


/* ============================================================
   REQUEST CONTROL
============================================================ */

function canRequest() {

  return (
    requestCount <
    CONFIG.MAX_REQUESTS
  );

}


/* ============================================================
   FETCH JSON
============================================================ */

async function getJson(
  url,
  options = {}
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
      await fetch(
        url,
        {
          ...options,

          headers: {
            "accept":
              "application/json",

            ...(options.headers || {})
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


/* ============================================================
   TELEGRAM
============================================================ */

function telegramConfigured(
  env
) {

  return !!(
    env &&
    env.TELEGRAM_BOT_TOKEN &&
    env.TELEGRAM_CHAT_ID
  );

}


async function telegram(
  env,
  text
) {

  if (
    !telegramConfigured(env)
  ) {

    return {

      sent: false,

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
                String(
                  env.TELEGRAM_CHAT_ID
                ),

              text,

              parse_mode:
                "HTML",

              disable_web_page_preview:
                false

            })

        }
      );

    const data =
      await response.json();

    if (!response.ok) {

      return {

        sent: false,

        error:
          data?.description ||
          `HTTP_${response.status}`

      };

    }

    return {

      sent: true,

      messageId:
        data?.result?.message_id ||
        null

    };

  } catch {

    return {

      sent: false,

      error:
        "TELEGRAM_REQUEST_FAILED"

    };

  }

}


/* ============================================================
   MEME SCORE
============================================================ */

function memeScore(
  token
) {

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
    "chad",
    "based",
    "goat",
    "ape",
    "degen",
    "shit",
    "woof",
    "wen",
    "yolo",
    "frog",
    "bear",
    "bull"

  ];

  let score = 0;

  for (
    const word
    of words
  ) {

    if (
      text.includes(word)
    ) {

      score += 5;

    }

  }

  return Math.min(
    score,
    20
  );

}


/* ============================================================
   DISCOVER TOKENS
============================================================ */

async function discoverTokens() {

  const url =
    CONFIG.BLOCKSCOUT_URL +
    "/tokens?type=ERC-20";

  const result =
    await getJson(url);

  if (
    !result.ok
  ) {

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
          token.address
      )
      .map(
        token => {

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

            marketCap,

            price,

            holders,

            memeLikelihood:
              memeScore(token)

          };

        }
      );

  return {

    status:
      "VERIFIED",

    tokens

  };

}


/* ============================================================
   DEX SCREENER
============================================================ */

async function getDexData(
  addresses
) {

  if (
    !addresses.length
  ) {

    return [];

  }

  const unique =
    [
      ...new Set(
        addresses.map(
          address =>
            String(address)
              .toLowerCase()
        )
      )
    ];

  const url =
    CONFIG.DEX_URL +
    "/tokens/v1/robinhood/" +
    unique.join(",");

  const result =
    await getJson(url);

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
    pairs.filter(
      pair => {

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

      }
    );

  if (
    !matching.length
  ) {

    return {

      status:
        "UNVERIFIED",

      liquidity:
        null,

      volume:
        null,

      buys:
        null,

      sells:
        null,

      ratio:
        null,

      pressure:
        "UNKNOWN",

      marketCap:
        token.marketCap,

      pair:
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

    liquidity += l;

    volume += v;

    buys +=
      num(
        pair?.txns?.h24?.buys
      ) || 0;

    sells +=
      num(
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
    ) ??
    token.marketCap;

  const liquidityRatio =
    marketCap &&
    marketCap > 0
      ? liquidity /
        marketCap
      : null;

  const volumeRatio =
    marketCap &&
    marketCap > 0
      ? volume /
        marketCap
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

    status:
      "VERIFIED",

    liquidity:
      round(
        liquidity,
        2
      ),

    volume:
      round(
        volume,
        2
      ),

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

    marketCap,

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

    liquidityQuality,

    volumeQuality,

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

            price:
              num(
                bestPair.priceUsd
              ),

            created:
              bestPair.pairCreatedAt ||
              null

          }
        : null

  };

}


/* ============================================================
   HOLDER ANALYSIS
============================================================ */

async function holderAnalysis(
  address
) {

  if (
    !canRequest()
  ) {

    return {

      status:
        "UNVERIFIED",

      top10:
        null,

      top20:
        null

    };

  }

  const url =
    CONFIG.BLOCKSCOUT_URL +
    `/tokens/${address}/holders`;

  const result =
    await getJson(url);

  if (
    !result.ok
  ) {

    return {

      status:
        "UNVERIFIED",

      top10:
        null,

      top20:
        null,

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

      top10:
        null,

      top20:
        null

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

  if (
    !balances.length
  ) {

    return {

      status:
        "UNVERIFIED",

      top10:
        null,

      top20:
        null

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

      top10:
        null,

      top20:
        null

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

  const top10Pct =
    round(
      top10 /
      total *
      100,
      2
    );

  const top20Pct =
    round(
      top20 /
      total *
      100,
      2
    );

  let risk =
    "LOW";

  if (
    top10Pct > 50
  ) {

    risk =
      "VERY_HIGH";

  } else if (
    top10Pct > 35
  ) {

    risk =
      "HIGH";

  } else if (
    top10Pct > 20
  ) {

    risk =
      "MODERATE";

  }

  return {

    status:
      "VERIFIED",

    top10:
      top10Pct,

    top20:
      top20Pct,

    risk

  };

}


/* ============================================================
   RISK FLAGS
============================================================ */

function riskFlags(
  data
) {

  const flags = [];

  if (
    data.dex.status ===
      "VERIFIED"
  ) {

    if (
      data.dex.liquidity <
      CONFIG.MIN_LIQUIDITY
    ) {

      flags.push(
        "LOW_LIQUIDITY"
      );

    }

    if (
      data.dex.volume <
      CONFIG.MIN_VOLUME
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

  }

  if (
    data.holders.status ===
      "VERIFIED"
  ) {

    if (
      data.holders.risk ===
      "VERY_HIGH"
    ) {

      flags.push(
        "VERY_HIGH_HOLDER_CONCENTRATION"
      );

    } else if (
      data.holders.risk ===
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

function scoreToken(
  token,
  dex,
  holders
) {

  let score = 0;

  /*
   * Early market cap
   */

  if (
    token.marketCap !== null
  ) {

    if (
      token.marketCap <
      100_000
    ) {

      score += 20;

    } else if (
      token.marketCap <
      500_000
    ) {

      score += 18;

    } else if (
      token.marketCap <
      1_000_000
    ) {

      score += 16;

    } else if (
      token.marketCap <
      5_000_000
    ) {

      score += 12;

    } else if (
      token.marketCap <
      10_000_000
    ) {

      score += 8;

    } else if (
      token.marketCap <
      50_000_000
    ) {

      score += 4;

    }

  }

  /*
   * Meme potential
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

    } else if (
      dex.liquidityQuality ===
      "GOOD"
    ) {

      score += 12;

    } else if (
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

    } else if (
      dex.volumeQuality ===
      "HIGH"
    ) {

      score += 12;

    } else if (
      dex.volumeQuality ===
      "HEALTHY"
    ) {

      score += 8;

    }

  }

  /*
   * Buy pressure
   */

  if (
    dex.pressure ===
    "BUY_PRESSURE"
  ) {

    score += 10;

  } else if (
    dex.pressure ===
    "NEUTRAL"
  ) {

    score += 4;

  }

  /*
   * Holders
   */

  if (
    token.holders !== null
  ) {

    if (
      token.holders >= 5000
    ) {

      score += 10;

    } else if (
      token.holders >= 1000
    ) {

      score += 8;

    } else if (
      token.holders >= 100
    ) {

      score += 5;

    }

  }

  /*
   * Holder concentration
   */

  if (
    holders.status ===
    "VERIFIED"
  ) {

    if (
      holders.risk ===
      "LOW"
    ) {

      score += 10;

    } else if (
      holders.risk ===
      "MODERATE"
    ) {

      score += 5;

    }

  }

  return Math.min(
    score,
    100
  );

}


/* ============================================================
   TARGETS
============================================================ */

function targets(
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
   CLASSIFICATION
============================================================ */

function classify(
  score,
  dex,
  holders,
  flags
) {

  const verified =
    dex.status ===
      "VERIFIED";

  const sufficientLiquidity =
    verified &&
    dex.liquidity >=
      CONFIG.MIN_LIQUIDITY;

  const sufficientVolume =
    verified &&
    dex.volume >=
      CONFIG.MIN_VOLUME;

  const holderVerified =
    holders.status ===
      "VERIFIED";

  const criticalRisk =
    flags.some(
      flag =>
        flag ===
          "LOW_LIQUIDITY" ||
        flag ===
          "LOW_VOLUME" ||
        flag.includes(
          "VERY_HIGH"
        )
    );

  if (
    score >= 75 &&
    sufficientLiquidity &&
    sufficientVolume &&
    holderVerified &&
    !criticalRisk
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
   FORMAT TELEGRAM ALERT
============================================================ */

function money(
  value
) {

  if (
    value === null ||
    value === undefined
  ) {

    return "N/A";

  }

  if (
    value >=
    1_000_000
  ) {

    return (
      "$" +
      (
        value /
        1_000_000
      ).toFixed(2) +
      "M"
    );

  }

  if (
    value >=
    1_000
  ) {

    return (
      "$" +
      (
        value /
        1_000
      ).toFixed(1) +
      "K"
    );

  }

  return (
    "$" +
    value.toFixed(0)
  );

}


function formatAlert(
  result
) {

  const emoji =
    result.category ===
      "HIGH-POTENTIAL"
      ? "🚨"
      : result.category ===
        "WATCH"
        ? "🔥"
        : "👀";

  const pairUrl =
    result.dex?.pair?.url ||
    `https://dexscreener.com/robinhood/${result.contract}`;

  return (

`${emoji} <b>ROBINHOOD CHAIN MEME ALERT</b>

<b>${escapeHtml(result.name)}</b> (${
  escapeHtml(result.symbol)
})

⭐ <b>Score:</b> ${result.score}/100
🏷 <b>Category:</b> ${result.category}

💰 <b>Market Cap:</b> ${money(result.marketCap)}
💧 <b>Liquidity:</b> ${money(result.dex.liquidity)}
📊 <b>24h Volume:</b> ${money(result.dex.volume)}

🟢 <b>Buys:</b> ${result.dex.buys}
🔴 <b>Sells:</b> ${result.dex.sells}
⚖️ <b>Buy/Sell:</b> ${result.dex.ratio ?? "N/A"}
📈 <b>Pressure:</b> ${result.dex.pressure}

👥 <b>Holders:</b> ${
  result.holders ??
  "UNVERIFIED"
}

🐸 <b>Meme Score:</b> ${
  result.memeLikelihood
}/20

${
  result.holderAnalysis.status ===
  "VERIFIED"
  ? `👑 <b>Top 10:</b> ${result.holderAnalysis.top10}%
👑 <b>Top 20:</b> ${result.holderAnalysis.top20}%`
  : `👑 <b>Holder concentration:</b> UNVERIFIED`
}

🎯 <b>Target multiples</b>

$100M: ${
  result.targets.to100M ??
  "N/A"
}x

$250M: ${
  result.targets.to250M ??
  "N/A"
}x

$500M: ${
  result.targets.to500M ??
  "N/A"
}x

📍 <b>Contract:</b>
<code>${result.contract}</code>

🔎 <a href="${pairUrl}">View on DEX Screener</a>

⚠️ <b>Risk flags:</b> ${
  result.riskFlags.length
    ? result.riskFlags.join(", ")
    : "None detected"
}

<i>Automated research signal — not financial advice.</i>`

  );

}


/* ============================================================
   HTML ESCAPE
============================================================ */

function escapeHtml(
  value
) {

  return String(
    value || ""
  )
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


/* ============================================================
   DUPLICATE ALERT PROTECTION
============================================================ */

async function alreadyAlerted(
  contract
) {

  const cache =
    caches.default;

  const key =
    new Request(
      "https://rh-alert-cache.local/" +
      contract.toLowerCase()
    );

  const existing =
    await cache.match(
      key
    );

  return !!existing;

}


async function markAlerted(
  contract
) {

  const cache =
    caches.default;

  const key =
    new Request(
      "https://rh-alert-cache.local/" +
      contract.toLowerCase()
    );

  await cache.put(

    key,

    new Response(
      "alerted",
      {
        headers: {

          "cache-control":
            "max-age=21600"

        }

      }
    )

  );

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

  let holders = {

    status:
      "UNVERIFIED",

    top10:
      null,

    top20:
      null,

    risk:
      "UNKNOWN"

  };

  /*
   * Only use Blockscout for
   * candidates with actual DEX data.
   */

  if (
    dex.status ===
      "VERIFIED" &&
    canRequest()
  ) {

    holders =
      await holderAnalysis(
        token.contract
      );

  }

  const preliminary = {

    dex,

    holders

  };

  const flags =
    riskFlags(
      preliminary
    );

  const score =
    scoreToken(
      token,
      dex,
      holders
    );

  const category =
    classify(
      score,
      dex,
      holders,
      flags
    );

  return {

    ...token,

    score,

    category,

    dex,

    holderAnalysis:
      holders,

    riskFlags:
      flags,

    targets:
      targets(
        dex.marketCap ??
        token.marketCap
      )

  };

}


/* ============================================================
   MAIN SCANNER
============================================================ */

async function runScanner(
  env,
  sendAlerts = true
) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  let tokens =
    discovery.tokens || [];

  /*
   * Early-stage market cap filter
   */

  tokens =
    tokens
      .filter(
        token => {

          if (
            token.marketCap ===
            null
          ) {

            return false;

          }

          return (
            token.marketCap >=
              CONFIG.MIN_MARKET_CAP &&
            token.marketCap <=
              CONFIG.MAX_MARKET_CAP
          );

        }
      );

  /*
   * Prefer meme-like tokens
   */

  tokens.sort(
    (a, b) =>
      (
        b.memeLikelihood -
        a.memeLikelihood
      ) ||
      (
        (a.marketCap || Infinity) -
        (b.marketCap || Infinity)
      )
  );

  tokens =
    tokens.slice(
      0,
      CONFIG.CANDIDATE_LIMIT
    );

  const pairs =
    await getDexData(
      tokens.map(
        token =>
          token.contract
      )
    );

  const analysed = [];

  for (
    const token
    of tokens
  ) {

    if (
      !canRequest()
    ) {

      break;

    }

    const result =
      await analyseToken(
        token,
        pairs
      );

    analysed.push(
      result
    );

  }

  analysed.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const alerts = [];

  /*
   * Send Telegram alerts
   */

  if (
    sendAlerts &&
    telegramConfigured(env)
  ) {

    for (
      const candidate
      of analysed
    ) {

      /*
       * Only alert strong candidates.
       */

      if (
        candidate.score <
        CONFIG.ALERT_SCORE
      ) {

        continue;

      }

      /*
       * Must have verified DEX data.
       */

      if (
        candidate.dex.status !==
        "VERIFIED"
      ) {

        continue;

      }

      if (
        candidate.dex.liquidity <
        CONFIG.MIN_LIQUIDITY
      ) {

        continue;

      }

      if (
        candidate.dex.volume <
        CONFIG.MIN_VOLUME
      ) {

        continue;

      }

      if (
        await alreadyAlerted(
          candidate.contract
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
          candidate.contract,

        score:
          candidate.score,

        sent:
          result.sent,

        error:
          result.error ||
          null

      });

      if (
        result.sent
      ) {

        await markAlerted(
          candidate.contract
        );

      }

    }

  }

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      CONFIG.VERSION,

    status:
      "ONLINE",

    objective:
      "Automatically discover and alert on promising early-stage Robinhood Chain meme coins.",

    chain: {

      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC_URL,

      status:
        "AVAILABLE"

    },

    telegram: {

      configured:
        telegramConfigured(env),

      chatId:
        env?.TELEGRAM_CHAT_ID ||
        null,

      alertsSent:
        alerts.filter(
          x =>
            x.sent
        ).length

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
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

      holderConcentration:
        "BLOCKSCOUT WHEN AVAILABLE",

      walletActivity:
        "NOT YET VERIFIED",

      accumulationDistribution:
        "NOT YET VERIFIED",

      smartMoney:
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
          telegramConfigured(env),

        telegramChatId:
          env?.TELEGRAM_CHAT_ID ||
          null,

        cost:
          "FREE-FIRST",

        timestamp:
          new Date().toISOString()

      });

    }


    /*
     * TELEGRAM TEST
     */

    if (
      url.pathname ===
      "/test"
    ) {

      const result =
        await telegram(

          env,

`🚨 <b>Robinhood Chain Meme Hunter V14</b>

✅ Telegram connection successful.

🤖 Bot is connected.
⛓ Robinhood Chain: 4663
📡 Scanner: ONLINE

The next scheduled scan will automatically look for early-stage meme coins.`

        );

      return Response.json({

        telegram:
          result,

        chatId:
          env?.TELEGRAM_CHAT_ID ||
          null

      });

    }


    /*
     * MANUAL SCAN
     */

    if (
      url.pathname ===
      "/"
    ) {

      try {

        const result =
          await runScanner(
            env,
            true
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

      } catch (
        error
      ) {

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

            noFabricatedMetrics:
              true

          },

          {

            status:
              500

          }

        );

      }

    }


    return new Response(
      "Robinhood Chain Meme Hunter V14",
      {
        status: 200
      }
    );

  },


  /*
   * CLOUDFLARE CRON
   *
   * This automatically runs the
   * scanner when a Cron Trigger
   * is configured.
   */

  async scheduled(
    event,
    env,
    ctx
  ) {

    ctx.waitUntil(

      runScanner(
        env,
        true
      )

    );

  }

};
