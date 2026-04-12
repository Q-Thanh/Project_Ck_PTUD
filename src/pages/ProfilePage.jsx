import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { AppTopNav } from "../components/AppTopNav";
import { useAuth } from "../context/useAuth";
import { fetchMyProfile, updateMyProfile } from "../services/userService";

const EMPTY_PROFILE = {
  displayName: "",
  phone: "",
  address: "",
  dob: "",
  bio: "",
  avatarUrl: "",
};

export function ProfilePage() {
  const { isAuthenticated, refreshSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      if (!isAuthenticated) return;
      setLoading(true);
      try {
        const data = await fetchMyProfile();
        if (!active) return;
        setProfile({
          displayName: data.profile?.displayName || data.session?.displayName || "",
          phone: data.profile?.phone || "",
          address: data.profile?.address || "",
          dob: data.profile?.dob || "",
          bio: data.profile?.bio || "",
          avatarUrl: data.profile?.avatarUrl || "",
        });
      } catch (loadError) {
        if (!active) return;
        setError(loadError.message || "Khong tai duoc thong tin profile.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, [isAuthenticated]);

  const updateField = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
    if (error) setError("");
    if (message) setMessage("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateMyProfile(profile);
      await refreshSession?.();
      setMessage("Da cap nhat thong tin ca nhan.");
    } catch (saveError) {
      setError(saveError.message || "Khong cap nhat duoc profile.");
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="page-wrap">
      <div className="app-shell">
        <AppTopNav />

        <section className="section-block">
          <div className="section-head">
            <h2>Thong tin ca nhan</h2>
            <p className="muted-text">Cap nhat ho ten, lien he, ngay sinh, gioi thieu ngan va avatar URL.</p>
          </div>

          {loading && <div className="surface-card inline-alert">Dang tai profile...</div>}
          {error && <div className="surface-card inline-alert">{error}</div>}
          {message && <div className="surface-card inline-alert inline-alert-success">{message}</div>}

          {!loading && (
            <form className="surface-card form-grid" onSubmit={handleSubmit}>
              <label className="control-field">
                <span>Ho va ten</span>
                <input value={profile.displayName} onChange={(event) => updateField("displayName", event.target.value)} />
              </label>

              <label className="control-field">
                <span>So dien thoai</span>
                <input value={profile.phone} onChange={(event) => updateField("phone", event.target.value)} />
              </label>

              <label className="control-field">
                <span>Ngay sinh</span>
                <input type="date" value={profile.dob} onChange={(event) => updateField("dob", event.target.value)} />
              </label>

              <label className="control-field">
                <span>Dia chi</span>
                <input value={profile.address} onChange={(event) => updateField("address", event.target.value)} />
              </label>

              <label className="control-field">
                <span>Avatar URL</span>
                <input value={profile.avatarUrl} onChange={(event) => updateField("avatarUrl", event.target.value)} />
              </label>

              <label className="control-field" style={{ gridColumn: "1 / -1" }}>
                <span>Gioi thieu</span>
                <textarea rows={4} value={profile.bio} onChange={(event) => updateField("bio", event.target.value)} />
              </label>

              <button type="submit" className="brand-btn" disabled={saving}>
                {saving ? "Dang luu..." : "Luu profile"}
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
