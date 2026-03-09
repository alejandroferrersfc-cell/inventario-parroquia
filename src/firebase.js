import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";


const firebaseConfig = {
  apiKey: "AIzaSyAtsVtiDuzWjVWQIzlx3YqKrmcwRddd8b0",
  authDomain: "inventario-parroquia-230ff.firebaseapp.com",
  projectId: "inventario-parroquia-230ff",
  storageBucket: "inventario-parroquia-230ff.firebasestorage.app",
  messagingSenderId: "796943153576",
  appId: "1:796943153576:web:c3b8ba6ac9fbe1d5bdc59d"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
