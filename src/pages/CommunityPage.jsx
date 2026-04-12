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
            Tác giả: {post.author} / Quán: {post.restaurantSnapshot?.name || "Quán cộng đồng"}
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
      <p className="muted-text">{(post.comments || []).length} bình luận</p>

      <div className="place-card-actions">
        <Link to={`/restaurants/${post.restaurantId}`} className="brand-btn">
          Xem chi tiết quán
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
            <h2>Bài đăng cộng đồng</h2>
            <p className="muted-text">
              Các bài đăng này đã được admin duyệt. Bài mới do người dùng gửi sẽ xuất hiện tại đây sau khi approved.
            </p>
          </div>

          <div className="community-cta surface-card">
            <div>
              <h3>Muốn chia sẻ quán ngon bạn vừa thử?</h3>
              <p className="muted-text">Gửi bài ngay, admin duyệt xong sẽ hiển thị ở feed cộng đồng này.</p>
            </div>
            <Link to="/posts/create" className="brand-btn">
              <ArrowRight size={16} />
              <span>Mở form đăng bài</span>
            </Link>
          </div>

          {loading ? (
            <div className="surface-card inline-alert">Đang tải bài đăng cộng đồng...</div>
          ) : posts.length > 0 ? (
            <div className="card-stack">
              {posts.map((post) => (
                <CommunityPostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="surface-card inline-alert">Chưa có bài đăng cộng đồng được duyệt.</div>
          )}
        </section>
      </div>
    </div>
  );
}
