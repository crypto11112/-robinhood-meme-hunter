/**
 * Robinhood Chain Meme Hunter
 * V76
 *
 * COMPLETE DEPLOYABLE WORKER
 * Built directly from V75.
 *
 * V76:
 * - Preserves V75 discovery/scanning architecture
 * - Preserves V75 whale-flow intelligence
 * - Fixes catch-up consuming entire request budget
 * - Partitions request budget between discovery and intelligence
 * - Reserves requests for ERC20/market/holder analysis
 * - Adaptive catch-up
 * - Persistent KV state
 * - Infrastructure/quote filtering
 * - Persistent snapshots
 * - Historical momentum
 * - Whale accumulation/distribution history
 * - Concentration trend
 * - Smart-money behaviour candidate scoring
 * - Market quality
 * - Candidate confidence
 * - Telegram alerts
 */

const VERSION = "V76";

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
 * Preserve existing state.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

const LIVE_SCAN_BLOCKS = 20;
const CATCHUP_TARGET_BLOCKS = 2000;

const INITIAL_LOG_RANGE = 250;
const MIN_LOG_RANGE = 10;

const BACKLOG_LIVE_THRESHOLD = 100;

/*
 * V76 BUDGET PARTITION
 */
const MAX_EXTERNAL_REQUESTS = 42;

const RESERVED_ANALYSIS_REQUESTS = 16;

const MAX_DISCOVERY_REQUESTS =
  MAX_EXTERNAL_REQUESTS -
  RESERVED_ANALYSIS_REQUESTS;

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

const MAX_SNAPSHOTS_PER_TOKEN = 24;

const SNAPSHOT_MAX_AGE =
  24 * 60 * 60 * 1000;

const MIN_SNAPSHOT_INTERVAL =
  2 * 60 * 1000;

const MOMENTUM_MIN_HISTORY_MS =
  5 * 60 * 1000;

const MOMENTUM_IDEAL_HISTORY_MS =
  15 * 60 * 1000;

const MOMENTUM_STRONG = 75;
const MOMENTUM_GOOD = 50;

const MAX_PAIR_AGE_EARLY_MS =
  24 * 60 * 60 * 1000;

const VERY_EARLY_PAIR_AGE_MS =
  2 * 60 * 60 * 1000;

const MIN_CONFIDENCE_ALERT = 55;

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

function discoveryBudgetAvailable(
  budget,
  amount = 1
) {
  return (
    budget.used + amount <=
    MAX_DISCOVERY_REQUESTS
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

  return Number.isFinite(n)
    ? n
    : 0;
}

function clamp(
  value,
  min,
  max
) {
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

  return "0x" +
    topic.slice(-40);
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

  return "$" +
    n.toFixed(2);
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
  const a =
    safeNumber(previous);

  const b =
    safeNumber(current);

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
    typeof env.MEME_HUNTER_STATE.get ===
      "function" &&
    typeof env.MEME_HUNTER_STATE.put ===
      "function"
  ) {
    return {
      kv:
        env.MEME_HUNTER_STATE,
      binding:
        "MEME_HUNTER_STATE"
    };
  }

  if (
    env.KV_BINDING &&
    typeof env.KV_BINDING.get ===
      "function" &&
    typeof env.KV_BINDING.put ===
      "function"
  ) {
    return {
      kv:
        env.KV_BINDING,
      binding:
        "KV_BINDING"
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
      await kv.get(
        STATE_KEY
      );

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
          typeof parsed.alerts ===
            "object"
            ? parsed.alerts
            : {},

        snapshots:
          parsed?.snapshots &&
          typeof parsed.snapshots ===
            "object"
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
      error:
        errorString(error)
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
      error:
        "KV_NOT_CONFIGURED"
    };
  }

  try {
    state.version =
      VERSION;

    state.updatedAt =
      now();

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
      error:
        errorString(error)
    };
  }
}

function persistenceHealth(
  stateResult
) {
  if (!stateResult.persistent) {
    return {
      healthy: false,
      status:
        "KV_BINDING_MISSING",
      critical: true,
      message:
        "MEME_HUNTER_STATE/KV_BINDING is unavailable."
    };
  }

  if (stateResult.error) {
    return {
      healthy: false,
      status:
        "KV_READ_ERROR",
      critical: true,
      message:
        stateResult.error
    };
  }

  return {
    healthy: true,
    status: "READY",
    critical: false,
    message: null
  };
}

function pruneSnapshots(state) {
  const current =
    Date.now();

  state.snapshots =
    state.snapshots &&
    typeof state.snapshots ===
      "object"
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
      delete state.snapshots[
        address
      ];
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
            current -
              timestamp <=
              SNAPSHOT_MAX_AGE
          );
        })
        .slice(
          -MAX_SNAPSHOTS_PER_TOKEN
        );

    if (valid.length) {
      state.snapshots[
        address
      ] = valid;
    } else {
      delete state.snapshots[
        address
      ];
    }
  }
}

function pruneState(state) {
  const current =
    Date.now();

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
    typeof state.alerts ===
      "object"
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
      delete state.alerts[
        address
      ];
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
    key === ZERO ||
    knownQuote(address)
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
        normalize(
          item.poolId
        ) ===
        normalize(
          pool.poolId
        )
    )
  ) {
    token.pools.push(pool);
  }
}


/* =========================================================
   SNAPSHOTS
   ========================================================= */

function createSnapshot(
  candidate
) {
  const whale =
    candidate.holders?.whale;

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
        : null,

    top1Percent:
      whale?.verified
        ? whale.top1Percent
        : null,

    top5Percent:
      whale?.verified
        ? whale.top5Percent
        : null,

    top10Percent:
      whale?.verified
        ? whale.top10Percent
        : null,

    whaleBalances:
      candidate.holders
        ?.verified
        ? (
            candidate.holders
              .topHolders || []
          ).map(holder => ({
            address:
              holder.address,
            value:
              holder.value,
            percentage:
              holder.percentage
          }))
        : []
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

function getMomentumSnapshot(
  state,
  address
) {
  const snapshots =
    state.snapshots?.[
      normalize(address)
    ];

  if (
    !Array.isArray(snapshots) ||
    !snapshots.length
  ) {
    return null;
  }

  const current =
    Date.now();

  for (
    let i =
      snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const snapshot =
      snapshots[i];

    const age =
      current -
      safeNumber(
        snapshot.timestamp
      );

    if (
      age >=
      MOMENTUM_IDEAL_HISTORY_MS
    ) {
      return snapshot;
    }
  }

  for (
    let i =
      snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const snapshot =
      snapshots[i];

    const age =
      current -
      safeNumber(
        snapshot.timestamp
      );

    if (
      age >=
      MOMENTUM_MIN_HISTORY_MS
    ) {
      return snapshot;
    }
  }

  return null;
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
        error:
          publicError
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
   V76 ADAPTIVE LOG SCANNER
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
    !discoveryBudgetAvailable(
      budget,
      2
    )
  ) {
    return {
      success: false,
      budgetExhausted: true,
      analysisBudgetReserved: true,
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

  if (
    size >
    BigInt(
      MIN_LOG_RANGE
    )
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
      raw.match(/.{2}/g) ||
      [];

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
      data.match(/.{2}/g) ||
      [];

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
    !Array.isArray(
      log.topics
    ) ||
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

async function holderIntelligence(
  token,
  totalSupply,
  budget
) {
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
          Number.isFinite(
            value
          )
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
        item.percentage !==
          null &&
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
        "BUILDING_HISTORY",

      accumulation:
        "BUILDING_HISTORY",

      distribution:
        "BUILDING_HISTORY",

      smartMoneyScore,

      smartMoneyCandidate:
        smartMoneyScore >= 55,

      smartMoneyVerified:
        false
    }
  };
}


/* =========================================================
   V75/V76 WHALE FLOW
   ========================================================= */

function analyseWhaleFlow(
  previous,
  holders
) {
  if (
    !previous ||
    !holders?.verified ||
    !holders?.whale?.verified
  ) {
    return {
      verified: false,
      flow: "BUILDING_HISTORY",
      accumulation:
        "NOT_VERIFIED",
      distribution:
        "NOT_VERIFIED",
      concentrationTrend:
        "NOT_VERIFIED",
      score: 0,
      reasons: []
    };
  }

  const previousTop10 =
    safeNumber(
      previous.top10Percent
    );

  const currentTop10 =
    safeNumber(
      holders.whale
        .top10Percent
    );

  const previousTop1 =
    safeNumber(
      previous.top1Percent
    );

  const currentTop1 =
    safeNumber(
      holders.whale
        .top1Percent
    );

  let score = 0;

  const reasons = [];

  let concentrationTrend =
    "STABLE";

  if (
    previousTop10 > 0 &&
    currentTop10 > 0
  ) {
    const change =
      currentTop10 -
      previousTop10;

    if (change >= 2) {
      concentrationTrend =
        "INCREASING";

      score += 15;

      reasons.push(
        "Top-10 whale concentration increasing"
      );

    } else if (change <= -2) {
      concentrationTrend =
        "DECREASING";

      score -= 5;

      reasons.push(
        "Top-10 concentration decreasing"
      );
    }
  }

  if (
    previousTop1 > 0 &&
    currentTop1 > 0
  ) {
    const change =
      currentTop1 -
      previousTop1;

    if (
      change > 0 &&
      currentTop1 <= 20
    ) {
      score += 10;

      reasons.push(
        "Largest holder accumulating within acceptable concentration"
      );
    }

    if (
      currentTop1 >= 30 &&
      change > 0
    ) {
      score -= 20;

      reasons.push(
        "Largest holder concentration becoming dangerous"
      );
    }
  }

  const previousBalances =
    Array.isArray(
      previous.whaleBalances
    )
      ? previous.whaleBalances
      : [];

  const previousMap =
    new Map(
      previousBalances
        .filter(
          item =>
            item?.address
        )
        .map(
          item => [
            normalize(
              item.address
            ),
            item
          ]
        )
    );

  let increasing = 0;
  let decreasing = 0;
  let comparable = 0;

  for (
    const holder
    of holders.topHolders || []
  ) {
    const address =
      normalize(
        holder.address
      );

    if (!address) {
      continue;
    }

    const old =
      previousMap.get(
        address
      );

    if (!old) {
      continue;
    }

    try {
      const oldValue =
        BigInt(
          String(
            old.value || "0"
          )
        );

      const newValue =
        BigInt(
          String(
            holder.value || "0"
          )
        );

      comparable++;

      if (newValue > oldValue) {
        increasing++;
      }

      if (newValue < oldValue) {
        decreasing++;
      }

    } catch {}
  }

  if (
    comparable >= 2 &&
    increasing > decreasing
  ) {
    score += 25;

    reasons.push(
      `${increasing} tracked top wallets increased balances`
    );
  }

  if (
    comparable >= 2 &&
    decreasing > increasing
  ) {
    score -= 20;

    reasons.push(
      `${decreasing} tracked top wallets reduced balances`
    );
  }

  let flow =
    "MIXED";

  let accumulation =
    "NO_CLEAR_SIGNAL";

  let distribution =
    "NO_CLEAR_SIGNAL";

  if (
    increasing >= 2 &&
    increasing > decreasing
  ) {
    flow =
      "NET_ACCUMULATION";

    accumulation =
      "OBSERVED";

    distribution =
      "NOT_OBSERVED";
  }

  if (
    decreasing >= 2 &&
    decreasing > increasing
  ) {
    flow =
      "NET_DISTRIBUTION";

    accumulation =
      "NOT_OBSERVED";

    distribution =
      "OBSERVED";
  }

  return {
    verified:
      comparable > 0,

    flow,

    accumulation,

    distribution,

    concentrationTrend,

    trackedWallets:
      comparable,

    increasingWallets:
      increasing,

    decreasingWallets:
      decreasing,

    score:
      clamp(
        score,
        -50,
        50
      ),

    reasons
  };
}


/* =========================================================
   MOMENTUM
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
      historyAgeMinutes:
        null,
      positiveSignals: 0,
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

  const historyAgeMs =
    Date.now() -
    safeNumber(
      previous.timestamp
    );

  const historyAgeMinutes =
    historyAgeMs /
    60000;

  if (
    historyAgeMs <
    MOMENTUM_MIN_HISTORY_MS
  ) {
    return {
      verified: false,
      score: 0,
      label:
        "BUILDING_HISTORY",
      historyAgeMinutes,
      positiveSignals: 0,
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
        "Historical snapshot too recent"
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
      `Transfer acceleration ${transferGrowth.toFixed(1)}%`
    );
  }

  if (
    liquidityGrowth !== null
  ) {
    if (
      liquidityGrowth >= 20
    ) {
      score += 18;

      reasons.push(
        `Liquidity acceleration ${liquidityGrowth.toFixed(1)}%`
      );

    } else if (
      liquidityGrowth >= 5
    ) {
      score += 10;

      reasons.push(
        `Liquidity growth ${liquidityGrowth.toFixed(1)}%`
      );

    } else if (
      liquidityGrowth <= -20
    ) {
      score -= 20;

      reasons.push(
        `Liquidity falling ${liquidityGrowth.toFixed(1)}%`
      );
    }
  }

  if (
    volumeGrowth !== null
  ) {
    if (
      volumeGrowth >= 100
    ) {
      score += 22;

    } else if (
      volumeGrowth >= 30
    ) {
      score += 16;

    } else if (
      volumeGrowth >= 10
    ) {
      score += 10;

    } else if (
      volumeGrowth > 0
    ) {
      score += 5;
    }

    if (volumeGrowth > 0) {
      reasons.push(
        `Volume acceleration ${volumeGrowth.toFixed(1)}%`
      );
    }
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

  const buyPressure =
    market?.buyPressure1h;

  if (
    buyPressure !== null &&
    buyPressure >= 70
  ) {
    score += 12;
    reasons.push(
      "Very strong buy pressure"
    );

  } else if (
    buyPressure !== null &&
    buyPressure >= 60
  ) {
    score += 7;
    reasons.push(
      "Positive buy pressure"
    );
  }

  let positiveSignals = 0;

  if (
    holderGrowth !== null &&
    holderGrowth > 0
  ) {
    positiveSignals++;
  }

  if (
    liquidityGrowth !== null &&
    liquidityGrowth > 0
  ) {
    positiveSignals++;
  }

  if (
    volumeGrowth !== null &&
    volumeGrowth > 0
  ) {
    positiveSignals++;
  }

  if (
    transactionGrowth !== null &&
    transactionGrowth > 0
  ) {
    positiveSignals++;
  }

  if (
    buyPressure !== null &&
    buyPressure >= 60
  ) {
    positiveSignals++;
  }

  if (positiveSignals >= 4) {
    score += 10;

    reasons.push(
      "Multi-signal momentum confirmation"
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

    historyAgeMinutes,
    positiveSignals,

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
   MARKET QUALITY
   ========================================================= */

function marketQuality(
  market
) {
  if (!market?.verified) {
    return {
      verified: false,
      score: 0,
      liquidityMarketCapRatio:
        null,
      volumeLiquidityRatio:
        null,
      pairAgeMinutes:
        null,
      reasons: []
    };
  }

  let score = 0;
  const reasons = [];

  const liquidity =
    safeNumber(
      market.liquidityUsd
    );

  const marketCap =
    safeNumber(
      market.marketCap
    );

  const volume24 =
    safeNumber(
      market.volume?.h24
    );

  let liquidityMarketCapRatio =
    null;

  if (
    liquidity > 0 &&
    marketCap > 0
  ) {
    liquidityMarketCapRatio =
      liquidity /
      marketCap *
      100;

    if (
      liquidityMarketCapRatio >= 10 &&
      liquidityMarketCapRatio <= 60
    ) {
      score += 20;

      reasons.push(
        "Healthy liquidity/market-cap ratio"
      );

    } else if (
      liquidityMarketCapRatio >= 5
    ) {
      score += 10;
    }

    if (
      liquidityMarketCapRatio < 2
    ) {
      score -= 15;

      reasons.push(
        "Weak liquidity relative to market cap"
      );
    }
  }

  let volumeLiquidityRatio =
    null;

  if (
    volume24 > 0 &&
    liquidity > 0
  ) {
    volumeLiquidityRatio =
      volume24 /
      liquidity;

    if (
      volumeLiquidityRatio >= 1
    ) {
      score += 15;

      reasons.push(
        "Strong volume relative to liquidity"
      );

    } else if (
      volumeLiquidityRatio >= 0.25
    ) {
      score += 8;
    }
  }

  let pairAgeMinutes =
    null;

  if (
    safeNumber(
      market.pairCreatedAt
    ) > 0
  ) {
    pairAgeMinutes =
      Math.max(
        0,
        (
          Date.now() -
          safeNumber(
            market.pairCreatedAt
          )
        ) /
        60000
      );

    const pairAgeMs =
      pairAgeMinutes *
      60000;

    if (
      pairAgeMs <=
      VERY_EARLY_PAIR_AGE_MS
    ) {
      score += 20;

      reasons.push(
        "Very early launch"
      );

    } else if (
      pairAgeMs <=
      MAX_PAIR_AGE_EARLY_MS
    ) {
      score += 10;

      reasons.push(
        "Early-stage pair"
      );
    }
  }

  if (
    market.buyPressure1h !==
      null &&
    market.buyPressure1h >= 60
  ) {
    score += 10;

    reasons.push(
      "Positive market buy pressure"
    );
  }

  return {
    verified: true,

    score:
      clamp(
        score,
        0,
        100
      ),

    liquidityMarketCapRatio,
    volumeLiquidityRatio,
    pairAgeMinutes,
    reasons
  };
}


/* =========================================================
   RISK
   ========================================================= */

function scoreRisk(
  token,
  market,
  holders,
  activity,
  whaleFlow
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
      whale.top1Percent !==
        null &&
      whale.top1Percent > 40
    ) {
      score += 15;

      reasons.push(
        "Extreme top-holder concentration"
      );
    }
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_DISTRIBUTION"
  ) {
    score += 10;

    reasons.push(
      "Observed whale distribution"
    );
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


/* =========================================================
   OPPORTUNITY
   ========================================================= */

function scoreOpportunity(
  token,
  market,
  holders,
  activity,
  momentum,
  quality,
  whaleFlow
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

  if (momentum?.verified) {
    if (
      momentum.score >= 75
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

  if (quality?.verified) {
    if (
      quality.score >= 40
    ) {
      score += 10;

      reasons.push(
        "Strong market structure"
      );

    } else if (
      quality.score >= 20
    ) {
      score += 5;

      reasons.push(
        "Positive market structure"
      );
    }
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_ACCUMULATION"
  ) {
    score += 10;

    reasons.push(
      "Observed whale accumulation"
    );
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_DISTRIBUTION"
  ) {
    score -= 10;

    reasons.push(
      "Observed whale distribution"
    );
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
   CONFIDENCE
   ========================================================= */

function candidateConfidence(
  candidate
) {
  let score = 0;
  const reasons = [];

  if (candidate.validERC20) {
    score += 15;
  }

  if (
    candidate.market?.verified
  ) {
    score += 20;
    reasons.push(
      "Market data verified"
    );
  }

  if (
    candidate.holders?.verified
  ) {
    score += 15;
    reasons.push(
      "Holder data verified"
    );
  }

  if (
    candidate.activity
      ?.poolSpecific
  ) {
    score += 10;
  }

  if (
    candidate.activity
      ?.swaps > 0
  ) {
    score += 10;

    reasons.push(
      "Pool-specific swaps verified"
    );
  }

  if (
    candidate.momentum
      ?.verified &&
    safeNumber(
      candidate.momentum
        ?.historyAgeMinutes
    ) >= 5
  ) {
    score += 15;

    reasons.push(
      "Historical momentum verified"
    );
  }

  if (
    candidate.marketQuality
      ?.verified
  ) {
    score += 10;
  }

  if (
    candidate.holders
      ?.whale
      ?.verified
  ) {
    score += 5;
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    label:
      score >= 80
        ? "HIGH"
        : score >= 55
          ? "MEDIUM"
          : "LOW",

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

  const metadataSymbol =
    watched.metadata
      ?.symbol;

  if (
    knownQuoteMetadata(
      watched.address,
      metadataSymbol
    )
  ) {
    score -= 2000;
  }

  const lastChecked =
    safeNumber(
      watched.lastCheckedAt
    );

  if (!lastChecked) {
    score += 500;
  } else {
    score +=
      Math.min(
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
        watched.pools
          ?.length ||
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
    safeNumber(
      candidate.confidence
        ?.score
    ) <
    MIN_CONFIDENCE_ALERT
  ) {
    return {
      sent: false,
      reason:
        "CONFIDENCE_TOO_LOW"
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
    candidate.holders
      ?.whale;

  const flow =
    candidate.whaleFlow;

  const message =
`🚨 Robinhood Chain Meme Hunter V76

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🚀 Momentum: ${candidate.momentum?.score ?? 0}/100 (${candidate.momentum?.label || "UNVERIFIED"})
🔎 Confidence: ${candidate.confidence?.score ?? 0}/100 (${candidate.confidence?.label || "LOW"})
🧪 Market Quality: ${candidate.marketQuality?.score ?? 0}/100
🛡 Rug Risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

💰 Market Cap: ${money(candidate.market.marketCap)}
💧 Liquidity: ${money(candidate.market.liquidityUsd)}
📊 24h Volume: ${money(candidate.market.volume?.h24)}

🟢 1h Buys: ${candidate.market.transactions?.h1?.buys ?? "UNVERIFIED"}
🔴 1h Sells: ${candidate.market.transactions?.h1?.sells ?? "UNVERIFIED"}

👥 Holders: ${candidate.holders?.holderCount ?? "UNVERIFIED"}

🐋 Whale wallets: ${whale?.whaleCount ?? "UNVERIFIED"}
🐋 Top holder: ${Number.isFinite(whale?.top1Percent) ? whale.top1Percent.toFixed(2) + "%" : "UNVERIFIED"}
🐋 Top 10: ${Number.isFinite(whale?.top10Percent) ? whale.top10Percent.toFixed(2) + "%" : "UNVERIFIED"}
🐋 Concentration: ${whale?.concentrationRisk ?? "UNVERIFIED"}

🐋 Whale Flow: ${flow?.flow || "BUILDING_HISTORY"}
📥 Accumulation: ${flow?.accumulation || "NOT_VERIFIED"}
📤 Distribution: ${flow?.distribution || "NOT_VERIFIED"}
📊 Concentration Trend: ${flow?.concentrationTrend || "NOT_VERIFIED"}

🧠 Smart-money candidate: ${whale?.smartMoneyCandidate ? "YES" : "NO"}
🧠 Smart-money identity verified: NO

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
  const started =
    Date.now();

  const budget =
    createBudget();

  const stateResult =
    await readState(env);

  const state =
    stateResult.state;

  const persistence =
    persistenceHealth(
      stateResult
    );

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
    stateResult.persistent &&
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

  if (to > latestNumber) {
    to = latestNumber;
  }

  const upToDate =
    from > latestNumber;

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
      discoveryBudgetAvailable(
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
        failedRange = {
          fromBlock:
            Number(cursor),

          toBlock:
            Number(end),

          error:
            result.analysisBudgetReserved
              ? "ANALYSIS_BUDGET_RESERVED"
              : result.budgetExhausted
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

    /*
     * If the outer loop stopped because the V76 discovery
     * allocation was reached, explicitly report it.
     */
    if (
      !failedRange &&
      cursor <= to &&
      !discoveryBudgetAvailable(
        budget,
        3
      )
    ) {
      failedRange = {
        fromBlock:
          Number(cursor),

        toBlock:
          Number(to),

        error:
          "ANALYSIS_BUDGET_RESERVED"
      };
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
      .map(
        decodeInitialize
      )
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
          ZERO ||
        knownQuote(address)
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
      .filter(
        watched =>
          !knownQuoteMetadata(
            watched.address,
            watched.metadata
              ?.symbol
          )
      )
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
    if (
      !budgetAvailable(
        budget,
        5
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
      token.validERC20 &&
      !infrastructure
    ) {
      verified.push({
        watched,
        token
      });
    }
  }

  verified.sort(
    (a, b) =>
      watchPriority(
        b.watched
      ) -
      watchPriority(
        a.watched
      )
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
      token
    } = item;

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
      getMomentumSnapshot(
        state,
        watched.address
      );

    const momentum =
      momentumAnalysis(
        previousSnapshot,
        market,
        holders
      );

    const quality =
      marketQuality(
        market
      );

    const whaleFlow =
      analyseWhaleFlow(
        previousSnapshot,
        holders
      );

    if (holders?.whale) {
      holders.whale.flow =
        whaleFlow.flow;

      holders.whale.accumulation =
        whaleFlow.accumulation;

      holders.whale.distribution =
        whaleFlow.distribution;

      if (
        whaleFlow.flow ===
        "NET_ACCUMULATION"
      ) {
        holders.whale
          .smartMoneyScore =
          clamp(
            safeNumber(
              holders.whale
                .smartMoneyScore
            ) + 20,
            0,
            100
          );
      }

      holders.whale
        .smartMoneyCandidate =
        holders.whale
          .smartMoneyScore >= 55;
    }

    const rugRisk =
      scoreRisk(
        token,
        market,
        holders,
        activity,
        whaleFlow
      );

    const opportunity =
      scoreOpportunity(
        token,
        market,
        holders,
        activity,
        momentum,
        quality,
        whaleFlow
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

      whaleFlow,

      momentum,

      marketQuality:
        quality,

      rugRisk,

      opportunity
    };

    candidate.confidence =
      candidateConfidence(
        candidate
      );

    analysed.push(
      candidate
    );

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

      const confidenceDiff =
        b.confidence.score -
        a.confidence.score;

      if (confidenceDiff) {
        return confidenceDiff;
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
          MIN_ALERT_SCORE &&

        candidate.confidence
          ?.score >=
          MIN_CONFIDENCE_ALERT
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
            BigInt(
              currentLast
            )
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

  const scanStatus =
    failedRange
      ? (
          failedRange.error ===
            "ANALYSIS_BUDGET_RESERVED"
            ? "CATCHUP_PAUSED_FOR_ANALYSIS"

            : failedRange.error ===
                "REQUEST_BUDGET_EXHAUSTED"
              ? "BUDGET_LIMIT_REACHED"

              : "PARTIAL"
        )
      : "OK";

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      (
        !failedRange ||

        failedRange.error ===
          "REQUEST_BUDGET_EXHAUSTED" ||

        failedRange.error ===
          "ANALYSIS_BUDGET_RESERVED"
      ),

    scan: {
      status:
        scanStatus,

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

        healthy:
          persistence.healthy,

        status:
          persistence.status,

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

        discoveryLimit:
          MAX_DISCOVERY_REQUESTS,

        reservedForAnalysis:
          RESERVED_ANALYSIS_REQUESTS,

        analysisBudgetProtected:
          true,

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
        validationResults
          .length,

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
          "ENABLED_V76",

        failedRangeProtection:
          "ENABLED",

        requestBudget:
          "PARTITIONED_V76",

        analysisBudgetProtection:
          "ENABLED_V76",

        infrastructureFiltering:
          "ENABLED_V76",

        candidateRotation:
          "ENABLED_V76",

        poolSpecificActivity:
          "ENABLED",

        historicalSnapshots:
          "ENABLED_V76",

        momentumSnapshotAgeProtection:
          "ENABLED_V76",

        holderGrowth:
          "ENABLED_V76",

        liquidityGrowth:
          "ENABLED_V76",

        volumeAcceleration:
          "ENABLED_V76",

        transactionAcceleration:
          "ENABLED_V76",

        momentumScoring:
          "ENABLED_V76",

        multiSignalConfirmation:
          "ENABLED_V76",

        earlyLaunchDetection:
          "ENABLED_V76",

        marketQuality:
          "ENABLED_V76",

        candidateConfidence:
          "ENABLED_V76",

        whaleConcentration:
          "ENABLED",

        whaleFlow:
          "OBSERVED_BALANCE_CHANGE_V76",

        whaleAccumulation:
          "ENABLED_V76",

        whaleDistribution:
          "ENABLED_V76",

        concentrationTrend:
          "ENABLED_V76",

        smartMoney:
          "BEHAVIOUR_CANDIDATE_SCORING_V76",

        smartMoneyVerified:
          false,

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V76_BUDGET_PROTECTED_EARLY_MOMENTUM_WHALE_FLOW_HUNTER"
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

  const persistence =
    persistenceHealth(
      stateResult
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

      healthy:
        persistence.healthy,

      status:
        persistence.status,

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

      minimumConfidence:
        MIN_CONFIDENCE_ALERT,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY
    },

    budget: {
      totalRequests:
        MAX_EXTERNAL_REQUESTS,

      discoveryLimit:
        MAX_DISCOVERY_REQUESTS,

      reservedAnalysisRequests:
        RESERVED_ANALYSIS_REQUESTS,

      analysisBudgetProtection:
        true
    },

    architecture:
      "V76_BUDGET_PROTECTED_EARLY_MOMENTUM_WHALE_FLOW_HUNTER",

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

  const persistence =
    persistenceHealth(
      result
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    persistenceConfigured:
      result.persistent,

    persistenceHealthy:
      persistence.healthy,

    persistenceStatus:
      persistence.status,

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

  const persistence =
    persistenceHealth(
      stateResult
    );

  checks.kv = {
    success:
      persistence.healthy,

    configured:
      stateResult.persistent,

    healthy:
      persistence.healthy,

    status:
      persistence.status,

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
      ),

    botTokenConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN
      ),

    chatIdConfigured:
      Boolean(
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

  checks.v76 = {
    adaptiveCatchup: true,

    requestBudget: true,

    partitionedRequestBudget:
      true,

    discoveryRequestLimit:
      MAX_DISCOVERY_REQUESTS,

    reservedAnalysisRequests:
      RESERVED_ANALYSIS_REQUESTS,

    analysisBudgetProtection:
      true,

    infrastructureFiltering:
      true,

    momentumHistory:
      true,

    snapshotAgeProtection:
      true,

    earlyLaunchDetection:
      true,

    marketQuality:
      true,

    candidateConfidence:
      true,

    whaleFlowHistory:
      true,

    whaleAccumulationDetection:
      true,

    whaleDistributionDetection:
      true,

    concentrationTrend:
      true,

    smartMoneyBehaviourScoring:
      true,

    knownSmartMoneyIdentityVerification:
      false
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
        ? (
            checks.kv.configured
              ? "READY"
              : "READY_WITH_KV_FIX_REQUIRED"
          )
        : "DEGRADED",

    checks,

    requiredFixes: [
      ...(
        !checks.kv.configured
          ? [
              "RESTORE_KV_BINDING_MEME_HUNTER_STATE"
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
      "V76_BUDGET_PROTECTED_EARLY_MOMENTUM_WHALE_FLOW_HUNTER",

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
   RUN ALL
   ========================================================= */

async function runAll(env) {
  const started =
    Date.now();

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
        await telegramTest(
          env
        ),

      note:
        "V76 /run-all keeps duplicate network tests disabled. Use /diagnostics and /rpc-test separately."
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
                "V76_SCHEDULED_SCAN",

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

              persistenceHealthy:
                result.scan
                  ?.persistence
                  ?.healthy,

              requestsUsed:
                result.scan
                  ?.requestBudget
                  ?.used,

              analysisBudgetProtected:
                result.scan
                  ?.requestBudget
                  ?.analysisBudgetProtected,

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
            "V76 scheduled scan failed",
            error
          );

          throw error;
        })
    );
  }
};
