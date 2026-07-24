import { Question } from "../types";

export interface ParseResult {
  title: string;
  grade: string;
  topic: string;
  questions: Question[];
  log: {
    readSuccess: boolean;
    textCharCount: number;
    questionsCount: number;
    parseMethod: "json" | "gemini" | "regex_client" | "regex_server";
    details: string;
  };
}

/**
 * Clean option string
 */
function cleanOptionText(opt: string): string {
  if (!opt) return "";
  return opt
    .replace(/^([A-Da-d])[\.\)\:\-\/]\s*/, "") // remove leading A. or A)
    .trim();
}

/**
 * Extract options from a single line if it contains multiple inline options (e.g. "A. Cat  B. Dog  C. Bird  D. Fish")
 */
function extractInlineOptions(line: string): { letter: string; text: string }[] {
  const options: { letter: string; text: string }[] = [];
  // Matches A. ... B. ... C. ... D. ... or A) ... B) ... etc.
  const regex = /(?:^|\s+)([A-Da-d])[\.\)\:\-\/]\s*(.*?)(?=(?:\s+[A-Da-d][\.\)\:\-\/]\s*|$))/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    const letter = match[1].toUpperCase();
    const text = match[2].trim();
    if (text) {
      options.push({ letter, text });
    }
  }

  return options;
}

/**
 * Extract PDF text from binary ArrayBuffer without external dependencies
 */
export function extractTextFromPdfBinary(buffer: ArrayBuffer): string {
  try {
    const bytes = new Uint8Array(buffer);
    let str = "";
    // Convert to string in chunks to prevent stack overflow
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      str += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
    }

    const extractedTextParts: string[] = [];

    // Look for text in PDF stream blocks / Tj / TJ brackets
    const textBlockRegex = /\(([^)]+)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = textBlockRegex.exec(str)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        extractedTextParts.push(match[1]);
      }
    }

    // Look for TJ array brackets
    const arrayBlockRegex = /\[\s*\(([^)]+)\).*\s*\]\s*TJ/g;
    while ((match = arrayBlockRegex.exec(str)) !== null) {
      if (match[1] && match[1].trim().length > 0) {
        extractedTextParts.push(match[1]);
      }
    }

    if (extractedTextParts.length > 0) {
      return extractedTextParts.join(" ");
    }

    // Fallback: extract printable ASCII and UTF-8 strings longer than 3 chars
    const printableStr = str.replace(/[^\x20-\x7E\u00C0-\u024F\u1EA0-\u1EF9]/g, " ");
    const words = printableStr.split(/\s+/).filter((w) => w.length > 1);
    return words.join(" ");
  } catch (e) {
    console.warn("[PDF Parser Fallback] Failed to parse PDF binary string:", e);
    return "";
  }
}

/**
 * Flexible Regex Exam Parser for Vietnamese & General Exam Structures
 */
export function parseExamFromText(rawText: string, fileName?: string): ParseResult {
  const textCharCount = rawText ? rawText.trim().length : 0;

  if (!rawText || textCharCount === 0) {
    return {
      title: fileName ? fileName.replace(/\.[^/.]+$/, "") : "Đề thi mới",
      grade: "Tin học 3",
      topic: "Nội dung kiểm tra",
      questions: [],
      log: {
        readSuccess: false,
        textCharCount: 0,
        questionsCount: 0,
        parseMethod: "regex_client",
        details: "Tệp tải lên không chứa nội dung văn bản."
      }
    };
  }

  // Pre-process text lines
  const lines = rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const questions: Question[] = [];
  let currentQ: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: string;
    explanation: string;
    keyPoint: string;
    difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
  } | null = null;

  // Regex patterns
  // 1. Question headers: "Câu 1:", "Câu hỏi 1.", "Câu 1 (1 điểm):", "1.", "1/", "1)", "Bài 1:"
  const questionHeaderRegex = /^(?:Câu|Câu hỏi|Question|Bài)\s*(\d+)\s*(?:[\(\[].*?[\)\]])?[\.\:\-\/]?\s*(.*)$/i;
  const numericHeaderRegex = /^(\d+)[\.\:\-\/]\s+(.+)$/;

  // 2. Option headers: "A. ...", "A) ...", "A/ ...", "a. ...", "[A] ..."
  const optionHeaderRegex = /^([A-Da-d])[\.\)\:\-\/]\s*(.*)$/;
  const optionBracketRegex = /^[\(\[]([A-Da-d])[\)\]]\s*(.*)$/;

  // 3. Answer line: "Đáp án: A", "Đáp án đúng: A", "Đ/A: A", "Key: A", "ĐÚNG: A"
  const answerRegex = /^(?:Đáp án|Đáp án đúng|Đ\/A|DA|Key|ĐÚNG)\s*[\:\-\.]?\s*([A-Da-d])/i;

  // 4. Explanation line: "Giải thích: ...", "Lời giải: ...", "Hướng dẫn: ...", "HD: ..."
  const explanationRegex = /^(?:Giải thích|Lời giải|Hướng dẫn|HD)\s*[\:\-\.]?\s*(.*)$/i;

  // 5. Key point: "Ghi nhớ: ...", "Kiến thức: ...", "Lưu ý: ..."
  const keyPointRegex = /^(?:Ghi nhớ|Kiến thức|Lưu ý)\s*[\:\-\.]?\s*(.*)$/i;

  const pushCurrentQuestion = () => {
    if (currentQ && currentQ.question.trim()) {
      // Ensure 4 options minimum
      while (currentQ.options.length < 4) {
        const letter = ["A", "B", "C", "D"][currentQ.options.length];
        currentQ.options.push(`Phương án ${letter}`);
      }
      // Truncate to 4 options if extra
      if (currentQ.options.length > 4) {
        currentQ.options = currentQ.options.slice(0, 4);
      }

      questions.push({
        ...currentQ,
        id: `q-parsed-${Date.now()}-${questions.length}`,
        question: currentQ.question.trim(),
        explanation: currentQ.explanation || "Giải thích đáp án đúng.",
        keyPoint: currentQ.keyPoint || "Kiến thức trọng tâm bài học.",
        difficulty: currentQ.difficulty
      });
    }
    currentQ = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line is a question header
    const qMatch = line.match(questionHeaderRegex);
    const numMatch = !qMatch ? line.match(numericHeaderRegex) : null;

    if (qMatch || numMatch) {
      pushCurrentQuestion();

      const qText = qMatch ? qMatch[2] : numMatch ? numMatch[2] : line;
      currentQ = {
        id: `q-temp-${Date.now()}-${questions.length}`,
        question: qText || line,
        options: [],
        correctAnswer: "A",
        explanation: "Giải thích đáp án đúng.",
        keyPoint: "Ghi nhớ kiến thức.",
        difficulty: "Nhận biết"
      };
      continue;
    }

    if (!currentQ) {
      // If no question started yet, create an initial default question container
      currentQ = {
        id: `q-temp-${Date.now()}-0`,
        question: line,
        options: [],
        correctAnswer: "A",
        explanation: "Giải thích đáp án đúng.",
        keyPoint: "Ghi nhớ kiến thức.",
        difficulty: "Nhận biết"
      };
      continue;
    }

    // Check for inline options (A. ... B. ... C. ... D. ...)
    const inlineOpts = extractInlineOptions(line);
    if (inlineOpts.length >= 2) {
      inlineOpts.forEach((opt) => {
        if (currentQ && currentQ.options.length < 4) {
          currentQ.options.push(opt.text);
        }
      });
      continue;
    }

    // Check for single option line
    const optMatch = line.match(optionHeaderRegex) || line.match(optionBracketRegex);
    if (optMatch) {
      const optText = optMatch[2] || line;
      if (currentQ.options.length < 4) {
        currentQ.options.push(optText);
      }
      continue;
    }

    // Check for correct answer line
    const ansMatch = line.match(answerRegex);
    if (ansMatch) {
      currentQ.correctAnswer = ansMatch[1].toUpperCase();
      continue;
    }

    // Check for explanation line
    const expMatch = line.match(explanationRegex);
    if (expMatch) {
      currentQ.explanation = expMatch[1] || "";
      continue;
    }

    // Check for key point
    const kpMatch = line.match(keyPointRegex);
    if (kpMatch) {
      currentQ.keyPoint = kpMatch[1] || "";
      continue;
    }

    // Append text to current question body if no options gathered yet
    if (currentQ.options.length === 0) {
      currentQ.question += " " + line;
    }
  }

  // Push final question
  pushCurrentQuestion();

  const success = questions.length > 0;
  const defaultTitle = fileName ? fileName.replace(/\.[^/.]+$/, "") : "Đề thi trích xuất từ tệp";

  return {
    title: defaultTitle,
    grade: "Tin học 3",
    topic: "Kiểm tra tổng hợp",
    questions,
    log: {
      readSuccess: true,
      textCharCount,
      questionsCount: questions.length,
      parseMethod: "regex_client",
      details: success
        ? `Đã trích xuất thành công ${questions.length} câu hỏi từ ${textCharCount} ký tự văn bản.`
        : `Đã đọc tệp thành công (${textCharCount} ký tự text) nhưng chưa tìm thấy cấu trúc câu hỏi dạng "Câu 1:" hoặc "1.".`
    }
  };
}
