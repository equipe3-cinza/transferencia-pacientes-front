// components/Notifications.js
import { useState, useEffect } from "react";
import { database } from "@/lib/firebase";
import { ref, onValue } from "firebase/database";

const Notifications = ({ userId }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!userId) return;

    const notificationsRef = ref(database, `notifications/${userId}`);
    const unsubscribe = onValue(notificationsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formattedNotifications = Object.entries(data).map(([id, notification]) => ({
        id,
        ...notification,
      }));
      setNotifications(formattedNotifications);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleNotificationClick = (notificationId) => {
    // Marcar como lida ou executar ação
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs max-h-64 overflow-y-auto">
      <h3 className="font-bold mb-2">Notificações</h3>
      {notifications.length === 0 ? (
        <p>Nenhuma notificação</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li 
              key={notification.id} 
              className="p-2 border-b cursor-pointer hover:bg-gray-50"
              onClick={() => handleNotificationClick(notification.id)}
            >
              <p className="font-semibold">{notification.title}</p>
              <p className="text-sm">{notification.message}</p>
              <p className="text-xs text-gray-500">{new Date(notification.timestamp).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;