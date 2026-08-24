/**
 * Robinhood Chain Meme Hunter
 * V63
 *
 * Chain:
 *   Robinhood Chain
 *   Chain ID: 4663
 *
 * Architecture:
 *   Robinhood Public RPC primary
 *   Alchemy fallback
 *   V4 Initialize discovery
 *   Verified ERC20 detection
 *   Rug-risk heuristics
 *   Opportunity scoring
 *   Telegram safety gate
 *
 * Routes:
 *   /health
 *   /rpc-test
 *   /scan
 *   /test-telegram
 *
 * Required Worker secrets:
 *   ALCHEMY_RPC_URL
 *   TELEGRAM_BOT_TOKEN
 *   TELEGRAM_CHAT_ID
 */

const VERSION = "V63";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_RPC =
  "https://rpc-mainnet.g.alchemy.com/v2/";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

/*
 * Uniswap V4 IPoolManager.Initialize
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
 */
const V4_INITIALIZE_TOPIC =
  "0xdd466e674ea557f56295e2d0218a125ea4b4f0f6f3307b95f85e6110838d6438";

const ERC20_TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a6e9d2c2d1";

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const DEAD_ADDRESS =
  "0x000000000000000000000000000000000000dead";

const DISCOVERY_BLOCKS = 10;
const MAX_TOKEN_CHECKS = 5;

const RPC_TIMEOUT_MS = 2500;

const TELEGRAM_MINIMUM_SCORE = 60;

const MAX_UINT256 =
  (1n << 256n) - 1n;


/* =========================================================
   BASIC RESPONSE HELPERS
   ========================================================= */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}


function now() {
  return new Date().toISOString();
}


function normalizeAddress(value) {
  if (!value) return null;

  const clean =
    String(value)
      .toLowerCase()
      .replace(/^0x/, "");

  if (!/^[0-9a-f]{40}$/.test(clean)) {
    return null;
  }

  return "0x" + clean;
}


function topicAddress(value) {
  if (!value) return null;

  const clean =
    String(value)
      .toLowerCase()
      .replace(/^0x/, "");

  if (clean.length !== 64) {
    return null;
  }

  return normalizeAddress(
    clean.slice(24)
  );
}


function isZeroAddress(address) {
  return (
    normalizeAddress(address) === ZERO_ADDRESS
  );
}


function isDeadAddress(address) {
  return (
    normalizeAddress(address) === DEAD_ADDRESS
  );
}


function isValidTokenAddress(address) {
  const normalized =
    normalizeAddress(address);

  if (!normalized) return false;

  if (normalized === ZERO_ADDRESS) {
    return false;
  }

  if (normalized === DEAD_ADDRESS) {
    return false;
  }

  return true;
}


/* =========================================================
   HEX / INTEGER HELPERS
   ========================================================= */

function cleanHex(value) {
  if (!value) return null;

  const valueString = String(value);

  if (!valueString.startsWith("0x")) {
    return null;
  }

  return valueString.slice(2);
}


function wordsFromData(data) {
  const clean = cleanHex(data);

  if (clean === null) {
    return [];
  }

  if (clean.length === 0) {
    return [];
  }

  if (clean.length % 64 !== 0) {
    return [];
  }

  const words = [];

  for (
    let offset = 0;
    offset < clean.length;
    offset += 64
  ) {
    words.push(
      clean.slice(offset, offset + 64)
    );
  }

  return words;
}


function uint256FromWord(word) {
  if (
    !word ||
    typeof word !== "string" ||
    word.length !== 64
  ) {
    return null;
  }

  try {
    return BigInt("0x" + word);
  } catch {
    return null;
  }
}


function signedInt24FromWord(word) {
  const value =
    uint256FromWord(word);

  if (value === null) {
    return null;
  }

  let result =
    Number(
      value &
      ((1n << 24n) - 1n)
    );

  if (result >= 8388608) {
    result -= 16777216;
  }

  return result;
}


function uintToSafeNumber(value) {
  if (value === null) {
    return null;
  }

  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    return null;
  }

  return Number(value);
}


/* =========================================================
   RPC
   ========================================================= */

function getRpcUrls(env) {
  const urls = [];

  urls.push(PUBLIC_RPC);

  if (
    env &&
    env.ALCHEMY_RPC_URL &&
    String(env.ALCHEMY_RPC_URL).trim()
  ) {
    urls.push(
      String(env.ALCHEMY_RPC_URL).trim()
    );
  }

  return [
    ...new Set(urls)
  ];
}


async function rpcRequest(
  url,
  method,
  params,
  timeoutMs = RPC_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      timeoutMs
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
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params
          }),
          signal:
            controller.signal
        }
      );

    const text =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP ${response.status}`
      );
    }

    let parsed;

    try {
      parsed =
        JSON.parse(text);
    } catch {
      throw new Error(
        "INVALID_JSON_RPC_RESPONSE"
      );
    }

    if (parsed.error) {
      throw new Error(
        parsed.error.message ||
        `RPC_ERROR_${parsed.error.code || "UNKNOWN"}`
      );
    }

    return parsed.result;

  } finally {
    clearTimeout(timeout);
  }
}


function providerName(url, env) {
  if (
    env &&
    env.ALCHEMY_RPC_URL &&
    url === env.ALCHEMY_RPC_URL
  ) {
    return "ALCHEMY";
  }

  return "ROBINHOOD_PUBLIC_RPC";
}


async function rpcWithFallback(
  env,
  method,
  params
) {
  const urls =
    getRpcUrls(env);

  const errors = [];

  for (const url of urls) {
    try {
      const result =
        await rpcRequest(
          url,
          method,
          params
        );

      return {
        success: true,
        result,
        provider:
          providerName(url, env),
        error: null
      };

    } catch (error) {
      errors.push({
        provider:
          providerName(url, env),
        error:
          error instanceof Error
            ? error.message
            : String(error)
      });
    }
  }

  return {
    success: false,
    result: null,
    provider: null,
    error:
      errors
        .map(
          item =>
            `${item.provider}: ${item.error}`
        )
        .join(" | ")
  };
}


/* =========================================================
   BLOCK NUMBER
   ========================================================= */

async function getLatestBlock(env) {
  const rpc =
    await rpcWithFallback(
      env,
      "eth_blockNumber",
      []
    );

  if (!rpc.success) {
    throw new Error(
      rpc.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  const value =
    uint256FromWord(
      String(rpc.result)
        .replace(/^0x/, "")
        .padStart(64, "0")
    );

  if (value === null) {
    throw new Error(
      "INVALID_BLOCK_NUMBER"
    );
  }

  return {
    blockNumber:
      Number(value),
    provider:
      rpc.provider
  };
}


/* =========================================================
   LOG QUERY
   ========================================================= */

async function getLogs(
  env,
  filter
) {
  return rpcWithFallback(
    env,
    "eth_getLogs",
    [filter]
  );
}


function hexBlock(number) {
  return (
    "0x" +
    Number(number).toString(16)
  );
}


/* =========================================================
   V4 INITIALIZE DECODER
   ========================================================= */

function decodeV4InitializeLog(log) {
  if (
    !log ||
    !Array.isArray(log.topics)
  ) {
    return null;
  }

  if (log.topics.length < 4) {
    return null;
  }

  const topic0 =
    String(log.topics[0])
      .toLowerCase();

  if (
    topic0 !==
    V4_INITIALIZE_TOPIC
  ) {
    return null;
  }

  /*
   * Indexed:
   *
   * topics[1] = pool id
   * topics[2] = currency0
   * topics[3] = currency1
   */

  const poolId =
    String(log.topics[1])
      .toLowerCase();

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

  /*
   * Non-indexed data:
   *
   * fee
   * tickSpacing
   * hooks
   * sqrtPriceX96
   * tick
   */

  const words =
    wordsFromData(
      log.data
    );

  if (words.length < 5) {
    return null;
  }

  const feeRaw =
    uint256FromWord(
      words[0]
    );

  const tickSpacing =
    signedInt24FromWord(
      words[1]
    );

  const hooks =
    topicAddress(
      words[2]
    );

  const sqrtPriceX96 =
    uint256FromWord(
      words[3]
    );

  const tick =
    signedInt24FromWord(
      words[4]
    );

  if (
    feeRaw === null ||
    tickSpacing === null ||
    !hooks ||
    sqrtPriceX96 === null ||
    tick === null
  ) {
    return null;
  }

  const fee =
    uintToSafeNumber(
      feeRaw
    );

  if (fee === null) {
    return null;
  }

  const currencies = [
    currency0,
    currency1
  ];

  const tokenAddresses =
    currencies.filter(
      address =>
        isValidTokenAddress(address)
    );

  /*
   * A V4 pool can contain native currency.
   *
   * We keep the pool event but only pass
   * actual non-zero addresses into ERC20
   * verification.
   */

  if (
    tokenAddresses.length === 0
  ) {
    return null;
  }

  return {
    poolId,
    currency0,
    currency1,
    tokenAddresses,
    fee,
    tickSpacing,
    hooks,
    sqrtPriceX96:
      sqrtPriceX96.toString(),
    tick,
    blockNumber:
      log.blockNumber || null,
    transactionHash:
      log.transactionHash || null,
    logIndex:
      log.logIndex ?? null
  };
}


/* =========================================================
   V4 DISCOVERY
   ========================================================= */

async function discoverV4InitializeEvents(
  env,
  fromBlock,
  toBlock
) {
  const result =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,
        fromBlock:
          hexBlock(fromBlock),
        toBlock:
          hexBlock(toBlock),
        topics: [
          V4_INITIALIZE_TOPIC
        ]
      }
    );

  if (!result.success) {
    return {
      success: false,
      rawLogs: 0,
      initializeEvents: 0,
      events: [],
      provider:
        result.provider,
      error:
        result.error
    };
  }

  const logs =
    Array.isArray(result.result)
      ? result.result
      : [];

  const events = [];

  for (const log of logs) {
    const decoded =
      decodeV4InitializeLog(log);

    if (decoded) {
      events.push(decoded);
    }
  }

  return {
    success: true,
    rawLogs:
      logs.length,
    initializeEvents:
      events.length,
    events,
    provider:
      result.provider,
    error: null
  };
}


/* =========================================================
   TOKEN CANDIDATES
   ========================================================= */

function extractTokenCandidates(
  initializeEvents
) {
  const candidates = [];
  const seen = new Set();

  for (
    const event of initializeEvents
  ) {
    for (
      const address of
      event.tokenAddresses
    ) {
      const normalized =
        normalizeAddress(
          address
        );

      if (
        !isValidTokenAddress(
          normalized
        )
      ) {
        continue;
      }

      if (
        seen.has(normalized)
      ) {
        continue;
      }

      seen.add(normalized);

      candidates.push({
        address:
          normalized,
        poolId:
          event.poolId,
        currency0:
          event.currency0,
        currency1:
          event.currency1,
        fee:
          event.fee,
        tickSpacing:
          event.tickSpacing,
        hooks:
          event.hooks,
        sqrtPriceX96:
          event.sqrtPriceX96,
        tick:
          event.tick,
        blockNumber:
          event.blockNumber,
        transactionHash:
          event.transactionHash,
        logIndex:
          event.logIndex
      });
    }
  }

  return candidates;
}


/* =========================================================
   ERC20 CALL ENCODING
   ========================================================= */

const SELECTORS = {
  name:
    "0x06fdde03",

  symbol:
    "0x95d89b41",

  decimals:
    "0x313ce567",

  totalSupply:
    "0x18160ddd",

  balanceOf:
    "0x70a08231"
};


function encodeAddressArgument(
  address
) {
  const normalized =
    normalizeAddress(
      address
    );

  if (!normalized) {
    return null;
  }

  return (
    normalized.slice(2)
      .padStart(64, "0")
  );
}


function decodeDynamicString(
  result
) {
  if (
    !result ||
    typeof result !== "string" ||
    !result.startsWith("0x")
  ) {
    return null;
  }

  const hex =
    result.slice(2);

  if (hex.length < 128) {
    return null;
  }

  /*
   * Standard ABI dynamic string:
   *
   * offset
   * length
   * bytes
   */

  try {
    const offset =
      Number(
        BigInt(
          "0x" +
          hex.slice(0, 64)
        )
      );

    const lengthPosition =
      offset * 2;

    if (
      lengthPosition + 64 >
      hex.length
    ) {
      return null;
    }

    const length =
      Number(
        BigInt(
          "0x" +
          hex.slice(
            lengthPosition,
            lengthPosition + 64
          )
        )
      );

    const start =
      lengthPosition + 64;

    const end =
      start + length * 2;

    if (
      end > hex.length
    ) {
      return null;
    }

    const bytes =
      hex.slice(
        start,
        end
      );

    let output = "";

    for (
      let i = 0;
      i < bytes.length;
      i += 2
    ) {
      const code =
        parseInt(
          bytes.slice(i, i + 2),
          16
        );

      if (
        code === 0
      ) {
        continue;
      }

      output +=
        String.fromCharCode(
          code
        );
    }

    return output
      .replace(/\0/g, "")
      .trim()
      .slice(0, 100);

  } catch {
    return null;
  }
}


function decodeUint256(
  result
) {
  if (
    !result ||
    typeof result !== "string" ||
    !result.startsWith("0x")
  ) {
    return null;
  }

  try {
    return BigInt(result);
  } catch {
    return null;
  }
}


/* =========================================================
   ERC20 CONTRACT CALL
   ========================================================= */

async function ethCall(
  env,
  to,
  data
) {
  const result =
    await rpcWithFallback(
      env,
      "eth_call",
      [
        {
          to,
          data
        },
        "latest"
      ]
    );

  return result;
}


async function verifyERC20(
  env,
  address
) {
  if (
    !isValidTokenAddress(
      address
    )
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "INVALID_OR_ZERO_ADDRESS"
    };
  }

  /*
   * First verify bytecode.
   */

  const codeResult =
    await rpcWithFallback(
      env,
      "eth_getCode",
      [
        address,
        "latest"
      ]
    );

  if (
    !codeResult.success
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "BYTECODE_CHECK_FAILED",
      provider:
        codeResult.provider
    };
  }

  const bytecode =
    String(
      codeResult.result || ""
    );

  if (
    bytecode === "0x" ||
    bytecode === "0x0" ||
    bytecode.length < 4
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "NO_CONTRACT_BYTECODE"
    };
  }

  /*
   * Verify core ERC20 methods.
   *
   * We require totalSupply + decimals.
   * name/symbol are helpful but not mandatory.
   */

  const totalSupply =
    await ethCall(
      env,
      address,
      SELECTORS.totalSupply
    );

  if (
    !totalSupply.success ||
    !totalSupply.result
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "TOTAL_SUPPLY_CALL_FAILED"
    };
  }

  const totalSupplyValue =
    decodeUint256(
      totalSupply.result
    );

  if (
    totalSupplyValue === null
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "TOTAL_SUPPLY_DECODE_FAILED"
    };
  }

  const decimals =
    await ethCall(
      env,
      address,
      SELECTORS.decimals
    );

  if (
    !decimals.success ||
    !decimals.result
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "DECIMALS_CALL_FAILED"
    };
  }

  const decimalsValue =
    decodeUint256(
      decimals.result
    );

  if (
    decimalsValue === null ||
    decimalsValue > 255n
  ) {
    return {
      address,
      validERC20: false,
      reason:
        "DECIMALS_DECODE_FAILED"
    };
  }

  /*
   * Optional metadata.
   */

  let name = null;
  let symbol = null;

  const nameResult =
    await ethCall(
      env,
      address,
      SELECTORS.name
    );

  if (
    nameResult.success
  ) {
    name =
      decodeDynamicString(
        nameResult.result
      );
  }

  const symbolResult =
    await ethCall(
      env,
      address,
      SELECTORS.symbol
    );

  if (
    symbolResult.success
  ) {
    symbol =
      decodeDynamicString(
        symbolResult.result
      );
  }

  return {
    address,
    validERC20: true,
    name,
    symbol,
    decimals:
      Number(decimalsValue),
    totalSupply:
      totalSupplyValue.toString(),
    bytecodeVerified: true,
    erc20MethodsVerified: true,
    provider:
      codeResult.provider
  };
}


/* =========================================================
   TRANSFER ACTIVITY
   ========================================================= */

async function getRecentTransferActivity(
  env,
  tokenAddress,
  fromBlock,
  toBlock
) {
  if (
    !isValidTokenAddress(
      tokenAddress
    )
  ) {
    return {
      checked: false,
      transferLogs: 0,
      uniqueSenders: 0,
      uniqueReceivers: 0,
      error:
        "INVALID_TOKEN_ADDRESS"
    };
  }

  const result =
    await getLogs(
      env,
      {
        address:
          tokenAddress,
        fromBlock:
          hexBlock(fromBlock),
        toBlock:
          hexBlock(toBlock),
        topics: [
          ERC20_TRANSFER_TOPIC
        ]
      }
    );

  if (
    !result.success
  ) {
    return {
      checked: false,
      transferLogs: 0,
      uniqueSenders: 0,
      uniqueReceivers: 0,
      provider:
        result.provider,
      error:
        result.error
    };
  }

  const logs =
    Array.isArray(result.result)
      ? result.result
      : [];

  const senders =
    new Set();

  const receivers =
    new Set();

  for (const log of logs) {
    if (
      !Array.isArray(log.topics) ||
      log.topics.length < 3
    ) {
      continue;
    }

    const from =
      topicAddress(
        log.topics[1]
      );

    const to =
      topicAddress(
        log.topics[2]
      );

    if (
      from &&
      !isZeroAddress(from)
    ) {
      senders.add(from);
    }

    if (
      to &&
      !isZeroAddress(to)
    ) {
      receivers.add(to);
    }
  }

  return {
    checked: true,
    transferLogs:
      logs.length,
    uniqueSenders:
      senders.size,
    uniqueReceivers:
      receivers.size,
    provider:
      result.provider,
    error: null
  };
}


/* =========================================================
   RUG RISK
   ========================================================= */

function calculateRugRisk(
  token,
  activity
) {
  let risk = 0;

  const flags = [];

  /*
   * These are deliberately conservative.
   * This is NOT a guarantee that a token
   * cannot rug.
   */

  if (
    !token.validERC20
  ) {
    risk += 100;

    flags.push(
      "ERC20_NOT_VERIFIED"
    );
  }

  if (
    !token.bytecodeVerified
  ) {
    risk += 40;

    flags.push(
      "BYTECODE_NOT_VERIFIED"
    );
  }

  if (
    !token.erc20MethodsVerified
  ) {
    risk += 40;

    flags.push(
      "ERC20_METHODS_NOT_VERIFIED"
    );
  }

  if (
    activity &&
    activity.checked &&
    activity.transferLogs === 0
  ) {
    risk += 10;

    flags.push(
      "NO_RECENT_TRANSFER_ACTIVITY"
    );
  }

  /*
   * Keep score bounded.
   */

  risk =
    Math.min(
      100,
      Math.max(0, risk)
    );

  let level =
    "LOW";

  if (risk >= 70) {
    level = "HIGH";
  } else if (risk >= 35) {
    level = "MEDIUM";
  }

  return {
    score: risk,
    level,
    flags
  };
}


/* =========================================================
   OPPORTUNITY SCORE
   ========================================================= */

function calculateOpportunityScore(
  token,
  activity,
  rugRisk
) {
  let score = 0;

  const reasons = [];

  /*
   * Verified token.
   */

  if (
    token.validERC20
  ) {
    score += 25;

    reasons.push(
      "VERIFIED_ERC20"
    );
  }

  /*
   * Recent transfer activity.
   */

  if (
    activity &&
    activity.checked
  ) {
    if (
      activity.transferLogs >= 50
    ) {
      score += 25;

      reasons.push(
        "STRONG_RECENT_TRANSFER_ACTIVITY"
      );

    } else if (
      activity.transferLogs >= 10
    ) {
      score += 15;

      reasons.push(
        "RECENT_TRANSFER_ACTIVITY"
      );

    } else if (
      activity.transferLogs > 0
    ) {
      score += 5;

      reasons.push(
        "SOME_TRANSFER_ACTIVITY"
      );
    }
  }

  /*
   * Multiple participants.
   */

  if (
    activity &&
    activity.uniqueReceivers >= 20
  ) {
    score += 20;

    reasons.push(
      "MANY_UNIQUE_RECEIVERS"
    );

  } else if (
    activity &&
    activity.uniqueReceivers >= 5
  ) {
    score += 10;

    reasons.push(
      "MULTIPLE_UNIQUE_RECEIVERS"
    );
  }

  /*
   * Penalise risk.
   */

  score -=
    Math.floor(
      rugRisk.score * 0.5
    );

  score =
    Math.min(
      100,
      Math.max(0, score)
    );

  return {
    score,
    reasons
  };
}


/* =========================================================
   TELEGRAM
   ========================================================= */

async function sendTelegram(
  env,
  message
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

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

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
          body: JSON.stringify({
            chat_id:
              env.TELEGRAM_CHAT_ID,
            text: message,
            disable_web_page_preview:
              true
          })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.ok
    ) {
      return {
        sent: false,
        reason:
          data.description ||
          `TELEGRAM_HTTP_${response.status}`
      };
    }

    return {
      sent: true,
      reason: null
    };

  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error
          ? error.message
          : String(error)
    };
  }
}


function formatTelegramCandidate(
  candidate
) {
  const token =
    candidate.token;

  const risk =
    candidate.rugRisk;

  const opportunity =
    candidate.opportunity;

  return [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `Token: ${token.name || "Unknown"}`,
    `Symbol: ${token.symbol || "Unknown"}`,
    `Contract: ${token.address}`,
    "",
    `Opportunity Score: ${opportunity.score}/100`,
    `Rug Risk: ${risk.score}/100 (${risk.level})`,
    "",
    "Risk flags:",
    ...(risk.flags.length
      ? risk.flags.map(
          flag => `• ${flag}`
        )
      : ["• None detected"]),
    "",
    "Opportunity signals:",
    ...(opportunity.reasons.length
      ? opportunity.reasons.map(
          reason => `• ${reason}`
        )
      : ["• None"]),
    "",
    `Chain: ${CHAIN_NAME}`,
    `Chain ID: ${CHAIN_ID}`,
    "",
    "⚠️ Automated on-chain screening only. Not a guarantee against a rug pull."
  ].join("\n");
}


/* =========================================================
   HEALTH
   ========================================================= */

async function health(env) {
  let latestBlock = null;
  let rpcProvider = null;
  let rpcStatus = "DISCONNECTED";
  let error = null;

  try {
    const block =
      await getLatestBlock(
        env
      );

    latestBlock =
      block.blockNumber;

    rpcProvider =
      block.provider;

    rpcStatus =
      "CONNECTED";

  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : String(e);
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      rpcStatus === "CONNECTED"
        ? "ONLINE"
        : "DEGRADED",

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
          env.ALCHEMY_RPC_URL
        ),
      blockscoutConfigured:
        false
    },

    rpcStatus,
    latestBlock,
    rpcProvider,
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
        TELEGRAM_MINIMUM_SCORE,
      tokenVerification:
        "REQUIRED",
      zeroAddressProtection:
        true,
      highRiskBlock:
        true
    },

    architecture:
      "V63_DIRECT_V4_INITIALIZE_DISCOVERY_VERIFIED_TOKEN_RUG_RISK_HUNTER",

    timestamp:
      now()
  };
}


/* =========================================================
   RPC TEST
   ========================================================= */

async function rpcTest(env) {
  const latest =
    await getLatestBlock(
      env
    );

  const latestBlock =
    latest.blockNumber;

  const fromBlock =
    Math.max(
      0,
      latestBlock - 2
    );

  const tests = [];

  /*
   * Test 1:
   * General log query.
   */

  const range =
    await getLogs(
      env,
      {
        fromBlock:
          hexBlock(fromBlock),
        toBlock:
          hexBlock(latestBlock)
      }
    );

  tests.push({
    test:
      "range_only",
    success:
      range.success,
    provider:
      range.provider,
    logs:
      range.success &&
      Array.isArray(range.result)
        ? range.result.length
        : 0,
    error:
      range.error
  });

  /*
   * Test 2:
   * Pool Manager.
   */

  const pool =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,
        fromBlock:
          hexBlock(fromBlock),
        toBlock:
          hexBlock(latestBlock)
      }
    );

  tests.push({
    test:
      "pool_manager",
    success:
      pool.success,
    provider:
      pool.provider,
    logs:
      pool.success &&
      Array.isArray(pool.result)
        ? pool.result.length
        : 0,
    error:
      pool.error
  });

  /*
   * Test 3:
   * Direct Initialize topic.
   */

  const initialize =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,
        fromBlock:
          hexBlock(fromBlock),
        toBlock:
          hexBlock(latestBlock),
        topics: [
          V4_INITIALIZE_TOPIC
        ]
      }
    );

  tests.push({
    test:
      "v4_initialize_topic",
    success:
      initialize.success,
    provider:
      initialize.provider,
    logs:
      initialize.success &&
      Array.isArray(
        initialize.result
      )
        ? initialize.result.length
        : 0,
    error:
      initialize.error
  });

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      tests.every(
        test => test.success
      ),

    rpcTest: true,

    chain: {
      name:
        CHAIN_NAME,
      chainId:
        CHAIN_ID
    },

    latestBlock,
    fromBlock,
    toBlock,
    blockRange:
      latestBlock - fromBlock + 1,

    tests,

    interpretation: {
      blockNumber:
        "eth_blockNumber",
      rangeOnly:
        "Tests eth_getLogs",
      poolManager:
        "Tests PoolManager filtering",
      v4Initialize:
        "Tests direct V4 Initialize topic filtering"
    },

    timestamp:
      now()
  };
}


/* =========================================================
   FULL SCAN
   ========================================================= */

async function scan(env) {
  const started =
    Date.now();

  const latest =
    await getLatestBlock(
      env
    );

  const latestBlock =
    latest.blockNumber;

  const fromBlock =
    Math.max(
      0,
      latestBlock -
        DISCOVERY_BLOCKS +
        1
    );

  const toBlock =
    latestBlock;

  /*
   * -------------------------------------------------------
   * V4 Initialize discovery
   * -------------------------------------------------------
   */

  const v4 =
    await discoverV4InitializeEvents(
      env,
      fromBlock,
      toBlock
    );

  if (!v4.success) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version:
        VERSION,

      scan: {
        status:
          "RPC_ERROR",

        durationMs:
          Date.now() - started,

        discoveryWindow: {
          fromBlock,
          toBlock,
          blocks:
            DISCOVERY_BLOCKS
        },

        v4: {
          poolManager:
            POOL_MANAGER,

          fromBlock,
          toBlock,

          rawLogs:
            0,

          initializeEvents:
            0,

          tokenCandidates:
            0,

          provider:
            v4.provider,

          rpcError:
            v4.error
        },

        candidates: [],

        qualifyingCandidates:
          0,

        telegramCandidates:
          0,

        telegram: {
          sent: false,
          reason:
            "V4_INITIALIZE_DISCOVERY_FAILED"
        }
      },

      timestamp:
        now()
    };
  }

  const tokenCandidates =
    extractTokenCandidates(
      v4.events
    );

  /*
   * Limit token verification workload.
   */

  const checks =
    tokenCandidates.slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const validationResults = [];

  const analysedCandidates = [];

  /*
   * Sequential processing intentionally keeps
   * RPC workload bounded.
   */

  for (
    const candidate of checks
  ) {
    const token =
      await verifyERC20(
        env,
        candidate.address
      );

    validationResults.push(
      token
    );

    if (
      !token.validERC20
    ) {
      continue;
    }

    /*
     * Recent activity:
     * use the same discovery window.
     */

    const activity =
      await getRecentTransferActivity(
        env,
        token.address,
        fromBlock,
        toBlock
      );

    const rugRisk =
      calculateRugRisk(
        token,
        activity
      );

    const opportunity =
      calculateOpportunityScore(
        token,
        activity,
        rugRisk
      );

    const analysed = {
      address:
        token.address,

      token,

      pool: {
        poolId:
          candidate.poolId,

        currency0:
          candidate.currency0,

        currency1:
          candidate.currency1,

        fee:
          candidate.fee,

        tickSpacing:
          candidate.tickSpacing,

        hooks:
          candidate.hooks,

        blockNumber:
          candidate.blockNumber,

        transactionHash:
          candidate.transactionHash
      },

      activity,

      rugRisk,

      opportunity
    };

    analysedCandidates.push(
      analysed
    );
  }

  /*
   * -------------------------------------------------------
   * Telegram gate
   * -------------------------------------------------------
   */

  const qualifyingCandidates =
    analysedCandidates.filter(
      candidate =>
        candidate.token.validERC20 &&
        candidate.rugRisk.level !== "HIGH" &&
        candidate.opportunity.score >=
          TELEGRAM_MINIMUM_SCORE
    );

  let telegramResult = {
    sent: false,
    reason:
      "NO_VERIFIED_LOW_RISK_QUALIFYING_CANDIDATE"
  };

  if (
    qualifyingCandidates.length > 0
  ) {
    const first =
      qualifyingCandidates[0];

    telegramResult =
      await sendTelegram(
        env,
        formatTelegramCandidate(
          first
        )
      );
  }

  /*
   * -------------------------------------------------------
   * Output
   * -------------------------------------------------------
   */

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    scan: {
      status:
        "OK",

      durationMs:
        Date.now() - started,

      latestBlock,

      discoveryWindow: {
        fromBlock,
        toBlock,
        blocks:
          DISCOVERY_BLOCKS
      },

      v4: {
        poolManager:
          POOL_MANAGER,

        fromBlock,
        toBlock,

        initializeTopic:
          V4_INITIALIZE_TOPIC,

        rawLogs:
          v4.rawLogs,

        initializeEvents:
          v4.initializeEvents,

        tokenCandidates:
          tokenCandidates.length,

        provider:
          v4.provider,

        rpcError:
          v4.error,

        events:
          v4.events.slice(0, 20)
      },

      uniqueTokenCandidates:
        tokenCandidates.length,

      tokenValidationChecks:
        checks.length,

      validERC20Tokens:
        validationResults.filter(
          result =>
            result.validERC20
        ).length,

      validationResults,

      candidates:
        analysedCandidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegramCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        zeroAddressProtection:
          true,

        boundedRPCWorkload:
          true,

        safeEmptyRPCResults:
          true,

        directV4InitializeFiltering:
          true,

        v4CurrencyDecoding:
          true,

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

        walletActivity:
          "ERC20_TRANSFER_LOG_BASED",

        liquidity:
          "NOT_VERIFIED",

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
        "V63_DIRECT_V4_INITIALIZE_DISCOVERY_VERIFIED_TOKEN_RUG_RISK_HUNTER",

      chain: {
        name:
          CHAIN_NAME,
        chainId:
          CHAIN_ID
      }
    },

    timestamp:
      now()
  };
}


/* =========================================================
   TELEGRAM SAFETY TEST
   ========================================================= */

async function telegramSafetyTest() {
  /*
   * Never send a real Telegram message during
   * the safety test.
   */

  const fakeToken =
    ZERO_ADDRESS;

  if (
    !isValidTokenAddress(
      fakeToken
    )
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success: true,

      safetyTest:
        "ZERO_ADDRESS_BLOCKED",

      response: {
        sent: false,
        reason:
          "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
      },

      timestamp:
        now()
    };
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success: false,

    safetyTest:
      "FAILED",

    response: {
      sent: false,
      reason:
        "ZERO_ADDRESS_WAS_NOT_BLOCKED"
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
        await telegramSafetyTest()
      );
    }

    return json(
      {
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        status:
          "ONLINE",

        error:
          "ROUTE_NOT_FOUND",

        routes: [
          "/health",
          "/rpc-test",
          "/scan",
          "/test-telegram"
        ],

        timestamp:
          now()
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
          error instanceof Error
            ? error.message
            : String(error),

        timestamp:
          now()
      },
      500
    );
  }
}


/* =========================================================
   CLOUDFLARE WORKER EXPORT
   ========================================================= */

export default {
  async fetch(
    request,
    env
  ) {
    return handleRequest(
      request,
      env
    );
  }
};
