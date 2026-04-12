import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { submitPostForModeration } from "../services/adminService";

const INITIAL_FORM = {
  restaurantName: "",
  address: "",
  category: "",
  priceLevel: "",
  time: "",
  menuHighlights: "",
  review: "",
  rating: "5",
  imageUrl: "",
};

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Khong doc duoc anh da chon."));
    reader.readAsDataURL(file);
  });
}

export default function RestaurantSubmissionForm() {
  const { isAuthenticated, session } = useAuth();
  const [form, setForm] = useState(INITIAL_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      isAuthenticated &&
      form.restaurantName.trim() &&
      form.address.trim() &&
      form.review.trim() &&
      Number(form.rating) >= 1 &&
      Number(form.rating) <= 5 &&
      (form.imageUrl.trim() || imageFile || imagePreview)
    );
  }, [form, imageFile, imagePreview, isAuthenticated]);

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0];
    setError("");

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    try {
      const preview = await readFileAsDataUrl(file);
      setImageFile(file);
      setImagePreview(preview);
    } catch (readError) {
      setError(readError.message);
      setImageFile(null);
      setImagePreview("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      setError("Ban can dang nhap truoc khi dang quan moi.");
      return;
    }

    if (!canSubmit) {
      setError("Vui long nhap ten quan, dia chi, anh, nhan xet va diem danh gia.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const imageSource = imagePreview || form.imageUrl.trim();

      await submitPostForModeration({
        title: `${form.restaurantName.trim()} - review cong dong`,
        content: form.review.trim(),
        author: session.displayName || "Nguoi dung",
        authorId: session.id || 0,
        rating: Number(form.rating),
        mediaNames: [imageFile?.name || form.imageUrl.trim() || "anh-quan"],
        restaurantSnapshot: {
          name: form.restaurantName.trim(),
          address: form.address.trim(),
          category: form.category.trim(),
          priceLevel: form.priceLevel.trim(),
          time: form.time.trim(),
          image: imageSource,
          menuHighlights: form.menuHighlights,
        },
      });

      setForm(INITIAL_FORM);
      setImageFile(null);
      setImagePreview("");
      setMessage("Bai dang da duoc gui. Admin se duyet truoc khi hien thi cong khai.");
    } catch {
      setError("Khong gui duoc bai dang. Vui long thu lai.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="surface-card submission-shell">
        <div className="submission-heading">
          <p className="hero-kicker">Cong Dong</p>
          <h2>Dang quan moi sau khi dang nhap</h2>
          <p className="muted-text">
            Ban can dang nhap de gui bai dang cho admin duyet truoc khi hien thi tren he thong.
          </p>
        </div>

        <div className="submission-auth-actions">
          <Link to="/login" className="brand-btn">
            Dang nhap de dang bai
          </Link>
          <Link to="/register" className="ghost-btn">
            Tao tai khoan moi
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card submission-shell">
      <div className="submission-heading">
        <p className="hero-kicker">Bai Dang Cua Ban</p>
        <h2>Gui quan an moi cho cong dong</h2>
        <p className="muted-text">
          Bat buoc nhap ten quan, dia chi, anh, nhan xet va danh gia. Menu va thong tin phu la tuy chon.
        </p>
      </div>

      {message && <div className="inline-alert inline-alert-success">{message}</div>}
      {error && <div className="auth-error">{error}</div>}

      <form className="submission-form" onSubmit={handleSubmit}>
        <label className="control-field">
          <span>Ten quan</span>
          <input
            value={form.restaurantName}
            onChange={(event) => updateField("restaurantName", event.target.value)}
            placeholder="Nhap ten quan"
            required
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Dia chi quan</span>
          <input
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="So nha, duong, quan..."
            required
          />
        </label>

        <label className="control-field">
          <span>Danh gia</span>
          <input
            type="number"
            min="1"
            max="5"
            step="0.5"
            value={form.rating}
            onChange={(event) => updateField("rating", event.target.value)}
            required
          />
        </label>

        <label className="control-field">
          <span>Loai mon</span>
          <input
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            placeholder="Vi du: Bun bo, Ca phe"
          />
        </label>

        <label className="control-field">
          <span>Muc gia</span>
          <input
            value={form.priceLevel}
            onChange={(event) => updateField("priceLevel", event.target.value)}
            placeholder="Vi du: $$ hoac 50.000 - 100.000"
          />
        </label>

        <label className="control-field">
          <span>Gio mo cua</span>
          <input
            value={form.time}
            onChange={(event) => updateField("time", event.target.value)}
            placeholder="Vi du: 07:00 - 22:00"
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Anh quan (URL)</span>
          <input
            value={form.imageUrl}
            onChange={(event) => updateField("imageUrl", event.target.value)}
            placeholder="Dan link anh neu ban co san"
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Hoac tai len 1 anh</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        <label className="control-field submission-form-wide">
          <span>Nhan xet cua ban</span>
          <textarea
            rows={5}
            value={form.review}
            onChange={(event) => updateField("review", event.target.value)}
            placeholder="Quan co ngon khong, khong gian ra sao, co nen quay lai khong..."
            required
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Menu noi bat (tuy chon)</span>
          <input
            value={form.menuHighlights}
            onChange={(event) => updateField("menuHighlights", event.target.value)}
            placeholder="Pho dac biet, tra dao, com suon..."
          />
        </label>

        {(imagePreview || form.imageUrl.trim()) && (
          <div className="submission-preview">
            <img src={imagePreview || form.imageUrl.trim()} alt={form.restaurantName || "Anh quan"} />
          </div>
        )}

        <div className="submission-actions">
          <button type="submit" className="brand-btn" disabled={submitting || !canSubmit}>
            {submitting ? "Dang gui..." : "Gui bai cho admin duyet"}
          </button>
          <Link to="/" className="ghost-btn">
            Ve trang chu
          </Link>
        </div>
      </form>
    </section>
  );
}
