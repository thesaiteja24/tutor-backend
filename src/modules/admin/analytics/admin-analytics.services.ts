import {
  type AdminAnalyticsRepository,
  adminAnalyticsRepository,
} from "./admin-analytics.repositories.ts";

// Standard Industry & Sarvam AI / Groq Pricing Constants
export const PRICING_CONSTANTS = {
  // Sarvam AI Saaras v3 STT: ₹0.10 per minute of audio
  STT_RATE_PER_MIN_INR: 0.1,
  // Sarvam AI Bulbul v3 TTS: ₹0.15 per minute of synthesized audio (or ~₹0.15 per 1,000 characters)
  TTS_RATE_PER_MIN_INR: 0.15,
  // LLM (Groq Llama 3.3 70B / Fast LLM): ₹0.02 per 1k input tokens, ₹0.06 per 1k output tokens
  LLM_INPUT_RATE_PER_1K_INR: 0.02,
  LLM_OUTPUT_RATE_PER_1K_INR: 0.06,
  // USD to INR conversion rate estimate
  USD_TO_INR: 84.0,
};

function calculatePercentiles(values: number[]) {
  if (values.length === 0) {
    return { p50: 0, p90: 0, p95: 0, mean: 0, min: 0, max: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const getP = (p: number) => {
    const idx = Math.floor((p / 100) * sorted.length);
    return sorted[Math.min(idx, sorted.length - 1)];
  };

  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const mean = Math.round(sum / sorted.length);

  return {
    p50: getP(50),
    p90: getP(90),
    p95: getP(95),
    mean,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    count: sorted.length,
  };
}

export class AdminAnalyticsService {
  constructor(private readonly repo: AdminAnalyticsRepository = adminAnalyticsRepository) {}

  async getOverview() {
    const userStats = await this.repo.getUserStats();
    const convStats = await this.repo.getConversationAndTurnStats();
    const telemetryRows = await this.repo.getTelemetryAndUsageData();

    // Calculate total speaking seconds and character metrics from telemetry
    let totalAudioSecs = 0;
    let totalTtsChars = 0;
    let totalEstimatedLlmTokens = 0;
    const totalLatencies: number[] = [];

    for (const row of telemetryRows) {
      if (row.transcriptMetadata?.durationSeconds) {
        totalAudioSecs += row.transcriptMetadata.durationSeconds;
      }
      if (row.latencyMetrics?.ttsInputCharacters) {
        totalTtsChars += row.latencyMetrics.ttsInputCharacters;
      }
      if (row.latencyMetrics?.totalMs) {
        totalLatencies.push(row.latencyMetrics.totalMs);
      }
      // Estimate ~150 prompt tokens and ~75 completion tokens per assistant turn if not logged
      if (row.sender === "assistant") {
        totalEstimatedLlmTokens += 225;
      }
    }

    const speakingMinutes = Number((totalAudioSecs / 60).toFixed(2));
    const ttsMinutes = Number(((totalTtsChars / 1000) * 1.5).toFixed(2));

    const sttCostInr = Number((speakingMinutes * PRICING_CONSTANTS.STT_RATE_PER_MIN_INR).toFixed(2));
    const ttsCostInr = Number((ttsMinutes * PRICING_CONSTANTS.TTS_RATE_PER_MIN_INR).toFixed(2));
    const llmCostInr = Number(
      ((totalEstimatedLlmTokens / 1000) * ((PRICING_CONSTANTS.LLM_INPUT_RATE_PER_1K_INR + PRICING_CONSTANTS.LLM_OUTPUT_RATE_PER_1K_INR) / 2)).toFixed(2),
    );

    const totalSpendInr = Number((sttCostInr + ttsCostInr + llmCostInr).toFixed(2));
    const totalSpendUsd = Number((totalSpendInr / PRICING_CONSTANTS.USD_TO_INR).toFixed(2));

    const latencySummary = calculatePercentiles(totalLatencies);

    const activeLearners = Math.max(userStats.dau, userStats.wau, 1);
    const costPerLearnerInr = Number((totalSpendInr / activeLearners).toFixed(2));
    const costPerTurnInr = convStats.totalTurns > 0 ? Number((totalSpendInr / convStats.totalTurns).toFixed(3)) : 0;

    return {
      users: {
        total: userStats.total,
        dau: userStats.dau,
        wau: userStats.wau,
        mau: userStats.mau,
        breakdownByRole: userStats.roles,
      },
      usage: {
        totalConversations: convStats.totalConversations,
        totalTurns: convStats.totalTurns,
        speakingMinutes,
        ttsMinutes,
        estimatedLlmTokens: totalEstimatedLlmTokens,
      },
      costs: {
        currency: "INR",
        totalSpendInr,
        totalSpendUsd,
        sttCostInr,
        ttsCostInr,
        llmCostInr,
        unitEconomics: {
          costPerActiveLearnerInr: costPerLearnerInr,
          costPerTurnInr,
        },
      },
      telemetry: {
        p50LatencyMs: latencySummary.p50,
        p95LatencyMs: latencySummary.p95,
        averageLatencyMs: latencySummary.mean,
        sampleCount: latencySummary.count,
      },
    };
  }

  async getCosts() {
    const overview = await this.getOverview();

    return {
      currency: "INR",
      exchangeRateUsdToInr: PRICING_CONSTANTS.USD_TO_INR,
      totals: {
        inr: overview.costs.totalSpendInr,
        usd: overview.costs.totalSpendUsd,
      },
      breakdown: [
        {
          component: "Speech-to-Text (STT)",
          provider: "Sarvam AI (Saaras v3)",
          usage: `${overview.usage.speakingMinutes} mins`,
          rate: `₹${PRICING_CONSTANTS.STT_RATE_PER_MIN_INR}/min`,
          costInr: overview.costs.sttCostInr,
          percentageOfTotal: overview.costs.totalSpendInr > 0 ? Math.round((overview.costs.sttCostInr / overview.costs.totalSpendInr) * 100) : 0,
        },
        {
          component: "Text-to-Speech (TTS)",
          provider: "Sarvam AI (Bulbul v3)",
          usage: `${overview.usage.ttsMinutes} mins equivalent`,
          rate: `₹${PRICING_CONSTANTS.TTS_RATE_PER_MIN_INR}/min`,
          costInr: overview.costs.ttsCostInr,
          percentageOfTotal: overview.costs.totalSpendInr > 0 ? Math.round((overview.costs.ttsCostInr / overview.costs.totalSpendInr) * 100) : 0,
        },
        {
          component: "LLM Reasoning & Turn Synthesis",
          provider: "Groq (Llama 3.3 70B)",
          usage: `${overview.usage.estimatedLlmTokens.toLocaleString()} tokens`,
          rate: `₹${PRICING_CONSTANTS.LLM_INPUT_RATE_PER_1K_INR} in / ₹${PRICING_CONSTANTS.LLM_OUTPUT_RATE_PER_1K_INR} out per 1k`,
          costInr: overview.costs.llmCostInr,
          percentageOfTotal: overview.costs.totalSpendInr > 0 ? Math.round((overview.costs.llmCostInr / overview.costs.totalSpendInr) * 100) : 0,
        },
      ],
      unitEconomics: overview.costs.unitEconomics,
    };
  }

  async getLatencyTelemetry() {
    const rows = await this.repo.getTelemetryAndUsageData();

    const sttLatencies: number[] = [];
    const llmLatencies: number[] = [];
    const ttsLatencies: number[] = [];
    const totalLatencies: number[] = [];

    for (const row of rows) {
      if (row.latencyMetrics?.sttMs) sttLatencies.push(row.latencyMetrics.sttMs);
      if (row.latencyMetrics?.llmMs) llmLatencies.push(row.latencyMetrics.llmMs);
      if (row.latencyMetrics?.ttsMs) ttsLatencies.push(row.latencyMetrics.ttsMs);
      if (row.latencyMetrics?.totalMs) totalLatencies.push(row.latencyMetrics.totalMs);
    }

    const endToEndStats = calculatePercentiles(totalLatencies);

    return {
      summary: {
        totalSamples: totalLatencies.length,
        isPerformant: totalLatencies.length > 0 ? (endToEndStats.p95 ?? 0) < 1500 : true,
        targetP95Ms: 1200,
      },
      stages: {
        stt: calculatePercentiles(sttLatencies),
        llm: calculatePercentiles(llmLatencies),
        tts: calculatePercentiles(ttsLatencies),
        endToEnd: calculatePercentiles(totalLatencies),
      },
    };
  }
}

export const adminAnalyticsService = new AdminAnalyticsService();
