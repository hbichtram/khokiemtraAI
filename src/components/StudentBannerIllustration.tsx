import React from "react";

interface StudentBannerIllustrationProps {
  className?: string;
}

export default function StudentBannerIllustration({ className = "" }: StudentBannerIllustrationProps) {
  return (
    <div className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}>
      <svg
        viewBox="0 0 520 320"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full max-h-full object-contain filter drop-shadow-md transition-transform"
      >
        <defs>
          {/* Gradients */}
          <linearGradient id="bgGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#C084FC" stopOpacity="0.1" />
          </linearGradient>

          <linearGradient id="skinGrad1" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFE0BD" />
            <stop offset="100%" stopColor="#F5C6A0" />
          </linearGradient>

          <linearGradient id="skinGrad2" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFDFC4" />
            <stop offset="100%" stopColor="#F0BC95" />
          </linearGradient>

          <linearGradient id="hairBoy" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2E1065" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>

          <linearGradient id="hairGirl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#312E81" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>

          <linearGradient id="shirtBoy" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          <linearGradient id="shirtGirl" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#DB2777" />
          </linearGradient>

          <linearGradient id="scarfRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>

          <linearGradient id="laptopBody" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          <linearGradient id="laptopScreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>

          <linearGradient id="tabletScreen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>

          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <linearGradient id="bookCover1" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          <linearGradient id="bookCover2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>

          <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodOpacity="0.18" />
          </filter>
        </defs>

        {/* Ambient background aura */}
        <circle cx="270" cy="160" r="140" fill="url(#bgGlow)" />

        {/* Floating Sparkles & Achievement Elements */}
        {/* Big 3D Star Top Left */}
        <g transform="translate(70, 40) rotate(-12)" filter="url(#softShadow)">
          <path
            d="M20 0 L25 14 L40 14 L28 23 L32 37 L20 28 L8 37 L12 23 L0 14 L15 14 Z"
            fill="url(#goldGrad)"
          />
          <circle cx="20" cy="18" r="4" fill="#FEF08A" opacity="0.8" />
        </g>

        {/* Floating Mini Trophy Top Right */}
        <g transform="translate(430, 45) rotate(15)" filter="url(#softShadow)">
          <path d="M12 10 H36 V24 C36 30 30 36 24 36 C18 36 12 30 12 24 Z" fill="url(#goldGrad)" />
          <path d="M12 14 H6 C4 14 3 16 3 18 C3 22 6 25 12 25" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M36 14 H42 C44 14 45 16 45 18 C45 22 42 25 36 25" stroke="#F59E0B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M20 36 H28 V43 H20 Z" fill="#D97706" />
          <rect x="14" y="43" width="20" height="7" rx="3.5" fill="#B45309" />
          <polygon points="24,16 26,20 30,20 27,23 28,27 24,24 20,27 21,23 18,20 22,20" fill="#FEF08A" />
        </g>

        {/* Floating Learning Badge (A+) */}
        <g transform="translate(40, 150) rotate(-8)" filter="url(#softShadow)">
          <circle cx="24" cy="24" r="22" fill="#4F46E5" />
          <circle cx="24" cy="24" r="18" fill="#6366F1" />
          <text x="24" y="30" fill="#FFFFFF" fontSize="16" fontWeight="900" textAnchor="middle" fontFamily="sans-serif">10</text>
          <path d="M32 10 L34 14 L38 14 L35 17 L36 21 L32 18 L28 21 L29 17 L26 14 L30 14 Z" fill="#FDE047" />
        </g>

        {/* Floating Game Controller Badge */}
        <g transform="translate(440, 160) rotate(10)" filter="url(#softShadow)">
          <rect x="0" y="0" width="46" height="32" rx="10" fill="#10B981" />
          {/* D-pad */}
          <path d="M12 16 H18 M15 13 V19" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          {/* Action buttons */}
          <circle cx="31" cy="14" r="2.5" fill="#FDE047" />
          <circle cx="36" cy="18" r="2.5" fill="#EF4444" />
        </g>

        {/* Floating Star Right Mid */}
        <g transform="translate(485, 110) scale(0.65)" filter="url(#softShadow)">
          <path
            d="M20 0 L25 14 L40 14 L28 23 L32 37 L20 28 L8 37 L12 23 L0 14 L15 14 Z"
            fill="url(#goldGrad)"
          />
        </g>

        {/* Sparkle sparkles */}
        <circle cx="160" cy="45" r="3" fill="#FDE047" />
        <circle cx="360" cy="35" r="4" fill="#67E8F9" />
        <circle cx="130" cy="110" r="2.5" fill="#F472B6" />

        {/* ================= DESK & STACKED BOOKS ================= */}
        {/* Books on the left */}
        <g transform="translate(110, 240)" filter="url(#softShadow)">
          {/* Book 1 (Bottom - Green) */}
          <rect x="0" y="24" width="76" height="14" rx="3" fill="url(#bookCover1)" />
          <rect x="4" y="26" width="68" height="10" rx="1" fill="#F8FAFC" />
          <rect x="0" y="24" width="10" height="14" rx="2" fill="#047857" />

          {/* Book 2 (Middle - Orange) */}
          <rect x="8" y="10" width="66" height="14" rx="3" fill="url(#bookCover2)" />
          <rect x="12" y="12" width="58" height="10" rx="1" fill="#FEF3C7" />
          <rect x="8" y="10" width="9" height="14" rx="2" fill="#B45309" />

          {/* Book 3 (Top - Purple) */}
          <rect x="18" y="-2" width="52" height="12" rx="2.5" fill="#8B5CF6" />
          <rect x="22" y="0" width="44" height="8" rx="1" fill="#EDE9FE" />
          <rect x="18" y="-2" width="8" height="12" rx="2" fill="#6D28D9" />
        </g>

        {/* ================= BOY (LEFT CHARACTER) ================= */}
        <g transform="translate(150, 70)" filter="url(#softShadow)">
          {/* Body / Shirt */}
          <path d="M40 120 C25 120 18 135 15 170 L75 170 C72 135 65 120 40 120 Z" fill="url(#shirtBoy)" />
          {/* Red scarf (Khăn quàng đỏ) */}
          <path d="M35 125 L45 125 L48 145 L40 152 L32 145 Z" fill="url(#scarfRed)" />
          <circle cx="40" cy="128" r="3" fill="#991B1B" />

          {/* Neck */}
          <rect x="33" y="102" width="14" height="22" rx="5" fill="url(#skinGrad1)" />

          {/* Head */}
          <ellipse cx="40" cy="72" rx="30" ry="32" fill="url(#skinGrad1)" />

          {/* Ears */}
          <circle cx="10" cy="74" r="7" fill="url(#skinGrad1)" />
          <circle cx="70" cy="74" r="7" fill="url(#skinGrad1)" />

          {/* Hair */}
          <path
            d="M12 62 C12 30 25 15 40 15 C55 15 68 30 68 62 C68 66 65 72 63 70 C60 55 52 50 40 50 C28 50 20 55 17 70 C15 72 12 66 12 62 Z"
            fill="url(#hairBoy)"
          />
          {/* Hair spikes cute */}
          <path d="M30 18 Q40 5 46 16 Q52 8 58 20" fill="url(#hairBoy)" />

          {/* Cheerful Face */}
          {/* Eyebrows */}
          <path d="M24 58 Q30 54 36 57" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M44 57 Q50 54 56 58" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Happy Eyes (Curved arches) */}
          <path d="M25 68 Q30 63 35 68" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M45 68 Q50 63 55 68" stroke="#1E1B4B" strokeWidth="3" strokeLinecap="round" fill="none" />
          {/* Blush */}
          <circle cx="22" cy="76" r="5" fill="#FB7185" opacity="0.6" />
          <circle cx="58" cy="76" r="5" fill="#FB7185" opacity="0.6" />
          {/* Smile with open mouth */}
          <path d="M33 78 Q40 90 47 78 Z" fill="#DC2626" />
          <path d="M33 78 Q40 82 47 78" stroke="#1E1B4B" strokeWidth="2" fill="none" />

          {/* Arm holding laptop */}
          <path d="M16 140 Q30 160 50 162" stroke="url(#skinGrad1)" strokeWidth="12" strokeLinecap="round" fill="none" />
        </g>

        {/* ================= GIRL (RIGHT CHARACTER) ================= */}
        <g transform="translate(280, 65)" filter="url(#softShadow)">
          {/* Body / Shirt */}
          <path d="M45 125 C30 125 22 140 20 175 L80 175 C78 140 70 125 45 125 Z" fill="url(#shirtGirl)" />
          {/* Red scarf (Khăn quàng đỏ) */}
          <path d="M40 130 L50 130 L53 150 L45 157 L37 150 Z" fill="url(#scarfRed)" />
          <circle cx="45" cy="133" r="3" fill="#991B1B" />

          {/* Neck */}
          <rect x="38" y="107" width="14" height="22" rx="5" fill="url(#skinGrad2)" />

          {/* Head */}
          <ellipse cx="45" cy="75" rx="30" ry="33" fill="url(#skinGrad2)" />

          {/* Ears */}
          <circle cx="15" cy="77" r="7" fill="url(#skinGrad2)" />
          <circle cx="75" cy="77" r="7" fill="url(#skinGrad2)" />

          {/* Hair (Pigtails & bangs) */}
          {/* Left Pigtail */}
          <path d="M15 65 C-5 65 -10 95 -5 110 C2 115 15 105 15 85 Z" fill="url(#hairGirl)" />
          <ellipse cx="14" cy="70" rx="4" ry="4" fill="#F43F5E" />
          {/* Right Pigtail */}
          <path d="M75 65 C95 65 100 95 95 110 C88 115 75 105 75 85 Z" fill="url(#hairGirl)" />
          <ellipse cx="76" cy="70" rx="4" ry="4" fill="#F43F5E" />

          {/* Main Hair & Bangs */}
          <path
            d="M15 65 C15 32 28 15 45 15 C62 15 75 32 75 65 C75 70 70 65 65 60 C55 52 50 62 45 58 C40 62 35 52 25 60 C20 65 15 70 15 65 Z"
            fill="url(#hairGirl)"
          />

          {/* Cheerful Face */}
          {/* Eyebrows */}
          <path d="M28 61 Q35 57 41 60" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          <path d="M49 60 Q55 57 62 61" stroke="#1E1B4B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
          {/* Big Sparkly Eyes */}
          <ellipse cx="35" cy="71" rx="5" ry="6" fill="#1E1B4B" />
          <circle cx="34" cy="69" r="2" fill="#FFFFFF" />
          <ellipse cx="55" cy="71" rx="5" ry="6" fill="#1E1B4B" />
          <circle cx="54" cy="69" r="2" fill="#FFFFFF" />
          {/* Blush */}
          <circle cx="27" cy="80" r="5" fill="#FB7185" opacity="0.65" />
          <circle cx="63" cy="80" r="5" fill="#FB7185" opacity="0.65" />
          {/* Sweet Smile */}
          <path d="M39 80 Q45 90 51 80 Z" fill="#DC2626" />
          <path d="M39 80 Q45 84 51 80" stroke="#1E1B4B" strokeWidth="2" fill="none" />

          {/* Arm holding tablet */}
          <path d="M72 145 Q55 165 42 165" stroke="url(#skinGrad2)" strokeWidth="12" strokeLinecap="round" fill="none" />
        </g>

        {/* ================= LAPTOP (CENTER/BOY) ================= */}
        <g transform="translate(195, 195)" filter="url(#softShadow)">
          {/* Screen Top */}
          <rect x="0" y="0" width="85" height="56" rx="6" fill="url(#laptopBody)" />
          <rect x="4" y="4" width="77" height="48" rx="4" fill="url(#laptopScreen)" />
          {/* Screen Code/Quiz preview */}
          <rect x="10" y="10" width="30" height="5" rx="2.5" fill="#A5B4FC" />
          <rect x="10" y="20" width="65" height="4" rx="2" fill="#E0E7FF" opacity="0.8" />
          <rect x="10" y="28" width="55" height="4" rx="2" fill="#E0E7FF" opacity="0.8" />
          <circle cx="65" cy="40" r="6" fill="#10B981" />
          <path d="M63 40 L65 42 L68 38" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          {/* Base / Keyboard */}
          <path d="M-10 56 L95 56 L105 70 L-20 70 Z" fill="#CBD5E1" />
          <rect x="30" y="60" width="25" height="6" rx="2" fill="#94A3B8" />
        </g>

        {/* ================= TABLET (GIRL) ================= */}
        <g transform="translate(300, 190) rotate(-10)" filter="url(#softShadow)">
          <rect x="0" y="0" width="60" height="78" rx="8" fill="#1E293B" />
          <rect x="3" y="3" width="54" height="72" rx="6" fill="url(#tabletScreen)" />
          {/* Tablet Quiz App UI */}
          <rect x="8" y="10" width="44" height="8" rx="3" fill="#FFFFFF" opacity="0.9" />
          <circle cx="16" cy="28" r="4" fill="#FDE047" />
          <rect x="24" y="26" width="28" height="4" rx="2" fill="#FFFFFF" />
          <circle cx="16" cy="42" r="4" fill="#34D399" />
          <rect x="24" y="40" width="28" height="4" rx="2" fill="#FFFFFF" />
          <circle cx="16" cy="56" r="4" fill="#F472B6" />
          <rect x="24" y="54" width="28" height="4" rx="2" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
}
