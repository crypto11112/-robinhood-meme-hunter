/**
 * Robinhood Chain Meme Hunter
 * V67
 *
 * Full replacement for V66.
 *
 * Keeps from V66:
 * - Robinhood public RPC + Alchemy fallback
 * - 429 backoff
 * - Exact Uniswap V4 event matching
 * - V4 Initialize / Swap / ModifyLiquidity
 * - Multi-pool activity analysis
 * - ERC20 bytecode + metadata verification
 * - Rug-risk scoring
 * - Opportunity scoring
 * - Telegram safety controls
 * - No fabricated metrics
 *
 * V67 adds:
 * - Correct Robinhood Alchemy endpoint
 * - DexScreener Robinhood market lookup
 * - Liquidity USD
 * - Market cap / FDV when supplied
 * - 5m / 1h / 6h / 24h volume
 * - Buy/sell counts
 * - Buy-pressure calculation
 * - Pair age
 * - Liquidity / market-cap ratio
 * - Blockscout holder count
 * - Transfer count
 * - Top-holder concentration
 * - Market + holder aware rug scoring
 * - Market + holder aware opportunity scoring
 * - Automatic Cloudflare scheduled scans
 */

const VERSION = "V67";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const BLOCKSCOUT_PUBLIC =
  "https://robinhoodchain.blockscout.com";

const BLOCKSCOUT_PRO =
  "https://api.blockscout.com/4663";

const DEXSCREENER_BASE =
  "https://api.dexscreener.com";

const DEX_CHAIN_ID = "robinhood";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const DISCOVERY_BLOCKS = 10;

const RPC_TIMEOUT_MS = 2500;
const HTTP_TIMEOUT_MS = 3000;

const MAX_TOKEN_CHECKS = 5;
const MIN_TELEGRAM_SCORE = 60;
const MAX_RUG_RISK_FOR_ALERT = 59;

const MIN_ALERT_LIQUIDITY_USD = 1000;

/*
 * Memory-only Telegram duplicate protection.
 *
 * Cloudflare may restart an isolate, therefore this is
 * deliberately reported as MEMORY_ONLY and not durable.
 */

const SENT_TOKENS = new Map();

const ALERT_COOLDOWN_MS =
  6 * 60 * 60 * 1000;

/*
 * ---------------------------------------------------------
 * V4 EVENT TOPICS
 * ---------------------------------------------------------
 */

const V4_INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const V4_SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const V4_MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/*
 * ERC20 selectors
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
 * ---------------------------------------------------------
 * Utility
 * ---------------------------------------------------------
 */

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

function now() {
  return new Date().toISOString();
}

function isAddress(value) {
  return (
    typeof value === "string" &&
    /^0x[a-fA-F0-9]{40}$/.test(value)
  );
}

function normalizeAddress(value) {
  return String(value || "").toLowerCase();
}

function isZeroAddress(value) {
  return (
    !value ||
    normalizeAddress(value) === ZERO
  );
}

function topicToAddress(topic) {
  if (
    typeof topic !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(topic)
  ) {
    return null;
  }

  return (
    "0x" +
    topic.slice(-40)
  );
}

function sleep(ms) {
  return new Promise(
    resolve =>
      setTimeout(resolve, ms)
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function safeNumber(value) {
  const n =
    Number(value);

  return Number.isFinite(n)
    ? n
    : 0;
}

function formatMoney(value) {
  const n =
    safeNumber(value);

  if (n <= 0) {
    return "UNVERIFIED";
  }

  if (n >= 1_000_000_000) {
    return (
      "$" +
      (n / 1_000_000_000)
        .toFixed(2) +
      "B"
    );
  }

  if (n >= 1_000_000) {
    return (
      "$" +
      (n / 1_000_000)
        .toFixed(2) +
      "M"
    );
  }

  if (n >= 1_000) {
    return (
      "$" +
      (n / 1_000)
        .toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    n.toFixed(2)
  );
}

function hexToNumber(hex) {
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

function hexWord(data, index) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
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
    end > raw.length
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

    const max =
      1n <<
      BigInt(
        bits - 1
      );

    const mod =
      1n <<
      BigInt(bits);

    /*
     * ABI words are 256-bit.
     * Mask to requested width first.
     */

    value =
      value &
      (
        (1n << BigInt(bits)) -
        1n
      );

    if (
      value >= max
    ) {
      value -= mod;
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
    safeNumber(numerator);

  const b =
    safeNumber(denominator);

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

function pruneSentTokens() {
  const current =
    Date.now();

  for (
    const [
      token,
      timestamp
    ] of SENT_TOKENS
  ) {
    if (
      current -
      timestamp >
      ALERT_COOLDOWN_MS
    ) {
      SENT_TOKENS.delete(
        token
      );
    }
  }
}

/*
 * ---------------------------------------------------------
 * HTTP with timeout
 * ---------------------------------------------------------
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
    clearTimeout(timer);
  }
}

/*
 * ---------------------------------------------------------
 * RPC
 * ---------------------------------------------------------
 */

function alchemyRpc(env) {
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
      response.status === 429
    ) {
      if (
        attempt < 2
      ) {
        await sleep(
          250 *
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
      const text =
        await response.text();

      throw new Error(
        `HTTP ${response.status}` +
        (
          text
            ? `: ${text.slice(
                0,
                180
              )}`
            : ""
        )
      );
    }

    const body =
      await response.json();

    if (
      body.error
    ) {
      throw new Error(
        body.error.message ||
        `RPC error ${body.error.code}`
      );
    }

    return body.result;

  } finally {
    clearTimeout(timer);
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
    alchemyRpc(env);

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
 * ---------------------------------------------------------
 * Block
 * ---------------------------------------------------------
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

/*
 * ---------------------------------------------------------
 * Logs
 * ---------------------------------------------------------
 */

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
      fromBlock.toString(
        16
      ),

    toBlock:
      "0x" +
      toBlock.toString(
        16
      )
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
    [filter]
  );
}

/*
 * ---------------------------------------------------------
 * ERC20
 * ---------------------------------------------------------
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
    typeof hex !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(
      hex
    ) ||
    hex.length < 66
  ) {
    return null;
  }

  try {
    return BigInt(hex);
  } catch {
    return null;
  }
}

function hexToUtf8(hex) {
  try {
    const bytes =
      new Uint8Array(
        hex
          .match(
            /.{1,2}/g
          )
          ?.map(
            b =>
              parseInt(
                b,
                16
              )
          ) || []
      );

    return new TextDecoder()
      .decode(bytes)
      .replace(
        /\0/g,
        ""
      )
      .trim();

  } catch {
    return null;
  }
}

function decodeString(hex) {
  if (
    typeof hex !== "string" ||
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
      raw.length >= 128
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
          lengthPos + 64;

        const end =
          start +
          length * 2;

        if (
          end <= raw.length
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
      raw.length >= 64
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
    !isAddress(address) ||
    isZeroAddress(address)
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
    codeResult.code === "0x"
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
      result !== null
        ? Number(result)
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
    (checks.name ? 1 : 0) +
    (checks.symbol ? 1 : 0) +
    (
      checks.decimals !== null
        ? 1
        : 0
    ) +
    (
      checks.totalSupply !== null
        ? 1
        : 0
    );

  if (
    methodScore < 3
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
    checks.decimals === null ||
    checks.decimals < 0 ||
    checks.decimals > 255
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
    checks.totalSupply === null ||
    checks.totalSupply <= 0n
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
      checks.totalSupply.toString()
  };
}

/*
 * ---------------------------------------------------------
 * V4 Initialize decoder
 * ---------------------------------------------------------
 */

function decodeInitializeLog(
  log
) {
  if (
    !log ||
    !Array.isArray(
      log.topics
    ) ||
    log.topics.length !== 4
  ) {
    return null;
  }

  const topic0 =
    String(
      log.topics[0] ||
      ""
    ).toLowerCase();

  if (
    topic0 !==
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
    tickSpacing === null ||
    !hooks ||
    sqrtPriceX96 === null ||
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
      tickSpacing.toString(),

    hooks,

    sqrtPriceX96:
      sqrtPriceX96.toString(),

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
  const result = [];

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

    const normalized =
      normalizeAddress(
        currency
      );

    if (
      !result.some(
        x =>
          normalizeAddress(
            x
          ) ===
          normalized
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
 * ---------------------------------------------------------
 * V4 pool activity
 * ---------------------------------------------------------
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

  let swaps = 0;

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
      result.result.length,

    swaps,

    liquidityEvents
  };
}

/*
 * ---------------------------------------------------------
 * DEXSCREENER MARKET INTELLIGENCE
 * ---------------------------------------------------------
 */

async function getMarketData(
  token
) {
  try {
    const url =
      `${DEXSCREENER_BASE}/token-pairs/v1/` +
      `${DEX_CHAIN_ID}/${token}`;

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
      response.status === 429
    ) {
      return {
        verified:
          false,

        status:
          "DEXSCREENER_RATE_LIMITED",

        error:
          "HTTP 429"
      };
    }

    if (
      !response.ok
    ) {
      return {
        verified:
          false,

        status:
          "DEXSCREENER_ERROR",

        error:
          `HTTP ${response.status}`
      };
    }

    const body =
      await response.json();

    const pairs =
      Array.isArray(body)
        ? body
        : [];

    if (
      pairs.length === 0
    ) {
      return {
        verified:
          false,

        status:
          "NO_MARKET_FOUND"
      };
    }

    const robinhoodPairs =
      pairs.filter(
        pair =>
          String(
            pair?.chainId ||
            ""
          ).toLowerCase() ===
          DEX_CHAIN_ID
      );

    if (
      robinhoodPairs.length === 0
    ) {
      return {
        verified:
          false,

        status:
          "NO_ROBINHOOD_MARKET_FOUND"
      };
    }

    /*
     * Choose highest-liquidity Robinhood pair.
     */

    robinhoodPairs.sort(
      (a, b) =>
        safeNumber(
          b?.liquidity?.usd
        ) -
        safeNumber(
          a?.liquidity?.usd
        )
    );

    const pair =
      robinhoodPairs[0];

    const buys5m =
      safeNumber(
        pair?.txns?.m5?.buys
      );

    const sells5m =
      safeNumber(
        pair?.txns?.m5?.sells
      );

    const buys1h =
      safeNumber(
        pair?.txns?.h1?.buys
      );

    const sells1h =
      safeNumber(
        pair?.txns?.h1?.sells
      );

    const buys6h =
      safeNumber(
        pair?.txns?.h6?.buys
      );

    const sells6h =
      safeNumber(
        pair?.txns?.h6?.sells
      );

    const buys24h =
      safeNumber(
        pair?.txns?.h24?.buys
      );

    const sells24h =
      safeNumber(
        pair?.txns?.h24?.sells
      );

    const liquidityUsd =
      safeNumber(
        pair?.liquidity?.usd
      );

    const marketCap =
      safeNumber(
        pair?.marketCap
      );

    const fdv =
      safeNumber(
        pair?.fdv
      );

    const pairCreatedAt =
      safeNumber(
        pair?.pairCreatedAt
      );

    const ageMinutes =
      pairCreatedAt > 0
        ? (
            Date.now() -
            pairCreatedAt
          ) /
          60000
        : null;

    const buyPressure5m =
      percentage(
        buys5m,
        buys5m +
        sells5m
      );

    const buyPressure1h =
      percentage(
        buys1h,
        buys1h +
        sells1h
      );

    const buyPressure24h =
      percentage(
        buys24h,
        buys24h +
        sells24h
      );

    const liquidityMarketCapRatio =
      marketCap > 0
        ? (
            liquidityUsd /
            marketCap *
            100
          )
        : null;

    return {
      verified:
        true,

      status:
        "VERIFIED",

      pairAddress:
        pair?.pairAddress ||
        null,

      dexId:
        pair?.dexId ||
        null,

      url:
        pair?.url ||
        null,

      baseToken:
        pair?.baseToken ||
        null,

      quoteToken:
        pair?.quoteToken ||
        null,

      priceUsd:
        pair?.priceUsd ||
        null,

      liquidityUsd,

      marketCap:
        marketCap || null,

      fdv:
        fdv || null,

      pairCreatedAt:
        pairCreatedAt ||
        null,

      ageMinutes,

      volume: {
        m5:
          safeNumber(
            pair?.volume?.m5
          ),

        h1:
          safeNumber(
            pair?.volume?.h1
          ),

        h6:
          safeNumber(
            pair?.volume?.h6
          ),

        h24:
          safeNumber(
            pair?.volume?.h24
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

        h6: {
          buys:
            buys6h,

          sells:
            sells6h
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
          buyPressure5m,

        h1:
          buyPressure1h,

        h24:
          buyPressure24h
      },

      priceChange: {
        m5:
          safeNumber(
            pair?.priceChange?.m5
          ),

        h1:
          safeNumber(
            pair?.priceChange?.h1
          ),

        h6:
          safeNumber(
            pair?.priceChange?.h6
          ),

        h24:
          safeNumber(
            pair?.priceChange?.h24
          )
      },

      liquidityMarketCapRatio,

      boostsActive:
        safeNumber(
          pair?.boosts?.active
        )
    };

  } catch (error) {
    return {
      verified:
        false,

      status:
        "DEXSCREENER_REQUEST_FAILED",

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}

/*
 * ---------------------------------------------------------
 * BLOCKSCOUT HOLDER INTELLIGENCE
 * ---------------------------------------------------------
 */

function blockscoutUrl(
  env,
  path
) {
  if (
    env.BLOCKSCOUT_API_KEY
  ) {
    return (
      `${BLOCKSCOUT_PRO}${path}` +
      `?apikey=${encodeURIComponent(
        env.BLOCKSCOUT_API_KEY
      )}`
    );
  }

  return (
    `${BLOCKSCOUT_PUBLIC}${path}`
  );
}

async function blockscoutGet(
  env,
  path
) {
  const url =
    blockscoutUrl(
      env,
      path
    );

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
      response.status === 429
    ) {
      return {
        ok:
          false,

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

        error:
          `HTTP ${response.status}`
      };
    }

    return {
      ok:
        true,

      data:
        await response.json()
    };

  } catch (error) {
    return {
      ok:
        false,

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

    /*
     * Basis points * 100 gives
     * useful decimal precision.
     */

    const scaled =
      held *
      1_000_000n /
      supply;

    return (
      Number(scaled) /
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

  const holders =
    await blockscoutGet(
      env,
      `/api/v2/tokens/${token}/holders`
    );

  let holderCount =
    null;

  let transferCount =
    null;

  if (
    counters.ok
  ) {
    holderCount =
      safeNumber(
        counters.data
          ?.token_holders_count
      );

    transferCount =
      safeNumber(
        counters.data
          ?.transfers_count
      );
  }

  const topHolders = [];

  if (
    holders.ok &&
    Array.isArray(
      holders.data?.items
    )
  ) {
    for (
      const item of
      holders.data.items.slice(
        0,
        10
      )
    ) {
      const holderAddress =
        item
          ?.address_hash
          ?.hash ||
        null;

      const value =
        item?.value ||
        "0";

      topHolders.push({
        address:
          holderAddress,

        value:
          String(value),

        percentage:
          holderPercentage(
            value,
            totalSupply
          ),

        isContract:
          Boolean(
            item
              ?.address_hash
              ?.is_contract
          )
      });
    }
  }

  const percentages =
    topHolders
      .map(
        holder =>
          holder.percentage
      )
      .filter(
        value =>
          value !== null
      );

  const top1 =
    percentages.length > 0
      ? percentages[0]
      : null;

  const top5 =
    percentages.length > 0
      ? percentages
          .slice(0, 5)
          .reduce(
            (sum, value) =>
              sum + value,
            0
          )
      : null;

  const top10 =
    percentages.length > 0
      ? percentages
          .slice(0, 10)
          .reduce(
            (sum, value) =>
              sum + value,
            0
          )
      : null;

  return {
    verified:
      Boolean(
        counters.ok ||
        holders.ok
      ),

    source:
      env.BLOCKSCOUT_API_KEY
        ? "BLOCKSCOUT_PRO"
        : "BLOCKSCOUT_PUBLIC",

    holderCount:
      holderCount ||
      null,

    transferCount:
      transferCount ||
      null,

    concentration: {
      top1Percent:
        top1,

      top5Percent:
        top5,

      top10Percent:
        top10,

      /*
       * Raw holder concentration.
       * LP/burn/exchange exclusions are NOT
       * yet verified in V67.
       */
      adjustedForKnownSystemWallets:
        false
    },

    topHolders,

    errors: {
      counters:
        counters.ok
          ? null
          : counters.error,

      holders:
        holders.ok
          ? null
          : holders.error
    }
  };
}

/*
 * ---------------------------------------------------------
 * Rug Risk V67
 * ---------------------------------------------------------
 */

function scoreRugRisk(
  token,
  activity,
  market,
  holders
) {
  let risk =
    50;

  const reasons = [];

  if (
    token.validERC20
  ) {
    risk -= 15;

    reasons.push(
      "Verified ERC-20 contract"
    );
  }

  if (
    token.totalSupply &&
    BigInt(
      token.totalSupply
    ) > 0n
  ) {
    risk -= 5;

    reasons.push(
      "Positive total supply"
    );
  }

  if (
    token.name &&
    token.symbol
  ) {
    risk -= 5;
  }

  if (
    activity.swaps > 0
  ) {
    risk -= 8;

    reasons.push(
      "Observed V4 swap activity"
    );
  }

  if (
    activity.liquidityEvents > 0
  ) {
    risk -= 4;

    reasons.push(
      "Observed V4 liquidity activity"
    );
  }

  if (
    market?.verified
  ) {
    risk -= 5;

    reasons.push(
      "External market data verified"
    );

    if (
      market.liquidityUsd >=
      10_000
    ) {
      risk -= 8;

      reasons.push(
        "Liquidity above $10K"
      );
    }

    if (
      market.liquidityUsd <
      1_000
    ) {
      risk += 15;

      reasons.push(
        "Very low verified liquidity"
      );
    }
  }

  if (
    holders?.verified
  ) {
    if (
      holders.holderCount !== null &&
      holders.holderCount < 10
    ) {
      risk += 15;

      reasons.push(
        "Very low holder count"
      );
    }

    const top1 =
      holders
        .concentration
        ?.top1Percent;

    const top10 =
      holders
        .concentration
        ?.top10Percent;

    if (
      top1 !== null &&
      top1 > 50
    ) {
      risk += 20;

      reasons.push(
        "Top holder controls >50% of supply"
      );
    }

    if (
      top10 !== null &&
      top10 > 80
    ) {
      risk += 20;

      reasons.push(
        "Top 10 holders control >80% of supply"
      );
    }

    if (
      top10 !== null &&
      top10 < 50
    ) {
      risk -= 5;

      reasons.push(
        "Lower raw top-10 concentration"
      );
    }
  }

  if (
    activity.swaps === 0 &&
    !market?.verified
  ) {
    risk += 10;

    reasons.push(
      "No verified trading activity"
    );
  }

  if (
    !token.validERC20
  ) {
    risk = 100;

    reasons.push(
      "ERC-20 verification failed"
    );
  }

  risk =
    clamp(
      risk,
      0,
      100
    );

  return {
    score:
      risk,

    label:
      risk >= 80
        ? "HIGH"
        : risk >= 60
        ? "MEDIUM"
        : "LOW",

    reasons
  };
}

/*
 * ---------------------------------------------------------
 * Opportunity Score V67
 * ---------------------------------------------------------
 */

function scoreOpportunity(
  token,
  activity,
  market,
  holders
) {
  let score =
    0;

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

    reasons.push(
      "Token metadata available"
    );
  }

  if (
    activity.swaps > 0
  ) {
    score += 10;

    reasons.push(
      "On-chain V4 swaps detected"
    );
  }

  if (
    activity.liquidityEvents > 0
  ) {
    score += 5;

    reasons.push(
      "Liquidity activity detected"
    );
  }

  if (
    market?.verified
  ) {
    score += 10;

    reasons.push(
      "Market data verified"
    );

    if (
      market.liquidityUsd >=
      5_000
    ) {
      score += 5;

      reasons.push(
        "Liquidity above $5K"
      );
    }

    if (
      market.liquidityUsd >=
      25_000
    ) {
      score += 5;

      reasons.push(
        "Liquidity above $25K"
      );
    }

    if (
      market.volume.h24 >=
      10_000
    ) {
      score += 5;

      reasons.push(
        "24h volume above $10K"
      );
    }

    if (
      market.volume.h24 >=
      50_000
    ) {
      score += 5;

      reasons.push(
        "24h volume above $50K"
      );
    }

    if (
      market.buyPressure.h1 !==
        null &&
      market.buyPressure.h1 >=
        60
    ) {
      score += 7;

      reasons.push(
        "Strong 1h buy pressure"
      );
    }

    if (
      market.buyPressure.m5 !==
        null &&
      market.buyPressure.m5 >=
        65
    ) {
      score += 5;

      reasons.push(
        "Strong 5m buy pressure"
      );
    }

    if (
      market.ageMinutes !==
        null &&
      market.ageMinutes <=
        24 * 60
    ) {
      score += 5;

      reasons.push(
        "Pair is less than 24h old"
      );
    }

    if (
      market.marketCap !== null &&
      market.marketCap >=
        25_000 &&
      market.marketCap <=
        5_000_000
    ) {
      score += 5;

      reasons.push(
        "Early-stage market-cap range"
      );
    }

    if (
      market
        .liquidityMarketCapRatio !==
        null &&
      market
        .liquidityMarketCapRatio >=
        5
    ) {
      score += 3;

      reasons.push(
        "Healthy liquidity / market-cap ratio"
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
      score += 4;

      reasons.push(
        "50+ holders"
      );
    }

    if (
      holders.holderCount >=
      200
    ) {
      score += 4;

      reasons.push(
        "200+ holders"
      );
    }

    const top10 =
      holders
        .concentration
        ?.top10Percent;

    if (
      top10 !== null &&
      top10 <= 60
    ) {
      score += 4;

      reasons.push(
        "Top-10 concentration below 60%"
      );
    }

    if (
      top10 !== null &&
      top10 > 85
    ) {
      score -= 15;

      reasons.push(
        "Penalty: extreme top-10 concentration"
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
    reasons
  };
}

/*
 * ---------------------------------------------------------
 * Telegram
 * ---------------------------------------------------------
 */

async function sendTelegram(
  env,
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
    candidate.rugRisk.score >
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
    candidate.opportunity.score <
    MIN_TELEGRAM_SCORE
  ) {
    return {
      sent:
        false,

      reason:
        "OPPORTUNITY_SCORE_BELOW_THRESHOLD"
    };
  }

  pruneSentTokens();

  const tokenKey =
    normalizeAddress(
      candidate.address
    );

  if (
    SENT_TOKENS.has(
      tokenKey
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

  const top10 =
    holders
      ?.concentration
      ?.top10Percent;

  const message =
`🚨 Robinhood Chain Meme Hunter V67

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🛡 Rug risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

💰 Market Cap: ${formatMoney(market.marketCap)}
💧 Liquidity: ${formatMoney(market.liquidityUsd)}
📊 24h Volume: ${formatMoney(market.volume.h24)}
⚡ 1h Volume: ${formatMoney(market.volume.h1)}

🟢 1h Buys: ${market.transactions.h1.buys}
🔴 1h Sells: ${market.transactions.h1.sells}
📈 1h Buy Pressure: ${
  market.buyPressure.h1 !== null
    ? market.buyPressure.h1.toFixed(1) + "%"
    : "UNVERIFIED"
}

👥 Holders: ${
  holders?.holderCount ??
  "UNVERIFIED"
}

🎯 Top 10 concentration: ${
  top10 !== null &&
  top10 !== undefined
    ? top10.toFixed(2) + "%"
    : "UNVERIFIED"
}

📡 V4 swaps: ${candidate.activity.swaps}
💦 Liquidity events: ${candidate.activity.liquidityEvents}

Why:
${candidate.opportunity.reasons
  .map(x => "• " + x)
  .join("\n")}

Risk:
${candidate.rugRisk.reasons
  .map(x => "• " + x)
  .join("\n")}

${
  market.url
    ? `\nChart:\n${market.url}\n`
    : ""
}
⚠️ Automated on-chain screening. High-risk early-stage assets.`;

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response =
      await fetchWithTimeout(
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
              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                message.slice(
                  0,
                  3900
                ),

              disable_web_page_preview:
                false
            })
        },
        4000
      );

    const body =
      await response.json();

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

    SENT_TOKENS.set(
      tokenKey,
      Date.now()
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
 * ---------------------------------------------------------
 * Main Scan
 * ---------------------------------------------------------
 */

async function scan(env) {
  const started =
    Date.now();

  const latest =
    await getLatestBlock(
      env
    );

  const toBlock =
    latest.block;

  const fromBlock =
    toBlock -
    BigInt(
      DISCOVERY_BLOCKS -
      1
    );

  const raw =
    await getLogs(
      env,
      fromBlock,
      toBlock,
      POOL_MANAGER
    );

  if (
    !raw.result
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        false,

      scan: {
        status:
          "RPC_ERROR",

        durationMs:
          Date.now() -
          started,

        discoveryWindow: {
          fromBlock:
            Number(
              fromBlock
            ),

          toBlock:
            Number(
              toBlock
            ),

          blocks:
            DISCOVERY_BLOCKS
        },

        v4: {
          poolManager:
            POOL_MANAGER,

          rawLogs:
            0,

          initializeEvents:
            0,

          tokenCandidates:
            0,

          provider:
            raw.provider,

          rpcError:
            raw.error
        }
      },

      timestamp:
        now()
    };
  }

  const logs =
    raw.result;

  /*
   * Exact Initialize event matching.
   */

  const initializeLogs =
    logs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_INITIALIZE_TOPIC
    );

  const pools = [];

  for (
    const log of
    initializeLogs
  ) {
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

  /*
   * Token → pools map.
   */

  const candidateMap =
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
        !candidateMap.has(
          key
        )
      ) {
        candidateMap.set(
          key,
          {
            address:
              token,

            pools:
              []
          }
        );
      }

      candidateMap
        .get(key)
        .pools
        .push(pool);
    }
  }

  const candidates =
    [
      ...candidateMap.values()
    ].slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const validationResults =
    [];

  const analysed = [];

  /*
   * Verify + enrich candidates.
   */

  for (
    const candidate of
    candidates
  ) {
    const token =
      await verifyERC20(
        env,
        candidate.address
      );

    validationResults.push({
      address:
        candidate.address,

      ...token
    });

    if (
      !token.validERC20
    ) {
      continue;
    }

    let bestActivity =
      null;

    let bestPool =
      null;

    for (
      const pool of
      candidate.pools.slice(
        0,
        3
      )
    ) {
      const activity =
        await checkPoolActivity(
          env,
          pool.poolId,
          fromBlock,
          toBlock
        );

      if (
        !bestActivity ||
        activity.swaps >
          bestActivity.swaps ||
        (
          activity.swaps ===
            bestActivity.swaps &&
          activity.liquidityEvents >
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

        provider:
          null,

        error:
          "NO_POOL_ACTIVITY_CHECK",

        logs:
          0,

        swaps:
          0,

        liquidityEvents:
          0
      };

    const pool =
      bestPool ||
      candidate.pools[0];

    /*
     * V67 enrichment.
     */

    const market =
      await getMarketData(
        candidate.address
      );

    const holders =
      await getHolderData(
        env,
        candidate.address,
        token.totalSupply
      );

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

    analysed.push({
      address:
        candidate.address,

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
        pool?.poolId ||
        null,

      pool:
        pool ||
        null,

      poolCount:
        candidate.pools.length,

      activity,

      market,

      holders,

      rugRisk,

      opportunity,

      intelligence: {
        marketData:
          market?.verified
            ? "VERIFIED"
            : "UNVERIFIED",

        holderData:
          holders?.verified
            ? "VERIFIED"
            : "UNVERIFIED",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      }
    });
  }

  /*
   * Best opportunity first.
   */

  analysed.sort(
    (a, b) =>
      b.opportunity.score -
      a.opportunity.score
  );

  const qualifying =
    analysed.filter(
      candidate =>
        candidate.validERC20 &&
        candidate.market
          ?.verified ===
          true &&
        candidate.market
          .liquidityUsd >=
          MIN_ALERT_LIQUIDITY_USD &&
        candidate.rugRisk.score <=
          MAX_RUG_RISK_FOR_ALERT &&
        candidate.opportunity.score >=
          MIN_TELEGRAM_SCORE
    );

  const telegramCandidates =
    [];

  for (
    const candidate of
    qualifying.slice(
      0,
      3
    )
  ) {
    const telegram =
      await sendTelegram(
        env,
        candidate
      );

    candidate.telegram =
      telegram;

    if (
      telegram.sent
    ) {
      telegramCandidates.push(
        candidate
      );
    }
  }

  /*
   * Diagnostics.
   */

  const topic0Sample =
    [
      ...new Set(
        logs
          .map(
            log =>
              log
                .topics?.[0]
          )
          .filter(Boolean)
          .map(
            topic =>
              topic.toLowerCase()
          )
      )
    ].slice(
      0,
      15
    );

  const initializeTopicMatches =
    logs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_INITIALIZE_TOPIC
    ).length;

  const swapTopicMatches =
    logs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_SWAP_TOPIC
    ).length;

  const modifyLiquidityTopicMatches =
    logs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_MODIFY_LIQUIDITY_TOPIC
    ).length;

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
          toBlock
        ),

      discoveryWindow: {
        fromBlock:
          Number(
            fromBlock
          ),

        toBlock:
          Number(
            toBlock
          ),

        blocks:
          DISCOVERY_BLOCKS
      },

      v4: {
        poolManager:
          POOL_MANAGER,

        rawLogs:
          logs.length,

        initializeEvents:
          pools.length,

        initializeTopicMatches,

        swapTopicMatches,

        modifyLiquidityTopicMatches,

        topic0Sample,

        tokenCandidates:
          candidateMap.size,

        provider:
          raw.provider,

        rpcError:
          raw.error
      },

      uniqueTokenCandidates:
        candidateMap.size,

      tokenValidationChecks:
        candidates.length,

      validERC20Tokens:
        validationResults.filter(
          result =>
            result.validERC20
        ).length,

      validationResults,

      candidates:
        analysed,

      qualifyingCandidates:
        qualifying.length,

      telegramCandidates:
        telegramCandidates.length,

      telegram:
        telegramCandidates.length >
        0
          ? {
              sent:
                true,

              count:
                telegramCandidates.length
            }
          : {
              sent:
                false,

              reason:
                qualifying.length ===
                0
                  ? "NO_VERIFIED_LOW_RISK_QUALIFYING_CANDIDATE"
                  : "TELEGRAM_NOT_SENT"
            },

      intelligence: {
        dexScreener:
          "ENABLED",

        blockscout:
          env.BLOCKSCOUT_API_KEY
            ? "PRO_API"
            : "PUBLIC_EXPLORER_API",

        marketCap:
          "DEXSCREENER_IF_AVAILABLE",

        liquidity:
          "DEXSCREENER_USD",

        buySellActivity:
          "DEXSCREENER",

        holderCount:
          "BLOCKSCOUT",

        holderConcentration:
          "BLOCKSCOUT_RAW_TOP_HOLDERS",

        adjustedHolderConcentration:
          "NOT_VERIFIED",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      },

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        zeroAddressProtection:
          true,

        boundedRPCWorkload:
          true,

        safeEmptyRPCResults:
          true,

        exactV4EventTopics:
          true,

        v4CurrencyDecoding:
          "TOPICS_2_AND_3",

        nativeCurrencyFiltered:
          true,

        tokenContract:
          "BYTECODE_AND_ERC20_METHOD_VERIFIED",

        rugRisk:
          "V67_ON_CHAIN_MARKET_HOLDER_HEURISTIC",

        opportunity:
          "V67_ON_CHAIN_MARKET_HOLDER_HEURISTIC",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_MARKET_LOW_RISK_ONLY",

        duplicateProtection:
          "MEMORY_ONLY_6_HOUR_COOLDOWN",

        liquidity:
          "DEXSCREENER_USD_IF_AVAILABLE",

        marketCap:
          "DEXSCREENER_IF_AVAILABLE",

        holderConcentration:
          "RAW_BLOCKSCOUT_NOT_LP_BURN_ADJUSTED",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V67_V4_DISCOVERY_MARKET_HOLDER_INTELLIGENCE"
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
 * ---------------------------------------------------------
 * Health
 * ---------------------------------------------------------
 */

async function health(env) {
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
      "/test-telegram"
    ],

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID,

      rpc:
        "ROBINHOOD_PUBLIC_RPC + ALCHEMY_FALLBACK"
    },

    providers: {
      robinhoodPublicRpc:
        PUBLIC_RPC,

      alchemyConfigured:
        Boolean(
          env.ALCHEMY_API_KEY
        ),

      alchemyEndpoint:
        "ROBINHOOD_MAINNET",

      dexScreener:
        true,

      blockscout:
        env.BLOCKSCOUT_API_KEY
          ? "PRO_API_CONFIGURED"
          : "PUBLIC_API",

      blockscoutApiKeyConfigured:
        Boolean(
          env.BLOCKSCOUT_API_KEY
        )
    },

    rpcStatus:
      error
        ? "ERROR"
        : "CONNECTED",

    latestBlock,

    rpcProvider:
      provider,

    error,

    rpcTimeoutMs:
      RPC_TIMEOUT_MS,

    discoveryBlocks:
      DISCOVERY_BLOCKS,

    maxTokenChecks:
      MAX_TOKEN_CHECKS,

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

      maximumRugRisk:
        MAX_RUG_RISK_FOR_ALERT,

      minimumLiquidityUsd:
        MIN_ALERT_LIQUIDITY_USD,

      tokenVerification:
        "REQUIRED",

      marketVerification:
        "REQUIRED",

      zeroAddressProtection:
        true,

      duplicateProtection:
        "MEMORY_ONLY"
    },

    intelligence: {
      market:
        "DEXSCREENER",

      liquidity:
        "DEXSCREENER",

      volume:
        "DEXSCREENER",

      buySellPressure:
        "DEXSCREENER",

      holders:
        "BLOCKSCOUT",

      holderConcentration:
        "BLOCKSCOUT_RAW",

      smartMoney:
        "NOT_YET",

      social:
        "NOT_YET"
    },

    v4: {
      initializeTopic:
        V4_INITIALIZE_TOPIC,

      swapTopic:
        V4_SWAP_TOPIC,

      modifyLiquidityTopic:
        V4_MODIFY_LIQUIDITY_TOPIC,

      exactTopicMatching:
        true
    },

    architecture:
      "V67_V4_DISCOVERY_MARKET_HOLDER_INTELLIGENCE",

    timestamp:
      now()
  };
}

/*
 * ---------------------------------------------------------
 * RPC Test
 * ---------------------------------------------------------
 */

async function rpcTest(env) {
  const latest =
    await getLatestBlock(
      env
    );

  const toBlock =
    latest.block;

  const fromBlock =
    toBlock -
    2n;

  const range =
    await getLogs(
      env,
      fromBlock,
      toBlock
    );

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
        range.result ||
        pool.result
      ),

    rpcTest:
      true,

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    latestBlock:
      Number(
        toBlock
      ),

    fromBlock:
      Number(
        fromBlock
      ),

    toBlock:
      Number(
        toBlock
      ),

    blockRange:
      3,

    tests: [
      {
        test:
          "range_only",

        success:
          Boolean(
            range.result
          ),

        provider:
          range.provider,

        logs:
          range.result
            ? range.result.length
            : 0,

        error:
          range.error
      },

      {
        test:
          "pool_manager",

        success:
          Boolean(
            pool.result
          ),

        provider:
          pool.provider,

        logs:
          pool.result
            ? pool.result.length
            : 0,

        error:
          pool.error
      }
    ],

    timestamp:
      now()
  };
}

/*
 * ---------------------------------------------------------
 * Telegram safety test
 * ---------------------------------------------------------
 */

async function telegramTest(
  env
) {
  const result =
    await sendTelegram(
      env,
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
 * ---------------------------------------------------------
 * Worker
 * ---------------------------------------------------------
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
      url.pathname.replace(
        /\/+$/,
        ""
      ) ||
      "/";

    try {
      if (
        path ===
          "/health" ||
        path === "/"
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

  /*
   * Existing Cloudflare Cron trigger
   * can invoke this automatically.
   */

  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      scan(env)
        .then(
          result => {
            console.log(
              JSON.stringify({
                event:
                  "V67_SCHEDULED_SCAN",

                success:
                  result.success,

                candidates:
                  result.scan
                    ?.candidates
                    ?.length ||
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
              "V67 scheduled scan failed",
              error
            );
          }
        )
    );
  }
};
