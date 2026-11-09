import { PRESETS } from './creative/presets.js';
import { loadWallpaperCatalog, editorURL } from './creative/wallpaper-catalog.js';
import { icon } from './creative/shell.js';

const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/css/wallpaper-actions.css?v=20261110-page-options';document.head.append(stylesheet);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog=[],byId=new Map(),byPath=new Map(),previewSequence=0,anchor=null,closeTimer,ignoreFocus=false,revealing=false;
const known=new WeakMap();
const panel=document.createElement('div');panel.id='waDropdown';panel.className='wa-popover';panel.setAttribute('popover','auto');panel.setAttribute('role','region');document.body.append(panel);
const isOpen=()=>panel.matches(':popover-open');
const cancelClose=()=>clearTimeout(closeTimer);
function reset(){cancelClose();anchor?.setAttribute('aria-expanded','false');previewSequence++;}
function close(restore=false){const previous=anchor;reset();if(isOpen())panel.hidePopover();anchor=null;if(restore&&previous?.isConnected){ignoreFocus=true;previous.focus();ignoreFocus=false;}}
function scheduleClose(){cancelClose();closeTimer=setTimeout(()=>{if(!panel.matches(':focus-within'))close();},220);}
function position(){
 if(!anchor?.isConnected){close();return;}
 const r=anchor.getBoundingClientRect(),height=panel.offsetHeight,width=panel.offsetWidth,gap=6,margin=10;
 const above=innerHeight-r.bottom<height+gap&&r.top>innerHeight-r.bottom;
 const left=anchor.dataset.waAction==='formats'?r.left:r.right-width;
 panel.style.left=Math.max(margin,Math.min(left,innerWidth-width-margin))+'px';
 panel.style.top=Math.max(margin,Math.min(above?r.top-height-gap:r.bottom+gap,innerHeight-height-margin))+'px';
}
function begin(button,label){
 reset();anchor=button;anchor.setAttribute('aria-expanded','true');panel.setAttribute('aria-label',label);
 panel.innerHTML=`<div class="wa-menu-head"><strong>${label}</strong><button type="button" class="wa-dismiss" aria-label="Close dropdown">${icon('close')}</button></div>`;
 panel.querySelector('.wa-dismiss').onclick=()=>close(true);
}
function reveal(){if(revealing)return;revealing=true;try{if(!isOpen())panel.showPopover();}finally{revealing=false;}position();}
const brandPaths={
 Instagram:'<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
 Facebook:'<path d="M14 22v-9h3l.5-4H14V7c0-1.2.4-2 2-2h2V1.5c-.8-.1-1.8-.2-3-.2-3 0-5 1.8-5 5V9H7v4h3v9"/>',
 Pinterest:'<circle cx="12" cy="11" r="9"/><path d="m8 22 3-14m-1 7c6 4 10-10 3-10-5 0-7 6-4 8"/>',
 YouTube:'<rect x="2" y="5" width="20" height="14" rx="4"/><path d="m10 9 6 3-6 3Z"/>',
 TikTok:'<path d="M14 3v12a4 4 0 1 1-4-4m4-8c0 4 3 6 7 6"/>',
 Wallpaper:'<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4"/>'
};
const brand=platform=>`<svg class="wa-brand" viewBox="0 0 24 24" aria-hidden="true">${brandPaths[platform]}</svg>`;
function formats(item,button){
 begin(button,'Formats');
 const platforms=[...new Set(PRESETS.map(p=>p.platform))];
 panel.insertAdjacentHTML('beforeend',`<div class="wa-platforms" role="group" aria-label="Platform">${platforms.map(p=>`<button type="button" data-platform="${p}" aria-label="${p}" title="${p}" aria-pressed="false">${brand(p)}</button>`).join('')}</div><div class="wa-format-list"></div><p class="wa-menu-note">Select a size to edit & download.</p>`);
 const permitted=item.access!=='premium'||window.PMW_CAN_EDIT_WALLPAPER?.(item);
 function select(platform){
  panel.querySelectorAll('[data-platform]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.platform===platform)));
  panel.querySelector('.wa-format-list').innerHTML=PRESETS.filter(p=>p.platform===platform).map(p=>`<a href="${escape(permitted?editorURL(item,p):'/premium.html')}" aria-label="${escape(p.label)}, ${p.width} by ${p.height} pixels"><span>${escape(p.purpose)}<small>${p.width} × ${p.height}${/cover/i.test(p.purpose)?' · Still image':''}</small></span><span class="wa-ratio">${p.ratio}</span></a>`).join('');
  if(isOpen())position();
 }
 panel.querySelectorAll('[data-platform]').forEach(b=>{b.onclick=()=>select(b.dataset.platform);b.addEventListener('pointerenter',e=>{if(e.pointerType!=='touch')select(b.dataset.platform);});b.onfocus=()=>select(b.dataset.platform);});
 select(platforms[0]);reveal();
}
function preview(item,button){
 begin(button,'Preview');const seq=++previewSequence,desktop=item.width>item.height,variation=Math.floor(Math.random()*3);
 const options=desktop?[['desktop','Desktop'],['clean','Clean screen']]:[['lock','Lock screen'],['home','Home screen']];
 const initial=desktop?'desktop':variation===1?'home':'lock';
 panel.insertAdjacentHTML('beforeend',`<div class="wa-screen-options" role="group" aria-label="Preview type">${options.map(([value,label])=>`<button type="button" data-screen="${value}" aria-pressed="${value===initial}">${label}</button>`).join('')}</div><div class="wa-mini-stage"><div class="wa-mini-device ${desktop?'wa-mini-desktop':'wa-mini-phone'}" data-screen="${initial}" data-variation="${variation}"><img alt="${escape(item.title)} on a sample screen"><div class="wa-mini-overlay" aria-hidden="true">${desktop?'<div class="wa-mini-files">▣<br>▧<br>▤</div><div class="wa-mini-taskbar">⊞　⌕　▣ <span>10:24</span></div>':'<div class="wa-mini-status">10:24　　▥ ▰</div><div class="wa-mini-clock"><span>Sunday, November 8</span><strong>10:24</strong></div><div class="wa-mini-apps">'+Array.from({length:12},(_,i)=>`<i style="--h:${(i*43+variation*70)%360}">${['◉','✦','▧','♪'][i%4]}</i>`).join('')+'</div><div class="wa-mini-dock">◉　▤　◎　♪</div><div class="wa-mini-homebar"></div>'}</div></div></div><p class="wa-menu-note wa-preview-status" role="status">Loading preview…</p>`);
 const image=panel.querySelector('img'),status=panel.querySelector('.wa-preview-status');
 image.onload=()=>{if(seq===previewSequence)status.textContent='Screen elements stay out of your download.';};
 image.onerror=()=>{if(seq===previewSequence)status.textContent='Preview unavailable. Please try another image.';};
 image.src=item.preview||item.thumbnail||item.image;
 const date=panel.querySelector('.wa-mini-clock span');if(date)date.textContent=new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
 panel.querySelectorAll('[data-screen]').forEach(b=>{if(b.tagName!=='BUTTON')return;b.onclick=()=>{panel.querySelector('.wa-mini-device').dataset.screen=b.dataset.screen;panel.querySelectorAll('button[data-screen]').forEach(option=>option.setAttribute('aria-pressed',String(option===b)));};});
 reveal();
}
function show(button){
 cancelClose();if(revealing||(anchor===button&&isOpen()))return;
 const item=known.get(button.closest('.wa-card'));if(item)(button.dataset.waAction==='formats'?formats:preview)(item,button);
}
panel.addEventListener('pointerenter',cancelClose);panel.addEventListener('pointerleave',scheduleClose);
panel.addEventListener('toggle',event=>{if(event.newState==='closed'){reset();anchor=null;}});
document.addEventListener('keydown',event=>{if(isOpen()&&event.key==='Escape'){event.preventDefault();event.stopPropagation();close(true);}const button=event.target.closest('[data-wa-action]');if(button&&event.key==='ArrowDown'){event.preventDefault();show(button);panel.querySelector('.wa-platforms button,.wa-screen-options button')?.focus();}},true);
document.addEventListener('focusin',event=>{if(isOpen()&&!panel.contains(event.target)&&event.target!==anchor)close();});
document.addEventListener('click',event=>{const button=event.target.closest('[data-wa-action]');if(!button)return;event.preventDefault();event.stopPropagation();show(button);if(event.detail===0)panel.querySelector('.wa-platforms button,.wa-screen-options button')?.focus();},true);
window.addEventListener('resize',()=>{if(isOpen())position();});
window.addEventListener('scroll',event=>{if(isOpen()&&!panel.contains(event.target)){const r=anchor?.getBoundingClientRect();if(!r||r.bottom<0||r.top>innerHeight)close();else position();}},true);

function findItem(link){
  const id=link.dataset.id||link.dataset.wallpaperId;
  let item=byId.get(id)||(window.PMW_GALLERY_ITEMS||[]).find(item=>item.id===id);
  if(!item&&link.href){const url=new URL(link.href,location.origin);item=byPath.get(url.pathname)||byId.get(url.hash.replace(/^#desktop-/,''));}
  return item;
}
function enhance(){
  const detailItem=byPath.get(location.pathname);
  const actions=document.querySelector('body.editorial-detail .actions, .preview-card ~ article .actions');
  if(detailItem&&actions&&!document.querySelector('.wa-detail-tools')){
    const tools=document.createElement('section');tools.className='wa-detail-tools wa-card';tools.setAttribute('aria-label','Wallpaper design and screen options');
    tools.innerHTML='<div><strong>Make it fit your next idea.</strong><p>Choose a platform size, or try this artwork on a screen.</p></div><div class="wa-detail-buttons"><button type="button" data-wa-action="formats" aria-controls="waDropdown" aria-expanded="false">'+icon('resize')+'<span>Formats & templates</span></button><button type="button" data-wa-action="preview" aria-controls="waDropdown" aria-expanded="false">'+icon('eye')+'<span>Screen preview</span></button></div>';
    actions.after(tools);known.set(tools,detailItem);
    tools.querySelectorAll('button').forEach(button=>{button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show(button);});button.addEventListener('pointerleave',scheduleClose);});
  }

  for(const link of document.querySelectorAll('a.wallpaper-card, a.related-card, #grid a.card, #savedWallpaperPreviewStrip > a, .pmw-premium-card:not(.wa-card)')){
    const item=findItem(link);if(!item)continue;
    const isLink=link.tagName==='A',card=isLink?document.createElement('article'):link;card.className=link.className||'wa-saved-card';card.classList.add('wa-card');card.style.cssText=link.style.cssText;
    for(const [key,value] of Object.entries(link.dataset))card.dataset[key]=value;
    if(isLink){link.className='wa-card-link';link.removeAttribute('style');link.replaceWith(card);card.append(link);}
    const media=document.createElement('div');media.className='wa-card-media';
    if(isLink){card.append(media);media.append(link);}
    else{const thumbnail=card.querySelector('.pmw-premium-thumb');card.prepend(media);if(thumbnail)media.append(thumbnail);}
    const save=link.querySelector('[data-save-wallpaper]');
    if(save){const button=document.createElement('button');for(const attr of save.attributes)button.setAttribute(attr.name,attr.value);button.type='button';button.innerHTML=save.innerHTML;save.remove();media.append(button);}
    const actions=document.createElement('div');actions.className='wa-card-actions';
    actions.innerHTML=`<button type="button" data-wa-action="formats" aria-controls="waDropdown" aria-expanded="false" aria-label="Choose a format for ${escape(item.title)}">${icon('resize')}</button><button type="button" data-wa-action="preview" aria-controls="waDropdown" aria-expanded="false" aria-label="Preview ${escape(item.title)}">${icon('eye')}</button>`;
    media.append(actions);known.set(card,item);
    actions.querySelectorAll('button').forEach(button=>{button.addEventListener('pointerenter',event=>{if(event.pointerType!=='touch')show(button);});button.addEventListener('pointerleave',scheduleClose);});
  }
}
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}
loadWallpaperCatalog().then(items=>{catalog=items;byId=new Map(catalog.map(item=>[item.id,item]));byPath=new Map(catalog.filter(item=>item.path).map(item=>['/'+item.path,item]));enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}).catch(()=>{
  const notice=document.createElement('p');notice.className='wa-description';notice.textContent='Wallpaper formats could not load. Refresh the page to retry.';document.querySelector('#wallpapersGrid,.ed-grid,#grid')?.before(notice);
});
