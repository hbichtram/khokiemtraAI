import { initializeApp, getApps } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firebaseConfig } from "../firebase";

let storage: any = null;

try {
  const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  storage = getStorage(app);
} catch (e) {
  console.warn("Firebase storage initialization error:", e);
}

// Compress image to optimized base64 data URL if needed
export function compressImage(file: File, maxWidth = 900, maxHeight = 900, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(file.type === "image/png" ? "image/png" : "image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Không thể đọc định dạng tệp ảnh này."));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Upload image file to Firebase Storage or return compressed data URL
export async function uploadImageFile(file: File): Promise<string> {
  if (!file) throw new Error("Chưa chọn tệp ảnh.");

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error("Định dạng ảnh không hợp lệ. Vui lòng chọn .png, .jpg, .jpeg, .webp hoặc .gif");
  }

  // Attempt Firebase Storage
  if (storage) {
    try {
      const fileName = `exams/img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}_${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const storageRef = ref(storage, fileName);
      await uploadBytes(storageRef, file);
      const downloadUrl = await getDownloadURL(storageRef);
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to optimized image compression:", err);
    }
  }

  // Compression fallback to data URL
  return await compressImage(file, 800, 800, 0.82);
}
