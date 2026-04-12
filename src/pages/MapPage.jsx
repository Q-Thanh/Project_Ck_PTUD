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
    throw new Error("Trình duyệt không hỗ trợ định vị.");
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
      setErrorMessage("Không thể lấy vị trí hiện tại. Hãy cho phép truy cập vị trí và thử lại.");
    }
  };

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section className="section-block">
          <div className="section-head">
            <h2>Bản đồ OpenStreetMap</h2>
            <p className="muted-text">Đánh dấu vị trí các quán ăn. Bấm marker để xem thông tin và mở trang chi tiết quán.</p>
          </div>

          <div className="hero-actions" style={{ marginBottom: "16px" }}>
            <button type="button" className="brand-btn" onClick={handleLocate}>
              <LocateFixed size={16} />
              <span>Lấy vị trí hiện tại</span>
            </button>
          </div>

          {errorMessage && <div className="surface-card inline-alert">{errorMessage}</div>}

          {loading ? (
            <div className="surface-card inline-alert">Đang tải dữ liệu bản đồ...</div>
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
                          {Number(item.rating || 0).toFixed(1)} sao / {item.reviewCount || 0} đánh giá
                        </p>
                        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                          <Link to={`/restaurants/${item.id}`}>Chi tiết</Link>
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
                    <Popup>Vị trí hiện tại của bạn</Popup>
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
