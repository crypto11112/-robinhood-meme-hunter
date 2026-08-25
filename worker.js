/**
 * Robinhood Chain Meme Hunter
 * V73
 *
 * Incremental upgrade from V72.
 *
 * PRESERVES V72:
 * - Robinhood RPC + Alchemy fallback
 * - Uniswap V4 discovery
 * - Persistent KV block tracking
 * - Failed-range protection
 * - Persistent token watch list
 * - Candidate rotation
 * - ERC20 verification
 * - DexScreener intelligence
 * - Blockscout holder intelligence
 * - Pool-specific V4 activity
 * - Whale concentration
 * - Smart-money candidate scoring
 * - Telegram alerts
 * - Duplicate/cooldown protection
 * - /health
 * - /rpc-test
 * - /scan
 * - /state
 * - /diagnostics
 * - /run-all
 * - /test-telegram
 *
 * V73:
 * - Fixes Cloudflare subrequest exhaustion
 * - Adaptive catch-up scanning
 * - Large ranges with automatic splitting
 * - Much faster historical catch-up
 * - Request/subrequest budgeting
 * - WETH + infrastructure quote filtering
 * - Market/holder lookups protected by budget
 * - Persistent market/holder snapshots
 * - Holder-growth detection
 * - Volume acceleration
 * - Liquidity growth
 * - Transaction acceleration
 * - Buy-pressure momentum
 * - Momentum score
 * - Opportunity score incorporates momentum
 * - /run-all avoids performing duplicate expensive tests
 */

const VERSION = "V73";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const DEXSCREENER_BASE =
  "https://api.dexscreener.com";

const BLOCKSCOUT =
  "https://robinhoodchain.blockscout.com";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

/*
 * Known infrastructure / quote assets.
 *
 * V73 adds the WETH discovered during the V72 test.
 */
const KNOWN_QUOTES = new Set([
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168",
  "0x0bd7d308f8e1639fab988df18a8011f41eacad73"
]);

const KNOWN_QUOTE_SYMBOLS = new Set([
  "WETH",
  "ETH",
  "USDC",
  "USDT",
  "DAI",
  "USD"
]);

const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/*
 * IMPORTANT:
 * Preserve V69/V70/V71/V72 state.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

/*
 * Live scans stay small.
 * Catch-up scans can process far more blocks.
 */
const LIVE_SCAN_BLOCKS = 20;

const CATCHUP_TARGET_BLOCKS = 2000;

const INITIAL_LOG_RANGE = 250;

const MIN_LOG_RANGE = 10;

const BACKLOG_LIVE_THRESHOLD = 100;

/*
 * Cloudflare protection.
 *
 * We deliberately stop before exhausting
 * the Worker invocation's request budget.
 */
const MAX_EXTERNAL_REQUESTS = 42;

const MAX_TOKEN_CHECKS = 6;
const MAX_MARKET_LOOKUPS = 3;
const MAX_HOLDER_LOOKUPS = 2;

const WATCH_MAX_AGE =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

const ALERT_COOLDOWN =
  6 * 60 * 60 * 1000;

const MIN_ALERT_SCORE = 60;
const MAX_ALERT_RISK = 59;
const MIN_ALERT_LIQUIDITY = 1000;

/* =========================================================
   V73 MOMENTUM / HISTORY
   ========================================================= */

const MAX_SNAPSHOTS_PER_TOKEN = 24;

const SNAPSHOT_MAX_AGE =
  24 * 60 * 60 * 1000;

const MIN_SNAPSHOT_INTERVAL =
  2 * 60 * 1000;

const MOMENTUM_STRONG = 70;
const MOMENTUM_GOOD = 50;

const MEMORY_ALERTS = new Map();


/* =========================================================
   REQUEST BUDGET
   ========================================================= */

function createBudget() {
  return {
    used: 0,
    limit: MAX_EXTERNAL_REQUESTS,
    skipped: []
  };
}

function budgetAvailable(
  budget,
  amount = 1
) {
  return (
    budget.used + amount <=
    budget.limit
  );
}

function consumeBudget(
  budget,
  type,
  amount = 1
) {
  if (
    !budgetAvailable(
      budget,
      amount
    )
  ) {
    budget.skipped.push(type);
    return false;
  }

  budget.used += amount;
  return true;
}


/* =========================================================
   HELPERS
   ========================================================= */

function now() {
  return new Date().toISOString();
}

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

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function normalize(value) {
  return String(value || "")
    .toLowerCase();
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(value || "")
  );
}

function topicAddress(topic) {
  if (
    !/^0x[a-fA-F0-9]{64}$/.test(
      String(topic || "")
    )
  ) {
    return null;
  }

  return "0x" + topic.slice(-40);
}

function knownQuote(address) {
  return KNOWN_QUOTES.has(
    normalize(address)
  );
}

function knownQuoteMetadata(
  address,
  symbol
) {
  if (knownQuote(address)) {
    return true;
  }

  return KNOWN_QUOTE_SYMBOLS.has(
    String(symbol || "")
      .toUpperCase()
  );
}

function money(value) {
  const n = safeNumber(value);

  if (!n) {
    return "UNVERIFIED";
  }

  if (n >= 1e9) {
    return "$" +
      (n / 1e9).toFixed(2) +
      "B";
  }

  if (n >= 1e6) {
    return "$" +
      (n / 1e6).toFixed(2) +
      "M";
  }

  if (n >= 1e3) {
    return "$" +
      (n / 1e3).toFixed(1) +
      "K";
  }

  return "$" + n.toFixed(2);
}

function errorString(error) {
  return String(
    error?.message ||
    error ||
    "UNKNOWN_ERROR"
  );
}

function percentChange(
  previous,
  current
) {
  const a = safeNumber(previous);
  const b = safeNumber(current);

  if (a <= 0) {
    return null;
  }

  return (
    (b - a) /
    a *
    100
  );
}


/* =========================================================
   KV
   ========================================================= */

function getKV(env) {
  if (
    env.MEME_HUNTER_STATE &&
    typeof env.MEME_HUNTER_STATE.get === "function" &&
    typeof env.MEME_HUNTER_STATE.put === "function"
  ) {
    return {
      kv: env.MEME_HUNTER_STATE,
      binding: "MEME_HUNTER_STATE"
    };
  }

  if (
    env.KV_BINDING &&
    typeof env.KV_BINDING.get === "function" &&
    typeof env.KV_BINDING.put === "function"
  ) {
    return {
      kv: env.KV_BINDING,
      binding: "KV_BINDING"
    };
  }

  return {
    kv: null,
    binding: null
  };
}

function newState() {
  return {
    version: VERSION,
    lastScannedBlock: null,
    watchedTokens: [],
    alerts: {},
    snapshots: {},
    createdAt: now(),
    updatedAt: now()
  };
}

async function readState(env) {
  const {
    kv,
    binding
  } = getKV(env);

  if (!kv) {
    return {
      persistent: false,
      binding: null,
      state: newState(),
      error: null
    };
  }

  try {
    const raw =
      await kv.get(STATE_KEY);

    if (!raw) {
      return {
        persistent: true,
        binding,
        state: newState(),
        error: null
      };
    }

    const parsed =
      JSON.parse(raw);

    return {
      persistent: true,
      binding,

      state: {
        ...newState(),
        ...parsed,

        watchedTokens:
          Array.isArray(
            parsed?.watchedTokens
          )
            ? parsed.watchedTokens
            : [],

        alerts:
          parsed?.alerts &&
          typeof parsed.alerts === "object"
            ? parsed.alerts
            : {},

        snapshots:
          parsed?.snapshots &&
          typeof parsed.snapshots === "object"
            ? parsed.snapshots
            : {}
      },

      error: null
    };

  } catch (error) {
    return {
      persistent: true,
      binding,
      state: newState(),
      error: errorString(error)
    };
  }
}

async function writeState(
  env,
  state
) {
  const {
    kv,
    binding
  } = getKV(env);

  if (!kv) {
    return {
      saved: false,
      binding: null,
      error: "KV_NOT_CONFIGURED"
    };
  }

  try {
    state.version = VERSION;
    state.updatedAt = now();

    await kv.put(
      STATE_KEY,
      JSON.stringify(state)
    );

    return {
      saved: true,
      binding,
      error: null
    };

  } catch (error) {
    return {
      saved: false,
      binding,
      error: errorString(error)
    };
  }
}

function pruneSnapshots(state) {
  const current = Date.now();

  state.snapshots =
    state.snapshots &&
    typeof state.snapshots === "object"
      ? state.snapshots
      : {};

  for (
    const [
      address,
      snapshots
    ] of Object.entries(
      state.snapshots
    )
  ) {
    if (!Array.isArray(snapshots)) {
      delete state.snapshots[address];
      continue;
    }

    const valid =
      snapshots
        .filter(snapshot => {
          const timestamp =
            safeNumber(
              snapshot?.timestamp
            );

          return (
            timestamp &&
            current - timestamp <=
              SNAPSHOT_MAX_AGE
          );
        })
        .slice(
          -MAX_SNAPSHOTS_PER_TOKEN
        );

    if (valid.length) {
      state.snapshots[address] =
        valid;
    } else {
      delete state.snapshots[address];
    }
  }
}

function pruneState(state) {
  const current = Date.now();

  state.watchedTokens =
    (state.watchedTokens || [])
      .filter(token => {
        const firstSeen =
          safeNumber(
            token.firstSeenAt
          );

        if (!firstSeen) {
          return false;
        }

        return (
          current -
          firstSeen <
          WATCH_MAX_AGE
        );
      })
      .slice(
        0,
        MAX_WATCHED_TOKENS
      );

  state.alerts =
    state.alerts &&
    typeof state.alerts === "object"
      ? state.alerts
      : {};

  for (
    const [
      address,
      timestamp
    ] of Object.entries(
      state.alerts
    )
  ) {
    if (
      current -
      safeNumber(timestamp) >
      ALERT_COOLDOWN
    ) {
      delete state.alerts[address];
    }
  }

  pruneSnapshots(state);
}

function addWatch(
  state,
  address,
  pool
) {
  const key =
    normalize(address);

  if (
    !isAddress(address) ||
    key === ZERO
  ) {
    return;
  }

  let token =
    state.watchedTokens.find(
      item =>
        normalize(
          item.address
        ) === key
    );

  if (!token) {
    token = {
      address,
      firstSeenAt:
        Date.now(),
      lastCheckedAt:
        null,
      checks: 0,
      pools: []
    };

    state.watchedTokens.push(
      token
    );
  }

  token.pools =
    Array.isArray(token.pools)
      ? token.pools
      : [];

  if (
    pool &&
    !token.pools.some(
      item =>
        normalize(item.poolId) ===
        normalize(pool.poolId)
    )
  ) {
    token.pools.push(pool);
  }
}


/* =========================================================
   V73 SNAPSHOTS
   ========================================================= */

function createSnapshot(
  candidate
) {
  return {
    timestamp:
      Date.now(),

    holderCount:
      candidate.holders
        ?.verified
        ? candidate.holders
            .holderCount
        : null,

    transferCount:
      candidate.holders
        ?.verified
        ? candidate.holders
            .transferCount
        : null,

    liquidityUsd:
      candidate.market
        ?.verified
        ? candidate.market
            .liquidityUsd
        : null,

    marketCap:
      candidate.market
        ?.verified
        ? candidate.market
            .marketCap
        : null,

    volumeM5:
      candidate.market
        ?.verified
        ? candidate.market
            .volume?.m5
        : null,

    volumeH1:
      candidate.market
        ?.verified
        ? candidate.market
            .volume?.h1
        : null,

    volumeH24:
      candidate.market
        ?.verified
        ? candidate.market
            .volume?.h24
        : null,

    buysH1:
      candidate.market
        ?.verified
        ? candidate.market
            .transactions
            ?.h1?.buys
        : null,

    sellsH1:
      candidate.market
        ?.verified
        ? candidate.market
            .transactions
            ?.h1?.sells
        : null,

    buyPressure1h:
      candidate.market
        ?.verified
        ? candidate.market
            .buyPressure1h
        : null
  };
}

function saveSnapshot(
  state,
  candidate
) {
  const key =
    normalize(
      candidate.address
    );

  state.snapshots[key] =
    Array.isArray(
      state.snapshots[key]
    )
      ? state.snapshots[key]
      : [];

  const snapshots =
    state.snapshots[key];

  const previous =
    snapshots.length
      ? snapshots[
          snapshots.length - 1
        ]
      : null;

  if (
    previous &&
    Date.now() -
      safeNumber(
        previous.timestamp
      ) <
      MIN_SNAPSHOT_INTERVAL
  ) {
    return false;
  }

  snapshots.push(
    createSnapshot(
      candidate
    )
  );

  state.snapshots[key] =
    snapshots.slice(
      -MAX_SNAPSHOTS_PER_TOKEN
    );

  return true;
}

function getPreviousSnapshot(
  state,
  address
) {
  const snapshots =
    state.snapshots[
      normalize(address)
    ];

  if (
    !Array.isArray(snapshots) ||
    !snapshots.length
  ) {
    return null;
  }

  return snapshots[
    snapshots.length - 1
  ];
}


/* =========================================================
   RPC
   ========================================================= */

async function rpcCall(
  url,
  method,
  params,
  budget
) {
  if (
    budget &&
    !consumeBudget(
      budget,
      `RPC:${method}`
    )
  ) {
    throw new Error(
      "REQUEST_BUDGET_EXHAUSTED"
    );
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      4000
    );

  try {
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
              jsonrpc: "2.0",
              id: Date.now(),
              method,
              params
            }),

          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `HTTP_${response.status}`
      );
    }

    const body =
      await response.json();

    if (body.error) {
      throw new Error(
        body.error.message ||
        "RPC_ERROR"
      );
    }

    return body.result;

  } finally {
    clearTimeout(timer);
  }
}

async function rpc(
  env,
  method,
  params,
  budget
) {
  let publicError = null;

  try {
    return {
      result:
        await rpcCall(
          PUBLIC_RPC,
          method,
          params,
          budget
        ),

      provider:
        "ROBINHOOD_PUBLIC_RPC",

      error: null
    };

  } catch (error) {
    publicError =
      errorString(error);

    if (
      publicError ===
      "REQUEST_BUDGET_EXHAUSTED"
    ) {
      return {
        result: null,
        provider: null,
        error: publicError
      };
    }
  }

  if (!env.ALCHEMY_API_KEY) {
    return {
      result: null,
      provider: null,
      error:
        "PUBLIC_RPC_FAILED: " +
        publicError
    };
  }

  try {
    return {
      result:
        await rpcCall(
          ALCHEMY_BASE +
          env.ALCHEMY_API_KEY,
          method,
          params,
          budget
        ),

      provider:
        "ALCHEMY",

      error: null
    };

  } catch (error) {
    return {
      result: null,
      provider: null,

      error:
        "PUBLIC_RPC_FAILED: " +
        publicError +
        " | ALCHEMY_FAILED: " +
        errorString(error)
    };
  }
}

async function latestBlock(
  env,
  budget
) {
  const result =
    await rpc(
      env,
      "eth_blockNumber",
      [],
      budget
    );

  if (!result.result) {
    throw new Error(
      result.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return {
    block:
      BigInt(
        result.result
      ),

    provider:
      result.provider
  };
}

async function getLogs(
  env,
  from,
  to,
  budget
) {
  return rpc(
    env,
    "eth_getLogs",
    [{
      fromBlock:
        "0x" +
        from.toString(16),

      toBlock:
        "0x" +
        to.toString(16),

      address:
        POOL_MANAGER
    }],
    budget
  );
}


/* =========================================================
   V73 ADAPTIVE LOG SCANNER
   ========================================================= */

async function scanLogRange(
  env,
  from,
  to,
  budget,
  output,
  depth = 0
) {
  if (
    !budgetAvailable(
      budget,
      2
    )
  ) {
    return {
      success: false,
      budgetExhausted: true,
      processedThrough: null
    };
  }

  const result =
    await getLogs(
      env,
      from,
      to,
      budget
    );

  if (
    Array.isArray(
      result.result
    )
  ) {
    output.logs.push(
      ...result.result
    );

    output.ranges.push({
      fromBlock:
        Number(from),

      toBlock:
        Number(to),

      logs:
        result.result.length,

      provider:
        result.provider,

      splitDepth:
        depth
    });

    return {
      success: true,
      processedThrough:
        to
    };
  }

  const size =
    to - from + 1n;

  /*
   * If the provider rejects a large
   * range, recursively split it.
   */
  if (
    size >
    BigInt(MIN_LOG_RANGE)
  ) {
    const middle =
      from +
      (to - from) /
      2n;

    const left =
      await scanLogRange(
        env,
        from,
        middle,
        budget,
        output,
        depth + 1
      );

    if (!left.success) {
      return left;
    }

    const right =
      await scanLogRange(
        env,
        middle + 1n,
        to,
        budget,
        output,
        depth + 1
      );

    if (!right.success) {
      return {
        ...right,
        processedThrough:
          left.processedThrough
      };
    }

    return {
      success: true,
      processedThrough:
        right.processedThrough
    };
  }

  return {
    success: false,

    processedThrough:
      null,

    error:
      result.error ||
      "GET_LOGS_FAILED",

    failedRange: {
      fromBlock:
        Number(from),

      toBlock:
        Number(to),

      error:
        result.error ||
        "GET_LOGS_FAILED"
    }
  };
}


/* =========================================================
   ERC20
   ========================================================= */

async function ethCall(
  env,
  token,
  data,
  budget
) {
  const result =
    await rpc(
      env,
      "eth_call",
      [{
        to: token,
        data
      }, "latest"],
      budget
    );

  if (!result.result) {
    throw new Error(
      result.error ||
      "ETH_CALL_FAILED"
    );
  }

  return result.result;
}

function decodeUint(hex) {
  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

function decodeBytes32String(
  hex
) {
  try {
    const raw =
      String(hex || "")
        .replace(/^0x/, "");

    if (raw.length !== 64) {
      return null;
    }

    const matches =
      raw.match(/.{2}/g) || [];

    const bytes =
      new Uint8Array(
        matches.map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    const decoded =
      new TextDecoder()
        .decode(bytes)
        .replace(/\0/g, "")
        .trim();

    return decoded || null;

  } catch {
    return null;
  }
}

function decodeString(hex) {
  try {
    const raw =
      String(hex || "")
        .replace(/^0x/, "");

    if (!raw) {
      return null;
    }

    if (raw.length === 64) {
      return decodeBytes32String(
        "0x" + raw
      );
    }

    if (raw.length < 128) {
      return null;
    }

    const offset =
      Number(
        BigInt(
          "0x" +
          raw.slice(0, 64)
        )
      ) * 2;

    if (
      !Number.isFinite(offset) ||
      offset < 0 ||
      offset + 64 >
        raw.length
    ) {
      return null;
    }

    const length =
      Number(
        BigInt(
          "0x" +
          raw.slice(
            offset,
            offset + 64
          )
        )
      );

    if (
      !Number.isFinite(length) ||
      length <= 0 ||
      length > 1024
    ) {
      return null;
    }

    const data =
      raw.slice(
        offset + 64,
        offset + 64 +
        length * 2
      );

    const matches =
      data.match(/.{2}/g) || [];

    const bytes =
      new Uint8Array(
        matches.map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    const decoded =
      new TextDecoder()
        .decode(bytes)
        .replace(/\0/g, "")
        .trim();

    return decoded || null;

  } catch {
    return null;
  }
}

async function verifyERC20(
  env,
  address,
  budget
) {
  const code =
    await rpc(
      env,
      "eth_getCode",
      [address, "latest"],
      budget
    );

  if (
    !code.result ||
    code.result === "0x" ||
    code.result === "0x0"
  ) {
    return {
      validERC20: false,
      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  let name = null;
  let symbol = null;
  let decimals = null;
  let totalSupply = null;

  try {
    name =
      decodeString(
        await ethCall(
          env,
          address,
          "0x06fdde03",
          budget
        )
      );
  } catch {}

  try {
    symbol =
      decodeString(
        await ethCall(
          env,
          address,
          "0x95d89b41",
          budget
        )
      );
  } catch {}

  try {
    const value =
      decodeUint(
        await ethCall(
          env,
          address,
          "0x313ce567",
          budget
        )
      );

    if (value !== null) {
      decimals =
        Number(value);
    }
  } catch {}

  try {
    totalSupply =
      decodeUint(
        await ethCall(
          env,
          address,
          "0x18160ddd",
          budget
        )
      );
  } catch {}

  const score =
    (name ? 1 : 0) +
    (symbol ? 1 : 0) +
    (
      Number.isFinite(decimals)
        ? 1
        : 0
    ) +
    (
      totalSupply !== null &&
      totalSupply > 0n
        ? 1
        : 0
    );

  if (score < 3) {
    return {
      validERC20: false,
      reason:
        "ERC20_METHODS_NOT_VERIFIED",
      name,
      symbol,
      decimals
    };
  }

  return {
    validERC20: true,
    reason: "VERIFIED",
    address,
    name,
    symbol,
    decimals,

    totalSupply:
      totalSupply !== null
        ? totalSupply.toString()
        : null
  };
}


/* =========================================================
   V4 DISCOVERY
   ========================================================= */

function decodeInitialize(log) {
  if (
    normalize(
      log?.topics?.[0]
    ) !==
    INITIALIZE_TOPIC
  ) {
    return null;
  }

  if (
    !Array.isArray(log.topics) ||
    log.topics.length < 4
  ) {
    return null;
  }

  const currency0 =
    topicAddress(
      log.topics[2]
    );

  const currency1 =
    topicAddress(
      log.topics[3]
    );

  if (
    !currency0 ||
    !currency1
  ) {
    return null;
  }

  return {
    poolId:
      log.topics[1],

    currency0,
    currency1,

    blockNumber:
      log.blockNumber,

    transactionHash:
      log.transactionHash
  };
}

function activityForToken(
  watched,
  logs
) {
  const poolIds =
    new Set(
      (watched.pools || [])
        .map(
          pool =>
            normalize(
              pool.poolId
            )
        )
        .filter(Boolean)
    );

  let swaps = 0;
  let liquidityEvents = 0;

  for (const log of logs) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    if (
      !poolIds.size ||
      !poolIds.has(poolId)
    ) {
      continue;
    }

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swaps++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityEvents++;
    }
  }

  return {
    swaps,
    liquidityEvents,
    poolSpecific:
      poolIds.size > 0
  };
}


/* =========================================================
   DEXSCREENER
   ========================================================= */

async function marketData(
  token,
  budget
) {
  if (
    !consumeBudget(
      budget,
      "DEXSCREENER"
    )
  ) {
    return {
      verified: false,
      status:
        "REQUEST_BUDGET_SKIPPED"
    };
  }

  try {
    const response =
      await fetch(
        `${DEXSCREENER_BASE}/token-pairs/v1/robinhood/${token}`,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      return {
        verified: false,
        status:
          `HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(data)
        ? data
        : [];

    if (!pairs.length) {
      return {
        verified: false,
        status:
          "NO_MARKET_FOUND"
      };
    }

    pairs.sort(
      (a, b) =>
        safeNumber(
          b?.liquidity?.usd
        ) -
        safeNumber(
          a?.liquidity?.usd
        )
    );

    const p =
      pairs[0];

    const buys1h =
      safeNumber(
        p?.txns?.h1?.buys
      );

    const sells1h =
      safeNumber(
        p?.txns?.h1?.sells
      );

    const total =
      buys1h +
      sells1h;

    return {
      verified: true,
      status: "VERIFIED",

      pairAddress:
        p?.pairAddress ||
        null,

      url:
        p?.url ||
        null,

      priceUsd:
        p?.priceUsd ||
        null,

      liquidityUsd:
        safeNumber(
          p?.liquidity?.usd
        ),

      marketCap:
        safeNumber(
          p?.marketCap
        ) || null,

      fdv:
        safeNumber(
          p?.fdv
        ) || null,

      volume: {
        m5:
          safeNumber(
            p?.volume?.m5
          ),

        h1:
          safeNumber(
            p?.volume?.h1
          ),

        h24:
          safeNumber(
            p?.volume?.h24
          )
      },

      transactions: {
        h1: {
          buys:
            buys1h,

          sells:
            sells1h
        }
      },

      buyPressure1h:
        total > 0
          ? buys1h /
            total *
            100
          : null,

      pairCreatedAt:
        safeNumber(
          p?.pairCreatedAt
        ) || null
    };

  } catch (error) {
    return {
      verified: false,
      status:
        "DEXSCREENER_ERROR",
      error:
        errorString(error)
    };
  }
}


/* =========================================================
   BLOCKSCOUT
   ========================================================= */

async function blockscout(
  path,
  budget
) {
  if (
    !consumeBudget(
      budget,
      "BLOCKSCOUT"
    )
  ) {
    return null;
  }

  try {
    const response =
      await fetch(
        BLOCKSCOUT + path,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      return null;
    }

    return await response.json();

  } catch {
    return null;
  }
}

function holderPercent(
  value,
  supply
) {
  try {
    const held =
      BigInt(
        String(value)
      );

    const total =
      BigInt(
        String(supply)
      );

    if (total <= 0n) {
      return null;
    }

    return Number(
      held *
      1000000n /
      total
    ) / 10000;

  } catch {
    return null;
  }
}

function extractHolderAddress(
  item
) {
  if (
    typeof item?.address ===
    "string"
  ) {
    return item.address;
  }

  if (
    typeof item?.address?.hash ===
    "string"
  ) {
    return item.address.hash;
  }

  if (
    typeof item?.address_hash ===
    "string"
  ) {
    return item.address_hash;
  }

  if (
    typeof item?.address_hash?.hash ===
    "string"
  ) {
    return item.address_hash.hash;
  }

  return null;
}

async function holderIntelligence(
  token,
  totalSupply,
  budget
) {
  /*
   * Sequential rather than Promise.all so
   * budget exhaustion remains predictable.
   */
  const counters =
    await blockscout(
      `/api/v2/tokens/${token}/counters`,
      budget
    );

  if (!counters) {
    return unverifiedHolders();
  }

  const holders =
    await blockscout(
      `/api/v2/tokens/${token}/holders`,
      budget
    );

  const items =
    Array.isArray(
      holders?.items
    )
      ? holders.items.slice(
          0,
          10
        )
      : [];

  const topHolders =
    items.map(item => {
      const value =
        String(
          item?.value ||
          item?.token?.value ||
          "0"
        );

      return {
        address:
          extractHolderAddress(
            item
          ),

        value,

        percentage:
          holderPercent(
            value,
            totalSupply
          )
      };
    });

  const percentages =
    topHolders
      .map(
        item =>
          item.percentage
      )
      .filter(
        value =>
          Number.isFinite(value)
      );

  const top1 =
    percentages[0] ??
    null;

  const top5 =
    percentages
      .slice(0, 5)
      .reduce(
        (a, b) =>
          a + b,
        0
      );

  const top10 =
    percentages
      .slice(0, 10)
      .reduce(
        (a, b) =>
          a + b,
        0
      );

  const whales =
    topHolders.filter(
      item =>
        item.percentage !== null &&
        item.percentage >= 1
    );

  let concentrationRisk =
    "LOW";

  if (
    (
      top1 !== null &&
      top1 >= 20
    ) ||
    top10 >= 80
  ) {
    concentrationRisk =
      "HIGH";

  } else if (
    (
      top1 !== null &&
      top1 >= 10
    ) ||
    top10 >= 60
  ) {
    concentrationRisk =
      "MEDIUM";
  }

  let smartMoneyScore = 0;

  if (whales.length >= 2) {
    smartMoneyScore += 20;
  }

  if (whales.length >= 4) {
    smartMoneyScore += 15;
  }

  if (
    top10 > 0 &&
    top10 <= 60
  ) {
    smartMoneyScore += 20;
  }

  if (
    top1 !== null &&
    top1 <= 15
  ) {
    smartMoneyScore += 15;
  }

  return {
    verified: true,

    holderCount:
      safeNumber(
        counters
          ?.token_holders_count ??
        counters
          ?.holders_count
      ),

    transferCount:
      safeNumber(
        counters
          ?.transfers_count ??
        counters
          ?.token_transfers_count
      ),

    topHolders,

    whale: {
      verified:
        Boolean(holders),

      whaleCount:
        whales.length,

      top1Percent:
        top1,

      top5Percent:
        top5,

      top10Percent:
        top10,

      concentrationRisk:
        holders
          ? concentrationRisk
          : "UNVERIFIED",

      flow:
        "NOT_VERIFIED",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      smartMoneyScore,

      smartMoneyCandidate:
        smartMoneyScore >= 55,

      smartMoneyVerified:
        false
    }
  };
}

function unverifiedHolders() {
  return {
    verified: false,
    holderCount: null,
    transferCount: null,
    topHolders: [],

    whale: {
      verified: false,
      whaleCount: null,
      top1Percent: null,
      top5Percent: null,
      top10Percent: null,

      concentrationRisk:
        "UNVERIFIED",

      flow:
        "NOT_VERIFIED",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      smartMoneyScore: 0,

      smartMoneyCandidate:
        false,

      smartMoneyVerified:
        false
    }
  };
}


/* =========================================================
   V73 MOMENTUM
   ========================================================= */

function momentumAnalysis(
  previous,
  market,
  holders
) {
  if (!previous) {
    return {
      verified: false,
      score: 0,
      label:
        "BUILDING_HISTORY",

      holderGrowthPercent:
        null,

      transferGrowthPercent:
        null,

      liquidityGrowthPercent:
        null,

      volumeH1GrowthPercent:
        null,

      transactionGrowthPercent:
        null,

      reasons: [
        "Waiting for historical snapshot"
      ]
    };
  }

  const holderGrowth =
    holders?.verified
      ? percentChange(
          previous.holderCount,
          holders.holderCount
        )
      : null;

  const transferGrowth =
    holders?.verified
      ? percentChange(
          previous.transferCount,
          holders.transferCount
        )
      : null;

  const liquidityGrowth =
    market?.verified
      ? percentChange(
          previous.liquidityUsd,
          market.liquidityUsd
        )
      : null;

  const volumeGrowth =
    market?.verified
      ? percentChange(
          previous.volumeH1,
          market.volume?.h1
        )
      : null;

  const previousTransactions =
    safeNumber(
      previous.buysH1
    ) +
    safeNumber(
      previous.sellsH1
    );

  const currentTransactions =
    safeNumber(
      market?.transactions
        ?.h1?.buys
    ) +
    safeNumber(
      market?.transactions
        ?.h1?.sells
    );

  const transactionGrowth =
    market?.verified
      ? percentChange(
          previousTransactions,
          currentTransactions
        )
      : null;

  let score = 0;
  const reasons = [];

  if (
    holderGrowth !== null &&
    holderGrowth > 0
  ) {
    score +=
      holderGrowth >= 20
        ? 25
        : holderGrowth >= 10
          ? 20
          : holderGrowth >= 3
            ? 12
            : 5;

    reasons.push(
      `Holder growth ${holderGrowth.toFixed(1)}%`
    );
  }

  if (
    transferGrowth !== null &&
    transferGrowth > 0
  ) {
    score +=
      transferGrowth >= 25
        ? 15
        : transferGrowth >= 10
          ? 10
          : 5;

    reasons.push(
      `Transfer growth ${transferGrowth.toFixed(1)}%`
    );
  }

  if (
    liquidityGrowth !== null &&
    liquidityGrowth > 0
  ) {
    score +=
      liquidityGrowth >= 20
        ? 15
        : liquidityGrowth >= 5
          ? 10
          : 5;

    reasons.push(
      `Liquidity growth ${liquidityGrowth.toFixed(1)}%`
    );
  }

  if (
    volumeGrowth !== null &&
    volumeGrowth > 0
  ) {
    score +=
      volumeGrowth >= 100
        ? 20
        : volumeGrowth >= 30
          ? 15
          : volumeGrowth >= 10
            ? 10
            : 5;

    reasons.push(
      `Volume acceleration ${volumeGrowth.toFixed(1)}%`
    );
  }

  if (
    transactionGrowth !== null &&
    transactionGrowth > 0
  ) {
    score +=
      transactionGrowth >= 50
        ? 15
        : transactionGrowth >= 15
          ? 10
          : 5;

    reasons.push(
      `Transaction acceleration ${transactionGrowth.toFixed(1)}%`
    );
  }

  if (
    market?.buyPressure1h !== null &&
    market?.buyPressure1h >= 65
  ) {
    score += 10;

    reasons.push(
      "Strong buy pressure"
    );
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    verified:
      Boolean(
        market?.verified ||
        holders?.verified
      ),

    score,

    label:
      score >= MOMENTUM_STRONG
        ? "STRONG"
        : score >= MOMENTUM_GOOD
          ? "GOOD"
          : score >= 25
            ? "EARLY"
            : "WEAK",

    holderGrowthPercent:
      holderGrowth,

    transferGrowthPercent:
      transferGrowth,

    liquidityGrowthPercent:
      liquidityGrowth,

    volumeH1GrowthPercent:
      volumeGrowth,

    transactionGrowthPercent:
      transactionGrowth,

    reasons
  };
}


/* =========================================================
   SCORING
   ========================================================= */

function scoreRisk(
  token,
  market,
  holders,
  activity
) {
  let score = 50;
  const reasons = [];

  if (token.validERC20) {
    score -= 15;
    reasons.push(
      "Verified ERC-20"
    );
  }

  if (activity.swaps > 0) {
    score -= 7;
    reasons.push(
      "Active V4 swaps"
    );
  }

  if (market.verified) {
    score -= 5;

    if (
      market.liquidityUsd >=
      10000
    ) {
      score -= 8;
    }

    if (
      market.liquidityUsd <
      1000
    ) {
      score += 15;
      reasons.push(
        "Very low liquidity"
      );
    }
  }

  const whale =
    holders?.whale;

  if (whale?.verified) {
    if (
      whale.concentrationRisk ===
      "HIGH"
    ) {
      score += 25;
      reasons.push(
        "High whale concentration"
      );
    }

    if (
      whale.concentrationRisk ===
      "MEDIUM"
    ) {
      score += 10;
    }

    if (
      whale.top1Percent !== null &&
      whale.top1Percent > 40
    ) {
      score += 15;

      reasons.push(
        "Extreme top-holder concentration"
      );
    }
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    score,

    label:
      score >= 80
        ? "HIGH"
        : score >= 60
          ? "MEDIUM"
          : "LOW",

    reasons
  };
}

function scoreOpportunity(
  token,
  market,
  holders,
  activity,
  momentum
) {
  let score = 0;
  const reasons = [];

  if (token.validERC20) {
    score += 20;
    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    token.name &&
    token.symbol
  ) {
    score += 5;
  }

  if (activity.swaps > 0) {
    score += 10;

    reasons.push(
      "Pool-specific V4 swaps detected"
    );
  }

  if (
    activity.liquidityEvents >
    0
  ) {
    score += 5;

    reasons.push(
      "Pool liquidity activity"
    );
  }

  if (market.verified) {
    score += 10;

    if (
      market.liquidityUsd >=
      5000
    ) {
      score += 5;
    }

    if (
      market.liquidityUsd >=
      25000
    ) {
      score += 5;
    }

    if (
      market.volume?.h24 >=
      10000
    ) {
      score += 5;
    }

    if (
      market.volume?.h24 >=
      50000
    ) {
      score += 5;
    }

    if (
      market.buyPressure1h !==
        null &&
      market.buyPressure1h >=
        60
    ) {
      score += 7;

      reasons.push(
        "Strong 1h buy pressure"
      );
    }

    if (
      market.marketCap &&
      market.marketCap >=
        25000 &&
      market.marketCap <=
        5000000
    ) {
      score += 5;

      reasons.push(
        "Early market-cap range"
      );
    }
  }

  if (holders?.verified) {
    if (
      holders.holderCount >= 50
    ) {
      score += 4;
    }

    if (
      holders.holderCount >= 200
    ) {
      score += 4;
    }

    const whale =
      holders.whale;

    if (
      whale?.concentrationRisk ===
      "LOW"
    ) {
      score += 5;

      reasons.push(
        "Healthy whale concentration"
      );
    }

    if (
      whale?.smartMoneyCandidate
    ) {
      score += 5;

      reasons.push(
        "Smart-money candidate pattern"
      );
    }

    if (
      whale?.concentrationRisk ===
      "HIGH"
    ) {
      score -= 15;

      reasons.push(
        "Whale concentration penalty"
      );
    }
  }

  /*
   * V73 momentum bonus.
   */
  if (momentum?.verified) {
    if (
      momentum.score >= 70
    ) {
      score += 15;

      reasons.push(
        "Strong accelerating momentum"
      );

    } else if (
      momentum.score >= 50
    ) {
      score += 10;

      reasons.push(
        "Good momentum"
      );

    } else if (
      momentum.score >= 25
    ) {
      score += 5;

      reasons.push(
        "Early momentum"
      );
    }
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    reasons
  };
}


/* =========================================================
   WATCH PRIORITY
   ========================================================= */

function watchPriority(
  watched
) {
  let score = 0;

  if (
    !knownQuote(
      watched.address
    )
  ) {
    score += 1000;
  }

  const lastChecked =
    safeNumber(
      watched.lastCheckedAt
    );

  if (!lastChecked) {
    score += 500;
  } else {
    score += Math.min(
      400,
      Math.floor(
        (
          Date.now() -
          lastChecked
        ) /
        60000
      )
    );
  }

  const age =
    Date.now() -
    safeNumber(
      watched.firstSeenAt
    );

  if (
    age >= 0 &&
    age <
      60 * 60 * 1000
  ) {
    score += 100;
  }

  score +=
    Math.min(
      50,
      (
        watched.pools?.length ||
        0
      ) * 10
    );

  return score;
}


/* =========================================================
   TELEGRAM
   ========================================================= */

function alerted(
  state,
  address
) {
  const key =
    normalize(address);

  const persistent =
    safeNumber(
      state.alerts?.[key]
    );

  if (
    persistent &&
    Date.now() -
      persistent <
      ALERT_COOLDOWN
  ) {
    return true;
  }

  const memory =
    MEMORY_ALERTS.get(
      key
    );

  return Boolean(
    memory &&
    Date.now() -
      memory <
      ALERT_COOLDOWN
  );
}

async function telegram(
  env,
  state,
  candidate,
  budget
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

  if (
    !candidate.validERC20 ||
    !candidate.market?.verified
  ) {
    return {
      sent: false,
      reason:
        "UNVERIFIED_CANDIDATE"
    };
  }

  if (
    candidate.market
      .liquidityUsd <
    MIN_ALERT_LIQUIDITY
  ) {
    return {
      sent: false,
      reason:
        "LOW_LIQUIDITY"
    };
  }

  if (
    candidate.rugRisk.score >
    MAX_ALERT_RISK
  ) {
    return {
      sent: false,
      reason:
        "RISK_TOO_HIGH"
    };
  }

  if (
    candidate.opportunity.score <
    MIN_ALERT_SCORE
  ) {
    return {
      sent: false,
      reason:
        "SCORE_TOO_LOW"
    };
  }

  if (
    alerted(
      state,
      candidate.address
    )
  ) {
    return {
      sent: false,
      reason:
        "COOLDOWN"
    };
  }

  if (
    !consumeBudget(
      budget,
      "TELEGRAM"
    )
  ) {
    return {
      sent: false,
      reason:
        "REQUEST_BUDGET_SKIPPED"
    };
  }

  const whale =
    candidate
      .holders
      ?.whale;

  const top1 =
    Number.isFinite(
      whale?.top1Percent
    )
      ? whale.top1Percent
          .toFixed(2)
      : "UNVERIFIED";

  const top10 =
    Number.isFinite(
      whale?.top10Percent
    )
      ? whale.top10Percent
          .toFixed(2)
      : "UNVERIFIED";

  const momentum =
    candidate.momentum;

  const message =
`🚨 Robinhood Chain Meme Hunter V73

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🚀 Momentum: ${momentum?.score ?? 0}/100 (${momentum?.label || "UNVERIFIED"})
🛡 Rug Risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

💰 Market Cap: ${money(candidate.market.marketCap)}
💧 Liquidity: ${money(candidate.market.liquidityUsd)}
📊 24h Volume: ${money(candidate.market.volume?.h24)}

🟢 1h Buys: ${candidate.market.transactions?.h1?.buys ?? "UNVERIFIED"}
🔴 1h Sells: ${candidate.market.transactions?.h1?.sells ?? "UNVERIFIED"}

👥 Holders: ${candidate.holders?.holderCount ?? "UNVERIFIED"}

📈 Holder growth: ${
  Number.isFinite(momentum?.holderGrowthPercent)
    ? momentum.holderGrowthPercent.toFixed(1) + "%"
    : "BUILDING HISTORY"
}

📈 Liquidity growth: ${
  Number.isFinite(momentum?.liquidityGrowthPercent)
    ? momentum.liquidityGrowthPercent.toFixed(1) + "%"
    : "BUILDING HISTORY"
}

📈 Volume acceleration: ${
  Number.isFinite(momentum?.volumeH1GrowthPercent)
    ? momentum.volumeH1GrowthPercent.toFixed(1) + "%"
    : "BUILDING HISTORY"
}

🐋 Whale wallets: ${whale?.whaleCount ?? "UNVERIFIED"}
🐋 Top holder: ${top1}%
🐋 Top 10: ${top10}%
🐋 Concentration: ${whale?.concentrationRisk ?? "UNVERIFIED"}

🧠 Smart-money candidate: ${whale?.smartMoneyCandidate ? "YES" : "NO"}
🧠 Smart-money verified: NO

📡 Pool V4 swaps: ${candidate.activity.swaps}
💦 Pool liquidity events: ${candidate.activity.liquidityEvents}

⚠️ Automated early-stage screening. High risk.`;

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

          body:
            JSON.stringify({
              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                message.slice(
                  0,
                  3900
                )
            })
        }
      );

    const body =
      await response.json();

    if (
      !response.ok ||
      !body.ok
    ) {
      return {
        sent: false,
        reason:
          "TELEGRAM_API_ERROR",
        status:
          response.status
      };
    }

    const key =
      normalize(
        candidate.address
      );

    const timestamp =
      Date.now();

    state.alerts[key] =
      timestamp;

    MEMORY_ALERTS.set(
      key,
      timestamp
    );

    return {
      sent: true,

      messageId:
        body.result
          ?.message_id ||
        null
    };

  } catch (error) {
    return {
      sent: false,
      reason:
        "TELEGRAM_REQUEST_FAILED",
      error:
        errorString(error)
    };
  }
}


/* =========================================================
   SCAN
   ========================================================= */

async function scan(env) {
  const started = Date.now();
  const budget = createBudget();

  const stateResult =
    await readState(env);

  const state =
    stateResult.state;

  pruneState(state);

  const previous =
    state.lastScannedBlock;

  const latest =
    await latestBlock(
      env,
      budget
    );

  const latestNumber =
    latest.block;

  let from;

  if (
    stateResult.persistent &&
    previous !== null &&
    previous !== undefined
  ) {
    from =
      BigInt(previous) +
      1n;

  } else {
    from =
      latestNumber -
      BigInt(
        LIVE_SCAN_BLOCKS - 1
      );
  }

  if (from < 0n) {
    from = 0n;
  }

  const backlogBefore =
    from <= latestNumber
      ? Number(
          latestNumber -
          from +
          1n
        )
      : 0;

  const catchupMode =
    backlogBefore >
    BACKLOG_LIVE_THRESHOLD;

  const targetBlocks =
    catchupMode
      ? CATCHUP_TARGET_BLOCKS
      : LIVE_SCAN_BLOCKS;

  let to =
    from +
    BigInt(
      targetBlocks - 1
    );

  if (
    to >
    latestNumber
  ) {
    to =
      latestNumber;
  }

  const upToDate =
    from >
    latestNumber;

  const scanOutput = {
    logs: [],
    ranges: []
  };

  let processedThrough =
    previous !== null &&
    previous !== undefined
      ? BigInt(previous)
      : null;

  let failedRange = null;

  if (!upToDate) {
    let cursor = from;

    while (
      cursor <= to &&
      budgetAvailable(
        budget,
        3
      )
    ) {
      let end =
        cursor +
        BigInt(
          INITIAL_LOG_RANGE - 1
        );

      if (end > to) {
        end = to;
      }

      const result =
        await scanLogRange(
          env,
          cursor,
          end,
          budget,
          scanOutput
        );

      if (!result.success) {
        failedRange =
          result.failedRange || {
            fromBlock:
              Number(cursor),

            toBlock:
              Number(end),

            error:
              result.budgetExhausted
                ? "REQUEST_BUDGET_EXHAUSTED"
                : result.error ||
                  "SCAN_FAILED"
          };

        if (
          result.processedThrough !==
          null &&
          result.processedThrough !==
          undefined
        ) {
          processedThrough =
            result.processedThrough;
        }

        break;
      }

      processedThrough =
        result.processedThrough;

      cursor =
        result.processedThrough +
        1n;
    }
  }

  if (
    stateResult.persistent &&
    processedThrough !== null &&
    processedThrough !== undefined
  ) {
    state.lastScannedBlock =
      Number(
        processedThrough
      );
  }

  const allLogs =
    scanOutput.logs;

  const initializeLogs =
    allLogs.filter(
      log =>
        normalize(
          log?.topics?.[0]
        ) ===
        INITIALIZE_TOPIC
    );

  const pools =
    initializeLogs
      .map(decodeInitialize)
      .filter(Boolean);

  const newTokens =
    new Set();

  for (const pool of pools) {
    for (
      const address
      of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        !address ||
        normalize(address) ===
          ZERO
      ) {
        continue;
      }

      addWatch(
        state,
        address,
        pool
      );

      newTokens.add(
        normalize(address)
      );
    }
  }

  pruneState(state);

  const validationResults = [];
  const verified = [];

  const candidatesToCheck =
    [...state.watchedTokens]
      .sort(
        (a, b) =>
          watchPriority(b) -
          watchPriority(a)
      )
      .slice(
        0,
        MAX_TOKEN_CHECKS
      );

  for (
    const watched
    of candidatesToCheck
  ) {
    /*
     * Leave enough budget for market
     * intelligence and state completion.
     */
    if (
      !budgetAvailable(
        budget,
        7
      )
    ) {
      break;
    }

    const token =
      await verifyERC20(
        env,
        watched.address,
        budget
      );

    watched.lastCheckedAt =
      Date.now();

    watched.checks =
      safeNumber(
        watched.checks
      ) + 1;

    watched.metadata =
      token;

    const infrastructure =
      knownQuoteMetadata(
        watched.address,
        token.symbol
      );

    validationResults.push({
      address:
        watched.address,

      priority:
        watchPriority(
          watched
        ),

      knownQuoteToken:
        infrastructure,

      ...token
    });

    if (
      token.validERC20
    ) {
      verified.push({
        watched,
        token,
        infrastructure
      });
    }
  }

  verified.sort(
    (a, b) => {
      if (
        a.infrastructure !==
        b.infrastructure
      ) {
        return (
          Number(a.infrastructure) -
          Number(b.infrastructure)
        );
      }

      return (
        watchPriority(
          b.watched
        ) -
        watchPriority(
          a.watched
        )
      );
    }
  );

  const analysed = [];

  let holderLookups = 0;
  let marketLookups = 0;

  for (
    const item
    of verified
  ) {
    if (
      marketLookups >=
      MAX_MARKET_LOOKUPS
    ) {
      break;
    }

    if (
      !budgetAvailable(
        budget,
        2
      )
    ) {
      break;
    }

    const {
      watched,
      token,
      infrastructure
    } = item;

    /*
     * Don't spend market/holder requests
     * on known quote assets.
     */
    if (infrastructure) {
      continue;
    }

    marketLookups++;

    const market =
      await marketData(
        watched.address,
        budget
      );

    let holders =
      unverifiedHolders();

    if (
      holderLookups <
        MAX_HOLDER_LOOKUPS &&
      budgetAvailable(
        budget,
        2
      )
    ) {
      holderLookups++;

      holders =
        await holderIntelligence(
          watched.address,
          token.totalSupply,
          budget
        );
    }

    const activity =
      activityForToken(
        watched,
        allLogs
      );

    const previousSnapshot =
      getPreviousSnapshot(
        state,
        watched.address
      );

    const momentum =
      momentumAnalysis(
        previousSnapshot,
        market,
        holders
      );

    const rugRisk =
      scoreRisk(
        token,
        market,
        holders,
        activity
      );

    const opportunity =
      scoreOpportunity(
        token,
        market,
        holders,
        activity,
        momentum
      );

    const candidate = {
      address:
        watched.address,

      knownQuoteToken:
        false,

      name:
        token.name,

      symbol:
        token.symbol,

      decimals:
        token.decimals,

      totalSupply:
        token.totalSupply,

      validERC20:
        true,

      firstSeenAt:
        watched.firstSeenAt,

      poolCount:
        watched.pools
          ?.length || 0,

      pools:
        watched.pools || [],

      activity,

      market,

      holders,

      whaleIntelligence:
        holders.whale,

      momentum,

      rugRisk,

      opportunity
    };

    analysed.push(candidate);

    saveSnapshot(
      state,
      candidate
    );
  }

  analysed.sort(
    (a, b) => {
      const opportunityDiff =
        b.opportunity.score -
        a.opportunity.score;

      if (opportunityDiff) {
        return opportunityDiff;
      }

      return (
        b.momentum.score -
        a.momentum.score
      );
    }
  );

  const qualifying =
    analysed.filter(
      candidate =>
        candidate.market
          ?.verified &&

        candidate.market
          .liquidityUsd >=
          MIN_ALERT_LIQUIDITY &&

        candidate.rugRisk
          .score <=
          MAX_ALERT_RISK &&

        candidate.opportunity
          .score >=
          MIN_ALERT_SCORE
    );

  const telegramResults = [];

  for (
    const candidate
    of qualifying.slice(
      0,
      2
    )
  ) {
    if (
      !budgetAvailable(
        budget,
        1
      )
    ) {
      break;
    }

    const result =
      await telegram(
        env,
        state,
        candidate,
        budget
      );

    candidate.telegram =
      result;

    telegramResults.push(
      result
    );
  }

  pruneState(state);

  const saved =
    await writeState(
      env,
      state
    );

  const currentLast =
    state.lastScannedBlock;

  const backlogRemaining =
    currentLast !== null &&
    currentLast !== undefined
      ? Math.max(
          0,
          Number(
            latestNumber -
            BigInt(currentLast)
          )
        )
      : 0;

  const scanMode =
    !stateResult.persistent
      ? "NON_PERSISTENT_RECENT_WINDOW"
      : backlogRemaining >
          BACKLOG_LIVE_THRESHOLD
        ? "PERSISTENT_FAST_CATCHUP"
        : "PERSISTENT_LIVE";

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      !failedRange ||
      failedRange.error ===
        "REQUEST_BUDGET_EXHAUSTED",

    scan: {
      status:
        failedRange
          ? failedRange.error ===
              "REQUEST_BUDGET_EXHAUSTED"
            ? "BUDGET_LIMIT_REACHED"
            : "PARTIAL"
          : "OK",

      scanMode,

      durationMs:
        Date.now() -
        started,

      latestBlock:
        Number(
          latestNumber
        ),

      persistence: {
        enabled:
          stateResult.persistent,

        binding:
          stateResult.binding,

        stateReadError:
          stateResult.error,

        stateSaved:
          saved.saved,

        stateSaveError:
          saved.error,

        previousLastScannedBlock:
          previous,

        currentLastScannedBlock:
          currentLast,

        backlogBefore,

        backlogRemaining,

        catchupTargetBlocks:
          CATCHUP_TARGET_BLOCKS
      },

      requestBudget: {
        used:
          budget.used,

        limit:
          budget.limit,

        remaining:
          Math.max(
            0,
            budget.limit -
            budget.used
          ),

        skipped:
          budget.skipped
      },

      rangesCompleted:
        scanOutput.ranges,

      failedRange,

      v4: {
        poolManager:
          POOL_MANAGER,

        rawLogs:
          allLogs.length,

        initializeEvents:
          pools.length,

        swapTopicMatches:
          allLogs.filter(
            log =>
              normalize(
                log?.topics?.[0]
              ) ===
              SWAP_TOPIC
          ).length,

        modifyLiquidityTopicMatches:
          allLogs.filter(
            log =>
              normalize(
                log?.topics?.[0]
              ) ===
              MODIFY_LIQUIDITY_TOPIC
          ).length,

        newTokenCandidates:
          newTokens.size
      },

      watchedTokens:
        state.watchedTokens
          .length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        verified.length,

      validationResults,

      marketLookups,

      holderLookups,

      candidates:
        analysed,

      qualifyingCandidates:
        qualifying.length,

      telegramCandidates:
        telegramResults.filter(
          result =>
            result.sent
        ).length,

      telegramResults,

      intelligence: {
        persistentBlockTracking:
          stateResult.persistent
            ? "ENABLED"
            : "DISABLED",

        adaptiveCatchup:
          "ENABLED_V73",

        failedRangeProtection:
          "ENABLED",

        requestBudget:
          "ENABLED_V73",

        infrastructureFiltering:
          "ENABLED_V73",

        candidateRotation:
          "ENABLED",

        poolSpecificActivity:
          "ENABLED",

        historicalSnapshots:
          "ENABLED_V73",

        holderGrowth:
          "ENABLED_V73",

        liquidityGrowth:
          "ENABLED_V73",

        volumeAcceleration:
          "ENABLED_V73",

        transactionAcceleration:
          "ENABLED_V73",

        momentumScoring:
          "ENABLED_V73",

        market:
          "DEXSCREENER",

        holders:
          "BLOCKSCOUT",

        whaleConcentration:
          "ENABLED",

        whaleFlow:
          "NOT_VERIFIED",

        smartMoney:
          "CANDIDATE_SCORING_ONLY",

        smartMoneyVerified:
          false,

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V73_ADAPTIVE_MOMENTUM_INTELLIGENCE_HUNTER"
    },

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    timestamp:
      now()
  };
}


/* =========================================================
   HEALTH
   ========================================================= */

async function health(env) {
  const budget =
    createBudget();

  let latest = null;
  let provider = null;
  let error = null;

  try {
    const result =
      await latestBlock(
        env,
        budget
      );

    latest =
      Number(
        result.block
      );

    provider =
      result.provider;

  } catch (e) {
    error =
      errorString(e);
  }

  const stateResult =
    await readState(env);

  pruneState(
    stateResult.state
  );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      error
        ? "DEGRADED"
        : "ONLINE",

    routes: [
      "/health",
      "/rpc-test",
      "/scan",
      "/state",
      "/diagnostics",
      "/run-all",
      "/test-telegram"
    ],

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    rpcStatus:
      error
        ? "ERROR"
        : "CONNECTED",

    latestBlock:
      latest,

    rpcProvider:
      provider,

    alchemyConfigured:
      Boolean(
        env.ALCHEMY_API_KEY
      ),

    persistence: {
      kvConfigured:
        stateResult.persistent,

      bindingDetected:
        stateResult.binding,

      stateKey:
        STATE_KEY,

      lastScannedBlock:
        stateResult.state
          .lastScannedBlock,

      watchedTokens:
        stateResult.state
          .watchedTokens
          .length,

      snapshotTokens:
        Object.keys(
          stateResult.state
            .snapshots || {}
        ).length,

      stateError:
        stateResult.error
    },

    telegram: {
      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      automaticCalls:
        true,

      minimumScore:
        MIN_ALERT_SCORE,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY
    },

    intelligence: {
      adaptiveCatchup:
        "ENABLED",

      requestBudget:
        "ENABLED",

      momentumHistory:
        "ENABLED",

      poolSpecificActivity:
        "ENABLED",

      candidateRotation:
        "ENABLED",

      whaleConcentration:
        "ENABLED",

      smartMoney:
        "CANDIDATE_ONLY",

      smartMoneyVerified:
        false
    },

    architecture:
      "V73_ADAPTIVE_MOMENTUM_INTELLIGENCE_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   STATE
   ========================================================= */

async function stateStatus(env) {
  const result =
    await readState(env);

  pruneState(
    result.state
  );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    persistenceConfigured:
      result.persistent,

    bindingDetected:
      result.binding,

    stateKey:
      STATE_KEY,

    error:
      result.error,

    lastScannedBlock:
      result.state
        .lastScannedBlock,

    watchedTokens:
      result.state
        .watchedTokens
        .map(token => ({
          address:
            token.address,

          name:
            token.metadata
              ?.name ||
            null,

          symbol:
            token.metadata
              ?.symbol ||
            null,

          validERC20:
            token.metadata
              ?.validERC20 ??
            null,

          infrastructureToken:
            knownQuoteMetadata(
              token.address,
              token.metadata
                ?.symbol
            ),

          checks:
            token.checks,

          firstSeenAt:
            token.firstSeenAt,

          lastCheckedAt:
            token.lastCheckedAt,

          poolCount:
            token.pools
              ?.length ||
            0,

          snapshotCount:
            result.state
              .snapshots[
                normalize(
                  token.address
                )
              ]?.length ||
            0,

          priority:
            watchPriority(
              token
            )
        })),

    recentAlertCount:
      Object.keys(
        result.state.alerts ||
        {}
      ).length,

    snapshotTokenCount:
      Object.keys(
        result.state
          .snapshots || {}
      ).length,

    timestamp:
      now()
  };
}


/* =========================================================
   RPC TEST
   ========================================================= */

async function rpcTest(env) {
  const budget =
    createBudget();

  const latest =
    await latestBlock(
      env,
      budget
    );

  const from =
    latest.block > 2n
      ? latest.block - 2n
      : 0n;

  const logs =
    await getLogs(
      env,
      from,
      latest.block,
      budget
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      Array.isArray(
        logs.result
      ),

    latestBlock:
      Number(
        latest.block
      ),

    poolManagerLogs:
      Array.isArray(
        logs.result
      )
        ? logs.result.length
        : 0,

    provider:
      logs.provider,

    error:
      logs.error,

    requestBudgetUsed:
      budget.used,

    timestamp:
      now()
  };
}


/* =========================================================
   DIAGNOSTICS
   ========================================================= */

async function diagnostics(env) {
  const budget =
    createBudget();

  const checks = {};

  const stateResult =
    await readState(env);

  checks.kv = {
    success:
      stateResult.persistent &&
      !stateResult.error,

    configured:
      stateResult.persistent,

    binding:
      stateResult.binding,

    stateKey:
      STATE_KEY,

    readError:
      stateResult.error,

    lastScannedBlock:
      stateResult.state
        .lastScannedBlock,

    watchedTokens:
      stateResult.state
        .watchedTokens
        ?.length || 0,

    snapshotTokens:
      Object.keys(
        stateResult.state
          .snapshots || {}
      ).length
  };

  try {
    const latest =
      await latestBlock(
        env,
        budget
      );

    checks.rpc = {
      success: true,

      latestBlock:
        Number(
          latest.block
        ),

      provider:
        latest.provider
    };

  } catch (error) {
    checks.rpc = {
      success: false,
      error:
        errorString(error)
    };
  }

  if (checks.rpc.success) {
    try {
      const latest =
        BigInt(
          checks.rpc.latestBlock
        );

      const from =
        latest > 2n
          ? latest - 2n
          : 0n;

      const logs =
        await getLogs(
          env,
          from,
          latest,
          budget
        );

      checks.poolManager = {
        success:
          Array.isArray(
            logs.result
          ),

        address:
          POOL_MANAGER,

        logs:
          Array.isArray(
            logs.result
          )
            ? logs.result.length
            : 0,

        provider:
          logs.provider,

        error:
          logs.error
      };

    } catch (error) {
      checks.poolManager = {
        success: false,
        address:
          POOL_MANAGER,
        error:
          errorString(error)
      };
    }
  }

  checks.alchemy = {
    configured:
      Boolean(
        env.ALCHEMY_API_KEY
      )
  };

  checks.telegram = {
    configured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      )
  };

  checks.dexscreener = {
    configured: true,
    mode:
      "PUBLIC_API"
  };

  checks.blockscout = {
    configured: true,
    mode:
      "PUBLIC_API"
  };

  checks.v73 = {
    adaptiveCatchup: true,
    requestBudget: true,
    infrastructureFiltering: true,
    momentumHistory: true
  };

  const criticalOK =
    checks.rpc.success &&
    checks.poolManager
      ?.success;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      criticalOK,

    status:
      criticalOK
        ? "READY"
        : "DEGRADED",

    checks,

    requiredFixes: [
      ...(
        !checks.kv.configured
          ? [
              "ADD_KV_BINDING_MEME_HUNTER_STATE"
            ]
          : []
      ),

      ...(
        !checks.rpc.success
          ? [
              "FIX_RPC_CONNECTION"
            ]
          : []
      ),

      ...(
        !checks.poolManager
          ?.success
          ? [
              "FIX_POOL_MANAGER_LOG_ACCESS"
            ]
          : []
      ),

      ...(
        !checks.telegram
          .configured
          ? [
              "CONFIGURE_TELEGRAM_SECRETS"
            ]
          : []
      )
    ],

    requestBudgetUsed:
      budget.used,

    architecture:
      "V73_ADAPTIVE_MOMENTUM_INTELLIGENCE_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   TELEGRAM TEST
   ========================================================= */

async function telegramTest(env) {
  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success: true,

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ),

    safetyTest:
      "NO_FAKE_TOKEN_ALERT_SENT",

    timestamp:
      now()
  };
}


/* =========================================================
   V73 RUN ALL
   ========================================================= */

async function runAll(env) {
  const started =
    Date.now();

  /*
   * V72 ran several independent RPC tests
   * before the scan and helped exhaust the
   * Worker subrequest limit.
   *
   * V73 makes the scan the primary network
   * test. Health/state are generated after
   * it without repeating diagnostics +
   * rpc-test inside the same invocation.
   */

  let scanResult = null;
  let scanError = null;

  try {
    scanResult =
      await scan(env);
  } catch (error) {
    scanError =
      errorString(error);
  }

  const state =
    await stateStatus(env);

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      Boolean(
        scanResult &&
        !scanError
      ),

    status:
      scanError
        ? "COMPLETED_WITH_ERRORS"
        : "ALL_CORE_TESTS_COMPLETED",

    durationMs:
      Date.now() -
      started,

    errors:
      scanError
        ? [{
            test: "scan",
            error:
              scanError
          }]
        : [],

    results: {
      scan:
        scanResult,

      state,

      telegramTest:
        await telegramTest(env),

      note:
        "V73 /run-all avoids duplicate RPC/diagnostic calls. Use /diagnostics and /rpc-test separately for dedicated tests."
    },

    timestamp:
      now()
  };
}


/* =========================================================
   WORKER
   ========================================================= */

export default {

  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    const path =
      url.pathname
        .replace(
          /\/+$/,
          ""
        ) || "/";

    try {

      if (
        path === "/" ||
        path === "/health"
      ) {
        return json(
          await health(env)
        );
      }

      if (
        path === "/rpc-test"
      ) {
        return json(
          await rpcTest(env)
        );
      }

      if (
        path === "/scan"
      ) {
        return json(
          await scan(env)
        );
      }

      if (
        path === "/state"
      ) {
        return json(
          await stateStatus(env)
        );
      }

      if (
        path === "/diagnostics"
      ) {
        return json(
          await diagnostics(env)
        );
      }

      if (
        path === "/run-all"
      ) {
        return json(
          await runAll(env)
        );
      }

      if (
        path ===
        "/test-telegram"
      ) {
        return json(
          await telegramTest(env)
        );
      }

      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          error:
            "NOT_FOUND",

          routes: [
            "/health",
            "/rpc-test",
            "/scan",
            "/state",
            "/diagnostics",
            "/run-all",
            "/test-telegram"
          ]
        },
        404
      );

    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success: false,

          error:
            errorString(error),

          timestamp:
            now()
        },
        500
      );
    }
  },


  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      scan(env)
        .then(result => {
          console.log(
            JSON.stringify({
              event:
                "V73_SCHEDULED_SCAN",

              success:
                result.success,

              status:
                result.scan
                  ?.status,

              scanMode:
                result.scan
                  ?.scanMode,

              latestBlock:
                result.scan
                  ?.latestBlock,

              lastScannedBlock:
                result.scan
                  ?.persistence
                  ?.currentLastScannedBlock,

              backlogRemaining:
                result.scan
                  ?.persistence
                  ?.backlogRemaining,

              requestsUsed:
                result.scan
                  ?.requestBudget
                  ?.used,

              watchedTokens:
                result.scan
                  ?.watchedTokens ||
                0,

              candidates:
                result.scan
                  ?.candidates
                  ?.length ||
                0,

              qualifying:
                result.scan
                  ?.qualifyingCandidates ||
                0,

              telegramAlerts:
                result.scan
                  ?.telegramCandidates ||
                0,

              timestamp:
                now()
            })
          );
        })
        .catch(error => {
          console.error(
            "V73 scheduled scan failed",
            error
          );

          throw error;
        })
    );
  }
};
