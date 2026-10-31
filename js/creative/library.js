import { TEMPLATES, CATEGORIES, previewURL } from './templates.js';
import { bootShell, toast } from './shell.js';
import { escapeHTML, uid } from './model.js';
import { getProjects, deleteProject, saveProject } from './storage.js';
bootShell();
if(document.body.dataset.page==='projects') {
  const grid=document.getElementById('projectGrid');
  async function renderProjects(){
    try{
      const projects=(await getProjects()).sort((a,b)=>b.updatedAt-a.updatedAt);
      grid.replaceChildren();
      if(!projects.length){grid.innerHTML='<div class="cr-empty"><h2>Your next idea starts here.</h2><p>Designs you save in the editor will appear here.</p><a class="cr-button primary" href="/templates/">Find a template ↗</a></div>';return;}
      for(const p of projects){
        const card=document.createElement('article');card.className='cr-card';
        card.innerHTML=`<a class="cr-card-art" href="/editor/?project=${encodeURIComponent(p.id)}"><img alt="" src="${escapeHTML(p.preview||'')}"><span class="cr-card-action">Continue editing ↗</span></a><h3>${escapeHTML(p.title)}</h3><p>${p.width} × ${p.height} · ${new Date(p.updatedAt).toLocaleDateString()}</p><div class="cr-project-actions"><button class="cr-button" data-copy>Duplicate</button><button class="cr-button" data-delete>Delete</button></div>`;
        card.querySelector('[data-copy]').onclick=async()=>{try{await saveProject({...p,id:uid(),title:`${p.title.slice(0,140)} copy`,updatedAt:Date.now()});await renderProjects();toast('A copy is ready to edit.');}catch(e){toast(e.message);}};
        card.querySelector('[data-delete]').onclick=()=>{
          const dialog=document.getElementById('deleteDialog');dialog.showModal();
          document.getElementById('cancelDelete').onclick=()=>dialog.close();
          document.getElementById('confirmDelete').onclick=async()=>{try{await deleteProject(p.id);dialog.close();await renderProjects();}catch(e){toast(e.message);}};
        };
        grid.append(card);
      }
    }catch(e){grid.innerHTML=`<div class="cr-empty"><h2>Your projects stay with you.</h2><p>${escapeHTML(e.message)}</p><a class="cr-button" href="/editor/?import=1">Open a saved project file</a></div>`;}
  }
  renderProjects();
}else{
  document.getElementById('heroPreview').src=previewURL(TEMPLATES[0]);
  document.getElementById('heroSecond').src=previewURL(TEMPLATES.find(t=>t.id==='clear-desk'));
  const filters=document.getElementById('categoryFilters'), grid=document.getElementById('templateGrid'), search=document.getElementById('templateSearch');
  let category=new URLSearchParams(location.search).get('category')||'all';
  if(!CATEGORIES.some(c=>c.id===category))category='all';
  function render(){
    const query=search.value.toLowerCase().trim();
    const list=TEMPLATES.filter(t=>(category==='all'||t.category===category)&&`${t.name} ${t.description} ${CATEGORIES.find(c=>c.id===t.category)?.label} ${t.bg.style}`.toLowerCase().includes(query));
    filters.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.category===category)));
    document.getElementById('resultCount').textContent=`${list.length} editable starting ${list.length===1?'point':'points'}`;
    grid.innerHTML=list.map(t=>`<article class="cr-card"><a class="cr-card-art" href="/editor/?template=${t.id}"><img loading="lazy" width="${t.width}" height="${t.height}" src="${previewURL(t)}" alt="${escapeHTML(t.name)} template preview"><span class="cr-card-action">Make this yours ↗</span></a><div class="cr-card-meta"><h3>${escapeHTML(t.name)}</h3><span class="cr-card-tag">Editable</span></div><p>${CATEGORIES.find(c=>c.id===t.category).label} · ${t.width} × ${t.height}</p></article>`).join('')||'<div class="cr-empty"><h2>A different starting point?</h2><p>Try another search or choose a different category.</p></div>';
  }
  filters.innerHTML=CATEGORIES.map(c=>`<button class="cr-filter" data-category="${c.id}" aria-pressed="false">${c.label}</button>`).join('');
  filters.onclick=e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;render();};search.oninput=render;render();
}
