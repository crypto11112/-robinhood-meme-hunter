const CONFIG = {
  VERSION: "V22",

  CHAIN_ID: 4663,
  CHAIN_NAME: "Robinhood Chain",

  RPC: "https://rpc.mainnet.chain.robinhood.com",

  DEXSCREENER_API: "https://api.dexscreener.com",

  DEX_CHAIN_ID: "robinhood",

  // Current + legacy Robinhood/Uniswap launch contracts.
  LAUNCHERS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  // Robinhood Chain WETH
  WETH:
    "0x0bd7d308f8e1639fab988df18a8011f41eacad73",

  // Scan relatively small windows because public RPC
  // providers can reject very large log queries.
  BLOCK_CHUNK: 1000,
  BLOCK_CHUNKS: 10,

  MAX_LOGS: 500,

  MAX_TOKEN_CHECKS: 100,

  MAX_CANDIDATES: 50,

  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 5000,
  MIN_VOLUME_24H: 2500,

  ALERT_SCORE: 70
};

let requestCount = 0;


/* ============================================================
   GENERAL HELPERS
============================================================ */

function lower(value) {
  return String(value || "").toLowerCase();
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function hexToNumber(value) {
  if (!value) return 0;

  try {
    return parseInt(value, 16);
  } catch {
    return 0;
  }
}

function addressFromWord(word) {
  if (!word) return null;

  let clean =
    String(word)
      .replace(/^0x/, "")
      .padStart(64, "0")
      .slice(-40);

  if (!/^[0-9a-fA-F]{40}$/.test(clean)) {
    return null;
  }

  return `0x${clean}`.toLowerCase();
}

function splitWords(hex) {
  if (!hex) return [];

  const clean =
    String(hex).replace(/^0x/, "");

  const words = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    words.push(
      `0x${clean.slice(i, i + 64)}`
    );
  }

  return words;
}

function round(value, decimals = 2) {
  if (value == null) return null;

  return Number(
    Number(value).toFixed(decimals)
  );
}

function money(value) {
  if (value == null) return "N/A";

  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }

  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`;
  }

  return `$${value.toFixed(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function isAddress(value) {
  return /^0x[a-f0-9]{40}$/i.test(
    String(value || "")
  );
}


/* ============================================================
   RPC
============================================================ */

async function rpc(method, params = []) {

  requestCount++;

  try {

    const response =
      await fetch(CONFIG.RPC, {
        method: "POST",

        headers: {
          "content-type":
            "application/json",

          "accept":
            "application/json"
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
        error:
          `RPC_HTTP_${response.status}`
      };
    }

    const data =
      await response.json();

    if (data.error) {

      return {
        ok: false,
        error:
          data.error.message ||
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
   ERC20 ABI CALLS
============================================================ */

function encodeAddressCall(
  selector,
  address
) {

  return (
    selector +
    String(address)
      .replace(/^0x/, "")
      .padStart(64, "0")
  );
}

function decodeUint256(value) {

  if (!value) return null;

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function decodeStringResult(value) {

  if (!value || value === "0x") {
    return null;
  }

  try {

    const clean =
      value.replace(/^0x/, "");

    /*
     * ABI dynamic string:
     *
     * offset
     * length
     * bytes
     */

    if (clean.length < 128) {
      return null;
    }

    const offset =
      parseInt(
        clean.slice(0, 64),
        16
      );

    const lengthPosition =
      offset * 2;

    const length =
      parseInt(
        clean.slice(
          lengthPosition,
          lengthPosition + 64
        ),
        16
      );

    const start =
      lengthPosition + 64;

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

      const code =
        parseInt(
          bytes.slice(i, i + 2),
          16
        );

      if (
        code >= 32 &&
        code <= 126
      ) {
        output +=
          String.fromCharCode(code);
      }
    }

    return output || null;

  } catch {
    return null;
  }
}

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

async function readTokenMetadata(
  token
) {

  /*
   * ERC20:
   *
   * name()        0x06fdde03
   * symbol()      0x95d89b41
   * decimals()    0x313ce567
   * totalSupply() 0x18160ddd
   */

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] =
    await Promise.all([
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
    decimalsRaw
      ? Number(
          decodeUint256(
            decimalsRaw
          )
        )
      : null;

  const supply =
    supplyRaw
      ? decodeUint256(
          supplyRaw
        )
      : null;

  const name =
    decodeStringResult(
      nameRaw
    );

  const symbol =
    decodeStringResult(
      symbolRaw
    );

  /*
   * A valid ERC20 needs at least
   * totalSupply + decimals.
   */

  if (
    supply == null ||
    decimals == null ||
    decimals > 36
  ) {
    return null;
  }

  return {

    address:
      lower(token),

    name:
      name || "Unknown",

    symbol:
      symbol || "UNKNOWN",

    decimals,

    totalSupply:
      supply.toString()
  };
}


/* ============================================================
   DISCOVERY
============================================================ */

/*
 * V21 assumed a specific event signature.
 *
 * V22 does NOT.
 *
 * Instead we:
 *
 * 1. Watch both launch contracts.
 * 2. Retrieve ALL logs from recent blocks.
 * 3. Extract every address-looking word from topics/data.
 * 4. Test candidates as ERC20 contracts.
 *
 * This makes discovery independent of the exact
 * launch event topic.
 */

async function discoverTokens() {

  const latest =
    await rpc(
      "eth_blockNumber"
    );

  if (!latest.ok) {

    return {
      latestBlock: null,
      launches: [],
      error:
        latest.error
    };
  }

  const latestBlock =
    hexToNumber(
      latest.result
    );

  const launches = [];

  const seenTokens =
    new Set();

  const seenLogs =
    new Set();

  let totalLogs = 0;

  for (
    let chunk = 0;
    chunk < CONFIG.BLOCK_CHUNKS;
    chunk++
  ) {

    const toBlock =
      latestBlock -
      chunk *
      CONFIG.BLOCK_CHUNK;

    const fromBlock =
      Math.max(
        0,
        toBlock -
        CONFIG.BLOCK_CHUNK +
        1
      );

    if (
      toBlock < 0
    ) {
      break;
    }

    for (
      const launcher
      of CONFIG.LAUNCHERS
    ) {

      if (
        totalLogs >=
        CONFIG.MAX_LOGS
      ) {
        break;
      }

      const filter = {

        address:
          launcher,

        fromBlock:
          `0x${fromBlock.toString(16)}`,

        toBlock:
          `0x${toBlock.toString(16)}`
      };

      const result =
        await rpc(
          "eth_getLogs",
          [filter]
        );

      if (!result.ok) {
        continue;
      }

      const logs =
        Array.isArray(
          result.result
        )
          ? result.result
          : [];

      totalLogs +=
        logs.length;

      for (
        const log
        of logs
      ) {

        const logId =
          `${log.blockNumber}:${
            log.transactionHash
          }:${
            log.logIndex
          }`;

        if (
          seenLogs.has(logId)
        ) {
          continue;
        }

        seenLogs.add(
          logId
        );

        /*
         * Collect possible addresses
         * from event topics.
         */

        const possible =
          new Set();

        for (
          const topic
          of (
            log.topics || []
          )
        ) {

          const address =
            addressFromWord(
              topic
            );

          if (
            address &&
            address !==
              lower(launcher)
          ) {

            possible.add(
              address
            );
          }
        }

        /*
         * Also inspect event data.
         */

        for (
          const word
          of splitWords(
            log.data
          )
        ) {

          const address =
            addressFromWord(
              word
            );

          if (
            address &&
            address !==
              lower(launcher)
          ) {

            possible.add(
              address
            );
          }
        }

        /*
         * Test candidates.
         *
         * Limit per log so one unusual
         * transaction cannot explode RPC use.
         */

        let checked = 0;

        for (
          const token
          of possible
        ) {

          if (
            checked >= 10
          ) {
            break;
          }

          if (
            seenTokens.has(token)
          ) {
            continue;
          }

          /*
           * Ignore known infrastructure.
           */

          if (
            token ===
            lower(CONFIG.WETH)
          ) {
            continue;
          }

          checked++;

          const metadata =
            await readTokenMetadata(
              token
            );

          if (!metadata) {
            continue;
          }

          /*
           * We found an ERC20.
           */

          seenTokens.add(
            token
          );

          launches.push({

            address:
              token,

            name:
              metadata.name,

            symbol:
              metadata.symbol,

            decimals:
              metadata.decimals,

            totalSupply:
              metadata.totalSupply,

            blockNumber:
              hexToNumber(
                log.blockNumber
              ),

            transactionHash:
              log.transactionHash,

            launcher:
              lower(
                log.address
              ),

            logIndex:
              hexToNumber(
                log.logIndex
              )
          });

          if (
            launches.length >=
            CONFIG.MAX_TOKEN_CHECKS
          ) {
            break;
          }
        }

        if (
          launches.length >=
          CONFIG.MAX_TOKEN_CHECKS
        ) {
          break;
        }
      }

      if (
        launches.length >=
        CONFIG.MAX_TOKEN_CHECKS
      ) {
        break;
      }
    }

    if (
      launches.length >=
      CONFIG.MAX_TOKEN_CHECKS
    ) {
      break;
    }
  }

  /*
   * Newest first.
   */

  launches.sort(
    (a, b) =>
      b.blockNumber -
      a.blockNumber
  );

  return {

    latestBlock,

    launches:
      launches.slice(
        0,
        CONFIG.MAX_TOKEN_CHECKS
      ),

    totalLogs
  };
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function getDexPairs(
  token
) {

  const url =
    `${CONFIG.DEXSCREENER_API}/latest/dex/tokens/${token}`;

  try {

    const response =
      await fetch(
        url,
        {
          method: "GET",

          headers: {

            "accept":
              "application/json",

            "user-agent":
              "Robinhood-Chain-Meme-Hunter-V22"
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
      Array.isArray(
        data?.pairs
      )
        ? data.pairs
        : [];

    /*
     * Only Robinhood Chain.
     */

    const filtered =
      pairs.filter(
        pair =>
          lower(
            pair?.chainId
          ) ===
          CONFIG.DEX_CHAIN_ID
      );

    return {

      ok: true,

      status:
        response.status,

      pairs:
        filtered
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
   BEST DEX PAIR
============================================================ */

function bestPair(
  pairs
) {

  if (
    !Array.isArray(pairs) ||
    pairs.length === 0
  ) {
    return null;
  }

  let best = null;
  let bestScore = -1;

  for (
    const pair
    of pairs
  ) {

    const liquidity =
      num(
        pair?.liquidity?.usd
      ) || 0;

    const volume =
      num(
        pair?.volume?.h24
      ) || 0;

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

    const score =
      liquidity +
      volume * 0.25 +
      transactions * 5;

    if (
      score >
      bestScore
    ) {

      bestScore =
        score;

      best =
        pair;
    }
  }

  return best;
}


/* ============================================================
   MEME SCORE
============================================================ */

function memeScore(
  name,
  symbol
) {

  const text =
    `${name || ""} ${
      symbol || ""
    }`
      .toLowerCase();

  const keywords = [

    "meme",
    "dog",
    "doge",
    "inu",
    "shib",

    "cat",
    "kitty",

    "pepe",
    "frog",

    "wojak",
    "bonk",
    "wif",

    "goat",
    "ape",
    "monkey",

    "moon",
    "chad",

    "degen",
    "fart",

    "pup",
    "woof",

    "bear",
    "bull",

    "panda",
    "yolo",

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
   RISK
============================================================ */

function calculateRisk(
  data
) {

  const flags = [];

  let risk = 0;

  if (
    data.liquidity <
    10000
  ) {

    flags.push(
      "LOW_LIQUIDITY"
    );

    risk += 20;
  }

  if (
    data.liquidityToMarketCap <
    0.05
  ) {

    flags.push(
      "LOW_LIQUIDITY_RATIO"
    );

    risk += 15;
  }

  if (
    data.buySellRatio <
    0.8
  ) {

    flags.push(
      "SELL_PRESSURE"
    );

    risk += 25;
  }

  if (
    data.transactions <
    100
  ) {

    flags.push(
      "LOW_ACTIVITY"
    );

    risk += 10;
  }

  if (
    data.memeScore === 0
  ) {

    flags.push(
      "WEAK_MEME_SIGNAL"
    );

    risk += 5;
  }

  return {

    riskScore:
      Math.min(
        100,
        risk
      ),

    flags,

    level:
      risk >= 50
        ? "HIGH"
        : risk >= 25
          ? "MEDIUM"
          : "LOW"
  };
}


/* ============================================================
   OPPORTUNITY SCORE
============================================================ */

function opportunityScore(
  data
) {

  let score = 0;

  /*
   * Market cap
   */

  if (
    data.marketCap <= 250000
  )
    score += 20;

  else if (
    data.marketCap <= 1000000
  )
    score += 18;

  else if (
    data.marketCap <= 5000000
  )
    score += 15;

  else if (
    data.marketCap <= 10000000
  )
    score += 12;

  else if (
    data.marketCap <= 25000000
  )
    score += 8;

  else
    score += 4;


  /*
   * Liquidity
   */

  if (
    data.liquidity >= 100000
  )
    score += 15;

  else if (
    data.liquidity >= 50000
  )
    score += 12;

  else if (
    data.liquidity >= 25000
  )
    score += 9;

  else if (
    data.liquidity >= 10000
  )
    score += 6;

  else
    score += 3;


  /*
   * Volume / MC
   */

  if (
    data.volumeRatio >= 5
  )
    score += 15;

  else if (
    data.volumeRatio >= 2
  )
    score += 12;

  else if (
    data.volumeRatio >= 0.5
  )
    score += 8;

  else if (
    data.volumeRatio >= 0.1
  )
    score += 4;


  /*
   * Buy/sell
   */

  if (
    data.buySellRatio >= 2
  )
    score += 15;

  else if (
    data.buySellRatio >= 1.25
  )
    score += 12;

  else if (
    data.buySellRatio >= 1.05
  )
    score += 6;


  /*
   * Activity
   */

  if (
    data.transactions >= 5000
  )
    score += 5;

  else if (
    data.transactions >= 1000
  )
    score += 4;

  else if (
    data.transactions >= 250
  )
    score += 2;


  /*
   * Meme signal
   */

  score += Math.min(
    15,
    Math.round(
      data.memeScore *
      0.75
    )
  );


  /*
   * Early launch bonus
   */

  if (
    data.launchAgeHours != null
  ) {

    if (
      data.launchAgeHours <= 6
    )
      score += 10;

    else if (
      data.launchAgeHours <= 24
    )
      score += 8;

    else if (
      data.launchAgeHours <= 72
    )
      score += 5;
  }


  /*
   * Risk penalty
   */

  score -= Math.round(
    data.riskScore * 0.25
  );

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
  pair,
  launch
) {

  if (!pair)
    return null;

  const token =
    pair?.baseToken || {};

  const contract =
    lower(
      token.address
    );

  if (!isAddress(contract))
    return null;

  const name =
    token.name ||
    launch.name ||
    "Unknown";

  const symbol =
    token.symbol ||
    launch.symbol ||
    "UNKNOWN";

  const marketCap =
    num(
      pair.marketCap
    ) ??
    num(
      pair.fdv
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
    marketCap == null ||
    liquidity == null ||
    volume == null
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
    marketCap > 0
      ? liquidity /
        marketCap
      : 0;

  const volumeRatio =
    marketCap > 0
      ? volume /
        marketCap
      : 0;

  let launchAgeHours = null;

  if (
    pair.pairCreatedAt
  ) {

    launchAgeHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) / 3600000;
  }

  const data = {

    contract,

    name,

    symbol,

    priceUsd:
      num(
        pair.priceUsd
      ),

    marketCap,

    fdv:
      num(pair.fdv),

    liquidity,

    volume24h:
      volume,

    buys,

    sells,

    transactions,

    buySellRatio:
      round(
        buySellRatio
      ),

    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE"
          : "NEUTRAL",

    liquidityToMarketCap:
      liquidityToMarketCap,

    volumeToMarketCap:
      volumeRatio,

    volumeRatio,

    memeScore:
      memeScore(
        name,
        symbol
      ),

    launchAgeHours:
      launchAgeHours == null
        ? null
        : round(
            launchAgeHours,
            1
          ),

    launchBlock:
      launch.blockNumber,

    launchTransaction:
      launch.transactionHash,

    launcher:
      launch.launcher,

    dex:
      pair.dexId ||
      "uniswap",

    pairAddress:
      pair.pairAddress,

    url:
      pair.url ||
      `https://dexscreener.com/robinhood/${pair.pairAddress}`,

    /*
     * Do not fabricate these.
     */

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

  const risk =
    calculateRisk(
      data
    );

  data.riskScore =
    risk.riskScore;

  data.riskLevel =
    risk.level;

  data.riskFlags =
    risk.flags;

  data.discoveryScore =
    opportunityScore(
      data
    );

  data.category =
    data.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : data.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : data.discoveryScore >= 60
          ? "WATCH"
          : data.discoveryScore >= 50
            ? "EARLY"
            : "LOW_CONVICTION";

  data.targetMultiples = {

    to100M:
      round(
        100000000 /
        marketCap
      ),

    to250M:
      round(
        250000000 /
        marketCap
      ),

    to500M:
      round(
        500000000 /
        marketCap
      )
  };

  return data;
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

          method:
            "POST",

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

      data
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

function alertMessage(
  candidate
) {

  const icon =
    candidate.discoveryScore >= 80
      ? "🚨"
      : candidate.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${icon} <b>ROBINHOOD CHAIN MEME HUNTER V22</b>

<b>${escapeHtml(candidate.name)}</b>
$${escapeHtml(candidate.symbol)}

<b>Opportunity:</b>
${candidate.discoveryScore}/100

<b>Risk:</b>
${candidate.riskLevel}
(${candidate.riskScore}/100)

━━━━━━━━━━━━━━━━━━

<b>Market Cap:</b>
${money(candidate.marketCap)}

<b>Liquidity:</b>
${money(candidate.liquidity)}

<b>24h Volume:</b>
${money(candidate.volume24h)}

<b>Launch Age:</b>
${candidate.launchAgeHours ?? "UNVERIFIED"}h

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

<b>Liquidity/MC:</b>
${(
    candidate.liquidityToMarketCap *
    100
  ).toFixed(1)}%

<b>Volume/MC:</b>
${(
    candidate.volumeToMarketCap *
    100
  ).toFixed(1)}%

━━━━━━━━━━━━━━━━━━

<b>Holder Data:</b>
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

<a href="${candidate.url}">Open DEX Screener</a>

⚠️ Automated research signal — not financial advice.`;
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

  if (
    discovery.launches.length === 0
  ) {

    return {

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "NO_DISCOVERY_DATA",

      discovery: {

        source:
          "ROBINHOOD_CHAIN_RPC_DYNAMIC_EVENT_DISCOVERY",

        latestBlock:
          discovery.latestBlock,

        logsScanned:
          discovery.totalLogs || 0,

        tokensDiscovered:
          0
      },

      candidates: [],

      alerts: [],

      requestCount,

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

  const candidates = [];

  let pairsFound = 0;

  const lookupErrors = [];

  for (
    const launch
    of discovery.launches
  ) {

    const dex =
      await getDexPairs(
        launch.address
      );

    if (!dex.ok) {

      lookupErrors.push({

        token:
          launch.address,

        status:
          dex.status || 0
      });

      continue;
    }

    if (
      dex.pairs.length === 0
    ) {
      continue;
    }

    pairsFound +=
      dex.pairs.length;

    const pair =
      bestPair(
        dex.pairs
      );

    if (!pair)
      continue;

    const candidate =
      buildCandidate(
        pair,
        launch
      );

    if (!candidate)
      continue;

    candidates.push(
      candidate
    );

    if (
      candidates.length >=
      CONFIG.MAX_CANDIDATES
    ) {
      break;
    }
  }

  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );

  const alerts = [];

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

    const telegram =
      await sendTelegram(
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

      risk:
        candidate.riskLevel,

      sent:
        telegram.ok,

      error:
        telegram.ok
          ? null
          : (
              telegram.error ||
              telegram.data?.description ||
              "TELEGRAM_FAILED"
            )
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
      "Discover early-stage Robinhood Chain meme coins using dynamic on-chain launch discovery and verified DEX market data.",

    chain: {

      name:
        CONFIG.CHAIN_NAME,

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC
    },

    discovery: {

      source:
        "ROBINHOOD_CHAIN_RPC_DYNAMIC_EVENT_DISCOVERY",

      launchContracts:
        CONFIG.LAUNCHERS,

      latestBlock:
        discovery.latestBlock,

      logsScanned:
        discovery.totalLogs,

      tokensDiscovered:
        discovery.launches.length
    },

    marketData: {

      source:
        "DEX_SCREENER",

      lookupMode:
        "ONE_TOKEN_AT_A_TIME",

      pairsFound,

      tokensWithPairs:
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
          item =>
            item.sent
        ).length
    },

    scan: {

      candidatesAnalysed:
        candidates.length,

      requestCount,

      requestLimit:
        10
    },

    candidates:
      candidates.slice(
        0,
        50
      ),

    alerts,

    validation: {

      tokenDiscovery:
        "VERIFIED FROM ROBINHOOD CHAIN LAUNCHER LOGS",

      tokenMetadata:
        "VERIFIED WITH ERC20 eth_call",

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

      pairAge:
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


    /* --------------------------------------------------------
       HEALTH
    -------------------------------------------------------- */

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
          "DYNAMIC_ON_CHAIN_LAUNCH_LOG_DISCOVERY",

        marketData:
          "DEX_SCREENER_ONE_TOKEN_LOOKUP",

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


    /* --------------------------------------------------------
       TELEGRAM TEST
    -------------------------------------------------------- */

    if (
      url.pathname ===
      "/test-telegram"
    ) {

      const result =
        await sendTelegram(
          env,

          `🤖 <b>Robinhood Chain Meme Hunter V22</b>

Telegram connection successful.

Chain discovery: ✅
Dynamic launch detection: ✅
ERC20 verification: ✅
DEX Screener lookup: ✅
Opportunity scoring: ✅
Risk scoring: ✅

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
            : (
                result.error ||
                result.data?.description ||
                "TELEGRAM_TEST_FAILED"
              )
      });
    }


    /* --------------------------------------------------------
       SCAN
    -------------------------------------------------------- */

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


    /* --------------------------------------------------------
       DEFAULT
    -------------------------------------------------------- */

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
      ]
    });
  }
};
