import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import StudentLoginForm from "./StudentLoginForm";

export default async function LoginPage() {
  const session = await getStudentSession();
  if (session) {
    redirect("/books");
  }

  return <StudentLoginForm />;
}
