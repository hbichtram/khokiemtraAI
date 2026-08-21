import React, { useState, useEffect, useRef } from "react";
import { User } from "../types";
import { 
  User as UserIcon, Lock, Settings, LogOut, X, 
  Check, Edit3, Save, ShieldCheck, Mail, Phone, 
  Building, BookOpen, Key, AlertCircle, RefreshCw, Sparkles, UserCheck,
  Camera, Upload, Trash2, Image as ImageIcon
} from "lucide-react";
import BannerEditor from "./BannerEditor";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { updatePassword } from "firebase/auth";
import { auth, db as firestoreDb } from "../firebase";
import { uploadImageFile, uploadAvatarFile } from "../lib/imageStorage";

interface TeacherSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "profile" | "security" | "settings";
  user: User;
  onUpdateUser: (updatedUser: User) => void;
  onLogout: () => void;
}

export default function TeacherSettingsModal({
  isOpen,
  onClose,
  initialTab = "profile",
  user,
  onUpdateUser,
  onLogout
}: TeacherSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "settings">(initialTab);

  // Profile Form States
  const [fullName, setFullName] = useState(user.name || "");
  const [phone, setPhone] = useState("");
  const [school, setSchool] = useState("");
  const [department, setDepartment] = useState("");
  const [subject, setSubject] = useState("");
  const [photoURL, setPhotoURL] = useState(user.photoURL || "");

  // Avatar upload states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Computed effective avatar URL for real-time preview
  const displayAvatarURL = previewURL || photoURL;

  // Security Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secLoading, setSecLoading] = useState(false);
  const [secSuccess, setSecSuccess] = useState<string | null>(null);
  const [secError, setSecError] = useState<string | null>(null);

  // App Settings States
  const [notifySubmissions, setNotifySubmissions] = useState(true);
  const [autoRefreshStats, setAutoRefreshStats] = useState(true);
  const [appTheme, setAppTheme] = useState("light");
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [isBannerEditorOpen, setIsBannerEditorOpen] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (isOpen && user.id) {
      fetchTeacherProfile();
    }
  }, [isOpen, user.id]);

  const fetchTeacherProfile = async () => {
    setLoading(true);
    setProfileError(null);
    setSelectedFile(null);
    setPreviewURL(null);
    try {
      const docRef = doc(firestoreDb, "teachers", user.id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setFullName(data.fullName || data.name || user.name || "Giáo viên");
        setPhone(data.phone || "");
        setSchool(data.school || "Trường Tiểu học CTST");
        setDepartment(data.department || "Tổ Tin học - Công nghệ");
        setSubject(data.subject || "Tin học");
        setPhotoURL(data.photoURL || user.photoURL || "");
      } else {
        setFullName(user.name || "Giáo viên");
        setPhone("");
        setSchool("Trường Tiểu học CTST");
        setDepartment("Tổ Tin học - Công nghệ");
        setSubject("Tin học");
        setPhotoURL(user.photoURL || "");
      }
    } catch (err) {
      console.error("Error fetching teacher profile:", err);
      setProfileError("Không thể tải thông tin tài khoản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileError(null);
    setProfileSuccess(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file formats: .jpg, .jpeg, .png, .webp
    const validMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const validExtensions = ["jpg", "jpeg", "png", "webp"];

    if (!validMimeTypes.includes(file.type.toLowerCase()) && !validExtensions.includes(extension)) {
      setProfileError("Định dạng tệp không hợp lệ! Hệ thống chỉ hỗ trợ các tệp ảnh định dạng .jpg, .jpeg, .png hoặc .webp");
      setSelectedFile(null);
      setPreviewURL(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Max 10MB check
    if (file.size > 10 * 1024 * 1024) {
      setProfileError("Dung lượng tệp quá lớn! Vui lòng chọn ảnh nhỏ hơn 10MB.");
      setSelectedFile(null);
      setPreviewURL(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setSelectedFile(file);
    const localPreview = URL.createObjectURL(file);
    setPreviewURL(localPreview);
  };

  const handleCancelSelectedFile = () => {
    setSelectedFile(null);
    setPreviewURL(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    setProfileError(null);
    setProfileSuccess(null);

    const cleanName = fullName.trim();
    if (!cleanName) {
      setProfileError("Họ và tên giáo viên không được để trống.");
      return;
    }

    setSaving(true);
    try {
      let finalPhotoURL = photoURL;

      // 1. Upload new avatar image only if selected by user
      if (selectedFile) {
        try {
          finalPhotoURL = await uploadAvatarFile(selectedFile);
        } catch (uploadErr: any) {
          console.error("Upload avatar error:", uploadErr);
          setProfileError(uploadErr?.message || "Không thể tải ảnh đại diện lên. Vui lòng kiểm tra lại.");
          setSaving(false);
          return;
        }
      }

      // 2. Save profile to Firestore
      const uid = user.id;
      const teacherDocRef = doc(firestoreDb, "teachers", uid);
      const updateData = {
        uid: uid,
        email: user.email || auth.currentUser?.email || "",
        fullName: cleanName,
        name: cleanName,
        phone: phone.trim(),
        school: school.trim(),
        department: department.trim(),
        subject: subject.trim(),
        photoURL: finalPhotoURL.trim(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(teacherDocRef, updateData, { merge: true });

      // 3. Sync user state instantly across parent dashboard & local storage
      const updatedUser: User = {
        ...user,
        name: cleanName,
        photoURL: finalPhotoURL.trim()
      };
      onUpdateUser(updatedUser);

      setPhotoURL(finalPhotoURL.trim());
      setSelectedFile(null);
      setPreviewURL(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      setProfileSuccess("Đã cập nhật thông tin tài khoản và ảnh đại diện thành công.");
      setIsEditing(false);
    } catch (err) {
      console.error("Save profile error:", err);
      setProfileError("Không thể cập nhật thông tin. Vui lòng thử lại.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecError(null);
    setSecSuccess(null);

    if (!newPassword) {
      setSecError("Vui lòng nhập mật khẩu mới.");
      return;
    }
    if (newPassword.length < 6) {
      setSecError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setSecLoading(true);
    try {
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, newPassword);
        setSecSuccess("Cập nhật mật khẩu thành công!");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setSecError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
      }
    } catch (err: any) {
      console.error("Change password error:", err);
      if (err?.code === "auth/requires-recent-login") {
        setSecError("Vui lòng đăng nhập lại để thực hiện thao tác bảo mật này.");
      } else if (err?.code === "auth/weak-password") {
        setSecError("Mật khẩu quá yếu. Vui lòng nhập mật khẩu có ít nhất 6 ký tự.");
      } else {
        setSecError("Không thể đổi mật khẩu. Vui lòng kiểm tra lại thông tin.");
      }
    } finally {
      setSecLoading(false);
    }
  };

  const handleSaveAppSettings = () => {
    setSettingsSuccess("Đã lưu cài đặt ứng dụng thành công!");
    setTimeout(() => setSettingsSuccess(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white border border-slate-100 rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* MODAL NAVIGATION SIDEBAR */}
        <div className="w-full md:w-64 bg-slate-950 text-slate-200 p-6 flex flex-col justify-between shrink-0 border-r border-slate-900">
          <div>
            {/* Header info */}
            <div className="flex items-center gap-3 mb-8">
              <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-md shadow-indigo-500/20">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-white text-base leading-tight">Cài đặt tài khoản</h3>
                <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest block">HỌC VUI – CHƠI HAY</span>
              </div>
            </div>

            {/* Profile Brief Badge */}
            <div className="bg-slate-900 p-3.5 rounded-2xl mb-6 flex items-center gap-3 border border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 text-white font-black text-sm flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                {displayAvatarURL ? (
                  <img src={displayAvatarURL} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0).toUpperCase() || "G"
                )}
              </div>
              <div className="overflow-hidden">
                <h4 className="font-bold text-xs text-white truncate">{fullName || "Giáo viên"}</h4>
                <span className="text-[10px] text-slate-400 block truncate mt-0.5">{user.email || "tram.ai.ctst@gmail.com"}</span>
              </div>
            </div>

            {/* Nav List */}
            <nav className="space-y-1.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => { setActiveTab("profile"); setProfileError(null); setProfileSuccess(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
                  activeTab === "profile"
                    ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <UserIcon className="w-4 h-4 shrink-0" />
                Thông tin giáo viên
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab("security"); setSecError(null); setSecSuccess(null); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
                  activeTab === "security"
                    ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Lock className="w-4 h-4 shrink-0" />
                Bảo mật tài khoản
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-indigo-600 text-white font-black shadow-lg shadow-indigo-600/30"
                    : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                }`}
              >
                <Settings className="w-4 h-4 shrink-0" />
                Cài đặt ứng dụng
              </button>
            </nav>
          </div>

          <div className="pt-6 border-t border-slate-900 space-y-2">
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all cursor-pointer text-xs font-bold border border-transparent hover:border-rose-500/20"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* MODAL MAIN CONTENT */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col justify-between relative bg-white">
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-all cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-3 my-auto">
              <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
              <span className="text-xs font-bold text-slate-500">Đang tải hồ sơ giáo viên từ hệ thống...</span>
            </div>
          ) : (
            <div>
              {/* TAB 1: TEACHER PROFILE */}
              {activeTab === "profile" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between pr-8 border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                        👤 Thông tin giáo viên
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Quản lý hồ sơ công tác và thông tin hiển thị trên HỌC VUI – CHƠI HAY
                      </p>
                    </div>
                    {!isEditing && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-2xl transition-all cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Chỉnh sửa
                      </button>
                    )}
                  </div>

                  {profileSuccess && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800 text-xs font-bold">{profileSuccess}</span>
                    </div>
                  )}

                  {profileError && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-rose-800 text-xs font-bold">{profileError}</span>
                    </div>
                  )}

                  {/* Profile Cards Display / Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-5">
                    {/* Avatar Upload / Preview Section */}
                    <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-black text-xl flex items-center justify-center shrink-0 shadow-md overflow-hidden relative group">
                            {displayAvatarURL ? (
                              <img src={displayAvatarURL} alt={fullName} className="w-full h-full object-cover" />
                            ) : (
                              fullName.charAt(0).toUpperCase() || "G"
                            )}
                          </div>

                          <div className="space-y-1.5 flex-1">
                            <span className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wider block">
                              Ảnh đại diện giáo viên
                            </span>

                            {isEditing ? (
                              <div className="space-y-2">
                                {/* Hidden native file input */}
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                                  onChange={handleAvatarFileSelect}
                                  className="hidden"
                                />

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                                  >
                                    📷 Tải ảnh đại diện lên
                                  </button>

                                  {selectedFile && (
                                    <button
                                      type="button"
                                      onClick={handleCancelSelectedFile}
                                      className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      Hủy chọn
                                    </button>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-600 font-medium">
                                Thầy/cô bấm nút "Chỉnh sửa" để chọn và tải ảnh đại diện từ thiết bị lên.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Selected file confirmation / format note */}
                      {isEditing && (
                        <div>
                          {selectedFile ? (
                            <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs font-bold text-emerald-800">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span className="truncate">Tệp đã chọn: <strong>{selectedFile.name}</strong></span>
                              </div>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md shrink-0">Chưa lưu</span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 font-medium">
                              Chỉ hỗ trợ tệp hình ảnh định dạng: <strong className="text-slate-600">.jpg, .jpeg, .png, .webp</strong> (Dung lượng tối đa 10MB)
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Information Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Full Name */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Họ và tên giáo viên <span className="text-rose-500">*</span>
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl px-3.5 py-2.5 text-xs font-black text-slate-800 flex items-center gap-2">
                            <UserCheck className="w-4 h-4 text-indigo-600" />
                            {fullName || "Giáo viên"}
                          </div>
                        )}
                      </div>

                      {/* Email (Read only) */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Email đăng nhập (Cố định)
                        </label>
                        <div className="bg-slate-100 border border-slate-200/60 rounded-2xl px-3.5 py-2.5 text-xs font-medium text-slate-500 flex items-center gap-2 cursor-not-allowed">
                          <Mail className="w-4 h-4 text-slate-400" />
                          {user.email || auth.currentUser?.email || "tram.ai.ctst@gmail.com"}
                        </div>
                      </div>

                      {/* School */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Trường công tác
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            placeholder="Nhập tên trường công tác"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <Building className="w-4 h-4 text-indigo-600" />
                            {school || "Trường Tiểu học CTST"}
                          </div>
                        )}
                      </div>

                      {/* Department */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tổ / Khối chuyên môn
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="Nhập tổ chuyên môn"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            {department || "Tổ Tin học - Công nghệ"}
                          </div>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Môn giảng dạy
                        </label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Môn học (VD: Tin học, Công nghệ...)"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-indigo-600" />
                            {subject || "Tin học"}
                          </div>
                        )}
                      </div>

                      {/* Phone */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Số điện thoại liên hệ
                        </label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="Số điện thoại"
                            className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        ) : (
                          <div className="bg-slate-50 border border-slate-100/80 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-700 flex items-center gap-2">
                            <Phone className="w-4 h-4 text-indigo-600" />
                            {phone || "Chưa cập nhật"}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* UID Readonly Info */}
                    <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-3 text-[11px] text-indigo-950 font-medium flex items-center justify-between">
                      <span className="font-bold text-indigo-900">Mã định danh Firebase UID:</span>
                      <span className="font-mono text-[10px] bg-white px-2 py-0.5 rounded-lg border border-indigo-100 text-indigo-700 font-bold select-all">
                        {user.id}
                      </span>
                    </div>

                    {/* Form Action Controls */}
                    {isEditing && (
                      <div className="flex items-center justify-end gap-3 pt-3">
                        <button
                          type="button"
                          onClick={() => { setIsEditing(false); setProfileError(null); }}
                          className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl text-xs transition-all cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="submit"
                          disabled={saving}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 flex items-center gap-2 cursor-pointer disabled:bg-indigo-400 transition-all"
                        >
                          {saving ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Đang tải ảnh &amp; lưu...</span>
                            </>
                          ) : (
                            <>
                              <Save className="w-3.5 h-3.5" />
                              Lưu thay đổi
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </form>
                </div>
              )}

              {/* TAB 2: ACCOUNT SECURITY */}
              {activeTab === "security" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 pr-8">
                      🔒 Bảo mật tài khoản
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Đổi mật khẩu và quản lý cấu hình xác thực Firebase Authentication
                    </p>
                  </div>

                  {secSuccess && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800 text-xs font-bold">{secSuccess}</span>
                    </div>
                  )}

                  {secError && (
                    <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span className="text-rose-800 text-xs font-bold">{secError}</span>
                    </div>
                  )}

                  {/* Account Status Badge */}
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trạng thái xác thực</span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-xl">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Đang hoạt động (Firebase Auth)
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>• Email đăng nhập: <strong>{user.email || auth.currentUser?.email}</strong></p>
                      <p>• Phương thức xác thực: <strong>Email / Password</strong></p>
                    </div>
                  </div>

                  {/* Change Password Form */}
                  <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <Key className="w-4 h-4 text-indigo-600" />
                      Đổi mật khẩu tài khoản
                    </h4>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Mật khẩu mới</label>
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600">Xác nhận mật khẩu mới</label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Nhập lại mật khẩu mới"
                        className="w-full bg-slate-50 border border-slate-200 focus:bg-white rounded-2xl px-3.5 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={secLoading}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-200 transition-all"
                    >
                      {secLoading ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Key className="w-4 h-4" />
                          Cập nhật mật khẩu mới
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: APP SETTINGS */}
              {activeTab === "settings" && (
                <div className="space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2 pr-8">
                      ⚙️ Cài đặt ứng dụng
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Tùy chỉnh thông báo, hiển thị và trải nghiệm HỌC VUI – CHƠI HAY
                    </p>
                  </div>

                  {settingsSuccess && (
                    <div className="bg-emerald-50 border-l-4 border-emerald-500 p-4 rounded-2xl flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-800 text-xs font-bold">{settingsSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Toggle Notifications */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Thông báo bài nộp mới</h4>
                        <p className="text-[11px] text-slate-500">Hiển thị thông báo khi học sinh nộp bài thi thành công</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifySubmissions}
                        onChange={(e) => setNotifySubmissions(e.target.checked)}
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Toggle Auto Refresh */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Tự động đồng bộ số liệu</h4>
                        <p className="text-[11px] text-slate-500">Tự động cập nhật bảng điều khiển theo thời gian thực</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoRefreshStats}
                        onChange={(e) => setAutoRefreshStats(e.target.checked)}
                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                      />
                    </div>

                    {/* Banner Customization */}
                    <div className="bg-gradient-to-r from-indigo-50/70 to-purple-50/70 border border-indigo-100 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-black text-xs text-indigo-900 flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 text-indigo-600" />
                          Banner Giao diện Học sinh (Interactive Resize)
                        </h4>
                        <p className="text-[11px] text-indigo-700/80 mt-0.5">
                          Tùy chỉnh kích thước bằng kéo chuột, đổi slogan và hình ảnh chào mừng học sinh
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsBannerEditorOpen(true)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap active:scale-95 shrink-0"
                      >
                        Mở trình chỉnh sửa banner
                      </button>
                    </div>

                    {/* Language Preference */}
                    <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-xs text-slate-800">Ngôn ngữ hiển thị</h4>
                        <p className="text-[11px] text-slate-500">Ngôn ngữ giao diện ứng dụng</p>
                      </div>
                      <span className="bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                        🇻🇳 Tiếng Việt
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleSaveAppSettings}
                      className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-indigo-200 transition-all cursor-pointer mt-4"
                    >
                      Lưu cài đặt ứng dụng
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BANNER EDITOR SUB-MODAL */}
      <BannerEditor
        isOpen={isBannerEditorOpen}
        onClose={() => setIsBannerEditorOpen(false)}
        userId={user.id}
      />
    </div>
  );
}
