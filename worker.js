/**
 * Robinhood Chain Meme Hunter V32
 *
 * Design goals:
 * - Robinhood Chain chainId 4663
 * - FREE public RPC only
 * - Cloudflare KV cursor persistence
 * - Cron-driven scanning
 * - Ultra-low RPC request count
 * - NO recursive eth_getLogs retries
 * - Stop immediately on HTTP 429
 * - One eth_blockNumber + one eth_getLogs per scheduled scan
 * - Both launch contracts queried in one eth_getLogs filter
 * - DEX Screener only queried when tokens are discovered
 * - Telegram alerts only for qualifying candidates
 *
 * Required Cloudflare secrets:
 *   TELEGRAM_BOT_TOKEN
 *
 * Required KV binding:
 *   HUNTER_KV
 *
 * Optional environment variables:
 *   RPC_URL
 *   SCAN_BLOCKS
 *   MIN_LIQUIDITY_USD
 *   MIN_VOLUME_24H_USD
 *   ALERT_MIN_SCORE
 */

const VERSION = "V32";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const DEFAULT_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const EVENT_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const MAX_SAFE_RPC_REQUESTS = 4;

const DEFAULT_SCAN_BLOCKS = 250;

const DEFAULT_MIN_LIQUIDITY = 1000;
const DEFAULT_MIN_VOLUME = 500;
const DEFAULT_MIN_SCORE = 45;

const KV_CURSOR = "scan:cursor";
const KV_LAST_SCAN = "scan:last";
const KV_LOCK = "scan:lock";
const KV_SEEN_PREFIX = "seen:";
const KV_STATUS = "status:last";

const TELEGRAM_CHAT_ID = "-1004466114680";


// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

function rpcUrl(env) {
  return env.RPC_URL || DEFAULT_RPC;
}

function numberEnv(env, key, fallback) {
  const value = Number(env[key]);
  return Number.isFinite(value) ? value : fallback;
}

function hexToNumber(hex) {
  return Number.parseInt(hex, 16);
}

function addressFromTopic(topic) {
  if (!topic) return null;

  const clean = topic.replace(/^0x/, "");

  if (clean.length < 40) return null;

  return "0x" + clean.slice(-40).toLowerCase();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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

function nowIso() {
  return new Date().toISOString();
}

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);

  const hash = await crypto.subtle.digest(
    "SHA-256",
    bytes
  );

  return [...new Uint8Array(hash)]
    .map(x => x.toString(16).padStart(2, "0"))
    .join("");
}


// ------------------------------------------------------------
// RPC
// ------------------------------------------------------------

async function rpcCall(env, method, params = []) {

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    8000
  );

  try {

    const response = await fetch(
      rpcUrl(env),
      {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params
        }),
        signal: controller.signal
      }
    );

    const text = await response.text();

    if (response.status === 429) {
      const error = new Error("RPC_RATE_LIMITED");
      error.code = "RPC_RATE_LIMITED";
      error.status = 429;
      throw error;
    }

    if (!response.ok) {
      const error = new Error(
        `RPC_HTTP_${response.status}`
      );

      error.status = response.status;
      error.body = text.slice(0, 500);

      throw error;
    }

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      throw new Error("RPC_INVALID_JSON");
    }

    if (data.error) {
      const error = new Error(
        data.error.message ||
        `RPC_ERROR_${data.error.code}`
      );

      error.rpcCode = data.error.code;
      throw error;
    }

    return data.result;

  } finally {
    clearTimeout(timeout);
  }
}


// ------------------------------------------------------------
// KV locking
// ------------------------------------------------------------

async function acquireLock(env) {

  if (!env.HUNTER_KV) {
    return {
      acquired: false,
      reason: "KV_NOT_CONFIGURED"
    };
  }

  const existing =
    await env.HUNTER_KV.get(KV_LOCK);

  if (existing) {
    return {
      acquired: false,
      reason: "SCAN_ALREADY_RUNNING"
    };
  }

  const lockValue =
    `${Date.now()}:${crypto.randomUUID()}`;

  await env.HUNTER_KV.put(
    KV_LOCK,
    lockValue,
    {
      expirationTtl: 120
    }
  );

  return {
    acquired: true,
    value: lockValue
  };
}

async function releaseLock(env) {

  if (!env.HUNTER_KV) return;

  try {
    await env.HUNTER_KV.delete(KV_LOCK);
  } catch {
    // Do not fail the scan because lock cleanup failed.
  }
}


// ------------------------------------------------------------
// Cursor
// ------------------------------------------------------------

async function getCursor(env) {

  if (!env.HUNTER_KV) {
    return null;
  }

  const value =
    await env.HUNTER_KV.get(KV_CURSOR);

  if (!value) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}

async function setCursor(env, block) {

  if (!env.HUNTER_KV) return;

  await env.HUNTER_KV.put(
    KV_CURSOR,
    String(block)
  );
}


// ------------------------------------------------------------
// Block discovery
// ------------------------------------------------------------

async function getLatestBlock(env) {

  const blockHex =
    await rpcCall(
      env,
      "eth_blockNumber",
      []
    );

  return hexToNumber(blockHex);
}


// ------------------------------------------------------------
// TokenCreated discovery
// ------------------------------------------------------------

async function getLaunchLogs(
  env,
  fromBlock,
  toBlock
) {

  /*
   * IMPORTANT:
   *
   * We query BOTH launch contracts in ONE RPC call.
   *
   * This is substantially better than:
   *
   * contract 1 -> RPC
   * contract 2 -> RPC
   *
   * We also deliberately do NOT recursively split ranges.
   *
   * If the RPC rejects the request or rate-limits us,
   * the scan ends and the cursor remains unchanged.
   */

  const result =
    await rpcCall(
      env,
      "eth_getLogs",
      [{
        fromBlock: "0x" +
          fromBlock.toString(16),

        toBlock: "0x" +
          toBlock.toString(16),

        address: LAUNCH_CONTRACTS,

        topics: [
          EVENT_TOPIC
        ]
      }]
    );

  return Array.isArray(result)
    ? result
    : [];
}


// ------------------------------------------------------------
// Token parsing
// ------------------------------------------------------------

function parseTokenLogs(logs) {

  const tokens = new Map();

  for (const log of logs) {

    const topics = log.topics || [];

    /*
     * TokenCreated(address)
     *
     * The token address is normally the first indexed
     * argument after topic[0].
     */

    let tokenAddress = null;

    if (topics.length >= 2) {
      tokenAddress =
        addressFromTopic(topics[1]);
    }

    /*
     * Some launch contracts may encode the token in data.
     * We deliberately don't make speculative assumptions.
     */

    if (!tokenAddress) {
      continue;
    }

    tokens.set(
      tokenAddress,
      {
        address: tokenAddress,
        block: hexToNumber(log.blockNumber),
        transaction:
          log.transactionHash,
        contract:
          String(log.address || "").toLowerCase()
      }
    );
  }

  return [...tokens.values()];
}


// ------------------------------------------------------------
// Seen-token handling
// ------------------------------------------------------------

async function filterNewTokens(env, tokens) {

  if (!env.HUNTER_KV) {
    return tokens;
  }

  const fresh = [];

  /*
   * Keep KV operations bounded.
   *
   * We only inspect a small number of tokens because the
   * whole purpose of V32 is to stay comfortably below
   * Cloudflare's subrequest ceiling.
   */

  for (const token of tokens.slice(0, 5)) {

    const key =
      KV_SEEN_PREFIX +
      token.address.toLowerCase();

    const exists =
      await env.HUNTER_KV.get(key);

    if (!exists) {

      fresh.push(token);

      /*
       * TTL prevents KV from becoming an infinite historical
       * database.
       */
      await env.HUNTER_KV.put(
        key,
        JSON.stringify({
          firstSeen: nowIso(),
          block: token.block,
          transaction: token.transaction
        }),
        {
          expirationTtl:
            60 * 60 * 24 * 30
        }
      );
    }
  }

  return fresh;
}


// ------------------------------------------------------------
// DEX Screener
// ------------------------------------------------------------

async function getDexPairs(tokens) {

  if (!tokens.length) {
    return {
      pairs: [],
      errors: []
    };
  }

  /*
   * DEX Screener accepts multiple token addresses.
   *
   * We use ONE request instead of one request per token.
   */

  const addresses =
    tokens
      .slice(0, 5)
      .map(x => x.address)
      .join(",");

  const url =
    "https://api.dexscreener.com/latest/dex/tokens/" +
    addresses;

  try {

    const response =
      await fetch(
        url,
        {
          headers: {
            "accept": "application/json"
          }
        }
      );

    if (response.status === 429) {

      return {
        pairs: [],
        errors: [
          {
            type: "dex",
            error: "HTTP_429"
          }
        ]
      };
    }

    if (!response.ok) {

      return {
        pairs: [],
        errors: [
          {
            type: "dex",
            error:
              `HTTP_${response.status}`
          }
        ]
      };
    }

    const data =
      await response.json();

    return {
      pairs:
        Array.isArray(data.pairs)
          ? data.pairs
          : [],
      errors: []
    };

  } catch (error) {

    return {
      pairs: [],
      errors: [
        {
          type: "dex",
          error:
            error.message || "DEX_FETCH_FAILED"
        }
      ]
    };
  }
}


// ------------------------------------------------------------
// Candidate scoring
// ------------------------------------------------------------

function scoreCandidate(pair) {

  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );

  const volume24 =
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

  const totalTxns =
    buys + sells;

  if (
    liquidity <= 0 &&
    volume24 <= 0
  ) {
    return 0;
  }

  let score = 0;

  // Liquidity
  if (liquidity >= 10000) score += 25;
  else if (liquidity >= 5000) score += 20;
  else if (liquidity >= 2500) score += 15;
  else if (liquidity >= 1000) score += 10;

  // Volume
  if (volume24 >= 50000) score += 25;
  else if (volume24 >= 20000) score += 20;
  else if (volume24 >= 5000) score += 15;
  else if (volume24 >= 500) score += 5;

  // Transaction activity
  if (totalTxns >= 500) score += 20;
  else if (totalTxns >= 200) score += 15;
  else if (totalTxns >= 50) score += 10;
  else if (totalTxns >= 10) score += 5;

  // Buy pressure
  if (totalTxns > 0) {

    const buyRatio =
      buys / totalTxns;

    if (buyRatio >= 0.65) score += 20;
    else if (buyRatio >= 0.55) score += 15;
    else if (buyRatio >= 0.50) score += 8;
  }

  // Newness bonus
  score += 10;

  return Math.min(score, 100);
}


function buildCandidates(
  tokens,
  pairs,
  env
) {

  const minLiquidity =
    numberEnv(
      env,
      "MIN_LIQUIDITY_USD",
      DEFAULT_MIN_LIQUIDITY
    );

  const minVolume =
    numberEnv(
      env,
      "MIN_VOLUME_24H_USD",
      DEFAULT_MIN_VOLUME
    );

  const minScore =
    numberEnv(
      env,
      "ALERT_MIN_SCORE",
      DEFAULT_MIN_SCORE
    );

  const candidates = [];

  for (const token of tokens) {

    const matching =
      pairs.filter(
        pair =>
          String(
            pair?.baseToken?.address || ""
          ).toLowerCase()
          ===
          token.address.toLowerCase()
      );

    for (const pair of matching) {

      const liquidity =
        Number(
          pair?.liquidity?.usd || 0
        );

      const volume =
        Number(
          pair?.volume?.h24 || 0
        );

      const score =
        scoreCandidate(pair);

      const candidate = {

        address:
          token.address,

        name:
          pair?.baseToken?.name ||
          "UNKNOWN",

        symbol:
          pair?.baseToken?.symbol ||
          "UNKNOWN",

        chain:
          pair?.chainId ||
          "unknown",

        dex:
          pair?.dexId ||
          "unknown",

        pair:
          pair?.pairAddress ||
          null,

        url:
          pair?.url ||
          null,

        liquidityUsd:
          liquidity,

        volume24hUsd:
          volume,

        buys24h:
          Number(
            pair?.txns?.h24?.buys || 0
          ),

        sells24h:
          Number(
            pair?.txns?.h24?.sells || 0
          ),

        score,

        launchBlock:
          token.block,

        transaction:
          token.transaction,

        firstSeen:
          nowIso()
      };

      if (
        liquidity >= minLiquidity &&
        volume >= minVolume &&
        score >= minScore
      ) {
        candidates.push(candidate);
      }
    }
  }

  candidates.sort(
    (a, b) => b.score - a.score
  );

  return candidates;
}


// ------------------------------------------------------------
// Telegram
// ------------------------------------------------------------

async function telegramSend(
  env,
  message
) {

  if (!env.TELEGRAM_BOT_TOKEN) {

    return {
      sent: false,
      error: "TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
    };
  }

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
          body: JSON.stringify({
            chat_id:
              TELEGRAM_CHAT_ID,

            text:
              message,

            disable_web_page_preview:
              false
          })
        }
      );

    const data =
      await response.json();

    if (!response.ok || !data.ok) {

      return {
        sent: false,
        error:
          data?.description ||
          `HTTP_${response.status}`
      };
    }

    return {
      sent: true,
      messageId:
        data.result?.message_id
    };

  } catch (error) {

    return {
      sent: false,
      error:
        error.message ||
        "TELEGRAM_FAILED"
    };
  }
}


function formatAlert(candidate) {

  const buys =
    candidate.buys24h;

  const sells =
    candidate.sells24h;

  const total =
    buys + sells;

  const buyRatio =
    total > 0
      ? ((buys / total) * 100).toFixed(1)
      : "0.0";

  return [
    "🚨 EARLY ROBINHOOD CHAIN MEME",
    "",
    `🪙 ${candidate.name} (${
      candidate.symbol
    })`,
    "",
    `💧 Liquidity: $${Math.round(
      candidate.liquidityUsd
    ).toLocaleString()}`,

    `📊 24h Volume: $${Math.round(
      candidate.volume24hUsd
    ).toLocaleString()}`,

    `🟢 Buys: ${buys}`,
    `🔴 Sells: ${sells}`,
    `📈 Buy ratio: ${buyRatio}%`,

    `⭐ Score: ${candidate.score}/100`,

    "",
    `📍 Contract:`,
    candidate.address,

    "",
    candidate.url
      ? `🔎 DEX: ${candidate.url}`
      : "",

    "",
    "⚠️ Early-stage signal only. DYOR."
  ].filter(Boolean).join("\n");
}


// ------------------------------------------------------------
// Main scan
// ------------------------------------------------------------

async function runScan(env) {

  const started =
    Date.now();

  const diagnostics = [];

  const requestBreakdown = {
    rpc: 0,
    dex: 0,
    telegram: 0,
    other: 0
  };

  if (!env.HUNTER_KV) {

    return {
      success: false,

      status:
        "KV_NOT_CONFIGURED",

      error:
        "Create and bind HUNTER_KV before scanning."
    };
  }

  const lock =
    await acquireLock(env);

  if (!lock.acquired) {

    return {
      success: false,

      status:
        "SCAN_LOCKED",

      reason:
        lock.reason
    };
  }

  try {

    /*
     * Request #1:
     * eth_blockNumber
     */

    let latestBlock;

    try {

      requestBreakdown.rpc++;

      latestBlock =
        await getLatestBlock(env);

    } catch (error) {

      diagnostics.push({
        type: "rpc",
        method:
          "eth_blockNumber",
        error:
          error.message
      });

      return {
        success: false,
        status:
          error.code ===
          "RPC_RATE_LIMITED"
            ? "RPC_RATE_LIMITED"
            : "RPC_FAILED",

        diagnostics,
        requestBreakdown
      };
    }


    /*
     * Cursor:
     *
     * We deliberately do NOT scan from latest - thousands.
     *
     * The first run starts only a small distance behind
     * the current chain head.
     */

    let cursor =
      await getCursor(env);

    if (cursor === null) {

      cursor =
        Math.max(
          0,
          latestBlock -
          numberEnv(
            env,
            "SCAN_BLOCKS",
            DEFAULT_SCAN_BLOCKS
          )
        );
    }


    /*
     * Don't scan beyond the current head.
     */

    const scanBlocks =
      Math.min(
        numberEnv(
          env,
          "SCAN_BLOCKS",
          DEFAULT_SCAN_BLOCKS
        ),
        500
      );

    const fromBlock =
      cursor + 1;

    const toBlock =
      Math.min(
        latestBlock,
        fromBlock + scanBlocks - 1
      );

    if (fromBlock > toBlock) {

      return {
        success: true,

        status:
          "NOTHING_NEW",

        latestBlock,
        cursor
      };
    }


    /*
     * Request #2:
     *
     * ONE eth_getLogs request.
     *
     * Both launch contracts are included in the
     * same address filter.
     */

    let logs;

    try {

      requestBreakdown.rpc++;

      logs =
        await getLaunchLogs(
          env,
          fromBlock,
          toBlock
        );

    } catch (error) {

      diagnostics.push({
        type: "rpc",
        method:
          "eth_getLogs",
        fromBlock,
        toBlock,
        error:
          error.message,
        status:
          error.status || null
      });

      /*
       * CRITICAL:
       *
       * Do NOT move cursor forward on failure.
       *
       * The same range will be retried by a later
       * Cron execution.
       */

      return {
        success: false,

        status:
          error.code ===
          "RPC_RATE_LIMITED"
            ? "RPC_RATE_LIMITED"
            : "RPC_FAILED",

        latestBlock,
        cursorBefore:
          cursor,

        fromBlock,
        toBlock,

        blocksScanned:
          toBlock - fromBlock + 1,

        rawLogs: 0,

        tokensDiscovered: 0,

        requestBreakdown,

        diagnostics
      };
    }


    const parsedTokens =
      parseTokenLogs(logs);


    const freshTokens =
      await filterNewTokens(
        env,
        parsedTokens
      );


    /*
     * Only call DEX Screener if we actually found
     * new launch tokens.
     *
     * This is what keeps normal scans extremely cheap.
     */

    let dexResult = {
      pairs: [],
      errors: []
    };

    if (freshTokens.length > 0) {

      try {

        requestBreakdown.dex++;

        dexResult =
          await getDexPairs(
            freshTokens
          );

      } catch (error) {

        diagnostics.push({
          type: "dex",
          error:
            error.message
        });
      }
    }


    const candidates =
      buildCandidates(
        freshTokens,
        dexResult.pairs,
        env
      );


    /*
     * Advance cursor ONLY after successful RPC discovery.
     *
     * DEX failure does not cause the chain range to be
     * scanned repeatedly because token discovery itself
     * succeeded.
     */

    await setCursor(
      env,
      toBlock
    );


    const alerts = [];

    /*
     * Maximum two Telegram alerts per scan.
     *
     * This keeps the Worker extremely conservative.
     */

    for (
      const candidate
      of candidates.slice(0, 2)
    ) {

      requestBreakdown.telegram++;

      const result =
        await telegramSend(
          env,
          formatAlert(candidate)
        );

      alerts.push({
        candidate:
          candidate.address,

        sent:
          result.sent,

        messageId:
          result.messageId ||
          null,

        error:
          result.error ||
          null
      });
    }


    const result = {

      success: true,

      status: "ONLINE",

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      chainId:
        CHAIN_ID,

      chain:
        CHAIN_NAME,

      rpc:
        rpcUrl(env),

      discovery: {

        source:
          "ETH_GETLOGS_TOKEN_CREATED_ULTRA_LOW_RPC",

        event:
          "TokenCreated(address)",

        eventTopic:
          EVENT_TOPIC,

        launchContracts:
          LAUNCH_CONTRACTS,

        latestBlock,

        cursorBefore:
          cursor,

        startBlock:
          fromBlock,

        endBlock:
          toBlock,

        blocksScanned:
          toBlock - fromBlock + 1,

        rawLogs:
          logs.length,

        tokensDiscovered:
          freshTokens.length,

        verifiedTokenAddresses:
          freshTokens
      },

      marketData: {

        source:
          "DEX_SCREENER_BATCH",

        status:
          freshTokens.length
            ? "CALLED"
            : "NOT_CALLED",

        pairsReturned:
          dexResult.pairs.length,

        candidatesAnalysed:
          freshTokens.length,

        lookupErrors:
          dexResult.errors
      },

      candidates,

      alerts,

      telegram: {
        configured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN
          ),

        chatId:
          TELEGRAM_CHAT_ID,

        alertsSent:
          alerts.filter(
            x => x.sent
          ).length
      },

      scan: {

        cursorBefore:
          cursor,

        cursorAfter:
          toBlock,

        requestBreakdown,

        estimatedSubrequests:
          requestBreakdown.rpc +
          requestBreakdown.dex +
          requestBreakdown.telegram,

        freeSafeBudget:
          MAX_SAFE_RPC_REQUESTS
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
          "BUY/SELL FLOW ONLY"
      },

      dataIntegrity: {

        noFabricatedMetrics:
          true,

        unavailableData:
          "UNVERIFIED"
      },

      timestamp:
        nowIso(),

      durationMs:
        Date.now() - started
    };


    await env.HUNTER_KV.put(
      KV_LAST_SCAN,
      JSON.stringify(result),
      {
        expirationTtl:
          60 * 60 * 24 * 7
      }
    );

    await env.HUNTER_KV.put(
      KV_STATUS,
      JSON.stringify({
        version: VERSION,
        status: "ONLINE",
        cursor: toBlock,
        latestBlock,
        timestamp: nowIso()
      }),
      {
        expirationTtl:
          60 * 60 * 24
      }
    );


    return result;

  } finally {

    await releaseLock(env);

  }
}


// ------------------------------------------------------------
// Health
// ------------------------------------------------------------

async function health(env) {

  let cursor = null;

  if (env.HUNTER_KV) {
    cursor =
      await getCursor(env);
  }

  return {

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
      "/reset"
    ],

    chainId:
      CHAIN_ID,

    chain:
      CHAIN_NAME,

    rpc: {
      primary:
        rpcUrl(env),

      mode:
        "PRIMARY_ONLY_ULTRA_LOW_REQUEST"
    },

    discovery:
      "ETH_GETLOGS_TOKEN_CREATED_ULTRA_LOW_RPC",

    marketData:
      "DEX_SCREENER_BATCH",

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN
      ),

    kvConfigured:
      Boolean(
        env.HUNTER_KV
      ),

    cursor,

    cron:
      "ENABLED_VIA_WRANGLER",

    paidApiKeyRequired:
      false,

    cloudflareFreeSafeBudget:
      MAX_SAFE_RPC_REQUESTS,

    timestamp:
      nowIso()
  };
}


// ------------------------------------------------------------
// Telegram test
// ------------------------------------------------------------

async function testTelegram(env) {

  const request =
    await telegramSend(
      env,
      `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${nowIso()}`
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN
      ),

    success:
      request.sent,

    response:
      request,

    timestamp:
      nowIso()
  };
}


// ------------------------------------------------------------
// Reset
// ------------------------------------------------------------

async function reset(env) {

  if (!env.HUNTER_KV) {

    return {
      success: false,

      error:
        "KV_NOT_CONFIGURED"
    };
  }

  await env.HUNTER_KV.delete(
    KV_CURSOR
  );

  await env.HUNTER_KV.delete(
    KV_LAST_SCAN
  );

  await env.HUNTER_KV.delete(
    KV_STATUS
  );

  return {

    success: true,

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    message:
      "Scan cursor reset. Next scan will initialise from a small recent block window.",

    timestamp:
      nowIso()
  };
}


// ------------------------------------------------------------
// HTTP routes
// ------------------------------------------------------------

export default {

  async fetch(request, env, ctx) {

    const url =
      new URL(request.url);

    const path =
      url.pathname;


    if (request.method !== "GET") {

      return json(
        {
          success: false,
          error:
            "GET_ONLY"
        },
        405
      );
    }


    if (path === "/health") {

      return json(
        await health(env)
      );
    }


    if (path === "/scan") {

      const result =
        await runScan(env);

      return json(
        result,
        result.success
          ? 200
          : 503
      );
    }


    if (path === "/test-telegram") {

      return json(
        await testTelegram(env)
      );
    }


    if (path === "/reset") {

      return json(
        await reset(env)
      );
    }


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
        "/reset"
      ]

    });
  },


  /*
   * Cloudflare Cron
   *
   * The Cron should call this function automatically.
   *
   * We deliberately don't run scans every minute.
   * The public Robinhood RPC has already demonstrated
   * rate limiting, so a conservative schedule is safer.
   */

  async scheduled(event, env, ctx) {

    ctx.waitUntil(

      (async () => {

        try {

          const result =
            await runScan(env);

          /*
           * Store the last Cron result for diagnostics.
           */

          if (env.HUNTER_KV) {

            await env.HUNTER_KV.put(

              "cron:last",

              JSON.stringify({

                version:
                  VERSION,

                success:
                  result.success,

                status:
                  result.status,

                timestamp:
                  nowIso(),

                result

              }),

              {
                expirationTtl:
                  60 * 60 * 24 * 7
              }
            );
          }

        } catch (error) {

          if (env.HUNTER_KV) {

            await env.HUNTER_KV.put(

              "cron:last",

              JSON.stringify({

                version:
                  VERSION,

                success:
                  false,

                error:
                  error.message,

                timestamp:
                  nowIso()

              }),

              {
                expirationTtl:
                  60 * 60 * 24 * 7
              }
            );
          }

        }

      })()

    );
  }
};
