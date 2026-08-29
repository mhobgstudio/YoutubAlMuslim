/* YoutubAlMuslim — YouTube-Exact Logic */
(function(){
'use strict';
let db=null,allV=[],filtV=[],dispCnt=0;const PS=20;
let actTid=null,actSid=null,actLang=null,curV=null;
let actBts=new Set(); // multi-select base topics (AND filter)
let actSids=new Set(); // multi-select subtopics (AND filter across all topics)
let actDiffs=new Set(); // multi-select difficulties (1-4) (AND filter)
let actSpeakers=new Set(); // multi-select speakers (AND filter)
let actQf={continue:false,bookmarks:false,new:false,kids:false}; // quick filter toggles
let sidebarFilter=''; // text filter for sidebar items
let bms=JSON.parse(localStorage.getItem('ym_bms')||'[]');
let progMap=JSON.parse(localStorage.getItem('ym_prog')||'{}'); // {vid: {pct:0-100, ts:number}}
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E={
  si:$('#searchInput'),sb:$('#searchBtn'),st:$('#sidebarToggle'),
  sbx:$('#sidebar'),sbt:$('#sidebarTopics'),
  sbb:$('#sidebarBaseTopics'),
  sbd:$('#sidebarDifficulty'),
  sbp:$('#sidebarSpeakers'),
  sbf:$('#sidebarFilter'),
  cb:$('#chipsBar'),sc:$('#subtopicChips'),
  vg:$('#videoGrid'),nr:$('#noResults'),
  hv:$('#homeView'),bv:$('#bookmarksView'),bg:$('#bookmarksGrid'),nb:$('#noBookmarks'),bc:$('#bookmarkCount'),
  vm:$('#videoModal'),mp:$('#modalPlayer'),mt:$('#modalTitle'),ma:$('#modalAvatar'),
  ms:$('#modalSpeaker'),mm:$('#modalMeta'),md:$('#modalDifficulty'),
  ml:$('#modalLanguage'),mur:$('#modalDuration'),
  mtg:$('#modalTags'),mb:$('#modalBookmark'),mr:$('#modalRelated'),
  tt:$('#themeToggle'),tid:$('#themeIconDark'),til:$('#themeIconLight'),
  rb:$('#randomBtn'),bkb:$('#bookmarksBtn'),
  lc:$('#langChips')
};
const D={1:{l:'Beginner',c:'#4CAF50'},2:{l:'Intermediate',c:'#2196F3'},3:{l:'Advanced',c:'#FF9800'},4:{l:'Scholar',c:'#9C27B0'}};
const LANG={en:'English',ar:'العربية',ur:'اردو',tr:'Türkçe',ms:'Melayu',fr:'Français',id:'Indonesia',bn:'বাংলা',ha:'Hausa',sw:'Kiswahili',zh:'中文'};
const L=LANG;

async function init(){
  loadTheme();
  try{
    const r=await fetch('data/topics.json');db=await r.json();
    buildIdx();renderChips();renderSide();renderGrid(true);bindEv();
  }catch(e){
    console.error(e);
    E.vg.innerHTML='<p style="text-align:center;padding:60px;color:#aaa">Failed to load. Refresh.</p>';
  }
}

function buildIdx(){
  allV=[];
  db.topics.forEach(t=>t.subtopics.forEach(s=>s.videos.forEach(v=>{
    allV.push({...v,topicId:t.id,topicName:t.name,topicNameAr:t.nameAr,topicIcon:t.icon,topicColor:t.color,subtopicId:s.id,subtopicName:s.name,subtopicNameAr:s.nameAr,baseTopics:t.baseTopics||[]});
  })));
  filtV=[...allV];
}

function renderChips(){
  const c=db.topics.map(t=>{
    const n=t.subtopics.reduce((a,s)=>a+s.videos.length,0);
    return `<button class="yt-chip" data-topic-id="${t.id}">${t.icon} ${t.name}</button>`;
  }).join('');
  E.cb.innerHTML=`<button class="yt-chip yt-chip--active" data-topic-id="all">All</button>${c}`;
  $$('.yt-chip').forEach(ch=>ch.addEventListener('click',()=>{
    const tid=ch.dataset.topicId;
    if(tid==='all'||actTid===tid)deselect();else select(tid);
  }));
  // Language chips
  const langs=[...new Set(allV.map(v=>v.language))].sort();
  const langFlags={en:'🇺🇸',ar:'🇸🇦',ur:'🇵🇰',tr:'🇹🇷',ms:'🇲🇾',fr:'🇫🇷',id:'🇮🇩',bn:'🇧🇩',ha:'🇳🇬',sw:'🇰🇪',zh:'🇨🇳'};
  const lc=langs.map(l=>`<button class="yt-chip yt-chip--lang" data-lang="${l}">${langFlags[l]||''} ${LANG[l]||l}</button>`).join('');
  E.lc.innerHTML=`<button class="yt-chip yt-chip--lang yt-chip--active" data-lang="all">All Languages</button>${lc}`;
  $$('.yt-chip-bar--lang .yt-chip').forEach(ch=>ch.addEventListener('click',()=>{
    const l=ch.dataset.lang;
    if(l==='all'||actLang===l){actLang=null;$$('.yt-chip-bar--lang .yt-chip').forEach(c=>c.classList.toggle('active',c.dataset.lang==='all'));}else{actLang=l;$$('.yt-chip-bar--lang .yt-chip').forEach(c=>c.classList.toggle('active',c.dataset.lang===l));}
    applyF();
  }));
}

function renderSide(){
  // ===== Base Topics =====
  const bts=db.baseTopics||{};
  if(E.sbb){
    E.sbb.innerHTML=Object.entries(bts).map(([id,bt])=>{
      const n=db.topics.filter(t=>(t.baseTopics||[]).includes(id))
        .reduce((a,t)=>a+t.subtopics.reduce((b,s)=>b+s.videos.length,0),0);
      return `<div class="yt-guide-topic yt-guide-base ${actBts.has(id)?'active':''}" data-base-id="${id}" role="checkbox" aria-checked="${actBts.has(id)}" tabindex="0">
        <span class="g-emoji">${bt.icon}</span>
        <span>${bt.name}</span>
        <span class="g-count">${n}</span>
      </div>`;
    }).join('');
    $$('.yt-guide-base').forEach(el=>el.addEventListener('click',()=>toggleBase(el.dataset.baseId)));
    $$('.yt-guide-base').forEach(el=>el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleBase(el.dataset.baseId);}
    }));
  }

  // ===== Difficulty =====
  if(E.sbd){
    const diffs=[1,2,3,4];
    E.sbd.innerHTML=diffs.map(d=>{
      const on=actDiffs.has(d);
      const info=D[d]||D[1];
      const n=allV.filter(v=>(v.difficulty||1)===d).length;
      return `<div class="yt-guide-topic yt-guide-diff ${on?'active':''}" data-diff="${d}" role="checkbox" aria-checked="${on}" tabindex="0" title="Difficulty: ${info.l}">
        <span class="g-dot" style="background:${info.c}"></span>
        <span>${info.l}</span>
        <span class="g-count">${n}</span>
      </div>`;
    }).join('');
    $$('.yt-guide-diff').forEach(el=>el.addEventListener('click',()=>toggleDiff(+el.dataset.diff,el)));
    $$('.yt-guide-diff').forEach(el=>el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleDiff(+el.dataset.diff,el);}
    }));
  }

  // ===== Subtopics (collapsible topic groups) =====
  const filter=sidebarFilter.toLowerCase();
  E.sbt.innerHTML=db.topics.map(t=>{
    const subs=t.subtopics.filter(s=>!filter||s.name.toLowerCase().includes(filter)||(s.nameAr||'').toLowerCase().includes(filter));
    if(filter&&subs.length===0)return '';
    const total=t.subtopics.reduce((a,s)=>a+s.videos.length,0);
    const selectedInTopic=subs.filter(s=>actSids.has(s.id)).length;
    return `<div class="yt-guide-group" data-topic-id="${t.id}">
      <div class="yt-guide-group-head" data-topic-id="${t.id}" role="button" tabindex="0" aria-expanded="false">
        <span class="g-caret">▸</span>
        <span class="g-emoji">${t.icon}</span>
        <span class="g-label">${esc(t.name.replace(/^[IVX]+\.\s*/,''))}</span>
        ${selectedInTopic?`<span class="g-badge">${selectedInTopic}</span>`:''}
        <span class="g-count">${total}</span>
      </div>
      <div class="yt-guide-group-body" data-topic-id="${t.id}" hidden>
        ${subs.map(s=>{
          const on=actSids.has(s.id);
          return `<div class="yt-guide-sub ${on?'active':''}" data-sub-id="${s.id}" data-topic-id="${t.id}" role="checkbox" tabindex="0" aria-checked="${on}" title="${esc(s.name)} — ${s.videos.length} videos">
            <span class="g-check">${on?'☑':'☐'}</span>
            <span class="g-sub-label">${esc(s.name.replace(/^THE\s+/i,'').replace(/^AL-/,'').replace(/\s*\(.*\)\s*/g,''))}</span>
            <span class="g-count">${s.videos.length}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  $$('.yt-guide-group-head').forEach(h=>h.addEventListener('click',()=>toggleGroup(h.dataset.topicId)));
  $$('.yt-guide-group-head').forEach(h=>h.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleGroup(h.dataset.topicId);}
  }));
  $$('.yt-guide-sub').forEach(el=>el.addEventListener('click',()=>toggleSub(el.dataset.subId,el)));
  $$('.yt-guide-sub').forEach(el=>el.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleSub(el.dataset.subId,el);}
  }));

  // Expand/Collapse all
  const exp=document.getElementById('expandAllSubs');
  const col=document.getElementById('collapseAllSubs');
  if(exp)exp.onclick=()=>{$$('.yt-guide-group-body').forEach(b=>{b.hidden=false;const h=$$('.yt-guide-group-head').find(x=>x.dataset.topicId===b.dataset.topicId);if(h){h.setAttribute('aria-expanded','true');h.querySelector('.g-caret').textContent='▾';}});};
  if(col)col.onclick=()=>{$$('.yt-guide-group-body').forEach(b=>{b.hidden=true;const h=$$('.yt-guide-group-head').find(x=>x.dataset.topicId===b.dataset.topicId);if(h){h.setAttribute('aria-expanded','false');h.querySelector('.g-caret').textContent='▸';}});};

  // ===== Speakers (top 40 by video count) =====
  if(E.sbp){
    const spCount={};
    allV.forEach(v=>{const sp=v.speaker||'Unknown';spCount[sp]=(spCount[sp]||0)+1;});
    const sorted=Object.entries(spCount).sort((a,b)=>b[1]-a[1]).slice(0,60);
    const filtered=sorted.filter(([sp])=>!filter||sp.toLowerCase().includes(filter));
    E.sbp.innerHTML=filtered.map(([sp,n])=>{
      const on=actSpeakers.has(sp);
      return `<div class="yt-guide-topic yt-guide-speaker ${on?'active':''}" data-speaker="${esc(sp)}" role="checkbox" aria-checked="${on}" tabindex="0" title="${esc(sp)} — ${n} videos">
        <span class="g-check">${on?'☑':'☐'}</span>
        <span class="g-speaker-name">${esc(sp)}</span>
        <span class="g-count">${n}</span>
      </div>`;
    }).join('');
    $$('.yt-guide-speaker').forEach(el=>el.addEventListener('click',()=>toggleSpeaker(el.dataset.speaker,el)));
    $$('.yt-guide-speaker').forEach(el=>el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleSpeaker(el.dataset.speaker,el);}
    }));
  }

  // ===== Quick filter counts =====
  const cwc=document.getElementById('qfContinueCount');
  const bmc=document.getElementById('qfBookmarksCount');
  const newc=document.getElementById('qfNewCount');
  const kidsc=document.getElementById('qfKidsCount');
  if(cwc)cwc.textContent=allV.filter(v=>(progMap[v.id]?.pct||0)>0).length;
  if(bmc)bmc.textContent=bms.length;
  if(newc)newc.textContent=allV.filter(v=>(v.tags||[]).includes('doc-import')).length;
  if(kidsc)kidsc.textContent=allV.filter(v=>v.topicId==='islamic-children').length;

  // Quick filter button states
  const qfc=document.getElementById('qfContinue');
  const qfb=document.getElementById('qfBookmarks');
  const qfn=document.getElementById('qfNew');
  const qfk=document.getElementById('qfKids');
  if(qfc)qfc.dataset.active=actQf.continue;
  if(qfb)qfb.dataset.active=actQf.bookmarks;
  if(qfn)qfn.dataset.active=actQf.new;
  if(qfk)qfk.dataset.active=actQf.kids;

  // Clear-all button
  const clearAll=document.getElementById('clearAllFilters');
  if(clearAll)clearAll.onclick=()=>clearAllFilters();

  // Auto-expand groups with selected subtopics
  actSids.forEach(sid=>{
    const t=db.topics.find(tt=>tt.subtopics.some(s=>s.id===sid));
    if(t){
      const body=document.querySelector(`.yt-guide-group-body[data-topic-id="${t.id}"]`);
      if(body&&body.hidden)toggleGroup(t.id);
    }
  });
}

function toggleGroup(tid){
  const body=document.querySelector(`.yt-guide-group-body[data-topic-id="${tid}"]`);
  const head=document.querySelector(`.yt-guide-group-head[data-topic-id="${tid}"]`);
  if(!body||!head)return;
  const open=!body.hidden;
  body.hidden=open;
  head.setAttribute('aria-expanded',open?'false':'true');
  head.querySelector('.g-caret').textContent=open?'▸':'▾';
}

function toggleDiff(d,el){
  if(actDiffs.has(d))actDiffs.delete(d);else actDiffs.add(d);
  if(el){
    const on=actDiffs.has(d);
    el.classList.toggle('active',on);
    el.setAttribute('aria-checked',on);
  }else renderSide();
  applyF();
}

function toggleSpeaker(sp,el){
  if(actSpeakers.has(sp))actSpeakers.delete(sp);else actSpeakers.add(sp);
  if(el){
    const on=actSpeakers.has(sp);
    el.classList.toggle('active',on);
    el.setAttribute('aria-checked',on);
    const c=el.querySelector('.g-check');
    if(c)c.textContent=on?'☑':'☐';
  }else renderSide();
  applyF();
}

function clearAllFilters(){
  actBts.clear();
  actSids.clear();
  actDiffs.clear();
  actSpeakers.clear();
  actQf={continue:false,bookmarks:false,new:false};
  sidebarFilter='';
  if(E.sbf)E.sbf.value='';
  renderSide();
  applyF();
}

function toggleSub(sid,el){
  if(actSids.has(sid))actSids.delete(sid);else actSids.add(sid);
  // Update this element's visual state
  if(el){
    const on=actSids.has(sid);
    el.classList.toggle('active',on);
    el.setAttribute('aria-checked',on?'true':'false');
    const check=el.querySelector('.g-check');
    if(check)check.textContent=on?'☑':'☐';
  }else{
    // Re-render to update all checkboxes
    renderSide();
  }
  // Show/hide clear button
  const actions=document.getElementById('sidebarSubActions');
  if(actions)actions.style.display=actSids.size>0?'block':'none';
  applyF();
}

function toggleBase(btid){
  if(actBts.has(btid))actBts.delete(btid);else actBts.add(btid);
  updateBaseUI();
  applyF();
}

function updateBaseUI(){
  if(!E.sbb)return;
  $$('.yt-guide-base').forEach(el=>{
    const on=actBts.has(el.dataset.baseId);
    el.classList.toggle('active',on);
    el.setAttribute('aria-checked',on?'true':'false');
  });
  const actions=document.getElementById('sidebarBaseActions');
  if(actions)actions.style.display=actBts.size>0?'block':'none';
}

function select(tid){
  actTid=tid;actSid=null;
  const t=db.topics.find(x=>x.id===tid);if(!t)return;
  $$('.yt-chip').forEach(c=>c.classList.toggle('active',c.dataset.topicId===tid));
  $$('.yt-guide-topic').forEach(c=>c.classList.toggle('active',c.dataset.topicId===tid));
  E.sc.style.display='flex';
  E.sc.innerHTML=`<button class="yt-chip yt-chip--active" data-sub-id="all">All ${t.name}</button>`+t.subtopics.map(s=>`<button class="yt-chip" data-sub-id="${s.id}">${s.name}</button>`).join('');
  $$('.yt-chip-bar--sub .yt-chip').forEach(ch=>ch.addEventListener('click',()=>{
    actSid=ch.dataset.subId==='all'?null:ch.dataset.subId;
    $$('.yt-chip-bar--sub .yt-chip').forEach(c=>c.classList.toggle('active',c.dataset.subId===ch.dataset.subId));
    applyF();
  }));
  applyF();
}

function deselect(){
  actTid=null;actSid=null;
  $$('.yt-chip').forEach(c=>c.classList.toggle('active',c.dataset.topicId==='all'));
  $$('.yt-guide-topic').forEach(c=>c.classList.remove('active'));
  E.sc.style.display='none';applyF();
}

function applyF(){
  const q=E.si.value.toLowerCase().trim();
  // Multi-term AND: split on whitespace, each term must appear in haystack
  const terms=q?q.split(/\s+/).filter(Boolean):[];
  const btsArr=Array.from(actBts);
  const sidsArr=Array.from(actSids);
  const diffsArr=Array.from(actDiffs);
  const spArr=Array.from(actSpeakers);
  filtV=allV.filter(v=>{
    if(actTid&&v.topicId!==actTid)return false;
    if(actLang&&v.language!==actLang)return false;
    if(btsArr.length){for(const bt of btsArr){if(!v.baseTopics.includes(bt))return false;}}
    if(sidsArr.length){if(!sidsArr.includes(v.subtopicId))return false;}
    if(diffsArr.length){if(!diffsArr.includes(v.difficulty||1))return false;}
    if(spArr.length){if(!spArr.includes(v.speaker||''))return false;}
    if(actQf.continue&&!(progMap[v.id]?.pct>0))return false;
    if(actQf.bookmarks&&!bms.some(b=>b.id===v.id&&b.topicId===v.topicId))return false;
    if(actQf.new&&!(v.tags||[]).includes('doc-import'))return false;
    if(actQf.kids&&v.topicId!=='islamic-children')return false;
    if(terms.length){
      const s=[v.title,v.titleAr||'',v.speaker,v.topicName,v.topicNameAr||'',v.subtopicName,v.subtopicNameAr||'',...(v.tags||[])].join(' ').toLowerCase();
      for(const t of terms){if(!s.includes(t))return false;}
    }
    return true;
  });
  // Update live result count for screen readers + sidebar
  const live=document.getElementById('yt-search-live');
  if(live)live.textContent=filtV.length+' videos';
  const rcount=document.getElementById('sidebarResultCount');
  if(rcount)rcount.textContent=filtV.length+(filtV.length===1?' video':' videos');
  renderGrid(true);
}

let loadObserver=null;
function renderGrid(reset){
  if(reset){dispCnt=0;E.vg.innerHTML='';}
  const sl=filtV.slice(dispCnt,dispCnt+PS);
  const f=document.createDocumentFragment();
  sl.forEach(v=>f.appendChild(mkCard(v)));
  E.vg.appendChild(f);
  dispCnt+=sl.length;
  E.nr.style.display=filtV.length===0?'block':'none';
  setupInfiniteScroll();
}
function setupInfiniteScroll(){
  if(loadObserver)loadObserver.disconnect();
  if(dispCnt>=filtV.length)return;
  let sentinel=document.getElementById('yt-scroll-sentinel');
  if(!sentinel){sentinel=document.createElement('div');sentinel.id='yt-scroll-sentinel';sentinel.style.height='1px';E.vg.parentNode.insertBefore(sentinel,E.vg.nextSibling);}
  loadObserver=new IntersectionObserver(entries=>{
    if(entries[0].isIntersecting&&dispCnt<filtV.length){renderGrid(false);}
  },{rootMargin:'600px'});
  loadObserver.observe(sentinel);
}

function mkCard(v){
  const d=D[v.difficulty]||D[1];
  const dur=fmtD(v.duration);
  const isBm=bms.some(b=>b.id===v.id&&b.topicId===v.topicId);
  const thumb=`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
  const ini=(v.speaker||'?')[0].toUpperCase();
  const prog=progMap[v.id]?.pct||0;
  const isNew=(v.tags||[]).includes('doc-import');
  const el=document.createElement('div');el.className='yt-card';el.setAttribute('role','listitem');el.setAttribute('tabindex','0');el.setAttribute('aria-label',`${v.title} by ${v.speaker}`);
  el.style.setProperty('--progress',prog+'%');
  el.innerHTML=`
    <div class="yt-card-thumb ${(v.isPlaylistRef||v.isChannelRef)?'yt-card-thumb--noimg':''}">
      ${(v.isPlaylistRef||v.isChannelRef)
        ? `<div class="yt-card-ext-icon">${v.isPlaylistRef?'▶ PLAYLIST':'📡 CHANNEL'}</div>`
        : `<img src="${thumb}" alt="" loading="lazy" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg';this.onerror=function(){this.style.display='none';this.parentNode.classList.add('yt-card-thumb--noimg');};">`}
      <div class="yt-card-overlay"></div>
      <span class="yt-card-duration">${v.isPlaylistRef?'PLAYLIST':v.isChannelRef?'CHANNEL':dur}</span>
      <span class="yt-card-difficulty" style="background:${d.c}">${d.l}</span>
      ${isNew?'<span class="yt-card-new">NEW</span>':''}
      <div class="yt-card-progress"></div>
      ${v.channelHandle?`<a class="yt-card-subscribe" href="https://www.youtube.com/${v.channelHandle}?sub_confirmation=1" target="_blank" rel="noopener noreferrer" data-id="${v.id}" data-channel="${v.channelHandle}" title="Subscribe to ${esc(v.speaker)} on YouTube" aria-label="Subscribe">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 17l5-5-5-5v10z"/><path d="M0 24V0h24v24H0z" fill="none"/><path d="M3 9h12v6H3z"/></svg>
      </a>`:''}
      <button class="yt-card-bookmark ${isBm?'bookmarked':''}" data-id="${v.id}" data-topic="${v.topicId}" aria-label="Save">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
      </button>
    </div>
    <div class="yt-card-info">
      <div class="yt-card-avatar" style="background:${v.topicColor||'#3ea6ff'}">${ini}</div>
      <div class="yt-card-text">
        <div class="yt-card-title">${esc(v.title)}</div>
        <div class="yt-card-channel">${esc(v.speaker)}</div>
        <div class="yt-card-meta">${LANG[v.language]||v.language}</div>
      </div>
    </div>`;
  el.querySelector('.yt-card-thumb').addEventListener('click',e=>{if(e.target.closest('.yt-card-bookmark')||e.target.closest('.yt-card-subscribe'))return;openWatch(v);});

  // Playlist/channel reference entries: open the source URL in a new tab
  if(v.isPlaylistRef||v.isChannelRef){
    const url=v.playlistUrl||v.channelUrl;
    if(url){
      el.querySelector('.yt-card-thumb').addEventListener('click',e=>{window.open(url,'_blank','noopener,noreferrer');});
      // Override duration/difficulty to show 'PLAYLIST' or 'CHANNEL' badge
      el.querySelector('.yt-card-duration').textContent=v.isPlaylistRef?'PLAYLIST':'CHANNEL';
    }
  }
  el.querySelector('.yt-card-bookmark').addEventListener('click',e=>{e.stopPropagation();e.preventDefault();toggleBm(v);e.currentTarget.classList.toggle('bookmarked');});
  // Subscribe link — stop the thumb's click from firing, but let the link open normally
  const subEl=el.querySelector('.yt-card-subscribe');
  if(subEl)subEl.addEventListener('click',e=>{e.stopPropagation();});
  // Keyboard: Enter / Space on focused card opens watch
  el.addEventListener('keydown',e=>{
    if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.yt-card-bookmark')){
      e.preventDefault();openWatch(v);
    }
  });
  return el;
}

function openWatch(v){
  // Playlist/channel reference entries: open the source URL in a new tab and don't show modal
  if(v.isPlaylistRef||v.isChannelRef){
    const url=v.playlistUrl||v.channelUrl;
    if(url)window.open(url,'_blank','noopener,noreferrer');
    return;
  }
  curV=v;
  autoCloseSidebarOnMobile();
  ensureAutoplaySupport();
  E.mt.textContent=v.title;
  E.ms.textContent=v.speaker;
  const d=D[v.difficulty]||D[1];
  const ini=(v.speaker||'?')[0].toUpperCase();
  E.ma.textContent=ini;E.ma.style.background=v.topicColor||'#3ea6ff';
  const tags=(v.tags||[]).map(t=>`<span class="yt-watch-tag">${esc(t)}</span>`).join('');
  E.mm.innerHTML=`<span style="color:var(--yt-text)">${d.l}</span> • ${LANG[v.language]||v.language} • ${fmtD(v.duration)}${tags?'  •  '+tags:''}`;
  E.mtg.innerHTML=tags;
  // Build player URL — if video belongs to a known playlist, load the
  // entire playlist (YouTube IFrame API will autoplay through it).
  const playCtx=resolvePlaylist(v);
  // Ad-blocking params: nocookie domain, controls, disable ads
  const adBlockParams='&iv_load_policy=3&modestbranding=1&playsinline=1&fs=0&cc_load_policy=0&disablekb=0&autoplay=1';
  const playerSrc=playCtx
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playCtx.playlistId}&autoplay=1&rel=0&enablejsapi=1&v=${v.id}${adBlockParams}`
    : `https://www.youtube-nocookie.com/embed/${v.id}?autoplay=1&rel=0&enablejsapi=1${adBlockParams}`;
  E.mp.innerHTML=`<iframe id="ytPlayerIframe" src="${playerSrc}" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen playsinline loading="eager"></iframe>`;
  // Inject CSS into iframe to hide ad overlays (best effort — same-origin only)
  setTimeout(()=>injectAdBlockCSS(),500);
  // Wire progress tracking + caption (transcript) detection via YouTube IFrame API
  setupYTProgress(v);
  setupTranscript(v);
  const isBm=bms.some(b=>b.id===v.id&&b.topicId===v.topicId);
  E.mb.classList.toggle('bookmarked',isBm);
  E.mb.querySelector('span').textContent=isBm?'Saved':'Save';
  // Subscribe button
  const subBtn=document.getElementById('modalSubscribe');
  if(subBtn){
    if(v.channelHandle){
      subBtn.href=`https://www.youtube.com/${v.channelHandle}?sub_confirmation=1`;
      subBtn.style.display='';
      subBtn.title=`Subscribe to ${v.speaker} on YouTube`;
    }else{
      subBtn.style.display='none';
    }
  }
  // Open on YouTube (escape hatch for ad-blocker users)
  const openYT=document.getElementById('modalOpenYT');
  if(openYT){
    openYT.href=`https://www.youtube.com/watch?v=${v.id}`;
  }
  // Download panel — third-party downloader URLs
  populateDownload(v);
  wireDownloadMenu(v);
  // Wire close buttons (one per panel)
  document.querySelectorAll('.yt-watch-adtricks-close').forEach(btn=>{
    if(btn._wired)return;
    btn._wired=true;
    btn.addEventListener('click',()=>{
      const panel=btn.closest('.yt-watch-adtricks');
      if(panel)panel.style.display='none';
    });
  });
  // Playlist panel
  renderPlaylistPanel(v, playCtx);
  // Related: same topic first, then cross-topic by language + difficulty, exclude self.
  // Also honor current base topic + subtopic filters so recommendations stay in the user's chosen scope.
  const btsArr=Array.from(actBts);
  const sidsArr=Array.from(actSids);
  const inScope=rv=>{
    if(btsArr.length&&!btsArr.every(b=>rv.baseTopics.includes(b)))return false;
    if(sidsArr.length&&!sidsArr.includes(rv.subtopicId))return false;
    return true;
  };
  const sameTopic=allV.filter(rv=>rv.topicId===v.topicId&&rv.id!==v.id&&inScope(rv));
  const others=allV.filter(rv=>rv.topicId!==v.topicId&&rv.id!==v.id&&inScope(rv)&&(rv.language===v.language||rv.difficulty===v.difficulty));
  const rel=[...sameTopic,...others].slice(0,10);
  E.mr.innerHTML=rel.map(rv=>{
    const rd=D[rv.difficulty]||D[1];
    const rini=(rv.speaker||'?')[0].toUpperCase();
    return `<div class="yt-related-item" data-vid="${rv.id}" data-tid="${rv.topicId}">
      <div class="yt-related-thumb"><img src="https://img.youtube.com/vi/${rv.id}/mqdefault.jpg" alt="" loading="lazy"></div>
      <div class="yt-related-info">
        <div class="yt-related-title">${esc(rv.title)}</div>
        <div class="yt-related-channel">${esc(rv.speaker)}</div>
        <div class="yt-related-meta">${LANG[rv.language]||rv.language} • ${rd.l}</div>
      </div>
    </div>`;
  }).join('');
  $$('.yt-related-item').forEach(el=>el.addEventListener('click',()=>{
    const vid=allV.find(v=>v.id===el.dataset.vid&&v.topicId===el.dataset.tid);
    if(vid){E.vm.scrollTop=0;openWatch(vid);}
  }));
  E.vm.style.display='block';document.body.style.overflow='hidden';
  updateNavButtons();
  wireFullscreenBtn();
  updateFullscreenIcon();
  // Wire mini-player
  initMiniPlayer();
}

// ===== Playlist resolution =====
// Returns {playlistId, title, url} if v is part of a known playlist, else null.
function resolvePlaylist(v){
  if(!v.playlists||!v.playlists.length)return null;
  const plRef=db.playlistRefs&&db.playlistRefs[v.playlists[0]];
  if(!plRef)return null;
  return {playlistId:plRef.id, title:plRef.title, url:plRef.url, refId:v.playlists[0]};
}

function renderPlaylistPanel(v, playCtx){
  const panel=document.getElementById('modalPlaylist');
  if(!panel)return;
  if(!playCtx){
    panel.style.display='none';
    panel.innerHTML='';
    return;
  }
  // Try to list the other videos in the same playlist, if the dataset knows them.
  const otherIds=db.playlistVideos&&db.playlistVideos[playCtx.refId]||[];
  const others=otherIds.filter(id=>id!==v.id).map(id=>allV.find(x=>x.id===id)).filter(Boolean);
  panel.style.display='';
  panel.innerHTML=`
    <div class="yt-watch-playlist-head">
      <span class="g-emoji">${playCtx.title.startsWith('Background')?'🎵':'📂'}</span>
      <div class="yt-watch-playlist-meta">
        <div class="yt-watch-playlist-label">PLAYLIST</div>
        <div class="yt-watch-playlist-title">${esc(playCtx.title)}</div>
      </div>
      <a class="yt-watch-playlist-open" href="${esc(playCtx.url)}" target="_blank" rel="noopener noreferrer" title="Open on YouTube">↗</a>
    </div>
    <div class="yt-watch-playlist-autoplay">
      <span class="yt-watch-playlist-dot"></span> Autoplay through playlist is ON
    </div>
    ${others.length?`<div class="yt-watch-playlist-list">
      ${others.slice(0,5).map(o=>`<a class="yt-watch-playlist-item" href="#" data-vid="${o.id}" data-tid="${o.topicId}">
        <img src="https://img.youtube.com/vi/${o.id}/default.jpg" alt="" loading="lazy">
        <span>${esc(o.title)}</span>
      </a>`).join('')}
    </div>`:''}
  `;
  // Click handlers for up-next items
  $$('.yt-watch-playlist-item').forEach(el=>el.addEventListener('click',e=>{
    e.preventDefault();
    const vid=allV.find(x=>x.id===el.dataset.vid&&x.topicId===el.dataset.tid);
    if(vid){E.vm.scrollTop=0;openWatch(vid);}
  }));
}

// ===== Transcript (captions) =====
function setupTranscript(v){
  const btn=document.getElementById('transcriptBtn');
  const panel=document.getElementById('transcriptPanel');
  if(!btn||!panel)return;
  btn.style.display='';
  btn.onclick=()=>{
    panel.style.display=panel.style.display==='none'?'block':'none';
    if(panel.style.display==='block'&&!panel.dataset.loaded){
      panel.innerHTML='<div class="yt-transcript-loading">Loading transcript…</div>';
      loadTranscript(v, panel);
    }
  };
}
function loadTranscript(v, panel){
  // The YouTube IFrame API can list available caption tracks via getOption.
  // We attempt that; if unavailable, fall back to the timedtext API which
  // is public and returns a 3-word-cue list for many videos.
  if(ytPlayer&&typeof ytPlayer.getOption==='function'){
    try{
      const list=ytPlayer.getOption('captions','tracklist');
      const tracks=Array.isArray(list)?list:[];
      if(tracks.length>0){
        // Prefer the manually-uploaded English track; fall back to first.
        const en=tracks.find(t=>(t.languageCode||'').startsWith('en'))||tracks[0];
        if(en&&en.baseUrl){
          fetchTranscriptFromBaseUrl(en.baseUrl, panel);
          return;
        }
      }
    }catch(e){/* fall through */}
  }
  // Fallback: timedtext API (no JSAPI needed) — returns 200 for many
  // videos, with v3 captions that include timed cues.
  const lang='en';
  fetch(`https://www.youtube.com/api/timedtext?type=track&v=${encodeURIComponent(v.id)}&lang=${lang}&fmt=json3`)
    .then(r=>r.ok?r.json():null)
    .then(j=>{
      if(!j||!j.events){panel.innerHTML='<div class="yt-transcript-empty">No transcript available for this video on YouTube.</div>';return;}
      renderTranscriptEvents(j.events, panel);
    })
    .catch(()=>{
      panel.innerHTML='<div class="yt-transcript-empty">Transcript not available (network or video has no captions).</div>';
    });
}
function fetchTranscriptFromBaseUrl(baseUrl, panel){
  // baseUrl is an explicit timedtext URL. Append &fmt=json3 to get JSON.
  const u=baseUrl+(baseUrl.includes('?')?'&':'?')+'fmt=json3';
  fetch(u).then(r=>r.ok?r.json():null).then(j=>{
    if(!j||!j.events){panel.innerHTML='<div class="yt-transcript-empty">No transcript segments returned.</div>';return;}
    renderTranscriptEvents(j.events, panel);
  }).catch(()=>{
    panel.innerHTML='<div class="yt-transcript-empty">Transcript not available.</div>';
  });
}
function renderTranscriptEvents(events, panel){
  // events: array of {tStartMs, dDurationMs, segs:[{utf8:"..."}]}
  const cues=events.filter(e=>e.segs&&e.segs.length).map(e=>{
    const text=e.segs.map(s=>s.utf8||'').join('').replace(/\s+/g,' ').trim();
    return {t:(e.tStartMs||0)/1000, text};
  }).filter(c=>c.text);
  if(!cues.length){panel.innerHTML='<div class="yt-transcript-empty">No transcript segments returned.</div>';return;}
  panel.dataset.loaded='1';
  panel.innerHTML=`<div class="yt-transcript-list">${cues.map(c=>`<p class="yt-transcript-cue" data-t="${c.t.toFixed(1)}"><span class="yt-transcript-time">${fmtT(c.t)}</span><span>${esc(c.text)}</span></p>`).join('')}</div>`;
  // Click a cue to seek the player
  $$('.yt-transcript-cue').forEach(el=>el.addEventListener('click',()=>{
    const t=parseFloat(el.dataset.t);
    if(ytPlayer&&typeof ytPlayer.seekTo==='function')ytPlayer.seekTo(t,true);
  }));
}
function fmtT(s){
  s=Math.max(0,Math.floor(s));
  const m=Math.floor(s/60),r=s%60;
  return m+':'+String(r).padStart(2,'0');
}

// ===== YouTube ad-block URL tricks =====
// These are well-known URL manipulations people use to try to avoid
// YouTube ads. They are not guaranteed — YouTube has patched most of
// them over time. We surface them so users can try them at their own
// discretion. Each one opens the modified URL in a new tab.
// Ad tricks function removed

// ===== Download via third-party downloader sites =====
// Well-known "ss" trick (ssyoutube.com) and similar downloader services.
// We surface these but DO NOT auto-redirect — the user must click.
// Includes a clear disclaimer about ToS / legal use.
function populateDownload(v){
  const list=document.querySelector('#modalDownload .yt-watch-adtricks-list');
  if(!list)return;
  const id=v.id;
  const sources=[
    {
      label:'SSYoutube (ssyoutube.com)',
      url:`https://www.ssyoutube.com/watch?v=${id}`,
      note:'The famous "ss" trick — adds "ss" before "youtube". Redirects to SaveFrom.net which offers MP4/MP3 in various qualities. Most widely known, often busy with ads.'
    },
    {
      label:'Y2Mate (y2mate.com)',
      url:`https://www.y2mate.com/youtube/${id}`,
      note:'Long-running downloader. Offers MP3, MP4 in 144p–1080p. Has ads and pop-ups — be careful what you click.'
    },
    {
      label:'9Convert (9convert.com)',
      url:`https://www.9convert.com/?url=https://www.youtube.com/watch?v=${id}`,
      note:'Another popular service. Free, no install. Quality options up to 1080p MP4. Same caveat: ads on the site.'
    },
    {
      label:'Piped (piped.video) — download endpoint',
      url:`https://piped.video/watch?v=${id}`,
      note:'Privacy-respecting YouTube frontend. Often ad-free, has a built-in download option in the player. Runs on community servers — uptime varies.'
    },
    {
      label:'Invidious (inv.nadeko.net) — watch + download',
      url:`https://inv.nadeko.net/watch?v=${id}`,
      note:'Open-source YouTube proxy. Provides download links in MP4/M4A. Community-run, availability varies by instance.'
    }
  ];
  list.innerHTML=sources.map(s=>`<li class="yt-watch-adtricks-item">
    <a class="yt-watch-adtricks-open" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer" title="Open in a new tab — third-party site">↗</a>
    <div class="yt-watch-adtricks-meta">
      <div class="yt-watch-adtricks-label">${esc(s.label)}</div>
      <div class="yt-watch-adtricks-url">${esc(s.url)}</div>
      <div class="yt-watch-adtricks-note">${esc(s.note)}</div>
    </div>
    <button class="yt-watch-adtricks-copy" type="button" data-url="${esc(s.url)}" title="Copy URL">⧉ Copy</button>
  </li>`).join('');
  // Wire copy buttons (same as ad-tricks)
  list.querySelectorAll('.yt-watch-adtricks-copy').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const url=btn.dataset.url||'';
      if(navigator.clipboard&&navigator.clipboard.writeText){
        navigator.clipboard.writeText(url).then(()=>{
          const orig=btn.textContent;
          btn.textContent='✓ Copied';
          btn.classList.add('copied');
          setTimeout(()=>{btn.textContent=orig;btn.classList.remove('copied');},1400);
        }).catch(()=>prompt('Copy this URL:',url));
      }else{
        prompt('Copy this URL:',url);
      }
    });
  });
}

// Map of downloader key -> URL template (uses {id} for the video id)
const DL_TEMPLATES={
  ssyoutube:`https://www.ssyoutube.com/watch?v={id}`,
  y2mate:`https://www.y2mate.com/youtube/{id}`,
  '9convert':`https://www.9convert.com/?url=https://www.youtube.com/watch?v={id}`,
  piped:`https://piped.video/watch?v={id}`,
  invidious:`https://inv.nadeko.net/watch?v={id}`,
};

function wireDownloadMenu(v){
  const btn=document.getElementById('modalDownloadBtn');
  const menu=document.getElementById('modalDownloadMenu');
  const more=document.getElementById('modalDownloadMore');
  if(!btn||!menu)return;
  if(btn._wired)return;
  btn._wired=true;
  const close=()=>{menu.hidden=true;btn.setAttribute('aria-expanded','false');};
  const open =()=>{menu.hidden=false;btn.setAttribute('aria-expanded','true');};
  // Toggle on click
  btn.addEventListener('click',e=>{e.stopPropagation();if(menu.hidden)open();else close();});
  // Click each method item: open the URL in a new tab + close menu
  menu.querySelectorAll('.yt-download-menu-item[data-method]').forEach(item=>{
    item.addEventListener('click',e=>{
      e.stopPropagation();
      const tmpl=DL_TEMPLATES[item.dataset.method];
      if(!tmpl)return;
      const url=tmpl.replace('{id}',v.id);
      window.open(url,'_blank','noopener,noreferrer');
      close();
    });
  });
  // "More options" opens the full panel
  if(more){
    more.addEventListener('click',e=>{
      e.stopPropagation();
      const panel=document.getElementById('modalDownload');
      if(panel){panel.style.display='block';panel.scrollIntoView({behavior:'smooth',block:'start'});}
      close();
    });
  }
  // Close on outside click / Escape
  document.addEventListener('click',e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==btn)close();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden)close();});
}

function closeModal(){
  // Exit fullscreen if active
  if(document.fullscreenElement||document.webkitFullscreenElement){
    (document.exitFullscreen||document.webkitExitFullscreen).call(document).catch(()=>{});
  }
  // Real watch progress is captured via setupYTProgress (YouTube IFrame API).
  // If user opened but YT API never reported time, record a 1% "visited" marker.
  if(curV&&!progMap[curV.id]){progMap[curV.id]={pct:1,ts:Date.now()};saveProg();}
  // Reset transcript + playlist for the next open
  const tp=document.getElementById('transcriptPanel');if(tp){tp.style.display='none';tp.innerHTML='';delete tp.dataset.loaded;}
  const pl=document.getElementById('modalPlaylist');if(pl){pl.style.display='none';pl.innerHTML='';}
  const tb=document.getElementById('transcriptBtn');if(tb)tb.style.display='none';
  const dl=document.getElementById('modalDownload');if(dl)dl.style.display='none';
  const dlm=document.getElementById('modalDownloadMenu');if(dlm)dlm.hidden=true;
  const dlb=document.getElementById('modalDownloadBtn');if(dlb)dlb.setAttribute('aria-expanded','false');
  // Reset ad mitigation state for the next video
  if(_adPollTimer){clearInterval(_adPollTimer);_adPollTimer=null;}
  adTabOpenedFor=null;
  // Show mini-player if video was playing
  if(curV && !curV.isPlaylistRef && !curV.isChannelRef) {
    showMiniPlayer(curV);
  } else {
    hideMiniPlayer();
  }
  if(miniScrollObserver){miniScrollObserver.disconnect();miniScrollObserver=null;}
  E.vm.style.display='none';E.mp.innerHTML='';document.body.style.overflow='';curV=null;
  updateNavButtons();
}
function saveProg(){try{localStorage.setItem('ym_prog',JSON.stringify(progMap));}catch(e){}}
window.closeModal=closeModal;

// ===== Video Navigation =====
let navIdx = -1; // Current position in filtV
function updateNavButtons() {
  const prevBtn = document.getElementById('prevVideoBtn');
  const nextBtn = document.getElementById('nextVideoBtn');
  if (!prevBtn || !nextBtn) return;
  if (!curV || !filtV.length) {
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
    return;
  }
  navIdx = filtV.findIndex(v => v.id === curV.id && v.topicId === curV.topicId);
  prevBtn.style.display = navIdx > 0 ? 'flex' : 'none';
  nextBtn.style.display = navIdx >= 0 && navIdx < filtV.length - 1 ? 'flex' : 'none';
}
window.navigateVideo = function(dir) {
  if (!curV || !filtV.length) return;
  if (navIdx < 0) navIdx = filtV.findIndex(v => v.id === curV.id && v.topicId === curV.topicId);
  const newIdx = navIdx + dir;
  if (newIdx < 0 || newIdx >= filtV.length) return;
  const nv = filtV[newIdx];
  if (nv.isPlaylistRef || nv.isChannelRef) return; // skip non-video entries
  E.vm.scrollTop = 0;
  openWatch(nv);
};

// ===== Fullscreen toggle =====
function toggleFullscreen() {
  // Target .yt-player (parent) so nav buttons remain visible in fullscreen
  const player = document.querySelector('.yt-player');
  if (!player) return;
  if (document.fullscreenElement || document.webkitFullscreenElement) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    (player.requestFullscreen || player.webkitRequestFullscreen).call(player);
  }
}
function updateFullscreenIcon() {
  const btn = document.getElementById('fullscreenBtn');
  if (!btn) return;
  const isFull = !!(document.fullscreenElement || document.webkitFullscreenElement);
  btn.innerHTML = isFull
    ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
  btn.title = isFull ? 'Exit fullscreen' : 'Fullscreen';
}
document.addEventListener('fullscreenchange', updateFullscreenIcon);
document.addEventListener('webkitfullscreenchange', updateFullscreenIcon);

// Wire fullscreen button after modal opens
function wireFullscreenBtn() {
  const btn = document.getElementById('fullscreenBtn');
  if (!btn || btn._wired) return;
  btn._wired = true;
  btn.addEventListener('click', toggleFullscreen);
}

// ===== FLOATING MINI-PLAYER (PiP style) =====
let miniPlayerActive = false;
let miniPlayerVideo = null;
let miniScrollObserver = null;

function initMiniPlayer() {
  const miniEl = document.getElementById('miniPlayer');
  if (!miniEl || miniEl._wired) return;
  miniEl._wired = true;

  // Expand button — reopen the full modal with current video
  document.getElementById('miniPlayerExpand')?.addEventListener('click', () => {
    const video = miniPlayerVideo;
    hideMiniPlayer();
    if (video) {
      curV = video;
      E.mt.textContent = video.title;
      E.ms.textContent = video.speaker;
      const d = D[video.difficulty] || D[1];
      const ini = (video.speaker || '?')[0].toUpperCase();
      E.ma.textContent = ini;
      E.ma.style.background = video.topicColor || '#3ea6ff';
      const tags = (video.tags || []).map(t => `<span class="yt-watch-tag">${esc(t)}</span>`).join('');
      E.mm.innerHTML = `<span style="color:var(--yt-text)">${d.l}</span> • ${LANG[video.language] || video.language} • ${fmtD(video.duration)}${tags ? '  •  ' + tags : ''}`;
      E.mtg.innerHTML = tags;
      const playCtx = resolvePlaylist(video);
      const adBlockParams = '&iv_load_policy=3&modestbranding=1&playsinline=1&fs=0&cc_load_policy=0&disablekb=0&autoplay=1';
      const playerSrc = playCtx
        ? `https://www.youtube-nocookie.com/embed/videoseries?list=${playCtx.playlistId}&autoplay=1&rel=0&enablejsapi=1&v=${video.id}${adBlockParams}`
        : `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&enablejsapi=1${adBlockParams}`;
      E.mp.innerHTML = `<iframe id="ytPlayerIframe" src="${playerSrc}" allow="autoplay;encrypted-media;picture-in-picture" allowfullscreen playsinline loading="eager"></iframe>`;
      setupYTProgress(video);
      setupTranscript(video);
      const isBm = bms.some(b => b.id === video.id && b.topicId === video.topicId);
      E.mb.classList.toggle('bookmarked', isBm);
      E.mb.querySelector('span').textContent = isBm ? 'Saved' : 'Save';
      renderPlaylistPanel(video, playCtx);
      E.vm.style.display = 'block';
      document.body.style.overflow = 'hidden';
      E.vm.scrollTop = 0;
      updateNavButtons();
      wireFullscreenBtn();
      updateFullscreenIcon();
      initMiniPlayer();
    }
  });

  // Close button — stop playing and hide
  document.getElementById('miniPlayerClose')?.addEventListener('click', () => {
    hideMiniPlayer();
  });

  // Drag functionality
  setupMiniPlayerDrag(miniEl);
}

function showMiniPlayer(video) {
  if (!video || video.isPlaylistRef || video.isChannelRef) return;
  const miniEl = document.getElementById('miniPlayer');
  const container = document.getElementById('miniPlayerContainer');
  const titleEl = document.getElementById('miniPlayerTitle');
  if (!miniEl || !container) return;

  // Don't restart if same video
  if (miniPlayerVideo && miniPlayerVideo.id === video.id && miniPlayerActive) return;
  miniPlayerVideo = video;
  miniPlayerActive = true;

  titleEl.textContent = video.title;
  const src = `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&enablejsapi=1&iv_load_policy=3&modestbranding=1&playsinline=1`;
  container.innerHTML = `<iframe src="${src}" allow="autoplay;encrypted-media" allowfullscreen playsinline></iframe>`;

  miniEl.style.display = '';
  miniEl.classList.remove('hidden');
  // Animate in
  requestAnimationFrame(() => {
    miniEl.style.opacity = '1';
    miniEl.style.transform = 'translateY(0)';
  });
}

function hideMiniPlayer() {
  const miniEl = document.getElementById('miniPlayer');
  const container = document.getElementById('miniPlayerContainer');
  if (!miniEl) return;
  miniEl.classList.add('hidden');
  miniPlayerActive = false;
  miniPlayerVideo = null;
  setTimeout(() => {
    miniEl.style.display = 'none';
    if (container) container.innerHTML = '';
  }, 300);
}

function setupMiniPlayerDrag(el) {
  const header = document.getElementById('miniPlayerDrag');
  if (!header) return;
  let dragging = false, startX, startY, startLeft, startTop;

  const onMove = (e) => {
    if (!dragging) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const newLeft = startLeft - (startX - clientX);
    const newTop = startTop - (startY - clientY);
    // Constrain to viewport
    const maxLeft = window.innerWidth - el.offsetWidth;
    const maxTop = window.innerHeight - el.offsetHeight;
    el.style.left = Math.max(0, Math.min(maxLeft, newLeft)) + 'px';
    el.style.top = Math.max(0, Math.min(maxTop, newTop)) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  };

  const onUp = () => {
    dragging = false;
    el.style.transition = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  };

  const onDown = (e) => {
    // Don't drag on buttons
    if (e.target.closest('.yt-mini-btn')) return;
    dragging = true;
    el.style.transition = 'none';
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const rect = el.getBoundingClientRect();
    startX = clientX;
    startY = clientY;
    startLeft = rect.left;
    startTop = rect.top;
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onUp);
    e.preventDefault();
  };

  header.addEventListener('mousedown', onDown);
  header.addEventListener('touchstart', onDown, { passive: false });
}

// Observe when main player scrolls out of view
function setupMiniPlayerScrollObserver() {
  if (miniScrollObserver) miniScrollObserver.disconnect();
  const player = document.querySelector('.yt-player');
  if (!player) return;

  miniScrollObserver = new IntersectionObserver((entries) => {
    const entry = entries[0];
    // Show mini-player when main player is NOT visible and a video is playing
    if (!entry.isIntersecting && curV && E.vm.style.display === 'block') {
      showMiniPlayer(curV);
    }
    // Hide mini-player when main player comes back into view
    if (entry.isIntersecting && miniPlayerActive) {
      hideMiniPlayer();
    }
  }, { threshold: 0.3 });

  miniScrollObserver.observe(player);
}

function toggleBm(v){
  const i=bms.findIndex(b=>b.id===v.id&&b.topicId===v.topicId);
  if(i>=0)bms.splice(i,1);else bms.push({id:v.id,topicId:v.topicId,title:v.title,speaker:v.speaker,ts:Date.now()});
  localStorage.setItem('ym_bms',JSON.stringify(bms));
}
window.toggleBookmarkFromModal=function(){
  if(!curV)return;toggleBm(curV);
  const isBm=bms.some(b=>b.id===curV.id&&b.topicId===curV.topicId);
  E.mb.classList.toggle('bookmarked',isBm);
  E.mb.querySelector('span').textContent=isBm?'Saved':'Save';
  const btn=document.querySelector(`.yt-card-bookmark[data-id="${curV.id}"]`);
  if(btn)btn.classList.toggle('bookmarked',isBm);
};
window.shareCurrent=function(){
  if(!curV)return;
  const url=`https://www.youtube.com/watch?v=${curV.id}`;
  const text=`${curV.title} — ${curV.speaker}`;
  if(navigator.share){
    navigator.share({title:curV.title,text,url}).catch(()=>{});
  }else if(navigator.clipboard){
    navigator.clipboard.writeText(`${text}\n${url}`).then(()=>{
      const span=E.ms&&E.ms.parentNode;
      const orig=E.mb.querySelector('span').textContent;
      const shareBtn=document.getElementById('modalShare');
      if(shareBtn){shareBtn.querySelector('span').textContent='Copied!';setTimeout(()=>{if(shareBtn.querySelector('span'))shareBtn.querySelector('span').textContent='Share';},1800);}
    }).catch(()=>{
      prompt('Copy this link:',url);
    });
  }else{
    prompt('Copy this link:',url);
  }
};

function renderBookmarks(){
  if(!bms.length){E.bg.innerHTML='';E.nb.style.display='block';E.bc.textContent='';return;}
  E.nb.style.display='none';
  E.bc.textContent=`${bms.length} video${bms.length!==1?'s':''}`;
  const vs=bms.map(b=>allV.find(v=>v.id===b.id&&v.topicId===b.topicId)).filter(Boolean);
  E.bg.innerHTML='';vs.forEach(v=>E.bg.appendChild(mkCard(v)));
}

window.randomVideo=function(){if(!allV.length)return;openWatch(allV[Math.floor(Math.random()*allV.length)]);};
window.showHome=function(){E.hv.style.display='';E.bv.style.display='none';$$('.yt-guide-item').forEach(i=>i.classList.toggle('yt-guide-item--active',i.dataset.view==='home'));};
window.showBookmarks=function(){E.hv.style.display='none';E.bv.style.display='';$$('.yt-guide-item').forEach(i=>i.classList.toggle('yt-guide-item--active',i.dataset.view==='bookmarks'));renderBookmarks();};

function loadTheme(){const t=localStorage.getItem('ym_theme')||'dark';document.documentElement.setAttribute('data-theme',t);updTI(t);}
// Icon shows the action: in dark mode, show SUN (click to switch to light). In light mode, show MOON (click to switch to dark).
function toggleTheme(){const c=document.documentElement.getAttribute('data-theme');const n=c==='dark'?'light':'dark';document.documentElement.setAttribute('data-theme',n);localStorage.setItem('ym_theme',n);updTI(n);}
function updTI(t){
  // tid (themeIconDark) is the SUN. Show when in dark mode (offers switch to light).
  // til (themeIconLight) is the MOON. Show when in light mode (offers switch to dark).
  E.tid.style.display=t==='dark'?'':'none';
  E.til.style.display=t==='light'?'':'none';
}

function fmtD(s){if(!s)return'';const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),sec=s%60;return h>0?`${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`:`${m}:${String(sec).padStart(2,'0')}`;}
function esc(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

function bindEv(){
  let t;E.si.addEventListener('input',()=>{clearTimeout(t);t=setTimeout(applyF,200);});
  E.sb.addEventListener('click',applyF);
  E.si.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();applyF();}});
  E.st.addEventListener('click',()=>E.sbx.classList.toggle('open'));
  E.tt.addEventListener('click',toggleTheme);
  E.rb.addEventListener('click',window.randomVideo);
  E.bkb.addEventListener('click',()=>{if(E.bv.style.display==='none'||!E.bv.style.display)window.showBookmarks();else window.showHome();});

  // Sidebar text filter
  if(E.sbf)E.sbf.addEventListener('input',()=>{sidebarFilter=E.sbf.value;renderSide();});

  // Quick filters
  const qfContinue=document.getElementById('qfContinue');
  const qfBookmarks=document.getElementById('qfBookmarks');
  const qfNew=document.getElementById('qfNew');
  const qfKids=document.getElementById('qfKids');
  if(qfContinue)qfContinue.addEventListener('click',()=>{actQf.continue=!actQf.continue;renderSide();applyF();});
  if(qfBookmarks)qfBookmarks.addEventListener('click',()=>{actQf.bookmarks=!actQf.bookmarks;renderSide();applyF();});
  if(qfNew)qfNew.addEventListener('click',()=>{actQf.new=!actQf.new;renderSide();applyF();});
  if(qfKids)qfKids.addEventListener('click',()=>{actQf.kids=!actQf.kids;renderSide();applyF();});

  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')closeModal();
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&document.activeElement!==E.si){e.preventDefault();E.si.focus();}
    // Arrow keys for prev/next video navigation
    if(curV&&E.vm.style.display==='block'){
      if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();window.navigateVideo(-1);}
      if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();window.navigateVideo(1);}
    }
  });
  document.addEventListener('click',e=>{
    if(window.innerWidth<=1024&&E.sbx.classList.contains('open')&&!E.sbx.contains(e.target)&&!E.st.contains(e.target))E.sbx.classList.remove('open');
  });
  initResizer();
}

function initResizer(){
  const r=document.getElementById('guideResizer');
  if(!r)return;
  // Restore saved width
  const saved=parseInt(localStorage.getItem('ym_guide_w')||'',10);
  if(saved>=160&&saved<=560)document.documentElement.style.setProperty('--yt-guide-width',saved+'px');
  let dragging=false,startX=0,startW=0;
  const onMove=e=>{
    if(!dragging)return;
    const w=Math.max(160,Math.min(560,startW+(e.clientX-startX)));
    document.documentElement.style.setProperty('--yt-guide-width',w+'px');
  };
  const onUp=()=>{
    if(!dragging)return;
    dragging=false;
    document.body.style.cursor='';
    const w=getComputedStyle(document.documentElement).getPropertyValue('--yt-guide-width');
    localStorage.setItem('ym_guide_w',parseInt(w,10));
  };
  r.addEventListener('mousedown',e=>{
    dragging=true;startX=e.clientX;
    startW=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--yt-guide-width'),10);
    document.body.style.cursor='col-resize';
    e.preventDefault();
  });
  document.addEventListener('mousemove',onMove);
  document.addEventListener('mouseup',onUp);
  // Touch support
  r.addEventListener('touchstart',e=>{
    dragging=true;startX=e.touches[0].clientX;
    startW=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--yt-guide-width'),10);
  },{passive:true});
  document.addEventListener('touchmove',e=>{if(dragging){const w=Math.max(160,Math.min(560,startW+(e.touches[0].clientX-startX)));document.documentElement.style.setProperty('--yt-guide-width',w+'px');}},{passive:true});
  document.addEventListener('touchend',onUp);
  // Keyboard accessibility: arrow keys when focused
  r.addEventListener('keydown',e=>{
    const cur=parseInt(getComputedStyle(document.documentElement).getPropertyValue('--yt-guide-width'),10);
    let n=cur;
    if(e.key==='ArrowLeft')n=cur-16;
    else if(e.key==='ArrowRight')n=cur+16;
    else return;
    e.preventDefault();
    n=Math.max(160,Math.min(560,n));
    document.documentElement.style.setProperty('--yt-guide-width',n+'px');
    localStorage.setItem('ym_guide_w',n);
  });
}

document.addEventListener('DOMContentLoaded',init);

// ===== YouTube IFrame API for real progress tracking =====
let ytPlayer=null,ytReadyCb=null;
(function loadYT(){
  if(window.YT&&window.YT.Player)return;
  const tag=document.createElement('script');tag.src='https://www.youtube.com/iframe_api';
  document.head.appendChild(tag);
  window.onYouTubeIframeAPIReady=function(){
    if(typeof ytReadyCb==='function')ytReadyCb();
  };
})();
function setupYTProgress(v){
  const init=()=>{
    try{
      ytPlayer=new YT.Player('ytPlayerIframe',{
        events:{
          onReady:(e)=>{
            // Force autoplay: unmute + play
            try{
              e.target.unMute();
              e.target.playVideo();
            }catch(err){}
            detectAdState();
          },
          onError:(e)=>{
            // If embed fails, show fallback play button
            showAutoplayFallback(v);
          },
          onStateChange:(e)=>{
            detectAdState();
            if(e.data===YT.PlayerState.PLAYING){
              const tick=()=>{
                if(!ytPlayer||!ytPlayer.getCurrentTime||!curV)return;
                const t=ytPlayer.getCurrentTime();
                const d=ytPlayer.getDuration();
                if(d>0){
                  const pct=Math.min(100,Math.round((t/d)*100));
                  if(pct>(progMap[curV.id]?.pct||0)){
                    progMap[curV.id]={pct,ts:Date.now()};
                    saveProg();
                  }
                }
                if(ytPlayer.getPlayerState()===YT.PlayerState.PLAYING)setTimeout(tick,5000);
              };
              tick();
            }
            // If video ended or is unstarted, force play
            if(e.data===YT.PlayerState.ENDED){
              try{ ytPlayer.seekTo(0); ytPlayer.playVideo(); }catch(ex){}
            }
            if(e.data===YT.PlayerState.UNSTARTED||e.data===YT.PlayerState.PAUSED){
              // Retry play once after brief delay (handles blocked autoplay)
              setTimeout(()=>{
                try{
                  if(ytPlayer&&typeof ytPlayer.playVideo==='function'){
                    ytPlayer.unMute();
                    ytPlayer.playVideo();
                  }
                }catch(ex){}
              },500);
            }
          },
          onAdStateChange:(e)=>updateAdUI(e)
        }
      });
    }catch(err){console.warn('YT Player init failed',err);}
  };
  if(window.YT&&window.YT.Player)init();
  else ytReadyCb=init;
}

// ===== Ad-state detection & UI overlay =====
//
// YouTube embeds play pre-roll, mid-roll, and post-roll ads. We can't block
// them at the network layer (that would require a browser extension or a
// proxy), but we CAN detect ad playback via the IFrame API and improve UX
// with a clear "ad playing" badge, an optional 6-second auto-skip hint,
// and a card-level "Watch on YouTube" escape hatch.
//
// The YouTube IFrame Player exposes:
//   - ytPlayer.getOption('ad', 'adsEnabled')   → 0 if the player has no ads
//   - onAdStateChange event with codes: 0=playing, 1=skippable, 2=skipped,
//     3=ad end (back to video). We can drive our own skip button on
//     state 1 (skippable ad). The actual ad can't be skipped before
//     YouTube's 5s countdown finishes, but we can show a "Skip ad in 5s" hint.
//
function detectAdState(){
  if(!ytPlayer)return;
  try{
    if(typeof ytPlayer.getAdState==='function'){
      const st=ytPlayer.getAdState();
      updateAdUI({data:st});
    }
  }catch(e){}
  pollAdFromState();
}

let adSkipTicker=null;
let adTabOpenedFor=null;
let _adPollTimer=null;

// ===== Inject ad-blocking CSS into YouTube iframe =====
// Best-effort: only works if same-origin policy allows it (rare on youtube-nocookie.com)
// Falls back to postMessage approach
function injectAdBlockCSS(){
  const iframe=document.getElementById('ytPlayerIframe');
  if(!iframe)return;
  try{
    // Try to inject CSS directly (will fail cross-origin but costs nothing)
    const doc=iframe.contentDocument||iframe.contentWindow?.document;
    if(doc&&doc.head){
      const style=doc.createElement('style');
      style.textContent=`
        .ytp-ad-overlay-container, .ytp-ad-overlay-slot, .ytp-ad-overlay-image,
        .ytp-ad-text-overlay, .ytp-ad-clickthrough, .ytp-ad-skip-button,
        .ytp-ad-skip-button-modern, .ytp-ad-skip-button-slot,
        .ytp-ad-showing .ytp-chrome-bottom, .ytp-ad-showing .ytp-chrome-top,
        .ytp-ad-showing .ytp-gradient-top, .ytp-ad-showing .ytp-gradient-bottom,
        .ytp-ad-showing .ytp-paid-content-overlay, .ytp-ad-showing .ytp-ce-element,
        .ytp-ad-showing .ytp-cards-teaser, .ytp-ad-showing .ytp-endscreen-content,
        .ytp-ad-showing .ytp-cued-thumbnail-overlay,
        .ytp-ad-playing .ytp-paid-content-overlay { display:none!important; }
      `;
      doc.head.appendChild(style);
    }
  }catch(e){
    // Cross-origin blocked — expected. CSS filter in style.css handles what it can.
  }
}

// ===== Auto-play on card click (ensures autoplay actually fires) =====
// Some browsers block autoplay. We use a silent audio trick + user gesture.
let _autoplayAudio=null;
function ensureAutoplaySupport(){
  if(_autoplayAudio)return;
  try{
    _autoplayAudio=new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=');
    _autoplayAudio.volume=0.01;
    _autoplayAudio.play().then(()=>{_autoplayAudio.pause();}).catch(()=>{});
  }catch(e){}
}

// ===== Responsive: auto-close sidebar on mobile when opening video =====
// ===== Autoplay fallback — retry with playVideo() after delay =====
function showAutoplayFallback(v) {
  const iframe = document.getElementById('ytPlayerIframe');
  if (!iframe || !v) return;
  // Try programmatic play after a short delay
  setTimeout(() => {
    try {
      if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
        ytPlayer.unMute();
        ytPlayer.playVideo();
      }
    } catch(e) {}
  }, 1000);
  // Show a "Click to play" overlay if still paused after 2s
  setTimeout(() => {
    if (!ytPlayer || !curV) return;
    try {
      const state = ytPlayer.getPlayerState && ytPlayer.getPlayerState();
      if (state === YT.PlayerState.PAUSED || state === YT.PlayerState.UNSTARTED || state === -1) {
        const player = document.querySelector('.yt-player');
        if (!player || document.querySelector('.yt-autoplay-retry')) return;
        const overlay = document.createElement('div');
        overlay.className = 'yt-autoplay-retry';
        overlay.innerHTML = '<div class="yt-autoplay-retry-btn"><svg viewBox="0 0 24 24" width="32" height="32" fill="#fff"><path d="M8 5v14l11-7z"/></svg></div>';
        overlay.addEventListener('click', () => {
          try { ytPlayer.unMute(); ytPlayer.playVideo(); } catch(e) {}
          overlay.classList.add('hidden');
          setTimeout(() => overlay.remove(), 300);
        });
        player.appendChild(overlay);
      }
    } catch(e) {}
  }, 2500);
}

// Force play on next user interaction if autoplay was blocked
function forceAutoplayOnInteraction() {
  const handler = () => {
    if (ytPlayer && typeof ytPlayer.playVideo === 'function') {
      try {
        ytPlayer.unMute();
        ytPlayer.playVideo();
      } catch(e) {}
    }
    document.removeEventListener('click', handler);
    document.removeEventListener('keydown', handler);
  };
  document.addEventListener('click', handler, { once: true });
  document.addEventListener('keydown', handler, { once: true });
}

function autoCloseSidebarOnMobile(){
  if(window.innerWidth<=1024&&E.sbx&&E.sbx.classList.contains('open')){
    E.sbx.classList.remove('open');
  }
}

// Patch openWatch to include autoplay + mobile sidebar close
const _origOpenWatch=window.openWatch||openWatch;

function updateAdUI(){{}// no-op: ad UI removed
}

function pollAdFromState(){
  if(!ytPlayer)return;
  try{
    if(typeof ytPlayer.getAdState==='function'&&ytPlayer.getAdState()>0){
      // Ad is playing — track progress bar
      const bar=document.getElementById('playerProgressBar');
      if(bar){bar.style.background='#ffd54f';}
    }else{
      const bar=document.getElementById('playerProgressBar');
      if(bar){bar.style.background='var(--yt-red)';}
    }
  }catch(e){}
}

})();