import fs from 'node:fs';
import assert from 'node:assert/strict';
import worker from '../backend/wallpaper-image-worker/src/index.js';
import {IMAGE_BRIDGE_ORIGIN} from '../js/creative/image-config.js';
const catalog=JSON.parse(fs.readFileSync(new URL('../assets/wallpaper-catalog.json',import.meta.url),'utf8'));
const release=process.argv.includes('--release');
if(release&&!IMAGE_BRIDGE_ORIGIN)throw new Error('Deploy the image Worker and set IMAGE_BRIDGE_ORIGIN before release. See docs/wallpaper-to-design.md.');
const samples=[catalog.find(item=>item.driveFileId),catalog.find(item=>item.width>item.height)];
await Promise.all(samples.map(async item=>{
 const url=(release?IMAGE_BRIDGE_ORIGIN:'https://bridge-test.example')+'/images/'+encodeURIComponent(item.id);
 const request=new Request(url,{headers:{Origin:'https://pmwvisuals.com'}});
 const response=release?await fetch(request):await worker.fetch(request);
 assert.equal(response.status,200,`${item.id}: ${await (response.ok?Promise.resolve(''):response.text())}`);
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://pmwvisuals.com');
 const bytes=new Uint8Array(await response.arrayBuffer());
 assert.ok(bytes.length>100000,'Original unexpectedly small');
 const view=new DataView(bytes.buffer);assert.equal(view.getUint32(16),item.width);assert.equal(view.getUint32(20),item.height);
 console.log(`${release?'Deployed bridge':'Local bridge with live upstream'}: ${item.id}: ${bytes.length} bytes, ${item.width} × ${item.height}, PNG, CORS verified.`);
}));
