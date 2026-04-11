import { useEffect, useState } from "react";
import { fetchRestaurants } from "../services/restaurantService";

export default function CreatePostForm() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetchRestaurants().then(setRestaurants);
  }, []);

  const handleFiles = (e) => {
    const list = Array.from(e.target.files);
    setFiles(list);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append("restaurantId", restaurantId);
    fd.append("rating", rating);
    fd.append("content", content);
    files.forEach((f, i) => fd.append("media", f));

    // mock submit
    await fetch("/api/posts", { method: "POST", body: fd }).catch(() => {});
    alert("Dang bai thanh cong (mock)");
    setContent("");
    setFiles([]);
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 space-y-3 max-w-xl">
      <h3 className="text-lg font-semibold">Tao bai dang</h3>

      <label className="block">
        Chon quan
        <select className="w-full p-2 border rounded" value={restaurantId} onChange={(e) => setRestaurantId(e.target.value)}>
          <option value="">Chon quan</option>
          {restaurants.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Danh gia
        <input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} className="w-24 p-2 border rounded" />
      </label>

      <label className="block">
        Noi dung
        <textarea className="w-full p-2 border rounded" value={content} onChange={(e) => setContent(e.target.value)} />
      </label>

      <label className="block">
        Upload (hinh/video)
        <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} />
      </label>

      <div className="flex gap-2 flex-wrap">
        {files.map((f, i) => (
          <div key={i} className="w-24 h-24 overflow-hidden rounded">
            {f.type.startsWith("image/") ? (
              <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
            ) : (
              <video src={URL.createObjectURL(f)} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      <button type="submit" className="brand-btn">Dang bai</button>
    </form>
  );
}
