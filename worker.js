const VERSION = "V37";
const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";
const RPC_URL =
  "https://rpc.mainnet.chain.robinhood.com";
const DEX_API =
  "https://api.dexscreener.com";
const TELEGRAM_MIN_SCORE = 60;
/*
 * Official pools.trade contracts.
 *
 * pools.trade has TWO entry contracts:
 * current + original.
 */
const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];
const LAUNCHPAD_CONTRACTS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491"
];
const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";
const ZERO =
  "0x0000000000000000000000000000000000000000";
/*
 * TokenCreated(address)
 */
const TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";
/*
 * TokenLaunched
 */
const TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";
/*
 * V37 intentionally does NOT repeatedly retry RPC.
 *
 * RPC is a confirmation/fallback source.
 * Discovery can continue through DEX Screener.
 */
const RPC_MAX_REQUESTS = 3;
const DEX_PROFILE_URL =
  `${DEX_API}/token-profiles/latest/v1`;
const DEX_BOOST_URL =
  `${DEX_API}/token-boosts/latest/v1`;
const DEX_PAIRS_URL =
  `${DEX_API}/latest/dex/tokens/`;
function responseJSON(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type":
          "application/json; charset=utf-8",
        "cache-control":
          "no-store"
      }
    }
  );
}
function address(value) {
  if (
    typeof value !== "string" ||
    !/^0x[a-fA-F0-9]{40}$/.test(value)
  ) {
    return null;
  }
  return value.toLowerCase();
}
function unique(values) {
  return [
    ...new Set(
      values
        .filter(Boolean)
        .map(
          value =>
            String(value).toLowerCase()
        )
    )
  ];
}
function shortAddress(value) {
  if (
    typeof value !== "string"
  ) {
    return "UNKNOWN";
  }
  return (
    value.slice(0, 6) +
    "..." +
    value.slice(-4)
  );
}
function money(value) {
  const n = Number(value);
  if (
    !Number.isFinite(n)
  ) {
    return "UNVERIFIED";
  }
  if (n >= 1000000) {
    return (
      "$" +
      (n / 1000000).toFixed(2) +
      "M"
    );
  }
  if (n >= 1000) {
    return (
      "$" +
      (n / 1000).toFixed(1) +
      "K"
    );
  }
  return (
    "$" +
    n.toFixed(2)
  );
}
/* ---------------------------------------------------------
   DEX SCREENER DISCOVERY
--------------------------------------------------------- */
async function dexFetch(url) {
  const response =
    await fetch(
      url,
      {
        method: "GET",
        headers: {
          "accept":
            "application/json"
        }
      }
    );
  const text =
    await response.text();
  if (!response.ok) {
    throw new Error(
      `DEX_HTTP_${response.status}`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "DEX_INVALID_JSON"
    );
  }
}
/*
 * DEX Screener's latest token profile feed
 * contains chainId and tokenAddress.
 *
 * Robinhood Chain is represented as:
 * chainId = "robinhood"
 */
async function discoverDexProfiles() {
  const data =
    await dexFetch(
      DEX_PROFILE_URL
    );
  const rows =
    Array.isArray(data)
      ? data
      : [];
  return rows
    .filter(
      row =>
        String(
          row?.chainId || ""
        ).toLowerCase() ===
        "robinhood"
    )
    .map(
      row => ({
        token:
          address(
            row?.tokenAddress
          ),
        url:
          row?.url || null,
        description:
          row?.description ||
          null,
        icon:
          row?.icon ||
          null,
        links:
          Array.isArray(
            row?.links
          )
            ? row.links
            : []
      })
    )
    .filter(
      row =>
        Boolean(row.token)
    );
}
/*
 * Boosts can reveal tokens that have
 * current promotional/trending activity.
 *
 * IMPORTANT:
 * A boost is NOT treated as proof of quality.
 */
async function discoverDexBoosts() {
  const data =
    await dexFetch(
      DEX_BOOST_URL
    );
  const rows =
    Array.isArray(data)
      ? data
      : [];
  return rows
    .filter(
      row =>
        String(
          row?.chainId || ""
        ).toLowerCase() ===
        "robinhood"
    )
    .map(
      row =>
        address(
          row?.tokenAddress
        )
    )
    .filter(Boolean);
}
/* ---------------------------------------------------------
   MARKET DATA
--------------------------------------------------------- */
async function getDexPairs(token) {
  return dexFetch(
    DEX_PAIRS_URL +
    token
  );
}
function selectBestPair(data) {
  const pairs =
    Array.isArray(
      data?.pairs
    )
      ? data.pairs
      : [];
  if (!pairs.length) {
    return null;
  }
  /*
   * Prefer Robinhood pairs.
   */
  const robinhood =
    pairs.filter(
      pair =>
        String(
          pair?.chainId || ""
        ).toLowerCase() ===
        "robinhood"
    );
  const usable =
    robinhood.length
      ? robinhood
      : pairs;
  return [
    ...usable
  ].sort(
    (a, b) =>
      Number(
        b?.liquidity?.usd || 0
      ) -
      Number(
        a?.liquidity?.usd || 0
      )
  )[0];
}
function analysePair(pair) {
  if (!pair) {
    return {
      found: false,
      verified: false
    };
  }
  const liquidity =
    Number(
      pair?.liquidity?.usd || 0
    );
  const volume =
    Number(
      pair?.volume?.h24 || 0
    );
  const buys =
    Number(
      pair?.txns?.h24?.buys || 0
    );
  const sells =
    Number(
      pair?.txns?.h24?.sells || 0
    );
  return {
    found: true,
    verified:
      String(
        pair?.chainId || ""
      ).toLowerCase() ===
      "robinhood",
    chainId:
      pair?.chainId ||
      null,
    dexId:
      pair?.dexId ||
      null,
    pairAddress:
      pair?.pairAddress ||
      null,
    url:
      pair?.url ||
      null,
    name:
      pair?.baseToken?.name ||
      null,
    symbol:
      pair?.baseToken?.symbol ||
      null,
    priceUsd:
      pair?.priceUsd ||
      null,
    marketCap:
      pair?.marketCap ||
      null,
    fdv:
      pair?.fdv ||
      null,
    liquidityUsd:
      liquidity,
    volume24h:
      volume,
    buys24h:
      buys,
    sells24h:
      sells,
    buySellRatio:
      sells > 0
        ? Number(
            (
              buys / sells
            ).toFixed(2)
          )
        : null
  };
}
/* ---------------------------------------------------------
   SCORING
--------------------------------------------------------- */
function scoreCandidate({
  market,
  profileFound,
  boostFound
}) {
  let score = 0;
  const reasons = [];
  /*
   * Confirmed Robinhood market.
   */
  if (
    market?.verified
  ) {
    score += 25;
    reasons.push(
      "Robinhood Chain market confirmed"
    );
  }
  /*
   * Liquidity.
   */
  const liquidity =
    Number(
      market?.liquidityUsd || 0
    );
  if (
    liquidity >= 1000
  ) {
    score += 5;
    reasons.push(
      "Liquidity above $1K"
    );
  }
  if (
    liquidity >= 5000
  ) {
    score += 5;
    reasons.push(
      "Liquidity above $5K"
    );
  }
  if (
    liquidity >= 10000
  ) {
    score += 5;
    reasons.push(
      "Liquidity above $10K"
    );
  }
  /*
   * Volume.
   */
  const volume =
    Number(
      market?.volume24h || 0
    );
  if (
    volume >= 1000
  ) {
    score += 5;
    reasons.push(
      "24h volume detected"
    );
  }
  if (
    volume >= 10000
  ) {
    score += 5;
    reasons.push(
      "Strong 24h volume"
    );
  }
  /*
   * Buy pressure.
   */
  const buys =
    Number(
      market?.buys24h || 0
    );
  const sells =
    Number(
      market?.sells24h || 0
    );
  if (
    buys > sells &&
    buys > 0
  ) {
    score += 10;
    reasons.push(
      "Buys currently exceed sells"
    );
  }
  /*
   * Profile presence.
   */
  if (
    profileFound
  ) {
    score += 5;
    reasons.push(
      "Token appears in current DEX discovery feed"
    );
  }
  /*
   * Boost presence.
   *
   * Only 5 points because boosts can be paid/promotional.
   */
  if (
    boostFound
  ) {
    score += 5;
    reasons.push(
      "Current DEX Screener boost detected"
    );
  }
  return {
    score:
      Math.min(
        score,
        100
      ),
    reasons
  };
}
/* ---------------------------------------------------------
   RPC FALLBACK / CONFIRMATION
--------------------------------------------------------- */
async function rpcCall(
  method,
  params
) {
  const response =
    await fetch(
      RPC_URL,
      {
        method: "POST",
        headers: {
          "content-type":
            "application/json"
        },
        body:
          JSON.stringify({
            jsonrpc:
              "2.0",
            id: 1,
            method,
            params
          })
      }
    );
  const text =
    await response.text();
  if (
    response.status === 429
  ) {
    throw new Error(
      "RPC_RATE_LIMITED"
    );
  }
  if (
    !response.ok
  ) {
    throw new Error(
      `RPC_HTTP_${response.status}`
    );
  }
  let result;
  try {
    result =
      JSON.parse(text);
  } catch {
    throw new Error(
      "RPC_INVALID_JSON"
    );
  }
  if (
    result?.error
  ) {
    throw new Error(
      result.error.message ||
      "RPC_ERROR"
    );
  }
  return result.result;
}
async function rpcLatestBlock() {
  return rpcCall(
    "eth_blockNumber",
    []
  );
}
/*
 * RPC confirmation is deliberately optional.
 *
 * If it gets rate limited, V37 keeps working.
 */
async function tryRpcConfirmation(
  token,
  diagnostics
) {
  try {
    const latestHex =
      await rpcLatestBlock();
    const latest =
      parseInt(
        latestHex,
        16
      );
    const from =
      Math.max(
        0,
        latest - 250
      );
    /*
     * Only confirm TokenCreated.
     */
    const logs =
      await rpcCall(
        "eth_getLogs",
        [{
          address:
            ENTRY_CONTRACTS,
          fromBlock:
            "0x" +
            from.toString(16),
          toBlock:
            latestHex,
          topics: [
            TOKEN_CREATED_TOPIC
          ]
        }]
      );
    const tokenLower =
      token.toLowerCase();
    const match =
      Array.isArray(logs)
        ? logs.find(
            log => {
              const topics =
                Array.isArray(
                  log?.topics
                )
                  ? log.topics
                  : [];
              const candidates =
                topics
                  .slice(1)
                  .map(
                    topic => {
                      if (
                        typeof topic !==
                        "string"
                      ) {
                        return null;
                      }
                      return address(
                        "0x" +
                        topic.slice(-40)
                      );
                    }
                  )
                  .filter(Boolean);
              return candidates.includes(
                tokenLower
              );
            }
          )
        : null;
    return {
      rpcAvailable:
        true,
      tokenCreated:
        Boolean(match),
      block:
        match?.blockNumber ||
        null,
      transactionHash:
        match?.transactionHash ||
        null
    };
  } catch (error) {
    diagnostics.push({
      source:
        "rpc",
      status:
        error.message
    });
    return {
      rpcAvailable:
        false,
      tokenCreated:
        false,
      reason:
        error.message
    };
  }
}
/* ---------------------------------------------------------
   TELEGRAM
--------------------------------------------------------- */
async function sendTelegram(
  env,
  text
) {
  if (
    !env.TELEGRAM_BOT_TOKEN
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
    };
  }
  if (
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_CHAT_ID_NOT_CONFIGURED"
    };
  }
  try {
    const url =
      "https://api.telegram.org/bot" +
      env.TELEGRAM_BOT_TOKEN +
      "/sendMessage";
    const response =
      await fetch(
        url,
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
              disable_web_page_preview:
                true
            })
        }
      );
    const data =
      await response.json();
    if (
      !response.ok ||
      !data?.ok
    ) {
      return {
        sent: false,
        reason:
          data?.description ||
          `TELEGRAM_HTTP_${response.status}`
      };
    }
    return {
      sent: true,
      messageId:
        data?.result?.message_id ||
        null
    };
  } catch (error) {
    return {
      sent: false,
      reason:
        error?.message ||
        "TELEGRAM_FETCH_ERROR"
    };
  }
}
function buildTelegramMessage(
  candidate
) {
  const market =
    candidate.market;
  const lines = [
    "🚨 ROBINHOOD MEME CALL — V37",
    "",
    `🔥 ${
      candidate.symbol
        ? "$" +
          candidate.symbol
        : "NEW ROBINHOOD TOKEN"
    }`,
    candidate.name
      ? candidate.name
      : "",
    "",
    `Hunter Score: ${candidate.score}/100`,
    "",
    "📍 CONTRACT",
    candidate.token,
    "",
    "📊 MARKET",
    `Liquidity: ${money(
      market.liquidityUsd
    )}`,
    `24h Volume: ${money(
      market.volume24h
    )}`,
    `Buys: ${
      market.buys24h ??
      "UNVERIFIED"
    }`,
    `Sells: ${
      market.sells24h ??
      "UNVERIFIED"
    }`,
    `Buy/Sell: ${
      market.buySellRatio ??
      "UNVERIFIED"
    }`,
    `Market Cap: ${money(
      market.marketCap
    )}`,
    `FDV: ${money(
      market.fdv
    )}`,
    "",
    "🎯 WHY IT TRIGGERED",
    ...candidate.reasons.map(
      reason =>
        "• " + reason
    ),
    "",
    "🔎 DATA STATUS",
    "Token: VERIFIED",
    `Robinhood market: ${
      market.verified
        ? "VERIFIED"
        : "UNVERIFIED"
    }`,
    "Holder concentration: UNVERIFIED",
    "Smart money: UNVERIFIED",
    "Wallet activity: UNVERIFIED",
    "",
    "⚠️ VERY EARLY / HIGH RISK",
    "Automated discovery alert. Not a guarantee of performance.",
    "",
    market.url
      ? `Chart: ${market.url}`
      : "",
    "",
    "#RobinhoodChain #MemeCoin #V37"
  ];
  return lines
    .filter(
      line =>
        line !== null &&
        line !== undefined
    )
    .join("\n")
    .slice(
      0,
      3900
    );
}
/* ---------------------------------------------------------
   MAIN SCAN
--------------------------------------------------------- */
async function runScan(env) {
  const diagnostics = [];
  let profiles = [];
  let boosts = [];
  /*
   * Discovery source #1.
   */
  try {
    profiles =
      await discoverDexProfiles();
  } catch (error) {
    diagnostics.push({
      source:
        "dex_profiles",
      error:
        error.message
    });
  }
  /*
   * Discovery source #2.
   */
  try {
    boosts =
      await discoverDexBoosts();
  } catch (error) {
    diagnostics.push({
      source:
        "dex_boosts",
      error:
        error.message
    });
  }
  const profileTokens =
    profiles.map(
      row =>
        row.token
    );
  const boostTokens =
    boosts;
  const discovered =
    unique([
      ...profileTokens,
      ...boostTokens
    ]);
  /*
   * Don't hammer DEX Screener.
   *
   * Only inspect the first 2 candidates
   * in each scan.
   */
  const tokensToInspect =
    discovered.slice(
      0,
      2
    );
  const candidates = [];
  for (
    const token of
      tokensToInspect
  ) {
    let pair = null;
    let market = {
      found: false,
      verified: false
    };
    try {
      const data =
        await getDexPairs(
          token
        );
      pair =
        selectBestPair(
          data
        );
      market =
        analysePair(
          pair
        );
    } catch (error) {
      diagnostics.push({
        source:
          "dex_pairs",
        token,
        error:
          error.message
      });
    }
    const profileFound =
      profileTokens.includes(
        token
      );
    const boostFound =
      boostTokens.includes(
        token
      );
    const scoring =
      scoreCandidate({
        market,
        profileFound,
        boostFound
      });
    /*
     * RPC confirmation is attempted only
     * for a promising candidate.
     *
     * It cannot kill the scan.
     */
    let rpc =
      {
        rpcAvailable:
          false,
        tokenCreated:
          false,
        reason:
          "NOT_ATTEMPTED"
      };
    if (
      scoring.score >= 45
    ) {
      rpc =
        await tryRpcConfirmation(
          token,
          diagnostics
        );
    }
    /*
     * RPC confirmation gives bonus points,
     * but is NOT required.
     */
    let finalScore =
      scoring.score;
    if (
      rpc.tokenCreated
    ) {
      finalScore =
        Math.min(
          100,
          finalScore + 10
        );
      scoring.reasons.push(
        "TokenCreated confirmed on Robinhood Chain"
      );
    }
    candidates.push({
      token,
      name:
        market.name ||
        null,
      symbol:
        market.symbol ||
        null,
      score:
        finalScore,
      reasons:
        scoring.reasons,
      market,
      discovery: {
        dexProfile:
          profileFound,
        dexBoost:
          boostFound
      },
      rpc,
      validation: {
        token:
          "VERIFIED",
        market:
          market.verified
            ? "VERIFIED"
            : "UNVERIFIED",
        liquidity:
          market.liquidityUsd !==
          undefined
            ? "DEXSCREENER"
            : "UNVERIFIED",
        holders:
          "UNVERIFIED",
        smartMoney:
          "UNVERIFIED",
        walletActivity:
          "UNVERIFIED",
        accumulationDistribution:
          "UNVERIFIED"
      }
    });
  }
  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );
  /*
   * A call requires:
   *
   * 1. Robinhood market
   * 2. Score >= 60
   *
   * This avoids Telegram spam from random
   * boosted tokens.
   */
  const qualifying =
    candidates.find(
      candidate =>
        candidate.market?.verified &&
        candidate.score >=
          TELEGRAM_MIN_SCORE
    );
  let telegram = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE"
  };
  if (
    qualifying
  ) {
    const message =
      buildTelegramMessage(
        qualifying
      );
    telegram =
      await sendTelegram(
        env,
        message
      );
    telegram.token =
      qualifying.token;
    telegram.score =
      qualifying.score;
  }
  return {
    status:
      "OK",
    discovery:
      "DEXSCREENER_ROBINHOOD",
    latestProfiles:
      profiles.length,
    latestBoosts:
      boosts.length,
    tokensDiscovered:
      discovered.length,
    tokensInspected:
      tokensToInspect.length,
    candidates,
    telegram,
    telegramThreshold:
      TELEGRAM_MIN_SCORE,
    rpc: {
      role:
        "OPTIONAL_CONFIRMATION",
      rateLimitDoesNotAbortScan:
        true,
      maxRequests:
        RPC_MAX_REQUESTS
    },
    dataIntegrity: {
      noFabricatedMetrics:
        true,
      holderConcentration:
        "UNVERIFIED",
      smartMoney:
        "UNVERIFIED",
      walletActivity:
        "UNVERIFIED",
      accumulationDistribution:
        "UNVERIFIED"
    },
    diagnostics,
    chain: {
      name:
        CHAIN_NAME,
      chainId:
        CHAIN_ID
    },
    poolsTrade: {
      entryContracts:
        ENTRY_CONTRACTS,
      launchpadContracts:
        LAUNCHPAD_CONTRACTS,
      poolManager:
        POOL_MANAGER
    },
    kvRequired:
      false,
    timestamp:
      new Date().toISOString()
  };
}
/* ---------------------------------------------------------
   WORKER
--------------------------------------------------------- */
export default {
  async fetch(
    request,
    env,
    ctx
  ) {
    const url =
      new URL(
        request.url
      );
    const path =
      url.pathname;
    /*
     * HEALTH
     */
    if (
      path === "/health"
    ) {
      return responseJSON({
        agent:
          "Robinhood Chain Meme Hunter",
        version:
          VERSION,
        status:
          "ONLINE",
        routes: [
          "/health",
          "/scan",
          "/test-telegram"
        ],
        chain: {
          name:
            CHAIN_NAME,
          chainId:
            CHAIN_ID,
          rpc:
            RPC_URL
        },
        discovery:
          "DEXSCREENER_ROBINHOOD_FIRST",
        rpcFallback:
          "OPTIONAL_RATE_LIMIT_SAFE",
        marketData:
          "DEX_SCREENER",
        telegram: {
          configured:
            Boolean(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),
          automaticCalls:
            true,
          minimumScore:
            TELEGRAM_MIN_SCORE
        },
        kvRequired:
          false,
        architecture:
          "V37_RPC_RESILIENT",
        timestamp:
          new Date().toISOString()
      });
    }
    /*
     * SCAN
     */
    if (
      path === "/scan"
    ) {
      const scan =
        await runScan(
          env
        );
      return responseJSON({
        agent:
          "Robinhood Chain Meme Hunter",
        version:
          VERSION,
        success:
          scan.status ===
          "OK",
        scan,
        timestamp:
          new Date().toISOString()
      });
    }
    /*
     * TELEGRAM TEST
     */
    if (
      path ===
      "/test-telegram"
    ) {
      const result =
        await sendTelegram(
          env,
          `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test\n\n${new Date().toISOString()}`
        );
      return responseJSON({
        agent:
          "Robinhood Chain Meme Hunter",
        version:
          VERSION,
        success:
          result.sent,
        response:
          result,
        timestamp:
          new Date().toISOString()
      });
    }
    return responseJSON({
      agent:
        "Robinhood Chain Meme Hunter",
      version:
        VERSION,
      status:
        "ONLINE",
      routes: [
        "/health",
        "/scan",
        "/test-telegram"
      ]
    });
  },
  /*
   * AUTOMATIC CRON
   *
   * Configure the Cron Trigger separately
   * in Cloudflare.
   */
  async scheduled(
    controller,
    env,
    ctx
  ) {
    ctx.waitUntil(
      runScan(env)
        .catch(
          error => {
            console.error(
              "V37 scheduled scan failed:",
              error
            );
          }
        )
    );
  }
};
