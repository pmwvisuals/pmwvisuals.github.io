import { TEMPLATES, CATEGORIES, previewURL, artworkSVG, backgroundElements } from './templates.js';
import { uid, RATIOS, validateSize, validateProject, fitTransform, safeName, escapeHTML } from './model.js';
import { saveProject, getProject } from './storage.js';
import { bootShell, toast, icon, downloadBlob } from './shell.js';

bootShell();
const $ = id => document.getElementById(id);
const f = window.fabric;
if (!f) {
  $('canvasLoading').innerHTML='<strong>The editor could not load.</strong><small>Please refresh the page to try again.</small>';
  throw new Error('Fabric failed to load');
}
const CUSTOM = ['pmwId','label','role','locked','assetId','frameWidth','frameHeight','focusX','focusY','photoFit'];
f.FabricObject.customProperties = CUSTOM;
Object.assign(f.FabricObject.ownDefaults, { cornerColor:'#fff',cornerStrokeColor:'#598149',borderColor:'#598149',cornerSize:10,touchCornerSize:25,transparentCorners:false,padding:4,strokeUniform:true });
const canvas = new f.Canvas('designCanvas', { preserveObjectStacking:true,selection:false,enableRetinaScaling:true,uniformScaling:true });
let doc = { id:uid(), title:'Untitled design', width:1600, height:900, bg:{style:'solid',color1:'#f5f1e8',color2:'#f5f1e8',seed:42,grain:0} };
let assets = {}, history = [], historyIndex = -1, loading = true, ready = false, dirty = false, saveTimer, operation = false;
let fitted = true, zoom = 1, replaceTarget = null, pendingSwitch = null, saveSequence = Promise.resolve(), revision = 0;
const artworkCache = new Map();
const active = () => canvas.getActiveObject();
const userObjects = () => canvas.getObjects().filter(o => o.role !== 'background');
const isText = obj => ['textbox','i-text','text'].includes(obj?.type);
const isImage = obj => obj?.type === 'image';

function setName(name) { doc.title=String(name||'Untitled design').slice(0,160);$('projectTitle').value=doc.title;document.title=`${doc.title} | PMW Editor`; }
function snapshot() {
  const scene=canvas.toObject(CUSTOM);
  for(const o of scene.objects)if(o.assetId)o.src=`pmw-asset:${o.assetId}`;
  return {width:doc.width,height:doc.height,title:doc.title,bg:structuredClone(doc.bg),scene};
}
function hydrate(scene) {
  const next=structuredClone(scene);
  for(const o of next.objects) if(o.assetId){if(!assets[o.assetId])throw new Error('An image is missing. Open a complete project file to restore it.');o.src=assets[o.assetId];}
  return {objects:next.objects,background:next.background||'transparent'};
}
function preview() { return canvas.toDataURL({format:'jpeg',quality:.8,multiplier:Math.min(420/doc.width,280/doc.height)/zoom,enableRetinaScaling:false}); }
function projectData(withPreview=true) {
  const snap=snapshot(), used=new Set(snap.scene.objects.filter(o=>o.assetId).map(o=>o.assetId));
  return {format:'pmw-design',version:1,id:doc.id,...snap,assets:Object.fromEntries([...used].map(id=>[id,assets[id]])),updatedAt:Date.now(),preview:withPreview?preview():undefined};
}
async function persist() {
  if(!ready||loading)return false;
  clearTimeout(saveTimer);
  const data=projectData(), savedRevision=revision;
  $('saveState').textContent='Saving on this device…';
  const job=saveSequence.catch(()=>{}).then(()=>saveProject(data));saveSequence=job;
  try{await job;if(doc.id===data.id&&revision===savedRevision){dirty=false;$('saveState').textContent='Saved on this device';window.history.replaceState(null,'',`/editor/?project=${encodeURIComponent(doc.id)}`);}return true;}
  catch(e){$('saveState').textContent='Download a project to save';toast(e.message);return false;}
}
function checkpoint() {
  if(loading||!ready)return;
  const state=JSON.stringify(snapshot());
  if(history[historyIndex]===state)return;
  history=history.slice(0,historyIndex+1);history.push(state);if(history.length>40)history.shift();historyIndex=history.length-1;
  revision++;dirty=true;$('saveState').textContent='Unsaved changes';clearTimeout(saveTimer);saveTimer=setTimeout(persist,900);updateHistory();renderLayers();
}
function updateHistory(){$('undoButton').disabled=historyIndex<=0||operation;$('redoButton').disabled=historyIndex>=history.length-1||operation;}
async function restoreState(state){
  loading=true;canvas.discardActiveObject();doc.width=state.width;doc.height=state.height;doc.bg=structuredClone(state.bg);setName(state.title);
  await canvas.loadFromJSON(hydrate(state.scene));
  canvas.getObjects().forEach(applyLock);loading=false;fitCanvas();syncBackground();selectionChanged();renderLayers();
}
async function undo(direction){
  if(operation||historyIndex+direction<0||historyIndex+direction>=history.length)return;
  operation=true;$('saveState').textContent='Restoring your edit…';updateHistory();
  try{historyIndex+=direction;await restoreState(JSON.parse(history[historyIndex]));revision++;dirty=true;clearTimeout(saveTimer);saveTimer=setTimeout(persist,700);}
  catch(e){toast(e.message);}finally{operation=false;updateHistory();}
}
function applyLock(obj){const locked=!!obj.locked;obj.set({lockMovementX:locked,lockMovementY:locked,lockScalingX:locked,lockScalingY:locked,lockRotation:locked,hasControls:!locked,editable:!locked});if(obj.role==='background')obj.set({selectable:false,evented:false});}
function fitCanvas(){
  const area=$('canvasScroll');
  if(fitted)zoom=Math.min((area.clientWidth-65)/doc.width,(area.clientHeight-60)/doc.height,1);
  zoom=Math.max(.04,Math.min(zoom,2));
  canvas.setDimensions({width:Math.round(doc.width*zoom),height:Math.round(doc.height*zoom)});canvas.setZoom(zoom);canvas.calcOffset();canvas.requestRenderAll();
  $('zoomValue').textContent=`${Math.round(zoom*100)}%`;$('canvasSize').textContent=`${doc.width} × ${doc.height}`;
}
new ResizeObserver(()=>requestAnimationFrame(()=>{if(ready)fitCanvas();})).observe($('canvasScroll'));
function attach(obj,options={}){obj.set({pmwId:uid(),label:options.label||obj.label||'Shape',...options});applyLock(obj);canvas.add(obj);return obj;}
function solidObject(o){
  const opts={left:o.x||0,top:o.y||0,fill:o.color||'#78916c',opacity:o.alpha??1,angle:o.angle||0,strokeWidth:0,label:o.label||'Shape',originX:'left',originY:'top'};
  if(o.kind==='text')return new f.Textbox(o.text,{...opts,width:o.w,fontSize:o.size,fontFamily:o.font||'Arial',fontWeight:o.weight||700,lineHeight:o.lineHeight||1.16,label:o.label||o.text.split('\n')[0]});
  if(o.kind==='circle')return new f.Circle({...opts,radius:o.w/2});
  if(o.kind==='path')return new f.Path(o.path,{...opts,left:undefined,top:undefined});
  if(o.kind==='triangle')return new f.Triangle({...opts,width:o.w,height:o.h});
  return new f.Rect({...opts,width:o.w,height:o.h,rx:o.radius||0,ry:o.radius||0});
}
async function artworkData(kind){
  if(!artworkCache.has(kind))artworkCache.set(kind,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const out=document.createElement('canvas');out.width=1200;out.height=1000;out.getContext('2d').drawImage(img,0,0);resolve(out.toDataURL('image/png'));};img.onerror=()=>reject(new Error('The illustration could not load.'));img.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(artworkSVG(kind))}`;}));
  return artworkCache.get(kind);
}
function fitPhoto(obj,mode='fill'){
  const img=obj.getElement(), iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
  const fw=obj.frameWidth||obj.getScaledWidth(),fh=obj.frameHeight||obj.getScaledHeight();
  const scale=(mode==='fill'?Math.max:Math.min)(fw/iw,fh/ih);
  const cw=mode==='fill'?fw/scale:iw,ch=mode==='fill'?fh/scale:ih;
  obj.set({width:cw,height:ch,scaleX:scale,scaleY:scale,cropX:Math.max(0,(iw-cw)*(obj.focusX??.5)),cropY:Math.max(0,(ih-ch)*(obj.focusY??.5)),photoFit:mode});obj.setCoords();
}
async function addPhoto(source,frame=null,label='Your photo',assetId=null){
  const id=assetId||uid();
  const img=await f.FabricImage.fromURL(source);
  const iw=img.width,ih=img.height;
  if(iw*ih>50_000_000)throw new Error('This photo is larger than 50 megapixels. Choose a smaller original to keep the editor responsive.');
  assets[id]=source;
  const scale=Math.min(doc.width*.65/iw,doc.height*.7/ih,1);
  img.set({assetId:id,left:frame?.x??(doc.width-iw*scale)/2,top:frame?.y??(doc.height-ih*scale)/2,frameWidth:frame?.w??iw*scale,frameHeight:frame?.h??ih*scale,focusX:.5,focusY:.5,angle:frame?.angle||0,originX:'left',originY:'top'});
  fitPhoto(img,frame?'fill':'fit');attach(img,{label});return img;
}
async function paintBackground(){
  canvas.remove(...canvas.getObjects().filter(o=>o.role==='background'));canvas.backgroundColor='transparent';
  const b=doc.bg,w=doc.width,h=doc.height;
  const fill=b.style==='solid'?b.color1:new f.Gradient({type:'linear',coords:{x1:0,y1:0,x2:w,y2:h},colorStops:[{offset:0,color:b.color1},{offset:1,color:b.color2}]});
  const base=attach(new f.Rect({left:0,top:0,width:w,height:h,fill,strokeWidth:0}),{label:'Background',role:'background',locked:true});canvas.moveObjectTo(base,0);
  const variation=((b.seed||42)%17-8)/100;
  const deco=backgroundElements(b,w,h);
  let index=1;
  for(const d of deco){const obj=solidObject(d);if(b.style!=='grid')obj.set({left:obj.left+w*variation});attach(obj,{role:'background',locked:true});canvas.moveObjectTo(obj,index++);}
  if(b.grain>0){
    const grain=document.createElement('canvas');grain.width=640;grain.height=Math.round(640*h/w);const context=grain.getContext('2d'),pixels=context.createImageData(grain.width,grain.height);let seed=b.seed||42;
    for(let i=0;i<pixels.data.length;i+=4){seed=(seed*1664525+1013904223)>>>0;const value=seed>>>24;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=value;pixels.data[i+3]=255;}
    context.putImageData(pixels,0,0);const obj=await addPhoto(grain.toDataURL('image/png'),{x:0,y:0,w,h},'Grain');obj.set({role:'background',locked:true,opacity:b.grain/100});applyLock(obj);canvas.moveObjectTo(obj,index);
  }
  canvas.requestRenderAll();
}
function syncBackground(){$('backgroundStyle').value=doc.bg.style;$('backgroundColor1').value=doc.bg.color1;$('backgroundColor2').value=doc.bg.color2;$('backgroundGrain').value=doc.bg.grain||0;$('grainValue').textContent=`${doc.bg.grain||0}%`;}
async function loadTemplate(template){
  loading=true;ready=false;$('saveState').textContent='Preparing your design…';clearTimeout(saveTimer);canvas.clear();assets={};history=[];historyIndex=-1;doc={id:uid(),title:template.name,width:template.width,height:template.height,bg:{seed:42,grain:0,...template.bg}};setName(doc.title);
  await paintBackground();
  for(const o of template.elements){if(o.kind==='photo')await addPhoto(await artworkData(o.art),o,o.label);else attach(solidObject(o),{label:o.label||(o.kind==='text'?o.text.split('\n')[0]:'Decorative shape')});}
  loading=false;ready=true;fitted=true;fitCanvas();syncBackground();selectionChanged();checkpoint();$('canvasLoading').hidden=true;$('exportButton').disabled=false;
}
async function loadProject(project){
  validateProject(project);assets={...project.assets};doc.id=project.id||uid();await restoreState(project);ready=true;history=[];historyIndex=-1;checkpoint();$('canvasLoading').hidden=true;$('exportButton').disabled=false;
}
async function switchDesign(action){
  if(operation||loading)return;
  if(ready){
    pendingSwitch=action;$('switchDescription').textContent='Your current design will stay in My designs on this device.';$('switchDialog').showModal();
  }else await action();
}
$('confirmSwitch').onclick=async()=>{
  const saved=await persist();if(!saved){$('switchDescription').textContent='Device storage is unavailable. Download your current project first, then try again.';return;}
  $('switchDialog').close();const action=pendingSwitch;pendingSwitch=null;await guarded(action);closePanels();
};
function closePanels(){$('assetPanel').classList.remove('is-open');$('inspector').classList.remove('is-open');}
function openPanel(name){document.querySelectorAll('[data-panel-content]').forEach(el=>el.hidden=el.dataset.panelContent!==name);document.querySelectorAll('[data-panel]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.panel===name)));$('assetPanel').classList.add('is-open');$('inspector').classList.remove('is-open');}
document.querySelectorAll('[data-panel]').forEach(b=>b.onclick=()=>openPanel(b.dataset.panel));$('closeAssets').onclick=()=>$('assetPanel').classList.remove('is-open');$('closeInspector').onclick=()=>$('inspector').classList.remove('is-open');$('inspectButton').onclick=()=>{$('inspector').classList.toggle('is-open');$('assetPanel').classList.remove('is-open');};
function renderTemplates(){const category=$('editorCategory').value;const list=TEMPLATES.filter(t=>category==='all'||category===t.category);$('editorTemplates').innerHTML=list.map(t=>`<button class="editor-template-card" data-template="${t.id}"><img alt="" src="${previewURL(t)}">${escapeHTML(t.name)}</button>`).join('');}
$('editorCategory').innerHTML=CATEGORIES.map(c=>`<option value="${c.id}">${c.label}</option>`).join('');$('editorCategory').onchange=renderTemplates;renderTemplates();
$('editorTemplates').onclick=e=>{const b=e.target.closest('[data-template]');if(b)guarded(()=>switchDesign(()=>loadTemplate(TEMPLATES.find(t=>t.id===b.dataset.template))));};
const blank=()=>({name:'Untitled design',width:1920,height:1080,bg:{style:'solid',color1:'#f6f2e9',color2:'#f6f2e9'},elements:[]});
$('blankButton').onclick=()=>guarded(()=>switchDesign(()=>loadTemplate(blank())));
$('artworkChoices').innerHTML=['mountains','forest','desert'].map(kind=>`<button class="editor-template-card" data-art="${kind}"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(artworkSVG(kind))}">${kind[0].toUpperCase()+kind.slice(1)}</button>`).join('');
$('artworkChoices').onclick=e=>{const b=e.target.closest('[data-art]');if(b)guarded(async()=>{const obj=await addPhoto(await artworkData(b.dataset.art),null,'PMW illustration');canvas.setActiveObject(obj);canvas.requestRenderAll();checkpoint();closePanels();});};

function selectionChanged(){
  const obj=active(), usable=obj&&obj.role!=='background';$('selectionEmpty').hidden=!!usable;$('selectionControls').hidden=!usable;$('selectionHeading').textContent=usable?'Your finishing touches.':'Make it yours.';
  if(!usable){renderLayers();return;}
  const text=isText(obj),photo=isImage(obj);
  $('textControls').hidden=!text;$('textDecoration').hidden=!text;$('photoControls').hidden=!photo;$('objectColorField').hidden=photo;
  if(text){$('objectText').value=obj.text;$('objectFont').value=obj.fontFamily;$('objectFontSize').value=Math.round(obj.fontSize);$('objectWeight').value=Number(obj.fontWeight)>=800?'900':Number(obj.fontWeight)>=600?'700':'400';$('objectAlign').value=obj.textAlign;$('outlineWidth').value=obj.strokeWidth||0;$('outlineColor').value=/^#[a-f\d]{6}$/i.test(obj.stroke)?obj.stroke:'#ffffff';$('objectShadow').checked=!!obj.shadow;}
  if(typeof obj.fill==='string'&&/^#[a-f\d]{6}$/i.test(obj.fill))$('objectColor').value=obj.fill;
  $('objectX').value=Math.round(obj.left);$('objectY').value=Math.round(obj.top);$('objectRotation').value=Math.round(obj.angle);$('objectOpacity').value=Math.round(obj.opacity*100);$('opacityValue').textContent=`${Math.round(obj.opacity*100)}%`;
  if(photo){$('photoFit').value=obj.photoFit||'fill';$('cropX').value=(obj.focusX??.5)*100;$('cropY').value=(obj.focusY??.5)*100;}
  $('selectionNote').textContent=obj.locked?'This layer is locked. Unlock it in Layers to make changes.':photo?'Replace this photo with your own, or adjust which part of it fills the frame.':'Use the canvas handles to resize or rotate.';
  $('selectionControls').querySelectorAll('input,select,textarea,button').forEach(el=>el.disabled=!!obj.locked);renderLayers();
}
function renderLayers(){
  const list=$('layerList');list.replaceChildren();
  const objects=userObjects().slice().reverse();if(!objects.length){list.innerHTML='<p class="cr-muted">Your photos, text, and shapes will appear here.</p>';return;}
  for(const obj of objects){
    const row=document.createElement('div');row.className=`layer-item${obj===active()?' active':''}`;
    const title=isText(obj)?obj.text.slice(0,36):obj.label||'Shape';
    row.innerHTML=`<button class="layer-name" title="Select ${escapeHTML(title)}">${escapeHTML(title)}</button><button class="layer-toggle" data-lock aria-label="${obj.locked?'Unlock':'Lock'} ${escapeHTML(title)}" aria-pressed="${!!obj.locked}">${icon('lock')}</button><button class="layer-toggle" data-hide aria-label="${obj.visible?'Hide':'Show'} ${escapeHTML(title)}" aria-pressed="${!obj.visible}">${icon('eye')}</button>`;
    row.querySelector('.layer-name').onclick=()=>{canvas.setActiveObject(obj);canvas.requestRenderAll();selectionChanged();if(innerWidth<=1000){$('inspector').classList.add('is-open');$('assetPanel').classList.remove('is-open');}};
    row.querySelector('[data-lock]').onclick=()=>{obj.locked=!obj.locked;applyLock(obj);canvas.requestRenderAll();selectionChanged();checkpoint();};
    row.querySelector('[data-hide]').onclick=()=>{obj.set('visible',!obj.visible);canvas.requestRenderAll();checkpoint();};list.append(row);
  }
}
canvas.on('selection:created',selectionChanged);canvas.on('selection:updated',selectionChanged);canvas.on('selection:cleared',selectionChanged);
canvas.on('object:modified',e=>{if(isImage(e.target)){e.target.frameWidth=e.target.getScaledWidth();e.target.frameHeight=e.target.getScaledHeight();}checkpoint();selectionChanged();});
canvas.on('text:changed',()=>{checkpoint();if(document.activeElement!==$('objectText')&&isText(active()))$('objectText').value=active().text;});
canvas.on('object:moving',({target})=>{const center=target.getCenterPoint(),threshold=7/zoom;if(Math.abs(center.x-doc.width/2)<threshold)target.set({left:target.left+doc.width/2-center.x});if(Math.abs(center.y-doc.height/2)<threshold)target.set({top:target.top+doc.height/2-center.y});});
function changeObject(fn,{refresh=true}={}){const obj=active();if(!obj||obj.locked||operation)return;fn(obj);obj.setCoords();canvas.requestRenderAll();checkpoint();if(refresh)selectionChanged();}
$('objectText').oninput=()=>changeObject(o=>o.set('text',$('objectText').value),{refresh:false});
for(const [id,prop,cast] of [['objectFont','fontFamily',String],['objectFontSize','fontSize',Number],['objectWeight','fontWeight',Number],['objectAlign','textAlign',String],['objectColor','fill',String],['objectX','left',Number],['objectY','top',Number],['objectRotation','angle',Number]]){
  $(id).onchange=()=>{const value=cast($(id).value);if(cast===Number&&(!Number.isFinite(value)||Math.abs(value)>100000||(prop==='fontSize'&&(value<6||value>800))))return selectionChanged();changeObject(o=>o.set(prop,value));};
}
$('objectOpacity').oninput=()=>{changeObject(o=>o.set('opacity',Number($('objectOpacity').value)/100),{refresh:false});$('opacityValue').textContent=`${$('objectOpacity').value}%`;};
function outline(){changeObject(o=>o.set({stroke:$('outlineColor').value,strokeWidth:Math.max(0,Math.min(20,Number($('outlineWidth').value)||0)),paintFirst:'stroke'}));}
$('outlineColor').onchange=outline;$('outlineWidth').onchange=outline;$('objectShadow').onchange=()=>changeObject(o=>o.set('shadow',$('objectShadow').checked?new f.Shadow({color:'#00000055',blur:12,offsetX:4,offsetY:5}):null));
function cropChange(){changeObject(o=>{o.focusX=Number($('cropX').value)/100;o.focusY=Number($('cropY').value)/100;fitPhoto(o,$('photoFit').value);},{refresh:false});}
$('cropX').oninput=cropChange;$('cropY').oninput=cropChange;$('photoFit').onchange=cropChange;$('flipPhoto').onclick=()=>changeObject(o=>o.set('flipX',!o.flipX));
$('photoBackground').onclick=()=>changeObject(o=>{o.set({left:0,top:0,angle:0,frameWidth:doc.width,frameHeight:doc.height});fitPhoto(o,'fill');canvas.moveObjectTo(o,canvas.getObjects().filter(o=>o.role==='background').length);});
$('centerObject').onclick=()=>changeObject(o=>{const c=o.getCenterPoint();o.set({left:o.left+doc.width/2-c.x,top:o.top+doc.height/2-c.y});});
async function duplicate(){const obj=active();if(!obj||obj.locked||operation)return;const clone=await obj.clone(CUSTOM);clone.set({pmwId:uid(),left:obj.left+30,top:obj.top+30});canvas.add(clone);canvas.setActiveObject(clone);canvas.requestRenderAll();checkpoint();}
function removeSelected(){const obj=active();if(!obj||obj.locked||operation)return;canvas.remove(obj);canvas.discardActiveObject();canvas.requestRenderAll();selectionChanged();checkpoint();}
$('duplicateObject').onclick=()=>guarded(duplicate);$('deleteObject').onclick=removeSelected;
function moveLayer(direction){const obj=active();if(!obj||obj.locked)return;const index=canvas.getObjects().indexOf(obj),first=canvas.getObjects().filter(o=>o.role==='background').length;canvas.moveObjectTo(obj,Math.max(first,Math.min(canvas.getObjects().length-1,index+direction)));canvas.requestRenderAll();checkpoint();}
$('layerUp').onclick=()=>moveLayer(1);$('layerDown').onclick=()=>moveLayer(-1);
document.querySelectorAll('[data-add-text]').forEach(b=>b.onclick=()=>{if(!ready||operation)return;const type=b.dataset.addText;const obj=solidObject({kind:'text',text:type==='heading'?'Your big idea.':type==='serif'?'a little inspiration':'Add a few words to the story.',x:doc.width*.12,y:doc.height*.3,w:doc.width*.7,size:doc.width*(type==='heading'?.075:type==='serif'?.06:.035),color:'#203d34',font:type==='serif'?'Georgia':'Arial',weight:type==='heading'?800:400});attach(obj,{label:'Your text'});canvas.setActiveObject(obj);canvas.requestRenderAll();checkpoint();closePanels();});
document.querySelectorAll('[data-shape]').forEach(b=>b.onclick=()=>{if(!ready||operation)return;const type=b.dataset.shape,w=doc.width*.22;const obj=solidObject({kind:type==='circle'?'circle':type==='triangle'?'triangle':'rect',x:doc.width*.3,y:doc.height*.3,w,h:type==='line'?4:w*.7,color:'#a7bf8a',radius:type==='rounded'?30:0});attach(obj,{label:type==='line'?'Line':'Shape'});canvas.setActiveObject(obj);canvas.requestRenderAll();checkpoint();closePanels();});
$('addOrganizer').onclick=()=>{if(!ready||operation)return;const x=doc.width*.2,y=doc.height*.2,w=doc.width*.3,h=doc.height*.55;attach(solidObject({kind:'rect',x,y,w,h,color:'#fffdf3',radius:20,alpha:.85}),{label:'Organizer area'});const label=attach(solidObject({kind:'text',x:x+25,y:y+25,w:w-50,size:doc.width*.022,text:'Your space',color:'#344334'}));canvas.setActiveObject(label);canvas.requestRenderAll();checkpoint();closePanels();};

async function guarded(action){if(operation)return;try{await action();}catch(e){toast(e.message||'That action could not finish. Please try again.');loading=false;$('canvasLoading').hidden=true;}}
function fileData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('This file could not be read.'));reader.readAsDataURL(file);});}
async function importPhotos(files){
  if(operation||!ready)return;operation=true;$('saveState').textContent='Opening your photos…';updateHistory();
  try{
    for(const file of Array.from(files).slice(0,12)){
      if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Choose a JPG, PNG, or WebP image.');
      if(file.size>25*1024*1024)throw new Error('Choose an image smaller than 25 MB.');
      if(userObjects().length>=200)throw new Error('This design already has 200 layers. Remove a layer before adding another.');
      const target=replaceTarget&&!replaceTarget.locked?replaceTarget:null;
      const frame=target?{x:target.left,y:target.top,w:target.getScaledWidth(),h:target.getScaledHeight(),angle:target.angle}:null;
      const position=target?canvas.getObjects().indexOf(target):-1;
      const obj=await addPhoto(await fileData(file),frame,file.name);
      if(target){obj.set({opacity:target.opacity,flipX:target.flipX});canvas.remove(target);canvas.moveObjectTo(obj,position);replaceTarget=null;}
      canvas.setActiveObject(obj);canvas.requestRenderAll();checkpoint();
    }
    closePanels();toast('Your photo is ready. Select it to crop, replace, or reposition it.');
  }catch(e){toast(e.message);}finally{operation=false;replaceTarget=null;$('photoInput').value='';if($('saveState').textContent==='Opening your photos…')$('saveState').textContent=dirty?'Unsaved changes':'Saved on this device';updateHistory();selectionChanged();}
}
function pickPhotos(replace=false){if(replace){if(!isImage(active())||active().locked){toast('Select an unlocked photo on the canvas first.');return;}replaceTarget=active();}else replaceTarget=null;$('photoInput').multiple=!replace;$('photoInput').click();}
$('uploadButton').onclick=()=>pickPhotos();$('replacePhotoButton').onclick=()=>pickPhotos(true);$('inspectorReplace').onclick=()=>pickPhotos(true);$('photoInput').onchange=e=>importPhotos(e.target.files);
for(const element of [$('uploadZone'),$('canvasScroll')]){element.addEventListener('dragover',e=>{e.preventDefault();element.classList.add('dragover');});element.addEventListener('dragleave',()=>element.classList.remove('dragover'));element.addEventListener('drop',e=>{e.preventDefault();element.classList.remove('dragover');replaceTarget=isImage(active())&&!active().locked?active():null;importPhotos(e.dataTransfer.files);});}

async function updateBackground(){if(operation||!ready)return;operation=true;try{doc.bg={...doc.bg,style:$('backgroundStyle').value,color1:$('backgroundColor1').value,color2:$('backgroundColor2').value,grain:Number($('backgroundGrain').value)};await paintBackground();$('grainValue').textContent=`${doc.bg.grain}%`;checkpoint();}finally{operation=false;}}
for(const id of ['backgroundStyle','backgroundColor1','backgroundColor2','backgroundGrain'])$(id).onchange=()=>guarded(updateBackground);
$('backgroundGrain').oninput=()=>$('grainValue').textContent=`${$('backgroundGrain').value}%`;
$('shuffleBackground').onclick=()=>guarded(async()=>{if(!$('keepColors').checked){const palettes=[['#f0c3a7','#92b6a0'],['#354c6d','#bea6d0'],['#e4d6b9','#df977b'],['#315b52','#cadc97'],['#d6d0ed','#799cc2']];const p=palettes[Math.floor(Math.random()*palettes.length)];$('backgroundColor1').value=p[0];$('backgroundColor2').value=p[1];}doc.bg.seed=Math.floor(Math.random()*100000);if(['solid','gradient'].includes($('backgroundStyle').value))$('backgroundStyle').value=['orbits','waves','grid'][Math.floor(Math.random()*3)];await updateBackground();});

$('resizePreset').innerHTML=RATIOS.map(r=>`<option value="${r.id}">${r.label}</option>`).join('')+'<option value="custom">Custom dimensions</option>';
$('resizeButton').onclick=()=>{if(!ready)return;$('resizeWidth').value=doc.width;$('resizeHeight').value=doc.height;$('resizePreset').value=RATIOS.find(r=>r.width===doc.width&&r.height===doc.height)?.id||'custom';$('resizeError').textContent='';$('resizeDialog').showModal();};
$('resizePreset').onchange=()=>{const r=RATIOS.find(r=>r.id===$('resizePreset').value);if(r){$('resizeWidth').value=r.width;$('resizeHeight').value=r.height;}};
for(const id of ['resizeWidth','resizeHeight'])$(id).oninput=()=>$('resizePreset').value='custom';
$('applyResize').onclick=async()=>{
  if(operation)return;
  try{const {width,height}=validateSize(Number($('resizeWidth').value),Number($('resizeHeight').value));operation=true;const t=fitTransform(doc.width,doc.height,width,height,$('resizeMode').value);canvas.discardActiveObject();
    for(const o of userObjects()){o.set({left:o.left*t.scale+t.x,top:o.top*t.scale+t.y,scaleX:o.scaleX*t.scale,scaleY:o.scaleY*t.scale});if(isImage(o)){o.frameWidth*=t.scale;o.frameHeight*=t.scale;}o.setCoords();}
    doc.width=width;doc.height=height;await paintBackground();fitted=true;fitCanvas();checkpoint();selectionChanged();$('resizeDialog').close();toast('Canvas resized. Move any element to fine-tune the new composition.');
  }catch(e){$('resizeError').textContent=e.message;}finally{operation=false;}
};
for(const [id,delta] of [['zoomIn',.1],['zoomOut',-.1]])$(id).onclick=()=>{fitted=false;zoom+=delta;fitCanvas();};$('zoomFit').onclick=()=>{fitted=true;fitCanvas();};
$('undoButton').onclick=()=>undo(-1);$('redoButton').onclick=()=>undo(1);$('projectTitle').onchange=()=>{setName($('projectTitle').value.trim());checkpoint();};
document.querySelectorAll('[data-close-dialog]').forEach(b=>b.onclick=()=>b.closest('dialog').close());
for(const id of ['projectButton','mobileProjectButton'])$(id).onclick=()=>$('projectDialog').showModal();
function downloadProjectFile(){const project=projectData(false);downloadBlob(new Blob([JSON.stringify(project)],{type:'application/json'}),`${safeName(doc.title)}.pmw`);toast('Editable project downloaded with its images.');}
$('downloadProject').onclick=downloadProjectFile;$('exportProject').onclick=downloadProjectFile;$('openProject').onclick=()=>$('projectInput').click();
$('projectInput').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>80*1024*1024)throw new Error('Choose a project file under 80 MB.');const p=validateProject(JSON.parse(await file.text()));p.id=uid();$('projectDialog').close();await switchDesign(()=>loadProject(p));}catch(error){toast(error instanceof SyntaxError?'This project file could not be read.':error.message);}finally{e.target.value='';}};
function exportSettings(){const format=$('exportFormat').value;$('exportQualityField').hidden=format==='png';$('transparentField').hidden=format==='jpeg';$('exportDimensions').textContent=`${doc.width} × ${doc.height} pixels · ${format==='jpeg'?'JPG':format.toUpperCase()} · ${format==='jpeg'?'Transparent areas use white.':'Exported at your canvas dimensions.'}`;}
$('exportButton').onclick=()=>{if(!ready||operation)return;canvas.discardActiveObject();canvas.requestRenderAll();$('exportPreview').src=preview();$('exportError').textContent='';exportSettings();$('exportDialog').showModal();};$('exportFormat').onchange=exportSettings;$('exportQuality').oninput=()=>$('exportQualityValue').textContent=`${$('exportQuality').value}%`;
$('downloadDesign').onclick=async()=>{
  if(operation)return;operation=true;const button=$('downloadDesign');button.disabled=true;button.textContent='Preparing image…';let output;
  try{
    const format=$('exportFormat').value,transparent=format!=='jpeg'&&$('transparentExport').checked,scene=hydrate(snapshot().scene);
    if(transparent)scene.objects=scene.objects.filter(o=>o.role!=='background');
    output=new f.StaticCanvas(document.createElement('canvas'),{width:doc.width,height:doc.height,enableRetinaScaling:false,renderOnAddRemove:false});
    await output.loadFromJSON(scene);if(format==='jpeg')output.backgroundColor='#ffffff';await document.fonts.ready;output.renderAll();
    const element=output.toCanvasElement(1),mime=`image/${format}`;
    const blob=await new Promise((resolve,reject)=>element.toBlob(b=>b?resolve(b):reject(new Error('This browser could not create the image. Try a smaller canvas.')),mime,Number($('exportQuality').value)/100));
    if(blob.type!==mime)throw new Error('This browser cannot export that format. Please choose PNG.');
    downloadBlob(blob,`${safeName(doc.title)}-${doc.width}x${doc.height}.${format==='jpeg'?'jpg':format}`);toast('Your design is ready.');$('exportDialog').close();await persist();
  }catch(e){$('exportError').textContent=e.message||'The image could not be exported. Try PNG or a smaller canvas.';}finally{if(output)await output.dispose();operation=false;button.disabled=false;button.textContent='Download image';}
};
window.addEventListener('keydown',e=>{
  const typing=/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)||document.activeElement?.isContentEditable||active()?.isEditing;
  if(typing||document.querySelector('dialog[open]'))return;
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();undo(e.shiftKey?1:-1);}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='y'){e.preventDefault();undo(1);}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='s'){e.preventDefault();persist();}
  else if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='d'){e.preventDefault();guarded(duplicate);}
  else if(e.key==='Delete'||e.key==='Backspace'){e.preventDefault();removeSelected();}
  else if(e.key==='Escape'){canvas.discardActiveObject();canvas.requestRenderAll();closePanels();}
  else if(e.key.startsWith('Arrow')&&active()){e.preventDefault();const d=e.shiftKey?10:1;changeObject(o=>o.set({left:o.left+(e.key==='ArrowRight'?d:e.key==='ArrowLeft'?-d:0),top:o.top+(e.key==='ArrowDown'?d:e.key==='ArrowUp'?-d:0)}));}
});
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&dirty)persist();});

async function importWallpaper(params){
  const banner=$('sourceBanner');banner.hidden=false;banner.textContent='Opening the original wallpaper…';
  try{
    const raw=params.get('source');if(!raw)throw new Error('Upload the original wallpaper to customize it.');
    const url=new URL(raw,location.origin);const allowed=url.origin===location.origin||['drive.google.com','lh3.googleusercontent.com','res.cloudinary.com'].includes(url.hostname);
    if(!allowed||!['http:','https:'].includes(url.protocol)||url.pathname.includes('/thumbnail')||url.pathname.includes('/thumbnails/'))throw new Error('Download the original wallpaper, then upload it here for a full-resolution design.');
    const response=await fetch(url,{mode:'cors',credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('Original unavailable');
    const blob=await response.blob();if(!['image/png','image/jpeg','image/webp'].includes(blob.type)||blob.size>25*1024*1024)throw new Error('Image requires manual upload');
    const data=await fileData(blob),photo=await addPhoto(data,null,params.get('title')||'Wallpaper');
    const el=photo.getElement();validateSize(el.naturalWidth,el.naturalHeight);doc.width=el.naturalWidth;doc.height=el.naturalHeight;photo.set({left:0,top:0,frameWidth:doc.width,frameHeight:doc.height});fitPhoto(photo,'fill');await paintBackground();setName(params.get('title')||'My wallpaper design');fitCanvas();canvas.setActiveObject(photo);canvas.requestRenderAll();checkpoint();banner.textContent='Original wallpaper loaded. Its existing usage terms apply to designs made with this artwork.';
  }catch(e){banner.replaceChildren(document.createTextNode('Bring in the original wallpaper to edit at full quality. '));const upload=document.createElement('button');upload.className='cr-button';upload.textContent='Upload original';upload.onclick=()=>pickPhotos();banner.append(upload);const link=document.createElement('a');link.href='/license.html';link.textContent=' Wallpaper usage terms';banner.append(link);}
}
async function start(){
  const params=new URLSearchParams(location.search);
  try{
    if(params.has('project')){const project=await getProject(params.get('project'));if(!project)throw new Error('This project is not saved in this browser. Open its downloaded .pmw file to continue.');await loadProject(project);}
    else if(params.has('source')||params.has('wallpaper')){await loadTemplate(blank());await importWallpaper(params);}
    else if(params.has('blank')||params.has('import')){await loadTemplate(blank());if(params.has('import'))$('projectDialog').showModal();}
    else{const selected=TEMPLATES.find(t=>t.id===params.get('template'))||TEMPLATES[0];$('editorCategory').value=selected.category;renderTemplates();await loadTemplate(selected);}
  }catch(e){await loadTemplate(blank());toast(e.message);}
  loading=false;ready=true;fitCanvas();await persist();
}
start();
