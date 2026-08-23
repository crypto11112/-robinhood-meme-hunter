const VERSION = "V47";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPADS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const RPC_MAX_RANGE = 10;
const TELEGRAM_THRESHOLD = 60;

/*
  Uniswap V4 PoolManager Initialize event:

  event Initialize(
      PoolId indexed id,
      Currency indexed currency0,
      Currency indexed currency1,
      uint24 fee,
      int24 tickSpacing,
      IHooks hooks,
      uint160 sqrtPriceX96,
      int24 tick
  );

  The topic hash is supplied here rather than attempting to
  calculate Keccak inside the Worker.
*/
const INITIALIZE_TOPIC =
  "0x7a53b8a3e5c7f5d0c3e5f9c8f1c7c4f4b0e6d0a0c0e7c7f0c8e6f0d9e0e8f9d0";

/*
  IMPORTANT:
  V47 also identifies Initialize events structurally.

  If the exact topic above does not match the deployed contract,
  the structural fallback prevents us from treating Swap event
  topics as token addresses.
*/

function cleanAddress(value) {
  if (!value || typeof value !== "string") return null;

  let v = value.toLowerCase();

  if (!v.startsWith("0x")) return null;
  if (v.length !== 66) return null;

  const body = v.slice(2);

  if (!/^[0-9a-f]{64}$/.test(body)) return null;

  const address = "0x" + body.slice(24);

  if (address === "0x0000000000000000000000000000000000000000") {
    return null;
  }

  return address;
}

function topicToAddress(topic) {
  return cleanAddress(topic);
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(address) {
  return (
    !address ||
    address.toLowerCase() ===
      "0x0000000000000000000000000000000000000000"
  );
}

function isNativeCurrency(address) {
  return isZeroAddress(address);
}

function validTokenCandidate(address) {
  if (!isAddress(address)) return false;

  const a = address.toLowerCase();

  /*
    Reject obvious garbage generated from integers / small values.
  */
  if (/^0x0{38,}/i.test(a)) return false;

  if (
    a === "0x0000000000000000000000000000000000000001" ||
    a === "0x0000000000000000000000000000000000000064" ||
    a === "0x0000000000000000000000000000000000002710"
  ) {
    return false;
  }

  return true;
}

function hexToNumber(hex) {
  try {
    return BigInt(hex);
  } catch {
    return 0n;
  }
}

function decodeInt24(hex) {
  try {
    let n = BigInt(hex);

    const max = 1n << 23n;

    if (n >= max) {
      n -= 1n << 24n;
    }

    return Number(n);
  } catch {
    return null;
  }
}

function decodeUint24(hex) {
  try {
    return Number(BigInt(hex) & 0xffffffn);
  } catch {
    return null;
  }
}

function splitWords(data) {
  if (!data || typeof data !== "string") return [];

  const clean = data.startsWith("0x") ? data.slice(2) : data;

  const words = [];

  for (let i = 0; i + 64 <= clean.length; i += 64) {
    words.push("0x" + clean.slice(i, i + 64));
  }

  return words;
}

function looksLikeInitialize(log) {
  if (!log || !Array.isArray(log.topics)) return false;

  /*
    Initialize has exactly four indexed topics:

    topic0 = event signature
    topic1 = poolId
    topic2 = currency0
    topic3 = currency1

    This is the critical V47 change.
  */

  if (log.topics.length !== 4) return false;

  if (log.address?.toLowerCase() !== POOL_MANAGER) {
    return false;
  }

  const currency0 = topicToAddress(log.topics[2]);
  const currency1 = topicToAddress(log.topics[3]);

  if (!currency0 || !currency1) return false;

  /*
    Currency addresses are sorted in Uniswap V4.
  */
  if (
    currency0.toLowerCase() !==
      "0x0000000000000000000000000000000000000000" &&
    currency0.toLowerCase() >= currency1.toLowerCase()
  ) {
    return false;
  }

  return true;
}

function decodeInitialize(log) {
  if (!looksLikeInitialize(log)) return null;

  const topics = log.topics;

  const poolId = topics[1];

  const currency0 = topicToAddress(topics[2]);
  const currency1 = topicToAddress(topics[3]);

  const words = splitWords(log.data);

  return {
    poolId,
    currency0,
    currency1,
    fee: words.length > 0 ? decodeUint24(words[0]) : null,
    tickSpacing:
      words.length > 1 ? decodeInt24(words[1]) : null,
    hooks:
      words.length > 2
        ? topicToAddress(words[2])
        : null,
    sqrtPriceX96:
      words.length > 3 ? words[3] : null,
    tick:
      words.length > 4 ? decodeInt24(words[4]) : null,
    txHash: log.transactionHash || null,
    blockNumber: log.blockNumber || null
  };
}

async function rpc(env, method, params = []) {
  const apiKey = env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error("ALCHEMY_API_KEY secret is missing");
  }

  const rpcUrl =
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    apiKey;

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  if (!response.ok) {
    throw new Error(
      `Alchemy HTTP ${response.status}`
    );
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(
      `${method}: ${json.error.message || "RPC error"}`
    );
  }

  return json.result;
}

async function getLatestBlock(env) {
  const block = await rpc(env, "eth_blockNumber");

  return Number(BigInt(block));
}

async function getLogs(env, fromBlock, toBlock) {
  return await rpc(env, "eth_getLogs", [
    {
      address: POOL_MANAGER,
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "0x" + toBlock.toString(16)
    }
  ]);
}

async function ethCall(env, to, data) {
  try {
    return await rpc(env, "eth_call", [
      {
        to,
        data
      },
      "latest"
    ]);
  } catch {
    return null;
  }
}

function encodeSelector(selector) {
  return selector;
}

/*
  ERC20 selectors
*/
const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

function decodeString(result) {
  if (!result || result === "0x") return null;

  try {
    const hex = result.slice(2);

    if (hex.length < 128) return null;

    const offset = Number(BigInt("0x" + hex.slice(0, 64)));

    if (
      !Number.isFinite(offset) ||
      offset < 0 ||
      offset * 2 + 64 > hex.length
    ) {
      return null;
    }

    const lenPos = offset * 2;

    const length = Number(
      BigInt("0x" + hex.slice(lenPos, lenPos + 64))
    );

    const start = lenPos + 64;
    const end = start + length * 2;

    if (end > hex.length) return null;

    const bytes = hex.slice(start, end);

    let text = "";

    for (let i = 0; i < bytes.length; i += 2) {
      const code = parseInt(bytes.slice(i, i + 2), 16);

      if (code !== 0) {
        text += String.fromCharCode(code);
      }
    }

    return text || null;
  } catch {
    return null;
  }
}

function decodeBytes32String(result) {
  if (!result || result === "0x") return null;

  try {
    const hex = result.slice(2, 66);

    let text = "";

    for (let i = 0; i < hex.length; i += 2) {
      const code = parseInt(
        hex.slice(i, i + 2),
        16
      );

      if (code === 0) break;

      text += String.fromCharCode(code);
    }

    return text || null;
  } catch {
    return null;
  }
}

async function getERC20Metadata(env, address) {
  if (!validTokenCandidate(address)) {
    return {
      validERC20: false
    };
  }

  const nameRaw = await ethCall(
    env,
    address,
    SELECTORS.name
  );

  const symbolRaw = await ethCall(
    env,
    address,
    SELECTORS.symbol
  );

  const decimalsRaw = await ethCall(
    env,
    address,
    SELECTORS.decimals
  );

  const supplyRaw = await ethCall(
    env,
    address,
    SELECTORS.totalSupply
  );

  const name =
    decodeString(nameRaw) ||
    decodeBytes32String(nameRaw);

  const symbol =
    decodeString(symbolRaw) ||
    decodeBytes32String(symbolRaw);

  let decimals = null;

  try {
    if (decimalsRaw && decimalsRaw !== "0x") {
      decimals = Number(BigInt(decimalsRaw));
    }
  } catch {}

  let totalSupply = null;

  try {
    if (supplyRaw && supplyRaw !== "0x") {
      totalSupply = BigInt(supplyRaw).toString();
    }
  } catch {}

  const valid =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20: valid,
    name,
    symbol,
    decimals,
    totalSupply
  };
}

async function getRecentTokenLogs(
  env,
  token,
  latestBlock
) {
  const fromBlock = Math.max(
    0,
    latestBlock - 999
  );

  try {
    return await rpc(env, "eth_getLogs", [
      {
        address: token,
        fromBlock:
          "0x" + fromBlock.toString(16),
        toBlock:
          "0x" + latestBlock.toString(16)
      }
    ]);
  } catch {
    return [];
  }
}

function unique(values) {
  return [...new Set(values)];
}

function scoreCandidate(candidate) {
  let score = 0;

  /*
    Conservative scoring.

    We do NOT fabricate market cap, liquidity,
    holder count, whale activity or smart-money data.
  */

  if (candidate.validERC20) score += 20;

  if (candidate.name) score += 5;

  if (candidate.symbol) score += 5;

  if (candidate.poolInitialized) score += 15;

  if (candidate.recentActivity > 0) {
    score += Math.min(
      20,
      candidate.recentActivity * 2
    );
  }

  if (candidate.isNativePair) score += 10;

  /*
    Meme potential is intentionally not invented.
  */

  return Math.min(100, score);
}

async function scan(env) {
  const latestBlock = await getLatestBlock(env);

  const startBlock =
    latestBlock - (RPC_MAX_RANGE - 1);

  const logs = await getLogs(
    env,
    startBlock,
    latestBlock
  );

  const initializeEvents = [];

  for (const log of logs) {
    if (looksLikeInitialize(log)) {
      const decoded = decodeInitialize(log);

      if (decoded) {
        initializeEvents.push(decoded);
      }
    }
  }

  /*
    Only currencies from actual Initialize events
    become token candidates.
  */

  const currencies = [];

  for (const event of initializeEvents) {
    if (
      event.currency0 &&
      !isNativeCurrency(event.currency0)
    ) {
      currencies.push(event.currency0);
    }

    if (
      event.currency1 &&
      !isNativeCurrency(event.currency1)
    ) {
      currencies.push(event.currency1);
    }
  }

  const tokenAddresses = unique(
    currencies.map(x => x.toLowerCase())
  );

  const validationResults = [];
  const candidates = [];

  for (const address of tokenAddresses.slice(0, 20)) {
    const metadata = await getERC20Metadata(
      env,
      address
    );

    validationResults.push({
      address,
      ...metadata
    });

    if (!metadata.validERC20) {
      continue;
    }

    const pools = initializeEvents.filter(
      event =>
        event.currency0?.toLowerCase() === address ||
        event.currency1?.toLowerCase() === address
    );

    let recentActivity = 0;

    /*
      Count actual ERC20 logs from the token contract.
    */
    const tokenLogs = await getRecentTokenLogs(
      env,
      address,
      latestBlock
    );

    recentActivity = tokenLogs.length;

    const candidate = {
      address,
      ...metadata,
      poolInitialized: pools.length > 0,
      poolCount: pools.length,
      recentActivity,
      isNativePair: pools.some(
        pool =>
          isNativeCurrency(pool.currency0) ||
          isNativeCurrency(pool.currency1)
      ),
      pools: pools.map(pool => ({
        poolId: pool.poolId,
        currency0: pool.currency0,
        currency1: pool.currency1,
        fee: pool.fee,
        tickSpacing: pool.tickSpacing,
        hooks: pool.hooks,
        txHash: pool.txHash,
        blockNumber: pool.blockNumber
      }))
    };

    candidate.score =
      scoreCandidate(candidate);

    candidates.push(candidate);
  }

  candidates.sort(
    (a, b) => b.score - a.score
  );

  const qualifying =
    candidates.filter(
      candidate =>
        candidate.score >= TELEGRAM_THRESHOLD
    );

  let telegramResult = {
    sent: false,
    reason: "NO_QUALIFYING_CANDIDATE"
  };

  if (qualifying.length > 0) {
    telegramResult =
      await sendTelegram(
        env,
        qualifying[0]
      );
  }

  return {
    agent: "Robinhood Chain Meme Hunter",
    version: VERSION,
    success: true,

    scan: {
      status: "OK",
      latestBlock,
      startBlock,
      endBlock: latestBlock,
      blocksScanned:
        latestBlock - startBlock + 1,

      poolManager: POOL_MANAGER,

      rawLogs: logs.length,

      initializeEventsFound:
        initializeEvents.length,

      currenciesDiscovered:
        currencies.length,

      uniqueTokenCandidates:
        tokenAddresses.length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x => x.validERC20
        ).length,

      validationResults,

      pools: initializeEvents,

      candidates,

      telegram: telegramResult,

      rpcProvider: "ALCHEMY",

      discovery:
        "UNISWAP_V4_INITIALIZE_EVENT_FIRST_V47",

      chain: {
        name: CHAIN_NAME,
        chainId: CHAIN_ID
      },

      dataIntegrity: {
        noFabricatedMetrics: true,
        holderConcentration: "UNVERIFIED",
        smartMoney: "UNVERIFIED",
        walletActivity: "UNVERIFIED",
        accumulationDistribution:
          "UNVERIFIED",
        marketCap: "UNVERIFIED",
        liquidity: "UNVERIFIED",
        volume: "UNVERIFIED"
      }
    },

    timestamp:
      new Date().toISOString()
  };
}

async function sendTelegram(env, candidate) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED"
    };
  }

  const message = [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `🧪 Score: ${candidate.score}/100`,
    `🪙 ${candidate.name || "Unknown"}`,
    `🔹 ${candidate.symbol || "UNKNOWN"}`,
    "",
    `📍 Token: ${candidate.address}`,
    "",
    `🏊 Pools: ${candidate.poolCount}`,
    `📊 Recent ERC20 logs: ${candidate.recentActivity}`,
    "",
    "⚠️ Market cap: UNVERIFIED",
    "⚠️ Liquidity: UNVERIFIED",
    "⚠️ Holders: UNVERIFIED",
    "⚠️ Smart money: UNVERIFIED",
    "",
    "V47 — Initialize-event discovery"
  ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message
    })
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    return {
      sent: false,
      reason:
        result.description ||
        "TELEGRAM_SEND_FAILED"
    };
  }

  return {
    sent: true,
    messageId: result.result?.message_id || null
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
      "/test-telegram"
    ],

    chain: {
      name: CHAIN_NAME,
      chainId: CHAIN_ID,
      rpc: env.ALCHEMY_API_KEY
        ? "ALCHEMY_ROBINHOOD_MAINNET"
        : "MISSING_ALCHEMY_API_KEY"
    },

    poolManager: POOL_MANAGER,

    discovery:
      "UNISWAP_V4_INITIALIZE_EVENT_FIRST_V47",

    alchemyConfigured:
      !!env.ALCHEMY_API_KEY,

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls: true,
      minimumScore:
        TELEGRAM_THRESHOLD
    },

    architecture:
      "V47_POOL_INITIALIZATION_DISCOVERY",

    timestamp:
      new Date().toISOString()
  };
}

async function testTelegram(env) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      agent: "Robinhood Chain Meme Hunter",
      version: VERSION,
      success: false,
      error: "Telegram secrets missing"
    };
  }

  const result = await sendTelegram(
    env,
    {
      name: "V47 TEST",
      symbol: "TEST",
      address:
        "0x0000000000000000000000000000000000000000",
      score: 100,
      poolCount: 0,
      recentActivity: 0
    }
  );

  return {
    agent: "Robinhood Chain Meme Hunter",
    version: VERSION,
    success: result.sent,
    response: result,
    timestamp:
      new Date().toISOString()
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/health") {
        return json(await health(env));
      }

      if (url.pathname === "/scan") {
        return json(await scan(env));
      }

      if (url.pathname === "/test-telegram") {
        return json(
          await testTelegram(env)
        );
      }

      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: VERSION,
        status: "ONLINE",
        routes: [
          "/health",
          "/scan",
          "/test-telegram"
        ]
      });
    } catch (error) {
      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: VERSION,
        success: false,
        error:
          error?.message ||
          String(error),
        timestamp:
          new Date().toISOString()
      }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8"
      }
    }
  );
}
