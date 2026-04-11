import { useEffect, useMemo, useState } from "react";
import { BellRing, ChartNoAxesCombined, Eye, FileClock, Store, UsersRound } from "lucide-react";
import {
  getAdminStats,
  listNotifications,
  listPosts,
  listRestaurants,
  listUserRiskSignals,
  listUsers,
  markNotificationRead,
} from "../../services/adminService";

function formatDate(dateValue) {
  return new Date(dateValue).toLocaleString("vi-VN", {
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [riskSignals, setRiskSignals] = useState([]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);

      const [statsResult, postsResult, restaurantsResult, usersResult, notificationsResult, riskResult] =
        await Promise.all([
          getAdminStats("Tuan 14 / 2026"),
          listPosts(),
          listRestaurants(),
          listUsers(),
          listNotifications({ limit: 6 }),
          listUserRiskSignals(4),
        ]);

      if (!active) {
        return;
      }

      setStats(statsResult);
      setPosts(postsResult);
      setRestaurants(restaurantsResult);
      setUsers(usersResult);
      setNotifications(notificationsResult);
      setRiskSignals(riskResult);
      setLoading(false);
    }

    run();

    return () => {
      active = false;
    };
  }, []);

  const summary = useMemo(() => {
    if (!posts.length && !restaurants.length && !users.length) {
      return {
        pendingPosts: 0,
        hiddenRestaurants: 0,
        restrictedUsers: 0,
        totalViews: 0,
      };
    }

    return {
      pendingPosts: posts.filter((post) => post.status === "pending").length,
      hiddenRestaurants: restaurants.filter((restaurant) => restaurant.hidden).length,
      restrictedUsers: users.filter((user) => user.status !== "active").length,
      totalViews: restaurants.reduce((sum, restaurant) => sum + Number(restaurant.views), 0),
    };
  }, [posts, restaurants, users]);

  const unreadCount = notifications.filter((item) => item.status === "unread").length;

  const handleMarkRead = async (notificationId) => {
    await markNotificationRead(notificationId);
    const next = await listNotifications({ limit: 6 });
    setNotifications(next);
  };

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <p className="admin-header-kicker">Thong ke tuan</p>
        <h2>Tong quan he thong</h2>
        <p className="muted-text">Du lieu cap nhat theo contract getAdminStats(weekRange).</p>
      </section>

      {loading && <div className="surface-card">Dang tai thong ke...</div>}

      {!loading && (
        <>
          <section className="stats-grid">
            <article className="surface-card stat-card">
              <span className="stat-icon">
                <FileClock size={18} />
              </span>
              <p>Bai dang cho duyet</p>
              <h3>{summary.pendingPosts}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Store size={18} />
              </span>
              <p>Quan dang an</p>
              <h3>{summary.hiddenRestaurants}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <UsersRound size={18} />
              </span>
              <p>Tai khoan bi han che</p>
              <h3>{summary.restrictedUsers}</h3>
            </article>

            <article className="surface-card stat-card">
              <span className="stat-icon">
                <Eye size={18} />
              </span>
              <p>Tong luot xem quan</p>
              <h3>{summary.totalViews.toLocaleString("vi-VN")}</h3>
            </article>
          </section>

          <section className="surface-card table-card">
            <div className="table-head">
              <h3>
                <ChartNoAxesCombined size={16} />
                <span>Top quan duoc xem nhieu nhat - {stats.weekRange}</span>
              </h3>
            </div>

            <div className="simple-list">
              {stats.topViewedRestaurants.map((item) => (
                <div key={item.name} className="simple-list-row">
                  <span>{item.name}</span>
                  <strong>{item.views.toLocaleString("vi-VN")} views</strong>
                </div>
              ))}
            </div>
          </section>

          <div className="triple-grid">
            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Mon duoc goi y nhieu nhat</h3>
              </div>

              <div className="simple-list">
                {stats.topRecommendedDishes.map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>{item.name}</span>
                    <strong>{item.count} lan</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>Khu vuc hot trong tuan</h3>
              </div>

              <div className="simple-list">
                {stats.hotAreas.map((item) => (
                  <div key={item.name} className="simple-list-row">
                    <span>{item.name}</span>
                    <strong>{item.score}/100</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="surface-card table-card">
              <div className="table-head">
                <h3>
                  <AlertBadge unreadCount={unreadCount} />
                  <span>Thong bao moderation</span>
                </h3>
              </div>

              <div className="simple-list">
                {notifications.map((item) => (
                  <div key={item.id} className="simple-list-row notification-row">
                    <div>
                      <strong>{item.type}</strong>
                      <p className="muted-text">{item.message}</p>
                      <p className="muted-text">{formatDate(item.createdAt)}</p>
                    </div>
                    {item.status === "unread" ? (
                      <button type="button" className="ghost-btn" onClick={() => handleMarkRead(item.id)}>
                        Danh dau da doc
                      </button>
                    ) : (
                      <span className="status-pill status-pill-approved">da doc</span>
                    )}
                  </div>
                ))}
                {!notifications.length && <p className="muted-text">Chua co thong bao.</p>}
              </div>
            </section>
          </div>

          <section className="surface-card table-card">
            <div className="table-head">
              <h3>Nguoi dung can theo doi bat thuong</h3>
            </div>

            <div className="simple-list">
              {riskSignals.map((signal) => (
                <div key={signal.userId} className="simple-list-row risk-row">
                  <div>
                    <strong>{signal.name}</strong>
                    <p className="muted-text">{signal.lastAction}</p>
                    <div className="tag-list">
                      {(signal.abnormalFlags || []).map((flag) => (
                        <span key={`${signal.userId}-${flag}`} className="tag-chip tag-chip-warning">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className="risk-pill risk-pill-high">{signal.riskScore}/100</span>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function AlertBadge({ unreadCount }) {
  return (
    <span className={`status-pill ${unreadCount ? "status-pill-pending" : "status-pill-approved"}`}>
      <BellRing size={14} />
      <span>{unreadCount} chua doc</span>
    </span>
  );
}
