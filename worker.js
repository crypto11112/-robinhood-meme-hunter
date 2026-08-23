const VERSION = "V43";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const ALCHEMY_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const DEX_BASE =
  "https://api.dexscreener.com";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPADS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  POOL_MANAGER
];

const MAX_LOG_RANGE = 10;
const MIN_SCORE = 60;
const MAX_TOKEN_CHECKS = 8;


/* =========================================================
   RESPONSE
========================================================= */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type":
          "application/json;charset=UTF-8",

        "cache-control":
          "no-store"
      }
    }
  );
}


/* =========================================================
   HELPERS
========================================================= */

function hex(n) {
  return (
    "0x" +
    Number(n).toString(16)
  );
}

function normaliseAddress(value) {
  if (
    typeof value !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(value)
  ) {
    return null;
  }

  return value.toLowerCase();
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function isZeroAddress(value) {
  const a =
    normaliseAddress(value);

  return (
    !a ||
    a ===
      "0x0000000000000000000000000000000000000000"
  );
}

function isSuspiciousAddress(value) {
  const a =
    normaliseAddress(value);

  if (!a) {
    return true;
  }

  if (isZeroAddress(a)) {
    return true;
  }

  /*
   * Reject addresses produced from very small
   * integer values such as:
   *
   * 0x...0271
   * 0x...0bb8
   * 0x...2710
   */
  const clean =
    a.slice(2);

  const leadingZeros =
    clean.match(/^0+/)?.[0]?.length || 0;

  if (leadingZeros >= 24) {
    return true;
  }

  /*
   * Reject addresses dominated by ff.
   */
  const ffCount =
    (
      clean.match(/f/gi) || []
    ).length;

  if (ffCount >= 34) {
    return true;
  }

  return false;
}

function money(value) {
  const n =
    Number(value || 0);

  if (
    !Number.isFinite(n) ||
    n <= 0
  ) {
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


/* =========================================================
   ALCHEMY RPC
========================================================= */

async function rpc(
  env,
  method,
  params
) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY_NOT_CONFIGURED"
    );
  }

  const url =
    ALCHEMY_BASE +
    env.ALCHEMY_API_KEY;

  const res =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",

          "accept":
            "application/json"
        },

        body:
          JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params
          })
      }
    );

  const text =
    await res.text();

  let body;

  try {
    body =
      JSON.parse(text);
  } catch {
    throw new Error(
      "ALCHEMY_INVALID_JSON"
    );
  }

  if (!res.ok) {
    throw new Error(
      body?.error?.message ||
      `ALCHEMY_HTTP_${res.status}`
    );
  }

  if (body?.error) {
    throw new Error(
      body.error.message ||
      "ALCHEMY_RPC_ERROR"
    );
  }

  return body.result;
}


async function getLatestBlock(env) {
  const result =
    await rpc(
      env,
      "eth_blockNumber",
      []
    );

  return parseInt(
    result,
    16
  );
}


async function getLogs(
  env,
  contract,
  fromBlock,
  toBlock
) {
  const range =
    toBlock -
    fromBlock +
    1;

  if (
    range > MAX_LOG_RANGE
  ) {
    throw new Error(
      "ALCHEMY_LOG_RANGE_TOO_LARGE"
    );
  }

  return rpc(
    env,
    "eth_getLogs",
    [{
      address:
        contract,

      fromBlock:
        hex(fromBlock),

      toBlock:
        hex(toBlock)
    }]
  );
}


/* =========================================================
   ERC-20 VALIDATION
========================================================= */

/*
 * Standard ERC-20 selectors.
 *
 * These are deliberately used through eth_call.
 */

const SELECTOR_NAME =
  "0x06fdde03";

const SELECTOR_SYMBOL =
  "0x95d89b41";

const SELECTOR_DECIMALS =
  "0x313ce567";

const SELECTOR_TOTAL_SUPPLY =
  "0x18160ddd";


async function ethCall(
  env,
  to,
  data
) {
  return rpc(
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
}


function decodeUint256(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("0x")
  ) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}


function decodeString(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    value.slice(2);

  /*
   * Dynamic ABI string:
   *
   * offset
   * length
   * bytes
   */

  if (clean.length < 128) {
    return null;
  }

  try {
    const lengthHex =
      clean.slice(64, 128);

    const length =
      parseInt(
        lengthHex,
        16
      );

    if (
      !Number.isFinite(length) ||
      length <= 0 ||
      length > 100
    ) {
      return null;
    }

    const bytes =
      clean.slice(
        128,
        128 +
        length * 2
      );

    if (!bytes) {
      return null;
    }

    let result = "";

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
        code >= 32 &&
        code <= 126
      ) {
        result +=
          String.fromCharCode(
            code
          );
      }
    }

    return result || null;

  } catch {
    return null;
  }
}


function decodeBytes32String(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    value.slice(2);

  if (
    clean.length < 64
  ) {
    return null;
  }

  let result = "";

  for (
    let i = 0;
    i < 64;
    i += 2
  ) {
    const code =
      parseInt(
        clean.slice(i, i + 2),
        16
      );

    if (code === 0) {
      break;
    }

    if (
      code >= 32 &&
      code <= 126
    ) {
      result +=
        String.fromCharCode(
          code
        );
    }
  }

  return result || null;
}


async function validateToken(
  env,
  token
) {
  if (
    isSuspiciousAddress(token)
  ) {
    return {
      valid: false,
      reason:
        "SUSPICIOUS_ADDRESS"
    };
  }

  let name = null;
  let symbol = null;
  let decimals = null;
  let totalSupply = null;

  try {
    const result =
      await ethCall(
        env,
        token,
        SELECTOR_NAME
      );

    name =
      decodeString(result) ||
      decodeBytes32String(result);

  } catch {}

  try {
    const result =
      await ethCall(
        env,
        token,
        SELECTOR_SYMBOL
      );

    symbol =
      decodeString(result) ||
      decodeBytes32String(result);

  } catch {}

  try {
    const result =
      await ethCall(
        env,
        token,
        SELECTOR_DECIMALS
      );

    decimals =
      decodeUint256(result);

  } catch {}

  try {
    const result =
      await ethCall(
        env,
        token,
        SELECTOR_TOTAL_SUPPLY
      );

    totalSupply =
      decodeUint256(result);

  } catch {}

  /*
   * A genuine ERC-20 should normally expose
   * decimals and totalSupply.
   */
  const hasDecimals =
    decimals !== null &&
    decimals >= 0n &&
    decimals <= 255n;

  const hasSupply =
    totalSupply !== null &&
    totalSupply > 0n;

  const hasMetadata =
    Boolean(
      name ||
      symbol
    );

  if (
    !hasDecimals &&
    !hasSupply &&
    !hasMetadata
  ) {
    return {
      valid: false,
      reason:
        "NO_ERC20_SIGNATURE"
    };
  }

  return {
    valid: true,

    token,

    name:
      name || null,

    symbol:
      symbol || null,

    decimals:
      hasDecimals
        ? Number(decimals)
        : null,

    totalSupply:
      hasSupply
        ? totalSupply.toString()
        : null,

    validation: {
      erc20:
        hasDecimals ||
        hasSupply,

      metadata:
        hasMetadata
    }
  };
}


/* =========================================================
   LOG DECODING
========================================================= */

function topicToAddress(topic) {
  if (
    typeof topic !== "string" ||
    !topic.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    topic.slice(2);

  if (
    clean.length !== 64
  ) {
    return null;
  }

  if (
    !/^[0-9a-fA-F]{64}$/.test(clean)
  ) {
    return null;
  }

  const candidate =
    normaliseAddress(
      "0x" +
      clean.slice(-40)
    );

  if (
    isSuspiciousAddress(
      candidate
    )
  ) {
    return null;
  }

  return candidate;
}


function decodeLogCandidates(log) {
  const candidates = [];

  /*
   * Topics are more likely to contain indexed
   * addresses than arbitrary data words.
   */
  if (
    Array.isArray(log?.topics)
  ) {
    for (
      const topic of log.topics
    ) {
      const candidate =
        topicToAddress(
          topic
        );

      if (candidate) {
        candidates.push({
          token:
            candidate,

          source:
            "indexed_topic"
        });
      }
    }
  }

  /*
   * We DO NOT blindly treat every word in `data`
   * as an address anymore.
   *
   * Only addresses that survive structural checks
   * are considered.
   */

  return candidates;
}


/* =========================================================
   ON-CHAIN DISCOVERY
========================================================= */

async function scanContract(
  env,
  contract,
  fromBlock,
  toBlock
) {
  try {
    const result =
      await getLogs(
        env,
        contract,
        fromBlock,
        toBlock
      );

    const safeLogs =
      Array.isArray(result)
        ? result
        : [];

    const candidates = [];

    for (
      const log of safeLogs
    ) {
      const decoded =
        decodeLogCandidates(
          log
        );

      for (
        const item of decoded
      ) {
        if (
          DISCOVERY_CONTRACTS.includes(
            item.token
          )
        ) {
          continue;
        }

        candidates.push({
          token:
            item.token,

          source:
            item.source,

          blockNumber:
            log.blockNumber ||
            null,

          transactionHash:
            log.transactionHash ||
            null,

          topic0:
            log.topics?.[0] ||
            null
        });
      }
    }

    return {
      success: true,

      contract,

      rawLogs:
        safeLogs.length,

      decodedCandidates:
        candidates.length,

      candidates
    };

  } catch (error) {
    return {
      success: false,

      contract,

      rawLogs: 0,

      decodedCandidates: 0,

      candidates: [],

      error:
        error?.message ||
        "GET_LOGS_FAILED"
    };
  }
}


async function discover(
  env,
  latest
) {
  /*
   * Alchemy Free:
   * exactly 10 blocks.
   */
  const fromBlock =
    Math.max(
      0,
      latest - 9
    );

  const toBlock =
    latest;

  const results = [];

  for (
    const contract of
    DISCOVERY_CONTRACTS
  ) {
    const result =
      await scanContract(
        env,
        contract,
        fromBlock,
        toBlock
      );

    results.push(
      result
    );
  }

  const map =
    new Map();

  for (
    const result of
    results
  ) {
    for (
      const item of
      result.candidates
    ) {
      if (
        !map.has(
          item.token
        )
      ) {
        map.set(
          item.token,
          item
        );
      }
    }
  }

  return {
    fromBlock,

    toBlock,

    results,

    tokens:
      [...map.values()]
  };
}


/* =========================================================
   DEXSCREENER
========================================================= */

async function getMarketData(
  token,
  diagnostics
) {
  try {
    const url =
      `${DEX_BASE}/latest/dex/tokens/${token}`;

    const res =
      await fetch(
        url,
        {
          headers: {
            "accept":
              "application/json"
          }
        }
      );

    if (!res.ok) {
      diagnostics.push({
        source:
          "dexscreener",

        token,

        error:
          `HTTP_${res.status}`
      });

      return null;
    }

    const body =
      await res.json();

    const pairs =
      Array.isArray(
        body?.pairs
      )
        ? body.pairs
        : [];

    if (
      pairs.length === 0
    ) {
      return null;
    }

    const robinhoodPairs =
      pairs.filter(
        pair =>
          String(
            pair?.chainId ||
            ""
          ).toLowerCase() ===
          "robinhood"
      );

    const selected =
      robinhoodPairs.length
        ? robinhoodPairs
        : pairs;

    selected.sort(
      (a, b) =>
        Number(
          b?.liquidity?.usd ||
          0
        ) -
        Number(
          a?.liquidity?.usd ||
          0
        )
    );

    const pair =
      selected[0];

    return {
      verifiedRobinhood:
        String(
          pair?.chainId ||
          ""
        ).toLowerCase() ===
        "robinhood",

      name:
        pair?.baseToken?.name ||
        null,

      symbol:
        pair?.baseToken?.symbol ||
        null,

      pairAddress:
        pair?.pairAddress ||
        null,

      url:
        pair?.url ||
        null,

      marketCap:
        Number(
          pair?.marketCap ||
          0
        ),

      liquidity:
        Number(
          pair?.liquidity?.usd ||
          0
        ),

      volume24h:
        Number(
          pair?.volume?.h24 ||
          0
        ),

      buys:
        Number(
          pair?.txns?.h24?.buys ||
          0
        ),

      sells:
        Number(
          pair?.txns?.h24?.sells ||
          0
        ),

      change5m:
        Number(
          pair?.priceChange?.m5 ||
          0
        ),

      change1h:
        Number(
          pair?.priceChange?.h1 ||
          0
        ),

      change6h:
        Number(
          pair?.priceChange?.h6 ||
          0
        ),

      change24h:
        Number(
          pair?.priceChange?.h24 ||
          0
        )
    };

  } catch (error) {
    diagnostics.push({
      source:
        "dexscreener",

      token,

      error:
        error?.message ||
        "DEX_LOOKUP_FAILED"
    });

    return null;
  }
}


/* =========================================================
   SCORING
========================================================= */

function calculateScore(
  token,
  market
) {
  let score = 0;

  const reasons = [];

  if (
    token.validation?.erc20
  ) {
    score += 15;

    reasons.push(
      "ERC-20 structure verified"
    );
  }

  if (
    token.validation?.metadata
  ) {
    score += 5;

    reasons.push(
      "Token metadata verified"
    );
  }

  if (
    market.verifiedRobinhood
  ) {
    score += 30;

    reasons.push(
      "Robinhood Chain market verified"
    );
  }

  if (
    market.liquidity >= 1000
  ) {
    score += 5;

    reasons.push(
      "Liquidity above $1K"
    );
  }

  if (
    market.liquidity >= 10000
  ) {
    score += 10;

    reasons.push(
      "Liquidity above $10K"
    );
  }

  if (
    market.volume24h >= 5000
  ) {
    score += 5;

    reasons.push(
      "24h volume above $5K"
    );
  }

  if (
    market.volume24h >= 25000
  ) {
    score += 5;

    reasons.push(
      "24h volume above $25K"
    );
  }

  if (
    market.buys >
    market.sells
  ) {
    score += 10;

    reasons.push(
      "Buys exceed sells"
    );
  }

  if (
    market.change1h > 0
  ) {
    score += 5;

    reasons.push(
      "Positive 1h momentum"
    );
  }

  if (
    market.change6h > 0
  ) {
    score += 5;

    reasons.push(
      "Positive 6h momentum"
    );
  }

  return {
    score:
      Math.min(
        100,
        score
      ),

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

  try {
    const url =
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

    const res =
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
                false
            })
          }
        );

    const body =
      await res.json();

    if (
      !res.ok ||
      !body?.ok
    ) {
      return {
        sent: false,

        reason:
          body?.description ||
          `HTTP_${res.status}`
      };
    }

    return {
      sent: true,

      messageId:
        body?.result?.message_id ||
        null
    };

  } catch (error) {
    return {
      sent: false,

      reason:
        error?.message ||
        "TELEGRAM_FAILED"
    };
  }
}


function buildTelegramMessage(
  candidate
) {
  const market =
    candidate.market;

  return [
    "🚨 ROBINHOOD CHAIN MEME CALL",
    "",
    `🔥 $${market.symbol || "UNKNOWN"}`,
    market.name || "",
    "",
    `🎯 SCORE: ${candidate.score}/100`,
    "",
    "📍 CONTRACT",
    candidate.token,
    "",
    "📊 MARKET",
    `Market Cap: ${money(market.marketCap)}`,
    `Liquidity: ${money(market.liquidity)}`,
    `24h Volume: ${money(market.volume24h)}`,
    `Buys: ${market.buys}`,
    `Sells: ${market.sells}`,
    `1h: ${market.change1h}%`,
    `6h: ${market.change6h}%`,
    "",
    "🧠 WHY",
    ...candidate.reasons.map(
      reason =>
        `• ${reason}`
    ),
    "",
    "🔐 VALIDATION",
    "ERC-20: VERIFIED",
    "Robinhood market: VERIFIED",
    "",
    "⚠️ UNVERIFIED",
    "Holder concentration",
    "Smart-money wallets",
    "Wallet activity",
    "Accumulation/distribution",
    "",
    "High-risk automated research alert.",
    market.url
      ? `📈 ${market.url}`
      : ""
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3900);
}


/* =========================================================
   SCAN
========================================================= */

async function runScan(env) {
  const diagnostics = [];

  let latest;

  try {
    latest =
      await getLatestBlock(
        env
      );
  } catch (error) {
    return {
      status:
        "ALCHEMY_CONNECTION_FAILED",

      success: false,

      diagnostics: [{
        method:
          "eth_blockNumber",

        error:
          error?.message ||
          "RPC_FAILED"
      }],

      telegram: {
        sent: false,

        reason:
          "SCAN_FAILED_BEFORE_TELEGRAM"
      }
    };
  }

  const discovery =
    await discover(
      env,
      latest
    );

  for (
    const item of
    discovery.results
  ) {
    if (!item.success) {
      diagnostics.push({
        method:
          "eth_getLogs",

        contract:
          item.contract,

        error:
          item.error
      });
    }
  }

  /*
   * First validate addresses on-chain.
   *
   * This is the major V43 change.
   */
  const tokenChecks =
    discovery.tokens.slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const validatedTokens = [];

  for (
    const item of
    tokenChecks
  ) {
    const validation =
      await validateToken(
        env,
        item.token
      );

    if (
      validation.valid
    ) {
      validatedTokens.push({
        ...item,
        ...validation
      });
    }
  }

  const candidates = [];

  /*
   * Only validated ERC-20 candidates
   * reach DexScreener.
   */
  for (
    const token of
    validatedTokens
  ) {
    const market =
      await getMarketData(
        token.token,
        diagnostics
      );

    if (!market) {
      continue;
    }

    const scoring =
      calculateScore(
        token,
        market
      );

    candidates.push({
      token:
        token.token,

      name:
        token.name,

      symbol:
        token.symbol,

      decimals:
        token.decimals,

      totalSupply:
        token.totalSupply,

      source:
        token.source,

      blockNumber:
        token.blockNumber,

      transactionHash:
        token.transactionHash,

      validation:
        token.validation,

      market,

      score:
        scoring.score,

      reasons:
        scoring.reasons
    });
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  let telegramResult = {
    sent: false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  /*
   * A Telegram call requires:
   *
   * 1. Valid ERC-20
   * 2. Verified Robinhood market
   * 3. Score >= 60
   */
  const winner =
    candidates.find(
      candidate =>
        candidate.score >=
          MIN_SCORE &&
        candidate.validation?.erc20 ===
          true &&
        candidate.market?.verifiedRobinhood ===
          true
    );

  if (winner) {
    telegramResult =
      await sendTelegram(
        env,
        buildTelegramMessage(
          winner
        )
      );

    telegramResult.token =
      winner.token;

    telegramResult.score =
      winner.score;
  }

  return {
    status:
      "OK",

    success:
      true,

    latestBlock:
      latest,

    startBlock:
      discovery.fromBlock,

    endBlock:
      discovery.toBlock,

    blocksScanned:
      discovery.toBlock -
      discovery.fromBlock +
      1,

    rawLogs:
      discovery.results.reduce(
        (sum, item) =>
          sum +
          item.rawLogs,
        0
      ),

    decodedLogCandidates:
      discovery.results.reduce(
        (sum, item) =>
          sum +
          item.decodedCandidates,
        0
      ),

    rawAddressesFound:
      discovery.tokens.length,

    tokenValidationChecks:
      tokenChecks.length,

    validERC20Tokens:
      validatedTokens.length,

    tokensInspected:
      validatedTokens.length,

    candidates,

    telegram:
      telegramResult,

    rpcProvider:
      "ALCHEMY",

    rpcArchitecture:
      "10_BLOCK_WINDOW",

    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs:
        DISCOVERY_CONTRACTS.length,

      eth_call:
        tokenChecks.length * 4
    },

    discovery:
      "ALCHEMY_ON_CHAIN_FIRST_V43_VALIDATED",

    diagnostics,

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    contracts: {
      entryContracts:
        ENTRY_CONTRACTS,

      launchpads:
        LAUNCHPADS,

      poolManager:
        POOL_MANAGER
    },

    telegramThreshold:
      MIN_SCORE,

    kvRequired:
      false,

    kvConfigured:
      false,

    dataIntegrity: {
      noFabricatedMetrics:
        true,

      holderConcentration:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      accumulationDistribution:
        "UNVERIFIED"
    },

    timestamp:
      new Date().toISOString()
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

    /*
     * HEALTH
     */
    if (
      url.pathname ===
      "/health"
    ) {
      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        status:
          "ONLINE",

        routes: [
          "/health",
          "/scan",
          "/test-telegram"
        ],

        chain: {
          name:
            CHAIN_NAME,

          chainId:
            CHAIN_ID,

          rpc:
            "ALCHEMY_ROBINHOOD_MAINNET"
        },

        discovery:
          "ALCHEMY_ON_CHAIN_FIRST",

        discoveryContracts:
          DISCOVERY_CONTRACTS,

        alchemyConfigured:
          Boolean(
            env.ALCHEMY_API_KEY
          ),

        telegram: {
          configured:
            Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),

          automaticCalls:
            true,

          minimumScore:
            MIN_SCORE
        },

        alchemyMaxLogRange:
          MAX_LOG_RANGE,

        marketData:
          "DEXSCREENER_OPTIONAL",

        tokenValidation:
          "ERC20_ON_CHAIN",

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "V43_VALIDATED_DISCOVERY",

        timestamp:
          new Date().toISOString()
      });
    }


    /*
     * SCAN
     */
    if (
      url.pathname ===
      "/scan"
    ) {
      try {
        const result =
          await runScan(
            env
          );

        return json({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            result.success,

          scan:
            result,

          timestamp:
            new Date().toISOString()
        });

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
              error?.message ||
              "SCAN_FAILED",

            timestamp:
              new Date().toISOString()
          },
          500
        );
      }
    }


    /*
     * TELEGRAM TEST
     */
    if (
      url.pathname ===
      "/test-telegram"
    ) {
      const result =
        await sendTelegram(
          env,

          [
            `✅ Robinhood Chain Meme Hunter ${VERSION}`,
            "",
            "Telegram connection test successful.",
            "",
            new Date().toISOString()
          ].join("\n")
        );

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          result.sent,

        response:
          result,

        timestamp:
          new Date().toISOString()
      });
    }


    /*
     * DEFAULT
     */
    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "ONLINE",

      routes: [
        "/health",
        "/scan",
        "/test-telegram"
      ],

      message:
        "Robinhood Chain Meme Hunter V43"
    });
  },


  /*
   * CLOUDFLARE CRON
   */
  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScan(env)
        .then(
          result =>
            console.log(
              JSON.stringify({
                event:
                  "V43_SCHEDULED_SCAN",

                status:
                  result.status,

                rawLogs:
                  result.rawLogs,

                rawAddresses:
                  result.rawAddressesFound,

                validERC20:
                  result.validERC20Tokens,

                candidates:
                  result.candidates?.length ||
                  0,

                telegram:
                  result.telegram
              })
            )
        )
        .catch(
          error =>
            console.error(
              "V43 scheduled scan failed",
              error
            )
        )
    );
  }
};
