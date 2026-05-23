import { apiRequest } from "./apiClient";
import { fetchRestaurantById, fetchRestaurants } from "./restaurantService";

function toMapsUrl(address) {
  const query = String(address || "").trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function normalizeLocalRestaurant(item) {
  if (!item) return null;
  const openLabel = item.openStatus || item.time || "";
  return {
    ...item,
    shortAddress: item.shortAddress || String(item.address || "").split(",").slice(0, 2).join(", "),
    closingLabel: item.closingLabel || openLabel || "Chưa cập nhật",
    mapsUrl: item.mapsUrl || toMapsUrl(item.address),
    priceValue: item.priceValue || Number.MAX_SAFE_INTEGER,
    distance: Number(item.distance || 0),
  };
}

function distanceKm(from, to) {
  if (!from || !to) return Number.MAX_SAFE_INTEGER;
  const lat1 = Number(from.lat);
  const lng1 = Number(from.lng);
  const lat2 = Number(to.lat);
  const lng2 = Number(to.lng);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Number.MAX_SAFE_INTEGER;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthKm * Math.asin(Math.sqrt(a));
}

async function safeRequest(executor, fallback) {
  try {
    const data = await executor();
    return data;
  } catch {
    return typeof fallback === "function" ? fallback() : fallback;
  }
}

export async function fetchVisibleRestaurants(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/restaurants", { params: filters });
      const items = data.items || [];
      return items.length ? items : await fetchLocalVisibleRestaurants(filters);
    },
    () => fetchLocalVisibleRestaurants(filters),
  );
}

export async function fetchVisibleRestaurantById(restaurantId) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/restaurants/${restaurantId}`);
      return data.item || (await fetchLocalRestaurantById(restaurantId));
    },
    () => fetchLocalRestaurantById(restaurantId),
  );
}

export async function fetchRestaurantReviews(restaurantId) {
  const restaurant = await fetchVisibleRestaurantById(restaurantId);
  return (restaurant?.reviews || []).map((review, index) => ({
    id: review.id || `${restaurantId}-official-review-${index + 1}`,
    author: review.author || "Người dùng",
    badge: review.badge || "",
    rating: Number(review.rating || 0),
    timeAgo: review.timeAgo || "",
    content: review.content || "",
    subRatings: review.subRatings || null,
  }));
}

export async function fetchApprovedPostsForRestaurant(restaurantId) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/community/posts", {
        params: {
          status: "approved",
          restaurantId,
          page: 1,
          pageSize: 100,
        },
      });
      return data.items || [];
    },
    [],
  );
}

export async function fetchCommunityFeed(options = {}) {
  const page = options.page || 1;
  const pageSize = options.pageSize || 20;
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/community/posts", {
        params: {
          status: options.status || "approved",
          page,
          pageSize,
          query: options.query || "",
        },
      });
      return {
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
        total: data.total || 0,
        items: data.items || [],
      };
    },
    {
      page,
      pageSize,
      total: 0,
      items: [],
    },
  );
}

export async function fetchCommunityHighlights(limit = 3) {
  const feed = await fetchCommunityFeed({ page: 1, pageSize: Math.max(limit, 1), status: "approved" });
  return (feed.items || []).slice(0, limit).map((post) => ({
    id: post.id,
    title: post.title,
    author: post.author,
    excerpt: post.content,
    rating: Number(post.rating || 0),
    restaurantId: post.restaurantId,
    restaurantName: post.restaurantSnapshot?.name || "Quán cộng đồng",
    createdAt: post.publishedAt || post.createdAt,
  }));
}

export async function submitCommentForApprovedPost(postId, payload = {}) {
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

export async function fetchNearbyRestaurants({ lat, lng, radiusKm = 5, limit = 5 }) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/restaurants/nearby", {
        params: { lat, lng, radiusKm, limit },
      });
      const items = data.items || [];
      return items.length ? items : await fetchLocalNearbyRestaurants({ lat, lng, radiusKm, limit });
    },
    () => fetchLocalNearbyRestaurants({ lat, lng, radiusKm, limit }),
  );
}

export async function fetchDecisionRestaurant({ lat, lng, radiusKm = 5 }) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/restaurants/decision", {
        params: { lat, lng, radiusKm },
      });
      return data.item || (await fetchLocalDecisionRestaurant({ lat, lng, radiusKm }));
    },
    () => fetchLocalDecisionRestaurant({ lat, lng, radiusKm }),
  );
}

async function fetchLocalVisibleRestaurants(filters = {}) {
  const items = await fetchRestaurants(filters);
  return items.map(normalizeLocalRestaurant).filter(Boolean);
}

async function fetchLocalRestaurantById(restaurantId) {
  return normalizeLocalRestaurant(await fetchRestaurantById(restaurantId));
}

async function fetchLocalNearbyRestaurants({ lat, lng, radiusKm = 5, limit = 5 }) {
  const userCoords = { lat: Number(lat), lng: Number(lng) };
  const items = await fetchLocalVisibleRestaurants();
  return items
    .map((item) => {
      const distance = distanceKm(userCoords, item.coords);
      return { ...item, distance: Number.isFinite(distance) ? Number(distance.toFixed(2)) : item.distance };
    })
    .filter((item) => Number(item.distance) <= Number(radiusKm))
    .sort((left, right) => {
      const ratingDiff = Number(right.rating || 0) - Number(left.rating || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return Number(left.distance || 0) - Number(right.distance || 0);
    })
    .slice(0, Math.max(1, Number(limit || 5)));
}

async function fetchLocalDecisionRestaurant({ lat, lng, radiusKm = 5 }) {
  const candidates = await fetchLocalNearbyRestaurants({ lat, lng, radiusKm, limit: 5 });
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
