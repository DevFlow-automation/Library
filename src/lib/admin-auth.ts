import { cookies } from "next/headers";
import {
  ADMIN_COOKIE_NAME,
  type AdminSessionPayload,
  verifyAdminSessionToken,
} from "./admin-token";

export * from "./admin-token";

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(token);
}
