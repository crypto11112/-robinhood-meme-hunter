/**
 * Robinhood Chain Meme Hunter
 * V81
 *
 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER
 *
 * V81:
 * - Preserves V80 live-first architecture
 * - Preserves existing KV state key
 * - Fixes impossible holder concentration calculations
 * - Rejects holder totals > total supply
 * - Separates holder counters from concentration verification
 * - Prevents corrupt holder data affecting risk/smart-money/whale flow
 * - True live-first scanning
 * - Persistent historical catch-up
 * - Uniswap V4 discovery
 * - ERC20 verification
 * - DexScreener intelligence
 * - Blockscout intelligence
 * - Momentum snapshots
 * - Whale flow
 * - Candidate scoring
 * - Telegram alerts
 * - Hard request-budget isolation
 */

const VERSION = "V81";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";
const ALCHEMY_BASE = "https://robinhood-mainnet.g.alchemy.com/v2/";
const DEXSCREENER_BASE = "https://api.dexscreener.com";
const BLOCKSCOUT = "https://robinhoodchain.blockscout.com";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

/*
 * IMPORTANT:
 * Preserve existing V69-V80 state.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

/* =========================================================
   KNOWN INFRASTRUCTURE / QUOTES
   ========================================================= */

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

/* =========================================================
   UNISWAP V4 TOPICS
   ========================================================= */

const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/* =========================================================
   SCANNING
   ========================================================= */

const LIVE_SCAN_BLOCKS = 20;
const CATCHUP_TARGET_BLOCKS = 2000;
const MIN_LOG_RANGE = 10;

/* =========================================================
   HARD REQUEST BUDGET
   ========================================================= */

const MAX_EXTERNAL_REQUESTS = 42;
const SYSTEM_REQUEST_LIMIT = 2;
const DISCOVERY_REQUEST_LIMIT = 22;
const LIVE_DISCOVERY_REQUEST_LIMIT = 8;
const BACKLOG_DISCOVERY_REQUEST_LIMIT = 14;
const ANALYSIS_REQUEST_LIMIT = 18;

/* =========================================================
   ANALYSIS
   ========================================================= */

const MAX_TOKEN_CHECKS = 4;
const METADATA_REUSE_MS = 30 * 60 * 1000;

/* =========================================================
   WATCHLIST
   ========================================================= */

const WATCH_MAX_AGE = 12 * 60 * 60 * 1000;
const MAX_WATCHED_TOKENS = 50;

/* =========================================================
   TELEGRAM
   ========================================================= */

const ALERT_COOLDOWN = 6 * 60 * 60 * 1000;
const MIN_ALERT_SCORE = 60;
const MAX_ALERT_RISK = 59;
const MIN_ALERT_LIQUIDITY = 1000;
const MIN_CONFIDENCE_ALERT = 55;

/* =========================================================
   SNAPSHOTS
   ========================================================= */

const MAX_SNAPSHOTS_PER_TOKEN = 24;
const SNAPSHOT_MAX_AGE = 24 * 60 * 60 * 1000;
const MIN_SNAPSHOT_INTERVAL = 2 * 60 * 1000;
const MOMENTUM_MIN_HISTORY_MS = 5 * 60 * 1000;
const MOMENTUM_IDEAL_HISTORY_MS = 15 * 60 * 1000;

/* =========================================================
   HELPERS
   ========================================================= */

function now() {
  return new Date().toISOString();
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value) {
  return String(value || "").toLowerCase();
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

function errorString(error) {
  return String(error?.message || error || "UNKNOWN_ERROR");
}

function topicAddress(topic) {
  const value = String(topic || "");

  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    return null;
  }

  return ("0x" + value.slice(-40)).toLowerCase();
}

function knownQuote(address) {
  return KNOWN_QUOTES.has(normalize(address));
}

function knownQuoteMetadata(address, symbol) {
  if (knownQuote(address)) return true;

  return KNOWN_QUOTE_SYMBOLS.has(
    String(symbol || "").toUpperCase()
  );
}

function percentChange(previous, current) {
  const a = safeNumber(previous);
  const b = safeNumber(current);

  if (a <= 0) return null;

  return ((b - a) / a) * 100;
}

function uniqueBy(array, keyFunction) {
  const map = new Map();

  for (const item of array) {
    const key = keyFunction(item);
    if (!key) continue;
    map.set(key, item);
  }

  return Array.from(map.values());
}

function jsonResponse(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*"
      }
    }
  );
}

/* =========================================================
   REQUEST BUDGET
   ========================================================= */

function createBudget() {
  return {
    totalUsed: 0,
    totalLimit: MAX_EXTERNAL_REQUESTS,

    system: {
      used: 0,
      limit: SYSTEM_REQUEST_LIMIT
    },

    discovery: {
      used: 0,
      limit: DISCOVERY_REQUEST_LIMIT,
      liveUsed: 0,
      liveLimit: LIVE_DISCOVERY_REQUEST_LIMIT,
      backlogUsed: 0,
      backlogLimit: BACKLOG_DISCOVERY_REQUEST_LIMIT
    },

    analysis: {
      used: 0,
      limit: ANALYSIS_REQUEST_LIMIT
    },

    skipped: []
  };
}

function budgetAvailable(budget, phase, amount = 1) {
  if (budget.totalUsed + amount > budget.totalLimit) {
    return false;
  }

  if (phase === "system") {
    return budget.system.used + amount <= budget.system.limit;
  }

  if (phase === "analysis") {
    return budget.analysis.used + amount <= budget.analysis.limit;
  }

  if (phase === "discovery-live") {
    return (
      budget.discovery.used + amount <= budget.discovery.limit &&
      budget.discovery.liveUsed + amount <= budget.discovery.liveLimit
    );
  }

  if (phase === "discovery-backlog") {
    return (
      budget.discovery.used + amount <= budget.discovery.limit &&
      budget.discovery.backlogUsed + amount <= budget.discovery.backlogLimit
    );
  }

  return false;
}

function consumeBudget(budget, phase, type, amount = 1) {
  if (!budgetAvailable(budget, phase, amount)) {
    budget.skipped.push({
      phase,
      type,
      amount,
      reason: "PHASE_BUDGET_EXHAUSTED"
    });

    return false;
  }

  budget.totalUsed += amount;

  if (phase === "system") {
    budget.system.used += amount;
  } else if (phase === "analysis") {
    budget.analysis.used += amount;
  } else if (phase === "discovery-live") {
    budget.discovery.used += amount;
    budget.discovery.liveUsed += amount;
  } else if (phase === "discovery-backlog") {
    budget.discovery.used += amount;
    budget.discovery.backlogUsed += amount;
  }

  return true;
}

function budgetTelemetry(budget) {
  return {
    used: budget.totalUsed,
    limit: budget.totalLimit,
    remaining: Math.max(0, budget.totalLimit - budget.totalUsed),

    system: {
      used: budget.system.used,
      limit: budget.system.limit,
      remaining: Math.max(
        0,
        budget.system.limit - budget.system.used
      )
    },

    discovery: {
      used: budget.discovery.used,
      limit: budget.discovery.limit,
      remaining: Math.max(
        0,
        budget.discovery.limit - budget.discovery.used
      ),

      live: {
        used: budget.discovery.liveUsed,
        limit: budget.discovery.liveLimit,
        remaining: Math.max(
          0,
          budget.discovery.liveLimit - budget.discovery.liveUsed
        )
      },

      backlog: {
        used: budget.discovery.backlogUsed,
        limit: budget.discovery.backlogLimit,
        remaining: Math.max(
          0,
          budget.discovery.backlogLimit - budget.discovery.backlogUsed
        )
      }
    },

    analysis: {
      used: budget.analysis.used,
      limit: budget.analysis.limit,
      remaining: Math.max(
        0,
        budget.analysis.limit - budget.analysis.used
      ),
      protected: true
    },

    hardPhaseIsolation: true,
    liveFirstIsolation: true,
    skipped: budget.skipped
  };
}

/* =========================================================
   KV STATE
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
    lastLiveScannedBlock: null,
    watchedTokens: [],
    alerts: {},
    snapshots: {},
    createdAt: now(),
    updatedAt: now()
  };
}

async function readState(env) {
  const { kv, binding } = getKV(env);

  if (!kv) {
    return {
      persistent: false,
      binding: null,
      state: newState(),
      error: null
    };
  }

  try {
    const raw = await kv.get(STATE_KEY);

    if (!raw) {
      return {
        persistent: true,
        binding,
        state: newState(),
        error: null
      };
    }

    const parsed = JSON.parse(raw);

    let watchedTokens = [];

    if (Array.isArray(parsed.watchedTokens)) {
      watchedTokens = parsed.watchedTokens;
    } else if (
      parsed.watchedTokens &&
      typeof parsed.watchedTokens === "object"
    ) {
      watchedTokens = Object.values(parsed.watchedTokens);
    }

    return {
      persistent: true,
      binding,

      state: {
        ...newState(),
        ...parsed,
        watchedTokens,

        alerts:
          parsed.alerts && typeof parsed.alerts === "object"
            ? parsed.alerts
            : {},

        snapshots:
          parsed.snapshots && typeof parsed.snapshots === "object"
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

async function writeState(env, state) {
  const { kv, binding } = getKV(env);

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

function pruneState(state) {
  const current = Date.now();

  state.watchedTokens =
    Array.isArray(state.watchedTokens)
      ? state.watchedTokens
      : [];

  state.watchedTokens = state.watchedTokens
    .filter(token => {
      const firstSeen = safeNumber(token.firstSeenAt);

      if (!firstSeen) return true;

      return current - firstSeen <= WATCH_MAX_AGE;
    })
    .slice(0, MAX_WATCHED_TOKENS);

  state.alerts =
    state.alerts && typeof state.alerts === "object"
      ? state.alerts
      : {};

  for (const [address, alert] of Object.entries(state.alerts)) {
    const timestamp =
      typeof alert === "object"
        ? safeNumber(alert.timestamp)
        : safeNumber(alert);

    if (
      timestamp &&
      current - timestamp > ALERT_COOLDOWN
    ) {
      delete state.alerts[address];
    }
  }

  state.snapshots =
    state.snapshots && typeof state.snapshots === "object"
      ? state.snapshots
      : {};

  for (const [address, snapshots] of Object.entries(state.snapshots)) {
    let list =
      Array.isArray(snapshots)
        ? snapshots
        : snapshots && typeof snapshots === "object"
          ? [snapshots]
          : [];

    list = list
      .filter(snapshot => {
        const timestamp = safeNumber(snapshot.timestamp);

        return (
          timestamp &&
          current - timestamp <= SNAPSHOT_MAX_AGE
        );
      })
      .slice(-MAX_SNAPSHOTS_PER_TOKEN);

    if (list.length) {
      state.snapshots[address] = list;
    } else {
      delete state.snapshots[address];
    }
  }
}

function findWatched(state, address) {
  const key = normalize(address);

  return state.watchedTokens.find(
    token => normalize(token.address) === key
  );
}

function addWatch(state, address, pool, source) {
  address = normalize(address);

  if (
    !isAddress(address) ||
    address === ZERO ||
    knownQuote(address)
  ) {
    return {
      added: false,
      token: null
    };
  }

  let token = findWatched(state, address);
  let added = false;

  if (!token) {
    token = {
      address,
      firstSeenAt: Date.now(),
      lastSeenAt: Date.now(),
      lastCheckedAt: null,
      checks: 0,
      pools: [],
      metadata: null,
      discoverySource: source || "UNKNOWN"
    };

    state.watchedTokens.push(token);
    added = true;
  }

  token.lastSeenAt = Date.now();

  if (source === "LIVE") {
    token.discoverySource = "LIVE";
    token.lastLiveSeenAt = Date.now();
  }

  token.pools =
    Array.isArray(token.pools)
      ? token.pools
      : [];

  if (pool) {
    const exists = token.pools.some(
      existing =>
        normalize(existing.poolId) === normalize(pool.poolId)
    );

    if (!exists) {
      token.pools.push(pool);
    }
  }

  return {
    added,
    token
  };
}

/* =========================================================
   RPC
   ========================================================= */

async function rpcCall(
  url,
  method,
  params,
  budget,
  phase
) {
  if (
    !consumeBudget(
      budget,
      phase,
      `RPC:${method}`
    )
  ) {
    throw new Error(
      `REQUEST_BUDGET_EXHAUSTED_${String(phase)
        .toUpperCase()
        .replace(/-/g, "_")}`
    );
  }

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    4500
  );

  try {
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
      }),

      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    const body = await response.json();

    if (body.error) {
      throw new Error(
        body.error.message || "RPC_ERROR"
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
  budget,
  phase
) {
  let publicError = null;

  try {
    const result = await rpcCall(
      PUBLIC_RPC,
      method,
      params,
      budget,
      phase
    );

    return {
      result,
      provider: "ROBINHOOD_PUBLIC_RPC",
      error: null
    };
  } catch (error) {
    publicError = errorString(error);

    if (
      publicError.startsWith(
        "REQUEST_BUDGET_EXHAUSTED"
      )
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

  if (!budgetAvailable(budget, phase, 1)) {
    return {
      result: null,
      provider: null,
      error: "REQUEST_BUDGET_EXHAUSTED"
    };
  }

  try {
    const result = await rpcCall(
      ALCHEMY_BASE + env.ALCHEMY_API_KEY,
      method,
      params,
      budget,
      phase
    );

    return {
      result,
      provider: "ALCHEMY",
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

async function latestBlock(env, budget) {
  const response = await rpc(
    env,
    "eth_blockNumber",
    [],
    budget,
    "system"
  );

  if (!response.result) {
    throw new Error(
      response.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return {
    block: BigInt(response.result),
    provider: response.provider
  };
}

async function getLogs(
  env,
  from,
  to,
  budget,
  phase
) {
  return rpc(
    env,
    "eth_getLogs",
    [{
      fromBlock:
        "0x" + from.toString(16),

      toBlock:
        "0x" + to.toString(16),

      address: POOL_MANAGER
    }],
    budget,
    phase
  );
}

/* =========================================================
   ADAPTIVE LOG SCANNER
   ========================================================= */

async function scanLogRange(
  env,
  from,
  to,
  budget,
  output,
  phase,
  depth = 0
) {
  if (
    phase !== "discovery-live" &&
    phase !== "discovery-backlog"
  ) {
    return {
      success: false,
      error: "INVALID_DISCOVERY_PHASE"
    };
  }

  if (!budgetAvailable(budget, phase)) {
    return {
      success: false,
      budgetExhausted: true,
      error: "DISCOVERY_BUDGET_EXHAUSTED"
    };
  }

  const response = await getLogs(
    env,
    from,
    to,
    budget,
    phase
  );

  if (Array.isArray(response.result)) {
    output.logs.push(...response.result);

    output.ranges.push({
      fromBlock: Number(from),
      toBlock: Number(to),
      logs: response.result.length,
      provider: response.provider,
      phase,
      splitDepth: depth
    });

    return {
      success: true,
      processedThrough: to
    };
  }

  if (
    String(response.error || "").includes(
      "REQUEST_BUDGET_EXHAUSTED"
    )
  ) {
    return {
      success: false,
      budgetExhausted: true,
      error: response.error
    };
  }

  const size = to - from + 1n;

  if (size > BigInt(MIN_LOG_RANGE)) {
    const middle =
      from + (to - from) / 2n;

    const left = await scanLogRange(
      env,
      from,
      middle,
      budget,
      output,
      phase,
      depth + 1
    );

    if (!left.success) {
      return left;
    }

    const right = await scanLogRange(
      env,
      middle + 1n,
      to,
      budget,
      output,
      phase,
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

    error:
      response.error ||
      "GET_LOGS_FAILED",

    failedRange: {
      fromBlock: Number(from),
      toBlock: Number(to),
      error:
        response.error ||
        "GET_LOGS_FAILED"
    }
  };
}

/* =========================================================
   V4 DECODING
   ========================================================= */

function decodeInitialize(log) {
  if (
    normalize(log?.topics?.[0]) !==
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
    topicAddress(log.topics[2]);

  const currency1 =
    topicAddress(log.topics[3]);

  if (!currency0 || !currency1) {
    return null;
  }

  return {
    poolId: normalize(log.topics[1]),
    currency0,
    currency1,
    blockNumber: log.blockNumber,
    transactionHash:
      log.transactionHash
  };
}

function processDiscoveryLogs(
  state,
  logs,
  source
) {
  const newTokens = new Set();
  const seenTokens = new Set();

  let initializeEvents = 0;
  let swapTopicMatches = 0;
  let liquidityTopicMatches = 0;

  for (const log of logs) {
    const topic0 =
      normalize(log?.topics?.[0]);

    if (topic0 === SWAP_TOPIC) {
      swapTopicMatches++;
    }

    if (
      topic0 === MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityTopicMatches++;
    }

    const pool = decodeInitialize(log);

    if (!pool) continue;

    initializeEvents++;

    for (const address of [
      pool.currency0,
      pool.currency1
    ]) {
      if (
        !isAddress(address) ||
        address === ZERO ||
        knownQuote(address)
      ) {
        continue;
      }

      const result = addWatch(
        state,
        address,
        pool,
        source
      );

      if (result.token) {
        seenTokens.add(
          normalize(address)
        );
      }

      if (result.added) {
        newTokens.add(
          normalize(address)
        );
      }
    }
  }

  return {
    rawLogs: logs.length,
    initializeEvents,
    swapTopicMatches,
    liquidityTopicMatches,
    newTokens,
    seenTokens
  };
}

function activityForToken(
  watched,
  logs
) {
  const poolIds = new Set(
    (watched.pools || [])
      .map(pool =>
        normalize(pool.poolId)
      )
      .filter(Boolean)
  );

  let swaps = 0;
  let liquidityEvents = 0;

  for (const log of logs) {
    const topic0 =
      normalize(log?.topics?.[0]);

    const poolId =
      normalize(log?.topics?.[1]);

    if (!poolIds.has(poolId)) {
      continue;
    }

    if (topic0 === SWAP_TOPIC) {
      swaps++;
    }

    if (
      topic0 === MODIFY_LIQUIDITY_TOPIC
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
   ERC20
   ========================================================= */

async function ethCall(
  env,
  token,
  data,
  budget
) {
  const response = await rpc(
    env,
    "eth_call",
    [{
      to: token,
      data
    }, "latest"],
    budget,
    "analysis"
  );

  if (!response.result) {
    throw new Error(
      response.error ||
      "ETH_CALL_FAILED"
    );
  }

  return response.result;
}

function decodeUint(hex) {
  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

function decodeBytes32String(hex) {
  try {
    const raw =
      String(hex || "")
        .replace(/^0x/, "");

    if (raw.length !== 64) {
      return null;
    }

    const bytes = new Uint8Array(
      (raw.match(/.{2}/g) || [])
        .map(value =>
          parseInt(value, 16)
        )
    );

    return (
      new TextDecoder()
        .decode(bytes)
        .replace(/\0/g, "")
        .trim() ||
      null
    );
  } catch {
    return null;
  }
}

function decodeString(hex) {
  try {
    const raw =
      String(hex || "")
        .replace(/^0x/, "");

    if (!raw) return null;

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
      offset < 0 ||
      offset + 64 > raw.length
    ) {
      return null;
    }

    const length = Number(
      BigInt(
        "0x" +
        raw.slice(
          offset,
          offset + 64
        )
      )
    );

    if (
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

    const bytes =
      new Uint8Array(
        (data.match(/.{2}/g) || [])
          .map(value =>
            parseInt(value, 16)
          )
      );

    return (
      new TextDecoder()
        .decode(bytes)
        .replace(/\0/g, "")
        .trim() ||
      null
    );
  } catch {
    return null;
  }
}

function reusableMetadata(watched) {
  const metadata =
    watched?.metadata;

  if (
    !metadata ||
    !metadata.validERC20
  ) {
    return null;
  }

  const verifiedAt =
    safeNumber(
      metadata.verifiedAt
    );

  if (
    !verifiedAt ||
    Date.now() - verifiedAt >
      METADATA_REUSE_MS
  ) {
    return null;
  }

  return {
    ...metadata,
    reused: true
  };
}

async function verifyERC20(
  env,
  address,
  budget,
  watched
) {
  const cached =
    reusableMetadata(watched);

  if (cached) {
    return cached;
  }

  if (
    !budgetAvailable(
      budget,
      "analysis",
      4
    )
  ) {
    return {
      validERC20: false,
      reason:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  const code = await rpc(
    env,
    "eth_getCode",
    [address, "latest"],
    budget,
    "analysis"
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
    name = decodeString(
      await ethCall(
        env,
        address,
        "0x06fdde03",
        budget
      )
    );
  } catch {}

  try {
    symbol = decodeString(
      await ethCall(
        env,
        address,
        "0x95d89b41",
        budget
      )
    );
  } catch {}

  try {
    const value = decodeUint(
      await ethCall(
        env,
        address,
        "0x313ce567",
        budget
      )
    );

    if (value !== null) {
      decimals = Number(value);
    }
  } catch {}

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    try {
      totalSupply = decodeUint(
        await ethCall(
          env,
          address,
          "0x18160ddd",
          budget
        )
      );
    } catch {}
  }

  const score =
    (name ? 1 : 0) +
    (symbol ? 1 : 0) +
    (Number.isFinite(decimals) ? 1 : 0) +
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
      decimals,
      totalSupply:
        totalSupply !== null
          ? totalSupply.toString()
          : null
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
        : null,

    verifiedAt: Date.now(),
    reused: false
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
      "analysis",
      "DEXSCREENER"
    )
  ) {
    return {
      verified: false,
      status:
        "ANALYSIS_BUDGET_PROTECTED"
    };
  }

  try {
    const response = await fetch(
      `${DEXSCREENER_BASE}/token-pairs/v1/robinhood/${token}`,
      {
        headers: {
          accept: "application/json"
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
        status: "NO_MARKET_FOUND"
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

    const pair = pairs[0];

    const buys =
      safeNumber(
        pair?.txns?.h1?.buys
      );

    const sells =
      safeNumber(
        pair?.txns?.h1?.sells
      );

    const transactions =
      buys + sells;

    return {
      verified: true,
      status: "VERIFIED",

      pairAddress:
        pair?.pairAddress || null,

      url:
        pair?.url || null,

      priceUsd:
        pair?.priceUsd || null,

      liquidityUsd:
        safeNumber(
          pair?.liquidity?.usd
        ),

      marketCap:
        safeNumber(
          pair?.marketCap
        ) || null,

      fdv:
        safeNumber(
          pair?.fdv
        ) || null,

      volume: {
        m5:
          safeNumber(
            pair?.volume?.m5
          ),

        h1:
          safeNumber(
            pair?.volume?.h1
          ),

        h24:
          safeNumber(
            pair?.volume?.h24
          )
      },

      transactions: {
        h1: {
          buys,
          sells
        }
      },

      buyPressure1h:
        transactions > 0
          ? buys /
            transactions *
            100
          : null,

      pairCreatedAt:
        safeNumber(
          pair?.pairCreatedAt
        ) || null
    };
  } catch (error) {
    return {
      verified: false,
      status: "DEXSCREENER_ERROR",
      error: errorString(error)
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
      "analysis",
      "BLOCKSCOUT"
    )
  ) {
    return null;
  }

  try {
    const response = await fetch(
      BLOCKSCOUT + path,
      {
        headers: {
          accept: "application/json"
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

/*
 * V81 HOLDER INTEGRITY
 */

function holderPercent(
  value,
  supply
) {
  try {
    const held =
      BigInt(String(value));

    const total =
      BigInt(String(supply));

    if (
      held < 0n ||
      total <= 0n ||
      held > total
    ) {
      return null;
    }

    const percentage =
      Number(
        held *
        100000000n /
        total
      ) /
      1000000;

    if (
      !Number.isFinite(
        percentage
      ) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return null;
    }

    return percentage;
  } catch {
    return null;
  }
}

function extractHolderAddress(item) {
  if (
    typeof item?.address === "string"
  ) {
    return item.address;
  }

  if (
    typeof item?.address?.hash === "string"
  ) {
    return item.address.hash;
  }

  if (
    typeof item?.address_hash === "string"
  ) {
    return item.address_hash;
  }

  return null;
}

function validateHolderIntegrity(
  rawHolders,
  totalSupply
) {
  let supply;

  try {
    supply =
      BigInt(
        String(totalSupply)
      );
  } catch {
    return {
      verified: false,
      status:
        "INVALID_TOTAL_SUPPLY",
      impossibleBalanceCount: 0,
      percentageSum: null,
      supply:
        String(totalSupply || ""),
      topHolderBalanceSum: null
    };
  }

  if (supply <= 0n) {
    return {
      verified: false,
      status:
        "INVALID_TOTAL_SUPPLY",
      impossibleBalanceCount: 0,
      percentageSum: null,
      supply: supply.toString(),
      topHolderBalanceSum: null
    };
  }

  let balanceSum = 0n;
  let impossibleBalanceCount = 0;

  for (const item of rawHolders) {
    try {
      const value =
        BigInt(
          String(
            item?.value ||
            item?.token?.value ||
            "0"
          )
        );

      if (
        value < 0n ||
        value > supply
      ) {
        impossibleBalanceCount++;
        continue;
      }

      balanceSum += value;
    } catch {
      impossibleBalanceCount++;
    }
  }

  const percentageSum =
    Number(
      balanceSum *
      100000000n /
      supply
    ) /
    1000000;

  if (impossibleBalanceCount > 0) {
    return {
      verified: false,
      status:
        "IMPOSSIBLE_HOLDER_BALANCE",
      impossibleBalanceCount,
      percentageSum,
      supply: supply.toString(),
      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  if (
    balanceSum > supply ||
    percentageSum > 100.000001
  ) {
    return {
      verified: false,
      status:
        "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY",
      impossibleBalanceCount,
      percentageSum,
      supply: supply.toString(),
      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  return {
    verified: true,
    status: "VERIFIED",
    impossibleBalanceCount: 0,
    percentageSum,
    supply: supply.toString(),
    topHolderBalanceSum:
      balanceSum.toString()
  };
}

function unverifiedHolders(
  reason = "NOT_VERIFIED"
) {
  return {
    verified: false,
    countersVerified: false,
    concentrationVerified: false,

    integrity: {
      verified: false,
      status: reason,
      impossibleBalanceCount: 0,
      percentageSum: null,
      supply: null,
      topHolderBalanceSum: null
    },

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
      smartMoneyScore: 0,
      smartMoneyCandidate: false
    }
  };
}

async function holderIntelligence(
  token,
  totalSupply,
  budget
) {
  if (
    !totalSupply ||
    !budgetAvailable(
      budget,
      "analysis",
      2
    )
  ) {
    return unverifiedHolders(
      "ANALYSIS_BUDGET_OR_SUPPLY_UNAVAILABLE"
    );
  }

  const counters =
    await blockscout(
      `/api/v2/tokens/${token}/counters`,
      budget
    );

  if (!counters) {
    return unverifiedHolders(
      "BLOCKSCOUT_COUNTERS_UNAVAILABLE"
    );
  }

  const holderCount =
    safeNumber(
      counters?.token_holders_count ??
      counters?.holders_count
    );

  const transferCount =
    safeNumber(
      counters?.transfers_count ??
      counters?.token_transfers_count
    );

  const holders =
    await blockscout(
      `/api/v2/tokens/${token}/holders`,
      budget
    );

  if (
    !holders ||
    !Array.isArray(holders.items)
  ) {
    return {
      verified: true,
      countersVerified: true,
      concentrationVerified: false,

      integrity: {
        verified: false,
        status:
          "BLOCKSCOUT_HOLDERS_UNAVAILABLE",
        impossibleBalanceCount: 0,
        percentageSum: null,
        supply: String(totalSupply),
        topHolderBalanceSum: null
      },

      holderCount,
      transferCount,
      topHolders: [],

      whale: {
        verified: false,
        whaleCount: null,
        top1Percent: null,
        top5Percent: null,
        top10Percent: null,
        concentrationRisk:
          "UNVERIFIED",
        smartMoneyScore: 0,
        smartMoneyCandidate: false
      }
    };
  }

  const items =
    holders.items.slice(0, 10);

  const integrity =
    validateHolderIntegrity(
      items,
      totalSupply
    );

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
          extractHolderAddress(item),

        value,

        percentage:
          holderPercent(
            value,
            totalSupply
          )
      };
    });

  if (!integrity.verified) {
    return {
      verified: true,
      countersVerified: true,
      concentrationVerified: false,
      integrity,
      holderCount,
      transferCount,

      topHolders:
        topHolders.map(
          holder => ({
            ...holder,
            percentage: null
          })
        ),

      whale: {
        verified: false,
        whaleCount: null,
        top1Percent: null,
        top5Percent: null,
        top10Percent: null,
        concentrationRisk:
          "UNVERIFIED",
        smartMoneyScore: 0,
        smartMoneyCandidate: false,
        reason: integrity.status
      }
    };
  }

  const percentages =
    topHolders
      .map(holder =>
        holder.percentage
      )
      .filter(value =>
        Number.isFinite(value) &&
        value >= 0 &&
        value <= 100
      );

  const top1 =
    percentages.length
      ? percentages[0]
      : null;

  const top5 =
    percentages
      .slice(0, 5)
      .reduce(
        (a, b) => a + b,
        0
      );

  const top10 =
    percentages
      .slice(0, 10)
      .reduce(
        (a, b) => a + b,
        0
      );

  if (
    top5 > 100.000001 ||
    top10 > 100.000001
  ) {
    return {
      verified: true,
      countersVerified: true,
      concentrationVerified: false,

      integrity: {
        ...integrity,
        verified: false,
        status:
          "PERCENTAGE_SUM_EXCEEDS_100",
        percentageSum: top10
      },

      holderCount,
      transferCount,

      topHolders:
        topHolders.map(
          holder => ({
            ...holder,
            percentage: null
          })
        ),

      whale: {
        verified: false,
        whaleCount: null,
        top1Percent: null,
        top5Percent: null,
        top10Percent: null,
        concentrationRisk:
          "UNVERIFIED",
        smartMoneyScore: 0,
        smartMoneyCandidate: false,
        reason:
          "PERCENTAGE_SUM_EXCEEDS_100"
      }
    };
  }

  const whales =
    topHolders.filter(
      holder =>
        holder.percentage !== null &&
        holder.percentage >= 1
    );

  let concentrationRisk = "LOW";

  if (
    (
      top1 !== null &&
      top1 >= 20
    ) ||
    top10 >= 80
  ) {
    concentrationRisk = "HIGH";
  } else if (
    (
      top1 !== null &&
      top1 >= 10
    ) ||
    top10 >= 60
  ) {
    concentrationRisk = "MEDIUM";
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

  if (
    concentrationRisk === "HIGH"
  ) {
    smartMoneyScore =
      Math.min(
        smartMoneyScore,
        25
      );
  }

  smartMoneyScore =
    clamp(
      smartMoneyScore,
      0,
      100
    );

  return {
    verified: true,
    countersVerified: true,
    concentrationVerified: true,
    integrity,
    holderCount,
    transferCount,
    topHolders,

    whale: {
      verified: true,
      whaleCount: whales.length,
      top1Percent: top1,
      top5Percent: top5,
      top10Percent: top10,
      concentrationRisk,
      smartMoneyScore,
      smartMoneyCandidate:
        smartMoneyScore >= 55
    }
  };
}

/* =========================================================
   SNAPSHOTS
   ========================================================= */

function getHistoricalSnapshot(
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

  const current = Date.now();

  for (
    let i = snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i].timestamp
      );

    if (
      age >=
      MOMENTUM_IDEAL_HISTORY_MS
    ) {
      return snapshots[i];
    }
  }

  for (
    let i = snapshots.length - 1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i].timestamp
      );

    if (
      age >=
      MOMENTUM_MIN_HISTORY_MS
    ) {
      return snapshots[i];
    }
  }

  return null;
}

function createSnapshot(candidate) {
  const concentrationVerified =
    Boolean(
      candidate.holders
        ?.concentrationVerified &&
      candidate.holders
        ?.whale?.verified
    );

  return {
    timestamp: Date.now(),

    holderCount:
      candidate.holders?.verified
        ? candidate.holders.holderCount
        : null,

    transferCount:
      candidate.holders?.verified
        ? candidate.holders.transferCount
        : null,

    liquidityUsd:
      candidate.market?.verified
        ? candidate.market.liquidityUsd
        : null,

    marketCap:
      candidate.market?.verified
        ? candidate.market.marketCap
        : null,

    volumeH1:
      candidate.market?.verified
        ? candidate.market.volume?.h1
        : null,

    buysH1:
      candidate.market?.verified
        ? candidate.market.transactions
            ?.h1?.buys
        : null,

    sellsH1:
      candidate.market?.verified
        ? candidate.market.transactions
            ?.h1?.sells
        : null,

    top1Percent:
      concentrationVerified
        ? candidate.holders.whale
            .top1Percent
        : null,

    top10Percent:
      concentrationVerified
        ? candidate.holders.whale
            .top10Percent
        : null,

    whaleBalances:
      concentrationVerified
        ? (
            candidate.holders
              .topHolders || []
          )
            .filter(
              holder =>
                holder.address &&
                holder.percentage !== null
            )
            .map(holder => ({
              address: holder.address,
              value: holder.value,
              percentage:
                holder.percentage
            }))
        : [],

    holderIntegrity:
      candidate.holders
        ?.integrity?.status ||
      "UNVERIFIED"
  };
}

function saveSnapshot(
  state,
  candidate
) {
  const address =
    normalize(candidate.address);

  let snapshots =
    state.snapshots[address];

  if (!Array.isArray(snapshots)) {
    snapshots = [];
  }

  const last =
    snapshots.length
      ? snapshots[
          snapshots.length - 1
        ]
      : null;

  if (
    last &&
    Date.now() -
      safeNumber(last.timestamp) <
      MIN_SNAPSHOT_INTERVAL
  ) {
    return;
  }

  snapshots.push(
    createSnapshot(candidate)
  );

  state.snapshots[address] =
    snapshots.slice(
      -MAX_SNAPSHOTS_PER_TOKEN
    );
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
      label: "BUILDING_HISTORY",
      positiveSignals: 0,
      reasons: [
        "Waiting for historical snapshot"
      ]
    };
  }

  const historyAgeMs =
    Date.now() -
    safeNumber(previous.timestamp);

  if (
    historyAgeMs <
    MOMENTUM_MIN_HISTORY_MS
  ) {
    return {
      verified: false,
      score: 0,
      label: "BUILDING_HISTORY",
      positiveSignals: 0,
      historyAgeMinutes:
        historyAgeMs / 60000,
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

  const oldTx =
    safeNumber(previous.buysH1) +
    safeNumber(previous.sellsH1);

  const newTx =
    safeNumber(
      market?.transactions?.h1?.buys
    ) +
    safeNumber(
      market?.transactions?.h1?.sells
    );

  const txGrowth =
    market?.verified
      ? percentChange(
          oldTx,
          newTx
        )
      : null;

  let score = 0;
  let positiveSignals = 0;
  const reasons = [];

  if (
    holderGrowth !== null &&
    holderGrowth > 0
  ) {
    positiveSignals++;

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
    positiveSignals++;

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

  if (liquidityGrowth !== null) {
    if (liquidityGrowth >= 20) {
      positiveSignals++;
      score += 18;

      reasons.push(
        `Liquidity acceleration ${liquidityGrowth.toFixed(1)}%`
      );
    } else if (
      liquidityGrowth >= 5
    ) {
      positiveSignals++;
      score += 10;
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
    volumeGrowth !== null &&
    volumeGrowth > 0
  ) {
    positiveSignals++;

    score +=
      volumeGrowth >= 100
        ? 22
        : volumeGrowth >= 30
          ? 16
          : volumeGrowth >= 10
            ? 10
            : 5;

    reasons.push(
      `Volume acceleration ${volumeGrowth.toFixed(1)}%`
    );
  }

  if (
    txGrowth !== null &&
    txGrowth > 0
  ) {
    positiveSignals++;

    score +=
      txGrowth >= 50
        ? 15
        : txGrowth >= 15
          ? 10
          : 5;

    reasons.push(
      `Transaction acceleration ${txGrowth.toFixed(1)}%`
    );
  }

  if (
    market?.buyPressure1h !== null &&
    market?.buyPressure1h >= 60
  ) {
    positiveSignals++;

    score +=
      market.buyPressure1h >= 70
        ? 12
        : 7;

    reasons.push(
      "Positive buy pressure"
    );
  }

  if (positiveSignals >= 4) {
    score += 10;

    reasons.push(
      "Multi-signal momentum confirmation"
    );
  }

  score = clamp(
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
      score >= 75
        ? "STRONG"
        : score >= 50
          ? "GOOD"
          : score >= 25
            ? "EARLY"
            : "WEAK",

    historyAgeMinutes:
      historyAgeMs / 60000,

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
      txGrowth,
    reasons
  };
}

/* =========================================================
   WHALE FLOW — V81 INTEGRITY PROTECTED
   ========================================================= */

function analyseWhaleFlow(
  previous,
  holders
) {
  if (
    !previous ||
    !holders?.verified ||
    !holders?.concentrationVerified ||
    !holders?.whale?.verified
  ) {
    return {
      verified: false,
      flow: "BUILDING_HISTORY",
      accumulation:
        "NOT_VERIFIED",
      distribution:
        "NOT_VERIFIED",
      score: 0,

      reasons:
        holders?.integrity &&
        holders.integrity.verified ===
          false
          ? [
              `Holder concentration unavailable: ${holders.integrity.status}`
            ]
          : []
    };
  }

  const previousMap =
    new Map(
      (
        previous.whaleBalances ||
        []
      )
        .filter(
          holder =>
            holder.address
        )
        .map(holder => [
          normalize(holder.address),
          holder
        ])
    );

  let increasing = 0;
  let decreasing = 0;
  let comparable = 0;

  for (
    const holder of
    holders.topHolders || []
  ) {
    if (
      !holder.address ||
      holder.percentage === null
    ) {
      continue;
    }

    const old =
      previousMap.get(
        normalize(holder.address)
      );

    if (!old) continue;

    try {
      const oldValue =
        BigInt(
          String(old.value || "0")
        );

      const newValue =
        BigInt(
          String(holder.value || "0")
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

  let score = 0;
  const reasons = [];
  let flow
