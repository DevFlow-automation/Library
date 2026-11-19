import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (booksResult.error) {
      console.error("Ошибка загрузки книг:", booksResult.error);
      return NextResponse.json(
        { error: "Не удалось загрузить список книг." },
        { status: 500 }
      );
    }

    if (activeSessionResult.error) {
      console.error("Ошибка загрузки активной сессии:", activeSessionResult.error);
    }

    return NextResponse.json(
      {
        books: booksResult.data ?? [],
        activeSession: activeSessionResult.data ?? null,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Student books API error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация не завершена." },
      { status: 500 }
    );
  }
}
