import React from "react";
import { User, StudentBannerConfig } from "../types";
import StudentBannerIllustration from "./StudentBannerIllustration";
import { LogOut, Gamepad2, Check, Smile, Star } from "lucide-react";

interface StudentHeroProps {
  user: User;
  classInfo?: any;
  teacherName?: string;
  onLogout: () => void;
  bannerConfig?: StudentBannerConfig;
  completedAssignmentsCount?: number;
}

export default function StudentHero({
  user,
  classInfo,
  teacherName = "Hồng Bích Trâm",
  onLogout,
  bannerConfig,
  completedAssignmentsCount = 0,
}: StudentHeroProps) {
  const className = classInfo?.name || user.className || "Lớp học";
  const brandTitle = bannerConfig?.title || "HỌC VUI – CHƠI HAY";
  const brandSubtitle = bannerConfig?.subtitle || "Học tập thông minh – Tiến bộ mỗi ngày";
  const themeStyle = bannerConfig?.themeStyle || "brand-gradient";

  // Theme gradient background mapping (gentle & sophisticated)
  const getThemeBg = () => {
    switch (themeStyle) {
      case "playful-indigo":
        return "from-[#312E81] via-[#4338CA] to-[#6366F1]";
      case "sunshine-gold":
        return "from-[#9A3412] via-[#C2410C] to-[#EA580C]";
      case "emerald-fresh":
        return "from-[#065F46] via-[#047857] to-[#059669]";
      case "brand-gradient":
      default:
        return "from-[#2E1065] via-[#3730A3] to-[#4F46E5]";
    }
  };

  // Cute student avatar rendering
  const renderAvatar = () => {
    if (user.photoURL) {
      return (
        <img
          src={user.photoURL}
          alt={user.name}
          className="w-14 h-14 sm:w-16 sm:h-16 md:w-17 md:h-17 rounded-2xl sm:rounded-3xl object-cover border-2 border-white/80 shadow-md shadow-indigo-950/30 shrink-0"
          referrerPolicy="no-referrer"
        />
      );
    }

    // High quality cartoon student avatar with cute elements
    return (
      <div className="relative w-14 h-14 sm:w-16 sm:h-16 md:w-17 md:h-17 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 border-2 border-white/90 shadow-md shadow-indigo-950/30 flex items-center justify-center shrink-0 overflow-hidden group">
        <svg
          viewBox="0 0 80 80"
          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background circle */}
          <circle cx="40" cy="40" r="40" fill="url(#avatarBgGrad)" />
          {/* Cute Student Boy/Girl Illustration */}
          <ellipse cx="40" cy="36" rx="22" ry="20" fill="#1E1B4B" />
          <circle cx="21" cy="42" r="5" fill="#F5C6A0" />
          <circle cx="59" cy="42" r="5" fill="#F5C6A0" />
          <ellipse cx="40" cy="42" rx="18" ry="17" fill="#FFE0BD" />
          <path d="M22 36C22 36 28 26 40 26C52 26 58 36 58 36C58 36 53 32 40 32C27 32 22 36 22 36Z" fill="#1E1B4B" />
          <ellipse cx="33" cy="42" rx="2.5" ry="3.5" fill="#1E1B4B" />
          <ellipse cx="47" cy="42" rx="2.5" ry="3.5" fill="#1E1B4B" />
          <circle cx="34" cy="40.5" r="1" fill="#FFFFFF" />
          <circle cx="48" cy="40.5" r="1" fill="#FFFFFF" />
          <ellipse cx="29" cy="47" rx="3.5" ry="2" fill="#F472B6" opacity="0.6" />
          <ellipse cx="51" cy="47" rx="3.5" ry="2" fill="#F472B6" opacity="0.6" />
          <path d="M36 47C36 47 38 50 40 50C42 50 44 47 44 47" stroke="#9A3412" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 68C22 60 28 58 40 58C52 58 58 60 58 68V80H22V68Z" fill="#0284C7" />
          <path d="M34 58L40 68L46 58H34Z" fill="#EF4444" />
          <path d="M38 67L36 78L40 75L44 78L42 67H38Z" fill="#DC2626" />
          <defs>
            <linearGradient id="avatarBgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE047" />
              <stop offset="100%" stopColor="#F59E0B" />
            </linearGradient>
          </defs>
        </svg>

        {/* Small sparkle star on avatar */}
        <div className="absolute top-1 right-1 bg-amber-400 text-slate-950 p-0.5 rounded-full shadow-xs">
          <Star className="w-2.5 h-2.5 fill-slate-950" />
        </div>
      </div>
    );
  };

  return (
    <div
      id="student-hero-banner"
      className={`relative w-full rounded-[24px] sm:rounded-[28px] overflow-hidden shadow-lg border border-indigo-200/30 text-white bg-gradient-to-r ${getThemeBg()} transition-all duration-300 select-none min-h-[210px] lg:h-[235px] flex flex-col justify-between`}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute -top-16 -left-16 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-20 left-1/3 w-60 h-60 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-pink-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* TOP-RIGHT: Small, neat Logout Button */}
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <button
          id="btn-student-logout"
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-[11px] font-bold backdrop-blur-md border border-white/20 shadow-2xs transition-all cursor-pointer active:scale-95 group"
          title="Đăng xuất khỏi tài khoản học sinh"
        >
          <LogOut className="w-3.5 h-3.5 text-amber-300 transition-transform group-hover:-translate-x-0.5" />
          <span>Đăng xuất</span>
        </button>
      </div>

      {/* MAIN CONTENT: 3 BALANCED REGIONS */}
      <div className="relative z-10 w-full h-full p-3.5 sm:p-5 md:p-6 flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-3 my-auto">
        
        {/* ======================================================== */}
        {/* 1. BÊN TRÁI: THÔNG TIN HỌC SINH */}
        {/* ======================================================== */}
        <div className="w-full lg:w-[41%] flex items-center gap-3 sm:gap-4 pr-1">
          {/* Avatar */}
          {renderAvatar()}

          {/* Greeting & Info */}
          <div className="flex-1 min-w-0 space-y-1">
            <span className="text-xs sm:text-sm font-semibold text-indigo-100/90 block">
              Chào mừng em,
            </span>

            {/* Student Name */}
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight leading-tight drop-shadow-xs flex items-center gap-1.5 truncate">
              <span className="truncate">{user.name}</span>
              <Smile className="w-5 h-5 text-amber-300 shrink-0 inline-block animate-bounce" />
            </h1>

            {/* Class & Teacher Details: Lớp [tên lớp] • GV: [tên giáo viên] */}
            <p className="text-xs sm:text-sm font-bold text-amber-200/95 drop-shadow-xs truncate">
              <span>Lớp: <strong className="text-white font-black">{className}</strong></span>
              <span className="mx-1.5 text-white/50">•</span>
              <span>GV: <strong className="text-white font-bold">{teacherName}</strong></span>
            </p>

            {/* Small achievement badge: "✓ 2 bài đã hoàn thành" or "Chưa có bài hoàn thành" */}
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-white/10 text-indigo-100 text-[10.5px] sm:text-[11px] font-semibold border border-white/15">
                <Check className="w-3 h-3 text-amber-300 shrink-0" />
                {completedAssignmentsCount > 0
                  ? `✓ ${completedAssignmentsCount} bài đã hoàn thành`
                  : "Chưa có bài hoàn thành"}
              </span>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. Ở GIỮA: THƯƠNG HIỆU + THÔNG ĐIỆP */}
        {/* ======================================================== */}
        <div className="w-full lg:w-[32%] text-center lg:text-left flex flex-col items-center lg:items-start justify-center space-y-1 px-2 lg:border-l lg:border-r lg:border-white/15 lg:px-4">
          {/* Badge: 🎮 HỌC MÀ CHƠI */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-2xs">
            <Gamepad2 className="w-3 h-3 text-slate-950" />
            <span>HỌC MÀ CHƠI</span>
          </div>

          {/* App Brand Name */}
          <h2 className="text-base sm:text-lg md:text-xl font-black text-amber-300 tracking-tight uppercase drop-shadow-xs">
            {brandTitle}
          </h2>

          {/* Slogan */}
          <p className="text-xs sm:text-sm font-semibold text-indigo-100/90 leading-snug drop-shadow-xs italic max-w-xs">
            “{brandSubtitle}”
          </p>

          {/* Single sub-badge: ⭐ Tích lũy điểm (Removed duplicate Leaderboard badge) */}
          <div className="pt-0.5">
            <span className="text-[10px] font-bold text-indigo-200/90 bg-white/10 px-2 py-0.5 rounded-md inline-block">
              ⭐ Tích lũy điểm
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. BÊN PHẢI: HÌNH MINH HỌA HỌC TẬP */}
        {/* ======================================================== */}
        <div className="w-full sm:w-auto lg:w-[27%] h-32 sm:h-36 lg:h-full max-h-[180px] flex items-center justify-center lg:justify-end shrink-0 py-1">
          <StudentBannerIllustration className="w-full h-full max-h-[170px] object-contain" />
        </div>

      </div>
    </div>
  );
}
