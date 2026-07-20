(function () {
  "use strict";

  const state = {
    file: null,
    image: null,
    previewUrl: "",
    outputUrl: ""
  };

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

  function drawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function readableSize(bytes) {
    if (!bytes) return "0 KB";
    const units = ["B", "KB", "MB", "GB"];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    return `${(bytes / Math.pow(1024, index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
  }

  function extensionFor(type) {
    if (type === "image/jpeg") return "jpg";
    if (type === "image/webp") return "webp";
    return "png";
  }

  function safeBaseName(name) {
    return (name || "pmw-image").replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "pmw-image";
  }

  function clearOutput() {
    if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
    state.outputUrl = "";
    result.classList.remove("visible");
    resultImage.removeAttribute("src");
    resultDownload.removeAttribute("href");
    resultDownload.removeAttribute("download");
    resultMeta.innerHTML = "";
  }

  function setMessage(text) {
    message.textContent = text;
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

  function drawImageToCanvas(width, height, fillBackground) {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (fillBackground) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(state.image, 0, 0, canvas.width, canvas.height);
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
    if (!state.file || !state.image) {
      preview.classList.remove("visible");
      action.disabled = true;
      return;
    }

    preview.innerHTML = `
      <img src="${state.previewUrl}" alt="">
      <div>
        <strong>${state.file.name}</strong>
        <span>${readableSize(state.file.size)} - ${state.image.naturalWidth}x${state.image.naturalHeight}</span>
      </div>
    `;
    preview.classList.add("visible");
    action.disabled = false;
  }

  async function setFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage("Please choose an image file.");
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
      syncSizeInputs();
      setMessage("Ready.");
    } catch (error) {
      state.file = null;
      setMessage(error.message);
      updateFilePreview();
    }
  }

  function syncSizeInputs() {
    if (page !== "resizer" || !state.image) return;
    const width = document.getElementById("resizeWidth");
    const height = document.getElementById("resizeHeight");
    width.value = state.image.naturalWidth;
    height.value = state.image.naturalHeight;
    width.dataset.last = width.value;
    height.dataset.last = height.value;
  }

  function selectedType() {
    const format = document.getElementById("outputFormat")?.value || "image/png";
    return format;
  }

  async function runConverter() {
    const type = selectedType();
    const quality = Number(document.getElementById("convertQuality")?.value || 92) / 100;
    const fillBackground = type === "image/jpeg";
    const canvas = drawImageToCanvas(state.image.naturalWidth, state.image.naturalHeight, fillBackground);
    const blob = await canvasToBlob(canvas, type, quality);
    const fileName = `${safeBaseName(state.file.name)}-pmw-converted.${extensionFor(type)}`;
    showResult(blob, fileName, [
      `<strong>Output:</strong> ${type.replace("image/", "").toUpperCase()}`,
      `<strong>Size:</strong> ${readableSize(blob.size)}`,
      `<strong>Resolution:</strong> ${canvas.width}x${canvas.height}`
    ]);
  }

  async function runResizer() {
    const widthInput = document.getElementById("resizeWidth");
    const heightInput = document.getElementById("resizeHeight");
    const type = document.getElementById("resizeFormat").value;
    const width = Number.parseInt(widthInput.value, 10);
    const height = Number.parseInt(heightInput.value, 10);
    if (!width || !height || width < 1 || height < 1) {
      throw new Error("Enter a valid width and height.");
    }
    const canvas = drawImageToCanvas(width, height, type === "image/jpeg");
    const blob = await canvasToBlob(canvas, type, .92);
    const fileName = `${safeBaseName(state.file.name)}-${width}x${height}.${extensionFor(type)}`;
    showResult(blob, fileName, [
      `<strong>Original:</strong> ${state.image.naturalWidth}x${state.image.naturalHeight}`,
      `<strong>Resized:</strong> ${width}x${height}`,
      `<strong>New size:</strong> ${readableSize(blob.size)}`
    ]);
  }

  async function runCompressor() {
    const type = document.getElementById("compressFormat").value;
    const quality = Number(document.getElementById("compressQuality").value) / 100;
    const canvas = drawImageToCanvas(state.image.naturalWidth, state.image.naturalHeight, type === "image/jpeg");
    const blob = await canvasToBlob(canvas, type, quality);
    const saved = state.file.size > 0 ? Math.max(0, Math.round((1 - blob.size / state.file.size) * 100)) : 0;
    const fileName = `${safeBaseName(state.file.name)}-pmw-compressed.${extensionFor(type)}`;
    showResult(blob, fileName, [
      `<strong>Before:</strong> ${readableSize(state.file.size)}`,
      `<strong>After:</strong> ${readableSize(blob.size)}`,
      `<strong>Saved:</strong> ${saved}%`
    ]);
  }

  async function runTool() {
    if (!state.file || !state.image) {
      setMessage("Upload an image first.");
      return;
    }
    action.disabled = true;
    setMessage("Processing locally in your browser...");
    try {
      if (page === "converter") await runConverter();
      if (page === "resizer") await runResizer();
      if (page === "compressor") await runCompressor();
      setMessage("Done. Your image was processed on this device.");
    } catch (error) {
      setMessage(error.message || "The tool could not process this image.");
    } finally {
      action.disabled = false;
    }
  }

  function bindDropzone() {
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
      const update = () => { output.textContent = `${range.value}%`; };
      range.addEventListener("input", update);
      update();
    });
  }

  function bindAspectRatio() {
    if (page !== "resizer") return;
    const width = document.getElementById("resizeWidth");
    const height = document.getElementById("resizeHeight");
    const keep = document.getElementById("keepAspect");
    const updateFromWidth = () => {
      if (!keep.checked || !state.image) return;
      height.value = Math.max(1, Math.round(Number(width.value) * state.image.naturalHeight / state.image.naturalWidth));
    };
    const updateFromHeight = () => {
      if (!keep.checked || !state.image) return;
      width.value = Math.max(1, Math.round(Number(height.value) * state.image.naturalWidth / state.image.naturalHeight));
    };
    width.addEventListener("input", updateFromWidth);
    height.addEventListener("input", updateFromHeight);
  }

  if (!page || !input || !dropzone || !action) return;
  bindDropzone();
  bindRanges();
  bindAspectRatio();
  action.addEventListener("click", runTool);
  drawIcons();
})();
