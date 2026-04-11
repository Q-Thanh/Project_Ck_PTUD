import { adminRestaurantsSeed } from "../data/data2Runtime";

const NETWORK_DELAY_MS = 120;
const VALID_RESTAURANT_VISIBILITY = new Set(["all", "hidden", "visible"]);

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

let restaurantsStore = clone(adminRestaurantsSeed);
let customIdCounter = 1;

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeTagList(tagsInput) {
  const tagsArray = Array.isArray(tagsInput)
    ? tagsInput
    : String(tagsInput ?? "")
        .split(",")
        .map((item) => item.trim());

  const unique = new Set();

  tagsArray.forEach((tag) => {
    const normalized = normalizeText(tag)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    if (normalized) {
      unique.add(normalized);
    }
  });

  return [...unique];
}

function getTopViewedRestaurants(limit = 3) {
  return [...restaurantsStore]
    .sort((a, b) => Number(b.views) - Number(a.views))
    .slice(0, limit)
    .map((restaurant) => ({
      name: restaurant.name,
      views: Number(restaurant.views) || 0,
    }));
}

function getTopAreas(limit = 3) {
  const counts = new Map();

  restaurantsStore.forEach((restaurant) => {
    const area = restaurant.area || "Khac";
    counts.set(area, (counts.get(area) ?? 0) + 1);
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getTopTags(limit = 5) {
  const counts = new Map();

  restaurantsStore.forEach((restaurant) => {
    (restaurant.tags ?? []).forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getRestaurantSummary() {
  const totalRestaurants = restaurantsStore.length;
  const hiddenRestaurants = restaurantsStore.filter((restaurant) => restaurant.hidden).length;
  const totalReviews = restaurantsStore.reduce((sum, restaurant) => sum + Number(restaurant.totalReviews || 0), 0);
  const totalViews = restaurantsStore.reduce((sum, restaurant) => sum + Number(restaurant.views || 0), 0);

  const ratingAverage =
    totalRestaurants === 0
      ? 0
      : restaurantsStore.reduce((sum, restaurant) => sum + Number(restaurant.rating || 0), 0) / totalRestaurants;

  return {
    totalRestaurants,
    hiddenRestaurants,
    totalReviews,
    totalViews,
    ratingAverage,
  };
}

function buildStats(weekRange = "Tuan hien tai") {
  const summary = getRestaurantSummary();

  return {
    weekRange,
    pendingPosts: 0,
    hiddenRestaurants: summary.hiddenRestaurants,
    restrictedUsers: 0,
    unreadNotifications: 0,
    totalRestaurants: summary.totalRestaurants,
    totalReviews: summary.totalReviews,
    totalViews: summary.totalViews,
    ratingAverage: Number(summary.ratingAverage.toFixed(2)),
    topViewedRestaurants: getTopViewedRestaurants(3),
    topRecommendedDishes: getTopTags(3).map((item) => ({ name: item.name, count: item.count })),
    topAreas: getTopAreas(3),
    hotAreas: getTopAreas(3).map((item) => ({ name: item.name, score: Math.min(100, item.count * 30) })),
  };
}

function createCustomId() {
  const next = customIdCounter;
  customIdCounter += 1;
  return `custom_${Date.now()}_${next}`;
}

function mapRestaurantPayload(payload = {}, fallback = {}) {
  const tags = payload.tags !== undefined ? normalizeTagList(payload.tags) : fallback.tags ?? [];

  return {
    ...fallback,
    ...payload,
    id: String(payload.id ?? fallback.id ?? createCustomId()),
    name: (payload.name ?? fallback.name ?? "Quan moi").trim(),
    area: payload.area ?? fallback.area ?? "Khac",
    category: payload.category ?? fallback.category ?? "Unknown",
    priceLevel: payload.priceLevel ?? fallback.priceLevel ?? "",
    hidden: payload.hidden !== undefined ? Boolean(payload.hidden) : Boolean(fallback.hidden),
    views: Number.isFinite(Number(payload.views))
      ? Number(payload.views)
      : Number(fallback.views ?? 0),
    tags,
    sourceSyncStatus: payload.sourceSyncStatus ?? fallback.sourceSyncStatus ?? "manual",
    lastSyncedAt: payload.lastSyncedAt ?? fallback.lastSyncedAt ?? new Date().toISOString(),
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : Number(fallback.rating ?? 0),
    totalReviews: Number.isFinite(Number(payload.totalReviews))
      ? Number(payload.totalReviews)
      : Number(fallback.totalReviews ?? 0),
    address: payload.address ?? fallback.address ?? "",
    image: payload.image ?? fallback.image ?? "",
    time: payload.time ?? fallback.time ?? "",
  };
}

export async function getAdminStats(weekRange = "Tuan hien tai") {
  await wait();
  return buildStats(weekRange);
}

export async function listRestaurants(filters = {}) {
  await wait();

  const query = normalizeText(filters.query);
  const area = filters.area ?? "all";
  const hidden = VALID_RESTAURANT_VISIBILITY.has(filters.hidden) ? filters.hidden : "all";

  const filtered = restaurantsStore.filter((restaurant) => {
    const byQuery =
      !query ||
      normalizeText(restaurant.name).includes(query) ||
      normalizeText(restaurant.category).includes(query) ||
      normalizeText(restaurant.area).includes(query) ||
      normalizeText((restaurant.tags ?? []).join(" ")).includes(query);

    const byArea = area === "all" ? true : normalizeText(restaurant.area) === normalizeText(area);

    const byHidden =
      hidden === "all" ? true : hidden === "hidden" ? Boolean(restaurant.hidden) : !Boolean(restaurant.hidden);

    return byQuery && byArea && byHidden;
  });

  return filtered
    .slice()
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .map((restaurant) => clone(restaurant));
}

export async function createRestaurant(payload = {}) {
  await wait();

  const created = mapRestaurantPayload(payload, {
    id: createCustomId(),
    sourceSyncStatus: "manual",
    lastSyncedAt: new Date().toISOString(),
  });

  restaurantsStore = [created, ...restaurantsStore];
  return clone(created);
}

export async function updateRestaurant(id, payload = {}) {
  await wait();

  const lookupId = String(id);
  restaurantsStore = restaurantsStore.map((restaurant) =>
    String(restaurant.id) === lookupId
      ? mapRestaurantPayload(payload, {
          ...restaurant,
          id: lookupId,
          sourceSyncStatus: "manual",
          lastSyncedAt: new Date().toISOString(),
        })
      : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => String(restaurant.id) === lookupId);
  return clone(updated ?? null);
}

export async function toggleRestaurantVisibility(id, hidden) {
  await wait();

  const lookupId = String(id);
  restaurantsStore = restaurantsStore.map((restaurant) =>
    String(restaurant.id) === lookupId
      ? {
          ...restaurant,
          hidden: Boolean(hidden),
          sourceSyncStatus: "manual",
          lastSyncedAt: new Date().toISOString(),
        }
      : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => String(restaurant.id) === lookupId);
  return clone(updated ?? null);
}

export async function attachTagsToRestaurant(id, tagsInput) {
  await wait();

  const lookupId = String(id);
  const tags = normalizeTagList(tagsInput);

  restaurantsStore = restaurantsStore.map((restaurant) =>
    String(restaurant.id) === lookupId
      ? {
          ...restaurant,
          tags,
          sourceSyncStatus: "manual",
          lastSyncedAt: new Date().toISOString(),
        }
      : restaurant,
  );

  const updated = restaurantsStore.find((restaurant) => String(restaurant.id) === lookupId);
  return clone(updated ?? null);
}

export async function syncRestaurantsFromSource() {
  await wait(220);

  const syncedAt = new Date().toISOString();
  let created = 0;
  let updated = 0;

  const byId = new Map(restaurantsStore.map((restaurant) => [String(restaurant.id), restaurant]));
  const byName = new Map(restaurantsStore.map((restaurant) => [normalizeText(restaurant.name), restaurant]));

  adminRestaurantsSeed.forEach((seedRestaurant) => {
    const lookupId = String(seedRestaurant.id);
    const existing = byId.get(lookupId) ?? byName.get(normalizeText(seedRestaurant.name));

    if (existing) {
      updated += 1;
      const mergedTags = normalizeTagList([...(existing.tags ?? []), ...(seedRestaurant.tags ?? [])]);

      restaurantsStore = restaurantsStore.map((restaurant) => {
        if (String(restaurant.id) !== String(existing.id)) return restaurant;

        return {
          ...restaurant,
          name: seedRestaurant.name,
          area: seedRestaurant.area,
          category: seedRestaurant.category,
          priceLevel: seedRestaurant.priceLevel,
          rating: seedRestaurant.rating,
          totalReviews: seedRestaurant.totalReviews,
          views: Math.max(Number(restaurant.views || 0), Number(seedRestaurant.views || 0)),
          address: seedRestaurant.address,
          image: seedRestaurant.image,
          time: seedRestaurant.time,
          tags: mergedTags,
          sourceSyncStatus: "synced",
          lastSyncedAt: syncedAt,
        };
      });

      return;
    }

    created += 1;
    restaurantsStore = [
      {
        ...clone(seedRestaurant),
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

// Stubs kept for backward compatibility in legacy branches.
export async function listPosts() {
  await wait();
  return [];
}

export async function approvePost() {
  await wait();
  return null;
}

export async function rejectPost() {
  await wait();
  return null;
}

export async function updatePost() {
  await wait();
  return null;
}

export async function attachTagsToPost() {
  await wait();
  return null;
}

export async function listUsers() {
  await wait();
  return [];
}

export async function listUserRiskSignals() {
  await wait();
  return [];
}

export async function updateUserStatus() {
  await wait();
  return null;
}

export async function listNotifications() {
  await wait();
  return [];
}

export async function markNotificationRead() {
  await wait();
  return null;
}
