"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ReadingSession = {
  id: number;
  started_at: string;
  profiles: {
    full_name: string;
    class_name: string;
  };
  books: {
    title: string;
  };
};

export default function AdminPage() {
  const [sessions, setSessions] = useState<ReadingSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    // Получаем историю чтения, автоматически подтягивая ФИО ученика и название книги
    const { data, error } = await supabase
      .from("reading_sessions")
      .select(`
        id,
        started_at,
        profiles (full_name, class_name),
        books (title)
      `)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Ошибка загрузки статистики:", error);
    } else {
      setSessions(data as any);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-10 text-center text-xl">Загрузка данных...</div>;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold text-gray-800">Статистика чтения</h1>

        <div className="overflow-hidden rounded-xl bg-white shadow-md">
          <table className="w-full text-left text-sm text-gray-500">
            <thead className="bg-gray-100 text-xs uppercase text-gray-700">
              <tr>
                <th className="px-6 py-4">Ученик</th>
                <th className="px-6 py-4">Класс</th>
                <th className="px-6 py-4">Книга</th>
                <th className="px-6 py-4">Дата и время</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center">Пока нет данных о чтении</td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {session.profiles?.full_name || "Неизвестно"}
                    </td>
                    <td className="px-6 py-4">
                      {session.profiles?.class_name || "-"}
                    </td>
                    <td className="px-6 py-4 font-medium text-blue-600">
                      {session.books?.title || "Неизвестная книга"}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(session.started_at).toLocaleString('ru-RU')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
