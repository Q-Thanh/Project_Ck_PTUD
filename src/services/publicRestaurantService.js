import data3 from "../../data/data3.json";
import { addCommentToPost, listPosts } from "./adminService";

const NETWORK_DELAY_MS = 180;
const DEFAULT_DISTANCE_START = 0.8;
const DEFAULT_DISTANCE_STEP = 0.5;

function wait(ms = NETWORK_DELAY_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  return parts[0] || "Khác";
}

function buildShortAddress(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 2).join(", ") || String(address ?? "");
}

function ensureExternalUrl(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function buildMapsUrl(address, plusCode) {
  const query = String(address || plusCode || "").trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function buildPhoneUrl(phone) {
  const normalized = String(phone ?? "")
    .replace(/[^\d+]/g, "")
    .trim();

  return normalized ? `tel:${normalized}` : "";
}

function buildClosingLabel(status, closingTime) {
  if (status && closingTime) {
    return `${status} - Đóng cửa vào ${closingTime}`;
  }

  return status || "Chưa cập nhật";
}

function extractPriceValue(priceLevel) {
  const numbers = String(priceLevel ?? "").match(/\d[\d.]*/g);
  if (!numbers?.length) return Number.MAX_SAFE_INTEGER;
  const numeric = Number(numbers[0].replace(/\./g, ""));
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function mapReview(review, restaurantId, index) {
  return {
    id: `${restaurantId}-official-review-${index + 1}`,
    author: String(review?.author ?? "Người dùng"),
    badge: String(review?.badge ?? ""),
    rating: Number(review?.rating ?? 0),
    timeAgo: String(review?.timeAgo ?? ""),
    content: String(review?.content ?? ""),
    subRatings:
      review?.subRatings && typeof review.subRatings === "object"
        ? {
            food: Number(review.subRatings.food ?? 0),
            service: Number(review.subRatings.service ?? 0),
            atmosphere: Number(review.subRatings.atmosphere ?? 0),
          }
        : null,
    source: "data3",
  };
}

function mapRestaurant(item, index) {
  const address = item?.location?.address || "";
  const plusCode = item?.location?.plusCode || "";
  const website = ensureExternalUrl(item?.contact?.website || "");
  const phone = String(item?.contact?.phone || "").trim();
  const mapsUrl = buildMapsUrl(address, plusCode);
  const phoneUrl = buildPhoneUrl(phone);
  const serviceOptions = Array.isArray(item?.features?.serviceOptions) ? item.features.serviceOptions : [];
  const diningOptions = Array.isArray(item?.features?.diningOptions) ? item.features.diningOptions : [];
  const sortDistance = Number((DEFAULT_DISTANCE_START + index * DEFAULT_DISTANCE_STEP).toFixed(1));

  return {
    id: String(item?.id ?? ""),
    name: String(item?.name ?? ""),
    category: String(item?.category ?? ""),
    rating: Number(item?.rating ?? 0),
    reviewCount: Number(item?.totalReviews ?? 0),
    priceLevel: String(item?.priceLevel ?? ""),
    priceValue: extractPriceValue(item?.priceLevel),
    image: String(item?.imageUrl ?? ""),
    images: item?.imageUrl ? [item.imageUrl] : [],
    address,
    shortAddress: buildShortAddress(address),
    area: pickAreaFromAddress(address),
    plusCode,
    website,
    phone,
    phoneUrl,
    mapsUrl,
    reservationUrl: website || mapsUrl || phoneUrl,
    openStatus: String(item?.operatingHours?.status ?? ""),
    closingTime: String(item?.operatingHours?.closingTime ?? ""),
    closingLabel: buildClosingLabel(item?.operatingHours?.status ?? "", item?.operatingHours?.closingTime ?? ""),
    features: item?.features ?? {},
    serviceOptions,
    serviceOptionsMain: serviceOptions.slice(0, 5),
    diningOptions,
    menuHighlights: Array.isArray(item?.menuHighlights) ? item.menuHighlights : [],
    reviews: Array.isArray(item?.reviews) ? item.reviews.map((review, reviewIndex) => mapReview(review, item.id, reviewIndex)) : [],
    distance: sortDistance,
    isTrending: false,
  };
}

const rawRestaurants = Array.isArray(data3) ? data3 : [];
const baseRestaurants = rawRestaurants
  .map((item, index) => mapRestaurant(item, index))
  .sort((left, right) => {
    const leftScore = Number(left.rating || 0) * 1000 + Number(left.reviewCount || 0);
    const rightScore = Number(right.rating || 0) * 1000 + Number(right.reviewCount || 0);
    return rightScore - leftScore;
  })
  .map((restaurant, index) => ({
    ...restaurant,
    distance: Number((DEFAULT_DISTANCE_START + index * DEFAULT_DISTANCE_STEP).toFixed(1)),
    isTrending: index < 4,
  }));

function findRestaurantById(restaurantId) {
  return baseRestaurants.find((restaurant) => String(restaurant.id) === String(restaurantId)) || null;
}

function matchPostToRestaurant(post, restaurant) {
  if (!restaurant) return false;

  if (String(post.restaurantId || "") === String(restaurant.id)) {
    return true;
  }

  const snapshotName = normalizeText(post.restaurantSnapshot?.name);
  const snapshotAddress = normalizeText(post.restaurantSnapshot?.address);

  return (
    snapshotName &&
    snapshotName === normalizeText(restaurant.name) &&
    (!snapshotAddress || snapshotAddress === normalizeText(restaurant.address))
  );
}

function mapCommunityPost(post, restaurant) {
  return {
    ...post,
    restaurantId: restaurant?.id || post.restaurantId || null,
    restaurantName: restaurant?.name || post.restaurantSnapshot?.name || "Quán cộng đồng",
    excerpt: post.content || post.title,
    comments: Array.isArray(post.comments) ? post.comments : [],
    isFallback: false,
  };
}

export async function fetchVisibleRestaurants(filters = {}) {
  await wait();

  const query = normalizeText(filters.query);
  const area = normalizeText(filters.area);
  const category = normalizeText(filters.category);

  return baseRestaurants
    .filter((restaurant) => {
      const matchesQuery =
        !query ||
        normalizeText(restaurant.name).includes(query) ||
        normalizeText(restaurant.category).includes(query) ||
        normalizeText(restaurant.address).includes(query);
      const matchesArea = !area || normalizeText(restaurant.area) === area;
      const matchesCategory = !category || normalizeText(restaurant.category) === category;
      return matchesQuery && matchesArea && matchesCategory;
    })
    .map((restaurant) => ({
      ...restaurant,
      images: [...restaurant.images],
      serviceOptions: [...restaurant.serviceOptions],
      serviceOptionsMain: [...restaurant.serviceOptionsMain],
      diningOptions: [...restaurant.diningOptions],
      menuHighlights: [...restaurant.menuHighlights],
      reviews: restaurant.reviews.map((review) => ({ ...review })),
      features: JSON.parse(JSON.stringify(restaurant.features)),
    }));
}

export async function fetchVisibleRestaurantById(restaurantId) {
  await wait();
  const restaurant = findRestaurantById(restaurantId);
  return restaurant
    ? {
        ...restaurant,
        images: [...restaurant.images],
        serviceOptions: [...restaurant.serviceOptions],
        serviceOptionsMain: [...restaurant.serviceOptionsMain],
        diningOptions: [...restaurant.diningOptions],
        menuHighlights: [...restaurant.menuHighlights],
        reviews: restaurant.reviews.map((review) => ({ ...review })),
        features: JSON.parse(JSON.stringify(restaurant.features)),
      }
    : null;
}

export async function fetchRestaurantReviews(restaurantId) {
  await wait();
  const restaurant = findRestaurantById(restaurantId);
  return restaurant
    ? restaurant.reviews.map((review) => ({
        ...review,
        subRatings: review.subRatings ? { ...review.subRatings } : null,
      }))
    : [];
}

export async function fetchApprovedPostsForRestaurant(restaurantId) {
  await wait();

  const restaurant = findRestaurantById(restaurantId);
  if (!restaurant) return [];

  const approvedPosts = await listPosts({ status: "approved" });

  return approvedPosts
    .filter((post) => matchPostToRestaurant(post, restaurant))
    .sort((left, right) => new Date(right.publishedAt || right.createdAt).getTime() - new Date(left.publishedAt || left.createdAt).getTime())
    .map((post) => mapCommunityPost(post, restaurant));
}

export async function fetchCommunityHighlights(limit = 3) {
  await wait();

  const approvedPosts = await listPosts({ status: "approved" });

  return approvedPosts
    .map((post) => {
      const matchedRestaurant =
        findRestaurantById(post.restaurantId) ||
        baseRestaurants.find((restaurant) => matchPostToRestaurant(post, restaurant));

      if (!matchedRestaurant) {
        return null;
      }

      return {
        id: post.id,
        title: post.title || matchedRestaurant.name,
        author: post.author,
        excerpt: post.content,
        rating: Number(post.rating || 0),
        restaurantId: matchedRestaurant.id,
        restaurantName: matchedRestaurant.name,
        createdAt: post.publishedAt || post.createdAt,
      };
    })
    .filter(Boolean)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
    .slice(0, limit);
}

export async function submitCommentForApprovedPost(postId, payload = {}) {
  await wait(120);
  return addCommentToPost(postId, payload);
}
