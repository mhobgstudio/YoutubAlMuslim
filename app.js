/* YoutubAlMuslim — YouTube-Exact Logic */
(function(){
'use strict';
let db=null,allV=[],filtV=[],dispCnt=0;const PS=20;
let actTid=null,actSid=null,actLang=null,curV=null;
let actBts=new Set(); // multi-select base topics (AND filter)
let actSids=new Set(); // multi-select subtopics (AND filter across all topics)
let bms=JSON.parse(localStorage.getItem('ym_bms')||'[]');
let progMap=JSON.parse(localStorage.getItem('ym_prog')||'{}'); // {vid: {pct:0-100, ts:number}}
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);
const E={
  si:$('#searchInput'),sb:$('#searchBtn'),st:$('#sidebarToggle'),
  sbx:$('#sidebar'),sbt:$('#sidebarTopics'),
  sbb:$('#sidebarBaseTopics'),
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
  // Base topics (multi-select, AND filter)
  const bts=db.baseTopics||{};
  if(E.sbb){
    E.sbb.innerHTML=Object.entries(bts).map(([id,bt])=>{
      const n=db.topics.filter(t=>(t.baseTopics||[]).includes(id))
        .reduce((a,t)=>a+t.subtopics.reduce((b,s)=>b+s.videos.length,0),0);
      return `<div class="yt-guide-topic yt-guide-base" data-base-id="${id}" role="checkbox" aria-checked="false" tabindex="0">
        <span class="g-emoji">${bt.icon}</span>
        <span>${bt.name}</span>
        <span class="g-count">${n}</span>
      </div>`;
    }).join('');
    $$('.yt-guide-base').forEach(el=>el.addEventListener('click',()=>toggleBase(el.dataset.baseId)));
    // Keyboard accessibility
    $$('.yt-guide-base').forEach(el=>el.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleBase(el.dataset.baseId);}
    }));
  }
  // Clear base topics
  const clearBtn=document.getElementById('clearBaseTopics');
  if(clearBtn)clearBtn.addEventListener('click',()=>{actBts.clear();updateBaseUI();applyF();});

  // Subtopics — collapsible topic groups, multi-select subtopic checkboxes (AND)
  E.sbt.innerHTML=db.topics.map(t=>{
    const total=t.subtopics.reduce((a,s)=>a+s.videos.length,0);
    return `<div class="yt-guide-group" data-topic-id="${t.id}">
      <div class="yt-guide-group-head" data-topic-id="${t.id}" role="button" tabindex="0" aria-expanded="false">
        <span class="g-caret">▸</span>
        <span class="g-emoji">${t.icon}</span>
        <span class="g-label">${esc(t.name.replace(/^[IVX]+\.\s*/,''))}</span>
        <span class="g-count">${total}</span>
      </div>
      <div class="yt-guide-group-body" data-topic-id="${t.id}" hidden>
        ${t.subtopics.map(s=>{
          const on=actSids.has(s.id);
          return `<div class="yt-guide-sub ${on?'active':''}" data-sub-id="${s.id}" data-topic-id="${t.id}" role="checkbox" tabindex="0" aria-checked="${on?'true':'false'}" title="${esc(s.name)} — ${s.videos.length} videos">
            <span class="g-check">${on?'☑':'☐'}</span>
            <span class="g-sub-label">${esc(s.name.replace(/^THE\s+/i,'').replace(/^AL-/,'').replace(/\s*\(.*\)\s*/g,''))}</span>
            <span class="g-count">${s.videos.length}</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  // Group head click: toggle expand
  $$('.yt-guide-group-head').forEach(h=>h.addEventListener('click',()=>toggleGroup(h.dataset.topicId)));
  $$('.yt-guide-group-head').forEach(h=>h.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleGroup(h.dataset.topicId);}
  }));
  // Subtopic click: multi-select toggle
  $$('.yt-guide-sub').forEach(el=>el.addEventListener('click',()=>toggleSub(el.dataset.subId,el)));
  $$('.yt-guide-sub').forEach(el=>el.addEventListener('keydown',e=>{
    if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleSub(el.dataset.subId,el);}
  }));

  // Expand/Collapse all
  const exp=document.getElementById('expandAllSubs');
  const col=document.getElementById('collapseAllSubs');
  if(exp)exp.onclick=()=>{$$('.yt-guide-group-body').forEach(b=>{b.hidden=false;const h=$$('.yt-guide-group-head').find(x=>x.dataset.topicId===b.dataset.topicId);if(h){h.setAttribute('aria-expanded','true');h.querySelector('.g-caret').textContent='▾';}});};
  if(col)col.onclick=()=>{$$('.yt-guide-group-body').forEach(b=>{b.hidden=true;const h=$$('.yt-guide-group-head').find(x=>x.dataset.topicId===b.dataset.topicId);if(h){h.setAttribute('aria-expanded','false');h.querySelector('.g-caret').textContent='▸';}});};

  // Clear subtopics
  const clearSubBtn=document.getElementById('clearSubtopics');
  if(clearSubBtn)clearSubBtn.onclick=()=>{actSids.clear();renderSide();applyF();};

  // Auto-expand any group that has a selected subtopic
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
  // AND filter: video's baseTopics must contain every selected base topic
  const btsArr=Array.from(actBts);
  // AND filter: video's subtopicId must be in the selected subtopic set (or none selected)
  const sidsArr=Array.from(actSids);
  filtV=allV.filter(v=>{
    if(actTid&&v.topicId!==actTid)return false;
    if(actLang&&v.language!==actLang)return false;
    if(btsArr.length){for(const bt of btsArr){if(!v.baseTopics.includes(bt))return false;}}
    if(sidsArr.length){if(!sidsArr.includes(v.subtopicId))return false;}
    if(terms.length){
      const s=[v.title,v.titleAr||'',v.speaker,v.topicName,v.topicNameAr||'',v.subtopicName,v.subtopicNameAr||'',...(v.tags||[])].join(' ').toLowerCase();
      for(const t of terms){if(!s.includes(t))return false;}
    }
    return true;
  });
  // Update live result count for screen readers
  const live=document.getElementById('yt-search-live');
  if(live)live.textContent=filtV.length+' videos';
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
  E.mt.textContent=v.title;
  E.ms.textContent=v.speaker;
  const d=D[v.difficulty]||D[1];
  const ini=(v.speaker||'?')[0].toUpperCase();
  E.ma.textContent=ini;E.ma.style.background=v.topicColor||'#3ea6ff';
  const tags=(v.tags||[]).map(t=>`<span class="yt-watch-tag">${esc(t)}</span>`).join('');
  E.mm.innerHTML=`<span style="color:var(--yt-text)">${d.l}</span> • ${LANG[v.language]||v.language} • ${fmtD(v.duration)}${tags?'  •  '+tags:''}`;
  E.mtg.innerHTML=tags;
  E.mp.innerHTML=`<iframe id="ytPlayerIframe" src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0&enablejsapi=1" allow="autoplay;encrypted-media" allowfullscreen></iframe>`;
  // Wire progress tracking via YouTube IFrame API (loaded once)
  setupYTProgress(v);
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
}

function closeModal(){
  // Real watch progress is captured via setupYTProgress (YouTube IFrame API).
  // If user opened but YT API never reported time, record a 1% "visited" marker.
  if(curV&&!progMap[curV.id]){progMap[curV.id]={pct:1,ts:Date.now()};saveProg();}
  E.vm.style.display='none';E.mp.innerHTML='';document.body.style.overflow='';curV=null;
}
function saveProg(){try{localStorage.setItem('ym_prog',JSON.stringify(progMap));}catch(e){}}
window.closeModal=closeModal;

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
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape')closeModal();
    if(e.key==='/'&&!e.ctrlKey&&!e.metaKey&&document.activeElement!==E.si){e.preventDefault();E.si.focus();}
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
          onReady:(e)=>{e.target.unMute&&e.target.unMute();},
          onStateChange:(e)=>{
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
          }
        }
      });
    }catch(err){console.warn('YT Player init failed',err);}
  };
  if(window.YT&&window.YT.Player)init();
  else ytReadyCb=init;
}
})();