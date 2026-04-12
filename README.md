# FoodFinder - Project CK PTUD

Ung dung tim quan an va cong dong review, gom 2 khoi:
- Frontend: React + Vite
- Backend: Express + SQLite (luu ben vung)

## Tinh nang chinh

- Trang chu:
  - Tim kiem/loc/sap xep quan an
  - Nut `Gan Toi` (xin quyen vi tri, goi y 5 quan trong 5km)
  - Nut `Quyet dinh giup toi` (chon ngau nhien 1 quan trong nhom top 5 gan ban)
- Cong dong:
  - Hien thi bai dang da duoc admin duyet
  - User dang bai moi vao hang cho duyet
- Ban do:
  - Hien thi marker quan an tren OpenStreetMap (React-Leaflet)
  - Bam marker de xem thong tin va vao trang chi tiet quan
- Ho so ca nhan:
  - User cap nhat display name, phone, address, dob, bio, avatar URL
- Admin:
  - Quan ly bai dang (pending/approved/rejected, tag, history)
  - Quan ly user (status active/locked/banned)
  - Quan ly nha hang (CRUD, visibility, sync)

## Cong nghe

- React 19, Vite 7
- Express 5
- SQLite (`better-sqlite3`)
- Hash mat khau: `bcryptjs`
- Ban do: `leaflet`, `react-leaflet`

## Kien truc du lieu

Backend SQLite la nguon du lieu duy nhat (khong fallback account localStorage):

- `users`
- `user_profiles`
- `restaurants`
- `posts`
- `post_comments`
- `post_moderation_history`
- `notifications`
- `geocode_cache`

DB file runtime:
- `server/data/foodfinder.db` (da duoc `.gitignore`)

## Cai dat

```bash
npm install
```

## Chay he thong (frontend + backend cung 1 link)

```bash
npm run dev:all
```

Sau khi chay:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3100`
- API dung qua frontend proxy: `http://localhost:5173/api/...`

## Script

- `npm run dev` - chay frontend
- `npm run dev:frontend` - chay frontend tai `0.0.0.0:5173`
- `npm run dev:backend` - chay backend Express + SQLite
- `npm run dev:all` - chay dong thoi frontend/backend
- `npm run lint` - eslint
- `npm run build` - build production frontend
- `npm run preview` - preview ban build

## Tai khoan mac dinh

- Admin:
  - username: `admin`
  - password: `admin`
- User demo:
  - username: `user`
  - password: `user123`

## API tieu bieu

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
4. Mo `http://localhost:5173`
5. Kiem tra health `http://localhost:5173/api/health`
6. Dang nhap admin, vao `/admin`, duyet 1 bai pending
7. Vao `/community` kiem tra bai da hien thi

## Ghi chu geocode

- Backend co geocode cache cho dia chi (Nominatim + `geocode_cache`).
- Nhung dia chi geocode fail se duoc danh dau de tranh goi lap moi lan khoi dong.
