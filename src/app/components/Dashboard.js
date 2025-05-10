"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase.config";
import { getUserRole } from "@/lib/auth";
import { ref, push, set, update, remove, onValue } from "firebase/database";
import Navbar from "@/app/components/Navbar";
import TransferRequests from "@/app/components/TransferRequests";
import { getHospitalId, getInfoUser } from "@/Utils/funcUteis";
import Prontuarios from "@/app/components/Prontuarios";
import DisponibilidadeComodos from "@/app/components/DisponibilidadeComodos";
import { toast } from "react-hot-toast";

// Componente para adicionar novos registros
const FormularioAdicionar = ({ tipo }) => {
  const [nome, setNome] = useState("");
  const [disponivel, setDisponivel] = useState(true);
  const [hospitalSelecionado, setHospitalSelecionado] = useState("");
  const [hospitais, setHospitais] = useState([]);

  useEffect(() => {
    if (tipo === "comodos") {
      const hospitaisRef = ref(db, "hospitais");
      const unsubscribe = onValue(hospitaisRef, (snapshot) => {
        const data = snapshot.val() || {};
        const hospitaisList = Object.entries(data).map(([id, hospital]) => ({
          id,
          ...hospital,
        }));
        setHospitais(hospitaisList);
      });

      return () => unsubscribe();
    }
  }, [tipo]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nome.trim()) return;

    if (tipo === "comodos" && !hospitalSelecionado) {
      toast.error("Selecione um hospital");
      return;
    }

    try {
      const tipoRef = ref(db, tipo);
      const novoRef = push(tipoRef);
      const dados = {
        nome,
        createdAt: new Date().toISOString()
      };

      // Se for um cômodo, adiciona a propriedade de disponibilidade e hospital
      if (tipo === "comodos") {
        dados.disponivel = disponivel;
        dados.hospital = hospitalSelecionado;
      }

      await set(novoRef, dados);
      setNome("");
      setDisponivel(true);
      setHospitalSelecionado("");
      toast.success(`${tipo} adicionado com sucesso!`);
    } catch (error) {
      console.error(`Erro ao adicionar ${tipo}`, error);
      toast.error(`Erro ao adicionar ${tipo}`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mb-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder={`Adicionar ${tipo}`}
          className="border rounded px-2 py-1 flex-1 bg-gray-800 text-white"
        />
        {tipo === "comodos" && (
          <div className="flex items-center gap-2">
            <label className="text-white">
              <input
                type="checkbox"
                checked={disponivel}
                onChange={(e) => setDisponivel(e.target.checked)}
                className="mr-2"
              />
              Disponível
            </label>
          </div>
        )}
        <button type="submit" className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 cursor-pointer">
          Adicionar
        </button>
      </div>

      {tipo === "comodos" && (
        <div className="flex gap-2 items-center">
          <label className="text-white min-w-[100px]">Hospital:</label>
          <select
            value={hospitalSelecionado}
            onChange={(e) => setHospitalSelecionado(e.target.value)}
            className="border rounded px-2 py-1 flex-1 bg-gray-800 text-white"
            required
          >
            <option value="">Selecione um hospital</option>
            {hospitais.map((hospital) => (
              <option key={hospital.id} value={hospital.id}>
                {hospital.nome}
              </option>
            ))}
          </select>
        </div>
      )}
    </form>
  );
};

// Componente para listar registros
const ListaRegistros = ({ registros, tipo, onEditar, onExcluir }) => {
  const [editandoId, setEditandoId] = useState(null);
  const [novoNome, setNovoNome] = useState("");
  const [hospitais, setHospitais] = useState({});

  useEffect(() => {
    if (tipo === "comodos") {
      const hospitaisRef = ref(db, "hospitais");
      const unsubscribe = onValue(hospitaisRef, (snapshot) => {
        const data = snapshot.val() || {};
        setHospitais(data);
      });
      return () => unsubscribe();
    }
  }, [tipo]);

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
        {registros?.map((registro) => (
          <li
            key={registro.id}
            className="flex items-center justify-between bg-gray-900 p-4 rounded shadow-sm border"
          >
            <div className="flex-1">
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
                <div>
                  <span>{registro.nome}</span>
                  {tipo === "comodos" && (
                    <>
                      {registro.hospital && (
                        <span className="ml-2 text-gray-400">
                          (Hospital: {hospitais[registro.hospital]?.nome || "Não definido"})
                        </span>
                      )}
                      <span className={`ml-2 ${registro.disponivel ? 'text-green-400' : 'text-red-400'}`}>
                        {registro.disponivel ? '(Disponível)' : '(Ocupado)'}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {editandoId === registro.id ? (
                <button
                  onClick={handleSalvar}
                  className="text-green-600 hover:text-green-800 font-medium cursor-pointer"
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
                    className="text-yellow-500 hover:text-yellow-700 font-medium cursor-pointer"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => onExcluir(registro.id, tipo)}
                    className="text-red-500 hover:text-red-700 font-medium cursor-pointer"
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
  const [hospitalId, setHospitalId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentHospital, setCurrentHospital] = useState(null);
  const [dados, setDados] = useState({
    pacientes: [],
    medicos: [],
    comodos: [],
    especialidades: [],
    hospitais: [],
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUser(user);
        try {
          const role = await getUserRole(user.uid);
          setUserRole(role);

          const userData = await getInfoUser(user.uid);
          setUserData(userData);

          // Carregar hospital do usuário
          const userHospitalRef = ref(db, `users/${user.uid}/hospital`);
          onValue(userHospitalRef, async (snapshot) => {
            const userHospitalId = await getHospitalId(snapshot.val());
            setHospitalId(userHospitalId);
            setCurrentHospital(snapshot.val());
          });

        } catch (error) {
          console.error("Erro ao carregar dados do usuário:", error);
          setUserRole(null);
          setCurrentHospital(null);
        }
      } else {
        setUser(null);
        setUserRole(null);
        setCurrentHospital(null);
      }
    });

    return () => unsubscribe();
  }, []);


  const fetchRegistros = (tipo) => {
    const tipoRef = ref(db, tipo);

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
    const tipos = ["pacientes", "medicos", "comodos", "especialidades", "hospitais"];
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
      const registroRef = ref(db, `${tipo}/${id}`);
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
      const registroRef = ref(db, `${tipo}/${id}`);
      await remove(registroRef);

      setDados((prev) => ({
        ...prev,
        [tipo]: prev[tipo].filter((item) => item.id !== id),
      }));
    } catch (error) {
      console.error(`Erro ao excluir ${tipo}`, error);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        Carregando...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar user={user} userRole={userRole} currentHospitalId={hospitalId} currentHospital={currentHospital} dataUser={userData} />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-white">
          Dashboard do {currentHospital || "Hospital"}
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Seção de Prontuários */}
          <div className="bg-gray-900 rounded-lg p-6">
            <Prontuarios
              currentHospital={currentHospital}
              currentHospitalId={hospitalId}
              userRole={userRole}
            />
          </div>

          {/* Seção de Transferências para Supervisores */}
          {userRole === "supervisor" && (
            <div className="bg-gray-900 rounded-lg p-6 col-span-2">
              <TransferRequests
                currentHospitalId={hospitalId}
                currentHospital={currentHospital}
                user={user}
                pacientes={dados.pacientes}
                hospitais={dados.hospitais?.filter(h => h.nome !== currentHospital)}
              />
            </div>
          )}

          {/* Seção de Disponibilidade de Cômodos */}
          {["medico", "enfermeiro", "supervisor", "administrador"].includes(userRole) && (
            <div className="bg-gray-900 rounded-lg p-6 col-span-3">
              <DisponibilidadeComodos
                currentHospitalId={userRole === "administrador" ? "todos" : hospitalId}
                userRole={userRole}
                user={user}
                showAllHospitals={userRole === "administrador"}
              />
            </div>
          )}

          {userRole === "administrador" && (
            <div className="col-span-3">
              {Object.entries(dados).map(([tipo, registros]) => (
                <div key={tipo} className="mb-12">
                  <h2 className="text-2xl font-semibold mb-4 capitalize text-white">{tipo}</h2>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
