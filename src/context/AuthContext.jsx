import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";

const SESSION_STORAGE_KEY = "foodfinder_session_v1";
const ACCOUNT_STORAGE_KEY = "foodfinder_accounts_v1";

function createGuestSession() {
  return { role: "guest", displayName: "Khach" };
}

function readStoredSession() {
  if (typeof window === "undefined") {
    return createGuestSession();
  }

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return createGuestSession();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || !["guest", "user", "admin"].includes(parsed.role)) {
      return createGuestSession();
    }

    return {
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : "Khach",
      email: typeof parsed.email === "string" ? parsed.email : "",
      role: parsed.role,
    };
  } catch {
    return createGuestSession();
  }
}

function readStoredAccounts() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (item) =>
        item &&
        typeof item.displayName === "string" &&
        typeof item.email === "string" &&
        typeof item.password === "string",
    );
  } catch {
    return [];
  }
}

function buildUserSession(account) {
  return {
    role: "user",
    displayName: account.displayName,
    email: account.email,
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [accounts, setAccounts] = useState(readStoredAccounts);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    }
  }, [session]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
    }
  }, [accounts]);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: session.role !== "guest",
      isAdmin: session.role === "admin",
      loginAsAdmin: () => setSession({ role: "admin", displayName: "Admin Demo" }),
      login: ({ email, password }) => {
        const normalizedEmail = email.trim().toLowerCase();
        const account = accounts.find((item) => item.email === normalizedEmail);

        if (!account || account.password !== password) {
          return { ok: false, message: "Email hoac mat khau khong dung." };
        }

        const nextSession = buildUserSession(account);
        setSession(nextSession);

        return { ok: true, session: nextSession };
      },
      register: ({ displayName, email, password }) => {
        const normalizedDisplayName = displayName.trim();
        const normalizedEmail = email.trim().toLowerCase();

        if (!normalizedDisplayName || !normalizedEmail || !password) {
          return { ok: false, message: "Vui long dien day du thong tin." };
        }

        if (accounts.some((item) => item.email === normalizedEmail)) {
          return { ok: false, message: "Email nay da duoc dang ky." };
        }

        const nextAccount = {
          displayName: normalizedDisplayName,
          email: normalizedEmail,
          password,
        };

        setAccounts((currentAccounts) => [...currentAccounts, nextAccount]);

        const nextSession = buildUserSession(nextAccount);
        setSession(nextSession);

        return { ok: true, session: nextSession };
      },
      logout: () => setSession(createGuestSession()),
    }),
    [accounts, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
