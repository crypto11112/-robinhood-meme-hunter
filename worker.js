const VERSION = "V33";

const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";

const CHAIN_ID = 4663;

const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const LAUNCH_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const DEX =
  "https://api.dexscreener.com/latest/dex/tokens/";

const MAX_BLOCKS = 100;

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

async function rpc(method, params) {
  const r = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params
    })
  });

  const text = await r.text();

  if (!r.ok) {
    throw new Error(
      r.status === 429
        ? "RPC_RATE_LIMITED"
        : `RPC_HTTP_${r.status}`
    );
  }

  const data = JSON.parse(text);

  if (data.error) {
    throw new Error(
      data.error.message || "RPC_ERROR"
    );
  }

  return data.result;
}

async function latestBlock() {
  const result =
    await rpc("eth_blockNumber", []);

  return parseInt(result, 16);
}

async function findTokens(
  contract,
  from,
  to
) {
  const logs = await rpc(
    "eth_getLogs",
    [{
      address: contract,
      fromBlock:
        "0x" + from.toString(16),
      toBlock:
        "0x" + to.toString(16),
      topics: [
        TOKEN_CREATED_TOPIC
      ]
    }]
  );

  const tokens = [];

  for (const log of logs || []) {
    let address = null;

    if (
      log.topics &&
      log.topics.length > 1
    ) {
      address =
        "0x" +
        log.topics[1]
          .slice(-40)
          .toLowerCase();
    }

    if (!address && log.data) {
      const value =
        log.data.slice(-40);

      if (/^[0-9a-fA-F]{40}$/.test(value)) {
        address =
          "0x" +
          value.toLowerCase();
      }
    }

    if (
      address &&
      !tokens.includes(address)
    ) {
      tokens.push(address);
    }
  }

  return {
    logs: logs?.length || 0,
    tokens
  };
}

async function dexLookup(address) {
  const r = await fetch(
    DEX + address
  );

  if (!r.ok) {
    throw new Error(
      `DEX_HTTP_${r.status}`
    );
  }

  return r.json();
}

function analyse(address, data) {
  const pairs =
    Array.isArray(data?.pairs)
      ? data.pairs
      : [];

  if (!pairs.length) {
    return {
      token: address,
      pairFound: false
    };
  }

  const pair =
    pairs
      .sort(
        (a, b) =>
          Number(
            b.liquidity?.usd || 0
          ) -
          Number(
            a.liquidity?.usd || 0
          )
      )[0];

  const liquidity =
    Number(
      pair.liquidity?.usd || 0
    );

  const volume =
    Number(
      pair.volume?.h24 || 0
    );

  const buys =
    Number(
      pair.txns?.h24?.buys || 0
    );

  const sells =
    Number(
      pair.txns?.h24?.sells || 0
    );

  let score = 0;

  if (liquidity >= 1000)
    score += 20;

  if (liquidity >= 5000)
    score += 20;

  if (volume >= 1000)
    score += 15;

  if (volume >= 10000)
    score += 15;

  if (buys > sells)
    score += 20;

  if (buys + sells >= 20)
    score += 10;

  return {
    token: address,

    pairFound: true,

    name:
      pair.baseToken?.name ||
      "Unknown",

    symbol:
      pair.baseToken?.symbol ||
      null,

    priceUsd:
      pair.priceUsd || null,

    marketCap:
      pair.marketCap || null,

    liquidityUsd:
      liquidity,

    volume24h:
      volume,

    buys24h:
      buys,

    sells24h:
      sells,

    score: Math.min(score, 100),

    dex:
      pair.dexId || null,

    url:
      pair.url || null
  };
}

async function scan() {
  const latest =
    await latestBlock();

  const start =
    Math.max(
      0,
      latest - MAX_BLOCKS
    );

  const end = latest;

  const contract =
    LAUNCH_CONTRACTS[
      Math.floor(
        latest / MAX_BLOCKS
      ) %
      LAUNCH_CONTRACTS.length
    ];

  const discovered =
    await findTokens(
      contract,
      start,
      end
    );

  const candidates = [];

  /*
   * Maximum TWO DEX requests.
   */
  for (
    const token of
    discovered.tokens.slice(0, 2)
  ) {
    try {
      const data =
        await dexLookup(token);

      candidates.push(
        analyse(token, data)
      );
    } catch (e) {
      candidates.push({
        token,
        pairFound: false,
        dexError: e.message
      });
    }
  }

  return {
    status: "OK",

    version: VERSION,

    chainId: CHAIN_ID,

    latestBlock: latest,

    startBlock: start,

    endBlock: end,

    blocksScanned:
      end - start + 1,

    launchContract:
      contract,

    rawLogs:
      discovered.logs,

    tokensDiscovered:
      discovered.tokens.length,

    tokens:
      discovered.tokens,

    candidates,

    rpcRequests: 2,

    maximumDexRequests: 2,

    kvRequired: false,

    dataIntegrity: {
      noFabricatedMetrics: true,

      holderConcentration:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED"
    },

    timestamp:
      new Date().toISOString()
  };
}

export default {
  async fetch(request, env) {
    const url =
      new URL(request.url);

    const path =
      url.pathname;

    if (path === "/health") {
      return response({
        agent:
          "Robinhood Chain Meme Hunter",

        version: VERSION,

        status: "ONLINE",

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
          "ETH_GETLOGS_TOKEN_CREATED",

        marketData:
          "DEX_SCREENER",

        kvConfigured:
          false,

        kvRequired:
          false,

        paidApiKeyRequired:
          false,

        architecture:
          "ULTRA_LOW_RPC",

        timestamp:
          new Date().toISOString()
      });
    }

    if (path === "/scan") {
      try {
        const result =
          await scan();

        return response({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            true,

          scan:
            result
        });

      } catch (error) {
        return response({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          status:
            error.message ===
            "RPC_RATE_LIMITED"
              ? "RPC_RATE_LIMITED"
              : "SCAN_ERROR",

          error:
            error.message,

          kvRequired:
            false,

          timestamp:
            new Date().toISOString()
        }, 200);
      }
    }

    if (
      path === "/test-telegram"
    ) {
      if (
        !env.TELEGRAM_BOT_TOKEN ||
        !env.TELEGRAM_CHAT_ID
      ) {
        return response({
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

      const r =
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

              text:
                `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
            })
          }
        );

      const data =
        await r.json();

      return response({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        success:
          r.ok,

        response:
          data
      });
    }

    return response({
      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "ONLINE",

      message:
        "Robinhood Chain Meme Hunter V33",

      routes: [
        "/health",
        "/scan",
        "/test-telegram"
      ]
    });
  },

  async scheduled(event, env, ctx) {
    /*
     * Optional Cloudflare Cron.
     *
     * No KV is used.
     */

    ctx.waitUntil(
      scan().catch(
        () => {}
      )
    );
  }
};
