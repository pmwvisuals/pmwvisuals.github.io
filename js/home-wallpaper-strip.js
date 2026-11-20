const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

function step(row, direction) {
  const stride = row.children[1].offsetLeft - row.children[0].offsetLeft;
  const end = Math.max(0, row.scrollWidth - row.clientWidth);
  const current = row.scrollLeft;
  const wrap = direction > 0 ? current >= end - 2 : current <= 2;
  const next = wrap ? (direction > 0 ? 0 : end) : current + direction * stride;
  row.scrollTo({ left: next, behavior: reducedMotion.matches || wrap ? 'instant' : 'smooth' });
}

for (const lane of document.querySelectorAll('.home-wallpaper-lane')) {
  const row = lane.querySelector('.home-wallpaper-row');
  const controls = lane.querySelector('.home-strip-controls');
  const pause = controls.querySelector('[data-strip-pause]');
  const device = lane.dataset.device;
  let paused = false;
  let visible = false;

  function syncMotionPreference() {
    pause.hidden = reducedMotion.matches;
  }

  controls.hidden = false;
  syncMotionPreference();
  reducedMotion.addEventListener('change', syncMotionPreference);
  controls.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (button === pause) {
      paused = !paused;
      pause.setAttribute('aria-label', `${paused ? 'Resume' : 'Pause'} ${device} wallpaper rotation`);
      pause.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    } else if (button?.dataset.stripStep) {
      step(row, Number(button.dataset.stripStep));
    }
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
  }).observe(row);

  setInterval(() => {
    if (visible && !document.hidden && !paused && !reducedMotion.matches && !lane.matches(':hover, :focus-within')) {
      step(row, 1);
    }
  }, device === 'desktop' ? 3400 : 4100);
}
