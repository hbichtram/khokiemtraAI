export interface LeaderboardItem {
  studentId: string;
  studentCode?: string;
  name: string;
  avgScore: number;
  completedCount: number;
  rank: number;
  isCurrentStudent: boolean;
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
      const avgScore = Number((totalScore / completedCount).toFixed(1));

      leaderboardList.push({
        studentId: stdData.studentId,
        studentCode: stdData.studentCode,
        name: stdData.name,
        avgScore,
        completedCount,
        rank: 0,
        isCurrentStudent: stdData.isCurrentStudent
      });
    }
  }

  // Priority sorting:
  // 1. avgScore desc
  // 2. completedCount desc
  // 3. name asc (Vietnamese locale)
  leaderboardList.sort((a, b) => {
    if (b.avgScore !== a.avgScore) {
      return b.avgScore - a.avgScore;
    }
    if (b.completedCount !== a.completedCount) {
      return b.completedCount - a.completedCount;
    }
    return a.name.localeCompare(b.name, "vi");
  });

  // Assign ranks with tie handling
  for (let i = 0; i < leaderboardList.length; i++) {
    if (i === 0) {
      leaderboardList[i].rank = 1;
    } else {
      const prev = leaderboardList[i - 1];
      const curr = leaderboardList[i];
      if (curr.avgScore === prev.avgScore && curr.completedCount === prev.completedCount) {
        curr.rank = prev.rank;
      } else {
        curr.rank = i + 1;
      }
    }
  }

  // Top 10 max
  return leaderboardList.slice(0, 10);
}
