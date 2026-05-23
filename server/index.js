import cors from "cors";
import express from "express";
import { createStore } from "./db.js";

const port = Number(process.env.PORT || process.env.BACKEND_PORT || 3000);

function sendOk(res, payload = {}) {
  res.status(200).json({ ok: true, ...payload });
}

function sendFail(res, status, message) {
  res.status(status).json({ ok: false, message });
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

async function main() {
  const store = await createStore();
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "3mb" }));

  async function readUserFromHeaders(req) {
    const rawId = req.header("x-user-id");
    const userId = Number(rawId);
    if (!Number.isFinite(userId) || userId <= 0) return null;
    return (await store.getUserById(userId)) || null;
  }

  const requireAuth = asyncHandler(async (req, res, next) => {
    const user = await readUserFromHeaders(req);
    if (!user) {
      sendFail(res, 401, "Unauthorized");
      return;
    }
    req.currentUser = user;
    next();
  });

  const requireAdmin = asyncHandler(async (req, res, next) => {
    const user = await readUserFromHeaders(req);
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
  });

  app.get(
    "/api/health",
    asyncHandler(async (_req, res) => {
      sendOk(res, {
        message: "Supabase PostgreSQL backend running",
        stats: await store.getHealth(),
      });
    }),
  );

  app.post(
    "/api/auth/register",
    asyncHandler(async (req, res) => {
      const result = await store.registerUser(req.body ?? {});
      if (!result.ok) {
        sendFail(res, 400, result.message || "Dang ky that bai.");
        return;
      }
      sendOk(res, {
        session: result.session,
        profile: result.profile,
      });
    }),
  );

  app.post(
    "/api/auth/login",
    asyncHandler(async (req, res) => {
      const result = await store.loginUser(req.body ?? {});
      if (!result.ok) {
        sendFail(res, 400, result.message || "Dang nhap that bai.");
        return;
      }
      sendOk(res, {
        session: result.session,
        profile: result.profile,
      });
    }),
  );

  app.get(
    "/api/users/me",
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await store.getMyProfile(req.currentUser.id);
      if (!result) {
        sendFail(res, 404, "Khong tim thay nguoi dung.");
        return;
      }
      sendOk(res, result);
    }),
  );

  app.put(
    "/api/users/me/profile",
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await store.updateMyProfile(req.currentUser.id, req.body ?? {});
      if (!result) {
        sendFail(res, 404, "Khong tim thay nguoi dung.");
        return;
      }
      sendOk(res, result);
    }),
  );

  app.get(
    "/api/restaurants",
    asyncHandler(async (req, res) => {
      const items = await store.listPublicRestaurants({
        query: req.query.query,
        area: req.query.area,
        category: req.query.category,
      });
      sendOk(res, { items });
    }),
  );

  app.get(
    "/api/restaurants/nearby",
    asyncHandler(async (req, res) => {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = Number(req.query.radiusKm ?? 5);
      const limit = Number(req.query.limit ?? 5);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        sendFail(res, 400, "lat va lng la bat buoc.");
        return;
      }
      const items = await store.listNearbyRestaurants(lat, lng, { radiusKm, limit });
      sendOk(res, { items, radiusKm, total: items.length });
    }),
  );

  app.get(
    "/api/restaurants/decision",
    asyncHandler(async (req, res) => {
      const lat = Number(req.query.lat);
      const lng = Number(req.query.lng);
      const radiusKm = Number(req.query.radiusKm ?? 5);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        sendFail(res, 400, "lat va lng la bat buoc.");
        return;
      }
      const item = await store.decideRestaurant(lat, lng, { radiusKm });
      sendOk(res, { item, radiusKm });
    }),
  );

  app.get(
    "/api/restaurants/:id",
    asyncHandler(async (req, res) => {
      const item = await store.getRestaurantById(req.params.id, { includeHidden: false });
      if (!item) {
        sendFail(res, 404, "Khong tim thay quan an.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.get(
    "/api/community/posts",
    asyncHandler(async (req, res) => {
      const data = await store.listCommunityPosts({
        status: req.query.status || "approved",
        page: req.query.page,
        pageSize: req.query.pageSize,
        restaurantId: req.query.restaurantId,
        query: req.query.query,
      });
      sendOk(res, data);
    }),
  );

  app.post(
    "/api/community/posts",
    requireAuth,
    asyncHandler(async (req, res) => {
      const result = await store.submitPostForModeration(req.body ?? {}, req.currentUser);
      if (!result.ok) {
        sendFail(res, 400, result.message || "Khong tao duoc bai dang.");
        return;
      }
      sendOk(res, { post: result.post });
    }),
  );

  app.post(
    "/api/community/posts/:id/comments",
    requireAuth,
    asyncHandler(async (req, res) => {
      const post = await store.addCommentToPost(req.params.id, req.body ?? {}, req.currentUser);
      if (!post) {
        sendFail(res, 400, "Khong the them binh luan cho bai nay.");
        return;
      }
      sendOk(res, { post });
    }),
  );

  app.get(
    "/api/admin/stats",
    requireAdmin,
    asyncHandler(async (req, res) => {
      sendOk(res, await store.getAdminStats(req.query.weekRange || "Tuan hien tai"));
    }),
  );

  app.get(
    "/api/admin/posts",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const items = await store.listPosts({
        status: req.query.status || "all",
        query: req.query.query || "",
        restaurantId: req.query.restaurantId,
      });
      sendOk(res, { items });
    }),
  );

  app.patch(
    "/api/admin/posts/:id/approve",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const post = await store.approvePost(req.params.id, req.currentUser);
      if (!post) {
        sendFail(res, 404, "Khong tim thay bai dang.");
        return;
      }
      sendOk(res, { post });
    }),
  );

  app.patch(
    "/api/admin/posts/:id/reject",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const post = await store.rejectPost(req.params.id, req.body?.note, req.currentUser);
      if (!post) {
        sendFail(res, 404, "Khong tim thay bai dang.");
        return;
      }
      sendOk(res, { post });
    }),
  );

  app.patch(
    "/api/admin/posts/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const post = await store.updatePost(req.params.id, req.body ?? {}, req.currentUser);
      if (!post) {
        sendFail(res, 404, "Khong tim thay bai dang.");
        return;
      }
      sendOk(res, { post });
    }),
  );

  app.post(
    "/api/admin/posts/:id/tags",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const post = await store.attachTagsToPost(req.params.id, req.body?.tags ?? "", req.currentUser);
      if (!post) {
        sendFail(res, 404, "Khong tim thay bai dang.");
        return;
      }
      sendOk(res, { post });
    }),
  );

  app.get(
    "/api/admin/restaurants",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const items = await store.listAdminRestaurants({
        query: req.query.query || "",
        area: req.query.area || "all",
        hidden: req.query.hidden || "all",
      });
      sendOk(res, { items });
    }),
  );

  app.post(
    "/api/admin/restaurants",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const item = await store.createRestaurant(req.body ?? {});
      sendOk(res, { item });
    }),
  );

  app.patch(
    "/api/admin/restaurants/:id",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const item = await store.updateRestaurant(req.params.id, req.body ?? {});
      if (!item) {
        sendFail(res, 404, "Khong tim thay quan.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.patch(
    "/api/admin/restaurants/:id/visibility",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const hidden = Boolean(req.body?.hidden);
      const item = await store.toggleRestaurantVisibility(req.params.id, hidden);
      if (!item) {
        sendFail(res, 404, "Khong tim thay quan.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.post(
    "/api/admin/restaurants/:id/tags",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const item = await store.attachTagsToRestaurant(req.params.id, req.body?.tags ?? "");
      if (!item) {
        sendFail(res, 404, "Khong tim thay quan.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.post(
    "/api/admin/restaurants/sync",
    requireAdmin,
    asyncHandler(async (_req, res) => {
      sendOk(res, await store.syncRestaurantsFromSource());
    }),
  );

  app.get(
    "/api/admin/users",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const items = await store.listUsers({
        query: req.query.query || "",
        status: req.query.status || "all",
      });
      sendOk(res, { items });
    }),
  );

  app.get(
    "/api/admin/users/risk-signals",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const limit = Number(req.query.limit ?? 6);
      const items = await store.listRiskSignals(limit);
      sendOk(res, { items });
    }),
  );

  app.patch(
    "/api/admin/users/:id/status",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const status = String(req.body?.status ?? "");
      const item = await store.updateUserStatus(req.params.id, status);
      if (!item) {
        sendFail(res, 400, "Khong cap nhat duoc trang thai user.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.get(
    "/api/admin/notifications",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const items = await store.listNotifications({
        unreadOnly: req.query.unreadOnly === "true",
        targetUserId: req.query.targetUserId,
      });
      sendOk(res, { items });
    }),
  );

  app.patch(
    "/api/admin/notifications/:id/read",
    requireAdmin,
    asyncHandler(async (req, res) => {
      const item = await store.markNotificationRead(req.params.id);
      if (!item) {
        sendFail(res, 404, "Khong tim thay thong bao.");
        return;
      }
      sendOk(res, { item });
    }),
  );

  app.use((req, res) => {
    sendFail(res, 404, `Not Found: ${req.method} ${req.path}`);
  });

  app.use((error, _req, res, next) => {
    console.error("[backend] request failed", error);
    if (res.headersSent) {
      next(error);
      return;
    }
    sendFail(res, 500, "Loi server hoac ket noi database.");
  });

  app.listen(port, () => {
    console.log(`[backend] running at http://localhost:${port}`);
    console.log(`[backend] health check at http://localhost:${port}/api/health`);
    console.log(`[backend] database: ${store.dbLabel}`);

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
}

main().catch((error) => {
  console.error("[backend] startup failed", error);
  process.exit(1);
});
