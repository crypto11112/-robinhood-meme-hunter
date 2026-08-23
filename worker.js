const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API =
  "https://robinhoodchain.blockscout.com/api/v2";

const MAX_TOKENS = 50;
const MAX_CANDIDATES = 20;
const MAX_ACTIVITY_REQUESTS = 12;

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

async function blockscout(path) {
  const response = await fetch(
    `${BLOCKSCOUT_API}${path}`
  );

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

  return data;
}

function num(value) {
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

function text(value) {
  return String(value || "").trim();
}

function isLikelyMeme(token) {
  const name =
    text(token.name).toLowerCase();

  const symbol =
    text(token.symbol).toLowerCase();

  const memeWords = [
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
    "bro",
    "baby",
    "chad",
    "based",
    "coin",
    "goat",
    "penguin",
    "duck",
    "bear",
    "bull",
    "panda",
    "fish",
    "hamster",
    "monkey",
    "pizza",
    "shit",
    "stonk",
    "woof",
    "frong",
    "john"
  ];

  return memeWords.some(
    word =>
      name.includes(word) ||
      symbol.includes(word)
  );
}

function memeNameScore(token) {
  const name =
    text(token.name).toLowerCase();

  const symbol =
    text(token.symbol).toLowerCase();

  let score = 0;

  const strongWords = [
    "pepe",
    "dog",
    "cat",
    "frog",
    "wojak",
    "wif",
    "shib",
    "inu",
    "bonk",
    "meme"
  ];

  const mediumWords = [
    "yolo",
    "degen",
    "tendies",
    "ape",
    "goat",
    "moon",
    "lambo",
    "woof",
    "stonk",
    "chad",
    "panda",
    "penguin"
  ];

  for (const word of strongWords) {
    if (
      name.includes(word) ||
      symbol.includes(word)
    ) {
      score += 18;
    }
  }

  for (const word of mediumWords) {
    if (
      name.includes(word) ||
      symbol.includes(word)
    ) {
      score += 10;
    }
  }

  return Math.min(score, 35);
}

function marketCapScore(marketCap) {
  if (marketCap === null) return 0;

  if (marketCap < 1_000_000) return 30;
  if (marketCap < 5_000_000) return 27;
  if (marketCap < 10_000_000) return 24;
  if (marketCap < 25_000_000) return 20;
  if (marketCap < 50_000_000) return 14;
  if (marketCap < 100_000_000) return 8;
  if (marketCap < 500_000_000) return 3;

  return 0;
}

function holderScore(holders) {
  if (holders === null) return 0;

  if (holders >= 1000 && holders < 10000) {
    return 15;
  }

  if (holders >= 500 && holders < 1000) {
    return 11;
  }

  if (holders >= 10000) {
    return 8;
  }

  if (holders >= 100) {
    return 6;
  }

  return 2;
}

function activityScore(transfers) {
  if (transfers === null) return 0;

  if (transfers >= 100000) return 15;
  if (transfers >= 50000) return 13;
  if (transfers >= 10000) return 10;
  if (transfers >= 5000) return 7;
  if (transfers >= 1000) return 4;
  if (transfers >= 100) return 2;

  return 0;
}

function earlyStageScore(marketCap) {
  if (marketCap === null) return 0;

  if (marketCap >= 1_000_000 &&
      marketCap <= 10_000_000) {
    return 10;
  }

  if (marketCap > 10_000_000 &&
      marketCap <= 25_000_000) {
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
    num(token.marketCap);

  const holders =
    num(token.holders);

  if (
    marketCap !== null &&
    marketCap < 500000
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
    token.transfers !== null &&
    token.transfers !== undefined &&
    num(token.transfers) < 100
  ) {
    flags.push(
      "LOW_TRANSFER_ACTIVITY"
    );
  }

  if (
    marketCap !== null &&
    marketCap > 100000000
  ) {
    flags.push(
      "ALREADY_LARGE"
    );
  }

  return flags;
}

function finalScore(token) {
  const marketCap =
    num(token.marketCap);

  const holders =
    num(token.holders);

  const transfers =
    num(token.transfers);

  let score = 0;

  score += marketCapScore(
    marketCap
  );

  score += holderScore(
    holders
  );

  score += activityScore(
    transfers
  );

  score += memeNameScore(
    token
  );

  score += earlyStageScore(
    marketCap
  );

  return Math.min(
    Math.round(score),
    100
  );
}

function category(score) {
  if (score >= 75) {
    return "HIGH-POTENTIAL";
  }

  if (score >= 60) {
    return "WATCH";
  }

  if (score >= 45) {
    return "EARLY";
  }

  return "LOW-PRIORITY";
}

export default {
  async fetch(request, env, ctx) {
    try {
      // ==============================
      // 1. VERIFY CHAIN
      // ==============================

      const chainHex =
        await rpc("eth_chainId");

      const chainId =
        parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          agent:
            "Robinhood Chain Meme Hunter",
          version: "V6",
          status: "ERROR",
          detectedChainId: chainId
        }, 500);
      }

      // ==============================
      // 2. LATEST BLOCK
      // ==============================

      const latestBlockHex =
        await rpc(
          "eth_blockNumber"
        );

      const latestBlock =
        parseInt(
          latestBlockHex,
          16
        );

      // ==============================
      // 3. GET TOKEN LIST
      // ==============================

      const tokenData =
        await blockscout(
          `/tokens?type=ERC-20&items_count=${MAX_TOKENS}`
        );

      const rawTokens =
        Array.isArray(
          tokenData.items
        )
          ? tokenData.items
          : [];

      // ==============================
      // 4. EXCLUDE OBVIOUS NON-MEMES
      // ==============================

      const excludedSymbols =
        new Set([
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

      const baseCandidates =
        rawTokens
          .filter(token => {
            const symbol =
              text(
                token.symbol
              ).toUpperCase();

            if (
              excludedSymbols.has(
                symbol
              )
            ) {
              return false;
            }

            return true;
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
              null,

            transfers:
              null,

            likelyMeme:
              isLikelyMeme(token)
          }))
          .filter(token => {
            const mc =
              num(token.marketCap);

            // Prefer tokens below $100M
            // because this is an early-stage
            // discovery scanner.

            return (
              mc === null ||
              mc < 100_000_000
            );
          });

      // ==============================
      // 5. SORT MEME-LIKE TOKENS FIRST
      // ==============================

      baseCandidates.sort(
        (a, b) => {
          if (
            a.likelyMeme &&
            !b.likelyMeme
          ) {
            return -1;
          }

          if (
            !a.likelyMeme &&
            b.likelyMeme
          ) {
            return 1;
          }

          return (
            (num(a.marketCap) || 999999999) -
            (num(b.marketCap) || 999999999)
          );
        }
      );

      const activityCandidates =
        baseCandidates.slice(
          0,
          MAX_ACTIVITY_REQUESTS
        );

      // ==============================
      // 6. FETCH TRANSFER COUNTERS
      // ==============================

      for (
        const token of activityCandidates
      ) {
        try {
          const counters =
            await blockscout(
              `/tokens/${token.contract}/counters`
            );

          token.transfers =
            num(
              counters.transfers_count ??
              counters.transfers
            );

        } catch {
          token.transfers = null;
        }
      }

      // ==============================
      // 7. SCORE
      // ==============================

      for (
        const token of baseCandidates
      ) {
        token.discoveryScore =
          finalScore(token);

        token.category =
          category(
            token.discoveryScore
          );

        token.riskFlags =
          riskFlags(token);
      }

      // ==============================
      // 8. FINAL SORT
      // ==============================

      baseCandidates.sort(
        (a, b) =>
          b.discoveryScore -
          a.discoveryScore
      );

      const candidates =
        baseCandidates.slice(
          0,
          MAX_CANDIDATES
        );

      // ==============================
      // 9. RETURN
      // ==============================

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          "V6",

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
            "CONNECTED"
        },

        scan: {
          latestBlock,

          tokensReturned:
            rawTokens.length,

          tokensAfterFiltering:
            baseCandidates.length,

          candidatesReturned:
            candidates.length,

          activityRequests:
            activityCandidates.length
        },

        candidates,

        scoring: {
          maximum:
            100,

          factors: [
            "market cap",
            "holder count",
            "transfer activity",
            "meme likelihood",
            "early-stage potential"
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

          transfers:
            "VERIFIED WHERE INDEXED WHERE AVAILABLE",

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
          "V6",

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
