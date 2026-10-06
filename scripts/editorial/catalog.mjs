import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

export const siteRoot = path.resolve(import.meta.dirname, '../..');
export const origin = 'https://pmwvisuals.com';
export const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
export const escapeHtml = (s = '') => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

export function loadCatalog() {
  const context = { window: {} };
  for (const file of ['wallpapers-data.js', 'desktop-wallpapers-data.js', 'wallpaper-pages.js']) {
    vm.runInNewContext(fs.readFileSync(path.join(siteRoot, file), 'utf8'), context);
  }
  const records = [...context.window.PMW_WALLPAPERS, ...context.window.PMW_DESKTOP_WALLPAPERS];
  const pageMap = context.window.PMW_WALLPAPER_PAGES;
  const byId = new Map(records.map((item) => [item.id, item]));
  const pages = Object.entries(pageMap).map(([id, file]) => {
    const item = byId.get(id);
    if (!item) throw new Error(`No catalog record: ${id}`);
    const html = fs.readFileSync(path.join(siteRoot, file), 'utf8');
    const canonical = decode(html.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1]);
    const preview = decode(html.match(/<div class="preview-card">\s*<img[^>]*src="([^"]+)"/)?.[1]);
    const download = decode(html.match(/data-download-url="([^"]+)"/)?.[1] || html.match(/<a[^>]*id="downloadButton"[^>]*href="([^"]+)"/)?.[1]);
    const local = preview.startsWith('/') && fs.existsSync(path.join(siteRoot, preview));
    if (!canonical || !preview || !download) throw new Error(`Missing preserved fields: ${file}`);
    return { ...item, file, canonical, preview, download, local, html };
  });
  return { pages, records, pageMap };
}

export function categoryKey(item) {
  return item.file.split('/')[1] === 'desktop' ? item.file.split('/')[2] : item.file.split('/')[1];
}

if (process.argv.includes('--audit')) {
  const { pages, records } = loadCatalog();
  const styles = new Map();
  for (const p of pages) {
    const style = p.html.match(/<style>([\s\S]*?)<\/style>/)?.[1] || '';
    styles.set(style, (styles.get(style) || 0) + 1);
  }
  console.log(JSON.stringify({ records: records.length, mapped: pages.length, localPreviews: pages.filter(p => p.local).length, styleVariants: [...styles.values()], categories: [...new Set(pages.map(categoryKey))] }, null, 2));
  if (process.argv.includes('--manifest')) {
    const target = path.resolve(siteRoot, '../../audit/editorial-20261006/url-baseline.json');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, json(pages.map(({ file, canonical, download, id }) => ({ file, canonical, download, id }))));
    console.log(`Preservation manifest: ${target}`);
  }
}
