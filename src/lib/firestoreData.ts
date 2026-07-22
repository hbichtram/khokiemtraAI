import { doc, getDoc, setDoc } from "firebase/firestore";
import { db as firestoreDb, auth } from "../firebase";
import { Class, Exam, Student, Assignment, Submission, Question } from "../types";

export interface AppDataSchema {
  classes: Class[];
  exams: Exam[];
  assignments: Assignment[];
  submissions: Submission[];
  updatedAt?: string;
}

const DEFAULT_SEED_DATA: AppDataSchema = {
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
      classId: "class-3",
      startTime: new Date(Date.now() - 3600000).toISOString(),
      endTime: new Date(Date.now() + 86400000).toISOString(),
      status: "Đang diễn ra"
    }
  ],
  submissions: []
};

// Generate unique 6-character class code
export function generateClassCode(existingClasses: Class[]): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  do {
    code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (existingClasses.some((c) => c.classCode === code));
  return code;
}

// Update status of assignments based on time
export function updateAssignmentStatusesLocally(assignments: Assignment[]): boolean {
  const now = new Date();
  let changed = false;
  assignments.forEach((asg) => {
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
  return changed;
}

/**
 * Get all application data from Firestore main doc
 */
export async function getAppData(): Promise<AppDataSchema> {
  try {
    const docRef = doc(firestoreDb, "appData", "main");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as AppDataSchema;
      const classes = data.classes || [];
      const exams = data.exams || [];
      const assignments = data.assignments || [];
      const submissions = data.submissions || [];

      const changed = updateAssignmentStatusesLocally(assignments);
      if (changed) {
        await saveAppData({ classes, exams, assignments, submissions });
      }

      return { classes, exams, assignments, submissions };
    } else {
      // Seed initial data
      await setDoc(docRef, {
        ...DEFAULT_SEED_DATA,
        updatedAt: new Date().toISOString()
      });
      return DEFAULT_SEED_DATA;
    }
  } catch (err) {
    console.warn("Error loading data from Firestore, returning local seed:", err);
    return DEFAULT_SEED_DATA;
  }
}

/**
 * Save full application data to Firestore
 */
export async function saveAppData(data: AppDataSchema): Promise<void> {
  try {
    const docRef = doc(firestoreDb, "appData", "main");
    // Sanitize payload to strip undefined values which Firestore setDoc rejects
    const sanitized = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, {
      ...sanitized,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (err: any) {
    console.error("Error saving app data to Firestore:", err);
    throw new Error(err?.message || "Không thể lưu dữ liệu vào Firestore");
  }
}

// ==========================================
// CLASSES CRUD
// ==========================================
export async function fsGetClasses(): Promise<Class[]> {
  const data = await getAppData();
  return data.classes;
}

export async function fsCreateClass(name: string, teacherId?: string): Promise<Class> {
  console.log("CREATE_CLASS_START", {
    name,
    teacherId
  });

  try {
    const currentAuthUser = auth.currentUser;
    const tid = teacherId || currentAuthUser?.uid || "teacher-default";

    const data = await getAppData();
    console.log("APP_DATA_BEFORE_CREATE", data);

    if (!Array.isArray(data.classes)) {
      data.classes = [];
    }

    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error("Tên lớp học không được để trống.");
    }

    const newClass: Class = {
      id: `class-${Date.now()}`,
      teacherId: tid,
      name: trimmedName,
      classCode: generateClassCode(data.classes),
      students: []
    };

    console.log("NEW_CLASS_CREATED", newClass);

    // Save strictly to appData/main for central application state
    data.classes.push(newClass);
    console.log("APP_DATA_BEFORE_SAVE", data);

    await saveAppData(data);
    console.log("CREATE_CLASS_SAVE_SUCCESS");

    console.log("CLASS_CREATED_SUCCESSFULLY", newClass.id);
    return newClass;
  } catch (error: any) {
    console.error("CREATE_CLASS_ERROR", error);
    throw error;
  }
}

export async function fsDeleteClass(classId: string): Promise<void> {
  console.log("DELETE_CLASS_START", { classId });
  try {
    const data = await getAppData();
    if (!Array.isArray(data.classes)) {
      data.classes = [];
    }

    console.log("CLASSES_BEFORE_DELETE", data.classes);

    const existingClass = data.classes.find((c) => c.id === classId);
    if (!existingClass) {
      throw new Error("Không tìm thấy lớp học cần xóa.");
    }

    const updatedClasses = data.classes.filter((c) => c.id !== classId);
    console.log("CLASSES_AFTER_DELETE", updatedClasses);

    data.classes = updatedClasses;
    if (Array.isArray(data.assignments)) {
      data.assignments = data.assignments.filter((asg) => asg.classId !== classId);
    }

    await saveAppData(data);
    console.log("DELETE_CLASS_SUCCESS", { classId });
  } catch (error: any) {
    console.error("DELETE_CLASS_ERROR", {
      code: error?.code,
      message: error?.message,
      error
    });
    throw error;
  }
}

export async function fsAddStudent(classId: string, name: string, studentCode?: string): Promise<Student> {
  const data = await getAppData();
  const cls = data.classes.find((c) => c.id === classId);
  if (!cls) throw new Error("Lớp học không tồn tại");

  const cleanCode = studentCode && studentCode.trim() !== "" 
    ? studentCode.trim().toUpperCase() 
    : `HS${cls.classCode}${(cls.students.length + 1).toString().padStart(2, "0")}`;

  const codeExists = data.classes.some((c) => c.students.some((s) => s.studentCode === cleanCode));
  if (codeExists) {
    throw new Error(`Mã học sinh '${cleanCode}' đã tồn tại trong hệ thống.`);
  }

  const newStudent: Student = {
    id: `student-${Date.now()}`,
    name: name.trim(),
    studentCode: cleanCode,
    classId
  };

  cls.students.push(newStudent);
  await saveAppData(data);
  return newStudent;
}

export async function fsAddStudentsBulk(classId: string, students: { name: string; studentCode: string }[]): Promise<{ addedCount: number }> {
  const data = await getAppData();
  const cls = data.classes.find((c) => c.id === classId);
  if (!cls) throw new Error("Lớp học không tồn tại");

  let addedCount = 0;
  for (const s of students) {
    const name = String(s.name || "").trim();
    const studentCode = String(s.studentCode || "").trim().toUpperCase();

    const codeExists = data.classes.some((c) => c.students.some((std) => std.studentCode === studentCode));
    if (codeExists) continue;

    const newStudent: Student = {
      id: `student-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name,
      studentCode,
      classId
    };

    cls.students.push(newStudent);
    addedCount++;
  }

  if (addedCount > 0) {
    await saveAppData(data);
  }

  return { addedCount };
}

export async function fsUpdateStudent(classId: string, studentId: string, name: string, studentCode?: string): Promise<Student> {
  const data = await getAppData();
  const cls = data.classes.find((c) => c.id === classId);
  if (!cls) throw new Error("Lớp học không tồn tại");

  const student = cls.students.find((s) => s.id === studentId);
  if (!student) throw new Error("Không tìm thấy học sinh");

  if (studentCode && studentCode.trim().toUpperCase() !== student.studentCode) {
    const cleanCode = studentCode.trim().toUpperCase();
    const codeExists = data.classes.some((c) => c.students.some((s) => s.id !== studentId && s.studentCode === cleanCode));
    if (codeExists) {
      throw new Error(`Mã học sinh '${cleanCode}' đã được sử dụng.`);
    }
    student.studentCode = cleanCode;
  }

  student.name = name.trim();
  await saveAppData(data);
  return student;
}

export async function fsDeleteStudent(classId: string, studentId: string): Promise<void> {
  const data = await getAppData();
  const cls = data.classes.find((c) => c.id === classId);
  if (cls) {
    cls.students = cls.students.filter((s) => s.id !== studentId);
  }
  data.submissions = data.submissions.filter((sub) => sub.studentId !== studentId);
  await saveAppData(data);
}

// ==========================================
// EXAMS CRUD
// ==========================================
export async function fsGetExams(): Promise<Exam[]> {
  const data = await getAppData();
  return data.exams;
}

export async function fsCreateExam(examData: Partial<Exam>): Promise<Exam> {
  const data = await getAppData();
  const newExam: Exam = {
    id: `exam-${Date.now()}`,
    teacherId: "teacher-default",
    title: examData.title || "Đề thi mới",
    grade: examData.grade || "Lớp 3",
    topic: examData.topic || "Tin học",
    duration: Number(examData.duration) || 15,
    questions: (examData.questions || []).map((q, idx) => ({
      ...q,
      id: q.id || `q-${Date.now()}-${idx}`
    })),
    createdAt: new Date().toISOString()
  };

  data.exams.push(newExam);
  await saveAppData(data);
  return newExam;
}

export async function fsCopyExam(examId: string): Promise<Exam> {
  const data = await getAppData();
  const original = data.exams.find((e) => e.id === examId);
  if (!original) throw new Error("Không tìm thấy đề thi gốc");

  const copy: Exam = {
    ...original,
    id: `exam-${Date.now()}`,
    title: `${original.title} (Bản sao)`,
    createdAt: new Date().toISOString()
  };

  data.exams.push(copy);
  await saveAppData(data);
  return copy;
}

export async function fsDeleteExam(examId: string): Promise<void> {
  const data = await getAppData();
  data.exams = data.exams.filter((e) => e.id !== examId);
  data.assignments = data.assignments.filter((a) => a.examId !== examId);
  data.submissions = data.submissions.filter((s) => s.examId !== examId);
  await saveAppData(data);
}

// ==========================================
// ASSIGNMENTS CRUD
// ==========================================
export async function fsGetAssignmentsDetailed(teacherId?: string): Promise<any[]> {
  const data = await getAppData();
  let list = data.assignments;
  if (teacherId) {
    list = list.filter((asg) => !asg.teacherId || asg.teacherId === teacherId);
  }

  return list.map((asg) => {
    const exam = data.exams.find((e) => e.id === asg.examId);
    const cls = data.classes.find((c) => c.id === asg.classId);
    return {
      ...asg,
      examTitle: exam ? exam.title : "Đề thi không tồn tại",
      examDuration: exam ? exam.duration : 15,
      className: cls ? cls.name : "Lớp không tồn tại",
      totalStudents: cls ? cls.students.length : 0,
      submissionCount: data.submissions.filter((s) => s.assignmentId === asg.id && (s.status === "submitted" || !s.status)).length
    };
  });
}

export async function fsCreateAssignment(examId: string, classId: string, startTime: string, endTime: string, teacherId?: string): Promise<Assignment> {
  const data = await getAppData();
  const newAssignment: Assignment = {
    id: `assign-${Date.now()}`,
    examId,
    classId,
    startTime,
    endTime,
    status: "Đang diễn ra",
    teacherId: teacherId || "teacher-default",
    createdAt: new Date().toISOString()
  };

  data.assignments.push(newAssignment);
  await saveAppData(data);
  return newAssignment;
}

export async function fsDeleteAssignment(id: string): Promise<void> {
  const data = await getAppData();
  data.assignments = data.assignments.filter((a) => a.id !== id);
  data.submissions = data.submissions.filter((s) => s.assignmentId !== id);
  await saveAppData(data);
}

// ==========================================
// TEACHER OVERVIEW STATS
// ==========================================
export async function fsGetTeacherOverview(): Promise<any> {
  const data = await getAppData();
  const totalClasses = data.classes.length;
  const totalStudents = data.classes.reduce((sum, cls) => sum + cls.students.length, 0);
  const totalExams = data.exams.length;
  const activeAssignments = data.assignments.filter((asg) => asg.status === "Đang diễn ra").length;

  const recentExams = [...data.exams]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const activeAssignmentsDetails = data.assignments
    .filter((asg) => asg.status === "Đang diễn ra")
    .map((asg) => {
      const exam = data.exams.find((e) => e.id === asg.examId);
      const cls = data.classes.find((c) => c.id === asg.classId);
      return {
        id: asg.id,
        examTitle: exam ? exam.title : "Đề thi",
        className: cls ? cls.name : "Lớp học",
        endTime: asg.endTime,
        submissionCount: data.submissions.filter((s) => s.assignmentId === asg.id).length,
        totalStudents: cls ? cls.students.length : 0
      };
    });

  const recentSubmissions = [...data.submissions]
    .sort((a, b) => new Date(b.submittedAt || Date.now()).getTime() - new Date(a.submittedAt || Date.now()).getTime())
    .slice(0, 5)
    .map((sub) => {
      const exam = data.exams.find((e) => e.id === sub.examId);
      let studentName = "Học sinh";
      let className = "Lớp học";

      for (const cls of data.classes) {
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
        submittedAt: sub.submittedAt || new Date().toISOString()
      };
    });

  return {
    stats: {
      totalClasses,
      totalStudents,
      totalExams,
      activeAssignments
    },
    recentExams,
    activeAssignments: activeAssignmentsDetails,
    recentSubmissions
  };
}

// ==========================================
// REPORTS & GRADING
// ==========================================
export async function fsGetAssignmentReport(assignmentId: string): Promise<any> {
  const data = await getAppData();
  const assignment = data.assignments.find((a) => a.id === assignmentId);
  if (!assignment) throw new Error("Không tìm thấy bài giao.");

  const exam = data.exams.find((e) => e.id === assignment.examId);
  const cls = data.classes.find((c) => c.id === assignment.classId);
  if (!exam || !cls) throw new Error("Đề thi hoặc lớp học không tồn tại.");

  const classStudents = cls.students || [];
  const assignmentSubmissions = data.submissions.filter((s) => s.assignmentId === assignmentId);

  const studentReports = classStudents.map((student) => {
    const sub = assignmentSubmissions.find((s) => s.studentId === student.id || (student.studentCode && (s as any).studentCode === student.studentCode));
    const isSubmitted = sub && (sub.status === "submitted" || !sub.status);

    return {
      studentId: student.id,
      studentName: student.name,
      studentCode: student.studentCode,
      status: isSubmitted ? "Đã nộp" : "Chưa nộp",
      submissionId: isSubmitted ? sub.id : null,
      score: isSubmitted ? sub.score : null,
      submittedAt: isSubmitted ? sub.submittedAt : null,
      correctCount: isSubmitted ? sub.correctCount : null,
      wrongCount: isSubmitted ? sub.wrongCount : null
    };
  });

  const submittedCount = studentReports.filter((s) => s.status === "Đã nộp").length;
  const submittedScores = studentReports.filter((s) => s.score !== null).map((s) => s.score as number);

  let averageScore = 0;
  let highestScore = 0;
  let lowestScore = 0;

  if (submittedScores.length > 0) {
    averageScore = Number((submittedScores.reduce((a, b) => a + b, 0) / submittedScores.length).toFixed(1));
    highestScore = Math.max(...submittedScores);
    lowestScore = Math.min(...submittedScores);
  }

  return {
    assignmentInfo: {
      id: assignment.id,
      examTitle: exam.title,
      className: cls.name,
      totalStudents: classStudents.length,
      submittedCount,
      startTime: assignment.startTime,
      endTime: assignment.endTime,
      status: assignment.status
    },
    stats: {
      averageScore,
      highestScore,
      lowestScore,
      submittedCount,
      unsubmittedCount: classStudents.length - submittedCount
    },
    students: studentReports
  };
}
