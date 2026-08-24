const VERSION = "V58";

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

const DISCOVERY_CONTRACTS = [
  ...ENTRY_CONTRACTS,
  ...LAUNCHPADS,
  MINT_FAST_LAUNCHPAD
];

const ZERO =
  "0x0000000000000000000000000000000000000000";

const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

const SCORE_THRESHOLD = 60;

const DISCOVERY_BLOCKS = 100;
const V4_BLOCKS = 100;
const ACTIVITY_BLOCKS = 50;

const RPC_TIMEOUT_MS = 3500;

const MAX_DISCOVERY_CALLS = 8;
const MAX_TOKEN_CHECKS = 5;


/* =========================================================
   ADDRESS HELPERS
========================================================= */

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(value) {
  return (
    !value ||
    value.toLowerCase() === ZERO
  );
}

function isValidToken(value) {
  return (
    isAddress(value) &&
    !isZeroAddress(value)
  );
}

function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}

function topicAddress(topic) {
  if (
    !topic ||
    typeof topic !== "string"
  ) {
    return null;
  }

  const clean =
    topic.startsWith("0x")
      ? topic.slice(2)
      : topic;

  if (
    clean.length !== 64 ||
    !/^[0-9a-fA-F]+$/.test(clean)
  ) {
    return null;
  }

  const address =
    "0x" + clean.slice(24);

  return isValidToken(address)
    ? address.toLowerCase()
    : null;
}


/* =========================================================
   RPC
========================================================= */

async function rpc(env, method, params = []) {
  if (!env.ALCHEMY_API_KEY) {
    throw new Error(
      "ALCHEMY_API_KEY missing"
    );
  }

  const endpoint =
    `https://robinhood-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      RPC_TIMEOUT_MS
    );

  try {
    const response =
      await fetch(
        endpoint,
        {
          method: "POST",

          headers: {
            "content-type":
              "application/json"
          },

          body:
            JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method,
              params
            }),

          signal:
            controller.signal
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
        `RPC invalid JSON HTTP ${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `Alchemy HTTP ${response.status}`
      );
    }

    if (data.error) {
      throw new Error(
        data.error.message ||
        "Alchemy RPC error"
      );
    }

    return data.result;

  } finally {
    clearTimeout(timer);
  }
}


/* =========================================================
   BLOCK
========================================================= */

async function latestBlock(env) {
  const value =
    await rpc(
      env,
      "eth_blockNumber"
    );

  return Number(
    BigInt(value)
  );
}


/* =========================================================
   RPC LOG TEST
========================================================= */

async function rpcTest(env) {
  const latest =
    await latestBlock(env);

  /*
    Only test a very small range.
    This deliberately avoids the scanner.
  */

  const fromBlock =
    Math.max(
      0,
      latest - 10
    );

  const fromHex =
    "0x" +
    fromBlock.toString(16);

  const toHex =
    "0x" +
    latest.toString(16);

  const tests = [];

  /*
    TEST 1
    eth_getLogs with ONLY block range.
  */

  try {
    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            fromBlock:
              fromHex,

            toBlock:
              toHex
          }
        ]
      );

    tests.push({
      test:
        "range_only",

      success:
        true,

      logs:
        Array.isArray(result)
          ? result.length
          : 0
    });

  } catch (error) {
    tests.push({
      test:
        "range_only",

      success:
        false,

      error:
        error?.message ||
        String(error)
    });
  }


  /*
    TEST 2
    eth_getLogs against PoolManager.
  */

  try {
    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            address:
              POOL_MANAGER,

            fromBlock:
              fromHex,

            toBlock:
              toHex
          }
        ]
      );

    tests.push({
      test:
        "pool_manager",

      success:
        true,

      logs:
        Array.isArray(result)
          ? result.length
          : 0
    });

  } catch (error) {
    tests.push({
      test:
        "pool_manager",

      success:
        false,

      error:
        error?.message ||
        String(error)
    });
  }


  /*
    TEST 3
    eth_getLogs against ONE launchpad.
  */

  try {
    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            address:
              LAUNCHPADS[0],

            fromBlock:
              fromHex,

            toBlock:
              toHex
          }
        ]
      );

    tests.push({
      test:
        "single_launchpad",

      success:
        true,

      logs:
        Array.isArray(result)
          ? result.length
          : 0
    });

  } catch (error) {
    tests.push({
      test:
        "single_launchpad",

      success:
        false,

      error:
        error?.message ||
        String(error)
    });
  }


  /*
    TEST 4
    eth_getLogs with a Transfer topic.
  */

  try {
    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            fromBlock:
              fromHex,

            toBlock:
              toHex,

            topics: [
              TRANSFER_TOPIC
            ]
          }
        ]
      );

    tests.push({
      test:
        "transfer_topic",

      success:
        true,

      logs:
        Array.isArray(result)
          ? result.length
          : 0
    });

  } catch (error) {
    tests.push({
      test:
        "transfer_topic",

      success:
        false,

      error:
        error?.message ||
        String(error)
    });
  }


  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      true,

    rpcTest:
      true,

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID
    },

    latestBlock:
      latest,

    fromBlock,

    toBlock:
      latest,

    blockRange:
      latest - fromBlock + 1,

    endpoint:
      "ALCHEMY_ROBINHOOD_MAINNET",

    tests,

    interpretation: {
      blockNumber:
        "eth_blockNumber must succeed",

      rangeOnly:
        "Tests whether eth_getLogs itself is accepted",

      poolManager:
        "Tests address-filtered eth_getLogs",

      singleLaunchpad:
        "Tests launchpad address filtering",

      transferTopic:
        "Tests topic filtering"
    },

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   SINGLE-CONTRACT LOG QUERY
========================================================= */

async function getContractLogs(
  env,
  contract,
  fromBlock,
  toBlock
) {
  if (
    !isAddress(contract)
  ) {
    return {
      logs: [],

      error:
        "INVALID_CONTRACT"
    };
  }

  try {
    const result =
      await rpc(
        env,
        "eth_getLogs",
        [
          {
            address:
              contract,

            fromBlock:
              "0x" +
              fromBlock.toString(16),

            toBlock:
              "0x" +
              toBlock.toString(16)
          }
        ]
      );

    return {
      logs:
        Array.isArray(result)
          ? result
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


/* =========================================================
   TOKEN EXTRACTION
========================================================= */

function addressesFromLog(log) {
  const found = [];

  if (
    Array.isArray(log.topics)
  ) {
    for (
      const topic of
        log.topics
    ) {
      const address =
        topicAddress(topic);

      if (address) {
        found.push(address);
      }
    }
  }

  if (
    typeof log.data === "string" &&
    log.data.length > 2
  ) {
    const clean =
      log.data.slice(2);

    for (
      let i = 0;
      i + 64 <= clean.length;
      i += 64
    ) {
      const word =
        "0x" +
        clean.slice(
          i,
          i + 64
        );

      const address =
        topicAddress(word);

      if (address) {
        found.push(address);
      }
    }
  }

  return unique(found);
}


/* =========================================================
   DISCOVERY
========================================================= */

async function discover(
  env,
  latest
) {
  const from =
    Math.max(
      0,
      latest -
        DISCOVERY_BLOCKS +
        1
    );

  const candidates =
    new Map();

  const observations =
    [];

  let calls = 0;

  for (
    const contract of
      DISCOVERY_CONTRACTS
  ) {
    if (
      calls >=
      MAX_DISCOVERY_CALLS
    ) {
      break;
    }

    calls++;

    const result =
      await getContractLogs(
        env,
        contract,
        from,
        latest
      );

    observations.push({
      contract,

      logsFound:
        result.logs.length,

      error:
        result.error
    });

    for (
      const log of
        result.logs
    ) {
      const addresses =
        addressesFromLog(log);

      for (
        const address of
          addresses
      ) {
        if (
          !isValidToken(address)
        ) {
          continue;
        }

        if (
          !candidates.has(address)
        ) {
          candidates.set(
            address,
            {
              token:
                address,

              source:
                "LAUNCHPAD_LOG",

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

  return {
    fromBlock:
      from,

    toBlock:
      latest,

    blocks:
      latest - from + 1,

    calls,

    observations,

    candidates:
      [...candidates.values()]
  };
}


/* =========================================================
   V4
========================================================= */

async function discoverV4(
  env,
  latest
) {
  const from =
    Math.max(
      0,
      latest -
        V4_BLOCKS +
        1
    );

  const result =
    await getContractLogs(
      env,
      POOL_MANAGER,
      from,
      latest
    );

  const initializeEvents =
    [];

  const swapEvents =
    [];

  for (
    const log of
      result.logs
  ) {
    if (
      !Array.isArray(log.topics)
    ) {
      continue;
    }

    if (
      log.topics.length >= 3
    ) {
      const addresses =
        addressesFromLog(log);

      for (
        const address of
          addresses
      ) {
        if (
          !isValidToken(address)
        ) {
          continue;
        }

        initializeEvents.push({
          token:
            address,

          txHash:
            log.transactionHash ||
            null,

          blockNumber:
            log.blockNumber ||
            null,

          poolId:
            log.topics[1] ||
            null
        });

        break;
      }
    }
  }

  return {
    fromBlock:
      from,

    toBlock:
      latest,

    rawLogs:
      result.logs.length,

    initializeEvents,

    swapEvents,

    rpcError:
      result.error
  };
}


/* =========================================================
   ERC20
========================================================= */

async function call(
  env,
  address,
  data
) {
  if (
    !isValidToken(address)
  ) {
    return null;
  }

  try {
    return await rpc(
      env,
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

  } catch {
    return null;
  }
}


function decodeText(value) {
  if (
    !value ||
    value === "0x"
  ) {
    return null;
  }

  try {
    const clean =
      value.slice(2);

    if (
      clean.length >= 128
    ) {
      const offset =
        Number(
          BigInt(
            "0x" +
            clean.slice(
              0,
              64
            )
          )
        );

      const start =
        offset * 2;

      if (
        start + 64 <=
        clean.length
      ) {
        const length =
          Number(
            BigInt(
              "0x" +
              clean.slice(
                start,
                start + 64
              )
            )
          );

        const dataStart =
          start + 64;

        const dataEnd =
          dataStart +
          length * 2;

        if (
          dataEnd <=
          clean.length
        ) {
          const bytes =
            [];

          for (
            let i =
              dataStart;
            i < dataEnd;
            i += 2
          ) {
            bytes.push(
              parseInt(
                clean.slice(
                  i,
                  i + 2
                ),
                16
              )
            );
          }

          return new TextDecoder()
            .decode(
              new Uint8Array(bytes)
            )
            .replace(
              /\0/g,
              ""
            )
            .trim();
        }
      }
    }

    return null;

  } catch {
    return null;
  }
}


async function verifyERC20(
  env,
  token
) {
  if (
    !isValidToken(token)
  ) {
    return {
      validERC20:
        false,

      reason:
        "ZERO_OR_INVALID_ADDRESS"
    };
  }

  const name =
    await call(
      env,
      token,
      "0x06fdde03"
    );

  const symbol =
    await call(
      env,
      token,
      "0x95d89b41"
    );

  const decimals =
    await call(
      env,
      token,
      "0x313ce567"
    );

  const supply =
    await call(
      env,
      token,
      "0x18160ddd"
    );

  const decodedName =
    decodeText(name);

  const decodedSymbol =
    decodeText(symbol);

  const valid =
    !!decodedName &&
    !!decodedSymbol &&
    !!decimals &&
    !!supply;

  return {
    validERC20:
      valid,

    name:
      decodedName ||
      null,

    symbol:
      decodedSymbol ||
      null,

    decimals:
      decimals
        ? Number(
            BigInt(decimals)
          )
        : null,

    totalSupply:
      supply
        ? BigInt(
            supply
          ).toString()
        : null
  };
}


/* =========================================================
   ACTIVITY
========================================================= */

async function activity(
  env,
  token,
  latest
) {
  if (
    !isValidToken(token)
  ) {
    return {
      transfers: 0,

      wallets: 0
    };
  }

  const from =
    Math.max(
      0,
      latest -
        ACTIVITY_BLOCKS +
        1
    );

  const result =
    await getContractLogs(
      env,
      token,
      from,
      latest
    );

  let transfers = 0;

  const wallets =
    [];

  for (
    const log of
      result.logs
  ) {
    if (
      log.topics?.[0]
        ?.toLowerCase() !==
      TRANSFER_TOPIC
    ) {
      continue;
    }

    transfers++;

    const fromWallet =
      topicAddress(
        log.topics?.[1]
      );

    const toWallet =
      topicAddress(
        log.topics?.[2]
      );

    if (
      fromWallet
    ) {
      wallets.push(
        fromWallet
      );
    }

    if (
      toWallet
    ) {
      wallets.push(
        toWallet
      );
    }
  }

  return {
    transfers,

    wallets:
      unique(wallets).length,

    rpcError:
      result.error
  };
}


/* =========================================================
   SCORING
========================================================= */

function score(candidate) {
  let value = 0;

  if (
    candidate.validERC20
  ) {
    value += 30;
  }

  if (
    candidate.launchEvidence
  ) {
    value += 15;
  }

  if (
    candidate.v4Evidence
  ) {
    value += 15;
  }

  if (
    candidate.transfers > 0
  ) {
    value += Math.min(
      15,
      candidate.transfers
    );
  }

  if (
    candidate.wallets > 0
  ) {
    value += Math.min(
      15,
      candidate.wallets
    );
  }

  if (
    candidate.name &&
    candidate.symbol
  ) {
    value += 10;
  }

  return Math.min(
    100,
    value
  );
}


/* =========================================================
   TELEGRAM
========================================================= */

async function telegram(
  env,
  candidate
) {
  if (
    !isValidToken(
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

  const text =
    [
      "🚨 ROBINHOOD CHAIN MEME HUNTER",

      "",

      `⭐ Score: ${candidate.score}/100`,

      `🪙 ${candidate.name}`,

      `🔹 ${candidate.symbol}`,

      "",

      `📍 ${candidate.address}`,

      "",

      `🚀 Discovery: ${candidate.source}`,

      `📊 Transfers: ${candidate.transfers}`,

      `👛 Wallets: ${candidate.wallets}`,

      "",

      "✅ Verified ERC20",

      "✅ Non-zero address",

      "",

      "⚠️ Market cap unverified",

      "⚠️ Liquidity unverified",

      "⚠️ Holder concentration unverified",

      "",

      "Robinhood Chain Meme Hunter V58"
    ].join("\n");

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

              text,

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


/* =========================================================
   SCAN
========================================================= */

async function runScan(env) {
  const start =
    Date.now();

  const latest =
    await latestBlock(
      env
    );

  const discovery =
    await discover(
      env,
      latest
    );

  const v4 =
    await discoverV4(
      env,
      latest
    );

  const candidateMap =
    new Map();

  for (
    const item of
      discovery.candidates
  ) {
    if (
      isValidToken(
        item.token
      )
    ) {
      candidateMap.set(
        item.token,
        {
          ...item,

          launchEvidence:
            true,

          v4Evidence:
            false
        }
      );
    }
  }

  for (
    const event of
      v4.initializeEvents
  ) {
    if (
      isValidToken(
        event.token
      )
    ) {
      const existing =
        candidateMap.get(
          event.token
        );

      if (
        existing
      ) {
        existing.v4Evidence =
          true;
      } else {
        candidateMap.set(
          event.token,
          {
            token:
              event.token,

            source:
              "V4_POOL_DISCOVERY",

            contract:
              POOL_MANAGER,

            txHash:
              event.txHash,

            blockNumber:
              event.blockNumber,

            launchEvidence:
              false,

            v4Evidence:
              true
          }
        );
      }
    }
  }

  const rawCandidates =
    [
      ...candidateMap.values()
    ].slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const candidates =
    [];

  const validationResults =
    [];

  for (
    const raw of
      rawCandidates
  ) {
    const token =
      raw.token
        ?.toLowerCase();

    if (
      !isValidToken(token)
    ) {
      continue;
    }

    const verification =
      await verifyERC20(
        env,
        token
      );

    validationResults.push({
      address:
        token,

      validERC20:
        verification.validERC20,

      name:
        verification.name ||
        null,

      symbol:
        verification.symbol ||
        null
    });

    if (
      !verification.validERC20
    ) {
      continue;
    }

    const usage =
      await activity(
        env,
        token,
        latest
      );

    const candidate = {
      address:
        token,

      name:
        verification.name,

      symbol:
        verification.symbol,

      decimals:
        verification.decimals,

      totalSupply:
        verification.totalSupply,

      validERC20:
        true,

      launchEvidence:
        !!raw.launchEvidence,

      v4Evidence:
        !!raw.v4Evidence,

      source:
        raw.source,

      contract:
        raw.contract,

      txHash:
        raw.txHash,

      blockNumber:
        raw.blockNumber,

      transfers:
        usage.transfers,

      wallets:
        usage.wallets,

      activityRpcError:
        usage.rpcError ||
        null
    };

    candidate.score =
      score(candidate);

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  const qualifying =
    candidates.filter(
      x =>
        x.score >=
          SCORE_THRESHOLD &&
        x.validERC20 ===
          true &&
        isValidToken(
          x.address
        )
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying.length
  ) {
    telegramResult =
      await telegram(
        env,
        qualifying[0]
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
        start,

      latestBlock:
        latest,

      discoveryWindow: {
        fromBlock:
          discovery.fromBlock,

        toBlock:
          discovery.toBlock,

        blocks:
          discovery.blocks
      },

      launchpadDiscovery: {
        contractsChecked:
          discovery.calls,

        logsFound:
          discovery.observations.reduce(
            (
              total,
              item
            ) =>
              total +
              item.logsFound,
            0
          ),

        candidatesExtracted:
          discovery.candidates.length,

        observations:
          discovery.observations
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

        rpcError:
          v4.rpcError ||
          null
      },

      uniqueTokenCandidates:
        candidateMap.size,

      tokenValidationChecks:
        validationResults.length,

      validERC20Tokens:
        candidates.length,

      validationResults,

      candidates,

      qualifyingCandidates:
        qualifying.length,

      telegramCandidates:
        qualifying.length,

      telegram:
        telegramResult,

      dataIntegrity: {
        noFabricatedMetrics:
          true,

        zeroAddressProtection:
          true,

        boundedRPCWorkload:
          true,

        sequentialContractDiscovery:
          true,

        rpcDiagnostic:
          "/rpc-test",

        tokenContract:
          "ERC20_CALL_VERIFIED",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

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
        "V58_RPC_DIAGNOSTIC_VERIFIED_TOKEN_HUNTER",

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


/* =========================================================
   HEALTH
========================================================= */

async function health(env) {
  let block =
    null;

  let status =
    "UNKNOWN";

  try {
    block =
      await latestBlock(
        env
      );

    status =
      "CONNECTED";

  } catch {
    status =
      "ERROR";
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
      "/test-telegram",
      "/rpc-test"
    ],

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID,

      rpc:
        "ALCHEMY_ROBINHOOD_MAINNET"
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

    rpcStatus:
      status,

    latestBlock:
      block,

    rpcTimeoutMs:
      RPC_TIMEOUT_MS,

    maxDiscoveryCalls:
      MAX_DISCOVERY_CALLS,

    maxTokenChecks:
      MAX_TOKEN_CHECKS,

    telegram: {
      configured:
        !!env.TELEGRAM_BOT_TOKEN &&
        !!env.TELEGRAM_CHAT_ID,

      automaticCalls:
        true,

      minimumScore:
        SCORE_THRESHOLD,

      tokenVerification:
        "REQUIRED",

      zeroAddressProtection:
        true
    },

    architecture:
      "V58_RPC_DIAGNOSTIC_VERIFIED_TOKEN_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   ZERO ADDRESS TEST
========================================================= */

async function telegramTest(env) {
  const result =
    await telegram(
      env,
      {
        address:
          ZERO,

        validERC20:
          true,

        score:
          100,

        name:
          "ZERO",

        symbol:
          "ZERO",

        source:
          "SAFETY_TEST",

        transfers:
          0,

        wallets:
          0
      }
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.sent === false,

    safetyTest:
      "ZERO_ADDRESS_BLOCKED",

    response:
      result,

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   RESPONSE
========================================================= */

function response(
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


/* =========================================================
   WORKER
========================================================= */

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

      /* HEALTH */

      if (
        url.pathname ===
        "/health"
      ) {
        return response(
          await health(
            env
          )
        );
      }


      /* RPC DIAGNOSTIC */

      if (
        url.pathname ===
        "/rpc-test"
      ) {
        return response(
          await rpcTest(
            env
          )
        );
      }


      /* SCAN */

      if (
        url.pathname ===
        "/scan"
      ) {
        return response(
          await runScan(
            env
          )
        );
      }


      /* TELEGRAM SAFETY TEST */

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return response(
          await telegramTest(
            env
          )
        );
      }


      /* ROOT */

      return response({
        agent:
          "Robinhood Chain Meme Hunter",

        version:
          VERSION,

        status:
          "ONLINE",

        routes: [
          "/health",
          "/rpc-test",
          "/scan",
          "/test-telegram"
        ]
      });

    } catch (error) {

      return response(
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
