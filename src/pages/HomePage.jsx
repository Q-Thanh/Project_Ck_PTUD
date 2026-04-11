import { ArrowRight, LogOut, MapPin, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { UserRound } from "lucide-react";
import { homePlaces } from "../data/mockData";
import { fetchRestaurantsByRating, fetchRestaurantById, fetchRestaurants } from "../services/restaurantService";
import SearchBar from "../components/SearchBar";
import { useAuth } from "../context/useAuth";

function PlaceCard({ place, showTrendingBadge }) {
  return (
    <Link to={`/restaurants/${place.id}`} className="block">
      <article className="surface-card place-card">
        <div className="place-image-wrap">
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
              <span>{place.rating.toFixed(1)}</span>
            </span>
          </div>
          <p className="muted-text">
            {place.category} • {place.address}
          </p>
          <p className="muted-text">Mo cua: {place.time}</p>
        </div>
      </article>
    </Link>
  );
}

export function HomePage() {
  const { session, isAdmin, isAuthenticated, loginAsAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [places, setPlaces] = useState(homePlaces);
  const trendingPlaces = places.filter((item) => item.isTrending).slice(0, 4);
  const orderedPlaces = [...places].sort((a, b) => Number(b.isTrending) - Number(a.isTrending));

  const [randomLoading, setRandomLoading] = useState(false);
  const [nearLoading, setNearLoading] = useState(false);

  const authMessage = location.state?.authMessage;
  const deniedPath = location.state?.deniedPath;

  const handleStartAdminSession = () => {
    loginAsAdmin();
    navigate("/admin");
  };

  async function handleSearch(filters) {
    const result = await fetchRestaurants(filters);
    setPlaces(result);
  }

  async function handleDecideForMe() {
    try {
      setRandomLoading(true);
      const list = await fetchRestaurantsByRating(4.0);
      if (!list || list.length === 0) {
        alert("Khong tim thay quan > 4.0");
        return;
      }
      const chosen = list[Math.floor(Math.random() * list.length)];
      navigate(`/restaurants/${chosen.id}`);
    } finally {
      setRandomLoading(false);
    }
  }

  function haversineDistance(lat1, lon1, lat2, lon2) {
    function toRad(x) {
      return (x * Math.PI) / 180;
    }
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function handleNearMe() {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported");
      return;
    }
    setNearLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const list = await fetchRestaurants();
          // enrich coords by fetching each item's details (mock)
          const withCoords = await Promise.all(
            list.map(async (r) => {
              const full = await fetchRestaurantById(r.id);
              return { ...r, coords: full?.coords };
            })
          );
          const filtered = withCoords.filter((r) => {
            if (!r.coords) return false;
            const d = haversineDistance(latitude, longitude, r.coords.lat, r.coords.lng);
            return d <= 1.0;
          });
          if (filtered.length === 0) alert("Khong tim thay quan trong ban kinh 1km (mock)");
          setPlaces(filtered.length ? filtered : list);
        } finally {
          setNearLoading(false);
        }
      },
      (err) => {
        setNearLoading(false);
        if (err.code === err.PERMISSION_DENIED) alert("Ban da tu choi quyen vi tri");
        else alert("Khong the lay vi tri: " + err.message);
      }
    );
  }

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

            {!isAdmin && (
              <button type="button" className="brand-btn" onClick={handleStartAdminSession}>
                <ShieldCheck size={16} />
                <span>Bat Admin Demo</span>
              </button>
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
            Duong dan <strong>{deniedPath}</strong> can quyen admin. Ban co the bat "Admin Demo" de vao.
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
            <SearchBar onSearch={handleSearch} />
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big" onClick={handleDecideForMe} disabled={randomLoading}>
              <Sparkles size={18} />
              <span>{randomLoading ? "Dang chon..." : "Quyet Dinh Giup Toi"}</span>
            </button>
            <button type="button" className="brand-btn-secondary big" onClick={handleNearMe} disabled={nearLoading}>
              <MapPin size={18} />
              <span>{nearLoading ? "Dang tim..." : "Gan Toi"}</span>
            </button>
          </div>
        </section>

        <section id="explore" className="section-block">
          <div className="section-head">
            <h2>Trending Now</h2>
            <button type="button" className="link-btn">
              <span>Xem tat ca</span>
              <ArrowRight size={14} />
            </button>
          </div>

          <div className="card-grid">
            {trendingPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} showTrendingBadge />
            ))}
          </div>
        </section>

        <section id="community" className="section-block">
          <div className="section-head">
            <h2>All Places</h2>
            <p className="muted-text">Du lieu mau dong bo cung Admin dashboard</p>
          </div>

          <div className="card-grid">
            {orderedPlaces.map((place) => (
              <PlaceCard key={place.id} place={place} showTrendingBadge={false} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

