// Edge-compatible session token using Web Crypto (HMAC-SHA256).
// Works in Next.js middleware (Edge runtime) and Node.js API routes (18+).

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

function bufToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(): Promise<string> {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET env var is not set');

  const payload = `${Date.now()}.${crypto.randomUUID()}`;
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${payload}:${bufToHex(sig)}`;
}

export async function verifySessionToken(token: string): Promise<boolean> {
  try {
    const secret = process.env.SESSION_SECRET;
    if (!secret || !token) return false;

    const sep = token.lastIndexOf(':');
    if (sep === -1) return false;

    const payload = token.slice(0, sep);
    const providedSig = token.slice(sep + 1);

    const key = await importKey(secret);
    const expectedBuf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
    const expectedSig = bufToHex(expectedBuf);

    return hexEqual(providedSig, expectedSig);
  } catch {
    return false;
  }
}
