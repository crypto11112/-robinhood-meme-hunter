const VERSION = "V42";

const CHAIN_NAME = "Robinhood Chain";
const CHAIN_ID = 4663;

const ALCHEMY_RPC =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const DEXSCREENER_API =
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

const DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPAD_CONTRACTS,
  POOL_MANAGER
];

const MAX_ALCHEMY_LOG_RANGE = 10;
const MAX_TOKENS_TO_INSPECT = 5;

const MIN_SCORE = 60;

const MAX_TELEGRAM_MESSAGE_LENGTH = 3900;


/* =========================================================
   BASIC HELPERS
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

function hexBlock(number) {
  return (
    "0x" +
    Number(number).toString(16)
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

function isAddress(value) {
  return Boolean(
    normaliseAddress(value)
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function shortAddress(address) {
  if (!address) {
    return "UNVERIFIED";
  }

  return (
    address.slice(0, 6) +
    "..." +
    address.slice(-4)
  );
}

function money(value) {
  const number = Number(value || 0);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return "UNVERIFIED";
  }

  if (number >= 1_000_000_000) {
    return (
      "$" +
      (number / 1_000_000_000)
        .toFixed(2) +
      "B"
    );
  }

  if (number >= 1_000_000) {
    return (
      "$" +
      (number / 1_000_000)
        .toFixed(2) +
      "M"
    );
  }

  if (number >= 1_000) {
    return (
      "$" +
      (number / 1_000)
        .toFixed(1) +
      "K"
    );
  }

  return (
    "$" +
    number.toFixed(2)
  );
}


/* =========================================================
   ADDRESS EXTRACTION
========================================================= */

/*
 * Extract an address from a 32-byte topic.
 *
 * This is deliberately marked as a possible candidate.
 * We never claim that every address inside an event is
 * definitely the token contract.
 */
function addressFromTopic(topic) {
  if (
    typeof topic !== "string" ||
    !topic.startsWith("0x")
  ) {
    return null;
  }

  const clean = topic.slice(2);

  if (clean.length !== 64) {
    return null;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    return null;
  }

  return normaliseAddress(
    "0x" +
    clean.slice(-40)
  );
}

function addressesFromData(data) {
  if (
    typeof data !== "string" ||
    !data.startsWith("0x")
  ) {
    return [];
  }

  const clean = data.slice(2);

  const found = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    const word =
      clean.slice(i, i + 64);

    if (
      !/^[0-9a-fA-F]{64}$/.test(word)
    ) {
      continue;
    }

    const candidate =
      normaliseAddress(
        "0x" +
        word.slice(-40)
      );

    if (candidate) {
      found.push(candidate);
    }
  }

  return found;
}


/* =========================================================
   RPC
========================================================= */

async function alchemyRPC(
  env,
  method,
  params
) {
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

  const raw =
    await response.text();

  let body;

  try {
    body = JSON.parse(raw);
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

    error.httpStatus =
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

    error.httpStatus =
      response.status;

    error.rpcError =
      body.error;

    error.raw =
      raw.slice(0, 3000);

    throw error;
  }

  return body.result;
}

async function getLatestBlock(env) {
  const result =
    await alchemyRPC(
      env,
      "eth_blockNumber",
      []
    );

  return parseInt(
    result,
    16
  );
}


/*
 * IMPORTANT:
 *
 * Every call made by V42 is <= 10 blocks.
 */
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
    range > MAX_ALCHEMY_LOG_RANGE
  ) {
    throw new Error(
      `INVALID_BLOCK_RANGE_${range}`
    );
  }

  return alchemyRPC(
    env,
    "eth_getLogs",
    [{
      address:
        contract,

      fromBlock:
        hexBlock(fromBlock),

      toBlock:
        hexBlock(toBlock)
    }]
  );
}


/* =========================================================
   RPC ERROR REPORTING
========================================================= */

function rpcError(error) {
  return {
    error:
      error?.message ||
      "UNKNOWN_RPC_ERROR",

    httpStatus:
      error?.httpStatus ??
      null,

    rpcError:
      error?.rpcError ??
      null,

    raw:
      error?.raw ??
      null
  };
}


/* =========================================================
   ON-CHAIN DISCOVERY
========================================================= */

function candidateAddressesFromLog(
  log,
  sourceContract
) {
  const source =
    normaliseAddress(
      sourceContract
    );

  const excluded =
    new Set(
      DISCOVERY_CONTRACTS.map(
        normaliseAddress
      )
    );

  const possible = [];

  if (
    Array.isArray(log?.topics)
  ) {
    for (
      const topic of log.topics
    ) {
      const address =
        addressFromTopic(
          topic
        );

      if (
        address &&
        !excluded.has(address)
      ) {
        possible.push(
          address
        );
      }
    }
  }

  for (
    const address of
    addressesFromData(
      log?.data
    )
  ) {
    if (
      !excluded.has(address)
    ) {
      possible.push(
        address
      );
    }
  }

  /*
   * Do not treat the event emitter itself as a token.
   */
  return unique(
    possible
  ).filter(
    address =>
      address !== source
  );
}


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
      const addresses =
        candidateAddressesFromLog(
          log,
          contract
        );

      for (
        const token of addresses
      ) {
        candidates.push({
          token,

          sourceContract:
            contract,

          blockNumber:
            log.blockNumber ||
            null,

          transactionHash:
            log.transactionHash ||
            null,

          logIndex:
            log.logIndex ||
            null
        });
      }
    }

    return {
      success: true,

      contract,

      fromBlock,

      toBlock,

      rawLogs:
        safeLogs.length,

      candidates
    };

  } catch (error) {
    return {
      success: false,

      contract,

      fromBlock,

      toBlock,

      rawLogs: 0,

      candidates: [],

      diagnostic:
        rpcError(
          error
        )
    };
  }
}


/*
 * One scan = latest 10 blocks.
 *
 * This is deliberate because Alchemy Free currently
 * allows only a 10-block eth_getLogs range.
 */
async function discoverCurrentWindow(
  env,
  latestBlock
) {
  const toBlock =
    latestBlock;

  const fromBlock =
    Math.max(
      0,
      latestBlock -
      MAX_ALCHEMY_LOG_RANGE +
      1
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

    results.push(
      result
    );
  }

  const tokenMap =
    new Map();

  for (
    const result of results
  ) {
    for (
      const item of
      result.candidates
    ) {
      const token =
        normaliseAddress(
          item.token
        );

      if (!token) {
        continue;
      }

      if (
        !tokenMap.has(token)
      ) {
        tokenMap.set(
          token,
          {
            token,

            sourceContracts: [
              result.contract
            ],

            firstBlock:
              item.blockNumber,

            transactionHash:
              item.transactionHash,

            logIndex:
              item.logIndex
          }
        );
      } else {
        const existing =
          tokenMap.get(
            token
          );

        existing.sourceContracts =
          unique([
            ...existing.sourceContracts,
            result.contract
          ]);
      }
    }
  }

  return {
    fromBlock,
    toBlock,

    contractResults:
      results.map(
        result => ({
          contract:
            result.contract,

          success:
            result.success,

          rawLogs:
            result.rawLogs,

          candidateCount:
            result.candidates.length,

          diagnostic:
            result.diagnostic ||
            null
        })
      ),

    tokens:
      [...tokenMap.values()]
  };
}


/* =========================================================
   DEXSCREENER
========================================================= */

async function getDexData(
  token,
  diagnostics
) {
  try {
    const url =
      `${DEXSCREENER_API}/latest/dex/tokens/${token}`;

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            "accept":
              "application/json"
          }
        }
      );

    const raw =
      await response.text();

    let body;

    try {
      body =
        JSON.parse(raw);
    } catch {
      body = {};
    }

    if (!response.ok) {
      diagnostics.push({
        source:
          "dexscreener",

        token,

        error:
          `HTTP_${response.status}`
      });

      return null;
    }

    const pairs =
      Array.isArray(
        body?.pairs
      )
        ? body.pairs
        : [];

    /*
     * Prefer Robinhood pairs.
     */
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
      verifiedRobinhood:
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
        ),

      priceChange5m:
        Number(
          pair?.priceChange?.m5 ||
          0
        ),

      priceChange1h:
        Number(
          pair?.priceChange?.h1 ||
          0
        ),

      priceChange6h:
        Number(
          pair?.priceChange?.h6 ||
          0
        ),

      priceChange24h:
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

function scoreCandidate(
  market
) {
  let score = 0;

  const reasons = [];

  if (!market) {
    return {
      score: 0,

      reasons: [
        "No verified market data"
      ]
    };
  }

  /*
   * Robinhood verification.
   */
  if (
    market.verifiedRobinhood
  ) {
    score += 30;

    reasons.push(
      "Robinhood Chain market verified"
    );
  } else {
    reasons.push(
      "Robinhood market not verified"
    );
  }

  /*
   * Liquidity.
   */
  const liquidity =
    Number(
      market.liquidityUsd ||
      0
    );

  if (
    liquidity >= 1_000
  ) {
    score += 5;

    reasons.push(
      "Liquidity > $1K"
    );
  }

  if (
    liquidity >= 5_000
  ) {
    score += 5;

    reasons.push(
      "Liquidity > $5K"
    );
  }

  if (
    liquidity >= 10_000
  ) {
    score += 5;

    reasons.push(
      "Liquidity > $10K"
    );
  }

  if (
    liquidity >= 25_000
  ) {
    score += 5;

    reasons.push(
      "Liquidity > $25K"
    );
  }

  /*
   * Volume.
   */
  const volume =
    Number(
      market.volume24h ||
      0
    );

  if (
    volume >= 5_000
  ) {
    score += 5;

    reasons.push(
      "24h volume > $5K"
    );
  }

  if (
    volume >= 25_000
  ) {
    score += 5;

    reasons.push(
      "24h volume > $25K"
    );
  }

  /*
   * Buy pressure.
   */
  const buys =
    Number(
      market.buys24h ||
      0
    );

  const sells =
    Number(
      market.sells24h ||
      0
    );

  if (
    buys > 0 &&
    buys > sells
  ) {
    score += 10;

    reasons.push(
      "Buys exceed sells"
    );
  }

  /*
   * Short-term momentum.
   */
  if (
    market.priceChange1h > 0
  ) {
    score += 5;

    reasons.push(
      "Positive 1h price movement"
    );
  }

  if (
    market.priceChange6h > 0
  ) {
    score += 5;

    reasons.push(
      "Positive 6h price movement"
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

function buildTelegramMessage(
  candidate
) {
  const market =
    candidate.market;

  const message = [
    "🚨 ROBINHOOD CHAIN MEME CALL",
    "",
    candidate.symbol
      ? `🔥 $${candidate.symbol}`
      : "🔥 NEW TOKEN",

    candidate.name ||
      "",

    "",

    `🎯 HUNTER SCORE: ${candidate.score}/100`,

    "",

    "📍 CONTRACT",
    candidate.token,

    "",

    "📊 VERIFIED MARKET DATA",

    `Market Cap: ${
      money(
        market?.marketCap
      )
    }`,

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

    `1h: ${
      market?.priceChange1h ??
      0
    }%`,

    `6h: ${
      market?.priceChange6h ??
      0
    }%`,

    "",

    "🔎 DISCOVERY",
    "On-chain discovery: VERIFIED",

    `Robinhood market: ${
      market?.verifiedRobinhood
        ? "VERIFIED"
        : "UNVERIFIED"
    }`,

    "",

    "🧠 WHY IT SCORED",

    ...candidate.reasons.map(
      reason =>
        `• ${reason}`
    ),

    "",

    "⚠️ UNVERIFIED",
    "Holder concentration",
    "Smart-money wallets",
    "Wallet activity",
    "Accumulation/distribution",

    "",

    "⚠️ HIGH-RISK EARLY-STAGE TOKEN",
    "Automated research alert — not financial advice.",

    market?.url
      ? `📈 Chart: ${market.url}`
      : ""
  ]
    .filter(Boolean)
    .join("\n");

  return message.slice(
    0,
    MAX_TELEGRAM_MESSAGE_LENGTH
  );
}


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
        "TELEGRAM_REQUEST_FAILED"
    };
  }
}


/* =========================================================
   FULL SCAN
========================================================= */

async function performScan(
  env
) {
  const diagnostics = [];

  /*
   * 1. Get current block.
   */
  let latestBlock;

  try {
    latestBlock =
      await getLatestBlock(
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

        ...rpcError(
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
   * 2. Scan exactly 10 blocks.
   */
  const discovery =
    await discoverCurrentWindow(
      env,
      latestBlock
    );

  /*
   * 3. Report RPC failures.
   */
  for (
    const result of
    discovery.contractResults
  ) {
    if (
      !result.success
    ) {
      diagnostics.push({
        method:
          "eth_getLogs",

        contract:
          result.contract,

        ...result.diagnostic
      });
    }
  }

  /*
   * 4. Inspect only a small number of
   * discovered addresses.
   */
  const tokens =
    discovery.tokens.slice(
      0,
      MAX_TOKENS_TO_INSPECT
    );

  const candidates = [];

  for (
    const tokenInfo of tokens
  ) {
    const market =
      await getDexData(
        tokenInfo.token,
        diagnostics
      );

    if (!market) {
      continue;
    }

    const scoring =
      scoreCandidate(
        market
      );

    candidates.push({
      token:
        tokenInfo.token,

      sourceContracts:
        tokenInfo.sourceContracts,

      firstBlock:
        tokenInfo.firstBlock,

      transactionHash:
        tokenInfo.transactionHash,

      market,

      score:
        scoring.score,

      reasons:
        scoring.reasons,

      dataIntegrity: {
        onChainDiscovery:
          "VERIFIED",

        marketData:
          "AVAILABLE",

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

  /*
   * 5. Telegram call.
   *
   * We require both:
   * - score >= 60
   * - Robinhood market verified
   *
   * This prevents a random address extracted
   * from a log becoming a Telegram call.
   */
  const qualifying =
    candidates.find(
      candidate =>
        candidate.score >=
          MIN_SCORE &&
        candidate.market
          ?.verifiedRobinhood ===
          true
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
      await sendTelegram(
        env,

        buildTelegramMessage(
          qualifying
        )
      );

    telegramResult.token =
      qualifying.token;

    telegramResult.score =
      qualifying.score;
  }

  /*
   * 6. Return complete diagnostic result.
   */
  return {
    status:
      "OK",

    success:
      true,

    latestBlock,

    startBlock:
      discovery.fromBlock,

    endBlock:
      discovery.toBlock,

    blocksScanned:
      discovery.toBlock -
      discovery.fromBlock +
      1,

    maxAlchemyLogRange:
      MAX_ALCHEMY_LOG_RANGE,

    rawLogs:
      discovery.contractResults.reduce(
        (total, item) =>
          total +
          item.rawLogs,
        0
      ),

    tokensDiscovered:
      discovery.tokens.length,

    tokensInspected:
      tokens.length,

    tokens:
      discovery.tokens.map(
        item =>
          item.token
      ),

    candidates,

    telegram:
      telegramResult,

    rpcProvider:
      "ALCHEMY",

    rpcArchitecture:
      "10_BLOCK_WINDOWS",

    rpcBreakdown: {
      eth_blockNumber:
        1,

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
        LAUNCHPAD_CONTRACTS,

      poolManager:
        POOL_MANAGER
    },

    marketData:
      "DEXSCREENER_OPTIONAL",

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

        alchemyLogRange:
          MAX_ALCHEMY_LOG_RANGE,

        marketData:
          "DEXSCREENER_OPTIONAL",

        kvRequired:
          false,

        kvConfigured:
          false,

        architecture:
          "V42_10_BLOCK_ALCHEMY",

        timestamp:
          new Date().toISOString()
      });
    }


    /*
     * MANUAL SCAN
     */
    if (
      url.pathname ===
      "/scan"
    ) {
      try {
        const result =
          await performScan(
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
        "Use /scan to run a 10-block discovery window."
    });
  },


  /*
   * CLOUDFLARE CRON
   *
   * Add a Cron Trigger in Cloudflare, for example:
   *
   * */1 * * * *   = every minute
   *
   * Do NOT rely on this handler unless a Cron Trigger
   * has actually been configured in Cloudflare.
   */
  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      performScan(
        env
      )
        .then(
          result =>
            console.log(
              JSON.stringify({
                event:
                  "V42_SCHEDULED_SCAN",

                status:
                  result.status,

                tokens:
                  result.tokensDiscovered,

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
              "V42 scheduled scan failed:",
              error
            )
        )
    );
  }
};
