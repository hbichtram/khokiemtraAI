import React, { useState, useEffect } from "react";
import { User } from "./types";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import { 
  Sparkles, GraduationCap, Users,
  ArrowRight, AlertCircle, RefreshCw, Smile,
  Loader2
} from "lucide-react";
import { 
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged, 
  signOut
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs,
  query,
  where 
} from "firebase/firestore";
import { auth, db as firestoreDb } from "./firebase";
import { DEFAULT_SEED_DATA } from "./lib/firestoreData";

function GoogleIcon({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
      />
    </svg>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginRole, setLoginRole] = useState<"teacher" | "student">("teacher");
  
  // Student Login State
  const [studentCode, setStudentCode] = useState("");
  const [classesList, setClassesList] = useState<any[]>([]);

  const [appLoading, setAppLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch classes list to dynamically render student login code suggestions & placeholders
    const fetchClasses = async () => {
      try {
        const appDataSnap = await getDoc(doc(firestoreDb, "appData", "main"));
        if (appDataSnap.exists() && appDataSnap.data()?.classes) {
          setClassesList(appDataSnap.data().classes);
        }
      } catch (err) {
        console.warn("Notice fetching classes list for hints:", err);
      }
    };
    fetchClasses();
  }, []);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        let name = fbUser.displayName || "Giáo viên";
        let userEmail = fbUser.email || "";
        let teacherPhotoURL = fbUser.photoURL || undefined;

        try {
          // Attempt to fetch teacher profile in Firestore (Collection: teachers, Document ID: UID)
          const teacherDocRef = doc(firestoreDb, "teachers", fbUser.uid);
          const docSnap = await getDoc(teacherDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.fullName || data.name) {
              name = data.fullName || data.name;
            }
            if (data.photoURL) {
              teacherPhotoURL = data.photoURL;
            }
          } else {
            // Auto-provision teacher doc in Firestore if it doesn't exist yet
            try {
              await setDoc(teacherDocRef, {
                uid: fbUser.uid,
                fullName: name,
                name: name,
                email: userEmail,
                photoURL: teacherPhotoURL || "",
                school: "Trường Tiểu học CTST",
                department: "Tổ Tin học - Công nghệ",
                subject: "Tin học",
                role: "teacher",
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } catch (saveErr) {
              console.warn("Unable to save teacher doc to Firestore:", saveErr);
            }
          }
        } catch (e) {
          console.warn("Auth state sync Firestore error (continuing with auth user):", e);
        }

        const teacherData: User = {
          id: fbUser.uid,
          name: name,
          email: userEmail,
          photoURL: teacherPhotoURL,
          role: "teacher"
        };

        setUser(teacherData);
        localStorage.setItem("ai_smart_test_user", JSON.stringify(teacherData));
      } else {
        // If not authenticated via Firebase Auth, check if student session exists in localStorage
        const savedUser = localStorage.getItem("ai_smart_test_user");
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            if (parsedUser.role === "student") {
              setUser(parsedUser);
            } else {
              setUser(null);
            }
          } catch (e) {
            console.error("Stale user session found:", e);
            localStorage.removeItem("ai_smart_test_user");
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setAppLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleTeacherGoogleLogin = async () => {
    setLoginLoading(true);
    setError(null);

    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({
        prompt: "select_account"
      });

      const result = await signInWithPopup(auth, googleProvider);
      const fbUser = result.user;

      if (!fbUser) {
        throw new Error("Không nhận được thông tin tài khoản Google.");
      }

      let teacherName = fbUser.displayName || "Giáo viên";
      let teacherPhotoURL = fbUser.photoURL || undefined;
      const teacherEmail = fbUser.email || "";

      // Check teachers/{UID} in Firestore
      try {
        const teacherDocRef = doc(firestoreDb, "teachers", fbUser.uid);
        const docSnap = await getDoc(teacherDocRef);

        if (docSnap.exists()) {
          const teacherInfo = docSnap.data();
          teacherName = teacherInfo.fullName || teacherInfo.name || teacherName;
          if (teacherInfo.photoURL) {
            teacherPhotoURL = teacherInfo.photoURL;
          }
        } else {
          await setDoc(teacherDocRef, {
            uid: fbUser.uid,
            fullName: teacherName,
            name: teacherName,
            email: teacherEmail,
            photoURL: teacherPhotoURL || "",
            school: "Trường Tiểu học CTST",
            department: "Tổ Tin học - Công nghệ",
            subject: "Tin học",
            role: "teacher",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Firestore teacher profile fetch/create notice:", fsErr);
      }

      const teacherUser: User = {
        id: fbUser.uid,
        name: teacherName,
        email: teacherEmail,
        photoURL: teacherPhotoURL,
        role: "teacher"
      };

      setUser(teacherUser);
      localStorage.setItem("ai_smart_test_user", JSON.stringify(teacherUser));
    } catch (err: any) {
      console.error("Google Auth error:", err?.code, err?.message);
      const errorCode = err?.code || "";

      switch (errorCode) {
        case "auth/popup-closed-by-user":
          setError("Bạn đã đóng cửa sổ đăng nhập Google.");
          break;
        case "auth/popup-blocked":
          setError("Trình duyệt đang chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup rồi thử lại.");
          break;
        case "auth/cancelled-popup-request":
          break;
        case "auth/account-exists-with-different-credential":
          setError("Tài khoản đã tồn tại với phương thức đăng nhập khác. Vui lòng liên hệ quản trị viên.");
          break;
        case "auth/network-request-failed":
          setError("Không thể kết nối đến Google. Vui lòng kiểm tra mạng và thử lại.");
          break;
        case "auth/unauthorized-domain":
          setError("Tên miền này chưa được thêm vào Authorized Domains trong Firebase Console.");
          break;
        default:
          setError(err?.message || "Đăng nhập Google chưa thành công. Vui lòng thử lại sau.");
          break;
      }
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = studentCode.trim().toUpperCase();
    if (!cleanCode) {
      setError("Vui lòng nhập Mã học sinh.");
      return;
    }

    setLoginLoading(true);
    setError(null);

    try {
      let foundStudent: any = null;
      let isInactive = false;

      // 1. Check studentCodes collection in Firestore
      try {
        const studentCodesRef = collection(firestoreDb, "studentCodes");
        const q = query(studentCodesRef, where("code", "==", cleanCode));
        const qSnap = await getDocs(q);

        if (!qSnap.empty) {
          const docData: any = qSnap.docs[0].data();
          if (docData.isActive === false || docData.active === false || docData.status === "inactive") {
            isInactive = true;
          } else {
            foundStudent = {
              id: qSnap.docs[0].id || docData.id || `student-${cleanCode}`,
              name: docData.name || docData.studentName || `Học sinh ${cleanCode}`,
              studentCode: cleanCode,
              role: "student",
              classId: docData.classId || "class-1",
              className: docData.className || "Lớp học"
            };
          }
        } else {
          // Also check by document ID in studentCodes
          const docRef = doc(firestoreDb, "studentCodes", cleanCode);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const docData: any = docSnap.data();
            if (docData.isActive === false || docData.active === false || docData.status === "inactive") {
              isInactive = true;
            } else {
              foundStudent = {
                id: docSnap.id,
                name: docData.name || docData.studentName || `Học sinh ${cleanCode}`,
                studentCode: cleanCode,
                role: "student",
                classId: docData.classId || "class-1",
                className: docData.className || "Lớp học"
              };
            }
          }
        }
      } catch (err) {
        console.warn("Notice checking studentCodes collection:", err);
      }

      // 2. If not found in studentCodes collection, search in appData/main classes
      if (!foundStudent && !isInactive) {
        const appDataSnap = await getDoc(doc(firestoreDb, "appData", "main"));
        if (appDataSnap.exists()) {
          const appData = appDataSnap.data();
          const classes = appData.classes || [];

          for (const cls of classes) {
            const classCode = (cls.classCode || "").trim().toUpperCase();
            const std = cls.students?.find((s: any, idx: number) => {
              if (!s.studentCode) return false;
              const sCode = s.studentCode.trim().toUpperCase();
              if (sCode === cleanCode) return true;

              // Generated format rule: HS + classCode + STT (e.g., HSTH5C7701)
              const genCode = `HS${classCode}${(idx + 1).toString().padStart(2, "0")}`;
              if (genCode === cleanCode) return true;

              // Loose match for legacy or short codes (e.g., HS5C01 vs HSTH5C7701)
              if (classCode && (sCode.replace(classCode, "") === cleanCode || cleanCode.replace(classCode, "") === sCode)) {
                return true;
              }

              return false;
            });
            if (std) {
              if (std.isActive === false || std.active === false || std.status === "inactive") {
                isInactive = true;
              } else {
                foundStudent = {
                  id: std.id,
                  name: std.name,
                  studentCode: std.studentCode || cleanCode,
                  role: "student",
                  classId: cls.id,
                  className: cls.name
                };
              }
              break;
            }
          }
        }
      }

      if (isInactive) {
        setError("Tài khoản hoặc mã học sinh này hiện chưa được kích hoạt. Vui lòng liên hệ giáo viên chủ nhiệm.");
        return;
      }

      if (!foundStudent) {
        setError("Mã học sinh chưa chính xác hoặc không tồn tại trong hệ thống. Vui lòng kiểm tra lại mã được thầy/cô cung cấp.");
        return;
      }

      setUser(foundStudent);
      localStorage.setItem("ai_smart_test_user", JSON.stringify(foundStudent));
    } catch (err: any) {
      console.error("Student login error:", err);
      setError("Không thể kết nối đến hệ thống. Vui lòng thử lại sau.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Sign out error:", e);
    }
    setUser(null);
    localStorage.removeItem("ai_smart_test_user");
    setStudentCode("");
    setError(null);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("ai_smart_test_user", JSON.stringify(updatedUser));
  };

  if (appLoading) {
    return (
      <div id="app-loading-container" className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 mb-3" />
        <h2 className="font-extrabold text-slate-700 text-lg">Đang khởi động HỌC VUI – CHƠI HAY...</h2>
        <p className="text-slate-400 text-xs mt-1">Đợi một chút để đồng bộ hệ thống đề thông minh nhé!</p>
      </div>
    );
  }

  // Route to designated dashboard if logged in
  if (user) {
    if (user.role === "teacher") {
      return <TeacherDashboard user={user} onLogout={handleLogout} onUpdateUser={handleUpdateUser} />;
    } else {
      return <StudentDashboard user={user} onLogout={handleLogout} />;
    }
  }

  return (
    <div
      id="login-portal-root"
      className="h-[100dvh] min-h-[100dvh] max-h-[100dvh] bg-[#F4F7FB] flex flex-col items-center justify-center p-3 sm:p-4 selection:bg-indigo-100 selection:text-indigo-900 relative overflow-y-auto sm:overflow-hidden"
    >
      {/* Subtle ambient light accents in background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-24 -left-24 w-72 h-72 sm:w-96 sm:h-96 bg-indigo-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 sm:w-96 sm:h-96 bg-blue-200/30 rounded-full blur-3xl" />
      </div>

      {/* Main Login Card - Compact & Balanced */}
      <div className="relative z-10 w-full max-w-[420px] bg-white border border-slate-200/90 rounded-[24px] sm:rounded-[28px] px-6 py-5 sm:px-7 sm:py-6 shadow-[0_10px_35px_rgba(15,23,42,0.05)] space-y-3.5 sm:space-y-4 transition-all duration-300">
        
        {/* LOGO & BRANDING */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white rounded-xl sm:rounded-2xl shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-[22px] font-black tracking-tight text-slate-900 leading-tight">
              HỌC VUI – CHƠI HAY
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-semibold mt-0.5">
              Học tập thông minh • Tiến bộ mỗi ngày
            </p>
          </div>
        </div>

        {/* ROLE SELECTOR TOGGLE (Segmented Control) */}
        <div className="bg-slate-100/90 border border-slate-200/70 p-1 rounded-xl sm:rounded-2xl flex text-xs sm:text-[13px] font-bold">
          <button
            id="toggle-login-teacher"
            type="button"
            onClick={() => { setLoginRole("teacher"); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-lg sm:rounded-xl cursor-pointer text-center transition-all duration-200 flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "teacher"
                ? "bg-white text-indigo-950 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0 text-indigo-600" />
            <span>Giáo viên</span>
          </button>
          <button
            id="toggle-login-student"
            type="button"
            onClick={() => { setLoginRole("student"); setError(null); }}
            className={`flex-1 py-2 px-3 rounded-lg sm:rounded-xl cursor-pointer text-center transition-all duration-200 flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "student"
                ? "bg-white text-slate-900 shadow-xs border border-slate-200/60"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smile className="w-4 h-4 shrink-0 text-amber-500" />
            <span>Học sinh</span>
          </button>
        </div>

        {/* ERROR DISPLAYER */}
        {error && (
          <div className="bg-rose-50/90 border border-rose-200/90 p-2.5 sm:p-3 rounded-xl sm:rounded-2xl flex items-start gap-2 text-rose-900 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="text-[11px] sm:text-xs font-semibold leading-snug">{error}</div>
          </div>
        )}

        {/* LOGIN FORM - TEACHER (GOOGLE AUTH) */}
        {loginRole === "teacher" ? (
          <div className="space-y-4 py-1.5">
            <div className="text-center space-y-1">
              <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-wider">
                ĐĂNG NHẬP GIÁO VIÊN
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500 font-medium leading-relaxed">
                Đăng nhập bằng tài khoản Google để quản lý lớp học, ngân hàng đề & bài kiểm tra.
              </p>
            </div>

            <button
              id="btn-login-teacher-google"
              type="button"
              onClick={handleTeacherGoogleLogin}
              disabled={loginLoading}
              className="w-full h-12 sm:h-13 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 hover:border-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/15 text-slate-700 font-bold rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-3 cursor-pointer shadow-xs hover:shadow-sm active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600 shrink-0" />
                  <span className="font-bold text-slate-700">Đang kết nối Google...</span>
                </>
              ) : (
                <>
                  <GoogleIcon className="w-5 h-5 shrink-0" />
                  <span>Đăng nhập bằng Google</span>
                </>
              )}
            </button>
          </div>
        ) : (
          // LOGIN FORM - STUDENT
          <form onSubmit={handleStudentLogin} className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="input-student-code" className="block text-[10px] sm:text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                MÃ HỌC SINH ĐƯỢC CẤP
              </label>
              <div className="relative">
                <Users className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="input-student-code"
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS5C01"
                  className="w-full h-11 sm:h-12 bg-slate-50/80 hover:bg-slate-50 focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-500 rounded-xl sm:rounded-2xl pl-10 pr-3.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-amber-500/15 transition-all font-bold uppercase tracking-wider"
                />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium pt-0.5 pl-0.5">
                Nhập mã học sinh do thầy/cô chủ nhiệm cung cấp.
              </p>
            </div>

            <button
              id="btn-login-student"
              type="submit"
              disabled={loginLoading}
              className="w-full h-11 sm:h-12 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:from-amber-600 active:to-amber-700 disabled:opacity-60 text-slate-950 font-extrabold rounded-xl sm:rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-1.5 cursor-pointer shadow-sm shadow-amber-500/20 active:scale-[0.99] transition-all disabled:cursor-not-allowed disabled:shadow-none mt-1"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Đang kiểm tra mã...</span>
                </>
              ) : (
                <>
                  <span>Đăng nhập</span>
                  <ArrowRight className="w-4 h-4 text-slate-950" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Streamlined Compact Footer */}
      <footer className="mt-2.5 sm:mt-3 text-center text-slate-400 text-[10px] sm:text-[11px] font-medium space-y-0.5 shrink-0">
        <p className="text-slate-500 font-bold">Tác giả: Hồng Bích Trâm</p>
        <p className="text-[9px] sm:text-[10px] text-slate-400">
          © 2026 HỌC VUI – CHƠI HAY • Hỗ trợ học tập thông minh
        </p>
      </footer>
    </div>
  );
}


