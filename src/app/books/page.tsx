"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Book = {
  id: number;
  title: string;
  cover_url: string;
  external_link: string;
  level: string;
};

type ActiveSession = {
  id: number;
  book_id: number;
};

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);

  const router = useRouter();
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const id = localStorage.getItem("student_id");
    const name = localStorage.getItem("student_name");

    if (!id) {
      router.push("/");
      return;
    }
    setStudentName(name || "Ученик");
    fetchBooks();
    fetchActiveSession(id);
  }, [router]);

  const fetchBooks = async () => {
    const { data, error } = await supabase.from("books").select("*");
    if (error) console.error("Ошибка загрузки книг:", error);
    else setBooks(data || []);
    setLoading(false);
  };

  const fetchActiveSession = async (studentId: string) => {
    const { data, error } = await supabase
      .from("reading_sessions")
      .select("id, book_id")
      .eq("student_id", studentId)
      .eq("status", "started")
      .order("started_at", { ascending: false })
      .limit(1)
      .single();

    if (data && !error) {
      setActiveSession(data);
    }
  };

  const handleReadBook = async (book: Book) => {
    const studentId = localStorage.getItem("student_id");
    if (!studentId) return;

    try {
      const now = new Date().toISOString();

      // Удаляем предыдущие незакрытые "быстрые клики"
      await supabase
        .from("reading_sessions")
        .delete()
        .eq("student_id", studentId)
        .eq("status", "started");

      // Создаем новую сессию
      const { data, error } = await supabase.from("reading_sessions").insert([
        {
          student_id: studentId,
          book_id: book.id,
          status: "started",
          started_at: now
        }
      ]).select().single();

      if (error) throw error;

      if (data) {
        setActiveSession({ id: data.id, book_id: data.book_id });
      }

      window.open(book.external_link, "_blank");
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось открыть книгу.");
    }
  };

  const handleFinishReading = async () => {
    if (!activeSession) return;

    try {
      const now = new Date().toISOString();

      await supabase
        .from("reading_sessions")
        .update({ status: "finished", completed_at: now })
        .eq("id", activeSession.id);

      setActiveSession(null);
      alert("Отлично! Книга прочитана, время сохранено.");
    } catch (error) {
      console.error("Ошибка при завершении чтения:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("student_id");
    localStorage.removeItem("student_name");
    router.push("/");
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollTop / window.innerHeight);
    if (index !== activeIndex) {
      setActiveIndex(index);
    }
  };

  const scrollToSection = (index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth' });
  };

  if (loading) return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500 font-mono tracking-widest text-sm uppercase">Загрузка библиотеки...</div>;

  return (
    <main className="bg-gray-50 text-gray-900 overflow-hidden relative selection:bg-indigo-100">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes shine {
          from { transform: translateX(-100%) rotate(45deg); }
          to { transform: translateX(200%) rotate(45deg); }
        }
        .shine-effect::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
          transform: translateX(-100%) rotate(45deg);
          pointer-events: none;
          z-index: 10;
        }
        .shine-effect:hover::before {
          animation: shine 1.5s;
        }
        .float-animation {
          animation: float 6s ease-in-out infinite;
        }
        .scroll-container {
          scroll-snap-type: y mandatory;
          scrollbar-width: none;
        }
        .scroll-container::-webkit-scrollbar {
          display: none;
        }
        .scroll-section {
          scroll-snap-align: start;
          scroll-snap-stop: always;
        }
      `}} />

      <header className="fixed top-0 left-0 w-full z-40 px-6 py-4 bg-gradient-to-b from-gray-50/90 to-transparent pointer-events-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between pointer-events-auto">
          <span className="text-xs font-mono text-gray-500 tracking-widest uppercase font-bold">
            MRJ / {studentName}
          </span>
          <button
            onClick={handleLogout}
            className="text-xs font-mono text-gray-500 hover:text-indigo-600 transition-colors uppercase tracking-widest font-bold"
          >
            Выйти ✕
          </button>
        </div>
      </header>

      {/* Плавающая панель активной книги */}
      {activeSession && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white px-5 py-3 sm:px-6 sm:py-4 rounded-2xl shadow-2xl shadow-indigo-200/50 border border-gray-100 flex items-center gap-4 sm:gap-6 z-50">
          <div className="flex flex-col">
            <span className="text-[10px] sm:text-xs text-gray-400 uppercase tracking-widest font-bold">Сейчас читаете</span>
            <span className="text-xs sm:text-sm font-bold text-indigo-700 max-w-[120px] sm:max-w-[200px] truncate">
              {books.find(b => b.id === activeSession.book_id)?.title || "Книгу"}
            </span>
          </div>
          <button
            onClick={handleFinishReading}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-green-200 transition-all active:scale-95 whitespace-nowrap"
          >
            Завершить ✅
          </button>
        </div>
      )}

      <div
        className="scroll-container h-screen overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        {books.length === 0 ? (
          <div className="h-screen flex items-center justify-center text-gray-400 font-mono">Библиотека пуста</div>
        ) : (
          books.map((book, index) => {
            const isEven = index % 2 === 0;
            const isReadingThisBook = activeSession?.book_id === book.id;

            return (
              <section
                key={book.id}
                ref={(el) => { sectionRefs.current[index] = el }}
                className={`scroll-section relative h-screen flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                <div className="w-full md:w-1/2 h-1/2 md:h-full relative overflow-hidden group shine-effect bg-gray-200 flex items-center justify-center">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                    />
                  ) : (
                    <span className="text-gray-400 font-mono tracking-widest">NO COVER</span>
                  )}
                </div>

                <div className="w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center p-8 bg-gray-50 relative">
                  <div className="max-w-lg float-animation w-full">
                    <span className="text-indigo-500 tracking-widest text-xs font-mono font-bold">
                      {(index + 1).toString().padStart(2, '0')} / УРОВЕНЬ: {book.level || 'ANY'}
                    </span>

                    <h2 className="mt-4 text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent line-clamp-3">
                      {book.title}
                    </h2>

                    <div className="mt-8 p-5 bg-white shadow-xl shadow-indigo-100/50 rounded-2xl w-max border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3 font-bold">Данные для входа</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 font-mono w-14">Login</span>
                          <span className="text-sm text-indigo-700 font-mono font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">ВАШ_ЛОГИН</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 font-mono w-14">Pass</span>
                          <span className="text-sm text-indigo-700 font-mono font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">ВАШ_ПАРОЛЬ</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-10 flex gap-4">
                      {isReadingThisBook ? (
                        <button
                          onClick={handleFinishReading}
                          className="px-8 py-4 bg-green-500 text-white hover:bg-green-600 hover:shadow-lg hover:shadow-green-200 rounded-full text-sm font-bold transition-all duration-300 uppercase flex items-center gap-2"
                        >
                          ✅ Я закончил читать
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReadBook(book)}
                          className="px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 rounded-full text-sm font-bold transition-all duration-300 hover:tracking-widest uppercase flex items-center gap-3"
                        >
                          Начать чтение <span>→</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      {books.length > 1 && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-40">
          {books.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToSection(index)}
              title={`Книга ${index + 1}`}
              className={`w-2 rounded-full transition-all duration-500 shadow-sm ${
                activeIndex === index
                  ? 'h-8 bg-indigo-600'
                  : 'h-2 bg-gray-300 hover:bg-indigo-400 hover:h-4'
              }`}
            />
          ))}
        </div>
      )}
    </main>
  );
}
