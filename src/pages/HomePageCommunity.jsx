import { useEffect, useMemo, useState } from "react";
import { ArrowRight, LogOut, MapPin, Search, ShieldCheck, Sparkles, Star, UserRound } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { fetchVisibleRestaurants } from "../services/publicRestaurantService";

function PlaceCard({ place }) {
  return (
    <article className="surface-card place-card">
      <img src={place.image} alt={place.name} className="place-image" />

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
          {place.category} • {place.area || "Khac"}
        </p>
        <p className="muted-text">Dia chi: {place.address}</p>
        <p className="muted-text">
          Mo cua: {place.time || "Chua cap nhat"} • {Number(place.distance || 0).toFixed(1)} km
        </p>

        <div className="place-card-actions">
          <Link to={`/restaurants/${place.id}`} className="brand-btn">
            Chi tiet quan
          </Link>
          {place.address && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.address)}`}
              target="_blank"
              rel="noreferrer"
              className="ghost-btn"
            >
              Google Maps
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export function HomePage() {
  const { session, isAdmin, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [recommendedPlace, setRecommendedPlace] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadRestaurants() {
      setLoading(true);
      const data = await fetchVisibleRestaurants();
      if (!mounted) return;
      setPlaces(data);
      setLoading(false);
    }

    loadRestaurants();
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
      .sort((a, b) => {
        switch (sortBy) {
          case "distance":
            return Number(a.distance || 0) - Number(b.distance || 0);
          case "reviews":
            return Number(b.reviewCount || 0) - Number(a.reviewCount || 0);
          case "price":
            return String(a.priceLevel || "").length - String(b.priceLevel || "").length;
          case "rating":
          default:
            return Number(b.rating || 0) - Number(a.rating || 0);
        }
      });
  }, [places, searchTerm, selectedArea, selectedCategory, sortBy]);

  const trendingPlaces = useMemo(
    () => filteredPlaces.filter((place) => place.isTrending).slice(0, 4),
    [filteredPlaces],
  );

  const handleDecideForMe = () => {
    const source = filteredPlaces.length ? filteredPlaces : places;
    const best = [...source].sort((a, b) => {
      const scoreA = Number(a.rating || 0) * 100 + Number(a.reviewCount || 0) - Number(a.distance || 0) * 8;
      const scoreB = Number(b.rating || 0) * 100 + Number(b.reviewCount || 0) - Number(b.distance || 0) * 8;
      return scoreB - scoreA;
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
              <p className="brand-subtitle">Tim quan va review cong dong</p>
            </div>
          </div>

          <nav className="top-nav-links">
            <a href="#home">Home</a>
            <a href="#trending">Trending</a>
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
                <Link to="/posts/create" className="brand-btn">
                  <Sparkles size={16} />
                  <span>Dang quan moi</span>
                </Link>
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

        {authMessage && <div className="surface-card inline-alert inline-alert-success">{authMessage}</div>}

        {deniedPath && (
          <div className="surface-card inline-alert">
            Duong dan <strong>{deniedPath}</strong> can quyen admin. Dang nhap admin/admin de vao khu moderation.
          </div>
        )}

        <section id="home" className="hero-block">
          <p className="hero-kicker">Food Discovery Platform</p>
          <h1>
            Tim quan ngon va <span>chia se review</span> cung cong dong
          </h1>
          <p className="hero-subtitle">
            Xem dia chi chi tiet, mo Google Maps ngay, va gui quan moi de admin duyet truoc khi hien thi cong khai.
          </p>

          <div className="hero-search surface-card">
            <Search size={20} />
            <input
              type="text"
              placeholder="Tim theo ten quan, dia chi, loai mon..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>

          <div className="filters-section surface-card">
            <div className="filter-row">
              <div className="filter-group">
                <label>Khu vuc</label>
                <select value={selectedArea} onChange={(event) => setSelectedArea(event.target.value)} className="filter-select">
                  <option value="">Tat ca</option>
                  {areas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Loai mon</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value)}
                  className="filter-select"
                >
                  <option value="">Tat ca</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Sap xep</label>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="filter-select">
                  <option value="rating">Danh gia cao</option>
                  <option value="distance">Gan nhat</option>
                  <option value="reviews">Nhieu review</option>
                  <option value="price">Gia thap den cao</option>
                </select>
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big" onClick={handleDecideForMe}>
              <Sparkles size={18} />
              <span>Quyet dinh giup toi</span>
            </button>
            <Link to="/posts/create" className="brand-btn-secondary big">
              <MapPin size={18} />
              <span>Gui quan moi</span>
            </Link>
          </div>
        </section>

        {recommendedPlace && (
          <section className="section-block">
            <div className="section-head">
              <h2>Goi y cho ban</h2>
            </div>

            <div className="surface-card recommendation-card">
              <div className="recommendation-grid">
                <img src={recommendedPlace.image} alt={recommendedPlace.name} className="recommendation-image" />
                <div className="recommendation-info">
                  <h3>{recommendedPlace.name}</h3>
                  <p className="muted-text">
                    {recommendedPlace.category} • {recommendedPlace.area} • {Number(recommendedPlace.distance || 0).toFixed(1)} km
                  </p>
                  <p className="muted-text">Dia chi: {recommendedPlace.address}</p>
                  <p className="muted-text">
                    Danh gia {Number(recommendedPlace.rating || 0).toFixed(1)} sao tu {recommendedPlace.reviewCount || 0} luot
                  </p>
                  <div className="place-card-actions">
                    <Link to={`/restaurants/${recommendedPlace.id}`} className="brand-btn">
                      Xem chi tiet
                    </Link>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(recommendedPlace.address)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="ghost-btn"
                    >
                      Mo Google Maps
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <section id="trending" className="section-block">
          <div className="section-head">
            <h2>Trending Now</h2>
            <p className="muted-text">Nhung quan duoc xem va danh gia nhieu</p>
          </div>

          {loading ? (
            <div className="surface-card inline-alert">Dang tai danh sach quan...</div>
          ) : (
            <div className="card-grid">
              {(trendingPlaces.length ? trendingPlaces : filteredPlaces.slice(0, 4)).map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          )}
        </section>

        <section id="community" className="section-block">
          <div className="section-head">
            <h2>Cong dong quan an</h2>
            <p className="muted-text">Quan duoc admin duyet se xuat hien tai day de moi nguoi tiep tuc danh gia.</p>
          </div>

          {!loading && (
            <div className="community-cta surface-card">
              <div>
                <h3>Ban vua an duoc mot quan hay?</h3>
                <p className="muted-text">
                  Dang dia chi, anh va nhan xet cua ban. Bai dang se vao khu moderation de admin kiem duyet.
                </p>
              </div>
              <Link to="/posts/create" className="brand-btn">
                <ArrowRight size={16} />
                <span>Mo form dang quan</span>
              </Link>
            </div>
          )}

          {loading ? (
            <div className="surface-card inline-alert">Dang tai du lieu cong dong...</div>
          ) : (
            <>
              {filteredPlaces.length > 0 ? (
                <div className="card-grid">
                  {filteredPlaces.map((place) => (
                    <PlaceCard key={place.id} place={place} />
                  ))}
                </div>
              ) : (
                <div className="surface-card inline-alert">Khong tim thay quan nao phu hop bo loc hien tai.</div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
