const VERSION = "V61";

const CHAIN_ID = 4663;
const CHAIN_NAME = "Robinhood Chain";

const PUBLIC_RPC = "https://rpc.mainnet.chain.robinhood.com";

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
const ACTIVITY_BLOCKS = 20;

const RPC_TIMEOUT_MS = 2500;

const MAX_DISCOVERY_CALLS = 8;
const MAX_TOKEN_CHECKS = 5;


/* =========================================================
   ERC20 SELECTORS
========================================================= */

const ERC20 = {
  name: "0x06fdde03",
  symbol: "0x95d89b41",
  decimals: "0x313ce567",
  totalSupply: "0x18160ddd",
  owner: "0x8da5cb5b"
};


/* =========================================================
   ADDRESS HELPERS
========================================================= */

function isAddress(value) {
  return /^0x[a-fA-F0-9]{40}$/.test(value || "");
}

function isZeroAddress(value) {
  return !value || value.toLowerCase() === ZERO;
}

function isValidToken(value) {
  return isAddress(value) && !isZeroAddress(value);
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topicAddress(topic) {
  if (!topic || typeof topic !== "string") {
    return null;
  }

  const clean = topic.startsWith("0x")
    ? topic.slice(2)
    : topic;

  if (
    clean.length !== 64 ||
    !/^[0-9a-fA-F]+$/.test(clean)
  ) {
    return null;
  }

  const address = "0x" + clean.slice(24);

  return isValidToken(address)
    ? address.toLowerCase()
    : null;
}


/* =========================================================
   RPC PROVIDER
========================================================= */

async function rpcRequest(
  endpoint,
  env,
  method,
  params = []
) {
  const controller = new AbortController();

  const timer = setTimeout(
    () => controller.abort(),
    RPC_TIMEOUT_MS
  );

  try {
    const response = await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "content-type": "application/json"
        },

        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method,
          params
        }),

        signal: controller.signal
      }
    );

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
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
    const result = await rpcRequest(
      PUBLIC_RPC,
      env,
      method,
      params
    );

    return {
      result,
      provider: "ROBINHOOD_PUBLIC_RPC",
      error: null
    };

  } catch (error) {
    publicError =
      error?.message ||
      String(error);
  }

  if (!env.ALCHEMY_API_KEY) {
    return {
      result: null,
      provider: null,
      error: publicError
    };
  }

  const endpoint =
    `https://robinhood-mainnet.g.alchemy.com/v2/${env.ALCHEMY_API_KEY}`;

  try {
    const result = await rpcRequest(
      endpoint,
      env,
      method,
      params
    );

    return {
      result,
      provider: "ALCHEMY",
      error: null
    };

  } catch (error) {
    return {
      result: null,
      provider: "ALCHEMY",
      error:
        error?.message ||
        String(error)
    };
  }
}


/* =========================================================
   LATEST BLOCK
========================================================= */

async function latestBlock(env) {
  const response = await rpc(
    env,
    "eth_blockNumber"
  );

  if (!response.result) {
    throw new Error(
      response.error ||
      "BLOCK_NUMBER_FAILED"
    );
  }

  return Number(
    BigInt(response.result)
  );
}


/* =========================================================
   SAFE HEX
========================================================= */

function safeBigInt(value) {
  if (
    !value ||
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


/* =========================================================
   CONTRACT LOGS
========================================================= */

async function getLogs(
  env,
  filter
) {
  const response = await rpc(
    env,
    "eth_getLogs",
    [filter]
  );

  return {
    logs:
      Array.isArray(response.result)
        ? response.result
        : [],

    provider:
      response.provider,

    error:
      response.error
  };
}


/* =========================================================
   ADDRESS EXTRACTION
========================================================= */

function addressesFromLog(log) {
  const found = [];

  if (Array.isArray(log.topics)) {
    for (const topic of log.topics) {
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
        clean.slice(i, i + 64);

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

  const candidates = new Map();

  const observations = [];

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
      await getLogs(
        env,
        {
          address: contract,

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
              token: address,

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
                true,

              v4Evidence:
                false
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

    calls,

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

  const initializeEvents = [];

  const swapEvents = [];

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

    if (
      log.topics.length >= 3 &&
      addresses.length
    ) {
      initializeEvents.push({
        token:
          addresses[0],

        txHash:
          log.transactionHash ||
          null,

        blockNumber:
          log.blockNumber ||
          null,

        topics:
          log.topics.slice(
            0,
            4
          )
      });
    }
  }

  return {
    fromBlock: from,
    toBlock: latest,

    rawLogs:
      result.logs.length,

    initializeEvents,
    swapEvents,

    provider:
      result.provider,

    rpcError:
      result.error
  };
}


/* =========================================================
   ETH CALL
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
      value: null,
      provider: null,
      error:
        "INVALID_TOKEN"
    };
  }

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

  return {
    value:
      result.result || null,

    provider:
      result.provider,

    error:
      result.error
  };
}


/* =========================================================
   STRING DECODER
========================================================= */

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
      const offsetValue =
        safeBigInt(
          "0x" +
          clean.slice(0, 64)
        );

      if (
        offsetValue === null
      ) {
        return null;
      }

      const offset =
        Number(offsetValue) * 2;

      if (
        offset + 64 >
        clean.length
      ) {
        return null;
      }

      const lengthValue =
        safeBigInt(
          "0x" +
          clean.slice(
            offset,
            offset + 64
          )
        );

      if (
        lengthValue === null
      ) {
        return null;
      }

      const length =
        Number(lengthValue);

      const start =
        offset + 64;

      const end =
        start +
        length * 2;

      if (
        end >
        clean.length
      ) {
        return null;
      }

      const bytes = [];

      for (
        let i = start;
        i < end;
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

    /*
      bytes32 fallback
    */

    if (
      clean.length >= 64
    ) {
      const bytes = [];

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

        bytes.push(byte);
      }

      if (bytes.length) {
        return new TextDecoder()
          .decode(
            new Uint8Array(bytes)
          )
          .trim();
      }
    }

    return null;

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

  const name =
    await ethCall(
      env,
      token,
      ERC20.name
    );

  const symbol =
    await ethCall(
      env,
      token,
      ERC20.symbol
    );

  const decimals =
    await ethCall(
      env,
      token,
      ERC20.decimals
    );

  const supply =
    await ethCall(
      env,
      token,
      ERC20.totalSupply
    );

  const owner =
    await ethCall(
      env,
      token,
      ERC20.owner
    );

  const decodedName =
    decodeText(name.value);

  const decodedSymbol =
    decodeText(symbol.value);

  const decimalsValue =
    safeBigInt(
      decimals.value
    );

  const supplyValue =
    safeBigInt(
      supply.value
    );

  const ownerAddress =
    owner.value &&
    owner.value.length >= 66
      ? topicAddress(
          owner.value
        )
      : null;

  const valid =
    !!decodedName &&
    !!decodedSymbol &&
    decimalsValue !== null &&
    supplyValue !== null;

  return {
    validERC20:
      valid,

    reason:
      valid
        ? null
        : "ERC20_METHODS_NOT_VERIFIED",

    name:
      decodedName,

    symbol:
      decodedSymbol,

    decimals:
      decimalsValue === null
        ? null
        : Number(
            decimalsValue
          ),

    totalSupply:
      supplyValue === null
        ? null
        : supplyValue.toString(),

    owner:
      ownerAddress,

    ownerDetected:
      !!ownerAddress
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
      transfers: 0,
      wallets: 0,
      buys: 0,
      sells: 0,
      provider: null,
      error:
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
    await getLogs(
      env,
      {
        address:
          token,

        topics: [
          TRANSFER_TOPIC
        ],

        fromBlock:
          "0x" +
          from.toString(16),

        toBlock:
          "0x" +
          latest.toString(16)
      }
    );

  let transfers = 0;

  const wallets = [];

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
      fromWallet &&
      fromWallet !== ZERO
    ) {
      wallets.push(
        fromWallet
      );
    }

    if (
      toWallet &&
      toWallet !== ZERO
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

    buys: 0,

    sells: 0,

    provider:
      result.provider,

    error:
      result.error
  };
}


/* =========================================================
   CONTRACT RISK CHECKS
========================================================= */

async function contractRisk(
  env,
  token
) {
  /*
    These selectors are probed individually.
    A successful response does NOT automatically
    mean the token is malicious.

    They are indicators only.
  */

  const checks = {
    mint:
      "0x40c10f19",

    burn:
      "0x42966c68",

    pause:
      "0x8456cb59",

    unpause:
      "0x3f4ba83a",

    renounceOwnership:
      "0x715018a6"
  };

  const results = {};

  for (
    const [name, selector]
      of Object.entries(checks)
  ) {
    const result =
      await ethCall(
        env,
        token,
        selector
      );

    results[name] = {
      callable:
        !!result.value,

      provider:
        result.provider,

      error:
        result.error
    };
  }

  return results;
}


/* =========================================================
   RUG RISK SCORE
========================================================= */

function rugRisk(candidate) {
  let risk = 50;

  const flags = [];

  /*
    Verified ERC20
  */

  if (
    candidate.validERC20
  ) {
    risk -= 20;
  } else {
    risk += 40;

    flags.push(
      "ERC20_NOT_VERIFIED"
    );
  }

  /*
    Ownership
  */

  if (
    candidate.owner
  ) {
    risk += 10;

    flags.push(
      "OWNER_DETECTED"
    );
  }

  /*
    Mint indicator
  */

  if (
    candidate.contractRisk?.mint?.callable
  ) {
    risk += 20;

    flags.push(
      "MINT_FUNCTION_INDICATOR"
    );
  }

  /*
    Pause indicator
  */

  if (
    candidate.contractRisk?.pause?.callable
  ) {
    risk += 10;

    flags.push(
      "PAUSE_FUNCTION_INDICATOR"
    );
  }

  /*
    Activity
  */

  if (
    candidate.transfers >= 20
  ) {
    risk -= 10;
  } else if (
    candidate.transfers === 0
  ) {
    risk += 10;

    flags.push(
      "NO_RECENT_TRANSFER_ACTIVITY"
    );
  }

  /*
    Wallet activity
  */

  if (
    candidate.wallets >= 10
  ) {
    risk -= 5;
  }

  return Math.max(
    0,
    Math.min(
      100,
      risk
    )
  );
}


/* =========================================================
   RISK LABEL
========================================================= */

function riskLabel(score) {
  if (score >= 80) {
    return "EXTREME";
  }

  if (score >= 60) {
    return "HIGH";
  }

  if (score >= 40) {
    return "MEDIUM";
  }

  if (score >= 20) {
    return "LOW";
  }

  return "VERY_LOW";
}


/* =========================================================
   OPPORTUNITY SCORE
========================================================= */

function opportunityScore(
  candidate
) {
  let score = 0;

  if (
    candidate.validERC20
  ) {
    score += 30;
  }

  if (
    candidate.launchEvidence
  ) {
    score += 15;
  }

  if (
    candidate.v4Evidence
  ) {
    score += 15;
  }

  if (
    candidate.transfers > 0
  ) {
    score += Math.min(
      15,
      candidate.transfers
    );
  }

  if (
    candidate.wallets > 0
  ) {
    score += Math.min(
      15,
      candidate.wallets
    );
  }

  if (
    candidate.name &&
    candidate.symbol
  ) {
    score += 10;
  }

  /*
    Penalise obvious risk.
  */

  if (
    candidate.rugRisk >= 80
  ) {
    score -= 35;
  } else if (
    candidate.rugRisk >= 60
  ) {
    score -= 20;
  } else if (
    candidate.rugRisk >= 40
  ) {
    score -= 10;
  }

  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );
}


/* =========================================================
   TELEGRAM
========================================================= */

async function telegram(
  env,
  candidate
) {
  /*
    HARD SAFETY
  */

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

  /*
    Do not alert on extreme/high rug risk.
  */

  if (
    candidate.rugRisk >= 60
  ) {
    return {
      sent: false,

      reason:
        "BLOCKED_HIGH_RUG_RISK"
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

      `⭐ Opportunity: ${candidate.score}/100`,

      `🛡️ Rug Risk: ${candidate.rugRisk}/100`,

      `📋 Risk: ${candidate.riskLabel}`,

      "",

      `🪙 ${candidate.name}`,

      `🔹 ${candidate.symbol}`,

      "",

      `📍 ${candidate.address}`,

      "",

      `🚀 Discovery: ${candidate.source}`,

      `📊 Transfers: ${candidate.transfers}`,

      `👛 Wallets: ${candidate.wallets}`,

      "",

      candidate.owner
        ? "⚠️ Owner detected"
        : "✅ No owner detected",

      candidate.contractRisk?.mint?.callable
        ? "⚠️ Mint indicator detected"
        : "✅ No mint indicator detected",

      candidate.contractRisk?.pause?.callable
        ? "⚠️ Pause indicator detected"
        : "✅ No pause indicator detected",

      "",

      "⚠️ Liquidity: NOT YET VERIFIED",

      "⚠️ Market cap: NOT VERIFIED",

      "⚠️ Holder concentration: NOT VERIFIED",

      "⚠️ Smart money: NOT VERIFIED",

      "",

      "V61 — EARLY TOKEN + RUG RISK SCANNER"
    ].join("\n");

  try {
    const response =
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

  /*
    Launchpad candidates
  */

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

  /*
    V4 candidates
  */

  for (
    const event of
      v4.initializeEvents
  ) {
    const token =
      event.token
        ?.toLowerCase();

    if (
      !isValidToken(token)
    ) {
      continue;
    }

    const existing =
      candidateMap.get(
        token
      );

    if (existing) {
      existing.v4Evidence =
        true;
    } else {
      candidateMap.set(
        token,
        {
          token,

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
    [...candidateMap.values()]
      .slice(
        0,
        MAX_TOKEN_CHECKS
      );

  const candidates = [];

  const validationResults = [];

  /*
    Sequential processing prevents the bot
    from recreating the RPC/subrequest problem
    seen in earlier versions.
  */

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
        verification.name,

      symbol:
        verification.symbol,

      reason:
        verification.reason ||
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

    const contractChecks =
      await contractRisk(
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

      owner:
        verification.owner,

      ownerDetected:
        verification.ownerDetected,

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
        usage.error,

      contractRisk:
        contractChecks
    };

    candidate.rugRisk =
      rugRisk(
        candidate
      );

    candidate.riskLabel =
      riskLabel(
        candidate.rugRisk
      );

    candidate.rugFlags =
      [];

    if (
      candidate.owner
    ) {
      candidate.rugFlags.push(
        "OWNER_DETECTED"
      );
    }

    if (
      candidate.contractRisk
        ?.mint
        ?.callable
    ) {
      candidate.rugFlags.push(
        "MINT_INDICATOR"
      );
    }

    if (
      candidate.contractRisk
        ?.pause
        ?.callable
    ) {
      candidate.rugFlags.push(
        "PAUSE_INDICATOR"
      );
    }

    if (
      candidate.transfers === 0
    ) {
      candidate.rugFlags.push(
        "NO_RECENT_ACTIVITY"
      );
    }

    candidate.score =
      opportunityScore(
        candidate
      );

    candidates.push(
      candidate
    );
  }

  candidates.sort(
    (a, b) =>
      b.score -
      a.score
  );

  /*
    Only verified ERC20 + score threshold +
    non-high-risk tokens can qualify.
  */

  const qualifying =
    candidates.filter(
      candidate =>
        candidate.validERC20 === true &&
        isValidToken(
          candidate.address
        ) &&
        candidate.score >=
          SCORE_THRESHOLD &&
        candidate.rugRisk < 60
    );

  let telegramResult = {
    sent: false,

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
          v4.swapEvents.length,

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
          true,

        alchemyFallback:
          true,

        sequentialTokenAnalysis:
          true,

        tokenContract:
          "ERC20_CALL_VERIFIED",

        rugRisk:
          "HEURISTIC_ON_CHAIN_RISK_SCORE",

        telegramTokenSafety:
          "NON_ZERO_VERIFIED_ERC20_ONLY",

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
        "V61_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK_RUG_RISK_HUNTER",

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

    provider:
      result.provider,

    logs:
      result.logs.length,

    error:
      result.error,

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
    const response =
      await rpc(
        env,
        "eth_blockNumber"
      );

    if (
      response.result
    ) {
      block =
        Number(
          BigInt(
            response.result
          )
        );

      status =
        "CONNECTED";

      provider =
        response.provider;

    } else {
      status =
        "ERROR";

      error =
        response.error;
    }

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
      "V61_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK_RUG_RISK_HUNTER",

    timestamp:
      new Date().toISOString()
  };
}


/* =========================================================
   TELEGRAM ZERO ADDRESS TEST
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

        rugRisk:
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
      if (
        url.pathname ===
        "/health"
      ) {
        return response(
          await health(env)
        );
      }

      if (
        url.pathname ===
        "/rpc-test"
      ) {
        return response(
          await rpcTest(env)
        );
      }

      if (
        url.pathname ===
        "/scan"
      ) {
        return response(
          await runScan(env)
        );
      }

      if (
        url.pathname ===
        "/test-telegram"
      ) {
        return response(
          await telegramTest(env)
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
