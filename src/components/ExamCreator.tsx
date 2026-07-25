import React, { useState, useRef } from "react";
import { Question, QuestionOption, getOptionText, getOptionImage, ELEMENTARY_GRADES } from "../types";
import { 
  Sparkles, Plus, Trash2, Edit3, HelpCircle, Save, 
  RefreshCw, FileText, ChevronDown, CheckCircle, AlertCircle,
  Upload, Image as ImageIcon, Eye, X, FileUp, Info, ArrowLeft, Maximize2
} from "lucide-react";
import mammoth from "mammoth";
import { parseExamFromText, extractTextFromPdfBinary } from "../lib/fileParser";
import { fsCreateExam } from "../lib/firestoreData";
import { uploadImageFile } from "../lib/imageStorage";

interface ExamCreatorProps {
  onExamSaved: () => void;
}

export default function ExamCreator({ onExamSaved }: ExamCreatorProps) {
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseProgress, setParseProgress] = useState(0);
  const [reloadingId, setReloadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [noticeInfo, setNoticeInfo] = useState<string | null>(null);

  // Form Fields
  const [grade, setGrade] = useState("Tin học 3");
  const [topic, setTopic] = useState("");
  const [content, setContent] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [duration, setDuration] = useState(15);
  const [title, setTitle] = useState("");

  // Questions State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGenerated, setIsGenerated] = useState(false);

  // Modals
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [showExamPreviewModal, setShowExamPreviewModal] = useState<boolean>(false);

  // Drag and Drop
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Generate with AI
  const handleGenerateAI = async () => {
    if (!topic.trim()) {
      setError("Vui lòng điền chủ đề để AI có thể tạo câu hỏi thích hợp!");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setNoticeInfo(null);
    try {
      let aiQuestions: Question[] = [];
      let aiTitle = "";
      let generated = false;
      let apiError = "";

      try {
        const res = await fetch("/api/exams/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            grade, 
            subject: grade,
            topic, 
            content, 
            quantity: Number(quantity) || 5,
            questionCount: Number(quantity) || 5 
          })
        });

        const data = await res.json().catch(() => null);

        const defaultTitle = grade.startsWith("Tin học") ? `Đề kiểm tra ${grade}: ${topic}` : `Đề kiểm tra Tin học ${grade}: ${topic}`;
        if (res.ok && data && Array.isArray(data.questions) && data.questions.length > 0) {
          aiTitle = data.title || defaultTitle;
          aiQuestions = data.questions;
          generated = true;
        } else if (data && (data.message || data.error)) {
          const mainMsg = data.message || (typeof data.error === "string" ? data.error : "Tạo đề thi thất bại");
          const details = data.details;
          let detailStr = "";
          if (details) {
            detailStr = ` [Chi tiết: Endpoint=${details.endpoint || "N/A"}, Model=${details.model || "N/A"}, HTTP Status=${details.httpStatus || "N/A"}, Response=${typeof details.responseBody === "object" ? JSON.stringify(details.responseBody) : details.responseBody}]`;
          }
          apiError = `${mainMsg}${detailStr}`;
        } else if (!res.ok) {
          apiError = `Lỗi máy chủ khi gọi AI (Mã HTTP: ${res.status} ${res.statusText || ""}). Vui lòng kiểm tra lại GEMINI_API_KEY.`;
        } else {
          apiError = "Máy chủ AI không phản hồi danh sách câu hỏi hợp lệ. Vui lòng thử lại.";
        }
      } catch (err: any) {
        console.warn("API AI generate network request failed:", err);
        apiError = err.message || "Lỗi kết nối máy chủ AI.";
      }

      if (!generated) {
        if (apiError) {
          setError(apiError);
          return;
        }
        aiTitle = grade.startsWith("Tin học") ? `Đề kiểm tra ${grade}: ${topic}` : `Đề kiểm tra Tin học ${grade}: ${topic}`;
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
      setSuccess("Đã tạo đề kiểm tra bằng AI thành công! Hãy kiểm tra và tùy chỉnh nội dung bên dưới.");
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
    setNoticeInfo(null);
    setTitle(grade.startsWith("Tin học") ? `Đề kiểm tra ${grade}: ${topic}` : `Đề kiểm tra Tin học ${grade}: ${topic}`);
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

  // Handle File Upload and Parse
  const handleFileUploadProcess = async (file: File) => {
    if (!file) return;

    const fileName = file.name;
    const ext = fileName.slice(((fileName.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();

    const allowedExts = ["docx", "pdf", "txt", "json"];
    if (!allowedExts.includes(ext)) {
      setError("Định dạng tệp không được hỗ trợ. Vui lòng chọn tệp .docx, .pdf, .txt hoặc .json");
      return;
    }

    setParsing(true);
    setParseProgress(20);
    setError(null);
    setSuccess(null);
    setNoticeInfo(null);

    try {
      let textContent = "";
      let extractedImages: string[] = [];

      setParseProgress(40);

      const arrayBuffer = await file.arrayBuffer();

      if (ext === "json") {
        textContent = await file.text();
      } else if (ext === "txt") {
        textContent = await file.text();
      } else if (ext === "docx") {
        try {
          const textResult = await mammoth.extractRawText({ arrayBuffer });
          textContent = textResult.value || "";

          try {
            const htmlResult = await mammoth.convertToHtml(
              { arrayBuffer },
              {
                convertImage: mammoth.images.imgElement(function (image) {
                  return image.read("base64").then(function (imageBuffer) {
                    return { src: "data:" + image.contentType + ";base64," + imageBuffer };
                  });
                })
              }
            );

            if (htmlResult.value) {
              const parser = new DOMParser();
              const doc = parser.parseFromString(htmlResult.value, "text/html");
              const imgEls = doc.querySelectorAll("img");
              imgEls.forEach((img) => {
                if (img.src && img.src.startsWith("data:image")) {
                  extractedImages.push(img.src);
                }
              });
            }
          } catch (imgErr) {
            console.warn("Could not extract embedded docx images:", imgErr);
          }
        } catch (docxErr) {
          console.warn("Mammoth docx parse error:", docxErr);
        }
      } else if (ext === "pdf") {
        const rawText = await file.text().catch(() => "");
        const binaryPdfText = extractTextFromPdfBinary(arrayBuffer);
        textContent = (rawText.length > binaryPdfText.length ? rawText : binaryPdfText) || `Đề thi PDF: ${fileName}`;
      }

      console.log(`[ExamCreator Upload] Extracted ${textContent.length} chars from file '${fileName}' (Type: ${ext})`);

      setParseProgress(60);

      // Try server endpoint first
      let parseData: any = null;
      try {
        const res = await fetch("/api/exams/parse-file", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName,
            fileType: ext,
            textContent: textContent.slice(0, 50000) // Keep payload size under Vercel 4.5MB limit
          })
        });
        if (res.ok) {
          parseData = await res.json().catch(() => null);
        }
      } catch (fetchErr) {
        console.warn("[ExamCreator Upload] Server parse fetch error, falling back to client parser:", fetchErr);
      }

      setParseProgress(85);

      // If server returned valid questions, use them
      let parsedQuestionsList: any[] = [];
      let parsedTitle = `Đề thi từ tệp ${fileName}`;
      let parsedGrade = grade;
      let parsedTopic = topic;

      if (parseData && Array.isArray(parseData.questions) && parseData.questions.length > 0) {
        parsedQuestionsList = parseData.questions;
        if (parseData.title) parsedTitle = parseData.title;
        if (parseData.grade) parsedGrade = parseData.grade;
        if (parseData.topic) parsedTopic = parseData.topic;
        console.log(`[ExamCreator Upload] Using server parsed result (${parsedQuestionsList.length} questions)`);
      } else {
        // Fallback to client-side parseExamFromText
        console.log("[ExamCreator Upload] Server parsing yielded 0 questions or failed. Executing client-side parseExamFromText...");
        const clientResult = parseExamFromText(textContent, fileName);
        if (clientResult.questions && clientResult.questions.length > 0) {
          parsedQuestionsList = clientResult.questions;
          parsedTitle = clientResult.title;
          parsedGrade = clientResult.grade;
          parsedTopic = clientResult.topic;
          console.log(`[ExamCreator Upload] Client parser succeeded with ${parsedQuestionsList.length} questions`);
        } else {
          // Both failed: show detailed safe error message
          const textLengthStr = textContent.trim().length.toLocaleString("vi-VN");
          const errorDetail = clientResult.log.details || `Đã đọc tệp thành công (${textLengthStr} ký tự text), nhưng không thể nhận diện được các câu hỏi (Ví dụ dạng 'Câu 1:' hoặc '1.'). Vui lòng kiểm tra lại cấu trúc tệp.`;
          setError(`Không thể nhận diện câu hỏi từ tệp "${fileName}".\nChi tiết: ${errorDetail}`);
          return;
        }
      }

      // Map parsed questions to final Question state
      setTitle(parsedTitle);
      if (parsedGrade) setGrade(parsedGrade);
      if (parsedTopic) setTopic(parsedTopic);

      const finalQuestions: Question[] = parsedQuestionsList.map((q: any, qIdx: number) => {
        let questionImg = q.imageUrl;
        if (!questionImg && extractedImages[qIdx]) {
          questionImg = extractedImages[qIdx];
        }

        return {
          id: `q-file-${Date.now()}-${qIdx}`,
          question: q.question || `Câu hỏi ${qIdx + 1}`,
          imageUrl: questionImg || undefined,
          options: Array.isArray(q.options)
            ? q.options.map((opt: any) =>
                typeof opt === "object" && opt !== null
                  ? { text: opt.text || "", imageUrl: opt.imageUrl }
                  : String(opt || "")
              )
            : ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
          correctAnswer: q.correctAnswer || "A",
          explanation: q.explanation || "Giải thích cho đáp án đúng.",
          keyPoint: q.keyPoint || "Kiến thức học sinh ghi nhớ.",
          difficulty: q.difficulty || "Nhận biết"
        };
      });

      setQuestions(finalQuestions);
      setIsGenerated(true);
      setSuccess(`Đã trích xuất thành công ${finalQuestions.length} câu hỏi từ tệp "${fileName}". Mời thầy cô kiểm tra và chỉnh sửa nội dung.`);

      if (extractedImages.length > 0 || ext === "pdf" || ext === "docx") {
        setNoticeInfo("ℹ️ Tệp đề thi đã được tải lên. Thầy cô vui lòng kiểm tra lại thứ tự và thông tin các câu hỏi bên dưới.");
      }
    } catch (err: any) {
      console.error("[ExamCreator Upload Error]:", err);
      setError(`Lỗi khi xử lý tệp đề thi: ${err.message || err}`);
    } finally {
      setParsing(false);
      setParseProgress(100);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUploadProcess(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUploadProcess(e.dataTransfer.files[0]);
    }
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

  // Edit question text / field
  const handleEditQuestionField = (id: string, field: keyof Question, value: any) => {
    setQuestions(
      questions.map((q) => (q.id === id ? { ...q, [field]: value } : q))
    );
  };

  // Edit an option text
  const handleEditOptionText = (qId: string, optionIndex: number, textValue: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === qId) {
          const updatedOptions = [...q.options];
          const currOpt = updatedOptions[optionIndex];
          if (typeof currOpt === "object" && currOpt !== null) {
            updatedOptions[optionIndex] = { ...currOpt, text: textValue };
          } else {
            updatedOptions[optionIndex] = textValue;
          }
          return { ...q, options: updatedOptions };
        }
        return q;
      })
    );
  };

  // Image Upload Handlers
  const handleQuestionImageUpload = async (questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setLoading(true);
      const url = await uploadImageFile(file);
      setQuestions(questions.map((q) => q.id === questionId ? { ...q, imageUrl: url } : q));
      setSuccess("Đã tải lên hình ảnh minh họa cho câu hỏi!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Không thể tải ảnh.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveQuestionImage = (questionId: string) => {
    setQuestions(questions.map((q) => q.id === questionId ? { ...q, imageUrl: undefined } : q));
  };

  const handleOptionImageUpload = async (questionId: string, optionIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    try {
      setLoading(true);
      const url = await uploadImageFile(file);
      setQuestions(questions.map((q) => {
        if (q.id === questionId) {
          const updatedOptions = [...q.options];
          const currOpt = updatedOptions[optionIndex];
          const optText = getOptionText(currOpt);
          updatedOptions[optionIndex] = { text: optText, imageUrl: url };
          return { ...q, options: updatedOptions };
        }
        return q;
      }));
      setSuccess(`Đã tải ảnh cho phương án ${["A", "B", "C", "D"][optionIndex]}!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Không thể tải ảnh cho phương án.");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveOptionImage = (questionId: string, optionIndex: number) => {
    setQuestions(questions.map((q) => {
      if (q.id === questionId) {
        const updatedOptions = [...q.options];
        const currOpt = updatedOptions[optionIndex];
        const optText = getOptionText(currOpt);
        updatedOptions[optionIndex] = optText;
        return { ...q, options: updatedOptions };
      }
      return q;
    }));
  };

  // Ask AI to regenerate a single question
  const handleRegenerateSingle = async (id: string, currentText: string) => {
    setReloadingId(id);
    setError(null);
    try {
      let newQ: Question | null = null;
      let apiError = "";
      try {
        const res = await fetch("/api/exams/generate-single-question", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ grade, topic, currentQuestionText: currentText })
        });

        const data = await res.json().catch(() => null);

        if (res.ok && data && (data.question || data.questionText || data.options)) {
          const qObj = data.question || data;
          newQ = {
            ...qObj,
            id: id
          };
        } else if (data && data.error) {
          apiError = data.error;
        }
      } catch (err: any) {
        console.warn("API single question regenerate failed:", err);
        apiError = err.message || "Lỗi kết nối khi đổi câu hỏi.";
      }

      if (!newQ) {
        if (apiError) {
          setError(apiError);
          return;
        }
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
      setSuccess("Đã đổi câu hỏi mới qua AI thành công!");
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

    const hasInvalidQuestion = questions.some(
      (q) => !q.question.trim() || q.options.some((opt) => !getOptionText(opt).trim())
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
          Soạn đề thi thông minh
        </h1>
        <p className="text-slate-500 font-medium mt-1">
          Tạo đề tự động bằng AI, Soạn thủ công, hoặc Tải tệp đề thi (.docx, .pdf, .txt, .json) có đầy đủ hình ảnh minh họa.
        </p>
      </div>

      {error && (
        <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <span className="text-rose-800 font-bold text-xs leading-relaxed">{error}</span>
        </div>
      )}

      {noticeInfo && (
        <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <span className="text-amber-900 font-bold text-xs leading-relaxed">{noticeInfo}</span>
        </div>
      )}

      {success && (
        <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-start gap-2.5 animate-fadeIn">
          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
          <span className="text-emerald-800 font-bold text-xs leading-relaxed">{success}</span>
        </div>
      )}

      {!isGenerated ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: FORM CONFIGURATION & AI CREATOR */}
          <div className="lg:col-span-7 bg-white border border-slate-100 rounded-[32px] p-6 md:p-8 shadow-sm space-y-6">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <FileText className="w-5 h-5 text-indigo-600" />
              Cấu hình tham số & Tạo đề AI
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Khối lớp tiểu học</label>
                <select
                  id="select-elementary-grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  {ELEMENTARY_GRADES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
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
                  Yêu cầu chi tiết về nội dung (Tùy chọn cho AI)
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Ví dụ: Tạo câu hỏi về khối lệnh repeat trong vẽ hình đa giác đều, giải thích kỹ công thức xoay góc 360/n."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none h-20 resize-none"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-100">
              <button
                id="btn-generate-ai"
                onClick={handleGenerateAI}
                disabled={loading || parsing}
                className="flex-1 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 hover:opacity-95 disabled:from-indigo-400 text-white font-black py-4 px-5 rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    AI đang thiết kế đề...
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
                disabled={loading || parsing}
                className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-extrabold py-4 px-5 rounded-3xl text-sm cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Edit3 className="w-4 h-4 text-slate-500" />
                Tự soạn đề thủ công
              </button>
              <button
                id="btn-upload-file-manual"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || parsing}
                className="border border-indigo-200 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 font-extrabold py-4 px-5 rounded-3xl text-sm cursor-pointer active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <Upload className="w-4 h-4 text-indigo-600" />
                Tải tệp từ máy tính
              </button>
            </div>
          </div>

          {/* RIGHT: FILE UPLOAD SECTION (DOCX, PDF, TXT, JSON) */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 rounded-[32px] p-6 md:p-8 text-white shadow-xl space-y-6">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 text-xs font-black uppercase tracking-wider">
                <FileUp className="w-4 h-4" />
                <span>Nâng cao & Nhanh chóng</span>
              </div>
              <h2 className="text-xl font-black mt-1 flex items-center gap-2">
                📄 Tải tệp đề thi
              </h2>
              <p className="text-slate-300 text-xs mt-1.5 leading-relaxed">
                Thầy cô có thể tải lên file đề thi có sẵn. Hệ thống sẽ tự động phân tích và trích xuất danh sách câu hỏi.
              </p>
            </div>

            {/* Allowed file formats pills */}
            <div className="flex flex-wrap gap-2 text-[11px] font-black">
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-xl">.DOCX</span>
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-xl">.PDF</span>
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-xl">.TXT</span>
              <span className="bg-indigo-500/20 text-indigo-200 border border-indigo-400/30 px-3 py-1 rounded-xl">.JSON</span>
            </div>

            {/* Drag & Drop Area */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 min-h-[180px] ${
                isDragging
                  ? "border-indigo-400 bg-indigo-500/20 scale-[1.02]"
                  : "border-slate-700/80 hover:border-indigo-400 hover:bg-slate-800/50 bg-slate-900/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.json"
                onChange={handleFileInputChange}
                className="hidden"
              />

              {parsing ? (
                <div className="space-y-3 w-full max-w-xs">
                  <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mx-auto" />
                  <p className="text-xs font-bold text-indigo-200">Đang đọc & phân tích tệp đề thi...</p>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
                    <div 
                      className="bg-gradient-to-r from-indigo-500 to-purple-400 h-full transition-all duration-300"
                      style={{ width: `${parseProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Kéo thả tệp đề thi vào đây</p>
                    <p className="text-[11px] text-slate-400 font-medium mt-0.5">Hoặc bấm để chọn tệp từ máy tính của thầy cô</p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-4 text-[11px] text-slate-300 space-y-1.5 leading-relaxed">
              <p className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0" />
                Hướng dẫn định dạng tệp chuẩn:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                <li>Câu hỏi định dạng: <code className="text-indigo-200">Câu 1: ...</code> hoặc <code className="text-indigo-200">Câu hỏi 1: ...</code></li>
                <li>Các phương án: <code className="text-indigo-200">A. ...</code>, <code className="text-indigo-200">B. ...</code>, <code className="text-indigo-200">C. ...</code>, <code className="text-indigo-200">D. ...</code></li>
                <li>Đáp án đúng: <code className="text-indigo-200">Đáp án: A</code> (nếu có trong tệp)</li>
                <li>Hình ảnh trong DOCX sẽ được cố gắng giữ lại nguyên vẹn.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT QUESTIONS SCREEN */
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
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-bold text-slate-500 pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Khối lớp: {grade}</span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Chủ đề: {topic}</span>
                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">Tổng số: {questions.length} câu hỏi</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors text-xs">
                  <Upload className="w-4 h-4 text-indigo-600" />
                  <span>Tải tệp từ máy tính</span>
                  <input
                    type="file"
                    accept=".docx,.pdf,.txt,.json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setShowExamPreviewModal(true)}
                  className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-extrabold px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Eye className="w-4 h-4 text-indigo-600" />
                  Xem trước toàn bộ đề thi
                </button>
              </div>
            </div>
          </div>

          {/* LIST OF EDITABLE QUESTIONS */}
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div
                key={q.id}
                className="bg-white border border-slate-100 rounded-[28px] p-6 shadow-sm space-y-6 hover:shadow-md transition-shadow relative"
              >
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
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

                {/* EDIT QUESTION CONTENT */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Nội dung câu hỏi
                    </label>
                    <textarea
                      value={q.question}
                      onChange={(e) => handleEditQuestionField(q.id, "question", e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-indigo-500 rounded-2xl p-3 text-sm focus:outline-none transition-all font-bold text-slate-800"
                      rows={2}
                    />
                  </div>

                  {/* QUESTION IMAGE SECTION */}
                  <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5">
                        <ImageIcon className="w-4 h-4 text-indigo-600" />
                        Hình ảnh minh họa cho câu hỏi (Tùy chọn)
                      </label>

                      {!q.imageUrl && (
                        <label className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>Tải ảnh từ máy tính</span>
                          <input
                            type="file"
                            accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                            onChange={(e) => handleQuestionImageUpload(q.id, e)}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>

                    {q.imageUrl ? (
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-white p-3 rounded-xl border border-slate-200">
                        <div className="relative group rounded-lg overflow-hidden border border-slate-200 max-h-36 max-w-xs bg-slate-100 shrink-0">
                          <img
                            src={q.imageUrl}
                            alt="Minh họa câu hỏi"
                            className="max-h-32 object-contain"
                          />
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setPreviewImageUrl(q.imageUrl || null)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                            Xem ảnh lớn
                          </button>
                          <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer flex items-center gap-1 border border-indigo-200 transition-colors">
                            <RefreshCw className="w-3.5 h-3.5" />
                            Thay đổi ảnh
                            <input
                              type="file"
                              accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                              onChange={(e) => handleQuestionImageUpload(q.id, e)}
                              className="hidden"
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveQuestionImage(q.id)}
                            className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-rose-200 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xóa ảnh
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 font-medium">
                        Hỗ trợ các định dạng tệp ảnh: .png, .jpg, .jpeg, .webp, .gif
                      </p>
                    )}
                  </div>

                  {/* OPTIONS GRID */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {q.options.map((opt, oIdx) => {
                      const letter = ["A", "B", "C", "D"][oIdx];
                      const isCorrect = q.correctAnswer === letter;
                      const optText = getOptionText(opt);
                      const optImg = getOptionImage(opt, q, oIdx);

                      return (
                        <div key={oIdx} className="bg-slate-50/60 border border-slate-100 rounded-2xl p-3.5 space-y-3">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleEditQuestionField(q.id, "correctAnswer", letter)}
                              className={`w-9 h-9 shrink-0 rounded-2xl font-black text-xs flex items-center justify-center border transition-all cursor-pointer ${
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
                              value={optText}
                              onChange={(e) => handleEditOptionText(q.id, oIdx, e.target.value)}
                              placeholder={`Nội dung lựa chọn ${letter}...`}
                              className="flex-1 bg-white border border-slate-200 focus:ring-2 focus:ring-indigo-500 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none font-medium text-slate-800"
                            />
                            
                            {!optImg && (
                              <label className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-xl cursor-pointer transition-colors border border-slate-200 bg-white shrink-0" title="Tải ảnh cho phương án này">
                                <ImageIcon className="w-4 h-4" />
                                <input
                                  type="file"
                                  accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                  onChange={(e) => handleOptionImageUpload(q.id, oIdx, e)}
                                  className="hidden"
                                />
                              </label>
                            )}
                          </div>

                          {/* Option Image Thumbnail if present */}
                          {optImg && (
                            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 ml-12">
                              <img src={optImg} alt={`Minh hoa option ${letter}`} className="h-14 w-14 object-cover rounded-lg border border-slate-100" />
                              <div className="flex items-center gap-2">
                                <label className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer">
                                  Đổi ảnh
                                  <input
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                                    onChange={(e) => handleOptionImageUpload(q.id, oIdx, e)}
                                    className="hidden"
                                  />
                                </label>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveOptionImage(q.id, oIdx)}
                                  className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                                >
                                  Xóa
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* EXPLANATION & KEY POINT & DIFFICULTY */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-dashed border-slate-200">
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
                        value={q.keyPoint || ""}
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

          {/* ACTION BUTTONS FOOTER */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm">
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={handleAddQuestion}
                className="flex-1 sm:flex-initial border border-indigo-100 hover:border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-black py-3.5 px-5 rounded-2xl cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-4 h-4" />
                Thêm câu hỏi mới
              </button>
              <label className="flex-1 sm:flex-initial border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-black py-3.5 px-5 rounded-2xl cursor-pointer inline-flex items-center justify-center gap-1.5 transition-all">
                <Upload className="w-4 h-4 text-indigo-600" />
                <span>Tải tệp từ máy tính</span>
                <input
                  type="file"
                  accept=".docx,.pdf,.txt,.json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowExamPreviewModal(true)}
                className="flex-1 sm:flex-initial border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-black py-3.5 px-5 rounded-2xl cursor-pointer flex items-center justify-center gap-1.5 transition-all"
              >
                <Eye className="w-4 h-4" />
                Xem trước đề
              </button>
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

      {/* FULL IMAGE LIGHTBOX MODAL */}
      {previewImageUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-3xl p-4 overflow-hidden border border-slate-200 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 right-4 bg-slate-900 text-white p-2 rounded-full hover:bg-slate-700 transition-colors z-10 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img src={previewImageUrl} alt="Xem trước hình ảnh" className="max-h-[80vh] object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* FULL EXAM PREVIEW MODAL */}
      {showExamPreviewModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-fadeIn border border-slate-100 my-auto">
            <div className="flex justify-between items-center border-b border-slate-100 p-6 bg-indigo-50/50 rounded-t-[32px]">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100 px-3 py-1 rounded-xl">
                  XEM TRƯỚC ĐỀ THI
                </span>
                <h3 className="font-black text-xl text-slate-900 mt-2">{title || "Đề kiểm tra Tin học"}</h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Khối: {grade} • Thời gian: {duration} phút • {questions.length} câu hỏi</p>
              </div>
              <button
                onClick={() => setShowExamPreviewModal(false)}
                className="text-slate-400 hover:text-slate-600 p-2.5 rounded-2xl bg-white border border-slate-200 cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {questions.map((q, qIdx) => (
                <div key={q.id} className="border border-slate-200 rounded-[24px] p-5 space-y-4 bg-slate-50/40">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-900 text-white text-xs font-black w-6 h-6 rounded-full flex items-center justify-center">
                      {qIdx + 1}
                    </span>
                    <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase">
                      {q.difficulty}
                    </span>
                  </div>

                  <p className="font-black text-slate-900 text-sm leading-relaxed">{q.question}</p>

                  {/* Question Image */}
                  {q.imageUrl && (
                    <div className="my-2">
                      <img src={q.imageUrl} alt="Hình minh họa câu hỏi" className="max-h-52 object-contain rounded-2xl border border-slate-200 bg-white p-1" />
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const letter = ["A", "B", "C", "D"][oIdx];
                      const isCorrect = q.correctAnswer === letter;
                      const optText = getOptionText(opt);
                      const optImg = getOptionImage(opt, q, oIdx);

                      return (
                        <div
                          key={oIdx}
                          className={`flex items-center gap-3 p-3.5 rounded-2xl border ${
                            isCorrect
                              ? "bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-sm"
                              : "bg-white border-slate-200 text-slate-700"
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-xl text-xs font-black flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? "bg-emerald-500 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {letter}
                          </span>
                          <div className="flex-1">
                            <span>{optText}</span>
                            {optImg && (
                              <img src={optImg} alt="" className="h-10 w-10 object-cover rounded-lg border border-slate-200 mt-1" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="bg-indigo-50/50 border-l-4 border-indigo-500 p-3 rounded-r-2xl space-y-1 text-xs text-slate-600">
                    <p>💡 <strong>Lời giải thích:</strong> {q.explanation}</p>
                    {q.keyPoint && <p>⭐ <strong>Ghi nhớ:</strong> {q.keyPoint}</p>}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50 rounded-b-[32px]">
              <button
                type="button"
                onClick={() => setShowExamPreviewModal(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-black px-5 py-3 rounded-2xl transition-colors cursor-pointer"
              >
                Đóng xem trước
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowExamPreviewModal(false);
                  handleSaveExam();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black px-6 py-3 rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-md shadow-indigo-100"
              >
                <Save className="w-4 h-4" />
                Lưu đề thi này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
