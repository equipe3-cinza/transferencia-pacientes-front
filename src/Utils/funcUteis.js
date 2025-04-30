import { db } from "@/lib/firebase";
import { get, ref } from "firebase/database";

export const getHospitalId = async (nameHospital) => {
    const snapshot = await get(ref(db, "hospitais"));
    if (snapshot?.exists()) {
        const data = snapshot.val();
        const id = Object.entries(data).find(([_, value]) => value.nome === nameHospital)?.[0];
        return id;
    }
    return null;
};

export const getInfoUser = async (id) => {
    const snapshot = await get(ref(db, `users/${id}`));
    if (snapshot?.exists()) {
        const data = snapshot.val();
        return data;
    }
    return null;
};