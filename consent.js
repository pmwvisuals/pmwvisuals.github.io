(() => {
  const key = 'pmw_cookie_consent';
  const existing = localStorage.getItem(key);

  const applyConsent = (choice) => {
    if (typeof window.gtag !== 'function') return;
    const granted = choice === 'accepted';
    window.gtag('consent', 'update', {
      ad_storage: granted ? 'granted' : 'denied',
      ad_user_data: granted ? 'granted' : 'denied',
      ad_personalization: granted ? 'granted' : 'denied',
      analytics_storage: granted ? 'granted' : 'denied'
    });
  };

  applyConsent(existing);
  if (existing) return;

  const style = document.createElement('style');
  style.textContent = `
    .pmw-cookie-banner {
      position: fixed;
      left: 16px;
      right: 16px;
      bottom: 16px;
      z-index: 100000;
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 16px;
      align-items: center;
      max-width: 980px;
      margin: 0 auto;
      padding: 16px;
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 18px;
      background: rgba(5,5,5,.92);
      color: #fff;
      box-shadow: 0 18px 60px rgba(0,0,0,.45);
      backdrop-filter: blur(18px);
      font-family: Inter, system-ui, sans-serif;
    }
    .pmw-cookie-banner p {
      margin: 0;
      color: rgba(255,255,255,.72);
      font-size: .92rem;
      line-height: 1.5;
    }
    .pmw-cookie-banner strong { color: #fff; }
    .pmw-cookie-banner a { color: #fff; font-weight: 800; }
    .pmw-cookie-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
    .pmw-cookie-actions button {
      min-height: 42px;
      border: 1px solid rgba(255,255,255,.18);
      border-radius: 999px;
      padding: 0 18px;
      color: #fff;
      background: rgba(255,255,255,.08);
      font: 800 .9rem Inter, system-ui, sans-serif;
      cursor: pointer;
    }
    .pmw-cookie-actions [data-choice="accepted"] { background: #fff; color: #050505; }
    @media (max-width: 680px) {
      .pmw-cookie-banner { grid-template-columns: 1fr; }
      .pmw-cookie-actions { justify-content: stretch; }
      .pmw-cookie-actions button { flex: 1; }
    }
  `;

  const banner = document.createElement('div');
  banner.className = 'pmw-cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Cookie choices');
  banner.innerHTML = `
    <p><strong>Cookie choices.</strong> PMW Visuals uses Google Analytics and Google AdSense to improve the site and support free downloads. You can accept or keep non-essential storage off. <a href="/cookie-policy.html">Cookie Policy</a></p>
    <div class="pmw-cookie-actions">
      <button type="button" data-choice="declined">Decline</button>
      <button type="button" data-choice="accepted">Accept</button>
    </div>
  `;

  banner.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice]');
    if (!button) return;
    const choice = button.dataset.choice;
    localStorage.setItem(key, choice);
    applyConsent(choice);
    banner.remove();
    style.remove();
  });

  document.head.appendChild(style);
  document.body.appendChild(banner);
})();
