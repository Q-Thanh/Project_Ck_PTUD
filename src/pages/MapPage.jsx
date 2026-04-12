import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, Marker, Popup, TileLayer, CircleMarker } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon2x from "leaflet/dist/images/marker-icon-2x.png";
import icon from "leaflet/dist/images/marker-icon.png";
import shadow from "leaflet/dist/images/marker-shadow.png";
import { LocateFixed } from "lucide-react";
import { AppTopNav } from "../components/AppTopNav";
import { fetchVisibleRestaurants } from "../services/publicRestaurantService";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: icon2x,
  iconUrl: icon,
  shadowUrl: shadow,
});

const DEFAULT_CENTER = [10.7769, 106.7009];

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

export function MapPage() {
  const [loading, setLoading] = useState(true);
  const [restaurants, setRestaurants] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;
    async function loadData() {
      setLoading(true);
      const data = await fetchVisibleRestaurants();
      if (!active) return;
      const withCoords = (data || []).filter(
        (item) => Number.isFinite(Number(item?.coords?.lat)) && Number.isFinite(Number(item?.coords?.lng)),
      );
      setRestaurants(withCoords);
      setLoading(false);
    }
    loadData();
    return () => {
      active = false;
    };
  }, []);

  const mapCenter = useMemo(() => {
    if (userLocation) return [userLocation.lat, userLocation.lng];
    if (restaurants.length > 0) return [restaurants[0].coords.lat, restaurants[0].coords.lng];
    return DEFAULT_CENTER;
  }, [restaurants, userLocation]);

  const handleLocate = async () => {
    setErrorMessage("");
    try {
      const position = await getCurrentPositionAsync();
      setUserLocation({
        lat: Number(position.coords.latitude),
        lng: Number(position.coords.longitude),
      });
    } catch {
      setErrorMessage("Khong the lay vi tri hien tai. Hay cho phep truy cap vi tri va thu lai.");
    }
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section className="section-block">
          <div className="section-head">
            <h2>Ban do OpenStreetMap</h2>
            <p className="muted-text">Danh dau vi tri cac quan an. Bam marker de xem thong tin va mo trang chi tiet quan.</p>
          </div>

          <div className="hero-actions" style={{ marginBottom: "16px" }}>
            <button type="button" className="brand-btn" onClick={handleLocate}>
              <LocateFixed size={16} />
              <span>Lay vi tri hien tai</span>
            </button>
          </div>

          {errorMessage && <div className="surface-card inline-alert">{errorMessage}</div>}

          {loading ? (
            <div className="surface-card inline-alert">Dang tai du lieu ban do...</div>
          ) : (
            <div className="surface-card" style={{ padding: "0", overflow: "hidden", borderRadius: "16px" }}>
              <MapContainer center={mapCenter} zoom={13} style={{ height: "560px", width: "100%" }}>
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {restaurants.map((item) => (
                  <Marker key={item.id} position={[item.coords.lat, item.coords.lng]}>
                    <Popup>
                      <div style={{ minWidth: "220px" }}>
                        <strong>{item.name}</strong>
                        <p>{item.category}</p>
                        <p>{item.shortAddress || item.address}</p>
                        <p>
                          {Number(item.rating || 0).toFixed(1)} sao / {item.reviewCount || 0} danh gia
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <Link to={`/restaurants/${item.id}`}>Chi tiet</Link>
                          <a href={item.mapsUrl} target="_blank" rel="noreferrer">
                            Google Maps
                          </a>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {userLocation && (
                  <CircleMarker center={[userLocation.lat, userLocation.lng]} radius={10} pathOptions={{ color: "#22c55e" }}>
                    <Popup>Vi tri hien tai cua ban</Popup>
                  </CircleMarker>
                )}
              </MapContainer>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
