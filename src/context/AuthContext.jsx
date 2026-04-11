import { useEffect, useMemo, useState } from "react";
import { AuthContext } from "./authContextStore";
import { requestJson } from "../services/httpClient";

const SESSION_STORAGE_KEY = "foodfinder_session_v1";
const ACCOUNT_STORAGE_KEY = "foodfinder_accounts_v1";
const AUTH_API_BASE = import.meta.env.VITE_AUTH_API_BASE ?? "http://localhost:3000";

const DEFAULT_FALLBACK_ACCOUNTS = [
  {
    id: 1,
    username: "admin",
    displayName: "Admin",
    email: "admin@foodfinder.local",
    password: "admin",
    role: "admin",
  },
  {
    id: 2,
    username: "user",
    displayName: "Demo User",
    email: "user@foodfinder.local",
    password: "user123",
    role: "user",
  },
];

function createGuestSession() {
  return { role: "guest", displayName: "Khach", email: "" };
}

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function normalizeIdentifier(identifier) {
  return String(identifier ?? "")
    .trim()
    .toLowerCase();
}

function readStoredSession() {
  if (typeof window === "undefined") return createGuestSession();

  try {
    const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return createGuestSession();

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
  if (typeof window === "undefined") return [...DEFAULT_FALLBACK_ACCOUNTS];

  try {
    const raw = window.localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return [...DEFAULT_FALLBACK_ACCOUNTS];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.length) {
      return [...DEFAULT_FALLBACK_ACCOUNTS];
    }

    return parsed;
  } catch {
    return [...DEFAULT_FALLBACK_ACCOUNTS];
  }
}

function normalizeAccount(account, index) {
  const normalizedEmail = normalizeEmail(account?.email);
  const normalizedUsername = normalizeIdentifier(account?.username || normalizedEmail.split("@")[0] || "");

  return {
    id: Number(account?.id) || index + 1,
    displayName: String(account?.displayName || account?.name || "Nguoi dung"),
    email: normalizedEmail,
    username: normalizedUsername,
    password: String(account?.password || ""),
    role: account?.role === "admin" ? "admin" : "user",
  };
}

function ensureSystemAccounts(accounts) {
  const normalizedAccounts = Array.isArray(accounts) ? accounts.map(normalizeAccount) : [];
  const nonAdminAccounts = normalizedAccounts.filter((account) => account.role !== "admin");

  const fixedAdminAccount = { ...DEFAULT_FALLBACK_ACCOUNTS[0] };
  return [fixedAdminAccount, ...nonAdminAccounts];
}

function createSessionFromPayload(payload, defaultRole = "user") {
  const role = ["guest", "user", "admin"].includes(payload?.role) ? payload.role : defaultRole;

  return {
    role,
    displayName: payload?.displayName || payload?.name || "Nguoi dung",
    email: payload?.email || "",
  };
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);
  const [accounts, setAccounts] = useState(() => ensureSystemAccounts(readStoredAccounts()));

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

      login: async ({ identifier, email, password }) => {
        const normalizedIdentifier = normalizeIdentifier(identifier || email);

        if (!normalizedIdentifier || !password) {
          return { ok: false, message: "Vui long nhap day du tai khoan (hoac email) va mat khau." };
        }

        const apiPayload = {
          identifier: normalizedIdentifier,
          password,
          email: normalizedIdentifier,
        };

        const apiResponse = await requestJson(`${AUTH_API_BASE}/login`, {
          method: "POST",
          body: JSON.stringify(apiPayload),
        });

        if (apiResponse.ok && apiResponse.data) {
          const data = apiResponse.data;

          if (data.ok === false) {
            return { ok: false, message: data.message || "Dang nhap that bai." };
          }

          const serverSession = data.session || data.user;
          if (serverSession) {
            const nextSession = createSessionFromPayload(serverSession, "user");
            setSession(nextSession);
            return { ok: true, session: nextSession, source: "api" };
          }
        }

        const fallbackAccount = accounts.find(
          (account) =>
            account.password === password &&
            (normalizeIdentifier(account.username) === normalizedIdentifier ||
              normalizeEmail(account.email) === normalizedIdentifier),
        );

        if (!fallbackAccount) {
          return {
            ok: false,
            message:
              apiResponse.status === 0
                ? "Khong ket noi duoc backend va tai khoan fallback khong ton tai."
                : "Thong tin dang nhap khong chinh xac.",
          };
        }

        const nextSession = createSessionFromPayload(fallbackAccount, fallbackAccount.role || "user");
        setSession(nextSession);
        return { ok: true, session: nextSession, source: "fallback" };
      },

      register: async ({ displayName, email, password }) => {
        const normalizedDisplayName = String(displayName ?? "").trim();
        const normalizedEmail = normalizeEmail(email);
        const derivedUsername = normalizeIdentifier(normalizedEmail.split("@")[0] || "");

        if (!normalizedDisplayName || !normalizedEmail || !password) {
          return { ok: false, message: "Vui long dien day du thong tin." };
        }

        if (
          normalizedEmail === "admin" ||
          normalizedEmail === "admin@foodfinder.local" ||
          derivedUsername === "admin"
        ) {
          return { ok: false, message: "Tai khoan admin la tai khoan he thong, khong the dang ky." };
        }

        const apiResponse = await requestJson(`${AUTH_API_BASE}/register`, {
          method: "POST",
          body: JSON.stringify({ displayName: normalizedDisplayName, email: normalizedEmail, password }),
        });

        if (apiResponse.ok && apiResponse.data) {
          const data = apiResponse.data;

          if (data.ok === false) {
            return { ok: false, message: data.message || "Dang ky that bai." };
          }

          const serverSession = data.session || data.user;
          if (serverSession) {
            const nextSession = createSessionFromPayload(serverSession, "user");
            setSession(nextSession);
            return { ok: true, session: nextSession, source: "api" };
          }
        }

        const existed = accounts.some((account) => normalizeEmail(account.email) === normalizedEmail);
        if (existed) {
          return { ok: false, message: "Email da ton tai trong he thong fallback." };
        }

        const fallbackAccount = {
          id: Math.max(0, ...accounts.map((account) => Number(account.id) || 0)) + 1,
          displayName: normalizedDisplayName,
          email: normalizedEmail,
          username: derivedUsername || `user${Date.now()}`,
          password,
          role: "user",
        };

        setAccounts((current) => ensureSystemAccounts([...current, fallbackAccount]));

        const nextSession = createSessionFromPayload(fallbackAccount, "user");
        setSession(nextSession);

        return { ok: true, session: nextSession, source: "fallback" };
      },

      logout: () => setSession(createGuestSession()),
    }),
    [accounts, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
