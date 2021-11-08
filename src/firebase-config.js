// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWw8MuetTG_CsvgQXzQsWMWTPgPy9FQ7E",
  authDomain: "tzapac-faucet.firebaseapp.com",
  projectId: "tzapac-faucet",
  storageBucket: "tzapac-faucet.appspot.com",
  messagingSenderId: "157987303570",
  appId: "1:157987303570:web:430147c3cf34236f85f64b",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
