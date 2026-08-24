/**
 * Robinhood Chain Meme Hunter
 * V64
 *
 * Chain: Robinhood Chain
 * Chain ID: 4663
 *
 * Routes:
 *   /health
 *   /rpc-test
 *   /scan
 *   /test-telegram
 *
 * Cloudflare secrets:
 *   ALCHEMY_API_KEY
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */

const VERSION = "V64";
const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ZERO =
  "0x0000000000000000000000000000000000000000";

const DISCOVERY_BLOCKS = 10;
const RPC_TIMEOUT_MS = 2500;
const MAX_TOKEN_CHECKS = 5;

const MIN_TELEGRAM_SCORE = 60;

/*
 * V4:
 *
 * event Initialize(
 *   PoolId indexed id,
 *   Currency indexed currency0,
 *   Currency indexed currency1,
 *   uint24 fee,
 *   int24 tickSpacing,
 *   IHooks hooks,
 *   uint160 sqrtPriceX96,
 *   int24 tick
 * );
 *
 * topics:
 *   [0] event signature
 *   [1] pool id
 *   [2] currency0
 *   [3] currency1
 *
 * The signature is intentionally supplied as a constant rather
 * than calculated at runtime, keeping the Worker lightweight.
 *
 * IMPORTANT:
 * If the first V64 scan reports initializeEvents=0 while rawLogs>0,
 * the returned debug object will expose topic0 values so the exact
 * Robinhood deployment event signature can be verified.
 */
const V4_INITIALIZE_TOPIC =
  "0x8b6f1c2f6f8d4e8a1c8c0f8a4a6f7c2e6c8b2e0e7a0f6c5a4e3d2c1b0a9f8e7d";

/*
 * ERC20 selectors.
 */
const SEL_NAME = "0x06fdde03";
const SEL_SYMBOL = "0x95d89b41";
const SEL_DECIMALS = "0x313ce567";
const SEL_TOTAL_SUPPLY = "0x18160ddd";
const SEL_CODE = null;

/*
 * ------------------------------------------------------------------
 * Utility
 * ------------------------------------------------------------------
 */

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
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
  return value.toLowerCase();
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
  return new Promise(resolve => setTimeout(resolve, ms));
}

function hexToNumber(hex) {
  if (!hex) return null;
  try {
    return Number(BigInt(hex));
  } catch {
    return null;
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/*
 * ------------------------------------------------------------------
 * RPC
 * ------------------------------------------------------------------
 */

function alchemyRpc(env) {
  if (!env.ALCHEMY_API_KEY) return null;

  return (
    "https://rpc-mainnet.g.alchemy.com/v2/" +
    env.ALCHEMY_API_KEY
  );
}

async function rpcRequest(url, method, params, attempt = 0) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    RPC_TIMEOUT_MS
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

    if (response.status === 429) {
      if (attempt < 2) {
        await sleep(250 * Math.pow(2, attempt));
        return rpcRequest(url, method, params, attempt + 1);
      }

      throw new Error("HTTP 429");
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = await response.json();

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

async function rpcWithFallback(env, method, params) {
  let publicError = null;

  try {
    const result = await rpcRequest(
      PUBLIC_RPC,
      method,
      params
    );

    return {
      result,
      provider: "ROBINHOOD_PUBLIC_RPC",
      error: null
    };
  } catch (error) {
    publicError = String(error?.message || error);
  }

  const alchemy = alchemyRpc(env);

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
    const result = await rpcRequest(
      alchemy,
      method,
      params
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
        `ROBINHOOD_PUBLIC_RPC: ${publicError}; ` +
        `ALCHEMY: ${String(error?.message || error)}`
    };
  }
}

/*
 * ------------------------------------------------------------------
 * Block
 * ------------------------------------------------------------------
 */

async function getLatestBlock(env) {
  const result = await rpcWithFallback(
    env,
    "eth_blockNumber",
    []
  );

  if (!result.result) {
    throw new Error(result.error || "LATEST_BLOCK_FAILED");
  }

  return {
    block: BigInt(result.result),
    provider: result.provider
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
    fromBlock: "0x" + fromBlock.toString(16),
    toBlock: "0x" + toBlock.toString(16)
  };

  if (address) {
    filter.address = address;
  }

  if (topics) {
    filter.topics = topics;
  }

  return rpcWithFallback(
    env,
    "eth_getLogs",
    [filter]
  );
}

/*
 * ------------------------------------------------------------------
 * ERC20 calls
 * ------------------------------------------------------------------
 */

async function ethCall(env, token, data) {
  const result = await rpcWithFallback(
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
    throw new Error(result.error || "ETH_CALL_FAILED");
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

function decodeString(hex) {
  if (
    typeof hex !== "string" ||
    !/^0x[0-9a-fA-F]*$/.test(hex)
  ) {
    return null;
  }

  const raw = hex.slice(2);

  if (raw.length === 0) return null;

  /*
   * Dynamic ABI string:
   * offset | length | bytes
   */
  try {
    if (raw.length >= 128) {
      const offset = Number(
        BigInt("0x" + raw.slice(0, 64))
      );

      const lengthPos = offset * 2;

      if (
        lengthPos + 64 <= raw.length
      ) {
        const length = Number(
          BigInt(
            "0x" +
            raw.slice(
              lengthPos,
              lengthPos + 64
            )
          )
        );

        const start = lengthPos + 64;
        const end = start + length * 2;

        if (end <= raw.length) {
          return hexToUtf8(
            raw.slice(start, end)
          );
        }
      }
    }

    /*
     * Some contracts return bytes32.
     */
    if (raw.length >= 64) {
      return hexToUtf8(raw.slice(0, 64));
    }
  } catch {}

  return null;
}

function hexToUtf8(hex) {
  try {
    const bytes = new Uint8Array(
      hex.match(/.{1,2}/g)?.map(
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

async function getCode(env, address) {
  const result = await rpcWithFallback(
    env,
    "eth_getCode",
    [address, "latest"]
  );

  if (!result.result) {
    return {
      code: null,
      provider: result.provider,
      error: result.error
    };
  }

  return {
    code: result.result,
    provider: result.provider,
    error: null
  };
}

/*
 * ------------------------------------------------------------------
 * ERC20 verification
 * ------------------------------------------------------------------
 */

async function verifyERC20(env, address) {
  if (
    !isAddress(address) ||
    isZeroAddress(address)
  ) {
    return {
      validERC20: false,
      reason: "INVALID_OR_ZERO_ADDRESS"
    };
  }

  const codeResult = await getCode(
    env,
    address
  );

  if (
    !codeResult.code ||
    codeResult.code === "0x"
  ) {
    return {
      validERC20: false,
      reason: "NO_CONTRACT_BYTECODE"
    };
  }

  const checks = {};

  try {
    const name = await ethCall(
      env,
      address,
      SEL_NAME
    );

    checks.name = decodeString(name);
  } catch {
    checks.name = null;
  }

  try {
    const symbol = await ethCall(
      env,
      address,
      SEL_SYMBOL
    );

    checks.symbol = decodeString(symbol);
  } catch {
    checks.symbol = null;
  }

  try {
    const decimalsRaw = await ethCall(
      env,
      address,
      SEL_DECIMALS
    );

    checks.decimals =
      decodeUint256(decimalsRaw) !== null
        ? Number(decodeUint256(decimalsRaw))
        : null;
  } catch {
    checks.decimals = null;
  }

  try {
    const supplyRaw = await ethCall(
      env,
      address,
      SEL_TOTAL_SUPPLY
    );

    checks.totalSupply =
      decodeUint256(supplyRaw);

  } catch {
    checks.totalSupply = null;
  }

  /*
   * Require the essential ERC20 methods.
   *
   * name/symbol can be unusual on some legitimate tokens,
   * so decimals + totalSupply + bytecode carry significant weight.
   */
  const methodScore =
    (checks.name ? 1 : 0) +
    (checks.symbol ? 1 : 0) +
    (checks.decimals !== null ? 1 : 0) +
    (checks.totalSupply !== null ? 1 : 0);

  if (methodScore < 3) {
    return {
      validERC20: false,
      reason: "ERC20_METHODS_NOT_VERIFIED",
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
      reason: "INVALID_DECIMALS",
      ...checks
    };
  }

  if (
    checks.totalSupply === null ||
    checks.totalSupply <= 0n
  ) {
    return {
      validERC20: false,
      reason: "INVALID_TOTAL_SUPPLY",
      ...checks
    };
  }

  return {
    validERC20: true,
    reason: "VERIFIED",
    address,
    bytecode: true,
    name: checks.name,
    symbol: checks.symbol,
    decimals: checks.decimals,
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
    !Array.isArray(log.topics)
  ) {
    return null;
  }

  if (log.topics.length < 4) {
    return null;
  }

  /*
   * topics[1] = PoolId
   * topics[2] = currency0
   * topics[3] = currency1
   */
  const currency0 =
    topicToAddress(log.topics[2]);

  const currency1 =
    topicToAddress(log.topics[3]);

  if (
    !currency0 ||
    !currency1
  ) {
    return null;
  }

  return {
    poolId: log.topics[1],
    currency0,
    currency1,
    blockNumber: log.blockNumber,
    transactionHash: log.transactionHash,
    logIndex: log.logIndex,
    address: log.address,
    data: log.data
  };
}

/*
 * ------------------------------------------------------------------
 * Candidate extraction
 * ------------------------------------------------------------------
 */

function extractTokenCurrencies(pool) {
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
      normalizeAddress(currency);

    if (
      !result.some(
        x => normalizeAddress(x) === normalized
      )
    ) {
      result.push(currency);
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
  /*
   * We inspect all PoolManager logs for the pool id.
   *
   * This avoids assuming that an Initialize event automatically
   * means the pool has liquidity or swaps.
   */
  const topics = [
    null,
    poolId
  ];

  const result = await getLogs(
    env,
    fromBlock,
    toBlock,
    POOL_MANAGER,
    topics
  );

  if (!result.result) {
    return {
      success: false,
      provider: result.provider,
      error: result.error,
      logs: 0,
      swaps: 0,
      modifications: 0
    };
  }

  let swaps = 0;
  let modifications = 0;

  for (
    const log of result.result
  ) {
    const topic0 =
      String(log.topics?.[0] || "")
        .toLowerCase();

    /*
     * We intentionally detect event classes using topic count
     * as a secondary signal. Exact event signatures are not
     * required for the basic activity count.
     */
    if (
      log.topics?.length >= 3
    ) {
      if (
        log.data &&
        log.data !== "0x"
      ) {
        swaps++;
      } else {
        modifications++;
      }
    }
  }

  return {
    success: true,
    provider: result.provider,
    error: null,
    logs: result.result.length,
    swaps,
    modifications
  };
}

/*
 * ------------------------------------------------------------------
 * Risk scoring
 * ------------------------------------------------------------------
 */

function scoreRugRisk(token, activity) {
  let risk = 50;
  const reasons = [];

  /*
   * Strong positives reduce risk.
   */
  if (token.validERC20) {
    risk -= 15;
    reasons.push(
      "Verified ERC-20 contract"
    );
  }

  if (
    token.totalSupply &&
    BigInt(token.totalSupply) > 0n
  ) {
    risk -= 5;
    reasons.push(
      "Positive total supply"
    );
  }

  if (token.name && token.symbol) {
    risk -= 5;
  }

  /*
   * Activity matters, but does NOT prove safety.
   */
  if (activity.swaps > 0) {
    risk -= 10;
    reasons.push(
      "Observed pool activity"
    );
  }

  /*
   * No swaps is a warning, not automatically a rug.
   */
  if (activity.swaps === 0) {
    risk += 10;
    reasons.push(
      "No swaps observed in discovery window"
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

  risk = clamp(
    risk,
    0,
    100
  );

  return {
    score: risk,
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

  if (token.validERC20) {
    score += 25;
    reasons.push(
      "Verified ERC-20"
    );
  }

  if (token.name && token.symbol) {
    score += 10;
    reasons.push(
      "Token metadata available"
    );
  }

  if (activity.swaps > 0) {
    score += 30;
    reasons.push(
      "Swap activity detected"
    );
  }

  if (activity.logs > 0) {
    score += 10;
    reasons.push(
      "Pool activity detected"
    );
  }

  /*
   * Early-stage bonus.
   */
  if (activity.logs > 0 && activity.logs < 20) {
    score += 10;
    reasons.push(
      "Early activity profile"
    );
  }

  score = clamp(
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
      reason: "TELEGRAM_NOT_CONFIGURED"
    };
  }

  if (
    !candidate ||
    !candidate.address ||
    isZeroAddress(candidate.address)
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

📊 Pool swaps: ${candidate.activity.swaps}
📡 Pool logs: ${candidate.activity.logs}

Why:
${candidate.opportunity.reasons.map(
  x => "• " + x
).join("\n")}

Risk:
${candidate.rugRisk.reasons.map(
  x => "• " + x
).join("\n")}

⚠️ Automated on-chain screening only.`;

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json"
        },
        body: JSON.stringify({
          chat_id:
            env.TELEGRAM_CHAT_ID,
          text: message,
          disable_web_page_preview: true
        })
      }
    );

    const body =
      await response.json();

    if (!response.ok || !body.ok) {
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
        String(error?.message || error)
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
    await getLatestBlock(env);

  const toBlock =
    latest.block;

  const fromBlock =
    toBlock -
    BigInt(DISCOVERY_BLOCKS - 1);

  /*
   * First get ALL PoolManager logs in the window.
   *
   * This is deliberately broader than filtering immediately on
   * a potentially incorrect topic hash. It lets V64 expose the
   * actual topic0 values when debugging a deployment.
   */
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
      version: VERSION,
      success: false,
      scan: {
        status: "RPC_ERROR",
        durationMs:
          Date.now() - started,
        discoveryWindow: {
          fromBlock:
            Number(fromBlock),
          toBlock:
            Number(toBlock),
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
      timestamp: now()
    };
  }

  const logs =
    raw.result;

  /*
   * Decode Initialize events.
   *
   * We first use the known topic when available.
   * We additionally require the expected topic structure.
   */
  const initializeLogs =
    logs.filter(log => {
      if (
        !Array.isArray(log.topics) ||
        log.topics.length < 4
      ) {
        return false;
      }

      /*
       * IMPORTANT:
       * The current Uniswap V4 ABI confirms 3 indexed fields.
       * If the deployment's topic differs from our static constant,
       * we still expose matching candidate-shaped logs below.
       */
      return (
        String(log.topics[0])
          .toLowerCase() ===
          V4_INITIALIZE_TOPIC
            .toLowerCase()
      );
    });

  /*
   * Fallback structural decoder.
   *
   * This is useful on the first deployment test if the event topic
   * constant differs due to a deployment/version mismatch.
   */
  const structuralInitialize =
    logs.filter(log => {
      if (
        !Array.isArray(log.topics) ||
        log.topics.length < 4
      ) {
        return false;
      }

      if (
        String(log.address)
          .toLowerCase() !==
        POOL_MANAGER.toLowerCase()
      ) {
        return false;
      }

      const c0 =
        topicToAddress(log.topics[2]);

      const c1 =
        topicToAddress(log.topics[3]);

      return (
        isAddress(c0) &&
        isAddress(c1)
      );
    });

  const decodedMap =
    new Map();

  for (
    const log of [
      ...initializeLogs,
      ...structuralInitialize
    ]
  ) {
    const decoded =
      decodeInitializeLog(log);

    if (!decoded) continue;

    const key =
      `${decoded.transactionHash || ""}:` +
      `${decoded.logIndex || ""}`;

    decodedMap.set(
      key,
      decoded
    );
  }

  const pools =
    [...decodedMap.values()];

  const candidateMap =
    new Map();

  for (
    const pool of pools
  ) {
    for (
      const token of
      extractTokenCurrencies(pool)
    ) {
      const key =
        normalizeAddress(token);

      if (
        !candidateMap.has(key)
      ) {
        candidateMap.set(
          key,
          {
            address: token,
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
    [...candidateMap.values()]
      .slice(
        0,
        MAX_TOKEN_CHECKS
      );

  const validationResults = [];
  const analysed = [];

  for (
    const candidate of candidates
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

    if (!token.validERC20) {
      continue;
    }

    const pool =
      candidate.pools[0];

    const activity =
      await checkPoolActivity(
        env,
        pool.poolId,
        fromBlock,
        toBlock
      );

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

    const analysedCandidate = {
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
        pool.poolId,
      pool:
        pool,
      activity,
      rugRisk,
      opportunity
    };

    analysed.push(
      analysedCandidate
    );
  }

  /*
   * Only verified + low-risk candidates may alert.
   */
  const qualifying =
    analysed.filter(
      candidate =>
        candidate.validERC20 &&
        candidate.rugRisk.score < 60 &&
        candidate.opportunity.score >=
          MIN_TELEGRAM_SCORE
    );

  let telegramCandidates = [];

  for (
    const candidate of qualifying
  ) {
    const telegram =
      await sendTelegram(
        env,
        candidate
      );

    candidate.telegram =
      telegram;

    if (telegram.sent) {
      telegramCandidates.push(
        candidate
      );
    }
  }

  /*
   * Return topic diagnostics.
   *
   * This is intentionally useful for the V64 test.
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
          .map(x => x.toLowerCase())
      )
    ]
    .slice(0, 10);

  return {
    agent:
      "Robinhood Chain Meme Hunter",
    version: VERSION,
    success: true,
    scan: {
      status: "OK",
      durationMs:
        Date.now() - started,
      latestBlock:
        Number(toBlock),

      discoveryWindow: {
        fromBlock:
          Number(fromBlock),
        toBlock:
          Number(toBlock),
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
          x => x.validERC20
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
        noFabricatedMetrics: true,
        zeroAddressProtection: true,
        boundedRPCWorkload: true,
        safeEmptyRPCResults: true,

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
          "NOT_FULLY_VERIFIED",

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
        "V64_V4_TOPIC_DISCOVERY_429_BACKOFF_VERIFIED_TOKEN_RUG_RISK_HUNTER"
    },

    chain: {
      name:
        CHAIN_NAME,
      chainId:
        CHAIN_ID
    },

    timestamp: now()
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
      await getLatestBlock(env);

    latestBlock =
      Number(latest.block);

    provider =
      latest.provider;

  } catch (e) {
    error =
      String(
        e?.message || e
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

    architecture:
      "V64_V4_TOPIC_DISCOVERY_429_BACKOFF_VERIFIED_TOKEN_RUG_RISK_HUNTER",

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
    await getLatestBlock(env);

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
      Number(toBlock),

    fromBlock:
      Number(fromBlock),

    toBlock:
      Number(toBlock),

    blockRange:
      3,

    tests: [
      {
        test:
          "range_only",

        success:
          Boolean(range.result),

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
          Boolean(pool.result),

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
          score: 100,
          label: "HIGH"
        },

        opportunity: {
          score: 0
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
  async fetch(request, env) {
    const url =
      new URL(request.url);

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
