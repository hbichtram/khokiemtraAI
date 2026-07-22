import React from "react";

interface FooterProps {
  className?: string;
}

export default function Footer({ className = "" }: FooterProps) {
  return (
    <footer className={`text-center py-6 text-slate-400 text-[11px] font-semibold space-y-1 ${className}`}>
      <p className="text-slate-600 font-extrabold text-xs">Tác giả: Hồng Bích Trâm</p>
      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">
        © 2026 AI SMART TEST • Hỗ trợ học tập thông minh
      </p>
    </footer>
  );
}
