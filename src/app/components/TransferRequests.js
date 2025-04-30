import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, push, set, update, onValue } from "firebase/database";

const TransferRequests = ({ currentHospital, user, pacientes, hospitais }) => {
  const [transferencias, setTransferencias] = useState([]);
  const [novaTransferencia, setNovaTransferencia] = useState({
    pacienteId: "",
    hospitalDestino: "",
    motivo: "",
  });

  // Carregar transferências pendentes
  useEffect(() => {
    if (!currentHospital) return;

    const transfersRef = ref(db, `transferencias/${currentHospital}`);
    const unsubscribe = onValue(transfersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formattedTransfers = Object.entries(data).map(([id, transfer]) => ({
        id,
        ...transfer,
      }));
      setTransferencias(formattedTransfers);
    });

    return () => unsubscribe();
  }, [currentHospital]);

  const handleSolicitarTransferencia = async (e) => {
    e.preventDefault();
    
    const { pacienteId, hospitalDestino, motivo } = novaTransferencia;
    if (!pacienteId || !hospitalDestino || !motivo) return;

    const paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) return;

    const transferData = {
      paciente: {
        id: pacienteId,
        nome: paciente.nome,
      },
      hospitalOrigem: currentHospital,
      hospitalDestino,
      motivo,
      status: "pendente",
      solicitadoPor: user.uid,
      solicitadoEm: new Date().toISOString(),
    };

    try {
      // Criar solicitação no hospital de destino
      const transferRef = ref(db, `transferencias/${hospitalDestino}`);
      const newTransferRef = push(transferRef);
      await set(newTransferRef, transferData);

      // Notificar o supervisor do hospital de destino
      const notification = {
        title: "Nova solicitação de transferência",
        message: `Paciente: ${paciente.nome} - Motivo: ${motivo}`,
        transferId: newTransferRef.key,
        timestamp: new Date().toISOString(),
        read: false,
      };

      const notificationRef = ref(db, `notifications/supervisor_${hospitalDestino}`);
      await push(notificationRef, notification);

      // Limpar formulário
      setNovaTransferencia({
        pacienteId: "",
        hospitalDestino: "",
        motivo: "",
      });

      alert("Solicitação de transferência enviada com sucesso!");
    } catch (error) {
      console.error("Erro ao solicitar transferência:", error);
      alert("Erro ao solicitar transferência");
    }
  };

  const handleResponderTransferencia = async (transferId, status, justificativa) => {
    try {
      // Atualizar status da transferência
      const transferRef = ref(db, `transferencias/${currentHospital}/${transferId}`);
      await update(transferRef, {
        status,
        justificativa,
        respondidoPor: user.uid,
        respondidoEm: new Date().toISOString(),
      });

      // Se aprovada, atualizar prontuário do paciente
      if (status === "aprovada") {
        const transfer = transferencias.find(t => t.id === transferId);
        
        // Registrar saída no hospital de origem
        const prontuarioSaidaRef = ref(db, `prontuarios/${transfer.paciente.id}/eventos`);
        await push(prontuarioSaidaRef, {
          tipo: "transferencia_saida",
          hospitalOrigem: currentHospital,
          hospitalDestino: transfer.hospitalDestino,
          data: new Date().toISOString(),
          responsavel: user.uid,
        });

        // Registrar entrada no hospital de destino
        const prontuarioEntradaRef = ref(db, `prontuarios/${transfer.paciente.id}/eventos`);
        await push(prontuarioEntradaRef, {
          tipo: "transferencia_entrada",
          hospitalOrigem: currentHospital,
          hospitalDestino: transfer.hospitalDestino,
          data: new Date().toISOString(),
          responsavel: user.uid,
        });

        // Atualizar hospital atual do paciente
        const pacienteRef = ref(db, `pacientes/${transfer.paciente.id}/hospital`);
        await set(pacienteRef, transfer.hospitalDestino);
      }

      // Notificar o solicitante
      const notification = {
        title: `Transferência ${status}`,
        message: `Sua solicitação para o paciente ${transfer.paciente.nome} foi ${status}. Justificativa: ${justificativa}`,
        timestamp: new Date().toISOString(),
        read: false,
      };

      const notificationRef = ref(db, `notifications/${transfer.solicitadoPor}`);
      await push(notificationRef, notification);

    } catch (error) {
      console.error("Erro ao responder transferência:", error);
    }
  };

  return (
    <div className="mb-12 ">
      <h2 className="text-2xl font-semibold mb-4">Solicitações de Transferência</h2>
      
      {/* Formulário para nova transferência */}
      <div className="bg-gray-800 p-4 rounded-lg mb-6">
        <h3 className="text-lg font-semibold mb-2">Solicitar Nova Transferência</h3>
        <form onSubmit={handleSolicitarTransferencia} className="space-y-4">
          <div>
            <label className="block mb-1">Paciente:</label>
            <select
              value={novaTransferencia.pacienteId}
              onChange={(e) => setNovaTransferencia({...novaTransferencia, pacienteId: e.target.value})}
              className="border rounded px-3 py-2 w-full bg-gray-900"
              required
            >
              <option value="">Selecione um paciente</option>
              {pacientes?.map(paciente => (
                <option key={paciente.id} value={paciente.id}>{paciente.nome}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-1">Hospital de Destino:</label>
            <select
              value={novaTransferencia.hospitalDestino}
              onChange={(e) => setNovaTransferencia({...novaTransferencia, hospitalDestino: e.target.value})}
              className="border rounded px-3 py-2 w-full bg-gray-900"
              required
            >
              <option value="">Selecione um hospital</option>
              {hospitais?.map(hospital => (
                <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block mb-1">Motivo:</label>
            <textarea
              value={novaTransferencia.motivo}
              onChange={(e) => setNovaTransferencia({...novaTransferencia, motivo: e.target.value})}
              className="border rounded px-3 py-2 w-full bg-gray-900"
              rows="3"
              required
            />
          </div>
          
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer"
          >
            Solicitar Transferência
          </button>
        </form>
      </div>
      
      {/* Lista de transferências pendentes */}
      <div className="bg-gray-50 p-4 rounded-lg bg-gray-800">
        <h3 className="text-lg font-semibold mb-2">Transferências Pendentes</h3>
        {transferencias.length === 0 ? (
          <p>Nenhuma transferência pendente</p>
        ) : (
          <ul className="space-y-4">
            {transferencias.map(transfer => (
              <li key={transfer.id} className="border p-4 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    <p><strong>Paciente:</strong> {transfer.paciente.nome}</p>
                    <p><strong>Hospital de Origem:</strong> {transfer.hospitalOrigem}</p>
                    <p><strong>Hospital de Destino:</strong> {transfer.hospitalDestino}</p>
                    <p><strong>Motivo:</strong> {transfer.motivo}</p>
                    <p><strong>Status:</strong> {transfer.status}</p>
                  </div>
                  
                  {transfer.status === "pendente" && transfer.hospitalDestino === currentHospital && (
                    <div className="space-x-2">
                      <button
                        onClick={() => {
                          const justificativa = prompt("Digite a justificativa para aprovação:");
                          if (justificativa) {
                            handleResponderTransferencia(transfer.id, "aprovada", justificativa);
                          }
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 cursor-pointer"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => {
                          const justificativa = prompt("Digite a justificativa para negação:");
                          if (justificativa) {
                            handleResponderTransferencia(transfer.id, "negada", justificativa);
                          }
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 cursor-pointer"
                      >
                        Negar
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TransferRequests;