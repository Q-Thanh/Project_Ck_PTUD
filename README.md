# Project CK PTUD - FoodFinder

Ung dung goi y quan an gom:
- Frontend: React + Vite
- Backend mock: Node.js (`server/index.js`)
- Du lieu runtime: `data/data2.json` (thong qua `src/data/data2Runtime.js`)

`main` da duoc hop nhat theo yeu cau va tong hop cac nhanh:
- `feature/admin-mvp-ui`
- `merge-local-auth-20260407`
- `complete-project-setup`
- `add_search`

## 1) Yeu cau moi truong

- Node.js 20+ (khuyen nghi LTS)
- npm 10+

## 2) Cai dat

```bash
npm install
```

## 3) Chay frontend + backend tren cung 1 link (khuyen nghi)

```bash
npm run dev:all
```

Sau khi chay:
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3100`
- Link su dung chinh cho nguoi dung: `http://localhost:5173`
- Tat ca request auth di qua `/api` va duoc proxy tu Vite sang backend.

## 4) Cac script chinh

- `npm run dev`: chay frontend Vite mac dinh
- `npm run dev:frontend`: chay frontend tai `0.0.0.0:5173`
- `npm run dev:backend`: chay backend mock
- `npm run dev:all`: chay dong thoi backend + frontend, dung 1 link frontend
- `npm run build`: build production frontend
- `npm run preview`: preview ban build
- `npm run lint`: lint code

## 5) Bien moi truong

- `BACKEND_PORT`
  - Dung cho `dev:all` va `vite.config.js`
  - Mac dinh: `3100`
- `VITE_AUTH_API_BASE`
  - Mac dinh trong app: `/api`
  - Neu can co the override trong file `.env`

Vi du:

```bash
BACKEND_PORT=3200 npm run dev:all
```

## 6) Tai khoan test

Auth co 2 lop:
- Goi API backend (`/api/login`, `/api/register`)
- Neu backend khong tra session hop le, app fallback local account

Tai khoan fallback he thong:
- Admin: `admin` / `admin` (email: `admin@foodfinder.local`)
- User: `user` / `user123` (email: `user@foodfinder.local`)

Luu y:
- Dang ky tai khoan admin moi bi chan.
- Quyen admin yeu cau dang nhap bang tai khoan admin (khong con demo bypass).

## 7) API backend mock

Base URL thuc te cua backend: `http://localhost:<PORT>`

Endpoint:
- `GET /api/health` (hoac `/health`)
- `POST /api/login`
- `POST /api/register`

Payload mau:

```json
{
  "identifier": "admin",
  "password": "admin"
}
```

Hoac:

```json
{
  "email": "user@foodfinder.local",
  "password": "user123"
}
```

## 8) Kiem tra nhanh (smoke test)

1. `npm run lint`
2. `npm run build`
3. `npm run dev:all`
4. Mo `http://localhost:5173`
5. Mo `http://localhost:5173/api/health` va xac nhan json co `ok: true`
6. Test dang ky/dang nhap user
7. Dang nhap admin va vao `/admin`
8. Kiem tra Home/Admin su dung du lieu `data2`

## 9) Cau truc thu muc chinh

- `src/`: frontend app
- `server/`: backend mock
- `scripts/dev-all.js`: chay frontend + backend dong thoi
- `data/data2.json`: du lieu nguon
- `src/data/data2Runtime.js`: map du lieu de render UI/admin

## 10) Ghi chu

- Neu gap loi CORS khi tu chay rieng frontend/backend, uu tien dung `npm run dev:all` de su dung proxy `/api`.
- Neu muon doi cong backend, dat `BACKEND_PORT` va giu frontend truy cap qua `http://localhost:5173`.
