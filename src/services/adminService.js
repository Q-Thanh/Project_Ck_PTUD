import {
  initialNotifications,
  initialPosts,
  initialRestaurants,
  initialUsers,
  sourceRestaurants,
  weeklyStats,
} from "../data/mockData";
import { requestJson } from "./httpClient";

const NETWORK_DELAY_MS = 140;
const ADMIN_API_BASE = import.meta.env.VITE_ADMIN_API_BASE ?? "http://localhost:3000/api/admin";

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let postsStore = clone(initialPosts);
let restaurantsStore = clone(initialRestaurants);
let usersStore = clone(initialUsers);
let notificationsStore = clone(initialNotifications);

const POST_STATUS = new Set(["pending", "approved", "rejected"]);
const USER_STATUS = new Set(["active", "locked", "banned"]);

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function sortByDateDesc(items, key) {
  return [...items].sort((a, b) => new Date(b[key]).getTime() - new Date(a[key]).getTime());
}

function nextId(collection, minValue = 1) {
  if (!collection.length) {
    return minValue;
  }

  return Math.max(...collection.map((item) => Number(item.id) || 0), minValue - 1) + 1;
}

function normalizeTagList(tagsInput) {
  const tagsArray = Array.isArray(tagsInput)
    ? tagsInput
    : String(tagsInput ?? "")
        .split(",")
        .map((item) => item.trim());

  const unique = new Set();

  tagsArray.forEach((tag) => {
    const normalized = normalizeText(tag).replace(/\s+/g, "-");
    if (normalized) {
      unique.add(normalized);
    }
  });

  return [...unique];
}

function createModerationEntry(action, by, note) {
  return {
    id: `mh-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    action,
    by,
    at: new Date().toISOString(),
    note,
  };
}

function pushNotification(type, targetUserId, message, status = "unread") {
  notificationsStore = [
    {
      id: nextId(notificationsStore, 501),
      type,
      targetUserId,
      message,
      createdAt: new Date().toISOString(),
      status,
    },
    ...notificationsStore,
  ];
}

function shouldUseApiPayload(payload, key) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (payload.ok === false) {
    return false;
  }

  if (!key) {
    return true;
  }

  return key in payload;
}

async function tryAdminApi(path, options = {}) {
  const response = await requestJson(`${ADMIN_API_BASE}${path}`, options);

  if (!response.ok) {
    return null;
  }

  return response.data;
}

function getDynamicTopViewedRestaurants() {
  return [...restaurantsStore]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((item) => ({ name: item.name, views: item.views }));
}

function getDynamicHotAreas() {
  const areaScoreMap = new Map();

  restaurantsStore.forEach((restaurant) => {
    const current = areaScoreMap.get(restaurant.area) ?? 0;
    areaScoreMap.set(restaurant.area, current + Math.floor(restaurant.views / 120));
  });

  return [...areaScoreMap.entries()]
    .map(([name, score]) => ({ name, score: Math.min(100, score) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

export async function getAdminStats(weekRange = "Tuan hien tai") {
  const apiPayload = await tryAdminApi(`/stats?weekRange=${encodeURIComponent(weekRange)}`);
  if (shouldUseApiPayload(apiPayload, "stats")) {
    return apiPayload.stats;
  }

  await wait();

  const pendingPosts = postsStore.filter((post) => post.status === "pending").length;
  const hiddenRestaurants = restaurantsStore.filter((restaurant) => restaurant.hidden).length;
  const restrictedUsers = usersStore.filter((user) => user.status !== "active").length;
  const unreadNotifications = notificationsStore.filter((item) => item.status === "unread").length;

  return {
    weekRange,
    pendingPosts,
    hiddenRestaurants,
    restrictedUsers,
    unreadNotifications,
    topViewedRestaurants: getDynamicTopViewedRestaurants(),
    topRecommendedDishes: clone(weeklyStats.topRecommendedDishes),
    hotAreas: getDynamicHotAreas(),
  };
}

export async function listPosts(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.query) queryParams.set("query", filters.query);

  const apiPayload = await tryAdminApi(`/posts?${queryParams.toString()}`);
  if (shouldUseApiPayload(apiPayload, "posts") && Array.isArray(apiPayload.posts)) {
    return apiPayload.posts;
  }

  await wait();

  const { status = "all", query = "" } = filters;
  const queryText = normalizeText(query);

  const filtered = postsStore.filter((post) => {
    const byStatus = status === "all" ? true : post.status === status;
    const byQuery =
      !queryText ||
      normalizeText(post.title).includes(queryText) ||
      normalizeText(post.author).includes(queryText) ||
      normalizeText(post.content).includes(queryText);

    return byStatus && byQuery;
  });

  return sortByDateDesc(filtered, "createdAt");
}

export async function approvePost(postId, moderator = "Admin Team") {
  const apiPayload = await tryAdminApi(`/posts/${postId}/approve`, {
    method: "POST",
    body: JSON.stringify({ moderator }),
  });
  if (shouldUseApiPayload(apiPayload, "post")) {
    return apiPayload.post;
  }

  await wait();

  postsStore = postsStore.map((post) => {
    if (post.id !== postId) return post;

    return {
      ...post,
      status: "approved",
      violationNotes: "",
      moderationHistory: [
        ...(post.moderationHistory ?? []),
        createModerationEntry("approved", moderator, "Bai dang dat tieu chuan"),
      ],
    };
  });

  const updated = postsStore.find((post) => post.id === postId);
  if (updated) {
    pushNotification("post_approved", updated.authorId, `Bai '${updated.title}' da duoc duyet.`);
  }

  return clone(updated);
}

export async function rejectPost(postId, reason = "Noi dung chua dat tieu chuan", moderator = "Admin Team") {
  const apiPayload = await tryAdminApi(`/posts/${postId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason, moderator }),
  });
  if (shouldUseApiPayload(apiPayload, "post")) {
    return apiPayload.post;
  }

  await wait();

  postsStore = postsStore.map((post) => {
    if (post.id !== postId) return post;

    return {
      ...post,
      status: "rejected",
      violationNotes: reason,
      moderationHistory: [
        ...(post.moderationHistory ?? []),
        createModerationEntry("rejected", moderator, reason),
      ],
    };
  });

  const updated = postsStore.find((post) => post.id === postId);
  if (updated) {
    pushNotification("post_rejected", updated.authorId, `Bai '${updated.title}' bi tu choi: ${reason}`);
  }

  return clone(updated);
}

export async function updatePost(postId, payload = {}, moderator = "Admin Team") {
  const apiPayload = await tryAdminApi(`/posts/${postId}`, {
    method: "PATCH",
    body: JSON.stringify({ ...payload, moderator }),
  });
  if (shouldUseApiPayload(apiPayload, "post")) {
    return apiPayload.post;
  }

  await wait();

  postsStore = postsStore.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const nextStatus = payload.status && POST_STATUS.has(payload.status) ? payload.status : post.status;

    return {
      ...post,
      ...payload,
      tags: payload.tags ? normalizeTagList(payload.tags) : post.tags,
      status: nextStatus,
      violationNotes: payload.violationNotes ?? post.violationNotes,
      moderationHistory: [
        ...(post.moderationHistory ?? []),
        createModerationEntry("updated", moderator, "Cap nhat noi dung bai dang"),
      ],
    };
  });

  const updated = postsStore.find((post) => post.id === postId);
  return clone(updated);
}

export async function attachTagsToPost(postId, tagsInput, moderator = "Admin Team") {
  const tags = normalizeTagList(tagsInput);

  const apiPayload = await tryAdminApi(`/posts/${postId}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags, moderator }),
  });
  if (shouldUseApiPayload(apiPayload, "post")) {
    return apiPayload.post;
  }

  await wait();

  postsStore = postsStore.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    return {
      ...post,
      tags,
      moderationHistory: [
        ...(post.moderationHistory ?? []),
        createModerationEntry("tagged", moderator, `Gan tags: ${tags.join(", ") || "none"}`),
      ],
    };
  });

  const updated = postsStore.find((post) => post.id === postId);
  return clone(updated);
}

export async function listRestaurants(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.query) queryParams.set("query", filters.query);
  if (filters.area) queryParams.set("area", filters.area);
  if (filters.hidden) queryParams.set("hidden", filters.hidden);

  const apiPayload = await tryAdminApi(`/restaurants?${queryParams.toString()}`);
  if (shouldUseApiPayload(apiPayload, "restaurants") && Array.isArray(apiPayload.restaurants)) {
    return apiPayload.restaurants;
  }

  await wait();

  const { query = "", area = "all", hidden = "all" } = filters;
  const queryText = normalizeText(query);

  const filtered = restaurantsStore.filter((restaurant) => {
    const byQuery =
      !queryText ||
      normalizeText(restaurant.name).includes(queryText) ||
      normalizeText(restaurant.category).includes(queryText) ||
      normalizeText(restaurant.tags.join(" ")).includes(queryText);
    const byArea = area === "all" ? true : restaurant.area === area;
    const byHidden =
      hidden === "all" ? true : hidden === "hidden" ? restaurant.hidden : !restaurant.hidden;

    return byQuery && byArea && byHidden;
  });

  return filtered.sort((a, b) => b.views - a.views).map((restaurant) => clone(restaurant));
}

export async function createRestaurant(payload = {}) {
  const apiPayload = await tryAdminApi("/restaurants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (shouldUseApiPayload(apiPayload, "restaurant")) {
    return apiPayload.restaurant;
  }

  await wait();

  const created = {
    id: nextId(restaurantsStore, 201),
    name: payload.name ?? "Quan moi",
    area: payload.area ?? "Quan 1",
    category: payload.category ?? "Vietnamese",
    priceLevel: payload.priceLevel ?? "$$",
    hidden: Boolean(payload.hidden),
    views: Number.isFinite(Number(payload.views)) ? Number(payload.views) : 0,
    tags: normalizeTagList(payload.tags),
    sourceSyncStatus: "manual",
    lastSyncedAt: new Date().toISOString(),
  };

  restaurantsStore = [created, ...restaurantsStore];
  return clone(created);
}

export async function updateRestaurant(id, payload = {}) {
  const apiPayload = await tryAdminApi(`/restaurants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  if (shouldUseApiPayload(apiPayload, "restaurant")) {
    return apiPayload.restaurant;
  }

  await wait();

  restaurantsStore = restaurantsStore.map((restaurant) =>
    restaurant.id === id
      ? {
          ...restaurant,
          ...payload,
          tags: payload.tags ? normalizeTagList(payload.tags) : restaurant.tags,
        }
      : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => restaurant.id === id);
  return clone(updated);
}

export async function toggleRestaurantVisibility(id, hidden) {
  const apiPayload = await tryAdminApi(`/restaurants/${id}/visibility`, {
    method: "PUT",
    body: JSON.stringify({ hidden: Boolean(hidden) }),
  });
  if (shouldUseApiPayload(apiPayload, "restaurant")) {
    return apiPayload.restaurant;
  }

  await wait();

  restaurantsStore = restaurantsStore.map((restaurant) =>
    restaurant.id === id ? { ...restaurant, hidden: Boolean(hidden) } : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => restaurant.id === id);
  return clone(updated);
}

export async function attachTagsToRestaurant(id, tagsInput) {
  const tags = normalizeTagList(tagsInput);

  const apiPayload = await tryAdminApi(`/restaurants/${id}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tags }),
  });
  if (shouldUseApiPayload(apiPayload, "restaurant")) {
    return apiPayload.restaurant;
  }

  await wait();

  restaurantsStore = restaurantsStore.map((restaurant) =>
    restaurant.id === id ? { ...restaurant, tags } : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => restaurant.id === id);
  return clone(updated);
}

export async function syncRestaurantsFromSource() {
  const apiPayload = await tryAdminApi("/restaurants/sync", { method: "POST" });
  if (shouldUseApiPayload(apiPayload, "result")) {
    return apiPayload.result;
  }

  await wait(220);

  const syncedAt = new Date().toISOString();
  let created = 0;
  let updated = 0;

  sourceRestaurants.forEach((sourceItem) => {
    const existing = restaurantsStore.find(
      (restaurant) => normalizeText(restaurant.name) === normalizeText(sourceItem.name),
    );

    if (existing) {
      updated += 1;
      restaurantsStore = restaurantsStore.map((restaurant) => {
        if (restaurant.id !== existing.id) return restaurant;

        return {
          ...restaurant,
          area: sourceItem.area,
          category: sourceItem.category,
          priceLevel: sourceItem.priceLevel,
          views: Math.max(restaurant.views, sourceItem.views),
          tags: normalizeTagList([...(restaurant.tags ?? []), ...(sourceItem.tags ?? [])]),
          sourceSyncStatus: "synced",
          lastSyncedAt: syncedAt,
        };
      });

      return;
    }

    created += 1;
    restaurantsStore = [
      {
        id: nextId(restaurantsStore, 201),
        name: sourceItem.name,
        area: sourceItem.area,
        category: sourceItem.category,
        priceLevel: sourceItem.priceLevel,
        hidden: false,
        views: sourceItem.views,
        tags: normalizeTagList(sourceItem.tags),
        sourceSyncStatus: "synced",
        lastSyncedAt: syncedAt,
      },
      ...restaurantsStore,
    ];
  });

  return {
    syncedAt,
    created,
    updated,
    total: restaurantsStore.length,
  };
}

export async function listUsers(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.query) queryParams.set("query", filters.query);
  if (filters.status) queryParams.set("status", filters.status);

  const apiPayload = await tryAdminApi(`/users?${queryParams.toString()}`);
  if (shouldUseApiPayload(apiPayload, "users") && Array.isArray(apiPayload.users)) {
    return apiPayload.users;
  }

  await wait();

  const { query = "", status = "all" } = filters;
  const queryText = normalizeText(query);

  const filtered = usersStore.filter((user) => {
    const byStatus = status === "all" ? true : user.status === status;
    const byQuery =
      !queryText ||
      normalizeText(user.name).includes(queryText) ||
      normalizeText(user.email).includes(queryText);

    return byStatus && byQuery;
  });

  return sortByDateDesc(filtered, "lastActive");
}

export async function listUserRiskSignals(limit = 10) {
  const apiPayload = await tryAdminApi(`/users/risk?limit=${encodeURIComponent(limit)}`);
  if (shouldUseApiPayload(apiPayload, "signals") && Array.isArray(apiPayload.signals)) {
    return apiPayload.signals;
  }

  await wait();

  return [...usersStore]
    .filter((user) => user.role !== "admin")
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, limit)
    .map((user) =>
      clone({
        userId: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
        riskScore: user.riskScore,
        abnormalFlags: user.abnormalFlags,
        lastAction: user.lastAction,
      }),
    );
}

export async function updateUserStatus(userId, status, moderator = "Admin Team") {
  const nextStatus = USER_STATUS.has(status) ? status : "active";

  const apiPayload = await tryAdminApi(`/users/${userId}/status`, {
    method: "PUT",
    body: JSON.stringify({ status: nextStatus, moderator }),
  });
  if (shouldUseApiPayload(apiPayload, "user")) {
    return apiPayload.user;
  }

  await wait();

  usersStore = usersStore.map((user) => {
    if (user.id !== userId) return user;

    let nextFlags = [...(user.abnormalFlags ?? [])];

    if (nextStatus === "locked" && !nextFlags.includes("manual-lock")) {
      nextFlags.push("manual-lock");
    }

    if (nextStatus === "banned" && !nextFlags.includes("manual-ban")) {
      nextFlags.push("manual-ban");
    }

    if (nextStatus === "active") {
      nextFlags = nextFlags.filter((flag) => flag !== "manual-lock" && flag !== "manual-ban");
    }

    return {
      ...user,
      status: nextStatus,
      abnormalFlags: nextFlags,
      lastActive: new Date().toISOString(),
      lastAction: `Trang thai duoc cap nhat thanh ${nextStatus} boi ${moderator}`,
      riskScore: nextStatus === "banned" ? Math.max(user.riskScore, 90) : user.riskScore,
    };
  });

  const updated = usersStore.find((user) => user.id === userId);
  if (updated) {
    pushNotification(
      "user_status_changed",
      updated.id,
      `Tai khoan cua ban duoc cap nhat sang trang thai '${nextStatus}'.`,
    );
  }

  return clone(updated);
}

export async function listNotifications(filters = {}) {
  const queryParams = new URLSearchParams();
  if (filters.type) queryParams.set("type", filters.type);
  if (filters.status) queryParams.set("status", filters.status);
  if (filters.limit) queryParams.set("limit", String(filters.limit));

  const apiPayload = await tryAdminApi(`/notifications?${queryParams.toString()}`);
  if (shouldUseApiPayload(apiPayload, "notifications") && Array.isArray(apiPayload.notifications)) {
    return apiPayload.notifications;
  }

  await wait();

  const { type = "all", status = "all", limit = 20 } = filters;

  const filtered = notificationsStore.filter((item) => {
    const byType = type === "all" ? true : item.type === type;
    const byStatus = status === "all" ? true : item.status === status;

    return byType && byStatus;
  });

  return sortByDateDesc(filtered, "createdAt").slice(0, limit).map((item) => clone(item));
}

export async function markNotificationRead(notificationId) {
  const apiPayload = await tryAdminApi(`/notifications/${notificationId}/read`, {
    method: "PUT",
  });
  if (shouldUseApiPayload(apiPayload, "notification")) {
    return apiPayload.notification;
  }

  await wait();

  notificationsStore = notificationsStore.map((item) =>
    item.id === notificationId ? { ...item, status: "read" } : item,
  );

  const updated = notificationsStore.find((item) => item.id === notificationId);
  return clone(updated);
}
