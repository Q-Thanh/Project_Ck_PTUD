import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Globe, MapPin, MapPinned, MessageSquarePlus, Phone, Star, UtensilsCrossed, Wallet, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { fetchApprovedPostsForRestaurant, fetchRestaurantReviews, fetchVisibleRestaurantById, submitCommentForApprovedPost } from "../services/publicRestaurantService";

const TAB_ITEMS = [
  { id: "overview", label: "Tổng quan" },
  { id: "menu", label: "Thực đơn" },
  { id: "reviews", label: "Đánh giá" },
  { id: "about", label: "Giới thiệu" },
];

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

function DetailInfoRow({ icon: Icon, label, value, href }) {
  if (!value) return null;

  const content = href ? (
    <a href={href} target={href.startsWith("tel:") ? undefined : "_blank"} rel={href.startsWith("tel:") ? undefined : "noreferrer"} className="detail-info-link">
      {value}
    </a>
  ) : (
    <span>{value}</span>
  );

  return (
    <div className="detail-info-row">
      <div className="detail-info-icon">
        <Icon size={18} />
      </div>
      <div className="detail-info-copy">
        <p className="strong-label">{label}</p>
        {content}
      </div>
    </div>
  );
}

function ReviewCard({ review }) {
  return (
    <article className="detail-review-card">
      <div className="place-row">
        <div>
          <strong>{review.author}</strong>
          <p className="muted-text">{[review.badge, review.timeAgo].filter(Boolean).join(" / ")}</p>
        </div>
        <span className="rating-pill">
          <Star size={14} fill="currentColor" />
          <span>{Number(review.rating || 0).toFixed(1)}</span>
        </span>
      </div>
      <p>{review.content || review.text}</p>
    </article>
  );
}

function FeatureGroup({ title, items }) {
  if (!items?.length) return null;

  return (
    <article className="detail-group-card">
      <h3>{title}</h3>
      <div className="detail-group-list">
        {items.map((item) => (
          <span key={`${title}-${item}`} className="detail-feature-pill">
            {item}
          </span>
        ))}
      </div>
    </article>
  );
}

export default function RestaurantDetailData3Page() {
  const { id } = useParams();
  const { isAuthenticated, session } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [restaurant, setRestaurant] = useState(null);
  const [officialReviews, setOfficialReviews] = useState([]);
  const [communityPosts, setCommunityPosts] = useState([]);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [submittingPostId, setSubmittingPostId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const restaurantData = await fetchVisibleRestaurantById(id);

    if (!restaurantData) {
      setRestaurant(null);
      setOfficialReviews([]);
      setCommunityPosts([]);
      setLoading(false);
      return;
    }

    const [reviewData, postData] = await Promise.all([fetchRestaurantReviews(id), fetchApprovedPostsForRestaurant(id)]);

    setRestaurant(restaurantData);
    setOfficialReviews(reviewData || []);
    setCommunityPosts(postData || []);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    setActiveTab("overview");
    loadData();
  }, [loadData]);

  const aboutSections = useMemo(() => {
    if (!restaurant?.features) return [];
    return [
      { title: "Tùy chọn phục vụ", items: restaurant.features.serviceOptions },
      { title: "Điểm nổi bật", items: restaurant.features.highlights },
      { title: "Món và đồ uống", items: restaurant.features.offerings },
      { title: "Hình thức dùng bữa", items: restaurant.features.diningOptions },
      { title: "Tiện nghi", items: restaurant.features.amenities },
      { title: "Không khí", items: restaurant.features.atmosphere },
      { title: "Phù hợp với", items: restaurant.features.crowd },
      { title: "Kế hoạch", items: restaurant.features.planning },
      { title: "Thanh toán", items: restaurant.features.payments },
      { title: "Đỗ xe", items: restaurant.features.parking },
      { title: "Trẻ em", items: restaurant.features.children },
      { title: "Hỗ trợ tiếp cận", items: restaurant.features.accessibility?.supported },
      { title: "Chưa hỗ trợ tiếp cận", items: restaurant.features.accessibility?.unsupported },
    ].filter((section) => Array.isArray(section.items) && section.items.length > 0);
  }, [restaurant]);

  const featuredReviews = useMemo(() => officialReviews.slice(0, 3), [officialReviews]);

  const updateCommentDraft = (postId, field, value) => {
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
    if (!draft?.content?.trim()) return;

    setSubmittingPostId(postId);
    await submitCommentForApprovedPost(postId, {
      author: session.displayName || "Người dùng",
      authorId: session.id || 0,
      content: draft.content.trim(),
      rating: Number(draft.rating || 0),
    });
    setCommentDrafts((current) => ({ ...current, [postId]: { rating: "5", content: "" } }));
    await loadData();
    setSubmittingPostId(null);
  };

  if (loading) {
    return (
      <div className="page-wrap">
        <div className="app-shell">
          <div className="surface-card detail-empty-state">
            <p>Đang tải chi tiết quán...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="page-wrap">
        <div className="app-shell">
          <div className="surface-card detail-empty-state">
            <p>Không tìm thấy quán ăn trong dữ liệu hiện có.</p>
            <Link to="/" className="brand-btn">
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <header className="surface-card detail-header-bar">
          <Link to="/" className="detail-header-icon" aria-label="Quay lại">
            <ArrowLeft size={18} />
          </Link>
          <div className="detail-header-title">
            <p className="muted-text">Chi tiết quán ăn</p>
            <h1>{restaurant.name}</h1>
          </div>
          <Link to="/" className="detail-header-icon" aria-label="Đóng">
            <X size={18} />
          </Link>
        </header>

        <nav className="surface-card detail-tabs" aria-label="Các tab chi tiết quán">
          {TAB_ITEMS.map((tab) => (
            <button key={tab.id} type="button" className={`detail-tab ${activeTab === tab.id ? "detail-tab-active" : ""}`} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="surface-card detail-hero">
          <div className="detail-hero-media">
            <img src={restaurant.image} alt={restaurant.name} className="detail-hero-image" />
          </div>
          <div className="detail-hero-copy">
            <p className="hero-kicker">Thông tin quán</p>
            <h2>{restaurant.name}</h2>
            <p className="muted-text">{restaurant.category} / {restaurant.area}</p>
            <div className="detail-hero-meta">
              <span className="rating-pill">
                <Star size={14} fill="currentColor" />
                <span>{Number(restaurant.rating || 0).toFixed(1)} / {restaurant.reviewCount} lượt đánh giá</span>
              </span>
              <span className="status-pill">{restaurant.closingLabel}</span>
            </div>
            <div className="detail-hero-actions">
              <a href={restaurant.reservationUrl || restaurant.mapsUrl} target="_blank" rel="noreferrer" className="brand-btn">Đặt bàn</a>
              <a href={restaurant.mapsUrl} target="_blank" rel="noreferrer" className="ghost-btn">
                <MapPinned size={16} />
                <span>Mở Google Maps</span>
              </a>
            </div>
          </div>
        </section>

        {featuredReviews.length > 0 && (
          <section className="surface-card detail-content-card">
            <div className="section-head">
              <h2>3 bình luận nổi bật</h2>
              <p className="muted-text">Trích từ đánh giá sẵn có của quán để bạn xem nhanh ngay bên dưới.</p>
            </div>
            <div className="detail-review-preview-grid">
              {featuredReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          </section>
        )}

        {activeTab === "overview" && (
          <section className="detail-content-grid">
            <article className="surface-card detail-content-card">
              <div className="section-head">
                <h2>Tổng quan</h2>
              </div>
              <div className="detail-service-pills">
                {(restaurant.serviceOptionsMain || []).map((item) => (
                  <span key={item} className="detail-feature-pill detail-feature-pill-success">{item}</span>
                ))}
              </div>
              <div className="detail-info-list">
                <DetailInfoRow icon={MapPin} label="Địa chỉ" value={restaurant.address} />
                <DetailInfoRow icon={Clock3} label="Giờ mở cửa" value={restaurant.closingLabel} />
                <DetailInfoRow icon={Wallet} label="Giá mỗi người" value={restaurant.priceLevel} />
                <DetailInfoRow icon={Globe} label="Trang web" value={restaurant.website} href={restaurant.website} />
                <DetailInfoRow icon={Phone} label="Số điện thoại" value={restaurant.phone} href={restaurant.phoneUrl} />
                <DetailInfoRow icon={MapPinned} label="Mã địa điểm" value={restaurant.plusCode} />
              </div>
            </article>

            <article className="surface-card detail-content-card">
              <div className="section-head">
                <h2>Thông tin nhanh</h2>
              </div>
              <div className="detail-menu-grid">
                {(restaurant.menuHighlights || []).slice(0, 6).map((item) => (
                  <article key={item} className="detail-menu-card">
                    <UtensilsCrossed size={18} />
                    <div>
                      <p className="strong-label">{item}</p>
                      <p className="muted-text">Món đang được nhiều người nhắc đến.</p>
                    </div>
                  </article>
                ))}
              </div>
            </article>
          </section>
        )}

        {activeTab === "menu" && (
          <section className="surface-card detail-content-card">
            <div className="section-head">
              <h2>Thực đơn</h2>
              <p className="muted-text">Những món nổi bật của quán.</p>
            </div>
            {(restaurant.menuHighlights || []).length > 0 ? (
              <div className="detail-menu-grid">
                {restaurant.menuHighlights.map((item) => (
                  <article key={item} className="detail-menu-card">
                    <UtensilsCrossed size={18} />
                    <div>
                      <p className="strong-label">{item}</p>
                      <p className="muted-text">Món đang được nhiều người nhắc đến.</p>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted-text">Hiện chưa có thông tin thực đơn chi tiết cho quán này.</p>
            )}
          </section>
        )}

        {activeTab === "reviews" && (
          <section className="detail-content-grid">
            <article className="surface-card detail-content-card">
              <div className="section-head">
                <h2>Đánh giá sẵn có</h2>
              </div>
              {officialReviews.length > 0 ? <div className="detail-review-list">{officialReviews.map((review) => <ReviewCard key={review.id} review={review} />)}</div> : <p className="muted-text">Chưa có đánh giá gốc nào cho quán này.</p>}
            </article>

            <article className="surface-card detail-content-card">
              <div className="section-head">
                <h2>Đánh giá cộng đồng đã duyệt</h2>
              </div>
              {communityPosts.length > 0 ? (
                <div className="detail-post-stack">
                  {communityPosts.map((post) => (
                    <article key={post.id} className="detail-post-card">
                      <div className="place-row">
                        <div>
                          <h3>{post.title || post.restaurantSnapshot?.name || restaurant.name}</h3>
                          <p className="muted-text">{post.author} / {formatDate(post.publishedAt || post.createdAt)}</p>
                        </div>
                        {Number(post.rating || 0) > 0 && (
                          <span className="rating-pill">
                            <Star size={14} fill="currentColor" />
                            <span>{Number(post.rating).toFixed(1)}</span>
                          </span>
                        )}
                      </div>

                      {post.restaurantSnapshot?.image && <img src={post.restaurantSnapshot.image} alt={post.restaurantSnapshot.name} className="detail-post-image" />}
                      <p>{post.content}</p>

                      {(post.comments || []).length > 0 && (
                        <div className="detail-comment-list">
                          {post.comments.map((comment) => (
                            <article key={comment.id} className="detail-comment-card">
                              <div className="place-row">
                                <strong>{comment.author}</strong>
                                <span className="rating-pill">
                                  <Star size={14} fill="currentColor" />
                                  <span>{Number(comment.rating || 0).toFixed(1)}</span>
                                </span>
                              </div>
                              <p>{comment.content}</p>
                              <p className="muted-text">{formatDate(comment.createdAt)}</p>
                            </article>
                          ))}
                        </div>
                      )}

                      <div className="detail-comment-block">
                        <p className="strong-label">Bình luận và đánh giá lại</p>
                        {isAuthenticated ? (
                          <div className="detail-comment-form">
                            <label className="control-field">
                              <span>Đánh giá của bạn</span>
                              <input type="number" min="1" max="5" step="0.5" value={commentDrafts[post.id]?.rating || "5"} onChange={(event) => updateCommentDraft(post.id, "rating", event.target.value)} />
                            </label>
                            <label className="control-field detail-comment-form-wide">
                              <span>Viết bình luận</span>
                              <textarea rows={3} value={commentDrafts[post.id]?.content || ""} onChange={(event) => updateCommentDraft(post.id, "content", event.target.value)} placeholder="Bạn thấy quán này thế nào sau khi ghé ăn?" />
                            </label>
                            <button type="button" className="brand-btn" disabled={submittingPostId === post.id || !(commentDrafts[post.id]?.content || "").trim()} onClick={() => handleSubmitComment(post.id)}>
                              <MessageSquarePlus size={16} />
                              <span>{submittingPostId === post.id ? "Đang gửi..." : "Gửi bình luận"}</span>
                            </button>
                          </div>
                        ) : (
                          <p className="muted-text">
                            <Link to="/login" className="link-btn">Đăng nhập</Link> để thêm bình luận và đánh giá lại.
                          </p>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted-text">Chưa có bài đánh giá cộng đồng nào được duyệt cho quán này.</p>
              )}
            </article>
          </section>
        )}

        {activeTab === "about" && (
          <section className="surface-card detail-content-card">
            <div className="section-head">
              <h2>Giới thiệu</h2>
              <p className="muted-text">Tổng hợp thêm các thông tin mở rộng về quán.</p>
            </div>
            {aboutSections.length > 0 ? <div className="detail-group-grid">{aboutSections.map((section) => <FeatureGroup key={section.title} title={section.title} items={section.items} />)}</div> : <p className="muted-text">Hiện chưa có nhiều thông tin giới thiệu cho quán này.</p>}
          </section>
        )}
      </div>
    </div>
  );
}
