const VERSION = "V36";

const CHAIN_ID = 4663;
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

const TOKEN_CREATED_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

/*
 * TokenCreated(address)
 *
 * IMPORTANT:
 * This is the event signature used by the existing
 * V34/V35 scanner that successfully discovered tokens.
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
 * TokenLaunched event.
 *
 * We keep this separate from TokenCreated because a
 * token can be created before the pool-launch event.
 */
const TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

/*
 * Keep the RPC window conservative.
 */
const BLOCK_WINDOW = 500;

/*
 * Never make more than two external market-data
 * lookups per scan.
 */
const MAX_MARKET_LOOKUPS = 2;

/*
 * Telegram alert threshold.
 *
 * A real v4 pool starts with 60 points.
 * This means a verified launch can trigger,
 * while an unverified token cannot.
 */
const TELEGRAM_MIN_SCORE = 60;

/*
 * Prevent excessively long Telegram messages.
 */
const MAX_MESSAGE_LENGTH = 3900;

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}

function normaliseAddress(value) {
  if (
    typeof value !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(value)
  ) {
    return null;
  }

  return value.toLowerCase();
}

function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(value => value.toLowerCase())
    )
  ];
}

async function rpc(method, params) {
  const response = await fetch(
    RPC_URL,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    }
  );

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RPC_RATE_LIMITED");
    }

    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("RPC_INVALID_JSON");
  }

  if (data.error) {
    const message =
      data.error.message || "RPC_ERROR";

    if (
      data.error.code === 429 ||
      /rate.?limit|too many/i.test(message)
    ) {
      throw new Error("RPC_RATE_LIMITED");
    }

    throw new Error(message);
  }

  return data.result;
}

function blockHex(number) {
  return "0x" + number.toString(16);
}

async function getLatestBlock() {
  const result = await rpc(
    "eth_blockNumber",
    []
  );

  return parseInt(result, 16);
}

/*
 * RPC discovery call #1
 */
async function getTokenCreatedLogs(
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address: TOKEN_CREATED_CONTRACTS,
      fromBlock: blockHex(fromBlock),
      toBlock: blockHex(toBlock),
      topics: [
        TOKEN_CREATED_TOPIC
      ]
    }]
  );
}

/*
 * RPC discovery call #2
 */
async function getTokenLaunchedLogs(
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address: LAUNCHPAD_CONTRACTS,
      fromBlock: blockHex(fromBlock),
      toBlock: blockHex(toBlock),
      topics: [
        TOKEN_LAUNCHED_TOPIC
      ]
    }]
  );
}

function topicAddress(topic) {
  if (
    typeof topic !== "string" ||
    topic.length !== 66
  ) {
    return null;
  }

  return normaliseAddress(
    "0x" + topic.slice(-40)
  );
}

function extractCreatedToken(log) {
  if (
    Array.isArray(log.topics) &&
    log.topics.length >= 2
  ) {
    const address =
      topicAddress(log.topics[1]);

    if (address) {
      return address;
    }
  }

  if (
    typeof log.data === "string" &&
    log.data.length >= 66
  ) {
    const address =
      normaliseAddress(
        "0x" + log.data.slice(-40)
      );

    if (address) {
      return address;
    }
  }

  return null;
}

function readWord(data, index) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return null;
  }

  const start =
    2 + index * 64;

  const word =
    data.slice(start, start + 64);

  if (word.length !== 64) {
    return null;
  }

  return word;
}

function readAddress(data, index) {
  const word =
    readWord(data, index);

  if (!word) {
    return null;
  }

  return normaliseAddress(
    "0x" + word.slice(-40)
  );
}

function readUint(data, index) {
  const word =
    readWord(data, index);

  if (!word) {
    return null;
  }

  try {
    return Number(
      BigInt("0x" + word)
    );
  } catch {
    return null;
  }
}

/*
 * Decode the v4 pool information exposed
 * by the TokenLaunched event.
 */
function parseTokenLaunched(log) {
  if (
    !Array.isArray(log.topics) ||
    log.topics.length < 3
  ) {
    return null;
  }

  const poolId =
    typeof log.topics[1] === "string"
      ? log.topics[1].toLowerCase()
      : null;

  const token =
    topicAddress(log.topics[2]);

  const currency0 =
    readAddress(log.data, 0);

  const currency1 =
    readAddress(log.data, 1);

  const fee =
    readUint(log.data, 2);

  const tickSpacing =
    readUint(log.data, 3);

  const hooks =
    readAddress(log.data, 4);

  if (!token) {
    return null;
  }

  return {
    token,
    poolId,
    currency0,
    currency1,
    fee,
    tickSpacing,
    hooks,
    launchpad:
      normaliseAddress(log.address),
    blockNumber:
      log.blockNumber || null,
    transactionHash:
      log.transactionHash || null,
    logIndex:
      log.logIndex || null
  };
}

function isNativeEthPool(pool) {
  return (
    pool &&
    (
      pool.currency0 === ZERO_ADDRESS ||
      pool.currency1 === ZERO_ADDRESS
    )
  );
}

function calculatePoolScore(pool) {
  let score = 0;

  if (!pool) {
    return 0;
  }

  /*
   * TokenLaunched gives us a verified pool.
   */
  if (pool.poolId) {
    score += 40;
  }

  /*
   * Native ETH is the expected pools.trade
   * quote currency.
   */
  if (isNativeEthPool(pool)) {
    score += 15;
  }

  /*
   * Current pools.trade path.
   */
  if (pool.tickSpacing === 25) {
    score += 10;
  }

  /*
   * Original pools.trade path.
   */
  if (pool.tickSpacing === 60) {
    score += 5;
  }

  /*
   * 0.25% fee.
   */
  if (pool.fee === 2500) {
    score += 10;
  }

  /*
   * No hook.
   */
  if (pool.hooks === ZERO_ADDRESS) {
    score += 10;
  }

  return Math.min(score, 90);
}

async function getDexData(token) {
  const response =
    await fetch(
      "https://api.dexscreener.com/latest/dex/tokens/" +
      token,
      {
        headers: {
          "accept": "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `DEXSCREENER_HTTP_${response.status}`
    );
  }

  return response.json();
}

function chooseBestDexPair(data) {
  const pairs =
    Array.isArray(data?.pairs)
      ? data.pairs
      : [];

  if (!pairs.length) {
    return null;
  }

  /*
   * Prefer highest reported liquidity.
   */
  return [...pairs].sort(
    (a, b) =>
      Number(
        b?.liquidity?.usd || 0
      ) -
      Number(
        a?.liquidity?.usd || 0
      )
  )[0];
}

function analyseDexPair(pair) {
  if (!pair) {
    return {
      pairFound: false,
      verified: false
    };
  }

  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );

  const volume =
    Number(
      pair?.volume?.h24 || 0
    );

  const buys =
    Number(
      pair?.txns?.h24?.buys || 0
    );

  const sells =
    Number(
      pair?.txns?.h24?.sells || 0
    );

  return {
    pairFound: true,
    verified: true,

    name:
      pair?.baseToken?.name || null,

    symbol:
      pair?.baseToken?.symbol || null,

    priceUsd:
      pair?.priceUsd || null,

    marketCap:
      pair?.marketCap || null,

    fdv:
      pair?.fdv || null,

    liquidityUsd:
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    buySellRatio:
      sells > 0
        ? Number(
            (
              buys / sells
            ).toFixed(2)
          )
        : null,

    dexId:
      pair?.dexId || null,

    pairAddress:
      pair?.pairAddress || null,

    url:
      pair?.url || null
  };
}

function calculateMarketScore(market) {
  let score = 0;

  if (!market?.pairFound) {
    return 0;
  }

  const liquidity =
    Number(
      market.liquidityUsd || 0
    );

  const volume =
    Number(
      market.volume24h || 0
    );

  const buys =
    Number(
      market.buys24h || 0
    );

  const sells =
    Number(
      market.sells24h || 0
    );

  /*
   * Liquidity.
   */
  if (liquidity >= 1000) {
    score += 5;
  }

  if (liquidity >= 5000) {
    score += 5;
  }

  if (liquidity >= 10000) {
    score += 5;
  }

  /*
   * Trading activity.
   */
  if (volume >= 1000) {
    score += 5;
  }

  if (volume >= 10000) {
    score += 5;
  }

  /*
   * Buy pressure.
   */
  if (
    buys > sells &&
    buys > 0
  ) {
    score += 5;
  }

  return Math.min(score, 30);
}

function formatMoney(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(
      Number(value)
    )
  ) {
    return "UNVERIFIED";
  }

  const number =
    Number(value);

  if (number >= 1000000) {
    return (
      "$" +
      (
        number / 1000000
      ).toFixed(2) +
      "M"
    );
  }

  if (number >= 1000) {
    return (
      "$" +
      (
        number / 1000
      ).toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    number.toFixed(2)
  );
}

function shortAddress(address) {
  if (
    typeof address !== "string" ||
    address.length < 12
  ) {
    return address || "UNKNOWN";
  }

  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );
}

function buildTelegramMessage(candidate) {
  const pool =
    candidate.pool;

  const market =
    candidate.market;

  const score =
    candidate.score;

  const lines = [
    "🚨 ROBINHOOD MEME CALL — V36",
    "",
    `🔥 ${candidate.symbol ? "$" + candidate.symbol : "NEW TOKEN"}`,
    `Score: ${score}/100`,
    "",
    `Contract: ${candidate.token}`,
    "",
    "🦄 UNISWAP V4",
    `Pool: ${pool?.poolId ? "✅ VERIFIED" : "❌ NOT VERIFIED"}`,
    `ETH Pair: ${isNativeEthPool(pool) ? "✅" : "UNVERIFIED"}`,
    `Tick spacing: ${pool?.tickSpacing ?? "UNVERIFIED"}`,
    `Fee: ${
      pool?.fee !== null &&
      pool?.fee !== undefined
        ? (pool.fee / 10000).toFixed(2) + "%"
        : "UNVERIFIED"
    }`,
    "",
    "📊 MARKET DATA",
    `Liquidity: ${formatMoney(market?.liquidityUsd)}`,
    `24h Volume: ${formatMoney(market?.volume24h)}`,
    `Buys: ${market?.buys24h ?? "UNVERIFIED"}`,
    `Sells: ${market?.sells24h ?? "UNVERIFIED"}`,
    `Market Cap: ${formatMoney(market?.marketCap)}`,
    "",
    "🎯 WHY IT TRIGGERED",
    "• Newly discovered Robinhood Chain token",
    "• Verified Uniswap v4 launch pool",
    isNativeEthPool(pool)
      ? "• Native ETH trading pair confirmed"
      : "• ETH pairing unverified",
    market?.liquidityUsd > 0
      ? "• Liquidity detected"
      : "• Liquidity unverified",
    market?.buys24h > market?.sells24h
      ? "• Buy pressure currently exceeds sells"
      : "• Buy pressure not confirmed",
    "",
    "⚠️ VERY EARLY / HIGH RISK",
    "This is an automated discovery alert, not a guarantee of performance.",
    "",
    `TX: ${candidate.transactionHash || "UNVERIFIED"}`,
    "",
    `#RobinhoodChain #MemeCoin #V36`
  ];

  let message =
    lines.join("\n");

  if (
    message.length >
    MAX_MESSAGE_LENGTH
  ) {
    message =
      message.slice(
        0,
        MAX_MESSAGE_LENGTH - 20
      ) +
      "\n\n[V36 TRUNCATED]";
  }

  return message;
}

async function sendTelegram(
  env,
  message
) {
  if (
    !env.TELEGRAM_BOT_TOKEN
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
    };
  }

  if (
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_CHAT_ID_NOT_CONFIGURED"
    };
  }

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

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
                env.TELEGRAM_CHAT_ID,

              text:
                message,

              disable_web_page_preview:
                true
            })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        sent: false,

        reason:
          data?.description ||
          `TELEGRAM_HTTP_${response.status}`
      };
    }

    return {
      sent: true,

      messageId:
        data?.result?.message_id ||
        null
    };
  } catch (error) {
    return {
      sent: false,

      reason:
        error?.message ||
        "TELEGRAM_FETCH_ERROR"
    };
  }
}

async function runScan(env) {
  const diagnostics = [];

  let latestBlock;

  try {
    latestBlock =
      await getLatestBlock();
  } catch (error) {
    return {
      status:
        error.message ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      telegram: {
        sent: false,
        reason:
          "SCAN_FAILED_BEFORE_TELEGRAM"
      },

      diagnostics: [{
        method:
          "eth_blockNumber",

        error:
          error.message
      }]
    };
  }

  const startBlock =
    Math.max(
      0,
      latestBlock -
        BLOCK_WINDOW +
        1
    );

  const endBlock =
    latestBlock;

  let createdLogs = [];

  let launchedLogs = [];

  /*
   * RPC #2
   */
  try {
    createdLogs =
      await getTokenCreatedLogs(
        startBlock,
        endBlock
      );
  } catch (error) {
    return {
      status:
        error.message ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      latestBlock,

      startBlock,

      endBlock,

      telegram: {
        sent: false,
        reason:
          "TOKEN_DISCOVERY_FAILED"
      },

      diagnostics: [{
        method:
          "eth_getLogs_tokenCreated",

        error:
          error.message
      }]
    };
  }

  /*
   * RPC #3
   */
  try {
    launchedLogs =
      await getTokenLaunchedLogs(
        startBlock,
        endBlock
      );
  } catch (error) {
    diagnostics.push({
      method:
        "eth_getLogs_tokenLaunched",

      error:
        error.message
    });
  }

  const createdTokens =
    unique(
      createdLogs.map(
        extractCreatedToken
      )
    );

  const launchedPools =
    launchedLogs
      .map(
        parseTokenLaunched
      )
      .filter(Boolean);

  const poolsByToken =
    new Map();

  for (
    const pool of launchedPools
  ) {
    if (
      !poolsByToken.has(
        pool.token
      )
    ) {
      poolsByToken.set(
        pool.token,
        pool
      );
    }
  }

  /*
   * Include tokens discovered
   * through either route.
   */
  const allTokens =
    unique([
      ...createdTokens,
      ...launchedPools.map(
        pool => pool.token
      )
    ]);

  const candidates = [];

  /*
   * Only enrich two tokens per scan.
   */
  const enrichmentTokens =
    allTokens
      .filter(
        token =>
          poolsByToken.has(token)
      )
      .slice(
        0,
        MAX_MARKET_LOOKUPS
      );

  for (
    const token of enrichmentTokens
  ) {
    const pool =
      poolsByToken.get(token);

    let market = {
      pairFound: false,
      verified: false
    };

    let marketError = null;

    /*
     * DEX Screener is enrichment only.
     * Discovery does NOT depend on it.
     */
    try {
      const dexData =
        await getDexData(token);

      const pair =
        chooseBestDexPair(
          dexData
        );

      market =
        analyseDexPair(
          pair
        );
    } catch (error) {
      marketError =
        error.message;

      diagnostics.push({
        type:
          "market_data",

        token,

        error:
          error.message
      });
    }

    const poolScore =
      calculatePoolScore(
        pool
      );

    const marketScore =
      calculateMarketScore(
        market
      );

    const score =
      Math.min(
        100,
        poolScore +
          marketScore
      );

    const candidate = {
      token,

      symbol:
        market?.symbol ||
        null,

      name:
        market?.name ||
        null,

      score,

      pool,

      market: {
        ...market,

        error:
          marketError
      },

      transactionHash:
        pool.transactionHash,

      discoveredAtBlock:
        pool.blockNumber,

      validation: {
        token:
          "VERIFIED",

        v4Pool:
          pool.poolId
            ? "VERIFIED"
            : "UNVERIFIED",

        liquidity:
          market?.liquidityUsd !==
          undefined
            ? "DEXSCREENER"
            : "UNVERIFIED",

        volume:
          market?.volume24h !==
          undefined
            ? "DEXSCREENER"
            : "UNVERIFIED",

        holders:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        walletActivity:
          "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED"
      }
    };

    candidates.push(
      candidate
    );
  }

  /*
   * Tokens with no TokenLaunched event
   * are still returned, but NEVER become
   * Telegram calls.
   */
  for (
    const token of allTokens
  ) {
    if (
      !poolsByToken.has(token)
    ) {
      candidates.push({
        token,

        score: 0,

        pool: null,

        market: {
          pairFound: false,
          verified: false
        },

        validation: {
          token:
            "VERIFIED_FROM_TOKEN_CREATED",

          v4Pool:
            "NOT_VERIFIED",

          liquidity:
            "UNVERIFIED",

          volume:
            "UNVERIFIED",

          holders:
            "UNVERIFIED",

          smartMoney:
            "UNVERIFIED",

          walletActivity:
            "UNVERIFIED",

          accumulationDistribution:
            "UNVERIFIED"
        }
      });
    }
  }

  candidates.sort(
    (a, b) =>
      Number(
        b.score || 0
      ) -
      Number(
        a.score || 0
      )
  );

  /*
   * TELEGRAM ALERT
   *
   * This is the important V36 change.
   */
  let telegram = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  const qualifying =
    candidates.find(
      candidate =>
        candidate.pool &&
        candidate.pool.poolId &&
        Number(candidate.score) >=
          TELEGRAM_MIN_SCORE
    );

  if (qualifying) {
    const message =
      buildTelegramMessage(
        qualifying
      );

    telegram =
      await sendTelegram(
        env,
        message
      );

    /*
     * Never hide which candidate
     * generated the alert.
     */
    telegram.token =
      qualifying.token;

    telegram.score =
      qualifying.score;
  }

  return {
    status: "OK",

    latestBlock,

    startBlock,

    endBlock,

    blocksScanned:
      endBlock -
      startBlock +
      1,

    rawTokenLogs:
      createdLogs.length,

    rawPoolLogs:
      launchedLogs.length,

    tokensDiscovered:
      allTokens.length,

    poolsDiscovered:
      launchedPools.length,

    tokensWithV4Pools:
      allTokens.filter(
        token =>
          poolsByToken.has(token)
      ).length,

    tokens,

    candidates,

    telegram,

    telegramThreshold:
      TELEGRAM_MIN_SCORE,

    rpcRequests:
      3,

    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs_tokenCreated:
        1,

      eth_getLogs_tokenLaunched:
        1
    },

    externalMarketLookups:
      enrichmentTokens.length,

    maximumMarketLookups:
      MAX_MARKET_LOOKUPS,

    diagnostics,

    chainId:
      CHAIN_ID,

    kvRequired:
      false,

    dataIntegrity: {
      noFabricatedMetrics:
        true,

      holderConcentration:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      accumulationDistribution:
        "UNVERIFIED"
    },

    timestamp:
      new Date().toISOString()
  };
}

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

    const path =
      url.pathname;

    /*
     * HEALTH
     */
    if (
      path === "/health"
    ) {
      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        status:
          "ONLINE",

        routes: [
          "/health",
          "/scan",
          "/test-telegram"
        ],

        chain: {
          name:
            "Robinhood Chain",

          chainId:
            CHAIN_ID,

          rpc:
            RPC_URL
        },

        discovery:
          "TOKEN_CREATED_PLUS_TOKEN_LAUNCHED",

        poolManager:
          POOL_MANAGER,

        launchpadContracts:
          LAUNCHPAD_CONTRACTS,

        marketData:
          "DEX_SCREENER_ENRICHMENT",

        telegram:
          {
            configured:
              Boolean(
                env.TELEGRAM_BOT_TOKEN &&
                env.TELEGRAM_CHAT_ID
              ),

            automaticCalls:
              true,

            minimumScore:
              TELEGRAM_MIN_SCORE
          },

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "ULTRA_LOW_RPC_NO_KV",

        rpcBudget:
          "3 BASE RPC REQUESTS",

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * SCAN
     */
    if (
      path === "/scan"
    ) {
      const scan =
        await runScan(
          env
        );

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          scan.status === "OK",

        scan,

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * TELEGRAM TEST
     */
    if (
      path ===
      "/test-telegram"
    ) {
      const result =
        await sendTelegram(
          env,

          `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
        );

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          result.sent,

        response:
          result,

        timestamp:
          new Date().toISOString()
      });
    }

    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "ONLINE",

      routes: [
        "/health",
        "/scan",
        "/test-telegram"
      ]
    });
  },

  /*
   * CRON
   *
   * Cloudflare invokes this handler
   * when a Cron Trigger fires.
   */
  async scheduled(
    event,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScan(env)
        .catch(
          () => {}
        )
    );
  }
};
