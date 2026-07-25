import React, { useState, useEffect } from "react";
import { Game, User, ELEMENTARY_GRADES } from "../types";
import { 
  Gamepad2, Plus, Edit2, Trash2, Eye, EyeOff, Search, 
  Sparkles, ExternalLink, X, CheckCircle2, AlertCircle, RefreshCw,
  Image, Layers, Play, Check, HelpCircle
} from "lucide-react";
import { fsGetGames, fsCreateGame, fsUpdateGame, fsDeleteGame } from "../lib/firestoreData";
import { formatGameEmbedUrl, BUILTIN_GAMES } from "../lib/gameUtils";
import GameModalPlayer from "./GameModalPlayer";

interface GameManagerProps {
  user: User;
}

const PRESET_GAME_IMAGES = [
  { name: "Luyện gõ phím", url: "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=600&q=80" },
  { name: "Lập trình Scratch", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80" },
  { name: "Robot & AI", url: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80" },
  { name: "An toàn Internet", url: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80" },
  { name: "Máy tính & Chuột", url: "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=600&q=80" }
];

export default function GameManager({ user }: GameManagerProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [grade, setGrade] = useState("Tin học 3");
  const [topic, setTopic] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [gameUrl, setGameUrl] = useState("");
  const [status, setStatus] = useState<"active" | "hidden">("active");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Preview & Delete states
  const [previewGame, setPreviewGame] = useState<Game | null>(null);
  const [deletingGameId, setDeletingGameId] = useState<string | null>(null);

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async () => {
    setLoading(true);
    try {
      // First try API
      let loaded = false;
      try {
        const res = await fetch("/api/games");
        if (res.ok) {
          const data = await res.json();
          setGames(data);
          loaded = true;
        }
      } catch (e) {
        console.warn("API games fetch failed, fallback to Firestore:", e);
      }

      if (!loaded) {
        const fsGames = await fsGetGames();
        setGames(fsGames);
      }
    } catch (err) {
      console.error("Error loading games:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingGame(null);
    setTitle("");
    setDescription("");
    setGrade("Tin học 3");
    setTopic("");
    setImageUrl(PRESET_GAME_IMAGES[0].url);
    setGameUrl("");
    setStatus("active");
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (game: Game) => {
    setEditingGame(game);
    setTitle(game.title);
    setDescription(game.description);
    setGrade(game.grade);
    setTopic(game.topic);
    setImageUrl(game.imageUrl || "");
    setGameUrl(game.gameUrl);
    setStatus(game.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError("Vui lòng nhập tên trò chơi.");
      return;
    }
    if (!gameUrl.trim()) {
      setFormError("Vui lòng nhập liên kết trò chơi (URL).");
      return;
    }

    setSaving(true);
    setFormError(null);

    // Auto-format game URL (e.g. convert Scratch project links to Turbowarp embed)
    const formattedResult = formatGameEmbedUrl(gameUrl.trim());
    const finalGameUrl = formattedResult.embedUrl || gameUrl.trim();

    const gamePayload = {
      title: title.trim(),
      description: description.trim(),
      grade,
      topic: topic.trim() || "Chung",
      imageUrl: imageUrl.trim() || PRESET_GAME_IMAGES[0].url,
      gameUrl: finalGameUrl,
      status,
      teacherId: user.id
    };

    try {
      if (editingGame) {
        // Edit mode
        await fsUpdateGame(editingGame.id, gamePayload);
        try {
          await fetch(`/api/games/${editingGame.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(gamePayload)
          });
        } catch (e) {
          console.warn("API update game warning:", e);
        }
      } else {
        // Create mode
        const created = await fsCreateGame(gamePayload);
        try {
          await fetch("/api/games", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(created)
          });
        } catch (e) {
          console.warn("API create game warning:", e);
        }
      }

      setIsModalOpen(false);
      await loadGames();
    } catch (err: any) {
      console.error("Save game error:", err);
      setFormError(err.message || "Đã xảy ra lỗi khi lưu trò chơi.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (game: Game) => {
    const newStatus = game.status === "active" ? "hidden" : "active";
    try {
      await fsUpdateGame(game.id, { status: newStatus });
      try {
        await fetch(`/api/games/${game.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus })
        });
      } catch (e) {
        // ignore
      }
      setGames((prev) => prev.map((g) => (g.id === game.id ? { ...g, status: newStatus } : g)));
    } catch (err) {
      console.error("Toggle game status error:", err);
    }
  };

  const handleDeleteGame = async (id: string) => {
    try {
      await fsDeleteGame(id);
      try {
        await fetch(`/api/games/${id}`, { method: "DELETE" });
      } catch (e) {
        // ignore
      }
      setGames((prev) => prev.filter((g) => g.id !== id));
      setDeletingGameId(null);
    } catch (err) {
      console.error("Delete game error:", err);
    }
  };

  // Filter games
  const filteredGames = games.filter((g) => {
    const matchSearch = (g.title + " " + g.description + " " + g.topic).toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrade = gradeFilter === "all" || g.grade === gradeFilter || g.grade === "Tất cả các khối";
    const matchStatus = statusFilter === "all" || g.status === statusFilter;
    return matchSearch && matchGrade && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* HEADER BANNER */}
      <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-indigo-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 translate-x-10 -translate-y-10 w-72 h-72 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-purple-500/30 border border-purple-300/30 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-purple-200 mb-3">
              <Gamepad2 className="w-4 h-4 text-purple-300" />
              <span>Góc học vui • Tương tác cao</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">🎮 Quản lý Trò chơi Học tập</h1>
            <p className="text-purple-100 text-sm mt-1 max-w-xl leading-relaxed">
              Tạo và xuất bản các trò chơi học tập tương tác (Scratch, HTML5, Quiz) giúp học sinh "Học mà chơi - Chơi mà giỏi".
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-5 py-3.5 rounded-2xl shadow-lg shadow-amber-400/20 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-5 h-5" />
            <span>Thêm trò chơi mới</span>
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="bg-white p-4 md:p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên trò chơi, chủ đề..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Khối lớp:</span>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả các khối</option>
              {ELEMENTARY_GRADES.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 shrink-0">Trạng thái:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hiển thị</option>
              <option value="hidden">Đang ẩn</option>
            </select>
          </div>

          <button
            onClick={loadGames}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer transition-all shrink-0 ml-auto md:ml-0"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* GAME LIST */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 shadow-sm">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Đang tải danh sách trò chơi...</p>
        </div>
      ) : filteredGames.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl text-center border border-slate-100 shadow-sm space-y-3">
          <Gamepad2 className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Chưa có trò chơi nào</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || gradeFilter !== "all" || statusFilter !== "all"
              ? "Không tìm thấy trò chơi nào phù hợp với bộ lọc hiện tại."
              : "Thầy/cô hãy tạo trò chơi đầu tiên để giúp học sinh có những giờ ôn tập sôi nổi!"}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all shadow-md mt-2"
          >
            <Plus className="w-4 h-4" />
            Thêm trò chơi
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGames.map((game) => (
            <div
              key={game.id}
              className={`bg-white rounded-3xl border transition-all duration-300 hover:shadow-xl overflow-hidden flex flex-col justify-between ${
                game.status === "active" ? "border-slate-100" : "border-amber-200 bg-amber-50/20"
              }`}
            >
              {/* Card Image Header */}
              <div className="relative h-44 bg-slate-900 overflow-hidden group">
                <img
                  src={game.imageUrl || PRESET_GAME_IMAGES[0].url}
                  alt={game.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback image on error
                    (e.target as HTMLImageElement).src = PRESET_GAME_IMAGES[0].url;
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent"></div>

                {/* Status Badge */}
                <div className="absolute top-3 right-3">
                  <button
                    onClick={() => handleToggleStatus(game)}
                    className={`inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full backdrop-blur-md shadow-md cursor-pointer transition-all ${
                      game.status === "active"
                        ? "bg-emerald-500/90 text-white hover:bg-emerald-600"
                        : "bg-slate-700/90 text-amber-300 hover:bg-slate-800"
                    }`}
                    title={game.status === "active" ? "Bấm để ẩn trò chơi này đối với học sinh" : "Bấm để hiển thị trò chơi này cho học sinh"}
                  >
                    {game.status === "active" ? (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-200" />
                        <span>Hiển thị</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-amber-300" />
                        <span>Đang ẩn</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Grade Badge */}
                <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-black bg-indigo-600/90 text-white px-2.5 py-0.5 rounded-lg backdrop-blur-md">
                    {game.grade}
                  </span>
                  {game.topic && (
                    <span className="text-[11px] font-bold bg-white/20 text-white px-2.5 py-0.5 rounded-lg backdrop-blur-md">
                      {game.topic}
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-snug line-clamp-2 hover:text-indigo-600 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                    {game.description || "Trò chơi tương tác sinh động rèn luyện kiến thức Tin học."}
                  </p>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewGame(game)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Chơi thử
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(game)}
                      className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="Sửa trò chơi"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setDeletingGameId(game.id)}
                      className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                      title="Xóa trò chơi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-700 to-indigo-700 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md">
                  <Gamepad2 className="w-6 h-6 text-purple-200" />
                </div>
                <div>
                  <h3 className="text-lg font-black">{editingGame ? "Chỉnh sửa trò chơi" : "Thêm trò chơi mới"}</h3>
                  <p className="text-xs text-purple-200 mt-0.5">Dành cho học sinh các khối lớp Tiểu học</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-white/20 rounded-full text-purple-200 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveGame} className="p-6 space-y-4">
              {formError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-bold text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tên trò chơi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Vua Gõ Bàn Phím, Thám Tử Scratch..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                  required
                />
              </div>

              {/* Grade & Topic */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Khối lớp</label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="Tất cả các khối">Tất cả các khối</option>
                    {ELEMENTARY_GRADES.map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Chủ đề bài học</label>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="Ví dụ: Scratch, Gõ phím, Robot..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                  />
                </div>
              </div>

              {/* Game URL / Embed */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Liên kết trò chơi (URL, Scratch, Wordwall hoặc Game tích hợp) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={gameUrl}
                  onChange={(e) => setGameUrl(e.target.value)}
                  placeholder="Dán link Scratch, Turbowarp, Wordwall hoặc builtin:typing..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-slate-800"
                  required
                />
                
                <span className="text-[11px] font-bold text-slate-500 block mt-2 mb-1">
                  Hoặc chọn nhanh trò chơi tích hợp sẵn (100% mượt mà, không sợ bị chặn link):
                </span>
                <div className="flex flex-wrap gap-2">
                  {BUILTIN_GAMES.map((bg) => (
                    <button
                      key={bg.id}
                      type="button"
                      onClick={() => {
                        setTitle(bg.title);
                        setDescription(bg.description);
                        setGrade(bg.grade);
                        setTopic(bg.topic);
                        setImageUrl(bg.imageUrl);
                        setGameUrl(bg.gameUrl);
                      }}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
                        gameUrl === bg.gameUrl
                          ? "bg-amber-500 text-slate-950 border-amber-500 font-black"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <Sparkles className="w-3 h-3 text-amber-600" />
                      <span>{bg.title.split(" ")[0]} {bg.title.split(" ")[1]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail Image */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Ảnh đại diện (Đường dẫn hình ảnh)
                </label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono text-slate-800 mb-2"
                />

                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">Hoặc chọn nhanh ảnh mẫu có sẵn:</span>
                <div className="flex flex-wrap gap-2">
                  {PRESET_GAME_IMAGES.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
                        imageUrl === preset.url
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Mô tả ngắn</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Mô tả luật chơi hoặc mục tiêu bài học..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800"
                ></textarea>
              </div>

              {/* Visibility Status */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Trạng thái hiển thị</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setStatus("active")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border cursor-pointer transition-all ${
                      status === "active"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-500 ring-2 ring-emerald-500/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Hiển thị (Đã xuất bản)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStatus("hidden")}
                    className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-bold border cursor-pointer transition-all ${
                      status === "hidden"
                        ? "bg-amber-50 text-amber-900 border-amber-500 ring-2 ring-amber-500/20"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <EyeOff className="w-4 h-4 text-amber-600" />
                    <span>Ẩn (Chờ chuẩn bị)</span>
                  </button>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 text-slate-600 hover:bg-slate-100 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 cursor-pointer transition-all disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Đang lưu...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Lưu trò chơi
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PLAY / PREVIEW MODAL */}
      {previewGame && (
        <GameModalPlayer game={previewGame} onClose={() => setPreviewGame(null)} />
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingGameId && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 bg-rose-100 rounded-2xl text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Xác nhận xóa trò chơi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Trò chơi này sẽ bị xóa khỏi danh sách của giáo viên và không còn hiển thị đối với học sinh.
              </p>
            </div>
            <div className="pt-2 flex items-center justify-center gap-3">
              <button
                onClick={() => setDeletingGameId(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-all"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleDeleteGame(deletingGameId)}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-all shadow-md"
              >
                Xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
