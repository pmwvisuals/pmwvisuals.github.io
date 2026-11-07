import test from 'node:test';
import assert from 'node:assert/strict';
import {PRESETS,getPreset,cropToFill} from '../js/creative/presets.js';
import {validateSize,validateProject} from '../js/creative/model.js';
import {originalURLs} from '../js/creative/wallpaper-catalog.js';
test('all platform presets have valid dimensions and unique IDs',()=>{
 assert.equal(new Set(PRESETS.map(p=>p.id)).size,14);
 for(const p of PRESETS)assert.deepEqual(validateSize(p.width,p.height),{width:p.width,height:p.height});
 assert.equal(getPreset('pinterest-pin').height,1500);assert.equal(getPreset('unknown'),undefined);
});
test('crop fills without stretching across portrait, landscape and square inputs',()=>{
 for(const [iw,ih] of [[941,1672],[1672,941],[1000,1000]])for(const {width,height} of PRESETS){
  const c=cropToFill(iw,ih,width,height);
  assert.ok(Math.abs(c.width*c.scale-width)<1e-8);assert.ok(Math.abs(c.height*c.scale-height)<1e-8);
  assert.ok(c.cropX>=0&&c.cropY>=0&&c.cropX+c.width<=iw+1e-8&&c.cropY+c.height<=ih+1e-8);
  assert.ok(Math.abs(c.cropX-(iw-c.width)/2)<1e-8);assert.ok(Math.abs(c.cropY-(ih-c.height)/2)<1e-8);
 }
});
test('focus is bounded and invalid dimensions fail',()=>{
 assert.equal(cropToFill(300,600,100,100,2,2).cropY,300);
 assert.throws(()=>cropToFill(0,600,100,100));
});
test('project format stays backwards compatible with optional wallpaper context',()=>{
 const project={format:'pmw-design',version:1,width:1080,height:1080,title:'Wallpaper',bg:{style:'solid',color1:'#ffffff',color2:'#ffffff'},scene:{objects:[]}};
 assert.equal(validateProject(project),project);
 assert.equal(validateProject({...project,wallpaperContext:{wallpaperId:'sample',presetId:'instagram-square'}}).wallpaperContext.presetId,'instagram-square');
 assert.throws(()=>validateProject({...project,wallpaperContext:{wallpaperId:'sample',presetId:'unknown'}}));
});
test('Drive import resolves the original download host, never a thumbnail',()=>{
 const urls=originalURLs({download:'https://drive.google.com/uc?export=download&id=sample',driveFileId:'sample'});
 assert.equal(urls[0],'https://drive.usercontent.google.com/download?id=sample&export=download');
 assert.ok(urls.every(url=>!url.includes('thumbnail')));
});
