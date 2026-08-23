/**
 * ROBINHOOD CHAIN MEME HUNTER
 * V20
 *
 * Discovery:
 *   Robinhood Chain RPC
 *      ↓
 *   TokenCreated events
 *      ↓
 *   DEX Screener market data
 *      ↓
 *   Momentum / liquidity / buy-sell analysis
 *      ↓
 *   Risk analysis
 *      ↓
 *   Telegram alerts
 *
 * Required Cloudflare secrets:
 *
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_CHAT_ID
 *
 * No Alchemy API key required.
 */

const CONFIG = {

  VERSION: "V20",

  CHAIN_ID: 4663,

  CHAIN_NAME: "Robinhood Chain",

  RPC:
    "https://rpc.mainnet.chain.robinhood.com",

  DEXSCREENER:
    "https://api.dexscreener.com",

  CHAIN_SLUG:
    "robinhood",

  WETH:
    "0x0bd7d308f8e1639fab988df18a8011f41eacad73",

  USDG:
    "0x5fc5360d0400a0fd4f2af552add042d716f1d168",

  LAUNCHERS: [

    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",

    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"

  ],

  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  LOG_CHUNKS: 8,

  BLOCKS_PER_CHUNK: 5000,

  MAX_TOKENS: 100,

  MIN_LIQUIDITY: 10000,

  MIN_VOLUME_24H: 5000,

  MIN_MARKET_CAP: 10000,

  MAX_MARKET_CAP: 50000000,

  ALERT_SCORE: 70

};


let requestCount = 0;


/* ============================================================
   RPC
============================================================ */

async function rpc(method, params = []) {

  requestCount++;

  try {

    const response = await fetch(

      CONFIG.RPC,

      {

        method: "POST",

        headers: {

          "content-type": "application/json",

          "accept": "application/json"

        },

        body: JSON.stringify({

          jsonrpc: "2.0",

          id: requestCount,

          method,

          params

        })

      }

    );


    if (!response.ok) {

      return {

        ok: false,

        error:
          `RPC_HTTP_${response.status}`

      };

    }


    const data = await response.json();


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

  }

  catch (error) {

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
   HELPERS
============================================================ */

function hexToNumber(hex) {

  if (!hex) return 0;

  return parseInt(hex, 16);

}


function addressFromTopic(topic) {

  if (!topic) return null;

  return (
    "0x" +
    topic
      .replace(/^0x/, "")
      .slice(-40)
  ).toLowerCase();

}


function number(value) {

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


function money(value) {

  if (
    value === null ||
    value === undefined
  ) {

    return "N/A";

  }

  if (value >= 1000000) {

    return (
      "$" +
      (value / 1000000).toFixed(2) +
      "M"
    );

  }

  if (value >= 1000) {

    return (
      "$" +
      (value / 1000).toFixed(1) +
      "K"
    );

  }

  return "$" + value.toFixed(2);

}


function escapeHtml(value) {

  return String(value ?? "")

    .replaceAll("&", "&amp;")

    .replaceAll("<", "&lt;")

    .replaceAll(">", "&gt;")

    .replaceAll('"', "&quot;");

}


/* ============================================================
   DISCOVER TOKEN CREATION EVENTS
============================================================ */

async function discoverLaunches() {

  const latestResult =
    await rpc("eth_blockNumber");


  if (!latestResult.ok) {

    return {

      tokens: [],

      error:
        latestResult.error

    };

  }


  const latestBlock =
    hexToNumber(
      latestResult.result
    );


  const tokens = [];

  const seen = new Set();


  for (
    let i = 0;

    i < CONFIG.LOG_CHUNKS;

    i++
  ) {

    const toBlock =
      latestBlock -
      (
        i *
        CONFIG.BLOCKS_PER_CHUNK
      );


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


    if (!result.ok) {

      continue;

    }


    const logs =
      Array.isArray(result.result)
        ? result.result
        : [];


    for (const log of logs) {

      if (
        !log.topics ||
        !log.topics[1]
      ) {

        continue;

      }


      const token =
        addressFromTopic(
          log.topics[1]
        );


      if (!token) continue;


      if (
        token === CONFIG.WETH ||
        token === CONFIG.USDG
      ) {

        continue;

      }


      if (seen.has(token)) {

        continue;

      }


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
      ) {

        break;

      }

    }


    if (
      tokens.length >=
      CONFIG.MAX_TOKENS
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
============================================================ */

async function getMarketData(addresses) {

  if (!addresses.length) {

    return [];

  }


  const results = [];


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


    const url =
      `${CONFIG.DEXSCREENER}` +
      `/latest/dex/tokens/` +
      batch.join(",");


    try {

      const response =
        await fetch(

          url,

          {

            headers: {

              "accept":
                "application/json",

              "user-agent":
                "Robinhood-Meme-Hunter-V20"

            }

          }

        );


      if (!response.ok) {

        continue;

      }


      const data =
        await response.json();


      const pairs =
        Array.isArray(data?.pairs)
          ? data.pairs
          : [];


      results.push(
        ...pairs
      );

    }

    catch {

      continue;

    }

  }


  return results;

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


  for (
    const keyword
    of keywords
  ) {

    if (
      text.includes(keyword)
    ) {

      score += 4;

    }

  }


  return Math.min(
    score,
    20
  );

}


/* ============================================================
   EXCLUDED TOKENS
============================================================ */

function excludedToken(
  name,
  symbol,
  address
) {

  const text =
    `${name || ""} ${symbol || ""}`
      .toLowerCase();


  const excluded = [

    "wrapped ether",
    "usd coin",
    "usdc",
    "usdt",
    "usdg",
    "tether",
    "stock",
    "tokenized",
    "etf",
    "treasury",
    "index",
    "nasdaq",
    "sp500",
    "s&p"

  ];


  for (
    const item
    of excluded
  ) {

    if (
      text.includes(item)
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

    ].includes(

      String(symbol || "")
        .toLowerCase()

    )

  ) {

    return true;

  }


  return (

    address === CONFIG.WETH ||
    address === CONFIG.USDG

  );

}


/* ============================================================
   RISK ANALYSIS
============================================================ */

function riskAnalysis(data) {

  const flags = [];

  let riskScore = 0;


  /*
   * Liquidity risk
   */

  if (
    data.liquidity < 15000
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

    riskScore += 20;

  }


  /*
   * Liquidity / market cap
   */

  if (
    data.liquidityToMarketCap < 0.05
  ) {

    flags.push(
      "LOW_LIQUIDITY_RATIO"
    );

    riskScore += 15;

  }


  /*
   * Sell pressure
   */

  if (
    data.buySellRatio < 0.80
  ) {

    flags.push(
      "STRONG_SELL_PRESSURE"
    );

    riskScore += 25;

  }


  /*
   * Weak trading activity
   */

  if (
    data.transactions < 100
  ) {

    flags.push(
      "LOW_TRANSACTION_ACTIVITY"
    );

    riskScore += 10;

  }


  /*
   * Very high valuation
   */

  if (
    data.marketCap > 25000000
  ) {

    flags.push(
      "LATE_STAGE_VALUATION"
    );

    riskScore += 10;

  }


  /*
   * Weak meme signal
   */

  if (
    data.memeScore === 0
  ) {

    flags.push(
      "WEAK_MEME_SIGNAL"
    );

    riskScore += 5;

  }


  /*
   * Extreme buy/sell ratio.
   *
   * This is NOT automatically bullish.
   */

  if (
    data.buySellRatio >= 5
  ) {

    flags.push(
      "EXTREME_BUY_SELL_IMBALANCE"
    );

  }


  return {

    riskScore:
      Math.min(
        100,
        riskScore
      ),

    riskLevel:
      riskScore >= 50
        ? "HIGH"
        : riskScore >= 25
          ? "MEDIUM"
          : "LOW",

    flags

  };

}


/* ============================================================
   SCORE
============================================================ */

function calculateScore(data) {

  let score = 0;


  /*
   * Early market cap
   */

  if (
    data.marketCap <= 250000
  ) {

    score += 20;

  }

  else if (
    data.marketCap <= 1000000
  ) {

    score += 18;

  }

  else if (
    data.marketCap <= 5000000
  ) {

    score += 15;

  }

  else if (
    data.marketCap <= 10000000
  ) {

    score += 12;

  }

  else if (
    data.marketCap <= 25000000
  ) {

    score += 8;

  }

  else {

    score += 4;

  }


  /*
   * Liquidity
   */

  if (
    data.liquidity >= 100000
  ) {

    score += 15;

  }

  else if (
    data.liquidity >= 50000
  ) {

    score += 12;

  }

  else if (
    data.liquidity >= 25000
  ) {

    score += 9;

  }

  else if (
    data.liquidity >= 10000
  ) {

    score += 5;

  }


  /*
   * Volume / MC
   */

  if (
    data.volumeRatio >= 5
  ) {

    score += 15;

  }

  else if (
    data.volumeRatio >= 2
  ) {

    score += 12;

  }

  else if (
    data.volumeRatio >= 0.5
  ) {

    score += 8;

  }

  else if (
    data.volumeRatio >= 0.1
  ) {

    score += 4;

  }


  /*
   * Buy / sell
   */

  if (
    data.buySellRatio >= 2
  ) {

    score += 15;

  }

  else if (
    data.buySellRatio >= 1.25
  ) {

    score += 12;

  }

  else if (
    data.buySellRatio >= 1.05
  ) {

    score += 6;

  }


  /*
   * Transactions
   */

  if (
    data.transactions >= 5000
  ) {

    score += 5;

  }

  else if (
    data.transactions >= 1000
  ) {

    score += 4;

  }

  else if (
    data.transactions >= 250
  ) {

    score += 2;

  }


  /*
   * Meme signal
   */

  score +=
    Math.min(
      15,
      Math.round(
        data.memeScore * 0.75
      )
    );


  /*
   * Very early launch bonus
   */

  if (
    data.launchAgeHours !== null
  ) {

    if (
      data.launchAgeHours <= 6
    ) {

      score += 10;

    }

    else if (
      data.launchAgeHours <= 24
    ) {

      score += 8;

    }

    else if (
      data.launchAgeHours <= 72
    ) {

      score += 5;

    }

  }


  /*
   * Risk penalty
   */

  score -=
    Math.round(
      data.riskScore * 0.25
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
   ANALYSE PAIR
============================================================ */

function analysePair(pair, launch) {

  if (!pair) return null;


  if (
    String(pair.chainId || "")
      .toLowerCase() !==
    CONFIG.CHAIN_SLUG
  ) {

    return null;

  }


  const base =
    pair.baseToken || {};


  const address =
    String(
      base.address || ""
    ).toLowerCase();


  const name =
    base.name || "Unknown";


  const symbol =
    base.symbol || "UNKNOWN";


  if (!address) return null;


  if (
    excludedToken(
      name,
      symbol,
      address
    )
  ) {

    return null;

  }


  const marketCap =
    number(pair.marketCap) ??
    number(pair.fdv);


  const liquidity =
    number(pair?.liquidity?.usd);


  const volume =
    number(pair?.volume?.h24);


  const buys =
    number(pair?.txns?.h24?.buys) || 0;


  const sells =
    number(pair?.txns?.h24?.sells) || 0;


  if (
    marketCap === null ||
    liquidity === null ||
    volume === null
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


  if (
    pair.pairCreatedAt
  ) {

    launchAgeHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) /
      3600000;

  }


  const data = {

    contract: address,

    name,

    symbol,

    priceUsd:
      number(pair.priceUsd),

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
        buySellRatio,
        2
      ),

    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.80
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

    memeScore:
      memeScore(
        name,
        symbol
      ),

    launchAgeHours:
      launchAgeHours !== null
        ? round(
            launchAgeHours,
            1
          )
        : null,

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

      `https://dexscreener.com/robinhood/${pair.pairAddress}`

  };


  /*
   * Wallet/holder data is deliberately marked
   * unverified until we have a reliable source.
   */

  data.walletActivity =
    "UNVERIFIED";


  data.smartMoney =
    "UNVERIFIED";


  data.holderConcentration =
    "UNVERIFIED";


  data.accumulationDistribution =
    buySellRatio >= 1.25
      ? "BUY_PRESSURE_ONLY"
      : buySellRatio <= 0.80
        ? "SELL_PRESSURE_ONLY"
        : "NEUTRAL";


  const risk =
    riskAnalysis(data);


  data.riskScore =
    risk.riskScore;


  data.riskLevel =
    risk.riskLevel;


  data.riskFlags =
    risk.flags;


  data.discoveryScore =
    calculateScore(data);


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


  data.targetMultiples = {

    to100M:
      round(
        100000000 /
        marketCap,
        2
      ),

    to250M:
      round(
        250000000 /
        marketCap,
        2
      ),

    to500M:
      round(
        500000000 /
        marketCap,
        2
      )

  };


  return data;

}


/* ============================================================
   TELEGRAM
============================================================ */

async function sendTelegram(
  env,
  text
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

        `https://api.telegram.org/bot` +
        `${env.TELEGRAM_BOT_TOKEN}` +
        `/sendMessage`,

        {

          method: "POST",

          headers: {

            "content-type":
              "application/json"

          },

          body:
            JSON.stringify({

              chat_id:
                env.TELEGRAM_CHAT_ID,

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
   TELEGRAM ALERT
============================================================ */

function buildAlert(token) {

  const emoji =
    token.discoveryScore >= 80
      ? "🚨"
      : token.discoveryScore >= 70
        ? "🔥"
        : "👀";


  return `

${emoji} <b>ROBINHOOD MEME HUNTER V20</b>

<b>${escapeHtml(
    token.name
  )}</b> (${
    escapeHtml(
      token.symbol
    )
  })

<b>Potential Score:</b>
${token.discoveryScore}/100

<b>Risk:</b>
${token.riskLevel}
(${token.riskScore}/100)

━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(token.marketCap)}

<b>Liquidity:</b>
${money(token.liquidity)}

<b>24h Volume:</b>
${money(token.volume24h)}

<b>Age:</b>
${token.launchAgeHours ?? "UNVERIFIED"} hours

━━━━━━━━━━━━━━

<b>Buys:</b>
${token.buys}

<b>Sells:</b>
${token.sells}

<b>Buy/Sell:</b>
${token.buySellRatio}

<b>Pressure:</b>
${token.pressure}

<b>Transactions:</b>
${token.transactions}

━━━━━━━━━━━━━━

<b>Liquidity / MC:</b>
${(
    token.liquidityToMarketCap *
    100
  ).toFixed(1)}%

<b>Volume / MC:</b>
${(
    token.volumeToMarketCap *
    100
  ).toFixed(1)}%

<b>Meme Score:</b>
${token.memeScore}/20

<b>Accumulation:</b>
${token.accumulationDistribution}

━━━━━━━━━━━━━━

<b>Holder data:</b>
UNVERIFIED

<b>Wallet activity:</b>
UNVERIFIED

<b>Smart money:</b>
UNVERIFIED

━━━━━━━━━━━━━━

<b>Theoretical market-cap multiples</b>

$100M → ${token.targetMultiples.to100M}x

$250M → ${token.targetMultiples.to250M}x

$500M → ${token.targetMultiples.to500M}x

━━━━━━━━━━━━━━

<b>Contract</b>

<code>${escapeHtml(
    token.contract
  )}</code>

<a href="${
    token.url
  }">DEX Screener</a>

⚠️ Automated research signal — not financial advice.

`.trim();

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
          discovery.latestBlock ||
          null,

        tokensDiscovered:
          0

      },

      candidates: [],

      alerts: [],

      requestCount,

      rpcError:
        discovery.error ||
        null,

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


  for (
    const pair
    of pairs
  ) {

    const address =
      String(
        pair?.baseToken?.address ||
        ""
      ).toLowerCase();


    if (!address) continue;


    const existing =
      bestPairs.get(address);


    const liquidity =
      number(
        pair?.liquidity?.usd
      ) || 0;


    const existingLiquidity =
      number(
        existing?.liquidity?.usd
      ) || 0;


    if (
      !existing ||
      liquidity >
      existingLiquidity
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


    if (!candidate) continue;


    candidates.push(
      candidate
    );

  }


  candidates.sort(

    (a, b) =>
      b.discoveryScore -
      a.discoveryScore

  );


  const alerts = [];


  /*
   * Alert only high potential tokens.
   *
   * Don't alert obvious sell-pressure tokens.
   */

  for (
    const candidate
    of candidates
  ) {

    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    ) {

      continue;

    }


    if (
      candidate.riskFlags.includes(
        "STRONG_SELL_PRESSURE"
      )
    ) {

      continue;

    }


    const result =
      await sendTelegram(

        env,

        buildAlert(
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
        "DEX_SCREEENER",

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
        "BUY/SELL FLOW ONLY — NOT WALLET VERIFIED"

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
   WORKER ROUTES
============================================================ */

export default {

  async fetch(request, env) {

    const url =
      new URL(request.url);


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
          "DEX_SCREENER",

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

          `
🤖 <b>Robinhood Chain Meme Hunter V20</b>

Telegram connection successful.

On-chain discovery:
✅ ENABLED

Market data:
✅ ENABLED

Risk scoring:
✅ ENABLED

Holder/smart-money data:
⚠️ UNVERIFIED
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


    /* SCAN */

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


    /* ROOT */

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
