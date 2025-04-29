import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue, update } from "firebase/database";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";

const Notifications = ({ userId, onClose }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const notificationsRef = ref(database, `notifications/${userId}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      // Ordenar por timestamp (mais recentes primeiro)
      const formattedNotifications = Object.entries(data)
        .map(([id, notification]) => ({
          id,
          ...notification,
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      setNotifications(formattedNotifications);
    });

    return () => unsubscribe();
  }, [userId]);

  const markAsRead = async (notificationId) => {
    try {
      const notificationRef = ref(database, `notifications/${userId}/${notificationId}/read`);
      await update(notificationRef, true);
    } catch (error) {
      console.error("Erro ao marcar notificação como lida:", error);
    }
  };

  const handleNotificationClick = (notificationId) => {
    markAsRead(notificationId);
    // Aqui você pode adicionar lógica adicional quando uma notificação é clicada
  };

  const clearAllNotifications = async () => {
    try {
      const notificationsRef = ref(database, `notifications/${userId}`);
      await update(notificationsRef, null);
    } catch (error) {
      console.error("Erro ao limpar notificações:", error);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-16 right-4 w-80 bg-white rounded-lg shadow-xl z-50 border border-gray-200"
      >
        <div className="p-4">
          <div className="flex justify-between items-center mb-3 text-black">
            <h3 className="font-bold text-lg">Notificações</h3>
            <div className="flex space-x-2">
              {notifications.length > 0 && (
                <button 
                  onClick={clearAllNotifications}
                  className="text-xs text-blue-500 hover:text-blue-700"
                >
                  Limpar todas
                </button>
              )}
              <button 
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          
          {notifications.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Nenhuma notificação</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((notification) => (
                <motion.li
                  key={notification.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    notification.read ? "bg-gray-50" : "bg-white"
                  }`}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex justify-between items-start">
                    <p className={`font-semibold ${
                      notification.read ? "text-gray-600" : "text-gray-900"
                    }`}>
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="inline-block h-2 w-2 rounded-full bg-blue-500 ml-2"></span>
                    )}
                  </div>
                  <p className={`text-sm ${
                    notification.read ? "text-gray-500" : "text-gray-700"
                  }`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notification.timestamp).toLocaleString()}
                  </p>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Notifications;