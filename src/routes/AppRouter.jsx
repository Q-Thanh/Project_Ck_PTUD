import { Navigate, Route, Routes } from "react-router-dom";
import { AdminLayout } from "../layouts/AdminLayout";
import { HomePage } from "../pages/HomePageData3";
import { CommunityPage } from "../pages/CommunityPage";
import { MapPage } from "../pages/MapPage";
import { ProfilePage } from "../pages/ProfilePage";
import RestaurantDetailPage from "../pages/RestaurantDetailData3Page";
import RestaurantSubmissionForm from "../components/RestaurantSubmissionForm";
import { LoginPage } from "../pages/auth/LoginPage";
import { RegisterPage } from "../pages/auth/RegisterPage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminRestaurantsPage } from "../pages/admin/AdminRestaurantsPage";
import { AdminPostsModerationPage } from "../pages/admin/AdminPostsModerationPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminGuard } from "./AdminGuard";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/community" element={<CommunityPage />} />
      <Route path="/map" element={<MapPage />} />
      <Route path="/profile" element={<ProfilePage />} />
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
        <Route path="posts" element={<AdminPostsModerationPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      <Route path="/restaurants/:id" element={<RestaurantDetailPage />} />
      <Route path="/posts/create" element={<RestaurantSubmissionForm />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
