import { apiRequest } from "./apiClient";

async function safeRequest(executor, fallback) {
  try {
    return await executor();
  } catch {
    return fallback;
  }
}

export async function fetchVisibleRestaurants(filters = {}) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/restaurants", { params: filters });
      return data.items || [];
    },
    [],
  );
}

export async function fetchVisibleRestaurantById(restaurantId) {
  return safeRequest(
    async () => {
      const data = await apiRequest(`/api/restaurants/${restaurantId}`);
      return data.item || null;
    },
    null,
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
      return data.items || [];
    },
    [],
  );
}

export async function fetchDecisionRestaurant({ lat, lng, radiusKm = 5 }) {
  return safeRequest(
    async () => {
      const data = await apiRequest("/api/restaurants/decision", {
        params: { lat, lng, radiusKm },
      });
      return data.item || null;
    },
    null,
  );
}
