'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// ── API response types ───────────────────────────────────────────────────────

type ConnectionStatus = {
  connected: boolean;
  propertyId: string | null;
  googleEmail: string | null;
  connectedAt: string | null;
  lastSyncAt: string | null;
};

type Overview = {
  activeUsers: number;
  newUsers: number;
  sessions: number;
  screenPageViews: number;
  keyEvents: number;
};

type AcquisitionRow = { channel: string; sessions: number; activeUsers: number; keyEvents: number };
type PageRow = { path: string; views: number; activeUsers: number };
type TrendPoint = { date: string; activeUsers: number; sessions: number; screenPageViews: number };

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google authorization was cancelled.',
  invalid_state: 'The connection attempt expired or was invalid — please try again.',
  missing_code: 'Google did not return an authorization code — please try again.',
  missing_refresh_token: 'Google did not grant offline access. Please try connecting again.',
  token_exchange_failed: 'Could not complete the connection with Google — please try again.',
  not_configured: 'Google integration is not configured on the server yet.',
  unexpected_error: 'Something went wrong connecting to Google — please try again.',
};

function formatDate(dateStr: string): string {
  // GA4 returns dates as YYYYMMDD
  if (/^\d{8}$/.test(dateStr)) {
    return `${dateStr.slice(4, 6)}/${dateStr.slice(6, 8)}`;
  }
  return dateStr;
}

export function GoogleAnalyticsPanel() {
  const router = useRouter();

  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  const [overview, setOverview] = useState<Overview | null>(null);
  const [channels, setChannels] = useState<AcquisitionRow[]>([]);
  const [topPages, setTopPages] = useState<PageRow[]>([]);
  const [landingPages, setLandingPages] = useState<PageRow[]>([]);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    try {
      const res = await fetch('/api/google/status');
      const json = await res.json();
      if (res.ok && json.success) {
        setStatus(json as ConnectionStatus);
      } else {
        setStatus({ connected: false, propertyId: null, googleEmail: null, connectedAt: null, lastSyncAt: null });
      }
    } catch {
      setStatus({ connected: false, propertyId: null, googleEmail: null, connectedAt: null, lastSyncAt: null });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const loadAnalytics = useCallback(async () => {
    setDataLoading(true);
    setDataError(null);
    try {
      const [overviewRes, acqRes, pagesRes, trendsRes] = await Promise.all([
        fetch('/api/google/analytics/overview').then(r => r.json()),
        fetch('/api/google/analytics/acquisition').then(r => r.json()),
        fetch('/api/google/analytics/pages').then(r => r.json()),
        fetch('/api/google/analytics/trends').then(r => r.json()),
      ]);

      const firstError = [overviewRes, acqRes, pagesRes, trendsRes].find(r => !r.success);
      if (firstError) throw new Error(firstError.error ?? 'Unable to load Google Analytics data');

      setOverview(overviewRes.overview);
      setChannels(acqRes.channels ?? []);
      setTopPages(pagesRes.topPages ?? []);
      setLandingPages(pagesRes.landingPages ?? []);
      setTrend(trendsRes.trend ?? []);
    } catch (err) {
      setDataError((err as Error)?.message ?? 'Unable to load Google Analytics data');
    } finally {
      setDataLoading(false);
    }
  }, []);

  // Handle the redirect back from /api/google/oauth/callback, then clean the
  // URL. Read window.location directly (rather than useSearchParams()) so
  // this component doesn't force its static parent page into a Suspense
  // boundary just for a one-time post-redirect banner.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('ga_connected');
    const error = params.get('ga_error');

    if (connected) {
      setBanner({ kind: 'success', text: 'Google Analytics connected successfully.' });
      router.replace('/admin/chat-sessions');
    } else if (error) {
      setBanner({ kind: 'error', text: ERROR_MESSAGES[error] ?? 'Unable to connect Google Analytics.' });
      router.replace('/admin/chat-sessions');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadStatus(); }, [loadStatus]);
  useEffect(() => { if (status?.connected) loadAnalytics(); }, [status?.connected, loadAnalytics]);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Google Analytics 4</CardTitle>
          <CardDescription>GP&apos;s – Guilty Pleasure Café</CardDescription>
        </div>
        {!statusLoading && (
          <Badge variant={status?.connected ? 'default' : 'secondary'}>
            {status?.connected ? 'Connected' : 'Not connected'}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {banner && (
          <p className={`text-sm ${banner.kind === 'success' ? 'text-green-600' : 'text-destructive'}`}>
            {banner.text}
          </p>
        )}

        {statusLoading && <p className="text-sm text-muted-foreground">Checking connection…</p>}

        {!statusLoading && !status?.connected && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Connect a Google account with access to this GA4 property to see traffic, acquisition, and page data here.
            </p>
            <Button asChild>
              <a href="/api/google/oauth">Connect Google Analytics</a>
            </Button>
          </div>
        )}

        {!statusLoading && status?.connected && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>Property ID:</span>
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{status.propertyId}</code>
              {status.googleEmail && <span>· Connected as {status.googleEmail}</span>}
              <Button variant="outline" size="sm" onClick={loadAnalytics} disabled={dataLoading} className="ml-auto">
                {dataLoading ? 'Refreshing…' : 'Refresh'}
              </Button>
            </div>

            {dataError && (
              <p className="text-sm text-destructive">
                {dataError}{' '}
                <a href="/api/google/oauth" className="underline">Reconnect Google Analytics</a>
              </p>
            )}

            {overview && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {[
                  { label: 'Active users', value: overview.activeUsers },
                  { label: 'New users', value: overview.newUsers },
                  { label: 'Sessions', value: overview.sessions },
                  { label: 'Page views', value: overview.screenPageViews },
                  { label: 'Key events', value: overview.keyEvents },
                ].map(stat => (
                  <div key={stat.label} className="rounded-lg border p-3">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}

            {trend.length > 0 && (
              <div className="h-64 w-full rounded-lg border p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                    <YAxis fontSize={11} />
                    <Tooltip labelFormatter={formatDate} />
                    <Line type="monotone" dataKey="activeUsers" name="Active users" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="sessions" name="Sessions" stroke="#558B96" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {channels.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-semibold">Acquisition by channel</p>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Channel</TableHead>
                        <TableHead>Sessions</TableHead>
                        <TableHead>Active users</TableHead>
                        <TableHead>Key events</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {channels.map(row => (
                        <TableRow key={row.channel}>
                          <TableCell>{row.channel}</TableCell>
                          <TableCell>{row.sessions.toLocaleString()}</TableCell>
                          <TableCell>{row.activeUsers.toLocaleString()}</TableCell>
                          <TableCell>{row.keyEvents.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2">
              {topPages.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Top pages</p>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Path</TableHead><TableHead>Views</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {topPages.slice(0, 10).map(row => (
                        <TableRow key={row.path}>
                          <TableCell className="font-mono text-xs">{row.path}</TableCell>
                          <TableCell>{row.views.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {landingPages.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-semibold">Top landing pages</p>
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead>Path</TableHead><TableHead>Sessions</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {landingPages.slice(0, 10).map(row => (
                        <TableRow key={row.path}>
                          <TableCell className="font-mono text-xs">{row.path}</TableCell>
                          <TableCell>{row.views.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
