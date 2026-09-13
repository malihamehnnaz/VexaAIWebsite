// Timezone handling for scheduled posts — uses date-fns-tz (added as a new
// dependency specifically for this feature; date-fns itself was already a
// dependency, but converting a local wall-clock time in an arbitrary IANA
// zone to the correct UTC instant — correctly across DST transitions — is
// not something worth hand-rolling; verified against a real Sydney
// DST-transition case before relying on it, see the commit message).
//
// The caller sends a local wall-clock time with no offset (e.g.
// "2026-09-20T18:30:00") plus an IANA zone name (e.g. "Australia/Sydney").
// This never guesses/assumes a timezone from the browser — the caller must
// supply one explicitly.

import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';

export class InvalidTimezoneError extends Error {
  constructor(public readonly timezone: string) {
    super(`"${timezone}" is not a valid IANA timezone name`);
    this.name = 'InvalidTimezoneError';
  }
}

export function isValidIanaTimezone(timezone: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

// Converts "2026-09-20T18:30:00" + "Australia/Sydney" -> the correct UTC
// Date instant, honoring whichever DST offset actually applies on that
// date (confirmed empirically: AEST/UTC+10 before Sydney's DST start,
// AEDT/UTC+11 after — date-fns-tz resolves this from the IANA database,
// not a fixed offset).
export function localTimeToUtcInstant(localDateTime: string, timezone: string): Date {
  if (!isValidIanaTimezone(timezone)) throw new InvalidTimezoneError(timezone);
  const instant = fromZonedTime(localDateTime, timezone);
  if (Number.isNaN(instant.getTime())) {
    throw new Error(`"${localDateTime}" is not a valid local date/time`);
  }
  return instant;
}

// The reverse — for building a human-readable display string in the
// original timezone from the stored UTC instant, e.g. "20 Sep 2026, 18:30".
export function formatInstantForDisplay(utcInstant: Date | string, timezone: string): string {
  if (!isValidIanaTimezone(timezone)) throw new InvalidTimezoneError(timezone);
  return formatInTimeZone(utcInstant, timezone, 'd MMM yyyy, HH:mm');
}
