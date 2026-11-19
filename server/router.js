import {
  buildClearCookieHeader,
  buildSessionCookieHeader,
  createSessionToken,
  extractRequestToken,
  getConfiguredPassword,
  verifyPasscode,
  verifySessionToken
} from "./auth.js";

function jsonResponse(payload, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

async function parseJson(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export async function handleApiRequest({ request, env }, store) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method.toUpperCase();

  if (pathname === "/api/health" && method === "GET") {
    return jsonResponse({ ok: true, service: "ameibao-travel" });
  }

  if (pathname === "/api/auth/status" && method === "GET") {
    const configured = Boolean(getConfiguredPassword(env));
    const token = extractRequestToken(request, false);
    const authenticated = configured ? await verifySessionToken(token, env) : false;
    return jsonResponse({ ok: true, configured, authenticated });
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const body = await parseJson(request);
    const valid = await verifyPasscode(String(body.passcode || ""), env);
    if (!valid) {
      return jsonResponse({ ok: false, error: "暗号不对哦，再想想你们的小秘密～" }, 401);
    }
    const token = await createSessionToken(env);
    return jsonResponse(
      { ok: true, token },
      200,
      { "Set-Cookie": buildSessionCookieHeader(token, request) }
    );
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    return jsonResponse(
      { ok: true },
      200,
      { "Set-Cookie": buildClearCookieHeader(request) }
    );
  }

  // 图片读取允许 Cookie 或 ?t= 会话参数
  const allowQuery = pathname.startsWith("/api/image");
  const token = extractRequestToken(request, allowQuery);
  const authed = await verifySessionToken(token, env);
  if (!authed) {
    return jsonResponse({ ok: false, error: "请先输入暗号唤醒阿咩豹～" }, 401);
  }

  try {
    if (pathname === "/api/bootstrap" && method === "GET") {
      const data = await store.getBootstrap();
      return jsonResponse({ ok: true, ...data });
    }

    if (pathname === "/api/image" && method === "GET") {
      const relPath = url.searchParams.get("path") || "";
      const img = await store.readImage(relPath);
      if (!img) {
        return new Response("Not Found", { status: 404 });
      }
      return new Response(img.buffer, {
        status: 200,
        headers: {
          "Content-Type": img.contentType,
          "Cache-Control": "private, max-age=604800, immutable"
        }
      });
    }

    if (pathname === "/api/profile" && method === "PUT") {
      const body = await parseJson(request);
      const profile = await store.updateProfile(body);
      return jsonResponse({ ok: true, profile });
    }

    if (pathname === "/api/pet" && method === "POST") {
      const petCount = await store.petAmeibao();
      return jsonResponse({ ok: true, petCount });
    }

    if (pathname === "/api/entries" && method === "POST") {
      const body = await parseJson(request);
      const entry = await store.saveEntry(body);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, entry, ...boot });
    }

    if (pathname.startsWith("/api/entries/") && method === "DELETE") {
      const entryId = decodeURIComponent(pathname.slice("/api/entries/".length));
      await store.deleteEntry(entryId);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname === "/api/murmurs" && method === "POST") {
      const body = await parseJson(request);
      const murmur = await store.saveMurmur(body);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, murmur, ...boot });
    }

    if (pathname.startsWith("/api/murmurs/") && pathname.endsWith("/interact") && method === "POST") {
      const mid = decodeURIComponent(
        pathname.slice("/api/murmurs/".length, pathname.length - "/interact".length)
      );
      const body = await parseJson(request);
      await store.interactMurmur(mid, body.action, body);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname.startsWith("/api/murmurs/") && method === "DELETE") {
      const mid = decodeURIComponent(pathname.slice("/api/murmurs/".length));
      await store.deleteMurmur(mid);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname === "/api/plans" && method === "POST") {
      const body = await parseJson(request);
      const plan = await store.savePlan(body);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, plan, ...boot });
    }

    if (pathname.startsWith("/api/plans/") && pathname.endsWith("/wish") && method === "POST") {
      const pid = decodeURIComponent(
        pathname.slice("/api/plans/".length, pathname.length - "/wish".length)
      );
      const body = await parseJson(request);
      await store.mutatePlanWish(pid, body.action, body);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname.startsWith("/api/plans/") && method === "DELETE") {
      const pid = decodeURIComponent(pathname.slice("/api/plans/".length));
      await store.deletePlan(pid);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname === "/api/demo/clear" && method === "POST") {
      await store.clearSamples();
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    if (pathname === "/api/backup/export" && method === "GET") {
      const backup = await store.exportFullBackup();
      return jsonResponse({ ok: true, backup });
    }

    if (pathname === "/api/backup/import" && method === "POST") {
      const body = await parseJson(request);
      await store.importFullBackup(body.backup);
      const boot = await store.getBootstrap();
      return jsonResponse({ ok: true, ...boot });
    }

    return jsonResponse({ ok: false, error: "未知接口" }, 404);
  } catch (err) {
    return jsonResponse(
      { ok: false, error: err?.message || "服务器开小差啦，请稍后再试" },
      400
    );
  }
}
