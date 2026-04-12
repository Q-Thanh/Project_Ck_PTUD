import { useEffect, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { AppTopNav } from "../components/AppTopNav";
import { fetchCommunityFeed } from "../services/publicRestaurantService";

function CommunityPostCard({ post }) {
  return (
    <article className="surface-card moderation-card">
      <div className="moderation-header">
        <div>
          <h3>{post.title}</h3>
          <p className="muted-text">
            Tac gia: {post.author} / Quan: {post.restaurantSnapshot?.name || "Quan cong dong"}
          </p>
        </div>
        <span className="rating-pill">
          <Star size={14} fill="currentColor" />
          <span>{Number(post.rating || 0).toFixed(1)}</span>
        </span>
      </div>

      {post.restaurantSnapshot?.image && (
        <img
          src={post.restaurantSnapshot.image}
          alt={post.restaurantSnapshot?.name || post.title}
          className="place-image"
          style={{ width: "100%", maxHeight: "220px", objectFit: "cover", borderRadius: "12px" }}
        />
      )}

      <p>{post.content}</p>
      <p className="muted-text">{(post.comments || []).length} binh luan</p>

      <div className="place-card-actions">
        <Link to={`/restaurants/${post.restaurantId}`} className="brand-btn">
          Xem chi tiet quan
        </Link>
      </div>
    </article>
  );
}

export function CommunityPage() {
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    let active = true;
    async function loadFeed() {
      setLoading(true);
      const feed = await fetchCommunityFeed({ page: 1, pageSize: 50, status: "approved" });
      if (!active) return;
      setPosts(feed.items || []);
      setLoading(false);
    }
    loadFeed();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section className="section-block">
          <div className="section-head">
            <h2>Bai dang cong dong</h2>
            <p className="muted-text">
              Cac bai dang nay da duoc admin duyet. Bai moi do nguoi dung gui se xuat hien tai day sau khi approved.
            </p>
          </div>

          <div className="community-cta surface-card">
            <div>
              <h3>Muon chia se quan ngon ban vua thu?</h3>
              <p className="muted-text">Gui bai ngay, admin duyet xong se hien thi o feed cong dong nay.</p>
            </div>
            <Link to="/posts/create" className="brand-btn">
              <ArrowRight size={16} />
              <span>Mo form dang bai</span>
            </Link>
          </div>

          {loading ? (
            <div className="surface-card inline-alert">Dang tai bai dang cong dong...</div>
          ) : posts.length > 0 ? (
            <div className="card-stack">
              {posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="surface-card inline-alert">Chua co bai dang cong dong duoc duyet.</div>
          )}
        </section>
      </div>
    </div>
  );
}
