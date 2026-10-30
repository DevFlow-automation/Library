"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [name, setName] = useState("");
  const [className, setClassName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim() || !className) {
      alert("Пожалуйста, введите имя и выберите класс");
      return;
    }

    setLoading(true);

    try {
      // 1. Проверяем, есть ли уже такой ученик в базе
      let { data: profile, error: searchError } = await supabase
        .from("profiles")
        .select("id, full_name, class_name")
        .eq("full_name", name.trim())
        .eq("class_name", className)
        .single();

      // 2. Если нет, создаем новый профиль
      if (!profile) {
        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert([{ full_name: name.trim(), class_name: className }])
          .select()
          .single();

        if (insertError) throw insertError;
        profile = newProfile;
      }

      // 3. Сохраняем данные в браузер и пускаем в библиотеку
      if (profile) {
        localStorage.setItem("student_id", profile.id);
        localStorage.setItem("student_name", profile.full_name);
        router.push("/books");
      }
    } catch (error: any) {
      console.error("Ошибка при входе:", error.message);
      alert("Ошибка при входе. Попробуйте еще раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 selection:bg-indigo-100">
      <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl shadow-2xl shadow-indigo-100 border border-gray-100 relative overflow-hidden">
        
        {/* Декоративный фон */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
        
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">MRJ Library</h1>
          <p className="text-sm text-gray-500 mt-2 font-mono uppercase tracking-widest">Вход для учеников</p>
        </div>

        <form onSubmit={handleLogin} className="flex flex-col gap-6">
          
          {/* Поле ФИО */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
              Фамилия и Имя
            </label>
            <input 
              type="text" 
              placeholder="Например: Туйчиев Иззатилло"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 bg-gray-50/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-gray-400 font-medium text-gray-900"
              required
            />
          </div>

          {/* Выпадающий список классов */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">
              Класс
            </label>
            <select 
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className={`w-full border border-gray-200 bg-gray-50/50 rounded-2xl p-4 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer font-medium ${className ? 'text-gray-900' : 'text-gray-400'}`}
              required
            >
              <option value="" disabled>Выберите свой класс...</option>
              
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
          </div>

          <button 
            type="submit"
            disabled={loading}
            className={`mt-4 w-full py-4 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all duration-300 ${
              loading 
                ? 'bg-indigo-400 text-white cursor-not-allowed' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-xl hover:shadow-indigo-200 active:scale-[0.98]'
            }`}
          >
            {loading ? 'Загрузка...' : 'Войти в библиотеку'}
          </button>
        </form>

      </div>
    </main>
  );
}
