import { getPreset } from './presets.js';

// Shared by the homepage previews and their editable canvas designs.
const source = '/assets/home/somewhere-new.webp';
const ink = '#fff3dc';
const gold = '#dfbd72';
const text = (value,x,y,w,size,extra={}) => ({kind:'text',text:value,x,y,w,size,color:ink,font:'Georgia',weight:400,lineHeight:1.16,...extra});
const rule = (x,y,w) => ({kind:'rect',x,y,w,h:3,color:gold});
export const SHOWCASE_DESIGNS = [
  {id:'youtube',label:'YouTube',preset:'youtube-thumbnail',focusX:.5,elements:[
    text('G O   S O M E W H E R E',0,72,1280,25,{font:'Arial',align:'center'}),
    text('NEW',0,116,1280,100,{align:'center'}),rule(135,84,90),rule(1055,84,90)
  ]}
].map(design=>{
  const preset=getPreset(design.preset);
  return {...design,source,width:preset.width,height:preset.height,ratio:preset.ratio,
    elements:[{kind:'rect',x:0,y:0,w:preset.width,h:preset.height,color:'#000000',alpha:.17},...design.elements]};
});
export const getShowcaseDesign = id => SHOWCASE_DESIGNS.find(design=>design.id===id);
export const showcaseURL = design => `/editor/?showcase=${design.id}`;
const escape = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function showcaseSVG(design) {
  const alignment=design.focusX===0?'xMinYMid':design.focusX===1?'xMaxYMid':'xMidYMid';
  const layers=design.elements.map(o=>{
    if(o.kind==='rect')return `<rect x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" fill="${o.color}" opacity="${o.alpha??1}"/>`;
    const center=o.align==='center',x=center?o.x+o.w/2:o.x;
    return `<text fill="${o.color}" font-family="${o.font}" font-size="${o.size}" font-weight="${o.weight}" text-anchor="${center?'middle':'start'}">${o.text.split('\n').map((line,i)=>`<tspan x="${x}" y="${o.y+o.size*.82+i*o.size*o.lineHeight}">${escape(line)}</tspan>`).join('')}</text>`;
  }).join('');
  return `<svg viewBox="0 0 ${design.width} ${design.height}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"><image href="${source}" width="${design.width}" height="${design.height}" preserveAspectRatio="${alignment} slice"/>${layers}</svg>`;
}
