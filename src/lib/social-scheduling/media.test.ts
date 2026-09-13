import { describe, it, expect } from 'vitest';
import { validateMediaUrls } from './media';

describe('validateMediaUrls', () => {
  it('accepts no media at all', () => {
    expect(validateMediaUrls(undefined)).toEqual({ valid: true });
    expect(validateMediaUrls([])).toEqual({ valid: true });
  });

  it('accepts a single real HTTPS image URL', () => {
    expect(validateMediaUrls(['https://example.com/photo.jpg']).valid).toBe(true);
  });

  it('rejects more than one media URL — multi-photo/carousel is not yet supported', () => {
    const result = validateMediaUrls(['https://example.com/a.jpg', 'https://example.com/b.jpg']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Only 1 photo is currently supported');
  });

  it('rejects a non-HTTPS URL', () => {
    const result = validateMediaUrls(['http://example.com/photo.jpg']);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('HTTPS');
  });

  it('rejects a malformed URL', () => {
    const result = validateMediaUrls(['not a url']);
    expect(result.valid).toBe(false);
  });

  it('rejects a video URL with a clear, specific error rather than silently scheduling it', () => {
    const result = validateMediaUrls(['https://example.com/clip.mp4']);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Video is not currently supported for Facebook scheduling.');
  });
});
