const VERSION = "V41";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const ALCHEMY_RPC =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2"
];

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const DEXSCREENER =
  "https://api.dexscreener.com";

const TELEGRAM_MINIMUM_SCORE = 60;

/*
 * V41 deliberately starts with a tiny range.
 * Once that works, the scanner can expand safely.
 */
const DIAGNOSTIC_BLOCK_RANGE = 10;
const NORMAL_BLOCK_RANGE = 500;

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

function hexBlock(number) {
  return (
    "0x" +
    Number(number)
      .toString(16)
  );
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

function topicAddress(topic) {
  if (
    typeof topic !== "string" ||
    !topic.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    topic.slice(2);

  if (
    clean.length !== 64 ||
    !/^[0-9a-fA-F]{64}$/.test(clean)
  ) {
    return null;
  }

  return address(
    "0x" +
    clean.slice(-40)
  );
}

function dataAddresses(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const clean =
    data.slice(2);

  const result = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    const word =
      clean.slice(i, i + 64);

    if (
      /^[0-9a-fA-F]{64}$/.test(word)
    ) {
      const candidate =
        address(
          "0x" +
          word.slice(-40)
        );

      if (candidate) {
        result.push(candidate);
      }
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

const excluded =
  new Set([
    ...ENTRY_CONTRACTS,
    ...LAUNCHPAD_CONTRACTS,
    POOL_MANAGER
  ].map(
    x => x.toLowerCase()
  ));

function addressesFromLog(log) {
  return unique([
    ...(Array.isArray(log?.topics)
      ? log.topics
          .map(topicAddress)
          .filter(Boolean)
      : []),

    ...dataAddresses(
      log?.data
    )
  ]).filter(
    x => !excluded.has(x)
  );
}

/*
 * IMPORTANT:
 *
 * V41 returns the actual Alchemy response,
 * including JSON-RPC error code/message/data.
 */
async function rpc(env, method, params) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY_NOT_CONFIGURED"
    );
  }

  const endpoint =
    ALCHEMY_RPC +
    env.ALCHEMY_API_KEY;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
          accept:
            "application/json"
        },

        body:
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method,
            params
          })
      }
    );

  const raw =
    await response.text();

  let body;

  try {
    body =
      JSON.parse(raw);
  } catch {
    body = {
      raw
    };
  }

  if (!response.ok) {
    const error =
      new Error(
        body?.error?.message ||
        `ALCHEMY_HTTP_${response.status}`
      );

    error.status =
      response.status;

    error.rpcError =
      body?.error || null;

    error.raw =
      raw.slice(0, 3000);

    throw error;
  }

  if (body?.error) {
    const error =
      new Error(
        body.error.message ||
        "ALCHEMY_RPC_ERROR"
      );

    error.status =
      response.status;

    error.rpcError =
      body.error;

    throw error;
  }

  return body.result;
}

async function blockNumber(env) {
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
  from,
  to
) {
  return rpc(
    env,
    "eth_getLogs",
    [{
      address:
        contract,

      fromBlock:
        hexBlock(from),

      toBlock:
        hexBlock(to)
    }]
  );
}

function rpcDiagnostic(error) {
  return {
    error:
      error?.message ||
      "UNKNOWN_ERROR",

    httpStatus:
      error?.status ??
      null,

    rpcError:
      error?.rpcError ??
      null,

    raw:
      error?.raw ??
      null
  };
}

async function testLogs(
  env,
  latest
) {
  const from =
    Math.max(
      0,
      latest -
      DIAGNOSTIC_BLOCK_RANGE +
      1
    );

  const results = [];

  for (
    const contract of ENTRY_CONTRACTS
  ) {
    try {
      const logs =
        await getLogs(
          env,
          contract,
          from,
          latest
        );

      results.push({
        contract,
        success: true,
        fromBlock: from,
        toBlock: latest,
        blockRange:
          latest - from + 1,
        rawLogs:
          Array.isArray(logs)
            ? logs.length
            : 0
      });

    } catch (error) {
      results.push({
        contract,
        success: false,
        fromBlock: from,
        toBlock: latest,
        blockRange:
          latest - from + 1,

        diagnostic:
          rpcDiagnostic(
            error
          )
      });
    }
  }

  return {
    fromBlock: from,
    toBlock: latest,
    blockRange:
      latest - from + 1,
    contracts:
      results
  };
}

async function discover(
  env,
  from,
  to
) {
  const logs = [];
  const contractResults = [];

  for (
    const contract of ENTRY_CONTRACTS
  ) {
    try {
      const result =
        await getLogs(
          env,
          contract,
          from,
          to
        );

      const safe =
        Array.isArray(result)
          ? result
          : [];

      logs.push(
        ...safe.map(
          log => ({
            ...log,
            discoveryContract:
              contract
          })
        )
      );

      contractResults.push({
        contract,
        success: true,
        rawLogs:
          safe.length
      });

    } catch (error) {
      contractResults.push({
        contract,
        success: false,
        rawLogs: 0,
        diagnostic:
          rpcDiagnostic(
            error
          )
      });
    }
  }

  const discovered =
    new Map();

  for (
    const log of logs
  ) {
    const addresses =
      addressesFromLog(
        log
      );

    for (
      const token of addresses
    ) {
      if (
        !discovered.has(token)
      ) {
        discovered.set(
          token,
          {
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

            discoveryContract:
              log.discoveryContract
          }
        );
      }
    }
  }

  return {
    logs,
    contractResults,
    discovered:
      [...discovered.values()]
  };
}

async function marketData(
  token,
  diagnostics
) {
  try {
    const url =
      `${DEXSCREENER}/latest/dex/tokens/${token}`;

    const result =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );

    const raw =
      await result.text();

    let body;

    try {
      body =
        JSON.parse(raw);
    } catch {
      body = {};
    }

    if (!result.ok) {
      diagnostics.push({
        source:
          "dexscreener",

        token,

        error:
          `HTTP_${result.status}`
      });

      return null;
    }

    const pairs =
      Array.isArray(
        body?.pairs
      )
        ? body.pairs
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

    const selected =
      robinhood.length
        ? robinhood
        : pairs;

    if (!selected.length) {
      return null;
    }

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

  } catch (error) {
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

function calculateScore(
  market
) {
  let score = 20;

  const reasons = [
    "Discovered from Robinhood Chain on-chain logs"
  ];

  if (
    market?.verified
  ) {
    score += 25;

    reasons.push(
      "Robinhood market verified"
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
    liquidity >= 1000
  ) {
    score += 5;
    reasons.push(
      "Liquidity > $1K"
    );
  }

  if (
    liquidity >= 5000
  ) {
    score += 5;
    reasons.push(
      "Liquidity > $5K"
    );
  }

  if (
    liquidity >= 10000
  ) {
    score += 5;
    reasons.push(
      "Liquidity > $10K"
    );
  }

  if (
    volume >= 5000
  ) {
    score += 5;
    reasons.push(
      "24h volume > $5K"
    );
  }

  if (
    buys > sells &&
    buys > 0
  ) {
    score += 10;
    reasons.push(
      "Buys exceed sells"
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

function money(value) {
  const n =
    Number(value);

  if (
    !Number.isFinite(n) ||
    n <= 0
  ) {
    return "UNVERIFIED";
  }

  if (
    n >= 1_000_000
  ) {
    return (
      "$" +
      (
        n /
        1_000_000
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
        n /
        1000
      ).toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    n.toFixed(2)
  );
}

function callMessage(
  candidate
) {
  const market =
    candidate.market;

  return [
    "🚨 ROBINHOOD MEME CALL — V41",
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

    "📊 VERIFIED MARKET DATA",

    `Liquidity: ${
      money(
        market?.liquidityUsd
      )
    }`,

    `24h Volume: ${
      money(
        market?.volume24h
      )
    }`,

    `Buys: ${
      market?.buys24h ??
      "UNVERIFIED"
    }`,

    `Sells: ${
      market?.sells24h ??
      "UNVERIFIED"
    }`,

    `Market Cap: ${
      money(
        market?.marketCap
      )
    }`,

    "",

    "🔎 DISCOVERY",
    "On-chain discovery: VERIFIED",
    `Robinhood market: ${
      market?.verified
        ? "VERIFIED"
        : "UNVERIFIED"
    }`,

    "",

    "⚠️ NOT VERIFIED",
    "Holder concentration",
    "Smart-money activity",
    "Wallet activity",
    "Accumulation/distribution",

    "",

    "⚠️ HIGH-RISK EARLY-STAGE TOKEN",
    "Automated research alert — not financial advice.",

    market?.url
      ? `Chart: ${market.url}`
      : ""
  ]
    .filter(Boolean)
    .join("\n")
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
      sent: false,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  try {
    const result =
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

    const body =
      await result.json();

    if (
      !result.ok ||
      !body?.ok
    ) {
      return {
        sent: false,

        reason:
          body?.description ||
          "TELEGRAM_FAILED"
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
        "TELEGRAM_NETWORK_ERROR"
    };
  }
}

async function scan(
  env
) {
  const diagnostics = [];

  let latest;

  /*
   * Step 1:
   * Verify Alchemy connection.
   */
  try {
    latest =
      await blockNumber(
        env
      );
  } catch (error) {
    return {
      status:
        "ALCHEMY_CONNECTION_FAILED",

      success:
        false,

      diagnostics: [{
        method:
          "eth_blockNumber",

        ...rpcDiagnostic(
          error
        )
      }],

      telegram: {
        sent: false,

        reason:
          "DISCOVERY_FAILED"
      }
    };
  }

  /*
   * Step 2:
   * Tiny diagnostic test.
   *
   * This is intentionally only 10 blocks.
   */
  const diagnostic =
    await testLogs(
      env,
      latest
    );

  const diagnosticFailed =
    diagnostic.contracts.some(
      x => !x.success
    );

  if (
    diagnosticFailed
  ) {
    return {
      status:
        "ALCHEMY_GETLOGS_DIAGNOSTIC_FAILED",

      success:
        false,

      latestBlock:
        latest,

      diagnostic,

      diagnostics:
        diagnostic.contracts
          .filter(
            x => !x.success
          )
          .map(
            x => ({
              method:
                "eth_getLogs",

              contract:
                x.contract,

              ...x.diagnostic
            })
          ),

      telegram: {
        sent: false,

        reason:
          "DISCOVERY_FAILED"
      },

      chain: {
        name:
          CHAIN_NAME,

        chainId:
          CHAIN_ID
      }
    };
  }

  /*
   * Step 3:
   * Normal discovery.
   */
  const start =
    Math.max(
      0,
      latest -
      NORMAL_BLOCK_RANGE +
      1
    );

  const discovery =
    await discover(
      env,
      start,
      latest
    );

  diagnostics.push(
    ...discovery.contractResults
      .filter(
        x => !x.success
      )
      .map(
        x => ({
          method:
            "eth_getLogs",

          contract:
            x.contract,

          ...x.diagnostic
        })
      )
  );

  const tokens =
    discovery.discovered;

  /*
   * Limit market lookups.
   */
  const inspect =
    tokens.slice(
      0,
      3
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

    const scoring =
      calculateScore(
        market
      );

    candidates.push({
      ...item,

      score:
        scoring.score,

      reasons:
        scoring.reasons,

      market:
        market || {
          verified: false
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
    (a, b) =>
      b.score -
      a.score
  );

  const qualifying =
    candidates.find(
      candidate =>
        candidate.market?.verified &&
        candidate.score >=
          TELEGRAM_MINIMUM_SCORE
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying
  ) {
    telegramResult =
      await telegram(
        env,

        callMessage(
          qualifying
        )
      );

    telegramResult.token =
      qualifying.token;

    telegramResult.score =
      qualifying.score;
  }

  return {
    status:
      "OK",

    success:
      true,

    latestBlock:
      latest,

    startBlock:
      start,

    endBlock:
      latest,

    blocksScanned:
      latest -
      start +
      1,

    diagnostic,

    contractResults:
      discovery.contractResults,

    rawLogs:
      discovery.logs.length,

    tokensDiscovered:
      tokens.length,

    tokensInspected:
      inspect.length,

    tokens:
      inspect.map(
        x => x.token
      ),

    candidates,

    telegram:
      telegramResult,

    rpcProvider:
      "ALCHEMY",

    rpcBreakdown: {
      eth_blockNumber:
        1,

      diagnostic_eth_getLogs:
        2,

      discovery_eth_getLogs:
        2
    },

    discovery:
      "ALCHEMY_ON_CHAIN_FIRST_V41",

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
    env
  ) {
    const url =
      new URL(
        request.url
      );

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
          ENTRY_CONTRACTS,

        telegram: {
          configured:
            Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),

          automaticCalls:
            true,

          minimumScore:
            TELEGRAM_MINIMUM_SCORE
        },

        alchemyConfigured:
          Boolean(
            env.ALCHEMY_API_KEY
          ),

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "V41_ALCHEMY_DIAGNOSTIC",

        timestamp:
          new Date().toISOString()
      });
    }

    if (
      url.pathname ===
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

    if (
      url.pathname ===
      "/test-telegram"
    ) {
      const result =
        await telegram(
          env,

          `✅ Robinhood Chain Meme Hunter ${VERSION} — Telegram test\n\n${new Date().toISOString()}`
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
      scan(env)
        .then(
          result =>
            console.log(
              "V41 scheduled scan complete",
              result.status
            )
        )
        .catch(
          error =>
            console.error(
              "V41 scheduled scan failed",
              error
            )
        )
    );
  }
};
