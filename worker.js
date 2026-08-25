/**
 * Robinhood Chain Meme Hunter
 * V72
 *
 * Incremental upgrade from V71.
 *
 * Keeps V71:
 * - Robinhood RPC + Alchemy fallback
 * - Uniswap V4 discovery
 * - Persistent KV block tracking
 * - Catch-up scanning
 * - Persistent token watch list
 * - ERC20 verification
 * - DexScreener intelligence
 * - Blockscout holders
 * - Whale concentration
 * - Smart-money candidate scoring
 * - Telegram alerts
 * - Duplicate/cooldown protection
 *
 * V72 adds/fixes:
 * - /diagnostics restored
 * - Single /run-all route to test everything
 * - Better KV diagnostics
 * - Pool-specific V4 activity instead of assigning all activity to every token
 * - Candidate prioritisation
 * - Watch-list rotation so the same first tokens aren't checked forever
 * - Quote-token deprioritisation
 * - Persistent scan-mode reporting
 * - Failed-range protection: lastScannedBlock only advances through completed ranges
 * - Better Blockscout parsing
 * - Better bytes32 ERC20 name/symbol decoding
 * - Telegram messages report V72
 */

const VERSION = "V72";

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
  "0x5fc5360d0400a0fd4f2af552add042d716f1d168"
]);

const INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/*
 * IMPORTANT:
 * Keep the old state key so V72 continues using
 * V69/V70/V71 persistent state instead of starting over.
 */
const STATE_KEY =
  "robinhood-meme-hunter-v69-state";

const DISCOVERY_BLOCKS = 10;
const MAX_CATCHUP_BLOCKS = 120;

const MAX_TOKEN_CHECKS = 6;
const MAX_MARKET_LOOKUPS = 4;
const MAX_HOLDER_LOOKUPS = 3;

const WATCH_MAX_AGE =
  12 * 60 * 60 * 1000;

const MAX_WATCHED_TOKENS = 50;

const ALERT_COOLDOWN =
  6 * 60 * 60 * 1000;

const MIN_ALERT_SCORE = 60;
const MAX_ALERT_RISK = 59;
const MIN_ALERT_LIQUIDITY = 1000;

const MEMORY_ALERTS = new Map();


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
      delete state.alerts[
        address
      ];
    }
  }
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
        item.poolId ===
        pool.poolId
    )
  ) {
    token.pools.push(pool);
  }
}


/* =========================================================
   RPC
   ========================================================= */

async function rpcCall(
  url,
  method,
  params
) {
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
  params
) {
  let publicError = null;

  try {
    return {
      result:
        await rpcCall(
          PUBLIC_RPC,
          method,
          params
        ),

      provider:
        "ROBINHOOD_PUBLIC_RPC",

      error: null
    };

  } catch (error) {
    publicError =
      errorString(error);
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
          params
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
  env
) {
  const result =
    await rpc(
      env,
      "eth_blockNumber",
      []
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
  to
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
    }]
  );
}


/* =========================================================
   ERC20
   ========================================================= */

async function ethCall(
  env,
  token,
  data
) {
  const result =
    await rpc(
      env,
      "eth_call",
      [{
        to: token,
        data
      }, "latest"]
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

    if (
      raw.length !== 64
    ) {
      return null;
    }

    const bytes =
      new Uint8Array(
        raw.match(/.{2}/g)
          .map(
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
        .slice(2);

    if (!raw) {
      return null;
    }

    /*
     * bytes32 fallback.
     */
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
  address
) {
  const code =
    await rpc(
      env,
      "eth_getCode",
      [address, "latest"]
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
          "0x06fdde03"
        )
      );
  } catch {}

  try {
    symbol =
      decodeString(
        await ethCall(
          env,
          address,
          "0x95d89b41"
        )
      );
  } catch {}

  try {
    const value =
      decodeUint(
        await ethCall(
          env,
          address,
          "0x313ce567"
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
          "0x18160ddd"
        )
      );
  } catch {}

  const score =
    (name ? 1 : 0) +
    (symbol ? 1 : 0) +
    (
      Number.isFinite(
        decimals
      )
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
  token
) {
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
   BLOCKSCOUT + WHALES
   ========================================================= */

async function blockscout(
  path
) {
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
  totalSupply
) {
  const [
    counters,
    holders
  ] = await Promise.all([
    blockscout(
      `/api/v2/tokens/${token}/counters`
    ),

    blockscout(
      `/api/v2/tokens/${token}/holders`
    )
  ]);

  if (!counters) {
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

  if (
    whales.length >= 2
  ) {
    smartMoneyScore += 20;
  }

  if (
    whales.length >= 4
  ) {
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

  const smartMoneyCandidate =
    smartMoneyScore >= 55;

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
      verified: true,

      whaleCount:
        whales.length,

      top1Percent:
        top1,

      top5Percent:
        top5,

      top10Percent:
        top10,

      concentrationRisk,

      /*
       * V72 still refuses to fabricate
       * wallet flow or verified smart money.
       */
      flow:
        "NOT_VERIFIED",

      accumulation:
        "NOT_VERIFIED",

      distribution:
        "NOT_VERIFIED",

      smartMoneyScore,

      smartMoneyCandidate,

      smartMoneyVerified:
        false
    }
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

  if (
    activity.swaps > 0
  ) {
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
  activity
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
      whale
        ?.concentrationRisk ===
      "LOW"
    ) {
      score += 5;

      reasons.push(
        "Healthy whale concentration"
      );
    }

    if (
      whale
        ?.smartMoneyCandidate
    ) {
      score += 5;

      reasons.push(
        "Smart-money candidate pattern"
      );
    }

    if (
      whale
        ?.concentrationRisk ===
      "HIGH"
    ) {
      score -= 15;

      reasons.push(
        "Whale concentration penalty"
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

  /*
   * Prefer tokens checked least recently.
   */
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

  /*
   * Newer discoveries get a small boost.
   */
  const age =
    Date.now() -
    safeNumber(
      watched.firstSeenAt
    );

  if (
    age >= 0 &&
    age < 60 * 60 * 1000
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
  candidate
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

  const message =
`🚨 Robinhood Chain Meme Hunter V72

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🛡 Rug Risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

💰 Market Cap: ${money(candidate.market.marketCap)}
💧 Liquidity: ${money(candidate.market.liquidityUsd)}
📊 24h Volume: ${money(candidate.market.volume?.h24)}

🟢 1h Buys: ${candidate.market.transactions?.h1?.buys ?? "UNVERIFIED"}
🔴 1h Sells: ${candidate.market.transactions?.h1?.sells ?? "UNVERIFIED"}

👥 Holders: ${candidate.holders?.holderCount ?? "UNVERIFIED"}

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
  const started =
    Date.now();

  const stateResult =
    await readState(env);

  const state =
    stateResult.state;

  pruneState(state);

  const previous =
    state.lastScannedBlock;

  const latest =
    await latestBlock(env);

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
        DISCOVERY_BLOCKS -
        1
      );
  }

  if (from < 0n) {
    from = 0n;
  }

  let to =
    from +
    BigInt(
      MAX_CATCHUP_BLOCKS -
      1
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

  const rangesCompleted = [];
  const allLogs = [];
  const diagnostics = [];

  let processedThrough =
    previous;

  let rangeFailure =
    null;

  if (!upToDate) {
    let cursor =
      from;

    while (
      cursor <= to
    ) {
      let end =
        cursor +
        BigInt(
          DISCOVERY_BLOCKS -
          1
        );

      if (end > to) {
        end = to;
      }

      const result =
        await getLogs(
          env,
          cursor,
          end
        );

      if (
        !Array.isArray(
          result.result
        )
      ) {
        rangeFailure = {
          fromBlock:
            Number(cursor),

          toBlock:
            Number(end),

          error:
            result.error ||
            "GET_LOGS_FAILED"
        };

        diagnostics.push({
          type:
            "RANGE_SCAN_FAILED",

          ...rangeFailure
        });

        /*
         * Critical:
         * Stop here and do NOT jump over
         * the failed block range.
         */
        break;
      }

      allLogs.push(
        ...result.result
      );

      processedThrough =
        Number(end);

      rangesCompleted.push({
        fromBlock:
          Number(cursor),

        toBlock:
          Number(end),

        logs:
          result.result.length,

        provider:
          result.provider
      });

      cursor =
        end + 1n;
    }
  }

  /*
   * Only persistent mode advances the cursor.
   * It advances ONLY through successfully
   * completed contiguous ranges.
   */
  if (
    stateResult.persistent &&
    processedThrough !== null &&
    processedThrough !== undefined
  ) {
    state.lastScannedBlock =
      processedThrough;
  }

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

  for (
    const pool
    of pools
  ) {
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

  /*
   * V72 rotation:
   * do not repeatedly check the same
   * first six tokens forever.
   */
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
    const token =
      await verifyERC20(
        env,
        watched.address
      );

    watched.lastCheckedAt =
      Date.now();

    watched.checks =
      safeNumber(
        watched.checks
      ) + 1;

    watched.metadata =
      token;

    validationResults.push({
      address:
        watched.address,

      priority:
        watchPriority(
          watched
        ),

      knownQuoteToken:
        knownQuote(
          watched.address
        ),

      ...token
    });

    if (
      token.validERC20
    ) {
      verified.push({
        watched,
        token
      });
    }
  }

  /*
   * Prioritise non-quote verified
   * tokens for expensive market lookups.
   */
  verified.sort(
    (a, b) => {
      const aq =
        knownQuote(
          a.watched.address
        )
          ? 1
          : 0;

      const bq =
        knownQuote(
          b.watched.address
        )
          ? 1
          : 0;

      if (aq !== bq) {
        return aq - bq;
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
    of verified.slice(
      0,
      MAX_MARKET_LOOKUPS
    )
  ) {
    const {
      watched,
      token
    } = item;

    marketLookups++;

    const market =
      await marketData(
        watched.address
      );

    let holders = {
      verified: false,

      holderCount:
        null,

      transferCount:
        null,

      topHolders: [],

      whale: {
        verified: false,

        concentrationRisk:
          "UNVERIFIED",

        flow:
          "NOT_VERIFIED",

        smartMoneyCandidate:
          false,

        smartMoneyVerified:
          false
      }
    };

    if (
      !knownQuote(
        watched.address
      ) &&
      holderLookups <
        MAX_HOLDER_LOOKUPS
    ) {
      holderLookups++;

      holders =
        await holderIntelligence(
          watched.address,
          token.totalSupply
        );
    }

    /*
     * V72 FIX:
     * activity belongs to this token's
     * discovered V4 pools, not every log
     * in the scan window.
     */
    const activity =
      activityForToken(
        watched,
        allLogs
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
        activity
      );

    analysed.push({
      address:
        watched.address,

      knownQuoteToken:
        knownQuote(
          watched.address
        ),

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

      rugRisk,

      opportunity
    });
  }

  analysed.sort(
    (a, b) =>
      b.opportunity.score -
      a.opportunity.score
  );

  const qualifying =
    analysed.filter(
      candidate =>
        !candidate
          .knownQuoteToken &&

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
    const result =
      await telegram(
        env,
        state,
        candidate
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
    stateResult.persistent
      ? previous === null ||
        previous === undefined
        ? "PERSISTENT_INITIAL"
        : backlogRemaining > 0
          ? "PERSISTENT_CATCHUP"
          : "PERSISTENT_LIVE"
      : "NON_PERSISTENT_RECENT_WINDOW";

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      rangeFailure === null,

    scan: {
      status:
        rangeFailure
          ? "PARTIAL"
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

        backlogRemaining,

        maxCatchupBlocksPerRun:
          MAX_CATCHUP_BLOCKS
      },

      rangesCompleted,

      failedRange:
        rangeFailure,

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
        candidatesToCheck
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
        telegramResults
          .filter(
            result =>
              result.sent
          )
          .length,

      telegramResults,

      diagnostics,

      intelligence: {
        persistentBlockTracking:
          stateResult.persistent
            ? "ENABLED"
            : "DISABLED",

        kvBinding:
          stateResult.binding ||
          "NONE",

        catchUpScanning:
          "10_BLOCK_CHUNKS",

        persistentCandidateWatch:
          stateResult.persistent
            ? "ENABLED"
            : "MEMORY_ONLY",

        persistentAlertCooldown:
          stateResult.persistent
            ? "ENABLED"
            : "MEMORY_ONLY",

        candidateRotation:
          "ENABLED_V72",

        poolSpecificActivity:
          "ENABLED_V72",

        market:
          "DEXSCREENER",

        holders:
          "BLOCKSCOUT",

        whaleConcentration:
          "ENABLED_V72",

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
        "V72_PERSISTENT_POOL_SPECIFIC_INTELLIGENCE_HUNTER"
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
  let latest = null;
  let provider = null;
  let error = null;

  try {
    const result =
      await latestBlock(env);

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

      supportedBindings: [
        "MEME_HUNTER_STATE",
        "KV_BINDING"
      ],

      stateKey:
        STATE_KEY,

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
      "V72_PERSISTENT_POOL_SPECIFIC_INTELLIGENCE_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   STATE
   ========================================================= */

async function stateStatus(
  env
) {
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

    timestamp:
      now()
  };
}


/* =========================================================
   RPC TEST
   ========================================================= */

async function rpcTest(env) {
  const latest =
    await latestBlock(env);

  const from =
    latest.block > 2n
      ? latest.block - 2n
      : 0n;

  const logs =
    await getLogs(
      env,
      from,
      latest.block
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

    timestamp:
      now()
  };
}


/* =========================================================
   DIAGNOSTICS
   ========================================================= */

async function diagnostics(env) {
  const checks = {};

  /*
   * KV
   */
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

    supportedBindings: [
      "MEME_HUNTER_STATE",
      "KV_BINDING"
    ],

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
        ?.length ||
      0
  };

  /*
   * RPC
   */
  try {
    const latest =
      await latestBlock(env);

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

  /*
   * Pool Manager log test
   */
  if (
    checks.rpc.success
  ) {
    try {
      const latest =
        BigInt(
          checks.rpc
            .latestBlock
        );

      const from =
        latest > 2n
          ? latest - 2n
          : 0n;

      const logs =
        await getLogs(
          env,
          from,
          latest
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
  } else {
    checks.poolManager = {
      success: false,
      skipped:
        "RPC_UNAVAILABLE"
    };
  }

  /*
   * External configuration.
   */
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

  const criticalOK =
    checks.rpc.success &&
    checks.poolManager.success;

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
        !checks.poolManager.success
          ? [
              "FIX_POOL_MANAGER_LOG_ACCESS"
            ]
          : []
      ),

      ...(
        !checks.telegram.configured
          ? [
              "CONFIGURE_TELEGRAM_SECRETS"
            ]
          : []
      )
    ],

    architecture:
      "V72_PERSISTENT_POOL_SPECIFIC_INTELLIGENCE_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   TELEGRAM SAFETY TEST
   ========================================================= */

async function telegramTest(
  env
) {
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

  const results = {
    health: null,
    diagnostics: null,
    rpcTest: null,
    scan: null,
    state: null,
    telegramTest: null
  };

  const errors = [];

  try {
    results.health =
      await health(env);
  } catch (error) {
    errors.push({
      test: "health",
      error:
        errorString(error)
    });
  }

  try {
    results.diagnostics =
      await diagnostics(env);
  } catch (error) {
    errors.push({
      test: "diagnostics",
      error:
        errorString(error)
    });
  }

  try {
    results.rpcTest =
      await rpcTest(env);
  } catch (error) {
    errors.push({
      test: "rpc-test",
      error:
        errorString(error)
    });
  }

  /*
   * Scan is intentionally executed before
   * final state so /run-all shows the state
   * after the scan.
   */
  try {
    results.scan =
      await scan(env);
  } catch (error) {
    errors.push({
      test: "scan",
      error:
        errorString(error)
    });
  }

  try {
    results.state =
      await stateStatus(env);
  } catch (error) {
    errors.push({
      test: "state",
      error:
        errorString(error)
    });
  }

  try {
    results.telegramTest =
      await telegramTest(env);
  } catch (error) {
    errors.push({
      test:
        "test-telegram",
      error:
        errorString(error)
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
      errors.length === 0
        ? "ALL_TESTS_COMPLETED"
        : "COMPLETED_WITH_ERRORS",

    durationMs:
      Date.now() -
      started,

    errors,

    results,

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
        ) ||
      "/";

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
                "V72_SCHEDULED_SCAN",

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
            "V72 scheduled scan failed",
            error
          );

          throw error;
        })
    );
  }
};
