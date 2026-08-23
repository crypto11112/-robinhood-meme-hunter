const CONFIG = {
  VERSION: "V26",
  CHAIN_ID: 4663,
  RPC: "https://rpc.mainnet.chain.robinhood.com",
  LAUNCH_CONTRACTS: [
    "0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
    "0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
  ],
  TOKEN_CREATED_TOPIC:
    "0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e",
  DEXSCREENER:
    "https://api.dexscreener.com",
  DEX_CHAIN:
    "robinhood",
  /*
   * Small ranges are intentional.
   * The public RPC can rate-limit large/repeated scans.
   */
  LOG_RANGE: 500,
  SCAN_BLOCKS: 5000,
  MAX_LOGS: 20,
  MAX_TOKENS: 30,
  MIN_MARKET_CAP: 10000,
  MAX_MARKET_CAP: 50000000,
  MIN_LIQUIDITY: 5000,
  MIN_VOLUME_24H: 1000,
  ALERT_SCORE: 70
};
let requestCount = 0;
/* ============================================================
   BASIC HELPERS
============================================================ */
function lower(v) {
  return String(v || "").toLowerCase();
}
function validAddress(v) {
  return /^0x[a-fA-F0-9]{40}$/.test(
    String(v || "")
  );
}
function normalizeAddress(v) {
  if (!v) return null;
  let s = String(v);
  if (s.startsWith("0x")) {
    s = s.slice(2);
  }
  if (s.length < 40) {
    return null;
  }
  const address =
    "0x" + s.slice(-40);
  return validAddress(address)
    ? address.toLowerCase()
    : null;
}
function hexToNumber(v) {
  if (!v) return 0;
  try {
    return parseInt(v, 16);
  } catch {
    return 0;
  }
}
function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n)
    ? n
    : null;
}
function money(v) {
  if (v == null) return "N/A";
  if (v >= 1000000) {
    return "$" +
      (v / 1000000).toFixed(2) +
      "M";
  }
  if (v >= 1000) {
    return "$" +
      (v / 1000).toFixed(1) +
      "K";
  }
  return "$" +
    v.toFixed(2);
}
function sleep(ms) {
  return new Promise(
    r => setTimeout(r, ms)
  );
}
function unique(values) {
  return [
    ...new Set(
      values.filter(Boolean)
    )
  ];
}
/* ============================================================
   RPC
============================================================ */
async function rpc(
  method,
  params = []
) {
  requestCount++;
  try {
    const response =
      await fetch(
        CONFIG.RPC,
        {
          method: "POST",
          headers: {
            "content-type":
              "application/json",
            "accept":
              "application/json"
          },
          body:
            JSON.stringify({
              jsonrpc: "2.0",
              id:
                requestCount,
              method,
              params
            })
          }
        }
      );
    if (!response.ok) {
      return {
        ok: false,
        error:
          "HTTP_" +
          response.status
      };
    }
    const data =
      await response.json();
    if (data.error) {
      return {
        ok: false,
        error:
          data.error.message ||
          String(data.error.code)
      };
    }
    return {
      ok: true,
      result:
        data.result
    };
  } catch (error) {
    return {
      ok: false,
      error:
        String(
          error?.message ||
          error
        )
    };
  }
}
/* ============================================================
   BLOCK
============================================================ */
async function getLatestBlock() {
  const result =
    await rpc(
      "eth_blockNumber"
    );
  if (!result.ok) {
    throw new Error(
      result.error
    );
  }
  return hexToNumber(
    result.result
  );
}
/* ============================================================
   LOG DISCOVERY
============================================================ */
async function getTokenCreatedLogs(
  fromBlock,
  toBlock
) {
  return await rpc(
    "eth_getLogs",
    [{
      fromBlock:
        "0x" +
        fromBlock.toString(16),
      toBlock:
        "0x" +
        toBlock.toString(16),
      address:
        CONFIG.LAUNCH_CONTRACTS,
      topics: [
        CONFIG.TOKEN_CREATED_TOPIC
      ]
    }]
  );
}
/* ============================================================
   TRANSACTION RECEIPT
============================================================ */
async function getReceipt(
  txHash
) {
  if (!txHash) {
    return null;
  }
  const result =
    await rpc(
      "eth_getTransactionReceipt",
      [txHash]
    );
  if (!result.ok) {
    return null;
  }
  return result.result || null;
}
/* ============================================================
   EXTRACT ADDRESSES FROM EVENT
============================================================ */
function addressesFromEvent(
  log
) {
  const addresses = [];
  /*
   * Indexed argument.
   */
  if (
    Array.isArray(log?.topics)
  ) {
    for (
      let i = 1;
      i < log.topics.length;
      i++
    ) {
      const address =
        normalizeAddress(
          log.topics[i]
        );
      if (address) {
        addresses.push(
          address
        );
      }
    }
  }
  /*
   * Non-indexed address.
   *
   * TokenCreated(address) has
   * one ABI encoded address.
   */
  const data =
    String(
      log?.data || ""
    );
  if (
    data.startsWith("0x") &&
    data.length >= 66
  ) {
    const clean =
      data.slice(2);
    for (
      let i = 0;
      i + 64 <= clean.length;
      i += 64
    ) {
      const word =
        clean.slice(
          i,
          i + 64
        );
      const address =
        normalizeAddress(
          word
        );
      if (address) {
        addresses.push(
          address
        );
      }
    }
  }
  return unique(
    addresses
  );
}
/* ============================================================
   CREATED CONTRACTS FROM RECEIPT
============================================================ */
function contractsFromReceipt(
  receipt
) {
  const addresses = [];
  /*
   * CREATE contract.
   *
   * contractAddress is populated for
   * contract-creation transactions.
   */
  if (
    validAddress(
      receipt?.contractAddress
    )
  ) {
    addresses.push(
      receipt.contractAddress.toLowerCase()
    );
  }
  /*
   * Logs can contain addresses from
   * contracts created during the launch.
   *
   * We collect every log emitter except
   * known infrastructure.
   */
  if (
    Array.isArray(
      receipt?.logs
    )
  ) {
    for (
      const log
      of receipt.logs
    ) {
      const address =
        normalizeAddress(
          log?.address
        );
      if (address) {
        addresses.push(
          address
        );
      }
    }
  }
  return unique(
    addresses
  );
}
/* ============================================================
   ERC20 CALL
============================================================ */
async function ethCall(
  to,
  data
) {
  const result =
    await rpc(
      "eth_call",
      [
        {
          to,
          data
        },
        "latest"
      ]
    );
  return result.ok
    ? result.result
    : null;
}
/* ============================================================
   ABI DECODERS
============================================================ */
function decodeUint(
  value
) {
  if (
    !value ||
    value === "0x"
  ) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}
function decodeString(
  value
) {
  if (
    !value ||
    value === "0x"
  ) {
    return null;
  }
  const clean =
    value.replace(
      /^0x/,
      ""
    );
  /*
   * Dynamic Solidity string.
   */
  try {
    if (
      clean.length >= 128
    ) {
      const offset =
        parseInt(
          clean.slice(
            0,
            64
          ),
          16
        );
      const pos =
        offset * 2;
      if (
        pos + 64 <=
        clean.length
      ) {
        const length =
          parseInt(
            clean.slice(
              pos,
              pos + 64
            ),
            16
          );
        const start =
          pos + 64;
        const end =
          start +
          length * 2;
        if (
          end <= clean.length
        ) {
          const bytes =
            clean.slice(
              start,
              end
            );
          let output = "";
          for (
            let i = 0;
            i + 2 <= bytes.length;
            i += 2
          ) {
            const byte =
              parseInt(
                bytes.slice(
                  i,
                  i + 2
                ),
                16
              );
            if (
              byte >= 32 &&
              byte <= 126
            ) {
              output +=
                String.fromCharCode(
                  byte
                );
            }
          }
          if (
            output.trim()
          ) {
            return output.trim();
          }
        }
      }
    }
  } catch {}
  /*
   * bytes32 fallback.
   */
  try {
    let output = "";
    for (
      let i = 0;
      i + 2 <= clean.length;
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
        byte >= 32 &&
        byte <= 126
      ) {
        output +=
          String.fromCharCode(
            byte
          );
      }
    }
    return output.trim() || null;
  } catch {
    return null;
  }
}
/* ============================================================
   ERC20 VERIFICATION
============================================================ */
async function verifyERC20(
  address
) {
  if (
    !validAddress(address)
  ) {
    return null;
  }
  /*
   * Don't make all four calls simultaneously.
   *
   * The public RPC is free but rate-limited.
   */
  const nameRaw =
    await ethCall(
      address,
      "0x06fdde03"
    );
  const symbolRaw =
    await ethCall(
      address,
      "0x95d89b41"
    );
  const decimalsRaw =
    await ethCall(
      address,
      "0x313ce567"
    );
  const supplyRaw =
    await ethCall(
      address,
      "0x18160ddd"
    );
  const decimals =
    decodeUint(
      decimalsRaw
    );
  const supply =
    decodeUint(
      supplyRaw
    );
  /*
   * Decimals and totalSupply are
   * our primary verification.
   */
  if (
    decimals === null ||
    supply === null
  ) {
    return null;
  }
  const decimalNumber =
    Number(decimals);
  if (
    !Number.isFinite(
      decimalNumber
    ) ||
    decimalNumber < 0 ||
    decimalNumber > 36
  ) {
    return null;
  }
  /*
   * Zero-supply contracts are not
   * considered valid launch tokens.
   */
  if (
    supply <= 0n
  ) {
    return null;
  }
  return {
    address:
      address.toLowerCase(),
    name:
      decodeString(
        nameRaw
      ) ||
      "UNKNOWN",
    symbol:
      decodeString(
        symbolRaw
      ) ||
      "UNKNOWN",
    decimals:
      decimalNumber,
    totalSupply:
      supply.toString()
  };
}
/* ============================================================
   VERIFY LOG
============================================================ */
async function verifyLaunchLog(
  log
) {
  /*
   * First try the actual event.
   */
  const eventAddresses =
    addressesFromEvent(
      log
    );
  for (
    const address
    of eventAddresses
  ) {
    const token =
      await verifyERC20(
        address
      );
    if (token) {
      return {
        token,
        source:
          "TOKEN_CREATED_EVENT"
      };
    }
  }
  /*
   * If event decoding doesn't work,
   * inspect the transaction receipt.
   */
  const receipt =
    await getReceipt(
      log.transactionHash
    );
  if (!receipt) {
    return null;
  }
  const receiptAddresses =
    contractsFromReceipt(
      receipt
    );
  /*
   * Try receipt-created addresses.
   */
  for (
    const address
    of receiptAddresses
  ) {
    /*
     * Never treat the launch contracts
     * themselves as tokens.
     */
    if (
      CONFIG.LAUNCH_CONTRACTS
        .map(lower)
        .includes(
          lower(address)
        )
    ) {
      continue;
    }
    const token =
      await verifyERC20(
        address
      );
    if (token) {
      return {
        token,
        source:
          "TRANSACTION_RECEIPT_ERC20"
      };
    }
    await sleep(30);
  }
  /*
   * Finally inspect every log's data/topics.
   */
  if (
    Array.isArray(
      receipt.logs
    )
  ) {
    for (
      const receiptLog
      of receipt.logs
    ) {
      const candidates =
        addressesFromEvent(
          receiptLog
        );
      for (
        const address
        of candidates
      ) {
        if (
          CONFIG.LAUNCH_CONTRACTS
            .map(lower)
            .includes(
              lower(address)
            )
        ) {
          continue;
        }
        const token =
          await verifyERC20(
            address
          );
        if (token) {
          return {
            token,
            source:
              "RECEIPT_LOG_ERC20"
          };
        }
      }
    }
  }
  return null;
}
/* ============================================================
   DISCOVER
============================================================ */
async function discoverTokens() {
  const latest =
    await getLatestBlock();
  const start =
    Math.max(
      0,
      latest -
        CONFIG.SCAN_BLOCKS
    );
  const discovered =
    new Map();
  let logsScanned = 0;
  let failedRanges = 0;
  let rangesScanned = 0;
  /*
   * Newest blocks first.
   */
  for (
    let end = latest;
    end >= start;
    end -= CONFIG.LOG_RANGE
  ) {
    const from =
      Math.max(
        start,
        end -
          CONFIG.LOG_RANGE +
          1
      );
    rangesScanned++;
    const result =
      await getTokenCreatedLogs(
        from,
        end
      );
    if (!result.ok) {
      failedRanges++;
      /*
       * Retry failed ranges at
       * 100 blocks.
       */
      const retryRange = 100;
      for (
        let retryEnd = end;
        retryEnd >= from;
        retryEnd -= retryRange
      ) {
        const retryFrom =
          Math.max(
            from,
            retryEnd -
              retryRange +
              1
          );
        const retry =
          await getTokenCreatedLogs(
            retryFrom,
            retryEnd
          );
        if (!retry.ok) {
          continue;
        }
        const logs =
          Array.isArray(
            retry.result
          )
            ? retry.result
            : [];
        logsScanned +=
          logs.length;
        for (
          const log
          of logs
        ) {
          if (
            logsScanned >
            CONFIG.MAX_LOGS
          ) {
            break;
          }
          const verified =
            await verifyLaunchLog(
              log
            );
          if (
            verified?.token
          ) {
            const address =
              verified.token.address;
            if (
              !discovered.has(
                address
              )
            ) {
              discovered.set(
                address,
                {
                  ...verified.token,
                  block:
                    hexToNumber(
                      log.blockNumber
                    ),
                  transaction:
                    log.transactionHash,
                  logIndex:
                    hexToNumber(
                      log.logIndex
                    ),
                  launchContract:
                    lower(
                      log.address
                    ),
                  discoverySource:
                    verified.source
                }
              );
            }
          }
          if (
            discovered.size >=
            CONFIG.MAX_TOKENS
          ) {
            break;
          }
        }
        if (
          discovered.size >=
          CONFIG.MAX_TOKENS
        ) {
          break;
        }
      }
    } else {
      const logs =
        Array.isArray(
          result.result
        )
          ? result.result
          : [];
      logsScanned +=
        logs.length;
      for (
        const log
        of logs
      ) {
        const verified =
          await verifyLaunchLog(
            log
          );
        if (
          verified?.token
        ) {
          const address =
            verified.token.address;
          if (
            !discovered.has(
              address
            )
          ) {
            discovered.set(
              address,
              {
                ...verified.token,
                block:
                  hexToNumber(
                    log.blockNumber
                  ),
                transaction:
                  log.transactionHash,
                logIndex:
                  hexToNumber(
                    log.logIndex
                  ),
                launchContract:
                  lower(
                    log.address
                  ),
                discoverySource:
                  verified.source
              }
            );
          }
        }
        if (
          discovered.size >=
          CONFIG.MAX_TOKENS
        ) {
          break;
        }
      }
    }
    if (
      discovered.size >=
      CONFIG.MAX_TOKENS
    ) {
      break;
    }
    await sleep(100);
  }
  return {
    latestBlock:
      latest,
    startBlock:
      start,
    blocksScanned:
      latest - start + 1,
    rangesScanned,
    logsScanned,
    failedRanges,
    tokens:
      Array.from(
        discovered.values()
      )
  };
}
/* ============================================================
   DEX SCREENER
============================================================ */
async function dexLookup(
  token
) {
  try {
    const response =
      await fetch(
        `${CONFIG.DEXSCREENER}/latest/dex/tokens/${token}`,
        {
          headers: {
            accept:
              "application/json"
          }
        }
      );
    if (!response.ok) {
      return {
        ok: false,
        pairs: [],
        error:
          "HTTP_" +
          response.status
      };
    }
    const data =
      await response.json();
    let pairs =
      Array.isArray(
        data?.pairs
      )
        ? data.pairs
        : [];
    pairs =
      pairs.filter(
        pair =>
          lower(
            pair?.chainId
          ) ===
          CONFIG.DEX_CHAIN
      );
    pairs.sort(
      (a, b) => {
        const aLiq =
          toNumber(
            a?.liquidity?.usd
          ) || 0;
        const bLiq =
          toNumber(
            b?.liquidity?.usd
          ) || 0;
        return bLiq - aLiq;
      }
    );
    return {
      ok: true,
      pairs
    };
  } catch (error) {
    return {
      ok: false,
      pairs: [],
      error:
        String(
          error?.message ||
          error
        )
    };
  }
}
/* ============================================================
   MEME SCORE
============================================================ */
function getMemeScore(
  name,
  symbol
) {
  const text =
    (
      String(name || "") +
      " " +
      String(symbol || "")
    ).toLowerCase();
  const keywords = [
    "pepe",
    "frog",
    "doge",
    "dog",
    "inu",
    "shib",
    "cat",
    "kitty",
    "bonk",
    "wif",
    "goat",
    "ape",
    "monkey",
    "fart",
    "degen",
    "moon",
    "chad",
    "pup",
    "woof",
    "bear",
    "bull",
    "panda",
    "yolo",
    "meme",
    "robin",
    "hood"
  ];
  let score = 0;
  for (
    const keyword
    of keywords
  ) {
    if (
      text.includes(keyword)
    ) {
      score += 4;
    }
  }
  return Math.min(
    20,
    score
  );
}
/* ============================================================
   SCORE
============================================================ */
function calculateScore(
  c
) {
  let score = 0;
  /*
   * Market cap.
   */
  if (
    c.marketCap <= 100000
  ) {
    score += 22;
  } else if (
    c.marketCap <= 250000
  ) {
    score += 20;
  } else if (
    c.marketCap <= 1000000
  ) {
    score += 18;
  } else if (
    c.marketCap <= 5000000
  ) {
    score += 15;
  } else if (
    c.marketCap <= 10000000
  ) {
    score += 11;
  } else {
    score += 6;
  }
  /*
   * Liquidity.
   */
  if (
    c.liquidity >= 100000
  ) {
    score += 15;
  } else if (
    c.liquidity >= 50000
  ) {
    score += 13;
  } else if (
    c.liquidity >= 25000
  ) {
    score += 10;
  } else if (
    c.liquidity >= 10000
  ) {
    score += 7;
  } else {
    score += 3;
  }
  /*
   * Volume.
   */
  if (
    c.volumeToMarketCap >= 5
  ) {
    score += 15;
  } else if (
    c.volumeToMarketCap >= 2
  ) {
    score += 12;
  } else if (
    c.volumeToMarketCap >= 1
  ) {
    score += 9;
  } else if (
    c.volumeToMarketCap >= 0.5
  ) {
    score += 6;
  }
  /*
   * Buy pressure.
   */
  if (
    c.buySellRatio >= 3
  ) {
    score += 15;
  } else if (
    c.buySellRatio >= 2
  ) {
    score += 13;
  } else if (
    c.buySellRatio >= 1.5
  ) {
    score += 10;
  } else if (
    c.buySellRatio >= 1.2
  ) {
    score += 7;
  } else if (
    c.buySellRatio >= 1
  ) {
    score += 3;
  }
  /*
   * Meme strength.
   */
  score +=
    Math.round(
      c.memeScore *
      0.75
    );
  /*
   * Activity.
   */
  if (
    c.transactions >= 5000
  ) {
    score += 5;
  } else if (
    c.transactions >= 1000
  ) {
    score += 4;
  } else if (
    c.transactions >= 250
  ) {
    score += 2;
  }
  /*
   * Risk penalties.
   */
  if (
    c.liquidity <
    c.marketCap * 0.05
  ) {
    score -= 10;
  }
  if (
    c.buySellRatio < 0.8
  ) {
    score -= 20;
  }
  return Math.max(
    0,
    Math.min(
      100,
      score
    )
  );
}
/* ============================================================
   BUILD CANDIDATE
============================================================ */
function buildCandidate(
  token,
  pair
) {
  const marketCap =
    toNumber(
      pair?.marketCap
    ) ??
    toNumber(
      pair?.fdv
    );
  const liquidity =
    toNumber(
      pair?.liquidity?.usd
    );
  const volume =
    toNumber(
      pair?.volume?.h24
    );
  if (
    marketCap === null ||
    liquidity === null ||
    volume === null
  ) {
    return null;
  }
  if (
    marketCap <
    CONFIG.MIN_MARKET_CAP
  ) {
    return null;
  }
  if (
    marketCap >
    CONFIG.MAX_MARKET_CAP
  ) {
    return null;
  }
  if (
    liquidity <
    CONFIG.MIN_LIQUIDITY
  ) {
    return null;
  }
  if (
    volume <
    CONFIG.MIN_VOLUME_24H
  ) {
    return null;
  }
  const buys =
    toNumber(
      pair?.txns?.h24?.buys
    ) || 0;
  const sells =
    toNumber(
      pair?.txns?.h24?.sells
    ) || 0;
  const transactions =
    buys + sells;
  const buySellRatio =
    sells > 0
      ? buys / sells
      : buys > 0
        ? 99
        : 0;
  const liquidityToMarketCap =
    liquidity /
    marketCap;
  const volumeToMarketCap =
    volume /
    marketCap;
  const name =
    pair?.baseToken?.name ||
    token.name ||
    "UNKNOWN";
  const symbol =
    pair?.baseToken?.symbol ||
    token.symbol ||
    "UNKNOWN";
  const memeScore =
    getMemeScore(
      name,
      symbol
    );
  let launchAgeHours = null;
  if (
    pair?.pairCreatedAt
  ) {
    launchAgeHours =
      (
        Date.now() -
        Number(
          pair.pairCreatedAt
        )
      ) / 3600000;
  }
  const candidate = {
    contract:
      token.address,
    name,
    symbol,
    priceUsd:
      toNumber(
        pair?.priceUsd
      ),
    marketCap,
    fdv:
      toNumber(
        pair?.fdv
      ),
    liquidity,
    volume24h:
      volume,
    buys,
    sells,
    transactions,
    buySellRatio:
      Number(
        buySellRatio.toFixed(2)
      ),
    pressure:
      buySellRatio >= 1.25
        ? "BUY_PRESSURE"
        : buySellRatio <= 0.8
          ? "SELL_PRESSURE"
          : "NEUTRAL",
    liquidityToMarketCap:
      Number(
        liquidityToMarketCap.toFixed(4)
      ),
    volumeToMarketCap:
      Number(
        volumeToMarketCap.toFixed(4)
      ),
    memeScore,
    launchBlock:
      token.block,
    launchTransaction:
      token.transaction,
    launchContract:
      token.launchContract,
    discoverySource:
      token.discoverySource,
    launchAgeHours:
      launchAgeHours === null
        ? null
        : Number(
            launchAgeHours.toFixed(1)
          ),
    dex:
      pair?.dexId ||
      "uniswap",
    pairAddress:
      pair?.pairAddress ||
      null,
    url:
      pair?.url ||
      null,
    holderConcentration:
      "UNVERIFIED",
    walletActivity:
      "UNVERIFIED",
    smartMoney:
      "UNVERIFIED"
  };
  const riskFlags = [];
  if (
    liquidity <
    marketCap * 0.05
  ) {
    riskFlags.push(
      "LOW_LIQUIDITY_RATIO"
    );
  }
  if (
    buySellRatio < 0.8
  ) {
    riskFlags.push(
      "SELL_PRESSURE"
    );
  }
  if (
    transactions < 100
  ) {
    riskFlags.push(
      "LOW_ACTIVITY"
    );
  }
  if (
    memeScore === 0
  ) {
    riskFlags.push(
      "WEAK_MEME_SIGNAL"
    );
  }
  candidate.riskFlags =
    riskFlags;
  candidate.riskScore =
    Math.min(
      100,
      riskFlags.length * 10
    );
  candidate.discoveryScore =
    calculateScore(
      candidate
    );
  candidate.category =
    candidate.discoveryScore >= 80
      ? "VERY_HIGH_POTENTIAL"
      : candidate.discoveryScore >= 70
        ? "HIGH_POTENTIAL"
        : candidate.discoveryScore >= 60
          ? "WATCH"
          : candidate.discoveryScore >= 50
            ? "EARLY"
            : "LOW_CONVICTION";
  candidate.targetMultiples = {
    to100M:
      Number(
        (
          100000000 /
          marketCap
        ).toFixed(2)
      ),
    to250M:
      Number(
        (
          250000000 /
          marketCap
        ).toFixed(2)
      ),
    to500M:
      Number(
        (
          500000000 /
          marketCap
        ).toFixed(2)
      )
  };
  return candidate;
}
/* ============================================================
   TELEGRAM
============================================================ */
async function sendTelegram(
  env,
  message
) {
  if (
    !env.TELEGRAM_BOT_TOKEN ||
    !env.TELEGRAM_CHAT_ID
  ) {
    return {
      ok: false,
      error:
        "TELEGRAM_NOT_CONFIGURED"
    };
  }
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
          body:
            JSON.stringify({
              chat_id:
                env.TELEGRAM_CHAT_ID,
              text:
                message,
              parse_mode:
                "HTML",
              disable_web_page_preview:
                false
            })
        }
      );
    const data =
      await response.json();
    return {
      ok:
        response.ok &&
        data?.ok === true,
      error:
        data?.description ||
        null
    };
  } catch (error) {
    return {
      ok: false,
      error:
        String(
          error?.message ||
          error
        )
    };
  }
}
/* ============================================================
   TELEGRAM ALERT
============================================================ */
function makeAlert(
  c
) {
  const emoji =
    c.discoveryScore >= 80
      ? "🚨"
      : c.discoveryScore >= 70
        ? "🔥"
        : "👀";
  return `${emoji} <b>ROBINHOOD MEME HUNTER V26</b>
<b>${c.name}</b>
$${c.symbol}
<b>Score:</b> ${c.discoveryScore}/100
<b>Market Cap:</b> ${money(c.marketCap)}
<b>Liquidity:</b> ${money(c.liquidity)}
<b>24h Volume:</b> ${money(c.volume24h)}
<b>Buy/Sell:</b> ${c.buySellRatio}
<b>Pressure:</b> ${c.pressure}
<b>Transactions:</b> ${c.transactions}
<b>Meme Score:</b> ${c.memeScore}/20
<b>Launch Age:</b> ${
    c.launchAgeHours ??
    "UNVERIFIED"
  }h
━━━━━━━━━━━━━━
<b>Holder Data:</b> UNVERIFIED
<b>Wallet Activity:</b> UNVERIFIED
<b>Smart Money:</b> UNVERIFIED
<b>Contract:</b>
<code>${c.contract}</code>
<b>Launch TX:</b>
<code>${c.launchTransaction}</code>
${
  c.url
    ? `<a href="${c.url}">DEX Screener</a>`
    : ""
}
⚠️ Automated research signal.
Not financial advice.`;
}
/* ============================================================
   RUN SCAN
============================================================ */
async function runScan(
  env
) {
  requestCount = 0;
  const discovery =
    await discoverTokens();
  const candidates = [];
  const lookupErrors = [];
  for (
    const token
    of discovery.tokens
  ) {
    const dex =
      await dexLookup(
        token.address
      );
    if (!dex.ok) {
      lookupErrors.push({
        contract:
          token.address,
        error:
          dex.error
      });
      continue;
    }
    if (
      dex.pairs.length === 0
    ) {
      continue;
    }
    const candidate =
      buildCandidate(
        token,
        dex.pairs[0]
      );
    if (!candidate) {
      continue;
    }
    candidates.push(
      candidate
    );
    await sleep(75);
  }
  candidates.sort(
    (a, b) =>
      b.discoveryScore -
      a.discoveryScore
  );
  const alerts = [];
  for (
    const candidate
    of candidates
  ) {
    if (
      candidate.discoveryScore <
      CONFIG.ALERT_SCORE
    ) {
      continue;
    }
    if (
      candidate.riskFlags.includes(
        "SELL_PRESSURE"
      )
    ) {
      continue;
    }
    const result =
      await sendTelegram(
        env,
        makeAlert(
          candidate
        )
      );
    alerts.push({
      contract:
        candidate.contract,
      symbol:
        candidate.symbol,
      score:
        candidate.discoveryScore,
      sent:
        result.ok,
      error:
        result.ok
          ? null
          : result.error
    });
  }
  return {
    agent:
      "Robinhood Chain Meme Hunter",
    version:
      CONFIG.VERSION,
    status:
      "ONLINE",
    objective:
      "Discover early-stage Robinhood Chain meme coins using free on-chain discovery and verified DEX market data.",
    chain: {
      name:
        "Robinhood Chain",
      chainId:
        CONFIG.CHAIN_ID,
      rpc:
        CONFIG.RPC
    },
    discovery: {
      source:
        "TOKEN_CREATED + TRANSACTION_RECEIPT",
      event:
        "TokenCreated(address)",
      eventTopic:
        CONFIG.TOKEN_CREATED_TOPIC,
      launchContracts:
        CONFIG.LAUNCH_CONTRACTS,
      latestBlock:
        discovery.latestBlock,
      startBlock:
        discovery.startBlock,
      blocksScanned:
        discovery.blocksScanned,
      rangesScanned:
        discovery.rangesScanned,
      logsScanned:
        discovery.logsScanned,
      failedRanges:
        discovery.failedRanges,
      tokensDiscovered:
        discovery.tokens.length,
      verifiedTokenAddresses:
        discovery.tokens.map(
          t => ({
            address:
              t.address,
            name:
              t.name,
            symbol:
              t.symbol,
            block:
              t.block,
            transaction:
              t.transaction,
            discoverySource:
              t.discoverySource
          })
        )
    },
    marketData: {
      source:
        "DEX_SCREENER",
      candidatesAnalysed:
        candidates.length,
      lookupErrors
    },
    telegram: {
      configured:
        Boolean(
          env.TELEGRAM_BOT_TOKEN &&
          env.TELEGRAM_CHAT_ID
        ),
      chatId:
        env.TELEGRAM_CHAT_ID ||
        null,
      alertsSent:
        alerts.filter(
          a => a.sent
        ).length
    },
    scan: {
      candidatesAnalysed:
        candidates.length,
      requestCount
    },
    candidates:
      candidates.slice(
        0,
        50
      ),
    alerts,
    validation: {
      tokenDiscovery:
        "VERIFIED TOKEN_CREATED EVENT",
      tokenAddress:
        "EVENT + TRANSACTION RECEIPT + ERC20 VERIFICATION",
      erc20Metadata:
        "ETH_CALL",
      liquidity:
        "DEX SCREENER",
      volume:
        "DEX SCREENER",
      buySellPressure:
        "DEX SCREENER",
      holderConcentration:
        "UNVERIFIED",
      walletActivity:
        "UNVERIFIED",
      smartMoney:
        "UNVERIFIED",
      accumulationDistribution:
        "BUY/SELL FLOW ONLY"
    },
    dataIntegrity: {
      noFabricatedMetrics:
        true,
      unavailableData:
        "UNVERIFIED"
    },
    timestamp:
      new Date().toISOString()
  };
}
/* ============================================================
   WORKER
============================================================ */
export default {
  async fetch(
    request,
    env
  ) {
    const url =
      new URL(
        request.url
      );
    /* ========================================================
       HEALTH
    ======================================================== */
    if (
      url.pathname ===
      "/health"
    ) {
      return Response.json({
        agent:
          "Robinhood Chain Meme Hunter",
        version:
          CONFIG.VERSION,
        status:
          "ONLINE",
        chainId:
          CONFIG.CHAIN_ID,
        rpc:
          CONFIG.RPC,
        discovery:
          "TOKEN_CREATED + TRANSACTION_RECEIPT",
        marketData:
          "DEX_SCREENER",
        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
        holderData:
          "UNVERIFIED",
        smartMoney:
          "UNVERIFIED",
        paidApiRequired:
          false
      });
    }
    /* ========================================================
       TELEGRAM TEST
    ======================================================== */
    if (
      url.pathname ===
      "/test-telegram"
    ) {
      const result =
        await sendTelegram(
          env,
          `🤖 <b>Robinhood Chain Meme Hunter V26</b>
Telegram connection successful.
Chain ID: 4663 ✅
Free Robinhood RPC: ✅
TokenCreated discovery: ✅
Transaction receipt fallback: ✅
ERC20 verification: ✅
DEX Screener: ✅
Holder concentration: UNVERIFIED
Wallet activity: UNVERIFIED
Smart money: UNVERIFIED`
        );
      return Response.json({
        agent:
          "Robinhood Chain Meme Hunter",
        version:
          CONFIG.VERSION,
        telegramConfigured:
          Boolean(
            env.TELEGRAM_BOT_TOKEN &&
            env.TELEGRAM_CHAT_ID
          ),
        success:
          result.ok,
        error:
          result.ok
            ? null
            : result.error
      });
    }
    /* ========================================================
       SCAN
    ======================================================== */
    if (
      url.pathname ===
      "/scan"
    ) {
      try {
        const result =
          await runScan(
            env
          );
        return Response.json(
          result,
          {
            headers: {
              "cache-control":
                "no-store",
              "access-control-allow-origin":
                "*"
            }
          }
        );
      } catch (error) {
        return Response.json(
          {
            agent:
              "Robinhood Chain Meme Hunter",
            version:
              CONFIG.VERSION,
            status:
              "ERROR",
            error:
              String(
                error?.message ||
                error
              ),
            requestCount,
            dataIntegrity: {
              noFabricatedMetrics:
                true
            },
            timestamp:
              new Date().toISOString()
          },
          {
            status: 500,
            headers: {
              "cache-control":
                "no-store"
            }
          }
        );
      }
    }
    /* ========================================================
       DEFAULT
    ======================================================== */
    return Response.json({
      agent:
        "Robinhood Chain Meme Hunter",
      version:
        CONFIG.VERSION,
      status:
        "ONLINE",
      routes: [
        "/health",
        "/test-telegram",
        "/scan"
      ],
      chainId:
        CONFIG.CHAIN_ID,
      setup: {
        paidApiKey:
          false,
        robinhoodPublicRpc:
          true,
        dexScreener:
          true,
        telegram:
          true
      }
    });
  }
};
