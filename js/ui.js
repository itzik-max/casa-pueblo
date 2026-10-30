/* Shared UI helpers: state, formatting, icons, modal, toast, tooltip. */

const STORE_KEY = 'casa-portal-demo-v8';
const LIVE_SESSION_KEY = 'casa-live-session';

const Store = {
  data: null,
  session: null,
  live: false,
  load() {
    if (this.live) {
      // Data comes from the database (Live.open). Only view preferences stay in the browser.
      try { this.session = JSON.parse(localStorage.getItem(LIVE_SESSION_KEY) || 'null'); } catch (e) { this.session = null; }
      return;
    }
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        this.data = saved.data;
        this.session = saved.session || null;
        return;
      }
    } catch (e) { /* storage unavailable: fall back to seed */ }
    this.data = seedData();
  },
  save() {
    if (this.live) {
      try { localStorage.setItem(LIVE_SESSION_KEY, JSON.stringify(this.session)); } catch (e) { /* ignore */ }
      Live.queueSave();
      return;
    }
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ data: this.data, session: this.session })); } catch (e) { /* ignore */ }
  },
  reset() {
    this.data = seedData();
    this.save();
  },
  log(what, who) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const when = `${TODAY} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
    this.data.audit.unshift({ when, who: (this.live ? '' : who) || currentUserName(), what });
  },
  notify(text, link) {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    this.data.notifications.unshift({ id: 'n' + Date.now(), text, when: `${TODAY} ${pad(now.getHours())}:${pad(now.getMinutes())}`, read: false, link });
  },
};

// Permission levels (Itzik's permissions questionnaire, 29.10.2026). Enforced again in the database (save_project, RLS).
// Jorge only: new project, project details, payments, changes, invitations, team, deleting documents, internal documents, sending the weekly summary.
function isJorge() {
  if (Store.live) return !!(Live.user && Live.user.admin);
  return !!(Store.session && Store.session.role === 'staff');
}
// The team, or the family's own designer in her project: plan execution status, timeline, writing the weekly summary.
function isProjectStaff() {
  if (Store.live) return !!(Live.user && (Live.user.staff || Live.isDesigner(Store.data && Store.data.project.id)));
  return !!(Store.session && Store.session.role === 'staff');
}
function canApprovePlans() { return isProjectStaff(); }
// Who is shown as the uploader of a plan or a photo.
function uploaderName(role = 'architect') {
  if (Store.live || !App.isStaffView()) return currentUserName();
  return TEAM[role].name;
}

function currentUserName() {
  if (Store.live && Live.user) return Live.user.name;
  return Store.session && Store.session.role === 'staff' ? TEAM.pm.name : 'אורי אברהמי';
}

/* ---------- formatting ---------- */
const nf = new Intl.NumberFormat('he-IL');
function ils(n) {
  const neg = n < 0;
  return (neg ? '-' : '') + '₪' + nf.format(Math.round(Math.abs(n)));
}
function ilsShort(n) {
  const a = Math.abs(n);
  if (a >= 1e6) return '₪' + (n / 1e6).toFixed(a >= 1e7 ? 0 : 2).replace(/\.?0+$/, '') + 'M';
  if (a >= 1e3) return '₪' + Math.round(n / 1e3) + 'K';
  return '₪' + Math.round(n);
}
function pct(n, d = 1) { return (Math.round(n * Math.pow(10, d)) / Math.pow(10, d)).toFixed(d).replace(/\.0$/, '') + '%'; }
function parseDate(s) { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return new Date(y, m - 1, d); }
function fmtDate(s) {
  if (!s) return '—';
  const d = parseDate(s);
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}
function fmtDateShort(s) {
  if (!s) return '—';
  const d = parseDate(s);
  return `${d.getDate()}.${d.getMonth() + 1}`;
}
const HEB_MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HEB_MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יוני', 'יולי', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳'];
function fmtDateLong(s) { const d = parseDate(s); return `${d.getDate()} ב${HEB_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
function daysBetween(a, b) { return Math.round((parseDate(b) - parseDate(a)) / 86400000); }
function fmtWhen(s) { const [d, t] = s.split(' '); return `${fmtDate(d)}${t ? ' · ' + t : ''}`; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function initials(name) { return name.split(' ').map((p) => p[0]).slice(0, 2).join(''); }

/* ---------- icons (inline SVG, stroke-based) ---------- */
const ICON_PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-6h4v6"/>',
  project: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v5"/>',
  plans: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  materials: '<path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/><path d="m3 16.5 9 4.5 9-4.5"/>',
  timeline: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/><path d="M7 13h4M7 17h7"/>',
  photos: '<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="8.5" cy="10.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  finance: '<rect x="2.5" y="6" width="19" height="13" rx="2"/><path d="M2.5 10h19"/><path d="M6 15h4"/>',
  documents: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  pros: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  service: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  tasks: '<rect x="4" y="3.5" width="16" height="17.5" rx="2"/><path d="M9 3.5V2h6v1.5"/><path d="m8.5 12 2.2 2.2L15.5 9.5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  pin: '<path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  phone: '<path d="M5 3.5h3.5l2 5-2.5 1.5a11 11 0 0 0 6 6l1.5-2.5 5 2V19a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  whatsapp: '<path d="M4 20l1.3-3.9A8 8 0 1 1 8 19z"/><path d="M9 9.5c.3 2.3 2.2 4.4 4.5 5l1.3-1.3 2 1-.4 1.6c-3.8.4-8-3.6-7.6-7.6L10.4 8l1 2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17.5v.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  chevron: '<path d="m15 18-6-6 6-6"/>',
  back: '<path d="m9 18 6-6-6-6"/>',
  logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5M5 12h11"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  send: '<path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  building: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M9 7h1M14 7h1M9 11h1M14 11h1M9 15h1M14 15h1M10 21v-3h4v3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  shield: '<path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  layers: '<path d="M12 3 3 7.5 12 12l9-4.5z"/><path d="m3 12 9 4.5 9-4.5"/>',
  receipt: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M21 20H3"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>',
sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',  layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>',  sidebar: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',  arrowNext: '<path d="M19 12H5M11 6l-6 6 6 6"/>',  arrowPrev: '<path d="M5 12h14M13 6l6 6-6 6"/>',
};
function icon(name, cls = '') {
  return `<svg class="i ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
}

/* ---------- status language (spec §23) ---------- */
const STATUS = {
  // timeline
  done: ['green', 'הסתיים'], active: ['blue', 'בביצוע'], delay: ['red', 'עיכוב'], future: ['gray', 'לא התחיל'],
  // plans
  pending: ['red', 'ממתין לאישורך'], approved: ['green', 'מאושר'], new: ['yellow', 'חדש לעיון'], rejected: ['red', 'נדחה – בתיקון'],
};
const MATERIAL_STATUS = {
  'ממתין לבחירה': 'red', 'נבחר': 'yellow', 'נמדד': 'yellow', 'הוזמן': 'blue', 'בייצור': 'blue', 'בביצוע': 'blue', 'סופק': 'green', 'הותקן': 'green',
};
function pill(level, text) { return `<span class="pill ${level}">${esc(text)}</span>`; }
function statusPill(key) { const s = STATUS[key] || ['gray', key]; return pill(s[0], s[1]); }
function matPill(st) { return pill(MATERIAL_STATUS[st] || 'gray', st); }

/* ---------- modal ---------- */
let modalStack = [];
function openModal({ title, body, foot = '', wide = false, cls = '', onOpen }) {
  const root = document.getElementById('modal-root');
  const el = document.createElement('div');
  el.className = 'overlay';
  el.innerHTML = `
    <div class="modal ${wide ? 'wide' : ''} ${cls}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="modal-head">
        <h2>${esc(title)}</h2>
        <button class="icon-btn" data-close aria-label="סגירה">${icon('close')}</button>
      </div>
      <div class="modal-body">${body}</div>
      ${foot ? `<div class="modal-foot">${foot}</div>` : ''}
    </div>`;
  el.addEventListener('click', (e) => {
    if (e.target === el || e.target.closest('[data-close]')) closeModal();
  });
  root.appendChild(el);
  modalStack.push(el);
  document.body.style.overflow = 'hidden';
  const first = el.querySelector('input, select, textarea, button:not([data-close])');
  if (first && window.matchMedia('(min-width: 700px)').matches) first.focus();
  if (onOpen) onOpen(el);
  return el;
}
function closeModal() {
  const el = modalStack.pop();
  if (el) el.remove();
  if (!modalStack.length) document.body.style.overflow = '';
}
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modalStack.length) closeModal(); });

function toast(msg) {
  const root = document.getElementById('toast-root');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `${icon('check')}<span>${esc(msg)}</span>`;
  root.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- tooltip (charts) ---------- */
const Tip = {
  el: null,
  show(html, x, y) {
    if (!this.el) { this.el = document.createElement('div'); this.el.className = 'tip'; document.body.appendChild(this.el); }
    this.el.innerHTML = html;
    this.el.classList.add('on');
    const r = this.el.getBoundingClientRect();
    let left = x - r.width / 2;
    left = Math.max(8, Math.min(window.innerWidth - r.width - 8, left));
    let top = y - r.height - 14;
    if (top < 8) top = y + 18;
    this.el.style.left = left + 'px';
    this.el.style.top = top + 'px';
  },
  hide() { if (this.el) this.el.classList.remove('on'); },
};
function bindTips(root) {
  root.querySelectorAll('[data-tip]').forEach((el) => {
    const html = el.getAttribute('data-tip');
    const move = (e) => {
      const p = e.touches ? e.touches[0] : e;
      Tip.show(html, p.clientX, p.clientY);
    };
    el.addEventListener('mousemove', move);
    el.addEventListener('mouseenter', move);
    el.addEventListener('mouseleave', () => Tip.hide());
    el.addEventListener('touchstart', move, { passive: true });
    el.addEventListener('touchend', () => setTimeout(() => Tip.hide(), 1400));
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); Tip.show(html, r.left + r.width / 2, r.top); });
    el.addEventListener('blur', () => Tip.hide());
  });
}

/* ---------- file icon / plan sketch ---------- */
function fileIco(type) {
  const t = (type || '').toUpperCase();
  const cls = t === 'PDF' ? 'pdf' : t === 'DWG' ? 'dwg' : t === 'XLS' ? 'xls' : ['JPG', 'PNG'].includes(t) ? 'img' : '';
  return `<div class="file-ico ${cls}">${esc(t)}</div>`;
}

// A stylised architectural sheet so the viewer has something to show in the demo.
function planSketch(title, version, seed = 1) {
  const rnd = (i) => { const x = Math.sin(seed * 97 + i * 31) * 10000; return x - Math.floor(x); };
  const sym = [];
  for (let i = 0; i < 14; i++) {
    const x = 70 + rnd(i) * 520, y = 60 + rnd(i + 40) * 300;
    sym.push(`<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="6" fill="none" stroke="#b5562f" stroke-width="1.6"/><path d="M${(x - 4).toFixed(0)} ${y.toFixed(0)}h8" stroke="#b5562f" stroke-width="1.6"/>`);
  }
  return `<svg viewBox="0 0 680 460" role="img" aria-label="${esc(title)}">
    <defs><pattern id="g${seed}" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#e9e2d5" stroke-width="1"/></pattern></defs>
    <rect width="680" height="460" fill="url(#g${seed})"/>
    <g fill="none" stroke="#1e3554" stroke-width="6" stroke-linejoin="round">
      <path d="M50 40H630V380H50Z"/>
      <path d="M50 200H240M300 200H380V40M380 260V380M380 260H630M520 40V150M520 200V260"/>
    </g>
    <g fill="none" stroke="#1e3554" stroke-width="1.5">
      <path d="M240 200a60 60 0 0 1 60-60" stroke-dasharray="4 4"/><path d="M520 150a50 50 0 0 1 50 50" stroke-dasharray="4 4"/>
      <rect x="80" y="70" width="120" height="40"/><rect x="420" y="300" width="160" height="50" rx="4"/><rect x="90" y="250" width="110" height="90" rx="4"/>
    </g>
    ${sym.join('')}
    <g font-family="Assistant, sans-serif" fill="#1e3554" font-size="15" text-anchor="middle">
      <text x="145" y="160">מטבח</text><text x="215" y="300">סלון</text><text x="450" y="110">חדר הורים</text><text x="505" y="235">רחצה</text><text x="580" y="110">ילדים</text>
    </g>
    <g font-family="Assistant, sans-serif">
      <rect x="430" y="396" width="200" height="50" fill="#fffdf9" stroke="#1e3554"/>
      <text x="620" y="416" font-size="12" font-weight="700" fill="#1e3554" text-anchor="end">${esc(title).slice(0, 30)}</text>
      <text x="620" y="434" font-size="11" fill="#545c69" text-anchor="end">CASA PUEBLO · V${version} · 1:50</text>
    </g>
  </svg>`;
}

function demoNote(text) {
  return `<p class="demo-note">${icon('info')}<span>${esc(text)}</span></p>`;
}
