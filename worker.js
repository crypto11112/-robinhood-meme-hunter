const VERSION = "V29";

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

  scanBlocks: 5000,
  initialChunk: 250,

  maxSubrequests: 55,

  /*
   * Number of newest tokens to verify.
   */
  maxTokens: 8,

  /*
   * Number of tokens sent to DexScreener.
   */
  maxDexTokens: 8,

  /*
   * Market filters.
   */
  minMarketCap: 1000,
  maxMarketCap: 100000000,

  minLiquidity: 1000,
  minVolume24h: 0,

  /*
   * Telegram alert threshold.
   */
  alertScore: 70,

  /*
   * DexScreener retry delay.
   */
  retryDelayMs: 800
};

let requests = 0;


/* ============================================================
   HELPERS
============================================================ */

function lower(v) {
  return String(v || "").toLowerCase();
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function hexToNumber(v) {
  try {
    return parseInt(v || "0x0", 16);
  } catch {
    return 0;
  }
}

function toAddress(v) {
  if (!v) return null;

  let s = String(v);

  if (s.startsWith("0x")) {
    s = s.slice(2);
  }

  if (s.length < 40) return null;

  s = s.slice(-40);

  if (!/^[0-9a-fA-F]{40}$/.test(s)) {
    return null;
  }

  return "0x" + s.toLowerCase();
}

function canRequest() {
  return requests < CONFIG.maxSubrequests;
}

function addRequest() {
  requests++;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


/* ============================================================
   RPC
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

    const json =
      await response.json();

    if (json.error) {
      return {
        ok: false,
        error:
          json.error.message ||
          `RPC_${json.error.code}`
      };
    }

    return {
      ok: true,
      result: json.result
    };

  } catch (e) {

    return {
      ok: false,
      error:
        String(e?.message || e)
    };
  }
}


/* ============================================================
   BLOCK
============================================================ */

async function getLatestBlock() {

  const result =
    await rpc(
      "eth_blockNumber"
    );

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
   ADAPTIVE LOG SCAN
============================================================ */

async function scanLogRange(
  fromBlock,
  toBlock
) {

  let current =
    fromBlock;

  let chunk =
    CONFIG.initialChunk;

  const logs = [];

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

      if (
        Array.isArray(
          result.result
        )
      ) {
        logs.push(
          ...result.result
        );
      }

      current =
        end + 1;

      if (chunk < 500) {
        chunk += 50;
      }

      continue;
    }

    failedRanges++;

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

  const addresses = [];

  /*
   * Indexed parameters.
   */
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
        addresses.push(
          address
        );
      }
    }
  }

  /*
   * Non-indexed parameters.
   */
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
        addresses.push(
          address
        );
      }
    }
  }

  return [
    ...new Set(
      addresses
    )
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
   ABI DECODERS
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
     * ABI dynamic string.
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

  /*
   * totalSupply
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
    return {
      ok: false,
      reason:
        "INVALID_TOTAL_SUPPLY"
    };
  }

  /*
   * decimals
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
    return {
      ok: false,
      reason:
        "INVALID_DECIMALS"
    };
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

    ok: true,

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
   TOKEN DISCOVERY
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

  const logs =
    scan.logs;

  /*
   * Newest first.
   */
  logs.sort(
    (a, b) =>
      hexToNumber(
        b.blockNumber
      ) -
      hexToNumber(
        a.blockNumber
      )
  );

  const verified = [];

  const rejected = [];

  const seen =
    new Set();

  for (
    const log of logs
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

      const isLaunchContract =
        CONFIG.launchContracts
          .map(lower)
          .includes(
            lower(token)
          );

      if (isLaunchContract) {
        continue;
      }

      const result =
        await verifyToken(
          token
        );

      if (!result.ok) {

        rejected.push({

          address:
            token,

          reason:
            result.reason,

          block:
            hexToNumber(
              log.blockNumber
            )
        });

        continue;
      }

      verified.push({

        address:
          result.address,

        name:
          result.name,

        symbol:
          result.symbol,

        decimals:
          result.decimals,

        totalSupply:
          result.totalSupply,

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
      logs.length,

    failedRanges:
      scan.failedRanges,

    verified,

    rejected
  };
}


/* ============================================================
   DEX LOOKUP
============================================================ */

async function lookupDexToken(
  address
) {

  const url =
    `${CONFIG.dexApi}/latest/dex/tokens/${address}`;

  if (!canRequest()) {

    return {

      status:
        "LOOKUP_NOT_ATTEMPTED",

      reason:
        "SUBREQUEST_LIMIT",

      pairs:
        []
    };
  }

  addRequest();

  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {
            accept:
              "application/json",

            "user-agent":
              "Robinhood-Meme-Hunter-V29"
          }
        }
      );

    /*
     * Explicitly identify rate limiting.
     */
    if (
      response.status ===
      429
    ) {

      return {

        status:
          "DEX_RATE_LIMITED",

        reason:
          "HTTP_429",

        pairs:
          []
      };
    }

    if (!response.ok) {

      return {

        status:
          "DEX_HTTP_ERROR",

        reason:
          `HTTP_${response.status}`,

        pairs:
          []
      };
    }

    const json =
      await response.json();

    const allPairs =
      Array.isArray(
        json?.pairs
      )
        ? json.pairs
        : [];

    /*
     * Record ALL returned chains
     * for diagnosis.
     */
    const chains = [
      ...new Set(
        allPairs.map(
          p =>
            String(
              p?.chainId ||
              "UNKNOWN"
            )
        )
      )
    ];

    /*
     * Only Robinhood pairs are
     * candidates.
     */
    const robinhoodPairs =
      allPairs.filter(
        pair =>
          lower(
            pair?.chainId
          ) ===
          lower(
            CONFIG.dexChain
          )
      );

    /*
     * Sort by liquidity.
     */
    robinhoodPairs.sort(
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

    if (
      allPairs.length === 0
    ) {

      return {

        status:
          "NO_PAIRS_RETURNED",

        reason:
          "DEXSCREENER_RETURNED_ZERO_PAIRS",

        pairs:
          [],

        totalPairs:
          0,

        chains
      };
    }

    if (
      robinhoodPairs.length === 0
    ) {

      return {

        status:
          "PAIR_FOUND_WRONG_CHAIN",

        reason:
          "DEXSCREENER_RETURNED_PAIRS_BUT_NONE_MATCHED_ROBINHOOD_CHAIN",

        pairs:
          [],

        totalPairs:
          allPairs.length,

        chains
      };
    }

    return {

      status:
        "PAIR_FOUND",

      reason:
        null,

      pairs:
        robinhoodPairs,

      totalPairs:
        allPairs.length,

      chains
    };

  } catch (e) {

    return {

      status:
        "DEX_REQUEST_ERROR",

      reason:
        String(
          e?.message || e
        ),

      pairs:
        []
    };
  }
}


/* ============================================================
   MEME SCORE
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
   * Volume.
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
   * Buy/sell.
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
  score +=
    Math.round(
      c.memeScore *
      0.75
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
   * Liquidity danger.
   */
  if (
    c.liquidity <
    c.marketCap * 0.05
  ) {
    score -= 10;
  }

  /*
   * Selling danger.
   */
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

  /*
   * V29 deliberately does NOT
   * discard incomplete DEX data
   * silently.
   */
  if (
    marketCap === null
  ) {

    return {
      ok: false,
      reason:
        "MISSING_MARKET_CAP"
    };
  }

  if (
    liquidity === null
  ) {

    return {
      ok: false,
      reason:
        "MISSING_LIQUIDITY"
    };
  }

  const safeVolume =
    volume === null
      ? 0
      : volume;

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
      safeVolume,

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
          safeVolume /
          marketCap
        ).toFixed(4)
      ),

    memeScore,

    launchAgeBlocks:
      Math.max(
        0,
        latestBlockGlobal -
        token.block
      ),

    launchBlock:
      token.block,

    launchTransaction:
      token.transaction,

    launchContract:
      token.launchContract,

    dex:
      pair?.dexId ||
      "UNKNOWN",

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

  return {
    ok: true,
    candidate
  };
}


/*
 * Global block used only to calculate
 * approximate launch age.
 */
let latestBlockGlobal = 0;


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
   TELEGRAM FORMAT
============================================================ */

function formatAlert(c) {

  return `🚨 <b>ROBINHOOD MEME HUNTER V29</b>

<b>${c.name}</b>
$${c.symbol}

<b>Score:</b> ${c.discoveryScore}/100
<b>Category:</b> ${c.category}

<b>Market Cap:</b> $${Math.round(
    c.marketCap
  ).toLocaleString()}

<b>Liquidity:</b> $${Math.round(
    c.liquidity
  ).toLocaleString()}

<b>24h Volume:</b> $${Math.round(
    c.volume24h
  ).toLocaleString()}

<b>Buys:</b> ${c.buys}
<b>Sells:</b> ${c.sells}
<b>Buy/Sell:</b> ${c.buySellRatio}
<b>Pressure:</b> ${c.pressure}

<b>Meme Score:</b> ${c.memeScore}/20

<b>Holder Data:</b> UNVERIFIED
<b>Wallet Activity:</b> UNVERIFIED
<b>Smart Money:</b> UNVERIFIED

<b>Contract:</b>
<code>${c.contract}</code>

<b>DEX:</b> ${c.dex}

${
  c.url
    ? `<a href="${c.url}">DEX Screener</a>`
    : ""
}

⚠️ Automated research signal.
Not financial advice.`;
}


/* ============================================================
   MAIN SCAN
============================================================ */

async function performScan(
  env
) {

  requests = 0;

  const discovery =
    await discoverTokens();

  latestBlockGlobal =
    discovery.latestBlock;

  const candidates = [];

  const tokenDiagnostics = [];

  /*
   * Process newest tokens.
   *
   * V29 deliberately performs individual
   * lookups because we need to know EXACTLY
   * what DexScreener returns for each token.
   *
   * maxTokens is deliberately small.
   */

  for (
    const token of
    discovery.verified
  ) {

    if (!canRequest()) {

      tokenDiagnostics.push({

        contract:
          token.address,

        name:
          token.name,

        symbol:
          token.symbol,

        status:
          "LOOKUP_NOT_ATTEMPTED",

        reason:
          "SUBREQUEST_LIMIT"
      });

      continue;
    }

    const dex =
      await lookupDexToken(
        token.address
      );

    const diagnostic = {

      contract:
        token.address,

      name:
        token.name,

      symbol:
        token.symbol,

      launchBlock:
        token.block,

      launchTransaction:
        token.transaction,

      status:
        dex.status,

      reason:
        dex.reason,

      totalPairs:
        dex.totalPairs ??
        null,

      returnedChains:
        dex.chains ??
        []
    };

    /*
     * No pair.
     */
    if (
      dex.pairs.length === 0
    ) {

      tokenDiagnostics.push(
        diagnostic
      );

      /*
       * Small pause after rate limiting.
       */
      if (
        dex.status ===
        "DEX_RATE_LIMITED"
      ) {

        await sleep(
          CONFIG.retryDelayMs
        );
      }

      continue;
    }

    /*
     * Highest liquidity pair.
     */
    const pair =
      dex.pairs[0];

    diagnostic.selectedPair = {

      pairAddress:
        pair?.pairAddress ||
        null,

      dexId:
        pair?.dexId ||
        null,

      chainId:
        pair?.chainId ||
        null,

      baseToken:
        pair?.baseToken ||
        null,

      quoteToken:
        pair?.quoteToken ||
        null,

      liquidityUsd:
        num(
          pair?.liquidity?.usd
        ),

      marketCap:
        num(
          pair?.marketCap
        ),

      fdv:
        num(
          pair?.fdv
        ),

      volume24h:
        num(
          pair?.volume?.h24
        ),

      priceUsd:
        num(
          pair?.priceUsd
        )
    };

    const result =
      buildCandidate(
        token,
        pair
      );

    if (!result.ok) {

      diagnostic.status =
        "PAIR_DATA_INCOMPLETE";

      diagnostic.reason =
        result.reason;

      tokenDiagnostics.push(
        diagnostic
      );

      continue;
    }

    diagnostic.status =
      "CANDIDATE_CREATED";

    diagnostic.discoveryScore =
      result.candidate.discoveryScore;

    tokenDiagnostics.push(
      diagnostic
    );

    candidates.push(
      result.candidate
    );
  }

  /*
   * Sort.
   */
  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  /*
   * Telegram alerts.
   */
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

    const telegram =
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
        telegram.ok,

      error:
        telegram.ok
          ? null
          : telegram.error
    });
  }

  /*
   * Summarise diagnostics.
   */
  const statusCounts = {};

  for (
    const item of
    tokenDiagnostics
  ) {

    const status =
      item.status ||
      "UNKNOWN";

    statusCounts[status] =
      (
        statusCounts[status] ||
        0
      ) + 1;
  }

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins using verified on-chain launches and diagnostic DEX market-data discovery.",

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
        "INDIVIDUAL_DIAGNOSTIC_LOOKUP",

      tokensAttempted:
        tokenDiagnostics.length,

      candidatesAnalysed:
        candidates.length,

      statusCounts,

      diagnostics:
        tokenDiagnostics
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
          x => x.sent
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

      dexPairDiscovery:
        "DEX SCREENER DIAGNOSTIC LOOKUP",

      liquidity:
        "DEX SCREENER WHEN AVAILABLE",

      volume:
        "DEX SCREENER WHEN AVAILABLE",

      buySellPressure:
        "DEX SCREENER WHEN AVAILABLE",

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
          "DEX_SCREENER_DIAGNOSTIC",

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

          `🤖 <b>Robinhood Chain Meme Hunter V29</b>

Telegram connection successful ✅

Chain ID: 4663
Free RPC: ✅
Adaptive launch discovery: ✅
ERC20 verification: ✅
DEX diagnostics: ✅

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
          await performScan(
            env
          ),
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
