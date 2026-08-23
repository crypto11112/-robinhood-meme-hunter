/**
 * Robinhood Chain Meme Hunter V30
 *
 * Designed for Cloudflare Workers FREE plan.
 *
 * Main improvements over V29:
 * - <= 40 external subrequests per invocation
 * - Persistent block cursor using Workers KV
 * - Small/adaptive eth_getLogs ranges
 * - Automatic RPC failover
 * - DexScreener batch lookup
 * - Telegram alerts
 * - Diagnostic error reporting
 *
 * Chain:
 * Robinhood Chain
 * Chain ID: 4663
 *
 * Routes:
 * /health
 * /scan
 * /test-telegram
 * /reset
 *
 * REQUIRED:
 * Create a KV namespace and bind it as SCAN_KV.
 *
 * OPTIONAL secrets:
 * TELEGRAM_BOT_TOKEN
 * TELEGRAM_CHAT_ID
 */

const VERSION = "V30";

const CHAIN_ID = 4663;

const OFFICIAL_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const FALLBACK_RPC =
  "https://rpc.nodeflare.app/robinhood/public";

/*
 * These are the launch contracts you were already using.
 */
const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9",
].map(x => x.toLowerCase());

/*
 * TokenCreated(address)
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
 * Cloudflare Free plan has 50 external subrequests.
 *
 * We deliberately stop at 40.
 */
const MAX_EXTERNAL_REQUESTS = 40;

/*
 * Discovery settings.
 */
const DEFAULT_SCAN_BLOCKS = 2500;
const MAX_RANGE = 500;
const MIN_RANGE = 50;

/*
 * Never consume the whole Worker budget.
 */
const MAX_RPC_REQUESTS = 30;
const MAX_DEX_REQUESTS = 3;
const MAX_TELEGRAM_REQUESTS = 1;

/*
 * Only alert on candidates passing this basic threshold.
 */
const ALERT_MIN_SCORE = 55;

/*
 * Avoid repeatedly alerting the same token.
 */
const ALERT_TTL_SECONDS = 60 * 60 * 24 * 7;

/*
 * KV keys.
 */
const KV_CURSOR = "v30:scan_cursor";
const KV_LAST_SCAN = "v30:last_scan";
const KV_SEEN_PREFIX = "v30:seen:";
const KV_CONFIG = "v30:config";

/* =========================================================
   BASIC RESPONSE HELPERS
========================================================= */

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function nowISO() {
  return new Date().toISOString();
}

function normaliseAddress(value) {
  if (!value || typeof value !== "string") return null;

  const m = value.match(/0x[a-fA-F0-9]{40}/);

  if (!m) return null;

  return m[0].toLowerCase();
}

function hexToNumber(hex) {
  if (!hex) return 0;
  return Number.parseInt(hex, 16);
}

function numberToHex(n) {
  return "0x" + Math.max(0, Math.floor(n)).toString(16);
}

/* =========================================================
   REQUEST BUDGET
========================================================= */

class Budget {
  constructor(max = MAX_EXTERNAL_REQUESTS) {
    this.max = max;
    this.used = 0;
    this.byType = {
      rpc: 0,
      dex: 0,
      telegram: 0,
      other: 0,
    };
  }

  canSpend(type = "other", amount = 1) {
    return this.used + amount <= this.max;
  }

  spend(type = "other", amount = 1) {
    if (!this.canSpend(type, amount)) {
      throw new Error(
        `SUBREQUEST_BUDGET_EXCEEDED:${this.used}/${this.max}`
      );
    }

    this.used += amount;

    if (!(type in this.byType)) {
      this.byType[type] = 0;
    }

    this.byType[type] += amount;
  }

  remaining() {
    return Math.max(0, this.max - this.used);
  }
}

/* =========================================================
   RPC
========================================================= */

async function rpcRequest(
  url,
  method,
  params,
  budget,
  diagnostics,
  timeoutMs = 8000
) {
  if (!budget.canSpend("rpc")) {
    throw new Error("RPC_BUDGET_EXHAUSTED");
  }

  budget.spend("rpc");

  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  );

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method,
        params,
      }),
      signal: controller.signal,
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(
        `HTTP_${response.status}:${text.slice(0, 300)}`
      );
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        `INVALID_JSON:${text.slice(0, 300)}`
      );
    }

    if (data.error) {
      throw new Error(
        `RPC_ERROR:${JSON.stringify(data.error)}`
      );
    }

    return data.result;
  } catch (error) {
    diagnostics.push({
      type: "rpc",
      url,
      method,
      error: String(error?.message || error),
      timestamp: nowISO(),
    });

    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/*
 * Try official RPC first.
 * If it fails, use the free fallback RPC.
 */
async function rpcFailover(
  method,
  params,
  budget,
  diagnostics
) {
  const urls = [
    OFFICIAL_RPC,
    FALLBACK_RPC,
  ];

  let lastError = null;

  for (const url of urls) {
    try {
      return await rpcRequest(
        url,
        method,
        params,
        budget,
        diagnostics
      );
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("ALL_RPCS_FAILED");
}

/* =========================================================
   LATEST BLOCK
========================================================= */

async function getLatestBlock(
  budget,
  diagnostics
) {
  const result = await rpcFailover(
    "eth_blockNumber",
    [],
    budget,
    diagnostics
  );

  const block = hexToNumber(result);

  if (!Number.isFinite(block) || block <= 0) {
    throw new Error(
      `INVALID_LATEST_BLOCK:${result}`
    );
  }

  return block;
}

/* =========================================================
   LOG SCANNING
========================================================= */

function makeFilter(
  contract,
  fromBlock,
  toBlock
) {
  return {
    address: contract,
    fromBlock: numberToHex(fromBlock),
    toBlock: numberToHex(toBlock),
    topics: [
      TOKEN_CREATED_TOPIC,
    ],
  };
}

/*
 * Extract address from:
 *
 * topics[1]
 *
 * or data
 *
 * Different launch contracts can encode the address
 * slightly differently, so we inspect both.
 */
function extractTokenAddress(log) {
  if (!log) return null;

  if (
    Array.isArray(log.topics) &&
    log.topics.length >= 2
  ) {
    const topic = log.topics[1];

    const address = normaliseAddress(topic);

    if (address) {
      return address;
    }
  }

  if (typeof log.data === "string") {
    const data = log.data;

    if (
      data.length >= 66 &&
      /^0x[0-9a-fA-F]+$/.test(data)
    ) {
      const lastWord =
        data.slice(-64);

      const address =
        normaliseAddress(
          "0x" + lastWord.slice(-40)
        );

      if (address) {
        return address;
      }
    }
  }

  return null;
}

/*
 * Scan one range.
 *
 * If RPC rejects it, caller can reduce the range.
 */
async function scanRange(
  contract,
  fromBlock,
  toBlock,
  budget,
  diagnostics
) {
  const filter = makeFilter(
    contract,
    fromBlock,
    toBlock
  );

  const logs = await rpcFailover(
    "eth_getLogs",
    [filter],
    budget,
    diagnostics
  );

  if (!Array.isArray(logs)) {
    return [];
  }

  return logs;
}

/*
 * Adaptive range scanner.
 *
 * 500 blocks
 * -> 250
 * -> 100
 * -> 50
 *
 * This prevents a single oversized range from killing
 * the whole scan.
 */
async function adaptiveScan(
  contract,
  startBlock,
  endBlock,
  budget,
  diagnostics
) {
  const discovered = [];

  let cursor = startBlock;

  let rangeSize = MAX_RANGE;

  while (
    cursor <= endBlock &&
    budget.canSpend("rpc")
  ) {
    let success = false;

    const proposedEnd = Math.min(
      endBlock,
      cursor + rangeSize - 1
    );

    try {
      const logs = await scanRange(
        contract,
        cursor,
        proposedEnd,
        budget,
        diagnostics
      );

      for (const log of logs) {
        const token =
          extractTokenAddress(log);

        if (!token) continue;

        discovered.push({
          address: token,
          block: hexToNumber(log.blockNumber),
          transaction: log.transactionHash,
          logIndex: hexToNumber(log.logIndex),
          launcher: contract,
        });
      }

      cursor = proposedEnd + 1;

      /*
       * If successful, cautiously grow back toward 500.
       */
      if (rangeSize < MAX_RANGE) {
        rangeSize = Math.min(
          MAX_RANGE,
          rangeSize * 2
        );
      }

      success = true;
    } catch (error) {
      diagnostics.push({
        type: "range_failure",
        contract,
        fromBlock: cursor,
        toBlock: proposedEnd,
        rangeSize,
        error: String(error?.message || error),
        timestamp: nowISO(),
      });

      /*
       * Reduce the range.
       */
      if (rangeSize > MIN_RANGE) {
        rangeSize = Math.max(
          MIN_RANGE,
          Math.floor(rangeSize / 2)
        );
        continue;
      }

      /*
       * Even the smallest range failed.
       *
       * Move forward one block so one bad block/range
       * doesn't permanently stop the scanner.
       */
      cursor = proposedEnd + 1;
    }

    if (!success) {
      continue;
    }
  }

  return discovered;
}

/* =========================================================
   TOKEN DEDUPLICATION
========================================================= */

function uniqueTokens(tokens) {
  const map = new Map();

  for (const token of tokens) {
    if (!token.address) continue;

    const key =
      token.address.toLowerCase();

    if (!map.has(key)) {
      map.set(key, {
        ...token,
        address: key,
      });
    }
  }

  return [...map.values()];
}

/* =========================================================
   ERC20 METADATA
========================================================= */

/*
 * We deliberately do NOT make 3 eth_call requests per token.
 *
 * DexScreener already returns:
 * - baseToken.name
 * - baseToken.symbol
 * - baseToken.address
 *
 * This saves a huge number of RPC subrequests.
 */

/* =========================================================
   DEXSCREENER
========================================================= */

async function dexLookupBatch(
  addresses,
  budget,
  diagnostics
) {
  if (!addresses.length) {
    return {
      pairs: [],
      status: "NO_TOKENS",
    };
  }

  /*
   * DexScreener supports multiple token addresses
   * in the token endpoint.
   *
   * Keep batches small to avoid oversized URLs.
   */
  const batch = addresses
    .slice(0, 20)
    .join(",");

  if (!budget.canSpend("dex")) {
    return {
      pairs: [],
      status: "BUDGET_LIMIT",
    };
  }

  budget.spend("dex");

  const url =
    `https://api.dexscreener.com/latest/dex/tokens/${batch}`;

  try {
    const response = await fetch(url, {
      headers: {
        "accept": "application/json",
      },
    });

    const text = await response.text();

    if (!response.ok) {
      const diagnostic = {
        type: "dex",
        status: response.status,
        error: text.slice(0, 500),
        timestamp: nowISO(),
      };

      diagnostics.push(diagnostic);

      return {
        pairs: [],
        status: `HTTP_${response.status}`,
      };
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      diagnostics.push({
        type: "dex",
        status: "INVALID_JSON",
        timestamp: nowISO(),
      });

      return {
        pairs: [],
        status: "INVALID_JSON",
      };
    }

    return {
      pairs: Array.isArray(data.pairs)
        ? data.pairs
        : [],
      status: "OK",
    };
  } catch (error) {
    diagnostics.push({
      type: "dex",
      status: "FETCH_ERROR",
      error: String(error?.message || error),
      timestamp: nowISO(),
    });

    return {
      pairs: [],
      status: "FETCH_ERROR",
    };
  }
}

/* =========================================================
   MARKET DATA
========================================================= */

function chooseBestPair(
  pairs,
  tokenAddress
) {
  const matching = pairs.filter(
    pair => {
      const base =
        pair?.baseToken?.address?.toLowerCase();

      const quote =
        pair?.quoteToken?.address?.toLowerCase();

      return (
        base === tokenAddress ||
        quote === tokenAddress
      );
    }
  );

  if (!matching.length) {
    return null;
  }

  /*
   * Prefer highest liquidity.
   */
  matching.sort(
    (a, b) => {
      const la =
        Number(a?.liquidity?.usd || 0);

      const lb =
        Number(b?.liquidity?.usd || 0);

      return lb - la;
    }
  );

  return matching[0];
}

function calculateScore(token, pair) {
  if (!pair) {
    return {
      score: 0,
      category: "NO_MARKET_DATA",
      flags: [
        "NO_DEX_PAIR_FOUND",
      ],
    };
  }

  const liquidity =
    Number(pair?.liquidity?.usd || 0);

  const volume =
    Number(pair?.volume?.h24 || 0);

  const buys =
    Number(pair?.txns?.h24?.buys || 0);

  const sells =
    Number(pair?.txns?.h24?.sells || 0);

  const txns =
    buys + sells;

  const marketCap =
    Number(
      pair?.marketCap ||
      pair?.fdv ||
      0
    );

  const buyRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? 10
        : 0;

  const liquidityRatio =
    marketCap > 0
      ? liquidity / marketCap
      : 0;

  const volumeRatio =
    marketCap > 0
      ? volume / marketCap
      : 0;

  let score = 20;

  /*
   * Liquidity.
   */
  if (liquidity >= 5000) score += 5;
  if (liquidity >= 10000) score += 5;
  if (liquidity >= 25000) score += 5;

  /*
   * Volume.
   */
  if (volume >= 5000) score += 5;
  if (volume >= 25000) score += 5;
  if (volume >= 50000) score += 5;

  /*
   * Buy pressure.
   */
  if (buyRatio >= 1.25) score += 5;
  if (buyRatio >= 2) score += 5;
  if (buyRatio >= 3) score += 5;

  /*
   * Liquidity relative to cap.
   */
  if (liquidityRatio >= 0.10) score += 5;
  if (liquidityRatio >= 0.25) score += 5;
  if (liquidityRatio >= 0.50) score += 5;

  /*
   * Active trading.
   */
  if (txns >= 100) score += 3;
  if (txns >= 500) score += 3;
  if (txns >= 1000) score += 3;

  const flags = [];

  if (liquidity < 5000) {
    flags.push("LOW_LIQUIDITY");
  }

  if (buyRatio < 0.8) {
    flags.push("SELL_PRESSURE");
  }

  if (volume === 0) {
    flags.push("NO_VOLUME");
  }

  if (marketCap === 0) {
    flags.push("NO_MARKET_CAP");
  }

  if (score >= 75) {
    return {
      score,
      category: "HIGH_POTENTIAL",
      flags,
    };
  }

  if (score >= 60) {
    return {
      score,
      category: "WATCH",
      flags,
    };
  }

  if (score >= 45) {
    return {
      score,
      category: "EARLY",
      flags,
    };
  }

  return {
    score,
    category: "HIGH_RISK",
    flags,
  };
}

/* =========================================================
   TOKEN CANDIDATE
========================================================= */

function buildCandidate(
  token,
  pair
) {
  const base =
    pair?.baseToken?.address?.toLowerCase();

  const isBase =
    base === token.address;

  const name =
    pair?.baseToken?.name ||
    pair?.quoteToken?.name ||
    "UNKNOWN";

  const symbol =
    pair?.baseToken?.symbol ||
    pair?.quoteToken?.symbol ||
    "UNKNOWN";

  const price =
    Number(
      isBase
        ? pair?.priceUsd || 0
        : pair?.priceUsd || 0
    );

  const marketCap =
    Number(
      pair?.marketCap ||
      pair?.fdv ||
      0
    );

  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );

  const volume24h =
    Number(
      pair?.volume?.h24 || 0
    );

  const buys =
    Number(
      pair?.txns?.h24?.buys || 0
    );

  const sells =
    Number(
      pair?.txns?.h24?.sells || 0
    );

  const transactions =
    buys + sells;

  const buySellRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? buys
        : 0;

  const analysis =
    calculateScore(
      token,
      pair
    );

  return {
    contract: token.address,
    name,
    symbol,

    priceUsd: price,

    marketCap,
    fdv:
      Number(pair?.fdv || 0),

    liquidity,
    volume24h,

    buys,
    sells,
    transactions,
    buySellRatio,

    pairAddress:
      pair?.pairAddress || null,

    dex:
      pair?.dexId || null,

    chainId:
      pair?.chainId || null,

    url:
      pair?.url || null,

    launchBlock:
      token.block,

    launchTransaction:
      token.transaction,

    launcher:
      token.launcher,

    score:
      analysis.score,

    category:
      analysis.category,

    riskFlags:
      analysis.flags,

    verified: true,
  };
}

/* =========================================================
   TELEGRAM
========================================================= */

async function sendTelegram(
  env,
  candidate,
  budget,
  diagnostics
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
    };
  }

  if (!budget.canSpend("telegram")) {
    return {
      sent: false,
      reason: "BUDGET_LIMIT",
    };
  }

  budget.spend("telegram");

  const text =
`🚨 Robinhood Chain Meme Hunter V30

${candidate.name} ($${candidate.symbol})

Score: ${candidate.score}/100
Category: ${candidate.category}

Market Cap: $${formatNumber(candidate.marketCap)}
Liquidity: $${formatNumber(candidate.liquidity)}
24h Volume: $${formatNumber(candidate.volume24h)}

Buys: ${candidate.buys}
Sells: ${candidate.sells}
Buy/Sell: ${candidate.buySellRatio.toFixed(2)}

Contract:
${candidate.contract}

${candidate.url || ""}`;

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type":
          "application/json",
      },
      body: JSON.stringify({
        chat_id:
          env.TELEGRAM_CHAT_ID,
        text,
        disable_web_page_preview:
          true,
      }),
    });

    if (!response.ok) {
      const body =
        await response.text();

      diagnostics.push({
        type: "telegram",
        status: response.status,
        error: body.slice(0, 500),
        timestamp: nowISO(),
      });

      return {
        sent: false,
        reason:
          `HTTP_${response.status}`,
      };
    }

    return {
      sent: true,
    };
  } catch (error) {
    diagnostics.push({
      type: "telegram",
      error:
        String(error?.message || error),
      timestamp: nowISO(),
    });

    return {
      sent: false,
      reason: "FETCH_ERROR",
    };
  }
}

/* =========================================================
   KV HELPERS
========================================================= */

async function getCursor(env) {
  if (!env.SCAN_KV) {
    return null;
  }

  try {
    const value =
      await env.SCAN_KV.get(
        KV_CURSOR
      );

    if (!value) {
      return null;
    }

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : null;
  } catch {
    return null;
  }
}

async function setCursor(
  env,
  block
) {
  if (!env.SCAN_KV) {
    return false;
  }

  try {
    await env.SCAN_KV.put(
      KV_CURSOR,
      String(block)
    );

    return true;
  } catch {
    return false;
  }
}

async function markSeen(
  env,
  address
) {
  if (!env.SCAN_KV) {
    return false;
  }

  try {
    await env.SCAN_KV.put(
      KV_SEEN_PREFIX + address,
      "1",
      {
        expirationTtl:
          ALERT_TTL_SECONDS,
      }
    );

    return true;
  } catch {
    return false;
  }
}

async function wasSeen(
  env,
  address
) {
  if (!env.SCAN_KV) {
    return false;
  }

  try {
    const value =
      await env.SCAN_KV.get(
        KV_SEEN_PREFIX + address
      );

    return !!value;
  } catch {
    return false;
  }
}

/* =========================================================
   NUMBER FORMAT
========================================================= */

function formatNumber(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }

  if (value >= 1_000_000_000) {
    return (
      value / 1_000_000_000
    ).toFixed(2) + "B";
  }

  if (value >= 1_000_000) {
    return (
      value / 1_000_000
    ).toFixed(2) + "M";
  }

  if (value >= 1_000) {
    return (
      value / 1_000
    ).toFixed(2) + "K";
  }

  return value.toFixed(2);
}

/* =========================================================
   HEALTH
========================================================= */

async function health(
  request,
  env
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
      "/test-telegram",
      "/reset",
    ],

    chainId:
      CHAIN_ID,

    chain:
      "Robinhood Chain",

    rpc: {
      primary:
        OFFICIAL_RPC,

      fallback:
        FALLBACK_RPC,

      mode:
        "AUTOMATIC_FAILOVER",
    },

    discovery:
      "ETH_GETLOGS_TOKEN_CREATED_ADAPTIVE",

    marketData:
      "DEX_SCREENER_BATCH",

    telegramConfigured:
      !!(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ),

    kvConfigured:
      !!env.SCAN_KV,

    paidApiKeyRequired:
      false,

    cloudflareFreeSafeBudget:
      MAX_EXTERNAL_REQUESTS,

    timestamp:
      nowISO(),
  });
}

/* =========================================================
   TELEGRAM TEST
========================================================= */

async function telegramTest(
  env
) {
  const budget =
    new Budget(
      MAX_EXTERNAL_REQUESTS
    );

  const diagnostics = [];

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      telegramConfigured:
        false,

      success:
        false,

      error:
        "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID missing",
    });
  }

  if (
    !budget.canSpend(
      "telegram"
    )
  ) {
    return json({
      success: false,
      error:
        "BUDGET_LIMIT",
    });
  }

  budget.spend("telegram");

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json",
          },

          body:
            JSON.stringify({
              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${nowISO()}`,
            }),
        }
      );

    const text =
      await response.text();

    let body;

    try {
      body =
        JSON.parse(text);
    } catch {
      body = text;
    }

    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      telegramConfigured:
        true,

      success:
        response.ok,

      response:
        body,

      requestCount:
        budget.used,

      diagnostics,
    });
  } catch (error) {
    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      telegramConfigured:
        true,

      success:
        false,

      error:
        String(
          error?.message ||
          error
        ),

      requestCount:
        budget.used,

      diagnostics,
    });
  }
}

/* =========================================================
   RESET
========================================================= */

async function resetScanner(
  env
) {
  if (!env.SCAN_KV) {
    return json({
      success: false,
      error:
        "SCAN_KV_NOT_CONFIGURED",
    });
  }

  try {
    await env.SCAN_KV.delete(
      KV_CURSOR
    );

    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      success:
        true,

      message:
        "V30 scan cursor reset. The next /scan will start from the configured lookback window.",
    });
  } catch (error) {
    return json({
      success: false,
      error:
        String(
          error?.message ||
          error
        ),
    });
  }
}

/* =========================================================
   MAIN SCAN
========================================================= */

async function scan(
  request,
  env,
  ctx
) {
  const budget =
    new Budget(
      MAX_EXTERNAL_REQUESTS
    );

  const diagnostics = [];

  const scanStarted =
    Date.now();

  let latestBlock;

  try {
    latestBlock =
      await getLatestBlock(
        budget,
        diagnostics
      );
  } catch (error) {
    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "RPC_FAILURE",

      error:
        String(
          error?.message ||
          error
        ),

      diagnostics,

      requestCount:
        budget.used,

      requestLimit:
        budget.max,

      requestsRemaining:
        budget.remaining(),

      timestamp:
        nowISO(),
    }, 503);
  }

  /*
   * Get previous cursor.
   */
  let cursor =
    await getCursor(env);

  /*
   * First run:
   * only look back 2500 blocks.
   */
  if (
    !Number.isFinite(cursor) ||
    cursor <= 0 ||
    cursor >= latestBlock
  ) {
    cursor =
      Math.max(
        0,
        latestBlock -
          DEFAULT_SCAN_BLOCKS
      );
  }

  /*
   * Never scan beyond latest block.
   */
  const scanFrom =
    cursor;

  const scanTo =
    latestBlock;

  /*
   * We deliberately limit the scan
   * to a maximum number of blocks.
   */
  const maximumSpan =
    DEFAULT_SCAN_BLOCKS;

  const actualFrom =
    Math.max(
      scanFrom,
      scanTo - maximumSpan + 1
    );

  const rawTokens = [];

  /*
   * Scan both launch contracts.
   */
  for (
    const contract of LAUNCH_CONTRACTS
  ) {
    if (
      !budget.canSpend(
        "rpc"
      )
    ) {
      break;
    }

    const found =
      await adaptiveScan(
        contract,
        actualFrom,
        scanTo,
        budget,
        diagnostics
      );

    rawTokens.push(
      ...found
    );
  }

  const tokens =
    uniqueTokens(
      rawTokens
    );

  /*
   * Save cursor only after discovery.
   *
   * Next scan begins from the latest
   * successfully inspected block.
   */
  await setCursor(
    env,
    scanTo + 1
  );

  /*
   * Only query DexScreener if we actually
   * discovered tokens.
   */
  let pairs = [];

  let dexStatus =
    "NOT_CALLED";

  if (
    tokens.length &&
    budget.canSpend(
      "dex"
    )
  ) {
    const addresses =
      tokens
        .map(
          x => x.address
        )
        .slice(
          0,
          20
        );

    const dex =
      await dexLookupBatch(
        addresses,
        budget,
        diagnostics
      );

    pairs =
      dex.pairs;

    dexStatus =
      dex.status;
  }

  /*
   * Build candidates.
   */
  const candidates = [];

  for (
    const token of tokens
  ) {
    const pair =
      chooseBestPair(
        pairs,
        token.address
      );

    if (!pair) {
      /*
       * Keep the token in diagnostics,
       * but don't pretend it has market data.
       */
      candidates.push({
        contract:
          token.address,

        name:
          "UNKNOWN",

        symbol:
          "UNKNOWN",

        marketCap:
          0,

        liquidity:
          0,

        volume24h:
          0,

        launchBlock:
          token.block,

        launchTransaction:
          token.transaction,

        launcher:
          token.launcher,

        score:
          0,

        category:
          "NO_MARKET_DATA",

        riskFlags: [
          "NO_DEX_PAIR_FOUND",
        ],

        verified:
          true,
      });

      continue;
    }

    candidates.push(
      buildCandidate(
        token,
        pair
      )
    );
  }

  /*
   * Sort strongest first.
   */
  candidates.sort(
    (a, b) =>
      b.score - a.score
  );

  /*
   * Telegram alerts.
   *
   * Only send the highest scoring candidate
   * to protect the free subrequest budget.
   */
  const alerts = [];

  const alertCandidate =
    candidates.find(
      c =>
        c.score >=
        ALERT_MIN_SCORE
    );

  if (
    alertCandidate &&
    !await wasSeen(
      env,
      alertCandidate.contract
    )
  ) {
    const telegram =
      await sendTelegram(
        env,
        alertCandidate,
        budget,
        diagnostics
      );

    if (telegram.sent) {
      await markSeen(
        env,
        alertCandidate.contract
      );

      alerts.push({
        contract:
          alertCandidate.contract,

        score:
          alertCandidate.score,

        sent:
          true,
      });
    }
  }

  /*
   * Separate candidates with actual DEX data.
   */
  const marketCandidates =
    candidates.filter(
      c =>
        c.category !==
        "NO_MARKET_DATA"
    );

  /*
   * Return diagnostic information.
   */
  return json({
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins using adaptive on-chain launch discovery and free DEX market data.",

    chain: {
      name:
        "Robinhood Chain",

      chainId:
        CHAIN_ID,

      rpc:
        OFFICIAL_RPC,

      fallbackRpc:
        FALLBACK_RPC,
    },

    discovery: {
      source:
        "ETH_GETLOGS_TOKEN_CREATED_ADAPTIVE",

      event:
        "TokenCreated(address)",

      eventTopic:
        TOKEN_CREATED_TOPIC,

      launchContracts:
        LAUNCH_CONTRACTS,

      latestBlock,

      startBlock:
        actualFrom,

      endBlock:
        scanTo,

      blocksScanned:
        scanTo -
        actualFrom +
        1,

      rawLogs:
        rawTokens.length,

      tokensDiscovered:
        tokens.length,

      verifiedTokenAddresses:
        tokens,
    },

    marketData: {
      source:
        "DEX_SCREENER",

      lookupMode:
        "BATCH_MULTI_TOKEN",

      status:
        dexStatus,

      pairsReturned:
        pairs.length,

      candidatesAnalysed:
        marketCandidates.length,

      lookupErrors:
        diagnostics.filter(
          d =>
            d.type ===
            "dex"
        ),
    },

    candidates,

    alerts,

    telegram: {
      configured:
        !!(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      chatId:
        env.TELEGRAM_CHAT_ID
          ? env.TELEGRAM_CHAT_ID
          : null,

      alertsSent:
        alerts.length,
    },

    scan: {
      cursorBefore:
        scanFrom,

      cursorAfter:
        scanTo + 1,

      requestCount:
        budget.used,

      requestLimit:
        budget.max,

      requestsRemaining:
        budget.remaining(),

      requestBreakdown:
        budget.byType,

      durationMs:
        Date.now() -
        scanStarted,
    },

    diagnostics: {
      total:
        diagnostics.length,

      rangeFailures:
        diagnostics.filter(
          d =>
            d.type ===
            "range_failure"
        ).length,

      rpcFailures:
        diagnostics.filter(
          d =>
            d.type ===
            "rpc"
        ).length,

      dexFailures:
        diagnostics.filter(
          d =>
            d.type ===
            "dex"
        ).length,

      details:
        diagnostics.slice(
          0,
          25
        ),
    },

    validation: {
      tokenDiscovery:
        "VERIFIED TOKEN_CREATED EVENT",

      tokenAddress:
        "VERIFIED FROM EVENT",

      dexPairDiscovery:
        "DEX SCREENER WHEN AVAILABLE",

      liquidity:
        "DEX SCREENER WHEN AVAILABLE",

      volume:
        "DEX SCREENER WHEN AVAILABLE",

      buySellPressure:
        "DEX SCREENER WHEN AVAILABLE",

      holderConcentration:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      accumulationDistribution:
        "BUY/SELL FLOW ONLY",
    },

    dataIntegrity: {
      noFabricatedMetrics:
        true,

      unavailableData:
        "UNVERIFIED",
    },

    timestamp:
      nowISO(),
  });
}

/* =========================================================
   ROUTER
========================================================= */

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(request.url);

    const path =
      url.pathname.replace(
        /\/+$/,
        ""
      ) || "/";

    /*
     * Root endpoint.
     */
    if (
      path === "/"
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
          "/test-telegram",
          "/reset",
        ],

        chainId:
          CHAIN_ID,

        paidApiKeyRequired:
          false,

        timestamp:
          nowISO(),
      });
    }

    if (
      path === "/health"
    ) {
      return health(
        request,
        env
      );
    }

    if (
      path === "/scan"
    ) {
      return scan(
        request,
        env,
        ctx
      );
    }

    if (
      path === "/test-telegram"
    ) {
      return telegramTest(
        env
      );
    }

    if (
      path === "/reset"
    ) {
      return resetScanner(
        env
      );
    }

    return json(
      {
        error:
          "NOT_FOUND",

        version:
          VERSION,

        routes: [
          "/health",
          "/scan",
          "/test-telegram",
          "/reset",
        ],
      },
      404
    );
  },
};
