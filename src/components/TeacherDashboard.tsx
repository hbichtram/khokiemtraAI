import React, { useState, useEffect } from "react";
import { User, TeacherStats } from "../types";
import ClassManager from "./ClassManager";
import ExamCreator from "./ExamCreator";
import ExamBank from "./ExamBank";
import TeacherReportScreen from "./TeacherReportScreen";
import GameManager from "./GameManager";
import TeacherSettingsModal from "./TeacherSettingsModal";
import Footer from "./Footer";
import { 
  BarChart, Users, BookOpen, Clock, Activity, LogOut, 
  Sparkles, Layers, BarChart2, ArrowRight, CheckCircle2, RefreshCw,
  User as UserIcon, Lock, Settings, ChevronDown, Gamepad2,
  PanelLeftClose, PanelLeftOpen, ClipboardList, Menu, X,
  GraduationCap, AlertCircle, Calendar, FileText
} from "lucide-react";

import { fsGetTeacherOverview } from "../lib/firestoreData";

interface TeacherDashboardProps {
  user: User;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
}

export default function TeacherDashboard({ user, onLogout, onUpdateUser }: TeacherDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "ai-create" | "exams" | "reports" | "games-manager">("overview");
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [recentExams, setRecentExams] = useState<any[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Sidebar collapse state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem("teacher_sidebar_collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Mobile drawer state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsModalTab, setSettingsModalTab] = useState<"profile" | "security" | "settings">("profile");
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);

  useEffect(() => {
    if (activeTab === "overview") {
      fetchOverviewData();
    }
  }, [activeTab]);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem("teacher_sidebar_collapsed", String(next));
      } catch (e) {
        console.warn("Could not save sidebar collapsed state:", e);
      }
      return next;
    });
  };

  const fetchOverviewData = async () => {
    setLoading(true);
    setFetchError(null);
    try {
      let dataLoaded = false;
      try {
        const res = await fetch("/api/teacher/overview");
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          setStats(data.stats);
          setRecentExams(data.recentExams || []);
          setActiveAssignments(data.activeAssignments || []);
          setRecentSubmissions(data.recentSubmissions || []);
          dataLoaded = true;
        }
      } catch (err) {
        console.warn("API overview fetch failed, falling back to Firestore:", err);
      }

      if (!dataLoaded) {
        const fsData = await fsGetTeacherOverview();
        setStats(fsData.stats);
        setRecentExams(fsData.recentExams || []);
        setActiveAssignments(fsData.activeAssignments || []);
        setRecentSubmissions(fsData.recentSubmissions || []);
      }
    } catch (e: any) {
      console.error("Error fetching teacher overview statistics:", e);
      setFetchError("Không thể tải dữ liệu tổng quan. Vui lòng kiểm tra lại kết nối.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickViewReport = (assignmentId?: string) => {
    setActiveTab("reports");
  };

  // Helper to render score vs ungraded status
  const renderSubmissionScore = (sub: any) => {
    const isUngraded = sub.status === "in_progress" || 
                       sub.graded === false || 
                       sub.score === undefined || 
                       sub.score === null;

    if (isUngraded) {
      return (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/70 shrink-0">
          Chưa chấm
        </span>
      );
    }

    const numScore = Number(sub.score);
    if (isNaN(numScore) || numScore === 0) {
      return (
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200/70 shrink-0">
          0 điểm
        </span>
      );
    }

    const formattedScore = numScore.toLocaleString("vi-VN", { maximumFractionDigits: 1 });

    return (
      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg shrink-0 border ${
        numScore >= 8
          ? "bg-emerald-50 text-emerald-700 border-emerald-200/80"
          : numScore >= 5
          ? "bg-indigo-50 text-indigo-700 border-indigo-200/80"
          : "bg-rose-50 text-rose-700 border-rose-200/80"
      }`}>
        {formattedScore} điểm
      </span>
    );
  };

  const navGroups = [
    {
      label: "QUẢN LÝ",
      items: [
        { id: "overview", label: "Tổng quan", icon: BarChart },
        { id: "classes", label: "Lớp học", icon: Users },
      ]
    },
    {
      label: "KIỂM TRA",
      items: [
        { id: "ai-create", label: "Tạo đề AI", icon: Sparkles, badge: "AI" },
        { id: "exams", label: "Kho đề", icon: BookOpen },
      ]
    },
    {
      label: "PHÂN TÍCH",
      items: [
        { id: "reports", label: "Kết quả học tập", icon: BarChart2 },
      ]
    },
    {
      label: "HỌC TẬP",
      items: [
        { id: "games-manager", label: "Trò chơi học tập", icon: Gamepad2 },
      ]
    }
  ];

  return (
    <div id="teacher-dashboard-root" className="flex min-h-screen bg-[#F3F6F9] text-slate-800">
      
      {/* MOBILE DRAWER BACKDROP */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/60 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION */}
      <aside 
        className={`fixed md:sticky top-0 h-screen z-40 bg-[#0B1120] text-slate-200 flex flex-col justify-between border-r border-slate-800/80 shrink-0 transition-all duration-200 ease-in-out ${
          isSidebarCollapsed ? "w-[76px]" : "w-[270px]"
        } ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full overflow-y-auto no-scrollbar p-3.5 sm:p-4">
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="bg-gradient-to-tr from-indigo-600 to-indigo-500 p-2 rounded-xl text-white shadow-md shadow-indigo-600/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <span className="font-black text-sm tracking-tight text-white block truncate leading-tight">
                    HỌC VUI – CHƠI HAY
                  </span>
                  <span className="text-[9px] text-indigo-400 font-extrabold uppercase tracking-wider block mt-0.5">
                    TẠO ĐỀ • GIAO BÀI
                  </span>
                </div>
              )}
            </div>

            {/* Collapse button (Desktop) */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              title={isSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
              aria-label="Thu gọn sidebar"
            >
              {isSidebarCollapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
            </button>

            {/* Close button (Mobile) */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80"
              aria-label="Đóng menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Teacher Profile Card in Sidebar */}
          <div className="mb-4">
            <button
              id="btn-sidebar-teacher-profile"
              type="button"
              onClick={() => { setSettingsModalTab("profile"); setIsSettingsOpen(true); }}
              className={`w-full text-left bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800/90 rounded-xl transition-all cursor-pointer group ${
                isSidebarCollapsed ? "p-2 flex justify-center" : "p-2.5 flex items-center justify-between gap-2.5"
              }`}
              title={isSidebarCollapsed ? `${user.name || "Giáo viên"} (${user.email})` : undefined}
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0 overflow-hidden">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.name || "Giáo viên"} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{user.name ? user.name.charAt(0).toUpperCase() : "G"}</span>
                  )}
                </div>
                {!isSidebarCollapsed && (
                  <div className="overflow-hidden">
                    <h4 className="font-bold text-xs text-slate-200 leading-tight truncate group-hover:text-indigo-300 transition-colors">
                      {user.name || "Giáo viên"}
                    </h4>
                    <span className="text-[10px] text-slate-400 block truncate mt-0.5">
                      {user.email || "tram.ai.ctst@gmail.com"}
                    </span>
                  </div>
                )}
              </div>
              {!isSidebarCollapsed && (
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 shrink-0" />
              )}
            </button>
          </div>

          {/* Navigation Groups */}
          <nav className="space-y-4 flex-1 text-xs">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                {!isSidebarCollapsed ? (
                  <div className="px-2.5 text-[10px] font-extrabold text-slate-400/80 uppercase tracking-wider mb-1">
                    {group.label}
                  </div>
                ) : (
                  <div className="h-px bg-slate-800/80 my-2 mx-1" />
                )}

                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`tab-${item.id}`}
                      type="button"
                      onClick={() => {
                        setActiveTab(item.id as any);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2 text-left"
                      } ${
                        isActive
                          ? "bg-indigo-600 text-white font-bold shadow-xs shadow-indigo-500/20"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-850"
                      }`}
                      title={isSidebarCollapsed ? item.label : undefined}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-white" : "text-slate-400"}`} />
                      {!isSidebarCollapsed && (
                        <span className="truncate flex-1 font-semibold">{item.label}</span>
                      )}
                      {!isSidebarCollapsed && (item as any).badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-indigo-400/20 text-indigo-300">
                          {(item as any).badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Sidebar Footer Logout */}
          <div className="pt-3 border-t border-slate-800/80 mt-2">
            <button
              type="button"
              onClick={onLogout}
              className={`w-full flex items-center gap-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer text-xs font-bold ${
                isSidebarCollapsed ? "justify-center p-2.5" : "px-3 py-2"
              }`}
              title={isSidebarCollapsed ? "Đăng xuất" : undefined}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Đăng xuất</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN BODY WRAPPER */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* COMPACT TOP APP BAR */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-slate-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 min-w-0">
              <div className="hidden sm:flex bg-indigo-50 p-1.5 rounded-lg text-indigo-600 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate leading-tight">
                  Khu vực quản lý giáo viên
                </h2>
                <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
                  Hệ thống tạo đề & kiểm tra thông minh HỌC VUI – CHƠI HAY
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Refresh Button */}
            <button
              type="button"
              onClick={fetchOverviewData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-slate-700 font-bold rounded-lg text-xs transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
              title="Cập nhật dữ liệu mới nhất"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-600 ${loading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline text-[11px]">Làm mới</span>
            </button>

            {/* Teacher Dropdown Trigger */}
            <div className="relative">
              <button
                id="btn-teacher-account-menu"
                type="button"
                onClick={() => setIsAccountMenuOpen(!isAccountMenuOpen)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 p-1 sm:pr-2.5 rounded-lg transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <div className="w-7 h-7 rounded-md bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs overflow-hidden shrink-0">
                  {user.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt={user.name || "Giáo viên"} 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span>{user.name ? user.name.charAt(0).toUpperCase() : "G"}</span>
                  )}
                </div>
                <div className="text-left hidden md:block max-w-[130px] overflow-hidden">
                  <span className="font-extrabold text-[11px] text-slate-800 block truncate leading-tight">
                    {user.name || "Giáo viên"}
                  </span>
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isAccountMenuOpen ? "rotate-180" : ""}`} />
              </button>

              {/* Account Dropdown */}
              {isAccountMenuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setIsAccountMenuOpen(false)} />
                  <div className="absolute right-0 mt-1.5 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-xl z-30 p-1.5 animate-in fade-in duration-150 space-y-1">
                    <div className="p-2.5 border-b border-slate-100 bg-slate-50/90 rounded-xl mb-1 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
                        {user.photoURL ? (
                          <img src={user.photoURL} alt={user.name || "Giáo viên"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <span>{user.name ? user.name.charAt(0).toUpperCase() : "G"}</span>
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <strong className="font-black text-xs text-slate-800 block truncate">{user.name || "Giáo viên"}</strong>
                        <span className="text-[10px] text-slate-500 block truncate">{user.email}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => { setIsAccountMenuOpen(false); setSettingsModalTab("profile"); setIsSettingsOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer text-left"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Thông tin giáo viên
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsAccountMenuOpen(false); setSettingsModalTab("security"); setIsSettingsOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer text-left"
                    >
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Bảo mật tài khoản
                    </button>

                    <button
                      type="button"
                      onClick={() => { setIsAccountMenuOpen(false); setSettingsModalTab("settings"); setIsSettingsOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors cursor-pointer text-left"
                    >
                      <Settings className="w-3.5 h-3.5 text-indigo-600" />
                      Cài đặt ứng dụng
                    </button>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => { setIsAccountMenuOpen(false); onLogout(); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-3.5 h-3.5 text-rose-600" />
                        Đăng xuất
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* MAIN BODY CONTENT AREA */}
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto w-full">
          
          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="space-y-4 sm:space-y-5 animate-in fade-in duration-200">
              
              {/* COMPACT GREETING ROW */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    Xin chào, {user.name || "Giáo viên"}! 👋
                  </h1>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    <span className="text-indigo-600 font-bold">“Học tập thông minh • Tiến bộ mỗi ngày”</span>
                  </p>
                </div>
              </div>

              {/* ERROR STATE BANNER */}
              {fetchError && (
                <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl flex items-center justify-between gap-3 text-rose-900 text-xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{fetchError}</span>
                  </div>
                  <button
                    type="button"
                    onClick={fetchOverviewData}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[11px] shrink-0 cursor-pointer"
                  >
                    ↻ Thử lại
                  </button>
                </div>
              )}

              {/* 4 STATISTIC CARDS (COMPACT HEIGHT 110-130px) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* 1. Tổng số lớp */}
                <div className="bg-white border border-slate-200/70 p-3.5 sm:p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                      Tổng số lớp
                    </span>
                    {loading && !stats ? (
                      <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <strong className="text-slate-900 text-2xl sm:text-3xl font-black block leading-tight">
                        {stats?.totalClasses ?? 0}
                      </strong>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                </div>

                {/* 2. Tổng học sinh */}
                <div className="bg-white border border-slate-200/70 p-3.5 sm:p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                      Tổng học sinh
                    </span>
                    {loading && !stats ? (
                      <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <strong className="text-slate-900 text-2xl sm:text-3xl font-black block leading-tight">
                        {stats?.totalStudents ?? 0}
                      </strong>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                </div>

                {/* 3. Đề thi đã lưu */}
                <div className="bg-white border border-slate-200/70 p-3.5 sm:p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                      Đề thi đã lưu
                    </span>
                    {loading && !stats ? (
                      <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <strong className="text-slate-900 text-2xl sm:text-3xl font-black block leading-tight">
                        {stats?.totalExams ?? 0}
                      </strong>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>

                {/* 4. Giao bài đang chạy */}
                <div className="bg-white border border-slate-200/70 p-3.5 sm:p-4 rounded-2xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <span className="text-slate-400 text-[10.5px] font-bold uppercase tracking-wider block">
                      Giao bài đang chạy
                    </span>
                    {loading && !stats ? (
                      <div className="h-7 w-12 bg-slate-100 animate-pulse rounded-md mt-1" />
                    ) : (
                      <strong className="text-amber-600 text-2xl sm:text-3xl font-black block leading-tight">
                        {stats?.activeAssignments ?? 0}
                      </strong>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Activity className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* MAIN ACTIVITIES PANELS (65% : 35% SPLIT) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start">
                
                {/* LEFT COLUMN: ACTIVE ASSIGNMENTS & RECENT EXAMS (60-65%) */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-4">
                  
                  {/* BÀI KIỂM TRA ĐANG HOẠT ĐỘNG */}
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                          Bài kiểm tra đang hoạt động
                        </h3>
                      </div>
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/70 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md">
                        LIVE
                      </span>
                    </div>

                    {loading && activeAssignments.length === 0 ? (
                      <div className="py-8 space-y-2.5">
                        <div className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                        <div className="h-14 bg-slate-50 animate-pulse rounded-xl" />
                      </div>
                    ) : activeAssignments.length === 0 ? (
                      /* COMPACT EMPTY STATE */
                      <div className="text-center py-6 sm:py-8 px-4 flex flex-col items-center justify-center text-slate-500">
                        <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                          <ClipboardList className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                          Chưa có bài kiểm tra đang hoạt động
                        </h4>
                        <p className="text-[11px] text-slate-400 max-w-xs mt-0.5 leading-relaxed">
                          Các bài kiểm tra đang được giao cho học sinh sẽ xuất hiện tại đây.
                        </p>
                        <button
                          type="button"
                          onClick={() => setActiveTab("exams")}
                          className="mt-3.5 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-indigo-200/60"
                        >
                          <span>Giao bài kiểm tra</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activeAssignments.map((asg) => (
                          <div
                            key={asg.id}
                            className="border border-slate-200/70 hover:border-indigo-200 p-3 sm:p-3.5 rounded-xl flex items-center justify-between gap-3 transition-all hover:bg-indigo-50/20 text-xs"
                          >
                            <div className="space-y-0.5 overflow-hidden">
                              <h4 className="font-extrabold text-slate-800 text-xs sm:text-sm truncate">
                                {asg.examTitle}
                              </h4>
                              <div className="text-slate-500 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
                                <span>Lớp: <strong className="text-slate-700 font-bold">{asg.className}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span>Sĩ số: <strong className="text-slate-700 font-bold">{asg.totalStudents || 0}</strong></span>
                                <span className="text-slate-300">•</span>
                                <span>Đã nộp: <strong className="text-indigo-600 font-bold">{asg.submissionCount || 0} bài</strong></span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleQuickViewReport(asg.id)}
                              className="bg-indigo-50 hover:bg-indigo-600 border border-indigo-200/80 hover:border-indigo-600 px-3 py-1.5 rounded-lg text-indigo-700 hover:text-white font-bold transition-colors cursor-pointer shrink-0 text-xs"
                            >
                              Xem điểm
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ĐỀ THI BIÊN SOẠN GẦN ĐÂY */}
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex justify-between items-center pb-3 border-b border-slate-100 mb-3.5">
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0" />
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                          Đề thi biên soạn gần đây
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab("exams")}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Xem tất cả</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    {recentExams.length === 0 ? (
                      <div className="text-center py-5 text-slate-400 text-xs font-semibold">
                        Chưa có đề thi nào trong kho đề.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                        {recentExams.slice(0, 4).map((exam) => (
                          <div 
                            key={exam.id} 
                            className="border border-slate-200/60 hover:border-indigo-200 p-3 rounded-xl space-y-1 hover:bg-slate-50/50 transition-all"
                          >
                            <div className="flex items-center justify-between gap-1">
                              <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">
                                {exam.grade || "Tin học"}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium">
                                {exam.duration || 15} phút
                              </span>
                            </div>
                            <h4 className="font-bold text-slate-800 text-xs truncate leading-snug">
                              {exam.title}
                            </h4>
                            <p className="text-[11px] text-slate-400 truncate">
                              Chủ đề: {exam.topic || "Kiểm tra"}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: RECENT SUBMISSIONS (35-40%) */}
                <div className="lg:col-span-5 xl:col-span-4 space-y-4">
                  <div className="bg-white border border-slate-200/70 rounded-2xl p-4 sm:p-5 shadow-2xs">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm uppercase tracking-wider">
                          Học sinh nộp bài mới nhất
                        </h3>
                      </div>
                      {recentSubmissions.length > 0 && (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {recentSubmissions.length} bài
                        </span>
                      )}
                    </div>

                    {loading && recentSubmissions.length === 0 ? (
                      <div className="py-6 space-y-3">
                        <div className="h-10 bg-slate-50 animate-pulse rounded-lg" />
                        <div className="h-10 bg-slate-50 animate-pulse rounded-lg" />
                        <div className="h-10 bg-slate-50 animate-pulse rounded-lg" />
                      </div>
                    ) : recentSubmissions.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 text-xs font-semibold space-y-1">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                          <FileText className="w-4 h-4" />
                        </div>
                        <p>Chưa có bài nộp nào từ học sinh.</p>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[440px] overflow-y-auto no-scrollbar pr-0.5">
                        {recentSubmissions.map((sub) => (
                          <div 
                            key={sub.id} 
                            className="p-2.5 rounded-xl border border-slate-100 hover:border-slate-200/80 bg-slate-50/50 hover:bg-white text-xs flex justify-between gap-2.5 items-start transition-all"
                          >
                            <div className="space-y-0.5 overflow-hidden min-w-0 flex-1">
                              <strong className="text-slate-900 font-bold block truncate leading-tight">
                                {sub.studentName}
                              </strong>
                              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                                <span className="font-semibold text-slate-600">{sub.className}</span>
                                <span className="text-slate-300">•</span>
                                <span className="truncate">{sub.examTitle}</span>
                              </div>
                              <span className="text-[10px] text-slate-400 block font-mono">
                                {sub.submittedAt ? new Date(sub.submittedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "Vừa xong"}
                              </span>
                            </div>
                            
                            {/* SCORE OR UNGRADED BADGE */}
                            {renderSubmissionScore(sub)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* WORKER COMPONENTS BINDINGS */}
          {activeTab === "classes" && <ClassManager />}
          {activeTab === "ai-create" && <ExamCreator onExamSaved={() => setActiveTab("exams")} />}
          {activeTab === "exams" && <ExamBank onAssignCreated={() => setActiveTab("reports")} />}
          {activeTab === "reports" && <TeacherReportScreen teacherId={user.id} />}
          {activeTab === "games-manager" && <GameManager user={user} />}

          <Footer className="mt-8 pt-4 border-t border-slate-200/60" />
        </main>
      </div>

      {/* TEACHER ACCOUNT SETTINGS MODAL */}
      <TeacherSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsModalTab}
        user={user}
        onUpdateUser={onUpdateUser}
        onLogout={onLogout}
      />
    </div>
  );
}

