const VERSION = "V53";

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

const MINT_FAST_LAUNCHPAD =
  "0xd61998ae9b29e1f19dfb70ba890bc85895c83f1b";

const DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

const TELEGRAM_THRESHOLD = 60;

const DISCOVERY_BLOCKS = 500;
const V4_BLOCKS = 100;
const ACTIVITY_BLOCKS = 999;
const MAX_CANDIDATES = 75;

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(value) {
  return !value ||
    value.toLowerCase() === ZERO_ADDRESS;
}

function normaliseAddress(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  if (!isAddress(value)) {
    return null;
  }

  const address = value.toLowerCase();

  if (address === ZERO_ADDRESS) {
    return null;
  }

  return address;
}

function topicToAddress(topic) {
  if (!topic || typeof topic !== "string") {
    return null;
  }

  let hex = topic.toLowerCase();

  if (hex.startsWith("0x")) {
    hex = hex.slice(2);
  }

  if (hex.length !== 64) {
    return null;
  }

  if (!/^[0-9a-f]{64}$/.test(hex)) {
    return null;
  }

  return normaliseAddress(
    "0x" + hex.slice(24)
  );
}

function wordToAddress(word) {
  return topicToAddress(word);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function splitWords(data) {
  if (!data || typeof data !== "string") {
    return [];
  }

  const clean = data.startsWith("0x")
    ? data.slice(2)
    : data;

  const words = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    words.push(
      "0x" + clean.slice(i, i + 64)
    );
  }

  return words;
}

function decodeUint24(hex) {
  try {
    return Number(
      BigInt(hex) & 0xffffffn
    );
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
    throw new Error(
      `Alchemy HTTP ${response.status}`
    );
  }

  const json = await response.json();

  if (json.error) {
    throw new Error(
      `${method}: ${
        json.error.message || "RPC error"
      }`
    );
  }

  return json.result;
}

async function getLatestBlock(env) {
  const result =
    await rpc(env, "eth_blockNumber");

  return Number(BigInt(result));
}

/*
==================================================
ROBUST LOG READER
==================================================
*/

async function getLogsSafe(env, filter) {
  try {
    const logs =
      await rpc(
        env,
        "eth_getLogs",
        [filter]
      );

    return {
      logs: Array.isArray(logs)
        ? logs
        : [],
      error: null
    };
  } catch (error) {
    return {
      logs: [],
      error:
        error?.message ||
        String(error)
    };
  }
}

/*
==================================================
ETH CALL
==================================================
*/

async function ethCall(env, to, data) {
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
STRING DECODING
==================================================
*/

function hexToUtf8(hex) {
  try {
    if (!hex) return null;

    const clean =
      hex.startsWith("0x")
        ? hex.slice(2)
        : hex;

    const bytes = [];

    for (
      let i = 0;
      i + 2 <= clean.length;
      i += 2
    ) {
      const value =
        parseInt(
          clean.slice(i, i + 2),
          16
        );

      if (value !== 0) {
        bytes.push(value);
      }
    }

    const value =
      new TextDecoder()
        .decode(
          new Uint8Array(bytes)
        )
        .replace(/\0/g, "")
        .trim();

    return value || null;
  } catch {
    return null;
  }
}

function decodeString(result) {
  if (!result || result === "0x") {
    return null;
  }

  try {
    const clean =
      result.slice(2);

    if (clean.length >= 128) {
      const offset =
        Number(
          BigInt(
            "0x" +
            clean.slice(0, 64)
          )
        );

      const position =
        offset * 2;

      if (
        Number.isFinite(offset) &&
        position + 64 <= clean.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              clean.slice(
                position,
                position + 64
              )
            )
          );

        const start =
          position + 64;

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

/*
==================================================
ERC20 VERIFICATION
==================================================
*/

async function getERC20Metadata(env, address) {
  const token =
    normaliseAddress(address);

  if (!token) {
    return {
      validERC20: false
    };
  }

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] = await Promise.all([
    ethCall(
      env,
      token,
      SELECTORS.name
    ),
    ethCall(
      env,
      token,
      SELECTORS.symbol
    ),
    ethCall(
      env,
      token,
      SELECTORS.decimals
    ),
    ethCall(
      env,
      token,
      SELECTORS.totalSupply
    )
  ]);

  const name =
    decodeString(nameRaw);

  const symbol =
    decodeString(symbolRaw);

  let decimals = null;
  let totalSupply = null;

  try {
    if (
      decimalsRaw &&
      decimalsRaw !== "0x"
    ) {
      decimals =
        Number(
          BigInt(decimalsRaw)
        );
    }
  } catch {}

  try {
    if (
      supplyRaw &&
      supplyRaw !== "0x"
    ) {
      totalSupply =
        BigInt(
          supplyRaw
        ).toString();
    }
  } catch {}

  const valid =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null &&
    decimals >= 0 &&
    decimals <= 255 &&
    BigInt(totalSupply || "0") > 0n;

  return {
    validERC20: valid,
    name: name
      ? name.slice(0, 100)
      : null,
    symbol: symbol
      ? symbol.slice(0, 50)
      : null,
    decimals,
    totalSupply
  };
}

/*
==================================================
V4 INITIALIZE DETECTION
==================================================
*/

function decodeInitialize(log) {
  if (!log) return null;

  if (
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
      log.topics[2]
    );

  const currency1 =
    topicToAddress(
      log.topics[3]
    );

  /*
    Native currency may be zero in a real V4 pool.
    Recover the raw topic here so native pairs remain
    detectable without turning zero into a Telegram token.
  */

  const rawCurrency0 =
    log.topics[2];

  const rawCurrency1 =
    log.topics[3];

  if (
    !rawCurrency0 ||
    !rawCurrency1
  ) {
    return null;
  }

  return {
    poolId:
      log.topics[1] || null,

    currency0:
      currency0 ||
      ZERO_ADDRESS,

    currency1:
      currency1 ||
      ZERO_ADDRESS,

    fee:
      decodeUint24(words[0]),

    tickSpacing:
      decodeInt24(words[1]),

    hooks:
      topicToAddress(words[2]),

    sqrtPriceX96:
      words[3],

    tick:
      decodeInt24(words[4]),

    txHash:
      log.transactionHash || null,

    blockNumber:
      log.blockNumber || null,

    logIndex:
      log.logIndex || null
  };
}

/*
==================================================
V4 SWAP DETECTION
==================================================
*/

function decodeSwap(log) {
  if (!log) return null;

  if (
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
    poolId:
      log.topics[1] || null,

    sender:
      topicToAddress(
        log.topics[2]
      ),

    amount0:
      decodeInt128(words[0]),

    amount1:
      decodeInt128(words[1]),

    sqrtPriceX96:
      words[2],

    liquidity:
      words[3],

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

/*
==================================================
V4 ACTIVITY
==================================================
*/

async function getV4Activity(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        V4_BLOCKS +
        1
    );

  const result =
    await getLogsSafe(
      env,
      {
        address:
          POOL_MANAGER,

        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          latestBlock.toString(16)
      }
    );

  const initializeEvents = [];
  const swapEvents = [];

  for (const log of result.logs) {
    const initialize =
      decodeInitialize(log);

    if (initialize) {
      initializeEvents.push(
        initialize
      );
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
    rpcError: result.error,
    initializeEvents,
    swapEvents
  };
}

/*
==================================================
GENERIC ADDRESS EXTRACTION
==================================================
*/

function extractAddressesFromLog(log) {
  const addresses = [];

  if (!log) {
    return [];
  }

  for (
    const topic of
      Array.isArray(log.topics)
        ? log.topics
        : []
  ) {
    const address =
      topicToAddress(topic);

    if (address) {
      addresses.push(address);
    }
  }

  for (
    const word of
      splitWords(log.data)
  ) {
    const address =
      wordToAddress(word);

    if (address) {
      addresses.push(address);
    }
  }

  return unique(addresses);
}

/*
==================================================
LAUNCHPAD BROAD DISCOVERY
==================================================

V53 intentionally does NOT depend only on a single
event signature. It first retrieves all logs emitted
by the known launch contracts, extracts ABI-aligned
addresses, then verifies every possible address as
an ERC20 before it can become a candidate.
==================================================
*/

async function scanLaunchContracts(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        DISCOVERY_BLOCKS +
        1
    );

  const candidates = new Map();

  const observations = [];

  for (
    const contract of
      DISCOVERY_CONTRACTS
  ) {
    const result =
      await getLogsSafe(
        env,
        {
          address:
            contract,

          fromBlock:
            "0x" +
            fromBlock.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16)
        }
      );

    let addressesFound = 0;

    for (const log of result.logs) {
      const addresses =
        extractAddressesFromLog(log);

      for (const address of addresses) {
        /*
          Do not accept addresses that are clearly
          infrastructure contracts unless ERC20
          verification later proves them to be tokens.
        */

        const key =
          address.toLowerCase();

        if (!candidates.has(key)) {
          candidates.set(key, {
            token: key,
            source:
              contract.toLowerCase() ===
              MINT_FAST_LAUNCHPAD.toLowerCase()
                ? "MINT_FAST"
                : "LAUNCHPAD_EVENT",

            contract:
              log.address,

            txHash:
              log.transactionHash ||
              null,

            blockNumber:
              log.blockNumber ||
              null,

            topic0:
              log.topics?.[0] ||
              null
          });
        }

        addressesFound++;
      }
    }

    observations.push({
      contract,
      logsFound:
        result.logs.length,
      addressesExtracted:
        addressesFound,
      rpcError:
        result.error
    });
  }

  return {
    fromBlock,
    toBlock: latestBlock,
    observations,
    candidates
  };
}

/*
==================================================
EXACT EVENT DISCOVERY
==================================================
*/

async function scanExactEvents(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        DISCOVERY_BLOCKS +
        1
    );

  const filters = [
    {
      name: "POOLS_TOKEN_CREATED",
      addresses: ENTRY_CONTRACTS,
      topic:
        POOLS_TOKEN_CREATED_TOPIC
    },
    {
      name: "POOLS_TOKEN_DISTRIBUTED",
      addresses: ENTRY_CONTRACTS,
      topic:
        POOLS_TOKEN_DISTRIBUTED_TOPIC
    },
    {
      name: "POOLS_TOKEN_LAUNCHED",
      addresses: LAUNCHPADS,
      topic:
        POOLS_TOKEN_LAUNCHED_TOPIC
    },
    {
      name: "MINT_FAST_TOKEN_CREATED",
      addresses: [
        MINT_FAST_LAUNCHPAD
      ],
      topic:
        MINT_FAST_TOKEN_CREATED_TOPIC
    }
  ];

  const events = [];

  for (const item of filters) {
    const result =
      await getLogsSafe(
        env,
        {
          address:
            item.addresses,

          fromBlock:
            "0x" +
            fromBlock.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16),

          topics: [
            item.topic
          ]
        }
      );

    for (const log of result.logs) {
      events.push({
        type: item.name,
        log
      });
    }
  }

  return {
    fromBlock,
    toBlock: latestBlock,
    events
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
  const recentFrom =
    Math.max(
      0,
      latestBlock -
        ACTIVITY_BLOCKS +
        1
    );

  const previousTo =
    Math.max(
      0,
      recentFrom - 1
    );

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
    getLogsSafe(
      env,
      {
        address: token,
        fromBlock:
          "0x" +
          recentFrom.toString(16),
        toBlock:
          "0x" +
          latestBlock.toString(16)
      }
    ),
    getLogsSafe(
      env,
      {
        address: token,
        fromBlock:
          "0x" +
          previousFrom.toString(16),
        toBlock:
          "0x" +
          previousTo.toString(16)
      }
    )
  ]);

  const recentTransfers =
    recent.logs.filter(
      log =>
        log.topics?.[0]?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const previousTransfers =
    previous.logs.filter(
      log =>
        log.topics?.[0]?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const wallets = [];

  for (const log of recentTransfers) {
    const from =
      topicToAddress(
        log.topics?.[1]
      );

    const to =
      topicToAddress(
        log.topics?.[2]
      );

    if (from) wallets.push(from);
    if (to) wallets.push(to);
  }

  const recentCount =
    recent.logs.length;

  const previousCount =
    previous.logs.length;

  const activityAcceleration =
    previousCount > 0
      ? recentCount /
        previousCount
      : recentCount > 0
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
    recentActivity:
      recentCount,

    previousActivity:
      previousCount,

    activityAcceleration,

    recentTransfers:
      recentTransfers.length,

    previousTransfers:
      previousTransfers.length,

    transferAcceleration,

    uniqueWallets:
      unique(wallets).length,

    rpcErrors: [
      recent.error,
      previous.error
    ].filter(Boolean)
  };
}

/*
==================================================
POOL MATCHING
==================================================
*/

function findPoolsForToken(
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

  if (candidate.recentTransfers > 0) {
    score += Math.min(
      5,
      Math.ceil(
        candidate.recentTransfers / 20
      )
    );
  }

  return Math.min(100, score);
}

/*
==================================================
CANDIDATE BUILDER
==================================================
*/

async function buildCandidate(
  env,
  token,
  latestBlock,
  initializeEvents,
  launchInfo
) {
  const address =
    normaliseAddress(token);

  /*
    CRITICAL V53 SAFETY:
    A Telegram candidate can never be zero.
  */

  if (!address) {
    return null;
  }

  const metadata =
    await getERC20Metadata(
      env,
      address
    );

  if (!metadata.validERC20) {
    return null;
  }

  const pools =
    findPoolsForToken(
      address,
      initializeEvents
    );

  const activity =
    await getTokenActivity(
      env,
      address,
      latestBlock
    );

  const candidate = {
    address,

    ...metadata,

    launchEvidence:
      !!launchInfo,

    launchSource:
      launchInfo?.source ||
      null,

    launchContract:
      launchInfo?.contract ||
      null,

    launchTx:
      launchInfo?.txHash ||
      null,

    launchBlock:
      launchInfo?.blockNumber ||
      null,

    launchTopic:
      launchInfo?.topic0 ||
      null,

    poolCount:
      pools.length,

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

    isNativePair:
      pools.some(
        pool =>
          isZeroAddress(
            pool.currency0
          ) ||
          isZeroAddress(
            pool.currency1
          )
      ),

    pools:
      pools.map(pool => ({
        poolId:
          pool.poolId,

        currency0:
          pool.currency0,

        currency1:
          pool.currency1,

        fee:
          pool.fee,

        tickSpacing:
          pool.tickSpacing,

        hooks:
          pool.hooks,

        tick:
          pool.tick,

        txHash:
          pool.txHash,

        blockNumber:
          pool.blockNumber
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
    Telegram must NEVER receive:
    0x0000000000000000000000000000000000000000
  */

  const address =
    normaliseAddress(
      candidate?.address
    );

  if (!address) {
    return {
      sent: false,
      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    !candidate.validERC20
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_UNVERIFIED_ERC20"
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
    `🪙 ${candidate.name || "Unknown"}`,
    `🔹 ${candidate.symbol || "UNKNOWN"}`,
    "",
    `📍 Contract: ${address}`,
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
      Number.isFinite(
        candidate.activityAcceleration
      )
        ? candidate.activityAcceleration.toFixed(2) + "x"
        : "UNVERIFIED"
    }`,
    `📈 Transfer acceleration: ${
      Number.isFinite(
        candidate.transferAcceleration
      )
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
    "V53 — Broad Launch + V4 Discovery"
  ].join("\n");

  try {
    const response =
      await fetch(
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

            text:
              message
          })
        }
      );

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.ok
    ) {
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

  const [
    v4,
    broadDiscovery,
    exactEvents
  ] = await Promise.all([
    getV4Activity(
      env,
      latestBlock
    ),

    scanLaunchContracts(
      env,
      latestBlock
    ),

    scanExactEvents(
      env,
      latestBlock
    )
  ]);

  const tokenMap =
    new Map();

  /*
    1. Broad launchpad discovery
  */

  for (
    const [
      token,
      info
    ] of broadDiscovery.candidates
  ) {
    tokenMap.set(
      token,
      info
    );
  }

  /*
    2. Exact event discovery
  */

  for (
    const event of
      exactEvents.events
  ) {
    const addresses =
      extractAddressesFromLog(
        event.log
      );

    for (const token of addresses) {
      if (!tokenMap.has(token)) {
        tokenMap.set(
          token,
          {
            token,

            source:
              event.type,

            contract:
              event.log.address,

            txHash:
              event.log.transactionHash ||
              null,

            blockNumber:
              event.log.blockNumber ||
              null,

            topic0:
              event.log.topics?.[0] ||
              null
          }
        );
      }
    }
  }

  /*
    3. V4 pool discovery
  */

  for (
    const pool of
      v4.initializeEvents
  ) {
    for (
      const currency of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      const token =
        normaliseAddress(
          currency
        );

      if (
        token &&
        !tokenMap.has(token)
      ) {
        tokenMap.set(
          token,
          {
            token,

            source:
              "V4_POOL_DISCOVERY",

            contract:
              POOL_MANAGER,

            txHash:
              pool.txHash,

            blockNumber:
              pool.blockNumber
          }
        );
      }
    }
  }

  const addresses =
    [...tokenMap.keys()]
      .filter(
        address =>
          normaliseAddress(address)
      )
      .slice(
        0,
        MAX_CANDIDATES
      );

  const validationResults =
    [];

  const candidates =
    [];

  /*
    Verify addresses one-by-one before
    allowing them into candidate scoring.
  */

  for (
    const token of addresses
  ) {
    const metadata =
      await getERC20Metadata(
        env,
        token
      );

    validationResults.push({
      address: token,
      ...metadata
    });

    if (
      !metadata.validERC20
    ) {
      continue;
    }

    const candidate =
      await buildCandidate(
        env,
        token,
        latestBlock,
        v4.initializeEvents,
        tokenMap.get(token)
      );

    if (
      candidate &&
      candidate.address !==
        ZERO_ADDRESS
    ) {
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
        normaliseAddress(
          candidate.address
        ) &&
        candidate.validERC20
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
          broadDiscovery.fromBlock,

        toBlock:
          broadDiscovery.toBlock,

        blocks:
          broadDiscovery.toBlock -
          broadDiscovery.fromBlock +
          1
      },

      launchpadDiscovery: {
        contractsChecked:
          broadDiscovery.observations.length,

        observations:
          broadDiscovery.observations
      },

      exactEventDiscovery: {
        eventsFound:
          exactEvents.events.length
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

        rpcError:
          v4.rpcError
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

      telegramCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        launchDetection:
          "BROAD_LOG_DISCOVERY_PLUS_EXACT_EVENT_VERIFICATION",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

        poolDetection:
          "V4_INITIALIZE_PLUS_LAUNCHPAD_EVIDENCE",

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
        "V53_BROAD_LAUNCHPAD_LOGS_PLUS_EXACT_EVENTS_PLUS_UNISWAP_V4",

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

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls:
        true,

      minimumScore:
        TELEGRAM_THRESHOLD,

      tokenVerification:
        "REQUIRED"
    },

    architecture:
      "V53_BROAD_DISCOVERY_VERIFIED_TOKEN_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
TELEGRAM TEST
==================================================
*/

async function testTelegram(env) {
  /*
    Deliberately use a real-looking but INVALID
    zero address here only to prove V53 blocks it.
  */

  const blocked =
    await sendTelegram(
      env,
      {
        address:
          ZERO_ADDRESS,

        validERC20:
          false,

        score:
          100
      }
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      blocked.sent === false,

    safetyTest:
      "ZERO_ADDRESS_BLOCKED",

    response:
      blocked,

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
