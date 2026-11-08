// PMW export defaults. Covers are still images, not generated videos.
export const PRESETS = Object.freeze([
  ['instagram-square','Instagram','Square post','1:1',1080,1080],
  ['instagram-portrait','Instagram','Portrait post','4:5',1080,1350],
  ['instagram-story','Instagram','Story','9:16',1080,1920],
  ['instagram-reel','Instagram','Reel cover','9:16',1080,1920],
  ['facebook-square','Facebook','Square post','1:1',1080,1080],
  ['facebook-portrait','Facebook','Portrait post','4:5',1080,1350],
  ['facebook-landscape','Facebook','Landscape post','1.91:1',1200,630],
  ['facebook-story','Facebook','Story','9:16',1080,1920],
  ['facebook-reel','Facebook','Reel cover','9:16',1080,1920],
  ['tiktok-cover','TikTok','Cover','9:16',1080,1920],
  ['youtube-thumbnail','YouTube','Thumbnail','16:9',1280,720],
  ['pinterest-pin','Pinterest','Pin','2:3',1000,1500],
  ['phone-wallpaper','Wallpaper','Phone','9:16',1080,1920],
  ['desktop-wallpaper','Wallpaper','Desktop','16:9',1920,1080]
].map(([id,platform,purpose,ratio,width,height]) => Object.freeze({id,platform,purpose,ratio,width,height,label:`${platform} · ${purpose} · ${ratio}`})));
export const getPreset = id => PRESETS.find(preset => preset.id === id);

export function cropToFill(imageWidth,imageHeight,width,height,focusX=.5,focusY=.5) {
  if (![imageWidth,imageHeight,width,height].every(n=>Number.isFinite(n)&&n>0)) throw new Error('Invalid crop dimensions.');
  const scale=Math.max(width/imageWidth,height/imageHeight);
  const cropWidth=Math.min(imageWidth,width/scale),cropHeight=Math.min(imageHeight,height/scale);
  return {scale,width:cropWidth,height:cropHeight,cropX:(imageWidth-cropWidth)*Math.max(0,Math.min(1,focusX)),cropY:(imageHeight-cropHeight)*Math.max(0,Math.min(1,focusY))};
}
