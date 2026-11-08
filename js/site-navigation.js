(() => {
  const drawer = document.getElementById('pmwSiteMenu');
  const trigger = document.querySelector('.pmw-site-menu-trigger');
  if (!drawer || !trigger) return;

  const destinations = drawer.querySelector('.pmw-site-menu-main');
  if (destinations && !destinations.querySelector('a[href="/templates/"]')) {
    destinations.insertAdjacentHTML('afterbegin', '<a class="pmw-site-menu-featured" href="/templates/"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg><span><strong>Editable templates</strong><small>A starting point for your next idea.</small></span><b aria-hidden="true">→</b></a>');
  }
  const more = drawer.querySelector('.pmw-site-menu-links');
  if (more && !more.querySelector('a[href="/editor/"]')) {
    more.insertAdjacentHTML('afterbegin', '<a href="/editor/">PMW Editor<span aria-hidden="true">↗</span></a><a href="/my-designs/">My designs<span aria-hidden="true">↗</span></a>');
  }

  let previousOverflow = '';
  trigger.addEventListener('click', () => {
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    trigger.setAttribute('aria-expanded', 'true');
    drawer.showModal();
    drawer.querySelector('.pmw-site-menu-close')?.focus();
  });

  drawer.querySelector('.pmw-site-menu-close')?.addEventListener('click', () => drawer.close());
  drawer.addEventListener('click', (event) => {
    if (event.target.closest('a[href]')) {
      drawer.close();
      return;
    }
    if (event.target !== drawer) return;
    const box = drawer.getBoundingClientRect();
    if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) drawer.close();
  });
  drawer.addEventListener('close', () => {
    document.body.style.overflow = previousOverflow;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.focus();
  });
})();
