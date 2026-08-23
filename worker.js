const VERSION = "V48";

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

/*
  V48 CONFIGURATION

  Keep the scan small initially because Alchemy RPC log
  requests can become expensive when querying many blocks.
*/

const RPC_MAX_RANGE = 10;

const TELEGRAM_THRESHOLD = 60;

/*
  Known infrastructure / quote assets.

  WETH address is from the Robinhood Chain environment.

  USDG was identified by your V47 scan and is deliberately
  excluded from meme-token scoring.
*/

const KNOWN_INFRASTRUCTURE = new Set([
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73",
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
]);

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

/*
  ERC20 event.
*/
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/*
  We intentionally do NOT use a guessed Uniswap event hash.

  V47 successfully discovers events structurally by inspecting
  the PoolManager logs.

  V48 keeps that mechanism.
*/


/* ============================================================
   ADDRESS HELPERS
   ============================================================ */

function cleanAddress(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  let v = value.toLowerCase();

  if (!v.startsWith("0x")) {
    return null;
  }

  /*
    Topic values are 32 bytes.
  */
  if (v.length === 66) {
    const body = v.slice(2);

    if (!/^[0-9a-f]{64}$/.test(body)) {
      return null;
    }

    return "0x" + body.slice(24);
  }

  /*
    Normal address.
  */
  if (v.length === 42) {
    if (!/^0x[0-9a-f]{40}$/.test(v)) {
      return null;
    }

    return v;
  }

  return null;
}

function topicToAddress(topic) {
  return cleanAddress(topic);
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    value || ""
  );
}

function isZeroAddress(address) {
  return (
    !address ||
    address.toLowerCase() === ZERO_ADDRESS
  );
}

function isNativeCurrency(address) {
  return isZeroAddress(address);
}

function normalizeAddress(address) {
  return (
    address ||
    ""
  ).toLowerCase();
}

function validTokenCandidate(address) {
  if (!isAddress(address)) {
    return false;
  }

  const a =
    address.toLowerCase();

  /*
    Reject obvious garbage.
  */
  if (/^0x0{38,}/i.test(a)) {
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

function isKnownInfrastructure(address) {
  if (!address) {
    return false;
  }

  return KNOWN_INFRASTRUCTURE.has(
    normalizeAddress(address)
  );
}


/* ============================================================
   HEX / ABI HELPERS
   ============================================================ */

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

    const max =
      1n << 23n;

    if (n >= max) {
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

    const max =
      1n << 127n;

    if (n >= max) {
      n -= 1n << 128n;
    }

    return n;
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


/* ============================================================
   UNISWAP V4 STRUCTURAL EVENT DETECTION
   ============================================================ */

/*
  V4 Initialize:

  4 topics:
    topic0
    topic1 = poolId
    topic2 = currency0
    topic3 = currency1

  data:
    fee
    tickSpacing
    hooks
    sqrtPriceX96
    tick

  = 5 ABI words
*/

function looksLikeInitialize(log) {
  if (
    !log ||
    !Array.isArray(log.topics)
  ) {
    return false;
  }

  if (
    log.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) {
    return false;
  }

  if (
    log.topics.length !== 4
  ) {
    return false;
  }

  const currency0 =
    topicToAddress(
      log.topics[2]
    );

  const currency1 =
    topicToAddress(
      log.topics[3]
    );

  if (
    !currency0 ||
    !currency1
  ) {
    return false;
  }

  const words =
    splitWords(log.data);

  /*
    Initialize contains five non-indexed values.
  */
  if (
    words.length < 5
  ) {
    return false;
  }

  /*
    Currency ordering check.

    Native currency is zero address and is allowed.
  */

  if (
    !isZeroAddress(currency0) &&
    normalizeAddress(currency0) >=
      normalizeAddress(currency1)
  ) {
    return false;
  }

  return true;
}


/*
  V4 Swap:

  3 topics:
    topic0
    topic1 = poolId
    topic2 = sender

  data:
    amount0
    amount1
    sqrtPriceX96
    liquidity
    tick
    fee

  = 6 ABI words
*/

function looksLikeSwap(log) {
  if (
    !log ||
    !Array.isArray(log.topics)
  ) {
    return false;
  }

  if (
    log.address?.toLowerCase() !==
    POOL_MANAGER.toLowerCase()
  ) {
    return false;
  }

  if (
    log.topics.length !== 3
  ) {
    return false;
  }

  const poolId =
    log.topics[1];

  const sender =
    topicToAddress(
      log.topics[2]
    );

  if (!poolId || !sender) {
    return false;
  }

  const words =
    splitWords(log.data);

  /*
    Swap contains six non-indexed values.
  */
  if (
    words.length < 6
  ) {
    return false;
  }

  /*
    Validate the signed values.

    This prevents unrelated 3-topic PoolManager events
    from being treated as swaps.
  */

  const amount0 =
    decodeInt128(
      words[0]
    );

  const amount1 =
    decodeInt128(
      words[1]
    );

  const tick =
    decodeInt24(
      words[4]
    );

  if (
    amount0 === null ||
    amount1 === null ||
    tick === null
  ) {
    return false;
  }

  return true;
}


/* ============================================================
   INITIALIZE DECODER
   ============================================================ */

function decodeInitialize(log) {
  if (
    !looksLikeInitialize(log)
  ) {
    return null;
  }

  const topics =
    log.topics;

  const poolId =
    topics[1];

  const currency0 =
    topicToAddress(
      topics[2]
    );

  const currency1 =
    topicToAddress(
      topics[3]
    );

  const words =
    splitWords(
      log.data
    );

  return {
    poolId,

    currency0,

    currency1,

    fee:
      words.length > 0
        ? decodeUint24(
            words[0]
          )
        : null,

    tickSpacing:
      words.length > 1
        ? decodeInt24(
            words[1]
          )
        : null,

    hooks:
      words.length > 2
        ? topicToAddress(
            words[2]
          )
        : null,

    sqrtPriceX96:
      words.length > 3
        ? words[3]
        : null,

    tick:
      words.length > 4
        ? decodeInt24(
            words[4]
          )
        : null,

    txHash:
      log.transactionHash ||
      null,

    blockNumber:
      log.blockNumber ||
      null
  };
}


/* ============================================================
   SWAP DECODER
   ============================================================ */

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

  const amount0 =
    decodeInt128(
      words[0]
    );

  const amount1 =
    decodeInt128(
      words[1]
    );

  const sqrtPriceX96 =
    words[2];

  let liquidity = null;

  try {
    liquidity =
      BigInt(
        words[3]
      ).toString();
  } catch {}

  const tick =
    decodeInt24(
      words[4]
    );

  const fee =
    decodeUint24(
      words[5]
    );

  const sender =
    topicToAddress(
      log.topics[2]
    );

  /*
    Directional interpretation:

    We intentionally call these "buy signals"
    and "sell signals", not USD buys/sells.

    Without a reliable quote-price mapping we cannot
    claim USD volume.
  */

  let direction =
    "UNKNOWN";

  if (
    amount0 !== null &&
    amount1 !== null
  ) {
    if (
      amount0 < 0n &&
      amount1 > 0n
    ) {
      direction =
        "BUY_SIGNAL";
    } else if (
      amount0 > 0n &&
      amount1 < 0n
    ) {
      direction =
        "SELL_SIGNAL";
    }
  }

  return {

    poolId:
      log.topics[1],

    sender,

    amount0:
      amount0 !== null
        ? amount0.toString()
        : null,

    amount1:
      amount1 !== null
        ? amount1.toString()
        : null,

    sqrtPriceX96,

    liquidity,

    tick,

    fee,

    direction,

    txHash:
      log.transactionHash ||
      null,

    blockNumber:
      log.blockNumber ||
      null
  };
}


/* ============================================================
   RPC
   ============================================================ */

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

  const result =
    await response.json();

  if (result.error) {
    throw new Error(
      `${method}: ${
        result.error.message ||
        "RPC error"
      }`
    );
  }

  return result.result;
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


/*
  V48 gets ALL PoolManager logs in the small block range,
  just like your working V47.

  We classify them locally as Initialize or Swap.
*/
async function getPoolManagerLogs(
  env,
  fromBlock,
  toBlock
) {
  return await rpc(
    env,
    "eth_getLogs",
    [
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
    ]
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


/* ============================================================
   ERC20 METADATA
   ============================================================ */

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
      Standard dynamic ABI string.
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
        !Number.isFinite(offset) ||
        offset < 0
      ) {
        return null;
      }

      const lenPos =
        offset * 2;

      if (
        lenPos + 64 >
        hex.length
      ) {
        return null;
      }

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
        end >
        hex.length
      ) {
        return null;
      }

      const bytes =
        hex.slice(
          start,
          end
        );

      let text = "";

      for (
        let i = 0;
        i < bytes.length;
        i += 2
      ) {
        const code =
          parseInt(
            bytes.slice(
              i,
              i + 2
            ),
            16
          );

        if (
          code !== 0
        ) {
          text +=
            String.fromCharCode(
              code
            );
        }
      }

      return (
        text.trim() ||
        null
      );
    }

    return null;

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
    const hex =
      result.slice(
        2,
        66
      );

    let text = "";

    for (
      let i = 0;
      i < hex.length;
      i += 2
    ) {
      const code =
        parseInt(
          hex.slice(
            i,
            i + 2
          ),
          16
        );

      if (
        code === 0
      ) {
        break;
      }

      text +=
        String.fromCharCode(
          code
        );
    }

    return (
      text.trim() ||
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
    decodeString(nameRaw) ||
    decodeBytes32String(
      nameRaw
    );

  const symbol =
    decodeString(symbolRaw) ||
    decodeBytes32String(
      symbolRaw
    );

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

  const valid =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20:
      valid,

    name,

    symbol,

    decimals,

    totalSupply
  };
}


/* ============================================================
   TOKEN TRANSFER ACTIVITY
   ============================================================ */

/*
  We query the token contract directly.

  This is not a holder calculation.

  It only tells us that ERC20 Transfer events occurred.
*/

async function getTokenTransferLogs(
  env,
  token,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        (RPC_MAX_RANGE - 1)
    );

  try {

    return await rpc(
      env,
      "eth_getLogs",
      [
        {
          address:
            token,

          fromBlock:
            "0x" +
            fromBlock.toString(16),

          toBlock:
            "0x" +
            latestBlock.toString(16),

          topics: [
            TRANSFER_TOPIC
          ]
        }
      ]
    );

  } catch {
    return [];
  }
}


function analyseTransferActivity(
  logs
) {
  const senders =
    new Set();

  const receivers =
    new Set();

  const blocks =
    new Set();

  for (
    const log of logs
  ) {

    if (
      !log.topics ||
      log.topics.length < 3
    ) {
      continue;
    }

    const from =
      topicToAddress(
        log.topics[1]
      );

    const to =
      topicToAddress(
        log.topics[2]
      );

    if (
      from &&
      !isZeroAddress(from)
    ) {
      senders.add(
        normalizeAddress(
          from
        )
      );
    }

    if (
      to &&
      !isZeroAddress(to)
    ) {
      receivers.add(
        normalizeAddress(
          to
        )
      );
    }

    if (
      log.blockNumber
    ) {
      blocks.add(
        Number(
          BigInt(
            log.blockNumber
          )
        )
      );
    }
  }

  return {

    transferEvents:
      logs.length,

    uniqueSenders:
      senders.size,

    uniqueReceivers:
      receivers.size,

    activeBlocks:
      blocks.size
  };
}


/* ============================================================
   SWAP ACTIVITY ANALYSIS
   ============================================================ */

function analyseSwapActivity(
  swaps
) {
  const traders =
    new Set();

  const blocks =
    new Set();

  let buySignals = 0;

  let sellSignals = 0;

  for (
    const swap of swaps
  ) {

    if (
      swap.sender
    ) {
      traders.add(
        normalizeAddress(
          swap.sender
        )
      );
    }

    if (
      swap.blockNumber !== null &&
      swap.blockNumber !== undefined
    ) {
      blocks.add(
        Number(
          swap.blockNumber
        )
      );
    }

    if (
      swap.direction ===
      "BUY_SIGNAL"
    ) {
      buySignals++;
    }

    if (
      swap.direction ===
      "SELL_SIGNAL"
    ) {
      sellSignals++;
    }
  }

  let buySellRatio = null;

  if (
    sellSignals > 0
  ) {
    buySellRatio =
      Number(
        (
          buySignals /
          sellSignals
        ).toFixed(3)
      );
  } else if (
    buySignals > 0
  ) {
    buySellRatio =
      null;
  } else {
    buySellRatio =
      0;
  }

  return {

    swapCount:
      swaps.length,

    uniqueTraders:
      traders.size,

    activeBlocks:
      blocks.size,

    buySignals,

    sellSignals,

    buySellRatio,

    /*
      We deliberately don't calculate USD volume.
    */
    usdVolume:
      "UNVERIFIED"
  };
}


/* ============================================================
   POOL HELPERS
   ============================================================ */

function poolContainsToken(
  pool,
  token
) {
  const a =
    normalizeAddress(
      token
    );

  return (
    normalizeAddress(
      pool.currency0
    ) === a ||
    normalizeAddress(
      pool.currency1
    ) === a
  );
}


function poolIsNativePair(
  pool
) {
  return (
    isNativeCurrency(
      pool.currency0
    ) ||
    isNativeCurrency(
      pool.currency1
    )
  );
}


function poolCreatedBlock(pool) {
  if (
    pool.blockNumber === null ||
    pool.blockNumber === undefined
  ) {
    return null;
  }

  try {
    return Number(
      BigInt(
        pool.blockNumber
      )
    );
  } catch {
    return null;
  }
}


/* ============================================================
   MEME HEURISTIC
   ============================================================ */

/*
  This is intentionally a SMALL component.

  It is not social sentiment.

  It simply identifies names/symbols that have obvious meme
  characteristics.
*/

function memeNameSignal(
  name,
  symbol
) {
  const combined =
    (
      String(
        name || ""
      ) +
      " " +
      String(
        symbol || ""
      )
    ).toLowerCase();

  const words = [
    "dog",
    "doge",
    "cat",
    "pepe",
    "frog",
    "bonk",
    "wojak",
    "shib",
    "inu",
    "meme",
    "chad",
    "based",
    "moon",
    "frog",
    "goat",
    "ape",
    "penguin",
    "bear",
    "bull",
    "kitty"
  ];

  return words.some(
    word =>
      combined.includes(
        word
      )
  );
}


/* ============================================================
   SCORE
   ============================================================ */

function scoreCandidate({
  metadata,
  pools,
  swapActivity,
  transferActivity,
  latestBlock
}) {
  let score = 0;

  const breakdown = {};

  /*
    Valid ERC20.
  */

  if (
    metadata.validERC20
  ) {
    score += 10;

    breakdown.validERC20 =
      10;
  }

  /*
    Fresh pool.
  */

  if (
    pools.length > 0
  ) {
    score += 10;

    breakdown.poolInitialized =
      10;
  }

  /*
    Native pair.

    A native/asset pair is more interesting for our scanner
    than a pool made only against another unknown ERC20.
  */

  if (
    pools.some(
      pool =>
        poolIsNativePair(
          pool
        )
    )
  ) {
    score += 10;

    breakdown.nativePair =
      10;
  }

  /*
    Trading activity.
  */

  if (
    swapActivity.swapCount >= 20
  ) {
    score += 20;

    breakdown.swapActivity =
      20;

  } else if (
    swapActivity.swapCount >= 10
  ) {
    score += 15;

    breakdown.swapActivity =
      15;

  } else if (
    swapActivity.swapCount >= 5
  ) {
    score += 10;

    breakdown.swapActivity =
      10;

  } else if (
    swapActivity.swapCount >= 1
  ) {
    score += 5;

    breakdown.swapActivity =
      5;

  } else {
    breakdown.swapActivity =
      0;
  }

  /*
    Unique traders.
  */

  if (
    swapActivity.uniqueTraders >= 20
  ) {
    score += 20;

    breakdown.uniqueTraders =
      20;

  } else if (
    swapActivity.uniqueTraders >= 10
  ) {
    score += 15;

    breakdown.uniqueTraders =
      15;

  } else if (
    swapActivity.uniqueTraders >= 5
  ) {
    score += 10;

    breakdown.uniqueTraders =
      10;

  } else if (
    swapActivity.uniqueTraders >= 2
  ) {
    score += 5;

    breakdown.uniqueTraders =
      5;

  } else {
    breakdown.uniqueTraders =
      0;
  }

  /*
    Buy pressure.

    This is directional activity, NOT USD buying volume.
  */

  if (
    swapActivity.buySignals >= 10 &&
    swapActivity.buySignals >
      swapActivity.sellSignals
  ) {
    score += 15;

    breakdown.buyPressure =
      15;

  } else if (
    swapActivity.buySignals >
      swapActivity.sellSignals
  ) {
    score += 8;

    breakdown.buyPressure =
      8;

  } else {
    breakdown.buyPressure =
      0;
  }

  /*
    Transfer activity.

    Small component because transfers can be caused by many
    things and do not automatically represent buying.
  */

  if (
    transferActivity.uniqueReceivers >= 10
  ) {
    score += 10;

    breakdown.transferGrowth =
      10;

  } else if (
    transferActivity.uniqueReceivers >= 5
  ) {
    score += 5;

    breakdown.transferGrowth =
      5;

  } else {
    breakdown.transferGrowth =
      0;
  }

  /*
    Persistence across blocks.
  */

  if (
    swapActivity.activeBlocks >= 8
  ) {
    score += 10;

    breakdown.persistence =
      10;

  } else if (
    swapActivity.activeBlocks >= 3
  ) {
    score += 5;

    breakdown.persistence =
      5;

  } else {
    breakdown.persistence =
      0;
  }

  /*
    Multiple pools.
  */

  if (
    pools.length >= 3
  ) {
    score += 5;

    breakdown.multiplePools =
      5;

  } else {
    breakdown.multiplePools =
      0;
  }

  /*
    Meme naming signal.
  */

  if (
    memeNameSignal(
      metadata.name,
      metadata.symbol
    )
  ) {
    score += 5;

    breakdown.memeName =
      5;

  } else {
    breakdown.memeName =
      0;
  }

  /*
    HARD SAFETY RULE:
    A token with zero actual swaps cannot score above 35.
  */

  if (
    swapActivity.swapCount === 0
  ) {
    score =
      Math.min(
        score,
        35
      );
  }

  /*
    HARD SAFETY RULE:
    Known infrastructure is not a candidate.
  */

  if (
    isKnownInfrastructure(
      metadata.address
    )
  ) {
    score = 0;

    breakdown.infrastructure =
      -100;
  }

  return {
    score:
      Math.min(
        100,
        score
      ),

    breakdown
  };
}


/* ============================================================
   TELEGRAM
   ============================================================ */

async function sendTelegramCandidate(
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

  const b =
    candidate.scoreBreakdown ||
    {};

  const message = [
    "🚨 ROBINHOOD CHAIN CANDIDATE",

    "",

    `⭐ SCORE: ${candidate.score}/100`,

    `🪙 ${
      candidate.name ||
      "Unknown"
    }`,

    `🔹 ${
      candidate.symbol ||
      "UNKNOWN"
    }`,

    "",

    `📍 ${candidate.address}`,

    "",

    "📊 ACTIVITY",

    `🔄 Swaps: ${
      candidate.swapActivity.swapCount
    }`,

    `👛 Unique traders: ${
      candidate.swapActivity.uniqueTraders
    }`,

    `🟢 Buy signals: ${
      candidate.swapActivity.buySignals
    }`,

    `🔴 Sell signals: ${
      candidate.swapActivity.sellSignals
    }`,

    `📦 Transfer events: ${
      candidate.transferActivity.transferEvents
    }`,

    "",

    "🎯 SCORE REASONS",

    `Pool: +${
      b.poolInitialized || 0
    }`,

    `Native pair: +${
      b.nativePair || 0
    }`,

    `Swap activity: +${
      b.swapActivity || 0
    }`,

    `Unique traders: +${
      b.uniqueTraders || 0
    }`,

    `Buy pressure: +${
      b.buyPressure || 0
    }`,

    `Transfers: +${
      b.transferGrowth || 0
    }`,

    `Persistence: +${
      b.persistence || 0
    }`,

    `Meme signal: +${
      b.memeName || 0
    }`,

    "",

    "⚠️ STILL UNVERIFIED",

    "Market cap",
    "Liquidity",
    "Holder concentration",
    "Whale accumulation",
    "Smart money",
    "Social momentum",

    "",

    "Robinhood Chain Meme Hunter V48"
  ].join("\n");

  return sendTelegramMessage(
    env,
    message
  );
}


async function sendTelegramMessage(
  env,
  message
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

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

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
}


/* ============================================================
   MAIN SCAN
   ============================================================ */

async function scan(env) {

  const latestBlock =
    await getLatestBlock(
      env
    );

  const startBlock =
    Math.max(
      0,
      latestBlock -
        (RPC_MAX_RANGE - 1)
    );

  /*
    ONE PoolManager request.

    This preserves the architecture that worked in V47.
  */

  const rawLogs =
    await getPoolManagerLogs(
      env,
      startBlock,
      latestBlock
    );

  const initializeEvents = [];

  const swapEvents = [];

  /*
    Classify logs structurally.
  */

  for (
    const log of rawLogs
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

      continue;
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

  /*
    ----------------------------------------------------------
    DISCOVER TOKENS
    ----------------------------------------------------------
  */

  const currencies = [];

  for (
    const event of
      initializeEvents
  ) {

    if (
      event.currency0 &&
      !isNativeCurrency(
        event.currency0
      )
    ) {

      currencies.push(
        event.currency0
      );
    }

    if (
      event.currency1 &&
      !isNativeCurrency(
        event.currency1
      )
    ) {

      currencies.push(
        event.currency1
      );
    }
  }

  const tokenAddresses =
    [
      ...new Set(
        currencies.map(
          address =>
            normalizeAddress(
              address
            )
        )
      )
    ];

  /*
    ----------------------------------------------------------
    VALIDATE TOKENS
    ----------------------------------------------------------
  */

  const validationResults = [];

  const candidates = [];

  /*
    Keep the RPC workload reasonable.
  */

  const tokensToCheck =
    tokenAddresses.slice(
      0,
      20
    );

  for (
    const address of
      tokensToCheck
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

    /*
      Skip known infrastructure.
    */

    if (
      isKnownInfrastructure(
        address
      )
    ) {
      continue;
    }

    /*
      Pools containing this token.
    */

    const pools =
      initializeEvents.filter(
        pool =>
          poolContainsToken(
            pool,
            address
          )
      );

    /*
      Swaps belonging to this token's pools.
    */

    const poolIds =
      new Set(
        pools.map(
          pool =>
            normalizeAddress(
              pool.poolId
            )
        )
      );

    const tokenSwaps =
      swapEvents.filter(
        swap =>
          poolIds.has(
            normalizeAddress(
              swap.poolId
            )
          )
      );

    /*
      Transfer activity.
    */

    const transferLogs =
      await getTokenTransferLogs(
        env,
        address,
        latestBlock
      );

    const swapActivity =
      analyseSwapActivity(
        tokenSwaps
      );

    const transferActivity =
      analyseTransferActivity(
        transferLogs
      );

    /*
      Score.
    */

    const scoring =
      scoreCandidate({
        metadata: {
          address,
          ...metadata
        },

        pools,

        swapActivity,

        transferActivity,

        latestBlock
      });

    candidates.push({

      address,

      validERC20:
        metadata.validERC20,

      name:
        metadata.name,

      symbol:
        metadata.symbol,

      decimals:
        metadata.decimals,

      totalSupply:
        metadata.totalSupply,

      poolInitialized:
        pools.length > 0,

      poolCount:
        pools.length,

      recentActivity:
        swapActivity.swapCount,

      swapActivity,

      transferActivity,

      score:
        scoring.score,

      scoreBreakdown:
        scoring.breakdown,

      pools,

      dataIntegrity: {

        noFabricatedMetrics:
          true,

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        holders:
          "UNVERIFIED",

        holderConcentration:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        whaleActivity:
          "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED",

        socialMomentum:
          "UNVERIFIED"
      }
    });
  }

  /*
    Sort highest potential first.
  */

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const qualifying =
    candidates.filter(
      candidate =>
        candidate.score >=
        TELEGRAM_THRESHOLD
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying.length > 0
  ) {

    telegramResult =
      await sendTelegramCandidate(
        env,
        qualifying[0]
      );
  }

  /*
    ----------------------------------------------------------
    LAUNCHPAD / ENTRY CONTRACT OBSERVATION
    ----------------------------------------------------------

    We keep these addresses in the architecture, but we do
    NOT pretend that every log emitted by them is a token
    creation event until the event structure is verified.

    This makes the data honest.
  */

  const launchpadObservations =
    [];

  const launchAddresses =
    [
      ...ENTRY_CONTRACTS,
      ...LAUNCHPADS
    ];

  const uniqueLaunchAddresses =
    [
      ...new Set(
        launchAddresses.map(
          normalizeAddress
        )
      )
    ];

  for (
    const launchAddress of
      uniqueLaunchAddresses
  ) {

    try {

      const logs =
        await rpc(
          env,
          "eth_getLogs",
          [
            {
              address:
                launchAddress,

              fromBlock:
                "0x" +
                startBlock.toString(
                  16
                ),

              toBlock:
                "0x" +
                latestBlock.toString(
                  16
                )
            }
          ]
        );

      launchpadObservations.push({

        address:
          launchAddress,

        logsFound:
          Array.isArray(logs)
            ? logs.length
            : 0,

        tokenCreationEvents:
          "UNVERIFIED"

      });

    } catch {

      launchpadObservations.push({

        address:
          launchAddress,

        logsFound:
          0,

        tokenCreationEvents:
          "UNVERIFIED",

        rpcError:
          true
      });
    }
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
        rawLogs.length,

      initializeEventsFound:
        initializeEvents.length,

      swapEventsFound:
        swapEvents.length,

      currenciesDiscovered:
        currencies.length,

      uniqueTokenCandidates:
        tokenAddresses.length,

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

      candidates,

      qualifyingCandidates:
        qualifying.length,

      telegram:
        telegramResult,

      launchpadObservations,

      rpcProvider:
        "ALCHEMY",

      discovery:
        "UNISWAP_V4_INITIALIZE_AND_SWAP_STRUCTURAL_V48",

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
          swapEvents.length > 0
            ? "PARTIALLY_VERIFIED"
            : "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED",

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        volume:
          swapEvents.length > 0
            ? "RAW_SWAP_ACTIVITY_ONLY"
            : "UNVERIFIED",

        socialMomentum:
          "UNVERIFIED"
      }
    },

    timestamp:
      new Date().toISOString()
  };
}


/* ============================================================
   HEALTH
   ============================================================ */

async function health(env) {

  let rpcStatus =
    "NOT_TESTED";

  let latestBlock =
    null;

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
      "UNISWAP_V4_INITIALIZE_AND_SWAP_STRUCTURAL_V48",

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
      "V48_POOL_DISCOVERY_ACTIVITY_SCORING",

    timestamp:
      new Date().toISOString()
  };
}


/* ============================================================
   TELEGRAM TEST
   ============================================================ */

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

  const message = [
    "🧪 Robinhood Chain Meme Hunter V48",
    "",
    "Telegram test successful.",
    "",
    "Automatic alerts: ENABLED",
    `Minimum score: ${TELEGRAM_THRESHOLD}`
  ].join("\n");

  const result =
    await sendTelegramMessage(
      env,
      message
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


/* ============================================================
   SINGLE CLOUDFLARE WORKER EXPORT
   ============================================================ */

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

      return json({

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

      }, 500);
    }
  }
};


/* ============================================================
   JSON RESPONSE
   ============================================================ */

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
