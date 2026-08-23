const VERSION = "V40";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const ALCHEMY_RPC_BASE =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

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

const DEX_API =
  "https://api.dexscreener.com";

const MAX_BLOCKS = 500;
const MAX_MARKET_LOOKUPS = 3;
const TELEGRAM_MINIMUM_SCORE = 60;

const seen = new Map();

function response(data, status = 200) {
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

function cleanAddress(value) {
  if (
    typeof value !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(value)
  ) {
    return null;
  }

  return value.toLowerCase();
}

function wordToAddress(word) {
  if (typeof word !== "string") return null;

  const clean = word.replace(/^0x/, "");

  if (
    clean.length !== 64 ||
    !/^[0-9a-fA-F]+$/.test(clean)
  ) {
    return null;
  }

  return cleanAddress(
    "0x" + clean.slice(-40)
  );
}

function addressesFromTopics(topics) {
  if (!Array.isArray(topics)) return [];

  const output = [];

  for (const topic of topics) {
    const address = wordToAddress(topic);

    if (address) {
      output.push(address);
    }
  }

  return output;
}

function addressesFromData(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const body = data.slice(2);
  const output = [];

  for (
    let i = 0;
    i + 64 <= body.length;
    i += 64
  ) {
    const word = body.slice(i, i + 64);
    const address = wordToAddress(word);

    if (address) {
      output.push(address);
    }
  }

  return output;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

const excludedAddresses = new Set([
  ...ENTRY_CONTRACTS,
  ...LAUNCHPAD_CONTRACTS,
  POOL_MANAGER
].map(x => x.toLowerCase()));

function possibleTokenAddresses(log) {
  return unique([
    ...addressesFromTopics(log?.topics),
    ...addressesFromData(log?.data)
  ]).filter(
    address =>
      !excludedAddresses.has(address)
  );
}

async function alchemyRpc(env, method, params) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY_NOT_CONFIGURED"
    );
  }

  const url =
    ALCHEMY_RPC_BASE +
    env.ALCHEMY_API_KEY;

  const result = await fetch(
    url,
    {
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
    }
  );

  if (result.status === 429) {
    throw new Error(
      "ALCHEMY_RATE_LIMITED"
    );
  }

  if (!result.ok) {
    throw new Error(
      `ALCHEMY_HTTP_${result.status}`
    );
  }

  const body =
    await result.json();

  if (body.error) {
    throw new Error(
      body.error.message ||
      "ALCHEMY_RPC_ERROR"
    );
  }

  return body.result;
}

async function latestBlock(env) {
  return parseInt(
    await alchemyRpc(
      env,
      "eth_blockNumber",
      []
    ),
    16
  );
}

async function getLogs(
  env,
  contract,
  fromBlock,
  toBlock
) {
  return alchemyRpc(
    env,
    "eth_getLogs",
    [{
      address: contract,
      fromBlock:
        "0x" +
        fromBlock.toString(16),
      toBlock:
        "0x" +
        toBlock.toString(16)
    }]
  );
}

async function getMarket(
  token,
  diagnostics
) {
  try {
    const url =
      `${DEX_API}/latest/dex/tokens/${token}`;

    const result =
      await fetch(url, {
        headers: {
          accept:
            "application/json"
        }
      });

    if (result.status === 429) {
      diagnostics.push({
        source: "dexscreener",
        token,
        error: "HTTP_429"
      });

      return null;
    }

    if (!result.ok) {
      diagnostics.push({
        source: "dexscreener",
        token,
        error:
          `HTTP_${result.status}`
      });

      return null;
    }

    const data =
      await result.json();

    const pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];

    const robinhood =
      pairs.filter(
        pair =>
          String(
            pair?.chainId || ""
          ).toLowerCase() ===
          "robinhood"
      );

    const usable =
      robinhood.length
        ? robinhood
        : pairs;

    if (!usable.length) {
      return null;
    }

    usable.sort(
      (a, b) =>
        Number(
          b?.liquidity?.usd || 0
        ) -
        Number(
          a?.liquidity?.usd || 0
        )
    );

    const pair = usable[0];

    return {
      verified:
        String(
          pair?.chainId || ""
        ).toLowerCase() ===
        "robinhood",

      chainId:
        pair?.chainId || null,

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
        pair?.priceUsd || null,

      marketCap:
        Number(
          pair?.marketCap || 0
        ),

      fdv:
        Number(
          pair?.fdv || 0
        ),

      liquidityUsd:
        Number(
          pair?.liquidity?.usd || 0
        ),

      volume24h:
        Number(
          pair?.volume?.h24 || 0
        ),

      buys24h:
        Number(
          pair?.txns?.h24?.buys || 0
        ),

      sells24h:
        Number(
          pair?.txns?.h24?.sells || 0
        )
    };
  } catch (error) {
    diagnostics.push({
      source: "dexscreener",
      token,
      error:
        error?.message ||
        "MARKET_LOOKUP_FAILED"
    });

    return null;
  }
}

function score(market) {
  let total = 20;

  const reasons = [
    "Discovered from Robinhood Chain on-chain logs"
  ];

  if (market?.verified) {
    total += 25;
    reasons.push(
      "Robinhood Chain market verified"
    );
  }

  const liquidity =
    Number(
      market?.liquidityUsd || 0
    );

  const volume =
    Number(
      market?.volume24h || 0
    );

  const buys =
    Number(
      market?.buys24h || 0
    );

  const sells =
    Number(
      market?.sells24h || 0
    );

  if (liquidity >= 1000) {
    total += 5;
    reasons.push(
      "Liquidity above $1K"
    );
  }

  if (liquidity >= 5000) {
    total += 5;
    reasons.push(
      "Liquidity above $5K"
    );
  }

  if (liquidity >= 10000) {
    total += 5;
    reasons.push(
      "Liquidity above $10K"
    );
  }

  if (volume >= 5000) {
    total += 5;
    reasons.push(
      "24h volume above $5K"
    );
  }

  if (buys > sells && buys > 0) {
    total += 10;
    reasons.push(
      "Buys exceed sells"
    );
  }

  return {
    score:
      Math.min(total, 100),
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

  return "$" + n.toFixed(2);
}

function telegramText(candidate) {
  const m = candidate.market;

  return [
    "🚨 ROBINHOOD MEME CALL — V40",
    "",
    candidate.symbol
      ? `🔥 $${candidate.symbol}`
      : "🔥 NEW TOKEN",

    candidate.name || "",

    "",
    `🎯 Hunter Score: ${candidate.score}/100`,

    "",
    "📍 CONTRACT",
    candidate.token,

    "",
    "📊 VERIFIED MARKET DATA",
    `Liquidity: ${money(m?.liquidityUsd)}`,
    `24h Volume: ${money(m?.volume24h)}`,
    `Buys: ${m?.buys24h ?? "UNVERIFIED"}`,
    `Sells: ${m?.sells24h ?? "UNVERIFIED"}`,
    `Market Cap: ${money(m?.marketCap)}`,

    "",
    "🔎 DISCOVERY",
    "Robinhood Chain on-chain event: VERIFIED",
    `Robinhood market: ${
      m?.verified ? "VERIFIED" : "UNVERIFIED"
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

    m?.url
      ? `Chart: ${m.url}`
      : ""
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 3900);
}

async function sendTelegram(
  env,
  text
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
          method: "POST",
          headers: {
            "content-type":
              "application/json"
          },
          body: JSON.stringify({
            chat_id:
              env.TELEGRAM_CHAT_ID,
            text,
            disable_web_page_preview:
              false
          })
        }
      );

    const data =
      await result.json();

    if (
      !result.ok ||
      !data?.ok
    ) {
      return {
        sent: false,
        reason:
          data?.description ||
          "TELEGRAM_FAILED"
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
        "TELEGRAM_NETWORK_ERROR"
    };
  }
}

async function scan(env) {
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

      telegram: {
        sent: false,
        reason:
          "DISCOVERY_FAILED"
      },

      diagnostics: [{
        method:
          "eth_blockNumber",
        error:
          error?.message ||
          "ALCHEMY_ERROR"
      }]
    };
  }

  const start =
    Math.max(
      0,
      latest - MAX_BLOCKS + 1
    );

  const allLogs = [];
  const contractResults = [];

  /*
   * Two log requests.
   *
   * Alchemy now supports Robinhood Mainnet
   * on the unlimited eth_getLogs block-range list.
   */
  for (
    const contract of ENTRY_CONTRACTS
  ) {
    try {
      const logs =
        await getLogs(
          env,
          contract,
          start,
          latest
        );

      const safe =
        Array.isArray(logs)
          ? logs
          : [];

      allLogs.push(
        ...safe.map(log => ({
          ...log,
          sourceContract:
            contract
        }))
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
        error:
          error?.message ||
          "ALCHEMY_ERROR"
      });

      diagnostics.push({
        method:
          "eth_getLogs",
        contract,
        error:
          error?.message ||
          "ALCHEMY_ERROR"
      });
    }
  }

  const discovered = [];

  for (
    const log of allLogs
  ) {
    const addresses =
      possibleTokenAddresses(
        log
      );

    for (
      const token of addresses
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
          Array.isArray(log.topics)
            ? log.topics
            : [],
        data:
          log.data || "0x"
      });
    }
  }

  const uniqueTokens =
    new Map();

  for (
    const item of discovered
  ) {
    if (
      !uniqueTokens.has(
        item.token
      )
    ) {
      uniqueTokens.set(
        item.token,
        item
      );
    }
  }

  const tokenList =
    [...uniqueTokens.values()]
      .slice(
        0,
        MAX_MARKET_LOOKUPS
      );

  const candidates = [];

  for (
    const item of tokenList
  ) {
    const market =
      await getMarket(
        item.token,
        diagnostics
      );

    const scoring =
      score(market);

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
      b.score - a.score
  );

  const qualifying =
    candidates.find(
      candidate =>
        candidate.market?.verified &&
        candidate.score >=
          TELEGRAM_MINIMUM_SCORE
    );

  let telegram = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };

  if (qualifying) {
    telegram =
      await sendTelegram(
        env,
        telegramText(
          qualifying
        )
      );

    telegram.token =
      qualifying.token;

    telegram.score =
      qualifying.score;
  }

  return {
    status: "OK",
    success: true,

    latestBlock: latest,
    startBlock: start,
    endBlock: latest,

    blocksScanned:
      latest - start + 1,

    contractResults,

    rawLogs:
      allLogs.length,

    decodedLogCandidates:
      discovered.length,

    tokensDiscovered:
      uniqueTokens.size,

    tokensInspected:
      tokenList.length,

    tokens:
      tokenList.map(
        x => x.token
      ),

    candidates,

    telegram,

    rpcRequests: 3,

    rpcBreakdown: {
      eth_blockNumber: 1,
      eth_getLogs: 2
    },

    rpcProvider:
      "ALCHEMY",

    discovery:
      "ALCHEMY_ON_CHAIN_FIRST",

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

    kvRequired: false,

    dataIntegrity: {
      noFabricatedMetrics: true,

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
            TELEGRAM_MINIMUM_SCORE
        },

        kvRequired:
          false,

        kvConfigured:
          false,

        alchemyConfigured:
          Boolean(
            env.ALCHEMY_API_KEY
          ),

        architecture:
          "V40_ALCHEMY_RPC",

        timestamp:
          new Date().toISOString()
      });
    }

    if (
      url.pathname ===
      "/scan"
    ) {
      const result =
        await scan(env);

      return response({
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
        await sendTelegram(
          env,
          `✅ Robinhood Chain Meme Hunter ${VERSION} — Telegram test\n\n${new Date().toISOString()}`
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
              "V40 scheduled scan",
            )
        )
        .catch(
          error =>
            console.error(
              "V40 scheduled scan failed",
              error
            )
        )
    );
  }
};
