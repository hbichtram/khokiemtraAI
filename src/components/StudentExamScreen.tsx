import React, { useState, useEffect, useRef } from "react";
import { Question, QuestionOption, getOptionText, getOptionImage } from "../types";
import { 
  Timer, ChevronLeft, ChevronRight, CheckCircle, 
  HelpCircle, AlertCircle, RefreshCw 
} from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";

interface StudentExamScreenProps {
  assignmentId: string;
  studentId: string;
  onSubmitted: (submissionId: string) => void;
  onBackToDashboard: () => void;
}

export default function StudentExamScreen({ 
  assignmentId, 
  studentId, 
  onSubmitted, 
  onBackToDashboard 
}: StudentExamScreenProps) {
  const [exam, setExam] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // in seconds
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const initialTimeRef = useRef<number>(0);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    console.log("[DEBUG_EXAM_PAGE]", {
      receivedAssignmentId: assignmentId,
      receivedStudentId: studentId
    });
    fetchExam();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const fetchExamFromFirestore = async () => {
    const snap = await getDoc(doc(firestoreDb, "appData", "main"));
    if (!snap.exists()) throw new Error("Không tìm thấy dữ liệu bài kiểm tra trên hệ thống.");
    const data = snap.data();
    const asg = (data.assignments || []).find((a: any) => a.id === assignmentId);
    if (!asg) throw new Error("Không tìm thấy bài kiểm tra được giao.");
    setAssignment(asg);

    const ex = (data.exams || []).find((e: any) => e.id === asg.examId);
    if (!ex || !ex.questions || ex.questions.length === 0) throw new Error("Không tìm thấy đề kiểm tra.");

    setExam(ex);
    setQuestions(ex.questions || []);
    setTimeLeft(ex.duration * 60);
    initialTimeRef.current = ex.duration * 60;

    const saved = localStorage.getItem(`student_answers_${assignmentId}_${studentId}`);
    if (saved) {
      try { setAnswers(JSON.parse(saved)); } catch (e) {}
    }
    startTimer(ex.duration * 60);
  };

  const fetchExam = async () => {
    setLoading(true);
    setError(null);
    try {
      // Step 2: Fetch assignment by assignmentId
      const assignmentRes = await fetch(`/api/assignments/${assignmentId}`);
      if (!assignmentRes.ok) {
        await fetchExamFromFirestore();
        return;
      }
      const contentType = assignmentRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        await fetchExamFromFirestore();
        return;
      }
      const assignmentData = await assignmentRes.json();
      setAssignment(assignmentData);
      
      const examId = assignmentData.examId;
      const classId = assignmentData.classId;

      if (!examId) {
        throw new Error("Bài kiểm tra chưa được liên kết với nội dung đề.");
      }

      // Step 3-4: Fetch exam by examId
      const examRes = await fetch(`/api/exams/${examId}?role=student`);
      if (!examRes.ok) {
        await fetchExamFromFirestore();
        return;
      }
      const examData = await examRes.json();

      if (!examData.questions || examData.questions.length === 0) {
        throw new Error("Đề kiểm tra chưa có câu hỏi.");
      }

      // Step 5: Initialize/Retrieve active exam session
      let startData: any = {};
      try {
        const startRes = await fetch("/api/student/start-exam", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            assignmentId,
            examId,
            classId
          })
        });
        if (startRes.ok && startRes.headers.get("content-type")?.includes("application/json")) {
          startData = await startRes.json();
        }
      } catch (e) {
        console.warn("Notice starting exam session on server:", e);
      }

      setExam(examData);
      setQuestions(examData.questions || []);
      setTimeLeft(examData.duration * 60);
      initialTimeRef.current = examData.duration * 60;

      // Restore saved answers from server or localStorage
      const serverSaved = startData.answers || {};
      const saved = localStorage.getItem(`student_answers_${assignmentId}_${studentId}`);
      let localSaved = {};
      if (saved) {
        try {
          localSaved = JSON.parse(saved);
        } catch (e) {
          console.error("Lỗi khi khôi phục đáp án:", e);
        }
      }

      setAnswers({
        ...serverSaved,
        ...localSaved
      });
      
      // Start Countdown Timer
      startTimer(examData.duration * 60);
    } catch (err: any) {
      try {
        await fetchExamFromFirestore();
      } catch (fsErr) {
        setError("Không thể kết nối đến hệ thống. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const startTimer = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    let currentSecs = seconds;
    intervalRef.current = setInterval(() => {
      currentSecs--;
      setTimeLeft(currentSecs);
      
      if (currentSecs <= 0) {
        clearInterval(intervalRef.current);
        // Auto submit when time runs out
        executeSubmit(true);
      }
    }, 1000);
  };

  const handleSelectOption = (qId: string, optionLetter: string) => {
    setAnswers((prev) => {
      const updated = { ...prev, [qId]: optionLetter };
      // Save locally to session as fallback
      localStorage.setItem(`student_answers_${assignmentId}_${studentId}`, JSON.stringify(updated));

      // Asynchronously synchronize answers to server
      fetch("/api/student/save-progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          answers: updated
        })
      }).catch((err) => console.error("Lỗi đồng bộ tiến trình:", err));

      return updated;
    });
  };

  const handleSubmit = (isAuto = false) => {
    const targetExamId = exam?.id;
    const targetClassId = assignment?.classId;

    console.log("[SUBMIT_CLICKED]", {
      studentId,
      assignmentId,
      examId: targetExamId,
      classId: targetClassId,
      answers
    });

    if (isAuto) {
      executeSubmit(true);
    } else {
      setShowSubmitConfirm(true);
    }
  };

  const executeSubmitInFirestore = async (elapsedSeconds: number, targetExamId: string) => {
    const snap = await getDoc(doc(firestoreDb, "appData", "main"));
    if (!snap.exists()) throw new Error("Chưa có dữ liệu hệ thống.");
    const data = snap.data();
    const submissions = data.submissions || [];
    const exams = data.exams || [];
    const examObj = exams.find((e: any) => e.id === targetExamId) || exam;

    let score = 0;
    let correctCount = 0;
    const questionsList = examObj?.questions || questions || [];
    const totalQ = questionsList.length;

    const details = questionsList.map((q: any) => {
      const studentAns = answers[q.id] || "";
      const isCorrect = studentAns === q.correctAnswer;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        studentAnswer: studentAns,
        correctAnswer: q.correctAnswer,
        isCorrect
      };
    });

    if (totalQ > 0) {
      score = Math.round((correctCount / totalQ) * 100) / 10;
    }

    const newSubId = `sub-${Date.now()}`;
    const studentCodeVal = (window as any).currentUser?.studentCode || (studentId.startsWith("HS") ? studentId : "");
    const newSubmission = {
      id: newSubId,
      assignmentId,
      studentId,
      studentCode: studentCodeVal,
      examId: targetExamId,
      score,
      correctCount,
      wrongCount: totalQ - correctCount,
      totalQuestions: totalQ,
      submittedAt: new Date().toISOString(),
      duration: elapsedSeconds,
      status: "submitted",
      answers,
      details
    };

    submissions.push(newSubmission);
    data.submissions = submissions;

    await setDoc(doc(firestoreDb, "appData", "main"), data);
    return newSubId;
  };

  const executeSubmit = async (isAuto = false) => {
    setShowSubmitConfirm(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSubmitting(true);
    setError(null);

    const elapsedSeconds = initialTimeRef.current - timeLeft;
    const targetExamId = exam?.id || "";

    let submissionId = "";

    try {
      const res = await fetch("/api/student/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          answers,
          duration: elapsedSeconds
        })
      });

      if (res.ok && res.headers.get("content-type")?.includes("application/json")) {
        const result = await res.json();
        submissionId = result.id;
        // Keep Firestore in sync for student & teacher views
        try {
          await executeSubmitInFirestore(elapsedSeconds, targetExamId);
        } catch (fsSyncErr) {
          console.warn("Notice syncing Firestore after API submission:", fsSyncErr);
        }
      } else {
        submissionId = await executeSubmitInFirestore(elapsedSeconds, targetExamId);
      }
    } catch (err) {
      try {
        submissionId = await executeSubmitInFirestore(elapsedSeconds, targetExamId);
      } catch (fsErr) {
        console.error("Submit error:", fsErr);
        alert("Không thể kết nối đến hệ thống. Vui lòng thử lại sau.");
        setError("Gặp sự cố khi nộp bài. Em hãy báo lại thầy cô nhé!");
        setSubmitting(false);
        return;
      }
    }

    // Clean local storage answers
    localStorage.removeItem(`student_answers_${assignmentId}_${studentId}`);

    if (isAuto) {
      alert("Đã hết thời gian làm bài! Hệ thống tự động nộp bài của em thành công.");
    } else {
      alert("Chúc mừng em đã hoàn thành bài kiểm tra! Nhấn OK để xem đáp án giải thích.");
    }

    onSubmitted(submissionId);
    setSubmitting(false);
  };

  const handleExitClick = () => {
    console.log("[EXIT_CLICKED]", {
      studentId,
      assignmentId,
      examId: exam?.id
    });
    setShowExitConfirm(true);
  };

  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3 max-w-xl mx-auto shadow-sm">
        <RefreshCw className="w-10 h-10 animate-spin text-amber-500" />
        <h3 className="font-black text-slate-800 text-lg">Đang chuẩn bị đề kiểm tra...</h3>
        <p className="text-xs font-bold text-slate-400">Các em học sinh đợi một chút nhé, hệ thống đang nạp đề thi.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 text-center text-slate-500 max-w-xl mx-auto shadow-sm space-y-4">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-black text-slate-800 text-lg">Úp! Có lỗi xảy ra mất rồi</h3>
        <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-2xl border border-rose-100 leading-relaxed">{error}</p>
        <button
          onClick={onBackToDashboard}
          className="bg-amber-400 hover:bg-amber-500 text-slate-900 font-black px-5 py-3 rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-amber-100 active:scale-[0.98]"
        >
          Quay lại trang chủ của em
        </button>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answers).length;
  const progressPercent = (answeredCount / totalQuestions) * 100;

  return (
    <div id="student-exam-screen-root" className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-start p-2 md:p-4 font-sans">
      {/* LEFT CONTENT: QUESTIONS VIEW (3/4 width) */}
      <div className="lg:col-span-3 bg-white border border-slate-100 rounded-[32px] shadow-sm overflow-hidden">
        {/* Exam Title header */}
        <div className="bg-amber-50 border-b border-amber-100 p-5 flex justify-between items-center flex-wrap gap-4">
          <div>
            <span className="text-[10px] bg-amber-200/60 text-amber-800 font-black px-3 py-1 rounded-xl uppercase tracking-wider">
              BÀI LÀM TRỰC TIẾP
            </span>
            <h2 className="text-base md:text-lg font-black text-slate-900 mt-2.5 leading-snug">{exam.title}</h2>
          </div>

          {/* Countdown timer badge */}
          <div className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl font-mono text-base font-black border shadow-sm ${
            timeLeft < 60 
              ? "bg-rose-50 border-rose-200 text-rose-600 animate-pulse" 
              : "bg-slate-900 text-slate-50 border-slate-800"
          }`}>
            <Timer className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="bg-slate-100 h-2.5 w-full">
          <div 
            className="bg-amber-400 h-full transition-all duration-300" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Question Area */}
        <div className="p-6 md:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <span className="bg-slate-900 text-white text-xs font-black px-3 py-1.5 rounded-xl shrink-0 mt-0.5">
              Câu {currentIdx + 1}
            </span>
            <div className="space-y-3 flex-1">
              <p className="font-black text-slate-900 text-base md:text-lg leading-relaxed pt-0.5">
                {currentQuestion.question}
              </p>
              {currentQuestion.imageUrl && (
                <div className="mt-2">
                  <img
                    src={currentQuestion.imageUrl}
                    alt="Hình minh họa câu hỏi"
                    className="max-h-60 object-contain rounded-2xl border border-slate-200 bg-white p-1 shadow-xs"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {currentQuestion.options.map((opt: any, oIdx: number) => {
              const letter = ["A", "B", "C", "D"][oIdx];
              const isSelected = answers[currentQuestion.id] === letter;
              const optText = getOptionText(opt);
              const optImg = getOptionImage(opt, currentQuestion, oIdx);

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handleSelectOption(currentQuestion.id, letter)}
                  className={`p-5 rounded-3xl border text-left flex items-center gap-4 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-50/70 border-amber-400 text-amber-950 shadow-md shadow-amber-100/50"
                      : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-800 hover:border-slate-200"
                  }`}
                >
                  <span className={`w-9 h-9 rounded-2xl font-black text-sm flex items-center justify-center shrink-0 border transition-all ${
                    isSelected
                      ? "bg-amber-400 border-amber-400 text-slate-950 shadow-sm"
                      : "bg-white border-slate-200 text-slate-600"
                  }`}>
                    {letter}
                  </span>
                  <div className="flex-1 space-y-1">
                    <span className="font-bold text-sm md:text-base leading-normal">{optText}</span>
                    {optImg && (
                      <img src={optImg} alt="" className="h-12 w-12 object-cover rounded-xl border border-slate-200 mt-1" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Nav controls */}
        <div className="border-t border-slate-100 p-5 bg-slate-50/50 flex justify-between items-center">
          <button
            onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
            disabled={currentIdx === 0}
            className="border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-slate-700 font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition-all shrink-0 active:scale-[0.98]"
          >
            <ChevronLeft className="w-4 h-4" />
            Câu trước
          </button>

          {currentIdx < totalQuestions - 1 ? (
            <button
              onClick={() => setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="bg-slate-900 hover:bg-slate-950 text-white font-extrabold px-5 py-3 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-[0.98]"
            >
              Câu tiếp
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              id="btn-student-submit"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white font-black px-6 py-3.5 rounded-2xl text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-100 transition-all shrink-0 active:scale-[0.98]"
            >
              <CheckCircle className="w-4 h-4" />
              Nộp bài của em
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SIDEBAR: QUESTIONS PALETTE (1/4 width) */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
        <div className="space-y-1">
          <h3 className="font-black text-slate-900 text-sm">Tiến trình làm bài</h3>
          <p className="text-slate-400 text-xs font-bold">
            Hoàn thành <strong className="text-slate-800 font-black">{answeredCount}</strong> / {totalQuestions} câu hỏi
          </p>
        </div>

        {/* Visual grid checklist */}
        <div className="grid grid-cols-4 md:grid-cols-5 gap-2.5 pt-1">
          {questions.map((q, idx) => {
            const isAnswered = !!answers[q.id];
            const isActive = idx === currentIdx;
            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`aspect-square rounded-2xl font-black text-xs flex items-center justify-center border transition-all cursor-pointer ${
                  isActive
                    ? "bg-amber-400 border-amber-400 text-slate-900 ring-4 ring-amber-100 font-black shadow-md shadow-amber-100"
                    : isAnswered
                    ? "bg-amber-50 border-amber-200 text-amber-700 font-black"
                    : "bg-slate-50/50 hover:bg-slate-50 border-slate-100 text-slate-500 font-bold"
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>

        <div className="border-t border-slate-50 pt-4 text-[10px] font-bold text-slate-400 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-lg bg-amber-400 border border-amber-300 inline-block shrink-0 shadow-xs" />
            <span>Câu em đang chọn</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-lg bg-amber-50 border border-amber-200 inline-block shrink-0 shadow-xs" />
            <span>Câu em đã làm</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-lg bg-slate-50/50 border border-slate-100 inline-block shrink-0 shadow-xs" />
            <span>Câu chưa trả lời</span>
          </div>
        </div>

        <button
          id="btn-student-sidebar-submit"
          onClick={() => handleSubmit(false)}
          disabled={submitting}
          className="w-full text-center bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-400 text-white py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-100 active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <CheckCircle className="w-4 h-4" />
          Nộp bài của em
        </button>

        <button
          id="btn-student-sidebar-exit"
          onClick={handleExitClick}
          className="w-full text-center hover:bg-slate-50 border border-slate-200 text-slate-400 hover:text-slate-700 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-[0.98]"
        >
          Thoát ra ngoài
        </button>
      </div>

      {/* SUBMIT CONFIRMATION MODAL */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-slate-100 shadow-xl overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Xác nhận nộp bài</h3>
              <p className="text-sm font-bold text-slate-500">
                Em có chắc chắn muốn nộp bài kiểm tra này không?
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2.5">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Đã trả lời:</span>
                <span className="text-slate-800 font-black">{answeredCount} / {totalQuestions} câu</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-500">Chưa trả lời:</span>
                <span className={`${totalQuestions - answeredCount > 0 ? "text-rose-500" : "text-emerald-600"} font-black`}>
                  {totalQuestions - answeredCount} câu
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black py-3.5 rounded-2xl text-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                Tiếp tục làm bài
              </button>
              <button
                type="button"
                onClick={() => executeSubmit(false)}
                className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3.5 rounded-2xl text-xs shadow-md shadow-emerald-100 transition-all cursor-pointer active:scale-[0.98]"
              >
                Xác nhận nộp bài
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-slate-100 shadow-xl overflow-hidden p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto border border-amber-100">
                <AlertCircle className="w-8 h-8 text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Xác nhận thoát</h3>
              <p className="text-sm font-bold text-rose-600 leading-relaxed bg-rose-50 p-3 rounded-2xl border border-rose-100">
                Em chưa nộp bài kiểm tra.
              </p>
              <p className="text-sm font-bold text-slate-500 text-center">
                Em có chắc chắn muốn thoát khỏi phòng thi không? Đáp án em đã chọn vẫn được lưu lại để tiếp tục lần sau.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 border border-slate-200 hover:bg-slate-50 text-slate-600 font-black py-3.5 rounded-2xl text-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                Ở lại làm bài
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExitConfirm(false);
                  onBackToDashboard();
                }}
                className="flex-1 bg-slate-900 hover:bg-slate-950 text-white font-black py-3.5 rounded-2xl text-xs transition-all cursor-pointer active:scale-[0.98]"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
