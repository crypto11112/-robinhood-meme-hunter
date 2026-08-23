const VERSION = "V42";

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
const MAX_TOKEN_LOOKUPS = 5;


/* =========================
   RESPONSE
========================= */

function response(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store"
      }
    }
  );
}


/* =========================
   HELPERS
========================= */

function hex(number) {
  return "0x" + Number(number).toString(16);
}

function address(value) {
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

function formatMoney(value) {
  const n = Number(value || 0);

  if (!Number.isFinite(n) || n <= 0) {
    return "UNVERIFIED";
  }

  if (n >= 1000000000) {
    return "$" + (n / 1000000000).toFixed(2) + "B";
  }

  if (n >= 1000000) {
    return "$" + (n / 1000000).toFixed(2) + "M";
  }

  if (n >= 1000) {
    return "$" + (n / 1000).toFixed(1) + "K";
  }

  return "$" + n.toFixed(2);
}


/* =========================
   ALCHEMY
========================= */

async function rpc(env, method, params) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error("ALCHEMY_API_KEY_NOT_CONFIGURED");
  }

  const url =
    ALCHEMY_BASE +
    env.ALCHEMY_API_KEY;

  const res = await fetch(url, {
    method: "POST",

    headers: {
      "content-type": "application/json"
    },

    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params
    })
  });

  const text = await res.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      "ALCHEMY_INVALID_JSON"
    );
  }

  if (!res.ok) {
    throw new Error(
      data?.error?.message ||
      `ALCHEMY_HTTP_${res.status}`
    );
  }

  if (data?.error) {
    throw new Error(
      data.error.message ||
      "ALCHEMY_RPC_ERROR"
    );
  }

  return data.result;
}


async function latestBlock(env) {
  const result = await rpc(
    env,
    "eth_blockNumber",
    []
  );

  return parseInt(result, 16);
}


/*
 * IMPORTANT:
 *
 * Alchemy Free allows a maximum
 * 10-block eth_getLogs range.
 */
async function logs(
  env,
  contract,
  fromBlock,
  toBlock
) {
  const range =
    toBlock - fromBlock + 1;

  if (range > MAX_LOG_RANGE) {
    throw new Error(
      "BLOCK_RANGE_EXCEEDS_ALCHEMY_FREE_LIMIT"
    );
  }

  return rpc(
    env,
    "eth_getLogs",
    [{
      address: contract,
      fromBlock: hex(fromBlock),
      toBlock: hex(toBlock)
    }]
  );
}


/* =========================
   LOG ADDRESS EXTRACTION
========================= */

function topicAddress(topic) {
  if (
    typeof topic !== "string" ||
    !topic.startsWith("0x")
  ) {
    return null;
  }

  const value = topic.slice(2);

  if (value.length !== 64) {
    return null;
  }

  if (!/^[0-9a-fA-F]+$/.test(value)) {
    return null;
  }

  return address(
    "0x" + value.slice(-40)
  );
}


function dataAddresses(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const value = data.slice(2);
  const result = [];

  for (
    let i = 0;
    i + 64 <= value.length;
    i += 64
  ) {
    const word =
      value.slice(i, i + 64);

    if (!/^[0-9a-fA-F]{64}$/.test(word)) {
      continue;
    }

    const candidate =
      address(
        "0x" +
        word.slice(-40)
      );

    if (candidate) {
      result.push(candidate);
    }
  }

  return result;
}


function extractCandidates(log) {
  const result = [];

  if (Array.isArray(log.topics)) {
    for (const topic of log.topics) {
      const a = topicAddress(topic);

      if (a) {
        result.push(a);
      }
    }
  }

  for (
    const a of dataAddresses(log.data)
  ) {
    result.push(a);
  }

  return unique(result);
}


/* =========================
   ON-CHAIN SCAN
========================= */

async function scanContract(
  env,
  contract,
  fromBlock,
  toBlock
) {
  try {
    const result = await logs(
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

    for (const log of safeLogs) {
      const addresses =
        extractCandidates(log);

      for (const token of addresses) {
        if (
          DISCOVERY_CONTRACTS.includes(
            token
          )
        ) {
          continue;
        }

        candidates.push({
          token,

          blockNumber:
            log.blockNumber || null,

          transactionHash:
            log.transactionHash || null
        });
      }
    }

    return {
      success: true,
      contract,
      rawLogs: safeLogs.length,
      candidates
    };

  } catch (error) {
    return {
      success: false,
      contract,
      rawLogs: 0,
      candidates: [],
      error:
        error?.message ||
        "GET_LOGS_FAILED"
    };
  }
}


/* =========================
   DISCOVERY
========================= */

async function discover(
  env,
  latest
) {
  const toBlock = latest;

  /*
   * Exactly 10 blocks.
   */
  const fromBlock =
    Math.max(
      0,
      latest - 9
    );

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

    results.push(result);
  }

  const tokenMap = new Map();

  for (const result of results) {
    for (
      const item of
      result.candidates
    ) {
      if (!tokenMap.has(item.token)) {
        tokenMap.set(
          item.token,
          {
            token: item.token,
            source: result.contract,
            blockNumber:
              item.blockNumber,
            transactionHash:
              item.transactionHash
          }
        );
      }
    }
  }

  return {
    fromBlock,
    toBlock,
    results,
    tokens:
      [...tokenMap.values()]
  };
}


/* =========================
   DEXSCREENER
========================= */

async function marketData(
  token,
  diagnostics
) {
  try {
    const url =
      `${DEX_BASE}/latest/dex/tokens/${token}`;

    const res =
      await fetch(url);

    if (!res.ok) {
      diagnostics.push({
        source: "dexscreener",
        token,
        error:
          `HTTP_${res.status}`
      });

      return null;
    }

    const data =
      await res.json();

    const pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];

    if (!pairs.length) {
      return null;
    }

    const robinhood =
      pairs.filter(
        p =>
          String(
            p?.chainId || ""
          ).toLowerCase() ===
          "robinhood"
      );

    const available =
      robinhood.length
        ? robinhood
        : pairs;

    available.sort(
      (a, b) =>
        Number(
          b?.liquidity?.usd || 0
        ) -
        Number(
          a?.liquidity?.usd || 0
        )
    );

    const p = available[0];

    return {
      verifiedRobinhood:
        String(
          p?.chainId || ""
        ).toLowerCase() ===
        "robinhood",

      name:
        p?.baseToken?.name || null,

      symbol:
        p?.baseToken?.symbol || null,

      pairAddress:
        p?.pairAddress || null,

      url:
        p?.url || null,

      marketCap:
        Number(
          p?.marketCap || 0
        ),

      liquidity:
        Number(
          p?.liquidity?.usd || 0
        ),

      volume24h:
        Number(
          p?.volume?.h24 || 0
        ),

      buys:
        Number(
          p?.txns?.h24?.buys || 0
        ),

      sells:
        Number(
          p?.txns?.h24?.sells || 0
        ),

      change1h:
        Number(
          p?.priceChange?.h1 || 0
        ),

      change6h:
        Number(
          p?.priceChange?.h6 || 0
        ),

      change24h:
        Number(
          p?.priceChange?.h24 || 0
        )
    };

  } catch (error) {
    diagnostics.push({
      source: "dexscreener",
      token,
      error:
        error?.message ||
        "DEX_LOOKUP_FAILED"
    });

    return null;
  }
}


/* =========================
   SCORE
========================= */

function score(market) {
  if (!market) {
    return {
      score: 0,
      reasons: [
        "No market data"
      ]
    };
  }

  let total = 0;
  const reasons = [];

  if (market.verifiedRobinhood) {
    total += 30;
    reasons.push(
      "Robinhood Chain market verified"
    );
  }

  if (market.liquidity >= 1000) {
    total += 5;
    reasons.push(
      "Liquidity above $1K"
    );
  }

  if (market.liquidity >= 10000) {
    total += 10;
    reasons.push(
      "Liquidity above $10K"
    );
  }

  if (market.volume24h >= 5000) {
    total += 5;
    reasons.push(
      "24h volume above $5K"
    );
  }

  if (market.volume24h >= 25000) {
    total += 5;
    reasons.push(
      "24h volume above $25K"
    );
  }

  if (
    market.buys >
    market.sells
  ) {
    total += 10;
    reasons.push(
      "Buy count exceeds sell count"
    );
  }

  if (market.change1h > 0) {
    total += 5;
    reasons.push(
      "Positive 1h momentum"
    );
  }

  if (market.change6h > 0) {
    total += 5;
    reasons.push(
      "Positive 6h momentum"
    );
  }

  return {
    score:
      Math.min(100, total),

    reasons
  };
}


/* =========================
   TELEGRAM
========================= */

async function telegram(
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
      await fetch(url, {
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
            false
        })
      });

    const data =
      await res.json();

    if (
      !res.ok ||
      !data.ok
    ) {
      return {
        sent: false,
        reason:
          data?.description ||
          `HTTP_${res.status}`
      };
    }

    return {
      sent: true,
      messageId:
        data?.result?.message_id ||
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


function telegramMessage(candidate) {
  const m = candidate.market;

  return [
    "🚨 ROBINHOOD CHAIN MEME CALL",
    "",
    `🔥 $${m.symbol || "UNKNOWN"}`,
    m.name || "",
    "",
    `🎯 SCORE: ${candidate.score}/100`,
    "",
    "📍 CONTRACT",
    candidate.token,
    "",
    "📊 MARKET",
    `Market Cap: ${formatMoney(m.marketCap)}`,
    `Liquidity: ${formatMoney(m.liquidity)}`,
    `24h Volume: ${formatMoney(m.volume24h)}`,
    `Buys: ${m.buys}`,
    `Sells: ${m.sells}`,
    `1h: ${m.change1h}%`,
    `6h: ${m.change6h}%`,
    "",
    "🧠 REASONS",
    ...candidate.reasons.map(
      x => `• ${x}`
    ),
    "",
    "⚠️ UNVERIFIED",
    "Holder concentration",
    "Smart-money wallets",
    "Wallet accumulation/distribution",
    "",
    "High-risk automated research alert.",
    m.url
      ? `📈 ${m.url}`
      : ""
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3900);
}


/* =========================
   MAIN SCAN
========================= */

async function runScan(env) {
  const diagnostics = [];

  let latest;

  try {
    latest =
      await latestBlock(env);
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

  const inspect =
    discovery.tokens.slice(
      0,
      MAX_TOKEN_LOOKUPS
    );

  const candidates = [];

  for (
    const item of inspect
  ) {
    const market =
      await marketData(
        item.token,
        diagnostics
      );

    if (!market) {
      continue;
    }

    const result =
      score(market);

    candidates.push({
      token:
        item.token,

      source:
        item.source,

      blockNumber:
        item.blockNumber,

      transactionHash:
        item.transactionHash,

      market,

      score:
        result.score,

      reasons:
        result.reasons
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

  const winner =
    candidates.find(
      c =>
        c.score >= MIN_SCORE &&
        c.market?.verifiedRobinhood
    );

  if (winner) {
    telegramResult =
      await telegram(
        env,
        telegramMessage(
          winner
        )
      );

    telegramResult.token =
      winner.token;

    telegramResult.score =
      winner.score;
  }

  return {
    status: "OK",
    success: true,

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
        (sum, x) =>
          sum +
          x.rawLogs,
        0
      ),

    tokensDiscovered:
      discovery.tokens.length,

    tokensInspected:
      inspect.length,

    tokens:
      discovery.tokens.map(
        x => x.token
      ),

    candidates,

    telegram:
      telegramResult,

    rpcProvider:
      "ALCHEMY",

    rpcArchitecture:
      "10_BLOCK_WINDOW",

    rpcRequests:
      1 +
      DISCOVERY_CONTRACTS.length,

    rpcBreakdown: {
      eth_blockNumber: 1,
      eth_getLogs:
        DISCOVERY_CONTRACTS.length
    },

    discovery:
      "ALCHEMY_ON_CHAIN_FIRST_V42",

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


/* =========================
   WORKER
========================= */

export default {

  async fetch(request, env) {
    const url =
      new URL(request.url);

    if (
      url.pathname ===
      "/health"
    ) {
      return response({
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

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "V42_ALCHEMY_10_BLOCK",

        timestamp:
          new Date().toISOString()
      });
    }


    if (
      url.pathname ===
      "/scan"
    ) {
      try {
        const result =
          await runScan(env);

        return response({
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
        return response({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success: false,

          error:
            error?.message ||
            "SCAN_FAILED",

          timestamp:
            new Date().toISOString()
        }, 500);
      }
    }


    if (
      url.pathname ===
      "/test-telegram"
    ) {
      const result =
        await telegram(
          env,

          [
            `✅ Robinhood Chain Meme Hunter ${VERSION}`,
            "",
            "Telegram connection test successful.",
            "",
            new Date().toISOString()
          ].join("\n")
        );

      return response({
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


    return response({
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
        "Robinhood Chain Meme Hunter V42"
    });
  },


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
                "V42_SCHEDULED_SCAN",

              status:
                result.status,

              tokens:
                result.tokensDiscovered,

              candidates:
                result.candidates?.length || 0,

              telegram:
                result.telegram
            })
          );
        })
        .catch(error => {
          console.error(
            "V42 scheduled scan failed",
            error
          );
        })
    );
  }
};
