const VERSION = "V28";

const CONFIG = {
  chainId: 4663,
  rpc: "https://rpc.mainnet.chain.robinhood.com",

  dexApi: "https://api.dexscreener.com",
  dexChain: "robinhood",

  launchContracts: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  tokenCreatedTopic:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  /*
   * Keep RPC discovery conservative because
   * the Robinhood public RPC may reject large
   * eth_getLogs ranges.
   */
  scanBlocks: 5000,
  initialChunk: 250,

  /*
   * Cloudflare Worker free-plan protection.
   */
  maxSubrequests: 55,

  /*
   * Only inspect a few of the newest verified
   * launches per scan.
   */
  maxTokens: 5,

  /*
   * DexScreener endpoint accepts multiple
   * comma-separated token addresses.
   */
  maxDexBatchSize: 5,

  minMarketCap: 10000,
  maxMarketCap: 50000000,
  minLiquidity: 3000,
  minVolume24h: 500,

  alertScore: 70,

  /*
   * In-memory cache for the current Worker
   * isolate. This is not permanent storage,
   * but prevents duplicate calls during an
   * invocation.
   */
  cacheTtlMs: 30000
};

let requests = 0;

const dexCache = new Map();


/* ============================================================
   BASIC HELPERS
============================================================ */

function lower(v) {
  return String(v || "").toLowerCase();
}

function toAddress(v) {
  if (!v) return null;

  let s = String(v);

  if (s.startsWith("0x")) {
    s = s.slice(2);
  }

  if (s.length < 40) {
    return null;
  }

  s = s.slice(-40);

  if (!/^[0-9a-fA-F]{40}$/.test(s)) {
    return null;
  }

  return "0x" + s.toLowerCase();
}

function hexToNumber(v) {
  try {
    return parseInt(v || "0x0", 16);
  } catch {
    return 0;
  }
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function canRequest() {
  return requests < CONFIG.maxSubrequests;
}

function addRequest() {
  requests++;
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


/* ============================================================
   GENERIC RPC
============================================================ */

async function rpc(method, params = []) {

  if (!canRequest()) {
    return {
      ok: false,
      error: "SUBREQUEST_LIMIT"
    };
  }

  addRequest();

  try {

    const response = await fetch(
      CONFIG.rpc,
      {
        method: "POST",

        headers: {
          "content-type": "application/json"
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: requests,
          method,
          params
        })
      }
    );

    if (!response.ok) {
      return {
        ok: false,
        error: `HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    if (data.error) {
      return {
        ok: false,
        error:
          data.error.message ||
          `RPC_${data.error.code}`
      };
    }

    return {
      ok: true,
      result: data.result
    };

  } catch (e) {

    return {
      ok: false,
      error:
        String(
          e?.message || e
        )
    };
  }
}


/* ============================================================
   LATEST BLOCK
============================================================ */

async function getLatestBlock() {

  const result =
    await rpc("eth_blockNumber");

  if (!result.ok) {
    throw new Error(result.error);
  }

  return hexToNumber(
    result.result
  );
}


/* ============================================================
   GET LOGS
============================================================ */

async function getLogs(
  fromBlock,
  toBlock
) {

  return await rpc(
    "eth_getLogs",
    [{
      fromBlock:
        "0x" +
        fromBlock.toString(16),

      toBlock:
        "0x" +
        toBlock.toString(16),

      address:
        CONFIG.launchContracts,

      topics: [
        CONFIG.tokenCreatedTopic
      ]
    }]
  );
}


/* ============================================================
   ADAPTIVE RPC DISCOVERY
============================================================ */

async function scanLogRange(
  fromBlock,
  toBlock
) {

  const logs = [];

  let current =
    fromBlock;

  let chunk =
    CONFIG.initialChunk;

  let failedRanges = 0;

  while (
    current <= toBlock &&
    canRequest()
  ) {

    const end =
      Math.min(
        current + chunk - 1,
        toBlock
      );

    const result =
      await getLogs(
        current,
        end
      );

    if (result.ok) {

      const found =
        Array.isArray(
          result.result
        )
          ? result.result
          : [];

      logs.push(
        ...found
      );

      current =
        end + 1;

      /*
       * Slowly increase range after
       * successful calls.
       */
      if (chunk < 500) {
        chunk += 50;
      }

      continue;
    }

    failedRanges++;

    /*
     * Shrink failed ranges.
     */
    if (chunk > 25) {

      chunk =
        Math.max(
          25,
          Math.floor(
            chunk / 2
          )
        );

      continue;
    }

    /*
     * Avoid infinite retry loops.
     */
    current =
      end + 1;
  }

  return {
    logs,
    failedRanges
  };
}


/* ============================================================
   EVENT ADDRESS EXTRACTION
============================================================ */

function extractAddresses(log) {

  const result = [];

  if (
    Array.isArray(
      log?.topics
    )
  ) {

    for (
      let i = 1;
      i < log.topics.length;
      i++
    ) {

      const address =
        toAddress(
          log.topics[i]
        );

      if (address) {
        result.push(address);
      }
    }
  }

  const data =
    String(
      log?.data || ""
    );

  if (
    data.startsWith("0x")
  ) {

    const clean =
      data.slice(2);

    for (
      let i = 0;
      i + 64 <= clean.length;
      i += 64
    ) {

      const word =
        clean.slice(
          i,
          i + 64
        );

      const address =
        toAddress(word);

      if (address) {
        result.push(address);
      }
    }
  }

  return [
    ...new Set(result)
  ];
}


/* ============================================================
   ETH CALL
============================================================ */

async function ethCall(
  token,
  data
) {

  const result =
    await rpc(
      "eth_call",
      [
        {
          to: token,
          data
        },
        "latest"
      ]
    );

  return result.ok
    ? result.result
    : null;
}


/* ============================================================
   ABI UINT
============================================================ */

function decodeUint(v) {

  if (!v || v === "0x") {
    return null;
  }

  try {
    return BigInt(v);
  } catch {
    return null;
  }
}


/* ============================================================
   ABI STRING
============================================================ */

function decodeString(v) {

  if (!v || v === "0x") {
    return null;
  }

  try {

    const clean =
      v.replace(
        /^0x/,
        ""
      );

    /*
     * Dynamic ABI string.
     */
    if (
      clean.length >= 128
    ) {

      const offset =
        parseInt(
          clean.slice(
            0,
            64
          ),
          16
        );

      const position =
        offset * 2;

      const length =
        parseInt(
          clean.slice(
            position,
            position + 64
          ),
          16
        );

      const start =
        position + 64;

      const end =
        start +
        length * 2;

      if (
        end <=
        clean.length
      ) {

        let output = "";

        for (
          let i = start;
          i < end;
          i += 2
        ) {

          const code =
            parseInt(
              clean.slice(
                i,
                i + 2
              ),
              16
            );

          if (
            code >= 32 &&
            code <= 126
          ) {
            output +=
              String.fromCharCode(
                code
              );
          }
        }

        if (
          output.trim()
        ) {
          return output.trim();
        }
      }
    }

  } catch {}

  return null;
}


/* ============================================================
   ERC20 VERIFICATION
============================================================ */

async function verifyToken(
  token
) {

  if (!canRequest()) {
    return null;
  }

  /*
   * totalSupply()
   */
  const supplyRaw =
    await ethCall(
      token,
      "0x18160ddd"
    );

  const supply =
    decodeUint(
      supplyRaw
    );

  if (
    supply === null ||
    supply <= 0n
  ) {
    return null;
  }

  /*
   * decimals()
   */
  const decimalsRaw =
    await ethCall(
      token,
      "0x313ce567"
    );

  const decimals =
    decodeUint(
      decimalsRaw
    );

  if (
    decimals === null ||
    decimals > 36n
  ) {
    return null;
  }

  let name =
    "UNKNOWN";

  let symbol =
    "UNKNOWN";

  if (canRequest()) {

    const raw =
      await ethCall(
        token,
        "0x06fdde03"
      );

    name =
      decodeString(raw) ||
      "UNKNOWN";
  }

  if (canRequest()) {

    const raw =
      await ethCall(
        token,
        "0x95d89b41"
      );

    symbol =
      decodeString(raw) ||
      "UNKNOWN";
  }

  return {

    address:
      token,

    name,

    symbol,

    decimals:
      Number(decimals),

    totalSupply:
      supply.toString()
  };
}


/* ============================================================
   DISCOVER TOKENS
============================================================ */

async function discoverTokens() {

  const latest =
    await getLatestBlock();

  const start =
    Math.max(
      0,
      latest -
      CONFIG.scanBlocks +
      1
    );

  const scan =
    await scanLogRange(
      start,
      latest
    );

  const rawLogs =
    scan.logs;

  /*
   * Newest first.
   */
  rawLogs.sort(
    (a, b) =>
      hexToNumber(
        b.blockNumber
      ) -
      hexToNumber(
        a.blockNumber
      )
  );

  const verified = [];

  const seen =
    new Set();

  for (
    const log of rawLogs
  ) {

    if (
      verified.length >=
      CONFIG.maxTokens
    ) {
      break;
    }

    if (!canRequest()) {
      break;
    }

    const addresses =
      extractAddresses(
        log
      );

    for (
      const token of addresses
    ) {

      if (
        verified.length >=
        CONFIG.maxTokens
      ) {
        break;
      }

      if (
        seen.has(token)
      ) {
        continue;
      }

      seen.add(token);

      if (
        CONFIG.launchContracts
          .map(lower)
          .includes(
            lower(token)
          )
      ) {
        continue;
      }

      const info =
        await verifyToken(
          token
        );

      if (!info) {
        continue;
      }

      verified.push({

        ...info,

        block:
          hexToNumber(
            log.blockNumber
          ),

        transaction:
          log.transactionHash,

        launchContract:
          lower(
            log.address
          )
      });
    }
  }

  return {

    latestBlock:
      latest,

    startBlock:
      start,

    blocksScanned:
      latest -
      start +
      1,

    rawLogs:
      rawLogs.length,

    failedRanges:
      scan.failedRanges,

    verified
  };
}


/* ============================================================
   DEXSCREENER BATCH LOOKUP
============================================================ */

async function dexBatchLookup(
  tokens
) {

  const output = {};

  const addresses =
    tokens
      .map(
        t => lower(
          t.address
        )
      )
      .filter(Boolean);

  if (
    addresses.length === 0
  ) {
    return {
      ok: true,
      data: output,
      error: null
    };
  }

  /*
   * Remove duplicate addresses.
   */
  const unique =
    [
      ...new Set(
        addresses
      )
    ];

  /*
   * Use a single request.
   */
  const batch =
    unique
      .slice(
        0,
        CONFIG.maxDexBatchSize
      )
      .join(",");

  const cacheKey =
    batch;

  const cached =
    dexCache.get(
      cacheKey
    );

  if (
    cached &&
    (
      Date.now() -
      cached.time
    ) <
    CONFIG.cacheTtlMs
  ) {

    return {
      ok: true,
      data:
        cached.data,
      error: null,
      cached: true
    };
  }

  if (!canRequest()) {

    return {
      ok: false,
      data: output,
      error:
        "SUBREQUEST_LIMIT"
    };
  }

  addRequest();

  try {

    const response =
      await fetch(
        `${CONFIG.dexApi}/latest/dex/tokens/${batch}`,
        {
          method: "GET",

          headers: {
            accept:
              "application/json",

            "user-agent":
              "Robinhood-Meme-Hunter-V28"
          }
        }
      );

    /*
     * Rate limit.
     */
    if (
      response.status ===
      429
    ) {

      return {
        ok: false,
        data: output,
        error:
          "HTTP_429"
      };
    }

    if (!response.ok) {

      return {
        ok: false,
        data: output,
        error:
          `HTTP_${response.status}`
      };
    }

    const json =
      await response.json();

    const pairs =
      Array.isArray(
        json?.pairs
      )
        ? json.pairs
        : [];

    for (
      const pair of pairs
    ) {

      if (
        lower(
          pair?.chainId
        ) !==
        CONFIG.dexChain
      ) {
        continue;
      }

      const address =
        lower(
          pair?.baseToken?.address
        );

      if (!address) {
        continue;
      }

      if (
        !output[address]
      ) {
        output[address] = [];
      }

      output[address].push(
        pair
      );
    }

    /*
     * Sort each token's pairs by
     * liquidity.
     */
    for (
      const address of
      Object.keys(output)
    ) {

      output[address].sort(
        (a, b) =>
          (
            Number(
              b?.liquidity?.usd
            ) || 0
          ) -
          (
            Number(
              a?.liquidity?.usd
            ) || 0
          )
      );
    }

    dexCache.set(
      cacheKey,
      {
        time:
          Date.now(),

        data:
          output
      }
    );

    return {
      ok: true,
      data: output,
      error: null
    };

  } catch (e) {

    return {
      ok: false,
      data: output,
      error:
        String(
          e?.message || e
        )
    };
  }
}


/* ============================================================
   MEME SIGNAL
============================================================ */

function memeSignal(
  name,
  symbol
) {

  const text =
    (
      String(name) +
      " " +
      String(symbol)
    ).toLowerCase();

  const keywords = [
    "pepe",
    "frog",
    "doge",
    "dog",
    "inu",
    "shib",
    "cat",
    "kitty",
    "bonk",
    "wif",
    "goat",
    "ape",
    "monkey",
    "fart",
    "degen",
    "moon",
    "chad",
    "pup",
    "woof",
    "bear",
    "bull",
    "panda",
    "yolo",
    "meme",
    "robin",
    "hood"
  ];

  let score = 0;

  for (
    const keyword of keywords
  ) {

    if (
      text.includes(
        keyword
      )
    ) {
      score += 4;
    }
  }

  return Math.min(
    20,
    score
  );
}


/* ============================================================
   SCORE
============================================================ */

function calculateScore(c) {

  let score = 0;

  /*
   * Market cap.
   */
  if (
    c.marketCap <= 100000
  ) {
    score += 22;
  } else if (
    c.marketCap <= 250000
  ) {
    score += 20;
  } else if (
    c.marketCap <= 1000000
  ) {
    score += 18;
  } else if (
    c.marketCap <= 5000000
  ) {
    score += 15;
  } else {
    score += 10;
  }

  /*
   * Liquidity.
   */
  if (
    c.liquidity >= 100000
  ) {
    score += 15;
  } else if (
    c.liquidity >= 50000
  ) {
    score += 13;
  } else if (
    c.liquidity >= 25000
  ) {
    score += 10;
  } else if (
    c.liquidity >= 10000
  ) {
    score += 7;
  } else {
    score += 3;
  }

  /*
   * Volume / market cap.
   */
  if (
    c.volumeToMarketCap >= 5
  ) {
    score += 15;
  } else if (
    c.volumeToMarketCap >= 2
  ) {
    score += 12;
  } else if (
    c.volumeToMarketCap >= 1
  ) {
    score += 9;
  } else if (
    c.volumeToMarketCap >= 0.5
  ) {
    score += 5;
  }

  /*
   * Buy/sell pressure.
   */
  if (
    c.buySellRatio >= 3
  ) {
    score += 15;
  } else if (
    c.buySellRatio >= 2
  ) {
    score += 13;
  } else if (
    c.buySellRatio >= 1.5
  ) {
    score += 10;
  } else if (
    c.buySellRatio >= 1.2
  ) {
    score += 7;
  } else if (
    c.buySellRatio >= 1
  ) {
    score += 3;
  }

  /*
   * Meme signal.
   */
  score += Math.round(
    c.memeScore * 0.75
  );

  /*
   * Activity.
   */
  if (
    c.transactions >= 5000
  ) {
    score += 5;
  } else if (
    c.transactions >= 1000
  ) {
    score += 4;
  } else if (
    c.transactions >= 250
  ) {
    score += 2;
  }

  /*
   * Risk.
   */
  if (
    c.liquidity <
    c.marketCap * 0.05
  ) {
    score -= 10;
  }

  if (
    c.buySellRatio < 0.8
  ) {
    score -= 20;
  }

  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );
}


/* ============================================================
   BUILD CANDIDATE
============================================================ */

function buildCandidate(
  token,
  pair
) {

  const marketCap =
    num(
      pair?.marketCap
    ) ??
    num(
      pair?.fdv
    );

  const liquidity =
    num(
      pair?.liquidity?.usd
    );

  const volume =
    num(
      pair?.volume?.h24
    );

  if (
    marketCap === null ||
    liquidity === null ||
    volume === null
  ) {
    return null;
  }

  if (
    marketCap <
    CONFIG.minMarketCap
  ) {
    return null;
  }

  if (
    marketCap >
    CONFIG.maxMarketCap
  ) {
    return null;
  }

  if (
    liquidity <
    CONFIG.minLiquidity
  ) {
    return null;
  }

  if (
    volume <
    CONFIG.minVolume24h
  ) {
    return null;
  }

  const buys =
    Number(
      pair?.txns?.h24?.buys
    ) || 0;

  const sells =
    Number(
      pair?.txns?.h24?.sells
    ) || 0;

  const transactions =
    buys + sells;

  const buySellRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? 99
        : 0;

  const name =
    pair?.baseToken?.name ||
    token.name ||
    "UNKNOWN";

  const symbol =
    pair?.baseToken?.symbol ||
    token.symbol ||
    "UNKNOWN";

  const memeScore =
    memeSignal(
      name,
      symbol
    );

  const candidate = {

    contract:
      token.address,

    name,

    symbol,

    priceUsd:
      num(
        pair?.priceUsd
      ),

    marketCap,

    fdv:
      num(
        pair?.fdv
      ),

    liquidity,

    volume24h:
      volume,

    buys,

    sells,

    transactions,

    buySellRatio:
      Number(
        buySellRatio.toFixed(2)
      ),

    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE"
          : "NEUTRAL",

    liquidityToMarketCap:
      Number(
        (
          liquidity /
          marketCap
        ).toFixed(4)
      ),

    volumeToMarketCap:
      Number(
        (
          volume /
          marketCap
        ).toFixed(4)
      ),

    memeScore,

    launchBlock:
      token.block,

    launchTransaction:
      token.transaction,

    launchContract:
      token.launchContract,

    dex:
      pair?.dexId ||
      "unknown",

    pairAddress:
      pair?.pairAddress ||
      null,

    url:
      pair?.url ||
      null,

    holderConcentration:
      "UNVERIFIED",

    walletActivity:
      "UNVERIFIED",

    smartMoney:
      "UNVERIFIED"
  };

  const riskFlags = [];

  if (
    liquidity <
    marketCap * 0.05
  ) {
    riskFlags.push(
      "LOW_LIQUIDITY_RATIO"
    );
  }

  if (
    buySellRatio < 0.8
  ) {
    riskFlags.push(
      "SELL_PRESSURE"
    );
  }

  if (
    transactions < 100
  ) {
    riskFlags.push(
      "LOW_ACTIVITY"
    );
  }

  if (
    memeScore === 0
  ) {
    riskFlags.push(
      "WEAK_MEME_SIGNAL"
    );
  }

  candidate.riskFlags =
    riskFlags;

  candidate.discoveryScore =
    calculateScore(
      candidate
    );

  candidate.category =
    candidate.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : candidate.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : candidate.discoveryScore >= 60
          ? "WATCH"
          : "EARLY";

  candidate.targetMultiples = {

    to100M:
      Number(
        (
          100000000 /
          marketCap
        ).toFixed(2)
      ),

    to250M:
      Number(
        (
          250000000 /
          marketCap
        ).toFixed(2)
      ),

    to500M:
      Number(
        (
          500000000 /
          marketCap
        ).toFixed(2)
      )
  };

  return candidate;
}


/* ============================================================
   TELEGRAM
============================================================ */

async function sendTelegram(
  env,
  text
) {

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {

    return {
      ok: false,
      error:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  if (!canRequest()) {

    return {
      ok: false,
      error:
        "SUBREQUEST_LIMIT"
    };
  }

  addRequest();

  try {

    const response =
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

            parse_mode:
              "HTML",

            disable_web_page_preview:
              false
          })
        }
      );

    const data =
      await response.json();

    return {

      ok:
        response.ok &&
        data?.ok === true,

      error:
        data?.description ||
        null
    };

  } catch (e) {

    return {

      ok: false,

      error:
        String(
          e?.message || e
        )
    };
  }
}


/* ============================================================
   TELEGRAM ALERT FORMAT
============================================================ */

function formatAlert(c) {

  return `🚨 <b>ROBINHOOD MEME HUNTER V28</b>

<b>${c.name}</b>
$${c.symbol}

<b>Discovery Score:</b> ${c.discoveryScore}/100
<b>Category:</b> ${c.category}

<b>Market Cap:</b> $${Math.round(c.marketCap).toLocaleString()}
<b>Liquidity:</b> $${Math.round(c.liquidity).toLocaleString()}
<b>24h Volume:</b> $${Math.round(c.volume24h).toLocaleString()}

<b>Buys:</b> ${c.buys}
<b>Sells:</b> ${c.sells}
<b>Buy/Sell:</b> ${c.buySellRatio}
<b>Pressure:</b> ${c.pressure}

<b>Meme Score:</b> ${c.memeScore}/20
<b>Transactions:</b> ${c.transactions}

━━━━━━━━━━━━━━

<b>Holder Data:</b> UNVERIFIED
<b>Wallet Activity:</b> UNVERIFIED
<b>Smart Money:</b> UNVERIFIED

<b>Contract:</b>
<code>${c.contract}</code>

<b>DEX:</b> ${c.dex}

${
  c.url
    ? `<a href="${c.url}">View on DEX Screener</a>`
    : ""
}

⚠️ Automated research signal.
Not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function performScan(
  env
) {

  requests = 0;

  dexCache.clear();

  const discovery =
    await discoverTokens();

  const candidates = [];

  const lookupErrors = [];

  /*
   * IMPORTANT:
   * One batched DEX request instead of
   * one request for every token.
   */
  const dexResult =
    await dexBatchLookup(
      discovery.verified
    );

  if (!dexResult.ok) {

    lookupErrors.push({

      error:
        dexResult.error,

      mode:
        "BATCH"
    });

  } else {

    for (
      const token of
      discovery.verified
    ) {

      if (
        candidates.length >=
        CONFIG.maxDexBatchSize
      ) {
        break;
      }

      const pairs =
        dexResult.data[
          lower(
            token.address
          )
        ] || [];

      if (
        pairs.length === 0
      ) {
        continue;
      }

      /*
       * Highest-liquidity pair.
       */
      const bestPair =
        pairs[0];

      const candidate =
        buildCandidate(
          token,
          bestPair
        );

      if (candidate) {
        candidates.push(
          candidate
        );
      }
    }
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

  for (
    const candidate of
    candidates
  ) {

    if (
      candidate.discoveryScore <
      CONFIG.alertScore
    ) {
      continue;
    }

    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {
      continue;
    }

    if (!canRequest()) {
      break;
    }

    const result =
      await sendTelegram(
        env,
        formatAlert(
          candidate
        )
      );

    alerts.push({

      contract:
        candidate.contract,

      symbol:
        candidate.symbol,

      score:
        candidate.discoveryScore,

      sent:
        result.ok,

      error:
        result.ok
          ? null
          : result.error
    });
  }

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins using free on-chain launch discovery and batched DEX market data.",

    chain: {

      name:
        "Robinhood Chain",

      chainId:
        CONFIG.chainId,

      rpc:
        CONFIG.rpc
    },

    discovery: {

      source:
        "ETH_GETLOGS_TOKEN_CREATED_ADAPTIVE",

      event:
        "TokenCreated(address)",

      eventTopic:
        CONFIG.tokenCreatedTopic,

      launchContracts:
        CONFIG.launchContracts,

      latestBlock:
        discovery.latestBlock,

      startBlock:
        discovery.startBlock,

      blocksScanned:
        discovery.blocksScanned,

      rawLogs:
        discovery.rawLogs,

      failedRanges:
        discovery.failedRanges,

      tokensDiscovered:
        discovery.verified.length,

      verifiedTokenAddresses:
        discovery.verified.map(
          token => ({

            address:
              token.address,

            name:
              token.name,

            symbol:
              token.symbol,

            block:
              token.block,

            transaction:
              token.transaction
          })
        )
    },

    marketData: {

      source:
        "DEX_SCREENER",

      lookupMode:
        "BATCH_MULTI_TOKEN",

      batchSize:
        CONFIG.maxDexBatchSize,

      candidatesAnalysed:
        candidates.length,

      lookupErrors
    },

    telegram: {

      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),

      chatId:
        env.TELEGRAM_CHAT_ID ||
        null,

      alertsSent:
        alerts.filter(
          a => a.sent
        ).length
    },

    scan: {

      candidatesAnalysed:
        candidates.length,

      requestCount:
        requests,

      requestLimit:
        CONFIG.maxSubrequests,

      requestsRemaining:
        Math.max(
          0,
          CONFIG.maxSubrequests -
          requests
        )
    },

    candidates,

    alerts,

    validation: {

      tokenDiscovery:
        "VERIFIED TOKEN_CREATED EVENT",

      tokenAddress:
        "VERIFIED BY ERC20 ETH_CALL",

      erc20Metadata:
        "VERIFIED THROUGH ETH_CALL",

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX SCREENER",

      holderConcentration:
        "UNVERIFIED",

      walletActivity:
        "UNVERIFIED",

      smartMoney:
        "UNVERIFIED",

      accumulationDistribution:
        "BUY/SELL FLOW ONLY"
    },

    dataIntegrity: {

      noFabricatedMetrics:
        true,

      unavailableData:
        "UNVERIFIED"
    },

    timestamp:
      new Date().toISOString()
  };
}


/* ============================================================
   CLOUDFLARE WORKER
============================================================ */

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

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.chainId,

        rpc:
          CONFIG.rpc,

        discovery:
          "ETH_GETLOGS_TOKEN_CREATED_ADAPTIVE",

        marketData:
          "DEX_SCREENER_BATCH",

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),

        holderData:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        paidApiKeyRequired:
          false
      });
    }


    /*
     * TELEGRAM TEST
     */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      requests = 0;

      const result =
        await sendTelegram(
          env,

          `🤖 <b>Robinhood Chain Meme Hunter V28</b>

Telegram connection successful ✅

Chain ID: 4663
Free Robinhood RPC: ✅
Adaptive launch discovery: ✅
ERC20 verification: ✅
Batched DEX lookup: ✅

Paid API key required: ❌

Holder data: UNVERIFIED
Wallet activity: UNVERIFIED
Smart money: UNVERIFIED`
        );

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),

        success:
          result.ok,

        error:
          result.ok
            ? null
            : result.error,

        requestCount:
          requests
      });
    }


    /*
     * SCAN
     */

    if (
      url.pathname ===
      "/scan"
    ) {

      try {

        return Response.json(
          await performScan(env),
          {
            headers: {

              "cache-control":
                "no-store",

              "access-control-allow-origin":
                "*"
            }
          }
        );

      } catch (e) {

        return Response.json(

          {

            agent:
              "Robinhood Chain Meme Hunter",

            version:
              VERSION,

            status:
              "ERROR",

            error:
              String(
                e?.message || e
              ),

            requestCount:
              requests,

            dataIntegrity: {

              noFabricatedMetrics:
                true,

              unavailableData:
                "UNVERIFIED"
            },

            timestamp:
              new Date().toISOString()
          },

          {
            status: 500
          }
        );
      }
    }


    /*
     * DEFAULT
     */

    return Response.json({

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        VERSION,

      status:
        "ONLINE",

      routes: [
        "/health",
        "/test-telegram",
        "/scan"
      ],

      chainId:
        CONFIG.chainId,

      paidApiKeyRequired:
        false
    });
  }
};
