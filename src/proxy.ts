import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/admin-token";
import {
  STUDENT_COOKIE_NAME,
  verifyStudentSessionToken,
} from "@/lib/student-token";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname === "/api/admin/login" ||
    pathname === "/api/admin/logout" ||
    pathname === "/api/student/login" ||
    pathname === "/api/student/logout"
  ) {
    return NextResponse.next();
  }

  // Admin routes
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname.startsWith("/api/admin")
  ) {
    const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
    const session = await verifyAdminSessionToken(token);

    if (pathname === "/admin/login") {
      if (session) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/api/admin")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }

    if (!session) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
    return NextResponse.next();
  }

  // Student routes
  if (
    pathname === "/books" ||
    pathname.startsWith("/books/") ||
    pathname.startsWith("/api/student")
  ) {
    const token = request.cookies.get(STUDENT_COOKIE_NAME)?.value;
    const session = await verifyStudentSessionToken(token);

    if (pathname.startsWith("/api/student")) {
      if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.next();
    }

    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin",
    "/admin/:path*",
    "/api/admin/:path*",
    "/books",
    "/books/:path*",
    "/api/student/:path*",
  ],
};
