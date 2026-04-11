import { createServer } from "node:http";

const port = Number(process.env.PORT || 3000);

const users = [];

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });
  res.end(body);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

const server = createServer(async (req, res) => {
  const method = req.method || "GET";
  const pathname = new URL(req.url || "/", `http://localhost:${port}`).pathname;

  if (method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (method === "GET" && (pathname === "/api/health" || pathname === "/health")) {
    sendJson(res, 200, { ok: true, message: "Mock backend running" });
    return;
  }

  if (method === "POST" && (pathname === "/api/register" || pathname === "/register")) {
    try {
      const body = await readJsonBody(req);
      const displayName = String(body.displayName ?? "").trim();
      const email = normalizeEmail(body.email);
      const password = String(body.password ?? "");

      if (!displayName || !email || !password) {
        sendJson(res, 200, { ok: false, message: "Vui long dien day du thong tin." });
        return;
      }

      const existed = users.some((user) => user.email === email);
      if (existed) {
        sendJson(res, 200, { ok: false, message: "Email da duoc su dung" });
        return;
      }

      const newUser = {
        id: users.length + 1,
        displayName,
        email,
        password,
        role: "user",
      };
      users.push(newUser);

      sendJson(res, 200, {
        ok: true,
        session: {
          id: newUser.id,
          displayName: newUser.displayName,
          email: newUser.email,
          role: newUser.role,
        },
      });
      return;
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message || "Invalid request payload" });
      return;
    }
  }

  if (method === "POST" && (pathname === "/api/login" || pathname === "/login")) {
    try {
      const body = await readJsonBody(req);
      const identifier = normalizeEmail(body.identifier ?? body.email);
      const password = String(body.password ?? "");

      const user = users.find((item) => item.email === identifier);
      if (!user || user.password !== password) {
        sendJson(res, 200, { ok: false, message: "Email hoac mat khau sai" });
        return;
      }

      sendJson(res, 200, {
        ok: true,
        session: {
          id: user.id,
          displayName: user.displayName,
          email: user.email,
          role: user.role,
        },
      });
      return;
    } catch (error) {
      sendJson(res, 400, { ok: false, message: error.message || "Invalid request payload" });
      return;
    }
  }

  sendJson(res, 404, { ok: false, message: "Not Found" });
});

server.listen(port, () => {
  console.log(`[backend] running at http://localhost:${port}`);
  console.log(`[backend] health check at http://localhost:${port}/api/health`);
});
