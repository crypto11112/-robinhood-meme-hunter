const VERSION = "V39";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

const DEX_API =
  "https://api.dexscreener.com";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const MAX_BLOCKS = 500;
const MAX_RPC_REQUESTS = 3;
const MAX_MARKET_LOOKUPS = 2;

const TELEGRAM_MIN_SCORE = 60;

/*
 * No KV.
 *
 * In-memory duplicate protection only.
 */
const seen = new Map();

const SEEN_TTL =
  30 * 60 * 1000;

function json(
  data,
  status = 200
) {
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

function normaliseAddress(
  value
) {
  if (
    typeof value !==
    "string"
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

/*
 * Extract a possible Ethereum address
 * from a 32-byte ABI word.
 */
function addressFromWord(
  word
) {
  if (
    typeof word !==
    "string"
  ) {
    return null;
  }

  const clean =
    word.replace(
      /^0x/,
      ""
    );

  if (
    clean.length !== 64 ||
    !/^[0-9a-fA-F]+$/.test(
      clean
    )
  ) {
    return null;
  }

  const candidate =
    "0x" +
    clean.slice(-40);

  return normaliseAddress(
    candidate
  );
}

function addressesFromTopics(
  topics
) {
  if (
    !Array.isArray(
      topics
    )
  ) {
    return [];
  }

  const result = [];

  for (
    const topic of topics
  ) {
    const address =
      addressFromWord(
        topic
      );

    if (
      address
    ) {
      result.push(
        address
      );
    }
  }

  return result;
}

function addressesFromData(
  data
) {
  if (
    typeof data !==
      "string" ||
    !data.startsWith(
      "0x"
    )
  ) {
    return [];
  }

  const body =
    data.slice(2);

  const result = [];

  /*
   * ABI dynamic/static data is
   * represented in 32-byte words.
   */
  for (
    let i = 0;
    i + 64 <=
      body.length;
    i += 64
  ) {
    const word =
      body.slice(
        i,
        i + 64
      );

    const address =
      addressFromWord(
        word
      );

    if (
      address
    ) {
      result.push(
        address
      );
    }
  }

  return result;
}

function unique(
  values
) {
  return [
    ...new Set(
      values.filter(
        Boolean
      )
    )
  ];
}

/*
 * Infrastructure addresses that should
 * never be treated as token contracts.
 */
const BLOCKED_ADDRESSES =
  new Set([
    ...ENTRY_CONTRACTS,
    ...LAUNCHPAD_CONTRACTS,
    POOL_MANAGER
  ].map(
    address =>
      address.toLowerCase()
  )
);

function possibleTokenAddresses(
  log
) {
  const candidates =
    unique([
      ...addressesFromTopics(
        log?.topics
      ),

      ...addressesFromData(
        log?.data
      )
    ]);

  return candidates.filter(
    address =>
      !BLOCKED_ADDRESSES.has(
        address
      )
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
        method:
          "POST",

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

  if (
    !response.ok
  ) {
    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }

  const text =
    await response.text();

  let result;

  try {
    result =
      JSON.parse(
        text
      );
  } catch {
    throw new Error(
      "RPC_INVALID_JSON"
    );
  }

  if (
    result?.error
  ) {
    throw new Error(
      result.error.message ||
      "RPC_ERROR"
    );
  }

  return result.result;
}

async function getLatestBlock() {
  return parseInt(
    await rpc(
      "eth_blockNumber",
      []
    ),
    16
  );
}

/*
 * We deliberately do NOT specify a topic.
 *
 * This is important because we do not want
 * V39 to guess the event signature.
 */
async function getLogs(
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

function pruneSeen() {
  const now =
    Date.now();

  for (
    const [
      token,
      timestamp
    ] of seen
  ) {
    if (
      now -
        timestamp >
      SEEN_TTL
    ) {
      seen.delete(
        token
      );
    }
  }
}

/*
 * Optional market enrichment.
 *
 * A 429 here NEVER kills discovery.
 */
async function getMarket(
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

    /*
     * Prefer Robinhood Chain.
     */
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
      (
        a,
        b
      ) =>
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
        Number(
          pair?.marketCap ||
          0
        ),

      fdv:
        Number(
          pair?.fdv ||
          0
        ),

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
        "MARKET_LOOKUP_FAILED"
    });

    return null;
  }
}

function scoreCandidate(
  market
) {
  let score = 20;

  const reasons = [
    "Token discovered from Robinhood Chain on-chain log"
  ];

  if (
    market?.verified
  ) {
    score += 25;

    reasons.push(
      "Robinhood Chain market verified"
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
      "Liquidity > $1K"
    );
  }

  if (
    liquidity >=
    5000
  ) {
    score += 5;
    reasons.push(
      "Liquidity > $5K"
    );
  }

  if (
    liquidity >=
    10000
  ) {
    score += 5;
    reasons.push(
      "Liquidity > $10K"
    );
  }

  if (
    volume >=
    5000
  ) {
    score += 5;
    reasons.push(
      "24h volume > $5K"
    );
  }

  if (
    buys >
      sells &&
    buys >
      0
  ) {
    score += 10;

    reasons.push(
      "Buys currently exceed sells"
    );
  }

  return {
    score:
      Math.min(
        score,
        100
      ),

    reasons
  };
}

function money(
  value
) {
  const n =
    Number(
      value
    );

  if (
    !Number.isFinite(
      n
    ) ||
    n <= 0
  ) {
    return "UNVERIFIED";
  }

  if (
    n >=
    1000000
  ) {
    return (
      "$" +
      (
        n /
        1000000
      ).toFixed(
        2
      ) +
      "M"
    );
  }

  if (
    n >=
    1000
  ) {
    return (
      "$" +
      (
        n /
        1000
      ).toFixed(
        1
      ) +
      "K"
    );
  }

  return (
    "$" +
    n.toFixed(
      2
    )
  );
}

function buildTelegramMessage(
  candidate
) {
  const m =
    candidate.market;

  return [
    "🚨 ROBINHOOD MEME CALL — V39",
    "",
    candidate.symbol
      ? `🔥 $${candidate.symbol}`
      : "🔥 NEW TOKEN",

    candidate.name ||
      "",

    "",
    `🎯 Hunter Score: ${candidate.score}/100`,

    "",
    "📍 CONTRACT",
    candidate.token,

    "",
    "📊 MARKET",
    `Liquidity: ${money(
      m?.liquidityUsd
    )}`,

    `24h Volume: ${money(
      m?.volume24h
    )}`,

    `Buys: ${
      m?.buys24h ??
      "UNVERIFIED"
    }`,

    `Sells: ${
      m?.sells24h ??
      "UNVERIFIED"
    }`,

    `Market Cap: ${money(
      m?.marketCap
    )}`,

    "",
    "🔎 VERIFIED",
    "On-chain discovery: YES",
    `Robinhood market: ${
      m?.verified
        ? "YES"
        : "NO"
    }`,

    "",
    "⚠️ UNVERIFIED",
    "Holder concentration",
    "Smart-money activity",
    "Wallet activity",
    "Accumulation/distribution",

    "",
    "⚠️ HIGH RISK / EARLY STAGE",
    "Automated research alert — not financial advice.",

    m?.url
      ? `Chart: ${m.url}`
      : ""
  ]
    .filter(
      Boolean
    )
    .join(
      "\n"
    )
    .slice(
      0,
      3900
    );
}

async function telegram(
  env,
  message
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  try {
    const response =
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
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
        sent:
          false,

        reason:
          data?.description ||
          "TELEGRAM_FAILED"
      };
    }

    return {
      sent:
        true,

      messageId:
        data?.result?.message_id ||
        null
    };
  } catch (
    error
  ) {
    return {
      sent:
        false,

      reason:
        error?.message ||
        "TELEGRAM_NETWORK_ERROR"
    };
  }
}

async function runScan(
  env
) {
  pruneSeen();

  const diagnostics = [];

  let latestBlock;

  /*
   * RPC request #1
   */
  try {
    latestBlock =
      await getLatestBlock();
  } catch (
    error
  ) {
    return {
      status:
        "RPC_BLOCK_NUMBER_FAILED",

      success:
        false,

      telegram: {
        sent:
          false,

        reason:
          "DISCOVERY_NOT_RUN"
      },

      diagnostics: [
        {
          method:
            "eth_blockNumber",

          error:
            error?.message ||
            "RPC_ERROR"
        }
      ]
    };
  }

  const startBlock =
    Math.max(
      0,
      latestBlock -
        MAX_BLOCKS +
        1
    );

  let logs = [];

  let contractResults =
    [];

  /*
   * RPC requests #2 and #3
   */
  for (
    const contract of
      ENTRY_CONTRACTS
  ) {
    try {
      const result =
        await getLogs(
          contract,
          startBlock,
          latestBlock
        );

      const safe =
        Array.isArray(
          result
        )
          ? result
          : [];

      logs.push(
        ...safe.map(
          log => ({
            ...log,

            sourceContract:
              contract
          })
        )
      );

      contractResults.push({
        contract,

        success:
          true,

        rawLogs:
          safe.length
      });
    } catch (
      error
    ) {
      contractResults.push({
        contract,

        success:
          false,

        rawLogs:
          0,

        error:
          error?.message ||
          "RPC_ERROR"
      });

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
   * V39 discovery decoder.
   */
  const discovered =
    [];

  for (
    const log of
      logs
  ) {
    const addresses =
      possibleTokenAddresses(
        log
      );

    for (
      const token of
        addresses
    ) {
      discovered.push({
        token,

        blockNumber:
          log.blockNumber ||
          null,

        transactionHash:
          log.transactionHash ||
          null,

        logIndex:
          log.logIndex ||
          null,

        sourceContract:
          log.sourceContract ||
          null,

        topics:
          Array.isArray(
            log.topics
          )
            ? log.topics
            : [],

        dataLength:
          typeof log.data ===
          "string"
            ? log.data.length
            : 0
      });
    }
  }

  /*
   * Deduplicate by token.
   */
  const tokenMap =
    new Map();

  for (
    const item of
      discovered
  ) {
    if (
      !tokenMap.has(
        item.token
      )
    ) {
      tokenMap.set(
        item.token,
        item
      );
    }
  }

  const fresh =
    [];

  for (
    const item of
      tokenMap.values()
  ) {
    if (
      !seen.has(
        item.token
      )
    ) {
      fresh.push(
        item
      );
    }
  }

  /*
   * Only enrich a small number of tokens.
   */
  const inspected =
    fresh.slice(
      0,
      MAX_MARKET_LOOKUPS
    );

  const candidates =
    [];

  for (
    const item of
      inspected
  ) {
    seen.set(
      item.token,
      Date.now()
    );

    const market =
      await getMarket(
        item.token,
        diagnostics
      );

    const scoring =
      scoreCandidate(
        market
      );

    candidates.push({
      token:
        item.token,

      blockNumber:
        item.blockNumber,

      transactionHash:
        item.transactionHash,

      logIndex:
        item.logIndex,

      sourceContract:
        item.sourceContract,

      score:
        scoring.score,

      reasons:
        scoring.reasons,

      market:
        market || {
          verified:
            false
        },

      dataIntegrity: {
        onChainDiscovery:
          "VERIFIED",

        marketData:
          market
            ? "AVAILABLE"
            : "UNVERIFIED",

        holderConcentration:
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
    (
      a,
      b
    ) =>
      b.score -
      a.score
  );

  /*
   * Strict Telegram rule.
   *
   * Discovery alone is NOT enough.
   */
  const call =
    candidates.find(
      candidate =>
        candidate.market?.verified &&
        candidate.score >=
          TELEGRAM_MIN_SCORE
    );

  let telegramResult = {
    sent:
      false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (
    call
  ) {
    telegramResult =
      await telegram(
        env,
        buildTelegramMessage(
          call
        )
      );

    telegramResult.token =
      call.token;

    telegramResult.score =
      call.score;
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

    contractResults,

    rawLogs:
      logs.length,

    decodedLogCandidates:
      discovered.length,

    tokensDiscovered:
      fresh.length,

    tokensInspected:
      inspected.length,

    tokens:
      fresh.map(
        item =>
          item.token
      ),

    candidates,

    telegram:
      telegramResult,

    rpcRequests:
      MAX_RPC_REQUESTS,

    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs:
        2
    },

    discovery:
      "RAW_LOG_DECODER",

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
          "RAW_LOG_DECODER",

        entryContracts:
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
          "V39_DISCOVERY_DECODER",

        timestamp:
          new Date().toISOString()
      });
    }

    if (
      path ===
      "/scan"
    ) {
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
          result.success ===
          true,

        scan:
          result,

        timestamp:
          new Date().toISOString()
      });
    }

    if (
      path ===
      "/test-telegram"
    ) {
      const result =
        await telegram(
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

  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScan(
        env
      )
        .then(
          result =>
            console.log(
              "V39 scheduled scan:",
              JSON.stringify(
                result
              )
            )
        )
        .catch(
          error =>
            console.error(
              "V39 scheduled scan failed:",
              error
            )
        )
    );
  }
};
