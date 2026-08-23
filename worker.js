const VERSION = "V46";

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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    try {
      if (
        url.pathname === "/" ||
        url.pathname === "/health"
      ) {
        return json({
          agent: "Robinhood Chain Meme Hunter",
          version: VERSION,
          status: "ONLINE",
          routes: [
            "/health",
            "/scan",
            "/test-telegram",
          ],
          chain: {
            name: CHAIN_NAME,
            chainId: CHAIN_ID,
            rpc: env.ALCHEMY_API_KEY
              ? "ALCHEMY_ROBINHOOD_MAINNET"
              : "MISSING_ALCHEMY_API_KEY",
          },
          discovery:
            "ALCHEMY_ON_CHAIN_FIRST_V46",
          discoveryContracts:
            DISCOVERY_CONTRACTS,
          alchemyConfigured:
            !!env.ALCHEMY_API_KEY,
          telegram: {
            configured: !!(
              env.TELEGRAM_BOT_TOKEN &&
              env.TELEGRAM_CHAT_ID
            ),
            automaticCalls: true,
            minimumScore: 60,
          },
          alchemyMaxLogRange:
            MAX_LOG_RANGE,
          architecture:
            "V46_API_KEY_TO_RPC_URL",
          timestamp:
            new Date().toISOString(),
        });
      }

      if (url.pathname === "/scan") {
        return json(await scan(env));
      }

      if (
        url.pathname === "/test-telegram"
      ) {
        return json(
          await testTelegram(env)
        );
      }

      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",
          version: VERSION,
          error: "NOT_FOUND",
          routes: [
            "/health",
            "/scan",
            "/test-telegram",
          ],
        },
        404
      );
    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",
          version: VERSION,
          success: false,
          error:
            String(
              error?.message || error
            ),
          timestamp:
            new Date().toISOString(),
        },
        500
      );
    }
  },
};

/* ============================================================
   RPC URL
   ============================================================ */

function getRpcUrl(env) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY secret is missing"
    );
  }

  /*
    Official Alchemy Robinhood Mainnet endpoint:
    https://robinhood-mainnet.g.alchemy.com/v2/API_KEY
  */

  return (
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    encodeURIComponent(
      env.ALCHEMY_API_KEY.trim()
    )
  );
}

/* ============================================================
   MAIN SCAN
   ============================================================ */

async function scan(env) {
  if (!env.ALCHEMY_API_KEY) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      success: false,
      error:
        "ALCHEMY_API_KEY secret is missing",
      timestamp:
        new Date().toISOString(),
    };
  }

  const latestHex = await rpc(
    env,
    "eth_blockNumber",
    []
  );

  const latestBlock =
    parseInt(latestHex, 16);

  /*
    Alchemy Free tier:
    keep every eth_getLogs request
    to a maximum 10-block range.
  */

  const endBlock = latestBlock;
  const startBlock =
    Math.max(
      0,
      endBlock -
        (MAX_LOG_RANGE - 1)
    );

  const allLogs = [];
  const contractResults = [];
  const diagnostics = [];

  for (
    const contract of DISCOVERY_CONTRACTS
  ) {
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
          discoveryContract:
            contract,
        });
      }
    } catch (error) {
      contractResults.push({
        contract,
        success: false,
        rawLogs: 0,
        error:
          String(
            error?.message || error
          ),
      });

      diagnostics.push({
        method: "eth_getLogs",
        contract,
        error:
          String(
            error?.message || error
          ),
      });
    }
  }

  /*
    Extract addresses from both:
      - topics
      - event data
      - emitting contract
  */

  const addressMap = new Map();

  for (const log of allLogs) {
    const addresses =
      extractAddressesFromLog(log);

    for (const address of addresses) {
      if (
        !isPlausibleContractAddress(
          address
        )
      ) {
        continue;
      }

      const key =
        address.toLowerCase();

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

      const item =
        addressMap.get(key);

      item.occurrences++;

      if (log.discoveryContract) {
        item.contracts.add(
          log.discoveryContract
        );
      }

      if (log.transactionHash) {
        item.transactions.add(
          log.transactionHash
        );
      }

      if (log.blockNumber) {
        item.blocks.add(
          parseInt(
            log.blockNumber,
            16
          )
        );
      }

      if (Array.isArray(log.topics)) {
        for (
          const topic of log.topics
        ) {
          item.topics.add(topic);
        }
      }
    }
  }

  const rawAddresses =
    [...addressMap.values()]
      .sort(
        (a, b) =>
          b.occurrences -
          a.occurrences
      );

  /*
    Keep RPC usage controlled.
  */

  const validationLimit = 12;
  const validationResults = [];

  for (
    const candidate of rawAddresses.slice(
      0,
      validationLimit
    )
  ) {
    const result =
      await validateERC20(
        env,
        candidate.address
      );

    validationResults.push({
      ...candidateForJson(
        candidate
      ),
      ...result,
    });
  }

  const validTokens =
    validationResults.filter(
      x => x.validERC20 === true
    );

  const candidates = [];

  for (const token of validTokens) {
    const score =
      preliminaryScore(token);

    if (score >= 60) {
      candidates.push({
        ...token,
        score,

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        holders:
          "UNVERIFIED",

        volume:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        accumulationDistribution:
          "UNVERIFIED",
      });
    }
  }

  let telegramResult = {
    sent: false,
    reason:
      "NO_QUALIFYING_CANDIDATE",
  };

  if (candidates.length > 0) {
    telegramResult =
      await sendCandidates(
        env,
        candidates
      );
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version: VERSION,

    success: true,

    scan: {
      status: "OK",
      success: true,

      latestBlock,

      startBlock,
      endBlock,

      blocksScanned:
        endBlock -
        startBlock +
        1,

      rawLogs:
        allLogs.length,

      decodedLogCandidates:
        allLogs.length,

      contractResults,

      rawAddressesFound:
        rawAddresses.length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validTokens.length,

      validationResults,

      candidates,

      telegram:
        telegramResult,

      rpcProvider:
        "ALCHEMY",

      rpcArchitecture:
        "API_KEY_TO_ROBINHOOD_RPC",

      rpcBreakdown: {
        eth_blockNumber: 1,
        eth_getLogs:
          contractResults.filter(
            x => x.success
          ).length,
        eth_call:
          validationResults.length *
          4,
      },

      discovery:
        "ALCHEMY_ON_CHAIN_FIRST_V46",

      diagnostics,

      chain: {
        name: CHAIN_NAME,
        chainId: CHAIN_ID,
      },

      contracts: {
        entryContracts:
          ENTRY_CONTRACTS,
        launchpads:
          LAUNCHPADS,
        poolManager:
          POOL_MANAGER,
      },

      telegramThreshold: 60,

      kvRequired: false,
      kvConfigured: false,

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
          "UNVERIFIED",

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        volume:
          "UNVERIFIED",
      },

      timestamp:
        new Date().toISOString(),
    },

    timestamp:
      new Date().toISOString(),
  };
}

/* ============================================================
   RPC
   ============================================================ */

async function rpc(
  env,
  method,
  params
) {
  const rpcUrl =
    getRpcUrl(env);

  const response =
    await fetch(
      rpcUrl,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method,
          params,
        }),
      }
    );

  const text =
    await response.text();

  let data;

  try {
    data =
      JSON.parse(text);
  } catch {
    throw new Error(
      `ALCHEMY_NON_JSON_HTTP_${response.status}`
    );
  }

  if (
    !response.ok ||
    data.error
  ) {
    throw new Error(
      data?.error?.message ||
        `ALCHEMY_HTTP_${response.status}`
    );
  }

  return data.result;
}

/* ============================================================
   LOGS
   ============================================================ */

async function getLogs(
  env,
  address,
  fromBlock,
  toBlock
) {
  return await rpc(
    env,
    "eth_getLogs",
    [
      {
        address,

        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          toBlock.toString(16),
      },
    ]
  );
}

/* ============================================================
   ADDRESS EXTRACTION
   ============================================================ */

function extractAddressesFromLog(
  log
) {
  const found =
    new Set();

  if (
    Array.isArray(
      log.topics
    )
  ) {
    for (
      const topic of log.topics
    ) {
      extractAddressesFromHex(
        topic,
        found
      );
    }
  }

  if (
    typeof log.data ===
    "string"
  ) {
    extractAddressesFromHex(
      log.data,
      found
    );
  }

  if (log.address) {
    found.add(
      normalizeAddress(
        log.address
      )
    );
  }

  return [...found];
}

function extractAddressesFromHex(
  hex,
  set
) {
  if (
    typeof hex !==
      "string" ||
    !hex.startsWith("0x")
  ) {
    return;
  }

  const clean =
    hex.slice(2);

  /*
    Scan ABI 32-byte words.
  */

  for (
    let i = 0;
    i + 64 <=
    clean.length;
    i += 64
  ) {
    const word =
      clean.slice(
        i,
        i + 64
      );

    const possible =
      "0x" +
      word.slice(24);

    if (
      isPlausibleAddress(
        possible
      )
    ) {
      set.add(
        possible.toLowerCase()
      );
    }
  }
}

function isPlausibleAddress(
  address
) {
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(
      address
    )
  ) {
    return false;
  }

  const lower =
    address.toLowerCase();

  if (lower === ZERO) {
    return false;
  }

  return true;
}

function isPlausibleContractAddress(
  address
) {
  if (
    !isPlausibleAddress(
      address
    )
  ) {
    return false;
  }

  const lower =
    address.toLowerCase();

  const excluded =
    DISCOVERY_CONTRACTS.map(
      x => x.toLowerCase()
    );

  if (
    excluded.includes(lower)
  ) {
    return false;
  }

  return true;
}

function normalizeAddress(
  address
) {
  return address.toLowerCase();
}

/* ============================================================
   ERC-20 VALIDATION
   ============================================================ */

async function validateERC20(
  env,
  address
) {
  const result = {
    validERC20: false,
    name: null,
    symbol: null,
    decimals: null,
    totalSupply: null,
    calls: [],
  };

  try {
    const value =
      await ethCall(
        env,
        address,
        "0x06fdde03"
      );

    result.calls.push(
      "name"
    );

    result.name =
      decodeString(value);
  } catch {
    result.calls.push(
      "name_failed"
    );
  }

  try {
    const value =
      await ethCall(
        env,
        address,
        "0x95d89b41"
      );

    result.calls.push(
      "symbol"
    );

    result.symbol =
      decodeString(value);
  } catch {
    result.calls.push(
      "symbol_failed"
    );
  }

  try {
    const value =
      await ethCall(
        env,
        address,
        "0x313ce567"
      );

    result.calls.push(
      "decimals"
    );

    if (
      typeof value ===
        "string" &&
      value.startsWith("0x")
    ) {
      const decimals =
        parseInt(
          value,
          16
        );

      if (
        Number.isFinite(
          decimals
        ) &&
        decimals <= 255
      ) {
        result.decimals =
          decimals;
      }
    }
  } catch {
    result.calls.push(
      "decimals_failed"
    );
  }

  try {
    const value =
      await ethCall(
        env,
        address,
        "0x18160ddd"
      );

    result.calls.push(
      "totalSupply"
    );

    if (
      typeof value ===
        "string" &&
      value.startsWith("0x")
    ) {
      result.totalSupply =
        BigInt(
          value
        ).toString();
    }
  } catch {
    result.calls.push(
      "totalSupply_failed"
    );
  }

  let signals = 0;

  if (result.name)
    signals++;

  if (result.symbol)
    signals++;

  if (
    result.decimals !== null
  )
    signals++;

  if (
    result.totalSupply !== null
  )
    signals++;

  result.validERC20 =
    signals >= 2;

  return result;
}

async function ethCall(
  env,
  to,
  data
) {
  return await rpc(
    env,
    "eth_call",
    [
      {
        to,
        data,
      },
      "latest",
    ]
  );
}

/* ============================================================
   STRING DECODING
   ============================================================ */

function decodeString(
  hex
) {
  if (
    typeof hex !==
      "string" ||
    !hex.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    hex.slice(2);

  if (
    clean.length < 64
  ) {
    return null;
  }

  try {
    const offset =
      parseInt(
        clean.slice(
          0,
          64
        ),
        16
      );

    if (
      !Number.isFinite(
        offset
      )
    ) {
      return decodeBytes32String(
        clean
      );
    }

    const lengthPosition =
      offset * 2;

    if (
      lengthPosition +
        64 >
      clean.length
    ) {
      return decodeBytes32String(
        clean
      );
    }

    const length =
      parseInt(
        clean.slice(
          lengthPosition,
          lengthPosition +
            64
        ),
        16
      );

    if (
      !Number.isFinite(
        length
      ) ||
      length < 0 ||
      length > 256
    ) {
      return decodeBytes32String(
        clean
      );
    }

    const start =
      lengthPosition +
      64;

    const end =
      start +
      length * 2;

    if (
      end >
      clean.length
    ) {
      return decodeBytes32String(
        clean
      );
    }

    return hexToAscii(
      clean.slice(
        start,
        end
      )
    );
  } catch {
    return null;
  }
}

function decodeBytes32String(
  clean
) {
  if (
    clean.length < 64
  ) {
    return null;
  }

  return hexToAscii(
    clean.slice(
      0,
      64
    )
  );
}

function hexToAscii(
  hex
) {
  let output = "";

  for (
    let i = 0;
    i + 2 <=
    hex.length;
    i += 2
  ) {
    const value =
      parseInt(
        hex.slice(
          i,
          i + 2
        ),
        16
      );

    if (value === 0)
      break;

    if (
      value >= 32 &&
      value <= 126
    ) {
      output +=
        String.fromCharCode(
          value
        );
    }
  }

  return (
    output.trim() ||
    null
  );
}

/* ============================================================
   SCORE
   ============================================================ */

function preliminaryScore(
  token
) {
  let score = 0;

  if (
    token.validERC20
  ) {
    score += 30;
  }

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
      reason:
        "TELEGRAM_NOT_CONFIGURED",
    };
  }

  const lines = [
    "🚨 Robinhood Chain Meme Hunter",
    "",
    `V${VERSION.replace(
      "V",
      ""
    )} qualifying candidate`,
    "",
  ];

  for (
    const token of candidates.slice(
      0,
      5
    )
  ) {
    lines.push(
      `🪙 ${
        token.name ||
        "Unknown"
      } (${
        token.symbol ||
        "?"
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
        token.decimals ??
        "UNVERIFIED"
      }`
    );

    lines.push("");
  }

  lines.push(
    "⚠️ Market cap, liquidity, holders and smart-money metrics are UNVERIFIED."
  );

  const response =
    await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          chat_id:
            env.TELEGRAM_CHAT_ID,
          text:
            lines.join("\n"),
        }),
      }
    );

  const data =
    await response.json();

  if (
    !response.ok ||
    !data.ok
  ) {
    return {
      sent: false,
      reason:
        data?.description ||
        `TELEGRAM_HTTP_${response.status}`,
    };
  }

  return {
    sent: true,
    messageId:
      data.result?.message_id ??
      null,
  };
}

/* ============================================================
   TELEGRAM TEST
   ============================================================ */

async function testTelegram(
  env
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      agent:
        "Robinhood Chain Meme Hunter",
      version: VERSION,
      success: false,
      response: {
        sent: false,
        reason:
          "TELEGRAM_NOT_CONFIGURED",
      },
    };
  }

  const response =
    await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",

        headers: {
          "content-type":
            "application/json",
        },

        body: JSON.stringify({
          chat_id:
            env.TELEGRAM_CHAT_ID,

          text:
            `✅ Robinhood Chain Meme Hunter ${VERSION} Telegram test`,
        }),
      }
    );

  const data =
    await response.json();

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version: VERSION,

    success:
      !!data.ok,

    response: data.ok
      ? {
          sent: true,
          messageId:
            data.result?.message_id ??
            null,
        }
      : {
          sent: false,
          reason:
            data.description ||
            `TELEGRAM_HTTP_${response.status}`,
        },

    timestamp:
      new Date().toISOString(),
  };
}

/* ============================================================
   SERIALIZATION
   ============================================================ */

function candidateForJson(
  item
) {
  return {
    address:
      item.address,

    occurrences:
      item.occurrences,

    contracts:
      [...item.contracts],

    transactions:
      [...item.transactions],

    blocks:
      [...item.blocks],

    topics:
      [...item.topics],
  };
}

function json(
  data,
  status = 200
) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,

      headers: {
        "content-type":
          "application/json; charset=utf-8",

        "cache-control":
          "no-store",
      },
    }
  );
}
