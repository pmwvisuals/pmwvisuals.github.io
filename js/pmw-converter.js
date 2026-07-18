(function () {
  "use strict";

  const DAILY_FREE_LIMIT = 13;
  const modes = {
    image: { accept: "image/*,.tif,.tiff", title: "Drop images here", copy: "JPG, PNG, WEBP, GIF, BMP or TIFF", formats: ["JPG", "PNG", "WEBP", "GIF", "BMP", "TIFF"], optionTitle: "Strip metadata", optionCopy: "Remove embedded image information", optionDefault: false, premiumOption: true },
    video: { accept: "video/*,.mkv,.avi", title: "Drop videos here", copy: "MP4, MOV, WEBM, AVI, MKV or GIF", formats: ["MP4", "WEBM", "MOV", "AVI", "MKV", "GIF"], optionTitle: "Keep audio track", optionCopy: "Include the original sound when available", optionDefault: true, premiumOption: false },
    audio: { accept: "audio/*,.flac,.m4a,.ogg,.wav", title: "Drop audio files here", copy: "MP3, WAV, AAC, FLAC, OGG or M4A", formats: ["MP3", "WAV", "AAC", "FLAC", "OGG", "M4A"], optionTitle: "Strip metadata", optionCopy: "Remove available artist and track information", optionDefault: false, premiumOption: true }
  };

  const tabs = Array.from(document.querySelectorAll(".converter-mode-tab"));
  const input = document.getElementById("converterFileInput");
  const dropzone = document.getElementById("converterDropzone");
  const dropzoneTitle = document.getElementById("dropzoneTitle");
  const dropzoneCopy = document.getElementById("dropzoneCopy");
  const format = document.getElementById("converterFormat");
  const quality = document.getElementById("converterQuality");
  const qualityValue = document.getElementById("qualityValue");
  const qualityGroup = document.getElementById("qualityGroup");
  const converterOption = document.getElementById("converterOption");
  const converterToggle = converterOption.closest(".converter-toggle");
  const converterToggleRow = converterOption.closest(".converter-toggle-row");
  const premiumCrown = document.getElementById("metadataPremiumCrown");
  const optionTitle = document.getElementById("optionTitle");
  const optionCopy = document.getElementById("optionCopy");
  const fileList = document.getElementById("converterFileList");
  const startButton = document.getElementById("converterStart");
  const startButtonLabel = startButton.querySelector("span");
  const progress = document.getElementById("converterProgress");
  const progressBar = document.getElementById("converterProgressBar");
  const message = document.getElementById("converterMessage");
  const usagePanel = document.getElementById("converterUsage");
  const usageText = document.getElementById("converterUsageText");
  const usageCount = document.getElementById("converterUsageCount");
  const upgradeOverlay = document.getElementById("converterUpgradeOverlay");
  const upgradeTitle = document.getElementById("converterUpgradeTitle");
  const upgradeText = document.getElementById("converterUpgradeText");
  const upgradeClose = document.getElementById("converterUpgradeClose");
  const upgradeLater = document.getElementById("converterUpgradeLater");
  const nav = document.getElementById("converterNav");
  const menuButton = document.getElementById("converterMenuButton");

  let activeMode = "image";
  let queue = [];
  let nextFileId = 1;
  let isBusy = false;
  let activeItemId = null;
  let batchIndex = 0;
  let batchTotal = 1;
  let accountKey = "guest";
  let premiumUser = false;
  let ffmpegInstance = null;
  let ffmpegFetchFile = null;
  let ffmpegLogs = [];
  const memoryUsage = new Map();
  const ffmpegModuleUrl = new URL("vendor/ffmpeg/ffmpeg/index.js", document.baseURI).href;
  const ffmpegUtilUrl = new URL("vendor/ffmpeg/util/index.js", document.baseURI).href;
  const ffmpegCoreUrl = new URL("vendor/ffmpeg/core/ffmpeg-core.js", document.baseURI).href;
  const ffmpegWasmUrl = new URL("vendor/ffmpeg/core/ffmpeg-core.wasm", document.baseURI).href;

  function redrawIcons() { if (window.lucide) window.lucide.createIcons(); }
  function escapeHtml(value) { return String(value).replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]); }
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
  function usageStorageKey() { return `pmw-converter-usage-v1:${accountKey}:${todayKey()}`; }
  function getDailyUsage() {
    const key = usageStorageKey();
    try {
      const value = Number.parseInt(localStorage.getItem(key) || "0", 10);
      return Number.isFinite(value) ? Math.max(0, value) : 0;
    } catch (_) { return memoryUsage.get(key) || 0; }
  }
  function setDailyUsage(value) {
    const safeValue = Math.max(0, Math.floor(value));
    const key = usageStorageKey();
    memoryUsage.set(key, safeValue);
    try { localStorage.setItem(key, String(safeValue)); } catch (_) {}
  }
  function dailyRemaining() { return premiumUser ? Number.POSITIVE_INFINITY : Math.max(0, DAILY_FREE_LIMIT - getDailyUsage()); }
  function updateUsageDisplay() {
    if (premiumUser) {
      usagePanel.classList.add("is-premium");
      usageText.textContent = "Unlimited premium conversions";
      usageCount.textContent = "Unlimited";
      return;
    }
    const used = Math.min(DAILY_FREE_LIMIT, getDailyUsage());
    const remaining = DAILY_FREE_LIMIT - used;
    usagePanel.classList.remove("is-premium");
    usageText.textContent = `${remaining} free conversion${remaining === 1 ? "" : "s"} left today`;
    usageCount.textContent = `${used} / ${DAILY_FREE_LIMIT}`;
  }
  function optionIsLocked() { return Boolean(modes[activeMode].premiumOption && !premiumUser); }
  function updateOptionAccess(resetValue) {
    const config = modes[activeMode];
    if (resetValue) converterOption.checked = config.optionDefault;
    premiumCrown.hidden = !config.premiumOption;
    converterToggleRow.classList.toggle("is-premium-locked", optionIsLocked());
    converterOption.disabled = isBusy || optionIsLocked();
    converterToggle.hidden = false;
    if (optionIsLocked()) converterOption.checked = false;
  }
  function showUpgradePrompt(reason) {
    if (reason === "metadata") {
      upgradeTitle.textContent = "Premium metadata controls";
      upgradeText.textContent = "Metadata stripping is available with a paid PMW Visuals plan. Upgrade to remove embedded image, artist, and track information.";
    } else {
      upgradeTitle.textContent = "Daily free limit reached";
      upgradeText.textContent = `The free plan includes ${DAILY_FREE_LIMIT} file conversions each day. Upgrade for unlimited batch conversions and premium metadata controls.`;
    }
    upgradeOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    upgradeClose.focus();
  }
  function closeUpgradePrompt() { upgradeOverlay.hidden = true; document.body.style.overflow = ""; }
  async function initializeMembership() {
    try {
      const [{ auth }, { onAuthStateChanged }, { isPremiumUser }] = await Promise.all([
        import(new URL("js/firebase.js", document.baseURI).href),
        import("https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js"),
        import(new URL("js/premium-access.js?v=20260718-premium-gate", document.baseURI).href)
      ]);
      onAuthStateChanged(auth, async (user) => {
        accountKey = user ? user.uid : "guest";
        premiumUser = user ? await isPremiumUser(user) : false;
        updateUsageDisplay(); updateOptionAccess(false); updateStartButton();
      });
    } catch (error) {
      console.warn("PMW account status is unavailable; using free converter access.", error);
      updateUsageDisplay(); updateOptionAccess(false);
    }
  }

  function setFormats(items) { format.innerHTML = items.map((item) => `<option value="${item.toLowerCase()}">${item}</option>`).join(""); }
  function formatSupportsQuality() {
    const supported = { image: ["jpg", "webp", "gif"], video: ["mp4", "webm", "mov", "avi", "mkv", "gif"], audio: ["mp3", "aac", "ogg", "m4a"] };
    return supported[activeMode].includes(format.value);
  }
  function updateQualityControl() { const supported = formatSupportsQuality(); qualityGroup.hidden = !supported; quality.disabled = isBusy || !supported; }
  function revokeItemUrls(item) { if (item.previewUrl) URL.revokeObjectURL(item.previewUrl); if (item.outputUrl) URL.revokeObjectURL(item.outputUrl); }
  function clearQueue() {
    if (isBusy) return;
    queue.forEach(revokeItemUrls); queue = []; input.value = "";
    progress.classList.remove("visible"); progress.setAttribute("aria-hidden", "true"); progressBar.style.width = "0%";
    message.textContent = "Select one or more files to prepare conversion."; renderQueue();
  }
  function resetQueueOutputs() {
    if (isBusy) return;
    queue.forEach((item) => {
      if (item.outputUrl) URL.revokeObjectURL(item.outputUrl);
      Object.assign(item, { outputUrl: "", outputName: "", outputSize: 0, error: "", status: "pending", progress: 0 });
    });
    if (queue.length) message.textContent = `Ready to prepare ${queue.length} ${format.value.toUpperCase()} file${queue.length === 1 ? "" : "s"}.`;
    renderQueue();
  }
  function pendingItems() { return queue.filter((item) => item.status === "pending" || item.status === "error"); }
  function updateStartButton() {
    const count = pendingItems().length;
    startButton.disabled = isBusy || count === 0;
    if (isBusy) return;
    startButtonLabel.textContent = count ? `Convert ${count} file${count === 1 ? "" : "s"}` : queue.length ? "All files converted" : "Convert files";
  }
  function itemStatusText(item) {
    if (item.status === "converting") return "Converting on your device";
    if (item.status === "complete") return `${readableSize(item.outputSize)} - ${format.value.toUpperCase()} ready`;
    if (item.status === "error") return item.error || "Conversion failed";
    return `${readableSize(item.file.size)} - Ready`;
  }
  function renderQueue() {
    fileList.classList.toggle("visible", queue.length > 0);
    if (!queue.length) { fileList.innerHTML = ""; updateStartButton(); return; }
    const rows = queue.map((item) => {
      const icon = activeMode === "image" ? "image" : activeMode === "video" ? "film" : "audio-lines";
      const preview = item.previewUrl ? `<img src="${item.previewUrl}" alt="">` : `<i data-lucide="${icon}" aria-hidden="true"></i>`;
      const download = item.status === "complete" && item.outputUrl ? `<a class="converter-file-download" href="${item.outputUrl}" download="${escapeHtml(item.outputName)}" aria-label="Download ${escapeHtml(item.outputName)}" title="Download"><i data-lucide="download" aria-hidden="true"></i></a>` : "";
      return `<article class="converter-file is-${item.status}" data-file-id="${item.id}"><div class="converter-file-preview">${preview}</div><div class="converter-file-meta"><p class="converter-file-name">${escapeHtml(item.file.name)}</p><p class="converter-file-size converter-file-status">${escapeHtml(itemStatusText(item))}</p></div><div class="converter-file-actions">${download}<button class="converter-file-remove" type="button" data-remove-file="${item.id}" aria-label="Remove ${escapeHtml(item.file.name)}" title="Remove"><i data-lucide="x" aria-hidden="true"></i></button></div><div class="converter-file-progress"${item.status === "converting" ? "" : " hidden"}><span style="width:${item.progress || 0}%"></span></div></article>`;
    }).join("");
    fileList.innerHTML = `<div class="converter-queue-head"><strong>${queue.length} selected file${queue.length === 1 ? "" : "s"}</strong><button class="converter-clear-files" type="button" data-clear-files>Clear all</button></div>${rows}`;
    fileList.querySelectorAll("button").forEach((button) => { button.disabled = isBusy; });
    updateStartButton(); redrawIcons();
  }
  function fileIsValid(file) {
    const extension = (file.name.split(".").pop() || "").toLowerCase();
    const extraAllowed = { image: ["tif", "tiff"], video: ["mkv", "avi"], audio: ["flac", "m4a", "ogg", "wav"] };
    return file.type.startsWith(`${activeMode}/`) || extraAllowed[activeMode].includes(extension);
  }
  function addFiles(fileCollection) {
    if (isBusy) return;
    const files = Array.from(fileCollection || []); if (!files.length) return;
    const sizeLimit = activeMode === "image" ? 100 * 1024 * 1024 : 200 * 1024 * 1024;
    let available = premiumUser ? Number.POSITIVE_INFINITY : Math.max(0, dailyRemaining() - pendingItems().length);
    let invalid = 0, oversized = 0, blocked = 0, added = 0;
    files.forEach((file) => {
      if (!fileIsValid(file)) { invalid += 1; return; }
      if (file.size > sizeLimit) { oversized += 1; return; }
      if (available <= 0) { blocked += 1; return; }
      queue.push({ id: nextFileId++, file, previewUrl: activeMode === "image" && file.type.startsWith("image/") ? URL.createObjectURL(file) : "", outputUrl: "", outputName: "", outputSize: 0, error: "", progress: 0, status: "pending" });
      available -= 1; added += 1;
    });
    input.value = "";
    if (added) message.textContent = `${added} file${added === 1 ? "" : "s"} added. Choose one output format for this batch.`;
    if (invalid) message.textContent = `${invalid} file${invalid === 1 ? " was" : "s were"} not valid for the ${activeMode} converter.`;
    if (oversized) message.textContent = `${oversized} file${oversized === 1 ? " exceeds" : "s exceed"} the ${readableSize(sizeLimit)} per-file limit.`;
    renderQueue(); if (blocked) showUpgradePrompt("limit");
  }
  function removeFile(id) {
    if (isBusy) return;
    const index = queue.findIndex((item) => item.id === id); if (index < 0) return;
    revokeItemUrls(queue[index]); queue.splice(index, 1);
    if (!queue.length) message.textContent = "Select one or more files to prepare conversion.";
    renderQueue();
  }
  function setMode(mode) {
    activeMode = mode; const config = modes[mode];
    tabs.forEach((tab) => { const selected = tab.dataset.mode === mode; tab.classList.toggle("active", selected); tab.setAttribute("aria-selected", String(selected)); });
    input.accept = config.accept; dropzoneTitle.textContent = config.title; dropzoneCopy.textContent = config.copy;
    optionTitle.textContent = config.optionTitle; optionCopy.textContent = config.optionCopy; converterOption.setAttribute("aria-label", config.optionTitle);
    setFormats(config.formats); updateQualityControl(); updateOptionAccess(true); clearQueue();
  }
  function setProgress(value) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    const overall = isBusy ? ((batchIndex + safeValue / 100) / Math.max(1, batchTotal)) * 100 : safeValue;
    progress.classList.add("visible"); progress.setAttribute("aria-hidden", "false"); progressBar.style.width = `${Math.round(overall)}%`;
    if (activeItemId !== null) {
      const item = queue.find((entry) => entry.id === activeItemId); if (item) item.progress = safeValue;
      const rowProgress = fileList.querySelector(`[data-file-id="${activeItemId}"] .converter-file-progress span`); if (rowProgress) rowProgress.style.width = `${safeValue}%`;
    }
  }
  function setBusy(value) {
    isBusy = value; tabs.forEach((tab) => { tab.disabled = value; }); input.disabled = value; format.disabled = value;
    quality.disabled = value || !formatSupportsQuality(); converterOption.disabled = value || optionIsLocked(); startButton.disabled = value || pendingItems().length === 0;
    fileList.querySelectorAll("button").forEach((button) => { button.disabled = value; }); dropzone.setAttribute("aria-disabled", String(value));
    if (!value) updateStartButton();
  }

  async function getFfmpeg() {
    if (ffmpegInstance && ffmpegInstance.loaded) return ffmpegInstance;
    message.textContent = "Loading the on-device media engine..."; setProgress(5);
    try {
      const [{ FFmpeg }, { fetchFile }] = await Promise.all([import(ffmpegModuleUrl), import(ffmpegUtilUrl)]);
      ffmpegFetchFile = fetchFile; const engine = new FFmpeg();
      engine.on("log", ({ message: logMessage }) => { ffmpegLogs.push(logMessage); if (ffmpegLogs.length > 40) ffmpegLogs.shift(); });
      engine.on("progress", ({ progress: ratio }) => { if (Number.isFinite(ratio)) setProgress(12 + ratio * 86); });
      await engine.load({ coreURL: ffmpegCoreUrl, wasmURL: ffmpegWasmUrl });
      message.textContent = "Media engine ready. Reading your file...";
      ffmpegInstance = engine; return engine;
    } catch (error) {
      console.error("FFmpeg engine load failed", error); ffmpegInstance = null; ffmpegFetchFile = null;
      throw new Error("The on-device media engine could not be loaded. Refresh the page and try again.", { cause: error });
    }
  }
  function outputExtension(selectedFormat) { return selectedFormat === "jpeg" ? "jpg" : selectedFormat; }
  function outputMime(mode, selectedFormat) {
    const imageTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", bmp: "image/bmp", tiff: "image/tiff" };
    const videoTypes = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska", gif: "image/gif" };
    const audioTypes = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4" };
    return (mode === "image" ? imageTypes : mode === "video" ? videoTypes : audioTypes)[selectedFormat] || "application/octet-stream";
  }
  function makeOutputName(file, selectedFormat) {
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "pmw-file";
    return `${base}-converted.${outputExtension(selectedFormat)}`;
  }
  async function convertNativeImage(file, selectedFormat) {
    const mime = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[selectedFormat];
    if (!mime) return null;
    let bitmap = null;
    try {
      setProgress(15); bitmap = await createImageBitmap(file); const canvas = document.createElement("canvas");
      canvas.width = bitmap.width; canvas.height = bitmap.height; const context = canvas.getContext("2d", { alpha: selectedFormat !== "jpg" }); if (!context) return null;
      if (selectedFormat === "jpg") { context.fillStyle = "#fff"; context.fillRect(0, 0, canvas.width, canvas.height); }
      context.drawImage(bitmap, 0, 0); setProgress(70);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, Number(quality.value) / 100));
      if (!blob || blob.type !== mime) return null; setProgress(100); return blob;
    } catch (_) { return null; } finally { if (bitmap) bitmap.close(); }
  }
  function buildFfmpegArgs(inputName, outputName, selectedFormat) {
    const qualityNumber = Number(quality.value);
    const crf = String(Math.max(12, Math.min(30, Math.round(38 - qualityNumber * .28))));
    const imageQ = String(Math.max(2, Math.min(18, Math.round(22 - qualityNumber * .2))));
    const audioBitrate = qualityNumber >= 85 ? "256k" : qualityNumber >= 60 ? "192k" : "128k";
    const gifFps = qualityNumber >= 85 ? 18 : qualityNumber >= 60 ? 12 : 8;
    const gifWidth = qualityNumber >= 85 ? 1080 : qualityNumber >= 60 ? 720 : 480;
    const gifColors = qualityNumber >= 85 ? 256 : qualityNumber >= 60 ? 192 : 128;
    const gifFilter = `fps=${gifFps},scale=${gifWidth}:-2:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${gifColors}:stats_mode=diff[p];[s1][p]paletteuse=dither=sierra2_4a`;
    const stripMetadata = premiumUser && converterOption.checked;
    const args = ["-i", inputName];
    if (activeMode === "image") {
      args.push("-frames:v", "1"); if (selectedFormat === "jpg") args.push("-q:v", imageQ); if (selectedFormat === "webp") args.push("-q:v", String(qualityNumber));
      if (selectedFormat === "gif") args.push("-vf", `scale=${gifWidth}:-2:flags=lanczos`); if (stripMetadata) args.push("-map_metadata", "-1");
    } else if (activeMode === "video") {
      if (["mp4", "mov", "mkv"].includes(selectedFormat)) args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", crf, "-c:a", "aac");
      if (selectedFormat === "mp4") args.push("-movflags", "+faststart");
      if (selectedFormat === "webm") args.push("-c:v", "libvpx", "-crf", crf, "-b:v", "0", "-deadline", "good", "-cpu-used", "4", "-c:a", "libopus");
      if (selectedFormat === "avi") args.push("-c:v", "mpeg4", "-q:v", imageQ, "-c:a", "mp3");
      if (selectedFormat === "gif") args.push("-an", "-filter_complex", gifFilter); if (!converterOption.checked && selectedFormat !== "gif") args.push("-an");
    } else {
      args.push("-vn"); if (selectedFormat === "mp3") args.push("-c:a", "libmp3lame", "-b:a", audioBitrate); if (selectedFormat === "wav") args.push("-c:a", "pcm_s16le");
      if (["aac", "m4a"].includes(selectedFormat)) args.push("-c:a", "aac", "-b:a", audioBitrate); if (selectedFormat === "flac") args.push("-c:a", "flac");
      if (selectedFormat === "ogg") args.push("-c:a", "libvorbis", "-b:a", audioBitrate); args.push("-map_metadata", stripMetadata ? "-1" : "0");
    }
    args.push("-y", outputName); return args;
  }
  async function convertWithFfmpeg(file, selectedFormat, itemId) {
    const engine = await getFfmpeg();
    const extension = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const inputName = `pmw-input-${itemId}.${extension}`; const outputName = `pmw-output-${itemId}.${outputExtension(selectedFormat)}`;
    const sourceData = await ffmpegFetchFile(file);
    message.textContent = "Sending the file to the on-device engine...";
    await engine.writeFile(inputName, sourceData);
    message.textContent = "Converting the file on your device...";
    try {
      ffmpegLogs = []; const exitCode = await engine.exec(buildFfmpegArgs(inputName, outputName, selectedFormat));
      if (exitCode !== 0) { console.error("FFmpeg conversion log", ffmpegLogs.join("\n")); throw new Error(`${selectedFormat.toUpperCase()} conversion is not supported for this source file.`); }
      const data = await engine.readFile(outputName); setProgress(100); if (!data || !data.byteLength) throw new Error("The converter produced an empty file. Try another source format.");
      return new Blob([data], { type: outputMime(activeMode, selectedFormat) });
    } catch (error) {
      if (error instanceof WebAssembly.RuntimeError || /memory access out of bounds/i.test(String(error && error.message))) {
        try { engine.terminate(); } catch (_) {} ffmpegInstance = null; ffmpegFetchFile = null;
        throw new Error("The media engine ran out of memory. It has been reset; try this file again.", { cause: error });
      }
      throw error;
    } finally { try { await engine.deleteFile(inputName); } catch (_) {} try { await engine.deleteFile(outputName); } catch (_) {} }
  }
  async function convertQueue() {
    const items = pendingItems(); if (!items.length) return;
    if (!premiumUser && dailyRemaining() <= 0) { showUpgradePrompt("limit"); return; }
    const selectedFormat = format.value; let completed = 0, failed = 0;
    batchTotal = items.length; batchIndex = 0; setBusy(true); setProgress(0);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index]; if (!premiumUser && dailyRemaining() <= 0) { showUpgradePrompt("limit"); break; }
      batchIndex = index; activeItemId = item.id; Object.assign(item, { status: "converting", error: "", progress: 0 });
      startButtonLabel.textContent = `Converting ${index + 1} of ${items.length}`; message.textContent = `Converting ${item.file.name} on your device...`; renderQueue();
      try {
        let blob = activeMode === "image" ? await convertNativeImage(item.file, selectedFormat) : null; if (!blob) blob = await convertWithFfmpeg(item.file, selectedFormat, item.id);
        if (item.outputUrl) URL.revokeObjectURL(item.outputUrl); Object.assign(item, { outputUrl: URL.createObjectURL(blob), outputName: makeOutputName(item.file, selectedFormat), outputSize: blob.size, status: "complete", progress: 100 });
        completed += 1; if (!premiumUser) setDailyUsage(getDailyUsage() + 1); updateUsageDisplay();
      } catch (error) {
        console.error("PMW conversion failed", error); item.status = "error"; item.error = error && error.message ? error.message : "This file could not be converted."; failed += 1;
      }
      renderQueue();
    }
    activeItemId = null; batchIndex = batchTotal; setBusy(false); if (completed) setProgress(100); else progress.classList.remove("visible");
    if (failed) message.textContent = `${completed} converted - ${failed} failed. Failed files can be retried.`;
    else if (completed) message.textContent = `${completed} file${completed === 1 ? "" : "s"} converted. Use each download button when ready.`;
    updateStartButton();
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  dropzone.addEventListener("click", () => { if (!isBusy) input.click(); });
  dropzone.addEventListener("keydown", (event) => { if (!isBusy && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); input.click(); } });
  input.addEventListener("change", () => addFiles(input.files));
  ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); if (!isBusy) dropzone.classList.add("is-dragging"); }));
  ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => { event.preventDefault(); dropzone.classList.remove("is-dragging"); }));
  dropzone.addEventListener("drop", (event) => addFiles(event.dataTransfer.files));
  fileList.addEventListener("click", (event) => { const remove = event.target.closest("[data-remove-file]"); const clear = event.target.closest("[data-clear-files]"); if (remove) removeFile(Number(remove.dataset.removeFile)); if (clear) clearQueue(); });
  quality.addEventListener("input", () => { qualityValue.textContent = `${quality.value}%`; resetQueueOutputs(); });
  format.addEventListener("change", () => { updateQualityControl(); resetQueueOutputs(); });
  converterOption.addEventListener("change", resetQueueOutputs);
  converterToggleRow.addEventListener("click", (event) => { if (optionIsLocked()) { event.preventDefault(); showUpgradePrompt("metadata"); } });
  premiumCrown.addEventListener("click", (event) => { event.preventDefault(); event.stopPropagation(); if (!premiumUser) showUpgradePrompt("metadata"); });
  startButton.addEventListener("click", convertQueue);
  upgradeClose.addEventListener("click", closeUpgradePrompt); upgradeLater.addEventListener("click", closeUpgradePrompt);
  upgradeOverlay.addEventListener("click", (event) => { if (event.target === upgradeOverlay) closeUpgradePrompt(); });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !upgradeOverlay.hidden) closeUpgradePrompt(); });
  menuButton.addEventListener("click", () => { const open = nav.classList.toggle("mobile-open"); menuButton.setAttribute("aria-expanded", String(open)); });

  setMode("image"); updateUsageDisplay(); updateOptionAccess(true);
  if (location.hostname !== "127.0.0.1") initializeMembership();
  redrawIcons();
})();
