import { WALLPAPER_VIEW } from './wallpaper-view-config.js';

export function enableWallpaperPagePopups(catalog) {
  // The embedded page runs all its normal scripts, but never creates nested popups.
  if (window !== window.top || document.getElementById('wallpaperPagePopup')) return;
  const mode = new URLSearchParams(location.search).get('wallpaperView');
  if ((mode === 'page' || mode === 'popup' ? mode : WALLPAPER_VIEW) !== 'popup') return;

  const byPath = new Map(catalog.filter(item => item.path).map(item => ['/' + item.path.replace(/^\//, ''), item]));
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = '/css/wallpaper-page-popup.css?v=20261119';
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.id = 'wallpaperPagePopup';
  dialog.className = 'wallpaper-page-popup';
  dialog.setAttribute('aria-labelledby', 'wallpaperPopupTitle');
  dialog.innerHTML = `<div class="wallpaper-popup-bar"><strong id="wallpaperPopupTitle">Wallpaper</strong><button type="button" class="wallpaper-popup-close" aria-label="Close wallpaper">✕</button></div><div class="wallpaper-popup-content"><p class="wallpaper-popup-status" role="status">Loading wallpaper…</p><div class="wallpaper-popup-error" hidden><p>This wallpaper couldn’t load. Please try again.</p><button type="button">Retry</button> <a>Open wallpaper page</a></div></div>`;
  document.body.append(dialog);
  const content = dialog.querySelector('.wallpaper-popup-content');
  const title = dialog.querySelector('strong');
  const status = dialog.querySelector('[role="status"]');
  const error = dialog.querySelector('.wallpaper-popup-error');
  const closeButton = dialog.querySelector('.wallpaper-popup-close');
  let frame, opener, pageURL, previousOverflow, timer, poll, sequence = 0, active = false;

  const stopWaiting = () => { clearTimeout(timer); clearInterval(poll); };
  function failed(token) {
    if (token !== sequence || !dialog.open) return;
    stopWaiting();
    content.setAttribute('aria-busy', 'false');
    status.hidden = true;
    error.hidden = false;
    frame?.remove();
  }
  function load(url, item) {
    const token = ++sequence;
    stopWaiting();
    frame?.remove();
    pageURL = url;
    title.textContent = item.title;
    error.querySelector('a').href = url.href;
    error.hidden = true;
    status.hidden = false;
    content.setAttribute('aria-busy', 'true');
    frame = document.createElement('iframe');
    frame.title = item.title + ' — full wallpaper page';
    frame.allow = 'web-share';
    frame.src = url.href;
    // Use the real page, not a copy: its content, access checks, and scripts stay intact.
    content.append(frame);
    let prepared = false;
    function ready() {
      if (token !== sequence || prepared) return;
      try {
        const doc = frame.contentDocument;
        if (!doc || doc.readyState === 'loading' || doc.location.pathname !== url.pathname) return;
        if (!doc.querySelector('main')) { failed(token); return; }
        prepared = true;
        stopWaiting();
        content.setAttribute('aria-busy', 'false');
        status.hidden = true;
        frame.classList.add('is-ready');
        // Editor, account and collection links leave the popup normally. Related
        // wallpapers replace its content, retaining the original gallery underneath.
        const base = doc.createElement('base');
        base.target = '_top';
        doc.head.append(base);
        doc.addEventListener('keydown', event => {
          if (event.key === 'Escape' && !event.defaultPrevented && !doc.querySelector('dialog[open]')) {
            event.preventDefault();
            dismiss();
          }
        });
        doc.addEventListener('click', event => {
          const link = event.target.closest?.('a[href]');
          if (!plainClick(event, link)) return;
          const next = new URL(link.href);
          if (next.origin !== location.origin) return;
          if (next.pathname === url.pathname && next.hash) {
            // Keep in-page anchors (artwork notes, studio, etc.) inside the page.
            event.preventDefault();
            const target = doc.getElementById(decodeURIComponent(next.hash.slice(1)));
            target?.scrollIntoView();
          } else if (byPath.has(next.pathname)) {
            event.preventDefault();
            load(next, byPath.get(next.pathname));
            closeButton.focus();
          }
        });
      } catch { failed(token); }
    }
    frame.addEventListener('load', ready, {once: true});
    frame.addEventListener('error', () => failed(token), {once: true});
    // Don't wait for slow third-party images/analytics after the page is usable.
    poll = setInterval(ready, 100);
    timer = setTimeout(() => failed(token), 20000);
  }
  function plainClick(event, link) {
    return link && !event.defaultPrevented && event.button === 0 && !event.ctrlKey &&
      !event.metaKey && !event.shiftKey && !event.altKey && !link.hasAttribute('download') &&
      (!link.target || link.target === '_self');
  }
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href]');
    if (!plainClick(event, link) || link.closest('#wallpaperPagePopup')) return;
    const url = new URL(link.href);
    const item = url.origin === location.origin && byPath.get(url.pathname);
    if (!item) return;
    event.preventDefault();
    opener = link;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    active = true;
    dialog.showModal();
    load(url, item);
    closeButton.focus();
  });
  function cleanup() {
    if (!active) return;
    active = false;
    ++sequence;
    stopWaiting();
    frame?.remove();
    document.body.style.overflow = previousOverflow;
    if (opener?.isConnected) opener.focus({preventScroll: true});
  }
  function dismiss() {
    if (!dialog.open) return;
    dialog.close();
    // Native close events are queued. Clean up now so a quick reopening cannot
    // inherit a scroll lock or have its new frame removed by the old close event.
    cleanup();
  }
  closeButton.addEventListener('click', dismiss);
  dialog.addEventListener('cancel', event => { event.preventDefault(); dismiss(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dismiss();
  });
  dialog.addEventListener('close', () => {
    if (!dialog.open) cleanup();
  });
  error.querySelector('button').addEventListener('click', () => load(pageURL, byPath.get(pageURL.pathname)));
}
