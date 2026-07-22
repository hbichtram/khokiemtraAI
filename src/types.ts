export interface Student {
  id: string;
  name: string;
  studentCode: string;
  classId: string;
  teacherId?: string;
  createdAt?: string;
}

export interface Class {
  id: string;
  teacherId: string;
  name: string;
  classCode: string;
  students: Student[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  keyPoint: string;
  difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
}

export interface Exam {
  id: string;
  teacherId: string;
  title: string;
  grade: string;
  topic: string;
  duration: number; // minutes
  questions: Question[];
  createdAt: string;
}

export interface Assignment {
  id: string;
  examId: string;
  classId: string;
  startTime: string;
  endTime: string;
  status: "Chưa bắt đầu" | "Đang diễn ra" | "Đã hoàn thành" | "Đã hết hạn";
  teacherId?: string;
  createdAt?: string;
  examTitle?: string;
  examDuration?: number;
  className?: string;
  totalStudents?: number;
  submissionCount?: number;
}

export interface Submission {
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

export interface TeacherStats {
  totalClasses: number;
  totalStudents: number;
  totalExams: number;
  activeAssignments: number;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  studentCode?: string;
  role: "teacher" | "student";
  classId?: string;
  className?: string;
}
