import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, Lock, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { listUserRiskSignals, listUsers, updateUserStatus } from "../../services/adminService";

const STATUS_FILTERS = [
  { value: "all", label: "Tat ca" },
  { value: "active", label: "Dang hoat dong" },
  { value: "locked", label: "Tam khoa" },
  { value: "banned", label: "Cam" },
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

function riskTier(score) {
  if (score >= 80) return "high";
  if (score >= 50) return "medium";
  return "low";
}

export function AdminUsersPage() {
  const [filters, setFilters] = useState({ query: "", status: "all" });
  const [users, setUsers] = useState([]);
  const [riskSignals, setRiskSignals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const [usersData, riskData] = await Promise.all([listUsers(filters), listUserRiskSignals(6)]);
    setUsers(usersData);
    setRiskSignals(riskData);
    setLoading(false);
  }, [filters]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const counters = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === "active").length,
      locked: users.filter((user) => user.status === "locked").length,
      banned: users.filter((user) => user.status === "banned").length,
    }),
    [users],
  );

  const handleUpdateStatus = async (userId, status) => {
    setBusyId(userId);
    await updateUserStatus(userId, status);
    await loadUsers();
    setBusyId(null);
  };

  return (
    <div className="admin-page-stack">
      <section className="surface-card admin-page-heading">
        <h2>Quan ly nguoi dung</h2>
        <p className="muted-text">
          Theo doi tai khoan, cap nhat trang thai va giam sat cac tin hieu hanh vi bat thuong.
        </p>
      </section>

      <section className="surface-card table-card">
        <div className="table-head">
          <h3>
            <AlertTriangle size={16} />
            <span>Nguoi dung co rui ro cao</span>
          </h3>
        </div>

        <div className="simple-list">
          {riskSignals.map((signal) => (
            <div key={signal.userId} className="simple-list-row risk-row">
              <div>
                <strong>{signal.name}</strong>
                <p className="muted-text">{signal.lastAction}</p>
              </div>
              <span className={`risk-pill risk-pill-${riskTier(signal.riskScore)}`}>{signal.riskScore}/100</span>
            </div>
          ))}
          {!riskSignals.length && <p className="muted-text">Khong co canh bao rui ro.</p>}
        </div>
      </section>

      <section className="surface-card filter-row">
        <label className="control-field control-field-search">
          <Search size={16} />
          <input
            type="search"
            value={filters.query}
            placeholder="Tim theo ten hoac email"
            onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
          />
        </label>

        <label className="control-field">
          <span>Trang thai</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="ghost-btn" onClick={loadUsers}>
          <RefreshCw size={15} />
          <span>Tai lai</span>
        </button>
      </section>

      <section className="status-counters">
        <span className="status-pill">Tong: {counters.total}</span>
        <span className="status-pill status-pill-approved">Active: {counters.active}</span>
        <span className="status-pill status-pill-pending">Locked: {counters.locked}</span>
        <span className="status-pill status-pill-rejected">Banned: {counters.banned}</span>
      </section>

      {loading && <div className="surface-card">Dang tai danh sach nguoi dung...</div>}

      {!loading && (
        <section className="card-stack">
          {users.map((user) => (
            <article key={user.id} className="surface-card moderation-card">
              <div className="moderation-header">
                <div>
                  <h3>{user.name}</h3>
                  <p className="muted-text">
                    {user.email} • role: {user.role}
                  </p>
                  <p className="muted-text">Lan hoat dong gan nhat: {formatDate(user.lastActive)}</p>
                </div>
                <span className={`status-pill status-pill-${user.status}`}>{user.status}</span>
              </div>

              <div className="inline-row">
                <span className={`risk-pill risk-pill-${riskTier(user.riskScore)}`}>Risk: {user.riskScore}/100</span>
                <span className="muted-text">Hanh dong gan nhat: {user.lastAction}</span>
              </div>

              <div className="tag-list">
                {(user.abnormalFlags || []).map((flag) => (
                  <span key={`${user.id}-${flag}`} className="tag-chip tag-chip-warning">
                    {flag}
                  </span>
                ))}
                {!(user.abnormalFlags || []).length && <span className="muted-text">Khong co co bat thuong</span>}
              </div>

              <div className="moderation-actions">
                <button
                  type="button"
                  className="brand-btn"
                  disabled={busyId === user.id || user.status === "active"}
                  onClick={() => handleUpdateStatus(user.id, "active")}
                >
                  <ShieldCheck size={15} />
                  <span>Mo khoa</span>
                </button>

                <button
                  type="button"
                  className="brand-btn-secondary"
                  disabled={busyId === user.id || user.status === "locked"}
                  onClick={() => handleUpdateStatus(user.id, "locked")}
                >
                  <Lock size={15} />
                  <span>Tam khoa</span>
                </button>

                <button
                  type="button"
                  className="ghost-btn danger-btn"
                  disabled={busyId === user.id || user.status === "banned"}
                  onClick={() => handleUpdateStatus(user.id, "banned")}
                >
                  <Ban size={15} />
                  <span>Cam tai khoan</span>
                </button>
              </div>
            </article>
          ))}

          {!users.length && <article className="surface-card">Khong co nguoi dung phu hop bo loc.</article>}
        </section>
      )}
    </div>
  );
}
