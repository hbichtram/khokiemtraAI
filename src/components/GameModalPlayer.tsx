import React, { useState, useEffect } from "react";
import { Game } from "../types";
import { formatGameEmbedUrl } from "../lib/gameUtils";
import BuiltInGamePlayer from "./BuiltInGamePlayer";
import { 
  Gamepad2, X, ExternalLink, RefreshCw, AlertCircle, Sparkles
} from "lucide-react";

interface GameModalPlayerProps {
  game: Game;
  onClose: () => void;
}

export default function GameModalPlayer({ game, onClose }: GameModalPlayerProps) {
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);

  const formatted = formatGameEmbedUrl(game.gameUrl);

  // Auto handle non-embeddable games by launching tab on open
  useEffect(() => {
    if (formatted.isNonEmbeddable) {
      const openUrl = game.gameUrl.startsWith("http") ? game.gameUrl : `https://${game.gameUrl}`;
      window.open(openUrl, "_blank");
    }
  }, [formatted.isNonEmbeddable, game.gameUrl]);

  // Automatically clear loading overlay after 2 seconds to ensure iframe is immediately visible
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
              <BuiltInGamePlayer gameKey={formatted.builtInKey!} onClose={onClose} />
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
                  Trò chơi trực tuyến này đã được mở trong cửa sổ mới. Nối tiếp hành trình thi đấu và thử thách bản thân ngay nhé!
                </p>
              </div>

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

                <button
                  onClick={onClose}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm px-6 py-3.5 rounded-2xl border border-slate-700 transition-all cursor-pointer"
                >
                  Hoàn thành & Quay lại
                </button>
              </div>
            </div>
          ) : (
            /* Render External Web Embed (Scratch / Turbowarp / Wordwall / HTML5) */
            <div className="w-full h-full relative bg-slate-950">
              {iframeLoading && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center z-10 space-y-3 transition-opacity duration-300">
                  <RefreshCw className="w-10 h-10 text-amber-400 animate-spin" />
                  <p className="text-sm font-bold text-slate-200">Đang tải nội dung trò chơi...</p>
                  <p className="text-xs text-slate-400 max-w-sm">
                    Trò chơi sẽ hiển thị trực tiếp ngay sau khi kết nối hoàn tất.
                  </p>
                </div>
              )}

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
          )}

          {/* Bottom helper info */}
          {!formatted.isBuiltIn && !formatted.isNonEmbeddable && !iframeError && (
            <div className="bg-slate-900 border-t border-slate-800 p-2.5 px-6 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Đang phát trực tiếp trong ứng dụng. Chúc em chơi vui vẻ và đạt điểm cao!
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
