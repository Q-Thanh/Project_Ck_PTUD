import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRestaurantById, fetchReviews, fetchRelatedPosts } from "../services/restaurantService";

export default function RestaurantDetailPage() {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    let mounted = true;
    fetchRestaurantById(id).then((r) => mounted && setRestaurant(r));
    fetchReviews(id).then((rs) => mounted && setReviews(rs));
    fetchRelatedPosts(id).then((p) => mounted && setRelated(p));
    return () => (mounted = false);
  }, [id]);

  if (!restaurant) return <div className="p-6">Loading...</div>;

  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "N/A";

  const mapsUrl = restaurant.coords
    ? `https://www.google.com/maps/search/?api=1&query=${restaurant.coords.lat},${restaurant.coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`;

  return (
    <div className="page-wrap p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold">{restaurant.name}</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2">
            <div className="space-y-2">
              {restaurant.images.map((src, i) => (
                <img key={i} src={src} alt={`${restaurant.name} ${i}`} className="w-full rounded-md" />
              ))}
            </div>
          </div>

          <aside className="p-4 surface-card rounded-md">
            <p className="font-semibold">Địa chỉ</p>
            <p className="muted-text mb-2">{restaurant.address}</p>
            <p className="font-semibold">Giờ mở cửa</p>
            <p className="muted-text mb-2">{restaurant.time}</p>
            <a className="brand-btn" href={mapsUrl} target="_blank" rel="noreferrer">
              Xem trên Google Maps
            </a>

            <div className="mt-4">
              <p className="font-semibold">Đánh giá trung bình</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg font-bold">{avg}</span>
                <span className="muted-text">({reviews.length} reviews)</span>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-6">
          <h2 className="text-xl font-semibold">Đánh giá & Bình luận</h2>
          <div className="mt-3 space-y-3">
            {reviews.map((r) => (
              <div key={r.id} className="surface-card p-3 rounded-md">
                <div className="flex justify-between">
                  <strong>{r.author}</strong>
                  <span className="muted-text">{r.rating} ★</span>
                </div>
                <p className="mt-2">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <h3 className="text-lg font-semibold">Bài đăng liên quan</h3>
          <ul className="mt-3 space-y-2">
            {related.map((p) => (
              <li key={p.id} className="surface-card p-3 rounded-md">
                <Link to="#" className="font-semibold">
                  {p.title || p.excerpt}
                </Link>
                <p className="muted-text">{p.author}</p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
