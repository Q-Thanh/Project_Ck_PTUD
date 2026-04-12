import { apiRequest } from "./apiClient";

export async function fetchMyProfile() {
  const data = await apiRequest("/api/users/me");
  return data;
}

export async function updateMyProfile(payload = {}) {
  const data = await apiRequest("/api/users/me/profile", {
    method: "PUT",
    body: payload,
  });
  return data;
}
