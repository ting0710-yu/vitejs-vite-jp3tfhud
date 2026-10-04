import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCzKSNWGfhYSoH4nNwwecESQb4JkRmXUeA",
  authDomain: "staff-training-app-41812.firebaseapp.com",
  projectId: "staff-training-app-41812",
  storageBucket: "staff-training-app-41812.firebasestorage.app",
  messagingSenderId: "576211932367",
  appId: "1:576211932367:web:9bca764ded3d63075b53ba",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

export const googleProvider =
  new GoogleAuthProvider();

googleProvider.setCustomParameters({
  prompt: "select_account",
});