(function () {
  'use strict';
  function mount() {
    if (!window.PMWTheme || document.getElementById('pmwAppearanceDialog')) return;
    const theme = window.PMWTheme;
    let saved = false;
    try { saved = ['light','dark'].includes(localStorage.getItem(theme.storageKey)); } catch (_) {}
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 4a8 8 0 0 1 0 16Z" fill="currentColor"/></svg>';
    const trigger = document.createElement('button');
    trigger.className = 'pmw-appearance-trigger';
    trigger.type = 'button';
    trigger.title = 'Appearance';
    trigger.setAttribute('aria-haspopup','dialog');
    trigger.setAttribute('aria-controls','pmwAppearanceDialog');
    trigger.innerHTML = icon + '<span>Appearance</span>';
    const dialog = document.createElement('dialog');
    dialog.id = 'pmwAppearanceDialog';
    dialog.className = 'pmw-appearance-dialog';
    dialog.setAttribute('aria-labelledby','pmwAppearanceTitle');
    dialog.setAttribute('aria-describedby','pmwAppearanceCopy');
    dialog.innerHTML = `<div class="pmw-appearance-head"><span class="pmw-appearance-kicker">Make yourself at home</span>${icon}</div><h2 id="pmwAppearanceTitle">Your screen. Your style.</h2><p id="pmwAppearanceCopy">Start with our light look, or settle into dark. You can change it anytime using Appearance.</p><fieldset class="pmw-theme-options"><legend class="pmw-theme-sr">Choose a color theme</legend>${['light','dark'].map(mode=>`<label class="pmw-theme-option"><input type="radio" name="pmwAppearance" value="${mode}"><span class="pmw-theme-preview pmw-theme-preview-${mode}" aria-hidden="true"><span class="pmw-theme-preview-nav"></span><span class="pmw-theme-preview-title"></span><span class="pmw-theme-preview-cards"><i></i><i></i><i></i></span></span><span class="pmw-theme-option-heading">${mode==='light'?'Light mode':'Dark mode'}<span class="pmw-theme-check" aria-hidden="true">✓</span></span><span class="pmw-theme-option-copy">${mode==='light'?'Bright, calm and clear.':'A quieter, darker canvas.'}</span>${mode==='light'?'<span class="pmw-theme-default">Our default</span>':''}</label>`).join('')}</fieldset><button class="pmw-theme-save" type="button">Continue in light mode</button><p class="pmw-theme-storage-note">Your choice is saved in this browser.</p>`;
    document.body.append(trigger,dialog);
    const closeButton=document.createElement('button');
    closeButton.type='button';
    closeButton.className='pmw-theme-close';
    closeButton.setAttribute('aria-label','Close appearance chooser');
    closeButton.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg>';
    dialog.querySelector('.pmw-appearance-head').append(closeButton);
    const radios = [...dialog.querySelectorAll('input')];
    const save = dialog.querySelector('.pmw-theme-save');
    const note = dialog.querySelector('.pmw-theme-storage-note');
    let previous = theme.get();
    let confirmed = false;
    let firstVisit = !saved;
    const sync = () => {
      const current = theme.get();
      radios.forEach(radio=> { radio.checked = radio.value === current; });
      save.textContent = `Continue in ${current} mode`;
      trigger.setAttribute('aria-label',`Change appearance. Current theme: ${current} mode`);
    };
    const open = () => {
      previous = theme.get(); confirmed = false; sync();
      dialog.showModal();
      radios.find(r=>r.checked)?.focus();
    };
    radios.forEach(radio=>radio.addEventListener('change',()=> {
      // Preview without committing storage until the Continue button is pressed.
      theme.set(radio.value,{persist:false});
    }));
    save.addEventListener('click',()=> {
      theme.set(theme.get()); confirmed = true; firstVisit = false;
      dialog.close(); trigger.focus();
    });
    dialog.addEventListener('cancel',()=> {
      if(firstVisit) { theme.set('light'); confirmed = true; firstVisit = false; }
    });
    closeButton.addEventListener('click',()=> {
      if(firstVisit) { theme.set('light'); confirmed = true; firstVisit = false; }
      dialog.close(); trigger.focus();
    });
    dialog.addEventListener('close',()=> {
      if(!confirmed)theme.set(previous,{persist:false});
      sync();
    });
    trigger.addEventListener('click',open);
    window.addEventListener('pmw:themechange',sync);
    try {
      const probe = 'pmw_theme_storage_probe'; localStorage.setItem(probe,'1'); localStorage.removeItem(probe);
    } catch (_) { note.textContent = 'Storage is unavailable. Your choice applies to this page.'; }
    // Keep the persistent switch clear of the existing cookie consent banner.
    const position = () => {
      const banner = document.querySelector('.pmw-cookie-banner');
      const height = banner?.getBoundingClientRect().height || 0;
      trigger.style.setProperty('--pmw-cookie-offset',`${height}px`);
    };
    const observer = new MutationObserver(position);
    observer.observe(document.body,{childList:true});
    window.addEventListener('resize',position); position(); sync();
    if(!saved)open();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
