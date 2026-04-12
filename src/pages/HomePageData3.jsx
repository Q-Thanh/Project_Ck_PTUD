import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogOut, MapPin, Search, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { fetchCommunityHighlights, fetchVisibleRestaurants } from "../services/publicRestaurantService";

function PlaceCard({ place }) {
  return (
    <article className="surface-card place-card">
      <div className="place-image-wrap">
        <img src={place.image} alt={place.name} className="place-image" />
        {place.isTrending && (
          <div className="place-badges">
            <span className="highlight-badge">Gợi ý</span>
            <span className="price-badge">Nổi bật</span>
          </div>
        )}
      </div>

      <div className="place-body">
        <div className="place-row">
          <h3>{place.name}</h3>
          <span className="rating-pill">
            <Star size={14} fill="currentColor" />
            <span>
              {Number(place.rating || 0).toFixed(1)} ({place.reviewCount || 0})
            </span>
          </span>
        </div>

        <p className="muted-text">
          {place.category} / {place.area}
        </p>
        <p className="muted-text">Địa chỉ: {place.shortAddress}</p>
        <p className="muted-text">{place.closingLabel}</p>
        <p className="muted-text">Giá: {place.priceLevel}</p>

        <div className="place-card-actions">
          <Link to={`/restaurants/${place.id}`} className="brand-btn">
            Xem chi tiết quán
          </Link>
          <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="ghost-btn">
            Mở Google Maps
          </a>
        </div>
      </div>
    </article>
  );
}

function CommunityHighlightCard({ item }) {
  return (
    <article className="surface-card community-highlight-card">
      <p className="hero-kicker">Cộng đồng</p>
      <h3>{item.restaurantName}</h3>
      <p className="muted-text">Tác giả: {item.author}</p>
      {item.rating > 0 && (
        <span className="rating-pill">
          <Star size={14} fill="currentColor" />
          <span>{item.rating.toFixed(1)}</span>
        </span>
      )}
      <p className="muted-text">{item.excerpt}</p>
      <Link to={`/restaurants/${item.restaurantId}`} className="link-btn">
        Mở trang chi tiết
      </Link>
    </article>
  );
}

export function HomePage() {
  const { session, isAdmin, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [places, setPlaces] = useState([]);
  const [communityHighlights, setCommunityHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [recommendedPlace, setRecommendedPlace] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadHomeData() {
      setLoading(true);
      const [restaurantData, communityData] = await Promise.all([
        fetchVisibleRestaurants(),
        fetchCommunityHighlights(3),
      ]);

      if (!mounted) return;
      setPlaces(restaurantData);
      setCommunityHighlights(communityData);
      setLoading(false);
    }

    loadHomeData();
    return () => {
      mounted = false;
    };
  }, []);

  const authMessage = location.state?.authMessage;
  const deniedPath = location.state?.deniedPath;

  const areas = useMemo(() => [...new Set(places.map((place) => place.area).filter(Boolean))], [places]);
  const categories = useMemo(() => [...new Set(places.map((place) => place.category).filter(Boolean))], [places]);

  const filteredPlaces = useMemo(() => {
    return [...places]
      .filter((place) => {
        const search = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !search ||
          place.name.toLowerCase().includes(search) ||
          place.category.toLowerCase().includes(search) ||
          place.address.toLowerCase().includes(search);
        const matchesArea = !selectedArea || place.area === selectedArea;
        const matchesCategory = !selectedCategory || place.category === selectedCategory;
        return matchesSearch && matchesArea && matchesCategory;
      })
      .sort((left, right) => {
        switch (sortBy) {
          case "distance":
            return Number(left.distance || 0) - Number(right.distance || 0);
          case "reviews":
            return Number(right.reviewCount || 0) - Number(left.reviewCount || 0);
          case "price":
            return Number(left.priceValue || Number.MAX_SAFE_INTEGER) - Number(right.priceValue || Number.MAX_SAFE_INTEGER);
          case "rating":
          default:
            return Number(right.rating || 0) - Number(left.rating || 0);
        }
      });
  }, [places, searchTerm, selectedArea, selectedCategory, sortBy]);

  const trendingPlaces = useMemo(() => places.filter((place) => place.isTrending).slice(0, 4), [places]);

  const handleDecideForMe = () => {
    const source = filteredPlaces.length ? filteredPlaces : places;
    const best = [...source].sort((left, right) => {
      const leftScore = Number(left.rating || 0) * 100 + Number(left.reviewCount || 0) - Number(left.distance || 0) * 10;
      const rightScore = Number(right.rating || 0) * 100 + Number(right.reviewCount || 0) - Number(right.distance || 0) * 10;
      return rightScore - leftScore;
    })[0];

    setRecommendedPlace(best || null);
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <header className="surface-card top-nav">
          <div className="top-nav-brand">
            <div className="brand-icon">F</div>
            <div>
              <p className="brand-title">FoodFinder</p>
              <p className="brand-subtitle">Khám phá quán ăn và đánh giá cộng đồng</p>
            </div>
          </div>

          <nav className="top-nav-links">
            <a href="#home">Trang chủ</a>
            <a href="#data3">Dữ liệu</a>
            <a href="#community">Cộng đồng</a>
          </nav>

          <div className="top-nav-actions">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="ghost-btn">
                  <UserRound size={16} />
                  <span>Đăng nhập</span>
                </Link>
                <Link to="/register" className="brand-btn-secondary">
                  <span>Đăng ký</span>
                </Link>
              </>
            )}

            {isAuthenticated && !isAdmin && (
              <>
                <Link to="/posts/create" className="brand-btn">
                  <Sparkles size={16} />
                  <span>Đăng quán mới</span>
                </Link>
                <span className="status-pill">
                  <UserRound size={14} />
                  <span>{session.displayName}</span>
                </span>
                <button type="button" className="ghost-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <Link to="/admin" className="brand-btn">
                  <ShieldCheck size={16} />
                  <span>Quản trị viên</span>
                </Link>
                <button type="button" className="ghost-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Đăng xuất</span>
                </button>
              </>
            )}
          </div>
        </header>

        {authMessage && <div className="surface-card inline-alert inline-alert-success">{authMessage}</div>}

        {deniedPath && (
          <div className="surface-card inline-alert">
            Đường dẫn <strong>{deniedPath}</strong> cần quyền admin. Đăng nhập admin/admin để vào khu kiểm duyệt.
          </div>
        )}

        <section id="home" className="hero-block">
          <p className="hero-kicker">Khám phá quán ăn</p>
          <h1>
            Xem chi tiết quán ăn <span>đầy đủ hơn</span>
          </h1>
          <p className="hero-subtitle">
            Trang chủ hiển thị danh sách quán sẵn có, có nút xem chi tiết, mở Google Maps và theo dõi bài đánh giá rõ ràng.
          </p>

          <div className="hero-search surface-card">
            <Search size={20} />
            <input
              type="text"
              placeholder="Tìm theo tên quán, địa chỉ, loại món..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="filters-section surface-card">
            <div className="filter-row">
              <div className="filter-group">
                <label>Khu vực</label>
                <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Loại món</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="filter-select"
                >
                  <option value="">Tất cả</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sắp xếp</label>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="filter-select">
                  <option value="rating">Đánh giá cao</option>
                  <option value="distance">Gần nhất</option>
                  <option value="reviews">Nhiều đánh giá</option>
                  <option value="price">Giá hợp lý</option>
                </select>
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big" onClick={handleDecideForMe}>
              <Sparkles size={18} />
              <span>Quyết định giúp tôi</span>
            </button>
            <Link to="/posts/create" className="brand-btn-secondary big">
              <MapPin size={18} />
              <span>Gửi bài cộng đồng</span>
            </Link>
          </div>
        </section>

        {recommendedPlace && (
          <section className="section-block">
            <div className="section-head">
              <h2>Gợi ý cho bạn</h2>
            </div>

            <div className="surface-card recommendation-card">
              <div className="recommendation-grid">
                <img src={recommendedPlace.image} alt={recommendedPlace.name} className="recommendation-image" />
                <div className="recommendation-info">
                  <h3>{recommendedPlace.name}</h3>
                  <p className="muted-text">
                    {recommendedPlace.category} / {recommendedPlace.area} / {Number(recommendedPlace.distance || 0).toFixed(1)} km
                  </p>
                  <p className="muted-text">Địa chỉ: {recommendedPlace.address}</p>
                  <p className="muted-text">{recommendedPlace.closingLabel}</p>
                  <p className="muted-text">
                    Đánh giá {Number(recommendedPlace.rating || 0).toFixed(1)} sao từ {recommendedPlace.reviewCount || 0} lượt
                  </p>
                  <div className="place-card-actions">
                    <Link to={`/restaurants/${recommendedPlace.id}`} className="brand-btn">
                      Xem chi tiết quán
                    </Link>
                    <a href={recommendedPlace.mapsUrl} target="_blank" rel="noreferrer" className="ghost-btn">
                      Mở Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="data3" className="section-block">
          <div className="section-head">
            <h2>Danh sách quán ăn</h2>
            <p className="muted-text">Xem nhanh thông tin chính và mở trang chi tiết của từng quán.</p>
          </div>

          {loading ? (
            <div className="surface-card inline-alert">Đang tải danh sách quán...</div>
          ) : filteredPlaces.length > 0 ? (
            <div className="card-grid">
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          ) : (
            <div className="surface-card inline-alert">Không tìm thấy quán nào phù hợp với bộ lọc hiện tại.</div>
          )}
        </section>

        <section id="community" className="section-block">
          <div className="section-head">
            <h2>Cộng đồng</h2>
            <p className="muted-text">Bài đăng cộng đồng là phần bổ sung để mọi người chia sẻ trải nghiệm thực tế.</p>
          </div>

          <div className="community-cta surface-card">
            <div>
              <h3>Bạn vừa ăn được một quán hay?</h3>
              <p className="muted-text">
                Gửi địa chỉ, hình ảnh và nhận xét của bạn. Admin sẽ duyệt trước khi hiển thị công khai.
              </p>
            </div>
            <Link to="/posts/create" className="brand-btn">
              <ArrowRight size={16} />
              <span>Mở form đăng quán</span>
            </Link>
          </div>

          {communityHighlights.length > 0 ? (
            <div className="community-highlight-grid">
              {communityHighlights.map((item) => (
                <CommunityHighlightCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="surface-card inline-alert">Chưa có bài cộng đồng nào được duyệt gần đây.</div>
          )}

          {!loading && (
            <section className="section-block">
              <div className="section-head">
                <h2>Quán nổi bật</h2>
                <p className="muted-text">Những quán được đánh giá cao để bạn mở nhanh trang chi tiết.</p>
              </div>
              <div className="card-grid">
                {trendingPlaces.map((place) => (
                  <PlaceCard key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </div>
  );
}
