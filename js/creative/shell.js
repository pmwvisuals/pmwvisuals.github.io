export const icons = {
 menu:'M4 6h16M4 12h16M4 18h16',close:'m6 6 12 12M18 6 6 18',plus:'M12 5v14M5 12h14',arrow:'M5 12h14m-6-6 6 6-6 6',download:'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',undo:'M9 5 4 10l5 5M4 10h9a6 6 0 0 1 6 6',redo:'m15 5 5 5-5 5M20 10h-9a6 6 0 0 0-6 6',image:'M3 4h18v16H3zM3 16l6-6 5 5 3-3 4 4M16 8h.01',text:'M4 5h16M12 5v15M8 20h8',shapes:'M4 3h8v8H4zM16 14a4 4 0 1 1-.01 0M3 21l4-7 4 7z',layers:'m12 3 10 6-10 6L2 9zM3 14l9 5 9-5M3 18l9 5 9-5',grid:'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',palette:'M12 3a9 9 0 1 0 0 18h2a3 3 0 0 0 0-6h-1a2 2 0 0 1 0-4h5a3 3 0 0 0 2-5 10 10 0 0 0-8-3M7 8h.01M7 13h.01M12 6h.01',folder:'M3 6h7l2 3h9v11H3z',moon:'M20 15A8 8 0 0 1 9 4a9 9 0 1 0 11 11',save:'M4 3h13l4 4v14H3V3zM7 3v7h10V3M7 21v-7h10v7',lock:'M6 10h12v11H6zM8 10V6a4 4 0 0 1 8 0v4',eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7M12 9a3 3 0 1 0 .01 0',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7',copy:'M8 8h13v13H8zM16 8V3H3v13h5',check:'m5 12 4 4L19 6',resize:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6',back:'M19 12H5m6-6-6 6 6 6',up:'m5 14 7-7 7 7',down:'m5 10 7 7 7-7',flip:'M12 3v18M8 5 3 19h5zM16 5l5 14h-5z',spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z',align:'M12 3v18M5 6h14M3 12h18M7 18h10'
};
export const icon = name => `<svg class="cr-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="${icons[name]||icons.grid}"/></svg>`;
export function bootShell() {
  document.querySelectorAll('[data-icon]').forEach(node=>{node.innerHTML=icon(node.dataset.icon);});
  const header=document.querySelector('[data-creative-header]');
  if(header) header.innerHTML=`<div class="cr-header-left"><button class="cr-menu-button" data-open-menu aria-label="Open navigation">${icon('menu')}</button><a class="cr-brand" href="/"><img src="/favicon.png" alt="">PMW <small>CREATE</small></a></div><nav aria-label="Creative navigation"><a href="/templates/" ${location.pathname.includes('templates')?'aria-current="page"':''}>Explore templates</a><a href="/#latest-wallpapers">Wallpapers</a><a href="/tools/">Tools</a><a href="/my-designs/" ${location.pathname.includes('my-designs')?'aria-current="page"':''}>My designs</a></nav><div class="cr-header-actions"><button class="cr-icon-button" data-theme-toggle aria-label="Switch light or dark theme">${icon('moon')}</button><a class="cr-button primary" href="/editor/?blank=1">${icon('plus')} Create a design</a></div>`;
  const drawer=document.createElement('dialog');drawer.className='cr-drawer';drawer.id='creativeMenu';
  drawer.setAttribute('aria-label','PMW navigation');
  drawer.innerHTML=`<div class="cr-drawer-head"><strong>PMW Visuals</strong><button class="cr-icon-button" data-close-menu aria-label="Close navigation">${icon('close')}</button></div><p>YOUR CREATIVE CORNER</p><h2>Make it yours.</h2><a class="featured" href="/templates/">Explore editable templates ↗</a><a class="featured" href="/editor/?blank=1">Create a design ↗</a><a href="/#latest-wallpapers">Wallpapers & backgrounds</a><a href="/my-designs/">My designs</a><a href="/tools/">Converter, resizer & compressor</a><a href="/account.html">Your account</a><hr><a href="/license.html">Wallpaper license</a><a href="/privacy-policy.html">Privacy policy</a><a href="/terms.html">Terms of use</a><p>Your ideas. Your space to create.</p>`;
  document.body.append(drawer);
  document.querySelectorAll('[data-open-menu]').forEach(b=>b.onclick=()=>drawer.showModal());
  drawer.querySelector('[data-close-menu]').onclick=()=>drawer.close();
  drawer.addEventListener('click',e=>{if(e.target===drawer){const r=drawer.getBoundingClientRect();if(e.clientX>r.right||e.clientY>r.bottom)drawer.close();}});
  document.querySelectorAll('[data-theme-toggle]').forEach(b=>b.onclick=()=>window.PMWTheme?.toggle());
}
export function toast(message) {
  let el=document.getElementById('creativeToast');
  if(!el){el=document.createElement('div');el.id='creativeToast';el.className='cr-toast';el.setAttribute('role','status');document.body.append(el);}
  el.textContent=message;el.hidden=false;clearTimeout(el.timer);el.timer=setTimeout(()=>el.hidden=true,6000);
}
export function downloadBlob(blob,name) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
