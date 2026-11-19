import {
  getSessionCookieOptions,
  readSessionSecret,
  signJsonPayload,
  timingSafeStringEqual,
  verifyJsonPayload,
} from "./session-crypto";

export const ADMIN_COOKIE_NAME = "mrj_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type AdminSessionPayload = {
  role: "admin";
  sub: string;
  iat: number;
  exp: number;
};

export async function createAdminSessionToken(username: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    role: "admin",
    sub: username,
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };

  return signJsonPayload(payload);
}

export async function verifyAdminSessionToken(
  token: string | null | undefined
): Promise<AdminSessionPayload | null> {
  const payload = await verifyJsonPayload<AdminSessionPayload>(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.role !== "admin" ||
    typeof payload.sub !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    return null;
  }

  return payload as AdminSessionPayload;
}

export async function verifyAdminCredentials(
  username: string,
  password: string
): Promise<
  | { ok: true; username: string }
  | { ok: false; error: string; status: number }
> {
  const expectedUsername = process.env.ADMIN_USERNAME || "admin";
  const expectedPassword = process.env.ADMIN_PASSWORD;
  const sessionSecret = readSessionSecret();

  if (!expectedPassword || !sessionSecret) {
    return {
      ok: false,
      error: "Авторизация администратора не настроена на сервере.",
      status: 500,
    };
  }

  const [usernameMatches, passwordMatches] = await Promise.all([
    timingSafeStringEqual(username.trim(), expectedUsername, sessionSecret),
    timingSafeStringEqual(password, expectedPassword, sessionSecret),
  ]);

  if (!usernameMatches || !passwordMatches) {
    return {
      ok: false,
      error: "Неверный логин или пароль.",
      status: 401,
    };
  }

  return { ok: true, username: expectedUsername };
}

export function getAdminSessionCookieOptions(maxAge = ADMIN_SESSION_TTL_SECONDS) {
  return getSessionCookieOptions(maxAge);
}
