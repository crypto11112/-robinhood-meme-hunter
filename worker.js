{
  "agent": "ChainVanta",
  "version": "V1101",
  "diagnostic": "BREAKOUT_STATUS_V1101",
  "success": true,
  "readOnly": true,
  "shadowOnly": true,
  "externalRequestsUsed": 0,
  "status": "BREAKOUT_STATUS_OK_V1101",
  "evaluated": 8,
  "evidenceReady": 0,
  "confirmed": 0,
  "watch": 0,
  "pressureBuilding": 0,
  "reversalAttempts": 0,
  "buildingHistory": 8,
  "tokens": [
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x4472c69d299382f8847ebce4fc6ed8e295510e3e",
      "symbol": "pBTC3x",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 5,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 6,
      "providerVerifiedPriceRowsV1101": 6,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 20,
        "delta": -20
      },
      "latestVerifiedFlow": {
        "capturedAt": 1791075706988,
        "trades": 2,
        "buyUsd": 10.75,
        "sellUsd": 0,
        "netUsd": 10.75,
        "buyPressurePct": 100
      },
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 80,
        "combinedShadowScore": 0
      },
      "reasons": [
        "LATEST_VERIFIED_FLOW_STRONGLY_POSITIVE"
      ],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "VERIFIED_FLOW_TOO_SMALL_FOR_ACCUMULATION_V1093",
        "MOMENTUM_WEAKENING",
        "FLOW_ACCUMULATION_NOT_READY",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x39dbed3a2bd333467115de45665cc57f813c4571",
      "symbol": "PONS",
      "evidenceReady": false,
      "flowEvidenceReady": true,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 2,
      "providerVerifiedPriceRowsV1101": 2,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 10,
        "delta": -10
      },
      "latestVerifiedFlow": {
        "capturedAt": 1791090095468,
        "trades": 76,
        "buyUsd": 47124.29,
        "sellUsd": 26209.88,
        "netUsd": 20914.41,
        "buyPressurePct": 64.26
      },
      "accumulation": {
        "state": "DISTRIBUTION",
        "evidenceReady": true,
        "flowScore": 30,
        "combinedShadowScore": 36
      },
      "reasons": [
        "LATEST_VERIFIED_FLOW_POSITIVE"
      ],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "SELL_PRESSURE_DOMINANT",
        "LONGITUDINAL_DISTRIBUTION",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x8d1612b4b78ebf08cfbf01a04fa270ccbb0509a2",
      "symbol": "RKST",
      "evidenceReady": false,
      "flowEvidenceReady": true,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 5,
      "providerVerifiedPriceRowsV1101": 5,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 1,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 12,
        "delta": -12
      },
      "latestVerifiedFlow": {
        "capturedAt": 1791091011677,
        "trades": 11,
        "buyUsd": 0,
        "sellUsd": 1339.87,
        "netUsd": -1339.87,
        "buyPressurePct": 0
      },
      "accumulation": {
        "state": "DISTRIBUTION",
        "evidenceReady": true,
        "flowScore": 0,
        "combinedShadowScore": 15
      },
      "reasons": [],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "SELL_PRESSURE_DOMINANT",
        "NET_FLOW_PERSISTENTLY_NEGATIVE",
        "LONGITUDINAL_DISTRIBUTION",
        "LATEST_VERIFIED_FLOW_NEGATIVE",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0xab093def657f15df31b33922a95e047add645b29",
      "symbol": "SHROOM",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": true,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 1,
      "verifiedPriceObservationsV1101": 2,
      "providerVerifiedPriceRowsV1101": 7,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 2,
      "onChainChangedPriceRowsV1095": 1,
      "priceEvidenceSourceV1095": "VERIFIED_V438_ONCHAIN_EXECUTION_PRICE_HISTORY",
      "changedMarketSpanMinutes": 35.8,
      "verifiedPrice": {
        "baselineAt": 1791091269293,
        "latestChangedAt": 1791093419808,
        "firstChangedAt": 1791091269293,
        "baselineUsd": 0.044709155164580024,
        "firstUsd": 0.044709155164580024,
        "latestUsd": 0.012865970973075708,
        "changePct": -71.22,
        "baselineIntegrityV1101": "VERIFIED_PRIOR_BASELINE_TO_CHANGED_OBSERVATION"
      },
      "momentum": {
        "latest": 10,
        "prior": 0,
        "delta": 10
      },
      "latestVerifiedFlow": {
        "capturedAt": 1791093419808,
        "trades": 4,
        "buyUsd": 515.73,
        "sellUsd": 1281.61,
        "netUsd": -765.88,
        "buyPressurePct": 28.69
      },
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 34,
        "combinedShadowScore": 0
      },
      "reasons": [],
      "warnings": [
        "VERIFIED_FLOW_TOO_SMALL_FOR_ACCUMULATION_V1093",
        "LATEST_VERIFIED_FLOW_NEGATIVE",
        "VERIFIED_PRICE_BREAKDOWN",
        "FLOW_ACCUMULATION_NOT_READY"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x157a752f3446fe891d6e2881006813703fbb3ad9",
      "symbol": "CATSTRO",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 7,
      "providerVerifiedPriceRowsV1101": 7,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 10,
        "delta": -10
      },
      "latestVerifiedFlow": null,
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 0,
        "combinedShadowScore": 0
      },
      "reasons": [],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "VERIFIED_FLOW_UNAVAILABLE",
        "FLOW_ACCUMULATION_NOT_READY",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x11b70d0243baf75e85ce03201a92b5b7c33beb59",
      "symbol": "ROBIN",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 3,
      "providerVerifiedPriceRowsV1101": 3,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 5,
        "prior": 0,
        "delta": 5
      },
      "latestVerifiedFlow": null,
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 0,
        "combinedShadowScore": 0
      },
      "reasons": [],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "VERIFIED_FLOW_UNAVAILABLE",
        "FLOW_ACCUMULATION_NOT_READY",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x1ec871553be07dc68ec1661c32eca7e2e46e1e18",
      "symbol": "STONKS",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 1,
      "providerVerifiedPriceRowsV1101": 1,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 0,
        "delta": 0
      },
      "latestVerifiedFlow": null,
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 0,
        "combinedShadowScore": 0
      },
      "reasons": [],
      "warnings": [
        "INSUFFICIENT_VERIFIED_MARKET_HISTORY",
        "INSUFFICIENT_OBSERVATIONS",
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "VERIFIED_FLOW_UNAVAILABLE",
        "FLOW_ACCUMULATION_NOT_READY",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    },
    {
      "version": "V1101",
      "shadowOnly": true,
      "actionable": false,
      "address": "0x47366e0f257ac009e82bd46fb74e2fb50826ce98",
      "symbol": "AOBS",
      "evidenceReady": false,
      "flowEvidenceReady": false,
      "marketEvidenceReady": false,
      "safetyWarning": false,
      "breakoutScore": 0,
      "breakoutState": "BUILDING_BREAKOUT_HISTORY",
      "verifiedChangedMarketRows": 0,
      "verifiedPriceObservationsV1101": 4,
      "providerVerifiedPriceRowsV1101": 4,
      "providerChangedMarketRowsV1095": 0,
      "onChainVerifiedPriceRowsV1101": 0,
      "onChainChangedPriceRowsV1095": 0,
      "priceEvidenceSourceV1095": null,
      "changedMarketSpanMinutes": 0,
      "verifiedPrice": {
        "baselineAt": null,
        "latestChangedAt": null,
        "firstChangedAt": null,
        "baselineUsd": 0,
        "firstUsd": 0,
        "latestUsd": 0,
        "changePct": 0,
        "baselineIntegrityV1101": "INSUFFICIENT_SEQUENCE"
      },
      "momentum": {
        "latest": 0,
        "prior": 0,
        "delta": 0
      },
      "latestVerifiedFlow": null,
      "accumulation": {
        "state": "BUILDING_FLOW_HISTORY",
        "evidenceReady": false,
        "flowScore": 0,
        "combinedShadowScore": 0
      },
      "reasons": [],
      "warnings": [
        "BUY_SELL_PRESSURE_UNAVAILABLE",
        "VERIFIED_FLOW_UNAVAILABLE",
        "FLOW_ACCUMULATION_NOT_READY",
        "VERIFIED_CHANGED_MARKET_HISTORY_INSUFFICIENT"
      ],
      "interpretation": "More verified material flow and changed market history are required before breakout pressure can be assessed.",
      "methodology": {
        "staleOrUnchangedSnapshotsCountAsPriceMovement": false,
        "verifiedOnChainExecutionPriceCanConfirmMovementV1095": true,
        "providerAndOnChainPriceEvidenceKeptSeparate": true,
        "verifiedPriceObservationsRequiredV1101": 2,
        "genuineChangedSnapshotsRequiredV1101": 1,
        "changedMarketRowsRequiredLegacyV1094": 2,
        "changedMarketSpanMinutesRequired": 5,
        "baselineSemanticsV1101": "PRIOR_VERIFIED_BASELINE_TO_LATEST_CHANGED_OBSERVATION",
        "requiresMaterialFlowAccumulationEvidence": true,
        "productionImpact": false
      },
      "productionImpact": {
        "opportunityChanged": false,
        "momentumChanged": false,
        "confidenceChanged": false,
        "riskChanged": false,
        "telegramQualificationChanged": false,
        "telegramCallsChanged": false
      }
    }
  ],
  "note": "Shadow only. Breakout requires materially sized verified V212 flow plus genuinely changed verified provider or V438 on-chain execution-price evidence; stale/cache repeats do not count.",
  "timestamp": "2026-10-04T06:20:40.331Z"
}
