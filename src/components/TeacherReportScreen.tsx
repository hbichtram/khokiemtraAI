import React, { useState, useEffect, useMemo } from "react";
import { 
  Award, ArrowLeft, BarChart2, CheckCircle2, XCircle, 
  Clock, Eye, User, Calendar, RefreshCw, AlertCircle,
  Filter, Search, Users, Check, HelpCircle, Layers
} from "lucide-react";
import {
  fsGetAssignmentsDetailed,
  fsGetAssignmentReport,
  fsGetStudentSubmissionResult,
  fsDeleteAssignment,
  fsGetClasses,
  getAppData
} from "../lib/firestoreData";

interface TeacherReportScreenProps {
  teacherId: string;
}

export default function TeacherReportScreen({ teacherId }: TeacherReportScreenProps) {
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  
  // Filters for main assignment list
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Filter for student results table inside report
  const [studentResultFilter, setStudentResultFilter] = useState<string>("all");
  const [studentSearchTerm, setStudentSearchTerm] = useState<string>("");

  // Drill-down student exam view
  const [studentSubmissionDetail, setStudentSubmissionDetail] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
    fetchAssignments();
  }, [teacherId]);

  const fetchClasses = async () => {
    try {
      let classList: any[] = [];
      try {
        const res = await fetch("/api/classes");
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) classList = data;
        }
      } catch (e) {
        console.warn("API classes fetch failed, fallback to Firestore:", e);
      }

      if (!classList || classList.length === 0) {
        classList = await fsGetClasses();
      }

      if (teacherId && teacherId !== "teacher-default") {
        classList = classList.filter(
          (c) => !c.teacherId || c.teacherId === teacherId || c.teacherId === "teacher-default"
        );
      }

      setClasses(classList);
    } catch (err) {
      console.error("Error fetching classes for report filter:", err);
    }
  };

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      let data: any[] = [];
      let loaded = false;

      try {
        const res = await fetch(`/api/assignments/detailed?teacherId=${teacherId}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          data = await res.json();
          loaded = true;
        }
      } catch (err) {
        console.warn("API detailed assignments fetch failed, using Firestore:", err);
      }

      if (!loaded) {
        data = await fsGetAssignmentsDetailed(teacherId);
      }

      setAssignments(data);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải dữ liệu đợt kiểm tra.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAssignment = async (id: string) => {
    setSelectedAssignmentId(id);
    setReportData(null);
    setStudentSubmissionDetail(null);
    setDetailLoading(true);
    setError(null);
    setStudentResultFilter("all");
    setStudentSearchTerm("");

    const asg = assignments.find((a) => a.id === id);
    if (asg && asg.classId) {
      setSelectedClassId(asg.classId);
    }

    try {
      let data: any = null;
      let loaded = false;

      try {
        const res = await fetch(`/api/reports/assignment/${id}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          data = await res.json();
          loaded = true;
        }
      } catch (err) {
        console.warn("API assignment report fetch failed, using Firestore:", err);
      }

      if (!loaded) {
        data = await fsGetAssignmentReport(id);
      }

      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải báo cáo chi tiết.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewStudentSubmission = async (submissionId: string) => {
    setSubLoading(true);
    setError(null);
    try {
      let data: any = null;
      let loaded = false;

      try {
        const res = await fetch(`/api/student/result/${submissionId}`);
        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const apiData = await res.json();
          if (apiData && apiData.submission && Array.isArray(apiData.questions) && apiData.questions.length > 0) {
            data = apiData;
            loaded = true;
          }
        }
      } catch (err) {
        console.warn("API student submission detail fetch failed, using Firestore:", err);
      }

      if (!loaded) {
        data = await fsGetStudentSubmissionResult(submissionId);
      }

      if (!data || !data.submission) {
        throw new Error("Không tìm thấy dữ liệu bài làm của học sinh.");
      }

      setStudentSubmissionDetail(data);
    } catch (err: any) {
      console.error("Error loading student submission detail:", err);
      setError(err.message || "Lỗi khi tải chi tiết bài làm.");
    } finally {
      setSubLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn hủy đợt giao bài này? Học sinh sẽ không thể làm bài và mọi kết quả nộp bài liên quan sẽ bị xóa.")) {
      return;
    }
    setLoading(true);
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
        if (res.ok) deleted = true;
      } catch (err) {
        console.warn("API delete assignment failed, using Firestore:", err);
      }

      if (!deleted) {
        await fsDeleteAssignment(id);
      }

      setSelectedAssignmentId(null);
      setReportData(null);
      await fetchAssignments();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra khi hủy đợt giao bài.");
    } finally {
      setLoading(false);
    }
  };

  // Currently selected class object
  const selectedClassObj = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId);
  }, [classes, selectedClassId]);

  // Filter assignments based on selectedClassId, statusFilter, and searchTerm
  const filteredAssignments = useMemo(() => {
    return assignments.filter((asg) => {
      // 1. Class Filter
      if (selectedClassId !== "all") {
        const isMatchingId = asg.classId === selectedClassId;
        const isMatchingName = selectedClassObj && asg.className === selectedClassObj.name;
        if (!isMatchingId && !isMatchingName) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "all" && asg.status !== statusFilter) {
        return false;
      }

      // 3. Search Filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const titleMatch = (asg.examTitle || "").toLowerCase().includes(term);
        const classMatch = (asg.className || "").toLowerCase().includes(term);
        if (!titleMatch && !classMatch) return false;
      }

      return true;
    });
  }, [assignments, selectedClassId, selectedClassObj, statusFilter, searchTerm]);

  // Summary Metrics for the overview (Main view)
  const overviewStats = useMemo(() => {
    const totalStudentsInFilter = selectedClassId === "all"
      ? classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)
      : selectedClassObj?.students?.length || 0;

    const totalAssignments = filteredAssignments.length;
    const totalSubmissions = filteredAssignments.reduce((sum, a) => sum + (a.submissionCount || 0), 0);

    return {
      totalStudents: totalStudentsInFilter,
      totalAssignments,
      totalSubmissions,
      activeClassesCount: selectedClassId === "all" ? classes.length : 1
    };
  }, [classes, selectedClassId, selectedClassObj, filteredAssignments]);

  // Filtered Student Results inside Detailed Report
  const filteredStudentResults = useMemo(() => {
    if (!reportData || !reportData.studentResults) return [];

    let list = [...reportData.studentResults];

    // Search student name or code
    if (studentSearchTerm.trim()) {
      const term = studentSearchTerm.toLowerCase();
      list = list.filter((std) => 
        (std.studentName || "").toLowerCase().includes(term) ||
        (std.studentCode || "").toLowerCase().includes(term)
      );
    }

    // Status / Score category filter
    if (studentResultFilter === "submitted") {
      list = list.filter((std) => std.status === "Đã nộp");
    } else if (studentResultFilter === "pending") {
      list = list.filter((std) => std.status === "Chưa làm");
    } else if (studentResultFilter === "pass") {
      list = list.filter((std) => std.status === "Đã nộp" && std.score !== null && std.score >= 5);
    } else if (studentResultFilter === "fail") {
      list = list.filter((std) => std.status === "Đã nộp" && std.score !== null && std.score < 5);
    }

    return list;
  }, [reportData, studentSearchTerm, studentResultFilter]);

  // Find question with highest and lowest correct rates
  const qa = reportData?.questionAnalysis || [];
  const lowestCorrectQuestion = qa.length > 0 
    ? [...qa].sort((a, b) => a.correctRate - b.correctRate)[0]
    : null;
  const highestCorrectQuestion = qa.length > 0
    ? [...qa].sort((a, b) => b.correctRate - a.correctRate)[0]
    : null;

  return (
    <div id="teacher-report-root" className="space-y-8 animate-fadeIn font-sans">
      {/* HEADER & CLASS FILTER BAR */}
      <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
              <span className="bg-indigo-100 p-2.5 rounded-2xl text-indigo-600 block shadow-xs">
                <BarChart2 className="w-7 h-7" />
              </span>
              Báo cáo Kết quả Học tập
            </h1>
            <p className="text-slate-500 font-medium text-xs md:text-sm mt-1">
              Phân tích chi tiết điểm số, tiến độ làm bài và năng lực của từng em học sinh theo từng lớp học.
            </p>
          </div>

          <button
            onClick={() => {
              fetchClasses();
              fetchAssignments();
              if (selectedAssignmentId) {
                handleSelectAssignment(selectedAssignmentId);
              }
            }}
            className="self-start md:self-auto border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 text-slate-700 hover:text-indigo-700 px-4 py-2.5 rounded-2xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
          >
            <RefreshCw className={`w-4 h-4 ${loading || detailLoading ? "animate-spin text-indigo-600" : ""}`} />
            Làm mới dữ liệu
          </button>
        </div>

        {/* CLASS FILTER SECTION */}
        <div className="bg-slate-50/80 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="bg-indigo-600 text-white p-2 rounded-xl shrink-0 shadow-xs">
              <Users className="w-4 h-4" />
            </span>
            <div className="min-w-0 flex-1">
              <label htmlFor="select-class-filter" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1">
                Lọc báo cáo theo lớp học:
              </label>
              <select
                id="select-class-filter"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  // If viewing detailed report and user changes class, return to filtered list
                  if (selectedAssignmentId) {
                    setSelectedAssignmentId(null);
                    setReportData(null);
                  }
                }}
                className="w-full bg-white border border-slate-200 hover:border-indigo-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl px-3.5 py-2 text-xs font-black text-slate-900 transition-all cursor-pointer shadow-xs outline-none"
              >
                <option value="all">
                  🏫 Tất cả các lớp ({classes.length} lớp - {classes.reduce((sum, c) => sum + (c.students?.length || 0), 0)} học sinh)
                </option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    🏫 {cls.name} ({cls.students?.length || 0} học sinh)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick Badges for Selected Class */}
          <div className="flex flex-wrap items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200/60 shrink-0">
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-2xs">
              Đang xem: <strong className="text-indigo-600 font-black">{selectedClassId === "all" ? "Tất cả các lớp" : selectedClassObj?.name}</strong>
            </span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-2xs">
              Sĩ số: <strong className="text-slate-950 font-black">{overviewStats.totalStudents} em</strong>
            </span>
            <span className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl text-[11px] font-bold text-slate-700 shadow-2xs">
              Đợt giao bài: <strong className="text-emerald-600 font-black">{overviewStats.totalAssignments} bài</strong>
            </span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs">{error}</span>
        </div>
      )}

      {(loading || detailLoading || subLoading) && (
        <div className="p-12 text-center bg-white border border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3 shadow-xs">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
          <span className="text-slate-600 font-black text-sm">Đang tải và cập nhật báo cáo học tập mới nhất...</span>
        </div>
      )}

      {/* STATE 1: ASSIGNMENT LIST & CLASS OVERVIEW */}
      {!loading && !detailLoading && !selectedAssignmentId && (
        <div className="space-y-6">
          {/* OVERVIEW SUMMARY CARDS FOR SELECTED CLASS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <span className="bg-indigo-50 text-indigo-600 p-3 rounded-xl shrink-0">
                <Users className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sĩ số học sinh</span>
                <strong className="text-xl font-black text-slate-900 leading-tight block">{overviewStats.totalStudents} em</strong>
                <span className="text-[10px] text-slate-400 font-medium">Trong bộ lọc hiện tại</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <span className="bg-emerald-50 text-emerald-600 p-3 rounded-xl shrink-0">
                <Calendar className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số bài kiểm tra</span>
                <strong className="text-xl font-black text-slate-900 leading-tight block">{overviewStats.totalAssignments} đợt</strong>
                <span className="text-[10px] text-slate-400 font-medium">Đã được giao</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <span className="bg-amber-50 text-amber-600 p-3 rounded-xl shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tổng lượt nộp</span>
                <strong className="text-xl font-black text-indigo-600 leading-tight block">{overviewStats.totalSubmissions} lượt</strong>
                <span className="text-[10px] text-slate-400 font-medium">Hoàn thành bài làm</span>
              </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <span className="bg-purple-50 text-purple-600 p-3 rounded-xl shrink-0">
                <Layers className="w-5 h-5" />
              </span>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Số lớp đang xem</span>
                <strong className="text-xl font-black text-slate-900 leading-tight block">
                  {selectedClassId === "all" ? `${classes.length} lớp` : "1 lớp"}
                </strong>
                <span className="text-[10px] text-slate-400 font-medium">{selectedClassId === "all" ? "Toàn bộ hệ thống" : selectedClassObj?.name}</span>
              </div>
            </div>
          </div>

          {/* FILTERS AND SEARCH BAR FOR ASSIGNMENTS */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-4 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            {/* Status tabs */}
            <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl shrink-0 overflow-x-auto">
              {[
                { id: "all", label: "Tất cả trạng thái" },
                { id: "Đang diễn ra", label: "🟢 Đang diễn ra" },
                { id: "Đã hết hạn", label: "🔴 Đã hết hạn" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                    statusFilter === tab.id
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm bài kiểm tra..."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-2xl pl-10 pr-4 py-2 text-xs font-medium text-slate-800 outline-none transition-all"
              />
            </div>
          </div>

          {/* LIST ASSIGNMENTS CARDS */}
          {filteredAssignments.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-xs space-y-3">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto bg-slate-50 p-3 rounded-2xl" />
              <h3 className="font-black text-slate-800 text-lg">Không tìm thấy đợt kiểm tra phù hợp</h3>
              <p className="text-slate-500 font-medium text-sm max-w-md mx-auto leading-relaxed">
                {selectedClassId !== "all" 
                  ? `Chưa có bài kiểm tra nào được giao cho ${selectedClassObj?.name || "lớp này"}. Thầy cô có thể giao bài mới cho lớp ở mục Ngân hàng đề thi.`
                  : "Chưa có bài kiểm tra nào khớp với điều kiện lọc."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAssignments.map((asg) => (
                <div
                  key={asg.id}
                  className="bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/40 rounded-[28px] p-6 transition-all flex flex-col justify-between space-y-4 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-lg ${
                        asg.status === "Đang diễn ra"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : asg.status === "Đã hết hạn"
                          ? "bg-rose-50 text-rose-700 border border-rose-100"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {asg.status}
                      </span>

                      <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-100 truncate max-w-[120px]">
                        {asg.className}
                      </span>
                    </div>

                    <h3 className="font-black text-slate-900 text-base leading-tight hover:text-indigo-600 transition-all line-clamp-2">
                      {asg.examTitle}
                    </h3>

                    <div className="text-xs font-medium text-slate-500 space-y-1.5 pt-2 border-t border-slate-50">
                      <p>Lớp giao bài: <strong className="text-slate-800 font-bold">{asg.className}</strong></p>
                      <p>Sĩ số lớp: <strong className="text-slate-800 font-bold">{asg.totalStudents} em</strong></p>
                      <p>Số bài đã nộp: <strong className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{asg.submissionCount}</strong> bài</p>
                      <p>Hạn nộp: <strong className="text-slate-800 font-bold">{new Date(asg.endTime).toLocaleString("vi-VN")}</strong></p>
                    </div>
                  </div>

                  <button
                    id={`btn-view-report-${asg.id}`}
                    onClick={() => handleSelectAssignment(asg.id)}
                    className="w-full text-center border border-indigo-100 bg-indigo-50/60 hover:bg-indigo-600 hover:text-white text-indigo-700 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-2xs active:scale-[0.98]"
                  >
                    Xem báo cáo kết quả lớp
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STATE 2: DETAILED REPORT VIEW */}
      {selectedAssignmentId && reportData && !detailLoading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Back button & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <button
              onClick={() => {
                setSelectedAssignmentId(null);
                setReportData(null);
                setStudentSubmissionDetail(null);
                fetchAssignments();
              }}
              className="hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black px-4 py-3 rounded-2xl inline-flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98] bg-white shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Quay lại danh sách đợt giao bài
            </button>

            <button
              onClick={() => handleDeleteAssignment(reportData.assignment.id)}
              className="border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-black px-4 py-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98]"
            >
              Hủy đợt giao đề này
            </button>
          </div>

          {/* Report Meta Header */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-xs space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                BÁO CÁO CHI TIẾT
              </span>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-lg">
                LỚP: {reportData.classInfo.name}
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight pt-1">{reportData.exam.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-500 pt-1">
              <span>Lớp giao bài: <strong className="text-slate-900 font-extrabold">{reportData.classInfo.name}</strong></span>
              <span>Sĩ số: <strong className="text-slate-900 font-extrabold">{reportData.classInfo.totalStudents} em</strong></span>
              <span>Số câu hỏi: <strong className="text-slate-900 font-extrabold">{reportData.exam.questionCount} câu</strong></span>
              <span>Trạng thái đợt kiểm tra: <strong className="text-indigo-600 font-extrabold">{reportData.assignment.status}</strong></span>
            </div>
          </div>

          {/* DETAILED STATS CARDS (REQUIREMENT 4) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Điểm trung bình</span>
              <strong className="text-3xl font-black text-indigo-600 block leading-tight">{reportData.stats.averageScore}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Thang điểm 10</span>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Đã nộp bài</span>
              <strong className="text-3xl font-black text-emerald-600 block leading-tight">
                {reportData.stats.submissionCount}/{reportData.classInfo.totalStudents}
              </strong>
              <span className="text-[10px] text-slate-400 font-bold block">Hoàn thành ({reportData.stats.completionRate}%)</span>
            </div>

            <div className="bg-white border border-emerald-100 bg-emerald-50/20 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-emerald-700 font-extrabold uppercase tracking-wider block">Số bài Đạt (≥ 5.0)</span>
              <strong className="text-3xl font-black text-emerald-700 block leading-tight">{reportData.stats.passCount || 0}</strong>
              <span className="text-[10px] text-emerald-600 font-bold block">
                {reportData.stats.submissionCount > 0 
                  ? `${((reportData.stats.passCount / reportData.stats.submissionCount) * 100).toFixed(0)}% trên bài đã nộp`
                  : "Chưa có bài nộp"}
              </span>
            </div>

            <div className="bg-white border border-rose-100 bg-rose-50/20 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-rose-700 font-extrabold uppercase tracking-wider block">Số bài Chưa đạt (&lt; 5.0)</span>
              <strong className="text-3xl font-black text-rose-600 block leading-tight">{reportData.stats.failCount || 0}</strong>
              <span className="text-[10px] text-rose-500 font-bold block">Cần củng cố kiến thức</span>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1 col-span-2 md:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chưa làm bài</span>
              <strong className="text-3xl font-black text-amber-500 block leading-tight">{reportData.stats.pendingCount}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Học sinh chưa nộp</span>
            </div>
          </div>

          {/* QUESTION ANALYSIS & KEY INSIGHTS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Question Breakdown */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  Phân tích chi tiết từng câu hỏi ({reportData.classInfo.name})
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Dựa trên {reportData.stats.submissionCount} bài nộp</span>
              </div>
              
              {reportData.questionAnalysis && reportData.questionAnalysis.length > 0 ? (
                <div className="space-y-4">
                  {reportData.questionAnalysis.map((q: any) => {
                    const needsReview = q.correctRate < 60;
                    return (
                      <div key={q.id} className="border border-slate-100 rounded-2xl p-4 space-y-2 hover:border-indigo-100 transition-colors bg-slate-50/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-900 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {q.index}
                            </span>
                            <span className="font-extrabold text-xs text-slate-800 line-clamp-1">{q.questionText}</span>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                            q.correctRate >= 80 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                              : q.correctRate >= 50
                              ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                              : "bg-rose-50 text-rose-700 border border-rose-100"
                          }`}>
                            {q.correctRate}% đúng
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              q.correctRate >= 80 ? "bg-emerald-500" : q.correctRate >= 50 ? "bg-indigo-500" : "bg-rose-500"
                            }`} 
                            style={{ width: `${q.correctRate}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold pt-1">
                          <span>Đúng: <strong className="text-emerald-600">{q.correctCount} em</strong></span>
                          <span>Sai: <strong className="text-rose-500">{q.wrongCount} em</strong></span>
                          <span>Đáp án chuẩn: <strong className="text-slate-700 font-mono font-black">{q.correctAnswer}</strong></span>
                        </div>

                        {needsReview && (
                          <div className="mt-2 bg-rose-50/50 border border-rose-100 rounded-xl px-3 py-1.5 flex items-center gap-2 text-rose-700 font-extrabold text-[10px]">
                            <span>⚠️ Tỷ lệ làm đúng thấp ({q.correctRate}%), thầy cô nên giải thích kỹ lại câu hỏi này cho cả lớp!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 font-bold text-center py-6 text-xs">Chưa có bài nộp nào để phân tích câu hỏi.</p>
              )}
            </div>

            {/* General Evaluation & Insights */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Đánh giá chất lượng lớp
                </h3>
              </div>

              <div className="space-y-4">
                {/* Completion progress */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Tỉ lệ nộp bài</span>
                    <span className="text-indigo-600 font-black">{reportData.stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reportData.stats.completionRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    {reportData.stats.submissionCount} / {reportData.classInfo.totalStudents} học sinh đã hoàn thành.
                  </p>
                </div>

                {/* Accuracy progress */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Tỉ lệ làm đúng TB</span>
                    <span className="text-emerald-600 font-black">{reportData.stats.averageCorrectRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reportData.stats.averageCorrectRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Mức độ chính xác trung bình trên toàn bộ bài thi.
                  </p>
                </div>

                {/* Key Insights */}
                {reportData.questionAnalysis && reportData.questionAnalysis.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Lưu ý quan trọng</h4>
                    
                    {lowestCorrectQuestion && (
                      <div className="p-3 bg-rose-50/30 border border-rose-100/50 rounded-2xl text-xs flex items-start gap-2">
                        <span className="text-rose-500 font-bold text-sm shrink-0">⚠️</span>
                        <div>
                          <p className="font-extrabold text-rose-800 text-[11px]">Câu sai nhiều nhất: Câu {lowestCorrectQuestion.index}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 font-medium line-clamp-2">"{lowestCorrectQuestion.questionText}" ({lowestCorrectQuestion.correctRate}% đúng)</p>
                        </div>
                      </div>
                    )}

                    {highestCorrectQuestion && (
                      <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-xs flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-sm shrink-0">🏆</span>
                        <div>
                          <p className="font-extrabold text-emerald-800 text-[11px]">Câu đúng nhiều nhất: Câu {highestCorrectQuestion.index}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 font-medium line-clamp-2">"{highestCorrectQuestion.questionText}" ({highestCorrectQuestion.correctRate}% đúng)</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* DETAILED STUDENT RESULTS TABLE WITH FILTERS */}
          <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xs space-y-4 p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">
                  Danh sách làm bài học sinh ({reportData.classInfo.name})
                </h3>
                <p className="text-slate-500 text-xs font-medium mt-0.5">
                  Hiển thị {filteredStudentResults.length} / {reportData.studentResults.length} học sinh
                </p>
              </div>

              {/* Filters for Student Results */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl text-xs font-bold shrink-0">
                  <button
                    onClick={() => setStudentResultFilter("all")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentResultFilter === "all" ? "bg-white text-indigo-700 font-black shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Tất cả ({reportData.studentResults.length})
                  </button>
                  <button
                    onClick={() => setStudentResultFilter("submitted")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentResultFilter === "submitted" ? "bg-white text-emerald-700 font-black shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Đã nộp ({reportData.stats.submissionCount})
                  </button>
                  <button
                    onClick={() => setStudentResultFilter("pass")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentResultFilter === "pass" ? "bg-white text-emerald-700 font-black shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Đạt ≥ 5đ ({reportData.stats.passCount || 0})
                  </button>
                  <button
                    onClick={() => setStudentResultFilter("fail")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentResultFilter === "fail" ? "bg-white text-rose-700 font-black shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Chưa đạt &lt; 5đ ({reportData.stats.failCount || 0})
                  </button>
                  <button
                    onClick={() => setStudentResultFilter("pending")}
                    className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                      studentResultFilter === "pending" ? "bg-white text-amber-700 font-black shadow-xs" : "text-slate-600"
                    }`}
                  >
                    Chưa làm ({reportData.stats.pendingCount})
                  </button>
                </div>

                {/* Search student */}
                <div className="relative min-w-[180px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Tìm tên hoặc mã HS..."
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium text-slate-800 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <th className="py-3.5 px-4">STT</th>
                    <th className="py-3.5 px-4">Mã học sinh</th>
                    <th className="py-3.5 px-4">Họ và tên</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-center">Thời gian làm</th>
                    <th className="py-3.5 px-4 text-center">Đúng / Sai</th>
                    <th className="py-3.5 px-4 text-center">Điểm số</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudentResults.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-medium text-xs">
                        Không có học sinh nào phù hợp với bộ lọc hiện tại.
                      </td>
                    </tr>
                  ) : (
                    filteredStudentResults.map((std: any, idx: number) => {
                      const isSubmitted = std.status === "Đã nộp";
                      return (
                        <tr key={std.studentId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-600">{std.studentCode}</td>
                          <td className="py-3.5 px-4 text-slate-900 font-extrabold text-sm">{std.studentName}</td>
                          <td className="py-3.5 px-4">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                              isSubmitted
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                                : "bg-amber-50 text-amber-700 border border-amber-100"
                            }`}>
                              {std.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-bold">
                            {isSubmitted && std.duration !== null ? `${Math.floor(std.duration / 60)}p ${std.duration % 60}s` : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isSubmitted ? (
                              <span className="font-bold text-xs">
                                <strong className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{std.correctCount} Đúng</strong>
                                <span className="text-slate-300 mx-1">/</span>
                                <strong className="text-rose-500 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{std.wrongCount} Sai</strong>
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            {isSubmitted ? (
                              <span className={`font-black text-sm px-3 py-1 rounded-xl border ${
                                std.score >= 8
                                  ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                  : std.score >= 5
                                  ? "text-indigo-700 bg-indigo-50 border-indigo-200"
                                  : "text-rose-700 bg-rose-50 border-rose-200"
                              }`}>
                                {std.score}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {isSubmitted ? (
                              <button
                                onClick={() => handleViewStudentSubmission(std.submissionId)}
                                className="text-indigo-700 hover:bg-indigo-600 hover:text-white px-3 py-1.5 border border-indigo-100 rounded-xl transition-all inline-flex items-center gap-1 font-black text-[10px] uppercase cursor-pointer active:scale-[0.98]"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                Xem bài làm
                              </button>
                            ) : "—"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED STUDENT EXAM DRILL-DOWN MODAL */}
      {studentSubmissionDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleUp border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">
                  BÀI THI CHI TIẾT HỌC SINH
                </span>
                <h3 className="font-black text-lg text-slate-900 leading-tight mt-2">
                  Khảo sát bài: {studentSubmissionDetail.exam.title}
                </h3>
              </div>
              <button
                onClick={() => setStudentSubmissionDetail(null)}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl bg-white border border-slate-100 cursor-pointer transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Học sinh</span>
                  <p className="text-lg font-black text-slate-900 leading-tight">{studentSubmissionDetail.submission.studentName || "Học sinh"}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block text-right">Điểm số đạt được</span>
                  <p className="text-4xl font-black text-indigo-600 mt-1 leading-none text-right">{studentSubmissionDetail.submission.score}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thời gian nộp</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    {studentSubmissionDetail.submission.submittedAt 
                      ? (() => {
                          try {
                            const d = new Date(studentSubmissionDetail.submission.submittedAt);
                            return isNaN(d.getTime()) ? "Vừa xong" : d.toLocaleString("vi-VN");
                          } catch (e) {
                            return "Vừa xong";
                          }
                        })()
                      : "Vừa xong"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tỉ lệ trả lời</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    Đúng {studentSubmissionDetail.submission.correctCount ?? 0} / Sai {studentSubmissionDetail.submission.wrongCount ?? 0} câu
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {(studentSubmissionDetail.questions || []).map((q: any, idx: number) => {
                  const letterMapping = ["A", "B", "C", "D"];
                  const optionsList = Array.isArray(q.options) ? q.options : [];
                  return (
                    <div
                      key={q.id || idx}
                      className={`border p-5 rounded-[24px] space-y-4 ${
                        q.isCorrect 
                          ? "bg-emerald-50/20 border-emerald-100" 
                          : "bg-rose-50/10 border-rose-100"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-white font-black w-6 h-6 rounded-full flex items-center justify-center text-xs">
                          {idx + 1}
                        </span>
                        <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                          q.isCorrect 
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200" 
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}>
                          {q.isCorrect ? "Đúng" : "Sai"}
                        </span>
                      </div>

                      <p className="font-black text-slate-900 leading-relaxed text-sm">{q.question}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {optionsList.map((optItem: any, oIdx: number) => {
                          const letter = letterMapping[oIdx] || String.fromCharCode(65 + oIdx);
                          const optText = typeof optItem === "object" && optItem !== null ? (optItem.text || "") : String(optItem || "");
                          const isStudentSelected = q.studentAnswer === letter;
                          const isCorrectAnswer = q.correctAnswer === letter;

                          let containerStyle = "bg-white border-slate-100 text-slate-600";
                          let badgeStyle = "bg-slate-100 text-slate-500";

                          if (isCorrectAnswer) {
                            containerStyle = "bg-emerald-50 border-emerald-200 text-emerald-900 font-black shadow-xs";
                            badgeStyle = "bg-emerald-500 text-white";
                          } else if (isStudentSelected && !q.isCorrect) {
                            containerStyle = "bg-rose-50 border-rose-200 text-rose-900 font-black shadow-xs";
                            badgeStyle = "bg-rose-500 text-white";
                          }

                          return (
                            <div key={oIdx} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs ${containerStyle}`}>
                              <span className={`w-6 h-6 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${badgeStyle}`}>
                                {letter}
                              </span>
                              <span>{optText}</span>
                              {isStudentSelected && (
                                <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-slate-900/10 px-2 py-0.5 rounded-lg shrink-0">
                                  {q.isCorrect ? "✅ Em đã chọn" : "❌ Em đã chọn"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {!q.isCorrect && (
                        <div className="bg-rose-50 border border-rose-100/80 rounded-2xl p-4 text-xs space-y-2">
                          <p className="text-rose-700 font-extrabold flex items-center gap-1.5">
                            <span className="text-base">❌</span> 
                            <span>Học sinh chọn đáp án sai: <strong>{q.studentAnswer || "Bỏ trống"}</strong></span>
                          </p>
                          <p className="text-slate-700 font-medium">
                            💡 Đáp án đúng là: <strong className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-mono">{q.correctAnswer}</strong>
                          </p>
                          {q.explanation && (
                            <p className="text-slate-600 leading-relaxed font-medium">
                              📖 <strong>Giải thích kiến thức:</strong> {q.explanation}
                            </p>
                          )}
                        </div>
                      )}

                      {q.isCorrect && q.explanation && (
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/50 text-xs space-y-1.5 text-slate-600 leading-relaxed">
                          <p>💡 <strong>Giải thích chi tiết:</strong> {q.explanation}</p>
                          <p>⭐ <strong>Kiến thức cốt lõi:</strong> <span className="text-indigo-800 font-bold bg-indigo-100/30 px-1.5 py-0.5 rounded-lg">{q.keyPoint}</span></p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-end gap-2 rounded-b-[32px]">
              <button
                onClick={() => setStudentSubmissionDetail(null)}
                className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black px-6 py-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Đóng chi tiết bài làm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
