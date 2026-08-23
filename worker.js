/**
 * ROBINHOOD CHAIN MEME HUNTER — V15
 *
 * FREE-FIRST TELEGRAM ALERT BOT
 *
 * Chain ID: 4663
 *
 * Data:
 * - Robinhood Chain RPC
 * - Robinhood Chain Blockscout V2
 * - DEX Screener public API
 * - Telegram Bot API
 *
 * Cloudflare Worker compatible.
 *
 * Required secrets:
 *
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_CHAT_ID
 *
 * TELEGRAM_CHAT_ID:
 * -1004466114680
 *
 * IMPORTANT:
 * - Never fabricate unavailable data.
 * - UNVERIFIED is never treated as zero.
 * - Alerts require verified DEX data.
 */

const CONFIG = {

  VERSION: "V15",

  CHAIN_ID: 4663,

  CHAIN_NAME: "Robinhood Chain",

  RPC:
    "https://rpc.mainnet.chain.robinhood.com",

  BLOCKSCOUT:
    "https://robinhoodchain.blockscout.com/api/v2",

  DEX:
    "https://api.dexscreener.com",

  MAX_DISCOVERY:
    50,

  MAX_CANDIDATES:
    12,

  MAX_HOLDER_CHECKS:
    3,

  MAX_REQUESTS:
    10,

  MIN_MARKET_CAP:
    0,

  MAX_MARKET_CAP:
    50_000_000,

  MIN_LIQUIDITY:
    25_000,

  MIN_VOLUME:
    10_000,

  ALERT_SCORE:
    65,

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
   HTTP
============================================================ */

async function fetchJson(
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

function number(
  value
) {

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
    target /
    marketCap,
    2
  );

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
    "woof",
    "wen",
    "yolo",
    "bull",
    "bear"

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
    score,
    20
  );

}


/* ============================================================
   TOKEN DISCOVERY
============================================================ */

async function discoverTokens() {

  const url =
    CONFIG.BLOCKSCOUT +
    "/tokens?type=ERC-20";

  const result =
    await fetchJson(
      url
    );

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
          token.address
      )

      .map(
        token => {

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
      )

      .filter(
        token =>

          token.marketCap !== null &&

          token.marketCap >=
            CONFIG.MIN_MARKET_CAP &&

          token.marketCap <=
            CONFIG.MAX_MARKET_CAP

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

async function dexData(
  addresses
) {

  if (
    !addresses.length
  ) {

    return {

      status:
        "UNVERIFIED",

      pairs: []

    };

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

    CONFIG.DEX +
    "/tokens/v1/robinhood/" +
    unique.join(",");

  const result =
    await fetchJson(
      url
    );

  if (!result.ok) {

    return {

      status:
        "UNVERIFIED",

      pairs: [],

      error:
        result.error

    };

  }

  return {

    status:
      "VERIFIED",

    pairs:
      Array.isArray(
        result.data
      )
        ? result.data
        : []

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

      volume24h:
        null,

      buys:
        null,

      sells:
        null,

      pressure:
        "UNKNOWN",

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
    const pair of matching
  ) {

    const liq =
      number(
        pair?.liquidity?.usd
      ) || 0;

    const vol =
      number(
        pair?.volume?.h24
      ) || 0;

    liquidity += liq;

    volume += vol;

    buys +=
      number(
        pair?.txns?.h24?.buys
      ) || 0;

    sells +=
      number(
        pair?.txns?.h24?.sells
      ) || 0;

    if (
      liq >
      bestLiquidity
    ) {

      bestLiquidity =
        liq;

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

    number(
      bestPair?.marketCap
    ) ??

    number(
      bestPair?.fdv
    ) ??

    token.marketCap;

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

  let liquidityQuality =
    "LOW";

  if (
    liquidityRatio !== null &&
    liquidityRatio >= 0.20
  ) {

    liquidityQuality =
      "STRONG";

  } else if (
    liquidityRatio !== null &&
    liquidityRatio >= 0.10
  ) {

    liquidityQuality =
      "GOOD";

  } else if (
    liquidityRatio !== null &&
    liquidityRatio >= 0.05
  ) {

    liquidityQuality =
      "MODERATE";

  }

  let volumeQuality =
    "LOW";

  if (
    volumeRatio !== null &&
    volumeRatio >= 0.50
  ) {

    volumeQuality =
      "VERY_HIGH";

  } else if (
    volumeRatio !== null &&
    volumeRatio >= 0.20
  ) {

    volumeQuality =
      "HIGH";

  } else if (
    volumeRatio !== null &&
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

    volume24h:
      round(
        volume,
        2
      ),

    buys,

    sells,

    buySellRatio:
      sells > 0
        ? round(
            buys /
            sells,
            2
          )
        : null,

    pressure,

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

            priceUsd:
              number(
                bestPair.priceUsd
              ),

            pairCreatedAt:
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

    CONFIG.BLOCKSCOUT +
    "/tokens/" +
    address +
    "/holders";

  const result =
    await fetchJson(
      url
    );

  if (!result.ok) {

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
          number(
            holder.value
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
      .slice(
        0,
        10
      )
      .reduce(
        (a, b) =>
          a + b,
        0
      );

  const top20 =

    balances
      .slice(
        0,
        20
      )
      .reduce(
        (a, b) =>
          a + b,
        0
      );

  const top10Percent =
    round(
      top10 /
      total *
      100,
      2
    );

  const top20Percent =
    round(
      top20 /
      total *
      100,
      2
    );

  let risk =
    "LOW";

  if (
    top10Percent > 50
  ) {

    risk =
      "VERY_HIGH";

  } else if (
    top10Percent > 35
  ) {

    risk =
      "HIGH";

  } else if (
    top10Percent > 20
  ) {

    risk =
      "MODERATE";

  }

  return {

    status:
      "VERIFIED",

    top10:
      top10Percent,

    top20:
      top20Percent,

    risk

  };

}


/* ============================================================
   SCORING
============================================================ */

function score(
  token,
  dex,
  holders
) {

  let score = 0;

  let factors = 0;

  if (
    token.marketCap !== null
  ) {

    factors++;

    if (
      token.marketCap <
      1_000_000
    ) {

      score += 15;

    } else if (
      token.marketCap <
      10_000_000
    ) {

      score += 12;

    } else if (
      token.marketCap <
      25_000_000
    ) {

      score += 8;

    } else {

      score += 5;

    }

  }

  factors++;

  if (
    token.memeLikelihood >= 15
  ) {

    score += 15;

  } else if (
    token.memeLikelihood >= 10
  ) {

    score += 10;

  } else if (
    token.memeLikelihood >= 5
  ) {

    score += 5;

  }

  if (
    dex.status ===
    "VERIFIED"
  ) {

    factors++;

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

      score += 7;

    }

    factors++;

    if (
      dex.volumeQuality ===
      "VERY_HIGH"
    ) {

      score += 10;

    } else if (
      dex.volumeQuality ===
      "HIGH"
    ) {

      score += 8;

    } else if (
      dex.volumeQuality ===
      "HEALTHY"
    ) {

      score += 5;

    }

    factors++;

    if (
      dex.pressure ===
      "BUY_PRESSURE"
    ) {

      score += 10;

    } else if (
      dex.pressure ===
      "NEUTRAL"
    ) {

      score += 5;

    }

  }

  if (
    holders.status ===
    "VERIFIED"
  ) {

    factors++;

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

  return {

    score:
      Math.min(
        score,
        100
      ),

    factors

  };

}


/* ============================================================
   TELEGRAM
============================================================ */

async function sendTelegram(
  env,
  message
) {

  const token =
    env.TELEGRAM_BOT_TOKEN;

  const chatId =
    env.TELEGRAM_CHAT_ID;

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

    `https://api.telegram.org/bot` +
    `${token}/sendMessage`;

  const result =
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
              chatId,

            text:
              message,

            parse_mode:
              "HTML",

            disable_web_page_preview:
              true

          })

      }
    );

  if (
    !result.ok
  ) {

    return {

      ok: false,

      error:
        `TELEGRAM_HTTP_${result.status}`

    };

  }

  const data =
    await result.json();

  return {

    ok:
      data.ok === true,

    data

  };

}


/* ============================================================
   TELEGRAM MESSAGE
============================================================ */

function buildAlert(
  token,
  dex,
  holders,
  score
) {

  const target100 =
    multiple(
      token.marketCap,
      100_000_000
    );

  const target250 =
    multiple(
      token.marketCap,
      250_000_000
    );

  const target500 =
    multiple(
      token.marketCap,
      500_000_000
    );

  const pairUrl =
    dex.pair?.url ||
    "";

  return `🚨 <b>ROBINHOOD CHAIN MEME ALERT</b>

🔥 <b>${token.name}</b> (${
    token.symbol
  })

📜 <b>Contract:</b>
<code>${token.contract}</code>

💰 <b>Market Cap:</b>
$${Math.round(
    token.marketCap || 0
  ).toLocaleString()}

💧 <b>Liquidity:</b>
$${Math.round(
    dex.liquidity || 0
  ).toLocaleString()}

📊 <b>24h Volume:</b>
$${Math.round(
    dex.volume24h || 0
  ).toLocaleString()}

🟢 <b>Buys:</b>
${dex.buys ?? "UNVERIFIED"}

🔴 <b>Sells:</b>
${dex.sells ?? "UNVERIFIED"}

📈 <b>Pressure:</b>
${dex.pressure}

🎯 <b>Hunter Score:</b>
${score}/100

👥 <b>Holder concentration:</b>
${
  holders.status ===
  "VERIFIED"

    ? `Top 10: ${holders.top10}%`

    : "UNVERIFIED"
}

🎯 <b>Theoretical market-cap multiples</b>

$100M → ${
    target100 ?? "UNVERIFIED"
  }x

$250M → ${
    target250 ?? "UNVERIFIED"
  }x

$500M → ${
    target500 ?? "UNVERIFIED"
  }x

⚠️ <b>Risk:</b>
Early-stage / highly speculative.

🔗 ${
    pairUrl ||
    "DEX pair link unavailable"
  }`;

}


/* ============================================================
   SCANNER
============================================================ */

async function runScanner(
  env
) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  const discovered =
    discovery.tokens || [];

  const ranked =
    discovered

      .sort(
        (a, b) => {

          const aScore =
            (
              a.memeLikelihood *
              3
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
              b.memeLikelihood *
              3
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

        }
      )

      .slice(
        0,
        CONFIG.MAX_CANDIDATES
      );

  const dexResult =
    await dexData(
      ranked.map(
        token =>
          token.contract
      )
    );

  const pairs =
    dexResult.pairs || [];

  const results = [];

  let holderChecks = 0;

  let alerts = [];

  for (
    const token
    of ranked
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

    if (
      holderChecks <
      CONFIG.MAX_HOLDER_CHECKS &&
      canRequest()
    ) {

      holders =
        await holderAnalysis(
          token.contract
        );

      holderChecks++;

    }

    const scoring =
      score(
        token,
        dex,
        holders
      );

    const riskFlags = [];

    if (
      dex.status ===
      "VERIFIED"
    ) {

      if (
        dex.liquidity <
        CONFIG.MIN_LIQUIDITY
      ) {

        riskFlags.push(
          "LOW_LIQUIDITY"
        );

      }

      if (
        dex.volume24h <
        CONFIG.MIN_VOLUME
      ) {

        riskFlags.push(
          "LOW_VOLUME"
        );

      }

      if (
        dex.pressure ===
        "SELL_PRESSURE"
      ) {

        riskFlags.push(
          "SELL_PRESSURE"
        );

      }

    }

    if (
      holders.risk ===
      "HIGH"
    ) {

      riskFlags.push(
        "HIGH_HOLDER_CONCENTRATION"
      );

    }

    if (
      holders.risk ===
      "VERY_HIGH"
    ) {

      riskFlags.push(
        "VERY_HIGH_HOLDER_CONCENTRATION"
      );

    }

    const highPotential =

      scoring.score >=
        CONFIG.ALERT_SCORE &&

      dex.status ===
        "VERIFIED" &&

      dex.liquidity !== null &&

      dex.liquidity >=
        CONFIG.MIN_LIQUIDITY &&

      dex.volume24h !== null &&

      dex.volume24h >=
        CONFIG.MIN_VOLUME &&

      !riskFlags.includes(
        "LOW_LIQUIDITY"
      ) &&

      !riskFlags.includes(
        "LOW_VOLUME"
      ) &&

      !riskFlags.includes(
        "VERY_HIGH_HOLDER_CONCENTRATION"
      );

    const result = {

      ...token,

      discoveryScore:
        scoring.score,

      scoreFactors:
        scoring.factors,

      dex,

      holders,

      riskFlags,

      category:
        highPotential

          ? "HIGH-POTENTIAL"

          : scoring.score >= 60

            ? "WATCH"

            : scoring.score >= 40

              ? "EARLY"

              : "LOW-CONVICTION",

      targets: {

        to100M:
          multiple(
            token.marketCap,
            100_000_000
          ),

        to250M:
          multiple(
            token.marketCap,
            250_000_000
          ),

        to500M:
          multiple(
            token.marketCap,
            500_000_000
          )

      }

    };

    results.push(
      result
    );

    /*
     * Telegram alert
     */

    if (
      highPotential
    ) {

      const message =
        buildAlert(
          token,
          dex,
          holders,
          scoring.score
        );

      const telegram =
        await sendTelegram(
          env,
          message
        );

      alerts.push({

        contract:
          token.contract,

        symbol:
          token.symbol,

        score:
          scoring.score,

        telegram:
          telegram.ok
            ? "SENT"
            : telegram.error

      });

    }

  }

  results.sort(
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
      "Automatically discover early-stage Robinhood Chain meme coins and alert Telegram when verified conditions are met.",

    chain: {

      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC,

      status:
        "AVAILABLE"

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
            x.telegram ===
            "SENT"
        ).length

    },

    scan: {

      tokensDiscovered:
        discovered.length,

      candidatesAnalysed:
        results.length,

      requestCount,

      requestLimit:
        CONFIG.MAX_REQUESTS

    },

    candidates:
      results,

    alerts,

    validation: {

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

      holderConcentration:
        "BLOCKSCOUT",

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
   WORKER
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

        chatId:
          env.TELEGRAM_CHAT_ID ||
          null,

        cost:
          "FREE-FIRST"

      });

    }


    /*
     * TELEGRAM TEST
     *
     * Open:
     *
     * /telegram-test
     */

    if (
      url.pathname ===
      "/telegram-test"
    ) {

      const result =
        await sendTelegram(

          env,

          `🤖 <b>Robinhood Chain Meme Hunter</b>

✅ Telegram connection successful.

Version: ${CONFIG.VERSION}

Chain: Robinhood Chain
Chain ID: 4663

The bot is ready to scan.`

        );

      return Response.json(
        result
      );

    }


    /*
     * MAIN SCAN
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

            dataIntegrity: {

              noFabricatedMetrics:
                true

            },

            timestamp:
              new Date().toISOString()

          },

          {

            status:
              500

          }

        );

      }

    }


    return new Response(

      "Robinhood Chain Meme Hunter V15",

      {

        status: 200

      }

    );

  }

};
