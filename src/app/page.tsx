"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const studentId = localStorage.getItem("student_id");
    if (studentId) {
      router.push("/books");
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !className) return alert("Заполните все поля!");
    setLoading(true);

    try {
      let { data: existingUsers, error: searchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("full_name", fullName.trim())
        .eq("class_name", className.trim());

      if (searchError) throw searchError;
      let user = existingUsers?.[0];

      if (!user) {
        const { data: newUser, error: insertError } = await supabase
          .from("profiles")
          .insert([{ full_name: fullName.trim(), class_name: className.trim(), role: "student" }])
          .select()
          .single();

        if (insertError) throw insertError;
        user = newUser;
      }

      if (user) {
        localStorage.setItem("student_id", user.id);
        localStorage.setItem("student_name", user.full_name);
        router.push("/books");
      }
    } catch (error) {
      console.error("Ошибка входа:", error);
      alert("Произошла ошибка при входе. Попробуй еще раз!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

        {/* Левая часть - Картинка */}
        <div className="flex justify-center order-2 lg:order-1">
          <img
            src="/book.png"
            alt="My Reading Journey"
            className="w-full max-w-md object-contain drop-shadow-2xl"
          />
        </div>

        {/* Правая часть - Форма */}
        <div className="bg-white shadow-xl rounded-2xl p-8 sm:p-10 order-1 lg:order-2 w-full max-w-md mx-auto">
          <h1 className="text-4xl font-bold text-center text-gray-800 font-serif mb-2">
            My Reading Journey
          </h1>
          <p className="text-center text-gray-500 mb-8">
            Введи свои данные, чтобы начать читать
          </p>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Имя и фамилия
              </label>
              <input
                placeholder="Например: Иван Иванов"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Класс
              </label>
              <input
                placeholder="Например: 5A"
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition text-gray-900 bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-4 text-lg font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-indigo-400"
            >
              {loading ? "Загрузка..." : "Начать читать 🚀"}
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}
