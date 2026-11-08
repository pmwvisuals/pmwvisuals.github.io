import {navigationMarkup} from './navigation.mjs';
export const hasAppearance = file => file==='index.html'||file==='account.html'||file==='premium-wallpapers.html'||file.startsWith('wallpapers/')||file.startsWith('tools/');
export function appearanceMarkup(html,file) {
  if(!file.endsWith('.html'))return html;
  html=navigationMarkup(html,file);
  if(!hasAppearance(file))return html;
  if(file==='premium-wallpapers.html'&&!html.includes('pmw-wallpaper-library-page'))html=html.replace('class="pmw-auth-page"','class="pmw-auth-page pmw-wallpaper-library-page"');
  html=html.replace(/<html\b([^>]*)>/,(_,attrs)=>`<html${attrs.replace(/ data-theme="[^"]*"/,'')} data-theme="light">`);
  html=html.replace(/(src="[^"]*pmw-theme\.js)(?:\?[^"]*)?"/g,'$1?v=20261006-light-v1"');
  html=html.replace(/(<meta name="theme-color" content=")[^"]*(")/,'$1#f6f6f1$2');
  if(!html.includes('/css/site-appearance.css'))html=html.replace('</head>','<link rel="stylesheet" href="/css/site-appearance.css?v=20261006-light-v1">\n</head>');
  if(!html.includes('/js/theme-chooser.js'))html=html.replace('</body>','<script src="/js/theme-chooser.js?v=20261006-light-v1" defer></script>\n</body>');
  return html;
}
