const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api/v2";

const TOKEN_LIMIT = 50;
const OUTPUT_LIMIT = 25;

// Keep requests low to avoid public Blockscout 429s.
const CACHE_TTL = 300;

const EXCLUDED_SYMBOLS = new Set([
  "WETH",
  "USDC",
  "USDT",
  "WBTC",
  "DAI"
]);

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}

function n(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const x = Number(value);

  return Number.isFinite(x) ? x : null;
}

function s(value) {
  return String(value || "").trim();
}

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
    throw new Error(
      data.error.message || "RPC error"
    );
  }

  return data.result;
}

async function blockscout(path, cache) {
  const url = `${BLOCKSCOUT_API}${path}`;
  const request = new Request(url);

  const cached = await cache.match(request);

  if (cached) {
    return {
      data: await cached.json(),
      cache: "HIT"
    };
  }

  const response = await fetch(url);

  if (response.status === 429) {
    throw new Error("BLOCKSCOUT_HTTP_429");
  }

  if (!response.ok) {
    throw new Error(
      `BLOCKSCOUT_HTTP_${response.status}`
    );
  }

  const data = await response.json();

  await cache.put(
    request,
    new Response(
      JSON.stringify(data),
      {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control":
            `public, max-age=${CACHE_TTL}`
        }
      }
    )
  );

  return {
    data,
    cache: "MISS"
  };
}

/* -----------------------------
   MEME DETECTION
----------------------------- */

function memeLikelihood(token) {

  const name =
    s(token.name).toLowerCase();

  const symbol =
    s(token.symbol).toLowerCase();

  const memeWords = [
    "cat",
    "dog",
    "frog",
    "pepe",
    "wojak",
    "wif",
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
    "chad"
  ];

  let matches = 0;

  for (const word of memeWords) {
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

/* -----------------------------
   BASIC MARKET SCORE
----------------------------- */

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

/* -----------------------------
   HOLDER SCORE
----------------------------- */

function holderScore(holders) {

  if (holders === null) return 0;

  if (
    holders >= 1000 &&
    holders < 10000
  ) {
    return 18;
  }

  if (
    holders >= 10000
  ) {
    return 10;
  }

  if (
    holders >= 500
  ) {
    return 14;
  }

  if (
    holders >= 100
  ) {
    return 6;
  }

  return 1;
}

/* -----------------------------
   EARLY STAGE
----------------------------- */

function earlyStageScore(mc) {

  if (mc === null) return 0;

  if (
    mc >= 1_000_000 &&
    mc <= 10_000_000
  ) {
    return 10;
  }

  if (
    mc > 10_000_000 &&
    mc <= 25_000_000
  ) {
    return 7;
  }

  if (mc < 1_000_000) {
    return 8;
  }

  return 0;
}

/* -----------------------------
   BASIC RISK FLAGS
----------------------------- */

function riskFlags(token) {

  const flags = [];

  const mc =
    n(token.marketCap);

  const holders =
    n(token.holders);

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

/* -----------------------------
   TARGETS
----------------------------- */

function targetAnalysis(mc) {

  if (
    mc === null ||
    mc <= 0
  ) {
    return null;
  }

  return {

    to100M:
      Number(
        (
          100_000_000 / mc
        ).toFixed(1)
      ),

    to250M:
      Number(
        (
          250_000_000 / mc
        ).toFixed(1)
      ),

    to500M:
      Number(
        (
          500_000_000 / mc
        ).toFixed(1)
      )

  };
}

/* -----------------------------
   HOLDER CONCENTRATION
----------------------------- */

async function holderAnalysis(
  contract,
  cache
) {

  try {

    const result =
      await blockscout(
        `/tokens/${contract}/holders`,
        cache
      );

    const items =
      Array.isArray(
        result.data.items
      )
        ? result.data.items
        : [];

    if (!items.length) {

      return {
        status:
          "UNAVAILABLE",

        top10Share:
          null,

        top20Share:
          null,

        verified:
          false
      };

    }

    let totalShare = 0;

    const shares =
      items
        .slice(0, 20)
        .map(holder => {

          const pct =
            n(
              holder.percentage
            );

          return pct || 0;

        });

    for (let i = 0; i < 10; i++) {
      totalShare +=
        shares[i] || 0;
    }

    let top20 = 0;

    for (let i = 0; i < 20; i++) {
      top20 +=
        shares[i] || 0;
    }

    return {

      status:
        "VERIFIED",

      top10Share:
        Number(
          totalShare.toFixed(2)
        ),

      top20Share:
        Number(
          top20.toFixed(2)
        ),

      holdersSampled:
        items.length,

      verified:
        true

    };

  } catch (error) {

    return {

      status:
        "UNAVAILABLE",

      error:
        error.message,

      top10Share:
        null,

      top20Share:
        null,

      verified:
        false

    };

  }
}

/* -----------------------------
   TRANSFER ACTIVITY
----------------------------- */

async function transferActivity(
  contract,
  cache
) {

  try {

    const result =
      await blockscout(
        `/tokens/${contract}/transfers?items_count=50`,
        cache
      );

    const items =
      Array.isArray(
        result.data.items
      )
        ? result.data.items
        : [];

    if (!items.length) {

      return {

        status:
          "NO_RECENT_TRANSFERS",

        transfers:
          0,

        uniqueWallets:
          0,

        inflowTransfers:
          0,

        outflowTransfers:
          0,

        activityScore:
          0

      };

    }

    const wallets =
      new Set();

    let inflow = 0;
    let outflow = 0;

    for (const item of items) {

      const from =
        s(
          item.from?.hash
        ).toLowerCase();

      const to =
        s(
          item.to?.hash
        ).toLowerCase();

      if (from) wallets.add(from);
      if (to) wallets.add(to);

      if (to === contract.toLowerCase()) {
        inflow++;
      }

      if (from === contract.toLowerCase()) {
        outflow++;
      }

    }

    const activityScore =
      Math.min(
        10,
        Math.floor(
          items.length / 5
        )
      );

    return {

      status:
        "VERIFIED_FROM_TOKEN_TRANSFERS",

      transfers:
        items.length,

      uniqueWallets:
        wallets.size,

      inflowTransfers:
        inflow,

      outflowTransfers:
        outflow,

      activityScore

    };

  } catch (error) {

    return {

      status:
        "UNAVAILABLE",

      transfers:
        null,

      uniqueWallets:
        null,

      inflowTransfers:
        null,

      outflowTransfers:
        null,

      activityScore:
        0,

      error:
        error.message

    };

  }
}

/* -----------------------------
   VALIDATION SCORE
----------------------------- */

function calculateScore(
  token,
  holderData,
  activityData
) {

  const mc =
    n(token.marketCap);

  const holders =
    n(token.holders);

  let score = 0;

  score +=
    marketCapScore(mc);

  score +=
    holderScore(holders);

  score +=
    earlyStageScore(mc);

  score +=
    memeLikelihood(token);

  if (
    holderData?.verified
  ) {

    if (
      holderData.top10Share !== null
    ) {

      if (
        holderData.top10Share < 25
      ) {
        score += 10;
      }

      else if (
        holderData.top10Share < 40
      ) {
        score += 6;
      }

      else if (
        holderData.top10Share < 60
      ) {
        score += 2;
      }

    }

  }

  if (
    activityData?.activityScore
  ) {

    score +=
      activityData.activityScore;

  }

  return Math.min(
    100,
    Math.round(score)
  );
}

function category(score) {

  if (score >= 75)
    return "HIGH-POTENTIAL";

  if (score >= 60)
    return "WATCH";

  if (score >= 45)
    return "EARLY";

  return "LOW-PRIORITY";
}

/* -----------------------------
   WORKER
----------------------------- */

export default {

  async fetch(
    request,
    env,
    ctx
  ) {

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

      if (
        chainId !== 4663
      ) {

        return json({
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            "V9",

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

      /* CACHE */

      const cache =
        caches.default;

      /* TOKEN DISCOVERY */

      const tokenResult =
        await blockscout(
          `/tokens?type=ERC-20&items_count=${TOKEN_LIMIT}`,
          cache
        );

      const rawTokens =
        Array.isArray(
          tokenResult.data.items
        )
          ? tokenResult.data.items
          : [];

      /* BASIC FILTER */

      const baseCandidates =
        rawTokens

          .filter(token => {

            const symbol =
              s(
                token.symbol
              ).toUpperCase();

            return !EXCLUDED_SYMBOLS.has(
              symbol
            );

          })

          .map(token => {

            return {

              name:
                token.name ||
                null,

              symbol:
                token.symbol ||
                null,

              contract:
                token.address ||
                token.address_hash ||
                null,

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

            };

          })

          .filter(token => {

            const mc =
              n(
                token.marketCap
              );

            return (
              mc === null ||
              mc < 100_000_000
            );

          });

      /*
       * Only deeply analyse the first
       * 12 candidates to avoid hammering
       * the public explorer.
       */

      const discoveryCandidates =
        baseCandidates
          .map(token => {

            const preliminary =
              marketCapScore(
                n(token.marketCap)
              ) +
              holderScore(
                n(token.holders)
              ) +
              earlyStageScore(
                n(token.marketCap)
              ) +
              memeLikelihood(token);

            return {
              token,
              preliminary
            };

          })
          .sort(
            (a, b) =>
              b.preliminary -
              a.preliminary
          )
          .slice(0, 12);

      const analysed = [];

      for (
        const item
        of discoveryCandidates
      ) {

        const token =
          item.token;

        if (!token.contract) {
          continue;
        }

        const holders =
          await holderAnalysis(
            token.contract,
            cache
          );

        const activity =
          await transferActivity(
            token.contract,
            cache
          );

        const score =
          calculateScore(
            token,
            holders,
            activity
          );

        const flags =
          riskFlags(token);

        if (
          holders.verified &&
          holders.top10Share !== null
        ) {

          if (
            holders.top10Share >= 60
          ) {

            flags.push(
              "HIGH_TOP10_CONCENTRATION"
            );

          }

          if (
            holders.top10Share >= 40 &&
            holders.top10Share < 60
          ) {

            flags.push(
              "ELEVATED_TOP10_CONCENTRATION"
            );

          }

        }

        analysed.push({

          name:
            token.name,

          symbol:
            token.symbol,

          contract:
            token.contract,

          type:
            token.type,

          price:
            token.price,

          marketCap:
            token.marketCap,

          holders:
            token.holders,

          totalSupply:
            token.totalSupply,

          decimals:
            token.decimals,

          memeLikelihood:
            memeLikelihood(token),

          discoveryScore:
            score,

          category:
            category(score),

          riskFlags:
            flags,

          holderAnalysis:
            holders,

          walletActivity:
            activity,

          liquidity:
            {
              status:
                "NOT_YET_VERIFIED"
            },

          tradingVolume:
            {
              status:
                "NOT_YET_VERIFIED"
            },

          accumulationDistribution:
            {
              status:
                "NOT_YET_VERIFIED"
            },

          smartMoney:
            {
              status:
                "NOT_YET_VERIFIED"
            },

          socialMomentum:
            {
              status:
                "NOT_YET_VERIFIED"
            },

          targetAnalysis:
            targetAnalysis(
              n(token.marketCap)
            )

        });

      }

      analysed.sort(
        (a, b) =>
          b.discoveryScore -
          a.discoveryScore
      );

      const candidates =
        analysed.slice(
          0,
          OUTPUT_LIMIT
        );

      return json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V9",

        status:
          "ONLINE",

        objective:
          "Early-stage meme coin discovery with on-chain holder and transfer validation",

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
            tokenResult.cache

        },

        scan: {

          latestBlock,

          tokensReturned:
            rawTokens.length,

          candidatesFound:
            baseCandidates.length,

          deeplyAnalysed:
            candidates.length,

          candidatesReturned:
            candidates.length

        },

        candidates,

        validation: {

          liquidity:
            "NOT_YET_VERIFIED",

          tradingVolume:
            "NOT_YET_VERIFIED",

          holderConcentration:
            "ON-CHAIN VALIDATION ENABLED",

          walletActivity:
            "TOKEN TRANSFER ACTIVITY ENABLED",

          accumulationDistribution:
            "NOT_YET_VERIFIED",

          whaleActivity:
            "PARTIAL — HOLDER DATA",

          smartMoney:
            "NOT_YET_VERIFIED",

          socialMomentum:
            "NOT_YET_VERIFIED",

          buySellPressure:
            "NOT_YET_VERIFIED"

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

          holderConcentration:
            "VERIFIED WHEN HOLDER ENDPOINT RETURNS DATA",

          walletActivity:
            "VERIFIED FROM TOKEN TRANSFERS",

          liquidity:
            "NOT YET VERIFIED",

          volume:
            "NOT YET VERIFIED",

          accumulation:
            "NOT YET VERIFIED",

          smartMoney:
            "NOT YET VERIFIED",

          social:
            "NOT YET VERIFIED"

        },

        scoring: {

          maximum:
            100,

          warning:
            "This is an analytical screening score, not a prediction or investment advice."

        },

        nextStage:
          "DEX liquidity, trade volume and buy/sell flow integration",

        timestamp:
          new Date().toISOString()

      });

    } catch (error) {

      if (
        error.message ===
        "BLOCKSCOUT_HTTP_429"
      ) {

        return json({

          agent:
            "Robinhood Chain Meme Hunter",

          version:
            "V9",

          status:
            "RATE_LIMITED",

          error:
            "Blockscout HTTP 429",

          message:
            "The public Blockscout endpoint has rate-limited the Worker. Wait briefly and retry; cached responses are used where available.",

          timestamp:
            new Date().toISOString()

        }, 429);

      }

      return json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V9",

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
