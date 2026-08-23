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
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const MINT_FAST_LAUNCHPAD =
  "0xd61998ae9b29e1f19dfb70ba890bc85895c83f1b";

const ALL_LAUNCH_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

/*
==================================================
ERC20 TRANSFER TOPIC
==================================================
*/

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a9b523b3ef";

/*
==================================================
DISCOVERY EVENT TOPICS
==================================================
*/

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const DISTRIBUTION_INITIALIZED_TOPIC =
  "0x0afd26d7f0833a451173acef122d058906aa7708ceb6f67ea7471a649d88b44b";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

/*
==================================================
CONFIG
==================================================
*/

const TELEGRAM_THRESHOLD = 60;

const ACTIVITY_BLOCKS = 999;

const DISCOVERY_BLOCKS = 500;

const MAX_CANDIDATES = 50;

/*
==================================================
ADDRESS HELPERS
==================================================
*/

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(address) {
  return (
    !address ||
    address.toLowerCase() === ZERO_ADDRESS
  );
}

function cleanAddress(value, allowZero = false) {
  if (
    !value ||
    typeof value !== "string"
  ) {
    return null;
  }

  let v = value.toLowerCase();

  if (!v.startsWith("0x")) {
    return null;
  }

  if (v.length !== 66) {
    return null;
  }

  const body = v.slice(2);

  if (!/^[0-9a-f]{64}$/.test(body)) {
    return null;
  }

  const address =
    "0x" + body.slice(24);

  if (
    !allowZero &&
    isZeroAddress(address)
  ) {
    return null;
  }

  return address;
}

function topicToAddress(
  topic,
  allowZero = false
) {
  return cleanAddress(
    topic,
    allowZero
  );
}

function validTokenCandidate(address) {
  if (!isAddress(address)) {
    return false;
  }

  const a =
    address.toLowerCase();

  if (
    a === ZERO_ADDRESS ||
    /^0x0{38,}$/i.test(a)
  ) {
    return false;
  }

  return true;
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

/*
==================================================
HEX / ABI HELPERS
==================================================
*/

function splitWords(data) {
  if (
    !data ||
    typeof data !== "string"
  ) {
    return [];
  }

  const clean =
    data.startsWith("0x")
      ? data.slice(2)
      : data;

  const words = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    words.push(
      "0x" +
      clean.slice(
        i,
        i + 64
      )
    );
  }

  return words;
}

function decodeUint24(hex) {
  try {
    return Number(
      BigInt(hex) &
      0xffffffn
    );
  } catch {
    return null;
  }
}

function decodeInt24(hex) {
  try {
    let n = BigInt(hex);

    if (
      n >=
      (1n << 23n)
    ) {
      n -=
        1n << 24n;
    }

    return Number(n);
  } catch {
    return null;
  }
}

function decodeInt128(hex) {
  try {
    let n = BigInt(hex);

    if (
      n >=
      (1n << 127n)
    ) {
      n -=
        1n << 128n;
    }

    return n.toString();
  } catch {
    return null;
  }
}

/*
==================================================
RPC
==================================================
*/

async function rpc(
  env,
  method,
  params = []
) {
  const apiKey =
    env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ALCHEMY_API_KEY secret is missing"
    );
  }

  const rpcUrl =
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    apiKey;

  const response =
    await fetch(
      rpcUrl,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body:
          JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params
          })
      }
    );

  if (!response.ok) {
    throw new Error(
      `Alchemy HTTP ${response.status}`
    );
  }

  const json =
    await response.json();

  if (json.error) {
    throw new Error(
      `${method}: ${
        json.error.message ||
        "RPC error"
      }`
    );
  }

  return json.result;
}

async function getLatestBlock(env) {
  const block =
    await rpc(
      env,
      "eth_blockNumber"
    );

  return Number(
    BigInt(block)
  );
}

async function getLogs(
  env,
  filter
) {
  try {
    return (
      await rpc(
        env,
        "eth_getLogs",
        [filter]
      )
    ) || [];
  } catch {
    return [];
  }
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
UNISWAP V4 INITIALIZE
==================================================
*/

function looksLikeInitialize(log) {
  if (!log) {
    return false;
  }

  if (
    log.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) {
    return false;
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics.length !== 4
  ) {
    return false;
  }

  const words =
    splitWords(log.data);

  if (words.length !== 5) {
    return false;
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
    currency0 === null ||
    currency1 === null
  ) {
    return false;
  }

  if (
    currency0.toLowerCase() ===
    currency1.toLowerCase()
  ) {
    return false;
  }

  return true;
}

function decodeInitialize(log) {
  if (
    !looksLikeInitialize(log)
  ) {
    return null;
  }

  const words =
    splitWords(log.data);

  return {
    poolId:
      log.topics[1],

    currency0:
      topicToAddress(
        log.topics[2],
        true
      ),

    currency1:
      topicToAddress(
        log.topics[3],
        true
      ),

    fee:
      decodeUint24(
        words[0]
      ),

    tickSpacing:
      decodeInt24(
        words[1]
      ),

    hooks:
      topicToAddress(
        words[2],
        true
      ),

    sqrtPriceX96:
      words[3],

    tick:
      decodeInt24(
        words[4]
      ),

    txHash:
      log.transactionHash ||
      null,

    blockNumber:
      log.blockNumber ||
      null,

    logIndex:
      log.logIndex ||
      null
  };
}

/*
==================================================
UNISWAP V4 SWAP
==================================================
*/

function looksLikeSwap(log) {
  if (!log) {
    return false;
  }

  if (
    log.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) {
    return false;
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics.length !== 3
  ) {
    return false;
  }

  const words =
    splitWords(log.data);

  return words.length === 7;
}

function decodeSwap(log) {
  if (!looksLikeSwap(log)) {
    return null;
  }

  const words =
    splitWords(log.data);

  return {
    poolId:
      log.topics[1],

    sender:
      topicToAddress(
        log.topics[2],
        true
      ),

    amount0:
      decodeInt128(
        words[0]
      ),

    amount1:
      decodeInt128(
        words[1]
      ),

    sqrtPriceX96:
      words[2],

    liquidity:
      words[3],

    tick:
      decodeInt24(
        words[4]
      ),

    fee:
      decodeUint24(
        words[5]
      ),

    txHash:
      log.transactionHash ||
      null,

    blockNumber:
      log.blockNumber ||
      null
  };
}

/*
==================================================
ERC20 METADATA
==================================================
*/

const SELECTORS = {
  name:
    "0x06fdde03",

  symbol:
    "0x95d89b41",

  decimals:
    "0x313ce567",

  totalSupply:
    "0x18160ddd"
};

function hexToUtf8(hex) {
  try {
    const bytes = [];

    for (
      let i = 0;
      i + 2 <= hex.length;
      i += 2
    ) {
      const n =
        parseInt(
          hex.slice(
            i,
            i + 2
          ),
          16
        );

      if (n !== 0) {
        bytes.push(n);
      }
    }

    return (
      new TextDecoder()
        .decode(
          new Uint8Array(bytes)
        )
        .trim() ||
      null
    );
  } catch {
    return null;
  }
}

function decodeBytes32String(result) {
  if (
    !result ||
    result === "0x"
  ) {
    return null;
  }

  try {
    return hexToUtf8(
      result.slice(
        2,
        66
      )
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
    const hex =
      result.slice(2);

    if (
      hex.length >= 128
    ) {
      const offset =
        Number(
          BigInt(
            "0x" +
            hex.slice(
              0,
              64
            )
          )
        );

      const lenPos =
        offset * 2;

      if (
        Number.isFinite(offset) &&
        lenPos + 64 <=
          hex.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              hex.slice(
                lenPos,
                lenPos + 64
              )
            )
          );

        const start =
          lenPos + 64;

        const end =
          start +
          length * 2;

        if (
          end <=
          hex.length
        ) {
          return hexToUtf8(
            hex.slice(
              start,
              end
            )
          );
        }
      }
    }

    return decodeBytes32String(
      result
    );

  } catch {
    return null;
  }
}

async function getERC20Metadata(
  env,
  address
) {
  if (
    !validTokenCandidate(address)
  ) {
    return {
      validERC20: false
    };
  }

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] =
    await Promise.all([
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
    if (
      decimalsRaw &&
      decimalsRaw !== "0x"
    ) {
      decimals =
        Number(
          BigInt(
            decimalsRaw
          )
        );
    }
  } catch {}

  let totalSupply = null;

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

  const validERC20 =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20,

    name:
      name
        ? name.slice(0, 100)
        : null,

    symbol:
      symbol
        ? symbol.slice(0, 50)
        : null,

    decimals,

    totalSupply
  };
}

/*
==================================================
POOLS.TRADE TOKEN DISCOVERY
==================================================
*/

async function getPoolsTradeLaunches(
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

  const logs =
    await getLogs(
      env,
      {
        address:
          ENTRY_CONTRACTS,

        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          latestBlock.toString(16),

        topics: [
          POOLS_TOKEN_CREATED_TOPIC
        ]
      }
    );

  const launches = [];

  for (
    const log of logs
  ) {
    if (
      !log.topics ||
      log.topics.length < 2
    ) {
      continue;
    }

    const possible =
      [];

    for (
      const topic of
        log.topics.slice(1)
    ) {
      const address =
        topicToAddress(topic);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const word of
        splitWords(log.data)
    ) {
      const address =
        topicToAddress(word);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const token of
        unique(possible)
    ) {
      if (
        !validTokenCandidate(token)
      ) {
        continue;
      }

      launches.push({
        token:
          token.toLowerCase(),

        source:
          "POOLS_TRADE",

        entryContract:
          log.address,

        txHash:
          log.transactionHash ||
          null,

        blockNumber:
          log.blockNumber ||
          null,

        logIndex:
          log.logIndex ||
          null,

        event:
          "TokenCreated"
      });
    }
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    rawEvents:
      logs.length,

    launches
  };
}

/*
==================================================
POOLS.TRADE DISTRIBUTION / LAUNCH EVIDENCE
==================================================
*/

async function getPoolsTradeEvidence(
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

  const [
    distributed,
    launched
  ] =
    await Promise.all([
      getLogs(
        env,
        {
          address:
            ENTRY_CONTRACTS,

          fromBlock:
            "0x" +
            fromBlock.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16),

          topics: [
            POOLS_TOKEN_DISTRIBUTED_TOPIC
          ]
        }
      ),

      getLogs(
        env,
        {
          address:
            LAUNCHPADS,

          fromBlock:
            "0x" +
            fromBlock.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16),

          topics: [
            POOLS_TOKEN_LAUNCHED_TOPIC
          ]
        }
      )
    ]);

  const tokenEvidence =
    new Map();

  for (
    const log of distributed
  ) {
    const possible =
      [];

    for (
      const topic of
        log.topics.slice(1)
    ) {
      const address =
        topicToAddress(topic);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const word of
        splitWords(log.data)
    ) {
      const address =
        topicToAddress(word);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const token of
        unique(possible)
    ) {
      tokenEvidence.set(
        token.toLowerCase(),
        {
          source:
            "POOLS_TRADE_DISTRIBUTION",

          type:
            "TokenDistributed",

          contract:
            log.address,

          txHash:
            log.transactionHash ||
            null,

          blockNumber:
            log.blockNumber ||
            null
        }
      );
    }
  }

  for (
    const log of launched
  ) {
    const possible =
      [];

    for (
      const topic of
        log.topics.slice(1)
    ) {
      const address =
        topicToAddress(topic);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const word of
        splitWords(log.data)
    ) {
      const address =
        topicToAddress(word);

      if (address) {
        possible.push(address);
      }
    }

    for (
      const address of
        unique(possible)
    ) {
      tokenEvidence.set(
        address.toLowerCase(),
        {
          source:
            "POOLS_TRADE_LAUNCHPAD",

          type:
            "TokenLaunched",

          contract:
            log.address,

          txHash:
            log.transactionHash ||
            null,

          blockNumber:
            log.blockNumber ||
            null
        }
      );
    }
  }

  return {
    distributedEvents:
      distributed.length,

    launchEvents:
      launched.length,

    tokenEvidence
  };
}

/*
==================================================
MINT.FAST DISCOVERY
==================================================
*/

async function getMintFastLaunches(
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

  const logs =
    await getLogs(
      env,
      {
        address:
          MINT_FAST_LAUNCHPAD,

        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          latestBlock.toString(16),

        topics: [
          MINT_FAST_TOKEN_CREATED_TOPIC
        ]
      }
    );

  const launches = [];

  for (
    const log of logs
  ) {
    const addresses =
      [];

    for (
      const topic of
        log.topics.slice(1)
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
        topicToAddress(word);

      if (address) {
        addresses.push(address);
      }
    }

    for (
      const token of
        unique(addresses)
    ) {
      if (
        !validTokenCandidate(token)
      ) {
        continue;
      }

      launches.push({
        token:
          token.toLowerCase(),

        source:
          "MINT_FAST",

        launchpad:
          MINT_FAST_LAUNCHPAD,

        txHash:
          log.transactionHash ||
          null,

        blockNumber:
          log.blockNumber ||
          null,

        event:
          "TokenCreated"
      });
    }
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    rawEvents:
      logs.length,

    launches
  };
}

/*
==================================================
V4 POOL SCAN
==================================================
*/

async function getPoolManagerActivity(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock - 20
    );

  const logs =
    await getLogs(
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

  const initializeEvents =
    [];

  const swapEvents =
    [];

  for (
    const log of logs
  ) {
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
      swapEvents.push(
        swap
      );
    }
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    rawLogs:
      logs.length,

    initializeEvents,

    swapEvents
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
    recentLogs,
    previousLogs
  ] =
    await Promise.all([
      getLogs(
        env,
        {
          address:
            token,

          fromBlock:
            "0x" +
            recentFrom.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16)
        }
      ),

      getLogs(
        env,
        {
          address:
            token,

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
    recentLogs.filter(
      log =>
        log.topics?.[0]
          ?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const previousTransfers =
    previousLogs.filter(
      log =>
        log.topics?.[0]
          ?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const wallets = [];

  for (
    const log of
      recentTransfers
  ) {
    const from =
      topicToAddress(
        log.topics[1],
        true
      );

    const to =
      topicToAddress(
        log.topics[2],
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

  const recentCount =
    recentLogs.length;

  const previousCount =
    previousLogs.length;

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

    window: {
      recentFrom,

      recentTo:
        latestBlock,

      previousFrom,

      previousTo
    }
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
      pool.currency0
        ?.toLowerCase() ===
        target ||
      pool.currency1
        ?.toLowerCase() ===
        target
  );
}

/*
==================================================
SCORING
==================================================
*/

function scoreCandidate(
  candidate
) {
  let score = 0;

  if (
    candidate.validERC20
  ) {
    score += 20;
  }

  if (
    candidate.name
  ) {
    score += 5;
  }

  if (
    candidate.symbol
  ) {
    score += 5;
  }

  if (
    candidate.launchEvidence
  ) {
    score += 15;
  }

  if (
    candidate.poolCount > 0
  ) {
    score += 10;
  }

  if (
    candidate.recentActivity > 0
  ) {
    score += Math.min(
      10,
      Math.ceil(
        candidate.recentActivity /
        10
      )
    );
  }

  if (
    candidate.uniqueWallets > 0
  ) {
    score += Math.min(
      10,
      candidate.uniqueWallets
    );
  }

  if (
    candidate.activityAcceleration >
    1
  ) {
    score += Math.min(
      10,
      Math.floor(
        candidate.activityAcceleration *
        2
      )
    );
  }

  if (
    candidate.transferAcceleration >
    1
  ) {
    score += Math.min(
      5,
      Math.floor(
        candidate.transferAcceleration
      )
    );
  }

  if (
    candidate.recentTransfers > 0
  ) {
    score += Math.min(
      5,
      Math.ceil(
        candidate.recentTransfers /
        20
      )
    );
  }

  return Math.min(
    100,
    score
  );
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
  evidence
) {
  const metadata =
    await getERC20Metadata(
      env,
      token
    );

  if (
    !metadata.validERC20
  ) {
    return null;
  }

  const pools =
    findPoolsForToken(
      token,
      initializeEvents
    );

  const activity =
    await getTokenActivity(
      env,
      token,
      latestBlock
    );

  const candidate = {
    address:
      token.toLowerCase(),

    ...metadata,

    launchEvidence:
      !!evidence,

    launchSource:
      evidence?.source ||
      null,

    launchTx:
      evidence?.txHash ||
      null,

    launchBlock:
      evidence?.blockNumber ||
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
      pools.map(
        pool => ({
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
        })
      )
  };

  candidate.score =
    scoreCandidate(
      candidate
    );

  return candidate;
}

/*
==================================================
TELEGRAM VERIFICATION
==================================================
*/

function isVerifiedTelegramCandidate(
  candidate
) {
  if (!candidate) {
    return false;
  }

  const address =
    candidate.address;

  /*
    HARD ADDRESS CHECK
  */

  if (
    !isAddress(address)
  ) {
    return false;
  }

  if (
    isZeroAddress(address)
  ) {
    return false;
  }

  if (
    !validTokenCandidate(address)
  ) {
    return false;
  }

  /*
    HARD ERC20 CHECK
  */

  if (
    candidate.validERC20 !== true
  ) {
    return false;
  }

  /*
    REQUIRE REAL ON-CHAIN EVIDENCE
  */

  const hasDiscovery =
    candidate.launchEvidence === true ||
    candidate.poolInitialized === true;

  const hasActivity =
    candidate.recentTransfers > 0 ||
    candidate.recentActivity > 0;

  if (
    !hasDiscovery &&
    !hasActivity
  ) {
    return false;
  }

  return true;
}

function getTelegramCandidates(
  candidates
) {
  return candidates
    .filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD
    )
    .filter(
      candidate =>
        isVerifiedTelegramCandidate(
          candidate
        )
    )
    .sort(
      (a, b) =>
        b.score -
        a.score
    );
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

  /*
    NEVER SEND UNVERIFIED TOKEN
  */

  if (
    !isVerifiedTelegramCandidate(
      candidate
    )
  ) {
    return {
      sent: false,

      reason:
        "TOKEN_NOT_VERIFIED_FOR_TELEGRAM",

      token:
        candidate?.address ||
        null
    };
  }

  const message =
    [
      "🚨 ROBINHOOD CHAIN MEME HUNTER",
      "",
      `🧪 Score: ${candidate.score}/100`,
      `🪙 ${candidate.name || "Unknown"}`,
      `🔹 ${candidate.symbol || "UNKNOWN"}`,
      "",
      `📍 Token: ${candidate.address}`,
      "",
      `🚀 Source: ${
        candidate.launchSource ||
        "ON-CHAIN DISCOVERY"
      }`,
      `🏊 Pools: ${candidate.poolCount}`,
      `📊 Recent activity: ${
        candidate.recentActivity
      }`,
      `👥 Unique wallets: ${
        candidate.uniqueWallets
      }`,
      `🔄 Transfers: ${
        candidate.recentTransfers
      }`,
      `⚡ Activity acceleration: ${
        Number.isFinite(
          candidate.activityAcceleration
        )
          ? candidate.activityAcceleration.toFixed(2) +
            "x"
          : "UNVERIFIED"
      }`,
      `📈 Transfer acceleration: ${
        Number.isFinite(
          candidate.transferAcceleration
        )
          ? candidate.transferAcceleration.toFixed(2) +
            "x"
          : "UNVERIFIED"
      }`,
      "",
      candidate.launchEvidence
        ? "✅ Launch evidence: VERIFIED"
        : "ℹ️ Launch evidence: NONE",
      candidate.poolInitialized
        ? "✅ V4 pool: VERIFIED"
        : "ℹ️ V4 pool: NONE",
      "",
      "⚠️ Market cap: UNVERIFIED",
      "⚠️ Liquidity: UNVERIFIED",
      "⚠️ Holder concentration: UNVERIFIED",
      "⚠️ Smart money: UNVERIFIED",
      "⚠️ Whale activity: UNVERIFIED",
      "⚠️ Social momentum: UNVERIFIED",
      "",
      "V52 — Verified Token Alert"
    ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "POST",

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
    await getLatestBlock(
      env
    );

  const [
    poolData,
    poolsTrade,
    poolsEvidence,
    mintFast
  ] =
    await Promise.all([
      getPoolManagerActivity(
        env,
        latestBlock
      ),

      getPoolsTradeLaunches(
        env,
        latestBlock
      ),

      getPoolsTradeEvidence(
        env,
        latestBlock
      ),

      getMintFastLaunches(
        env,
        latestBlock
      )
    ]);

  const tokenMap =
    new Map();

  /*
    POOLS.TRADE TOKEN CREATION
  */

  for (
    const launch of
      poolsTrade.launches
  ) {
    if (
      validTokenCandidate(
        launch.token
      )
    ) {
      tokenMap.set(
        launch.token,
        launch
      );
    }
  }

  /*
    MINT.FAST
  */

  for (
    const launch of
      mintFast.launches
  ) {
    if (
      validTokenCandidate(
        launch.token
      )
    ) {
      tokenMap.set(
        launch.token,
        launch
      );
    }
  }

  /*
    POOLS.TRADE EVIDENCE
  */

  for (
    const [
      token,
      evidence
    ] of
      poolsEvidence.tokenEvidence
  ) {
    if (
      validTokenCandidate(
        token
      ) &&
      !tokenMap.has(token)
    ) {
      tokenMap.set(
        token,
        {
          token,

          source:
            evidence.source ||
            "POOLS_TRADE_EVIDENCE",

          txHash:
            evidence.txHash ||
            null,

          blockNumber:
            evidence.blockNumber ||
            null
        }
      );
    }
  }

  /*
    V4 INITIALIZE CURRENCIES
  */

  for (
    const pool of
      poolData.initializeEvents
  ) {
    for (
      const currency of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        currency &&
        !isZeroAddress(currency) &&
        validTokenCandidate(currency)
      ) {
        const key =
          currency.toLowerCase();

        if (
          !tokenMap.has(key)
        ) {
          tokenMap.set(
            key,
            {
              token:
                key,

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
  }

  /*
    LIMIT CANDIDATES
  */

  const addresses =
    [
      ...tokenMap.keys()
    ].slice(
      0,
      MAX_CANDIDATES
    );

  const candidates =
    [];

  const validationResults =
    [];

  /*
    VALIDATE EVERY CANDIDATE
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
      address:
        token,

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
        poolData.initializeEvents,
        tokenMap.get(token)
      );

    if (candidate) {
      candidates.push(
        candidate
      );
    }
  }

  /*
    HIGHEST SCORE FIRST
  */

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  /*
    NORMAL QUALIFYING CANDIDATES
  */

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD
    );

  /*
    TELEGRAM-SAFE CANDIDATES
  */

  const telegramCandidates =
    getTelegramCandidates(
      candidates
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    telegramCandidates.length >
    0
  ) {
    telegramResult =
      await sendTelegram(
        env,
        telegramCandidates[0]
      );
  }

  /*
    RESULT
  */

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
          poolsTrade.fromBlock,

        toBlock:
          poolsTrade.toBlock,

        blocks:
          poolsTrade.toBlock -
          poolsTrade.fromBlock +
          1
      },

      poolsTrade: {
        entryContracts:
          ENTRY_CONTRACTS,

        rawTokenCreatedEvents:
          poolsTrade.rawEvents,

        launchesFound:
          poolsTrade.launches.length,

        distributedEvents:
          poolsEvidence.distributedEvents,

        tokenLaunchedEvents:
          poolsEvidence.launchEvents
      },

      mintFast: {
        launchpad:
          MINT_FAST_LAUNCHPAD,

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
              x =>
                x.poolId
            )
          ).length,

        uniqueSwapSenders:
          unique(
            poolData.swapEvents
              .map(
                x =>
                  x.sender
              )
              .filter(Boolean)
          ).length
      },

      uniqueTokenCandidates:
        tokenMap.size,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x =>
            x.validERC20
        ).length,

      validationResults,

      candidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegramCandidates:
        telegramCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        launchDetection:
          "ON_CHAIN_EVENT_VERIFIED",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

        poolDetection:
          "V4_INITIALIZE_OR_LAUNCHPAD_EVIDENCE",

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
        "POOLS_TRADE_TOKEN_CREATED_PLUS_MINT_FAST_PLUS_UNISWAP_V4_V52",

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
  let latestBlock =
    null;

  let rpcStatus =
    "UNKNOWN";

  if (
    env.ALCHEMY_API_KEY
  ) {
    try {
      latestBlock =
        await getLatestBlock(
          env
        );

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
      "V52_VERIFIED_LAUNCH_EVENT_V4_ACTIVITY_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
TELEGRAM TEST
==================================================

IMPORTANT:
This route sends a TEST message only.
It does NOT call sendTelegram() and therefore
cannot accidentally send the zero address as a
real token alert.
==================================================
*/

async function testTelegram(env) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      error:
        "Telegram secrets missing"
    };
  }

  const message =
    [
      "🧪 ROBINHOOD CHAIN MEME HUNTER — TEST",
      "",
      "✅ Telegram connection working",
      "",
      `🤖 Agent: Robinhood Chain Meme Hunter`,
      `📦 Version: ${VERSION}`,
      "",
      "⚠️ TEST MESSAGE ONLY",
      "No token was detected.",
      "",
      "Real alerts require:",
      "✅ Valid contract address",
      "✅ Non-zero address",
      "✅ Verified ERC20",
      "✅ Real on-chain evidence",
      "✅ Score ≥ 60",
      "",
      "V52 — Telegram Safety Test"
    ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response =
      await fetch(
        url,
        {
          method:
            "POST",

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

    const result =
      await response.json();

    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        response.ok &&
        result.ok,

      response: {
        sent:
          response.ok &&
          result.ok,

        messageId:
          result.result?.message_id ||
          null,

        reason:
          result.description ||
          null
      },

      timestamp:
        new Date().toISOString()
    };

  } catch (error) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      response: {
        sent: false,

        reason:
          error?.message ||
          "TELEGRAM_REQUEST_FAILED"
      },

      timestamp:
        new Date().toISOString()
    };
  }
}

/*
==================================================
WORKER
==================================================
*/

export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    try {
      /*
      ==============================================
      HEALTH
      ==============================================
      */

      if (
        url.pathname ===
        "/health"
      ) {
        return json(
          await health(
            env
          )
        );
      }

      /*
      ==============================================
      SCAN
      ==============================================
      */

      if (
        url.pathname ===
        "/scan"
      ) {
        return json(
          await scan(
            env
          )
        );
      }

      /*
      ==============================================
      TELEGRAM TEST
      ==============================================
      */

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return json(
          await testTelegram(
            env
          )
        );
      }

      /*
      ==============================================
      DEFAULT
      ==============================================
      */

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

/*
==================================================
JSON RESPONSE
==================================================
*/

function json(
  data,
  status = 200
) {
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
