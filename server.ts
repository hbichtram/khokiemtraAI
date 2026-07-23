import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";

dotenv.config();

const firebaseConfig = {
  apiKey: "AIzaSyBNitKSb2v9jokWfbA4h_GMmLKoykCWemU",
  authDomain: "khokiemtraai.firebaseapp.com",
  projectId: "khokiemtraai",
  storageBucket: "khokiemtraai.firebasestorage.app",
  messagingSenderId: "274243763018",
  appId: "1:274243763018:web:5ab626779c03d099dd5fb3"
};

const firebaseApp = initializeApp(firebaseConfig);
const firestoreDb = getFirestore(firebaseApp);

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Define TypeScript types for the server
interface Student {
  id: string;
  name: string;
  studentCode: string;
  classId: string;
}

interface Class {
  id: string;
  teacherId: string;
  name: string;
  classCode: string;
  students: Student[];
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  keyPoint: string;
  difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
}

interface Exam {
  id: string;
  teacherId: string;
  title: string;
  grade: string;
  topic: string;
  duration: number; // minutes
  questions: Question[];
  createdAt: string;
}

interface Assignment {
  id: string;
  examId: string;
  classId: string;
  startTime: string;
  endTime: string;
  status: "Chưa bắt đầu" | "Đang diễn ra" | "Đã hoàn thành" | "Đã hết hạn";
  teacherId?: string;
  createdAt?: string;
}

interface Submission {
  id: string;
  examId: string;
  assignmentId: string;
  studentId: string;
  answers: Record<string, string>;
  score: number;
  correctCount: number;
  wrongCount: number;
  submittedAt: string;
  duration: number; // seconds
  status?: "in_progress" | "submitted";
  startedAt?: string;
  classId?: string;
}

interface DbSchema {
  classes: Class[];
  exams: Exam[];
  assignments: Assignment[];
  submissions: Submission[];
}

// Ensure the database file exists with some initial seed data
function initDb(): DbSchema {
  if (fs.existsSync(DB_FILE)) {
    try {
      const data = fs.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data);
    } catch (e) {
      console.error("Error reading database file, recreating it...", e);
    }
  }

  // Create seed data
  const seedDb: DbSchema = {
    classes: [
      {
        id: "class-1",
        teacherId: "teacher-default",
        name: "Lớp 3A - Tin học Tiểu học",
        classCode: "TH3A99",
        students: [
          { id: "student-1", name: "Nguyễn Văn An", studentCode: "HS3A01", classId: "class-1" },
          { id: "student-2", name: "Lê Thị Bình", studentCode: "HS3A02", classId: "class-1" },
          { id: "student-3", name: "Trần Minh Cường", studentCode: "HS3A03", classId: "class-1" }
        ]
      },
      {
        id: "class-2",
        teacherId: "teacher-default",
        name: "Lớp 4B - Lập trình Scratch",
        classCode: "TH4B88",
        students: [
          { id: "student-4", name: "Phạm Hồng Đăng", studentCode: "HS4B01", classId: "class-2" },
          { id: "student-5", name: "Đỗ Gia Huy", studentCode: "HS4B02", classId: "class-2" }
        ]
      },
      {
        id: "class-3",
        teacherId: "teacher-default",
        name: "Lớp 5C - Lắp ráp Robot",
        classCode: "TH5C77",
        students: [
          { id: "student-6", name: "Vũ Khánh Linh", studentCode: "HS5C01", classId: "class-3" },
          { id: "student-7", name: "Hoàng Minh Nam", studentCode: "HS5C02", classId: "class-3" }
        ]
      }
    ],
    exams: [
      {
        id: "exam-1",
        teacherId: "teacher-default",
        title: "Đề kiểm tra Tin học Lớp 3: Làm quen với máy tính",
        grade: "Lớp 3",
        topic: "Các bộ phận của máy tính",
        duration: 15,
        questions: [
          {
            id: "q-1-1",
            question: "Bộ phận nào của máy tính dùng để gõ chữ và số vào màn hình?",
            options: [
              "Bàn phím (Keyboard)",
              "Chuột máy tính (Mouse)",
              "Màn hình (Monitor)",
              "Thân máy (CPU Case)"
            ],
            correctAnswer: "A",
            explanation: "Bàn phím chứa các phím chữ và số, khi gõ sẽ truyền thông tin hiển thị lên màn hình.",
            keyPoint: "Bàn phím là thiết bị nhập dữ liệu dạng ký tự.",
            difficulty: "Nhận biết"
          },
          {
            id: "q-1-2",
            question: "Khi làm việc với máy tính, tư thế ngồi nào là đúng để bảo vệ mắt và cột sống?",
            options: [
              "Nằm ra bàn để nhìn cho rõ",
              "Ngồi thẳng lưng, mắt cách màn hình từ 50-80 cm",
              "Ngồi ghé sát mắt vào màn hình",
              "Ngồi cong lưng, cúi đầu sát bàn phím"
            ],
            correctAnswer: "B",
            explanation: "Tư thế ngồi thẳng lưng và giữ khoảng cách an toàn giúp tránh cận thị và đau lưng.",
            keyPoint: "Luôn ngồi thẳng lưng và giữ khoảng cách 50-80cm với màn hình.",
            difficulty: "Thông hiểu"
          }
        ],
        createdAt: new Date().toISOString()
      },
      {
        id: "exam-2",
        teacherId: "teacher-default",
        title: "Đề kiểm tra Tin học Lớp 5: Thuật toán lặp Scratch",
        grade: "Lớp 5",
        topic: "Cấu trúc lặp trong Scratch",
        duration: 20,
        questions: [
          {
            id: "q-2-1",
            question: "Trong Scratch, khối lệnh nào giúp nhân vật lặp lại một hành động với số lần biết trước?",
            options: [
              "Khối lệnh 'Forever' (Liên tục)",
              "Khối lệnh 'Repeat [10]' (Lặp lại 10 lần)",
              "Khối lệnh 'If... then' (Nếu... thì)",
              "Khối lệnh 'Wait [1] secs' (Đợi 1 giây)"
            ],
            correctAnswer: "B",
            explanation: "Khối lệnh 'Repeat [số lần]' được sử dụng khi chúng ta biết trước chính xác số lần cần lặp lại.",
            keyPoint: "Dùng 'Repeat' cho số lần lặp cố định, dùng 'Forever' để lặp vô hạn.",
            difficulty: "Nhận biết"
          },
          {
            id: "q-2-2",
            question: "Để vẽ một hình vuông trong Scratch bằng cách lặp lại khối lệnh 'Move' (Di chuyển) và 'Turn' (Xoay góc), em cần cấu hình lặp lại mấy lần?",
            options: [
              "2 lần",
              "3 lần",
              "4 lần",
              "5 lần"
            ],
            correctAnswer: "C",
            explanation: "Hình vuông có 4 cạnh bằng nhau và 4 góc vuông, do đó ta cần lặp lại cụm lệnh vẽ cạnh và xoay góc đúng 4 lần.",
            keyPoint: "Vẽ đa giác đều N cạnh thì lặp lại N lần và xoay một góc bằng 360/N độ.",
            difficulty: "Vận dụng"
          }
        ],
        createdAt: new Date().toISOString()
      }
    ],
    assignments: [
      {
        id: "assign-1",
        examId: "exam-2",
        classId: "class-3", // Lớp 5C
        startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        endTime: new Date(Date.now() + 86400000).toISOString(), // 24 hours later
        status: "Đang diễn ra"
      }
    ],
    submissions: []
  };

  fs.writeFileSync(DB_FILE, JSON.stringify(seedDb, null, 2), "utf-8");
  return seedDb;
}

const db = initDb();

async function syncToFirebase() {
  try {
    await setDoc(doc(firestoreDb, "appData", "main"), {
      classes: db.classes,
      exams: db.exams,
      assignments: db.assignments,
      submissions: db.submissions,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error("Firebase sync error:", err);
  }
}

async function loadFromFirebase() {
  try {
    const snap = await getDoc(doc(firestoreDb, "appData", "main"));
    if (snap.exists()) {
      const data = snap.data();
      if (data.classes) db.classes = data.classes;
      if (data.exams) db.exams = data.exams;
      if (data.assignments) db.assignments = data.assignments;
      if (data.submissions) db.submissions = data.submissions;
      console.log("Successfully synced database with Firebase khokiemtraai");
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
    } else {
      await syncToFirebase();
    }
  } catch (err) {
    console.error("Firebase initial load error:", err);
  }
}

// Initial sync with Firebase khokiemtraai
loadFromFirebase().catch(() => {});

function saveDb() {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf-8");
  syncToFirebase().catch(() => {});
}

// Generate unique 6-character class code
function generateClassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (db.classes.some((c) => c.classCode === code));
  return code;
}

// Helper to update active status of assignments dynamically
function updateAssignmentStatuses() {
  const now = new Date();
  let changed = false;
  db.assignments.forEach((asg) => {
    const start = new Date(asg.startTime);
    const end = new Date(asg.endTime);
    let newStatus: typeof asg.status;
    if (now < start) {
      newStatus = "Chưa bắt đầu";
    } else if (now > end) {
      newStatus = "Đã hết hạn";
    } else {
      newStatus = "Đang diễn ra";
    }
    if (asg.status !== newStatus) {
      asg.status = newStatus;
      changed = true;
    }
  });
  if (changed) {
    saveDb();
  }
}

// Initialize Gemini Client helper
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Teacher Authentication (Simple sessionless lookup/mock)
app.post("/api/auth/teacher-login", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Vui lòng nhập Email." });
  }
  // Store dynamic email if correct or use standard
  res.json({
    id: "teacher-default",
    name: "Giáo viên Tin học",
    email: email,
    role: "teacher"
  });
});

// Student Login by Code
app.post("/api/auth/student-login", (req, res) => {
  const { studentCode } = req.body;
  if (!studentCode) {
    return res.status(400).json({ error: "Vui lòng nhập Mã học sinh." });
  }

  // Look up student across classes
  let foundStudent: Student | null = null;
  let foundClass: Class | null = null;

  for (const cls of db.classes) {
    const std = cls.students.find((s) => s.studentCode.toUpperCase() === studentCode.toUpperCase());
    if (std) {
      foundStudent = std;
      foundClass = cls;
      break;
    }
  }

  if (!foundStudent || !foundClass) {
    return res.status(404).json({ error: "Không tìm thấy học sinh có mã này. Vui lòng kiểm tra lại!" });
  }

  console.log("[DEBUG_CURRENT_STUDENT]", {
    id: foundStudent.id,
    studentId: foundStudent.id,
    studentCode: foundStudent.studentCode,
    name: foundStudent.name,
    classId: foundClass.id
  });

  res.json({
    id: foundStudent.id,
    name: foundStudent.name,
    studentCode: foundStudent.studentCode,
    role: "student",
    classId: foundClass.id,
    className: foundClass.name
  });
});

// GET general overview stats for Teacher Dashboard
app.get("/api/teacher/overview", (req, res) => {
  updateAssignmentStatuses();
  const totalClasses = db.classes.length;
  const totalStudents = db.classes.reduce((sum, cls) => sum + cls.students.length, 0);
  const totalExams = db.exams.length;
  const activeAssignments = db.assignments.filter((asg) => asg.status === "Đang diễn ra").length;

  // Recent 5 exams
  const recentExams = [...db.exams]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  // Active assignments details
  const activeAssignmentsDetails = db.assignments
    .filter((asg) => asg.status === "Đang diễn ra")
    .map((asg) => {
      const exam = db.exams.find((e) => e.id === asg.examId);
      const cls = db.classes.find((c) => c.id === asg.classId);
      return {
        id: asg.id,
        examTitle: exam ? exam.title : "Đề thi không tồn tại",
        className: cls ? cls.name : "Lớp học không tồn tại",
        endTime: asg.endTime,
        submissionCount: db.submissions.filter((s) => s.assignmentId === asg.id).length,
        totalStudents: cls ? cls.students.length : 0
      };
    });

  // Recent 5 submissions
  const recentSubmissions = [...db.submissions]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 5)
    .map((sub) => {
      const exam = db.exams.find((e) => e.id === sub.examId);
      const assignment = db.assignments.find((a) => a.id === sub.assignmentId);
      let studentName = "Học sinh";
      let className = "Lớp học";

      for (const cls of db.classes) {
        const std = cls.students.find((s) => s.id === sub.studentId);
        if (std) {
          studentName = std.name;
          className = cls.name;
          break;
        }
      }

      return {
        id: sub.id,
        studentName,
        className,
        examTitle: exam ? exam.title : "Đề thi",
        score: sub.score,
        submittedAt: sub.submittedAt
      };
    });

  res.json({
    stats: {
      totalClasses,
      totalStudents,
      totalExams,
      activeAssignments
    },
    recentExams,
    activeAssignments: activeAssignmentsDetails,
    recentSubmissions
  });
});

// ==========================================
// CLASS MODULE
// ==========================================
app.get("/api/classes", (req, res) => {
  res.json(db.classes);
});

app.post("/api/classes", (req, res) => {
  const { name } = req.body;
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Tên lớp không được để trống" });
  }

  const newClass: Class = {
    id: `class-${Date.now()}`,
    teacherId: "teacher-default",
    name: name.trim(),
    classCode: generateClassCode(),
    students: []
  };

  db.classes.push(newClass);
  saveDb();
  res.status(201).json(newClass);
});

app.delete("/api/classes/:id", (req, res) => {
  const index = db.classes.findIndex((c) => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Lớp học không tồn tại" });
  }

  // Remove corresponding assignments and submissions first to clean up
  db.assignments = db.assignments.filter((asg) => asg.classId !== req.params.id);
  db.classes.splice(index, 1);
  saveDb();
  res.json({ success: true, message: "Xóa lớp thành công" });
});

// Student operations in Class
app.post("/api/classes/:classId/students", (req, res) => {
  const { name, studentCode } = req.body;
  const classId = req.params.classId;

  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) {
    return res.status(404).json({ error: "Lớp học không tồn tại" });
  }

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Họ và tên học sinh không được để trống" });
  }

  const cleanCode = studentCode && studentCode.trim() !== "" 
    ? studentCode.trim().toUpperCase() 
    : `HS${cls.classCode}${(cls.students.length + 1).toString().padStart(2, "0")}`;

  // Check unique student code
  const codeExists = db.classes.some((c) => c.students.some((s) => s.studentCode === cleanCode));
  if (codeExists) {
    return res.status(400).json({ error: `Mã học sinh '${cleanCode}' đã tồn tại trong hệ thống.` });
  }

  const newStudent: Student = {
    id: `student-${Date.now()}`,
    name: name.trim(),
    studentCode: cleanCode,
    classId: classId
  };

  cls.students.push(newStudent);
  saveDb();
  res.status(201).json(newStudent);
});

app.post("/api/classes/:classId/students/bulk", (req, res) => {
  const classId = req.params.classId;
  const { students } = req.body;

  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) {
    return res.status(404).json({ error: "Lớp học không tồn tại" });
  }

  if (!students || !Array.isArray(students)) {
    return res.status(400).json({ error: "Danh sách học sinh không hợp lệ" });
  }

  const addedStudents: any[] = [];
  const nowStr = new Date().toISOString();

  for (const s of students) {
    const name = String(s.name || "").trim();
    const studentCode = String(s.studentCode || "").trim().toUpperCase();

    // Check unique student code in database (across all classes)
    const codeExists = db.classes.some((c) => c.students.some((std) => std.studentCode === studentCode));
    if (codeExists) {
      continue;
    }

    const newStudent = {
      id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      name,
      studentCode,
      classId,
      teacherId: "teacher-default",
      createdAt: nowStr
    };

    cls.students.push(newStudent);
    addedStudents.push(newStudent);
  }

  if (addedStudents.length > 0) {
    saveDb();
  }

  res.status(201).json({
    success: true,
    addedCount: addedStudents.length,
    students: addedStudents
  });
});

app.put("/api/classes/:classId/students/:studentId", (req, res) => {
  const { name, studentCode } = req.body;
  const { classId, studentId } = req.params;

  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) {
    return res.status(404).json({ error: "Lớp học không tồn tại" });
  }

  const student = cls.students.find((s) => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: "Không tìm thấy học sinh" });
  }

  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Tên học sinh không được trống" });
  }

  if (studentCode && studentCode.trim().toUpperCase() !== student.studentCode) {
    const cleanCode = studentCode.trim().toUpperCase();
    const codeExists = db.classes.some((c) => c.students.some((s) => s.id !== studentId && s.studentCode === cleanCode));
    if (codeExists) {
      return res.status(400).json({ error: `Mã học sinh '${cleanCode}' đã được sử dụng.` });
    }
    student.studentCode = cleanCode;
  }

  student.name = name.trim();
  saveDb();
  res.json(student);
});

app.delete("/api/classes/:classId/students/:studentId", (req, res) => {
  const { classId, studentId } = req.params;
  const cls = db.classes.find((c) => c.id === classId);
  if (!cls) {
    return res.status(404).json({ error: "Lớp học không tồn tại" });
  }

  const index = cls.students.findIndex((s) => s.id === studentId);
  if (index === -1) {
    return res.status(404).json({ error: "Học sinh không tồn tại trong lớp này" });
  }

  // Remove submissions of this student
  db.submissions = db.submissions.filter((sub) => sub.studentId !== studentId);
  cls.students.splice(index, 1);
  saveDb();
  res.json({ success: true, message: "Xóa học sinh thành công" });
});

// ==========================================
// EXAM MODULE
// ==========================================
app.get("/api/exams", (req, res) => {
  res.json(db.exams);
});

app.get("/api/exams/:id", (req, res) => {
  const exam = db.exams.find((e) => e.id === req.params.id);
  if (!exam) {
    return res.status(404).json({ error: "Không tìm thấy nội dung đề kiểm tra." });
  }

  // Strip answers, explanations, keyPoints if requested by student
  const isStudent = req.query.role === "student";
  if (isStudent) {
    const safeQuestions = exam.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: q.options,
      difficulty: q.difficulty
    }));
    return res.json({
      ...exam,
      questions: safeQuestions
    });
  }

  res.json(exam);
});

app.post("/api/exams", (req, res) => {
  const { title, grade, topic, duration, questions } = req.body;

  if (!title || !grade || !topic || !duration || !questions || !Array.isArray(questions)) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ các thông tin của đề thi." });
  }

  const newExam: Exam = {
    id: `exam-${Date.now()}`,
    teacherId: "teacher-default",
    title,
    grade,
    topic,
    duration: Number(duration),
    questions: questions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${idx}`
    })),
    createdAt: new Date().toISOString()
  };

  db.exams.push(newExam);
  saveDb();
  res.status(201).json(newExam);
});

app.put("/api/exams/:id", (req, res) => {
  const { title, grade, topic, duration, questions } = req.body;
  const exam = db.exams.find((e) => e.id === req.params.id);

  if (!exam) {
    return res.status(404).json({ error: "Đề thi không tồn tại" });
  }

  if (title) exam.title = title;
  if (grade) exam.grade = grade;
  if (topic) exam.topic = topic;
  if (duration) exam.duration = Number(duration);
  if (questions && Array.isArray(questions)) {
    exam.questions = questions.map((q, idx) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${idx}`
    }));
  }

  saveDb();
  res.json(exam);
});

app.post("/api/exams/:id/copy", (req, res) => {
  const original = db.exams.find((e) => e.id === req.params.id);
  if (!original) {
    return res.status(404).json({ error: "Không tìm thấy đề thi gốc" });
  }

  const copy: Exam = {
    ...original,
    id: `exam-${Date.now()}`,
    title: `${original.title} (Bản sao)`,
    createdAt: new Date().toISOString()
  };

  db.exams.push(copy);
  saveDb();
  res.status(201).json(copy);
});

app.delete("/api/exams/:id", (req, res) => {
  const index = db.exams.findIndex((e) => e.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Đề thi không tồn tại" });
  }

  // Clean up assignments using this exam
  db.assignments = db.assignments.filter((asg) => asg.examId !== req.params.id);
  db.submissions = db.submissions.filter((sub) => sub.examId !== req.params.id);

  db.exams.splice(index, 1);
  saveDb();
  res.json({ success: true, message: "Xóa đề thi thành công" });
});

// ==========================================
// AI EXAM GENERATOR (GEMINI)
// ==========================================

// Retry wrapper to handle transient Gemini API errors (like 503, 429, 404)
async function generateContentWithRetry(options: any, maxRetries = 3, baseDelayMs = 1000) {
  let attempt = 0;
  const originalModel = options.model || "gemini-3.6-flash";
  const aiClient = getGeminiClient();
  if (!aiClient) {
    throw new Error("Chưa cấu hình khóa API GEMINI_API_KEY trên môi trường. Vui lòng kiểm tra Environment Variables.");
  }

  const modelOrder = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-2.5-flash"];

  while (attempt < maxRetries) {
    try {
      return await aiClient.models.generateContent(options);
    } catch (error: any) {
      attempt++;
      const errStr = String(error.message || error).toUpperCase();
      console.warn(`Attempt ${attempt} for model ${options.model} failed: ${errStr}`);

      if (attempt >= maxRetries) {
        options.model = originalModel;
        throw error;
      }

      const currIdx = modelOrder.indexOf(options.model);
      if (currIdx !== -1 && currIdx + 1 < modelOrder.length) {
        options.model = modelOrder[currIdx + 1];
        console.warn(`Falling back to model: ${options.model}`);
      }

      const delay = baseDelayMs * Math.pow(2, attempt) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  options.model = originalModel;
  throw new Error("Không thể nhận phản hồi từ dịch vụ AI do quá tải.");
}

function cleanOptionText(text: string): string {
  if (!text) return "";
  let clean = String(text).trim();
  const match = clean.match(/^[A-Da-d][\.\)\:\-]\s*(.*)$/);
  if (match && match[1]) {
    return match[1].trim();
  }
  return clean;
}

function normalizeCorrectAnswer(val: string): string {
  if (!val) return "A";
  const str = String(val).trim().toUpperCase();
  if (str.startsWith("A") || str.includes("ÁP ÁN A") || str.includes("OPTION A")) return "A";
  if (str.startsWith("B") || str.includes("ÁP ÁN B") || str.includes("OPTION B")) return "B";
  if (str.startsWith("C") || str.includes("ÁP ÁN C") || str.includes("OPTION C")) return "C";
  if (str.startsWith("D") || str.includes("ÁP ÁN D") || str.includes("OPTION D")) return "D";
  return "A";
}

function extractOptionsList(rawOptions: any): string[] {
  if (Array.isArray(rawOptions)) {
    const cleanList = rawOptions.map((opt: any) => cleanOptionText(String(opt || "")));
    while (cleanList.length < 4) {
      cleanList.push(`Lựa chọn ${String.fromCharCode(65 + cleanList.length)}`);
    }
    return cleanList.slice(0, 4);
  }
  if (rawOptions && typeof rawOptions === "object") {
    const a = rawOptions.A || rawOptions.a || rawOptions["0"] || rawOptions["1"] || "";
    const b = rawOptions.B || rawOptions.b || rawOptions["1"] || rawOptions["2"] || "";
    const c = rawOptions.C || rawOptions.c || rawOptions["2"] || rawOptions["3"] || "";
    const d = rawOptions.D || rawOptions.d || rawOptions["3"] || rawOptions["4"] || "";
    const cleanList = [cleanOptionText(String(a)), cleanOptionText(String(b)), cleanOptionText(String(c)), cleanOptionText(String(d))];
    for (let i = 0; i < 4; i++) {
      if (!cleanList[i]) {
        cleanList[i] = `Lựa chọn ${String.fromCharCode(65 + i)}`;
      }
    }
    return cleanList;
  }
  if (typeof rawOptions === "string") {
    const lines = rawOptions.split("\n").map(l => l.trim()).filter(Boolean);
    const cleanList = lines.map(l => cleanOptionText(l));
    while (cleanList.length < 4) {
      cleanList.push(`Lựa chọn ${String.fromCharCode(65 + cleanList.length)}`);
    }
    return cleanList.slice(0, 4);
  }
  return ["Lựa chọn A", "Lựa chọn B", "Lựa chọn C", "Lựa chọn D"];
}

function parseAIResponseJSON(rawText: string): any {
  if (!rawText) throw new Error("Dữ liệu phản hồi từ AI rỗng.");
  let cleanText = rawText.trim();
  if (cleanText.includes("```")) {
    cleanText = cleanText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  }
  try {
    return JSON.parse(cleanText);
  } catch (e: any) {
    const startObj = cleanText.indexOf("{");
    const endObj = cleanText.lastIndexOf("}");
    if (startObj !== -1 && endObj !== -1 && endObj > startObj) {
      try {
        return JSON.parse(cleanText.substring(startObj, endObj + 1));
      } catch (e2) {}
    }
    const startArr = cleanText.indexOf("[");
    const endArr = cleanText.lastIndexOf("]");
    if (startArr !== -1 && endArr !== -1 && endArr > startArr) {
      try {
        return JSON.parse(cleanText.substring(startArr, endArr + 1));
      } catch (e3) {}
    }
    throw new Error(`Không thể phân tích dữ liệu JSON từ AI: ${e.message}`);
  }
}

app.post("/api/exams/generate", async (req, res) => {
  const { grade, topic, content, quantity } = req.body;

  if (!grade || !topic || !quantity) {
    return res.status(400).json({ error: "Vui lòng nhập đầy đủ khối lớp, chủ đề và số câu hỏi." });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return res.status(500).json({ error: "Hệ thống AI chưa được kích hoạt khóa API. Vui lòng cấu hình GEMINI_API_KEY trong Environment Variables." });
  }

  const qty = Number(quantity) || 5;

  const prompt = `Bạn là một trợ lý AI tạo đề thi Tin học tiểu học chuyên nghiệp cho giáo viên Việt Nam.
Hãy tạo đề kiểm tra Tin học lớp "${grade}" (đối tượng học sinh là các em tiểu học 8-11 tuổi).
Chủ đề kiểm tra: "${topic}".
Nội dung chi tiết cần bám sát: "${content || "Nội dung chuẩn chương trình Tin học tiểu học về chủ đề này"}".
Yêu cầu tạo chính xác: ${qty} câu hỏi trắc nghiệm (mỗi câu gồm 4 đáp án lựa chọn A, B, C, D).

Mỗi câu hỏi phải phù hợp cao với lứa tuổi tiểu học, câu từ sinh động, rõ ràng, dễ hiểu.
Mức độ câu hỏi phân bố hợp lý: Nhận biết (dễ), Thông hiểu (trung bình), Vận dụng (thách thức nhỏ).

Hãy phân tích và trả về kết quả cấu trúc JSON chính xác theo quy chuẩn. Không viết gì thêm ngoài JSON. Giao diện JSON có cấu trúc là một đối tượng chứa:
- title: Tiêu đề sinh động, thân thiện và hấp dẫn của đề kiểm tra (ví dụ: 'Thử tài lập trình Scratch Lớp 5', 'Khám phá thế giới máy tính Lớp 3')
- questions: Một mảng chứa đúng ${qty} câu hỏi, mỗi câu hỏi có cấu trúc chính xác như sau:
  {
    "question": "Nội dung câu hỏi ngắn gọn, thu hút",
    "options": [
      "Phương án A",
      "Phương án B",
      "Phương án C",
      "Phương án D"
    ],
    "correctAnswer": "A", // bắt buộc là một ký tự duy nhất trong số: "A", "B", "C", "D"
    "explanation": "Lời giải thích vì sao phương án được chọn là đúng, viết cực kỳ thân thiện như cô giáo giảng cho học sinh tiểu học nghe",
    "keyPoint": "Kiến thức học sinh cần ghi nhớ sau câu hỏi này",
    "difficulty": "Nhận biết" // chỉ được nhận một trong ba giá trị: 'Nhận biết', 'Thông hiểu', 'Vận dụng'
  }`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  correctAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                  keyPoint: { type: Type.STRING },
                  difficulty: { type: Type.STRING }
                },
                required: ["question", "options", "correctAnswer", "explanation", "keyPoint", "difficulty"]
              }
            }
          },
          required: ["title", "questions"]
        }
      }
    });

    const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = parseAIResponseJSON(rawText);

    let titleVal = parsedData.title || `Đề kiểm tra Tin học ${grade}: ${topic}`;
    let rawQuestions = parsedData.questions || parsedData.data || parsedData.results || (Array.isArray(parsedData) ? parsedData : []);

    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      throw new Error("Mô hình AI không trả về danh sách câu hỏi hợp lệ.");
    }

    const formattedQuestions = rawQuestions.map((q: any, idx: number) => {
      const optionsList = extractOptionsList(q.options);
      return {
        id: `q-ai-${Date.now()}-${idx}`,
        question: q.question || `Câu hỏi ${idx + 1} về ${topic}`,
        options: optionsList,
        correctAnswer: normalizeCorrectAnswer(q.correctAnswer),
        explanation: q.explanation || "Giải thích vì sao phương án này chính xác.",
        keyPoint: q.keyPoint || `Kiến thức trọng tâm về ${topic}`,
        difficulty: ["Nhận biết", "Thông hiểu", "Vận dụng"].includes(q.difficulty) ? q.difficulty : "Nhận biết"
      };
    });

    res.json({
      title: titleVal,
      questions: formattedQuestions
    });
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    res.status(500).json({ error: `Không thể tạo câu hỏi qua AI: ${error.message || error}` });
  }
});

// Request AI to regenerate a single question
app.post("/api/exams/generate-single-question", async (req, res) => {
  const { grade, topic, currentQuestionText } = req.body;

  if (!grade || !topic) {
    return res.status(400).json({ error: "Thiếu thông tin khối lớp hoặc chủ đề." });
  }

  const aiClient = getGeminiClient();
  if (!aiClient) {
    return res.status(500).json({ error: "Khóa API chưa được cấu hình." });
  }

  const prompt = `Bạn là một trợ lý giáo viên Tin học tiểu học. Hãy tạo MỘT câu hỏi trắc nghiệm mới tinh hoàn toàn về chủ đề "${topic}" dành cho học sinh "${grade}".
Câu hỏi mới này KHÔNG ĐƯỢC TRÙNG LẶP hoặc tương tự câu hỏi hiện tại sau đây: "${currentQuestionText || ""}".
Yêu cầu trả về duy nhất một đối tượng JSON khớp chính xác lược đồ sau:
{
  "question": "Nội dung câu hỏi ngắn gọn, thú vị cho học sinh tiểu học",
  "options": [
    "Phương án A",
    "Phương án B",
    "Phương án C",
    "Phương án D"
  ],
  "correctAnswer": "A", // bắt buộc là một ký tự duy nhất: 'A', 'B', 'C' hoặc 'D'
  "explanation": "Giải thích vì sao đúng, sinh động và dễ thương",
  "keyPoint": "Kiến thức quan trọng cần ghi nhớ",
  "difficulty": "Thông hiểu" // nhận một trong ba: 'Nhận biết', 'Thông hiểu', 'Vận dụng'
}`;

  try {
    const response = await generateContentWithRetry({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            correctAnswer: { type: Type.STRING },
            explanation: { type: Type.STRING },
            keyPoint: { type: Type.STRING },
            difficulty: { type: Type.STRING }
          },
          required: ["question", "options", "correctAnswer", "explanation", "keyPoint", "difficulty"]
        }
      }
    });

    const rawText = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsedData = parseAIResponseJSON(rawText);

    const optionsList = extractOptionsList(parsedData.options);
    const questionObj = {
      id: `q-ai-single-${Date.now()}`,
      question: parsedData.question || `Câu hỏi nâng cao về ${topic}`,
      options: optionsList,
      correctAnswer: normalizeCorrectAnswer(parsedData.correctAnswer),
      explanation: parsedData.explanation || "Giải thích phương án đúng.",
      keyPoint: parsedData.keyPoint || `Kiến thức ghi nhớ ${topic}`,
      difficulty: ["Nhận biết", "Thông hiểu", "Vận dụng"].includes(parsedData.difficulty) ? parsedData.difficulty : "Thông hiểu"
    };

    res.json({ question: questionObj });
  } catch (error: any) {
    console.error("AI Single Question Generation Error:", error);
    res.status(500).json({ error: `Không thể tạo lại câu hỏi này: ${error.message || error}` });
  }
});


// ==========================================
// ASSIGNMENT (GIAO BÀI) MODULE
// ==========================================
app.get("/api/assignments", (req, res) => {
  updateAssignmentStatuses();
  res.json(db.assignments);
});

// Detailed list of assignments with exam and class details
app.get("/api/assignments/detailed", (req, res) => {
  updateAssignmentStatuses();
  let list = db.assignments;
  const teacherId = req.query.teacherId as string;
  if (teacherId) {
    list = list.filter((asg) => !asg.teacherId || asg.teacherId === teacherId);
  }
  const detailedList = list.map((asg) => {
    const exam = db.exams.find((e) => e.id === asg.examId);
    const cls = db.classes.find((c) => c.id === asg.classId);
    return {
      ...asg,
      examTitle: exam ? exam.title : "Đề thi không tồn tại",
      examDuration: exam ? exam.duration : 15,
      className: cls ? cls.name : "Lớp không tồn tại",
      totalStudents: cls ? cls.students.length : 0,
      submissionCount: db.submissions.filter((s) => s.assignmentId === asg.id && s.status === "submitted").length
    };
  });
  res.json(detailedList);
});

app.get("/api/assignments/:id", (req, res) => {
  updateAssignmentStatuses();
  const asg = db.assignments.find((a) => a.id === req.params.id);
  if (!asg) {
    return res.status(404).json({ error: "Không tìm thấy bài kiểm tra được giao." });
  }
  res.json(asg);
});

app.post("/api/assignments", (req, res) => {
  const { examId, classId, startTime, endTime, teacherId } = req.body;

  if (!examId || !classId || !startTime || !endTime) {
    return res.status(400).json({ error: "Vui lòng chọn đề, lớp học và thời hạn bắt đầu/kết thúc." });
  }

  // Check if this exam is already assigned to this class and still active
  const alreadyAssigned = db.assignments.find(
    (a) => a.examId === examId && a.classId === classId && a.status === "Đang diễn ra"
  );
  if (alreadyAssigned) {
    return res.status(400).json({ error: "Đề thi này đang được giao cho lớp học này rồi." });
  }

  const newAssignment: Assignment = {
    id: `assign-${Date.now()}`,
    examId,
    classId,
    startTime,
    endTime,
    status: "Chưa bắt đầu",
    teacherId: teacherId || "teacher-default",
    createdAt: new Date().toISOString()
  };

  db.assignments.push(newAssignment);
  saveDb();
  updateAssignmentStatuses();

  const assignedExam = db.exams.find((e) => e.id === examId);
  console.log("[DEBUG_ASSIGNMENT_CREATED]", {
    id: newAssignment.id,
    examId: newAssignment.examId,
    classId: newAssignment.classId,
    teacherId: newAssignment.teacherId,
    title: assignedExam ? assignedExam.title : "",
    startTime: newAssignment.startTime,
    endTime: newAssignment.endTime,
    status: newAssignment.status
  });

  res.status(201).json(newAssignment);
});

app.delete("/api/assignments/:id", (req, res) => {
  const index = db.assignments.findIndex((a) => a.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Yêu cầu giao bài không tồn tại" });
  }

  // Remove submissions related to this assignment
  db.submissions = db.submissions.filter((s) => s.assignmentId !== req.params.id);
  db.assignments.splice(index, 1);
  saveDb();
  res.json({ success: true, message: "Hủy giao bài thành công" });
});


// ==========================================
// STUDENT VIEW & SUBMISSIONS MODULE
// ==========================================

// Get all active and completed assignments for a specific student
app.get("/api/student/:studentId/dashboard", (req, res) => {
  updateAssignmentStatuses();
  const studentId = req.params.studentId;

  // Find class of student by ID or studentCode
  let cls: Class | null = null;
  let targetStudent: Student | null = null;
  for (const c of db.classes) {
    const std = c.students.find((s) => s.id === studentId || (s.studentCode && s.studentCode.toUpperCase() === studentId.toUpperCase()));
    if (std) {
      cls = c;
      targetStudent = std;
      break;
    }
  }

  if (!cls) {
    return res.status(404).json({ error: "Không tìm thấy lớp của học sinh này." });
  }

  // Find all assignments for this class
  const classAssignments = db.assignments.filter((a) => a.classId === cls!.id);

  const active: any[] = [];
  const completed: any[] = [];

  classAssignments.forEach((asg) => {
    const exam = db.exams.find((e) => e.id === asg.examId);
    if (!exam) return;

    const submission = db.submissions.find(
      (s) => s.assignmentId === asg.id && (
        s.studentId === studentId || 
        (targetStudent?.id && s.studentId === targetStudent.id) ||
        (targetStudent?.studentCode && (s as any).studentCode === targetStudent.studentCode)
      )
    );
    const isSubmitted = submission && (submission.status === "submitted" || !submission.status);

    // Robust dynamic check: if current time is within range, force status to "Đang diễn ra"
    const now = new Date();
    const start = new Date(asg.startTime);
    const end = new Date(asg.endTime);
    const isTimeValid = now >= start && now <= end;
    let currentStatus = asg.status;

    if (isTimeValid && currentStatus !== "Đang diễn ra") {
      asg.status = "Đang diễn ra";
      currentStatus = "Đang diễn ra";
      saveDb();
    }

    const info = {
      assignmentId: asg.id,
      examId: exam.id,
      title: exam.title,
      grade: exam.grade,
      topic: exam.topic,
      duration: exam.duration,
      endTime: asg.endTime,
      startTime: asg.startTime,
      status: currentStatus,
      questionsCount: exam.questions.length,
      classId: asg.classId
    };

    if (submission && isSubmitted) {
      completed.push({
        ...info,
        submissionId: submission.id,
        score: submission.score,
        correctCount: submission.correctCount,
        wrongCount: submission.wrongCount,
        submittedAt: submission.submittedAt
      });
    } else {
      // Return in active list so student sees all outstanding assignments
      active.push({
        ...info,
        submissionStatus: submission?.status || "not_started"
      });
    }
  });

  console.log("[DEBUG_STUDENT_ASSIGNMENTS]", {
    studentId,
    studentClassId: cls.id,
    assignmentsFound: active.length + completed.length,
    assignments: classAssignments.map((asg) => {
      const exam = db.exams.find((e) => e.id === asg.examId);
      return {
        id: asg.id,
        examId: asg.examId,
        classId: asg.classId,
        title: exam ? exam.title : "",
        status: asg.status
      };
    })
  });

  res.json({
    classInfo: { id: cls.id, name: cls.name },
    activeAssignments: active,
    completedAssignments: completed
  });
});

// Start Exam Session: Create/Get in-progress session
app.post("/api/student/start-exam", (req, res) => {
  updateAssignmentStatuses();
  const { studentId, assignmentId, examId, classId } = req.body;

  if (!studentId || !assignmentId || !examId || !classId) {
    return res.status(400).json({ error: "Thông tin bắt đầu làm bài không đầy đủ." });
  }

  // Find assignment
  const asg = db.assignments.find((a) => a.id === assignmentId);
  if (!asg) {
    return res.status(404).json({ error: "Không tìm thấy bài kiểm tra được giao." });
  }

  // Check if exam exists
  const exam = db.exams.find((e) => e.id === examId);
  if (!exam) {
    return res.status(404).json({ error: "Đề kiểm tra không tồn tại." });
  }

  // Check if already completed or in_progress submission exists
  const existingSubmission = db.submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === studentId
  );

  if (existingSubmission) {
    const isSub = existingSubmission.status === "submitted" || !existingSubmission.status;
    if (isSub) {
      return res.status(400).json({ error: "Em đã hoàn thành bài kiểm tra này." });
    }
    console.log("[DEBUG_SUBMISSION_INITIALIZED]", {
      studentId: existingSubmission.studentId,
      assignmentId: existingSubmission.assignmentId,
      examId: existingSubmission.examId,
      classId: existingSubmission.classId,
      answers: existingSubmission.answers || {},
      status: existingSubmission.status,
      startedAt: existingSubmission.startedAt
    });
    // Return in_progress session
    return res.json({
      success: true,
      submissionId: existingSubmission.id,
      status: existingSubmission.status,
      answers: existingSubmission.answers || {}
    });
  }

  // Check expiration or active status
  const now = new Date();
  const start = new Date(asg.startTime);
  const end = new Date(asg.endTime);
  if (now < start) {
    return res.status(403).json({ error: "Bài kiểm tra chưa được mở." });
  }
  if (now > end) {
    return res.status(403).json({ error: "Bài kiểm tra đã hết hạn." });
  }

  // Create new "in_progress" submission
  const newSubmission: Submission = {
    id: `sub-${Date.now()}`,
    examId: examId,
    assignmentId: assignmentId,
    studentId: studentId,
    classId: classId,
    answers: {},
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    submittedAt: "",
    duration: 0,
    status: "in_progress",
    startedAt: new Date().toISOString()
  };

  db.submissions.push(newSubmission);
  saveDb();

  console.log("[DEBUG_SUBMISSION_INITIALIZED]", {
    studentId: newSubmission.studentId,
    assignmentId: newSubmission.assignmentId,
    examId: newSubmission.examId,
    classId: newSubmission.classId,
    answers: newSubmission.answers,
    status: newSubmission.status,
    startedAt: newSubmission.startedAt
  });

  res.status(201).json({
    success: true,
    submissionId: newSubmission.id,
    status: "in_progress",
    answers: {}
  });
});

// Save progress dynamically
app.post("/api/student/save-progress", (req, res) => {
  const { assignmentId, studentId, answers } = req.body;
  if (!assignmentId || !studentId || !answers) {
    return res.status(400).json({ error: "Thông tin lưu tiến trình không đầy đủ." });
  }

  const sub = db.submissions.find(
    (s) => s.assignmentId === assignmentId && s.studentId === studentId && s.status === "in_progress"
  );

  if (sub) {
    sub.answers = answers;
    saveDb();
    return res.json({ success: true });
  }

  res.status(404).json({ error: "Không tìm thấy phiên làm bài đang diễn ra để lưu tiến trình." });
});

// Get content of an exam to do (HIDING answers, explanations, keyPoints for student)
app.get("/api/student/exam/:assignmentId", (req, res) => {
  updateAssignmentStatuses();
  const assignmentId = req.params.assignmentId;
  const studentId = req.query.studentId as string;
  const asg = db.assignments.find((a) => a.id === assignmentId);

  if (!asg) {
    return res.status(404).json({ error: "Không tìm thấy lịch giao bài." });
  }

  // Robust dynamic check: if current time is within range, force status to "Đang diễn ra"
  const now = new Date();
  const start = new Date(asg.startTime);
  const end = new Date(asg.endTime);
  const isTimeValid = now >= start && now <= end;

  if (isTimeValid && asg.status !== "Đang diễn ra") {
    asg.status = "Đang diễn ra";
    saveDb();
  }

  if (asg.status !== "Đang diễn ra" && !isTimeValid) {
    return res.status(403).json({ error: "Bài kiểm tra này hiện tại không thể làm (chưa bắt đầu hoặc đã hết hạn)." });
  }

  const exam = db.exams.find((e) => e.id === asg.examId);
  if (!exam) {
    return res.status(404).json({ error: "Đề thi không tồn tại." });
  }

  // Meticulously strip correctAnswers, explanations, keyPoints
  const safeQuestions = exam.questions.map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    difficulty: q.difficulty
  }));

  // Find saved answers if any
  let savedAnswers = {};
  if (studentId) {
    const sub = db.submissions.find(
      (s) => s.assignmentId === assignmentId && s.studentId === studentId && s.status === "in_progress"
    );
    if (sub) {
      savedAnswers = sub.answers || {};
    }
  }

  res.json({
    assignmentId: asg.id,
    examId: exam.id,
    title: exam.title,
    duration: exam.duration,
    questions: safeQuestions,
    savedAnswers
  });
});

// Submit Exam Paper & Auto Grade
app.post("/api/student/submit", (req, res) => {
  updateAssignmentStatuses();
  const { assignmentId, studentId, answers, duration } = req.body;

  if (!assignmentId || !studentId || !answers) {
    return res.status(400).json({ error: "Thông tin nộp bài không đầy đủ." });
  }

  const asg = db.assignments.find((a) => a.id === assignmentId);
  if (!asg) {
    return res.status(404).json({ error: "Không tìm thấy thông tin giao bài." });
  }

  // Check if student already submitted (either submitted status or no status but completed)
  const existingSub = db.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId);
  if (existingSub && (existingSub.status === "submitted" || !existingSub.status && existingSub.score !== undefined)) {
    return res.status(400).json({ error: "Em đã nộp bài này trước đó rồi." });
  }

  const exam = db.exams.find((e) => e.id === asg.examId);
  if (!exam) {
    return res.status(404).json({ error: "Không tìm thấy đề thi." });
  }

  let correctCount = 0;
  let wrongCount = 0;

  exam.questions.forEach((q) => {
    const studentAnswer = answers[q.id];
    if (studentAnswer && studentAnswer.toUpperCase() === q.correctAnswer.toUpperCase()) {
      correctCount++;
    } else {
      wrongCount++;
    }
  });

  const totalQuestions = exam.questions.length;
  // Score calculated out of 10
  const score = totalQuestions > 0 ? Number(((correctCount / totalQuestions) * 10).toFixed(1)) : 0;

  if (existingSub) {
    // Update existing in_progress session in place
    existingSub.answers = answers;
    existingSub.score = score;
    existingSub.correctCount = correctCount;
    existingSub.wrongCount = wrongCount;
    existingSub.submittedAt = new Date().toISOString();
    existingSub.duration = Number(duration) || 0;
    existingSub.status = "submitted";
  } else {
    const newSubmission: Submission = {
      id: `sub-${Date.now()}`,
      examId: exam.id,
      assignmentId: assignmentId,
      studentId: studentId,
      classId: asg.classId,
      answers,
      score,
      correctCount,
      wrongCount,
      submittedAt: new Date().toISOString(),
      duration: Number(duration) || 0,
      status: "submitted",
      startedAt: new Date().toISOString()
    };
    db.submissions.push(newSubmission);
  }

  saveDb();

  // Find final updated submission
  const finalSub = db.submissions.find((s) => s.assignmentId === assignmentId && s.studentId === studentId)!;

  res.status(201).json({
    id: finalSub.id,
    score,
    correctCount,
    wrongCount,
    totalQuestions
  });
});

// View completed exam details (Student "Học từ lỗi sai" module)
app.get("/api/student/result/:submissionId", (req, res) => {
  const submissionId = req.params.submissionId;
  const sub = db.submissions.find((s) => s.id === submissionId);

  if (!sub) {
    return res.status(404).json({ error: "Không tìm thấy kết quả làm bài." });
  }

  const exam = db.exams.find((e) => e.id === sub.examId);
  if (!exam) {
    return res.status(404).json({ error: "Đề thi đã bị xóa." });
  }

  // Include student and full details
  const reviewQuestions = exam.questions.map((q) => {
    const studentAnswer = sub.answers[q.id] || "";
    const isCorrect = studentAnswer.toUpperCase() === q.correctAnswer.toUpperCase();
    return {
      id: q.id,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      studentAnswer,
      isCorrect,
      explanation: q.explanation,
      keyPoint: q.keyPoint,
      difficulty: q.difficulty
    };
  });

  // Include student name
  let studentName = "Học sinh";
  for (const cls of db.classes) {
    const std = cls.students.find((s) => s.id === sub.studentId);
    if (std) {
      studentName = std.name;
      break;
    }
  }

  res.json({
    submission: {
      id: sub.id,
      score: sub.score,
      correctCount: sub.correctCount,
      wrongCount: sub.wrongCount,
      submittedAt: sub.submittedAt,
      duration: sub.duration,
      studentName
    },
    exam: {
      title: exam.title,
      grade: exam.grade,
      topic: exam.topic
    },
    questions: reviewQuestions
  });
});

// ==========================================
// TEACHER REPORTING MODULE
// ==========================================

// Get class-wide report for a specific assigned test
app.get("/api/reports/assignment/:assignmentId", (req, res) => {
  const assignmentId = req.params.assignmentId;
  const asg = db.assignments.find((a) => a.id === assignmentId);

  if (!asg) {
    return res.status(404).json({ error: "Lịch giao bài không tồn tại" });
  }

  const exam = db.exams.find((e) => e.id === asg.examId);
  const cls = db.classes.find((c) => c.id === asg.classId);

  if (!exam || !cls) {
    return res.status(404).json({ error: "Bài kiểm tra này chưa được liên kết với nội dung đề." });
  }

  // Only count submitted submissions
  const submissions = db.submissions.filter((s) => s.assignmentId === assignmentId && s.status === "submitted");
  const completedStudentIds = new Set(submissions.map((s) => s.studentId));

  const results = cls.students.map((student) => {
    const sub = submissions.find((s) => s.studentId === student.id);
    return {
      studentId: student.id,
      studentName: student.name,
      studentCode: student.studentCode,
      status: sub ? "Đã nộp" : "Chưa làm",
      score: sub ? sub.score : null,
      correctCount: sub ? sub.correctCount : null,
      wrongCount: sub ? sub.wrongCount : null,
      submittedAt: sub ? sub.submittedAt : null,
      duration: sub ? sub.duration : null,
      submissionId: sub ? sub.id : null
    };
  });

  // Calculate statistics
  const completedSubmissions = submissions;
  const submissionCount = completedSubmissions.length;
  const pendingCount = cls.students.length - submissionCount;

  let averageScore = 0;
  let maxScore = 0;
  let minScore = 10;
  let completionRate = 0;
  let averageCorrectRate = 0;

  if (cls.students.length > 0) {
    completionRate = Number(((submissionCount / cls.students.length) * 100).toFixed(1));
  }

  if (submissionCount > 0) {
    const sum = completedSubmissions.reduce((acc, s) => acc + s.score, 0);
    averageScore = Number((sum / submissionCount).toFixed(1));
    maxScore = Math.max(...completedSubmissions.map((s) => s.score));
    minScore = Math.min(...completedSubmissions.map((s) => s.score));

    if (exam.questions.length > 0) {
      const totalCorrect = completedSubmissions.reduce((acc, s) => acc + s.correctCount, 0);
      const totalPossible = submissionCount * exam.questions.length;
      averageCorrectRate = Number(((totalCorrect / totalPossible) * 100).toFixed(1));
    }
  } else {
    minScore = 0;
  }

  // Question-by-question analysis
  const questionAnalysis = exam.questions.map((q, qIdx) => {
    let correctCount = 0;
    let wrongCount = 0;
    completedSubmissions.forEach((sub) => {
      const studentAns = sub.answers[q.id] || "";
      if (studentAns.toUpperCase() === q.correctAnswer.toUpperCase()) {
        correctCount++;
      } else {
        wrongCount++;
      }
    });
    const totalAnswers = correctCount + wrongCount;
    const correctRate = totalAnswers > 0 ? Number(((correctCount / totalAnswers) * 100).toFixed(0)) : 0;
    return {
      id: q.id,
      index: qIdx + 1,
      questionText: q.question,
      correctCount,
      wrongCount,
      correctRate,
      correctAnswer: q.correctAnswer
    };
  });

  res.json({
    assignment: {
      id: asg.id,
      startTime: asg.startTime,
      endTime: asg.endTime,
      status: asg.status
    },
    exam: {
      id: exam.id,
      title: exam.title,
      questionCount: exam.questions.length,
      questions: exam.questions
    },
    classInfo: {
      id: cls.id,
      name: cls.name,
      totalStudents: cls.students.length
    },
    stats: {
      averageScore,
      submissionCount,
      pendingCount,
      maxScore,
      minScore,
      completionRate,
      averageCorrectRate
    },
    studentResults: results,
    questionAnalysis
  });
});

// General check API
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV });
});


// ==========================================
// VITE OR STATIC ASSETS ROUTING
// ==========================================
if (process.env.NODE_ENV !== "production") {
  const startVite = async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  };
  startVite();
} else {
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// Export app for Vercel Serverless Functions
export default app;

// Start Server listening (for Cloud Run / container / dev environments)
if (!process.env.VERCEL) {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
