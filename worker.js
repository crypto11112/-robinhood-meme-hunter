const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2";

const CACHE_TTL = 60;

const EXCLUDED_SYMBOLS = new Set([
  "WETH",
  "USDC",
  "USDT",
  "WBTC",
  "DAI",
  "AAPL",
  "AMZN",
  "AMD",
  "COIN",
  "GOOGL",
  "META",
  "MSFT",
  "NFLX",
  "NVDA",
  "PLTR",
  "SPY",
  "TSLA",
  "QQQ"
]);

async function rpc(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
}

async function blockscout(path, cache) {
  const url = `${BLOCKSCOUT_API}${path}`;

  const cacheKey = new Request(url);
  const cached = await cache.match(cacheKey);

  if (cached) {
    return {
      data: await cached.json(),
      cached: true
    };
  }

  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("BLOCKSCOUT_RATE_LIMITED");
  }

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `Blockscout invalid JSON HTTP ${response.status}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `Blockscout HTTP ${response.status}`
    );
  }

  const cacheResponse = new Response(
    JSON.stringify(data),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`
      }
    }
  );

  await cache.put(cacheKey, cacheResponse);

  return {
    data,
    cached: false
  };
}

function number(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const n = Number(value);

  return Number.isFinite(n) ? n : null;
}

function string(value) {
  return String(value || "").trim();
}

function memeLikelihood(token) {
  const name =
    string(token.name).toLowerCase();

  const symbol =
    string(token.symbol).toLowerCase();

  const words = [
    "cat",
    "dog",
    "frog",
    "pepe",
    "wojak",
    "wif",
    "bonk",
    "shib",
    "inu",
    "meme",
    "moon",
    "lambo",
    "yolo",
    "degen",
    "tendies",
    "ape",
    "goat",
    "penguin",
    "duck",
    "bear",
    "bull",
    "panda",
    "monkey",
    "pizza",
    "woof",
    "stonk",
    "chad",
    "frong"
  ];

  let matches = 0;

  for (const word of words) {
    if (
      name.includes(word) ||
      symbol.includes(word)
    ) {
      matches++;
    }
  }

  return Math.min(
    matches * 12,
    36
  );
}

function marketCapScore(marketCap) {
  if (marketCap === null) return 0;

  if (marketCap < 1_000_000) return 28;
  if (marketCap < 5_000_000) return 25;
  if (marketCap < 10_000_000) return 22;
  if (marketCap < 25_000_000) return 18;
  if (marketCap < 50_000_000) return 12;
  if (marketCap < 100_000_000) return 6;

  return 0;
}

function holderScore(holders) {
  if (holders === null) return 0;

  if (holders >= 1000 && holders < 10000) return 16;
  if (holders >= 500 && holders < 1000) return 12;
  if (holders >= 10000) return 9;
  if (holders >= 100) return 6;

  return 1;
}

function earlyStageScore(marketCap) {
  if (marketCap === null) return 0;

  if (
    marketCap >= 1_000_000 &&
    marketCap <= 10_000_000
  ) {
    return 10;
  }

  if (
    marketCap > 10_000_000 &&
    marketCap <= 25_000_000
  ) {
    return 7;
  }

  if (marketCap < 1_000_000) {
    return 8;
  }

  return 0;
}

function riskFlags(token) {
  const flags = [];

  const marketCap =
    number(token.marketCap);

  const holders =
    number(token.holders);

  if (
    marketCap !== null &&
    marketCap < 500_000
  ) {
    flags.push(
      "VERY_LOW_MARKET_CAP"
    );
  }

  if (
    holders !== null &&
    holders < 100
  ) {
    flags.push(
      "LOW_HOLDER_COUNT"
    );
  }

  if (
    marketCap !== null &&
    marketCap > 100_000_000
  ) {
    flags.push(
      "ALREADY_LARGE"
    );
  }

  return flags;
}

function score(token) {
  const marketCap =
    number(token.marketCap);

  const holders =
    number(token.holders);

  const total =
    marketCapScore(marketCap) +
    holderScore(holders) +
    earlyStageScore(marketCap) +
    memeLikelihood(token);

  return Math.min(
    Math.round(total),
    100
  );
}

function category(score) {
  if (score >= 70) {
    return "HIGH-POTENTIAL";
  }

  if (score >= 55) {
    return "WATCH";
  }

  if (score >= 40) {
    return "EARLY";
  }

  return "LOW-PRIORITY";
}

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
        "Content-Type":
          "application/json"
      }
    }
  );
}

export default {
  async fetch(request, env, ctx) {
    const cache =
      caches.default;

    try {
      // -----------------------------
      // Verify Robinhood Chain
      // -----------------------------

      const chainHex =
        await rpc("eth_chainId");

      const chainId =
        parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          agent:
            "Robinhood Chain Meme Hunter",
          version: "V7",
          status: "ERROR",
          detectedChainId: chainId
        }, 500);
      }

      // -----------------------------
      // Latest block
      // -----------------------------

      const latestBlockHex =
        await rpc(
          "eth_blockNumber"
        );

      const latestBlock =
        parseInt(
          latestBlockHex,
          16
        );

      // -----------------------------
      // ONE Blockscout request
      // -----------------------------

      let tokenData;
      let fromCache = false;

      try {
        const result =
          await blockscout(
            "/tokens?type=ERC-20&items_count=50",
            cache
          );

        tokenData = result.data;
        fromCache = result.cached;

      } catch (error) {
        if (
          error.message ===
          "BLOCKSCOUT_RATE_LIMITED"
        ) {
          return json({
            agent:
              "Robinhood Chain Meme Hunter",

            version:
              "V7",

            status:
              "RATE_LIMITED",

            chain: {
              name:
                "Robinhood Chain",

              chainId:
                4663,

              rpcStatus:
                "CONNECTED"
            },

            blockscout:
              "RATE LIMITED",

            message:
              "Blockscout public API temporarily rate-limited. Wait before retrying.",

            latestBlock,

            timestamp:
              new Date().toISOString()
          }, 429);
        }

        throw error;
      }

      const rawTokens =
        Array.isArray(
          tokenData.items
        )
          ? tokenData.items
          : [];

      // -----------------------------
      // Filter
      // -----------------------------

      const candidates =
        rawTokens
          .filter(token => {
            const symbol =
              string(
                token.symbol
              ).toUpperCase();

            return !EXCLUDED_SYMBOLS.has(
              symbol
            );
          })
          .map(token => ({
            name:
              token.name ||
              "DATA UNVERIFIED",

            symbol:
              token.symbol ||
              "DATA UNVERIFIED",

            contract:
              token.address ||
              token.address_hash ||
              "DATA UNVERIFIED",

            type:
              token.type ||
              "ERC-20",

            price:
              token.exchange_rate ??
              null,

            marketCap:
              token.market_cap ??
              token.circulating_market_cap ??
              null,

            holders:
              token.holders_count ??
              token.holders ??
              null,

            totalSupply:
              token.total_supply ??
              null,

            decimals:
              token.decimals ??
              null
          }))
          .filter(token => {
            const marketCap =
              number(
                token.marketCap
              );

            return (
              marketCap === null ||
              marketCap < 100_000_000
            );
          });

      // -----------------------------
      // Score
      // -----------------------------

      for (
        const token of candidates
      ) {
        token.memeLikelihood =
          memeLikelihood(token);

        token.discoveryScore =
          score(token);

        token.category =
          category(
            token.discoveryScore
          );

        token.riskFlags =
          riskFlags(token);
      }

      candidates.sort(
        (a, b) =>
          b.discoveryScore -
          a.discoveryScore
      );

      const topCandidates =
        candidates.slice(
          0,
          25
        );

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V7",

        status:
          "ONLINE",

        chain: {
          name:
            "Robinhood Chain",

          chainId:
            4663,

          rpcStatus:
            "CONNECTED"
        },

        explorer: {
          name:
            "Blockscout",

          apiVersion:
            "V2",

          status:
            "CONNECTED",

          cache:
            fromCache
              ? "HIT"
              : "MISS"
        },

        scan: {
          latestBlock,

          tokensReturned:
            rawTokens.length,

          candidatesFound:
            candidates.length,

          candidatesReturned:
            topCandidates.length
        },

        candidates:
          topCandidates,

        scoring: {
          maximum:
            100,

          factors: [
            "market cap",
            "holder count",
            "early-stage position",
            "meme likelihood"
          ],

          warning:
            "Discovery score is not financial advice or a prediction."
        },

        dataIntegrity: {
          chainId:
            "CONFIRMED",

          tokenMetadata:
            "VERIFIED WHERE INDEXED",

          marketCap:
            "VERIFIED WHERE INDEXED",

          holders:
            "VERIFIED WHERE INDEXED",

          liquidity:
            "NOT YET VERIFIED",

          volume:
            "NOT YET VERIFIED",

          holderConcentration:
            "NOT YET VERIFIED",

          whaleActivity:
            "NOT YET VERIFIED",

          smartMoney:
            "NOT YET VERIFIED",

          socialMomentum:
            "NOT YET VERIFIED"
        },

        nextStage:
          "Holder concentration and liquidity analysis",

        timestamp:
          new Date().toISOString()
      });

    } catch (error) {
      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V7",

        status:
          "ERROR",

        error:
          error.message,

        timestamp:
          new Date().toISOString()
      }, 500);
    }
  }
};
