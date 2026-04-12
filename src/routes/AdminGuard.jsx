import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

export function AdminGuard({ children }) {
  const { isAdmin } = useAuth();
  const location = useLocation();

  if (!isAdmin) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          deniedPath: location.pathname,
          adminRequired: true,
        }}
      />
    );
  }

  return children;
}
