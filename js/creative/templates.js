import { escapeHTML } from './model.js';
export const CATEGORIES = [
  {id:'all',label:'All designs'}, {id:'thumbnail',label:'YouTube thumbnails'},
  {id:'collage',label:'Collages & vision boards'}, {id:'organizer',label:'Desktop organizers'}, {id:'background',label:'Backgrounds'}
];
const rect = (x,y,w,h,color,extra={}) => ({kind:'rect',x,y,w,h,color,...extra});
const text = (value,x,y,w,size,color,extra={}) => ({kind:'text',text:value,x,y,w,size,color,...extra});
const circle = (x,y,w,color,extra={}) => ({kind:'circle',x,y,w,h:w,color,...extra});
const photo = (x,y,w,h,art='mountains',extra={}) => ({kind:'photo',x,y,w,h,art,label:'Photo · replace with your own',...extra});
export function artworkSVG(kind='mountains') {
  const palette = kind==='desert' ? ['#ecb39b','#f8d9a7','#b9654c','#e79569'] : kind==='forest' ? ['#d7e7b7','#eef0c8','#335c4b','#769570'] : ['#b7c9eb','#fae3ba','#5d6ba0','#b5a6cf'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${palette[0]}"/><stop offset="1" stop-color="${palette[1]}"/></linearGradient></defs><rect width="1200" height="1000" fill="url(#sky)"/><circle cx="850" cy="270" r="132" fill="${palette[1]}"/><path d="M0 720 330 330 670 730 930 480 1200 690V1000H0Z" fill="${palette[3]}"/><path d="M0 850 310 650 640 820 880 540 1200 850V1000H0Z" fill="${palette[2]}"/><path d="M0 920Q280 800 550 920T1200 870V1000H0Z" fill="${palette[2]}" opacity=".5"/></svg>`;
}
const thumbnail = (id,name,description,color,bg,elements) => ({id,name,description,category:'thumbnail',width:1600,height:900,bg:{color1:bg,color2:bg,style:'solid'},elements,accent:color});
const collage = (id,name,bg,elements) => ({id,name,description:'An editable arrangement for your photos, notes, and everyday inspiration.',category:'collage',width:1000,height:1250,bg:{color1:bg,color2:bg,style:'solid'},elements,accent:'#957459'});
function organizer(id,name,bg,ink,panel,labels,style=0) {
  const elements=[text('A little space to think.',110,75,1500,66,ink,{font:'Georgia',label:'Workspace heading'}),text('MAKE ROOM FOR WHAT MATTERS',115,173,1450,19,ink)];
  labels.forEach((label,i)=>{
    const w=labels.length===3?520:385, x=110+i*(w+50), y=style===1?330:290;
    elements.push(rect(x,y,w,580,panel,{radius:26,alpha:.83,label:`${label} area`}),text(label,x+34,y+34,w-68,26,ink,{label:`${label} label`}),rect(x+34,y+88,w-68,2,ink,{alpha:.16}));
  });
  elements.push(text('YOUR DESKTOP, YOUR PACE.',114,989,1400,17,ink));
  return {id,name,description:'Rename the zones, move them to suit your icons, and make space for your day.',category:'organizer',width:1920,height:1080,bg:{color1:bg,color2:bg,style:'solid'},elements,accent:ink};
}
export const TEMPLATES = [
  thumbnail('make-something','Make something great','A bold tutorial cover with editable type and an illustrated photo frame.','#c8ee86','#f5f1e8',[
    rect(1040,-80,690,1100,'#d0e4d0',{angle:12}),photo(930,100,565,700,'forest'),rect(80,85,260,56,'#d7e6ca',{radius:28}),text('THE CREATOR SERIES',101,104,230,17,'#183d35'),text('MAKE\nSOMETHING\nGREAT.',80,220,850,118,'#153d34',{weight:800,lineHeight:.96}),text('A fresh idea starts here.',87,660,730,31,'#41645a'),circle(740,700,125,'#c4e883'),text('↗',766,712,100,74,'#153d34')]),
  thumbnail('next-level','Next level','An electric gaming layout with strong contrast and editable badges.','#d5fa50','#191b27',[
    rect(1020,-150,900,1300,'#b6a6fc',{angle:15}),circle(1010,90,570,'#6b58c9'),circle(1100,180,390,'#24223d'),text('PLAY / EXPLORE / REPEAT',90,90,1000,23,'#d5fa50'),text('NEXT\nLEVEL.',80,225,1100,180,'#ffffff',{weight:900,lineHeight:.92}),rect(87,730,550,68,'#d5fa50',{radius:8}),text('YOUR BEST RUN STARTS NOW',110,751,520,21,'#191b27')]),
  thumbnail('worth-it','Worth the hype?','An editorial review layout with space for a product photo.','#f0ab83','#f4e7db',[
    photo(840,70,680,760,'desert'),rect(70,80,210,53,'#1f2523',{radius:4}),text('THE HONEST REVIEW',86,98,200,15,'#fff'),text('WORTH\nTHE\nHYPE?',70,220,800,140,'#242a26',{weight:900,lineHeight:.94}),text('Let’s take a closer look.',77,742,710,32,'#6e6258')]),
  thumbnail('somewhere-new','Somewhere new','A travel story with a full photo backdrop and generous headline space.','#dfb2cd','#c4d5e3',[
    photo(0,0,1600,900,'mountains'),rect(0,0,800,900,'#18273f',{alpha:.83}),text('A WEEKEND WELL SPENT',85,94,800,23,'#ece1cd'),text('SOMEWHERE\nNEW.',80,300,950,112,'#fff',{weight:900,lineHeight:1}),text('Stories from the road  /  01',87,760,1000,27,'#fff')]),
  collage('slow-days','Slow days','#f2eee5',[
    text('slow days',65,60,880,76,'#383a2c',{font:'Georgia',weight:400}),text('A FEW THINGS WORTH KEEPING.',70,160,850,15,'#716f60'),photo(65,230,530,630,'forest'),photo(625,230,310,310,'mountains'),photo(625,570,310,290,'desert'),text('less rush,\nmore wonder.',70,920,850,64,'#424d39',{font:'Georgia',weight:400}),text('YOUR LITTLE COLLECTION OF GOOD THINGS',73,1160,900,14,'#7d7b6a')]),
  collage('weekend-notes','Weekend notes','#efe0cd',[
    rect(52,190,440,650,'#fffaf1',{angle:-4}),photo(80,220,360,460,'desert',{angle:-4}),text('the small moments',95,715,350,25,'#554334',{font:'Georgia',angle:-4}),rect(520,280,410,650,'#fffaf1',{angle:5}),photo(550,310,340,450,'mountains',{angle:5}),text('a new perspective',550,805,350,25,'#554334',{font:'Georgia',angle:5}),text('Weekend\nnotes.',72,66,870,65,'#514336',{font:'Georgia',weight:400}),text('COLLECT MEMORIES, NOT JUST PHOTOS.',75,1095,850,18,'#756451')]),
  collage('future-me','Future me','#e2e4f0',[
    text('THE LIFE I’M BUILDING',55,50,900,20,'#545272'),text('a little more me.',50,105,900,66,'#302c4e',{font:'Georgia'}),photo(55,235,430,430,'mountains'),photo(515,235,430,430,'forest'),rect(55,700,430,340,'#c0b6de',{radius:20}),text('Create.\nExplore.\nBegin again.',86,745,380,55,'#302c4e',{font:'Georgia',weight:400}),photo(515,700,430,340,'desert'),text('YOUR IDEAS DESERVE A PLACE TO GROW.',58,1150,900,16,'#686281')]),
  collage('four-frames','Four frames','#fff8ec',[
    text('ordinary / beautiful',55,55,900,51,'#2d473b',{font:'Georgia',weight:400}),photo(55,180,430,430,'forest'),photo(515,180,430,430,'desert'),photo(55,640,430,430,'mountains'),photo(515,640,430,430,'forest'),text('FOUR FRAMES. ONE GOOD STORY.',56,1140,900,18,'#667566')]),
  organizer('clear-desk','Clear desk','#eceee6','#344334','#fcfcf4',['Today','Projects','Personal']),
  organizer('study-space','Study space','#efe4d6','#675641','#fffbef',['Classes','In progress','Resources','Finished'],1),
  organizer('creative-corner','Creative corner','#ded8f0','#4a3c6b','#f4f0ff',['Ideas','Making','Ready']),
  organizer('after-hours','After hours','#1c2630','#d6efc4','#31414e',['Play','Create','Everything else']),
  ...[
    ['soft-horizon','Soft horizon','#e3b5a0','#b4cdbb','gradient'],
    ['electric-orbit','Electric orbit','#312e6c','#9f96e5','orbits'],
    ['paper-waves','Paper waves','#f5dfbc','#d38c6f','waves'],
    ['fresh-grid','Fresh grid','#e3ecd5','#759a77','grid']
  ].map(([id,name,color1,color2,style])=>({id,name,description:'Make this background your own with color, pattern, and texture controls.',category:'background',width:1920,height:1080,bg:{color1,color2,style,seed:42,grain:0},elements:[],accent:color2}))
];
export function backgroundElements(bg,w,h) {
  if(bg.style==='orbits') return [circle(w*.56,-h*.25,h*1.4,bg.color2,{alpha:.24}),circle(w*.62,-h*.12,h*1.12,bg.color1,{alpha:.65}),circle(-w*.08,h*.4,h*.9,bg.color2,{alpha:.35})];
  if(bg.style==='waves') return Array.from({length:6},(_,i)=>({kind:'path',path:`M 0 ${h*(.35+i*.11)} Q ${w*.28} ${h*(.05+i*.11)} ${w*.55} ${h*(.43+i*.11)} T ${w} ${h*(.3+i*.11)} L ${w} ${h} L 0 ${h} Z`,color:i%2?bg.color1:bg.color2,alpha:.25+i*.07,label:'Wave'}));
  if(bg.style==='grid') return [...Array.from({length:17},(_,i)=>rect(i*w/16,0,1.5,h,bg.color2,{alpha:.25})),...Array.from({length:10},(_,i)=>rect(0,i*h/9,w,1.5,bg.color2,{alpha:.25})),circle(w*.67,h*.12,h*.52,bg.color2,{alpha:.45})];
  return [];
}
export function templateSVG(template) {
  const {width:w,height:h,bg}=template;
  const items=[...backgroundElements(bg,w,h),...template.elements];
  const svgItems=items.map(o=>{
    const transform=`translate(${o.x||0} ${o.y||0}) rotate(${o.angle||0})`;
    const common=`transform="${transform}" fill="${o.color||'#fff'}" opacity="${o.alpha??1}"`;
    if(o.kind==='rect')return `<rect ${common} width="${o.w}" height="${o.h}" rx="${o.radius||0}"/>`;
    if(o.kind==='circle')return `<circle ${common} cx="${o.w/2}" cy="${o.w/2}" r="${o.w/2}"/>`;
    if(o.kind==='path')return `<path fill="${o.color}" opacity="${o.alpha}" d="${o.path}"/>`;
    if(o.kind==='photo')return `<svg x="${o.x}" y="${o.y}" width="${o.w}" height="${o.h}" viewBox="0 0 1200 1000" preserveAspectRatio="xMidYMid slice" transform="rotate(${o.angle||0} ${o.x} ${o.y})">${artworkSVG(o.art).replace(/^.*?<svg[^>]*>|<\/svg>$/g,'')}</svg>`;
    if(o.kind==='text')return `<text ${common} font-family="${o.font||'Arial'},sans-serif" font-weight="${o.weight||700}" font-size="${o.size}">${o.text.split('\n').map((line,i)=>`<tspan x="0" y="${o.size*.82+i*o.size*(o.lineHeight||1.16)}">${escapeHTML(line)}</tspan>`).join('')}</text>`;
    return '';
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="${bg.color1}"/><stop offset="1" stop-color="${bg.color2}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="${bg.style==='solid'?bg.color1:'url(#bg)'}"/>${svgItems}</svg>`;
}
export const previewURL = template => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(templateSVG(template))}`;
