import React, { useState, useEffect } from "react";
import { 
  Award, ArrowLeft, BarChart2, CheckCircle2, XCircle, 
  Clock, Eye, User, Calendar, RefreshCw, AlertCircle 
} from "lucide-react";

interface TeacherReportScreenProps {
  teacherId: string;
}

export default function TeacherReportScreen({ teacherId }: TeacherReportScreenProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [reportData, setReportData] = useState<any | null>(null);
  
  // Drill-down student exam view
  const [studentSubmissionDetail, setStudentSubmissionDetail] = useState<any | null>(null);

  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAssignments();
  }, [teacherId]);

  const fetchAssignments = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/assignments/detailed?teacherId=${teacherId}`);
      if (!res.ok) throw new Error("Không thể tải danh sách bài kiểm tra đã giao.");
      const data = await res.json();
      setAssignments(data);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải dữ liệu.");
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
    try {
      const res = await fetch(`/api/reports/assignment/${id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Không thể tải báo cáo lớp học.");
      }
      const data = await res.json();
      setReportData(data);
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải báo cáo.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewStudentSubmission = async (submissionId: string) => {
    setSubLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/result/${submissionId}`);
      if (!res.ok) throw new Error("Không thể tải chi tiết bài thi của học sinh.");
      const data = await res.json();
      setStudentSubmissionDetail(data);
    } catch (err: any) {
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
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Lỗi khi hủy giao bài.");
      setSelectedAssignmentId(null);
      setReportData(null);
      await fetchAssignments();
    } catch (err: any) {
      setError(err.message || "Có lỗi xảy ra.");
    } finally {
      setLoading(false);
    }
  };

  // Find question with highest and lowest correct rates
  const qa = reportData?.questionAnalysis || [];
  const lowestCorrectQuestion = qa.length > 0 
    ? [...qa].sort((a, b) => a.correctRate - b.correctRate)[0]
    : null;
  const highestCorrectQuestion = qa.length > 0
    ? [...qa].sort((a, b) => b.correctRate - a.correctRate)[0]
    : null;

  return (
    <div id="teacher-report-root" className="space-y-8 animate-fadeIn">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="bg-indigo-100 p-2 rounded-2xl text-indigo-600 block shadow-sm">
              <BarChart2 className="w-7 h-7" />
            </span>
            Báo cáo Kết quả Học tập
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            Theo dõi sát sao điểm số, tỉ lệ đúng sai và mức độ hiểu bài của các em học sinh tiểu học.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs">{error}</span>
        </div>
      )}

      {(loading || detailLoading || subLoading) && (
        <div className="p-12 text-center bg-white border border-slate-100 rounded-[32px] flex flex-col items-center justify-center gap-3">
          <RefreshCw className="w-10 h-10 animate-spin text-indigo-600" />
          <span className="text-slate-500 font-bold text-sm">Đang đồng bộ dữ liệu kết quả mới nhất từ học sinh...</span>
        </div>
      )}

      {!loading && !detailLoading && !selectedAssignmentId && (
        // LIST ASSIGNMENTS TO REPORT
        <div className="space-y-6">
          <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">Chọn đợt giao bài cần xem báo cáo</h2>
          {assignments.length === 0 ? (
            <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-sm">
              <Calendar className="w-16 h-16 text-slate-300 mx-auto mb-4 bg-slate-50 p-3 rounded-2xl" />
              <h3 className="font-black text-slate-800 text-lg">Chưa có bài kiểm tra nào được giao</h3>
              <p className="text-slate-500 font-medium text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                Khi thầy cô giao đề kiểm tra cho bất kỳ lớp học nào, danh sách đợt kiểm tra và thống kê chi tiết sẽ xuất hiện ngay tại đây.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {assignments.map((asg) => (
                <div
                  key={asg.id}
                  className="bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/40 rounded-[28px] p-6 transition-all flex flex-col justify-between space-y-4 shadow-sm"
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
                    </div>

                    <h3 className="font-black text-slate-900 text-base leading-tight hover:text-indigo-600 transition-all line-clamp-2">
                      {asg.examTitle}
                    </h3>

                    <div className="text-xs font-medium text-slate-500 space-y-1.5 pt-2">
                      <p>Lớp giao bài: <strong className="text-slate-800 font-bold">{asg.className}</strong></p>
                      <p>Sĩ số học sinh: <strong className="text-slate-800 font-bold">{asg.totalStudents} em</strong></p>
                      <p>Số bài đã nộp: <strong className="text-indigo-600 font-black bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{asg.submissionCount}</strong> bài</p>
                      <p>Hạn cuối nộp: <strong className="text-slate-800 font-bold">{new Date(asg.endTime).toLocaleString("vi-VN")}</strong></p>
                    </div>
                  </div>

                  <button
                    id={`btn-view-report-${asg.id}`}
                    onClick={() => handleSelectAssignment(asg.id)}
                    className="w-full text-center border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-600 hover:text-white text-indigo-700 font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                  >
                    Xem báo cáo lớp học
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAILED REPORT VIEW */}
      {selectedAssignmentId && reportData && !detailLoading && (
        <div className="space-y-6 animate-fadeIn">
          {/* Back button & Action */}
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
              Quay lại danh sách báo cáo
            </button>

            <button
              onClick={() => handleDeleteAssignment(reportData.assignment.id)}
              className="border border-rose-200 hover:bg-rose-50 text-rose-600 text-xs font-black px-4 py-3 rounded-2xl transition-all cursor-pointer active:scale-[0.98]"
            >
              Hủy đợt giao đề này
            </button>
          </div>

          {/* Report Meta Info */}
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-xs space-y-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">BÁO CÁO CHI TIẾT</span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 leading-tight pt-1">{reportData.exam.title}</h2>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1">
              <span>Lớp giao bài: <strong className="text-slate-800">{reportData.classInfo.name}</strong></span>
              <span>Tổng số câu hỏi: <strong className="text-slate-800">{reportData.exam.questionCount}</strong> câu</span>
              <span>Trạng thái: <strong className="text-slate-800">{reportData.assignment.status}</strong></span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Điểm TB</span>
              <strong className="text-3xl font-black text-indigo-600 block leading-tight">{reportData.stats.averageScore}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Thang điểm 10</span>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Đã nộp</span>
              <strong className="text-3xl font-black text-emerald-600 block leading-tight">
                {reportData.stats.submissionCount}/{reportData.classInfo.totalStudents}
              </strong>
              <span className="text-[10px] text-slate-400 font-bold block">Học sinh hoàn thành</span>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Chưa làm</span>
              <strong className="text-3xl font-black text-amber-500 block leading-tight">{reportData.stats.pendingCount}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Học sinh chưa nộp</span>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Điểm cao nhất</span>
              <strong className="text-3xl font-black text-indigo-700 block leading-tight">{reportData.stats.maxScore}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Đạt tối đa</span>
            </div>
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs text-center space-y-1 col-span-2 lg:col-span-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Điểm thấp nhất</span>
              <strong className="text-3xl font-black text-slate-700 block leading-tight">{reportData.stats.minScore}</strong>
              <span className="text-[10px] text-slate-400 font-bold block">Cần kèm cặp thêm</span>
            </div>
          </div>

          {/* Advanced Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left/Main Column: Question Analysis */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-indigo-600" />
                  Phân tích chi tiết từng câu hỏi
                </h3>
                <span className="text-[10px] text-slate-400 font-bold">Thống kê dựa trên bài nộp</span>
              </div>
              
              {reportData.questionAnalysis && reportData.questionAnalysis.length > 0 ? (
                <div className="space-y-4">
                  {reportData.questionAnalysis.map((q: any) => {
                    const needsReview = q.correctRate < 60;
                    return (
                      <div key={q.id} className="border border-slate-100 rounded-2xl p-4 space-y-2 hover:border-indigo-100 transition-colors bg-slate-50/20">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-slate-900 text-white font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
                              {q.index}
                            </span>
                            <span className="font-extrabold text-xs text-slate-800 line-clamp-1">{q.questionText}</span>
                          </div>
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-lg ${
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
                          <span>Đáp án đúng: <strong className="text-slate-700 font-mono font-black">{q.correctAnswer}</strong></span>
                        </div>

                        {needsReview && (
                          <div className="mt-2 bg-rose-50/50 border border-rose-100 rounded-xl px-3 py-1.5 flex items-center gap-2 text-rose-700 font-extrabold text-[10px] animate-pulse">
                            <span>⚠️ Câu {q.index} có tỷ lệ đúng thấp ({q.correctRate}%), thầy cô cần ôn tập kỹ lại cho lớp!</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-400 font-bold text-center py-6 text-xs">Chưa có đủ dữ liệu bài nộp để phân tích câu hỏi.</p>
              )}
            </div>

            {/* Right Column: Key Insights / Analytics */}
            <div className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                  <Award className="w-5 h-5 text-indigo-600" />
                  Đánh giá chung
                </h3>
              </div>

              <div className="space-y-4">
                {/* Completion rate progress */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Tỉ lệ hoàn thành</span>
                    <span className="text-indigo-600 font-black">{reportData.stats.completionRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reportData.stats.completionRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Đã hoàn thành {reportData.stats.submissionCount} trên tổng số {reportData.classInfo.totalStudents} học sinh.
                  </p>
                </div>

                {/* Average correct answer rate progress */}
                <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold">
                    <span className="text-slate-500">Tỉ lệ trả lời đúng TB</span>
                    <span className="text-emerald-600 font-black">{reportData.stats.averageCorrectRate}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                      style={{ width: `${reportData.stats.averageCorrectRate}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold">
                    Tỷ lệ chọn đáp án chính xác trung bình trên toàn bộ đề thi.
                  </p>
                </div>

                {/* Question level insights */}
                {reportData.questionAnalysis && reportData.questionAnalysis.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Điểm nhấn đáng lưu ý</h4>
                    
                    {lowestCorrectQuestion && (
                      <div className="p-3 bg-rose-50/30 border border-rose-100/50 rounded-2xl text-xs flex items-start gap-2">
                        <span className="text-rose-500 font-bold text-sm">⚠️</span>
                        <div>
                          <p className="font-extrabold text-rose-800 text-[11px]">Câu sai nhiều nhất: Câu {lowestCorrectQuestion.index}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 font-medium line-clamp-2">"{lowestCorrectQuestion.questionText}" ({lowestCorrectQuestion.correctRate}% đúng)</p>
                        </div>
                      </div>
                    )}

                    {highestCorrectQuestion && (
                      <div className="p-3 bg-emerald-50/30 border border-emerald-100/50 rounded-2xl text-xs flex items-start gap-2">
                        <span className="text-emerald-500 font-bold text-sm">🏆</span>
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

          {/* Student Results Table */}
          <div className="bg-white border border-slate-100 rounded-[28px] overflow-hidden shadow-xs">
            <div className="bg-slate-50/50 p-5 border-b border-slate-100">
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Danh sách làm bài của học sinh</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold tracking-wider border-b border-slate-100">
                    <th className="py-4 px-5">STT</th>
                    <th className="py-4 px-5">Mã học sinh</th>
                    <th className="py-4 px-5">Họ và tên</th>
                    <th className="py-4 px-5">Trạng thái</th>
                    <th className="py-4 px-5 text-center">Thời gian làm</th>
                    <th className="py-4 px-5 text-center">Số câu Đúng/Sai</th>
                    <th className="py-4 px-5 text-center">Điểm số</th>
                    <th className="py-4 px-5 text-right">Chi tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {reportData.studentResults.map((std: any, idx: number) => {
                    const isSubmitted = std.status === "Đã nộp";
                    return (
                      <tr key={std.studentId} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-4 px-5 text-slate-400 font-bold">{idx + 1}</td>
                        <td className="py-4 px-5 font-mono font-bold text-slate-600">{std.studentCode}</td>
                        <td className="py-4 px-5 text-slate-900 font-extrabold text-sm">{std.studentName}</td>
                        <td className="py-4 px-5">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${
                            isSubmitted
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}>
                            {std.status}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-center text-slate-500 font-bold">
                          {isSubmitted && std.duration !== null ? `${Math.floor(std.duration / 60)}p ${std.duration % 60}s` : "—"}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {isSubmitted ? (
                            <span className="font-bold text-xs">
                              <strong className="text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{std.correctCount} Đúng</strong>
                              <span className="text-slate-300 mx-1.5">/</span>
                              <strong className="text-rose-500 font-black bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{std.wrongCount} Sai</strong>
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-4 px-5 text-center">
                          {isSubmitted ? (
                            <span className={`font-black text-sm px-3 py-1.5 rounded-xl border ${
                              std.score >= 8
                                ? "text-emerald-700 bg-emerald-50 border-emerald-100"
                                : std.score >= 5
                                ? "text-indigo-700 bg-indigo-50 border-indigo-100"
                                : "text-rose-700 bg-rose-50 border-rose-100"
                            }`}>
                              {std.score}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-4 px-5 text-right">
                          {isSubmitted ? (
                            <button
                              onClick={() => handleViewStudentSubmission(std.submissionId)}
                              className="text-indigo-700 hover:bg-indigo-600 hover:text-white p-2 border border-indigo-100 rounded-xl transition-all inline-flex items-center gap-1 font-black text-[10px] uppercase cursor-pointer active:scale-[0.98]"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Xem bài làm
                            </button>
                          ) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED STUDENT EXAM DIAL-IN REVIEW */}
      {studentSubmissionDetail && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[60] overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl animate-scaleUp border border-slate-100">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-lg">BÀI THI CHI TIẾT CỦA HỌC SINH</span>
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

            {/* Body */}
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
                    {new Date(studentSubmissionDetail.submission.submittedAt).toLocaleString("vi-VN")}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tỉ lệ trả lời</span>
                  <p className="text-sm font-bold text-slate-800 mt-1">
                    Đúng {studentSubmissionDetail.submission.correctCount} / Sai {studentSubmissionDetail.submission.wrongCount} câu
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {studentSubmissionDetail.questions.map((q: any, idx: number) => {
                  const letterMapping = ["A", "B", "C", "D"];
                  return (
                    <div
                      key={q.id}
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
                        {q.options.map((opt: string, oIdx: number) => {
                          const letter = letterMapping[oIdx];
                          const isStudentSelected = q.studentAnswer === letter;
                          const isCorrectAnswer = q.correctAnswer === letter;

                          let containerStyle = "bg-white border-slate-100 text-slate-600";
                          let badgeStyle = "bg-slate-100 text-slate-500";

                          if (isCorrectAnswer) {
                            containerStyle = "bg-emerald-50 border-emerald-200 text-emerald-900 font-black shadow-sm";
                            badgeStyle = "bg-emerald-500 text-white";
                          } else if (isStudentSelected && !q.isCorrect) {
                            containerStyle = "bg-rose-50 border-rose-200 text-rose-900 font-black shadow-sm";
                            badgeStyle = "bg-rose-500 text-white";
                          }

                          return (
                            <div key={oIdx} className={`flex items-center gap-3 px-4 py-3 rounded-2xl border text-xs ${containerStyle}`}>
                              <span className={`w-6 h-6 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${badgeStyle}`}>
                                {letter}
                              </span>
                              <span>{opt}</span>
                              {isStudentSelected && (
                                <span className="ml-auto text-[9px] font-black uppercase tracking-wider bg-slate-900/10 px-2 py-0.5 rounded-lg">
                                  {q.isCorrect ? "✅ Em đã chọn" : "❌ Em đã chọn"}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Connection with "HỌC TỪ LỖI SAI" */}
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

            {/* Footer */}
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
