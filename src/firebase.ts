// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
// import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBEiLMv0qst2d9-SA5IMEmMzevpPEHul4k",
  authDomain: "schedule-manager-a2d60.firebaseapp.com",
  projectId: "schedule-manager-a2d60",
  storageBucket: "schedule-manager-a2d60.firebasestorage.app",
  messagingSenderId: "950150734610",
  appId: "1:950150734610:web:8a79416a0ebb17133449cb",
  measurementId: "G-LLWVPCEK5M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// const analytics = getAnalytics(app);
// Firestore
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});
