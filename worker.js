const VERSION = "V38";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

const DEX_API =
  "https://api.dexscreener.com";

const TELEGRAM_MIN_SCORE = 60;

/*
 * Robinhood / pools.trade entry contracts
 */
const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

/*
 * Known Robinhood launchpads
 */
const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

/*
 * Uniswap V4 PoolManager
 */
const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

/*
 * Keep the scan deliberately small.
 *
 * 1 x eth_blockNumber
 * 2 x eth_getLogs
 *
 * Maximum base RPC requests = 3.
 */
const MAX_BLOCKS = 500;

const MAX_RPC_REQUESTS = 3;

/*
 * External market enrichment is OPTIONAL.
 *
 * If DEX Screener returns 429, the on-chain
 * discovery still succeeds.
 */
const MAX_MARKET_LOOKUPS = 2;

/*
 * In-memory duplicate protection.
 *
 * No KV required.
 */
const seenTokens =
  new Map();

const SEEN_TTL =
  30 * 60 * 1000;

function json(data, status = 200) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
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

function normaliseAddress(value) {
  if (
    typeof value !== "string"
  ) {
    return null;
  }

  if (
    /^0x[a-fA-F0-9]{40}$/.test(
      value
    )
  ) {
    return value.toLowerCase();
  }

  return null;
}

function topicAddress(topic) {
  if (
    typeof topic !== "string"
  ) {
    return null;
  }

  if (
    !/^0x[a-fA-F0-9]{64}$/.test(
      topic
    )
  ) {
    return null;
  }

  return normaliseAddress(
    "0x" +
    topic.slice(-40)
  );
}

function dataAddresses(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const body =
    data.slice(2);

  const result = [];

  /*
   * ABI words are 32 bytes / 64 hex chars.
   */
  for (
    let i = 0;
    i + 64 <= body.length;
    i += 64
  ) {
    const word =
      body.slice(
        i,
        i + 64
      );

    const candidate =
      normaliseAddress(
        "0x" +
        word.slice(-40)
      );

    if (
      candidate
    ) {
      result.push(
        candidate
      );
    }
  }

  return result;
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

/*
 * Extract every plausible address from a log.
 *
 * We deliberately don't hard-code a possibly
 * incorrect event signature. V35 proved that
 * raw eth_getLogs against these contracts
 * can discover token-created logs.
 */
function addressesFromLog(log) {
  const addresses = [];

  if (
    Array.isArray(
      log?.topics
    )
  ) {
    for (
      const topic of log.topics
    ) {
      const addr =
        topicAddress(
          topic
        );

      if (
        addr
      ) {
        addresses.push(
          addr
        );
      }
    }
  }

  addresses.push(
    ...dataAddresses(
      log?.data
    )
  );

  return unique(
    addresses
  );
}

async function rpc(
  method,
  params
) {
  const response =
    await fetch(
      RPC_URL,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json"
        },

        body:
          JSON.stringify({
            jsonrpc:
              "2.0",

            id: 1,

            method,

            params
          })
      }
    );

  if (
    response.status ===
    429
  ) {
    throw new Error(
      "RPC_RATE_LIMITED"
    );
  }

  const text =
    await response.text();

  if (
    !response.ok
  ) {
    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }

  let data;

  try {
    data =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      "RPC_INVALID_JSON"
    );
  }

  if (
    data?.error
  ) {
    throw new Error(
      data.error.message ||
      "RPC_ERROR"
    );
  }

  return data.result;
}

async function getLatestBlock() {
  const result =
    await rpc(
      "eth_blockNumber",
      []
    );

  return parseInt(
    result,
    16
  );
}

/*
 * V38 primary discovery.
 *
 * Two calls:
 * one for each known entry contract.
 */
async function getLogsForContract(
  contract,
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address:
        contract,

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
    }]
  );
}

/*
 * Remove obvious infrastructure addresses.
 */
function filterTokenAddresses(
  addresses
) {
  const blocked =
    new Set([
      ...ENTRY_CONTRACTS,
      ...LAUNCHPAD_CONTRACTS,
      POOL_MANAGER
    ].map(
      address =>
        address.toLowerCase()
    ));

  return unique(
    addresses.filter(
      address =>
        !blocked.has(
          address
        )
    )
  );
}

function blockToNumber(
  value
) {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  if (
    !/^0x[0-9a-f]+$/i.test(
      value
    )
  ) {
    return null;
  }

  return parseInt(
    value,
    16
  );
}

/*
 * Optional DEX lookup.
 *
 * This NEVER causes a scan to fail.
 */
async function marketLookup(
  token,
  diagnostics
) {
  try {
    const response =
      await fetch(
        `${DEX_API}/latest/dex/tokens/${token}`,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (
      response.status ===
      429
    ) {
      diagnostics.push({
        source:
          "dexscreener",

        token,

        error:
          "HTTP_429"
      });

      return null;
    }

    if (
      !response.ok
    ) {
      diagnostics.push({
        source:
          "dexscreener",

        token,

        error:
          `HTTP_${response.status}`
      });

      return null;
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(
        data?.pairs
      )
        ? data.pairs
        : [];

    const robinhood =
      pairs.filter(
        pair =>
          String(
            pair?.chainId ||
            ""
          ).toLowerCase() ===
          "robinhood"
      );

    const usable =
      robinhood.length
        ? robinhood
        : pairs;

    if (
      !usable.length
    ) {
      return null;
    }

    usable.sort(
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
      usable[0];

    return {
      verified:
        String(
          pair?.chainId ||
          ""
        ).toLowerCase() ===
        "robinhood",

      chainId:
        pair?.chainId ||
        null,

      dexId:
        pair?.dexId ||
        null,

      pairAddress:
        pair?.pairAddress ||
        null,

      url:
        pair?.url ||
        null,

      name:
        pair?.baseToken?.name ||
        null,

      symbol:
        pair?.baseToken?.symbol ||
        null,

      priceUsd:
        pair?.priceUsd ||
        null,

      marketCap:
        pair?.marketCap ||
        null,

      fdv:
        pair?.fdv ||
        null,

      liquidityUsd:
        Number(
          pair?.liquidity?.usd ||
          0
        ),

      volume24h:
        Number(
          pair?.volume?.h24 ||
          0
        ),

      buys24h:
        Number(
          pair?.txns?.h24?.buys ||
          0
        ),

      sells24h:
        Number(
          pair?.txns?.h24?.sells ||
          0
        )
    };
  } catch (
    error
  ) {
    diagnostics.push({
      source:
        "dexscreener",

      token,

      error:
        error?.message ||
        "LOOKUP_FAILED"
    });

    return null;
  }
}

function calculateScore(
  token,
  market
) {
  let score = 20;

  const reasons = [
    "New token discovered directly from Robinhood Chain on-chain logs"
  ];

  /*
   * A discovered token starts at 20.
   *
   * We do NOT pretend that holders,
   * smart-money or accumulation data
   * is available.
   */

  if (
    market?.verified
  ) {
    score += 25;

    reasons.push(
      "Robinhood Chain trading pair verified"
    );
  }

  const liquidity =
    Number(
      market?.liquidityUsd ||
      0
    );

  const volume =
    Number(
      market?.volume24h ||
      0
    );

  const buys =
    Number(
      market?.buys24h ||
      0
    );

  const sells =
    Number(
      market?.sells24h ||
      0
    );

  if (
    liquidity >=
    1000
  ) {
    score += 5;

    reasons.push(
      "Liquidity above $1K"
    );
  }

  if (
    liquidity >=
    5000
  ) {
    score += 5;

    reasons.push(
      "Liquidity above $5K"
    );
  }

  if (
    liquidity >=
    10000
  ) {
    score += 5;

    reasons.push(
      "Liquidity above $10K"
    );
  }

  if (
    volume >=
    5000
  ) {
    score += 5;

    reasons.push(
      "Meaningful 24h volume"
    );
  }

  if (
    buys > sells &&
    buys > 0
  ) {
    score += 10;

    reasons.push(
      "Buy count currently exceeds sell count"
    );
  }

  /*
   * Hard cap.
   */
  score =
    Math.min(
      100,
      score
    );

  return {
    score,
    reasons
  };
}

function money(
  value
) {
  const n =
    Number(value);

  if (
    !Number.isFinite(n) ||
    n <= 0
  ) {
    return "UNVERIFIED";
  }

  if (
    n >= 1000000
  ) {
    return (
      "$" +
      (
        n / 1000000
      ).toFixed(2) +
      "M"
    );
  }

  if (
    n >= 1000
  ) {
    return (
      "$" +
      (
        n / 1000
      ).toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    n.toFixed(2)
  );
}

function telegramMessage(
  candidate
) {
  const market =
    candidate.market;

  const lines = [
    "🚨 ROBINHOOD MEME CALL — V38",
    "",
    candidate.symbol
      ? `🔥 $${candidate.symbol}`
      : "🔥 NEW ROBINHOOD TOKEN",

    candidate.name ||
      "",

    "",

    `Hunter Score: ${candidate.score}/100`,

    "",

    "📍 CONTRACT",

    candidate.token,

    "",

    "📊 MARKET DATA",

    `Liquidity: ${money(
      market?.liquidityUsd
    )}`,

    `24h Volume: ${money(
      market?.volume24h
    )}`,

    `Buys: ${
      market?.buys24h ??
      "UNVERIFIED"
    }`,

    `Sells: ${
      market?.sells24h ??
      "UNVERIFIED"
    }`,

    `Market Cap: ${money(
      market?.marketCap
    )}`,

    "",

    "🎯 SIGNALS",

    ...candidate.reasons.map(
      reason =>
        "• " +
        reason
    ),

    "",

    "🔬 DATA INTEGRITY",

    "On-chain discovery: VERIFIED",

    `Robinhood market: ${
      market?.verified
        ? "VERIFIED"
        : "UNVERIFIED"
    }`,

    "Holder concentration: UNVERIFIED",

    "Smart money: UNVERIFIED",

    "Wallet activity: UNVERIFIED",

    "Accumulation/distribution: UNVERIFIED",

    "",

    "⚠️ VERY HIGH RISK / EARLY STAGE",

    "Automated research alert — not financial advice.",

    market?.url
      ? ""
      : "",

    market?.url
      ? `Chart: ${market.url}`
      : ""
  ];

  return lines
    .join("\n")
    .slice(
      0,
      3900
    );
}

async function sendTelegram(
  env,
  message
) {
  if (
    !env.TELEGRAM_BOT_TOKEN
  ) {
    return {
      sent: false,

      reason:
        "TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
    };
  }

  if (
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,

      reason:
        "TELEGRAM_CHAT_ID_NOT_CONFIGURED"
    };
  }

  try {
    const response =
      await fetch(
        "https://api.telegram.org/bot" +
        env.TELEGRAM_BOT_TOKEN +
        "/sendMessage",
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
                message,

              disable_web_page_preview:
                false
            })
        }
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        sent: false,

        reason:
          data?.description ||
          "TELEGRAM_SEND_FAILED"
      };
    }

    return {
      sent: true,

      messageId:
        data?.result?.message_id ||
        null
    };
  } catch (
    error
  ) {
    return {
      sent: false,

      reason:
        error?.message ||
        "TELEGRAM_NETWORK_ERROR"
    };
  }
}

function pruneSeen() {
  const now =
    Date.now();

  for (
    const [
      token,
      timestamp
    ] of seenTokens
  ) {
    if (
      now - timestamp >
      SEEN_TTL
    ) {
      seenTokens.delete(
        token
      );
    }
  }
}

async function scan(
  env
) {
  pruneSeen();

  const diagnostics = [];

  let latestBlock;

  /*
   * Request #1
   */
  try {
    latestBlock =
      await getLatestBlock();
  } catch (
    error
  ) {
    return {
      status:
        "RPC_RATE_LIMITED",

      success:
        false,

      rpcRequests:
        1,

      diagnostics: [
        {
          method:
            "eth_blockNumber",

          error:
            error?.message ||
            "RPC_ERROR"
        }
      ],

      telegram: {
        sent: false,

        reason:
          "BLOCK_NUMBER_FAILED"
      }
    };
  }

  const startBlock =
    Math.max(
      0,
      latestBlock -
        MAX_BLOCKS +
        1
    );

  let allLogs = [];

  /*
   * Requests #2 and #3.
   */
  for (
    const contract of
      ENTRY_CONTRACTS
  ) {
    try {
      const logs =
        await getLogsForContract(
          contract,
          startBlock,
          latestBlock
        );

      if (
        Array.isArray(
          logs
        )
      ) {
        allLogs =
          allLogs.concat(
            logs.map(
              log => ({
                ...log,

                sourceContract:
                  contract
              })
            )
          );
      }
    } catch (
      error
    ) {
      diagnostics.push({
        method:
          "eth_getLogs",

        contract,

        error:
          error?.message ||
          "RPC_ERROR"
      });
    }
  }

  /*
   * Extract addresses from logs.
   */
  const discoveredAddresses =
    filterTokenAddresses(
      allLogs.flatMap(
        log =>
          addressesFromLog(
            log
          )
      )
    );

  /*
   * Keep newest-looking discoveries first.
   */
  const discoveredTokens =
    [];

  for (
    const token of
      discoveredAddresses
  ) {
    if (
      !seenTokens.has(
        token
      )
    ) {
      discoveredTokens.push(
        token
      );
    }
  }

  /*
   * Only enrich TWO tokens per scan.
   * This protects DEX Screener and the
   * Cloudflare Worker from unnecessary load.
   */
  const tokensToEnrich =
    discoveredTokens.slice(
      0,
      MAX_MARKET_LOOKUPS
    );

  const candidates = [];

  for (
    const token of
      tokensToEnrich
  ) {
    /*
     * Mark as seen before enrichment.
     * This prevents repeated Telegram spam.
     */
    seenTokens.set(
      token,
      Date.now()
    );

    const market =
      await marketLookup(
        token,
        diagnostics
      );

    const scoring =
      calculateScore(
        token,
        market
      );

    candidates.push({
      token,

      name:
        market?.name ||
        null,

      symbol:
        market?.symbol ||
        null,

      score:
        scoring.score,

      reasons:
        scoring.reasons,

      market:
        market || {
          verified:
            false
        },

      discovery: {
        source:
          "ROBINHOOD_CHAIN_LOG",

        sourceContracts:
          ENTRY_CONTRACTS,

        logCount:
          allLogs.length
      },

      dataIntegrity: {
        onChainDiscovery:
          "VERIFIED",

        marketData:
          market
            ? "DEXSCREENER"
            : "UNVERIFIED",

        holders:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        walletActivity:
          "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED"
      }
    });
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  /*
   * IMPORTANT:
   *
   * We only make an automatic "Meme Call"
   * when we have BOTH:
   *
   * 1. on-chain discovery
   * 2. verified Robinhood market
   * 3. score >= 60
   *
   * This prevents random log addresses
   * becoming Telegram calls.
   */
  const qualifying =
    candidates.find(
      candidate =>
        candidate.market?.verified &&
        candidate.score >=
          TELEGRAM_MIN_SCORE
    );

  let telegram = {
    sent: false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying
  ) {
    telegram =
      await sendTelegram(
        env,

        telegramMessage(
          qualifying
        )
      );

    telegram.token =
      qualifying.token;

    telegram.score =
      qualifying.score;
  }

  return {
    status:
      "OK",

    success:
      true,

    latestBlock,

    startBlock,

    endBlock:
      latestBlock,

    blocksScanned:
      latestBlock -
      startBlock +
      1,

    rawLogs:
      allLogs.length,

    tokensDiscovered:
      discoveredTokens.length,

    tokensInspected:
      tokensToEnrich.length,

    tokens:
      discoveredTokens,

    candidates,

    telegram,

    rpcRequests:
      MAX_RPC_REQUESTS,

    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs:
        2
    },

    rpcArchitecture:
      "ON_CHAIN_FIRST",

    maximumMarketLookups:
      MAX_MARKET_LOOKUPS,

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

      launchpadContracts:
        LAUNCHPAD_CONTRACTS,

      poolManager:
        POOL_MANAGER
    },

    kvRequired:
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

export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(
        request.url
      );

    const path =
      url.pathname;

    /*
     * HEALTH
     */
    if (
      path ===
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
            RPC_URL
        },

        discovery:
          "ON_CHAIN_FIRST",

        discoveryContracts:
          ENTRY_CONTRACTS,

        poolManager:
          POOL_MANAGER,

        marketData:
          "OPTIONAL_DEXSCREENER",

        telegram: {
          configured:
            Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),

          automaticCalls:
            true,

          minimumScore:
            TELEGRAM_MIN_SCORE
        },

        kvRequired:
          false,

        kvConfigured:
          false,

        rpcBudget:
          "3 BASE REQUESTS",

        architecture:
          "V38_ON_CHAIN_FIRST",

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * SCAN
     */
    if (
      path ===
      "/scan"
    ) {
      const result =
        await scan(
          env
        );

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          result.success ===
          true,

        scan:
          result,

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * TELEGRAM TEST
     */
    if (
      path ===
      "/test-telegram"
    ) {
      const result =
        await sendTelegram(
          env,

          `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
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
      ]
    });
  },

  /*
   * Cloudflare Cron.
   *
   * Configure the trigger separately.
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
              "V38 scheduled scan:",
              JSON.stringify(
                result
              )
            );
          }
        )
        .catch(
          error => {
            console.error(
              "V38 scheduled scan failed:",
              error
            );
          }
        )
    );
  }
};
