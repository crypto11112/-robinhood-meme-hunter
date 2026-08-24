const VERSION = "V62";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const ALCHEMY_RPC_PREFIX =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

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

const HIGH_RISK_THRESHOLD = 60;

const DISCOVERY_BLOCKS = 10;

const V4_BLOCKS = 10;

const ACTIVITY_BLOCKS = 50;

const RPC_TIMEOUT_MS = 2500;

const MAX_DISCOVERY_CALLS = 8;

const MAX_TOKEN_CHECKS = 5;

const MAX_ACTIVITY_LOGS = 500;


/* =========================================================
   ADDRESS HELPERS
========================================================= */

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    value || ""
  );
}

function normalizeAddress(value) {
  if (!isAddress(value)) {
    return null;
  }

  return value.toLowerCase();
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


/* =========================================================
   HEX / ABI HELPERS
========================================================= */

function cleanHex(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("0x")
  ) {
    return null;
  }

  return value.slice(2);
}

function hexWord(value) {
  const clean = cleanHex(value);

  if (
    !clean ||
    clean.length < 64
  ) {
    return null;
  }

  return clean.slice(0, 64);
}

function wordToAddress(value) {
  const word =
    hexWord(value);

  if (!word) {
    return null;
  }

  const address =
    "0x" +
    word.slice(24);

  return isValidToken(address)
    ? address.toLowerCase()
    : null;
}

function safeBigInt(value) {
  if (
    typeof value !== "string" ||
    value === "" ||
    value === "0x" ||
    value === "0x0"
  ) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function safeNumber(value) {
  const bigint =
    safeBigInt(value);

  if (bigint === null) {
    return null;
  }

  const number =
    Number(bigint);

  return Number.isFinite(number)
    ? number
    : null;
}


/* =========================================================
   RPC PROVIDERS
========================================================= */

function providerList(env) {
  const providers = [];

  if (
    env.ALCHEMY_API_KEY
  ) {
    providers.push({
      name: "ALCHEMY",
      endpoint:
        ALCHEMY_RPC_PREFIX +
        env.ALCHEMY_API_KEY
    });
  }

  providers.push({
    name:
      "ROBINHOOD_PUBLIC_RPC",
    endpoint:
      PUBLIC_RPC
  });

  return providers;
}

async function rpcRequest(
  provider,
  method,
  params = []
) {
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
        provider.endpoint,
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
        `RPC_INVALID_JSON_HTTP_${response.status}`
      );
    }

    if (!response.ok) {
      throw new Error(
        `RPC_HTTP_${response.status}`
      );
    }

    if (data.error) {
      throw new Error(
        data.error.message ||
        "RPC_ERROR"
      );
    }

    return data.result;

  } finally {
    clearTimeout(timer);
  }
}


/*
  Provider fallback:
  Alchemy first when configured.
  Robinhood Public RPC second.

  This avoids treating a failed provider as
  a legitimate empty result.
*/

async function rpc(
  env,
  method,
  params = []
) {
  const providers =
    providerList(env);

  let lastError =
    null;

  for (
    const provider of providers
  ) {
    try {
      const result =
        await rpcRequest(
          provider,
          method,
          params
        );

      return {
        result,
        provider:
          provider.name,
        error:
          null
      };

    } catch (error) {
      lastError =
        error?.message ||
        String(error);
    }
  }

  return {
    result: null,
    provider: null,
    error:
      lastError ||
      "ALL_RPC_PROVIDERS_FAILED"
  };
}


/* =========================================================
   BLOCK
========================================================= */

async function latestBlock(env) {
  const response =
    await rpc(
      env,
      "eth_blockNumber"
    );

  if (
    response.error ||
    !response.result
  ) {
    throw new Error(
      response.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  const block =
    safeBigInt(
      response.result
    );

  if (block === null) {
    throw new Error(
      "INVALID_BLOCK_NUMBER"
    );
  }

  return Number(block);
}


/* =========================================================
   LOG QUERY
========================================================= */

async function getLogs(
  env,
  filter
) {
  const response =
    await rpc(
      env,
      "eth_getLogs",
      [filter]
    );

  return {
    logs:
      Array.isArray(
        response.result
      )
        ? response.result
        : [],

    provider:
      response.provider,

    error:
      response.error
  };
}

function blockHex(block) {
  return (
    "0x" +
    Number(block).toString(16)
  );
}

async function getContractLogs(
  env,
  contract,
  fromBlock,
  toBlock,
  topics = undefined
) {
  if (
    !isAddress(contract)
  ) {
    return {
      logs: [],
      provider: null,
      error:
        "INVALID_CONTRACT"
    };
  }

  const filter = {
    address:
      contract,

    fromBlock:
      blockHex(fromBlock),

    toBlock:
      blockHex(toBlock)
  };

  if (topics) {
    filter.topics =
      topics;
  }

  return getLogs(
    env,
    filter
  );
}


/* =========================================================
   V4 INITIALIZE EVENT
========================================================= */

/*
  Uniswap v4 Initialize event:

  Initialize(
      bytes32 indexed id,
      Currency indexed currency0,
      Currency indexed currency1,
      uint24 fee,
      int24 tickSpacing,
      IHooks hooks,
      uint160 sqrtPriceX96,
      int24 tick
  )

  The important discovery fields are:

  topics[1] = pool id
  topics[2] = currency0
  topics[3] = currency1

  We intentionally do NOT scan every word for addresses.
*/

function decodeV4Initialize(log) {
  if (
    !Array.isArray(log?.topics)
  ) {
    return null;
  }

  if (
    log.topics.length < 4
  ) {
    return null;
  }

  const poolId =
    log.topics[1] ||
    null;

  const currency0 =
    wordToAddress(
      log.topics[2]
    );

  const currency1 =
    wordToAddress(
      log.topics[3]
    );

  return {
    poolId,

    currency0,

    currency1,

    txHash:
      log.transactionHash ||
      null,

    blockNumber:
      log.blockNumber ||
      null
  };
}


/*
  A zero currency represents the native ETH side
  of the pair.

  We only return actual contract addresses.
*/

function tokenCurrenciesFromInitialize(
  decoded
) {
  const found = [];

  if (
    isValidToken(
      decoded.currency0
    )
  ) {
    found.push({
      token:
        decoded.currency0,

      side:
        "currency0"
    });
  }

  if (
    isValidToken(
      decoded.currency1
    )
  ) {
    found.push({
      token:
        decoded.currency1,

      side:
        "currency1"
    });
  }

  return found;
}


/* =========================================================
   LAUNCHPAD DISCOVERY
========================================================= */

function extractConservativeLogAddresses(
  log
) {
  const found = [];

  /*
    Only indexed topics are considered here.
    We do NOT scan arbitrary data words because that
    produced false token candidates in V61.
  */

  if (
    Array.isArray(log?.topics)
  ) {
    for (
      const topic of
        log.topics
    ) {
      const address =
        wordToAddress(
          topic
        );

      if (
        address
      ) {
        found.push(
          address
        );
      }
    }
  }

  return unique(found);
}

async function discoverLaunchpads(
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

      provider:
        result.provider,

      error:
        result.error
    });

    for (
      const log of
        result.logs
    ) {
      const addresses =
        extractConservativeLogAddresses(
          log
        );

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
          DISCOVERY_CONTRACTS
            .map(x =>
              x.toLowerCase()
            )
            .includes(
              address
            )
        ) {
          continue;
        }

        if (
          !candidates.has(
            address
          )
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
      [
        ...candidates.values()
      ]
  };
}


/* =========================================================
   V4 DISCOVERY
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

  const tokenCandidates =
    new Map();

  if (
    !result.error
  ) {
    for (
      const log of
        result.logs
    ) {
      const decoded =
        decodeV4Initialize(
          log
        );

      if (
        !decoded
      ) {
        continue;
      }

      const currencies =
        tokenCurrenciesFromInitialize(
          decoded
        );

      if (
        currencies.length === 0
      ) {
        continue;
      }

      initializeEvents.push({
        poolId:
          decoded.poolId,

        currency0:
          decoded.currency0,

        currency1:
          decoded.currency1,

        txHash:
          decoded.txHash,

        blockNumber:
          decoded.blockNumber
      });

      for (
        const currency of
          currencies
      ) {
        const token =
          currency.token;

        const existing =
          tokenCandidates.get(
            token
          );

        if (
          existing
        ) {
          existing.poolCount++;
          continue;
        }

        tokenCandidates.set(
          token,
          {
            token,

            source:
              "V4_INITIALIZE",

            contract:
              POOL_MANAGER,

            poolId:
              decoded.poolId,

            txHash:
              decoded.txHash,

            blockNumber:
              decoded.blockNumber,

            poolCount:
              1
          }
        );
      }
    }
  }

  return {
    poolManager:
      POOL_MANAGER,

    fromBlock:
      from,

    toBlock:
      latest,

    rawLogs:
      result.logs.length,

    initializeEvents,

    swapEvents:
      0,

    tokenCandidates:
      [
        ...tokenCandidates.values()
      ],

    provider:
      result.provider,

    rpcError:
      result.error
  };
}


/* =========================================================
   ETH_CALL
========================================================= */

async function ethCall(
  env,
  address,
  data
) {
  if (
    !isValidToken(address)
  ) {
    return {
      result: null,
      provider: null,
      error:
        "INVALID_TOKEN_ADDRESS"
    };
  }

  return rpc(
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
}


/* =========================================================
   BYTECODE
========================================================= */

async function getCode(
  env,
  address
) {
  const response =
    await rpc(
      env,
      "eth_getCode",
      [
        address,
        "latest"
      ]
    );

  if (
    response.error
  ) {
    return {
      hasCode:
        false,

      code:
        null,

      provider:
        response.provider,

      error:
        response.error
    };
  }

  const code =
    response.result;

  const hasCode =
    typeof code ===
      "string" &&
    code !== "0x" &&
    code.length > 2;

  return {
    hasCode,

    code:
      hasCode
        ? code
        : null,

    provider:
      response.provider,

    error:
      null
  };
}


/* =========================================================
   ABI DECODING
========================================================= */

function decodeAbiString(
  value
) {
  if (
    typeof value !==
      "string" ||
    !value.startsWith("0x")
  ) {
    return null;
  }

  const clean =
    value.slice(2);

  if (
    clean.length === 0
  ) {
    return null;
  }

  /*
    Standard dynamic string:
    offset | length | bytes
  */

  if (
    clean.length >= 128
  ) {
    try {
      const offset =
        safeBigInt(
          "0x" +
          clean.slice(
            0,
            64
          )
        );

      if (
        offset !== null
      ) {
        const start =
          Number(offset) * 2;

        if (
          start + 64 <=
          clean.length
        ) {
          const length =
            safeBigInt(
              "0x" +
              clean.slice(
                start,
                start + 64
              )
            );

          if (
            length !== null
          ) {
            const dataStart =
              start + 64;

            const dataEnd =
              dataStart +
              Number(length) *
                2;

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

              const text =
                new TextDecoder()
                  .decode(
                    new Uint8Array(
                      bytes
                    )
                  )
                  .replace(
                    /\0/g,
                    ""
                  )
                  .trim();

              if (
                text
              ) {
                return text;
              }
            }
          }
        }
      }
    } catch {}
  }

  /*
    bytes32 fallback.
  */

  if (
    clean.length >= 64
  ) {
    try {
      const bytes =
        [];

      for (
        let i = 0;
        i < 64;
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

        if (
          byte === 0
        ) {
          break;
        }

        bytes.push(
          byte
        );
      }

      const text =
        new TextDecoder()
          .decode(
            new Uint8Array(
              bytes
            )
          )
          .trim();

      if (
        text
      ) {
        return text;
      }
    } catch {}
  }

  return null;
}

function decodeUint256(
  value
) {
  const bigint =
    safeBigInt(value);

  if (
    bigint === null
  ) {
    return null;
  }

  return bigint;
}


/* =========================================================
   ERC20 VERIFICATION
========================================================= */

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

  const code =
    await getCode(
      env,
      token
    );

  if (
    !code.hasCode
  ) {
    return {
      validERC20:
        false,

      reason:
        code.error ||
        "NO_CONTRACT_BYTECODE",

      hasCode:
        false
    };
  }

  /*
    Standard ERC20 calls.
  */

  const [
    nameCall,
    symbolCall,
    decimalsCall,
    supplyCall
  ] =
    await Promise.all([
      ethCall(
        env,
        token,
        "0x06fdde03"
      ),

      ethCall(
        env,
        token,
        "0x95d89b41"
      ),

      ethCall(
        env,
        token,
        "0x313ce567"
      ),

      ethCall(
        env,
        token,
        "0x18160ddd"
      )
    ]);

  const name =
    decodeAbiString(
      nameCall.result
    );

  const symbol =
    decodeAbiString(
      symbolCall.result
    );

  const decimals =
    decodeUint256(
      decimalsCall.result
    );

  const totalSupply =
    decodeUint256(
      supplyCall.result
    );

  /*
    ERC20 verification is deliberately tolerant
    about name/symbol because some legitimate tokens
    return bytes32 or have non-standard metadata.

    Decimals + totalSupply + contract bytecode are
    stronger structural checks.
  */

  const structural =
    code.hasCode &&
    decimals !== null &&
    totalSupply !== null;

  const metadata =
    !!name ||
    !!symbol;

  const valid =
    structural &&
    metadata;

  return {
    validERC20:
      valid,

    reason:
      valid
        ? "VERIFIED"
        : "ERC20_METHODS_NOT_VERIFIED",

    hasCode:
      code.hasCode,

    name:
      name ||
      null,

    symbol:
      symbol ||
      null,

    decimals:
      decimals !== null
        ? Number(
            decimals
          )
        : null,

    totalSupply:
      totalSupply !== null
        ? totalSupply.toString()
        : null,

    providers: {
      bytecode:
        code.provider,

      name:
        nameCall.provider,

      symbol:
        symbolCall.provider,

      decimals:
        decimalsCall.provider,

      totalSupply:
        supplyCall.provider
    }
  };
}


/* =========================================================
   OWNER / ADMIN RISK
========================================================= */

async function checkOwner(
  env,
  token
) {
  /*
    Ownable owner()
  */

  const ownerCall =
    await ethCall(
      env,
      token,
      "0x8da5cb5b"
    );

  if (
    !ownerCall.result ||
    ownerCall.result ===
      "0x"
  ) {
    return {
      detected:
        false,

      owner:
        null,

      renounced:
        false,

      error:
        ownerCall.error ||
        null
    };
  }

  const owner =
    wordToAddress(
      ownerCall.result
    );

  return {
    detected:
      !!owner,

    owner:
      owner,

    renounced:
      !!owner &&
      owner === ZERO,

    error:
      owner
        ? null
        : "OWNER_DECODE_FAILED"
  };
}


/* =========================================================
   SUSPICIOUS FUNCTION PROBES
========================================================= */

async function probeFunction(
  env,
  token,
  selector
) {
  const response =
    await ethCall(
      env,
      token,
      selector
    );

  return {
    success:
      !!response.result &&
      response.result !== "0x",

    result:
      response.result ||
      null,

    provider:
      response.provider,

    error:
      response.error
  };
}

async function riskProbes(
  env,
  token
) {
  const [
    owner,
    paused,
    tradingOpen,
    maxTx,
    maxWallet
  ] =
    await Promise.all([
      checkOwner(
        env,
        token
      ),

      probeFunction(
        env,
        token,
        "0x5c975abb"
      ),

      probeFunction(
        env,
        token,
        "0x8f9b7f7e"
      ),

      probeFunction(
        env,
        token,
        "0x7e0c4c4f"
      ),

      probeFunction(
        env,
        token,
        "0x6f307dc3"
      )
    ]);

  return {
    owner,

    probes: {
      paused:
        paused.success,

      tradingOpen:
        tradingOpen.success,

      maxTx:
        maxTx.success,

      maxWallet:
        maxWallet.success
    }
  };
}


/* =========================================================
   TRANSFER ACTIVITY
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
      transfers:
        0,

      wallets:
        0,

      buys:
        0,

      sells:
        0,

      rpcError:
        "INVALID_TOKEN"
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
      latest,
      [
        TRANSFER_TOPIC
      ]
    );

  let transfers = 0;

  const wallets =
    [];

  const uniqueTxs =
    [];

  for (
    const log of
      result.logs
        .slice(
          0,
          MAX_ACTIVITY_LOGS
        )
  ) {
    if (
      log.topics?.[0]
        ?.toLowerCase() !==
      TRANSFER_TOPIC
    ) {
      continue;
    }

    transfers++;

    if (
      log.transactionHash
    ) {
      uniqueTxs.push(
        log.transactionHash
      );
    }

    const fromWallet =
      wordToAddress(
        log.topics?.[1]
      );

    const toWallet =
      wordToAddress(
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
      unique(wallets)
        .length,

    transactions:
      unique(uniqueTxs)
        .length,

    buys:
      null,

    sells:
      null,

    provider:
      result.provider,

    rpcError:
      result.error
  };
}


/* =========================================================
   RUG RISK SCORE
========================================================= */

function rugRiskScore(
  candidate
) {
  let risk = 0;

  const reasons =
    [];

  /*
    No bytecode = extremely suspicious,
    although candidate should normally already
    have failed verification.
  */

  if (
    candidate.hasCode === false
  ) {
    risk += 60;

    reasons.push(
      "NO_CONTRACT_BYTECODE"
    );
  }

  /*
    Metadata failure.
  */

  if (
    !candidate.name ||
    !candidate.symbol
  ) {
    risk += 10;

    reasons.push(
      "MISSING_TOKEN_METADATA"
    );
  }

  /*
    Extremely small supply is not automatically
    a rug, so only a mild penalty is applied.
  */

  if (
    candidate.totalSupply === "0"
  ) {
    risk += 50;

    reasons.push(
      "ZERO_TOTAL_SUPPLY"
    );
  }

  /*
    Owner detected is NOT itself a rug.
    It simply means the token may retain admin control.
  */

  if (
    candidate.ownerDetected
  ) {
    risk += 8;

    reasons.push(
      "OWNER_CONTROL_DETECTED"
    );
  }

  /*
    Paused selector responding is only a warning.
  */

  if (
    candidate.pausedProbe
  ) {
    risk += 8;

    reasons.push(
      "PAUSE_FUNCTION_DETECTED"
    );
  }

  /*
    No recent transfers means we have little
    evidence of actual activity.
  */

  if (
    candidate.transfers === 0
  ) {
    risk += 12;

    reasons.push(
      "NO_RECENT_TRANSFER_ACTIVITY"
    );
  }

  /*
    A token with only one or two wallets should
    not automatically be called a rug, but this
    is weak distribution evidence.
  */

  if (
    candidate.wallets > 0 &&
    candidate.wallets < 3
  ) {
    risk += 8;

    reasons.push(
      "VERY_LOW_OBSERVED_WALLET_ACTIVITY"
    );
  }

  return {
    score:
      Math.min(
        100,
        risk
      ),

    level:
      risk >= 60
        ? "HIGH"
        : risk >= 30
          ? "MEDIUM"
          : "LOW",

    reasons
  };
}


/* =========================================================
   OPPORTUNITY SCORE
========================================================= */

function opportunityScore(
  candidate
) {
  let score = 0;

  const reasons =
    [];

  /*
    Verified contract.
  */

  if (
    candidate.validERC20
  ) {
    score += 25;

    reasons.push(
      "VERIFIED_ERC20"
    );
  }

  /*
    Fresh pool discovery.
  */

  if (
    candidate.v4Evidence
  ) {
    score += 20;

    reasons.push(
      "FRESH_V4_POOL_ACTIVITY"
    );
  }

  if (
    candidate.launchEvidence
  ) {
    score += 15;

    reasons.push(
      "LAUNCHPAD_ACTIVITY"
    );
  }

  /*
    Transfer activity.
  */

  if (
    candidate.transfers >= 20
  ) {
    score += 20;

    reasons.push(
      "STRONG_RECENT_TRANSFER_ACTIVITY"
    );

  } else if (
    candidate.transfers >= 5
  ) {
    score += 12;

    reasons.push(
      "RECENT_TRANSFER_ACTIVITY"
    );

  } else if (
    candidate.transfers > 0
  ) {
    score += 5;

    reasons.push(
      "SOME_RECENT_ACTIVITY"
    );
  }

  /*
    Wallet activity.
  */

  if (
    candidate.wallets >= 20
  ) {
    score += 15;

    reasons.push(
      "BROAD_OBSERVED_WALLET_ACTIVITY"
    );

  } else if (
    candidate.wallets >= 5
  ) {
    score += 10;

    reasons.push(
      "MULTIPLE_OBSERVED_WALLETS"
    );

  } else if (
    candidate.wallets > 0
  ) {
    score += 3;
  }

  /*
    Metadata.
  */

  if (
    candidate.name &&
    candidate.symbol
  ) {
    score += 5;

    reasons.push(
      "TOKEN_METADATA_PRESENT"
    );
  }

  return {
    score:
      Math.min(
        100,
        score
      ),

    reasons
  };
}


/* =========================================================
   FINAL RISK DECISION
========================================================= */

function riskDecision(
  candidate
) {
  const highRisk =
    candidate.rugRiskScore >=
    HIGH_RISK_THRESHOLD;

  const verified =
    candidate.validERC20 ===
    true;

  const validAddress =
    isValidToken(
      candidate.address
    );

  return {
    highRisk,

    verified,

    validAddress,

    telegramEligible:
      verified &&
      validAddress &&
      !highRisk
  };
}


/* =========================================================
   TELEGRAM
========================================================= */

async function telegram(
  env,
  candidate
) {
  /*
    Hard safety checks.
  */

  if (
    !isValidToken(
      candidate.address
    )
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
    };
  }

  if (
    candidate.validERC20 !==
    true
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_UNVERIFIED_ERC20"
    };
  }

  if (
    candidate.rugRiskScore >=
    HIGH_RISK_THRESHOLD
  ) {
    return {
      sent:
        false,

      reason:
        "BLOCKED_HIGH_RUG_RISK",

      rugRiskScore:
        candidate.rugRiskScore
    };
  }

  if (
    candidate.opportunityScore <
    SCORE_THRESHOLD
  ) {
    return {
      sent:
        false,

      reason:
        "OPPORTUNITY_SCORE_BELOW_THRESHOLD",

      opportunityScore:
        candidate.opportunityScore
    };
  }

  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      sent:
        false,

      reason:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }

  const riskReasons =
    candidate.rugRiskReasons
      ?.length
      ? candidate.rugRiskReasons
          .slice(
            0,
            4
          )
          .join(", ")
      : "No major heuristic warnings";

  const opportunityReasons =
    candidate.opportunityReasons
      ?.length
      ? candidate.opportunityReasons
          .slice(
            0,
            4
          )
          .join(", ")
      : "Limited evidence";

  const text =
    [
      "🚨 ROBINHOOD CHAIN MEME HUNTER V62",

      "",

      `⭐ Opportunity Score: ${candidate.opportunityScore}/100`,

      `🛡️ Rug Risk: ${candidate.rugRiskScore}/100 (${candidate.rugRiskLevel})`,

      "",

      `🪙 ${candidate.name || "Unknown Token"}`,

      `🔹 ${candidate.symbol || "UNKNOWN"}`,

      "",

      `📍 ${candidate.address}`,

      "",

      `🚀 Source: ${candidate.source}`,

      `📊 Transfers: ${candidate.transfers}`,

      `👛 Wallets: ${candidate.wallets}`,

      "",

      "🧠 Opportunity evidence:",

      opportunityReasons,

      "",

      "🛡️ Risk evidence:",

      riskReasons,

      "",

      "✅ Verified contract",

      "✅ Non-zero address",

      "⚠️ Liquidity not independently verified",

      "⚠️ Market cap not independently verified",

      "⚠️ Holder concentration not independently verified",

      "",

      "V62 is a screening system, not a guarantee against rugs."
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
        sent:
          false,

        reason:
          result.description ||
          "TELEGRAM_SEND_FAILED"
      };
    }

    return {
      sent:
        true,

      messageId:
        result.result?.message_id ||
        null
    };

  } catch (error) {
    return {
      sent:
        false,

      reason:
        error?.message ||
        "TELEGRAM_REQUEST_FAILED"
    };
  }
}


/* =========================================================
   SCAN
========================================================= */

async function runScan(
  env
) {
  const start =
    Date.now();

  const latest =
    await latestBlock(
      env
    );

  const discovery =
    await discoverLaunchpads(
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

  /*
    Launchpad candidates.
  */

  for (
    const item of
      discovery.candidates
  ) {
    const token =
      normalizeAddress(
        item.token
      );

    if (
      !isValidToken(token)
    ) {
      continue;
    }

    candidateMap.set(
      token,
      {
        ...item,

        token,

        launchEvidence:
          true,

        v4Evidence:
          false
      }
    );
  }

  /*
    Correctly decoded V4 currencies.
  */

  for (
    const item of
      v4.tokenCandidates
  ) {
    const token =
      normalizeAddress(
        item.token
      );

    if (
      !isValidToken(token)
    ) {
      continue;
    }

    const existing =
      candidateMap.get(
        token
      );

    if (
      existing
    ) {
      existing.v4Evidence =
        true;

      existing.poolCount =
        Math.max(
          existing.poolCount ||
            0,
          item.poolCount ||
            1
        );

      if (
        !existing.txHash
      ) {
        existing.txHash =
          item.txHash;
      }

      if (
        !existing.blockNumber
      ) {
        existing.blockNumber =
          item.blockNumber;
      }

    } else {
      candidateMap.set(
        token,
        {
          token,

          source:
            item.source,

          contract:
            item.contract,

          poolId:
            item.poolId,

          txHash:
            item.txHash,

          blockNumber:
            item.blockNumber,

          poolCount:
            item.poolCount ||
            1,

          launchEvidence:
            false,

          v4Evidence:
            true
        }
      );
    }
  }

  /*
    Bound candidate validation.
  */

  const rawCandidates =
    [
      ...candidateMap.values()
    ]
      .filter(
        x =>
          isValidToken(
            x.token
          )
      )
      .slice(
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
        .toLowerCase();

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

      reason:
        verification.reason,

      hasCode:
        verification.hasCode ??
        false,

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

    const probes =
      await riskProbes(
        env,
        token
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

      hasCode:
        verification.hasCode,

      launchEvidence:
        !!raw.launchEvidence,

      v4Evidence:
        !!raw.v4Evidence,

      poolCount:
        raw.poolCount ||
        0,

      source:
        raw.source,

      contract:
        raw.contract,

      poolId:
        raw.poolId ||
        null,

      txHash:
        raw.txHash ||
        null,

      blockNumber:
        raw.blockNumber ||
        null,

      transfers:
        usage.transfers,

      wallets:
        usage.wallets,

      transactions:
        usage.transactions,

      activityProvider:
        usage.provider ||
        null,

      activityRpcError:
        usage.rpcError ||
        null,

      ownerDetected:
        probes.owner.detected,

      owner:
        probes.owner.owner,

      ownerRenounced:
        probes.owner.renounced,

      pausedProbe:
        probes.probes.paused,

      tradingOpenProbe:
        probes.probes.tradingOpen,

      maxTxProbe:
        probes.probes.maxTx,

      maxWalletProbe:
        probes.probes.maxWallet
    };

    const rug =
      rugRiskScore(
        candidate
      );

    candidate.rugRiskScore =
      rug.score;

    candidate.rugRiskLevel =
      rug.level;

    candidate.rugRiskReasons =
      rug.reasons;

    const opportunity =
      opportunityScore(
        candidate
      );

    candidate.opportunityScore =
      opportunity.score;

    candidate.opportunityReasons =
      opportunity.reasons;

    const decision =
      riskDecision(
        candidate
      );

    candidate.highRisk =
      decision.highRisk;

    candidate.telegramEligible =
      decision.telegramEligible;

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (a, b) => {
      if (
        b.opportunityScore !==
        a.opportunityScore
      ) {
        return (
          b.opportunityScore -
          a.opportunityScore
        );
      }

      return (
        a.rugRiskScore -
        b.rugRiskScore
      );
    }
  );

  const qualifying =
    candidates.filter(
      candidate =>
        candidate.opportunityScore >=
          SCORE_THRESHOLD &&

        candidate.rugRiskScore <
          HIGH_RISK_THRESHOLD &&

        candidate.validERC20 ===
          true &&

        isValidToken(
          candidate.address
        )
    );

  let telegramResult = {
    sent:
      false,

    reason:
      "NO_VERIFIED_LOW_RISK_QUALIFYING_CANDIDATE"
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
          v4.swapEvents,

        tokenCandidates:
          v4.tokenCandidates.length,

        provider:
          v4.provider,

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

        safeEmptyRPCResults:
          true,

        publicRpcPrimary:
          false,

        alchemyFallback:
          true,

        alchemyPreferred:
          !!env.ALCHEMY_API_KEY,

        sequentialTokenAnalysis:
          true,

        v4CurrencyDecoding:
          true,

        nativeCurrencyFiltered:
          true,

        tokenContract:
          "BYTECODE_AND_ERC20_METHOD_VERIFIED",

        rugRisk:
          "HEURISTIC_ON_CHAIN_RISK_SCORE",

        opportunity:
          "HEURISTIC_ON_CHAIN_OPPORTUNITY_SCORE",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_LOW_RISK_ONLY",

        walletActivity:
          "ERC20_TRANSFER_LOG_BASED",

        liquidity:
          "NOT_VERIFIED",

        marketCap:
          "NOT_VERIFIED",

        holderConcentration:
          "NOT_VERIFIED",

        smartMoney:
          "NOT_VERIFIED",

        whaleActivity:
          "NOT_VERIFIED",

        socialMomentum:
          "NOT_VERIFIED"
      },

      architecture:
        "V62_CORRECT_V4_CURRENCY_DISCOVERY_VERIFIED_TOKEN_RUG_RISK_HUNTER",

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

async function health(
  env
) {
  let block =
    null;

  let status =
    "UNKNOWN";

  let provider =
    null;

  let error =
    null;

  try {
    const response =
      await rpc(
        env,
        "eth_blockNumber"
      );

    if (
      response.error
    ) {
      throw new Error(
        response.error
      );
    }

    const parsed =
      safeBigInt(
        response.result
      );

    if (
      parsed === null
    ) {
      throw new Error(
        "INVALID_BLOCK_NUMBER"
      );
    }

    block =
      Number(parsed);

    status =
      "CONNECTED";

    provider =
      response.provider;

  } catch (e) {
    status =
      "ERROR";

    error =
      e?.message ||
      String(e);
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
      "/rpc-test",
      "/scan",
      "/test-telegram"
    ],

    chain: {
      name:
        CHAIN_NAME,

      chainId:
        CHAIN_ID,

      rpc:
        "ROBINHOOD_PUBLIC_RPC + ALCHEMY_FALLBACK"
    },

    providers: {
      robinhoodPublicRpc:
        PUBLIC_RPC,

      alchemyConfigured:
        !!env.ALCHEMY_API_KEY,

      blockscoutConfigured:
        false
    },

    rpcStatus:
      status,

    latestBlock:
      block,

    rpcProvider:
      provider,

    error,

    rpcTimeoutMs:
      RPC_TIMEOUT_MS,

    discoveryBlocks:
      DISCOVERY_BLOCKS,

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
        true,

      highRiskBlock:
        true
    },

    architecture:
      "V62_CORRECT_V4_CURRENCY_DISCOVERY_VERIFIED_TOKEN_RUG_RISK_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   RPC TEST
========================================================= */

async function rpcTest(
  env
) {
  let latest =
    null;

  try {
    latest =
      await latestBlock(
        env
      );
  } catch {}

  const from =
    latest !== null
      ? Math.max(
          0,
          latest - 2
        )
      : null;

  const to =
    latest;

  const tests =
    [];

  if (
    from !== null &&
    to !== null
  ) {
    const range =
      await getLogs(
        env,
        {
          fromBlock:
            blockHex(from),

          toBlock:
            blockHex(to)
        }
      );

    tests.push({
      test:
        "range_only",

      success:
        !range.error,

      provider:
        range.provider,

      logs:
        range.logs.length,

      error:
        range.error
    });

    const pool =
      await getContractLogs(
        env,
        POOL_MANAGER,
        from,
        to
      );

    tests.push({
      test:
        "pool_manager",

      success:
        !pool.error,

      provider:
        pool.provider,

      logs:
        pool.logs.length,

      error:
        pool.error
    });
  }

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      tests.length > 0 &&
      tests.every(
        x => x.success
      ),

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

    fromBlock:
      from,

    toBlock:
      to,

    blockRange:
      from !== null &&
      to !== null
        ? to - from + 1
        : 0,

    tests,

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   TELEGRAM ZERO-ADDRESS TEST
========================================================= */

async function telegramTest(
  env
) {
  const result =
    await telegram(
      env,
      {
        address:
          ZERO,

        validERC20:
          true,

        opportunityScore:
          100,

        rugRiskScore:
          0,

        name:
          "ZERO",

        symbol:
          "ZERO"
      }
    );

  return {
    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      result.sent ===
      false,

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
