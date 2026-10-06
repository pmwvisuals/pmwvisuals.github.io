(function () {
  "use strict";

  if (/\/wallpapers\//i.test(window.location.pathname)) {
    const googleImagesPreconnect = document.createElement("link");
    googleImagesPreconnect.rel = "preconnect";
    googleImagesPreconnect.href = "https://lh3.googleusercontent.com";
    googleImagesPreconnect.crossOrigin = "anonymous";
    document.head.appendChild(googleImagesPreconnect);

    const progressiveImages = document.createElement("script");
    progressiveImages.src = new URL("progressive-wallpaper-images.js", document.currentScript.src).href;
    document.head.appendChild(progressiveImages);
  }

  const STORAGE_KEY = "pmw_theme_preference";
  // Retire only this site's former third-party advertising worker.
  // Do not request notification permission or touch other registrations.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => {
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker) return;
        const url = new URL(worker.scriptURL);
        if (url.origin === location.origin && url.pathname === '/sw.js') {
          registration.unregister();
        }
      });
    }).catch(() => {});
  }
  const DARK_COLOR = "#050505";
  const LIGHT_COLOR = "#f5f7fb";

  const normalizeTheme = (value) => value === "dark" ? "dark" : "light";

  const readTheme = () => {
    try {
      return normalizeTheme(window.localStorage.getItem(STORAGE_KEY));
    } catch (error) {
      return "light";
    }
  };

  const updateThemeColor = (theme) => {
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      if (document.readyState === 'loading') return;
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = theme === "light" ? LIGHT_COLOR : DARK_COLOR;
  };

  const updateRecaptchaTheme = (theme) => {
    document.querySelectorAll(".g-recaptcha").forEach((element) => {
      element.dataset.theme = theme;
    });
  };

  const watchForRecaptcha = (theme) => {
    if (!window.MutationObserver || !document.documentElement) return null;

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return;

          if (node.matches(".g-recaptcha")) {
            node.dataset.theme = theme;
          }

          node.querySelectorAll?.(".g-recaptcha").forEach((element) => {
            element.dataset.theme = theme;
          });
        });
      });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
    return observer;
  };

  const applyTheme = (value, options = {}) => {
    const theme = normalizeTheme(value);
    const root = document.documentElement;

    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    updateThemeColor(theme);

    if (document.body) {
      updateRecaptchaTheme(theme);
    }

    if (options.persist !== false) {
      try {
        window.localStorage.setItem(STORAGE_KEY, theme);
      } catch (error) {
        // The preference still applies for this page when storage is unavailable.
      }
    }

    if (options.announce !== false) {
      window.dispatchEvent(new CustomEvent("pmw:themechange", { detail: { theme } }));
    }

    return theme;
  };

  const initialTheme = readTheme();
  const recaptchaObserver = watchForRecaptcha(initialTheme);
  applyTheme(initialTheme, { persist: false, announce: false });

  window.PMWTheme = Object.freeze({
    storageKey: STORAGE_KEY,
    get: () => normalizeTheme(document.documentElement.dataset.theme || readTheme()),
    set: (theme, options = {}) => applyTheme(theme, options),
    toggle: () => applyTheme(
      document.documentElement.dataset.theme === "light" ? "dark" : "light"
    )
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      updateThemeColor(window.PMWTheme.get());
      updateRecaptchaTheme(initialTheme);
      window.setTimeout(() => recaptchaObserver?.disconnect(), 0);
    }, { once: true });
  } else {
    updateRecaptchaTheme(initialTheme);
    recaptchaObserver?.disconnect();
  }

  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) {
      applyTheme(event.newValue, { persist: false });
    }
  });
})();
