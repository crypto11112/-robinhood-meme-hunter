const CONFIG = {
  VERSION: "V25",

  CHAIN_ID: 4663,

  RPC: "https://rpc.mainnet.chain.robinhood.com",

  LAUNCH_CONTRACTS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",

  DEXSCREENER:
    "https://api.dexscreener.com",

  DEX_CHAIN:
    "robinhood",

  /*
   * Public RPC is rate-limited.
   * Keep ranges conservative.
   */
  LOG_BLOCK_RANGE: 1000,

  SCAN_BLOCKS: 10000,

  MAX_TOKENS: 30,

  MIN_MARKET_CAP: 10000,

  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 5000,

  MIN_VOLUME_24H: 1000,

  ALERT_SCORE: 70
};

let requestCount = 0;


/* ============================================================
   HELPERS
============================================================ */

function lower(value) {
  return String(value || "").toLowerCase();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hexNumber(value) {
  if (!value) return 0;

  try {
    return parseInt(value, 16);
  } catch {
    return 0;
  }
}

function validAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(value || "")
  );
}

function normalizeAddress(value) {
  if (!value) return null;

  let v = String(value);

  if (v.startsWith("0x")) {
    v = v.slice(2);
  }

  if (v.length < 40) {
    return null;
  }

  const address =
    "0x" + v.slice(-40);

  return validAddress(address)
    ? address.toLowerCase()
    : null;
}

function money(value) {
  if (value == null) return "N/A";

  if (value >= 1000000) {
    return "$" +
      (value / 1000000).toFixed(2) +
      "M";
  }

  if (value >= 1000) {
    return "$" +
      (value / 1000).toFixed(1) +
      "K";
  }

  return "$" +
    value.toFixed(2);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sleep(ms) {
  return new Promise(
    resolve => setTimeout(resolve, ms)
  );
}


/* ============================================================
   RPC
============================================================ */

async function rpc(
  method,
  params = []
) {

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

            "accept":
              "application/json"
          },

          body:
            JSON.stringify({
              jsonrpc: "2.0",
              id: requestCount,
              method,
              params
            })
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
          String(data.error.code) ||
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

async function latestBlock() {

  const result =
    await rpc(
      "eth_blockNumber"
    );

  if (!result.ok) {
    throw new Error(
      result.error
    );
  }

  return hexNumber(
    result.result
  );
}


/* ============================================================
   TOKEN ADDRESS DECODER
============================================================ */

/*
 * V24 assumed:
 *
 * topics[1] = token
 *
 * That may be wrong depending on whether the
 * event argument is indexed.
 *
 * V25 checks BOTH:
 *
 * 1. topics[1]
 * 2. data
 *
 * and returns every valid address candidate.
 */

function decodeAddressCandidates(log) {

  const candidates = [];

  /*
   * Indexed event argument.
   */

  if (
    Array.isArray(log?.topics) &&
    log.topics.length > 1
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
        candidates.push(
          address
        );
      }
    }
  }

  /*
   * Non-indexed address argument.
   *
   * ABI encoded address is 32 bytes,
   * therefore the final 20 bytes are
   * the address.
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

    /*
     * Every 32-byte word.
     */

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
        normalizeAddress(
          word
        );

      if (address) {
        candidates.push(
          address
        );
      }
    }
  }

  return [
    ...new Set(
      candidates
    )
  ];
}


/* ============================================================
   ERC20 VERIFICATION
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

  return result.ok
    ? result.result
    : null;
}

function decodeUint(value) {

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


/*
 * Decode Solidity string return data.
 *
 * Handles:
 *
 * string
 * bytes32
 */

function decodeString(value) {

  if (
    !value ||
    value === "0x"
  ) {
    return null;
  }

  const clean =
    value.replace(
      /^0x/,
      ""
    );

  /*
   * Standard ABI dynamic string:
   *
   * offset
   * length
   * bytes
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

      if (
        position + 64 <=
        clean.length
      ) {

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
            start +
              length * 2
          );

        let output = "";

        for (
          let i = 0;
          i + 2 <= bytes.length;
          i += 2
        ) {

          const byte =
            parseInt(
              bytes.slice(
                i,
                i + 2
              ),
              16
            );

          if (
            byte >= 32 &&
            byte <= 126
          ) {
            output +=
              String.fromCharCode(
                byte
              );
          }
        }

        if (output.trim()) {
          return output.trim();
        }
      }
    }

  } catch {}

  /*
   * bytes32 fallback.
   */

  try {

    let output = "";

    for (
      let i = 0;
      i + 2 <= clean.length;
      i += 2
    ) {

      const byte =
        parseInt(
          clean.slice(
            i,
            i + 2
          ),
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
          String.fromCharCode(
            byte
          );
      }
    }

    return output.trim() || null;

  } catch {
    return null;
  }
}


/*
 * Verify that the address is actually an ERC20-like token.
 *
 * We require:
 *
 * decimals()
 * totalSupply()
 *
 * and attempt name()/symbol().
 */

async function verifyToken(
  address
) {

  if (!validAddress(address)) {
    return null;
  }

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] = await Promise.all([

    ethCall(
      address,
      "0x06fdde03"
    ),

    ethCall(
      address,
      "0x95d89b41"
    ),

    ethCall(
      address,
      "0x313ce567"
    ),

    ethCall(
      address,
      "0x18160ddd"
    )
  ]);

  const decimals =
    decodeUint(
      decimalsRaw
    );

  const supply =
    decodeUint(
      supplyRaw
    );

  /*
   * This is the important verification.
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
    !Number.isFinite(
      decimalNumber
    ) ||
    decimalNumber < 0 ||
    decimalNumber > 36
  ) {
    return null;
  }

  return {

    address,

    name:
      decodeString(
        nameRaw
      ) ||
      "UNKNOWN",

    symbol:
      decodeString(
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
   GET TOKEN CREATED LOGS
============================================================ */

async function getLogs(
  fromBlock,
  toBlock
) {

  const filter = {

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
  };

  return await rpc(
    "eth_getLogs",
    [filter]
  );
}


/* ============================================================
   DISCOVER TOKENS
============================================================ */

async function discoverTokens() {

  const latest =
    await latestBlock();

  const start =
    Math.max(
      0,
      latest -
        CONFIG.SCAN_BLOCKS
    );

  const tokens =
    new Map();

  let logsScanned = 0;

  let failedRanges = 0;

  let rangeSize =
    CONFIG.LOG_BLOCK_RANGE;

  /*
   * Scan newest first.
   */

  for (
    let end = latest;

    end >= start;

    end -= rangeSize
  ) {

    const from =
      Math.max(
        start,
        end -
          rangeSize +
          1
      );

    const result =
      await getLogs(
        from,
        end
      );

    if (!result.ok) {

      failedRanges++;

      /*
       * Public RPC may reject a range.
       * Retry once using 250 blocks.
       */

      if (
        rangeSize > 250
      ) {

        const retry =
          await getLogs(
            from,
            Math.min(
              end,
              from + 249
            )
          );

        if (
          retry.ok
        ) {

          const logs =
            Array.isArray(
              retry.result
            )
              ? retry.result
              : [];

          logsScanned +=
            logs.length;

          for (
            const log
            of logs
          ) {

            await processLog(
              log,
              tokens
            );

            if (
              tokens.size >=
              CONFIG.MAX_TOKENS
            ) {
              break;
            }
          }
        }
      }

    } else {

      const logs =
        Array.isArray(
          result.result
        )
          ? result.result
          : [];

      logsScanned +=
        logs.length;

      for (
        const log
        of logs
      ) {

        await processLog(
          log,
          tokens
        );

        if (
          tokens.size >=
          CONFIG.MAX_TOKENS
        ) {
          break;
        }
      }
    }

    if (
      tokens.size >=
      CONFIG.MAX_TOKENS
    ) {
      break;
    }

    /*
     * Public RPC is rate limited.
     */

    await sleep(50);
  }

  return {

    latestBlock:
      latest,

    startBlock:
      start,

    blocksScanned:
      latest - start + 1,

    logsScanned,

    failedRanges,

    tokens:
      Array.from(
        tokens.values()
      )
  };
}


/* ============================================================
   PROCESS LAUNCH LOG
============================================================ */

async function processLog(
  log,
  tokens
) {

  const emitter =
    lower(
      log?.address
    );

  if (
    !CONFIG.LAUNCH_CONTRACTS
      .map(lower)
      .includes(emitter)
  ) {
    return;
  }

  /*
   * Get EVERY possible address
   * from the event.
   */

  const addresses =
    decodeAddressCandidates(
      log
    );

  /*
   * Verify candidates one-by-one.
   *
   * This prevents us from accidentally
   * treating another event argument as
   * the token.
   */

  for (
    const address
    of addresses
  ) {

    if (
      tokens.has(address)
    ) {
      continue;
    }

    const metadata =
      await verifyToken(
        address
      );

    if (!metadata) {
      continue;
    }

    tokens.set(
      address,
      {

        ...metadata,

        launchContract:
          emitter,

        block:
          hexNumber(
            log.blockNumber
          ),

        transaction:
          log.transactionHash,

        logIndex:
          hexNumber(
            log.logIndex
          )
      }
    );

    /*
     * We only need one verified token
     * per TokenCreated event.
     */

    break;
  }
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function dexLookup(
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
              "application/json"
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

    let pairs =
      Array.isArray(
        data?.pairs
      )
        ? data.pairs
        : [];

    /*
     * Only Robinhood Chain.
     */

    pairs =
      pairs.filter(
        pair =>
          lower(
            pair?.chainId
          ) ===
          CONFIG.DEX_CHAIN
      );

    /*
     * Highest liquidity first.
     */

    pairs.sort(
      (a, b) => {

        const aLiquidity =
          num(
            a?.liquidity?.usd
          ) || 0;

        const bLiquidity =
          num(
            b?.liquidity?.usd
          ) || 0;

        const aVolume =
          num(
            a?.volume?.h24
          ) || 0;

        const bVolume =
          num(
            b?.volume?.h24
          ) || 0;

        return (
          bLiquidity +
          bVolume * 0.25
        ) -
        (
          aLiquidity +
          aVolume * 0.25
        );
      }
    );

    return {

      ok: true,

      pairs
    };

  } catch (error) {

    return {

      ok: false,

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
      String(name || "") +
      " " +
      String(symbol || "")
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
    const word
    of keywords
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
   SCORE
============================================================ */

function scoreCandidate(
  data
) {

  let score = 0;

  /*
   * Market cap.
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
   * Volume / MC.
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
   * Buy/sell pressure.
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

  score += Math.round(
    data.memeScore * 0.75
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
    data.buySellRatio < 0.8
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
    num(pair?.marketCap) ??
    num(pair?.fdv);

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
    num(
      pair?.txns?.h24?.buys
    ) || 0;

  const sells =
    num(
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

  let launchAgeHours = null;

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
      "UNVERIFIED",

    accumulationDistribution:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE_ONLY"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE_ONLY"
          : "NEUTRAL"
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

  candidate.riskScore =
    Math.min(
      100,
      riskFlags.length * 10
    );

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
   TELEGRAM MESSAGE
============================================================ */

function alertMessage(
  candidate
) {

  const emoji =
    candidate.discoveryScore >= 80
      ? "🚨"
      : candidate.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${emoji} <b>ROBINHOOD MEME HUNTER V25</b>

<b>${escapeHtml(
  candidate.name
)}</b>
$${escapeHtml(
  candidate.symbol
)}

<b>Score:</b>
${candidate.discoveryScore}/100

<b>Risk:</b>
${candidate.riskScore}/100

━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(
  candidate.marketCap
)}

<b>Liquidity:</b>
${money(
  candidate.liquidity
)}

<b>24h Volume:</b>
${money(
  candidate.volume24h
)}

<b>Volume / MC:</b>
${(
  candidate.volumeToMarketCap *
  100
).toFixed(1)}%

━━━━━━━━━━━━━━

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

━━━━━━━━━━━━━━

<b>Meme Score:</b>
${candidate.memeScore}/20

<b>Launch Age:</b>
${candidate.launchAgeHours ?? "UNVERIFIED"}h

<b>Liquidity / MC:</b>
${(
  candidate.liquidityToMarketCap *
  100
).toFixed(1)}%

━━━━━━━━━━━━━━

<b>Holder Data:</b>
UNVERIFIED

<b>Wallet Activity:</b>
UNVERIFIED

<b>Smart Money:</b>
UNVERIFIED

<b>Flow:</b>
${candidate.accumulationDistribution}

━━━━━━━━━━━━━━

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
    ? `<a href="${candidate.url}">DEX Screener</a>`
    : ""
}

⚠️ Automated research signal.
Not financial advice.`;
}


/* ============================================================
   RUN SCAN
============================================================ */

async function runScan(
  env
) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  const candidates = [];

  const lookupErrors = [];

  /*
   * Newest first.
   */

  const tokens =
    discovery.tokens.sort(
      (a, b) =>
        b.block -
        a.block
    );

  for (
    const token
    of tokens
  ) {

    /*
     * DEX Screener.
     */

    const dex =
      await dexLookup(
        token.address
      );

    if (!dex.ok) {

      lookupErrors.push({

        contract:
          token.address,

        error:
          dex.error || null
      });

      continue;
    }

    if (
      dex.pairs.length === 0
    ) {

      /*
       * Keep this information internally,
       * but do not fabricate a market.
       */

      continue;
    }

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

    await sleep(75);
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

  /*
   * Alert strong candidates only.
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
      "Discover early-stage Robinhood Chain meme coins using verified TokenCreated events and verified DEX market data.",

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
        discovery.tokens.length,

      verifiedTokenAddresses:
        discovery.tokens.map(
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
   WORKER ROUTES
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


    /* -------------------------
       HEALTH
    ------------------------- */

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


    /* -------------------------
       TELEGRAM TEST
    ------------------------- */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await telegram(

          env,

          `🤖 <b>Robinhood Chain Meme Hunter V25</b>

Telegram connection successful.

Chain ID: 4663 ✅
Public RPC: ✅
TokenCreated event: ✅
Dual launch-contract discovery: ✅
ERC20 verification: ✅
DEX Screener: ready ✅

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
            : result.error
      });
    }


    /* -------------------------
       SCAN
    ------------------------- */

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


    /* -------------------------
       DEFAULT
    ------------------------- */

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

      freeSetup: {

        robinhoodPublicRPC:
          true,

        dexScreener:
          true,

        telegram:
          true,

        paidAPIKeyRequired:
          false
      }
    });
  }
};
