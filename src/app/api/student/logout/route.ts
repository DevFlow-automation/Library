import { NextResponse } from "next/server";
import {
  STUDENT_COOKIE_NAME,
  getStudentSessionCookieOptions,
} from "@/lib/student-auth";

export async function POST() {
  const response = NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "no-store" } }
  );
  response.cookies.set(
    STUDENT_COOKIE_NAME,
    "",
    getStudentSessionCookieOptions(0)
  );
  return response;
}
