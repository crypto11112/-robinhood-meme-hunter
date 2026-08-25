/**
 * Robinhood Chain Meme Hunter
 * V86
 *
 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER
 *
 * V86:
 * - Builds directly from full V85 baseline
 * - Preserves existing KV state key/history
 *
 * FIX: backlog now uses guaranteed-progress adaptive probing
 * FIX: backlog no longer recursively burns all requests on one huge range
 * FIX: Robinhood public RPC preferred for discovery getLogs
 * FIX: Alchemy fallback only used when actually needed
 * FIX: backlog range grows after success and shrinks after failure
 * FIX: successful sequential backlog progress is committed immediately
 * FIX: Ondo tokenized securities automatically excluded
 * FIX: stronger tokenized-security name detection
 * FIX: Uniswap V4 Pool Manager excluded from whale ownership concentration
 * FIX: token contract / zero / dead addresses excluded from whale ownership
 * FIX: infrastructure balances reported separately
 * FIX: holder concentration uses adjusted ownership supply
 * FIX: unverified safety data can no longer produce LOW risk
 * FIX: Telegram requires verified risk assessment
 *
 * Preserves:
 * - V85 live-first scanning
 * - existing KV state/history
 * - DexScreener 429 protection
 * - DexScreener market cache
 * - stale-cache fallback
 * - Blockscout holder intelligence
 * - empty-holder protection
 * - zero-balance holder protection
 * - impossible concentration protection
 * - ERC20 validation
 * - tokenized-security filtering
 * - momentum snapshots
 * - whale flow
 * - opportunity/confidence scoring
 * - Telegram alerts
 * - five-minute scheduled heartbeat
 * - hard request-budget isolation
 */

const VERSION = "V86";

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

const DEAD =
  "0x000000000000000000000000000000000000dead";

/*
 * IMPORTANT:
 * Preserve V69-V85 KV history.
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
   LIVE SCANNING
   ========================================================= */

const LIVE_SCAN_BLOCKS = 20;

const MIN_LOG_RANGE = 10;

/* =========================================================
   V86 GUARANTEED-PROGRESS BACKLOG
   ========================================================= */

/*
 * V85 showed that requesting 5,000 blocks and recursively
 * splitting could consume all 9 backlog requests without
 * advancing the cursor.
 *
 * V86 uses probing instead:
 *
 * 1. Start conservatively.
 * 2. Success -> advance cursor immediately.
 * 3. Success -> increase next range.
 * 4. Failure -> reduce same range.
 * 5. Never burn two providers on every failed probe.
 * 6. At minimum range, optionally try Alchemy once.
 */

const BACKLOG_MIN_CHUNK_BLOCKS = 10;

const BACKLOG_START_CHUNK_BLOCKS = 250;

const BACKLOG_MAX_CHUNK_BLOCKS = 2000;

const BACKLOG_GROWTH_MULTIPLIER = 2;

const BACKLOG_SHRINK_DIVISOR = 2;

const BACKLOG_LIVE_GUARD_BLOCKS =
  LIVE_SCAN_BLOCKS;

/* =========================================================
   HARD REQUEST BUDGET
   ========================================================= */

const MAX_EXTERNAL_REQUESTS = 42;

const SYSTEM_REQUEST_LIMIT = 2;

const DISCOVERY_REQUEST_LIMIT = 17;

const LIVE_DISCOVERY_REQUEST_LIMIT = 8;

const BACKLOG_DISCOVERY_REQUEST_LIMIT = 9;

const ANALYSIS_REQUEST_LIMIT = 21;

const NOTIFICATION_REQUEST_LIMIT = 2;

const FRESH_ANALYSIS_COST_ALCHEMY = 9;

const FRESH_ANALYSIS_COST_FALLBACK = 14;

const CACHED_ANALYSIS_COST = 4;

/* =========================================================
   ANALYSIS
   ========================================================= */

const MAX_TOKEN_CHECKS = 4;

const METADATA_REUSE_MS =
  30 * 60 * 1000;

/* =========================================================
   DEXSCREENER
   ========================================================= */

const MARKET_CACHE_MS =
  4 * 60 * 1000;

const MARKET_STALE_CACHE_MS =
  15 * 60 * 1000;

const DEXSCREENER_429_COOLDOWN_MS =
  5 * 60 * 1000;

/* =========================================================
   WATCHLIST
   ========================================================= */

const WATCH_MAX_AGE =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

/* =========================================================
   TELEGRAM
   ========================================================= */

const ALERT_COOLDOWN =
  6 * 60 * 60 * 1000;

const MIN_ALERT_SCORE = 60;

const MAX_ALERT_RISK = 59;

const MIN_ALERT_LIQUIDITY = 1000;

const MIN_CONFIDENCE_ALERT = 55;

/* =========================================================
   SNAPSHOTS
   ========================================================= */

const MAX_SNAPSHOTS_PER_TOKEN = 24;

const SNAPSHOT_MAX_AGE =
  24 * 60 * 60 * 1000;

const MIN_SNAPSHOT_INTERVAL =
  2 * 60 * 1000;

const MOMENTUM_MIN_HISTORY_MS =
  5 * 60 * 1000;

const MOMENTUM_IDEAL_HISTORY_MS =
  15 * 60 * 1000;

/* =========================================================
   HELPERS
   ========================================================= */

function now() {
  return new Date().toISOString();
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
    Math.min(
      max,
      value
    )
  );
}

function normalize(value) {
  return String(
    value || ""
  ).toLowerCase();
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(
      value || ""
    )
  );
}

function errorString(error) {
  return String(
    error?.message ||
    error ||
    "UNKNOWN_ERROR"
  );
}

function topicAddress(topic) {
  const value =
    String(
      topic || ""
    );

  if (
    !/^0x[a-fA-F0-9]{64}$/.test(
      value
    )
  ) {
    return null;
  }

  return (
    "0x" +
    value.slice(-40)
  ).toLowerCase();
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
  if (
    knownQuote(address)
  ) {
    return true;
  }

  return KNOWN_QUOTE_SYMBOLS.has(
    String(
      symbol || ""
    ).toUpperCase()
  );
}

/* =========================================================
   TOKENIZED-SECURITY FILTER — V86
   ========================================================= */

function tokenizedSecurityReason(
  name,
  symbol
) {
  const n =
    String(
      name || ""
    ).trim();

  const s =
    String(
      symbol || ""
    ).trim();

  const upper =
    n.toUpperCase();

  const symbolUpper =
    s.toUpperCase();

  /*
   * Robinhood native tokenized-security naming.
   */
  if (
    upper.includes(
      "• ROBINHOOD TOKEN"
    )
  ) {
    return "ROBINHOOD_TOKENIZED_SECURITY";
  }

  if (
    upper.includes(
      "ROBINHOOD TOKEN"
    ) &&
    (
      upper.includes(
        "COMMON STOCK"
      ) ||
      upper.includes(
        "CLASS A"
      ) ||
      upper.includes(
        "CLASS B"
      ) ||
      upper.includes(
        "CLASS C"
      ) ||
      upper.includes(
        "ETF"
      )
    )
  ) {
    return "ROBINHOOD_TOKENIZED_SECURITY";
  }

  if (
    /CLASS\s+[A-Z]\s+COMMON\s+STOCK/i.test(
      n
    )
  ) {
    return "TOKENIZED_COMMON_STOCK";
  }

  /*
   * V86:
   * Ondo tokenized equities/securities.
   *
   * Example discovered in V85:
   * Robinhood Markets (Ondo Tokenized)
   * HOODon
   */
  if (
    upper.includes(
      "ONDO TOKENIZED"
    ) ||
    /\(\s*ONDO\s+TOKENIZED\s*\)/i.test(
      n
    )
  ) {
    return "ONDO_TOKENIZED_SECURITY";
  }

  if (
    upper.includes(
      "TOKENIZED"
    ) &&
    (
      upper.includes(
        "MARKETS"
      ) ||
      upper.includes(
        "STOCK"
      ) ||
      upper.includes(
        "SHARES"
      ) ||
      upper.includes(
        "EQUITY"
      ) ||
      upper.includes(
        "ETF"
      ) ||
      upper.includes(
        "SECURITY"
      )
    )
  ) {
    return "TOKENIZED_SECURITY";
  }

  /*
   * Do NOT exclude symbols merely because they end "ON".
   * That would create meme-token false positives.
   *
   * Symbol is retained here only for future strict patterns.
   */
  void symbolUpper;

  return null;
}

function percentChange(
  previous,
  current
) {
  const a =
    safeNumber(
      previous
    );

  const b =
    safeNumber(
      current
    );

  if (
    a <= 0
  ) {
    return null;
  }

  return (
    (
      b - a
    ) /
    a
  ) * 100;
}

function uniqueBy(
  array,
  keyFunction
) {
  const map =
    new Map();

  for (
    const item
    of array
  ) {
    const key =
      keyFunction(
        item
      );

    if (!key) {
      continue;
    }

    map.set(
      key,
      item
    );
  }

  return Array.from(
    map.values()
  );
}

function jsonResponse(
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
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",

        "access-control-allow-origin":
          "*"
      }
    }
  );
}

/* =========================================================
   BACKLOG HELPERS
   ========================================================= */

function initialBacklogChunkSize(
  remaining
) {
  const blocks =
    safeNumber(
      remaining
    );

  if (
    blocks >=
    500000
  ) {
    return 250;
  }

  if (
    blocks >=
    100000
  ) {
    return 200;
  }

  if (
    blocks >=
    20000
  ) {
    return 150;
  }

  if (
    blocks >=
    5000
  ) {
    return 100;
  }

  return clamp(
    blocks,
    BACKLOG_MIN_CHUNK_BLOCKS,
    BACKLOG_START_CHUNK_BLOCKS
  );
}

function backlogLagLabel(
  remaining
) {
  const blocks =
    safeNumber(
      remaining
    );

  if (
    blocks >=
    500000
  ) {
    return "VERY_LARGE";
  }

  if (
    blocks >=
    100000
  ) {
    return "LARGE";
  }

  if (
    blocks >=
    20000
  ) {
    return "MEDIUM";
  }

  if (
    blocks >=
    1000
  ) {
    return "SMALL";
  }

  if (
    blocks > 0
  ) {
    return "NEAR_TIP";
  }

  return "CAUGHT_UP";
}

/* =========================================================
   REQUEST BUDGET
   ========================================================= */

function createBudget() {
  return {
    totalUsed:
      0,

    totalLimit:
      MAX_EXTERNAL_REQUESTS,

    system: {
      used:
        0,

      limit:
        SYSTEM_REQUEST_LIMIT
    },

    discovery: {
      used:
        0,

      limit:
        DISCOVERY_REQUEST_LIMIT,

      liveUsed:
        0,

      liveLimit:
        LIVE_DISCOVERY_REQUEST_LIMIT,

      backlogUsed:
        0,

      backlogLimit:
        BACKLOG_DISCOVERY_REQUEST_LIMIT
    },

    analysis: {
      used:
        0,

      limit:
        ANALYSIS_REQUEST_LIMIT
    },

    notification: {
      used:
        0,

      limit:
        NOTIFICATION_REQUEST_LIMIT
    },

    skipped:
      []
  };
}

function budgetAvailable(
  budget,
  phase,
  amount = 1
) {
  if (
    budget.totalUsed +
      amount >
    budget.totalLimit
  ) {
    return false;
  }

  if (
    phase ===
    "system"
  ) {
    return (
      budget.system.used +
        amount <=
      budget.system.limit
    );
  }

  if (
    phase ===
    "analysis"
  ) {
    return (
      budget.analysis.used +
        amount <=
      budget.analysis.limit
    );
  }

  if (
    phase ===
    "notification"
  ) {
    return (
      budget.notification.used +
        amount <=
      budget.notification.limit
    );
  }

  if (
    phase ===
    "discovery-live"
  ) {
    return (
      budget.discovery.used +
          amount <=
        budget.discovery.limit &&
      budget.discovery.liveUsed +
          amount <=
        budget.discovery.liveLimit
    );
  }

  if (
    phase ===
    "discovery-backlog"
  ) {
    return (
      budget.discovery.used +
          amount <=
        budget.discovery.limit &&
      budget.discovery.backlogUsed +
          amount <=
        budget.discovery.backlogLimit
    );
  }

  return false;
}

function consumeBudget(
  budget,
  phase,
  type,
  amount = 1
) {
  if (
    !budgetAvailable(
      budget,
      phase,
      amount
    )
  ) {
    budget.skipped.push({
      phase,
      type,
      amount,

      reason:
        "PHASE_BUDGET_EXHAUSTED"
    });

    return false;
  }

  budget.totalUsed +=
    amount;

  if (
    phase ===
    "system"
  ) {
    budget.system.used +=
      amount;
  }

  else if (
    phase ===
    "analysis"
  ) {
    budget.analysis.used +=
      amount;
  }

  else if (
    phase ===
    "notification"
  ) {
    budget.notification.used +=
      amount;
  }

  else if (
    phase ===
    "discovery-live"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.liveUsed +=
      amount;
  }

  else if (
    phase ===
    "discovery-backlog"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.backlogUsed +=
      amount;
  }

  return true;
}

function budgetTelemetry(
  budget
) {
  return {
    used:
      budget.totalUsed,

    limit:
      budget.totalLimit,

    remaining:
      Math.max(
        0,
        budget.totalLimit -
          budget.totalUsed
      ),

    system: {
      used:
        budget.system.used,

      limit:
        budget.system.limit,

      remaining:
        Math.max(
          0,
          budget.system.limit -
            budget.system.used
        )
    },

    discovery: {
      used:
        budget.discovery.used,

      limit:
        budget.discovery.limit,

      remaining:
        Math.max(
          0,
          budget.discovery.limit -
            budget.discovery.used
        ),

      live: {
        used:
          budget.discovery.liveUsed,

        limit:
          budget.discovery.liveLimit,

        remaining:
          Math.max(
            0,
            budget.discovery.liveLimit -
              budget.discovery.liveUsed
          )
      },

      backlog: {
        used:
          budget.discovery.backlogUsed,

        limit:
          budget.discovery.backlogLimit,

        remaining:
          Math.max(
            0,
            budget.discovery.backlogLimit -
              budget.discovery.backlogUsed
          )
      }
    },

    analysis: {
      used:
        budget.analysis.used,

      limit:
        budget.analysis.limit,

      remaining:
        Math.max(
          0,
          budget.analysis.limit -
            budget.analysis.used
        ),

      protected:
        true
    },

    notification: {
      used:
        budget.notification.used,

      limit:
        budget.notification.limit,

      remaining:
        Math.max(
          0,
          budget.notification.limit -
            budget.notification.used
        ),

      protected:
        true
    },

    hardPhaseIsolation:
      true,

    liveFirstIsolation:
      true,

    telegramBudgeted:
      true,

    skipped:
      budget.skipped
  };
}

/* =========================================================
   KV STATE
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
    kv:
      null,

    binding:
      null
  };
}

function newState() {
  return {
    version:
      VERSION,

    lastScannedBlock:
      null,

    lastLiveScannedBlock:
      null,

    watchedTokens:
      [],

    alerts:
      {},

    snapshots:
      {},

    scheduler: {
      scheduledRunCount:
        0,

      lastScheduledRunAt:
        null,

      lastScheduledSuccessAt:
        null,

      lastScheduledStatus:
        null,

      lastScheduledLatestBlock:
        null
    },

    services: {
      dexscreener: {
        cooldownUntil:
          null,

        last429At:
          null,

        lastSuccessAt:
          null,

        lastStatus:
          null,

        total429s:
          0
      }
    },

    createdAt:
      now(),

    updatedAt:
      now()
  };
}

async function readState(env) {
  const {
    kv,
    binding
  } = getKV(env);

  if (!kv) {
    return {
      persistent:
        false,

      binding:
        null,

      state:
        newState(),

      error:
        null
    };
  }

  try {
    const raw =
      await kv.get(
        STATE_KEY
      );

    if (!raw) {
      return {
        persistent:
          true,

        binding,

        state:
          newState(),

        error:
          null
      };
    }

    const parsed =
      JSON.parse(raw);

    let watchedTokens =
      [];

    if (
      Array.isArray(
        parsed.watchedTokens
      )
    ) {
      watchedTokens =
        parsed.watchedTokens;
    }

    else if (
      parsed.watchedTokens &&
      typeof parsed.watchedTokens ===
        "object"
    ) {
      watchedTokens =
        Object.values(
          parsed.watchedTokens
        );
    }

    const fresh =
      newState();

    return {
      persistent:
        true,

      binding,

      state: {
        ...fresh,
        ...parsed,

        watchedTokens,

        alerts:
          parsed.alerts &&
          typeof parsed.alerts ===
            "object"
            ? parsed.alerts
            : {},

        snapshots:
          parsed.snapshots &&
          typeof parsed.snapshots ===
            "object"
            ? parsed.snapshots
            : {},

        scheduler: {
          ...fresh.scheduler,

          ...(
            parsed.scheduler &&
            typeof parsed.scheduler ===
              "object"
              ? parsed.scheduler
              : {}
          )
        },

        services: {
          ...fresh.services,

          ...(
            parsed.services &&
            typeof parsed.services ===
              "object"
              ? parsed.services
              : {}
          ),

          dexscreener: {
            ...fresh.services.dexscreener,

            ...(
              parsed.services
                ?.dexscreener &&
              typeof parsed.services
                .dexscreener ===
                "object"
                ? parsed.services
                    .dexscreener
                : {}
            )
          }
        }
      },

      error:
        null
    };
  }

  catch (error) {
    return {
      persistent:
        true,

      binding,

      state:
        newState(),

      error:
        errorString(
          error
        )
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
      saved:
        false,

      binding:
        null,

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
      JSON.stringify(
        state
      )
    );

    return {
      saved:
        true,

      binding,

      error:
        null
    };
  }

  catch (error) {
    return {
      saved:
        false,

      binding,

      error:
        errorString(
          error
        )
    };
  }
}

function pruneState(
  state,
  trimWatchlist = true
) {
  const current =
    Date.now();

  state.watchedTokens =
    Array.isArray(
      state.watchedTokens
    )
      ? state.watchedTokens
      : [];

  state.watchedTokens =
    state.watchedTokens.filter(
      token => {
        const firstSeen =
          safeNumber(
            token.firstSeenAt
          );

        if (!firstSeen) {
          return true;
        }

        return (
          current -
            firstSeen <=
          WATCH_MAX_AGE
        );
      }
    );

  if (
    trimWatchlist
  ) {
    state.watchedTokens =
      state.watchedTokens.slice(
        0,
        MAX_WATCHED_TOKENS
      );
  }

  state.alerts =
    state.alerts &&
    typeof state.alerts ===
      "object"
      ? state.alerts
      : {};

  for (
    const [
      address,
      alert
    ]
    of Object.entries(
      state.alerts
    )
  ) {
    const timestamp =
      typeof alert ===
        "object"
        ? safeNumber(
            alert.timestamp
          )
        : safeNumber(
            alert
          );

    if (
      timestamp &&
      current -
        timestamp >
        ALERT_COOLDOWN
    ) {
      delete state.alerts[
        address
      ];
    }
  }

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
    ]
    of Object.entries(
      state.snapshots
    )
  ) {
    let list =
      Array.isArray(
        snapshots
      )
        ? snapshots
        : snapshots &&
          typeof snapshots ===
            "object"
          ? [
              snapshots
            ]
          : [];

    list =
      list
        .filter(
          snapshot => {
            const timestamp =
              safeNumber(
                snapshot.timestamp
              );

            return (
              timestamp &&
              current -
                timestamp <=
                SNAPSHOT_MAX_AGE
            );
          }
        )
        .slice(
          -MAX_SNAPSHOTS_PER_TOKEN
        );

    if (
      list.length
    ) {
      state.snapshots[
        address
      ] = list;
    }

    else {
      delete state.snapshots[
        address
      ];
    }
  }

  state.scheduler =
    state.scheduler &&
    typeof state.scheduler ===
      "object"
      ? state.scheduler
      : newState()
          .scheduler;

  if (
    !state.services ||
    typeof state.services !==
      "object"
  ) {
    state.services =
      newState()
        .services;
  }

  if (
    !state.services
      .dexscreener ||
    typeof state.services
      .dexscreener !==
      "object"
  ) {
    state.services
      .dexscreener =
      newState()
        .services
        .dexscreener;
  }
}

function findWatched(
  state,
  address
) {
  const key =
    normalize(
      address
    );

  return state.watchedTokens.find(
    token =>
      normalize(
        token.address
      ) ===
      key
  );
}

function addWatch(
  state,
  address,
  pool,
  source
) {
  address =
    normalize(
      address
    );

  if (
    !isAddress(
      address
    ) ||
    address ===
      ZERO ||
    knownQuote(
      address
    )
  ) {
    return {
      added:
        false,

      token:
        null
    };
  }

  let token =
    findWatched(
      state,
      address
    );

  let added =
    false;

  if (!token) {
    token = {
      address,

      firstSeenAt:
        Date.now(),

      lastSeenAt:
        Date.now(),

      lastLiveSeenAt:
        null,

      lastCheckedAt:
        null,

      checks:
        0,

      invalidChecks:
        0,

      lastValidationReason:
        null,

      excludedReason:
        null,

      pools:
        [],

      metadata:
        null,

      marketCache:
        null,

      discoverySource:
        source ||
        "UNKNOWN"
    };

    state.watchedTokens.push(
      token
    );

    added =
      true;
  }

  token.lastSeenAt =
    Date.now();

  if (
    source ===
    "LIVE"
  ) {
    token.discoverySource =
      "LIVE";

    token.lastLiveSeenAt =
      Date.now();
  }

  token.pools =
    Array.isArray(
      token.pools
    )
      ? token.pools
      : [];

  if (pool) {
    const exists =
      token.pools.some(
        existing =>
          normalize(
            existing.poolId
          ) ===
          normalize(
            pool.poolId
          )
      );

    if (!exists) {
      token.pools.push(
        pool
      );
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
      `REQUEST_BUDGET_EXHAUSTED_${String(
        phase
      )
        .toUpperCase()
        .replace(
          /-/g,
          "_"
        )}`
    );
  }

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      4500
    );

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
              jsonrpc:
                "2.0",

              id:
                Date.now(),

              method,
              params
            }),

          signal:
            controller.signal
        }
      );

    if (
      !response.ok
    ) {
      throw new Error(
        `HTTP_${response.status}`
      );
    }

    const body =
      await response.json();

    if (
      body.error
    ) {
      throw new Error(
        body.error.message ||
        "RPC_ERROR"
      );
    }

    return body.result;
  }

  finally {
    clearTimeout(
      timer
    );
  }
}

/*
 * V86:
 *
 * Analysis still prefers Alchemy.
 *
 * Discovery now prefers Robinhood public RPC because the V85
 * live test showed public getLogs succeeding after an earlier
 * provider attempt had already consumed discovery budget.
 */
function preferAlchemy(
  env,
  phase,
  method
) {
  if (
    !env.ALCHEMY_API_KEY
  ) {
    return false;
  }

  if (
    phase ===
    "analysis"
  ) {
    return true;
  }

  return false;
}

async function rpc(
  env,
  method,
  params,
  budget,
  phase
) {
  const alchemyUrl =
    env.ALCHEMY_API_KEY
      ? ALCHEMY_BASE +
        env.ALCHEMY_API_KEY
      : null;

  const useAlchemyFirst =
    preferAlchemy(
      env,
      phase,
      method
    );

  const providers =
    useAlchemyFirst
      ? [
          {
            name:
              "ALCHEMY",

            url:
              alchemyUrl
          },

          {
            name:
              "ROBINHOOD_PUBLIC_RPC",

            url:
              PUBLIC_RPC
          }
        ]
      : [
          {
            name:
              "ROBINHOOD_PUBLIC_RPC",

            url:
              PUBLIC_RPC
          },

          ...(
            alchemyUrl
              ? [
                  {
                    name:
                      "ALCHEMY",

                    url:
                      alchemyUrl
                  }
                ]
              : []
          )
        ];

  const errors =
    [];

  for (
    const provider
    of providers
  ) {
    if (
      !provider.url
    ) {
      continue;
    }

    if (
      !budgetAvailable(
        budget,
        phase
      )
    ) {
      break;
    }

    try {
      const result =
        await rpcCall(
          provider.url,
          method,
          params,
          budget,
          phase
        );

      return {
        result,

        provider:
          provider.name,

        error:
          null
      };
    }

    catch (error) {
      const message =
        errorString(
          error
        );

      errors.push(
        `${provider.name}: ${message}`
      );

      if (
        message.startsWith(
          "REQUEST_BUDGET_EXHAUSTED"
        )
      ) {
        break;
      }
    }
  }

  return {
    result:
      null,

    provider:
      null,

    error:
      errors.length
        ? errors.join(
            " | "
          )
        : "REQUEST_BUDGET_EXHAUSTED"
  };
}

async function latestBlock(
  env,
  budget
) {
  const response =
    await rpc(
      env,
      "eth_blockNumber",
      [],
      budget,
      "system"
    );

  if (
    !response.result
  ) {
    throw new Error(
      response.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return {
    block:
      BigInt(
        response.result
      ),

    provider:
      response.provider
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

    [
      {
        fromBlock:
          "0x" +
          from.toString(
            16
          ),

        toBlock:
          "0x" +
          to.toString(
            16
          ),

        address:
          POOL_MANAGER
      }
    ],

    budget,
    phase
  );
}

/*
 * V86:
 * Single-provider backlog probe.
 *
 * This prevents a failed range from consuming one request
 * against public RPC and another against Alchemy automatically.
 */
async function getLogsSingleProvider(
  env,
  from,
  to,
  budget,
  providerName
) {
  let url =
    null;

  if (
    providerName ===
    "ROBINHOOD_PUBLIC_RPC"
  ) {
    url =
      PUBLIC_RPC;
  }

  else if (
    providerName ===
      "ALCHEMY" &&
    env.ALCHEMY_API_KEY
  ) {
    url =
      ALCHEMY_BASE +
      env.ALCHEMY_API_KEY;
  }

  if (!url) {
    return {
      result:
        null,

      provider:
        providerName,

      error:
        "PROVIDER_UNAVAILABLE"
    };
  }

  try {
    const result =
      await rpcCall(
        url,
        "eth_getLogs",

        [
          {
            fromBlock:
              "0x" +
              from.toString(
                16
              ),

            toBlock:
              "0x" +
              to.toString(
                16
              ),

            address:
              POOL_MANAGER
          }
        ],

        budget,
        "discovery-backlog"
      );

    return {
      result,

      provider:
        providerName,

      error:
        null
    };
  }

  catch (error) {
    return {
      result:
        null,

      provider:
        providerName,

      error:
        errorString(
          error
        )
    };
  }
}

/* =========================================================
   LIVE ADAPTIVE LOG SCANNER
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
    phase !==
      "discovery-live"
  ) {
    return {
      success:
        false,

      error:
        "INVALID_LIVE_DISCOVERY_PHASE"
    };
  }

  if (
    !budgetAvailable(
      budget,
      phase
    )
  ) {
    return {
      success:
        false,

      budgetExhausted:
        true,

      error:
        "DISCOVERY_BUDGET_EXHAUSTED"
    };
  }

  const response =
    await getLogs(
      env,
      from,
      to,
      budget,
      phase
    );

  if (
    Array.isArray(
      response.result
    )
  ) {
    output.logs.push(
      ...response.result
    );

    output.ranges.push({
      fromBlock:
        Number(
          from
        ),

      toBlock:
        Number(
          to
        ),

      blocks:
        Number(
          to -
          from +
          1n
        ),

      logs:
        response.result.length,

      provider:
        response.provider,

      phase,

      splitDepth:
        depth
    });

    return {
      success:
        true,

      processedThrough:
        to
    };
  }

  if (
    String(
      response.error ||
      ""
    ).includes(
      "REQUEST_BUDGET_EXHAUSTED"
    )
  ) {
    return {
      success:
        false,

      budgetExhausted:
        true,

      error:
        response.error
    };
  }

  const size =
    to -
    from +
    1n;

  if (
    size >
    BigInt(
      MIN_LOG_RANGE
    )
  ) {
    const middle =
      from +
      (
        to -
        from
      ) /
      2n;

    const left =
      await scanLogRange(
        env,
        from,
        middle,
        budget,
        output,
        phase,
        depth + 1
      );

    if (
      !left.success
    ) {
      return left;
    }

    const right =
      await scanLogRange(
        env,
        middle + 1n,
        to,
        budget,
        output,
        phase,
        depth + 1
      );

    if (
      !right.success
    ) {
      return {
        ...right,

        processedThrough:
          left.processedThrough
      };
    }

    return {
      success:
        true,

      processedThrough:
        right.processedThrough
    };
  }

  return {
    success:
      false,

    error:
      response.error ||
      "GET_LOGS_FAILED"
  };
}

/* =========================================================
   V86 GUARANTEED-PROGRESS BACKLOG
   ========================================================= */

async function scanBacklogSequential(
  env,
  start,
  targetLatest,
  budget,
  output
) {
  const startedAt =
    Date.now();

  let cursor =
    start;

  let processedThrough =
    null;

  let successfulChunks =
    0;

  let failedProbes =
    0;

  let minimumRangeFailures =
    0;

  let alchemyFallbackAttempts =
    0;

  let error =
    null;

  const initialRemaining =
    Number(
      targetLatest -
      start +
      1n
    );

  let chunkSize =
    initialBacklogChunkSize(
      initialRemaining
    );

  const probeHistory =
    [];

  while (
    cursor <=
      targetLatest &&
    budgetAvailable(
      budget,
      "discovery-backlog"
    )
  ) {
    const remaining =
      Number(
        targetLatest -
        cursor +
        1n
      );

    chunkSize =
      clamp(
        Math.min(
          chunkSize,
          remaining
        ),
        BACKLOG_MIN_CHUNK_BLOCKS,
        BACKLOG_MAX_CHUNK_BLOCKS
      );

    let chunkTo =
      cursor +
      BigInt(
        chunkSize -
        1
      );

    if (
      chunkTo >
      targetLatest
    ) {
      chunkTo =
        targetLatest;
    }

    const probeStart =
      cursor;

    const beforeRequests =
      budget.discovery
        .backlogUsed;

    const response =
      await getLogsSingleProvider(
        env,
        probeStart,
        chunkTo,
        budget,
        "ROBINHOOD_PUBLIC_RPC"
      );

    const requestsUsed =
      budget.discovery
        .backlogUsed -
      beforeRequests;

    if (
      Array.isArray(
        response.result
      )
    ) {
      output.logs.push(
        ...response.result
      );

      output.ranges.push({
        fromBlock:
          Number(
            probeStart
          ),

        toBlock:
          Number(
            chunkTo
          ),

        blocks:
          Number(
            chunkTo -
            probeStart +
            1n
          ),

        logs:
          response.result.length,

        provider:
          response.provider,

        phase:
          "discovery-backlog",

        strategy:
          "V86_PROBE_SUCCESS"
      });

      processedThrough =
        chunkTo;

      successfulChunks++;

      probeHistory.push({
        fromBlock:
          Number(
            probeStart
          ),

        toBlock:
          Number(
            chunkTo
          ),

        requestedBlocks:
          Number(
            chunkTo -
            probeStart +
            1n
          ),

        provider:
          response.provider,

        requestsUsed,

        success:
          true,

        logs:
          response.result.length
      });

      cursor =
        chunkTo +
        1n;

      chunkSize =
        Math.min(
          BACKLOG_MAX_CHUNK_BLOCKS,

          Math.max(
            BACKLOG_MIN_CHUNK_BLOCKS,

            Math.floor(
              chunkSize *
              BACKLOG_GROWTH_MULTIPLIER
            )
          )
        );

      continue;
    }

    failedProbes++;

    probeHistory.push({
      fromBlock:
        Number(
          probeStart
        ),

      toBlock:
        Number(
          chunkTo
        ),

      requestedBlocks:
        Number(
          chunkTo -
          probeStart +
          1n
        ),

      provider:
        response.provider,

      requestsUsed,

      success:
        false,

      error:
        response.error
    });

    /*
     * Budget exhausted means stop without moving cursor.
     */
    if (
      String(
        response.error ||
        ""
      ).includes(
        "REQUEST_BUDGET_EXHAUSTED"
      )
    ) {
      error =
        "DISCOVERY_BUDGET_EXHAUSTED";

      break;
    }

    /*
     * Shrink failed probe, but keep the same sequential cursor.
     */
    if (
      chunkSize >
      BACKLOG_MIN_CHUNK_BLOCKS
    ) {
      chunkSize =
        Math.max(
          BACKLOG_MIN_CHUNK_BLOCKS,

          Math.floor(
            chunkSize /
            BACKLOG_SHRINK_DIVISOR
          )
        );

      continue;
    }

    /*
     * Public RPC failed even at minimum size.
     *
     * Try Alchemy once for this exact minimum sequential range.
     */
    minimumRangeFailures++;

    if (
      env.ALCHEMY_API_KEY &&
      budgetAvailable(
        budget,
        "discovery-backlog"
      )
    ) {
      alchemyFallbackAttempts++;

      const beforeAlchemy =
        budget.discovery
          .backlogUsed;

      const alchemy =
        await getLogsSingleProvider(
          env,
          probeStart,
          chunkTo,
          budget,
          "ALCHEMY"
        );

      const alchemyRequestsUsed =
        budget.discovery
          .backlogUsed -
        beforeAlchemy;

      if (
        Array.isArray(
          alchemy.result
        )
      ) {
        output.logs.push(
          ...alchemy.result
        );

        output.ranges.push({
          fromBlock:
            Number(
              probeStart
            ),

          toBlock:
            Number(
              chunkTo
            ),

          blocks:
            Number(
              chunkTo -
              probeStart +
              1n
            ),

          logs:
            alchemy.result.length,

          provider:
            alchemy.provider,

          phase:
            "discovery-backlog",

          strategy:
            "V86_MIN_RANGE_ALCHEMY_FALLBACK"
        });

        processedThrough =
          chunkTo;

        successfulChunks++;

        probeHistory.push({
          fromBlock:
            Number(
              probeStart
            ),

          toBlock:
            Number(
              chunkTo
            ),

          requestedBlocks:
            Number(
              chunkTo -
              probeStart +
              1n
            ),

          provider:
            alchemy.provider,

          requestsUsed:
            alchemyRequestsUsed,

          success:
            true,

          fallback:
            true,

          logs:
            alchemy.result.length
        });

        cursor =
          chunkTo +
          1n;

        chunkSize =
          BACKLOG_MIN_CHUNK_BLOCKS;

        continue;
      }

      probeHistory.push({
        fromBlock:
          Number(
            probeStart
        ),

        toBlock:
          Number(
            chunkTo
        ),

        requestedBlocks:
          Number(
            chunkTo -
            probeStart +
            1n
        ),

        provider:
          alchemy.provider,

        requestsUsed:
          alchemyRequestsUsed,

        success:
          false,

        fallback:
          true,

        error:
          alchemy.error
      });

      error =
        alchemy.error ||
        response.error ||
        "BACKLOG_MIN_RANGE_FAILED";
    }

    else {
      error =
        response.error ||
        "BACKLOG_MIN_RANGE_FAILED";
    }

    /*
     * Cannot safely skip a failed sequential range.
     */
    break;
  }

  const blocksProcessed =
    processedThrough !==
      null
      ? Number(
          processedThrough -
          start +
          1n
        )
      : 0;

  const durationMs =
    Date.now() -
    startedAt;

  return {
    success:
      blocksProcessed > 0,

    complete:
      cursor >
      targetLatest,

    processedThrough,

    nextBlock:
      cursor <=
        targetLatest
        ? cursor
        : null,

    initialChunkSize:
      initialBacklogChunkSize(
        initialRemaining
      ),

    finalChunkSize:
      chunkSize,

    successfulChunks,

    failedProbes,

    minimumRangeFailures,

    alchemyFallbackAttempts,

    blocksProcessed,

    durationMs,

    blocksPerSecond:
      durationMs > 0
        ? (
            blocksProcessed /
            durationMs
          ) * 1000
        : 0,

    probeHistory,

    error
  };
}

/* =========================================================
   V4 DECODING
   ========================================================= */

function decodeInitialize(
  log
) {
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
    log.topics.length <
      4
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
      normalize(
        log.topics[1]
      ),

    currency0,

    currency1,

    blockNumber:
      log.blockNumber,

    transactionHash:
      log.transactionHash
  };
}

function processDiscoveryLogs(
  state,
  logs,
  source
) {
  const newTokens =
    new Set();

  const seenTokens =
    new Set();

  let initializeEvents =
    0;

  let swapTopicMatches =
    0;

  let liquidityTopicMatches =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swapTopicMatches++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityTopicMatches++;
    }

    const pool =
      decodeInitialize(
        log
      );

    if (!pool) {
      continue;
    }

    initializeEvents++;

    for (
      const address
      of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        !isAddress(
          address
        ) ||
        address ===
          ZERO ||
        knownQuote(
          address
        )
      ) {
        continue;
      }

      const result =
        addWatch(
          state,
          address,
          pool,
          source
        );

      if (
        result.token
      ) {
        seenTokens.add(
          normalize(
            address
          )
        );
      }

      if (
        result.added
      ) {
        newTokens.add(
          normalize(
            address
          )
        );
      }
    }
  }

  return {
    rawLogs:
      logs.length,

    initializeEvents,

    swapTopicMatches,

    liquidityTopicMatches,

    newTokens,

    seenTokens
  };
}

/* =========================================================
   LIVE POOL ACTIVITY
   ========================================================= */

function activeTokensFromLogs(
  state,
  logs
) {
  const poolToTokens =
    new Map();

  for (
    const watched
    of state.watchedTokens
  ) {
    const address =
      normalize(
        watched.address
      );

    if (
      !isAddress(
        address
      ) ||
      knownQuote(
        address
      )
    ) {
      continue;
    }

    for (
      const pool
      of watched.pools ||
      []
    ) {
      const poolId =
        normalize(
          pool.poolId
        );

      if (!poolId) {
        continue;
      }

      if (
        !poolToTokens.has(
          poolId
        )
      ) {
        poolToTokens.set(
          poolId,
          new Set()
        );
      }

      poolToTokens
        .get(
          poolId
        )
        .add(
          address
        );
    }
  }

  const active =
    new Set();

  const unknownPoolIds =
    new Set();

  let swapEvents =
    0;

  let liquidityEvents =
    0;

  let unknownSwapEvents =
    0;

  let unknownLiquidityEvents =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    if (
      topic0 !==
        SWAP_TOPIC &&
      topic0 !==
        MODIFY_LIQUIDITY_TOPIC
    ) {
      continue;
    }

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    const tokens =
      poolToTokens.get(
        poolId
      );

    if (!tokens) {
      if (poolId) {
        unknownPoolIds.add(
          poolId
        );
      }

      if (
        topic0 ===
        SWAP_TOPIC
      ) {
        unknownSwapEvents++;
      }

      if (
        topic0 ===
        MODIFY_LIQUIDITY_TOPIC
      ) {
        unknownLiquidityEvents++;
      }

      continue;
    }

    if (
      topic0 ===
      SWAP_TOPIC
    ) {
      swapEvents++;
    }

    if (
      topic0 ===
      MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityEvents++;
    }

    for (
      const address
      of tokens
    ) {
      active.add(
        address
      );

      const watched =
        findWatched(
          state,
          address
        );

      if (watched) {
        watched.lastLiveSeenAt =
          Date.now();
      }
    }
  }

  return {
    tokens:
      active,

    swapEvents,

    liquidityEvents,

    unknownPoolIds,

    unknownSwapEvents,

    unknownLiquidityEvents
  };
}

function activityForToken(
  watched,
  logs
) {
  const poolIds =
    new Set(
      (
        watched.pools ||
        []
      )
        .map(
          pool =>
            normalize(
              pool.poolId
            )
        )
        .filter(
          Boolean
        )
    );

  let swaps =
    0;

  let liquidityEvents =
    0;

  for (
    const log
    of logs
  ) {
    const topic0 =
      normalize(
        log?.topics?.[0]
      );

    const poolId =
      normalize(
        log?.topics?.[1]
      );

    if (
      !poolIds.has(
        poolId
      )
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
      poolIds.size >
      0
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
  const response =
    await rpc(
      env,
      "eth_call",

      [
        {
          to:
            token,

          data
        },

        "latest"
      ],

      budget,
      "analysis"
    );

  if (
    !response.result
  ) {
    throw new Error(
      response.error ||
      "ETH_CALL_FAILED"
    );
  }

  return response.result;
}

function decodeUint(hex) {
  try {
    return BigInt(
      hex
    );
  }

  catch {
    return null;
  }
}

function decodeBytes32String(
  hex
) {
  try {
    const raw =
      String(
        hex || ""
      ).replace(
        /^0x/,
        ""
      );

    if (
      raw.length !==
      64
    ) {
      return null;
    }

    const bytes =
      new Uint8Array(
        (
          raw.match(
            /.{2}/g
          ) || []
        ).map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    return (
      new TextDecoder()
        .decode(
          bytes
        )
        .replace(
          /\0/g,
          ""
        )
        .trim() ||
      null
    );
  }

  catch {
    return null;
  }
}

function decodeString(hex) {
  try {
    const raw =
      String(
        hex || ""
      ).replace(
        /^0x/,
        ""
      );

    if (!raw) {
      return null;
    }

    if (
      raw.length ===
      64
    ) {
      return decodeBytes32String(
        "0x" +
        raw
      );
    }

    if (
      raw.length <
      128
    ) {
      return null;
    }

    const offset =
      Number(
        BigInt(
          "0x" +
          raw.slice(
            0,
            64
          )
        )
      ) * 2;

    if (
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
      length <= 0 ||
      length > 1024
    ) {
      return null;
    }

    const data =
      raw.slice(
        offset + 64,

        offset +
          64 +
          length * 2
      );

    const bytes =
      new Uint8Array(
        (
          data.match(
            /.{2}/g
          ) || []
        ).map(
          value =>
            parseInt(
              value,
              16
            )
        )
      );

    return (
      new TextDecoder()
        .decode(
          bytes
        )
        .replace(
          /\0/g,
          ""
        )
        .trim() ||
      null
    );
  }

  catch {
    return null;
  }
}

function reusableMetadata(
  watched
) {
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
    Date.now() -
      verifiedAt >
      METADATA_REUSE_MS
  ) {
    return null;
  }

  return {
    ...metadata,

    reused:
      true
  };
}

function estimatedAnalysisCost(
  env,
  watched
) {
  if (
    watched
      ?.excludedReason
  ) {
    return 1;
  }

  if (
    reusableMetadata(
      watched
    )
  ) {
    return CACHED_ANALYSIS_COST;
  }

  return env.ALCHEMY_API_KEY
    ? FRESH_ANALYSIS_COST_ALCHEMY
    : FRESH_ANALYSIS_COST_FALLBACK;
}

async function verifyERC20(
  env,
  address,
  budget,
  watched
) {
  const cached =
    reusableMetadata(
      watched
    );

  if (cached) {
    return cached;
  }

  if (
    !budgetAvailable(
      budget,
      "analysis",
      5
    )
  ) {
    return {
      validERC20:
        false,

      deferred:
        true,

      reason:
        "ANALYSIS_BUDGET_PROTECTED",

      requiredRequests:
        5
    };
  }

  const code =
    await rpc(
      env,
      "eth_getCode",

      [
        address,
        "latest"
      ],

      budget,
      "analysis"
    );

  if (
    !code.result ||
    code.result ===
      "0x" ||
    code.result ===
      "0x0"
  ) {
    return {
      validERC20:
        false,

      deferred:
        false,

      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  let name =
    null;

  let symbol =
    null;

  let decimals =
    null;

  let totalSupply =
    null;

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
  }

  catch {}

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
  }

  catch {}

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

    if (
      value !== null
    ) {
      decimals =
        Number(
          value
        );
    }
  }

  catch {}

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
  }

  catch {}

  const score =
    (
      name
        ? 1
        : 0
    ) +
    (
      symbol
        ? 1
        : 0
    ) +
    (
      Number.isFinite(
        decimals
      )
        ? 1
        : 0
    ) +
    (
      totalSupply !==
        null &&
      totalSupply >
        0n
        ? 1
        : 0
    );

  if (
    score <
    3
  ) {
    return {
      validERC20:
        false,

      deferred:
        false,

      reason:
        "ERC20_METHODS_NOT_VERIFIED",

      name,

      symbol,

      decimals,

      totalSupply:
        totalSupply !==
          null
          ? totalSupply.toString()
          : null
    };
  }

  return {
    validERC20:
      true,

    deferred:
      false,

    reason:
      "VERIFIED",

    address,

    name,

    symbol,

    decimals,

    totalSupply:
      totalSupply !==
        null
        ? totalSupply.toString()
        : null,

    verifiedAt:
      Date.now(),

    reused:
      false
  };
}

/* =========================================================
   DEXSCREENER CACHE + 429 PROTECTION
   ========================================================= */

function cachedMarket(
  watched,
  maxAge
) {
  const cache =
    watched?.marketCache;

  if (
    !cache ||
    typeof cache !==
      "object"
  ) {
    return null;
  }

  const timestamp =
    safeNumber(
      cache.timestamp
    );

  if (!timestamp) {
    return null;
  }

  const age =
    Date.now() -
    timestamp;

  if (
    age < 0 ||
    age >
      maxAge
  ) {
    return null;
  }

  if (
    !cache.data ||
    typeof cache.data !==
      "object"
  ) {
    return null;
  }

  return {
    ...cache.data,

    cached:
      true,

    cacheAgeMs:
      age
  };
}

function saveMarketCache(
  watched,
  data
) {
  if (!watched) {
    return;
  }

  if (
    data?.status ===
      "HTTP_429" ||
    data?.status ===
      "DEXSCREENER_COOLDOWN"
  ) {
    return;
  }

  watched.marketCache = {
    timestamp:
      Date.now(),

    data: {
      ...data,

      cached:
        false,

      cacheAgeMs:
        0
    }
  };
}

function dexService(
  state
) {
  state.services =
    state.services ||
    {};

  state.services.dexscreener =
    state.services.dexscreener ||
    {
      cooldownUntil:
        null,

      last429At:
        null,

      lastSuccessAt:
        null,

      lastStatus:
        null,

      total429s:
        0
    };

  return state.services
    .dexscreener;
}

async function marketData(
  token,
  budget,
  watched,
  state
) {
  const freshCache =
    cachedMarket(
      watched,
      MARKET_CACHE_MS
    );

  if (
    freshCache
  ) {
    return {
      ...freshCache,

      source:
        "CACHE"
    };
  }

  const service =
    dexService(
      state
    );

  const cooldownUntil =
    safeNumber(
      service.cooldownUntil
    );

  if (
    cooldownUntil &&
    Date.now() <
      cooldownUntil
  ) {
    const stale =
      cachedMarket(
        watched,
        MARKET_STALE_CACHE_MS
      );

    if (
      stale
    ) {
      return {
        ...stale,

        source:
          "STALE_CACHE_429",

        rateLimited:
          true,

        cooldownUntil
      };
    }

    return {
      verified:
        false,

      status:
        "DEXSCREENER_COOLDOWN",

      rateLimited:
        true,

      cooldownUntil,

      cached:
        false
    };
  }

  if (
    !consumeBudget(
      budget,
      "analysis",
      "DEXSCREENER"
    )
  ) {
    return {
      verified:
        false,

      status:
        "ANALYSIS_BUDGET_PROTECTED"
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

    if (
      response.status ===
      429
    ) {
      service.last429At =
        Date.now();

      service.cooldownUntil =
        Date.now() +
        DEXSCREENER_429_COOLDOWN_MS;

      service.lastStatus =
        "HTTP_429";

      service.total429s =
        safeNumber(
          service.total429s
        ) + 1;

      const stale =
        cachedMarket(
          watched,
          MARKET_STALE_CACHE_MS
        );

      if (stale) {
        return {
          ...stale,

          source:
            "STALE_CACHE_AFTER_429",

          rateLimited:
            true,

          cooldownUntil:
            service.cooldownUntil
        };
      }

      return {
        verified:
          false,

        status:
          "HTTP_429",

        rateLimited:
          true,

        cooldownUntil:
          service.cooldownUntil,

        cached:
          false
      };
    }

    if (
      !response.ok
    ) {
      service.lastStatus =
        `HTTP_${response.status}`;

      return {
        verified:
          false,

        status:
          `HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(
        data
      )
        ? data
        : [];

    if (
      !pairs.length
    ) {
      service.lastStatus =
        "NO_MARKET_FOUND";

      const result = {
        verified:
          false,

        status:
          "NO_MARKET_FOUND",

        cached:
          false,

        source:
          "DEXSCREENER"
      };

      saveMarketCache(
        watched,
        result
      );

      return result;
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

    const pair =
      pairs[0];

    const buys =
      safeNumber(
        pair?.txns?.h1
          ?.buys
      );

    const sells =
      safeNumber(
        pair?.txns?.h1
          ?.sells
      );

    const transactions =
      buys +
      sells;

    const result = {
      verified:
        true,

      status:
        "VERIFIED",

      cached:
        false,

      source:
        "DEXSCREENER",

      pairAddress:
        pair?.pairAddress ||
        null,

      url:
        pair?.url ||
        null,

      priceUsd:
        pair?.priceUsd ||
        null,

      liquidityUsd:
        safeNumber(
          pair?.liquidity
            ?.usd
        ),

      marketCap:
        safeNumber(
          pair?.marketCap
        ) ||
        null,

      fdv:
        safeNumber(
          pair?.fdv
        ) ||
        null,

      volume: {
        m5:
          safeNumber(
            pair?.volume
              ?.m5
          ),

        h1:
          safeNumber(
            pair?.volume
              ?.h1
          ),

        h24:
          safeNumber(
            pair?.volume
              ?.h24
          )
      },

      transactions: {
        h1: {
          buys,
          sells
        }
      },

      buyPressure1h:
        transactions >
          0
          ? (
              buys /
              transactions
            ) * 100
          : null,

      pairCreatedAt:
        safeNumber(
          pair
            ?.pairCreatedAt
        ) ||
        null
    };

    service.cooldownUntil =
      null;

    service.lastSuccessAt =
      Date.now();

    service.lastStatus =
      "VERIFIED";

    saveMarketCache(
      watched,
      result
    );

    return result;
  }

  catch (error) {
    service.lastStatus =
      "DEXSCREENER_ERROR";

    return {
      verified:
        false,

      status:
        "DEXSCREENER_ERROR",

      error:
        errorString(
          error
        )
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
    const response =
      await fetch(
        BLOCKSCOUT +
          path,

        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (
      !response.ok
    ) {
      return null;
    }

    return await response.json();
  }

  catch {
    return null;
  }
}

function extractCounterData(
  data
) {
  if (
    !data ||
    typeof data !==
      "object"
  ) {
    return {
      holderCount:
        null,

      transferCount:
        null
    };
  }

  const holderRaw =
    data.token_holders_count ??
    data.holders_count ??
    data.holders ??
    data.holder_count ??
    null;

  const transferRaw =
    data.transfers_count ??
    data.token_transfers_count ??
    data.transfer_count ??
    null;

  const holderNumber =
    Number(
      holderRaw
    );

  const transferNumber =
    Number(
      transferRaw
    );

  return {
    holderCount:
      Number.isFinite(
        holderNumber
      )
        ? holderNumber
        : null,

    transferCount:
      Number.isFinite(
        transferNumber
      )
        ? transferNumber
        : null
  };
}

/* =========================================================
   HOLDER HELPERS
   ========================================================= */

function holderPercent(
  value,
  supply
) {
  try {
    const held =
      BigInt(
        String(
          value
        )
      );

    const total =
      BigInt(
        String(
          supply
        )
      );

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
  }

  catch {
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
    typeof item?.address
      ?.hash ===
      "string"
  ) {
    return item.address
      .hash;
  }

  if (
    typeof item
      ?.address_hash ===
      "string"
  ) {
    return item.address_hash;
  }

  return null;
}

function extractHolderValue(
  item
) {
  const value =
    item?.value ??
    item?.token?.value ??
    item?.balance ??
    item?.token_balance ??
    null;

  if (
    value ===
      null ||
    value ===
      undefined ||
    value ===
      ""
  ) {
    return "0";
  }

  return String(
    value
  );
}

function positiveHolderBalance(
  holder
) {
  try {
    return (
      BigInt(
        String(
          holder?.value ||
          "0"
        )
      ) > 0n
    );
  }

  catch {
    return false;
  }
}

/* =========================================================
   V86 INFRASTRUCTURE HOLDER DETECTION
   ========================================================= */

function infrastructureHolderReason(
  holderAddress,
  tokenAddress
) {
  const address =
    normalize(
      holderAddress
    );

  const token =
    normalize(
      tokenAddress
    );

  if (
    !address
  ) {
    return null;
  }

  if (
    address ===
    normalize(
      POOL_MANAGER
    )
  ) {
    return "UNISWAP_V4_POOL_MANAGER";
  }

  if (
    address ===
    ZERO
  ) {
    return "ZERO_ADDRESS";
  }

  if (
    address ===
    DEAD
  ) {
    return "DEAD_ADDRESS";
  }

  if (
    token &&
    address ===
      token
  ) {
    return "TOKEN_CONTRACT";
  }

  return null;
}

/* =========================================================
   HOLDER INTEGRITY
   ========================================================= */

function validateHolderIntegrity(
  rawHolders,
  totalSupply
) {
  let supply;

  try {
    supply =
      BigInt(
        String(
          totalSupply
        )
      );
  }

  catch {
    return {
      verified:
        false,

      status:
        "INVALID_TOTAL_SUPPLY",

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        String(
          totalSupply ||
          ""
        ),

      topHolderBalanceSum:
        null
    };
  }

  if (
    supply <= 0n
  ) {
    return {
      verified:
        false,

      status:
        "INVALID_TOTAL_SUPPLY",

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        null
    };
  }

  let balanceSum =
    0n;

  let impossibleBalanceCount =
    0;

  for (
    const item
    of rawHolders
  ) {
    try {
      const value =
        BigInt(
          extractHolderValue(
            item
          )
        );

      if (
        value < 0n ||
        value >
          supply
      ) {
        impossibleBalanceCount++;

        continue;
      }

      balanceSum +=
        value;
    }

    catch {
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

  if (
    impossibleBalanceCount >
    0
  ) {
    return {
      verified:
        false,

      status:
        "IMPOSSIBLE_HOLDER_BALANCE",

      impossibleBalanceCount,

      percentageSum,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  if (
    balanceSum >
      supply ||
    percentageSum >
      100.000001
  ) {
    return {
      verified:
        false,

      status:
        "TOP_HOLDERS_EXCEED_TOTAL_SUPPLY",

      impossibleBalanceCount,

      percentageSum,

      supply:
        supply.toString(),

      topHolderBalanceSum:
        balanceSum.toString()
    };
  }

  return {
    verified:
      true,

    status:
      "VERIFIED",

    impossibleBalanceCount:
      0,

    percentageSum,

    supply:
      supply.toString(),

    topHolderBalanceSum:
      balanceSum.toString()
  };
}

function unverifiedHolders(
  reason =
    "NOT_VERIFIED"
) {
  return {
    verified:
      false,

    countersVerified:
      false,

    concentrationVerified:
      false,

    integrity: {
      verified:
        false,

      status:
        reason,

      impossibleBalanceCount:
        0,

      percentageSum:
        null,

      supply:
        null,

      ownershipSupply:
        null,

      infrastructureBalanceSum:
        null,

      infrastructureRows:
        0,

      topHolderBalanceSum:
        null
    },

    holderCount:
      null,

    transferCount:
      null,

    topHolders:
      [],

    infrastructureHolders:
      [],

    positiveHolderRows:
      0,

    whale: {
      verified:
        false,

      whaleCount:
        null,

      top1Percent:
        null,

      top5Percent:
        null,

      top10Percent:
        null,

      concentrationRisk:
        "UNVERIFIED",

      smartMoneyScore:
        0,

      smartMoneyCandidate:
        false
    }
  };
}

/* =========================================================
   HOLDER INTELLIGENCE — V86
   ========================================================= */

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

  const holders =
    await blockscout(
      `/api/v2/tokens/${token}/holders`,
      budget
    );

  if (
    !holders ||
    !Array.isArray(
      holders.items
    )
  ) {
    return unverifiedHolders(
      "BLOCKSCOUT_HOLDERS_UNAVAILABLE"
    );
  }

  let counters =
    null;

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    counters =
      await blockscout(
        `/api/v2/tokens/${token}/counters`,
        budget
      );
  }

  let counterData =
    extractCounterData(
      counters
    );

  let counterSource =
    counters
      ? "COUNTERS"
      : null;

  if (
    (
      counterData
        .holderCount ===
        null ||
      counterData
        .transferCount ===
        null
    ) &&
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    const details =
      await blockscout(
        `/api/v2/tokens/${token}`,
        budget
      );

    if (
      details
    ) {
      const fallback =
        extractCounterData(
          details
        );

      if (
        counterData
          .holderCount ===
        null
      ) {
        counterData
          .holderCount =
          fallback.holderCount;
      }

      if (
        counterData
          .transferCount ===
        null
      ) {
        counterData
          .transferCount =
          fallback.transferCount;
      }

      counterSource =
        "TOKEN_DETAILS_FALLBACK";
    }
  }

  const holderCount =
    counterData
      .holderCount;

  const transferCount =
    counterData
      .transferCount;

  const countersVerified =
    holderCount !==
      null ||
    transferCount !==
      null;

  if (
    holders.items.length ===
    0
  ) {
    return {
      ...unverifiedHolders(
        "NO_HOLDER_ROWS"
      ),

      verified:
        countersVerified,

      countersVerified,

      counterSource,

      holderCount,

      transferCount
    };
  }

  const items =
    holders.items.slice(
      0,
      10
    );

  const integrity =
    validateHolderIntegrity(
      items,
      totalSupply
    );

  if (
    !integrity.verified
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity,

      holderCount,

      transferCount,

      topHolders:
        [],

      infrastructureHolders:
        [],

      positiveHolderRows:
        0,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false,

        reason:
          integrity.status
      }
    };
  }

  let supply;

  try {
    supply =
      BigInt(
        String(
          totalSupply
        )
      );
  }

  catch {
    return unverifiedHolders(
      "INVALID_TOTAL_SUPPLY"
    );
  }

  /*
   * First identify infrastructure balances.
   */
  let infrastructureBalanceSum =
    0n;

  const prepared =
    items.map(
      item => {
        const address =
          extractHolderAddress(
            item
          );

        const value =
          extractHolderValue(
            item
          );

        let valueBig =
          0n;

        try {
          valueBig =
            BigInt(
              value
            );
        }

        catch {}

        const infrastructureReason =
          infrastructureHolderReason(
            address,
            token
          );

        if (
          infrastructureReason &&
          valueBig > 0n
        ) {
          infrastructureBalanceSum +=
            valueBig;
        }

        return {
          address,

          value,

          valueBig,

          infrastructureReason
        };
      }
    );

  /*
   * Ownership supply excludes balances definitely held by
   * known infrastructure inside the returned top-holder set.
   */
  const ownershipSupply =
    supply -
    infrastructureBalanceSum;

  if (
    ownershipSupply <=
    0n
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "NO_POSITIVE_OWNERSHIP_SUPPLY",

        ownershipSupply:
          ownershipSupply.toString(),

        infrastructureBalanceSum:
          infrastructureBalanceSum.toString(),

        infrastructureRows:
          prepared.filter(
            holder =>
              holder.infrastructureReason
          ).length
      },

      holderCount,

      transferCount,

      topHolders:
        [],

      infrastructureHolders:
        [],

      positiveHolderRows:
        0,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false,

        reason:
          "NO_POSITIVE_OWNERSHIP_SUPPLY"
      }
    };
  }

  const topHolders =
    prepared.map(
      holder => {
        const rawSupplyPercentage =
          holderPercent(
            holder.value,
            supply.toString()
          );

        const percentage =
          holder.infrastructureReason
            ? null
            : holderPercent(
                holder.value,
                ownershipSupply.toString()
              );

        return {
          address:
            holder.address,

          value:
            holder.value,

          percentage,

          rawSupplyPercentage,

          infrastructure:
            Boolean(
              holder.infrastructureReason
            ),

          infrastructureReason:
            holder.infrastructureReason
        };
      }
    );

  const infrastructureHolders =
    topHolders.filter(
      holder =>
        holder.infrastructure
    );

  const positiveHolders =
    topHolders.filter(
      holder =>
        !holder.infrastructure &&
        holder.address &&
        holder.percentage !==
          null &&
        positiveHolderBalance(
          holder
        )
    );

  if (
    positiveHolders.length ===
    0
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "NO_POSITIVE_OWNERSHIP_BALANCES",

        ownershipSupply:
          ownershipSupply.toString(),

        infrastructureBalanceSum:
          infrastructureBalanceSum.toString(),

        infrastructureRows:
          infrastructureHolders.length
      },

      holderCount,

      transferCount,

      topHolders,

      infrastructureHolders,

      positiveHolderRows:
        0,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false,

        reason:
          "NO_POSITIVE_OWNERSHIP_BALANCES"
      }
    };
  }

  /*
   * Blockscout normally returns holders sorted descending,
   * but explicitly sort ownership rows so infrastructure
   * removal cannot disturb top-holder ordering.
   */
  positiveHolders.sort(
    (a, b) =>
      safeNumber(
        b.percentage
      ) -
      safeNumber(
        a.percentage
      )
  );

  const percentages =
    positiveHolders
      .map(
        holder =>
          holder.percentage
      )
      .filter(
        value =>
          Number.isFinite(
            value
          ) &&
          value >= 0 &&
          value <= 100
      );

  if (
    percentages.length ===
    0
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "NO_VALID_OWNERSHIP_PERCENTAGES",

        ownershipSupply:
          ownershipSupply.toString(),

        infrastructureBalanceSum:
          infrastructureBalanceSum.toString(),

        infrastructureRows:
          infrastructureHolders.length
      },

      holderCount,

      transferCount,

      topHolders,

      infrastructureHolders,

      positiveHolderRows:
        0,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false
      }
    };
  }

  const top1 =
    percentages[0];

  const top5 =
    percentages
      .slice(
        0,
        5
      )
      .reduce(
        (
          a,
          b
        ) =>
          a + b,
        0
      );

  const top10 =
    percentages
      .slice(
        0,
        10
      )
      .reduce(
        (
          a,
          b
        ) =>
          a + b,
        0
      );

  if (
    top5 >
      100.000001 ||
    top10 >
      100.000001
  ) {
    return {
      verified:
        countersVerified,

      countersVerified,

      counterSource,

      concentrationVerified:
        false,

      integrity: {
        ...integrity,

        verified:
          false,

        status:
          "OWNERSHIP_PERCENTAGE_SUM_EXCEEDS_100",

        ownershipSupply:
          ownershipSupply.toString(),

        infrastructureBalanceSum:
          infrastructureBalanceSum.toString(),

        infrastructureRows:
          infrastructureHolders.length,

        percentageSum:
          top10
      },

      holderCount,

      transferCount,

      topHolders,

      infrastructureHolders,

      positiveHolderRows:
        positiveHolders.length,

      whale: {
        verified:
          false,

        whaleCount:
          null,

        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null,

        concentrationRisk:
          "UNVERIFIED",

        smartMoneyScore:
          0,

        smartMoneyCandidate:
          false,

        reason:
          "OWNERSHIP_PERCENTAGE_SUM_EXCEEDS_100"
      }
    };
  }

  const whales =
    positiveHolders.filter(
      holder =>
        holder.percentage >=
        1
    );

  let concentrationRisk =
    "LOW";

  if (
    top1 >= 20 ||
    top10 >= 80
  ) {
    concentrationRisk =
      "HIGH";
  }

  else if (
    top1 >= 10 ||
    top10 >= 60
  ) {
    concentrationRisk =
      "MEDIUM";
  }

  let smartMoneyScore =
    0;

  if (
    whales.length >= 2
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    whales.length >= 4
  ) {
    smartMoneyScore +=
      15;
  }

  if (
    top10 > 0 &&
    top10 <= 60
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    top1 <= 15
  ) {
    smartMoneyScore +=
      15;
  }

  if (
    concentrationRisk ===
    "HIGH"
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
    verified:
      true,

    countersVerified,

    counterSource,

    concentrationVerified:
      true,

    integrity: {
      ...integrity,

      ownershipSupply:
        ownershipSupply.toString(),

      infrastructureBalanceSum:
        infrastructureBalanceSum.toString(),

      infrastructureRows:
        infrastructureHolders.length,

      ownershipConcentrationBasis:
        "TOTAL_SUPPLY_MINUS_KNOWN_INFRASTRUCTURE"
    },

    holderCount,

    transferCount,

    topHolders,

    infrastructureHolders,

    positiveHolderRows:
      positiveHolders.length,

    whale: {
      verified:
        true,

      whaleCount:
        whales.length,

      top1Percent:
        top1,

      top5Percent:
        top5,

      top10Percent:
        top10,

      concentrationRisk,

      smartMoneyScore,

      smartMoneyCandidate:
        smartMoneyScore >=
        55,

      infrastructureExcluded:
        infrastructureHolders.length
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
      normalize(
        address
      )
    ];

  if (
    !Array.isArray(
      snapshots
    ) ||
    !snapshots.length
  ) {
    return null;
  }

  const current =
    Date.now();

  for (
    let i =
      snapshots.length -
      1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i]
          .timestamp
      );

    if (
      age >=
      MOMENTUM_IDEAL_HISTORY_MS
    ) {
      return snapshots[i];
    }
  }

  for (
    let i =
      snapshots.length -
      1;
    i >= 0;
    i--
  ) {
    const age =
      current -
      safeNumber(
        snapshots[i]
          .timestamp
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

function createSnapshot(
  candidate
) {
  const concentrationVerified =
    Boolean(
      candidate.holders
        ?.concentrationVerified &&
      candidate.holders
        ?.whale?.verified
    );

  return {
    timestamp:
      Date.now(),

    holderCount:
      candidate.holders
        ?.countersVerified
        ? candidate.holders
            .holderCount
        : null,

    transferCount:
      candidate.holders
        ?.countersVerified
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

    volumeH1:
      candidate.market
        ?.verified
        ? candidate.market
            .volume?.h1
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

    top1Percent:
      concentrationVerified
        ? candidate.holders
            .whale
            .top1Percent
        : null,

    top10Percent:
      concentrationVerified
        ? candidate.holders
            .whale
            .top10Percent
        : null,

    whaleBalances:
      concentrationVerified
        ? (
            candidate.holders
              .topHolders ||
            []
          )
            .filter(
              holder =>
                holder.address &&
                !holder.infrastructure &&
                holder.percentage !==
                  null &&
                positiveHolderBalance(
                  holder
                )
            )
            .map(
              holder => ({
                address:
                  holder.address,

                value:
                  holder.value,

                percentage:
                  holder.percentage
              })
            )
        : [],

    holderIntegrity:
      candidate.holders
        ?.integrity
        ?.status ||
      "UNVERIFIED"
  };
}

function saveSnapshot(
  state,
  candidate
) {
  const address =
    normalize(
      candidate.address
    );

  let snapshots =
    state.snapshots[
      address
    ];

  if (
    !Array.isArray(
      snapshots
    )
  ) {
    snapshots =
      [];
  }

  const last =
    snapshots.length
      ? snapshots[
          snapshots.length -
          1
        ]
      : null;

  if (
    last &&
    Date.now() -
      safeNumber(
        last.timestamp
      ) <
      MIN_SNAPSHOT_INTERVAL
  ) {
    return;
  }

  snapshots.push(
    createSnapshot(
      candidate
    )
  );

  state.snapshots[
    address
  ] =
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
      verified:
        false,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

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

  if (
    historyAgeMs <
    MOMENTUM_MIN_HISTORY_MS
  ) {
    return {
      verified:
        false,

      score:
        0,

      label:
        "BUILDING_HISTORY",

      positiveSignals:
        0,

      historyAgeMinutes:
        historyAgeMs /
        60000,

      reasons: [
        "Historical snapshot too recent"
      ]
    };
  }

  const countersUsable =
    Boolean(
      holders
        ?.countersVerified
    );

  const holderGrowth =
    countersUsable
      ? percentChange(
          previous
            .holderCount,

          holders
            .holderCount
        )
      : null;

  const transferGrowth =
    countersUsable
      ? percentChange(
          previous
            .transferCount,

          holders
            .transferCount
        )
      : null;

  const liquidityGrowth =
    market?.verified
      ? percentChange(
          previous
            .liquidityUsd,

          market
            .liquidityUsd
        )
      : null;

  const volumeGrowth =
    market?.verified
      ? percentChange(
          previous
            .volumeH1,

          market.volume
            ?.h1
        )
      : null;

  const oldTx =
    safeNumber(
      previous
        .buysH1
    ) +
    safeNumber(
      previous
        .sellsH1
    );

  const newTx =
    safeNumber(
      market
        ?.transactions
        ?.h1
        ?.buys
    ) +
    safeNumber(
      market
        ?.transactions
        ?.h1
        ?.sells
    );

  const txGrowth =
    market?.verified
      ? percentChange(
          oldTx,
          newTx
        )
      : null;

  let score =
    0;

  let positiveSignals =
    0;

  const reasons =
    [];

  if (
    holderGrowth !==
      null &&
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
    transferGrowth !==
      null &&
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

  if (
    liquidityGrowth !==
    null
  ) {
    if (
      liquidityGrowth >=
      20
    ) {
      positiveSignals++;

      score +=
        18;

      reasons.push(
        `Liquidity acceleration ${liquidityGrowth.toFixed(1)}%`
      );
    }

    else if (
      liquidityGrowth >=
      5
    ) {
      positiveSignals++;

      score +=
        10;
    }

    else if (
      liquidityGrowth <=
      -20
    ) {
      score -=
        20;

      reasons.push(
        `Liquidity falling ${liquidityGrowth.toFixed(1)}%`
      );
    }
  }

  if (
    volumeGrowth !==
      null &&
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
    txGrowth !==
      null &&
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
    market
      ?.buyPressure1h !==
      null &&
    market
      ?.buyPressure1h >=
      60
  ) {
    positiveSignals++;

    score +=
      market
        .buyPressure1h >=
        70
        ? 12
        : 7;

    reasons.push(
      "Positive buy pressure"
    );
  }

  if (
    positiveSignals >=
    4
  ) {
    score +=
      10;

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
        market
          ?.verified ||
        countersUsable
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
      historyAgeMs /
      60000,

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
   WHALE FLOW
   ========================================================= */

function analyseWhaleFlow(
  previous,
  holders
) {
  if (
    !previous ||
    !holders
      ?.concentrationVerified ||
    !holders
      ?.whale?.verified
  ) {
    return {
      verified:
        false,

      flow:
        "BUILDING_HISTORY",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      score:
        0,

      reasons:
        holders?.integrity &&
        holders.integrity
          .verified ===
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
        previous
          .whaleBalances ||
        []
      )
        .filter(
          holder =>
            holder.address
        )
        .map(
          holder => [
            normalize(
              holder.address
            ),

            holder
          ]
        )
    );

  let increasing =
    0;

  let decreasing =
    0;

  let comparable =
    0;

  for (
    const holder
    of holders
      .topHolders ||
      []
  ) {
    if (
      holder.infrastructure ||
      !holder.address ||
      holder.percentage ===
        null
    ) {
      continue;
    }

    const old =
      previousMap.get(
        normalize(
          holder.address
        )
      );

    if (!old) {
      continue;
    }

    try {
      const oldValue =
        BigInt(
          String(
            old.value ||
            "0"
          )
        );

      const newValue =
        BigInt(
          String(
            holder.value ||
            "0"
          )
        );

      comparable++;

      if (
        newValue >
        oldValue
      ) {
        increasing++;
      }

      if (
        newValue <
        oldValue
      ) {
        decreasing++;
      }
    }

    catch {}
  }

  let score =
    0;

  const reasons =
    [];

  let flow =
    "MIXED";

  if (
    comparable >= 2 &&
    increasing >
      decreasing
  ) {
    flow =
      "NET_ACCUMULATION";

    score +=
      25;

    reasons.push(
      `${increasing} tracked top wallets increased balances`
    );
  }

  if (
    comparable >= 2 &&
    decreasing >
      increasing
  ) {
    flow =
      "NET_DISTRIBUTION";

    score -=
      20;

    reasons.push(
      `${decreasing} tracked top wallets reduced balances`
    );
  }

  const oldTop10 =
    Number(
      previous
        .top10Percent
    );

  const newTop10 =
    Number(
      holders
        .whale
        .top10Percent
    );

  if (
    Number.isFinite(
      oldTop10
    ) &&
    Number.isFinite(
      newTop10
    ) &&
    oldTop10 >= 0 &&
    oldTop10 <= 100 &&
    newTop10 >= 0 &&
    newTop10 <= 100
  ) {
    const change =
      newTop10 -
      oldTop10;

    if (
      change >= 2 &&
      newTop10 < 70
    ) {
      score +=
        10;

      reasons.push(
        "Top holders increasing positions"
      );
    }

    if (
      newTop10 >=
      80
    ) {
      score -=
        20;

      reasons.push(
        "Dangerous concentration"
      );
    }
  }

  return {
    verified:
      comparable >
      0,

    flow,

    accumulation:
      flow ===
      "NET_ACCUMULATION"
        ? "OBSERVED"
        : "NOT_OBSERVED",

    distribution:
      flow ===
      "NET_DISTRIBUTION"
        ? "OBSERVED"
        : "NOT_OBSERVED",

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
   MARKET QUALITY
   ========================================================= */

function marketQuality(
  market
) {
  if (
    !market
      ?.verified
  ) {
    return {
      verified:
        false,

      score:
        0,

      reasons:
        []
    };
  }

  const liquidity =
    safeNumber(
      market
        .liquidityUsd
    );

  const marketCap =
    safeNumber(
      market
        .marketCap
    );

  const volume =
    safeNumber(
      market.volume
        ?.h24
    );

  let score =
    0;

  const reasons =
    [];

  let liquidityMarketCapRatio =
    null;

  if (
    liquidity > 0 &&
    marketCap > 0
  ) {
    liquidityMarketCapRatio =
      (
        liquidity /
        marketCap
      ) * 100;

    if (
      liquidityMarketCapRatio >=
        10 &&
      liquidityMarketCapRatio <=
        60
    ) {
      score +=
        20;

      reasons.push(
        "Healthy liquidity/market-cap ratio"
      );
    }

    else if (
      liquidityMarketCapRatio >=
      5
    ) {
      score +=
        10;
    }

    if (
      liquidityMarketCapRatio <
      2
    ) {
      score -=
        15;
    }
  }

  let volumeLiquidityRatio =
    null;

  if (
    volume > 0 &&
    liquidity > 0
  ) {
    volumeLiquidityRatio =
      volume /
      liquidity;

    if (
      volumeLiquidityRatio >=
      1
    ) {
      score +=
        15;

      reasons.push(
        "Strong volume/liquidity ratio"
      );
    }

    else if (
      volumeLiquidityRatio >=
      0.25
    ) {
      score +=
        8;
    }
  }

  if (
    market
      .buyPressure1h !==
      null &&
    market
      .buyPressure1h >=
      60
  ) {
    score +=
      10;
  }

  return {
    verified:
      true,

    score:
      clamp(
        score,
        0,
        100
      ),

    liquidityMarketCapRatio,

    volumeLiquidityRatio,

    reasons
  };
}

/* =========================================================
   LAUNCH STAGE
   ========================================================= */

function launchStage(
  market
) {
  if (
    !market
      ?.verified ||
    !safeNumber(
      market
        .pairCreatedAt
    )
  ) {
    return {
      verified:
        false,

      ageMinutes:
        null,

      stage:
        "UNVERIFIED",

      score:
        0
    };
  }

  const ageMs =
    Math.max(
      0,

      Date.now() -
      safeNumber(
        market
          .pairCreatedAt
      )
    );

  const ageMinutes =
    ageMs /
    60000;

  let stage =
    "MATURE";

  let score =
    0;

  if (
    ageMs <=
    15 * 60 * 1000
  ) {
    stage =
      "JUST_LAUNCHED";

    score =
      100;
  }

  else if (
    ageMs <=
    60 * 60 * 1000
  ) {
    stage =
      "VERY_EARLY";

    score =
      90;
  }

  else if (
    ageMs <=
    2 * 60 * 60 * 1000
  ) {
    stage =
      "EARLY";

    score =
      80;
  }

  else if (
    ageMs <=
    6 * 60 * 60 * 1000
  ) {
    stage =
      "EMERGING";

    score =
      65;
  }

  else if (
    ageMs <=
    24 * 60 * 60 * 1000
  ) {
    stage =
      "YOUNG";

    score =
      45;
  }

  return {
    verified:
      true,

    ageMinutes,

    stage,

    score
  };
}

/* =========================================================
   RISK — V86 EVIDENCE GATE
   ========================================================= */

function scoreRisk(
  token,
  market,
  holders,
  activity,
  whaleFlow
) {
  /*
   * V86:
   *
   * ERC20 validity alone is not enough evidence to call a
   * token LOW risk.
   */
  const evidence = {
    market:
      Boolean(
        market
          ?.verified
      ),

    concentration:
      Boolean(
        holders
          ?.concentrationVerified &&
        holders
          ?.whale
          ?.verified
      ),

    liveActivity:
      safeNumber(
        activity
          ?.swaps
      ) > 0,

    holderCounters:
      Boolean(
        holders
          ?.countersVerified
      )
  };

  const meaningfulEvidenceCount =
    [
      evidence.market,
      evidence.concentration,
      evidence.liveActivity
    ].filter(
      Boolean
    ).length;

  if (
    meaningfulEvidenceCount ===
    0
  ) {
    return {
      verified:
        false,

      score:
        null,

      label:
        "UNVERIFIED",

      evidence,

      reasons: [
        "Insufficient market, holder-concentration and live-activity evidence"
      ]
    };
  }

  let score =
    50;

  const reasons =
    [];

  if (
    token.validERC20
  ) {
    score -=
      15;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    activity.swaps >
    0
  ) {
    score -=
      7;

    reasons.push(
      "Active V4 swaps"
    );
  }

  if (
    market
      ?.verified
  ) {
    score -=
      5;

    if (
      market
        .liquidityUsd >=
      10000
    ) {
      score -=
        8;
    }

    if (
      market
        .liquidityUsd <
      1000
    ) {
      score +=
        15;

      reasons.push(
        "Very low liquidity"
      );
    }
  }

  const whale =
    holders
      ?.whale;

  if (
    holders
      ?.concentrationVerified &&
    whale
      ?.verified
  ) {
    if (
      whale
        .concentrationRisk ===
      "HIGH"
    ) {
      score +=
        25;

      reasons.push(
        "High whale concentration"
      );
    }

    else if (
      whale
        .concentrationRisk ===
      "MEDIUM"
    ) {
      score +=
        10;

      reasons.push(
        "Medium whale concentration"
      );
    }

    if (
      whale
        .top1Percent !==
        null &&
      whale
        .top1Percent >
        40
    ) {
      score +=
        15;

      reasons.push(
        "Extreme top-holder concentration"
      );
    }
  }

  else if (
    holders
      ?.integrity
      ?.verified ===
      false
  ) {
    reasons.push(
      `Holder concentration unverified: ${holders.integrity.status}`
    );
  }

  if (
    whaleFlow
      ?.verified &&
    whaleFlow
      .flow ===
      "NET_DISTRIBUTION"
  ) {
    score +=
      10;

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
    verified:
      true,

    score,

    label:
      score >= 80
        ? "HIGH"
        : score >= 60
          ? "MEDIUM"
          : "LOW",

    evidence,

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
  whaleFlow,
  launch
) {
  let score =
    0;

  const reasons =
    [];

  if (
    token.validERC20
  ) {
    score +=
      20;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    token.name &&
    token.symbol
  ) {
    score +=
      5;
  }

  if (
    activity.swaps >
    0
  ) {
    score +=
      10;

    reasons.push(
      "V4 swaps detected"
    );
  }

  if (
    activity
      .liquidityEvents >
    0
  ) {
    score +=
      5;
  }

  if (
    market
      ?.verified
  ) {
    score +=
      10;

    if (
      market
        .liquidityUsd >=
      5000
    ) {
      score +=
        5;
    }

    if (
      market
        .liquidityUsd >=
      25000
    ) {
      score +=
        5;
    }

    if (
      market.volume
        ?.h24 >=
      10000
    ) {
      score +=
        5;
    }

    if (
      market.volume
        ?.h24 >=
      50000
    ) {
      score +=
        5;
    }

    if (
      market
        .buyPressure1h !==
        null &&
      market
        .buyPressure1h >=
        60
    ) {
      score +=
        7;

      reasons.push(
        "Strong buy pressure"
      );
    }

    if (
      market.marketCap &&
      market.marketCap >=
        25000 &&
      market.marketCap <=
        5000000
    ) {
      score +=
        5;

      reasons.push(
        "Early market-cap range"
      );
    }
  }

  if (
    launch
      ?.verified
  ) {
    if (
      launch.stage ===
      "JUST_LAUNCHED"
    ) {
      score +=
        10;

      reasons.push(
        "Just launched"
      );
    }

    else if (
      launch.stage ===
        "VERY_EARLY" ||
      launch.stage ===
        "EARLY"
    ) {
      score +=
        7;

      reasons.push(
        "Early launch"
      );
    }

    else if (
      launch.stage ===
      "EMERGING"
    ) {
      score +=
        4;
    }
  }

  if (
    holders
      ?.countersVerified
  ) {
    if (
      safeNumber(
        holders
          .holderCount
      ) >=
      50
    ) {
      score +=
        4;
    }

    if (
      safeNumber(
        holders
          .holderCount
      ) >=
      200
    ) {
      score +=
        4;
    }
  }

  if (
    holders
      ?.concentrationVerified &&
    holders
      .whale
      ?.verified &&
    safeNumber(
      holders
        .positiveHolderRows
    ) >
      0 &&
    holders
      .whale
      ?.concentrationRisk ===
      "LOW"
  ) {
    score +=
      5;

    reasons.push(
      "Healthy holder concentration"
    );
  }

  if (
    holders
      ?.concentrationVerified &&
    holders
      .whale
      ?.verified &&
    holders
      .whale
      ?.smartMoneyCandidate
  ) {
    score +=
      5;
  }

  if (
    holders
      ?.concentrationVerified &&
    holders
      .whale
      ?.verified &&
    holders
      .whale
      ?.concentrationRisk ===
      "HIGH"
  ) {
    score -=
      15;

    reasons.push(
      "Whale concentration penalty"
    );
  }

  if (
    momentum
      ?.verified
  ) {
    if (
      momentum.score >=
      75
    ) {
      score +=
        15;

      reasons.push(
        "Strong momentum"
      );
    }

    else if (
      momentum.score >=
      50
    ) {
      score +=
        10;
    }

    else if (
      momentum.score >=
      25
    ) {
      score +=
        5;
    }
  }

  if (
    quality
      ?.verified
  ) {
    if (
      quality.score >=
      40
    ) {
      score +=
        10;
    }

    else if (
      quality.score >=
      20
    ) {
      score +=
        5;
    }
  }

  if (
    whaleFlow
      ?.verified &&
    whaleFlow
      .flow ===
      "NET_ACCUMULATION"
  ) {
    score +=
      10;

    reasons.push(
      "Whale accumulation"
    );
  }

  if (
    whaleFlow
      ?.verified &&
    whaleFlow
      .flow ===
      "NET_DISTRIBUTION"
  ) {
    score -=
      10;

    reasons.push(
      "Whale distribution"
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
   SIGNAL CONFIRMATION
   ========================================================= */

function signalConfirmation(
  candidate
) {
  let signals =
    0;

  let score =
    0;

  const reasons =
    [];

  if (
    candidate.activity
      ?.swaps >
    0
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "V4 swap activity"
    );
  }

  if (
    candidate.activity
      ?.liquidityEvents >
    0
  ) {
    signals++;

    score +=
      8;

    reasons.push(
      "V4 liquidity activity"
    );
  }

  if (
    candidate.market
      ?.verified &&
    safeNumber(
      candidate.market
        .liquidityUsd
    ) >=
    5000
  ) {
    signals++;

    score +=
      12;

    reasons.push(
      "Liquidity confirmed"
    );
  }

  if (
    candidate.market
      ?.verified &&
    safeNumber(
      candidate.market
        .volume?.h24
    ) >=
    10000
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Trading volume confirmed"
    );
  }

  if (
    candidate.market
      ?.buyPressure1h !==
      null &&
    candidate.market
      ?.buyPressure1h >=
      60
  ) {
    signals++;

    score +=
      12;

    reasons.push(
      "Buy pressure confirmed"
    );
  }

  if (
    candidate.holders
      ?.countersVerified &&
    safeNumber(
      candidate.holders
        .holderCount
    ) >=
    50
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Holder base confirmed"
    );
  }

  if (
    candidate.momentum
      ?.verified &&
    candidate.momentum
      .score >=
    50
  ) {
    signals++;

    score +=
      18;

    reasons.push(
      "Momentum confirmed"
    );
  }

  if (
    candidate.whaleFlow
      ?.verified &&
    candidate.whaleFlow
      .flow ===
      "NET_ACCUMULATION"
  ) {
    signals++;

    score +=
      15;

    reasons.push(
      "Whale accumulation confirmed"
    );
  }

  if (
    candidate.holders
      ?.concentrationVerified &&
    candidate.holders
      ?.whale
      ?.verified &&
    safeNumber(
      candidate.holders
        ?.positiveHolderRows
    ) >
      0 &&
    candidate.holders
      ?.whale
      ?.concentrationRisk ===
      "LOW"
  ) {
    signals++;

    score +=
      10;

    reasons.push(
      "Healthy concentration confirmed"
    );
  }

  if (
    signals >=
    5
  ) {
    score +=
      10;
  }

  return {
    verified:
      signals >=
      2,

    signals,

    score:
      clamp(
        score,
        0,
        100
      ),

    label:
      signals >= 7
        ? "VERY_STRONG"
        : signals >= 5
          ? "STRONG"
          : signals >= 3
            ? "DEVELOPING"
            : signals >= 2
              ? "EARLY"
              : "WEAK",

    reasons
  };
}

/* =========================================================
   CONFIDENCE
   ========================================================= */

function candidateConfidence(
  candidate
) {
  let score =
    0;

  if (
    candidate.validERC20
  ) {
    score +=
      15;
  }

  if (
    candidate.market
      ?.verified
  ) {
    score +=
      20;
  }

  if (
    candidate.holders
      ?.countersVerified
  ) {
    score +=
      15;
  }

  if (
    candidate.activity
      ?.poolSpecific
  ) {
    score +=
      10;
  }

  if (
    candidate.activity
      ?.swaps >
    0
  ) {
    score +=
      10;
  }

  if (
    candidate.momentum
      ?.verified
  ) {
    score +=
      15;
  }

  if (
    candidate.marketQuality
      ?.verified
  ) {
    score +=
      10;
  }

  if (
    candidate.holders
      ?.concentrationVerified &&
    candidate.holders
      ?.whale
      ?.verified
  ) {
    score +=
      5;
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
          : "LOW"
  };
}

/* =========================================================
   PRIORITY
   ========================================================= */

function watchPriority(
  watched,
  newTokens,
  liveTokens
) {
  let score =
    1000;

  const address =
    normalize(
      watched.address
    );

  if (
    knownQuoteMetadata(
      address,
      watched.metadata
        ?.symbol
    )
  ) {
    return -10000;
  }

  if (
    watched
      .excludedReason
  ) {
    return -9000;
  }

  if (
    liveTokens
      ?.has(
        address
      )
  ) {
    score +=
      2500;
  }

  if (
    newTokens
      ?.has(
        address
      )
  ) {
    score +=
      1500;
  }

  if (
    watched.metadata
      ?.validERC20
  ) {
    score +=
      200;
  }

  const lastLive =
    safeNumber(
      watched
        .lastLiveSeenAt
    );

  if (
    lastLive &&
    Date.now() -
      lastLive <
      30 * 60 * 1000
  ) {
    score +=
      250;
  }

  const lastChecked =
    safeNumber(
      watched
        .lastCheckedAt
    );

  if (
    !lastChecked
  ) {
    score +=
      600;
  }

  else {
    score +=
      Math.min(
        500,

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
      watched
        .firstSeenAt
    );

  if (
    age >= 0 &&
    age <
      30 * 60 * 1000
  ) {
    score +=
      200;
  }

  else if (
    age >= 0 &&
    age <
      60 * 60 * 1000
  ) {
    score +=
      125;
  }

  else if (
    age >
    6 * 60 * 60 * 1000
  ) {
    score -=
      100;
  }

  score +=
    Math.min(
      80,

      (
        watched.pools
          ?.length ||
        0
      ) * 15
    );

  score -=
    Math.min(
      900,

      safeNumber(
        watched
          .invalidChecks
      ) * 300
    );

  return score;
}

function analysisPriority(
  candidate
) {
  let score =
    safeNumber(
      candidate
        .opportunity
        ?.score
    ) * 2;

  score +=
    safeNumber(
      candidate
        .confidence
        ?.score
    );

  score +=
    safeNumber(
      candidate
        .momentum
        ?.score
    );

  score +=
    safeNumber(
      candidate
        .marketQuality
        ?.score
    );

  score +=
    safeNumber(
      candidate
        .signalConfirmation
        ?.score
    );

  if (
    candidate
      .newlyDiscovered
  ) {
    score +=
      25;
  }

  if (
    candidate
      .liveDiscovery
  ) {
    score +=
      100;
  }

  if (
    candidate
      .whaleFlow
      ?.flow ===
      "NET_ACCUMULATION"
  ) {
    score +=
      30;
  }

  if (
    candidate
      .whaleFlow
      ?.flow ===
      "NET_DISTRIBUTION"
  ) {
    score -=
      30;
  }

  return score;
}

/* =========================================================
   TELEGRAM
   ========================================================= */

function escapeHtml(
  value
) {
  return String(
    value ??
    ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );
}

function formatNumber(
  value
) {
  const n =
    safeNumber(
      value
    );

  if (
    n >=
    1e9
  ) {
    return (
      n /
      1e9
    ).toFixed(
      2
    ) + "B";
  }

  if (
    n >=
    1e6
  ) {
    return (
      n /
      1e6
    ).toFixed(
      2
    ) + "M";
  }

  if (
    n >=
    1e3
  ) {
    return (
      n /
      1e3
    ).toFixed(
      2
    ) + "K";
  }

  return n.toFixed(
    2
  );
}

async function sendTelegram(
  env,
  message,
  budget = null
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      success:
        false,

      skipped:
        true,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  if (
    budget
  ) {
    if (
      !consumeBudget(
        budget,
        "notification",
        "TELEGRAM_SEND"
      )
    ) {
      return {
        success:
          false,

        skipped:
          true,

        reason:
          "NOTIFICATION_BUDGET_EXHAUSTED"
      };
    }
  }

  try {
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
                message,

              parse_mode:
                "HTML",

              disable_web_page_preview:
                true
            })
        }
      );

    const data =
      await response.json();

    return {
      success:
        response.ok &&
        Boolean(
          data
            ?.ok
        ),

      status:
        response.status,

      data
    };
  }

  catch (error) {
    return {
      success:
        false,

      error:
        errorString(
          error
        )
    };
  }
}

function qualifiesTelegram(
  candidate
) {
  if (
    candidate
      .opportunity
      .score <
    MIN_ALERT_SCORE
  ) {
    return false;
  }

  if (
    candidate
      .confidence
      .score <
    MIN_CONFIDENCE_ALERT
  ) {
    return false;
  }

  /*
   * V86:
   * A token cannot alert while safety/risk is unverified.
   */
  if (
    !candidate
      .risk
      ?.verified
  ) {
    return false;
  }

  if (
    safeNumber(
      candidate
        .risk
        .score
    ) >
    MAX_ALERT_RISK
  ) {
    return false;
  }

  if (
    safeNumber(
      candidate
        .market
        ?.liquidityUsd
    ) <
    MIN_ALERT_LIQUIDITY
  ) {
    return false;
  }

  if (
    candidate
      .signalConfirmation
      .signals <
    2
  ) {
    return false;
  }

  return true;
}

function telegramMessage(
  candidate
) {
  const lines = [
    "🚨 <b>ROBINHOOD MEME HUNTER V86</b>",
    ""
  ];

  if (
    candidate
      .liveDiscovery
  ) {
    lines.push(
      "⚡ <b>LIVE CHAIN ACTIVITY</b>",
      ""
    );
  }

  if (
    candidate
      .newlyDiscovered
  ) {
    lines.push(
      "🆕 <b>NEW TOKEN DISCOVERY</b>",
      ""
    );
  }

  lines.push(
    `<b>${escapeHtml(
      candidate.name ||
      "Unknown Token"
    )} (${escapeHtml(
      candidate.symbol ||
      "UNKNOWN"
    )})</b>`,

    "",

    `Opportunity: <b>${candidate.opportunity.score}/100</b>`,

    `Confidence: <b>${candidate.confidence.score}/100</b>`,

    `Risk: <b>${candidate.risk.label}</b>`,

    `Signals: <b>${candidate.signalConfirmation.signals}</b>`,

    "",

    `Launch: <b>${candidate.launchStage.stage}</b>`,

    `Momentum: <b>${candidate.momentum.label}</b>`,

    `Whale Flow: <b>${candidate.whaleFlow.flow}</b>`,

    "",

    `Liquidity: <b>$${formatNumber(
      candidate.market
        ?.liquidityUsd
    )}</b>`,

    `Market Cap: <b>$${formatNumber(
      candidate.market
        ?.marketCap
    )}</b>`,

    `Volume 1h: <b>$${formatNumber(
      candidate.market
        ?.volume?.h1
    )}</b>`,

    `Volume 24h: <b>$${formatNumber(
      candidate.market
        ?.volume?.h24
    )}</b>`,

    `Buy Pressure: <b>${
      candidate.market
        ?.buyPressure1h !==
          null &&
      candidate.market
        ?.buyPressure1h !==
          undefined
        ? candidate.market
            .buyPressure1h
            .toFixed(
              1
            ) +
          "%"
        : "UNVERIFIED"
    }</b>`,

    `Holders: <b>${
      candidate.holders
        ?.countersVerified &&
      candidate.holders
        ?.holderCount !==
          null
        ? formatNumber(
            candidate.holders
              .holderCount
          )
        : "UNVERIFIED"
    }</b>`,

    `Holder Integrity: <b>${
      candidate.holders
        ?.integrity
        ?.status ||
      "UNVERIFIED"
    }</b>`,

    `Infrastructure Excluded: <b>${
      candidate.holders
        ?.infrastructureHolders
        ?.length ||
      0
    }</b>`,

    "",

    `<code>${escapeHtml(
      candidate.address
    )}</code>`
  );

  if (
    candidate
      .whaleFlow
      .flow ===
      "NET_ACCUMULATION"
  ) {
    lines.push(
      "",
      "🐋 <b>WHALE ACCUMULATION DETECTED</b>"
    );
  }

  if (
    candidate
      .momentum
      .score >=
    75
  ) {
    lines.push(
      "",
      "📈 <b>STRONG MOMENTUM</b>"
    );
  }

  return lines.join(
    "\n"
  );
}

/* =========================================================
   TOKEN ANALYSIS
   ========================================================= */

async function analyzeToken(
  env,
  budget,
  state,
  watched,
  activity,
  options
) {
  const address =
    normalize(
      watched.address
    );

  const previous =
    getHistoricalSnapshot(
      state,
      address
    );

  if (
    watched
      .excludedReason
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      excludedAsset:
        true,

      exclusionReason:
        watched
          .excludedReason,

      validation:
        watched.metadata ||
        null,

      reason:
        watched
          .excludedReason
    };
  }

  const validation =
    await verifyERC20(
      env,
      address,
      budget,
      watched
    );

  if (
    validation
      .deferred
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        true,

      validation,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  if (
    !validation
      .validERC20
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      validation,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  if (
    knownQuoteMetadata(
      address,
      validation
        .symbol
    )
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      infrastructureToken:
        true,

      validation,

      reason:
        "KNOWN_QUOTE_OR_INFRASTRUCTURE"
    };
  }

  const exclusionReason =
    tokenizedSecurityReason(
      validation
        .name,

      validation
        .symbol
    );

  if (
    exclusionReason
  ) {
    return {
      address,

      validERC20:
        false,

      analysisDeferred:
        false,

      excludedAsset:
        true,

      exclusionReason,

      validation,

      reason:
        exclusionReason,

      newlyDiscovered:
        Boolean(
          options
            ?.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options
            ?.liveDiscovery
        )
    };
  }

  let market = {
    verified:
      false,

    status:
      "LOOKUP_SKIPPED"
  };

  if (
    budgetAvailable(
      budget,
      "analysis"
    )
  ) {
    market =
      await marketData(
        address,
        budget,
        watched,
        state
      );
  }

  let holders =
    unverifiedHolders();

  if (
    validation
      .totalSupply &&
    budgetAvailable(
      budget,
      "analysis",
      2
    )
  ) {
    holders =
      await holderIntelligence(
        address,
        validation
          .totalSupply,
        budget
      );
  }

  const whaleFlow =
    analyseWhaleFlow(
      previous,
      holders
    );

  const momentum =
    momentumAnalysis(
      previous,
      market,
      holders
    );

  const quality =
    marketQuality(
      market
    );

  const launch =
    launchStage(
      market
    );

  const risk =
    scoreRisk(
      validation,
      market,
      holders,
      activity,
      whaleFlow
    );

  const opportunity =
    scoreOpportunity(
      validation,
      market,
      holders,
      activity,
      momentum,
      quality,
      whaleFlow,
      launch
    );

  const candidate = {
    address,

    name:
      validation.name,

    symbol:
      validation.symbol,

    decimals:
      validation
        .decimals,

    totalSupply:
      validation
        .totalSupply,

    validERC20:
      true,

    analysisDeferred:
      false,

    validation,

    market,

    holders,

    activity,

    momentum,

    marketQuality:
      quality,

    launchStage:
      launch,

    whaleFlow,

    risk,

    opportunity,

    newlyDiscovered:
      Boolean(
        options
          ?.newlyDiscovered
      ),

    liveDiscovery:
      Boolean(
        options
          ?.liveDiscovery
      )
  };

  candidate
    .signalConfirmation =
    signalConfirmation(
      candidate
    );

  candidate
    .confidence =
    candidateConfidence(
      candidate
    );

  candidate
    .analysisPriority =
    analysisPriority(
      candidate
    );

  return candidate;
}

/* =========================================================
   LIVE / BACKLOG RANGE
   ========================================================= */

function liveRange(
  latest
) {
  const to =
    latest;

  const from =
    latest -
      BigInt(
        LIVE_SCAN_BLOCKS -
        1
      ) >=
    0n
      ? latest -
        BigInt(
          LIVE_SCAN_BLOCKS -
          1
        )
      : 0n;

  return {
    from,
    to
  };
}

function backlogStart(
  lastScanned,
  latest
) {
  if (
    lastScanned ===
      null ||
    lastScanned ===
      undefined
  ) {
    return latest >
      2000n
      ? latest -
        2000n
      : 0n;
  }

  const from =
    BigInt(
      lastScanned
    ) +
    1n;

  if (
    from >
    latest
  ) {
    return null;
  }

  return from;
}

function backlogTarget(
  latest
) {
  if (
    latest <
    BigInt(
      BACKLOG_LIVE_GUARD_BLOCKS
    )
  ) {
    return 0n;
  }

  return (
    latest -
    BigInt(
      BACKLOG_LIVE_GUARD_BLOCKS
    )
  );
}

/* =========================================================
   MAIN SCAN
   ========================================================= */

async function scan(
  env,
  options = {}
) {
  const startedAt =
    Date.now();

  const budget =
    createBudget();

  const stateResult =
    await readState(
      env
    );

  const state =
    stateResult
      .state;

  pruneState(
    state,
    false
  );

  const scheduled =
    Boolean(
      options
        .scheduled
    );

  if (
    scheduled
  ) {
    state.scheduler =
      state.scheduler ||
      {};

    state.scheduler
      .scheduledRunCount =
      safeNumber(
        state.scheduler
          .scheduledRunCount
      ) +
      1;

    state.scheduler
      .lastScheduledRunAt =
      Date.now();
  }

  const latest =
    await latestBlock(
      env,
      budget
    );

  const latestNumber =
    Number(
      latest.block
    );

  const previousBacklogCursor =
    state.lastScannedBlock;

  const liveOutput = {
    logs:
      [],

    ranges:
      []
  };

  const backlogOutput = {
    logs:
      [],

    ranges:
      []
  };

  const newTokens =
    new Set();

  const liveTokens =
    new Set();

  let liveError =
    null;

  let backlogError =
    null;

  /* =======================================================
     LIVE FIRST
     ======================================================= */

  const live =
    liveRange(
      latest.block
    );

  const liveScan =
    await scanLogRange(
      env,
      live.from,
      live.to,
      budget,
      liveOutput,
      "discovery-live"
    );

  const liveDiscovery =
    processDiscoveryLogs(
      state,
      liveOutput.logs,
      "LIVE"
    );

  for (
    const token
    of liveDiscovery
      .newTokens
  ) {
    newTokens.add(
      token
    );
  }

  for (
    const token
    of liveDiscovery
      .seenTokens
  ) {
    liveTokens.add(
      token
    );
  }

  const liveActivity =
    activeTokensFromLogs(
      state,
      liveOutput.logs
    );

  for (
    const token
    of liveActivity
      .tokens
  ) {
    liveTokens.add(
      token
    );
  }

  if (
    liveScan.success
  ) {
    state.lastLiveScannedBlock =
      latestNumber;
  }

  else {
    liveError =
      liveScan.error;
  }

  /* =======================================================
     V86 GUARANTEED-PROGRESS BACKLOG
     ======================================================= */

  const backlogFrom =
    backlogStart(
      previousBacklogCursor,
      latest.block
    );

  const backlogTargetBlock =
    backlogTarget(
      latest.block
    );

  let backlogDiscovery = {
    rawLogs:
      0,

    initializeEvents:
      0,

    swapTopicMatches:
      0,

    liquidityTopicMatches:
      0,

    newTokens:
      new Set(),

    seenTokens:
      new Set()
  };

  let backlogResult =
    null;

  if (
    backlogFrom !==
      null &&
    backlogFrom >
      backlogTargetBlock &&
    liveScan.success
  ) {
    state.lastScannedBlock =
      latestNumber;

    backlogResult = {
      success:
        true,

      complete:
        true,

      processedThrough:
        latest.block,

      nextBlock:
        null,

      blocksProcessed:
        Math.max(
          0,
          latestNumber -
          safeNumber(
            previousBacklogCursor
          )
        ),

      successfulChunks:
        0,

      failedProbes:
        0,

      minimumRangeFailures:
        0,

      alchemyFallbackAttempts:
        0,

      durationMs:
        0,

      blocksPerSecond:
        0,

      probeHistory:
        [],

      liveWindowBridge:
        true,

      error:
        null
    };
  }

  else if (
    backlogFrom !==
      null &&
    backlogFrom <=
      backlogTargetBlock &&
    budgetAvailable(
      budget,
      "discovery-backlog"
    )
  ) {
    backlogResult =
      await scanBacklogSequential(
        env,
        backlogFrom,
        backlogTargetBlock,
        budget,
        backlogOutput
      );

    backlogDiscovery =
      processDiscoveryLogs(
        state,
        backlogOutput.logs,
        "BACKLOG"
      );

    for (
      const token
      of backlogDiscovery
        .newTokens
    ) {
      newTokens.add(
        token
      );
    }

    if (
      backlogResult
        .processedThrough !==
        null &&
      backlogResult
        .processedThrough !==
        undefined
    ) {
      state.lastScannedBlock =
        Number(
          backlogResult
            .processedThrough
        );
    }

    if (
      backlogResult
        .complete &&
      liveScan.success
    ) {
      state.lastScannedBlock =
        latestNumber;

      backlogResult
        .processedThrough =
        latest.block;

      backlogResult
        .nextBlock =
        null;

      backlogResult
        .liveWindowBridge =
        true;
    }

    if (
      backlogResult
        .error
    ) {
      backlogError =
        backlogResult
          .error;
    }
  }

  /* =======================================================
     PRIORITY
     ======================================================= */

  state.watchedTokens =
    uniqueBy(
      state.watchedTokens,

      token =>
        normalize(
          token.address
        )
    );

  state.watchedTokens.sort(
    (
      a,
      b
    ) =>
      watchPriority(
        b,
        newTokens,
        liveTokens
      ) -
      watchPriority(
        a,
        newTokens,
        liveTokens
      )
  );

  state.watchedTokens =
    state.watchedTokens.slice(
      0,
      MAX_WATCHED_TOKENS
    );

  const selected =
    state.watchedTokens.slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const combinedLogs = [
    ...liveOutput.logs,
    ...backlogOutput.logs
  ];

  const candidates =
    [];

  const validationResults =
    [];

  let marketLookups =
    0;

  let holderLookups =
    0;

  let deferredAnalysis =
    0;

  let excludedAssets =
    0;

  /* =======================================================
     ANALYSIS
     ======================================================= */

  for (
    const watched
    of selected
  ) {
    const required =
      estimatedAnalysisCost(
        env,
        watched
      );

    if (
      !budgetAvailable(
        budget,
        "analysis",
        required
      )
    ) {
      deferredAnalysis++;

      validationResults.push({
        address:
          normalize(
            watched.address
          ),

        validERC20:
          null,

        deferred:
          true,

        reason:
          "FULL_ANALYSIS_BUDGET_PROTECTED",

        estimatedRequests:
          required
      });

      continue;
    }

    const address =
      normalize(
        watched.address
      );

    const activity =
      activityForToken(
        watched,
        combinedLogs
      );

    const candidate =
      await analyzeToken(
        env,
        budget,
        state,
        watched,
        activity,

        {
          newlyDiscovered:
            newTokens.has(
              address
            ),

          liveDiscovery:
            liveTokens.has(
              address
            )
        }
      );

    if (
      candidate
        .analysisDeferred
    ) {
      deferredAnalysis++;

      validationResults.push({
        address,

        validERC20:
          null,

        deferred:
          true,

        reason:
          candidate
            .validation
            ?.reason ||
          "ANALYSIS_DEFERRED"
      });

      continue;
    }

    watched.lastCheckedAt =
      Date.now();

    watched.checks =
      safeNumber(
        watched.checks
      ) +
      1;

    watched.lastValidationReason =
      candidate
        .validation
        ?.reason ||
      candidate
        .reason ||
      null;

    if (
      candidate
        .excludedAsset
    ) {
      excludedAssets++;

      watched.excludedReason =
        candidate
          .exclusionReason ||
        candidate
          .reason ||
        "EXCLUDED_ASSET";

      if (
        candidate
          .validation
          ?.validERC20
      ) {
        watched.metadata = {
          validERC20:
            true,

          name:
            candidate
              .validation
              .name,

          symbol:
            candidate
              .validation
              .symbol,

          decimals:
            candidate
              .validation
              .decimals,

          totalSupply:
            candidate
              .validation
              .totalSupply,

          verifiedAt:
            candidate
              .validation
              .verifiedAt ||
            Date.now()
        };
      }

      validationResults.push({
        address,

        validERC20:
          false,

        deferred:
          false,

        excluded:
          true,

        reason:
          watched
            .excludedReason,

        name:
          candidate
            .validation
            ?.name ||
          null,

        symbol:
          candidate
            .validation
            ?.symbol ||
          null
      });

      continue;
    }

    validationResults.push({
      address,

      validERC20:
        candidate
          .validERC20,

      deferred:
        false,

      excluded:
        false,

      reason:
        candidate
          .validation
          ?.reason ||
        candidate
          .reason ||
        null,

      name:
        candidate
          .validation
          ?.name ||
        null,

      symbol:
        candidate
          .validation
          ?.symbol ||
        null
    });

    if (
      !candidate
        .validERC20
    ) {
      watched.invalidChecks =
        safeNumber(
          watched
            .invalidChecks
        ) +
        1;

      continue;
    }

    watched.invalidChecks =
      0;

    watched.excludedReason =
      null;

    watched.metadata = {
      validERC20:
        true,

      name:
        candidate.name,

      symbol:
        candidate.symbol,

      decimals:
        candidate
          .decimals,

      totalSupply:
        candidate
          .totalSupply,

      verifiedAt:
        candidate
          .validation
          ?.verifiedAt ||
        Date.now()
    };

    if (
      candidate.market
        ?.verified &&
      candidate.market
        ?.source ===
        "DEXSCREENER"
    ) {
      marketLookups++;
    }

    if (
      candidate.holders
        ?.verified
    ) {
      holderLookups++;
    }

    saveSnapshot(
      state,
      candidate
    );

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (
      a,
      b
    ) =>
      safeNumber(
        b
          .analysisPriority
      ) -
      safeNumber(
        a
          .analysisPriority
      )
  );

  /* =======================================================
     TELEGRAM
     ======================================================= */

  const telegramResults =
    [];

  for (
    const candidate
    of candidates
  ) {
    if (
      !qualifiesTelegram(
        candidate
      )
    ) {
      continue;
    }

    const address =
      normalize(
        candidate.address
      );

    const previous =
      state.alerts[
        address
      ];

    const previousTimestamp =
      typeof previous ===
        "object"
        ? safeNumber(
            previous
              .timestamp
          )
        : safeNumber(
            previous
          );

    const previousScore =
      typeof previous ===
        "object"
        ? safeNumber(
            previous
              .score
          )
        : 0;

    const cooldownExpired =
      !previousTimestamp ||
      Date.now() -
        previousTimestamp >=
        ALERT_COOLDOWN;

    const scoreImproved =
      candidate
        .opportunity
        .score -
        previousScore >=
      10;

    const newAccumulation =
      candidate
        .whaleFlow
        .flow ===
        "NET_ACCUMULATION" &&
      previous
        ?.whaleFlow !==
        "NET_ACCUMULATION";

    if (
      !cooldownExpired &&
      !scoreImproved &&
      !newAccumulation
    ) {
      telegramResults.push({
        address,

        sent:
          false,

        reason:
          "ALERT_COOLDOWN"
      });

      continue;
    }

    if (
      !budgetAvailable(
        budget,
        "notification"
      )
    ) {
      telegramResults.push({
        address,

        sent:
          false,

        reason:
          "NOTIFICATION_BUDGET_EXHAUSTED"
      });

      continue;
    }

    const result =
      await sendTelegram(
        env,
        telegramMessage(
          candidate
        ),
        budget
      );

    telegramResults.push({
      address,

      symbol:
        candidate
          .symbol,

      sent:
        result.success,

      result
    });

    if (
      result.success
    ) {
      state.alerts[
        address
      ] = {
        timestamp:
          Date.now(),

        score:
          candidate
            .opportunity
            .score,

        confidence:
          candidate
            .confidence
            .score,

        whaleFlow:
          candidate
            .whaleFlow
            .flow
      };
    }
  }

  pruneState(
    state,
    true
  );

  const currentCursor =
    state
      .lastScannedBlock;

  const backlogRemaining =
    currentCursor ===
      null ||
    currentCursor ===
      undefined
      ? null
      : Math.max(
          0,

          latestNumber -
          safeNumber(
            currentCursor
          )
        );

  let status =
    "SCAN_COMPLETE";

  if (
    backlogRemaining !==
      null &&
    backlogRemaining >
      0
  ) {
    status =
      "LIVE_SCAN_COMPLETE_CATCHUP_CONTINUING";
  }

  if (
    liveError
  ) {
    status =
      "PARTIAL_SCAN_FAILED_LIVE_RANGE";
  }

  else if (
    backlogError &&
    !backlogResult
      ?.processedThrough
  ) {
    status =
      "LIVE_SCAN_COMPLETE_BACKLOG_RETRY_PENDING";
  }

  if (
    scheduled
  ) {
    state.scheduler
      .lastScheduledStatus =
      status;

    state.scheduler
      .lastScheduledLatestBlock =
      latestNumber;

    if (
      !liveError
    ) {
      state.scheduler
        .lastScheduledSuccessAt =
        Date.now();
    }
  }

  const save =
    await writeState(
      env,
      state
    );

  const dex =
    dexService(
      state
    );

  const backlogBlocksAdvanced =
    currentCursor !==
      null &&
    previousBacklogCursor !==
      null &&
    previousBacklogCursor !==
      undefined
      ? Math.max(
          0,

          safeNumber(
            currentCursor
          ) -
          safeNumber(
            previousBacklogCursor
          )
        )
      : backlogResult
          ?.blocksProcessed ||
        0;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status,

    scanMode:
      "V86_LIVE_FIRST_GUARANTEED_PROGRESS_HUNTER",

    scheduledRun:
      scheduled,

    durationMs:
      Date.now() -
      startedAt,

    latestBlock:
      latestNumber,

    rpcProvider:
      latest.provider,

    persistence: {
      enabled:
        stateResult
          .persistent,

      binding:
        stateResult
          .binding,

      readError:
        stateResult
          .error,

      stateSaved:
        save.saved,

      saveError:
        save.error,

      previousLastScannedBlock:
        previousBacklogCursor,

      currentLastScannedBlock:
        currentCursor,

      lastLiveScannedBlock:
        state
          .lastLiveScannedBlock,

      backlogProcessedThrough:
        backlogResult
          ?.processedThrough !==
          null &&
        backlogResult
          ?.processedThrough !==
          undefined
          ? Number(
              backlogResult
                .processedThrough
            )
          : null,

      backlogBlocksAdvanced,

      backlogRemaining,

      backlogLag:
        backlogRemaining ===
          null
          ? "UNKNOWN"
          : backlogLagLabel(
              backlogRemaining
            )
    },

    scheduler: {
      scheduledRunCount:
        safeNumber(
          state.scheduler
            ?.scheduledRunCount
        ),

      lastScheduledRunAt:
        state.scheduler
          ?.lastScheduledRunAt ||
        null,

      lastScheduledSuccessAt:
        state.scheduler
          ?.lastScheduledSuccessAt ||
        null,

      lastScheduledStatus:
        state.scheduler
          ?.lastScheduledStatus ||
        null,

      lastScheduledLatestBlock:
        state.scheduler
          ?.lastScheduledLatestBlock ||
        null
    },

    services: {
      dexscreener: {
        lastStatus:
          dex
            .lastStatus,

        lastSuccessAt:
          dex
            .lastSuccessAt,

        last429At:
          dex
            .last429At,

        cooldownUntil:
          dex
            .cooldownUntil,

        cooldownActive:
          safeNumber(
            dex
              .cooldownUntil
          ) >
          Date.now(),

        total429s:
          safeNumber(
            dex
              .total429s
          )
      }
    },

    requestBudget:
      budgetTelemetry(
        budget
      ),

    discovery: {
      live: {
        fromBlock:
          Number(
            live.from
          ),

        toBlock:
          Number(
            live.to
          ),

        rawLogs:
          liveDiscovery
            .rawLogs,

        initializeEvents:
          liveDiscovery
            .initializeEvents,

        swapTopicMatches:
          liveDiscovery
            .swapTopicMatches,

        modifyLiquidityTopicMatches:
          liveDiscovery
            .liquidityTopicMatches,

        tokensSeen:
          liveDiscovery
            .seenTokens
            .size,

        newTokens:
          liveDiscovery
            .newTokens
            .size,

        activeWatchedTokens:
          liveActivity
            .tokens
            .size,

        matchedWatchedSwapEvents:
          liveActivity
            .swapEvents,

        matchedWatchedLiquidityEvents:
          liveActivity
            .liquidityEvents,

        unknownPoolCount:
          liveActivity
            .unknownPoolIds
            .size,

        unknownSwapEvents:
          liveActivity
            .unknownSwapEvents,

        unknownLiquidityEvents:
          liveActivity
            .unknownLiquidityEvents,

        unknownPoolIds:
          Array.from(
            liveActivity
              .unknownPoolIds
          ).slice(
            0,
            20
          ),

        error:
          liveError,

        ranges:
          liveOutput
            .ranges
      },

      backlog:
        backlogFrom !==
          null
          ? {
              fromBlock:
                Number(
                  backlogFrom
                ),

              targetBlock:
                Number(
                  backlogTargetBlock
                ),

              strategy:
                "V86_GUARANTEED_PROGRESS_PROBING",

              minimumChunkBlocks:
                BACKLOG_MIN_CHUNK_BLOCKS,

              startingChunkBlocks:
                BACKLOG_START_CHUNK_BLOCKS,

              maximumChunkBlocks:
                BACKLOG_MAX_CHUNK_BLOCKS,

              growthMultiplier:
                BACKLOG_GROWTH_MULTIPLIER,

              initialChunkSize:
                backlogResult
                  ?.initialChunkSize ||
                null,

              finalChunkSize:
                backlogResult
                  ?.finalChunkSize ||
                null,

              successfulChunks:
                backlogResult
                  ?.successfulChunks ||
                0,

              failedProbes:
                backlogResult
                  ?.failedProbes ||
                0,

              minimumRangeFailures:
                backlogResult
                  ?.minimumRangeFailures ||
                0,

              alchemyFallbackAttempts:
                backlogResult
                  ?.alchemyFallbackAttempts ||
                0,

              rawLogs:
                backlogDiscovery
                  .rawLogs,

              initializeEvents:
                backlogDiscovery
                  .initializeEvents,

              swapTopicMatches:
                backlogDiscovery
                  .swapTopicMatches,

              modifyLiquidityTopicMatches:
                backlogDiscovery
                  .liquidityTopicMatches,

              newTokens:
                backlogDiscovery
                  .newTokens
                  .size,

              blocksProcessed:
                backlogResult
                  ?.blocksProcessed ||
                0,

              blocksAdvanced:
                backlogBlocksAdvanced,

              blocksPerSecond:
                backlogResult
                  ?.blocksPerSecond ||
                0,

              liveWindowBridge:
                Boolean(
                  backlogResult
                    ?.liveWindowBridge
                ),

              processedThrough:
                backlogResult
                  ?.processedThrough !==
                  null &&
                backlogResult
                  ?.processedThrough !==
                  undefined
                  ? Number(
                      backlogResult
                        .processedThrough
                    )
                  : null,

              nextBlock:
                backlogResult
                  ?.nextBlock !==
                  null &&
                backlogResult
                  ?.nextBlock !==
                  undefined
                  ? Number(
                      backlogResult
                        .nextBlock
                    )
                  : null,

              error:
                backlogError,

              probes:
                backlogResult
                  ?.probeHistory ||
                [],

              ranges:
                backlogOutput
                  .ranges
            }
          : null
    },

    v4: {
      poolManager:
        POOL_MANAGER,

      newTokenCandidates:
        newTokens
          .size,

      liveTokenCandidates:
        liveTokens
          .size,

      unknownLivePools:
        liveActivity
          .unknownPoolIds
          .size,

      liveActivityPromotion:
        "ENABLED_V86",

      guaranteedProgressBacklog:
        "ENABLED_V86"
    },

    watchedTokens:
      state
        .watchedTokens
        .length,

    tokenValidationChecks:
      validationResults
        .length,

    deferredAnalysis,

    excludedAssets,

    validERC20Tokens:
      candidates.length,

    validationResults,

    marketLookups,

    holderLookups,

    candidates,

    qualifyingCandidates:
      candidates.filter(
        qualifiesTelegram
      ).length,

    telegramResults,

    intelligence: {
      trueLiveFirstScanning:
        "ENABLED_V86",

      guaranteedProgressBacklog:
        "ENABLED_V86",

      backlogRangeGrowth:
        "ENABLED_V86",

      backlogRangeShrink:
        "ENABLED_V86",

      singleProviderBacklogProbe:
        "ENABLED_V86",

      discoveryPublicRpcFirst:
        "ENABLED_V86",

      minimumRangeAlchemyFallback:
        env.ALCHEMY_API_KEY
          ? "ENABLED_V86"
          : "UNAVAILABLE",

      alchemyFirstAnalysis:
        env.ALCHEMY_API_KEY
          ? "ENABLED"
          : "UNAVAILABLE",

      liveSwapActivityPriority:
        "ENABLED",

      unknownLivePoolTelemetry:
        "ENABLED",

      persistentBacklogCursor:
        "ENABLED",

      sequentialBacklogScanning:
        "ENABLED",

      backlogBudgetLockProtection:
        "ENABLED",

      hardPhaseIsolation:
        "ENABLED",

      fallbackAwareAnalysisBudget:
        "ENABLED",

      deferredAnalysisRetry:
        "ENABLED",

      scheduledHeartbeat:
        "ENABLED",

      smartWatchlistRetention:
        "ENABLED",

      tokenizedSecurityFiltering:
        "ENABLED_V86",

      ondoTokenizedSecurityFiltering:
        "ENABLED_V86",

      infrastructureHolderFiltering:
        "ENABLED_V86",

      poolManagerWhaleExclusion:
        "ENABLED_V86",

      adjustedOwnershipSupply:
        "ENABLED_V86",

      unverifiedRiskProtection:
        "ENABLED_V86",

      telegramRequiresVerifiedRisk:
        "ENABLED_V86",

      dexscreener429Protection:
        "ENABLED",

      dexscreenerMarketCache:
        "ENABLED",

      dexscreenerStaleFallback:
        "ENABLED",

      metadataReuse:
        "ENABLED",

      v4Discovery:
        "ENABLED",

      erc20Validation:
        "ENABLED",

      dexscreener:
        "ENABLED",

      blockscout:
        "ENABLED",

      blockscoutCounterFallback:
        "ENABLED",

      holderIntegrityValidation:
        "ENABLED",

      emptyHolderFalsePositiveProtection:
        "ENABLED",

      zeroBalanceConcentrationProtection:
        "ENABLED",

      impossibleConcentrationProtection:
        "ENABLED",

      momentum:
        "ENABLED",

      whaleFlow:
        "ENABLED",

      candidateRanking:
        "ENABLED",

      telegram:
        "ENABLED",

      socialMomentum:
        "NOT_VERIFIED"
    },

    architecture:
      "V86_LIVE_FIRST_GUARANTEED_PROGRESS_INFRASTRUCTURE_AWARE_MULTI_SIGNAL_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   HEALTH
   ========================================================= */

async function health(
  env
) {
  const budget =
    createBudget();

  const stateResult =
    await readState(
      env
    );

  const state =
    stateResult
      .state;

  pruneState(
    state,
    true
  );

  let block =
    null;

  let provider =
    null;

  let error =
    null;

  try {
    const latest =
      await latestBlock(
        env,
        budget
      );

    block =
      Number(
        latest.block
      );

    provider =
      latest.provider;
  }

  catch (err) {
    error =
      errorString(
        err
      );
  }

  const lastScheduledRun =
    safeNumber(
      state.scheduler
        ?.lastScheduledRunAt
    );

  const scheduledAgeMinutes =
    lastScheduledRun
      ? (
          Date.now() -
          lastScheduledRun
        ) /
        60000
      : null;

  const dex =
    dexService(
      state
    );

  const backlogRemaining =
    block !==
      null &&
    state.lastScannedBlock !==
      null &&
    state.lastScannedBlock !==
      undefined
      ? Math.max(
          0,

          block -
          safeNumber(
            state
              .lastScannedBlock
          )
        )
      : null;

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
      block,

    rpcProvider:
      provider,

    error,

    alchemyConfigured:
      Boolean(
        env
          .ALCHEMY_API_KEY
      ),

    persistence: {
      kvConfigured:
        stateResult
          .persistent,

      binding:
        stateResult
          .binding,

      stateKey:
        STATE_KEY,

      lastScannedBlock:
        state
          .lastScannedBlock,

      lastLiveScannedBlock:
        state
          .lastLiveScannedBlock,

      backlogRemaining,

      backlogLag:
        backlogRemaining ===
          null
          ? "UNKNOWN"
          : backlogLagLabel(
              backlogRemaining
            ),

      watchedTokens:
        state
          .watchedTokens
          .length,

      snapshotTokens:
        Object.keys(
          state.snapshots ||
          {}
        ).length,

      stateError:
        stateResult
          .error
    },

    scheduler: {
      scheduledRunCount:
        safeNumber(
          state.scheduler
            ?.scheduledRunCount
        ),

      lastScheduledRunAt:
        state.scheduler
          ?.lastScheduledRunAt ||
        null,

      lastScheduledSuccessAt:
        state.scheduler
          ?.lastScheduledSuccessAt ||
        null,

      lastScheduledStatus:
        state.scheduler
          ?.lastScheduledStatus ||
        null,

      lastScheduledLatestBlock:
        state.scheduler
          ?.lastScheduledLatestBlock ||
        null,

      minutesSinceScheduledRun:
        scheduledAgeMinutes,

      fiveMinuteCronLikelyActive:
        scheduledAgeMinutes !==
          null &&
        scheduledAgeMinutes <=
          10
    },

    services: {
      dexscreener: {
        lastStatus:
          dex
            .lastStatus,

        lastSuccessAt:
          dex
            .lastSuccessAt,

        last429At:
          dex
            .last429At,

        cooldownUntil:
          dex
            .cooldownUntil,

        cooldownActive:
          safeNumber(
            dex
              .cooldownUntil
          ) >
          Date.now(),

        total429s:
          safeNumber(
            dex
              .total429s
          )
      }
    },

    telegram: {
      configured:
        Boolean(
          env
            .TELEGRAM_BOT_TOKEN &&
          env
            .TELEGRAM_CHAT_ID
        ),

      automaticCalls:
        true,

      minimumScore:
        MIN_ALERT_SCORE,

      minimumConfidence:
        MIN_CONFIDENCE_ALERT,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY,

      maximumSendsPerScan:
        NOTIFICATION_REQUEST_LIMIT,

      requiresVerifiedRisk:
        true
    },

    backlog: {
      strategy:
        "GUARANTEED_PROGRESS_PROBING",

      minimumChunkBlocks:
        BACKLOG_MIN_CHUNK_BLOCKS,

      startingChunkBlocks:
        BACKLOG_START_CHUNK_BLOCKS,

      maximumChunkBlocks:
        BACKLOG_MAX_CHUNK_BLOCKS,

      growthMultiplier:
        BACKLOG_GROWTH_MULTIPLIER,

      requestBudget:
        BACKLOG_DISCOVERY_REQUEST_LIMIT,

      publicRpcFirst:
        true,

      minimumRangeAlchemyFallback:
        Boolean(
          env
            .ALCHEMY_API_KEY
        ),

      sequentialCursor:
        true
    },

    budget:
      budgetTelemetry(
        budget
      ),

    architecture:
      "V86_LIVE_FIRST_GUARANTEED_PROGRESS_INFRASTRUCTURE_AWARE_MULTI_SIGNAL_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   RPC TEST
   ========================================================= */

async function rpcTest(
  env
) {
  const budget =
    createBudget();

  const startedAt =
    Date.now();

  try {
    const latest =
      await latestBlock(
        env,
        budget
      );

    const from =
      latest.block >
      2n
        ? latest.block -
          2n
        : 0n;

    const logs =
      await getLogs(
        env,
        from,
        latest.block,
        budget,
        "discovery-live"
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

      provider:
        logs.provider ||
        latest.provider,

      poolManager:
        POOL_MANAGER,

      poolManagerLogs:
        Array.isArray(
          logs.result
        )
          ? logs.result
              .length
          : 0,

      error:
        logs.error,

      requestBudget:
        budgetTelemetry(
          budget
        ),

      durationMs:
        Date.now() -
        startedAt,

      timestamp:
        now()
    };
  }

  catch (error) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      error:
        errorString(
          error
        ),

      requestBudget:
        budgetTelemetry(
          budget
        ),

      timestamp:
        now()
    };
  }
}

/* =========================================================
   STATE
   ========================================================= */

async function stateStatus(
  env
) {
  const result =
    await readState(
      env
    );

  const state =
    result.state;

  pruneState(
    state,
    true
  );

  const lastScheduled =
    safeNumber(
      state.scheduler
        ?.lastScheduledRunAt
    );

  const dex =
    dexService(
      state
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    persistenceConfigured:
      result
        .persistent,

    bindingDetected:
      result
        .binding,

    stateKey:
      STATE_KEY,

    error:
      result
        .error,

    lastScannedBlock:
      state
        .lastScannedBlock,

    lastLiveScannedBlock:
      state
        .lastLiveScannedBlock,

    scheduler: {
      scheduledRunCount:
        safeNumber(
          state.scheduler
            ?.scheduledRunCount
        ),

      lastScheduledRunAt:
        state.scheduler
          ?.lastScheduledRunAt ||
        null,

      lastScheduledSuccessAt:
        state.scheduler
          ?.lastScheduledSuccessAt ||
        null,

      lastScheduledStatus:
        state.scheduler
          ?.lastScheduledStatus ||
        null,

      lastScheduledLatestBlock:
        state.scheduler
          ?.lastScheduledLatestBlock ||
        null,

      minutesSinceScheduledRun:
        lastScheduled
          ? (
              Date.now() -
              lastScheduled
            ) /
            60000
          : null
    },

    services: {
      dexscreener: {
        lastStatus:
          dex
            .lastStatus,

        lastSuccessAt:
          dex
            .lastSuccessAt,

        last429At:
          dex
            .last429At,

        cooldownUntil:
          dex
            .cooldownUntil,

        cooldownActive:
          safeNumber(
            dex
              .cooldownUntil
          ) >
          Date.now(),

        total429s:
          safeNumber(
            dex
              .total429s
          )
      }
    },

    watchedTokenCount:
      state
        .watchedTokens
        .length,

    watchedTokens:
      state.watchedTokens.map(
        token => ({
          address:
            token
              .address,

          name:
            token
              .metadata
              ?.name ||
            null,

          symbol:
            token
              .metadata
              ?.symbol ||
            null,

          checks:
            safeNumber(
              token
                .checks
            ),

          invalidChecks:
            safeNumber(
              token
                .invalidChecks
            ),

          excludedReason:
            token
              .excludedReason ||
            null,

          lastValidationReason:
            token
              .lastValidationReason ||
            null,

          marketCacheAt:
            token
              .marketCache
              ?.timestamp ||
            null,

          firstSeenAt:
            token
              .firstSeenAt,

          lastSeenAt:
            token
              .lastSeenAt,

          lastLiveSeenAt:
            token
              .lastLiveSeenAt ||
            null,

          lastCheckedAt:
            token
              .lastCheckedAt,

          poolCount:
            token
              .pools
              ?.length ||
            0
        })
      ),

    snapshotTokenCount:
      Object.keys(
        state.snapshots ||
        {}
      ).length,

    alertHistoryCount:
      Object.keys(
        state.alerts ||
        {}
      ).length,

    updatedAt:
      state
        .updatedAt,

    timestamp:
      now()
  };
}

/* =========================================================
   DIAGNOSTICS
   ========================================================= */

async function diagnostics(
  env
) {
  const stateResult =
    await readState(
      env
    );

  const state =
    stateResult
      .state;

  const rpcResult =
    await rpcTest(
      env
    );

  const scheduledAge =
    state.scheduler
      ?.lastScheduledRunAt
      ? (
          Date.now() -
          safeNumber(
            state.scheduler
              .lastScheduledRunAt
          )
        ) /
        60000
      : null;

  const dex =
    dexService(
      state
    );

  const backlogRemaining =
    rpcResult.latestBlock !==
      undefined &&
    rpcResult.latestBlock !==
      null &&
    state.lastScannedBlock !==
      null &&
    state.lastScannedBlock !==
      undefined
      ? Math.max(
          0,

          safeNumber(
            rpcResult
              .latestBlock
          ) -
          safeNumber(
            state
              .lastScannedBlock
          )
        )
      : null;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      rpcResult
        .success,

    status:
      rpcResult
        .success
        ? stateResult
            .persistent
          ? "READY"
          : "READY_WITH_KV_FIX_REQUIRED"
        : "DEGRADED",

    checks: {
      rpc: {
        success:
          rpcResult
            .success,

        latestBlock:
          rpcResult
            .latestBlock,

        provider:
          rpcResult
            .provider,

        error:
          rpcResult
            .error
      },

      poolManager: {
        success:
          rpcResult
            .success,

        address:
          POOL_MANAGER,

        logs:
          rpcResult
            .poolManagerLogs
      },

      kv: {
        configured:
          stateResult
            .persistent,

        binding:
          stateResult
            .binding,

        stateKey:
          STATE_KEY,

        readError:
          stateResult
            .error
      },

      scheduler: {
        scheduledRunCount:
          safeNumber(
            state.scheduler
              ?.scheduledRunCount
          ),

        lastScheduledRunAt:
          state.scheduler
            ?.lastScheduledRunAt ||
          null,

        minutesSinceScheduledRun:
          scheduledAge,

        fiveMinuteCronLikelyActive:
          scheduledAge !==
            null &&
          scheduledAge <=
            10
      },

      dexscreener: {
        lastStatus:
          dex
            .lastStatus,

        cooldownActive:
          safeNumber(
            dex
              .cooldownUntil
          ) >
          Date.now(),

        cooldownUntil:
          dex
            .cooldownUntil,

        total429s:
          safeNumber(
            dex
              .total429s
          )
      },

      backlog: {
        lastScannedBlock:
          state
            .lastScannedBlock,

        latestBlock:
          rpcResult
            .latestBlock ??
          null,

        remainingBlocks:
          backlogRemaining,

        lag:
          backlogRemaining ===
            null
            ? "UNKNOWN"
            : backlogLagLabel(
                backlogRemaining
              ),

        strategy:
          "GUARANTEED_PROGRESS_PROBING",

        minimumChunkBlocks:
          BACKLOG_MIN_CHUNK_BLOCKS,

        startingChunkBlocks:
          BACKLOG_START_CHUNK_BLOCKS,

        maximumChunkBlocks:
          BACKLOG_MAX_CHUNK_BLOCKS,

        requestBudget:
          BACKLOG_DISCOVERY_REQUEST_LIMIT,

        publicRpcFirst:
          true,

        alchemyOnlyAtMinimumFailure:
          true,

        sequentialProgress:
          true
      },

      telegram: {
        configured:
          Boolean(
            env
              .TELEGRAM_BOT_TOKEN &&
            env
              .TELEGRAM_CHAT_ID
          ),

        scanBudgetLimit:
          NOTIFICATION_REQUEST_LIMIT,

        verifiedRiskRequired:
          true
      },

      alchemy: {
        configured:
          Boolean(
            env
              .ALCHEMY_API_KEY
          ),

        analysisPreferred:
          Boolean(
            env
              .ALCHEMY_API_KEY
          )
      },

      v86: {
        trueLiveFirst:
          true,

        guaranteedProgressBacklog:
          true,

        backlogGrowth:
          true,

        backlogShrink:
          true,

        singleProviderBacklogProbe:
          true,

        publicRpcDiscoveryFirst:
          true,

        safeBacklogCursor:
          true,

        hardPhaseIsolation:
          true,

        tokenizedSecurityFiltering:
          true,

        ondoSecurityFiltering:
          true,

        poolManagerWhaleExclusion:
          true,

        zeroAddressWhaleExclusion:
          true,

        deadAddressWhaleExclusion:
          true,

        tokenContractWhaleExclusion:
          true,

        adjustedOwnershipSupply:
          true,

        unverifiedRiskProtection:
          true,

        telegramRequiresVerifiedRisk:
          true,

        dexscreener429Protection:
          true,

        dexscreenerCaching:
          true,

        staleMarketFallback:
          true,

        emptyHolderProtection:
          true,

        zeroBalanceHolderProtection:
          true,

        metadataReuse:
          true,

        momentumSnapshots:
          true,

        whaleFlow:
          true,

        telegramAlerts:
          true,

        holderIntegrityValidation:
          true,

        impossibleConcentrationProtection:
          true
      }
    },

    architecture:
      "V86_LIVE_FIRST_GUARANTEED_PROGRESS_INFRASTRUCTURE_AWARE_MULTI_SIGNAL_HUNTER",

    timestamp:
      now()
  };
}

/* =========================================================
   TELEGRAM TEST
   ========================================================= */

async function telegramTest(
  env
) {
  const message =
`✅ <b>Robinhood Chain Meme Hunter V86</b>

Telegram connection test successful.

⚡ True live-first scanning enabled
🚀 Guaranteed-progress backlog probing enabled
📈 Adaptive backlog range growth enabled
📉 Automatic range shrinking enabled
🛡 Protected analysis budget enabled
🚫 Ondo/tokenized-security filtering enabled
🏊 Pool Manager excluded from whale concentration
🐋 Infrastructure-aware whale tracking enabled
🔍 Unverified risk protection enabled
🧯 DexScreener 429 protection enabled
💾 Market-data cache enabled
⏱ Scheduled-run heartbeat enabled

No fake token alert was generated by this test.`;

  const result =
    await sendTelegram(
      env,
      message,
      null
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result
        .success,

    telegramConfigured:
      Boolean(
        env
          .TELEGRAM_BOT_TOKEN &&
        env
          .TELEGRAM_CHAT_ID
      ),

    result,

    timestamp:
      now()
  };
}

/* =========================================================
   RUN ALL
   ========================================================= */

async function runAll(
  env
) {
  const startedAt =
    Date.now();

  const result =
    await scan(
      env,
      {
        scheduled:
          false
      }
    );

  const state =
    await stateStatus(
      env
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    status:
      "ALL_CORE_TESTS_COMPLETED",

    durationMs:
      Date.now() -
      startedAt,

    results: {
      scan:
        result,

      state
    },

    timestamp:
      now()
  };
}

/* =========================================================
   ROUTER
   ========================================================= */

async function handleRequest(
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
      ) ||
    "/";

  if (
    request.method ===
    "OPTIONS"
  ) {
    return new Response(
      null,
      {
        status:
          204,

        headers: {
          "access-control-allow-origin":
            "*",

          "access-control-allow-methods":
            "GET, OPTIONS",

          "access-control-allow-headers":
            "content-type"
        }
      }
    );
  }

  if (
    request.method !==
    "GET"
  ) {
    return jsonResponse(
      {
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          false,

        error:
          "METHOD_NOT_ALLOWED",

        timestamp:
          now()
      },

      405
    );
  }

  if (
    path ===
      "/" ||
    path ===
      "/health"
  ) {
    return jsonResponse(
      await health(
        env
      )
    );
  }

  if (
    path ===
    "/rpc-test"
  ) {
    return jsonResponse(
      await rpcTest(
        env
      )
    );
  }

  if (
    path ===
    "/scan"
  ) {
    return jsonResponse(
      await scan(
        env,
        {
          scheduled:
            false
        }
      )
    );
  }

  if (
    path ===
    "/state"
  ) {
    return jsonResponse(
      await stateStatus(
        env
      )
    );
  }

  if (
    path ===
    "/diagnostics"
  ) {
    return jsonResponse(
      await diagnostics(
        env
      )
    );
  }

  if (
    path ===
    "/run-all"
  ) {
    return jsonResponse(
      await runAll(
        env
      )
    );
  }

  if (
    path ===
    "/test-telegram"
  ) {
    return jsonResponse(
      await telegramTest(
        env
      )
    );
  }

  return jsonResponse(
    {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

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
      ],

      timestamp:
        now()
    },

    404
  );
}

/* =========================================================
   SCHEDULED
   ========================================================= */

async function scheduledScan(
  env
) {
  const result =
    await scan(
      env,
      {
        scheduled:
          true
      }
    );

  console.log(
    JSON.stringify({
      event:
        "V86_SCHEDULED_SCAN",

      status:
        result
          .status,

      scheduledRunCount:
        result
          .scheduler
          ?.scheduledRunCount,

      latestBlock:
        result
          .latestBlock,

      backlogRemaining:
        result
          .persistence
          ?.backlogRemaining,

      backlogLag:
        result
          .persistence
          ?.backlogLag,

      backlogBlocksAdvanced:
        result
          .persistence
          ?.backlogBlocksAdvanced,

      backlogProcessedThrough:
        result
          .persistence
          ?.backlogProcessedThrough,

      successfulBacklogChunks:
        result
          .discovery
          ?.backlog
          ?.successfulChunks,

      failedBacklogProbes:
        result
          .discovery
          ?.backlog
          ?.failedProbes,

      backlogBlocksPerSecond:
        result
          .discovery
          ?.backlog
          ?.blocksPerSecond,

      liveTokenCandidates:
        result
          .v4
          ?.liveTokenCandidates,

      unknownLivePools:
        result
          .v4
          ?.unknownLivePools,

      newTokenCandidates:
        result
          .v4
          ?.newTokenCandidates,

      watchedTokens:
        result
          .watchedTokens,

      candidates:
        result
          .candidates
          ?.length,

      excludedAssets:
        result
          .excludedAssets,

      deferredAnalysis:
        result
          .deferredAnalysis,

      qualifyingCandidates:
        result
          .qualifyingCandidates,

      dexStatus:
        result
          .services
          ?.dexscreener
          ?.lastStatus,

      dexCooldown:
        result
          .services
          ?.dexscreener
          ?.cooldownActive,

      requests:
        result
          .requestBudget
          ?.used,

      liveDiscoveryRequests:
        result
          .requestBudget
          ?.discovery
          ?.live
          ?.used,

      backlogRequests:
        result
          .requestBudget
          ?.discovery
          ?.backlog
          ?.used,

      analysisRequests:
        result
          .requestBudget
          ?.analysis
          ?.used,

      notifications:
        result
          .requestBudget
          ?.notification
          ?.used,

      timestamp:
        now()
    })
  );

  return result;
}

/* =========================================================
   CLOUDFLARE EXPORT
   ========================================================= */

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    try {
      return await handleRequest(
        request,
        env
      );
    }

    catch (error) {
      console.error(
        "V86 request failed",
        error
      );

      return jsonResponse(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          error:
            errorString(
              error
            ),

          architecture:
            "V86_LIVE_FIRST_GUARANTEED_PROGRESS_INFRASTRUCTURE_AWARE_MULTI_SIGNAL_HUNTER",

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
      scheduledScan(
        env
      )
    );
  }
};
