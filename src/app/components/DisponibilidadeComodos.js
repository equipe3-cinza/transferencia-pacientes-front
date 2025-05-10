"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase.config";
import { ref, onValue, update, push } from "firebase/database";
import { toast } from "react-hot-toast";
import { BuildingOffice2Icon, ClockIcon, HomeIcon, BellIcon } from "@heroicons/react/24/outline";

const DisponibilidadeComodos = ({ currentHospitalId, userRole, user }) => {
  const [comodos, setComodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");
  const [hospitais, setHospitais] = useState({});
  const [notificacoes, setNotificacoes] = useState([]);
  const [filtroHospital, setFiltroHospital] = useState("todos");

  useEffect(() => {
    if (!currentHospitalId || !user?.uid) return;

    // Carregar hospitais
    const hospitaisRef = ref(db, "hospitais");
    const unsubscribeHospitais = onValue(hospitaisRef, (snapshot) => {
      const data = snapshot.val() || {};
      setHospitais(data);
    });

    // Carregar cômodos
    const comodosRef = ref(db, "comodos");
    const unsubscribeComodos = onValue(comodosRef, (snapshot) => {
      const data = snapshot.val() || {};
      const comodosList = Object.entries(data)
        .map(([id, comodo]) => ({
          id,
          ...comodo,
        }))
        .filter(comodo => {
          // Se for admin, mostra todos os cômodos
          if (userRole === "administrador") return true;
          // Caso contrário, mostra apenas os cômodos do hospital atual
          return comodo.hospital === currentHospitalId;
        });
      setComodos(comodosList);
      setLoading(false);
    });

    // Carregar notificações do médico
    const notificacoesRef = ref(db, `notifications/medico_${user.uid}`);
    const unsubscribeNotificacoes = onValue(notificacoesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const notificacoesList = Object.entries(data)
        .map(([id, notificacao]) => ({
          id,
          ...notificacao,
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setNotificacoes(notificacoesList);
    });

    return () => {
      unsubscribeHospitais();
      unsubscribeComodos();
      unsubscribeNotificacoes();
    };
  }, [currentHospitalId, user?.uid, userRole]);

  const handleToggleDisponibilidade = async (comodoId, disponivel) => {
    try {
      const comodoRef = ref(db, `comodos/${comodoId}`);
      await update(comodoRef, {
        disponivel: !disponivel
      });

      // Se estiver marcando como ocupado, criar notificação para os médicos
      if (!disponivel) {
        const comodo = comodos.find(c => c.id === comodoId);
        const medicosRef = ref(db, "users");
        const medicosSnapshot = await onValue(medicosRef, (snapshot) => {
          const medicos = snapshot.val() || {};
          Object.entries(medicos).forEach(([medicoId, medico]) => {
            if ((medico.role === "medico" || medico.role === "supervisor") && medico.hospital === comodo.hospital) {
              const notificacaoRef = ref(db, `notifications/medico_${medicoId}`);
              push(notificacaoRef, {
                mensagem: `Novo paciente chegou ao cômodo ${comodo.nome}`,
                comodoId,
                comodoNome: comodo.nome,
                timestamp: new Date().toISOString(),
                lida: false
              });
            }
          });
        });
      }

      toast.success("Status do cômodo atualizado com sucesso!");
    } catch (error) {
      console.error("Erro ao atualizar status do cômodo:", error);
      toast.error("Erro ao atualizar status do cômodo");
    }
  };

  const marcarNotificacaoComoLida = async (notificacaoId) => {
    try {
      const notificacaoRef = ref(db, `notifications/medico_${user.uid}/${notificacaoId}`);
      await update(notificacaoRef, {
        lida: true
      });
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const comodosFiltrados = comodos.filter(comodo => {
    // Filtro por status
    const statusMatch = filtro === "todos" || 
      (filtro === "disponiveis" && comodo.disponivel) ||
      (filtro === "ocupados" && !comodo.disponivel);

    // Filtro por hospital
    const hospitalMatch = filtroHospital === "todos" || comodo.hospital === filtroHospital;

    return statusMatch && hospitalMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-semibold text-white">Disponibilidade de Cômodos</h2>
        <div className="flex flex-wrap gap-2">
          {userRole === "administrador" && (
            <select
              value={filtroHospital}
              onChange={(e) => setFiltroHospital(e.target.value)}
              className="px-4 py-2 rounded bg-gray-700 text-gray-300 hover:bg-gray-600"
            >
              <option value="todos">Todos os Hospitais</option>
              {Object.entries(hospitais).map(([id, hospital]) => (
                <option key={id} value={id}>
                  {hospital.nome}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={() => setFiltro("todos")}
            className={`px-4 py-2 rounded ${
              filtro === "todos"
                ? "bg-blue-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFiltro("disponiveis")}
            className={`px-4 py-2 rounded ${
              filtro === "disponiveis"
                ? "bg-green-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Disponíveis
          </button>
          <button
            onClick={() => setFiltro("ocupados")}
            className={`px-4 py-2 rounded ${
              filtro === "ocupados"
                ? "bg-red-500 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
          >
            Ocupados
          </button>
        </div>
      </div>

      {(userRole === "medico" || userRole === "supervisor") && notificacoes.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BellIcon className="h-5 w-5 text-yellow-400" />
            Notificações
          </h3>
          <div className="space-y-2">
            {notificacoes.map((notificacao) => (
              <div
                key={notificacao.id}
                className={`p-3 rounded-lg ${
                  notificacao.lida ? "bg-gray-700" : "bg-yellow-900/50"
                }`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-white">{notificacao.mensagem}</p>
                  {!notificacao.lida && (
                    <button
                      onClick={() => marcarNotificacaoComoLida(notificacao.id)}
                      className="text-sm text-gray-400 hover:text-white"
                    >
                      Marcar como lida
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  {new Date(notificacao.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {comodosFiltrados.map((comodo) => (
          <div
            key={comodo.id}
            className="bg-gray-800 rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <BuildingOffice2Icon className="h-5 w-5 text-gray-400" />
                  <h3 className="text-lg font-medium text-white">{comodo.nome}</h3>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <HomeIcon className="h-4 w-4" />
                  <span>{hospitais[comodo.hospital]?.nome || "Hospital não encontrado"}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <ClockIcon className="h-4 w-4 text-gray-400" />
                  <span className={`text-sm ${
                    comodo.disponivel ? "text-green-400" : "text-red-400"
                  }`}>
                    {comodo.disponivel ? "Disponível" : "Ocupado"}
                  </span>
                </div>
              </div>
              {["enfermeiro", "supervisor", "administrador"].includes(userRole) && (
                <button
                  onClick={() => handleToggleDisponibilidade(comodo.id, comodo.disponivel)}
                  className={`px-3 py-1 rounded text-sm font-medium ${
                    comodo.disponivel
                      ? "bg-red-500 hover:bg-red-600 text-white"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  }`}
                >
                  {comodo.disponivel ? "Marcar como Ocupado" : "Marcar como Disponível"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {comodosFiltrados.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">Nenhum cômodo encontrado.</p>
        </div>
      )}
    </div>
  );
};

export default DisponibilidadeComodos; 