import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
    apiKey: "AIzaSyBGk_rXUSRsfYq3HpvCf-HMvRl6bPMjd3I",
    authDomain: "transferencia-pacientes.firebaseapp.com",
    projectId: "transferencia-pacientes",
    storageBucket: "transferencia-pacientes.firebasestorage.app",
    messagingSenderId: "1028930776262",
    appId: "1:1028930776262:web:de022f1be27b110bf1bbc7",
    measurementId: "G-NEC9C33110"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const auth = getAuth(app);
const db = getDatabase(app);

export { db, auth };
