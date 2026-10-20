(() => {
  const drawer = document.getElementById('pmwSiteMenu');
  const trigger = document.querySelector('.pmw-site-menu-trigger');
  if (drawer && trigger) {
    let previousOverflow = '';
    trigger.addEventListener('click', () => {
      previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      trigger.setAttribute('aria-expanded', 'true');
      drawer.showModal();
      drawer.querySelector('.pmw-site-menu-close').focus();
    });
    drawer.querySelector('.pmw-site-menu-close').addEventListener('click', () => drawer.close());
    drawer.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) { drawer.close(); return; }
      if (event.target !== drawer) return;
      const box = drawer.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) drawer.close();
    });
    drawer.addEventListener('close', () => {
      document.body.style.overflow = previousOverflow;
      trigger.setAttribute('aria-expanded', 'false');
      trigger.focus();
    });
  }

  const sponsorUrl = 'https://uplcm.com/4/12079906';
  const downloadSelector = '#downloadButton, #panelDownload, .download-btn, .tool-download, a[download]';

  if (!document.querySelector('style[data-pmw-download-gate]')) {
    const styles = document.createElement('style');
    styles.dataset.pmwDownloadGate = '';
    styles.textContent = `
      .pmw-download-action {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 5px;
        max-width: 100%;
        vertical-align: top;
      }
      .pmw-download-sponsor-link {
        display: block;
        max-width: 11rem;
        color: inherit;
        font-family: inherit;
        font-size: .72rem;
        font-weight: 600;
        line-height: 1.35;
        opacity: .78;
        text-align: center;
        text-decoration: underline;
        text-decoration-color: rgba(198, 157, 69, .78);
        text-underline-offset: .18em;
        overflow-wrap: anywhere;
      }
      .pmw-download-sponsor-link:hover,
      .pmw-download-sponsor-link:focus-visible { opacity: 1; }
      .converter-file-actions > .pmw-download-action { max-width: 82px; }
      .converter-file-actions .pmw-download-sponsor-link { max-width: 82px; font-size: .62rem; }
      .tool-result .pmw-download-action { justify-self: center; }
    `;
    document.head.appendChild(styles);
  }

  function downloadFingerprint(downloadButton) {
    const wallpaperRoot = downloadButton.closest('[data-protected-wallpaper]');
    const pageId = wallpaperRoot?.dataset.wallpaperId || '';
    const selectedTitle = downloadButton.id === 'panelDownload'
      ? document.getElementById('panelTitle')?.textContent.trim() || ''
      : '';
    return [
      location.pathname,
      downloadButton.id,
      downloadButton.getAttribute('href') || '',
      downloadButton.getAttribute('download') || '',
      pageId,
      selectedTitle
    ].join('|');
  }

  function addSponsorLink(downloadButton) {
    let wrapper = downloadButton.closest('.pmw-download-action');
    if (!wrapper) {
      wrapper = document.createElement('span');
      wrapper.className = 'pmw-download-action';
      downloadButton.insertAdjacentElement('beforebegin', wrapper);
      wrapper.appendChild(downloadButton);
    }

    if (wrapper.querySelector('.pmw-download-sponsor-link')) return;
    const sponsorLink = document.createElement('a');
    sponsorLink.className = 'pmw-download-sponsor-link';
    sponsorLink.href = sponsorUrl;
    sponsorLink.target = '_blank';
    sponsorLink.rel = 'noopener noreferrer sponsored';
    sponsorLink.textContent = 'Open sponsor link';
    sponsorLink.setAttribute('aria-label', 'Open sponsor link in a new tab');
    wrapper.appendChild(sponsorLink);
  }

  function scanDownloads() {
    document.querySelectorAll(downloadSelector).forEach(addSponsorLink);
  }

  scanDownloads();
  new MutationObserver(scanDownloads).observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return;

    const sponsorLink = target.closest('.pmw-download-sponsor-link');
    if (sponsorLink) {
      const downloadButton = sponsorLink.closest('.pmw-download-action')?.querySelector(downloadSelector);
      if (downloadButton) downloadButton.dataset.pmwSponsorGateFingerprint = downloadFingerprint(downloadButton);
      return;
    }

    const downloadButton = target.closest(downloadSelector);
    if (!downloadButton || downloadButton.disabled || downloadButton.classList.contains('locked')) return;

    const fingerprint = downloadFingerprint(downloadButton);
    if (downloadButton.dataset.pmwSponsorGateFingerprint === fingerprint) return;

    downloadButton.dataset.pmwSponsorGateFingerprint = fingerprint;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.open(sponsorUrl, '_blank', 'noopener,noreferrer');
  }, true);
})();
