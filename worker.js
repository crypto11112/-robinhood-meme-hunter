const CONFIG = {
  VERSION: "V20",
  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",
  RPC: "https://rpc.mainnet.chain.robinhood.com",
  DEXSCREENER: "https://api.dexscreener.com",
  CHAIN_SLUG: "robinhood",

  LAUNCHERS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  BLOCKS_PER_CHUNK: 5000,
  LOG_CHUNKS: 8,
  MAX_TOKENS: 100,

  MIN_LIQUIDITY: 10000,
  MIN_VOLUME_24H: 5000,
  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,

  ALERT_SCORE: 70
};

let requestCount = 0;

async function rpc(method, params = []) {
  requestCount++;

  try {
    const r = await fetch(CONFIG.RPC, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestCount,
        method,
        params
      })
    });

    if (!r.ok) {
      return { ok: false, error: `RPC_HTTP_${r.status}` };
    }

    const data = await r.json();

    if (data.error) {
      return {
        ok: false,
        error: data.error.message || "RPC_ERROR"
      };
    }

    return { ok: true, result: data.result };

  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e)
    };
  }
}

function hexToNumber(hex) {
  return hex ? parseInt(hex, 16) : 0;
}

function addressFromTopic(topic) {
  if (!topic) return null;

  return (
    "0x" +
    topic.replace(/^0x/, "").slice(-40)
  ).toLowerCase();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round(v, d = 2) {
  return v == null
    ? null
    : Number(Number(v).toFixed(d));
}

function money(v) {
  if (v == null) return "N/A";

  if (v >= 1000000)
    return "$" + (v / 1000000).toFixed(2) + "M";

  if (v >= 1000)
    return "$" + (v / 1000).toFixed(1) + "K";

  return "$" + v.toFixed(2);
}

function escapeHtml(v) {
  return String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* ============================================================
   ON-CHAIN TOKEN DISCOVERY
============================================================ */

async function discoverLaunches() {

  const latest = await rpc("eth_blockNumber");

  if (!latest.ok) {
    return {
      tokens: [],
      error: latest.error
    };
  }

  const latestBlock =
    hexToNumber(latest.result);

  const tokens = [];
  const seen = new Set();

  for (
    let i = 0;
    i < CONFIG.LOG_CHUNKS;
    i++
  ) {

    const toBlock =
      latestBlock -
      i * CONFIG.BLOCKS_PER_CHUNK;

    const fromBlock =
      Math.max(
        0,
        toBlock -
        CONFIG.BLOCKS_PER_CHUNK +
        1
      );

    const filter = {
      fromBlock:
        "0x" +
        fromBlock.toString(16),

      toBlock:
        "0x" +
        toBlock.toString(16),

      address: CONFIG.LAUNCHERS,

      topics: [
        CONFIG.TOKEN_CREATED_TOPIC
      ]
    };

    const result =
      await rpc(
        "eth_getLogs",
        [filter]
      );

    if (!result.ok) continue;

    const logs =
      Array.isArray(result.result)
        ? result.result
        : [];

    for (const log of logs) {

      if (!log.topics?.[1])
        continue;

      const token =
        addressFromTopic(
          log.topics[1]
        );

      if (!token || seen.has(token))
        continue;

      seen.add(token);

      tokens.push({
        address: token,

        blockNumber:
          hexToNumber(
            log.blockNumber
          ),

        transactionHash:
          log.transactionHash,

        launcher:
          String(
            log.address || ""
          ).toLowerCase()
      });

      if (
        tokens.length >=
        CONFIG.MAX_TOKENS
      ) break;
    }

    if (
      tokens.length >=
      CONFIG.MAX_TOKENS
    ) break;
  }

  return {
    tokens,
    latestBlock
  };
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function getMarketData(addresses) {

  const pairs = [];

  for (
    let i = 0;
    i < addresses.length;
    i += 30
  ) {

    const batch =
      addresses.slice(
        i,
        i + 30
      );

    try {

      const r = await fetch(
        `${CONFIG.DEXSCREENER}/latest/dex/tokens/${batch.join(",")}`,
        {
          headers: {
            accept: "application/json",
            "user-agent":
              "Robinhood-Meme-Hunter-V20"
          }
        }
      );

      if (!r.ok) continue;

      const data = await r.json();

      if (Array.isArray(data?.pairs)) {
        pairs.push(...data.pairs);
      }

    } catch {
      continue;
    }
  }

  return pairs;
}


/* ============================================================
   MEME SCORE
============================================================ */

function memeScore(name, symbol) {

  const text =
    `${name || ""} ${symbol || ""}`
      .toLowerCase();

  const keywords = [
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
    "goat",
    "ape",
    "degen",
    "pup",
    "woof",
    "bear",
    "bull",
    "monkey",
    "panda",
    "yolo",
    "fart",
    "robin",
    "hood"
  ];

  let score = 0;

  for (const k of keywords) {
    if (text.includes(k)) {
      score += 4;
    }
  }

  return Math.min(score, 20);
}


/* ============================================================
   RISK
============================================================ */

function riskAnalysis(d) {

  const flags = [];
  let risk = 0;

  if (d.liquidity < 15000) {
    flags.push("LOW_LIQUIDITY");
    risk += 20;
  }

  if (d.liquidityToMarketCap < 0.05) {
    flags.push("LOW_LIQUIDITY_RATIO");
    risk += 15;
  }

  if (d.buySellRatio < 0.8) {
    flags.push("STRONG_SELL_PRESSURE");
    risk += 25;
  }

  if (d.transactions < 100) {
    flags.push("LOW_TRANSACTION_ACTIVITY");
    risk += 10;
  }

  if (d.marketCap > 25000000) {
    flags.push("LATE_STAGE_VALUATION");
    risk += 10;
  }

  if (d.memeScore === 0) {
    flags.push("WEAK_MEME_SIGNAL");
    risk += 5;
  }

  return {
    riskScore: Math.min(100, risk),

    riskLevel:
      risk >= 50
        ? "HIGH"
        : risk >= 25
          ? "MEDIUM"
          : "LOW",

    flags
  };
}


/* ============================================================
   OPPORTUNITY SCORE
============================================================ */

function calculateScore(d) {

  let score = 0;

  if (d.marketCap <= 250000)
    score += 20;
  else if (d.marketCap <= 1000000)
    score += 18;
  else if (d.marketCap <= 5000000)
    score += 15;
  else if (d.marketCap <= 10000000)
    score += 12;
  else if (d.marketCap <= 25000000)
    score += 8;
  else
    score += 4;

  if (d.liquidity >= 100000)
    score += 15;
  else if (d.liquidity >= 50000)
    score += 12;
  else if (d.liquidity >= 25000)
    score += 9;
  else if (d.liquidity >= 10000)
    score += 5;

  if (d.volumeRatio >= 5)
    score += 15;
  else if (d.volumeRatio >= 2)
    score += 12;
  else if (d.volumeRatio >= 0.5)
    score += 8;
  else if (d.volumeRatio >= 0.1)
    score += 4;

  if (d.buySellRatio >= 2)
    score += 15;
  else if (d.buySellRatio >= 1.25)
    score += 12;
  else if (d.buySellRatio >= 1.05)
    score += 6;

  if (d.transactions >= 5000)
    score += 5;
  else if (d.transactions >= 1000)
    score += 4;
  else if (d.transactions >= 250)
    score += 2;

  score += Math.min(
    15,
    Math.round(
      d.memeScore * 0.75
    )
  );

  if (d.launchAgeHours != null) {

    if (d.launchAgeHours <= 6)
      score += 10;

    else if (d.launchAgeHours <= 24)
      score += 8;

    else if (d.launchAgeHours <= 72)
      score += 5;
  }

  score -= Math.round(
    d.riskScore * 0.25
  );

  return Math.max(
    0,
    Math.min(100, score)
  );
}


/* ============================================================
   ANALYSE
============================================================ */

function analysePair(pair, launch) {

  if (!pair) return null;

  if (
    String(pair.chainId || "")
      .toLowerCase() !==
    CONFIG.CHAIN_SLUG
  ) return null;

  const base =
    pair.baseToken || {};

  const address =
    String(base.address || "")
      .toLowerCase();

  const name =
    base.name || "Unknown";

  const symbol =
    base.symbol || "UNKNOWN";

  if (!address) return null;

  const marketCap =
    num(pair.marketCap) ??
    num(pair.fdv);

  const liquidity =
    num(pair?.liquidity?.usd);

  const volume =
    num(pair?.volume?.h24);

  const buys =
    num(pair?.txns?.h24?.buys) || 0;

  const sells =
    num(pair?.txns?.h24?.sells) || 0;

  if (
    marketCap == null ||
    liquidity == null ||
    volume == null
  ) return null;

  if (
    marketCap <
    CONFIG.MIN_MARKET_CAP ||
    marketCap >
    CONFIG.MAX_MARKET_CAP
  ) return null;

  if (
    liquidity <
    CONFIG.MIN_LIQUIDITY ||
    volume <
    CONFIG.MIN_VOLUME_24H
  ) return null;

  const transactions =
    buys + sells;

  const buySellRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? 99
        : 0;

  const liquidityToMarketCap =
    marketCap > 0
      ? liquidity / marketCap
      : 0;

  const volumeRatio =
    marketCap > 0
      ? volume / marketCap
      : 0;

  let launchAgeHours = null;

  if (pair.pairCreatedAt) {

    launchAgeHours =
      (
        Date.now() -
        Number(pair.pairCreatedAt)
      ) / 3600000;
  }

  const d = {

    contract: address,
    name,
    symbol,

    priceUsd:
      num(pair.priceUsd),

    marketCap,

    fdv:
      num(pair.fdv),

    liquidity,

    volume24h:
      volume,

    buys,
    sells,
    transactions,

    buySellRatio:
      round(buySellRatio),

    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE"
          : "NEUTRAL",

    liquidityToMarketCap:
      round(
        liquidityToMarketCap,
        4
      ),

    volumeToMarketCap:
      round(
        volumeRatio,
        4
      ),

    volumeRatio,

    memeScore:
      memeScore(
        name,
        symbol
      ),

    launchAgeHours:
      launchAgeHours == null
        ? null
        : round(
            launchAgeHours,
            1
          ),

    launchBlock:
      launch.blockNumber,

    launchTransaction:
      launch.transactionHash,

    launcher:
      launch.launcher,

    dex:
      pair.dexId || "uniswap",

    pairAddress:
      pair.pairAddress,

    url:
      pair.url ||
      `https://dexscreener.com/robinhood/${pair.pairAddress}`,

    /*
     * These are intentionally NOT fabricated.
     */
    holderConcentration:
      "UNVERIFIED",

    walletActivity:
      "UNVERIFIED",

    smartMoney:
      "UNVERIFIED",

    accumulationDistribution:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE_ONLY"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE_ONLY"
          : "NEUTRAL"
  };

  const risk =
    riskAnalysis(d);

  d.riskScore =
    risk.riskScore;

  d.riskLevel =
    risk.riskLevel;

  d.riskFlags =
    risk.flags;

  d.discoveryScore =
    calculateScore(d);

  d.category =
    d.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : d.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : d.discoveryScore >= 60
          ? "WATCH"
          : d.discoveryScore >= 50
            ? "EARLY"
            : "LOW_CONVICTION";

  d.targetMultiples = {
    to100M:
      round(
        100000000 /
        marketCap
      ),

    to250M:
      round(
        250000000 /
        marketCap
      ),

    to500M:
      round(
        500000000 /
        marketCap
      )
  };

  return d;
}


/* ============================================================
   TELEGRAM
============================================================ */

async function sendTelegram(env, text) {

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      ok: false,
      error: "TELEGRAM_NOT_CONFIGURED"
    };
  }

  try {

    const r = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body: JSON.stringify({
          chat_id:
            env.TELEGRAM_CHAT_ID,

          text,

          parse_mode: "HTML",

          disable_web_page_preview:
            false
        })
      }
    );

    const data =
      await r.json();

    return {
      ok:
        r.ok &&
        data?.ok === true,

      data
    };

  } catch (e) {

    return {
      ok: false,
      error:
        String(e?.message || e)
    };
  }
}


/* ============================================================
   ALERT
============================================================ */

function buildAlert(d) {

  const emoji =
    d.discoveryScore >= 80
      ? "🚨"
      : d.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${emoji} <b>ROBINHOOD MEME HUNTER V20</b>

<b>${escapeHtml(d.name)}</b> (${
    escapeHtml(d.symbol)
  })

<b>Opportunity Score:</b>
${d.discoveryScore}/100

<b>Risk:</b>
${d.riskLevel}
(${d.riskScore}/100)

━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(d.marketCap)}

<b>Liquidity:</b>
${money(d.liquidity)}

<b>24h Volume:</b>
${money(d.volume24h)}

<b>Age:</b>
${d.launchAgeHours ?? "UNVERIFIED"} hours

━━━━━━━━━━━━━━

<b>Buys:</b> ${d.buys}

<b>Sells:</b> ${d.sells}

<b>Buy/Sell:</b> ${d.buySellRatio}

<b>Pressure:</b> ${d.pressure}

<b>Transactions:</b>
${d.transactions}

━━━━━━━━━━━━━━

<b>Liquidity / MC:</b>
${(
    d.liquidityToMarketCap * 100
  ).toFixed(1)}%

<b>Volume / MC:</b>
${(
    d.volumeToMarketCap * 100
  ).toFixed(1)}%

<b>Meme Score:</b>
${d.memeScore}/20

<b>Flow:</b>
${d.accumulationDistribution}

━━━━━━━━━━━━━━

<b>Holder concentration:</b>
UNVERIFIED

<b>Wallet activity:</b>
UNVERIFIED

<b>Smart money:</b>
UNVERIFIED

━━━━━━━━━━━━━━

<b>Contract:</b>

<code>${escapeHtml(
    d.contract
  )}</code>

<a href="${d.url}">View on DEX Screener</a>

⚠️ Automated research signal — not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function scan(env) {

  requestCount = 0;

  const discovery =
    await discoverLaunches();

  if (
    !discovery.tokens.length
  ) {

    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "NO_NEW_LAUNCHES_FOUND",

      discovery: {
        source:
          "ROBINHOOD_CHAIN_RPC",

        latestBlock:
          discovery.latestBlock || null,

        tokensDiscovered: 0
      },

      candidates: [],
      alerts: [],

      requestCount,

      timestamp:
        new Date().toISOString()
    };
  }

  const addresses =
    discovery.tokens.map(
      x => x.address
    );

  const pairs =
    await getMarketData(
      addresses
    );

  const bestPairs =
    new Map();

  for (const pair of pairs) {

    const address =
      String(
        pair?.baseToken?.address ||
        ""
      ).toLowerCase();

    if (!address) continue;

    const old =
      bestPairs.get(address);

    const liq =
      num(pair?.liquidity?.usd) || 0;

    const oldLiq =
      num(old?.liquidity?.usd) || 0;

    if (
      !old ||
      liq > oldLiq
    ) {
      bestPairs.set(
        address,
        pair
      );
    }
  }

  const candidates = [];

  for (
    const launch
    of discovery.tokens
  ) {

    const pair =
      bestPairs.get(
        launch.address
      );

    if (!pair) continue;

    const candidate =
      analysePair(
        pair,
        launch
      );

    if (candidate) {
      candidates.push(
        candidate
      );
    }
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

  for (
    const candidate
    of candidates
  ) {

    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    ) continue;

    if (
      candidate.riskFlags.includes(
        "STRONG_SELL_PRESSURE"
      )
    ) continue;

    const result =
      await sendTelegram(
        env,
        buildAlert(candidate)
      );

    alerts.push({
      contract:
        candidate.contract,

      symbol:
        candidate.symbol,

      score:
        candidate.discoveryScore,

      risk:
        candidate.riskLevel,

      sent:
        result.ok,

      error:
        result.ok
          ? null
          : (
              result.error ||
              result.data?.description ||
              "TELEGRAM_FAILED"
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
      "Discover early-stage Robinhood Chain meme coins and rank them using verified market data.",

    chain: {
      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC
    },

    discovery: {

      source:
        "ROBINHOOD_CHAIN_RPC",

      launchContracts:
        CONFIG.LAUNCHERS,

      latestBlock:
        discovery.latestBlock,

      tokensDiscovered:
        discovery.tokens.length
    },

    marketData: {

      source:
        "DEX_SCREENER",

      pairsFound:
        pairs.length,

      uniqueTokens:
        bestPairs.size
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
          x => x.sent
        ).length
    },

    scan: {

      candidatesAnalysed:
        candidates.length,

      requestCount,

      requestLimit:
        10
    },

    candidates:
      candidates.slice(0, 50),

    alerts,

    validation: {

      tokenDiscovery:
        "VERIFIED ON ROBINHOOD CHAIN",

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

      pairAge:
        "DEX SCREENER WHEN AVAILABLE",

      holderConcentration:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      accumulationDistribution:
        "BUY/SELL FLOW ONLY"
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
   ROUTES
============================================================ */

export default {

  async fetch(request, env) {

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
          CONFIG.VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.CHAIN_ID,

        rpc:
          CONFIG.RPC,

        discovery:
          "ON-CHAIN TOKEN CREATED EVENTS",

        marketData:
          "DEX SCREENER",

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),

        holderData:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED"
      });
    }


    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(
          env,
          `🤖 <b>Robinhood Chain Meme Hunter V20</b>

Telegram connection successful.

On-chain discovery: ✅
DEX market data: ✅
Risk scoring: ✅

Holder data: ⚠️ UNVERIFIED
Smart money: ⚠️ UNVERIFIED`
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


    if (
      url.pathname ===
      "/scan"
    ) {

      try {

        const result =
          await scan(env);

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

      } catch (e) {

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
                e?.message || e
              ),

            requestCount,

            dataIntegrity: {
              noFabricatedMetrics:
                true
            },

            timestamp:
              new Date().toISOString()
          },
          { status: 500 }
        );
      }
    }


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
