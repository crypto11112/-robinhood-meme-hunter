const VERSION = "V59";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const ALCHEMY_RPC =
  "https://robinhood-mainnet.g.alchemy.com/v2/";

const PUBLIC_RPC =
  "https://rpc.mainnet.chain.robinhood.com";

const BLOCKSCOUT_API =
  "https://api.blockscout.com/4663/api";

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
const ACTIVITY_BLOCKS = 10;

const RPC_TIMEOUT_MS = 2500;

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
   FETCH WITH TIMEOUT
========================================================= */

async function fetchWithTimeout(
  url,
  options = {},
  timeout = RPC_TIMEOUT_MS
) {
  const controller =
    new AbortController();

  const timer =
    setTimeout(
      () => controller.abort(),
      timeout
    );

  try {
    return await fetch(
      url,
      {
        ...options,
        signal:
          controller.signal
      }
    );
  } finally {
    clearTimeout(timer);
  }
}


/* =========================================================
   JSON RPC
========================================================= */

async function rpcRequest(
  endpoint,
  method,
  params = []
) {
  const response =
    await fetchWithTimeout(
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
            id: 1,
            method,
            params
          })
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
      `Invalid RPC response HTTP ${response.status}`
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

  return data.result;
}


/* =========================================================
   RPC PROVIDER
========================================================= */

async function rpc(env, method, params = []) {

  /*
    V59 deliberately prefers the official
    Robinhood public RPC for log discovery.

    Alchemy remains available as fallback.
  */

  let publicError = null;

  try {
    return {
      result:
        await rpcRequest(
          PUBLIC_RPC,
          method,
          params
        ),

      provider:
        "ROBINHOOD_PUBLIC_RPC",

      error:
        null
    };

  } catch (error) {
    publicError =
      error?.message ||
      String(error);
  }


  if (env.ALCHEMY_API_KEY) {

    try {

      const endpoint =
        ALCHEMY_RPC +
        env.ALCHEMY_API_KEY;

      return {
        result:
          await rpcRequest(
            endpoint,
            method,
            params
          ),

        provider:
          "ALCHEMY",

        error:
          null
      };

    } catch (error) {

      return {
        result:
          null,

        provider:
          "NONE",

        error:
          `Public RPC: ${publicError}; Alchemy: ${
            error?.message ||
            String(error)
          }`
      };
    }
  }

  return {
    result:
      null,

    provider:
      "NONE",

    error:
      publicError
  };
}


/* =========================================================
   LATEST BLOCK
========================================================= */

async function latestBlock(env) {

  const result =
    await rpc(
      env,
      "eth_blockNumber"
    );

  if (
    !result.result
  ) {
    throw new Error(
      result.error ||
      "Unable to obtain block number"
    );
  }

  return {
    block:
      Number(
        BigInt(
          result.result
        )
      ),

    provider:
      result.provider
  };
}


/* =========================================================
   LOG QUERY
========================================================= */

async function getLogs(
  env,
  filter
) {

  const result =
    await rpc(
      env,
      "eth_getLogs",
      [filter]
    );

  if (
    !Array.isArray(
      result.result
    )
  ) {
    return {
      logs: [],

      provider:
        result.provider,

      error:
        result.error ||
        "eth_getLogs failed"
    };
  }

  return {
    logs:
      result.result,

    provider:
      result.provider,

    error:
      null
  };
}


/* =========================================================
   TOKEN EXTRACTION
========================================================= */

function addressesFromLog(log) {

  const found = [];

  if (
    Array.isArray(
      log.topics
    )
  ) {

    for (
      const topic of
        log.topics
    ) {

      const address =
        topicAddress(
          topic
        );

      if (address) {
        found.push(
          address
        );
      }
    }
  }

  if (
    typeof log.data ===
      "string" &&
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
        topicAddress(
          word
        );

      if (address) {
        found.push(
          address
        );
      }
    }
  }

  return unique(
    found
  );
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
      await getLogs(
        env,
        {
          address:
            contract,

          fromBlock:
            "0x" +
            from.toString(16),

          toBlock:
            "0x" +
            latest.toString(16)
        }
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
        addressesFromLog(
          log
        );

      for (
        const token of
          addresses
      ) {

        if (
          !isValidToken(
            token
          )
        ) {
          continue;
        }

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
                "LAUNCHPAD_LOG",

              contract,

              txHash:
                log.transactionHash ||
                null,

              blockNumber:
                log.blockNumber ||
                null,

              launchEvidence:
                true
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

    candidates:
      [
        ...candidates.values()
      ],

    observations
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
        DISCOVERY_BLOCKS +
        1
    );

  const result =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,

        fromBlock:
          "0x" +
          from.toString(16),

        toBlock:
          "0x" +
          latest.toString(16)
      }
    );

  const events =
    [];

  for (
    const log of
      result.logs
  ) {

    const addresses =
      addressesFromLog(
        log
      );

    for (
      const token of
        addresses
    ) {

      if (
        !isValidToken(
          token
        )
      ) {
        continue;
      }

      events.push({
        token,

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
    fromBlock:
      from,

    toBlock:
      latest,

    rawLogs:
      result.logs.length,

    events,

    provider:
      result.provider,

    rpcError:
      result.error
  };
}


/* =========================================================
   ERC20 CALL
========================================================= */

async function ethCall(
  env,
  address,
  data
) {

  if (
    !isValidToken(
      address
    )
  ) {
    return null;
  }

  const result =
    await rpc(
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

  return result.result ||
    null;
}


/* =========================================================
   STRING DECODER
========================================================= */

function decodeString(
  value
) {

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
      clean.length < 128
    ) {
      return null;
    }

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
      dataEnd >
      clean.length
    ) {
      return null;
    }

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
        new Uint8Array(
          bytes
        )
      )
      .replace(
        /\0/g,
        ""
      )
      .trim();

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
    !isValidToken(
      token
    )
  ) {
    return {
      validERC20:
        false,

      reason:
        "INVALID_ADDRESS"
    };
  }

  const [
    name,
    symbol,
    decimals,
    supply
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

  const decodedName =
    decodeString(
      name
    );

  const decodedSymbol =
    decodeString(
      symbol
    );

  const valid =
    !!decodedName &&
    !!decodedSymbol &&
    !!decimals &&
    !!supply;

  return {
    validERC20:
      valid,

    name:
      decodedName,

    symbol:
      decodedSymbol,

    decimals:
      decimals
        ? Number(
            BigInt(
              decimals
            )
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
   TRANSFER ACTIVITY
========================================================= */

async function activity(
  env,
  token,
  latest
) {

  if (
    !isValidToken(
      token
    )
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
    await getLogs(
      env,
      {
        address:
          token,

        fromBlock:
          "0x" +
          from.toString(16),

        toBlock:
          "0x" +
          latest.toString(16),

        topics: [
          TRANSFER_TOPIC
        ]
      }
    );

  let transfers =
    0;

  const wallets =
    [];

  for (
    const log of
      result.logs
  ) {

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
      unique(
        wallets
      ).length,

    provider:
      result.provider,

    rpcError:
      result.error
  };
}


/* =========================================================
   SCORE
========================================================= */

function score(
  candidate
) {

  let value =
    0;

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
    candidate.score <
    SCORE_THRESHOLD
  ) {
    return {
      sent: false,

      reason:
        "BELOW_SCORE_THRESHOLD"
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

      `🚀 Source: ${candidate.source}`,

      `📊 Transfers: ${candidate.transfers}`,

      `👛 Wallets: ${candidate.wallets}`,

      "",

      "✅ Verified ERC20",

      "✅ Non-zero contract",

      "",

      "⚠️ Market cap not independently verified",

      "⚠️ Liquidity not independently verified",

      "⚠️ Holder concentration not independently verified",

      "",

      `Robinhood Chain Meme Hunter ${VERSION}`
    ].join("\n");

  try {

    const response =
      await fetchWithTimeout(
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
        },

        RPC_TIMEOUT_MS
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

  } catch (
    error
  ) {

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

async function runScan(
  env
) {

  const started =
    Date.now();

  const latestResult =
    await latestBlock(
      env
    );

  const latest =
    latestResult.block;

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
    const candidate of
      discovery.candidates
  ) {

    if (
      !isValidToken(
        candidate.token
      )
    ) {
      continue;
    }

    candidateMap.set(
      candidate.token,
      {
        ...candidate,

        v4Evidence:
          false
      }
    );
  }

  for (
    const event of
      v4.events
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
      !isValidToken(
        token
      )
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
        verification.name,

      symbol:
        verification.symbol
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

      activityProvider:
        usage.provider,

      activityRpcError:
        usage.rpcError ||
        null
    };

    candidate.score =
      score(
        candidate
      );

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (
      a,
      b
    ) =>
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

  let telegram = {
    sent: false,

    reason:
      "NO_VERIFIED_QUALIFYING_CANDIDATE"
  };

  if (
    qualifying.length
  ) {

    telegram =
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
        started,

      latestBlock:
        latest,

      latestBlockProvider:
        latestResult.provider,

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

        eventsFound:
          v4.events.length,

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

      telegram,

      dataIntegrity: {

        noFabricatedMetrics:
          true,

        zeroAddressProtection:
          true,

        boundedRPCWorkload:
          true,

        primaryDiscovery:
          "ROBINHOOD_PUBLIC_RPC",

        fallbackDiscovery:
          "ALCHEMY",

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
        "V59_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK",

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

  let latest =
    null;

  let provider =
    null;

  let rpcStatus =
    "ERROR";

  let error =
    null;

  try {

    const result =
      await latestBlock(
        env
      );

    latest =
      result.block;

    provider =
      result.provider;

    rpcStatus =
      "CONNECTED";

  } catch (
    err
  ) {

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

    rpcStatus,

    latestBlock:
      latest,

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
      "V59_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK",

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

  const latest =
    await latestBlock(
      env
    );

  const latestBlockNumber =
    latest.block;

  const fromBlock =
    Math.max(
      0,
      latestBlockNumber - 2
    );

  const tests =
    [];

  /*
    Test 1:
    range-only public RPC
  */

  const range =
    await getLogs(
      env,
      {
        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          latestBlockNumber.toString(16)
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

  /*
    Test 2:
    pool manager
  */

  const pool =
    await getLogs(
      env,
      {
        address:
          POOL_MANAGER,

        fromBlock:
          "0x" +
          fromBlock.toString(16),

        toBlock:
          "0x" +
          latestBlockNumber.toString(16)
      }
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

  return {

    agent:
      "Robinhood Chain Meme Hunter",

    version:
      VERSION,

    success:
      tests.some(
        test =>
          test.success
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
      latestBlockNumber,

    fromBlock,

    toBlock:
      latestBlockNumber,

    blockRange:
      latestBlockNumber -
      fromBlock +
      1,

    tests,

    interpretation: {

      blockNumber:
        "eth_blockNumber",

      rangeOnly:
        "Tests eth_getLogs through provider fallback",

      poolManager:
        "Tests address-filtered logs",

      discovery:
        "Robinhood Public RPC is primary; Alchemy is fallback"
    },

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   TELEGRAM SAFETY TEST
========================================================= */

async function telegramTest(
  env
) {

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

        "access-control-allow-origin":
          "*"
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
          await runScan(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/rpc-test"
      ) {

        return json(
          await rpcTest(
            env
          )
        );
      }

      if (
        url.pathname ===
        "/test-telegram"
      ) {

        return json(
          await telegramTest(
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
          "/rpc-test",
          "/test-telegram"
        ]

      });

    } catch (
      error
    ) {

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
