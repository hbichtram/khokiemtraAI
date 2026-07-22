import React, { useState, useEffect } from "react";
import { User } from "./types";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { 
  Sparkles, GraduationCap, Users, Mail, Key, 
  ArrowRight, AlertCircle, RefreshCw, Smile 
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginRole, setLoginRole] = useState<"teacher" | "student">("teacher");
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [studentCode, setStudentCode] = useState("");
  
  const [appLoading, setAppLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user session exists in localStorage
    const savedUser = localStorage.getItem("ai_smart_test_user");
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        console.error("Stale user session found:", e);
        localStorage.removeItem("ai_smart_test_user");
      }
    }
    setAppLoading(false);
  }, []);

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập Email.");
      return;
    }

    setLoginLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/teacher-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Không thể đăng nhập.");
      }

      const userData = await res.json();
      setUser(userData);
      localStorage.setItem("ai_smart_test_user", JSON.stringify(userData));
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi kết nối tới máy chủ.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentCode.trim()) {
      setError("Vui lòng nhập Mã học sinh.");
      return;
    }

    setLoginLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/student-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentCode: studentCode.trim() })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Đăng nhập thất bại.");
      }

      const userData = await res.json();
      setUser(userData);
      localStorage.setItem("ai_smart_test_user", JSON.stringify(userData));
    } catch (err: any) {
      setError(err.message || "Mã học sinh không đúng hoặc lỗi mạng.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("ai_smart_test_user");
    setEmail("");
    setStudentCode("");
    setError(null);
  };

  if (appLoading) {
    return (
      <div id="app-loading-container" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <h2 className="font-extrabold text-slate-700 text-lg">Đang khởi động AI SMART TEST...</h2>
        <p className="text-slate-400 text-xs mt-1">Đợi một chút để đồng bộ hệ thống đề thông minh nhé!</p>
      </div>
    );
  }

  // Route to designated dashboard if logged in
  if (user) {
    if (user.role === "teacher") {
      return <TeacherDashboard user={user} onLogout={handleLogout} />;
    } else {
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <div id="login-portal-root" className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden transition-all duration-300">
        
        {/* Colorful top accent border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-amber-400" />

        {/* LOGO & BRANDING */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-indigo-950">AI SMART TEST</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Học tập thông minh • Tiến bộ mỗi ngày
            </p>
          </div>
        </div>

        {/* ROLE SELECTOR TOGGLE */}
        <div className="bg-slate-100 border border-slate-200/50 p-1.5 rounded-2xl flex text-sm font-bold">
          <button
            id="toggle-login-teacher"
            onClick={() => { setLoginRole("teacher"); setError(null); }}
            className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "teacher"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            Giáo viên
          </button>
          <button
            id="toggle-login-student"
            onClick={() => { setLoginRole("student"); setError(null); }}
            className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "student"
                ? "bg-white text-amber-600 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smile className="w-4 h-4 shrink-0" />
            Học sinh
          </button>
        </div>

        {/* ERROR DISPLAYER */}
        {error && (
          <div className="bg-red-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-rose-800 font-bold text-xs leading-relaxed">{error}</span>
          </div>
        )}

        {/* LOGIN FORM - TEACHER */}
        {loginRole === "teacher" ? (
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ Email của thầy/cô</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tram.ai.ctst@gmail.com"
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Nhập mật khẩu (Bất kỳ để thử)"
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              id="btn-login-teacher"
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Vào khu vực quản lý
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          // LOGIN FORM - STUDENT
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nhập Mã học sinh được cấp</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-4 w-4 h-4 text-slate-400" />
                <input
                  id="input-student-code"
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS5C01, HS3A01, HS4B01..."
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold text-slate-800 uppercase"
                />
              </div>
              <div className="bg-amber-50/50 p-4 rounded-2xl text-[11px] text-amber-800 font-medium border border-amber-100/50 leading-relaxed">
                💡 <strong>Gợi ý thử nghiệm:</strong> Thầy/cô có thể dùng các mã học sinh mặc định sau để kiểm tra giao diện học sinh:
                <ul className="list-disc pl-4 mt-2 font-bold space-y-1">
                  <li>Khối 5: <span className="font-mono bg-amber-100/80 text-amber-900 px-1 py-0.5 rounded text-xs select-all">HS5C01</span> hoặc <span className="font-mono bg-amber-100/80 text-amber-900 px-1 py-0.5 rounded text-xs select-all">HS5C02</span></li>
                  <li>Khối 4: <span className="font-mono bg-amber-100/80 text-amber-900 px-1 py-0.5 rounded text-xs select-all">HS4B01</span></li>
                  <li>Khối 3: <span className="font-mono bg-amber-100/80 text-amber-900 px-1 py-0.5 rounded text-xs select-all">HS3A01</span></li>
                </ul>
              </div>
            </div>

            <button
              id="btn-login-student"
              type="submit"
              disabled={loginLoading}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-slate-900 font-black py-4 px-4 rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-100/50 active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Bắt đầu học và làm bài
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <footer className="text-center mt-8 text-slate-400 text-[10px] font-semibold uppercase tracking-widest">
        © 2026 AI SMART TEST • Hỗ trợ học tập thông minh
      </footer>
    </div>
  );
}

