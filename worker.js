const VERSION = "V45";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9",
];

const LAUNCHPADS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491",
];

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  POOL_MANAGER,
];

const ZERO =
  "0x0000000000000000000000000000000000000000";

const MAX_LOG_RANGE = 10;

/*
  V45 OBJECTIVE

  1. Read the latest Robinhood Chain block.
  2. Respect Alchemy Free-tier 10-block eth_getLogs limit.
  3. Scan each discovery contract.
  4. Extract addresses from BOTH indexed topics and event data.
  5. Remove obvious non-address values.
  6. Validate candidates as ERC-20 contracts.
  7. Read name/symbol/decimals/totalSupply where possible.
  8. Return detailed diagnostics so we can identify the correct
     token-creation event structure.
*/

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (url.pathname === "/" || url.pathname === "/health") {
        return json({
          agent: "Robinhood Chain Meme Hunter",
          version: VERSION,
          status: "ONLINE",
          routes: ["/health", "/scan", "/test-telegram"],
          chain: {
            name: CHAIN_NAME,
            chainId: CHAIN_ID,
            rpc: env.ALCHEMY_RPC_URL
              ? "ALCHEMY_ROBINHOOD_MAINNET"
              : "MISSING_ALCHEMY_RPC",
          },
          discovery: "ALCHEMY_ON_CHAIN_FIRST_V45",
          discoveryContracts: DISCOVERY_CONTRACTS,
          alchemyConfigured: !!env.ALCHEMY_RPC_URL,
          telegram: {
            configured: !!(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),
            automaticCalls: true,
            minimumScore: 60,
          },
          alchemyMaxLogRange: MAX_LOG_RANGE,
          architecture: "V45_EVENT_ADDRESS_DIAGNOSTIC",
          timestamp: new Date().toISOString(),
        });
      }

      if (url.pathname === "/scan") {
        return json(await scan(env));
      }

      if (url.pathname === "/test-telegram") {
        return json(await testTelegram(env));
      }

      return json(
        {
          agent: "Robinhood Chain Meme Hunter",
          version: VERSION,
          error: "NOT_FOUND",
          routes: ["/health", "/scan", "/test-telegram"],
        },
        404
      );
    } catch (error) {
      return json(
        {
          agent: "Robinhood Chain Meme Hunter",
          version: VERSION,
          success: false,
          error: String(error?.message || error),
          timestamp: new Date().toISOString(),
        },
        500
      );
    }
  },
};

/* ============================================================
   MAIN SCAN
   ============================================================ */

async function scan(env) {
  if (!env.ALCHEMY_RPC_URL) {
    return {
      agent: "Robinhood Chain Meme Hunter",
      version: VERSION,
      success: false,
      error: "ALCHEMY_RPC_URL secret is missing",
      timestamp: new Date().toISOString(),
    };
  }

  const latestHex = await rpc(env, "eth_blockNumber", []);
  const latestBlock = parseInt(latestHex, 16);

  /*
    Start with exactly 10 blocks.

    This is deliberate because Alchemy Free currently limits
    eth_getLogs block ranges to 10 blocks.
  */
  const endBlock = latestBlock;
  const startBlock = Math.max(0, endBlock - 9);

  const allLogs = [];
  const contractResults = [];
  const diagnostics = [];

  for (const contract of DISCOVERY_CONTRACTS) {
    try {
      const logs = await getLogs(
        env,
        contract,
        startBlock,
        endBlock
      );

      contractResults.push({
        contract,
        success: true,
        rawLogs: logs.length,
      });

      for (const log of logs) {
        allLogs.push({
          ...log,
          discoveryContract: contract,
        });
      }
    } catch (error) {
      contractResults.push({
        contract,
        success: false,
        rawLogs: 0,
        error: String(error?.message || error),
      });

      diagnostics.push({
        method: "eth_getLogs",
        contract,
        error: String(error?.message || error),
      });
    }
  }

  /*
    Extract addresses from logs.

    We deliberately inspect:
      - topics
      - data
      - indexed values
      - 32-byte ABI words

    This is the main V45 improvement.
  */

  const addressMap = new Map();

  for (const log of allLogs) {
    const addresses = extractAddressesFromLog(log);

    for (const address of addresses) {
      if (!isPlausibleContractAddress(address)) continue;

      const key = address.toLowerCase();

      if (!addressMap.has(key)) {
        addressMap.set(key, {
          address,
          occurrences: 0,
          contracts: new Set(),
          transactions: new Set(),
          blocks: new Set(),
          topics: new Set(),
        });
      }

      const item = addressMap.get(key);

      item.occurrences++;

      if (log.discoveryContract) {
        item.contracts.add(log.discoveryContract);
      }

      if (log.transactionHash) {
        item.transactions.add(log.transactionHash);
      }

      if (log.blockNumber) {
        item.blocks.add(parseInt(log.blockNumber, 16));
      }

      if (Array.isArray(log.topics)) {
        for (const topic of log.topics) {
          item.topics.add(topic);
        }
      }
    }
  }

  const rawAddresses = [...addressMap.values()]
    .sort((a, b) => b.occurrences - a.occurrences);

  /*
    Remove obvious system addresses and validate only a limited
    number so the worker stays within RPC limits.
  */

  const validationLimit = 12;

  const validationResults = [];

  for (
    const candidate of rawAddresses.slice(0, validationLimit)
  ) {
    const result = await validateERC20(
      env,
      candidate.address
    );

    validationResults.push({
      ...candidateForJson(candidate),
      ...result,
    });
  }

  const validTokens = validationResults.filter(
    x => x.validERC20 === true
  );

  /*
    No fabricated market metrics.

    Market cap, liquidity, holder count and smart-money data
    remain UNVERIFIED until we have confirmed market sources.
  */

  const candidates = [];

  for (const token of validTokens) {
    const score = preliminaryScore(token);

    if (score >= 60) {
      candidates.push({
        ...token,
        score,
        marketCap: "UNVERIFIED",
        liquidity: "UNVERIFIED",
        holders: "UNVERIFIED",
        volume: "UNVERIFIED",
        smartMoney: "UNVERIFIED",
        accumulationDistribution: "UNVERIFIED",
      });
    }
  }

  let telegramResult = {
    sent: false,
    reason: "NO_QUALIFYING_CANDIDATE",
  };

  if (candidates.length > 0) {
    telegramResult = await sendCandidates(
      env,
      candidates
    );
  }

  return {
    agent: "Robinhood Chain Meme Hunter",
    version: VERSION,
    success: true,

    scan: {
      status: "OK",
      success: true,

      latestBlock,

      startBlock,
      endBlock,
      blocksScanned: endBlock - startBlock + 1,

      rawLogs: allLogs.length,

      contractResults,

      rawAddressesFound: rawAddresses.length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validTokens.length,

      validationResults,

      candidates,

      telegram: telegramResult,

      rpcProvider: "ALCHEMY",

      rpcArchitecture: "10_BLOCK_WINDOW",

      discovery:
        "ALCHEMY_ON_CHAIN_FIRST_V45_EVENT_ADDRESS_DIAGNOSTIC",

      diagnostics,

      chain: {
        name: CHAIN_NAME,
        chainId: CHAIN_ID,
      },

      contracts: {
        entryContracts: ENTRY_CONTRACTS,
        launchpads: LAUNCHPADS,
        poolManager: POOL_MANAGER,
      },

      telegramThreshold: 60,

      kvRequired: false,
      kvConfigured: false,

      dataIntegrity: {
        noFabricatedMetrics: true,
        holderConcentration: "UNVERIFIED",
        smartMoney: "UNVERIFIED",
        walletActivity: "UNVERIFIED",
        accumulationDistribution: "UNVERIFIED",
        marketCap: "UNVERIFIED",
        liquidity: "UNVERIFIED",
        volume: "UNVERIFIED",
      },

      timestamp: new Date().toISOString(),
    },

    timestamp: new Date().toISOString(),
  };
}

/* ============================================================
   ALCHEMY RPC
   ============================================================ */

async function rpc(env, method, params) {
  const response = await fetch(env.ALCHEMY_RPC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(
      `ALCHEMY_NON_JSON_HTTP_${response.status}`
    );
  }

  if (!response.ok || data.error) {
    throw new Error(
      data?.error?.message ||
        `ALCHEMY_HTTP_${response.status}`
    );
  }

  return data.result;
}

/* ============================================================
   LOG DISCOVERY
   ============================================================ */

async function getLogs(
  env,
  address,
  fromBlock,
  toBlock
) {
  return await rpc(env, "eth_getLogs", [
    {
      address,
      fromBlock: "0x" + fromBlock.toString(16),
      toBlock: "0x" + toBlock.toString(16),
    },
  ]);
}

/* ============================================================
   ADDRESS EXTRACTION
   ============================================================ */

function extractAddressesFromLog(log) {
  const found = new Set();

  /*
    Indexed event parameters live inside topics.
  */

  if (Array.isArray(log.topics)) {
    for (const topic of log.topics) {
      extractAddressesFromHex(topic, found);
    }
  }

  /*
    Non-indexed event parameters live inside data.
  */

  if (typeof log.data === "string") {
    extractAddressesFromHex(log.data, found);
  }

  /*
    Also include the emitting contract itself.
  */

  if (log.address) {
    found.add(normalizeAddress(log.address));
  }

  return [...found];
}

function extractAddressesFromHex(hex, set) {
  if (
    typeof hex !== "string" ||
    !hex.startsWith("0x")
  ) {
    return;
  }

  const clean = hex.slice(2);

  /*
    ABI words are 64 hex characters.

    Scan every 32-byte word and inspect its final
    20 bytes as a possible address.
  */

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    const word = clean.slice(i, i + 64);

    const possible =
      "0x" + word.slice(24);

    if (isPlausibleAddress(possible)) {
      set.add(possible.toLowerCase());
    }
  }

  /*
    Also inspect any aligned 20-byte sequence where useful.
  */

  for (
    let i = 0;
    i + 40 <= clean.length;
    i += 64
  ) {
    const possible =
      "0x" + clean.slice(i, i + 40);

    if (isPlausibleAddress(possible)) {
      set.add(possible.toLowerCase());
    }
  }
}

function isPlausibleAddress(address) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return false;
  }

  const lower = address.toLowerCase();

  if (lower === ZERO) {
    return false;
  }

  /*
    Ignore values that are clearly ABI integers rather
    than normal addresses.
  */

  const hex = lower.slice(2);

  if (
    /^0+$/.test(hex.slice(0, 24)) &&
    /^0+$/.test(hex.slice(24, 40))
  ) {
    return false;
  }

  return true;
}

function isPlausibleContractAddress(address) {
  if (!isPlausibleAddress(address)) {
    return false;
  }

  const lower = address.toLowerCase();

  if (
    DISCOVERY_CONTRACTS
      .map(x => x.toLowerCase())
      .includes(lower)
  ) {
    return false;
  }

  return true;
}

function normalizeAddress(address) {
  return address.toLowerCase();
}

/* ============================================================
   ERC-20 VALIDATION
   ============================================================ */

async function validateERC20(env, address) {
  const result = {
    validERC20: false,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    calls: [],
  };

  try {
    const nameHex = await ethCall(
      env,
      address,
      "0x06fdde03"
    );

    result.calls.push("name");
    result.name = decodeString(nameHex);
  } catch {
    result.calls.push("name_failed");
  }

  try {
    const symbolHex = await ethCall(
      env,
      address,
      "0x95d89b41"
    );

    result.calls.push("symbol");
    result.symbol = decodeString(symbolHex);
  } catch {
    result.calls.push("symbol_failed");
  }

  try {
    const decimalsHex = await ethCall(
      env,
      address,
      "0x313ce567"
    );

    result.calls.push("decimals");

    if (
      typeof decimalsHex === "string" &&
      decimalsHex.startsWith("0x")
    ) {
      result.decimals = parseInt(
        decimalsHex,
        16
      );

      if (
        !Number.isFinite(result.decimals) ||
        result.decimals > 255
      ) {
        result.decimals = null;
      }
    }
  } catch {
    result.calls.push("decimals_failed");
  }

  try {
    const supplyHex = await ethCall(
      env,
      address,
      "0x18160ddd"
    );

    result.calls.push("totalSupply");

    if (
      typeof supplyHex === "string" &&
      supplyHex.startsWith("0x")
    ) {
      result.totalSupply =
        BigInt(supplyHex).toString();
    }
  } catch {
    result.calls.push("totalSupply_failed");
  }

  /*
    Require at least two meaningful ERC-20 signals.

    This prevents arbitrary addresses from becoming tokens.
  */

  let signals = 0;

  if (result.name) signals++;
  if (result.symbol) signals++;
  if (result.decimals !== null) signals++;
  if (result.totalSupply !== null) signals++;

  result.validERC20 = signals >= 2;

  return result;
}

async function ethCall(
  env,
  to,
  data
) {
  return await rpc(env, "eth_call", [
    {
      to,
      data,
    },
    "latest",
  ]);
}

/* ============================================================
   ABI STRING DECODER
   ============================================================ */

function decodeString(hex) {
  if (
    typeof hex !== "string" ||
    !hex.startsWith("0x")
  ) {
    return null;
  }

  const clean = hex.slice(2);

  if (!clean || clean.length < 64) {
    return null;
  }

  try {
    /*
      Dynamic ABI string:

      offset
      length
      bytes
    */

    const offset = parseInt(
      clean.slice(0, 64),
      16
    );

    if (
      !Number.isFinite(offset) ||
      offset < 0 ||
      offset * 2 + 64 > clean.length
    ) {
      return decodeBytes32String(clean);
    }

    const lengthPosition =
      offset * 2;

    const length = parseInt(
      clean.slice(
        lengthPosition,
        lengthPosition + 64
      ),
      16
    );

    if (
      !Number.isFinite(length) ||
      length < 0 ||
      length > 256
    ) {
      return decodeBytes32String(clean);
    }

    const start =
      lengthPosition + 64;

    const end =
      start + length * 2;

    if (end > clean.length) {
      return decodeBytes32String(clean);
    }

    return hexToAscii(
      clean.slice(start, end)
    );
  } catch {
    return null;
  }
}

function decodeBytes32String(clean) {
  if (clean.length < 64) {
    return null;
  }

  try {
    return hexToAscii(
      clean.slice(0, 64)
    );
  } catch {
    return null;
  }
}

function hexToAscii(hex) {
  let output = "";

  for (
    let i = 0;
    i + 2 <= hex.length;
    i += 2
  ) {
    const value = parseInt(
      hex.slice(i, i + 2),
      16
    );

    if (value === 0) break;

    if (
      value >= 32 &&
      value <= 126
    ) {
      output += String.fromCharCode(value);
    }
  }

  return output.trim() || null;
}

/* ============================================================
   PRELIMINARY SCORE
   ============================================================ */

function preliminaryScore(token) {
  let score = 0;

  if (token.validERC20) score += 30;

  if (
    token.symbol &&
    token.symbol.length >= 1 &&
    token.symbol.length <= 20
  ) {
    score += 10;
  }

  if (
    token.name &&
    token.name.length >= 2 &&
    token.name.length <= 100
  ) {
    score += 10;
  }

  if (
    token.decimals !== null &&
    token.decimals >= 0 &&
    token.decimals <= 18
  ) {
    score += 10;
  }

  /*
    Do NOT fabricate market, holder or smart-money
    points. Those remain unverified.
  */

  return score;
}

/* ============================================================
   TELEGRAM
   ============================================================ */

async function sendCandidates(
  env,
  candidates
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason: "TELEGRAM_NOT_CONFIGURED",
    };
  }

  const lines = [
    "🚨 Robinhood Chain Meme Hunter",
    "",
    `V${VERSION.replace("V", "")} qualifying candidate`,
    "",
  ];

  for (const token of candidates.slice(0, 5)) {
    lines.push(
      `🪙 ${token.name || "Unknown"} (${
        token.symbol || "?"
      })`
    );

    lines.push(
      `Contract: ${token.address}`
    );

    lines.push(
      `Score: ${token.score}/100`
    );

    lines.push(
      `Decimals: ${
        token.decimals ?? "UNVERIFIED"
      }`
    );

    lines.push("");
  }

  lines.push(
    "⚠️ Market cap, liquidity, holders and smart-money metrics are UNVERIFIED."
  );

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: lines.join("\n"),
      }),
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    return {
      sent: false,
      reason:
        data?.description ||
        `TELEGRAM_HTTP_${response.status}`,
    };
  }

  return {
    sent: true,
    messageId: data.result?.message_id ?? null,
  };
}

async function testTelegram(env) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      agent: "Robinhood Chain Meme Hunter",
      version: VERSION,
      success: false,
      response: {
        sent: false,
        reason: "TELEGRAM_NOT_CONFIGURED",
      },
    };
  }

  const response = await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text:
          `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test`,
      }),
    }
  );

  const data = await response.json();

  return {
    agent: "Robinhood Chain Meme Hunter",
    version: VERSION,
    success: !!data.ok,
    response: data.ok
      ? {
          sent: true,
          messageId:
            data.result?.message_id ?? null,
        }
      : {
          sent: false,
          reason:
            data.description ||
            `TELEGRAM_HTTP_${response.status}`,
        },
    timestamp: new Date().toISOString(),
  };
}

/* ============================================================
   JSON / SERIALIZATION
   ============================================================ */

function candidateForJson(item) {
  return {
    address: item.address,
    occurrences: item.occurrences,
    contracts: [...item.contracts],
    transactions: [...item.transactions],
    blocks: [...item.blocks],
    topics: [...item.topics],
  };
}

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
}
