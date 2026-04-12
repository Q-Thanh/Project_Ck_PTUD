import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { LocateFixed, Search, Sparkles, Star } from "lucide-react";
import { AppTopNav } from "../components/AppTopNav";
import {
  fetchDecisionRestaurant,
  fetchNearbyRestaurants,
  fetchVisibleRestaurants,
} from "../services/publicRestaurantService";

function PlaceCard({ place }) {
  return (
    <article className="surface-card place-card">
      <div className="place-image-wrap">
        <img src={place.image} alt={place.name} className="place-image" />
        {place.isTrending && (
          <div className="place-badges">
            <span className="highlight-badge">Top</span>
            <span className="price-badge">Gan ban</span>
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
          <Link to={`/restaurants/${place.id}`} className="brand-btn">
            Xem chi tiet
          </Link>
          <a href={place.mapsUrl} target="_blank" rel="noreferrer" className="ghost-btn">
            Mo Maps
          </a>
        </div>
      </div>
    </article>
  );
}

async function getCurrentPositionAsync() {
  if (!navigator.geolocation) {
    throw new Error("Trinh duyet khong ho tro dinh vi.");
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

  const trendingPlaces = useMemo(() => filteredPlaces.filter((place) => place.isTrending).slice(0, 4), [filteredPlaces]);

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
        setLocationError("Khong tim thay quan nao trong ban kinh 5km.");
      }
      return { lat, lng };
    } catch {
      setLocationError("Khong the lay vi tri hien tai. Hay cho phep truy cap vi tri va thu lai.");
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
      setLocationError("Khong co quan phu hop trong 5km de de xuat ngau nhien.");
    }
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section id="home" className="hero-block">
          <p className="hero-kicker">Food Discovery Platform</p>
          <h1>
            Tim quan ngon trong <span>ban kinh 5km</span>
          </h1>
          <p className="hero-subtitle">
            Duyet danh sach quan, lay vi tri hien tai de xem 5 quan gan ban nhat co danh gia cao, va de he thong chon
            ngau nhien mot quan cho ban.
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
                  <option value="reviews">Nhieu danh gia</option>
                  <option value="price">Gia hop ly</option>
                </select>
              </div>
            </div>
          </div>

          <div className="hero-actions">
            <button type="button" className="brand-btn big" onClick={handleGetNearby} disabled={locating}>
              <LocateFixed size={18} />
              <span>{locating ? "Dang lay vi tri..." : "Gan Toi"}</span>
            </button>

            <button type="button" className="brand-btn-secondary big" onClick={handleDecision} disabled={locating}>
              <Sparkles size={18} />
              <span>Quyet dinh giup toi</span>
            </button>
          </div>
        </section>

        {locationError && <div className="surface-card inline-alert">{locationError}</div>}

        {userLocation && (
          <div className="surface-card inline-alert inline-alert-success">
            Vi tri cua ban: lat {userLocation.lat.toFixed(6)} / lng {userLocation.lng.toFixed(6)}
          </div>
        )}

        {nearbyPlaces.length > 0 && (
          <section className="section-block">
            <div className="section-head">
              <h2>5 quan gan ban (ban kinh 5km)</h2>
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
              <h2>Quan ngau nhien de xuat cho ban</h2>
            </div>
            <div className="card-grid">
              <PlaceCard place={{ ...decisionPlace, isTrending: true }} />
            </div>
          </section>
        )}

        <section className="section-block">
          <div className="section-head">
            <h2>Danh sach quan an</h2>
          </div>
          {loading ? (
            <div className="surface-card inline-alert">Dang tai danh sach quan...</div>
          ) : filteredPlaces.length > 0 ? (
            <div className="card-grid">
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} />
              ))}
            </div>
          ) : (
            <div className="surface-card inline-alert">Khong co ket qua phu hop bo loc hien tai.</div>
          )}
        </section>

        {!loading && trendingPlaces.length > 0 && (
          <section className="section-block">
            <div className="section-head">
              <h2>Quan noi bat</h2>
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
