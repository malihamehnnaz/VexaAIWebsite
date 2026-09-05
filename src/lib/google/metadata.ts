// GA4 Metadata API — returns the actual dimensions/metrics compatible with
// this specific property, confirmed against Google's current docs
// (2026-09-05, GET /v1beta/properties/{propertyId}/metadata). Used to power
// /api/google/analytics/metadata directly, and to validate arbitrary
// dimension/metric names for the Report Explorer endpoint before ever
// sending them to GA4 — rather than guessing which combinations are valid.

import { withCache } from '@/lib/google/cache';
import { Ga4ApiError } from '@/lib/google/ga4';

const DATA_API_BASE = 'https://analyticsdata.googleapis.com/v1beta';
const METADATA_CACHE_TTL_SECONDS = 60 * 60 * 12; // a property's available fields barely ever change

export interface Ga4MetadataField {
  apiName: string;
  uiName: string;
  description: string;
}

export interface Ga4Metadata {
  dimensions: Ga4MetadataField[];
  metrics: Ga4MetadataField[];
}

interface RawMetadataResponse {
  dimensions?: Ga4MetadataField[];
  metrics?: Ga4MetadataField[];
  error?: { message?: string; status?: string };
}

async function fetchMetadata(accessToken: string, propertyId: string): Promise<Ga4Metadata> {
  let response: Response;
  try {
    response = await fetch(`${DATA_API_BASE}/properties/${encodeURIComponent(propertyId)}/metadata`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
  } catch (err) {
    throw new Ga4ApiError(err instanceof Error ? err.message : 'Network error calling GA4 Metadata API', 0);
  }

  const payload = await response.json().catch(() => null) as RawMetadataResponse | null;
  if (!response.ok || !payload) {
    const message = payload?.error?.message || `GA4 Metadata API returned HTTP ${response.status}`;
    console.error('[ga4-metadata] request failed:', { status: response.status, message });
    throw new Ga4ApiError(message, response.status);
  }

  return { dimensions: payload.dimensions ?? [], metrics: payload.metrics ?? [] };
}

export async function getMetadata(accessToken: string, propertyId: string): Promise<Ga4Metadata> {
  return withCache(`ga4:metadata:${propertyId}`, METADATA_CACHE_TTL_SECONDS, () => fetchMetadata(accessToken, propertyId));
}

export interface CompatibilityCheck {
  ok: boolean;
  invalidDimensions: string[];
  invalidMetrics: string[];
}

// Checks requested field names against the real, property-specific
// metadata — used by the Report Explorer so an invalid field name gets a
// clear "invalidDimensions/invalidMetrics" error instead of an opaque GA4
// 400. This does NOT guarantee the combination is jointly compatible
// (GA4's compatibility rules go beyond "the field exists") — GA4's own
// error from runReport is still the final word on that.
export function checkFieldsExist(metadata: Ga4Metadata, dimensions: string[], metrics: string[]): CompatibilityCheck {
  const dimNames = new Set(metadata.dimensions.map(d => d.apiName));
  const metricNames = new Set(metadata.metrics.map(m => m.apiName));

  const invalidDimensions = dimensions.filter(d => !dimNames.has(d));
  const invalidMetrics = metrics.filter(m => !metricNames.has(m));

  return { ok: invalidDimensions.length === 0 && invalidMetrics.length === 0, invalidDimensions, invalidMetrics };
}
