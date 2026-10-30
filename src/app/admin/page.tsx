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

// Помощник для перевода ISO-даты в формат локального инпута datetime-local
const toInputFormat = (isoString: string | null) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояние для редактируемой записи
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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

  // ФУНКЦИЯ УДАЛЕНИЯ
  const handleDelete = async (id: number) => {
    if (!window.confirm("Удалить эту запись? Данное действие необратимо.")) return;

    const { error } = await supabase
      .from("reading_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Ошибка при удалении: " + error.message);
    } else {
      // Убираем удаленную запись из таблицы без перезагрузки
      setSessions(sessions.filter(session => session.id !== id));
    }
  };

  // ФУНКЦИЯ ОБНОВЛЕНИЯ (СОХРАНЕНИЯ)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    
    setIsSaving(true);
    const { error } = await supabase
      .from("reading_sessions")
      .update({
        status: editingSession.status,
        started_at: editingSession.started_at,
        completed_at: editingSession.completed_at || null
      })
      .eq("id", editingSession.id);

    if (error) {
      alert("Ошибка при сохранении: " + error.message);
    } else {
      // Обновляем локальные данные в таблице
      setSessions(sessions.map(s => (s.id === editingSession.id ? editingSession : s)));
      setEditingSession(null);
    }
    setIsSaving(false);
  };

  const exportToExcel = async () => {
    if (!sessions || sessions.length === 0) {
      return alert("Нет данных для экспорта");
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Статистика чтения");

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
      
      {/* Модальное окно редактирования */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Редактирование записи</h2>
              <p className="text-sm text-gray-500 mt-1">{editingSession.profiles?.full_name} — {editingSession.books?.title}</p>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Статус</label>
                <select 
                  value={editingSession.status}
                  onChange={e => setEditingSession({ ...editingSession, status: e.target.value })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="started">Читает</option>
                  <option value="finished">Завершил</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Начало чтения</label>
                <input 
                  type="datetime-local" 
                  value={toInputFormat(editingSession.started_at)}
                  onChange={e => setEditingSession({ ...editingSession, started_at: new Date(e.target.value).toISOString() })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Завершение чтения</label>
                <input 
                  type="datetime-local" 
                  value={toInputFormat(editingSession.completed_at)}
                  onChange={e => setEditingSession({ ...editingSession, completed_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button 
                  type="button" 
                  onClick={() => setEditingSession(null)}
                  className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-bold transition-colors"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={`px-5 py-2.5 ${isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'} text-white rounded-xl text-sm font-bold transition-colors`}
                >
                  {isSaving ? "Сохраняем..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Статистика чтения</h1>
            <p className="text-gray-500 mt-1">Управление активностью учеников</p>
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
                  <th className="p-5 font-bold">Книга</th>
                  <th className="p-5 font-bold">Статус</th>
                  <th className="p-5 font-bold">Начало</th>
                  <th className="p-5 font-bold">Завершение</th>
                  <th className="p-5 font-bold">Длительность</th>
                  <th className="p-5 font-bold text-center">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400">
                      Нет данных о чтении
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-5 font-medium text-gray-900">
                        {session.profiles?.full_name || "—"}
                        <div className="text-xs text-gray-400 font-mono mt-0.5">Класс: {session.profiles?.class_name || "—"}</div>
                      </td>
                      <td className="p-5 text-gray-900 font-medium max-w-xs truncate" title={session.books?.title}>
                        {session.books?.title || "—"}
                        <div className="text-xs text-gray-400 font-mono mt-0.5">Ур: {session.books?.level || "—"}</div>
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
                      <td className="p-5 text-center flex items-center justify-center gap-2">
                        {/* Кнопка Редактировать */}
                        <button 
                          onClick={() => setEditingSession(session)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        {/* Кнопка Удалить */}
                        <button 
                          onClick={() => handleDelete(session.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Удалить"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
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
