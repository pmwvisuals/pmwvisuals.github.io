(() => {
  const drawer=document.getElementById('pmwSiteMenu');
  const trigger=document.querySelector('.pmw-site-menu-trigger');
  if(!drawer||!trigger)return;
  let previousOverflow='';
  trigger.addEventListener('click',()=>{
    previousOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    trigger.setAttribute('aria-expanded','true');
    drawer.showModal();
    drawer.querySelector('.pmw-site-menu-close').focus();
  });
  drawer.querySelector('.pmw-site-menu-close').addEventListener('click',()=>drawer.close());
  drawer.addEventListener('click',event=>{
    if(event.target.closest('a[href]')) { drawer.close(); return; }
    if(event.target!==drawer)return;
    const box=drawer.getBoundingClientRect();
    if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)drawer.close();
  });
  drawer.addEventListener('close',()=>{
    document.body.style.overflow=previousOverflow;
    trigger.setAttribute('aria-expanded','false');
    trigger.focus();
  });
})();
