export const MAX_PIXELS = 16_777_216;
export const RATIOS = [
  { id: 'wide', label: 'Landscape · 16:9', width: 1920, height: 1080 },
  { id: 'square', label: 'Square · 1:1', width: 1080, height: 1080 },
  { id: 'portrait', label: 'Portrait · 4:5', width: 1080, height: 1350 },
  { id: 'story', label: 'Story · 9:16', width: 1080, height: 1920 },
  { id: 'thumbnail', label: 'Video thumbnail · 16:9', width: 1280, height: 720 },
];
export const uid = () => crypto.randomUUID();
export const escapeHTML = (text) => String(text ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function validateSize(width, height) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 64 || height < 64 || width > 8192 || height > 8192 || width * height > MAX_PIXELS) {
    throw new Error('Choose dimensions from 64 to 8192 pixels, up to 16 megapixels in total.');
  }
  return { width, height };
}
export function fitTransform(oldWidth, oldHeight, width, height, mode = 'fit') {
  const scale = (mode === 'fill' ? Math.max : Math.min)(width / oldWidth, height / oldHeight);
  return { scale, x: (width - oldWidth * scale) / 2, y: (height - oldHeight * scale) / 2 };
}
export function safeName(title) {
  return String(title || 'PMW design').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '-').slice(0, 90) || 'PMW-design';
}
// Project imports are data only: no remote URLs, scripts, SVG markup, or arbitrary Fabric classes.
export function validateProject(project) {
  if (!project || project.format !== 'pmw-design' || project.version !== 1) throw new Error('This is not a supported PMW project file.');
  validateSize(project.width, project.height);
  if (!project.bg || !['solid','gradient','orbits','waves','grid'].includes(project.bg.style) || !/^#[a-f\d]{6}$/i.test(project.bg.color1) || !/^#[a-f\d]{6}$/i.test(project.bg.color2) || (project.bg.grain !== undefined && (!Number.isFinite(project.bg.grain) || project.bg.grain < 0 || project.bg.grain > 25))) throw new Error('The project background is invalid.');
  if (typeof project.title !== 'string' || project.title.length > 160 || !Array.isArray(project.scene?.objects) || project.scene.objects.length > 250) throw new Error('The project contains invalid design data.');
  const assets = project.assets || {};
  let bytes = 0;
  for (const [id, source] of Object.entries(assets)) {
    if (!/^[a-zA-Z0-9-]+$/.test(id) || typeof source !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(source)) throw new Error('This project contains an unsupported image.');
    bytes += source.length;
  }
  if (bytes > 80 * 1024 * 1024) throw new Error('This project is too large to open. Use a project under 60 MB.');
  const types = new Set(['Rect','Circle','Ellipse','Triangle','Path','Textbox','IText','Text','Image']);
  for (const obj of project.scene.objects) {
    if (!types.has(obj.type) || obj.clipPath || obj.objects || obj.filters?.length || obj.resizeFilter || obj.path?.length > 4000) throw new Error('This project contains unsupported layers.');
    for (const key of ['left','top','width','height','scaleX','scaleY','angle','opacity','fontSize']) {
      if (obj[key] !== undefined && (!Number.isFinite(obj[key]) || Math.abs(obj[key]) > 1_000_000)) throw new Error('A layer has invalid dimensions.');
    }
    if (obj.type === 'Image' && (!obj.assetId || !assets[obj.assetId] || obj.src !== `pmw-asset:${obj.assetId}`)) throw new Error('An image is missing from this project.');
    if (obj.fill && typeof obj.fill === 'object' && !['linear','radial'].includes(obj.fill.type)) throw new Error('Unsupported layer fill.');
    if (obj.stroke && typeof obj.stroke !== 'string') throw new Error('Unsupported layer border.');
    if (obj.text?.length > 10000) throw new Error('A text layer is too large.');
  }
  if (project.scene.backgroundImage || project.scene.overlayImage || project.scene.clipPath || typeof project.scene.background === 'object') throw new Error('Unsupported project background.');
  return project;
}
