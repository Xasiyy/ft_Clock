import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyDLgWbMywj6b0wA43zGGlflNVMCstfthBc",
  authDomain: "ft-clock.firebaseapp.com",
  databaseURL: "https://ft-clock-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ft-clock",
  storageBucket: "ft-clock.firebasestorage.app",
  messagingSenderId: "22441863486",
  appId: "1:22441863486:web:484d320e8d449c9515a46f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);