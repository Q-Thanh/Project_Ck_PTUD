import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/useAuth";

function decodeToken(token) {
  const normalized = String(token || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return JSON.parse(atob(padded));
}

export function AuthSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { completeOAuthSession } = useAuth();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    try {
      const payload = decodeToken(searchParams.get("token"));
      const session = completeOAuthSession({
        id: Number(payload.id) || Date.now(),
        role: payload.role === "admin" ? "admin" : "user",
        displayName: String(payload.displayName || payload.name || "Người dùng"),
        email: String(payload.email || ""),
        username: String(payload.username || ""),
      });
      navigate("/", {
        replace: true,
        state: { authMessage: `Chào mừng ${session.displayName} quay trở lại (oauth).` },
      });
    } catch {
      navigate("/login", {
        replace: true,
        state: { authMessage: "Đăng nhập OAuth thất bại. Vui lòng thử lại." },
      });
    }
  }, [completeOAuthSession, navigate, searchParams]);

  return <div className="surface-card inline-alert">Đang hoàn tất đăng nhập...</div>;
}
