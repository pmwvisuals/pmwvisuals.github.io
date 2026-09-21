(function () {
  "use strict";

  if (window.PMW_PROGRESSIVE_WALLPAPER_IMAGES) return;
  window.PMW_PROGRESSIVE_WALLPAPER_IMAGES = true;

  const LOW_WIDTH = 240;
  const MEDIUM_WIDTH = 480;
  const HIGH_WIDTH = 720;
  const queue = [];
  let active = 0;

  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  const effectiveType = String(connection && connection.effectiveType || "").toLowerCase();
  const maximumStage = connection && connection.saveData ? "medium" : "high";
  const concurrency = effectiveType.includes("2g") ? 2 : effectiveType === "3g" ? 3 : 5;

  const style = document.createElement("style");
  style.textContent = `
    .pmw-progressive-frame {
      position: relative;
      overflow: hidden;
      background: linear-gradient(110deg, #101010 22%, #1d1d1d 38%, #101010 54%);
      background-size: 220% 100%;
      animation: pmw-progressive-shimmer 1.35s linear infinite;
    }
    .pmw-progressive-frame.pmw-image-ready {
      animation: none;
      background: #101010;
    }
    img.pmw-progressive-image {
      color: transparent !important;
      font-size: 0 !important;
      opacity: 0;
      transition: opacity .22s ease;
    }
    img.pmw-progressive-image.pmw-low-ready { opacity: 1; }
    @keyframes pmw-progressive-shimmer {
      from { background-position: 100% 0; }
      to { background-position: -120% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .pmw-progressive-frame { animation: none; }
    }
  `;
  (document.head || document.documentElement).appendChild(style);

  function getDriveId(source) {
    const dataId = this instanceof HTMLImageElement ? this.dataset.pmwDriveId : "";
    if (dataId) return dataId;
    try {
      const url = new URL(source, location.href);
      if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
        return url.searchParams.get("id") || "";
      }
      if (url.hostname === "lh3.googleusercontent.com") {
        const match = url.pathname.match(/\/d\/([^/=]+)(?:=|\/|$)/);
        return match ? decodeURIComponent(match[1]) : "";
      }
      const localMatch = url.pathname.match(/\/thumbnails\/google-drive\/([^/]+)\.webp$/i);
      if (localMatch) return decodeURIComponent(localMatch[1]);
    } catch (_) {}
    return "";
  }

  function variant(id, width) {
    return `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w${width}`;
  }

  function setReady(image) {
    if (!image.naturalWidth) return false;
    image.classList.add("pmw-low-ready");
    if (image.parentElement) image.parentElement.classList.add("pmw-image-ready");
    return true;
  }

  function loadStage(image, source, stage) {
    queue.push({ image, source, stage });
    drainQueue();
  }

  function drainQueue() {
    while (active < concurrency && queue.length) {
      const job = queue.shift();
      if (!job.image.isConnected) continue;
      active += 1;
      const preloader = new Image();
      preloader.decoding = "async";
      preloader.onload = () => {
        if (job.image.isConnected && preloader.naturalWidth > 0) {
          job.image.src = job.source;
          job.image.dataset.pmwStage = job.stage;
          setReady(job.image);
        }
        active -= 1;
        if (job.stage === "medium" && maximumStage === "high" && job.image.isConnected) {
          window.setTimeout(() => loadStage(job.image, job.image.dataset.pmwHigh, "high"), 180);
        }
        drainQueue();
      };
      preloader.onerror = () => {
        active -= 1;
        drainQueue();
      };
      preloader.src = job.source;
    }
  }

  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          loadStage(entry.target, entry.target.dataset.pmwMedium, "medium");
        });
      }, { rootMargin: "360px 0px", threshold: 0.01 })
    : null;

  function prepare(image, index) {
    if (!(image instanceof HTMLImageElement) || image.dataset.pmwProgressive === "true") return;
    const id = getDriveId.call(image, image.getAttribute("src") || image.currentSrc);
    if (!id) return;

    image.dataset.pmwProgressive = "true";
    image.dataset.pmwStage = "low";
    image.dataset.pmwMedium = variant(id, MEDIUM_WIDTH);
    image.dataset.pmwHigh = variant(id, HIGH_WIDTH);
    image.classList.add("pmw-progressive-image");
    if (image.parentElement) image.parentElement.classList.add("pmw-progressive-frame");

    const declaredSource = image.getAttribute("src") || "";
    const lowSource = /\/thumbnails\/google-drive\//i.test(declaredSource)
      ? declaredSource
      : variant(id, LOW_WIDTH);
    if (image.src !== lowSource) image.src = lowSource;

    const primaryPreview = Boolean(image.closest(".preview-card"));
    if (primaryPreview || index < 6) {
      image.loading = "eager";
      image.fetchPriority = primaryPreview ? "high" : "auto";
    }

    const beginUpgrades = () => {
      if (!setReady(image)) return false;
      if (image.dataset.pmwUpgradeStarted === "true") return true;
      image.dataset.pmwUpgradeStarted = "true";
      if (primaryPreview || !observer) loadStage(image, image.dataset.pmwMedium, "medium");
      else observer.observe(image);
      return true;
    };

    image.addEventListener("load", beginUpgrades, { passive: true });
    if (!beginUpgrades()) {
      let checks = 0;
      const renderCheck = window.setInterval(() => {
        checks += 1;
        if (beginUpgrades() || checks > 100 || !image.isConnected) window.clearInterval(renderCheck);
      }, 100);
    }
  }

  function scan(root) {
    const images = root instanceof HTMLImageElement
      ? [root]
      : Array.from(root.querySelectorAll ? root.querySelectorAll("img") : []);
    images.forEach(prepare);
  }

  const mutationObserver = new MutationObserver((records) => {
    records.forEach((record) => record.addedNodes.forEach((node) => {
      if (node.nodeType === 1) scan(node);
    }));
  });
  mutationObserver.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => scan(document), { once: true });
  } else {
    scan(document);
  }
})();
