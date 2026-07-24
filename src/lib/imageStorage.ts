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
export function compressImage(file: File, maxWidth = 900, maxHeight = 900, quality = 0.82): Promise<string> {
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
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Không thể đọc định dạng tệp ảnh này."));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Compress avatar specifically (square crop, 256x256 max, light memory footprint ~15-25KB)
export function compressAvatar(file: File, size = 256, quality = 0.82): Promise<{ dataUrl: string; blob: Blob }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Không thể khởi tạo canvas xử lý ảnh."));
          return;
        }

        // Center crop image to 1:1 square ratio
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;

        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob });
            } else {
              // Fallback if toBlob fails
              const byteString = atob(dataUrl.split(",")[1]);
              const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              const fallbackBlob = new Blob([ab], { type: mimeString });
              resolve({ dataUrl, blob: fallbackBlob });
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => reject(new Error("Tệp không phải là ảnh hợp lệ."));
      img.src = event.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Upload avatar with fast timeout & pre-compression (< 300ms typical)
export async function uploadAvatarFile(file: File): Promise<string> {
  if (!file) throw new Error("Chưa chọn tệp ảnh đại diện.");

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error("Định dạng ảnh không hợp lệ. Vui lòng chọn .png, .jpg, .jpeg hoặc .webp");
  }

  // 1. Fast client-side compression to 256x256 square (~15-25KB)
  const { dataUrl, blob } = await compressAvatar(file, 256, 0.82);

  // 2. Upload small blob to Firebase Storage with a strict 2.5s timeout fallback
  if (storage) {
    try {
      const uploadPromise = (async () => {
        const fileName = `avatars/avatar_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
        const storageRef = ref(storage, fileName);
        await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
        return await getDownloadURL(storageRef);
      })();

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timeout")), 2500)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (err) {
      console.warn("Firebase Storage upload skipped or timed out, using compressed data URL avatar:", err);
    }
  }

  // 3. Return lightweight data URL directly if Storage is unavailable or slow
  return dataUrl;
}

// Upload image file to Firebase Storage or return compressed data URL
export async function uploadImageFile(file: File): Promise<string> {
  if (!file) throw new Error("Chưa chọn tệp ảnh.");

  const validTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp", "image/gif"];
  if (!validTypes.includes(file.type.toLowerCase())) {
    throw new Error("Định dạng ảnh không hợp lệ. Vui lòng chọn .png, .jpg, .jpeg, .webp hoặc .gif");
  }

  // Pre-compress image to max 900x900 px
  const dataUrl = await compressImage(file, 900, 900, 0.82);

  // Attempt Firebase Storage upload with pre-compressed blob
  if (storage) {
    try {
      const byteString = atob(dataUrl.split(",")[1]);
      const mimeString = dataUrl.split(",")[0].split(":")[1].split(";")[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const compressedBlob = new Blob([ab], { type: mimeString });

      const fileName = `exams/img_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;
      const storageRef = ref(storage, fileName);

      const uploadPromise = (async () => {
        await uploadBytes(storageRef, compressedBlob, { contentType: "image/jpeg" });
        return await getDownloadURL(storageRef);
      })();

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("Storage timeout")), 3000)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      if (downloadUrl) {
        return downloadUrl;
      }
    } catch (err) {
      console.warn("Firebase Storage upload failed, falling back to compressed data URL:", err);
    }
  }

  return dataUrl;
}
