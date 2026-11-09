import fs from 'node:fs';import assert from 'node:assert/strict';
import {buildHomeAbout,compactHome} from './home-about.mjs';import {creativeHome} from './build-creative-entry.mjs';
buildHomeAbout();const home=fs.readFileSync('index.html','utf8'),about=fs.readFileSync('about/index.html','utf8');buildHomeAbout();assert.equal(fs.readFileSync('about/index.html','utf8'),about);assert.equal(fs.readFileSync('index.html','utf8'),home);
assert.equal(compactHome(home),home);assert.ok(!creativeHome(home).includes('id="editorialHome"'));assert.ok(creativeHome(home).includes('home-shortcuts'));
const guides=fs.readFileSync('content/about-guides.html','utf8');
for(const kind of ['creative','editorial']){const block=guides.match(new RegExp('<!-- pmw-'+kind+':home:start -->[\\s\\S]*?<!-- pmw-'+kind+':home:end -->'))?.[0];assert.ok(block);assert.ok(about.replaceAll('\r\n','\n').includes(block.replaceAll('\r\n','\n')),'About must retain the explanatory sections from the canonical guides');}
assert.ok(about.includes('href="/" class="nav-logo"'));assert.ok(about.includes('id="screen-fit"'));console.log('Homepage/About generation is repeatable; original sections retained; rebuilds keep the compact layout.');
for(const [,href] of about.matchAll(/href="([^"]+)"/g)){const url=new URL(href,'https://pmwvisuals.com/about/');if(url.origin!=='https://pmwvisuals.com')continue;const file='.'+url.pathname+(url.pathname.endsWith('/')?'index.html':'');assert.ok(fs.existsSync(file),'Missing About link: '+href);}
