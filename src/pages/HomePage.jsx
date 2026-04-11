import { ArrowRight, LogOut, MapPin, Search, ShieldCheck, Sparkles, Star, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { UserRound } from "lucide-react";
import { homePlaces } from "../data/mockData";
import { useAuth } from "../context/useAuth";
import { useState } from "react";

function PlaceCard({ place, showTrendingBadge }) {
  return (
    <article className="surface-card place-card">
      <div className="place-image-wrap" onClick={() => onImageClick(place)}>
        <img src={place.image} alt={place.name} className="place-image" />
        {showTrendingBadge && (
          <div className="place-badges">
            <span className="highlight-badge">Trending</span>
            <span className="price-badge">{place.priceLevel}</span>
          </div>
        )}
      </div>

      <div className="place-body">
        <div className="place-row">
          <h3>{place.name}</h3>
          <span className="rating-pill">
            <Star size={14} fill="currentColor" />
            <span>{place.rating.toFixed(1)} ({place.reviewCount})</span>
          </span>
        </div>
        <p className="muted-text">
          {place.category} • {place.address}
        </p>
        <p className="muted-text">Mo cua: {place.time}</p>
      </div>
    </article>
  );
}
// Hàm này lấy vị trí hiện tại của người dùng và gửi lên backend để lấy danh sách quán ăn gần đó trong bán kính 5km.
const handleGetNearby = () => {
  if (!navigator.geolocation) {
    alert("Trình duyệt của bạn không hỗ trợ định vị.");
    return;
  }

  // Bắt đầu lấy tọa độ
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      console.log("Tọa độ của bạn:", latitude, longitude);

      // Gửi tọa độ này lên Backend để lấy danh sách quán ăn trong bán kính 5km
      const response = await fetch(`http://localhost:3000/restaurants/nearby?lat=${latitude}&lng=${longitude}&radius=5`);
      const data = await response.json();
      
      // Sau đó cập nhật danh sách quán ăn lên giao diện
      // setRestaurants(data); 
    },
    (error) => {
      alert("Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí.");
    }
  );
};

export function HomePage() {
  const { session, isAdmin, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [timeFilter, setTimeFilter] = useState("");
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [recommendedPlace, setRecommendedPlace] = useState(null);

  const trendingPlaces = homePlaces.filter((item) => item.isTrending).slice(0, 4);

  const isOpenAtTime = (timeRange, filterTime) => {
    const [start, end] = timeRange.split(" - ").map(t => {
      const [h, m] = t.split(":").map(Number);
      return h * 60 + m;
    });
    const filterMinutes = filterTime === "morning" ? 8 * 60 :
                         filterTime === "afternoon" ? 14 * 60 :
                         filterTime === "evening" ? 18 * 60 : 0;
    return filterMinutes >= start && filterMinutes <= end;
  };

  const filteredPlaces = homePlaces.filter((place) => {
    const matchesSearch = place.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         place.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesArea = !selectedArea || place.area === selectedArea;
    const matchesCategory = !selectedCategory || place.category === selectedCategory;
    const matchesTime = !timeFilter || isOpenAtTime(place.time, timeFilter);
    return matchesSearch && matchesArea && matchesCategory && matchesTime;
  }).sort((a, b) => {
    switch (sortBy) {
      case "distance":
        return a.distance - b.distance;
      case "rating":
        return b.rating - a.rating;
      case "price":
        return a.priceLevel.length - b.priceLevel.length; // $$ < $$$
      case "reviews":
        return b.reviewCount - a.reviewCount;
      default:
        return 0;
    }
  });

  const hasSearchActive =
    searchTerm.trim() !== "" ||
    selectedArea !== "" ||
    selectedCategory !== "" ||
    timeFilter !== "";
  const areas = [...new Set(homePlaces.map(p => p.area))];
  const categories = [...new Set(homePlaces.map(p => p.category))];

  const authMessage = location.state?.authMessage;
  const deniedPath = location.state?.deniedPath;

  const scorePlaceForDecision = (place) => {
    const reviewScore = Math.log(place.reviewCount + 1) * 2;
    const distanceScore = Math.max(0, 5 - place.distance) * 1.2;
    const priceScore = place.priceLevel.length === 2 ? 1 : place.priceLevel.length === 3 ? 0 : 2;
    return place.rating * 10 + reviewScore + distanceScore + priceScore;
  };

  const buildRecommendationReasons = (place) => {
    const reasons = [];

    if (selectedArea && place.area === selectedArea) {
      reasons.push(`Nằm trong khu vực bạn chọn (${place.area})`);
    }
    if (selectedCategory && place.category === selectedCategory) {
      reasons.push(`Phù hợp loại món bạn tìm (${place.category})`);
    }
    if (place.rating >= 4.7) {
      reasons.push(`Rating cao ${place.rating.toFixed(1)} sao`);
    } else {
      reasons.push(`Rating tốt ${place.rating.toFixed(1)} sao`);
    }
    if (place.reviewCount >= 1000) {
      reasons.push(`Nhiều nhận xét (${place.reviewCount})`);
    } else {
      reasons.push(`${place.reviewCount} nhận xét`);
    }
    if (place.distance <= 1.5) {
      reasons.push(`Gần bạn chỉ ${place.distance.toFixed(1)}km`);
    } else {
      reasons.push(`Khoảng cách ${place.distance.toFixed(1)}km phù hợp`);
    }
    if (place.priceLevel === "$") {
      reasons.push("Giá rẻ");
    } else if (place.priceLevel === "$$") {
      reasons.push("Giá vừa phải");
    } else {
      reasons.push("Giá cao nhưng chất lượng xứng đáng");
    }

    return reasons;
  };

  const handleDecideForMe = () => {
    const candidates = filteredPlaces.length > 0 ? filteredPlaces : homePlaces;
    const bestPlace = candidates.reduce((best, place) => {
      if (!best) return place;
      return scorePlaceForDecision(place) > scorePlaceForDecision(best) ? place : best;
    }, null);
    if (bestPlace) {
      setRecommendedPlace({
        place: bestPlace,
        reasons: buildRecommendationReasons(bestPlace),
      });
      setSelectedPlace(bestPlace);
    }
  };

  const handleImageClick = (place) => {
    setSelectedPlace(place);
  };

  const handleCloseModal = () => {
    setSelectedPlace(null);
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <header className="surface-card top-nav">
          <div className="top-nav-brand">
            <div className="brand-icon">F</div>
            <div>
              <p className="brand-title">FoodFinder</p>
              <p className="brand-subtitle">Tim quan an theo gu cua ban</p>
            </div>
          </div>

          <nav className="top-nav-links">
            <a href="#home">Home</a>
            <a href="#explore">Explore</a>
            <a href="#community">Community</a>
          </nav>

          <div className="top-nav-actions">
            {!isAuthenticated && (
              <>
                <Link to="/login" className="ghost-btn">
                  <UserRound size={16} />
                  <span>Dang nhap</span>
                </Link>
                <Link to="/register" className="brand-btn-secondary">
                  <span>Dang ky</span>
                </Link>
              </>
            )}

            {isAuthenticated && !isAdmin && (
              <>
                <span className="status-pill">
                  <UserRound size={14} />
                  <span>{session.displayName}</span>
                </span>
                <button type="button" className="ghost-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Dang xuat</span>
                </button>
              </>
            )}

            {isAdmin && (
              <>
                <Link to="/admin" className="brand-btn">
                  <ShieldCheck size={16} />
                  <span>Vao Admin</span>
                </Link>
                <button type="button" className="ghost-btn" onClick={logout}>
                  <LogOut size={16} />
                  <span>Dang xuat</span>
                </button>
              </>
            )}
          </div>
        </header>

        {authMessage && (
          <div className="surface-card inline-alert inline-alert-success" role="status">
            {authMessage}
          </div>
        )}

        {deniedPath && (
          <div className="surface-card inline-alert" role="status">
            Duong dan <strong>{deniedPath}</strong> can quyen admin. Vui long dang nhap tai khoan admin tai trang dang nhap.
          </div>
        )}

        <section id="home" className="hero-block">
          <p className="hero-kicker">Food Discovery Platform</p>
          <h1>
            Discover <span>Delicious</span> Food Around You
          </h1>
          <p className="hero-subtitle">
            Tim nhanh quan an phu hop trong ban kinh 5km, xem danh gia va ra quyet dinh trong vai giay.
          </p>

          <div className="hero-search surface-card">
            <Search size={20} />
            <input
              type="text"
              placeholder="Tim pho, com tam, ca phe..."
              aria-label="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters-section surface-card">
            <div className="filter-row">
              <div className="filter-group">
                <label>Khu vực:</label>
                <select value={selectedArea} onChange={(e) => setSelectedArea(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  {areas.map(area => <option key={area} value={area}>{area}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Loại món:</label>
                <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="filter-group">
                <label>Sắp xếp:</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="filter-select">
                  <option value="rating">Đánh giá cao</option>
                  <option value="distance">Khoảng cách gần</option>
                  <option value="price">Giá thấp đến cao</option>
                  <option value="reviews">Lượt đánh giá nhiều</option>
                </select>
              </div>
              <div className="filter-group">
                <label>Thời điểm:</label>
                <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="filter-select">
                  <option value="">Tất cả</option>
                  <option value="morning">Sáng (8h)</option>
                  <option value="afternoon">Chiều (14h)</option>
                  <option value="evening">Tối (18h)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big" onClick={handleDecideForMe}>
              <Sparkles size={18} />
              <span>Quyet Dinh Giup Toi</span>
            </button>
            <button type="button" className="brand-btn-secondary big">
              <MapPin size={18} />
              <span>Gan Toi</span>
            </button>
          </div>

          {recommendedPlace && (
            <section id="recommendation" className="section-block">
              <div className="section-head">
                <h2>Gợi ý cho bạn</h2>
              </div>
              <div className="surface-card recommendation-card">
                <div className="recommendation-grid">
                  <img src={recommendedPlace.place.image} alt={recommendedPlace.place.name} className="recommendation-image" />
                  <div className="recommendation-info">
                    <h3>{recommendedPlace.place.name}</h3>
                    <p className="muted-text">
                      {recommendedPlace.place.category} • {recommendedPlace.place.area} • {recommendedPlace.place.distance}km • {recommendedPlace.place.priceLevel}
                    </p>
                    <p className="muted-text">Mo cua: {recommendedPlace.place.time}</p>
                    <p className="muted-text">
                      Điểm đánh giá: {recommendedPlace.place.rating.toFixed(1)} ({recommendedPlace.place.reviewCount} nhận xét)
                    </p>
                    <div className="recommendation-reasons">
                      <h4>Lý do đề xuất</h4>
                      <ul>
                        {recommendedPlace.reasons.map((reason, index) => (
                          <li key={index} className="muted-text">{reason}</li>
                        ))}
                      </ul>
                    </div>
                    <button type="button" className="brand-btn" onClick={() => handleImageClick(recommendedPlace.place)}>
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            </section>
          )}
        </section>

        {hasSearchActive && (
          <section id="search-results" className="section-block">
            <div className="section-head">
              <h2>Kết quả tìm kiếm</h2>
              <p className="muted-text">Hiển thị các quán phù hợp theo từ khóa của bạn.</p>
            </div>
            <div className="card-grid">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => (
                  <PlaceCard key={place.id} place={place} showTrendingBadge={false} onImageClick={handleImageClick} />
                ))
              ) : (
                <p className="muted-text">Không tìm thấy quán nào phù hợp.</p>
              )}
            </div>
          </section>
        )}

        <section id="explore" className="section-block">
          <div className="section-head">
            <h2>Trending Now</h2>
          </div>

          <div className="card-grid">
            {trendingPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} showTrendingBadge onImageClick={handleImageClick} />
            ))}
          </div>
        </section>

        {!hasSearchActive && (
          <section id="community" className="section-block">
            <div className="section-head">
              <h2>All Places</h2>
              <p className="muted-text">Du lieu mau dong bo cung Admin dashboard</p>
            </div>

            <div className="card-grid">
              {homePlaces.map((place) => (
                <PlaceCard key={place.id} place={place} showTrendingBadge={false} onImageClick={handleImageClick} />
              ))}
            </div>
          </section>
        )}

        {selectedPlace && (
          <div className="place-modal-backdrop" onClick={handleCloseModal}>
            <div className="place-modal surface-card" onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={handleCloseModal} aria-label="Close">
                <X size={18} />
              </button>
              <img src={selectedPlace.image} alt={selectedPlace.name} className="modal-image" />
              <div className="modal-body">
                <div className="place-row">
                  <h2>{selectedPlace.name}</h2>
                  <span className="rating-pill">
                    <Star size={14} fill="currentColor" />
                    <span>{selectedPlace.rating.toFixed(1)} ({selectedPlace.reviewCount})</span>
                  </span>
                </div>
                <p className="muted-text">
                  {selectedPlace.category} • {selectedPlace.area} • {selectedPlace.distance}km
                </p>
                <p className="muted-text">Mo cua: {selectedPlace.time}</p>
                <p className="muted-text">Dia chi: {selectedPlace.address}</p>
                <p className="muted-text">Muc gia: {selectedPlace.priceLevel}</p>
                <div className="modal-reviews">
                  <h3>Nhận xét nổi bật</h3>
                  {selectedPlace.reviews.map((review, index) => (
                    <div key={index} className="review-item">
                      <p className="review-comment">"{review.comment}"</p>
                      <p className="review-user">- {review.user}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

