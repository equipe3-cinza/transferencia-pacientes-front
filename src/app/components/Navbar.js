// Navbar.js
import React from "react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";

const Navbar = () => {
    const router = useRouter();


  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  return (
    <nav style={{ display: "flex", justifyContent: "right", padding: "10px 20px" }}>
      <div>
        <button onClick={handleLogout} style={{ padding: "8px 16px", backgroundColor: "#e53935", color: "white", border: "none", borderRadius: "4px" }}>
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
