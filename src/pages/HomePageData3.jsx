import { useEffect, useMemo, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, Sparkles, Star } from "lucide-react";
import { AppTopNav } from "../components/AppTopNav";
import { SafeImage } from "../components/SafeImage";
import {
  fetchDecisionRestaurant,
  fetchNearbyRestaurants,
  fetchVisibleRestaurants,
} from "../services/publicRestaurantService";

function PlaceCard({ place, currentPageRestaurantCount }) {
  const handleDetailClick = () => {
    // Lưu trạng thái infinite scroll trước khi navigate
    const currentPage = Math.ceil(currentPageRestaurantCount / 8);
    sessionStorage.setItem("foodFinder_page", currentPage);
    sessionStorage.setItem("foodFinder_scrollPos", window.scrollY);
  };

  return (
    <article className="surface-card place-card">
      <div className="place-image-wrap">
        <SafeImage src={place.image} alt={place.name} className="place-image" />
        {place.isTrending && (
          <div className="place-badges">
            <span className="highlight-badge">Top</span>
            <span className="price-badge">Gần bạn</span>
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
        <p className="muted-text">{place.shortAddress || place.address}</p>
        <p className="muted-text">
          {place.closingLabel} / {Number(place.distance || 0).toFixed(2)} km
        </p>

        <div className="place-card-actions">
          <Link 
            to={`/restaurants/${place.id}`} 
            className="brand-btn"
            onClick={handleDetailClick}
          >
            Xem chi tiết
          </Link>
          <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="ghost-btn">
            Mở Maps
          </a>
        </div>
      </div>
    </article>
  );
}

async function getCurrentPositionAsync() {
  if (!navigator.geolocation) {
    throw new Error("Trình duyệt không hỗ trợ định vị.");
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 12000,
    });
  });
}

export function HomePage() {
  const [loading, setLoading] = useState(true);
  const [places, setPlaces] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [nearbyPlaces, setNearbyPlaces] = useState([]);
  const [decisionPlace, setDecisionPlace] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");

  // Infinite scroll state
  const [displayedRestaurants, setDisplayedRestaurants] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef(null);
  const [shouldRestoreScroll, setShouldRestoreScroll] = useState(false);

  const areas = useMemo(() => [...new Set(places.map((place) => place.area).filter(Boolean))], [places]);
  const categories = useMemo(() => [...new Set(places.map((place) => place.category).filter(Boolean))], [places]);

  const filteredPlaces = useMemo(() => {
    return [...places]
      .filter((place) => {
        const query = searchTerm.trim().toLowerCase();
        const byQuery =
          !query ||
          place.name.toLowerCase().includes(query) ||
          place.category.toLowerCase().includes(query) ||
          place.address.toLowerCase().includes(query);
        const byArea = !selectedArea || place.area === selectedArea;
        const byCategory = !selectedCategory || place.category === selectedCategory;
        return byQuery && byArea && byCategory;
      })
      .sort((left, right) => {
        if (sortBy === "distance") return Number(left.distance || 0) - Number(right.distance || 0);
        if (sortBy === "reviews") return Number(right.reviewCount || 0) - Number(left.reviewCount || 0);
        if (sortBy === "price") return Number(left.priceValue || Number.MAX_SAFE_INTEGER) - Number(right.priceValue || Number.MAX_SAFE_INTEGER);
        return Number(right.rating || 0) - Number(left.rating || 0);
      });
  }, [places, searchTerm, selectedArea, selectedCategory, sortBy]);

  useEffect(() => {
    let active = true;
    async function loadRestaurants() {
      setLoading(true);
      const data = await fetchVisibleRestaurants();
      if (!active) return;
      setPlaces(data);
      setLoading(false);
    }
    loadRestaurants();
    return () => {
      active = false;
    };
  }, []);

 // Restore infinite scroll state from sessionStorage
  useEffect(() => {
    const savedPage = sessionStorage.getItem("foodFinder_page");

    if (savedPage && filteredPlaces.length > 0) {
      const page = parseInt(savedPage, 10);
      const itemsToLoad = page * 8;
      
      // Load restaurants up to the saved page (Lấy bao nhiêu cũng được, slice tự lo)
      setDisplayedRestaurants(filteredPlaces.slice(0, itemsToLoad));
      setHasMore(itemsToLoad < filteredPlaces.length);
      
      // Mark that we need to restore scroll position after render
      setShouldRestoreScroll(true);

      // Clean up sessionStorage
      sessionStorage.removeItem("foodFinder_page");
    }
  }, [filteredPlaces]);

  // Restore scroll position after render
  useEffect(() => {
    if (shouldRestoreScroll) {
      const savedScrollPos = sessionStorage.getItem("foodFinder_scrollPos");
      if (savedScrollPos) {
        const scrollPos = parseInt(savedScrollPos, 10);
        window.scrollTo({ top: scrollPos, behavior: "instant" });
        sessionStorage.removeItem("foodFinder_scrollPos");
      }
      setShouldRestoreScroll(false);
    }
  }, [shouldRestoreScroll, displayedRestaurants]);

  const trendingPlaces = useMemo(() => filteredPlaces.filter((place) => place.isTrending).slice(0, 4), [filteredPlaces]);

  // Reset displayed restaurants when filters change
  useEffect(() => {
    // Don't reset if we're restoring state from back navigation
    if (shouldRestoreScroll) return;
    
    setDisplayedRestaurants(filteredPlaces.slice(0, 8));
    setHasMore(filteredPlaces.length > 8);
    setLoadingMore(false);
  }, [filteredPlaces, shouldRestoreScroll]);

  // Setup Intersection Observer for infinite scroll
  useEffect(() => {
    const node = loaderRef.current;
    if (!node || !hasMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !loadingMore && hasMore) {
            setLoadingMore(true);
            // Simulate small delay to show loading state
            setTimeout(() => {
              setDisplayedRestaurants((prev) => {
                const nextBatch = filteredPlaces.slice(prev.length, prev.length + 8);
                const updated = [...prev, ...nextBatch];
                setHasMore(updated.length < filteredPlaces.length);
                setLoadingMore(false);
                return updated;
              });
            }, 300);
          }
        });
      },
      { root: null, rootMargin: "200px" }
    );

    observer.observe(node);
    return () => {
      observer.disconnect();
    };
  }, [hasMore, loadingMore, filteredPlaces]);

  const getLocationAndLoadNearby = async () => {
    setLocating(true);
    setLocationError("");
    try {
      const position = await getCurrentPositionAsync();
      const lat = Number(position.coords.latitude);
      const lng = Number(position.coords.longitude);
      setUserLocation({ lat, lng });
      const nearby = await fetchNearbyRestaurants({ lat, lng, radiusKm: 5, limit: 5 });
      setNearbyPlaces(nearby);
      if (!nearby.length) {
        setLocationError("Không tìm thấy quán nào trong bán kính 5km.");
      }
      return { lat, lng };
    } catch {
      setLocationError("Không thể lấy vị trí hiện tại. Hãy cho phép truy cập vị trí và thử lại.");
      return null;
    } finally {
      setLocating(false);
    }
  };

  const handleGetNearby = async () => {
    await getLocationAndLoadNearby();
  };

  const handleDecision = async () => {
    const sourceLocation = userLocation || (await getLocationAndLoadNearby());
    if (!sourceLocation) return;
    const picked = await fetchDecisionRestaurant({
      lat: sourceLocation.lat,
      lng: sourceLocation.lng,
      radiusKm: 5,
    });
    setDecisionPlace(picked);
    if (!picked) {
      setLocationError("Không có quán phù hợp trong 5km để đề xuất ngẫu nhiên.");
    }
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section id="home" className="hero-block">
          <p className="hero-kicker">Food Discovery Platform</p>
          <h1>
            Tìm quán ngon trong <span>bán kính 5km</span>
          </h1>
          <p className="hero-subtitle">
            Duyệt danh sách quán, lấy vị trí hiện tại để xem 5 quán gần bạn nhất có đánh giá cao, và để hệ thống chọn
            ngẫu nhiên một quán cho bạn.
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
                <label>Loại quán</label>
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
            <button type="button" className="brand-btn big" onClick={handleGetNearby} disabled={locating}>
              <LocateFixed size={18} />
              <span>{locating ? "Đang lấy vị trí..." : "Gần Tôi"}</span>
            </button>

            <button type="button" className="brand-btn-secondary big" onClick={handleDecision} disabled={locating}>
              <Sparkles size={18} />
              <span>Quyết định giúp tôi</span>
            </button>
          </div>
        </section>

        {locationError && <div className="surface-card inline-alert">{locationError}</div>}

        {userLocation && (
          <div className="surface-card inline-alert inline-alert-success">
            Vị trí của bạn: lat {userLocation.lat.toFixed(6)} / lng {userLocation.lng.toFixed(6)}
          </div>
        )}

        {nearbyPlaces.length > 0 && (
          <section className="section-block">
            <div className="section-head">
              <h2>5 quán gần bạn (bán kính 5km)</h2>
            </div>
            <div className="card-grid">
              {nearbyPlaces.map((place) => (
                <PlaceCard key={`nearby-${place.id}`} place={place} />
              ))}
            </div>
          </section>
        )}

        {decisionPlace && (
          <section className="section-block">
            <div className="section-head">
              <h2>Quán ngẫu nhiên đề xuất cho bạn</h2>
            </div>
            <div className="card-grid">
              <PlaceCard place={{ ...decisionPlace, isTrending: true }} />
            </div>
          </section>
        )}

        <section className="section-block">
          <div className="section-head">
            <h2>Danh sách quán ăn</h2>
          </div>
          {loading ? (
            <div className="surface-card inline-alert">Đang tải danh sách quán...</div>
          ) : filteredPlaces.length > 0 ? (
            <>
              <div className="card-grid">
                {displayedRestaurants.map((place) => (
                  <PlaceCard 
                    key={place.id} 
                    place={place}
                    currentPageRestaurantCount={displayedRestaurants.length}
                  />
                ))}
              </div>
              {hasMore && (
                <div 
                  ref={loaderRef} 
                  style={{ height: "60px", marginTop: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <div className="surface-card inline-alert" style={{ width: "100%", textAlign: "center" }}>
                    {loadingMore ? "Đang tải thêm..." : "Kéo xuống để xem thêm quán"}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="surface-card inline-alert">Không có kết quả phù hợp bộ lọc hiện tại.</div>
          )}
        </section>

        {!loading && trendingPlaces.length > 0 && (
          <section className="section-block">
            <div className="section-head">
              <h2>Quán nổi bật</h2>
            </div>
            <div className="card-grid">
              {trendingPlaces.map((place) => (
                <PlaceCard key={`trending-${place.id}`} place={place} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
