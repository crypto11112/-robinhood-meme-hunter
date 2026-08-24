const VERSION = "V55";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const POOL_MANAGER =
  "0x8366a39cc670b4001a1121b8f6a443a643e40951";

const ENTRY_CONTRACTS = [
  "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
  "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

const LAUNCHPADS = [
  "0x23f8209572b4a1c2ad88a42749e830791fb027f1",
  "0xad44d55e7f8337c3ce113fbb591486e85be104b2",
  "0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491",
  "0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2"
];

const MINT_FAST_LAUNCHPAD =
  "0xd61998ae9b29e1f19dfb70ba890bc85895c83f1b";

const ALL_DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD,
  POOL_MANAGER
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const TELEGRAM_THRESHOLD = 60;

/*
==================================================
V55 PERFORMANCE SETTINGS
==================================================
*/

const DISCOVERY_BLOCKS = 100;
const RPC_LOG_CHUNK = 10;
const RPC_TIMEOUT_MS = 3500;
const MAX_DISCOVERY_CONTRACTS = 7;
const MAX_CANDIDATES = 12;
const MAX_METADATA_CALLS = 12;
const MAX_ACTIVITY_CANDIDATES = 6;

const REQUEST_TIMEOUT_MS = 15000;

/*
==================================================
UTILITY
==================================================
*/

function json(data, status = 200) {
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

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    value || ""
  );
}

function isZeroAddress(address) {
  return (
    !address ||
    address.toLowerCase() ===
      ZERO_ADDRESS
  );
}

function validTokenCandidate(address) {
  return (
    isAddress(address) &&
    !isZeroAddress(address)
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function cleanTopicAddress(topic) {
  if (
    !topic ||
    typeof topic !== "string"
  ) {
    return null;
  }

  const clean = topic.startsWith("0x")
    ? topic.slice(2)
    : topic;

  if (clean.length !== 64) {
    return null;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    return null;
  }

  const address =
    "0x" + clean.slice(24);

  return validTokenCandidate(address)
    ? address.toLowerCase()
    : null;
}

function splitWords(data) {
  if (
    !data ||
    typeof data !== "string"
  ) {
    return [];
  }

  const clean = data.startsWith("0x")
    ? data.slice(2)
    : data;

  const words = [];

  for (
    let i = 0;
    i + 64 <= clean.length;
    i += 64
  ) {
    words.push(
      "0x" +
        clean.slice(i, i + 64)
    );
  }

  return words;
}

function blockHex(block) {
  return (
    "0x" +
    Number(block).toString(16)
  );
}

/*
==================================================
RPC WITH HARD TIMEOUT
==================================================
*/

async function rpc(
  env,
  method,
  params = [],
  timeoutMs = RPC_TIMEOUT_MS
) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY missing"
    );
  }

  const url =
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    env.ALCHEMY_API_KEY;

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeoutMs
    );

  try {
    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json"
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Date.now(),
            method,
            params
          }),
          signal:
            controller.signal
        }
      );

    if (!response.ok) {
      throw new Error(
        `Alchemy HTTP ${response.status}`
      );
    }

    const result =
      await response.json();

    if (result.error) {
      throw new Error(
        result.error.message ||
          "RPC error"
      );
    }

    return result.result;
  } finally {
    clearTimeout(timer);
  }
}

/*
==================================================
SAFE RPC
==================================================
*/

async function safeRpc(
  env,
  method,
  params = []
) {
  try {
    return {
      ok: true,
      result:
        await rpc(
          env,
          method,
          params
        )
    };
  } catch (error) {
    return {
      ok: false,
      result: null,
      error:
        error?.name ===
        "AbortError"
          ? "RPC_TIMEOUT"
          : error?.message ||
            String(error)
    };
  }
}

/*
==================================================
LATEST BLOCK
==================================================
*/

async function getLatestBlock(env) {
  const result =
    await safeRpc(
      env,
      "eth_blockNumber"
    );

  if (!result.ok) {
    throw new Error(
      result.error
    );
  }

  return Number(
    BigInt(result.result)
  );
}

/*
==================================================
CHUNKED LOG SCAN
==================================================
*/

async function getLogsChunked(
  env,
  filter,
  fromBlock,
  toBlock,
  chunkSize = RPC_LOG_CHUNK
) {
  const allLogs = [];
  const errors = [];

  for (
    let start = fromBlock;
    start <= toBlock;
    start += chunkSize
  ) {
    const end = Math.min(
      start + chunkSize - 1,
      toBlock
    );

    const chunkFilter = {
      ...filter,
      fromBlock:
        blockHex(start),
      toBlock:
        blockHex(end)
    };

    const result =
      await safeRpc(
        env,
        "eth_getLogs",
        [chunkFilter]
      );

    if (!result.ok) {
      errors.push({
        fromBlock: start,
        toBlock: end,
        error: result.error
      });

      continue;
    }

    if (
      Array.isArray(
        result.result
      )
    ) {
      allLogs.push(
        ...result.result
      );
    }
  }

  return {
    logs: allLogs,
    errors
  };
}

/*
==================================================
BROAD ADDRESS EXTRACTION
==================================================
*/

function extractAddresses(log) {
  const found = [];

  for (
    const topic of
      log?.topics || []
  ) {
    const address =
      cleanTopicAddress(
        topic
      );

    if (address) {
      found.push(address);
    }
  }

  for (
    const word of
      splitWords(
        log?.data
      )
  ) {
    const address =
      cleanTopicAddress(
        word
      );

    if (address) {
      found.push(address);
    }
  }

  return unique(found);
}

/*
==================================================
ERC20 METADATA
==================================================
*/

const SELECTORS = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd"
};

function decodeUint(result) {
  try {
    if (
      !result ||
      result === "0x"
    ) {
      return null;
    }

    return Number(
      BigInt(result)
    );
  } catch {
    return null;
  }
}

function decodeString(result) {
  if (
    !result ||
    result === "0x"
  ) {
    return null;
  }

  try {
    const hex =
      result.slice(2);

    /*
      Dynamic ABI string
    */

    if (
      hex.length >= 128
    ) {
      const offset =
        Number(
          BigInt(
            "0x" +
              hex.slice(0, 64)
          )
        );

      const pos =
        offset * 2;

      if (
        pos + 64 <=
        hex.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
                hex.slice(
                  pos,
                  pos + 64
                )
            )
          );

        const start =
          pos + 64;

        const end =
          start +
          length * 2;

        if (
          end <=
          hex.length
        ) {
          return decodeHexText(
            hex.slice(
              start,
              end
            )
          );
        }
      }
    }

    /*
      bytes32 fallback
    */

    return decodeHexText(
      hex.slice(0, 64)
    );
  } catch {
    return null;
  }
}

function decodeHexText(hex) {
  try {
    let output = "";

    for (
      let i = 0;
      i + 2 <= hex.length;
      i += 2
    ) {
      const n =
        parseInt(
          hex.slice(i, i + 2),
          16
        );

      if (
        n >= 32 &&
        n <= 126
      ) {
        output +=
          String.fromCharCode(n);
      }
    }

    return (
      output.trim() || null
    );
  } catch {
    return null;
  }
}

async function getERC20Metadata(
  env,
  address
) {
  if (
    !validTokenCandidate(address)
  ) {
    return {
      validERC20: false
    };
  }

  const calls = await Promise.all([
    safeRpc(
      env,
      "eth_call",
      [
        {
          to: address,
          data: SELECTORS.name
        },
        "latest"
      ]
    ),

    safeRpc(
      env,
      "eth_call",
      [
        {
          to: address,
          data: SELECTORS.symbol
        },
        "latest"
      ]
    ),

    safeRpc(
      env,
      "eth_call",
      [
        {
          to: address,
          data:
            SELECTORS.decimals
        },
        "latest"
      ]
    ),

    safeRpc(
      env,
      "eth_call",
      [
        {
          to: address,
          data:
            SELECTORS.totalSupply
        },
        "latest"
      ]
    )
  ]);

  const name =
    calls[0].ok
      ? decodeString(
          calls[0].result
        )
      : null;

  const symbol =
    calls[1].ok
      ? decodeString(
          calls[1].result
        )
      : null;

  const decimals =
    calls[2].ok
      ? decodeUint(
          calls[2].result
        )
      : null;

  let totalSupply = null;

  if (
    calls[3].ok &&
    calls[3].result
  ) {
    try {
      totalSupply =
        BigInt(
          calls[3].result
        ).toString();
    } catch {}
  }

  const valid =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20: valid,
    name:
      name?.slice(0, 100) ||
      null,
    symbol:
      symbol?.slice(0, 50) ||
      null,
    decimals,
    totalSupply
  };
}

/*
==================================================
DISCOVERY
==================================================
*/

async function discoverContracts(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        DISCOVERY_BLOCKS +
        1
    );

  const observations = [];
  const candidates = new Set();

  for (
    const contract of
      ALL_DISCOVERY_CONTRACTS
        .slice(
          0,
          MAX_DISCOVERY_CONTRACTS
        )
  ) {
    const result =
      await getLogsChunked(
        env,
        {
          address: contract
        },
        fromBlock,
        latestBlock
      );

    const addresses = [];

    for (
      const log of
        result.logs
    ) {
      const extracted =
        extractAddresses(
          log
        );

      for (
        const address of
          extracted
      ) {
        candidates.add(
          address
        );

        addresses.push(
          address
        );
      }
    }

    observations.push({
      contract,
      logsFound:
        result.logs.length,
      addressesExtracted:
        unique(addresses)
          .length,
      rpcErrors:
        result.errors.length,
      errors:
        result.errors.slice(
          0,
          3
        )
    });
  }

  return {
    fromBlock,
    toBlock:
      latestBlock,
    candidates: [
      ...candidates
    ],
    observations
  };
}

/*
==================================================
TRANSFER ACTIVITY
==================================================
*/

async function getTokenActivity(
  env,
  token,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock - 30
    );

  const result =
    await getLogsChunked(
      env,
      {
        address: token,
        topics: [
          TRANSFER_TOPIC
        ]
      },
      fromBlock,
      latestBlock
    );

  const transfers =
    result.logs.filter(
      log =>
        log?.topics?.[0]
          ?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const wallets = [];

  for (
    const log of transfers
  ) {
    const from =
      cleanTopicAddress(
        log.topics?.[1]
      );

    const to =
      cleanTopicAddress(
        log.topics?.[2]
      );

    if (from) {
      wallets.push(from);
    }

    if (to) {
      wallets.push(to);
    }
  }

  return {
    recentActivity:
      result.logs.length,

    recentTransfers:
      transfers.length,

    uniqueWallets:
      unique(wallets).length,

    rpcErrors:
      result.errors.length
  };
}

/*
==================================================
SCORING
==================================================
*/

function scoreCandidate(
  candidate
) {
  let score = 0;

  if (
    candidate.validERC20
  ) {
    score += 25;
  }

  if (
    candidate.name
  ) {
    score += 5;
  }

  if (
    candidate.symbol
  ) {
    score += 5;
  }

  if (
    candidate.discoverySources
      ?.length
  ) {
    score += 15;
  }

  if (
    candidate.recentActivity >
    0
  ) {
    score += Math.min(
      15,
      candidate.recentActivity
    );
  }

  if (
    candidate.recentTransfers >
    0
  ) {
    score += Math.min(
      15,
      Math.ceil(
        candidate.recentTransfers /
          2
      )
    );
  }

  if (
    candidate.uniqueWallets >
    0
  ) {
    score += Math.min(
      10,
      candidate.uniqueWallets
    );
  }

  return Math.min(
    100,
    score
  );
}

/*
==================================================
TELEGRAM
==================================================
*/

async function sendTelegram(
  env,
  candidate
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent: false,
      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  /*
    HARD SAFETY CHECK
  */

  if (
    !validTokenCandidate(
      candidate?.address
    )
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    !candidate.validERC20
  ) {
    return {
      sent: false,
      reason:
        "BLOCKED_UNVERIFIED_ERC20"
    };
  }

  const message = [
    "🚨 ROBINHOOD CHAIN MEME HUNTER",
    "",
    `🧪 Score: ${candidate.score}/100`,
    `🪙 ${candidate.name || "Unknown"}`,
    `🔹 ${candidate.symbol || "UNKNOWN"}`,
    "",
    `📍 Token: ${candidate.address}`,
    "",
    `🔎 Discovery: ${
      candidate.discoverySources?.join(
        ", "
      ) || "ON-CHAIN"
    }`,
    `📊 Activity: ${candidate.recentActivity}`,
    `🔄 Transfers: ${candidate.recentTransfers}`,
    `👥 Wallets: ${candidate.uniqueWallets}`,
    "",
    "⚠️ Market cap: UNVERIFIED",
    "⚠️ Liquidity: UNVERIFIED",
    "⚠️ Holder concentration: UNVERIFIED",
    "⚠️ Smart money: UNVERIFIED",
    "⚠️ Whale activity: UNVERIFIED",
    "",
    "V55 — Fast Verified Chain Hunter"
  ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const controller =
      new AbortController();

    const timer =
      setTimeout(
        () =>
          controller.abort(),
        5000
      );

    const response =
      await fetch(
        url,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json"
          },
          body: JSON.stringify({
            chat_id:
              env.TELEGRAM_CHAT_ID,
            text: message,
            disable_web_page_preview:
              true
          }),
          signal:
            controller.signal
        }
      );

    clearTimeout(timer);

    const result =
      await response.json();

    if (
      !response.ok ||
      !result.ok
    ) {
      return {
        sent: false,
        reason:
          result.description ||
          "TELEGRAM_SEND_FAILED"
      };
    }

    return {
      sent: true,
      messageId:
        result.result
          ?.message_id ||
        null
    };
  } catch (error) {
    return {
      sent: false,
      reason:
        error?.message ||
        "TELEGRAM_REQUEST_FAILED"
    };
  }
}

/*
==================================================
SCAN
==================================================
*/

async function scan(env) {
  const started =
    Date.now();

  const latestBlock =
    await getLatestBlock(
      env
    );

  const discovery =
    await discoverContracts(
      env,
      latestBlock
    );

  const addresses =
    unique(
      discovery.candidates
    )
      .filter(
        validTokenCandidate
      )
      .slice(
        0,
        MAX_CANDIDATES
      );

  const candidates = [];
  const validationResults = [];

  /*
    Metadata validation is intentionally
    bounded to prevent Worker freezes.
  */

  for (
    const address of
      addresses.slice(
        0,
        MAX_METADATA_CALLS
      )
  ) {
    const metadata =
      await getERC20Metadata(
        env,
        address
      );

    validationResults.push({
      address,
      ...metadata
    });

    if (
      !metadata.validERC20
    ) {
      continue;
    }

    candidates.push({
      address,
      ...metadata,
      discoverySources: [
        "BROAD_ON_CHAIN_LOG"
      ],
      recentActivity: 0,
      recentTransfers: 0,
      uniqueWallets: 0
    });
  }

  /*
    Activity is only performed on a
    small number of verified tokens.
  */

  for (
    const candidate of
      candidates.slice(
        0,
        MAX_ACTIVITY_CANDIDATES
      )
  ) {
    const activity =
      await getTokenActivity(
        env,
        candidate.address,
        latestBlock
      );

    Object.assign(
      candidate,
      activity
    );

    candidate.score =
      scoreCandidate(
        candidate
      );
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const qualifyingCandidates =
    candidates.filter(
      candidate =>
        candidate.score >=
          TELEGRAM_THRESHOLD &&
        validTokenCandidate(
          candidate.address
        ) &&
        candidate.validERC20
    );

  let telegram = {
    sent: false,
    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifyingCandidates.length
  ) {
    telegram =
      await sendTelegram(
        env,
        qualifyingCandidates[0]
      );
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success: true,

    scan: {
      status: "OK",

      durationMs:
        Date.now() -
        started,

      latestBlock,

      discoveryWindow: {
        fromBlock:
          discovery.fromBlock,

        toBlock:
          discovery.toBlock,

        blocks:
          discovery.toBlock -
          discovery.fromBlock +
          1
      },

      launchpadDiscovery: {
        contractsChecked:
          discovery.observations
            .length,

        observations:
          discovery.observations
      },

      uniqueTokenCandidates:
        addresses.length,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        validationResults.filter(
          x =>
            x.validERC20
        ).length,

      validationResults,

      candidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegramCandidates:
        qualifyingCandidates.length,

      telegram,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        rpcTimeoutProtection:
          true,

        boundedRPCWorkload:
          true,

        zeroAddressProtection:
          true,

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        walletActivity:
          "ERC20_TRANSFER_LOG_BASED",

        marketCap:
          "UNVERIFIED",

        liquidity:
          "UNVERIFIED",

        holderConcentration:
          "UNVERIFIED",

        smartMoney:
          "UNVERIFIED",

        whaleActivity:
          "UNVERIFIED",

        socialMomentum:
          "UNVERIFIED"
      },

      architecture:
        "V55_FAST_BOUNDED_RPC_VERIFIED_TOKEN_HUNTER",

      chain: {
        name:
          CHAIN_NAME,

        chainId:
          CHAIN_ID
      }
    },

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
HEALTH
==================================================
*/

async function health(env) {
  let latestBlock =
    null;

  let rpcStatus =
    "UNKNOWN";

  if (
    env.ALCHEMY_API_KEY
  ) {
    const result =
      await safeRpc(
        env,
        "eth_blockNumber"
      );

    if (result.ok) {
      latestBlock =
        Number(
          BigInt(
            result.result
          )
        );

      rpcStatus =
        "CONNECTED";
    } else {
      rpcStatus =
        result.error;
    }
  } else {
    rpcStatus =
      "MISSING_ALCHEMY_API_KEY";
  }

  return {
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
        env.ALCHEMY_API_KEY
          ? "ALCHEMY_ROBINHOOD_MAINNET"
          : "MISSING_ALCHEMY_API_KEY"
    },

    contracts: {
      poolManager:
        POOL_MANAGER,

      poolsTradeEntryContracts:
        ENTRY_CONTRACTS,

      poolsTradeLaunchpads:
        LAUNCHPADS,

      mintFastLaunchpad:
        MINT_FAST_LAUNCHPAD
    },

    alchemyConfigured:
      !!env.ALCHEMY_API_KEY,

    rpcStatus,

    latestBlock,

    rpcLogChunkSize:
      RPC_LOG_CHUNK,

    rpcTimeoutMs:
      RPC_TIMEOUT_MS,

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls:
        true,

      minimumScore:
        TELEGRAM_THRESHOLD,

      tokenVerification:
        "REQUIRED",

      zeroAddressProtection:
        true
    },

    architecture:
      "V55_FAST_BOUNDED_RPC_VERIFIED_TOKEN_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
TELEGRAM SAFETY TEST
==================================================
*/

async function testTelegram(env) {
  const fakeCandidate = {
    address:
      ZERO_ADDRESS,

    validERC20:
      true,

    name:
      "V55 SAFETY TEST",

    symbol:
      "TEST",

    score:
      100
  };

  const result =
    await sendTelegram(
      env,
      fakeCandidate
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.sent === false,

    safetyTest:
      result.reason ===
      "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
        ? "ZERO_ADDRESS_BLOCKED"
        : "FAILED",

    response:
      result,

    timestamp:
      new Date().toISOString()
  };
}

/*
==================================================
WORKER
==================================================
*/

export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );

    try {
      if (
        url.pathname ===
        "/health"
      ) {
        return json(
          await health(env)
        );
      }

      if (
        url.pathname ===
        "/scan"
      ) {
        return json(
          await Promise.race([
            scan(env),

            new Promise(
              (_, reject) =>
                setTimeout(
                  () =>
                    reject(
                      new Error(
                        "SCAN_TIMEOUT"
                      )
                    ),
                  REQUEST_TIMEOUT_MS
                )
            )
          ])
        );
      }

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return json(
          await testTelegram(
            env
          )
        );
      }

      return json({
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
    } catch (error) {
      return json(
        {
          agent:
            "Robinhood Chain Meme Hunter",

          version:
            VERSION,

          success:
            false,

          error:
            error?.message ||
            String(error),

          timestamp:
            new Date().toISOString()
        },
        500
      );
    }
  }
};
