"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";

type SessionData = {
  id: number;
  status: string;
  started_at: string;
  completed_at: string | null;
  profiles: {
    full_name: string;
    class_name: string;
  };
  books: {
    title: string;
    level: string;
  };
};

// Функция для подсчета времени чтения
function getDuration(start: string, end: string | null) {
  if (!end) return "—";

  const diffMs = new Date(end).getTime() - new Date(start).getTime();
  if (diffMs <= 0) return "—";

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} ч ${minutes} мин`;
  } else if (minutes > 0) {
    return `${minutes} мин ${seconds} сек`;
  } else {
    return `${seconds} сек`;
  }
}

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
      .from("reading_sessions")
      .select(`
        id,
        status,
        started_at,
        completed_at,
        profiles ( full_name, class_name ),
        books ( title, level )
      `)
      .order("started_at", { ascending: false });

    if (error) {
      console.error("Ошибка при загрузке данных:", error);
    } else {
      // @ts-ignore
      setSessions(data || []);
    }
    setLoading(false);
  };

  const exportToExcel = async () => {
    if (!sessions || sessions.length === 0) {
      return alert("Нет данных для экспорта");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Статистика чтения");

    // Добавлена новая колонка "Время"
    worksheet.columns = [
      { header: "Ученик", key: "student" },
      { header: "Класс", key: "class" },
      { header: "Книга", key: "book" },
      { header: "Уровень", key: "level" },
      { header: "Статус", key: "status" },
      { header: "Начало", key: "startDate" },
      { header: "Завершение", key: "endDate" },
      { header: "Время", key: "duration" }
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4F46E5" }
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 25;

    sessions.forEach(session => {
      worksheet.addRow({
        student: session.profiles?.full_name || "Неизвестно",
        class: session.profiles?.class_name || "-",
        book: session.books?.title || "Неизвестна",
        level: session.books?.level || "-",
        status: session.status === "started" ? "📖 Читает" : "✅ Завершил",
        startDate: new Date(session.started_at).toLocaleString("ru-RU"),
        endDate: session.completed_at ? new Date(session.completed_at).toLocaleString("ru-RU") : "-",
        duration: getDuration(session.started_at, session.completed_at)
      });
    });

    worksheet.columns.forEach(column => {
      if (!column) return;

      let maxLength = 0;

      column.eachCell?.({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
        cell.border = {
          top: { style: "thin", color: { argb: "FFCBD5E1" } },
          left: { style: "thin", color: { argb: "FFCBD5E1" } },
          bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
          right: { style: "thin", color: { argb: "FFCBD5E1" } }
        };
      });

      column.width = maxLength < 10 ? 12 : maxLength + 2;
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `MRJ_Отчет_${new Date().toLocaleDateString("ru-RU")}.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-500 font-mono tracking-widest text-sm uppercase">
        Загрузка панели...
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 sm:p-10 text-gray-900">
      <div className="max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Статистика чтения</h1>
            <p className="text-gray-500 mt-1">Отслеживание активности учеников</p>
          </div>

          <button
            onClick={exportToExcel}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 transition-all flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Скачать Excel
          </button>
        </div>

        <div className="bg-white shadow-xl shadow-indigo-100/50 rounded-2xl overflow-hidden border border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-indigo-50/50 text-gray-500 text-xs uppercase tracking-widest font-mono border-b border-gray-100">
                  <th className="p-5 font-bold">Ученик</th>
                  <th className="p-5 font-bold">Класс</th>
                  <th className="p-5 font-bold">Книга</th>
                  <th className="p-5 font-bold">Уровень</th>
                  <th className="p-5 font-bold">Статус</th>
                  <th className="p-5 font-bold">Начало</th>
                  <th className="p-5 font-bold">Завершение</th>
                  <th className="p-5 font-bold">Длительность</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-gray-400">
                      Нет данных о чтении
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 font-medium text-gray-900">
                        {session.profiles?.full_name || "—"}
                      </td>
                      <td className="p-5 text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded font-mono text-xs">
                          {session.profiles?.class_name || "—"}
                        </span>
                      </td>
                      <td className="p-5 text-gray-900 font-medium max-w-xs truncate" title={session.books?.title}>
                        {session.books?.title || "—"}
                      </td>
                      <td className="p-5 text-gray-600">
                        {session.books?.level || "—"}
                      </td>
                      <td className="p-5">
                        {session.status === "started" ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                            Читает
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Завершил
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-gray-500 font-mono text-xs">
                        {new Date(session.started_at).toLocaleString("ru-RU")}
                      </td>
                      <td className="p-5 text-gray-500 font-mono text-xs">
                        {session.completed_at
                          ? new Date(session.completed_at).toLocaleString("ru-RU")
                          : "—"}
                      </td>
                      <td className="p-5 text-indigo-700 font-bold text-xs">
                        {getDuration(session.started_at, session.completed_at)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}
