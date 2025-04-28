"use client";

import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, push, set, update, remove, onValue } from "firebase/database";
import Navbar from "@/app/components/Navbar";

// Componente para adicionar novos registros
const FormularioAdicionar = ({ tipo }) => {
  const [nome, setNome] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    try {
      const tipoRef = ref(database, tipo);
      const novoRef = push(tipoRef);
      await set(novoRef, { nome });

      setNome("");
    } catch (error) {
      console.error(`Erro ao adicionar ${tipo}`, error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
      <input
        type="text"
        value={nome}
        onChange={(e) => setNome(e.target.value)}
        placeholder={`Adicionar ${tipo}`}
        className="border rounded px-2 py-1 flex-1"
      />
      <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600">
        Adicionar
      </button>
    </form>
  );
};

// Componente para listar registros
const ListaRegistros = ({ registros, tipo, onEditar, onExcluir }) => {
    const [editandoId, setEditandoId] = useState(null);
    const [novoNome, setNovoNome] = useState("");
  
    const handleSalvar = () => {
      if (novoNome.trim() && editandoId) {
        onEditar(editandoId, tipo, novoNome);
        setEditandoId(null);
        setNovoNome("");
      }
    };
  
    return (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 capitalize text-center">{tipo}</h2>
          <ul className="space-y-4">
            {registros.map((registro) => (
              <li
                key={registro.id}
                className="flex items-center justify-between bg-gray-900 p-4 rounded shadow-sm border"
              >
                {editandoId === registro.id ? (
                  <input
                    type="text"
                    value={novoNome}
                    onChange={(e) => setNovoNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSalvar();
                      if (e.key === "Escape") {
                        setEditandoId(null);
                        setNovoNome("");
                      }
                    }}
                    autoFocus
                    className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <span className="flex-1">{registro.nome}</span>
                )}
                <div className="flex gap-2 ml-4">
                  {editandoId === registro.id ? (
                    <button
                      onClick={handleSalvar}
                      className="text-green-600 hover:text-green-800 font-medium"
                    >
                      Salvar
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setEditandoId(registro.id);
                          setNovoNome(registro.nome);
                        }}
                        className="text-yellow-500 hover:text-yellow-700 font-medium"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => onExcluir(registro.id, tipo)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
  };
  

// Componente principal
const Dashboard = () => {
  const [dados, setDados] = useState({
    pacientes: [],
    medicos: [],
    comodos: [],
    especialidades: [],
  });

  const fetchRegistros = (tipo) => {
    const tipoRef = ref(database, tipo);

    onValue(tipoRef, (snapshot) => {
      const data = snapshot.val() || {};
      const registros = Object.entries(data).map(([id, valores]) => ({
        id,
        ...valores,
      }));

      setDados((prev) => ({
        ...prev,
        [tipo]: registros,
      }));
    });
  };

  useEffect(() => {
    const tipos = ["pacientes", "medicos", "comodos", "especialidades"];
    tipos.forEach(fetchRegistros);
  }, []);

  const adicionarRegistro = (tipo, novoRegistro) => {
    setDados((prev) => ({
      ...prev,
      [tipo]: [...prev[tipo], novoRegistro],
    }));
  };

  const editarRegistro = async (id, tipo, novoNome) => {
    if (!novoNome.trim()) return;
  
    try {
      const registroRef = ref(database, `${tipo}/${id}`);
      await update(registroRef, { nome: novoNome });
  
      setDados((prev) => ({
        ...prev,
        [tipo]: prev[tipo].map((item) => (item.id === id ? { ...item, nome: novoNome } : item)),
      }));
    } catch (error) {
      console.error(`Erro ao editar ${tipo}`, error);
    }
  };
  

  const excluirRegistro = async (id, tipo) => {
    try {
      const registroRef = ref(database, `${tipo}/${id}`);
      await remove(registroRef);

      setDados((prev) => ({
        ...prev,
        [tipo]: prev[tipo].filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error(`Erro ao excluir ${tipo}`, error);
    }
  };

  return (
    <>
      <Navbar />
      <div className="flex items-center justify-center bg-black">
        <div className="p-8 rounded-lg shadow-md w-full max-w-md bg-gray-900">
          <h1 className="text-3xl font-bold mb-10 text-center">Dashboard de Gerenciamento</h1>

          {Object.entries(dados).map(([tipo, registros]) => (
            <div key={tipo}>
              <FormularioAdicionar tipo={tipo} onAdicionar={(novo) => adicionarRegistro(tipo, novo)} />
              <ListaRegistros
                registros={registros}
                tipo={tipo}
                onEditar={editarRegistro}
                onExcluir={excluirRegistro}
              />
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
