import data3 from "../../data/data3.json";
import {
  createRelatedPostsFromData,
  createReviewsForRestaurant,
  homePlaces,
} from "../data/data2Runtime";

function wait(ms = 300) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapData3Restaurant(item) {
  if (!item) return null;

  return {
    id: String(item.id),
    name: item.name || "",
    category: item.category || "",
    address: item.location?.address || "",
    time: item.operatingHours?.status || "",
    rating: Number(item.rating || 0),
    reviewCount: Number(item.totalReviews || 0),
    priceLevel: item.priceLevel || "",
    image: item.imageUrl || "",
    images: item.imageUrl ? [item.imageUrl] : [],
    reviews: item.reviews || [],
    coords: item.coords || { lat: 10.776889, lng: 106.700806 },
  };
}

export async function fetchRestaurantById(id) {
  await wait(250);

  const fromData3 = Array.isArray(data3)
    ? data3.find((restaurant) => String(restaurant.id) === String(id))
    : null;

  if (fromData3) {
    return mapData3Restaurant(fromData3);
  }

  const fallback = homePlaces.find((place) => String(place.id) === String(id));
  if (!fallback) return null;

  return {
    ...fallback,
    images: fallback.images?.length ? fallback.images : fallback.image ? [fallback.image] : [],
    reviews: fallback.reviews || [],
    coords: fallback.coords || { lat: 10.776889, lng: 106.700806 },
  };
}

export async function fetchRestaurants({ query, area, category } = {}) {
  await wait(250);

  let items = [...homePlaces];

  if (query) {
    const normalizedQuery = String(query).trim().toLowerCase();
    items = items.filter(
      (place) =>
        place.name.toLowerCase().includes(normalizedQuery) ||
        place.category.toLowerCase().includes(normalizedQuery) ||
        place.address.toLowerCase().includes(normalizedQuery),
    );
  }

  if (area) {
    const normalizedArea = String(area).trim().toLowerCase();
    items = items.filter((place) => String(place.area || "").toLowerCase().includes(normalizedArea));
  }

  if (category) {
    const normalizedCategory = String(category).trim().toLowerCase();
    items = items.filter((place) => String(place.category || "").toLowerCase().includes(normalizedCategory));
  }

  return items;
}

export async function fetchRestaurantsByRating(minRating = 4.0) {
  await wait(250);
  return homePlaces.filter((place) => Number(place.rating) >= Number(minRating));
}

export async function fetchReviews(restaurantId) {
  await wait(180);
  return createReviewsForRestaurant(restaurantId, 5);
}

export async function fetchRelatedPosts() {
  await wait(200);
  return createRelatedPostsFromData(3).map((post) => ({
    ...post,
    excerpt: post.excerpt || post.title,
  }));
}
