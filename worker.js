const VERSION = "V34";

const CHAIN_ID = 4663;

const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

const DEX_URL =
  "https://api.dexscreener.com/latest/dex/tokens/";

const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

/*
 * Current suspected TokenCreated(address) event.
 *
 * V34 treats this as a discovery signal, NOT as guaranteed truth.
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
 * Very conservative RPC budget.
 *
 * 1 x latest block
 * 2 x getLogs
 * Maximum 2 x DEX lookups
 *
 * This keeps the Worker comfortably below the
 * Cloudflare subrequest limit.
 */
const MAX_BLOCKS = 500;

const MAX_DEX_LOOKUPS = 2;

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

async function rpc(method, params) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "accept": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  const text = await response.text();

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("RPC_RATE_LIMITED");
    }

    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("RPC_INVALID_JSON");
  }

  if (data.error) {
    if (
      data.error.code === 429 ||
      /rate.?limit|too many/i.test(
        data.error.message || ""
      )
    ) {
      throw new Error("RPC_RATE_LIMITED");
    }

    throw new Error(
      data.error.message ||
      "RPC_ERROR"
    );
  }

  return data.result;
}

function hexBlock(number) {
  return "0x" + number.toString(16);
}

async function getLatestBlock() {
  const result =
    await rpc(
      "eth_blockNumber",
      []
    );

  return parseInt(result, 16);
}

function extractAddresses(log) {
  const addresses = [];

  /*
   * Indexed address:
   *
   * topics[1] = 32-byte padded address
   */
  if (
    Array.isArray(log.topics) &&
    log.topics.length > 1
  ) {
    for (
      let i = 1;
      i < log.topics.length;
      i++
    ) {
      const topic = log.topics[i];

      if (
        typeof topic === "string" &&
        topic.length === 66
      ) {
        const possible =
          "0x" +
          topic.slice(-40).toLowerCase();

        if (
          /^0x[a-f0-9]{40}$/.test(possible)
        ) {
          addresses.push(possible);
        }
      }
    }
  }

  /*
   * Also inspect the final 32-byte word
   * of event data.
   */
  if (
    typeof log.data === "string" &&
    log.data.startsWith("0x") &&
    log.data.length >= 66
  ) {
    const words = [];

    const data =
      log.data.slice(2);

    for (
      let i = 0;
      i + 64 <= data.length;
      i += 64
    ) {
      words.push(
        data.slice(i, i + 64)
      );
    }

    for (const word of words) {
      const possible =
        "0x" +
        word.slice(-40).toLowerCase();

      if (
        /^0x[a-f0-9]{40}$/.test(possible)
      ) {
        addresses.push(possible);
      }
    }
  }

  return [
    ...new Set(addresses)
  ];
}

async function getLogs(
  contract,
  fromBlock,
  toBlock
) {
  return rpc(
    "eth_getLogs",
    [{
      address: contract,
      fromBlock:
        hexBlock(fromBlock),
      toBlock:
        hexBlock(toBlock),
      topics: [
        TOKEN_CREATED_TOPIC
      ]
    }]
  );
}

function normaliseLogs(logs) {
  const tokens = [];
  const seen = new Set();

  for (const log of logs || []) {
    const addresses =
      extractAddresses(log);

    for (const address of addresses) {
      if (
        address !==
        "0x0000000000000000000000000000000000000000" &&
        !seen.has(address)
      ) {
        seen.add(address);

        tokens.push({
          address,
          blockNumber:
            log.blockNumber || null,
          transactionHash:
            log.transactionHash || null,
          logIndex:
            log.logIndex || null
        });
      }
    }
  }

  return tokens;
}

async function dexLookup(address) {
  const response =
    await fetch(
      DEX_URL + address,
      {
        headers: {
          "accept":
            "application/json"
        }
      }
    );

  if (!response.ok) {
    throw new Error(
      `DEX_HTTP_${response.status}`
    );
  }

  return response.json();
}

function scorePair(pair) {
  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );

  const volume =
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

  let score = 0;

  /*
   * Liquidity
   */
  if (liquidity >= 1000)
    score += 15;

  if (liquidity >= 5000)
    score += 15;

  if (liquidity >= 10000)
    score += 10;

  /*
   * Volume
   */
  if (volume >= 1000)
    score += 10;

  if (volume >= 10000)
    score += 10;

  /*
   * Transaction activity
   */
  if (
    buys + sells >= 10
  ) {
    score += 10;
  }

  if (
    buys > sells
  ) {
    score += 10;
  }

  /*
   * Avoid treating a token with
   * no liquidity as promising.
   */
  if (liquidity === 0) {
    score = 0;
  }

  return Math.min(
    score,
    100
  );
}

function analysePair(
  token,
  data
) {
  const pairs =
    Array.isArray(data?.pairs)
      ? data.pairs
      : [];

  if (!pairs.length) {
    return {
      token,
      pairFound: false,
      score: 0
    };
  }

  /*
   * Select the pair with the greatest
   * reported USD liquidity.
   */
  const sorted =
    [...pairs].sort(
      (a, b) =>
        Number(
          b?.liquidity?.usd || 0
        ) -
        Number(
          a?.liquidity?.usd || 0
        )
    );

  const pair =
    sorted[0];

  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );

  const volume =
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

  return {
    token,

    pairFound: true,

    name:
      pair?.baseToken?.name ||
      "Unknown",

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
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    buySellRatio:
      sells > 0
        ? Number(
            (
              buys /
              sells
            ).toFixed(2)
          )
        : buys > 0
          ? null
          : 0,

    dex:
      pair?.dexId ||
      null,

    pairAddress:
      pair?.pairAddress ||
      null,

    url:
      pair?.url ||
      null,

    score:
      scorePair(pair)
  };
}

async function performScan() {
  const diagnostics = [];

  let latestBlock;

  try {
    latestBlock =
      await getLatestBlock();
  } catch (error) {
    diagnostics.push({
      type: "rpc",
      method:
        "eth_blockNumber",
      error:
        error.message
    });

    return {
      status:
        error.message ===
        "RPC_RATE_LIMITED"
          ? "RPC_RATE_LIMITED"
          : "RPC_ERROR",

      diagnostics
    };
  }

  /*
   * Scan only the most recent 500 blocks.
   *
   * This is deliberately conservative.
   */
  const startBlock =
    Math.max(
      0,
      latestBlock -
        MAX_BLOCKS +
        1
    );

  const endBlock =
    latestBlock;

  const allTokens = [];

  const contractResults = [];

  /*
   * Exactly ONE eth_getLogs request
   * per launch contract.
   */
  for (
    const contract
    of LAUNCH_CONTRACTS
  ) {
    try {
      const logs =
        await getLogs(
          contract,
          startBlock,
          endBlock
        );

      const tokens =
        normaliseLogs(logs);

      contractResults.push({
        contract,

        success:
          true,

        rawLogs:
          logs?.length || 0,

        addressesFound:
          tokens.length
      });

      for (const token of tokens) {
        if (
          !allTokens.some(
            x =>
              x.address ===
              token.address
          )
        ) {
          allTokens.push(
            token
          );
        }
      }

    } catch (error) {
      contractResults.push({
        contract,

        success:
          false,

        rawLogs:
          0,

        addressesFound:
          0,

        error:
          error.message
      });

      diagnostics.push({
        type:
          "eth_getLogs",

        contract,

        fromBlock:
          startBlock,

        toBlock:
          endBlock,

        error:
          error.message
      });

      /*
       * Do NOT retry automatically.
       *
       * Retrying is what caused the
       * earlier versions to hit RPC limits.
       */
    }
  }

  /*
   * DEX discovery only happens when
   * actual token addresses were found.
   */
  const candidates = [];

  const tokensForDex =
    allTokens.slice(
      0,
      MAX_DEX_LOOKUPS
    );

  for (
    const item
    of tokensForDex
  ) {
    try {
      const data =
        await dexLookup(
          item.address
        );

      const analysis =
        analysePair(
          item.address,
          data
        );

      candidates.push({
        ...analysis,

        discoveredAtBlock:
          item.blockNumber,

        transactionHash:
          item.transactionHash
      });

    } catch (error) {
      diagnostics.push({
        type:
          "dex",

        token:
          item.address,

        error:
          error.message
      });

      candidates.push({
        token:
          item.address,

        pairFound:
          false,

        score:
          0,

        dexError:
          error.message
      });
    }
  }

  candidates.sort(
    (a, b) =>
      Number(b.score || 0) -
      Number(a.score || 0)
  );

  return {
    status:
      "OK",

    latestBlock,

    startBlock,

    endBlock,

    blocksScanned:
      endBlock -
      startBlock +
      1,

    contractResults,

    rawLogs:
      contractResults.reduce(
        (sum, item) =>
          sum +
          Number(
            item.rawLogs || 0
          ),
        0
      ),

    tokensDiscovered:
      allTokens.length,

    tokens:
      allTokens,

    candidates,

    rpcRequests:
      3,

    /*
     * 1 blockNumber
     * 2 getLogs
     */
    rpcBreakdown: {
      eth_blockNumber:
        1,

      eth_getLogs:
        LAUNCH_CONTRACTS.length
    },

    maximumDexRequests:
      MAX_DEX_LOOKUPS,

    diagnostics
  };
}

export default {
  async fetch(request, env, ctx) {
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
      path === "/health"
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
            "Robinhood Chain",

          chainId:
            CHAIN_ID,

          rpc:
            RPC_URL
        },

        discovery:
          "DUAL_CONTRACT_GETLOGS",

        event:
          "TokenCreated(address)",

        launchContracts:
          LAUNCH_CONTRACTS,

        marketData:
          "DEX_SCREENER",

        kvConfigured:
          false,

        kvRequired:
          false,

        paidApiKeyRequired:
          false,

        architecture:
          "ULTRA_LOW_RPC_NO_RETRY",

        rpcBudget:
          "3 MAX BASE RPC REQUESTS",

        timestamp:
          new Date().toISOString()
      });
    }

    /*
     * SCAN
     */
    if (
      path === "/scan"
    ) {
      const scan =
        await performScan();

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          scan.status ===
          "OK",

        scan: {
          ...scan,

          chainId:
            CHAIN_ID,

          kvRequired:
            false,

          dataIntegrity: {
            noFabricatedMetrics:
              true,

            holderConcentration:
              "UNVERIFIED",

            walletActivity:
              "UNVERIFIED",

            smartMoney:
              "UNVERIFIED",

            accumulationDistribution:
              "UNVERIFIED"
          },

          timestamp:
            new Date().toISOString()
        }
      });
    }

    /*
     * TELEGRAM TEST
     */
    if (
      path ===
      "/test-telegram"
    ) {
      if (
        !env.TELEGRAM_BOT_TOKEN ||
        !env.TELEGRAM_CHAT_ID
      ) {
        return json({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          error:
            "TELEGRAM_SECRETS_NOT_CONFIGURED"
        });
      }

      const telegram =
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
                  `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
              })
          }
        );

      const data =
        await telegram.json();

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          telegram.ok,

        response:
          data
      });
    }

    /*
     * Unknown route
     */
    return json({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "ONLINE",

      message:
        "Robinhood Chain Meme Hunter V34",

      routes: [
        "/health",
        "/scan",
        "/test-telegram"
      ]
    });
  },

  /*
   * Optional Cloudflare Cron.
   *
   * V34 does not require KV.
   *
   * The cron simply performs the same
   * ultra-low-RPC scan.
   */
  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      performScan()
        .catch(
          () => {}
        )
    );
  }
};
