import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE_NAME,
  getAdminSessionCookieOptions,
} from "@/lib/admin-auth";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(ADMIN_COOKIE_NAME, "", getAdminSessionCookieOptions(0));
  return response;
}
