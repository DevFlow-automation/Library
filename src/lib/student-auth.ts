import { cookies } from "next/headers";
import {
  STUDENT_COOKIE_NAME,
  type StudentSessionPayload,
  verifyStudentSessionToken,
} from "./student-token";

export * from "./student-token";

export async function getStudentSession(): Promise<StudentSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_COOKIE_NAME)?.value;
  return verifyStudentSessionToken(token);
}
