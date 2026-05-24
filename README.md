# FoodFinder - Project CK PTUD

Ung dung tim quan an va cong dong review, gom 2 khoi:
- Frontend: React + Vite
- Backend: Express + Supabase PostgreSQL

## Tinh nang chinh

- Trang chu:
  - Tim kiem, loc, sap xep quan an
  - Nut `Gan Toi` goi y quan trong ban kinh gan vi tri nguoi dung
  - Nut `Quyet dinh giup toi` chon ngau nhien mot quan trong nhom goi y
- Cong dong:
  - Hien thi bai dang da duoc admin duyet
  - User dang bai moi vao hang cho duyet
- Ban do:
  - Hien thi marker quan an tren OpenStreetMap
  - Bam marker de xem thong tin va vao trang chi tiet quan
- Ho so ca nhan:
  - User cap nhat display name, phone, address, dob, bio, avatar URL
- Admin:
  - Quan ly bai dang, user, nha hang, thong bao va thong ke

## Cong nghe

- React 19, Vite 7
- Express 5
- Supabase PostgreSQL qua package `pg`
- Bien moi truong local qua `dotenv`
- Hash mat khau: `bcryptjs`
- Ban do: `leaflet`, `react-leaflet`

## Cau hinh Supabase PostgreSQL

1. Tao file `.env` o thu muc goc project.
2. Lay connection string trong Supabase Project Settings -> Database.
3. Dien vao `.env` theo mau:

```bash
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
PGSSLMODE=require
BACKEND_PORT=3100
```

Khong commit file `.env`. File `.env.example` chi la mau va khong chua mat khau that.

Luu y bao mat: neu connection string that da tung duoc gui len chat, nen doi lai mat khau database trong Supabase sau khi cau hinh xong.

## Kien truc du lieu

Backend PostgreSQL la nguon du lieu duy nhat. Khi backend khoi dong, no tu tao cac bang neu chua co va seed du lieu demo neu database dang trong:

- `users`
- `user_profiles`
- `restaurants`
- `posts`
- `post_comments`
- `post_moderation_history`
- `notifications`
- `geocode_cache`

## Cai dat

```bash
npm install
```

## Chay he thong frontend + backend

```bash
npm run dev:all
```

Sau khi chay:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3100`
- API qua frontend proxy: `http://localhost:5173/api/...`

## Chay bang Docker

Docker mode chay 1 container app duy nhat:
- Build React/Vite thanh thu muc `dist`
- Chay Express bang `npm run server`
- Express phuc vu API `/api/...`
- Express phuc vu frontend production tu `dist`
- Database khong nam trong container; app ket noi Supabase/PostgreSQL ngoai qua `DATABASE_URL`

### Chuan bi env Docker

Tao file `.env.docker` tu file mau:

```bash
cp .env.docker.example .env.docker
```

Dien cac bien quan trong:

```bash
DATABASE_URL=postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres
PGSSLMODE=require
SESSION_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
PORT=3100
COOKIE_SECURE=false
FRONTEND_ORIGIN=http://localhost:3100
BACKEND_ORIGIN=http://localhost:3100
```

Neu dung OAuth local trong Docker, cau hinh redirect trong Google/Facebook console ve:

```bash
GOOGLE_REDIRECT_URI=http://localhost:3100/api/auth/google/callback
FACEBOOK_REDIRECT_URI=http://localhost:3100/api/auth/facebook/callback
```

### Build va chay container

```bash
docker compose up --build
```

Sau khi chay:
- App: `http://localhost:3100`
- Health check: `http://localhost:3100/api/health`

Tai khoan mac dinh:
- Admin: `admin` / `admin`
- User demo: `user` / `user123`

### Chia se cho nguoi khac

Nguoi khac chi can clone repo va tao env rieng:

```bash
git clone https://github.com/Q-Thanh/Project_Ck_PTUD.git
cd Project_Ck_PTUD
cp .env.docker.example .env.docker
docker compose up --build
```

Khong commit `.env` hoac `.env.docker`. Chi commit `.env.example` va `.env.docker.example`.

## Script

- `npm run dev` - chay frontend
- `npm run dev:frontend` - chay frontend tai `0.0.0.0:5173`
- `npm run dev:backend` - chay backend Express + Supabase PostgreSQL
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

1. Tao `.env` tu `.env.example`.
2. `npm install`
3. `npm run lint`
4. `npm run build`
5. `npm run dev:all`
6. Mo `http://localhost:5173`
7. Kiem tra health `http://localhost:5173/api/health`
8. Dang nhap admin, vao `/admin`, duyet mot bai pending
9. Vao Supabase Table Editor kiem tra cac bang va du lieu seed

## Ghi chu geocode

- Backend co geocode cache cho dia chi bang Nominatim + bang `geocode_cache`.
- Nhung dia chi geocode fail se duoc danh dau de tranh goi lap lai moi lan khoi dong.
