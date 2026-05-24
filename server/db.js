import "dotenv/config";
import bcrypt from "bcryptjs";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const HASH_ROUNDS = 10;
const STATUS_ACTIVE = "active";
const STATUS_LOCKED = "locked";
const STATUS_BANNED = "banned";
const STATUS_SET = new Set([STATUS_ACTIVE, STATUS_LOCKED, STATUS_BANNED]);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

function nowIso() {
  return new Date().toISOString();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJsonSafe(raw, fallback) {
  try {
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function toJson(value, fallback = null) {
  try {
    return JSON.stringify(value ?? fallback);
  } catch {
    return JSON.stringify(fallback);
  }
}

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase();
}

function normalizeEmail(value) {
  return normalizeText(value);
}

function normalizeIdentifier(value) {
  return normalizeText(value);
}

function normalizeUsername(value) {
  return normalizeText(value).replace(/[^a-z0-9._-]+/g, "");
}

function pickAreaFromAddress(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts[1];
  return parts[0] || "Khac";
}

function buildShortAddress(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.slice(0, 2).join(", ") || String(address ?? "");
}

function extractPriceValue(priceLevel) {
  const numbers = String(priceLevel ?? "").match(/\d[\d.]*/g);
  if (!numbers?.length) return Number.MAX_SAFE_INTEGER;
  const numeric = Number(numbers[0].replace(/\./g, ""));
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function normalizeTagList(input) {
  const source = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(",")
        .map((item) => item.trim());
  const output = new Set();
  source.forEach((tag) => {
    const normalized = normalizeText(tag)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    if (normalized) output.add(normalized);
  });
  return [...output];
}

function toMapsUrl(addressOrPlusCode) {
  const query = String(addressOrPlusCode ?? "").trim();
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

function scoreRisk(user) {
  if (user.role === "admin") return 0;
  if (user.status === STATUS_BANNED) return 90;
  if (user.status === STATUS_LOCKED) return 70;
  return 20;
}

function abnormalFlags(user) {
  if (user.role === "admin") return [];
  if (user.status === STATUS_BANNED) return ["status_banned"];
  if (user.status === STATUS_LOCKED) return ["status_locked"];
  return [];
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earth = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.sqrt(a));
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function hasCoords(lat, lng) {
  const latNum = toNullableNumber(lat);
  const lngNum = toNullableNumber(lng);
  return latNum !== null && lngNum !== null;
}

function readSourceData() {
  const filePath = path.join(rootDir, "data", "data3.json");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function mapSourceRestaurant(item, index) {
  const address = String(item?.location?.address ?? "");
  const plusCode = String(item?.location?.plusCode ?? "");
  const websiteRaw = String(item?.contact?.website ?? "").trim();
  const website = websiteRaw ? (websiteRaw.startsWith("http") ? websiteRaw : `https://${websiteRaw}`) : "";
  const phone = String(item?.contact?.phone ?? "").trim();
  const menuHighlights = Array.isArray(item?.menuHighlights) ? item.menuHighlights : [];
  const reviews = Array.isArray(item?.reviews) ? item.reviews : [];
  return {
    id: String(item?.id ?? `source_${index + 1}`),
    name: String(item?.name ?? "Quan an"),
    category: String(item?.category ?? "Unknown"),
    address,
    area: pickAreaFromAddress(address),
    shortAddress: buildShortAddress(address),
    priceLevel: String(item?.priceLevel ?? ""),
    imageUrl: String(item?.imageUrl ?? ""),
    timeLabel: String(item?.operatingHours?.status ?? "Chua cap nhat"),
    openStatus: String(item?.operatingHours?.status ?? ""),
    closingTime: String(item?.operatingHours?.closingTime ?? ""),
    plusCode,
    website,
    phone,
    rating: Number(item?.rating ?? 0),
    reviewCount: Number(item?.totalReviews ?? 0),
    views: 0,
    hidden: 0,
    sourceSyncStatus: "seeded",
    lastSyncedAt: nowIso(),
    tags: normalizeTagList([item?.category || "", ...menuHighlights, pickAreaFromAddress(address)]),
    features: item?.features ?? {},
    menuHighlights,
    officialReviews: reviews,
    lat: toNullableNumber(item?.coords?.lat),
    lng: toNullableNumber(item?.coords?.lng),
    geocodeStatus: hasCoords(item?.coords?.lat, item?.coords?.lng) ? "ok" : "pending",
    distanceHint: Number((0.8 + index * 0.5).toFixed(1)),
  };
}

function buildSession(user) {
  return {
    id: Number(user.id),
    username: String(user.username || ""),
    displayName: String(user.display_name || "Nguoi dung"),
    email: String(user.email || ""),
    role: String(user.role || "user"),
  };
}

function serializeRestaurantRow(row, options = {}) {
  const includeHidden = Boolean(options.includeHidden);
  if (!includeHidden && Number(row.hidden) === 1) return null;
  const features = parseJsonSafe(row.features_json, {});
  const menuHighlights = parseJsonSafe(row.menu_highlights_json, []);
  const officialReviews = parseJsonSafe(row.official_reviews_json, []);
  const tags = parseJsonSafe(row.tags_json, []);
  const mapsUrl = toMapsUrl(row.address || row.plus_code || "");
  const distanceValue =
    Number.isFinite(Number(options.distanceKm)) && Number(options.distanceKm) >= 0
      ? Number(Number(options.distanceKm).toFixed(2))
      : Number(row.distance_hint || 0);
  return {
    id: String(row.id),
    name: String(row.name || ""),
    category: String(row.category || ""),
    address: String(row.address || ""),
    shortAddress: buildShortAddress(row.address || ""),
    area: String(row.area || "Khac"),
    priceLevel: String(row.price_level || ""),
    priceValue: extractPriceValue(row.price_level || ""),
    image: String(row.image_url || ""),
    images: row.image_url ? [String(row.image_url)] : [],
    time: String(row.time_label || ""),
    openStatus: String(row.open_status || ""),
    closingTime: String(row.closing_time || ""),
    closingLabel:
      row.open_status && row.closing_time
        ? `${row.open_status} - Dong cua vao ${row.closing_time}`
        : row.open_status || row.time_label || "Chua cap nhat",
    plusCode: String(row.plus_code || ""),
    website: String(row.website || ""),
    phone: String(row.phone || ""),
    phoneUrl: row.phone ? `tel:${String(row.phone).replace(/[^\d+]/g, "")}` : "",
    mapsUrl,
    reservationUrl: row.website || mapsUrl || (row.phone ? `tel:${String(row.phone).replace(/[^\d+]/g, "")}` : ""),
    rating: Number(row.rating || 0),
    reviewCount: Number(row.review_count || 0),
    views: Number(row.views || 0),
    hidden: Number(row.hidden || 0) === 1,
    sourceSyncStatus: String(row.source_sync_status || "manual"),
    lastSyncedAt: String(row.last_synced_at || nowIso()),
    tags,
    features,
    menuHighlights,
    serviceOptions: Array.isArray(features.serviceOptions) ? features.serviceOptions : [],
    serviceOptionsMain: Array.isArray(features.serviceOptions) ? features.serviceOptions.slice(0, 5) : [],
    diningOptions: Array.isArray(features.diningOptions) ? features.diningOptions : [],
    reviews: Array.isArray(officialReviews) ? officialReviews : [],
    isTrending: false,
    distance: distanceValue,
    coords: hasCoords(row.lat, row.lng) ? { lat: Number(row.lat), lng: Number(row.lng) } : null,
    lat: toNullableNumber(row.lat),
    lng: toNullableNumber(row.lng),
    geocodeStatus: String(row.geocode_status || "pending"),
  };
}

function serializePostBase(row) {
  return {
    id: Number(row.id),
    title: String(row.title || ""),
    content: String(row.content || ""),
    author: String(row.author_name || "Nguoi dung"),
    authorId: Number(row.author_id || 0),
    restaurantId: row.restaurant_id ? String(row.restaurant_id) : null,
    status: String(row.status || "pending"),
    createdAt: String(row.created_at || nowIso()),
    publishedAt: row.published_at ? String(row.published_at) : null,
    violationNotes: String(row.violation_notes || ""),
    tags: parseJsonSafe(row.tags_json, []),
    mediaNames: parseJsonSafe(row.media_names_json, []),
    rating: Number(row.rating || 0),
    restaurantSnapshot: parseJsonSafe(row.restaurant_snapshot_json, {}),
    comments: [],
    moderationHistory: [],
  };
}

function isNamedParamObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date);
}

function normalizeSql(sql) {
  return String(sql).replace(/\bdatetime\s*\(/gi, "(");
}

function normalizeParam(value) {
  return value === undefined ? null : value;
}

function compileSql(sql, args) {
  const normalized = normalizeSql(sql);
  if (args.length === 1 && isNamedParamObject(args[0])) {
    const source = args[0];
    const values = [];
    const indexes = new Map();
    const text = normalized.replace(/@([a-zA-Z_][a-zA-Z0-9_]*)/g, (_match, name) => {
      if (!indexes.has(name)) {
        values.push(normalizeParam(source[name]));
        indexes.set(name, values.length);
      }
      return `$${indexes.get(name)}`;
    });
    return { text, values };
  }

  const values = (args.length === 1 && Array.isArray(args[0]) ? args[0] : args).map(normalizeParam);
  let index = 0;
  const text = normalized.replace(/\?/g, () => `$${++index}`);
  return { text, values };
}

function createSqlExecutor(executor, pool = null) {
  const db = {
    async exec(sql) {
      await executor.query(sql);
    },
    prepare(sql) {
      return {
        async all(...args) {
          const query = compileSql(sql, args);
          const result = await executor.query(query.text, query.values);
          return result.rows;
        },
        async get(...args) {
          const query = compileSql(sql, args);
          const result = await executor.query(query.text, query.values);
          return result.rows[0] || null;
        },
        async run(...args) {
          const query = compileSql(sql, args);
          const result = await executor.query(query.text, query.values);
          return {
            changes: result.rowCount || 0,
            rowCount: result.rowCount || 0,
            rows: result.rows,
            lastInsertRowid: result.rows[0]?.id ?? null,
          };
        },
      };
    },
    async withTransaction(callback) {
      if (!pool) return callback(db);
      const client = await pool.connect();
      const txDb = createSqlExecutor(client, null);
      try {
        await client.query("BEGIN");
        const result = await callback(txDb);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
  return db;
}

function resolveSslConfig(options = {}) {
  if (options.ssl !== undefined) return options.ssl;
  const sslMode = String(process.env.PGSSLMODE || "require").toLowerCase();
  if (sslMode === "disable") return false;
  return { rejectUnauthorized: false };
}

function describeDatabaseUrl(connectionString) {
  try {
    const url = new URL(connectionString);
    const username = url.username ? `${decodeURIComponent(url.username)}:***@` : "";
    return `${url.protocol}//${username}${url.host}${url.pathname}`;
  } catch {
    return "configured PostgreSQL database";
  }
}

export async function createStore(options = {}) {
  const connectionString = options.connectionString || process.env.DATABASE_URL;
  if (!connectionString && !options.pool) {
    throw new Error("Missing DATABASE_URL. Create a .env file with your Supabase PostgreSQL connection string.");
  }

  const ownsPool = !options.pool;
  const pool =
    options.pool ||
    new Pool({
      connectionString,
      ssl: resolveSslConfig(options),
      max: Number(process.env.PGPOOL_MAX || 10),
    });
  const db = createSqlExecutor(pool, pool);
  const dbLabel = connectionString ? describeDatabaseUrl(connectionString) : "custom PostgreSQL pool";
  const sourceRestaurants = readSourceData().map((item, index) => mapSourceRestaurant(item, index));

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      last_active TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id INTEGER PRIMARY KEY,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      dob TEXT NOT NULL DEFAULT '',
      bio TEXT NOT NULL DEFAULT '',
      avatar_url TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS restaurants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      address TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT 'Khac',
      price_level TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      time_label TEXT NOT NULL DEFAULT '',
      open_status TEXT NOT NULL DEFAULT '',
      closing_time TEXT NOT NULL DEFAULT '',
      plus_code TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      rating REAL NOT NULL DEFAULT 0,
      review_count INTEGER NOT NULL DEFAULT 0,
      views INTEGER NOT NULL DEFAULT 0,
      hidden INTEGER NOT NULL DEFAULT 0,
      source_sync_status TEXT NOT NULL DEFAULT 'manual',
      last_synced_at TEXT NOT NULL,
      tags_json TEXT NOT NULL DEFAULT '[]',
      features_json TEXT NOT NULL DEFAULT '{}',
      menu_highlights_json TEXT NOT NULL DEFAULT '[]',
      official_reviews_json TEXT NOT NULL DEFAULT '[]',
      lat REAL,
      lng REAL,
      geocode_status TEXT NOT NULL DEFAULT 'pending',
      distance_hint REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      author_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      restaurant_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
      rating REAL NOT NULL DEFAULT 0,
      tags_json TEXT NOT NULL DEFAULT '[]',
      media_names_json TEXT NOT NULL DEFAULT '[]',
      restaurant_snapshot_json TEXT NOT NULL DEFAULT '{}',
      violation_notes TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      published_at TEXT,
      FOREIGN KEY (author_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS post_comments (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      post_id INTEGER NOT NULL,
      author_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS post_moderation_history (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      post_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      by_user_id INTEGER,
      by_name TEXT NOT NULL,
      note TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
      type TEXT NOT NULL,
      target_user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL,
      FOREIGN KEY (target_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS geocode_cache (
      query TEXT PRIMARY KEY,
      lat REAL,
      lng REAL,
      provider TEXT NOT NULL,
      success INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_restaurant ON posts(restaurant_id);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON post_comments(post_id);
  `);

  const insertUserStmt = db.prepare(`
    INSERT INTO users (username, display_name, email, password_hash, role, status, created_at, last_active)
    VALUES (@username, @display_name, @email, @password_hash, @role, @status, @created_at, @last_active)
    RETURNING id
  `);
  const insertProfileStmt = db.prepare(`
    INSERT INTO user_profiles (user_id, phone, address, dob, bio, avatar_url)
    VALUES (@user_id, @phone, @address, @dob, @bio, @avatar_url)
  `);
  const getUserByEmailStmt = db.prepare(`SELECT * FROM users WHERE lower(email) = lower(?)`);
  const getUserByUsernameStmt = db.prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`);
  const getUserByIdStmt = db.prepare(`SELECT * FROM users WHERE id = ?`);
  const getProfileByUserIdStmt = db.prepare(`SELECT * FROM user_profiles WHERE user_id = ?`);

  const upsertRestaurantSql = `
    INSERT INTO restaurants (
      id, name, category, address, area, price_level, image_url, time_label, open_status, closing_time,
      plus_code, website, phone, rating, review_count, views, hidden, source_sync_status, last_synced_at,
      tags_json, features_json, menu_highlights_json, official_reviews_json, lat, lng, geocode_status, distance_hint
    )
    VALUES (
      @id, @name, @category, @address, @area, @price_level, @image_url, @time_label, @open_status, @closing_time,
      @plus_code, @website, @phone, @rating, @review_count, @views, @hidden, @source_sync_status, @last_synced_at,
      @tags_json, @features_json, @menu_highlights_json, @official_reviews_json, @lat, @lng, @geocode_status, @distance_hint
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      category = excluded.category,
      address = excluded.address,
      area = excluded.area,
      price_level = excluded.price_level,
      image_url = excluded.image_url,
      time_label = excluded.time_label,
      open_status = excluded.open_status,
      closing_time = excluded.closing_time,
      plus_code = excluded.plus_code,
      website = excluded.website,
      phone = excluded.phone,
      rating = excluded.rating,
      review_count = excluded.review_count,
      views = excluded.views,
      hidden = excluded.hidden,
      source_sync_status = excluded.source_sync_status,
      last_synced_at = excluded.last_synced_at,
      tags_json = excluded.tags_json,
      features_json = excluded.features_json,
      menu_highlights_json = excluded.menu_highlights_json,
      official_reviews_json = excluded.official_reviews_json,
      lat = excluded.lat,
      lng = excluded.lng,
      geocode_status = excluded.geocode_status,
      distance_hint = excluded.distance_hint
  `;

  const serializeRestaurantForDb = (item) => ({
    id: item.id,
    name: item.name,
    category: item.category,
    address: item.address,
    area: item.area,
    price_level: item.priceLevel ?? "",
    image_url: item.imageUrl ?? "",
    time_label: item.timeLabel ?? "",
    open_status: item.openStatus ?? "",
    closing_time: item.closingTime ?? "",
    plus_code: item.plusCode ?? "",
    website: item.website ?? "",
    phone: item.phone ?? "",
    rating: Number(item.rating ?? 0),
    review_count: Number(item.reviewCount ?? 0),
    views: Number(item.views ?? 0),
    hidden: Number(item.hidden ? 1 : 0),
    source_sync_status: item.sourceSyncStatus ?? "manual",
    last_synced_at: item.lastSyncedAt ?? nowIso(),
    tags_json: toJson(item.tags ?? [], []),
    features_json: toJson(item.features ?? {}, {}),
    menu_highlights_json: toJson(item.menuHighlights ?? [], []),
    official_reviews_json: toJson(item.officialReviews ?? [], []),
    lat: toNullableNumber(item.lat),
    lng: toNullableNumber(item.lng),
    geocode_status: item.geocodeStatus ?? "pending",
    distance_hint: Number(item.distanceHint ?? 0),
  });

  async function upsertRestaurant(item, queryDb = db) {
    await queryDb.prepare(upsertRestaurantSql).run(serializeRestaurantForDb(item));
  }

  async function ensureDefaultAdmin() {
    const now = nowIso();
    const adminHash = bcrypt.hashSync("admin", HASH_ROUNDS);
    const existing =
      (await db
        .prepare(
          `
        SELECT * FROM users
        WHERE lower(username) = lower(?) OR lower(email) = lower(?) OR lower(email) = lower(?)
        ORDER BY CASE WHEN lower(username) = lower(?) THEN 0 ELSE 1 END
        LIMIT 1
      `,
        )
        .get("admin", "admin@foodfinder.local", "admin", "admin")) || null;

    if (existing) {
      await db
        .prepare(
          `
        UPDATE users
        SET username = ?, display_name = ?, email = ?, password_hash = ?, role = 'admin', status = ?, last_active = ?
        WHERE id = ?
      `,
        )
        .run("admin", "Admin", "admin@foodfinder.local", adminHash, STATUS_ACTIVE, now, Number(existing.id));
    } else {
      await insertUserStmt.run({
        username: "admin",
        display_name: "Admin",
        email: "admin@foodfinder.local",
        password_hash: adminHash,
        role: "admin",
        status: STATUS_ACTIVE,
        created_at: now,
        last_active: now,
      });
    }

    const adminUser = await db.prepare(`SELECT * FROM users WHERE lower(username) = lower(?)`).get("admin");
    await db
      .prepare(
        `
      INSERT INTO user_profiles (user_id, phone, address, dob, bio, avatar_url)
      VALUES (?, '', '', '', ?, '')
      ON CONFLICT(user_id) DO UPDATE SET
        bio = excluded.bio
    `,
      )
      .run(Number(adminUser.id), "Tai khoan quan tri he thong");
  }

  async function seedInitialData() {
    const usersCount = Number((await db.prepare(`SELECT COUNT(*) AS count FROM users`).get())?.count || 0);
    await ensureDefaultAdmin();
    if (usersCount === 0) {
      const createdAt = nowIso();
      const userHash = bcrypt.hashSync("user123", HASH_ROUNDS);

      const sampleUsers = [
        { username: "user", displayName: "Demo User", email: "user@foodfinder.local" },
        { username: "linh.nguyen", displayName: "Linh Nguyen", email: "linh@foodfinder.local" },
        { username: "trung.vo", displayName: "Trung Vo", email: "trung@foodfinder.local" },
        { username: "mai.le", displayName: "Mai Le", email: "mai@foodfinder.local" },
        { username: "son.pham", displayName: "Son Pham", email: "son@foodfinder.local" },
      ];

      for (const [index, item] of sampleUsers.entries()) {
        await insertUserStmt.run({
          username: item.username,
          display_name: item.displayName,
          email: item.email,
          password_hash: userHash,
          role: "user",
          status: STATUS_ACTIVE,
          created_at: createdAt,
          last_active: createdAt,
        });
        const inserted = await getUserByEmailStmt.get(item.email);
        await insertProfileStmt.run({
          user_id: inserted.id,
          phone: "",
          address: "",
          dob: "",
          bio: index < 2 ? "Food lover va reviewer." : "",
          avatar_url: "",
        });
      }
    }

    const restaurantsCount = Number((await db.prepare(`SELECT COUNT(*) AS count FROM restaurants`).get())?.count || 0);
    if (restaurantsCount === 0) {
      await db.withTransaction(async (txDb) => {
        for (const row of sourceRestaurants) {
          await upsertRestaurant(row, txDb);
        }
      });
    }

    const postsCount = Number((await db.prepare(`SELECT COUNT(*) AS count FROM posts`).get())?.count || 0);
    if (postsCount === 0) {
      const users = await db.prepare(`SELECT id, display_name FROM users WHERE role='user' ORDER BY id ASC`).all();
      const restaurants = await db.prepare(`SELECT * FROM restaurants ORDER BY rating DESC, review_count DESC LIMIT 15`).all();
      if (!users.length || !restaurants.length) return;

      const approvedCount = 10;
      const pendingCount = 3;
      const contents = [
        "Khong gian quan rat thoang, mon an vua mieng va phuc vu nhanh.",
        "Gia hop ly, phan an day dan. Se quay lai voi ban be.",
        "Do an ngon, dac biet mon signature rat dang thu.",
        "Quan dong vao gio cao diem nhung nhan vien ho tro tot.",
        "Huong vi on dinh, dia chi de tim va giu xe kha tien.",
        "Trang tri dep, phu hop hop mat nho. Do uong cung ngon.",
        "Mon dau bep goi y rat hop khau vi. Danh gia cao.",
        "Chat luong tot hon ky vong, xung dang voi muc gia.",
        "Minh thich khong gian va cach phuc vu chu dao.",
        "Quan phu hop di gia dinh, co nhieu lua chon mon.",
        "Can bo sung them thong tin menu cho de chon mon.",
        "Mon an on nhung can cai thien toc do phuc vu gio dong.",
        "Vi tri dep, nhung bai xe hoi chat vao cuoi tuan.",
        "Trinh bay mon dep mat, vi ngon va dam da.",
        "Co nhieu goc check-in dep, phu hop di nhom ban.",
      ];

      const insertPost = db.prepare(`
        INSERT INTO posts (
          title, content, author_id, author_name, restaurant_id, status, rating, tags_json, media_names_json,
          restaurant_snapshot_json, violation_notes, created_at, published_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `);
      const insertHistory = db.prepare(`
        INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertComment = db.prepare(`
        INSERT INTO post_comments (post_id, author_id, author_name, content, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const [index, restaurant] of restaurants.entries()) {
        const user = users[index % users.length];
        const createdAt = new Date(Date.now() - index * 1000 * 60 * 60 * 6).toISOString();
        const status = index < approvedCount ? "approved" : index < approvedCount + pendingCount ? "pending" : "rejected";
        const publishedAt = status === "approved" ? createdAt : null;
        const violationNotes = status === "rejected" ? "Can bo sung thong tin hinh anh ro hon." : "";
        const snapshot = {
          name: restaurant.name,
          address: restaurant.address,
          area: restaurant.area,
          category: restaurant.category,
          priceLevel: restaurant.price_level,
          time: restaurant.time_label,
          image: restaurant.image_url,
          menuHighlights: parseJsonSafe(restaurant.menu_highlights_json, []),
        };
        const tags = normalizeTagList([
          restaurant.category,
          ...parseJsonSafe(restaurant.tags_json, []),
          ...snapshot.menuHighlights,
        ]);

        const result = await insertPost.run(
          `${restaurant.name} - review cong dong`,
          contents[index % contents.length],
          user.id,
          user.display_name,
          restaurant.id,
          status,
          Number((4 + (index % 2) * 0.5).toFixed(1)),
          toJson(tags, []),
          toJson([`seed-image-${index + 1}.jpg`], []),
          toJson(snapshot, {}),
          violationNotes,
          createdAt,
          publishedAt,
        );
        const postId = Number(result.lastInsertRowid);
        await insertHistory.run(postId, "submitted", user.id, user.display_name, "Gui bai cho he thong", createdAt);
        if (status === "approved") {
          await insertHistory.run(postId, "approved", 1, "Admin", "Bai dang dat tieu chuan", createdAt);
          if (index < 5) {
            await insertComment.run(
              postId,
              user.id,
              user.display_name,
              "Da quay lai lan 2 va chat luong van rat tot.",
              4.5,
              new Date(Date.parse(createdAt) + 1000 * 60 * 60).toISOString(),
            );
          }
        }
        if (status === "rejected") {
          await insertHistory.run(postId, "rejected", 1, "Admin", "Can bo sung thong tin de duyet.", createdAt);
        }
      }
    }
  }

  async function nextUsername(base) {
    let username = normalizeUsername(base || "user");
    if (!username) username = "user";
    if (!(await getUserByUsernameStmt.get(username))) return username;
    let counter = 2;
    while (await getUserByUsernameStmt.get(`${username}${counter}`)) {
      counter += 1;
    }
    return `${username}${counter}`;
  }

  async function getUserById(id) {
    return getUserByIdStmt.get(Number(id));
  }

  async function getUserWithProfile(userId) {
    const user = await getUserById(userId);
    if (!user) return null;
    const profile = (await getProfileByUserIdStmt.get(Number(userId))) || {
      user_id: Number(userId),
      phone: "",
      address: "",
      dob: "",
      bio: "",
      avatar_url: "",
    };
    return { user, profile };
  }

  async function registerUser(payload = {}) {
    const displayName = String(payload.displayName ?? "").trim();
    const email = normalizeEmail(payload.email);
    const password = String(payload.password ?? "");
    if (!displayName || !email || !password) {
      return { ok: false, message: "Vui long dien day du thong tin." };
    }
    if (email === "admin" || email === "admin@foodfinder.local") {
      return { ok: false, message: "Tai khoan admin la tai khoan he thong, khong the dang ky." };
    }
    if (await getUserByEmailStmt.get(email)) {
      return { ok: false, message: "Email da duoc su dung." };
    }

    const username = await nextUsername(payload.username || email.split("@")[0] || "user");
    const createdAt = nowIso();
    const hash = bcrypt.hashSync(password, HASH_ROUNDS);

    await insertUserStmt.run({
      username,
      display_name: displayName,
      email,
      password_hash: hash,
      role: "user",
      status: STATUS_ACTIVE,
      created_at: createdAt,
      last_active: createdAt,
    });
    const user = await getUserByEmailStmt.get(email);
    await insertProfileStmt.run({
      user_id: user.id,
      phone: "",
      address: "",
      dob: "",
      bio: "",
      avatar_url: "",
    });
    return {
      ok: true,
      session: buildSession(user),
      profile: await getProfileByUserIdStmt.get(user.id),
    };
  }

  async function loginUser(payload = {}) {
    const identifier = normalizeIdentifier(payload.identifier ?? payload.email);
    const password = String(payload.password ?? "");
    if (!identifier || !password) {
      return { ok: false, message: "Vui long nhap day du tai khoan va mat khau." };
    }
    const user =
      (await db.prepare(`SELECT * FROM users WHERE lower(email)=lower(?) OR lower(username)=lower(?)`).get(identifier, identifier)) ||
      null;
    if (!user) return { ok: false, message: "Email hoac mat khau sai" };
    if (!bcrypt.compareSync(password, user.password_hash)) {
      return { ok: false, message: "Email hoac mat khau sai" };
    }
    if (user.status === STATUS_BANNED) return { ok: false, message: "Tai khoan da bi cam." };
    if (user.status === STATUS_LOCKED) return { ok: false, message: "Tai khoan tam thoi bi khoa." };

    await db.prepare(`UPDATE users SET last_active = ? WHERE id = ?`).run(nowIso(), user.id);
    const latest = await getUserById(user.id);
    return {
      ok: true,
      session: buildSession(latest),
      profile: await getProfileByUserIdStmt.get(latest.id),
    };
  }

  async function getMyProfile(userId) {
    const payload = await getUserWithProfile(userId);
    if (!payload) return null;
    return {
      session: buildSession(payload.user),
      profile: {
        phone: String(payload.profile.phone || ""),
        address: String(payload.profile.address || ""),
        dob: String(payload.profile.dob || ""),
        bio: String(payload.profile.bio || ""),
        avatarUrl: String(payload.profile.avatar_url || ""),
        displayName: String(payload.user.display_name || ""),
      },
      status: String(payload.user.status || STATUS_ACTIVE),
    };
  }

  async function updateMyProfile(userId, updates = {}) {
    const payload = await getUserWithProfile(userId);
    if (!payload) return null;

    const nextDisplayName = String(updates.displayName ?? payload.user.display_name ?? "").trim() || payload.user.display_name;
    const nextPhone = String(updates.phone ?? payload.profile.phone ?? "").trim();
    const nextAddress = String(updates.address ?? payload.profile.address ?? "").trim();
    const nextDob = String(updates.dob ?? payload.profile.dob ?? "").trim();
    const nextBio = String(updates.bio ?? payload.profile.bio ?? "").trim();
    const nextAvatar = String(updates.avatarUrl ?? payload.profile.avatar_url ?? "").trim();

    await db.prepare(`UPDATE users SET display_name = ?, last_active = ? WHERE id = ?`).run(nextDisplayName, nowIso(), userId);
    await db
      .prepare(
        `
      INSERT INTO user_profiles (user_id, phone, address, dob, bio, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        phone = excluded.phone,
        address = excluded.address,
        dob = excluded.dob,
        bio = excluded.bio,
        avatar_url = excluded.avatar_url
    `,
      )
      .run(userId, nextPhone, nextAddress, nextDob, nextBio, nextAvatar);
    return getMyProfile(userId);
  }

  async function listPublicRestaurants(filters = {}) {
    const where = ["hidden = 0"];
    const args = [];
    const query = normalizeText(filters.query);
    if (query) {
      where.push(`(lower(name) LIKE ? OR lower(category) LIKE ? OR lower(address) LIKE ?)`);
      const like = `%${query}%`;
      args.push(like, like, like);
    }
    const area = normalizeText(filters.area);
    if (area) {
      where.push(`lower(area) = ?`);
      args.push(area);
    }
    const category = normalizeText(filters.category);
    if (category) {
      where.push(`lower(category) = ?`);
      args.push(category);
    }
    const sql = `
      SELECT * FROM restaurants
      WHERE ${where.join(" AND ")}
      ORDER BY rating DESC, review_count DESC, views DESC
    `;
    const rows = await db.prepare(sql).all(...args);
    return rows
      .map((row) => serializeRestaurantRow(row))
      .filter(Boolean)
      .map((item, index) => ({ ...item, isTrending: index < 4 }));
  }

  async function listAdminRestaurants(filters = {}) {
    const where = ["1=1"];
    const args = [];
    const query = normalizeText(filters.query);
    if (query) {
      where.push(`(lower(name) LIKE ? OR lower(category) LIKE ? OR lower(area) LIKE ? OR lower(address) LIKE ?)`);
      const like = `%${query}%`;
      args.push(like, like, like, like);
    }
    const area = String(filters.area ?? "all");
    if (area !== "all") {
      where.push(`lower(area) = ?`);
      args.push(normalizeText(area));
    }
    const hidden = String(filters.hidden ?? "all");
    if (hidden === "hidden") where.push(`hidden = 1`);
    if (hidden === "visible") where.push(`hidden = 0`);

    const sql = `SELECT * FROM restaurants WHERE ${where.join(" AND ")} ORDER BY views DESC, rating DESC, review_count DESC`;
    const rows = await db.prepare(sql).all(...args);
    return rows.map((row) => serializeRestaurantRow(row, { includeHidden: true })).filter(Boolean);
  }

  async function getRestaurantById(id, options = {}) {
    const row = await db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(String(id));
    if (!row) return null;
    return serializeRestaurantRow(row, { includeHidden: Boolean(options.includeHidden) });
  }

  async function createRestaurant(payload = {}) {
    const id = payload.id ? String(payload.id) : `custom_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    const row = {
      id,
      name: String(payload.name ?? "").trim() || "Quan moi",
      category: String(payload.category ?? "Unknown").trim() || "Unknown",
      address: String(payload.address ?? "").trim(),
      area: String(payload.area ?? pickAreaFromAddress(payload.address)).trim() || "Khac",
      priceLevel: String(payload.priceLevel ?? "").trim(),
      imageUrl: String(payload.image ?? payload.imageUrl ?? "").trim(),
      timeLabel: String(payload.time ?? payload.timeLabel ?? "").trim(),
      openStatus: String(payload.openStatus ?? "").trim(),
      closingTime: String(payload.closingTime ?? "").trim(),
      plusCode: String(payload.plusCode ?? "").trim(),
      website: String(payload.website ?? "").trim(),
      phone: String(payload.phone ?? "").trim(),
      rating: Number(payload.rating ?? 0),
      reviewCount: Number(payload.totalReviews ?? payload.reviewCount ?? 0),
      views: Number(payload.views ?? 0),
      hidden: Boolean(payload.hidden),
      sourceSyncStatus: "manual",
      lastSyncedAt: nowIso(),
      tags: normalizeTagList(payload.tags),
      features: payload.features ?? {},
      menuHighlights: Array.isArray(payload.menuHighlights)
        ? payload.menuHighlights
        : String(payload.menuHighlights ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
      officialReviews: Array.isArray(payload.reviews) ? payload.reviews : [],
      lat: toNullableNumber(payload.lat),
      lng: toNullableNumber(payload.lng),
      geocodeStatus: hasCoords(payload.lat, payload.lng) ? "ok" : "pending",
      distanceHint: Number(payload.distance ?? payload.distanceHint ?? 0),
    };
    await upsertRestaurant(row);
    return getRestaurantById(id, { includeHidden: true });
  }

  async function updateRestaurant(id, payload = {}) {
    const current = await db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(String(id));
    if (!current) return null;
    const existing = serializeRestaurantRow(current, { includeHidden: true });
    const next = {
      id: existing.id,
      name: String(payload.name ?? existing.name),
      category: String(payload.category ?? existing.category),
      address: String(payload.address ?? existing.address),
      area: String(payload.area ?? existing.area),
      priceLevel: String(payload.priceLevel ?? existing.priceLevel),
      imageUrl: String(payload.image ?? payload.imageUrl ?? existing.image),
      timeLabel: String(payload.time ?? payload.timeLabel ?? existing.time),
      openStatus: String(payload.openStatus ?? existing.openStatus),
      closingTime: String(payload.closingTime ?? existing.closingTime),
      plusCode: String(payload.plusCode ?? existing.plusCode),
      website: String(payload.website ?? existing.website),
      phone: String(payload.phone ?? existing.phone),
      rating: Number(payload.rating ?? existing.rating),
      reviewCount: Number(payload.totalReviews ?? payload.reviewCount ?? existing.reviewCount),
      views: Number(payload.views ?? existing.views),
      hidden: payload.hidden !== undefined ? Boolean(payload.hidden) : Boolean(existing.hidden),
      sourceSyncStatus: "manual",
      lastSyncedAt: nowIso(),
      tags: payload.tags !== undefined ? normalizeTagList(payload.tags) : existing.tags,
      features: payload.features ?? existing.features,
      menuHighlights:
        payload.menuHighlights !== undefined
          ? Array.isArray(payload.menuHighlights)
            ? payload.menuHighlights
            : String(payload.menuHighlights)
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
          : existing.menuHighlights,
      officialReviews: payload.reviews ?? existing.reviews,
      lat: payload.lat !== undefined ? toNullableNumber(payload.lat) : existing.lat,
      lng: payload.lng !== undefined ? toNullableNumber(payload.lng) : existing.lng,
      geocodeStatus:
        payload.lat !== undefined && payload.lng !== undefined && hasCoords(payload.lat, payload.lng)
          ? "ok"
          : existing.geocodeStatus,
      distanceHint: Number(payload.distance ?? payload.distanceHint ?? existing.distance),
    };
    await upsertRestaurant(next);
    return getRestaurantById(id, { includeHidden: true });
  }

  async function toggleRestaurantVisibility(id, hidden) {
    await db
      .prepare(`UPDATE restaurants SET hidden = ?, source_sync_status = 'manual', last_synced_at = ? WHERE id = ?`)
      .run(hidden ? 1 : 0, nowIso(), String(id));
    return getRestaurantById(id, { includeHidden: true });
  }

  async function attachTagsToRestaurant(id, tagsInput) {
    await db
      .prepare(`UPDATE restaurants SET tags_json = ?, source_sync_status = 'manual', last_synced_at = ? WHERE id = ?`)
      .run(toJson(normalizeTagList(tagsInput), []), nowIso(), String(id));
    return getRestaurantById(id, { includeHidden: true });
  }

  async function syncRestaurantsFromSource() {
    const now = nowIso();
    let created = 0;
    let updated = 0;
    await db.withTransaction(async (txDb) => {
      const selectExisting = txDb.prepare(`SELECT id, views, hidden FROM restaurants WHERE id = ?`);
      for (const source of sourceRestaurants) {
        const exists = await selectExisting.get(source.id);
        const merged = {
          ...source,
          sourceSyncStatus: "synced",
          lastSyncedAt: now,
          views: exists ? Number(exists.views || 0) : Number(source.views || 0),
          hidden: exists ? Number(exists.hidden || 0) : Number(source.hidden || 0),
        };
        await upsertRestaurant(merged, txDb);
        if (exists) updated += 1;
        else created += 1;
      }
    });
    const total = Number((await db.prepare(`SELECT COUNT(*) AS count FROM restaurants`).get())?.count || 0);
    return { syncedAt: now, created, updated, total };
  }

  async function getPostRows(filters = {}) {
    const where = ["1=1"];
    const args = [];
    const status = String(filters.status ?? "all");
    if (status !== "all") {
      where.push(`status = ?`);
      args.push(status);
    }
    if (filters.restaurantId !== undefined && filters.restaurantId !== null && String(filters.restaurantId).trim()) {
      where.push(`restaurant_id = ?`);
      args.push(String(filters.restaurantId));
    }
    const query = normalizeText(filters.query);
    if (query) {
      where.push(`(lower(title) LIKE ? OR lower(content) LIKE ? OR lower(author_name) LIKE ? OR lower(restaurant_snapshot_json) LIKE ?)`);
      const like = `%${query}%`;
      args.push(like, like, like, like);
    }
    const sql = `
      SELECT * FROM posts
      WHERE ${where.join(" AND ")}
      ORDER BY COALESCE(published_at, created_at) DESC, id DESC
    `;
    return db.prepare(sql).all(...args);
  }

  async function hydratePosts(postRows) {
    if (!postRows.length) return [];
    const postIds = postRows.map((row) => Number(row.id));
    const placeholders = postIds.map(() => "?").join(",");
    const comments = await db
      .prepare(`SELECT * FROM post_comments WHERE post_id IN (${placeholders}) ORDER BY created_at ASC, id ASC`)
      .all(...postIds);
    const historyRows = await db
      .prepare(`SELECT * FROM post_moderation_history WHERE post_id IN (${placeholders}) ORDER BY created_at ASC, id ASC`)
      .all(...postIds);

    const commentsByPost = new Map();
    comments.forEach((comment) => {
      const list = commentsByPost.get(Number(comment.post_id)) || [];
      list.push({
        id: `comment-${comment.id}`,
        author: String(comment.author_name || "Nguoi dung"),
        authorId: Number(comment.author_id || 0),
        content: String(comment.content || ""),
        rating: Number(comment.rating || 0),
        createdAt: String(comment.created_at || nowIso()),
      });
      commentsByPost.set(Number(comment.post_id), list);
    });

    const historyByPost = new Map();
    historyRows.forEach((entry) => {
      const list = historyByPost.get(Number(entry.post_id)) || [];
      list.push({
        id: `mh-${entry.id}`,
        action: String(entry.action || "updated"),
        by: String(entry.by_name || "Admin"),
        at: String(entry.created_at || nowIso()),
        note: String(entry.note || ""),
      });
      historyByPost.set(Number(entry.post_id), list);
    });

    return postRows.map((row) => {
      const base = serializePostBase(row);
      base.comments = commentsByPost.get(Number(row.id)) || [];
      base.moderationHistory = historyByPost.get(Number(row.id)) || [];
      return base;
    });
  }

  async function listPosts(filters = {}) {
    return hydratePosts(await getPostRows(filters));
  }

  async function listCommunityPosts(filters = {}) {
    const page = Math.max(1, Number(filters.page || 1));
    const pageSize = Math.max(1, Math.min(100, Number(filters.pageSize || 20)));
    const status = filters.status ? String(filters.status) : "approved";
    const rows = await getPostRows({ ...filters, status });
    const total = rows.length;
    const start = (page - 1) * pageSize;
    const sliced = rows.slice(start, start + pageSize);
    return {
      page,
      pageSize,
      total,
      items: await hydratePosts(sliced),
    };
  }

  async function matchRestaurantBySnapshot(snapshot = {}, restaurantId = null) {
    if (restaurantId) {
      const byId = await db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(String(restaurantId));
      if (byId) return byId;
    }
    const normalizedName = normalizeText(snapshot.name);
    const normalizedAddress = normalizeText(snapshot.address);
    if (!normalizedName) return null;
    const rows = await db.prepare(`SELECT * FROM restaurants`).all();
    return (
      rows.find((row) => {
        const sameName = normalizeText(row.name) === normalizedName;
        if (!sameName) return false;
        if (!normalizedAddress) return true;
        return normalizeText(row.address) === normalizedAddress;
      }) || null
    );
  }

  async function ensureRestaurantForPost(postRow) {
    const snapshot = parseJsonSafe(postRow.restaurant_snapshot_json, {});
    const matched = await matchRestaurantBySnapshot(snapshot, postRow.restaurant_id);
    if (matched) return String(matched.id);
    const newId = `community_${Date.now()}_${Math.floor(Math.random() * 9999)}`;
    await createRestaurant({
      id: newId,
      name: snapshot.name || postRow.title || "Quan cong dong",
      category: snapshot.category || "Cong dong de xuat",
      address: snapshot.address || "",
      area: snapshot.area || pickAreaFromAddress(snapshot.address || ""),
      priceLevel: snapshot.priceLevel || "",
      image: snapshot.image || "",
      time: snapshot.time || "Chua cap nhat",
      rating: Number(postRow.rating || 0),
      totalReviews: Number(postRow.rating || 0) > 0 ? 1 : 0,
      tags: parseJsonSafe(postRow.tags_json, []),
      menuHighlights: snapshot.menuHighlights || [],
      hidden: false,
    });
    return newId;
  }

  async function submitPostForModeration(payload = {}, user) {
    const now = nowIso();
    const snapshotInput = payload.restaurantSnapshot ?? {};
    let snapshot = {
      name: String(snapshotInput.name ?? "").trim(),
      address: String(snapshotInput.address ?? "").trim(),
      area: String(snapshotInput.area ?? pickAreaFromAddress(snapshotInput.address ?? "")).trim() || "Khac",
      category: String(snapshotInput.category ?? "").trim(),
      priceLevel: String(snapshotInput.priceLevel ?? "").trim(),
      time: String(snapshotInput.time ?? "").trim(),
      image: String(snapshotInput.image ?? "").trim(),
      menuHighlights: Array.isArray(snapshotInput.menuHighlights)
        ? snapshotInput.menuHighlights
        : String(snapshotInput.menuHighlights ?? "")
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
    };
    let restaurantId = payload.restaurantId ? String(payload.restaurantId) : null;
    if (!restaurantId) {
      const matched = await matchRestaurantBySnapshot(snapshot, null);
      restaurantId = matched ? String(matched.id) : null;
    }
    if (restaurantId) {
      const restaurant = await db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(String(restaurantId));
      if (restaurant) {
        snapshot = {
          name: snapshot.name || String(restaurant.name || ""),
          address: snapshot.address || String(restaurant.address || ""),
          area: snapshot.area || String(restaurant.area || pickAreaFromAddress(restaurant.address || "")),
          category: snapshot.category || String(restaurant.category || ""),
          priceLevel: snapshot.priceLevel || String(restaurant.price_level || ""),
          time: snapshot.time || String(restaurant.time_label || restaurant.open_status || ""),
          image: snapshot.image || String(restaurant.image_url || ""),
          menuHighlights: snapshot.menuHighlights.length
            ? snapshot.menuHighlights
            : parseJsonSafe(restaurant.menu_highlights_json, []),
        };
      }
    }

    const title = String(payload.title ?? "").trim() || `${snapshot.name || "Quan moi"} - review cong dong`;
    const content = String(payload.content ?? "").trim();
    if (!content) return { ok: false, message: "Noi dung bai dang khong duoc de trong." };
    const tags = normalizeTagList(payload.tags || [snapshot.category, snapshot.area, ...(snapshot.menuHighlights || [])]);
    const mediaNames = Array.isArray(payload.mediaNames) ? payload.mediaNames.map(String).filter(Boolean) : [];

    const insertResult = await db
      .prepare(
        `
        INSERT INTO posts (
          title, content, author_id, author_name, restaurant_id, status, rating, tags_json, media_names_json,
          restaurant_snapshot_json, violation_notes, created_at, published_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, '', ?, NULL)
        RETURNING id
      `,
      )
      .run(
        title,
        content,
        Number(user.id),
        String(user.display_name || user.displayName || "Nguoi dung"),
        restaurantId,
        Number(payload.rating || 0),
        toJson(tags, []),
        toJson(mediaNames, []),
        toJson(snapshot, {}),
        now,
      );
    const postId = Number(insertResult.lastInsertRowid);
    await db
      .prepare(
        `
      INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
      VALUES (?, 'submitted', ?, ?, ?, ?)
    `,
      )
      .run(postId, Number(user.id), String(user.display_name || user.displayName || "Nguoi dung"), "Gui bai cho he thong", now);
    const rows = await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(postId);
    return { ok: true, post: (await hydratePosts(rows))[0] };
  }

  async function appendNotification(type, targetUserId, message) {
    await db
      .prepare(
        `
      INSERT INTO notifications (type, target_user_id, message, status, created_at)
      VALUES (?, ?, ?, 'unread', ?)
    `,
      )
      .run(type, Number(targetUserId), String(message || ""), nowIso());
  }

  async function approvePost(postId, adminUser) {
    const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).get(Number(postId));
    if (!row) return null;
    const now = nowIso();
    const restaurantId = await ensureRestaurantForPost(row);
    await db
      .prepare(
        `
      UPDATE posts
      SET status = 'approved', published_at = COALESCE(published_at, ?), violation_notes = '', restaurant_id = ?
      WHERE id = ?
    `,
      )
      .run(now, restaurantId, Number(postId));
    await db
      .prepare(
        `
      INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
      VALUES (?, 'approved', ?, ?, ?, ?)
    `,
      )
      .run(
        Number(postId),
        Number(adminUser.id),
        String(adminUser.display_name || adminUser.displayName || "Admin"),
        "Bai dang dat tieu chuan",
        now,
      );
    await appendNotification("post_approved", row.author_id, `Bai '${row.title}' da duoc duyet.`);
    return (await hydratePosts(await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(Number(postId))))[0];
  }

  async function rejectPost(postId, note, adminUser) {
    const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).get(Number(postId));
    if (!row) return null;
    const reason = String(note || "").trim() || "Noi dung can bo sung thong tin";
    await db.prepare(`UPDATE posts SET status = 'rejected', violation_notes = ? WHERE id = ?`).run(reason, Number(postId));
    await db
      .prepare(
        `
      INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
      VALUES (?, 'rejected', ?, ?, ?, ?)
    `,
      )
      .run(
        Number(postId),
        Number(adminUser.id),
        String(adminUser.display_name || adminUser.displayName || "Admin"),
        reason,
        nowIso(),
      );
    await appendNotification("post_rejected", row.author_id, `Bai '${row.title}' bi tu choi: ${reason}`);
    return (await hydratePosts(await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(Number(postId))))[0];
  }

  async function updatePost(postId, payload = {}, adminUser) {
    const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).get(Number(postId));
    if (!row) return null;
    const nextViolation = payload.violationNotes !== undefined ? String(payload.violationNotes ?? "") : row.violation_notes;
    await db.prepare(`UPDATE posts SET violation_notes = ? WHERE id = ?`).run(nextViolation, Number(postId));
    await db
      .prepare(
        `
      INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
      VALUES (?, 'updated', ?, ?, ?, ?)
    `,
      )
      .run(
        Number(postId),
        Number(adminUser.id),
        String(adminUser.display_name || adminUser.displayName || "Admin"),
        "Cap nhat thong tin moderation",
        nowIso(),
      );
    return (await hydratePosts(await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(Number(postId))))[0];
  }

  async function attachTagsToPost(postId, tagsInput, adminUser) {
    const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).get(Number(postId));
    if (!row) return null;
    const tags = normalizeTagList(tagsInput);
    await db.prepare(`UPDATE posts SET tags_json = ? WHERE id = ?`).run(toJson(tags, []), Number(postId));
    await db
      .prepare(
        `
      INSERT INTO post_moderation_history (post_id, action, by_user_id, by_name, note, created_at)
      VALUES (?, 'tagged', ?, ?, ?, ?)
    `,
      )
      .run(
        Number(postId),
        Number(adminUser.id),
        String(adminUser.display_name || adminUser.displayName || "Admin"),
        "Cap nhat tag bai dang",
        nowIso(),
      );
    return (await hydratePosts(await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(Number(postId))))[0];
  }

  async function addCommentToPost(postId, payload = {}, user) {
    const row = await db.prepare(`SELECT * FROM posts WHERE id = ?`).get(Number(postId));
    if (!row || row.status !== "approved") return null;
    const content = String(payload.content ?? "").trim();
    if (!content) return null;
    const rating = Number(payload.rating || 0);
    const createdAt = nowIso();
    await db
      .prepare(
        `
      INSERT INTO post_comments (post_id, author_id, author_name, content, rating, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `,
      )
      .run(
        Number(postId),
        Number(user.id),
        String(user.display_name || user.displayName || "Nguoi dung"),
        content,
        rating,
        createdAt,
      );

    if (Number.isFinite(rating) && rating > 0 && row.restaurant_id) {
      const restaurant = await db.prepare(`SELECT * FROM restaurants WHERE id = ?`).get(String(row.restaurant_id));
      if (restaurant) {
        const nextReviewCount = Number(restaurant.review_count || 0) + 1;
        const nextRating = (Number(restaurant.rating || 0) * Number(restaurant.review_count || 0) + rating) / nextReviewCount;
        await db
          .prepare(
            `
          UPDATE restaurants
          SET rating = ?, review_count = ?, last_synced_at = ?, source_sync_status = 'manual'
          WHERE id = ?
        `,
          )
          .run(Number(nextRating.toFixed(2)), nextReviewCount, nowIso(), String(restaurant.id));
      }
    }
    return (await hydratePosts(await db.prepare(`SELECT * FROM posts WHERE id = ?`).all(Number(postId))))[0];
  }

  async function listUsers(filters = {}) {
    const where = ["1=1"];
    const args = [];
    const status = String(filters.status ?? "all");
    if (status !== "all") {
      where.push(`status = ?`);
      args.push(status);
    }
    const query = normalizeText(filters.query);
    if (query) {
      where.push(`(lower(display_name) LIKE ? OR lower(email) LIKE ? OR lower(username) LIKE ?)`);
      const like = `%${query}%`;
      args.push(like, like, like);
    }
    const rows = await db.prepare(`SELECT * FROM users WHERE ${where.join(" AND ")} ORDER BY role DESC, last_active DESC`).all(...args);
    return Promise.all(
      rows.map(async (user) => {
        const profile = (await getProfileByUserIdStmt.get(Number(user.id))) || {};
        return {
          id: Number(user.id),
          name: String(user.display_name || ""),
          email: String(user.email || ""),
          role: String(user.role || "user"),
          status: String(user.status || STATUS_ACTIVE),
          lastActive: String(user.last_active || nowIso()),
          riskScore: scoreRisk(user),
          abnormalFlags: abnormalFlags(user),
          lastAction:
            user.status === STATUS_BANNED
              ? "Cam tai khoan"
              : user.status === STATUS_LOCKED
                ? "Tam khoa tai khoan"
                : "Hoat dong binh thuong",
          profile: {
            phone: String(profile.phone || ""),
            address: String(profile.address || ""),
            dob: String(profile.dob || ""),
            bio: String(profile.bio || ""),
            avatarUrl: String(profile.avatar_url || ""),
          },
        };
      }),
    );
  }

  async function listRiskSignals(limit = 6) {
    const users = await listUsers({ status: "all" });
    return users
      .filter((user) => user.riskScore >= 50 || user.abnormalFlags.length > 0)
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, Math.max(1, Number(limit || 6)))
      .map((user) => ({
        userId: user.id,
        name: user.name,
        riskScore: user.riskScore,
        lastAction: user.lastAction,
      }));
  }

  async function updateUserStatus(userId, status) {
    if (!STATUS_SET.has(status)) return null;
    const user = await getUserById(userId);
    if (!user) return null;
    await db.prepare(`UPDATE users SET status = ?, last_active = ? WHERE id = ?`).run(status, nowIso(), Number(userId));
    const updated = await getUserById(userId);
    if (updated.role !== "admin") {
      const notificationType =
        status === STATUS_ACTIVE ? "account_unlocked" : status === STATUS_LOCKED ? "account_locked" : "account_banned";
      const message =
        status === STATUS_ACTIVE
          ? "Tai khoan cua ban da duoc mo khoa."
          : status === STATUS_LOCKED
            ? "Tai khoan cua ban tam thoi bi khoa."
            : "Tai khoan cua ban da bi cam do vi pham.";
      await appendNotification(notificationType, updated.id, message);
    }
    return (await listUsers({ query: updated.email }))[0] || null;
  }

  async function listNotifications(filters = {}) {
    const where = ["1=1"];
    const args = [];
    if (filters.unreadOnly) where.push(`status != 'read'`);
    if (filters.targetUserId !== undefined && filters.targetUserId !== null) {
      where.push(`target_user_id = ?`);
      args.push(Number(filters.targetUserId));
    }
    const rows = await db
      .prepare(`SELECT * FROM notifications WHERE ${where.join(" AND ")} ORDER BY created_at DESC, id DESC`)
      .all(...args);
    return rows.map((item) => ({
      id: Number(item.id),
      type: String(item.type || ""),
      targetUserId: Number(item.target_user_id || 0),
      message: String(item.message || ""),
      status: String(item.status || "unread"),
      createdAt: String(item.created_at || nowIso()),
    }));
  }

  async function markNotificationRead(notificationId) {
    await db.prepare(`UPDATE notifications SET status = 'read' WHERE id = ?`).run(Number(notificationId));
    const row = await db.prepare(`SELECT * FROM notifications WHERE id = ?`).get(Number(notificationId));
    if (!row) return null;
    return {
      id: Number(row.id),
      type: String(row.type || ""),
      targetUserId: Number(row.target_user_id || 0),
      message: String(row.message || ""),
      status: String(row.status || "unread"),
      createdAt: String(row.created_at || nowIso()),
    };
  }

  async function getAdminStats(weekRange = "Tuan hien tai") {
    const [
      totalRestaurantsRow,
      hiddenRestaurantsRow,
      totalReviewsRow,
      totalViewsRow,
      ratingAverageRow,
      pendingPostsRow,
      restrictedUsersRow,
      unreadNotificationsRow,
      topViewedRows,
      topAreaRows,
      tags,
      postTags,
    ] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS count FROM restaurants`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM restaurants WHERE hidden = 1`).get(),
      db.prepare(`SELECT SUM(review_count) AS value FROM restaurants`).get(),
      db.prepare(`SELECT SUM(views) AS value FROM restaurants`).get(),
      db.prepare(`SELECT AVG(rating) AS value FROM restaurants`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM posts WHERE status='pending'`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM users WHERE status IN ('locked','banned')`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM notifications WHERE status!='read'`).get(),
      db.prepare(`SELECT name, views FROM restaurants ORDER BY views DESC, rating DESC LIMIT 3`).all(),
      db.prepare(`SELECT area AS name, COUNT(*) AS count FROM restaurants GROUP BY area ORDER BY count DESC LIMIT 3`).all(),
      db.prepare(`SELECT tags_json FROM restaurants`).all(),
      db.prepare(`SELECT tags_json FROM posts`).all(),
    ]);

    const totalRestaurants = Number(totalRestaurantsRow?.count || 0);
    const hiddenRestaurants = Number(hiddenRestaurantsRow?.count || 0);
    const totalReviews = Number(totalReviewsRow?.value || 0);
    const totalViews = Number(totalViewsRow?.value || 0);
    const ratingAverage = Number(ratingAverageRow?.value || 0);
    const pendingPosts = Number(pendingPostsRow?.count || 0);
    const restrictedUsers = Number(restrictedUsersRow?.count || 0);
    const unreadNotifications = Number(unreadNotificationsRow?.count || 0);
    const topViewedRestaurants = topViewedRows.map((item) => ({ name: String(item.name), views: Number(item.views || 0) }));
    const topAreas = topAreaRows.map((item) => ({ name: String(item.name || "Khac"), count: Number(item.count || 0) }));
    const map = new Map();
    [...tags, ...postTags].forEach((item) => {
      parseJsonSafe(item.tags_json, []).forEach((tag) => {
        const key = normalizeText(tag);
        if (!key) return;
        map.set(key, (map.get(key) || 0) + 1);
      });
    });
    const topRecommendedDishes = [...map.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    return {
      weekRange,
      datasetSource: "data3.json",
      pendingPosts,
      hiddenRestaurants,
      restrictedUsers,
      unreadNotifications,
      totalRestaurants,
      totalReviews,
      totalViews,
      ratingAverage: Number(ratingAverage.toFixed(2)),
      topViewedRestaurants,
      topRecommendedDishes,
      topAreas,
      hotAreas: topAreas.map((item) => ({ name: item.name, score: Math.min(100, item.count * 30) })),
    };
  }

  async function listNearbyRestaurants(lat, lng, options = {}) {
    const radiusKm = Number(options.radiusKm ?? 5);
    const limit = Number(options.limit ?? 5);
    const rows = await db
      .prepare(`SELECT * FROM restaurants WHERE hidden = 0 AND lat IS NOT NULL AND lng IS NOT NULL AND NOT (lat = 0 AND lng = 0)`)
      .all();
    return rows
      .map((row) => ({ row, distanceKm: haversineKm(Number(lat), Number(lng), Number(row.lat), Number(row.lng)) }))
      .filter((item) => item.distanceKm <= radiusKm)
      .sort((left, right) => {
        const ratingDiff = Number(right.row.rating || 0) - Number(left.row.rating || 0);
        if (ratingDiff !== 0) return ratingDiff;
        const reviewDiff = Number(right.row.review_count || 0) - Number(left.row.review_count || 0);
        if (reviewDiff !== 0) return reviewDiff;
        return left.distanceKm - right.distanceKm;
      })
      .slice(0, Math.max(1, limit))
      .map((item) => serializeRestaurantRow(item.row, { distanceKm: item.distanceKm }))
      .filter(Boolean);
  }

  async function decideRestaurant(lat, lng, options = {}) {
    const candidates = await listNearbyRestaurants(lat, lng, { radiusKm: options.radiusKm ?? 5, limit: 50 });
    const top = candidates.slice(0, 5);
    if (!top.length) return null;
    return top[Math.floor(Math.random() * top.length)];
  }

  const geocodeSelectStmt = db.prepare(`SELECT * FROM geocode_cache WHERE query = ?`);
  const geocodeUpsertStmt = db.prepare(`
    INSERT INTO geocode_cache (query, lat, lng, provider, success, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(query) DO UPDATE SET
      lat = excluded.lat,
      lng = excluded.lng,
      provider = excluded.provider,
      success = excluded.success,
      created_at = excluded.created_at
  `);

  async function geocodeAddress(query) {
    const normalized = String(query ?? "").trim();
    if (!normalized) return null;
    const cached = await geocodeSelectStmt.get(normalized);
    if (cached) {
      if (Number(cached.success) === 1 && hasCoords(cached.lat, cached.lng)) {
        return { lat: Number(cached.lat), lng: Number(cached.lng), cached: true };
      }
      return null;
    }

    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "vn");
    url.searchParams.set("q", normalized);

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "FoodFinder-PTUD/1.0 (student-project)",
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        await geocodeUpsertStmt.run(normalized, null, null, "nominatim", 0, nowIso());
        return null;
      }
      const data = await response.json();
      if (!Array.isArray(data) || !data.length) {
        await geocodeUpsertStmt.run(normalized, null, null, "nominatim", 0, nowIso());
        return null;
      }
      const first = data[0];
      const lat = Number(first.lat);
      const lng = Number(first.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        await geocodeUpsertStmt.run(normalized, null, null, "nominatim", 0, nowIso());
        return null;
      }
      await geocodeUpsertStmt.run(normalized, lat, lng, "nominatim", 1, nowIso());
      return { lat, lng, cached: false };
    } catch {
      await geocodeUpsertStmt.run(normalized, null, null, "nominatim", 0, nowIso());
      return null;
    }
  }

  async function geocodePendingRestaurants(limit = 20) {
    const rows = await db
      .prepare(
        `SELECT id, address FROM restaurants
         WHERE (lat IS NULL OR lng IS NULL OR (lat = 0 AND lng = 0))
           AND geocode_status != 'failed'
         ORDER BY id ASC
         LIMIT ?`,
      )
      .all(Number(limit));
    let processed = 0;
    let updated = 0;
    let failed = 0;
    for (const row of rows) {
      processed += 1;
      const result = await geocodeAddress(row.address);
      if (result && Number.isFinite(result.lat) && Number.isFinite(result.lng)) {
        await db
          .prepare(`UPDATE restaurants SET lat = ?, lng = ?, geocode_status = 'ok', last_synced_at = ? WHERE id = ?`)
          .run(result.lat, result.lng, nowIso(), String(row.id));
        updated += 1;
      } else {
        await db
          .prepare(`UPDATE restaurants SET geocode_status = 'failed', last_synced_at = ? WHERE id = ?`)
          .run(nowIso(), String(row.id));
        failed += 1;
      }
      await wait(1100);
    }
    return { processed, updated, failed };
  }

  async function getHealth() {
    const [users, restaurants, posts] = await Promise.all([
      db.prepare(`SELECT COUNT(*) AS count FROM users`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM restaurants`).get(),
      db.prepare(`SELECT COUNT(*) AS count FROM posts`).get(),
    ]);
    return {
      engine: "supabase-postgresql",
      database: dbLabel,
      users: Number(users?.count || 0),
      restaurants: Number(restaurants?.count || 0),
      posts: Number(posts?.count || 0),
    };
  }

  await seedInitialData();
  await syncRestaurantsFromSource();
  await db.prepare(`UPDATE restaurants SET lat = NULL, lng = NULL, geocode_status = 'pending' WHERE lat = 0 AND lng = 0`).run();

  return {
    dbLabel,
    engine: "supabase-postgresql",
    getHealth,
    getUserById,
    registerUser,
    loginUser,
    getMyProfile,
    updateMyProfile,
    listPublicRestaurants,
    listAdminRestaurants,
    getRestaurantById,
    createRestaurant,
    updateRestaurant,
    toggleRestaurantVisibility,
    attachTagsToRestaurant,
    syncRestaurantsFromSource,
    listPosts,
    listCommunityPosts,
    submitPostForModeration,
    approvePost,
    rejectPost,
    updatePost,
    attachTagsToPost,
    addCommentToPost,
    listUsers,
    listRiskSignals,
    updateUserStatus,
    listNotifications,
    markNotificationRead,
    getAdminStats,
    listNearbyRestaurants,
    decideRestaurant,
    geocodePendingRestaurants,
    close: async () => {
      if (ownsPool) await pool.end();
    },
  };
}
