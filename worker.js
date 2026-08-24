/**
 * Robinhood Chain Meme Hunter
 * V66
 *
 * Chain: Robinhood Chain
 * Chain ID: 4663
 *
 * Full replacement for V65.
 *
 * V66 fixes:
 * - Fixes modifyLiquidityTopicMatches runtime error
 * - Keeps exact V4 event matching
 * - Keeps multi-pool activity analysis
 * - Keeps ERC20 verification
 * - Keeps rug/opportunity scoring
 * - Keeps Telegram safety controls
 * - Keeps RPC fallback and 429 backoff
 */

const VERSION = "V66";
const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const DISCOVERY_BLOCKS = 10;
const RPC_TIMEOUT_MS = 2500;
const MAX_TOKEN_CHECKS = 5;

const MIN_TELEGRAM_SCORE = 60;

/*
 * V4 EVENT TOPICS
 */

const V4_INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const V4_SWAP_TOPIC =
  "0x40e9cecb9f5f1f1c5b9c97dec2917b7ee92e57ba5563708daca94dd84ad7112f";

const V4_MODIFY_LIQUIDITY_TOPIC =
  "0xf208f4912782fd25c7f114ca3723a2d5dd6f3bcc3ac8db5af63baa85f711d5ec";

/*
 * ERC20 selectors.
 */

const SEL_NAME = "0x06fdde03";
const SEL_SYMBOL = "0x95d89b41";
const SEL_DECIMALS = "0x313ce567";
const SEL_TOTAL_SUPPLY = "0x18160ddd";

/*
 * ------------------------------------------------------------------
 * Utility
 * ------------------------------------------------------------------
 */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "cache-control": "no-store"
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
  return String(value).toLowerCase();
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

  return "0x" + topic.slice(-40);
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  );
}

function hexToNumber(hex) {
  if (!hex) return null;

  try {
    return Number(BigInt(hex));
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

  const raw = data.slice(2);

  const start = index * 64;
  const end = start + 64;

  if (end > raw.length) {
    return null;
  }

  return "0x" + raw.slice(start, end);
}

function decodeSignedInt(hex, bits) {
  if (!hex) return null;

  try {
    let value = BigInt(hex);

    const max =
      1n << BigInt(bits - 1);

    const mod =
      1n << BigInt(bits);

    if (value >= max) {
      value -= mod;
    }

    return value;
  } catch {
    return null;
  }
}

/*
 * ------------------------------------------------------------------
 * RPC
 * ------------------------------------------------------------------
 */

function alchemyRpc(env) {
  if (!env.ALCHEMY_API_KEY) {
    return null;
  }

  return (
    "https://rpc-mainnet.g.alchemy.com/v2/" +
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
      () => controller.abort(),
      RPC_TIMEOUT_MS
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

    if (response.status === 429) {
      if (attempt < 2) {
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

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    const body =
      await response.json();

    if (body.error) {
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
  let publicError = null;

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
      error: null
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
      result: null,
      provider: null,
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
      error: null
    };

  } catch (error) {
    return {
      result: null,
      provider: null,
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
 * ------------------------------------------------------------------
 * Block
 * ------------------------------------------------------------------
 */

async function getLatestBlock(env) {
  const result =
    await rpcWithFallback(
      env,
      "eth_blockNumber",
      []
    );

  if (!result.result) {
    throw new Error(
      result.error ||
      "LATEST_BLOCK_FAILED"
    );
  }

  return {
    block:
      BigInt(result.result),
    provider:
      result.provider
  };
}

/*
 * ------------------------------------------------------------------
 * Logs
 * ------------------------------------------------------------------
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
      fromBlock.toString(16),

    toBlock:
      "0x" +
      toBlock.toString(16)
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
 * ------------------------------------------------------------------
 * ERC20
 * ------------------------------------------------------------------
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
          to: token,
          data
        },
        "latest"
      ]
    );

  if (!result.result) {
    throw new Error(
      result.error ||
      "ETH_CALL_FAILED"
    );
  }

  return result.result;
}

function decodeUint256(hex) {
  if (
    typeof hex !== "string" ||
    !/^0x[0-9a-fA-F]+$/.test(hex) ||
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
          .match(/.{1,2}/g)
          ?.map(
            b => parseInt(b, 16)
          ) || []
      );

    return new TextDecoder()
      .decode(bytes)
      .replace(/\0/g, "")
      .trim();

  } catch {
    return null;
  }
}

function decodeString(hex) {
  if (
    typeof hex !== "string" ||
    !/^0x[0-9a-fA-F]*$/.test(hex)
  ) {
    return null;
  }

  const raw =
    hex.slice(2);

  if (!raw.length) {
    return null;
  }

  try {
    if (raw.length >= 128) {
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

    if (raw.length >= 64) {
      return hexToUtf8(
        raw.slice(0, 64)
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
      result.result || null,

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
      validERC20: false,
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
      validERC20: false,
      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  const checks = {};

  try {
    const result =
      await ethCall(
        env,
        address,
        SEL_NAME
      );

    checks.name =
      decodeString(result);

  } catch {
    checks.name = null;
  }

  try {
    const result =
      await ethCall(
        env,
        address,
        SEL_SYMBOL
      );

    checks.symbol =
      decodeString(result);

  } catch {
    checks.symbol = null;
  }

  try {
    const result =
      await ethCall(
        env,
        address,
        SEL_DECIMALS
      );

    const decoded =
      decodeUint256(result);

    checks.decimals =
      decoded !== null
        ? Number(decoded)
        : null;

  } catch {
    checks.decimals = null;
  }

  try {
    const result =
      await ethCall(
        env,
        address,
        SEL_TOTAL_SUPPLY
      );

    checks.totalSupply =
      decodeUint256(result);

  } catch {
    checks.totalSupply =
      null;
  }

  const methodScore =
    (checks.name ? 1 : 0) +
    (checks.symbol ? 1 : 0) +
    (checks.decimals !== null ? 1 : 0) +
    (checks.totalSupply !== null ? 1 : 0);

  if (methodScore < 3) {
    return {
      validERC20: false,
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
      validERC20: false,
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
      validERC20: false,
      reason:
        "INVALID_TOTAL_SUPPLY",
      ...checks
    };
  }

  return {
    validERC20: true,
    reason:
      "VERIFIED",

    address,

    bytecode: true,

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
 * ------------------------------------------------------------------
 * V4 Initialize decoder
 * ------------------------------------------------------------------
 */

function decodeInitializeLog(log) {
  if (
    !log ||
    !Array.isArray(log.topics) ||
    log.topics.length !== 4
  ) {
    return null;
  }

  const topic0 =
    String(
      log.topics[0] || ""
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
    log.data || "0x";

  if (
    !/^0x[0-9a-fA-F]{320}$/.test(
      data
    )
  ) {
    return null;
  }

  const fee =
    hexToNumber(
      hexWord(data, 0)
    );

  const tickSpacing =
    decodeSignedInt(
      hexWord(data, 1),
      24
    );

  const hooks =
    topicToAddress(
      hexWord(data, 2)
    );

  let sqrtPriceX96 = null;

  try {
    sqrtPriceX96 =
      BigInt(
        hexWord(data, 3)
      );
  } catch {}

  const tick =
    decodeSignedInt(
      hexWord(data, 4),
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
      log.address,

    data
  };
}

/*
 * ------------------------------------------------------------------
 * Candidate extraction
 * ------------------------------------------------------------------
 */

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
      isZeroAddress(currency)
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
          normalizeAddress(x) ===
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
 * ------------------------------------------------------------------
 * Pool activity
 * ------------------------------------------------------------------
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

  if (!result.result) {
    return {
      success: false,

      provider:
        result.provider,

      error:
        result.error,

      logs: 0,

      swaps: 0,

      liquidityEvents: 0
    };
  }

  let swaps = 0;
  let liquidityEvents = 0;

  for (
    const log of result.result
  ) {
    const topic0 =
      String(
        log.topics?.[0] || ""
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
    success: true,

    provider:
      result.provider,

    error: null,

    logs:
      result.result.length,

    swaps,

    liquidityEvents
  };
}

/*
 * ------------------------------------------------------------------
 * Risk scoring
 * ------------------------------------------------------------------
 */

function scoreRugRisk(
  token,
  activity
) {
  let risk = 50;

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
    risk -= 10;

    reasons.push(
      "Observed V4 swap activity"
    );
  }

  if (
    activity.liquidityEvents > 0
  ) {
    risk -= 5;

    reasons.push(
      "Observed liquidity modification"
    );
  }

  if (
    activity.swaps === 0
  ) {
    risk += 10;

    reasons.push(
      "No V4 swaps observed in discovery window"
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
 * ------------------------------------------------------------------
 * Opportunity scoring
 * ------------------------------------------------------------------
 */

function scoreOpportunity(
  token,
  activity
) {
  let score = 0;

  const reasons = [];

  if (
    token.validERC20
  ) {
    score += 25;

    reasons.push(
      "Verified ERC-20"
    );
  }

  if (
    token.name &&
    token.symbol
  ) {
    score += 10;

    reasons.push(
      "Token metadata available"
    );
  }

  if (
    activity.swaps > 0
  ) {
    score += 30;

    reasons.push(
      "V4 swap activity detected"
    );
  }

  if (
    activity.liquidityEvents > 0
  ) {
    score += 15;

    reasons.push(
      "Liquidity activity detected"
    );
  }

  if (
    activity.logs > 0 &&
    activity.logs < 20
  ) {
    score += 10;

    reasons.push(
      "Early activity profile"
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
    reasons
  };
}

/*
 * ------------------------------------------------------------------
 * Telegram
 * ------------------------------------------------------------------
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
      sent: false,
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
      sent: false,
      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    !candidate.validERC20
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_UNVERIFIED_ERC20"
    };
  }

  if (
    candidate.rugRisk.score >= 60
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_HIGH_RUG_RISK"
    };
  }

  if (
    candidate.opportunity.score <
    MIN_TELEGRAM_SCORE
  ) {
    return {
      sent: false,
      reason:
        "OPPORTUNITY_SCORE_BELOW_THRESHOLD"
    };
  }

  const message =
`🚨 Robinhood Chain Meme Hunter

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${candidate.opportunity.score}/100
🛡 Rug risk: ${candidate.rugRisk.score}/100 (${candidate.rugRisk.label})

📊 V4 swaps: ${candidate.activity.swaps}
💧 Liquidity events: ${candidate.activity.liquidityEvents}
📡 Pool logs: ${candidate.activity.logs}

Why:
${candidate.opportunity.reasons
  .map(
    x => "• " + x
  )
  .join("\n")}

Risk:
${candidate.rugRisk.reasons
  .map(
    x => "• " + x
  )
  .join("\n")}

⚠️ Automated on-chain screening only.`;

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

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
              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                message,

              disable_web_page_preview:
                true
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

        error:
          body?.description ||
          `HTTP ${response.status}`
      };
    }

    return {
      sent: true,

      messageId:
        body.result?.message_id ||
        null
    };

  } catch (error) {
    return {
      sent: false,

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
 * ------------------------------------------------------------------
 * Scan
 * ------------------------------------------------------------------
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
      DISCOVERY_BLOCKS - 1
    );

  const raw =
    await getLogs(
      env,
      fromBlock,
      toBlock,
      POOL_MANAGER
    );

  if (!raw.result) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success: false,

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

          rawLogs: 0,

          initializeEvents: 0,

          tokenCandidates: 0,

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
    const log of initializeLogs
  ) {
    const decoded =
      decodeInitializeLog(
        log
      );

    if (decoded) {
      pools.push(
        decoded
      );
    }
  }

  /*
   * Candidate map.
   */

  const candidateMap =
    new Map();

  for (
    const pool of pools
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
        !candidateMap.has(key)
      ) {
        candidateMap.set(
          key,
          {
            address:
              token,

            pools: []
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
   * Verify tokens.
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

    /*
     * Check up to three pools
     * for the same token.
     */

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
            bestActivity.liquidityEvents
        )
      ) {
        bestActivity =
          activity;

        bestPool =
          pool;
      }
    }

    const activity =
      bestActivity || {
        success: false,

        provider: null,

        error:
          "NO_POOL_ACTIVITY_CHECK",

        logs: 0,

        swaps: 0,

        liquidityEvents: 0
      };

    const pool =
      bestPool ||
      candidate.pools[0];

    const rugRisk =
      scoreRugRisk(
        token,
        activity
      );

    const opportunity =
      scoreOpportunity(
        token,
        activity
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
        pool || null,

      poolCount:
        candidate.pools.length,

      activity,

      rugRisk,

      opportunity
    });
  }

  /*
   * Qualifying candidates.
   */

  const qualifying =
    analysed.filter(
      candidate =>
        candidate.validERC20 &&
        candidate.rugRisk.score <
          60 &&
        candidate.opportunity.score >=
          MIN_TELEGRAM_SCORE
    );

  const telegramCandidates =
    [];

  for (
    const candidate of
    qualifying
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
            x =>
              x.topics?.[0]
          )
          .filter(Boolean)
          .map(
            x =>
              x.toLowerCase()
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

  const modifyLiquidityMatches =
    logs.filter(
      log =>
        String(
          log.topics?.[0] ||
          ""
        ).toLowerCase() ===
        V4_MODIFY_LIQUIDITY_TOPIC
    ).length;

  /*
   * IMPORTANT:
   *
   * The V65 runtime error was caused by returning:
   *
   * modifyLiquidityTopicMatches
   *
   * while the actual variable was:
   *
   * modifyLiquidityMatches
   *
   * V66 explicitly assigns the correct value here.
   */

  const modifyLiquidityTopicMatches =
    modifyLiquidityMatches;

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success: true,

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

        initializeTopicMatches:
          initializeTopicMatches,

        swapTopicMatches:
          swapTopicMatches,

        modifyLiquidityTopicMatches:
          modifyLiquidityTopicMatches,

        topic0Sample:

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
          x =>
            x.validERC20
        ).length,

      validationResults,

      candidates:
        analysed,

      qualifyingCandidates:
        qualifying.length,

      telegramCandidates:
        telegramCandidates.length,

      telegram:
        telegramCandidates.length > 0
          ? {
              sent: true,

              count:
                telegramCandidates.length
            }
          : {
              sent: false,

              reason:
                qualifying.length === 0
                  ? "NO_VERIFIED_LOW_RISK_QUALIFYING_CANDIDATE"
                  : "TELEGRAM_NOT_SENT"
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

        structuralInitializeFallback:
          false,

        robinhoodPublicRpc:
          "PRIMARY_WITH_429_BACKOFF",

        alchemyFallback:
          env.ALCHEMY_API_KEY
            ? "CONFIGURED"
            : "NOT_CONFIGURED",

        v4CurrencyDecoding:
          "TOPICS_2_AND_3",

        nativeCurrencyFiltered:
          true,

        tokenContract:
          "BYTECODE_AND_ERC20_METHOD_VERIFIED",

        rugRisk:
          "HEURISTIC_ON_CHAIN_RISK_SCORE",

        opportunity:
          "HEURISTIC_ON_CHAIN_OPPORTUNITY_SCORE",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_LOW_RISK_ONLY",

        liquidity:
          "V4_MODIFY_LIQUIDITY_EVENTS_DETECTED_NOT_VALUE_VERIFIED",

        marketCap:
          "NOT_VERIFIED",

        holderConcentration:
          "NOT_VERIFIED",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V66_EXACT_V4_EVENTS_MULTI_POOL_ACTIVITY_VERIFIED_TOKEN_RUG_RISK_HUNTER"
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
 * ------------------------------------------------------------------
 * Health
 * ------------------------------------------------------------------
 */

async function health(env) {
  let latestBlock = null;
  let provider = null;
  let error = null;

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

      blockscoutConfigured:
        false
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

      tokenVerification:
        "REQUIRED",

      zeroAddressProtection:
        true,

      highRiskBlock:
        true
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
      "V66_EXACT_V4_EVENTS_MULTI_POOL_ACTIVITY_VERIFIED_TOKEN_RUG_RISK_HUNTER",

    timestamp:
      now()
  };
}

/*
 * ------------------------------------------------------------------
 * RPC Test
 * ------------------------------------------------------------------
 */

async function rpcTest(env) {
  const latest =
    await getLatestBlock(
      env
    );

  const toBlock =
    latest.block;

  const fromBlock =
    toBlock - 2n;

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

    v4Topics: {
      initialize:
        V4_INITIALIZE_TOPIC,

      swap:
        V4_SWAP_TOPIC,

      modifyLiquidity:
        V4_MODIFY_LIQUIDITY_TOPIC
    },

    timestamp:
      now()
  };
}

/*
 * ------------------------------------------------------------------
 * Telegram safety test
 * ------------------------------------------------------------------
 */

async function telegramTest(env) {
  const result =
    await sendTelegram(
      env,
      {
        address:
          ZERO,

        validERC20:
          false,

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
 * ------------------------------------------------------------------
 * Worker
 * ------------------------------------------------------------------
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
      ) || "/";

    try {
      if (
        path === "/health" ||
        path === "/"
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
        path === "/test-telegram"
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
  }
};
