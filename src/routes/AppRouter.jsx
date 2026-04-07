import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { HomePage } from "../pages/HomePage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminPostsPage } from "../pages/admin/AdminPostsPage";
import { AdminRestaurantsPage } from "../pages/admin/AdminRestaurantsPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminGuard } from "./AdminGuard";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<AdminOverviewPage />} />
        <Route path="posts" element={<AdminPostsPage />} />
        <Route path="restaurants" element={<AdminRestaurantsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
