# FoodFinder - Project CK PTUD

Ứng dụng tìm quán ăn và cộng đồng review, gồm 2 khối:
- Frontend: React + Vite
- Backend: Express + SQLite (lưu bền vững)

## Tính năng chính

- Trang chủ:
  - Tìm kiếm/lọc/sắp xếp quán ăn
  - Nút `Gần Tôi` (xin quyền vị trí, gợi ý 5 quán trong 5km)
  - Nút `Quyết định giúp tôi` (chọn ngẫu nhiên 1 quán trong nhóm top 5 gần bạn)
- Cộng đồng:
  - Hiển thị bài đăng đã được admin duyệt
  - User đăng bài mới vào hàng chờ duyệt
- Bản đồ:
  - Hiển thị marker quán ăn trên OpenStreetMap (React-Leaflet)
  - Bấm marker để xem thông tin và vào trang chi tiết quán
- Hồ sơ cá nhân:
  - User cập nhật display name, phone, address, dob, bio, avatar URL
- Admin:
  - Quản lý bài đăng (pending/approved/rejected, tag, history)
  - Quản lý user (status active/locked/banned)
  - Quản lý nhà hàng (CRUD, visibility, sync)

## Công nghệ

- React 19, Vite 7
- Express 5
- SQLite (`better-sqlite3`)
- Hash mật khẩu: `bcryptjs`
- Bản đồ: `leaflet`, `react-leaflet`

## Kiến trúc dữ liệu

Backend SQLite là nguồn dữ liệu duy nhất (không fallback account localStorage):

- `users`
- `user_profiles`
- `restaurants`
- `posts`
- `post_comments`
- `post_moderation_history`
- `notifications`
- `geocode_cache`

DB file runtime:
- `server/data/foodfinder.db` (đã được `.gitignore`)

## Cài đặt

```bash
npm install
```

## Chạy hệ thống (frontend + backend cùng 1 link)

```bash
npm run dev:all
```

Sau khi chạy:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3100`
- API dùng qua frontend proxy: `http://localhost:5173/api/...`

## Script

- `npm run dev` - chạy frontend
- `npm run dev:frontend` - chạy frontend tại `0.0.0.0:5173`
- `npm run dev:backend` - chạy backend Express + SQLite
- `npm run dev:all` - chạy đồng thời frontend/backend
- `npm run lint` - eslint
- `npm run build` - build production frontend
- `npm run preview` - preview bản build

## Tài khoản mặc định

- Admin:
  - username: `admin`
  - password: `admin`
- User demo:
  - username: `user`
  - password: `user123`

## API tiêu biểu

- Auth:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
- User:
  - `GET /api/users/me`
  - `PUT /api/users/me/profile`
- Restaurants:
  - `GET /api/restaurants`
  - `GET /api/restaurants/:id`
  - `GET /api/restaurants/nearby?lat&lng&radiusKm=5&limit=5`
  - `GET /api/restaurants/decision?lat&lng&radiusKm=5`
- Community:
  - `GET /api/community/posts`
  - `POST /api/community/posts`
  - `POST /api/community/posts/:id/comments`
- Admin:
  - `GET /api/admin/stats`
  - `GET /api/admin/posts`
  - `PATCH /api/admin/posts/:id/approve`
  - `PATCH /api/admin/posts/:id/reject`
  - `GET /api/admin/users`
  - `PATCH /api/admin/users/:id/status`
  - `GET /api/admin/restaurants`
  - `PATCH /api/admin/restaurants/:id`
  - `PATCH /api/admin/restaurants/:id/visibility`

## Smoke test nhanh

1. `npm run lint`
2. `npm run build`
3. `npm run dev:all`
4. Mở `http://localhost:5173`
5. Kiểm tra health `http://localhost:5173/api/health`
6. Đăng nhập admin, vào `/admin`, duyệt 1 bài pending
7. Vào `/community` kiểm tra bài đã hiển thị

## Ghi chú geocode

- Backend có geocode cache cho địa chỉ (Nominatim + `geocode_cache`).
- Những địa chỉ geocode fail sẽ được đánh dấu để tránh gọi lặp mỗi lần khởi động.
