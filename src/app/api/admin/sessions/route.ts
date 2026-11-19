import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data, error } = await supabaseAdmin
      .from("reading_sessions")
      .select(`
        id,
        student_id,
        status,
        started_at,
        completed_at,
        profiles ( full_name, class_name ),
        books ( title, level )
      `)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Ошибка при загрузке сессий:", error);
      return NextResponse.json(
        { error: "Не удалось загрузить данные." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { sessions: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Admin API configuration error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация Supabase не завершена." },
      { status: 500 }
    );
  }
}
