import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Search } from "lucide-react";
import {
  createRestaurant,
  listRestaurants,
  toggleRestaurantVisibility,
  updateRestaurant,
} from "../../services/adminService";

const EMPTY_FORM = {
  name: "",
  area: "Quan 1",
  category: "Vietnamese",
  priceLevel: "$$",
  views: 0,
  hidden: false,
};

export function AdminRestaurantsPage() {
  const [filters, setFilters] = useState({ query: "", area: "all", hidden: "all" });
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    const data = await listRestaurants(filters);
    setRestaurants(data);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const areaOptions = useMemo(() => {
    const set = new Set(restaurants.map((item) => item.area));
    return ["all", ...set];
  }, [restaurants]);

  const startEdit = (restaurant) => {
    setEditingId(restaurant.id);
    setForm({
      name: restaurant.name,
      area: restaurant.area,
      category: restaurant.category,
      priceLevel: restaurant.priceLevel,
      views: restaurant.views,
      hidden: restaurant.hidden,
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const submitForm = async (event) => {
    event.preventDefault();

    if (!form.name.trim()) {
      return;
    }

    if (editingId) {
      await updateRestaurant(editingId, {
        ...form,
        views: Number(form.views) || 0,
      });
    } else {
      await createRestaurant({
        ...form,
        views: Number(form.views) || 0,
      });
    }

    resetForm();
    await loadRestaurants();
  };

  const handleToggleVisibility = async (restaurant) => {
    setBusyId(restaurant.id);
    await toggleRestaurantVisibility(restaurant.id, !restaurant.hidden);
    await loadRestaurants();
    setBusyId(null);
  };

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <h2>Quan ly quan an</h2>
        <p className="muted-text">Them, sua, an hien quan va loc du lieu theo khu vuc.</p>
      </section>

      <section className="surface-card filter-row">
        <label className="control-field control-field-search">
          <Search size={16} />
          <input
            type="search"
            value={filters.query}
            placeholder="Tim theo ten quan / loai mon"
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
        </label>

        <label className="control-field">
          <span>Khu vuc</span>
          <select
            value={filters.area}
            onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))}
          >
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Tat ca" : option}
              </option>
            ))}
          </select>
        </label>

        <label className="control-field">
          <span>Hien thi</span>
          <select
            value={filters.hidden}
            onChange={(event) => setFilters((prev) => ({ ...prev, hidden: event.target.value }))}
          >
            <option value="all">Tat ca</option>
            <option value="visible">Dang hien</option>
            <option value="hidden">Dang an</option>
          </select>
        </label>

        <button type="button" className="ghost-btn" onClick={loadRestaurants}>
          <RefreshCw size={15} />
          <span>Tai lai</span>
        </button>
      </section>

      <section className="surface-card table-card">
        <div className="table-head">
          <h3>{editingId ? "Cap nhat quan an" : "Them quan an moi"}</h3>
          {editingId && (
            <button type="button" className="ghost-btn" onClick={resetForm}>
              Huy chinh sua
            </button>
          )}
        </div>

        <form className="form-grid" onSubmit={submitForm}>
          <label className="control-field">
            <span>Ten quan</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nhap ten quan"
              required
            />
          </label>

          <label className="control-field">
            <span>Khu vuc</span>
            <input
              value={form.area}
              onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
              placeholder="VD: Quan 1"
              required
            />
          </label>

          <label className="control-field">
            <span>Loai mon</span>
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="VD: Pho"
              required
            />
          </label>

          <label className="control-field">
            <span>Muc gia</span>
            <select
              value={form.priceLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, priceLevel: event.target.value }))}
            >
              <option value="$">$</option>
              <option value="$$">$$</option>
              <option value="$$$">$$$</option>
            </select>
          </label>

          <label className="control-field">
            <span>Luot xem</span>
            <input
              type="number"
              min={0}
              value={form.views}
              onChange={(event) => setForm((prev) => ({ ...prev, views: event.target.value }))}
            />
          </label>

          <label className="control-check">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(event) => setForm((prev) => ({ ...prev, hidden: event.target.checked }))}
            />
            <span>An quan sau khi luu</span>
          </label>

          <button type="submit" className="brand-btn">
            <Plus size={16} />
            <span>{editingId ? "Luu cap nhat" : "Them quan"}</span>
          </button>
        </form>
      </section>

      {loading && <div className="surface-card">Dang tai danh sach quan an...</div>}

      {!loading && (
        <section className="card-stack">
          {restaurants.map((restaurant) => (
            <article key={restaurant.id} className="surface-card moderation-card">
              <div className="moderation-header">
                <div>
                  <h3>{restaurant.name}</h3>
                  <p className="muted-text">
                    {restaurant.category} • {restaurant.area} • {restaurant.priceLevel}
                  </p>
                </div>
                <span className={`status-pill ${restaurant.hidden ? "status-pill-rejected" : "status-pill-approved"}`}>
                  {restaurant.hidden ? "hidden" : "visible"}
                </span>
              </div>

              <p className="muted-text">Luot xem: {restaurant.views.toLocaleString("vi-VN")}</p>

              <div className="moderation-actions">
                <button type="button" className="ghost-btn" onClick={() => startEdit(restaurant)}>
                  <Pencil size={15} />
                  <span>Sua thong tin</span>
                </button>

                <button
                  type="button"
                  className="brand-btn-secondary"
                  disabled={busyId === restaurant.id}
                  onClick={() => handleToggleVisibility(restaurant)}
                >
                  {restaurant.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  <span>{restaurant.hidden ? "Hien quan" : "An quan"}</span>
                </button>
              </div>
            </article>
          ))}

          {!restaurants.length && <article className="surface-card">Khong co quan an phu hop bo loc.</article>}
        </section>
      )}
    </div>
  );
}
