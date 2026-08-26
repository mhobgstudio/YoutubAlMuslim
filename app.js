/* ============================================
   YoutubAlMuslim — YouTube-Exact App Logic
   ============================================ */
(function () {
  'use strict';

  let db = null;
  let allVideos = [];
  let filteredVideos = [];
  let displayedCount = 0;
  const PAGE_SIZE = 20;
  let activeTopicId = null;
  let activeSubtopicId = null;
  let currentModalVideo = null;
  let bookmarks = JSON.parse(localStorage.getItem('ym_bookmarks') || '[]');

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    searchInput: $('#searchInput'),
    searchBtn: $('#searchBtn'),
    sidebarToggle: $('#sidebarToggle'),
    sidebar: $('#sidebar'),
    sidebarTopics: $('#sidebarTopics'),
    chipsBar: $('#chipsBar'),
    subtopicChips: $('#subtopicChips'),
    videoGrid: $('#videoGrid'),
    noResults: $('#noResults'),
    loadMore: $('#loadMore'),
    loadMoreBtn: $('#loadMoreBtn'),
    homeView: $('#homeView'),
    bookmarksView: $('#bookmarksView'),
    bookmarksGrid: $('#bookmarksGrid'),
    noBookmarks: $('#noBookmarks'),
    bookmarkCount: $('#bookmarkCount'),
    videoModal: $('#videoModal'),
    modalPlayer: $('#modalPlayer'),
    modalTitle: $('#modalTitle'),
    modalSpeaker: $('#modalSpeaker'),
    modalDifficulty: $('#modalDifficulty'),
    modalLanguage: $('#modalLanguage'),
    modalDuration: $('#modalDuration'),
    modalTags: $('#modalTags'),
    modalBookmark: $('#modalBookmark'),
    modalRelated: $('#modalRelated'),
    themeToggle: $('#themeToggle'),
    themeIconDark: $('#themeIconDark'),
    themeIconLight: $('#themeIconLight'),
    randomBtn: $('#randomBtn'),
    bookmarksBtn: $('#bookmarksBtn'),
  };

  const DIFF = {
    1: { label: 'Beginner', color: '#4CAF50' },
    2: { label: 'Intermediate', color: '#2196F3' },
    3: { label: 'Advanced', color: '#FF9800' },
    4: { label: 'Scholar', color: '#9C27B0' },
  };

  const LANG = {
    en: 'English', ar: 'العربية', ur: 'اردو', tr: 'Türkçe',
    ms: 'Melayu', fr: 'Français', id: 'Indonesia', bn: 'বাংলা',
    ha: 'Hausa', sw: 'Kiswahili', zh: '中文',
  };

  // ===== INIT =====
  async function init() {
    loadTheme();
    try {
      const resp = await fetch('data/topics.json');
      db = await resp.json();
      buildIndex();
      renderChips();
      renderSidebar();
      renderGrid(true);
      bindEvents();
    } catch (e) {
      console.error('Failed to load database:', e);
      els.videoGrid.innerHTML = '<p style="text-align:center;padding:40px;color:#aaa;">Failed to load database. Please refresh.</p>';
    }
  }

  // ===== BUILD FLAT INDEX =====
  function buildIndex() {
    allVideos = [];
    db.topics.forEach(t => {
      t.subtopics.forEach(s => {
        s.videos.forEach(v => {
          allVideos.push({
            ...v,
            topicId: t.id, topicName: t.name, topicNameAr: t.nameAr,
            topicIcon: t.icon, topicColor: t.color,
            subtopicId: s.id, subtopicName: s.name, subtopicNameAr: s.nameAr,
          });
        });
      });
    });
    filteredVideos = [...allVideos];
  }

  // ===== RENDER CHIPS BAR =====
  function renderChips() {
    const chips = db.topics.map(t => {
      const count = t.subtopics.reduce((s, sub) => s + sub.videos.length, 0);
      return `<button class="yt-chip" data-topic-id="${t.id}">${t.icon} ${t.name} (${count})</button>`;
    }).join('');
    els.chipsBar.innerHTML = `<button class="yt-chip active" data-topic-id="all">All</button>${chips}`;

    $$('.yt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const tid = chip.dataset.topicId;
        if (tid === 'all') { deselectTopic(); }
        else if (activeTopicId === tid) { deselectTopic(); }
        else { selectTopic(tid); }
      });
    });
  }

  // ===== RENDER SIDEBAR =====
  function renderSidebar() {
    els.sidebarTopics.innerHTML = db.topics.map(t => {
      const count = t.subtopics.reduce((s, sub) => s + sub.videos.length, 0);
      return `<div class="yt-sidebar-topic" data-topic-id="${t.id}">
        <span class="topic-emoji">${t.icon}</span>
        <span>${t.name}</span>
        <span class="topic-count">${count}</span>
      </div>`;
    }).join('');

    $$('.yt-sidebar-topic').forEach(el => {
      el.addEventListener('click', () => {
        const tid = el.dataset.topicId;
        if (activeTopicId === tid) deselectTopic();
        else selectTopic(tid);
        showHome();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  // ===== SELECT / DESELECT TOPIC =====
  function selectTopic(topicId) {
    activeTopicId = topicId;
    activeSubtopicId = null;
    const topic = db.topics.find(t => t.id === topicId);
    if (!topic) return;

    $$('.yt-chip').forEach(c => c.classList.toggle('active', c.dataset.topicId === topicId));
    $$('.yt-sidebar-topic').forEach(c => c.classList.toggle('active', c.dataset.topicId === topicId));

    els.subtopicChips.style.display = 'flex';
    els.subtopicChips.innerHTML = `<button class="yt-chip active" data-sub-id="all">All ${topic.name}</button>` +
      topic.subtopics.map(s => `<button class="yt-chip" data-sub-id="${s.id}">${s.name}</button>`).join('');

    $$('.yt-subchips .yt-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const sid = chip.dataset.subId;
        if (sid === 'all') activeSubtopicId = null;
        else activeSubtopicId = sid;
        $$('.yt-subchips .yt-chip').forEach(c => c.classList.toggle('active', c.dataset.subId === sid));
        applyFilters();
      });
    });

    applyFilters();
  }

  function deselectTopic() {
    activeTopicId = null;
    activeSubtopicId = null;
    $$('.yt-chip').forEach(c => c.classList.toggle('active', c.dataset.topicId === 'all'));
    $$('.yt-sidebar-topic').forEach(c => c.classList.remove('active'));
    els.subtopicChips.style.display = 'none';
    applyFilters();
  }

  // ===== FILTERS =====
  function applyFilters() {
    const q = els.searchInput.value.toLowerCase().trim();
    filteredVideos = allVideos.filter(v => {
      if (activeTopicId && v.topicId !== activeTopicId) return false;
      if (activeSubtopicId && v.subtopicId !== activeSubtopicId) return false;
      if (q) {
        const s = [v.title, v.titleAr, v.speaker, v.topicName, v.topicNameAr, v.subtopicName, v.subtopicNameAr, ...(v.tags || [])].join(' ').toLowerCase();
        return s.includes(q);
      }
      return true;
    });
    renderGrid(true);
  }

  // ===== RENDER GRID =====
  function renderGrid(reset) {
    if (reset) { displayedCount = 0; els.videoGrid.innerHTML = ''; }
    const slice = filteredVideos.slice(displayedCount, displayedCount + PAGE_SIZE);
    const frag = document.createDocumentFragment();
    slice.forEach((v, i) => frag.appendChild(createCard(v, displayedCount + i)));
    els.videoGrid.appendChild(frag);
    displayedCount += slice.length;
    els.noResults.style.display = filteredVideos.length === 0 ? 'block' : 'none';
    els.loadMore.style.display = displayedCount < filteredVideos.length ? 'block' : 'none';
  }

  // ===== CREATE VIDEO CARD (YouTube-style) =====
  function createCard(v) {
    const diff = DIFF[v.difficulty] || DIFF[1];
    const dur = fmtDur(v.duration);
    const isBm = bookmarks.some(b => b.id === v.id && b.topicId === v.topicId);
    const thumb = `https://img.youtube.com/vi/${v.id}/mqdefault.jpg`;
    const initial = (v.speaker || '?')[0].toUpperCase();

    const card = document.createElement('div');
    card.className = 'yt-card';
    card.innerHTML = `
      <div class="yt-card-thumb">
        <img src="${thumb}" alt="" loading="lazy">
        <span class="yt-card-duration">${dur}</span>
        <span class="yt-card-difficulty" style="background:${diff.color}">${diff.label}</span>
        <button class="yt-card-bookmark ${isBm ? 'bookmarked' : ''}" data-id="${v.id}" data-topic="${v.topicId}">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
        </button>
      </div>
      <div class="yt-card-info">
        <div class="yt-card-avatar">${initial}</div>
        <div class="yt-card-text">
          <div class="yt-card-title">${esc(v.title)}</div>
          <div class="yt-card-channel">${esc(v.speaker)}</div>
          <div class="yt-card-meta">${LANG[v.language] || v.language}</div>
          ${(v.tags||[]).length ? `<div class="yt-card-tags">${v.tags.slice(0,3).map(t=>`<span class="yt-card-tag">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      </div>`;

    card.querySelector('.yt-card-thumb').addEventListener('click', e => {
      if (e.target.closest('.yt-card-bookmark')) return;
      openModal(v);
    });

    card.querySelector('.yt-card-bookmark').addEventListener('click', e => {
      e.stopPropagation();
      toggleBookmark(v);
      e.currentTarget.classList.toggle('bookmarked');
    });

    return card;
  }

  // ===== MODAL =====
  function openModal(v) {
    currentModalVideo = v;
    els.modalTitle.textContent = v.title;
    els.modalSpeaker.textContent = v.speaker;
    const d = DIFF[v.difficulty] || DIFF[1];
    els.modalDifficulty.textContent = d.label;
    els.modalDifficulty.style.color = d.color;
    els.modalLanguage.textContent = LANG[v.language] || v.language;
    els.modalDuration.textContent = fmtDur(v.duration);
    els.modalTags.innerHTML = (v.tags||[]).map(t => `<span class="yt-card-tag">${esc(t)}</span>`).join('');
    els.modalPlayer.innerHTML = `<iframe src="https://www.youtube.com/embed/${v.id}?autoplay=1&rel=0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;

    const isBm = bookmarks.some(b => b.id === v.id && b.topicId === v.topicId);
    els.modalBookmark.classList.toggle('bookmarked', isBm);
    els.modalBookmark.querySelector('span').textContent = isBm ? 'Saved' : 'Save';

    const related = allVideos.filter(rv => rv.topicId === v.topicId && rv.id !== v.id).slice(0, 8);
    els.modalRelated.innerHTML = related.map(rv => `
      <div class="yt-related-item" data-vid="${rv.id}" data-tid="${rv.topicId}">
        <div class="yt-related-thumb"><img src="https://img.youtube.com/vi/${rv.id}/default.jpg" alt="" loading="lazy"></div>
        <div class="yt-related-info">
          <div class="yt-related-title">${esc(rv.title)}</div>
          <div class="yt-related-channel">${esc(rv.speaker)}</div>
        </div>
      </div>`).join('');

    $$('.yt-related-item').forEach(el => {
      el.addEventListener('click', () => {
        const vid = allVideos.find(v => v.id === el.dataset.vid && v.topicId === el.dataset.tid);
        if (vid) openModal(vid);
      });
    });

    els.videoModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    els.videoModal.style.display = 'none';
    els.modalPlayer.innerHTML = '';
    document.body.style.overflow = '';
    currentModalVideo = null;
  }
  window.closeModal = closeModal;

  // ===== BOOKMARKS =====
  function toggleBookmark(v) {
    const idx = bookmarks.findIndex(b => b.id === v.id && b.topicId === v.topicId);
    if (idx >= 0) bookmarks.splice(idx, 1);
    else bookmarks.push({ id: v.id, topicId: v.topicId, title: v.title, speaker: v.speaker, ts: Date.now() });
    localStorage.setItem('ym_bookmarks', JSON.stringify(bookmarks));
  }

  window.toggleBookmarkFromModal = function () {
    if (!currentModalVideo) return;
    toggleBookmark(currentModalVideo);
    const isBm = bookmarks.some(b => b.id === currentModalVideo.id && b.topicId === currentModalVideo.topicId);
    els.modalBookmark.classList.toggle('bookmarked', isBm);
    els.modalBookmark.querySelector('span').textContent = isBm ? 'Saved' : 'Save';
    const btn = document.querySelector(`.yt-card-bookmark[data-id="${currentModalVideo.id}"]`);
    if (btn) btn.classList.toggle('bookmarked', isBm);
  };

  function renderBookmarks() {
    if (!bookmarks.length) {
      els.bookmarksGrid.innerHTML = '';
      els.noBookmarks.style.display = 'block';
      els.bookmarkCount.textContent = '';
      return;
    }
    els.noBookmarks.style.display = 'none';
    els.bookmarkCount.textContent = `${bookmarks.length} video${bookmarks.length !== 1 ? 's' : ''}`;
    const vids = bookmarks.map(b => allVideos.find(v => v.id === b.id && v.topicId === b.topicId)).filter(Boolean);
    els.bookmarksGrid.innerHTML = '';
    vids.forEach(v => els.bookmarksGrid.appendChild(createCard(v)));
  }

  // ===== RANDOM =====
  window.randomVideo = function () {
    if (!allVideos.length) return;
    openModal(allVideos[Math.floor(Math.random() * allVideos.length)]);
  };

  // ===== VIEWS =====
  window.showHome = function () {
    els.homeView.style.display = '';
    els.bookmarksView.style.display = 'none';
    $$('.yt-sidebar-item').forEach(i => i.classList.toggle('active', i.dataset.view === 'home'));
  };

  window.showBookmarks = function () {
    els.homeView.style.display = 'none';
    els.bookmarksView.style.display = '';
    $$('.yt-sidebar-item').forEach(i => i.classList.toggle('active', i.dataset.view === 'bookmarks'));
    renderBookmarks();
  };

  // ===== THEME =====
  function loadTheme() {
    const t = localStorage.getItem('ym_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
    updateThemeIcon(t);
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute('data-theme');
    const next = cur === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('ym_theme', next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    els.themeIconDark.style.display = theme === 'dark' ? '' : 'none';
    els.themeIconLight.style.display = theme === 'light' ? '' : 'none';
  }

  // ===== HELPERS =====
  function fmtDur(s) {
    if (!s) return '';
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
  }

  function esc(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ===== EVENTS =====
  function bindEvents() {
    let timer;
    els.searchInput.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(applyFilters, 200);
    });
    els.searchBtn.addEventListener('click', applyFilters);
    els.searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); applyFilters(); } });

    els.sidebarToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));
    els.themeToggle.addEventListener('click', toggleTheme);
    els.randomBtn.addEventListener('click', window.randomVideo);
    els.loadMoreBtn.addEventListener('click', () => renderGrid(false));

    els.bookmarksBtn.addEventListener('click', () => {
      if (els.bookmarksView.style.display === 'none' || !els.bookmarksView.style.display) showBookmarks();
      else showHome();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && document.activeElement !== els.searchInput) {
        e.preventDefault(); els.searchInput.focus();
      }
    });

    // Close sidebar on outside click (mobile)
    document.addEventListener('click', e => {
      if (window.innerWidth <= 1024 && els.sidebar.classList.contains('open') &&
          !els.sidebar.contains(e.target) && !els.sidebarToggle.contains(e.target)) {
        els.sidebar.classList.remove('open');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
