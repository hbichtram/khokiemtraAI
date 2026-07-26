import React, { useState, useEffect } from "react";
import { Game, User, GameRecord } from "../types";
import { 
  Gamepad2, Play, Sparkles, Search, RefreshCw, X, ExternalLink, 
  Trophy, Star, Award, Heart, CheckCircle2, History
} from "lucide-react";
import { fsGetGames, fsGetStudentGameHistory } from "../lib/firestoreData";
import GameModalPlayer from "./GameModalPlayer";

interface StudentGamesScreenProps {
  user: User;
}

export default function StudentGamesScreen({ user }: StudentGamesScreenProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [playingGame, setPlayingGame] = useState<Game | null>(null);

  // Game reward points state
  const [totalGamePoints, setTotalGamePoints] = useState<number>(0);
  const [gameHistoryList, setGameHistoryList] = useState<GameRecord[]>([]);

  useEffect(() => {
    fetchGames();
    fetchGamePoints();
  }, []);

  const fetchGamePoints = async () => {
    if (!user || user.role !== "student") return;
    const studentId = user.id || user.studentCode || "student-default";
    const studentCode = user.studentCode || "";

    console.log("[GAME] Fetching student game points for", { studentId, studentCode });

    try {
      // Direct Firestore fetch
      const fsData = await fsGetStudentGameHistory(studentId, studentCode);
      setTotalGamePoints(fsData.totalGamePoints);
      setGameHistoryList(fsData.gameHistory);
      console.log("[GAME] Total points loaded from Firestore:", fsData.totalGamePoints, "History count:", fsData.gameHistory.length);
      return;
    } catch (fsErr) {
      console.error("Firestore get student game history error, fallback to API:", fsErr);
    }

    try {
      const res = await fetch(`/api/student/${studentId}/game-history?studentCode=${encodeURIComponent(studentCode)}`);
      if (res.ok) {
        const data = await res.json();
        setTotalGamePoints(data.totalGamePoints || 0);
        setGameHistoryList(data.gameHistory || []);
        console.log("[GAME] Total points loaded from API fallback:", data.totalGamePoints);
      }
    } catch (e) {
      console.warn("API game history fetch error:", e);
    }
  };

  const fetchGames = async () => {
    setLoading(true);
    try {
      let loaded = false;
      try {
        const res = await fetch("/api/games");
        if (res.ok) {
          const data = await res.json();
          // Filter published/active games only for students
          setGames(data.filter((g: Game) => g.status === "active"));
          loaded = true;
        }
      } catch (e) {
        console.warn("API games fetch error, falling back to Firestore:", e);
      }

      if (!loaded) {
        const fsGames = await fsGetGames();
        setGames(fsGames.filter((g) => g.status === "active"));
      }
    } catch (err) {
      console.error("Error fetching games for student:", err);
    } finally {
      setLoading(false);
    }
  };

  const safeFormatDate = (dateVal: any) => {
    if (!dateVal) return "Vừa xong";
    try {
      let d: Date;
      if (typeof dateVal === "object" && dateVal !== null) {
        if (typeof dateVal.toDate === "function") {
          d = dateVal.toDate();
        } else if (typeof dateVal.seconds === "number") {
          d = new Date(dateVal.seconds * 1000);
        } else {
          d = new Date(dateVal);
        }
      } else if (typeof dateVal === "number") {
        d = new Date(dateVal);
      } else {
        d = new Date(String(dateVal));
      }

      if (isNaN(d.getTime())) return "Vừa xong";

      return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    } catch (e) {
      return "Vừa xong";
    }
  };

  // Filter games based on search & grade
  const filteredGames = games.filter((g) => {
    const matchSearch = (g.title + " " + g.description + " " + g.topic).toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = gradeFilter === "all" || g.grade === gradeFilter || g.grade === "Tất cả các khối" || (user.className && g.grade.includes(user.className.substring(0, 5)));
    return matchSearch && matchGrade;
  });

  return (
    <div className="space-y-8">
      {/* 🏆 THỬ THÁCH MỖI NGÀY & TÍCH LŨY ĐIỂM THƯỞNG BANNER */}
      <div
        id="student-game-reward-card"
        className="bg-gradient-to-br from-indigo-950 via-slate-900 to-amber-950 border-2 border-amber-400/60 rounded-[32px] p-6 md:p-8 shadow-2xl text-white space-y-6 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-64 h-64 bg-amber-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -translate-x-12 translate-y-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-400/20 text-amber-300 border border-amber-400/30 text-xs font-black px-3.5 py-1.5 rounded-full">
              <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
              <span>THỬ THÁCH MỖI NGÀY</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Gamepad2 className="w-8 h-8 text-amber-400 shrink-0" />
              <span>Tích lũy điểm thưởng từ trò chơi</span>
            </h1>

            {/* MANDATORY SLOGAN */}
            <div className="inline-flex items-center gap-2 bg-slate-950/60 border border-amber-500/30 px-4 py-2 rounded-2xl">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300 shrink-0" />
              <span className="text-xs md:text-sm font-black text-amber-200 tracking-wide">
                Học mà chơi - Chơi mà giỏi
              </span>
            </div>

            <p className="text-slate-300 text-xs md:text-sm max-w-xl leading-relaxed">
              Chào em <strong className="text-amber-300">{user.name}</strong>! Chọn các trò chơi học tập dưới đây để ôn luyện kiến thức, thi tài cùng bạn bè và tích điểm thưởng nhé!
            </p>
          </div>

          {/* TOTAL REWARD POINTS DISPLAY CARD */}
          <div className="bg-slate-950/90 border-2 border-amber-400/50 rounded-2xl p-5 shadow-2xl flex flex-col items-center justify-center text-center shrink-0 min-w-[220px] space-y-3 relative z-10">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest block">
              TỔNG ĐIỂM THƯỞNG
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl md:text-4xl font-black text-amber-400 tracking-tight">
                ⭐ {totalGamePoints}
              </span>
              <span className="text-xs font-bold text-slate-300">điểm</span>
            </div>

            <button
              onClick={() => {
                const el = document.getElementById("educational-games-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-amber-400/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Chơi game ngay</span>
            </button>
          </div>
        </div>
      </div>

      {/* MAIN GAMES & HISTORY SECTION */}
      <div id="educational-games-section" className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* LEFT 2 COLUMNS: GAME SEARCH, FILTERS & GAME CARDS GRID */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
            <h2 className="font-black text-slate-900 text-lg md:text-xl flex items-center gap-2">
              <span className="bg-amber-100 p-2 rounded-2xl text-amber-600 block shadow-2xs">
                <Gamepad2 className="w-5 h-5 shrink-0 text-amber-600" />
              </span>
              🎯 Trò chơi học tập
            </h2>
            <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-xl">
              {filteredGames.length} trò chơi
            </span>
          </div>

          {/* FILTER & SEARCH TOOLBAR */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm tên trò chơi, chủ đề..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">Lọc khối:</span>
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                >
                  <option value="all">Tất cả bài học</option>
                  <option value="Tin học 3">Tin học 3</option>
                  <option value="Tin học 4">Tin học 4</option>
                  <option value="Tin học 5">Tin học 5</option>
                </select>
              </div>

              <button
                onClick={() => {
                  fetchGames();
                  fetchGamePoints();
                }}
                className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-all"
                title="Làm mới"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              </button>
            </div>
          </div>

          {/* GAMES GRID */}
          {loading ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 shadow-sm">
              <RefreshCw className="w-8 h-8 text-amber-500 animate-spin mx-auto mb-3" />
              <p className="text-sm font-bold text-slate-600">Đang tải các trò chơi hấp dẫn...</p>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 shadow-sm space-y-3">
              <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">Chưa có trò chơi nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Thầy cô chưa cập nhật trò chơi cho danh mục này. Em hãy quay lại sau nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {filteredGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white rounded-3xl border border-slate-100 hover:border-amber-300 shadow-xs hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
                >
                  {/* Image Banner */}
                  <div className="relative h-44 bg-slate-900 overflow-hidden">
                    <img
                      src={game.imageUrl || "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80"}
                      alt={game.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                    {/* Grade & Topic Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-lg shadow-2xs">
                        {game.grade}
                      </span>
                      {game.topic && (
                        <span className="text-[10px] font-bold bg-white/30 backdrop-blur-md text-white px-2.5 py-0.5 rounded-lg">
                          {game.topic}
                        </span>
                      )}
                    </div>

                    {/* Decorative Play Floating Button */}
                    <button
                      onClick={() => setPlayingGame(game)}
                      className="absolute bottom-3 right-3 w-11 h-11 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30 transform group-hover:scale-110 transition-all cursor-pointer"
                      title="Chơi ngay"
                    >
                      <Play className="w-5 h-5 ml-0.5 fill-slate-950" />
                    </button>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                        {game.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                        {game.description || "Trò chơi rèn luyện tư duy và kiến thức Tin học cực kỳ thú vị."}
                      </p>
                    </div>

                    {/* Main Action Button */}
                    <button
                      onClick={() => setPlayingGame(game)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs md:text-sm py-3 px-4 rounded-2xl shadow-md shadow-amber-400/20 cursor-pointer transition-all active:scale-95"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Chơi ngay (+Điểm thưởng)</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT 1 COLUMN: 📊 LỊCH SỬ TÍCH ĐIỂM */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200/80 rounded-[32px] p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3.5 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-sm md:text-base flex items-center gap-2">
                <span className="bg-amber-100 p-2 rounded-2xl text-amber-600 block shadow-2xs">
                  <History className="w-4 h-4 shrink-0 text-amber-600" />
                </span>
                📊 Lịch sử tích điểm
              </h3>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-black px-2.5 py-1 rounded-xl">
                {gameHistoryList.length} lượt
              </span>
            </div>

            {gameHistoryList.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-6 rounded-2xl text-center text-xs text-slate-500 font-medium space-y-2">
                <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                  <Trophy className="w-5 h-5" />
                </div>
                <p className="font-bold text-slate-800">Chưa có lượt chơi nào</p>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Em hãy chọn một trò chơi bên cạnh và hoàn thành để nhận những điểm thưởng đầu tiên nhé!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                {gameHistoryList.map((rec, idx) => (
                  <div
                    key={rec.id || `game-rec-${idx}`}
                    className="bg-slate-50 hover:bg-amber-50/50 border border-slate-200/80 hover:border-amber-300/80 p-3.5 rounded-2xl flex items-center justify-between transition-all"
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <span className="font-black text-xs text-slate-900 truncate block">
                        🎮 {rec.gameName}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold block">
                        {safeFormatDate(rec.completedAt)}
                      </span>
                    </div>
                    <span className="bg-amber-400/20 text-amber-900 border border-amber-400/40 text-xs font-black px-2.5 py-1 rounded-xl shrink-0 shadow-2xs">
                      +{rec.rewardPoints}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* GAME PLAYER MODAL */}
      {playingGame && (
        <GameModalPlayer
          game={playingGame}
          onClose={() => {
            setPlayingGame(null);
            fetchGamePoints();
          }}
          user={user}
          onRewardEarned={() => {
            fetchGamePoints();
          }}
        />
      )}
    </div>
  );
}

