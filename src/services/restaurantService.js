import { homePlaces, initialPosts } from "../data/mockData";
import data1 from "../../data/data1.json";
import data2 from "../../data/data2.json";

function wait(ms = 300) {
  return new Promise((res) => setTimeout(res, ms));
}

export async function fetchRestaurantById(id) {
  await wait(300);
  // Prefer data2.json
  const byData2 = Array.isArray(data2) ? data2.find((p) => String(p.id) === String(id)) : null;
  if (byData2) {
    return {
      id: byData2.id,
      name: byData2.name,
      address: byData2.location?.address || "",
      time: byData2.operatingHours?.status || "",
      rating: byData2.rating || 0,
      images: byData2.imageUrl ? [byData2.imageUrl] : [],
      reviews: byData2.reviews || [],
      priceLevel: byData2.priceLevel || "",
      coords: byData2.coords || { lat: 10.776889, lng: 106.700806 },
    };
  }

  const r = homePlaces.find((p) => String(p.id) === String(id));
  if (!r) return null;
  return {
    ...r,
    coords: { lat: 10.776889, lng: 106.700806 },
    images: [r.image, r.image, r.image],
    reviews: [],
  };
}

export async function fetchRestaurants({ query, area, category, coords } = {}) {
  await wait(300);
  // Prefer real data1.json when available
  let items = [];
  if (Array.isArray(data2) && data2.length) {
    items = data2.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category || "",
      address: r.location?.address || "",
      time: r.operatingHours?.status || "",
      rating: r.rating || 0,
      priceLevel: r.priceLevel || "",
      image: r.imageUrl || r.photo || (homePlaces.find((h) => h.name === r.name)?.image) || "",
      reviews: r.reviews || [],
    }));
  } else if (Array.isArray(data1) && data1.length) {
    items = data1.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category || "",
      address: r.location?.address || "",
      time: r.operatingHours?.status || "",
      rating: r.rating || 0,
      priceLevel: r.priceLevel || "",
      image: r.photo || r.image || (homePlaces.find((h) => h.name === r.name)?.image) || "",
      reviews: r.reviews || [],
    }));
  } else {
    items = [...homePlaces];
  }
  if (query) {
    const q = query.toLowerCase();
    items = items.filter((p) => p.name.toLowerCase().includes(q));
  }
  if (area) items = items.filter((p) => (p.area || "").toLowerCase().includes(area.toLowerCase()));
  if (category) items = items.filter((p) => p.category.toLowerCase() === category.toLowerCase());
  // if coords provided, return items (frontend may filter by distance)
  return items;
}

export async function fetchRestaurantsByRating(minRating = 4.0) {
  await wait(300);
  return homePlaces.filter((p) => Number(p.rating) > Number(minRating));
}

export async function fetchReviews(restaurantId) {
  await wait(200);
  // mock reviews
  return [
    { id: 1, author: "An", rating: 5, text: "Ngon, gia hop ly" },
    { id: 2, author: "Binh", rating: 4, text: "Phuc vu tot" },
    { id: 3, author: "Chi", rating: 4, text: "Rat tot" },
  ];
}

export async function fetchRelatedPosts(restaurantId) {
  await wait(200);
  // return some mock posts
  return initialPosts.slice(0, 3).map((p) => ({ ...p, excerpt: p.title }));
}
