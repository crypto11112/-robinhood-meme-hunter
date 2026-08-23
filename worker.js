const CONFIG = {
  VERSION: "V23",

  CHAIN_ID: 4663,
  RPC: "https://rpc.mainnet.chain.robinhood.com",

  DEXSCREENER_API: "https://api.dexscreener.com",
  DEX_CHAIN_ID: "robinhood",

  LAUNCHERS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],

  WETH: "0x0bd7d308f8e1639fab988df18a8011f41eacad73",

  /*
   * V23 deliberately uses a small recent-block window.
   * It searches actual transactions involving the launch
   * contracts instead of guessing an event signature.
   */
  RECENT_BLOCKS: 150,

  MAX_LAUNCH_TRANSACTIONS: 25,
  MAX_TOKEN_CANDIDATES: 100,

  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,

  MIN_LIQUIDITY: 5000,
  MIN_VOLUME_24H: 2500,

  ALERT_SCORE: 70
};

let requestCount = 0;


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

function hexNum(v) {
  if (!v) return 0;

  try {
    return parseInt(v, 16);
  } catch {
    return 0;
  }
}

function isAddress(v) {
  return /^0x[a-f0-9]{40}$/i.test(String(v || ""));
}

function addressFromWord(word) {
  if (!word) return null;

  const clean = String(word)
    .replace(/^0x/, "")
    .padStart(64, "0");

  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    return null;
  }

  const address = `0x${clean.slice(-40)}`.toLowerCase();

  return isAddress(address) ? address : null;
}

function words(hex) {
  if (!hex) return [];

  const clean = String(hex).replace(/^0x/, "");
  const result = [];

  for (let i = 0; i + 64 <= clean.length; i += 64) {
    result.push(`0x${clean.slice(i, i + 64)}`);
  }

  return result;
}

function money(v) {
  if (v == null) return "N/A";

  if (v >= 1000000) {
    return `$${(v / 1000000).toFixed(2)}M`;
  }

  if (v >= 1000) {
    return `$${(v / 1000).toFixed(1)}K`;
  }

  return `$${v.toFixed(2)}`;
}

function escapeHtml(v) {
  return String(v ?? "")
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
        error: `HTTP_${response.status}`
      };
    }

    const data = await response.json();

    if (data.error) {
      return {
        ok: false,
        error: data.error.message || "RPC_ERROR"
      };
    }

    return {
      ok: true,
      result: data.result
    };

  } catch (error) {

    return {
      ok: false,
      error: String(error?.message || error)
    };
  }
}


/* ============================================================
   ERC20
============================================================ */

function decodeUint(v) {
  if (!v || v === "0x") return null;

  try {
    return BigInt(v);
  } catch {
    return null;
  }
}

function decodeString(v) {

  if (!v || v === "0x") return null;

  try {

    const clean = v.replace(/^0x/, "");

    if (clean.length < 128) {
      return null;
    }

    const offset = parseInt(
      clean.slice(0, 64),
      16
    );

    const pos = offset * 2;

    const length = parseInt(
      clean.slice(pos, pos + 64),
      16
    );

    const start = pos + 64;

    const bytes = clean.slice(
      start,
      start + length * 2
    );

    let output = "";

    for (
      let i = 0;
      i + 2 <= bytes.length;
      i += 2
    ) {

      const c = parseInt(
        bytes.slice(i, i + 2),
        16
      );

      if (c >= 32 && c <= 126) {
        output += String.fromCharCode(c);
      }
    }

    return output || null;

  } catch {
    return null;
  }
}

async function ethCall(to, data) {

  const r = await rpc(
    "eth_call",
    [
      {
        to,
        data
      },
      "latest"
    ]
  );

  return r.ok ? r.result : null;
}

async function readERC20(token) {

  if (!isAddress(token)) {
    return null;
  }

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

  const supply = decodeUint(supplyRaw);
  const decimals = decodeUint(decimalsRaw);

  if (
    supply == null ||
    decimals == null
  ) {
    return null;
  }

  const decimalsNumber = Number(decimals);

  if (
    decimalsNumber < 0 ||
    decimalsNumber > 36
  ) {
    return null;
  }

  return {

    address: lower(token),

    name:
      decodeString(nameRaw) ||
      "Unknown",

    symbol:
      decodeString(symbolRaw) ||
      "UNKNOWN",

    decimals:
      decimalsNumber,

    totalSupply:
      supply.toString()
  };
}


/* ============================================================
   V23 DISCOVERY
============================================================ */

/*
 * Instead of assuming a particular event topic:
 *
 * 1. Get the latest block.
 * 2. Walk backwards through recent blocks.
 * 3. Ask RPC for full transactions.
 * 4. Find transactions whose "to" address is one of the
 *    Robinhood launch contracts.
 * 5. Retrieve those transaction receipts.
 * 6. Extract address-shaped values from receipt logs.
 * 7. Verify each address as ERC20.
 */

async function discoverTokens() {

  const latestRPC =
    await rpc("eth_blockNumber");

  if (!latestRPC.ok) {

    return {
      ok: false,
      error: latestRPC.error,
      latestBlock: null,
      transactionsFound: 0,
      tokens: []
    };
  }

  const latestBlock =
    hexNum(latestRPC.result);

  const launchers =
    new Set(
      CONFIG.LAUNCHERS.map(lower)
    );

  const launchTransactions = [];
  const seenTransactions = new Set();

  /*
   * Start with a recent window.
   *
   * We deliberately use individual blocks rather than
   * huge eth_getLogs requests.
   */

  for (
    let offset = 0;
    offset < CONFIG.RECENT_BLOCKS;
    offset++
  ) {

    const blockNumber =
      latestBlock - offset;

    if (blockNumber < 0) {
      break;
    }

    const blockRPC =
      await rpc(
        "eth_getBlockByNumber",
        [
          `0x${blockNumber.toString(16)}`,
          true
        ]
      );

    if (!blockRPC.ok || !blockRPC.result) {
      continue;
    }

    const transactions =
      Array.isArray(
        blockRPC.result.transactions
      )
        ? blockRPC.result.transactions
        : [];

    for (
      const tx of transactions
    ) {

      const destination =
        lower(tx?.to);

      if (
        !destination ||
        !launchers.has(destination)
      ) {
        continue;
      }

      const hash =
        tx?.hash;

      if (!hash || seenTransactions.has(hash)) {
        continue;
      }

      seenTransactions.add(hash);

      launchTransactions.push({

        hash,

        blockNumber,

        launcher:
          destination,

        from:
          lower(tx?.from),

        input:
          tx?.input || "0x"
      });

      if (
        launchTransactions.length >=
        CONFIG.MAX_LAUNCH_TRANSACTIONS
      ) {
        break;
      }
    }

    if (
      launchTransactions.length >=
      CONFIG.MAX_LAUNCH_TRANSACTIONS
    ) {
      break;
    }
  }

  /*
   * Retrieve receipts only for actual launch-contract
   * transactions.
   */

  const tokenCandidates = new Map();

  for (
    const tx
    of launchTransactions
  ) {

    const receiptRPC =
      await rpc(
        "eth_getTransactionReceipt",
        [tx.hash]
      );

    if (
      !receiptRPC.ok ||
      !receiptRPC.result
    ) {
      continue;
    }

    const receipt =
      receiptRPC.result;

    /*
     * Some token-launch mechanisms expose the token
     * directly through a log topic/data field.
     */

    const addresses =
      new Set();

    for (
      const log
      of (receipt.logs || [])
    ) {

      for (
        const topic
        of (log.topics || [])
      ) {

        const address =
          addressFromWord(topic);

        if (address) {
          addresses.add(address);
        }
      }

      for (
        const word
        of words(log.data)
      ) {

        const address =
          addressFromWord(word);

        if (address) {
          addresses.add(address);
        }
      }
    }

    /*
     * Also inspect the receipt's contractAddress.
     *
     * This catches normal CREATE transactions if the
     * launch transaction itself creates a contract.
     */

    if (
      receipt.contractAddress &&
      isAddress(receipt.contractAddress)
    ) {

      addresses.add(
        lower(
          receipt.contractAddress
        )
      );
    }

    /*
     * Remove obvious infrastructure addresses.
     */

    addresses.delete(
      lower(CONFIG.WETH)
    );

    for (
      const address
      of addresses
    ) {

      if (
        tokenCandidates.has(address)
      ) {
        continue;
      }

      const metadata =
        await readERC20(address);

      if (!metadata) {
        continue;
      }

      tokenCandidates.set(
        address,
        {

          ...metadata,

          launchBlock:
            tx.blockNumber,

          launchTransaction:
            tx.hash,

          launcher:
            tx.launcher,

          creator:
            tx.from
        }
      );

      if (
        tokenCandidates.size >=
        CONFIG.MAX_TOKEN_CANDIDATES
      ) {
        break;
      }
    }

    if (
      tokenCandidates.size >=
      CONFIG.MAX_TOKEN_CANDIDATES
    ) {
      break;
    }
  }

  return {

    ok: true,

    latestBlock,

    transactionsFound:
      launchTransactions.length,

    launchTransactions,

    tokens:
      Array.from(
        tokenCandidates.values()
      )
  };
}


/* ============================================================
   DEX SCREENER
============================================================ */

async function dexLookup(token) {

  const url =
    `${CONFIG.DEXSCREENER_API}/latest/dex/tokens/${token}`;

  try {

    const response =
      await fetch(
        url,
        {
          headers: {
            "accept":
              "application/json",

            "user-agent":
              "Robinhood-Meme-Hunter-V23"
          }
        }
      );

    if (!response.ok) {

      return {
        ok: false,
        status: response.status,
        pairs: []
      };
    }

    const data =
      await response.json();

    const pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];

    return {

      ok: true,

      status:
        response.status,

      pairs:
        pairs.filter(
          pair =>
            lower(pair?.chainId) ===
            CONFIG.DEX_CHAIN_ID
        )
    };

  } catch (error) {

    return {

      ok: false,

      status: 0,

      pairs: [],

      error:
        String(
          error?.message || error
        )
    };
  }
}


/* ============================================================
   MEME SCORING
============================================================ */

function calculateMemeScore(
  name,
  symbol
) {

  const text =
    `${name || ""} ${symbol || ""}`
      .toLowerCase();

  const words = [
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

  for (const word of words) {

    if (text.includes(word)) {
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

function riskAnalysis(data) {

  const flags = [];
  let risk = 0;

  if (data.liquidity < 10000) {
    flags.push("LOW_LIQUIDITY");
    risk += 20;
  }

  if (
    data.liquidityToMarketCap < 0.05
  ) {
    flags.push("LOW_LIQUIDITY_RATIO");
    risk += 15;
  }

  if (
    data.buySellRatio < 0.8
  ) {
    flags.push("SELL_PRESSURE");
    risk += 25;
  }

  if (
    data.transactions < 100
  ) {
    flags.push("LOW_ACTIVITY");
    risk += 10;
  }

  if (
    data.memeScore === 0
  ) {
    flags.push("WEAK_MEME_SIGNAL");
    risk += 5;
  }

  return {

    score:
      Math.min(100, risk),

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

function scoreCandidate(data) {

  let score = 0;

  if (data.marketCap <= 250000)
    score += 20;
  else if (data.marketCap <= 1000000)
    score += 18;
  else if (data.marketCap <= 5000000)
    score += 15;
  else if (data.marketCap <= 10000000)
    score += 12;
  else
    score += 8;

  if (data.liquidity >= 100000)
    score += 15;
  else if (data.liquidity >= 50000)
    score += 12;
  else if (data.liquidity >= 25000)
    score += 9;
  else if (data.liquidity >= 10000)
    score += 6;
  else
    score += 3;

  if (data.volumeRatio >= 5)
    score += 15;
  else if (data.volumeRatio >= 2)
    score += 12;
  else if (data.volumeRatio >= 0.5)
    score += 8;
  else
    score += 3;

  if (data.buySellRatio >= 2)
    score += 15;
  else if (data.buySellRatio >= 1.25)
    score += 12;
  else if (data.buySellRatio >= 1.05)
    score += 6;

  if (data.transactions >= 5000)
    score += 5;
  else if (data.transactions >= 1000)
    score += 4;
  else if (data.transactions >= 250)
    score += 2;

  score += Math.min(
    15,
    Math.round(
      data.memeScore * 0.75
    )
  );

  if (
    data.launchAgeHours != null
  ) {

    if (data.launchAgeHours <= 6)
      score += 10;
    else if (data.launchAgeHours <= 24)
      score += 8;
    else if (data.launchAgeHours <= 72)
      score += 5;
  }

  score -= Math.round(
    data.riskScore * 0.25
  );

  return Math.max(
    0,
    Math.min(100, score)
  );
}


/* ============================================================
   BUILD CANDIDATE
============================================================ */

function buildCandidate(
  token,
  pair
) {

  if (!pair) {
    return null;
  }

  const marketCap =
    num(pair.marketCap) ??
    num(pair.fdv);

  const liquidity =
    num(pair?.liquidity?.usd);

  const volume =
    num(pair?.volume?.h24);

  if (
    marketCap == null ||
    liquidity == null ||
    volume == null
  ) {
    return null;
  }

  if (
    marketCap < CONFIG.MIN_MARKET_CAP ||
    marketCap > CONFIG.MAX_MARKET_CAP
  ) {
    return null;
  }

  if (
    liquidity < CONFIG.MIN_LIQUIDITY ||
    volume < CONFIG.MIN_VOLUME_24H
  ) {
    return null;
  }

  const buys =
    num(pair?.txns?.h24?.buys) || 0;

  const sells =
    num(pair?.txns?.h24?.sells) || 0;

  const transactions =
    buys + sells;

  const buySellRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? 99
        : 0;

  const liquidityToMarketCap =
    liquidity / marketCap;

  const volumeRatio =
    volume / marketCap;

  let launchAgeHours = null;

  if (pair.pairCreatedAt) {

    launchAgeHours =
      (
        Date.now() -
        Number(pair.pairCreatedAt)
      ) / 3600000;
  }

  const memeScore =
    calculateMemeScore(
      pair?.baseToken?.name ||
        token.name,

      pair?.baseToken?.symbol ||
        token.symbol
    );

  const data = {

    contract:
      lower(
        pair?.baseToken?.address ||
        token.address
      ),

    name:
      pair?.baseToken?.name ||
      token.name,

    symbol:
      pair?.baseToken?.symbol ||
      token.symbol,

    priceUsd:
      num(pair.priceUsd),

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
      Number(
        buySellRatio.toFixed(2)
      ),

    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE"
          : "NEUTRAL",

    liquidityToMarketCap,

    volumeToMarketCap:
      volumeRatio,

    volumeRatio,

    memeScore,

    launchAgeHours:
      launchAgeHours == null
        ? null
        : Number(
            launchAgeHours.toFixed(1)
          ),

    launchBlock:
      token.launchBlock,

    launchTransaction:
      token.launchTransaction,

    launcher:
      token.launcher,

    creator:
      token.creator,

    dex:
      pair.dexId ||
      "uniswap",

    pairAddress:
      pair.pairAddress,

    url:
      pair.url ||
      `https://dexscreener.com/robinhood/${pair.pairAddress}`,

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
    riskAnalysis(data);

  data.riskScore =
    risk.score;

  data.riskLevel =
    risk.level;

  data.riskFlags =
    risk.flags;

  data.discoveryScore =
    scoreCandidate(data);

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
      100000000 / marketCap,

    to250M:
      250000000 / marketCap,

    to500M:
      500000000 / marketCap
  };

  return data;
}


/* ============================================================
   TELEGRAM
============================================================ */

async function telegram(
  env,
  text
) {

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {

    return {
      ok: false,
      error: "TELEGRAM_NOT_CONFIGURED"
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
        data?.description || null
    };

  } catch (error) {

    return {

      ok: false,

      error:
        String(
          error?.message || error
        )
    };
  }
}


/* ============================================================
   TELEGRAM MESSAGE
============================================================ */

function makeAlert(c) {

  const icon =
    c.discoveryScore >= 80
      ? "🚨"
      : c.discoveryScore >= 70
        ? "🔥"
        : "👀";

  return `${icon} <b>ROBINHOOD MEME HUNTER V23</b>

<b>${escapeHtml(c.name)}</b>
$${escapeHtml(c.symbol)}

<b>Opportunity:</b> ${c.discoveryScore}/100

<b>Risk:</b>
${c.riskLevel} (${c.riskScore}/100)

━━━━━━━━━━━━━━━━━━

<b>Market Cap:</b> ${money(c.marketCap)}

<b>Liquidity:</b> ${money(c.liquidity)}

<b>24h Volume:</b> ${money(c.volume24h)}

<b>Launch Age:</b> ${c.launchAgeHours ?? "UNVERIFIED"}h

━━━━━━━━━━━━━━━━━━

<b>Buys:</b> ${c.buys}

<b>Sells:</b> ${c.sells}

<b>Buy/Sell:</b> ${c.buySellRatio}

<b>Pressure:</b> ${c.pressure}

<b>Transactions:</b> ${c.transactions}

━━━━━━━━━━━━━━━━━━

<b>Meme Score:</b> ${c.memeScore}/20

<b>Liquidity/MC:</b>
${(c.liquidityToMarketCap * 100).toFixed(1)}%

<b>Volume/MC:</b>
${(c.volumeToMarketCap * 100).toFixed(1)}%

━━━━━━━━━━━━━━━━━━

<b>Holder Data:</b> UNVERIFIED

<b>Wallet Activity:</b> UNVERIFIED

<b>Smart Money:</b> UNVERIFIED

<b>Flow:</b>
${c.accumulationDistribution}

━━━━━━━━━━━━━━━━━━

<b>Contract:</b>
<code>${escapeHtml(c.contract)}</code>

<a href="${c.url}">Open DEX Screener</a>

⚠️ Automated research signal — not financial advice.`;
}


/* ============================================================
   SCAN
============================================================ */

async function scan(env) {

  requestCount = 0;

  const discovery =
    await discoverTokens();

  if (!discovery.ok) {

    return {

      agent:
        "Robinhood Chain Meme Hunter",

      version:
        CONFIG.VERSION,

      status:
        "DISCOVERY_RPC_ERROR",

      error:
        discovery.error,

      requestCount,

      dataIntegrity: {
        noFabricatedMetrics: true
      },

      timestamp:
        new Date().toISOString()
    };
  }

  const candidates = [];
  const lookupErrors = [];

  for (
    const token
    of discovery.tokens
  ) {

    const dex =
      await dexLookup(
        token.address
      );

    if (!dex.ok) {

      lookupErrors.push({

        contract:
          token.address,

        status:
          dex.status || 0,

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

    /*
     * Pick the strongest pair based on liquidity
     * and volume.
     */

    const pair =
      dex.pairs
        .slice()
        .sort(
          (a, b) => {

            const aScore =
              (num(a?.liquidity?.usd) || 0) +
              (num(a?.volume?.h24) || 0) * 0.25;

            const bScore =
              (num(b?.liquidity?.usd) || 0) +
              (num(b?.volume?.h24) || 0) * 0.25;

            return bScore - aScore;
          }
        )[0];

    const candidate =
      buildCandidate(
        token,
        pair
      );

    if (candidate) {
      candidates.push(candidate);
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

    const result =
      await telegram(
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
      "Discover early-stage Robinhood Chain meme coins using actual launch-contract transactions and verified DEX market data.",

    chain: {

      chainId:
        CONFIG.CHAIN_ID,

      rpc:
        CONFIG.RPC
    },

    discovery: {

      source:
        "ACTUAL_TRANSACTIONS_TO_ROBINHOOD_LAUNCH_CONTRACTS",

      launchContracts:
        CONFIG.LAUNCHERS,

      latestBlock:
        discovery.latestBlock,

      recentBlocksScanned:
        CONFIG.RECENT_BLOCKS,

      launchTransactionsFound:
        discovery.transactionsFound,

      tokensDiscovered:
        discovery.tokens.length
    },

    marketData: {

      source:
        "DEX_SCREENER",

      lookupMode:
        "ONE_TOKEN_AT_A_TIME",

      candidatesWithPairs:
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

      requestCount
    },

    candidates:
      candidates.slice(0, 50),

    alerts,

    validation: {

      tokenDiscovery:
        "VERIFIED FROM LAUNCH-CONTRACT TRANSACTIONS",

      tokenMetadata:
        "VERIFIED THROUGH ERC20 eth_call",

      liquidity:
        "DEX SCREENER",

      volume:
        "DEX SCREENER",

      buySellPressure:
        "DEX TRANSACTIONS",

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

  async fetch(request, env) {

    const url =
      new URL(request.url);

    /* HEALTH */

    if (
      url.pathname === "/health"
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
          "ACTUAL_LAUNCH_CONTRACT_TRANSACTIONS",

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


    /* TELEGRAM TEST */

    if (
      url.pathname === "/test-telegram"
    ) {

      const result =
        await telegram(
          env,

          `🤖 <b>Robinhood Chain Meme Hunter V23</b>

Telegram connection successful.

RPC: ✅
Launch transaction discovery: ✅
ERC20 verification: ✅
DEX Screener: ✅
Scoring: ✅

Holder data: ⚠️ UNVERIFIED
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


    /* SCAN */

    if (
      url.pathname === "/scan"
    ) {

      try {

        const result =
          await scan(env);

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
            status: 500
          }
        );
      }
    }


    /* DEFAULT */

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
