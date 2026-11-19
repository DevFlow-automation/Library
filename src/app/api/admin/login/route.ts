import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  createAdminSessionToken,
  getAdminSessionCookieOptions,
  verifyAdminCredentials,
} from "@/lib/admin-auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный формат запроса." },
      { status: 400 }
    );
  }

  const username =
    typeof (body as { username?: unknown })?.username === "string"
      ? (body as { username: string }).username
      : "";
  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? (body as { password: string }).password
      : "";

  if (!username.trim() || !password) {
    return NextResponse.json(
      { error: "Введите логин и пароль." },
      { status: 400 }
    );
  }

  const verification = await verifyAdminCredentials(username, password);
  if (!verification.ok) {
    return NextResponse.json(
      { error: verification.error },
      { status: verification.status }
    );
  }

  const token = await createAdminSessionToken(verification.username);
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ADMIN_COOKIE_NAME, token, getAdminSessionCookieOptions());

  return response;
}
