import { useEffect, useState } from "react";
import { Eye, FileCheck2, MapPinned, ShieldAlert, Star, Store } from "lucide-react";
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
      const result = await getAdminStats("Tuần hiện tại");

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
        <p className="admin-header-kicker">Thống kê nhà hàng từ data3.json</p>
        <h2>Tổng quan hệ thống nhà hàng</h2>
        <p className="muted-text">Bao gồm thống kê moderation bài đăng, người dùng và nhà hàng theo tuần.</p>
      </section>

      {loading && <div className="surface-card">Đang tải thống kê...</div>}

      {!loading && stats && (
        <>
          <section className="stats-grid">
            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Store size={18} />
              </span>
              <p>Tổng nhà hàng</p>
              <h3>{formatNumber(stats.totalRestaurants)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Eye size={18} />
              </span>
              <p>Nhà hàng đang ẩn</p>
              <h3>{formatNumber(stats.hiddenRestaurants)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <FileCheck2 size={18} />
              </span>
              <p>Bài đăng chờ duyệt</p>
              <h3>{formatNumber(stats.pendingPosts)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <ShieldAlert size={18} />
              </span>
              <p>Tài khoản bị hạn chế</p>
              <h3>{formatNumber(stats.restrictedUsers)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Star size={18} />
              </span>
              <p>Rating trung bình</p>
              <h3>{Number(stats.ratingAverage || 0).toFixed(2)}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <MapPinned size={18} />
              </span>
              <p>Tổng lượt xem</p>
              <h3>{formatNumber(stats.totalViews)}</h3>
            </article>
          </section>

          <section className="surface-card table-card">
            <div className="table-head">
              <h3>Top nhà hàng theo lượt xem</h3>
            </div>

            <div className="simple-list">
              {(stats.topViewedRestaurants || []).map((item) => (
                <div key={item.name} className="simple-list-row">
                  <span>{item.name}</span>
                  <strong>{formatNumber(item.views)} views</strong>
                </div>
              ))}
              {!(stats.topViewedRestaurants || []).length && <p className="muted-text">Chưa có dữ liệu.</p>}
            </div>
          </section>

          <div className="triple-grid">
            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Khu vực nổi bật</h3>
              </div>

              <div className="simple-list">
                {(stats.topAreas || []).map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>{item.name}</span>
                    <strong>{item.count} nhà hàng</strong>
                  </div>
                ))}
                {!(stats.topAreas || []).length && <p className="muted-text">Chưa có dữ liệu.</p>}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Top tags phổ biến</h3>
              </div>

              <div className="simple-list">
                {(stats.topRecommendedDishes || []).map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>#{item.name}</span>
                    <strong>{item.count} lần</strong>
                  </div>
                ))}
                {!(stats.topRecommendedDishes || []).length && <p className="muted-text">Chưa có dữ liệu.</p>}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Chỉ số tổng hợp</h3>
              </div>

              <div className="simple-list">
                <div className="simple-list-row">
                  <span>Tổng reviews</span>
                  <strong>{formatNumber(stats.totalReviews)}</strong>
                </div>
                <div className="simple-list-row">
                  <span>Tổng views</span>
                  <strong>{formatNumber(stats.totalViews)}</strong>
                </div>
                <div className="simple-list-row">
                  <span>Thông báo chưa đọc</span>
                  <strong>{formatNumber(stats.unreadNotifications)}</strong>
                </div>
                <div className="simple-list-row">
                  <span>Week range</span>
                  <strong>{stats.weekRange || "Tuần hiện tại"}</strong>
                </div>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
