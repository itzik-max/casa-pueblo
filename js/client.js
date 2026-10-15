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

function openPhoto(src, caption) {
  openModal({ title: caption || 'תמונה', cls: 'photo', wide: true, body: `<img src="${esc(src)}" alt="${esc(caption || '')}">` });
}

/* ---------- ראשי ---------- */
Pages.home = () => {
  const d = Store.data;
  const p = d.project;
  const fm = financeModel(d);
  const cm = casaModel(d);
  const tasks = d.tasks.filter((t) => !t.done);
  const daysLeft = daysBetween(TODAY, p.handover);
  const latest = d.updates[0];
  const allPhotos = d.updates.flatMap((u) => u.photos);
  const pm = TEAM[p.pm];
  const delays = d.timeline.filter((s) => s.status === 'delay');
  return {
    title: 'ראשי',
    html: `
      <section class="hero" style="background-image:url('${esc(p.image)}')">
        <div class="hero-body">
          <div class="hello">שלום משפחת ${esc(p.family)}, ברוכים הבאים לבית שלכם ב-CASA PUEBLO</div>
          <h1>${esc(p.name)}</h1>
          <div class="addr">${icon('pin')}${esc(p.address)}</div>
          <div class="hero-stage">
            ${progressRing(p.progress, 58, 5)}
            <div class="bar">
              <div class="lbl">שלב נוכחי</div>
              <div class="val">${esc(p.stage)}</div>
              <div class="mini-timeline" aria-hidden="true">${d.timeline.map((s) => `<i class="${s.status}"></i>`).join('')}</div>
            </div>
          </div>
        </div>
      </section>

      <div class="facts" style="margin-top:14px">
        <div><div class="k">תאריך התחלה</div><div class="v">${fmtDate(p.start)}</div></div>
        <div><div class="k">מסירה משוערת</div><div class="v">${fmtDate(p.handover)}</div></div>
        <div><div class="k">נותרו עד המסירה</div><div class="v">${daysLeft} ימים</div></div>
        <div><div class="k">מנהל הפרויקט</div><div class="v">${esc(pm.name)}</div></div>
      </div>

      <div class="grid wide-left" style="margin-top:14px">
        <div class="stack">
          <article class="card card-pad update-card">
            <div class="card-head" style="margin-bottom:0">
              <h3>כרגע בפרויקט</h3>
              <span class="meta">${icon('clock', 'xs')}עודכן ${fmtDate(p.weekly.updated)}</span>
            </div>
            <blockquote>${esc(p.weekly.text)}</blockquote>
            <div class="author"><span class="avatar navy">${initials(pm.name)}</span><div><b>${esc(pm.name)}</b><div class="small muted">${esc(pm.role)}</div></div></div>
          </article>

          <article class="card card-pad">
            <div class="card-head"><h3>עדכון אחרון מהשטח</h3><a class="link-btn" href="#/photos">ליומן הפרויקט</a></div>
            <div class="split" style="align-items:flex-start;margin-bottom:10px">
              <div><b>${esc(latest.title)}</b><div class="small muted">${fmtDate(latest.date)} · ${esc(latest.stage)}</div></div>
            </div>
            <div class="thumbs">
              ${allPhotos.slice(0, 5).map((src) => `<button class="photo-btn" data-src="${esc(src)}" style="padding:0;border:0;background:none"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}
              <a class="more" href="#/photos">עוד ${Math.max(allPhotos.length - 5, 0)}</a>
            </div>
          </article>
        </div>

        <div class="stack">
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

          <a class="next-pay" href="#/finance" style="text-decoration:none">
            <span class="k">התשלום הבא לקאסה פואבלו</span>
            <span class="v num">${cm.next ? ils(cm.next.amount) : '—'}</span>
            <span class="d">${cm.next ? `${esc(cm.next.name)} · ${fmtDate(cm.next.due)}` : 'כל התשלומים הוסדרו'}</span>
          </a>

          <article class="card card-pad">
            <div class="card-head"><h3>תקציב הבית</h3><a class="link-btn small" href="#/finance?tab=budget">לפירוט</a></div>
            <div class="split small ink-2" style="margin-bottom:8px"><span>ניצול תקציב</span><b class="num" style="color:var(--navy)">${pct(fm.util)}</b></div>
            ${budgetMeter(fm)}
          </article>

          ${delays.length ? `
          <article class="card card-pad">
            <div class="card-head"><h3>לתשומת לבכם</h3>${statusPill('delay')}</div>
            ${delays.map((s) => `<p style="margin:0" class="ink-2"><b style="color:var(--ink)">${esc(s.name)}:</b> ${esc(s.note)}</p>`).join('')}
          </article>` : ''}
        </div>
      </div>`,
    mount(root) {
      root.querySelectorAll('[data-task]').forEach((b) => (b.onclick = () => openTaskRef(Store.data.tasks.find((t) => t.id === b.dataset.task))));
      root.querySelectorAll('.photo-btn').forEach((b) => (b.onclick = () => openPhoto(b.dataset.src)));
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
function openPlan(id) {
  const plan = Store.data.plans.find((p) => p.id === id);
  const v = plan.versions[0];
  const seed = Number(id.replace(/\D/g, '')) || 1;
  Store.log(`צפה ב-${plan.title} V${v.v}`);
  Store.save();
  openModal({
    title: `${plan.title} · V${v.v}`,
    wide: true,
    body: `
      <div class="split" style="margin-bottom:12px;flex-wrap:wrap">
        <div class="small ink-2">${esc(plan.cat)} · הועלתה ${fmtDate(v.date)} ע״י ${esc(v.by)} · ${v.file} ${v.size}</div>
        ${statusPill(plan.status)}
      </div>
      <div class="plan-viewer">${planSketch(plan.title, v.v, seed)}</div>
      ${v.note ? `<div class="tl-note">מה השתנה בגרסה: ${esc(v.note)}</div>` : ''}
      <h3 style="margin:18px 0 4px;font-size:15px;color:var(--navy)">היסטוריית גרסאות</h3>
      <p class="small muted" style="margin:0 0 6px">גרסאות קודמות לא נמחקות, ותמיד אפשר לחזור אליהן.</p>
      <ul class="version-list">
        ${plan.versions.map((x, i) => `<li><span class="v">V${x.v}</span><span class="d">${fmtDate(x.date)} · ${esc(x.by)}${x.note ? ` · ${esc(x.note)}` : ''}</span>${i === 0 ? pill('blue', 'נוכחית') : '<button class="btn btn-sm btn-quiet">צפייה</button>'}</li>`).join('')}
      </ul>`,
    foot: `${plan.status === 'pending' ? `<button class="btn btn-primary" id="pv-approve">${icon('check')}לאישור התכנית</button>` : ''}
      <button class="btn btn-ghost" id="pv-dl">${icon('download')}הורדה</button>`,
    onOpen(el) {
      const a = el.querySelector('#pv-approve');
      if (a) a.onclick = () => { closeModal(); approvePlanFlow(id); };
      el.querySelector('#pv-dl').onclick = () => toast('בגרסה המלאה יורד כאן קובץ התכנית');
    },
  });
}

Pages.plans = (q) => {
  const d = Store.data;
  const cat = q.cat || 'הכול';
  const used = PLAN_CATEGORIES.filter((c) => d.plans.some((p) => p.cat === c));
  const list = d.plans.filter((p) => cat === 'הכול' || p.cat === cat)
    .sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0) || b.versions[0].date.localeCompare(a.versions[0].date));
  const pending = d.plans.filter((p) => p.status === 'pending').length;
  return {
    title: 'תכניות',
    html: `
      <div class="page-head"><div><h1>תכניות</h1><p>כל תכניות הפרויקט במקום אחד, כולל גרסאות קודמות</p></div>
        ${pending ? pill('red', `${pending} ממתינות לאישורכם`) : ''}</div>
      <div class="chips" role="group" aria-label="סינון לפי קטגוריה">
        ${['הכול', ...used].map((c) => `<button class="chip" aria-pressed="${c === cat}" data-cat="${esc(c)}">${esc(c)}<span class="n">${c === 'הכול' ? d.plans.length : d.plans.filter((p) => p.cat === c).length}</span></button>`).join('')}
      </div>
      <div class="card">
        <ul class="rows">
          ${list.map((p) => {
            const v = p.versions[0];
            return `<li class="row clickable" data-plan="${p.id}">
              ${fileIco(v.file)}
              <div class="main-col">
                <div class="title">${esc(p.title)}</div>
                <div class="sub">${esc(p.cat)} · V${v.v} · ${fmtDate(v.date)}${p.versions.length > 1 ? ` · ${p.versions.length} גרסאות` : ''}</div>
              </div>
              <div class="end">${statusPill(p.status)}
                ${p.status === 'pending' ? `<button class="btn btn-sm btn-primary" data-approve="${p.id}">לאישור</button>` : ''}</div>
            </li>`;
          }).join('') || '<li class="empty">אין תכניות בקטגוריה זו</li>'}
        </ul>
      </div>`,
    mount(root) {
      root.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => App.go('plans', { cat: b.dataset.cat })));
      root.querySelectorAll('[data-plan]').forEach((r) => (r.onclick = (e) => { if (!e.target.closest('[data-approve]')) openPlan(r.dataset.plan); }));
      root.querySelectorAll('[data-approve]').forEach((b) => (b.onclick = () => approvePlanFlow(b.dataset.approve)));
      if (q.id) { history.replaceState(null, '', '#/plans'); openPlan(q.id); }
    },
  };
};

/* ---------- חומרים ובחירות ---------- */
function matVisual(m, cls = 'ph') {
  return m.img ? `<img class="${cls}" src="${esc(m.img)}" alt="" loading="lazy">` : `<div class="${cls} swatch" style="background:${esc(m.swatch || '#ddd')}"></div>`;
}
function openMaterial(id) {
  const d = Store.data;
  const m = d.materials.find((x) => x.id === id);
  const exp = d.expenses.find((e) => e.material === id);
  const sup = d.pros.find((p) => p.company === m.supplier);
  const fields = [
    ['קטגוריה', m.cat], ['חלל', m.space], ['יצרן', m.maker], ['דגם', m.model], ['מק״ט', m.sku], ['גוון', m.color],
    ['ספק', m.supplier], ['מחיר', m.price ? `${ils(m.price)}${m.unit ? ' ל' + m.unit : ''}` : ''], ['אחריות', m.warranty], ['הערות', m.notes],
  ].filter(([, v]) => v);
  openModal({
    title: m.name,
    body: `
      <div style="border-radius:12px;overflow:hidden;margin-bottom:14px">${matVisual(m, 'ph')}</div>
      <div class="split" style="margin-bottom:6px">${matPill(m.status)}${m.link ? `<a class="link-btn small" href="${esc(m.link)}" target="_blank" rel="noopener">${icon('link', 'xs')} קישור למוצר</a>` : ''}</div>
      <dl class="kv">${fields.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${exp ? `
      <div class="card card-pad" style="margin-top:14px;background:var(--sand);box-shadow:none">
        <div class="small muted" style="margin-bottom:6px">${icon('link', 'xs')} אותו פריט מופיע גם ב:</div>
        <div class="small">כספים ← ${esc(exp.cat)} · <b class="num">${ils(exp.total)}</b> (שולם ${ils(expensePaid(exp))})</div>
        ${sup ? `<div class="small">בעלי מקצוע ← ${esc(sup.company)}</div>` : ''}
        <div class="small">מסמכים ← ${esc(exp.doc)}</div>
      </div>` : ''}
      ${m.status === 'ממתין לבחירה' ? `
        <h3 style="margin:16px 0 8px;font-size:15px;color:var(--navy)">האפשרויות שדנה הציעה</h3>
        <div class="grid sm-2">
          ${['Axor Uno – כרום', 'Axor Uno – ניקל מוברש'].map((o, i) => `<label class="card card-pad check" style="margin:0;box-shadow:none"><input type="radio" name="opt" value="${esc(o)}" ${i === 0 ? 'checked' : ''}><span>${esc(o)}</span></label>`).join('')}
        </div>` : ''}`,
    foot: m.status === 'ממתין לבחירה' ? `<button class="btn btn-primary" id="mt-choose">${icon('check')}שמירת הבחירה</button>` : '',
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
        toast('הבחירה נשמרה ונשלחה לדנה');
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
      <div class="page-head"><div><h1>חומרים ובחירות</h1><p>כל מה שנבחר לבית, לפי חלל או לפי קטגוריה</p></div>
        <div class="seg" role="group" aria-label="תצוגה">
          <button aria-pressed="${by === 'space'}" data-by="space">לפי חלל</button>
          <button aria-pressed="${by === 'cat'}" data-by="cat">לפי קטגוריה</button>
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
                  ${matPill(m.status)}
                </div>
              </button>`).join('')}
          </div>
        </section>`;
      }).join('')}`,
    mount(root) {
      root.querySelectorAll('[data-by]').forEach((b) => (b.onclick = () => App.go('materials', { by: b.dataset.by })));
      root.querySelectorAll('[data-mat]').forEach((b) => (b.onclick = () => openMaterial(b.dataset.mat)));
      if (q.id) { history.replaceState(null, '', '#/materials' + (q.by ? '?by=' + q.by : '')); openMaterial(q.id); }
    },
  };
};

/* ---------- לוח זמנים ---------- */
Pages.timeline = () => {
  const d = Store.data;
  const tl = d.timeline;
  const t0 = parseDate(tl[0].ps), t1 = parseDate(tl[tl.length - 1].pe);
  const span = t1 - t0;
  const x = (s) => ((parseDate(s) - t0) / span * 100).toFixed(2);
  const months = [];
  for (let dt = new Date(t0.getFullYear(), t0.getMonth() + 1, 1); dt <= t1; dt.setMonth(dt.getMonth() + 1)) {
    months.push({ pos: ((dt - t0) / span * 100).toFixed(2), label: HEB_MONTHS_SHORT[dt.getMonth()] + (dt.getMonth() === 0 ? ` ${String(dt.getFullYear()).slice(2)}` : '') });
  }
  const todayX = x(TODAY);
  return {
    title: 'לוח זמנים',
    html: `
      <div class="page-head"><div><h1>לוח זמנים</h1><p>התכנון מול הביצוע בפועל, שלב אחר שלב</p></div>
        <div class="legend-status">${statusPill('done')}${statusPill('active')}${statusPill('delay')}${statusPill('future')}</div>
      </div>

      <article class="card card-pad gantt" style="margin-bottom:18px">
        <div class="gantt-inner">
          <div class="gantt-months"><div></div><div class="m">${months.map((m) => `<span style="right:${m.pos}%">${m.label}</span>`).join('')}</div></div>
          ${tl.map((s) => {
            const aS = s.as || s.ps;
            const aE = s.ae || (s.status === 'future' ? s.pe : (s.status === 'delay' ? TODAY : TODAY));
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
      </article>

      <ol class="timeline">
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
              ${s.photos.length ? `<div class="tl-photos">${s.photos.map((src) => `<img src="${esc(src)}" alt="" data-src="${esc(src)}" loading="lazy">`).join('')}</div>` : ''}
            </article>
          </li>`).join('')}
      </ol>`,
    mount(root) {
      root.querySelectorAll('.tl-photos img').forEach((i) => (i.onclick = () => openPhoto(i.dataset.src)));
      // On narrow screens the chart scrolls; start it centred on today.
      const g = root.querySelector('.gantt');
      const today = root.querySelector('.gantt-today');
      if (g.scrollWidth > g.clientWidth && today) {
        const gr = g.getBoundingClientRect(), tr = today.getBoundingClientRect();
        g.scrollLeft += (tr.left - gr.left) - g.clientWidth / 2;
      }
    },
  };
};

/* ---------- תמונות ---------- */
function baSlider(before, after) {
  return `<div class="ba" id="ba">
    <img class="before" src="${esc(before)}" alt="לפני">
    <div class="clip" style="clip-path: inset(0 0 0 50%)"><img src="${esc(after)}" alt="אחרי"></div>
    <span class="handle" style="left:50%"></span>
    <span class="tag b">לפני</span><span class="tag a">אחרי</span>
    <input type="range" min="0" max="100" value="50" aria-label="השוואת לפני ואחרי">
  </div>`;
}
Pages.photos = (q) => {
  const d = Store.data;
  const stage = q.stage || 'הכול';
  const stages = ['הכול', ...new Set(d.updates.map((u) => u.stage))];
  const list = d.updates.filter((u) => stage === 'הכול' || u.stage === stage);
  return {
    title: 'תמונות',
    html: `
      <div class="page-head"><div><h1>יומן הפרויקט</h1><p>עדכונים ותמונות מהשטח, לפי תאריך ושלב</p></div></div>
      <div class="chips" role="group" aria-label="סינון לפי שלב">
        ${stages.map((s) => `<button class="chip" aria-pressed="${s === stage}" data-stage="${esc(s)}">${esc(s)}</button>`).join('')}
      </div>
      <div class="journal">
        ${list.map((u) => `
          <article class="card card-pad journal-entry">
            <div class="head"><h3>${esc(u.title)}</h3><span class="small muted">${fmtDateLong(u.date)} · ${esc(u.stage)}</span></div>
            <p>${esc(u.desc)}</p>
            <div class="photo-grid">${u.photos.map((src) => `<button data-src="${esc(src)}" data-cap="${esc(u.title)}" aria-label="הגדלת תמונה"><img src="${esc(src)}" alt="" loading="lazy"></button>`).join('')}</div>
          </article>`).join('')}
      </div>
      <div class="section-title"><h2>Before &amp; After</h2><span class="small muted">ייפתח במלואו עם אלבום המסירה</span></div>
      ${baSlider('assets/img/hero-4.jpg', 'assets/img/hero-4.jpg')}
      ${demoNote('בהדגמה, תמונת ה"לפני" היא אותה תמונה בגווני אפור. בפרויקט אמיתי מעלים תמונה מהיום הראשון.')}`,
    mount(root) {
      root.querySelectorAll('[data-stage]').forEach((b) => (b.onclick = () => App.go('photos', { stage: b.dataset.stage })));
      root.querySelectorAll('.photo-grid [data-src]').forEach((b) => (b.onclick = () => openPhoto(b.dataset.src, b.dataset.cap)));
      const ba = root.querySelector('#ba');
      if (ba) {
        const r = ba.querySelector('input');
        r.oninput = () => {
          const v = r.value;
          ba.querySelector('.clip').style.clipPath = `inset(0 0 0 ${v}%)`;
          ba.querySelector('.handle').style.left = v + '%';
        };
      }
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
          <div class="end"><button class="btn btn-sm btn-ghost" data-view="${x.id}">${icon('eye')}צפייה</button><button class="icon-btn" aria-label="הורדה" data-dl>${icon('download')}</button></div>
        </li>`).join('')}
      </ul></div>`,
    mount(root) {
      root.querySelectorAll('[data-cat]').forEach((b) => (b.onclick = () => App.go('documents', { cat: b.dataset.cat })));
      root.querySelectorAll('[data-view],[data-dl]').forEach((b) => (b.onclick = () => toast('בגרסה המלאה הקובץ נפתח כאן')));
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
      el.querySelector('#ud-save').onclick = () => {
        const f = el.querySelector('#ud-file').files[0];
        const title = el.querySelector('#ud-title').value.trim() || (f && f.name) || 'מסמך חדש';
        const ext = f ? (f.name.split('.').pop() || 'PDF').toUpperCase().slice(0, 4) : 'PDF';
        Store.data.documents.unshift({ id: 'd' + Date.now(), cat: el.querySelector('#ud-cat').value, title, date: TODAY, type: ext, size: f ? (f.size / 1048576).toFixed(1) + 'MB' : '—' });
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
              ${p.warranty ? `<div class="xs muted" style="margin-top:4px">${icon('shield', 'xs')} אחריות עד ${p.warranty.split('-').reverse().join('/')}</div>` : ''}
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
Pages.service = () => {
  const d = Store.data;
  const warranties = d.pros.filter((p) => p.warranty).sort((a, b) => a.warranty.localeCompare(b.warranty));
  return {
    title: 'שירות ואחריות',
    html: `
      <div class="page-head"><div><h1>שירות ואחריות</h1><p>פניות שירות ותעודות האחריות של הבית</p></div>
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
            </li>`).join('')}
          </ul>
        </article>
        <article class="card">
          <div class="card-pad" style="padding-bottom:4px"><h3>אחריות לפי תחום</h3></div>
          <ul class="rows">
            ${warranties.map((p) => {
              const [y, m] = p.warranty.split('-');
              return `<li class="row compact"><div class="main-col"><div class="title">${esc(p.cat)}</div><div class="sub">${esc(p.company)}</div></div>
                <div class="end small"><b class="num">עד ${m}/${y}</b></div></li>`;
            }).join('')}
          </ul>
        </article>
      </div>`,
    mount(root) { root.querySelector('#tk-new').onclick = () => newTicketFlow(); },
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
      el.querySelector('#tk-send').onclick = () => {
        const title = el.querySelector('#tk-title').value.trim();
        if (!title) { el.querySelector('#tk-title').focus(); return; }
        const no = Math.max(...Store.data.tickets.map((t) => t.no)) + 1;
        Store.data.tickets.unshift({ id: 't' + Date.now(), no, title, date: TODAY, status: 'חדש', cat: el.querySelector('#tk-cat').value, by: currentUserName(), reply: '' });
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
