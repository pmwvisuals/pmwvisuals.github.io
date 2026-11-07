import test from 'node:test';
import assert from 'node:assert/strict';
import {createImageHandler,MAX_BYTES} from './index.js';
const manifest={sample:'https://drive.usercontent.google.com/download?id=public&export=download'};
const png=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
const request=(path='/images/sample',options={})=>new Request('https://bridge.example'+path,{headers:{Origin:'https://pmwvisuals.com'},...options});
const image=()=>new Response(png,{headers:{'Content-Type':'image/png'}});
test('serves a catalog original with CORS and separate cache origins',async()=>{
 const map=new Map(),cache={match:async r=>map.get(r.url)?.clone(),put:async(r,v)=>map.set(r.url,v)};let calls=0;
 const worker=createImageHandler({manifest,cache,fetchImpl:async()=>{calls++;return image();}});
 const first=await worker.fetch(request());assert.equal(first.status,200);assert.equal(first.headers.get('Access-Control-Allow-Origin'),'https://pmwvisuals.com');assert.deepEqual(new Uint8Array(await first.arrayBuffer()),png);
 const next=await worker.fetch(request('/images/sample',{headers:{Origin:'http://127.0.0.1:8767'}}));assert.equal(next.headers.get('Access-Control-Allow-Origin'),'http://127.0.0.1:8767');assert.equal(calls,1);
});
test('rejects arbitrary URLs, unknown IDs, origins, and methods without upstream requests',async()=>{
 const worker=createImageHandler({manifest,fetchImpl:async()=>{throw new Error('must not fetch');}});
 for(const path of ['/images/unknown','/images/sample?url=https://evil.example','/images/https://evil.example'])assert.equal((await worker.fetch(request(path))).status,404);
 assert.equal((await worker.fetch(request('/images/sample',{headers:{Origin:'https://evil.example'}}))).status,403);
 assert.equal((await worker.fetch(request('/images/sample',{method:'POST'}))).status,405);
 assert.equal((await worker.fetch(request('/images/sample',{method:'OPTIONS'}))).status,204);
});
test('allows approved redirects and rejects external redirects',async()=>{
 let calls=0;const good=createImageHandler({manifest,fetchImpl:async()=>++calls===1?Response.redirect('https://lh3.googleusercontent.com/original',302):image()});assert.equal((await good.fetch(request())).status,200);
 const bad=createImageHandler({manifest,fetchImpl:async()=>Response.redirect('https://example.org/image.png',302)});assert.equal((await bad.fetch(request())).status,502);
});
test('rejects HTML, spoofed image types, oversized responses and exhausted redirects',async()=>{
 for(const response of [new Response('<html>Confirm download</html>',{headers:{'Content-Type':'text/html'}}),new Response('not an image',{headers:{'Content-Type':'image/png'}}),new Response(png,{headers:{'Content-Type':'image/png','Content-Length':String(MAX_BYTES+1)}})]){
  assert.equal((await createImageHandler({manifest,fetchImpl:async()=>response}).fetch(request())).status,502);
 }
 assert.equal((await createImageHandler({manifest,fetchImpl:async()=>Response.redirect(manifest.sample)}).fetch(request())).status,502);
});
test('enforces streamed byte limit when content length is absent',async()=>{
 const worker=createImageHandler({manifest,fetchImpl:async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array(MAX_BYTES));c.enqueue(new Uint8Array(1));c.close();}}),{headers:{'Content-Type':'image/png'}})});
 assert.equal((await worker.fetch(request())).status,502);
});
test('times out stalled upstream requests',async()=>{
 const worker=createImageHandler({manifest,timeoutMs:10,fetchImpl:async(_,options)=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('aborted'))))});
 assert.equal((await worker.fetch(request())).status,504);
});
