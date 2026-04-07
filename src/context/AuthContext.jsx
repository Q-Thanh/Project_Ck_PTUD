import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";

const STORAGE_KEY = "foodfinder_session_v1";

function readStoredSession() {
  if (typeof window === "undefined") {
    return { role: "guest", displayName: "Khach" };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { role: "guest", displayName: "Khach" };
    }

    const parsed = JSON.parse(raw);
    if (!parsed || (parsed.role !== "guest" && parsed.role !== "admin")) {
      return { role: "guest", displayName: "Khach" };
    }

    return parsed;
  } catch {
    return { role: "guest", displayName: "Khach" };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  const value = useMemo(
    () => ({
      session,
      isAdmin: session.role === "admin",
      loginAsAdmin: () => setSession({ role: "admin", displayName: "Admin Demo" }),
      logout: () => setSession({ role: "guest", displayName: "Khach" }),
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
