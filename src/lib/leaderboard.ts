export interface LeaderboardItem {
  studentId: string;
  studentCode?: string;
  name: string;
  score: number;
  avgScore: number;
  totalDuration: number;
  completedCount: number;
  rank: number;
  isCurrentStudent: boolean;
}

export function formatLeaderboardDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return "0s";
  const totalSecs = Math.round(seconds);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}p`;
  return `${m}p ${s}s`;
}

export function computeClassLeaderboard(
  cls: any,
  assignments: any[],
  submissions: any[],
  currentUserId: string,
  currentUserCode?: string
): LeaderboardItem[] {
  if (!cls || !cls.students || !Array.isArray(cls.students)) return [];

  // Get assignments belonging to this class
  const classAssignments = (assignments || []).filter((a: any) => a.classId === cls.id);
  const classAssignmentIds = new Set(classAssignments.map((a: any) => a.id));

  // Filter valid submitted test results
  const validSubmissions = (submissions || []).filter((s: any) => {
    if (!classAssignmentIds.has(s.assignmentId)) return false;
    const isSubmitted = s.status === "submitted" || !s.status;
    return isSubmitted && typeof s.score === "number" && !isNaN(s.score);
  });

  // Map student in class to stats
  const studentMap = new Map<string, {
    studentId: string;
    studentCode?: string;
    name: string;
    submissionsByAssignment: Map<string, any>;
    isCurrentStudent: boolean;
  }>();

  cls.students.forEach((std: any) => {
    const stdKey = std.id || std.studentCode;
    if (!stdKey) return;

    const stdId = std.id || "";
    const stdCode = std.studentCode || "";

    const isCurrent =
      (stdId && currentUserId && stdId === currentUserId) ||
      (stdCode && currentUserCode && stdCode.toUpperCase() === currentUserCode.toUpperCase()) ||
      (stdId && currentUserCode && stdId.toUpperCase() === currentUserCode.toUpperCase()) ||
      (stdCode && currentUserId && stdCode.toUpperCase() === currentUserId.toUpperCase());

    studentMap.set(stdKey, {
      studentId: stdId,
      studentCode: stdCode,
      name: std.name || `Học sinh ${stdCode || stdId}`,
      submissionsByAssignment: new Map<string, any>(),
      isCurrentStudent: !!isCurrent
    });
  });

  // Populate valid submissions for each student, deduplicated per assignment
  validSubmissions.forEach((sub: any) => {
    let matchedKey: string | null = null;

    for (const [key, stdData] of studentMap.entries()) {
      const matchId = sub.studentId && (sub.studentId === stdData.studentId || sub.studentId === stdData.studentCode);
      const matchCode = sub.studentCode && stdData.studentCode && sub.studentCode.toUpperCase() === stdData.studentCode.toUpperCase();

      if (matchId || matchCode) {
        matchedKey = key;
        break;
      }
    }

    if (matchedKey) {
      const stdData = studentMap.get(matchedKey)!;
      const existingSub = stdData.submissionsByAssignment.get(sub.assignmentId);

      if (!existingSub) {
        stdData.submissionsByAssignment.set(sub.assignmentId, sub);
      } else {
        const newTime = new Date(sub.submittedAt || 0).getTime();
        const oldTime = new Date(existingSub.submittedAt || 0).getTime();
        if (newTime >= oldTime) {
          stdData.submissionsByAssignment.set(sub.assignmentId, sub);
        }
      }
    }
  });

  // Build ranking items
  const leaderboardList: LeaderboardItem[] = [];

  for (const [, stdData] of studentMap.entries()) {
    const subs = Array.from(stdData.submissionsByAssignment.values());
    if (subs.length > 0) {
      const completedCount = subs.length;
      const totalScore = subs.reduce((acc, s) => acc + (typeof s.score === "number" ? s.score : 0), 0);
      const totalDuration = subs.reduce((acc, s) => acc + (Number(s.duration) || 0), 0);
      const score = Number(totalScore.toFixed(1));
      const avgScore = Number((totalScore / completedCount).toFixed(1));

      leaderboardList.push({
        studentId: stdData.studentId,
        studentCode: stdData.studentCode,
        name: stdData.name,
        score,
        avgScore,
        totalDuration,
        completedCount,
        rank: 0,
        isCurrentStudent: stdData.isCurrentStudent
      });
    }
  }

  // Priority sorting:
  // 1. score desc (Điểm cao xếp trên)
  // 2. completedCount desc (Làm nhiều bài xếp trên)
  // 3. totalDuration asc (Thời gian ngắn hơn xếp trên)
  leaderboardList.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score; // Ưu tiên 1: Điểm cao xếp trên
    if (b.completedCount !== a.completedCount) return b.completedCount - a.completedCount; // Ưu tiên 2: Làm nhiều bài xếp trên
    return a.totalDuration - b.totalDuration; // Ưu tiên 3: Thời gian ngắn hơn xếp trên
  });

  // Assign ranks with tie handling
  for (let i = 0; i < leaderboardList.length; i++) {
    if (i === 0) {
      leaderboardList[i].rank = 1;
    } else {
      const prev = leaderboardList[i - 1];
      const curr = leaderboardList[i];
      if (
        curr.score === prev.score &&
        curr.completedCount === prev.completedCount &&
        curr.totalDuration === prev.totalDuration
      ) {
        curr.rank = prev.rank;
      } else {
        curr.rank = i + 1;
      }
    }
  }

  // Top 10 max
  return leaderboardList.slice(0, 10);
}
