// Persistence for the Content Intelligence pipeline — four tables per
// supabase_migration_content_intelligence.sql, deliberately kept separate
// (never merging trend data into opportunity rows, etc.) so the CURRENT
// TREND / CONTENT OPPORTUNITY / AI-GENERATED CONTENT layers stay
// distinguishable in storage, matching the API/type layer.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import type { TrendSignal, ContentOpportunity, GeneratedContent, GeneratedContentInput, Confidence, ContentFormat, Platform } from '@/lib/content-intelligence/types';

// ── Trend signals (also the caching layer — see trends.ts) ──────────────────

// Returns the persisted rows WITH their real database ids — callers must
// use these ids (not the TrendSource's own synthetic id) for anything that
// references a trend signal downstream (e.g. ContentOpportunity.trendSignalId),
// since content_trend_signals.id is a real Postgres uuid the source's
// synthetic id never matches.
export async function saveTrendSignals(signals: TrendSignal[]): Promise<TrendSignal[]> {
  if (signals.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const rows = signals.map(s => ({
    topic: s.topic,
    category: s.category,
    description: s.description,
    source: s.source,
    source_url: s.sourceUrl,
    detected_at: s.detectedAt,
    freshness: s.freshness,
    momentum_score: s.momentumScore,
    relevance_score: s.relevanceScore,
    confidence: s.confidence,
    evidence: s.evidence,
    fetched_at: new Date().toISOString(),
  }));
  const { data, error } = await supabase.from('content_trend_signals').insert(rows).select('*');
  if (error) throw new Error(`content_trend_signals insert failed: ${error.message}`);
  return (data as TrendSignalRow[] ?? []).map(rowToTrendSignal);
}

interface TrendSignalRow {
  id: string;
  topic: string;
  category: string | null;
  description: string | null;
  source: string;
  source_url: string | null;
  detected_at: string;
  freshness: TrendSignal['freshness'];
  momentum_score: number;
  relevance_score: number;
  confidence: Confidence;
  evidence: TrendSignal['evidence'];
  fetched_at: string;
}

function rowToTrendSignal(row: TrendSignalRow): TrendSignal {
  return {
    id: row.id,
    topic: row.topic,
    category: row.category,
    description: row.description,
    source: row.source,
    sourceUrl: row.source_url,
    detectedAt: row.detected_at,
    freshness: row.freshness,
    momentumScore: Number(row.momentum_score),
    relevanceScore: Number(row.relevance_score),
    confidence: row.confidence,
    evidence: row.evidence,
  };
}

// Most recent fetch batch still within maxAgeMs, or null if the newest
// batch is older than that (caller then knows to re-fetch).
export async function getRecentTrendSignals(maxAgeMs: number): Promise<{ signals: TrendSignal[]; fetchedAt: string } | null> {
  const supabase = getSupabaseAdmin();
  const { data: latest, error: latestError } = await supabase
    .from('content_trend_signals')
    .select('fetched_at')
    .order('fetched_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error(`content_trend_signals lookup failed: ${latestError.message}`);
  if (!latest) return null;

  const age = Date.now() - new Date(latest.fetched_at).getTime();
  if (age > maxAgeMs) return null;

  // "This batch" = every row fetched within 1 minute of the newest row —
  // a fetch cycle across multiple sources/queries completes quickly, so
  // this reliably groups one fetch's rows without needing a separate
  // batch-id column.
  const batchWindowStart = new Date(new Date(latest.fetched_at).getTime() - 60_000).toISOString();
  const { data, error } = await supabase
    .from('content_trend_signals')
    .select('*')
    .gte('fetched_at', batchWindowStart)
    .order('momentum_score', { ascending: false });
  if (error) throw new Error(`content_trend_signals query failed: ${error.message}`);

  return { signals: (data as TrendSignalRow[] ?? []).map(rowToTrendSignal), fetchedAt: latest.fetched_at };
}

// ── Opportunities ─────────────────────────────────────────────────────────────

// Returns the persisted rows WITH their real database ids — same reason as
// saveTrendSignals: callers must use these ids (not the in-memory
// randomUUID() assigned when the opportunity was computed) for anything
// referencing it afterward — e.g. /api/content-intelligence/generate looks
// an opportunity up by the id the client was given, which must be the real
// content_opportunities.id or the lookup can never succeed.
export async function saveOpportunities(opportunities: ContentOpportunity[]): Promise<ContentOpportunity[]> {
  if (opportunities.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const rows = opportunities.map(o => ({
    page_id: o.pageId,
    title: o.title,
    recommendation: o.recommendation,
    topic: o.topic,
    format: o.format,
    reason: o.reason,
    trend_signal_id: o.trendSignalId,
    trend_score: o.trendScore,
    audience_fit_score: o.audienceFitScore,
    historical_fit_score: o.historicalFitScore,
    freshness_score: o.freshnessScore,
    opportunity_score: o.opportunityScore,
    confidence: o.confidence,
    recommended_day: o.recommendedDay,
    recommended_time: o.recommendedTime,
    supporting_evidence: o.supportingEvidence,
  }));
  const { data, error } = await supabase.from('content_opportunities').insert(rows).select('*');
  if (error) throw new Error(`content_opportunities insert failed: ${error.message}`);
  return (data as OpportunityRow[] ?? []).map(rowToOpportunity);
}

interface OpportunityRow {
  id: string;
  page_id: string;
  title: string;
  recommendation: string;
  topic: string;
  format: ContentFormat;
  reason: string;
  trend_signal_id: string | null;
  trend_score: number;
  audience_fit_score: number;
  historical_fit_score: number;
  freshness_score: number;
  opportunity_score: number;
  confidence: Confidence;
  recommended_day: string | null;
  recommended_time: string | null;
  supporting_evidence: string[];
  computed_at: string;
}

function rowToOpportunity(row: OpportunityRow): ContentOpportunity {
  return {
    id: row.id,
    pageId: row.page_id,
    title: row.title,
    recommendation: row.recommendation,
    topic: row.topic,
    format: row.format,
    reason: row.reason,
    trendSignalId: row.trend_signal_id,
    trendScore: Number(row.trend_score),
    audienceFitScore: Number(row.audience_fit_score),
    historicalFitScore: Number(row.historical_fit_score),
    freshnessScore: Number(row.freshness_score),
    opportunityScore: Number(row.opportunity_score),
    confidence: row.confidence,
    recommendedDay: row.recommended_day,
    recommendedTime: row.recommended_time,
    supportingEvidence: row.supporting_evidence,
    computedAt: row.computed_at,
  };
}

export async function getRecentOpportunities(pageId: string, maxAgeMs: number, limit = 25): Promise<ContentOpportunity[] | null> {
  const supabase = getSupabaseAdmin();
  const { data: latest, error: latestError } = await supabase
    .from('content_opportunities')
    .select('computed_at')
    .eq('page_id', pageId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) throw new Error(`content_opportunities lookup failed: ${latestError.message}`);
  if (!latest) return null;

  const age = Date.now() - new Date(latest.computed_at).getTime();
  if (age > maxAgeMs) return null;

  const batchWindowStart = new Date(new Date(latest.computed_at).getTime() - 60_000).toISOString();
  const { data, error } = await supabase
    .from('content_opportunities')
    .select('*')
    .eq('page_id', pageId)
    .gte('computed_at', batchWindowStart)
    .order('opportunity_score', { ascending: false })
    .limit(limit);
  if (error) throw new Error(`content_opportunities query failed: ${error.message}`);

  return (data as OpportunityRow[] ?? []).map(rowToOpportunity);
}

export async function getOpportunityById(opportunityId: string): Promise<ContentOpportunity | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('content_opportunities').select('*').eq('id', opportunityId).maybeSingle();
  if (error) throw new Error(`content_opportunities lookup failed: ${error.message}`);
  return data ? rowToOpportunity(data as OpportunityRow) : null;
}

// ── Generated content ────────────────────────────────────────────────────────

export async function saveGeneratedContent(
  pageId: string,
  input: GeneratedContentInput,
  content: Omit<GeneratedContent, 'id' | 'opportunityId' | 'platform' | 'format' | 'status' | 'createdAt'>
): Promise<GeneratedContent> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from('generated_content').insert({
    opportunity_id: input.opportunityId,
    page_id: pageId,
    platform: input.platform,
    format: input.format,
    objective: input.objective ?? null,
    tone: input.tone ?? null,
    additional_instructions: input.additionalInstructions ?? null,
    concept: content.concept,
    hook: content.hook,
    caption: content.caption,
    cta: content.cta,
    hashtags: content.hashtags,
    creative_brief: content.creativeBrief,
    video_script: content.videoScript,
    visual_direction: content.visualDirection,
    status: 'draft',
  }).select('*').single();
  if (error) throw new Error(`generated_content insert failed: ${error.message}`);

  return {
    id: data.id,
    opportunityId: data.opportunity_id,
    platform: data.platform as Platform,
    format: data.format as ContentFormat,
    concept: data.concept,
    hook: data.hook,
    caption: data.caption,
    cta: data.cta,
    hashtags: data.hashtags ?? [],
    creativeBrief: data.creative_brief,
    videoScript: data.video_script,
    visualDirection: data.visual_direction,
    status: data.status,
    createdAt: data.created_at,
  };
}
