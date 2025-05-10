import { useState, useEffect } from "react";
import { db } from "@/lib/firebase.config";
import { ref, onValue, update, set } from "firebase/database";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const Notifications = ({ currentHospital, currentHospitalId, supervisorId, userId, onClose, onUnreadCountChange }) => {
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!currentHospital || !supervisorId || !userId) return;
    
        const fetchNotifications = async () => {
          if (!currentHospitalId || !userId) return;
    
          const sources = [
            { path: `notifications/supervisor_${currentHospitalId}`, key: "supervisor" },
            { path: `notifications/resposta_${userId}`, key: "resposta" },
          ];
    
          const unsubscribes = sources.map(({ path, key }) => {
            const refSource = ref(db, path);
            return onValue(refSource, (snap) => {
              const data = snap.val() || {};
              const items = Object.entries(data).map(([id, n]) => ({
                id,
                ...n,
                source: key,
              }));
    
              setNotifications((prev) => {
                const filtered = prev.filter((n) => n.source !== key);
                const newList = [...filtered, ...items].sort(
                  (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
                );
                return newList;
              });
            });
          });
    
          return () => unsubscribes.forEach((unsub) => unsub());
        };
    
        fetchNotifications();
      }, [currentHospital, supervisorId, userId, currentHospitalId]);
    

      useEffect(() => {
        const unread = notifications.filter((n) => !n.read).length;
        onUnreadCountChange?.(unread);
      }, [notifications, onUnreadCountChange]);
      
      const markAsRead = async (notificationId, source) => {
        try {
          let notificationRef;
      
          if (source === "supervisor" && currentHospitalId) {
            notificationRef = ref(db, `notifications/supervisor_${currentHospitalId}/${notificationId}`);
          } else if (source === "resposta" && userId) {
            notificationRef = ref(db, `notifications/resposta_${userId}/${notificationId}`);
          } else {
            return; 
          }
      
          await update(notificationRef, { read: true });
        } catch (error) {
            toast.error("Erro ao marcar notificação como lida.");
          console.error("Erro ao marcar notificação como lida:", error);
        }
      };
      
    
    const handleNotificationClick = (notificationId, source) => {
        markAsRead(notificationId, source);
    };

    const clearAllNotifications = async () => {
        try {
          await set(ref(db, `notifications/${userId}`), null);
          setNotifications((prev) => prev.filter((n) => n.source !== "resposta" && n.source !== "supervisor"));
        } catch (err) {
          toast.error("Erro ao limpar notificações:", err);
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
                                    className="text-xs text-blue-500 hover:text-blue-700 cursor-pointer"
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
                                    className={`p-3 border-b cursor-pointer hover:bg-gray-100 ${notification.read ? "bg-gray-50" : "bg-white"
                                        }`}
                                    onClick={() => handleNotificationClick(notification.id, notification.source)}
                                >
                                    <div className="flex justify-between items-start">
                                        <p className={`font-semibold ${notification.read ? "text-gray-600" : "text-gray-900"
                                            }`}>
                                            {notification.title}
                                        </p>
                                        {!notification.read && (
                                            <span className="inline-block h-2 w-2 rounded-full bg-blue-500 ml-2"></span>
                                        )}
                                    </div>
                                    <p className={`text-sm ${notification.read ? "text-gray-500" : "text-gray-700"
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