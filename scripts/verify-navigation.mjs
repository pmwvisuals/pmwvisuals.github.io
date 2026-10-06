import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {siteRoot} from './editorial/catalog.mjs';
let checks=0,pages=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
function walk(dir) {
  for(const entry of fs.readdirSync(path.join(siteRoot,dir),{withFileTypes:true})) {
    const file=path.posix.join(dir,entry.name);
    if(entry.isDirectory()) {
      if(!['.git','node_modules','vendor','thumbnails','assets','backend','functions','scripts','docs'].includes(entry.name))walk(file);
    } else if(file.endsWith('.html')) {
      const html=fs.readFileSync(path.join(siteRoot,file),'utf8');
      if(!html.includes('pmw-site-menu:start'))continue;
      pages++;
      const ids=[...html.matchAll(/\s+id="([^"]+)"/g)].map(x=>x[1]);
      check(new Set(ids).size===ids.length,`${file}: duplicate IDs`);
      check(html.includes('aria-controls="pmwSiteMenu"'),`${file}: trigger missing`);
      const nav=html.match(/<nav class="pmw-site-nav[\s\S]*?<\/nav>/)?.[0];
      check(nav&&!/class="(?:nav-links|tools-nav-links|ed-nav-links)"/.test(nav),`${file}: old top buttons remain`);
      const drawer=html.match(/<!-- pmw-site-menu:start -->([\s\S]*?)<!-- pmw-site-menu:end -->/)[1];
      check((drawer.match(/class="pmw-site-menu-featured/g)||[]).length===2,`${file}: featured destinations changed`);
      check(!drawer.includes('pmw-studio.html'),`${file}: Studio link returned`);
      for(const [,url] of drawer.matchAll(/href="([^"]+)"/g)) {
        const local=url.endsWith('/')?url.slice(1)+'index.html':url.slice(1);
        check(fs.existsSync(path.join(siteRoot,local)),`${file}: missing menu destination ${url}`);
      }
    }
  }
}
walk('');
const home=fs.readFileSync(path.join(siteRoot,'index.html'),'utf8');
check(!/accessFilterSelect|activeAccess|mobileSiteMenuToggle/.test(home),'Removed filter or old menu references remain');
check(home.includes('categoryFilterSelect')&&home.includes('styleFilterSelect')&&home.includes('deviceToggle'),'Remaining filter hooks missing');
check(fs.existsSync(path.join(siteRoot,'assets/brand/pmw-visuals-logo.png')),'Uploaded logo missing');
new vm.Script(fs.readFileSync(path.join(siteRoot,'js/site-navigation.js'),'utf8'));
console.log(`Navigation verification: ${pages} menus, ${checks} checks passed; main destinations highlighted and access filter removed.`);
