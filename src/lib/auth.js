import { db, auth } from "@/lib/firebase.config";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { ref, set, get } from "firebase/database";

export const registerUser = async (email, password, userData) => {
  try {
    // Verifica se o email já está em uso
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Verifica se o usuário foi criado com sucesso
    if (!user) {
      throw new Error("Falha ao criar usuário");
    }

    // Tenta salvar os dados do usuário no banco de dados
    const userProfileRef = ref(db, `users/${user.uid}`);
    await set(userProfileRef, {
      ...userData,
      email: user.email,
      createdAt: new Date().toISOString(),
    });
    
    return { success: true, user };
  } catch (error) {
    console.error("Erro no registro:", error);
    let errorMessage = "Erro ao registrar usuário";
    
    // Mensagens de erro mais específicas
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "Este email já está em uso";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "A senha é muito fraca";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "Email inválido";
    } else if (error.code === "permission-denied") {
      errorMessage = "Permissão negada. Verifique as regras do banco de dados";
    }
    
    return { success: false, error: errorMessage };
  }
};

export const getUserRole = async (userId) => {
  try {
    const userRef = ref(db, `users/${userId}/role`);
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
