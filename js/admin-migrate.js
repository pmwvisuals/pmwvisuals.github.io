import { auth, db } from "./firebase.js";
import { requireAdmin } from "./admin-auth.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const loadingPanel = document.querySelector("#adminLoadingPanel");
const deniedPanel = document.querySelector("#adminDeniedPanel");
const migrationPanel = document.querySelector("#migrationPanel");
const adminEmail = document.querySelector("#adminEmail");
const logoutButton = document.querySelector("#adminLogoutButton");
const deniedLogoutButton = document.querySelector("#adminDeniedLogoutButton");
const dryRunButton = document.querySelector("#dryRunButton");
const runMigrationButton = document.querySelector("#runMigrationButton");
const downloadLogButton = document.querySelector("#downloadLogButton");
const confirmRealMigration = document.querySelector("#confirmRealMigration");
const migrationMessage = document.querySelector("#migrationMessage");
const migrationSummary = document.querySelector("#migrationSummary");
const migrationLog = document.querySelector("#migrationLog");
const summarySource = document.querySelector("#summarySource");
const summaryReady = document.querySelector("#summaryReady");
const summaryImported = document.querySelector("#summaryImported");
const summarySkipped = document.querySelector("#summarySkipped");
const summaryInvalid = document.querySelector("#summaryInvalid");
const summaryFailed = document.querySelector("#summaryFailed");

let dryRunCompleted = false;
let migrationRunning = false;
let lastReport = null;

function showPanel(panel) {
  [loadingPanel, deniedPanel, migrationPanel].forEach((item) => {
    item.hidden = item !== panel;
  });
}

async function logout() {
  await signOut(auth);
  window.location.replace("admin-login.html");
}

function setMessage(text, type = "") {
  migrationMessage.textContent = text;
  migrationMessage.className = type ? `admin-message ${type}` : "admin-message";
}

function setRunningState(isRunning) {
  migrationRunning = isRunning;
  dryRunButton.disabled = isRunning;
  confirmRealMigration.disabled = isRunning;
  downloadLogButton.disabled = isRunning || !lastReport;
  updateRunButton();
}

function updateRunButton() {
  runMigrationButton.disabled = migrationRunning || !dryRunCompleted || !confirmRealMigration.checked;
}

function sourceWallpapers() {
  return Array.isArray(window.PMW_WALLPAPERS) ? window.PMW_WALLPAPERS : [];
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function cleanArray(values) {
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
    .map((value) => normalizeText(value))
    .filter(Boolean)
    .filter((value) => {
      const key = value.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeAccess(item) {
  const values = [
    item.access,
    item.status,
    item.tier,
    item.plan
  ].map((value) => normalizeKey(value));

  if (item.premium === true || item.isPremium === true || item.paid === true) return "premium";
  if (values.some((value) => ["premium", "pro", "paid"].includes(value))) return "premium";
  return "free";
}

function normalizeVisible(item) {
  const visibility = normalizeKey(item.visibility || item.status);
  if (item.visible === false || item.isVisible === false || item.hidden === true) return false;
  if (["hidden", "draft", "inactive", "archived"].includes(visibility)) return false;
  return true;
}

function isCloudinaryUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
  } catch (error) {
    return false;
  }
}

function exactUrl(value) {
  try {
    return new URL(normalizeText(value)).href;
  } catch (error) {
    return normalizeText(value);
  }
}

function extractCloudinaryPublicId(value) {
  try {
    const url = new URL(value);
    const marker = "/image/upload/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return "";

    const afterUpload = url.pathname.slice(markerIndex + marker.length);
    const parts = afterUpload.split("/").filter(Boolean);
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    const publicParts = versionIndex >= 0 ? parts.slice(versionIndex + 1) : parts.slice(-1);
    if (!publicParts.length) return "";

    const publicPath = publicParts.join("/");
    return decodeURIComponent(publicPath).replace(/\.[a-z0-9]+$/i, "");
  } catch (error) {
    return "";
  }
}

function validDocId(value) {
  const id = normalizeText(value);
  return Boolean(id)
    && id.length <= 1500
    && !id.includes("/")
    && id !== "."
    && id !== ".."
    && !/^__.*__$/.test(id);
}

function buildPayload(item) {
  const imageUrl = normalizeText(item.imageUrl || item.preview || item.download || item.thumbnail);
  const publicId = normalizeText(item.cloudinaryPublicId || item.public_id || item.publicId || extractCloudinaryPublicId(imageUrl));

  return {
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    imageUrl,
    cloudinaryPublicId: publicId,
    types: cleanTypes(item),
    hashtags: cleanArray([item.hashtags || [], item.tags || []]).map((tag) => tag.toLowerCase()),
    access: normalizeAccess(item),
    visible: normalizeVisible(item),
    width: Number(item.width) || 0,
    height: Number(item.height) || 0,
    format: normalizeText(item.format).toUpperCase(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };
}

function validateEntry(docId, payload) {
  if (!validDocId(docId)) return "Missing or invalid wallpaper ID for Firestore document ID.";
  if (!payload.title) return "Title is required.";
  if (!payload.imageUrl) return "Image URL is required.";
  if (!isCloudinaryUrl(payload.imageUrl)) return "Image URL must be a secure Cloudinary URL.";
  if (!payload.types.length) return "At least one image type is required.";
  if (!["free", "premium"].includes(payload.access)) return "Access must be free or premium.";
  return "";
}

async function getExistingKeys() {
  const snapshot = await getDocs(collection(db, "wallpapers"));
  const keys = {
    ids: new Set(),
    publicIds: new Set(),
    imageUrls: new Set()
  };

  snapshot.forEach((docSnap) => {
    const data = docSnap.data() || {};
    keys.ids.add(docSnap.id);
    if (data.cloudinaryPublicId) keys.publicIds.add(normalizeKey(data.cloudinaryPublicId));
    if (data.imageUrl) keys.imageUrls.add(exactUrl(data.imageUrl));
  });

  return keys;
}

function duplicateReason(entry, keys) {
  if (keys.ids.has(entry.docId)) return "Existing wallpaper ID";
  if (entry.publicIdKey && keys.publicIds.has(entry.publicIdKey)) return "Cloudinary public ID";
  if (entry.imageUrlKey && keys.imageUrls.has(entry.imageUrlKey)) return "Exact image URL";
  return "";
}

function addPlannedKeys(entry, keys) {
  keys.ids.add(entry.docId);
  if (entry.publicIdKey) keys.publicIds.add(entry.publicIdKey);
  if (entry.imageUrlKey) keys.imageUrls.add(entry.imageUrlKey);
}

function createReport(mode, existingKeys) {
  const report = {
    mode,
    generatedAt: new Date().toISOString(),
    sourceCount: sourceWallpapers().length,
    ready: [],
    successful: [],
    skippedDuplicates: [],
    invalid: [],
    failed: []
  };

  sourceWallpapers().forEach((item, index) => {
    const docId = normalizeText(item.id);
    const payload = buildPayload(item);
    const entry = {
      index,
      docId,
      title: payload.title,
      imageUrl: payload.imageUrl,
      cloudinaryPublicId: payload.cloudinaryPublicId,
      access: payload.access,
      visible: payload.visible,
      types: payload.types,
      payload,
      publicIdKey: normalizeKey(payload.cloudinaryPublicId),
      imageUrlKey: exactUrl(payload.imageUrl)
    };

    const invalidReason = validateEntry(docId, payload);
    if (invalidReason) {
      report.invalid.push({ ...entry, reason: invalidReason });
      return;
    }

    const reason = duplicateReason(entry, existingKeys);
    if (reason) {
      report.skippedDuplicates.push({ ...entry, reason });
      return;
    }

    addPlannedKeys(entry, existingKeys);
    report.ready.push(entry);
  });

  return report;
}

async function commitReadyEntries(report) {
  const chunkSize = 450;

  for (let index = 0; index < report.ready.length; index += chunkSize) {
    const chunk = report.ready.slice(index, index + chunkSize);
    const batch = writeBatch(db);

    chunk.forEach((entry) => {
      batch.set(doc(db, "wallpapers", entry.docId), entry.payload);
    });

    try {
      await batch.commit();
      report.successful.push(...chunk.map((entry) => ({
        index: entry.index,
        docId: entry.docId,
        title: entry.title,
        imageUrl: entry.imageUrl,
        cloudinaryPublicId: entry.cloudinaryPublicId
      })));
    } catch (error) {
      report.failed.push(...chunk.map((entry) => ({
        index: entry.index,
        docId: entry.docId,
        title: entry.title,
        imageUrl: entry.imageUrl,
        cloudinaryPublicId: entry.cloudinaryPublicId,
        reason: error.message.replace("Firebase: ", "")
      })));
    }
  }
}

function renderSummary(report) {
  summarySource.textContent = String(report.sourceCount);
  summaryReady.textContent = String(report.ready.length);
  summaryImported.textContent = String(report.successful.length);
  summarySkipped.textContent = String(report.skippedDuplicates.length);
  summaryInvalid.textContent = String(report.invalid.length);
  summaryFailed.textContent = String(report.failed.length);
  migrationSummary.hidden = false;
}

function createLogSection(title, items, type) {
  const section = document.createElement("section");
  section.className = "admin-log-section";

  const heading = document.createElement("h3");
  heading.textContent = `${title} (${items.length})`;
  section.append(heading);

  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "admin-wallpaper-meta";
    empty.textContent = "None.";
    section.append(empty);
    return section;
  }

  items.slice(0, 80).forEach((item) => {
    const row = document.createElement("div");
    row.className = `admin-log-row is-${type}`;

    const titleEl = document.createElement("strong");
    titleEl.textContent = item.title || item.docId || `Source record ${item.index + 1}`;

    const meta = document.createElement("span");
    meta.textContent = [
      item.docId ? `Doc: ${item.docId}` : "",
      item.cloudinaryPublicId ? `Public ID: ${item.cloudinaryPublicId}` : "",
      item.reason ? `Reason: ${item.reason}` : ""
    ].filter(Boolean).join(" | ");

    row.append(titleEl, meta);
    section.append(row);
  });

  if (items.length > 80) {
    const more = document.createElement("p");
    more.className = "admin-wallpaper-meta";
    more.textContent = `Showing first 80 records. Download the log for the full list.`;
    section.append(more);
  }

  return section;
}

function renderLog(report) {
  migrationLog.replaceChildren(
    createLogSection(report.mode === "dry-run" ? "Ready to import" : "Successful records", report.mode === "dry-run" ? report.ready : report.successful, "success"),
    createLogSection("Skipped duplicates", report.skippedDuplicates, "skip"),
    createLogSection("Invalid records", report.invalid, "invalid"),
    createLogSection("Failed records", report.failed, "failed")
  );
}

function cleanReportItems(items) {
  return items.map(({ payload, publicIdKey, imageUrlKey, ...item }) => item);
}

function storeReport(report) {
  lastReport = {
    mode: report.mode,
    generatedAt: report.generatedAt,
    sourceCount: report.sourceCount,
    ready: cleanReportItems(report.ready),
    successful: cleanReportItems(report.successful),
    skippedDuplicates: cleanReportItems(report.skippedDuplicates),
    invalid: cleanReportItems(report.invalid),
    failed: cleanReportItems(report.failed)
  };
  downloadLogButton.disabled = false;
}

async function runMigration({ dryRun }) {
  setRunningState(true);
  setMessage(dryRun ? "Checking existing Firestore records for dry run..." : "Importing non-duplicate records to Firestore...");

  try {
    const existingKeys = await getExistingKeys();
    const report = createReport(dryRun ? "dry-run" : "write", existingKeys);

    if (!dryRun) await commitReadyEntries(report);

    renderSummary(report);
    renderLog(report);
    storeReport(report);

    if (dryRun) {
      dryRunCompleted = true;
      setMessage(`Dry run complete. ${report.ready.length} records are ready, ${report.skippedDuplicates.length} duplicates were skipped, and ${report.invalid.length} records are invalid.`, "success");
    } else {
      confirmRealMigration.checked = false;
      dryRunCompleted = false;
      setMessage(`Migration complete. Imported ${report.successful.length}, skipped ${report.skippedDuplicates.length}, invalid ${report.invalid.length}, failed ${report.failed.length}.`, report.failed.length ? "error" : "success");
    }
  } catch (error) {
    console.error("Migration failed.", error);
    setMessage(error.message.replace("Firebase: ", ""), "error");
  } finally {
    setRunningState(false);
  }
}

function downloadReport() {
  if (!lastReport) return;

  const blob = new Blob([JSON.stringify(lastReport, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = `pmw-wallpaper-migration-${lastReport.mode}-${lastReport.generatedAt.slice(0, 10)}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}

requireAdmin({
  onAllowed(user) {
    adminEmail.textContent = user.email || user.uid;
    showPanel(migrationPanel);
    const count = sourceWallpapers().length;
    setMessage(count ? `${count} source wallpaper records loaded. Run a dry run first.` : "No source wallpapers were found in wallpapers-data.js.", count ? "" : "error");
  },
  onDenied(user) {
    adminEmail.textContent = user.email || user.uid;
    showPanel(deniedPanel);
  }
});

logoutButton.addEventListener("click", logout);
deniedLogoutButton.addEventListener("click", logout);
dryRunButton.addEventListener("click", () => runMigration({ dryRun: true }));
runMigrationButton.addEventListener("click", () => runMigration({ dryRun: false }));
downloadLogButton.addEventListener("click", downloadReport);
confirmRealMigration.addEventListener("change", updateRunButton);
updateRunButton();
