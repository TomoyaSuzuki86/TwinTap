import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInAnonymously,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const firebaseConfig = {
  apiKey: "AIzaSyAtlaX3MnT38Gru_yColYICu2uQP62bbBs",
  authDomain: "twintap-15f33.firebaseapp.com",
  projectId: "twintap-15f33",
  storageBucket: "twintap-15f33.firebasestorage.app",
  messagingSenderId: "1037345632592",
  appId: "1:1037345632592:web:e03e28c690be99f2bdbc55",
};

export function initFirebase() {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  return { app, auth, db };
}

export async function signInAnon(auth) {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  await signInAnonymously(auth);

  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        unsubscribe();
        resolve(user);
      }
    });
  });
}

