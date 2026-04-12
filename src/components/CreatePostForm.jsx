import { useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { fetchRestaurants } from "../services/restaurantService";
import { submitPostForModeration } from "../services/adminService";

export default function CreatePostForm() {
  const { session } = useAuth();
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchRestaurants().then(setRestaurants);
  }, []);

  const handleFiles = (event) => {
    const list = Array.from(event.target.files || []);
    setFiles(list);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!restaurantId || !content.trim()) {
      setMessage("Vui lòng chọn quán và nhập nội dung bài đăng.");
      return;
    }

    const selectedRestaurant = restaurants.find((item) => String(item.id) === String(restaurantId));

    const post = await submitPostForModeration({
      restaurantId,
      rating: Number(rating) || 5,
      content: content.trim(),
      title: selectedRestaurant ? `Review ${selectedRestaurant.name}` : "Bài chia sẻ mới",
      author: session?.displayName || "Người dùng",
      authorId: session?.id || 0,
      tags: selectedRestaurant?.category ? [selectedRestaurant.category] : [],
      mediaNames: files.map((file) => file.name),
    });

    if (!post) {
      setMessage("Không đăng bài được. Vui lòng thử lại.");
      return;
    }

    setMessage("Đăng bài thành công. Bài đăng đã vào trạng thái chờ duyệt.");
    setContent("");
    setFiles([]);
    setRestaurantId("");
    setRating(5);
  };

  return (
    <form onSubmit={handleSubmit} className="surface-card p-4 space-y-3 max-w-xl">
      <h3 className="text-lg font-semibold">Tạo bài đăng</h3>

      {message && <p className="muted-text">{message}</p>}

      <label className="block">
        Chọn quán
        <select className="w-full p-2 border rounded" value={restaurantId} onChange={(event) => setRestaurantId(event.target.value)}>
          <option value="">Chọn quán</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name}
            </option>
          ))}
        </select>
      </label>

      <label>
        Đánh giá
        <input
          type="number"
          min="1"
          max="5"
          value={rating}
          onChange={(event) => setRating(event.target.value)}
          className="w-24 p-2 border rounded"
        />
      </label>

      <label className="block">
        Nội dung
        <textarea className="w-full p-2 border rounded" value={content} onChange={(event) => setContent(event.target.value)} />
      </label>

      <label className="block">
        Upload (hinh/video)
        <input type="file" multiple accept="image/*,video/*" onChange={handleFiles} />
      </label>

      <div className="flex gap-2 flex-wrap">
        {files.map((file, index) => (
          <div key={`${file.name}-${index}`} className="w-24 h-24 overflow-hidden rounded">
            {file.type.startsWith("image/") ? (
              <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
            ) : (
              <video src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
            )}
          </div>
        ))}
      </div>

      <button type="submit" className="brand-btn">
        Đăng bài
      </button>
    </form>
  );
}
