import fs from 'node:fs';
import path from 'node:path';
import {loadCatalog,siteRoot,json} from './editorial/catalog.mjs';

// Catalog generation is deliberately separate from page generation.
const {records,pages,pageMap}=loadCatalog();
const pageById=new Map(pages.map(item=>[item.id,item]));
const items=records.filter(item=>item.visible!==false&&String(item.access).toLowerCase()!=='premium'&&!item.premium&&!item.isPremium).map(item=>{
  const preview=new URL(pageById.get(item.id)?.preview||item.thumbnail||item.preview,'https://pmwvisuals.com/'+(pageMap[item.id]||''));
  return {id:item.id,title:item.title,width:item.width,height:item.height,preview:preview.origin==='https://pmwvisuals.com'?preview.pathname:preview.href,download:item.download,path:pageMap[item.id]||null,...(item.driveFileId?{driveFileId:item.driveFileId}:{}),publicCatalog:true};
});
const file=path.join(siteRoot,'assets/wallpaper-catalog.json');
const content=json(items)+'\n';
const changed=!fs.existsSync(file)||fs.readFileSync(file,'utf8')!==content;
if(changed)fs.writeFileSync(file,content);
console.log(`Wallpaper catalog: ${items.length} public originals; ${changed?1:0} files changed. Page layout unchanged.`);
await import('./build-wallpaper-studio.mjs');
