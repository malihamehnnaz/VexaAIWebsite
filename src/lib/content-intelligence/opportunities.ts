// Content Opportunity Engine — combines CURRENT TREND signals (trends.ts)
// with real GP PERFORMANCE (performance.ts) and restaurant context
// (restaurant-context.ts) into ranked CONTENT OPPORTUNITY records. Every
// score is computed from real, inspectable inputs via the documented
// formulas below — nothing is an opaque model output, and nothing promises
// virality (see the language used in `recommendation`/`reason` throughout).
//
// Two opportunity strategies, both grounded in real data:
//   1. Trend-linked — one real current trend signal + the restaurant's own
//      best-performing format/day/time.
//   2. Performance-only — purely the restaurant's own historical pattern,
//      used when there are too few (or zero) trend signals, or always
//      included alongside trend-linked ones so the engine never depends
//      entirely on the external trend layer being available.

import { randomUUID } from 'crypto';
import { getTrendSignals, type TrendFetchResult } from '@/lib/content-intelligence/trends';
import { getPerformanceSummary, type PerformanceSummary } from '@/lib/content-intelligence/performance';
import { getRestaurantContext } from '@/lib/content-intelligence/restaurant-context';
import { saveOpportunities } from '@/lib/content-intelligence/store';
import type { ContentOpportunity, ContentFormat, Confidence, TrendSignal, RestaurantContext } from '@/lib/content-intelligence/types';

const MAX_TREND_LINKED_OPPORTUNITIES = 5;

// Opportunity score weights — must sum to 1. Documented here so the number
// on any opportunity is auditable, not a black box.
const WEIGHTS = { trend: 0.35, audienceFit: 0.25, historicalFit: 0.25, freshness: 0.15 } as const;

function freshnessScoreFor(freshness: TrendSignal['freshness'] | null): number {
  if (freshness === 'new') return 100;
  if (freshness === 'recent') return 75;
  if (freshness === 'aging') return 45;
  if (freshness === 'stale') return 15;
  return 50; // no trend attached — evergreen, neutral
}

// trendConfidence is the linked TrendSignal's own confidence (how many
// independent real articles support it) — a low-confidence trend (e.g. one
// single source) must cap the opportunity's own confidence, never inflate
// it past what the underlying evidence actually supports.
function confidenceFromScore(score: number, hasRealHistory: boolean, hasTrend: boolean, trendConfidence: Confidence | null): Confidence {
  const rank: Record<Confidence, number> = { low: 0, medium: 1, high: 2 };
  let level: Confidence;
  if (hasRealHistory && hasTrend && score >= 70) level = 'high';
  else if ((hasRealHistory || hasTrend) && score >= 50) level = 'medium';
  else level = 'low';

  if (trendConfidence && rank[trendConfidence] < rank[level]) return trendConfidence;
  return level;
}

function bestFormat(performance: PerformanceSummary): { format: ContentFormat; reason: string } {
  if (performance.formatPerformanceAvailable && performance.formatPerformance.length > 0) {
    const top = performance.formatPerformance[0];
    const normalized = normalizeFormat(top.format);
    return { format: normalized, reason: `${top.format} posts average ${top.avgEngagementProxy.toFixed(1)} comments across ${top.postCount} historical posts — your highest-performing format.` };
  }
  return { format: 'photo', reason: 'No format-performance history available yet — photo is the safest default until more data accumulates.' };
}

function normalizeFormat(raw: string): ContentFormat {
  const lower = raw.toLowerCase();
  if (lower.includes('reel')) return 'reel';
  if (lower.includes('video')) return 'video';
  if (lower.includes('carousel')) return 'carousel';
  if (lower.includes('story')) return 'story';
  return 'photo';
}

function audienceFitScoreFor(format: ContentFormat, performance: PerformanceSummary): { score: number; reason: string } {
  if (!performance.formatPerformanceAvailable) {
    return { score: 50, reason: 'No historical format-performance data yet — neutral score.' };
  }
  const idx = performance.formatPerformance.findIndex(f => normalizeFormat(f.format) === format);
  if (idx === -1) return { score: 45, reason: `No historical posts in the "${format}" format to measure fit from.` };
  const total = performance.formatPerformance.length;
  // Best-ranked format -> ~90, worst -> ~40, linear between.
  const score = total <= 1 ? 90 : Math.round(90 - (idx / (total - 1)) * 50);
  const entry = performance.formatPerformance[idx];
  return { score, reason: `"${format}" ranks #${idx + 1} of ${total} known formats by average engagement (${entry.avgEngagementProxy.toFixed(1)} comments/post).` };
}

function significantWords(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3));
}

function historicalFitScoreFor(topic: string, performance: PerformanceSummary): { score: number; reason: string } {
  const captions = performance.topPosts.map(p => p.caption).filter((c): c is string => !!c);
  if (captions.length === 0) {
    return { score: 50, reason: 'No historical post captions available to compare topical fit against — neutral score.' };
  }
  const topicWords = significantWords(topic);
  let matches = 0;
  for (const caption of captions) {
    const captionWords = significantWords(caption);
    for (const w of topicWords) if (captionWords.has(w)) { matches++; break; }
  }
  const ratio = matches / captions.length;
  const score = Math.round(40 + ratio * 60);
  return { score, reason: matches > 0 ? `${matches} of your top ${captions.length} historical posts share topical overlap with "${topic}".` : `No topical overlap found between "${topic}" and your top-performing historical posts — this would be new territory.` };
}

function recommendedDayTime(performance: PerformanceSummary): { day: string | null; time: string | null; reason: string | null } {
  if (performance.dayPerformance.length === 0) return { day: null, time: null, reason: null };
  const bestDay = performance.dayPerformance[0];
  const bestHour = performance.hourPerformance[0];
  const time = bestHour ? `${String(bestHour.hour).padStart(2, '0')}:00 UTC` : null;
  const reason = `${bestDay.day} posts average ${bestDay.avgEngagementProxy.toFixed(1)} comments (${bestDay.postCount} historical posts)${bestHour ? `; the ${time} hour has historically performed best (${bestHour.avgEngagementProxy.toFixed(1)} avg)` : ''}. Times are UTC — this app does not currently store the restaurant's local timezone.`;
  return { day: bestDay.day, time, reason };
}

function buildOpportunity(params: {
  pageId: string;
  title: string;
  recommendation: string;
  topic: string;
  format: ContentFormat;
  reason: string;
  trendSignal: TrendSignal | null;
  performance: PerformanceSummary;
}): ContentOpportunity {
  const { pageId, title, recommendation, topic, format, reason, trendSignal, performance } = params;

  const trendScore = trendSignal ? Math.round((trendSignal.momentumScore + trendSignal.relevanceScore) / 2) : 40;
  const { score: audienceFitScore, reason: audienceReason } = audienceFitScoreFor(format, performance);
  const { score: historicalFitScore, reason: historicalReason } = historicalFitScoreFor(topic, performance);
  const freshnessScore = freshnessScoreFor(trendSignal?.freshness ?? null);

  const opportunityScore = Math.round(
    trendScore * WEIGHTS.trend +
    audienceFitScore * WEIGHTS.audienceFit +
    historicalFitScore * WEIGHTS.historicalFit +
    freshnessScore * WEIGHTS.freshness
  );

  const { day, time, reason: dayTimeReason } = recommendedDayTime(performance);

  const supportingEvidence = [
    trendSignal ? `Current trend: "${trendSignal.topic}" (${trendSignal.confidence} confidence, ${trendSignal.evidence.length} source(s), source: ${trendSignal.source}).` : 'No matching current trend signal — this opportunity is grounded entirely in your own historical performance.',
    audienceReason,
    historicalReason,
    dayTimeReason,
  ].filter((s): s is string => !!s);

  return {
    id: randomUUID(),
    pageId,
    title,
    recommendation,
    topic,
    format,
    reason,
    trendSignalId: trendSignal?.id ?? null,
    trendScore,
    audienceFitScore,
    historicalFitScore,
    freshnessScore,
    opportunityScore,
    confidence: confidenceFromScore(opportunityScore, performance.totalHistoricalPosts > 0, trendSignal != null, trendSignal?.confidence ?? null),
    recommendedDay: day,
    recommendedTime: time,
    supportingEvidence,
    computedAt: new Date().toISOString(),
  };
}

export interface OpportunityGenerationResult {
  opportunities: ContentOpportunity[];
  insufficientData: boolean;
  insufficientDataReason: string | null;
  trendFetch: TrendFetchResult;
  restaurantContext: RestaurantContext;
}

export async function generateOpportunities(pageId: string): Promise<OpportunityGenerationResult> {
  const [trendFetch, performance, restaurantContext] = await Promise.all([
    getTrendSignals(),
    getPerformanceSummary(),
    getRestaurantContext(pageId),
  ]);

  const hasAnyPerformanceData = performance.totalHistoricalPosts > 0 || performance.recentPageReach != null;
  if (trendFetch.signals.length === 0 && !hasAnyPerformanceData) {
    return {
      opportunities: [],
      insufficientData: true,
      insufficientDataReason: 'No current trend signals and no historical Facebook/Instagram performance data are available yet — insufficient data for a reliable recommendation.',
      trendFetch,
      restaurantContext,
    };
  }

  const opportunities: ContentOpportunity[] = [];
  const { format: defaultFormat, reason: defaultFormatReason } = bestFormat(performance);

  // Strategy 1 — trend-linked, top N by momentum*relevance.
  const rankedTrends = [...trendFetch.signals].sort((a, b) => (b.momentumScore * b.relevanceScore) - (a.momentumScore * a.relevanceScore));
  for (const trend of rankedTrends.slice(0, MAX_TREND_LINKED_OPPORTUNITIES)) {
    opportunities.push(buildOpportunity({
      pageId,
      title: `Post about: ${trend.topic}`,
      recommendation: `Create a ${defaultFormat} tying your menu/experience to "${trend.topic}", currently active in food/hospitality coverage. ${defaultFormatReason}`,
      topic: trend.topic,
      format: defaultFormat,
      reason: `Highest-scoring opportunity based on current signals: an active trend ("${trend.topic}") combined with your own best-performing content format.`,
      trendSignal: trend,
      performance,
    }));
  }

  // Strategy 2 — performance-only, always included when real historical
  // data exists, so the engine never depends solely on the trend layer.
  if (performance.formatPerformanceAvailable && performance.formatPerformance.length > 0) {
    const top = performance.formatPerformance[0];
    const format = normalizeFormat(top.format);
    opportunities.push(buildOpportunity({
      pageId,
      title: `Post more ${format} content`,
      recommendation: `Your ${top.format} posts average ${top.avgEngagementProxy.toFixed(1)} comments vs your other formats — post another ${format} to capitalize on a format your audience already responds to.`,
      topic: `${format} content`,
      format,
      reason: 'Highest-scoring opportunity based on current signals: your own historical format performance, independent of external trends.',
      trendSignal: null,
      performance,
    }));
  }

  const ranked = opportunities.sort((a, b) => b.opportunityScore - a.opportunityScore);

  // Best-effort persistence — opportunities reference real trend_signal_id
  // values already (trendFetch.signals were persisted by getTrendSignals,
  // which returns the DB-assigned ids, not synthetic source ids).
  try {
    await saveOpportunities(ranked);
  } catch (err) {
    console.error('[content-intelligence/opportunities] failed to persist opportunities:', err instanceof Error ? err.message : err);
  }

  return { opportunities: ranked, insufficientData: false, insufficientDataReason: null, trendFetch, restaurantContext };
}
