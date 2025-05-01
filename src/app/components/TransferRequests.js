import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { ref, push, set, update, onValue } from "firebase/database";
import { getInfoUser } from "@/Utils/funcUteis";
import { toast } from "react-toastify";

const TransferRequests = ({ currentHospital, currentHospitalId, user, pacientes, hospitais }) => {
  const [userData, setUserData] = useState(null);
  const [transferencias, setTransferencias] = useState([]);
  const [novaTransferencia, setNovaTransferencia] = useState({
    pacienteId: "",
    hospitalDestinoId: "",
    hospitalDestinoNome: "",
    motivo: "",
  });

  // Carregar transferências pendentes
  useEffect(() => {
    const fetchTransferencias = async () => {
      try {
        if (!currentHospitalId) return;

        const transfersRef = ref(db, `transferencias/hospital_${currentHospitalId}`);
        const unsubscribe = onValue(transfersRef, (snapshot) => {
          const data = snapshot.val() || {};
          const formattedTransfers = Object.entries(data).map(([id, transfer]) => ({
            id,
            ...transfer,
          }));
          setTransferencias(formattedTransfers);
        });

        return () => unsubscribe();
      } catch (error) {
        toast.error("Erro ao carregar transferências:", error);
      }
    }

    fetchTransferencias();
  }, [currentHospitalId]);

  const handleSolicitarTransferencia = async (e) => {
    e.preventDefault();

    const { pacienteId, hospitalDestinoId, hospitalDestinoNome, motivo } = novaTransferencia;
    if (!pacienteId || !hospitalDestinoId || !hospitalDestinoNome || !motivo) return;

    const paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) return;

    const transferData = {
      paciente: {
        id: pacienteId,
        nome: paciente.nome,
      },
      hospitalOrigem: currentHospital,
      hospitalDestinoId,
      hospitalDestinoNome,
      motivo,
      status: "pendente",
      solicitadoPor: user.uid,
      solicitadoEm: new Date().toISOString(),
    };

    try {
      // Criar solicitação no hospital de destino
      const transferRef = ref(db, `transferencias/hospital_${hospitalDestinoId}`);
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

      const notificationRef = ref(db, `notifications/supervisor_${hospitalDestinoId}`);
      await push(notificationRef, notification);

      // Limpar formulário
      setNovaTransferencia({
        pacienteId: "",
        hospitalDestinoId: "",
        hospitalDestinoNome: "",
        motivo: "",
      });

      toast.success("Solicitação de transferência enviada com sucesso!");
    } catch (error) {
      toast.error("Erro ao solicitar transferência:", error);
      toast.error("Erro ao solicitar transferência");
    }
  };

  const handleResponderTransferencia = async (transfer, status) => {
    try {

      const justificativa = await new Promise((resolve, reject) => {
        let inputValue = "";
    
        const toastId = toast.info(
          ({ closeToast }) => (
            <div className="text-center">
              <p className="mb-2 font-semibold">Digite a justificativa:</p>
              <input
                type="text"
                onChange={(e) => (inputValue = e.target.value)}
                className="border p-2 w-full rounded mb-3"
                autoFocus
              />
              <div className="flex justify-center space-x-2">
                <button
                  onClick={() => {
                    toast.dismiss(toastId);
                    resolve(inputValue);
                  }}
                  className="bg-blue-500 text-white px-4 py-1 rounded hover:bg-blue-600 cursor-pointer"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => {
                    toast.dismiss(toastId);
                  }}
                  className="bg-gray-300 text-gray-800 px-4 py-1 rounded hover:bg-gray-400 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ),
          {
            autoClose: false,
            closeButton: false,
            // position: "top-center",
            draggable: false,
          }
        );
      });

      if (justificativa) {
        const userData = await getInfoUser(user.uid);
        setUserData(userData);

        if (!userData) return;
        // Atualizar status da transferência
        const transferRef = ref(db, `transferencias/hospital_${currentHospitalId}/${transfer.id}`);
        await update(transferRef, {
          status,
          justificativa,
          respondidoPor: user?.uid,
          nomeResponsavel: userData?.nome,
          cargoResponsavel: userData?.role,
          respondidoEm: new Date().toISOString(),
        });

        // Se aprovada, atualizar prontuário do paciente
        if (status === "aprovada") {
          const transferencia = transferencias.find(t => t.id === transfer.id);

          // Registrar saída no hospital de origem
          const prontuarioSaidaRef = ref(db, `prontuarios/${transfer.paciente.id}/eventos`);
          await push(prontuarioSaidaRef, {
            tipo: "transferencia_saida",
            hospitalOrigem: currentHospital,
            hospitalDestinoId: transferencia.hospitalDestinoId,
            hospitalDestinoNome: transferencia.hospitalDestinoNome,
            data: new Date().toISOString(),
            responsavel: user.uid,
            nomeResponsavel: userData?.nome,
            cargoResponsavel: userData?.role,
          });

          // Registrar entrada no hospital de destino
          const prontuarioEntradaRef = ref(db, `prontuarios/${transferencia.paciente.id}/eventos`);
          await push(prontuarioEntradaRef, {
            tipo: "transferencia_entrada",
            hospitalOrigem: currentHospital,
            hospitalDestinoId: transferencia.hospitalDestinoId,
            hospitalDestinoNome: transferencia.hospitalDestinoNome,
            data: new Date().toISOString(),
            responsavel: user.uid,
            nomeResponsavel: userData?.nome,
            cargoResponsavel: userData?.role,
          });

          // Atualizar hospital atual do paciente
          const pacienteRef = ref(db, `pacientes/${transferencia.paciente.id}/hospital`);
          await set(pacienteRef, transferencia.hospitalDestinoId);
        }

        // Notificar o solicitante
        const notification = {
          title: `Transferência ${status}`,
          message: `Sua solicitação para o paciente ${transfer.paciente.nome} foi ${status}. Justificativa: ${justificativa}`,
          timestamp: new Date().toISOString(),
          read: false,
        };

        const notificationRef = ref(db, `notifications/resposta_${transfer.solicitadoPor}`);
        await push(notificationRef, notification);
        toast.success(`Transferência ${status} enviada com sucesso!`);
      }


    } catch (error) {
      toast.error("Erro ao responder transferência:", error);
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
              onChange={(e) => setNovaTransferencia({ ...novaTransferencia, pacienteId: e.target.value })}
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
              value={novaTransferencia.hospitalDestinoId}
              onChange={(e) => {
                const hospitalSelecionado = hospitais.find(h => h.id === e.target.value);
                setNovaTransferencia({
                  ...novaTransferencia,
                  hospitalDestinoId: hospitalSelecionado?.id || "",
                  hospitalDestinoNome: hospitalSelecionado?.nome || "",
                });
              }}
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
              onChange={(e) => setNovaTransferencia({ ...novaTransferencia, motivo: e.target.value })}
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
        {transferencias.length === 0 || transferencias.every(transfer => transfer.status !== "pendente") ? (
          <p>Nenhuma transferência pendente</p>
        ) : (
          <ul className="space-y-4">
            {transferencias.map(transfer => (
              <li key={transfer.id} className="border p-4 rounded-lg">
                {transfer.status === "pendente" && transfer.hospitalDestinoId === currentHospitalId && (
                  <div className="space-y-2">
                    <p><strong>Paciente:</strong> {transfer.paciente.nome}</p>
                    <p><strong>Hospital de Origem:</strong> {transfer.hospitalOrigem}</p>
                    <p><strong>Hospital de Destino:</strong> {transfer.hospitalDestinoNome}</p>
                    <p><strong>Motivo:</strong> {transfer.motivo}</p>
                    <p><strong>Status:</strong> {transfer.status}</p>

                    <div className="pt-4 flex gap-2">
                      <button
                        onClick={() => {
                          handleResponderTransferencia(transfer, "aprovada");
                   
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 cursor-pointer"
                      >
                        Aprovar
                      </button>
                      <button
                        onClick={() => {
                          handleResponderTransferencia(transfer, "negada");
          
                        }}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer"
                      >
                        Negar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>

        )}
      </div>
    </div>
  );
};

export default TransferRequests;