// Real, keyless, current-trend signal source: Google News RSS
// (news.google.com/rss/search) — a public, documented syndication feed, not
// a scraped/undocumented endpoint. Every signal produced here traces back
// to a real, dated, sourced news article — nothing is invented.
//
// Why this and not a "Facebook Trending Topics" concept: per this feature's
// explicit architecture rule, Facebook Organic Insights tells us how THIS
// Page is performing, not what's trending in the world — Meta doesn't
// expose a trending-topics API at all, and building a fake one would
// violate the no-fabrication requirement. Google News RSS is a genuine,
// separate, real external signal layer.
//
// Query terms are intentionally generic (food/hospitality industry), not
// tied to any specific restaurant — overridable via
// CONTENT_TRENDS_QUERY_TERMS (comma-separated) so a different deployment
// can retarget without a code change, per "do not hard-code GP-specific
// results".

import type { TrendSignal, TrendSourceResult, TrendEvidenceItem } from '@/lib/content-intelligence/types';

const DEFAULT_QUERY_TERMS = ['restaurant trends', 'cafe trends', 'food trends', 'restaurant marketing'];
const RSS_BASE = 'https://news.google.com/rss/search';
const MAX_ITEMS_PER_QUERY = 12;
const FETCH_TIMEOUT_MS = 8000;

function getQueryTerms(): string[] {
  const override = process.env.CONTENT_TRENDS_QUERY_TERMS?.trim();
  if (!override) return DEFAULT_QUERY_TERMS;
  const terms = override.split(',').map(t => t.trim()).filter(Boolean);
  return terms.length > 0 ? terms : DEFAULT_QUERY_TERMS;
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function extractTag(block: string, tag: string): string | null {
  // Bounded, non-greedy — RSS item blocks are small (a few KB at most), so
  // this carries no meaningful ReDoS risk.
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? decodeXmlEntities(match[1]) : null;
}

function extractSourceAttr(block: string): { name: string | null; url: string | null } {
  const match = block.match(/<source\s+url="([^"]*)"[^>]*>([\s\S]*?)<\/source>/i);
  if (!match) return { name: null, url: null };
  return { url: decodeXmlEntities(match[1]), name: decodeXmlEntities(match[2]) };
}

interface RawNewsItem {
  title: string;
  link: string;
  pubDate: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
}

function parseRssItems(xml: string): RawNewsItem[] {
  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  const items: RawNewsItem[] = [];
  for (const block of itemBlocks.slice(0, MAX_ITEMS_PER_QUERY)) {
    const title = extractTag(block, 'title');
    const link = extractTag(block, 'link');
    if (!title || !link) continue; // never fabricate a placeholder for a malformed item — skip it
    const pubDate = extractTag(block, 'pubDate');
    const { name: sourceName, url: sourceUrl } = extractSourceAttr(block);
    items.push({ title, link, pubDate, sourceName, sourceUrl });
  }
  return items;
}

async function fetchQuery(query: string): Promise<RawNewsItem[]> {
  const url = `${RSS_BASE}?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VexaContentIntelligence/1.0)' } });
    if (!response.ok) throw new Error(`Google News RSS returned HTTP ${response.status}`);
    const xml = await response.text();
    return parseRssItems(xml);
  } finally {
    clearTimeout(timeout);
  }
}

function hoursSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return null;
  return (Date.now() - d.getTime()) / (1000 * 60 * 60);
}

function freshnessFromHours(hours: number | null): TrendSignal['freshness'] {
  if (hours == null) return 'aging'; // unknown date — treat conservatively, never "new"
  if (hours < 24) return 'new';
  if (hours < 72) return 'recent';
  if (hours < 24 * 7) return 'aging';
  return 'stale';
}

// Groups near-duplicate headlines across queries into one topic cluster —
// a real, countable signal (how many independent articles cover this) used
// for momentumScore, not an invented number. Clustering key: normalized,
// stop-word-stripped significant words shared between titles.
const STOP_WORDS = new Set(['the', 'a', 'an', 'of', 'to', 'in', 'for', 'and', 'is', 'on', 'at', 'how', 'why', 'this', 'your', 'with', 'from', 'are']);

function significantWords(title: string): Set<string> {
  return new Set(
    title.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 3 && !STOP_WORDS.has(w))
  );
}

function overlapRatio(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const w of a) if (b.has(w)) shared++;
  return shared / Math.min(a.size, b.size);
}

const CLUSTER_OVERLAP_THRESHOLD = 0.5;

function clusterItems(items: RawNewsItem[], query: string): Array<{ items: RawNewsItem[]; query: string }> {
  const clusters: Array<{ items: RawNewsItem[]; words: Set<string>; query: string }> = [];
  for (const item of items) {
    const words = significantWords(item.title);
    const match = clusters.find(c => overlapRatio(c.words, words) >= CLUSTER_OVERLAP_THRESHOLD);
    if (match) {
      match.items.push(item);
      for (const w of words) match.words.add(w);
    } else {
      clusters.push({ items: [item], words, query });
    }
  }
  return clusters.map(c => ({ items: c.items, query: c.query }));
}

function relevanceScoreFor(title: string, query: string): number {
  // How much of the query's own significant terms appear in the headline —
  // a real, transparent text-overlap measure, not an opaque model score.
  const queryWords = significantWords(query);
  const titleWords = significantWords(title);
  if (queryWords.size === 0) return 50;
  let matched = 0;
  for (const w of queryWords) if (titleWords.has(w)) matched++;
  const ratio = matched / queryWords.size;
  return Math.round(40 + ratio * 60); // 40 floor (it matched the query at all) .. 100
}

export async function fetchGoogleNewsTrendSignals(): Promise<TrendSourceResult> {
  const queries = getQueryTerms();
  const allResults: Array<{ items: RawNewsItem[]; query: string }> = [];
  const errors: string[] = [];

  for (const query of queries) {
    try {
      const items = await fetchQuery(query);
      allResults.push({ items, query });
    } catch (err) {
      errors.push(`"${query}": ${err instanceof Error ? err.message : 'unknown error'}`);
    }
  }

  const totalItems = allResults.reduce((acc, r) => acc + r.items.length, 0);
  if (totalItems === 0) {
    return {
      available: false,
      source: 'google_news',
      reason: errors.length > 0
        ? `All queries failed: ${errors.join('; ')}`
        : 'Google News RSS returned no items for any configured query',
    };
  }

  const signals: TrendSignal[] = [];
  for (const { items, query } of allResults) {
    const clusters = clusterItems(items, query);
    for (const cluster of clusters) {
      const primary = cluster.items[0];
      const hours = hoursSince(primary.pubDate);
      const freshness = freshnessFromHours(hours);

      // momentumScore: recency decay (0-60) + cluster size bonus (0-40,
      // capped) — both real, both derived from what was actually fetched.
      const recencyComponent = hours == null ? 20 : Math.max(0, 60 - hours / 4);
      const clusterComponent = Math.min(40, (cluster.items.length - 1) * 15);
      const momentumScore = Math.round(Math.min(100, recencyComponent + clusterComponent));

      const relevanceScore = relevanceScoreFor(primary.title, query);

      const confidence: TrendSignal['confidence'] =
        cluster.items.length >= 3 ? 'high' : cluster.items.length === 2 ? 'medium' : 'low';

      const evidence: TrendEvidenceItem[] = cluster.items.slice(0, 5).map(i => ({
        title: i.title,
        url: i.link,
        publishedAt: i.pubDate ? new Date(i.pubDate).toISOString() : null,
        sourceName: i.sourceName,
      }));

      signals.push({
        id: `google_news:${Buffer.from(primary.link).toString('base64url').slice(0, 32)}`,
        topic: primary.title.replace(/\s+-\s+[^-]+$/, '').trim(), // Google News titles often end " - Source"
        category: query,
        description: primary.sourceName ? `Reported by ${primary.sourceName}${cluster.items.length > 1 ? ` and ${cluster.items.length - 1} other source(s)` : ''}.` : null,
        source: 'google_news',
        sourceUrl: primary.link,
        detectedAt: primary.pubDate ? new Date(primary.pubDate).toISOString() : new Date().toISOString(),
        freshness,
        momentumScore,
        relevanceScore,
        confidence,
        evidence,
      });
    }
  }

  return { available: true, source: 'google_news', signals };
}

export const googleNewsTrendSource = { name: 'google_news', fetch: fetchGoogleNewsTrendSignals };
