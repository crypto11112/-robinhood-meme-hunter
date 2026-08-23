const VERSION = "V35";

const CHAIN_ID = 4663;

const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

/*
 * Robinhood Chain / pools.trade
 *
 * Two TokenCreated entry contracts:
 */
const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

/*
 * Four pools.trade launchpad contracts.
 *
 * Current path:
 *   tickSpacing 25
 *
 * Original path:
 *   tickSpacing 60
 */
const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

/*
 * pools.trade TokenCreated(address)
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
 * pools.trade TokenLaunched(
 *   bytes32,
 *   address,
 *   address,
 *   (address,address,uint24,int24,address)
 * )
 */
const TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

/*
 * Uniswap v4 PoolManager on Robinhood Chain.
 */
const V4_POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

/*
 * Native ETH in Uniswap v4 is represented by address zero.
 */
const NATIVE_ETH =
  "0x0000000000000000000000000000000000000000";

/*
 * Conservative scanning window.
 */
const MAX_BLOCKS = 500;

/*
 * Keep external market-data calls low.
 */
const MAX_MARKET_LOOKUPS = 2;

/*
 * Public pools.trade frontend API.
 *
 * This is used only as secondary enrichment.
 * It is NOT required for token discovery.
 */
const POOLS_TRADE_API =
  "https://pools.trade/api/trpc/curve.getLaunchByAddress";

/*
 * DEX Screener fallback.
 */
const DEXSCREENER_API =
  "https://api.dexscreener.com/latest/dex/tokens/";

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "cache-control":
          "no-store"
      }
    }
  );
}

async function rpc(method, params) {
  const response = await fetch(
    RPC_URL,
    {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
        "accept":
          "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      })
    }
  );

  const text =
    await response.text();

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error(
        "RPC_RATE_LIMITED"
      );
    }

    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }

  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      "RPC_INVALID_JSON"
    );
  }

  if (data.error) {
    const message =
      data.error.message ||
      "RPC_ERROR";

    if (
      data.error.code === 429 ||
      /rate.?limit|too many/i.test(
        message
      )
    ) {
      throw new Error(
        "RPC_RATE_LIMITED"
      );
    }

    throw new Error(
      message
    );
  }

  return data.result;
}

function hexBlock(number) {
  return (
    "0x" +
    number.toString(16)
  );
}

async function latestBlock() {
  const result =
    await rpc(
      "eth_blockNumber",
      []
    );

  return parseInt(
    result,
    16
  );
}

/*
 * Performs ONE eth_getLogs request
 * for both entry contracts.
 *
 * JSON-RPC permits address to be
 * either a single address or an array.
 */
async function discoverTokens(
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address:
        ENTRY_CONTRACTS,

      fromBlock:
        hexBlock(fromBlock),

      toBlock:
        hexBlock(toBlock),

      topics: [
        TOKEN_CREATED_TOPIC
      ]
    }]
  );
}

/*
 * Performs ONE eth_getLogs request
 * for all four pools.trade launchpads.
 *
 * This is the key V35 improvement.
 */
async function discoverPools(
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address:
        LAUNCHPAD_CONTRACTS,

      fromBlock:
        hexBlock(fromBlock),

      toBlock:
        hexBlock(toBlock),

      topics: [
        TOKEN_LAUNCHED_TOPIC
      ]
    }]
  );
}

function topicAddress(topic) {
  if (
    typeof topic !== "string" ||
    topic.length !== 66
  ) {
    return null;
  }

  const address =
    "0x" +
    topic
      .slice(-40)
      .toLowerCase();

  if (
    !/^0x[a-f0-9]{40}$/.test(
      address
    )
  ) {
    return null;
  }

  return address;
}

function extractTokenCreatedAddress(
  log
) {
  /*
   * TokenCreated(address)
   *
   * The address is normally indexed
   * as topics[1].
   */
  if (
    Array.isArray(log.topics) &&
    log.topics.length >= 2
  ) {
    return topicAddress(
      log.topics[1]
    );
  }

  /*
   * Defensive fallback:
   * inspect data for a single address.
   */
  if (
    typeof log.data === "string" &&
    log.data.length >= 66
  ) {
    const word =
      log.data.slice(
        -64
      );

    return topicAddress(
      "0x" + word
    );
  }

  return null;
}

function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(x =>
          x.toLowerCase()
        )
    )
  ];
}

function parseWord(
  data,
  index
) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return null;
  }

  const start =
    2 +
    index * 64;

  const word =
    data.slice(
      start,
      start + 64
    );

  if (
    word.length !== 64
  ) {
    return null;
  }

  return word;
}

function wordAddress(
  data,
  index
) {
  const word =
    parseWord(
      data,
      index
    );

  if (!word) {
    return null;
  }

  return (
    "0x" +
    word.slice(-40)
  ).toLowerCase();
}

function wordUint(
  data,
  index
) {
  const word =
    parseWord(
      data,
      index
    );

  if (!word) {
    return null;
  }

  try {
    return BigInt(
      "0x" + word
    );
  } catch {
    return null;
  }
}

/*
 * TokenLaunched:
 *
 * topics[1] = poolId
 * topics[2] = token
 * topics[3] = finalPositionRecipient
 *
 * data:
 *
 * word 0 = currency0
 * word 1 = currency1
 * word 2 = fee
 * word 3 = tickSpacing
 * word 4 = hooks
 */
function parseTokenLaunched(
  log
) {
  if (
    !Array.isArray(log.topics) ||
    log.topics.length < 3
  ) {
    return null;
  }

  const poolId =
    log.topics[1] || null;

  const tokenFromTopic =
    topicAddress(
      log.topics[2]
    );

  const currency0 =
    wordAddress(
      log.data,
      0
    );

  const currency1 =
    wordAddress(
      log.data,
      1
    );

  const feeRaw =
    wordUint(
      log.data,
      2
    );

  const tickSpacingRaw =
    wordUint(
      log.data,
      3
    );

  const hooks =
    wordAddress(
      log.data,
      4
    );

  const token =
    tokenFromTopic ||
    (
      currency0 ===
      NATIVE_ETH
        ? currency1
        : currency1 ===
          NATIVE_ETH
          ? currency0
          : null
    );

  if (!token) {
    return null;
  }

  return {
    token:
      token.toLowerCase(),

    poolId:
      poolId
        ? poolId.toLowerCase()
        : null,

    currency0,

    currency1,

    fee:
      feeRaw !== null
        ? Number(
            feeRaw
          )
        : null,

    tickSpacing:
      tickSpacingRaw !== null
        ? Number(
            tickSpacingRaw
          )
        : null,

    hooks,

    launchpad:
      log.address
        ? log.address.toLowerCase()
        : null,

    blockNumber:
      log.blockNumber ||
      null,

    transactionHash:
      log.transactionHash ||
      null,

    logIndex:
      log.logIndex ||
      null
  };
}

function poolType(
  tickSpacing
) {
  if (
    tickSpacing === 25
  ) {
    return "CURRENT_PATH";
  }

  if (
    tickSpacing === 60
  ) {
    return "ORIGINAL_PATH";
  }

  return "OTHER";
}

function basePoolScore(pool) {
  let score = 0;

  /*
   * A TokenLaunched event proves
   * the token has an identified v4 pool.
   */
  if (pool.poolId) {
    score += 30;
  }

  /*
   * Native ETH pairing is the
   * expected pools.trade structure.
   */
  if (
    pool.currency0 ===
      NATIVE_ETH ||
    pool.currency1 ===
      NATIVE_ETH
  ) {
    score += 20;
  }

  /*
   * Current pools.trade path.
   */
  if (
    pool.tickSpacing === 25
  ) {
    score += 15;
  }

  /*
   * Original pools.trade path.
   */
  if (
    pool.tickSpacing === 60
  ) {
    score += 10;
  }

  /*
   * Standard pools.trade fee.
   */
  if (
    pool.fee === 2500
  ) {
    score += 15;
  }

  /*
   * No hooks is expected for
   * the standard pools.trade pool.
   */
  if (
    pool.hooks ===
      NATIVE_ETH
  ) {
    score += 10;
  }

  return Math.min(
    score,
    100
  );
}

/*
 * Safely extract possible numeric
 * fields from the pools.trade response.
 *
 * We never invent a value.
 */
function findNumber(
  value,
  names,
  depth = 0
) {
  if (
    depth > 6 ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  if (
    typeof value !== "object"
  ) {
    return null;
  }

  for (
    const name of names
  ) {
    if (
      Object.prototype.hasOwnProperty.call(
        value,
        name
      )
    ) {
      const candidate =
        value[name];

      if (
        typeof candidate ===
        "number" &&
        Number.isFinite(
          candidate
        )
      ) {
        return candidate;
      }

      if (
        typeof candidate ===
          "string" &&
        candidate.trim() !==
          ""
      ) {
        const n =
          Number(
            candidate
          );

        if (
          Number.isFinite(n)
        ) {
          return n;
        }
      }
    }
  }

  for (
    const key of Object.keys(
      value
    )
  ) {
    const result =
      findNumber(
        value[key],
        names,
        depth + 1
      );

    if (
      result !== null
    ) {
      return result;
    }
  }

  return null;
}

function findString(
  value,
  names,
  depth = 0
) {
  if (
    depth > 6 ||
    value === null ||
    value === undefined
  ) {
    return null;
  }

  if (
    typeof value === "string" &&
    value.trim()
  ) {
    return null;
  }

  if (
    typeof value !== "object"
  ) {
    return null;
  }

  for (
    const name of names
  ) {
    if (
      typeof value[name] ===
      "string" &&
      value[name].trim()
    ) {
      return value[name];
    }
  }

  for (
    const key of Object.keys(
      value
    )
  ) {
    const result =
      findString(
        value[key],
        names,
        depth + 1
      );

    if (result) {
      return result;
    }
  }

  return null;
}

async function poolsTradeLookup(
  token
) {
  const input =
    encodeURIComponent(
      JSON.stringify({
        "0": {
          tokenAddress:
            token
        }
      })
    );

  const url =
    `${POOLS_TRADE_API}?batch=1&input=${input}`;

  const response =
    await fetch(
      url,
      {
        headers: {
          "accept":
            "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `POOLS_TRADE_HTTP_${response.status}`
    );
  }

  return response.json();
}

async function dexLookup(
  token
) {
  const response =
    await fetch(
      DEXSCREENER_API +
        token,
      {
        headers: {
          "accept":
            "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `DEXSCREENER_HTTP_${response.status}`
    );
  }

  return response.json();
}

function analyseDex(
  data
) {
  const pairs =
    Array.isArray(
      data?.pairs
    )
      ? data.pairs
      : [];

  if (
    pairs.length === 0
  ) {
    return {
      pairFound:
        false
    };
  }

  const sorted =
    [...pairs].sort(
      (a, b) =>
        Number(
          b?.liquidity?.usd ||
            0
        ) -
        Number(
          a?.liquidity?.usd ||
            0
        )
    );

  const pair =
    sorted[0];

  const liquidity =
    Number(
      pair?.liquidity?.usd ||
        0
    );

  const volume =
    Number(
      pair?.volume?.h24 ||
        0
    );

  const buys =
    Number(
      pair?.txns?.h24?.buys ||
        0
    );

  const sells =
    Number(
      pair?.txns?.h24?.sells ||
        0
    );

  return {
    pairFound:
      true,

    name:
      pair?.baseToken?.name ||
      null,

    symbol:
      pair?.baseToken?.symbol ||
      null,

    priceUsd:
      pair?.priceUsd ||
      null,

    marketCap:
      pair?.marketCap ||
      null,

    fdv:
      pair?.fdv ||
      null,

    liquidityUsd:
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    buySellRatio:
      sells > 0
        ? Number(
            (
              buys /
              sells
            ).toFixed(2)
          )
        : null,

    dex:
      pair?.dexId ||
      null,

    pairAddress:
      pair?.pairAddress ||
      null,

    url:
      pair?.url ||
      null
  };
}

function marketScore(
  market
) {
  let score = 0;

  if (
    market?.pairFound
  ) {
    score += 10;
  }

  const liquidity =
    Number(
      market?.liquidityUsd ||
        0
    );

  const volume =
    Number(
      market?.volume24h ||
        0
    );

  const buys =
    Number(
      market?.buys24h ||
        0
    );

  const sells =
    Number(
      market?.sells24h ||
        0
    );

  if (
    liquidity >= 1000
  ) {
    score += 5;
  }

  if (
    liquidity >= 5000
  ) {
    score += 5;
  }

  if (
    volume >= 1000
  ) {
    score += 5;
  }

  if (
    volume >= 10000
  ) {
    score += 5;
  }

  if (
    buys > sells &&
    buys > 0
  ) {
    score += 5;
  }

  return Math.min(
    score,
    30
  );
}

async function performScan() {
  const diagnostics = [];

  let latest;

  try {
    latest =
      await latestBlock();
  } catch (error) {
    return {
      status:
        error.message ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      diagnostics: [{
        type:
          "rpc",

        method:
          "eth_blockNumber",

        error:
          error.message
      }]
    };
  }

  const fromBlock =
    Math.max(
      0,
      latest -
        MAX_BLOCKS +
        1
    );

  const toBlock =
    latest;

  /*
   * RPC #1:
   * Both TokenCreated entry contracts.
   */
  let tokenLogs = [];

  try {
    tokenLogs =
      await discoverTokens(
        fromBlock,
        toBlock
      );
  } catch (error) {
    diagnostics.push({
      type:
        "token_discovery",

      error:
        error.message
    });

    return {
      status:
        error.message ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      latestBlock:
        latest,

      startBlock:
        fromBlock,

      endBlock:
        toBlock,

      diagnostics
    };
  }

  const tokens =
    unique(
      tokenLogs
        .map(
          extractTokenCreatedAddress
        )
    );

  /*
   * RPC #2:
   * All four TokenLaunched emitters.
   */
  let poolLogs = [];

  try {
    poolLogs =
      await discoverPools(
        fromBlock,
        toBlock
      );
  } catch (error) {
    diagnostics.push({
      type:
        "pool_discovery",

      error:
        error.message
    });
  }

  const pools =
    poolLogs
      .map(
        parseTokenLaunched
      )
      .filter(Boolean);

  /*
   * Index pools by token.
   */
  const poolsByToken =
    new Map();

  for (
    const pool of pools
  ) {
    const key =
      pool.token
        .toLowerCase();

    if (
      !poolsByToken.has(key)
    ) {
      poolsByToken.set(
        key,
        pool
      );
    }
  }

  const discovered =
    tokens.map(
      token => ({
        token,
        pool:
          poolsByToken.get(
            token.toLowerCase()
          ) ||
          null
      })
    );

  /*
   * Prioritise tokens that have
   * a real TokenLaunched/v4 pool.
   */
  discovered.sort(
    (a, b) =>
      Number(
        !!b.pool
      ) -
      Number(
        !!a.pool
      )
  );

  const candidates = [];

  /*
   * Only enrich the first two.
   *
   * This is deliberately capped.
   */
  const enrichment =
    discovered
      .filter(
        item =>
          item.pool
      )
      .slice(
        0,
        MAX_MARKET_LOOKUPS
      );

  for (
    const item of enrichment
  ) {
    const token =
      item.token;

    const pool =
      item.pool;

    let poolsTrade =
      null;

    let poolsTradeError =
      null;

    let dex =
      null;

    let dexError =
      null;

    /*
     * Secondary source #1:
     * pools.trade frontend data.
     */
    try {
      poolsTrade =
        await poolsTradeLookup(
          token
        );
    } catch (error) {
      poolsTradeError =
        error.message;

      diagnostics.push({
        type:
          "pools_trade",

        token,

        error:
          error.message
      });
    }

    /*
     * Secondary source #2:
     * DEX Screener.
     */
    try {
      const dexData =
        await dexLookup(
          token
        );

      dex =
        analyseDex(
          dexData
        );
    } catch (error) {
      dexError =
        error.message;

      diagnostics.push({
        type:
          "dex",

        token,

        error:
          error.message
      });
    }

    const fdv =
      findNumber(
        poolsTrade,
        [
          "fdv",
          "FDV",
          "fullyDilutedValuation"
        ]
      );

    const marketCap =
      findNumber(
        poolsTrade,
        [
          "marketCap",
          "market_cap"
        ]
      );

    const volume24h =
      findNumber(
        poolsTrade,
        [
          "volume24h",
          "volume24H",
          "volume"
        ]
      );

    const holders =
      findNumber(
        poolsTrade,
        [
          "holders",
          "holderCount"
        ]
      );

    const price =
      findNumber(
        poolsTrade,
        [
          "price",
          "priceUsd",
          "priceUSD"
        ]
      );

    const symbol =
      findString(
        poolsTrade,
        [
          "symbol",
          "ticker"
        ]
      );

    const name =
      findString(
        poolsTrade,
        [
          "name",
          "tokenName"
        ]
      );

    const poolPoints =
      basePoolScore(
        pool
      );

    const marketPoints =
      marketScore(
        dex
      );

    const totalScore =
      Math.min(
        100,
        poolPoints +
          marketPoints
      );

    candidates.push({
      token,

      name:
        name ||
        dex?.name ||
        null,

      symbol:
        symbol ||
        dex?.symbol ||
        null,

      score:
        totalScore,

      scoreBreakdown: {
        v4Pool:
          poolPoints,

        marketActivity:
          marketPoints
      },

      launch: {
        poolId:
          pool.poolId,

        launchpad:
          pool.launchpad,

        poolPath:
          poolType(
            pool.tickSpacing
          ),

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

        blockNumber:
          pool.blockNumber,

        transactionHash:
          pool.transactionHash
      },

      market: {
        price:
          price,

        marketCap:
          marketCap,

        fdv:
          fdv,

        volume24h:
          volume24h,

        holders:
          holders,

        dex:
          dex,

        poolsTradeAvailable:
          poolsTrade !== null,

        poolsTradeError:
          poolsTradeError,

        dexError:
          dexError
      },

      /*
       * Explicitly prevent unsupported
       * assumptions from becoming facts.
       */
      validation: {
        tokenAddress:
          "VERIFIED_FROM_TOKEN_CREATED",

        v4Pool:
          "VERIFIED_FROM_TOKEN_LAUNCHED",

        liquidity:
          dex?.liquidityUsd !==
            undefined
            ? "DEXSCREENER"
            : "UNVERIFIED",

        volume:
          volume24h !== null ||
          dex?.volume24h !==
            undefined
            ? "MARKET_DATA"
            : "UNVERIFIED",

        holders:
          holders !== null
            ? "POOLS_TRADE"
            : "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        walletActivity:
          "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED"
      }
    });
  }

  /*
   * Include discovered tokens that
   * have not yet been enriched.
   */
  for (
    const item of discovered
  ) {
    if (
      !item.pool
    ) {
      candidates.push({
        token:
          item.token,

        score:
          0,

        poolFound:
          false,

        validation: {
          tokenAddress:
            "VERIFIED_FROM_TOKEN_CREATED",

          v4Pool:
            "NOT_FOUND_IN_SCAN_WINDOW",

          liquidity:
            "UNVERIFIED",

          volume:
            "UNVERIFIED",

          holders:
            "UNVERIFIED",

          smartMoney:
            "UNVERIFIED",

          walletActivity:
            "UNVERIFIED",

          accumulationDistribution:
            "UNVERIFIED"
        }
      });
    }
  }

  candidates.sort(
    (a, b) =>
      Number(
        b.score || 0
      ) -
      Number(
        a.score || 0
      )
  );

  return {
    status:
      "OK",

    latestBlock:
      latest,

    startBlock:
      fromBlock,

    endBlock:
      toBlock,

    blocksScanned:
      toBlock -
      fromBlock +
      1,

    rawTokenLogs:
      tokenLogs.length,

    rawPoolLogs:
      poolLogs.length,

    tokensDiscovered:
      tokens.length,

    poolsDiscovered:
      pools.length,

    tokensWithV4Pools:
      discovered.filter(
        x => !!x.pool
      ).length,

    tokensWithoutV4Pool:
      discovered.filter(
        x => !x.pool
      ).length,

    tokens,

    candidates,

    rpcRequests:
      3,

    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs_tokenCreated:
        1,

      eth_getLogs_tokenLaunched:
        1
    },

    maximumMarketLookups:
      MAX_MARKET_LOOKUPS,

    diagnostics
  };
}

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(
        request.url
      );

    const path =
      url.pathname;

    /*
     * HEALTH
     */
    if (
      path === "/health"
    ) {
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
        ],

        chain: {
          name:
            "Robinhood Chain",

          chainId:
            CHAIN_ID,

          rpc:
            RPC_URL
        },

        discovery:
          "TOKEN_CREATED_PLUS_TOKEN_LAUNCHED",

        launchContracts:
          ENTRY_CONTRACTS,

        v4: {
          poolManager:
            V4_POOL_MANAGER,

          model:
            "UNISWAP_V4_SINGLETON"
        },

        launchpads:
          LAUNCHPAD_CONTRACTS,

        marketData: {
          primary:
            "UNISWAP_V4_POOL_DISCOVERY",

          secondary:
            "POOLS_TRADE_API",

          fallback:
            "DEX_SCREENER"
        },

        kvRequired:
          false,

        kvConfigured:
          false,

        paidApiKeyRequired:
          false,

        architecture:
          "ULTRA_LOW_RPC_NO_RETRY",

        rpcBudget:
          "3 BASE RPC REQUESTS",

        maxMarketLookups:
          MAX_MARKET_LOOKUPS,

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * SCAN
     */
    if (
      path === "/scan"
    ) {
      const scan =
        await performScan();

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          scan.status ===
          "OK",

        scan: {
          ...scan,

          chainId:
            CHAIN_ID,

          kvRequired:
            false,

          dataIntegrity: {
            noFabricatedMetrics:
              true,

            holderConcentration:
              "ONLY_IF_VERIFIED",

            smartMoney:
              "UNVERIFIED",

            walletActivity:
              "UNVERIFIED",

            accumulationDistribution:
              "UNVERIFIED"
          },

          timestamp:
            new Date().toISOString()
        }
      });
    }

    /*
     * TELEGRAM TEST
     */
    if (
      path ===
      "/test-telegram"
    ) {
      if (
        !env.TELEGRAM_BOT_TOKEN ||
        !env.TELEGRAM_CHAT_ID
      ) {
        return json({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          error:
            "TELEGRAM_SECRETS_NOT_CONFIGURED"
        });
      }

      const response =
        await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
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
                  `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
              })
          }
        );

      const data =
        await response.json();

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          response.ok,

        response:
          data
      });
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
  },

  /*
   * Optional Cron.
   *
   * No KV is required.
   *
   * Cron simply performs the same
   * low-RPC scan.
   */
  async scheduled(
    event,
    env,
    ctx
  ) {
    ctx.waitUntil(
      performScan()
        .catch(
          () => {}
        )
    );
  }
};
