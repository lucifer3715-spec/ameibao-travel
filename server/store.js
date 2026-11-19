import fs from "node:fs/promises";
import path from "node:path";

function makeId(prefix) {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${prefix}_${ts}_${rand}`;
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function readJsonSafe(filePath, fallback = null) {
  try {
    const text = await fs.readFile(filePath, "utf-8");
    return JSON.parse(text);
  } catch (err) {
    if (err.code === "ENOENT") return fallback;
    throw err;
  }
}

async function writeJsonAtomic(filePath, obj) {
  await ensureDir(path.dirname(filePath));
  const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  const payload = JSON.stringify(obj, null, 2);
  await fs.writeFile(tmpPath, payload, "utf-8");
  try {
    await fs.rename(tmpPath, filePath);
  } catch {
    await fs.writeFile(filePath, payload, "utf-8");
    await unlinkSafe(tmpPath);
  }
}

async function unlinkSafe(filePath) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
  }
}

function cleanText(val, maxLen = 4000) {
  return String(val ?? "").trim().slice(0, maxLen);
}

function cleanTags(tags) {
  if (!Array.isArray(tags)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of tags) {
    const t = cleanText(raw, 24);
    if (!t || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
    if (out.length >= 12) break;
  }
  return out;
}

function defaultProfile() {
  return {
    journalTitle: "阿咩豹的旅行手账",
    subtitle: "豆豆眉小海豹帮我们把沿途的好吃的与风景都收进肚皮口袋里",
    partnerA: "我",
    partnerB: "女朋友",
    togetherSince: "",
    petCount: 6,
    pinnedPlaces: [],
    foodTags: ["当地必吃", "海鲜大餐", "街边小吃", "甜品咖啡", "夜宵烧烤", "暖心早餐"],
    spotTags: ["看海吹风", "绝美日落", "古街慢逛", "山野公园", "出片机位", "展馆人文"]
  };
}

function normalizeProfile(raw) {
  const def = defaultProfile();
  if (!raw || typeof raw !== "object") return def;
  return {
    journalTitle: cleanText(raw.journalTitle, 40) || def.journalTitle,
    subtitle: cleanText(raw.subtitle, 100) || def.subtitle,
    partnerA: cleanText(raw.partnerA, 20) || def.partnerA,
    partnerB: cleanText(raw.partnerB, 20) || def.partnerB,
    togetherSince: cleanText(raw.togetherSince, 20),
    petCount: Math.max(0, Number(raw.petCount) || 0),
    pinnedPlaces: cleanTags(raw.pinnedPlaces),
    foodTags: Array.isArray(raw.foodTags) && raw.foodTags.length > 0 ? cleanTags(raw.foodTags) : def.foodTags,
    spotTags: Array.isArray(raw.spotTags) && raw.spotTags.length > 0 ? cleanTags(raw.spotTags) : def.spotTags
  };
}

function buildSampleSvgFood() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#FFF3DF"/>
        <stop offset="100%" stop-color="#FCE0C2"/>
      </linearGradient>
    </defs>
    <rect width="960" height="720" fill="url(#bg)"/>
    <circle cx="800" cy="130" r="95" fill="#FFD59E" opacity="0.55"/>
    <circle cx="150" cy="590" r="130" fill="#F8C9A0" opacity="0.45"/>
    <ellipse cx="480" cy="500" rx="285" ry="72" fill="#E6B98E" opacity="0.45"/>
    <path d="M230 390 C245 525, 355 565, 480 565 C605 565, 715 525, 730 390 Z" fill="#6E4F3A" stroke="#4B3425" stroke-width="10"/>
    <ellipse cx="480" cy="390" rx="250" ry="78" fill="#FFF9EE" stroke="#4B3425" stroke-width="10"/>
    <ellipse cx="480" cy="392" rx="224" ry="62" fill="#F8C471"/>
    <circle cx="400" cy="382" r="36" fill="#FF8A65"/>
    <circle cx="545" cy="375" r="34" fill="#FF8A65"/>
    <ellipse cx="475" cy="415" rx="44" ry="26" fill="#FFFDF9"/>
    <circle cx="475" cy="413" r="14" fill="#FFB300"/>
    <circle cx="350" cy="415" r="11" fill="#66BB6A"/>
    <circle cx="595" cy="412" r="11" fill="#66BB6A"/>
    <circle cx="508" cy="364" r="9" fill="#66BB6A"/>
    <path d="M390 270 Q375 235 395 200 M480 255 Q465 215 488 178 M568 272 Q553 236 574 202" stroke="#FFFFFF" stroke-width="9" stroke-linecap="round" fill="none" opacity="0.85"/>
    <text x="480" y="646" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="#6D4C38">阿咩豹示例手账 · 热乎乎的海鲜砂锅粥</text>
  </svg>`;
}

function buildSampleSvgSpot() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720" viewBox="0 0 960 720">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#6DA8D6"/>
        <stop offset="56%" stop-color="#FCE1C4"/>
        <stop offset="100%" stop-color="#F7B787"/>
      </linearGradient>
      <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#4A89B8"/>
        <stop offset="100%" stop-color="#2F6690"/>
      </linearGradient>
    </defs>
    <rect width="960" height="440" fill="url(#sky)"/>
    <circle cx="650" cy="310" r="78" fill="#FFE6A3"/>
    <rect y="420" width="960" height="300" fill="url(#sea)"/>
    <path d="M560 445 Q650 438 740 445 M590 475 Q650 470 710 475 M615 505 Q650 502 685 505" stroke="#FFE9B5" stroke-width="7" stroke-linecap="round" fill="none" opacity="0.85"/>
    <path d="M0 510 Q180 430 350 520 L350 720 L0 720 Z" fill="#465C4B"/>
    <rect x="208" y="340" width="38" height="125" rx="6" fill="#FFFDF9" stroke="#453831" stroke-width="6"/>
    <rect x="208" y="375" width="38" height="28" fill="#E57370"/>
    <polygon points="200,340 227,306 254,340" fill="#E57370" stroke="#453831" stroke-width="6" stroke-linejoin="round"/>
    <path d="M0 615 Q260 580 530 635 Q760 680 960 620 L960 720 L0 720 Z" fill="#F4DFC4"/>
    <text x="480" y="680" text-anchor="middle" font-family="sans-serif" font-size="30" font-weight="700" fill="#5A4638">阿咩豹示例手账 · 橘子海日落灯塔</text>
  </svg>`;
}

export function createTravelStore(rootDir) {
  const dbDir = path.resolve(rootDir);
  let writeChain = Promise.resolve();
  let initPromise = null;

  function withWriteLock(fn) {
    const run = writeChain.then(fn, fn);
    writeChain = run.catch(() => {});
    return run;
  }

  function resolveSafe(relPath) {
    const normalized = String(relPath || "").replace(/\\/g, "/").replace(/^\/+/, "");
    const target = path.resolve(dbDir, normalized);
    if (!target.startsWith(dbDir + path.sep) && target !== dbDir) {
      throw new Error("非法文件路径");
    }
    return target;
  }

  function safeExt(ext) {
    const lower = String(ext || "").toLowerCase().replace(/^\./, "");
    if (lower === "png" || lower === "webp" || lower === "gif" || lower === "svg") return lower;
    return "jpg";
  }

  async function ensureInitialized() {
    if (initPromise) return initPromise;
    initPromise = withWriteLock(async () => {
      const metaPath = resolveSafe("data/meta.json");
      const meta = await readJsonSafe(metaPath, null);
      if (meta && meta.initialized) return;

      await ensureDir(resolveSafe("data/images"));
      const now = new Date().toISOString();
      const today = now.slice(0, 10);

      const foodImgRel = "data/images/sample_food_porridge.svg";
      const spotImgRel = "data/images/sample_spot_lighthouse.svg";
      await fs.writeFile(resolveSafe(foodImgRel), buildSampleSvgFood(), "utf-8");
      await fs.writeFile(resolveSafe(spotImgRel), buildSampleSvgSpot(), "utf-8");

      const profile = defaultProfile();
      const entries = [
        {
          id: "ent_sample_food",
          isSample: true,
          category: "food",
          title: "海风老巷鲜虾砂锅粥（示例）",
          place: "威海",
          specificLocation: "环海老街转角第一家",
          visitDate: today,
          rating: 5,
          stamp: "必吃回头客",
          cost: "人均 ¥68",
          tags: ["海鲜大餐", "当地必吃"],
          comment: "吹完海风钻进热气腾腾的小店，虾油熬得金黄鲜甜，配一碟现炸小黄鱼香迷糊了！这是阿咩豹放的示例卡片，你们随时可以一键清空换成自己的真实游记～",
          partnerReviews: {
            partnerA: "鲜虾个头超大，连喝三碗底朝天！",
            partnerB: "锅巴边边最香，下次冬天来还要吃这家～"
          },
          author: "both",
          photos: [
            {
              id: "pho_sample_1",
              path: foodImgRel,
              caption: "刚端上桌还在咕嘟冒泡的砂锅粥"
            }
          ],
          createdAt: now,
          updatedAt: now
        },
        {
          id: "ent_sample_spot",
          isSample: true,
          category: "spot",
          title: "猫头山日落灯塔步道（示例）",
          place: "威海",
          specificLocation: "环海路三号观景台向东 200 米",
          visitDate: today,
          rating: 5,
          stamp: "神仙出片地",
          cost: "门票免费",
          tags: ["看海吹风", "绝美日落", "出片机位"],
          comment: "傍晚五点半光线变成温柔的橘子汽水色，海浪拍在礁石上特别治愈。记得多穿一件防风外套！",
          partnerReviews: {
            partnerA: "随手拍都是电影封面，坡道不陡很好走。",
            partnerB: "和喜欢的人一起看橘子海，海风都是甜的！"
          },
          author: "both",
          photos: [
            {
              id: "pho_sample_2",
              path: spotImgRel,
              caption: "傍晚五点半的橘子海与红白灯塔"
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ];

      const murmurs = [
        {
          id: "mur_sample_welcome",
          isSample: true,
          author: "ameibao",
          mood: "seal",
          place: "阿咩豹的小冰屋",
          text: "咩呜～我是长着豆豆眉和胖嘴筒子的斑海豹幼崽阿咩豹！以后你们吃过的美食、看过的海和山、路上的悄悄话、还有下一站想去的地方，都交给我帮你们收好吧！",
          photo: null,
          pinned: true,
          hearts: 3,
          replies: [
            {
              id: "rep_sample_1",
              author: "partnerB",
              text: "摸摸阿咩豹圆鼓鼓的嘴筒子，以后请多关照啦～",
              createdAt: now
            }
          ],
          createdAt: now
        }
      ];

      const plans = [
        {
          id: "pln_sample_next",
          isSample: true,
          destination: "泉州",
          title: "古城烟火与海边风车三天两夜（示例计划）",
          startDate: "",
          endDate: "",
          budget: "预算 ¥3000",
          status: "planning",
          notes: "第一天逛西街吃小吃，第二天去梧林古村落与洛伽寺看海上寺庙，第三天买伴手礼慢悠悠返程。",
          wishes: [
            {
              id: "wsh_sample_1",
              type: "food",
              title: "水门老字号面线糊配醋肉油条",
              note: "早起去吃热乎的！",
              addedBy: "partnerB",
              done: false,
              linkedEntryId: null
            },
            {
              id: "wsh_sample_2",
              type: "food",
              title: "四果汤加满芋圆和石花膏",
              note: "逛累了解暑神器",
              addedBy: "partnerA",
              done: false,
              linkedEntryId: null
            },
            {
              id: "wsh_sample_3",
              type: "spot",
              title: "黄金海岸洛伽寺看涨潮与日落",
              note: "提前查好潮汐表",
              addedBy: "both",
              done: false,
              linkedEntryId: null
            },
            {
              id: "wsh_sample_4",
              type: "todo",
              title: "充好相机电池 + 带两把晴雨伞",
              note: "",
              addedBy: "partnerA",
              done: true,
              linkedEntryId: null
            }
          ],
          createdAt: now,
          updatedAt: now
        }
      ];

      await Promise.all([
        writeJsonAtomic(resolveSafe("data/profile.json"), profile),
        writeJsonAtomic(resolveSafe("data/entries.json"), entries),
        writeJsonAtomic(resolveSafe("data/murmurs.json"), murmurs),
        writeJsonAtomic(resolveSafe("data/plans.json"), plans),
        writeJsonAtomic(metaPath, { initialized: true, createdAt: now })
      ]);
    });
    return initPromise;
  }

  async function readAllState() {
    await ensureInitialized();
    const [rawProfile, rawEntries, rawMurmurs, rawPlans] = await Promise.all([
      readJsonSafe(resolveSafe("data/profile.json"), null),
      readJsonSafe(resolveSafe("data/entries.json"), []),
      readJsonSafe(resolveSafe("data/murmurs.json"), []),
      readJsonSafe(resolveSafe("data/plans.json"), [])
    ]);
    const profile = normalizeProfile(rawProfile);
    const entries = Array.isArray(rawEntries) ? rawEntries : [];
    const murmurs = Array.isArray(rawMurmurs) ? rawMurmurs : [];
    const plans = Array.isArray(rawPlans) ? rawPlans : [];
    return { profile, entries, murmurs, plans };
  }

  return {
    async getBootstrap() {
      const { profile, entries, murmurs, plans } = await readAllState();
      entries.sort((a, b) => {
        const dA = a.visitDate || "";
        const dB = b.visitDate || "";
        if (dA !== dB) return dB.localeCompare(dA);
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      murmurs.sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        return (b.createdAt || "").localeCompare(a.createdAt || "");
      });
      plans.sort((a, b) => {
        const order = { ongoing: 0, planning: 1, completed: 2 };
        const sA = order[a.status] ?? 1;
        const sB = order[b.status] ?? 1;
        if (sA !== sB) return sA - sB;
        return (b.updatedAt || "").localeCompare(a.updatedAt || "");
      });
      const hasSample =
        entries.some((e) => e.isSample) ||
        murmurs.some((m) => m.isSample) ||
        plans.some((p) => p.isSample);
      return { profile, entries, murmurs, plans, hasSample };
    },

    updateProfile(input) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const current = normalizeProfile(await readJsonSafe(resolveSafe("data/profile.json"), null));
        const updated = normalizeProfile({
          ...current,
          ...input
        });
        await writeJsonAtomic(resolveSafe("data/profile.json"), updated);
        return updated;
      });
    },

    petAmeibao() {
      return withWriteLock(async () => {
        await ensureInitialized();
        const current = normalizeProfile(await readJsonSafe(resolveSafe("data/profile.json"), null));
        current.petCount = (Number(current.petCount) || 0) + 1;
        await writeJsonAtomic(resolveSafe("data/profile.json"), current);
        return current.petCount;
      });
    },

    saveEntry(input) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const entries = (await readJsonSafe(resolveSafe("data/entries.json"), [])) || [];
        const profile = normalizeProfile(await readJsonSafe(resolveSafe("data/profile.json"), null));

        const title = cleanText(input.title, 80);
        if (!title) throw new Error("请填写美食或景点的名字哦～");

        const place = cleanText(input.place, 36) || "未分类地点";
        const category = input.category === "spot" ? "spot" : "food";
        const entryId = cleanText(input.id, 64) || makeId("ent");
        const existingIdx = entries.findIndex((e) => e.id === entryId);
        const existing = existingIdx >= 0 ? entries[existingIdx] : null;

        const incomingPhotos = Array.isArray(input.photos) ? input.photos.slice(0, 9) : [];
        const savedPhotos = [];
        const keptPaths = new Set();

        for (let i = 0; i < incomingPhotos.length; i += 1) {
          const item = incomingPhotos[i];
          if (!item || typeof item !== "object") continue;
          const caption = cleanText(item.caption, 120);
          if (item.base64) {
            const ext = safeExt(item.ext);
            const relPath = `data/images/${entryId}_${Date.now().toString(36)}_${i}.${ext}`;
            const absPath = resolveSafe(relPath);
            await ensureDir(path.dirname(absPath));
            await fs.writeFile(absPath, Buffer.from(String(item.base64), "base64"));
            keptPaths.add(relPath);
            savedPhotos.push({
              id: makeId("pho"),
              path: relPath,
              caption
            });
          } else if (item.path && typeof item.path === "string" && item.path.startsWith("data/images/")) {
            keptPaths.add(item.path);
            savedPhotos.push({
              id: cleanText(item.id, 48) || makeId("pho"),
              path: item.path,
              caption
            });
          }
        }

        if (existing && Array.isArray(existing.photos)) {
          for (const oldPhoto of existing.photos) {
            if (oldPhoto?.path && !keptPaths.has(oldPhoto.path)) {
              const stillUsedElsewhere = entries.some(
                (other) =>
                  other.id !== entryId &&
                  Array.isArray(other.photos) &&
                  other.photos.some((p) => p.path === oldPhoto.path)
              );
              if (!stillUsedElsewhere) {
                await unlinkSafe(resolveSafe(oldPhoto.path));
              }
            }
          }
        }

        const now = new Date().toISOString();
        const ratingNum = Math.min(5, Math.max(1, Math.round(Number(input.rating) || 5)));
        const tags = cleanTags(input.tags);

        const record = {
          id: entryId,
          isSample: false,
          category,
          title,
          place,
          specificLocation: cleanText(input.specificLocation, 120),
          visitDate: cleanText(input.visitDate, 16) || now.slice(0, 10),
          rating: ratingNum,
          stamp: cleanText(input.stamp, 24) || (category === "food" ? "阿咩豹拍肚皮推荐" : "神仙出片地"),
          cost: cleanText(input.cost, 36),
          tags,
          comment: cleanText(input.comment, 5000),
          partnerReviews: {
            partnerA: cleanText(input.partnerReviews?.partnerA, 800),
            partnerB: cleanText(input.partnerReviews?.partnerB, 800)
          },
          author: ["partnerA", "partnerB", "both"].includes(input.author) ? input.author : "both",
          photos: savedPhotos,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };

        if (existingIdx >= 0) {
          entries[existingIdx] = record;
        } else {
          entries.unshift(record);
        }

        // 自动把新用到的标签收进对应模块常用标签库
        const tagBucket = category === "spot" ? "spotTags" : "foodTags";
        const mergedTags = cleanTags([...(profile[tagBucket] || []), ...tags]);
        if (mergedTags.length !== (profile[tagBucket] || []).length) {
          profile[tagBucket] = mergedTags;
          await writeJsonAtomic(resolveSafe("data/profile.json"), profile);
        }

        // 如果是从「下一站旅行计划」打卡转过来的心愿项，自动勾选完成并关联游记
        if (input.fromPlanId && input.fromWishId) {
          const plans = (await readJsonSafe(resolveSafe("data/plans.json"), [])) || [];
          const targetPlan = plans.find((p) => p.id === input.fromPlanId);
          if (targetPlan && Array.isArray(targetPlan.wishes)) {
            const targetWish = targetPlan.wishes.find((w) => w.id === input.fromWishId);
            if (targetWish) {
              targetWish.done = true;
              targetWish.linkedEntryId = record.id;
              targetPlan.updatedAt = now;
              await writeJsonAtomic(resolveSafe("data/plans.json"), plans);
            }
          }
        }

        await writeJsonAtomic(resolveSafe("data/entries.json"), entries);
        return record;
      });
    },

    deleteEntry(entryId) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const entries = (await readJsonSafe(resolveSafe("data/entries.json"), [])) || [];
        const target = entries.find((e) => e.id === entryId);
        if (!target) return false;
        const nextEntries = entries.filter((e) => e.id !== entryId);
        if (Array.isArray(target.photos)) {
          for (const photo of target.photos) {
            if (photo?.path) {
              await unlinkSafe(resolveSafe(photo.path));
            }
          }
        }
        await writeJsonAtomic(resolveSafe("data/entries.json"), nextEntries);
        return true;
      });
    },

    saveMurmur(input) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const murmurs = (await readJsonSafe(resolveSafe("data/murmurs.json"), [])) || [];
        const text = cleanText(input.text, 1500);
        if (!text && !input.photo?.base64) {
          throw new Error("写一句碎碎念或者传一张小照片吧～");
        }
        const murmurId = makeId("mur");
        let photoObj = null;
        if (input.photo && input.photo.base64) {
          const ext = safeExt(input.photo.ext);
          const relPath = `data/images/${murmurId}_${Date.now().toString(36)}.${ext}`;
          const absPath = resolveSafe(relPath);
          await ensureDir(path.dirname(absPath));
          await fs.writeFile(absPath, Buffer.from(String(input.photo.base64), "base64"));
          photoObj = { path: relPath };
        }
        const now = new Date().toISOString();
        const record = {
          id: murmurId,
          isSample: false,
          author: ["partnerA", "partnerB", "ameibao"].includes(input.author)
            ? input.author
            : "partnerA",
          mood: cleanText(input.mood, 8) || "seal",
          place: cleanText(input.place, 40),
          text,
          photo: photoObj,
          pinned: Boolean(input.pinned),
          hearts: 0,
          replies: [],
          createdAt: now
        };
        murmurs.unshift(record);
        await writeJsonAtomic(resolveSafe("data/murmurs.json"), murmurs);
        return record;
      });
    },

    interactMurmur(murmurId, action, payload = {}) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const murmurs = (await readJsonSafe(resolveSafe("data/murmurs.json"), [])) || [];
        const target = murmurs.find((m) => m.id === murmurId);
        if (!target) throw new Error("找不到这条碎碎念");

        if (action === "heart") {
          target.hearts = (Number(target.hearts) || 0) + 1;
        } else if (action === "pin") {
          target.pinned = !target.pinned;
        } else if (action === "reply") {
          const replyText = cleanText(payload.text, 500);
          if (!replyText) throw new Error("回复内容不能为空哦");
          if (!Array.isArray(target.replies)) target.replies = [];
          target.replies.push({
            id: makeId("rep"),
            author: ["partnerA", "partnerB", "ameibao"].includes(payload.author)
              ? payload.author
              : "partnerB",
            text: replyText,
            createdAt: new Date().toISOString()
          });
        } else if (action === "deleteReply") {
          if (Array.isArray(target.replies)) {
            target.replies = target.replies.filter((r) => r.id !== payload.replyId);
          }
        }

        await writeJsonAtomic(resolveSafe("data/murmurs.json"), murmurs);
        return target;
      });
    },

    deleteMurmur(murmurId) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const murmurs = (await readJsonSafe(resolveSafe("data/murmurs.json"), [])) || [];
        const target = murmurs.find((m) => m.id === murmurId);
        if (!target) return false;
        if (target.photo?.path) {
          await unlinkSafe(resolveSafe(target.photo.path));
        }
        await writeJsonAtomic(
          resolveSafe("data/murmurs.json"),
          murmurs.filter((m) => m.id !== murmurId)
        );
        return true;
      });
    },

    savePlan(input) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const plans = (await readJsonSafe(resolveSafe("data/plans.json"), [])) || [];
        const destination = cleanText(input.destination, 40);
        if (!destination) throw new Error("请填写下一站想去的目的地～");

        const planId = cleanText(input.id, 64) || makeId("pln");
        const existingIdx = plans.findIndex((p) => p.id === planId);
        const existing = existingIdx >= 0 ? plans[existingIdx] : null;
        const now = new Date().toISOString();

        const wishes = Array.isArray(input.wishes)
          ? input.wishes
              .map((w) => ({
                id: cleanText(w.id, 48) || makeId("wsh"),
                type: ["food", "spot", "todo"].includes(w.type) ? w.type : "spot",
                title: cleanText(w.title, 100),
                note: cleanText(w.note, 200),
                addedBy: ["partnerA", "partnerB", "both"].includes(w.addedBy) ? w.addedBy : "both",
                done: Boolean(w.done),
                linkedEntryId: w.linkedEntryId ? cleanText(w.linkedEntryId, 64) : null
              }))
              .filter((w) => w.title)
          : existing
            ? existing.wishes || []
            : [];

        const record = {
          id: planId,
          isSample: false,
          destination,
          title: cleanText(input.title, 80) || `${destination}双人小旅行`,
          startDate: cleanText(input.startDate, 16),
          endDate: cleanText(input.endDate, 16),
          budget: cleanText(input.budget, 40),
          status: ["planning", "ongoing", "completed"].includes(input.status)
            ? input.status
            : "planning",
          notes: cleanText(input.notes, 2000),
          wishes,
          createdAt: existing ? existing.createdAt : now,
          updatedAt: now
        };

        if (existingIdx >= 0) {
          plans[existingIdx] = record;
        } else {
          plans.unshift(record);
        }
        await writeJsonAtomic(resolveSafe("data/plans.json"), plans);
        return record;
      });
    },

    mutatePlanWish(planId, action, payload = {}) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const plans = (await readJsonSafe(resolveSafe("data/plans.json"), [])) || [];
        const plan = plans.find((p) => p.id === planId);
        if (!plan) throw new Error("找不到这个旅行计划");
        if (!Array.isArray(plan.wishes)) plan.wishes = [];

        if (action === "add") {
          const title = cleanText(payload.title, 100);
          if (!title) throw new Error("请输入心愿内容～");
          plan.wishes.push({
            id: makeId("wsh"),
            type: ["food", "spot", "todo"].includes(payload.type) ? payload.type : "food",
            title,
            note: cleanText(payload.note, 200),
            addedBy: ["partnerA", "partnerB", "both"].includes(payload.addedBy)
              ? payload.addedBy
              : "both",
            done: false,
            linkedEntryId: null
          });
        } else if (action === "toggle") {
          const wish = plan.wishes.find((w) => w.id === payload.wishId);
          if (wish) wish.done = !wish.done;
        } else if (action === "delete") {
          plan.wishes = plan.wishes.filter((w) => w.id !== payload.wishId);
        } else if (action === "status") {
          if (["planning", "ongoing", "completed"].includes(payload.status)) {
            plan.status = payload.status;
          }
        }

        plan.isSample = false;
        plan.updatedAt = new Date().toISOString();
        await writeJsonAtomic(resolveSafe("data/plans.json"), plans);
        return plan;
      });
    },

    deletePlan(planId) {
      return withWriteLock(async () => {
        await ensureInitialized();
        const plans = (await readJsonSafe(resolveSafe("data/plans.json"), [])) || [];
        const next = plans.filter((p) => p.id !== planId);
        await writeJsonAtomic(resolveSafe("data/plans.json"), next);
        return next.length !== plans.length;
      });
    },

    clearSamples() {
      return withWriteLock(async () => {
        await ensureInitialized();
        const { entries, murmurs, plans } = await readAllState();
        for (const e of entries) {
          if (e.isSample && Array.isArray(e.photos)) {
            for (const p of e.photos) {
              if (p?.path) await unlinkSafe(resolveSafe(p.path));
            }
          }
        }
        for (const m of murmurs) {
          if (m.isSample && m.photo?.path) {
            await unlinkSafe(resolveSafe(m.photo.path));
          }
        }
        await Promise.all([
          writeJsonAtomic(
            resolveSafe("data/entries.json"),
            entries.filter((e) => !e.isSample)
          ),
          writeJsonAtomic(
            resolveSafe("data/murmurs.json"),
            murmurs.filter((m) => !m.isSample)
          ),
          writeJsonAtomic(
            resolveSafe("data/plans.json"),
            plans.filter((p) => !p.isSample)
          )
        ]);
        return true;
      });
    },

    async readImage(relPath) {
      await ensureInitialized();
      if (!relPath || !relPath.startsWith("data/images/")) return null;
      try {
        const absPath = resolveSafe(relPath);
        const buf = await fs.readFile(absPath);
        const ext = path.extname(absPath).toLowerCase();
        const mimeMap = {
          ".png": "image/png",
          ".webp": "image/webp",
          ".gif": "image/gif",
          ".svg": "image/svg+xml",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg"
        };
        return {
          buffer: buf,
          contentType: mimeMap[ext] || "image/jpeg"
        };
      } catch (err) {
        if (err.code === "ENOENT") return null;
        throw err;
      }
    },

    async exportFullBackup() {
      const { profile, entries, murmurs, plans } = await readAllState();
      const imagePaths = new Set();
      for (const e of entries) {
        for (const p of e.photos || []) {
          if (p?.path) imagePaths.add(p.path);
        }
      }
      for (const m of murmurs) {
        if (m.photo?.path) imagePaths.add(m.photo.path);
      }
      const images = {};
      for (const p of imagePaths) {
        try {
          const buf = await fs.readFile(resolveSafe(p));
          images[p] = buf.toString("base64");
        } catch {
          // ignore missing image
        }
      }
      return {
        app: "ameibao-travel-journal",
        version: 1,
        exportedAt: new Date().toISOString(),
        profile,
        entries,
        murmurs,
        plans,
        images
      };
    },

    importFullBackup(backup) {
      return withWriteLock(async () => {
        await ensureInitialized();
        if (!backup || typeof backup !== "object" || !Array.isArray(backup.entries)) {
          throw new Error("备份文件格式不正确哦");
        }
        await ensureDir(resolveSafe("data/images"));
        if (backup.images && typeof backup.images === "object") {
          for (const [relPath, b64] of Object.entries(backup.images)) {
            if (!relPath.startsWith("data/images/") || typeof b64 !== "string") continue;
            const absPath = resolveSafe(relPath);
            await ensureDir(path.dirname(absPath));
            await fs.writeFile(absPath, Buffer.from(b64, "base64"));
          }
        }
        await Promise.all([
          writeJsonAtomic(resolveSafe("data/profile.json"), normalizeProfile(backup.profile)),
          writeJsonAtomic(resolveSafe("data/entries.json"), backup.entries),
          writeJsonAtomic(
            resolveSafe("data/murmurs.json"),
            Array.isArray(backup.murmurs) ? backup.murmurs : []
          ),
          writeJsonAtomic(
            resolveSafe("data/plans.json"),
            Array.isArray(backup.plans) ? backup.plans : []
          )
        ]);
        return true;
      });
    }
  };
}
