/* App shell: login, navigation, routing, global search. */

const CLIENT_NAV = [
  ['home', 'home', 'ראשי'],
  ['project', 'project', 'הפרויקט שלי'],
  ['plans', 'plans', 'תכניות'],
  ['materials', 'materials', 'חומרים ובחירות'],
  ['timeline', 'timeline', 'לוח זמנים'],
  ['photos', 'photos', 'תמונות'],
  ['finance', 'finance', 'כספים ותשלומים'],
  ['documents', 'documents', 'מסמכים והסכמים'],
  ['pros', 'pros', 'בעלי מקצוע'],
  ['service', 'service', 'שירות ואחריות'],
];
const CLIENT_EXTRA = [['tasks', 'tasks', 'משימות ואישורים'], ['notifications', 'bell', 'התראות']];
const CLIENT_TABS = [['home', 'home', 'ראשי'], ['plans', 'plans', 'תכניות'], ['photos', 'photos', 'תמונות'], ['finance', 'finance', 'כספים']];

const STAFF_NAV = [
  ['bo-home', 'grid', 'כל הפרויקטים'],
  ['bo-project', 'building', 'בית אברהמי'],
  ['bo-new', 'plus', 'פרויקט חדש'],
  ['bo-perms', 'key', 'הרשאות'],
  ['bo-audit', 'history', 'יומן פעילות'],
];

const App = {
  route: { page: 'home', q: {} },

  parse() {
    const h = location.hash.replace(/^#\/?/, '');
    const [page, qs] = h.split('?');
    const q = {};
    new URLSearchParams(qs || '').forEach((v, k) => (q[k] = v));
    return { page: page || '', q };
  },

  go(page, q = {}, replace = false) {
    const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== '' && v != null)).toString();
    const h = `#/${page}${qs ? '?' + qs : ''}`;
    if (location.hash === h) return this.render();
    if (replace) { history.replaceState(null, '', h); this.render(); } else location.hash = h;
  },

  isStaffView() { return Store.session && Store.session.role === 'staff' && Store.session.view !== 'client'; },

  render() {
    Tip.hide();
    const app = document.getElementById('app');
    if (!Store.session) { document.body.className = 'theme-navy'; app.innerHTML = loginView(); mountLogin(app); return; }

    const r = this.parse();
    const staff = this.isStaffView();
    document.body.className = staff ? '' : 'theme-navy';
    const allowed = staff ? STAFF_NAV.map((n) => n[0]) : [...CLIENT_NAV, ...CLIENT_EXTRA].map((n) => n[0]);
    let page = r.page;
    if (!allowed.includes(page) || !Pages[page]) page = staff ? 'bo-home' : 'home';
    this.route = { page, q: r.q };

    const view = Pages[page](r.q);
    document.title = `${view.title} · CASA | הבית שלי`;
    const restoreFocus = document.activeElement && document.activeElement.id;
    app.innerHTML = shellView(page, view, staff);
    const main = app.querySelector('.main');
    view.mount(main);
    bindShell(app);
    bindNavTabs(app, this._lastPage !== page);
    if (this._lastPage !== page) { window.scrollTo(0, 0); this._lastPage = page; }
    else if (restoreFocus && !main.contains(document.activeElement)) {
      const el = document.getElementById(restoreFocus);
      if (el && el.tagName === 'INPUT' && el.type === 'search') { el.focus(); el.setSelectionRange(el.value.length, el.value.length); }
    }
  },
};

/* ---------- login ---------- */
function loginView() {
  return `
  <div class="login">
    <div class="login-visual" role="img" aria-label="פרויקט של קאסה פואבלו">
      <div class="quote"><div class="serif">כל הבית. כל הפרויקט. במקום אחד.</div><p>הבית שלכם, המקצוענות שלנו.</p></div>
    </div>
    <div class="login-panel">
      <form class="login-box" id="login" novalidate>
        ${wordmark('lg')}
        <h1>הבית שלי</h1>
        <p class="lede">כניסה לאזור האישי של הפרויקט שלכם</p>
        <div class="seg" role="group" aria-label="סוג כניסה" style="margin-bottom:14px">
          <button type="button" aria-pressed="true" data-by="email">אימייל</button>
          <button type="button" aria-pressed="false" data-by="phone">טלפון</button>
        </div>
        <label class="field"><span id="lg-lab">אימייל</span><input class="input" id="lg-user" type="email" autocomplete="username" placeholder="name@example.com" dir="ltr"></label>
        <label class="field"><span>סיסמה</span><input class="input" id="lg-pass" type="password" autocomplete="current-password" dir="ltr"></label>
        <div class="split" style="margin:-4px 0 16px">
          <label class="check" style="margin:0"><input type="checkbox" checked><span class="small">לזכור אותי</span></label>
          <button type="button" class="link-btn small" id="lg-forgot">שכחתי סיסמה</button>
        </div>
        <button class="btn btn-primary btn-block" type="submit">כניסה</button>
        <p class="form-hint" id="lg-err" style="color:var(--st-red);margin-top:10px"></p>

        <div class="demo-entries">
          <div class="small muted">אב-טיפוס להדגמה. הכניסה לא דורשת סיסמה:</div>
          <button type="button" class="btn btn-ghost" data-demo="client"><span>כניסה כלקוח</span><span class="tag">משפחת אברהמי</span></button>
          <button type="button" class="btn btn-ghost" data-demo="staff"><span>כניסה כצוות קאסה פואבלו</span><span class="tag">Back Office</span></button>
        </div>
      </form>
    </div>
  </div>`;
}

function mountLogin(app) {
  const user = app.querySelector('#lg-user');
  app.querySelectorAll('[data-by]').forEach((b) => (b.onclick = () => {
    app.querySelectorAll('[data-by]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    const phone = b.dataset.by === 'phone';
    app.querySelector('#lg-lab').textContent = phone ? 'טלפון נייד' : 'אימייל';
    user.type = phone ? 'tel' : 'email';
    user.placeholder = phone ? '050-0000000' : 'name@example.com';
    user.value = '';
    user.focus();
  }));
  app.querySelector('#login').onsubmit = (e) => {
    e.preventDefault();
    if (!user.value.trim() || !app.querySelector('#lg-pass').value) {
      app.querySelector('#lg-err').textContent = 'צריך למלא פרטי כניסה. בהדגמה אפשר להשתמש בכפתורים למטה.';
      return;
    }
    login('client');
  };
  app.querySelectorAll('[data-demo]').forEach((b) => (b.onclick = () => login(b.dataset.demo)));
  app.querySelector('#lg-forgot').onclick = () => openModal({
    title: 'איפוס סיסמה',
    body: `<p class="ink-2" style="margin-top:0">נשלח קישור לאיפוס הסיסמה למייל או לטלפון שרשומים אצלנו.</p>
      <label class="field"><span>אימייל או טלפון</span><input class="input" dir="ltr" id="fp"></label>`,
    foot: `<button class="btn btn-primary" id="fp-send">שליחת קישור</button>`,
    onOpen(el) { el.querySelector('#fp-send').onclick = () => { closeModal(); toast('אם הפרטים רשומים אצלנו, הקישור בדרך אליכם'); }; },
  });
}

function login(role) {
  Store.session = { role, view: role === 'staff' ? 'staff' : 'client' };
  Store.save();
  App.go(role === 'staff' ? 'bo-home' : 'home');
}
function logout() {
  Store.session = null;
  Store.save();
  location.hash = '';
  App.render();
}

/* ---------- shell ---------- */
function navLink([page, ic, label], current, count) {
  return `<a href="#/${page}" ${page === current ? 'aria-current="page"' : ''}>${icon(ic)}<span>${label}</span>${count ? `<span class="count">${count}</span>` : ''}</a>`;
}

// Typographic stand-in for the logo on dark backgrounds (the site PNG has a white background).
function wordmark(size = '') {
  return `<a class="wordmark ${size}" href="#/home" aria-label="Casa Pueblo – הבית שלי"><span class="wm">CAS<em>A</em><small>PUEBLO</small></span><span class="sub">הבית שלי</span></a>`;
}

function navMode() { return (Store.session && Store.session.nav) || 'tabs'; }

// "Previous / next" between client sections, so the tabs can be read in order.
function pager(page) {
  const i = CLIENT_NAV.findIndex((n) => n[0] === page);
  if (i < 0) return '';
  const prev = CLIENT_NAV[i - 1], next = CLIENT_NAV[i + 1];
  return `<nav class="pager" aria-label="מעבר בין אזורים">
    ${prev ? `<a class="prev" href="#/${prev[0]}"><span class="k">${icon('arrowPrev')}הקודם</span><span class="v">${prev[2]}</span></a>` : ''}
    ${next ? `<a class="next" href="#/${next[0]}"><span class="k">הבא${icon('arrowNext')}</span><span class="v">${next[2]}</span></a>` : ''}
  </nav>`;
}

function clientMasthead(page, unread, tasks, staffSession) {
  const items = [...CLIENT_NAV, CLIENT_EXTRA[0]];
  return `
  <header class="masthead">
    <div class="masthead-top">
      ${wordmark()}
      ${staffSession ? '<span class="bo-banner" style="margin-inline-start:12px">תצוגת לקוח</span>' : ''}
      <span class="spacer"></span>
      <button class="icon-btn" id="open-search" aria-label="חיפוש">${icon('search')}</button>
      <a class="icon-btn" href="#/notifications" aria-label="התראות${unread ? `, ${unread} חדשות` : ''}">${icon('bell')}${unread ? `<span class="badge-dot">${unread}</span>` : ''}</a>
      <button class="icon-btn" id="nav-mode" aria-label="תפריט צד במקום טאבים" title="תפריט צד במקום טאבים">${icon('sidebar')}</button>
      ${staffSession ? `<button class="icon-btn" id="switch-view" aria-label="חזרה ל-Back Office" title="חזרה ל-Back Office">${icon('grid')}</button>` : ''}
      <div class="who"><span class="avatar">${initials('אורי אברהמי')}</span><span>אורי אברהמי</span></div>
      <button class="icon-btn" id="logout" aria-label="יציאה">${icon('logout')}</button>
    </div>
    <div class="navtabs-wrap">
      <span class="fade r"></span><span class="fade l"></span>
      <button class="nudge r" data-nudge="1" aria-label="טאבים קודמים">${icon('back')}</button>
      <nav class="navtabs" aria-label="תפריט ראשי">
        ${items.map(([p, ic, l]) => {
          const c = p === 'tasks' ? tasks : 0;
          return `<a href="#/${p}" ${p === page ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`;
        }).join('')}
      </nav>
      <button class="nudge l" data-nudge="-1" aria-label="טאבים נוספים">${icon('chevron')}</button>
    </div>
  </header>`;
}

function bindNavTabs(app, pageChanged) {
  const wrap = app.querySelector('.navtabs-wrap');
  if (!wrap) return;
  const strip = wrap.querySelector('.navtabs');
  const update = () => {
    // RTL: scrollLeft is 0 at the start (right edge) and negative towards the end.
    const max = strip.scrollWidth - strip.clientWidth;
    const pos = Math.abs(strip.scrollLeft);
    wrap.classList.toggle('can-r', pos > 4);
    wrap.classList.toggle('can-l', pos < max - 4);
  };
  strip.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  wrap.querySelectorAll('[data-nudge]').forEach((b) => (b.onclick = () => strip.scrollBy({ left: Number(b.dataset.nudge) * strip.clientWidth * 0.6 })));
  const cur = strip.querySelector('[aria-current="page"]');
  if (cur && pageChanged) {
    const sr = strip.getBoundingClientRect(), cr = cur.getBoundingClientRect();
    strip.scrollLeft += (cr.left + cr.width / 2) - (sr.left + sr.width / 2);
  }
  update();
}

function shellView(page, view, staff) {
  const tasks = openTasksCount();
  const unread = unreadCount();
  const staffSession = Store.session.role === 'staff';
  if (!staff && navMode() === 'tabs') {
    return `
    <div class="shell tabs-mode">
      ${clientMasthead(page, unread, tasks, staffSession)}
      <main class="main" id="main">${view.html}${pager(page)}</main>
      ${resetLink()}
    </div>`;
  }
  const sidebar = staff
    ? `<div class="nav-group">BACK OFFICE</div><nav>${STAFF_NAV.map((n) => navLink(n, page)).join('')}</nav>`
    : `<nav>${CLIENT_NAV.map((n) => navLink(n, page)).join('')}</nav>
       <div class="nav-group">רכיבים רוחביים</div>
       <nav>${navLink(CLIENT_EXTRA[0], page, tasks)}${navLink(CLIENT_EXTRA[1], page, unread)}</nav>`;
  const who = staff ? TEAM.pm.name : 'אורי אברהמי';
  return `
  <div class="shell">
    <aside class="sidebar" aria-label="תפריט ראשי">
      <div class="brand">${staff ? '<img src="assets/img/logo.png" alt="Casa Pueblo"><div class="tagline">CASA | הבית שלי</div>' : wordmark()}</div>
      ${sidebar}
      <div class="side-foot">
        ${!staff ? `<button class="btn btn-sm" style="background:rgba(255,255,255,.08);color:#fff;width:100%;margin-bottom:10px" id="nav-mode">${icon('layout')}תפריט טאבים למעלה</button>` : ''}
        ${staffSession ? `<button class="btn btn-sm" style="background:rgba(255,255,255,.1);color:#fff;width:100%;margin-bottom:10px" id="switch-view">${staff ? 'צפייה כלקוח' : 'חזרה ל-Back Office'}</button>` : ''}
        <button class="btn btn-sm" style="background:transparent;color:#c7d2e0;padding:0" id="reset-demo">איפוס נתוני ההדגמה</button>
      </div>
    </aside>
    <div class="content">
      <header class="topbar">
        ${staff ? '<img class="logo" src="assets/img/logo.png" alt="Casa Pueblo">' : `<span class="logo-wm">${wordmark()}</span>`}
        <span class="page-title">${esc(view.title)}</span>
        ${staff ? '<span class="bo-banner">צוות</span>' : ''}
        ${staffSession && !staff ? '<span class="bo-banner">תצוגת לקוח</span>' : ''}
        <span class="spacer"></span>
        <button class="icon-btn" id="open-search" aria-label="חיפוש">${icon('search')}</button>
        ${staff ? '' : `<a class="icon-btn" href="#/notifications" aria-label="התראות${unread ? `, ${unread} חדשות` : ''}">${icon('bell')}${unread ? `<span class="badge-dot">${unread}</span>` : ''}</a>`}
        <div class="who"><span class="avatar ${staff ? 'navy' : ''}">${initials(who)}</span><span>${esc(who)}</span></div>
        <button class="icon-btn" id="logout" aria-label="יציאה">${icon('logout')}</button>
      </header>
      <main class="main" id="main">${view.html}${staff ? '' : pager(page)}</main>
    </div>
    ${staff ? staffTabbar(page) : clientTabbar(page, tasks)}
  </div>`;
}

function clientTabbar(page, tasks) {
  const inMore = !CLIENT_TABS.some((t) => t[0] === page);
  return `<nav class="tabbar" aria-label="ניווט">
    ${CLIENT_TABS.map(([p, ic, l]) => `<a href="#/${p}" ${p === page ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('')}
    <a href="#" id="open-more" ${inMore ? 'aria-current="page"' : ''}>${icon('more')}<span>עוד</span>${tasks ? `<span class="badge-dot" style="top:4px;left:calc(50% - 22px)">${tasks}</span>` : ''}</a>
  </nav>`;
}
function staffTabbar(page) {
  return `<nav class="tabbar" aria-label="ניווט" style="grid-template-columns:repeat(4,1fr)">
    ${STAFF_NAV.slice(0, 4).map(([p, ic, l]) => `<a href="#/${p}" ${p === page ? 'aria-current="page"' : ''}>${icon(ic)}<span>${l}</span></a>`).join('')}
  </nav>`;
}

function resetLink() {
  return `<footer class="site-foot"><span>CASA PUEBLO · הבית שלכם, המקצוענות שלנו.</span><button class="link-btn" id="reset-demo">איפוס נתוני ההדגמה</button></footer>`;
}

function bindShell(app) {
  app.querySelector('#logout').onclick = logout;
  app.querySelector('#open-search').onclick = openSearch;
  const nm = app.querySelector('#nav-mode');
  if (nm) nm.onclick = () => {
    Store.session.nav = navMode() === 'tabs' ? 'side' : 'tabs';
    Store.save();
    App.render();
  };
  const more = app.querySelector('#open-more');
  if (more) more.onclick = (e) => { e.preventDefault(); openMore(); };
  const sw = app.querySelector('#switch-view');
  if (sw) sw.onclick = () => {
    Store.session.view = App.isStaffView() ? 'client' : 'staff';
    Store.save();
    App.go(Store.session.view === 'staff' ? 'bo-project' : 'home');
  };
  app.querySelector('#reset-demo').onclick = () => {
    if (!confirm('לאפס את כל השינויים שנעשו בהדגמה?')) return;
    Store.reset();
    toast('נתוני ההדגמה אופסו');
    App.render();
  };
}

function openMore() {
  const tasks = openTasksCount();
  const unread = unreadCount();
  const items = [...CLIENT_NAV.filter((n) => !CLIENT_TABS.some((t) => t[0] === n[0])), ...CLIENT_EXTRA];
  const staffSession = Store.session.role === 'staff';
  openModal({
    title: 'כל האזורים',
    body: `<div class="more-sheet">
      ${items.map(([p, ic, l]) => {
        const c = p === 'tasks' ? tasks : p === 'notifications' ? unread : 0;
        return `<a href="#/${p}" data-close>${icon(ic)}<span>${l}</span>${c ? `<span class="count">${c}</span>` : ''}</a>`;
      }).join('')}
    </div>
    <hr class="sep">
    ${staffSession ? `<button class="btn btn-ghost btn-block" id="mv-staff" style="margin-bottom:8px">חזרה ל-Back Office</button>` : ''}
    <button class="btn btn-quiet btn-block" id="mv-reset">איפוס נתוני ההדגמה</button>`,
    onOpen(el) {
      el.querySelectorAll('.more-sheet a').forEach((a) => a.addEventListener('click', () => closeModal()));
      const s = el.querySelector('#mv-staff');
      if (s) s.onclick = () => { closeModal(); Store.session.view = 'staff'; Store.save(); App.go('bo-project'); };
      el.querySelector('#mv-reset').onclick = () => { if (confirm('לאפס את כל השינויים שנעשו בהדגמה?')) { Store.reset(); closeModal(); toast('נתוני ההדגמה אופסו'); App.render(); } };
    },
  });
}

/* ---------- search ---------- */
function openSearch() {
  openModal({
    title: 'חיפוש',
    body: `<input class="input" type="search" id="gs" placeholder="תכנית, חומר, מסמך, בעל מקצוע…" autocomplete="off"><div class="search-results" id="gs-res"><p class="small muted">נסו למשל: חשמל, Porcelanosa, חשבונית, נגר</p></div>`,
    onOpen(el) {
      const inp = el.querySelector('#gs');
      setTimeout(() => inp.focus(), 50);
      inp.oninput = () => (el.querySelector('#gs-res').innerHTML = searchResults(inp.value.trim()));
      el.querySelector('#gs-res').addEventListener('click', (e) => { if (e.target.closest('a')) closeModal(); });
    },
  });
}
function searchResults(term) {
  if (term.length < 2) return '<p class="small muted">הקלידו לפחות 2 תווים</p>';
  const d = Store.data;
  const t = term.toLowerCase();
  const hit = (...xs) => xs.filter(Boolean).join(' ').toLowerCase().includes(t);
  const mark = (s) => esc(s).replace(new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), (m) => `<mark>${m}</mark>`);
  const staff = App.isStaffView();
  const pre = staff ? '' : '';
  const groups = [
    ['תכניות', 'plans', d.plans.filter((p) => hit(p.title, p.cat)).map((p) => [`plans?id=${p.id}`, `${p.title} · V${p.versions[0].v}`])],
    ['חומרים ובחירות', 'materials', d.materials.filter((m) => hit(m.name, m.maker, m.model, m.color, m.space, m.supplier, m.sku)).map((m) => [`materials?id=${m.id}`, `${m.name} · ${m.space}${m.maker ? ' · ' + m.maker : ''}`])],
    ['מסמכים', 'documents', d.documents.filter((x) => hit(x.title, x.cat)).map((x) => [`documents?cat=${encodeURIComponent(x.cat)}`, x.title])],
    ['בעלי מקצוע', 'pros', d.pros.filter((p) => hit(p.name, p.company, p.cat)).map((p) => [`pros?q=${encodeURIComponent(p.cat)}`, `${p.cat} · ${p.name} · ${p.company}`])],
    ['הוצאות', 'finance', d.expenses.filter((e) => hit(e.item, e.supplier, e.cat, e.maker)).map((e) => [`finance?tab=expenses&cat=${encodeURIComponent(e.cat)}`, `${e.supplier} · ${e.item} · ${ils(e.total)}`])],
    ['יומן הפרויקט', 'photos', d.updates.filter((u) => hit(u.title, u.desc, u.stage)).map((u) => [`photos?stage=${encodeURIComponent(u.stage)}`, u.title])],
  ].filter((g) => g[2].length);
  if (!groups.length) return `<div class="empty">לא נמצאו תוצאות עבור "${esc(term)}"</div>`;
  if (staff) return `<p class="small muted">החיפוש מציג את נתוני בית אברהמי. כדי לפתוח תוצאה עוברים לתצוגת לקוח.</p>` + groups.map(([g, ic, items]) => `<div class="grp">${g}</div>${items.slice(0, 6).map(([, label]) => `<a href="#">${icon(ic)}<span>${mark(label)}</span></a>`).join('')}`).join('');
  return groups.map(([g, ic, items]) => `<div class="grp">${g}</div>${items.slice(0, 6).map(([href, label]) => `<a href="#/${pre}${href}">${icon(ic)}<span>${mark(label)}</span></a>`).join('')}`).join('');
}

/* ---------- boot ---------- */
Store.load();
// ?as=client / ?as=staff opens the demo straight in that role (handy for presentations).
(() => {
  const as = new URLSearchParams(location.search).get('as');
  const nav = new URLSearchParams(location.search).get('nav');
  if (as === 'client' || as === 'staff') { Store.session = { role: as, view: as, nav: nav === 'side' ? 'side' : 'tabs' }; Store.save(); }
})();
window.addEventListener('hashchange', () => { closeAllModals(); App.render(); });
function closeAllModals() { while (modalStack.length) closeModal(); }
App.render();
