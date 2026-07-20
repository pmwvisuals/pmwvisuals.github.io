(function () {
  "use strict";

  const FREE_RESIZE_LIMIT = 13;
  const PRO_RESIZE_LIMIT = 20;
  const FREE_COMPRESS_LIMIT = 9;
  const PRO_COMPRESS_LIMIT = 50;
  const ADVANCE_COMPRESS_LIMIT = 100;
  const FREE_MAX_FILE_SIZE = 10 * 1024 * 1024;
  const FREE_MAX_WIDTH = 3840;
  const FREE_MAX_HEIGHT = 2160;
  const FREE_MAX_PIXELS = FREE_MAX_WIDTH * FREE_MAX_HEIGHT;
  const BROWSER_MAX_PIXELS = 60_000_000;
  const SUPPORTED_RESIZE_TYPES = ["image/jpeg", "image/png", "image/webp"];
  const SUPPORTED_COMPRESS_TYPES = ["image/jpeg", "image/png", "image/webp"];

  const page = document.body.dataset.tool;
  const input = document.getElementById("toolFileInput");
  const dropzone = document.getElementById("toolDropzone");
  const preview = document.getElementById("toolFilePreview");
  const action = document.getElementById("toolAction");
  const result = document.getElementById("toolResult");
  const resultImage = document.getElementById("toolResultImage");
  const resultMeta = document.getElementById("toolResultMeta");
  const resultDownload = document.getElementById("toolDownload");
  const message = document.getElementById("toolMessage");

  const state = {
    file: null,
    image: null,
    previewUrl: "",
    outputUrl: ""
  };

  const resizerState = {
    items: [],
    outputs: [],
    accountKey: "guest",
    user: null,
    premium: false,
    plan: "free",
    usageCount: 0,
    usageLoaded: false,
    usageBackend: "local",
    firestore: null,
    firestoreDocRef: null
  };

  const compressorState = {
    items: [],
    outputs: [],
    accountKey: "guest",
    user: null,
    premium: false,
    plan: "free",
    usageCount: 0,
    usageLoaded: false,
    usageBackend: "local",
    firestore: null,
    firestoreDocRef: null,
    estimateTimer: null,
    estimateToken: 0
  };

  function drawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function readableSize(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
  }

  function todayKey() {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  }

  function extensionFor(type) {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/webp") return "webp";
    return "png";
  }

  function labelForType(type) {
    if (type === "image/jpeg") return "JPG";
    if (type === "image/webp") return "WEBP";
    if (type === "image/png") return "PNG";
    return (type || "Image").replace("image/", "").toUpperCase();
  }

  function safeBaseName(name) {
    return (name || "pmw-image").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "pmw-image";
  }

  function clearOutput() {
    if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
    state.outputUrl = "";
    result?.classList.remove("visible");
    resultImage?.removeAttribute("src");
    resultDownload?.removeAttribute("href");
    resultDownload?.removeAttribute("download");
    if (resultMeta) resultMeta.innerHTML = "";
  }

  function setMessage(text, tone) {
    if (!message) return;
    message.textContent = text;
    message.dataset.tone = tone || "";
  }

  function loadImage(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("This image type is not supported by your browser."));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Your browser could not create this output format."));
      }, type, quality);
    });
  }

  function createCanvas(width, height) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    return canvas;
  }

  function drawImageToCanvas(image, width, height, fillBackground) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d", { alpha: !fillBackground });
    if (!ctx) throw new Error("Canvas is not available in this browser.");
    if (fillBackground) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function showResult(blob, fileName, details) {
    clearOutput();
    state.outputUrl = URL.createObjectURL(blob);
    resultImage.src = state.outputUrl;
    resultDownload.href = state.outputUrl;
    resultDownload.download = fileName;
    resultMeta.innerHTML = details.map((detail) => `<span>${detail}</span>`).join("");
    result.classList.add("visible");
  }

  function updateFilePreview() {
    if (!preview || !action) return;
    if (!state.file || !state.image) {
      preview.classList.remove("visible");
      action.disabled = true;
      return;
    }

    preview.innerHTML = `
      <img src="${state.previewUrl}" alt="">
      <div>
        <strong>${escapeHtml(state.file.name)}</strong>
        <span>${readableSize(state.file.size)} - ${state.image.naturalWidth}x${state.image.naturalHeight}</span>
      </div>
    `;
    preview.classList.add("visible");
    action.disabled = false;
  }

  async function setFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.", "error");
      return;
    }

    clearOutput();
    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.file = file;
    state.image = null;
    action.disabled = true;
    setMessage("Reading image on your device...");

    try {
      const loaded = await loadImage(file);
      state.image = loaded.img;
      state.previewUrl = loaded.url;
      updateFilePreview();
      setMessage("Ready.");
    } catch (error) {
      state.file = null;
      setMessage(error.message, "error");
      updateFilePreview();
    }
  }

  function selectedType() {
    return document.getElementById("outputFormat")?.value || "image/png";
  }

  async function runConverter() {
    const type = selectedType();
    const quality = Number(document.getElementById("convertQuality")?.value || 92) / 100;
    const canvas = drawImageToCanvas(state.image, state.image.naturalWidth, state.image.naturalHeight, type === "image/jpeg");
    const blob = await canvasToBlob(canvas, type, quality);
    const fileName = `${safeBaseName(state.file.name)}-pmw-converted.${extensionFor(type)}`;
    showResult(blob, fileName, [
      `<strong>Output:</strong> ${labelForType(type)}`,
      `<strong>Size:</strong> ${readableSize(blob.size)}`,
      `<strong>Resolution:</strong> ${canvas.width}x${canvas.height}`
    ]);
  }

  async function runBasicTool() {
    if (!state.file || !state.image) {
      setMessage("Upload an image first.", "error");
      return;
    }
    action.disabled = true;
    setMessage("Processing locally in your browser...");
    try {
      if (page === "converter") await runConverter();
      setMessage("Done. Your image was processed on this device.", "success");
    } catch (error) {
      setMessage(error.message || "The tool could not process this image.", "error");
    } finally {
      action.disabled = false;
    }
  }

  function bindBasicDropzone() {
    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      setFile(event.dataTransfer.files[0]);
    });
    input.addEventListener("change", () => setFile(input.files[0]));
  }

  function bindRanges() {
    document.querySelectorAll("[data-range-output]").forEach((range) => {
      const output = document.getElementById(range.dataset.rangeOutput);
      const update = () => { if (output) output.textContent = `${range.value}%`; };
      range.addEventListener("input", update);
      update();
    });
  }

  function compressorLocalUsageKey() {
    return `pmw-image-compressor-usage-v1:${compressorState.accountKey}:${todayKey()}`;
  }

  function normalizeCompressPlan() {
    return normalizePlan(compressorState.plan);
  }

  function isUnlimitedCompressPlan() {
    return normalizeCompressPlan() === "elite";
  }

  function compressDailyLimit() {
    const plan = normalizeCompressPlan();
    if (plan === "elite") return Number.POSITIVE_INFINITY;
    if (plan === "advance" || plan === "advanced") return ADVANCE_COMPRESS_LIMIT;
    if (plan === "pro") return PRO_COMPRESS_LIMIT;
    return FREE_COMPRESS_LIMIT;
  }

  function readCompressLocalUsage() {
    try {
      const value = Number.parseInt(localStorage.getItem(compressorLocalUsageKey()) || "0", 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch (_) {
      return compressorState.usageCount || 0;
    }
  }

  function writeCompressLocalUsage(value) {
    const safeValue = Math.max(0, Math.floor(value));
    compressorState.usageCount = safeValue;
    try {
      localStorage.setItem(compressorLocalUsageKey(), String(safeValue));
    } catch (_) {}
  }

  async function getCompressFirestoreUsageRef() {
    if (!compressorState.user || !compressorState.firestore) return null;
    const { db, doc } = compressorState.firestore;
    return doc(db, "toolUsage", compressorState.user.uid, "daily", todayKey());
  }

  async function loadCompressUsage() {
    compressorState.usageLoaded = false;
    compressorState.usageBackend = "local";

    if (isUnlimitedCompressPlan()) {
      compressorState.usageCount = 0;
      compressorState.usageLoaded = true;
      updateCompressorAccessUI();
      return;
    }

    const firestoreRef = await getCompressFirestoreUsageRef();
    if (firestoreRef) {
      try {
        const snap = await compressorState.firestore.getDoc(firestoreRef);
        compressorState.firestoreDocRef = firestoreRef;
        compressorState.usageCount = snap.exists() ? Number(snap.data().imageCompressCount || 0) : 0;
        compressorState.usageBackend = "firestore";
        compressorState.usageLoaded = true;
        updateCompressorAccessUI();
        return;
      } catch (error) {
        console.warn("Firestore toolUsage read failed; using local compressor limit fallback.", error);
      }
    }

    compressorState.usageCount = readCompressLocalUsage();
    compressorState.usageLoaded = true;
    updateCompressorAccessUI();
  }

  async function consumeCompressUsage(amount) {
    if (isUnlimitedCompressPlan()) return;
    const count = Math.max(1, Number(amount) || 1);
    const limit = compressDailyLimit();

    if (compressorState.usageBackend === "firestore" && compressorState.firestoreDocRef) {
      try {
        await compressorState.firestore.runTransaction(compressorState.firestore.db, async (transaction) => {
          const snap = await transaction.get(compressorState.firestoreDocRef);
          const current = snap.exists() ? Number(snap.data().imageCompressCount || 0) : 0;
          if (current + count > limit) throw new Error("compress-limit");
          transaction.set(compressorState.firestoreDocRef, {
            imageCompressCount: current + count,
            updatedAt: compressorState.firestore.serverTimestamp()
          }, { merge: true });
          compressorState.usageCount = current + count;
        });
        updateCompressorAccessUI();
        return;
      } catch (error) {
        if (error.message === "compress-limit") throw error;
        console.warn("Firestore toolUsage write failed; using local compressor limit fallback.", error);
        compressorState.usageBackend = "local";
        compressorState.usageCount = readCompressLocalUsage();
      }
    }

    const current = readCompressLocalUsage();
    if (current + count > limit) throw new Error("compress-limit");
    writeCompressLocalUsage(current + count);
    updateCompressorAccessUI();
  }

  function compressLimitReached() {
    return Number.isFinite(compressDailyLimit()) && compressorState.usageLoaded && compressorState.usageCount >= compressDailyLimit();
  }

  function showCompressLimitNotice() {
    const notice = document.getElementById("compressUsageNotice");
    const plan = normalizeCompressPlan();
    const copyByPlan = {
      pro: "You have reached today's Pro compression limit. Upgrade to Advance or Elite for more compression.",
      advance: "You have reached today's Advance compression limit. Upgrade to Elite for unlimited compression.",
      advanced: "You have reached today's Advance compression limit. Upgrade to Elite for unlimited compression."
    };
    const copy = copyByPlan[plan] || "You have reached today's free compression limit. Upgrade to Premium for more compression features.";
    if (notice) {
      const title = notice.querySelector("strong");
      const span = notice.querySelector("span");
      const link = notice.querySelector("a");
      if (title) title.textContent = plan === "pro" || plan === "advance" || plan === "advanced" ? "Compression limit reached" : "Free compression limit reached";
      if (span) span.textContent = copy;
      if (link) link.textContent = plan === "pro" || plan === "advance" || plan === "advanced" ? "Upgrade Plan" : "Upgrade to Premium";
      notice.hidden = false;
    }
    setMessage(copy, "error");
  }

  function hideCompressLimitNotice() {
    const notice = document.getElementById("compressUsageNotice");
    if (notice) notice.hidden = true;
  }

  function updateCompressorAccessUI() {
    if (page !== "compressor" || !action) return;
    document.body.classList.toggle("is-premium-member", compressorState.premium);
    document.body.dataset.compressPlan = normalizeCompressPlan();
    if (isUnlimitedCompressPlan() || !compressLimitReached()) hideCompressLimitNotice();
    if (compressLimitReached()) {
      showCompressLimitNotice();
      action.disabled = true;
      return;
    }
    updateCompressButtonState();
  }

  function normalizeCompressOutputType(type) {
    return SUPPORTED_COMPRESS_TYPES.includes(type) ? type : "";
  }

  function getCompressOutputType(file) {
    return normalizeCompressOutputType(file.type);
  }

  function getCompressQuality() {
    return Math.max(0.1, Math.min(0.95, Number(document.getElementById("compressQuality")?.value || 70) / 100));
  }

  function getCompressQualityPercent() {
    return Math.round(getCompressQuality() * 100);
  }

  function compressionDelta(originalSize, outputSize) {
    const delta = originalSize - outputSize;
    const percent = originalSize > 0 ? Math.abs(delta) / originalSize * 100 : 0;
    return {
      delta,
      percent,
      smaller: delta > 0
    };
  }

  function validateCompressItem(item) {
    const pixels = item.image.naturalWidth * item.image.naturalHeight;
    if (pixels > BROWSER_MAX_PIXELS) {
      throw new Error("This image is too large for this browser to compress safely.");
    }
    if (!getCompressOutputType(item.file)) {
      throw new Error("Please choose a JPG, PNG, or WEBP image.");
    }
    if (compressorState.premium) return;
    if (item.file.size > FREE_MAX_FILE_SIZE || isLargeForFree(item.image.naturalWidth, item.image.naturalHeight)) {
      throw new Error("Large image compression is a Premium feature.");
    }
  }

  function compressionQualityCandidates(type, selectedQuality) {
    if (type === "image/png") return [1];
    const floor = 0.1;
    const step = Math.max(0.03, (selectedQuality - floor) / 10);
    const candidates = [];
    for (let quality = selectedQuality; quality >= floor; quality -= step) {
      candidates.push(Number(Math.max(floor, quality).toFixed(2)));
    }
    candidates.push(floor);
    return [...new Set(candidates)];
  }

  function compressionScaleCandidates(selectedQuality) {
    const preferredScale = Math.max(0.16, Math.min(1, 0.2 + selectedQuality * 0.84));
    const candidates = [
      preferredScale,
      1,
      0.96,
      0.92,
      0.88,
      0.84,
      0.8,
      0.74,
      0.68,
      0.62,
      0.56,
      0.5,
      0.44,
      0.38,
      0.32,
      0.26,
      0.2,
      0.16,
      0.12,
      0.1
    ];
    return [...new Set(candidates.map((scale) => Number(Math.max(0.1, Math.min(1, scale)).toFixed(3))))].sort((a, b) => b - a);
  }

  function getRequestedCompressTargetBytes(originalSize, selectedQuality) {
    const inputTarget = document.getElementById("compressTargetSize");
    const requestedKb = Number.parseFloat(inputTarget?.value || "");
    const maxTarget = Math.max(1, originalSize - 1);
    if (Number.isFinite(requestedKb) && requestedKb > 0) {
      return Math.max(1, Math.min(maxTarget, Math.round(requestedKb * 1024)));
    }

    const targetRatio = Math.max(0.14, Math.min(0.97, selectedQuality * 0.9 + 0.07));
    return Math.max(1, Math.min(maxTarget, Math.floor(originalSize * targetRatio)));
  }

  async function createSmallerCompressedBlob(item, type) {
    const selectedQuality = getCompressQuality();
    const targetSize = getRequestedCompressTargetBytes(item.file.size, selectedQuality);
    const qualities = compressionQualityCandidates(type, selectedQuality);
    const scales = compressionScaleCandidates(selectedQuality);
    let smallest = null;
    let bestUnderTarget = null;
    let closestAboveTarget = null;

    for (const scale of scales) {
      const width = Math.max(1, Math.round(item.image.naturalWidth * scale));
      const height = Math.max(1, Math.round(item.image.naturalHeight * scale));
      const canvas = drawImageToCanvas(item.image, width, height, type === "image/jpeg");

      for (const quality of qualities) {
        const blob = await canvasToBlob(canvas, type, quality);
        const candidate = {
          blob,
          width,
          height,
          qualityPercent: Math.round(selectedQuality * 100),
          wasScaled: scale < 1
        };

        if (!smallest || blob.size < smallest.blob.size) {
          smallest = candidate;
        }
        if (blob.size < item.file.size) {
          if (blob.size <= targetSize) {
            if (!bestUnderTarget || blob.size > bestUnderTarget.blob.size) {
              bestUnderTarget = candidate;
            }
          } else if (!closestAboveTarget || blob.size < closestAboveTarget.blob.size) {
            closestAboveTarget = candidate;
          }
        }
      }
    }

    if (bestUnderTarget) return bestUnderTarget;
    if (closestAboveTarget) return closestAboveTarget;
    if (smallest && smallest.blob.size < item.file.size) return smallest;
    throw new Error("This image is already too optimized for browser compression.");
  }

  async function compressOneItem(item) {
    validateCompressItem(item);
    const type = getCompressOutputType(item.file);
    const compressed = await createSmallerCompressedBlob(item, type);
    const blob = compressed.blob;
    const delta = compressionDelta(item.file.size, blob.size);
    const name = `${safeBaseName(item.file.name)}-pmw-compressed.${extensionFor(type)}`;
    return {
      blob,
      name,
      type,
      quality: compressed.qualityPercent,
      url: URL.createObjectURL(blob),
      originalSize: item.file.size,
      outputSize: blob.size,
      width: compressed.width,
      height: compressed.height,
      delta,
      wasScaled: compressed.wasScaled
    };
  }

  function clearCompressorOutputs() {
    compressorState.outputs.forEach((output) => {
      if (output.url) URL.revokeObjectURL(output.url);
    });
    compressorState.outputs = [];
    clearOutput();
    const list = document.getElementById("compressBatchResultList");
    if (list) list.innerHTML = "";
    const empty = document.getElementById("compressResultEmpty");
    if (empty) empty.hidden = false;
  }

  function clearCompressorItems() {
    compressorState.items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    compressorState.items = [];
    clearCompressorOutputs();
  }

  function setCompressOriginalDetails(item) {
    const details = document.getElementById("compressOriginalDetails");
    if (!details) return;
    if (!item) {
      details.hidden = true;
      return;
    }
    document.getElementById("compressDetailName").textContent = item.file.name;
    document.getElementById("compressDetailSize").textContent = readableSize(item.file.size);
    document.getElementById("compressDetailWidth").textContent = `${item.image.naturalWidth}px`;
    document.getElementById("compressDetailHeight").textContent = `${item.image.naturalHeight}px`;
    document.getElementById("compressDetailType").textContent = labelForType(item.file.type);
    details.hidden = false;
  }

  function renderCompressorPreview() {
    if (!preview) return;
    if (!compressorState.items.length) {
      preview.classList.remove("visible");
      preview.innerHTML = "";
      setCompressOriginalDetails(null);
      updateCompressButtonState();
      resetCompressEstimate("Upload an image", "-");
      return;
    }

    const first = compressorState.items[0];
    const extraCount = compressorState.items.length - 1;
    preview.innerHTML = `
      <img src="${first.previewUrl}" alt="">
      <div>
        <strong>${escapeHtml(first.file.name)}</strong>
        <span>${readableSize(first.file.size)} - ${first.image.naturalWidth}x${first.image.naturalHeight}${extraCount > 0 ? ` - ${extraCount} more` : ""}</span>
      </div>
    `;
    preview.classList.add("visible");
    setCompressOriginalDetails(first);
    updateCompressButtonState();
    scheduleCompressEstimate();
  }

  function setEstimateClass(name) {
    const estimate = document.getElementById("compressEstimate");
    if (!estimate) return;
    estimate.classList.remove("is-warning", "is-success", "is-muted");
    if (name) estimate.classList.add(name);
  }

  function resetCompressEstimate(status, saved) {
    const quality = getCompressQualityPercent();
    document.getElementById("compressEstimateStatus").textContent = status;
    document.getElementById("compressEstimateQuality").textContent = `Quality ${quality}%`;
    document.getElementById("compressEstimateOriginal").textContent = "-";
    document.getElementById("compressEstimateSize").textContent = "-";
    document.getElementById("compressEstimateSaved").textContent = saved || "-";
    document.getElementById("compressEstimatePercent").textContent = "-";
    setEstimateClass("is-muted");
  }

  async function estimateCompression() {
    const item = compressorState.items[0];
    if (!item) {
      resetCompressEstimate("Upload an image", "-");
      return;
    }

    const token = ++compressorState.estimateToken;
    const type = getCompressOutputType(item.file);
    const percent = getCompressQualityPercent();
    document.getElementById("compressEstimateStatus").textContent = "Estimating...";
    document.getElementById("compressEstimateQuality").textContent = `Quality ${percent}%`;
    document.getElementById("compressEstimateOriginal").textContent = readableSize(item.file.size);
    document.getElementById("compressEstimateSize").textContent = "-";
    document.getElementById("compressEstimateSaved").textContent = "-";
    document.getElementById("compressEstimatePercent").textContent = "-";
    setEstimateClass("is-muted");

    try {
      validateCompressItem(item);
      const compressed = await createSmallerCompressedBlob(item, type);
      const blob = compressed.blob;
      if (token !== compressorState.estimateToken) return;

      const delta = compressionDelta(item.file.size, blob.size);
      const status = compressed.wasScaled
        ? "Ready to compress with a smaller optimized output"
        : "Ready to compress";
      document.getElementById("compressEstimateStatus").textContent = status;
      document.getElementById("compressEstimateSize").textContent = readableSize(blob.size);
      document.getElementById("compressEstimateSaved").textContent = readableSize(delta.delta);
      document.getElementById("compressEstimatePercent").textContent = `${delta.percent.toFixed(1)}% smaller`;
      setEstimateClass("is-success");
    } catch (error) {
      if (token !== compressorState.estimateToken) return;
      document.getElementById("compressEstimateStatus").textContent = error.message || "Unable to estimate this image.";
      setEstimateClass("is-warning");
    }
  }

  function scheduleCompressEstimate() {
    window.clearTimeout(compressorState.estimateTimer);
    compressorState.estimateTimer = window.setTimeout(estimateCompression, 420);
  }

  function updateCompressButtonState() {
    if (page !== "compressor" || !action) return;
    const hasItems = compressorState.items.length > 0;
    action.disabled = !hasItems || compressLimitReached();
    action.innerHTML = `${compressorState.items.length > 1 ? "Compress Images" : "Compress Image"} <i data-lucide="arrow-right"></i>`;
    drawIcons();
  }

  async function addCompressFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setMessage("Please choose a JPG, PNG, or WEBP image.", "error");
      return;
    }

    clearCompressorItems();
    hideCompressLimitNotice();

    let selectedFiles = files;
    if (!compressorState.premium && files.length > 1) {
      selectedFiles = files.slice(0, 1);
      setMessage("Batch compression is a Premium feature. The first image was selected.", "error");
    } else {
      setMessage("Reading image on your device...");
    }

    try {
      const loadedItems = [];
      for (const file of selectedFiles) {
        if (!SUPPORTED_COMPRESS_TYPES.includes(file.type)) {
          throw new Error("Please choose a JPG, PNG, or WEBP image.");
        }
        if (!compressorState.premium && file.size > FREE_MAX_FILE_SIZE) {
          throw new Error("Large image compression is a Premium feature.");
        }
        const loaded = await loadImage(file);
        const item = { file, image: loaded.img, previewUrl: loaded.url };
        if (!compressorState.premium && isLargeForFree(item.image.naturalWidth, item.image.naturalHeight)) {
          URL.revokeObjectURL(item.previewUrl);
          throw new Error("Large image compression is a Premium feature.");
        }
        loadedItems.push(item);
      }
      compressorState.items = loadedItems;
      renderCompressorPreview();
      setMessage(compressorState.items.length > 1 ? `${compressorState.items.length} images ready for premium batch compression.` : "Ready to compress.", "success");
    } catch (error) {
      clearCompressorItems();
      setMessage(error.message || "This image could not be loaded.", "error");
      renderCompressorPreview();
    }
  }

  function showCompressOutput(output) {
    clearOutput();
    state.outputUrl = output.url;
    resultImage.src = output.url;
    resultDownload.href = output.url;
    resultDownload.download = output.name;
    result.classList.remove("is-warning");

    const scaledLine = output.wasScaled
      ? `<span><strong>Optimization:</strong> Dimensions were reduced to keep the compressed file smaller than the upload.</span>`
      : "";

    resultMeta.innerHTML = [
      `<span><strong>Before:</strong> ${readableSize(output.originalSize)}</span>`,
      `<span><strong>After:</strong> ${readableSize(output.outputSize)}</span>`,
      `<span><strong>Saved:</strong> ${readableSize(output.delta.delta)} (${output.delta.percent.toFixed(1)}%)</span>`,
      `<span><strong>Output type:</strong> ${labelForType(output.type)}</span>`,
      `<span><strong>Quality used:</strong> ${output.quality}%</span>`,
      `<span><strong>Resolution:</strong> ${output.width}x${output.height}</span>`,
      scaledLine
    ].filter(Boolean).join("");
    result.classList.add("visible");
    const empty = document.getElementById("compressResultEmpty");
    if (empty) empty.hidden = true;
  }

  function renderCompressBatchOutputs() {
    const list = document.getElementById("compressBatchResultList");
    if (!list) return;
    if (compressorState.outputs.length <= 1) {
      list.innerHTML = "";
      return;
    }

    list.innerHTML = compressorState.outputs.map((output, index) => {
      const summary = `${readableSize(output.outputSize)} - saved ${output.delta.percent.toFixed(1)}%`;
      return `
        <article class="batch-result-item">
          <div>
            <strong>${escapeHtml(output.name)}</strong>
            <span>${summary}</span>
          </div>
          <a href="${output.url}" download="${escapeHtml(output.name)}">Download ${index + 1}</a>
        </article>
      `;
    }).join("");
  }

  async function runCompressor() {
    if (!compressorState.items.length) {
      setMessage("Upload an image first.", "error");
      return;
    }
    if (!compressorState.usageLoaded) await loadCompressUsage();
    if (compressLimitReached()) {
      showCompressLimitNotice();
      return;
    }

    action.disabled = true;
    setMessage("Compressing locally in your browser...");

    const compressedOutputs = [];
    try {
      const items = compressorState.premium ? compressorState.items : compressorState.items.slice(0, 1);
      if (Number.isFinite(compressDailyLimit()) && compressorState.usageCount + items.length > compressDailyLimit()) {
        throw new Error("compress-limit");
      }

      for (const item of items) {
        compressedOutputs.push(await compressOneItem(item));
      }

      await consumeCompressUsage(compressedOutputs.length);
      clearCompressorOutputs();
      compressorState.outputs = compressedOutputs;
      showCompressOutput(compressorState.outputs[0]);
      renderCompressBatchOutputs();
      setMessage("Done. Your image was processed locally on your device.", "success");
      scheduleCompressEstimate();
    } catch (error) {
      compressedOutputs.forEach((output) => URL.revokeObjectURL(output.url));
      if (error.message === "compress-limit") showCompressLimitNotice();
      else setMessage(error.message || "This image could not be compressed.", "error");
    } finally {
      updateCompressButtonState();
    }
  }

  function bindCompressorDropzone() {
    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      addCompressFiles(event.dataTransfer.files);
    });
    input.addEventListener("change", () => addCompressFiles(input.files));
  }

  function bindCompressQualityControls() {
    const range = document.getElementById("compressQuality");
    const output = document.getElementById("compressQualityValue");
    const target = document.getElementById("compressTargetSize");
    const update = () => {
      if (output) output.textContent = `${range.value}%`;
      document.getElementById("compressEstimateQuality").textContent = `Quality ${range.value}%`;
      scheduleCompressEstimate();
    };
    range?.addEventListener("input", update);
    target?.addEventListener("input", scheduleCompressEstimate);
    update();

    document.getElementById("compressPresetGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-quality]");
      if (!button || !range) return;
      range.value = button.dataset.quality;
      update();
      setMessage(`Quality preset selected: ${button.dataset.quality}%.`, "success");
    });
  }

  async function initializeCompressorMembership() {
    try {
      const [{ auth, db }, { onAuthStateChanged }, premiumModule, firestoreModule] = await Promise.all([
        import(new URL("../../js/firebase.js", document.baseURI).href),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
        import(new URL("../../js/premium-access.js?v=20260718-premium-gate", document.baseURI).href),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
      ]);
      compressorState.firestore = {
        db,
        doc: firestoreModule.doc,
        getDoc: firestoreModule.getDoc,
        runTransaction: firestoreModule.runTransaction,
        serverTimestamp: firestoreModule.serverTimestamp
      };
      onAuthStateChanged(auth, async (user) => {
        compressorState.user = user || null;
        compressorState.accountKey = user ? user.uid : "guest";
        const plan = user && typeof premiumModule.getPremiumPlan === "function" ? await premiumModule.getPremiumPlan(user) : "";
        compressorState.plan = normalizePlan(plan || "free");
        compressorState.premium = user ? Boolean(plan || await premiumModule.isPremiumUser(user)) : false;
        await loadCompressUsage();
        renderCompressorPreview();
      });
    } catch (error) {
      console.warn("PMW premium status is unavailable; using free compressor access.", error);
      compressorState.user = null;
      compressorState.accountKey = "guest";
      compressorState.premium = false;
      compressorState.plan = "free";
      await loadCompressUsage();
    }
  }

  function initCompressor() {
    bindCompressorDropzone();
    bindCompressQualityControls();
    action.addEventListener("click", runCompressor);
    resetCompressEstimate("Upload an image", "-");
    initializeCompressorMembership();
    updateCompressButtonState();
  }

  function localUsageKey() {
    return `pmw-image-resizer-usage-v1:${resizerState.accountKey}:${todayKey()}`;
  }

  function normalizePlan(value) {
    return String(value || "free").trim().toLowerCase();
  }

  function isUnlimitedResizePlan() {
    return ["advance", "advanced", "elite"].includes(normalizePlan(resizerState.plan));
  }

  function resizeDailyLimit() {
    if (isUnlimitedResizePlan()) return Number.POSITIVE_INFINITY;
    if (normalizePlan(resizerState.plan) === "pro") return PRO_RESIZE_LIMIT;
    return FREE_RESIZE_LIMIT;
  }

  function readLocalUsage() {
    try {
      const value = Number.parseInt(localStorage.getItem(localUsageKey()) || "0", 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch (_) {
      return resizerState.usageCount || 0;
    }
  }

  function writeLocalUsage(value) {
    const safeValue = Math.max(0, Math.floor(value));
    resizerState.usageCount = safeValue;
    try {
      localStorage.setItem(localUsageKey(), String(safeValue));
    } catch (_) {}
  }

  async function getFirestoreUsageRef() {
    if (!resizerState.user || !resizerState.firestore) return null;
    const { db, doc } = resizerState.firestore;
    return doc(db, "toolUsage", resizerState.user.uid, "daily", todayKey());
  }

  async function loadResizeUsage() {
    resizerState.usageLoaded = false;
    resizerState.usageBackend = "local";

    if (isUnlimitedResizePlan()) {
      resizerState.usageCount = 0;
      resizerState.usageLoaded = true;
      updateResizerAccessUI();
      return;
    }

    const firestoreRef = await getFirestoreUsageRef();
    if (firestoreRef) {
      try {
        const snap = await resizerState.firestore.getDoc(firestoreRef);
        resizerState.firestoreDocRef = firestoreRef;
        resizerState.usageCount = snap.exists() ? Number(snap.data().imageResizeCount || 0) : 0;
        resizerState.usageBackend = "firestore";
        resizerState.usageLoaded = true;
        updateResizerAccessUI();
        return;
      } catch (error) {
        console.warn("Firestore toolUsage read failed; using local resize limit fallback.", error);
      }
    }

    resizerState.usageCount = readLocalUsage();
    resizerState.usageLoaded = true;
    updateResizerAccessUI();
  }

  async function consumeResizeUsage(amount) {
    if (isUnlimitedResizePlan()) return;
    const count = Math.max(1, Number(amount) || 1);
    const limit = resizeDailyLimit();

    if (resizerState.usageBackend === "firestore" && resizerState.firestoreDocRef) {
      try {
        await resizerState.firestore.runTransaction(resizerState.firestore.db, async (transaction) => {
          const snap = await transaction.get(resizerState.firestoreDocRef);
          const current = snap.exists() ? Number(snap.data().imageResizeCount || 0) : 0;
          if (current + count > limit) {
            throw new Error("resize-limit");
          }
          transaction.set(resizerState.firestoreDocRef, {
            imageResizeCount: current + count,
            updatedAt: resizerState.firestore.serverTimestamp()
          }, { merge: true });
          resizerState.usageCount = current + count;
        });
        updateResizerAccessUI();
        return;
      } catch (error) {
        if (error.message === "resize-limit") throw error;
        console.warn("Firestore toolUsage write failed; using local resize limit fallback.", error);
        resizerState.usageBackend = "local";
        resizerState.usageCount = readLocalUsage();
      }
    }

    const current = readLocalUsage();
    if (current + count > limit) throw new Error("resize-limit");
    writeLocalUsage(current + count);
    updateResizerAccessUI();
  }

  function freeLimitReached() {
    return Number.isFinite(resizeDailyLimit()) && resizerState.usageLoaded && resizerState.usageCount >= resizeDailyLimit();
  }

  function showLimitNotice() {
    const notice = document.getElementById("resizeUsageNotice");
    const plan = normalizePlan(resizerState.plan);
    if (notice) {
      const title = notice.querySelector("strong");
      const copy = notice.querySelector("span");
      const link = notice.querySelector("a");
      if (plan === "pro") {
        if (title) title.textContent = "Pro resize limit reached";
        if (copy) copy.textContent = "You have reached today’s Pro resize limit. Upgrade to Advance or Elite for unlimited resizing.";
        if (link) link.textContent = "Upgrade Plan";
      } else {
        if (title) title.textContent = "Free resize limit reached";
        if (copy) copy.textContent = "You have reached today’s free resize limit. Upgrade to Premium for more resizing features.";
        if (link) link.textContent = "Upgrade to Premium";
      }
      notice.hidden = false;
    }
    if (plan === "pro") {
      setMessage("You have reached today’s Pro resize limit. Upgrade to Advance or Elite for unlimited resizing.", "error");
      return;
    }
    setMessage("You have reached today’s free resize limit. Upgrade to Premium for more resizing features.", "error");
  }

  function hideLimitNotice() {
    const notice = document.getElementById("resizeUsageNotice");
    if (notice) notice.hidden = true;
  }

  function updateResizerAccessUI() {
    if (page !== "resizer" || !action) return;
    document.body.classList.toggle("is-premium-member", resizerState.premium);
    document.body.dataset.resizePlan = normalizePlan(resizerState.plan);
    if (isUnlimitedResizePlan() || !freeLimitReached()) hideLimitNotice();
    if (freeLimitReached()) {
      hideLimitNotice();
      updateResizeButtonState();
      return;
    }
    updateResizeButtonState();
  }

  function normalizeOutputType(type) {
    return SUPPORTED_RESIZE_TYPES.includes(type) ? type : "image/png";
  }

  function getResizeOutputType(file) {
    const selected = document.getElementById("resizeFormat").value;
    if (selected === "original") return normalizeOutputType(file.type);
    return normalizeOutputType(selected);
  }

  function getResizeQuality() {
    return Math.max(0.35, Math.min(1, Number(document.getElementById("resizeQuality").value || 92) / 100));
  }

  function requestedSize() {
    const width = Number.parseInt(document.getElementById("resizeWidth").value, 10);
    const height = Number.parseInt(document.getElementById("resizeHeight").value, 10);
    if (!width || !height || width < 1 || height < 1) {
      throw new Error("Enter a valid width and height.");
    }
    return { width, height };
  }

  function isLargeForFree(width, height) {
    return width > FREE_MAX_WIDTH || height > FREE_MAX_HEIGHT || width * height > FREE_MAX_PIXELS;
  }

  function validateFreeItem(item, width, height) {
    if (item.image.naturalWidth * item.image.naturalHeight > BROWSER_MAX_PIXELS || width * height > BROWSER_MAX_PIXELS) {
      throw new Error("This image is too large for this browser to resize safely.");
    }
    if (resizerState.premium) return;
    if (item.file.size > FREE_MAX_FILE_SIZE) {
      throw new Error("Large image resizing is a Premium feature.");
    }
    if (isLargeForFree(item.image.naturalWidth, item.image.naturalHeight) || isLargeForFree(width, height)) {
      throw new Error("Large image resizing is a Premium feature.");
    }
  }

  function clearResizerOutputs() {
    resizerState.outputs.forEach((output) => {
      if (output.url) URL.revokeObjectURL(output.url);
    });
    resizerState.outputs = [];
    clearOutput();
    document.getElementById("batchResultList").innerHTML = "";
    document.getElementById("resultEmpty").hidden = false;
  }

  function clearResizerItems() {
    resizerState.items.forEach((item) => {
      if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
    });
    resizerState.items = [];
    clearResizerOutputs();
  }

  function setOriginalDetails(item) {
    const details = document.getElementById("originalDetails");
    if (!item) {
      details.hidden = true;
      return;
    }
    document.getElementById("detailName").textContent = item.file.name;
    document.getElementById("detailSize").textContent = readableSize(item.file.size);
    document.getElementById("detailWidth").textContent = `${item.image.naturalWidth}px`;
    document.getElementById("detailHeight").textContent = `${item.image.naturalHeight}px`;
    document.getElementById("detailType").textContent = labelForType(item.file.type);
    details.hidden = false;
  }

  function renderResizerPreview() {
    if (!preview) return;
    if (!resizerState.items.length) {
      preview.classList.remove("visible");
      preview.innerHTML = "";
      setOriginalDetails(null);
      updateResizeButtonState();
      return;
    }

    const first = resizerState.items[0];
    const extraCount = resizerState.items.length - 1;
    preview.innerHTML = `
      <img src="${first.previewUrl}" alt="">
      <div>
        <strong>${escapeHtml(first.file.name)}</strong>
        <span>${readableSize(first.file.size)} - ${first.image.naturalWidth}x${first.image.naturalHeight}${extraCount > 0 ? ` - ${extraCount} more` : ""}</span>
      </div>
    `;
    preview.classList.add("visible");
    setOriginalDetails(first);
    updateResizeButtonState();
  }

  function syncResizeInputsFromItem(item) {
    if (!item) return;
    const width = document.getElementById("resizeWidth");
    const height = document.getElementById("resizeHeight");
    width.value = item.image.naturalWidth;
    height.value = item.image.naturalHeight;
  }

  function updateResizeButtonState() {
    if (page !== "resizer" || !action) return;
    const hasItems = resizerState.items.length > 0;
    action.disabled = !hasItems;
    action.querySelector("span")?.remove();
    action.innerHTML = `${resizerState.items.length > 1 ? "Resize Images" : "Resize Image"} <i data-lucide="arrow-right"></i>`;
    drawIcons();
  }

  function updateResizeQualityVisibility() {
    if (page !== "resizer") return;
    const group = document.getElementById("resizeQualityGroup");
    if (!group) return;
    const firstFile = resizerState.items[0]?.file;
    const type = firstFile ? getResizeOutputType(firstFile) : document.getElementById("resizeFormat").value;
    group.hidden = !(type === "image/jpeg" || type === "image/webp");
  }

  async function addResizeFiles(fileList) {
    const files = Array.from(fileList || []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) {
      setMessage("Please choose a JPG, PNG, WEBP, or browser-supported image.", "error");
      return;
    }

    clearResizerItems();
    hideLimitNotice();

    let selectedFiles = files;
    if (!resizerState.premium && files.length > 1) {
      selectedFiles = files.slice(0, 1);
      setMessage("Batch resize is a Premium feature. The first image was selected.", "error");
    } else {
      setMessage("Reading image on your device...");
    }

    try {
      const loadedItems = [];
      for (const file of selectedFiles) {
        if (!resizerState.premium && file.size > FREE_MAX_FILE_SIZE) {
          throw new Error("Large image resizing is a Premium feature.");
        }
        const loaded = await loadImage(file);
        const item = { file, image: loaded.img, previewUrl: loaded.url };
        if (!resizerState.premium && isLargeForFree(item.image.naturalWidth, item.image.naturalHeight)) {
          URL.revokeObjectURL(item.previewUrl);
          throw new Error("Large image resizing is a Premium feature.");
        }
        loadedItems.push(item);
      }
      resizerState.items = loadedItems;
      syncResizeInputsFromItem(resizerState.items[0]);
      renderResizerPreview();
      updateResizeQualityVisibility();
      if (resizerState.items.length > 1) {
        setMessage(`${resizerState.items.length} images ready for premium batch resize.`, "success");
      } else {
        setMessage("Ready. Choose dimensions and resize.", "success");
      }
    } catch (error) {
      clearResizerItems();
      setMessage(error.message || "This image could not be loaded.", "error");
      renderResizerPreview();
    }
  }

  function renderBatchOutputs() {
    const list = document.getElementById("batchResultList");
    if (!list) return;
    if (resizerState.outputs.length <= 1) {
      list.innerHTML = "";
      return;
    }

    list.innerHTML = resizerState.outputs.map((output, index) => `
      <article class="batch-result-item">
        <div>
          <strong>${escapeHtml(output.name)}</strong>
          <span>${output.width}x${output.height} - ${readableSize(output.size)}</span>
        </div>
        <a href="${output.url}" download="${escapeHtml(output.name)}">Download ${index + 1}</a>
      </article>
    `).join("");
  }

  async function resizeOneItem(item, width, height) {
    validateFreeItem(item, width, height);
    const type = getResizeOutputType(item.file);
    const quality = getResizeQuality();
    const canvas = drawImageToCanvas(item.image, width, height, type === "image/jpeg");
    const blob = await canvasToBlob(canvas, type, quality);
    const name = `${safeBaseName(item.file.name)}-${width}x${height}.${extensionFor(type)}`;
    return {
      blob,
      name,
      width,
      height,
      size: blob.size,
      type,
      url: URL.createObjectURL(blob),
      originalWidth: item.image.naturalWidth,
      originalHeight: item.image.naturalHeight,
      originalSize: item.file.size
    };
  }

  function showResizeOutput(output) {
    clearOutput();
    state.outputUrl = output.url;
    resultImage.src = output.url;
    resultDownload.href = output.url;
    resultDownload.download = output.name;
    resultMeta.innerHTML = [
      `<span><strong>New size:</strong> ${output.width}x${output.height}</span>`,
      `<span><strong>File size:</strong> ${readableSize(output.size)}</span>`,
      `<span><strong>Format:</strong> ${labelForType(output.type)}</span>`
    ].join("");
    result.classList.add("visible");
    document.getElementById("resultEmpty").hidden = true;
  }

  async function runResizer() {
    if (!resizerState.items.length) {
      setMessage("Upload an image first.", "error");
      return;
    }
    if (!resizerState.usageLoaded) await loadResizeUsage();
    if (freeLimitReached()) {
      showLimitNotice();
      action.disabled = true;
      return;
    }

    let size;
    try {
      size = requestedSize();
      if (!resizerState.premium && isLargeForFree(size.width, size.height)) {
        throw new Error("Large image resizing is a Premium feature.");
      }
    } catch (error) {
      setMessage(error.message, "error");
      return;
    }

    action.disabled = true;
    setMessage("Resizing locally in your browser...");

    const resizedOutputs = [];
    try {
      const items = resizerState.premium ? resizerState.items : resizerState.items.slice(0, 1);
      if (Number.isFinite(resizeDailyLimit()) && resizerState.usageCount + items.length > resizeDailyLimit()) {
        throw new Error("resize-limit");
      }

      for (const item of items) {
        const output = await resizeOneItem(item, size.width, size.height);
        resizedOutputs.push(output);
      }

      await consumeResizeUsage(resizedOutputs.length);
      clearResizerOutputs();
      resizerState.outputs = resizedOutputs;
      showResizeOutput(resizerState.outputs[0]);
      renderBatchOutputs();
      setMessage(`${resizedOutputs.length} image${resizedOutputs.length === 1 ? "" : "s"} resized.`, "success");
    } catch (error) {
      resizedOutputs.forEach((output) => URL.revokeObjectURL(output.url));
      if (error.message === "resize-limit") {
        showLimitNotice();
        action.disabled = true;
      }
      else setMessage(error.message || "This image could not be resized.", "error");
    } finally {
      updateResizeButtonState();
    }
  }

  function bindResizeAspectRatio() {
    const width = document.getElementById("resizeWidth");
    const height = document.getElementById("resizeHeight");
    const keep = document.getElementById("keepAspect");
    let internalUpdate = false;

    const firstImage = () => resizerState.items[0]?.image;
    const updateFromWidth = () => {
      if (internalUpdate || !keep.checked || !firstImage()) return;
      internalUpdate = true;
      height.value = Math.max(1, Math.round(Number(width.value) * firstImage().naturalHeight / firstImage().naturalWidth));
      internalUpdate = false;
    };
    const updateFromHeight = () => {
      if (internalUpdate || !keep.checked || !firstImage()) return;
      internalUpdate = true;
      width.value = Math.max(1, Math.round(Number(height.value) * firstImage().naturalWidth / firstImage().naturalHeight));
      internalUpdate = false;
    };
    width.addEventListener("input", updateFromWidth);
    height.addEventListener("input", updateFromHeight);
  }

  function bindPresets() {
    document.getElementById("presetGrid")?.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-width][data-height]");
      if (!button) return;
      document.getElementById("resizeWidth").value = button.dataset.width;
      document.getElementById("resizeHeight").value = button.dataset.height;
      setMessage(`Preset selected: ${button.dataset.width}x${button.dataset.height}.`, "success");
    });
  }

  function resetResizer() {
    clearResizerItems();
    hideLimitNotice();
    if (input) input.value = "";
    const width = document.getElementById("resizeWidth");
    const height = document.getElementById("resizeHeight");
    const keep = document.getElementById("keepAspect");
    const format = document.getElementById("resizeFormat");
    const quality = document.getElementById("resizeQuality");
    const qualityValue = document.getElementById("resizeQualityValue");
    if (width) width.value = "";
    if (height) height.value = "";
    if (keep) keep.checked = true;
    if (format) format.value = "original";
    if (quality) quality.value = "92";
    if (qualityValue) qualityValue.textContent = "92%";
    updateResizeQualityVisibility();
    updateResizeButtonState();
    setMessage("Upload an image to begin.");
  }

  function bindResizerDropzone() {
    dropzone.addEventListener("click", () => input.click());
    dropzone.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        input.click();
      }
    });
    dropzone.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
    dropzone.addEventListener("drop", (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      addResizeFiles(event.dataTransfer.files);
    });
    input.addEventListener("change", () => addResizeFiles(input.files));
  }

  async function initializeResizerMembership() {
    try {
      const [{ auth, db }, { onAuthStateChanged }, premiumModule, firestoreModule] = await Promise.all([
        import(new URL("../../js/firebase.js", document.baseURI).href),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
        import(new URL("../../js/premium-access.js?v=20260718-premium-gate", document.baseURI).href),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js")
      ]);
      resizerState.firestore = {
        db,
        doc: firestoreModule.doc,
        getDoc: firestoreModule.getDoc,
        runTransaction: firestoreModule.runTransaction,
        serverTimestamp: firestoreModule.serverTimestamp
      };
      onAuthStateChanged(auth, async (user) => {
        resizerState.user = user || null;
        resizerState.accountKey = user ? user.uid : "guest";
        const plan = user && typeof premiumModule.getPremiumPlan === "function" ? await premiumModule.getPremiumPlan(user) : "";
        resizerState.plan = normalizePlan(plan || "free");
        resizerState.premium = user ? Boolean(plan || await premiumModule.isPremiumUser(user)) : false;
        await loadResizeUsage();
        renderResizerPreview();
        updateResizeQualityVisibility();
      });
    } catch (error) {
      console.warn("PMW premium status is unavailable; using free resizer access.", error);
      resizerState.user = null;
      resizerState.accountKey = "guest";
      resizerState.premium = false;
      resizerState.plan = "free";
      await loadResizeUsage();
    }
  }

  function initResizer() {
    bindResizerDropzone();
    bindRanges();
    bindResizeAspectRatio();
    bindPresets();
    document.getElementById("resizeFormat").addEventListener("change", updateResizeQualityVisibility);
    action.addEventListener("click", runResizer);
    document.getElementById("toolReset")?.addEventListener("click", resetResizer);
    initializeResizerMembership();
    updateResizeButtonState();
  }

  if (!page || !input || !dropzone || !action) return;

  if (page === "resizer") {
    initResizer();
  } else if (page === "compressor") {
    initCompressor();
  } else {
    bindBasicDropzone();
    bindRanges();
    action.addEventListener("click", runBasicTool);
  }

  drawIcons();
})();
