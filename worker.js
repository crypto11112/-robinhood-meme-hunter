const VERSION = "V56";

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

const ALL_LAUNCH_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO_ADDRESS =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const POOLS_TOKEN_CREATED_TOPIC =
  "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

const POOLS_TOKEN_DISTRIBUTED_TOPIC =
  "0x67226bacccef969dab310a9e55dc1cf821363658e433fd330344f5cc00c79ac8";

const POOLS_TOKEN_LAUNCHED_TOPIC =
  "0x3b3d2bafdcae274a232217e1f80ee4305d3af6aa25c8b14b1681bd68d18042a4";

const MINT_FAST_TOKEN_CREATED_TOPIC =
  "0x4ef8284ecf42d4cd19686572ffd87f630858c82398911e776cb831de35eddbf4";

const TELEGRAM_THRESHOLD = 60;

const DISCOVERY_BLOCKS = 100;

const V4_BLOCKS = 100;

const ACTIVITY_BLOCKS = 50;

const MAX_CANDIDATES = 8;

const MAX_METADATA_CHECKS = 8;

const RPC_TIMEOUT_MS = 3500;


/*
==================================================
ADDRESS HELPERS
==================================================
*/

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
  if (!isAddress(address)) {
    return false;
  }

  const a =
    address.toLowerCase();

  return (
    a !== ZERO_ADDRESS
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function topicToAddress(
  topic,
  allowZero = false
) {
  if (
    !topic ||
    typeof topic !== "string"
  ) {
    return null;
  }

  let hex =
    topic.startsWith("0x")
      ? topic.slice(2)
      : topic;

  if (hex.length !== 64) {
    return null;
  }

  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    return null;
  }

  const address =
    "0x" +
    hex.slice(24);

  if (
    !allowZero &&
    isZeroAddress(address)
  ) {
    return null;
  }

  return address.toLowerCase();
}

function splitWords(data) {
  if (
    !data ||
    typeof data !== "string"
  ) {
    return [];
  }

  const clean =
    data.startsWith("0x")
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
      clean.slice(
        i,
        i + 64
      )
    );
  }

  return words;
}


/*
==================================================
RPC
==================================================
*/

async function rpc(
  env,
  method,
  params = []
) {
  const apiKey =
    env.ALCHEMY_API_KEY;

  if (!apiKey) {
    throw new Error(
      "ALCHEMY_API_KEY secret is missing"
    );
  }

  const rpcUrl =
    "https://robinhood-mainnet.g.alchemy.com/v2/" +
    apiKey;

  const controller =
    new AbortController();

  const timeout =
    setTimeout(
      () =>
        controller.abort(),
      RPC_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        rpcUrl,
        {
          method:
            "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              jsonrpc:
                "2.0",
              id:
                Date.now(),
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

    const json =
      await response.json();

    if (json.error) {
      throw new Error(
        json.error.message ||
        "RPC error"
      );
    }

    return json.result;

  } finally {
    clearTimeout(
      timeout
    );
  }
}


/*
==================================================
LATEST BLOCK
==================================================
*/

async function getLatestBlock(env) {
  const result =
    await rpc(
      env,
      "eth_blockNumber"
    );

  return Number(
    BigInt(result)
  );
}


/*
==================================================
BATCHED LOG DISCOVERY
==================================================
*/

async function getLogsBatch(
  env,
  addresses,
  fromBlock,
  toBlock,
  topics = null
) {
  try {
    const filter = {
      address:
        addresses,

      fromBlock:
        "0x" +
        fromBlock.toString(16),

      toBlock:
        "0x" +
        toBlock.toString(16)
    };

    if (topics) {
      filter.topics =
        topics;
    }

    const logs =
      await rpc(
        env,
        "eth_getLogs",
        [filter]
      );

    return {
      logs:
        Array.isArray(logs)
          ? logs
          : [],

      error:
        null
    };

  } catch (error) {
    return {
      logs: [],

      error:
        error?.message ||
        String(error)
    };
  }
}


/*
==================================================
ETH CALL
==================================================
*/

async function ethCall(
  env,
  to,
  data
) {
  if (
    !validTokenCandidate(to)
  ) {
    return null;
  }

  try {
    return await rpc(
      env,
      "eth_call",
      [
        {
          to,
          data
        },
        "latest"
      ]
    );
  } catch {
    return null;
  }
}


/*
==================================================
ERC20 METADATA
==================================================
*/

const SELECTORS = {
  name:
    "0x06fdde03",

  symbol:
    "0x95d89b41",

  decimals:
    "0x313ce567",

  totalSupply:
    "0x18160ddd"
};

function hexToUtf8(hex) {
  try {
    const bytes = [];

    for (
      let i = 0;
      i + 2 <= hex.length;
      i += 2
    ) {
      const n =
        parseInt(
          hex.slice(
            i,
            i + 2
          ),
          16
        );

      if (
        n !== 0 &&
        n >= 32
      ) {
        bytes.push(n);
      }
    }

    return new TextDecoder()
      .decode(
        new Uint8Array(bytes)
      )
      .trim() || null;

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

    if (
      hex.length >= 128
    ) {
      const offset =
        Number(
          BigInt(
            "0x" +
            hex.slice(
              0,
              64
            )
          )
        );

      const position =
        offset * 2;

      if (
        Number.isFinite(
          offset
        ) &&
        position + 64 <=
          hex.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              hex.slice(
                position,
                position + 64
              )
            )
          );

        const start =
          position + 64;

        const end =
          start +
          length * 2;

        if (
          end <=
          hex.length
        ) {
          return hexToUtf8(
            hex.slice(
              start,
              end
            )
          );
        }
      }
    }

    return hexToUtf8(
      hex.slice(
        0,
        64
      )
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
      validERC20:
        false
    };
  }

  const [
    nameRaw,
    symbolRaw,
    decimalsRaw,
    supplyRaw
  ] =
    await Promise.all([
      ethCall(
        env,
        address,
        SELECTORS.name
      ),

      ethCall(
        env,
        address,
        SELECTORS.symbol
      ),

      ethCall(
        env,
        address,
        SELECTORS.decimals
      ),

      ethCall(
        env,
        address,
        SELECTORS.totalSupply
      )
    ]);

  const name =
    decodeString(
      nameRaw
    );

  const symbol =
    decodeString(
      symbolRaw
    );

  let decimals =
    null;

  let totalSupply =
    null;

  try {
    if (
      decimalsRaw &&
      decimalsRaw !== "0x"
    ) {
      decimals =
        Number(
          BigInt(
            decimalsRaw
          )
        );
    }
  } catch {}

  try {
    if (
      supplyRaw &&
      supplyRaw !== "0x"
    ) {
      totalSupply =
        BigInt(
          supplyRaw
        ).toString();
    }
  } catch {}

  return {
    validERC20:
      !!name &&
      !!symbol &&
      decimals !== null &&
      totalSupply !== null,

    name:
      name
        ? name.slice(
            0,
            100
          )
        : null,

    symbol:
      symbol
        ? symbol.slice(
            0,
            50
          )
        : null,

    decimals,

    totalSupply
  };
}


/*
==================================================
TOKEN EXTRACTION
==================================================
*/

function extractAddressesFromLog(
  log
) {
  const addresses = [];

  if (
    Array.isArray(
      log.topics
    )
  ) {
    for (
      const topic of
        log.topics.slice(1)
    ) {
      const address =
        topicToAddress(
          topic
        );

      if (
        validTokenCandidate(
          address
        )
      ) {
        addresses.push(
          address
        );
      }
    }
  }

  for (
    const word of
      splitWords(
        log.data
      )
  ) {
    const address =
      topicToAddress(
        word
      );

    if (
      validTokenCandidate(
        address
      )
    ) {
      addresses.push(
        address
      );
    }
  }

  return unique(
    addresses
  );
}


/*
==================================================
LAUNCHPAD DISCOVERY
==================================================
*/

async function discoverLaunchpads(
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

  const result =
    await getLogsBatch(
      env,
      ALL_LAUNCH_CONTRACTS,
      fromBlock,
      latestBlock
    );

  const logs =
    result.logs;

  const candidates =
    new Map();

  const observations =
    new Map();

  for (
    const log of logs
  ) {
    const contract =
      log.address
        ?.toLowerCase();

    if (!contract) {
      continue;
    }

    const addresses =
      extractAddressesFromLog(
        log
      );

    if (
      addresses.length > 0
    ) {
      for (
        const token of
          addresses
      ) {
        if (
          !candidates.has(
            token
          )
        ) {
          candidates.set(
            token,
            {
              token,

              source:
                "BROAD_LAUNCHPAD_DISCOVERY",

              contract,

              txHash:
                log.transactionHash ||
                null,

              blockNumber:
                log.blockNumber ||
                null
            }
          );
        }
      }
    }
  }

  for (
    const contract of
      ALL_LAUNCH_CONTRACTS
  ) {
    observations.set(
      contract.toLowerCase(),
      {
        contract,
        logsFound:
          logs.filter(
            x =>
              x.address
                ?.toLowerCase() ===
              contract.toLowerCase()
          ).length
      }
    );
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    logsFound:
      logs.length,

    candidates:
      [
        ...candidates.values()
      ],

    observations:
      [
        ...observations.values()
      ],

    rpcError:
      result.error
  };
}


/*
==================================================
V4 DISCOVERY
==================================================
*/

async function discoverV4(
  env,
  latestBlock
) {
  const fromBlock =
    Math.max(
      0,
      latestBlock -
        V4_BLOCKS +
        1
    );

  const result =
    await getLogsBatch(
      env,
      [POOL_MANAGER],
      fromBlock,
      latestBlock
    );

  const logs =
    result.logs;

  const initializeEvents =
    [];

  const swapEvents =
    [];

  for (
    const log of logs
  ) {
    if (
      !Array.isArray(
        log.topics
      )
    ) {
      continue;
    }

    /*
      V4 Initialize:
      4 topics + 5 data words
    */

    if (
      log.topics.length === 4 &&
      splitWords(
        log.data
      ).length === 5
    ) {
      const words =
        splitWords(
          log.data
        );

      const currency0 =
        topicToAddress(
          log.topics[2],
          true
        );

      const currency1 =
        topicToAddress(
          log.topics[3],
          true
        );

      if (
        currency0 &&
        currency1 &&
        currency0 !==
          currency1
      ) {
        initializeEvents.push({
          poolId:
            log.topics[1],

          currency0,

          currency1,

          txHash:
            log.transactionHash ||
            null,

          blockNumber:
            log.blockNumber ||
            null,

          fee:
            decodeUint24(
              words[0]
            ),

          tickSpacing:
            decodeInt24(
              words[1]
            )
        });
      }
    }

    /*
      V4 Swap:
      3 topics + 7 data words
    */

    if (
      log.topics.length === 3 &&
      splitWords(
        log.data
      ).length === 7
    ) {
      const words =
        splitWords(
          log.data
        );

      const sender =
        topicToAddress(
          log.topics[2],
          true
        );

      swapEvents.push({
        poolId:
          log.topics[1],

        sender,

        txHash:
          log.transactionHash ||
          null,

        blockNumber:
          log.blockNumber ||
          null
      });
    }
  }

  return {
    fromBlock,

    toBlock:
      latestBlock,

    rawLogs:
      logs.length,

    initializeEvents,

    swapEvents,

    rpcError:
      result.error
  };
}


/*
==================================================
ACTIVITY
==================================================
*/

async function getTokenActivity(
  env,
  token,
  latestBlock
) {
  const recentFrom =
    Math.max(
      0,
      latestBlock -
        ACTIVITY_BLOCKS +
        1
    );

  const result =
    await getLogsBatch(
      env,
      [token],
      recentFrom,
      latestBlock
    );

  const logs =
    result.logs;

  const transfers =
    logs.filter(
      log =>
        log.topics?.[0]
          ?.toLowerCase() ===
        TRANSFER_TOPIC
    );

  const wallets =
    [];

  for (
    const log of
      transfers
  ) {
    const from =
      topicToAddress(
        log.topics?.[1],
        true
      );

    const to =
      topicToAddress(
        log.topics?.[2],
        true
      );

    if (
      from &&
      !isZeroAddress(from)
    ) {
      wallets.push(
        from
      );
    }

    if (
      to &&
      !isZeroAddress(to)
    ) {
      wallets.push(
        to
      );
    }
  }

  return {
    recentActivity:
      logs.length,

    recentTransfers:
      transfers.length,

    uniqueWallets:
      unique(wallets).length,

    rpcError:
      result.error
  };
}


/*
==================================================
POOL MATCHING
==================================================
*/

function findPoolsForToken(
  token,
  initializeEvents
) {
  const target =
    token.toLowerCase();

  return initializeEvents.filter(
    pool =>
      pool.currency0 ===
        target ||
      pool.currency1 ===
        target
  );
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
    candidate.launchEvidence
  ) {
    score += 15;
  }

  if (
    candidate.poolCount > 0
  ) {
    score += 15;
  }

  if (
    candidate.recentActivity > 0
  ) {
    score += Math.min(
      15,
      candidate.recentActivity
    );
  }

  if (
    candidate.uniqueWallets > 0
  ) {
    score += Math.min(
      10,
      candidate.uniqueWallets
    );
  }

  if (
    candidate.recentTransfers > 0
  ) {
    score += 5;
  }

  return Math.min(
    100,
    score
  );
}


/*
==================================================
CANDIDATE
==================================================
*/

async function buildCandidate(
  env,
  launch,
  latestBlock,
  initializeEvents
) {
  const token =
    launch.token
      ?.toLowerCase();

  /*
    HARD SAFETY CHECK
  */

  if (
    !validTokenCandidate(
      token
    )
  ) {
    return null;
  }

  const metadata =
    await getERC20Metadata(
      env,
      token
    );

  /*
    TELEGRAM SAFETY:
    ONLY VERIFIED ERC20 TOKENS
  */

  if (
    !metadata.validERC20
  ) {
    return null;
  }

  const pools =
    findPoolsForToken(
      token,
      initializeEvents
    );

  const activity =
    await getTokenActivity(
      env,
      token,
      latestBlock
    );

  const candidate = {
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

    validERC20:
      true,

    launchEvidence:
      true,

    launchSource:
      launch.source ||
      null,

    launchContract:
      launch.contract ||
      null,

    launchTx:
      launch.txHash ||
      null,

    launchBlock:
      launch.blockNumber ||
      null,

    poolCount:
      pools.length,

    poolInitialized:
      pools.length > 0,

    recentActivity:
      activity.recentActivity,

    recentTransfers:
      activity.recentTransfers,

    uniqueWallets:
      activity.uniqueWallets,

    activityRpcError:
      activity.rpcError,

    pools:
      pools.map(
        pool => ({
          poolId:
            pool.poolId,

          currency0:
            pool.currency0,

          currency1:
            pool.currency1,

          fee:
            pool.fee,

          tickSpacing:
            pool.tickSpacing,

          txHash:
            pool.txHash,

          blockNumber:
            pool.blockNumber
        })
      )
  };

  candidate.score =
    scoreCandidate(
      candidate
    );

  return candidate;
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
  /*
    NEVER SEND ZERO ADDRESS
  */

  if (
    !validTokenCandidate(
      candidate.address
    )
  ) {
    return {
      sent: false,

      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    candidate.validERC20 !== true
  ) {
    return {
      sent: false,

      reason:
        "BLOCKED_UNVERIFIED_ERC20"
    };
  }

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

  const message =
    [
      "🚨 ROBINHOOD CHAIN MEME HUNTER",
      "",
      `🧪 Score: ${candidate.score}/100`,
      `🪙 ${candidate.name || "Unknown"}`,
      `🔹 ${candidate.symbol || "UNKNOWN"}`,
      "",
      `📍 Token: ${candidate.address}`,
      "",
      `🚀 Source: ${candidate.launchSource || "ON-CHAIN DISCOVERY"}`,
      `🏊 Pools: ${candidate.poolCount}`,
      `📊 Activity: ${candidate.recentActivity}`,
      `👥 Wallets: ${candidate.uniqueWallets}`,
      `🔄 Transfers: ${candidate.recentTransfers}`,
      "",
      "✅ Verified ERC20",
      "✅ Non-zero token address",
      "",
      "⚠️ Market cap: UNVERIFIED",
      "⚠️ Liquidity: UNVERIFIED",
      "⚠️ Holder concentration: UNVERIFIED",
      "⚠️ Smart money: UNVERIFIED",
      "⚠️ Whale activity: UNVERIFIED",
      "",
      "V56 — Fast Batched Discovery"
    ].join("\n");

  const url =
    "https://api.telegram.org/bot" +
    env.TELEGRAM_BOT_TOKEN +
    "/sendMessage";

  try {
    const response =
      await fetch(
        url,
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

              disable_web_page_preview:
                true
            })
        }
      );

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
        result.result?.message_id ||
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

  /*
    TWO MAIN RPC CALLS ONLY:
    1. launch discovery
    2. V4 discovery
  */

  const [
    launchDiscovery,
    v4
  ] =
    await Promise.all([
      discoverLaunchpads(
        env,
        latestBlock
      ),

      discoverV4(
        env,
        latestBlock
      )
    ]);

  const tokenMap =
    new Map();

  /*
    Launchpad candidates
  */

  for (
    const launch of
      launchDiscovery.candidates
  ) {
    if (
      validTokenCandidate(
        launch.token
      )
    ) {
      tokenMap.set(
        launch.token,
        launch
      );
    }
  }

  /*
    V4 currencies
  */

  for (
    const pool of
      v4.initializeEvents
  ) {
    for (
      const currency of [
        pool.currency0,
        pool.currency1
      ]
    ) {
      if (
        validTokenCandidate(
          currency
        )
      ) {
        const token =
          currency.toLowerCase();

        if (
          !tokenMap.has(
            token
          )
        ) {
          tokenMap.set(
            token,
            {
              token,

              source:
                "V4_POOL_DISCOVERY",

              contract:
                POOL_MANAGER,

              txHash:
                pool.txHash,

              blockNumber:
                pool.blockNumber
            }
          );
        }
      }
    }
  }

  /*
    Limit candidates before metadata calls.
  */

  const launches =
    [
      ...tokenMap.values()
    ].slice(
      0,
      MAX_CANDIDATES
    );

  const candidates =
    [];

  const validationResults =
    [];

  /*
    Metadata + activity calls can still be
    expensive, so keep the number bounded.
  */

  for (
    const launch of
      launches.slice(
        0,
        MAX_METADATA_CHECKS
      )
  ) {
    const candidate =
      await buildCandidate(
        env,
        launch,
        latestBlock,
        v4.initializeEvents
      );

    if (
      candidate
    ) {
      candidates.push(
        candidate
      );

      validationResults.push({
        address:
          candidate.address,

        name:
          candidate.name,

        symbol:
          candidate.symbol,

        validERC20:
          true
      });
    }
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
        candidate.validERC20 ===
          true
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifyingCandidates.length >
    0
  ) {
    telegramResult =
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

    success:
      true,

    scan: {
      status:
        "OK",

      durationMs:
        Date.now() -
        started,

      latestBlock,

      discoveryWindow: {
        fromBlock:
          launchDiscovery.fromBlock,

        toBlock:
          launchDiscovery.toBlock,

        blocks:
          launchDiscovery.toBlock -
          launchDiscovery.fromBlock +
          1
      },

      launchpadDiscovery: {
        contractsChecked:
          ALL_LAUNCH_CONTRACTS.length,

        logsFound:
          launchDiscovery.logsFound,

        candidatesExtracted:
          launchDiscovery.candidates.length,

        observations:
          launchDiscovery.observations,

        rpcError:
          launchDiscovery.rpcError ||
          null
      },

      v4: {
        poolManager:
          POOL_MANAGER,

        fromBlock:
          v4.fromBlock,

        toBlock:
          v4.toBlock,

        rawLogs:
          v4.rawLogs,

        initializeEvents:
          v4.initializeEvents.length,

        swapEvents:
          v4.swapEvents.length,

        uniqueSwapPools:
          unique(
            v4.swapEvents.map(
              x =>
                x.poolId
            )
          ).length,

        uniqueSwapSenders:
          unique(
            v4.swapEvents
              .map(
                x =>
                  x.sender
              )
              .filter(Boolean)
          ).length,

        rpcError:
          v4.rpcError ||
          null
      },

      uniqueTokenCandidates:
        tokenMap.size,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        candidates.length,

      validationResults,

      candidates,

      qualifyingCandidates:
        qualifyingCandidates.length,

      telegramCandidates:
        qualifyingCandidates.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        rpcTimeoutProtection:
          true,

        batchedLaunchDiscovery:
          true,

        boundedCandidateValidation:
          true,

        zeroAddressProtection:
          true,

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

        launchDetection:
          "BROAD_ON_CHAIN_LOG_DISCOVERY",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        poolDetection:
          "V4_INITIALIZE_OR_LAUNCHPAD_DISCOVERY",

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
        "V56_SINGLE_BATCH_DISCOVERY_FAST_BOUNDED_VERIFIED_TOKEN_HUNTER",

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
    try {
      latestBlock =
        await getLatestBlock(
          env
        );

      rpcStatus =
        "CONNECTED";
    } catch {
      rpcStatus =
        "ERROR";
    }
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
      "BATCHED",

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
      "V56_SINGLE_BATCH_DISCOVERY_FAST_BOUNDED_VERIFIED_TOKEN_HUNTER",

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
  const fakeZeroCandidate = {
    name:
      "ZERO ADDRESS TEST",

    symbol:
      "ZERO",

    address:
      ZERO_ADDRESS,

    score:
      100,

    validERC20:
      true
  };

  const result =
    await sendTelegram(
      env,
      fakeZeroCandidate
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.sent === false &&
      result.reason ===
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS",

    safetyTest:
      "ZERO_ADDRESS_BLOCKED",

    response:
      result,

    timestamp:
      new Date().toISOString()
  };
}


/*
==================================================
ROOT
==================================================
*/

function rootResponse() {
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

    message:
      "Robinhood Chain Meme Hunter V56 online"
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
          await health(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/scan"
      ) {
        return json(
          await scan(
            env
          )
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

      return json(
        rootResponse()
      );

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


/*
==================================================
JSON
==================================================
*/

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
          "no-store"
      }
    }
  );
}


/*
==================================================
DECODERS
==================================================
*/

function decodeUint24(hex) {
  try {
    return Number(
      BigInt(hex) &
        0xffffffn
    );
  } catch {
    return null;
  }
}

function decodeInt24(hex) {
  try {
    let n =
      BigInt(hex);

    if (
      n >=
      (1n << 23n)
    ) {
      n -=
        1n << 24n;
    }

    return Number(n);

  } catch {
    return null;
  }
}
