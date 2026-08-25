/**

 * Robinhood Chain Meme Hunter

 * V79

 *

 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER

 *

 * Built directly from deployed V78.

 *

 * V79 FIXES:

 * - Preserves V78 KV state/key

 * - Preserves V4 discovery

 * - Preserves ERC20 validation

 * - Preserves DexScreener intelligence

 * - Preserves Blockscout holder intelligence

 * - Preserves momentum snapshots

 * - Preserves whale accumulation/distribution

 * - Preserves candidate scoring

 * - Preserves Telegram alerts

 *

 * NEW V79:

 * - TRUE LIVE-FIRST SCANNING

 * - Latest blocks scanned every run

 * - Historical backlog cannot block fresh-launch discovery

 * - Separate live-discovery and backlog-discovery budgets

 * - Independent historical backlog cursor

 * - Fresh live discoveries receive highest priority

 * - Recent ERC20 metadata reused to save RPC requests

 * - Fixed V78 discovery phase mismatch

 * - Fixed scanLogRange phase handling

 * - Fixed rpc-test / diagnostics phase handling

 */

const VERSION = "V79";

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

 * IMPORTANT:

 * Keep this existing state key.

 *

 * This allows V79 to continue directly from the

 * state/history already created by V69-V78.

 */

const STATE_KEY =

  "robinhood-meme-hunter-v69-state";

/* =========================================================

   SCAN WINDOWS

   ========================================================= */

const LIVE_SCAN_BLOCKS = 20;

const CATCHUP_TARGET_BLOCKS = 2000;

const INITIAL_LOG_RANGE = 250;

const MIN_LOG_RANGE = 10;

const BACKLOG_LIVE_THRESHOLD = 100;

/* =========================================================

   V79 HARD REQUEST BUDGET

   =========================================================

 *

 * TOTAL = 42

 *

 * SYSTEM = 2

 *

 * DISCOVERY = 22

 *   LIVE    = 8

 *   BACKLOG = 14

 *

 * ANALYSIS = 18

 *

 * Live discovery cannot consume backlog allowance.

 * Backlog cannot consume live allowance.

 * Neither discovery phase can consume protected analysis.

 */

const MAX_EXTERNAL_REQUESTS = 42;

const SYSTEM_REQUEST_LIMIT = 2;

const DISCOVERY_REQUEST_LIMIT = 22;

const LIVE_DISCOVERY_REQUEST_LIMIT = 8;

const BACKLOG_DISCOVERY_REQUEST_LIMIT = 14;

const ANALYSIS_REQUEST_LIMIT = 18;

/* =========================================================

   ANALYSIS LIMITS

   ========================================================= */

const MAX_TOKEN_CHECKS = 4;

const MAX_MARKET_LOOKUPS = 3;

const MAX_HOLDER_LOOKUPS = 2;

const METADATA_REUSE_MS =

  30 * 60 * 1000;

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

   SNAPSHOTS / MOMENTUM

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

const MOMENTUM_STRONG = 75;

const MOMENTUM_GOOD = 50;

/* =========================================================

   MARKET AGE

   ========================================================= */

const MAX_PAIR_AGE_EARLY_MS =

  24 * 60 * 60 * 1000;

const VERY_EARLY_PAIR_AGE_MS =

  2 * 60 * 60 * 1000;

const MEMORY_ALERTS = new Map();

/* =========================================================

   V79 BUDGET

   ========================================================= */

function createBudget() {

  return {

    totalUsed: 0,

    totalLimit:

      MAX_EXTERNAL_REQUESTS,

    system: {

      used: 0,

      limit:

        SYSTEM_REQUEST_LIMIT

    },

    discovery: {

      used: 0,

      limit:

        DISCOVERY_REQUEST_LIMIT,

      liveUsed: 0,

      liveLimit:

        LIVE_DISCOVERY_REQUEST_LIMIT,

      backlogUsed: 0,

      backlogLimit:

        BACKLOG_DISCOVERY_REQUEST_LIMIT

    },

    analysis: {

      used: 0,

      limit:

        ANALYSIS_REQUEST_LIMIT

    },

    skipped: []

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

    phase === "system"

  ) {

    return (

      budget.system.used +

        amount <=

      budget.system.limit

    );

  }

  if (

    phase === "analysis"

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

    phase === "system"

  ) {

    budget.system.used +=

      amount;

  } else if (

    phase === "analysis"

  ) {

    budget.analysis.used +=

      amount;

  } else if (

    phase ===

    "discovery-live"

  ) {

    budget.discovery.used +=

      amount;

    budget.discovery.liveUsed +=

      amount;

  } else if (

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

      protected: true

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

   HELPERS

   ========================================================= */

function now() {

  return new Date()

    .toISOString();

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

          "application/json; charset=utf-8",

        "cache-control":

          "no-store"

      }

    }

  );

}

function safeNumber(

  value

) {

  const n =

    Number(value);

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

function normalize(

  value

) {

  return String(

    value || ""

  ).toLowerCase();

}

function isAddress(

  value

) {

  return /^0x[a-fA-F0-9]{40}$/.test(

    String(

      value || ""

    )

  );

}

function topicAddress(

  topic

) {

  if (

    !/^0x[a-fA-F0-9]{64}$/.test(

      String(

        topic || ""

      )

    )

  ) {

    return null;

  }

  return (

    "0x" +

    topic.slice(-40)

  );

}

function knownQuote(

  address

) {

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

function errorString(

  error

) {

  return String(

    error?.message ||

    error ||

    "UNKNOWN_ERROR"

  );

}

function money(

  value

) {

  const n =

    safeNumber(value);

  if (!n) {

    return "UNVERIFIED";

  }

  if (n >= 1e9) {

    return (

      "$" +

      (n / 1e9)

        .toFixed(2) +

      "B"

    );

  }

  if (n >= 1e6) {

    return (

      "$" +

      (n / 1e6)

        .toFixed(2) +

      "M"

    );

  }

  if (n >= 1e3) {

    return (

      "$" +

      (n / 1e3)

        .toFixed(1) +

      "K"

    );

  }

  return (

    "$" +

    n.toFixed(2)

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

/* =========================================================

   KV

   ========================================================= */

function getKV(

  env

) {

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

function newState() {

  return {

    version:

      VERSION,

    /*

     * Historical backlog cursor.

     */

    lastScannedBlock:

      null,

    /*

     * Latest successfully scanned

     * live-head block.

     */

    lastLiveScannedBlock:

      null,

    watchedTokens:

      [],

    alerts:

      {},

    snapshots:

      {},

    createdAt:

      now(),

    updatedAt:

      now()

  };

}

async function readState(

  env

) {

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

    return {

      persistent:

        true,

      binding,

      state: {

        ...newState(),

        ...parsed,

        watchedTokens:

          Array.isArray(

            parsed

              ?.watchedTokens

          )

            ? parsed

                .watchedTokens

            : [],

        alerts:

          parsed?.alerts &&

          typeof parsed

            .alerts ===

            "object"

            ? parsed.alerts

            : {},

        snapshots:

          parsed?.snapshots &&

          typeof parsed

            .snapshots ===

            "object"

            ? parsed.snapshots

            : {}

      },

      error:

        null

    };

  } catch (error) {

    return {

      persistent:

        true,

      binding,

      state:

        newState(),

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

  } catch (error) {

    return {

      saved:

        false,

      binding,

      error:

        errorString(error)

    };

  }

}

function persistenceHealth(

  result

) {

  if (

    !result.persistent

  ) {

    return {

      healthy:

        false,

      status:

        "KV_BINDING_MISSING"

    };

  }

  if (

    result.error

  ) {

    return {

      healthy:

        false,

      status:

        "KV_READ_ERROR"

    };

  }

  return {

    healthy:

      true,

    status:

      "READY"

  };

}

/* =========================================================

   STATE PRUNING

   ========================================================= */

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

      snapshots

    ] of Object.entries(

      state.snapshots

    )

  ) {

    if (

      !Array.isArray(

        snapshots

      )

    ) {

      delete state

        .snapshots[

          address

        ];

      continue;

    }

    const valid =

      snapshots

        .filter(

          snapshot => {

            const timestamp =

              safeNumber(

                snapshot

                  ?.timestamp

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

      valid.length

    ) {

      state.snapshots[

        address

      ] = valid;

    } else {

      delete state

        .snapshots[

          address

        ];

    }

  }

}

function pruneState(

  state

) {

  const current =

    Date.now();

  state.watchedTokens =

    (

      state

        .watchedTokens ||

      []

    )

      .filter(

        token => {

          const firstSeen =

            safeNumber(

              token

                .firstSeenAt

            );

          return (

            firstSeen &&

            current -

              firstSeen <

              WATCH_MAX_AGE

          );

        }

      )

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

        safeNumber(

          timestamp

        ) >

      ALERT_COOLDOWN

    ) {

      delete state

        .alerts[

          address

        ];

    }

  }

  pruneSnapshots(

    state

  );

}

function addWatch(

  state,

  address,

  pool,

  source =

    "UNKNOWN"

) {

  const key =

    normalize(

      address

    );

  if (

    !isAddress(

      address

    ) ||

    key === ZERO ||

    knownQuote(

      address

    )

  ) {

    return false;

  }

  let token =

    state

      .watchedTokens

      .find(

        item =>

          normalize(

            item.address

          ) === key

      );

  let added =

    false;

  if (!token) {

    token = {

      address,

      firstSeenAt:

        Date.now(),

      lastCheckedAt:

        null,

      checks:

        0,

      pools:

        [],

      discoverySource:

        source

    };

    state

      .watchedTokens

      .push(

        token

      );

    added =

      true;

  }

  token.pools =

    Array.isArray(

      token.pools

    )

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

    token.pools.push(

      pool

    );

  }

  if (

    source === "LIVE"

  ) {

    token.discoverySource =

      "LIVE";

    token.lastLiveSeenAt =

      Date.now();

  }

  return added;

}

/* =========================================================

   SNAPSHOTS

   ========================================================= */

function createSnapshot(

  candidate

) {

  const whale =

    candidate

      .holders

      ?.whale;

  return {

    timestamp:

      Date.now(),

    holderCount:

      candidate

        .holders

        ?.verified

        ? candidate

            .holders

            .holderCount

        : null,

    transferCount:

      candidate

        .holders

        ?.verified

        ? candidate

            .holders

            .transferCount

        : null,

    liquidityUsd:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .liquidityUsd

        : null,

    marketCap:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .marketCap

        : null,

    volumeM5:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .volume

            ?.m5

        : null,

    volumeH1:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .volume

            ?.h1

        : null,

    volumeH24:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .volume

            ?.h24

        : null,

    buysH1:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .transactions

            ?.h1

            ?.buys

        : null,

    sellsH1:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .transactions

            ?.h1

            ?.sells

        : null,

    buyPressure1h:

      candidate

        .market

        ?.verified

        ? candidate

            .market

            .buyPressure1h

        : null,

    top1Percent:

      whale?.verified

        ? whale

            .top1Percent

        : null,

    top5Percent:

      whale?.verified

        ? whale

            .top5Percent

        : null,

    top10Percent:

      whale?.verified

        ? whale

            .top10Percent

        : null,

    whaleBalances:

      candidate

        .holders

        ?.verified

        ? (

            candidate

              .holders

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

}

function saveSnapshot(

  state,

  candidate

) {

  const key =

    normalize(

      candidate.address

    );

  state.snapshots[

    key

  ] =

    Array.isArray(

      state.snapshots[

        key

      ]

    )

      ? state.snapshots[

          key

        ]

      : [];

  const snapshots =

    state.snapshots[

      key

    ];

  const previous =

    snapshots.length

      ? snapshots[

          snapshots.length -

          1

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

  state.snapshots[

    key

  ] =

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

      snapshots.length -

      1;

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

   V79 RPC

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

            controller

              .signal

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

      await response

        .json();

    if (

      body.error

    ) {

      throw new Error(

        body.error

          .message ||

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

async function rpc(

  env,

  method,

  params,

  budget,

  phase =

    "analysis"

) {

  let publicError =

    null;

  try {

    return {

      result:

        await rpcCall(

          PUBLIC_RPC,

          method,

          params,

          budget,

          phase

        ),

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

      publicError

        .startsWith(

          "REQUEST_BUDGET_EXHAUSTED"

        )

    ) {

      return {

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

    !env

      .ALCHEMY_API_KEY

  ) {

    return {

      result:

        null,

      provider:

        null,

      error:

        "PUBLIC_RPC_FAILED: " +

        publicError

    };

  }

  /*

   * Alchemy fallback is charged to the same phase.

   */

  if (

    !budgetAvailable(

      budget,

      phase,

      1

    )

  ) {

    return {

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

    return {

      result:

        await rpcCall(

          ALCHEMY_BASE +

            env

              .ALCHEMY_API_KEY,

          method,

          params,

          budget,

          phase

        ),

      provider:

        "ALCHEMY",

      error:

        null

    };

  } catch (error) {

    return {

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

async function latestBlock(

  env,

  budget

) {

  const result =

    await rpc(

      env,

      "eth_blockNumber",

      [],

      budget,

      "system"

    );

  if (

    !result.result

  ) {

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

  budget,

  phase

) {

  return rpc(

    env,

    "eth_getLogs",

    [{

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

    }],

    budget,

    phase

  );

}

/* =========================================================

   V79 LOG RANGE SCANNER

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

      "discovery-live" &&

    phase !==

      "discovery-backlog"

  ) {

    return {

      success:

        false,

      processedThrough:

        null,

      error:

        "INVALID_DISCOVERY_PHASE"

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

      budgetExhausted:

        true,

      processedThrough:

        null,

      error:

        "DISCOVERY_BUDGET_EXHAUSTED"

    };

  }

  const result =

    await getLogs(

      env,

      from,

      to,

      budget,

      phase

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

        result.result

          .length,

      provider:

        result.provider,

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

      result.error ||

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

      processedThrough:

        null,

      error:

        result.error

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

          left

            .processedThrough

      };

    }

    return {

      success:

        true,

      processedThrough:

        right

          .processedThrough

    };

  }

  return {

    success:

      false,

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

}/* =========================================================
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
      budget,
      "analysis"
    );

  if (
    !result.result
  ) {
    throw new Error(
      result.error ||
      "ETH_CALL_FAILED"
    );
  }

  return result.result;
}


function decodeUint(
  hex
) {
  try {
    return BigInt(
      hex
    );

  } catch {
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
      )
        .replace(
          /^0x/,
          ""
        );

    if (
      raw.length !==
      64
    ) {
      return null;
    }

    const matches =
      raw.match(
        /.{2}/g
      ) || [];

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
        .decode(
          bytes
        )
        .replace(
          /\0/g,
          ""
        )
        .trim();

    return (
      decoded ||
      null
    );

  } catch {
    return null;
  }
}


function decodeString(
  hex
) {
  try {
    const raw =
      String(
        hex || ""
      )
        .replace(
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
      !Number.isFinite(
        offset
      ) ||
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
      !Number.isFinite(
        length
      ) ||
      length <= 0 ||
      length >
        1024
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
      data.match(
        /.{2}/g
      ) || [];

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

  } catch {
    return null;
  }
}


async function verifyERC20(
  env,
  address,
  budget
) {
  /*
   * V79:
   * Reserve enough analysis budget
   * for bytecode + core metadata.
   */
  if (
    !budgetAvailable(
      budget,
      "analysis",
      4
    )
  ) {
    return {
      validERC20:
        false,

      reason:
        "ANALYSIS_BUDGET_PROTECTED"
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

    if (
      value !==
      null
    ) {
      decimals =
        Number(
          value
        );
    }

  } catch {}


  if (
    budgetAvailable(
      budget,
      "analysis",
      1
    )
  ) {
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
  }

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
    score < 3
  ) {
    return {
      validERC20:
        false,

      reason:
        "ERC20_METHODS_NOT_VERIFIED",

      name,
      symbol,
      decimals,

      totalSupply:
        totalSupply !==
          null
          ? totalSupply
              .toString()
          : null
    };
  }

  return {
    validERC20:
      true,

    reason:
      "VERIFIED",

    address,
    name,
    symbol,
    decimals,

    totalSupply:
      totalSupply !==
        null
        ? totalSupply
            .toString()
        : null,

    verifiedAt:
      Date.now()
  };
}


/* =========================================================
   V79 METADATA REUSE
   ========================================================= */

function reusableMetadata(
  watched
) {
  const metadata =
    watched
      ?.metadata;

  if (
    !metadata ||
    !metadata
      .validERC20
  ) {
    return null;
  }

  const verifiedAt =
    safeNumber(
      metadata
        .verifiedAt
    );

  if (
    !verifiedAt
  ) {
    return null;
  }

  if (
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


/* =========================================================
   V4 DISCOVERY
   ========================================================= */

function decodeInitialize(
  log
) {
  if (
    normalize(
      log
        ?.topics
        ?.[0]
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
      (
        watched
          .pools ||
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
        log
          ?.topics
          ?.[0]
      );

    const poolId =
      normalize(
        log
          ?.topics
          ?.[1]
      );

    if (
      !poolIds.size ||
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
      !response.ok
    ) {
      return {
        verified:
          false,

        status:
          `HTTP_${response.status}`
      };
    }

    const data =
      await response
        .json();

    const pairs =
      Array.isArray(
        data
      )
        ? data
        : [];

    if (
      !pairs.length
    ) {
      return {
        verified:
          false,

        status:
          "NO_MARKET_FOUND"
      };
    }

    /*
     * Use the deepest pool available.
     */
    pairs.sort(
      (
        a,
        b
      ) =>
        safeNumber(
          b
            ?.liquidity
            ?.usd
        ) -
        safeNumber(
          a
            ?.liquidity
            ?.usd
        )
    );

    const p =
      pairs[0];

    const buys1h =
      safeNumber(
        p
          ?.txns
          ?.h1
          ?.buys
      );

    const sells1h =
      safeNumber(
        p
          ?.txns
          ?.h1
          ?.sells
      );

    const total =
      buys1h +
      sells1h;

    return {
      verified:
        true,

      status:
        "VERIFIED",

      pairAddress:
        p
          ?.pairAddress ||
        null,

      url:
        p?.url ||
        null,

      priceUsd:
        p
          ?.priceUsd ||
        null,

      liquidityUsd:
        safeNumber(
          p
            ?.liquidity
            ?.usd
        ),

      marketCap:
        safeNumber(
          p
            ?.marketCap
        ) ||
        null,

      fdv:
        safeNumber(
          p?.fdv
        ) ||
        null,

      volume: {
        m5:
          safeNumber(
            p
              ?.volume
              ?.m5
          ),

        h1:
          safeNumber(
            p
              ?.volume
              ?.h1
          ),

        h24:
          safeNumber(
            p
              ?.volume
              ?.h24
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
        total >
        0
          ? (
              buys1h /
              total *
              100
            )
          : null,

      pairCreatedAt:
        safeNumber(
          p
            ?.pairCreatedAt
        ) ||
        null
    };

  } catch (error) {
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

    return await response
      .json();

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
      total <= 0n
    ) {
      return null;
    }

    return (
      Number(
        held *
        1000000n /
        total
      ) /
      10000
    );

  } catch {
    return null;
  }
}


function extractHolderAddress(
  item
) {
  if (
    typeof item
      ?.address ===
    "string"
  ) {
    return item.address;
  }

  if (
    typeof item
      ?.address
      ?.hash ===
    "string"
  ) {
    return item
      .address
      .hash;
  }

  if (
    typeof item
      ?.address_hash ===
    "string"
  ) {
    return item
      .address_hash;
  }

  if (
    typeof item
      ?.address_hash
      ?.hash ===
    "string"
  ) {
    return item
      .address_hash
      .hash;
  }

  return null;
}


function unverifiedHolders() {
  return {
    verified:
      false,

    holderCount:
      null,

    transferCount:
      null,

    topHolders:
      [],

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

      flow:
        "NOT_VERIFIED",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      smartMoneyScore:
        0,

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
  if (
    !totalSupply ||
    !budgetAvailable(
      budget,
      "analysis",
      2
    )
  ) {
    return unverifiedHolders();
  }

  const counters =
    await blockscout(
      `/api/v2/tokens/${token}/counters`,
      budget
    );

  if (
    !counters
  ) {
    return unverifiedHolders();
  }

  const holders =
    await blockscout(
      `/api/v2/tokens/${token}/holders`,
      budget
    );

  const items =
    Array.isArray(
      holders
        ?.items
    )
      ? holders
          .items
          .slice(
            0,
            10
          )
      : [];

  const topHolders =
    items.map(
      item => {
        const value =
          String(
            item
              ?.value ||
            item
              ?.token
              ?.value ||
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
      }
    );

  const percentages =
    topHolders
      .map(
        item =>
          item
            .percentage
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

  const whales =
    topHolders
      .filter(
        item =>
          item
            .percentage !==
            null &&
          item
            .percentage >=
            1
      );

  let concentrationRisk =
    "LOW";

  if (
    (
      top1 !==
        null &&
      top1 >=
        20
    ) ||
    top10 >=
      80
  ) {
    concentrationRisk =
      "HIGH";

  } else if (
    (
      top1 !==
        null &&
      top1 >=
        10
    ) ||
    top10 >=
      60
  ) {
    concentrationRisk =
      "MEDIUM";
  }

  let smartMoneyScore =
    0;

  if (
    whales.length >=
    2
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    whales.length >=
    4
  ) {
    smartMoneyScore +=
      15;
  }

  if (
    top10 >
      0 &&
    top10 <=
      60
  ) {
    smartMoneyScore +=
      20;
  }

  if (
    top1 !==
      null &&
    top1 <=
      15
  ) {
    smartMoneyScore +=
      15;
  }

  return {
    verified:
      true,

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
        Boolean(
          holders
        ),

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
        smartMoneyScore >=
        55,

      smartMoneyVerified:
        false
    }
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
      ?.verified ||
    !holders
      ?.whale
      ?.verified
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

      concentrationTrend:
        "NOT_VERIFIED",

      score:
        0,

      reasons:
        []
    };
  }

  const previousTop10 =
    safeNumber(
      previous
        .top10Percent
    );

  const currentTop10 =
    safeNumber(
      holders
        .whale
        .top10Percent
    );

  const previousTop1 =
    safeNumber(
      previous
        .top1Percent
    );

  const currentTop1 =
    safeNumber(
      holders
        .whale
        .top1Percent
    );

  let score =
    0;

  const reasons =
    [];

  let concentrationTrend =
    "STABLE";

  if (
    previousTop10 >
      0 &&
    currentTop10 >
      0
  ) {
    const change =
      currentTop10 -
      previousTop10;

    if (
      change >= 2
    ) {
      concentrationTrend =
        "INCREASING";

      score +=
        15;

      reasons.push(
        "Top-10 whale concentration increasing"
      );

    } else if (
      change <=
      -2
    ) {
      concentrationTrend =
        "DECREASING";

      score -=
        5;

      reasons.push(
        "Top-10 concentration decreasing"
      );
    }
  }

  if (
    previousTop1 >
      0 &&
    currentTop1 >
      0
  ) {
    const change =
      currentTop1 -
      previousTop1;

    if (
      change >
        0 &&
      currentTop1 <=
        20
    ) {
      score +=
        10;

      reasons.push(
        "Largest holder accumulating within acceptable concentration"
      );
    }

    if (
      currentTop1 >=
        30 &&
      change >
        0
    ) {
      score -=
        20;

      reasons.push(
        "Largest holder concentration becoming dangerous"
      );
    }
  }

  const previousBalances =
    Array.isArray(
      previous
        .whaleBalances
    )
      ? previous
          .whaleBalances
      : [];

  const previousMap =
    new Map(
      previousBalances
        .filter(
          item =>
            item
              ?.address
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
    const address =
      normalize(
        holder
          .address
      );

    if (
      !address
    ) {
      continue;
    }

    const old =
      previousMap
        .get(
          address
        );

    if (
      !old
    ) {
      continue;
    }

    try {
      const oldValue =
        BigInt(
          String(
            old
              .value ||
            "0"
          )
        );

      const newValue =
        BigInt(
          String(
            holder
              .value ||
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

    } catch {}
  }

  if (
    comparable >=
      2 &&
    increasing >
      decreasing
  ) {
    score +=
      25;

    reasons.push(
      `${increasing} tracked top wallets increased balances`
    );
  }

  if (
    comparable >=
      2 &&
    decreasing >
      increasing
  ) {
    score -=
      20;

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
    increasing >=
      2 &&
    increasing >
      decreasing
  ) {
    flow =
      "NET_ACCUMULATION";

    accumulation =
      "OBSERVED";

    distribution =
      "NOT_OBSERVED";
  }

  if (
    decreasing >=
      2 &&
    decreasing >
      increasing
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
      comparable >
      0,

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
}/* =========================================================
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

      positiveSignals:
        0,

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

      positiveSignals:
        0,

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

    if (
      volumeGrowth > 0
    ) {
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

  if (
    positiveSignals >= 4
  ) {
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

    pairAgeMinutes,

    reasons
  };
}


/* =========================================================
   V79 LAUNCH STAGE
   ========================================================= */

function launchStage(
  market
) {
  if (
    !market?.verified ||
    !safeNumber(
      market.pairCreatedAt
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
        market.pairCreatedAt
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

  } else if (
    ageMs <=
    60 * 60 * 1000
  ) {
    stage =
      "VERY_EARLY";

    score =
      90;

  } else if (
    ageMs <=
    2 * 60 * 60 * 1000
  ) {
    stage =
      "EARLY";

    score =
      80;

  } else if (
    ageMs <=
    6 * 60 * 60 * 1000
  ) {
    stage =
      "EMERGING";

    score =
      65;

  } else if (
    ageMs <=
    24 * 60 * 60 * 1000
  ) {
    stage =
      "YOUNG";

    score =
      45;

  } else if (
    ageMs <=
    72 * 60 * 60 * 1000
  ) {
    stage =
      "ESTABLISHING";

    score =
      25;
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
   V79 SIGNAL CONFIRMATION
   ========================================================= */

function signalConfirmation(
  candidate
) {
  let signals = 0;
  let score = 0;

  const reasons = [];

  const market =
    candidate.market;

  const momentum =
    candidate.momentum;

  const holders =
    candidate.holders;

  const whaleFlow =
    candidate.whaleFlow;

  const activity =
    candidate.activity;

  if (
    activity?.swaps > 0
  ) {
    signals++;
    score += 10;

    reasons.push(
      "V4 swap activity confirmed"
    );
  }

  if (
    activity?.liquidityEvents > 0
  ) {
    signals++;
    score += 8;

    reasons.push(
      "Liquidity activity confirmed"
    );
  }

  if (
    market?.verified &&
    safeNumber(
      market.liquidityUsd
    ) >= 5000
  ) {
    signals++;
    score += 12;

    reasons.push(
      "Meaningful liquidity confirmed"
    );
  }

  if (
    market?.verified &&
    safeNumber(
      market.volume?.h24
    ) >= 10000
  ) {
    signals++;
    score += 10;

    reasons.push(
      "Trading volume confirmed"
    );
  }

  if (
    market?.buyPressure1h !==
      null &&
    market.buyPressure1h >= 60
  ) {
    signals++;
    score += 12;

    reasons.push(
      "Buy pressure confirmed"
    );
  }

  if (
    holders?.verified &&
    safeNumber(
      holders.holderCount
    ) >= 50
  ) {
    signals++;
    score += 10;

    reasons.push(
      "Holder base confirmed"
    );
  }

  if (
    momentum?.verified &&
    momentum.score >= 50
  ) {
    signals++;
    score += 18;

    reasons.push(
      "Momentum acceleration confirmed"
    );
  }

  if (
    whaleFlow?.verified &&
    whaleFlow.flow ===
      "NET_ACCUMULATION"
  ) {
    signals++;
    score += 15;

    reasons.push(
      "Whale accumulation confirmed"
    );
  }

  if (
    holders?.whale
      ?.concentrationRisk ===
      "LOW"
  ) {
    signals++;
    score += 10;

    reasons.push(
      "Healthy holder concentration"
    );
  }

  if (
    signals >= 5
  ) {
    score += 10;

    reasons.push(
      "Strong multi-signal confirmation"
    );
  }

  return {
    verified:
      signals >= 2,

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

  if (
    token.validERC20
  ) {
    score -= 15;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    activity.swaps > 0
  ) {
    score -= 7;

    reasons.push(
      "Active V4 swaps"
    );
  }

  if (
    market.verified
  ) {
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

  if (
    whale?.verified
  ) {
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
      whale.top1Percent >
        40
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
  whaleFlow,
  launch
) {
  let score = 0;
  const reasons = [];

  if (
    token.validERC20
  ) {
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

  if (
    activity.swaps > 0
  ) {
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

  if (
    market.verified
  ) {
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

  if (
    launch?.verified
  ) {
    if (
      launch.stage ===
      "JUST_LAUNCHED"
    ) {
      score += 10;

      reasons.push(
        "Just-launched pair"
      );

    } else if (
      launch.stage ===
        "VERY_EARLY" ||
      launch.stage ===
        "EARLY"
    ) {
      score += 7;

      reasons.push(
        "Very early launch stage"
      );

    } else if (
      launch.stage ===
      "EMERGING"
    ) {
      score += 4;
    }
  }

  if (
    holders?.verified
  ) {
    if (
      holders.holderCount >=
      50
    ) {
      score += 4;
    }

    if (
      holders.holderCount >=
      200
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

  if (
    momentum?.verified
  ) {
    if (
      momentum.score >=
      75
    ) {
      score += 15;

      reasons.push(
        "Strong accelerating momentum"
      );

    } else if (
      momentum.score >=
      50
    ) {
      score += 10;

      reasons.push(
        "Good momentum"
      );

    } else if (
      momentum.score >=
      25
    ) {
      score += 5;

      reasons.push(
        "Early momentum"
      );
    }
  }

  if (
    quality?.verified
  ) {
    if (
      quality.score >=
      40
    ) {
      score += 10;

      reasons.push(
        "Strong market structure"
      );

    } else if (
      quality.score >=
      20
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

  if (
    candidate.validERC20
  ) {
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
   V79 WATCH PRIORITY
   ========================================================= */

function watchPriority(
  watched,
  newTokens =
    new Set()
) {
  let score = 0;

  const key =
    normalize(
      watched.address
    );

  if (
    !knownQuote(
      watched.address
    )
  ) {
    score += 1000;
  }

  if (
    knownQuoteMetadata(
      watched.address,
      watched.metadata
        ?.symbol
    )
  ) {
    score -= 2000;
  }

  if (
    newTokens.has(
      key
    )
  ) {
    score += 1200;
  }

  const lastChecked =
    safeNumber(
      watched.lastCheckedAt
    );

  if (
    !lastChecked
  ) {
    score += 500;

  } else {
    const minutesSinceCheck =
      (
        Date.now() -
        lastChecked
      ) /
      60000;

    score +=
      Math.min(
        500,
        Math.floor(
          minutesSinceCheck
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
      30 * 60 * 1000
  ) {
    score += 175;

  } else if (
    age >= 0 &&
    age <
      60 * 60 * 1000
  ) {
    score += 100;
  }

  score +=
    Math.min(
      60,
      (
        watched.pools
          ?.length ||
        0
      ) * 12
    );

  if (
    safeNumber(
      watched.checks
    ) > 0
  ) {
    score += 30;
  }

  return score;
}


/* =========================================================
   V79 ANALYSIS PRIORITY
   ========================================================= */

function analysisPriority(
  candidate
) {
  let score =
    safeNumber(
      candidate.opportunity
        ?.score
    ) * 2;

  score +=
    safeNumber(
      candidate.confidence
        ?.score
    );

  score +=
    safeNumber(
      candidate.momentum
        ?.score
    );

  score +=
    safeNumber(
      candidate.marketQuality
        ?.score
    );

  score +=
    safeNumber(
      candidate.signalConfirmation
        ?.score
    );

  score +=
    safeNumber(
      candidate.launchStage
        ?.score
    ) * 0.25;

  if (
    candidate.newlyDiscovered
  ) {
    score += 25;
  }

  if (
    candidate.liveDiscovery
  ) {
    score += 100;
  }

  if (
    candidate.whaleFlow
      ?.flow ===
      "NET_ACCUMULATION"
  ) {
    score += 30;
  }

  if (
    candidate.whaleFlow
      ?.flow ===
      "NET_DISTRIBUTION"
  ) {
    score -= 30;
  }

  if (
    candidate.holders
      ?.whale
      ?.concentrationRisk ===
      "HIGH"
  ) {
    score -= 40;
  }

  return score;
}/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  env,
  message
) {
  const token =
    env.TELEGRAM_BOT_TOKEN;

  const chatId =
    env.TELEGRAM_CHAT_ID;

  if (
    !token ||
    !chatId
  ) {
    return {
      success: false,
      skipped: true,
      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              chat_id:
                chatId,

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
          data?.ok
        ),

      status:
        response.status,

      data
    };

  } catch (error) {
    return {
      success: false,

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


/* =========================================================
   TELEGRAM MESSAGE
   ========================================================= */

function telegramMessage(
  candidate
) {
  const market =
    candidate.market || {};

  const momentum =
    candidate.momentum || {};

  const holders =
    candidate.holders || {};

  const whale =
    holders.whale || {};

  const whaleFlow =
    candidate.whaleFlow || {};

  const launch =
    candidate.launchStage || {};

  const confirmation =
    candidate.signalConfirmation || {};

  const opportunity =
    candidate.opportunity || {};

  const confidence =
    candidate.confidence || {};

  const risk =
    candidate.risk || {};

  const symbol =
    candidate.symbol ||
    "UNKNOWN";

  const name =
    candidate.name ||
    "Unknown Token";

  const address =
    candidate.address;

  const liquidity =
    safeNumber(
      market.liquidityUsd
    );

  const marketCap =
    safeNumber(
      market.marketCap
    );

  const volume1h =
    safeNumber(
      market.volume?.h1
    );

  const volume24h =
    safeNumber(
      market.volume?.h24
    );

  const buyPressure =
    market.buyPressure1h;

  const holderCount =
    holders.verified
      ? holders.holderCount
      : null;

  const top10 =
    whale.verified
      ? whale.top10Percent
      : null;

  const lines = [
    "🚨 <b>ROBINHOOD MEME HUNTER V79</b>",
    "",
    `<b>${escapeHtml(name)} (${escapeHtml(symbol)})</b>`,
    "",
    `Score: <b>${safeNumber(opportunity.score).toFixed(0)}/100</b>`,
    `Confidence: <b>${safeNumber(confidence.score).toFixed(0)}/100</b>`,
    `Risk: <b>${escapeHtml(risk.label || "UNVERIFIED")}</b>`,
    `Signals: <b>${safeNumber(confirmation.signals)}</b>`,
    "",
    `Launch: <b>${escapeHtml(launch.stage || "UNVERIFIED")}</b>`,
    `Momentum: <b>${escapeHtml(momentum.label || "UNVERIFIED")}</b>`,
    `Whale Flow: <b>${escapeHtml(whaleFlow.flow || "UNVERIFIED")}</b>`,
    "",
    `Liquidity: <b>$${formatNumber(liquidity)}</b>`,
    `Market Cap: <b>$${formatNumber(marketCap)}</b>`,
    `Volume 1h: <b>$${formatNumber(volume1h)}</b>`,
    `Volume 24h: <b>$${formatNumber(volume24h)}</b>`,
    `Buy Pressure 1h: <b>${
      buyPressure !== null &&
      buyPressure !== undefined
        ? `${safeNumber(buyPressure).toFixed(1)}%`
        : "UNVERIFIED"
    }</b>`,
    `Holders: <b>${
      holderCount !== null
        ? formatNumber(holderCount)
        : "UNVERIFIED"
    }</b>`,
    `Top 10: <b>${
      top10 !== null
        ? `${safeNumber(top10).toFixed(1)}%`
        : "UNVERIFIED"
    }</b>`,
    "",
    `<code>${escapeHtml(address)}</code>`
  ];

  if (
    candidate.newlyDiscovered
  ) {
    lines.splice(
      2,
      0,
      "🆕 <b>NEW TOKEN DISCOVERY</b>",
      ""
    );
  }

  if (
    candidate.liveDiscovery
  ) {
    lines.splice(
      2,
      0,
      "⚡ <b>LIVE BLOCK DISCOVERY</b>",
      ""
    );
  }

  if (
    whaleFlow.flow ===
    "NET_ACCUMULATION"
  ) {
    lines.push(
      "",
      "🐋 <b>WHALE ACCUMULATION DETECTED</b>"
    );
  }

  if (
    momentum.score >=
    MOMENTUM_STRONG
  ) {
    lines.push(
      "",
      "📈 <b>STRONG MOMENTUM ACCELERATION</b>"
    );
  }

  if (
    confirmation.signals >= 5
  ) {
    lines.push(
      "",
      "🔥 <b>MULTI-SIGNAL CONFIRMATION</b>"
    );
  }

  return lines.join(
    "\n"
  );
}


/* =========================================================
   HTML
   ========================================================= */

function escapeHtml(
  value
) {
  return String(
    value ?? ""
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
  const number =
    safeNumber(
      value
    );

  if (
    number >=
    1_000_000_000
  ) {
    return (
      number /
      1_000_000_000
    ).toFixed(2) + "B";
  }

  if (
    number >=
    1_000_000
  ) {
    return (
      number /
      1_000_000
    ).toFixed(2) + "M";
  }

  if (
    number >=
    1_000
  ) {
    return (
      number /
      1_000
    ).toFixed(2) + "K";
  }

  return number.toFixed(
    2
  );
}


/* =========================================================
   TELEGRAM QUALIFICATION
   ========================================================= */

function qualifiesTelegram(
  candidate
) {
  const score =
    safeNumber(
      candidate.opportunity
        ?.score
    );

  const confidence =
    safeNumber(
      candidate.confidence
        ?.score
    );

  const liquidity =
    safeNumber(
      candidate.market
        ?.liquidityUsd
    );

  const signals =
    safeNumber(
      candidate.signalConfirmation
        ?.signals
    );

  const risk =
    candidate.risk?.label;

  if (
    score <
    TELEGRAM_MIN_SCORE
  ) {
    return false;
  }

  if (
    confidence <
    TELEGRAM_MIN_CONFIDENCE
  ) {
    return false;
  }

  if (
    liquidity <
    TELEGRAM_MIN_LIQUIDITY_USD
  ) {
    return false;
  }

  if (
    signals < 2
  ) {
    return false;
  }

  if (
    risk === "HIGH"
  ) {
    return false;
  }

  return true;
}


/* =========================================================
   V79 LIVE RANGE
   ========================================================= */

function liveScanRange(
  latestBlock
) {
  const toBlock =
    Math.max(
      0,
      safeNumber(
        latestBlock
      )
    );

  const fromBlock =
    Math.max(
      0,
      toBlock -
      LIVE_SCAN_BLOCKS +
      1
    );

  return {
    fromBlock,
    toBlock
  };
}


/* =========================================================
   V79 BACKLOG RANGE
   ========================================================= */

function backlogScanRange(
  lastScannedBlock,
  latestBlock
) {
  const start =
    Math.max(
      0,
      safeNumber(
        lastScannedBlock
      ) + 1
    );

  if (
    start >
    latestBlock
  ) {
    return null;
  }

  const end =
    Math.min(
      latestBlock,
      start +
      CATCHUP_TARGET_BLOCKS -
      1
    );

  return {
    fromBlock:
      start,

    toBlock:
      end
  };
}


/* =========================================================
   V79 TOKEN ANALYSIS
   ========================================================= */

async function analyzeToken(
  env,
  budget,
  state,
  watched,
  activity,
  options = {}
) {
  const address =
    normalize(
      watched.address
    );

  const previous =
    state.snapshots?.[
      address
    ] || null;

  const validation =
    await validateERC20(
      env,
      budget,
      address
    );

  if (
    !validation.validERC20
  ) {
    return {
      address,

      validERC20:
        false,

      validation,

      newlyDiscovered:
        Boolean(
          options.newlyDiscovered
        ),

      liveDiscovery:
        Boolean(
          options.liveDiscovery
        ),

      priority:
        options.priority || 0
    };
  }

  const market =
    await getMarketData(
      env,
      budget,
      address
    );

  const holders =
    await getHolderData(
      env,
      budget,
      address
    );

  const whaleFlow =
    whaleFlowAnalysis(
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
      validation.decimals,

    totalSupply:
      validation.totalSupply,

    validERC20:
      true,

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
        options.newlyDiscovered
      ),

    liveDiscovery:
      Boolean(
        options.liveDiscovery
      ),

    priority:
      safeNumber(
        options.priority
      )
  };

  candidate.signalConfirmation =
    signalConfirmation(
      candidate
    );

  candidate.confidence =
    candidateConfidence(
      candidate
    );

  candidate.analysisPriority =
    analysisPriority(
      candidate
    );

  return candidate;
}


/* =========================================================
   V79 SNAPSHOT
   ========================================================= */

function buildSnapshot(
  candidate
) {
  return {
    timestamp:
      Date.now(),

    holderCount:
      candidate.holders
        ?.verified
        ? safeNumber(
            candidate.holders
              .holderCount
          )
        : null,

    transferCount:
      candidate.holders
        ?.verified
        ? safeNumber(
            candidate.holders
              .transferCount
          )
        : null,

    liquidityUsd:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .liquidityUsd
          )
        : null,

    marketCap:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .marketCap
          )
        : null,

    volumeH1:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .volume?.h1
          )
        : null,

    volumeH24:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .volume?.h24
          )
        : null,

    buysH1:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .transactions
              ?.h1?.buys
          )
        : null,

    sellsH1:
      candidate.market
        ?.verified
        ? safeNumber(
            candidate.market
              .transactions
              ?.h1?.sells
          )
        : null,

    top1Percent:
      candidate.holders
        ?.whale
        ?.verified
        ? candidate.holders
            .whale
            .top1Percent
        : null,

    top10Percent:
      candidate.holders
        ?.whale
        ?.verified
        ? candidate.holders
            .whale
            .top10Percent
        : null,

    topBalances:
      candidate.holders
        ?.whale
        ?.topBalances ||
      []
  };
}


/* =========================================================
   V79 MAIN SCANNER
   ========================================================= */

async function scan(
  env
) {
  const startedAt =
    Date.now();

  const budget =
    createRequestBudget();

  const stateResult =
    await loadState(
      env
    );

  const state =
    stateResult.state;

  state.watchedTokens =
    state.watchedTokens ||
    {};

  state.snapshots =
    state.snapshots ||
    {};

  state.telegramHistory =
    state.telegramHistory ||
    {};

  const rpc =
    await rpcCall(
      env,
      budget,
      "eth_blockNumber",
      [],
      "system"
    );

  if (
    !rpc.success
  ) {
    return {
      status:
        "RPC_ERROR",

      durationMs:
        Date.now() -
        startedAt,

      error:
        rpc.error,

      requestBudget:
        budgetReport(
          budget
        )
    };
  }

  const latestBlock =
    parseInt(
      rpc.result,
      16
    );

  const previousLastScannedBlock =
    safeNumber(
      state.lastScannedBlock
    );

  const backlogBefore =
    Math.max(
      0,
      latestBlock -
      previousLastScannedBlock
    );

  const rangesCompleted =
    [];

  const discovery =
    {
      live: {
        attempted:
          false,

        range:
          null,

        rawLogs:
          0,

        initializeEvents:
          0,

        swapTopicMatches:
          0,

        modifyLiquidityTopicMatches:
          0,

        newTokenCandidates:
          0
      },

      backlog: {
        attempted:
          false,

        range:
          null,

        rawLogs:
          0,

        initializeEvents:
          0,

        swapTopicMatches:
          0,

        modifyLiquidityTopicMatches:
          0,

        newTokenCandidates:
          0
      }
    };

  const newTokens =
    new Set();

  const liveTokens =
    new Set();

  const activityByToken =
    {};

  let failedRange =
    null;

  /* =======================================================
     PHASE 1 — TRUE LIVE-FIRST DISCOVERY
     ======================================================= */

  const liveRange =
    liveScanRange(
      latestBlock
    );

  discovery.live.attempted =
    true;

  discovery.live.range =
    liveRange;

  try {
    const liveResult =
      await discoverV4Range(
        env,
        budget,
        liveRange.fromBlock,
        liveRange.toBlock,
        "live"
      );

    discovery.live.rawLogs =
      liveResult.rawLogs;

    discovery.live.initializeEvents =
      liveResult.initializeEvents;

    discovery.live.swapTopicMatches =
      liveResult.swapTopicMatches;

    discovery.live.modifyLiquidityTopicMatches =
      liveResult.modifyLiquidityTopicMatches;

    discovery.live.newTokenCandidates =
      liveResult.tokens
        ?.length || 0;

    for (
      const token of
      liveResult.tokens || []
    ) {
      const address =
        normalize(
          token.address
        );

      if (
        !address ||
        knownQuote(
          address
        )
      ) {
        continue;
      }

      newTokens.add(
        address
      );

      liveTokens.add(
        address
      );

      const existing =
        state.watchedTokens[
          address
        ];

      state.watchedTokens[
        address
      ] = {
        address,

        firstSeenAt:
          existing?.firstSeenAt ||
          Date.now(),

        lastSeenAt:
          Date.now(),

        lastCheckedAt:
          existing?.lastCheckedAt ||
          null,

        checks:
          safeNumber(
            existing?.checks
          ),

        pools:
          uniqueArray([
            ...(
              existing?.pools ||
              []
            ),

            ...(
              token.pools ||
              []
            )
          ]),

        metadata:
          existing?.metadata ||
          {}
      };

      activityByToken[
        address
      ] =
        mergeActivity(
          activityByToken[
            address
          ],
          token.activity
        );
    }

    rangesCompleted.push({
      type:
        "LIVE",

      fromBlock:
        liveRange.fromBlock,

      toBlock:
        liveRange.toBlock
    });

  } catch (error) {
    failedRange = {
      phase:
        "LIVE_DISCOVERY",

      fromBlock:
        liveRange.fromBlock,

      toBlock:
        liveRange.toBlock,

      error:
        String(
          error?.message ||
          error
        )
    };
  }


  /* =======================================================
     PHASE 2 — BACKLOG DISCOVERY
     ======================================================= */

  const backlogRange =
    backlogScanRange(
      previousLastScannedBlock,
      latestBlock
    );

  if (
    backlogRange &&
    budget.discovery.backlog
      .remaining > 0
  ) {
    discovery.backlog.attempted =
      true;

    discovery.backlog.range =
      backlogRange;

    try {
      const backlogResult =
        await discoverV4Range(
          env,
          budget,
          backlogRange.fromBlock,
          backlogRange.toBlock,
          "backlog"
        );

      discovery.backlog.rawLogs =
        backlogResult.rawLogs;

      discovery.backlog.initializeEvents =
        backlogResult.initializeEvents;

      discovery.backlog.swapTopicMatches =
        backlogResult.swapTopicMatches;

      discovery.backlog.modifyLiquidityTopicMatches =
        backlogResult.modifyLiquidityTopicMatches;

      discovery.backlog.newTokenCandidates =
        backlogResult.tokens
          ?.length || 0;

      for (
        const token of
        backlogResult.tokens ||
        []
      ) {
        const address =
          normalize(
            token.address
          );

        if (
          !address ||
          knownQuote(
            address
          )
        ) {
          continue;
        }

        const existed =
          Boolean(
            state.watchedTokens[
              address
            ]
          );

        if (
          !existed
        ) {
          newTokens.add(
            address
          );
        }

        const existing =
          state.watchedTokens[
            address
          ];

        state.watchedTokens[
          address
        ] = {
          address,

          firstSeenAt:
            existing
              ?.firstSeenAt ||
            Date.now(),

          lastSeenAt:
            Date.now(),

          lastCheckedAt:
            existing
              ?.lastCheckedAt ||
            null,

          checks:
            safeNumber(
              existing?.checks
            ),

          pools:
            uniqueArray([
              ...(
                existing?.pools ||
                []
              ),

              ...(
                token.pools ||
                []
              )
            ]),

          metadata:
            existing?.metadata ||
            {}
        };

        activityByToken[
          address
        ] =
          mergeActivity(
            activityByToken[
              address
            ],
            token.activity
          );
      }

      /*
       * Critical V79 rule:
       * only advance persistent backlog cursor
       * after the backlog range completed.
       */

      state.lastScannedBlock =
        backlogRange.toBlock;

      rangesCompleted.push({
        type:
          "BACKLOG",

        fromBlock:
          backlogRange.fromBlock,

        toBlock:
          backlogRange.toBlock
      });

    } catch (error) {
      /*
       * Failed range protection:
       * cursor stays exactly where it was.
       */

      state.lastScannedBlock =
        previousLastScannedBlock;

      if (
        !failedRange
      ) {
        failedRange = {
          phase:
            "BACKLOG_DISCOVERY",

          fromBlock:
            backlogRange.fromBlock,

          toBlock:
            backlogRange.toBlock,

          error:
            String(
              error?.message ||
              error
            )
        };
      }
    }
  }


  /* =======================================================
     PHASE 3 — CANDIDATE ROTATION
     ======================================================= */

  const watchedArray =
    Object.values(
      state.watchedTokens
    );

  watchedArray.sort(
    (
      a,
      b
    ) =>
      watchPriority(
        b,
        newTokens
      ) -
      watchPriority(
        a,
        newTokens
      )
  );

  /*
   * Live tokens are forced to the front.
   * This prevents a 600k-block historical
   * backlog from hiding a token launched now.
   */

  watchedArray.sort(
    (
      a,
      b
    ) => {
      const aLive =
        liveTokens.has(
          normalize(
            a.address
          )
        )
          ? 1
          : 0;

      const bLive =
        liveTokens.has(
          normalize(
            b.address
          )
        )
          ? 1
          : 0;

      return (
        bLive -
        aLive
      );
    }
  );

  const selected =
    watchedArray.slice(
      0,
      MAX_TOKEN_ANALYSIS
    );

  const candidates =
    [];

  const validationResults =
    [];

  let tokenValidationChecks =
    0;

  let validERC20Tokens =
    0;

  let marketLookups =
    0;

  let holderLookups =
    0;


  /* =======================================================
     PHASE 4 — PROTECTED ANALYSIS
     ======================================================= */

  for (
    const watched of
    selected
  ) {
    if (
      budget.analysis
        .remaining <= 0
    ) {
      break;
    }

    const address =
      normalize(
        watched.address
      );

    const priority =
      watchPriority(
        watched,
        newTokens
      );

    const activity =
      activityByToken[
        address
      ] || {
        poolSpecific:
          false,

        swaps:
          0,

        liquidityEvents:
          0,

        initializeEvents:
          0
      };

    const beforeUsed =
      budget.analysis.used;

    const candidate =
      await analyzeToken(
        env,
        budget,
        state,
        watched,
        activity,
        {
          priority,

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

    const analysisRequests =
      budget.analysis.used -
      beforeUsed;

    tokenValidationChecks++;

    if (
      candidate.validation
    ) {
      validationResults.push({
        address,

        priority,

        newlyDiscovered:
          candidate.newlyDiscovered,

        liveDiscovery:
          candidate.liveDiscovery,

        knownQuoteToken:
          knownQuote(
            address
          ),

        validERC20:
          candidate.validERC20,

        reason:
          candidate.validation
            ?.reason,

        name:
          candidate.validation
            ?.name,

        symbol:
          candidate.validation
            ?.symbol,

        decimals:
          candidate.validation
            ?.decimals,

        totalSupply:
          candidate.validation
            ?.totalSupply,

        verifiedAt:
          Date.now(),

        analysisRequests
      });
    }

    if (
      !candidate.validERC20
    ) {
      watched.lastCheckedAt =
        Date.now();

      watched.checks =
        safeNumber(
          watched.checks
        ) + 1;

      continue;
    }

    validERC20Tokens++;

    if (
      candidate.market
        ?.verified
    ) {
      marketLookups++;
    }

    if (
      candidate.holders
        ?.verified
    ) {
      holderLookups++;
    }

    watched.lastCheckedAt =
      Date.now();

    watched.checks =
      safeNumber(
        watched.checks
      ) + 1;

    watched.metadata = {
      name:
        candidate.name,

      symbol:
        candidate.symbol,

      decimals:
        candidate.decimals,

      totalSupply:
        candidate.totalSupply
    };

    state.snapshots[
      address
    ] =
      buildSnapshot(
        candidate
      );

    candidates.push(
      candidate
    );
  }


  /* =======================================================
     PHASE 5 — V79 COMPOSITE RANKING
     ======================================================= */

  candidates.sort(
    (
      a,
      b
    ) =>
      safeNumber(
        b.analysisPriority
      ) -
      safeNumber(
        a.analysisPriority
      )
  );

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        safeNumber(
          candidate.opportunity
            ?.score
        ) >=
          TELEGRAM_MIN_SCORE &&
        safeNumber(
          candidate.confidence
            ?.score
        ) >=
          TELEGRAM_MIN_CONFIDENCE
    );


  /* =======================================================
     PHASE 6 — TELEGRAM
     ======================================================= */

  const telegramCandidates =
    candidates.filter(
      qualifiesTelegram
    );

  const telegramResults =
    [];

  for (
    const candidate of
    telegramCandidates
  ) {
    const address =
      normalize(
        candidate.address
      );

    const previousAlert =
      state.telegramHistory[
        address
      ];

    const now =
      Date.now();

    /*
     * Do not spam identical token calls.
     * A repeat alert is allowed when:
     * - cooldown expired
     * - score materially improved
     * - whale accumulation newly appears
     */

    const score =
      safeNumber(
        candidate.opportunity
          ?.score
      );

    const previousScore =
      safeNumber(
        previousAlert?.score
      );

    const cooldownExpired =
      !previousAlert ||
      now -
        safeNumber(
          previousAlert
            ?.timestamp
        ) >=
        TELEGRAM_COOLDOWN_MS;

    const scoreImproved =
      score -
        previousScore >=
      10;

    const newWhaleAccumulation =
      candidate.whaleFlow
        ?.flow ===
        "NET_ACCUMULATION" &&
      previousAlert
        ?.whaleFlow !==
        "NET_ACCUMULATION";

    if (
      !cooldownExpired &&
      !scoreImproved &&
      !newWhaleAccumulation
    ) {
      telegramResults.push({
        address,

        success:
          false,

        skipped:
          true,

        reason:
          "TELEGRAM_COOLDOWN"
      });

      continue;
    }

    const result =
      await sendTelegram(
        env,
        telegramMessage(
          candidate
        )
      );

    telegramResults.push({
      address,

      symbol:
        candidate.symbol,

      score,

      confidence:
        candidate.confidence
          ?.score,

      result
    });

    if (
      result.success
    ) {
      state.telegramHistory[
        address
      ] = {
        timestamp:
          now,

        score,

        confidence:
          candidate.confidence
            ?.score,

        whaleFlow:
          candidate.whaleFlow
            ?.flow,

        signals:
          candidate
            .signalConfirmation
            ?.signals
      };
    }
  }


  /* =======================================================
     PHASE 7 — SAVE STATE
     ======================================================= */

  state.updatedAt =
    Date.now();

  state.version =
    VERSION;

  state.latestBlock =
    latestBlock;

  const saveResult =
    await saveState(
      env,
      state
    );

  const currentLastScannedBlock =
    safeNumber(
      state.lastScannedBlock
    );

  const backlogRemaining =
    Math.max(
      0,
      latestBlock -
      currentLastScannedBlock
    );


  /* =======================================================
     V79 STATUS
     ======================================================= */

  let status =
    "SCAN_COMPLETE";

  if (
    backlogRemaining > 0
  ) {
    status =
      "LIVE_SCAN_COMPLETE_CATCHUP_CONTINUING";
  }

  if (
    budget.analysis
      .remaining <= 0 &&
    backlogRemaining > 0
  ) {
    status =
      "CATCHUP_PAUSED_ANALYSIS_PROTECTED";
  }

  if (
    failedRange
  ) {
    status =
      "PARTIAL_SCAN_FAILED_RANGE_PROTECTED";
  }


  /* =======================================================
     RESPONSE
     ======================================================= */

  return {
    status,

    scanMode:
      "V79_TRUE_LIVE_FIRST_PERSISTENT_CATCHUP",

    durationMs:
      Date.now() -
      startedAt,

    latestBlock,

    persistence: {
      enabled:
        stateResult.enabled,

      healthy:
        stateResult.healthy,

      status:
        stateResult.status,

      binding:
        stateResult.binding,

      stateReadError:
        stateResult.error ||
        null,

      stateSaved:
        saveResult.success,

      stateSaveError:
        saveResult.error ||
        null,

      previousLastScannedBlock,

      currentLastScannedBlock,

      backlogBefore,

      backlogRemaining,

      catchupTargetBlocks:
        CATCHUP_TARGET_BLOCKS
    },

    requestBudget:
      budgetReport(
        budget
      ),

    rangesCompleted,

    failedRange,

    discovery,

    v4: {
      poolManager:
        POOL_MANAGER,

      rawLogs:
        safeNumber(
          discovery.live
            .rawLogs
        ) +
        safeNumber(
          discovery.backlog
            .rawLogs
        ),

      initializeEvents:
        safeNumber(
          discovery.live
            .initializeEvents
        ) +
        safeNumber(
          discovery.backlog
            .initializeEvents
        ),

      swapTopicMatches:
        safeNumber(
          discovery.live
            .swapTopicMatches
        ) +
        safeNumber(
          discovery.backlog
            .swapTopicMatches
        ),

      modifyLiquidityTopicMatches:
        safeNumber(
          discovery.live
            .modifyLiquidityTopicMatches
        ) +
        safeNumber(
          discovery.backlog
            .modifyLiquidityTopicMatches
        ),

      newTokenCandidates:
        newTokens.size,

      liveTokenCandidates:
        liveTokens.size
    },

    watchedTokens:
      Object.keys(
        state.watchedTokens
      ).length,

    tokenValidationChecks,

    validERC20Tokens,

    validationResults,

    marketLookups,

    holderLookups,

    candidates,

    qualifyingCandidates:
      qualifyingCandidates.length,

    telegramCandidates:
      telegramCandidates.length,

    telegramResults,

    intelligence: {
      trueLiveFirstScanning:
        "ENABLED_V79",

      persistentBlockTracking:
        "ENABLED",

      adaptiveCatchup:
        "ENABLED_V79",

      failedRangeProtection:
        "ENABLED",

      requestBudget:
        "HARD_PHASE_ISOLATION_V79",

      discoveryBudget:
        DISCOVERY_BUDGET,

      analysisBudget:
        ANALYSIS_BUDGET,

      analysisBudgetProtection:
        "HARD_PROTECTED_V79",

      discoveryCanConsumeAnalysis:
        false,

      liveFirstIsolation:
        "ENABLED_V79",

      liveScanBlocks:
        LIVE_SCAN_BLOCKS,

      candidateAnalysisAfterCatchupPause:
        "ENABLED_V79",

      infrastructureFiltering:
        "ENABLED_V79",

      candidateRotation:
        "ENABLED_V79",

      newLaunchPriority:
        "ENABLED_V79",

      launchStageDetection:
        "ENABLED_V79",

      compositeCandidateRanking:
        "ENABLED_V79",

      signalConfirmation:
        "MULTI_SIGNAL_V79",

      poolSpecificActivity:
        "ENABLED",

      historicalSnapshots:
        "ENABLED_V79",

      momentumSnapshotAgeProtection:
        "ENABLED_V79",

      holderGrowth:
        "ENABLED_V79",

      liquidityGrowth:
        "ENABLED_V79",

      volumeAcceleration:
        "ENABLED_V79",

      transactionAcceleration:
        "ENABLED_V79",

      momentumScoring:
        "ENABLED_V79",

      multiSignalConfirmation:
        "ENABLED_V79",

      earlyLaunchDetection:
        "ENABLED_V79",

      marketQuality:
        "ENABLED_V79",

      candidateConfidence:
        "ENABLED_V79",

      whaleConcentration:
        "ENABLED",

      whaleFlow:
        "OBSERVED_BALANCE_CHANGE_V79",

      whaleAccumulation:
        "ENABLED_V79",

      whaleDistribution:
        "ENABLED_V79",

      concentrationTrend:
        "ENABLED_V79",

      smartMoney:
        "BEHAVIOUR_CANDIDATE_SCORING_V79",

      smartMoneyVerified:
        false,

      socialMomentum:
        "NOT_VERIFIED"
    },

    architecture:
      "V79_TRUE_LIVE_FIRST_EARLY_LAUNCH_MULTI_SIGNAL_HUNTER"
  };
}/* =========================================================
   V79 HEALTH
   ========================================================= */

async function health(
  env
) {
  const budget =
    createRequestBudget();

  const stateResult =
    await loadState(
      env
    );

  let latestBlock =
    null;

  let rpcProvider =
    null;

  let rpcError =
    null;

  try {
    const result =
      await rpcCall(
        env,
        budget,
        "eth_blockNumber",
        [],
        "system"
      );

    if (
      result.success &&
      result.result
    ) {
      latestBlock =
        parseInt(
          result.result,
          16
        );

      rpcProvider =
        result.provider ||
        "ROBINHOOD_PUBLIC_RPC";

    } else {
      rpcError =
        result.error ||
        "RPC_FAILED";
    }

  } catch (error) {
    rpcError =
      String(
        error?.message ||
        error
      );
  }

  const state =
    stateResult.state || {};

  const watchedTokens =
    state.watchedTokens &&
    typeof state.watchedTokens ===
      "object"
      ? Object.keys(
          state.watchedTokens
        ).length
      : 0;

  const snapshotTokens =
    state.snapshots &&
    typeof state.snapshots ===
      "object"
      ? Object.keys(
          state.snapshots
        ).length
      : 0;

  const lastScannedBlock =
    state.lastScannedBlock ??
    null;

  const backlogRemaining =
    latestBlock !== null &&
    lastScannedBlock !== null
      ? Math.max(
          0,
          latestBlock -
          safeNumber(
            lastScannedBlock
          )
        )
      : null;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      rpcError
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
      rpcError
        ? "ERROR"
        : "CONNECTED",

    latestBlock,

    rpcProvider,

    error:
      rpcError,

    alchemyConfigured:
      Boolean(
        env.ALCHEMY_API_KEY
      ),

    persistence: {
      kvConfigured:
        stateResult.enabled,

      healthy:
        stateResult.healthy,

      status:
        stateResult.status,

      bindingDetected:
        stateResult.binding,

      stateKey:
        STATE_KEY,

      lastScannedBlock,

      backlogRemaining,

      watchedTokens,

      snapshotTokens,

      stateError:
        stateResult.error ||
        null
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
        TELEGRAM_MIN_SCORE,

      minimumConfidence:
        TELEGRAM_MIN_CONFIDENCE,

      minimumLiquidityUsd:
        TELEGRAM_MIN_LIQUIDITY_USD
    },

    budget: {
      totalRequests:
        TOTAL_REQUEST_BUDGET,

      systemRequests:
        SYSTEM_BUDGET,

      discoveryRequests:
        DISCOVERY_BUDGET,

      liveDiscoveryRequests:
        LIVE_DISCOVERY_BUDGET,

      backlogDiscoveryRequests:
        BACKLOG_DISCOVERY_BUDGET,

      protectedAnalysisRequests:
        ANALYSIS_BUDGET,

      hardPhaseIsolation:
        true,

      liveFirstIsolation:
        true
    },

    intelligence: {
      trueLiveFirstScanning:
        "ENABLED_V79",

      launchStageDetection:
        "ENABLED_V79",

      compositeCandidateRanking:
        "ENABLED_V79",

      signalConfirmation:
        "MULTI_SIGNAL_V79",

      momentumTracking:
        "ENABLED_V79",

      whaleFlow:
        "ENABLED_V79",

      smartMoneyBehaviour:
        "ENABLED_V79",

      socialMomentum:
        "NOT_VERIFIED"
    },

    architecture:
      "V79_TRUE_LIVE_FIRST_EARLY_LAUNCH_MULTI_SIGNAL_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   V79 RPC TEST
   ========================================================= */

async function rpcTest(
  env
) {
  const budget =
    createRequestBudget();

  const startedAt =
    Date.now();

  const block =
    await rpcCall(
      env,
      budget,
      "eth_blockNumber",
      [],
      "system"
    );

  if (
    !block.success
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      error:
        block.error,

      requestBudget:
        budgetReport(
          budget
        ),

      durationMs:
        Date.now() -
        startedAt,

      timestamp:
        now()
    };
  }

  const latestBlock =
    parseInt(
      block.result,
      16
    );

  const fromBlock =
    Math.max(
      0,
      latestBlock - 2
    );

  let logResult =
    null;

  try {
    logResult =
      await rpcCall(
        env,
        budget,
        "eth_getLogs",
        [{
          address:
            POOL_MANAGER,

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
        }],
        "discovery-live"
      );

  } catch (error) {
    logResult = {
      success:
        false,

      error:
        String(
          error?.message ||
          error
        )
    };
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      Boolean(
        block.success &&
        logResult?.success
      ),

    latestBlock,

    poolManager:
      POOL_MANAGER,

    poolManagerLogs:
      Array.isArray(
        logResult?.result
      )
        ? logResult.result.length
        : 0,

    provider:
      logResult?.provider ||
      block.provider ||
      null,

    error:
      logResult?.success
        ? null
        : logResult?.error ||
          null,

    requestBudget:
      budgetReport(
        budget
      ),

    durationMs:
      Date.now() -
      startedAt,

    timestamp:
      now()
  };
}


/* =========================================================
   V79 STATE STATUS
   ========================================================= */

async function stateStatus(
  env
) {
  const result =
    await loadState(
      env
    );

  const state =
    result.state || {};

  const watched =
    state.watchedTokens &&
    typeof state.watchedTokens ===
      "object"
      ? Object.values(
          state.watchedTokens
        )
      : [];

  const snapshots =
    state.snapshots &&
    typeof state.snapshots ===
      "object"
      ? state.snapshots
      : {};

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    persistenceConfigured:
      result.enabled,

    persistenceHealthy:
      result.healthy,

    persistenceStatus:
      result.status,

    bindingDetected:
      result.binding,

    stateKey:
      STATE_KEY,

    error:
      result.error ||
      null,

    lastScannedBlock:
      state.lastScannedBlock ??
      null,

    latestRecordedBlock:
      state.latestBlock ??
      null,

    watchedTokens:
      watched
        .sort(
          (
            a,
            b
          ) =>
            watchPriority(
              b
            ) -
            watchPriority(
              a
            )
        )
        .map(
          token => {
            const address =
              normalize(
                token.address
              );

            const snapshot =
              snapshots[
                address
              ];

            return {
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

              checks:
                safeNumber(
                  token.checks
                ),

              firstSeenAt:
                token.firstSeenAt ||
                null,

              lastSeenAt:
                token.lastSeenAt ||
                null,

              lastCheckedAt:
                token.lastCheckedAt ||
                null,

              poolCount:
                token.pools
                  ?.length ||
                0,

              hasSnapshot:
                Boolean(
                  snapshot
                ),

              snapshotTimestamp:
                snapshot
                  ?.timestamp ||
                null,

              priority:
                watchPriority(
                  token
                )
            };
          }
        ),

    watchedTokenCount:
      watched.length,

    snapshotTokenCount:
      Object.keys(
        snapshots
      ).length,

    telegramHistoryCount:
      Object.keys(
        state.telegramHistory ||
        {}
      ).length,

    updatedAt:
      state.updatedAt ||
      null,

    timestamp:
      now()
  };
}


/* =========================================================
   V79 DIAGNOSTICS
   ========================================================= */

async function diagnostics(
  env
) {
  const startedAt =
    Date.now();

  const budget =
    createRequestBudget();

  const checks = {};

  const stateResult =
    await loadState(
      env
    );

  checks.kv = {
    success:
      Boolean(
        stateResult.enabled &&
        stateResult.healthy
      ),

    configured:
      stateResult.enabled,

    healthy:
      stateResult.healthy,

    status:
      stateResult.status,

    binding:
      stateResult.binding,

    stateKey:
      STATE_KEY,

    readError:
      stateResult.error ||
      null,

    lastScannedBlock:
      stateResult.state
        ?.lastScannedBlock ??
      null,

    watchedTokens:
      Object.keys(
        stateResult.state
          ?.watchedTokens ||
        {}
      ).length,

    snapshotTokens:
      Object.keys(
        stateResult.state
          ?.snapshots ||
        {}
      ).length
  };

  let latestBlock =
    null;

  try {
    const rpc =
      await rpcCall(
        env,
        budget,
        "eth_blockNumber",
        [],
        "system"
      );

    checks.rpc = {
      success:
        rpc.success,

      provider:
        rpc.provider ||
        null,

      error:
        rpc.error ||
        null
    };

    if (
      rpc.success
    ) {
      latestBlock =
        parseInt(
          rpc.result,
          16
        );

      checks.rpc.latestBlock =
        latestBlock;
    }

  } catch (error) {
    checks.rpc = {
      success:
        false,

      error:
        String(
          error?.message ||
          error
        )
    };
  }

  if (
    latestBlock !== null
  ) {
    const fromBlock =
      Math.max(
        0,
        latestBlock - 2
      );

    try {
      const logs =
        await rpcCall(
          env,
          budget,
          "eth_getLogs",
          [{
            address:
              POOL_MANAGER,

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
          }],
          "discovery-live"
        );

      checks.poolManager = {
        success:
          logs.success,

        address:
          POOL_MANAGER,

        logs:
          Array.isArray(
            logs.result
          )
            ? logs.result.length
            : 0,

        provider:
          logs.provider ||
          null,

        error:
          logs.error ||
          null
      };

    } catch (error) {
      checks.poolManager = {
        success:
          false,

        address:
          POOL_MANAGER,

        error:
          String(
            error?.message ||
            error
          )
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
    configured:
      true,

    mode:
      "PUBLIC_API"
  };

  checks.blockscout = {
    configured:
      true,

    mode:
      "PUBLIC_API"
  };

  checks.v79 = {
    trueLiveFirstScanning:
      true,

    liveScanBeforeBacklog:
      true,

    persistentBacklogCursor:
      true,

    failedRangeProtection:
      true,

    hardPhaseBudgetIsolation:
      true,

    totalRequestLimit:
      TOTAL_REQUEST_BUDGET,

    systemRequestLimit:
      SYSTEM_BUDGET,

    discoveryRequestLimit:
      DISCOVERY_BUDGET,

    liveDiscoveryRequestLimit:
      LIVE_DISCOVERY_BUDGET,

    backlogDiscoveryRequestLimit:
      BACKLOG_DISCOVERY_BUDGET,

    protectedAnalysisRequests:
      ANALYSIS_BUDGET,

    discoveryCanConsumeAnalysis:
      false,

    liveDiscoveryCanConsumeBacklog:
      false,

    backlogCanConsumeLive:
      false,

    candidateAnalysisAfterCatchupPause:
      true,

    rpcFallbackPhaseAccounting:
      true,

    infrastructureFiltering:
      true,

    candidateRotation:
      true,

    liveCandidatePriority:
      true,

    newLaunchPriority:
      true,

    launchStageDetection:
      true,

    compositeCandidateRanking:
      true,

    multiSignalConfirmation:
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
      false,

    socialMomentumVerification:
      false
  };

  const criticalOK =
    Boolean(
      checks.rpc?.success &&
      checks.poolManager?.success
    );

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
        !checks.rpc?.success
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

    requestBudget:
      budgetReport(
        budget
      ),

    durationMs:
      Date.now() -
      startedAt,

    architecture:
      "V79_TRUE_LIVE_FIRST_EARLY_LAUNCH_MULTI_SIGNAL_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   V79 TELEGRAM TEST
   ========================================================= */

async function telegramTest(
  env
) {
  const configured =
    Boolean(
      env.TELEGRAM_BOT_TOKEN &&
      env.TELEGRAM_CHAT_ID
    );

  if (
    !configured
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      telegramConfigured:
        false,

      sent:
        false,

      reason:
        "TELEGRAM_NOT_CONFIGURED",

      timestamp:
        now()
    };
  }

  /*
   * This deliberately sends only a system test.
   * It does NOT fabricate a token call.
   */

  const message =
`✅ <b>Robinhood Chain Meme Hunter V79</b>

Telegram connection test successful.

⚡ True live-first scanning enabled
📚 Historical catch-up enabled
🛡 Protected analysis budget enabled
🐋 Whale-flow tracking enabled
📈 Momentum tracking enabled

No token alert was generated by this test.`;

  const result =
    await sendTelegram(
      env,
      message
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.success,

    telegramConfigured:
      true,

    sent:
      result.success,

    result,

    safetyTest:
      "NO_FAKE_TOKEN_ALERT_SENT",

    timestamp:
      now()
  };
}


/* =========================================================
   V79 RUN ALL
   ========================================================= */

async function runAll(
  env
) {
  const startedAt =
    Date.now();

  const errors =
    [];

  let scanResult =
    null;

  let stateResult =
    null;

  try {
    scanResult =
      await scan(
        env
      );

  } catch (error) {
    errors.push({
      test:
        "scan",

      error:
        String(
          error?.message ||
          error
        )
    });
  }

  try {
    stateResult =
      await stateStatus(
        env
      );

  } catch (error) {
    errors.push({
      test:
        "state",

      error:
        String(
          error?.message ||
          error
        )
    });
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      errors.length === 0,

    status:
      errors.length
        ? "COMPLETED_WITH_ERRORS"
        : "ALL_CORE_TESTS_COMPLETED",

    durationMs:
      Date.now() -
      startedAt,

    errors,

    results: {
      scan:
        scanResult,

      state:
        stateResult,

      note:
        "V79 /run-all performs the live-first scan and state verification without duplicating diagnostics or sending a Telegram test message."
    },

    timestamp:
      now()
  };
}


/* =========================================================
   V79 JSON RESPONSE
   ========================================================= */

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
   V79 ROUTER
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
      ) || "/";

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
    path === "/" ||
    path === "/health"
  ) {
    return jsonResponse(
      await health(
        env
      )
    );
  }

  if (
    path === "/rpc-test"
  ) {
    return jsonResponse(
      await rpcTest(
        env
      )
    );
  }

  if (
    path === "/scan"
  ) {
    return jsonResponse({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        true,

      scan:
        await scan(
          env
        ),

      chain: {
        name:
          CHAIN_NAME,

        chainId:
          CHAIN_ID
      },

      timestamp:
        now()
    });
  }

  if (
    path === "/state"
  ) {
    return jsonResponse(
      await stateStatus(
        env
      )
    );
  }

  if (
    path === "/diagnostics"
  ) {
    return jsonResponse(
      await diagnostics(
        env
      )
    );
  }

  if (
    path === "/run-all"
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
   V79 SCHEDULED SCANNER
   ========================================================= */

async function scheduledScan(
  env
) {
  const startedAt =
    Date.now();

  try {
    const result =
      await scan(
        env
      );

    const topCandidate =
      result.candidates?.[0] ||
      null;

    console.log(
      JSON.stringify({
        event:
          "V79_SCHEDULED_SCAN",

        success:
          true,

        status:
          result.status,

        scanMode:
          result.scanMode,

        durationMs:
          Date.now() -
          startedAt,

        latestBlock:
          result.latestBlock,

        lastScannedBlock:
          result.persistence
            ?.currentLastScannedBlock,

        backlogRemaining:
          result.persistence
            ?.backlogRemaining,

        persistenceHealthy:
          result.persistence
            ?.healthy,

        totalRequests:
          result.requestBudget
            ?.used,

        discoveryRequests:
          result.requestBudget
            ?.discovery
            ?.used,

        liveDiscoveryRequests:
          result.requestBudget
            ?.discovery
            ?.live
            ?.used,

        backlogDiscoveryRequests:
          result.requestBudget
            ?.discovery
            ?.backlog
            ?.used,

        analysisRequests:
          result.requestBudget
            ?.analysis
            ?.used,

        analysisBudgetRemaining:
          result.requestBudget
            ?.analysis
            ?.remaining,

        hardPhaseIsolation:
          result.requestBudget
            ?.hardPhaseIsolation,

        liveFirstIsolation:
          result.requestBudget
            ?.liveFirstIsolation,

        liveTokenCandidates:
          result.v4
            ?.liveTokenCandidates ||
          0,

        newTokenCandidates:
          result.v4
            ?.newTokenCandidates ||
          0,

        watchedTokens:
          result.watchedTokens ||
          0,

        validationChecks:
          result.tokenValidationChecks ||
          0,

        marketLookups:
          result.marketLookups ||
          0,

        holderLookups:
          result.holderLookups ||
          0,

        candidates:
          result.candidates
            ?.length ||
          0,

        qualifying:
          result.qualifyingCandidates ||
          0,

        telegramCandidates:
          result.telegramCandidates ||
          0,

        telegramAlerts:
          result.telegramResults
            ?.filter(
              item =>
                item.result
                  ?.success
            )
            .length ||
          0,

        topCandidate:
          topCandidate
            ? {
                symbol:
                  topCandidate.symbol,

                address:
                  topCandidate.address,

                opportunity:
                  topCandidate
                    .opportunity
                    ?.score,

                confidence:
                  topCandidate
                    .confidence
                    ?.score,

                signalConfirmation:
                  topCandidate
                    .signalConfirmation
                    ?.score,

                confirmedSignals:
                  topCandidate
                    .signalConfirmation
                    ?.signals,

                analysisPriority:
                  topCandidate
                    .analysisPriority,

                launchStage:
                  topCandidate
                    .launchStage
                    ?.stage,

                momentum:
                  topCandidate
                    .momentum
                    ?.label,

                whaleFlow:
                  topCandidate
                    .whaleFlow
                    ?.flow,

                liveDiscovery:
                  topCandidate
                    .liveDiscovery
              }
            : null,

        architecture:
          "V79_TRUE_LIVE_FIRST_EARLY_LAUNCH_MULTI_SIGNAL_HUNTER",

        timestamp:
          now()
      })
    );

    return result;

  } catch (error) {
    console.error(
      JSON.stringify({
        event:
          "V79_SCHEDULED_SCAN_FAILED",

        success:
          false,

        error:
          String(
            error?.message ||
            error
          ),

        durationMs:
          Date.now() -
          startedAt,

        timestamp:
          now()
      })
    );

    throw error;
  }
}


/* =========================================================
   CLOUDFLARE WORKER EXPORT
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

    } catch (error) {
      console.error(
        "V79 request failed",
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
            String(
              error?.message ||
              error
            ),

          architecture:
            "V79_TRUE_LIVE_FIRST_EARLY_LAUNCH_MULTI_SIGNAL_HUNTER",

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
