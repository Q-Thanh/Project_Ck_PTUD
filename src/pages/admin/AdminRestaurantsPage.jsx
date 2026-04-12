import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, EyeOff, Pencil, Plus, RefreshCw, Search, Tags, UploadCloud } from "lucide-react";
import {
  attachTagsToRestaurant,
  createRestaurant,
  listRestaurants,
  syncRestaurantsFromSource,
  toggleRestaurantVisibility,
  updateRestaurant,
} from "../../services/adminService";

const EMPTY_FORM = {
  name: "",
  area: "Quận 1",
  category: "Vietnamese",
  priceLevel: "",
  views: 0,
  rating: 0,
  totalReviews: 0,
  time: "",
  address: "",
  image: "",
  hidden: false,
  tags: "",
};

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

export function AdminRestaurantsPage() {
  const [filters, setFilters] = useState({ query: "", area: "all", hidden: "all" });
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagDrafts, setTagDrafts] = useState({});

  const loadRestaurants = useCallback(async () => {
    setLoading(true);
    const data = await listRestaurants(filters);
    setRestaurants(data);

    setTagDrafts((previous) => {
      const next = { ...previous };
      data.forEach((restaurant) => {
        if (!(restaurant.id in next)) {
          next[restaurant.id] = (restaurant.tags || []).join(", ");
        }
      });
      return next;
    });

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
      rating: restaurant.rating,
      totalReviews: restaurant.totalReviews,
      time: restaurant.time,
      address: restaurant.address,
      image: restaurant.image,
      hidden: restaurant.hidden,
      tags: (restaurant.tags || []).join(", "),
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

    const payload = {
      ...form,
      views: Number(form.views) || 0,
      rating: Number(form.rating) || 0,
      totalReviews: Number(form.totalReviews) || 0,
      tags: form.tags,
    };

    if (editingId) {
      await updateRestaurant(editingId, payload);
    } else {
      await createRestaurant(payload);
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

  const handleAttachTags = async (restaurantId) => {
    setBusyId(restaurantId);
    await attachTagsToRestaurant(restaurantId, tagDrafts[restaurantId] || "");
    await loadRestaurants();
    setBusyId(null);
  };

  const handleSyncSource = async () => {
    setSyncing(true);
    const result = await syncRestaurantsFromSource();
    setSyncResult(result);
    await loadRestaurants();
    setSyncing(false);
  };

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <h2>Quản lý quán ăn</h2>
        <p className="muted-text">
          Thêm, sửa, ẩn/hiện, cập nhật hình ảnh/thông tin và đồng bộ dữ liệu quán ăn từ source data3.
        </p>
      </section>

      <section className="surface-card sync-banner">
        <div>
          <h3>Đồng bộ dữ liệu với nguồn ban đầu</h3>
          <p className="muted-text">
            Cập nhật thông tin quán và bổ sung quán mới từ source để đảm bảo dữ liệu nhất quán.
          </p>
          {syncResult && (
            <p className="muted-text">
              Lần đồng bộ gần nhất: {formatDate(syncResult.syncedAt)} • Mới: {syncResult.created} • Cập nhật: {syncResult.updated}
            </p>
          )}
        </div>

        <button type="button" className="brand-btn" disabled={syncing} onClick={handleSyncSource}>
          <UploadCloud size={16} />
          <span>{syncing ? "Đang đồng bộ..." : "Đồng bộ ngay"}</span>
        </button>
      </section>

      <section className="surface-card filter-row">
        <label className="control-field control-field-search">
          <Search size={16} />
          <input
            type="search"
            value={filters.query}
            placeholder="Tìm theo tên quán / địa chỉ / loại món / tag"
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
        </label>

        <label className="control-field">
          <span>Khu vực</span>
          <select
            value={filters.area}
            onChange={(event) => setFilters((prev) => ({ ...prev, area: event.target.value }))}
          >
            {areaOptions.map((option) => (
              <option key={option} value={option}>
                {option === "all" ? "Tất cả" : option}
              </option>
            ))}
          </select>
        </label>

        <label className="control-field">
          <span>Hiển thị</span>
          <select
            value={filters.hidden}
            onChange={(event) => setFilters((prev) => ({ ...prev, hidden: event.target.value }))}
          >
            <option value="all">Tất cả</option>
            <option value="visible">Đang hiện</option>
            <option value="hidden">Đang ẩn</option>
          </select>
        </label>

        <button type="button" className="ghost-btn" onClick={loadRestaurants}>
          <RefreshCw size={15} />
          <span>Tải lại</span>
        </button>
      </section>

      <section className="surface-card table-card">
        <div className="table-head">
          <h3>{editingId ? "Cập nhật quán ăn" : "Thêm quán ăn mới"}</h3>
          {editingId && (
            <button type="button" className="ghost-btn" onClick={resetForm}>
              Hủy chỉnh sửa
            </button>
          )}
        </div>

        <form className="form-grid" onSubmit={submitForm}>
          <label className="control-field">
            <span>Tên quán</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Nhập tên quán"
              required
            />
          </label>

          <label className="control-field">
            <span>Khu vực</span>
            <input
              value={form.area}
              onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
              placeholder="VD: Quận 1"
              required
            />
          </label>

          <label className="control-field">
            <span>Loại món</span>
            <input
              value={form.category}
              onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
              placeholder="VD: Nhà hàng Việt"
              required
            />
          </label>

          <label className="control-field">
            <span>Mức giá</span>
            <input
              value={form.priceLevel}
              onChange={(event) => setForm((prev) => ({ ...prev, priceLevel: event.target.value }))}
              placeholder="VD: 200.000 - 300.000 đ/người"
            />
          </label>

          <label className="control-field">
            <span>Lượt xem</span>
            <input
              type="number"
              min={0}
              value={form.views}
              onChange={(event) => setForm((prev) => ({ ...prev, views: event.target.value }))}
            />
          </label>

          <label className="control-field">
            <span>Rating</span>
            <input
              type="number"
              min={0}
              max={5}
              step="0.1"
              value={form.rating}
              onChange={(event) => setForm((prev) => ({ ...prev, rating: event.target.value }))}
            />
          </label>

          <label className="control-field">
            <span>Tổng reviews</span>
            <input
              type="number"
              min={0}
              value={form.totalReviews}
              onChange={(event) => setForm((prev) => ({ ...prev, totalReviews: event.target.value }))}
            />
          </label>

          <label className="control-field">
            <span>Giờ mở cửa</span>
            <input
              value={form.time}
              onChange={(event) => setForm((prev) => ({ ...prev, time: event.target.value }))}
              placeholder="VD: Đang mở cửa"
            />
          </label>

          <label className="control-field">
            <span>Địa chỉ</span>
            <input
              value={form.address}
              onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))}
              placeholder="Nhập địa chỉ"
            />
          </label>

          <label className="control-field">
            <span>URL hình ảnh</span>
            <input
              value={form.image}
              onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))}
              placeholder="https://..."
            />
          </label>

          <label className="control-field">
            <span>Tags</span>
            <input
              value={form.tags}
              onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
              placeholder="vd: bun-bo, breakfast"
            />
          </label>

          <label className="control-check">
            <input
              type="checkbox"
              checked={form.hidden}
              onChange={(event) => setForm((prev) => ({ ...prev, hidden: event.target.checked }))}
            />
            <span>Ẩn quán sau khi lưu</span>
          </label>

          <button type="submit" className="brand-btn">
            <Plus size={16} />
            <span>{editingId ? "Lưu cập nhật" : "Thêm quán"}</span>
          </button>
        </form>
      </section>

      {loading && <div className="surface-card">Đang tải danh sách quán ăn...</div>}

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

              {restaurant.image && (
                <img
                  src={restaurant.image}
                  alt={restaurant.name}
                  className="place-image"
                  style={{ width: "100%", maxHeight: "180px", objectFit: "cover", borderRadius: "12px" }}
                />
              )}

              <p className="muted-text">Địa chỉ: {restaurant.address || "Chưa cập nhật"}</p>
              <p className="muted-text">
                Giờ mở: {restaurant.time || "Chưa cập nhật"} • Rating: {Number(restaurant.rating || 0).toFixed(1)} • Reviews: {Number(
                  restaurant.totalReviews || 0,
                ).toLocaleString("vi-VN")}
              </p>
              <p className="muted-text">Lượt xem: {restaurant.views.toLocaleString("vi-VN")}</p>
              <p className="muted-text">
                Sync: {restaurant.sourceSyncStatus} • {formatDate(restaurant.lastSyncedAt)}
              </p>

              <div className="tag-list">
                {(restaurant.tags || []).map((tag) => (
                  <span key={`${restaurant.id}-${tag}`} className="tag-chip">
                    #{tag}
                  </span>
                ))}
              </div>

              <label className="control-field">
                <span>Cập nhật tags</span>
                <div className="inline-row">
                  <input
                    value={tagDrafts[restaurant.id] ?? ""}
                    onChange={(event) =>
                      setTagDrafts((prev) => ({
                        ...prev,
                        [restaurant.id]: event.target.value,
                      }))
                    }
                    placeholder="vd: family, rooftop"
                  />

                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busyId === restaurant.id}
                    onClick={() => handleAttachTags(restaurant.id)}
                  >
                    <Tags size={15} />
                    <span>Gắn tag</span>
                  </button>
                </div>
              </label>

              <div className="moderation-actions">
                <button type="button" className="ghost-btn" onClick={() => startEdit(restaurant)}>
                  <Pencil size={15} />
                  <span>Sửa thông tin</span>
                </button>

                <button
                  type="button"
                  className="brand-btn-secondary"
                  disabled={busyId === restaurant.id}
                  onClick={() => handleToggleVisibility(restaurant)}
                >
                  {restaurant.hidden ? <Eye size={15} /> : <EyeOff size={15} />}
                  <span>{restaurant.hidden ? "Hiện quán" : "Ẩn quán"}</span>
                </button>
              </div>
            </article>
          ))}

          {!restaurants.length && <article className="surface-card">Không có quán ăn phù hợp bộ lọc.</article>}
        </section>
      )}
    </div>
  );
}
