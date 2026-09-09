// Real historical Facebook/Instagram performance aggregation — reads
// directly from the existing, already-populated tables (facebook_posts,
// facebook_comments, facebook_insights, instagram_media, instagram_comments)
// rather than making any new Meta API calls or duplicating auth. This is
// the "GP PERFORMANCE" layer feeding the Content Opportunity Engine — never
// stored in its own table, always read live from what already exists.
//
// Facebook post-level format (photo/video/reel) is NOT available — facebook_posts
// has no media-type column (confirmed against src/lib/facebook/store.ts) — so
// format-performance is derived from Instagram only, honestly reported as
// such rather than guessed for Facebook.

import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { GP_CAFE_PAGE_ID } from '@/lib/facebook/config';
import { IG_BUSINESS_ACCOUNT_ID } from '@/lib/instagram/config';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export interface TopPost {
  platform: 'facebook' | 'instagram';
  id: string;
  caption: string | null;
  permalink: string | null;
  postedAt: string | null;
  engagementProxy: number; // real comment count — a proxy, documented as such, not a fabricated "engagement score"
  format: string | null; // Instagram media_type/media_product_type; null for Facebook (unavailable)
}

export interface FormatPerformance {
  format: string;
  postCount: number;
  avgEngagementProxy: number;
}

export interface DayPerformance {
  day: string; // 'Monday' etc.
  postCount: number;
  avgEngagementProxy: number;
}

export interface HourPerformance {
  hour: number; // 0-23, UTC
  postCount: number;
  avgEngagementProxy: number;
}

export interface PerformanceSummary {
  topPosts: TopPost[];
  formatPerformance: FormatPerformance[]; // Instagram only — see header comment
  dayPerformance: DayPerformance[];
  hourPerformance: HourPerformance[];
  formatPerformanceAvailable: boolean;
  formatUnavailableReason: string | null;
  recentPageReach: number | null; // sum of the last 30 real facebook_insights page_total_media_view_unique days
  recentPageEngagement: number | null; // sum of the last 30 real facebook_insights page_post_engagements days
  totalHistoricalPosts: number;
}

async function getFacebookCommentCounts(): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const counts = new Map<string, number>();
  const { data, error } = await supabase.from('facebook_comments').select('post_id').eq('page_id', GP_CAFE_PAGE_ID);
  if (error || !data) return counts;
  for (const row of data as Array<{ post_id: string }>) {
    counts.set(row.post_id, (counts.get(row.post_id) ?? 0) + 1);
  }
  return counts;
}

async function getInstagramCommentCounts(): Promise<Map<string, number>> {
  const supabase = getSupabaseAdmin();
  const counts = new Map<string, number>();
  const { data, error } = await supabase.from('instagram_comments').select('media_id').eq('account_id', IG_BUSINESS_ACCOUNT_ID);
  if (error || !data) return counts;
  for (const row of data as Array<{ media_id: string }>) {
    counts.set(row.media_id, (counts.get(row.media_id) ?? 0) + 1);
  }
  return counts;
}

async function getRecentPageMetricSum(metric: string, days = 30): Promise<number | null> {
  const supabase = getSupabaseAdmin();
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('facebook_insights')
    .select('value')
    .eq('page_id', GP_CAFE_PAGE_ID)
    .eq('metric', metric)
    .eq('level', 'page')
    .gte('date', since);
  if (error || !data || data.length === 0) return null;
  const values = (data as Array<{ value: number | null }>).map(r => r.value).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  return values.reduce((acc, v) => acc + v, 0);
}

export async function getPerformanceSummary(): Promise<PerformanceSummary> {
  const supabase = getSupabaseAdmin();

  const [fbPosts, igMedia, fbCommentCounts, igCommentCounts, recentPageReach, recentPageEngagement] = await Promise.all([
    supabase.from('facebook_posts').select('post_id, message, permalink, created_at_meta').eq('page_id', GP_CAFE_PAGE_ID).order('created_at_meta', { ascending: false }).limit(200),
    supabase.from('instagram_media').select('media_id, caption, permalink, timestamp, media_type, media_product_type').eq('account_id', IG_BUSINESS_ACCOUNT_ID).order('timestamp', { ascending: false }).limit(200),
    getFacebookCommentCounts(),
    getInstagramCommentCounts(),
    getRecentPageMetricSum('page_total_media_view_unique'),
    getRecentPageMetricSum('page_post_engagements'),
  ]);

  const fbRows = (fbPosts.data as Array<{ post_id: string; message: string | null; permalink: string | null; created_at_meta: string | null }>) ?? [];
  const igRows = (igMedia.data as Array<{ media_id: string; caption: string | null; permalink: string | null; timestamp: string | null; media_type: string | null; media_product_type: string | null }>) ?? [];

  const posts: TopPost[] = [
    ...fbRows.map(r => ({
      platform: 'facebook' as const,
      id: r.post_id,
      caption: r.message,
      permalink: r.permalink,
      postedAt: r.created_at_meta,
      engagementProxy: fbCommentCounts.get(r.post_id) ?? 0,
      format: null,
    })),
    ...igRows.map(r => ({
      platform: 'instagram' as const,
      id: r.media_id,
      caption: r.caption,
      permalink: r.permalink,
      postedAt: r.timestamp,
      engagementProxy: igCommentCounts.get(r.media_id) ?? 0,
      format: r.media_product_type ?? r.media_type,
    })),
  ];

  const topPosts = [...posts].sort((a, b) => b.engagementProxy - a.engagementProxy).slice(0, 10);

  // Format performance — Instagram only (see header comment).
  const formatGroups = new Map<string, number[]>();
  for (const r of igRows) {
    const format = r.media_product_type ?? r.media_type;
    if (!format) continue;
    const engagement = igCommentCounts.get(r.media_id) ?? 0;
    if (!formatGroups.has(format)) formatGroups.set(format, []);
    formatGroups.get(format)!.push(engagement);
  }
  const formatPerformance: FormatPerformance[] = [...formatGroups.entries()]
    .map(([format, values]) => ({ format, postCount: values.length, avgEngagementProxy: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => b.avgEngagementProxy - a.avgEngagementProxy);

  // Day-of-week performance — across both platforms' real post timestamps.
  const dayGroups = new Map<number, number[]>();
  for (const p of posts) {
    if (!p.postedAt) continue;
    const d = new Date(p.postedAt);
    if (Number.isNaN(d.getTime())) continue;
    const day = d.getUTCDay();
    if (!dayGroups.has(day)) dayGroups.set(day, []);
    dayGroups.get(day)!.push(p.engagementProxy);
  }
  const dayPerformance: DayPerformance[] = [...dayGroups.entries()]
    .map(([day, values]) => ({ day: DAY_NAMES[day], postCount: values.length, avgEngagementProxy: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => b.avgEngagementProxy - a.avgEngagementProxy);

  const hourGroups = new Map<number, number[]>();
  for (const p of posts) {
    if (!p.postedAt) continue;
    const d = new Date(p.postedAt);
    if (Number.isNaN(d.getTime())) continue;
    const hour = d.getUTCHours();
    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
    hourGroups.get(hour)!.push(p.engagementProxy);
  }
  const hourPerformance: HourPerformance[] = [...hourGroups.entries()]
    .map(([hour, values]) => ({ hour, postCount: values.length, avgEngagementProxy: values.reduce((a, b) => a + b, 0) / values.length }))
    .sort((a, b) => b.avgEngagementProxy - a.avgEngagementProxy);

  return {
    topPosts,
    formatPerformance,
    dayPerformance,
    hourPerformance,
    formatPerformanceAvailable: formatPerformance.length > 0,
    formatUnavailableReason: formatPerformance.length > 0 ? null : 'No Instagram media with a known format found yet — Facebook Posts has no stored media-type field at all.',
    recentPageReach,
    recentPageEngagement,
    totalHistoricalPosts: posts.length,
  };
}
