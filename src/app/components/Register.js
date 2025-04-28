"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";

const Register = () => {
  const [name, setName] = useState("");         // <-- Novo useState para nome
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // Cria o usuário
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      // Atualiza o perfil com o nome
      await updateProfile(userCredential.user, {
        displayName: name
      });

      // Redireciona para login
      router.push("/login");
    } catch (err) {
      setError("Erro ao cadastrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen">
      <h1 className="text-2xl mb-6">Cadastrar-se</h1>
      <form onSubmit={handleSubmit} className="flex flex-col w-72 gap-4">
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <input
          type="email"
          placeholder="E-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded"
          required
        />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <button
          type="submit"
          className="bg-blue-500 text-white py-2 rounded mt-4"
          disabled={loading}
        >
          {loading ? "Cadastrando..." : "Cadastrar"}
        </button>
      </form>
      <div className="mt-4">
        <span>Já tem uma conta? </span>
        <button
          onClick={() => router.push("/")}
          className="text-blue-500 hover:underline cursor-pointer"
        >
          Faça login
        </button>
      </div>
    </div>
  );
};

export default Register;
