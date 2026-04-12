import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleX, RefreshCw, Save, Search, Tags } from "lucide-react";
import { approvePost, attachTagsToPost, listPosts, rejectPost, updatePost } from "../../services/adminService";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "pending", label: "Chờ duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "rejected", label: "Từ chối" },
];

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

export function AdminPostsModerationPage() {
  const [filters, setFilters] = useState({ status: "all", query: "" });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [draftNotes, setDraftNotes] = useState({});
  const [draftTags, setDraftTags] = useState({});

  const loadPosts = useCallback(async () => {
    setLoading(true);
    const data = await listPosts(filters);
    setPosts(data);

    setDraftNotes((previous) => {
      const next = { ...previous };
      data.forEach((post) => {
        if (!(post.id in next)) {
          next[post.id] = post.violationNotes || "";
        }
      });
      return next;
    });

    setDraftTags((previous) => {
      const next = { ...previous };
      data.forEach((post) => {
        if (!(post.id in next)) {
          next[post.id] = (post.tags || []).join(", ");
        }
      });
      return next;
    });

    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const counters = useMemo(
    () => ({
      all: posts.length,
      pending: posts.filter((post) => post.status === "pending").length,
      approved: posts.filter((post) => post.status === "approved").length,
      rejected: posts.filter((post) => post.status === "rejected").length,
    }),
    [posts],
  );

  const runAction = async (postId, action) => {
    setBusyId(postId);
    await action();
    await loadPosts();
    setBusyId(null);
  };

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <h2>Quản lý bài đăng cộng đồng</h2>
        <p className="muted-text">
          Admin có thể duyệt quán mới do user gửi lên, kiểm tra địa chỉ, hình ảnh, review và mở phần bình luận sau khi duyệt.
        </p>
      </section>

      <section className="surface-card filter-row">
        <label className="control-field control-field-search">
          <Search size={16} />
          <input
            type="search"
            value={filters.query}
            placeholder="Tìm theo tên quán, tác giả, địa chỉ, nội dung"
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
        </label>

        <label className="control-field">
          <span>Trạng thái</span>
          <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="ghost-btn" onClick={loadPosts}>
          <RefreshCw size={15} />
          <span>Tải lại</span>
        </button>
      </section>

      <section className="status-counters">
        <span className="status-pill">Tất cả: {counters.all}</span>
        <span className="status-pill status-pill-pending">Chờ duyệt: {counters.pending}</span>
        <span className="status-pill status-pill-approved">Đã duyệt: {counters.approved}</span>
        <span className="status-pill status-pill-rejected">Từ chối: {counters.rejected}</span>
      </section>

      {loading && <div className="surface-card">Đang tải bài đăng...</div>}

      {!loading && (
        <section className="card-stack">
          {posts.map((post) => (
            <article key={post.id} className="surface-card moderation-card">
              <div className="moderation-header">
                <div>
                  <h3>{post.title}</h3>
                  <p className="muted-text">
                    Tác giả: {post.author} • Tạo lúc: {formatDate(post.createdAt)}
                  </p>
                </div>
                <span className={`status-pill status-pill-${post.status}`}>{post.status}</span>
              </div>

              <div className="admin-post-snapshot">
                <div>
                  <p className="strong-label">{post.restaurantSnapshot?.name || "Quán chưa gắn tên"}</p>
                  <p className="muted-text">Địa chỉ: {post.restaurantSnapshot?.address || "Chưa cập nhật"}</p>
                  <p className="muted-text">
                    Loại món: {post.restaurantSnapshot?.category || "Chưa cập nhật"} • Giá: {post.restaurantSnapshot?.priceLevel || "Chưa cập nhật"}
                  </p>
                  <p className="muted-text">Giờ mở cửa: {post.restaurantSnapshot?.time || "Chưa cập nhật"}</p>
                  <p className="muted-text">Đánh giá user gửi: {Number(post.rating || 0).toFixed(1)}</p>
                </div>

                {post.restaurantSnapshot?.image && (
                  <img src={post.restaurantSnapshot.image} alt={post.restaurantSnapshot.name} className="admin-post-image" />
                )}
              </div>

              <p>{post.content}</p>

              <div className="tag-list">
                {(post.tags || []).map((tag) => (
                  <span key={`${post.id}-${tag}`} className="tag-chip">
                    #{tag}
                  </span>
                ))}
                {!(post.tags || []).length && <span className="muted-text">Chưa có tag</span>}
              </div>

              <label className="control-field">
                <span>Gắn tag bài đăng</span>
                <div className="inline-row">
                  <input
                    value={draftTags[post.id] ?? ""}
                    onChange={(event) =>
                      setDraftTags((prev) => ({
                        ...prev,
                        [post.id]: event.target.value,
                      }))
                    }
                    placeholder="vd: bun-bo, gan-truong, moi-mo"
                  />

                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busyId === post.id}
                    onClick={() => runAction(post.id, () => attachTagsToPost(post.id, draftTags[post.id] || ""))}
                  >
                    <Tags size={15} />
                    <span>Gắn tag</span>
                  </button>
                </div>
              </label>

              <label className="control-field">
                <span>Ghi chú moderation</span>
                <textarea
                  rows={2}
                  value={draftNotes[post.id] ?? ""}
                  onChange={(event) =>
                    setDraftNotes((prev) => ({
                      ...prev,
                      [post.id]: event.target.value,
                    }))
                  }
                  placeholder="Ghi chú lý do từ chối hoặc nhắc user bổ sung..."
                />
              </label>

              <div className="moderation-actions">
                <button
                  type="button"
                  className="brand-btn"
                  disabled={busyId === post.id}
                  onClick={() => runAction(post.id, () => approvePost(post.id))}
                >
                  <CheckCircle2 size={15} />
                  <span>Duyệt bài và mở comment</span>
                </button>

                <button
                  type="button"
                  className="brand-btn-secondary"
                  disabled={busyId === post.id}
                  onClick={() => runAction(post.id, () => rejectPost(post.id, draftNotes[post.id] || undefined))}
                >
                  <CircleX size={15} />
                  <span>Từ chối</span>
                </button>

                <button
                  type="button"
                  className="ghost-btn"
                  disabled={busyId === post.id}
                  onClick={() =>
                    runAction(post.id, () =>
                      updatePost(post.id, {
                        violationNotes: draftNotes[post.id] || "",
                      }),
                    )
                  }
                >
                  <Save size={15} />
                  <span>Lưu ghi chú</span>
                </button>
              </div>

              <div className="history-list">
                <p className="muted-text strong-label">Moderation history:</p>
                {(post.moderationHistory || [])
                  .slice()
                  .reverse()
                  .slice(0, 5)
                  .map((entry) => (
                    <div key={entry.id} className="history-item">
                      <strong>{entry.action}</strong>
                      <span>{entry.by}</span>
                      <span>{formatDate(entry.at)}</span>
                      <span>{entry.note}</span>
                    </div>
                  ))}
              </div>
            </article>
          ))}

          {!posts.length && <article className="surface-card">Không có bài đăng phù hợp bộ lọc.</article>}
        </section>
      )}
    </div>
  );
}
