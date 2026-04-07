import { initialPosts, initialRestaurants, initialUsers, weeklyStats } from "../data/mockData";

const NETWORK_DELAY_MS = 160;

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let postsStore = clone(initialPosts);
let restaurantsStore = clone(initialRestaurants);
let usersStore = clone(initialUsers);

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

function getDynamicTopViewedRestaurants() {
  return [...restaurantsStore]
    .sort((a, b) => b.views - a.views)
    .slice(0, 3)
    .map((item) => ({ name: item.name, views: item.views }));
}

export async function getAdminStats(weekRange = "Tuan hien tai") {
  await wait();

  return {
    weekRange,
    topViewedRestaurants: getDynamicTopViewedRestaurants(),
    topRecommendedDishes: clone(weeklyStats.topRecommendedDishes),
    hotAreas: clone(weeklyStats.hotAreas),
  };
}

export async function listPosts(filters = {}) {
  await wait();

  const { status = "all", query = "" } = filters;
  const queryText = normalizeText(query);

  const filtered = postsStore.filter((post) => {
    const byStatus = status === "all" ? true : post.status === status;
    const byQuery =
      !queryText ||
      normalizeText(post.title).includes(queryText) ||
      normalizeText(post.author).includes(queryText);

    return byStatus && byQuery;
  });

  return sortByDateDesc(filtered, "createdAt");
}

export async function approvePost(postId) {
  await wait();

  postsStore = postsStore.map((post) =>
    post.id === postId ? { ...post, status: "approved", violationNotes: "" } : post,
  );

  const updated = postsStore.find((post) => post.id === postId);
  return clone(updated);
}

export async function rejectPost(postId, reason = "Noi dung chua dat tieu chuan") {
  await wait();

  postsStore = postsStore.map((post) =>
    post.id === postId
      ? { ...post, status: "rejected", violationNotes: reason || "Noi dung chua dat tieu chuan" }
      : post,
  );

  const updated = postsStore.find((post) => post.id === postId);
  return clone(updated);
}

export async function updatePost(postId, payload = {}) {
  await wait();

  postsStore = postsStore.map((post) => {
    if (post.id !== postId) {
      return post;
    }

    const nextStatus = payload.status && POST_STATUS.has(payload.status) ? payload.status : post.status;

    return {
      ...post,
      ...payload,
      status: nextStatus,
      violationNotes: payload.violationNotes ?? post.violationNotes,
    };
  });

  const updated = postsStore.find((post) => post.id === postId);
  return clone(updated);
}

export async function listRestaurants(filters = {}) {
  await wait();

  const { query = "", area = "all", hidden = "all" } = filters;
  const queryText = normalizeText(query);

  const filtered = restaurantsStore.filter((restaurant) => {
    const byQuery =
      !queryText ||
      normalizeText(restaurant.name).includes(queryText) ||
      normalizeText(restaurant.category).includes(queryText);
    const byArea = area === "all" ? true : restaurant.area === area;
    const byHidden =
      hidden === "all" ? true : hidden === "hidden" ? restaurant.hidden : !restaurant.hidden;

    return byQuery && byArea && byHidden;
  });

  return filtered.sort((a, b) => b.views - a.views).map((restaurant) => clone(restaurant));
}

export async function createRestaurant(payload = {}) {
  await wait();

  const nextId = Math.max(...restaurantsStore.map((item) => item.id), 200) + 1;
  const created = {
    id: nextId,
    name: payload.name ?? "Quan moi",
    area: payload.area ?? "Quan 1",
    category: payload.category ?? "Vietnamese",
    priceLevel: payload.priceLevel ?? "$$",
    hidden: Boolean(payload.hidden),
    views: Number.isFinite(payload.views) ? Number(payload.views) : 0,
  };

  restaurantsStore = [created, ...restaurantsStore];
  return clone(created);
}

export async function updateRestaurant(id, payload = {}) {
  await wait();

  restaurantsStore = restaurantsStore.map((restaurant) =>
    restaurant.id === id ? { ...restaurant, ...payload } : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => restaurant.id === id);
  return clone(updated);
}

export async function toggleRestaurantVisibility(id, hidden) {
  await wait();

  restaurantsStore = restaurantsStore.map((restaurant) =>
    restaurant.id === id ? { ...restaurant, hidden: Boolean(hidden) } : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => restaurant.id === id);
  return clone(updated);
}

export async function listUsers(filters = {}) {
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

export async function updateUserStatus(userId, status) {
  await wait();

  const nextStatus = USER_STATUS.has(status) ? status : "active";

  usersStore = usersStore.map((user) =>
    user.id === userId ? { ...user, status: nextStatus, lastActive: new Date().toISOString() } : user,
  );

  const updated = usersStore.find((user) => user.id === userId);
  return clone(updated);
}
