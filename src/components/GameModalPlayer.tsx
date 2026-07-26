import React, { useState, useEffect } from "react";
import { Game, User } from "../types";
import { formatGameEmbedUrl } from "../lib/gameUtils";
import BuiltInGamePlayer from "./BuiltInGamePlayer";
import { fsRecordGameCompletion } from "../lib/firestoreData";
import { 
  Gamepad2, X, ExternalLink, RefreshCw, AlertCircle, Sparkles, Trophy, CheckCircle2
} from "lucide-react";

interface GameModalPlayerProps {
  game: Game;
  onClose: () => void;
  user?: User | null;
  onRewardEarned?: (rewardPoints: number, gameTitle: string) => void;
}

export default function GameModalPlayer({ game, onClose, user, onRewardEarned }: GameModalPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ pointsEarned: number; totalPoints: number } | null>(null);
  const [claiming, setClaiming] = useState(false);

  const formatted = formatGameEmbedUrl(game.gameUrl);

  // Auto handle non-embeddable games by launching tab on open
  useEffect(() => {
    if (formatted.isNonEmbeddable) {
      const openUrl = game.gameUrl.startsWith("http") ? game.gameUrl : `https://${game.gameUrl}`;
      window.open(openUrl, "_blank");
    }
  }, [formatted.isNonEmbeddable, game.gameUrl]);

  // Automatically clear loading overlay after 2.5 seconds
  useEffect(() => {
    if (!formatted.isBuiltIn && !formatted.isNonEmbeddable) {
      const timer = setTimeout(() => {
        setIframeLoading(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [formatted]);

  const handleIframeLoad = () => {
    setIframeLoading(false);
    setIframeError(false);
  };

  const handleIframeError = () => {
    setIframeLoading(false);
    setIframeError(true);
  };

  const directOpenUrl = formatted.isBuiltIn
    ? ""
    : (game.gameUrl.startsWith("http") ? game.gameUrl : formatted.embedUrl);

  const handleClaimReward = async () => {
    if (!user || user.role !== "student" || claiming) return;
    setClaiming(true);

    const studentId = user.id || user.studentCode || "student-default";
    const studentCode = user.studentCode || "";
    const studentName = user.name || "Học sinh";
    const rewardPts = 20;

    console.log("[GAME] Game completed", { gameId: game.id, gameName: game.title, score: 100 });
    console.log("[GAME] Current student ID", { studentId, studentCode, studentName });
    console.log("[GAME] Calculated reward points", rewardPts);
    console.log("[GAME] Saving reward points...");

    try {
      const result = await fsRecordGameCompletion({
        studentId,
        studentCode,
        studentName,
        gameId: game.id,
        gameName: game.title,
        score: 100,
        rewardPoints: rewardPts
      });

      console.log("[GAME] Firestore write result", { success: true, recordId: result.newRecord?.id });
      console.log("[GAME] Updated total points", result.totalGamePoints);

      setClaimedReward({
        pointsEarned: rewardPts,
        totalPoints: result.totalGamePoints
      });

      if (onRewardEarned) {
        onRewardEarned(rewardPts, game.title);
      }

      // Sync to API in background if API is available
      fetch("/api/student/game-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          studentCode,
          studentName,
          gameId: game.id,
          gameName: game.title,
          score: 100,
          rewardPoints: rewardPts
        })
      }).catch((e) => console.log("Optional API sync notice:", e));

    } catch (fsErr) {
      console.error("Firestore claim reward error:", fsErr);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-2 md:p-6">
      <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-3xl shadow-2xl border border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 p-4 px-6 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 p-2 rounded-xl text-slate-950 font-black shrink-0">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">{game.title}</h3>
              <span className="text-xs text-amber-300 font-extrabold">{game.grade} • {game.topic || "Tin học"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {directOpenUrl && (
              <a
                href={directOpenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-xl transition-all border border-slate-700"
                title="Tùy chọn: Mở trò chơi trong trang riêng"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Mở toàn màn hình (Tùy chọn)</span>
              </a>
            )}

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-all cursor-pointer"
              title="Đóng trò chơi"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Game Viewport Container */}
        <div className="flex-1 bg-slate-950 relative flex flex-col overflow-hidden">
          {formatted.isBuiltIn ? (
            /* Render Built-in Interactive React Game */
            <div className="w-full h-full overflow-y-auto p-4">
              <BuiltInGamePlayer
                gameKey={formatted.builtInKey!}
                onClose={onClose}
                user={user}
                onRewardEarned={onRewardEarned}
              />
            </div>
          ) : formatted.isNonEmbeddable ? (
            /* Launcher Card for Non-Embeddable Sites (Kahoot, Blooket, Gimkit) */
            <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-amber-500/20 border border-amber-500/40 rounded-3xl flex items-center justify-center text-amber-400 animate-pulse">
                <Gamepad2 className="w-10 h-10" />
              </div>

              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-xl font-black text-white">Đã kích hoạt trò chơi!</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Trò chơi trực tuyến này đã được mở trong cửa sổ mới. Sau khi hoàn thành lượt chơi, nhấn nút bên dưới để nhận điểm thưởng nhé!
                </p>
              </div>

              {claimedReward ? (
                <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-2xl max-w-sm mx-auto space-y-1">
                  <span className="text-sm font-black text-emerald-300 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ĐÃ CỘNG +{claimedReward.pointsEarned} ĐIỂM THƯỞNG!
                  </span>
                  <p className="text-xs text-emerald-200">
                    Tổng điểm thưởng trò chơi: <strong className="text-amber-300">⭐ {claimedReward.totalPoints} điểm</strong>
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 justify-center">
                  <a
                    href={directOpenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-sm px-6 py-3.5 rounded-2xl shadow-xl shadow-amber-400/20 hover:scale-105 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-4 h-4" />
                    MỞ LẠI TRANG TRÒ CHƠI
                  </a>

                  {user && user.role === "student" && (
                    <button
                      onClick={handleClaimReward}
                      disabled={claiming}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm px-6 py-3.5 rounded-2xl border border-emerald-400 shadow-xl transition-all cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      {claiming ? "Đang lưu điểm..." : "Xác nhận hoàn thành & Nhận +20đ"}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Render External Web Embed (Scratch / Turbowarp / Wordwall / HTML5) */
            <div className="w-full h-full relative bg-slate-950 flex flex-col">
              {iframeLoading && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3 transition-opacity duration-300">
                  <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-200">Đang tải nội dung trò chơi...</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Trò chơi sẽ hiển thị trực tiếp ngay sau khi kết nối hoàn tất.
                  </p>
                </div>
              )}

              <div className="flex-1 relative">
                {formatted.isHtmlDoc ? (
                  <iframe
                    srcDoc={formatted.embedUrl}
                    title={game.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; gamepad; microphone; camera; display-capture; fullscreen"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  ></iframe>
                ) : (
                  <iframe
                    src={formatted.embedUrl}
                    title={game.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; gamepad; microphone; camera; display-capture; fullscreen"
                    allowFullScreen
                    onLoad={handleIframeLoad}
                    onError={handleIframeError}
                  ></iframe>
                )}

                {iframeError && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-amber-500/40 text-amber-200 px-5 py-3 rounded-2xl text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-3 z-20">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Trang gốc bị gián đoạn hoặc không phản hồi.</span>
                    {directOpenUrl && (
                      <a
                        href={directOpenUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-amber-400 text-slate-950 px-3.5 py-1.5 rounded-xl text-xs font-black hover:bg-amber-300 transition-all flex items-center gap-1 shadow-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Mở trang gốc
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Reward Claim Bar */}
              <div className="bg-slate-900 border-t border-slate-800 p-3 px-6 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                <div className="flex items-center gap-2 text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    Chơi xong trò chơi? Nhấn nút bên cạnh để cộng điểm thưởng vào tài khoản của em!
                  </span>
                </div>

                {claimedReward ? (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-950 text-emerald-300 font-black px-4 py-2 rounded-xl border border-emerald-500/40">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Đã cộng +{claimedReward.pointsEarned}đ (Tổng: ⭐ {claimedReward.totalPoints}đ)
                  </span>
                ) : user && user.role === "student" ? (
                  <button
                    onClick={handleClaimReward}
                    disabled={claiming}
                    className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black px-5 py-2 rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    <Trophy className="w-4 h-4" />
                    {claiming ? "Đang tính điểm..." : "Hoàn thành & Nhận +20đ thưởng"}
                  </button>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
