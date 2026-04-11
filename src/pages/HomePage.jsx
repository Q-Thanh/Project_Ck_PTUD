import { ArrowRight, LogOut, MapPin, Search, ShieldCheck, Sparkles, Star } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { UserRound } from "lucide-react";
import { homePlaces } from "../data/mockData";
import { useAuth } from "../context/useAuth";

function PlaceCard({ place, showTrendingBadge }) {
  return (
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
  );
}

export function HomePage() {
  const { session, isAdmin, isAuthenticated, logout } = useAuth();
  const location = useLocation();

  const trendingPlaces = homePlaces.filter((item) => item.isTrending).slice(0, 4);
  const orderedPlaces = [...homePlaces].sort((a, b) => Number(b.isTrending) - Number(a.isTrending));

  const authMessage = location.state?.authMessage;
  const deniedPath = location.state?.deniedPath;

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
            <input type="text" placeholder="Tim pho, com tam, ca phe..." aria-label="search" />
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big">
              <Sparkles size={18} />
              <span>Quyet Dinh Giup Toi</span>
            </button>
            <button type="button" className="brand-btn-secondary big">
              <MapPin size={18} />
              <span>Gan Toi</span>
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