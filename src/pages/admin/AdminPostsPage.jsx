import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleX, RefreshCw, Save, Search, Tags } from "lucide-react";
import {
  approvePost,
  attachTagsToPost,
  listPosts,
  rejectPost,
  updatePost,
} from "../../services/adminService";

const STATUS_OPTIONS = [
  { value: "all", label: "Tat ca" },
  { value: "pending", label: "Cho duyet" },
  { value: "approved", label: "Da duyet" },
  { value: "rejected", label: "Tu choi" },
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

export function AdminPostsPage() {
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
        <h2>Quan ly bai dang</h2>
        <p className="muted-text">
          Duyet, tu choi, cap nhat vi pham, gan tag va theo doi moderation history.
        </p>
      </section>

      <section className="surface-card filter-row">
        <label className="control-field control-field-search">
          <Search size={16} />
          <input
            type="search"
            value={filters.query}
            placeholder="Tim theo tieu de, tac gia, noi dung"
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
        </label>

        <label className="control-field">
          <span>Trang thai</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="ghost-btn" onClick={loadPosts}>
          <RefreshCw size={15} />
          <span>Tai lai</span>
        </button>
      </section>

      <section className="status-counters">
        <span className="status-pill">Tat ca: {counters.all}</span>
        <span className="status-pill status-pill-pending">Cho duyet: {counters.pending}</span>
        <span className="status-pill status-pill-approved">Da duyet: {counters.approved}</span>
        <span className="status-pill status-pill-rejected">Tu choi: {counters.rejected}</span>
      </section>

      {loading && <div className="surface-card">Dang tai danh sach bai dang...</div>}

      {!loading && (
        <section className="card-stack">
          {posts.map((post) => (
            <article key={post.id} className="surface-card moderation-card">
              <div className="moderation-header">
                <div>
                  <h3>{post.title}</h3>
                  <p className="muted-text">
                    Tac gia: {post.author} • Tao luc: {formatDate(post.createdAt)}
                  </p>
                </div>
                <span className={`status-pill status-pill-${post.status}`}>{post.status}</span>
              </div>

              <p className="muted-text">{post.content}</p>

              <div className="tag-list">
                {(post.tags || []).map((tag) => (
                  <span key={`${post.id}-${tag}`} className="tag-chip">
                    #{tag}
                  </span>
                ))}
                {!(post.tags || []).length && <span className="muted-text">Chua co tag</span>}
              </div>

              <label className="control-field">
                <span>Tag bai dang (tach boi dau phay)</span>
                <div className="inline-row">
                  <input
                    value={draftTags[post.id] ?? ""}
                    onChange={(event) =>
                      setDraftTags((prev) => ({
                        ...prev,
                        [post.id]: event.target.value,
                      }))
                    }
                    placeholder="vd: an-dem, quan-1"
                  />

                  <button
                    type="button"
                    className="ghost-btn"
                    disabled={busyId === post.id}
                    onClick={() =>
                      runAction(post.id, () => attachTagsToPost(post.id, draftTags[post.id] || ""))
                    }
                  >
                    <Tags size={15} />
                    <span>Gan tag</span>
                  </button>
                </div>
              </label>

              <label className="control-field">
                <span>Ghi chu quan tri / vi pham</span>
                <textarea
                  value={draftNotes[post.id] ?? ""}
                  onChange={(event) =>
                    setDraftNotes((prev) => ({
                      ...prev,
                      [post.id]: event.target.value,
                    }))
                  }
                  rows={2}
                  placeholder="Ghi chu noi dung can sua hoac ly do tu choi..."
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
                  <span>Duyet bai</span>
                </button>

                <button
                  type="button"
                  className="brand-btn-secondary"
                  disabled={busyId === post.id}
                  onClick={() =>
                    runAction(post.id, () => rejectPost(post.id, draftNotes[post.id] || undefined))
                  }
                >
                  <CircleX size={15} />
                  <span>Tu choi</span>
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
                  <span>Luu ghi chu</span>
                </button>
              </div>

              <div className="history-list">
                <p className="muted-text strong-label">Moderation history:</p>
                {(post.moderationHistory || [])
                  .slice()
                  .reverse()
                  .slice(0, 4)
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

          {!posts.length && <article className="surface-card">Khong co bai dang phu hop bo loc.</article>}
        </section>
      )}
    </div>
  );
}
