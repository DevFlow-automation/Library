import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import BooksClient from "./BooksClient";

export default async function BooksPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  return <BooksClient studentName={session.fullName} />;
}
