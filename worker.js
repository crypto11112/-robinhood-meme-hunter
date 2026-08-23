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

  return Math.min(matches * 12, 36);
}

function marketCapScore(marketCap) {
  if (marketCap === null) return 0;

  if (marketCap < 1000000) return 28;
  if (marketCap < 5000000) return 25;
  if (marketCap < 10000000) return 22;
  if (marketCap < 25000000) return 18;
  if (marketCap < 50000000) return 12;
  if (marketCap < 100000000) return 6;

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
    marketCap >= 1000000 &&
    marketCap <= 10000000
  ) {
    return 10;
  }

  if (
    marketCap > 10000000 &&
    marketCap <= 25000000
  ) {
    return 7;
  }

  if (marketCap < 1000000) {
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
    marketCap < 500000
  ) {
    flags.push("VERY_LOW_MARKET_CAP");
  }

  if (
    holders !== null &&
    holders < 100
  ) {
   
