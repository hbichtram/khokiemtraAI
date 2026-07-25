import React, { useState, useEffect } from "react";
import { User } from "./types";
import TeacherDashboard from "./components/TeacherDashboard";
import StudentDashboard from "./components/StudentDashboard";
import Footer from "./components/Footer";
import { 
  Sparkles, GraduationCap, Users, Mail, Key, 
  ArrowRight, AlertCircle, RefreshCw, Smile 
} from "lucide-react";
import { 
  signInWithEmailAndPassword, 
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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loginRole, setLoginRole] = useState<"teacher" | "student">("teacher");
  
  // Login Form States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

  const handleTeacherLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Vui lòng nhập địa chỉ Email giáo viên.");
      return;
    }
    if (!password) {
      setError("Vui lòng nhập mật khẩu.");
      return;
    }

    setLoginLoading(true);
    setError(null);

    try {
      // 1. Sign in with Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const fbUser = userCredential.user;

      let teacherName = fbUser.displayName || "Giáo viên";
      let teacherPhotoURL = fbUser.photoURL || undefined;

      // 2. Check/create teacher profile in Firestore without blocking login if Firestore fails
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
            email: fbUser.email || email.trim(),
            school: "Trường Tiểu học CTST",
            department: "Tổ Tin học - Công nghệ",
            subject: "Tin học",
            role: "teacher",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } catch (fsErr) {
        console.warn("Firestore profile fetch/create skipped:", fsErr);
      }

      const teacherUser: User = {
        id: fbUser.uid,
        name: teacherName,
        email: fbUser.email || email.trim(),
        photoURL: teacherPhotoURL,
        role: "teacher"
      };

      setUser(teacherUser);
      localStorage.setItem("ai_smart_test_user", JSON.stringify(teacherUser));
    } catch (err: any) {
      console.error("Firebase auth error code:", err?.code, err?.message);
      const errorCode = err?.code || "";

      switch (errorCode) {
        case "auth/invalid-credential":
          setError("Email hoặc mật khẩu không chính xác.");
          break;
        case "auth/user-not-found":
          setError("Không tìm thấy tài khoản.");
          break;
        case "auth/wrong-password":
          setError("Mật khẩu không chính xác.");
          break;
        case "auth/invalid-email":
          setError("Email không hợp lệ.");
          break;
        case "auth/too-many-requests":
          setError("Có quá nhiều lần thử. Vui lòng thử lại sau.");
          break;
        case "auth/network-request-failed":
          setError("Lỗi kết nối mạng. Vui lòng kiểm tra kết nối.");
          break;
        default:
          setError("Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.");
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
        setError("Mã học sinh này hiện không hoạt động.");
        return;
      }

      if (!foundStudent) {
        setError("Mã học sinh không hợp lệ. Vui lòng kiểm tra lại mã được giáo viên cung cấp.");
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
    setEmail("");
    setPassword("");
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
        <h2 className="font-extrabold text-slate-700 text-lg">Đang khởi động AI SMART TEST...</h2>
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
    <div id="login-portal-root" className="min-h-screen bg-[#F0F4F8] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white border border-slate-100 rounded-[32px] p-8 shadow-xl shadow-slate-200/50 space-y-6 relative overflow-hidden transition-all duration-300">
        
        {/* Colorful top accent border */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-500 via-purple-500 to-amber-400" />

        {/* LOGO & BRANDING */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 animate-pulse">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-indigo-950">AI SMART TEST</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              Học tập thông minh • Tiến bộ mỗi ngày
            </p>
          </div>
        </div>

        {/* ROLE SELECTOR TOGGLE */}
        <div className="bg-slate-100 border border-slate-200/50 p-1.5 rounded-2xl flex text-sm font-bold">
          <button
            id="toggle-login-teacher"
            onClick={() => { setLoginRole("teacher"); setError(null); }}
            className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "teacher"
                ? "bg-white text-indigo-700 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <GraduationCap className="w-4 h-4 shrink-0" />
            Giáo viên
          </button>
          <button
            id="toggle-login-student"
            onClick={() => { setLoginRole("student"); setError(null); }}
            className={`flex-1 py-3 px-4 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-1.5 font-bold ${
              loginRole === "student"
                ? "bg-white text-amber-600 shadow-sm border border-slate-200/30"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Smile className="w-4 h-4 shrink-0" />
            Học sinh
          </button>
        </div>

        {/* ERROR DISPLAYER */}
        {error && (
          <div className="bg-red-50 border-l-4 border-rose-500 p-4 rounded-2xl flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span className="text-rose-800 font-bold text-xs leading-relaxed">{error}</span>
          </div>
        )}

        {/* LOGIN FORM - TEACHER */}
        {loginRole === "teacher" ? (
          <form onSubmit={handleTeacherLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Địa chỉ Email của thầy/cô</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="input-teacher-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tram.ai.ctst@gmail.com"
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                <input
                  id="input-teacher-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu giáo viên"
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                />
              </div>
            </div>

            <button
              id="btn-login-teacher"
              type="submit"
              disabled={loginLoading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-black rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Vào khu vực quản lý
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        ) : (
          // LOGIN FORM - STUDENT
          <form onSubmit={handleStudentLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Nhập Mã học sinh được cấp</label>
              <div className="relative">
                <Users className="absolute left-3.5 top-4 w-4 h-4 text-slate-400" />
                <input
                  id="input-student-code"
                  type="text"
                  required
                  value={studentCode}
                  onChange={(e) => setStudentCode(e.target.value)}
                  placeholder="Ví dụ: HS5C01..."
                  className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-2xl pl-10 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-bold text-slate-800 uppercase"
                />
              </div>
            </div>

            <button
              id="btn-login-student"
              type="submit"
              disabled={loginLoading}
              className="w-full bg-amber-400 hover:bg-amber-500 disabled:bg-amber-300 text-slate-900 font-black py-4 px-4 rounded-3xl text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-100/50 active:scale-[0.98] transition-all"
            >
              {loginLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  Bắt đầu học và làm bài
                  <ArrowRight className="w-4 h-4 text-slate-900" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      <Footer className="mt-8" />
    </div>
  );
}


