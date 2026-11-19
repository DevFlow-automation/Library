import { NextResponse } from "next/server";
import {
  STUDENT_COOKIE_NAME,
  createStudentSessionToken,
  getStudentSessionCookieOptions,
} from "@/lib/student-auth";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Некорректный формат запроса." },
      { status: 400 }
    );
  }

  const rawFullName = (body as { fullName?: unknown })?.fullName;
  const rawClassName = (body as { className?: unknown })?.className;

  const fullName = typeof rawFullName === "string" ? rawFullName.trim() : "";
  const className = typeof rawClassName === "string" ? rawClassName.trim() : "";

  if (!fullName || !className) {
    return NextResponse.json(
      { error: "Пожалуйста, введите имя и выберите класс." },
      { status: 400 }
    );
  }

  if (fullName.length > 120 || className.length > 20) {
    return NextResponse.json(
      { error: "Слишком длинное имя или название класса." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: existingProfile, error: searchError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, class_name")
      .eq("full_name", fullName)
      .eq("class_name", className)
      .limit(1)
      .maybeSingle();

    if (searchError) {
      console.error("Ошибка поиска профиля:", searchError);
      return NextResponse.json(
        { error: "Ошибка при входе. Попробуйте ещё раз." },
        { status: 500 }
      );
    }

    let profile = existingProfile;

    if (!profile) {
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert([{ full_name: fullName, class_name: className }])
        .select("id, full_name, class_name")
        .single();

      if (insertError || !newProfile) {
        console.error("Ошибка создания профиля:", insertError);
        return NextResponse.json(
          { error: "Не удалось создать профиль ученика." },
          { status: 500 }
        );
      }

      profile = newProfile;
    }

    const token = await createStudentSessionToken({
      studentId: String(profile.id),
      fullName: profile.full_name,
      className: profile.class_name,
    });

    const response = NextResponse.json(
      { ok: true },
      { headers: { "Cache-Control": "no-store" } }
    );
    response.cookies.set(
      STUDENT_COOKIE_NAME,
      token,
      getStudentSessionCookieOptions()
    );

    return response;
  } catch (err) {
    console.error("Student login server error:", err);
    return NextResponse.json(
      { error: "Серверная конфигурация не завершена." },
      { status: 500 }
    );
  }
}
