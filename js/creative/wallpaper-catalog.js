import { IMAGE_BRIDGE_ORIGIN } from './image-config.js';

let catalogPromise;
export function loadWallpaperCatalog() {
  return catalogPromise ||= fetch('/assets/wallpaper-catalog.json').then(response=>{
    if(!response.ok)throw new Error('The wallpaper catalog could not load. Please retry.');
    return response.json();
  }).catch(error=>{catalogPromise=null;throw error;});
}
export function editorURL(item,preset) {
  return `/editor/?${new URLSearchParams({wallpaper:item.id,preset:preset.id})}`;
}
export function originalURLs(item) {
  const source=new URL(item.download,globalThis.location?.origin||'https://pmwvisuals.com');
  const bridge=IMAGE_BRIDGE_ORIGIN&&item.publicCatalog ? `${IMAGE_BRIDGE_ORIGIN}/images/${encodeURIComponent(item.id)}` : '';
  if (item.driveFileId) {
    const direct=`https://drive.usercontent.google.com/download?${new URLSearchParams({id:item.driveFileId,export:'download'})}`;
    return [...new Set([bridge,direct,item.download].filter(Boolean))];
  }
  if(source.protocol!=='https:'&&source.origin!==globalThis.location?.origin) throw new Error('This image source is not supported.');
  return [...new Set([item.download,bridge].filter(Boolean))];
}
export async function resolveEditorWallpaper(id) {
  const catalog=await loadWallpaperCatalog();
  const item=catalog.find(item=>item.id===id);
  if(item)return {...item,publicCatalog:true};
  // Dynamic premium artwork is never added to the public bridge allowlist.
  const [{auth},{onAuthStateChanged},{isPremiumUser},{loadVisibleWallpapers}]=await Promise.all([
    import('../firebase.js'),import('https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js'),
    import('../premium-access.js'),import('../wallpaper-source.js')
  ]);
  const user=await new Promise(resolve=>{const unsubscribe=onAuthStateChanged(auth,user=>{unsubscribe();resolve(user);});});
  if(!user||!await isPremiumUser(user))throw new Error('This wallpaper is unavailable or requires premium access. Browse wallpapers or sign in with an eligible account.');
  const {items}=await loadVisibleWallpapers({access:'premium',allowFallback:false});
  const premium=items.find(item=>item.id===id);
  if(!premium)throw new Error('This wallpaper is no longer available. Choose another wallpaper.');
  return premium;
}
