"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ExcelJS from "exceljs";

type SessionData = {
  id: number;
  student_id: string;
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

const toInputFormat = (isoString: string | null) => {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function AdminPage() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingSession, setEditingSession] = useState<SessionData | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [classFilter, setClassFilter] = useState("all"); // Новое состояние для фильтра классов
  const [sortOrder, setSortOrder] = useState("newest");

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    const { data, error } = await supabase
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
      console.error("Ошибка при загрузке данных:", error);
    } else {
      // @ts-ignore
      setSessions(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Удалить эту запись? Данное действие необратимо.")) return;

    const { error } = await supabase
      .from("reading_sessions")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Ошибка при удалении: " + error.message);
    } else {
      setSessions(sessions.filter(session => session.id !== id));
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;
    
    setIsSaving(true);
    
    const { error: sessionError } = await supabase
      .from("reading_sessions")
      .update({
        status: editingSession.status,
        started_at: editingSession.started_at,
        completed_at: editingSession.completed_at || null
      })
      .eq("id", editingSession.id);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: editingSession.profiles.full_name,
        class_name: editingSession.profiles.class_name
      })
      .eq("id", editingSession.student_id);

    if (sessionError || profileError) {
      alert("Ошибка при сохранении: " + (sessionError?.message || profileError?.message));
    } else {
      setSessions(sessions.map(s => {
        if (s.student_id === editingSession.student_id) {
          return {
            ...s,
            profiles: {
              full_name: editingSession.profiles.full_name,
              class_name: editingSession.profiles.class_name
            },
            ...(s.id === editingSession.id ? {
              status: editingSession.status,
              started_at: editingSession.started_at,
              completed_at: editingSession.completed_at
            } : {})
          };
        }
        return s;
      }));
      setEditingSession(null);
    }
    setIsSaving(false);
  };

  // 1. Применяем фильтры
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = 
      (session.profiles?.full_name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (session.books?.title || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || session.status === statusFilter;
    
    // Фильтрация по классу
    const matchesClass = classFilter === "all" || (session.profiles?.class_name || "").trim().toUpperCase() === classFilter.trim().toUpperCase();

    return matchesSearch && matchesStatus && matchesClass;
  });

  // 2. Сортируем отфильтрованный массив
  const processedSessions = [...filteredSessions].sort((a, b) => {
    if (sortOrder === "newest") {
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    }
    if (sortOrder === "oldest") {
      return new Date(a.started_at).getTime() - new Date(b.started_at).getTime();
    }
    
    const getMs = (session: SessionData) => {
      if (!session.completed_at) return -1;
      return new Date(session.completed_at).getTime() - new Date(session.started_at).getTime();
    };

    const durationA = getMs(a);
    const durationB = getMs(b);

    if (sortOrder === "duration_desc") {
      return durationB - durationA;
    }
    if (sortOrder === "duration_asc") {
      if (durationA === -1) return 1;
      if (durationB === -1) return -1;
      return durationA - durationB;
    }
    
    return 0;
  });

  const exportToExcel = async () => {
    if (!processedSessions || processedSessions.length === 0) {
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

    processedSessions.forEach(session => {
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
      
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900">Редактирование записи</h2>
              <p className="text-sm text-gray-500 mt-1">Книга: {editingSession.books?.title}</p>
            </div>

            <form onSubmit={handleUpdate} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">ФИО Ученика</label>
                <input 
                  type="text" 
                  value={editingSession.profiles.full_name}
                  onChange={e => setEditingSession({ 
                    ...editingSession, 
                    profiles: { ...editingSession.profiles, full_name: e.target.value } 
                  })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Класс</label>
                <input 
                  type="text" 
                  value={editingSession.profiles.class_name}
                  onChange={e => setEditingSession({ 
                    ...editingSession, 
                    profiles: { ...editingSession.profiles, class_name: e.target.value } 
                  })}
                  className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

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

        {/* Обновленная панель фильтров (Добавлен фильтр по классам) */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Поиск по имени или книге..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
            />
          </div>
          
          {/* Фильтр статусов */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="all">Все статусы</option>
            <option value="started">Читает</option>
            <option value="finished">Завершил</option>
          </select>

          {/* НОВЫЙ ФИЛЬТР ПО КЛАССАМ */}
          <select 
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full md:w-48 px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm cursor-pointer"
          >
            <option value="all">Все классы</option>
            <optgroup label="Junior Classes (Младшие)" className="font-bold text-gray-900">
              <option value="1 A">1 A</option>
              <option value="1 B">1 B</option>
              <option value="1 C">1 C</option>
              <option value="1 D">1 D</option>
              <option value="2 A">2 A</option>
              <option value="2 B">2 B</option>
              <option value="2 C">2 C</option>
              <option value="2 D">2 D</option>
              <option value="3 A">3 A</option>
              <option value="3 B">3 B</option>
              <option value="3 C">3 C</option>
              <option value="3 D">3 D</option>
              <option value="4 A">4 A</option>
              <option value="4 B">4 B</option>
              <option value="4 C">4 C</option>
            </optgroup>
            <optgroup label="Senior Classes (Старшие)" className="font-bold text-gray-900">
              <option value="5 A">5 A</option>
              <option value="5 B">5 B</option>
              <option value="5 C">5 C</option>
              <option value="6 A">6 A</option>
              <option value="6 B">6 B</option>
              <option value="7 A">7 A</option>
              <option value="7 B">7 B</option>
              <option value="7 C">7 C</option>
              <option value="8 A">8 A</option>
              <option value="8 B">8 B</option>
              <option value="9 A">9 A</option>
              <option value="10 A">10 A</option>
              <option value="11 A">11 A</option>
            </optgroup>
          </select>

          {/* Сортировка */}
          <select 
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-full md:w-56 px-4 py-3 border border-gray-200 bg-white rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm cursor-pointer font-medium text-indigo-700"
          >
            <option value="newest">Сначала новые</option>
            <option value="oldest">Сначала старые</option>
            <option value="duration_desc">Дольше всех читали</option>
            <option value="duration_asc">Меньше всех читали</option>
          </select>
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
                {processedSessions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-gray-400">
                      Ничего не найдено
                    </td>
                  </tr>
                ) : (
                  processedSessions.map((session) => (
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
                        <button 
                          onClick={() => setEditingSession(session)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Редактировать"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
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
