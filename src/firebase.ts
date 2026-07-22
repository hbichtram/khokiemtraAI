import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Firebase configuration provided by the user
export const firebaseConfig = {
  apiKey: "AIzaSyBNitKSb2v9jokWfbA4h_GMmLKoykCWemU",
  authDomain: "khokiemtraai.firebaseapp.com",
  projectId: "khokiemtraai",
  storageBucket: "khokiemtraai.firebasestorage.app",
  messagingSenderId: "274243763018",
  appId: "1:274243763018:web:5ab626779c03d099dd5fb3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

export default app;
