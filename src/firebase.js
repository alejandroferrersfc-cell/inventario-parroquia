import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAtsVtiDUzWjVWQIzlx3YqKrmcWRddd8b0",
  authDomain: "inventario-parroquia-230ff.firebaseapp.com",
  projectId: "inventario-parroquia-230ff",
  storageBucket: "inventario-parroquia-230ff.appspot.com",
  messagingSenderId: "796943153576",
  appId: "1:796943153576:web:c3b8ba6ac9fbe1d5bdc59d"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);