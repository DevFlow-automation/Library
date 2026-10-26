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

export default function BooksPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [studentName, setStudentName] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

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
  }, [router]);

  const fetchBooks = async () => {
    const { data, error } = await supabase.from("books").select("*");
    if (error) console.error("Ошибка загрузки книг:", error);
    else setBooks(data || []);
    setLoading(false);
  };

  const handleReadBook = async (book: Book) => {
    const studentId = localStorage.getItem("student_id");
    if (!studentId) return;

    try {
      await supabase.from("reading_sessions").insert([
        { student_id: studentId, book_id: book.id, status: "started" }
      ]);
      window.open(book.external_link, "_blank");
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось открыть книгу.");
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

      {/* Компактный прозрачный Header */}
      <header className="fixed top-0 left-0 w-full z-50 px-6 py-4 bg-gradient-to-b from-gray-50/90 to-transparent pointer-events-none">
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

      {/* Контейнер скролла */}
      <div
        className="scroll-container h-screen overflow-y-auto overflow-x-hidden"
        onScroll={handleScroll}
      >
        {books.length === 0 ? (
          <div className="h-screen flex items-center justify-center text-gray-400 font-mono">Библиотека пуста</div>
        ) : (
          books.map((book, index) => {
            const isEven = index % 2 === 0;

            return (
              <section
                key={book.id}
                ref={(el) => { sectionRefs.current[index] = el }}
                className={`scroll-section relative h-screen flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                {/* Блок с изображением */}
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

                {/* Блок с контентом */}
                <div className="w-full md:w-1/2 h-1/2 md:h-full flex items-center justify-center p-8 bg-gray-50 relative">
                  <div className="max-w-lg float-animation w-full">
                    <span className="text-indigo-500 tracking-widest text-xs font-mono font-bold">
                      {(index + 1).toString().padStart(2, '0')} / УРОВЕНЬ: {book.level || 'ANY'}
                    </span>

                    <h2 className="mt-4 text-4xl md:text-6xl font-bold leading-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent line-clamp-3">
                      {book.title}
                    </h2>

                    {/* Интегрированное минималистичное предупреждение */}
                    <div className="mt-8 p-5 bg-white shadow-xl shadow-indigo-100/50 rounded-2xl w-max border border-gray-100">
                      <p className="text-[10px] uppercase tracking-widest text-gray-400 mb-3 font-bold">Данные для входа</p>
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 font-mono w-14">Login</span>
                          <span className="text-sm text-indigo-700 font-mono font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">new_generation</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-gray-500 font-mono w-14">Pass</span>
                          <span className="text-sm text-indigo-700 font-mono font-bold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100">english</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleReadBook(book)}
                      className="mt-10 px-8 py-4 bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-lg hover:shadow-indigo-200 rounded-full text-sm font-bold transition-all duration-500 hover:tracking-widest flex items-center gap-3 uppercase"
                    >
                      Начать чтение <span>→</span>
                    </button>
                  </div>
                </div>
              </section>
            );
          })
        )}
      </div>

      {/* Навигационные точки */}
      {books.length > 1 && (
        <div className="fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-50">
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
