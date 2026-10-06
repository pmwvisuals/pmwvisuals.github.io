(function () {
  'use strict';
  const qualityInput = document.getElementById('guideQuality');
  let exampleStarted = false;
  let exampleImage = null;
  let exampleUrl = '';
  let exampleToken = 0;
  let exampleTimer;

  async function encodeExample() {
    const token = ++exampleToken;
    const output = document.getElementById('guideQualitySize');
    const image = document.getElementById('guideQualityImage');
    const button = document.getElementById('guideRunQuality');
    const quality = Number(qualityInput.value) / 100;
    output.textContent = 'Encoding the local sample…';
    try {
      if (!exampleImage) {
        exampleImage = new Image();
        exampleImage.src = '/thumbnails/google-drive/14iXY0uyDwJ68hXvBYB0KePk80Qno3m1r.webp';
      }
      await exampleImage.decode();
      const canvas = document.createElement('canvas');
      canvas.width = exampleImage.naturalWidth;
      canvas.height = exampleImage.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas unavailable');
      ctx.drawImage(exampleImage,0,0);
      const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if (!blob || blob.type !== 'image/jpeg') throw new Error('JPEG export unavailable');
      if (token !== exampleToken) return;
      if (exampleUrl) URL.revokeObjectURL(exampleUrl);
      exampleUrl = URL.createObjectURL(blob);
      image.src = exampleUrl; image.hidden = false;
      document.getElementById('guideQualityPlaceholder').hidden = true;
      output.textContent = `${(blob.size/1024).toFixed(1)} KiB · ${canvas.width} × ${canvas.height} JPEG · ${Math.round(quality*100)}% setting`;
      button.textContent = 'Update quality example';
    } catch (_) {
      if (token===exampleToken) output.textContent = 'This browser could not run the sample. The format guide below is still available.';
    }
  }
  if (qualityInput) {
    qualityInput.addEventListener('input',()=>{
      document.getElementById('guideQualityValue').textContent = qualityInput.value+'%';
      if (exampleStarted) { clearTimeout(exampleTimer); exampleTimer=setTimeout(encodeExample,140); }
    });
    document.getElementById('guideRunQuality').addEventListener('click',()=>{exampleStarted=true;encodeExample();});
  }
  document.querySelectorAll('[data-guide-quality]').forEach(link=>link.addEventListener('click',()=>{
    const actual=document.getElementById('compressQuality');
    if (!actual) return;
    actual.value=link.dataset.guideQuality;
    actual.dispatchEvent(new Event('input',{bubbles:true}));
  }));

  function gcd(a,b) { while(b) [a,b]=[b,a%b]; return a; }
  function updateRatio() {
    const sw=Number(document.getElementById('guideSourceWidth').value);
    const sh=Number(document.getElementById('guideSourceHeight').value);
    const tw=Number(document.getElementById('guideTargetWidth').value);
    const result=document.getElementById('guideRatioResult');
    const summary=document.getElementById('guideRatioSummary');
    if (![sw,sh,tw].every(x=>Number.isInteger(x)&&x>0&&x<=50000)) {
      result.textContent='Enter valid dimensions';summary.textContent='Use positive whole pixels up to 50,000 in this example calculator.';return;
    }
    const th=Math.max(1,Math.round(tw*sh/sw));
    const divisor=gcd(sw,sh);
    result.textContent=`${tw.toLocaleString()} × ${th.toLocaleString()}`;
    summary.textContent=`Source shape ${sw/divisor}:${sh/divisor}. Target has ${((tw*th)/(sw*sh)*100).toFixed(1)}% of the source pixel count. This is not a file-size estimate; the main tool's limits still apply.`;
    const frame=document.getElementById('guideRatioFrame');
    const scale=Math.min(200/tw,115/th);
    frame.style.width=tw*scale+'px';frame.style.height=th*scale+'px';
  }
  if (document.getElementById('guideSourceWidth')) {
    ['guideSourceWidth','guideSourceHeight','guideTargetWidth'].forEach(id=>document.getElementById(id).addEventListener('input',updateRatio));
    updateRatio();
  }

  const suggestions = {
    image: [
      ['share','Everyday sharing','JPG','Useful for photographic sharing when transparency is unnecessary. Check the receiving app’s supported formats.'],
      ['transparent','Transparent graphic','PNG','Preserve alpha and sharp graphic edges. PNG can be larger than a lossy photograph export.'],
      ['web','Web delivery','WEBP','A useful web-image format that can include alpha. Check your destination’s support.']
    ],
    video: [
      ['share','Everyday playback','MP4','This converter uses H.264 and AAC for MP4. Test the file on the actual player or upload site.'],
      ['web','Web delivery','WEBM','This converter uses VP8 and Opus for WebM. Confirm that this combination is accepted.'],
      ['loop','A silent animation loop','GIF','GIF has no sound and uses limited colors. This export also changes frame rate and pixel width.']
    ],
    audio: [
      ['share','Everyday listening','MP3','Compact lossy audio for everyday sharing. Higher quality settings choose higher bitrate tiers.'],
      ['edit','PCM for editing','WAV','This converter exports 16-bit PCM. The larger file does not recover information lost in the source.'],
      ['lossless','Lossless decoded signal','FLAC','Keeps the decoded audio signal in a lossless encoding. Converting from MP3 cannot restore discarded information.'],
      ['compact','AAC audio container','M4A','AAC audio in an MP4 audio container. Check the destination app’s requirements.']
    ]
  };
  const family=document.getElementById('guideMediaFamily');
  const goal=document.getElementById('guideFormatGoal');
  const answer=document.getElementById('guideFormatAnswer');
  const reason=document.getElementById('guideFormatReason');
  function updateSuggestion(resetGoals) {
    const options=suggestions[family.value]||suggestions.image;
    if(resetGoals) goal.replaceChildren(...options.map(([value,label])=>new Option(label,value)));
    const item=options.find(x=>x[0]===goal.value)||options[0];
    answer.textContent=item[2];reason.textContent=item[3];
  }
  if(family) {
    family.addEventListener('change',()=>updateSuggestion(true));
    goal.addEventListener('change',()=>updateSuggestion(false));
    document.getElementById('guideApplyFormat').addEventListener('click',()=>{
      const tab=document.querySelector(`.converter-mode-tab[data-mode="${family.value}"]`);
      const current=document.querySelector('.converter-mode-tab[aria-selected="true"]');
      if (!tab || tab.disabled) {reason.textContent='Finish the current conversion before changing its format.';return;}
      if(current?.dataset.mode!==family.value && document.querySelector('.converter-file')) {
        reason.textContent='Your existing queue uses another media family. Switch modes in the tool first; this helper keeps the queue intact.';
        document.getElementById('converterMessage').textContent=reason.textContent;
        return;
      }
      tab.click();
      const select=document.getElementById('converterFormat');
      const value=answer.textContent.toLowerCase();
      if ([...select.options].some(x=>x.value===value)) {
        select.value=value;select.dispatchEvent(new Event('change',{bubbles:true}));
      }
    });
    updateSuggestion(true);
  }
})();
