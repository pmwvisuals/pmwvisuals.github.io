import catalog from './catalog.json' with { type: 'json' };

export const MAX_BYTES=25*1024*1024;
const DEFAULT_ORIGINS='https://pmwvisuals.com,https://www.pmwvisuals.com,http://127.0.0.1:8767,http://localhost:8767';
const allowedHost=host=>['drive.google.com','drive.usercontent.google.com','res.cloudinary.com'].includes(host)||host.endsWith('.googleusercontent.com');
function validUpstream(value){const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&allowedHost(url.hostname);}
function signature(bytes,type){
  if(type==='image/png')return [137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b);
  if(type==='image/jpeg')return bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  return type==='image/webp'&&new TextDecoder().decode(bytes.slice(0,4))==='RIFF'&&new TextDecoder().decode(bytes.slice(8,12))==='WEBP';
}
export function createImageHandler({manifest=catalog,fetchImpl=(...args)=>fetch(...args),cache,timeoutMs=15000}={}){
  return {async fetch(request,env={},context={}){
    const origin=request.headers.get('Origin');
    const origins=(env.ALLOWED_ORIGINS||DEFAULT_ORIGINS).split(',').map(s=>s.trim());
    const reply=(body,status=200,headers={})=>new Response(body,{status,headers:{'X-Content-Type-Options':'nosniff',...(origin&&origins.includes(origin)?{'Access-Control-Allow-Origin':origin}:{}),'Vary':'Origin',...headers}});
    if(origin&&!origins.includes(origin))return reply('Origin not allowed',403);
    const url=new URL(request.url);
    if(url.pathname==='/health'&&request.method==='GET')return reply(JSON.stringify({ok:true,images:Object.keys(manifest).length}),200,{'Content-Type':'application/json'});
    const match=url.pathname.match(/^\/images\/([a-zA-Z0-9_-]{1,180})$/);
    if(!match||url.search||!Object.hasOwn(manifest,match[1]))return reply('Wallpaper not found',404);
    if(request.method==='OPTIONS')return reply(null,204,{'Access-Control-Allow-Methods':'GET, OPTIONS','Access-Control-Max-Age':'86400'});
    if(request.method!=='GET')return reply('Method not allowed',405,{'Allow':'GET, OPTIONS'});
    const upstream=manifest[match[1]];
    if(!validUpstream(upstream))return reply('Unsupported image host',502);
    // Cache by the current manifest source as well as ID, without origin-specific headers.
    const cacheStore=cache||globalThis.caches?.default;
    const cacheURL=new URL(url);cacheURL.searchParams.set('source',upstream);
    const cacheKey=new Request(cacheURL);
    const cached=await cacheStore?.match(cacheKey);
    if(cached)return reply(cached.body,200,{'Content-Type':cached.headers.get('Content-Type'),'Cache-Control':'public, max-age=86400'});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    let reader;
    try{
      let current=upstream,response;
      for(let redirects=0;redirects<=4;redirects++){
        if(!validUpstream(current))throw new Error('Redirect host not allowed');
        response=await fetchImpl(current,{redirect:'manual',signal:controller.signal,headers:{Accept:'image/png,image/jpeg,image/webp'}});
        if([301,302,303,307,308].includes(response.status)){
          const next=response.headers.get('Location');await response.body?.cancel();
          if(!next||redirects===4)throw new Error('Too many redirects');
          current=new URL(next,current).href;continue;
        }
        break;
      }
      if(!response?.ok)throw new Error('Original unavailable');
      const type=(response.headers.get('Content-Type')||'').split(';')[0].toLowerCase();
      if(!['image/png','image/jpeg','image/webp'].includes(type)||Number(response.headers.get('Content-Length'))>MAX_BYTES){await response.body?.cancel();throw new Error('Unsupported or oversized original');}
      reader=response.body?.getReader();if(!reader)throw new Error('Empty original');
      const chunks=[];let length=0;
      while(true){const {value,done}=await reader.read();if(done)break;length+=value.byteLength;if(length>MAX_BYTES)throw new Error('Original exceeds 25 MB');chunks.push(value);}
      const bytes=new Uint8Array(length);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
      if(!signature(bytes,type))throw new Error('Invalid image response');
      const result=new Response(bytes,{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400'}});
      if(cacheStore){const job=cacheStore.put(cacheKey,result.clone()).catch(()=>{});if(context.waitUntil)context.waitUntil(job);else await job;}
      return reply(result.body,200,{'Content-Type':type,'Cache-Control':'public, max-age=86400'});
    }catch(error){await reader?.cancel().catch(()=>{});return reply(JSON.stringify({error:controller.signal.aborted?'image_timeout':'original_unavailable',message:'The original could not be loaded. Retry or upload the original in the editor.'}),controller.signal.aborted?504:502,{'Content-Type':'application/json','Cache-Control':'no-store'});}
    finally{clearTimeout(timer);}
  }};
}
export default createImageHandler();
