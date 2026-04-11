import { spawn } from "node:child_process";
import { resolve } from "node:path";

const children = [];
let isShuttingDown = false;
const backendPort = process.env.BACKEND_PORT || "3100";

function shutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
}

function runProcess(label, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: {
      ...process.env,
      ...extraEnv,
    },
  });

  children.push(child);

  child.on("exit", (code, signal) => {
    if (!isShuttingDown) {
      console.error(`[${label}] exited with code=${code ?? "null"} signal=${signal ?? "null"}`);
      shutdown();
      process.exit(code ?? 1);
    }
  });
}

console.log(`[dev:all] starting backend at http://localhost:${backendPort}`);
runProcess("backend", process.execPath, ["server/index.js"], { PORT: backendPort });

console.log("[dev:all] starting frontend at http://localhost:5173");
const viteBin = resolve("node_modules", "vite", "bin", "vite.js");
runProcess("frontend", process.execPath, [viteBin, "--host", "0.0.0.0", "--port", "5173"], {
  BACKEND_PORT: backendPort,
});

console.log("[dev:all] one-link app URL: http://localhost:5173");

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});
