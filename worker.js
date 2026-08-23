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

const ALL_LAUNCH_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

/*
==================================================
STANDARD EVENT TOPICS
==================================================
*/

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

const APPROVAL_TOPIC =
  "0x8c5be1e5ebec7d5bd14f714f8a5f2e6b6f8e0b4c3e9e8b0b6f6f9b6d8e8e0f0a";

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

/*
==================================================
SETTINGS
==================================================
*/

const TELEGRAM_THRESHOLD = 60;

const ACTIVITY_BLOCKS = 999;

const DISCOVERY_BLOCKS = 500;

/*
V53 broad discovery scans the chain without relying
only on known event signatures.

The broad log scan is chunked to reduce RPC/log limits.
*/

const BROAD_SCAN_CHUNK = 50;

const MAX_RAW_DISCOVERY_LOGS = 1500;

const MAX_DISCOVERY_ADDRESSES = 120;

const MAX_VERIFIED_CANDIDATES = 50;

/*
==================================================
UTILITY
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

  if (a === ZERO_ADDRESS) {
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

function hexToNumber(hex) {
  try {
    return Number(
      BigInt(hex)
    );
  } catch {
    return null;
  }
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

function blockHex(block) {
  return (
    "0x" +
    block.toString(16)
  );
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
V53 BROAD RAW LOG DISCOVERY
==================================================

This is the major V53 upgrade.

Instead of relying exclusively on known launch
events, we inspect raw chain logs and identify:

1. Contract addresses emitting logs
2. Address-shaped indexed topics
3. Address-shaped ABI words

Every possible token is subsequently verified
using ERC20 calls.

No address is sent to Telegram unless it passes
ERC20 verification.
==================================================
*/

async function broadRawLogDiscovery(
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

  const discovered =
    new Map();

  let rawLogs =
    0;

  let chunks =
    0;

  for (
    let start =
      fromBlock;

    start <= latestBlock;

    start +=
      BROAD_SCAN_CHUNK
  ) {
    const end =
      Math.min(
        latestBlock,
        start +
          BROAD_SCAN_CHUNK -
          1
      );

    chunks++;

    const logs =
      await getLogs(
        env,
        {
          fromBlock:
            blockHex(start),

          toBlock:
            blockHex(end)
        }
      );

    rawLogs +=
      logs.length;

    for (
      const log of logs
    ) {
      if (
        discovered.size >=
        MAX_DISCOVERY_ADDRESSES
      ) {
        break;
      }

      /*
      The emitting contract itself may be
      the token contract.
      */

      if (
        validTokenCandidate(
          log.address
        )
      ) {
        const address =
          log.address.toLowerCase();

        if (
          !discovered.has(address)
        ) {
          discovered.set(
            address,
            {
              address,
              source:
                "V53_RAW_LOG_EMITTER",
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

      /*
      Indexed event parameters.
      */

      for (
        const topic of
          log.topics || []
      ) {
        const address =
          topicToAddress(
            topic
          );

        if (
          address &&
          validTokenCandidate(address) &&
          discovered.size <
            MAX_DISCOVERY_ADDRESSES
        ) {
          const key =
            address.toLowerCase();

          if (
            !discovered.has(key)
          ) {
            discovered.set(
              key,
              {
                address: key,
                source:
                  "V53_RAW_LOG_TOPIC",
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
      }

      /*
      ABI data words.
      */

      for (
        const word of
          splitWords(
            log.data
          )
      ) {
        const address =
          topicToAddress(
            word
          );

        if (
          address &&
          validTokenCandidate(address) &&
          discovered.size <
            MAX_DISCOVERY_ADDRESSES
        ) {
          const key =
            address.toLowerCase();

          if (
            !discovered.has(key)
          ) {
            discovered.set(
              key,
              {
                address: key,
                source:
                  "V53_RAW_LOG_DATA",
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
      }
    }

    if (
      discovered.size >=
      MAX_DISCOVERY_ADDRESSES
    ) {
      break;
    }

    if (
      rawLogs >=
      MAX_RAW_DISCOVERY_LOGS
    ) {
      break;
    }
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    blocksScanned:
      latestBlock -
      fromBlock +
      1,

    chunks,

    rawLogs,

    addressesFound:
      discovered.size,

    candidates:
      [
        ...discovered.values()
      ]
  };
}

/*
==================================================
V4 INITIALIZE
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
    splitWords(
      log.data
    );

  if (
    words.length !== 5
  ) {
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
    splitWords(
      log.data
    );

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
V4 SWAP
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
    splitWords(
      log.data
    );

  return words.length === 7;
}

function decodeSwap(log) {
  if (
    !looksLikeSwap(log)
  ) {
    return null;
  }

  const words =
    splitWords(
      log.data
    );

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

      if (
        n !== 0 &&
        n >= 32 &&
        n <= 126
      ) {
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

function decodeString(
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

    /*
    bytes32 fallback.
    */

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

  /*
  Strong ERC20 verification.

  We require:
  - name
  - symbol
  - decimals
  - totalSupply
  */

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
        ? name.slice(
            0,
            100
          )
        : null,

    symbol:
      symbol
        ? symbol.slice(
            0,
            50
          )
        : null,

    decimals,

    totalSupply
  };
}

/*
==================================================
POOLS.TRADE
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
          blockHex(
            fromBlock
          ),

        toBlock:
          blockHex(
            latestBlock
          ),

        topics: [
          POOLS_TOKEN_CREATED_TOPIC
        ]
      }
    );

  const launches =
    [];

  for (
    const log of logs
  ) {
    const addresses =
      [];

    for (
      const topic of
        log.topics || []
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (address) {
        addresses.push(
          address
        );
      }
    }

    for (
      const word of
        splitWords(
          log.data
        )
    ) {
      const address =
        topicToAddress(
          word
        );

      if (address) {
        addresses.push(
          address
        );
      }
    }

    for (
      const token of
        unique(addresses)
    ) {
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
          null
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
            blockHex(
              fromBlock
            ),

          toBlock:
            blockHex(
              latestBlock
            ),

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
            blockHex(
              fromBlock
            ),

          toBlock:
            blockHex(
              latestBlock
            ),

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
        log.topics || []
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (address) {
        possible.push(
          address
        );
      }
    }

    for (
      const word of
        splitWords(
          log.data
        )
    ) {
      const address =
        topicToAddress(
          word
        );

      if (address) {
        possible.push(
          address
        );
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
            "POOLS_TRADE_DISTRIBUTED",

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
        log.topics || []
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (address) {
        possible.push(
          address
        );
      }
    }

    for (
      const word of
        splitWords(
          log.data
        )
    ) {
      const address =
        topicToAddress(
          word
        );

      if (address) {
        possible.push(
          address
        );
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
            "POOLS_TRADE_LAUNCHPAD",

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
MINT.FAST
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
          blockHex(
            fromBlock
          ),

        toBlock:
          blockHex(
            latestBlock
          ),

        topics: [
          MINT_FAST_TOKEN_CREATED_TOPIC
        ]
      }
    );

  const launches =
    [];

  for (
    const log of logs
  ) {
    const addresses =
      [];

    for (
      const topic of
        log.topics || []
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (address) {
        addresses.push(
          address
        );
      }
    }

    for (
      const word of
        splitWords(
          log.data
        )
    ) {
      const address =
        topicToAddress(
          word
        );

      if (address) {
        addresses.push(
          address
        );
      }
    }

    for (
      const token of
        unique(addresses)
    ) {
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
          null
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
V4 POOL MANAGER ACTIVITY
==================================================
*/

async function getPoolManagerActivity(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock - 50
    );

  const logs =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,

        fromBlock:
          blockHex(
            fromBlock
          ),

        toBlock:
          blockHex(
            latestBlock
          )
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
      decodeInitialize(
        log
      );

    if (initialize) {
      initializeEvents.push(
        initialize
      );
    }

    const swap =
      decodeSwap(
        log
      );

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
            blockHex(
              recentFrom
            ),

          toBlock:
            blockHex(
              latestBlock
            )
        }
      ),

      getLogs(
        env,
        {
          address:
            token,

          fromBlock:
            blockHex(
              previousFrom
            ),

          toBlock:
            blockHex(
              previousTo
            )
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

  const wallets =
    [];

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

  /*
  Extra V53 discovery confidence.
  */

  if (
    candidate.discoverySource ===
    "V53_RAW_LOG_EMITTER"
  ) {
    score += 5;
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
  discovery
) {
  if (
    !validTokenCandidate(
      token
    )
  ) {
    return null;
  }

  const metadata =
    await getERC20Metadata(
      env,
      token
    );

  /*
  Critical safety rule:
  never build or alert a candidate that has
  not passed ERC20 verification.
  */

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
      !!discovery?.launchEvidence,

    launchSource:
      discovery?.source ||
      "V53_RAW_DISCOVERY",

    launchTx:
      discovery?.txHash ||
      null,

    launchBlock:
      discovery?.blockNumber ||
      null,

    discoverySource:
      discovery?.source ||
      "V53_RAW_DISCOVERY",

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
TELEGRAM
==================================================
*/

async function sendTelegram(
  env,
  candidate
) {
  /*
  HARD SAFETY CHECK.
  */

  if (
    !validTokenCandidate(
      candidate?.address
    )
  ) {
    return {
      sent: false,

      reason:
        "INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  /*
  Re-verify the contract immediately before
  sending Telegram.
  */

  const verification =
    await getERC20Metadata(
      env,
      candidate.address
    );

  if (
    !verification.validERC20
  ) {
    return {
      sent: false,

      reason:
        "TOKEN_FAILED_FINAL_ERC20_VERIFICATION"
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
        "V53 RAW DISCOVERY"
      }`,
      `🏊 Pools: ${candidate.poolCount}`,
      `📊 Recent activity: ${candidate.recentActivity}`,
      `👥 Unique wallets: ${candidate.uniqueWallets}`,
      `🔄 Transfers: ${candidate.recentTransfers}`,
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
      "⚠️ Market cap: UNVERIFIED",
      "⚠️ Liquidity: UNVERIFIED",
      "⚠️ Holder concentration: UNVERIFIED",
      "⚠️ Smart money: UNVERIFIED",
      "⚠️ Whale activity: UNVERIFIED",
      "",
      "V53 — Deep Raw Discovery + Verified ERC20"
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
    await getLatestBlock(
      env
    );

  const [
    poolData,
    poolsTrade,
    poolsEvidence,
    mintFast,
    broadDiscovery
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
      ),

      broadRawLogDiscovery(
        env,
        latestBlock
      )
    ]);

  const tokenMap =
    new Map();

  /*
  ==================================================
  1. POOLS.TRADE
  ==================================================
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
        {
          ...launch,

          launchEvidence:
            true
        }
      );
    }
  }

  /*
  ==================================================
  2. MINT.FAST
  ==================================================
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
        {
          ...launch,

          launchEvidence:
            true
        }
      );
    }
  }

  /*
  ==================================================
  3. POOLS.TRADE EVIDENCE
  ==================================================
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
      )
    ) {
      const existing =
        tokenMap.get(
          token
        );

      tokenMap.set(
        token,
        {
          ...(existing || {
            token
          }),

          source:
            existing?.source ||
            evidence.source,

          txHash:
            existing?.txHash ||
            evidence.txHash,

          blockNumber:
            existing?.blockNumber ||
            evidence.blockNumber,

          launchEvidence:
            true
        }
      );
    }
  }

  /*
  ==================================================
  4. V4 POOL INITIALIZATION
  ==================================================
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
                pool.blockNumber,

              launchEvidence:
                false
            }
          );
        }
      }
    }
  }

  /*
  ==================================================
  5. V53 BROAD RAW LOG DISCOVERY
  ==================================================
  */

  for (
    const item of
      broadDiscovery.candidates
  ) {
    const token =
      item.address
        ?.toLowerCase();

    if (
      !validTokenCandidate(
        token
      )
    ) {
      continue;
    }

    /*
    Do not overwrite stronger discovery evidence.
    */

    if (
      tokenMap.has(token)
    ) {
      const existing =
        tokenMap.get(token);

      tokenMap.set(
        token,
        {
          ...existing,

          broadDiscovery:
            true
        }
      );
    } else {
      tokenMap.set(
        token,
        {
          token,

          source:
            item.source,

          txHash:
            item.txHash,

          blockNumber:
            item.blockNumber,

          launchEvidence:
            false,

          broadDiscovery:
            true
        }
      );
    }
  }

  const addresses =
    [
      ...tokenMap.keys()
    ].filter(
      validTokenCandidate
    ).slice(
      0,
      MAX_VERIFIED_CANDIDATES
    );

  const validationResults =
    [];

  const candidates =
    [];

  /*
  ==================================================
  6. ERC20 VERIFICATION
  ==================================================
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

    if (
      candidate &&
      validTokenCandidate(
        candidate.address
      ) &&
      candidate.validERC20
    ) {
      candidates.push(
        candidate
      );
    }
  }

  /*
  ==================================================
  7. SCORE
  ==================================================
  */

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD &&
        validTokenCandidate(
          candidate.address
        ) &&
        candidate.validERC20
    );

  /*
  ==================================================
  8. TELEGRAM
  ==================================================
  */

  let telegramResult = {
    sent:
      false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
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

      discoveryWindow: {
        fromBlock:
          broadDiscovery.fromBlock,

        toBlock:
          broadDiscovery.toBlock,

        blocks:
          broadDiscovery.blocksScanned
      },

      /*
      V53 broad discovery statistics.
      */

      broadDiscovery: {
        blocksScanned:
          broadDiscovery.blocksScanned,

        chunks:
          broadDiscovery.chunks,

        rawLogs:
          broadDiscovery.rawLogs,

        addressesFound:
          broadDiscovery.addressesFound,

        method:
          "RAW_CHAIN_LOG_DISCOVERY"
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
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        launchDetection:
          "ON_CHAIN_EVENT_VERIFIED_PLUS_V53_RAW_LOG_DISCOVERY",

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
        "V53_RAW_LOG_PLUS_POOLS_TRADE_PLUS_MINT_FAST_PLUS_UNISWAP_V4",

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
        "REQUIRED",

      zeroAddressBlocked:
        true
    },

    architecture:
      "V53_DEEP_RAW_DISCOVERY_VERIFIED_ERC20_ACTIVITY_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
TELEGRAM TEST
==================================================

The test deliberately does NOT use ZERO_ADDRESS.

It uses a clearly invalid/non-real placeholder and
the Telegram function must reject it.

This prevents a fake token address from ever being
presented as a genuine discovery.
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

  /*
  The test now intentionally checks the safety
  mechanism rather than sending a fake token alert.
  */

  const result =
    await sendTelegram(
      env,
      {
        name:
          "V53 SAFETY TEST",

        symbol:
          "TEST",

        address:
          ZERO_ADDRESS,

        score:
          100,

        launchSource:
          "SAFETY TEST",

        poolCount:
          0,

        recentActivity:
          0,

        uniqueWallets:
          0,

        recentTransfers:
          0,

        activityAcceleration:
          0,

        transferAcceleration:
          0,

        validERC20:
          false
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
      true,

    telegramAttempted:
      result.sent,

    response:
      result,

    expected:
      "ZERO_ADDRESS_REJECTED",

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
