/**

 * Robinhood Chain Meme Hunter

 * V79

 *

 * COMPLETE DEPLOYABLE CLOUDFLARE WORKER

 *

 * Built from the working V78 architecture/state format.

 *

 * V79:

 * - Preserves existing KV state key

 * - Preserves V4 pool discovery

 * - Preserves ERC20 verification

 * - Preserves DexScreener market intelligence

 * - Preserves Blockscout holder intelligence

 * - Preserves momentum snapshots

 * - Preserves whale accumulation/distribution detection

 * - Preserves candidate scoring

 * - Preserves Telegram alerts

 *

 * NEW:

 * - TRUE LIVE-FIRST scanning

 * - Latest blocks scanned every run

 * - Historical backlog cannot block fresh launch discovery

 * - Separate live/backlog discovery budgets

 * - Protected analysis budget

 * - Independent historical cursor

 * - Live candidates forced to front of analysis queue

 * - Recent ERC20 metadata reuse

 * - Correct phase handling throughout RPC/log scanning

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

 * Preserve the existing state/history created by V69-V78.

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

 * Discovery cannot consume protected analysis.

 * Live discovery cannot consume backlog allocation.

 * Backlog discovery cannot consume live allocation.

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

   ALERTS

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

   BUDGET

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

  budget.totalUsed += amount;

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

          "no-store",

        "access-control-allow-origin":

          "*"

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

    normalize(

      address

    )

  );

}

function knownQuoteMetadata(

  address,

  symbol

) {

  if (

    knownQuote(

      address

    )

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

    safeNumber(

      value

    );

  if (!n) {

    return "UNVERIFIED";

  }

  if (

    n >= 1e9

  ) {

    return (

      "$" +

      (n / 1e9)

        .toFixed(2) +

      "B"

    );

  }

  if (

    n >= 1e6

  ) {

   
