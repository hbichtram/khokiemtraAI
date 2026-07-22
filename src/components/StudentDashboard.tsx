import React, { useState, useEffect } from "react";
import { User } from "../types";
import StudentExamScreen from "./StudentExamScreen";
import StudentReviewScreen from "./StudentReviewScreen";
import { 
  Award, Play, Eye, LogOut, BookOpen, Clock, Calendar, 
  HelpCircle, RefreshCw, AlertCircle, Smile, GraduationCap 
} from "lucide-react";

interface StudentDashboardProps {
  user: User;
  onLogout: () => void;
}

export default function StudentDashboard({ user, onLogout }: StudentDashboardProps) {
  const [activeAssignments, setActiveAssignments] = useState<any[]>([]);
  const [completedAssignments, setCompletedAssignments] = useState<any[]>([]);
  const [classInfo, setClassInfo] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active view states: "dashboard" | "exam" | "review"
  const [viewState, setViewState] = useState<"dashboard" | "exam" | "review">("dashboard");
  const [activeAssignmentId, setActiveAssignmentId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);

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
    }
  }, [viewState]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/${user.id}/dashboard`);
      if (!res.ok) throw new Error("Không thể tải thông tin bảng học tập.");
      const data = await res.json();
      setActiveAssignments(data.activeAssignments || []);
      setCompletedAssignments(data.completedAssignments || []);
      setClassInfo(data.classInfo || null);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = (asg: any) => {
    if (!asg || !asg.assignmentId) {
      alert("Không tìm thấy bài kiểm tra được giao.");
      return;
    }
    
    console.log("[DEBUG_START_EXAM_CLICK]", {
      assignmentId: asg.assignmentId,
      examId: asg.examId,
      classId: asg.classId,
      studentId: user?.id
    });

    navigate(`/student/exam/${asg.assignmentId}`);
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
      {/* CUTE STUDENT HERO HEADER */}
      <header className="bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 border-b border-amber-500 shadow-lg">
        <div className="max-w-6xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="bg-slate-900 text-amber-400 p-3.5 rounded-3xl shadow-md shrink-0">
              <GraduationCap className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-1.5">
                <h1 className="text-xl md:text-2xl font-black tracking-tight">Chào mừng em, {user.name}!</h1>
                <Smile className="w-6 h-6 text-slate-900 shrink-0 animate-bounce" />
              </div>
              <p className="text-xs md:text-sm font-bold text-slate-800 mt-1">
                Lớp học: <strong className="text-slate-950 font-black">{classInfo?.name || user.className || "Lớp học"}</strong> | Mã HS: <strong className="text-slate-950 font-black font-mono">{user.studentCode}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="bg-slate-900 hover:bg-slate-950 text-amber-400 font-extrabold text-xs px-5 py-3 rounded-2xl cursor-pointer flex items-center gap-2 transition-all shadow-md active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Đăng xuất
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 mt-8 space-y-8 animate-fadeIn">
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
            {/* LEFT 2 COLUMNS: ASSIGNMENTS TO DO */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-50 pb-4 flex justify-between items-center">
                  <h2 className="font-black text-slate-900 text-base md:text-lg flex items-center gap-2">
                    <span className="bg-amber-100 p-1.5 rounded-xl text-amber-600 block shadow-xs">
                      <Play className="w-5 h-5 fill-amber-500 shrink-0" />
                    </span>
                    Bài kiểm tra em cần làm
                  </h2>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-black px-3 py-1 rounded-xl">
                    {activeAssignments.length} BÀI CHƯA LÀM
                  </span>
                </div>

                {activeAssignments.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-[24px] border border-dashed border-slate-200">
                    <Smile className="w-16 h-16 text-amber-400 mx-auto mb-3 bg-white p-3 rounded-2xl" />
                    <h3 className="font-black text-slate-700 text-sm">Tuyệt vời! Em đã hoàn thành hết mọi bài tập</h3>
                    <p className="text-slate-400 text-xs font-bold mt-1 max-w-xs mx-auto leading-relaxed">
                      Khi thầy cô giao thêm bài kiểm tra Tin học mới, bài làm sẽ tự động hiển thị ở đây em nhé.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fadeIn">
                    {activeAssignments.map((asg) => {
                      const isUpcoming = asg.status === "Chưa bắt đầu";
                      const isExpired = asg.status === "Đã hết hạn";
                      const isOngoing = asg.status === "Đang diễn ra";
                      const isInProgress = asg.submissionStatus === "in_progress";

                      return (
                        <div
                          key={asg.assignmentId}
                          className={`border rounded-3xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 transition-all bg-white ${
                            isOngoing
                              ? "border-slate-100 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-100/30"
                              : isUpcoming
                              ? "border-slate-100 opacity-85"
                              : "border-slate-100 opacity-65 bg-slate-50/30"
                          }`}
                        >
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase">
                                {asg.grade}
                              </span>
                              <span className="bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-lg uppercase">
                                Môn học: Tin học
                              </span>
                              {isOngoing && !isInProgress && (
                                <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase animate-pulse">
                                  Đang diễn ra
                                </span>
                              )}
                              {isOngoing && isInProgress && (
                                <span className="bg-amber-50 border border-amber-100 text-amber-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase animate-pulse">
                                  Đang làm dở
                                </span>
                              )}
                              {isUpcoming && (
                                <span className="bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                                  Sắp diễn ra
                                </span>
                              )}
                              {isExpired && (
                                <span className="bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                                  Đã quá hạn
                                </span>
                              )}
                            </div>
                            
                            <h3 className="font-black text-slate-900 text-base leading-snug">
                              {asg.title}
                            </h3>
                            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                                Chủ đề: {asg.topic}
                              </span>
                              <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600">
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                                Thời gian: {asg.duration} phút ({asg.questionsCount || 10} câu)
                              </span>
                            </div>

                            {isUpcoming ? (
                              <p className="text-xs font-black text-blue-600 flex items-center gap-1.5 pt-1">
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                Thời gian bắt đầu: {new Date(asg.startTime).toLocaleString("vi-VN")}
                              </p>
                            ) : (
                              <p className={`text-xs font-black flex items-center gap-1.5 pt-1 ${isExpired ? "text-slate-400 line-through" : "text-rose-500"}`}>
                                <Calendar className="w-3.5 h-3.5 shrink-0" />
                                Hạn cuối: {new Date(asg.endTime).toLocaleString("vi-VN")}
                              </p>
                            )}
                          </div>

                          {isOngoing ? (
                            <button
                              id={`btn-start-exam-${asg.assignmentId}`}
                              onClick={() => handleStartExam(asg)}
                              className={`font-black text-xs md:text-sm px-6 py-4 rounded-2xl cursor-pointer shrink-0 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-md animate-fadeIn ${
                                isInProgress
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200"
                                  : "bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-100"
                              }`}
                            >
                              {isInProgress ? "Tiếp tục làm bài" : "Làm bài ngay"}
                              <Play className="w-4 h-4 fill-current" />
                            </button>
                          ) : isUpcoming ? (
                            <button
                              disabled
                              className="bg-slate-100 text-slate-400 font-black text-xs md:text-sm px-6 py-4 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                            >
                              Chưa đến giờ
                              <Clock className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              disabled
                              className="bg-slate-50 text-slate-400 font-black text-xs md:text-sm px-6 py-4 rounded-2xl shrink-0 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-100"
                            >
                              Đã quá hạn
                              <AlertCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: RECENT COMPLETED / HISTORY */}
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
                  {completedAssignments.map((sub) => {
                    const isExcellent = sub.score >= 8;
                    const isGood = sub.score >= 5 && sub.score < 8;
                    return (
                      <div
                        key={sub.submissionId}
                        className="border border-slate-100 p-4 rounded-[20px] space-y-4 hover:bg-slate-50/50 transition-colors bg-white shadow-xs"
                      >
                        <div className="flex items-start justify-between gap-3 text-xs">
                          <div className="space-y-1 overflow-hidden">
                            <h4 className="font-black text-slate-900 truncate block text-sm">{sub.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 block">Nộp bài: {new Date(sub.submittedAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                          <span className={`font-black text-sm px-3 py-1.5 rounded-xl shrink-0 border ${
                            isExcellent
                              ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                              : isGood
                              ? "text-indigo-700 bg-indigo-50 border-indigo-100"
                              : "text-rose-700 bg-rose-50 border-rose-100"
                          }`}>
                            {sub.score} điểm
                          </span>
                        </div>

                        <button
                          id={`btn-view-review-${sub.submissionId}`}
                          onClick={() => handleViewReview(sub.submissionId)}
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
        )}
      </main>
    </div>
  );
}
