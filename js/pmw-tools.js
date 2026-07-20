(function () {
  "use strict";

  const FREE_RESIZE_LIMIT = 13;
  const PRO_RESIZE_LIMIT = 20;
  const FREE_MAX_FILE_SIZE = 10 * 1024 * 1024;
  const FREE_MAX_WIDTH = 3840;
  const FREE_MAX_HEIGHT = 2160;
  const FREE_MAX_PIXELS = FREE_MAX_WIDTH * FREE_MAX_HEIGHT;
  const BROWSER_MAX_PIXELS = 60_000_000;
  const SUPPORTED_RESIZE_TYPES = ["image/jpeg", "image/png", "image/webp"];

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

  async function runCompressor() {
    const type = document.getElementById("compressFormat").value;
    const quality = Number(document.getElementById("compressQuality").value) / 100;
    const canvas = drawImageToCanvas(state.image, state.image.naturalWidth, state.image.naturalHeight, type === "image/jpeg");
    const blob = await canvasToBlob(canvas, type, quality);
    const saved = state.file.size > 0 ? Math.max(0, Math.round((1 - blob.size / state.file.size) * 100)) : 0;
    const fileName = `${safeBaseName(state.file.name)}-pmw-compressed.${extensionFor(type)}`;
    showResult(blob, fileName, [
      `<strong>Before:</strong> ${readableSize(state.file.size)}`,
      `<strong>After:</strong> ${readableSize(blob.size)}`,
      `<strong>Saved:</strong> ${saved}%`
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
      if (page === "compressor") await runCompressor();
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
      showLimitNotice();
      action.disabled = true;
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
    action.disabled = !hasItems || freeLimitReached();
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
      if (error.message === "resize-limit") showLimitNotice();
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
    initializeResizerMembership();
    updateResizeButtonState();
  }

  if (!page || !input || !dropzone || !action) return;

  if (page === "resizer") {
    initResizer();
  } else {
    bindBasicDropzone();
    bindRanges();
    action.addEventListener("click", runBasicTool);
  }

  drawIcons();
})();
