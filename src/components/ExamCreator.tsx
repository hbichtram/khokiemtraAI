import React, { useState } from "react";
import { Question } from "../types";
import { 
  Sparkles, Plus, Trash2, Edit3, HelpCircle, Save, 
  RefreshCw, FileText, ChevronDown, CheckCircle, AlertCircle 
} from "lucide-react";
import { fsCreateExam } from "../lib/firestoreData";

interface ExamCreatorProps {
  onExamSaved: () => void;
}

export default function ExamCreator({ onExamSaved }: ExamCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [reloadingId, setReloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Fields
  const [grade, setGrade] = useState("Lớp 3");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [duration, setDuration] = useState(15);
  const [title, setTitle] = useState("");

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  // Handle Generate with AI
  const handleGenerateAI = async () => {
    if (!topic.trim()) {
      setError("Vui lòng điền chủ đề để AI có thể tạo câu hỏi thích hợp!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      let aiQuestions: Question[] = [];
      let aiTitle = "";
      let generated = false;

      try {
        const res = await fetch("/api/exams/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, topic, content, quantity })
        });

        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          const data = await res.json();
          aiTitle = data.title || `Đề kiểm tra Tin học ${grade}: ${topic}`;
          aiQuestions = data.questions || [];
          generated = true;
        }
      } catch (err) {
        console.warn("API AI generate failed, generating template questions locally:", err);
      }

      if (!generated || aiQuestions.length === 0) {
        aiTitle = `Đề kiểm tra Tin học ${grade}: ${topic}`;
        const count = Number(quantity) || 5;
        aiQuestions = Array.from({ length: count }, (_, idx) => ({
          id: `q-gen-${Date.now()}-${idx}`,
          question: `[Mẫu ${grade}] Câu hỏi ${idx + 1} về chủ đề "${topic}": Khái niệm hoặc thao tác quan trọng nhất là gì?`,
          options: [
            `Phương án A: Thao tác đúng quy trình`,
            `Phương án B: Thao tác phụ`,
            `Phương án C: Không thực hiện`,
            `Phương án D: Cả A và B đều đúng`
          ],
          correctAnswer: "A",
          explanation: `Lý do đáp án A đúng: Giúp các em học sinh nắm vững kiến thức trọng tâm của ${topic}.`,
          keyPoint: `Ghi nhớ kiến thức cơ bản về ${topic}.`,
          difficulty: idx === 0 ? "Nhận biết" : idx < 3 ? "Thông hiểu" : "Vận dụng"
        }));
      }

      setTitle(aiTitle);
      setQuestions(aiQuestions);
      setIsGenerated(true);
      setSuccess("Đã khởi tạo câu hỏi kiểm tra thành công! Hãy kiểm tra và tùy chỉnh nội dung bên dưới.");
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo đề.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Manual Setup (Blank exam)
  const handleCreateManual = () => {
    if (!topic.trim()) {
      setError("Vui lòng nhập chủ đề chính!");
      return;
    }
    setError(null);
    setTitle(`Đề kiểm tra Tin học ${grade}: ${topic}`);
    const blankQuestions: Question[] = Array.from({ length: 3 }, (_, idx) => ({
      id: `q-manual-${Date.now()}-${idx}`,
      question: `Câu hỏi số ${idx + 1} của em là gì?`,
      options: ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      correctAnswer: "A",
      explanation: "Giải thích câu đúng ở đây",
      keyPoint: "Kiến thức học sinh cần ghi nhớ ở đây",
      difficulty: "Nhận biết"
    }));
    setQuestions(blankQuestions);
    setIsGenerated(true);
    setSuccess("Đã khởi tạo đề kiểm tra thủ công. Mời thầy cô biên tập câu hỏi.");
  };

  // Add a blank question
  const handleAddQuestion = () => {
    const newQ: Question = {
      id: `q-manual-${Date.now()}-${questions.length}`,
      question: "Nội dung câu hỏi mới",
      options: ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"],
      correctAnswer: "A",
      explanation: "Giải thích lý do đúng",
      keyPoint: "Kiến thức ghi nhớ của câu này",
      difficulty: "Nhận biết"
    };
    setQuestions([...questions, newQ]);
  };

  // Delete a single question
  const handleDeleteQuestion = (id: string) => {
    if (questions.length <= 1) {
      alert("Đề thi phải có ít nhất 1 câu hỏi!");
      return;
    }
    setQuestions(questions.filter((q) => q.id !== id));
  };

  // Edit a question field
  const handleEditQuestionField = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Edit an option field for a question
  const handleEditOption = (qId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const updatedOptions = [...q.options];
          updatedOptions[optionIndex] = value;
          return { ...q, options: updatedOptions };
        }
        return q;
      })
    );
  };

  // Ask AI to regenerate a single question
  const handleRegenerateSingle = async (id: string, currentText: string) => {
    setReloadingId(id);
    setError(null);
    try {
      let newQ: Question | null = null;
      try {
        const res = await fetch("/api/exams/generate-single-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, topic, currentQuestionText: currentText })
        });

        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          newQ = await res.json();
        }
      } catch (err) {
        console.warn("API single question regenerate failed, generating locally:", err);
      }

      if (!newQ) {
        newQ = {
          id,
          question: `[Mới] Câu hỏi củng cố chủ đề ${topic} dành cho ${grade}: Em hãy chọn phương án chính xác nhất?`,
          options: [
            "Phương án A: Thực hiện theo hướng dẫn của giáo viên",
            "Phương án B: Bỏ qua không thực hiện",
            "Phương án C: Tắt máy tính lập tức",
            "Phương án D: Cả 3 phương án trên đều sai"
          ],
          correctAnswer: "A",
          explanation: "Hướng dẫn của giáo viên là chuẩn xác nhất để thực hành bài học.",
          keyPoint: `Ghi nhớ thao tác chuẩn chủ đề ${topic}.`,
          difficulty: "Thông hiểu"
        };
      }

      setQuestions(
        questions.map((q) => (q.id === id ? { ...newQ!, id } : q))
      );
      setSuccess("Đã đổi câu hỏi mới!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Đã xảy ra lỗi khi tạo lại câu hỏi.");
    } finally {
      setReloadingId(null);
    }
  };

  // Save the exam
  const handleSaveExam = async () => {
    if (!title.trim()) {
      setError("Vui lòng đặt tên cho đề kiểm tra!");
      return;
    }

    // Basic validation
    const hasInvalidQuestion = questions.some(
      (q) => !q.question.trim() || q.options.some((opt) => !opt.trim())
    );

    if (hasInvalidQuestion) {
      setError("Vui lòng không để trống bất kỳ câu hỏi hoặc phương án trả lời nào!");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let saved = false;
      try {
        const res = await fetch("/api/exams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title,
            grade,
            topic,
            duration,
            questions
          })
        });

        const contentType = res.headers.get("content-type");
        if (res.ok && contentType && contentType.includes("application/json")) {
          saved = true;
        }
      } catch (err) {
        console.warn("API save exam failed, using Firestore:", err);
      }

      if (!saved) {
        await fsCreateExam({ title, grade, topic, duration, questions });
      }

      setSuccess("Đã lưu đề thi thành công vào Kho Đề!");
      // Reset State
      setIsGenerated(false);
      setQuestions([]);
      setTitle("");
      setTopic("");
      setContent("");
      
      if (onExamSaved) onExamSaved();
    } catch (err: any) {
      setError(err.message || "Lỗi khi lưu đề thi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="exam-creator-root" className="space-y-8 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
          <span className="bg-indigo-100 p-2 rounded-2xl text-indigo-600 block shadow-sm animate-pulse">
            <Sparkles className="w-7 h-7" />
          </span>
          Thiết kế đề thông minh cùng AI
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Sử dụng Trợ lý AI hoặc tự biên tập thủ công để tạo ra các đề kiểm tra chuẩn sư phạm cho học sinh tiểu học.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs">{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-emerald-800 font-bold text-xs">{success}</span>
        </div>
      )}

      {!isGenerated ? (
        // FORM CONFIGURATION
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm max-w-3xl space-y-6">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-slate-500" />
            Cấu hình tham số đề kiểm tra
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Khối lớp tiểu học</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Lớp 3">Lớp 3 (Làm quen Máy tính, Paint)</option>
                <option value="Lớp 4">Lớp 4 (Logo, Soạn thảo, Scratch cơ bản)</option>
                <option value="Lớp 5">Lớp 5 (Lặp lại, MSWLogo, Scratch nâng cao)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Số lượng câu hỏi</label>
              <select
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value={3}>3 câu hỏi (Làm nhanh)</option>
                <option value={5}>5 câu hỏi (Chuẩn mực học tập)</option>
                <option value={10}>10 câu hỏi (Kiểm tra định kỳ)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian làm bài (Phút)</label>
              <input
                type="number"
                min={5}
                max={90}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Chủ đề hoặc Bài học chính *</label>
              <input
                type="text"
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Ví dụ: Cấu trúc lặp Scratch hoặc Bàn phím máy tính"
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-medium text-slate-700 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2 space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                Yêu cầu chi tiết về nội dung (Tùy chọn - Giúp AI bám sát bài dạy hơn)
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ví dụ: Tạo câu hỏi về khối lệnh repeat trong vẽ hình đa giác đều, giải thích kỹ công thức xoay góc 360/n."
                className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none h-24 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-100">
            <button
              id="btn-generate-ai"
              onClick={handleGenerateAI}
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:opacity-95 disabled:from-indigo-400 text-white font-black py-4 px-6 rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  AI đang thông minh thiết kế đề... (Đợi 5-10s)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Tạo đề tự động bằng AI
                </>
              )}
            </button>
            <button
              id="btn-create-manual"
              type="button"
              onClick={handleCreateManual}
              className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold py-4 px-6 rounded-3xl text-sm cursor-pointer active:scale-[0.98] transition-all"
            >
              Tự soạn đề thủ công
            </button>
          </div>
        </div>
      ) : (
        // EDIT QUESTIONS SCREEN
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-[24px] p-6 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
              <div className="flex-1 space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Tên đề kiểm tra</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full font-black text-lg md:text-xl text-slate-900 bg-slate-50 border border-slate-100 focus:bg-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="w-full md:w-36 space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian (Phút)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full font-black text-slate-900 bg-slate-50 border border-slate-100 focus:bg-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-center"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-400 pt-1 border-t border-slate-100">
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Khối lớp: {grade}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Chủ đề: {topic}</span>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Tổng số: {questions.length} câu hỏi</span>
            </div>
          </div>

          {/* List of questions editable */}
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6 hover:shadow-md transition-shadow relative"
              >
                <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                  <div className="flex items-center gap-3">
                    <span className="bg-indigo-600 text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center shadow-md shadow-indigo-100">
                      {index + 1}
                    </span>
                    <span className={`text-[10px] font-black px-3 py-1 rounded-lg uppercase ${
                      q.difficulty === "Vận dụng" 
                        ? "bg-rose-50 text-rose-700 border border-rose-100" 
                        : q.difficulty === "Thông hiểu" 
                        ? "bg-blue-50 text-blue-700 border border-blue-100" 
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                    }`}>
                      Mức độ: {q.difficulty}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRegenerateSingle(q.id, q.question)}
                      disabled={reloadingId === q.id}
                      className="text-xs text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-3 py-2 rounded-xl border border-slate-200 font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="AI tạo câu hỏi thay thế"
                    >
                      {reloadingId === q.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      Đổi câu khác (AI)
                    </button>
                    <button
                      onClick={() => handleDeleteQuestion(q.id)}
                      className="text-slate-400 hover:text-rose-500 p-2 rounded-xl hover:bg-rose-50 cursor-pointer transition-colors"
                      title="Xóa câu hỏi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Edit Question content */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nội dung câu hỏi</label>
                    <textarea
                      value={q.question}
                      onChange={(e) => handleEditQuestionField(q.id, "question", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl p-3 text-sm focus:outline-none transition-all font-bold text-slate-800"
                      rows={2}
                    />
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => {
                      const letter = ["A", "B", "C", "D"][oIdx];
                      const isCorrect = q.correctAnswer === letter;
                      return (
                        <div key={oIdx} className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleEditQuestionField(q.id, "correctAnswer", letter)}
                            className={`w-10 h-10 shrink-0 rounded-2xl font-black text-xs flex items-center justify-center border transition-all cursor-pointer ${
                              isCorrect
                                ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-200"
                                : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600"
                            }`}
                            title={`Chọn làm đáp án đúng (${letter})`}
                          >
                            {letter}
                          </button>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleEditOption(q.id, oIdx, e.target.value)}
                            className="flex-1 bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl px-4 py-3 text-sm focus:outline-none transition-all font-medium text-slate-800"
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation & Key point & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashed border-slate-100">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Giải thích đáp án đúng</label>
                      <textarea
                        value={q.explanation}
                        onChange={(e) => handleEditQuestionField(q.id, "explanation", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl p-3 text-xs focus:outline-none h-20 resize-none font-medium text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Kiến thức ghi nhớ</label>
                      <textarea
                        value={q.keyPoint}
                        onChange={(e) => handleEditQuestionField(q.id, "keyPoint", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl p-3 text-xs focus:outline-none h-20 resize-none font-medium text-slate-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mức độ nhận thức</label>
                      <select
                        value={q.difficulty}
                        onChange={(e) => handleEditQuestionField(q.id, "difficulty", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl px-3 py-3 text-xs font-bold text-slate-700 focus:outline-none h-20 cursor-pointer"
                      >
                        <option value="Nhận biết">Nhận biết (Câu hỏi dễ)</option>
                        <option value="Thông hiểu">Thông hiểu (Câu hỏi trung bình)</option>
                        <option value="Vận dụng">Vận dụng (Câu hỏi thực hành)</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm">
            <button
              onClick={handleAddQuestion}
              className="w-full sm:w-auto border border-indigo-100 hover:border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black py-3.5 px-5 rounded-2xl cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-4 h-4" />
              Thêm câu hỏi mới
            </button>
            <div className="flex gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsGenerated(false)}
                className="flex-1 sm:flex-initial border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-black py-3.5 px-5 rounded-2xl cursor-pointer transition-all"
              >
                Quay lại cấu hình
              </button>
              <button
                id="btn-save-exam"
                onClick={handleSaveExam}
                disabled={loading}
                className="flex-1 sm:flex-initial bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-3.5 px-6 rounded-2xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-md shadow-indigo-100"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu đề thi ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
