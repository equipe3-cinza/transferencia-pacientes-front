import React, { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase.config";
import { useRouter } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";
import Notifications from "@/app/components/Notifications";
import { ref, onValue } from "firebase/database";

const Navbar = ({ user, currentHospital, dataUser, currentHospitalId }) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user?.uid || !currentHospitalId) return;

    // Monitorar notificações do supervisor
    const supervisorRef = ref(db, `notifications/supervisor_${currentHospitalId}`);
    const supervisorUnsubscribe = onValue(supervisorRef, (snapshot) => {
      const data = snapshot.val() || {};
      const unreadSupervisor = Object.values(data).filter(n => !n.read).length;
      setUnreadCount(prev => prev + unreadSupervisor);
    });

    // Monitorar notificações de resposta
    const respostaRef = ref(db, `notifications/resposta_${user.uid}`);
    const respostaUnsubscribe = onValue(respostaRef, (snapshot) => {
      const data = snapshot.val() || {};
      const unreadResposta = Object.values(data).filter(n => !n.read).length;
      setUnreadCount(prev => prev + unreadResposta);
    });

    return () => {
      supervisorUnsubscribe();
      respostaUnsubscribe();
    };
  }, [user?.uid, currentHospitalId]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <nav className="sticky top-0 z-50 flex justify-between items-center p-4 bg-gray-800 text-white w-full">
      <div className="text-xl font-bold">
        {currentHospital || "Hospital"} - Dashboard
      </div>
      <div className="text-xl font-bold">
        Seja bem-vindo! {dataUser?.nome ?? "Usuário"} - {dataUser?.role ?? ""}
      </div>

      <div className="flex items-center space-x-4 relative">
        <button
          onClick={toggleNotifications}
          className="relative p-2 hover:bg-gray-700 rounded-full"
        >
          <BellIcon className="h-6 w-6 cursor-pointer" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <Notifications
            currentHospitalId={currentHospitalId}
            currentHospital={currentHospital}
            supervisorId={`supervisor_${user?.uid}`}
            userId={user?.uid}
            onClose={toggleNotifications}
            onUnreadCountChange={setUnreadCount}
          />
        )}

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;