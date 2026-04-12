import { apiRequest } from "./apiClient";

async function safeRequest(executor, fallback) {
  try {
    return await executor();
  } catch {
    return fallback;
  }
}

export async function getAdminStats(weekRange = "Tuan hien tai") {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/stats", { params: { weekRange } });
      return data;
    },
    {
      weekRange,
      datasetSource: "data3.json",
      pendingPosts: 0,
      hiddenRestaurants: 0,
      restrictedUsers: 0,
      unreadNotifications: 0,
      totalRestaurants: 0,
      totalReviews: 0,
      totalViews: 0,
      ratingAverage: 0,
      topViewedRestaurants: [],
      topRecommendedDishes: [],
      topAreas: [],
      hotAreas: [],
    },
  );
}

export async function listRestaurants(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/restaurants", { params: filters });
      return data.items || [];
    },
    [],
  );
}

export async function createRestaurant(payload = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/restaurants", { method: "POST", body: payload });
      return data.item || null;
    },
    null,
  );
}

export async function updateRestaurant(id, payload = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/restaurants/${id}`, { method: "PATCH", body: payload });
      return data.item || null;
    },
    null,
  );
}

export async function toggleRestaurantVisibility(id, hidden) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/restaurants/${id}/visibility`, {
        method: "PATCH",
        body: { hidden: Boolean(hidden) },
      });
      return data.item || null;
    },
    null,
  );
}

export async function attachTagsToRestaurant(id, tagsInput) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/restaurants/${id}/tags`, {
        method: "POST",
        body: { tags: tagsInput },
      });
      return data.item || null;
    },
    null,
  );
}

export async function syncRestaurantsFromSource() {
  return safeRequest(
    async () => apiRequest("/api/admin/restaurants/sync", { method: "POST" }),
    {
      syncedAt: new Date().toISOString(),
      created: 0,
      updated: 0,
      total: 0,
    },
  );
}

export async function listPosts(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/posts", { params: filters });
      return data.items || [];
    },
    [],
  );
}

export async function submitPostForModeration(payload = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/community/posts", {
        method: "POST",
        body: payload,
      });
      return data.post || null;
    },
    null,
  );
}

export async function approvePost(postId) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/posts/${postId}/approve`, { method: "PATCH" });
      return data.post || null;
    },
    null,
  );
}

export async function rejectPost(postId, note = "") {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/posts/${postId}/reject`, {
        method: "PATCH",
        body: { note },
      });
      return data.post || null;
    },
    null,
  );
}

export async function updatePost(postId, payload = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/posts/${postId}`, {
        method: "PATCH",
        body: payload,
      });
      return data.post || null;
    },
    null,
  );
}

export async function attachTagsToPost(postId, tagsInput) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/posts/${postId}/tags`, {
        method: "POST",
        body: { tags: tagsInput },
      });
      return data.post || null;
    },
    null,
  );
}

export async function addCommentToPost(postId, payload = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/community/posts/${postId}/comments`, {
        method: "POST",
        body: payload,
      });
      return data.post || null;
    },
    null,
  );
}

export async function listUsers(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/users", { params: filters });
      return data.items || [];
    },
    [],
  );
}

export async function listUserRiskSignals(limit = 6) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/users/risk-signals", {
        params: { limit },
      });
      return data.items || [];
    },
    [],
  );
}

export async function updateUserStatus(userId, status) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { status },
      });
      return data.item || null;
    },
    null,
  );
}

export async function listNotifications(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/admin/notifications", {
        params: {
          unreadOnly: filters.unreadOnly ? "true" : "",
          targetUserId: filters.targetUserId,
        },
      });
      return data.items || [];
    },
    [],
  );
}

export async function markNotificationRead(notificationId) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/admin/notifications/${notificationId}/read`, {
        method: "PATCH",
      });
      return data.item || null;
    },
    null,
  );
}
