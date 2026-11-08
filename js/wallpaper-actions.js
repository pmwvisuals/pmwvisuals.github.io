import { PRESETS } from './creative/presets.js';
import { loadWallpaperCatalog, editorURL } from './creative/wallpaper-catalog.js';
import { icon } from './creative/shell.js';

const stylesheet=document.createElement('link');stylesheet.rel='stylesheet';stylesheet.href='/css/wallpaper-actions.css';document.head.append(stylesheet);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let catalog=[],byId=new Map(),byPath=new Map(),returnFocus,previewSequence=0;
const known=new WeakMap();
const dialog=document.createElement('dialog');dialog.className='wa-dialog';dialog.setAttribute('aria-labelledby','waTitle');
dialog.innerHTML='<header class="wa-dialog-head"><div><span class="wa-eyebrow" id="waEyebrow"></span><h2 id="waTitle"></h2></div><button type="button" class="wa-close" aria-label="Close preview or formats">×</button></header><div id="waBody"></div>';
document.body.append(dialog);
dialog.querySelector('.wa-close').onclick=()=>dialog.close();
dialog.addEventListener('close',()=>{previewSequence++;returnFocus?.focus();});
dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
const body=dialog.querySelector('#waBody');
function open(item,button,eyebrow,heading){returnFocus=button;dialog.querySelector('#waEyebrow').textContent=eyebrow;dialog.querySelector('#waTitle').textContent=heading;body.replaceChildren();if(!dialog.open)dialog.showModal();}
function formats(item,button){
  open(item,button,'CREATE WITH THIS WALLPAPER','Choose a format');
  body.innerHTML='<p class="wa-description">Already sized. Automatically cropped. Ready to download in the editor.</p><div class="wa-formats">'+[...new Set(PRESETS.map(p=>p.platform))].map(platform=>`<section><h3>${platform}</h3>${PRESETS.filter(p=>p.platform===platform).map(p=>`<a href="${escape(editorURL(item,p))}"><span>${escape(p.purpose)}<small>${p.width} × ${p.height} px${/cover/.test(p.purpose)?' · Still image':''}</small></span><strong>${p.ratio} ↗</strong></a>`).join('')}</section>`).join('')+'</div><p class="wa-description wa-license">For personal, noncommercial use. <a href="/license.html">Usage terms</a></p>';
}
function preview(item,button){
  open(item,button,'PICTURE IT ON YOUR SCREEN','Wallpaper preview');const seq=++previewSequence;
  const desktop=item.width>item.height,variation=Math.floor(Math.random()*3),initial=variation===1?'home':'lock',sampleDate=new Intl.DateTimeFormat('en',{weekday:'long',month:'long',day:'numeric'}).format(new Date());
  body.innerHTML=`<div class="wa-preview-tools">${desktop?'<span>Desktop preview · 16:9</span>':`<div role="group" aria-label="Phone screen"><button type="button" data-screen="lock" aria-pressed="${initial==='lock'}">Lock screen</button><button type="button" data-screen="home" aria-pressed="${initial==='home'}">Home screen</button></div>`}<span class="wa-preview-status" role="status">Loading preview…</span></div><div class="wa-stage wa-variation-${variation}"><div class="wa-device ${desktop?'wa-desktop':'wa-phone'}" data-screen="${initial}"><img class="wa-wallpaper" alt="${escape(item.title)} in a sample ${desktop?'desktop':'phone'} screen"><div class="wa-screen-overlay" aria-hidden="true">${desktop?'<div class="wa-desktop-icons"><span>▣<small>Projects</small></span><span>▧<small>Photos</small></span><span>▤<small>Notes</small></span></div><div class="wa-taskbar"><span>⊞　⌕　 ▣　 ◉</span><span>10:24</span></div>':'<div class="wa-phone-status"><span>10:24</span><span>▥ ▰</span></div><div class="wa-lock"><span>${sampleDate}</span><strong>10:24</strong></div><div class="wa-home"><div class="wa-widget">Make room<br>for a little inspiration.</div><div class="wa-apps">'+Array.from({length:12},(_,i)=>`<span style="--app-hue:${(i*43+variation*70)%360}">${['◉','✦','▧','♪'][i%4]}</span>`).join('')+'</div></div><div class="wa-phone-dock"><span>◉</span><span>▤</span><span>◎</span><span>♪</span></div><div class="wa-home-indicator"></div>'}</div></div></div><p class="wa-description">A sample screen to help you judge the crop. Screen elements are not included in your download.</p><button type="button" class="wa-use-format">Choose a format →</button>`;
  const image=body.querySelector('img'),status=body.querySelector('.wa-preview-status');
  image.onload=()=>{if(seq===previewSequence)status.textContent='Preview ready';};
  image.onerror=()=>{if(seq===previewSequence){status.textContent='Preview unavailable. Try again later.';body.querySelector('.wa-stage').classList.add('wa-unavailable');}};
  image.src=item.preview||item.thumbnail||item.image;
  body.querySelectorAll('[data-screen]').forEach(control=>{if(control.tagName!=='BUTTON')return;control.onclick=()=>{body.querySelector('.wa-device').dataset.screen=control.dataset.screen;body.querySelectorAll('button[data-screen]').forEach(b=>b.setAttribute('aria-pressed',String(b===control)));};});
  body.querySelector('.wa-use-format').onclick=()=>formats(item,button);
}
function findItem(link){
  const id=link.dataset.id||link.dataset.wallpaperId;
  let item=byId.get(id)||(window.PMW_GALLERY_ITEMS||[]).find(item=>item.id===id);
  if(!item&&link.href){const url=new URL(link.href,location.origin);item=byPath.get(url.pathname)||byId.get(url.hash.replace(/^#desktop-/,''));}
  return item;
}
function enhance(){
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
    actions.innerHTML=`<button type="button" data-wa-action="formats" title="Formats" aria-label="Choose a format for ${escape(item.title)}">${icon('resize')}</button><button type="button" data-wa-action="preview" title="Preview" aria-label="Preview ${escape(item.title)}">${icon('eye')}</button>`;
    media.append(actions);known.set(card,item);
  }
}
document.addEventListener('click',event=>{
  const button=event.target.closest('[data-wa-action]');if(!button)return;
  event.preventDefault();event.stopPropagation();const item=known.get(button.closest('.wa-card'));if(!item)return;
  if(button.dataset.waAction==='formats'&&item.access==='premium'&&!window.PMW_CAN_EDIT_WALLPAPER?.(item)){
    location.href='/premium.html';return;
  }
  (button.dataset.waAction==='formats'?formats:preview)(item,button);
},true);
let queued=false;
function schedule(){if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;enhance();});}
loadWallpaperCatalog().then(items=>{catalog=items;byId=new Map(catalog.map(item=>[item.id,item]));byPath=new Map(catalog.filter(item=>item.path).map(item=>['/'+item.path,item]));enhance();new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});}).catch(()=>{
  const notice=document.createElement('p');notice.className='wa-description';notice.textContent='Wallpaper formats could not load. Refresh the page to retry.';document.querySelector('#wallpapersGrid,.ed-grid,#grid')?.before(notice);
});
