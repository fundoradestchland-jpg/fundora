"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem("fundora_session");
    window.dispatchEvent(new Event("fundora-session-updated"));
    router.push("/login");
  };

  return <button type="button" className="nav-button" onClick={logout}>Déconnexion</button>;
}