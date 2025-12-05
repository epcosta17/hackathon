/**
 * Firebase configuration and initialization
 */
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC0VUqzNzebdlnQD8pkW8BkaPnKouPyAxY",
    authDomain: "interviewlens-32576.firebaseapp.com",
    projectId: "interviewlens-32576",
    storageBucket: "interviewlens-32576.firebasestorage.app",
    messagingSenderId: "506249675300",
    appId: "1:506249675300:web:94f53051ec70fcf3f00eb1",
    measurementId: "G-G5X9ZLQW1J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

export default app;
