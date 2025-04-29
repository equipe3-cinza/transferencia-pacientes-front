// src/app/components/Login.tsx

"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";

const Login = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const router = useRouter();

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Redireciona para a página principal após o login bem-sucedido
            router.push("/dashboard");
        } catch (err) {
            setError("Erro ao fazer login: " + err.message);
        }
    };

    return (
        <div className="flex items-center justify-center bg-black">
            <div className="p-8 rounded-lg shadow-md w-full max-w-md bg-gray-900">
                <h1 className="text-2xl mb-6">Login</h1>
                <form onSubmit={handleSubmit} className="flex flex-col w-72 gap-4">
                    <input
                        type="email"
                        placeholder="E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="p-2 border rounded"
                    />
                    <input
                        type="password"
                        placeholder="Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="p-2 border rounded"
                    />
                    {error && <div className="text-red-500 text-sm">{error}</div>}
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 rounded mt-4 cursor-pointer hover:bg-blue-600"
                    >
                        Entrar
                    </button>
                </form>
                <div className="mt-4">
                    <span>Não tem uma conta? </span>
                    <button
                        onClick={() => router.push("/register")}
                        className="text-blue-500 hover:underline cursor-pointer"
                    >
                        Cadastre-se
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;
