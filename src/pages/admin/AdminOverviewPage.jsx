import { useEffect, useState } from "react";
import { Eye, MapPinned, Star, Store } from "lucide-react";
import { getAdminStats } from "../../services/adminService";

function formatNumber(value) {
  return Number(value || 0).toLocaleString("vi-VN");
}

export function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;

    async function load() {
      setLoading(true);
      const result = await getAdminStats("Tuan hien tai");

      if (!active) {
        return;
      }

      setStats(result);
      setLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <p className="admin-header-kicker">Thong ke nha hang tu data2.json</p>
        <h2>Tong quan he thong nha hang</h2>
        <p className="muted-text">Admin duoc toi gian hoa: chi quan ly danh sach nha hang.</p>
      </section>

      {loading && <div className="surface-card">Dang tai thong ke...</div>}

      {!loading && stats && (
        <>
          <section className="stats-grid">
            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Store size={18} />
              </span>
              <p>Tong nha hang</p>
              <h3>{formatNumber(stats.totalRestaurants)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Eye size={18} />
              </span>
              <p>Nha hang dang an</p>
              <h3>{formatNumber(stats.hiddenRestaurants)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Star size={18} />
              </span>
              <p>Rating trung binh</p>
              <h3>{Number(stats.ratingAverage || 0).toFixed(2)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <MapPinned size={18} />
              </span>
              <p>Tong luot xem</p>
              <h3>{formatNumber(stats.totalViews)}</h3>
            </article>
          </section>

          <section className="surface-card table-card">
            <div className="table-head">
              <h3>Top nha hang theo luot xem</h3>
            </div>

            <div className="simple-list">
              {(stats.topViewedRestaurants || []).map((item) => (
                <div key={item.name} className="simple-list-row">
                  <span>{item.name}</span>
                  <strong>{formatNumber(item.views)} views</strong>
                </div>
              ))}
              {!(stats.topViewedRestaurants || []).length && <p className="muted-text">Chua co du lieu.</p>}
            </div>
          </section>

          <div className="triple-grid">
            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Khu vuc noi bat</h3>
              </div>

              <div className="simple-list">
                {(stats.topAreas || []).map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>{item.name}</span>
                    <strong>{item.count} nha hang</strong>
                  </div>
                ))}
                {!(stats.topAreas || []).length && <p className="muted-text">Chua co du lieu.</p>}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Top tags pho bien</h3>
              </div>

              <div className="simple-list">
                {(stats.topRecommendedDishes || []).map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>#{item.name}</span>
                    <strong>{item.count} lan</strong>
                  </div>
                ))}
                {!(stats.topRecommendedDishes || []).length && <p className="muted-text">Chua co du lieu.</p>}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Chi so tong hop</h3>
              </div>

              <div className="simple-list">
                <div className="simple-list-row">
                  <span>Tong reviews</span>
                  <strong>{formatNumber(stats.totalReviews)}</strong>
                </div>
                <div className="simple-list-row">
                  <span>Tong views</span>
                  <strong>{formatNumber(stats.totalViews)}</strong>
                </div>
                <div className="simple-list-row">
                  <span>Week range</span>
                  <strong>{stats.weekRange || "Tuan hien tai"}</strong>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
