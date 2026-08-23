const VERSION = "V44";

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
const MAX_TOKEN_CHECKS = 8;
const MAX_MARKET_LOOKUPS = 8;
const MIN_SCORE = 60;


/* =========================================================
   JSON
========================================================= */

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json;charset=UTF-8",
        "cache-control": "no-store"
      }
    }
  );
}


/* =========================================================
   HELPERS
========================================================= */

function hex(n) {
  return "0x" + Number(n).toString(16);
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
  return [...new Set(values.filter(Boolean))];
}

function isZeroAddress(value) {
  const a = normaliseAddress(value);

  return (
    !a ||
    a === "0x0000000000000000000000000000000000000000"
  );
}

function isSuspiciousAddress(value) {
  const a = normaliseAddress(value);

  if (!a || isZeroAddress(a)) {
    return true;
  }

  const clean = a.slice(2);

  const leadingZeros =
    clean.match(/^0+/)?.[0]?.length || 0;

  if (leadingZeros >= 24) {
    return true;
  }

  const ffCount =
    (clean.match(/f/gi) || []).length;

  if (ffCount >= 34) {
    return true;
  }

  return false;
}

function money(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "UNVERIFIED";
  }

  if (n >= 1_000_000_000) {
    return "$" + (n / 1_000_000_000).toFixed(2) + "B";
  }

  if (n >= 1_000_000) {
    return "$" + (n / 1_000_000).toFixed(2) + "M";
  }

  if (n >= 1_000) {
    return "$" + (n / 1_000).toFixed(1) + "K";
  }

  return "$" + n.toFixed(2);
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}


/* =========================================================
   ALCHEMY
========================================================= */

async function rpc(env, method, params) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY_NOT_CONFIGURED");
  }

  const url =
    ALCHEMY_BASE +
    env.ALCHEMY_API_KEY;

  const response = await fetch(
    url,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "accept": "application/json"
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params
      })
    }
  );

  const text = await response.text();

  let body;

  try {
    body = JSON.parse(text);
  } catch {
    throw new Error("ALCHEMY_INVALID_JSON");
  }

  if (!response.ok) {
    throw new Error(
      body?.error?.message ||
      `ALCHEMY_HTTP_${response.status}`
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
    await rpc(env, "eth_blockNumber", []);

  return parseInt(result, 16);
}

async function getLogs(
  env,
  address,
  fromBlock,
  toBlock,
  topics = undefined
) {
  if (
    toBlock -
    fromBlock +
    1 >
    MAX_LOG_RANGE
  ) {
    throw new Error(
      "ALCHEMY_LOG_RANGE_TOO_LARGE"
    );
  }

  const filter = {
    address,
    fromBlock: hex(fromBlock),
    toBlock: hex(toBlock)
  };

  if (topics) {
    filter.topics = topics;
  }

  return rpc(
    env,
    "eth_getLogs",
    [filter]
  );
}

async function ethCall(env, to, data) {
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


/* =========================================================
   ERC20 DECODING
========================================================= */

const SELECTOR_NAME =
  "0x06fdde03";

const SELECTOR_SYMBOL =
  "0x95d89b41";

const SELECTOR_DECIMALS =
  "0x313ce567";

const SELECTOR_TOTAL_SUPPLY =
  "0x18160ddd";

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

  const clean = value.slice(2);

  try {
    if (clean.length < 128) {
      return null;
    }

    const length =
      parseInt(
        clean.slice(64, 128),
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
        128 + length * 2
      );

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
        result += String.fromCharCode(code);
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

  const clean = value.slice(2);

  if (clean.length < 64) {
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
      result += String.fromCharCode(code);
    }
  }

  return result || null;
}

async function validateToken(env, token) {
  if (isSuspiciousAddress(token)) {
    return {
      valid: false,
      reason: "SUSPICIOUS_ADDRESS"
    };
  }

  let name = null;
  let symbol = null;
  let decimals = null;
  let totalSupply = null;

  try {
    const value =
      await ethCall(
        env,
        token,
        SELECTOR_NAME
      );

    name =
      decodeString(value) ||
      decodeBytes32String(value);
  } catch {}

  try {
    const value =
      await ethCall(
        env,
        token,
        SELECTOR_SYMBOL
      );

    symbol =
      decodeString(value) ||
      decodeBytes32String(value);
  } catch {}

  try {
    const value =
      await ethCall(
        env,
        token,
        SELECTOR_DECIMALS
      );

    decimals =
      decodeUint256(value);
  } catch {}

  try {
    const value =
      await ethCall(
        env,
        token,
        SELECTOR_TOTAL_SUPPLY
      );

    totalSupply =
      decodeUint256(value);
  } catch {}

  const hasDecimals =
    decimals !== null &&
    decimals >= 0n &&
    decimals <= 255n;

  const hasSupply =
    totalSupply !== null &&
    totalSupply > 0n;

  const hasMetadata =
    Boolean(name || symbol);

  if (
    !hasDecimals &&
    !hasSupply &&
    !hasMetadata
  ) {
    return {
      valid: false,
      reason: "NO_ERC20_SIGNATURE"
    };
  }

  return {
    valid: true,
    token,
    name: name || null,
    symbol: symbol || null,
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
        hasDecimals || hasSupply,
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
    !/^0x[0-9a-fA-F]{64}$/.test(topic)
  ) {
    return null;
  }

  const candidate =
    normaliseAddress(
      "0x" +
      topic.slice(-40)
    );

  if (isSuspiciousAddress(candidate)) {
    return null;
  }

  return candidate;
}

function decodeLogCandidates(log) {
  const candidates = [];

  /*
   * Indexed event parameters are the safest
   * place to look for addresses.
   */
  for (
    const topic of
    Array.isArray(log?.topics)
      ? log.topics
      : []
  ) {
    const address =
      topicToAddress(topic);

    if (address) {
      candidates.push({
        token: address,
        source: "indexed_topic"
      });
    }
  }

  /*
   * Deliberately do NOT turn every 32-byte data
   * word into an address.
   *
   * This is the V43 false-positive fix.
   */

  return candidates;
}


/* =========================================================
   DISCOVERY
========================================================= */

async function scanContract(
  env,
  contract,
  fromBlock,
  toBlock
) {
  try {
    const logs =
      await getLogs(
        env,
        contract,
        fromBlock,
        toBlock
      );

    const safeLogs =
      Array.isArray(logs)
        ? logs
        : [];

    const candidates = [];

    for (
      const log of safeLogs
    ) {
      const decoded =
        decodeLogCandidates(log);

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
          token: item.token,
          source: item.source,
          blockNumber:
            log.blockNumber || null,
          transactionHash:
            log.transactionHash || null,
          logAddress:
            log.address || null,
          topic0:
            log.topics?.[0] || null
        });
      }
    }

    return {
      success: true,
      contract,
      rawLogs: safeLogs.length,
      decodedLogCandidates:
        candidates.length,
      candidates
    };

  } catch (error) {
    return {
      success: false,
      contract,
      rawLogs: 0,
      decodedLogCandidates: 0,
      candidates: [],
      error:
        error?.message ||
        "GET_LOGS_FAILED"
    };
  }
}

async function discover(env, latest) {
  const fromBlock =
    Math.max(0, latest - 9);

  const toBlock = latest;

  const results = [];

  for (
    const contract of
    DISCOVERY_CONTRACTS
  ) {
    results.push(
      await scanContract(
        env,
        contract,
        fromBlock,
        toBlock
      )
    );
  }

  const map = new Map();

  for (
    const result of results
  ) {
    for (
      const item of result.candidates
    ) {
      if (!map.has(item.token)) {
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
    tokens: [...map.values()]
  };
}


/* =========================================================
   DEXSCREENER MARKET DISCOVERY
========================================================= */

async function dexTokenLookup(
  token,
  diagnostics
) {
  const url =
    `${DEX_BASE}/latest/dex/tokens/${token}`;

  try {
    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {
      diagnostics.push({
        source: "dexscreener",
        token,
        error:
          `HTTP_${response.status}`
      });

      return {
        status: "NOT_INDEXED",
        token,
        pairs: []
      };
    }

    const body =
      await response.json();

    const pairs =
      Array.isArray(body?.pairs)
        ? body.pairs
        : [];

    if (!pairs.length) {
      return {
        status: "NOT_INDEXED",
        token,
        pairs: []
      };
    }

    return {
      status: "INDEXED",
      token,
      pairs
    };

  } catch (error) {
    diagnostics.push({
      source: "dexscreener",
      token,
      error:
        error?.message ||
        "DEX_LOOKUP_FAILED"
    });

    return {
      status: "ERROR",
      token,
      pairs: []
    };
  }
}

function selectBestRobinhoodPair(
  marketResult
) {
  const pairs =
    Array.isArray(
      marketResult?.pairs
    )
      ? marketResult.pairs
      : [];

  if (!pairs.length) {
    return null;
  }

  const robinhood =
    pairs.filter(
      pair =>
        String(
          pair?.chainId || ""
        ).toLowerCase() ===
        "robinhood"
    );

  const pool =
    robinhood.length
      ? robinhood
      : [];

  pool.sort(
    (a, b) =>
      safeNumber(
        b?.liquidity?.usd
      ) -
      safeNumber(
        a?.liquidity?.usd
      )
  );

  return pool[0] || null;
}

function normaliseMarket(pair) {
  if (!pair) {
    return null;
  }

  const buys =
    safeNumber(
      pair?.txns?.h24?.buys
    );

  const sells =
    safeNumber(
      pair?.txns?.h24?.sells
    );

  return {
    verifiedRobinhood:
      String(
        pair?.chainId || ""
      ).toLowerCase() ===
      "robinhood",

    dexId:
      pair?.dexId || null,

    pairAddress:
      pair?.pairAddress || null,

    url:
      pair?.url || null,

    name:
      pair?.baseToken?.name || null,

    symbol:
      pair?.baseToken?.symbol || null,

    priceUsd:
      safeNumber(
        pair?.priceUsd
      ),

    marketCap:
      safeNumber(
        pair?.marketCap
      ),

    fdv:
      safeNumber(
        pair?.fdv
      ),

    liquidity:
      safeNumber(
        pair?.liquidity?.usd
      ),

    volume24h:
      safeNumber(
        pair?.volume?.h24
      ),

    buys,
    sells,

    buySellRatio:
      sells > 0
        ? buys / sells
        : buys > 0
          ? 999
          : 0,

    change5m:
      safeNumber(
        pair?.priceChange?.m5
      ),

    change1h:
      safeNumber(
        pair?.priceChange?.h1
      ),

    change6h:
      safeNumber(
        pair?.priceChange?.h6
      ),

    change24h:
      safeNumber(
        pair?.priceChange?.h24
      )
  };
}


/* =========================================================
   SCORING
========================================================= */

function scoreCandidate(
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
      "ERC-20 verified on-chain"
    );
  }

  if (
    token.validation?.metadata
  ) {
    score += 5;

    reasons.push(
      "Token metadata detected"
    );
  }

  if (
    market.verifiedRobinhood
  ) {
    score += 25;

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
      "24h buys exceed sells"
    );
  }

  if (
    market.buySellRatio >= 1.5
  ) {
    score += 5;

    reasons.push(
      "Strong buy/sell ratio"
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
    score: Math.min(100, score),
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
                false
            })
        }
      );

    const body =
      await response.json();

    if (
      !response.ok ||
      !body?.ok
    ) {
      return {
        sent: false,
        reason:
          body?.description ||
          `HTTP_${response.status}`
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

function buildTelegramMessage(candidate) {
  const m = candidate.market;

  return [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `🔥 ${m.symbol || candidate.symbol || "UNKNOWN"}`,
    m.name || candidate.name || "",
    "",
    `🎯 SCORE: ${candidate.score}/100`,
    "",
    "📍 CONTRACT",
    candidate.token,
    "",
    "📊 MARKET",
    `Market Cap: ${money(m.marketCap)}`,
    `Liquidity: ${money(m.liquidity)}`,
    `24h Volume: ${money(m.volume24h)}`,
    `Buys: ${m.buys}`,
    `Sells: ${m.sells}`,
    `Buy/Sell: ${m.buySellRatio.toFixed(2)}`,
    `1h: ${m.change1h}%`,
    `6h: ${m.change6h}%`,
    "",
    "🧠 SIGNALS",
    ...candidate.reasons.map(
      x => `• ${x}`
    ),
    "",
    "🔐 DATA INTEGRITY",
    "ERC-20: VERIFIED",
    "Robinhood market: VERIFIED",
    "Holder concentration: UNVERIFIED",
    "Smart money: UNVERIFIED",
    "Wallet activity: UNVERIFIED",
    "Accumulation/distribution: UNVERIFIED",
    "",
    "⚠️ High-risk automated research alert.",
    m.url || ""
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3900);
}


/* =========================================================
   MAIN SCAN
========================================================= */

async function runScan(env) {
  const diagnostics = [];

  let latestBlock;

  try {
    latestBlock =
      await getLatestBlock(env);
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
          "SCAN_FAILED"
      }
    };
  }

  const discovery =
    await discover(
      env,
      latestBlock
    );

  for (
    const result of
    discovery.results
  ) {
    if (!result.success) {
      diagnostics.push({
        method:
          "eth_getLogs",

        contract:
          result.contract,

        error:
          result.error
      });
    }
  }

  /*
   * Validate addresses first.
   */
  const checks =
    discovery.tokens.slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const validated = [];

  for (
    const item of checks
  ) {
    const result =
      await validateToken(
        env,
        item.token
      );

    if (result.valid) {
      validated.push({
        ...item,
        ...result
      });
    }
  }

  /*
   * Market discovery.
   */
  const marketResults = [];

  for (
    const token of
    validated.slice(
      0,
      MAX_MARKET_LOOKUPS
    )
  ) {
    const result =
      await dexTokenLookup(
        token.token,
        diagnostics
      );

    const pair =
      selectBestRobinhoodPair(
        result
      );

    marketResults.push({
      token,
      lookupStatus:
        result.status,
      pair: normaliseMarket(pair)
    });
  }

  /*
   * Build candidates only from a real
   * Robinhood market.
   */
  const candidates = [];

  for (
    const item of marketResults
  ) {
    if (!item.pair) {
      continue;
    }

    if (
      !item.pair.verifiedRobinhood
    ) {
      continue;
    }

    const scoring =
      scoreCandidate(
        item.token,
        item.pair
      );

    candidates.push({
      token:
        item.token.token,

      name:
        item.token.name,

      symbol:
        item.token.symbol,

      source:
        item.token.source,

      blockNumber:
        item.token.blockNumber,

      transactionHash:
        item.token.transactionHash,

      validation:
        item.token.validation,

      market:
        item.pair,

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

  /*
   * Telegram alert.
   */
  let telegram = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  const winner =
    candidates.find(
      candidate =>
        candidate.score >= MIN_SCORE
    );

  if (winner) {
    telegram =
      await sendTelegram(
        env,
        buildTelegramMessage(
          winner
        )
      );

    telegram.token =
      winner.token;

    telegram.score =
      winner.score;
  }

  /*
   * Market discovery diagnostics.
   */
  const marketDiagnostics =
    marketResults.map(
      item => ({
        token:
          item.token.token,

        symbol:
          item.token.symbol,

        lookupStatus:
          item.lookupStatus,

        robinhoodMarket:
          Boolean(
            item.pair?.verifiedRobinhood
          ),

        pairAddress:
          item.pair?.pairAddress ||
          null
      })
    );

  return {
    status: "OK",
    success: true,

    latestBlock,

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
        (sum, x) =>
          sum + x.rawLogs,
        0
      ),

    decodedLogCandidates:
      discovery.results.reduce(
        (sum, x) =>
          sum +
          x.decodedLogCandidates,
        0
      ),

    rawAddressesFound:
      discovery.tokens.length,

    tokenValidationChecks:
      checks.length,

    validERC20Tokens:
      validated.length,

    marketLookups:
      marketResults.length,

    robinhoodMarketsFound:
      marketResults.filter(
        x =>
          x.pair?.verifiedRobinhood
      ).length,

    marketDiagnostics,

    candidates,

    telegram,

    rpcProvider:
      "ALCHEMY",

    rpcArchitecture:
      "10_BLOCK_WINDOW",

    rpcBreakdown: {
      eth_blockNumber: 1,

      eth_getLogs:
        DISCOVERY_CONTRACTS.length,

      eth_call:
        checks.length * 4
    },

    discovery:
      "ALCHEMY_ON_CHAIN_FIRST_V44_MARKET_DISCOVERY",

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
   CLOUDFLARE WORKER
========================================================= */

export default {

  async fetch(request, env) {
    const url =
      new URL(request.url);

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

        tokenValidation:
          "ERC20_ON_CHAIN",

        marketDiscovery:
          "DEXSCREENER_ROBINHOOD_PAIRS",

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "V44_MARKET_DISCOVERY",

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
          await runScan(env);

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
     * ROOT
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
        "Robinhood Chain Meme Hunter V44"
    });
  },


  /*
   * OPTIONAL CLOUDFLARE CRON
   */
  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScan(env)
        .then(result => {
          console.log(
            JSON.stringify({
              event:
                "V44_SCHEDULED_SCAN",

              status:
                result.status,

              block:
                result.latestBlock,

              rawLogs:
                result.rawLogs,

              validERC20:
                result.validERC20Tokens,

              markets:
                result.robinhoodMarketsFound,

              candidates:
                result.candidates?.length ||
                0,

              telegram:
                result.telegram
            })
          );
        })
        .catch(error => {
          console.error(
            "V44 scheduled scan failed",
            error
          );
        })
    );
  }
};
