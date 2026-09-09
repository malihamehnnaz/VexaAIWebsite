// Google's Business Profile APIs return resource names, not bare ids —
// accounts[].name is "accounts/{accountId}", locations[].name is
// "locations/{locationId}" — but the legacy v4 Reviews API's URL paths take
// bare numeric ids (.../accounts/{accountId}/locations/{locationId}/...).
// Building "accounts/accounts/123/..." by concatenating the resource name
// where a bare id was expected is the single most common failure mode
// integrating these APIs — this helper exists so every place that needs a
// bare id goes through the same, tested code path rather than each call
// site re-deriving it with a slightly different string operation.

export class ResourceIdError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResourceIdError';
  }
}

// Strips a known "{prefix}/" segment from the front of a resource name and
// returns the bare id. Throws rather than silently returning the whole
// input if the prefix doesn't match — a caller building a URL path from a
// wrong id is exactly the failure mode this exists to prevent, so a loud
// error here beats a confusing 404 three calls later.
export function stripResourcePrefix(resourceName: string, expectedPrefix: 'accounts' | 'locations'): string {
  const prefix = `${expectedPrefix}/`;
  if (!resourceName.startsWith(prefix)) {
    throw new ResourceIdError(`Expected a resource name starting with "${prefix}", got: ${resourceName}`);
  }
  const bareId = resourceName.slice(prefix.length);
  if (!bareId || bareId.includes('/')) {
    throw new ResourceIdError(`Resource name "${resourceName}" did not yield a bare id after stripping "${prefix}"`);
  }
  return bareId;
}

export function stripAccountPrefix(accountResourceName: string): string {
  return stripResourcePrefix(accountResourceName, 'accounts');
}

export function stripLocationPrefix(locationResourceName: string): string {
  return stripResourcePrefix(locationResourceName, 'locations');
}

// The inverse — for the few Google endpoints that want the full resource
// name back (none of the ones this feature calls do today, but kept
// alongside the strip functions so a future call site doesn't reinvent
// this too).
export function toAccountResourceName(accountId: string): string {
  return `accounts/${accountId}`;
}

export function toLocationResourceName(locationId: string): string {
  return `locations/${locationId}`;
}
