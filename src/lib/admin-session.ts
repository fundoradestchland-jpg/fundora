export function subscribeToAdminSession(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("fundora-session-updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("fundora-session-updated", callback);
  };
}

export function getAdminSessionSnapshot(): boolean {
  try {
    return JSON.parse(window.localStorage.getItem("fundora_session") ?? "null")?.role === "admin";
  } catch {
    return false;
  }
}

export function getServerAdminSessionSnapshot(): null {
  return null;
}