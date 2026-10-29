/* Client-facing pages. Each page returns { title, html, mount(root) }. */

const Pages = {};

/* ---------- shared actions ---------- */

function openTasksCount() { return Store.data.tasks.filter((t) => !t.done).length; }
function unreadCount() { return Store.data.notifications.filter((n) => !n.read).length; }

function completeTaskFor(ref) {
  Store.data.tasks.forEach((t) => { if (t.ref && t.ref.id === ref) t.done = true; });
}

function approvePlanFlow(planId) {
  const d = Store.data;
  const plan = d.plans.find((p) => p.id === planId);
  const v = plan.versions[0];
  openModal({
    title: `אישור ${plan.title}`,
    body: `
      <p class="ink-2" style="margin-top:0">את/ה מאשר/ת את <b>גרסה V${v.v}</b> מתאריך ${fmtDate(v.date)}. לאחר האישור התכנית תועבר לביצוע, והאישור יישמר ביומן הפעילות.</p>
      ${v.note ? `<div class="tl-note">מה השתנה בגרסה: ${esc(v.note)}</div>` : ''}
      <label class="field" style="margin-top:14px"><span>הערה (לא חובה)</span>
        <textarea class="input" id="ap-note" placeholder="למשל: מאשרים, בתנאי שהשקע ליד המיטה יוזז 20 ס״מ"></textarea></label>`,
    foot: `<button class="btn btn-primary" id="ap-yes">${icon('check')}מאשר/ת את V${v.v}</button>
           <button class="btn btn-ghost" id="ap-fix">מבקש/ת תיקונים</button>`,
    onOpen(el) {
      el.querySelector('#ap-yes').onclick = () => {
        plan.status = 'approved';
        completeTaskFor(plan.id);
        const note = el.querySelector('#ap-note').value.trim();
        Store.log(`אישר את ${plan.title} V${v.v}${note ? ` (הערה: ${note})` : ''}`);
        Store.save();
        closeModal();
        toast(`תכנית ${plan.cat} V${v.v} אושרה`);
        App.render();
      };
      el.querySelector('#ap-fix').onclick = () => {
        const note = el.querySelector('#ap-note').value.trim();
        if (!note) { el.querySelector('#ap-note').focus(); el.querySelector('#ap-note').placeholder = 'כתבו מה צריך לתקן, כדי שדנה תוכל לטפל'; return; }
        plan.status = 'rejected';
        completeTaskFor(plan.id);
        Store.log(`ביקש תיקונים ב-${plan.title} V${v.v}: ${note}`);
        Store.save();
        closeModal();
        toast('הבקשה נשלחה לצוות התכנון');
        App.render();
      };
    },
  });
}

function approveChangeFlow(changeId) {
  const c = Store.data.changes.find((x) => x.id === changeId);
  openModal({
    title: `שינוי #${c.no}: ${c.title}`,
    body: `
      <dl class="kv">
        <dt>תוספת לחוזה</dt><dd class="num">${ils(c.amount)}</dd>
        <dt>תאריך בקשה</dt><dd>${fmtDate(c.date)}</dd>
        <dt>השפעה על לו״ז</dt><dd>ללא שינוי במועד המסירה</dd>
      </dl>
      <p class="ink-2">אחרי האישור, השינוי יתווסף להסכם, ייכנס לתקציב בקטגוריית "ביצוע ושיפוץ" ויועבר לביצוע.</p>`,
    foot: `<button class="btn btn-primary" id="ch-yes">${icon('check')}מאשר/ת את השינוי</button><button class="btn btn-ghost" data-close>לא עכשיו</button>`,
    onOpen(el) {
      el.querySelector('#ch-yes').onclick = () => {
        c.status = 'approved';
        completeTaskFor(c.id);
        const contract = Store.data.expenses.find((e) => e.casa);
        contract.total += c.amount;
        Store.data.casaMilestones[Store.data.casaMilestones.length - 1].amount += c.amount;
        Store.log(`אישר את שינוי #${c.no} – ${c.title} (${ils(c.amount)})`);
        Store.notify(`התוספת שאישרת (${c.title}) הועברה לביצוע`, 'documents');
        Store.save();
        closeModal();
        toast('השינוי אושר והועבר לביצוע');
        App.render();
      };
    },
  });
}

function openTaskRef(t) {
  if (t.ref.page === 'plans') return t.ref.id === 'pl14' ? openPlan(t.ref.id) : approvePlanFlow(t.ref.id);
  if (t.ref.page === 'change') return approveChangeFlow(t.ref.id);
  if (t.ref.page === 'materials') return openMaterial(t.ref.id);
}

// Full-screen photo viewer with previous / next across a set of photos.
function openLightbox(items, start = 0) {
  let i = start;
  const el = document.createElement('div');
  el.className = 'lightbox';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  const draw = () => {
    const it = items[i];
    el.innerHTML = `
      <div class="lb-top"><span class="t">${esc(it.title || '')}</span><span class="n">${i + 1} / ${items.length}</span>
        <button class="icon-btn" data-x aria-label="סגירה">${icon('close')}</button></div>
      <div class="lb-stage">
        <img src="${esc(media(it.src))}" alt="${esc(it.title || '')}">
        ${items.length > 1 ? `<button class="nav prev" data-step="-1" aria-label="הקודמת">${icon('back')}</button><button class="nav next" data-step="1" aria-label="הבאה">${icon('chevron')}</button>` : ''}
      </div>`;
  };
  const step = (n) => { i = (i + n + items.length) % items.length; draw(); };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') step(1);
    if (e.key === 'ArrowRight') step(-1);
  };
  const close = () => { el.remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  el.addEventListener('click', (e) => {
    const s = e.target.closest('[data-step]');
    if (s) return step(Number(s.dataset.step));
    if (e.target.closest('[data-x]') || e.target.classList.contains('lb-stage')) close();
  });
  let x0 = null;
  el.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  el.addEventListener('touchend', (e) => { if (x0 == null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; });
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  draw();
  document.body.appendChild(el);
}
// All project photos, newest update first, for browsing from the home page.
function projectAlbum() {
  return Store.data.updates.flatMap((u) => u.photos.map((src) => ({ src, title: u.title, sub: fmtDate(u.date) })));
}
function openPhoto(src, caption) { openLightbox([{ src, title: caption || '' }]); }

/* ---------- ראשי ---------- */
function aboutSection() {
  return `
  <section class="about" aria-labelledby="about-h">
    <div class="about-head">
      <div><span class="eyebrow">על קאסה פואבלו</span><h2 id="about-h">${esc(ABOUT.tagline)}</h2></div>
      <p>${esc(ABOUT.intro)}</p>
    </div>
    <div class="about-grid">
      ${ABOUT.tiles.slice(0, 3).map(aboutTile).join('')}
      <div class="about-tile photo">
        <span class="lux"><img src="assets/img/j-33.jpg" alt="סלון בפרויקט של קאסה פואבלו ברמת השרון" loading="lazy"></span>
        <div class="quote">״בית לעם״</div>
      </div>
      ${ABOUT.tiles.slice(3).map(aboutTile).join('')}
    </div>
    <div class="team-block">
      <div class="team-head"><span class="eyebrow">הצוות שלנו</span><h3>${TEAM_NAMES.join(' · ')}</h3><p>האנשים שבונים לכם את הבית, מהשרטוט הראשון ועד המפתח.</p></div>
      <div class="team-photos">
        ${TEAM_PHOTOS.map((src, i) => `<button class="lux" data-team="${i}" aria-label="תמונת צוות"><img src="${src}" alt="צוות קאסה פואבלו" loading="lazy"></button>`).join('')}
      </div>
    </div>
    <div class="about-foot"><span>Casa Pueblo · רח׳ זרחין 7, רעננה</span><a href="https://www.casa-pueblo.co.il" target="_blank" rel="noopener">casa-pueblo.co.il</a></div>
  </section>`;
}
function aboutTile(t) {
  return `<div class="about-tile">
    ${t.big ? `<div class="big">${esc(t.big)}</div>` : `<div class="ic">${icon(t.icon)}</div>`}
    <h3>${esc(t.title)}</h3><p>${esc(t.text)}</p>
  </div>`;
}

Pages.home = () => {
  const d = Store.data;
  const p = d.project;
  const fm = financeModel(d);
  const cm = casaModel(d);
  const tasks = d.tasks.filter((t) => !t.done);
  const daysLeft = daysBetween(TODAY, p.handover);
  const latest = d.updates[0];
  const pm = TEAM[p.pm];
  const delays = d.timeline.filter((s) => s.status === 'delay');
  const active = d.timeline.find((s) => s.status === 'active');
  const nextStage = d.timeline.find((s) => s.status === 'future');
  const gallery = d.updates.filter((u) => u.stage !== 'לפני').flatMap((u) => u.photos.map((src) => ({ src, title: u.title, sub: fmtDate(u.date) }))).slice(0, 5);
  const wk = latestSentSummary(d);
  const sinceUpdate = daysBetween(wk ? wk.week : p.weekly.updated, TODAY);
  return {
    title: 'ראשי',
    html: `
      <section class="lux-hero">
        <div class="bg" style="background-image:url('${esc(media(p.image))}')" role="img" aria-label="${esc(p.name)}"></div>
        <div class="inner">
          <span class="eyebrow">${esc(p.name)} · ${esc(p.address.split(',').pop().trim())}</span>
          <h1>שלום משפחת ${esc(p.family)}</h1>
          <div class="lede">ברוכים הבאים לבית שלכם ב-CASA PUEBLO. כל הבית, כל הפרויקט, במקום אחד.</div>
          <div class="stage-band">
            ${progressRing(p.progress, 74, 4, '#d4b483', 'rgba(242,235,223,.16)')}
            <div>
              <div class="lbl">שלב נוכחי</div>
              <div class="val">${esc(p.stage)}</div>
              <div class="stage-steps" aria-hidden="true">${d.timeline.map((s) => `<i class="${s.status}" title="${esc(s.name)}"></i>`).join('')}</div>
              <div class="stage-names"><span>${esc(d.timeline[0].name)}</span><span>${esc(d.timeline[d.timeline.length - 1].name)}</span></div>
            </div>
          </div>
        </div>
      </section>

      <article class="weekly lift" aria-labelledby="weekly-h">
        <div class="copy">
          <div class="head">
            <span class="eyebrow">העדכון השבועי</span>
            <span class="date">${icon('clock')}עודכן ${fmtDateLong(wk ? wk.week : p.weekly.updated)}${sinceUpdate <= 7 ? ' · חדש' : ''}</span>
          </div>
          <h2 id="weekly-h">כרגע בפרויקט</h2>
          ${wk ? `<div class="wk-cols">
            <div><div class="wk-h">מה עשינו השבוע</div>${bulletList(wk.done)}</div>
            <div><div class="wk-h">מה הלאה</div>${bulletList(wk.next)}</div>
          </div>
          <button class="link-btn small" id="wk-history" style="align-self:flex-start;margin-top:10px">לסיכומים הקודמים</button>` : `<blockquote>${esc(p.weekly.text)}</blockquote>`}
          <div class="highlights">
            ${active ? `<span>בביצוע: <b>${esc(active.name)}</b></span>` : ''}
            ${delays.map((s) => `<span>לתשומת לב: <b>${esc(s.name)}</b></span>`).join('')}
            ${nextStage ? `<span>השלב הבא: <b>${esc(nextStage.name)}</b> · ${fmtDate(nextStage.ps)}</span>` : ''}
          </div>
          <div class="sign">
            <span class="avatar navy lg">${initials(pm.name)}</span>
            <div><b>${esc(pm.name)}</b><span>${esc(pm.role)}</span></div>
            <span class="sig">${esc(pm.name.split(' ')[0])}</span>
          </div>
        </div>
        ${latest && latest.photos.length ? `<button class="lux photo" data-lbhome="0" aria-label="תמונת השבוע">
          <img src="${esc(media(latest.photos[0]))}" alt="" loading="lazy">
          <span class="tag">מהשטח השבוע · ${projectAlbum().length} תמונות</span>
          <span class="cap"><b>${esc(latest.title)}</b>${fmtDate(latest.date)}</span>
        </button>` : ''}
      </article>

      <div class="stat-strip" style="margin-top:34px">
        <div><div class="k">תאריך התחלה</div><div class="v">${fmtDate(p.start)}</div></div>
        <div><div class="k">מסירה משוערת</div><div class="v">${fmtDate(p.handover)}</div></div>
        <div><div class="k">עד המסירה</div><div class="v">${daysLeft} <span style="font-size:.55em">ימים</span></div></div>
        <div><div class="k">מנהל הפרויקט</div><div class="v" style="font-size:22px;margin-top:8px">${esc(pm.name)}</div><div class="s"><a href="tel:${pm.phone}" class="ltr">${pm.phone}</a></div></div>
      </div>

      <div class="grid wide-left" style="margin-top:34px">
        <article class="card card-pad">
          <div class="card-head"><h3>ממתין לכם</h3>${tasks.length ? pill('red', `${tasks.length} פתוחות`) : pill('green', 'הכול מטופל')}</div>
          ${tasks.length ? `<ul class="action-list">
            ${tasks.slice(0, 4).map((t) => `
              <li>
                <span class="ico ${t.level}">${icon(t.type === 'approval' ? 'check' : t.type === 'choice' ? 'materials' : 'info')}</span>
                <div class="txt"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div>
                <button class="btn btn-sm ${t.level === 'red' ? 'btn-primary' : 'btn-ghost'}" data-task="${t.id}">${t.type === 'approval' ? 'לאישור' : 'לצפייה'}</button>
              </li>`).join('')}
          </ul>${tasks.length > 4 ? `<a class="link-btn small" href="#/tasks">לכל המשימות (${tasks.length})</a>` : ''}` : '<div class="empty">אין משימות פתוחות</div>'}
        </article>
        <div class="stack">
          <a class="next-pay" href="#/finance" style="text-decoration:none">
            <span class="k">התשלום הבא לקאסה פואבלו</span>
            <span class="v num">${cm.next ? ils(cm.next.amount) : '—'}</span>
            <span class="d">${cm.next ? `${esc(cm.next.name)} · ${fmtDate(cm.next.due)}` : 'כל התשלומים הוסדרו'}</span>
          </a>
          <article class="card card-pad">
            <div class="card-head"><h3>תקציב הבית</h3><a class="link-btn small" href="#/finance?tab=budget">לפירוט</a></div>
            <div class="split small ink-2" style="margin-bottom:10px"><span>ניצול תקציב</span><b class="num" style="color:var(--ink)">${pct(fm.util)}</b></div>
            ${budgetMeter(fm)}
          </article>
        </div>
      </div>

      <section style="margin-top:64px">
        <div class="section-title"><div><span class="eyebrow">מהשטח</span><h2 style="margin-top:8px">התמונות האחרונות</h2></div><a class="link-btn" href="#/photos">ליומן הפרויקט</a></div>
        <div class="mosaic">${gallery.map((g, i) => `<button class="lux" data-lbg="${i}" aria-label="${esc(g.title)}"><img src="${esc(media(g.src))}" alt="" loading="lazy"><span class="cap"><b>${esc(g.title)}</b>${esc(g.sub)}</span></button>`).join('')}</div>
      </section>

      ${aboutSection()}`,
    mount(root) {
      root.querySelectorAll('[data-task]').forEach((b) => (b.onclick = () => openTaskRef(Store.data.tasks.find((t) => t.id === b.dataset.task))));
      root.querySelectorAll('[data-lbg]').forEach((b) => (b.onclick = () => openLightbox(gallery, Number(b.dataset.lbg))));
      root.querySelectorAll('[data-team]').forEach((b) => (b.onclick = () => openLightbox(TEAM_PHOTOS.map((src) => ({ src, title: 'הצוות של קאסה פואבלו' })), Number(b.dataset.team))));
      const wk = root.querySelector('[data-lbhome]');
      if (wk) wk.onclick = () => openLightbox(projectAlbum(), 0);
      const wh = root.querySelector('#wk-history');
      if (wh) wh.onclick = openWeeklyHistory;
    },
  };
};

/* ---------- הפרויקט שלי ---------- */
Pages.project = () => {
  const d = Store.data;
  const p = d.project;
  const team = Object.values(TEAM);
  return {
    title: 'הפרויקט שלי',
    html: `
      <div class="page-head"><div><h1>הפרויקט שלי</h1><p>${esc(p.name)} · ${esc(p.address)}</p></div></div>
      <div class="grid wide-left">
        <div class="stack">
          <article class="card card-pad">
            <h3 style="margin-bottom:10px">פרטי הפרויקט</h3>
            <dl class="kv">
              <dt>משפחה</dt><dd>${esc(p.family)}</dd>
              <dt>כתובת</dt><dd>${esc(p.address)}</dd>
              <dt>היקף</dt><dd>${esc(p.area)}</dd>
              <dt>שלב נוכחי</dt><dd>${esc(p.stage)} · ${p.progress}%</dd>
              <dt>תאריך התחלה</dt><dd>${fmtDate(p.start)}</dd>
              <dt>מסירה משוערת</dt><dd>${fmtDate(p.handover)}</dd>
            </dl>
            <p class="ink-2" style="margin-bottom:0">${esc(p.scope)}</p>
          </article>
          <article class="card card-pad">
            <div class="card-head"><h3>התקדמות לפי שלבים</h3><a class="link-btn small" href="#/timeline">ללוח הזמנים</a></div>
            <div class="progress dark" style="height:10px"><i style="width:${p.progress}%"></i></div>
            <div class="legend-status" style="margin-top:12px">
              ${d.timeline.map((s) => `<span class="small">${statusPill(s.status).replace(STATUS[s.status][1], esc(s.name))}</span>`).join('')}
            </div>
          </article>
          <article class="card">
            <div class="card-pad" style="padding-bottom:6px"><h3>שינויים ותוספות</h3></div>
            <ul class="rows">
              ${d.changes.map((c) => `
                <li class="row">
                  <div class="main-col"><div class="title">שינוי #${c.no}: ${esc(c.title)}</div><div class="sub">${fmtDate(c.date)} · <span class="num">${ils(c.amount)}</span></div></div>
                  <div class="end">${c.status === 'approved' ? pill('green', 'אושר') : `<button class="btn btn-sm btn-primary" data-change="${c.id}">לאישור</button>`}</div>
                </li>`).join('')}
            </ul>
          </article>
        </div>
        <div class="stack">
          <article class="card card-pad">
            <h3 style="margin-bottom:6px">צוות קאסה פואבלו</h3>
            ${team.map((t) => `
              <div class="pro-card" style="padding:12px 0;border-top:1px solid var(--line)">
                <span class="avatar navy">${initials(t.name)}</span>
                <div class="info"><div class="name">${esc(t.name)}</div><div class="role">${esc(t.role)}</div>
                  <div class="acts">
                    <a class="btn btn-sm btn-ghost" href="tel:${t.phone}">${icon('phone')}<span class="ltr">${t.phone}</span></a>
                    <a class="btn btn-sm btn-ghost" href="mailto:${t.email}" aria-label="מייל">${icon('mail')}</a>
                  </div>
                </div>
              </div>`).join('')}
          </article>
          <article class="card card-pad">
            <h3 style="margin-bottom:6px">בני המשפחה בפורטל</h3>
            ${d.members.map((m) => `
              <div class="split" style="padding:10px 0;border-top:1px solid var(--line)">
                <div style="display:flex;gap:10px;align-items:center"><span class="avatar">${initials(m.name)}</span><div><b>${esc(m.name)}</b><div class="small muted">${esc(m.role)}</div></div></div>
                ${m.status === 'פעיל' ? pill('green', 'פעיל') : pill('yellow', 'הוזמן/ה')}
              </div>`).join('')}
            <p class="small muted" style="margin-bottom:0">לכל בן משפחה פרטי התחברות משלו. כדי להוסיף משתמש, פנו למנהל הפרויקט.</p>
          </article>
        </div>
      </div>`,
    mount(root) {
      root.querySelectorAll('[data-change]').forEach((b) => (b.onclick = () => approveChangeFlow(b.dataset.change)));
    },
  };
};

/* ---------- תכניות ---------- */
// Execution status of a plan: only Jorge (plan approver) sets it.
const EXEC_STATUS = { approved: ['green', 'מאושר לביצוע'], draft: ['gray', 'טיוטה'] };
function execPill(p) { const s = EXEC_STATUS[p.exec || 'draft']; return pill(s[0], s[1]); }
function planCategories(d) { return [...PLAN_CATEGORIES, ...(d.planCategories || []).filter((c) => !PLAN_CATEGORIES.includes(c))]; }

function setPlanExec(plan, exec) {
  plan.exec = exec;
  plan.execBy = currentUserName();
  plan.execAt = TODAY;
  Store.log(`סימן את ${plan.title} V${plan.versions[0].v} כ"${EXEC_STATUS[exec][1]}"`);
  if (exec === 'approved') Store.notify(`${plan.title} אושרה לביצוע`, 'plans');
  Store.save();
}

function openPlan(id, vi = 0) {
  const plan = Store.data.plans.find((p) => p.id === id);
  const v = plan.versions[vi];
  const current = vi === 0;
  const seed = Number(id.replace(/\D/g, '')) || 1;
  Store.log(`צפה ב-${plan.title} V${v.v}`);
  Store.save();
  const approver = canApprovePlans();
  openModal({
    title: `${plan.title} · V${v.v}`,
    wide: true,
    body: `
      <div class="split" style="margin-bottom:12px;flex-wrap:wrap;gap:8px">
        <div class="small ink-2">${esc(plan.cat)} · הועלתה ${fmtDate(v.date)} ע״י ${esc(v.by)} · ${v.file} ${v.size}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${current ? execPill(plan) : pill('gray', 'גרסה קודמת')}${current && plan.status === 'pending' ? statusPill('pending') : ''}</div>
      </div>
      ${current && approver ? `<div class="exec-box">
        <span class="small"><b>סטטוס התכנית</b> (רק חורחה יכול לשנות)</span>
        <div class="seg" role="group" aria-label="סטטוס התכנית">
          <button type="button" data-exec="approved" aria-pressed="${plan.exec === 'approved'}">מאושר לביצוע</button>
          <button type="button" data-exec="draft" aria-pressed="${plan.exec !== 'approved'}">טיוטה</button>
        </div>
        ${plan.execBy ? `<span class="xs muted">עודכן ע״י ${esc(plan.execBy)} · ${fmtDate(plan.execAt)}</span>` : ''}
      </div>` : ''}
      <div class="plan-viewer">${planPreview(v) || planSketch(plan.title, v.v, seed)}</div>
      ${v.note ? `<div class="tl-note">מה השתנה בגרסה: ${esc(v.note)}</div>` : ''}
      <h3 style="margin:18px 0 4px;font-size:15px;color:var(--navy)">היסטוריית גרסאות</h3>
      <p class="small muted" style="margin:0 0 6px">גרסאות קודמות לא נמחקות, ותמיד אפשר לחזור אליהן.</p>
      <ul class="version-list">
        ${plan.versions.map((x, i) => `<li><span class="v">V${x.v}</span><span class="d">${fmtDate(x.date)} · ${esc(x.by)}${x.note ? ` · ${esc(x.note)}` : ''}</span>${i === vi ? pill('blue', i === 0 ? 'נוכחית' : 'מוצגת') : `<button class="btn btn-sm btn-quiet" data-ver="${i}">צפייה</button>`}</li>`).join('')}
      </ul>`,
    foot: `${current && plan.status === 'pending' ? `<button class="btn btn-primary" id="pv-approve">${icon('check')}לאישור התכנית</button>` : ''}
      ${shareButtons()}
      <button class="btn btn-ghost" id="pv-dl">${icon('download')}הורדה</button>`,
    onOpen(el) {
      const a = el.querySelector('#pv-approve');
      if (a) a.onclick = () => { closeModal(); approvePlanFlow(id); };
      el.querySelectorAll('[data-exec]').forEach((b) => (b.onclick = () => {
        setPlanExec(plan, b.dataset.exec);
        closeModal();
        toast(`הסטטוס עודכן: ${EXEC_STATUS[b.dataset.exec][1]}`);
        App.render();
      }));
      bindShare(el, { title: `${plan.title} · גרסה ${v.v}`, ref: v.path, file: v.file });
      el.querySelector('#pv-dl').onclick = () => { if (!openFile(v.path)) toast('בגרסה המלאה יורד כאן קובץ התכנית'); };
      el.querySelectorAll('[data-ver]').forEach((b) => (b.onclick = () => { closeModal(); openPlan(id, +b.dataset.ver); }));
    },
  });
}

// The real file inside the viewer: PDF in a frame, image as is. Other types (DWG, XLS) open with "הורדה".
function planPreview(v) {
  const url = media(v.path);
  if (!url) return '';
  if (/^(PDF)$/i.test(v.file)) return `<iframe src="${esc(url)}" title="תכנית" style="width:100%;height:70vh;border:0;background:#fff"></iframe>`;
  if (/^(JPG|JPEG|PNG|WEBP|GIF)$/i.test(v.file)) return `<img src="${esc(url)}" alt="" style="width:100%;height:auto">`;
  return '';
}

function addPlanCategoryFlow() {
  openModal({
    title: 'קטגוריית תכניות חדשה',
    body: `<label class="field"><span>שם הקטגוריה</span><input class="input" id="pc-name" placeholder="למשל: פיתוח חוץ"></label>`,
    foot: `<button class="btn btn-primary" id="pc-save">${icon('plus')}הוספה</button>`,
    onOpen(el) {
      setTimeout(() => el.querySelector('#pc-name').focus(), 50);
      el.querySelector('#pc-save').onclick = () => {
        const name = el.querySelector('#pc-name').value.trim();
        if (!name) return;
        const d = Store.data;
        if (planCategories(d).includes(name)) return toast('הקטגוריה כבר קיימת');
        d.planCategories = [...(d.planCategories || []), name];
        Store.log(`הוסיף קטגוריית תכניות: ${name}`);
        Store.save();
        closeModal();
        App.go('plans', { cat: name });
      };
    },
  });
}

Pages.plans = (q) => {
  const d = Store.data;
  const cats = planCategories(d);
  const cat = q.cat || 'הכול';
  const inCat = (p) => cat === 'הכול' || p.cat === cat;
  const list = d.plans.filter(inCat)
    .sort((a, b) => (a.exec === 'approved' ? 0 : 1) - (b.exec === 'approved' ? 0 : 1) || b.versions[0].date.localeCompare(a.versions[0].date));
  const older = d.plans.filter(inCat).flatMap((p) => p.versions.slice(1).map((v, i) => ({ p, v, i: i + 1 }))).sort((a, b) => b.v.date.localeCompare(a.v.date));
  const pending = d.plans.filter((p) => p.status === 'pending').length;
  const approver = canApprovePlans();
  return {
    title: 'תכניות',
    html: `
      <div class="page-head"><div><h1>תכניות</h1><p>התכניות העדכניות למעלה, והגרסאות הקודמות מתחת</p></div>
        ${pending ? pill('red', `${pending} ממתינות לאישורכם`) : ''}</div>
      <div class="chips" role="group" aria-label="סינון לפי קטגוריה">
        ${['הכול', ...cats].map((c) => `<button class="chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c === 'הכול' ? 'הכל' : c)}<span class="n">${c === 'הכול' ? d.plans.length : d.plans.filter((p) => p.cat === c).length}</span></button>`).join('')}
        ${approver ? `<button class="chip" id="pc-add">${icon('plus', 'xs')} קטגוריה</button>` : ''}
      </div>
      <div class="card">
        <ul class="rows">
          ${list.map((p) => {
            const v = p.versions[0];
            return `<li class="row clickable ${p.exec === 'approved' ? 'plan-ok' : ''}" data-plan="${p.id}">
              ${fileIco(v.file)}
              <div class="main-col">
                <div class="title">${esc(p.title)}</div>
                <div class="sub">${esc(p.cat)} · גרסה ${v.v} · ${fmtDate(v.date)}</div>
              </div>
              <div class="end">${execPill(p)}${p.status === 'pending' ? statusPill('pending') : ''}
                ${p.status === 'pending' ? `<button class="btn btn-sm btn-primary" data-approve="${p.id}">לאישור</button>` : ''}</div>
            </li>`;
          }).join('') || '<li class="empty">אין תכניות בקטגוריה זו</li>'}
        </ul>
      </div>
      ${older.length ? `<div class="section-title" style="margin-top:26px"><h2>גרסאות קודמות</h2><span class="small muted">${older.length} גרסאות שהוחלפו</span></div>
      <div class="card older-plans"><ul class="rows">
        ${older.map(({ p, v, i }) => `<li class="row clickable compact" data-old="${p.id}" data-i="${i}">
          ${fileIco(v.file)}
          <div class="main-col"><div class="title">${esc(p.title)} · גרסה ${v.v}</div><div class="sub">${esc(p.cat)} · ${fmtDate(v.date)}${v.note ? ` · ${esc(v.note)}` : ''}</div></div>
          <div class="end">${pill('gray', 'הוחלפה')}</div>
        </li>`).join('')}
      </ul></div>` : ''}`,
    mount(root) {
      root.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => App.go('plans', { cat: b.dataset.cat })));
      root.querySelectorAll('[data-plan]').forEach((r) => (r.onclick = (e) => { if (!e.target.closest('[data-approve]')) openPlan(r.dataset.plan); }));
      root.querySelectorAll('[data-old]').forEach((r) => (r.onclick = () => openPlan(r.dataset.old, +r.dataset.i)));
      root.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = () => approvePlanFlow(b.dataset.approve)));
      const add = root.querySelector('#pc-add');
      if (add) add.onclick = addPlanCategoryFlow;
      if (q.id) { history.replaceState(null, '', '#/plans'); openPlan(q.id); }
    },
  };
};

/* ---------- חומרים ובחירות ---------- */
function isDark(hex) {
  const n = parseInt(String(hex || "#dddddd").slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 120;
}
function matVisual(m, cls = 'ph') {
  return m.img ? `<span class="lux ${cls}"><img src="${esc(media(m.img))}" alt="" loading="lazy"></span>` : `<div class="${cls} swatch" style="background-color:${esc(m.swatch || "#ddd")}"><span class="sw-name${isDark(m.swatch) ? " light" : ""}">${esc(m.color || m.name)}</span></div>`;
}
const MAT_FILES = [['order', 'הזמנה', 'מסמכי ספקים'], ['invoice', 'חשבונית', 'חשבוניות']];

function waLink(phone, text = '') {
  const n = String(phone || '').replace(/\D/g, '').replace(/^0/, '');
  return `https://wa.me/972${n}${text ? '?text=' + encodeURIComponent(text) : ''}`;
}

function openMaterial(id) {
  const d = Store.data;
  const m = d.materials.find((x) => x.id === id);
  const exp = d.expenses.find((e) => e.material === id);
  const fields = [
    ['קטגוריה', m.cat], ['חלל', m.space], ['יצרן', m.maker], ['דגם', m.model], ['מק״ט', m.sku], ['גוון', m.color],
    ['ספק', m.supplier], ['מחיר', m.price ? `${ils(m.price)}${m.unit ? ' ל' + m.unit : ''}` : ''],
    ['אחריות', m.warrantyUntil ? `עד ${fmtDate(m.warrantyUntil)}` : m.warranty], ['הערות', m.notes],
  ].filter(([, v]) => v);
  openModal({
    title: m.name,
    body: `
      <div style="border-radius:12px;overflow:hidden;margin-bottom:14px">${matVisual(m, 'ph')}</div>
      <div class="split" style="margin-bottom:6px">${matPill(m.status)}${m.link ? `<a class="link-btn small" href="${esc(m.link)}" target="_blank" rel="noopener">${icon('link', 'xs')} קישור למוצר</a>` : ''}</div>
      <dl class="kv">${fields.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>

      <h3 class="mt-h">איש קשר</h3>
      ${m.contactName || m.contactPhone ? `<div class="contact-row">
        <span class="avatar">${initials(m.contactName || m.supplier || '?')}</span>
        <div class="main-col"><b>${esc(m.contactName || '—')}</b><div class="small ink-2 ltr">${esc(m.contactPhone || '')}</div></div>
        ${m.contactPhone ? `<a class="btn btn-sm btn-ghost" href="tel:${esc(m.contactPhone)}">${icon('phone')}התקשרות</a>
        <a class="btn btn-sm btn-ghost" href="${waLink(m.contactPhone, `שלום, לגבי ${m.name}`)}" target="_blank" rel="noopener">${icon('whatsapp')}וואטסאפ</a>` : ''}
      </div>` : '<p class="small muted">עוד לא הוזן איש קשר. אפשר להוסיף ב"עריכה".</p>'}

      <h3 class="mt-h">הזמנה וחשבונית</h3>
      <ul class="rows mat-files">
        ${MAT_FILES.map(([k, label]) => {
          const f = m[k];
          return `<li class="row compact">${fileIco(f ? f.type : 'PDF')}
            <div class="main-col"><div class="title">${label}</div><div class="sub">${f ? `${esc(f.name)} · ${fmtDate(f.date)}` : 'עוד לא הועלה'}</div></div>
            <div class="end">${f ? `<button class="btn btn-sm btn-ghost" data-fview="${k}">${icon('eye')}צפייה</button>${shareButtons('sm', k)}` : `<button class="btn btn-sm btn-ghost" data-fup="${k}">${icon('upload')}העלאה</button>`}</div>
          </li>`;
        }).join('')}
      </ul>
      ${exp ? `<div class="small muted" style="margin-top:10px">${icon('link', 'xs')} מקושר להוצאה בכספים: ${esc(exp.cat)} · <b class="num">${ils(exp.total)}</b></div>` : ''}
      ${m.status === 'ממתין לבחירה' ? `
        <h3 class="mt-h">האפשרויות שהוצעו</h3>
        <div class="grid sm-2">
          ${['Axor Uno – כרום', 'Axor Uno – ניקל מוברש'].map((o, i) => `<label class="card card-pad check" style="margin:0;box-shadow:none"><input type="radio" name="opt" value="${esc(o)}" ${i === 0 ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
        </div>` : ''}`,
    foot: `${m.status === 'ממתין לבחירה' ? `<button class="btn btn-primary" id="mt-choose">${icon('check')}שמירת הבחירה</button>` : ''}
      <button class="btn btn-ghost" id="mt-edit">${icon('edit')}עריכה</button>`,
    onOpen(el) {
      const b = el.querySelector('#mt-choose');
      if (b) b.onclick = () => {
        const val = el.querySelector('input[name=opt]:checked').value;
        m.status = 'נבחר';
        m.model = val;
        completeTaskFor(m.id);
        Store.log(`בחר ${m.name}: ${val}`);
        Store.save();
        closeModal();
        toast('הבחירה נשמרה');
        App.render();
      };
      el.querySelector('#mt-edit').onclick = () => { closeModal(); materialForm(m); };
      el.querySelectorAll('[data-fview]').forEach((x) => (x.onclick = () => { if (!openFile(m[x.dataset.fview].path)) toast('בגרסה המלאה הקובץ נפתח כאן'); }));
      MAT_FILES.forEach(([k, label]) => { if (m[k]) bindShare(el, { title: `${label} · ${m.name}`, ref: m[k].path, file: m[k].type }, k); });
      el.querySelectorAll('[data-fup]').forEach((x) => (x.onclick = () => { closeModal(); materialForm(m, x.dataset.fup); }));
    },
  });
}

// Add or edit a material. Clients and staff both use it. Order / invoice files also go to "מסמכים".
function materialForm(m = null, focus = '') {
  const d = Store.data;
  const v = m || { name: '', space: SPACES[0], cat: BUDGET_CATEGORIES[0], status: 'נבחר' };
  const inp = (id, label, type = 'text', extra = '') => `<label class="field"><span>${label}</span><input class="input" name="${id}" type="${type}" value="${esc(v[id] || '')}" ${extra}></label>`;
  const sel = (id, label, opts) => `<label class="field"><span>${label}</span><select class="input" name="${id}">${opts.map((o) => `<option ${o === v[id] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  openModal({
    title: m ? `עריכה: ${m.name}` : 'הוספת חומר / מוצר',
    wide: true,
    body: `<form id="mf" class="form-grid two">
      ${inp('name', 'שם הפריט')}${sel('space', 'חלל', SPACES)}
      ${sel('cat', 'קטגוריה', BUDGET_CATEGORIES)}${sel('status', 'סטטוס', Object.keys(MATERIAL_STATUS))}
      ${inp('maker', 'יצרן')}${inp('model', 'דגם')}
      ${inp('color', 'גוון')}${inp('supplier', 'ספק')}
      ${inp('price', 'מחיר (לא חובה)', 'number', 'inputmode="numeric"')}${inp('warrantyUntil', 'אחריות עד (למוצרים שנרכשו)', 'date')}
      <div class="form-sub" style="grid-column:1/-1">איש קשר</div>
      ${inp('contactName', 'שם')}${inp('contactPhone', 'טלפון', 'tel', 'dir="ltr"')}
      <div class="form-sub" style="grid-column:1/-1">הזמנה וחשבונית</div>
      ${MAT_FILES.map(([k, label]) => `<label class="field"><span>${label}${v[k] ? ` (יש: ${esc(v[k].name)})` : ''}</span><input class="input" type="file" name="${k}" accept="image/*,application/pdf"></label>`).join('')}
      <label class="field" style="grid-column:1/-1"><span>הערות</span><textarea class="input" name="notes">${esc(v.notes || '')}</textarea></label>
    </form><p class="form-hint" id="mf-err" style="color:var(--st-red)"></p>`,
    foot: `<button class="btn btn-primary" id="mf-save">${icon('check')}שמירה</button><button class="btn btn-ghost" data-close>ביטול</button>`,
    onOpen(el) {
      if (focus) setTimeout(() => el.querySelector(`[name="${focus}"]`).focus(), 50);
      el.querySelector('#mf-save').onclick = async (ev) => {
        const f = new FormData(el.querySelector('#mf'));
        const name = String(f.get('name') || '').trim();
        if (!name) { el.querySelector('#mf-err').textContent = 'צריך שם לפריט'; return; }
        ev.target.disabled = true;
        const target = m || { id: 'm' + Date.now(), unit: '', link: '', swatch: '#d8cfc0' };
        ['name', 'space', 'cat', 'status', 'maker', 'model', 'color', 'supplier', 'warrantyUntil', 'contactName', 'contactPhone', 'notes'].forEach((k) => (target[k] = String(f.get(k) || '').trim()));
        target.price = Number(f.get('price')) || null;
        try {
          for (const [k, label, docCat] of MAT_FILES) {
            const file = f.get(k);
            if (!file || !file.size) continue;
            const path = await storeFile(file);
            const type = (file.name.split('.').pop() || 'PDF').toUpperCase().slice(0, 4);
            target[k] = { name: file.name, type, date: TODAY, path };
            d.documents.unshift({ id: 'd' + Date.now() + k, cat: docCat, title: `${label} – ${name}${target.supplier ? ` (${target.supplier})` : ''}`, date: TODAY, type, size: (file.size / 1048576).toFixed(1) + 'MB', path, material: target.id });
          }
        } catch (e) { ev.target.disabled = false; return; }
        if (!m) d.materials.push(target);
        Store.log(`${m ? 'עדכן' : 'הוסיף'} חומר: ${name}`);
        Store.save();
        closeModal();
        toast(m ? 'הפריט עודכן' : 'הפריט נוסף לחומרים ובחירות');
        App.render();
      };
    },
  });
}

Pages.materials = (q) => {
  const d = Store.data;
  const by = q.by === 'cat' ? 'cat' : 'space';
  const groups = by === 'space'
    ? SPACES.filter((s) => d.materials.some((m) => m.space === s))
    : [...new Set(d.materials.map((m) => m.cat))];
  return {
    title: 'חומרים ובחירות',
    html: `
      <div class="page-head"><div><h1>חומרים ובחירות</h1><p>כל מה שנבחר לבית, עם איש קשר, הזמנה וחשבונית לכל פריט</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
          <div class="seg" role="group" aria-label="תצוגה">
            <button aria-pressed="${by === 'space'}" data-by="space">לפי חלל</button>
            <button aria-pressed="${by === 'cat'}" data-by="cat">לפי קטגוריה</button>
          </div>
          <button class="btn btn-accent" id="mt-add">${icon('plus')}הוספת חומר</button>
        </div>
      </div>
      ${groups.map((g) => {
        const items = d.materials.filter((m) => (by === 'space' ? m.space : m.cat) === g);
        return `<section class="space-group">
          <h2>${esc(g)} <span class="n">${items.length} פריטים</span></h2>
          <div class="mat-grid">
            ${items.map((m) => `
              <button class="card mat-card" data-mat="${m.id}">
                ${matVisual(m)}
                <div class="body">
                  <span class="name">${esc(m.name)}</span>
                  <span class="brand">${esc([m.maker, m.color].filter(Boolean).join(' · ') || '—')}</span>
                  <span class="mat-flags">${matPill(m.status)}${m.invoice ? `<span class="flag" title="יש חשבונית">${icon('receipt', 'xs')}</span>` : ''}${m.contactPhone ? `<span class="flag" title="יש איש קשר">${icon('phone', 'xs')}</span>` : ''}</span>
                </div>
              </button>`).join('')}
          </div>
        </section>`;
      }).join('') || '<div class="empty">עוד אין חומרים. לוחצים "הוספת חומר".</div>'}`,
    mount(root) {
      root.querySelectorAll('[data-by]').forEach((b) => (b.onclick = () => App.go('materials', { by: b.dataset.by })));
      root.querySelectorAll('[data-mat]').forEach((b) => (b.onclick = () => openMaterial(b.dataset.mat)));
      root.querySelector('#mt-add').onclick = () => materialForm();
      if (q.id) { history.replaceState(null, '', '#/materials' + (q.by ? '?by=' + q.by : '')); openMaterial(q.id); }
    },
  };
};

/* ---------- לוח זמנים ---------- */
const TL_VIEWS = [['gantt', 'גאנט'], ['path', 'מסלול'], ['months', 'לפי חודשים']];

function tlGantt(tl) {
  const t0 = parseDate(tl[0].ps), t1 = parseDate(tl[tl.length - 1].pe);
  const span = t1 - t0;
  const x = (s) => ((parseDate(s) - t0) / span * 100).toFixed(2);
  const months = [];
  for (let dt = new Date(t0.getFullYear(), t0.getMonth() + 1, 1); dt <= t1; dt.setMonth(dt.getMonth() + 1)) {
    months.push({ pos: ((dt - t0) / span * 100).toFixed(2), label: HEB_MONTHS_SHORT[dt.getMonth()] + (dt.getMonth() === 0 ? ` ${String(dt.getFullYear()).slice(2)}` : '') });
  }
  const todayX = x(TODAY);
  return `<article class="card card-pad gantt" style="margin-bottom:18px">
    <div class="gantt-inner">
      <div class="gantt-months"><div></div><div class="m">${months.map((m) => `<span style="right:${m.pos}%">${m.label}</span>`).join('')}</div></div>
      ${tl.map((s) => {
        const aS = s.as || s.ps;
        const aE = s.ae || (s.status === 'future' ? s.pe : TODAY);
        const tip = `<b>${esc(s.name)}</b><div class="r"><span>מתוכנן</span><span>${fmtDateShort(s.ps)}–${fmtDateShort(s.pe)}</span></div><div class="r"><span>בפועל</span><span>${s.as ? fmtDateShort(s.as) : '—'}–${s.ae ? fmtDateShort(s.ae) : (s.as ? 'היום' : '—')}</span></div>`;
        return `<div class="gantt-row">
          <div>${esc(s.name)}</div>
          <div class="gantt-track" tabindex="0" data-tip="${esc(tip)}">
            <i class="gantt-bar plan" style="right:${x(s.ps)}%;width:${(x(s.pe) - x(s.ps)).toFixed(2)}%"></i>
            ${s.status !== 'future' ? `<i class="gantt-bar ${s.status}" style="right:${x(aS)}%;width:${Math.max(x(aE) - x(aS), 0.6).toFixed(2)}%;top:12px;height:10px"></i>` : ''}
            <i class="gantt-today" style="right:${todayX}%" aria-hidden="true"></i>
          </div>
        </div>`;
      }).join('')}
      <div class="small muted" style="margin-top:8px;display:flex;gap:16px;flex-wrap:wrap">
        <span><i class="sw" style="border:1.5px dashed var(--line-2);vertical-align:middle"></i> תכנון</span>
        <span><i class="sw" style="background:var(--st-blue);vertical-align:middle"></i> ביצוע בפועל</span>
        <span><i class="sw" style="background:var(--terra);width:3px;vertical-align:middle"></i> היום</span>
      </div>
    </div>
  </article>`;
}

// A horizontal journey: one card per stage, the current one raised.
function tlPath(tl) {
  return `<div class="tl-path" role="list">
    ${tl.map((s, i) => {
      const pct = s.status === 'done' ? 100 : s.status === 'future' ? 0 : Math.round(Math.min(1, Math.max(0, (parseDate(TODAY) - parseDate(s.as || s.ps)) / Math.max(1, parseDate(s.pe) - parseDate(s.as || s.ps)))) * 100);
      return `<div class="tp-step ${s.status}" role="listitem">
        <div class="tp-node"><span>${s.status === 'done' ? icon('check') : i + 1}</span></div>
        <div class="tp-card">
          <div class="tp-name">${esc(s.name)}</div>
          <div class="tp-dates">${fmtDateShort(s.ps)} – ${fmtDateShort(s.pe)}</div>
          ${s.status === 'active' || s.status === 'delay' ? `<div class="progress dark" style="margin-top:8px"><i style="width:${pct}%"></i></div><div class="xs muted" style="margin-top:4px">${pct}% מהזמן המתוכנן</div>` : ''}
          <div style="margin-top:8px">${statusPill(s.status)}</div>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

// Month by month: what is happening in each month.
function tlMonths(tl) {
  const t0 = parseDate(tl[0].ps), t1 = parseDate(tl[tl.length - 1].pe);
  const out = [];
  for (let dt = new Date(t0.getFullYear(), t0.getMonth(), 1); dt <= t1; dt.setMonth(dt.getMonth() + 1)) {
    const mStart = new Date(dt), mEnd = new Date(dt.getFullYear(), dt.getMonth() + 1, 0);
    const items = tl.filter((s) => parseDate(s.ps) <= mEnd && parseDate(s.pe) >= mStart);
    const now = parseDate(TODAY) >= mStart && parseDate(TODAY) <= mEnd;
    out.push(`<article class="card tm-card ${now ? 'now' : ''} ${mEnd < parseDate(TODAY) ? 'past' : ''}">
      <div class="tm-head"><b>${HEB_MONTHS[mStart.getMonth()]}</b><span>${mStart.getFullYear()}</span>${now ? pill('blue', 'החודש') : ''}</div>
      ${items.map((s) => `<div class="tm-item ${s.status}"><i></i><span>${esc(s.name)}</span></div>`).join('') || '<div class="xs muted">אין שלבים</div>'}
    </article>`);
  }
  return `<div class="tl-months">${out.join('')}</div>`;
}

Pages.timeline = (q) => {
  const d = Store.data;
  const tl = d.timeline;
  if (!tl.length) return { title: 'לוח זמנים', html: '<div class="page-head"><div><h1>לוח זמנים</h1></div></div><div class="empty">לוח הזמנים עוד לא הוגדר</div>', mount() {} };
  const view = TL_VIEWS.some(([k]) => k === q.view) ? q.view : (Store.session.tlView || 'gantt');
  return {
    title: 'לוח זמנים',
    html: `
      <div class="page-head"><div><h1>לוח זמנים</h1><p>התכנון מול הביצוע בפועל, שלב אחר שלב</p></div>
        <div class="seg" role="group" aria-label="תצוגה">${TL_VIEWS.map(([k, l]) => `<button aria-pressed="${k === view}" data-view="${k}">${l}</button>`).join('')}</div>
      </div>
      <div class="legend-status" style="margin-bottom:14px">${statusPill('done')}${statusPill('active')}${statusPill('delay')}${statusPill('future')}</div>
      ${view === 'path' ? tlPath(tl) : view === 'months' ? tlMonths(tl) : tlGantt(tl)}

      <ol class="timeline" style="margin-top:22px">
        ${tl.map((s) => `
          <li class="tl-item ${s.status}">
            <span class="tl-dot">${s.status === 'done' ? icon('check') : s.status === 'delay' ? icon('alert') : ''}</span>
            <article class="card tl-card">
              <div class="top"><h3>${esc(s.name)}</h3>${statusPill(s.status)}</div>
              <div class="tl-dates">
                <div><div class="k">התחלה מתוכננת</div><div class="v">${fmtDate(s.ps)}</div></div>
                <div><div class="k">סיום מתוכנן</div><div class="v">${fmtDate(s.pe)}</div></div>
                <div><div class="k">התחלה בפועל</div><div class="v">${fmtDate(s.as)}</div></div>
                <div><div class="k">סיום בפועל</div><div class="v">${fmtDate(s.ae)}</div></div>
              </div>
              ${s.note ? `<div class="tl-note">${esc(s.note)}</div>` : ''}
              ${s.photos.length ? `<div class="tl-photos">${s.photos.map((src) => `<img src="${esc(media(src))}" alt="" data-src="${esc(media(src))}" loading="lazy">`).join('')}</div>` : ''}
            </article>
          </li>`).join('')}
      </ol>`,
    mount(root) {
      root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => { Store.session.tlView = b.dataset.view; Store.save(); App.go('timeline', { view: b.dataset.view }, true); }));
      root.querySelectorAll('.tl-photos img').forEach((i) => (i.onclick = () => openPhoto(i.dataset.src)));
      // On narrow screens the chart scrolls; start it centred on today (or on the current stage).
      const g = root.querySelector('.gantt') || root.querySelector('.tl-path');
      const mark = root.querySelector('.gantt-today') || root.querySelector('.tp-step.active, .tp-step.delay');
      if (g && mark && g.scrollWidth > g.clientWidth) {
        const gr = g.getBoundingClientRect(), tr = mark.getBoundingClientRect();
        g.scrollLeft += (tr.left - gr.left) - g.clientWidth / 2;
      }
    },
  };
};

/* ---------- תמונות ---------- */
// Before on the right (read first in RTL), after on the left; dragging reveals more of the after.
function baSlider(before, after) {
  return `<div class="ba" id="ba">
    <img src="${esc(media(after))}" alt="אחרי">
    <div class="clip" style="clip-path: inset(0 0 0 50%)"><img class="before" src="${esc(media(before))}" alt="לפני"></div>
    <span class="handle" style="left:50%"></span>
    <span class="tag b">לפני</span><span class="tag a">אחרי</span>
    <input type="range" min="0" max="100" value="50" aria-label="השוואת לפני ואחרי">
  </div>`;
}
function bindBA(root) {
  const ba = root.querySelector('#ba');
  if (!ba) return;
  const r = ba.querySelector('input');
  r.oninput = () => {
    ba.querySelector('.clip').style.clipPath = `inset(0 0 0 ${r.value}%)`;
    ba.querySelector('.handle').style.left = r.value + '%';
  };
}
function luxImg(src, i, cap = '', sub = '') {
  return `<button class="lux" data-lb="${i}" aria-label="הגדלת תמונה${cap ? ': ' + esc(cap) : ''}"><img src="${esc(media(src))}" alt="" loading="lazy">${cap ? `<span class="cap"><b>${esc(cap)}</b>${esc(sub)}</span>` : ''}</button>`;
}

// Construction stages a photo can belong to. One update can sit in several (e.g. plumbing, electricity and A/C).
const PHOTO_STAGES = ['לפני', 'הריסה', 'בנייה', 'אינסטלציה', 'חשמל', 'מיזוג אוויר', 'הנמכות תקרה', 'טיח וצבע', 'ריצוף וחיפויים', 'נגרות', 'אלומיניום', 'מטבח', 'התקנות', 'מסירה'];
function stagesOf(u) { return u.stages && u.stages.length ? u.stages : [u.stage]; }

Pages.photos = (q) => {
  const d = Store.data;
  const view = q.view === 'stages' ? 'stages' : 'all';
  const stage = q.stage || 'הכול';
  const used = [...PHOTO_STAGES, ...new Set(d.updates.flatMap(stagesOf))].filter((s, i, a) => a.indexOf(s) === i && d.updates.some((u) => stagesOf(u).includes(s)));
  const list = d.updates.filter((u) => stage === 'הכול' || stagesOf(u).includes(stage));
  const pairIdx = Math.min(Number(q.ba) || 0, BEFORE_AFTER.length - 1);
  const pair = BEFORE_AFTER[pairIdx];
  const all = [];
  let k = 0;
  const tile = (u, src) => { all.push({ src, title: u.title, sub: `${fmtDate(u.date)} · ${stagesOf(u).join(', ')}` }); return luxImg(src, k++, u.title, fmtDate(u.date)); };

  const journal = () => `<div class="journal-lux" style="margin-top:18px">
    ${list.map((u) => {
      const dt = parseDate(u.date);
      return `<article class="jentry">
        <div class="when"><div class="d">${dt.getDate()}</div><div class="m">${HEB_MONTHS[dt.getMonth()]} ${dt.getFullYear()}</div><div class="st">${stagesOf(u).map((s) => pill(s === 'לפני' ? 'gray' : 'blue', s)).join(' ')}</div></div>
        <div>
          <h3>${esc(u.title)}</h3>
          <p>${esc(u.desc)}</p>
          <div class="mosaic" data-n="${Math.min(u.photos.length, 5)}">${u.photos.map((src) => tile(u, src)).join('')}</div>
        </div>
      </article>`;
    }).join('') || '<div class="empty">עוד אין תמונות</div>'}
  </div>`;

  // Timeline by construction stage. A photo tagged with several stages shows up in each of them.
  const byStage = () => `<ol class="photo-stages">
    ${used.map((s) => {
      const ups = d.updates.filter((u) => stagesOf(u).includes(s)).sort((a, b) => a.date.localeCompare(b.date));
      const n = ups.reduce((c, u) => c + u.photos.length, 0);
      return `<li class="ps-item">
        <span class="ps-dot"></span>
        <div class="ps-body">
          <div class="ps-head"><h3>${esc(s)}</h3><span class="small muted">${n} תמונות · ${fmtDateShort(ups[0].date)}${ups.length > 1 ? `–${fmtDateShort(ups[ups.length - 1].date)}` : ''}</span></div>
          <div class="ps-strip">${ups.flatMap((u) => u.photos.map((src) => tile(u, src))).join('')}</div>
        </div>
      </li>`;
    }).join('') || '<div class="empty">עוד אין תמונות</div>'}
  </ol>`;

  return {
    title: 'תמונות',
    html: `
      <div class="page-head"><div><span class="eyebrow">יומן הפרויקט</span><h1>הבית, שלב אחר שלב</h1><p>עדכונים ותמונות מהשטח, לפי תאריך או לפי שלבי הבנייה</p></div>
        <div class="seg" role="group" aria-label="תצוגה">
          <button aria-pressed="${view === 'all'}" data-view="all">הכל</button>
          <button aria-pressed="${view === 'stages'}" data-view="stages">ציר לפי שלבים</button>
        </div>
      </div>
      ${view === 'all' ? `<div class="chips" role="group" aria-label="סינון לפי שלב">
        ${['הכול', ...used].map((s) => `<button class="chip" aria-pressed="${s === stage}" data-stage="${esc(s)}">${esc(s === 'הכול' ? 'הכל' : s)}</button>`).join('')}
      </div>${journal()}` : byStage()}
      <section style="margin-top:64px">
        <div class="page-head" style="margin-bottom:16px"><div><span class="eyebrow">Before &amp; After</span><h1 style="font-size:34px">מה היה, ומה יהיה</h1><p>גררו את הקו כדי להשוות. מתוך פרויקט של קאסה פואבלו ברמת השרון.</p></div></div>
        <div class="ba-tabs">${BEFORE_AFTER.map((p, i) => `<button class="chip" aria-pressed="${i === pairIdx}" data-ba="${i}">${esc(p.name)}</button>`).join('')}</div>
        ${baSlider(pair.before, pair.after)}
      </section>`,
    mount(root) {
      root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => App.go('photos', { view: b.dataset.view })));
      root.querySelectorAll('[data-stage]').forEach((b) => (b.onclick = () => App.go('photos', { stage: b.dataset.stage })));
      root.querySelectorAll('[data-ba]').forEach((b) => (b.onclick = () => App.go('photos', { view: q.view, stage: q.stage, ba: b.dataset.ba }, true)));
      root.querySelectorAll('[data-lb]').forEach((b) => (b.onclick = () => openLightbox(all, Number(b.dataset.lb))));
      bindBA(root);
    },
  };
};

/* ---------- מסמכים ---------- */
Pages.documents = (q) => {
  const d = Store.data;
  const cat = q.cat || 'הכול';
  const used = DOC_CATEGORIES.filter((c) => d.documents.some((x) => x.cat === c));
  const list = d.documents.filter((x) => cat === 'הכול' || x.cat === cat).sort((a, b) => b.date.localeCompare(a.date));
  return {
    title: 'מסמכים והסכמים',
    html: `
      <div class="page-head"><div><h1>מסמכים והסכמים</h1><p>הסכמים, חשבוניות, אישורים ותעודות אחריות</p></div>
        <button class="btn btn-ghost" id="doc-up">${icon('upload')}העלאת מסמך</button></div>
      <div class="chips" role="group" aria-label="סינון לפי קטגוריה">
        ${['הכול', ...used].map((c) => `<button class="chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}
      </div>
      <div class="card"><ul class="rows">
        ${list.map((x) => `<li class="row">
          ${fileIco(x.type)}
          <div class="main-col"><div class="title">${esc(x.title)}</div><div class="sub">${esc(x.cat)} · ${fmtDate(x.date)} · ${x.size}${x.expense ? ' · מקושר להוצאה' : ''}</div></div>
          <div class="end"><button class="btn btn-sm btn-ghost" data-view="${x.id}">${icon('eye')}צפייה</button><button class="icon-btn" aria-label="שליחה בוואטסאפ" title="וואטסאפ" data-wa="${x.id}">${icon('whatsapp')}</button><button class="icon-btn" aria-label="שליחה במייל" title="מייל" data-mail="${x.id}">${icon('mail')}</button><button class="icon-btn" aria-label="הורדה" data-dl="${x.id}">${icon('download')}</button></div>
        </li>`).join('')}
      </ul></div>`,
    mount(root) {
      root.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => App.go('documents', { cat: b.dataset.cat })));
      root.querySelectorAll('[data-view],[data-dl]').forEach((b) => (b.onclick = () => {
        const doc = d.documents.find((x) => x.id === (b.dataset.view || b.dataset.dl));
        if (!openFile(doc && doc.path)) toast(Store.live ? 'למסמך הזה לא צורף קובץ' : 'בגרסה המלאה הקובץ נפתח כאן');
      }));
      list.forEach((x) => bindShare(root, { title: x.title, ref: x.path, file: x.type }, x.id));
      root.querySelector('#doc-up').onclick = () => uploadDocFlow();
    },
  };
};
function uploadDocFlow() {
  openModal({
    title: 'העלאת מסמך',
    body: `
      <label class="field"><span>קובץ</span><input class="input" type="file" id="ud-file"></label>
      <label class="field"><span>שם המסמך</span><input class="input" id="ud-title" placeholder="למשל: חשבונית וילונות"></label>
      <label class="field"><span>קטגוריה</span><select class="input" id="ud-cat">${DOC_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></label>`,
    foot: `<button class="btn btn-primary" id="ud-save">${icon('upload')}העלאה</button>`,
    onOpen(el) {
      el.querySelector('#ud-save').onclick = async (ev) => {
        const f = el.querySelector('#ud-file').files[0];
        if (Store.live && !f) { el.querySelector('#ud-file').focus(); return toast('צריך לבחור קובץ'); }
        ev.target.disabled = true;
        let path = '';
        try { path = await storeFile(f); } catch (e) { ev.target.disabled = false; return; }
        const title = el.querySelector('#ud-title').value.trim() || (f && f.name) || 'מסמך חדש';
        const ext = f ? (f.name.split('.').pop() || 'PDF').toUpperCase().slice(0, 4) : 'PDF';
        Store.data.documents.unshift({ id: 'd' + Date.now(), cat: el.querySelector('#ud-cat').value, title, date: TODAY, type: ext, size: f ? (f.size / 1048576).toFixed(1) + 'MB' : '—', path });
        Store.log(`העלה מסמך: ${title}`);
        Store.save();
        closeModal();
        toast('המסמך נשמר');
        App.render();
      };
    },
  });
}

/* ---------- בעלי מקצוע ---------- */
Pages.pros = (q) => {
  const d = Store.data;
  const term = (q.q || '').trim();
  const list = d.pros.filter((p) => !term || [p.cat, p.name, p.company, p.note].join(' ').includes(term));
  return {
    title: 'בעלי מקצוע',
    html: `
      <div class="page-head"><div><h1>בעלי מקצוע וספקים</h1><p>ספר בעלי המקצוע של הבית, גם שנים אחרי המסירה</p></div></div>
      <div class="toolbar"><input class="input search-input" id="pro-q" type="search" placeholder="חיפוש: חשמלאי, נגר, שם ספק…" value="${esc(term)}"></div>
      <div class="grid md-2 lg-3">
        ${list.map((p) => `
          <article class="card pro-card">
            <span class="avatar lg">${initials(p.name)}</span>
            <div class="info">
              <div class="role">${esc(p.cat)}</div>
              <div class="name">${esc(p.name)}</div>
              <div class="co">${esc(p.company)}${p.note ? ` · ${esc(p.note)}` : ''}</div>
              <div class="acts">
                <a class="btn btn-sm btn-primary" href="tel:${p.phone}">${icon('phone')}התקשרות</a>
                <a class="btn btn-sm btn-ghost" href="https://wa.me/972${p.phone.replace(/\D/g, '').replace(/^0/, '')}" target="_blank" rel="noopener">${icon('whatsapp')}וואטסאפ</a>
              </div>
            </div>
          </article>`).join('') || '<div class="empty">לא נמצאו בעלי מקצוע</div>'}
      </div>`,
    mount(root) {
      const inp = root.querySelector('#pro-q');
      let t;
      inp.oninput = () => { clearTimeout(t); t = setTimeout(() => App.go('pros', { q: inp.value }, true), 250); };
      if (term) { inp.focus(); inp.setSelectionRange(term.length, term.length); }
    },
  };
};

/* ---------- שירות ואחריות ---------- */
// Warranty on purchased products only (A/C, fridge, dishwasher, hob...). Casa Pueblo's own work is not listed here.
// 90 days before the end the family gets an email (supabase/functions/reminders).
function productWarranties(d) {
  return d.materials.filter((m) => m.warrantyUntil).map((m) => ({ m, left: daysBetween(TODAY, m.warrantyUntil) })).sort((a, b) => a.left - b.left);
}
function warrantyPill(left) {
  if (left < 0) return pill('gray', 'הסתיימה');
  if (left <= 90) return pill('yellow', `נשארו ${left} ימים`);
  return pill('green', 'בתוקף');
}

Pages.service = () => {
  const d = Store.data;
  const wr = productWarranties(d);
  return {
    title: 'שירות ואחריות',
    html: `
      <div class="page-head"><div><h1>שירות ואחריות</h1><p>פניות שירות, ואחריות על המוצרים שנרכשו לבית</p></div>
        <button class="btn btn-accent" id="tk-new">${icon('plus')}פנייה חדשה</button></div>
      <div class="grid md-2">
        <article class="card">
          <div class="card-pad" style="padding-bottom:4px"><h3>הפניות שלי</h3></div>
          <ul class="rows">
            ${d.tickets.map((t) => `<li class="row">
              <div class="main-col"><div class="title">#${t.no} · ${esc(t.title)}</div>
                <div class="sub">${fmtDate(t.date)} · ${esc(t.cat)} · ${esc(t.by)}</div>
                ${t.reply ? `<div class="tl-note" style="margin-top:6px">${esc(t.reply)}</div>` : ''}</div>
              <div class="end">${t.status === 'נסגר' ? pill('green', 'נסגר') : t.status === 'חדש' ? pill('yellow', 'התקבל') : pill('blue', 'בטיפול')}</div>
            </li>`).join('') || '<li class="empty">אין פניות</li>'}
          </ul>
        </article>
        <article class="card">
          <div class="card-pad" style="padding-bottom:4px"><h3>אחריות על מוצרים</h3>
            <p class="small muted" style="margin:4px 0 0">3 חודשים לפני שהאחריות מסתיימת נשלח אליכם מייל תזכורת.</p></div>
          <ul class="rows">
            ${wr.map(({ m, left }) => `<li class="row compact clickable" data-mat="${m.id}"><div class="main-col"><div class="title">${esc(m.name)}${m.maker ? ` · ${esc(m.maker)}` : ''}</div><div class="sub">אחריות עד ${fmtDate(m.warrantyUntil)}${m.supplier ? ` · ${esc(m.supplier)}` : ''}</div></div>
              <div class="end">${warrantyPill(left)}</div></li>`).join('') || '<li class="empty">עוד לא הוזנו מוצרים עם אחריות. מוסיפים "אחריות עד" בפריט בחומרים ובחירות.</li>'}
          </ul>
        </article>
      </div>`,
    mount(root) {
      root.querySelector('#tk-new').onclick = () => newTicketFlow();
      root.querySelectorAll('[data-mat]').forEach((r) => (r.onclick = () => openMaterial(r.dataset.mat)));
    },
  };
};
function newTicketFlow() {
  openModal({
    title: 'פתיחת פנייה',
    body: `
      <label class="field"><span>מה קרה?</span><input class="input" id="tk-title" placeholder="למשל: דלת ארון לא נסגרת עד הסוף"></label>
      <label class="field"><span>תחום</span><select class="input" id="tk-cat">${PRO_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}<option>אחר</option></select></label>
      <label class="field"><span>פירוט</span><textarea class="input" id="tk-desc"></textarea></label>
      <label class="field"><span>תמונה</span><input class="input" type="file" accept="image/*" capture="environment"></label>`,
    foot: `<button class="btn btn-primary" id="tk-send">${icon('send')}שליחה</button>`,
    onOpen(el) {
      el.querySelector('#tk-send').onclick = async (ev) => {
        const title = el.querySelector('#tk-title').value.trim();
        if (!title) { el.querySelector('#tk-title').focus(); return; }
        ev.target.disabled = true;
        let photo = '';
        const pf = el.querySelector('input[type=file]').files[0];
        try { photo = await storeFile(pf && await shrinkImage(pf)); } catch (e) { ev.target.disabled = false; return; }
        const no = Math.max(1000, ...Store.data.tickets.map((t) => t.no)) + 1;
        Store.data.tickets.unshift({ id: 't' + Date.now(), no, title, desc: el.querySelector('#tk-desc').value.trim(), photo, date: TODAY, status: 'חדש', cat: el.querySelector('#tk-cat').value, by: currentUserName(), reply: '' });
        Store.log(`פתח פניית שירות #${no}: ${title}`);
        Store.save();
        closeModal();
        toast(`פנייה #${no} נשלחה. נחזור אליכם תוך יום עסקים`);
        App.render();
      };
    },
  });
}

/* ---------- משימות ואישורים ---------- */
Pages.tasks = () => {
  const d = Store.data;
  const open = d.tasks.filter((t) => !t.done);
  const done = d.tasks.filter((t) => t.done);
  const row = (t) => `<li>
      <span class="ico ${t.done ? 'green' : t.level}">${icon(t.done ? 'check' : t.type === 'approval' ? 'check' : t.type === 'choice' ? 'materials' : 'info')}</span>
      <div class="txt"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div>
      ${t.done ? pill('green', 'בוצע') : `<button class="btn btn-sm ${t.level === 'red' ? 'btn-primary' : 'btn-ghost'}" data-task="${t.id}">${t.type === 'approval' ? 'לאישור' : 'פתיחה'}</button>`}
    </li>`;
  return {
    title: 'משימות ואישורים',
    html: `
      <div class="page-head"><div><h1>משימות ואישורים</h1><p>מה מחכה להחלטה שלכם</p></div></div>
      <article class="card card-pad"><h3 style="margin-bottom:8px">פתוחות (${open.length})</h3>
        ${open.length ? `<ul class="action-list">${open.map(row).join('')}</ul>` : `<div class="empty">${icon('check')}<div>אין משימות פתוחות. כל הכבוד!</div></div>`}
      </article>
      ${done.length ? `<article class="card card-pad" style="margin-top:14px"><h3 style="margin-bottom:8px">בוצעו</h3><ul class="action-list">${done.map(row).join('')}</ul></article>` : ''}`,
    mount(root) {
      root.querySelectorAll('[data-task]').forEach((b) => (b.onclick = () => openTaskRef(Store.data.tasks.find((t) => t.id === b.dataset.task))));
    },
  };
};

/* ---------- התראות ---------- */
Pages.notifications = () => {
  const d = Store.data;
  const html = `
    <div class="page-head"><div><h1>התראות</h1></div><button class="btn btn-ghost btn-sm" id="nt-all">סימון הכול כנקרא</button></div>
    <div class="card">
      ${d.notifications.map((n) => `<a class="notif ${n.read ? 'read' : 'unread'}" href="#/${n.link}" data-n="${n.id}" style="text-decoration:none;color:inherit">
        <span class="dot"></span><div><div class="t">${esc(n.text)}</div><div class="w">${fmtWhen(n.when)}</div></div></a>`).join('')}
    </div>
    <p class="small muted">בהמשך אפשר לשלוח את ההתראות גם במייל, ב-SMS ובוואטסאפ.</p>`;
  return {
    title: 'התראות',
    html,
    mount(root) {
      root.querySelector('#nt-all').onclick = () => { d.notifications.forEach((n) => (n.read = true)); Store.save(); App.render(); };
      root.querySelectorAll('[data-n]').forEach((a) => (a.onclick = () => { d.notifications.find((n) => n.id === a.dataset.n).read = true; Store.save(); }));
    },
  };
};
