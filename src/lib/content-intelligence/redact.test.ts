import { describe, it, expect } from 'vitest';
import { redactSecretsInString, scrubSecretsDeep } from './redact';

describe('redactSecretsInString', () => {
  it('redacts a Meta access-token-shaped string', () => {
    const token = 'EAANbq6UhE7wBSXldBeBLIncDZB4mO84p0tzuUY0K58Dde0njfafRBcllGy7S6s47Xqfqah';
    expect(redactSecretsInString(`token is ${token} end`)).not.toContain(token);
  });

  it('redacts an access_token query parameter value while keeping the rest of the URL', () => {
    const url = 'https://graph.facebook.com/v26.0/123/insights?access_token=SECRETVALUE123&since=1';
    const result = redactSecretsInString(url);
    expect(result).not.toContain('SECRETVALUE123');
    expect(result).toContain('https://graph.facebook.com/v26.0/123/insights');
    expect(result).toContain('since=1');
  });

  it('leaves ordinary text completely unchanged', () => {
    const text = 'Post about smashburgers on Saturday for best engagement.';
    expect(redactSecretsInString(text)).toBe(text);
  });
});

describe('scrubSecretsDeep', () => {
  it('recursively redacts strings nested in arrays and objects', () => {
    const token = 'EAANbq6UhE7wBSXldBeBLIncDZB4mO84p0tzuUY0K58Dde0njfafRBcllGy7S6s47Xqfqah';
    const input = { a: { b: [`safe text ${token}`, 'clean'] }, c: 42, d: null };
    const result = scrubSecretsDeep(input) as typeof input;
    expect(JSON.stringify(result)).not.toContain(token);
    expect(result.c).toBe(42);
    expect(result.d).toBeNull();
  });
});
