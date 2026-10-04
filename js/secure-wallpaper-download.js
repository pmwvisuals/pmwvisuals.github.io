async function getVisibleWallpaper(id) {
  if (!id || String(id).includes("/")) throw new Error("Invalid wallpaper ID");
  const [{ db }, { doc, getDoc }] = await Promise.all([
    import("./firebase.js"),
    import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
  ]);
  const snapshot = await getDoc(doc(db, "wallpapers", String(id)));
  if (!snapshot.exists() || snapshot.data().visible !== true) {
    throw new Error("This wallpaper is unavailable");
  }
  return { id: snapshot.id, ...snapshot.data() };
}

export async function requestWallpaperMetadata(id) {
  const item = await getVisibleWallpaper(id);
  return {
    id: item.id,
    access: item.access === "premium" ? "premium" : "free",
    preview: item.previewUrl || item.imageUrl || ""
  };
}

export async function requestWallpaperDownload(id) {
  const item = await getVisibleWallpaper(id);
  let url = item.imageUrl || item.previewUrl;
  if (!url || !/^https:\/\//i.test(url)) {
    throw new Error("This wallpaper has no download link yet");
  }
  const marker = "/image/upload/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex >= 0 && !url.includes("/fl_attachment")) {
    url = `${url.slice(0, markerIndex + marker.length)}fl_attachment:pmw-wallpaper/${url.slice(markerIndex + marker.length)}`;
  }
  return url;
}

export function navigateForDownloadError(error) {
  void error;
  return false;
}
