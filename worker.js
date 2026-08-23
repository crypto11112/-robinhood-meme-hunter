const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2";

const CACHE_TTL = 120;
const TOKEN_LIMIT = 50;
const OUTPUT_LIMIT = 25;

const EXCLUDED_SYMBOLS = new Set([
  "WETH","USDC","USDT","WBTC","DAI",
  "AAPL","AMZN","AMD","COIN","GOOGL",
  "META","MSFT","NFLX","NVDA","PLTR",
  "SPY","TSLA","QQQ"
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

async function cachedFetch(path, cache) {
  const url = `${BLOCKSCOUT_API}${path}`;
  const key = new Request(url);

  const cached = await cache.match(key);

  if (cached) {
    return {
      data: await cached.json(),
      cache: "HIT"
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

  const stored = new Response(
    JSON.stringify(data),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control":
          `public, max-age=${CACHE_TTL}`
      }
    }
  );

  await cache.put(key, stored);

  return {
    data,
    cache: "MISS"
  };
}

function num(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) return null;

  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
}

function str(value) {
  return String(value || "").trim();
}

/* --------------------------------
   MEME DETECTION
-------------------------------- */

function memeScore(token) {
  const name =
    str(token.name).toLowerCase();

  const symbol =
    str(token.symbol).toLowerCase();

  const words = [
    "cat","dog","frog","pepe",
    "wojak","wif","bonk","shib",
    "inu","meme","moon","lambo",
    "yolo","degen","tendies",
    "ape","goat","penguin",
    "duck","bear","bull",
    "panda","monkey","pizza",
    "woof","stonk","chad",
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
    matches * 10,
    30
  );
}

/* --------------------------------
   MARKET CAP
-------------------------------- */

function marketCapScore(mc) {
  if (mc === null) return 0;

  if (mc < 1_000_000) return 25;
  if (mc < 5_000_000) return 22;
  if (mc < 10_000_000) return 19;
  if (mc < 25_000_000) return 15;
  if (mc < 50_000_000) return 10;
  if (mc < 100_000_000) return 5;

  return 0;
}

/* --------------------------------
   HOLDER DISTRIBUTION SIGNAL
-------------------------------- */

function holderScore(holders) {
  if (holders === null) return 0;

  if (holders >= 1000 && holders < 10000)
    return 18;

  if (holders >= 500 && holders < 1000)
    return 14;

  if (holders >= 10000)
    return 10;

  if (holders >= 100)
    return 6;

  return 1;
}

/* --------------------------------
   EARLY STAGE
-------------------------------- */

function earlyStageScore(mc) {
  if (mc === null) return 0;

  if (
    mc >= 1_000_000 &&
    mc <= 10_000_000
  ) return 10;

  if (
    mc > 10_000_000 &&
    mc <= 25_000_000
  ) return 7;

  if (mc < 1_000_000)
    return 8;

  return 0;
}

/* --------------------------------
   UPSIDE MULTIPLES
-------------------------------- */

function upside(mc) {
  if (
    mc === null ||
    mc <= 0
  ) {
    return null;
  }

  return {
    to100M:
      Number(
        (100_000_000 / mc)
          .toFixed(1)
      ),

    to250M:
      Number(
        (250_000_000 / mc)
          .toFixed(1)
      ),

    to500M:
      Number(
        (500_000_000 / mc)
          .toFixed(1)
      )
  };
}

/* --------------------------------
   RISK
-------------------------------- */

function riskFlags(token) {
  const flags = [];

  const mc =
    num(token.marketCap);

  const holders =
    num(token.holders);

  if (
    mc !== null &&
    mc < 500_000
  ) {
    flags.push(
      "EXTREMELY_LOW_MARKET_CAP"
    );
  }

  if (
    holders !== null &&
    holders < 100
  ) {
    flags.push(
      "VERY_LOW_HOLDER_COUNT"
    );
  }

  if (
    mc !== null &&
    mc > 100_000_000
  ) {
    flags.push(
      "NO_LONGER_EARLY_STAGE"
    );
  }

  if (
    mc !== null &&
    holders !== null &&
    holders > 0
  ) {
    const mcPerHolder =
      mc / holders;

    if (
      mcPerHolder > 10000
    ) {
      flags.push(
        "HIGH_MC_PER_HOLDER"
      );
    }
  }

  return flags;
}

/* --------------------------------
   VALIDATION SCORE
-------------------------------- */

function validationScore(token) {
  const mc =
    num(token.marketCap);

  const holders =
    num(token.holders);

  let score = 0;

  score += marketCapScore(mc);
  score += holderScore(holders);
  score += earlyStageScore(mc);
  score += memeScore(token);

  return Math.min(
    Math.round(score),
    100
  );
}

function category(score) {
  if (score >= 70)
    return "HIGH-POTENTIAL";

  if (score >= 55)
    return "WATCH";

  if (score >= 40)
    return "EARLY";

  return "LOW-PRIORITY";
}

/* --------------------------------
   JSON RESPONSE
-------------------------------- */

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

/* --------------------------------
   WORKER
-------------------------------- */

export default {

  async fetch(request, env, ctx) {

    try {

      /* CHAIN */

      const chainHex =
        await rpc(
          "eth_chainId"
        );

      const chainId =
        parseInt(
          chainHex,
          16
        );

      if (chainId !== 4663) {

        return json({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            "V8",

          status:
            "ERROR",

          detectedChainId:
            chainId

        }, 500);
      }

      /* BLOCK */

      const blockHex =
        await rpc(
          "eth_blockNumber"
        );

      const latestBlock =
        parseInt(
          blockHex,
          16
        );

      /* BLOCKSCOUT */

      const cache =
        caches.default;

      let result;

      try {

        result =
          await cachedFetch(
            `/tokens?type=ERC-20&items_count=${TOKEN_LIMIT}`,
            cache
          );

      } catch (error) {

        if (
          error.message ===
          "BLOCKSCOUT_RATE_LIMITED"
        ) {

          return json({

            agent:
              "Robinhood Chain Meme Hunter",

            version:
              "V8",

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

            latestBlock,

            message:
              "Blockscout temporarily rate-limited the public API. The scanner is still connected to Robinhood Chain.",

            timestamp:
              new Date().toISOString()

          }, 429);
        }

        throw error;
      }

      const rawTokens =
        Array.isArray(
          result.data.items
        )
          ? result.data.items
          : [];

      /* TOKEN PROCESSING */

      const candidates =
        rawTokens

          .filter(token => {

            const symbol =
              str(
                token.symbol
              ).toUpperCase();

            return !EXCLUDED_SYMBOLS.has(
              symbol
            );

          })

          .map(token => {

            const marketCap =
              token.market_cap ??
              token.circulating_market_cap ??
              null;

            const holders =
              token.holders_count ??
              token.holders ??
              null;

            const candidate = {

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

              marketCap,

              holders,

              totalSupply:
                token.total_supply ??
                null,

              decimals:
                token.decimals ??
                null
            };

            candidate.memeLikelihood =
              memeScore(
                candidate
              );

            candidate.discoveryScore =
              validationScore(
                candidate
              );

            candidate.category =
              category(
                candidate.discoveryScore
              );

            candidate.riskFlags =
              riskFlags(
                candidate
              );

            candidate.upsideToTargets =
              upside(
                num(marketCap)
              );

            return candidate;
          })

          .filter(token => {

            const mc =
              num(
                token.marketCap
              );

            return (
              mc === null ||
              mc < 100_000_000
            );

          });

      /* SORT */

      candidates.sort(
        (a, b) =>
          b.discoveryScore -
          a.discoveryScore
      );

      const top =
        candidates.slice(
          0,
          OUTPUT_LIMIT
        );

      /* RESPONSE */

      return json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V8",

        status:
          "ONLINE",

        objective:
          "Early-stage meme coin discovery and validation",

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
            result.cache

        },

        scan: {

          latestBlock,

          tokensReturned:
            rawTokens.length,

          candidatesFound:
            candidates.length,

          candidatesReturned:
            top.length

        },

        candidates:
          top,

        targetAnalysis: {

          description:
            "Shows the theoretical market-cap multiple required to reach major targets.",

          targets: [
            "$100M",
            "$250M",
            "$500M"
          ],

          warning:
            "These are mathematical market-cap multiples, not price predictions."
        },

        validation: {

          liquidity:
            "NOT YET VERIFIED",

          tradingVolume:
            "NOT YET VERIFIED",

          holderConcentration:
            "NOT YET VERIFIED",

          whaleAccumulation:
            "NOT YET VERIFIED",

          smartMoney:
            "NOT YET VERIFIED",

          socialMomentum:
            "NOT YET VERIFIED",

          buySellPressure:
            "NOT YET VERIFIED"

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
            "UNVERIFIED",

          volume:
            "UNVERIFIED",

          whales:
            "UNVERIFIED",

          smartMoney:
            "UNVERIFIED",

          social:
            "UNVERIFIED"

        },

        nextStage:
          "Liquidity, volume and holder-concentration verification",

        timestamp:
          new Date().toISOString()

      });

    } catch (error) {

      return json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V8",

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
