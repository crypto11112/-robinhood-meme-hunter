/**
 * Robinhood Chain Meme Hunter
 * V80
 *
 * COMPLETE CLOUDFLARE WORKER
 *
 * Built forward from V79.
 *
 * V80 CORE:
 * - Fixes V79 undefined/mismatched function names
 * - Preserves existing KV state key
 * - True live-first scanning
 * - Independent historical catch-up
 * - Uniswap V4 discovery
 * - ERC20 validation
 * - DexScreener market intelligence
 * - Blockscout holder intelligence
 * - Momentum snapshots
 * - Whale accumulation/distribution
 * - Multi-signal candidate scoring
 * - Telegram alerts
 * - Hard request-budget isolation
 */

const VERSION = "V80";

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
 * IMPORTANT:
 * Preserve existing V69-V79 KV state.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

/* =========================================================
   KNOWN QUOTE TOKENS
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

const INITIAL_LOG_RANGE = 250;

const MIN_LOG_RANGE = 10;

/*
 * Maximum number of tokens receiving analysis per scan.
 *
 * ERC20 verification may require several RPC calls,
 * therefore keeping this small protects the Worker budget.
 */
const MAX_TOKEN_ANALYSIS = 4;

/* =========================================================
   REQUEST BUDGET
   ========================================================= */

const TOTAL_REQUEST_BUDGET = 42;

const SYSTEM_BUDGET = 2;

const DISCOVERY_BUDGET = 22;

const LIVE_DISCOVERY_BUDGET = 8;

const BACKLOG_DISCOVERY_BUDGET = 14;

const ANALYSIS_BUDGET = 18;

/* =========================================================
   ANALYSIS LIMITS
   ========================================================= */

const MAX_MARKET_LOOKUPS = 3;

const MAX_HOLDER_LOOKUPS = 2;

const METADATA_REUSE_MS =
  30 * 60 * 1000;

/* =========================================================
   WATCHLIST
   ========================================================= */

const WATCH_MAX_AGE_MS =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

/* =========================================================
   TELEGRAM
   ========================================================= */

const TELEGRAM_MIN_SCORE = 60;

const TELEGRAM_MIN_CONFIDENCE = 55;

const TELEGRAM_MIN_LIQUIDITY_USD = 1000;

const TELEGRAM_MAX_RISK = 59;

const TELEGRAM_COOLDOWN_MS =
  6 * 60 * 60 * 1000;

/* =========================================================
   SNAPSHOTS
   ========================================================= */

const MAX_SNAPSHOTS_PER_TOKEN = 24;

const SNAPSHOT_MAX_AGE_MS =
  24 * 60 * 60 * 1000;

const MIN_SNAPSHOT_INTERVAL_MS =
  2 * 60 * 1000;

const MOMENTUM_MIN_HISTORY_MS =
  5 * 60 * 1000;

const MOMENTUM_IDEAL_HISTORY_MS =
  15 * 60 * 1000;

const MOMENTUM_STRONG = 75;

const MOMENTUM_GOOD = 50;

/* =========================================================
   MARKET AGE
   ========================================================= */

const MAX_PAIR_AGE_EARLY_MS =
  24 * 60 * 60 * 1000;

const VERY_EARLY_PAIR_AGE_MS =
  2 * 60 * 60 * 1000;

/* =========================================================
   BASIC HELPERS
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
    ((b - a) / a) *
    100
  );
}

function uniqueArray(values) {
  return [
    ...new Set(
      (
        values ||
        []
      ).filter(
        value =>
          value !==
          null &&
          value !==
          undefined
      )
    )
  ];
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
   REQUEST BUDGET
   ========================================================= */

function createRequestBudget() {
  return {
    used: 0,

    limit:
      TOTAL_REQUEST_BUDGET,

    remaining:
      TOTAL_REQUEST_BUDGET,

    system: {
      used: 0,
      limit:
        SYSTEM_BUDGET,
      remaining:
        SYSTEM_BUDGET
    },

    discovery: {
      used: 0,
      limit:
        DISCOVERY_BUDGET,
      remaining:
        DISCOVERY_BUDGET,

      live: {
        used: 0,
        limit:
          LIVE_DISCOVERY_BUDGET,
        remaining:
          LIVE_DISCOVERY_BUDGET
      },

      backlog: {
        used: 0,
        limit:
          BACKLOG_DISCOVERY_BUDGET,
        remaining:
          BACKLOG_DISCOVERY_BUDGET
      }
    },

    analysis: {
      used: 0,
      limit:
        ANALYSIS_BUDGET,
      remaining:
        ANALYSIS_BUDGET
    },

    skipped: []
  };
}


function updateBudgetRemaining(
  budget
) {
  budget.remaining =
    Math.max(
      0,
      budget.limit -
      budget.used
    );

  budget.system.remaining =
    Math.max(
      0,
      budget.system.limit -
      budget.system.used
    );

  budget.discovery.remaining =
    Math.max(
      0,
      budget.discovery.limit -
      budget.discovery.used
    );

  budget.discovery.live.remaining =
    Math.max(
      0,
      budget.discovery.live.limit -
      budget.discovery.live.used
    );

  budget.discovery.backlog.remaining =
    Math.max(
      0,
      budget.discovery.backlog.limit -
      budget.discovery.backlog.used
    );

  budget.analysis.remaining =
    Math.max(
      0,
      budget.analysis.limit -
      budget.analysis.used
    );
}


function budgetAvailable(
  budget,
  phase,
  amount = 1
) {
  if (
    budget.used +
      amount >
    budget.limit
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
    "discovery-live"
  ) {
    return (
      budget.discovery.used +
        amount <=
        budget.discovery.limit &&
      budget.discovery.live.used +
        amount <=
        budget.discovery.live.limit
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
      budget.discovery.backlog.used +
        amount <=
        budget.discovery.backlog.limit
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

  budget.used +=
    amount;

  if (
    phase ===
    "system"
  ) {
    budget.system.used +=
      amount;

  } else if (
    phase ===
    "analysis"
  ) {
    budget.analysis.used +=
      amount;

  } else if (
    phase ===
    "discovery-live"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.live.used +=
      amount;

  } else if (
    phase ===
    "discovery-backlog"
  ) {
    budget.discovery.used +=
      amount;

    budget.discovery.backlog.used +=
      amount;
  }

  updateBudgetRemaining(
    budget
  );

  return true;
}


function budgetReport(
  budget
) {
  updateBudgetRemaining(
    budget
  );

  return {
    used:
      budget.used,

    limit:
      budget.limit,

    remaining:
      budget.remaining,

    system: {
      used:
        budget.system.used,

      limit:
        budget.system.limit,

      remaining:
        budget.system.remaining
    },

    discovery: {
      used:
        budget.discovery.used,

      limit:
        budget.discovery.limit,

      remaining:
        budget.discovery.remaining,

      live: {
        used:
          budget.discovery.live.used,

        limit:
          budget.discovery.live.limit,

        remaining:
          budget.discovery.live.remaining
      },

      backlog: {
        used:
          budget.discovery.backlog.used,

        limit:
          budget.discovery.backlog.limit,

        remaining:
          budget.discovery.backlog.remaining
      }
    },

    analysis: {
      used:
        budget.analysis.used,

      limit:
        budget.analysis.limit,

      remaining:
        budget.analysis.remaining,

      protected:
        true
    },

    hardPhaseIsolation:
      true,

    liveFirstIsolation:
      true,

    skipped:
      budget.skipped
  };
}

/* =========================================================
   KV BINDING
   ========================================================= */

function getKV(env) {
  if (
    env.MEME_HUNTER_STATE &&
    typeof env
      .MEME_HUNTER_STATE
      .get ===
      "function" &&
    typeof env
      .MEME_HUNTER_STATE
      .put ===
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
    typeof env
      .KV_BINDING
      .get ===
      "function" &&
    typeof env
      .KV_BINDING
      .put ===
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


/* =========================================================
   STATE
   ========================================================= */

function newState() {
  return {
    version:
      VERSION,

    /*
     * Historical catch-up cursor.
     */
    lastScannedBlock:
      null,

    /*
     * Most recent live-head block observed.
     */
    lastLiveScannedBlock:
      null,

    latestBlock:
      null,

    watchedTokens:
      {},

    snapshots:
      {},

    telegramHistory:
      {},

    createdAt:
      Date.now(),

    updatedAt:
      Date.now()
  };
}


/* =========================================================
   V69-V79 STATE MIGRATION
   ========================================================= */

function normalizeState(
  input
) {
  const base =
    newState();

  const source =
    input &&
    typeof input ===
      "object"
      ? input
      : {};

  const state = {
    ...base,
    ...source
  };

  /*
   * Older versions stored watchedTokens
   * as an array.
   *
   * V80 internally uses an address-keyed
   * object while retaining all old entries.
   */

  if (
    Array.isArray(
      source.watchedTokens
    )
  ) {
    const mapped = {};

    for (
      const token of
      source.watchedTokens
    ) {
      const address =
        normalize(
          token?.address
        );

      if (
        !isAddress(
          address
        )
      ) {
        continue;
      }

      mapped[address] = {
        ...token,
        address
      };
    }

    state.watchedTokens =
      mapped;

  } else if (
    source.watchedTokens &&
    typeof source
      .watchedTokens ===
      "object"
  ) {
    state.watchedTokens =
      source.watchedTokens;

  } else {
    state.watchedTokens =
      {};
  }

  state.snapshots =
    source.snapshots &&
    typeof source
      .snapshots ===
      "object"
      ? source.snapshots
      : {};

  state.telegramHistory =
    source.telegramHistory &&
    typeof source
      .telegramHistory ===
      "object"
      ? source.telegramHistory
      : {};

  /*
   * Older V78/V79 alert history.
   */
  if (
    source.alerts &&
    typeof source.alerts ===
      "object"
  ) {
    for (
      const [
        address,
        timestamp
      ] of Object.entries(
        source.alerts
      )
    ) {
      const key =
        normalize(
          address
        );

      if (
        !state.telegramHistory[
          key
        ]
      ) {
        state.telegramHistory[
          key
        ] = {
          timestamp:
            safeNumber(
              timestamp
            ),

          migrated:
            true
        };
      }
    }
  }

  return state;
}


/* =========================================================
   LOAD STATE
   ========================================================= */

async function loadState(env) {
  const {
    kv,
    binding
  } = getKV(env);

  if (!kv) {
    return {
      enabled:
        false,

      healthy:
        false,

      status:
        "KV_BINDING_MISSING",

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
        enabled:
          true,

        healthy:
          true,

        status:
          "READY_NEW_STATE",

        binding,

        state:
          newState(),

        error:
          null
      };
    }

    const parsed =
      JSON.parse(
        raw
      );

    return {
      enabled:
        true,

      healthy:
        true,

      status:
        "READY",

      binding,

      state:
        normalizeState(
          parsed
        ),

      error:
        null
    };

  } catch (error) {
    return {
      enabled:
        true,

      healthy:
        false,

      status:
        "KV_READ_ERROR",

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


/* =========================================================
   SAVE STATE
   ========================================================= */

async function saveState(
  env,
  state
) {
  const {
    kv,
    binding
  } = getKV(env);

  if (!kv) {
    return {
      success:
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
      Date.now();

    await kv.put(
      STATE_KEY,
      JSON.stringify(
        state
      )
    );

    return {
      success:
        true,

      binding,

      error:
        null
    };

  } catch (error) {
    return {
      success:
        false,

      binding,

      error:
        errorString(
          error
        )
    };
  }
}


/* =========================================================
   STATE PRUNING
   ========================================================= */

function pruneState(
  state
) {
  const current =
    Date.now();

  const watched =
    state.watchedTokens ||
    {};

  const entries =
    Object.entries(
      watched
    );

  for (
    const [
      address,
      token
    ] of entries
  ) {
    const firstSeen =
      safeNumber(
        token?.firstSeenAt
      );

    /*
     * Do not immediately delete migrated
     * historical tokens lacking firstSeenAt.
     */
    if (
      firstSeen > 0 &&
      current -
        firstSeen >
        WATCH_MAX_AGE_MS
    ) {
      delete watched[
        address
      ];
    }
  }

  const remaining =
    Object.values(
      watched
    );

  if (
    remaining.length >
    MAX_WATCHED_TOKENS
  ) {
    remaining.sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b.lastSeenAt ||
          b.firstSeenAt
        ) -
        safeNumber(
          a.lastSeenAt ||
          a.firstSeenAt
        )
    );

    const keep =
      new Set(
        remaining
          .slice(
            0,
            MAX_WATCHED_TOKENS
          )
          .map(
            token =>
              normalize(
                token.address
              )
          )
      );

    for (
      const address of
      Object.keys(
        watched
      )
    ) {
      if (
        !keep.has(
          normalize(
            address
          )
        )
      ) {
        delete watched[
          address
        ];
      }
    }
  }

  state.watchedTokens =
    watched;

  pruneSnapshots(
    state
  );
}


function pruneSnapshots(
  state
) {
  const current =
    Date.now();

  state.snapshots =
    state.snapshots &&
    typeof state
      .snapshots ===
      "object"
      ? state.snapshots
      : {};

  for (
    const [
      address,
      value
    ] of Object.entries(
      state.snapshots
    )
  ) {
    /*
     * V80 supports both old snapshot arrays
     * and single V79 snapshots.
     */

    let snapshots =
      Array.isArray(
        value
      )
        ? value
        : value &&
          typeof value ===
            "object"
          ? [value]
          : [];

    snapshots =
      snapshots
        .filter(
          snapshot => {
            const timestamp =
              safeNumber(
                snapshot
                  ?.timestamp
              );

            return (
              timestamp > 0 &&
              current -
                timestamp <=
                SNAPSHOT_MAX_AGE_MS
            );
          }
        )
        .slice(
          -MAX_SNAPSHOTS_PER_TOKEN
        );

    if (
      snapshots.length
    ) {
      state.snapshots[
        address
      ] = snapshots;

    } else {
      delete state.snapshots[
        address
      ];
    }
  }
}


/* =========================================================
   SNAPSHOT HISTORY
   ========================================================= */

function getSnapshots(
  state,
  address
) {
  const key =
    normalize(
      address
    );

  const value =
    state.snapshots?.[
      key
    ];

  if (
    Array.isArray(
      value
    )
  ) {
    return value;
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    return [value];
  }

  return [];
}


function getMomentumSnapshot(
  state,
  address
) {
  const snapshots =
    getSnapshots(
      state,
      address
    );

  if (
    !snapshots.length
  ) {
    return null;
  }

  const current =
    Date.now();

  /*
   * Prefer a 15+ minute old snapshot.
   */
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

  /*
   * Otherwise accept 5+ minutes.
   */
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


function saveCandidateSnapshot(
  state,
  candidate
) {
  const address =
    normalize(
      candidate.address
    );

  const snapshots =
    getSnapshots(
      state,
      address
    );

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
      MIN_SNAPSHOT_INTERVAL_MS
  ) {
    return false;
  }

  const whale =
    candidate.holders
      ?.whale;

  const snapshot = {
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
              .topHolders ||
            []
          ).map(
            holder => ({
              address:
                holder.address,

              value:
                holder.value,

              percentage:
                holder.percentage
            })
          )
        : []
  };

  snapshots.push(
    snapshot
  );

  state.snapshots[
    address
  ] =
    snapshots.slice(
      -MAX_SNAPSHOTS_PER_TOKEN
    );

  return true;
}


/* =========================================================
   RPC CORE
   ========================================================= */

async function rpcRequest(
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
      4000
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
        body.error
          ?.message ||
        "RPC_ERROR"
      );
    }

    return body.result;

  } finally {
    clearTimeout(
      timer
    );
  }
}


/* =========================================================
   RPC WITH FALLBACK
   ========================================================= */

async function rpcCall(
  env,
  budget,
  method,
  params,
  phase =
    "analysis"
) {
  let publicError =
    null;

  try {
    const result =
      await rpcRequest(
        PUBLIC_RPC,
        method,
        params,
        budget,
        phase
      );

    return {
      success:
        true,

      result,

      provider:
        "ROBINHOOD_PUBLIC_RPC",

      error:
        null
    };

  } catch (error) {
    publicError =
      errorString(
        error
      );

    if (
      publicError.startsWith(
        "REQUEST_BUDGET_EXHAUSTED"
      )
    ) {
      return {
        success:
          false,

        result:
          null,

        provider:
          null,

        error:
          publicError
      };
    }
  }

  if (
    !env.ALCHEMY_API_KEY
  ) {
    return {
      success:
        false,

      result:
        null,

      provider:
        null,

      error:
        "PUBLIC_RPC_FAILED: " +
        publicError
    };
  }

  if (
    !budgetAvailable(
      budget,
      phase,
      1
    )
  ) {
    return {
      success:
        false,

      result:
        null,

      provider:
        null,

      error:
        `REQUEST_BUDGET_EXHAUSTED_${String(
          phase
        )
          .toUpperCase()
          .replace(
            /-/g,
            "_"
          )}`
    };
  }

  try {
    const result =
      await rpcRequest(
        ALCHEMY_BASE +
          env.ALCHEMY_API_KEY,
        method,
        params,
        budget,
        phase
      );

    return {
      success:
        true,

      result,

      provider:
        "ALCHEMY",

      error:
        null
    };

  } catch (error) {
    return {
      success:
        false,

      result:
        null,

      provider:
        null,

      error:
        "PUBLIC_RPC_FAILED: " +
        publicError +
        " | ALCHEMY_FAILED: " +
        errorString(
          error
        )
    };
  }
}


/* =========================================================
   BLOCK NUMBER
   ========================================================= */

async function getLatestBlock(
  env,
  budget
) {
  const result =
    await rpcCall(
      env,
      budget,
      "eth_blockNumber",
      [],
      "system"
    );

  if (
    !result.success ||
    !result.result
  ) {
    throw new Error(
      result.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return {
    block:
      parseInt(
        result.result,
        16
      ),

    provider:
      result.provider
  };
}


/* =========================================================
   GET LOGS
   ========================================================= */

async function getLogs(
  env,
  budget,
  fromBlock,
  toBlock,
  phase
) {
  return rpcCall(
    env,
    budget,
    "eth_getLogs",
    [{
      fromBlock:
        "0x" +
        Number(
          fromBlock
        ).toString(
          16
        ),

      toBlock:
        "0x" +
        Number(
          toBlock
        ).toString(
          16
        ),

      address:
        POOL_MANAGER
    }],
    phase
  );
}
