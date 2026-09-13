import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Ganti kredensial di bawah ini sesuai konfigurasi Firebase Anda
const firebaseConfig = {
  apiKey: "AIzaSyC9aqY21Fv7dN1oLTgA_65jQk-CplRvv2k",
  authDomain: "convert-liturgipptx.firebaseapp.com",
  projectId: "convert-liturgipptx",
  storageBucket: "convert-liturgipptx.firebasestorage.app",
  messagingSenderId: "887121401726",
  appId: "1:887121401726:web:f3a8df18e649392181c52f"
};

// Inisialisasi Firebase App
const app = initializeApp(firebaseConfig);

// Ekspor instance Firestore & Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

// Helper untuk login anonim agar koneksi database aman
export const initAuth = async () => {
  try {
    await signInAnonymously(auth);
  } catch (err) {
    console.error("Gagal melakukan autentikasi anonim:", err);
  }
};