import { doc, getDoc, setDoc } from "firebase/firestore";
import { db as firestoreDb } from "../firebase";
import { StudentBannerConfig } from "../types";

export const DEFAULT_BANNER_CONFIG: StudentBannerConfig = {
  widthPercent: 100,
  customWidthPx: 960,
  height: 210,
  aspectRatioLocked: true,
  aspectRatioValue: 960 / 210,
  title: "HỌC VUI – CHƠI HAY",
  subtitle: "Học tập thông minh – Tiến bộ mỗi ngày",
  messages: [
    "🎯 Học mà chơi",
    "⭐ Chinh phục thử thách",
    "🏆 Tích lũy thành tích",
    "🚀 Tiến bộ mỗi ngày"
  ],
  imageUrl: "",
  showPills: true,
  themeStyle: "brand-gradient",
};

const LOCAL_STORAGE_KEY = "hocvui_student_banner_config";

export async function getStudentBannerConfig(): Promise<StudentBannerConfig> {
  // 1. Try local cache first for instant layout without flashing
  let cached: StudentBannerConfig | null = null;
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Could not read banner from localStorage:", e);
  }

  // 2. Fetch from Firestore for cloud persistence across devices
  try {
    const docRef = doc(firestoreDb, "appData", "bannerConfig");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as StudentBannerConfig;
      const merged: StudentBannerConfig = {
        ...DEFAULT_BANNER_CONFIG,
        ...data,
        // Ensure bounds
        height: Math.max(110, Math.min(data.height || DEFAULT_BANNER_CONFIG.height, 420)),
        widthPercent: Math.max(40, Math.min(data.widthPercent || 100, 100)),
      };
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
      } catch (err) {
        // ignore
      }
      return merged;
    }
  } catch (err) {
    console.warn("Could not fetch banner config from Firestore, using local fallback:", err);
  }

  return cached || DEFAULT_BANNER_CONFIG;
}

export async function saveStudentBannerConfig(
  config: StudentBannerConfig,
  userId?: string
): Promise<boolean> {
  const payload: StudentBannerConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || "teacher",
  };

  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn("Failed saving banner to localStorage:", e);
  }

  // 2. Save to Firestore
  try {
    const docRef = doc(firestoreDb, "appData", "bannerConfig");
    await setDoc(docRef, payload, { merge: true });
    return true;
  } catch (err) {
    console.error("Failed saving banner config to Firestore:", err);
    // Still return true if local succeeded
    return true;
  }
}
