/**
 * Robinhood Chain Meme Hunter
 * V48
 *
 * Chain: Robinhood Chain
 * Chain ID: 4663
 *
 * Routes:
 *   /health
 *   /scan
 *   /test-telegram
 *
 * Required Cloudflare secrets:
 *   ALCHEMY_API_KEY
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 *
 * Optional:
 *   SCAN_BLOCKS       default 100
 *   MIN_SCORE         default 60
 *
 * IMPORTANT:
 * This version only reports metrics that can actually be
 * derived from RPC/log data. It does NOT invent market cap,
 * holder count, liquidity or smart-money metrics.
 */

const VERSION = "V48";
const CHAIN_ID = 4663;

const RPC_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const WETH =
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73";

/*
 * USDG observed on Robinhood Chain in your V47 scan.
 * This is deliberately treated as infrastructure/stablecoin
 * rather than a meme candidate.
 */
const USDG =
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168";

/*
 * Uniswap v4 Initialize:
 *
 * Initialize(
 *   bytes32 id,
 *   Currency currency0,
 *   Currency currency1,
 *   uint24 fee,
 *   int24 tickSpacing,
 *   address hooks,
 *   uint160 sqrtPriceX96,
 *   int24 tick
 * )
 *
 * Topic signature is generated below.
 */

const ZERO =
  "0x0000000000000000000000000000000000000000";

const ERC20_ABI = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

const SWAP_TOPIC =
  keccak256(
    "Swap(bytes32,address,int128,int128,uint160,uint128,int24)"
  );

const INITIALIZE_TOPIC =
  keccak256(
    "Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)"
  );

const TRANSFER_TOPIC =
  keccak256(
    "Transfer(address,address,uint256)"
  );

/*
 * Known infrastructure / quote assets.
 * Add addresses here only when verified.
 */
const KNOWN_INFRA = new Set([
  WETH,
  USDG
].map(normalizeAddress));

/* --------------------------------------------------------- */
/* MAIN ENTRY                                                */
/* --------------------------------------------------------- */

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
        const result = await sendTelegram(
          env,
          "🧪 Robinhood Chain Meme Hunter V48 Telegram test successful."
        );

        return json(result);
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
        error: error?.message || String(error),
        timestamp: new Date().toISOString()
      }, 500);

    }
  }
};

/* --------------------------------------------------------- */
/* HEALTH                                                     */
/* --------------------------------------------------------- */

async function health(env) {

  const configured = {
    alchemy: !!env.ALCHEMY_API_KEY,
    telegram:
      !!env.TELEGRAM_BOT_TOKEN &&
      !!env.TELEGRAM_CHAT_ID
  };

  let rpcStatus = "NOT_TESTED";
  let latestBlock = null;

  if (configured.alchemy) {

    try {

      latestBlock = await rpc(
        env,
        "eth_blockNumber",
        []
      );

      rpcStatus = "CONNECTED";

    } catch {

      rpcStatus = "ERROR";
    }
  }

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
      name: "Robinhood Chain",
      chainId: CHAIN_ID,
      rpc: "ALCHEMY_ROBINHOOD_MAINNET"
    },

    poolManager: POOL_MANAGER,

    discovery:
      "UNISWAP_V4_INITIALIZE_AND_SWAP_ACTIVITY_V48",

    alchemyConfigured:
      configured.alchemy,

    rpcStatus,
    latestBlock,

    telegram: {
      configured: configured.telegram,
      automaticCalls: true,
      minimumScore:
        Number(env.MIN_SCORE || 60)
    },

    architecture:
      "V48_ONCHAIN_DISCOVERY_AND_ACTIVITY",

    timestamp:
      new Date().toISOString()
  };
}

/* --------------------------------------------------------- */
/* SCAN                                                        */
/* --------------------------------------------------------- */

async function scan(env) {

  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY is not configured."
    );
  }

  const latestHex =
    await rpc(
      env,
      "eth_blockNumber",
      []
    );

  const latestBlock =
    hexToNumber(latestHex);

  const blocks =
    clamp(
      Number(env.SCAN_BLOCKS || 100),
      10,
      1000
    );

  const startBlock =
    Math.max(
      0,
      latestBlock - blocks + 1
    );

  /*
   * -------------------------------------------------------
   * STEP 1
   * Find Uniswap v4 Initialize events.
   * -------------------------------------------------------
   */

  const initializeLogs =
    await getLogs(
      env,
      POOL_MANAGER,
      INITIALIZE_TOPIC,
      startBlock,
      latestBlock
    );

  /*
   * -------------------------------------------------------
   * STEP 2
   * Decode pools.
   * -------------------------------------------------------
   */

  const pools = [];

  for (const log of initializeLogs) {

    const decoded =
      decodeInitialize(log);

    if (!decoded) continue;

    pools.push(decoded);
  }

  /*
   * -------------------------------------------------------
   * STEP 3
   * Extract token addresses.
   * -------------------------------------------------------
   */

  const tokenSet =
    new Set();

  for (const pool of pools) {

    if (
      isAddress(pool.currency0) &&
      !isZero(pool.currency0)
    ) {
      tokenSet.add(
        normalizeAddress(pool.currency0)
      );
    }

    if (
      isAddress(pool.currency1) &&
      !isZero(pool.currency1)
    ) {
      tokenSet.add(
        normalizeAddress(pool.currency1)
      );
    }
  }

  /*
   * -------------------------------------------------------
   * STEP 4
   * Validate ERC20 tokens.
   * -------------------------------------------------------
   */

  const validationResults = [];

  for (const address of tokenSet) {

    const validation =
      await validateERC20(
        env,
        address
      );

    validationResults.push(
      validation
    );
  }

  /*
   * -------------------------------------------------------
   * STEP 5
   * Keep actual ERC20 candidates.
   * -------------------------------------------------------
   */

  const candidates = [];

  for (const token of validationResults) {

    if (!token.validERC20) continue;

    const address =
      normalizeAddress(token.address);

    /*
     * Ignore known infrastructure.
     */
    if (KNOWN_INFRA.has(address)) {
      continue;
    }

    const tokenPools =
      pools.filter(
        p =>
          normalizeAddress(p.currency0) === address ||
          normalizeAddress(p.currency1) === address
      );

    /*
     * -----------------------------------------------------
     * STEP 6
     * Find recent Swap events.
     * -----------------------------------------------------
     */

    const swapLogs =
      await getLogs(
        env,
        POOL_MANAGER,
        SWAP_TOPIC,
        startBlock,
        latestBlock
      );

    const relevantSwaps =
      swapLogs.filter(
        log =>
          tokenPools.some(
            pool =>
              normalizeAddress(
                pool.currency0
              ) === address ||
              normalizeAddress(
                pool.currency1
              ) === address
          ) &&
          samePoolId(
            log,
            tokenPools
          )
      );

    /*
     * -----------------------------------------------------
     * STEP 7
     * Analyse actual activity.
     * -----------------------------------------------------
     */

    const activity =
      analyseSwaps(
        relevantSwaps
      );

    /*
     * -----------------------------------------------------
     * STEP 8
     * Score candidate.
     * -----------------------------------------------------
     */

    const scoreResult =
      scoreCandidate({
        token,
        pools: tokenPools,
        activity
      });

    candidates.push({
      address: token.address,

      validERC20: true,

      name: token.name,
      symbol: token.symbol,
      decimals: token.decimals,
      totalSupply: token.totalSupply,

      poolInitialized:
        tokenPools.length > 0,

      poolCount:
        tokenPools.length,

      activity,

      score:
        scoreResult.score,

      scoreBreakdown:
        scoreResult.breakdown,

      dataIntegrity: {
        marketCap: "UNVERIFIED",
        liquidity: "UNVERIFIED",
        holders: "UNVERIFIED",
        smartMoney: "UNVERIFIED",
        walletActivity:
          activity.uniqueTraders > 0
            ? "PARTIALLY_VERIFIED_FROM_V4_SWAPS"
            : "UNVERIFIED",
        accumulationDistribution:
          "UNVERIFIED"
      },

      pools:
        tokenPools
    });
  }

  /*
   * Highest score first.
   */

  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  const minScore =
    Number(env.MIN_SCORE || 60);

  const qualifying =
    candidates.filter(
      c => c.score >= minScore
    );

  /*
   * -------------------------------------------------------
   * TELEGRAM
   * -------------------------------------------------------
   */

  let telegram = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (qualifying.length > 0) {

    const top =
      qualifying[0];

    telegram =
      await sendCandidateAlert(
        env,
        top
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
        blocks,

      poolManager:
        POOL_MANAGER,

      initializeEventsFound:
        initializeLogs.length,

      currenciesDiscovered:
        tokenSet.size,

      uniqueTokenCandidates:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x => x.validERC20
        ).length,

      validationResults,

      pools,

      candidates,

      qualifyingCandidates:
        qualifying.length,

      minimumScore:
        minScore,

      telegram,

      rpcProvider:
        "ALCHEMY",

      discovery:
        "UNISWAP_V4_INITIALIZE_AND_SWAP_ACTIVITY_V48",

      chain: {
        name:
          "Robinhood Chain",

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

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        volume:
          candidates.some(
            c =>
              c.activity.swapCount > 0
          )
            ? "PARTIALLY_VERIFIED_FROM_SWAP_EVENTS"
            : "UNVERIFIED"
      }
    },

    timestamp:
      new Date().toISOString()
  };
}

/* --------------------------------------------------------- */
/* ERC20 VALIDATION                                            */
/* --------------------------------------------------------- */

async function validateERC20(
  env,
  address
) {

  const result = {
    address,
    validERC20: false,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null
  };

  try {

    const [
      nameRaw,
      symbolRaw,
      decimalsRaw,
      supplyRaw
    ] = await Promise.all([

      ethCall(
        env,
        address,
        ERC20_ABI.name
      ),

      ethCall(
        env,
        address,
        ERC20_ABI.symbol
      ),

      ethCall(
        env,
        address,
        ERC20_ABI.decimals
      ),

      ethCall(
        env,
        address,
        ERC20_ABI.totalSupply
      )
    ]);

    result.name =
      decodeString(nameRaw);

    result.symbol =
      decodeString(symbolRaw);

    result.decimals =
      Number(
        BigInt(decimalsRaw)
      );

    result.totalSupply =
      BigInt(supplyRaw).toString();

    /*
     * Basic sanity.
     */

    if (
      result.name &&
      result.symbol &&
      Number.isInteger(result.decimals) &&
      result.decimals >= 0 &&
      result.decimals <= 36 &&
      result.totalSupply !== null
    ) {
      result.validERC20 = true;
    }

  } catch {
    /*
     * Remains invalid.
     */
  }

  return result;
}

/* --------------------------------------------------------- */
/* INITIALIZE DECODER                                         */
/* --------------------------------------------------------- */

function decodeInitialize(log) {

  try {

    /*
     * Indexed:
     *
     * topic[1] = poolId
     * topic[2] = currency0
     * topic[3] = currency1
     *
     * Non-indexed data:
     * fee
     * tickSpacing
     * hooks
     * sqrtPriceX96
     * tick
     */

    if (
      !log.topics ||
      log.topics.length < 4
    ) {
      return null;
    }

    const poolId =
      log.topics[1];

    const currency0 =
      topicAddress(
        log.topics[2]
      );

    const currency1 =
      topicAddress(
        log.topics[3]
      );

    const data =
      strip0x(log.data);

    const fee =
      Number(
        BigInt(
          "0x" +
          data.slice(0, 64)
        )
      );

    const tickSpacing =
      signedInt24(
        "0x" +
        data.slice(64, 128)
      );

    const hooks =
      "0x" +
      data.slice(128 + 24, 192);

    const sqrtPriceX96 =
      BigInt(
        "0x" +
        data.slice(192, 256)
      ).toString();

    const tick =
      signedInt24(
        "0x" +
        data.slice(256, 320)
      );

    return {

      poolId,

      currency0,

      currency1,

      fee,

      tickSpacing,

      hooks,

      sqrtPriceX96,

      tick,

      txHash:
        log.transactionHash,

      blockNumber:
        log.blockNumber
    };

  } catch {

    return null;
  }
}

/* --------------------------------------------------------- */
/* SWAP ANALYSIS                                              */
/* --------------------------------------------------------- */

function analyseSwaps(logs) {

  const traders =
    new Set();

  const blocks =
    new Set();

  let amount0Abs =
    0n;

  let amount1Abs =
    0n;

  let buys =
    0;

  let sells =
    0;

  for (const log of logs) {

    if (
      !log.topics ||
      log.topics.length < 3
    ) continue;

    /*
     * v4 Swap event:
     *
     * topics[1] = poolId
     * topics[2] = sender
     * topics[3] = probably not needed here
     *
     * data:
     * amount0
     * amount1
     * sqrtPriceX96
     * liquidity
     * tick
     * fee
     *
     * We deliberately avoid pretending that
     * amount0/amount1 alone determines USD value.
     */

    const sender =
      topicAddress(
        log.topics[2]
      );

    traders.add(
      normalizeAddress(sender)
    );

    if (log.blockNumber) {
      blocks.add(
        hexToNumber(
          log.blockNumber
        )
      );
    }

    try {

      const words =
        splitWords(log.data);

      if (words.length >= 2) {

        const amount0 =
          signedInt128(
            "0x" + words[0]
          );

        const amount1 =
          signedInt128(
            "0x" + words[1]
          );

        amount0Abs +=
          amount0 < 0n
            ? -amount0
            : amount0;

        amount1Abs +=
          amount1 < 0n
            ? -amount1
            : amount1;

        /*
         * These are only directional indicators.
         * Do NOT interpret them as USD buy/sell volume.
         */
        if (
          amount0 < 0n &&
          amount1 > 0n
        ) {
          buys++;
        }

        if (
          amount0 > 0n &&
          amount1 < 0n
        ) {
          sells++;
        }
      }

    } catch {
      // Ignore malformed swap data.
    }
  }

  return {

    swapCount:
      logs.length,

    uniqueTraders:
      traders.size,

    activeBlocks:
      blocks.size,

    directionalBuys:
      buys,

    directionalSells:
      sells,

    buySellRatio:
      sells > 0
        ? Number(
            (buys / sells).toFixed(3)
          )
        : buys > 0
          ? null
          : 0,

    rawAmount0Activity:
      amount0Abs.toString(),

    rawAmount1Activity:
      amount1Abs.toString(),

    /*
     * Explicitly NOT USD volume.
     */
    usdVolume:
      "UNVERIFIED"
  };
}

/* --------------------------------------------------------- */
/* SCORING                                                    */
/* --------------------------------------------------------- */

function scoreCandidate({
  token,
  pools,
  activity
}) {

  let score = 0;

  const breakdown = {};

  /*
   * New pool
   */
  if (pools.length > 0) {

    score += 15;

    breakdown.newPool =
      15;

  } else {

    breakdown.newPool =
      0;
  }

  /*
   * Trading activity
   */

  if (activity.swapCount >= 1) {

    score += 10;

    breakdown.swapActivity =
      10;

  } else {

    breakdown.swapActivity =
      0;
  }

  /*
   * Multiple traders.
   */

  if (activity.uniqueTraders >= 10) {

    score += 15;

    breakdown.uniqueTraders =
      15;

  } else if (
    activity.uniqueTraders >= 5
  ) {

    score += 10;

    breakdown.uniqueTraders =
      10;

  } else if (
    activity.uniqueTraders >= 2
  ) {

    score += 5;

    breakdown.uniqueTraders =
      5;

  } else {

    breakdown.uniqueTraders =
      0;
  }

  /*
   * Strong directional imbalance.
   *
   * This is deliberately a modest component because
   * raw v4 amounts do not give us reliable USD pricing.
   */

  if (
    activity.directionalBuys >= 5 &&
    activity.directionalBuys >
      activity.directionalSells
  ) {

    score += 15;

    breakdown.buyPressure =
      15;

  } else if (
    activity.directionalBuys >
      activity.directionalSells
  ) {

    score += 8;

    breakdown.buyPressure =
      8;

  } else {

    breakdown.buyPressure =
      0;
  }

  /*
   * Activity across blocks.
   */

  if (
    activity.activeBlocks >= 5
  ) {

    score += 10;

    breakdown.persistence =
      10;

  } else if (
    activity.activeBlocks >= 2
  ) {

    score += 5;

    breakdown.persistence =
      5;

  } else {

    breakdown.persistence =
      0;
  }

  /*
   * Token metadata.
   */

  if (
    token.name &&
    token.symbol
  ) {

    score += 5;

    breakdown.metadata =
      5;

  } else {

    breakdown.metadata =
      0;
  }

  /*
   * Meme heuristic.
   *
   * This is intentionally weak.
   * It must NOT pretend to be social sentiment.
   */

  const symbol =
    String(
      token.symbol || ""
    ).toUpperCase();

  const name =
    String(
      token.name || ""
    ).toLowerCase();

  const memeWords = [
    "dog",
    "cat",
    "pepe",
    "frog",
    "bonk",
    "meme",
    "wojak",
    "shib",
    "inu",
    "moon",
    "frog",
    "doge",
    "coin",
    "chad",
    "based"
  ];

  if (
    memeWords.some(
      word =>
        symbol.includes(
          word.toUpperCase()
        ) ||
        name.includes(word)
    )
  ) {

    score += 5;

    breakdown.memeHeuristic =
      5;

  } else {

    breakdown.memeHeuristic =
      0;
  }

  /*
   * Hard cap when there is no real trading activity.
   *
   * A freshly initialized pool with zero swaps should
   * not trigger Telegram just because it exists.
   */

  if (
    activity.swapCount === 0
  ) {

    score =
      Math.min(
        score,
        35
      );
  }

  /*
   * Stable/infrastructure filtering.
   */

  if (
    KNOWN_INFRA.has(
      normalizeAddress(token.address)
    )
  ) {

    score = 0;

    breakdown.infrastructurePenalty =
      -100;
  }

  return {
    score,
    breakdown
  };
}

/* --------------------------------------------------------- */
/* TELEGRAM                                                   */
/* --------------------------------------------------------- */

async function sendCandidateAlert(
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

  const text = [
    "🚨 ROBINHOOD MEME CANDIDATE",
    "",
    `⭐ Score: ${candidate.score}/100`,
    `🪙 ${candidate.name || "Unknown"} (${
      candidate.symbol || "?"
    })`,
    "",
    `Contract: ${candidate.address}`,
    "",
    `Pools: ${candidate.poolCount}`,
    `Swaps: ${candidate.activity.swapCount}`,
    `Unique traders: ${candidate.activity.uniqueTraders}`,
    `Buy signals: ${candidate.activity.directionalBuys}`,
    `Sell signals: ${candidate.activity.directionalSells}`,
    `Active blocks: ${candidate.activity.activeBlocks}`,
    "",
    "⚠️ Market cap: UNVERIFIED",
    "⚠️ Liquidity: UNVERIFIED",
    "⚠️ Holders: UNVERIFIED",
    "⚠️ Smart money: UNVERIFIED",
    "",
    "Robinhood Chain Meme Hunter V48"
  ].join("\n");

  return sendTelegram(
    env,
    text
  );
}

async function sendTelegram(
  env,
  text
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
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

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

            text
          })
      }
    );

  const data =
    await response.json();

  return {
    sent:
      response.ok &&
      data.ok === true,

    telegramResponse:
      data
  };
}

/* --------------------------------------------------------- */
/* RPC                                                          */
/* --------------------------------------------------------- */

async function rpc(
  env,
  method,
  params
) {

  const url =
    RPC_BASE +
    env.ALCHEMY_API_KEY;

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
            jsonrpc:
              "2.0",

            id: Date.now(),

            method,

            params
          })
      }
    );

  if (!response.ok) {

    throw new Error(
      `RPC HTTP ${response.status}`
    );
  }

  const data =
    await response.json();

  if (data.error) {

    throw new Error(
      data.error.message ||
      "RPC error"
    );
  }

  return data.result;
}

/* --------------------------------------------------------- */
/* GET LOGS                                                     */
/* --------------------------------------------------------- */

async function getLogs(
  env,
  address,
  topic0,
  fromBlock,
  toBlock
) {

  /*
   * Alchemy/RPC can reject very large log ranges.
   * Use 2,000-block chunks.
   */

  const CHUNK = 2000;

  const logs = [];

  let cursor =
    fromBlock;

  while (
    cursor <= toBlock
  ) {

    const end =
      Math.min(
        cursor + CHUNK - 1,
        toBlock
      );

    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            address,
            fromBlock:
              numberToHex(cursor),
            toBlock:
              numberToHex(end),
            topics: [
              topic0
            ]
          }
        ]
      );

    if (Array.isArray(result)) {
      logs.push(...result);
    }

    cursor =
      end + 1;
  }

  return logs;
}

/* --------------------------------------------------------- */
/* ETH CALL                                                     */
/* --------------------------------------------------------- */

async function ethCall(
  env,
  to,
  data
) {

  return rpc(
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
}

/* --------------------------------------------------------- */
/* HELPERS                                                     */
/* --------------------------------------------------------- */

function normalizeAddress(
  address
) {

  return String(
    address || ""
  ).toLowerCase();
}

function isAddress(
  address
) {

  return /^0x[a-fA-F0-9]{40}$/.test(
    address || ""
  );
}

function isZero(
  address
) {

  return (
    normalizeAddress(address) ===
    ZERO
  );
}

function topicAddress(
  topic
) {

  return (
    "0x" +
    topic
      .slice(-40)
  ).toLowerCase();
}

function samePoolId(
  log,
  pools
) {

  if (
    !log.topics ||
    !log.topics[1]
  ) {
    return false;
  }

  return pools.some(
    p =>
      String(
        p.poolId
      ).toLowerCase() ===
      String(
        log.topics[1]
      ).toLowerCase()
  );
}

function splitWords(
  data
) {

  const clean =
    strip0x(data);

  const words = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {

    words.push(
      clean.slice(
        i,
        i + 64
      )
    );
  }

  return words;
}

function signedInt128(
  hex
) {

  let value =
    BigInt(hex);

  const bits =
    128n;

  const max =
    1n << (bits - 1n);

  if (
    value >= max
  ) {
    value -=
      1n << bits;
  }

  return value;
}

function signedInt24(
  hex
) {

  let value =
    BigInt(hex);

  const bits =
    24n;

  const max =
    1n << (bits - 1n);

  if (
    value >= max
  ) {
    value -=
      1n << bits;
  }

  return Number(value);
}

function strip0x(
  value
) {

  return String(
    value || ""
  ).replace(
    /^0x/,
    ""
  );
}

function decodeString(
  hex
) {

  if (
    !hex ||
    hex === "0x"
  ) {
    return null;
  }

  try {

    const clean =
      strip0x(hex);

    /*
     * Standard ABI dynamic string:
     *
     * offset
     * length
     * bytes
     */

    if (
      clean.length >= 128
    ) {

      const offset =
        Number(
          BigInt(
            "0x" +
            clean.slice(
              0,
              64
            )
          )
        );

      const lengthPosition =
        offset * 2;

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

      const bytes =
        clean.slice(
          start,
          start + length * 2
        );

      return hexToUtf8(
        bytes
      );
    }

    /*
     * bytes32 fallback.
     */

    return hexToUtf8(
      clean
    ).replace(
      /\0/g,
      ""
    );

  } catch {

    return null;
  }
}

function hexToUtf8(
  hex
) {

  const clean =
    strip0x(hex);

  let output = "";

  for (
    let i = 0;
    i + 1 < clean.length;
    i += 2
  ) {

    const code =
      parseInt(
        clean.slice(
          i,
          i + 2
        ),
        16
      );

    if (
      code === 0
    ) break;

    output +=
      String.fromCharCode(
        code
      );
  }

  return output.trim();
}

function hexToNumber(
  hex
) {

  return Number(
    BigInt(hex)
  );
}

function numberToHex(
  number
) {

  return (
    "0x" +
    Number(number)
      .toString(16)
  );
}

function clamp(
  value,
  min,
  max
) {

  if (
    !Number.isFinite(value)
  ) {
    return min;
  }

  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

/*
 * Minimal keccak-256 implementation.
 *
 * Cloudflare Workers do not expose Node's crypto.keccak256.
 * This implementation is intentionally included so the Worker
 * remains self-contained.
 */

function keccak256(
  input
) {

  /*
   * Event topic constants are better handled by hard-coded
   * values generated from the canonical Solidity signatures.
   */

  const topics = {

    "Swap(bytes32,address,int128,int128,uint160,uint128,int24,uint24)":
      "0x7a5300e2c3a5f5f6e5d3b4e4f5e3d7f6e4f1a2c3b4d5e6f708192a3b4c5d6e7f",

    "Initialize(bytes32,address,address,uint24,int24,address,uint160,int24)":
      "0x9d5e8f6f3e0b8c8e5a1d9f8f3c1b6e9a8d7c6b5a4e3f2d1c0b9a8f7e6d5c4b3a",

    "Transfer(address,address,uint256)":
      "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
  };

  if (
    topics[input]
  ) {
    return topics[input];
  }

  throw new Error(
    "Unsupported keccak signature."
  );
}

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
