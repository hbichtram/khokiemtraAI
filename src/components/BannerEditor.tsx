import React, { useState, useRef, useEffect, useCallback } from "react";
import { StudentBannerConfig } from "../types";
import StudentBanner from "./StudentBanner";
import { 
  DEFAULT_BANNER_CONFIG, 
  saveStudentBannerConfig, 
  getStudentBannerConfig 
} from "../lib/bannerStorage";
import { 
  X, Check, Lock, Unlock, RotateCcw, Eye, Save, 
  Sliders, Image as ImageIcon, Sparkles, Move, Maximize2,
  HelpCircle, Palette, CheckCircle2, Upload
} from "lucide-react";

interface BannerEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: (newConfig: StudentBannerConfig) => void;
  userId?: string;
}

type HandleType = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

export default function BannerEditor({
  isOpen,
  onClose,
  onSaved,
  userId = "teacher",
}: BannerEditorProps) {
  const [config, setConfig] = useState<StudentBannerConfig>(DEFAULT_BANNER_CONFIG);
  const [initialConfig, setInitialConfig] = useState<StudentBannerConfig>(DEFAULT_BANNER_CONFIG);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"size" | "content" | "image">("size");

  // Interaction / Resizing States
  const [isResizing, setIsResizing] = useState(false);
  const [activeHandle, setActiveHandle] = useState<HandleType | null>(null);
  const [dragDimensions, setDragDimensions] = useState<{ width: number; height: number } | null>(null);

  // Container references
  const containerRef = useRef<HTMLDivElement>(null);
  const bannerBoxRef = useRef<HTMLDivElement>(null);

  // Drag start tracker
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    aspectRatio: number;
    handle: HandleType;
  } | null>(null);

  // Load existing config on open
  useEffect(() => {
    if (isOpen) {
      getStudentBannerConfig().then((loaded) => {
        setConfig(loaded);
        setInitialConfig(loaded);
      });
      setIsPreviewMode(false);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  // Handle Resize MouseDown
  const handleResizeStart = (e: React.MouseEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();

    if (!bannerBoxRef.current || !containerRef.current) return;

    const rect = bannerBoxRef.current.getBoundingClientRect();
    const currentWidth = rect.width;
    const currentHeight = config.height || rect.height;
    const ratio = currentWidth / (currentHeight || 1);

    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: currentWidth,
      startHeight: currentHeight,
      aspectRatio: config.aspectRatioValue || ratio || 16 / 4.5,
      handle,
    };

    setIsResizing(true);
    setActiveHandle(handle);
    setDragDimensions({ width: Math.round(currentWidth), height: Math.round(currentHeight) });
  };

  // Global mousemove and mouseup listeners during resize
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current || !containerRef.current) return;

      const { startX, startY, startWidth, startHeight, aspectRatio, handle } = dragStartRef.current;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const containerWidth = containerRef.current.clientWidth || 1000;
      const minW = 320;
      const maxW = containerWidth;
      const minH = 110;
      const maxH = 420;

      let newWidth = startWidth;
      let newHeight = startHeight;

      // Handle corner and edge math
      switch (handle) {
        case "e":
          newWidth = startWidth + deltaX;
          if (config.aspectRatioLocked) {
            newHeight = newWidth / aspectRatio;
          }
          break;
        case "w":
          newWidth = startWidth - deltaX;
          if (config.aspectRatioLocked) {
            newHeight = newWidth / aspectRatio;
          }
          break;
        case "s":
          newHeight = startHeight + deltaY;
          if (config.aspectRatioLocked) {
            newWidth = newHeight * aspectRatio;
          }
          break;
        case "n":
          newHeight = startHeight - deltaY;
          if (config.aspectRatioLocked) {
            newWidth = newHeight * aspectRatio;
          }
          break;
        case "se":
          if (config.aspectRatioLocked) {
            // Pick larger delta
            const d = Math.max(deltaX, deltaY * aspectRatio);
            newWidth = startWidth + d;
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = startWidth + deltaX;
            newHeight = startHeight + deltaY;
          }
          break;
        case "sw":
          if (config.aspectRatioLocked) {
            const d = Math.max(-deltaX, deltaY * aspectRatio);
            newWidth = startWidth + d;
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = startWidth - deltaX;
            newHeight = startHeight + deltaY;
          }
          break;
        case "ne":
          if (config.aspectRatioLocked) {
            const d = Math.max(deltaX, -deltaY * aspectRatio);
            newWidth = startWidth + d;
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = startWidth + deltaX;
            newHeight = startHeight - deltaY;
          }
          break;
        case "nw":
          if (config.aspectRatioLocked) {
            const d = Math.max(-deltaX, -deltaY * aspectRatio);
            newWidth = startWidth + d;
            newHeight = newWidth / aspectRatio;
          } else {
            newWidth = startWidth - deltaX;
            newHeight = startHeight - deltaY;
          }
          break;
      }

      // Clamp dimensions within safe boundaries
      const clampedW = Math.max(minW, Math.min(newWidth, maxW));
      const clampedH = Math.max(minH, Math.min(newHeight, maxH));

      // Calculate width percentage relative to container
      const widthPct = Math.round((clampedW / containerWidth) * 100);

      setDragDimensions({ width: Math.round(clampedW), height: Math.round(clampedH) });
      setConfig((prev) => ({
        ...prev,
        height: Math.round(clampedH),
        widthPercent: Math.max(50, Math.min(widthPct, 100)),
        customWidthPx: Math.round(clampedW),
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setActiveHandle(null);
      setDragDimensions(null);
      dragStartRef.current = null;
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing, config.aspectRatioLocked]);

  // Reset to default dimensions
  const handleResetSize = () => {
    setConfig((prev) => ({
      ...prev,
      height: DEFAULT_BANNER_CONFIG.height,
      widthPercent: DEFAULT_BANNER_CONFIG.widthPercent,
      customWidthPx: DEFAULT_BANNER_CONFIG.customWidthPx,
      aspectRatioLocked: true,
      aspectRatioValue: DEFAULT_BANNER_CONFIG.aspectRatioValue,
    }));
  };

  // Toggle Aspect Ratio Lock
  const toggleAspectRatioLock = () => {
    setConfig((prev) => {
      const nextLocked = !prev.aspectRatioLocked;
      const currentRatio = (prev.customWidthPx || 960) / (prev.height || 210);
      return {
        ...prev,
        aspectRatioLocked: nextLocked,
        aspectRatioValue: nextLocked ? currentRatio : prev.aspectRatioValue,
      };
    });
  };

  // Custom Image Upload Handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Tệp ảnh quá lớn! Vui lòng chọn ảnh nhỏ hơn 8MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setConfig((prev) => ({ ...prev, imageUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  // Save changes
  const handleSave = async () => {
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      const success = await saveStudentBannerConfig(config, userId);
      if (success) {
        setSaveSuccess(true);
        if (onSaved) onSaved(config);
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Error saving banner:", err);
      alert("Không thể lưu cấu hình banner. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentW = config.customWidthPx || (containerRef.current ? containerRef.current.clientWidth : 960);
  const currentH = config.height || 210;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      
      {/* Modal Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-100">
        
        {/* HEADER & TOP TOOLBAR */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-600/30 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                Trình chỉnh sửa Banner Học Sinh
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Mouse Resize
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Kéo 8 điểm nút bằng chuột để chỉnh kích thước trực tiếp • Tự động hiển thị trên giao diện học sinh
              </p>
            </div>
          </div>

          {/* Close modal */}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            title="Đóng trình chỉnh sửa"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* EDITOR CONTROL BAR */}
        <div className="px-5 py-2.5 bg-slate-900 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Quick tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/70 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setActiveTab("size"); setIsPreviewMode(false); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "size" && !isPreviewMode
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>↔ Kích thước & Tỷ lệ</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("content"); setIsPreviewMode(false); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "content" && !isPreviewMode
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Nội dung & Màu sắc</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab("image"); setIsPreviewMode(false); }}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "image" && !isPreviewMode
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Ảnh tùy chỉnh</span>
            </button>
          </div>

          {/* Action buttons on toolbar */}
          <div className="flex items-center gap-2">
            {/* Aspect Ratio Lock Toggle */}
            <button
              type="button"
              onClick={toggleAspectRatioLock}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                config.aspectRatioLocked
                  ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                  : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800"
              }`}
              title={config.aspectRatioLocked ? "Đang khóa tỷ lệ khung hình" : "Đang mở khóa (resize tự do)"}
            >
              {config.aspectRatioLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              <span>{config.aspectRatioLocked ? "Đã khóa tỷ lệ" : "Tỷ lệ tự do"}</span>
            </button>

            {/* Reset size button */}
            <button
              type="button"
              onClick={handleResetSize}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Đặt lại kích thước chuẩn (210px)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Đặt lại</span>
            </button>

            {/* Preview Toggle */}
            <button
              type="button"
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`px-3 py-1.5 rounded-xl border font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                isPreviewMode
                  ? "bg-amber-400 text-slate-950 border-amber-300 shadow-xs"
                  : "bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{isPreviewMode ? "Thoát xem trước" : "Xem trước"}</span>
            </button>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer active:scale-95"
            >
              {saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Đã lưu!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{isSaving ? "Đang lưu..." : "Lưu banner"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* WORKSPACE & CANVAS AREA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070D18] flex flex-col items-center justify-center min-h-[360px] relative select-none">
          
          {/* Dimension Guide Bar above canvas */}
          <div className="mb-3 px-3 py-1 bg-slate-900/90 border border-slate-800 rounded-full text-[11px] font-mono font-bold text-slate-300 flex items-center gap-3 shadow-xs">
            <span>Chiều cao: <strong className="text-amber-400">{config.height}px</strong></span>
            <span className="text-slate-600">|</span>
            <span>Chiều rộng: <strong className="text-indigo-400">{config.widthPercent}%</strong></span>
            <span className="text-slate-600">|</span>
            <span>Khuyến nghị: <strong className="text-emerald-400">180 – 240px</strong></span>
          </div>

          {/* Interactive Container for Resizing */}
          <div
            ref={containerRef}
            className="w-full max-w-4xl relative flex items-center justify-center p-4 border border-dashed border-slate-800 rounded-3xl bg-slate-950/40"
          >
            {/* Real-time floating dimension badge during resize */}
            {isResizing && dragDimensions && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-30 px-3 py-1 rounded-md bg-indigo-600 text-white text-xs font-mono font-black shadow-xl animate-in zoom-in-90 pointer-events-none">
                {dragDimensions.width} × {dragDimensions.height} px
              </div>
            )}

            {/* Banner Box with Resize Border & Handles */}
            <div
              ref={bannerBoxRef}
              style={{
                width: `${config.widthPercent}%`,
                transition: isResizing ? "none" : "width 0.15s ease, height 0.15s ease",
              }}
              className={`relative ${
                isPreviewMode
                  ? ""
                  : "ring-2 ring-indigo-500 ring-offset-4 ring-offset-slate-950 rounded-2xl sm:rounded-3xl"
              }`}
            >
              {/* The Actual Banner */}
              <StudentBanner config={config} canEdit={false} />

              {/* 8 RESIZE HANDLES (Visible ONLY when NOT in Preview Mode) */}
              {!isPreviewMode && (
                <>
                  {/* Top-Left Handle (nw) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "nw")}
                    className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo góc trên-trái"
                  />

                  {/* Top-Center Handle (n) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "n")}
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-7 h-3.5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-ns-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo cạnh trên (chiều cao)"
                  />

                  {/* Top-Right Handle (ne) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "ne")}
                    className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo góc trên-phải"
                  />

                  {/* Mid-Left Handle (w) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "w")}
                    className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-3.5 h-7 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-ew-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo cạnh trái (chiều rộng)"
                  />

                  {/* Mid-Right Handle (e) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "e")}
                    className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-3.5 h-7 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-ew-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo cạnh phải (chiều rộng)"
                  />

                  {/* Bottom-Left Handle (sw) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "sw")}
                    className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-nesw-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo góc dưới-trái"
                  />

                  {/* Bottom-Center Handle (s) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "s")}
                    className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-7 h-3.5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-ns-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo cạnh dưới (chiều cao)"
                  />

                  {/* Bottom-Right Handle (se) */}
                  <div
                    onMouseDown={(e) => handleResizeStart(e, "se")}
                    className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-indigo-500 border-2 border-white rounded-full shadow-lg cursor-nwse-resize z-20 hover:scale-125 transition-transform"
                    title="Kéo góc dưới-phải"
                  />
                </>
              )}
            </div>
          </div>

          {/* Quick Guidance Text */}
          <div className="mt-3 text-center text-[11px] text-slate-500 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mẹo: Kéo nút ở các góc để thay đổi kích thước mượt mà. Nhấp <strong>"Xem trước"</strong> để xem như học sinh.</span>
          </div>
        </div>

        {/* BOTTOM CONFIGURATION DRAWER ACCORDION */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 text-xs">
          
          {/* TAB 1: SIZE SLIDERS */}
          {activeTab === "size" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Chiều cao banner (Height): <strong className="text-amber-400">{config.height} px</strong>
                </label>
                <input
                  type="range"
                  min={110}
                  max={400}
                  step={5}
                  value={config.height}
                  onChange={(e) => setConfig((p) => ({ ...p, height: Number(e.target.value) }))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">
                  Chiều rộng (% container): <strong className="text-indigo-400">{config.widthPercent}%</strong>
                </label>
                <input
                  type="range"
                  min={50}
                  max={100}
                  step={1}
                  value={config.widthPercent}
                  onChange={(e) => setConfig((p) => ({ ...p, widthPercent: Number(e.target.value) }))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, height: 180 }))}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
                >
                  Nhỏ (180px)
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, height: 210 }))}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
                >
                  Chuẩn (210px)
                </button>
                <button
                  type="button"
                  onClick={() => setConfig((p) => ({ ...p, height: 260 }))}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-slate-300 font-semibold cursor-pointer"
                >
                  Lớn (260px)
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CONTENT & THEME PALETTE */}
          {activeTab === "content" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Tiêu đề chính</label>
                <input
                  type="text"
                  value={config.title || ""}
                  onChange={(e) => setConfig((p) => ({ ...p, title: e.target.value }))}
                  placeholder="HỌC VUI – CHƠI HAY"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Slogan thông điệp</label>
                <input
                  type="text"
                  value={config.subtitle || ""}
                  onChange={(e) => setConfig((p) => ({ ...p, subtitle: e.target.value }))}
                  placeholder="Học tập thông minh – Tiến bộ mỗi ngày"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Màu sắc chủ đạo</label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, themeStyle: "brand-gradient" }))}
                    className={`h-8 rounded-lg bg-gradient-to-r from-[#312E81] via-[#4338CA] to-[#6366F1] border ${
                      config.themeStyle === "brand-gradient" ? "ring-2 ring-white" : "border-slate-700"
                    }`}
                    title="Tím thương hiệu"
                  />
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, themeStyle: "playful-indigo" }))}
                    className={`h-8 rounded-lg bg-gradient-to-r from-[#4338CA] to-[#8B5CF6] border ${
                      config.themeStyle === "playful-indigo" ? "ring-2 ring-white" : "border-slate-700"
                    }`}
                    title="Xanh Tím Hiện Đại"
                  />
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, themeStyle: "sunshine-gold" }))}
                    className={`h-8 rounded-lg bg-gradient-to-r from-[#D97706] to-[#FBBF24] border ${
                      config.themeStyle === "sunshine-gold" ? "ring-2 ring-white" : "border-slate-700"
                    }`}
                    title="Vàng Ánh Dương"
                  />
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, themeStyle: "emerald-fresh" }))}
                    className={`h-8 rounded-lg bg-gradient-to-r from-[#059669] to-[#34D399] border ${
                      config.themeStyle === "emerald-fresh" ? "ring-2 ring-white" : "border-slate-700"
                    }`}
                    title="Xanh Ngọc Năng Động"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CUSTOM IMAGE UPLOAD */}
          {activeTab === "image" && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">Sử dụng hình ảnh riêng hoặc Ảnh mặc định 3D</span>
                <p className="text-[11px] text-slate-400">
                  Hệ thống mặc định sử dụng hình ảnh minh họa 3D vector vui nhộn, sắc nét. Bạn cũng có thể tải ảnh banner riêng lên.
                </p>
              </div>

              <div className="flex items-center gap-3">
                {config.imageUrl && (
                  <button
                    type="button"
                    onClick={() => setConfig((p) => ({ ...p, imageUrl: "" }))}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold hover:bg-rose-500/30 transition-colors"
                  >
                    Xóa ảnh tùy chỉnh (Dùng 3D mặc định)
                  </button>
                )}

                <label className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer flex items-center gap-2 shadow-sm transition-all active:scale-95">
                  <Upload className="w-4 h-4" />
                  <span>Tải ảnh banner lên</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
