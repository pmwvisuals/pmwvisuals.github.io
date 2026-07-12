(function () {
  "use strict";

  const modes = {
    image: {
      accept: "image/*,.tif,.tiff",
      title: "Drop an image here",
      copy: "JPG, PNG, WEBP, GIF, BMP, TIFF or AVIF",
      formats: ["JPG", "PNG", "WEBP", "AVIF", "GIF", "BMP", "TIFF"],
      optionTitle: "Remove metadata",
      optionCopy: "Strip embedded image information"
    },
    video: {
      accept: "video/*,.mkv,.avi",
      title: "Drop a video here",
      copy: "MP4, MOV, WEBM, AVI, MKV or MPEG",
      formats: ["MP4", "WEBM", "MOV", "AVI", "MKV", "GIF"],
      optionTitle: "Keep audio track",
      optionCopy: "Include the original sound when available"
    },
    audio: {
      accept: "audio/*,.flac,.m4a,.ogg,.wav",
      title: "Drop an audio file here",
      copy: "MP3, WAV, AAC, FLAC, OGG or M4A",
      formats: ["MP3", "WAV", "AAC", "FLAC", "OGG", "M4A"],
      optionTitle: "Preserve metadata",
      optionCopy: "Keep available artist and track information"
    }
  };

  const tabs = Array.from(document.querySelectorAll(".converter-mode-tab"));
  const input = document.getElementById("converterFileInput");
  const dropzone = document.getElementById("converterDropzone");
  const dropzoneTitle = document.getElementById("dropzoneTitle");
  const dropzoneCopy = document.getElementById("dropzoneCopy");
  const format = document.getElementById("converterFormat");
  const quality = document.getElementById("converterQuality");
  const qualityValue = document.getElementById("qualityValue");
  const optionTitle = document.getElementById("optionTitle");
  const optionCopy = document.getElementById("optionCopy");
  const fileRow = document.getElementById("converterFile");
  const filePreview = document.getElementById("converterFilePreview");
  const fileName = document.getElementById("converterFileName");
  const fileSize = document.getElementById("converterFileSize");
  const removeButton = document.getElementById("converterFileRemove");
  const startButton = document.getElementById("converterStart");
  const startButtonLabel = startButton.querySelector("span");
  const progress = document.getElementById("converterProgress");
  const progressBar = document.getElementById("converterProgressBar");
  const download = document.getElementById("converterDownload");
  const message = document.getElementById("converterMessage");
  const nav = document.getElementById("converterNav");
  const menuButton = document.getElementById("converterMenuButton");
  let activeMode = "image";
  let previewUrl = "";
  let outputUrl = "";
  let currentFile = null;
  let ffmpegInstance = null;

  const ffmpegScript = "https://cdn.jsdelivr.net/npm/@ffmpeg/ffmpeg@0.11.6/dist/ffmpeg.min.js";
  const ffmpegCore = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js";

  function redrawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function setFormats(items) {
    format.innerHTML = items.map((item) => `<option value="${item.toLowerCase()}">${item}</option>`).join("");
  }

  function clearFile() {
    input.value = "";
    currentFile = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    previewUrl = "";
    outputUrl = "";
    fileRow.classList.remove("visible");
    filePreview.innerHTML = '<i data-lucide="file" aria-hidden="true"></i>';
    fileName.textContent = "";
    fileSize.textContent = "";
    startButton.disabled = true;
    startButtonLabel.textContent = "Convert file";
    progress.classList.remove("visible");
    progress.setAttribute("aria-hidden", "true");
    progressBar.style.width = "0%";
    download.hidden = true;
    download.removeAttribute("href");
    message.textContent = "Select a file to prepare conversion.";
    redrawIcons();
  }

  function setMode(mode) {
    activeMode = mode;
    const config = modes[mode];
    tabs.forEach((tab) => {
      const selected = tab.dataset.mode === mode;
      tab.classList.toggle("active", selected);
      tab.setAttribute("aria-selected", String(selected));
    });
    input.accept = config.accept;
    dropzoneTitle.textContent = config.title;
    dropzoneCopy.textContent = config.copy;
    optionTitle.textContent = config.optionTitle;
    optionCopy.textContent = config.optionCopy;
    document.getElementById("converterOption").setAttribute("aria-label", config.optionTitle);
    setFormats(config.formats);
    clearFile();
  }

  function readableSize(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value.toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
  }

  function showFile(file) {
    if (!file) return;
    const expectedPrefix = `${activeMode}/`;
    const extension = file.name.split(".").pop().toLowerCase();
    const extraAllowed = {
      image: ["tif", "tiff"],
      video: ["mkv", "avi"],
      audio: ["flac", "m4a", "ogg", "wav"]
    };
    if (!file.type.startsWith(expectedPrefix) && !extraAllowed[activeMode].includes(extension)) {
      message.textContent = `Choose a valid ${activeMode} file for this converter.`;
      return;
    }

    const limit = activeMode === "image" ? 100 * 1024 * 1024 : 200 * 1024 * 1024;
    if (file.size > limit) {
      message.textContent = `${activeMode === "image" ? "Images" : "Media files"} must be smaller than ${readableSize(limit)}.`;
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    currentFile = file;
    outputUrl = "";
    download.hidden = true;
    progress.classList.remove("visible");
    progressBar.style.width = "0%";
    fileName.textContent = file.name;
    fileSize.textContent = `${readableSize(file.size)} · ${activeMode.charAt(0).toUpperCase() + activeMode.slice(1)} source`;
    fileRow.classList.add("visible");
    startButton.disabled = false;
    message.textContent = `Ready to prepare a ${format.value.toUpperCase()} file.`;

    if (activeMode === "image" && file.type.startsWith("image/")) {
      previewUrl = URL.createObjectURL(file);
      filePreview.innerHTML = `<img src="${previewUrl}" alt="Selected image preview">`;
    } else {
      const icon = activeMode === "video" ? "film" : "audio-lines";
      filePreview.innerHTML = `<i data-lucide="${icon}" aria-hidden="true"></i>`;
      redrawIcons();
    }
  }

  tabs.forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
  dropzone.addEventListener("click", () => input.click());
  dropzone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      input.click();
    }
  });
  input.addEventListener("change", () => showFile(input.files[0]));
  ["dragenter", "dragover"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.add("is-dragging");
  }));
  ["dragleave", "drop"].forEach((name) => dropzone.addEventListener(name, (event) => {
    event.preventDefault();
    dropzone.classList.remove("is-dragging");
  }));
  dropzone.addEventListener("drop", (event) => showFile(event.dataTransfer.files[0]));
  removeButton.addEventListener("click", clearFile);
  quality.addEventListener("input", () => {
    qualityValue.textContent = `${quality.value}%`;
    download.hidden = true;
    if (currentFile) message.textContent = `Ready to prepare a ${format.value.toUpperCase()} file.`;
  });
  format.addEventListener("change", () => {
    if (!startButton.disabled) {
      download.hidden = true;
      message.textContent = `Ready to prepare a ${format.value.toUpperCase()} file.`;
    }
  });
  startButton.addEventListener("click", convertCurrentFile);
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("mobile-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  setMode("image");
  redrawIcons();

  function setProgress(value) {
    const safeValue = Math.max(0, Math.min(100, Math.round(value)));
    progress.classList.add("visible");
    progress.setAttribute("aria-hidden", "false");
    progressBar.style.width = `${safeValue}%`;
  }

  function setBusy(isBusy) {
    tabs.forEach((tab) => { tab.disabled = isBusy; });
    input.disabled = isBusy;
    format.disabled = isBusy;
    quality.disabled = isBusy;
    removeButton.disabled = isBusy;
    startButton.disabled = isBusy || !currentFile;
    startButtonLabel.textContent = isBusy ? "Converting..." : "Convert file";
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        if (window.FFmpeg) resolve();
        else existing.addEventListener("load", resolve, { once: true });
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => reject(new Error("The media conversion engine could not be loaded."));
      document.head.appendChild(script);
    });
  }

  async function getFfmpeg() {
    if (ffmpegInstance && ffmpegInstance.isLoaded()) return ffmpegInstance;
    message.textContent = "Loading the media engine for the first conversion...";
    setProgress(5);
    await loadScript(ffmpegScript);
    if (!window.FFmpeg) throw new Error("The media conversion engine is unavailable.");
    ffmpegInstance = window.FFmpeg.createFFmpeg({
      log: false,
      corePath: ffmpegCore,
      progress: ({ ratio }) => {
        if (Number.isFinite(ratio)) setProgress(12 + ratio * 86);
      }
    });
    await ffmpegInstance.load();
    return ffmpegInstance;
  }

  function outputExtension(selectedFormat) {
    return selectedFormat === "jpeg" ? "jpg" : selectedFormat;
  }

  function outputMime(mode, selectedFormat) {
    const imageTypes = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", gif: "image/gif", bmp: "image/bmp", tiff: "image/tiff" };
    const videoTypes = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", avi: "video/x-msvideo", mkv: "video/x-matroska", gif: "image/gif" };
    const audioTypes = { mp3: "audio/mpeg", wav: "audio/wav", aac: "audio/aac", flac: "audio/flac", ogg: "audio/ogg", m4a: "audio/mp4" };
    return (mode === "image" ? imageTypes : mode === "video" ? videoTypes : audioTypes)[selectedFormat] || "application/octet-stream";
  }

  function makeOutputName(file, selectedFormat) {
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "pmw-file";
    return `${base}-converted.${outputExtension(selectedFormat)}`;
  }

  async function convertNativeImage(file, selectedFormat) {
    const nativeFormats = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" };
    const mime = nativeFormats[selectedFormat];
    if (!mime) return null;
    setProgress(15);
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const context = canvas.getContext("2d", { alpha: selectedFormat !== "jpg" });
    if (selectedFormat === "jpg") {
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(bitmap, 0, 0);
    bitmap.close();
    setProgress(70);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, Number(quality.value) / 100));
    if (!blob || blob.type !== mime) return null;
    setProgress(100);
    return blob;
  }

  function buildFfmpegArgs(inputName, outputName, selectedFormat) {
    const qualityValueNumber = Number(quality.value);
    const crf = String(Math.max(12, Math.min(30, Math.round(38 - qualityValueNumber * .28))));
    const imageQ = String(Math.max(2, Math.min(18, Math.round(22 - qualityValueNumber * .2))));
    const audioBitrate = qualityValueNumber >= 85 ? "256k" : qualityValueNumber >= 60 ? "192k" : "128k";
    let args = ["-i", inputName];

    if (activeMode === "image") {
      args.push("-frames:v", "1");
      if (selectedFormat === "jpg") args.push("-q:v", imageQ);
      if (selectedFormat === "webp") args.push("-q:v", imageQ);
      if (document.getElementById("converterOption").checked) args.push("-map_metadata", "-1");
    } else if (activeMode === "video") {
      if (selectedFormat === "mp4" || selectedFormat === "mov" || selectedFormat === "mkv") args.push("-c:v", "libx264", "-preset", "veryfast", "-crf", crf, "-c:a", "aac");
      if (selectedFormat === "mp4") args.push("-movflags", "+faststart");
      if (selectedFormat === "webm") args.push("-c:v", "libvpx-vp9", "-crf", crf, "-b:v", "0", "-c:a", "libopus");
      if (selectedFormat === "avi") args.push("-c:v", "mpeg4", "-q:v", imageQ, "-c:a", "mp3");
      if (selectedFormat === "gif") args.push("-an", "-vf", "fps=12,scale=720:-2:flags=lanczos");
      if (!document.getElementById("converterOption").checked && selectedFormat !== "gif") args.push("-an");
    } else {
      args.push("-vn");
      if (selectedFormat === "mp3") args.push("-c:a", "libmp3lame", "-b:a", audioBitrate);
      if (selectedFormat === "wav") args.push("-c:a", "pcm_s16le");
      if (selectedFormat === "aac" || selectedFormat === "m4a") args.push("-c:a", "aac", "-b:a", audioBitrate);
      if (selectedFormat === "flac") args.push("-c:a", "flac");
      if (selectedFormat === "ogg") args.push("-c:a", "libvorbis", "-b:a", audioBitrate);
      if (document.getElementById("converterOption").checked) args.push("-map_metadata", "0");
      else args.push("-map_metadata", "-1");
    }

    args.push("-y", outputName);
    return args;
  }

  async function convertWithFfmpeg(file, selectedFormat) {
    const engine = await getFfmpeg();
    const inputExtension = (file.name.split(".").pop() || "bin").replace(/[^a-z0-9]/gi, "").toLowerCase();
    const inputName = `pmw-input.${inputExtension}`;
    const outputName = `pmw-output.${outputExtension(selectedFormat)}`;
    engine.FS("writeFile", inputName, await window.FFmpeg.fetchFile(file));
    try {
      message.textContent = "Converting in your browser...";
      await engine.run(...buildFfmpegArgs(inputName, outputName, selectedFormat));
      const data = engine.FS("readFile", outputName);
      setProgress(100);
      return new Blob([data.buffer], { type: outputMime(activeMode, selectedFormat) });
    } finally {
      try { engine.FS("unlink", inputName); } catch (_) {}
      try { engine.FS("unlink", outputName); } catch (_) {}
    }
  }

  async function convertCurrentFile() {
    if (!currentFile) return;
    const selectedFormat = format.value;
    setBusy(true);
    download.hidden = true;
    setProgress(2);
    message.textContent = "Preparing your file...";

    try {
      let blob = activeMode === "image" ? await convertNativeImage(currentFile, selectedFormat) : null;
      if (!blob) blob = await convertWithFfmpeg(currentFile, selectedFormat);
      if (outputUrl) URL.revokeObjectURL(outputUrl);
      outputUrl = URL.createObjectURL(blob);
      download.href = outputUrl;
      download.download = makeOutputName(currentFile, selectedFormat);
      download.hidden = false;
      message.textContent = `Conversion complete · ${readableSize(blob.size)}`;
      redrawIcons();
    } catch (error) {
      console.error("PMW conversion failed", error);
      progress.classList.remove("visible");
      message.textContent = error && error.message ? error.message : "This file could not be converted. Try another format.";
    } finally {
      setBusy(false);
    }
  }
})();
