import React, { useState, useEffect } from "react";
import { Game, User } from "../types";
import { 
  Gamepad2, Play, Sparkles, Search, RefreshCw, X, ExternalLink, 
  Trophy, Star, Award, Heart, CheckCircle2 
} from "lucide-react";
import { fsGetGames } from "../lib/firestoreData";
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

  useEffect(() => {
    fetchGames();
  }, []);

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

  // Filter games based on search & grade
  const filteredGames = games.filter((g) => {
    const matchSearch = (g.title + " " + g.description + " " + g.topic).toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = gradeFilter === "all" || g.grade === gradeFilter || g.grade === "Tất cả các khối" || (user.className && g.grade.includes(user.className.substring(0, 5)));
    return matchSearch && matchGrade;
  });

  return (
    <div className="space-y-6">
      {/* SLOGAN & WELCOME BANNER */}
      <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-12 -translate-y-12 w-64 h-64 bg-white/20 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/25 border border-white/30 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-black text-amber-100 mb-3 shadow-2xs">
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>Góc vui học Tin học</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-2.5">
              <span>🎮 Trò chơi học tập</span>
            </h1>

            {/* MANDATORY SLOGAN */}
            <div className="mt-2 inline-flex items-center gap-2 bg-amber-950/40 border border-amber-300/40 backdrop-blur-md px-4 py-2 rounded-2xl">
              <Star className="w-5 h-5 text-amber-300 fill-amber-300 shrink-0" />
              <span className="text-sm md:text-base font-black text-amber-100 tracking-wide">
                Học mà chơi - Chơi mà giỏi
              </span>
            </div>

            <p className="text-amber-100 text-xs md:text-sm mt-3 max-w-xl leading-relaxed">
              Chào em <strong className="text-white">{user.name}</strong>! Hãy tham gia các trò chơi sinh động dưới đây để vừa giải trí vừa nâng cao kiến thức Tin học nhé!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center shrink-0 hidden md:block">
            <Trophy className="w-10 h-10 text-amber-300 mx-auto mb-1 animate-bounce" />
            <span className="text-xs font-bold text-white block">Thử thách mỗi ngày</span>
            <span className="text-[10px] text-amber-200 font-medium">Tích lũy điểm thưởng!</span>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
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
            onClick={fetchGames}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className="bg-white rounded-3xl border border-slate-100 hover:border-amber-200 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between group"
            >
              {/* Image Banner */}
              <div className="relative h-48 bg-slate-900 overflow-hidden">
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
                  className="absolute bottom-3 right-3 w-12 h-12 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/30 transform group-hover:scale-110 transition-all cursor-pointer"
                  title="Chơi ngay"
                >
                  <Play className="w-6 h-6 ml-0.5 fill-slate-950" />
                </button>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {game.description || "Trò chơi rèn luyện tư duy và kiến thức Tin học cực kỳ thú vị."}
                  </p>
                </div>

                {/* Main Action Button */}
                <button
                  onClick={() => setPlayingGame(game)}
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm py-3 px-4 rounded-2xl shadow-md shadow-amber-500/20 cursor-pointer transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  <span>Chơi ngay</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GAME PLAYER MODAL */}
      {playingGame && (
        <GameModalPlayer game={playingGame} onClose={() => setPlayingGame(null)} />
      )}
    </div>
  );
}
