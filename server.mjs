import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleApiRequest } from "./server/router.js";
import { createTravelStore } from "./server/store.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, "public");
const DEFAULT_DATA_DIR = path.join(__dirname, "travel-data");
const MAX_BODY_BYTES = 50 * 1024 * 1024; // 50 MB，满足多图一次上传和完整备份恢复

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

async function loadEnvVars() {
  const env = { ...process.env };
  for (const filename of [".env", ".dev.vars"]) {
    try {
      const raw = await fs.readFile(path.join(__dirname, filename), "utf-8");
      for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eq = trimmed.indexOf("=");
        if (eq <= 0) continue;
        const key = trimmed.slice(0, eq).trim();
        let val = trimmed.slice(eq + 1).trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!(key in env)) {
          env[key] = val;
        }
      }
    } catch {
      // optional .env
    }
  }
  return env;
}

async function readRequestBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      throw new Error("上传内容超过 50MB 上限，请分批上传照片哦～");
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function serveStatic(reqPath, res) {
  let cleanPath = decodeURIComponent(reqPath.split("?")[0]);
  if (cleanPath === "/") cleanPath = "/index.html";
  const resolved = path.resolve(PUBLIC_DIR, `.${cleanPath}`);
  if (!resolved.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const stat = await fs.stat(resolved);
    const filePath = stat.isDirectory() ? path.join(resolved, "index.html") : resolved;
    const ext = path.extname(filePath).toLowerCase();
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-cache"
    });
    res.end(data);
  } catch {
    const indexHtml = await fs.readFile(path.join(PUBLIC_DIR, "index.html"));
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(indexHtml);
  }
}

const env = await loadEnvVars();
const listenHost = env.HOST || "0.0.0.0";
const listenPort = Number(env.PORT || 8799);
const dataDir = env.DATA_DIR ? path.resolve(__dirname, env.DATA_DIR) : DEFAULT_DATA_DIR;

if (!env.TRAVEL_PASSWORD && !env.PASSCODE) {
  env.TRAVEL_PASSWORD = "ameibao";
}

const store = createTravelStore(dataDir);

const server = http.createServer(async (req, res) => {
  try {
    const host = req.headers.host || `127.0.0.1:${listenPort}`;
    const forwardedProto = req.headers["x-forwarded-proto"];
    const proto =
      typeof forwardedProto === "string" && forwardedProto.split(",")[0].trim() === "https"
        ? "https"
        : "http";
    const fullUrl = `${proto}://${host}${req.url || "/"}`;
    const url = new URL(fullUrl);

    if (url.pathname.startsWith("/api/")) {
      const method = (req.method || "GET").toUpperCase();
      const bodyBuf =
        method === "GET" || method === "HEAD" ? undefined : await readRequestBody(req);
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (v !== undefined) {
          headers.set(k, Array.isArray(v) ? v.join(", ") : v);
        }
      }
      const webRequest = new Request(fullUrl, {
        method,
        headers,
        body: bodyBuf && bodyBuf.length > 0 ? bodyBuf : undefined
      });

      const webResponse = await handleApiRequest({ request: webRequest, env }, store);
      const outHeaders = {};
      webResponse.headers.forEach((value, key) => {
        if (key.toLowerCase() !== "set-cookie") {
          outHeaders[key] = value;
        }
      });
      if (typeof webResponse.headers.getSetCookie === "function") {
        const cookies = webResponse.headers.getSetCookie();
        if (cookies.length > 0) outHeaders["Set-Cookie"] = cookies;
      } else if (webResponse.headers.has("set-cookie")) {
        outHeaders["Set-Cookie"] = webResponse.headers.get("set-cookie");
      }

      const buf = Buffer.from(await webResponse.arrayBuffer());
      res.writeHead(webResponse.status, outHeaders);
      res.end(buf);
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (err) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, error: err?.message || "Internal error" }));
  }
});

server.listen(listenPort, listenHost, () => {
  const displayHost = listenHost === "0.0.0.0" ? "127.0.0.1" : listenHost;
  console.log(`\n🦭 阿咩豹的旅行手账服务已启动：http://${displayHost}:${listenPort}`);
  console.log(`📁 数据与照片目录：${dataDir}`);
  console.log(`🔑 当前手账暗号：${env.TRAVEL_PASSWORD || env.PASSCODE}`);
});
