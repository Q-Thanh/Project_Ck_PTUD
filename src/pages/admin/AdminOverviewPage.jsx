import { useEffect, useMemo, useState } from "react";
import { ChartNoAxesCombined, Eye, FileClock, Store, UsersRound } from "lucide-react";
import { getAdminStats, listPosts, listRestaurants, listUsers } from "../../services/adminService";

export function AdminOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [posts, setPosts] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    let active = true;

    async function run() {
      setLoading(true);

      const [statsResult, postsResult, restaurantsResult, usersResult] = await Promise.all([
        getAdminStats("Tuan 14 / 2026"),
        listPosts(),
        listRestaurants(),
        listUsers(),
      ]);

      if (!active) {
        return;
      }

      setStats(statsResult);
      setPosts(postsResult);
      setRestaurants(restaurantsResult);
      setUsers(usersResult);
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

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <p className="admin-header-kicker">Thong ke tuan</p>
        <h2>Tong quan he thong</h2>
        <p className="muted-text">Du lieu duoc cap nhat theo contract getAdminStats(weekRange).</p>
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

          <div className="double-grid">
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
          </div>
        </>
      )}
    </div>
  );
}
