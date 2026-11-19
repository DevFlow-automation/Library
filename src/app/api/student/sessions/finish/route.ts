import { NextResponse } from "next/server";
import { getStudentSession } from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  const session = await getStudentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    // body is optional
  }

  const rawSessionId = body.sessionId;
  const sessionId =
    typeof rawSessionId === "number" &&
    Number.isSafeInteger(rawSessionId) &&
    rawSessionId > 0
      ? rawSessionId
      : null;

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const now = new Date().toISOString();

    if (sessionId) {
      const { data, error } = await supabaseAdmin
        .from("reading_sessions")
        .update({ status: "finished", completed_at: now })
        .eq("id", sessionId)
        .eq("student_id", session.studentId)
        .select("id");

      if (error) {
        console.error("Ошибка завершения сессии:", error);
        return NextResponse.json(
          { error: "Ошибка при сохранении в базу: " + error.message },
          { status: 500 }
        );
      }

      if (data && data.length > 0) {
        return NextResponse.json(
          { ok: true },
          { headers: { "Cache-Control": "no-store" } }
        );
      }
    }

    const { data: fallbackData, error: fallbackError } = await supabaseAdmin
      .from("reading_sessions")
      .update({ status: "finished", completed_at: now })
      .eq("student_id", session.studentId)
      .eq("status", "started")
      .select("id");

    if (fallbackError) {
      console.error("Ошибка завершения активной сессии:", fallbackError);
      return NextResponse.json(
        { error: "Ошибка при сохранении в базу: " + fallbackError.message },
        { status: 500 }
      );
    }

    if (!fallbackData || fallbackData.length === 0) {
      return NextResponse.json(
        {
          error:
            "Не удалось найти эту книгу в базе данных. Возможно, она уже закрыта.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Finish session API error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация не завершена." },
      { status: 500 }
    );
  }
}
