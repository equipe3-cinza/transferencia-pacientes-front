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
      <div className="mb-8 w-full">
        <h3 className="text-xl font-semibold mb-2 capitalize">{tipo}</h3>
        <ul className="space-y-2">
          {registros.map((registro) => (
            <li key={registro.id} className="flex justify-between items-center p-2 border rounded">
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
                  className="border rounded px-2 py-1 flex-1"
                />
              ) : (
                <span>{registro.nome}</span>
              )}
              <div className="flex gap-2">
                {editandoId === registro.id ? (
                  <button
                    onClick={handleSalvar}
                    className="text-green-600 hover:underline"
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
                      className="text-yellow-600 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => onExcluir(registro.id, tipo)}
                      className="text-red-600 hover:underline"
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
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center">Dashboard de Gerenciamento</h1>

      {Object.entries(dados).map(([tipo, registros]) => (
        <div key={tipo} className="mb-12">
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
    </>
  );
};

export default Dashboard;
