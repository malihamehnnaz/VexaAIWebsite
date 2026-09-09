// Shared types for the Content Intelligence pipeline. Deliberately keeps
// four concepts distinct end-to-end (matching supabase_migration_content_
// intelligence.sql's table split):
//   1. CURRENT TREND        -> TrendSignal
//   2. GP PERFORMANCE        -> not modeled here — read directly from the
//                              existing facebook_insights/instagram_insights/
//                              facebook_posts/instagram_media tables by
//                              performance.ts, never duplicated
//   3. CONTENT OPPORTUNITY   -> ContentOpportunity (references a TrendSignal
//                              by id, or none, rather than embedding one)
//   4. AI-GENERATED CONTENT  -> GeneratedContent

export type Confidence = 'low' | 'medium' | 'high';
export type Freshness = 'new' | 'recent' | 'aging' | 'stale';
export type ContentFormat = 'photo' | 'reel' | 'video' | 'carousel' | 'story' | 'text';
export type Platform = 'facebook' | 'instagram';

export interface TrendEvidenceItem {
  title: string;
  url: string;
  publishedAt: string | null;
  sourceName: string | null;
}

// Layer 1 — CURRENT TREND. Every field here must be traceable to `evidence`.
export interface TrendSignal {
  id: string;
  topic: string;
  category: string | null;
  description: string | null;
  source: string; // e.g. "google_news" — which TrendSource produced this
  sourceUrl: string | null; // the single most representative evidence URL
  detectedAt: string; // ISO — the real source's own published/detected time
  freshness: Freshness;
  momentumScore: number; // 0-100, derived from real, documented signal math — never fabricated
  relevanceScore: number; // 0-100, keyword/category overlap with the restaurant's real profile
  confidence: Confidence;
  evidence: TrendEvidenceItem[]; // the real articles/items behind this signal — never empty
}

// Result of a TrendSource attempt — success (signals) or an honest,
// explicit failure. Never silently substituted with fabricated signals.
export type TrendSourceResult =
  | { available: true; source: string; signals: TrendSignal[] }
  | { available: false; source: string; reason: string };

export interface TrendSource {
  name: string;
  fetch(): Promise<TrendSourceResult>;
}

// Layer 3 — CONTENT OPPORTUNITY.
export interface ContentOpportunity {
  id: string;
  pageId: string;
  title: string;
  recommendation: string;
  topic: string;
  format: ContentFormat;
  reason: string;
  trendSignalId: string | null; // null = grounded purely in the restaurant's own historical performance
  trendScore: number;
  audienceFitScore: number;
  historicalFitScore: number;
  freshnessScore: number;
  opportunityScore: number;
  confidence: Confidence;
  recommendedDay: string | null;
  recommendedTime: string | null;
  supportingEvidence: string[]; // real, human-readable "why" statements
  computedAt: string;
}

// Layer 4 — AI-GENERATED CONTENT. Always starts as a draft; publishing is a
// separate, later, explicit operation this module does not perform.
export interface GeneratedContentInput {
  opportunityId: string;
  platform: Platform;
  format: ContentFormat;
  objective?: string | null;
  tone?: string | null;
  additionalInstructions?: string | null;
}

export interface GeneratedContent {
  id: string;
  opportunityId: string;
  platform: Platform;
  format: ContentFormat;
  concept: string | null;
  hook: string | null;
  caption: string | null;
  cta: string | null;
  hashtags: string[];
  creativeBrief: string | null;
  videoScript: string | null;
  visualDirection: string | null;
  status: 'draft' | 'approved' | 'published' | 'rejected';
  createdAt: string;
}

// Real, derivable restaurant context — never a fabricated persona. Anything
// unavailable is null, not guessed.
export interface RestaurantContext {
  pageId: string;
  pageName: string | null;
  instagramUsername: string | null;
  instagramFollowers: number | null;
  facebookFollowers: number | null;
}
