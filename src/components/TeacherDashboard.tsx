import React, { useState, useEffect } from "react";
import { User, TeacherStats } from "../types";
import ClassManager from "./ClassManager";
import ExamCreator from "./ExamCreator";
import ExamBank from "./ExamBank";
import TeacherReportScreen from "./TeacherReportScreen";
import { 
  BarChart, Users, BookOpen, Clock, Activity, LogOut, 
  Sparkles, Layers, BarChart2, Plus, ArrowRight, CheckCircle2, RefreshCw 
} from "lucide-react";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function TeacherDashboard({ user, onLogout }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "ai-create" | "exams" | "reports">("overview");
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Link report helper to jump tabs
  const [selectedReportIdToView, setSelectedReportIdToView] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverviewData();
    }
  }, [activeTab]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/teacher/overview");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRecentExams(data.recentExams);
        setActiveAssignments(data.activeAssignments);
        setRecentSubmissions(data.recentSubmissions);
      }
    } catch (e) {
      console.error("Error fetching teacher overview statistics:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickViewReport = (assignmentId: string) => {
    setActiveTab("reports");
  };

  return (
    <div id="teacher-dashboard-root" className="flex flex-col md:flex-row min-h-screen bg-[#F0F4F8] text-slate-800">
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-950 text-slate-100 flex flex-col justify-between p-6 border-r border-slate-900 shrink-0">
        <div>
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 mb-8 border-b border-slate-900 pb-6">
            <div className="bg-indigo-600 p-2 rounded-2xl text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-white block">AI SMART TEST</span>
              <p className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-widest mt-0.5">Tạo đề • Giao bài</p>
            </div>
          </div>

          {/* User Info Card */}
          <div className="bg-slate-900 p-4 rounded-2xl mb-6 flex items-center gap-3 border border-slate-800/80">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-sm">
              GV
            </div>
            <div className="overflow-hidden">
              <h4 className="font-bold text-sm text-slate-100 leading-tight truncate">{user.name}</h4>
              <span className="text-[11px] text-slate-400 block truncate mt-0.5">{user.email}</span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1 text-sm font-semibold">
            <button
              onClick={() => { setActiveTab("overview"); setSelectedReportIdToView(null); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all ${
                activeTab === "overview"
                  ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <BarChart className="w-5 h-5 shrink-0" />
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab("classes")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all ${
                activeTab === "classes"
                  ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              Lớp học
            </button>
            <button
              id="tab-ai-create"
              onClick={() => setActiveTab("ai-create")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all ${
                activeTab === "ai-create"
                  ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-5 h-5 shrink-0 text-indigo-400" />
              Tạo đề AI
            </button>
            <button
              id="tab-exams"
              onClick={() => setActiveTab("exams")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all ${
                activeTab === "exams"
                  ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Layers className="w-5 h-5 shrink-0" />
              Kho đề
            </button>
            <button
              id="tab-reports"
              onClick={() => setActiveTab("reports")}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer transition-all ${
                activeTab === "reports"
                  ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <BarChart2 className="w-5 h-5 shrink-0" />
              Kết quả học tập
            </button>
          </nav>
        </div>

        {/* Sidebar Footer Logout */}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 mt-8 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all cursor-pointer text-sm font-bold border border-transparent hover:border-rose-500/15"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          Đăng xuất
        </button>
      </aside>

      {/* MAIN BODY LAYOUT */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
        {/* OVERVIEW TAB CONTENT */}
        {activeTab === "overview" && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Xin chào, thầy/cô {user.name}! 👋</h1>
                <p className="text-slate-500 font-medium mt-1">Slogan của ứng dụng: <strong className="text-indigo-600">“Học tập thông minh • Tiến bộ mỗi ngày”</strong></p>
              </div>
              <button
                onClick={fetchOverviewData}
                className="self-start md:self-auto inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 font-bold rounded-2xl text-xs shadow-sm hover:shadow transition-all cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Làm mới số liệu
              </button>
            </div>

            {loading && !stats ? (
              <div className="py-20 text-center text-slate-500 flex flex-col items-center gap-3 bg-white rounded-3xl border border-slate-100 shadow-sm">
                <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
                <span className="font-bold text-sm">Đang tải thông số tổng quan mới nhất...</span>
              </div>
            ) : (
              <>
                {/* Stats cards strip */}
                {stats && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200/50 transition-all shadow-vibrant-indigo">
                      <div className="bg-indigo-50 p-3.5 rounded-2xl text-indigo-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Tổng số lớp</span>
                        <strong className="text-slate-900 text-2xl font-black block mt-0.5">{stats.totalClasses}</strong>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200/50 transition-all shadow-vibrant-blue">
                      <div className="bg-blue-50 p-3.5 rounded-2xl text-blue-600">
                        <Users className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Tổng học sinh</span>
                        <strong className="text-slate-900 text-2xl font-black block mt-0.5">{stats.totalStudents}</strong>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200/50 transition-all shadow-vibrant-emerald">
                      <div className="bg-emerald-50 p-3.5 rounded-2xl text-emerald-600">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Đề thi đã lưu</span>
                        <strong className="text-slate-900 text-2xl font-black block mt-0.5">{stats.totalExams}</strong>
                      </div>
                    </div>
                    <div className="bg-white border border-slate-100 p-6 rounded-[24px] shadow-sm flex items-center gap-4 hover:shadow-md hover:border-slate-200/50 transition-all shadow-vibrant-amber">
                      <div className="bg-amber-50 p-3.5 rounded-2xl text-amber-600">
                        <Activity className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Giao bài đang chạy</span>
                        <strong className="text-amber-600 text-2xl font-black block mt-0.5">{stats.activeAssignments}</strong>
                      </div>
                    </div>
                  </div>
                )}

                {/* Main activities panels split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Column: Active Tests */}
                  <div className="lg:col-span-2 space-y-8">
                    {/* Active Assignments List */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                          Đang diễn ra trực tiếp
                        </h3>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg">LIVE</span>
                      </div>

                      {activeAssignments.length === 0 ? (
                        <div className="text-center py-10 text-slate-400 text-xs font-semibold space-y-3">
                          <p>Hiện không có bài thi nào đang được giao hoạt động trực tiếp.</p>
                          <button
                            onClick={() => setActiveTab("exams")}
                            className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                          >
                            Giao đề kiểm tra mới ngay &rarr;
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {activeAssignments.map((asg) => (
                            <div
                              key={asg.id}
                              className="border border-slate-100 hover:border-indigo-100 p-4 rounded-2xl flex items-center justify-between gap-4 transition-all hover:bg-indigo-50/20 text-xs"
                            >
                              <div className="space-y-1 overflow-hidden">
                                <h4 className="font-black text-slate-800 text-sm truncate">{asg.examTitle}</h4>
                                <div className="text-slate-500 space-y-0.5 font-medium">
                                  <p>Lớp giao: <strong className="text-slate-800 font-bold">{asg.className}</strong></p>
                                  <p>Sĩ số: <strong className="text-slate-800 font-bold">{asg.totalStudents} em</strong> | Đã nộp: <strong className="text-indigo-600 font-bold">{asg.submissionCount} bài</strong></p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleQuickViewReport(asg.id)}
                                className="bg-indigo-50 hover:bg-indigo-600 border border-indigo-100 hover:border-indigo-600 px-4 py-2 rounded-xl text-indigo-700 hover:text-white font-extrabold transition-all cursor-pointer shrink-0"
                              >
                                Xem điểm
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Recent saved exams */}
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-500" />
                          Đề thi biên soạn gần đây
                        </h3>
                        <button
                          onClick={() => setActiveTab("exams")}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer"
                        >
                          Xem tất cả &rarr;
                        </button>
                      </div>

                      {recentExams.length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-xs font-semibold">
                          Chưa có đề thi nào được tạo.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                          {recentExams.map((exam) => (
                            <div key={exam.id} className="border border-slate-100 hover:border-slate-200 p-4 rounded-2xl space-y-2 hover:bg-slate-50/30 transition-all">
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-lg text-[10px] inline-block">
                                {exam.grade}
                              </span>
                              <h4 className="font-black text-slate-800 text-xs truncate mt-1">{exam.title}</h4>
                              <p className="text-slate-500 font-medium">Chủ đề: {exam.topic}</p>
                              <p className="text-slate-500 font-medium">Số câu: <strong className="text-slate-700 font-bold">{exam.questions?.length || 0} câu</strong> | Thời gian: <strong className="text-slate-700 font-bold">{exam.duration}p</strong></p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Recent Submissions */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        Học sinh nộp bài mới nhất
                      </h3>
                    </div>

                    {recentSubmissions.length === 0 ? (
                      <div className="text-center py-16 text-slate-400 text-xs font-semibold">
                        Chưa nhận được bài nộp nào từ học sinh.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recentSubmissions.map((sub) => (
                          <div key={sub.id} className="border-b border-slate-50 pb-4 last:border-0 last:pb-0 text-xs flex justify-between gap-3 items-start">
                            <div className="space-y-1 overflow-hidden">
                              <strong className="text-slate-950 font-black block truncate">{sub.studentName}</strong>
                              <span className="text-slate-500 font-bold block">{sub.className}</span>
                              <span className="text-[10px] text-slate-400 block truncate">{sub.examTitle}</span>
                              <span className="text-[10px] text-slate-400 block font-mono">{new Date(sub.submittedAt).toLocaleTimeString("vi-VN")}</span>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`font-black text-xs px-2.5 py-1.5 rounded-xl inline-block ${
                                sub.score >= 8
                                  ? "text-emerald-700 bg-emerald-50 border border-emerald-100"
                                  : sub.score >= 5
                                  ? "text-indigo-700 bg-indigo-50 border border-indigo-100"
                                  : "text-rose-700 bg-rose-50 border border-rose-100"
                              }`}>
                                {sub.score} điểm
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* WORKER COMPONENTS BINDINGS */}
        {activeTab === "classes" && <ClassManager />}
        {activeTab === "ai-create" && <ExamCreator onExamSaved={() => setActiveTab("exams")} />}
        {activeTab === "exams" && <ExamBank onAssignCreated={() => setActiveTab("reports")} />}
        {activeTab === "reports" && <TeacherReportScreen teacherId={user.id} />}
      </main>
    </div>
  );
}
