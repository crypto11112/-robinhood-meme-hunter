/**
 * Robinhood Chain Meme Hunter
 * V70
 *
 * Full replacement for V69.
 *
 * V70 keeps all working V69 functionality.
 *
 * V70 fixes:
 * - Uses Cloudflare KV binding KV_BINDING
 * - Also accepts MEME_HUNTER_STATE as fallback
 * - Preserves persistent catch-up scanning
 * - Preserves persistent token watch list
 * - Preserves persistent Telegram cooldown
 * - Correctly reports previous vs current scanned block
 */

const VERSION = "V70";

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
 * Keep same state key so existing V69 state
 * is not lost if it already exists.
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

/*
 * V70 FIX:
 *
 * Cloudflare currently has your namespace configured as
 * KV_BINDING.
 *
 * We support BOTH names so either configuration works.
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


function hasStateKV(
  env
) {
  return Boolean(
    getStateKV(env).kv
  );
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
    getStateKV(env);

  if (!binding.kv) {
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
      JSON.parse(raw);

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
          parsed?.alerts &&
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
    getStateKV(env);

  if (!binding.kv) {
    return {
      saved:
        false,

      binding:
        null,

      reason:
        "KV_NOT_CONFIGURED"
    };
  }

  try {
    state.version =
      VERSION;

    state.updatedAt =
      now();

    await binding.kv
      .put(
        STATE_KEY,
        JSON.stringify(
          state
        )
      );

    return {
      saved:
        true,

      binding:
        binding.binding,

      reason:
        null
    };

  } catch (error) {
    return {
      saved:
        false,

      binding:
        binding.binding,

      reason:
        String(
          error?.message ||
          error
        )
    };
  }
}


function pruneState(
  state
) {
  const current =
    Date.now();

  state.watchedTokens =
    (
      state.watchedTokens ||
      []
    )
      .filter(
        item => {
          const firstSeen =
            safeNumber(
              item.firstSeenAt
            );

          return (
            firstSeen >
              0 &&
            current -
              firstSeen <=
              WATCH_TOKEN_MAX_AGE_MS
          );
        }
      )
      .slice(
        0,
        MAX_WATCHED_TOKENS
      );

  const alerts =
    state.alerts ||
    {};

  for (
    const [
      token,
      timestamp
    ] of
    Object.entries(
      alerts
    )
  ) {
    if (
      current -
        safeNumber(
          timestamp
        ) >
      ALERT_COOLDOWN_MS
    ) {
      delete alerts[
        token
      ];
    }
  }

  state.alerts =
    alerts;
}


function mergeWatchedToken(
  state,
  candidate
) {
  const address =
    normalizeAddress(
      candidate.address
    );

  let existing =
    state.watchedTokens
      .find(
        token =>
          normalizeAddress(
            token.address
          ) ===
          address
      );

  if (!existing) {
    existing = {
      address:
        candidate.address,

      pools:
        [],

      firstSeenAt:
        Date.now(),

      lastCheckedAt:
        null,

      checks:
        0,

      metadata:
        null,

      lastMarket:
        null
    };

    state.watchedTokens
      .push(
        existing
      );
  }

  const existingPoolIds =
    new Set(
      (
        existing.pools ||
        []
      )
        .map(
          pool =>
            pool.poolId
        )
        .filter(
          Boolean
        )
    );

  for (
    const pool of
    candidate.pools ||
    []
  ) {
    if (
      pool?.poolId &&
      !existingPoolIds
        .has(
          pool.poolId
        )
    ) {
      existing.pools
        .push(
          pool
        );

      existingPoolIds
        .add(
          pool.poolId
        );
    }
  }

  return existing;
}


/*
 * =========================================================
 * HTTP
 * =========================================================
 */

async function fetchWithTimeout(
  url,
  options = {},
  timeout =
    HTTP_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      timeout
    );

  try {
    return await fetch(
      url,
      {
        ...options,

        signal:
          controller.signal
      }
    );

  } finally {
    clearTimeout(
      timer
    );
  }
}


/*
 * =========================================================
 * RPC
 * =========================================================
 */

function alchemyRpc(
  env
) {
  if (
    !env.ALCHEMY_API_KEY
  ) {
    return null;
  }

  return (
    ALCHEMY_BASE +
    env.ALCHEMY_API_KEY
  );
}


async function rpcRequest(
  url,
  method,
  params,
  attempt = 0
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () =>
        controller.abort(),
      RPC_TIMEOUT_MS
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
      response.status ===
      429
    ) {
      if (
        attempt < 2
      ) {
        await sleep(
          300 *
          Math.pow(
            2,
            attempt
          )
        );

        return rpcRequest(
          url,
          method,
          params,
          attempt + 1
        );
      }

      throw new Error(
        "HTTP 429"
      );
    }

    if (
      !response.ok
    ) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const body =
      await response.json();

    if (
      body.error
    ) {
      throw new Error(
        body.error
          .message ||
        `RPC error ${body.error.code}`
      );
    }

    return body.result;

  } finally {
    clearTimeout(
      timer
    );
  }
}


async function rpcWithFallback(
  env,
  method,
  params
) {
  let publicError =
    null;

  try {
    const result =
      await rpcRequest(
        PUBLIC_RPC,
        method,
        params
      );

    return {
      result,

      provider:
        "ROBINHOOD_PUBLIC_RPC",

      error:
        null
    };

  } catch (error) {
    publicError =
      String(
        error?.message ||
        error
      );
  }

  const alchemy =
    alchemyRpc(
      env
    );

  if (!alchemy) {
    return {
      result:
        null,

      provider:
        null,

      error:
        `ROBINHOOD_PUBLIC_RPC: ${publicError}; ` +
        "ALCHEMY_NOT_CONFIGURED"
    };
  }

  try {
    const result =
      await rpcRequest(
        alchemy,
        method,
        params
      );

    return {
      result,

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
        `ROBINHOOD_PUBLIC_RPC: ${publicError}; ` +
        `ALCHEMY: ${String(
          error?.message ||
          error
        )}`
    };
  }
}


/*
 * =========================================================
 * BLOCK / LOGS
 * =========================================================
 */

async function getLatestBlock(
  env
) {
  const result =
    await rpcWithFallback(
      env,
      "eth_blockNumber",
      []
    );

  if (
    !result.result
  ) {
    throw new Error(
      result.error ||
      "LATEST_BLOCK_FAILED"
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
  fromBlock,
  toBlock,
  address = null,
  topics = null
) {
  const filter = {
    fromBlock:
      "0x" +
      fromBlock
        .toString(16),

    toBlock:
      "0x" +
      toBlock
        .toString(16)
  };

  if (address) {
    filter.address =
      address;
  }

  if (topics) {
    filter.topics =
      topics;
  }

  return rpcWithFallback(
    env,
    "eth_getLogs",
    [
      filter
    ]
  );
}


/*
 * =========================================================
 * CATCH-UP
 * =========================================================
 */

function buildScanRanges(
  latestBlock,
  lastScannedBlock,
  persistent
) {
  if (!persistent) {
    const from =
      latestBlock -
      BigInt(
        DISCOVERY_BLOCKS -
        1
      );

    return {
      mode:
        "LATEST_WINDOW_FALLBACK",

      ranges: [
        {
          fromBlock:
            from < 0n
              ? 0n
              : from,

          toBlock:
            latestBlock
        }
      ],

      backlogBlocks:
        0
    };
  }

  if (
    lastScannedBlock ===
      null ||
    lastScannedBlock ===
      undefined
  ) {
    const from =
      latestBlock -
      BigInt(
        DISCOVERY_BLOCKS -
        1
      );

    return {
      mode:
        "PERSISTENT_BOOTSTRAP",

      ranges: [
        {
          fromBlock:
            from < 0n
              ? 0n
              : from,

          toBlock:
            latestBlock
        }
      ],

      backlogBlocks:
        DISCOVERY_BLOCKS
    };
  }

  const last =
    BigInt(
      lastScannedBlock
    );

  if (
    last >=
    latestBlock
  ) {
    return {
      mode:
        "UP_TO_DATE",

      ranges:
        [],

      backlogBlocks:
        0
    };
  }

  const start =
    last + 1n;

  const backlog =
    latestBlock -
    start +
    1n;

  const ranges =
    [];

  let cursor =
    start;

  while (
    cursor <=
      latestBlock &&
    ranges.length <
      MAX_CATCHUP_CHUNKS
  ) {
    let end =
      cursor +
      BigInt(
        DISCOVERY_BLOCKS -
        1
      );

    if (
      end >
      latestBlock
    ) {
      end =
        latestBlock;
    }

    ranges.push({
      fromBlock:
        cursor,

      toBlock:
        end
    });

    cursor =
      end + 1n;
  }

  return {
    mode:
      "PERSISTENT_CATCHUP",

    ranges,

    backlogBlocks:
      Number(
        backlog
      )
  };
}


/*
 * =========================================================
 * ERC20 VERIFY
 * =========================================================
 */

async function ethCall(
  env,
  token,
  data
) {
  const result =
    await rpcWithFallback(
      env,
      "eth_call",
      [
        {
          to:
            token,

          data
        },

        "latest"
      ]
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


function decodeUint256(
  hex
) {
  if (
    typeof hex !==
      "string" ||
    !/^0x[0-9a-fA-F]+$/.test(
      hex
    ) ||
    hex.length <
      66
  ) {
    return null;
  }

  try {
    return BigInt(
      hex
    );
  } catch {
    return null;
  }
}


function hexToUtf8(
  hex
) {
  try {
    const bytes =
      new Uint8Array(
        hex
          .match(
            /.{1,2}/g
          )
          ?.map(
            value =>
              parseInt(
                value,
                16
              )
          ) ||
        []
      );

    return new TextDecoder()
      .decode(
        bytes
      )
      .replace(
        /\0/g,
        ""
      )
      .trim();

  } catch {
    return null;
  }
}


function decodeString(
  hex
) {
  if (
    typeof hex !==
      "string" ||
    !/^0x[0-9a-fA-F]*$/.test(
      hex
    )
  ) {
    return null;
  }

  const raw =
    hex.slice(2);

  if (
    !raw.length
  ) {
    return null;
  }

  try {
    if (
      raw.length >=
      128
    ) {
      const offset =
        Number(
          BigInt(
            "0x" +
            raw.slice(
              0,
              64
            )
          )
        );

      const lengthPos =
        offset * 2;

      if (
        lengthPos + 64 <=
        raw.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              raw.slice(
                lengthPos,
                lengthPos + 64
              )
            )
          );

        const start =
          lengthPos +
          64;

        const end =
          start +
          length *
          2;

        if (
          end <=
          raw.length
        ) {
          return hexToUtf8(
            raw.slice(
              start,
              end
            )
          );
        }
      }
    }

    if (
      raw.length >=
      64
    ) {
      return hexToUtf8(
        raw.slice(
          0,
          64
        )
      );
    }

  } catch {}

  return null;
}


async function getCode(
  env,
  address
) {
  const result =
    await rpcWithFallback(
      env,
      "eth_getCode",
      [
        address,
        "latest"
      ]
    );

  return {
    code:
      result.result ||
      null,

    provider:
      result.provider,

    error:
      result.error
  };
}


async function verifyERC20(
  env,
  address
) {
  if (
    !isAddress(
      address
    ) ||
    isZeroAddress(
      address
    )
  ) {
    return {
      validERC20:
        false,

      reason:
        "INVALID_OR_ZERO_ADDRESS"
    };
  }

  const codeResult =
    await getCode(
      env,
      address
    );

  if (
    !codeResult.code ||
    codeResult.code ===
      "0x"
  ) {
    return {
      validERC20:
        false,

      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  const checks = {};

  try {
    checks.name =
      decodeString(
        await ethCall(
          env,
          address,
          SEL_NAME
        )
      );

  } catch {
    checks.name =
      null;
  }

  try {
    checks.symbol =
      decodeString(
        await ethCall(
          env,
          address,
          SEL_SYMBOL
        )
      );

  } catch {
    checks.symbol =
      null;
  }

  try {
    const result =
      decodeUint256(
        await ethCall(
          env,
          address,
          SEL_DECIMALS
        )
      );

    checks.decimals =
      result !==
        null
        ? Number(
            result
          )
        : null;

  } catch {
    checks.decimals =
      null;
  }

  try {
    checks.totalSupply =
      decodeUint256(
        await ethCall(
          env,
          address,
          SEL_TOTAL_SUPPLY
        )
      );

  } catch {
    checks.totalSupply =
      null;
  }

  const methodScore =
    (
      checks.name
        ? 1
        : 0
    ) +
    (
      checks.symbol
        ? 1
        : 0
    ) +
    (
      checks.decimals !==
        null
        ? 1
        : 0
    ) +
    (
      checks.totalSupply !==
        null
        ? 1
        : 0
    );

  if (
    methodScore <
    3
  ) {
    return {
      validERC20:
        false,

      reason:
        "ERC20_METHODS_NOT_VERIFIED",

      ...checks
    };
  }

  if (
    checks.decimals ===
      null ||
    checks.decimals <
      0 ||
    checks.decimals >
      255
  ) {
    return {
      validERC20:
        false,

      reason:
        "INVALID_DECIMALS",

      ...checks
    };
  }

  if (
    checks.totalSupply ===
      null ||
    checks.totalSupply <=
      0n
  ) {
    return {
      validERC20:
        false,

      reason:
        "INVALID_TOTAL_SUPPLY",

      ...checks
    };
  }

  return {
    validERC20:
      true,

    reason:
      "VERIFIED",

    address,

    bytecode:
      true,

    name:
      checks.name,

    symbol:
      checks.symbol,

    decimals:
      checks.decimals,

    totalSupply:
      checks.totalSupply
        .toString()
  };
}


/*
 * =========================================================
 * V4 INITIALIZE
 * =========================================================
 */

function decodeInitializeLog(
  log
) {
  if (
    !log ||
    !Array.isArray(
      log.topics
    ) ||
    log.topics.length !==
      4
  ) {
    return null;
  }

  if (
    String(
      log.topics[0] ||
      ""
    ).toLowerCase() !==
    V4_INITIALIZE_TOPIC
  ) {
    return null;
  }

  const currency0 =
    topicToAddress(
      log.topics[2]
    );

  const currency1 =
    topicToAddress(
      log.topics[3]
    );

  if (
    !currency0 ||
    !currency1
  ) {
    return null;
  }

  const data =
    log.data ||
    "0x";

  if (
    !/^0x[0-9a-fA-F]{320}$/.test(
      data
    )
  ) {
    return null;
  }

  const fee =
    hexToNumber(
      hexWord(
        data,
        0
      )
    );

  const tickSpacing =
    decodeSignedInt(
      hexWord(
        data,
        1
      ),
      24
    );

  const hooks =
    topicToAddress(
      hexWord(
        data,
        2
      )
    );

  let sqrtPriceX96 =
    null;

  try {
    sqrtPriceX96 =
      BigInt(
        hexWord(
          data,
          3
        )
      );

  } catch {}

  const tick =
    decodeSignedInt(
      hexWord(
        data,
        4
      ),
      24
    );

  if (
    fee === null ||
    tickSpacing ===
      null ||
    !hooks ||
    sqrtPriceX96 ===
      null ||
    tick === null
  ) {
    return null;
  }

  return {
    poolId:
      log.topics[1],

    currency0,

    currency1,

    fee,

    tickSpacing:
      tickSpacing
        .toString(),

    hooks,

    sqrtPriceX96:
      sqrtPriceX96
        .toString(),

    tick:
      tick.toString(),

    blockNumber:
      log.blockNumber,

    transactionHash:
      log.transactionHash,

    logIndex:
      log.logIndex,

    address:
      log.address
  };
}


function extractTokenCurrencies(
  pool
) {
  const result =
    [];

  for (
    const currency of [
      pool.currency0,
      pool.currency1
    ]
  ) {
    if (
      !currency ||
      isZeroAddress(
        currency
      )
    ) {
      continue;
    }

    if (
      !result.some(
        token =>
          normalizeAddress(
            token
          ) ===
          normalizeAddress(
            currency
          )
      )
    ) {
      result.push(
        currency
      );
    }
  }

  return result;
}


/*
 * =========================================================
 * PRIORITY
 * =========================================================
 */

function candidatePriority(
  candidate
) {
  let priority =
    50;

  if (
    isKnownQuoteToken(
      candidate.address
    )
  ) {
    priority -=
      40;
  }

  for (
    const pool of
    candidate.pools ||
    []
  ) {
    const other =
      normalizeAddress(
        pool.currency0
      ) ===
      normalizeAddress(
        candidate.address
      )
        ? pool.currency1
        : pool.currency0;

    if (
      isKnownQuoteToken(
        other
      )
    ) {
      priority +=
        35;
    }
  }

  if (
    safeNumber(
      candidate.checks
    ) < 3
  ) {
    priority +=
      5;
  }

  return priority;
}


/*
 * =========================================================
 * ACTIVITY
 * =========================================================
 */

async function checkPoolActivity(
  env,
  poolId,
  fromBlock,
  toBlock
) {
  const result =
    await getLogs(
      env,
      fromBlock,
      toBlock,
      POOL_MANAGER,
      [
        null,
        poolId
      ]
    );

  if (
    !result.result
  ) {
    return {
      success:
        false,

      provider:
        result.provider,

      error:
        result.error,

      logs:
        0,

      swaps:
        0,

      liquidityEvents:
        0
    };
  }

  let swaps =
    0;

  let liquidityEvents =
    0;

  for (
    const log of
    result.result
  ) {
    const topic0 =
      String(
        log.topics?.[0] ||
        ""
      ).toLowerCase();

    if (
      topic0 ===
      V4_SWAP_TOPIC
    ) {
      swaps++;
    }

    if (
      topic0 ===
      V4_MODIFY_LIQUIDITY_TOPIC
    ) {
      liquidityEvents++;
    }
  }

  return {
    success:
      true,

    provider:
      result.provider,

    error:
      null,

    logs:
      result.result
        .length,

    swaps,

    liquidityEvents
  };
}


/*
 * =========================================================
 * DEXSCREENER
 * =========================================================
 */

async function dexRequest(
  url,
  attempt = 0
) {
  try {
    const response =
      await fetchWithTimeout(
        url,
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
      if (
        attempt <
        DEX_MAX_ATTEMPTS -
        1
      ) {
        await sleep(
          500 *
          Math.pow(
            2,
            attempt
          )
        );

        return dexRequest(
          url,
          attempt + 1
        );
      }

      return {
        ok:
          false,

        rateLimited:
          true,

        attempts:
          attempt + 1,

        error:
          "HTTP 429"
      };
    }

    if (
      !response.ok
    ) {
      return {
        ok:
          false,

        rateLimited:
          false,

        attempts:
          attempt + 1,

        error:
          `HTTP ${response.status}`
      };
    }

    return {
      ok:
        true,

      attempts:
        attempt + 1,

      data:
        await response
          .json()
    };

  } catch (error) {
    return {
      ok:
        false,

      attempts:
        attempt + 1,

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


async function getMarketData(
  token
) {
  const request =
    await dexRequest(
      `${DEXSCREENER_BASE}` +
      `/token-pairs/v1/` +
      `${DEX_CHAIN_ID}/` +
      `${token}`
    );

  if (
    !request.ok
  ) {
    return {
      verified:
        false,

      status:
        request.rateLimited
          ? "DEXSCREENER_RATE_LIMITED"
          : "DEXSCREENER_ERROR",

      attempts:
        request.attempts,

      error:
        request.error
    };
  }

  const pairs =
    Array.isArray(
      request.data
    )
      ? request.data
      : [];

  const robinhoodPairs =
    pairs
      .filter(
        pair =>
          String(
            pair?.chainId ||
            ""
          ).toLowerCase() ===
          DEX_CHAIN_ID
      );

  if (
    robinhoodPairs.length ===
    0
  ) {
    return {
      verified:
        false,

      status:
        "NO_ROBINHOOD_MARKET_FOUND",

      attempts:
        request.attempts
    };
  }

  robinhoodPairs.sort(
    (a, b) =>
      safeNumber(
        b?.liquidity
          ?.usd
      ) -
      safeNumber(
        a?.liquidity
          ?.usd
      )
  );

  const pair =
    robinhoodPairs[0];

  const buys5m =
    safeNumber(
      pair?.txns
        ?.m5
        ?.buys
    );

  const sells5m =
    safeNumber(
      pair?.txns
        ?.m5
        ?.sells
    );

  const buys1h =
    safeNumber(
      pair?.txns
        ?.h1
        ?.buys
    );

  const sells1h =
    safeNumber(
      pair?.txns
        ?.h1
        ?.sells
    );

  const buys24h =
    safeNumber(
      pair?.txns
        ?.h24
        ?.buys
    );

  const sells24h =
    safeNumber(
      pair?.txns
        ?.h24
        ?.sells
    );

  const liquidityUsd =
    safeNumber(
      pair?.liquidity
        ?.usd
    );

  const marketCap =
    safeNumber(
      pair?.marketCap
    );

  const created =
    safeNumber(
      pair
        ?.pairCreatedAt
    );

  return {
    verified:
      true,

    status:
      "VERIFIED",

    attempts:
      request.attempts,

    pairAddress:
      pair
        ?.pairAddress ||
      null,

    dexId:
      pair?.dexId ||
      null,

    url:
      pair?.url ||
      null,

    priceUsd:
      pair?.priceUsd ||
      null,

    liquidityUsd,

    marketCap:
      marketCap > 0
        ? marketCap
        : null,

    fdv:
      safeNumber(
        pair?.fdv
      ) || null,

    ageMinutes:
      created > 0
        ? (
            Date.now() -
            created
          ) /
          60000
        : null,

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

      h6:
        safeNumber(
          pair?.volume
            ?.h6
        ),

      h24:
        safeNumber(
          pair?.volume
            ?.h24
        )
    },

    transactions: {
      m5: {
        buys:
          buys5m,

        sells:
          sells5m
      },

      h1: {
        buys:
          buys1h,

        sells:
          sells1h
      },

      h24: {
        buys:
          buys24h,

        sells:
          sells24h
      }
    },

    buyPressure: {
      m5:
        percentage(
          buys5m,
          buys5m +
          sells5m
        ),

      h1:
        percentage(
          buys1h,
          buys1h +
          sells1h
        ),

      h24:
        percentage(
          buys24h,
          buys24h +
          sells24h
        )
    },

    priceChange: {
      m5:
        safeNumber(
          pair?.priceChange
            ?.m5
        ),

      h1:
        safeNumber(
          pair?.priceChange
            ?.h1
        ),

      h6:
        safeNumber(
          pair?.priceChange
            ?.h6
        ),

      h24:
        safeNumber(
          pair?.priceChange
            ?.h24
        )
    },

    liquidityMarketCapRatio:
      marketCap > 0
        ? liquidityUsd /
          marketCap *
          100
        : null
  };
}


/*
 * =========================================================
 * BLOCKSCOUT
 * =========================================================
 */

function blockscoutUrl(
  env,
  path
) {
  if (
    env.BLOCKSCOUT_API_KEY
  ) {
    const separator =
      path.includes("?")
        ? "&"
        : "?";

    return (
      `${BLOCKSCOUT_PRO}${path}` +
      `${separator}apikey=` +
      encodeURIComponent(
        env.BLOCKSCOUT_API_KEY
      )
    );
  }

  return (
    `${BLOCKSCOUT_PUBLIC}${path}`
  );
}


async function blockscoutGet(
  env,
  path,
  attempt = 0
) {
  try {
    const response =
      await fetchWithTimeout(
        blockscoutUrl(
          env,
          path
        ),
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
      if (
        attempt <
        BLOCKSCOUT_MAX_ATTEMPTS -
        1
      ) {
        await sleep(
          750 *
          Math.pow(
            2,
            attempt
          )
        );

        return blockscoutGet(
          env,
          path,
          attempt + 1
        );
      }

      return {
        ok:
          false,

        attempts:
          attempt + 1,

        error:
          "HTTP 429"
      };
    }

    if (
      !response.ok
    ) {
      return {
        ok:
          false,

        attempts:
          attempt + 1,

        error:
          `HTTP ${response.status}`
      };
    }

    return {
      ok:
        true,

      attempts:
        attempt + 1,

      data:
        await response
          .json()
    };

  } catch (error) {
    return {
      ok:
        false,

      attempts:
        attempt + 1,

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


function holderPercentage(
  rawValue,
  totalSupply
) {
  try {
    const held =
      BigInt(
        String(
          rawValue
        )
      );

    const supply =
      BigInt(
        String(
          totalSupply
        )
      );

    if (
      supply <= 0n
    ) {
      return null;
    }

    const scaled =
      held *
      1_000_000n /
      supply;

    return (
      Number(
        scaled
      ) /
      10_000
    );

  } catch {
    return null;
  }
}


async function getHolderData(
  env,
  token,
  totalSupply
) {
  const counters =
    await blockscoutGet(
      env,
      `/api/v2/tokens/${token}/counters`
    );

  if (
    !counters.ok
  ) {
    return {
      verified:
        false,

      holderCount:
        null,

      transferCount:
        null,

      concentration: {
        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null
      },

      topHolders:
        [],

      errors: {
        counters:
          counters.error,

        holders:
          "SKIPPED"
      }
    };
  }

  const holderCount =
    safeNumber(
      counters.data
        ?.token_holders_count
    );

  const transferCount =
    safeNumber(
      counters.data
        ?.transfers_count
    );

  const holders =
    holderCount > 0
      ? await blockscoutGet(
          env,
          `/api/v2/tokens/${token}/holders`
        )
      : {
          ok:
            false,

          error:
            "NO_HOLDERS"
        };

  const topHolders =
    [];

  if (
    holders.ok &&
    Array.isArray(
      holders.data?.items
    )
  ) {
    for (
      const item of
      holders.data.items
        .slice(
          0,
          10
        )
    ) {
      const value =
        item?.value ||
        "0";

      topHolders.push({
        address:
          item
            ?.address_hash
            ?.hash ||
          item
            ?.address
            ?.hash ||
          null,

        value:
          String(
            value
          ),

        percentage:
          holderPercentage(
            value,
            totalSupply
          )
      });
    }
  }

  const percentages =
    topHolders
      .map(
        item =>
          item.percentage
      )
      .filter(
        value =>
          value !==
          null
      );

  return {
    verified:
      true,

    holderCount,

    transferCount,

    concentration: {
      top1Percent:
        percentages[0] ??
        null,

      top5Percent:
        percentages.length
          ? percentages
              .slice(
                0,
                5
              )
              .reduce(
                (a, b) =>
                  a + b,
                0
              )
          : null,

      top10Percent:
        percentages.length
          ? percentages
              .slice(
                0,
                10
              )
              .reduce(
                (a, b) =>
                  a + b,
                0
              )
          : null
    },

    topHolders,

    errors: {
      counters:
        null,

      holders:
        holders.ok
          ? null
          : holders.error
    }
  };
}


/*
 * =========================================================
 * SCORING
 * =========================================================
 */

function scoreRugRisk(
  token,
  activity,
  market,
  holders
) {
  let risk =
    50;

  const reasons =
    [];

  if (
    token.validERC20
  ) {
    risk -=
      15;

    reasons.push(
      "Verified ERC-20 contract"
    );
  }

  if (
    token.totalSupply &&
    BigInt(
      token.totalSupply
    ) >
    0n
  ) {
    risk -=
      5;
  }

  if (
    activity.swaps >
    0
  ) {
    risk -=
      8;

    reasons.push(
      "Observed V4 swaps"
    );
  }

  if (
    activity
      .liquidityEvents >
    0
  ) {
    risk -=
      4;
  }

  if (
    market?.verified
  ) {
    risk -=
      5;

    if (
      market
        .liquidityUsd >=
      10_000
    ) {
      risk -=
        8;
    }

    if (
      market
        .liquidityUsd <
      1_000
    ) {
      risk +=
        15;

      reasons.push(
        "Very low liquidity"
      );
    }
  }

  if (
    holders?.verified
  ) {
    if (
      holders.holderCount <
      10
    ) {
      risk +=
        15;
    }

    const top1 =
      holders
        ?.concentration
        ?.top1Percent;

    const top10 =
      holders
        ?.concentration
        ?.top10Percent;

    if (
      top1 !== null &&
      top1 > 50
    ) {
      risk +=
        20;
    }

    if (
      top10 !== null &&
      top10 > 80
    ) {
      risk +=
        20;
    }
  }

  return {
    score:
      clamp(
        risk,
        0,
        100
      ),

    label:
      risk >= 80
        ? "HIGH"
        : risk >= 60
        ? "MEDIUM"
        : "LOW",

    reasons
  };
}


function scoreOpportunity(
  token,
  activity,
  market,
  holders
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
    market?.verified
  ) {
    score +=
      10;

    if (
      market
        .liquidityUsd >=
      5_000
    ) {
      score +=
        5;
    }

    if (
      market
        .liquidityUsd >=
      25_000
    ) {
      score +=
        5;
    }

    if (
      market.volume
        ?.h24 >=
      10_000
    ) {
      score +=
        5;
    }

    if (
      market.volume
        ?.h24 >=
      50_000
    ) {
      score +=
        5;
    }

    if (
      market.buyPressure
        ?.h1 !==
        null &&
      market.buyPressure
        ?.h1 >=
        60
    ) {
      score +=
        7;

      reasons.push(
        "Strong 1h buy pressure"
      );
    }

    if (
      market.ageMinutes !==
        null &&
      market.ageMinutes <=
        1440
    ) {
      score +=
        5;

      reasons.push(
        "Pair under 24h old"
      );
    }

    if (
      market.marketCap !==
        null &&
      market.marketCap >=
        25_000 &&
      market.marketCap <=
        5_000_000
    ) {
      score +=
        5;

      reasons.push(
        "Early market-cap range"
      );
    }
  }

  if (
    holders?.verified
  ) {
    if (
      holders.holderCount >=
      50
    ) {
      score +=
        4;
    }

    if (
      holders.holderCount >=
      200
    ) {
      score +=
        4;
    }

    const top10 =
      holders
        ?.concentration
        ?.top10Percent;

    if (
      top10 !== null &&
      top10 <= 60
    ) {
      score +=
        4;
    }

    if (
      top10 !== null &&
      top10 > 85
    ) {
      score -=
        15;
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


/*
 * =========================================================
 * TELEGRAM
 * =========================================================
 */

function alreadyAlerted(
  state,
  address
) {
  const key =
    normalizeAddress(
      address
    );

  const timestamp =
    safeNumber(
      state
        ?.alerts
        ?.[key]
    );

  if (
    timestamp > 0 &&
    Date.now() -
      timestamp <
      ALERT_COOLDOWN_MS
  ) {
    return true;
  }

  const memory =
    MEMORY_ALERTS
      .get(
        key
      );

  return Boolean(
    memory &&
    Date.now() -
      memory <
      ALERT_COOLDOWN_MS
  );
}


function recordAlert(
  state,
  address
) {
  const key =
    normalizeAddress(
      address
    );

  if (
    !state.alerts
  ) {
    state.alerts =
      {};
  }

  state.alerts[
    key
  ] =
    Date.now();

  MEMORY_ALERTS
    .set(
      key,
      Date.now()
    );
}


async function sendTelegram(
  env,
  state,
  candidate
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  if (
    !candidate ||
    !candidate.address ||
    isZeroAddress(
      candidate.address
    )
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    !candidate.validERC20
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_UNVERIFIED_ERC20"
    };
  }

  if (
    !candidate.market
      ?.verified
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_UNVERIFIED_MARKET"
    };
  }

  if (
    candidate.market
      .liquidityUsd <
    MIN_ALERT_LIQUIDITY_USD
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_LOW_LIQUIDITY"
    };
  }

  if (
    candidate.rugRisk
      .score >
    MAX_RUG_RISK_FOR_ALERT
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_HIGH_RUG_RISK"
    };
  }

  if (
    candidate
      .opportunity
      .score <
    MIN_TELEGRAM_SCORE
  ) {
    return {
      sent:
        false,

      reason:
        "OPPORTUNITY_SCORE_BELOW_THRESHOLD"
    };
  }

  if (
    alreadyAlerted(
      state,
      candidate.address
    )
  ) {
    return {
      sent:
        false,

      reason:
        "DUPLICATE_ALERT_COOLDOWN"
    };
  }

  const market =
    candidate.market;

  const holders =
    candidate.holders;

  const message =
`🚨 Robinhood Chain Meme Hunter V70

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🛡 Rug Risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

💰 Market Cap: ${formatMoney(market.marketCap)}
💧 Liquidity: ${formatMoney(market.liquidityUsd)}
📊 24h Volume: ${formatMoney(market.volume?.h24)}
⚡ 1h Volume: ${formatMoney(market.volume?.h1)}

🟢 1h Buys: ${market.transactions?.h1?.buys ?? "UNVERIFIED"}
🔴 1h Sells: ${market.transactions?.h1?.sells ?? "UNVERIFIED"}

👥 Holders: ${holders?.holderCount ?? "UNVERIFIED"}

📡 V4 Swaps: ${candidate.activity.swaps}
💦 Liquidity Events: ${candidate.activity.liquidityEvents}

Why:
${candidate.opportunity.reasons
  .map(x => "• " + x)
  .join("\n")}

Risk:
${candidate.rugRisk.reasons
  .map(x => "• " + x)
  .join("\n")}

${market.url ? `Chart:\n${market.url}` : ""}

⚠️ Automated high-risk early-stage screening.`;

  try {
    const response =
      await fetchWithTimeout(
        "https://api.telegram.org/bot" +
        env.TELEGRAM_BOT_TOKEN +
        "/sendMessage",

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
                message.slice(
                  0,
                  3900
                )
            })
        },

        5000
      );

    const body =
      await response
        .json();

    if (
      !response.ok ||
      !body.ok
    ) {
      return {
        sent:
          false,

        reason:
          "TELEGRAM_API_ERROR",

        error:
          body?.description ||
          `HTTP ${response.status}`
      };
    }

    recordAlert(
      state,
      candidate.address
    );

    return {
      sent:
        true,

      messageId:
        body.result
          ?.message_id ||
        null
    };

  } catch (error) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM_REQUEST_FAILED",

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


/*
 * =========================================================
 * SCAN
 * =========================================================
 */

async function scan(
  env
) {
  const started =
    Date.now();

  const diagnostics =
    [];

  const stateResult =
    await readState(
      env
    );

  const state =
    stateResult.state;

  pruneState(
    state
  );

  /*
   * V70:
   * capture previous block BEFORE changing state.
   */

  const previousLastScannedBlock =
    state.lastScannedBlock;

  const latest =
    await getLatestBlock(
      env
    );

  const latestBlock =
    latest.block;

  const plan =
    buildScanRanges(
      latestBlock,
      previousLastScannedBlock,
      stateResult.persistent
    );

  const allLogs =
    [];

  const rangesCompleted =
    [];

  let processedThrough =
    previousLastScannedBlock !==
      null
      ? BigInt(
          previousLastScannedBlock
        )
      : null;

  for (
    const range of
    plan.ranges
  ) {
    const raw =
      await getLogs(
        env,
        range.fromBlock,
        range.toBlock,
        POOL_MANAGER
      );

    if (
      !raw.result
    ) {
      diagnostics.push({
        source:
          "RPC",

        range: {
          fromBlock:
            Number(
              range.fromBlock
            ),

          toBlock:
            Number(
              range.toBlock
            )
        },

        error:
          raw.error
      });

      break;
    }

    allLogs.push(
      ...raw.result
    );

    processedThrough =
      range.toBlock;

    rangesCompleted
      .push({
        fromBlock:
          Number(
            range.fromBlock
          ),

        toBlock:
          Number(
            range.toBlock
          ),

        logs:
          raw.result
            .length,

        provider:
          raw.provider
      });
  }

  if (
    stateResult
      .persistent &&
    processedThrough !==
      null
  ) {
    state.lastScannedBlock =
      Number(
        processedThrough
      );
  }

  const pools =
    [];

  for (
    const log of
    allLogs
  ) {
    if (
      String(
        log.topics?.[0] ||
        ""
      ).toLowerCase() !==
      V4_INITIALIZE_TOPIC
    ) {
      continue;
    }

    const decoded =
      decodeInitializeLog(
        log
      );

    if (
      decoded
    ) {
      pools.push(
        decoded
      );
    }
  }

  const newCandidateMap =
    new Map();

  for (
    const pool of
    pools
  ) {
    for (
      const token of
      extractTokenCurrencies(
        pool
      )
    ) {
      const key =
        normalizeAddress(
          token
        );

      if (
        !newCandidateMap
          .has(
            key
          )
      ) {
        newCandidateMap
          .set(
            key,
            {
              address:
                token,

              pools:
                []
            }
          );
      }

      newCandidateMap
        .get(
          key
        )
        .pools
        .push(
          pool
        );
    }
  }

  for (
    const candidate of
    newCandidateMap
      .values()
  ) {
    mergeWatchedToken(
      state,
      candidate
    );
  }

  pruneState(
    state
  );

  const candidateList =
    state.watchedTokens
      .map(
        watched => ({
          ...watched,

          knownQuoteToken:
            isKnownQuoteToken(
              watched.address
            ),

          priority:
            candidatePriority(
              watched
            )
        })
      )
      .sort(
        (a, b) =>
          b.priority -
          a.priority
      )
      .slice(
        0,
        MAX_TOKEN_CHECKS
      );

  const validationResults =
    [];

  const verifiedTokens =
    [];

  for (
    const candidate of
    candidateList
  ) {
    let token =
      candidate.metadata;

    if (
      !token?.validERC20
    ) {
      token =
        await verifyERC20(
          env,
          candidate.address
        );
    }

    validationResults
      .push({
        address:
          candidate.address,

        priority:
          candidate.priority,

        knownQuoteToken:
          candidate
            .knownQuoteToken,

        ...token
      });

    const watched =
      state.watchedTokens
        .find(
          item =>
            normalizeAddress(
              item.address
            ) ===
            normalizeAddress(
              candidate.address
            )
        );

    if (
      watched
    ) {
      watched.metadata =
        token;

      watched.lastCheckedAt =
        Date.now();

      watched.checks =
        safeNumber(
          watched.checks
        ) +
        1;
    }

    if (
      !token.validERC20
    ) {
      continue;
    }

    verifiedTokens
      .push({
        candidate,
        token
      });
  }

  const marketPriority =
    verifiedTokens
      .sort(
        (a, b) =>
          b.candidate
            .priority -
          a.candidate
            .priority
      )
      .slice(
        0,
        MAX_MARKET_LOOKUPS
      );

  const analysed =
    [];

  let holderLookupCount =
    0;

  const activityToBlock =
    latestBlock;

  const activityFromBlock =
    latestBlock -
    BigInt(
      DISCOVERY_BLOCKS -
      1
    );

  for (
    const item of
    marketPriority
  ) {
    const candidate =
      item.candidate;

    const token =
      item.token;

    let bestActivity =
      null;

    let bestPool =
      null;

    for (
      const pool of
      (
        candidate.pools ||
        []
      ).slice(
        0,
        3
      )
    ) {
      const activity =
        await checkPoolActivity(
          env,
          pool.poolId,
          activityFromBlock,
          activityToBlock
        );

      if (
        !bestActivity ||
        activity.swaps >
          bestActivity
            .swaps ||
        (
          activity.swaps ===
            bestActivity
              .swaps &&
          activity
            .liquidityEvents >
          bestActivity
            .liquidityEvents
        )
      ) {
        bestActivity =
          activity;

        bestPool =
          pool;
      }
    }

    const activity =
      bestActivity ||
      {
        success:
          false,

        logs:
          0,

        swaps:
          0,

        liquidityEvents:
          0
      };

    const market =
      await getMarketData(
        candidate.address
      );

    if (
      !market.verified
    ) {
      diagnostics.push({
        source:
          "DEXSCREENER",

        token:
          candidate.address,

        status:
          market.status,

        attempts:
          market.attempts,

        error:
          market.error ||
          null
      });
    }

    let holders = {
      verified:
        false,

      holderCount:
        null,

      transferCount:
        null,

      concentration: {
        top1Percent:
          null,

        top5Percent:
          null,

        top10Percent:
          null
      },

      topHolders:
        []
    };

    const shouldCheckHolders =
      !candidate
        .knownQuoteToken &&
      holderLookupCount <
        MAX_HOLDER_LOOKUPS &&
      (
        market.verified ||
        activity.swaps >
          0 ||
        activity
          .liquidityEvents >
          0
      );

    if (
      shouldCheckHolders
    ) {
      holderLookupCount++;

      holders =
        await getHolderData(
          env,
          candidate.address,
          token.totalSupply
        );
    }

    const rugRisk =
      scoreRugRisk(
        token,
        activity,
        market,
        holders
      );

    const opportunity =
      scoreOpportunity(
        token,
        activity,
        market,
        holders
      );

    const analysedCandidate = {
      address:
        candidate.address,

      priority:
        candidate.priority,

      knownQuoteToken:
        candidate
          .knownQuoteToken,

      name:
        token.name,

      symbol:
        token.symbol,

      decimals:
        token.decimals,

      totalSupply:
        token.totalSupply,

      validERC20:
        token.validERC20,

      poolId:
        bestPool?.poolId ||
        candidate.pools
          ?.[0]
          ?.poolId ||
        null,

      poolCount:
        candidate.pools
          ?.length ||
        0,

      activity,

      market,

      holders,

      rugRisk,

      opportunity,

      watch: {
        firstSeenAt:
          candidate
            .firstSeenAt,

        lastCheckedAt:
          candidate
            .lastCheckedAt,

        checks:
          candidate.checks
      }
    };

    analysed.push(
      analysedCandidate
    );

    const watched =
      state.watchedTokens
        .find(
          item =>
            normalizeAddress(
              item.address
            ) ===
            normalizeAddress(
              candidate.address
            )
        );

    if (
      watched
    ) {
      watched.lastMarket =
        market;
    }
  }

  analysed.sort(
    (a, b) =>
      b.opportunity
        .score -
      a.opportunity
        .score
  );

  const qualifying =
    analysed.filter(
      candidate =>
        candidate
          .validERC20 &&
        !candidate
          .knownQuoteToken &&
        candidate.market
          ?.verified ===
          true &&
        candidate.market
          .liquidityUsd >=
          MIN_ALERT_LIQUIDITY_USD &&
        candidate.rugRisk
          .score <=
          MAX_RUG_RISK_FOR_ALERT &&
        candidate
          .opportunity
          .score >=
          MIN_TELEGRAM_SCORE
    );

  const telegramCandidates =
    [];

  for (
    const candidate of
    qualifying.slice(
      0,
      2
    )
  ) {
    const telegram =
      await sendTelegram(
        env,
        state,
        candidate
      );

    candidate.telegram =
      telegram;

    if (
      telegram.sent
    ) {
      telegramCandidates
        .push(
          candidate
        );
    }
  }

  pruneState(
    state
  );

  const stateWrite =
    await writeState(
      env,
      state
    );

  const swapTopicMatches =
    allLogs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_SWAP_TOPIC
    ).length;

  const modifyLiquidityTopicMatches =
    allLogs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_MODIFY_LIQUIDITY_TOPIC
    ).length;

  const remainingBacklog =
    stateResult.persistent &&
    state.lastScannedBlock !==
      null
      ? Math.max(
          0,
          Number(
            latestBlock -
            BigInt(
              state.lastScannedBlock
            )
          )
        )
      : 0;

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

      durationMs:
        Date.now() -
        started,

      latestBlock:
        Number(
          latestBlock
        ),

      persistence: {
        enabled:
          stateResult
            .persistent,

        binding:
          stateResult.binding,

        stateReadError:
          stateResult.error,

        stateSaved:
          stateWrite.saved,

        stateSaveError:
          stateWrite.reason,

        scanMode:
          plan.mode,

        previousLastScannedBlock,

        currentLastScannedBlock:
          state
            .lastScannedBlock,

        backlogAtStart:
          plan.backlogBlocks,

        backlogRemaining:
          remainingBacklog,

        maxCatchupBlocksPerRun:
          MAX_CATCHUP_CHUNKS *
          DISCOVERY_BLOCKS
      },

      rangesCompleted,

      v4: {
        poolManager:
          POOL_MANAGER,

        rawLogs:
          allLogs.length,

        initializeEvents:
          pools.length,

        initializeTopicMatches:
          pools.length,

        swapTopicMatches,

        modifyLiquidityTopicMatches,

        newTokenCandidates:
          newCandidateMap.size
      },

      watchedTokens:
        state.watchedTokens
          .length,

      tokenValidationChecks:
        candidateList.length,

      validERC20Tokens:
        validationResults
          .filter(
            item =>
              item.validERC20
          )
          .length,

      validationResults,

      marketLookups:
        marketPriority.length,

      holderLookups:
        holderLookupCount,

      candidates:
        analysed,

      qualifyingCandidates:
        qualifying.length,

      telegramCandidates:
        telegramCandidates
          .length,

      telegram:
        telegramCandidates
          .length
          ? {
              sent:
                true,

              count:
                telegramCandidates
                  .length
            }
          : {
              sent:
                false,

              reason:
                "NO_NEW_QUALIFYING_ALERT"
            },

      diagnostics,

      intelligence: {
        persistentBlockTracking:
          stateResult
            .persistent
            ? "ENABLED"
            : "DISABLED_NO_KV",

        kvBinding:
          stateResult.binding ||
          "NONE",

        catchUpScanning:
          "10_BLOCK_CHUNKS",

        persistentCandidateWatch:
          stateResult
            .persistent
            ? "ENABLED"
            : "MEMORYLESS_FALLBACK",

        persistentAlertCooldown:
          stateResult
            .persistent
            ? "ENABLED"
            : "MEMORY_ONLY",

        market:
          "DEXSCREENER",

        holders:
          "BLOCKSCOUT",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V70_DUAL_KV_BINDING_PERSISTENT_GAP_FREE_HUNTER"
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


/*
 * =========================================================
 * HEALTH
 * =========================================================
 */

async function health(
  env
) {
  let latestBlock =
    null;

  let provider =
    null;

  let error =
    null;

  try {
    const latest =
      await getLatestBlock(
        env
      );

    latestBlock =
      Number(
        latest.block
      );

    provider =
      latest.provider;

  } catch (e) {
    error =
      String(
        e?.message ||
        e
      );
  }

  const stateResult =
    await readState(
      env
    );

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
      "/diagnostics",
      "/state",
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

    latestBlock,

    rpcProvider:
      provider,

    alchemyConfigured:
      Boolean(
        env.ALCHEMY_API_KEY
      ),

    persistence: {
      kvConfigured:
        stateResult
          .persistent,

      bindingDetected:
        stateResult.binding,

      kvBindingSupported: [
        "KV_BINDING",
        "MEME_HUNTER_STATE"
      ],

      mode:
        stateResult
          .persistent
          ? "PERSISTENT"
          : "LATEST_10_BLOCK_FALLBACK",

      lastScannedBlock:
        stateResult.state
          .lastScannedBlock,

      watchedTokens:
        stateResult.state
          .watchedTokens
          .length,

      stateError:
        stateResult.error
    },

    discovery: {
      chunkSize:
        DISCOVERY_BLOCKS,

      maximumChunksPerRun:
        MAX_CATCHUP_CHUNKS,

      maximumCatchupBlocksPerRun:
        DISCOVERY_BLOCKS *
        MAX_CATCHUP_CHUNKS
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
        MIN_TELEGRAM_SCORE,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY_USD
    },

    architecture:
      "V70_DUAL_KV_BINDING_PERSISTENT_GAP_FREE_HUNTER",

    timestamp:
      now()
  };
}


/*
 * =========================================================
 * STATE
 * =========================================================
 */

async function stateStatus(
  env
) {
  const result =
    await readState(
      env
    );

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

    error:
      result.error,

    lastScannedBlock:
      result.state
        .lastScannedBlock,

    watchedTokens:
      result.state
        .watchedTokens
        .map(
          item => ({
            address:
              item.address,

            firstSeenAt:
              item.firstSeenAt,

            lastCheckedAt:
              item
                .lastCheckedAt,

            checks:
              item.checks,

            poolCount:
              item.pools
                ?.length ||
              0,

            name:
              item.metadata
                ?.name ||
              null,

            symbol:
              item.metadata
                ?.symbol ||
              null,

            marketStatus:
              item.lastMarket
                ?.status ||
              null
          })
        ),

    recentAlertCount:
      Object.keys(
        result.state
          .alerts ||
        {}
      ).length,

    timestamp:
      now()
  };
}


/*
 * =========================================================
 * RPC TEST
 * =========================================================
 */

async function rpcTest(
  env
) {
  const latest =
    await getLatestBlock(
      env
    );

  const toBlock =
    latest.block;

  const fromBlock =
    toBlock - 2n;

  const pool =
    await getLogs(
      env,
      fromBlock,
      toBlock,
      POOL_MANAGER
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      Boolean(
        pool.result
      ),

    latestBlock:
      Number(
        toBlock
      ),

    poolManagerLogs:
      pool.result
        ?.length ||
      0,

    provider:
      pool.provider,

    error:
      pool.error,

    timestamp:
      now()
  };
}


/*
 * =========================================================
 * TELEGRAM TEST
 * =========================================================
 */

async function telegramTest(
  env
) {
  const stateResult =
    await readState(
      env
    );

  const result =
    await sendTelegram(
      env,
      stateResult.state,
      {
        address:
          ZERO,

        validERC20:
          false,

        market: {
          verified:
            false,

          liquidityUsd:
            0
        },

        rugRisk: {
          score:
            100,

          label:
            "HIGH"
        },

        opportunity: {
          score:
            0
        }
      }
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    safetyTest:
      result.reason ===
      "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
        ? "ZERO_ADDRESS_BLOCKED"
        : "CHECK_RESPONSE",

    response:
      result,

    timestamp:
      now()
  };
}


/*
 * =========================================================
 * DIAGNOSTICS
 * =========================================================
 */

async function diagnostics(
  env
) {
  const started =
    Date.now();

  const healthResult =
    await health(
      env
    );

  const rpcResult =
    await rpcTest(
      env
    );

  const scanResult =
    await scan(
      env
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    diagnostics:
      true,

    overallStatus:
      (
        healthResult.status ===
          "ONLINE" &&
        rpcResult.success &&
        scanResult.success
      )
        ? "PASS"
        : "CHECK_REQUIRED",

    durationMs:
      Date.now() -
      started,

    health:
      healthResult,

    rpc:
      rpcResult,

    scan:
      scanResult,

    timestamp:
      now()
  };
}


/*
 * =========================================================
 * WORKER
 * =========================================================
 */

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
        ) ||
      "/";

    try {

      if (
        path === "/" ||
        path === "/health"
      ) {
        return json(
          await health(
            env
          )
        );
      }

      if (
        path ===
        "/rpc-test"
      ) {
        return json(
          await rpcTest(
            env
          )
        );
      }

      if (
        path ===
        "/scan"
      ) {
        return json(
          await scan(
            env
          )
        );
      }

      if (
        path ===
        "/diagnostics"
      ) {
        return json(
          await diagnostics(
            env
          )
        );
      }

      if (
        path ===
        "/state"
      ) {
        return json(
          await stateStatus(
            env
          )
        );
      }

      if (
        path ===
        "/test-telegram"
      ) {
        return json(
          await telegramTest(
            env
          )
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
            "/diagnostics",
            "/state",
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

          success:
            false,

          error:
            String(
              error?.message ||
              error
            ),

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
      scan(
        env
      )
        .then(
          result => {
            console.log(
              JSON.stringify({
                event:
                  "V70_SCHEDULED_SCAN",

                success:
                  result.success,

                kvBinding:
                  result.scan
                    ?.persistence
                    ?.binding ||
                  null,

                lastScannedBlock:
                  result.scan
                    ?.persistence
                    ?.currentLastScannedBlock ||
                  null,

                backlogRemaining:
                  result.scan
                    ?.persistence
                    ?.backlogRemaining ||
                  0,

                newPools:
                  result.scan
                    ?.v4
                    ?.initializeEvents ||
                  0,

                watchedTokens:
                  result.scan
                    ?.watchedTokens ||
                  0,

                qualifying:
                  result.scan
                    ?.qualifyingCandidates ||
                  0,

                telegram:
                  result.scan
                    ?.telegram ||
                  null,

                timestamp:
                  now()
              })
            );
          }
        )
        .catch(
          error => {
            console.error(
              "V70 scheduled scan failed",
              error
            );

            throw error;
          }
        )
    );
  }
};
