/**
 * Robinhood Chain Meme Hunter
 * V71
 *
 * Upgrade from V70.
 *
 * V71 ADDS:
 * - Whale accumulation intelligence
 * - Large-holder analysis
 * - Whale concentration scoring
 * - Whale accumulation / distribution signal
 * - Smart-money candidate detection
 * - Wallet-quality scoring
 * - Whale data added to opportunity score
 * - Whale risk added to rug-risk score
 * - Whale information in Telegram alerts
 *
 * IMPORTANT:
 * V70 discovery/KV/scanning remains the baseline.
 *
 * Add the V71 sections below to the V70 code.
 */

const VERSION = "V71";

/*
 * =========================================================
 * V71 WHALE / SMART MONEY SETTINGS
 * =========================================================
 */

const MAX_WHALE_WALLETS = 10;

const WHALE_SUPPLY_PERCENT = 1;

const EXTREME_WHALE_PERCENT = 10;

const MAX_WHALE_TRANSFER_LOOKUPS = 5;

const SMART_MONEY_MIN_SCORE = 55;

const WHALE_ACCUMULATION_BONUS = 10;

const WHALE_DISTRIBUTION_PENALTY = 15;


/*
 * =========================================================
 * V71 BLOCKSCOUT ADDRESS HELPERS
 * =========================================================
 */

function getHolderAddress(item) {
  return (
    item?.address?.hash ||
    item?.address_hash?.hash ||
    item?.address_hash ||
    null
  );
}


function isContractHolder(item) {
  return Boolean(
    item?.address?.is_contract ||
    item?.address_hash?.is_contract
  );
}


function isExchangeLikeHolder(item) {
  const name =
    String(
      item?.address?.name ||
      item?.address_hash?.name ||
      ""
    ).toLowerCase();

  const labels =
    JSON.stringify(
      item?.address?.metadata ||
      item?.address_hash?.metadata ||
      {}
    ).toLowerCase();

  const text =
    `${name} ${labels}`;

  return (
    text.includes("exchange") ||
    text.includes("bridge") ||
    text.includes("router") ||
    text.includes("pool") ||
    text.includes("liquidity") ||
    text.includes("burn") ||
    text.includes("dead")
  );
}


/*
 * =========================================================
 * V71 TOKEN TRANSFER FETCHING
 * =========================================================
 */

async function getAddressTokenTransfers(
  env,
  address,
  token
) {
  if (
    !isAddress(address) ||
    !isAddress(token)
  ) {
    return {
      verified: false,
      transfers: [],
      error: "INVALID_ADDRESS"
    };
  }

  const request =
    await blockscoutGet(
      env,
      `/api/v2/addresses/${address}/token-transfers?token=${token}`
    );

  if (!request.ok) {
    return {
      verified: false,
      transfers: [],
      error: request.error
    };
  }

  const items =
    Array.isArray(
      request.data?.items
    )
      ? request.data.items
      : [];

  return {
    verified: true,
    transfers: items,
    error: null
  };
}


/*
 * =========================================================
 * V71 TRANSFER VALUE
 * =========================================================
 */

function transferRawValue(
  transfer
) {
  try {
    const raw =
      transfer?.total?.value ??
      transfer?.value ??
      "0";

    return BigInt(
      String(raw)
    );

  } catch {
    return 0n;
  }
}


function transferTimestamp(
  transfer
) {
  const timestamp =
    transfer?.timestamp ||
    transfer?.block_timestamp ||
    null;

  if (!timestamp) {
    return 0;
  }

  const value =
    Date.parse(timestamp);

  return Number.isFinite(value)
    ? value
    : 0;
}


/*
 * =========================================================
 * V71 WALLET FLOW ANALYSIS
 * =========================================================
 */

function analyseWalletTransfers(
  wallet,
  transfers
) {
  const walletLower =
    normalizeAddress(wallet);

  let incoming = 0n;
  let outgoing = 0n;

  let incomingCount = 0;
  let outgoingCount = 0;

  let recentIncoming = 0n;
  let recentOutgoing = 0n;

  const cutoff =
    Date.now() -
    60 * 60 * 1000;

  for (const transfer of transfers) {

    const from =
      normalizeAddress(
        transfer?.from?.hash ||
        transfer?.from_address_hash ||
        transfer?.from ||
        ""
      );

    const to =
      normalizeAddress(
        transfer?.to?.hash ||
        transfer?.to_address_hash ||
        transfer?.to ||
        ""
      );

    const value =
      transferRawValue(
        transfer
      );

    const timestamp =
      transferTimestamp(
        transfer
      );

    if (
      to === walletLower
    ) {
      incoming += value;
      incomingCount++;

      if (
        timestamp >= cutoff
      ) {
        recentIncoming += value;
      }
    }

    if (
      from === walletLower
    ) {
      outgoing += value;
      outgoingCount++;

      if (
        timestamp >= cutoff
      ) {
        recentOutgoing += value;
      }
    }
  }

  const net =
    incoming -
    outgoing;

  const recentNet =
    recentIncoming -
    recentOutgoing;

  let direction =
    "NEUTRAL";

  if (
    recentNet > 0n
  ) {
    direction =
      "ACCUMULATING";
  }

  if (
    recentNet < 0n
  ) {
    direction =
      "DISTRIBUTING";
  }

  return {
    incoming:
      incoming.toString(),

    outgoing:
      outgoing.toString(),

    net:
      net.toString(),

    recentIncoming:
      recentIncoming.toString(),

    recentOutgoing:
      recentOutgoing.toString(),

    recentNet:
      recentNet.toString(),

    incomingCount,

    outgoingCount,

    direction
  };
}


/*
 * =========================================================
 * V71 SMART MONEY CANDIDATE SCORE
 * =========================================================
 */

function scoreWalletQuality(
  holder,
  flow
) {
  let score = 0;

  const reasons = [];

  const percentage =
    safeNumber(
      holder.percentage
    );

  if (
    percentage >= 1 &&
    percentage <= 10
  ) {
    score += 20;

    reasons.push(
      "Meaningful token position"
    );
  }

  if (
    percentage > 10
  ) {
    score -= 10;

    reasons.push(
      "Very concentrated position"
    );
  }

  if (
    !holder.isContract
  ) {
    score += 10;

    reasons.push(
      "Externally-owned wallet candidate"
    );
  }

  if (
    !holder.exchangeLike
  ) {
    score += 10;
  }

  if (
    flow?.direction ===
    "ACCUMULATING"
  ) {
    score += 25;

    reasons.push(
      "Recent accumulation detected"
    );
  }

  if (
    flow?.incomingCount >
    flow?.outgoingCount
  ) {
    score += 10;

    reasons.push(
      "More incoming than outgoing transfers"
    );
  }

  if (
    flow?.direction ===
    "DISTRIBUTING"
  ) {
    score -= 20;

    reasons.push(
      "Recent distribution detected"
    );
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    candidate:
      score >=
      SMART_MONEY_MIN_SCORE,

    verifiedSmartMoney:
      false,

    reasons
  };
}


/*
 * =========================================================
 * V71 WHALE INTELLIGENCE
 * =========================================================
 */

async function getWhaleIntelligence(
  env,
  token,
  totalSupply,
  existingHolderData
) {
  const result = {
    verified: false,

    whaleCount: 0,

    accumulatingWhales: 0,

    distributingWhales: 0,

    neutralWhales: 0,

    whaleSupplyPercent: 0,

    largestWalletPercent: null,

    accumulationSignal:
      "UNVERIFIED",

    smartMoneyCandidates: 0,

    verifiedSmartMoney: 0,

    wallets: [],

    error: null
  };

  try {

    let holders =
      existingHolderData
        ?.topHolders ||
      [];

    /*
     * If V70 holder lookup did not return
     * enough holder information, query again.
     */

    if (
      holders.length === 0
    ) {
      const request =
        await blockscoutGet(
          env,
          `/api/v2/tokens/${token}/holders`
        );

      if (
        !request.ok
      ) {
        result.error =
          request.error;

        return result;
      }

      holders =
        (
          request.data?.items ||
          []
        )
          .slice(
            0,
            MAX_WHALE_WALLETS
          )
          .map(
            item => ({
              address:
                getHolderAddress(
                  item
                ),

              value:
                String(
                  item?.value ||
                  "0"
                ),

              percentage:
                holderPercentage(
                  item?.value ||
                  "0",
                  totalSupply
                ),

              isContract:
                isContractHolder(
                  item
                ),

              exchangeLike:
                isExchangeLikeHolder(
                  item
                )
            })
          );
    } else {

      holders =
        holders.map(
          holder => ({
            ...holder,

            isContract:
              Boolean(
                holder.isContract
              ),

            exchangeLike:
              Boolean(
                holder.exchangeLike
              )
          })
        );
    }

    const whaleHolders =
      holders
        .filter(
          holder =>
            holder.address &&
            holder.percentage !==
              null &&
            holder.percentage >=
              WHALE_SUPPLY_PERCENT
        )
        .slice(
          0,
          MAX_WHALE_WALLETS
        );

    result.whaleCount =
      whaleHolders.length;

    result.whaleSupplyPercent =
      whaleHolders.reduce(
        (
          total,
          holder
        ) =>
          total +
          safeNumber(
            holder.percentage
          ),
        0
      );

    result.largestWalletPercent =
      whaleHolders.length
        ? Math.max(
            ...whaleHolders.map(
              holder =>
                safeNumber(
                  holder.percentage
                )
            )
          )
        : null;

    let transferLookups =
      0;

    for (
      const holder of
      whaleHolders
    ) {

      let flow = {
        direction:
          "UNVERIFIED",

        incoming:
          null,

        outgoing:
          null,

        net:
          null,

        recentIncoming:
          null,

        recentOutgoing:
          null,

        recentNet:
          null,

        incomingCount:
          0,

        outgoingCount:
          0
      };

      /*
       * Skip obvious contracts / exchanges.
       */

      if (
        !holder.isContract &&
        !holder.exchangeLike &&
        transferLookups <
          MAX_WHALE_TRANSFER_LOOKUPS
      ) {
        transferLookups++;

        const transferData =
          await getAddressTokenTransfers(
            env,
            holder.address,
            token
          );

        if (
          transferData.verified
        ) {
          flow =
            analyseWalletTransfers(
              holder.address,
              transferData.transfers
            );
        }
      }

      const walletQuality =
        scoreWalletQuality(
          holder,
          flow
        );

      if (
        flow.direction ===
        "ACCUMULATING"
      ) {
        result
          .accumulatingWhales++;
      }

      if (
        flow.direction ===
        "DISTRIBUTING"
      ) {
        result
          .distributingWhales++;
      }

      if (
        flow.direction ===
        "NEUTRAL"
      ) {
        result
          .neutralWhales++;
      }

      if (
        walletQuality.candidate
      ) {
        result
          .smartMoneyCandidates++;
      }

      if (
        walletQuality
          .verifiedSmartMoney
      ) {
        result
          .verifiedSmartMoney++;
      }

      result.wallets.push({
        address:
          holder.address,

        supplyPercent:
          holder.percentage,

        isContract:
          holder.isContract,

        exchangeLike:
          holder.exchangeLike,

        flow,

        walletQuality
      });
    }

    if (
      result.accumulatingWhales >
      result.distributingWhales
    ) {
      result.accumulationSignal =
        "ACCUMULATION";
    }

    else if (
      result.distributingWhales >
      result.accumulatingWhales
    ) {
      result.accumulationSignal =
        "DISTRIBUTION";
    }

    else if (
      result.whaleCount > 0
    ) {
      result.accumulationSignal =
        "NEUTRAL";
    }

    result.verified =
      true;

    return result;

  } catch (error) {

    result.error =
      String(
        error?.message ||
        error
      );

    return result;
  }
}


/*
 * =========================================================
 * V71 WHALE OPPORTUNITY SCORE
 * =========================================================
 */

function applyWhaleOpportunityScore(
  opportunity,
  whales
) {
  let score =
    opportunity.score;

  const reasons = [
    ...(opportunity.reasons || [])
  ];

  if (
    !whales?.verified
  ) {
    return {
      score,
      reasons
    };
  }

  if (
    whales.accumulationSignal ===
    "ACCUMULATION"
  ) {
    score +=
      WHALE_ACCUMULATION_BONUS;

    reasons.push(
      "Whale accumulation detected"
    );
  }

  if (
    whales.accumulatingWhales >=
    2
  ) {
    score += 5;

    reasons.push(
      "Multiple accumulating whales"
    );
  }

  if (
    whales.smartMoneyCandidates >=
    1
  ) {
    score += 5;

    reasons.push(
      "Smart-money candidate wallet detected"
    );
  }

  if (
    whales.smartMoneyCandidates >=
    2
  ) {
    score += 5;

    reasons.push(
      "Multiple high-quality wallet candidates"
    );
  }

  if (
    whales.accumulationSignal ===
    "DISTRIBUTION"
  ) {
    score -=
      WHALE_DISTRIBUTION_PENALTY;

    reasons.push(
      "Whale distribution detected"
    );
  }

  if (
    whales.largestWalletPercent !==
      null &&
    whales.largestWalletPercent >
      EXTREME_WHALE_PERCENT
  ) {
    score -= 5;

    reasons.push(
      "Large single-wallet concentration"
    );
  }

  return {
    score:
      clamp(
        score,
        0,
        100
      ),

    reasons
  };
}


/*
 * =========================================================
 * V71 WHALE RUG-RISK SCORE
 * =========================================================
 */

function applyWhaleRugRisk(
  rugRisk,
  whales
) {
  let score =
    rugRisk.score;

  const reasons = [
    ...(rugRisk.reasons || [])
  ];

  if (
    !whales?.verified
  ) {
    return {
      score,

      label:
        score >= 80
          ? "HIGH"
          : score >= 60
          ? "MEDIUM"
          : "LOW",

      reasons
    };
  }

  if (
    whales.largestWalletPercent !==
      null &&
    whales.largestWalletPercent >
      20
  ) {
    score += 20;

    reasons.push(
      "Extreme whale concentration"
    );
  }

  else if (
    whales.largestWalletPercent !==
      null &&
    whales.largestWalletPercent >
      10
  ) {
    score += 10;

    reasons.push(
      "High whale concentration"
    );
  }

  if (
    whales.whaleSupplyPercent >
    70
  ) {
    score += 15;

    reasons.push(
      "Whales control majority of supply"
    );
  }

  if (
    whales.accumulationSignal ===
    "DISTRIBUTION"
  ) {
    score += 10;

    reasons.push(
      "Large wallets distributing"
    );
  }

  if (
    whales.accumulationSignal ===
    "ACCUMULATION" &&
    whales.whaleSupplyPercent <
      60
  ) {
    score -= 5;
  }

  score =
    clamp(
      score,
      0,
      100
    );

  return {
    score,

    label:
      score >= 80
        ? "HIGH"
        : score >= 60
        ? "MEDIUM"
        : "LOW",

    reasons
  };
}


/*
 * =========================================================
 * V71 ANALYSIS FUNCTION
 *
 * CALL THIS AFTER V70:
 *
 * const rugRisk = scoreRugRisk(...)
 * const opportunity = scoreOpportunity(...)
 *
 * Replace those final values with this function.
 * =========================================================
 */

async function buildV71Intelligence(
  env,
  token,
  activity,
  market,
  holders
) {
  const baseRugRisk =
    scoreRugRisk(
      token,
      activity,
      market,
      holders
    );

  const baseOpportunity =
    scoreOpportunity(
      token,
      activity,
      market,
      holders
    );

  const whales =
    await getWhaleIntelligence(
      env,
      token.address,
      token.totalSupply,
      holders
    );

  const rugRisk =
    applyWhaleRugRisk(
      baseRugRisk,
      whales
    );

  const opportunity =
    applyWhaleOpportunityScore(
      baseOpportunity,
      whales
    );

  return {
    whales,
    rugRisk,
    opportunity
  };
}


/*
 * =========================================================
 * IMPORTANT V70 -> V71 SCAN CHANGE
 * =========================================================
 *
 * FIND THIS IN YOUR V70 scan():
 *
 * const rugRisk =
 *   scoreRugRisk(
 *     token,
 *     activity,
 *     market,
 *     holders
 *   );
 *
 * const opportunity =
 *   scoreOpportunity(
 *     token,
 *     activity,
 *     market,
 *     holders
 *   );
 *
 *
 * REPLACE IT WITH:
 */

const v71ExampleReplacement = async (
  env,
  token,
  activity,
  market,
  holders
) => {

  const intelligence =
    await buildV71Intelligence(
      env,
      token,
      activity,
      market,
      holders
    );

  const whales =
    intelligence.whales;

  const rugRisk =
    intelligence.rugRisk;

  const opportunity =
    intelligence.opportunity;

  return {
    whales,
    rugRisk,
    opportunity
  };
};


/*
 * =========================================================
 * THEN IN analysedCandidate ADD:
 * =========================================================
 *
 * whales,
 *
 * so it becomes:
 *
 * const analysedCandidate = {
 *   ...
 *   activity,
 *   market,
 *   holders,
 *   whales,
 *   rugRisk,
 *   opportunity,
 *   ...
 * };
 */


/*
 * =========================================================
 * V71 TELEGRAM MESSAGE
 *
 * In sendTelegram(), replace the existing message
 * declaration with this function call:
 *
 * const message = buildV71TelegramMessage(candidate);
 * =========================================================
 */

function buildV71TelegramMessage(
  candidate
) {
  const market =
    candidate.market || {};

  const holders =
    candidate.holders || {};

  const whales =
    candidate.whales || {};

  const opportunity =
    candidate.opportunity || {
      score: 0,
      reasons: []
    };

  const rugRisk =
    candidate.rugRisk || {
      score: 100,
      label: "HIGH",
      reasons: []
    };

  const whaleSignal =
    whales.verified
      ? whales.accumulationSignal
      : "DATA UNVERIFIED";

  const smartMoney =
    whales.verified
      ? whales.smartMoneyCandidates
      : "DATA UNVERIFIED";

  const verifiedSmartMoney =
    whales.verifiedSmartMoney > 0
      ? whales.verifiedSmartMoney
      : "NOT VERIFIED";

  return (
`🚨 Robinhood Chain Meme Hunter V71

🪙 ${candidate.name || "Unknown"} (${candidate.symbol || "?"})

Contract:
${candidate.address}

🎯 Opportunity: ${opportunity.score}/100
🛡 Rug Risk: ${rugRisk.score}/100 (${rugRisk.label})

💰 Market Cap: ${formatMoney(market.marketCap)}
💧 Liquidity: ${formatMoney(market.liquidityUsd)}
📊 24h Volume: ${formatMoney(market.volume?.h24)}
⚡ 1h Volume: ${formatMoney(market.volume?.h1)}

🟢 1h Buys: ${market.transactions?.h1?.buys ?? "UNVERIFIED"}
🔴 1h Sells: ${market.transactions?.h1?.sells ?? "UNVERIFIED"}

👥 Holders: ${holders.holderCount ?? "UNVERIFIED"}

🐋 WHALE INTELLIGENCE

Signal: ${whaleSignal}

Accumulating whales:
${whales.accumulatingWhales ?? "UNVERIFIED"}

Distributing whales:
${whales.distributingWhales ?? "UNVERIFIED"}

Whale supply:
${
  whales.verified
    ? Number(
        whales.whaleSupplyPercent || 0
      ).toFixed(2) + "%"
    : "UNVERIFIED"
}

Largest whale:
${
  whales.largestWalletPercent !== null &&
  whales.largestWalletPercent !== undefined
    ? Number(
        whales.largestWalletPercent
      ).toFixed(2) + "%"
    : "UNVERIFIED"
}

🧠 Smart-money candidates:
${smartMoney}

Verified smart money:
${verifiedSmartMoney}

📡 V4 Swaps: ${candidate.activity?.swaps ?? 0}
💦 Liquidity Events: ${candidate.activity?.liquidityEvents ?? 0}

WHY:

${(opportunity.reasons || [])
  .map(
    reason =>
      "• " + reason
  )
  .join("\n")}

RISK:

${(rugRisk.reasons || [])
  .map(
    reason =>
      "• " + reason
  )
  .join("\n")}

${
  market.url
    ? `Chart:\n${market.url}`
    : ""
}

⚠️ Automated high-risk early-stage screening.
Smart-money labels remain unverified unless wallet history proves performance.`
  );
}


/*
 * =========================================================
 * V71 HEALTH INTELLIGENCE
 *
 * Replace the intelligence section returned by scan()
 * with:
 * =========================================================
 */

function v71IntelligenceStatus(
  stateResult
) {
  return {
    persistentBlockTracking:
      stateResult.persistent
        ? "ENABLED"
        : "DISABLED_NO_KV",

    kvBinding:
      stateResult.binding ||
      "NONE",

    catchUpScanning:
      "10_BLOCK_CHUNKS",

    persistentCandidateWatch:
      stateResult.persistent
        ? "ENABLED"
        : "MEMORYLESS_FALLBACK",

    persistentAlertCooldown:
      stateResult.persistent
        ? "ENABLED"
        : "MEMORY_ONLY",

    market:
      "DEXSCREENER",

    holders:
      "BLOCKSCOUT",

    whaleActivity:
      "BLOCKSCOUT_TRANSFER_ANALYSIS",

    whaleAccumulation:
      "ENABLED",

    whaleDistribution:
      "ENABLED",

    smartMoneyCandidates:
      "ENABLED",

    smartMoney:
      "CANDIDATE_DETECTION_ONLY",

    verifiedSmartMoney:
      "NOT_YET_IMPLEMENTED",

    socialMomentum:
      "NOT_VERIFIED"
  };
}


/*
 * =========================================================
 * V71 ARCHITECTURE NAME
 * =========================================================
 *
 * Replace:
 *
 * V70_DUAL_KV_BINDING_PERSISTENT_GAP_FREE_HUNTER
 *
 * with:
 *
 * V71_PERSISTENT_WHALE_INTELLIGENCE_HUNTER
 *
 *
 * ALSO replace the original:
 *
 * const VERSION = "V70";
 *
 * with:
 *
 * const VERSION = "V71";
 *
 * Do NOT leave two VERSION declarations.
 * =========================================================
 */
