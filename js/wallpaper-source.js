const CACHE_TTL_MS = 10 * 60 * 1000;

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeAccess(value) {
  return normalizeText(value).toLowerCase() === "premium" ? "premium" : "free";
}

function normalizeDisplayUrl(value) {
  const source = normalizeText(value);
  if (!source) return "";

  try {
    const url = new URL(source);
    if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
      const id = normalizeText(url.searchParams.get("id"));
      const size = normalizeText(url.searchParams.get("sz"));
      if (id) {
        const safeSize = /^w\d+$/i.test(size) ? size.toLowerCase() : "w1600";
        return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=${safeSize}`;
      }
    }
  } catch (error) {
    return source;
  }

  return source;
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

function buildResolution(item) {
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  return item.resolution || (width && height ? `${width}x${height}` : "Mobile");
}

function cloudinaryVariant(url, transformation) {
  const marker = "/image/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return url;
  const prefix = url.slice(0, markerIndex + marker.length);
  const suffix = url.slice(markerIndex + marker.length)
    .replace(/^(?:[a-z][a-z0-9_:-]*(?:,[a-z0-9_:.()-]+)*\/)+(?=v\d+\/)/i, "");
  return `${prefix}${transformation}/${suffix}`;
}

function directDownloadUrl(url) {
  const marker = "/image/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0 || url.includes("/fl_attachment")) return url;
  return `${url.slice(0, markerIndex + marker.length)}fl_attachment:pmw-wallpaper/${url.slice(markerIndex + marker.length)}`;
}

function normalizeWallpaper(id, item, source) {
  const imageUrl = normalizeText(item.imageUrl || item.download || item.image || item.previewUrl || item.preview || item.thumbnail);
  const previewUrl = normalizeDisplayUrl(item.previewUrl || item.preview || imageUrl);
  const types = cleanTypes(item);
  const access = normalizeAccess(item.access || (item.premium || item.isPremium ? "premium" : "free"));
  const tags = cleanList([item.hashtags || [], item.tags || []]).map((tag) => tag.toLowerCase());
  const deviceTypes = cleanList([item.deviceTypes || [], item.deviceType || "", item.device || ""]).map((type) => type.toLowerCase());

  return {
    id: normalizeText(id || item.id),
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    imageUrl,
    cloudinaryPublicId: normalizeText(item.cloudinaryPublicId || item.public_id || item.publicId),
    types,
    category: types[0] || normalizeText(item.category) || "Wallpapers",
    tags,
    deviceTypes,
    access,
    visible: item.visible !== false,
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    resolution: buildResolution(item),
    format: normalizeText(item.format).toUpperCase() || "Image",
    thumbnail: source === "firestore"
      ? cloudinaryVariant(previewUrl, "c_limit,w_640,q_68,f_auto")
      : normalizeDisplayUrl(item.thumbnail || item.preview || imageUrl),
    preview: source === "firestore"
      ? cloudinaryVariant(previewUrl, "c_limit,w_1400,q_76,f_auto")
      : normalizeDisplayUrl(item.preview || item.thumbnail || imageUrl),
    download: normalizeText(item.download) || directDownloadUrl(imageUrl),
    source
  };
}

function staticFallbackWallpapers(fallback, access) {
  return (Array.isArray(fallback) ? fallback : [])
    .map((item) => normalizeWallpaper(item.id, item, "static"))
    .filter((item) => item.visible && item.access === access);
}

function cacheKey(access) {
  return `pmw:wallpapers:${access}:spark-v1`;
}

function readCache(access) {
  if (CACHE_TTL_MS <= 0) return null;
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(access)) || "null");
    if (!cached || Date.now() - cached.savedAt > CACHE_TTL_MS) return null;
    return Array.isArray(cached.items) ? cached.items : null;
  } catch (error) {
    return null;
  }
}

function writeCache(access, items) {
  if (CACHE_TTL_MS <= 0) return;
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

  const [{ db }, { collection, getDocs, query, where }] = await Promise.all([
    import("./firebase.js"),
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
  ]);
  const snapshot = await getDocs(query(collection(db, "wallpapers"), where("visible", "==", true)));
  const items = snapshot.docs
    .map((document) => normalizeWallpaper(document.id, document.data(), "firestore"))
    .filter((item) => item.visible && item.access === access);

  writeCache(access, items);
  return items;
}

export async function loadVisibleWallpapers({ access = "free", fallback = [], allowFallback = true } = {}) {
  const normalizedAccess = normalizeAccess(access);
  const fallbackItems = staticFallbackWallpapers(fallback, normalizedAccess);

  if (normalizedAccess === "free" && fallbackItems.length) {
    return {
      items: fallbackItems,
      source: "static",
      error: null
    };
  }

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
