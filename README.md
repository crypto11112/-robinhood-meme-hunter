/**
 * Robinhood Chain Meme Hunter V33
 *
 * KV-FREE / ULTRA-LOW-RPC
 *
 * Routes:
 *   GET /health
 *   GET /scan
 *   GET /test-telegram
 *   GET /reset
 *
 * Required Worker secrets:
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *
 * No KV binding required.
 *
 * IMPORTANT:
 * - This Worker does not fabricate holder, smart-money or wallet metrics.
 * - RPC 429s are treated as temporary failures.
 * - /scan intentionally uses a very small RPC budget.
 */
const VERSION = "V33";
const CHAIN_ID = 4663;
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const DEX_URL = "https://api.dexscreener.com/latest/dex/tokens/";
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";
const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9",
];
const MAX_RPC_REQUESTS = 4;
const MAX_DEX_REQUESTS = 2;
const RECENT_BLOCKS = 100;
const MAX_LOG_RANGE = 100;
const TELEGRAM_BOT_TOKEN = "TELEGRAM_BOT_TOKEN";
const TELEGRAM_CHAT_ID = "TELEGRAM_CHAT_ID";
/*
 * Memory cursor.
 *
 * This deliberately does NOT use KV.
 * Cloudflare may reset this between isolates/deployments.
 */
let memoryCursor = null;
let lastScan = {
  timestamp: null,
  result: null,
};
function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
function now() {
  return new Date().toISOString();
}
function errorText(value) {
  if (!value) return "UNKNOWN_ERROR";
  if (typeof value === "string") {
    return value.slice(0, 500);
  }
  try {
    return JSON.stringify(value).slice(0, 500);
  } catch {
    return String(value).slice(0, 500);
  }
}
function isRateLimited(status, body = "") {
  return (
    status === 429 ||
    /too many requests|rate.?limit|rate_limited/i.test(body)
  );
}
async function rpcCall(method, params) {
  const body = JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method,
    params,
  });
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
    });
    const text = await response.text();
    if (!response.ok) {
      const err = new Error(
        isRateLimited(response.status, text)
          ? "RPC_RATE_LIMITED"
          : `RPC_HTTP_${response.status}`
      );
      err.status = response.status;
      err.body = text.slice(0, 500);
      throw err;
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("RPC_INVALID_JSON");
    }
    if (data.error) {
      const err = new Error(
        data.error.code === 429
          ? "RPC_RATE_LIMITED"
          : data.error.message || "RPC_ERROR"
      );
      err.code = data.error.code;
      throw err;
    }
    return data.result;
  } catch (error) {
    throw error;
  }
}
async function getLatestBlock() {
  return rpcCall("eth_blockNumber", []);
}
function hexBlock(number) {
  return "0x" + Number(number).toString(16);
}
async function getLogs(contract, fromBlock, toBlock) {
  return rpcCall("eth_getLogs", [
    {
      address: contract,
      fromBlock: hexBlock(fromBlock),
      toBlock: hexBlock(toBlock),
      topics: [TOKEN_CREATED_TOPIC],
    },
  ]);
}
function extractAddressFromLog(log) {
  if (!log) return null;
  /*
   * TokenCreated(address) may encode the token address
   * in topic[1] or in data depending on implementation.
   */
  if (Array.isArray(log.topics) && log.topics.length > 1) {
    const topic = log.topics[1];
    if (
      typeof topic === "string" &&
      topic.length >= 42
    ) {
      return "0x" + topic.slice(-40).toLowerCase();
    }
  }
  if (typeof log.data === "string" && log.data.length >= 66) {
    const value = log.data.slice(-40);
    if (/^[0-9a-fA-F]{40}$/.test(value)) {
      return "0x" + value.toLowerCase();
    }
  }
  return null;
}
async function getTokenMetadata(address) {
  /*
   * ERC-20 calls are intentionally avoided during the initial
   * discovery phase to keep RPC usage extremely low.
   *
   * Metadata will come from DEX Screener where available.
   */
  return {
    address,
    verified: true,
  };
}
async function lookupDex(address) {
  const url =
    DEX_URL + encodeURIComponent(address);
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`DEX_HTTP_${response.status}`);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("DEX_INVALID_JSON");
  }
  return data;
}
function scorePair(pair) {
  if (!pair) return 0;
  let score = 0;
  const liquidity =
    Number(pair.liquidity?.usd || 0);
  const volume24 =
    Number(pair.volume?.h24 || 0);
  const txns =
    Number(pair.txns?.h24?.buys || 0) +
    Number(pair.txns?.h24?.sells || 0);
  const buys =
    Number(pair.txns?.h24?.buys || 0);
  const sells =
    Number(pair.txns?.h24?.sells || 0);
  /*
   * This is deliberately a simple screening score,
   * NOT an investment prediction.
   */
  if (liquidity >= 1000) score += 20;
  if (liquidity >= 5000) score += 15;
  if (liquidity >= 10000) score += 15;
  if (volume24 >= 1000) score += 10;
  if (volume24 >= 10000) score += 10;
  if (volume24 >= 50000) score += 10;
  if (txns >= 20) score += 5;
  if (txns >= 100) score += 5;
  if (buys > sells) score += 10;
  return Math.min(score, 100);
}
function chooseBestPair(pairs) {
  if (!Array.isArray(pairs) || pairs.length === 0) {
    return null;
  }
  return [...pairs].sort(
    (a, b) => scorePair(b) - scorePair(a)
  )[0];
}
function buildCandidate(token, dexData) {
  const pairs = Array.isArray(dexData?.pairs)
    ? dexData.pairs
    : [];
  const pair = chooseBestPair(pairs);
  if (!pair) {
    return {
      token,
      pairFound: false,
      score: 0,
      liquidityUsd: 0,
      volume24h: 0,
      buys24h: 0,
      sells24h: 0,
      url: null,
    };
  }
  const buys =
    Number(pair.txns?.h24?.buys || 0);
  const sells =
    Number(pair.txns?.h24?.sells || 0);
  return {
    token,
    pairFound: true,
    chainId: pair.chainId || null,
    dexId: pair.dexId || null,
    name:
      pair.baseToken?.name ||
      pair.baseToken?.symbol ||
      "Unknown",
    symbol:
      pair.baseToken?.symbol ||
      null,
    score: scorePair(pair),
    priceUsd:
      pair.priceUsd || null,
    marketCap:
      pair.marketCap || null,
    fdv:
      pair.fdv || null,
    liquidityUsd:
      Number(pair.liquidity?.usd || 0),
    volume24h:
      Number(pair.volume?.h24 || 0),
    buys24h: buys,
    sells24h: sells,
    pairCreatedAt:
      pair.pairCreatedAt || null,
    url:
      pair.url ||
      null,
  };
}
function shouldAlert(candidate) {
  if (!candidate?.pairFound) return false;
  /*
   * Conservative early-stage filter.
   *
   * This is not a guarantee of quality.
   */
  return (
    candidate.score >= 40 &&
    candidate.liquidityUsd >= 1000 &&
    candidate.volume24h >= 1000 &&
    candidate.buys24h > 0
  );
}
async function sendTelegram(env, text) {
  const token = env[TELEGRAM_BOT_TOKEN];
  const chatId = env[TELEGRAM_CHAT_ID];
  if (!token || !chatId) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
    };
  }
  const url =
    `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    }),
  });
  const textBody = await response.text();
  if (!response.ok) {
    return {
      sent: false,
      status: response.status,
      error: textBody.slice(0, 500),
    };
  }
  let data;
  try {
    data = JSON.parse(textBody);
  } catch {
    data = null;
  }
  return {
    sent: true,
    messageId: data?.result?.message_id || null,
  };
}
function formatAlert(candidate) {
  return [
    `🚨 ROBINHOOD CHAIN MEME ALERT ${VERSION}`,
    ``,
    `${candidate.name || "Unknown"} ${candidate.symbol ? `$${candidate.symbol}` : ""}`,
    ``,
    `Contract:`,
    candidate.token,
    ``,
    `Score: ${candidate.score}/100`,
    `Liquidity: $${Math.round(candidate.liquidityUsd).toLocaleString()}`,
    `24h Volume: $${Math.round(candidate.volume24h).toLocaleString()}`,
    `24h Buys: ${candidate.buys24h}`,
    `24h Sells: ${candidate.sells24h}`,
    ``,
    candidate.url
      ? `DEX: ${candidate.url}`
      : "",
    ``,
    `⚠️ Early-stage screening only. Not financial advice.`,
  ]
    .filter(Boolean)
    .join("\n");
}
async function performScan(env) {
  const diagnostics = [];
  let rpcRequests = 0;
  let dexRequests = 0;
  let latestBlock;
  try {
    rpcRequests++;
    latestBlock =
      parseInt(await getLatestBlock(), 16);
  } catch (error) {
    return {
      status: "RPC_UNAVAILABLE",
      rpcRequests,
      dexRequests,
      diagnostics: [
        {
          type: "rpc",
          method: "eth_blockNumber",
          error: errorText(error),
          timestamp: now(),
        },
      ],
    };
  }
  /*
   * Memory cursor:
   * - On first run scan only a tiny recent window.
   * - On subsequent runs continue from the previous cursor.
   */
  let startBlock;
  if (
    Number.isInteger(memoryCursor) &&
    memoryCursor < latestBlock
  ) {
    startBlock = memoryCursor;
  } else {
    startBlock =
      Math.max(
        0,
        latestBlock - RECENT_BLOCKS
      );
  }
  const endBlock =
    Math.min(
      latestBlock,
      startBlock + RECENT_BLOCKS
    );
  const logs = [];
  /*
   * Only one launch contract is queried per scan
   * to keep RPC usage extremely low.
   *
   * Alternate contracts on future scans using the cursor.
   */
  const contractIndex =
    Math.floor(endBlock / RECENT_BLOCKS) %
    LAUNCH_CONTRACTS.length;
  const contract =
    LAUNCH_CONTRACTS[contractIndex];
  try {
    rpcRequests++;
    const result =
      await getLogs(
        contract,
        startBlock,
        endBlock
      );
    if (Array.isArray(result)) {
      logs.push(...result);
    }
  } catch (error) {
    diagnostics.push({
      type: "rpc",
      method: "eth_getLogs",
      contract,
      fromBlock: startBlock,
      toBlock: endBlock,
      error:
        error.message === "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : errorText(error),
      status:
        error.status || null,
      timestamp: now(),
    });
    /*
     * Do NOT recursively split the range.
     *
     * V32's recursive range splitting was one of the
     * reasons it burned through the Cloudflare budget.
     */
    return {
      status:
        error.message === "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",
      latestBlock,
      startBlock,
      endBlock,
      blocksScanned:
        endBlock - startBlock + 1,
      contract,
      rpcRequests,
      dexRequests,
      tokensDiscovered: 0,
      diagnostics,
    };
  }
  /*
   * Advance the cursor only after successful eth_getLogs.
   */
  memoryCursor = endBlock + 1;
  const tokenAddresses = [
    ...new Set(
      logs
        .map(extractAddressFromLog)
        .filter(Boolean)
    ),
  ];
  const candidates = [];
  /*
   * Very small DEX budget.
   */
  for (
    const address of tokenAddresses.slice(0, MAX_DEX_REQUESTS)
  ) {
    if (dexRequests >= MAX_DEX_REQUESTS) break;
    try {
      dexRequests++;
      const dexData =
        await lookupDex(address);
      const candidate =
        buildCandidate(
          address,
          dexData
        );
      candidates.push(candidate);
    } catch (error) {
      diagnostics.push({
        type: "dex",
        token: address,
        error: errorText(error),
        timestamp: now(),
      });
    }
  }
  const alerts = [];
  for (const candidate of candidates) {
    if (shouldAlert(candidate)) {
      const message =
        formatAlert(candidate);
      const telegram =
        await sendTelegram(env, message);
      alerts.push({
        token: candidate.token,
        score: candidate.score,
        telegram,
      });
    }
  }
  return {
    status: "OK",
    latestBlock,
    startBlock,
    endBlock,
    blocksScanned:
      endBlock - startBlock + 1,
    contract,
    rawLogs: logs.length,
    tokensDiscovered:
      tokenAddresses.length,
    tokenAddresses,
    candidates,
    alerts,
    rpcRequests,
    dexRequests,
    requestsUsed:
      rpcRequests + dexRequests,
    requestBudget:
      MAX_RPC_REQUESTS + MAX_DEX_REQUESTS,
    diagnostics,
  };
}
async function health(env) {
  return {
    agent: "Robinhood Chain Meme Hunter",
    version: VERSION,
    status: "ONLINE",
    routes: [
      "/health",
      "/scan",
      "/test-telegram",
      "/reset",
    ],
    chainId: CHAIN_ID,
    chain: "Robinhood Chain",
    rpc: {
      primary: RPC_URL,
      mode: "PRIMARY_ONLY_ULTRA_LOW_REQUEST",
    },
    discovery:
      "ETH_GETLOGS_TOKEN_CREATED_ULTRA_LOW_RPC",
    marketData:
      "DEX_SCREENER_BATCH",
    telegramConfigured:
      Boolean(
        env[TELEGRAM_BOT_TOKEN] &&
        env[TELEGRAM_CHAT_ID]
      ),
    kvConfigured: false,
    cursor:
      memoryCursor,
    cron:
      "OPTIONAL",
    paidApiKeyRequired: false,
    cloudflareSafeBudget:
      MAX_RPC_REQUESTS +
      MAX_DEX_REQUESTS,
    timestamp: now(),
  };
}
export default {
  async fetch(request, env, ctx) {
    const url =
      new URL(request.url);
    const path =
      url.pathname.replace(/\/+$/, "") ||
      "/";
    if (path === "/health") {
      return json(
        await health(env)
      );
    }
    if (path === "/scan") {
      const result =
        await performScan(env);
      lastScan = {
        timestamp: now(),
        result,
      };
      return json({
        agent:
          "Robinhood Chain Meme Hunter",
        version: VERSION,
        success:
          result.status === "OK",
        scan: result,
        timestamp: now(),
      });
    }
    if (path === "/test-telegram") {
      const result =
        await sendTelegram(
          env,
          `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${now()}`
        );
      return json({
        agent:
          "Robinhood Chain Meme Hunter",
        version: VERSION,
        telegramConfigured:
          Boolean(
            env[TELEGRAM_BOT_TOKEN] &&
            env[TELEGRAM_CHAT_ID]
          ),
        success:
          result.sent === true,
        response: result,
        timestamp: now(),
      });
    }
    if (path === "/reset") {
      memoryCursor = null;
      lastScan = {
        timestamp: null,
        result: null,
      };
      return json({
        agent:
          "Robinhood Chain Meme Hunter",
        version: VERSION,
        success: true,
        message:
          "In-memory cursor reset. No KV was used.",
        timestamp: now(),
      });
    }
    return json({
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      status: "ONLINE",
      routes: [
        "/health",
        "/scan",
        "/test-telegram",
        "/reset",
      ],
      message:
        "Robinhood Chain Meme Hunter V33",
    });
  },
  async scheduled(event, env, ctx) {
    /*
     * Cron support.
     *
     * Configure the cron in Cloudflare separately.
     *
     * The scan itself remains KV-free.
     */
    ctx.waitUntil(
      performScan(env)
        .then(result => {
          lastScan = {
            timestamp: now(),
            result,
          };
        })
        .catch(() => {})
    );
  },
};
