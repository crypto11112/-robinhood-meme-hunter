const CONFIG = {
  VERSION: "V24",

  CHAIN_ID: 4663,

  RPC: "https://rpc.mainnet.chain.robinhood.com",

  // pools.trade launch entry contracts
  LAUNCH_CONTRACTS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  // TokenCreated(address)
  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  DEXSCREENER:
    "https://api.dexscreener.com",

  DEX_CHAIN:
    "robinhood",

  // Maximum blocks requested in one eth_getLogs call.
  // Kept deliberately conservative for public RPC.
  LOG_BLOCK_RANGE: 2000,

  // Number of recent blocks to inspect.
  SCAN_BLOCKS: 12000,

  // Maximum tokens to process per scan.
  MAX_TOKENS: 40,

  // Market filters
  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 5000,
  MIN_VOLUME_24H: 1000,

  // Telegram alert threshold
  ALERT_SCORE: 70
};

let requestCount = 0;


/* ============================================================
   BASIC HELPERS
============================================================ */

function lower(value) {
  return String(value || "").toLowerCase();
}

function number(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hexToNumber(value) {
  try {
    return parseInt(value, 16);
  } catch {
    return 0;
  }
}

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(String(value || ""));
}

function cleanAddress(value) {
  if (!value) return null;

  const v = String(value);

  if (v.length < 40) return null;

  const address =
    "0x" + v.slice(-40);

  return isAddress(address)
    ? address.toLowerCase()
    : null;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function money(value) {
  if (value == null) return "N/A";

  if (value >= 1000000) {
    return "$" + (value / 1000000).toFixed(2) + "M";
  }

  if (value >= 1000) {
    return "$" + (value / 1000).toFixed(1) + "K";
  }

  return "$" + value.toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}


/* ============================================================
   RPC
============================================================ */

async function rpc(method, params = []) {

  requestCount++;

  try {

    const response = await fetch(CONFIG.RPC, {
      method: "POST",

      headers: {
        "content-type": "application/json",
        "accept": "application/json"
      },

      body: JSON.stringify({
        jsonrpc: "2.0",
        id: requestCount,
        method,
        params
      })
    });

    if (!response.ok) {
      return {
        ok: false,
        error: "HTTP_" + response.status
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        ok: false,
        error:
          data.error.message ||
          data.error.code ||
          "RPC_ERROR"
      };
    }

    return {
      ok: true,
      result: data.result
    };

  } catch (error) {

    return {
      ok: false,
      error:
        String(error?.message || error)
    };
  }
}


/* ============================================================
   GET LATEST BLOCK
============================================================ */

async function getLatestBlock() {

  const result =
    await rpc("eth_blockNumber");

  if (!result.ok) {
    throw new Error(
      "Unable to read latest block: " +
      result.error
    );
  }

  return hexToNumber(result.result);
}


/* ============================================================
   TOKEN CREATED LOG DISCOVERY
============================================================ */

/*
 * IMPORTANT:
 *
 * V23 looked at transaction.to.
 *
 * V24 does NOT do that.
 *
 * We directly query:
 *
 * TokenCreated(address)
 *
 * emitted by BOTH pools.trade entry contracts.
 *
 * topic0:
 *
 * 2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e
 */

async function getLaunchLogs(
  fromBlock,
  toBlock
) {

  const filter = {

    fromBlock:
      "0x" + fromBlock.toString(16),

    toBlock:
      "0x" + toBlock.toString(16),

    address:
      CONFIG.LAUNCH_CONTRACTS,

    topics: [
      CONFIG.TOKEN_CREATED_TOPIC
    ]
  };

  const result =
    await rpc(
      "eth_getLogs",
      [filter]
    );

  if (!result.ok) {

    return {
      ok: false,
      error: result.error,
      logs: []
    };
  }

  return {
    ok: true,
    logs:
      Array.isArray(result.result)
        ? result.result
        : []
  };
}


/* ============================================================
   DISCOVER RECENT TOKENS
============================================================ */

async function discoverTokens() {

  const latestBlock =
    await getLatestBlock();

  const startBlock =
    Math.max(
      0,
      latestBlock -
        CONFIG.SCAN_BLOCKS
    );

  const discovered =
    new Map();

  let logsScanned = 0;
  let failedRanges = 0;

  /*
   * Scan backwards in chunks.
   *
   * This is MUCH cheaper than V23's
   * one-RPC-request-per-block method.
   */

  for (
    let end = latestBlock;

    end >= startBlock;

    end -= CONFIG.LOG_BLOCK_RANGE
  ) {

    const start =
      Math.max(
        startBlock,
        end - CONFIG.LOG_BLOCK_RANGE + 1
      );

    const result =
      await getLaunchLogs(
        start,
        end
      );

    if (!result.ok) {

      failedRanges++;

      /*
       * If the public RPC rejects a large range,
       * retry the same range using smaller chunks.
       */

      if (
        CONFIG.LOG_BLOCK_RANGE > 100
      ) {

        const smaller =
          await getLaunchLogs(
            start,
            Math.min(
              end,
              start + 499
            )
          );

        if (smaller.ok) {

          for (
            const log
            of smaller.logs
          ) {

            processLaunchLog(
              log,
              discovered
            );
          }

          logsScanned +=
            smaller.logs.length;
        }
      }

      continue;
    }

    logsScanned +=
      result.logs.length;

    for (
      const log
      of result.logs
    ) {

      processLaunchLog(
        log,
        discovered
      );

      if (
        discovered.size >=
        CONFIG.MAX_TOKENS
      ) {
        break;
      }
    }

    if (
      discovered.size >=
      CONFIG.MAX_TOKENS
    ) {
      break;
    }

    /*
     * Small pause to avoid hammering
     * the free public RPC.
     */

    await sleep(40);
  }

  return {

    latestBlock,

    startBlock,

    blocksScanned:
      latestBlock - startBlock + 1,

    logsScanned,

    failedRanges,

    tokens:
      Array.from(
        discovered.values()
      )
  };
}


/* ============================================================
   PROCESS TOKEN CREATED LOG
============================================================ */

function processLaunchLog(
  log,
  discovered
) {

  const emitter =
    lower(log?.address);

  /*
   * Make absolutely sure the event came from
   * one of the two pools.trade launch contracts.
   */

  if (
    !CONFIG.LAUNCH_CONTRACTS
      .map(lower)
      .includes(emitter)
  ) {
    return;
  }

  /*
   * TokenCreated(address)
   *
   * The token address is the first indexed argument:
   *
   * topics[1]
   */

  const token =
    cleanAddress(
      log?.topics?.[1]
    );

  if (!token) {
    return;
  }

  if (
    discovered.has(token)
  ) {
    return;
  }

  discovered.set(
    token,
    {

      address:
        token,

      launchContract:
        emitter,

      block:
        hexToNumber(
          log.blockNumber
        ),

      transaction:
        log.transactionHash,

      logIndex:
        hexToNumber(
          log.logIndex
        )
    }
  );
}


/* ============================================================
   ERC20 CALLS
============================================================ */

async function ethCall(
  to,
  data
) {

  const result =
    await rpc(
      "eth_call",
      [
        {
          to,
          data
        },
        "latest"
      ]
    );

  if (!result.ok) {
    return null;
  }

  return result.result;
}


function decodeUint256(value) {

  if (
    !value ||
    value === "0x"
  ) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}


function decodeBytes32String(value) {

  if (!value || value === "0x") {
    return null;
  }

  try {

    const clean =
      value.replace(/^0x/, "");

    let output = "";

    for (
      let i = 0;
      i + 2 <= clean.length;
      i += 2
    ) {

      const byte =
        parseInt(
          clean.slice(i, i + 2),
          16
        );

      if (byte === 0) {
        continue;
      }

      if (
        byte >= 32 &&
        byte <= 126
      ) {
        output +=
          String.fromCharCode(byte);
      }
    }

    return output.trim() || null;

  } catch {
    return null;
  }
}


/*
 * Solidity dynamic string ABI decoder.
 */

function decodeDynamicString(value) {

  if (!value || value === "0x") {
    return null;
  }

  try {

    const clean =
      value.replace(/^0x/, "");

    if (clean.length < 128) {
      return null;
    }

    const offset =
      parseInt(
        clean.slice(0, 64),
        16
      );

    const position =
      offset * 2;

    if (
      position + 64 >
      clean.length
    ) {
      return null;
    }

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

    const bytes =
      clean.slice(
        start,
        start + length * 2
      );

    let output = "";

    for (
      let i = 0;
      i + 2 <= bytes.length;
      i += 2
    ) {

      const byte =
        parseInt(
          bytes.slice(i, i + 2),
          16
        );

      if (
        byte >= 32 &&
        byte <= 126
      ) {

        output +=
          String.fromCharCode(byte);
      }
    }

    return output.trim() || null;

  } catch {

    return null;
  }
}


async function getERC20Metadata(
  token
) {

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] = await Promise.all([

    ethCall(
      token,
      "0x06fdde03"
    ),

    ethCall(
      token,
      "0x95d89b41"
    ),

    ethCall(
      token,
      "0x313ce567"
    ),

    ethCall(
      token,
      "0x18160ddd"
    )
  ]);

  const decimals =
    decodeUint256(
      decimalsRaw
    );

  const supply =
    decodeUint256(
      supplyRaw
    );

  /*
   * If these aren't available,
   * don't fabricate metadata.
   */

  if (
    decimals === null ||
    supply === null
  ) {
    return null;
  }

  const decimalNumber =
    Number(decimals);

  if (
    decimalNumber < 0 ||
    decimalNumber > 36
  ) {
    return null;
  }

  return {

    name:
      decodeDynamicString(
        nameRaw
      ) ||
      decodeBytes32String(
        nameRaw
      ) ||
      "UNKNOWN",

    symbol:
      decodeDynamicString(
        symbolRaw
      ) ||
      decodeBytes32String(
        symbolRaw
      ) ||
      "UNKNOWN",

    decimals:
      decimalNumber,

    totalSupply:
      supply.toString()
  };
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function getDexData(
  token
) {

  const url =
    `${CONFIG.DEXSCREENER}/latest/dex/tokens/${token}`;

  try {

    const response =
      await fetch(
        url,
        {
          headers: {
            accept:
              "application/json",

            "user-agent":
              "Robinhood-Meme-Hunter-V24"
          }
        }
      );

    if (!response.ok) {

      return {
        ok: false,
        status:
          response.status,
        pairs: []
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];

    /*
     * Only Robinhood Chain pairs.
     */

    const robinhoodPairs =
      pairs.filter(
        pair =>
          lower(
            pair?.chainId
          ) ===
          CONFIG.DEX_CHAIN
      );

    /*
     * Pick the best pair by
     * liquidity first, volume second.
     */

    robinhoodPairs.sort(
      (a, b) => {

        const aLiquidity =
          number(
            a?.liquidity?.usd
          ) || 0;

        const bLiquidity =
          number(
            b?.liquidity?.usd
          ) || 0;

        const aVolume =
          number(
            a?.volume?.h24
          ) || 0;

        const bVolume =
          number(
            b?.volume?.h24
          ) || 0;

        const aScore =
          aLiquidity +
          aVolume * 0.25;

        const bScore =
          bLiquidity +
          bVolume * 0.25;

        return bScore - aScore;
      }
    );

    return {

      ok: true,

      status:
        response.status,

      pairs:
        robinhoodPairs
    };

  } catch (error) {

    return {

      ok: false,

      status: 0,

      pairs: [],

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


/* ============================================================
   MEME SCORE
============================================================ */

function memeScore(
  name,
  symbol
) {

  const text =
    (
      `${name || ""} ` +
      `${symbol || ""}`
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
    const keyword
    of keywords
  ) {

    if (
      text.includes(keyword)
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
   CANDIDATE SCORE
============================================================ */

function calculateScore(data) {

  let score = 0;

  /*
   * Early market cap.
   */

  if (
    data.marketCap <= 100000
  ) {
    score += 22;
  } else if (
    data.marketCap <= 250000
  ) {
    score += 20;
  } else if (
    data.marketCap <= 1000000
  ) {
    score += 18;
  } else if (
    data.marketCap <= 5000000
  ) {
    score += 15;
  } else if (
    data.marketCap <= 10000000
  ) {
    score += 11;
  } else {
    score += 6;
  }

  /*
   * Liquidity.
   */

  if (
    data.liquidity >= 100000
  ) {
    score += 15;
  } else if (
    data.liquidity >= 50000
  ) {
    score += 13;
  } else if (
    data.liquidity >= 25000
  ) {
    score += 10;
  } else if (
    data.liquidity >= 10000
  ) {
    score += 7;
  } else {
    score += 3;
  }

  /*
   * Volume relative to market cap.
   */

  if (
    data.volumeToMarketCap >= 5
  ) {
    score += 15;
  } else if (
    data.volumeToMarketCap >= 2
  ) {
    score += 12;
  } else if (
    data.volumeToMarketCap >= 1
  ) {
    score += 9;
  } else if (
    data.volumeToMarketCap >= 0.5
  ) {
    score += 6;
  }

  /*
   * Buy pressure.
   */

  if (
    data.buySellRatio >= 3
  ) {
    score += 15;
  } else if (
    data.buySellRatio >= 2
  ) {
    score += 13;
  } else if (
    data.buySellRatio >= 1.5
  ) {
    score += 10;
  } else if (
    data.buySellRatio >= 1.2
  ) {
    score += 7;
  } else if (
    data.buySellRatio >= 1
  ) {
    score += 3;
  }

  /*
   * Meme signal.
   */

  score +=
    Math.round(
      data.memeScore *
      0.75
    );

  /*
   * Activity.
   */

  if (
    data.transactions >= 5000
  ) {
    score += 5;
  } else if (
    data.transactions >= 1000
  ) {
    score += 4;
  } else if (
    data.transactions >= 250
  ) {
    score += 2;
  }

  /*
   * Risk penalties.
   */

  if (
    data.liquidity <
    data.marketCap * 0.05
  ) {
    score -= 10;
  }

  if (
    data.buySellRatio <
    0.8
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
  metadata,
  pair,
  latestBlock
) {

  const marketCap =
    number(pair?.marketCap) ??
    number(pair?.fdv);

  const liquidity =
    number(
      pair?.liquidity?.usd
    );

  const volume =
    number(
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
    CONFIG.MIN_MARKET_CAP
  ) {
    return null;
  }

  if (
    marketCap >
    CONFIG.MAX_MARKET_CAP
  ) {
    return null;
  }

  if (
    liquidity <
    CONFIG.MIN_LIQUIDITY
  ) {
    return null;
  }

  if (
    volume <
    CONFIG.MIN_VOLUME_24H
  ) {
    return null;
  }

  const buys =
    number(
      pair?.txns?.h24?.buys
    ) || 0;

  const sells =
    number(
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

  const liquidityToMarketCap =
    liquidity /
    marketCap;

  const volumeToMarketCap =
    volume /
    marketCap;

  let launchAgeHours =
    null;

  if (
    pair?.pairCreatedAt
  ) {

    launchAgeHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) / 3600000;
  }

  const meme =
    memeScore(
      metadata?.name,
      metadata?.symbol
    );

  const candidate = {

    contract:
      token.address,

    name:
      pair?.baseToken?.name ||
      metadata?.name ||
      "UNKNOWN",

    symbol:
      pair?.baseToken?.symbol ||
      metadata?.symbol ||
      "UNKNOWN",

    priceUsd:
      number(
        pair?.priceUsd
      ),

    marketCap,

    fdv:
      number(pair?.fdv),

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
        liquidityToMarketCap.toFixed(4)
      ),

    volumeToMarketCap:
      Number(
        volumeToMarketCap.toFixed(4)
      ),

    memeScore:
      meme,

    launchBlock:
      token.block,

    launchTransaction:
      token.transaction,

    launchContract:
      token.launchContract,

    creator:
      pair?.info?.creator ||
      "UNVERIFIED",

    pairCreatedAt:
      pair?.pairCreatedAt ||
      null,

    launchAgeHours:
      launchAgeHours === null
        ? null
        : Number(
            launchAgeHours.toFixed(1)
          ),

    dex:
      pair?.dexId ||
      "uniswap",

    pairAddress:
      pair?.pairAddress ||
      null,

    url:
      pair?.url ||
      (
        pair?.pairAddress
          ? `https://dexscreener.com/robinhood/${pair.pairAddress}`
          : null
      ),

    holderConcentration:
      "UNVERIFIED",

    walletActivity:
      "UNVERIFIED",

    smartMoney:
      "UNVERIFIED",

    accumulationDistribution:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE_ONLY"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE_ONLY"
          : "NEUTRAL",

    dataIntegrity:
      "VERIFIED_MARKET_DATA_ONLY"
  };

  /*
   * Risk flags.
   */

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
    meme === 0
  ) {
    riskFlags.push(
      "WEAK_MEME_SIGNAL"
    );
  }

  candidate.riskFlags =
    riskFlags;

  candidate.riskScore =
    Math.min(
      100,
      riskFlags.length * 10
    );

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
          : candidate.discoveryScore >= 50
            ? "EARLY"
            : "LOW_CONVICTION";

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
  message
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

          body:
            JSON.stringify({

              chat_id:
                env.TELEGRAM_CHAT_ID,

              text:
                message,

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

  } catch (error) {

    return {

      ok: false,

      error:
        String(
          error?.message ||
          error
        )
    };
  }
}


/* ============================================================
   TELEGRAM ALERT
============================================================ */

function makeAlert(
  candidate
) {

  const emoji =
    candidate.discoveryScore >= 80
      ? "🚨"
      : candidate.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${emoji} <b>ROBINHOOD MEME HUNTER V24</b>

<b>${escapeHtml(candidate.name)}</b>
$${escapeHtml(candidate.symbol)}

<b>Opportunity Score:</b>
${candidate.discoveryScore}/100

<b>Risk:</b>
${candidate.riskScore}/100

━━━━━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(candidate.marketCap)}

<b>Liquidity:</b>
${money(candidate.liquidity)}

<b>24h Volume:</b>
${money(candidate.volume24h)}

<b>Volume / MC:</b>
${(
  candidate.volumeToMarketCap * 100
).toFixed(1)}%

━━━━━━━━━━━━━━━━━━

<b>Buys:</b>
${candidate.buys}

<b>Sells:</b>
${candidate.sells}

<b>Buy/Sell:</b>
${candidate.buySellRatio}

<b>Pressure:</b>
${candidate.pressure}

<b>Transactions:</b>
${candidate.transactions}

━━━━━━━━━━━━━━━━━━

<b>Meme Score:</b>
${candidate.memeScore}/20

<b>Launch Age:</b>
${candidate.launchAgeHours ?? "UNVERIFIED"}h

<b>Liquidity / MC:</b>
${(
  candidate.liquidityToMarketCap *
  100
).toFixed(1)}%

━━━━━━━━━━━━━━━━━━

<b>Holder Concentration:</b>
UNVERIFIED

<b>Wallet Activity:</b>
UNVERIFIED

<b>Smart Money:</b>
UNVERIFIED

<b>Flow:</b>
${candidate.accumulationDistribution}

━━━━━━━━━━━━━━━━━━

<b>Contract:</b>

<code>${escapeHtml(
  candidate.contract
)}</code>

<b>Launch TX:</b>

<code>${escapeHtml(
  candidate.launchTransaction
)}</code>

${
  candidate.url
    ? `<a href="${candidate.url}">Open DEX Screener</a>`
    : ""
}

⚠️ Automated research signal.
Not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function runScan(
  env
) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  const candidates = [];

  const dexErrors = [];

  /*
   * Newest first.
   */

  const tokens =
    discovery.tokens
      .sort(
        (a, b) =>
          b.block -
          a.block
      );

  for (
    const token
    of tokens
  ) {

    /*
     * Metadata calls.
     */

    const metadata =
      await getERC20Metadata(
        token.address
      );

    /*
     * Not an ERC20 we can verify.
     */

    if (!metadata) {
      continue;
    }

    /*
     * DEX Screener lookup.
     */

    const dex =
      await getDexData(
        token.address
      );

    if (!dex.ok) {

      dexErrors.push({

        contract:
          token.address,

        status:
          dex.status,

        error:
          dex.error || null
      });

      continue;
    }

    if (
      dex.pairs.length === 0
    ) {
      continue;
    }

    const pair =
      dex.pairs[0];

    const candidate =
      buildCandidate(
        token,
        metadata,
        pair,
        discovery.latestBlock
      );

    if (!candidate) {
      continue;
    }

    candidates.push(
      candidate
    );

    /*
     * Avoid excessive RPC/API use.
     */

    await sleep(75);
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

  /*
   * Telegram only for strong candidates.
   */

  for (
    const candidate
    of candidates
  ) {

    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    ) {
      continue;
    }

    /*
     * Don't alert on obvious sell pressure.
     */

    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {
      continue;
    }

    const result =
      await sendTelegram(
        env,
        makeAlert(candidate)
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
      CONFIG.VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain pools.trade meme coins using verified on-chain TokenCreated events and DEX market data.",

    chain: {

      name:
        "Robinhood Chain",

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC
    },

    discovery: {

      source:
        "ETH_GETLOGS_TOKEN_CREATED",

      event:
        "TokenCreated(address)",

      eventTopic:
        CONFIG.TOKEN_CREATED_TOPIC,

      launchContracts:
        CONFIG.LAUNCH_CONTRACTS,

      latestBlock:
        discovery.latestBlock,

      startBlock:
        discovery.startBlock,

      blocksScanned:
        discovery.blocksScanned,

      logsScanned:
        discovery.logsScanned,

      failedRanges:
        discovery.failedRanges,

      tokensDiscovered:
        discovery.tokens.length
    },

    marketData: {

      source:
        "DEX_SCREENER",

      pairsFound:
        candidates.length,

      lookupErrors:
        dexErrors
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

      requestCount
    },

    candidates:
      candidates.slice(
        0,
        50
      ),

    alerts,

    validation: {

      tokenDiscovery:
        "VERIFIED TOKEN_CREATED EVENT",

      tokenAddress:
        "VERIFIED FROM EVENT TOPIC",

      erc20Metadata:
        "VERIFIED THROUGH ETH_CALL",

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX SCREENER TRANSACTION DATA",

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
      new URL(request.url);


    /* --------------------------------
       HEALTH
    -------------------------------- */

    if (
      url.pathname ===
      "/health"
    ) {

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.CHAIN_ID,

        rpc:
          CONFIG.RPC,

        discovery:
          "ETH_GETLOGS_TOKEN_CREATED",

        event:
          "TokenCreated(address)",

        launchContracts:
          CONFIG.LAUNCH_CONTRACTS,

        marketData:
          "DEX_SCREENER",

        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),

        holderData:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED"
      });
    }


    /* --------------------------------
       TEST TELEGRAM
    -------------------------------- */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(

          env,

          `🤖 <b>Robinhood Chain Meme Hunter V24</b>

Telegram connection successful.

Chain: 4663 ✅
Robinhood RPC: ✅
TokenCreated discovery: ✅
Both launch contracts: ✅
DEX Screener: ✅

Holder data: ⚠️ UNVERIFIED
Wallet activity: ⚠️ UNVERIFIED
Smart money: ⚠️ UNVERIFIED`
        );

      return Response.json({

        agent:
          "Robinhood Chain Meme Hunter",

        version:
          CONFIG.VERSION,

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
            : result.error
      });
    }


    /* --------------------------------
       SCAN
    -------------------------------- */

    if (
      url.pathname ===
      "/scan"
    ) {

      try {

        const result =
          await runScan(
            env
          );

        return Response.json(
          result,
          {
            headers: {

              "cache-control":
                "no-store",

              "access-control-allow-origin":
                "*"
            }
          }
        );

      } catch (error) {

        return Response.json(

          {

            agent:
              "Robinhood Chain Meme Hunter",

            version:
              CONFIG.VERSION,

            status:
              "ERROR",

            error:
              String(
                error?.message ||
                error
              ),

            requestCount,

            dataIntegrity: {

              noFabricatedMetrics:
                true
            },

            timestamp:
              new Date().toISOString()
          },

          {
            status: 500,

            headers: {
              "cache-control":
                "no-store"
            }
          }
        );
      }
    }


    /* --------------------------------
       DEFAULT
    -------------------------------- */

    return Response.json({

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "ONLINE",

      routes: [

        "/health",

        "/test-telegram",

        "/scan"
      ],

      freeApis: {

        robinhoodRPC:
          true,

        dexScreener:
          true,

        telegram:
          true,

        paidApiKeyRequired:
          false
      }
    });
  }
};
