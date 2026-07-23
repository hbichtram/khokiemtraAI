import React, { useState, useEffect } from "react";
import Footer from "./Footer";
import { 
  Award, RefreshCw, AlertCircle, ArrowLeft, Check, 
  HelpCircle, Lightbulb, BookOpen, MessageSquare 
} from "lucide-react";
import { doc, getDoc } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";

interface StudentReviewScreenProps {
  submissionId: string;
  onBackToDashboard: () => void;
}

export default function StudentReviewScreen({ submissionId, onBackToDashboard }: StudentReviewScreenProps) {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filtering questions: "all" | "wrong" | "correct"
  const [filterMode, setFilterMode] = useState<"all" | "wrong" | "correct">("all");

  useEffect(() => {
    fetchResult();
  }, [submissionId]);

  const safeFormatDateTime = (dateVal: any) => {
    if (!dateVal) return "Vừa xong";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "Vừa xong";
      return d.toLocaleString("vi-VN");
    } catch (e) {
      return "Vừa xong";
    }
  };

  const fetchResultFromFirestore = async () => {
    const snap = await getDoc(doc(firestoreDb, "appData", "main"));
    if (!snap.exists()) throw new Error("Chưa có dữ liệu hệ thống.");
    const appData = snap.data();
    const submissions = appData.submissions || [];
    const exams = appData.exams || [];

    const sub = submissions.find((s: any) => s.id === submissionId);
    if (!sub) throw new Error("Không tìm thấy kết quả làm bài này.");

    const exam = exams.find((e: any) => e.id === sub.examId);
    if (!exam) throw new Error("Không tìm thấy nội dung đề thi.");

    const questionsList = exam?.questions || [];
    const questionsWithResult = questionsList.map((q: any) => {
      const studentAnswer = sub.answers ? sub.answers[q.id] || "" : "";
      const isCorrect = studentAnswer.toString().toUpperCase() === (q.correctAnswer || "").toString().toUpperCase();
      return {
        ...q,
        studentAnswer,
        isCorrect
      };
    });

    const correctCount = sub.correctCount ?? questionsWithResult.filter((q: any) => q.isCorrect).length;
    const wrongCount = sub.wrongCount ?? (questionsWithResult.length - correctCount);
    const scoreVal = typeof sub.score === "number" ? sub.score : (questionsWithResult.length > 0 ? Math.round((correctCount / questionsWithResult.length) * 100) / 10 : 0);

    setData({
      submission: {
        ...sub,
        score: scoreVal,
        correctCount,
        wrongCount,
        submittedAt: sub.submittedAt || new Date().toISOString()
      },
      exam: {
        title: exam.title || "Bài kiểm tra",
        grade: exam.grade || "Tin học",
        topic: exam.topic || "Tin học"
      },
      questions: questionsWithResult
    });
  };

  const fetchResult = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/student/result/${submissionId}`);
      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const resultData = await res.json();
        setData(resultData);
        return;
      }
      await fetchResultFromFirestore();
    } catch (err: any) {
      try {
        await fetchResultFromFirestore();
      } catch (fsErr) {
        setError("Không thể kết nối đến hệ thống. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 max-w-xl mx-auto shadow-sm">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
        <h3 className="font-black text-slate-800 text-lg">Đang chấm điểm và tổng hợp kết quả...</h3>
        <p className="text-xs font-bold text-slate-400">Đợi xíu nha, hệ thống đang nạp đáp án giải thích chi tiết cho em.</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center text-slate-500 max-w-xl mx-auto shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto animate-bounce" />
        <h3 className="font-black text-slate-800 text-lg">Úp! Lỗi tải kết quả rồi</h3>
        <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-100 leading-relaxed">{error || "Không có dữ liệu"}</p>
        <button
          onClick={onBackToDashboard}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-black px-5 py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-amber-100 active:scale-[0.98]"
        >
          Quay lại trang chính
        </button>
      </div>
    );
  }

  const { submission, exam, questions } = data;
  const isExcellent = submission.score >= 8;
  const isGood = submission.score >= 5 && submission.score < 8;

  // Filter questions based on selected mode
  const filteredQuestions = questions.filter((q: any) => {
    if (filterMode === "wrong") return !q.isCorrect;
    if (filterMode === "correct") return q.isCorrect;
    return true; // all
  });

  return (
    <div id="student-review-root" className="max-w-4xl mx-auto space-y-8 p-2 md:p-4 font-sans animate-fadeIn">
      {/* Back button */}
      <div>
        <button
          onClick={onBackToDashboard}
          className="hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black px-4 py-3 rounded-2xl inline-flex items-center gap-1.5 cursor-pointer bg-white transition-all shadow-xs active:scale-[0.98]"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại bảng học tập của em
        </button>
      </div>

      {/* TOP SCORE BOARD CARD */}
      <div className={`border rounded-[32px] p-6 md:p-8 shadow-sm text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative ${
        isExcellent 
          ? "bg-gradient-to-br from-emerald-50 to-teal-50/50 border-emerald-100" 
          : isGood 
          ? "bg-gradient-to-br from-amber-50 to-orange-50/50 border-amber-100" 
          : "bg-gradient-to-br from-indigo-50 to-blue-50/50 border-indigo-100"
      }`}>
        <div className="space-y-3 flex-1">
          <span className="text-[10px] bg-slate-900 text-white font-black px-3 py-1 rounded-lg uppercase tracking-wider">
            Bảng vàng kết quả
          </span>
          <h1 className="text-xl md:text-2xl font-black text-slate-900 leading-tight">
            {exam.title}
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-bold text-slate-400 pt-1">
            <span>Khối lớp: <strong className="text-slate-700">{exam.grade}</strong></span>
            <span>Chủ đề: <strong className="text-slate-700">{exam.topic}</strong></span>
            <span>Ngày nộp: <strong className="text-slate-700">{safeFormatDateTime(submission.submittedAt)}</strong></span>
          </div>
          <p className="text-sm font-bold text-slate-700 italic pt-2 leading-relaxed">
            {isExcellent 
              ? "🎉 Thật tuyệt vời! Em làm bài xuất sắc lắm. Hãy giữ vững phong độ này nhé!" 
              : isGood 
              ? "👍 Rất tốt! Em đã hiểu bài khá sâu sắc. Hãy ôn tập kỹ câu sai để đạt điểm tối đa nha!" 
              : "💪 Hãy vui lên em nhé! Sai lầm chính là cơ hội tuyệt vời để chúng mình học hỏi và giỏi hơn mỗi ngày!"
            }
          </p>
        </div>

        {/* Large visual score */}
        <div className="shrink-0 bg-white border border-slate-100 shadow-xl rounded-3xl p-5 w-32 h-32 flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">ĐIỂM SỐ</span>
          <strong className="text-4xl font-black text-slate-900 mt-1 leading-none">{submission.score}</strong>
          <span className="text-[10px] text-slate-400 font-bold block mt-1">Thang điểm 10</span>
        </div>
      </div>

      {/* STATS COUNT */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Số câu đúng</span>
          <strong className="text-lg font-black text-emerald-600 block">✅ {submission.correctCount} câu</strong>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Số câu sai</span>
          <strong className="text-lg font-black text-rose-500 block">❌ {submission.wrongCount} câu</strong>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thời gian làm bài</span>
          <strong className="text-base font-black text-slate-700 block pt-0.5">
            ⏱️ {Math.floor(submission.duration / 60)}p {submission.duration % 60}s
          </strong>
        </div>
        <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Tỷ lệ chính xác</span>
          <strong className="text-lg font-black text-indigo-600 block">
            🎯 {questions.length > 0 ? Math.round((submission.correctCount / questions.length) * 100) : 0}%
          </strong>
        </div>
      </div>

      {/* FILTER CONTROL TAB BAR */}
      <div className="bg-slate-100 border border-slate-200/50 p-1.5 rounded-2xl flex flex-col sm:flex-row gap-2 text-xs font-black">
        <button
          onClick={() => setFilterMode("all")}
          className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all ${
            filterMode === "all"
              ? "bg-slate-900 text-white shadow-md"
              : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50"
          }`}
        >
          Tất cả câu hỏi ({questions.length})
        </button>
        <button
          onClick={() => setFilterMode("wrong")}
          className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all ${
            filterMode === "wrong"
              ? "bg-rose-500 text-white shadow-md shadow-rose-100"
              : "text-rose-600 hover:bg-rose-50"
          }`}
        >
          Câu em trả lời SAI (❌ {submission.wrongCount})
        </button>
        <button
          onClick={() => setFilterMode("correct")}
          className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all ${
            filterMode === "correct"
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-100"
              : "text-emerald-700 hover:bg-emerald-50"
          }`}
        >
          Câu em trả lời ĐÚNG (✅ {submission.correctCount})
        </button>
      </div>

      {/* FILTERED QUESTIONS REVIEW LIST */}
      <div className="space-y-6">
        {filteredQuestions.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-[28px] p-12 text-center text-slate-400 font-bold text-sm">
            Không tìm thấy câu hỏi nào thỏa mãn bộ lọc đã chọn em nhé.
          </div>
        ) : (
          filteredQuestions.map((q: any, index: number) => {
            const letterMapping = ["A", "B", "C", "D"];
            return (
              <div
                key={q.id}
                className={`bg-white border rounded-[28px] p-6 shadow-sm space-y-4 relative overflow-hidden ${
                  q.isCorrect 
                    ? "border-slate-100" 
                    : "border-rose-100 bg-rose-50/5"
                }`}
              >
                {/* Question metadata badge */}
                <div className="flex items-center gap-2">
                  <span className="bg-slate-900 text-white text-[10px] font-black w-6 h-6 rounded-full flex items-center justify-center">
                    {index + 1}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                    q.isCorrect
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}>
                    {q.isCorrect ? "ĐÚNG RỒI! 🎉" : "CẦN ÔN TẬP LẠI ❌"}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg font-bold">
                    Khó: {q.difficulty}
                  </span>
                </div>

                {/* Question Text */}
                <h3 className="font-black text-slate-900 text-base md:text-lg leading-relaxed pt-1">
                  {q.question}
                </h3>

                {/* Options visual mapping */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  {q.options.map((opt: string, oIdx: number) => {
                    const letter = letterMapping[oIdx];
                    const isSelected = q.studentAnswer === letter;
                    const isCorrectAnswer = q.correctAnswer === letter;

                    let blockStyle = "bg-white border-slate-100 text-slate-600";
                    let badgeStyle = "bg-slate-100 text-slate-500";
                    let statusLabel = "";

                    if (isCorrectAnswer) {
                      blockStyle = "bg-emerald-50 border-emerald-200 text-emerald-900 font-black shadow-xs";
                      badgeStyle = "bg-emerald-500 text-white";
                      statusLabel = isSelected ? "✅ Em đã chọn đúng" : "✅ Đáp án đúng";
                    } else if (isSelected) {
                      blockStyle = "bg-rose-50 border-rose-200 text-rose-900 font-black shadow-xs";
                      badgeStyle = "bg-rose-500 text-white";
                      statusLabel = "❌ Em đã chọn phương án này";
                    }

                    return (
                      <div
                        key={oIdx}
                        className={`p-4 rounded-2xl border flex items-center gap-3 text-sm transition-all ${blockStyle}`}
                      >
                        <span className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shrink-0 ${badgeStyle}`}>
                          {letter}
                        </span>
                        <span className="font-bold">{opt}</span>
                        {statusLabel && (
                          <span className="ml-auto text-[9px] uppercase font-black tracking-wider bg-slate-900/5 px-2 py-0.5 rounded-lg shrink-0">
                            {statusLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* AI Explanation / Keypoints */}
                <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-4 rounded-r-2xl space-y-2 mt-4 text-xs text-slate-600 leading-relaxed">
                  <p className="flex items-start gap-1.5">
                    <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                    <span>
                      💡 <strong>Thầy cô giải thích:</strong> {q.explanation}
                    </span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Lightbulb className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span>
                      ⭐ <strong>Ghi nhớ cốt lõi:</strong>{" "}
                      <span className="text-indigo-800 font-extrabold bg-indigo-100/50 px-2 py-0.5 rounded-lg">
                        {q.keyPoint}
                      </span>
                    </span>
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom bar */}
      <div className="flex justify-center pt-4">
        <button
          onClick={onBackToDashboard}
          className="bg-slate-900 hover:bg-slate-950 text-white font-extrabold px-6 py-4 rounded-2xl text-xs cursor-pointer shadow-md transition-all active:scale-[0.98]"
        >
          Quay lại trang chính học tập
        </button>
      </div>

      <Footer className="mt-8 pt-6 border-t border-slate-200/60" />
    </div>
  );
}
