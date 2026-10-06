import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {siteRoot} from './editorial/catalog.mjs';
import {hasAppearance} from './theme/markup.mjs';

const runtime=fs.readFileSync(path.join(siteRoot,'js/pmw-theme.js'),'utf8');
let checks=0;
const check=(value,message)=>{assert.ok(value,message);checks++;};
function scenario(preference,unavailable=false) {
  const values=new Map(preference===undefined?[]:[['pmw_theme_preference',preference]]);
  const events=[]; const listeners=new Map();
  const meta={content:''};
  const root={dataset:{},style:{}};
  const document={readyState:'complete',body:{},documentElement:root,querySelector:()=>meta,querySelectorAll:()=>[]};
  const window={location:{pathname:'/'},localStorage:{getItem:key=>{if(unavailable)throw new Error('Blocked storage');return values.get(key)||null;},setItem:(key,value)=>{if(unavailable)throw new Error('Blocked storage');values.set(key,value);}},addEventListener:(name,fn)=>listeners.set(name,fn),dispatchEvent:event=>events.push(event),setTimeout:()=>{}};
  vm.runInNewContext(runtime,{document,window,navigator:{},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail;} }});
  return {theme:window.PMWTheme,root,values,meta,listeners,events};
}
for(const value of [undefined,null,'','invalid']) {
  const state=scenario(value);
  check(state.theme.get()==='light','New/invalid preference must default to light');
  check(state.root.style.colorScheme==='light','Native controls must follow the light default');
}
const dark=scenario('dark');
check(dark.theme.get()==='dark','Existing explicit dark choice should be preserved');
dark.theme.set('light',{persist:false});
check(dark.theme.get()==='light'&&dark.values.get('pmw_theme_preference')==='dark','Preview should not overwrite saved preference');
dark.theme.set('light');
check(dark.values.get('pmw_theme_preference')==='light','Confirmation should save the preference');
dark.theme.toggle();
check(dark.theme.get()==='dark'&&dark.values.get('pmw_theme_preference')==='dark','Profile toggle should remain compatible');
dark.listeners.get('storage')({key:'pmw_theme_preference',newValue:'light'});
check(dark.theme.get()==='light','Storage event should synchronize other tabs');
const blocked=scenario(undefined,true);
blocked.theme.set('dark');
check(blocked.theme.get()==='dark','Blocked storage should still allow a page-local choice');
check(dark.events.some(e=>e.type==='pmw:themechange'),'Existing theme-change event should remain available');

let pages=0;
function walk(dir) {
  for(const entry of fs.readdirSync(path.join(siteRoot,dir),{withFileTypes:true})) {
    const file=path.posix.join(dir,entry.name);
    if(entry.isDirectory()) {
      if(!['.git','node_modules','vendor','thumbnails','assets','backend','functions','scripts','docs'].includes(entry.name))walk(file);
    } else if(file.endsWith('.html')&&hasAppearance(file)) {
      const html=fs.readFileSync(path.join(siteRoot,file),'utf8'); pages++;
      check(/<html[^>]*data-theme="light"/.test(html),`${file}: initial theme missing`);
      check(html.includes('/css/site-appearance.css?v=20261006-light-v1'),`${file}: light stylesheet missing`);
      check(html.includes('/js/theme-chooser.js?v=20261006-light-v1'),`${file}: chooser missing`);
      check(html.includes('pmw-theme.js?v=20261006-light-v1'),`${file}: stale theme runtime`);
    }
  }
}
walk('');
for(const stem of ['compression','resize','conversion'])check(fs.existsSync(path.join(siteRoot,`assets/tools/${stem}-workflow-light.svg`)),`Missing light diagram: ${stem}`);
new vm.Script(fs.readFileSync(path.join(siteRoot,'js/theme-chooser.js'),'utf8'));
check(!fs.readFileSync(path.join(siteRoot,'pmw-studio.html'),'utf8').includes('site-appearance.css'),'Studio should remain outside the new theme scope');
console.log(`Appearance verification: ${pages} scoped pages, ${checks} checks passed. No file-processing tools were run.`);
