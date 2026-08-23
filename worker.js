/**
 * Robinhood Chain Meme Hunter
 * V31
 *
 * Cloudflare Worker
 *
 * Routes:
 *   /health
 *   /scan
 *   /test-telegram
 *   /reset
 *
 * Chain:
 *   Robinhood Chain
 *   Chain ID: 4663
 *
 * Design goals:
 *   - Free / no paid RPC API key
 *   - Very conservative RPC usage
 *   - No recursive range explosion
 *   - Stop immediately on HTTP 429
 *   - Optional KV persistence
 *   - DEX Screener only after tokens are discovered
 *   - Telegram alerts
 *   - No fabricated metrics
 */

const VERSION = "V31";

const CHAIN_ID = 4663;

const PRIMARY_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

/*
 * Do NOT use the previous NodeFlare endpoint.
 * V30 demonstrated that endpoint returning HTTP 403.
 */
const FALLBACK_RPC = null;

/*
 * These are the launch contracts discovered in previous versions.
 */
const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9",
];

/*
 * TokenCreated(address)
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
 * Very conservative limits.
 *
 * The aim is NOT to scan thousands of RPC ranges in one request.
 */
const MAX_RPC_REQUESTS = 12;

const MAX_LOG_RANGES = 6;

const INITIAL_SCAN_BLOCKS = 500;

const MIN_SCAN_BLOCKS = 100;

const MAX_TOKENS_PER_SCAN = 8;

const MAX_DEX_TOKENS = 5;

const RPC_TIMEOUT_MS = 7000;

const DEX_TIMEOUT_MS = 5000;

const STATE_KEY = "scanner-state-v31";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...CORS_HEADERS,
      },
    }
  );
}

function now() {
  return new Date().toISOString();
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function unique(values) {
  return [...new Set(values)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/* ---------------------------------------------------------
   RPC
--------------------------------------------------------- */

function createRpcClient(env) {
  let requestCount = 0;

  async function call(method, params = [], options = {}) {
    if (requestCount >= MAX_RPC_REQUESTS) {
      throw new Error("RPC_REQUEST_BUDGET_EXCEEDED");
    }

    requestCount++;

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      options.timeout || RPC_TIMEOUT_MS
    );

    try {
      const response = await fetch(PRIMARY_RPC, {
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

      if (response.status === 429) {
        const error = new Error("RPC_RATE_LIMITED");
        error.code = "RPC_429";
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
          data.error.message || "RPC_ERROR"
        );

        error.rpcCode = data.error.code;

        throw error;
      }

      return data.result;

    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    call,
    getRequestCount: () => requestCount,
  };
}

/* ---------------------------------------------------------
   Block helpers
--------------------------------------------------------- */

function hexToNumber(hex) {
  if (!hex) return 0;

  try {
    return parseInt(hex, 16);
  } catch {
    return 0;
  }
}

function numberToHex(number) {
  return "0x" + Number(number).toString(16);
}

/* ---------------------------------------------------------
   Optional KV state
--------------------------------------------------------- */

async function loadState(env) {
  if (!env.SCAN_KV) {
    return null;
  }

  try {
    const value = await env.SCAN_KV.get(STATE_KEY);

    if (!value) {
      return null;
    }

    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function saveState(env, state) {
  if (!env.SCAN_KV) {
    return false;
  }

  try {
    await env.SCAN_KV.put(
      STATE_KEY,
      JSON.stringify(state)
    );

    return true;
  } catch {
    return false;
  }
}

async function deleteState(env) {
  if (!env.SCAN_KV) {
    return false;
  }

  try {
    await env.SCAN_KV.delete(STATE_KEY);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------
   Token metadata
--------------------------------------------------------- */

function encodeAddress(address) {
  return address
    .replace(/^0x/, "")
    .padStart(64, "0");
}

function decodeString(hex) {
  if (!hex || hex === "0x") return null;

  try {
    let clean = hex.replace(/^0x/, "");

    /*
     * Dynamic ABI string:
     *
     * offset
     * length
     * data
     */

    if (clean.length >= 128) {
      const offset = parseInt(
        clean.slice(0, 64),
        16
      );

      const length = parseInt(
        clean.slice(offset * 2, offset * 2 + 64),
        16
      );

      const dataStart =
        offset * 2 + 64;

      const data =
        clean.slice(
          dataStart,
          dataStart + length * 2
        );

      const bytes =
        data.match(/.{1,2}/g) || [];

      return bytes
        .map(x => String.fromCharCode(parseInt(x, 16)))
        .join("");
    }

    /*
     * bytes32 fallback.
     */
    const bytes =
      clean
        .slice(0, 64)
        .match(/.{1,2}/g) || [];

    const result = bytes
      .map(x => parseInt(x, 16))
      .filter(x => x !== 0)
      .map(x => String.fromCharCode(x))
      .join("");

    return result || null;

  } catch {
    return null;
  }
}

async function getTokenMetadata(rpc, address) {
  const calls = [
    {
      method: "eth_call",
      params: [
        {
          to: address,
          data: "0x06fdde03",
        },
        "latest",
      ],
    },
    {
      method: "eth_call",
      params: [
        {
          to: address,
          data: "0x95d89b41",
        },
        "latest",
      ],
    },
    {
      method: "eth_call",
      params: [
        {
          to: address,
          data: "0x313ce567",
        },
        "latest",
      ],
    },
    {
      method: "eth_call",
      params: [
        {
          to: address,
          data: "0x18160ddd",
        },
        "latest",
      ],
    },
  ];

  const result = {
    address,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
  };

  /*
   * Do not spend the entire scan budget on metadata.
   *
   * Only attempt metadata if enough requests remain.
   */
  for (const call of calls) {
    try {
      const value = await rpc.call(
        call.method,
        call.params
      );

      if (
        call.params[0].data === "0x06fdde03"
      ) {
        result.name = decodeString(value);
      }

      if (
        call.params[0].data === "0x95d89b41"
      ) {
        result.symbol = decodeString(value);
      }

      if (
        call.params[0].data === "0x313ce567"
      ) {
        result.decimals =
          hexToNumber(value);
      }

      if (
        call.params[0].data === "0x18160ddd"
      ) {
        result.totalSupply = value;
      }

    } catch (error) {
      /*
       * Metadata is optional.
       *
       * A metadata failure must never cause
       * the entire token discovery scan to fail.
       */
    }
  }

  return result;
}

/* ---------------------------------------------------------
   TokenCreated event parsing
--------------------------------------------------------- */

function extractTokenAddress(log) {
  if (!log) return null;

  /*
   * Primary expected format:
   *
   * topics[1] = indexed address
   */
  if (
    Array.isArray(log.topics) &&
    log.topics.length >= 2
  ) {
    const topic = log.topics[1];

    if (
      typeof topic === "string" &&
      topic.length >= 64
    ) {
      return (
        "0x" +
        topic.slice(-40)
      ).toLowerCase();
    }
  }

  /*
   * Fallback:
   * event data may contain the address.
   */
  if (
    typeof log.data === "string" &&
    log.data.length >= 66
  ) {
    return (
      "0x" +
      log.data.slice(-40)
    ).toLowerCase();
  }

  return null;
}

function parseTokenLogs(logs) {
  const tokens = [];

  for (const log of logs || []) {
    const address =
      extractTokenAddress(log);

    if (!address) continue;

    if (
      address ===
      "0x0000000000000000000000000000000000000000"
    ) {
      continue;
    }

    tokens.push({
      address,
      block: hexToNumber(log.blockNumber),
      transaction:
        log.transactionHash || null,
    });
  }

  return tokens;
}

/* ---------------------------------------------------------
   Safe getLogs
--------------------------------------------------------- */

async function getLogsSafe(
  rpc,
  contract,
  fromBlock,
  toBlock,
  diagnostics
) {
  if (fromBlock > toBlock) {
    return [];
  }

  try {
    const logs =
      await rpc.call(
        "eth_getLogs",
        [
          {
            address: contract,
            fromBlock: numberToHex(fromBlock),
            toBlock: numberToHex(toBlock),
            topics: [
              TOKEN_CREATED_TOPIC,
            ],
          },
        ]
      );

    return Array.isArray(logs)
      ? logs
      : [];

  } catch (error) {
    diagnostics.push({
      type: "rpc",
      method: "eth_getLogs",
      contract,
      fromBlock,
      toBlock,
      error: error.message,
      status: error.status || null,
      timestamp: now(),
    });

    /*
     * CRITICAL V31 CHANGE:
     *
     * Do NOT halve the range.
     * Do NOT retry repeatedly.
     *
     * If RPC is rate limited, stop immediately.
     */
    throw error;
  }
}

/* ---------------------------------------------------------
   Discovery
--------------------------------------------------------- */

async function discoverTokens(
  rpc,
  latestBlock,
  cursor,
  diagnostics
) {
  let endBlock = latestBlock;

  let startBlock;

  if (
    Number.isInteger(cursor) &&
    cursor > 0 &&
    cursor < latestBlock
  ) {
    startBlock = cursor;
  } else {
    startBlock =
      Math.max(
        0,
        latestBlock -
          INITIAL_SCAN_BLOCKS +
          1
      );
  }

  /*
   * Never scan an enormous range.
   */
  const maximumEnd =
    startBlock +
    INITIAL_SCAN_BLOCKS -
    1;

  endBlock =
    Math.min(
      endBlock,
      maximumEnd
    );

  /*
   * If cursor has fallen behind, move forward
   * in a controlled window.
   */
  const blocksScanned =
    endBlock - startBlock + 1;

  const tokens = [];

  let rangesAttempted = 0;

  /*
   * We deliberately scan each launch contract
   * separately.
   *
   * Maximum:
   *
   * 6 getLogs requests
   */
  for (
    const contract of LAUNCH_CONTRACTS
  ) {
    if (
      rangesAttempted >= MAX_LOG_RANGES
    ) {
      break;
    }

    try {
      const logs =
        await getLogsSafe(
          rpc,
          contract,
          startBlock,
          endBlock,
          diagnostics
        );

      rangesAttempted++;

      const parsed =
        parseTokenLogs(logs);

      tokens.push(...parsed);

      if (
        tokens.length >=
        MAX_TOKENS_PER_SCAN
      ) {
        break;
      }

    } catch (error) {
      /*
       * Stop the entire discovery operation.
       *
       * This is intentional.
       */
      return {
        success: false,
        reason: error.message,
        startBlock,
        endBlock,
        blocksScanned,
        tokens: [],
        rangesAttempted,
      };
    }
  }

  const uniqueTokens =
    unique(
      tokens.map(x => x.address)
    )
      .map(address =>
        tokens.find(
          x => x.address === address
        )
      )
      .slice(
        0,
        MAX_TOKENS_PER_SCAN
      );

  return {
    success: true,
    reason: null,
    startBlock,
    endBlock,
    blocksScanned,
    tokens: uniqueTokens,
    rangesAttempted,
  };
}

/* ---------------------------------------------------------
   DEX Screener
--------------------------------------------------------- */

async function dexLookup(addresses) {
  if (!addresses.length) {
    return {
      pairs: [],
      errors: [],
    };
  }

  /*
   * DEX Screener supports multiple token
   * addresses in one lookup endpoint.
   *
   * Keep the batch small.
   */
  const limited =
    addresses.slice(
      0,
      MAX_DEX_TOKENS
    );

  const joined =
    limited.join(",");

  const url =
    `https://api.dexscreener.com/latest/dex/tokens/${joined}`;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () => controller.abort(),
      DEX_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(url, {
        headers: {
          "accept":
            "application/json",
        },
        signal:
          controller.signal,
      });

    if (response.status === 429) {
      return {
        pairs: [],
        errors: [
          {
            type: "dex",
            error:
              "DEX_RATE_LIMITED",
          },
        ],
      };
    }

    if (!response.ok) {
      return {
        pairs: [],
        errors: [
          {
            type: "dex",
            error:
              `HTTP_${response.status}`,
          },
        ],
      };
    }

    const data =
      await response.json();

    return {
      pairs:
        Array.isArray(data?.pairs)
          ? data.pairs
          : [],
      errors: [],
    };

  } catch (error) {
    return {
      pairs: [],
      errors: [
        {
          type: "dex",
          error:
            error.name ===
            "AbortError"
              ? "DEX_TIMEOUT"
              : error.message,
        },
      ],
    };

  } finally {
    clearTimeout(timeout);
  }
}

/* ---------------------------------------------------------
   Candidate scoring
--------------------------------------------------------- */

function calculateScore(token, pairs) {
  /*
   * V31 deliberately does not invent holder,
   * smart-money or wallet metrics.
   *
   * Score only from data actually available.
   */

  if (!pairs.length) {
    return {
      score: null,
      reasons: [
        "No verified DEX pair data",
      ],
    };
  }

  let score = 0;

  const reasons = [];

  const best =
    [...pairs]
      .sort(
        (a, b) =>
          Number(
            b?.liquidity?.usd || 0
          ) -
          Number(
            a?.liquidity?.usd || 0
          )
      )[0];

  const liquidity =
    Number(
      best?.liquidity?.usd || 0
    );

  const volume24h =
    Number(
      best?.volume?.h24 || 0
    );

  const txns =
    best?.txns?.h24 || {};

  const buys =
    Number(
      txns?.buys || 0
    );

  const sells =
    Number(
      txns?.sells || 0
    );

  const marketCap =
    Number(
      best?.marketCap ||
      best?.fdv ||
      0
    );

  if (liquidity > 0) {
    score += 20;
    reasons.push(
      "Liquidity detected"
    );
  }

  if (liquidity >= 10000) {
    score += 15;
    reasons.push(
      "Liquidity above $10k"
    );
  }

  if (volume24h > 0) {
    score += 20;
    reasons.push(
      "24h volume detected"
    );
  }

  if (buys > sells) {
    score += 15;
    reasons.push(
      "More buys than sells"
    );
  }

  if (
    marketCap > 0 &&
    marketCap < 5000000
  ) {
    score += 20;
    reasons.push(
      "Early-stage market cap"
    );
  }

  if (
    buys > 0 &&
    sells > 0
  ) {
    const ratio =
      buys / sells;

    if (ratio >= 1.5) {
      score += 10;
      reasons.push(
        "Strong buy/sell ratio"
      );
    }
  }

  return {
    score: Math.min(
      100,
      score
    ),
    reasons,
  };
}

/* ---------------------------------------------------------
   Telegram
--------------------------------------------------------- */

async function sendTelegram(
  env,
  text
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      success: false,
      error:
        "TELEGRAM_NOT_CONFIGURED",
    };
  }

  const url =
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response =
      await fetch(url, {
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

    const data =
      await response.json();

    return {
      success:
        Boolean(data?.ok),
      response: data,
    };

  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/* ---------------------------------------------------------
   Telegram candidate message
--------------------------------------------------------- */

function candidateTelegramMessage(
  candidate
) {
  const name =
    candidate.name ||
    "Unknown";

  const symbol =
    candidate.symbol ||
    "UNKNOWN";

  const address =
    candidate.address;

  const marketCap =
    candidate.marketCap
      ? `$${Number(
          candidate.marketCap
        ).toLocaleString()}`
      : "UNVERIFIED";

  const liquidity =
    candidate.liquidity
      ? `$${Number(
          candidate.liquidity
        ).toLocaleString()}`
      : "UNVERIFIED";

  const volume =
    candidate.volume24h
      ? `$${Number(
          candidate.volume24h
        ).toLocaleString()}`
      : "UNVERIFIED";

  const score =
    candidate.score === null
      ? "UNVERIFIED"
      : candidate.score;

  return [
    `🚨 Robinhood Chain Meme Hunter V31`,
    ``,
    `🪙 ${name} (${symbol})`,
    `📍 ${address}`,
    ``,
    `⭐ Score: ${score}/100`,
    `💰 Market cap: ${marketCap}`,
    `💧 Liquidity: ${liquidity}`,
    `📊 24h volume: ${volume}`,
    ``,
    `🔗 https://dexscreener.com/robinhood/${address}`,
    ``,
    `⚠️ Early-stage scanner — DYOR`,
  ].join("\n");
}

/* ---------------------------------------------------------
   Main scan
--------------------------------------------------------- */

async function scan(env) {
  const started =
    Date.now();

  const diagnostics = [];

  const rpc =
    createRpcClient(env);

  let latestBlock;

  try {
    latestBlock =
      hexToNumber(
        await rpc.call(
          "eth_blockNumber"
        )
      );

  } catch (error) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      status:
        "RPC_UNAVAILABLE",
      chainId:
        CHAIN_ID,
      error:
        error.message,
      rpc: {
        primary:
          PRIMARY_RPC,
        fallback:
          FALLBACK_RPC,
      },
      diagnostics,
      requestCount:
        rpc.getRequestCount(),
      timestamp: now(),
    };
  }

  const state =
    await loadState(env);

  let cursor =
    state?.nextBlock || null;

  /*
   * Do not start thousands of blocks behind.
   */
  if (
    cursor &&
    latestBlock - cursor >
      INITIAL_SCAN_BLOCKS
  ) {
    cursor =
      latestBlock -
      INITIAL_SCAN_BLOCKS +
      1;
  }

  const discovery =
    await discoverTokens(
      rpc,
      latestBlock,
      cursor,
      diagnostics
    );

  /*
   * RPC rate limit.
   */
  if (!discovery.success) {
    const nextBlock =
      discovery.startBlock;

    await saveState(
      env,
      {
        nextBlock,
        lastAttempt:
          now(),
        status:
          discovery.reason,
      }
    );

    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      status:
        discovery.reason ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_DISCOVERY_FAILED",

      chainId:
        CHAIN_ID,

      rpc: {
        primary:
          PRIMARY_RPC,
        fallback:
          null,
        mode:
          "CONSERVATIVE_PRIMARY_ONLY",
      },

      discovery: {
        source:
          "ETH_GETLOGS_TOKEN_CREATED_V31",
        latestBlock,
        startBlock:
          discovery.startBlock,
        endBlock:
          discovery.endBlock,
        blocksScanned:
          discovery.blocksScanned,
        tokensDiscovered: 0,
      },

      marketData: {
        source:
          "DEX_SCREENER",
        status:
          "NOT_CALLED",
      },

      telegram: {
        configured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
      },

      scan: {
        requestCount:
          rpc.getRequestCount(),
        requestLimit:
          MAX_RPC_REQUESTS,
        requestsRemaining:
          Math.max(
            0,
            MAX_RPC_REQUESTS -
              rpc.getRequestCount()
          ),
      },

      diagnostics,

      dataIntegrity: {
        noFabricatedMetrics:
          true,
        unavailableData:
          "UNVERIFIED",
      },

      timestamp: now(),
    };
  }

  const discovered =
    discovery.tokens;

  /*
   * Save cursor immediately.
   *
   * This means the next invocation continues
   * from the following block.
   */
  const nextBlock =
    discovery.endBlock + 1;

  await saveState(
    env,
    {
      nextBlock,
      lastSuccessfulBlock:
        discovery.endBlock,
      lastScan:
        now(),
    }
  );

  /*
   * No tokens = no DEX request.
   */
  if (!discovered.length) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      status: "ONLINE",

      objective:
        "Discover early-stage Robinhood Chain meme coins using conservative verified on-chain discovery and free DEX market data.",

      chain: {
        name:
          "Robinhood Chain",
        chainId:
          CHAIN_ID,
        rpc:
          PRIMARY_RPC,
      },

      discovery: {
        source:
          "ETH_GETLOGS_TOKEN_CREATED_V31",
        latestBlock,
        startBlock:
          discovery.startBlock,
        endBlock:
          discovery.endBlock,
        blocksScanned:
          discovery.blocksScanned,
        tokensDiscovered: 0,
        verifiedTokenAddresses: [],
      },

      marketData: {
        source:
          "DEX_SCREENER",
        lookupMode:
          "BATCH_MULTI_TOKEN",
        status:
          "NOT_CALLED",
        reason:
          "No tokens discovered",
      },

      telegram: {
        configured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
        alertsSent: 0,
      },

      scan: {
        cursorBefore:
          cursor,
        cursorAfter:
          nextBlock,
        requestCount:
          rpc.getRequestCount(),
        requestLimit:
          MAX_RPC_REQUESTS,
        requestsRemaining:
          Math.max(
            0,
            MAX_RPC_REQUESTS -
              rpc.getRequestCount()
          ),
        durationMs:
          Date.now() - started,
      },

      candidates: [],
      alerts: [],

      diagnostics,

      validation: {
        tokenDiscovery:
          "VERIFIED TOKEN_CREATED EVENT",
        tokenAddress:
          "VERIFIED FROM EVENT",
        erc20Metadata:
          "NOT REQUESTED",
        dexPairDiscovery:
          "NOT CALLED",
        liquidity:
          "UNVERIFIED",
        volume:
          "UNVERIFIED",
        buySellPressure:
          "UNVERIFIED",
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

      timestamp: now(),
    };
  }

  /*
   * DEX lookup only happens after discovery.
   */
  const dex =
    await dexLookup(
      discovered.map(
        x => x.address
      )
    );

  const candidates = [];

  for (
    const token of discovered
  ) {
    /*
     * Match all pairs involving token.
     */
    const tokenPairs =
      dex.pairs.filter(
        pair => {
          const base =
            lower(
              pair?.baseToken?.address
            );

          const quote =
            lower(
              pair?.quoteToken?.address
            );

          return (
            base ===
              lower(token.address) ||
            quote ===
              lower(token.address)
          );
        }
      );

    /*
     * Metadata only if request budget allows.
     */
    let metadata = {
      address:
        token.address,
      name: null,
      symbol: null,
      decimals: null,
      totalSupply: null,
    };

    if (
      rpc.getRequestCount() + 4 <=
      MAX_RPC_REQUESTS
    ) {
      metadata =
        await getTokenMetadata(
          rpc,
          token.address
        );
    }

    const bestPair =
      [...tokenPairs]
        .sort(
          (a, b) =>
            Number(
              b?.liquidity?.usd || 0
            ) -
            Number(
              a?.liquidity?.usd || 0
            )
        )[0];

    const marketCap =
      Number(
        bestPair?.marketCap ||
        bestPair?.fdv ||
        0
      );

    const liquidity =
      Number(
        bestPair?.liquidity?.usd ||
        0
      );

    const volume24h =
      Number(
        bestPair?.volume?.h24 ||
        0
      );

    const txns =
      bestPair?.txns?.h24 ||
      {};

    const buys =
      Number(
        txns?.buys || 0
      );

    const sells =
      Number(
        txns?.sells || 0
      );

    const scoring =
      calculateScore(
        {
          ...token,
          ...metadata,
        },
        tokenPairs
      );

    candidates.push({
      address:
        token.address,

      name:
        metadata.name ||
        null,

      symbol:
        metadata.symbol ||
        null,

      block:
        token.block,

      transaction:
        token.transaction,

      pairCount:
        tokenPairs.length,

      marketCap:
        marketCap ||
        null,

      liquidity:
        liquidity ||
        null,

      volume24h:
        volume24h ||
        null,

      buys,

      sells,

      score:
        scoring.score,

      reasons:
        scoring.reasons,

      pair:
        bestPair
          ? {
              dexId:
                bestPair.dexId ||
                null,
              url:
                bestPair.url ||
                null,
              pairAddress:
                bestPair.pairAddress ||
                null,
            }
          : null,

      holderConcentration:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",
    });
  }

  /*
   * Rank only candidates with an actual score.
   */
  candidates.sort(
    (a, b) =>
      Number(
        b.score || -1
      ) -
      Number(
        a.score || -1
      )
  );

  /*
   * Telegram alerts.
   *
   * Only alert on candidates with actual DEX
   * data and a reasonably meaningful score.
   */
  const alerts = [];

  for (
    const candidate of candidates
  ) {
    if (
      candidate.score !== null &&
      candidate.score >= 50
    ) {
      const result =
        await sendTelegram(
          env,
          candidateTelegramMessage(
            candidate
          )
        );

      alerts.push({
        address:
          candidate.address,
        score:
          candidate.score,
        sent:
          result.success,
        error:
          result.success
            ? null
            : result.error ||
              null,
      });

      /*
       * Keep Telegram usage conservative.
       */
      break;
    }
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins using conservative verified on-chain discovery and free DEX market data.",

    chain: {
      name:
        "Robinhood Chain",
      chainId:
        CHAIN_ID,
      rpc:
        PRIMARY_RPC,
    },

    discovery: {
      source:
        "ETH_GETLOGS_TOKEN_CREATED_V31",

      event:
        "TokenCreated(address)",

      eventTopic:
        TOKEN_CREATED_TOPIC,

      launchContracts:
        LAUNCH_CONTRACTS,

      latestBlock,

      startBlock:
        discovery.startBlock,

      endBlock:
        discovery.endBlock,

      blocksScanned:
        discovery.blocksScanned,

      rawLogs:
        discovered.length,

      tokensDiscovered:
        discovered.length,

      verifiedTokenAddresses:
        discovered,
    },

    marketData: {
      source:
        "DEX_SCREENER",

      lookupMode:
        "BATCH_MULTI_TOKEN",

      tokensAttempted:
        discovered.length,

      pairsReturned:
        dex.pairs.length,

      candidatesAnalysed:
        candidates.length,

      lookupErrors:
        dex.errors,
    },

    telegram: {
      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      chatId:
        env.TELEGRAM_CHAT_ID ||
        null,

      alertsSent:
        alerts.filter(
          x => x.sent
        ).length,
    },

    scan: {
      cursorBefore:
        cursor,

      cursorAfter:
        nextBlock,

      requestCount:
        rpc.getRequestCount(),

      requestLimit:
        MAX_RPC_REQUESTS,

      requestsRemaining:
        Math.max(
          0,
          MAX_RPC_REQUESTS -
            rpc.getRequestCount()
        ),

      durationMs:
        Date.now() - started,
    },

    candidates,

    alerts,

    diagnostics,

    validation: {
      tokenDiscovery:
        "VERIFIED TOKEN_CREATED EVENT",

      tokenAddress:
        "VERIFIED FROM EVENT",

      erc20Metadata:
        "VERIFIED THROUGH ETH_CALL WHEN REQUEST BUDGET ALLOWS",

      dexPairDiscovery:
        "DEX SCREENER",

      liquidity:
        "DEX SCREENER WHEN AVAILABLE",

      volume:
        "DEX SCREENER WHEN AVAILABLE",

      buySellPressure:
        "DEX SCREENER TRANSACTION DATA",

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
      now(),
  };
}

/* ---------------------------------------------------------
   Health
--------------------------------------------------------- */

async function health(env) {
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
      "/reset",
    ],

    chainId:
      CHAIN_ID,

    chain:
      "Robinhood Chain",

    rpc: {
      primary:
        PRIMARY_RPC,

      fallback:
        null,

      mode:
        "CONSERVATIVE_PRIMARY_ONLY",
    },

    discovery:
      "ETH_GETLOGS_TOKEN_CREATED_CONSERVATIVE",

    marketData:
      "DEX_SCREENER_BATCH",

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ),

    kvConfigured:
      Boolean(env.SCAN_KV),

    paidApiKeyRequired:
      false,

    cloudflareFreeSafeBudget:
      MAX_RPC_REQUESTS,

    timestamp:
      now(),
  };
}

/* ---------------------------------------------------------
   Telegram test
--------------------------------------------------------- */

async function telegramTest(env) {
  const result =
    await sendTelegram(
      env,
      [
        `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test`,
        ``,
        now(),
      ].join("\n")
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    telegramConfigured:
      Boolean(
        env.TELEGRAM_BOT_TOKEN &&
        env.TELEGRAM_CHAT_ID
      ),

    ...result,

    timestamp:
      now(),
  };
}

/* ---------------------------------------------------------
   Reset
--------------------------------------------------------- */

async function reset(env) {
  const deleted =
    await deleteState(env);

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    kvConfigured:
      Boolean(env.SCAN_KV),

    stateDeleted:
      deleted,

    message:
      env.SCAN_KV
        ? "V31 scan cursor reset."
        : "KV is not configured. Scanner uses a rolling latest-block window.",

    timestamp:
      now(),
  };
}

/* ---------------------------------------------------------
   HTTP handler
--------------------------------------------------------- */

export default {
  async fetch(request, env, ctx) {
    if (
      request.method ===
      "OPTIONS"
    ) {
      return new Response(
        null,
        {
          headers:
            CORS_HEADERS,
        }
      );
    }

    const url =
      new URL(
        request.url
      );

    const path =
      url.pathname
        .replace(/\/+$/, "") ||
      "/";

    try {
      if (
        path === "/health"
      ) {
        return json(
          await health(env)
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
        path ===
        "/test-telegram"
      ) {
        return json(
          await telegramTest(env)
        );
      }

      if (
        path === "/reset"
      ) {
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
          "/reset",
        ],

        message:
          "Robinhood Chain Meme Hunter V31",
      });

    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          status:
            "ERROR",

          error:
            error.message,

          dataIntegrity: {
            noFabricatedMetrics:
              true,
          },

          timestamp:
            now(),
        },
        500
      );
    }
  },
};
