(() => {
  const $ = (s) => document.querySelector(s);
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const readSet = () => { try { return new Set(JSON.parse(localStorage.getItem('lf_notice_read') || '[]')); } catch { return new Set(); } };
  const writeSet = (set) => localStorage.setItem('lf_notice_read', JSON.stringify([...set]));
  async function items(kind) { const r = await fetch('/api/content?kind=' + encodeURIComponent(kind), {cache:'no-store'}); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'تعذر التحميل'); return Array.isArray(d.items) ? d.items.filter(x => x.active !== false) : []; }
  function showSection(section, target, html) { const el = $(target); if (!el || !html) return; el.innerHTML = html; $(section).hidden = false; }
  async function initNotices() {
    const btn=$('#lf-notice-button'), pop=$('#lf-notice-popover'), list=$('#lf-notice-list'), badge=$('#lf-notice-count'); if(!btn||!pop||!list)return;
    let all=[]; let read=readSet();
    const render=()=>{ const unread=all.filter(x=>!read.has(String(x.id))).length; badge.hidden=!unread; badge.textContent=unread>99?'99+':String(unread); list.innerHTML=all.length?all.map(x=>`<article class="lf-notice-item ${read.has(String(x.id))?'is-read':''}"><strong>${esc(x.title||x.name||'تنبيه')}</strong><p>${esc(x.body||x.message||x.description||'')}</p><small>${x.createdAt?new Date(x.createdAt).toLocaleString('ar-SA'):''}</small><button type="button" data-read-notice="${esc(x.id)}">${read.has(String(x.id))?'مقروء':'تحديد كمقروء'}</button></article>`).join(''):'لا توجد تنبيهات حاليًا.'; list.querySelectorAll('[data-read-notice]').forEach(b=>b.onclick=()=>{read.add(String(b.dataset.readNotice));writeSet(read);render();});};
    try { all=(await items('notifications')).sort((a,b)=>String(b.createdAt||'').localeCompare(String(a.createdAt||''))); render(); } catch { list.textContent='تعذر تحميل التنبيهات.'; }
    btn.addEventListener('click',()=>{pop.hidden=!pop.hidden;btn.setAttribute('aria-expanded',String(!pop.hidden));});
    $('#lf-notice-mark-read')?.addEventListener('click',()=>{all.forEach(x=>read.add(String(x.id)));writeSet(read);render();});
    document.addEventListener('click',e=>{if(!e.target.closest('.lf-notice-wrap')){pop.hidden=true;btn.setAttribute('aria-expanded','false');}});
  }
  async function initContent(){
    try { const a=await items('news'); showSection('#lf-news-section','#lf-news-items',a.sort((x,y)=>String(y.createdAt||'').localeCompare(String(x.createdAt||''))).slice(0,4).map(x=>`<article class="lf-managed-card"><small>${x.createdAt?new Date(x.createdAt).toLocaleDateString('ar-SA'):''}</small><h3>${esc(x.title||x.name)}</h3><p>${esc(x.body||x.description||'')}</p>${x.url?`<a href="${esc(x.url)}" target="_blank" rel="noopener">التفاصيل</a>`:''}</article>`).join('')); } catch {}
    try { const a=await items('giftcards'); showSection('#lf-gifts-section','#lf-gift-items',a.map(x=>`<article class="lf-managed-card"><span class="offer-label">بطاقة هدية</span><h3>${esc(x.title||x.name)}</h3><strong>${esc(x.value||x.price||'حسب الاختيار')}</strong><p>${esc(x.body||x.description||'')}</p><a class="btn btn-primary" target="_blank" rel="noopener" href="https://wa.me/962771111377?text=${encodeURIComponent('أرغب بطلب بطاقة هدية: '+(x.title||x.name)+' ('+(x.value||x.price||'')+')')}">اطلب عبر واتساب</a></article>`).join('')); } catch {}
    try { const a=await items('memberships'); showSection('#lf-memberships-section','#lf-membership-items',a.sort((x,y)=>Number(x.minPoints||x.points||0)-Number(y.minPoints||y.points||0)).map((x,i)=>`<article class="lf-managed-card"><span class="offer-label">عضوية ${i+1}</span><h3>${esc(x.title||x.name)}</h3><strong>${Number(x.minPoints||x.points||0).toLocaleString('ar-SA')} نقطة</strong><p>${esc(x.body||x.description||'')}</p></article>`).join('')); } catch {}
    try { const a=await items('developers'); showSection('#lf-developers-section','#lf-developer-items',a.map(x=>`<article class="lf-managed-card"><h3>${esc(x.title||x.name)}</h3><p>${esc(x.body||x.bio||x.description||'')}</p>${x.skills?`<small>${esc(x.skills)}</small>`:''}${x.url?`<p><a href="${esc(x.url)}" target="_blank" rel="noopener">الأعمال والملف الشخصي</a></p>`:''}</article>`).join('')); } catch {}
  }
  document.addEventListener('DOMContentLoaded',()=>{initNotices();initContent();});
})();
