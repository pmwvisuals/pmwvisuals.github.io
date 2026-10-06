import fs from 'node:fs';
import path from 'node:path';
import {siteRoot} from './editorial/catalog.mjs';
import {appearanceMarkup} from './theme/markup.mjs';
let changed=0;
function walk(dir) {
  for(const entry of fs.readdirSync(path.join(siteRoot,dir),{withFileTypes:true})) {
    const file=path.posix.join(dir,entry.name);
    if(entry.isDirectory()) {
      if(!['.git','node_modules','vendor','thumbnails','assets','backend','functions','scripts','docs'].includes(entry.name))walk(file);
    } else if(file.endsWith('.html')) {
      const before=fs.readFileSync(path.join(siteRoot,file),'utf8');
      const after=appearanceMarkup(before,file);
      if(after!==before) {fs.writeFileSync(path.join(siteRoot,file),after);changed++;}
    }
  }
}
walk('');
console.log(`Appearance markup: ${changed} files updated; wallpaper/tools URLs retained.`);
