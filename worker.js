const VERSION = "V52";

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
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2"
];

const MINT_FAST_LAUNCHPAD =
  "0xd61998ae9b29e1f19dfb70ba890bc85895c83f1b";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const TELEGRAM_THRESHOLD = 60;
const ACTIVITY_BLOCKS = 999;
const DISCOVERY_BLOCKS = 500;
const MAX_CANDIDATES = 50;

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

function isAddress(v) {
  return /^0x[a-fA-F0-9]{40}$/.test(v || "");
}

function isZeroAddress(v) {
  return !v || v.toLowerCase() === ZERO_ADDRESS;
}

function cleanAddress(v, allowZero = false) {
  if (!v || typeof v !== "string") return null;

  let x = v.toLowerCase();

  if (!x.startsWith("0x") || x.length !== 66) return null;

  const body = x.slice(2);

  if (!/^[0-9a-f]{64}$/.test(body)) return null;

  const address = "0x" + body.slice(24);

  if (!allowZero && isZeroAddress(address)) return null;

  return address;
}

function topicToAddress(topic, allowZero = false) {
  return cleanAddress(topic, allowZero);
}

function validTokenCandidate(address) {
  return (
    isAddress(address) &&
    !isZeroAddress(address)
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitWords(data) {
  if (!data || typeof data !== "string") return [];

  const clean = data.startsWith("0x")
    ? data.slice(2)
    : data;

  const result = [];

  for (let i = 0; i + 64 <= clean.length; i += 64) {
    result.push("0x" + clean.slice(i, i + 64));
  }

  return result;
}

function decodeUint24(hex) {
  try {
    return Number(BigInt(hex) & 0xffffffn);
  } catch {
    return null;
  }
}

function decodeInt24(hex) {
  try {
    let n = BigInt(hex);

    if (n >= (1n << 23n)) {
      n -= 1n << 24n;
    }

    return Number(n);
  } catch {
    return null;
  }
}

function decodeInt128(hex) {
  try {
    let n = BigInt(hex);

    if (n >= (1n << 127n)) {
      n -= 1n << 128n;
    }

    return n.toString();
  } catch {
    return null;
  }
}

async function rpc(env, method, params = []) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY secret is missing");
  }

  const url =
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    env.ALCHEMY_API_KEY;

  const response = await fetch(url, {
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
    throw new Error(`Alchemy HTTP ${response.status}`);
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

async function getLogs(env, filter) {
  try {
    return (
      await rpc(env, "eth_getLogs", [filter])
    ) || [];
  } catch {
    return [];
  }
}

async function ethCall(env, to, data) {
  try {
    return await rpc(env, "eth_call", [
      { to, data },
      "latest"
    ]);
  } catch {
    return null;
  }
}

function hexToUtf8(hex) {
  try {
    const bytes = [];

    for (let i = 0; i + 2 <= hex.length; i += 2) {
      const n = parseInt(hex.slice(i, i + 2), 16);

      if (n !== 0) bytes.push(n);
    }

    return (
      new TextDecoder()
        .decode(new Uint8Array(bytes))
        .trim() || null
    );
  } catch {
    return null;
  }
}

function decodeString(result) {
  if (!result || result === "0x") return null;

  try {
    const hex = result.slice(2);

    if (hex.length >= 128) {
      const offset = Number(
        BigInt("0x" + hex.slice(0, 64))
      );

      const pos = offset * 2;

      if (pos + 64 <= hex.length) {
        const length = Number(
          BigInt("0x" + hex.slice(pos, pos + 64))
        );

        const start = pos + 64;
        const end = start + length * 2;

        if (end <= hex.length) {
          return hexToUtf8(
            hex.slice(start, end)
          );
        }
      }
    }

    return hexToUtf8(
      hex.slice(0, 64)
    );
  } catch {
    return null;
  }
}

async function getERC20Metadata(env, address) {
  if (!validTokenCandidate(address)) {
    return { validERC20: false };
  }

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] = await Promise.all([
    ethCall(env, address, SELECTORS.name),
    ethCall(env, address, SELECTORS.symbol),
    ethCall(env, address, SELECTORS.decimals),
    ethCall(env, address, SELECTORS.totalSupply)
  ]);

  const name = decodeString(nameRaw);
  const symbol = decodeString(symbolRaw);

  let decimals = null;
  let totalSupply = null;

  try {
    if (decimalsRaw && decimalsRaw !== "0x") {
      decimals = Number(BigInt(decimalsRaw));
    }
  } catch {}

  try {
    if (supplyRaw && supplyRaw !== "0x") {
      totalSupply = BigInt(supplyRaw).toString();
    }
  } catch {}

  const validERC20 =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null &&
    decimals >= 0 &&
    decimals <= 36 &&
    totalSupply !== "0";

  return {
    validERC20,
    name: name ? name.slice(0, 100) : null,
    symbol: symbol ? symbol.slice(0, 50) : null,
    decimals,
    totalSupply
  };
}

function looksLikeInitialize(log) {
  if (
    log?.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) return false;

  if (!Array.isArray(log.topics) || log.topics.length !== 4) {
    return false;
  }

  const words = splitWords(log.data);

  if (words.length !== 5) return false;

  const currency0 = topicToAddress(log.topics[2], true);
  const currency1 = topicToAddress(log.topics[3], true);

  return (
    currency0 !== null &&
    currency1 !== null &&
    currency0.toLowerCase() !== currency1.toLowerCase()
  );
}

function decodeInitialize(log) {
  if (!looksLikeInitialize(log)) return null;

  const words = splitWords(log.data);

  return {
    poolId: log.topics[1],
    currency0: topicToAddress(log.topics[2], true),
    currency1: topicToAddress(log.topics[3], true),
    fee: decodeUint24(words[0]),
    tickSpacing: decodeInt24(words[1]),
    hooks: topicToAddress(words[2], true),
    sqrtPriceX96: words[3],
    tick: decodeInt24(words[4]),
    txHash: log.transactionHash || null,
    blockNumber: log.blockNumber || null,
    logIndex: log.logIndex || null
  };
}

function looksLikeSwap(log) {
  if (
    log?.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) return false;

  if (!Array.isArray(log.topics) || log.topics.length !== 3) {
    return false;
  }

  return splitWords(log.data).length === 7;
}

function decodeSwap(log) {
  if (!looksLikeSwap(log)) return null;

  const words = splitWords(log.data);

  return {
    poolId: log.topics[1],
    sender: topicToAddress(log.topics[2], true),
    amount0: decodeInt128(words[0]),
    amount1: decodeInt128(words[1]),
    sqrtPriceX96: words[2],
    liquidity: words[3],
    tick: decodeInt24(words[4]),
    fee: decodeUint24(words[5]),
    txHash: log.transactionHash || null,
    blockNumber: log.blockNumber || null
  };
}

async function getPoolManagerActivity(env, latestBlock) {
  const fromBlock = Math.max(0, latestBlock - 20);

  const logs = await getLogs(env, {
    address: POOL_MANAGER,
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "0x" + latestBlock.toString(16)
  });

  const initializeEvents = [];
  const swapEvents = [];

  for (const log of logs) {
    const init = decodeInitialize(log);
    if (init) initializeEvents.push(init);

    const swap = decodeSwap(log);
    if (swap) swapEvents.push(swap);
  }

  return {
    fromBlock,
    toBlock: latestBlock,
    rawLogs: logs.length,
    initializeEvents,
    swapEvents
  };
}

async function getLaunchEvents(
  env,
  addresses,
  topic,
  source,
  latestBlock
) {
  const fromBlock = Math.max(
    0,
    latestBlock - DISCOVERY_BLOCKS + 1
  );

  const logs = await getLogs(env, {
    address: addresses,
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "0x" + latestBlock.toString(16),
    topics: [topic]
  });

  const results = [];

  for (const log of logs) {
    const possible = [];

    for (const topicValue of log.topics || []) {
      const a = topicToAddress(topicValue);

      if (a && validTokenCandidate(a)) {
        possible.push(a);
      }
    }

    for (const word of splitWords(log.data)) {
      const a = topicToAddress(word);

      if (a && validTokenCandidate(a)) {
        possible.push(a);
      }
    }

    for (const token of unique(possible)) {
      results.push({
        token: token.toLowerCase(),
        source,
        txHash: log.transactionHash || null,
        blockNumber: log.blockNumber || null,
        contract: log.address || null
      });
    }
  }

  return {
    fromBlock,
    toBlock: latestBlock,
    rawEvents: logs.length,
    launches: results
  };
}

async function getTokenActivity(env, token, latestBlock) {
  const recentFrom = Math.max(
    0,
    latestBlock - ACTIVITY_BLOCKS + 1
  );

  const previousTo = Math.max(
    0,
    recentFrom - 1
  );

  const previousFrom = Math.max(
    0,
    previousTo - ACTIVITY_BLOCKS + 1
  );

  const [recentLogs, previousLogs] =
    await Promise.all([
      getLogs(env, {
        address: token,
        fromBlock:
          "0x" + recentFrom.toString(16),
        toBlock:
          "0x" + latestBlock.toString(16)
      }),

      getLogs(env, {
        address: token,
        fromBlock:
          "0x" + previousFrom.toString(16),
        toBlock:
          "0x" + previousTo.toString(16)
      })
    ]);

  const recentTransfers =
    recentLogs.filter(
      x =>
        x.topics?.[0]?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const previousTransfers =
    previousLogs.filter(
      x =>
        x.topics?.[0]?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const wallets = [];

  for (const log of recentTransfers) {
    const from = topicToAddress(log.topics[1], true);
    const to = topicToAddress(log.topics[2], true);

    if (from && !isZeroAddress(from)) wallets.push(from);
    if (to && !isZeroAddress(to)) wallets.push(to);
  }

  const recentActivity = recentLogs.length;
  const previousActivity = previousLogs.length;

  const activityAcceleration =
    previousActivity > 0
      ? recentActivity / previousActivity
      : recentActivity > 0
        ? 2
        : 0;

  const transferAcceleration =
    previousTransfers.length > 0
      ? recentTransfers.length /
        previousTransfers.length
      : recentTransfers.length > 0
        ? 2
        : 0;

  return {
    recentActivity,
    previousActivity,
    activityAcceleration,
    recentTransfers: recentTransfers.length,
    previousTransfers: previousTransfers.length,
    transferAcceleration,
    uniqueWallets: unique(wallets).length
  };
}

function findPools(token, initializeEvents) {
  const target = token.toLowerCase();

  return initializeEvents.filter(
    pool =>
      pool.currency0?.toLowerCase() === target ||
      pool.currency1?.toLowerCase() === target
  );
}

function scoreCandidate(c) {
  let score = 0;

  if (c.validERC20) score += 20;
  if (c.name) score += 5;
  if (c.symbol) score += 5;
  if (c.launchEvidence) score += 15;
  if (c.poolCount > 0) score += 10;

  if (c.recentActivity > 0) {
    score += Math.min(
      10,
      Math.ceil(c.recentActivity / 10)
    );
  }

  if (c.uniqueWallets > 0) {
    score += Math.min(
      10,
      c.uniqueWallets
    );
  }

  if (c.activityAcceleration > 1) {
    score += Math.min(
      10,
      Math.floor(c.activityAcceleration * 2)
    );
  }

  if (c.transferAcceleration > 1) {
    score += Math.min(
      5,
      Math.floor(c.transferAcceleration)
    );
  }

  if (c.recentTransfers > 0) {
    score += Math.min(
      5,
      Math.ceil(c.recentTransfers / 20)
    );
  }

  return Math.min(100, score);
}

async function buildCandidate(
  env,
  token,
  latestBlock,
  initializeEvents,
  evidence
) {
  const metadata =
    await getERC20Metadata(env, token);

  if (!metadata.validERC20) return null;

  const pools =
    findPools(token, initializeEvents);

  const activity =
    await getTokenActivity(
      env,
      token,
      latestBlock
    );

  const candidate = {
    address: token.toLowerCase(),

    ...metadata,

    launchEvidence: !!evidence,

    launchSource:
      evidence?.source || null,

    launchTx:
      evidence?.txHash || null,

    launchBlock:
      evidence?.blockNumber || null,

    poolCount: pools.length,

    poolInitialized:
      pools.length > 0,

    recentActivity:
      activity.recentActivity,

    previousActivity:
      activity.previousActivity,

    activityAcceleration:
      activity.activityAcceleration,

    recentTransfers:
      activity.recentTransfers,

    previousTransfers:
      activity.previousTransfers,

    transferAcceleration:
      activity.transferAcceleration,

    uniqueWallets:
      activity.uniqueWallets,

    pools: pools.map(p => ({
      poolId: p.poolId,
      currency0: p.currency0,
      currency1: p.currency1,
      fee: p.fee,
      tickSpacing: p.tickSpacing,
      hooks: p.hooks,
      tick: p.tick,
      txHash: p.txHash,
      blockNumber: p.blockNumber
    }))
  };

  candidate.score =
    scoreCandidate(candidate);

  return candidate;
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

  /*
   IMPORTANT:
   Never send a zero address.
   Never send an alert unless the address
   has passed ERC20 validation.
  */

  if (
    !candidate ||
    !candidate.validERC20 ||
    !validTokenCandidate(candidate.address)
  ) {
    return {
      sent: false,
      reason: "INVALID_TOKEN_ADDRESS"
    };
  }

  const message = [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `🧪 Score: ${candidate.score}/100`,
    `🪙 ${candidate.name || "Unknown"}`,
    `🔹 ${candidate.symbol || "UNKNOWN"}`,
    "",
    `📍 Contract: ${candidate.address}`,
    "",
    `🚀 Source: ${candidate.launchSource || "ON-CHAIN DISCOVERY"}`,
    `🏊 Pools: ${candidate.poolCount}`,
    `📊 Recent activity: ${candidate.recentActivity}`,
    `👥 Unique wallets: ${candidate.uniqueWallets}`,
    `🔄 Transfers: ${candidate.recentTransfers}`,
    `⚡ Activity acceleration: ${
      Number.isFinite(candidate.activityAcceleration)
        ? candidate.activityAcceleration.toFixed(2) + "x"
        : "UNVERIFIED"
    }`,
    `📈 Transfer acceleration: ${
      Number.isFinite(candidate.transferAcceleration)
        ? candidate.transferAcceleration.toFixed(2) + "x"
        : "UNVERIFIED"
    }`,
    "",
    "⚠️ Market cap: UNVERIFIED",
    "⚠️ Liquidity: UNVERIFIED",
    "⚠️ Holder concentration: UNVERIFIED",
    "⚠️ Smart money: UNVERIFIED",
    "⚠️ Whale activity: UNVERIFIED",
    "",
    "V52 — Verified Contract Activity Hunter"
  ].join("\n");

  try {
    const response = await fetch(
      "https://api.telegram.org/bot" +
        env.TELEGRAM_BOT_TOKEN +
        "/sendMessage",
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_CHAT_ID,
          text: message
        })
      }
    );

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
      messageId:
        result.result?.message_id || null
    };
  } catch (error) {
    return {
      sent: false,
      reason:
        error?.message ||
        "TELEGRAM_REQUEST_FAILED"
    };
  }
}

async function scan(env) {
  const latestBlock =
    await getLatestBlock(env);

  const [
    poolData,
    poolsCreated,
    poolsDistributed,
    poolsLaunched,
    mintFast
  ] = await Promise.all([
    getPoolManagerActivity(
      env,
      latestBlock
    ),

    getLaunchEvents(
      env,
      ENTRY_CONTRACTS,
      POOLS_TOKEN_CREATED_TOPIC,
      "POOLS_TRADE_TOKEN_CREATED",
      latestBlock
    ),

    getLaunchEvents(
      env,
      ENTRY_CONTRACTS,
      POOLS_TOKEN_DISTRIBUTED_TOPIC,
      "POOLS_TRADE_DISTRIBUTED",
      latestBlock
    ),

    getLaunchEvents(
      env,
      LAUNCHPADS,
      POOLS_TOKEN_LAUNCHED_TOPIC,
      "POOLS_TRADE_LAUNCHED",
      latestBlock
    ),

    getLaunchEvents(
      env,
      MINT_FAST_LAUNCHPAD,
      MINT_FAST_TOKEN_CREATED_TOPIC,
      "MINT_FAST_TOKEN_CREATED",
      latestBlock
    )
  ]);

  const tokenMap = new Map();

  const addLaunches = launches => {
    for (const item of launches) {
      if (
        validTokenCandidate(item.token)
      ) {
        tokenMap.set(
          item.token.toLowerCase(),
          item
        );
      }
    }
  };

  addLaunches(poolsCreated.launches);
  addLaunches(poolsDistributed.launches);
  addLaunches(poolsLaunched.launches);
  addLaunches(mintFast.launches);

  for (
    const pool of poolData.initializeEvents
  ) {
    for (
      const currency of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        validTokenCandidate(currency) &&
        !tokenMap.has(
          currency.toLowerCase()
        )
      ) {
        tokenMap.set(
          currency.toLowerCase(),
          {
            token:
              currency.toLowerCase(),

            source:
              "V4_POOL_DISCOVERY",

            txHash:
              pool.txHash,

            blockNumber:
              pool.blockNumber
          }
        );
      }
    }
  }

  const addresses = [
    ...tokenMap.keys()
  ].slice(0, MAX_CANDIDATES);

  const candidates = [];
  const validationResults = [];

  for (const token of addresses) {
    const metadata =
      await getERC20Metadata(
        env,
        token
      );

    validationResults.push({
      address: token,
      ...metadata
    });

    if (!metadata.validERC20) continue;

    const candidate =
      await buildCandidate(
        env,
        token,
        latestBlock,
        poolData.initializeEvents,
        tokenMap.get(token)
      );

    if (candidate) {
      candidates.push(candidate);
    }
  }

  candidates.sort(
    (a, b) => b.score - a.score
  );

  const qualifyingCandidates =
    candidates.filter(
      c =>
        c.score >= TELEGRAM_THRESHOLD &&
        c.validERC20 &&
        validTokenCandidate(c.address)
    );

  let telegramResult = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (qualifyingCandidates.length) {
    telegramResult =
      await sendTelegram(
        env,
        qualifyingCandidates[0]
      );
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version: VERSION,

    success: true,

    scan: {
      status: "OK",

      latestBlock,

      discoveryWindow: {
        fromBlock:
          poolsCreated.fromBlock,

        toBlock:
          poolsCreated.toBlock,

        blocks:
          poolsCreated.toBlock -
          poolsCreated.fromBlock +
          1
      },

      poolsTrade: {
        rawTokenCreatedEvents:
          poolsCreated.rawEvents,

        tokenCreated:
          poolsCreated.launches.length,

        distributed:
          poolsDistributed.launches.length,

        launched:
          poolsLaunched.launches.length
      },

      mintFast: {
        rawTokenCreatedEvents:
          mintFast.rawEvents,

        launchesFound:
          mintFast.launches.length
      },

      v4: {
        poolManager:
          POOL_MANAGER,

        rawLogs:
          poolData.rawLogs,

        initializeEvents:
          poolData.initializeEvents.length,

        swapEvents:
          poolData.swapEvents.length,

        uniqueSwapPools:
          unique(
            poolData.swapEvents.map(
              x => x.poolId
            )
          ).length,

        uniqueSwapSenders:
          unique(
            poolData.swapEvents
              .map(x => x.sender)
              .filter(Boolean)
          ).length
      },

      uniqueTokenCandidates:
        tokenMap.size,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x => x.validERC20
        ).length,

      validationResults,

      candidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics: true,

        contractAddress:
          "ERC20_VALIDATED_BEFORE_ALERT",

        launchDetection:
          "ON_CHAIN_EVENT_VERIFIED",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        poolDetection:
          "V4_INITIALIZE_OR_LAUNCHPAD_EVENT",

        walletActivity:
          "ERC20_TRANSFER_LOG_BASED",

        activityAcceleration:
          "NON_OVERLAPPING_BLOCK_WINDOWS",

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        holderConcentration:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        whaleActivity:
          "UNVERIFIED",

        socialMomentum:
          "UNVERIFIED"
      },

      discovery:
        "POOLS_TRADE_PLUS_MINT_FAST_PLUS_UNISWAP_V4",

      chain: {
        name:
          CHAIN_NAME,

        chainId:
          CHAIN_ID
      }
    },

    timestamp:
      new Date().toISOString()
  };
}

async function health(env) {
  let latestBlock = null;
  let rpcStatus = "UNKNOWN";

  if (env.ALCHEMY_API_KEY) {
    try {
      latestBlock =
        await getLatestBlock(env);

      rpcStatus = "CONNECTED";
    } catch {
      rpcStatus = "ERROR";
    }
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

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
      rpc:
        env.ALCHEMY_API_KEY
          ? "ALCHEMY_ROBINHOOD_MAINNET"
          : "MISSING_ALCHEMY_API_KEY"
    },

    contracts: {
      poolManager:
        POOL_MANAGER,

      poolsTradeEntryContracts:
        ENTRY_CONTRACTS,

      poolsTradeLaunchpads:
        LAUNCHPADS,

      mintFastLaunchpad:
        MINT_FAST_LAUNCHPAD
    },

    alchemyConfigured:
      !!env.ALCHEMY_API_KEY,

    rpcStatus,

    latestBlock,

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls: true,

      minimumScore:
        TELEGRAM_THRESHOLD
    },

    protections: {
      zeroAddressAlertsBlocked: true,
      unverifiedERC20AlertsBlocked: true,
      testAlertsSeparated: true
    },

    architecture:
      "V52_VERIFIED_CONTRACT_ACTIVITY_HUNTER",

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
      agent:
        "Robinhood Chain Meme Hunter",

      version: VERSION,

      success: false,

      error:
        "Telegram secrets missing"
    };
  }

  /*
   TESTS NOW USE A CLEARLY NON-TRADEABLE
   SYSTEM MESSAGE AND NEVER CLAIM TO BE A
   REAL TOKEN CALL.
  */

  const message = [
    "🧪 ROBINHOOD CHAIN MEME HUNTER",
    "",
    "✅ V52 TELEGRAM TEST",
    "",
    "This is a SYSTEM TEST.",
    "No token detected.",
    "No contract address supplied.",
    "",
    "🚫 NOT A MEME COIN CALL",
    "🚫 NOT A BUY SIGNAL",
    "",
    "V52 — Telegram connectivity test"
  ].join("\n");

  try {
    const response = await fetch(
      "https://api.telegram.org/bot" +
        env.TELEGRAM_BOT_TOKEN +
        "/sendMessage",
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body: JSON.stringify({
          chat_id:
            env.TELEGRAM_CHAT_ID,

          text: message
        })
      }
    );

    const result =
      await response.json();

    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version: VERSION,

      success:
        response.ok &&
        result.ok,

      response: {
        sent:
          result.ok === true,

        messageId:
          result.result?.message_id ||
          null
      },

      timestamp:
        new Date().toISOString()
    };
  } catch (error) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version: VERSION,

      success: false,

      error:
        error?.message ||
        "TELEGRAM_TEST_FAILED"
    };
  }
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    try {
      if (
        url.pathname === "/health"
      ) {
        return json(
          await health(env)
        );
      }

      if (
        url.pathname === "/scan"
      ) {
        return json(
          await scan(env)
        );
      }

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return json(
          await testTelegram(env)
        );
      }

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version: VERSION,

        status:
          "ONLINE",

        routes: [
          "/health",
          "/scan",
          "/test-telegram"
        ]
      });
    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version: VERSION,

          success: false,

          error:
            error?.message ||
            String(error),

          timestamp:
            new Date().toISOString()
        },
        500
      );
    }
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        "content-type":
          "application/json; charset=utf-8"
      }
    }
  );
}
