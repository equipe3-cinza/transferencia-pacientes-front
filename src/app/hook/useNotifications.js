import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "@/lib/firebase.config";

const useNotifications = (currentHospital, currentHospitalId, supervisorId, userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
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

          const unread = newList.filter((n) => !n.read).length;
          setUnreadCount(unread);

          return newList;
        });
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [currentHospitalId, userId, currentHospital, supervisorId]);

  return { notifications, unreadCount };
};

export default useNotifications;
