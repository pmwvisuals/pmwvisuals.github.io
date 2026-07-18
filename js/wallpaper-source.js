import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const CACHE_TTL_MS = 2 * 60 * 1000;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeAccess(value) {
  return normalizeText(value).toLowerCase() === "premium" ? "premium" : "free";
}

function cleanList(values) {
  const seen = new Set();
  return values
    .flatMap((value) => Array.isArray(value) ? value : [value])
    .flatMap((value) => String(value || "").split(/[\s,]+/))
    .map((value) => value.replace(/^#+/, "").trim())
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cleanTypes(item) {
  const values = [];
  if (Array.isArray(item.types)) values.push(...item.types);
  if (Array.isArray(item.categories)) values.push(...item.categories);
  if (item.category) values.push(item.category);

  const seen = new Set();
  return values
    .map(normalizeText)
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function cloudinaryTransformUrl(url, transformation) {
  const value = normalizeText(url);
  if (!value.includes("res.cloudinary.com") || !value.includes("/image/upload/")) return value;

  try {
    const parsed = new URL(value);
    const marker = "/image/upload/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return value;

    const beforeUpload = parsed.pathname.slice(0, markerIndex + marker.length);
    const afterUpload = parsed.pathname.slice(markerIndex + marker.length);
    const parts = afterUpload.split("/").filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));

    if (versionIndex >= 0) {
      const publicPath = parts.slice(versionIndex).join("/");
      parsed.pathname = `${beforeUpload}${transformation}/${publicPath}`;
      return parsed.href;
    }

    parsed.pathname = `${beforeUpload}${transformation}/${afterUpload}`;
    return parsed.href;
  } catch (error) {
    return value;
  }
}

function buildResolution(item) {
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  return item.resolution || (width && height ? `${width}x${height}` : "Mobile");
}

function normalizeWallpaper(id, item, source) {
  const imageUrl = normalizeText(item.imageUrl || item.preview || item.download || item.thumbnail);
  const types = cleanTypes(item);
  const access = normalizeAccess(item.access || (item.premium || item.isPremium ? "premium" : "free"));
  const tags = cleanList([item.hashtags || [], item.tags || []]).map((tag) => tag.toLowerCase());

  return {
    id: normalizeText(id || item.id),
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    imageUrl,
    cloudinaryPublicId: normalizeText(item.cloudinaryPublicId || item.public_id || item.publicId),
    types,
    category: types[0] || normalizeText(item.category) || "Wallpapers",
    tags,
    access,
    visible: item.visible !== false,
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    resolution: buildResolution(item),
    format: normalizeText(item.format).toUpperCase() || "Image",
    thumbnail: normalizeText(item.thumbnail) || cloudinaryTransformUrl(imageUrl, "c_fill,g_auto,w_420,h_746,q_auto,f_auto"),
    preview: normalizeText(item.preview) || cloudinaryTransformUrl(imageUrl, "q_auto,f_auto"),
    download: normalizeText(item.download) || cloudinaryTransformUrl(imageUrl, "fl_attachment"),
    source
  };
}

function staticFallbackWallpapers(fallback, access) {
  return (Array.isArray(fallback) ? fallback : [])
    .map((item) => normalizeWallpaper(item.id, item, "static"))
    .filter((item) => item.visible && item.access === access);
}

function cacheKey(access) {
  return `pmw:wallpapers:${access}:v1`;
}

function readCache(access) {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(access)) || "null");
    if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return Array.isArray(cached.items) ? cached.items : null;
  } catch (error) {
    return null;
  }
}

function writeCache(access, items) {
  try {
    sessionStorage.setItem(cacheKey(access), JSON.stringify({
      savedAt: Date.now(),
      items
    }));
  } catch (error) {
    // Cache is only an optimization. Ignore quota or privacy-mode failures.
  }
}

async function fetchFirestoreWallpapers(access) {
  const cached = readCache(access);
  if (cached) return cached;

  const snapshot = await getDocs(query(
    collection(db, "wallpapers"),
    where("visible", "==", true),
    where("access", "==", access)
  ));

  const items = snapshot.docs
    .map((docSnap) => normalizeWallpaper(docSnap.id, docSnap.data() || {}, "firestore"))
    .filter((item) => item.visible && item.access === access);

  writeCache(access, items);
  return items;
}

export async function loadVisibleWallpapers({ access = "free", fallback = [], allowFallback = true } = {}) {
  const normalizedAccess = normalizeAccess(access);
  const fallbackItems = staticFallbackWallpapers(fallback, normalizedAccess);

  try {
    const firestoreItems = await fetchFirestoreWallpapers(normalizedAccess);
    if (firestoreItems.length || !allowFallback) {
      return {
        items: firestoreItems,
        source: "firestore",
        error: null
      };
    }
  } catch (error) {
    if (!allowFallback) throw error;
    return {
      items: fallbackItems,
      source: "static",
      error
    };
  }

  return {
    items: fallbackItems,
    source: "static",
    error: null
  };
}

export function normalizeStaticWallpapers({ access = "free", fallback = [] } = {}) {
  return staticFallbackWallpapers(fallback, normalizeAccess(access));
}
