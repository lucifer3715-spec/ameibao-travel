import { api, buildImageUrl, compressImageFile } from "./api.js";
import { getMiniSealSvg, nextAmeibaoQuote, nextPatQuote, renderAmeibao } from "./ameibao.js";

const STAMPS = {
  food: ["必吃回头客", "阿咩豹拍肚皮推荐", "街角宝藏小店", "值得一试", "避雷快跑"],
  spot: ["神仙出片地", "吹风发呆绝佳", "必去打卡", "顺路可逛", "人多慎去"]
};

const STAR_HINTS = {
  1: "1 星 · 下次不踩坑啦",
  2: "2 星 · 勉强及格",
  3: "3 星 · 中规中矩还不错",
  4: "4 星 · 很喜欢，值得推荐！",
  5: "5 星 · 念念不忘，满分神作！"
};

const state = {
  profile: {
    journalTitle: "阿咩豹的旅行手账",
    partnerA: "我",
    partnerB: "女朋友",
    togetherSince: "",
    petCount: 6,
    foodTags: [],
    spotTags: []
  },
  entries: [],
  murmurs: [],
  plans: [],
  hasSample: false,

  activeTab: "food", // food | spot | places | murmurs | plans
  selectedPlace: "ALL",
  selectedTag: "ALL",
  searchQuery: "",
  sortBy: "date_desc",
  groupByPlace: false,
  focusedCityInPlaces: null,

  // 编辑游记弹窗状态
  modalCategory: "food",
  modalRating: 5,
  modalStamp: "必吃回头客",
  modalAuthor: "both",
  modalPhotos: [], // { id?, path?, base64?, ext?, previewUrl, caption }

  // 碎碎念草稿
  murmurAuthor: "partnerA",
  murmurMood: "seal",
  murmurPhoto: null, // { base64, ext, previewUrl }

  // 灯箱状态
  lightboxItems: [],
  lightboxIndex: 0
};

function $(id) {
  return document.getElementById(id);
}

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function showToast(message) {
  const container = $("toast-container");
  if (!container) return;
  const el = document.createElement("div");
  el.className = "toast-msg";
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 2800);
}

function todayIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatFriendlyTime(isoStr) {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return isoStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${day} ${hh}:${mm}`;
}

function renderMoodIconHtml(mood) {
  if (!mood || mood === "seal" || mood === "🦭") {
    return getMiniSealSvg(18);
  }
  return `<span>${escapeHtml(mood)}</span>`;
}

function getAuthorLabel(code) {
  const a = state.profile.partnerA || "我";
  const b = state.profile.partnerB || "女朋友";
  if (code === "partnerA") return a;
  if (code === "partnerB") return b;
  if (code === "ameibao") return "阿咩豹";
  return `${a} & ${b}`;
}

function collectAllPlaces() {
  const set = new Set();
  for (const e of state.entries) {
    if (e.place) set.add(e.place);
  }
  for (const p of state.plans) {
    if (p.destination) set.add(p.destination);
  }
  return Array.from(set);
}

function applyBootstrapData(data) {
  if (data.profile) state.profile = data.profile;
  if (Array.isArray(data.entries)) state.entries = data.entries;
  if (Array.isArray(data.murmurs)) state.murmurs = data.murmurs;
  if (Array.isArray(data.plans)) state.plans = data.plans;
  state.hasSample = Boolean(data.hasSample);
  renderEverything();
}

/* ================= 顶栏、统计与全局渲染 ================= */
let rollTimer = null;

function renderHeader() {
  $("journal-title-text").textContent = state.profile.journalTitle || "阿咩豹的旅行手账";
  document.title = `${state.profile.journalTitle || "阿咩豹的旅行手账"} · 美食与风景记录册`;
  $("pat-count-text").textContent = `摸摸嘴筒子 ${state.profile.petCount || 0} 次`;
  $("couple-badge-text").textContent = `${state.profile.partnerA} & ${state.profile.partnerB}`;

  const daysBadge = $("together-days-badge");
  if (state.profile.togetherSince) {
    const start = new Date(`${state.profile.togetherSince}T00:00:00`);
    if (!Number.isNaN(start.getTime())) {
      const diff = Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000) + 1);
      daysBadge.textContent = `❤️ 相伴第 ${diff} 天`;
      daysBadge.classList.remove("hidden");
    } else {
      daysBadge.classList.add("hidden");
    }
  } else {
    daysBadge.classList.add("hidden");
  }

  const uniqueCities = new Set(state.entries.map((e) => e.place).filter(Boolean));
  const foodCount = state.entries.filter((e) => e.category === "food").length;
  const spotCount = state.entries.filter((e) => e.category === "spot").length;
  const photoCount =
    state.entries.reduce((sum, e) => sum + ((e.photos && e.photos.length) || 0), 0) +
    state.murmurs.reduce((sum, m) => sum + (m.photo?.path ? 1 : 0), 0);

  $("stat-places-count").textContent = String(uniqueCities.size);
  $("stat-food-count").textContent = String(foodCount);
  $("stat-spot-count").textContent = String(spotCount);
  $("stat-photos-count").textContent = String(photoCount);

  const banner = $("sample-banner");
  if (state.hasSample) {
    banner.classList.remove("hidden");
  } else {
    banner.classList.add("hidden");
  }
}

function renderHeaderSealPose(mood = "peek") {
  renderAmeibao($("header-ameibao-svg"), {
    mood,
    size: mood === "bellyRoll" ? 96 : 108
  });
}

async function handlePatAmeibao() {
  if (rollTimer) clearTimeout(rollTimer);
  renderHeaderSealPose("bellyRoll");
  $("ameibao-speech-text").textContent = nextPatQuote();
  rollTimer = setTimeout(() => {
    renderHeaderSealPose("peek");
  }, 2200);

  try {
    const res = await api.petAmeibao();
    state.profile.petCount = res.petCount;
    $("pat-count-text").textContent = `摸摸嘴筒子 ${res.petCount} 次`;
  } catch {
    // ignore transient pet error
  }
}

function switchTab(tab) {
  state.activeTab = tab;
  document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });

  $("view-entries").classList.toggle("hidden", tab !== "food" && tab !== "spot");
  $("view-places").classList.toggle("hidden", tab !== "places");
  $("view-murmurs").classList.toggle("hidden", tab !== "murmurs");
  $("view-plans").classList.toggle("hidden", tab !== "plans");

  if (tab === "food" || tab === "spot") {
    state.selectedPlace = "ALL";
    state.selectedTag = "ALL";
    renderEntriesView();
  } else if (tab === "places") {
    renderPlacesView();
  } else if (tab === "murmurs") {
    renderMurmursView();
  } else if (tab === "plans") {
    renderPlansView();
  }

  $("ameibao-speech-text").textContent = nextAmeibaoQuote(tab);
}

function renderEverything() {
  renderHeader();
  renderMurmurAuthorPicker();
  if (state.activeTab === "food" || state.activeTab === "spot") {
    renderEntriesView();
  } else if (state.activeTab === "places") {
    renderPlacesView();
  } else if (state.activeTab === "murmurs") {
    renderMurmursView();
  } else if (state.activeTab === "plans") {
    renderPlansView();
  }
}

/* ================= 视图 1 & 2：美食 / 景点 游记卡片 ================= */
function buildEntryCardHtml(entry) {
  const cover = entry.photos && entry.photos[0];
  const photoLen = (entry.photos && entry.photos.length) || 0;
  const stars = "★".repeat(entry.rating || 5) + "☆".repeat(5 - (entry.rating || 5));
  const paText = entry.partnerReviews?.partnerA;
  const pbText = entry.partnerReviews?.partnerB;

  const coverMarkup = cover
    ? `<img src="${escapeHtml(buildImageUrl(cover.path))}" alt="${escapeHtml(entry.title)}" loading="lazy" />`
    : `<div class="entry-no-photo">
         <div data-empty-seal="${entry.category}"></div>
         <span>暂未上传照片 · 点开补充吧</span>
       </div>`;

  return `
    <article class="entry-card" data-entry-id="${escapeHtml(entry.id)}">
      <div class="entry-cover-wrap">
        ${coverMarkup}
        <span class="card-place-badge">📍 ${escapeHtml(entry.place || "未分类")}</span>
        ${entry.stamp ? `<span class="card-stamp-seal">${escapeHtml(entry.stamp)}</span>` : ""}
        ${photoLen > 1 ? `<span class="card-photo-count">📸 ${photoLen} 张</span>` : ""}
      </div>

      <div class="entry-card-body">
        <div class="entry-title-row">
          <h3 class="entry-card-title">${escapeHtml(entry.title)}</h3>
          <span class="entry-stars" title="${entry.rating} 星">${stars}</span>
        </div>

        <div class="entry-meta-line">
          <span>🗓️ ${escapeHtml(entry.visitDate || "")}</span>
          ${entry.specificLocation ? `<span>· ${escapeHtml(entry.specificLocation)}</span>` : ""}
          ${entry.cost ? `<span class="entry-cost-pill">${escapeHtml(entry.cost)}</span>` : ""}
        </div>

        ${
          entry.comment
            ? `<p class="entry-comment-excerpt">${escapeHtml(entry.comment)}</p>`
            : ""
        }

        ${
          paText || pbText
            ? `<div class="couple-bubbles">
                ${
                  paText
                    ? `<div class="partner-bubble pa">
                         <span class="partner-bubble-name">${escapeHtml(state.profile.partnerA)}：</span>
                         <span>${escapeHtml(paText)}</span>
                       </div>`
                    : ""
                }
                ${
                  pbText
                    ? `<div class="partner-bubble pb">
                         <span class="partner-bubble-name">${escapeHtml(state.profile.partnerB)}：</span>
                         <span>${escapeHtml(pbText)}</span>
                       </div>`
                    : ""
                }
              </div>`
            : ""
        }

        ${
          entry.tags && entry.tags.length > 0
            ? `<div class="entry-card-tags">
                ${entry.tags.map((t) => `<span class="mini-tag">#${escapeHtml(t)}</span>`).join("")}
              </div>`
            : ""
        }
      </div>
    </article>
  `;
}

function hydrateCardEmptySeals(rootEl) {
  rootEl.querySelectorAll("[data-empty-seal]").forEach((el) => {
    const cat = el.getAttribute("data-empty-seal");
    renderAmeibao(el, { mood: cat === "food" ? "foodie" : "guide", size: 88 });
  });
}

function renderEntriesView() {
  const isFood = state.activeTab === "food";
  const category = isFood ? "food" : "spot";

  $("entries-section-title").textContent = isFood ? "🍜 旅途美食图鉴" : "🏞️ 心动景点足迹";
  $("entries-section-desc").textContent = isFood
    ? "按城市归档每一顿难忘风味，写下我们两个人的专属吃货评语"
    : "收好并肩看过的海、山野与日落，每一处风景都有阿咩豹盖章";
  $("new-entry-hero-label").textContent = isFood ? "记一顿美食" : "记一处景点";

  const catEntries = state.entries.filter((e) => e.category === category);

  // 1. 渲染地点分类胶囊
  const placeCounts = new Map();
  for (const e of catEntries) {
    const p = e.place || "未分类地点";
    placeCounts.set(p, (placeCounts.get(p) || 0) + 1);
  }
  const placePills = [
    `<button type="button" class="place-pill ${
      state.selectedPlace === "ALL" ? "active" : ""
    }" data-place="ALL">全部地点 (${catEntries.length})</button>`
  ];
  for (const [place, cnt] of placeCounts.entries()) {
    placePills.push(
      `<button type="button" class="place-pill ${
        state.selectedPlace === place ? "active" : ""
      }" data-place="${escapeHtml(place)}">${escapeHtml(place)} (${cnt})</button>`
    );
  }
  $("place-pills-wrap").innerHTML = placePills.join("");

  // 2. 渲染标签筛选胶囊
  const tagSet = new Set();
  for (const e of catEntries) {
    for (const t of e.tags || []) tagSet.add(t);
  }
  const tagList = Array.from(tagSet);
  const tagRow = $("tag-pills-row");
  if (tagList.length === 0) {
    tagRow.innerHTML = "";
    tagRow.classList.add("hidden");
  } else {
    tagRow.classList.remove("hidden");
    tagRow.innerHTML = [
      `<button type="button" class="tag-filter-chip ${
        state.selectedTag === "ALL" ? "active" : ""
      }" data-tag="ALL">全部标签</button>`,
      ...tagList.map(
        (t) =>
          `<button type="button" class="tag-filter-chip ${
            state.selectedTag === t ? "active" : ""
          }" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`
      )
    ].join("");
  }

  // 更新分组按钮状态文案
  $("toggle-group-view-btn").textContent = state.groupByPlace ? "🃏 切换平铺视图" : "🗂️ 按地点分组";

  // 3. 过滤与排序
  const q = state.searchQuery.trim().toLowerCase();
  const filtered = catEntries.filter((e) => {
    if (state.selectedPlace !== "ALL" && e.place !== state.selectedPlace) return false;
    if (state.selectedTag !== "ALL" && !(e.tags || []).includes(state.selectedTag)) return false;
    if (q) {
      const hay = [
        e.title,
        e.place,
        e.specificLocation,
        e.comment,
        e.partnerReviews?.partnerA,
        e.partnerReviews?.partnerB,
        ...(e.tags || [])
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (state.sortBy === "rating_desc") {
      if ((b.rating || 0) !== (a.rating || 0)) return (b.rating || 0) - (a.rating || 0);
    } else if (state.sortBy === "date_asc") {
      if ((a.visitDate || "") !== (b.visitDate || "")) {
        return (a.visitDate || "").localeCompare(b.visitDate || "");
      }
    }
    if ((b.visitDate || "") !== (a.visitDate || "")) {
      return (b.visitDate || "").localeCompare(a.visitDate || "");
    }
    return (b.createdAt || "").localeCompare(a.createdAt || "");
  });

  const listWrap = $("entries-list-container");
  if (filtered.length === 0) {
    listWrap.innerHTML = `
      <div class="empty-state-box">
        <div id="empty-entries-seal"></div>
        <h3>还没有找到对应的${isFood ? "美食" : "景点"}记录哦</h3>
        <p>阿咩豹已经准备好小印章啦，快把你们吃过的好吃的或去过的地方记下来吧～</p>
        <button type="button" class="btn btn-primary" id="empty-add-entry-btn">
          ＋ 立即记第一笔${isFood ? "美食" : "景点"}
        </button>
      </div>
    `;
    renderAmeibao($("empty-entries-seal"), {
      mood: isFood ? "foodie" : "guide",
      size: 120
    });
    $("empty-add-entry-btn")?.addEventListener("click", () =>
      openEntryModal({ category })
    );
    return;
  }

  if (state.groupByPlace && state.selectedPlace === "ALL") {
    const groups = new Map();
    for (const item of filtered) {
      const p = item.place || "未分类地点";
      if (!groups.has(p)) groups.set(p, []);
      groups.get(p).push(item);
    }
    const blocks = [];
    for (const [city, items] of groups.entries()) {
      blocks.push(`
        <div class="place-group-block">
          <div class="place-group-header">
            <h3 class="place-group-title">
              <span>📍 ${escapeHtml(city)}</span>
              <span class="place-group-count">${items.length} 篇${isFood ? "美食" : "景点"}</span>
            </h3>
            <button type="button" class="btn btn-soft btn-sm" data-quick-add-place="${escapeHtml(city)}">
              ＋ 在${escapeHtml(city)}再记一笔
            </button>
          </div>
          <div class="entries-grid">
            ${items.map(buildEntryCardHtml).join("")}
          </div>
        </div>
      `);
    }
    listWrap.innerHTML = blocks.join("");
  } else {
    listWrap.innerHTML = `<div class="entries-grid">${filtered
      .map(buildEntryCardHtml)
      .join("")}</div>`;
  }

  hydrateCardEmptySeals(listWrap);
}

/* ================= 视图 3：🧭 地点足迹册 ================= */
function renderPlacesView() {
  const overview = $("places-overview-wrap");
  const detail = $("single-place-detail");

  const cityMap = new Map();
  for (const e of state.entries) {
    const city = e.place || "未分类地点";
    if (!cityMap.has(city)) {
      cityMap.set(city, {
        city,
        foods: [],
        spots: [],
        photoCount: 0,
        coverPath: "",
        latestDate: ""
      });
    }
    const bucket = cityMap.get(city);
    if (e.category === "spot") bucket.spots.push(e);
    else bucket.foods.push(e);
    bucket.photoCount += (e.photos && e.photos.length) || 0;
    if (!bucket.coverPath && e.photos && e.photos[0]?.path) {
      bucket.coverPath = e.photos[0].path;
    }
    if ((e.visitDate || "") > bucket.latestDate) {
      bucket.latestDate = e.visitDate || "";
    }
  }

  if (state.focusedCityInPlaces && cityMap.has(state.focusedCityInPlaces)) {
    const info = cityMap.get(state.focusedCityInPlaces);
    overview.classList.add("hidden");
    detail.classList.remove("hidden");
    detail.innerHTML = `
      <div class="single-place-banner">
        <div>
          <button type="button" class="btn btn-soft btn-sm" id="back-all-places-btn">
            ← 返回全部城市邮戳
          </button>
          <h2 class="section-title" style="margin-top:10px;">📍 ${escapeHtml(info.city)} · 完整旅行手账</h2>
          <p class="section-desc">
            共记录 ${info.foods.length} 顿美食 · ${info.spots.length} 处景点 · ${info.photoCount} 张照片
          </p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-soft btn-sm" id="city-add-food-btn">
            ＋ 记${escapeHtml(info.city)}美食
          </button>
          <button type="button" class="btn btn-primary btn-sm" id="city-add-spot-btn">
            ＋ 记${escapeHtml(info.city)}景点
          </button>
        </div>
      </div>

      ${
        info.foods.length > 0
          ? `<div class="place-group-block">
               <div class="place-group-header">
                 <h3 class="place-group-title">🍜 在${escapeHtml(info.city)}吃过的美食 (${info.foods.length})</h3>
               </div>
               <div class="entries-grid">${info.foods.map(buildEntryCardHtml).join("")}</div>
             </div>`
          : ""
      }

      ${
        info.spots.length > 0
          ? `<div class="place-group-block">
               <div class="place-group-header">
                 <h3 class="place-group-title">🏞️ 在${escapeHtml(info.city)}看过的风景 (${info.spots.length})</h3>
               </div>
               <div class="entries-grid">${info.spots.map(buildEntryCardHtml).join("")}</div>
             </div>`
          : ""
      }
    `;
    hydrateCardEmptySeals(detail);
    $("back-all-places-btn")?.addEventListener("click", () => {
      state.focusedCityInPlaces = null;
      renderPlacesView();
    });
    $("city-add-food-btn")?.addEventListener("click", () =>
      openEntryModal({ category: "food", place: info.city })
    );
    $("city-add-spot-btn")?.addEventListener("click", () =>
      openEntryModal({ category: "spot", place: info.city })
    );
    return;
  }

  state.focusedCityInPlaces = null;
  overview.classList.remove("hidden");
  detail.classList.add("hidden");

  const cities = Array.from(cityMap.values()).sort((a, b) =>
    (b.latestDate || "").localeCompare(a.latestDate || "")
  );
  const grid = $("places-grid");
  if (cities.length === 0) {
    grid.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1 / -1;">
        <div id="empty-places-seal"></div>
        <h3>还没有点亮第一座城市邮戳</h3>
        <p>只要在「美食」或「景点」里记下一笔，对应的城市明信片就会自动出现在这里哦！</p>
      </div>
    `;
    renderAmeibao($("empty-places-seal"), { mood: "guide", size: 118 });
    return;
  }

  grid.innerHTML = cities
    .map(
      (c) => `
      <article class="place-postcard" data-open-city="${escapeHtml(c.city)}">
        <div class="postcard-cover">
          ${
            c.coverPath
              ? `<img src="${escapeHtml(buildImageUrl(c.coverPath))}" alt="${escapeHtml(c.city)}" loading="lazy" />`
              : `<div class="entry-no-photo"><div data-empty-seal="spot"></div></div>`
          }
          <div class="postcard-stamp-circle">
            <span>已打卡</span>
            ${getMiniSealSvg(16)}
          </div>
        </div>
        <div class="postcard-body">
          <h3 class="postcard-city">📍 ${escapeHtml(c.city)}</h3>
          <div class="postcard-counts">
            <span>🍜 ${c.foods.length} 美食</span>
            <span>🏞️ ${c.spots.length} 景点</span>
            <span>📸 ${c.photoCount} 图</span>
          </div>
          <div class="postcard-date">最近足迹：${escapeHtml(c.latestDate || "已珍藏")}</div>
        </div>
      </article>
    `
    )
    .join("");
  hydrateCardEmptySeals(grid);
}

/* ================= 视图 4：💌 碎碎念留言板 ================= */
function renderMurmurAuthorPicker() {
  const seg = $("murmur-author-seg");
  if (!seg) return;
  const opts = [
    { code: "partnerA", label: state.profile.partnerA || "我" },
    { code: "partnerB", label: state.profile.partnerB || "女朋友" },
    { code: "ameibao", label: "召唤阿咩豹", isSeal: true }
  ];
  seg.innerHTML = opts
    .map(
      (o) =>
        `<button type="button" class="author-seg-btn ${
          state.murmurAuthor === o.code ? "active" : ""
        }" data-murmur-author="${o.code}">${o.isSeal ? `${getMiniSealSvg(15)} ` : ""}${escapeHtml(o.label)}</button>`
    )
    .join("");
}

function renderMurmursView() {
  renderMurmurAuthorPicker();
  const wall = $("murmurs-wall");
  if (state.murmurs.length === 0) {
    wall.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1 / -1;">
        <div id="empty-murmur-seal"></div>
        <h3>漂流瓶里还空空的～</h3>
        <p>写下第一句碎碎念吧，不管是想吃什么、旅途吐槽还是悄悄表白都可以！</p>
      </div>
    `;
    renderAmeibao($("empty-murmur-seal"), { mood: "journal", size: 118 });
    return;
  }

  wall.innerHTML = state.murmurs
    .map((m) => {
      const cls =
        m.author === "partnerB"
          ? "note-pb"
          : m.author === "ameibao"
            ? "note-ameibao"
            : "note-pa";
      const replies = Array.isArray(m.replies) ? m.replies : [];
      const defaultReplyAuthor = m.author === "partnerA" ? "partnerB" : "partnerA";
      return `
        <article class="murmur-note ${cls}" data-murmur-id="${escapeHtml(m.id)}">
          <div class="murmur-head">
            <span class="murmur-author-chip">
              ${renderMoodIconHtml(m.mood)}
              <span>${escapeHtml(getAuthorLabel(m.author))}</span>
              ${m.place ? `<span class="muted-mini">· 📍${escapeHtml(m.place)}</span>` : ""}
            </span>
            ${m.pinned ? `<span class="murmur-pin-tag">📌 置顶</span>` : ""}
          </div>

          ${m.text ? `<p class="murmur-text">${escapeHtml(m.text)}</p>` : ""}

          ${
            m.photo?.path
              ? `<img class="murmur-photo" src="${escapeHtml(
                  buildImageUrl(m.photo.path)
                )}" data-murmur-zoom="${escapeHtml(buildImageUrl(m.photo.path))}" alt="碎碎念配图" loading="lazy" />`
              : ""
          }

          ${
            replies.length > 0
              ? `<div class="murmur-replies">
                  ${replies
                    .map(
                      (r) => `
                      <div class="murmur-reply-item">
                        <span><strong>${escapeHtml(getAuthorLabel(r.author))}：</strong>${escapeHtml(
                          r.text
                        )}</span>
                        <button type="button" class="wish-del-btn" data-del-reply="${escapeHtml(
                          r.id
                        )}" title="删除回复">✕</button>
                      </div>
                    `
                    )
                    .join("")}
                </div>`
              : ""
          }

          <form class="murmur-reply-form hidden" data-reply-form="${escapeHtml(m.id)}">
            <select class="soft-select" name="replyAuthor" style="padding:4px 8px;font-size:12px;">
              <option value="partnerA" ${defaultReplyAuthor === "partnerA" ? "selected" : ""}>${escapeHtml(
                state.profile.partnerA
              )}</option>
              <option value="partnerB" ${defaultReplyAuthor === "partnerB" ? "selected" : ""}>${escapeHtml(
                state.profile.partnerB
              )}</option>
            </select>
            <input type="text" name="replyText" placeholder="接一句悄悄话..." maxlength="300" required />
            <button type="submit" class="btn btn-primary btn-sm">发送</button>
          </form>

          <div class="murmur-foot">
            <span>${escapeHtml(formatFriendlyTime(m.createdAt))}</span>
            <div class="murmur-actions">
              <button type="button" class="note-act-btn ${
                m.hearts > 0 ? "hearted" : ""
              }" data-murmur-act="heart">
                ❤️ ${m.hearts || 0}
              </button>
              <button type="button" class="note-act-btn" data-murmur-act="toggleReply">
                💬 接话
              </button>
              <button type="button" class="note-act-btn" data-murmur-act="pin" title="置顶或取消置顶">
                📌
              </button>
              <button type="button" class="note-act-btn" data-murmur-act="delete" title="删除">
                🗑️
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

/* ================= 视图 5：🎒 下一站旅行计划 ================= */
function buildCountdownText(startDate, status) {
  if (status === "completed") return "🎉 已圆梦打卡";
  if (status === "ongoing") return "✈️ 旅途进行中！";
  if (!startDate) return "🌱 攒假期待出发";
  const target = new Date(`${startDate}T00:00:00`);
  const now = new Date(`${todayIso()}T00:00:00`);
  const diffDays = Math.round((target.getTime() - now.getTime()) / 86400000);
  if (diffDays > 0) return `⏳ 倒计时 ${diffDays} 天出发`;
  if (diffDays === 0) return "🎒 就是今天出发！";
  return `🗓️ 计划日期 ${startDate}`;
}

function renderWishColumn(plan, type, colTitle, placeholder) {
  const items = (plan.wishes || []).filter((w) => w.type === type);
  const canConvert = type === "food" || type === "spot";
  return `
    <div class="wish-column">
      <h4 class="wish-col-title">
        <span>${colTitle}</span>
        <span class="muted-mini">${items.filter((i) => i.done).length}/${items.length}</span>
      </h4>

      <div class="wish-items-list">
        ${
          items.length === 0
            ? `<span class="muted-mini">还没有添加条目，在下方随手记一个吧～</span>`
            : items
                .map(
                  (w) => `
                  <div class="wish-item ${w.done ? "done" : ""}" data-wish-id="${escapeHtml(w.id)}">
                    <div class="wish-left">
                      <button type="button" class="wish-check-btn" data-wish-toggle="${escapeHtml(
                        w.id
                      )}" title="勾选完成">${w.done ? "✓" : ""}</button>
                      <div>
                        <span class="wish-title-text">${escapeHtml(w.title)}</span>
                        ${w.note ? `<span class="wish-note-text">${escapeHtml(w.note)}</span>` : ""}
                      </div>
                    </div>
                    <div class="wish-right-btns">
                      ${
                        canConvert
                          ? w.linkedEntryId
                            ? `<button type="button" class="wish-convert-btn" data-open-linked="${escapeHtml(
                                w.linkedEntryId
                              )}">📖 看游记</button>`
                            : `<button type="button" class="wish-convert-btn" data-convert-wish="${escapeHtml(
                                w.id
                              )}" title="去打卡并写成正式游记">✨ 写游记</button>`
                          : ""
                      }
                      <button type="button" class="wish-del-btn" data-wish-del="${escapeHtml(
                        w.id
                      )}" title="删除">✕</button>
                    </div>
                  </div>
                `
                )
                .join("")
        }
      </div>

      <form class="wish-quick-add" data-add-wish-type="${type}">
        <input type="text" name="wishTitle" placeholder="${placeholder}" maxlength="90" required />
        <button type="submit" class="btn btn-soft btn-sm">＋</button>
      </form>
    </div>
  `;
}

function renderPlansView() {
  const wrap = $("plans-list-wrap");
  if (state.plans.length === 0) {
    wrap.innerHTML = `
      <div class="empty-state-box">
        <div id="empty-plans-seal"></div>
        <h3>下一站我们去哪里玩呢？</h3>
        <p>阿咩豹已经举好小旗子啦！建一个旅行计划，把想吃的店和想去的风景慢慢填进去吧～</p>
        <button type="button" class="btn btn-primary" id="empty-new-plan-btn">
          ＋ 新建第一个旅行计划
        </button>
      </div>
    `;
    renderAmeibao($("empty-plans-seal"), { mood: "plan", size: 120 });
    $("empty-new-plan-btn")?.addEventListener("click", () => openPlanModal());
    return;
  }

  wrap.innerHTML = state.plans
    .map((p) => {
      const countdown = buildCountdownText(p.startDate, p.status);
      const dateRange =
        p.startDate && p.endDate
          ? `${p.startDate} 至 ${p.endDate}`
          : p.startDate
            ? `预计 ${p.startDate} 出发`
            : "出发日期待定";
      return `
        <section class="plan-ticket-card" data-plan-id="${escapeHtml(p.id)}">
          <div class="plan-ticket-top">
            <div>
              <div class="plan-dest-row">
                <span class="plan-dest-badge">✈️ ${escapeHtml(p.destination)}</span>
                <span class="plan-countdown-pill">${escapeHtml(countdown)}</span>
              </div>
              <h3 class="plan-sub-title">${escapeHtml(p.title || "")}</h3>
              <div class="plan-meta-row">
                <span>🗓️ ${escapeHtml(dateRange)}</span>
                ${p.budget ? `<span>💰 ${escapeHtml(p.budget)}</span>` : ""}
              </div>
            </div>

            <div style="display:flex;gap:8px;">
              <button type="button" class="btn btn-soft btn-sm" data-edit-plan="${escapeHtml(p.id)}">
                ✏️ 编辑计划
              </button>
              <button type="button" class="btn btn-danger-ghost btn-sm" data-del-plan="${escapeHtml(
                p.id
              )}">
                🗑️
              </button>
            </div>
          </div>

          ${p.notes ? `<div class="plan-notes-banner">📌 路线备忘：${escapeHtml(p.notes)}</div>` : ""}

          <div class="plan-columns">
            ${renderWishColumn(p, "food", "🍜 想吃的美食", "加一家想吃的店...")}
            ${renderWishColumn(p, "spot", "🏞️ 想去的景点", "加一处想逛的风景...")}
            ${renderWishColumn(p, "todo", "🎒 行前准备清单", "加一项准备待办...")}
          </div>
        </section>
      `;
    })
    .join("");
}

/* ================= 弹窗：新增 / 编辑 游记 ================= */
function updateEntryModalCategoryUI(cat) {
  state.modalCategory = cat === "spot" ? "spot" : "food";
  const isFood = state.modalCategory === "food";

  document.querySelectorAll(".cat-switch-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.cat === state.modalCategory);
  });

  $("entry-title-label").textContent = isFood ? "美食 / 店铺名称 *" : "景点 / 打卡地名称 *";
  $("entry-title-input").placeholder = isFood
    ? "例如：老巷鲜虾砂锅粥 / 水上市场打糕"
    : "例如：猫头山三号观景台 / 洛伽寺日落";
  $("entry-cost-label").textContent = isFood ? "人均 / 花销（选填）" : "门票 / 花销（选填）";

  const stamps = STAMPS[state.modalCategory];
  if (!stamps.includes(state.modalStamp)) {
    state.modalStamp = stamps[0];
  }
  renderStampPicker();
  renderModalTagSuggestions();
}

function renderStarPicker() {
  document.querySelectorAll("#star-rating-picker .star-btn").forEach((btn) => {
    const val = Number(btn.dataset.val);
    btn.classList.toggle("active", val <= state.modalRating);
  });
  $("star-rating-hint").textContent = STAR_HINTS[state.modalRating] || "";
}

function renderStampPicker() {
  const stamps = STAMPS[state.modalCategory] || STAMPS.food;
  $("stamp-picker-row").innerHTML = stamps
    .map(
      (s) =>
        `<button type="button" class="quick-chip ${
          state.modalStamp === s ? "active" : ""
        }" data-stamp-val="${escapeHtml(s)}">${escapeHtml(s)}</button>`
    )
    .join("");
}

function renderModalTagSuggestions() {
  const pool =
    state.modalCategory === "spot"
      ? state.profile.spotTags || []
      : state.profile.foodTags || [];
  $("modal-tag-suggestions").innerHTML = pool
    .map(
      (t) =>
        `<button type="button" class="quick-chip" data-suggest-tag="${escapeHtml(
          t
        )}">+ ${escapeHtml(t)}</button>`
    )
    .join("");
}

function renderModalAuthorPicker() {
  const opts = [
    { code: "both", label: `❤️ 两个人一起` },
    { code: "partnerA", label: state.profile.partnerA || "我" },
    { code: "partnerB", label: state.profile.partnerB || "女朋友" }
  ];
  $("entry-author-picker").innerHTML = opts
    .map(
      (o) =>
        `<button type="button" class="author-seg-btn ${
          state.modalAuthor === o.code ? "active" : ""
        }" data-entry-author="${o.code}">${escapeHtml(o.label)}</button>`
    )
    .join("");
}

function renderModalPhotosGrid() {
  const grid = $("entry-photos-grid");
  const addTile = $("entry-photo-add-tile");
  grid.querySelectorAll(".upload-photo-item").forEach((el) => el.remove());

  state.modalPhotos.forEach((p, idx) => {
    const div = document.createElement("div");
    div.className = "upload-photo-item";
    div.innerHTML = `
      <img src="${escapeHtml(p.previewUrl)}" alt="照片 ${idx + 1}" />
      ${
        idx === 0
          ? `<span class="upload-cover-tag">封面</span>`
          : `<button type="button" class="upload-cover-tag" data-make-cover="${idx}" style="border:none;cursor:pointer;background:rgba(38,28,20,0.65);">设封面</button>`
      }
      <button type="button" class="upload-del-btn" data-remove-photo="${idx}" title="移除">✕</button>
      <input type="text" placeholder="写句图注(选填)" value="${escapeHtml(
        p.caption || ""
      )}" data-photo-caption="${idx}" maxlength="80" />
    `;
    grid.insertBefore(div, addTile);
  });

  $("photo-count-indicator").textContent = `${state.modalPhotos.length} / 9 张`;
  addTile.classList.toggle("hidden", state.modalPhotos.length >= 9);
}

function openEntryModal({
  entry = null,
  category = null,
  place = "",
  title = "",
  fromPlanId = "",
  fromWishId = ""
} = {}) {
  const cat = entry
    ? entry.category
    : category || (state.activeTab === "spot" ? "spot" : "food");

  $("entry-modal-title").textContent = entry ? "✏️ 编辑游记记录" : "🐾 记一笔新游记";
  $("entry-id-input").value = entry ? entry.id : "";
  $("entry-from-plan-id").value = fromPlanId || "";
  $("entry-from-wish-id").value = fromWishId || "";

  $("entry-title-input").value = entry ? entry.title : title;
  $("entry-place-input").value = entry
    ? entry.place
    : place || (state.selectedPlace !== "ALL" ? state.selectedPlace : "");
  $("entry-location-input").value = entry ? entry.specificLocation || "" : "";
  $("entry-date-input").value = entry ? entry.visitDate || todayIso() : todayIso();
  $("entry-cost-input").value = entry ? entry.cost || "" : "";
  $("entry-comment-input").value = entry ? entry.comment || "" : "";
  $("review-partner-a").value = entry ? entry.partnerReviews?.partnerA || "" : "";
  $("review-partner-b").value = entry ? entry.partnerReviews?.partnerB || "" : "";
  $("entry-tags-input").value = entry ? (entry.tags || []).join(" ") : "";

  $("label-review-a").textContent = `${state.profile.partnerA || "我"}的小评语`;
  $("label-review-b").textContent = `${state.profile.partnerB || "女朋友"}的小评语`;

  state.modalRating = entry ? entry.rating || 5 : 5;
  state.modalStamp = entry ? entry.stamp || STAMPS[cat][0] : STAMPS[cat][0];
  state.modalAuthor = entry ? entry.author || "both" : "both";
  state.modalPhotos = entry
    ? (entry.photos || []).map((p) => ({
        id: p.id,
        path: p.path,
        caption: p.caption || "",
        previewUrl: buildImageUrl(p.path)
      }))
    : [];

  const places = collectAllPlaces();
  $("existing-places-suggestions").innerHTML = places
    .slice(0, 8)
    .map(
      (p) =>
        `<button type="button" class="quick-chip" data-fill-place="${escapeHtml(
          p
        )}">📍 ${escapeHtml(p)}</button>`
    )
    .join("");

  updateEntryModalCategoryUI(cat);
  renderStarPicker();
  renderModalAuthorPicker();
  renderModalPhotosGrid();

  $("entry-modal").classList.remove("hidden");
}

/* ================= 弹窗：游记详情阅读 & 灯箱 ================= */
function openDetailModal(entryId) {
  const entry = state.entries.find((e) => e.id === entryId);
  if (!entry) return;

  const isFood = entry.category === "food";
  const stars = "★".repeat(entry.rating || 5) + "☆".repeat(5 - (entry.rating || 5));
  const photos = entry.photos || [];

  $("detail-modal-badges").innerHTML = `
    <span class="seal-tag-pill" style="margin:0;">${isFood ? "🍜 美食图鉴" : "🏞️ 景点足迹"}</span>
    <span class="place-group-count">📍 ${escapeHtml(entry.place)}</span>
    ${
      entry.stamp
        ? `<span class="mini-tag" style="background:var(--coral-soft);color:var(--coral-stamp);font-weight:800;">${escapeHtml(
            entry.stamp
          )}</span>`
        : ""
    }
  `;

  const pa = entry.partnerReviews?.partnerA;
  const pb = entry.partnerReviews?.partnerB;

  $("detail-modal-content").innerHTML = `
    <div>
      <h2 class="detail-title">${escapeHtml(entry.title)}</h2>
      <div class="entry-meta-line" style="margin-top:8px;font-size:13px;">
        <span style="color:#f3a83b;font-weight:800;">${stars}</span>
        <span>🗓️ ${escapeHtml(entry.visitDate || "")}</span>
        ${entry.specificLocation ? `<span>📍 ${escapeHtml(entry.specificLocation)}</span>` : ""}
        ${entry.cost ? `<span class="entry-cost-pill">${escapeHtml(entry.cost)}</span>` : ""}
        <span>✍️ ${escapeHtml(getAuthorLabel(entry.author))}记录</span>
      </div>
    </div>

    ${
      photos.length > 0
        ? `<div class="detail-gallery">
            ${photos
              .map(
                (p, idx) => `
                <div class="detail-gallery-item" data-detail-photo-idx="${idx}">
                  <img src="${escapeHtml(buildImageUrl(p.path))}" alt="${escapeHtml(
                    p.caption || entry.title
                  )}" />
                  ${
                    p.caption
                      ? `<p class="detail-gallery-caption">${escapeHtml(p.caption)}</p>`
                      : ""
                  }
                </div>
              `
              )
              .join("")}
          </div>`
        : ""
    }

    ${entry.comment ? `<p class="detail-story">${escapeHtml(entry.comment)}</p>` : ""}

    ${
      pa || pb
        ? `<div class="couple-bubbles" style="gap:8px;">
            ${
              pa
                ? `<div class="partner-bubble pa" style="font-size:13.5px;padding:10px 14px;">
                     <span class="partner-bubble-name">💬 ${escapeHtml(
                       state.profile.partnerA
                     )}：</span>
                     <span>${escapeHtml(pa)}</span>
                   </div>`
                : ""
            }
            ${
              pb
                ? `<div class="partner-bubble pb" style="font-size:13.5px;padding:10px 14px;">
                     <span class="partner-bubble-name">💬 ${escapeHtml(
                       state.profile.partnerB
                     )}：</span>
                     <span>${escapeHtml(pb)}</span>
                   </div>`
                : ""
            }
          </div>`
        : ""
    }

    ${
      entry.tags && entry.tags.length > 0
        ? `<div class="entry-card-tags">
            ${entry.tags.map((t) => `<span class="mini-tag">#${escapeHtml(t)}</span>`).join("")}
          </div>`
        : ""
    }

    <div class="modal-footer modal-footer-between" style="margin-top:6px;">
      <button type="button" class="btn btn-danger-ghost btn-sm" id="detail-delete-btn">
        🗑️ 删除这篇记录
      </button>
      <div class="footer-right-btns">
        <button type="button" class="btn btn-soft" data-close-modal="detail-modal">关闭</button>
        <button type="button" class="btn btn-primary" id="detail-edit-btn">
          ✏️ 编辑内容 / 增补照片
        </button>
      </div>
    </div>
  `;

  $("detail-modal-content")
    .querySelectorAll("[data-detail-photo-idx]")
    .forEach((el) => {
      el.addEventListener("click", () => {
        const idx = Number(el.getAttribute("data-detail-photo-idx")) || 0;
        openLightbox(
          photos.map((p) => ({
            url: buildImageUrl(p.path),
            caption: p.caption || entry.title
          })),
          idx
        );
      });
    });

  $("detail-edit-btn")?.addEventListener("click", () => {
    $("detail-modal").classList.add("hidden");
    openEntryModal({ entry });
  });

  $("detail-delete-btn")?.addEventListener("click", async () => {
    if (!window.confirm(`确定要删除「${entry.title}」吗？关联的照片也会一并清理哦。`)) return;
    try {
      const res = await api.deleteEntry(entry.id);
      $("detail-modal").classList.add("hidden");
      applyBootstrapData(res);
      showToast("已删除该篇记录");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("detail-modal").classList.remove("hidden");
}

function openLightbox(items, startIndex = 0) {
  if (!items || items.length === 0) return;
  state.lightboxItems = items;
  state.lightboxIndex = startIndex;
  updateLightboxSlide();
  $("photo-lightbox").classList.remove("hidden");
}

function updateLightboxSlide() {
  const item = state.lightboxItems[state.lightboxIndex];
  if (!item) return;
  $("lightbox-img").src = item.url;
  $("lightbox-caption").textContent =
    state.lightboxItems.length > 1
      ? `${item.caption || ""} (${state.lightboxIndex + 1} / ${state.lightboxItems.length})`
      : item.caption || "";
  const multi = state.lightboxItems.length > 1;
  $("lightbox-prev-btn").classList.toggle("hidden", !multi);
  $("lightbox-next-btn").classList.toggle("hidden", !multi);
}

/* ================= 弹窗：下一站计划 & 设置 ================= */
function openPlanModal(plan = null) {
  $("plan-modal-title").textContent = plan ? "✏️ 编辑旅行计划" : "🎒 规划下一站旅行";
  $("plan-id-input").value = plan ? plan.id : "";
  $("plan-dest-input").value = plan ? plan.destination : "";
  $("plan-status-select").value = plan ? plan.status || "planning" : "planning";
  $("plan-title-input").value = plan ? plan.title || "" : "";
  $("plan-start-input").value = plan ? plan.startDate || "" : "";
  $("plan-end-input").value = plan ? plan.endDate || "" : "";
  $("plan-budget-input").value = plan ? plan.budget || "" : "";
  $("plan-notes-input").value = plan ? plan.notes || "" : "";
  $("plan-modal").classList.remove("hidden");
}

function openSettingsModal() {
  $("set-journal-title").value = state.profile.journalTitle || "阿咩豹的旅行手账";
  $("set-partner-a").value = state.profile.partnerA || "我";
  $("set-partner-b").value = state.profile.partnerB || "女朋友";
  $("set-together-date").value = state.profile.togetherSince || "";
  $("set-food-tags").value = (state.profile.foodTags || []).join(" ");
  $("set-spot-tags").value = (state.profile.spotTags || []).join(" ");
  $("settings-modal").classList.remove("hidden");
}

function splitTagsInput(raw) {
  return String(raw || "")
    .split(/[\s,，、#]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/* ================= 事件绑定与初始化 ================= */
function bindEvents() {
  // 登录表单
  $("toggle-passcode-btn")?.addEventListener("click", () => {
    const inp = $("passcode-input");
    inp.type = inp.type === "password" ? "text" : "password";
  });

  $("login-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const errEl = $("login-error");
    const btn = $("login-submit-btn");
    errEl.classList.add("hidden");
    btn.disabled = true;
    btn.textContent = "阿咩豹正在核对暗号...";
    try {
      await api.login($("passcode-input").value);
      $("passcode-input").value = "";
      await enterApp();
    } catch (err) {
      errEl.textContent = err.message || "暗号不对哦～";
      errEl.classList.remove("hidden");
    } finally {
      btn.disabled = false;
      btn.textContent = "唤醒阿咩豹，翻开手账";
    }
  });

  // 顶部互动
  $("ameibao-avatar-btn")?.addEventListener("click", handlePatAmeibao);
  $("pat-badge-btn")?.addEventListener("click", handlePatAmeibao);

  $("MemoryDiceBtn")?.addEventListener("click", () => {
    if (state.entries.length === 0) {
      showToast("还没有游记回忆哦，快先记下第一篇吧～");
      return;
    }
    const pick = state.entries[Math.floor(Math.random() * state.entries.length)];
    handlePatAmeibao();
    showToast(`🎲 阿咩豹拱出了在「${pick.place}」的美好回忆！`);
    openDetailModal(pick.id);
  });

  $("open-settings-btn")?.addEventListener("click", openSettingsModal);

  document.querySelectorAll("[data-jump-tab]").forEach((chip) => {
    chip.addEventListener("click", () => {
      switchTab(chip.getAttribute("data-jump-tab"));
    });
  });

  // 主导航切换
  document.querySelectorAll(".nav-tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // 一键清空示例数据
  $("clear-sample-btn")?.addEventListener("click", async () => {
    if (!window.confirm("要把阿咩豹预置的示例卡片清空，开始记录你们自己的真实游记吗？")) return;
    try {
      const res = await api.clearSamples();
      applyBootstrapData(res);
      showToast("✨ 示例已清空，开始写属于你们的第一篇旅行故事吧！");
    } catch (err) {
      showToast(err.message);
    }
  });

  // 新增按钮与悬浮按钮
  $("new-entry-hero-btn")?.addEventListener("click", () =>
    openEntryModal({ category: state.activeTab === "spot" ? "spot" : "food" })
  );
  $("places-quick-add-btn")?.addEventListener("click", () => openEntryModal());
  $("fab-add-btn")?.addEventListener("click", () => {
    if (state.activeTab === "plans") {
      openPlanModal();
    } else if (state.activeTab === "murmurs") {
      $("murmur-text-input")?.focus();
      window.scrollTo({ top: 180, behavior: "smooth" });
    } else {
      openEntryModal({
        category: state.activeTab === "spot" ? "spot" : "food",
        place: state.focusedCityInPlaces || ""
      });
    }
  });

  // 美食/景点筛选栏事件委托
  $("place-pills-wrap")?.addEventListener("click", (e) => {
    const pill = e.target.closest("[data-place]");
    if (!pill) return;
    state.selectedPlace = pill.getAttribute("data-place");
    renderEntriesView();
  });

  $("tag-pills-row")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-tag]");
    if (!chip) return;
    state.selectedTag = chip.getAttribute("data-tag");
    renderEntriesView();
  });

  $("entry-search-input")?.addEventListener("input", (e) => {
    state.searchQuery = e.target.value;
    renderEntriesView();
  });

  $("entry-sort-select")?.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderEntriesView();
  });

  $("toggle-group-view-btn")?.addEventListener("click", () => {
    state.groupByPlace = !state.groupByPlace;
    if (state.groupByPlace) state.selectedPlace = "ALL";
    renderEntriesView();
  });

  // 点击游记卡片打开详情（美食、景点、单城市详情页通用）
  document.addEventListener("click", (e) => {
    const quickPlaceBtn = e.target.closest("[data-quick-add-place]");
    if (quickPlaceBtn) {
      openEntryModal({
        category: state.activeTab === "spot" ? "spot" : "food",
        place: quickPlaceBtn.getAttribute("data-quick-add-place")
      });
      return;
    }

    const cityCard = e.target.closest("[data-open-city]");
    if (cityCard) {
      state.focusedCityInPlaces = cityCard.getAttribute("data-open-city");
      renderPlacesView();
      return;
    }

    const card = e.target.closest(".entry-card[data-entry-id]");
    if (card) {
      openDetailModal(card.getAttribute("data-entry-id"));
      return;
    }

    const closeBtn = e.target.closest("[data-close-modal]");
    if (closeBtn) {
      $(closeBtn.getAttribute("data-close-modal"))?.classList.add("hidden");
    }
  });

  // 点击遮罩空白处关闭弹窗
  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.add("hidden");
    });
  });

  // 游记编辑弹窗内部交互
  document.querySelectorAll(".cat-switch-btn").forEach((btn) => {
    btn.addEventListener("click", () => updateEntryModalCategoryUI(btn.dataset.cat));
  });

  $("star-rating-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".star-btn");
    if (!btn) return;
    state.modalRating = Number(btn.dataset.val) || 5;
    renderStarPicker();
  });

  $("stamp-picker-row")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-stamp-val]");
    if (!chip) return;
    state.modalStamp = chip.getAttribute("data-stamp-val");
    renderStampPicker();
  });

  $("existing-places-suggestions")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-fill-place]");
    if (!chip) return;
    $("entry-place-input").value = chip.getAttribute("data-fill-place");
  });

  $("modal-tag-suggestions")?.addEventListener("click", (e) => {
    const chip = e.target.closest("[data-suggest-tag]");
    if (!chip) return;
    const tag = chip.getAttribute("data-suggest-tag");
    const current = splitTagsInput($("entry-tags-input").value);
    if (!current.includes(tag)) {
      current.push(tag);
      $("entry-tags-input").value = current.join(" ");
    }
  });

  $("entry-author-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-entry-author]");
    if (!btn) return;
    state.modalAuthor = btn.getAttribute("data-entry-author");
    renderModalAuthorPicker();
  });

  // 多图选择并自动压缩
  $("entry-photos-input")?.addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;
    const remain = 9 - state.modalPhotos.length;
    const slice = files.slice(0, remain);
    showToast(`📸 阿咩豹正在整理 ${slice.length} 张照片...`);
    for (const file of slice) {
      try {
        const compressed = await compressImageFile(file);
        state.modalPhotos.push({
          base64: compressed.base64,
          ext: compressed.ext,
          previewUrl: compressed.previewUrl,
          caption: ""
        });
      } catch (err) {
        showToast(err.message || "某张图片读取失败");
      }
    }
    renderModalPhotosGrid();
  });

  $("entry-photos-grid")?.addEventListener("click", (e) => {
    const rmBtn = e.target.closest("[data-remove-photo]");
    if (rmBtn) {
      const idx = Number(rmBtn.getAttribute("data-remove-photo"));
      state.modalPhotos.splice(idx, 1);
      renderModalPhotosGrid();
      return;
    }
    const covBtn = e.target.closest("[data-make-cover]");
    if (covBtn) {
      const idx = Number(covBtn.getAttribute("data-make-cover"));
      const [picked] = state.modalPhotos.splice(idx, 1);
      if (picked) state.modalPhotos.unshift(picked);
      renderModalPhotosGrid();
    }
  });

  $("entry-photos-grid")?.addEventListener("input", (e) => {
    const inp = e.target.closest("[data-photo-caption]");
    if (!inp) return;
    const idx = Number(inp.getAttribute("data-photo-caption"));
    if (state.modalPhotos[idx]) {
      state.modalPhotos[idx].caption = inp.value;
    }
  });

  // 提交保存游记
  $("entry-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = $("save-entry-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "阿咩豹正在盖章保存...";
    try {
      const payload = {
        id: $("entry-id-input").value || undefined,
        fromPlanId: $("entry-from-plan-id").value || undefined,
        fromWishId: $("entry-from-wish-id").value || undefined,
        category: state.modalCategory,
        title: $("entry-title-input").value,
        place: $("entry-place-input").value,
        specificLocation: $("entry-location-input").value,
        visitDate: $("entry-date-input").value,
        cost: $("entry-cost-input").value,
        rating: state.modalRating,
        stamp: state.modalStamp,
        comment: $("entry-comment-input").value,
        partnerReviews: {
          partnerA: $("review-partner-a").value,
          partnerB: $("review-partner-b").value
        },
        tags: splitTagsInput($("entry-tags-input").value),
        author: state.modalAuthor,
        photos: state.modalPhotos.map((p) => ({
          id: p.id,
          path: p.path,
          base64: p.base64,
          ext: p.ext,
          caption: p.caption
        }))
      };
      const res = await api.saveEntry(payload);
      $("entry-modal").classList.add("hidden");
      if (state.activeTab !== "places" && state.activeTab !== "plans") {
        state.activeTab = payload.category;
        document.querySelectorAll(".nav-tab-btn").forEach((b) => {
          b.classList.toggle("active", b.dataset.tab === state.activeTab);
        });
      }
      applyBootstrapData(res);
      handlePatAmeibao();
      showToast("✨ 盖章成功！阿咩豹已经把这段回忆收进手账啦～");
    } catch (err) {
      showToast(err.message);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "🐾 让阿咩豹盖章收好";
    }
  });

  // ================= 碎碎念交互 =================
  $("murmur-author-seg")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-murmur-author]");
    if (!btn) return;
    state.murmurAuthor = btn.getAttribute("data-murmur-author");
    renderMurmurAuthorPicker();
  });

  $("murmur-mood-picker")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".mood-btn");
    if (!btn) return;
    state.murmurMood = btn.dataset.mood;
    document.querySelectorAll("#murmur-mood-picker .mood-btn").forEach((b) => {
      b.classList.toggle("active", b.dataset.mood === state.murmurMood);
    });
  });

  $("murmur-photo-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const compressed = await compressImageFile(file, { maxSide: 1280, quality: 0.84 });
      state.murmurPhoto = compressed;
      $("murmur-photo-preview-img").src = compressed.previewUrl;
      $("murmur-photo-preview-wrap").classList.remove("hidden");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("murmur-remove-photo-btn")?.addEventListener("click", () => {
    state.murmurPhoto = null;
    $("murmur-photo-preview-wrap").classList.add("hidden");
  });

  $("murmur-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("murmur-submit-btn");
    btn.disabled = true;
    try {
      const res = await api.saveMurmur({
        author: state.murmurAuthor,
        mood: state.murmurMood,
        place: $("murmur-place-input").value,
        text: $("murmur-text-input").value,
        pinned: $("murmur-pin-check").checked,
        photo: state.murmurPhoto
          ? { base64: state.murmurPhoto.base64, ext: state.murmurPhoto.ext }
          : null
      });
      $("murmur-text-input").value = "";
      $("murmur-place-input").value = "";
      $("murmur-pin-check").checked = false;
      state.murmurPhoto = null;
      $("murmur-photo-preview-wrap").classList.add("hidden");
      applyBootstrapData(res);
      showToast("💌 悄悄话已经塞进漂流瓶啦！");
    } catch (err) {
      showToast(err.message);
    } finally {
      btn.disabled = false;
    }
  });

  $("murmurs-wall")?.addEventListener("click", async (e) => {
    const zoomImg = e.target.closest("[data-murmur-zoom]");
    if (zoomImg) {
      openLightbox([{ url: zoomImg.getAttribute("data-murmur-zoom"), caption: "碎碎念配图" }], 0);
      return;
    }

    const noteEl = e.target.closest("[data-murmur-id]");
    if (!noteEl) return;
    const murmurId = noteEl.getAttribute("data-murmur-id");

    const delReplyBtn = e.target.closest("[data-del-reply]");
    if (delReplyBtn) {
      const res = await api.interactMurmur(murmurId, {
        action: "deleteReply",
        replyId: delReplyBtn.getAttribute("data-del-reply")
      });
      applyBootstrapData(res);
      return;
    }

    const actBtn = e.target.closest("[data-murmur-act]");
    if (!actBtn) return;
    const act = actBtn.getAttribute("data-murmur-act");

    if (act === "toggleReply") {
      const form = noteEl.querySelector(`[data-reply-form="${murmurId}"]`);
      form?.classList.toggle("hidden");
      form?.querySelector("input")?.focus();
      return;
    }
    if (act === "delete") {
      if (!window.confirm("确定要删除这张碎碎念小纸条吗？")) return;
      const res = await api.deleteMurmur(murmurId);
      applyBootstrapData(res);
      showToast("已收起这张小纸条");
      return;
    }
    const res = await api.interactMurmur(murmurId, { action: act });
    applyBootstrapData(res);
  });

  $("murmurs-wall")?.addEventListener("submit", async (e) => {
    const replyForm = e.target.closest("[data-reply-form]");
    if (!replyForm) return;
    e.preventDefault();
    const murmurId = replyForm.getAttribute("data-reply-form");
    const author = replyForm.elements.replyAuthor.value;
    const text = replyForm.elements.replyText.value;
    try {
      const res = await api.interactMurmur(murmurId, {
        action: "reply",
        author,
        text
      });
      applyBootstrapData(res);
    } catch (err) {
      showToast(err.message);
    }
  });

  // ================= 下一站旅行计划交互 =================
  $("new-plan-btn")?.addEventListener("click", () => openPlanModal());

  $("plan-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const planId = $("plan-id-input").value;
    const existing = state.plans.find((p) => p.id === planId);
    try {
      const res = await api.savePlan({
        id: planId || undefined,
        destination: $("plan-dest-input").value,
        status: $("plan-status-select").value,
        title: $("plan-title-input").value,
        startDate: $("plan-start-input").value,
        endDate: $("plan-end-input").value,
        budget: $("plan-budget-input").value,
        notes: $("plan-notes-input").value,
        wishes: existing ? existing.wishes : undefined
      });
      $("plan-modal").classList.add("hidden");
      applyBootstrapData(res);
      showToast("🎒 旅行计划已保存！");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("plans-list-wrap")?.addEventListener("click", async (e) => {
    const cardEl = e.target.closest("[data-plan-id]");
    if (!cardEl) return;
    const planId = cardEl.getAttribute("data-plan-id");
    const plan = state.plans.find((p) => p.id === planId);
    if (!plan) return;

    if (e.target.closest("[data-edit-plan]")) {
      openPlanModal(plan);
      return;
    }
    if (e.target.closest("[data-del-plan]")) {
      if (!window.confirm(`确定要删除「${plan.destination}」的旅行计划吗？`)) return;
      const res = await api.deletePlan(planId);
      applyBootstrapData(res);
      showToast("已删除该旅行计划");
      return;
    }

    const toggleBtn = e.target.closest("[data-wish-toggle]");
    if (toggleBtn) {
      const res = await api.mutatePlanWish(planId, {
        action: "toggle",
        wishId: toggleBtn.getAttribute("data-wish-toggle")
      });
      applyBootstrapData(res);
      return;
    }

    const delWishBtn = e.target.closest("[data-wish-del]");
    if (delWishBtn) {
      const res = await api.mutatePlanWish(planId, {
        action: "delete",
        wishId: delWishBtn.getAttribute("data-wish-del")
      });
      applyBootstrapData(res);
      return;
    }

    const linkedBtn = e.target.closest("[data-open-linked]");
    if (linkedBtn) {
      const entryId = linkedBtn.getAttribute("data-open-linked");
      if (state.entries.some((ent) => ent.id === entryId)) {
        openDetailModal(entryId);
      } else {
        showToast("对应的游记好像已经被删掉啦");
      }
      return;
    }

    const convertBtn = e.target.closest("[data-convert-wish]");
    if (convertBtn) {
      const wishId = convertBtn.getAttribute("data-convert-wish");
      const wish = (plan.wishes || []).find((w) => w.id === wishId);
      if (wish) {
        openEntryModal({
          category: wish.type === "spot" ? "spot" : "food",
          place: plan.destination,
          title: wish.title,
          fromPlanId: plan.id,
          fromWishId: wish.id
        });
      }
    }
  });

  $("plans-list-wrap")?.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-add-wish-type]");
    if (!form) return;
    e.preventDefault();
    const cardEl = form.closest("[data-plan-id]");
    if (!cardEl) return;
    const planId = cardEl.getAttribute("data-plan-id");
    const type = form.getAttribute("data-add-wish-type");
    const title = form.elements.wishTitle.value;
    try {
      const res = await api.mutatePlanWish(planId, {
        action: "add",
        type,
        title
      });
      applyBootstrapData(res);
    } catch (err) {
      showToast(err.message);
    }
  });

  // ================= 设置、备份与退出 =================
  $("settings-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({
        journalTitle: $("set-journal-title").value,
        partnerA: $("set-partner-a").value,
        partnerB: $("set-partner-b").value,
        togetherSince: $("set-together-date").value,
        foodTags: splitTagsInput($("set-food-tags").value),
        spotTags: splitTagsInput($("set-spot-tags").value)
      });
      state.profile = res.profile;
      $("settings-modal").classList.add("hidden");
      renderEverything();
      showToast("⚙️ 小窝设置已更新！");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("export-backup-btn")?.addEventListener("click", async () => {
    try {
      showToast("📦 正在打包全部游记与照片...");
      const res = await api.exportBackup();
      const blob = new Blob([JSON.stringify(res.backup, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ameibao-travel-backup-${todayIso()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("✅ 完整备份已下载！");
    } catch (err) {
      showToast(err.message);
    }
  });

  $("import-backup-input")?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!window.confirm("恢复备份会用备份文件中的内容替换当前数据，确定继续吗？")) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const res = await api.importBackup(parsed);
      $("settings-modal").classList.add("hidden");
      applyBootstrapData(res);
      showToast("🎉 备份数据与照片已完整恢复！");
    } catch (err) {
      showToast(err.message || "备份文件解析失败");
    }
  });

  $("logout-btn")?.addEventListener("click", async () => {
    await api.logout();
    $("settings-modal").classList.add("hidden");
    $("app-shell").classList.add("hidden");
    $("lock-screen").classList.remove("hidden");
  });

  // ================= 灯箱控制 =================
  $("lightbox-close-btn")?.addEventListener("click", () => {
    $("photo-lightbox").classList.add("hidden");
  });
  $("photo-lightbox")?.addEventListener("click", (e) => {
    if (e.target.id === "photo-lightbox") {
      $("photo-lightbox").classList.add("hidden");
    }
  });
  $("lightbox-prev-btn")?.addEventListener("click", () => {
    state.lightboxIndex =
      (state.lightboxIndex - 1 + state.lightboxItems.length) % state.lightboxItems.length;
    updateLightboxSlide();
  });
  $("lightbox-next-btn")?.addEventListener("click", () => {
    state.lightboxIndex = (state.lightboxIndex + 1) % state.lightboxItems.length;
    updateLightboxSlide();
  });
  document.addEventListener("keydown", (e) => {
    const lb = $("photo-lightbox");
    if (!lb || lb.classList.contains("hidden")) return;
    if (e.key === "Escape") lb.classList.add("hidden");
    if (e.key === "ArrowLeft") $("lightbox-prev-btn")?.click();
    if (e.key === "ArrowRight") $("lightbox-next-btn")?.click();
  });
}

async function enterApp() {
  const data = await api.bootstrap();
  $("lock-screen").classList.add("hidden");
  $("app-shell").classList.remove("hidden");
  renderHeaderSealPose("peek");
  applyBootstrapData(data);
}

async function init() {
  renderAmeibao($("lock-ameibao"), { mood: "journal", size: 136 });
  if ($("pat-mini-seal-icon")) $("pat-mini-seal-icon").innerHTML = getMiniSealSvg(16);
  if ($("default-seal-mood-btn")) $("default-seal-mood-btn").innerHTML = getMiniSealSvg(20);
  bindEvents();

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }

  try {
    const status = await api.authStatus();
    if (status.authenticated) {
      await enterApp();
    } else {
      $("lock-screen").classList.remove("hidden");
    }
  } catch {
    $("lock-screen").classList.remove("hidden");
  }
}

init();
