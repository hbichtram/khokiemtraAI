import React from "react";
import { StudentBannerConfig } from "../types";
import StudentBannerIllustration from "./StudentBannerIllustration";
import { Sparkles, Edit3 } from "lucide-react";

interface StudentBannerProps {
  config: StudentBannerConfig;
  onOpenEditor?: () => void;
  canEdit?: boolean;
}

export default function StudentBanner({ config, onOpenEditor, canEdit = false }: StudentBannerProps) {
  const {
    height = 210,
    title = "HỌC VUI – CHƠI HAY",
    subtitle = "Học tập thông minh – Tiến bộ mỗi ngày",
    messages = [
      "🎯 Học mà chơi",
      "⭐ Chinh phục thử thách",
      "🏆 Tích lũy thành tích",
      "🚀 Tiến bộ mỗi ngày"
    ],
    imageUrl = "",
    showPills = true,
    themeStyle = "brand-gradient"
  } = config;

  // Background style classes based on theme
  const getThemeBg = () => {
    switch (themeStyle) {
      case "playful-indigo":
        return "from-[#4338CA] via-[#6366F1] to-[#8B5CF6]";
      case "sunshine-gold":
        return "from-[#D97706] via-[#F59E0B] to-[#FBBF24]";
      case "emerald-fresh":
        return "from-[#059669] via-[#10B981] to-[#34D399]";
      case "brand-gradient":
      default:
        // Deep purple-indigo to playful violet with subtle warm highlight
        return "from-[#312E81] via-[#4338CA] to-[#6366F1]";
    }
  };

  // Safe clamping for height on mobile vs desktop
  // Min 120px, responsive inline styles
  return (
    <div className="w-full flex justify-center select-none">
      <div
        id="student-main-banner"
        style={{
          // Apply custom height on desktop; clamp on smaller screens
          minHeight: "140px",
          height: `${height}px`,
          maxHeight: "420px",
        }}
        className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden shadow-md sm:shadow-lg border border-indigo-200/40 text-white bg-gradient-to-r ${getThemeBg()} flex flex-col justify-center transition-all duration-200 group`}
      >
        {/* Subtle decorative background shapes */}
        <div className="absolute -top-12 -left-12 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
        <div className="absolute -bottom-16 right-1/4 w-56 h-56 bg-amber-400/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-1/2 right-10 w-32 h-32 bg-pink-400/15 rounded-full blur-xl pointer-events-none" />

        {/* If Custom Uploaded Image is provided */}
        {imageUrl ? (
          <div className="absolute inset-0 w-full h-full">
            <img
              src={imageUrl}
              alt="Banner Học Vui Chơi Hay"
              className="w-full h-full object-cover object-center"
              referrerPolicy="no-referrer"
            />
            {/* Subtle gradient overlay to keep text legible if custom text is preserved */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-950/40 to-transparent flex items-center px-6 sm:px-10">
              <div className="max-w-md space-y-1.5 z-10">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm">
                  <Sparkles className="w-3.5 h-3.5" />
                  HỌC VUI – CHƠI HAY
                </div>
                <h2 className="text-lg sm:text-2xl md:text-3xl font-black text-white drop-shadow-md leading-tight">
                  {title}
                </h2>
                <p className="text-xs sm:text-sm font-semibold text-amber-200 drop-shadow-sm">
                  “{subtitle}”
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* Default Rich Interactive Illustration Layout */
          <div className="relative z-10 w-full h-full px-4 sm:px-8 md:px-10 py-3 sm:py-4 flex items-center justify-between gap-4">
            
            {/* LEFT SIDE: BRANDING, TITLE & SLOGAN */}
            <div className="flex-1 min-w-0 py-1 flex flex-col justify-center space-y-1 sm:space-y-2 max-w-xl">
              {/* Top Tag Pill */}
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] sm:text-xs uppercase tracking-wider shadow-sm shrink-0">
                  <Sparkles className="w-3 h-3 text-slate-950 fill-slate-950" />
                  NỀN TẢNG TIỂU HỌC
                </span>
                <span className="text-[10px] sm:text-xs font-bold text-indigo-200 hidden sm:inline-block truncate">
                  Trực quan • Vui nhộn • Tiến bộ
                </span>
              </div>

              {/* Main Title */}
              <h2 className="text-lg sm:text-2xl md:text-3xl lg:text-[32px] font-black text-white tracking-tight leading-tight drop-shadow-sm truncate">
                {title}
              </h2>

              {/* Slogan */}
              <p className="text-xs sm:text-sm md:text-base font-bold text-amber-300 drop-shadow-xs truncate">
                “{subtitle}”
              </p>

              {/* Sub-Messages / Feature Pills */}
              {showPills && messages && messages.length > 0 && (
                <div className="pt-1 hidden sm:flex flex-wrap items-center gap-1.5 md:gap-2">
                  {messages.map((msg, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur-xs text-white text-[11px] font-bold border border-white/20 transition-colors shadow-2xs whitespace-nowrap"
                    >
                      {msg}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* RIGHT SIDE: 3D ILLUSTRATION */}
            <div className="w-36 sm:w-56 md:w-72 lg:w-84 h-full flex items-center justify-end shrink-0 py-1">
              <StudentBannerIllustration className="w-full h-full max-h-full" />
            </div>
          </div>
        )}

        {/* Teacher Edit Trigger (ONLY visible if user is teacher and canEdit is true) */}
        {canEdit && onOpenEditor && (
          <button
            type="button"
            onClick={onOpenEditor}
            className="absolute top-2.5 right-2.5 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900/80 hover:bg-slate-900 text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/20 shadow-md flex items-center gap-1.5 cursor-pointer backdrop-blur-xs"
            title="Chỉnh sửa kích thước hoặc hình ảnh banner"
          >
            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
            <span>Sửa banner</span>
          </button>
        )}
      </div>
    </div>
  );
}
