(function () {
  "use strict";

  const modes = {
    image: {
      accept: "image/*,.heic,.heif,.tif,.tiff",
      title: "Drop an image here",
      copy: "JPG, PNG, WEBP, GIF, BMP, TIFF or HEIC",
      formats: ["JPG", "PNG", "WEBP", "AVIF", "GIF", "BMP", "TIFF"],
      optionTitle: "Preserve metadata",
      optionCopy: "Keep available image information"
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
  const message = document.getElementById("converterMessage");
  const nav = document.getElementById("converterNav");
  const menuButton = document.getElementById("converterMenuButton");
  let activeMode = "image";
  let previewUrl = "";

  function redrawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function setFormats(items) {
    format.innerHTML = items.map((item) => `<option value="${item.toLowerCase()}">${item}</option>`).join("");
  }

  function clearFile() {
    input.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    fileRow.classList.remove("visible");
    filePreview.innerHTML = '<i data-lucide="file" aria-hidden="true"></i>';
    fileName.textContent = "";
    fileSize.textContent = "";
    startButton.disabled = true;
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
      image: ["heic", "heif", "tif", "tiff"],
      video: ["mkv", "avi"],
      audio: ["flac", "m4a", "ogg", "wav"]
    };
    if (!file.type.startsWith(expectedPrefix) && !extraAllowed[activeMode].includes(extension)) {
      message.textContent = `Choose a valid ${activeMode} file for this converter.`;
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
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
  quality.addEventListener("input", () => { qualityValue.textContent = `${quality.value}%`; });
  format.addEventListener("change", () => {
    if (!startButton.disabled) message.textContent = `Ready to prepare a ${format.value.toUpperCase()} file.`;
  });
  startButton.addEventListener("click", () => {
    message.textContent = "The conversion engine will be connected in the next build phase.";
  });
  menuButton.addEventListener("click", () => {
    const open = nav.classList.toggle("mobile-open");
    menuButton.setAttribute("aria-expanded", String(open));
  });

  setMode("image");
  redrawIcons();
})();
