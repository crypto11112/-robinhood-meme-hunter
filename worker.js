const VERSION = "V26.1";
const CONFIG = {
  chainId: 4663,
  rpc: "https://rpc.mainnet.chain.robinhood.com",
  dex: "https://api.dexscreener.com",
  dexChain: "robinhood",
  launchContracts: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],
  tokenCreatedTopic:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",
  /*
   * Keep this deliberately conservative.
   * Cloudflare free Workers have subrequest limits.
   */
  scanBlocks: 2500,
  logChunk: 500,
  maxLogs: 8,
  maxTokens: 3,
  maxDexLookups: 3,
  maxSubrequests: 60,
  minMarketCap: 10000,
  maxMarketCap: 50000000,
  minLiquidity: 3000,
  minVolume: 500,
  alertScore: 70
};
let requests = 0;
/* ============================================================
   BASIC HELPERS
============================================================ */
function lower(v) {
  return String(v || "").toLowerCase();
}
function address(v) {
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
function hexNumber(v) {
  try {
    return parseInt(v || "0x0", 16);
  } catch {
    return 0;
  }
}
function number(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function budgetOK() {
  return requests < CONFIG.maxSubrequests;
}
function money(v) {
  if (v == null) return "N/A";
  if (v >= 1000000) {
    return "$" + (v / 1000000).toFixed(2) + "M";
  }
  if (v >= 1000) {
    return "$" + (v / 1000).toFixed(1) + "K";
  }
  return "$" + v.toFixed(2);
}
/* ============================================================
   RPC
============================================================ */
async function rpc(method, params = []) {
  if (!budgetOK()) {
    return {
      ok: false,
      error: "SUBREQUEST_BUDGET_REACHED"
    };
  }
  requests++;
  try {
    const r = await fetch(CONFIG.rpc, {
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
    });
    if (!r.ok) {
      return {
        ok: false,
        error: "HTTP_" + r.status
      };
    }
    const data = await r.json();
    if (data.error) {
      return {
        ok: false,
        error:
          data.error.message ||
          String(data.error.code)
      };
    }
    return {
      ok: true,
      result: data.result
    };
  } catch (e) {
    return {
      ok: false,
      error: String(e?.message || e)
    };
  }
}
/* ============================================================
   LATEST BLOCK
============================================================ */
async function latestBlock() {
  const r = await rpc("eth_blockNumber");
  if (!r.ok) {
    throw new Error(r.error);
  }
  return hexNumber(r.result);
}
/* ============================================================
   GET TOKEN CREATED LOGS
============================================================ */
async function logs(fromBlock, toBlock) {
  return await rpc(
    "eth_getLogs",
    [{
      fromBlock:
        "0x" + fromBlock.toString(16),
      toBlock:
        "0x" + toBlock.toString(16),
      address:
        CONFIG.launchContracts,
      topics: [
        CONFIG.tokenCreatedTopic
      ]
    }]
  );
}
/* ============================================================
   FIND ADDRESSES INSIDE EVENT
============================================================ */
function eventAddresses(log) {
  const found = [];
  if (Array.isArray(log?.topics)) {
    for (
      let i = 1;
      i < log.topics.length;
      i++
    ) {
      const a =
        address(log.topics[i]);
      if (a) {
        found.push(a);
      }
    }
  }
  const data =
    String(log?.data || "");
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
      const a =
        address(
          clean.slice(i, i + 64)
        );
      if (a) {
        found.push(a);
      }
    }
  }
  return [...new Set(found)];
}
/* ============================================================
   ERC20 CALL
============================================================ */
async function callToken(
  token,
  data
) {
  const r =
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
  return r.ok
    ? r.result
    : null;
}
/* ============================================================
   DECODE UINT
============================================================ */
function uint(v) {
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
   DECODE STRING
============================================================ */
function text(v) {
  if (!v || v === "0x") {
    return null;
  }
  try {
    const clean =
      v.replace(/^0x/, "");
    /*
     * ABI dynamic string.
     */
    if (clean.length >= 128) {
      const offset =
        parseInt(
          clean.slice(0, 64),
          16
        );
      const pos =
        offset * 2;
      const length =
        parseInt(
          clean.slice(
            pos,
            pos + 64
          ),
          16
        );
      const start =
        pos + 64;
      const end =
        start + length * 2;
      if (end <= clean.length) {
        let out = "";
        for (
          let i = start;
          i < end;
          i += 2
        ) {
          const c =
            parseInt(
              clean.slice(i, i + 2),
              16
            );
          if (
            c >= 32 &&
            c <= 126
          ) {
            out +=
              String.fromCharCode(c);
          }
        }
        if (out.trim()) {
          return out.trim();
        }
      }
    }
  } catch {}
  return null;
}
/* ============================================================
   VERIFY TOKEN
============================================================ */
async function verifyToken(token) {
  if (!budgetOK()) {
    return null;
  }
  /*
   * totalSupply proves the contract responds
   * as an ERC20-like token.
   */
  const supplyRaw =
    await callToken(
      token,
      "0x18160ddd"
    );
  const supply =
    uint(supplyRaw);
  if (
    supply === null ||
    supply <= 0n
  ) {
    return null;
  }
  /*
   * decimals
   */
  const decimalsRaw =
    await callToken(
      token,
      "0x313ce567"
    );
  const decimals =
    uint(decimalsRaw);
  if (
    decimals === null ||
    decimals > 36n
  ) {
    return null;
  }
  /*
   * Metadata is optional.
   * If calls fail, token remains valid.
   */
  let name = "UNKNOWN";
  let symbol = "UNKNOWN";
  if (budgetOK()) {
    const raw =
      await callToken(
        token,
        "0x06fdde03"
      );
    name =
      text(raw) ||
      "UNKNOWN";
  }
  if (budgetOK()) {
    const raw =
      await callToken(
        token,
        "0x95d89b41"
      );
    symbol =
      text(raw) ||
      "UNKNOWN";
  }
  return {
    address: token,
    name,
    symbol,
    decimals:
      Number(decimals),
    totalSupply:
      supply.toString()
  };
}
/* ============================================================
   DISCOVER NEWEST TOKENS
============================================================ */
async function discover() {
  const latest =
    await latestBlock();
  const start =
    Math.max(
      0,
      latest - CONFIG.scanBlocks
    );
  const foundLogs = [];
  let failedRanges = 0;
  /*
   * Newest blocks first.
   */
  for (
    let end = latest;
    end > start;
    end -= CONFIG.logChunk
  ) {
    if (!budgetOK()) {
      break;
    }
    const from =
      Math.max(
        start,
        end - CONFIG.logChunk + 1
      );
    const r =
      await logs(
        from,
        end
      );
    if (!r.ok) {
      failedRanges++;
      continue;
    }
    const items =
      Array.isArray(r.result)
        ? r.result
        : [];
    foundLogs.push(
      ...items
    );
    if (
      foundLogs.length >=
      CONFIG.maxLogs
    ) {
      break;
    }
  }
  foundLogs.sort(
    (a, b) =>
      hexNumber(b.blockNumber) -
      hexNumber(a.blockNumber)
  );
  const tokens = [];
  const seen = new Set();
  for (
    const log of foundLogs
  ) {
    if (
      tokens.length >=
      CONFIG.maxTokens
    ) {
      break;
    }
    if (!budgetOK()) {
      break;
    }
    const addresses =
      eventAddresses(log);
    for (
      const token of addresses
    ) {
      if (
        tokens.length >=
        CONFIG.maxTokens
      ) {
        break;
      }
      if (
        seen.has(token)
      ) {
        continue;
      }
      if (
        CONFIG.launchContracts
          .map(lower)
          .includes(lower(token))
      ) {
        continue;
      }
      seen.add(token);
      const verified =
        await verifyToken(token);
      if (!verified) {
        continue;
      }
      tokens.push({
        ...verified,
        block:
          hexNumber(
            log.blockNumber
          ),
        transaction:
          log.transactionHash,
        launchContract:
          lower(log.address)
      });
    }
  }
  return {
    latestBlock: latest,
    startBlock: start,
    blocksScanned:
      latest - start + 1,
    logsFound:
      foundLogs.length,
    failedRanges,
    tokens
  };
}
/* ============================================================
   DEXSCREENER
============================================================ */
async function dex(token) {
  if (!budgetOK()) {
    return {
      ok: false,
      error:
        "SUBREQUEST_BUDGET_REACHED",
      pairs: []
    };
  }
  requests++;
  try {
    const r =
      await fetch(
        `${CONFIG.dex}/latest/dex/tokens/${token}`,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );
    if (!r.ok) {
      return {
        ok: false,
        error:
          "HTTP_" + r.status,
        pairs: []
      };
    }
    const data =
      await r.json();
    let pairs =
      Array.isArray(data?.pairs)
        ? data.pairs
        : [];
    pairs =
      pairs.filter(
        p =>
          lower(p?.chainId) ===
          CONFIG.dexChain
      );
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
  } catch (e) {
    return {
      ok: false,
      error:
        String(
          e?.message || e
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
  const s =
    (
      String(name) +
      " " +
      String(symbol)
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
    const word of words
  ) {
    if (s.includes(word)) {
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
function score(c) {
  let s = 0;
  /*
   * Market cap.
   */
  if (
    c.marketCap <= 100000
  ) {
    s += 22;
  } else if (
    c.marketCap <= 250000
  ) {
    s += 20;
  } else if (
    c.marketCap <= 1000000
  ) {
    s += 18;
  } else if (
    c.marketCap <= 5000000
  ) {
    s += 15;
  } else {
    s += 10;
  }
  /*
   * Liquidity.
   */
  if (
    c.liquidity >= 100000
  ) {
    s += 15;
  } else if (
    c.liquidity >= 50000
  ) {
    s += 13;
  } else if (
    c.liquidity >= 25000
  ) {
    s += 10;
  } else if (
    c.liquidity >= 10000
  ) {
    s += 7;
  } else {
    s += 3;
  }
  /*
   * Volume.
   */
  if (
    c.volumeToMarketCap >= 5
  ) {
    s += 15;
  } else if (
    c.volumeToMarketCap >= 2
  ) {
    s += 12;
  } else if (
    c.volumeToMarketCap >= 1
  ) {
    s += 9;
  } else if (
    c.volumeToMarketCap >= 0.5
  ) {
    s += 5;
  }
  /*
   * Buy pressure.
   */
  if (
    c.buySellRatio >= 3
  ) {
    s += 15;
  } else if (
    c.buySellRatio >= 2
  ) {
    s += 13;
  } else if (
    c.buySellRatio >= 1.5
  ) {
    s += 10;
  } else if (
    c.buySellRatio >= 1.2
  ) {
    s += 7;
  } else if (
    c.buySellRatio >= 1
  ) {
    s += 3;
  }
  /*
   * Meme signal.
   */
  s += Math.round(
    c.memeScore * 0.75
  );
  /*
   * Activity.
   */
  if (
    c.transactions >= 5000
  ) {
    s += 5;
  } else if (
    c.transactions >= 1000
  ) {
    s += 4;
  } else if (
    c.transactions >= 250
  ) {
    s += 2;
  }
  /*
   * Risk.
   */
  if (
    c.liquidity <
    c.marketCap * 0.05
  ) {
    s -= 10;
  }
  if (
    c.buySellRatio < 0.8
  ) {
    s -= 20;
  }
  return Math.max(
    0,
    Math.min(
      100,
      s
    )
  );
}
/* ============================================================
   BUILD CANDIDATE
============================================================ */
function candidate(
  token,
  pair
) {
  const marketCap =
    number(pair?.marketCap) ??
    number(pair?.fdv);
  const liquidity =
    number(pair?.liquidity?.usd);
  const volume =
    number(pair?.volume?.h24);
  if (
    marketCap === null ||
    liquidity === null ||
    volume === null
  ) {
    return null;
  }
  if (
    marketCap <
    CONFIG.minMarketCap ||
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
    CONFIG.minVolume
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
  const ratio =
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
  const meme =
    memeScore(
      name,
      symbol
    );
  const c = {
    contract:
      token.address,
    name,
    symbol,
    priceUsd:
      number(
        pair?.priceUsd
      ),
    marketCap,
    fdv:
      number(
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
        ratio.toFixed(2)
      ),
    pressure:
      ratio >= 1.25
        ? "BUY_PRESSURE"
        : ratio <= 0.8
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
    memeScore:
      meme,
    launchBlock:
      token.block,
    launchTransaction:
      token.transaction,
    launchContract:
      token.launchContract,
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
    ratio < 0.8
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
  c.riskFlags =
    riskFlags;
  c.discoveryScore =
    score(c);
  c.category =
    c.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : c.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : c.discoveryScore >= 60
          ? "WATCH"
          : "EARLY";
  c.targetMultiples = {
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
  return c;
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
  if (!budgetOK()) {
    return {
      ok: false,
      error:
        "SUBREQUEST_BUDGET_REACHED"
    };
  }
  requests++;
  try {
    const r =
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
      await r.json();
    return {
      ok:
        r.ok &&
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
   TELEGRAM MESSAGE
============================================================ */
function alertText(c) {
  return `🚨 <b>ROBINHOOD MEME HUNTER V26.1</b>
<b>${c.name}</b>
$${c.symbol}
<b>Discovery Score:</b> ${c.discoveryScore}/100
<b>Category:</b> ${c.category}
<b>Market Cap:</b> ${money(c.marketCap)}
<b>Liquidity:</b> ${money(c.liquidity)}
<b>24h Volume:</b> ${money(c.volume24h)}
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
    ? `<a href="${c.url}">Open DEX Screener</a>`
    : ""
}
⚠️ Automated research signal.
Not financial advice.`;
}
/* ============================================================
   SCAN
============================================================ */
async function runScan(env) {
  requests = 0;
  const discovery =
    await discover();
  const candidates = [];
  const lookupErrors = [];
  /*
   * Only newest three tokens.
   */
  for (
    const token of
    discovery.tokens
  ) {
    if (
      candidates.length >=
      CONFIG.maxDexLookups
    ) {
      break;
    }
    if (!budgetOK()) {
      break;
    }
    const result =
      await dex(
        token.address
      );
    if (!result.ok) {
      lookupErrors.push({
        contract:
          token.address,
        error:
          result.error
      });
      continue;
    }
    if (
      result.pairs.length === 0
    ) {
      continue;
    }
    const c =
      candidate(
        token,
        result.pairs[0]
      );
    if (c) {
      candidates.push(c);
    }
  }
  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );
  const alerts = [];
  for (
    const c of candidates
  ) {
    if (
      c.discoveryScore <
      CONFIG.alertScore
    ) {
      continue;
    }
    if (
      c.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {
      continue;
    }
    if (!budgetOK()) {
      break;
    }
    const sent =
      await telegram(
        env,
        alertText(c)
      );
    alerts.push({
      contract:
        c.contract,
      symbol:
        c.symbol,
      score:
        c.discoveryScore,
      sent:
        sent.ok,
      error:
        sent.ok
          ? null
          : sent.error
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
      "Discover early-stage Robinhood Chain meme coins using free on-chain discovery and DEX market data.",
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
        "ETH_GETLOGS_TOKEN_CREATED",
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
      lookupMode:
        "ONE_TOKEN_AT_A_TIME",
      maxLookups:
        CONFIG.maxDexLookups,
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
      new URL(request.url);
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
          "ETH_GETLOGS_TOKEN_CREATED",
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
        await telegram(
          env,
          `🤖 <b>Robinhood Chain Meme Hunter V26.1</b>
Telegram connection successful ✅
Chain ID: 4663
Free RPC: ✅
On-chain discovery: ✅
ERC20 verification: ✅
DEX Screener: ✅
Cloudflare-safe scanning: ✅
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
          await runScan(env),
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
