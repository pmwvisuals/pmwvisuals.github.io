import fs from 'node:fs';
import path from 'node:path';
import {siteRoot} from './editorial/catalog.mjs';
import {galleryLayout} from './editorial/gallery-layout.mjs';
import {appearanceMarkup} from './theme/markup.mjs';

let changed=0;
const write=(file,text)=>{
  text=appearanceMarkup(text,file);
  const target=path.join(siteRoot,file);
  const before=fs.readFileSync(target,'utf8');
  if(before===text)return;
  fs.writeFileSync(target,text);changed++;
};
write('index.html',galleryLayout(fs.readFileSync(path.join(siteRoot,'index.html'),'utf8')));
// Remove inbound Studio navigation, retaining the standalone Studio file and assets.
function walk(dir) {
  for(const entry of fs.readdirSync(path.join(siteRoot,dir),{withFileTypes:true})) {
    const file=path.join(dir,entry.name);
    if(entry.isDirectory()) {
      if(!['.git','node_modules','vendor','thumbnails','assets','backend','functions','scripts','docs'].includes(entry.name))walk(file);
    } else if((file.endsWith('.html')||entry.name==='pmwvisuals-home-page')&&entry.name!=='pmw-studio.html') {
      let html=fs.readFileSync(path.join(siteRoot,file),'utf8');
      html=html.replace(/<a\b[^>]*href="[^"]*pmw-studio\.html[^"]*"[^>]*>[\s\S]*?<\/a>/g,'');
      html=html.replace(/<button\b[^>]*onclick="[^"]*pmw-studio\.html[^"]*"[^>]*>[\s\S]*?<\/button>/g,'');
      html=html.replace(/window\.location\.href\s*=\s*(['"])[^'"]*pmw-studio\.html\1/g,"window.location.href = '/'");
      html=html.replace('<strong>Creative Projects</strong><span>Stay connected with PMW Studio and future PMW projects.</span>','<strong>Saved Inspiration</strong><span>Keep favorite wallpapers together and return to the artwork you love.</span>');
      html=html.replace(/(src="[^"]*platform-footer\.js)(?:\?[^"]*)?"/g,'$1?v=20261006-gallery"');
      html=html.replace(/^[ \t]+(?=\r?$)/gm,'');
      write(file,html);
    }
  }
}
walk('');
const sitemap=fs.readFileSync(path.join(siteRoot,'sitemap.xml'),'utf8').replace(/\s*<url>\s*<loc>[^<]*\/pmw-studio\.html<\/loc>[\s\S]*?<\/url>/g,'');
write('sitemap.xml',sitemap);
console.log(`Gallery/navigation update: ${changed} files changed. Studio files retained; inbound Studio links and sitemap entry removed.`);
