import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { HomePage } from "../pages/HomePage";
import RestaurantDetailPage from "../pages/RestaurantDetailPage";
import CreatePostForm from "../components/CreatePostForm";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminRestaurantsPage } from "../pages/admin/AdminRestaurantsPage";
import { AdminGuard } from "./AdminGuard";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        <Route path="restaurants" element={<AdminRestaurantsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
      <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
      <Route path="/posts/create" element={<CreatePostForm />} />
    </Routes>
  );
}
