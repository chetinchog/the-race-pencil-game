import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCGVs0qnKE-QusRcqmFJGcDvQLm-BSrlKI",
    authDomain: "the-race-pencil-game.firebaseapp.com",
    projectId: "the-race-pencil-game",
    storageBucket: "the-race-pencil-game.firebasestorage.app",
    messagingSenderId: "447185869853",
    appId: "1:447185869853:web:3dee8712da916e853b7af4",
    measurementId: "G-BLNGW99CKX"
};

import { getAnalytics } from "firebase/analytics";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
