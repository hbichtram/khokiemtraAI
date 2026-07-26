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

export interface QuestionOption {
  text: string;
  imageUrl?: string;
}

export interface Question {
  id: string;
  question: string;
  imageUrl?: string;
  options: (string | QuestionOption)[];
  optionImages?: string[];
  correctAnswer: string;
  explanation: string;
  keyPoint?: string;
  difficulty: "Nhận biết" | "Thông hiểu" | "Vận dụng";
}

export function getOptionText(opt: string | QuestionOption): string {
  if (typeof opt === "string") return opt;
  if (opt && typeof opt === "object") return opt.text || "";
  return String(opt || "");
}

export function getOptionImage(opt: string | QuestionOption, q?: Question, index?: number): string | undefined {
  if (opt && typeof opt === "object" && opt.imageUrl) return opt.imageUrl;
  if (q && q.optionImages && typeof index === "number" && q.optionImages[index]) {
    return q.optionImages[index];
  }
  return undefined;
}

export const ELEMENTARY_GRADES = [
  "Tin học 3",
  "Tin học 4",
  "Tin học 5"
] as const;

export type ElementaryGrade = typeof ELEMENTARY_GRADES[number];

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

export interface Game {
  id: string;
  title: string;
  description: string;
  grade: string;
  topic: string;
  imageUrl?: string;
  gameUrl: string;
  status: "active" | "hidden";
  teacherId?: string;
  createdAt: string;
}

export interface GameRecord {
  id: string;
  gameId: string;
  gameName: string;
  score: number;
  rewardPoints: number;
  completedAt: string;
  studentId: string;
  studentCode?: string;
  studentName?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  photoURL?: string;
  studentCode?: string;
  role: "teacher" | "student";
  classId?: string;
  className?: string;
  totalGamePoints?: number;
  gameHistory?: GameRecord[];
}
