"use client";
import { useEffect, useState } from "react";
import { registerUser } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { get, ref } from "firebase/database";
import { db } from "@/lib/firebase.config";
import { toast } from "react-toastify";


export default function Register() {
    const [formData, setFormData] = useState({
        email: "",
        password: "",
        nome: "",
        role: "medico",
        hospital: "",
    });
    const [hospitais, setHospitais] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const router = useRouter();

    useEffect(() => {
        const fetchHospitais = async () => {
            try {
                const snapshot = await get(ref(db, "hospitais"));
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const lista = Object.entries(data).map(([id, value]) => ({
                        id,
                        nome: value.nome
                    }));
                    setHospitais(lista);
                } else {
                    toast.error("Nenhum hospital encontrado");
                }
            } catch (err) {
                toast.error("Erro ao carregar hospitais.");
                console.error("Erro ao buscar hospitais:", err);
                setError("Erro ao carregar hospitais.");
            }
        };

        fetchHospitais();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        if (!formData.hospital) {
            setError("Selecione um hospital");
            setLoading(false);
            return;
        }

        const { email, password, nome, role, hospital } = formData;

        const result = await registerUser(email, password, {
            nome,
            role,
            hospital,
        });

        if (result.success) {
            router.push("/dashboard");
        } else {
            setError(result.error);
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center bg-black">
            <div className="p-8 rounded-lg shadow-md w-full max-w-md bg-gray-900">
                <h1 className="text-2xl font-bold mb-6 text-center text-white">Cadastro</h1>

                {error && <div className="mb-4 p-2 bg-red-100 text-red-700 rounded">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-white">Nome Completo</label>
                        <input
                            type="text"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                            className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-white">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-white">Senha</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:outline-none focus:border-blue-500"
                            required
                            minLength="6"
                        />
                    </div>

                    <div>
                        <label className="block mb-1 text-white">Tipo de Usuário</label>
                        <select
                            value={formData.role}
                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                            className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        >
                            <option value="medico">Médico</option>
                            <option value="enfermeiro">Enfermeiro</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="administrador">Administrador</option>
                        </select>
                    </div>

                    <div>
                        <label className="block mb-1 text-white">Hospital</label>
                        <select
                            value={formData.hospital}
                            onChange={(e) => setFormData({ ...formData, hospital: e.target.value })}
                            className="w-full p-2 border rounded bg-black text-white border-gray-700 focus:outline-none focus:border-blue-500"
                            required
                        >
                            <option value="">Selecione um hospital</option>
                            {hospitais?.map((h) => (
                                <option key={h.id} value={h.nome}>
                                    {h.nome}
                                </option>
                            ))}
                        </select>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-blue-300 cursor-pointer"
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
        </div>
    );
}
