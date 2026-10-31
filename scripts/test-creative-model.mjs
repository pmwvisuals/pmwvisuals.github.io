import test from 'node:test';
import assert from 'node:assert/strict';
import {fitTransform,validateSize,validateProject} from '../js/creative/model.js';
test('ratio changes preserve proportions and center the composition',()=>{
  assert.deepEqual(fitTransform(1920,1080,1080,1080),{scale:.5625,x:0,y:236.25});
  assert.deepEqual(fitTransform(1920,1080,1080,1080,'fill'),{scale:1,x:-420,y:0});
});
test('large, invalid, and noninteger canvas dimensions are rejected',()=>{
  for(const [w,h] of [[0,100],[Infinity,100],[300.5,800],[8192,8192],[100,-1]])assert.throws(()=>validateSize(w,h));
  assert.deepEqual(validateSize(3840,2160),{width:3840,height:2160});
});
test('a project cannot introduce remote images or unsupported canvas objects',()=>{
  const base={format:'pmw-design',version:1,title:'Test',width:1920,height:1080,bg:{style:'solid',color1:'#ffffff',color2:'#ffffff'},assets:{},scene:{objects:[]}};
  assert.equal(validateProject(base),base);
  assert.throws(()=>validateProject({...base,scene:{objects:[{type:'Image',src:'https://example.com/photo.png'}]}}));
  assert.throws(()=>validateProject({...base,scene:{objects:[{type:'Group',objects:[]}]}}));
  assert.throws(()=>validateProject({...base,scene:{objects:[],backgroundImage:{src:'https://example.com/a'}}}));
});
