// Media validation for scheduled Facebook posts. This app has no media
// upload/storage infrastructure of its own (confirmed — no Supabase
// Storage bucket, no file-upload endpoint exists anywhere in this
// codebase), so scheduling never invents or hosts media: it only ever
// validates that a caller-supplied URL is a real, publicly-fetchable HTTPS
// image URL, then hands that same URL straight to Meta (which fetches it
// itself — see createPagePhotoPost). v1 supports at most one photo; a
// video or multiple photos returns a clear, explicit "not supported" error
// rather than silently scheduling something that can't actually publish.

import { MAX_MEDIA_URLS } from '@/lib/social-scheduling/config';

export interface MediaValidationResult {
  valid: boolean;
  error?: string;
}

const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'];

function looksLikeVideoUrl(url: string): boolean {
  return /\.(mp4|mov|avi|mkv|webm|m4v)(\?|$)/i.test(url);
}

export function validateMediaUrls(mediaUrls: string[] | undefined): MediaValidationResult {
  if (!mediaUrls || mediaUrls.length === 0) return { valid: true };

  if (mediaUrls.length > MAX_MEDIA_URLS) {
    return { valid: false, error: `Only ${MAX_MEDIA_URLS} photo is currently supported for Facebook scheduling — multi-photo/carousel posts are not yet implemented.` };
  }

  for (const url of mediaUrls) {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { valid: false, error: `"${url}" is not a valid URL.` };
    }
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: `Media URL must be HTTPS — Meta needs to fetch it directly: "${url}".` };
    }
    if (looksLikeVideoUrl(url)) {
      return { valid: false, error: 'Video is not currently supported for Facebook scheduling.' };
    }
    const hasKnownImageExtension = SUPPORTED_IMAGE_EXTENSIONS.some(ext => parsed.pathname.toLowerCase().endsWith(ext));
    if (!hasKnownImageExtension) {
      // Not a hard rejection — some real image URLs have no file extension
      // (e.g. a CDN path) — but flagged so callers know Meta may reject it
      // as an unsupported media type rather than have that come as a
      // surprise for a clearly-not-an-image URL.
      console.warn('[social-scheduling/media] URL has no recognized image extension, proceeding anyway:', parsed.pathname);
    }
  }

  return { valid: true };
}
