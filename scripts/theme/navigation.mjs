const glyphs={wallpapers:'<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m5 17 5-6 4 3 3-5 3 8"/>',tools:'<path d="m14 6 4 4m-8 3-6 6 1 2 2-1 6-6m1-8 3-3 4 4-3 3Z"/>',menu:'<path d="M4 7h16M4 12h16M4 17h16"/>',close:'<path d="m6 6 12 12M18 6 6 18"/>'};
const svg=name=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${glyphs[name]}</svg>`;
export function removeAccessFilter(html) {
  html=html.replace(/<div class="filter-field">\s*<label for="accessFilterSelect">[\s\S]*?<\/select>\s*<\/div>/,'');
  for(const line of [/^[ \t]*let activeAccess = 'All';\r?\n/m,/^[ \t]*const accessFilterSelect =[^\n]*\n/m,/^[ \t]*accessFilterSelect\.value = activeAccess;\r?\n/m,/^[ \t]*const accessMatch =[^\n]*\n/m])html=html.replace(line,'');
  html=html.replace(' && accessMatch','').replace(/\s*accessFilterSelect\.addEventListener\('change', event => \{[\s\S]*?\n        \}\);/,'');
  return html.replace("activeAccess === 'Premium' || isPremiumMember",'isPremiumMember');
}
export function navigationMarkup(html,file) {
  if(!file.endsWith('.html')||file==='pmw-studio.html'||file.startsWith('admin')||file.startsWith('backend/'))return html;
  html=html.replace(/<img\b([^>]*?)src="[^"]*pmw-wordmark\.png"([^>]*?)>/g,(_,before,after)=>`<img class="pmw-uploaded-logo" src="/assets/brand/pmw-visuals-logo.png" alt="PMW Visuals logo" width="64" height="64"${(before+after).replace(/\s*(?:class|alt|width|height)="[^"]*"/g,'')}>`);
  html=html.replace(/(<span(?: class="(?:pmw-brand-text|pmw-platform-footer__brand-name)")?>)Visuals(<\/span>)/g,'$1PMW Visuals$2');
  if(file==='index.html') {
    html=removeAccessFilter(html);
    html=html.replace(/\s*<button class="mobile-site-menu-toggle"[\s\S]*?<\/button>\s*<div class="mobile-site-menu"[^>]*>[\s\S]*?<\/div>/,'');
    html=html.replace(/        const mobileSiteMenuToggle = [\s\S]*?(?=        function setActiveCategoryFromAvailable)/,'');
  }
  const header=html.match(/<nav class="(?:pmw-site-nav )?(?:navbar|tools-nav|ed-nav|pmw-auth-nav|converter-nav)\b[\s\S]*?<\/nav>/);
  if(!header&&!html.includes('class="pmw-uploaded-logo"'))return html.replace(/<link rel="stylesheet" href="\/css\/site-navigation\.css[^\"]*">\r?\n?/g,'');
  const stylesheet='<link rel="stylesheet" href="/css/site-navigation.css?v=20261006-menu">';
  if(!html.includes('/css/site-navigation.css'))html=html.replace('</head>',stylesheet+'\n</head>');
  if(!header)return html;
  let nav=header[0].replace(/<div class="(?:nav-links|tools-nav-links|ed-nav-links|converter-nav-links)"[^>]*>[\s\S]*?<\/div>/,'');
  if(!nav.includes('pmw-site-nav'))nav=nav.replace(/(<nav class=")/,'$1pmw-site-nav ');
  const button=`<button class="pmw-site-menu-trigger" type="button" aria-label="Open navigation menu" aria-haspopup="dialog" aria-expanded="false" aria-controls="pmwSiteMenu">${svg('menu')}<span>Menu</span></button>`;
  if(!nav.includes('pmw-site-menu-trigger'))nav=nav.includes('<div class="nav-inner">')?nav.replace('<div class="nav-inner">','<div class="nav-inner">'+button):nav.replace(/(<nav[^>]*>)/,'$1'+button);
  html=html.replace(header[0],nav);
  const wallpaper=file==='index.html'||file.startsWith('wallpapers/');
  const tools=file.startsWith('tools/');
  const secondary=[['Wallpaper collections','/wallpapers/'],['Media Converter','/tools/image-converter/'],['Image Resizer','/tools/image-resizer/'],['Image Compressor','/tools/image-compressor/'],['Premium plans','/premium.html'],['Your account','/account.html'],['Sign in / create an account','/login.html']];
  const legal=[['Wallpaper license','/license.html'],['Privacy policy','/privacy-policy.html'],['Terms of use','/terms.html'],['Cookie policy','/cookie-policy.html'],['Refund policy','/returnmoney-policy.html']];
  const links=items=>items.map(([label,url])=>`<a href="${url}">${label}<span aria-hidden="true">↗</span></a>`).join('');
  const drawer=`<!-- pmw-site-menu:start --><dialog class="pmw-site-drawer" id="pmwSiteMenu" aria-labelledby="pmwSiteMenuTitle"><div class="pmw-site-drawer-head"><a href="/" class="pmw-site-drawer-brand"><img class="pmw-uploaded-logo" src="/assets/brand/pmw-visuals-logo.png" width="64" height="64" alt="PMW Visuals logo"><span>PMW Visuals</span></a><button class="pmw-site-menu-close" type="button" aria-label="Close navigation menu">${svg('close')}</button></div><div class="pmw-site-drawer-content"><span class="pmw-menu-eyebrow">Your creative corner</span><h2 id="pmwSiteMenuTitle">Explore PMW.</h2><nav aria-label="Main destinations" class="pmw-site-menu-main"><a class="pmw-site-menu-featured${wallpaper?' is-current':''}" href="/"${wallpaper?' aria-current="location"':''}>${svg('wallpapers')}<span><strong>PMW Wallpapers</strong><small>Find your next screen.</small></span><b aria-hidden="true">→</b></a><a class="pmw-site-menu-featured${tools?' is-current':''}" href="/tools/"${tools?' aria-current="location"':''}>${svg('tools')}<span><strong>PMW Tools</strong><small>Convert. Resize. Compress.</small></span><b aria-hidden="true">→</b></a></nav><h3>Browse & create</h3><nav aria-label="More pages" class="pmw-site-menu-links">${links(secondary)}</nav><h3>Good to know</h3><nav aria-label="Policies and license" class="pmw-site-menu-links pmw-site-menu-legal">${links(legal)}</nav></div><p class="pmw-site-drawer-note">Wallpapers and useful tools. One place to explore.</p></dialog><!-- pmw-site-menu:end -->`;
  html=html.includes('<!-- pmw-site-menu:start -->')?html.replace(/<!-- pmw-site-menu:start -->[\s\S]*?<!-- pmw-site-menu:end -->/,drawer):html.replace('</body>',drawer+'\n</body>');
  if(!html.includes('/js/site-navigation.js'))html=html.replace('</body>','<script src="/js/site-navigation.js?v=20261006-menu" defer></script>\n</body>');
  return html.replace(/[ \t]+(?=\r?\n)/g,'');
}
