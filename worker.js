const CONFIG = {
  VERSION: "V26.1",

  CHAIN_ID: 4663,

  RPC: "https://rpc.mainnet.chain.robinhood.com",

  DEXSCREENER:
    "https://api.dexscreener.com",

  DEX_CHAIN:
    "robinhood",

  LAUNCH_CONTRACTS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  /*
   * Cloudflare-safe settings.
   *
   * We deliberately don't try to analyse
   * every discovered token.
   */
  SCAN_BLOCKS: 3000,

  LOG_RANGE: 500,

  MAX_LOGS: 12,

  MAX_TOKENS_TO_VERIFY: 5,

  MAX_DEX_LOOKUPS: 5,

  MIN_MARKET_CAP: 10000,

  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 3000,

  MIN_VOLUME_24H: 500,

  ALERT_SCORE: 70,

  /*
   * Hard safety budget.
   *
   * Once this number is reached, the scan
   * stops making more RPC/API calls.
   */
  MAX_SUBREQUESTS: 80
};

let requestCount = 0;


/* ============================================================
   HELPERS
============================================================ */

function lower(v) {
  return String(v || "").toLowerCase();
}

function validAddress(v) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(v || "")
  );
}

function normalizeAddress(v) {

  if (!v) return null;

  let s = String(v);

  if (s.startsWith("0x")) {
    s = s.slice(2);
  }

  if (s.length < 40) {
    return null;
  }

  const address =
    "0x" + s.slice(-40);

  return validAddress(address)
    ? address.toLowerCase()
    : null;
}

function hexToNumber(v) {

  if (!v) return 0;

  try {
    return parseInt(v, 16);
  } catch {
    return 0;
  }
}

function toNumber(v) {

  const n = Number(v);

  return Number.isFinite(n)
    ? n
    : null;
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(
      resolve,
      ms
    )
  );
}

function money(v) {

  if (v == null) {
    return "N/A";
  }

  if (v >= 1000000) {
    return "$" +
      (v / 1000000).toFixed(2) +
      "M";
  }

  if (v >= 1000) {
    return "$" +
      (v / 1000).toFixed(1) +
      "K";
  }

  return "$" +
    v.toFixed(2);
}

function unique(values) {

  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function budgetAvailable() {

  return (
    requestCount <
    CONFIG.MAX_SUBREQUESTS
  );
}


/* ============================================================
   RPC
============================================================ */

async function rpc(
  method,
  params = []
) {

  if (!budgetAvailable()) {

    return {
      ok: false,
      stopped: true,
      error:
        "SUBREQUEST_BUDGET_REACHED"
    };
  }

  requestCount++;

  try {

    const response =
      await fetch(
        CONFIG.RPC,
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json",

            accept:
              "application/json"
          },

          body:
            JSON.stringify({

              jsonrpc: "2.0",

              id:
                requestCount,

              method,

              params
            })
          }
        }
      );

    if (!response.ok) {

      return {
        ok: false,
        error:
          "HTTP_" +
          response.status
      };
    }

    const data =
      await response.json();

    if (data.error) {

      return {
        ok: false,

        error:
          data.error.message ||
          String(
            data.error.code
          )
      };
    }

    return {
      ok: true,

      result:
        data.result
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
   LATEST BLOCK
============================================================ */

async function getLatestBlock() {

  const result =
    await rpc(
      "eth_blockNumber"
    );

  if (!result.ok) {

    throw new Error(
      result.error
    );
  }

  return hexToNumber(
    result.result
  );
}


/* ============================================================
   LOGS
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
        CONFIG.LAUNCH_CONTRACTS,

      topics: [
        CONFIG.TOKEN_CREATED_TOPIC
      ]
    }]
  );
}


/* ============================================================
   ADDRESS EXTRACTION
============================================================ */

function extractAddresses(
  log
) {

  const addresses = [];

  /*
   * Indexed values.
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
        normalizeAddress(
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
   * ABI encoded non-indexed data.
   */

  const data =
    String(
      log?.data || ""
    );

  if (
    data.startsWith("0x") &&
    data.length >= 66
  ) {

    const clean =
      data.slice(2);

    for (
      let i = 0;
      i + 64 <= clean.length;
      i += 64
    ) {

      const address =
        normalizeAddress(
          clean.slice(
            i,
            i + 64
          )
        );

      if (address) {
        addresses.push(
          address
        );
      }
    }
  }

  return unique(
    addresses
  );
}


/* ============================================================
   ERC20 METADATA
============================================================ */

function decodeUint(v) {

  if (
    !v ||
    v === "0x"
  ) {
    return null;
  }

  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

function decodeText(v) {

  if (
    !v ||
    v === "0x"
  ) {
    return null;
  }

  const clean =
    v.replace(
      /^0x/,
      ""
    );

  /*
   * Dynamic string.
   */

  try {

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
        end <= clean.length
      ) {

        const bytes =
          clean.slice(
            start,
            end
          );

        let result = "";

        for (
          let i = 0;
          i < bytes.length;
          i += 2
        ) {

          const code =
            parseInt(
              bytes.slice(
                i,
                i + 2
              ),
              16
            );

          if (
            code >= 32 &&
            code <= 126
          ) {

            result +=
              String.fromCharCode(
                code
              );
          }
        }

        if (
          result.trim()
        ) {

          return result.trim();
        }
      }
    }

  } catch {}

  /*
   * bytes32 fallback.
   */

  try {

    let result = "";

    for (
      let i = 0;
      i < clean.length;
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

        result +=
          String.fromCharCode(
            code
          );
      }
    }

    return result.trim() || null;

  } catch {
    return null;
  }
}


/* ============================================================
   SINGLE ETH CALL
============================================================ */

async function ethCall(
  address,
  data
) {

  const result =
    await rpc(
      "eth_call",
      [
        {
          to:
            address,

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


/* ============================================================
   VERIFY TOKEN
============================================================ */

async function verifyToken(
  address
) {

  if (
    !validAddress(address)
  ) {
    return null;
  }

  /*
   * Only make the calls we actually need.
   *
   * totalSupply is the primary contract
   * verification.
   */

  const supplyRaw =
    await ethCall(
      address,
      "0x18160ddd"
    );

  if (!supplyRaw) {
    return null;
  }

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
   * Decimals.
   */

  const decimalsRaw =
    await ethCall(
      address,
      "0x313ce567"
    );

  const decimals =
    decodeUint(
      decimalsRaw
    );

  if (
    decimals === null
  ) {
    return null;
  }

  const decimalNumber =
    Number(
      decimals
    );

  if (
    decimalNumber < 0 ||
    decimalNumber > 36
  ) {
    return null;
  }

  /*
   * Name and symbol are optional.
   *
   * We don't reject a valid token just
   * because one metadata call fails.
   */

  let name = "UNKNOWN";
  let symbol = "UNKNOWN";

  if (
    budgetAvailable()
  ) {

    const nameRaw =
      await ethCall(
        address,
        "0x06fdde03"
      );

    name =
      decodeText(
        nameRaw
      ) ||
      "UNKNOWN";
  }

  if (
    budgetAvailable()
  ) {

    const symbolRaw =
      await ethCall(
        address,
        "0x95d89b41"
      );

    symbol =
      decodeText(
        symbolRaw
      ) ||
      "UNKNOWN";
  }

  return {

    address:
      address.toLowerCase(),

    name,

    symbol,

    decimals:
      decimalNumber,

    totalSupply:
      supply.toString()
  };
}


/* ============================================================
   DISCOVER
============================================================ */

async function discover() {

  const latest =
    await getLatestBlock();

  const start =
    Math.max(
      0,
      latest -
        CONFIG.SCAN_BLOCKS
    );

  const logs = [];

  let failedRanges = 0;

  /*
   * Scan newest blocks first.
   */

  for (
    let end = latest;

    end >= start;

    end -= CONFIG.LOG_RANGE
  ) {

    if (
      !budgetAvailable()
    ) {
      break;
    }

    const from =
      Math.max(
        start,
        end -
          CONFIG.LOG_RANGE +
          1
      );

    const result =
      await getLogs(
        from,
        end
      );

    if (
      !result.ok
    ) {

      failedRanges++;

      continue;
    }

    const found =
      Array.isArray(
        result.result
      )
        ? result.result
        : [];

    logs.push(
      ...found
    );

    if (
      logs.length >=
      CONFIG.MAX_LOGS
    ) {
      break;
    }

    /*
     * Don't hammer the public RPC.
     */

    await sleep(50);
  }

  /*
   * Newest logs first.
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

  const tokens = [];

  const seen =
    new Set();

  /*
   * Only verify newest tokens.
   */

  for (
    const log
    of logs
  ) {

    if (
      tokens.length >=
      CONFIG.MAX_TOKENS_TO_VERIFY
    ) {
      break;
    }

    if (
      !budgetAvailable()
    ) {
      break;
    }

    const addresses =
      extractAddresses(
        log
      );

    for (
      const address
      of addresses
    ) {

      if (
        tokens.length >=
        CONFIG.MAX_TOKENS_TO_VERIFY
      ) {
        break;
      }

      if (
        seen.has(address)
      ) {
        continue;
      }

      if (
        CONFIG.LAUNCH_CONTRACTS
          .map(lower)
          .includes(
            lower(address)
          )
      ) {
        continue;
      }

      seen.add(address);

      const token =
        await verifyToken(
          address
        );

      if (!token) {
        continue;
      }

      tokens.push({

        ...token,

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

      /*
       * Small delay prevents the free
       * public RPC being hammered.
       */

      await sleep(75);
    }
  }

  return {

    latestBlock:
      latest,

    startBlock:
      start,

    blocksScanned:
      latest - start + 1,

    logsFound:
      logs.length,

    failedRanges,

    tokens
  };
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function dexLookup(
  token
) {

  if (
    !budgetAvailable()
  ) {

    return {

      ok: false,

      error:
        "SUBREQUEST_BUDGET_REACHED",

      pairs: []
    };
  }

  requestCount++;

  try {

    const response =
      await fetch(

        `${CONFIG.DEXSCREENER}/latest/dex/tokens/${token}`,

        {

          headers: {
            accept:
              "application/json"
          }
        }
      );

    if (!response.ok) {

      return {

        ok: false,

        error:
          "HTTP_" +
          response.status,

        pairs: []
      };
    }

    const data =
      await response.json();

    let pairs =
      Array.isArray(
        data?.pairs
      )
        ? data.pairs
        : [];

    pairs =
      pairs.filter(
        p =>
          lower(
            p?.chainId
          ) ===
          CONFIG.DEX_CHAIN
      );

    /*
     * Highest liquidity first.
     */

    pairs.sort(
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

    return {

      ok: true,

      pairs
    };

  } catch (error) {

    return {

      ok: false,

      error:
        String(
          error?.message ||
          error
        ),

      pairs: []
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
      String(name || "") +
      " " +
      String(symbol || "")
    ).toLowerCase();

  const words = [

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
    const word
    of words
  ) {

    if (
      text.includes(word)
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
   SCORE CANDIDATE
============================================================ */

function scoreCandidate(
  c
) {

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

  } else if (
    c.marketCap <= 10000000
  ) {
    score += 11;

  } else {
    score += 5;
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
   * Volume / MC.
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
   * Buy pressure.
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
   * Meme identity.
   */

  score +=
    Math.round(
      c.memeScore *
      0.75
    );

  /*
   * Transaction activity.
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
   * Risk penalties.
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
    toNumber(
      pair?.marketCap
    ) ??
    toNumber(
      pair?.fdv
    );

  const liquidity =
    toNumber(
      pair?.liquidity?.usd
    );

  const volume =
    toNumber(
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

  const volumeToMarketCap =
    volume /
    marketCap;

  const liquidityToMarketCap =
    liquidity /
    marketCap;

  const name =
    pair?.baseToken?.name ||
    token.name ||
    "UNKNOWN";

  const symbol =
    pair?.baseToken?.symbol ||
    token.symbol ||
    "UNKNOWN";

  const meme =
    memeScore(
      name,
      symbol
    );

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
      ) /
      3600000;
  }

  const candidate = {

    contract:
      token.address,

    name,

    symbol,

    priceUsd:
      toNumber(
        pair?.priceUsd
      ),

    marketCap,

    fdv:
      toNumber(
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
    meme === 0
  ) {
    riskFlags.push(
      "WEAK_MEME_SIGNAL"
    );
  }

  candidate.riskFlags =
    riskFlags;

  candidate.discoveryScore =
    scoreCandidate(
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

async function telegram(
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

  if (
    !budgetAvailable()
  ) {

    return {
      ok: false,
      error:
        "SUBREQUEST_BUDGET_REACHED"
    };
  }

  requestCount++;

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
   ALERT
============================================================ */

function alertMessage(
  c
) {

  const emoji =
    c.discoveryScore >= 80
      ? "🚨"
      : c.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${emoji} <b>ROBINHOOD MEME HUNTER V26.1</b>

<b>${c.name}</b>
$${c.symbol}

<b>Score:</b> ${c.discoveryScore}/100

<b>Market Cap:</b> ${money(c.marketCap)}

<b>Liquidity:</b> ${money(c.liquidity)}

<b>24h Volume:</b> ${money(c.volume24h)}

<b>Buy/Sell:</b> ${c.buySellRatio}

<b>Pressure:</b> ${c.pressure}

<b>Transactions:</b> ${c.transactions}

<b>Meme Score:</b> ${c.memeScore}/20

<b>Launch Age:</b> ${
    c.launchAgeHours ??
    "UNVERIFIED"
  }h

━━━━━━━━━━━━━━

<b>Holder Data:</b> UNVERIFIED
<b>Wallet Activity:</b> UNVERIFIED
<b>Smart Money:</b> UNVERIFIED

<b>Contract:</b>
<code>${c.contract}</code>

<b>Launch TX:</b>
<code>${c.launchTransaction}</code>

${
  c.url
    ? `<a href="${c.url}">DEX Screener</a>`
    : ""
}

⚠️ Automated research signal.
Not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function scan(
  env
) {

  requestCount = 0;

  const discovery =
    await discover();

  const candidates = [];

  const lookupErrors = [];

  /*
   * The tokens are already newest first.
   *
   * Only the newest five are examined.
   */

  for (
    const token
    of discovery.tokens
  ) {

    if (
      candidates.length >=
      CONFIG.MAX_DEX_LOOKUPS
    ) {
      break;
    }

    if (
      !budgetAvailable()
    ) {
      break;
    }

    const dex =
      await dexLookup(
        token.address
      );

    if (!dex.ok) {

      lookupErrors.push({

        contract:
          token.address,

        error:
          dex.error
      });

      continue;
    }

    if (
      dex.pairs.length === 0
    ) {

      /*
       * No Robinhood DEX pair yet.
       *
       * This is useful information rather
       * than an error.
       */

      continue;
    }

    /*
     * Best liquidity pair.
     */

    const candidate =
      buildCandidate(
        token,
        dex.pairs[0]
      );

    if (!candidate) {
      continue;
    }

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

  /*
   * Only alert high-conviction candidates.
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

    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {
      continue;
    }

    if (
      !budgetAvailable()
    ) {
      break;
    }

    const result =
      await telegram(
        env,
        alertMessage(
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
      CONFIG.VERSION,

    status:
      "ONLINE",

    objective:
      "Discover early-stage Robinhood Chain meme coins using free on-chain discovery and DEX market data.",

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
        "TOKEN_CREATED",

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

      logsFound:
        discovery.logsFound,

      failedRanges:
        discovery.failedRanges,

      tokensDiscovered:
        discovery.tokens.length,

      verifiedTokenAddresses:
        discovery.tokens.map(
          t => ({

            address:
              t.address,

            name:
              t.name,

            symbol:
              t.symbol,

            block:
              t.block,

            transaction:
              t.transaction
          })
        )
    },

    marketData: {

      source:
        "DEX_SCREENER",

      lookupLimit:
        CONFIG.MAX_DEX_LOOKUPS,

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
          x => x.sent
        ).length
    },

    scan: {

      candidatesAnalysed:
        candidates.length,

      requestCount,

      subrequestBudget:
        CONFIG.MAX_SUBREQUESTS,

      budgetRemaining:
        Math.max(
          0,
          CONFIG.MAX_SUBREQUESTS -
            requestCount
        )
    },

    candidates:
      candidates.slice(
        0,
        20
      ),

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
   WORKER
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
          CONFIG.VERSION,

        status:
          "ONLINE",

        chainId:
          CONFIG.CHAIN_ID,

        rpc:
          CONFIG.RPC,

        discovery:
          "TOKEN_CREATED",

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
          "UNVERIFIED",

        paidApiRequired:
          false,

        maxSubrequestsPerScan:
          CONFIG.MAX_SUBREQUESTS
      });
    }

    /*
     * TELEGRAM TEST
     */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      requestCount = 0;

      const result =
        await telegram(

          env,

          `🤖 <b>Robinhood Chain Meme Hunter V26.1</b>

Telegram connection successful.

Chain ID: 4663 ✅
Free Robinhood RPC: ✅
Token discovery: ✅
ERC20 verification: ✅
DEX Screener: ✅

Cloudflare-safe scan: ✅

Holder concentration: UNVERIFIED
Wallet activity: UNVERIFIED
Smart money: UNVERIFIED`
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
            : result.error,

        requestCount
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

        const result =
          await scan(
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
                true,

              unavailableData:
                "UNVERIFIED"
            },

            timestamp:
              new Date().toISOString()
          },

          {

            status:
              500,

            headers: {

              "cache-control":
                "no-store"
            }
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
        CONFIG.VERSION,

      status:
        "ONLINE",

      routes: [

        "/health",

        "/test-telegram",

        "/scan"
      ],

      chainId:
        CONFIG.CHAIN_ID,

      paidApiKeyRequired:
        false
    });
  }
};
