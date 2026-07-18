import { auth } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { isPremiumUser } from "./premium-access.js";
import { loadVisibleWallpapers } from "./wallpaper-source.js";

const badge = document.querySelector("#premiumGateBadge");
const title = document.querySelector("#premiumGateTitle");
const text = document.querySelector("#premiumGateText");
const primaryBtn = document.querySelector("#premiumPrimaryBtn");
const premiumWallpaperCount = document.querySelector("#premiumWallpaperCount");
const premiumAccessStat = document.querySelector("#premiumAccessStat");
const premiumWallpaperState = document.querySelector("#premiumWallpaperState");
const premiumWallpapersGrid = document.querySelector("#premiumWallpapersGrid");

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getRandomDownloadName() {
  const randomNumber = Math.floor(10000 + Math.random() * 90000);
  return `PMW_Premium_Wallpapers_${randomNumber}`;
}

function getNamedDownloadUrl(url) {
  return String(url || "").replace("/fl_attachment/", `/fl_attachment:${getRandomDownloadName()}/`);
}

function setState(heading, copy) {
  premiumWallpaperState.hidden = false;
  premiumWallpaperState.querySelector("h3").textContent = heading;
  premiumWallpaperState.querySelector("p").textContent = copy;
}

function getItemTypes(item) {
  return Array.isArray(item.types) && item.types.length ? item.types : [item.category].filter(Boolean);
}

function renderPremiumWallpapers(items) {
  premiumWallpaperCount.textContent = String(items.length);
  premiumWallpapersGrid.hidden = !items.length;

  if (!items.length) {
    setState("No premium wallpapers yet", "Premium wallpaper cards will appear here after you add visible premium assets in Firestore.");
    premiumWallpapersGrid.replaceChildren();
    return;
  }

  premiumWallpaperState.hidden = true;
  premiumWallpapersGrid.innerHTML = items.map((item) => `
    <article class="pmw-premium-card">
      <div class="pmw-premium-thumb">
        <img src="${escapeHtml(item.thumbnail)}" alt="${escapeHtml(item.title)}" loading="lazy">
      </div>
      <div class="pmw-premium-info">
        <h3>${escapeHtml(item.title)}</h3>
        <div class="pmw-premium-tags">
          ${getItemTypes(item).slice(0, 2).map((type) => `<span>${escapeHtml(type)}</span>`).join("")}
          <span>Premium</span>
        </div>
        <button class="pmw-premium-download" data-download-url="${escapeHtml(item.download)}" data-id="${escapeHtml(item.id)}" data-title="${escapeHtml(item.title)}" type="button">Download Wallpaper</button>
      </div>
    </article>
  `).join("");
}

async function loadPremiumWallpapers() {
  setState("Loading premium wallpapers", "Checking Firestore for visible premium wallpaper records.");

  try {
    const result = await loadVisibleWallpapers({
      access: "premium",
      fallback: window.PMW_WALLPAPERS || [],
      allowFallback: true
    });
    renderPremiumWallpapers(result.items);

    if (result.error) {
      console.warn("Firestore premium wallpaper loading failed; static fallback was used.", result.error);
    }
  } catch (error) {
    console.warn("Unable to load premium wallpapers.", error);
    premiumWallpaperCount.textContent = "0";
    premiumWallpapersGrid.hidden = true;
    setState("Unable to load premium wallpapers", "Please refresh the page or try again later.");
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    badge.textContent = "Signed Out";
    title.textContent = "Sign in required";
    text.textContent = "Create an account or sign in before accessing premium wallpapers.";
    primaryBtn.textContent = "Sign In / Up";
    primaryBtn.href = "login.html";
    premiumAccessStat.textContent = "Locked";
    premiumWallpaperCount.textContent = "0";
    setState("Sign in required", "Premium wallpaper cards are shown after sign in and premium access confirmation.");
    premiumWallpapersGrid.hidden = true;
    return;
  }

  const isPremium = await isPremiumUser(user);
  if (isPremium) {
    badge.textContent = "Premium Active";
    title.textContent = "Premium collection ready";
    text.textContent = "You have premium access. Add protected premium wallpapers later and they will appear here.";
    primaryBtn.textContent = "Open Account";
    primaryBtn.href = "account.html";
    premiumAccessStat.textContent = "Active";
    document.body.classList.add("is-premium-member");
    await loadPremiumWallpapers();
    return;
  }

  badge.textContent = "Free Member";
  title.textContent = "Premium access required";
  text.textContent = "Upgrade to premium when checkout is connected to unlock private wallpaper downloads.";
  premiumAccessStat.textContent = "Locked";
  premiumWallpaperCount.textContent = "0";
  setState("Premium access required", "Upgrade to premium before viewing premium wallpaper cards.");
  premiumWallpapersGrid.hidden = true;
});

premiumWallpapersGrid.addEventListener("click", (event) => {
  const button = event.target.closest(".pmw-premium-download");
  if (!button) return;

  if (window.PMW_DOWNLOAD_TRACKING) {
    window.PMW_DOWNLOAD_TRACKING.trackDownload({
      id: button.dataset.id,
      title: button.dataset.title,
      category: "Premium",
      url: location.href,
      type: "premium-wallpaper"
    });
  }

  window.location.href = getNamedDownloadUrl(button.dataset.downloadUrl);
});
