import React, { useState, useEffect } from "react";
import { Exam, Class } from "../types";
import { 
  FileText, Trash2, Copy, Send, Eye, Edit3, X, 
  Calendar, Check, AlertCircle, RefreshCw, Layers 
} from "lucide-react";
import {
  fsGetExams,
  fsGetClasses,
  fsDeleteExam,
  fsCopyExam,
  fsCreateAssignment,
  fsUpdateExamTitle
} from "../lib/firestoreData";

// Helper function to normalize grade for filtering & display
function getDisplayGrade(gradeStr?: string, titleStr?: string): string {
  if (gradeStr) {
    const trimmed = gradeStr.trim();
    if (trimmed === "Tin học 3" || trimmed === "Tin học 4" || trimmed === "Tin học 5") return trimmed;
    if (trimmed === "Lớp 3" || trimmed.includes("3")) return "Tin học 3";
    if (trimmed === "Lớp 4" || trimmed.includes("4")) return "Tin học 4";
    if (trimmed === "Lớp 5" || trimmed.includes("5")) return "Tin học 5";
  }
  if (titleStr) {
    if (titleStr.includes("3")) return "Tin học 3";
    if (titleStr.includes("4")) return "Tin học 4";
    if (titleStr.includes("5")) return "Tin học 5";
  }
  return "Tin học 3";
}

interface ExamBankProps {
  onAssignCreated?: () => void;
}

export default function ExamBank({ onAssignCreated }: ExamBankProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Grade filter state
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("Tất cả");

  // Modals / Selection states
  const [viewingExam, setViewingExam] = useState<Exam | null>(null);
  const [assigningExam, setAssigningExam] = useState<Exam | null>(null);

  // Edit Title state
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  // Giao bài Form State
  const [selectedClassId, setSelectedClassId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    fetchExamsAndClasses();
  }, []);

  const fetchExamsAndClasses = async () => {
    setLoading(true);
    setError(null);
    try {
      const [examsData, classesData] = await Promise.all([
        fsGetExams(),
        fsGetClasses(),
      ]);

      setExams(examsData);
      setClasses(classesData);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditTitle = (exam: Exam) => {
    setEditingExam(exam);
    setEditingTitle(exam.title);
  };

  const handleSaveExamTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExam) return;

    const cleanTitle = editingTitle.trim();
    if (!cleanTitle) {
      setError("Tên đề thi không được để trống!");
      return;
    }

    setSavingTitle(true);
    setError(null);

    try {
      let updated = false;
      try {
        const res = await fetch(`/api/exams/${editingExam.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: cleanTitle })
        });
        if (res.ok) {
          updated = true;
        }
      } catch (err) {
        console.warn("API update exam title failed, fallback to Firestore:", err);
      }

      if (!updated) {
        await fsUpdateExamTitle(editingExam.id, cleanTitle);
      }

      setExams((prevExams) =>
        prevExams.map((ex) => (ex.id === editingExam.id ? { ...ex, title: cleanTitle } : ex))
      );

      if (viewingExam && viewingExam.id === editingExam.id) {
        setViewingExam((prev) => (prev ? { ...prev, title: cleanTitle } : null));
      }

      if (assigningExam && assigningExam.id === editingExam.id) {
        setAssigningExam((prev) => (prev ? { ...prev, title: cleanTitle } : null));
      }

      setSuccess(`Đã cập nhật tên đề kiểm tra thành "${cleanTitle}"!`);
      setTimeout(() => setSuccess(null), 3500);

      setEditingExam(null);
      setEditingTitle("");
    } catch (err: any) {
      setError(err.message || "Lỗi khi cập nhật tên đề thi.");
    } finally {
      setSavingTitle(false);
    }
  };

  const handleDeleteExam = async (examId: string, title: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa đề thi "${title}" không? Toàn bộ lịch giao đề và kết quả làm bài tương ứng cũng sẽ bị xóa.`)) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let deleted = false;
      try {
        const res = await fetch(`/api/exams/${examId}`, { method: "DELETE" });
        if (res.ok) deleted = true;
      } catch (err) {
        console.warn("API delete exam failed, using Firestore:", err);
      }

      if (!deleted) {
        await fsDeleteExam(examId);
      }

      setSuccess("Xóa đề thi thành công!");
      setTimeout(() => setSuccess(null), 3000);
      await fetchExamsAndClasses();
    } catch (err: any) {
      setError(err.message || "Lỗi khi xóa đề");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyExam = async (examId: string) => {
    setLoading(true);
    setError(null);
    try {
      let copied = false;
      try {
        const res = await fetch(`/api/exams/${examId}/copy`, { method: "POST" });
        const cType = res.headers.get("content-type");
        if (res.ok && cType?.includes("application/json")) {
          copied = true;
        }
      } catch (err) {
        console.warn("API copy exam failed, using Firestore:", err);
      }

      if (!copied) {
        await fsCopyExam(examId);
      }

      setSuccess("Đã sao chép đề thi thành bản sao mới!");
      setTimeout(() => setSuccess(null), 3000);
      await fetchExamsAndClasses();
    } catch (err: any) {
      setError(err.message || "Lỗi khi nhân bản đề");
    } finally {
      setLoading(false);
    }
  };

  const handleAssignExam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningExam || !selectedClassId || !startTime || !endTime) {
      setError("Vui lòng điền đầy đủ các thông số giao đề!");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let assigned = false;
      const startIso = new Date(startTime).toISOString();
      const endIso = new Date(endTime).toISOString();

      try {
        const res = await fetch("/api/assignments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examId: assigningExam.id,
            classId: selectedClassId,
            startTime: startIso,
            endTime: endIso,
            teacherId: assigningExam.teacherId || "teacher-default"
          }),
        });

        const cType = res.headers.get("content-type");
        if (res.ok && cType?.includes("application/json")) {
          assigned = true;
        }
      } catch (err) {
        console.warn("API assign exam failed, using Firestore:", err);
      }

      if (!assigned) {
        await fsCreateAssignment(assigningExam.id, selectedClassId, startIso, endIso, assigningExam.teacherId || "teacher-default");
      }

      setSuccess("Đã giao đề kiểm tra thành công tới lớp học!");
      setTimeout(() => setSuccess(null), 4000);
      setAssigningExam(null);
      setSelectedClassId("");
      setStartTime("");
      setEndTime("");
      
      if (onAssignCreated) onAssignCreated();
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi giao bài");
    } finally {
      setLoading(false);
    }
  };

  // Pre-fill local date times
  const setupAssigningModal = (exam: Exam) => {
    setAssigningExam(exam);
    if (classes.length > 0) {
      setSelectedClassId(classes[0].id);
    }
    const now = new Date();
    // Start now
    const nowString = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    // End tomorrow
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowString = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);

    setStartTime(nowString);
    setEndTime(tomorrowString);
  };

  const filteredExams = exams.filter((exam) => {
    if (selectedGradeFilter === "Tất cả" || !selectedGradeFilter) return true;
    return getDisplayGrade(exam.grade, exam.title) === selectedGradeFilter;
  });

  return (
    <div id="exam-bank-root" className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <span className="bg-indigo-100 p-2 rounded-2xl text-indigo-600 block shadow-sm">
              <Layers className="w-7 h-7" />
            </span>
            Kho Đề Kiểm Tra ({exams.length})
          </h1>
          <p className="text-slate-500 font-medium mt-1">Danh sách các đề thi bạn đã thiết kế biên soạn, sẵn sàng để phục vụ giảng dạy.</p>
        </div>

        {/* Grade Filter Selector */}
        <div className="bg-white border border-slate-200/80 shadow-xs p-2.5 rounded-2xl flex items-center gap-3 self-start sm:self-auto">
          <label htmlFor="select-bank-grade-filter" className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1.5 whitespace-nowrap">
            Khối lớp:
          </label>
          <select
            id="select-bank-grade-filter"
            value={selectedGradeFilter}
            onChange={(e) => setSelectedGradeFilter(e.target.value)}
            className="bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-indigo-900 rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-all min-w-[140px]"
          >
            <option value="Tất cả">Tất cả ({exams.length})</option>
            <option value="Tin học 3">Tin học 3</option>
            <option value="Tin học 4">Tin học 4</option>
            <option value="Tin học 5">Tin học 5</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-emerald-800 font-bold text-xs">{success}</span>
        </div>
      )}

      {exams.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-sm">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4 bg-slate-50 p-3 rounded-2xl" />
          <h3 className="font-black text-slate-800 text-lg">Chưa có đề thi nào trong kho</h3>
          <p className="text-slate-500 font-medium text-sm mt-2 max-w-sm mx-auto leading-relaxed">
            Hãy lựa chọn tab "Tạo đề AI" để thiết kế đề kiểm tra thông minh đầu tiên của mình cùng trợ lý AI!
          </p>
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center shadow-sm space-y-4">
          <FileText className="w-16 h-16 text-amber-300 mx-auto bg-amber-50 p-3 rounded-2xl" />
          <div>
            <h3 className="font-black text-slate-800 text-lg">Không tìm thấy đề thi thuộc khối "{selectedGradeFilter}"</h3>
            <p className="text-slate-500 font-medium text-sm mt-1">
              Bạn hiện chưa có bài kiểm tra nào được xếp loại khối này trong tổng số {exams.length} đề thi.
            </p>
          </div>
          <button
            onClick={() => setSelectedGradeFilter("Tất cả")}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            Hiển thị tất cả ({exams.length} đề)
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white border border-slate-100 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/40 rounded-[28px] p-6 transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex justify-between items-start gap-2">
                  <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-xl">
                    {getDisplayGrade(exam.grade, exam.title)}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      id={`btn-edit-title-${exam.id}`}
                      onClick={() => handleStartEditTitle(exam)}
                      className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100/70 p-2 rounded-xl bg-indigo-50 border border-indigo-100 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold shadow-xs"
                      title="Chỉnh sửa tên đề thi"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa tên</span>
                    </button>
                    <button
                      onClick={() => handleCopyExam(exam.id)}
                      className="text-slate-400 hover:text-indigo-600 p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-all cursor-pointer"
                      title="Nhân bản đề"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteExam(exam.id, exam.title)}
                      className="text-slate-400 hover:text-rose-600 p-2 rounded-xl bg-slate-50 hover:bg-rose-50 transition-all cursor-pointer"
                      title="Xóa đề thi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-2 group">
                  <h3 className="font-black text-slate-900 text-lg leading-tight hover:text-indigo-600 transition-all flex-1">
                    {exam.title}
                  </h3>
                  <button
                    onClick={() => handleStartEditTitle(exam)}
                    className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer shrink-0"
                    title="Chỉnh sửa tên đề kiểm tra"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs font-medium text-slate-500 space-y-1.5 pt-2">
                  <p>Chủ đề chính: <strong className="text-slate-800 font-bold">{exam.topic}</strong></p>
                  <p>Số lượng câu: <strong className="text-slate-800 font-bold">{exam.questions?.length || 0} câu hỏi</strong></p>
                  <p>Thời gian làm: <strong className="text-slate-800 font-bold">{exam.duration} phút</strong></p>
                  <p>Ngày thiết kế: <strong className="text-slate-800 font-bold">{new Date(exam.createdAt).toLocaleDateString("vi-VN")}</strong></p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-50">
                <button
                  onClick={() => setViewingExam(exam)}
                  className="border border-slate-200 hover:bg-slate-50 hover:border-slate-300 text-slate-600 font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <Eye className="w-4 h-4" />
                  Xem chi tiết
                </button>
                <button
                  id={`btn-assign-exam-${exam.id}`}
                  onClick={() => setupAssigningModal(exam)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md shadow-indigo-100 active:scale-[0.98]"
                >
                  <Send className="w-4 h-4" />
                  Giao đề
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW EXAM MODAL */}
      {viewingExam && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-fadeIn border border-slate-100">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 p-6 bg-slate-50/50 rounded-t-[32px]">
              <div className="flex-1 pr-4">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-xl">
                  {getDisplayGrade(viewingExam.grade, viewingExam.title)}
                </span>
                <div className="flex items-center gap-2 mt-2.5">
                  <h3 className="font-black text-xl text-slate-900 leading-snug">{viewingExam.title}</h3>
                  <button
                    id="btn-edit-title-view-modal"
                    onClick={() => handleStartEditTitle(viewingExam)}
                    className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-xl border border-indigo-100 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                    title="Sửa tên đề thi"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Sửa tên</span>
                  </button>
                </div>
              </div>
              <button
                onClick={() => setViewingExam(null)}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl bg-white border border-slate-100 cursor-pointer shadow-xs transition-colors shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-3 gap-4 bg-indigo-50/40 border border-indigo-100/50 p-4 rounded-2xl text-center text-xs font-bold text-indigo-900">
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Chủ đề chính</span>
                  <strong className="text-slate-800 text-sm">{viewingExam.topic}</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Số câu hỏi</span>
                  <strong className="text-slate-800 text-sm">{viewingExam.questions?.length || 0} câu</strong>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Thời gian</span>
                  <strong className="text-slate-800 text-sm">{viewingExam.duration} phút</strong>
                </div>
              </div>

              <div className="space-y-6">
                <h4 className="font-black text-slate-800 text-sm uppercase tracking-wider border-b border-slate-50 pb-2">Danh sách các câu hỏi của đề</h4>
                {viewingExam.questions?.map((q, qIdx) => (
                  <div key={q.id} className="border border-slate-100 rounded-[24px] p-5 space-y-4 bg-slate-50/30">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-900 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                        {qIdx + 1}
                      </span>
                      <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase">
                        {q.difficulty}
                      </span>
                    </div>

                    <p className="font-black text-slate-900 text-sm leading-relaxed">{q.question}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {q.options.map((opt, oIdx) => {
                        const letter = ["A", "B", "C", "D"][oIdx];
                        const isCorrect = q.correctAnswer === letter;
                        return (
                          <div
                            key={oIdx}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${
                              isCorrect
                                ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-extrabold shadow-sm"
                                : "bg-white border-slate-100 text-slate-600"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                                isCorrect
                                  ? "bg-emerald-500 text-white shadow-sm"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {letter}
                            </span>
                            <span>{opt}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r-2xl space-y-1.5 text-xs text-slate-600 leading-relaxed">
                      <p>
                        💡 <strong>Lời giải thích chi tiết:</strong> {q.explanation}
                      </p>
                      <p>
                        ⭐ <strong>Học sinh lớp Tin tiểu học ghi nhớ:</strong>{" "}
                        <span className="text-indigo-800 font-bold bg-indigo-100/50 px-1.5 py-0.5 rounded-lg">{q.keyPoint}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50/50 flex justify-end gap-2 rounded-b-[32px]">
              <button
                onClick={() => setViewingExam(null)}
                className="bg-slate-900 hover:bg-slate-950 text-white text-xs font-black px-6 py-3 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
              >
                Đóng hộp thoại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN EXAM MODAL */}
      {assigningExam && (
        <div id="modal-assign-exam" className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-scaleUp border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-slate-50/50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                Lên lịch giao đề kiểm tra
              </h3>
              <button
                onClick={() => setAssigningExam(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-xl border border-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignExam} className="p-6 space-y-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Đề đang được giao</span>
                <strong className="text-slate-900 text-xs line-clamp-2 mt-1 leading-normal">{assigningExam.title}</strong>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Chọn lớp học nhận đề</label>
                {classes.length === 0 ? (
                  <div className="text-rose-600 text-xs font-bold py-2">
                    🚨 Chưa có lớp học nào! Hãy sang mục quản lý lớp học để tạo trước.
                  </div>
                ) : (
                  <select
                    value={selectedClassId}
                    onChange={(e) => setSelectedClassId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Sĩ số: {c.students?.length || 0} em)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian bắt đầu làm</label>
                <input
                  type="datetime-local"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời hạn nộp bài</label>
                <input
                  type="datetime-local"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 text-xs">
                <button
                  type="button"
                  onClick={() => setAssigningExam(null)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold py-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-assign"
                  type="submit"
                  disabled={classes.length === 0 || loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-3.5 rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Xác nhận giao
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EXAM TITLE MODAL */}
      {editingExam && (
        <div id="modal-edit-exam-title" className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-[32px] w-full max-w-md shadow-2xl animate-scaleUp border border-slate-100 overflow-hidden">
            <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-slate-50/50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-indigo-600" />
                Sửa tên đề kiểm tra
              </h3>
              <button
                type="button"
                onClick={() => setEditingExam(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 bg-white rounded-xl border border-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExamTitle} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Tên đề kiểm tra mới
                </label>
                <input
                  id="input-edit-exam-title"
                  type="text"
                  required
                  autoFocus
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  placeholder="Nhập tên mới cho đề kiểm tra..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl text-[11px] text-indigo-800 leading-relaxed font-medium">
                ℹ️ <strong>Đồng bộ tự động:</strong> Tên đề mới sẽ được cập nhật đồng bộ ở kho đề, lịch giao bài, báo cáo kết quả và giao diện làm bài của học sinh mà không làm thay đổi câu hỏi, đáp án hay điểm số.
              </div>

              <div className="flex gap-3 pt-3 text-xs">
                <button
                  type="button"
                  id="btn-cancel-edit-title"
                  onClick={() => setEditingExam(null)}
                  className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-extrabold py-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
                >
                  Hủy
                </button>
                <button
                  id="btn-save-exam-title"
                  type="submit"
                  disabled={savingTitle || !editingTitle.trim()}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black py-3.5 rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  {savingTitle && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Lưu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
