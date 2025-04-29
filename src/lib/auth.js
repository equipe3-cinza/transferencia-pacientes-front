import { auth, database } from "@/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set, get } from "firebase/database";

export const registerUser = async (email, password, userData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    const userProfileRef = ref(database, `users/${user.uid}`);
    await set(userProfileRef, {
      ...userData,
      email: user.email,
      createdAt: new Date().toISOString(),
    });
    
    return { success: true, user };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

export const getUserRole = async (userId) => {
  try {
    const userRef = ref(database, `users/${userId}/role`);
    const snapshot = await get(userRef);
    
    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.warn("Perfil do usuário não encontrado");
      return null;
    }
  } catch (error) {
    console.error("Erro ao buscar role do usuário:", error);
    return null;
  }
};
