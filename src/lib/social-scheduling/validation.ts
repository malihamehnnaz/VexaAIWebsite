// Input validation for creating/updating a scheduled post — every rule the
// brief calls out explicitly: supported platform, valid connected Page,
// non-empty content, future timestamp, valid timezone, supported media,
// reasonable caption length.

import { SUPPORTED_SCHEDULING_PLATFORMS, isSupportedSchedulingPageId, MAX_CAPTION_LENGTH } from '@/lib/social-scheduling/config';
import { validateMediaUrls } from '@/lib/social-scheduling/media';
import { isValidIanaTimezone, localTimeToUtcInstant } from '@/lib/social-scheduling/timezone';
import type { Platform } from '@/lib/social-scheduling/types';

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidatedSchedule {
  scheduledAtUtc: string; // ISO
}

export function validatePlatform(platform: unknown): platform is Platform {
  return typeof platform === 'string' && (SUPPORTED_SCHEDULING_PLATFORMS as readonly string[]).includes(platform);
}

export function validatePageId(pageId: unknown): pageId is string {
  return typeof pageId === 'string' && isSupportedSchedulingPageId(pageId);
}

export function validateCaption(caption: unknown, mediaUrls: string[] | undefined): ValidationError | null {
  if (caption !== undefined && typeof caption !== 'string') {
    return { field: 'caption', message: 'caption must be a string' };
  }
  const trimmed = typeof caption === 'string' ? caption.trim() : '';
  const hasMedia = !!mediaUrls && mediaUrls.length > 0;
  if (!trimmed && !hasMedia) {
    return { field: 'caption', message: 'caption is required when no media is provided' };
  }
  if (trimmed.length > MAX_CAPTION_LENGTH) {
    return { field: 'caption', message: `caption must be ${MAX_CAPTION_LENGTH} characters or fewer` };
  }
  return null;
}

export function validateMedia(mediaUrls: unknown): ValidationError | null {
  if (mediaUrls === undefined) return null;
  if (!Array.isArray(mediaUrls) || !mediaUrls.every(u => typeof u === 'string')) {
    return { field: 'mediaUrls', message: 'mediaUrls must be an array of strings' };
  }
  const result = validateMediaUrls(mediaUrls);
  if (!result.valid) return { field: 'mediaUrls', message: result.error! };
  return null;
}

// Validates scheduledAt + timezone together and returns the resolved UTC
// instant — this is the one place "must be in the future" and "must be a
// valid IANA zone" are both enforced, so a route can't accidentally check
// one without the other.
export function validateSchedule(scheduledAt: unknown, timezone: unknown, { requireFuture = true }: { requireFuture?: boolean } = {}): ValidationError | ValidatedSchedule {
  if (typeof scheduledAt !== 'string' || !scheduledAt) {
    return { field: 'scheduledAt', message: 'scheduledAt is required (e.g. "2026-09-20T18:30:00")' };
  }
  if (typeof timezone !== 'string' || !timezone) {
    return { field: 'timezone', message: 'timezone is required (an IANA zone name, e.g. "Australia/Sydney")' };
  }
  if (!isValidIanaTimezone(timezone)) {
    return { field: 'timezone', message: `"${timezone}" is not a valid IANA timezone name` };
  }

  let utcInstant: Date;
  try {
    utcInstant = localTimeToUtcInstant(scheduledAt, timezone);
  } catch {
    return { field: 'scheduledAt', message: `"${scheduledAt}" is not a valid local date/time` };
  }

  if (requireFuture && utcInstant.getTime() <= Date.now()) {
    return { field: 'scheduledAt', message: 'scheduledAt must be in the future' };
  }

  return { scheduledAtUtc: utcInstant.toISOString() };
}

export function isValidationError(value: unknown): value is ValidationError {
  return !!value && typeof value === 'object' && 'field' in value && 'message' in value;
}
