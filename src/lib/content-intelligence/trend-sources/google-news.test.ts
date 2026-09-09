import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const NOW = new Date('2026-09-09T12:00:00Z');

vi.useFakeTimers();
vi.setSystemTime(NOW);

import { fetchGoogleNewsTrendSignals } from './google-news';

function rssXml(items: Array<{ title: string; link: string; pubDate: string; sourceName: string; sourceUrl: string }>): string {
  const itemsXml = items.map(i => `
    <item>
      <title>${i.title}</title>
      <link>${i.link}</link>
      <pubDate>${i.pubDate}</pubDate>
      <source url="${i.sourceUrl}">${i.sourceName}</source>
    </item>`).join('');
  return `<?xml version="1.0"?><rss><channel>${itemsXml}</channel></rss>`;
}

function mockFetchXml(xml: string) {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => xml } as Response);
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.CONTENT_TRENDS_QUERY_TERMS;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchGoogleNewsTrendSignals — normalization', () => {
  it('produces a TrendSignal with real, non-fabricated evidence for a fresh article', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml(rssXml([
      { title: 'Ghost kitchens reshape restaurant trends - Food News Daily', link: 'https://example.com/a1', pubDate: 'Wed, 09 Sep 2026 06:00:00 GMT', sourceName: 'Food News Daily', sourceUrl: 'https://foodnewsdaily.com' },
    ]));

    const result = await fetchGoogleNewsTrendSignals();
    expect(result.available).toBe(true);
    if (!result.available) return;

    expect(result.signals).toHaveLength(1);
    const signal = result.signals[0];
    expect(signal.topic).toBe('Ghost kitchens reshape restaurant trends');
    expect(signal.source).toBe('google_news');
    expect(signal.sourceUrl).toBe('https://example.com/a1');
    expect(signal.evidence).toHaveLength(1);
    expect(signal.evidence[0].url).toBe('https://example.com/a1');
    expect(signal.evidence[0].sourceName).toBe('Food News Daily');
  });

  it('marks a same-day article as "new" freshness with a high momentum score', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml(rssXml([
      { title: 'Fresh headline today - Source', link: 'https://example.com/fresh', pubDate: 'Wed, 09 Sep 2026 10:00:00 GMT', sourceName: 'Source', sourceUrl: 'https://source.com' },
    ]));
    const result = await fetchGoogleNewsTrendSignals();
    if (!result.available) throw new Error('expected available');
    expect(result.signals[0].freshness).toBe('new');
    expect(result.signals[0].momentumScore).toBeGreaterThan(40);
  });

  it('marks a week-old article as "stale"', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml(rssXml([
      { title: 'Old headline - Source', link: 'https://example.com/old', pubDate: 'Wed, 20 Aug 2026 10:00:00 GMT', sourceName: 'Source', sourceUrl: 'https://source.com' },
    ]));
    const result = await fetchGoogleNewsTrendSignals();
    if (!result.available) throw new Error('expected available');
    expect(result.signals[0].freshness).toBe('stale');
  });

  it('clusters near-duplicate headlines from the same query into one signal with higher confidence', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml(rssXml([
      { title: 'Smashburgers dominate restaurant trends 2026 - Outlet A', link: 'https://a.com/1', pubDate: 'Wed, 09 Sep 2026 09:00:00 GMT', sourceName: 'Outlet A', sourceUrl: 'https://a.com' },
      { title: 'Smashburgers dominate restaurant trends this year - Outlet B', link: 'https://b.com/1', pubDate: 'Wed, 09 Sep 2026 08:00:00 GMT', sourceName: 'Outlet B', sourceUrl: 'https://b.com' },
      { title: 'Unrelated headline about staffing - Outlet C', link: 'https://c.com/1', pubDate: 'Wed, 09 Sep 2026 07:00:00 GMT', sourceName: 'Outlet C', sourceUrl: 'https://c.com' },
    ]));

    const result = await fetchGoogleNewsTrendSignals();
    if (!result.available) throw new Error('expected available');
    // Two distinct clusters: the smashburger duo, and the unrelated one.
    expect(result.signals).toHaveLength(2);
    const clustered = result.signals.find(s => s.topic.toLowerCase().includes('smashburger'));
    expect(clustered).toBeDefined();
    expect(clustered!.evidence.length).toBe(2);
    expect(clustered!.confidence).toBe('medium'); // 2 sources
  });

  it('skips malformed items missing a title or link rather than fabricating placeholders', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml('<?xml version="1.0"?><rss><channel><item><pubDate>Wed, 09 Sep 2026 09:00:00 GMT</pubDate></item></channel></rss>');
    const result = await fetchGoogleNewsTrendSignals();
    expect(result.available).toBe(false);
  });

  it('reports honestly when every query fails, without fabricating signals', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' } as Response);
    const result = await fetchGoogleNewsTrendSignals();
    expect(result.available).toBe(false);
    if (result.available) return;
    expect(result.reason).toContain('HTTP 500');
  });

  it('decodes XML entities and strips CDATA in titles', async () => {
    process.env.CONTENT_TRENDS_QUERY_TERMS = 'restaurant trends';
    mockFetchXml(rssXml([
      { title: '<![CDATA[Burgers &amp; fries trend up - Source]]>', link: 'https://example.com/enc', pubDate: 'Wed, 09 Sep 2026 09:00:00 GMT', sourceName: 'Source', sourceUrl: 'https://source.com' },
    ]));
    const result = await fetchGoogleNewsTrendSignals();
    if (!result.available) throw new Error('expected available');
    expect(result.signals[0].topic).toBe('Burgers & fries trend up');
  });
});
