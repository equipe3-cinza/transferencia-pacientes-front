import React, { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { BellIcon } from "@heroicons/react/24/outline";
import Notifications from "@/app/components/Notifications";

const Navbar = ({ user, userRole, currentHospital, dataUser, currentHospitalId }) => {
  const router = useRouter();
  const [showNotifications, setShowNotifications] = useState(false);

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
        Seja bem-vindo, {dataUser?.nome || "Usuário"} - {dataUser?.role || ""}
      </div>
      
      <div className="flex items-center space-x-4 relative">
        <button 
          onClick={toggleNotifications} 
          className="relative p-2 hover:bg-gray-700 rounded-full"
        >
          <BellIcon className="h-6 w-6 cursor-pointer"  />
        </button>
        {showNotifications && (
          <Notifications 
            currentHospitalId={currentHospitalId}
            currentHospital={currentHospital}
            supervisorId={`supervisor_${user.uid}`}
            userId={user.uid}
            onClose={toggleNotifications} 
          />
        )}

        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
        >
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;