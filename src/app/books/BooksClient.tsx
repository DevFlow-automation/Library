"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type Book = {
  id: number;
  title: string;
  cover_url: string;
  external_link: string;
  level: string;
};

export type ActiveSession = {
  id: number;
  book_id: number;
};

type BooksClientProps = {
  studentName: string;
  studentClass: string;
  initialBooks: Book[];
  initialActiveSession: ActiveSession | null;
};

const PLATFORM_LOGIN = "new_generation";
const PLATFORM_PASS = "english";

function getLevelBadgeStyle(level: string): string {
  const normalized = level.trim().toLowerCase();
  if (!normalized || normalized === "any") {
    return "bg-stone-900/8 text-stone-700 border-stone-900/10";
  }
  if (normalized.includes("a1") || normalized.includes("1") || normalized.includes("starter")) {
    return "bg-amber-100/90 text-amber-900 border-amber-300/60";
  }
  if (normalized.includes("a2") || normalized.includes("2") || normalized.includes("elem")) {
    return "bg-emerald-100/90 text-emerald-900 border-emerald-300/60";
  }
  if (normalized.includes("b1") || normalized.includes("3") || normalized.includes("inter")) {
    return "bg-sky-100/90 text-sky-900 border-sky-300/60";
  }
  if (normalized.includes("b2") || normalized.includes("4") || normalized.includes("upper")) {
    return "bg-indigo-100/90 text-indigo-900 border-indigo-300/60";
  }
  return "bg-rose-100/90 text-rose-900 border-rose-300/60";
}

function getFallbackCoverGradient(index: number): string {
  const palettes = [
    "from-stone-800 via-stone-700 to-stone-900",
    "from-indigo-950 via-indigo-900 to-slate-900",
    "from-emerald-950 via-teal-900 to-stone-900",
    "from-amber-950 via-amber-900 to-stone-900",
    "from-slate-900 via-blue-950 to-indigo-950",
  ];
  return palettes[index % palettes.length];
}

export default function BooksClient({
  studentName,
  studentClass,
  initialBooks,
  initialActiveSession,
}: BooksClientProps) {
  const [books] = useState<Book[]>(initialBooks);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    initialActiveSession
  );
  const [startingBookId, setStartingBookId] = useState<number | null>(null);
  const [isFinishing, setIsFinishing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("all");
  const [viewMode, setViewMode] = useState<"shelf" | "list">("shelf");
  const [copiedField, setCopiedField] = useState<"login" | "pass" | null>(null);
  const [showPassPopover, setShowPassPopover] = useState(false);

  const router = useRouter();

  const redirectToLogin = useCallback(() => {
    router.replace("/");
    router.refresh();
  }, [router]);

  const levels = useMemo(() => {
    const unique = new Set<string>();
    books.forEach((b) => {
      const lvl = b.level?.trim();
      if (lvl) unique.add(lvl);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b, "ru"));
  }, [books]);

  const filteredBooks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return books.filter((book) => {
      const matchesSearch =
        !query ||
        book.title.toLowerCase().includes(query) ||
        (book.level || "").toLowerCase().includes(query);
      const matchesLevel =
        selectedLevel === "all" ||
        (book.level || "").trim() === selectedLevel;
      return matchesSearch && matchesLevel;
    });
  }, [books, searchQuery, selectedLevel]);

  const activeBook = useMemo(
    () => books.find((b) => b.id === activeSession?.book_id) || null,
    [books, activeSession]
  );

  const handleCopy = async (value: string, field: "login" | "pass") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 1600);
    } catch {
      // Clipboard API may be unavailable in restricted contexts
    }
  };

  const handleReadBook = async (book: Book) => {
    if (startingBookId !== null) return;
    setStartingBookId(book.id);

    try {
      const response = await fetch("/api/student/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        session?: ActiveSession;
        error?: string;
      };

      if (!response.ok || !data.session) {
        alert(data.error || "Не удалось открыть книгу.");
        return;
      }

      setActiveSession(data.session);
      window.open(book.external_link, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Ошибка:", error);
      alert("Не удалось открыть книгу.");
    } finally {
      setStartingBookId(null);
    }
  };

  const handleFinishReading = async () => {
    if (!activeSession || isFinishing) return;
    setIsFinishing(true);

    try {
      const response = await fetch("/api/student/sessions/finish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        alert(data.error || "Ошибка при сохранении в базу.");
        return;
      }

      setActiveSession(null);
    } catch (error) {
      console.error("Ошибка при завершении чтения:", error);
      alert("Ошибка сети при завершении чтения.");
    } finally {
      setIsFinishing(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/student/logout", { method: "POST" });
    } finally {
      try {
        localStorage.removeItem("student_id");
        localStorage.removeItem("student_name");
      } catch {
        // ignore storage errors
      }
      redirectToLogin();
    }
  };

  return (
    <main className="min-h-screen paper-surface text-stone-900 selection:bg-indigo-100 selection:text-indigo-950">
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 bg-[#f6f3ec]/85 backdrop-blur-md border-b border-stone-900/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-[#f6f3ec] flex items-center justify-center shrink-0 shadow-sm">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="font-serif text-base sm:text-lg font-bold leading-none text-stone-900 truncate">
                My Reading Journey
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-stone-500 truncate">
                <span className="font-medium text-stone-700 truncate">
                  {studentName}
                </span>
                {studentClass && (
                  <>
                    <span className="text-stone-300">•</span>
                    <span className="font-mono text-[11px] bg-stone-900/6 text-stone-700 px-1.5 py-0.5 rounded">
                      {studentClass}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 relative">
            {/* Quick access key popover button */}
            <button
              type="button"
              onClick={() => setShowPassPopover((v) => !v)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-[#fffefb] border border-stone-900/12 text-stone-700 hover:border-stone-900/25 hover:text-stone-950 transition-colors shadow-xs"
              title="Логин и пароль для чтения"
            >
              <svg
                className="w-3.5 h-3.5 text-amber-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <span className="hidden sm:inline">Доступ</span>
            </button>

            {showPassPopover && (
              <div className="absolute right-0 top-12 w-64 rounded-2xl bg-stone-900 text-stone-100 p-4 shadow-2xl border border-stone-700/80 z-50">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-stone-400">
                    Данные для входа
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassPopover(false)}
                    className="text-stone-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => void handleCopy(PLATFORM_LOGIN, "login")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/8 hover:bg-white/14 transition-colors text-left"
                  >
                    <div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        LOGIN
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {PLATFORM_LOGIN}
                      </div>
                    </div>
                    <span className="text-[11px] text-stone-300">
                      {copiedField === "login" ? "✓" : "Копир."}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleCopy(PLATFORM_PASS, "pass")}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white/8 hover:bg-white/14 transition-colors text-left"
                  >
                    <div>
                      <div className="text-[10px] text-stone-400 font-mono">
                        PASS
                      </div>
                      <div className="text-xs font-mono font-bold text-amber-300">
                        {PLATFORM_PASS}
                      </div>
                    </div>
                    <span className="text-[11px] text-stone-300">
                      {copiedField === "pass" ? "✓" : "Копир."}
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-stone-600 hover:text-stone-950 hover:bg-stone-900/6 transition-colors disabled:opacity-50"
            >
              <span>{isLoggingOut ? "Выход..." : "Выйти"}</span>
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* Compact Editorial Masthead + Credentials Pass */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-stone-900/10">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-stone-500">
              Читальный зал • {books.length}{" "}
              {books.length === 1
                ? "книга"
                : books.length >= 2 && books.length <= 4
                  ? "книги"
                  : "книг"}
            </p>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-950 mt-1">
              Выбери следующую книгу
            </h1>
          </div>

          {/* Tactile Dark-Ink Reading Pass (replaces repeating login box on every book) */}
          <div className="bg-stone-900 text-stone-100 rounded-2xl px-4 py-3 shadow-md shadow-stone-900/10 flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
            <div className="flex items-center gap-2 pr-1">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span className="text-[11px] font-mono uppercase tracking-wider text-stone-300">
                Вход на сайт книг
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void handleCopy(PLATFORM_LOGIN, "login")}
                className="group/copy inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/18 px-3 py-1.5 text-xs transition-colors"
                title="Нажмите, чтобы скопировать логин"
              >
                <span className="text-stone-400 font-mono text-[10px] uppercase">
                  Login
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {PLATFORM_LOGIN}
                </span>
                <span className="text-[10px] text-stone-300 group-hover/copy:text-white">
                  {copiedField === "login" ? "✓" : "⧉"}
                </span>
              </button>

              <button
                type="button"
                onClick={() => void handleCopy(PLATFORM_PASS, "pass")}
                className="group/copy inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/18 px-3 py-1.5 text-xs transition-colors"
                title="Нажмите, чтобы скопировать пароль"
              >
                <span className="text-stone-400 font-mono text-[10px] uppercase">
                  Pass
                </span>
                <span className="font-mono font-bold text-amber-300">
                  {PLATFORM_PASS}
                </span>
                <span className="text-[10px] text-stone-300 group-hover/copy:text-white">
                  {copiedField === "pass" ? "✓" : "⧉"}
                </span>
              </button>
            </div>
          </div>
        </section>

        {/* Active Reading Bookmark Banner */}
        {activeSession && (
          <section className="rounded-2xl bg-[#fffefb] border border-emerald-700/25 shadow-sm overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-5 border-l-4 border-l-emerald-600">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-11 h-14 rounded-md overflow-hidden bg-stone-200 shrink-0 shadow-xs border border-stone-900/10">
                  {activeBook?.cover_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeBook.cover_url}
                      alt={activeBook.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-emerald-900 flex items-center justify-center text-[10px] font-mono text-emerald-100">
                      MRJ
                    </div>
                  )}
                </div>

                <div className="min-w-0">
                  <div className="inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-emerald-700 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Сейчас читаете
                  </div>
                  <div className="font-serif text-lg font-bold text-stone-900 truncate mt-0.5">
                    {activeBook?.title || "Активная книга"}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {activeBook?.external_link && (
                  <a
                    href={activeBook.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 transition-colors"
                  >
                    Открыть ↗
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleFinishReading}
                  disabled={isFinishing}
                  className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-emerald-700 hover:bg-emerald-800 active:scale-[0.98] transition-all shadow-xs disabled:bg-stone-400"
                >
                  {isFinishing ? "Сохраняем..." : "Завершить чтение ✓"}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Filter, Search & View Toggle Toolbar */}
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedLevel("all")}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                selectedLevel === "all"
                  ? "bg-stone-900 text-[#f6f3ec] border-stone-900 shadow-xs"
                  : "bg-[#fffefb] text-stone-600 border-stone-900/12 hover:border-stone-900/25 hover:text-stone-900"
              }`}
            >
              Все ({books.length})
            </button>

            {levels.map((level) => {
              const isSelected = selectedLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setSelectedLevel(level)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    isSelected
                      ? "bg-stone-900 text-[#f6f3ec] border-stone-900 shadow-xs"
                      : "bg-[#fffefb] text-stone-600 border-stone-900/12 hover:border-stone-900/25 hover:text-stone-900"
                  }`}
                >
                  {level}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <svg
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск книги..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#fffefb] border border-stone-900/12 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-900/20 focus:border-stone-900/30 transition"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs"
                  aria-label="Очистить поиск"
                >
                  ✕
                </button>
              )}
            </div>

            {/* View mode toggle: Shelf / List */}
            <div
              className="inline-flex items-center p-1 rounded-xl bg-[#ebe6db] border border-stone-900/8 shrink-0"
              role="group"
              aria-label="Вид отображения"
            >
              <button
                type="button"
                onClick={() => setViewMode("shelf")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "shelf"
                    ? "bg-[#fffefb] text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                title="Книжная полка"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === "list"
                    ? "bg-[#fffefb] text-stone-900 shadow-xs"
                    : "text-stone-500 hover:text-stone-800"
                }`}
                title="Компактный список"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        </section>

        {/* Books Catalog */}
        {books.length === 0 ? (
          <div className="rounded-2xl bg-[#fffefb] border border-stone-900/10 py-16 text-center">
            <p className="font-serif text-xl text-stone-700">Библиотека пока пуста</p>
            <p className="text-sm text-stone-500 mt-1">
              Новые книги скоро появятся здесь
            </p>
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-2xl bg-[#fffefb] border border-stone-900/10 py-14 text-center space-y-3">
            <p className="font-serif text-xl text-stone-800">
              По запросу ничего не найдено
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setSelectedLevel("all");
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 text-white hover:bg-stone-800 transition-colors"
            >
              Сбросить фильтры
            </button>
          </div>
        ) : viewMode === "shelf" ? (
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredBooks.map((book, index) => {
              const isReadingThisBook = activeSession?.book_id === book.id;
              const isStartingThisBook = startingBookId === book.id;
              const catalogNumber = (index + 1).toString().padStart(2, "0");

              return (
                <article
                  key={book.id}
                  className={`group rounded-2xl bg-[#fffefb] border overflow-hidden flex flex-col transition-all duration-300 hover:shadow-[0_16px_36px_-18px_rgba(28,25,23,0.24)] ${
                    isReadingThisBook
                      ? "border-emerald-600/45 ring-2 ring-emerald-600/15"
                      : "border-stone-900/10 hover:border-stone-900/22"
                  }`}
                >
                  {/* Tactile Book Shelf Niche */}
                  <div className="relative bg-gradient-to-b from-[#efeadf] to-[#e6dfd1] px-5 pt-10 pb-5 flex items-center justify-center border-b border-stone-900/8">
                    {/* Catalog Number */}
                    <span className="absolute top-3 left-3.5 text-[11px] font-mono font-bold text-stone-500/90">
                      #{catalogNumber}
                    </span>

                    {/* Level Stamp */}
                    <span
                      className={`absolute top-2.5 right-3 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${getLevelBadgeStyle(
                        book.level || ""
                      )}`}
                    >
                      {book.level || "ANY"}
                    </span>

                    {/* Active Reading Ribbon */}
                    {isReadingThisBook && (
                      <span className="absolute bottom-2.5 left-3 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider font-bold bg-emerald-700 text-white shadow-xs z-20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        Читаю
                      </span>
                    )}

                    {/* Physical Book Object */}
                    <button
                      type="button"
                      onClick={() => {
                        if (isReadingThisBook) {
                          window.open(
                            book.external_link,
                            "_blank",
                            "noopener,noreferrer"
                          );
                        } else {
                          void handleReadBook(book);
                        }
                      }}
                      className="relative block focus:outline-none cursor-pointer"
                      aria-label={`Открыть книгу ${book.title}`}
                    >
                      <div className="w-[128px] sm:w-[136px] aspect-[3/4] book-object bg-stone-800">
                        <span className="book-page-edge" aria-hidden="true" />
                        <div className="relative w-full h-full overflow-hidden rounded-[3px_10px_10px_3px]">
                          {book.cover_url ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={book.cover_url}
                              alt={book.title}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div
                              className={`w-full h-full bg-gradient-to-br ${getFallbackCoverGradient(
                                index
                              )} p-3.5 flex flex-col justify-between text-left text-stone-100`}
                            >
                              <span className="text-[9px] font-mono uppercase tracking-widest text-stone-300/80">
                                {book.level || "BOOK"}
                              </span>
                              <span className="font-serif text-sm font-bold leading-snug line-clamp-4">
                                {book.title}
                              </span>
                              <span className="text-[9px] font-mono text-stone-400">
                                MRJ
                              </span>
                            </div>
                          )}
                          <div
                            className="absolute inset-0 book-spine-overlay pointer-events-none"
                            aria-hidden="true"
                          />
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* Compact Card Info & CTA */}
                  <div className="p-4 flex flex-col flex-1 justify-between gap-4">
                    <h2
                      className="font-serif text-[17px] font-bold leading-snug text-stone-900 line-clamp-2 min-h-[2.75rem]"
                      title={book.title}
                    >
                      {book.title}
                    </h2>

                    <div className="flex items-center gap-2">
                      {isReadingThisBook ? (
                        <>
                          <button
                            type="button"
                            onClick={handleFinishReading}
                            disabled={isFinishing}
                            className="flex-1 py-2.5 px-3.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold transition-colors disabled:bg-stone-400"
                          >
                            {isFinishing ? "Сохраняем..." : "Завершить ✓"}
                          </button>
                          <a
                            href={book.external_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Открыть книгу снова"
                            className="p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => void handleReadBook(book)}
                          disabled={isStartingThisBook}
                          className="w-full py-2.5 px-4 rounded-xl bg-stone-900 hover:bg-indigo-700 text-[#f6f3ec] text-xs font-bold tracking-wide transition-all flex items-center justify-between disabled:bg-stone-400"
                        >
                          <span>
                            {isStartingThisBook
                              ? "Открываем..."
                              : "Начать чтение"}
                          </span>
                          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
                            →
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          /* Ultra-Compact Editorial List View */
          <section className="space-y-2.5">
            {filteredBooks.map((book, index) => {
              const isReadingThisBook = activeSession?.book_id === book.id;
              const isStartingThisBook = startingBookId === book.id;
              const catalogNumber = (index + 1).toString().padStart(2, "0");

              return (
                <article
                  key={book.id}
                  className={`group rounded-2xl bg-[#fffefb] border p-3 sm:px-4 flex items-center justify-between gap-4 transition-all ${
                    isReadingThisBook
                      ? "border-emerald-600/45 ring-2 ring-emerald-600/10"
                      : "border-stone-900/10 hover:border-stone-900/22 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="hidden sm:inline-block w-7 text-xs font-mono font-bold text-stone-400 shrink-0">
                      {catalogNumber}
                    </span>

                    <div className="w-11 h-14 rounded-[2px_6px_6px_2px] overflow-hidden bg-stone-800 shrink-0 shadow-xs relative">
                      {book.cover_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={book.cover_url}
                          alt={book.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div
                          className={`w-full h-full bg-gradient-to-br ${getFallbackCoverGradient(
                            index
                          )} flex items-center justify-center text-[9px] font-mono text-stone-200`}
                        >
                          MRJ
                        </div>
                      )}
                      <div className="absolute inset-0 book-spine-overlay pointer-events-none" />
                    </div>

                    <div className="min-w-0">
                      <h2
                        className="font-serif text-base sm:text-lg font-bold text-stone-900 truncate"
                        title={book.title}
                      >
                        {book.title}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${getLevelBadgeStyle(
                            book.level || ""
                          )}`}
                        >
                          {book.level || "ANY"}
                        </span>
                        {isReadingThisBook && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-emerald-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Читаю
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {isReadingThisBook ? (
                      <>
                        <a
                          href={book.external_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hidden sm:inline-flex px-3 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                        >
                          Открыть ↗
                        </a>
                        <button
                          type="button"
                          onClick={handleFinishReading}
                          disabled={isFinishing}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white transition-colors disabled:bg-stone-400"
                        >
                          {isFinishing ? "..." : "Завершить ✓"}
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => void handleReadBook(book)}
                        disabled={isStartingThisBook}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-stone-900 hover:bg-indigo-700 text-[#f6f3ec] transition-colors disabled:bg-stone-400"
                      >
                        {isStartingThisBook ? "..." : "Читать →"}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
