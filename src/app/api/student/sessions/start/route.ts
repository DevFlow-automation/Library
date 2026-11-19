import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный формат запроса." },
      { status: 400 }
    );
  }

  const bookId = (body as { bookId?: unknown })?.bookId;
  if (typeof bookId !== "number" || !Number.isSafeInteger(bookId) || bookId <= 0) {
    return NextResponse.json(
      { error: "Некорректный ID книги." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: book, error: bookError } = await supabaseAdmin
      .from("books")
      .select("id")
      .eq("id", bookId)
      .maybeSingle();

    if (bookError || !book) {
      return NextResponse.json({ error: "Книга не найдена." }, { status: 404 });
    }

    const now = new Date().toISOString();

    await supabaseAdmin
      .from("reading_sessions")
      .delete()
      .eq("student_id", session.studentId)
      .eq("status", "started");

    const { data, error } = await supabaseAdmin
      .from("reading_sessions")
      .insert([
        {
          student_id: session.studentId,
          book_id: bookId,
          status: "started",
          started_at: now,
        },
      ])
      .select("id, book_id")
      .single();

    if (error || !data) {
      console.error("Ошибка создания сессии чтения:", error);
      return NextResponse.json(
        { error: "Не удалось начать сессию чтения." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { session: data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Start session API error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация не завершена." },
      { status: 500 }
    );
  }
}
