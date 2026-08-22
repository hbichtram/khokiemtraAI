import React, { useState, useEffect } from "react";
import { User } from "../types";
import StudentExamScreen from "./StudentExamScreen";
import StudentReviewScreen from "./StudentReviewScreen";
import StudentGamesScreen from "./StudentGamesScreen";
import Footer from "./Footer";
import { 
  Award, Play, Eye, LogOut, BookOpen, Clock, Calendar, 
  HelpCircle, RefreshCw, AlertCircle, Smile, GraduationCap,
  Trophy, Star, Gamepad2, CheckCircle2, XCircle, AlertTriangle, Sparkles
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import { computeClassLeaderboard, LeaderboardItem } from "../lib/leaderboard";
import { sortAndProcessAssignments, formatRemainingTime, ProcessedAssignment } from "../lib/assignmentUtils";
import StudentHero from "./StudentHero";
import { getStudentBannerConfig, DEFAULT_BANNER_CONFIG } from "../lib/bannerStorage";
import { StudentBannerConfig } from "../types";

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [bannerConfig, setBannerConfig] = useState<StudentBannerConfig>(DEFAULT_BANNER_CONFIG);
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [allSortedAssignments, setAllSortedAssignments] = useState<ProcessedAssignment[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view states: "dashboard" | "exam" | "review"
  const [viewState, setViewState] = useState<"dashboard" | "exam" | "review">("dashboard");
  const [studentTab, setStudentTab] = useState<"tests" | "games">("tests");
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

  // Exam category tab state: "pending" (Chưa làm) | "completed" (Đã hoàn thành) | "overdue" (Quá hạn)
  const [examCategoryTab, setExamCategoryTab] = useState<"pending" | "completed" | "overdue">("pending");

  const pendingAssignments = allSortedAssignments.filter(
    (a) => a.computedStatus === "ongoing" || a.computedStatus === "upcoming"
  );
  const completedAssignmentsList = allSortedAssignments.filter(
    (a) => a.computedStatus === "completed"
  );
  const overdueAssignments = allSortedAssignments.filter(
    (a) => a.computedStatus === "expired"
  );

  // Helper navigate function that changes URL and triggers state update
  const navigate = (path: string) => {
    window.history.pushState(null, "", path);
    window.dispatchEvent(new Event("popstate"));
  };

  useEffect(() => {
    const handleUrlChange = () => {
      const path = window.location.pathname;
      if (path.startsWith("/student/exam/")) {
        const id = path.substring("/student/exam/".length);
        if (id) {
          setActiveAssignmentId(id);
          setViewState("exam");
        }
      } else if (path.startsWith("/student/review/")) {
        const id = path.substring("/student/review/".length);
        if (id) {
          setActiveSubmissionId(id);
          setViewState("review");
        }
      } else {
        setViewState("dashboard");
      }
    };

    handleUrlChange();
    window.addEventListener("popstate", handleUrlChange);
    return () => {
      window.removeEventListener("popstate", handleUrlChange);
    };
  }, []);

  useEffect(() => {
    if (viewState === "dashboard") {
      fetchDashboardData();
      getStudentBannerConfig().then((cfg) => {
        if (cfg) setBannerConfig(cfg);
      });
    }
  }, [viewState]);

  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return "Vừa xong";
    try {
      let d: Date;
      if (typeof dateVal === "object" && dateVal !== null) {
        if (typeof dateVal.toDate === "function") {
          d = dateVal.toDate();
        } else if (typeof dateVal.seconds === "number") {
          d = new Date(dateVal.seconds * 1000);
        } else {
          d = new Date(dateVal);
        }
      } else if (typeof dateVal === "number") {
        d = new Date(dateVal);
      } else {
        d = new Date(String(dateVal));
      }

      if (isNaN(d.getTime())) return "Vừa xong";

      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch (e) {
      return "Vừa xong";
    }
  };

  const fetchDashboardFromFirestore = async () => {
    const snap = await getDoc(doc(firestoreDb, "appData", "main"));
    if (!snap.exists()) {
      throw new Error("Chưa có dữ liệu hệ thống.");
    }
    const appData = snap.data();
    const classes = appData.classes || [];
    const assignments = appData.assignments || [];
    const exams = appData.exams || [];
    const submissions = appData.submissions || [];

    let cls = classes.find((c: any) => c.id === user.classId);
    if (!cls) {
      cls = classes.find((c: any) => c.students?.some((s: any) => s.id === user.id || (user.studentCode && s.studentCode === user.studentCode)));
    }

    const classId = cls?.id || user.classId;
    setClassInfo(cls || { id: classId, name: user.className || "Lớp học" });

    const classAssignments = assignments.filter((a: any) => a.classId === classId);
    const processed = sortAndProcessAssignments(classAssignments, exams, submissions, user.id, user.studentCode);

    setAllSortedAssignments(processed);
    setActiveAssignments(processed.filter((a) => a.computedStatus !== "completed"));
    setCompletedAssignments(processed.filter((a) => a.computedStatus === "completed"));

    if (cls) {
      const lb = computeClassLeaderboard(cls, assignments, submissions, user.id, user.studentCode);
      setLeaderboard(lb);
    } else {
      setLeaderboard([]);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/${user.id}/dashboard`);
      if (res.ok) {
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const data = await res.json();
          const rawAll = [...(data.activeAssignments || []), ...(data.completedAssignments || [])];
          const processed = sortAndProcessAssignments(rawAll, [], [], user.id, user.studentCode);

          setAllSortedAssignments(processed);
          setActiveAssignments(processed.filter((a) => a.computedStatus !== "completed"));
          setCompletedAssignments(processed.filter((a) => a.computedStatus === "completed"));
          setClassInfo(data.classInfo || null);
          if (data.leaderboard) {
            setLeaderboard(data.leaderboard);
          } else {
            await fetchDashboardFromFirestore();
            return;
          }
          return;
        }
      }
      await fetchDashboardFromFirestore();
    } catch (err: any) {
      try {
        await fetchDashboardFromFirestore();
      } catch (fsErr) {
        console.error("Dashboard error:", fsErr);
        setError("Không thể kết nối đến hệ thống. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (asg: any) => {
    const targetAssignmentId = asg?.assignmentId || asg?.id;
    if (!asg || !targetAssignmentId) {
      alert("Không tìm thấy bài kiểm tra được giao.");
      return;
    }
    
    console.log("[DEBUG_START_EXAM_CLICK]", {
      assignmentId: targetAssignmentId,
      examId: asg.examId,
      classId: asg.classId,
      studentId: user?.id
    });

    navigate(`/student/exam/${targetAssignmentId}`);
  };

  const handleViewReview = (submissionId: string) => {
    navigate(`/student/review/${submissionId}`);
  };

  const handleExamSubmitted = (submissionId: string) => {
    navigate(`/student/review/${submissionId}`);
  };

  if (viewState === "exam" && activeAssignmentId) {
    return (
      <StudentExamScreen
        assignmentId={activeAssignmentId}
        studentId={user.id}
        onSubmitted={handleExamSubmitted}
        onBackToDashboard={() => navigate("/")}
      />
    );
  }

  if (viewState === "review" && activeSubmissionId) {
    return (
      <StudentReviewScreen
        submissionId={activeSubmissionId}
        onBackToDashboard={() => navigate("/")}
      />
    );
  }

  return (
    <div id="student-dashboard-root" className="min-h-screen bg-slate-50 text-slate-800 pb-16 font-sans">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-6">
        {/* ========================================================== */}
        {/* 1. MỘT HERO BANNER DUY NHẤT (STUDENT HERO) */}
        {/* ========================================================== */}
        <StudentHero
          user={user}
          classInfo={classInfo}
          teacherName="Hồng Bích Trâm"
          onLogout={onLogout}
          bannerConfig={bannerConfig}
          completedAssignmentsCount={completedAssignmentsList.length}
        />

        {/* ========================================================== */}
        {/* 2. THANH CHUYỂN TAB (BÀI KIỂM TRA / TRÒ CHƠI) NGAY DƯỚI HERO */}
        {/* ========================================================== */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-xl grid grid-cols-2 gap-2 p-1.5 bg-white border border-slate-200/90 rounded-2xl sm:rounded-3xl shadow-sm">
            <button
              id="btn-tab-student-tests"
              type="button"
              onClick={() => setStudentTab("tests")}
              className={`w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                studentTab === "tests"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25 scale-[1.01]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Bài kiểm tra</span>
              {allSortedAssignments.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold ${
                  studentTab === "tests" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                }`}>
                  {allSortedAssignments.length}
                </span>
              )}
            </button>

            <button
              id="btn-tab-student-games"
              type="button"
              onClick={() => setStudentTab("games")}
              className={`w-full flex items-center justify-center gap-2 py-3 sm:py-3.5 px-4 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
                studentTab === "games"
                  ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.01]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Gamepad2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span>Trò chơi</span>
            </button>
          </div>
        </div>

        {/* ========================================================== */}
        {/* 3. MAIN WORKSPACE / CONTENT */}
        {/* ========================================================== */}
        <main className="space-y-6 animate-fadeIn">
          {studentTab === "games" ? (
            <StudentGamesScreen user={user} />
          ) : (
            <>
              {error && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  <span className="text-rose-800 font-bold text-xs">{error}</span>
                </div>
              )}

              {loading ? (
          <div className="p-16 text-center bg-white border border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-12 h-12 animate-spin text-amber-500" />
            <h3 className="font-black text-slate-800 text-lg">Đang đồng bộ bảng học tập của em...</h3>
            <p className="text-slate-400 text-xs font-bold">Chờ xíu nhé, trợ lý học tập đang kết nối dữ liệu!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* LEFT 2 COLUMNS: ASSIGNMENTS LIST WITH 3 TABS */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center flex-wrap gap-2">
                  <h2 className="font-black text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <span className="bg-amber-100 p-1.5 rounded-xl text-amber-600 block shadow-xs">
                      <BookOpen className="w-5 h-5 text-amber-600 shrink-0" />
                    </span>
                    Danh sách bài kiểm tra
                  </h2>
                  <span className="bg-amber-50 text-amber-900 text-[11px] font-black px-3.5 py-1.5 rounded-xl border border-amber-200">
                    Tổng số: {allSortedAssignments.length} bài
                  </span>
                </div>

                {/* 3 TABS SELECTOR */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100/80 rounded-2xl border border-slate-200/80">
                  <button
                    id="tab-pending-exams"
                    onClick={() => setExamCategoryTab("pending")}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      examCategoryTab === "pending"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-200/60 ring-1 ring-amber-400 scale-[1.01]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="truncate">CHƯA LÀM</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      examCategoryTab === "pending"
                        ? "bg-slate-950 text-amber-300"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {pendingAssignments.length}
                    </span>
                  </button>

                  <button
                    id="tab-completed-exams"
                    onClick={() => setExamCategoryTab("completed")}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      examCategoryTab === "completed"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-200/60 ring-1 ring-emerald-500 scale-[1.01]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span className="truncate">ĐÃ HOÀN THÀNH</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      examCategoryTab === "completed"
                        ? "bg-white text-emerald-800"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {completedAssignmentsList.length}
                    </span>
                  </button>

                  <button
                    id="tab-overdue-exams"
                    onClick={() => setExamCategoryTab("overdue")}
                    className={`flex items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 sm:px-3 rounded-xl font-black text-xs sm:text-sm transition-all cursor-pointer ${
                      examCategoryTab === "overdue"
                        ? "bg-rose-600 text-white shadow-md shadow-rose-200/60 ring-1 ring-rose-500 scale-[1.01]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate">QUÁ HẠN</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                      examCategoryTab === "overdue"
                        ? "bg-white text-rose-800"
                        : "bg-slate-200 text-slate-700"
                    }`}>
                      {overdueAssignments.length}
                    </span>
                  </button>
                </div>

                {/* TAB CONTENT DISPLAY */}
                {(() => {
                  const currentList = 
                    examCategoryTab === "pending"
                      ? pendingAssignments
                      : examCategoryTab === "completed"
                      ? completedAssignmentsList
                      : overdueAssignments;

                  if (currentList.length === 0) {
                    return (
                      <div className="text-center py-12 bg-slate-50/60 rounded-[24px] border border-dashed border-slate-200 px-4">
                        <Smile className="w-14 h-14 text-amber-400 mx-auto mb-3 bg-white p-3 rounded-2xl shadow-xs" />
                        <h3 className="font-black text-slate-700 text-sm">
                          {examCategoryTab === "pending" && "Không có bài kiểm tra nào chưa làm"}
                          {examCategoryTab === "completed" && "Chưa có bài kiểm tra nào đã hoàn thành"}
                          {examCategoryTab === "overdue" && "Tuyệt vời! Không có bài kiểm tra nào quá hạn"}
                        </h3>
                        <p className="text-slate-400 text-xs font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                          {examCategoryTab === "pending" && "Khi thầy cô giao thêm bài kiểm tra mới, bài làm sẽ xuất hiện ở đây em nhé."}
                          {examCategoryTab === "completed" && "Hãy hoàn thành các bài kiểm tra trong tab 'CHƯA LÀM' để xem kết quả tại đây."}
                          {examCategoryTab === "overdue" && "Em hãy tiếp tục duy trì nộp bài đúng hạn để đạt kết quả cao nhé!"}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4 animate-fadeIn">
                      {currentList.map((asg) => {
                        const isOngoing = asg.computedStatus === "ongoing";
                        const isUpcoming = asg.computedStatus === "upcoming";
                        const isCompleted = asg.computedStatus === "completed";
                        const isExpired = asg.computedStatus === "expired";
                        const isInProgress = asg.submissionStatus === "in_progress";

                        const remInfo = formatRemainingTime(asg.startTime, asg.endTime, asg.computedStatus);

                        return (
                          <div
                            key={asg.assignmentId}
                            className={`border rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all ${
                              isOngoing
                                ? "border-amber-300 bg-gradient-to-r from-amber-500/10 via-amber-50/20 to-white shadow-md shadow-amber-100/40 hover:shadow-lg"
                                : isUpcoming
                                ? "border-blue-200/80 bg-blue-50/20"
                                : isCompleted
                                ? "border-emerald-200/80 bg-emerald-50/30"
                                : "border-rose-200/80 bg-rose-50/20"
                            }`}
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase">
                                  {asg.grade}
                                </span>

                                {/* Status Badge */}
                                {examCategoryTab === "pending" && (
                                  <>
                                    {isOngoing && (
                                      <span className="bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5 shadow-2xs">
                                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                        {isInProgress ? "🟢 Đang làm bài" : "🟡 Chưa làm"}
                                      </span>
                                    )}
                                    {isUpcoming && (
                                      <span className="bg-blue-100 border border-blue-300 text-blue-900 text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5">
                                        🔵 Sắp diễn ra
                                      </span>
                                    )}
                                  </>
                                )}

                                {examCategoryTab === "completed" && (
                                  <span className="bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                    Trạng thái: Đã hoàn thành
                                  </span>
                                )}

                                {examCategoryTab === "overdue" && (
                                  <span className="bg-rose-100 border border-rose-300 text-rose-900 text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5">
                                    <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                    Trạng thái: Quá hạn
                                  </span>
                                )}

                                {/* Secondary Badge: Time remaining or Score */}
                                {isOngoing && remInfo.text && (
                                  <span
                                    className={`text-[11px] font-black px-3 py-1 rounded-xl flex items-center gap-1.5 ${
                                      remInfo.isUrgent
                                        ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                                        : "bg-amber-100 text-amber-900 border border-amber-300"
                                    }`}
                                  >
                                    {remInfo.text}
                                  </span>
                                )}
                                {isUpcoming && remInfo.text && (
                                  <span className="bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold px-3 py-1 rounded-xl">
                                    {remInfo.text}
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="bg-emerald-200/90 text-emerald-950 text-[11px] font-black px-3 py-1 rounded-xl shadow-2xs">
                                    Điểm: {asg.score ?? 0}/10
                                  </span>
                                )}
                              </div>

                              <h3 className="font-black text-slate-900 text-base md:text-lg leading-snug">
                                {asg.title}
                              </h3>

                              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500">
                                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                  Môn học / Chủ đề: {asg.topic}
                                </span>
                                <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                                  <Clock className="w-3.5 h-3.5 shrink-0" />
                                  Thời gian: {asg.duration} phút ({asg.questionsCount || 10} câu)
                                </span>
                              </div>

                              {/* Date/Time Details */}
                              {examCategoryTab === "pending" && (
                                <>
                                  {isUpcoming && (
                                    <p className="text-xs font-black text-blue-600 flex items-center gap-1.5 pt-0.5">
                                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                                      Bắt đầu: {new Date(asg.startTime).toLocaleString("vi-VN")}
                                    </p>
                                  )}
                                  {isOngoing && (
                                    <p className="text-xs font-black text-amber-700 flex items-center gap-1.5 pt-0.5">
                                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                                      Hạn nộp: {new Date(asg.endTime).toLocaleString("vi-VN")}
                                    </p>
                                  )}
                                </>
                              )}

                              {examCategoryTab === "completed" && (
                                <p className="text-xs font-bold text-emerald-700 flex items-center gap-1.5 pt-0.5">
                                  <Calendar className="w-3.5 h-3.5 shrink-0" />
                                  Ngày hoàn thành: {asg.submittedAt ? safeFormatDate(asg.submittedAt) : "Đã nộp"}
                                </p>
                              )}

                              {examCategoryTab === "overdue" && (
                                <div className="space-y-1 pt-0.5">
                                  <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                                    Hạn nộp: {new Date(asg.endTime).toLocaleString("vi-VN")}
                                  </p>
                                  <p className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                    Bài làm đã hết hạn. Em không thể làm bài trừ khi thầy cô gia hạn thêm.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Action Buttons */}
                            {examCategoryTab === "pending" && (
                              <>
                                {isOngoing ? (
                                  <button
                                    id={`btn-start-exam-${asg.assignmentId}`}
                                    onClick={() => handleStartExam(asg)}
                                    className={`font-black text-xs md:text-sm px-6 py-4 rounded-2xl cursor-pointer shrink-0 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md ${
                                      isInProgress
                                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                        : "bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-100"
                                    }`}
                                  >
                                    {isInProgress ? "Tiếp tục làm bài" : "Bắt đầu làm bài"}
                                    <Play className="w-4 h-4 fill-current" />
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    className="bg-slate-100 text-slate-400 font-black text-xs md:text-sm px-6 py-4 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                                  >
                                    Chưa đến giờ
                                    <Clock className="w-4 h-4" />
                                  </button>
                                )}
                              </>
                            )}

                            {examCategoryTab === "completed" && (
                              <button
                                id={`btn-review-exam-${asg.submissionId || asg.assignmentId}`}
                                onClick={() => handleViewReview(asg.submissionId!)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs md:text-sm px-6 py-4 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] shadow-sm"
                              >
                                Xem kết quả
                                <Eye className="w-4 h-4" />
                              </button>
                            )}

                            {examCategoryTab === "overdue" && (
                              <button
                                disabled
                                className="bg-slate-100 text-slate-400 font-black text-xs md:text-sm px-6 py-4 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                              >
                                Đã quá hạn
                                <AlertCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* RIGHT COLUMN: RECENT COMPLETED / HISTORY */}
            <div className="space-y-6">
              {/* LEADERBOARD CARD */}
              <div
                id="student-leaderboard-card"
                className="bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-orange-500/10 border-2 border-amber-300/80 rounded-[32px] p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden"
              >
                <div className="border-b border-amber-200/60 pb-3.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
                    <div className="bg-gradient-to-tr from-amber-500 to-amber-400 text-white p-2 sm:p-2.5 rounded-2xl shadow-md shadow-amber-200 shrink-0">
                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-950 fill-amber-300" />
                    </div>
                    <div className="min-w-0 flex-1 overflow-visible">
                      <h2 className="font-black text-slate-900 text-[12px] min-[380px]:text-[13px] sm:text-sm md:text-base flex items-center gap-1 sm:gap-1.5 tracking-tight whitespace-nowrap overflow-visible">
                        <span className="shrink-0">🏆</span>
                        <span className="whitespace-nowrap overflow-visible font-black">BẢNG VÀNG THÀNH TÍCH</span>
                      </h2>
                      <span className="text-[11px] font-bold text-amber-800/80 block truncate">
                        {classInfo?.name || "Lớp học"}
                      </span>
                    </div>
                  </div>
                  <span className="bg-amber-200/80 text-amber-950 text-[10px] font-black px-2 sm:px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap">
                    TOP 10
                  </span>
                </div>

                {leaderboard.length === 0 ? (
                  <div className="bg-white/90 backdrop-blur-xs border border-amber-200/70 rounded-2xl p-5 text-center space-y-2">
                    <div className="w-10 h-10 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                      <Trophy className="w-5 h-5 text-amber-500" />
                    </div>
                    <p className="text-xs font-bold text-slate-700 leading-relaxed">
                      <span className="whitespace-nowrap font-black">🏆 Bảng vàng thành tích</span> sẽ được cập nhật sau khi các bạn hoàn thành bài kiểm tra đầu tiên!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 animate-fadeIn">
                    {leaderboard.map((item, idx) => {
                      const isTop1 = item.rank === 1;
                      const isTop2 = item.rank === 2;
                      const isTop3 = item.rank === 3;

                      return (
                        <div
                          key={item.studentId || `rank-${idx}`}
                          className={`p-3 rounded-2xl flex items-center justify-between gap-3 transition-all border ${
                            item.isCurrentStudent
                              ? "bg-amber-100/90 border-amber-400 shadow-xs ring-2 ring-amber-300/60"
                              : isTop1
                              ? "bg-gradient-to-r from-amber-100/80 to-yellow-50/80 border-amber-300/80"
                              : isTop2
                              ? "bg-slate-100/80 border-slate-200/80"
                              : isTop3
                              ? "bg-orange-50/80 border-orange-200/80"
                              : "bg-white/90 border-slate-100"
                          }`}
                        >
                          <div className="flex items-center gap-3 overflow-hidden">
                            <div
                              className={`w-8 h-8 rounded-xl font-black text-xs flex items-center justify-center shrink-0 shadow-xs ${
                                isTop1
                                  ? "bg-gradient-to-tr from-amber-500 to-yellow-400 text-slate-950 border border-amber-300"
                                  : isTop2
                                  ? "bg-gradient-to-tr from-slate-300 to-slate-200 text-slate-800 border border-slate-300"
                                  : isTop3
                                  ? "bg-gradient-to-tr from-amber-700 to-amber-600 text-amber-50 border border-amber-800"
                                  : "bg-slate-100 text-slate-600 border border-slate-200"
                              }`}
                            >
                              {isTop1 ? "🥇" : isTop2 ? "🥈" : isTop3 ? "🥉" : item.rank}
                            </div>

                            <div className="overflow-hidden space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-black text-xs sm:text-sm text-slate-900 truncate">
                                  {item.name}
                                </span>
                                {item.isCurrentStudent && (
                                  <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs inline-flex items-center gap-0.5 shrink-0 animate-pulse">
                                    <Star className="w-2.5 h-2.5 fill-current" />
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-bold text-slate-500 block truncate">
                                Đã làm: <strong className="text-slate-700">{item.completedCount} bài</strong>
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-xs sm:text-sm text-amber-800 bg-amber-100/90 border border-amber-200/80 px-2.5 py-1 rounded-xl block shadow-2xs">
                              {item.avgScore} <span className="text-[10px] font-bold">điểm</span>
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* HISTORY CARD */}
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-50 pb-4">
                <h2 className="font-black text-slate-900 text-sm md:text-base flex items-center gap-2">
                  <span className="bg-emerald-100 p-1.5 rounded-xl text-emerald-600 block shadow-xs animate-pulse">
                    <Award className="w-4 h-4 shrink-0" />
                  </span>
                  Lịch sử & Báo cáo điểm số
                </h2>
              </div>

              {completedAssignments.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs font-bold leading-relaxed">
                  Em chưa nộp bài kiểm tra nào. Hãy hoàn thành bài tập đầu tiên để xem báo cáo điểm số em nhé!
                </div>
              ) : (
                <div className="space-y-4 animate-fadeIn">
                  {completedAssignments.map((sub, idx) => {
                    const scoreVal = typeof sub.score === "number" ? sub.score : (sub.submission?.score ?? 0);
                    const isExcellent = scoreVal >= 8;
                    const isGood = scoreVal >= 5 && scoreVal < 8;
                    const subId = sub.submissionId || sub.submission?.id || sub.id;
                    const titleVal = sub.title || sub.examTitle || sub.submission?.title || "Bài kiểm tra";
                    const dateVal = sub.submittedAt || sub.submission?.submittedAt;
                    const formattedDate = safeFormatDate(dateVal);

                    return (
                      <div
                        key={subId || `sub-item-${idx}`}
                        className="border border-slate-100 p-4 rounded-[20px] space-y-4 hover:bg-slate-50/50 transition-colors bg-white shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1 overflow-hidden">
                            <h4 className="font-black text-slate-900 truncate block text-sm">{titleVal}</h4>
                            <span className="text-[10px] font-bold text-slate-400 block">Nộp bài: {formattedDate}</span>
                          </div>
                          <span className={`font-black text-sm px-3 py-1.5 rounded-xl shrink-0 border ${
                            isExcellent
                              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                              : isGood
                              ? "text-indigo-700 bg-indigo-50 border-indigo-100"
                              : "text-rose-700 bg-rose-50 border-rose-100"
                          }`}>
                            {scoreVal} điểm
                          </span>
                        </div>

                        <button
                          id={`btn-view-review-${subId || idx}`}
                          onClick={() => subId && handleViewReview(subId)}
                          className="w-full text-center border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
                        >
                          <Eye className="w-4 h-4" />
                          Học từ câu sai & Lời giải
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
              )}
            </>
          )}

          <Footer className="mt-12 pt-6 border-t border-slate-200/60" />
        </main>
      </div>
    </div>
  );
}
