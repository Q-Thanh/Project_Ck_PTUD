import cors from "cors";
import express from "express";
import { createStore } from "./db.js";

const port = Number(process.env.PORT || 3000);
const store = createStore();
const app = express();

app.use(cors());
app.use(express.json({ limit: "3mb" }));

function sendOk(res, payload = {}) {
  res.status(200).json({ ok: true, ...payload });
}

function sendFail(res, status, message) {
  res.status(status).json({ ok: false, message });
}

function readUserFromHeaders(req) {
  const rawId = req.header("x-user-id");
  const userId = Number(rawId);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return store.getUserById(userId) || null;
}

function requireAuth(req, res, next) {
  const user = readUserFromHeaders(req);
  if (!user) {
    sendFail(res, 401, "Unauthorized");
    return;
  }
  req.currentUser = user;
  next();
}

function requireAdmin(req, res, next) {
  const user = readUserFromHeaders(req);
  if (!user) {
    sendFail(res, 401, "Unauthorized");
    return;
  }
  if (String(user.role) !== "admin") {
    sendFail(res, 403, "Admin permission required");
    return;
  }
  req.currentUser = user;
  next();
}

app.get("/api/health", (_req, res) => {
  sendOk(res, {
    message: "SQLite backend running",
    stats: store.getHealth(),
  });
});

app.post("/api/auth/register", (req, res) => {
  const result = store.registerUser(req.body ?? {});
  if (!result.ok) {
    sendFail(res, 400, result.message || "Dang ky that bai.");
    return;
  }
  sendOk(res, {
    session: result.session,
    profile: result.profile,
  });
});

app.post("/api/auth/login", (req, res) => {
  const result = store.loginUser(req.body ?? {});
  if (!result.ok) {
    sendFail(res, 400, result.message || "Dang nhap that bai.");
    return;
  }
  sendOk(res, {
    session: result.session,
    profile: result.profile,
  });
});

app.get("/api/users/me", requireAuth, (req, res) => {
  const result = store.getMyProfile(req.currentUser.id);
  if (!result) {
    sendFail(res, 404, "Khong tim thay nguoi dung.");
    return;
  }
  sendOk(res, result);
});

app.put("/api/users/me/profile", requireAuth, (req, res) => {
  const result = store.updateMyProfile(req.currentUser.id, req.body ?? {});
  if (!result) {
    sendFail(res, 404, "Khong tim thay nguoi dung.");
    return;
  }
  sendOk(res, result);
});

app.get("/api/restaurants", (req, res) => {
  const items = store.listPublicRestaurants({
    query: req.query.query,
    area: req.query.area,
    category: req.query.category,
  });
  sendOk(res, { items });
});

app.get("/api/restaurants/nearby", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm ?? 5);
  const limit = Number(req.query.limit ?? 5);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendFail(res, 400, "lat va lng la bat buoc.");
    return;
  }
  const items = store.listNearbyRestaurants(lat, lng, { radiusKm, limit });
  sendOk(res, { items, radiusKm, total: items.length });
});

app.get("/api/restaurants/decision", (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const radiusKm = Number(req.query.radiusKm ?? 5);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    sendFail(res, 400, "lat va lng la bat buoc.");
    return;
  }
  const item = store.decideRestaurant(lat, lng, { radiusKm });
  sendOk(res, { item, radiusKm });
});

app.get("/api/restaurants/:id", (req, res) => {
  const item = store.getRestaurantById(req.params.id, { includeHidden: false });
  if (!item) {
    sendFail(res, 404, "Khong tim thay quan an.");
    return;
  }
  sendOk(res, { item });
});

app.get("/api/community/posts", (req, res) => {
  const data = store.listCommunityPosts({
    status: req.query.status || "approved",
    page: req.query.page,
    pageSize: req.query.pageSize,
    restaurantId: req.query.restaurantId,
    query: req.query.query,
  });
  sendOk(res, data);
});

app.post("/api/community/posts", requireAuth, (req, res) => {
  const result = store.submitPostForModeration(req.body ?? {}, req.currentUser);
  if (!result.ok) {
    sendFail(res, 400, result.message || "Khong tao duoc bai dang.");
    return;
  }
  sendOk(res, { post: result.post });
});

app.post("/api/community/posts/:id/comments", requireAuth, (req, res) => {
  const post = store.addCommentToPost(req.params.id, req.body ?? {}, req.currentUser);
  if (!post) {
    sendFail(res, 400, "Khong the them binh luan cho bai nay.");
    return;
  }
  sendOk(res, { post });
});

app.get("/api/admin/stats", requireAdmin, (req, res) => {
  sendOk(res, store.getAdminStats(req.query.weekRange || "Tuan hien tai"));
});

app.get("/api/admin/posts", requireAdmin, (req, res) => {
  const items = store.listPosts({
    status: req.query.status || "all",
    query: req.query.query || "",
    restaurantId: req.query.restaurantId,
  });
  sendOk(res, { items });
});

app.patch("/api/admin/posts/:id/approve", requireAdmin, (req, res) => {
  const post = store.approvePost(req.params.id, req.currentUser);
  if (!post) {
    sendFail(res, 404, "Khong tim thay bai dang.");
    return;
  }
  sendOk(res, { post });
});

app.patch("/api/admin/posts/:id/reject", requireAdmin, (req, res) => {
  const post = store.rejectPost(req.params.id, req.body?.note, req.currentUser);
  if (!post) {
    sendFail(res, 404, "Khong tim thay bai dang.");
    return;
  }
  sendOk(res, { post });
});

app.patch("/api/admin/posts/:id", requireAdmin, (req, res) => {
  const post = store.updatePost(req.params.id, req.body ?? {}, req.currentUser);
  if (!post) {
    sendFail(res, 404, "Khong tim thay bai dang.");
    return;
  }
  sendOk(res, { post });
});

app.post("/api/admin/posts/:id/tags", requireAdmin, (req, res) => {
  const post = store.attachTagsToPost(req.params.id, req.body?.tags ?? "", req.currentUser);
  if (!post) {
    sendFail(res, 404, "Khong tim thay bai dang.");
    return;
  }
  sendOk(res, { post });
});

app.get("/api/admin/restaurants", requireAdmin, (req, res) => {
  const items = store.listAdminRestaurants({
    query: req.query.query || "",
    area: req.query.area || "all",
    hidden: req.query.hidden || "all",
  });
  sendOk(res, { items });
});

app.post("/api/admin/restaurants", requireAdmin, (req, res) => {
  const item = store.createRestaurant(req.body ?? {});
  sendOk(res, { item });
});

app.patch("/api/admin/restaurants/:id", requireAdmin, (req, res) => {
  const item = store.updateRestaurant(req.params.id, req.body ?? {});
  if (!item) {
    sendFail(res, 404, "Khong tim thay quan.");
    return;
  }
  sendOk(res, { item });
});

app.patch("/api/admin/restaurants/:id/visibility", requireAdmin, (req, res) => {
  const hidden = Boolean(req.body?.hidden);
  const item = store.toggleRestaurantVisibility(req.params.id, hidden);
  if (!item) {
    sendFail(res, 404, "Khong tim thay quan.");
    return;
  }
  sendOk(res, { item });
});

app.post("/api/admin/restaurants/:id/tags", requireAdmin, (req, res) => {
  const item = store.attachTagsToRestaurant(req.params.id, req.body?.tags ?? "");
  if (!item) {
    sendFail(res, 404, "Khong tim thay quan.");
    return;
  }
  sendOk(res, { item });
});

app.post("/api/admin/restaurants/sync", requireAdmin, (_req, res) => {
  sendOk(res, store.syncRestaurantsFromSource());
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const items = store.listUsers({
    query: req.query.query || "",
    status: req.query.status || "all",
  });
  sendOk(res, { items });
});

app.get("/api/admin/users/risk-signals", requireAdmin, (req, res) => {
  const limit = Number(req.query.limit ?? 6);
  const items = store.listRiskSignals(limit);
  sendOk(res, { items });
});

app.patch("/api/admin/users/:id/status", requireAdmin, (req, res) => {
  const status = String(req.body?.status ?? "");
  const item = store.updateUserStatus(req.params.id, status);
  if (!item) {
    sendFail(res, 400, "Khong cap nhat duoc trang thai user.");
    return;
  }
  sendOk(res, { item });
});

app.get("/api/admin/notifications", requireAdmin, (req, res) => {
  const items = store.listNotifications({
    unreadOnly: req.query.unreadOnly === "true",
    targetUserId: req.query.targetUserId,
  });
  sendOk(res, { items });
});

app.patch("/api/admin/notifications/:id/read", requireAdmin, (req, res) => {
  const item = store.markNotificationRead(req.params.id);
  if (!item) {
    sendFail(res, 404, "Khong tim thay thong bao.");
    return;
  }
  sendOk(res, { item });
});

app.use((req, res) => {
  sendFail(res, 404, `Not Found: ${req.method} ${req.path}`);
});

app.listen(port, () => {
  console.log(`[backend] running at http://localhost:${port}`);
  console.log(`[backend] health check at http://localhost:${port}/api/health`);
  console.log(`[backend] sqlite: ${store.dbPath}`);

  void (async () => {
    try {
      const result = await store.geocodePendingRestaurants(20);
      console.log(
        `[backend] geocode seed done: processed=${result.processed}, updated=${result.updated}, failed=${result.failed}`,
      );
    } catch (error) {
      console.error("[backend] geocode seed failed", error);
    }
  })();
});
