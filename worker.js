const VERSION = "V60";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

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

const DISCOVERY_BLOCKS = 10;
const V4_BLOCKS = 10;
const ACTIVITY_BLOCKS = 10;

const RPC_TIMEOUT_MS = 2500;

const MAX_TOKEN_CHECKS = 5;


/* =========================================================
   HELPERS
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
   SAFE BIGINT
========================================================= */

function safeBigInt(value) {
  if (
    typeof value !== "string" ||
    value === "" ||
    value === "0x" ||
    value === "0X"
  ) {
    return null;
  }

  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

function safeBigIntString(value) {
  const result =
    safeBigInt(value);

  return result === null
    ? null
    : result.toString();
}

function safeNumber(value) {
  const result =
    safeBigInt(value);

  if (result === null) {
    return null;
  }

  const number =
    Number(result);

  return Number.isFinite(number)
    ? number
    : null;
}


/* =========================================================
   RPC PROVIDERS
========================================================= */

async function fetchRpc(
  endpoint,
  method,
  params
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
        `HTTP ${response.status}`
      );
    }

    if (data.error) {
      throw new Error(
        data.error.message ||
        "RPC error"
      );
    }

    return {
      result:
        data.result,

      provider:
        endpoint === PUBLIC_RPC
          ? "ROBINHOOD_PUBLIC_RPC"
          : "ALCHEMY"
    };

  } finally {
    clearTimeout(timer);
  }
}


/* =========================================================
   RPC WITH FALLBACK
========================================================= */

async function rpc(
  env,
  method,
  params = []
) {
  let publicError = null;

  try {
    return await fetchRpc(
      PUBLIC_RPC,
      method,
      params
    );
  } catch (error) {
    publicError =
      error?.message ||
      String(error);
  }

  if (
    env.ALCHEMY_API_KEY
  ) {
    const endpoint =
      `https://robinhood-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

    try {
      return await fetchRpc(
        endpoint,
        method,
        params
      );
    } catch (error) {
      throw new Error(
        `PUBLIC_RPC: ${publicError}; ALCHEMY: ${
          error?.message ||
          String(error)
        }`
      );
    }
  }

  throw new Error(
    `PUBLIC_RPC: ${publicError}`
  );
}


/* =========================================================
   BLOCK
========================================================= */

async function latestBlock(env) {
  const rpcResult =
    await rpc(
      env,
      "eth_blockNumber"
    );

  const block =
    safeBigInt(
      rpcResult.result
    );

  if (block === null) {
    throw new Error(
      "Invalid block number returned by RPC"
    );
  }

  return Number(block);
}


/* =========================================================
   LOG QUERY
========================================================= */

async function getContractLogs(
  env,
  contract,
  fromBlock,
  toBlock
) {
  if (!isAddress(contract)) {
    return {
      logs: [],
      error:
        "INVALID_CONTRACT",
      provider: null
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
        Array.isArray(
          result.result
        )
          ? result.result
          : [],

      error: null,

      provider:
        result.provider
    };

  } catch (error) {
    return {
      logs: [],

      error:
        error?.message ||
        String(error),

      provider: null
    };
  }
}


/* =========================================================
   LOG ADDRESS EXTRACTION
========================================================= */

function addressesFromLog(log) {
  const found = [];

  if (
    Array.isArray(log?.topics)
  ) {
    for (
      const topic of log.topics
    ) {
      const address =
        topicAddress(topic);

      if (address) {
        found.push(address);
      }
    }
  }

  if (
    typeof log?.data === "string" &&
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

  for (
    const contract of
      DISCOVERY_CONTRACTS
  ) {
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
    fromBlock: from,

    toBlock: latest,

    blocks:
      latest - from + 1,

    observations,

    candidates:
      [...candidates.values()]
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

  const swapEvents =
    [];

  for (
    const log of
      result.logs
  ) {
    if (
      !Array.isArray(
        log.topics
      )
    ) {
      continue;
    }

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

  return {
    fromBlock: from,

    toBlock: latest,

    rawLogs:
      result.logs.length,

    initializeEvents,

    swapEvents,

    rpcError:
      result.error,

    provider:
      result.provider
  };
}


/* =========================================================
   ETH CALL
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
    const result =
      await rpc(
        env,
        "eth_call",
        [
          {
            to: address,
            data
          },
          "latest"
        ]
      );

    /*
      IMPORTANT:
      Empty 0x is valid RPC output for
      a failed/missing contract method.

      NEVER pass it to BigInt().
    */

    if (
      typeof result.result !==
        "string" ||
      result.result === "0x" ||
      result.result === "0X"
    ) {
      return null;
    }

    return result.result;

  } catch {
    return null;
  }
}


/* =========================================================
   STRING DECODER
========================================================= */

function decodeText(value) {
  if (
    typeof value !== "string" ||
    value.length <= 2 ||
    value === "0x" ||
    value === "0X"
  ) {
    return null;
  }

  try {
    const clean =
      value.slice(2);

    if (
      clean.length < 64
    ) {
      return null;
    }

    /*
      Standard dynamic ABI string.
    */

    const offset =
      safeNumber(
        "0x" +
        clean.slice(
          0,
          64
        )
      );

    if (
      offset === null
    ) {
      return null;
    }

    const start =
      offset * 2;

    if (
      start + 64 >
      clean.length
    ) {
      return null;
    }

    const length =
      safeNumber(
        "0x" +
        clean.slice(
          start,
          start + 64
        )
      );

    if (
      length === null ||
      length < 0
    ) {
      return null;
    }

    const dataStart =
      start + 64;

    const dataEnd =
      dataStart +
      length * 2;

    if (
      dataEnd >
      clean.length
    ) {
      return null;
    }

    const bytes = [];

    for (
      let i =
        dataStart;
      i < dataEnd;
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
        Number.isNaN(byte)
      ) {
        return null;
      }

      bytes.push(byte);
    }

    const text =
      new TextDecoder()
        .decode(
          new Uint8Array(bytes)
        )
        .replace(
          /\0/g,
          ""
        )
        .trim();

    return text || null;

  } catch {
    return null;
  }
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
      validERC20: false,

      reason:
        "ZERO_OR_INVALID_ADDRESS"
    };
  }

  const nameRaw =
    await call(
      env,
      token,
      "0x06fdde03"
    );

  const symbolRaw =
    await call(
      env,
      token,
      "0x95d89b41"
    );

  const decimalsRaw =
    await call(
      env,
      token,
      "0x313ce567"
    );

  const supplyRaw =
    await call(
      env,
      token,
      "0x18160ddd"
    );

  const name =
    decodeText(nameRaw);

  const symbol =
    decodeText(symbolRaw);

  const decimals =
    safeNumber(
      decimalsRaw
    );

  const totalSupply =
    safeBigIntString(
      supplyRaw
    );

  const valid =
    !!name &&
    !!symbol &&
    decimals !== null &&
    totalSupply !== null;

  return {
    validERC20:
      valid,

    name,

    symbol,

    decimals,

    totalSupply,

    reason:
      valid
        ? null
        : "ERC20_METHODS_NOT_VERIFIED"
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
      wallets: 0,
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
      latest
    );

  let transfers = 0;

  const wallets = [];

  for (
    const log of
      result.logs
  ) {
    if (
      log?.topics?.[0]
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
      fromWallet &&
      fromWallet !==
        ZERO
    ) {
      wallets.push(
        fromWallet
      );
    }

    if (
      toWallet &&
      toWallet !==
        ZERO
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
      result.error,

    provider:
      result.provider
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

async function sendTelegram(
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
      `Robinhood Chain Meme Hunter ${VERSION}`
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
      !isValidToken(
        item.token
      )
    ) {
      continue;
    }

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

  for (
    const event of
      v4.initializeEvents
  ) {
    if (
      !isValidToken(
        event.token
      )
    ) {
      continue;
    }

    const existing =
      candidateMap.get(
        event.token
      );

    if (existing) {
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

  const rawCandidates =
    [
      ...candidateMap.values()
    ].slice(
      0,
      MAX_TOKEN_CHECKS
    );

  const candidates = [];
  const validationResults = [];

  for (
    const raw of
      rawCandidates
  ) {
    const token =
      raw.token?.toLowerCase();

    if (
      !isValidToken(token)
    ) {
      continue;
    }

    let verification;

    try {
      verification =
        await verifyERC20(
          env,
          token
        );
    } catch (error) {
      verification = {
        validERC20:
          false,

        reason:
          error?.message ||
          "VERIFICATION_ERROR"
      };
    }

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
        null,

      reason:
        verification.reason ||
        null
    });

    if (
      verification.validERC20 !==
      true
    ) {
      continue;
    }

    let usage;

    try {
      usage =
        await activity(
          env,
          token,
          latest
        );
    } catch {
      usage = {
        transfers: 0,
        wallets: 0,
        rpcError:
          "ACTIVITY_ERROR"
      };
    }

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
        usage.transfers || 0,

      wallets:
        usage.wallets || 0,

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
      candidate =>
        candidate.score >=
          SCORE_THRESHOLD &&
        candidate.validERC20 ===
          true &&
        isValidToken(
          candidate.address
        )
    );

  let telegramResult = {
    sent: false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying.length > 0
  ) {
    telegramResult =
      await sendTelegram(
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
          DISCOVERY_CONTRACTS.length,

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
          null,

        provider:
          v4.provider
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
          true,

        alchemyFallback:
          true,

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
        "V60_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK_SAFE_ERC20_DECODER",

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
  let block = null;
  let status = "UNKNOWN";
  let provider = null;
  let error = null;

  try {
    const result =
      await rpc(
        env,
        "eth_blockNumber"
      );

    const parsed =
      safeBigInt(
        result.result
      );

    if (
      parsed === null
    ) {
      throw new Error(
        "Invalid block number"
      );
    }

    block =
      Number(parsed);

    status =
      "CONNECTED";

    provider =
      result.provider;

  } catch (err) {
    status =
      "ERROR";

    error =
      err?.message ||
      String(err);
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
        !!env.BLOCKSCOUT_API_KEY
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
        true
    },

    architecture:
      "V60_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK_SAFE_ERC20_DECODER",

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   RPC TEST
========================================================= */

async function rpcTest(env) {
  const latest =
    await latestBlock(
      env
    );

  const from =
    Math.max(
      0,
      latest - 2
    );

  const tests = [];

  const rangeResult =
    await getContractLogs(
      env,
      POOL_MANAGER,
      from,
      latest
    );

  tests.push({
    test:
      "pool_manager",

    success:
      rangeResult.error === null,

    provider:
      rangeResult.provider,

    logs:
      rangeResult.logs.length,

    error:
      rangeResult.error
  });

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

    fromBlock:
      from,

    toBlock:
      latest,

    blockRange:
      latest - from + 1,

    tests,

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   TELEGRAM SAFETY TEST
========================================================= */

async function telegramTest(env) {
  const result =
    await sendTelegram(
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
          "ZERO"
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

function jsonResponse(
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
        return jsonResponse(
          await health(env)
        );
      }

      if (
        url.pathname ===
        "/rpc-test"
      ) {
        return jsonResponse(
          await rpcTest(env)
        );
      }

      if (
        url.pathname ===
        "/scan"
      ) {
        return jsonResponse(
          await runScan(env)
        );
      }

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return jsonResponse(
          await telegramTest(env)
        );
      }

      return jsonResponse({
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
      return jsonResponse(
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
