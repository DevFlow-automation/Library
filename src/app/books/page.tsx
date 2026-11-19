import { redirect } from "next/navigation";
import { getStudentSession } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import BooksClient, { type ActiveSession, type Book } from "./BooksClient";

export default async function BooksPage() {
  const session = await getStudentSession();
  if (!session) {
    redirect("/");
  }

  let initialBooks: Book[] = [];
  let initialActiveSession: ActiveSession | null = null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const [booksResult, activeSessionResult] = await Promise.all([
      supabaseAdmin
        .from("books")
        .select("id, title, cover_url, external_link, level"),
      supabaseAdmin
        .from("reading_sessions")
        .select("id, book_id")
        .eq("student_id", session.studentId)
        .eq("status", "started")
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (booksResult.data) {
      initialBooks = booksResult.data as Book[];
    }
    if (activeSessionResult.data) {
      initialActiveSession = activeSessionResult.data as ActiveSession;
    }
  } catch (error) {
    console.error("Failed to preload books on server:", error);
  }

  return (
    <BooksClient
      studentName={session.fullName}
      studentClass={session.className}
      initialBooks={initialBooks}
      initialActiveSession={initialActiveSession}
    />
  );
}
