import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPinned, MessageSquarePlus, Star } from "lucide-react";
import { useAuth } from "../context/useAuth";
import {
  fetchApprovedPostsForRestaurant,
  fetchRestaurantReviews,
  fetchVisibleRestaurantById,
  submitCommentForApprovedPost,
} from "../services/publicRestaurantService";

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleString("vi-VN", {
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RestaurantDetailCommunityPage() {
  const { id } = useParams();
  const { isAuthenticated, session } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [posts, setPosts] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingPostId, setSubmittingPostId] = useState(null);

  const loadData = useCallback(async () => {
    const [restaurantData, reviewData, postData] = await Promise.all([
      fetchVisibleRestaurantById(id),
      fetchRestaurantReviews(id),
      fetchApprovedPostsForRestaurant(id),
    ]);

    setRestaurant(restaurantData);
    setReviews(reviewData);
    setPosts(postData);
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const averageRating = useMemo(() => {
    if (!reviews.length) return "N/A";
    const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    return (total / reviews.length).toFixed(1);
  }, [reviews]);

  if (!restaurant) {
    return <div className="page-wrap p-6">Dang tai chi tiet quan...</div>;
  }

  const mapsUrl = restaurant.coords
    ? `https://www.google.com/maps/search/?api=1&query=${restaurant.coords.lat},${restaurant.coords.lng}`
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(restaurant.address)}`;

  const updateDraft = (postId, field, value) => {
    setCommentDrafts((current) => ({
      ...current,
      [postId]: {
        rating: current[postId]?.rating || "5",
        content: current[postId]?.content || "",
        [field]: value,
      },
    }));
  };

  const handleSubmitComment = async (postId) => {
    const draft = commentDrafts[postId];
    if (!draft?.content?.trim()) {
      return;
    }

    setSubmittingPostId(postId);
    await submitCommentForApprovedPost(postId, {
      author: session.displayName || "Nguoi dung",
      authorId: session.id || 0,
      content: draft.content.trim(),
      rating: Number(draft.rating || 0),
    });
    setCommentDrafts((current) => ({
      ...current,
      [postId]: { rating: "5", content: "" },
    }));
    await loadData();
    setSubmittingPostId(null);
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <div className="detail-shell">
          <div className="detail-gallery surface-card">
            {(restaurant.images?.length ? restaurant.images : restaurant.image ? [restaurant.image] : []).map((src, index) => (
              <img key={`${src}-${index}`} src={src} alt={`${restaurant.name} ${index + 1}`} className="detail-image" />
            ))}
          </div>

          <aside className="surface-card detail-sidebar">
            <Link to="/" className="ghost-btn">
              Ve trang chu
            </Link>
            <h1>{restaurant.name}</h1>
            <p className="muted-text">
              {restaurant.category} • {restaurant.area || "Khac"}
            </p>
            <p className="muted-text">Mo cua: {restaurant.time || "Chua cap nhat"}</p>
            <p className="muted-text">Gia: {restaurant.priceLevel || "Dang cap nhat"}</p>

            <div className="detail-address-card">
              <p className="strong-label">Dia chi quan</p>
              <p>{restaurant.address || "Chua cap nhat"}</p>
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="brand-btn">
                <MapPinned size={16} />
                <span>Mo tren Google Maps</span>
              </a>
            </div>

            <div className="detail-rating-box">
              <div className="rating-pill">
                <Star size={14} fill="currentColor" />
                <span>{averageRating}</span>
              </div>
              <p className="muted-text">{reviews.length} danh gia tu review goc, bai duyet va binh luan cong dong</p>
            </div>

            {restaurant.menuHighlights?.length > 0 && (
              <div className="detail-menu-box">
                <p className="strong-label">Mon noi bat</p>
                <div className="tag-list">
                  {restaurant.menuHighlights.map((item) => (
                    <span key={item} className="tag-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        <section className="surface-card detail-section">
          <div className="section-head">
            <h2>Danh gia tong hop</h2>
          </div>
          <div className="detail-review-list">
            {reviews.length > 0 ? (
              reviews.map((review) => (
                <article key={review.id} className="detail-review-card">
                  <div className="place-row">
                    <strong>{review.author}</strong>
                    <span className="rating-pill">
                      <Star size={14} fill="currentColor" />
                      <span>{Number(review.rating || 0).toFixed(1)}</span>
                    </span>
                  </div>
                  <p>{review.text}</p>
                </article>
              ))
            ) : (
              <p className="muted-text">Chua co danh gia nao cho quan nay.</p>
            )}
          </div>
        </section>

        <section className="surface-card detail-section">
          <div className="section-head">
            <h2>Bai dang da duyet</h2>
          </div>

          <div className="detail-post-stack">
            {posts.map((post) => (
              <article key={post.id} className="detail-post-card">
                <div className="place-row">
                  <div>
                    <h3>{post.title || post.restaurantSnapshot?.name}</h3>
                    <p className="muted-text">
                      {post.author} • {post.publishedAt ? formatDate(post.publishedAt) : formatDate(post.createdAt)}
                    </p>
                  </div>
                  {Number(post.rating || 0) > 0 && (
                    <span className="rating-pill">
                      <Star size={14} fill="currentColor" />
                      <span>{Number(post.rating).toFixed(1)}</span>
                    </span>
                  )}
                </div>

                {post.restaurantSnapshot?.image && (
                  <img src={post.restaurantSnapshot.image} alt={post.restaurantSnapshot.name} className="detail-post-image" />
                )}

                <p>{post.content}</p>

                <div className="detail-comment-block">
                  <p className="strong-label">Binh luan va danh gia lai</p>

                  {(post.comments || []).length > 0 ? (
                    <div className="detail-comment-list">
                      {post.comments.map((comment) => (
                        <div key={comment.id} className="detail-comment-card">
                          <div className="place-row">
                            <strong>{comment.author}</strong>
                            <span className="rating-pill">
                              <Star size={14} fill="currentColor" />
                              <span>{Number(comment.rating || 0).toFixed(1)}</span>
                            </span>
                          </div>
                          <p>{comment.content}</p>
                          <p className="muted-text">{formatDate(comment.createdAt)}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="muted-text">Bai nay chua co binh luan nao.</p>
                  )}

                  {!post.isFallback && isAuthenticated ? (
                    <div className="detail-comment-form">
                      <label className="control-field">
                        <span>Danh gia cua ban</span>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          step="0.5"
                          value={commentDrafts[post.id]?.rating || "5"}
                          onChange={(event) => updateDraft(post.id, "rating", event.target.value)}
                        />
                      </label>

                      <label className="control-field detail-comment-form-wide">
                        <span>Viet binh luan</span>
                        <textarea
                          rows={3}
                          value={commentDrafts[post.id]?.content || ""}
                          onChange={(event) => updateDraft(post.id, "content", event.target.value)}
                          placeholder="Ban thay quan nay the nao sau khi den an?"
                        />
                      </label>

                      <button
                        type="button"
                        className="brand-btn"
                        disabled={submittingPostId === post.id || !(commentDrafts[post.id]?.content || "").trim()}
                        onClick={() => handleSubmitComment(post.id)}
                      >
                        <MessageSquarePlus size={16} />
                        <span>{submittingPostId === post.id ? "Dang gui..." : "Gui binh luan"}</span>
                      </button>
                    </div>
                  ) : !post.isFallback ? (
                    <p className="muted-text">
                      <Link to="/login" className="link-btn">
                        Dang nhap
                      </Link>{" "}
                      de binh luan va danh gia lai quan nay.
                    </p>
                  ) : (
                    <p className="muted-text">Binh luan se duoc mo khi co bai dang cong dong da duyet cho quan nay.</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
