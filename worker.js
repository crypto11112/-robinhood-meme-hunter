const VERSION = "V50";

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

const ACTIVITY_BLOCKS = 999;

const TELEGRAM_THRESHOLD = 60;

const MAX_POOL_TOKENS = 30;

const MAX_LAUNCHPAD_CANDIDATES = 40;

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f714f8b3f3c6b9c5b6f5b6f6c6e6f7f8f9f0f1f2f3f4f";

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
  if (!value || typeof value !== "string") {
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

  if (!allowZero && isZeroAddress(address)) {
    return null;
  }

  return address;
}

function topicToAddress(topic, allowZero = false) {
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

  if (
    a ===
      "0x0000000000000000000000000000000000000001" ||
    a ===
      "0x0000000000000000000000000000000000000064" ||
    a ===
      "0x0000000000000000000000000000000000002710"
  ) {
    return false;
  }

  return true;
}

function splitWords(data) {
  if (!data || typeof data !== "string") {
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
        clean.slice(i, i + 64)
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
    let n =
      BigInt(hex);

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
    let n =
      BigInt(hex);

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
  Uniswap V4 Initialize:

  Initialize(
    bytes32 indexed id,
    address indexed currency0,
    address indexed currency1,
    uint24 fee,
    int24 tickSpacing,
    address hooks,
    uint160 sqrtPriceX96,
    int24 tick
  )

  topics:
    [0] event signature
    [1] pool id
    [2] currency0
    [3] currency1

  data:
    5 ABI words
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

  /*
    V4 currencies are sorted.
    Zero/native currency is allowed.
  */

  const a =
    currency0.toLowerCase();

  const b =
    currency1.toLowerCase();

  if (a === b) {
    return false;
  }

  if (
    a !== ZERO_ADDRESS &&
    b !== ZERO_ADDRESS &&
    a >= b
  ) {
    return false;
  }

  const fee =
    decodeUint24(words[0]);

  const tickSpacing =
    decodeInt24(words[1]);

  const hooks =
    topicToAddress(
      words[2],
      true
    );

  const sqrtPrice =
    words[3];

  const tick =
    decodeInt24(words[4]);

  if (
    fee === null ||
    tickSpacing === null ||
    !hooks ||
    !sqrtPrice ||
    tick === null
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
      log.topics[1] || null,

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
      decodeUint24(words[0]),

    tickSpacing:
      decodeInt24(words[1]),

    hooks:
      topicToAddress(
        words[2],
        true
      ),

    sqrtPriceX96:
      words[3],

    tick:
      decodeInt24(words[4]),

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
  Uniswap V4 Swap:

  Swap(
    bytes32 indexed id,
    address indexed sender,
    int128 amount0,
    int128 amount1,
    uint160 sqrtPriceX96,
    uint128 liquidity,
    int24 tick,
    uint24 fee
  )

  topics = 3
  data = 7 ABI words
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

  if (words.length !== 7) {
    return false;
  }

  const poolId =
    log.topics[1];

  const sender =
    topicToAddress(
      log.topics[2],
      true
    );

  if (
    !poolId ||
    !sender
  ) {
    return false;
  }

  return true;
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
        method:
          "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body:
          JSON.stringify({
            jsonrpc:
              "2.0",

            id:
              Date.now(),

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

async function getPoolManagerLogs(
  env,
  fromBlock,
  toBlock
) {
  return getLogs(
    env,
    {
      address:
        POOL_MANAGER,

      fromBlock:
        "0x" +
        fromBlock.toString(16),

      toBlock:
        "0x" +
        toBlock.toString(16)
    }
  );
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

    /*
      Standard ABI dynamic string.
    */

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

      if (
        Number.isFinite(
          offset
        )
      ) {
        const lenPos =
          offset * 2;

        if (
          lenPos + 64 <=
          hex.length
        ) {
          const length =
            Number(
              BigInt(
                "0x" +
                  hex.slice(
                    lenPos,
                    lenPos +
                      64
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
    }

    /*
      bytes32 / fixed bytes fallback.
    */

    return decodeBytes32String(
      result
    );
  } catch {
    return null;
  }
}

function hexToUtf8(hex) {
  try {
    let bytes =
      [];

    for (
      let i = 0;
      i + 2 <=
      hex.length;
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

      if (
        n !== 0
      ) {
        bytes.push(n);
      }
    }

    return (
      new TextDecoder()
        .decode(
          new Uint8Array(
            bytes
          )
        )
        .trim() ||
      null
    );
  } catch {
    return null;
  }
}

function decodeBytes32String(
  result
) {
  if (
    !result ||
    result === "0x"
  ) {
    return null;
  }

  try {
    const hex =
      result.slice(
        2,
        66
      );

    return (
      hexToUtf8(
        hex
      ) ||
      null
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
    !validTokenCandidate(
      address
    )
  ) {
    return {
      validERC20:
        false
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
    decodeString(
      nameRaw
    );

  const symbol =
    decodeString(
      symbolRaw
    );

  let decimals =
    null;

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

  let totalSupply =
    null;

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
    totalSupply !== null;

  return {
    validERC20:
      valid,

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

async function getRecentTokenLogs(
  env,
  token,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        ACTIVITY_BLOCKS +
        1
    );

  return getLogs(
    env,
    {
      address:
        token,

      fromBlock:
        "0x" +
        fromBlock.toString(
          16
        ),

      toBlock:
        "0x" +
        latestBlock.toString(
          16
        )
    }
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function getWalletsFromTransferLogs(
  logs
) {
  const wallets =
    [];

  for (
    const log of logs
  ) {
    if (
      !log.topics ||
      log.topics.length < 3
    ) {
      continue;
    }

    if (
      log.topics[0]
        ?.toLowerCase() !==
      TRANSFER_TOPIC
    ) {
      continue;
    }

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
      wallets.push(
        from
      );
    }

    if (
      to &&
      !isZeroAddress(to)
    ) {
      wallets.push(
        to
      );
    }
  }

  return unique(
    wallets
  );
}

function countTransfers(
  logs
) {
  return logs.filter(
    log =>
      log.topics &&
      log.topics[0]
        ?.toLowerCase() ===
        TRANSFER_TOPIC
  ).length;
}

function countApprovals(
  logs
) {
  return logs.filter(
    log =>
      log.topics &&
      log.topics[0]
        ?.toLowerCase() ===
        APPROVAL_TOPIC
  ).length;
}

async function getActivityMetrics(
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
            recentFrom.toString(
              16
            ),

          toBlock:
            "0x" +
            latestBlock.toString(
              16
            )
        }
      ),

      getLogs(
        env,
        {
          address:
            token,

          fromBlock:
            "0x" +
            previousFrom.toString(
              16
            ),

          toBlock:
            "0x" +
            previousTo.toString(
              16
            )
        }
      )
    ]);

  const recentTransfers =
    countTransfers(
      recentLogs
    );

  const previousTransfers =
    countTransfers(
      previousLogs
    );

  const wallets =
    getWalletsFromTransferLogs(
      recentLogs
    );

  let activityAcceleration =
    0;

  if (
    previousLogs.length > 0
  ) {
    activityAcceleration =
      recentLogs.length /
      previousLogs.length;
  } else if (
    recentLogs.length > 0
  ) {
    activityAcceleration =
      2;
  }

  let transferAcceleration =
    0;

  if (
    previousTransfers > 0
  ) {
    transferAcceleration =
      recentTransfers /
      previousTransfers;
  } else if (
    recentTransfers > 0
  ) {
    transferAcceleration =
      2;
  }

  return {
    recentActivity:
      recentLogs.length,

    previousActivity:
      previousLogs.length,

    activityAcceleration,

    recentTransfers,

    previousTransfers,

    transferAcceleration,

    uniqueWallets:
      wallets.length,

    transferActivity:
      recentTransfers,

    approvalActivity:
      countApprovals(
        recentLogs
      ),

    activityWindow: {
      recentFrom,
      recentTo:
        latestBlock,

      previousFrom,
      previousTo
    }
  };
}

function extractTokenAddressesFromPools(
  pools
) {
  const result =
    [];

  for (
    const pool of pools
  ) {
    if (
      pool.currency0 &&
      !isZeroAddress(
        pool.currency0
      )
    ) {
      result.push(
        pool.currency0
      );
    }

    if (
      pool.currency1 &&
      !isZeroAddress(
        pool.currency1
      )
    ) {
      result.push(
        pool.currency1
      );
    }
  }

  return unique(
    result.map(
      x =>
        x.toLowerCase()
    )
  );
}

/*
  Launchpad/entry-contract discovery.

  We inspect indexed topics and ABI words for
  addresses, then independently verify each address
  by calling ERC20 metadata methods.

  This deliberately does NOT claim that an address is
  a launchpad-created token merely because it appeared
  in a log.
*/

function extractAddressesFromLog(
  log
) {
  const addresses =
    [];

  if (
    Array.isArray(
      log.topics
    )
  ) {
    for (
      const topic of log.topics
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (
        address &&
        validTokenCandidate(
          address
        )
      ) {
        addresses.push(
          address
        );
      }
    }
  }

  const words =
    splitWords(
      log.data
    );

  for (
    const word of words
  ) {
    const address =
      topicToAddress(
        word
      );

    if (
      address &&
      validTokenCandidate(
        address
      )
    ) {
      addresses.push(
        address
      );
    }
  }

  return unique(
    addresses.map(
      x =>
        x.toLowerCase()
    )
  );
}

async function inspectLaunchpads(
  env,
  fromBlock,
  toBlock
) {
  const observations =
    [];

  const discovered =
    [];

  const contracts =
    unique([
      ...ENTRY_CONTRACTS,
      ...LAUNCHPADS
    ]);

  for (
    const address of contracts
  ) {
    const logs =
      await getLogs(
        env,
        {
          address,

          fromBlock:
            "0x" +
            fromBlock.toString(
              16
            ),

          toBlock:
            "0x" +
            toBlock.toString(
              16
            )
        }
      );

    const addresses =
      [];

    for (
      const log of logs
    ) {
      const found =
        extractAddressesFromLog(
          log
        );

      for (
        const candidate of found
      ) {
        if (
          candidate !==
          address.toLowerCase()
        ) {
          addresses.push(
            candidate
          );
        }
      }
    }

    const uniqueAddresses =
      unique(
        addresses
      );

    for (
      const candidate of uniqueAddresses
    ) {
      discovered.push({
        address:
          candidate,

        sourceContract:
          address,

        evidence:
          "ADDRESS_APPEARED_IN_LAUNCHPAD_OR_ENTRY_LOG",

        blockRange: {
          fromBlock,
          toBlock
        }
      });
    }

    observations.push({
      address,

      logsFound:
        logs.length,

      candidateAddresses:
        uniqueAddresses.length,

      tokenCreationEvents:
        "ADDRESS_EXTRACTION_ONLY",

      discoveredAddresses:
        uniqueAddresses.slice(
          0,
          20
        )
    });
  }

  return {
    observations,

    discovered:
      discovered.slice(
        0,
        MAX_LAUNCHPAD_CANDIDATES
      )
  };
}

function scoreCandidate(
  candidate
) {
  let score =
    0;

  /*
    Contract verification
  */

  if (
    candidate.validERC20
  ) {
    score +=
      20;
  }

  /*
    Metadata
  */

  if (
    candidate.name
  ) {
    score +=
      5;
  }

  if (
    candidate.symbol
  ) {
    score +=
      5;
  }

  /*
    Pool
  */

  if (
    candidate.poolInitialized
  ) {
    score +=
      10;
  }

  if (
    candidate.poolCount > 1
  ) {
    score +=
      Math.min(
        10,
        candidate.poolCount *
          2
      );
  }

  /*
    Recent activity
  */

  if (
    candidate.recentActivity > 0
  ) {
    score +=
      Math.min(
        10,
        Math.ceil(
          candidate.recentActivity /
            10
        )
      );
  }

  /*
    Unique transfer wallets
  */

  if (
    candidate.uniqueWallets > 0
  ) {
    score +=
      Math.min(
        10,
        candidate.uniqueWallets
      );
  }

  /*
    True recent-vs-previous acceleration
  */

  if (
    candidate.activityAcceleration >
    1
  ) {
    score +=
      Math.min(
        10,
        Math.floor(
          candidate.activityAcceleration *
            2
        )
      );
  }

  /*
    Transfer activity
  */

  if (
    candidate.transferActivity >
    0
  ) {
    score +=
      Math.min(
        5,
        Math.ceil(
          candidate.transferActivity /
            20
        )
      );
  }

  /*
    Transfer acceleration
  */

  if (
    candidate.transferAcceleration >
    1
  ) {
    score +=
      Math.min(
        5,
        Math.floor(
          candidate.transferAcceleration
        )
      );
  }

  /*
    Launchpad evidence
  */

  if (
    candidate.launchpadEvidence
  ) {
    score +=
      10;
  }

  /*
    Native pair
  */

  if (
    candidate.isNativePair
  ) {
    score +=
      5;
  }

  return Math.min(
    100,
    score
  );
}

async function buildCandidate(
  env,
  address,
  latestBlock,
  pools = [],
  launchpadEvidence = null
) {
  const metadata =
    await getERC20Metadata(
      env,
      address
    );

  if (
    !metadata.validERC20
  ) {
    return null;
  }

  const activity =
    await getActivityMetrics(
      env,
      address,
      latestBlock
    );

  const candidate = {
    address:
      address.toLowerCase(),

    ...metadata,

    poolInitialized:
      pools.length >
      0,

    poolCount:
      pools.length,

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

    transferActivity:
      activity.transferActivity,

    approvalActivity:
      activity.approvalActivity,

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

    launchpadEvidence:
      !!launchpadEvidence,

    launchpadSource:
      launchpadEvidence?.sourceContract ||
      null,

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

          sqrtPriceX96:
            pool.sqrtPriceX96,

          tick:
            pool.tick,

          txHash:
            pool.txHash,

          blockNumber:
            pool.blockNumber,

          logIndex:
            pool.logIndex
        })
      )
  };

  candidate.score =
    scoreCandidate(
      candidate
    );

  return candidate;
}

async function scan(env) {
  const latestBlock =
    await getLatestBlock(
      env
    );

  /*
    Keep the PoolManager RPC range small.
  */

  const startBlock =
    Math.max(
      0,
      latestBlock -
        (RPC_MAX_RANGE - 1)
    );

  const logs =
    await getPoolManagerLogs(
      env,
      startBlock,
      latestBlock
    );

  const initializeEvents =
    [];

  const swapEvents =
    [];

  for (
    const log of logs
  ) {
    if (
      looksLikeInitialize(
        log
      )
    ) {
      const decoded =
        decodeInitialize(
          log
        );

      if (decoded) {
        initializeEvents.push(
          decoded
        );
      }
    }

    if (
      looksLikeSwap(
        log
      )
    ) {
      const decoded =
        decodeSwap(
          log
        );

      if (decoded) {
        swapEvents.push(
          decoded
        );
      }
    }
  }

  const poolTokenAddresses =
    extractTokenAddressesFromPools(
      initializeEvents
    );

  /*
    Launchpad discovery.
  */

  const launchpadData =
    await inspectLaunchpads(
      env,
      startBlock,
      latestBlock
    );

  /*
    Build launchpad candidate map.
  */

  const launchpadMap =
    new Map();

  for (
    const item of
      launchpadData.discovered
  ) {
    launchpadMap.set(
      item.address.toLowerCase(),
      item
    );
  }

  /*
    All candidate addresses.
  */

  const allAddresses =
    unique([
      ...poolTokenAddresses,

      ...launchpadData.discovered.map(
        x =>
          x.address.toLowerCase()
      )
    ]).slice(
      0,
      MAX_POOL_TOKENS +
        MAX_LAUNCHPAD_CANDIDATES
    );

  const candidates =
    [];

  const validationResults =
    [];

  for (
    const address of allAddresses
  ) {
    const metadata =
      await getERC20Metadata(
        env,
        address
      );

    validationResults.push({
      address,

      ...metadata
    });

    if (
      !metadata.validERC20
    ) {
      continue;
    }

    const pools =
      initializeEvents.filter(
        event =>
          event.currency0
            ?.toLowerCase() ===
            address ||
          event.currency1
            ?.toLowerCase() ===
            address
      );

    const launchEvidence =
      launchpadMap.get(
        address
      ) ||
      null;

    const activity =
      await getActivityMetrics(
        env,
        address,
        latestBlock
      );

    const candidate = {
      address,

      ...metadata,

      poolInitialized:
        pools.length >
        0,

      poolCount:
        pools.length,

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

      transferActivity:
        activity.transferActivity,

      approvalActivity:
        activity.approvalActivity,

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

      launchpadEvidence:
        !!launchEvidence,

      launchpadSource:
        launchEvidence?.sourceContract ||
        null,

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

            sqrtPriceX96:
              pool.sqrtPriceX96,

            tick:
              pool.tick,

            txHash:
              pool.txHash,

            blockNumber:
              pool.blockNumber,

            logIndex:
              pool.logIndex
          })
        )
    };

    candidate.score =
      scoreCandidate(
        candidate
      );

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD
    );

  let telegramResult = {
    sent:
      false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (
    qualifyingCandidates.length >
    0
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

      startBlock,

      endBlock:
        latestBlock,

      blocksScanned:
        latestBlock -
        startBlock +
        1,

      poolManager:
        POOL_MANAGER,

      rawLogs:
        logs.length,

      initializeEventsFound:
        initializeEvents.length,

      swapEventsFound:
        swapEvents.length,

      currenciesDiscovered:
        poolTokenAddresses.length,

      uniqueTokenCandidates:
        allAddresses.length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x =>
            x.validERC20
        ).length,

      validationResults,

      pools:
        initializeEvents,

      swapActivity: {
        events:
          swapEvents.length,

        uniqueSenders:
          unique(
            swapEvents
              .map(
                x =>
                  x.sender
              )
              .filter(Boolean)
          ).length,

        uniquePools:
          unique(
            swapEvents
              .map(
                x =>
                  x.poolId
              )
              .filter(Boolean)
          ).length
      },

      candidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      launchpadDiscovery: {
        contractsChecked:
          ENTRY_CONTRACTS.length +
          LAUNCHPADS.length,

        discoveredAddresses:
          launchpadData.discovered.length,

        observations:
          launchpadData.observations,

        method:
          "LOG_ADDRESS_EXTRACTION_PLUS_ERC20_VERIFICATION"
      },

      rpcProvider:
        "ALCHEMY",

      discovery:
        "UNISWAP_V4_INITIALIZE_SWAP_ACTIVITY_PLUS_LAUNCHPAD_DISCOVERY_V50",

      chain: {
        name:
          CHAIN_NAME,

        chainId:
          CHAIN_ID
      },

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        holderConcentration:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        whaleActivity:
          "UNVERIFIED",

        walletActivity:
          "TRANSFER_LOG_BASED",

        accumulationDistribution:
          "UNVERIFIED",

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        volume:
          "RAW_V4_SWAP_ACTIVITY_ONLY",

        socialMomentum:
          "UNVERIFIED",

        launchpadCreation:
          "PARTIALLY_VERIFIED"
      }
    },

    timestamp:
      new Date().toISOString()
  };
}

async function sendTelegram(
  env,
  candidate
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
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
      `🏊 Pools: ${candidate.poolCount}`,
      `📊 Recent logs: ${candidate.recentActivity}`,
      `🔄 Transfers: ${candidate.transferActivity}`,
      `👥 Unique wallets: ${candidate.uniqueWallets}`,
      `⚡ Activity: ${
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
      `🚀 Launchpad evidence: ${
        candidate.launchpadEvidence
          ? "YES"
          : "NO"
      }`,
      candidate.launchpadSource
        ? `🏗️ Source: ${candidate.launchpadSource}`
        : "",
      "",
      "⚠️ Market cap: UNVERIFIED",
      "⚠️ Liquidity: UNVERIFIED",
      "⚠️ Holders: UNVERIFIED",
      "⚠️ Smart money: UNVERIFIED",
      "⚠️ Whale activity: UNVERIFIED",
      "",
      "V50 — Activity + Launchpad Discovery"
    ]
      .filter(Boolean)
      .join("\n");

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
        sent:
          false,

        reason:
          result.description ||
          "TELEGRAM_SEND_FAILED"
      };
    }

    return {
      sent:
        true,

      messageId:
        result.result?.message_id ||
        null
    };
  } catch (error) {
    return {
      sent:
        false,

      reason:
        error?.message ||
        "TELEGRAM_REQUEST_FAILED"
    };
  }
}

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

    poolManager:
      POOL_MANAGER,

    discovery:
      "UNISWAP_V4_INITIALIZE_SWAP_ACTIVITY_PLUS_LAUNCHPAD_DISCOVERY_V50",

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
        TELEGRAM_THRESHOLD
    },

    architecture:
      "V50_ACTIVITY_LAUNCHPAD_MEME_DISCOVERY",

    timestamp:
      new Date().toISOString()
  };
}

async function testTelegram(
  env
) {
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

  const result =
    await sendTelegram(
      env,
      {
        name:
          "V50 TEST",

        symbol:
          "TEST",

        address:
          ZERO_ADDRESS,

        score:
          100,

        poolCount:
          1,

        recentActivity:
          10,

        uniqueWallets:
          5,

        activityAcceleration:
          2.5,

        transferActivity:
          10,

        transferAcceleration:
          2,

        launchpadEvidence:
          true,

        launchpadSource:
          "V50 TEST"
      }
    );

  return {
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
  };
}

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
    } catch (
      error
    ) {
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
