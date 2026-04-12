import data3 from "../../data/data3.json";

export const SOURCE_DATASET = "data3.json";
const DATA3_SYNC_AT = "2026-04-11T00:00:00.000Z";
const DEFAULT_COORDS = { lat: 10.776889, lng: 106.700806 };
const TRENDING_LIMIT = 4;
const VIEW_MULTIPLIER = 12;
const DISTANCE_START_KM = 0.8;
const DISTANCE_STEP_KM = 0.6;

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

function slugify(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function pickAreaFromAddress(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 2) {
    return parts[1];
  }

  return "Khac";
}

function createTags(item) {
  const categoryTags = String(item.category ?? "")
    .split(/[/,&]/)
    .map((segment) => slugify(segment))
    .filter(Boolean);

  const menuTags = (item.menuHighlights ?? [])
    .slice(0, 4)
    .map((dish) => slugify(dish))
    .filter(Boolean);

  return [...new Set([...categoryTags, ...menuTags])];
}

function mapReviews(itemId, reviewsInput) {
  return (reviewsInput ?? []).map((review, index) => {
    const author = review?.author || `User ${index + 1}`;
    const content = review?.content || "";
    const rating = toNumber(review?.rating, 0);

    return {
      id: `${itemId}-review-${index + 1}`,
      author,
      user: author,
      text: content,
      comment: content,
      rating,
      badge: review?.badge ?? "",
      timeAgo: review?.timeAgo ?? "",
      subRatings: review?.subRatings ?? null,
    };
  });
}

const workingItems = Array.isArray(data3) ? data3 : [];

const sortedByTrend = [...workingItems].sort((a, b) => {
  const aScore = toNumber(a.rating) * 1000 + toNumber(a.totalReviews);
  const bScore = toNumber(b.rating) * 1000 + toNumber(b.totalReviews);
  return bScore - aScore;
});

const trendingIdSet = new Set(sortedByTrend.slice(0, TRENDING_LIMIT).map((item) => String(item.id)));

export const homePlaces = workingItems.map((item, index) => {
  const address = item?.location?.address ?? "";
  const area = pickAreaFromAddress(address);
  const distance = Number((DISTANCE_START_KM + index * DISTANCE_STEP_KM).toFixed(1));
  const reviews = mapReviews(item.id, item.reviews);

  return {
    id: String(item.id),
    name: item.name ?? `Restaurant ${index + 1}`,
    category: item.category ?? "Unknown",
    area,
    address,
    time: item?.operatingHours?.status || "Chưa cập nhật",
    rating: toNumber(item.rating, 0),
    reviewCount: toNumber(item.totalReviews, reviews.length),
    priceLevel: item.priceLevel ?? "",
    distance,
    isTrending: trendingIdSet.has(String(item.id)),
    image: item.imageUrl || "",
    images: item.imageUrl ? [item.imageUrl] : [],
    reviews,
    location: item.location ?? {},
    contact: item.contact ?? {},
    menuHighlights: Array.isArray(item.menuHighlights) ? item.menuHighlights : [],
    coords: item.coords ?? DEFAULT_COORDS,
  };
});

export const adminRestaurantsSeed = homePlaces.map((place) => ({
  id: String(place.id),
  name: place.name,
  area: place.area || "Khac",
  category: place.category || "Unknown",
  priceLevel: place.priceLevel || "",
  hidden: false,
  views: Math.max(1, Math.round(place.reviewCount * VIEW_MULTIPLIER)),
  tags: createTags(place),
  sourceSyncStatus: "seed-data3",
  lastSyncedAt: DATA3_SYNC_AT,
  rating: place.rating,
  totalReviews: place.reviewCount,
  address: place.address,
  image: place.image,
  time: place.time,
}));

export function createRelatedPostsFromData(limit = 3) {
  return homePlaces.slice(0, limit).map((place, index) => ({
    id: `related-${index + 1}-${place.id}`,
    title: `Review ${place.name}`,
    author: place.reviews[0]?.author || "FoodFinder User",
    excerpt: `${place.name} - ${place.category} - ${place.area}`,
  }));
}

export function createReviewsForRestaurant(restaurantId, limit = 5) {
  const match = homePlaces.find((place) => String(place.id) === String(restaurantId));
  return (match?.reviews ?? []).slice(0, limit).map((review) => ({
    id: review.id,
    author: review.author,
    rating: review.rating,
    text: review.text,
  }));
}
