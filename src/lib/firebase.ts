import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyDWErlWXyAAo04-rcdz0rKRwovbvVica-s",
  authDomain: "zheet-6e550.firebaseapp.com",
  projectId: "zheet-6e550",
  storageBucket: "zheet-6e550.appspot.com",
  messagingSenderId: "257370711386",
  appId: "1:257370711386:web:85753f4661e98bed52bf63",
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)