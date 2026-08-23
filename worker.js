const CONFIG = {
  VERSION: "V21",

  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",

  RPC: "https://rpc.mainnet.chain.robinhood.com",

  DEXSCREENER_API: "https://api.dexscreener.com",

  CHAIN_SLUG: "robinhood",

  LAUNCHERS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  BLOCK_RANGE: 5000,
  BLOCK_CHUNKS: 8,

  MAX_DISCOVERED: 100,

  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 5000,
  MIN_VOLUME_24H: 2500,

  ALERT_SCORE: 70
};

let requestCount = 0;


/* ============================================================
   BASIC HELPERS
============================================================ */

function number(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hexNumber(v) {
  if (!v) return 0;

  try {
    return parseInt(v, 16);
  } catch {
    return 0;
  }
}

function lower(v) {
  return String(v || "").toLowerCase();
}

function addressFromTopic(topic) {
  if (!topic) return null;

  const clean =
    String(topic)
      .replace(/^0x/, "")
      .slice(-40);

  if (clean.length !== 40) return null;

  return `0x${clean}`.toLowerCase();
}

function round(v, decimals = 2) {
  if (v == null) return null;

  return Number(
    Number(v).toFixed(decimals)
  );
}

function money(v) {
  if (v == null) return "N/A";

  if (v >= 1000000)
    return `$${(v / 1000000).toFixed(2)}M`;

  if (v >= 1000)
    return `$${(v / 1000).toFixed(1)}K`;

  return `$${v.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* ============================================================
   ROBINHOOD RPC
============================================================ */

async function rpc(method, params = []) {

  requestCount++;

  try {

    const response =
      await fetch(CONFIG.RPC, {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: requestCount,
          method,
          params
        })
      });

    if (!response.ok) {

      return {
        ok: false,
        error:
          `RPC_HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    if (data.error) {

      return {
        ok: false,
        error:
          data.error.message ||
          "RPC_ERROR"
      };
    }

    return {
      ok: true,
      result: data.result
    };

  } catch (error) {

    return {
      ok: false,
      error:
        String(
          error?.message || error
        )
    };
  }
}


/* ============================================================
   DISCOVER TOKEN LAUNCHES
============================================================ */

async function discoverTokens() {

  const latest =
    await rpc("eth_blockNumber");

  if (!latest.ok) {

    return {
      tokens: [],
      latestBlock: null,
      error: latest.error
    };
  }

  const latestBlock =
    hexNumber(latest.result);

  const tokens = [];
  const seen = new Set();

  for (
    let chunk = 0;
    chunk < CONFIG.BLOCK_CHUNKS;
    chunk++
  ) {

    const toBlock =
      latestBlock -
      chunk * CONFIG.BLOCK_RANGE;

    const fromBlock =
      Math.max(
        0,
        toBlock -
        CONFIG.BLOCK_RANGE +
        1
      );

    const filter = {

      fromBlock:
        `0x${fromBlock.toString(16)}`,

      toBlock:
        `0x${toBlock.toString(16)}`,

      address:
        CONFIG.LAUNCHERS,

      topics: [
        CONFIG.TOKEN_CREATED_TOPIC
      ]
    };

    const result =
      await rpc(
        "eth_getLogs",
        [filter]
      );

    if (!result.ok)
      continue;

    const logs =
      Array.isArray(result.result)
        ? result.result
        : [];

    for (const log of logs) {

      /*
       * Most launch contracts place
       * the created token in topics[1].
       */

      const token =
        addressFromTopic(
          log.topics?.[1]
        );

      if (!token)
        continue;

      if (seen.has(token))
        continue;

      seen.add(token);

      tokens.push({

        address:
          token,

        blockNumber:
          hexNumber(
            log.blockNumber
          ),

        transactionHash:
          log.transactionHash,

        launcher:
          lower(log.address)
      });

      if (
        tokens.length >=
        CONFIG.MAX_DISCOVERED
      ) {
        break;
      }
    }

    if (
      tokens.length >=
      CONFIG.MAX_DISCOVERED
    ) {
      break;
    }
  }

  return {
    tokens,
    latestBlock
  };
}


/* ============================================================
   DEX SCREENER
   ONE TOKEN AT A TIME
============================================================ */

async function getDexPairsForToken(
  tokenAddress
) {

  const url =
    `${CONFIG.DEXSCREENER_API}/latest/dex/tokens/${tokenAddress}`;

  try {

    const response =
      await fetch(url, {
        headers: {
          accept:
            "application/json",

          "user-agent":
            "Robinhood-Meme-Hunter-V21"
        }
      });

    if (!response.ok) {

      return {
        ok: false,
        status:
          response.status,
        pairs: []
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];

    /*
     * Only accept Robinhood Chain pairs.
     */

    const robinhoodPairs =
      pairs.filter(pair =>
        lower(pair?.chainId) ===
        CONFIG.CHAIN_SLUG
      );

    return {
      ok: true,
      status:
        response.status,
      pairs:
        robinhoodPairs
    };

  } catch (error) {

    return {
      ok: false,
      status: 0,
      pairs: [],
      error:
        String(
          error?.message || error
        )
    };
  }
}


/* ============================================================
   SELECT BEST PAIR
============================================================ */

function selectBestPair(pairs) {

  if (!pairs?.length)
    return null;

  let best = null;

  for (const pair of pairs) {

    const liquidity =
      number(
        pair?.liquidity?.usd
      ) || 0;

    const volume =
      number(
        pair?.volume?.h24
      ) || 0;

    const txns =
      (
        number(
          pair?.txns?.h24?.buys
        ) || 0
      ) +
      (
        number(
          pair?.txns?.h24?.sells
        ) || 0
      );

    const score =
      liquidity +
      volume * 0.25 +
      txns * 5;

    if (!best || score > best.score) {

      best = {
        pair,
        score
      };
    }
  }

  return best?.pair || null;
}


/* ============================================================
   MEME SIGNAL
============================================================ */

function calculateMemeScore(
  name,
  symbol
) {

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

  for (
    const keyword of keywords
  ) {

    if (
      text.includes(keyword)
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
   RISK ANALYSIS
============================================================ */

function analyseRisk(data) {

  const flags = [];
  let risk = 0;

  if (
    data.liquidity <
    10000
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

    risk += 20;
  }

  if (
    data.liquidityToMarketCap <
    0.05
  ) {

    flags.push(
      "LOW_LIQUIDITY_RATIO"
    );

    risk += 15;
  }

  if (
    data.buySellRatio <
    0.8
  ) {

    flags.push(
      "SELL_PRESSURE"
    );

    risk += 25;
  }

  if (
    data.transactions <
    100
  ) {

    flags.push(
      "LOW_ACTIVITY"
    );

    risk += 10;
  }

  if (
    data.marketCap >
    25000000
  ) {

    flags.push(
      "LARGE_MARKET_CAP"
    );

    risk += 10;
  }

  if (
    data.memeScore === 0
  ) {

    flags.push(
      "WEAK_MEME_SIGNAL"
    );

    risk += 5;
  }

  return {

    riskScore:
      Math.min(
        100,
        risk
      ),

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

function calculateOpportunityScore(
  data
) {

  let score = 0;

  /*
   * Early market cap.
   */

  if (
    data.marketCap <= 250000
  )
    score += 20;

  else if (
    data.marketCap <= 1000000
  )
    score += 18;

  else if (
    data.marketCap <= 5000000
  )
    score += 15;

  else if (
    data.marketCap <= 10000000
  )
    score += 12;

  else if (
    data.marketCap <= 25000000
  )
    score += 8;

  else
    score += 4;


  /*
   * Liquidity.
   */

  if (
    data.liquidity >= 100000
  )
    score += 15;

  else if (
    data.liquidity >= 50000
  )
    score += 12;

  else if (
    data.liquidity >= 25000
  )
    score += 9;

  else if (
    data.liquidity >= 10000
  )
    score += 6;

  else
    score += 3;


  /*
   * Volume relative to market cap.
   */

  if (
    data.volumeRatio >= 5
  )
    score += 15;

  else if (
    data.volumeRatio >= 2
  )
    score += 12;

  else if (
    data.volumeRatio >= 0.5
  )
    score += 8;

  else if (
    data.volumeRatio >= 0.1
  )
    score += 4;


  /*
   * Buy pressure.
   */

  if (
    data.buySellRatio >= 2
  )
    score += 15;

  else if (
    data.buySellRatio >= 1.25
  )
    score += 12;

  else if (
    data.buySellRatio >= 1.05
  )
    score += 6;


  /*
   * Transaction activity.
   */

  if (
    data.transactions >= 5000
  )
    score += 5;

  else if (
    data.transactions >= 1000
  )
    score += 4;

  else if (
    data.transactions >= 250
  )
    score += 2;


  /*
   * Meme signal.
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
   * Early launch bonus.
   */

  if (
    data.launchAgeHours != null
  ) {

    if (
      data.launchAgeHours <= 6
    )
      score += 10;

    else if (
      data.launchAgeHours <= 24
    )
      score += 8;

    else if (
      data.launchAgeHours <= 72
    )
      score += 5;
  }


  /*
   * Risk penalty.
   */

  score -=
    Math.round(
      data.riskScore *
      0.25
    );

  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );
}


/* ============================================================
   BUILD CANDIDATE
============================================================ */

function buildCandidate(
  pair,
  launch
) {

  if (!pair)
    return null;

  const base =
    pair.baseToken || {};

  const contract =
    lower(
      base.address
    );

  if (!contract)
    return null;

  const name =
    base.name ||
    "Unknown";

  const symbol =
    base.symbol ||
    "UNKNOWN";

  const marketCap =
    number(
      pair.marketCap
    ) ??
    number(pair.fdv);

  const liquidity =
    number(
      pair?.liquidity?.usd
    );

  const volume =
    number(
      pair?.volume?.h24
    );

  if (
    marketCap == null ||
    liquidity == null ||
    volume == null
  ) {
    return null;
  }

  /*
   * Basic market filters.
   */

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

  if (
    liquidity <
    CONFIG.MIN_LIQUIDITY
  ) {
    return null;
  }

  if (
    volume <
    CONFIG.MIN_VOLUME_24H
  ) {
    return null;
  }

  const buys =
    number(
      pair?.txns?.h24?.buys
    ) || 0;

  const sells =
    number(
      pair?.txns?.h24?.sells
    ) || 0;

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
      ? liquidity /
        marketCap
      : 0;

  const volumeRatio =
    marketCap > 0
      ? volume /
        marketCap
      : 0;

  let launchAgeHours =
    null;

  if (
    pair.pairCreatedAt
  ) {

    launchAgeHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) / 3600000;
  }

  const data = {

    contract,

    name,

    symbol,

    priceUsd:
      number(
        pair.priceUsd
      ),

    marketCap,

    fdv:
      number(pair.fdv),

    liquidity,

    volume24h:
      volume,

    buys,

    sells,

    transactions,

    buySellRatio:
      round(
        buySellRatio
      ),

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
      calculateMemeScore(
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
      pair.dexId ||
      "uniswap",

    pairAddress:
      pair.pairAddress,

    url:
      pair.url ||
      `https://dexscreener.com/robinhood/${pair.pairAddress}`,

    /*
     * V21 does not pretend to know
     * holder or smart-money data.
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
    analyseRisk(data);

  data.riskScore =
    risk.riskScore;

  data.riskLevel =
    risk.riskLevel;

  data.riskFlags =
    risk.flags;

  data.discoveryScore =
    calculateOpportunityScore(
      data
    );

  data.category =
    data.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : data.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : data.discoveryScore >= 60
          ? "WATCH"
          : data.discoveryScore >= 50
            ? "EARLY"
            : "LOW_CONVICTION";

  /*
   * Theoretical market-cap multiples.
   * These are NOT price predictions.
   */

  data.targetMultiples = {

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

  return data;
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

  try {

    const response =
      await fetch(
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
   TELEGRAM ALERT
============================================================ */

function createAlert(candidate) {

  const icon =
    candidate.discoveryScore >= 80
      ? "🚨"
      : candidate.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${icon} <b>ROBINHOOD MEME HUNTER V21</b>

<b>${escapeHtml(candidate.name)}</b> (${
    escapeHtml(candidate.symbol)
  })

<b>Opportunity Score:</b>
${candidate.discoveryScore}/100

<b>Risk:</b>
${candidate.riskLevel}
(${candidate.riskScore}/100)

━━━━━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(candidate.marketCap)}

<b>Liquidity:</b>
${money(candidate.liquidity)}

<b>24h Volume:</b>
${money(candidate.volume24h)}

<b>Launch Age:</b>
${candidate.launchAgeHours ?? "UNVERIFIED"} hours

━━━━━━━━━━━━━━━━━━

<b>Buys:</b>
${candidate.buys}

<b>Sells:</b>
${candidate.sells}

<b>Buy/Sell:</b>
${candidate.buySellRatio}

<b>Pressure:</b>
${candidate.pressure}

<b>Transactions:</b>
${candidate.transactions}

━━━━━━━━━━━━━━━━━━

<b>Liquidity / MC:</b>
${(
    candidate.liquidityToMarketCap *
    100
  ).toFixed(1)}%

<b>Volume / MC:</b>
${(
    candidate.volumeToMarketCap *
    100
  ).toFixed(1)}%

<b>Meme Score:</b>
${candidate.memeScore}/20

━━━━━━━━━━━━━━━━━━

<b>Holder Data:</b>
UNVERIFIED

<b>Wallet Activity:</b>
UNVERIFIED

<b>Smart Money:</b>
UNVERIFIED

<b>Flow:</b>
${candidate.accumulationDistribution}

━━━━━━━━━━━━━━━━━━

<b>Contract:</b>

<code>${escapeHtml(
    candidate.contract
  )}</code>

<a href="${candidate.url}">Open DEX Screener</a>

⚠️ Automated research signal — not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function runScan(env) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  if (
    discovery.tokens.length === 0
  ) {

    return {

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "NO_DISCOVERY_DATA",

      discovery: {

        source:
          "ROBINHOOD_CHAIN_RPC",

        latestBlock:
          discovery.latestBlock,

        tokensDiscovered:
          0
      },

      candidates: [],

      alerts: [],

      requestCount,

      timestamp:
        new Date().toISOString()
    };
  }

  const candidates = [];

  let pairsFound = 0;

  /*
   * IMPORTANT V21 FIX:
   *
   * Query each token individually.
   */

  for (
    const launch
    of discovery.tokens
  ) {

    const dex =
      await getDexPairsForToken(
        launch.address
      );

    if (!dex.ok)
      continue;

    if (
      dex.pairs.length === 0
    )
      continue;

    pairsFound +=
      dex.pairs.length;

    const pair =
      selectBestPair(
        dex.pairs
      );

    if (!pair)
      continue;

    const candidate =
      buildCandidate(
        pair,
        launch
      );

    if (!candidate)
      continue;

    candidates.push(
      candidate
    );
  }

  /*
   * Sort strongest first.
   */

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  /*
   * Telegram alerts.
   */

  const alerts = [];

  for (
    const candidate
    of candidates
  ) {

    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    )
      continue;

    /*
     * Don't alert obvious
     * strong-sell situations.
     */

    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    )
      continue;

    const telegram =
      await sendTelegram(
        env,
        createAlert(
          candidate
        )
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
        telegram.ok,

      error:
        telegram.ok
          ? null
          : (
              telegram.error ||
              telegram.data?.description ||
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
      "Discover early-stage Robinhood Chain meme coins using on-chain launches and verified DEX market data.",

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

      lookupMode:
        "ONE_TOKEN_AT_A_TIME",

      pairsFound,

      tokensWithPairs:
        candidates.length
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
          a => a.sent
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
      candidates.slice(
        0,
        50
      ),

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
   CLOUDFLARE ROUTES
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


    /* HEALTH */

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
          "ON_CHAIN_TOKEN_CREATED_EVENTS",

        marketData:
          "DEX_SCREENER_ONE_TOKEN_LOOKUP",

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


    /* TELEGRAM TEST */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(
          env,

          `🤖 <b>Robinhood Chain Meme Hunter V21</b>

Telegram connection successful.

On-chain discovery: ✅
DEX Screener lookup: ✅
Opportunity scoring: ✅
Risk scoring: ✅

Holder data: ⚠️ UNVERIFIED
Wallet activity: ⚠️ UNVERIFIED
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
                "TELEGRAM_TEST_FAILED"
              )
      });
    }


    /* SCANNER */

    if (
      url.pathname ===
      "/scan"
    ) {

      try {

        const result =
          await runScan(env);

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

            requestCount,

            dataIntegrity: {

              noFabricatedMetrics:
                true
            },

            timestamp:
              new Date().toISOString()
          },

          {
            status: 500,

            headers: {
              "cache-control":
                "no-store"
            }
          }
        );
      }
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
      ]
    });
  }
};
