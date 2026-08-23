const VERSION = "V54";

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

const ALL_DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const TELEGRAM_THRESHOLD = 60;

const DISCOVERY_BLOCKS = 500;
const ACTIVITY_BLOCKS = 100;
const V4_BLOCKS = 100;
const RPC_LOG_CHUNK = 10;
const MAX_CANDIDATES = 50;

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(value) {
  return !value ||
    value.toLowerCase() === ZERO_ADDRESS;
}

function validTokenCandidate(value) {
  return (
    isAddress(value) &&
    !isZeroAddress(value)
  );
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topicToAddress(topic, allowZero = false) {
  if (
    typeof topic !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(topic)
  ) {
    return null;
  }

  const address =
    "0x" + topic.slice(-40);

  if (!allowZero && isZeroAddress(address)) {
    return null;
  }

  return address.toLowerCase();
}

function splitWords(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const clean = data.slice(2);
  const result = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
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

  const text = await response.text();

  let result;

  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(
      `Alchemy HTTP ${response.status}: invalid JSON`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Alchemy HTTP ${response.status}: ${
        result?.error?.message || "RPC request failed"
      }`
    );
  }

  if (result.error) {
    throw new Error(
      `${method}: ${
        result.error.message || "RPC error"
      }`
    );
  }

  return result.result;
}

async function getLatestBlock(env) {
  const result = await rpc(env, "eth_blockNumber");
  return Number(BigInt(result));
}

/*
==================================================
V54 FIXED LOG READER
==================================================

The V53 scanner was requesting large eth_getLogs
ranges and/or address arrays.

V54:
- one contract per request
- maximum 10 blocks per request
- retries failed requests
- preserves RPC errors
*/

async function getLogsChunk(
  env,
  address,
  fromBlock,
  toBlock,
  topics = null
) {
  const filter = {
    address,
    fromBlock:
      "0x" + fromBlock.toString(16),
    toBlock:
      "0x" + toBlock.toString(16)
  };

  if (topics) {
    filter.topics = topics;
  }

  let lastError = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const logs = await rpc(
        env,
        "eth_getLogs",
        [filter]
      );

      return {
        logs: Array.isArray(logs) ? logs : [],
        error: null
      };
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise(resolve =>
          setTimeout(resolve, 150 * attempt)
        );
      }
    }
  }

  return {
    logs: [],
    error:
      lastError?.message ||
      "eth_getLogs failed"
  };
}

async function getLogsChunked(
  env,
  address,
  fromBlock,
  toBlock,
  topics = null,
  chunkSize = RPC_LOG_CHUNK
) {
  const allLogs = [];
  const errors = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += chunkSize
  ) {
    const end = Math.min(
      start + chunkSize - 1,
      toBlock
    );

    const result = await getLogsChunk(
      env,
      address,
      start,
      end,
      topics
    );

    if (result.logs.length) {
      allLogs.push(...result.logs);
    }

    if (result.error) {
      errors.push({
        address,
        fromBlock: start,
        toBlock: end,
        error: result.error
      });
    }
  }

  const seen = new Set();

  const deduped =
    allLogs.filter(log => {
      const key =
        `${log.transactionHash || ""}:` +
        `${log.logIndex || ""}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });

  return {
    logs: deduped,
    errors
  };
}

async function ethCall(
  env,
  to,
  data
) {
  try {
    return await rpc(
      env,
      "eth_call",
      [
        {
          to,
          data
        },
        "latest"
      ]
    );
  } catch {
    return null;
  }
}

/*
==================================================
ERC20 DECODING
==================================================
*/

function hexToUtf8(hex) {
  try {
    if (!hex) return null;

    const clean = hex.replace(/^0x/, "");
    const bytes = [];

    for (
      let i = 0;
      i + 2 <= clean.length;
      i += 2
    ) {
      const n =
        parseInt(
          clean.slice(i, i + 2),
          16
        );

      if (n !== 0) {
        bytes.push(n);
      }
    }

    return (
      new TextDecoder()
        .decode(new Uint8Array(bytes))
        .replace(/\0/g, "")
        .trim() || null
    );
  } catch {
    return null;
  }
}

function decodeString(result) {
  if (
    !result ||
    result === "0x"
  ) {
    return null;
  }

  try {
    const clean = result.slice(2);

    if (clean.length >= 128) {
      const offset =
        Number(
          BigInt(
            "0x" +
            clean.slice(0, 64)
          )
        );

      const lengthPosition =
        offset * 2;

      if (
        Number.isFinite(offset) &&
        lengthPosition + 64 <= clean.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              clean.slice(
                lengthPosition,
                lengthPosition + 64
              )
            )
          );

        const start =
          lengthPosition + 64;

        const end =
          start + length * 2;

        if (
          length >= 0 &&
          end <= clean.length
        ) {
          return hexToUtf8(
            clean.slice(start, end)
          );
        }
      }
    }

    return hexToUtf8(
      clean.slice(0, 64)
    );
  } catch {
    return null;
  }
}

async function getERC20Metadata(
  env,
  token
) {
  if (!validTokenCandidate(token)) {
    return {
      validERC20: false,
      reason: "INVALID_OR_ZERO_ADDRESS"
    };
  }

  const address =
    token.toLowerCase();

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] = await Promise.all([
    ethCall(
      env,
      address,
      SELECTORS.name
    ),
    ethCall(
      env,
      address,
      SELECTORS.symbol
    ),
    ethCall(
      env,
      address,
      SELECTORS.decimals
    ),
    ethCall(
      env,
      address,
      SELECTORS.totalSupply
    )
  ]);

  const name =
    decodeString(nameRaw);

  const symbol =
    decodeString(symbolRaw);

  let decimals = null;

  try {
    if (decimalsRaw) {
      decimals =
        Number(BigInt(decimalsRaw));
    }
  } catch {}

  let totalSupply = null;

  try {
    if (supplyRaw) {
      totalSupply =
        BigInt(supplyRaw).toString();
    }
  } catch {}

  const valid =
    !isZeroAddress(address) &&
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20: valid,
    name: name
      ? name.slice(0, 100)
      : null,
    symbol: symbol
      ? symbol.slice(0, 50)
      : null,
    decimals,
    totalSupply,
    verification:
      valid
        ? "VERIFIED"
        : "FAILED"
  };
}

/*
==================================================
V4 INITIALIZE / SWAP
==================================================
*/

function decodeInitialize(log) {
  if (
    !log ||
    log.address?.toLowerCase() !==
      POOL_MANAGER.toLowerCase()
  ) {
    return null;
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics.length < 4
  ) {
    return null;
  }

  const words =
    splitWords(log.data);

  if (words.length < 5) {
    return null;
  }

  const currency0 =
    topicToAddress(
      log.topics[2],
      true
    );

  const currency1 =
    topicToAddress(
      log.topics[3],
      true
    );

  if (
    !currency0 ||
    !currency1 ||
    currency0 === currency1
  ) {
    return null;
  }

  return {
    poolId: log.topics[1],
    currency0,
    currency1,
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

function decodeSwap(log) {
  if (
    !log ||
    log.address?.toLowerCase() !==
      POOL_MANAGER.toLowerCase()
  ) {
    return null;
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics.length < 3
  ) {
    return null;
  }

  const words =
    splitWords(log.data);

  if (words.length < 7) {
    return null;
  }

  return {
    poolId: log.topics[1],
    sender:
      topicToAddress(
        log.topics[2],
        true
      ),
    amount0:
      decodeInt128(words[0]),
    amount1:
      decodeInt128(words[1]),
    sqrtPriceX96: words[2],
    liquidity: words[3],
    tick:
      decodeInt24(words[4]),
    fee:
      decodeUint24(words[5]),
    txHash:
      log.transactionHash || null,
    blockNumber:
      log.blockNumber || null
  };
}

async function getV4Activity(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock - V4_BLOCKS + 1
    );

  const result =
    await getLogsChunked(
      env,
      POOL_MANAGER,
      fromBlock,
      latestBlock,
      null,
      RPC_LOG_CHUNK
    );

  const initializeEvents = [];
  const swapEvents = [];

  for (const log of result.logs) {
    const init =
      decodeInitialize(log);

    if (init) {
      initializeEvents.push(init);
    }

    const swap =
      decodeSwap(log);

    if (swap) {
      swapEvents.push(swap);
    }
  }

  return {
    fromBlock,
    toBlock: latestBlock,
    rawLogs: result.logs.length,
    initializeEvents,
    swapEvents,
    rpcErrors: result.errors
  };
}

/*
==================================================
ADDRESS EXTRACTION
==================================================
*/

function extractAddressesFromLog(log) {
  const addresses = [];

  for (
    const topic of
      log?.topics || []
  ) {
    const address =
      topicToAddress(topic);

    if (validTokenCandidate(address)) {
      addresses.push(address);
    }
  }

  for (
    const word of
      splitWords(log?.data)
  ) {
    const address =
      topicToAddress(word);

    if (validTokenCandidate(address)) {
      addresses.push(address);
    }
  }

  return unique(addresses);
}

/*
==================================================
BROAD LAUNCHPAD DISCOVERY
==================================================
*/

async function discoverContract(
  env,
  contract,
  fromBlock,
  toBlock
) {
  const result =
    await getLogsChunked(
      env,
      contract,
      fromBlock,
      toBlock,
      null,
      RPC_LOG_CHUNK
    );

  const addresses = [];

  for (
    const log of result.logs
  ) {
    addresses.push(
      ...extractAddressesFromLog(log)
    );
  }

  return {
    contract,
    logsFound:
      result.logs.length,
    addressesExtracted:
      unique(addresses).length,
    addresses:
      unique(addresses),
    rpcErrors:
      result.errors
  };
}

/*
==================================================
TOKEN ACTIVITY
==================================================
*/

async function getTokenActivity(
  env,
  token,
  latestBlock
) {
  if (!validTokenCandidate(token)) {
    return {
      recentActivity: 0,
      previousActivity: 0,
      recentTransfers: 0,
      previousTransfers: 0,
      uniqueWallets: 0,
      activityAcceleration: 0,
      transferAcceleration: 0
    };
  }

  const recentFrom =
    Math.max(
      0,
      latestBlock -
        ACTIVITY_BLOCKS +
        1
    );

  const previousTo =
    recentFrom - 1;

  const previousFrom =
    Math.max(
      0,
      previousTo -
        ACTIVITY_BLOCKS +
        1
    );

  const [
    recent,
    previous
  ] = await Promise.all([
    getLogsChunked(
      env,
      token,
      recentFrom,
      latestBlock,
      [TRANSFER_TOPIC],
      RPC_LOG_CHUNK
    ),
    previousTo >= previousFrom
      ? getLogsChunked(
          env,
          token,
          previousFrom,
          previousTo,
          [TRANSFER_TOPIC],
          RPC_LOG_CHUNK
        )
      : {
          logs: [],
          errors: []
        }
  ]);

  const wallets = [];

  for (
    const log of recent.logs
  ) {
    const from =
      topicToAddress(
        log.topics?.[1],
        true
      );

    const to =
      topicToAddress(
        log.topics?.[2],
        true
      );

    if (
      from &&
      !isZeroAddress(from)
    ) {
      wallets.push(from);
    }

    if (
      to &&
      !isZeroAddress(to)
    ) {
      wallets.push(to);
    }
  }

  const recentTransfers =
    recent.logs.length;

  const previousTransfers =
    previous.logs.length;

  const acceleration =
    previousTransfers > 0
      ? recentTransfers /
        previousTransfers
      : recentTransfers > 0
        ? 2
        : 0;

  return {
    recentActivity:
      recent.logs.length,

    previousActivity:
      previous.logs.length,

    recentTransfers,

    previousTransfers,

    uniqueWallets:
      unique(wallets).length,

    activityAcceleration:
      acceleration,

    transferAcceleration:
      acceleration,

    rpcErrors: [
      ...recent.errors,
      ...previous.errors
    ]
  };
}

/*
==================================================
POOL MATCHING
==================================================
*/

function findPools(
  token,
  initializeEvents
) {
  const target =
    token.toLowerCase();

  return initializeEvents.filter(
    pool =>
      pool.currency0?.toLowerCase() === target ||
      pool.currency1?.toLowerCase() === target
  );
}

/*
==================================================
SCORING
==================================================
*/

function scoreCandidate(candidate) {
  let score = 0;

  if (candidate.validERC20) {
    score += 20;
  }

  if (candidate.name) {
    score += 5;
  }

  if (candidate.symbol) {
    score += 5;
  }

  if (candidate.launchEvidence) {
    score += 15;
  }

  if (candidate.poolCount > 0) {
    score += 10;
  }

  if (candidate.recentActivity > 0) {
    score += Math.min(
      10,
      Math.ceil(
        candidate.recentActivity / 10
      )
    );
  }

  if (candidate.uniqueWallets > 0) {
    score += Math.min(
      10,
      candidate.uniqueWallets
    );
  }

  if (
    candidate.activityAcceleration > 1
  ) {
    score += Math.min(
      10,
      Math.floor(
        candidate.activityAcceleration * 2
      )
    );
  }

  if (
    candidate.transferAcceleration > 1
  ) {
    score += Math.min(
      5,
      Math.floor(
        candidate.transferAcceleration
      )
    );
  }

  return Math.min(100, score);
}

/*
==================================================
CANDIDATE
==================================================
*/

async function buildCandidate(
  env,
  token,
  latestBlock,
  initializeEvents,
  evidence
) {
  if (!validTokenCandidate(token)) {
    return null;
  }

  const metadata =
    await getERC20Metadata(
      env,
      token
    );

  if (!metadata.validERC20) {
    return null;
  }

  const activity =
    await getTokenActivity(
      env,
      token,
      latestBlock
    );

  const pools =
    findPools(
      token,
      initializeEvents
    );

  const candidate = {
    address:
      token.toLowerCase(),

    ...metadata,

    launchEvidence:
      !!evidence,

    launchSource:
      evidence?.source || null,

    launchTx:
      evidence?.txHash || null,

    launchBlock:
      evidence?.blockNumber || null,

    poolCount:
      pools.length,

    poolInitialized:
      pools.length > 0,

    recentActivity:
      activity.recentActivity,

    previousActivity:
      activity.previousActivity,

    recentTransfers:
      activity.recentTransfers,

    previousTransfers:
      activity.previousTransfers,

    uniqueWallets:
      activity.uniqueWallets,

    activityAcceleration:
      activity.activityAcceleration,

    transferAcceleration:
      activity.transferAcceleration,

    pools:
      pools.map(pool => ({
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

  return candidate;
}

/*
==================================================
TELEGRAM
==================================================
*/

async function sendTelegram(
  env,
  candidate
) {
  /*
    HARD SAFETY CHECK.
    Nothing reaches Telegram unless:
    - address is valid
    - address is non-zero
    - ERC20 verification succeeded
  */

  if (
    !candidate ||
    !validTokenCandidate(
      candidate.address
    ) ||
    candidate.validERC20 !== true
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_INVALID_OR_UNVERIFIED_TOKEN"
    };
  }

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  const message = [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `🧪 Score: ${candidate.score}/100`,
    `🪙 ${candidate.name}`,
    `🔹 ${candidate.symbol}`,
    "",
    `📍 Token: ${candidate.address}`,
    "",
    `🚀 Source: ${
      candidate.launchSource ||
      "ON-CHAIN DISCOVERY"
    }`,
    `🏊 Pools: ${candidate.poolCount}`,
    `📊 Recent activity: ${candidate.recentActivity}`,
    `🔄 Transfers: ${candidate.recentTransfers}`,
    `👥 Unique wallets: ${candidate.uniqueWallets}`,
    `⚡ Activity acceleration: ${
      candidate.activityAcceleration.toFixed(2)
    }x`,
    `📈 Transfer acceleration: ${
      candidate.transferAcceleration.toFixed(2)
    }x`,
    "",
    "⚠️ Market cap: UNVERIFIED",
    "⚠️ Liquidity: UNVERIFIED",
    "⚠️ Holder concentration: UNVERIFIED",
    "⚠️ Smart money: UNVERIFIED",
    "⚠️ Whale activity: UNVERIFIED",
    "",
    "V54 — Verified Launch + V4 Activity Hunter"
  ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response =
      await fetch(url, {
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
      });

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.ok
    ) {
      return {
        sent: false,
        reason:
          result?.description ||
          "TELEGRAM_SEND_FAILED"
      };
    }

    return {
      sent: true,
      messageId:
        result.result?.message_id ||
        null
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

/*
==================================================
SCAN
==================================================
*/

async function scan(env) {
  const latestBlock =
    await getLatestBlock(env);

  const discoveryFrom =
    Math.max(
      0,
      latestBlock -
        DISCOVERY_BLOCKS +
        1
    );

  /*
    BROAD DISCOVERY

    One contract at a time.
    10-block chunks.
  */

  const observations = [];

  for (
    const contract of
      ALL_DISCOVERY_CONTRACTS
  ) {
    observations.push(
      await discoverContract(
        env,
        contract,
        discoveryFrom,
        latestBlock
      )
    );
  }

  /*
    Extract all addresses.
  */

  const discoveredAddresses =
    unique(
      observations.flatMap(
        observation =>
          observation.addresses
      )
    ).filter(
      validTokenCandidate
    );

  /*
    V4 activity.
  */

  const v4 =
    await getV4Activity(
      env,
      latestBlock
    );

  /*
    Add V4 currencies.
  */

  for (
    const pool of
      v4.initializeEvents
  ) {
    if (
      validTokenCandidate(
        pool.currency0
      )
    ) {
      discoveredAddresses.push(
        pool.currency0
      );
    }

    if (
      validTokenCandidate(
        pool.currency1
      )
    ) {
      discoveredAddresses.push(
        pool.currency1
      );
    }
  }

  const candidatesToCheck =
    unique(
      discoveredAddresses
    ).slice(
      0,
      MAX_CANDIDATES
    );

  const validationResults = [];
  const candidates = [];

  /*
    First verify every candidate.
  */

  for (
    const token of
      candidatesToCheck
  ) {
    if (
      !validTokenCandidate(token)
    ) {
      continue;
    }

    const metadata =
      await getERC20Metadata(
        env,
        token
      );

    validationResults.push({
      address: token,
      ...metadata
    });

    if (!metadata.validERC20) {
      continue;
    }

    const observation =
      observations.find(
        item =>
          item.addresses?.some(
            address =>
              address.toLowerCase() ===
              token.toLowerCase()
          )
      );

    const candidate =
      await buildCandidate(
        env,
        token,
        latestBlock,
        v4.initializeEvents,
        observation
          ? {
              source:
                observation.contract,
              txHash: null,
              blockNumber: null
            }
          : {
              source:
                "V4_POOL_DISCOVERY"
            }
      );

    if (candidate) {
      candidates.push(candidate);
    }
  }

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD &&
        candidate.validERC20 === true &&
        validTokenCandidate(
          candidate.address
        )
    );

  let telegramResult = {
    sent: false,
    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifyingCandidates.length > 0
  ) {
    telegramResult =
      await sendTelegram(
        env,
        qualifyingCandidates[0]
      );
  }

  const rpcErrors =
    observations.flatMap(
      observation =>
        observation.rpcErrors || []
    );

  rpcErrors.push(
    ...v4.rpcErrors
  );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    scan: {
      status:
        "OK",

      latestBlock,

      discoveryWindow: {
        fromBlock:
          discoveryFrom,
        toBlock:
          latestBlock,
        blocks:
          latestBlock -
          discoveryFrom +
          1,
        rpcChunkSize:
          RPC_LOG_CHUNK
      },

      launchpadDiscovery: {
        contractsChecked:
          ALL_DISCOVERY_CONTRACTS.length,

        observations:
          observations.map(
            observation => ({
              contract:
                observation.contract,

              logsFound:
                observation.logsFound,

              addressesExtracted:
                observation.addressesExtracted,

              rpcErrors:
                observation.rpcErrors
            })
          )
      },

      v4: {
        poolManager:
          POOL_MANAGER,

        fromBlock:
          v4.fromBlock,

        toBlock:
          v4.toBlock,

        rawLogs:
          v4.rawLogs,

        initializeEvents:
          v4.initializeEvents.length,

        swapEvents:
          v4.swapEvents.length,

        uniqueSwapPools:
          unique(
            v4.swapEvents.map(
              x => x.poolId
            )
          ).length,

        uniqueSwapSenders:
          unique(
            v4.swapEvents
              .map(
                x => x.sender
              )
              .filter(Boolean)
          ).length,

        rpcErrors:
          v4.rpcErrors
      },

      uniqueTokenCandidates:
        unique(
          candidatesToCheck
        ).length,

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

      telegramCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      rpcErrors,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        logDiscovery:
          "ONE_CONTRACT_PER_REQUEST",

        rpcLogChunking:
          `${RPC_LOG_CHUNK}_BLOCK_CHUNKS`,

        launchDetection:
          "BROAD_LOG_DISCOVERY",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

        poolDetection:
          "V4_INITIALIZE_OR_BROAD_LOG_DISCOVERY",

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
        "V54_CHUNKED_RPC_BROAD_DISCOVERY_VERIFIED_TOKEN_HUNTER",

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

/*
==================================================
HEALTH
==================================================
*/

async function health(env) {
  let latestBlock = null;
  let rpcStatus = "UNKNOWN";

  if (env.ALCHEMY_API_KEY) {
    try {
      latestBlock =
        await getLatestBlock(env);

      rpcStatus =
        "CONNECTED";
    } catch {
      rpcStatus =
        "ERROR";
    }
  }

  return {
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
        CHAIN_NAME,

      chainId:
        CHAIN_ID,

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

    rpcLogChunkSize:
      RPC_LOG_CHUNK,

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls:
        true,

      minimumScore:
        TELEGRAM_THRESHOLD,

      tokenVerification:
        "REQUIRED",

      zeroAddressProtection:
        true
    },

    architecture:
      "V54_CHUNKED_RPC_VERIFIED_TOKEN_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
SAFE TELEGRAM TEST
==================================================
*/

async function testTelegram(env) {
  /*
    Deliberately uses ZERO ADDRESS.
    It MUST be rejected.
  */

  const result =
    await sendTelegram(
      env,
      {
        name: "V54 SAFETY TEST",
        symbol: "TEST",
        address: ZERO_ADDRESS,
        validERC20: false,
        score: 100
      }
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    safetyTest:
      result.sent
        ? "FAILED"
        : "ZERO_ADDRESS_BLOCKED",

    response:
      result,

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
WORKER
==================================================
*/

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    try {
      if (
        url.pathname ===
        "/health"
      ) {
        return json(
          await health(env)
        );
      }

      if (
        url.pathname ===
        "/scan"
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
    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

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
