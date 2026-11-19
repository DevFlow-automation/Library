const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(input: string): Uint8Array | null {
  try {
    const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
    const padLength = (4 - (base64.length % 4)) % 4;
    const padded = base64 + "=".repeat(padLength);
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

export function readSessionSecret(): string | null {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 16) return null;
  return secret;
}

export function requireSessionSecret(): string {
  const secret = readSessionSecret();
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET (or SESSION_SECRET) is not configured (must be at least 16 characters)."
    );
  }
  return secret;
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
}

export async function hmacSha256(
  secret: string,
  message: string
): Promise<Uint8Array> {
  const key = await importHmacKey(secret);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return new Uint8Array(signature);
}

export async function timingSafeStringEqual(
  a: string,
  b: string,
  hmacKey: string
): Promise<boolean> {
  const [digestA, digestB] = await Promise.all([
    hmacSha256(hmacKey, a),
    hmacSha256(hmacKey, b),
  ]);

  if (digestA.length !== digestB.length) return false;

  let diff = 0;
  for (let i = 0; i < digestA.length; i++) {
    diff |= digestA[i] ^ digestB[i];
  }
  return diff === 0;
}

export async function signJsonPayload(payload: object): Promise<string> {
  const secret = requireSessionSecret();
  const payloadEncoded = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signatureBytes = await hmacSha256(secret, payloadEncoded);
  const signatureEncoded = bytesToBase64Url(signatureBytes);
  return `${payloadEncoded}.${signatureEncoded}`;
}

export async function verifyJsonPayload<T>(
  token: string | null | undefined
): Promise<Partial<T> | null> {
  if (!token) return null;

  const secret = readSessionSecret();
  if (!secret) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payloadEncoded, signatureEncoded] = parts;
  if (!payloadEncoded || !signatureEncoded) return null;

  const expectedSigBytes = await hmacSha256(secret, payloadEncoded);
  const providedSigBytes = base64UrlToBytes(signatureEncoded);

  if (!providedSigBytes || providedSigBytes.length !== expectedSigBytes.length) {
    return null;
  }

  let diff = 0;
  for (let i = 0; i < expectedSigBytes.length; i++) {
    diff |= expectedSigBytes[i] ^ providedSigBytes[i];
  }
  if (diff !== 0) return null;

  const payloadBytes = base64UrlToBytes(payloadEncoded);
  if (!payloadBytes) return null;

  try {
    return JSON.parse(decoder.decode(payloadBytes)) as Partial<T>;
  } catch {
    return null;
  }
}

export function getSessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}
