import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function parseSessionId(rawId: string): number | null {
  if (!/^\d+$/.test(rawId)) return null;
  const parsed = Number(rawId);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const sessionId = parseSessionId(id);
  if (!sessionId) {
    return NextResponse.json({ error: "Некорректный ID записи." }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON." }, { status: 400 });
  }

  const status = body.status;
  const startedAt = body.started_at;
  const completedAt = body.completed_at;
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
  const className = typeof body.class_name === "string" ? body.class_name.trim() : "";

  if (status !== "started" && status !== "finished") {
    return NextResponse.json({ error: "Некорректный статус." }, { status: 400 });
  }
  if (typeof startedAt !== "string" || Number.isNaN(Date.parse(startedAt))) {
    return NextResponse.json({ error: "Некорректная дата начала." }, { status: 400 });
  }
  if (
    completedAt !== null &&
    completedAt !== undefined &&
    completedAt !== "" &&
    (typeof completedAt !== "string" || Number.isNaN(Date.parse(completedAt)))
  ) {
    return NextResponse.json({ error: "Некорректная дата завершения." }, { status: 400 });
  }
  if (!fullName || !className) {
    return NextResponse.json(
      { error: "ФИО ученика и класс обязательны." },
      { status: 400 }
    );
  }

  const normalizedCompletedAt =
    typeof completedAt === "string" && completedAt !== "" ? completedAt : null;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: existing, error: findError } = await supabaseAdmin
      .from("reading_sessions")
      .select("id, student_id")
      .eq("id", sessionId)
      .single();

    if (findError || !existing) {
      return NextResponse.json({ error: "Запись не найдена." }, { status: 404 });
    }

    const { error: sessionError } = await supabaseAdmin
      .from("reading_sessions")
      .update({
        status,
        started_at: startedAt,
        completed_at: normalizedCompletedAt,
      })
      .eq("id", sessionId);

    if (sessionError) {
      return NextResponse.json(
        { error: "Ошибка при обновлении сессии: " + sessionError.message },
        { status: 500 }
      );
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        full_name: fullName,
        class_name: className,
      })
      .eq("id", existing.student_id);

    if (profileError) {
      return NextResponse.json(
        { error: "Ошибка при обновлении профиля: " + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, student_id: existing.student_id },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin PATCH error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация Supabase не завершена." },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const sessionId = parseSessionId(id);
  if (!sessionId) {
    return NextResponse.json({ error: "Некорректный ID записи." }, { status: 400 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin
      .from("reading_sessions")
      .delete()
      .eq("id", sessionId);

    if (error) {
      return NextResponse.json(
        { error: "Ошибка при удалении: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin DELETE error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация Supabase не завершена." },
      { status: 500 }
    );
  }
}
