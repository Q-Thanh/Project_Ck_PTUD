import { adminRestaurantsSeed, SOURCE_DATASET } from "../data/data2Runtime";
import { initialNotifications, initialPosts, initialUsers } from "../data/mockData";

const NETWORK_DELAY_MS = 120;
const VALID_RESTAURANT_VISIBILITY = new Set(["all", "hidden", "visible"]);
const VALID_USER_STATUS = new Set(["active", "locked", "banned"]);
const STATUS_ACTIVE = "active";
const STATUS_LOCKED = "locked";
const STATUS_BANNED = "banned";

const STORAGE_KEYS = {
  restaurants: "foodfinder_admin_restaurants_v1",
  posts: "foodfinder_admin_posts_v1",
  users: "foodfinder_admin_users_v1",
  notifications: "foodfinder_admin_notifications_v1",
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const wait = (ms = NETWORK_DELAY_MS) => new Promise((resolve) => setTimeout(resolve, ms));

const hasWindow = typeof window !== "undefined";

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function pickAreaFromAddress(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[1];
  }

  return parts[0] || "Khac";
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

function normalizeRestaurantDraft(payload = {}, fallback = {}) {
  const address = String(payload.address ?? fallback.address ?? "").trim();

  return {
    name: String(payload.name ?? fallback.name ?? "").trim(),
    address,
    area: String(payload.area ?? fallback.area ?? pickAreaFromAddress(address)).trim() || "Khac",
    category: String(payload.category ?? fallback.category ?? "").trim(),
    priceLevel: String(payload.priceLevel ?? fallback.priceLevel ?? "").trim(),
    time: String(payload.time ?? fallback.time ?? "").trim(),
    image: String(payload.image ?? fallback.image ?? "").trim(),
    menuHighlights: Array.isArray(payload.menuHighlights)
      ? payload.menuHighlights.map((item) => String(item).trim()).filter(Boolean)
      : String(payload.menuHighlights ?? fallback.menuHighlights ?? "")
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
  };
}

function readStore(key, fallbackValue) {
  if (!hasWindow) return clone(fallbackValue);

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return clone(fallbackValue);

    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // Use fallback when storage is not available or invalid.
  }

  return clone(fallbackValue);
}

function writeStore(key, value) {
  if (!hasWindow) return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write errors in restricted environments.
  }
}

function normalizeRestaurantInput(payload = {}, fallback = {}) {
  const tags = payload.tags !== undefined ? normalizeTagList(payload.tags) : fallback.tags ?? [];

  return {
    ...fallback,
    ...payload,
    id: String(payload.id ?? fallback.id),
    name: String(payload.name ?? fallback.name ?? "Quan moi").trim(),
    area: String(payload.area ?? fallback.area ?? "Khac").trim() || "Khac",
    category: String(payload.category ?? fallback.category ?? "Unknown").trim() || "Unknown",
    priceLevel: String(payload.priceLevel ?? fallback.priceLevel ?? "").trim(),
    hidden: payload.hidden !== undefined ? Boolean(payload.hidden) : Boolean(fallback.hidden),
    views: Number.isFinite(Number(payload.views)) ? Number(payload.views) : Number(fallback.views ?? 0),
    tags,
    sourceSyncStatus: payload.sourceSyncStatus ?? fallback.sourceSyncStatus ?? "manual",
    lastSyncedAt: payload.lastSyncedAt ?? fallback.lastSyncedAt ?? new Date().toISOString(),
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : Number(fallback.rating ?? 0),
    totalReviews: Number.isFinite(Number(payload.totalReviews))
      ? Number(payload.totalReviews)
      : Number(fallback.totalReviews ?? 0),
    address: String(payload.address ?? fallback.address ?? "").trim(),
    image: String(payload.image ?? fallback.image ?? "").trim(),
    time: String(payload.time ?? fallback.time ?? "").trim(),
    menuHighlights: Array.isArray(payload.menuHighlights)
      ? payload.menuHighlights.map((item) => String(item).trim()).filter(Boolean)
      : Array.isArray(fallback.menuHighlights)
        ? fallback.menuHighlights
        : [],
  };
}

function normalizeCommentInput(payload = {}, fallback = {}) {
  return {
    ...fallback,
    ...payload,
    id: payload.id ?? fallback.id ?? `comment-${Date.now()}`,
    author: String(payload.author ?? fallback.author ?? "Nguoi dung").trim(),
    authorId: Number(payload.authorId ?? fallback.authorId ?? 0),
    content: String(payload.content ?? fallback.content ?? "").trim(),
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : Number(fallback.rating ?? 0),
    createdAt: payload.createdAt ?? fallback.createdAt ?? new Date().toISOString(),
  };
}

function normalizePostInput(payload = {}, fallback = {}) {
  const restaurantSnapshot = normalizeRestaurantDraft(
    payload.restaurantSnapshot ?? {},
    fallback.restaurantSnapshot ?? {},
  );

  return {
    ...fallback,
    ...payload,
    id: payload.id ?? fallback.id,
    title: String(payload.title ?? fallback.title ?? "Bai dang moi").trim(),
    content: String(payload.content ?? fallback.content ?? "").trim(),
    author: String(payload.author ?? fallback.author ?? "Nguoi dung").trim(),
    authorId: Number(payload.authorId ?? fallback.authorId ?? 0),
    restaurantId:
      payload.restaurantId !== undefined
        ? payload.restaurantId
          ? String(payload.restaurantId)
          : null
        : fallback.restaurantId ?? null,
    status: payload.status ?? fallback.status ?? "pending",
    createdAt: payload.createdAt ?? fallback.createdAt ?? new Date().toISOString(),
    publishedAt: payload.publishedAt ?? fallback.publishedAt ?? null,
    violationNotes: String(payload.violationNotes ?? fallback.violationNotes ?? ""),
    tags: normalizeTagList(payload.tags ?? fallback.tags ?? []),
    rating: Number.isFinite(Number(payload.rating)) ? Number(payload.rating) : Number(fallback.rating ?? 0),
    mediaNames: Array.isArray(payload.mediaNames)
      ? payload.mediaNames.map((item) => String(item).trim()).filter(Boolean)
      : Array.isArray(fallback.mediaNames)
        ? fallback.mediaNames
        : [],
    restaurantSnapshot,
    comments: Array.isArray(payload.comments)
      ? payload.comments.map((comment) => normalizeCommentInput(comment, comment))
      : Array.isArray(fallback.comments)
        ? fallback.comments.map((comment) => normalizeCommentInput(comment, comment))
        : [],
    moderationHistory: Array.isArray(payload.moderationHistory)
      ? payload.moderationHistory
      : Array.isArray(fallback.moderationHistory)
        ? fallback.moderationHistory
        : [],
  };
}

function normalizeUserInput(payload = {}, fallback = {}) {
  const nextStatus = VALID_USER_STATUS.has(payload.status) ? payload.status : fallback.status ?? STATUS_ACTIVE;

  return {
    ...fallback,
    ...payload,
    id: Number(payload.id ?? fallback.id),
    name: String(payload.name ?? fallback.name ?? "Nguoi dung"),
    email: String(payload.email ?? fallback.email ?? ""),
    role: payload.role ?? fallback.role ?? "user",
    status: nextStatus,
    lastActive: payload.lastActive ?? fallback.lastActive ?? new Date().toISOString(),
    riskScore: Number.isFinite(Number(payload.riskScore)) ? Number(payload.riskScore) : Number(fallback.riskScore ?? 0),
    abnormalFlags: Array.isArray(payload.abnormalFlags)
      ? payload.abnormalFlags
      : Array.isArray(fallback.abnormalFlags)
        ? fallback.abnormalFlags
        : [],
    lastAction: payload.lastAction ?? fallback.lastAction ?? "",
  };
}

function countByTag(items, getTags, limit = 5) {
  const counts = new Map();

  items.forEach((item) => {
    const tags = getTags(item) || [];
    tags.forEach((tag) => {
      const normalized = normalizeText(tag);
      if (!normalized) return;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    });
  });

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildPostTags(snapshot = {}, fallbackTags = []) {
  return normalizeTagList([
    ...(fallbackTags || []),
    snapshot.category || "",
    ...(snapshot.menuHighlights || []),
    snapshot.area || "",
  ]);
}

let restaurantsStore = readStore(STORAGE_KEYS.restaurants, adminRestaurantsSeed).map((restaurant) =>
  normalizeRestaurantInput(restaurant, restaurant),
);
let postsStore = readStore(STORAGE_KEYS.posts, initialPosts).map((post) => normalizePostInput(post, post));
let usersStore = readStore(STORAGE_KEYS.users, initialUsers).map((user) => normalizeUserInput(user, user));
let notificationsStore = readStore(STORAGE_KEYS.notifications, initialNotifications);

let customRestaurantCounter = 1;
let postIdCounter = Math.max(100, ...postsStore.map((post) => Number(post.id) || 0)) + 1;
let moderationIdCounter =
  Math.max(
    1,
    ...postsStore.flatMap((post) =>
      (post.moderationHistory || []).map((entry) => {
        const numeric = Number(String(entry.id || "").replace(/[^0-9]/g, ""));
        return Number.isFinite(numeric) ? numeric : 0;
      }),
    ),
  ) + 1;
let notificationIdCounter = Math.max(500, ...notificationsStore.map((item) => Number(item.id) || 0)) + 1;
let commentIdCounter = Math.max(
  1000,
  ...postsStore.flatMap((post) =>
    (post.comments || []).map((comment) => {
      const numeric = Number(String(comment.id || "").replace(/[^0-9]/g, ""));
      return Number.isFinite(numeric) ? numeric : 0;
    }),
  ),
) + 1;

function persistRestaurants() {
  writeStore(STORAGE_KEYS.restaurants, restaurantsStore);
}

function persistPosts() {
  writeStore(STORAGE_KEYS.posts, postsStore);
}

function persistUsers() {
  writeStore(STORAGE_KEYS.users, usersStore);
}

function persistNotifications() {
  writeStore(STORAGE_KEYS.notifications, notificationsStore);
}

function createCustomRestaurantId() {
  const next = customRestaurantCounter;
  customRestaurantCounter += 1;
  return `custom_${Date.now()}_${next}`;
}

function getTopViewedRestaurants(limit = 3) {
  return [...restaurantsStore]
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
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

function getTopRecommendedDishes(limit = 5) {
  const fromRestaurants = countByTag(restaurantsStore, (restaurant) => restaurant.tags, limit * 2);
  const fromPosts = countByTag(postsStore, (post) => post.tags, limit * 2);
  const merged = new Map();

  [...fromRestaurants, ...fromPosts].forEach((item) => {
    merged.set(item.name, (merged.get(item.name) ?? 0) + item.count);
  });

  return [...merged.entries()]
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
  const pendingPosts = postsStore.filter((post) => post.status === "pending").length;
  const restrictedUsers = usersStore.filter((user) => user.status === STATUS_LOCKED || user.status === STATUS_BANNED).length;
  const unreadNotifications = notificationsStore.filter((item) => item.status !== "read").length;
  const topAreas = getTopAreas(3);

  return {
    weekRange,
    datasetSource: SOURCE_DATASET,
    pendingPosts,
    hiddenRestaurants: summary.hiddenRestaurants,
    restrictedUsers,
    unreadNotifications,
    totalRestaurants: summary.totalRestaurants,
    totalReviews: summary.totalReviews,
    totalViews: summary.totalViews,
    ratingAverage: Number(summary.ratingAverage.toFixed(2)),
    topViewedRestaurants: getTopViewedRestaurants(3),
    topRecommendedDishes: getTopRecommendedDishes(3),
    topAreas,
    hotAreas: topAreas.map((item) => ({
      name: item.name,
      score: Math.min(100, item.count * 30),
    })),
  };
}

function pushNotification({ type, targetUserId, message }) {
  const notification = {
    id: notificationIdCounter,
    type,
    targetUserId: Number(targetUserId || 0),
    message,
    createdAt: new Date().toISOString(),
    status: "unread",
  };

  notificationIdCounter += 1;
  notificationsStore = [notification, ...notificationsStore];
  persistNotifications();
  return notification;
}

function appendModerationHistory(post, action, note = "") {
  const entry = {
    id: `mh-${moderationIdCounter}`,
    action,
    by: "Admin Team",
    at: new Date().toISOString(),
    note: note || "Cap nhat moderation",
  };

  moderationIdCounter += 1;
  return [...(post.moderationHistory || []), entry];
}

function findRestaurantBySnapshot(snapshot = {}, restaurantId = null) {
  const lookupId = restaurantId ? String(restaurantId) : null;
  const normalizedName = normalizeText(snapshot.name);
  const normalizedAddress = normalizeText(snapshot.address);

  return (
    restaurantsStore.find((restaurant) => String(restaurant.id) === lookupId) ||
    restaurantsStore.find((restaurant) => {
      const sameName = normalizedName && normalizeText(restaurant.name) === normalizedName;
      const sameAddress = normalizedAddress && normalizeText(restaurant.address) === normalizedAddress;
      return sameName && (!normalizedAddress || sameAddress);
    }) ||
    null
  );
}

function applyRatingToRestaurant(restaurant, rating, snapshot = {}) {
  if (!restaurant || !Number.isFinite(Number(rating)) || Number(rating) <= 0) {
    return restaurant;
  }

  const currentTotal = Number(restaurant.totalReviews || 0);
  const nextTotal = currentTotal + 1;
  const weightedRating = ((Number(restaurant.rating || 0) * currentTotal) + Number(rating)) / nextTotal;

  return normalizeRestaurantInput(
    {
      ...restaurant,
      rating: Number(weightedRating.toFixed(1)),
      totalReviews: nextTotal,
      address: snapshot.address || restaurant.address,
      image: snapshot.image || restaurant.image,
      time: snapshot.time || restaurant.time,
      category: snapshot.category || restaurant.category,
      area: snapshot.area || restaurant.area,
      priceLevel: snapshot.priceLevel || restaurant.priceLevel,
      menuHighlights:
        snapshot.menuHighlights?.length ? snapshot.menuHighlights : restaurant.menuHighlights || [],
      tags: normalizeTagList([...(restaurant.tags || []), ...buildPostTags(snapshot)]),
      hidden: false,
      sourceSyncStatus: "manual",
      lastSyncedAt: new Date().toISOString(),
    },
    restaurant,
  );
}

function ensureRestaurantForApprovedPost(post) {
  const snapshot = normalizeRestaurantDraft(post.restaurantSnapshot ?? {}, {});
  const matched = findRestaurantBySnapshot(snapshot, post.restaurantId);
  const nextTags = normalizeTagList([...(post.tags || []), ...buildPostTags(snapshot)]);

  if (matched) {
    const nextRestaurant = applyRatingToRestaurant(
      normalizeRestaurantInput(
        {
          ...matched,
          address: snapshot.address || matched.address,
          image: snapshot.image || matched.image,
          time: snapshot.time || matched.time,
          category: snapshot.category || matched.category,
          area: snapshot.area || matched.area,
          priceLevel: snapshot.priceLevel || matched.priceLevel,
          menuHighlights:
            snapshot.menuHighlights.length > 0 ? snapshot.menuHighlights : matched.menuHighlights || [],
          tags: normalizeTagList([...(matched.tags || []), ...nextTags]),
          hidden: false,
          sourceSyncStatus: "manual",
          lastSyncedAt: new Date().toISOString(),
        },
        matched,
      ),
      post.rating,
      snapshot,
    );

    restaurantsStore = restaurantsStore.map((restaurant) =>
      String(restaurant.id) === String(matched.id) ? nextRestaurant : restaurant,
    );
    persistRestaurants();
    return nextRestaurant;
  }

  const created = normalizeRestaurantInput(
    {
      id: createCustomRestaurantId(),
      name: snapshot.name || post.title,
      area: snapshot.area || pickAreaFromAddress(snapshot.address),
      category: snapshot.category || "Cong dong de xuat",
      priceLevel: snapshot.priceLevel || "",
      hidden: false,
      views: 0,
      tags: nextTags,
      sourceSyncStatus: "manual",
      lastSyncedAt: new Date().toISOString(),
      rating: Number(post.rating || 0),
      totalReviews: Number(post.rating || 0) > 0 ? 1 : 0,
      address: snapshot.address || "",
      image: snapshot.image || "",
      time: snapshot.time || "Chua cap nhat",
      menuHighlights: snapshot.menuHighlights,
    },
    {},
  );

  restaurantsStore = [created, ...restaurantsStore];
  persistRestaurants();
  return created;
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
      normalizeText(restaurant.address).includes(query) ||
      normalizeText((restaurant.tags ?? []).join(" ")).includes(query);

    const byArea = area === "all" ? true : normalizeText(restaurant.area) === normalizeText(area);
    const byHidden = hidden === "all" ? true : hidden === "hidden" ? Boolean(restaurant.hidden) : !restaurant.hidden;

    return byQuery && byArea && byHidden;
  });

  return filtered
    .slice()
    .sort((a, b) => Number(b.views || 0) - Number(a.views || 0))
    .map((restaurant) => clone(restaurant));
}

export async function createRestaurant(payload = {}) {
  await wait();

  const created = normalizeRestaurantInput(payload, {
    id: createCustomRestaurantId(),
    sourceSyncStatus: "manual",
    lastSyncedAt: new Date().toISOString(),
  });

  restaurantsStore = [created, ...restaurantsStore];
  persistRestaurants();

  return clone(created);
}

export async function updateRestaurant(id, payload = {}) {
  await wait();

  const lookupId = String(id);

  restaurantsStore = restaurantsStore.map((restaurant) =>
    String(restaurant.id) === lookupId
      ? normalizeRestaurantInput(payload, {
          ...restaurant,
          id: lookupId,
          sourceSyncStatus: "manual",
          lastSyncedAt: new Date().toISOString(),
        })
      : restaurant,
  );

  persistRestaurants();
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

  persistRestaurants();
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

  persistRestaurants();
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

  persistRestaurants();

  return {
    syncedAt,
    created,
    updated,
    total: restaurantsStore.length,
  };
}

export async function listPosts(filters = {}) {
  await wait();

  const status = filters.status ?? "all";
  const query = normalizeText(filters.query);
  const restaurantId =
    filters.restaurantId !== undefined && filters.restaurantId !== null ? String(filters.restaurantId) : null;

  const filtered = postsStore.filter((post) => {
    const byStatus = status === "all" ? true : post.status === status;
    const byRestaurant = restaurantId ? String(post.restaurantId) === restaurantId : true;
    const byQuery =
      !query ||
      normalizeText(post.title).includes(query) ||
      normalizeText(post.author).includes(query) ||
      normalizeText(post.content).includes(query) ||
      normalizeText(post.restaurantSnapshot?.name).includes(query) ||
      normalizeText(post.restaurantSnapshot?.address).includes(query);

    return byStatus && byRestaurant && byQuery;
  });

  return filtered
    .slice()
    .sort((a, b) => new Date(b.publishedAt || b.createdAt).getTime() - new Date(a.publishedAt || a.createdAt).getTime())
    .map((post) => clone(post));
}

export async function submitPostForModeration(payload = {}) {
  await wait();

  const snapshot = normalizeRestaurantDraft(payload.restaurantSnapshot ?? payload, {});
  const restaurant = findRestaurantBySnapshot(snapshot, payload.restaurantId);
  const author = payload.author || "Nguoi dung";
  const createdAt = new Date().toISOString();

  const nextPost = normalizePostInput(
    {
      id: postIdCounter,
      title: payload.title || `Review ${snapshot.name || restaurant?.name || "quan moi"}`,
      content: payload.content || "",
      author,
      authorId: Number(payload.authorId || 0),
      restaurantId: restaurant?.id ?? (payload.restaurantId ? String(payload.restaurantId) : null),
      status: "pending",
      createdAt,
      publishedAt: null,
      violationNotes: "",
      tags: payload.tags || buildPostTags(snapshot, restaurant?.tags || []),
      rating: Number(payload.rating || 0),
      mediaNames: payload.mediaNames || [],
      restaurantSnapshot: {
        ...snapshot,
        name: snapshot.name || restaurant?.name || "",
        address: snapshot.address || restaurant?.address || "",
        area: snapshot.area || restaurant?.area || pickAreaFromAddress(snapshot.address || restaurant?.address),
        category: snapshot.category || restaurant?.category || "",
        priceLevel: snapshot.priceLevel || restaurant?.priceLevel || "",
        time: snapshot.time || restaurant?.time || "",
        image: snapshot.image || restaurant?.image || "",
      },
      comments: [],
      moderationHistory: [
        {
          id: `mh-${moderationIdCounter}`,
          action: "submitted",
          by: author,
          at: createdAt,
          note: "Gui bai cho he thong",
        },
      ],
    },
    {},
  );

  postIdCounter += 1;
  moderationIdCounter += 1;

  postsStore = [nextPost, ...postsStore];
  persistPosts();

  return clone(nextPost);
}

export async function approvePost(postId) {
  await wait();

  const lookupId = String(postId);
  const target = postsStore.find((post) => String(post.id) === lookupId);
  if (!target) return null;

  const resolvedRestaurant = ensureRestaurantForApprovedPost(target);
  let updatedPost = null;

  postsStore = postsStore.map((post) => {
    if (String(post.id) !== lookupId) return post;

    updatedPost = normalizePostInput(
      {
        ...post,
        restaurantId: resolvedRestaurant?.id ?? post.restaurantId,
        restaurantSnapshot: {
          ...post.restaurantSnapshot,
          name: resolvedRestaurant?.name || post.restaurantSnapshot?.name || "",
          address: resolvedRestaurant?.address || post.restaurantSnapshot?.address || "",
          area: resolvedRestaurant?.area || post.restaurantSnapshot?.area || "",
          category: resolvedRestaurant?.category || post.restaurantSnapshot?.category || "",
          priceLevel: resolvedRestaurant?.priceLevel || post.restaurantSnapshot?.priceLevel || "",
          time: resolvedRestaurant?.time || post.restaurantSnapshot?.time || "",
          image: resolvedRestaurant?.image || post.restaurantSnapshot?.image || "",
          menuHighlights: resolvedRestaurant?.menuHighlights || post.restaurantSnapshot?.menuHighlights || [],
        },
        status: "approved",
        publishedAt: post.publishedAt || new Date().toISOString(),
        violationNotes: "",
        moderationHistory: appendModerationHistory(post, "approved", "Bai dang dat tieu chuan"),
      },
      post,
    );

    return updatedPost;
  });

  persistPosts();

  if (updatedPost) {
    pushNotification({
      type: "post_approved",
      targetUserId: updatedPost.authorId,
      message: `Bai '${updatedPost.title}' da duoc duyet.`,
    });
  }

  return clone(updatedPost);
}

export async function rejectPost(postId, note = "") {
  await wait();

  const lookupId = String(postId);
  let updatedPost = null;

  postsStore = postsStore.map((post) => {
    if (String(post.id) !== lookupId) return post;

    const rejectionNote = note || post.violationNotes || "Noi dung can bo sung thong tin";

    updatedPost = {
      ...post,
      status: "rejected",
      violationNotes: rejectionNote,
      moderationHistory: appendModerationHistory(post, "rejected", rejectionNote),
    };

    return updatedPost;
  });

  persistPosts();

  if (updatedPost) {
    pushNotification({
      type: "post_rejected",
      targetUserId: updatedPost.authorId,
      message: `Bai '${updatedPost.title}' bi tu choi: ${updatedPost.violationNotes}`,
    });
  }

  return clone(updatedPost);
}

export async function updatePost(postId, payload = {}) {
  await wait();

  const lookupId = String(postId);
  let updatedPost = null;

  postsStore = postsStore.map((post) => {
    if (String(post.id) !== lookupId) return post;

    updatedPost = normalizePostInput(
      {
        ...post,
        ...payload,
        moderationHistory: appendModerationHistory(post, "updated", "Cap nhat thong tin moderation"),
      },
      post,
    );

    return updatedPost;
  });

  persistPosts();
  return clone(updatedPost);
}

export async function attachTagsToPost(postId, tagsInput) {
  await wait();

  const lookupId = String(postId);
  let updatedPost = null;

  postsStore = postsStore.map((post) => {
    if (String(post.id) !== lookupId) return post;

    updatedPost = {
      ...post,
      tags: normalizeTagList(tagsInput),
      moderationHistory: appendModerationHistory(post, "tagged", "Cap nhat tag bai dang"),
    };

    return updatedPost;
  });

  persistPosts();
  return clone(updatedPost);
}

export async function addCommentToPost(postId, payload = {}) {
  await wait();

  const lookupId = String(postId);
  let updatedPost = null;

  postsStore = postsStore.map((post) => {
    if (String(post.id) !== lookupId || post.status !== "approved") return post;

    const nextComment = normalizeCommentInput(
      {
        id: `comment-${commentIdCounter}`,
        author: payload.author || "Nguoi dung",
        authorId: Number(payload.authorId || 0),
        content: payload.content || "",
        rating: Number(payload.rating || 0),
        createdAt: new Date().toISOString(),
      },
      {},
    );

    commentIdCounter += 1;
    updatedPost = normalizePostInput(
      {
        ...post,
        comments: [...(post.comments || []), nextComment],
      },
      post,
    );

    return updatedPost;
  });

  if (!updatedPost) {
    return null;
  }

  const matchedRestaurant = findRestaurantBySnapshot(updatedPost.restaurantSnapshot, updatedPost.restaurantId);
  if (matchedRestaurant && Number(payload.rating || 0) > 0) {
    const nextRestaurant = applyRatingToRestaurant(matchedRestaurant, payload.rating, updatedPost.restaurantSnapshot);
    restaurantsStore = restaurantsStore.map((restaurant) =>
      String(restaurant.id) === String(matchedRestaurant.id) ? nextRestaurant : restaurant,
    );
    persistRestaurants();
  }

  persistPosts();
  return clone(updatedPost);
}

export async function listUsers(filters = {}) {
  await wait();

  const status = filters.status ?? "all";
  const query = normalizeText(filters.query);

  const filtered = usersStore.filter((user) => {
    const byStatus = status === "all" ? true : user.status === status;
    const byQuery =
      !query || normalizeText(user.name).includes(query) || normalizeText(user.email).includes(query);

    return byStatus && byQuery;
  });

  return filtered
    .slice()
    .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))
    .map((user) => clone(user));
}

export async function listUserRiskSignals(limit = 6) {
  await wait();

  const risky = usersStore
    .filter((user) => Number(user.riskScore || 0) >= 50 || (user.abnormalFlags || []).length > 0)
    .sort((a, b) => Number(b.riskScore || 0) - Number(a.riskScore || 0))
    .slice(0, limit)
    .map((user) => ({
      userId: user.id,
      name: user.name,
      riskScore: Number(user.riskScore || 0),
      lastAction: user.lastAction || "Khong co du lieu",
    }));

  return clone(risky);
}

export async function updateUserStatus(userId, status) {
  await wait();

  if (!VALID_USER_STATUS.has(status)) {
    return null;
  }

  const lookupId = String(userId);
  let updatedUser = null;

  usersStore = usersStore.map((user) => {
    if (String(user.id) !== lookupId) return user;

    const statusLabel = status === STATUS_ACTIVE ? "Mo khoa tai khoan" : status === STATUS_LOCKED ? "Tam khoa tai khoan" : "Cam tai khoan";

    updatedUser = {
      ...user,
      status,
      lastActive: new Date().toISOString(),
      lastAction: statusLabel,
    };

    return updatedUser;
  });

  persistUsers();

  if (updatedUser && updatedUser.role !== "admin") {
    const notificationType =
      status === STATUS_ACTIVE ? "account_unlocked" : status === STATUS_LOCKED ? "account_locked" : "account_banned";
    const message =
      status === STATUS_ACTIVE
        ? "Tai khoan cua ban da duoc mo khoa."
        : status === STATUS_LOCKED
          ? "Tai khoan cua ban tam thoi bi khoa."
          : "Tai khoan cua ban da bi cam do vi pham chinh sach.";

    pushNotification({
      type: notificationType,
      targetUserId: updatedUser.id,
      message,
    });
  }

  return clone(updatedUser);
}

export async function listNotifications(filters = {}) {
  await wait();

  const unreadOnly = Boolean(filters.unreadOnly);
  const targetUserId = filters.targetUserId !== undefined ? Number(filters.targetUserId) : null;

  const filtered = notificationsStore.filter((notification) => {
    const byUnread = unreadOnly ? notification.status !== "read" : true;
    const byUser = targetUserId === null ? true : Number(notification.targetUserId) === targetUserId;
    return byUnread && byUser;
  });

  return filtered
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((item) => clone(item));
}

export async function markNotificationRead(notificationId) {
  await wait();

  const lookupId = String(notificationId);
  let updatedNotification = null;

  notificationsStore = notificationsStore.map((item) => {
    if (String(item.id) !== lookupId) return item;

    updatedNotification = {
      ...item,
      status: "read",
    };

    return updatedNotification;
  });

  persistNotifications();
  return clone(updatedNotification);
}
