const TOKEN_KEY = "ameibao_travel_token";

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function buildImageUrl(relPath) {
  if (!relPath) return "";
  if (relPath.startsWith("data:") || relPath.startsWith("blob:") || relPath.startsWith("http")) {
    return relPath;
  }
  const token = getStoredToken();
  const qs = new URLSearchParams({ path: relPath });
  if (token) qs.set("t", token);
  return `/api/image?${qs.toString()}`;
}

async function requestJson(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getStoredToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const res = await fetch(url, {
    ...options,
    headers,
    credentials: "same-origin"
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    const err = new Error(data.error || `请求失败 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  authStatus: () => requestJson("/api/auth/status"),
  login: async (passcode) => {
    const res = await requestJson("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ passcode })
    });
    if (res.token) setStoredToken(res.token);
    return res;
  },
  logout: async () => {
    await requestJson("/api/auth/logout", { method: "POST" }).catch(() => {});
    setStoredToken("");
  },
  bootstrap: () => requestJson("/api/bootstrap"),
  updateProfile: (payload) =>
    requestJson("/api/profile", {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  petAmeibao: () => requestJson("/api/pet", { method: "POST" }),
  saveEntry: (payload) =>
    requestJson("/api/entries", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteEntry: (id) =>
    requestJson(`/api/entries/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),
  saveMurmur: (payload) =>
    requestJson("/api/murmurs", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  interactMurmur: (id, payload) =>
    requestJson(`/api/murmurs/${encodeURIComponent(id)}/interact`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deleteMurmur: (id) =>
    requestJson(`/api/murmurs/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),
  savePlan: (payload) =>
    requestJson("/api/plans", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  mutatePlanWish: (id, payload) =>
    requestJson(`/api/plans/${encodeURIComponent(id)}/wish`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  deletePlan: (id) =>
    requestJson(`/api/plans/${encodeURIComponent(id)}`, {
      method: "DELETE"
    }),
  clearSamples: () => requestJson("/api/demo/clear", { method: "POST" }),
  exportBackup: () => requestJson("/api/backup/export"),
  importBackup: (backup) =>
    requestJson("/api/backup/import", {
      method: "POST",
      body: JSON.stringify({ backup })
    })
};

/**
 * 浏览器端高清图片自动瘦身压缩，既保留旅行照片清晰画质，又让上传到自有服务器飞快不占空间
 */
export async function compressImageFile(file, { maxSide = 1600, quality = 0.85 } = {}) {
  if (!file) throw new Error("未选择图片");
  if (file.type === "image/svg+xml") {
    const text = await file.text();
    const b64 = btoa(unescape(encodeURIComponent(text)));
    return {
      base64: b64,
      ext: "svg",
      previewUrl: `data:image/svg+xml;base64,${b64}`
    };
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取照片失败"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("无法解析该图片格式"));
    el.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (width > maxSide || height > maxSide) {
    if (width >= height) {
      height = Math.round((height * maxSide) / width);
      width = maxSide;
    } else {
      width = Math.round((width * maxSide) / height);
      height = maxSide;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const outMime = "image/jpeg";
  const compressedUrl = canvas.toDataURL(outMime, quality);
  const commaIdx = compressedUrl.indexOf(",");
  return {
    base64: compressedUrl.slice(commaIdx + 1),
    ext: "jpg",
    previewUrl: compressedUrl
  };
}
