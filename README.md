const VERSION = "V33";

const CHAIN_ID = 4663;
const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const DEX_URL = "https://api.dexscreener.com/latest/dex/tokens/";

const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

// Extremely small request budget.
// This avoids the Cloudflare subrequest problem from V30/V31.
const MAX_RPC_REQUESTS = 4;
const MAX_DEX_REQUESTS = 2;
const RECENT_BLOCKS = 100;

const TELEGRAM_BOT_TOKEN = "TELEGRAM_BOT_TOKEN";
const TELEGRAM_CHAT_ID = "TELEGRAM_CHAT_ID";

// No KV.
// Cursor only exists for the lifetime of the Worker isolate.
let memoryCursor = null;

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function now() {
  return new Date().toISOString();
}

function hexBlock(number) {
  return "0x" + Number(number).toString(16);
}

function errorText(error) {
  if (!error) return "UNKNOWN_ERROR";

  if (typeof error === "string") {
    return error.slice(0, 500);
  }

  return String(error.message || error).slice(0, 500);
}

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  const text = await response.text();

  if (!response.ok) {
    const error = new Error(
      response.status === 429
        ? "RPC_RATE_LIMITED"
        : `RPC_HTTP_${response.status}`
    );

    error.status = response.status;
    error.body = text.slice(0, 500);

    throw error;
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("RPC_INVALID_JSON");
  }

  if (data.error) {
    const error = new Error(
      data.error.message || "RPC_ERROR"
    );

    error.code = data.error.code;

    if (data.error.code === 429) {
      error.message = "RPC_RATE_LIMITED";
    }

    throw error;
  }

  return data.result;
}

async function latestBlock() {
  return parseInt(
    await rpc("eth_blockNumber", []),
    16
  );
}

async function getLogs(
  contract,
  fromBlock,
  toBlock
) {
  return rpc("eth_getLogs", [
    {
      address: contract,
      fromBlock: hexBlock(fromBlock),
      toBlock: hexBlock(toBlock),
      topics: [TOKEN_CREATED_TOPIC]
    }
  ]);
}

function extractToken(log) {
  if (!log) return null;

  // Indexed address.
  if (
    Array.isArray(log.topics) &&
    log.topics.length > 1
  ) {
    const topic = log.topics[1];

    if (
      typeof topic === "string" &&
      topic.length >= 42
    ) {
      return (
        "0x" +
        topic.slice(-40).toLowerCase()
      );
    }
  }

  // Address contained in event data.
  if (
    typeof log.data === "string" &&
    log.data.length >= 66
  ) {
    const value = log.data.slice(-40);

    if (/^[0-9a-fA-F]{40}$/.test(value)) {
      return "0x" + value.toLowerCase();
    }
  }

  return null;
}

async function dexLookup(address) {
  const response = await fetch(
    DEX_URL + encodeURIComponent(address),
    {
      headers: {
        accept: "application/json"
      }
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `DEX_HTTP_${response.status}`
    );
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("DEX_INVALID_JSON");
  }
}

function score(pair) {
  if (!pair) return 0;

  const liquidity =
    Number(pair.liquidity?.usd || 0);

  const volume =
    Number(pair.volume?.h24 || 0);

  const buys =
    Number(pair.txns?.h24?.buys || 0);

  const sells =
    Number(pair.txns?.h24?.sells || 0);

  let points = 0;

  if (liquidity >= 1000) points += 20;
  if (liquidity >= 5000) points += 15;
  if (liquidity >= 10000) points += 15;

  if (volume >= 1000) points += 10;
  if (volume >= 10000) points += 10;
  if (volume >= 50000) points += 10;

  if (buys + sells >= 20) points += 5;
  if (buys + sells >= 100) points += 5;

  if (buys > sells) points += 10;

  return Math.min(points, 100);
}

function bestPair(pairs) {
  if (!Array.isArray(pairs)) {
    return null;
  }

  return [...pairs].sort(
    (a, b) => score(b) - score(a)
  )[0] || null;
}

function candidate(address, data) {
  const pair = bestPair(data?.pairs);

  if (!pair) {
    return {
      token: address,
      pairFound: false,
      score: 0,
      liquidityUsd: 0,
      volume24h: 0,
      buys24h: 0,
      sells24h: 0,
      url: null
    };
  }

  return {
    token: address,
    pairFound: true,

    name:
      pair.baseToken?.name ||
      "Unknown",

    symbol:
      pair.baseToken?.symbol ||
      null,

    chainId:
      pair.chainId || null,

    dexId:
      pair.dexId || null,

    score:
      score(pair),

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

    buys24h:
      Number(pair.txns?.h24?.buys || 0),

    sells24h:
      Number(pair.txns?.h24?.sells || 0),

    pairCreatedAt:
      pair.pairCreatedAt || null,

    url:
      pair.url || null
  };
}

function alertCandidate(c) {
  return (
    c.pairFound &&
    c.score >= 40 &&
    c.liquidityUsd >= 1000 &&
    c.volume24h >= 1000 &&
    c.buys24h > 0
  );
}

async function telegram(env, message) {
  const token =
    env[TELEGRAM_BOT_TOKEN];

  const chat =
    env[TELEGRAM_CHAT_ID];

  if (!token || !chat) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED"
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: chat,
        text: message,
        disable_web_page_preview: true
      })
    }
  );

  const text = await response.text();

  if (!response.ok) {
    return {
      sent: false,
      status: response.status,
      error: text.slice(0, 500)
    };
  }

  let data = null;

  try {
    data = JSON.parse(text);
  } catch {}

  return {
    sent: true,
    messageId:
      data?.result?.message_id || null
  };
}

function alertMessage(c) {
  return [
    `🚨 ROBINHOOD CHAIN MEME ALERT ${VERSION}`,
    "",
    `${c.name || "Unknown"} ${
      c.symbol ? "$" + c.symbol : ""
    }`,
    "",
    `Contract:`,
    c.token,
    "",
    `Score: ${c.score}/100`,
    `Liquidity: $${Math.round(
      c.liquidityUsd
    ).toLocaleString()}`,
    `24h Volume: $${Math.round(
      c.volume24h
    ).toLocaleString()}`,
    `24h Buys: ${c.buys24h}`,
    `24h Sells: ${c.sells24h}`,
    "",
    c.url ? `DEX: ${c.url}` : "",
    "",
    "⚠️ Early-stage screening only. Not financial advice."
  ]
    .filter(Boolean)
    .join("\n");
}

async function scan(env) {
  let rpcRequests = 0;
  let dexRequests = 0;

  const diagnostics = [];

  let latest;

  // RPC request #1
  try {
    rpcRequests++;
    latest = await latestBlock();
  } catch (error) {
    return {
      status:
        error.message === "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_UNAVAILABLE",

      rpcRequests,
      dexRequests,

      diagnostics: [
        {
          type: "rpc",
          method: "eth_blockNumber",
          error: errorText(error),
          status:
            error.status || null,
          timestamp: now()
        }
      ]
    };
  }

  let start;

  if (
    Number.isInteger(memoryCursor) &&
    memoryCursor < latest
  ) {
    start = memoryCursor;
  } else {
    start =
      Math.max(
        0,
        latest - RECENT_BLOCKS
      );
  }

  const end =
    Math.min(
      latest,
      start + RECENT_BLOCKS
    );

  /*
   * Alternate between the two known launch contracts.
   * Only ONE eth_getLogs request is made.
   */

  const index =
    Math.floor(end / RECENT_BLOCKS) %
    LAUNCH_CONTRACTS.length;

  const contract =
    LAUNCH_CONTRACTS[index];

  let logs = [];

  // RPC request #2
  try {
    rpcRequests++;

    const result =
      await getLogs(
        contract,
        start,
        end
      );

    if (Array.isArray(result)) {
      logs = result;
    }

  } catch (error) {
    diagnostics.push({
      type: "rpc",
      method: "eth_getLogs",
      contract,
      fromBlock: start,
      toBlock: end,
      error: errorText(error),
      status:
        error.status || null,
      timestamp: now()
    });

    return {
      status:
        error.message === "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      latestBlock: latest,

      startBlock: start,
      endBlock: end,

      blocksScanned:
        end - start + 1,

      contract,

      rawLogs: 0,
      tokensDiscovered: 0,

      rpcRequests,
      dexRequests,

      diagnostics
    };
  }

  /*
   * Only advance cursor after a successful RPC.
   */

  memoryCursor = end + 1;

  const tokens = [
    ...new Set(
      logs
        .map(extractToken)
        .filter(Boolean)
    )
  ];

  const candidates = [];

  /*
   * Maximum two DEX requests.
   */

  for (
    const token of tokens.slice(
      0,
      MAX_DEX_REQUESTS
    )
  ) {
    if (
      dexRequests >=
      MAX_DEX_REQUESTS
    ) {
      break;
    }

    try {
      dexRequests++;

      const data =
        await dexLookup(token);

      candidates.push(
        candidate(token, data)
      );

    } catch (error) {
      diagnostics.push({
        type: "dex",
        token,
        error: errorText(error),
        timestamp: now()
      });
    }
  }

  const alerts = [];

  for (const c of candidates) {
    if (!alertCandidate(c)) {
      continue;
    }

    const result =
      await telegram(
        env,
        alertMessage(c)
      );

    alerts.push({
      token: c.token,
      score: c.score,
      telegram: result
    });
  }

  return {
    status: "OK",

    latestBlock: latest,

    startBlock: start,
    endBlock: end,

    blocksScanned:
      end - start + 1,

    contract,

    rawLogs: logs.length,

    tokensDiscovered:
      tokens.length,

    tokenAddresses: tokens,

    candidates,

    alerts,

    rpcRequests,
    dexRequests,

    requestsUsed:
      rpcRequests + dexRequests,

    requestBudget:
      MAX_RPC_REQUESTS +
      MAX_DEX_REQUESTS,

    diagnostics
  };
}

function health(env) {
  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version: VERSION,

    status: "ONLINE",

    routes: [
      "/health",
      "/scan",
      "/test-telegram",
      "/reset"
    ],

    chainId: CHAIN_ID,

    chain:
      "Robinhood Chain",

    rpc: {
      primary: RPC_URL,
      mode:
        "PRIMARY_ONLY_ULTRA_LOW_REQUEST"
    },

    discovery:
      "ETH_GETLOGS_TOKEN_CREATED_V33",

    marketData:
      "DEX_SCREENER",

    telegramConfigured:
      Boolean(
        env[TELEGRAM_BOT_TOKEN] &&
        env[TELEGRAM_CHAT_ID]
      ),

    kvConfigured: false,

    cursor: memoryCursor,

    cron: "OPTIONAL",

    paidApiKeyRequired: false,

    cloudflareSafeBudget:
      MAX_RPC_REQUESTS +
      MAX_DEX_REQUESTS,

    timestamp: now()
  };
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    const path =
      url.pathname.replace(
        /\/+$/,
        ""
      ) || "/";

    if (path === "/health") {
      return json(
        health(env)
      );
    }

    if (path === "/scan") {
      const result =
        await scan(env);

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version: VERSION,

        success:
          result.status === "OK",

        scan: result,

        timestamp: now()
      });
    }

    if (
      path === "/test-telegram"
    ) {
      const result =
        await telegram(
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

        timestamp: now()
      });
    }

    if (path === "/reset") {
      memoryCursor = null;

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version: VERSION,

        success: true,

        message:
          "V33 memory cursor reset. No KV required.",

        timestamp: now()
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
        "/reset"
      ],

      message:
        "Robinhood Chain Meme Hunter V33"
    });
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      scan(env).catch(
        () => {}
      )
    );
  }
};
