import { useEffect, useState } from "react";
import { db } from "@/lib/firebase.config";
import { ref, push, set, update, onValue } from "firebase/database";
import { getInfoUser } from "@/Utils/funcUteis";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

const TransferRequests = ({ currentHospital, currentHospitalId, user, pacientes, hospitais }) => {
  const [transferencias, setTransferencias] = useState([]);
  const [comodos, setComodos] = useState([]);
  const [novaTransferencia, setNovaTransferencia] = useState({
    pacienteId: "",
    hospitalDestinoId: "",
    hospitalDestinoNome: "",
    comodoId: "",
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

  // Carregar cômodos quando o hospital de destino for selecionado
  useEffect(() => {
    if (!novaTransferencia.hospitalDestinoId) {
      setComodos([]);
      return;
    }

    const comodosRef = ref(db, "comodos");
    const unsubscribe = onValue(comodosRef, (snapshot) => {
      const data = snapshot.val() || {};
      const comodosList = Object.entries(data)
        .map(([id, comodo]) => ({
          id,
          ...comodo,
        }))
        .filter(comodo => 
          comodo.hospital === novaTransferencia.hospitalDestinoId && 
          comodo.disponivel
        );
      setComodos(comodosList);
    });

    return () => unsubscribe();
  }, [novaTransferencia.hospitalDestinoId]);

  const handleSolicitarTransferencia = async (e) => {
    e.preventDefault();

    const { pacienteId, hospitalDestinoId, hospitalDestinoNome, comodoId, motivo } = novaTransferencia;
    if (!pacienteId || !hospitalDestinoId || !hospitalDestinoNome || !comodoId || !motivo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const paciente = pacientes.find(p => p.id === pacienteId);
    if (!paciente) return;

    const comodo = comodos.find(c => c.id === comodoId);
    if (!comodo) {
      toast.error("Cômodo não encontrado");
      return;
    }

    const transferData = {
      paciente: {
        id: pacienteId,
        nome: paciente.nome,
      },
      hospitalOrigem: currentHospital,
      hospitalDestinoId,
      hospitalDestinoNome,
      comodoId,
      comodoNome: comodo.nome,
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
        message: `Paciente: ${paciente.nome} - Motivo: ${motivo} - Cômodo: ${comodo.nome}`,
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
        comodoId: "",
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
      const { value: justificativa } = await Swal.fire({
        title: 'Digite a justificativa',
        input: 'text',
        inputLabel: 'Justificativa',
        inputPlaceholder: 'Digite a justificativa aqui',
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        cancelButtonText: 'Cancelar',
        inputValidator: (value) => {
          if (!value) {
            return 'Você precisa digitar uma justificativa!';
          }
        }
      });

      if (justificativa) {
        const userInfo = await getInfoUser(user.uid);

        if (!userInfo) return;

        // Se aprovada, atualizar status do cômodo para ocupado
        if (status === "aprovada") {
          const comodoRef = ref(db, `comodos/${transfer.comodoId}`);
          await update(comodoRef, {
            disponivel: false
          });
        }

        // Atualizar status da transferência
        const transferRef = ref(db, `transferencias/hospital_${currentHospitalId}/${transfer.id}`);
        await update(transferRef, {
          status,
          justificativa,
          respondidoPor: user?.uid,
          nomeResponsavel: userInfo?.nome,
          cargoResponsavel: userInfo?.role,
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
            comodoId: transferencia.comodoId,
            comodoNome: transferencia.comodoNome,
            data: new Date().toISOString(),
            responsavel: user.uid,
            nomeResponsavel: userInfo?.nome,
            cargoResponsavel: userInfo?.role,
          });

          // Registrar entrada no hospital de destino
          const prontuarioEntradaRef = ref(db, `prontuarios/${transferencia.paciente.id}/eventos`);
          await push(prontuarioEntradaRef, {
            tipo: "transferencia_entrada",
            hospitalOrigem: currentHospital,
            hospitalDestinoId: transferencia.hospitalDestinoId,
            hospitalDestinoNome: transferencia.hospitalDestinoNome,
            comodoId: transferencia.comodoId,
            comodoNome: transferencia.comodoNome,
            data: new Date().toISOString(),
            responsavel: user.uid,
            nomeResponsavel: userInfo?.nome,
            cargoResponsavel: userInfo?.role,
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
        
        Swal.fire({
          title: 'Sucesso!',
          text: `Transferência ${status} enviada com sucesso!`,
          icon: 'success',
          confirmButtonText: 'OK'
        });
      }

    } catch {
      Swal.fire({
        title: 'Erro!',
        text: 'Erro ao responder transferência',
        icon: 'error',
        confirmButtonText: 'OK'
      });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4 text-white">Transferências</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Formulário para nova transferência */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-white">Solicitar Nova Transferência</h3>
          <form onSubmit={handleSolicitarTransferencia} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-300">Paciente:</label>
              <select
                value={novaTransferencia.pacienteId}
                onChange={(e) => setNovaTransferencia({ ...novaTransferencia, pacienteId: e.target.value })}
                className="border rounded px-3 py-2 w-full bg-gray-900 text-white"
                required
              >
                <option value="">Selecione um paciente</option>
                {pacientes?.map(paciente => (
                  <option key={paciente.id} value={paciente.id}>{paciente.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Hospital de Destino:</label>
              <select
                value={novaTransferencia.hospitalDestinoId}
                onChange={(e) => {
                  const hospitalSelecionado = hospitais.find(h => h.id === e.target.value);
                  setNovaTransferencia({
                    ...novaTransferencia,
                    hospitalDestinoId: hospitalSelecionado?.id || "",
                    hospitalDestinoNome: hospitalSelecionado?.nome || "",
                    comodoId: "", // Reset comodoId when hospital changes
                  });
                }}
                className="border rounded px-3 py-2 w-full bg-gray-900 text-white"
                required
              >
                <option value="">Selecione um hospital</option>
                {hospitais?.map(hospital => (
                  <option key={hospital.id} value={hospital.id}>{hospital.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Cômodo:</label>
              <select
                value={novaTransferencia.comodoId}
                onChange={(e) => setNovaTransferencia({ ...novaTransferencia, comodoId: e.target.value })}
                className="border rounded px-3 py-2 w-full bg-gray-900 text-white"
                required
                disabled={!novaTransferencia.hospitalDestinoId}
              >
                <option value="">Selecione um cômodo</option>
                {comodos.map(comodo => (
                  <option key={comodo.id} value={comodo.id}>{comodo.nome}</option>
                ))}
              </select>
              {!novaTransferencia.hospitalDestinoId && (
                <p className="text-sm text-gray-400 mt-1">Selecione um hospital primeiro</p>
              )}
            </div>

            <div>
              <label className="block mb-1 text-gray-300">Motivo:</label>
              <textarea
                value={novaTransferencia.motivo}
                onChange={(e) => setNovaTransferencia({ ...novaTransferencia, motivo: e.target.value })}
                className="border rounded px-3 py-2 w-full bg-gray-900 text-white"
                rows="3"
                required
              />
            </div>

            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 cursor-pointer w-full"
            >
              Solicitar Transferência
            </button>
          </form>
        </div>

        {/* Lista de transferências pendentes */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-white">Transferências Pendentes</h3>
          {transferencias.length === 0 || !transferencias.some(transfer => 
            transfer.status === "pendente" && transfer.hospitalDestinoId === currentHospitalId
          ) ? (
            <p className="text-gray-300">Nenhuma transferência pendente</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {transferencias.map(transfer => (
                <div key={transfer.id} className="border border-gray-700 p-4 rounded-lg bg-gray-900">
                  {transfer.status === "pendente" && transfer.hospitalDestinoId === currentHospitalId && (
                    <div className="space-y-2">
                      <p className="text-gray-300"><strong>Paciente:</strong> {transfer.paciente.nome}</p>
                      <p className="text-gray-300"><strong>Hospital de Origem:</strong> {transfer.hospitalOrigem}</p>
                      <p className="text-gray-300"><strong>Hospital de Destino:</strong> {transfer.hospitalDestinoNome}</p>
                      <p className="text-gray-300"><strong>Motivo:</strong> {transfer.motivo}</p>
                      <p className="text-gray-300"><strong>Status:</strong> {transfer.status}</p>

                      <div className="pt-4 flex gap-2">
                        <button
                          onClick={() => handleResponderTransferencia(transfer, "aprovada")}
                          className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 cursor-pointer flex-1"
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleResponderTransferencia(transfer, "negada")}
                          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-700 cursor-pointer flex-1"
                        >
                          Negar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferRequests;