import {
  getSessionCookieOptions,
  signJsonPayload,
  verifyJsonPayload,
} from "./session-crypto";

export const STUDENT_COOKIE_NAME = "mrj_student_session";
export const STUDENT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export type StudentSessionPayload = {
  role: "student";
  studentId: string;
  fullName: string;
  className: string;
  iat: number;
  exp: number;
};

export async function createStudentSessionToken(student: {
  studentId: string;
  fullName: string;
  className: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: StudentSessionPayload = {
    role: "student",
    studentId: student.studentId,
    fullName: student.fullName,
    className: student.className,
    iat: now,
    exp: now + STUDENT_SESSION_TTL_SECONDS,
  };

  return signJsonPayload(payload);
}

export async function verifyStudentSessionToken(
  token: string | null | undefined
): Promise<StudentSessionPayload | null> {
  const payload = await verifyJsonPayload<StudentSessionPayload>(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.role !== "student" ||
    typeof payload.studentId !== "string" ||
    !payload.studentId ||
    typeof payload.fullName !== "string" ||
    typeof payload.className !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number" ||
    payload.exp <= now
  ) {
    return null;
  }

  return payload as StudentSessionPayload;
}

export function getStudentSessionCookieOptions(
  maxAge = STUDENT_SESSION_TTL_SECONDS
) {
  return getSessionCookieOptions(maxAge);
}
