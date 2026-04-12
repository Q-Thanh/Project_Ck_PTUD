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
    reader.onerror = () => reject(new Error("Không đọc được ảnh đã chọn."));
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
      setError("Bạn cần đăng nhập trước khi đăng quán mới.");
      return;
    }

    if (!canSubmit) {
      setError("Vui lòng nhập tên quán, địa chỉ, ảnh, nhận xét và điểm đánh giá.");
      return;
    }

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const imageSource = imagePreview || form.imageUrl.trim();

      const post = await submitPostForModeration({
        title: `${form.restaurantName.trim()} - review cộng đồng`,
        content: form.review.trim(),
        author: session.displayName || "Người dùng",
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

      if (!post) {
        setError("Không gửi được bài đăng. Vui lòng thử lại.");
        return;
      }

      setForm(INITIAL_FORM);
      setImageFile(null);
      setImagePreview("");
      setMessage("Bài đăng đã được gửi. Admin sẽ duyệt trước khi hiển thị công khai.");
    } catch {
      setError("Không gửi được bài đăng. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <section className="surface-card submission-shell">
        <div className="submission-heading">
          <p className="hero-kicker">Cộng Đồng</p>
          <h2>Đăng quán mới sau khi đăng nhập</h2>
          <p className="muted-text">
            Bạn cần đăng nhập để gửi bài đăng cho admin duyệt trước khi hiển thị trên hệ thống.
          </p>
        </div>

        <div className="submission-auth-actions">
          <Link to="/login" className="brand-btn">
            Đăng nhập để đăng bài
          </Link>
          <Link to="/register" className="ghost-btn">
            Tạo tài khoản mới
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="surface-card submission-shell">
      <div className="submission-heading">
        <p className="hero-kicker">Bài Đăng Của Bạn</p>
        <h2>Gửi quán ăn mới cho cộng đồng</h2>
        <p className="muted-text">
          Bắt buộc nhập tên quán, địa chỉ, ảnh, nhận xét và đánh giá. Menu và thông tin phụ là tùy chọn.
        </p>
      </div>

      {message && <div className="inline-alert inline-alert-success">{message}</div>}
      {error && <div className="auth-error">{error}</div>}

      <form className="submission-form" onSubmit={handleSubmit}>
        <label className="control-field">
          <span>Tên quán</span>
          <input
            value={form.restaurantName}
            onChange={(event) => updateField("restaurantName", event.target.value)}
            placeholder="Nhập tên quán"
            required
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Địa chỉ quán</span>
          <input
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Số nhà, đường, quận..."
            required
          />
        </label>

        <label className="control-field">
          <span>Đánh giá</span>
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
          <span>Loại món</span>
          <input
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            placeholder="Ví dụ: Bún bò, Cà phê"
          />
        </label>

        <label className="control-field">
          <span>Mức giá</span>
          <input
            value={form.priceLevel}
            onChange={(event) => updateField("priceLevel", event.target.value)}
            placeholder="Ví dụ: $$ hoặc 50.000 - 100.000"
          />
        </label>

        <label className="control-field">
          <span>Giờ mở cửa</span>
          <input
            value={form.time}
            onChange={(event) => updateField("time", event.target.value)}
            placeholder="Ví dụ: 07:00 - 22:00"
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Ảnh quán (URL)</span>
          <input
            value={form.imageUrl}
            onChange={(event) => updateField("imageUrl", event.target.value)}
            placeholder="Dán link ảnh nếu bạn có sẵn"
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Hoặc tải lên 1 ảnh</span>
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>

        <label className="control-field submission-form-wide">
          <span>Nhận xét của bạn</span>
          <textarea
            rows={5}
            value={form.review}
            onChange={(event) => updateField("review", event.target.value)}
            placeholder="Quán có ngon không, không gian ra sao, có nên quay lại không..."
            required
          />
        </label>

        <label className="control-field submission-form-wide">
          <span>Menu nổi bật (tùy chọn)</span>
          <input
            value={form.menuHighlights}
            onChange={(event) => updateField("menuHighlights", event.target.value)}
            placeholder="Phở đặc biệt, trà đào, cơm sườn..."
          />
        </label>

        {(imagePreview || form.imageUrl.trim()) && (
          <div className="submission-preview">
            <img src={imagePreview || form.imageUrl.trim()} alt={form.restaurantName || "Ảnh quán"} />
          </div>
        )}

        <div className="submission-actions">
          <button type="submit" className="brand-btn" disabled={submitting || !canSubmit}>
            {submitting ? "Đang gửi..." : "Gửi bài cho admin duyệt"}
          </button>
          <Link to="/" className="ghost-btn">
            Về trang chủ
          </Link>
        </div>
      </form>
    </section>
  );
}
