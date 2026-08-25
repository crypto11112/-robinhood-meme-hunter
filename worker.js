/**
 * Robinhood Chain Meme Hunter
 * V71
 *
 * Full standalone replacement for V70.
 *
 * V71 keeps:
 * - Robinhood public RPC
 * - Alchemy fallback
 * - Exact Uniswap V4 discovery
 * - Persistent KV block tracking
 * - Catch-up scanning
 * - Persistent candidate watch list
 * - ERC20 verification
 * - DexScreener market data
 * - Blockscout holder data
 * - Rug-risk scoring
 * - Opportunity scoring
 * - Telegram alerts
 * - Persistent duplicate protection
 *
 * V71 adds:
 * - Whale holder detection
 * - Whale concentration intelligence
 * - Large-wallet transfer-flow analysis
 * - Accumulation / distribution detection
 * - Smart-money CANDIDATE scoring
 * - Whale intelligence added to opportunity score
 * - Whale intelligence added to rug-risk score
 *
 * IMPORTANT:
 * "Smart money" is NOT claimed as verified unless historical
 * wallet performance is actually available.
 */

const VERSION = "V71";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const DEXSCREENER_BASE =
  "https://api.dexscreener.com";

const DEX_CHAIN_ID =
  "robinhood";

const BLOCKSCOUT_PUBLIC =
  "https://robinhoodchain.blockscout.com";

const BLOCKSCOUT_PRO =
  "https://api.blockscout.com/4663";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const KNOWN_QUOTE_TOKENS =
  new Set([
    "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
  ]);

/*
 * =========================================================
 * LIMITS
 * =========================================================
 */

const DISCOVERY_BLOCKS = 10;

const MAX_CATCHUP_CHUNKS = 12;

const RPC_TIMEOUT_MS = 3000;
const HTTP_TIMEOUT_MS = 4000;

const MAX_TOKEN_CHECKS = 5;
const MAX_MARKET_LOOKUPS = 3;
const MAX_HOLDER_LOOKUPS = 2;

/*
 * V71 whale workload limits.
 */

const MAX_WHALE_ANALYSES = 2;

const MAX_WHALE_WALLETS = 10;

const MAX_WHALE_TRANSFER_LOOKUPS = 4;

const WHALE_MIN_SUPPLY_PERCENT = 1;

const EXTREME_WHALE_PERCENT = 20;

const SMART_MONEY_CANDIDATE_SCORE = 55;

const MIN_TELEGRAM_SCORE = 60;

const MAX_RUG_RISK_FOR_ALERT = 59;

const MIN_ALERT_LIQUIDITY_USD = 1000;

const DEX_MAX_ATTEMPTS = 3;

const BLOCKSCOUT_MAX_ATTEMPTS = 2;

const WATCH_TOKEN_MAX_AGE_MS =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

const ALERT_COOLDOWN_MS =
  6 * 60 * 60 * 1000;

/*
 * Preserve existing V69/V70 KV state.
 */

const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

const MEMORY_ALERTS =
  new Map();


/*
 * =========================================================
 * V4 EVENTS
 * =========================================================
 */

const V4_INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const V4_SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const V4_MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";


/*
 * =========================================================
 * ERC20
 * =========================================================
 */

const SEL_NAME =
  "0x06fdde03";

const SEL_SYMBOL =
  "0x95d89b41";

const SEL_DECIMALS =
  "0x313ce567";

const SEL_TOTAL_SUPPLY =
  "0x18160ddd";


/*
 * =========================================================
 * BASIC HELPERS
 * =========================================================
 */

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


function now() {
  return new Date()
    .toISOString();
}


function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(
        resolve,
        ms
      )
  );
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


function safeNumber(
  value
) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}


function isAddress(
  value
) {
  return (
    typeof value ===
      "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(
      value
    )
  );
}


function normalizeAddress(
  value
) {
  return String(
    value || ""
  ).toLowerCase();
}


function isZeroAddress(
  value
) {
  return (
    !value ||
    normalizeAddress(
      value
    ) ===
      ZERO
  );
}


function isKnownQuoteToken(
  address
) {
  return KNOWN_QUOTE_TOKENS
    .has(
      normalizeAddress(
        address
      )
    );
}


function topicToAddress(
  topic
) {
  if (
    typeof topic !==
      "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(
      topic
    )
  ) {
    return null;
  }

  return (
    "0x" +
    topic.slice(-40)
  );
}


function hexToNumber(
  hex
) {
  if (!hex) {
    return null;
  }

  try {
    return Number(
      BigInt(hex)
    );

  } catch {
    return null;
  }
}


function hexWord(
  data,
  index
) {
  if (
    typeof data !==
      "string" ||
    !data.startsWith(
      "0x"
    )
  ) {
    return null;
  }

  const raw =
    data.slice(2);

  const start =
    index * 64;

  const end =
    start + 64;

  if (
    end >
    raw.length
  ) {
    return null;
  }

  return (
    "0x" +
    raw.slice(
      start,
      end
    )
  );
}


function decodeSignedInt(
  hex,
  bits
) {
  if (!hex) {
    return null;
  }

  try {
    let value =
      BigInt(hex);

    const mask =
      (
        1n <<
        BigInt(bits)
      ) -
      1n;

    value &=
      mask;

    const sign =
      1n <<
      BigInt(
        bits - 1
      );

    if (
      value >= sign
    ) {
      value -=
        1n <<
        BigInt(bits);
    }

    return value;

  } catch {
    return null;
  }
}


function percentage(
  numerator,
  denominator
) {
  const a =
    safeNumber(
      numerator
    );

  const b =
    safeNumber(
      denominator
    );

  if (
    b <= 0
  ) {
    return null;
  }

  return (
    a /
    b *
    100
  );
}


function formatMoney(
  value
) {
  const n =
    safeNumber(
      value
    );

  if (
    n <= 0
  ) {
    return "UNVERIFIED";
  }

  if (
    n >=
    1_000_000_000
  ) {
    return (
      "$" +
      (
        n /
        1_000_000_000
      ).toFixed(2) +
      "B"
    );
  }

  if (
    n >=
    1_000_000
  ) {
    return (
      "$" +
      (
        n /
        1_000_000
      ).toFixed(2) +
      "M"
    );
  }

  if (
    n >= 1000
  ) {
    return (
      "$" +
      (
        n /
        1000
      ).toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    n.toFixed(2)
  );
}


/*
 * =========================================================
 * KV
 * =========================================================
 */

function getStateKV(
  env
) {
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

  return {
    kv:
      null,

    binding:
      null
  };
}


function defaultState() {
  return {
    version:
      VERSION,

    lastScannedBlock:
      null,

    watchedTokens:
      [],

    alerts:
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
  const binding =
    getStateKV(
      env
    );

  if (
    !binding.kv
  ) {
    return {
      persistent:
        false,

      binding:
        null,

      state:
        defaultState(),

      error:
        null
    };
  }

  try {
    const raw =
      await binding.kv
        .get(
          STATE_KEY
        );

    if (!raw) {
      return {
        persistent:
          true,

        binding:
          binding.binding,

        state:
          defaultState(),

        error:
          null
      };
    }

    const parsed =
      JSON.parse(
        raw
      );

    return {
      persistent:
        true,

      binding:
        binding.binding,

      state: {
        ...defaultState(),
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
          parsed
            ?.alerts &&
          typeof parsed
            .alerts ===
            "object"
            ? parsed.alerts
            : {}
      },

      error:
        null
    };

  } catch (error) {
    return {
      persistent:
        true,

      binding:
        binding.binding,

      state:
        defaultState(),

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


async function writeState(
  env,
  state
) {
  const binding =
    getStateKV(
      env
    );

  if (
    !binding.kv
  ) {
    return {
      saved:
        false,

      binding:
        null,

      reason:
        "KV_NOT_CONFIGURED"
    };
