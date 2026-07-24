export interface ProcessedAssignment {
  assignmentId: string;
  examId: string;
  title: string;
  grade: string;
  topic: string;
  duration: number;
  startTime: string;
  endTime: string;
  questionsCount: number;
  classId: string;
  computedStatus: "ongoing" | "upcoming" | "completed" | "expired";
  submissionStatus: "not_started" | "in_progress" | "submitted";
  submissionId?: string;
  score?: number | null;
  correctCount?: number;
  wrongCount?: number;
  submittedAt?: string;
}

export function formatRemainingTime(
  startTimeStr: string,
  endTimeStr: string,
  computedStatus: string
): { text: string; isUrgent: boolean } {
  const now = Date.now();
  const start = new Date(startTimeStr).getTime();
  const end = new Date(endTimeStr).getTime();

  if (computedStatus === "completed") {
    return { text: "Đã hoàn thành", isUrgent: false };
  }

  if (computedStatus === "upcoming") {
    if (isNaN(start)) return { text: "Sắp diễn ra", isUrgent: false };
    const diff = start - now;
    if (diff <= 0) return { text: "Sắp bắt đầu", isUrgent: false };
    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const days = Math.floor(hours / 24);
    const remainingMins = totalMinutes % 60;

    if (days >= 1) {
      return { text: `⏳ Bắt đầu sau ${days} ngày`, isUrgent: false };
    }
    if (hours >= 1) {
      return { text: `⏳ Bắt đầu sau ${hours} giờ ${remainingMins} phút`, isUrgent: false };
    }
    return { text: `⏳ Bắt đầu sau ${remainingMins} phút`, isUrgent: false };
  }

  if (computedStatus === "expired" || (!isNaN(end) && now > end)) {
    return { text: "Đã hết hạn", isUrgent: true };
  }

  // Ongoing
  if (isNaN(end)) return { text: "Đang diễn ra", isUrgent: false };
  const diff = end - now;
  if (diff <= 0) {
    return { text: "Đã hết hạn", isUrgent: true };
  }

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  const remainingMins = totalMinutes % 60;

  if (days >= 1) {
    return { text: `⏳ Còn ${days} ngày`, isUrgent: days < 2 };
  } else if (hours >= 1) {
    if (remainingMins > 0) {
      return { text: `⏳ Còn ${hours} giờ ${remainingMins} phút`, isUrgent: hours < 3 };
    }
    return { text: `⏳ Còn ${hours} giờ`, isUrgent: hours < 3 };
  } else {
    return { text: `⏳ Còn ${remainingMins} phút`, isUrgent: true };
  }
}

export function sortAndProcessAssignments(
  assignments: any[],
  exams: any[],
  submissions: any[],
  userId: string,
  userCode?: string
): ProcessedAssignment[] {
  const now = Date.now();

  const processed: ProcessedAssignment[] = (assignments || []).map((asg: any) => {
    const targetAssignmentId = asg.assignmentId || asg.id || "";
    const targetExamId = asg.examId || "";

    const exam = (exams || []).find((e: any) => e.id === targetExamId);
    const sub = (submissions || []).find(
      (s: any) =>
        (s.assignmentId === targetAssignmentId || (asg.id && s.assignmentId === asg.id)) &&
        ((s.studentId && s.studentId === userId) ||
          (userCode && s.studentCode && s.studentCode.toUpperCase() === userCode.toUpperCase()) ||
          (userCode && s.studentId && s.studentId.toUpperCase() === userCode.toUpperCase()))
    );

    const isSubmitted =
      (sub && (sub.status === "submitted" || !sub.status)) ||
      Boolean(asg.submissionId) ||
      asg.submissionStatus === "submitted" ||
      asg.computedStatus === "completed" ||
      asg.status === "Đã hoàn thành";

    const start = new Date(asg.startTime).getTime();
    const end = new Date(asg.endTime).getTime();

    let computedStatus: "ongoing" | "upcoming" | "completed" | "expired" = "upcoming";

    if (isSubmitted) {
      computedStatus = "completed";
    } else if (!isNaN(start) && now < start) {
      computedStatus = "upcoming";
    } else if (!isNaN(end) && now > end) {
      computedStatus = "expired";
    } else {
      computedStatus = "ongoing";
    }

    return {
      ...asg,
      id: targetAssignmentId,
      assignmentId: targetAssignmentId,
      examId: targetExamId,
      title: exam?.title || asg.title || asg.examTitle || "Bài kiểm tra",
      grade: exam?.grade || asg.grade || "Tin học 5",
      topic: exam?.topic || asg.topic || "Tin học",
      duration: exam?.duration || asg.duration || asg.examDuration || 15,
      startTime: asg.startTime,
      endTime: asg.endTime,
      questionsCount: exam?.questions?.length || asg.questionsCount || 10,
      classId: asg.classId,
      computedStatus,
      submissionStatus: sub?.status || asg.submissionStatus || (isSubmitted ? "submitted" : "not_started"),
      submissionId: sub?.id || asg.submissionId,
      score: typeof sub?.score === "number" ? sub.score : (typeof asg.score === "number" ? asg.score : null),
      correctCount: sub?.correctCount ?? asg.correctCount ?? 0,
      wrongCount: sub?.wrongCount ?? asg.wrongCount ?? 0,
      submittedAt: sub?.submittedAt || asg.submittedAt
    };
  });

  const getPriorityRank = (status: string) => {
    switch (status) {
      case "ongoing": return 1;
      case "upcoming": return 2;
      case "completed": return 3;
      case "expired": return 4;
      default: return 5;
    }
  };

  const sorted = [...processed];
  sorted.sort((a, b) => {
    const rankA = getPriorityRank(a.computedStatus);
    const rankB = getPriorityRank(b.computedStatus);

    if (rankA !== rankB) {
      return rankA - rankB;
    }

    // Secondary sorting:
    if (a.computedStatus === "ongoing") {
      // Ending soonest first
      return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
    }
    if (a.computedStatus === "upcoming") {
      // Starting soonest first
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    }
    if (a.computedStatus === "completed") {
      // Most recently submitted first
      return new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime();
    }
    if (a.computedStatus === "expired") {
      // Most recently expired first
      return new Date(b.endTime).getTime() - new Date(a.endTime).getTime();
    }

    return 0;
  });

  return sorted;
}
