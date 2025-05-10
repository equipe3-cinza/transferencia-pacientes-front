"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase.config";
import { ref, onValue } from "firebase/database";

const Prontuarios = ({ currentHospitalId, userRole }) => {
  const [prontuarios, setProntuarios] = useState([]);
  const [pacientes, setPacientes] = useState([]);

  useEffect(() => {
    // Carregar pacientes do hospital atual
    const pacientesRef = ref(db, "pacientes");
    const unsubscribePacientes = onValue(pacientesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const pacientesList = Object.entries(data)
        .map(([id, paciente]) => ({
          id,
          ...paciente,
        }))
        .filter(paciente => paciente.hospital === currentHospitalId);
      setPacientes(pacientesList);
    });

    // Carregar prontuários
    const prontuariosRef = ref(db, "prontuarios");
    const unsubscribeProntuarios = onValue(prontuariosRef, (snapshot) => {
      const data = snapshot.val() || {};
      const prontuariosList = Object.entries(data).map(([id, prontuario]) => ({
        id,
        ...prontuario,
      }));
      setProntuarios(prontuariosList);
    });

    return () => {
      unsubscribePacientes();
      unsubscribeProntuarios();
    };
  }, [currentHospitalId]);

  // Verificar se o usuário tem permissão para ver os prontuários
  const canViewProntuarios = ["medico", "enfermeiro", "supervisor", "administrador"].includes(userRole);

  if (!canViewProntuarios) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4 text-white">Prontuários</h2>
        <p className="text-gray-300">Você não tem permissão para visualizar os prontuários.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-white">Prontuários</h2>
      
      {pacientes
        .filter((paciente) => {
          const prontuario = prontuarios.find(p => p.id === paciente.id);
          return prontuario && prontuario.eventos && Object.keys(prontuario.eventos).length > 0;
        })
        .length === 0 ? (
        <p className="text-gray-300">Nenhum paciente com eventos registrados neste hospital.</p>
      ) : (
        <div className="space-y-4 max-h-[600px] overflow-y-auto">
          {pacientes
            .filter((paciente) => {
              const prontuario = prontuarios.find(p => p.id === paciente.id);
              return prontuario && prontuario.eventos && Object.keys(prontuario.eventos).length > 0;
            })
            .map((paciente) => {
              const prontuario = prontuarios.find(p => p.id === paciente.id);
              const eventos = prontuario?.eventos || {};

              return (
                <div key={paciente.id} className="border border-gray-700 p-4 rounded-lg bg-gray-800">
                  <h3 className="text-lg font-semibold mb-2 text-white">{paciente.nome}</h3>
                  <div className="space-y-2">
                    {Object.entries(eventos).map(([eventoId, evento]) => (
                      <div key={eventoId} className="border-l-4 border-blue-500 pl-3">
                        <p className="font-medium text-white">
                          {evento.tipo === "transferencia_saida" ? "Saída do Paciente" : "Entrada do Paciente"}
                        </p>
                        <p className="text-gray-300">Hospital de Origem: {evento.hospitalOrigem}</p>
                        <p className="text-gray-300">Hospital de Destino: {evento.hospitalDestinoNome}</p>
                        <p className="text-gray-300">Data: {new Date(evento.data).toLocaleString()}</p>
                        <p className="text-gray-300">Responsável: {evento.nomeResponsavel} ({evento.cargoResponsavel})</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default Prontuarios; 