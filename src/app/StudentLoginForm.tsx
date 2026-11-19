"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function StudentLoginForm() {
  const [fullName, setFullName] = useState("");
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !className) {
      alert("Пожалуйста, введите имя и выберите класс");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/student/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: fullName.trim(),
          className,
        }),
      });

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        alert(data.error || "Ошибка при входе. Попробуйте ещё раз.");
        return;
      }

      router.push("/books");
      router.refresh();
    } catch (error) {
      console.error("Ошибка при входе:", error);
      alert("Ошибка при входе. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-6xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Левая часть - Картинка */}
        <div className="flex justify-center order-2 lg:order-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
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
              <select
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                required
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition bg-gray-50 ${className ? "text-gray-900" : "text-gray-400"}`}
              >
                <option value="" disabled>
                  Выберите свой класс...
                </option>

                <optgroup label="Junior Classes (Младшие)">
                  <option value="1 A">1 A</option>
                  <option value="1 B">1 B</option>
                  <option value="1 V">1 V</option>
                  <option value="1 D">1 D</option>

                  <option value="2 A">2 A</option>
                  <option value="2 B">2 B</option>
                  <option value="2 V">2 V</option>
                  <option value="2 D">2 D</option>

                  <option value="3 A">3 A</option>
                  <option value="3 B">3 B</option>
                  <option value="3 V">3 V</option>
                  <option value="3 D">3 D</option>

                  <option value="4 A">4 A</option>
                  <option value="4 B">4 B</option>
                  <option value="4 V">4 V</option>
                </optgroup>

                <optgroup label="Senior Classes (Старшие)">
                  <option value="5 A">5 A</option>
                  <option value="5 B">5 B</option>
                  <option value="5 V">5 V</option>

                  <option value="6 A">6 A</option>
                  <option value="6 B">6 B</option>

                  <option value="7 A">7 A</option>
                  <option value="7 B">7 B</option>
                  <option value="7 V">7 V</option>

                  <option value="8 A">8 A</option>
                  <option value="8 B">8 B</option>

                  <option value="9 A">9 A</option>
                  <option value="10 A">10 A</option>
                  <option value="11 A">11 A</option>
                </optgroup>
              </select>
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
