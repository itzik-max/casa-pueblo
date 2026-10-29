/* Back office for Casa Pueblo staff. */

function formModal({ title, intro = '', fields, submit = 'שמירה', onSave }) {
  const fieldHtml = (f) => {
    const v = f.value == null ? '' : f.value;
    if (f.type === 'select') return `<label class="field"><span>${esc(f.label)}</span><select class="input" name="${f.id}">${f.options.map((o) => { const [val, lab] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(lab)}</option>`; }).join('')}</select></label>`;
    if (f.type === 'textarea') return `<label class="field"><span>${esc(f.label)}</span><textarea class="input" name="${f.id}" placeholder="${esc(f.placeholder || '')}">${esc(v)}</textarea></label>`;
    if (f.type === 'checkbox') return `<label class="check"><input type="checkbox" name="${f.id}" ${v ? 'checked' : ''}><span>${esc(f.label)}</span></label>`;
    if (f.type === 'range') return `<label class="field"><span>${esc(f.label)}: <b id="rv-${f.id}">${v}%</b></span><input type="range" name="${f.id}" min="0" max="100" value="${v}" style="width:100%;accent-color:var(--navy)" oninput="document.getElementById('rv-${f.id}').textContent=this.value+'%'"></label>`;
    if (f.type === 'file') return `<label class="field"><span>${esc(f.label)}</span><input class="input" type="file" name="${f.id}" ${f.multiple ? 'multiple' : ''} accept="${f.accept || ''}"></label>`;
    return `<label class="field"><span>${esc(f.label)}</span><input class="input" type="${f.type || 'text'}" name="${f.id}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}"></label>`;
  };
  openModal({
    title,
    body: `${intro ? `<p class="ink-2" style="margin-top:0">${intro}</p>` : ''}<form id="fm" class="form-grid">${fields.map(fieldHtml).join('')}</form><p class="form-hint" id="fm-err" style="color:var(--st-red)"></p>`,
    foot: `<button class="btn btn-primary" id="fm-save">${icon('check')}${esc(submit)}</button><button class="btn btn-ghost" data-close>ביטול</button>`,
    onOpen(el) {
      el.querySelector('#fm-save').onclick = async () => {
        const vals = {};
        fields.forEach((f) => {
          const inp = el.querySelector(`[name="${f.id}"]`);
          vals[f.id] = f.type === 'checkbox' ? inp.checked : f.type === 'file' ? inp.files : f.type === 'number' || f.type === 'range' ? Number(inp.value) : inp.value.trim();
        });
        const missing = fields.find((f) => f.required && !vals[f.id]);
        if (missing) { el.querySelector('#fm-err').textContent = `צריך למלא: ${missing.label}`; return; }
        const msg = await onSave(vals);
        closeModal();
        if (msg) toast(msg);
        App.render();
      };
    },
  });
}

// Downscale an uploaded photo so the demo can keep it in browser storage.
function readImage(file, maxW = 900) {
  return new Promise((resolve) => {
    const fr = new FileReader();
    fr.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => resolve(null);
      img.src = fr.result;
    };
    fr.onerror = () => resolve(null);
    fr.readAsDataURL(file);
  });
}

const SCHEDULE = { ok: ['green', 'בזמן'], delay: ['red', 'עיכוב'], risk: ['yellow', 'בסיכון'], done: ['gray', 'נמסר'] };

/* ---------- Dashboard החברה ---------- */
Pages['bo-home'] = (q) => {
  const d = Store.data;
  // keep the live demo project in sync with its portfolio row
  const live = d.portfolio.find((p) => p.id === d.project.id);
  Object.assign(live, {
    stage: d.project.stage, progress: d.project.progress,
    openTasks: d.tasks.filter((t) => !t.done).length,
    pendingApprovals: d.tasks.filter((t) => !t.done && t.type === 'approval').length,
    schedule: d.timeline.some((s) => s.status === 'delay') ? 'delay' : 'ok',
  });
  const pms = [...new Set(d.portfolio.map((p) => p.pm))];
  const stages = [...new Set(d.portfolio.map((p) => p.stage))];
  const f = { pm: q.pm || '', stage: q.stage || '', st: q.st || '', c: q.c || '' };
  const list = d.portfolio.filter((p) => (!f.pm || p.pm === f.pm) && (!f.stage || p.stage === f.stage) && (!f.st || p.schedule === f.st) && (!f.c || (p.client + p.name).includes(f.c)));
  const active = d.portfolio.filter((p) => p.schedule !== 'done');
  return {
    title: 'דשבורד החברה',
    html: `
      <div class="page-head"><div><h1>כל הפרויקטים</h1><p>תמונת מצב של כל הפרויקטים הפעילים</p></div>
        <a class="btn btn-accent" href="#/bo-new">${icon('plus')}פרויקט חדש</a></div>
      <div class="kpis four">
        <div class="card stat"><div class="k">פרויקטים פעילים</div><div class="v">${active.length}</div></div>
        <div class="card stat"><div class="k">אישורים שממתינים ללקוחות</div><div class="v">${active.reduce((s, p) => s + p.pendingApprovals, 0)}</div></div>
        <div class="card stat alert"><div class="k">בעיכוב / בסיכון</div><div class="v">${active.filter((p) => p.schedule === 'delay' || p.schedule === 'risk').length}</div></div>
        <div class="card stat"><div class="k">פניות שירות פתוחות</div><div class="v">${d.tickets.filter((t) => t.status !== 'נסגר').length}</div></div>
      </div>
      <div class="toolbar" style="margin-top:16px">
        <input class="input search-input" type="search" id="bo-c" placeholder="חיפוש לקוח או פרויקט" value="${esc(f.c)}">
        <select class="input" style="width:auto" id="bo-pm" aria-label="מנהל פרויקט"><option value="">כל מנהלי הפרויקט</option>${pms.map((x) => `<option ${x === f.pm ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select class="input" style="width:auto" id="bo-stage" aria-label="שלב"><option value="">כל השלבים</option>${stages.map((x) => `<option ${x === f.stage ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select>
        <select class="input" style="width:auto" id="bo-st" aria-label="סטטוס"><option value="">כל הסטטוסים</option>${Object.entries(SCHEDULE).map(([k, v]) => `<option value="${k}" ${k === f.st ? 'selected' : ''}>${v[1]}</option>`).join('')}</select>
      </div>
      <div class="project-cards">
        ${list.map((p) => `
          <article class="card pcard" data-p="${p.id}" tabindex="0">
            <div class="img" style="background-image:url('${esc(p.img)}')">${pill(SCHEDULE[p.schedule][0], SCHEDULE[p.schedule][1])}</div>
            <div class="body">
              <div class="split"><h3>${esc(p.name)}</h3><span class="small muted">${esc(p.city)}</span></div>
              <div class="small ink-2">${esc(p.client)} · מנהל: ${esc(p.pm)}</div>
              <div class="split small" style="margin-top:10px"><span>${esc(p.stage)}</span><b class="num">${p.progress}%</b></div>
              <div class="progress dark" style="margin-top:4px"><i style="width:${p.progress}%"></i></div>
              <div class="meta">
                <div><b>${p.openTasks}</b><span>משימות פתוחות</span></div>
                <div><b class="${p.pendingApprovals ? 'alert' : ''}">${p.pendingApprovals}</b><span>ממתינים ללקוח</span></div>
                <div><b class="${p.alerts ? 'alert' : ''}">${p.alerts}</b><span>התראות</span></div>
              </div>
            </div>
          </article>`).join('') || '<div class="empty">אין פרויקטים שמתאימים לסינון</div>'}
      </div>`,
    mount(root) {
      const go = () => App.go('bo-home', { pm: root.querySelector('#bo-pm').value, stage: root.querySelector('#bo-stage').value, st: root.querySelector('#bo-st').value, c: root.querySelector('#bo-c').value }, true);
      ['#bo-pm', '#bo-stage', '#bo-st'].forEach((s) => (root.querySelector(s).onchange = go));
      let t;
      const c = root.querySelector('#bo-c');
      c.oninput = () => { clearTimeout(t); t = setTimeout(go, 300); };
      if (f.c) { c.focus(); c.setSelectionRange(f.c.length, f.c.length); }
      root.querySelectorAll('[data-p]').forEach((el) => {
        const open = () => {
          if (el.dataset.p === Store.data.project.id) App.go('bo-project');
          else toast('בהדגמה, רק "בית אברהמי" מלא בנתונים');
        };
        el.onclick = open;
        el.onkeydown = (e) => { if (e.key === 'Enter') open(); };
      });
    },
  };
};

/* ---------- ניהול פרויקט ---------- */
const PROJECT_ACTIONS = [
  ['weekly', 'send', 'שליחת עדכון ללקוח'],
  ['stage', 'timeline', 'עדכון שלב והתקדמות'],
  ['timeline', 'history', 'עדכון לוח זמנים'],
  ['details', 'edit', 'עריכת פרטי פרויקט'],
  ['plan', 'plans', 'העלאת תכנית'],
  ['version', 'layers', 'העלאת גרסה חדשה'],
  ['approval', 'check', 'בקשת אישור מהלקוח'],
  ['task', 'tasks', 'משימה ללקוח'],
  ['material', 'materials', 'הוספת חומר'],
  ['photos', 'camera', 'העלאת תמונות'],
  ['doc', 'documents', 'העלאת מסמך'],
  ['payment', 'finance', 'עדכון תשלום'],
  ['change', 'plus', 'שינוי / תוספת'],
  ['pro', 'pros', 'הוספת בעל מקצוע'],
  ['ticket', 'service', 'טיפול בפניית שירות'],
  ['member', 'users', 'הזמנת משתמש לפרויקט'],
];

const ACTIONS = {
  weekly() {
    const p = Store.data.project;
    formModal({
      title: 'עדכון שבועי ללקוח', intro: 'הטקסט יופיע בראש הדשבורד של המשפחה תחת "כרגע בפרויקט".',
      fields: [{ id: 'text', label: 'מה קורה בפרויקט השבוע', type: 'textarea', value: p.weekly.text, required: true }],
      submit: 'פרסום ללקוח',
      onSave(v) {
        p.weekly = { updated: TODAY, text: v.text };
        Store.log('עדכן את הסיכום השבועי', TEAM.pm.name);
        Store.notify('עדכון שבועי חדש מהפרויקט', 'home');
        Store.save();
        return 'העדכון פורסם ונשלחה התראה למשפחה';
      },
    });
  },
  stage() {
    const p = Store.data.project;
    formModal({
      title: 'עדכון שלב והתקדמות',
      fields: [
        { id: 'stage', label: 'שלב נוכחי', type: 'select', options: Store.data.timeline.map((s) => s.name), value: p.stage },
        { id: 'progress', label: 'אחוז התקדמות', type: 'range', value: p.progress },
      ],
      onSave(v) {
        p.stage = v.stage; p.progress = v.progress;
        Store.log(`עדכן שלב ל"${v.stage}" והתקדמות ל-${v.progress}%`, TEAM.pm.name);
        Store.save();
        return 'השלב וההתקדמות עודכנו';
      },
    });
  },
  timeline() {
    const tl = Store.data.timeline;
    formModal({
      title: 'עדכון לוח זמנים',
      fields: [
        { id: 'i', label: 'שלב', type: 'select', options: tl.map((s, i) => [i, s.name]), value: tl.findIndex((s) => s.status === 'active') },
        { id: 'status', label: 'סטטוס', type: 'select', options: [['future', 'לא התחיל'], ['active', 'בביצוע'], ['done', 'הסתיים'], ['delay', 'עיכוב']], value: 'active' },
        { id: 'as', label: 'תאריך התחלה בפועל', type: 'date' },
        { id: 'ae', label: 'תאריך סיום בפועל', type: 'date' },
        { id: 'note', label: 'הערה ללקוח', type: 'textarea' },
      ],
      onSave(v) {
        const s = tl[v.i];
        s.status = v.status;
        if (v.as) s.as = v.as;
        if (v.ae) s.ae = v.ae;
        if (v.status === 'done' && !s.ae) s.ae = TODAY;
        if (v.status !== 'future' && !s.as) s.as = TODAY;
        if (v.note) s.note = v.note;
        Store.log(`עדכן את שלב "${s.name}" ל${STATUS[v.status][1]}`, TEAM.pm.name);
        Store.save();
        return 'לוח הזמנים עודכן';
      },
    });
  },
  details() {
    const p = Store.data.project;
    formModal({
      title: 'פרטי פרויקט',
      fields: [
        { id: 'name', label: 'שם הפרויקט', value: p.name, required: true },
        { id: 'address', label: 'כתובת', value: p.address },
        { id: 'handover', label: 'תאריך מסירה משוער', type: 'date', value: p.handover },
        { id: 'image', label: 'תמונה ראשית', type: 'select', options: [['assets/img/hero-home.svg', 'איור: בית עם חצר'], ['assets/img/hero-4.jpg', 'סלון'], ['assets/img/hero-1.jpg', 'כניסה'], ['assets/img/hero-5.jpg', 'פינת אוכל'], ['assets/img/j-33.jpg', 'סלון 2']], value: p.image },
      ],
      onSave(v) { Object.assign(p, v); Store.log('עדכן את פרטי הפרויקט', TEAM.pm.name); Store.save(); return 'פרטי הפרויקט נשמרו'; },
    });
  },
  plan() {
    formModal({
      title: 'העלאת תכנית חדשה',
      fields: [
        { id: 'cat', label: 'קטגוריה', type: 'select', options: PLAN_CATEGORIES },
        { id: 'title', label: 'שם התכנית', required: true },
        { id: 'file', label: 'קובץ', type: 'file', accept: '.pdf,.dwg,.dwf,.xls,.xlsx,image/*' },
        { id: 'approve', label: 'לבקש אישור מהלקוח', type: 'checkbox', value: true },
      ],
      submit: 'העלאה',
      onSave(v) {
        const f = v.file[0];
        const id = 'pl' + Date.now();
        Store.data.plans.unshift({ id, cat: v.cat, title: v.title, status: v.approve ? 'pending' : 'new', versions: [{ v: 1, date: TODAY, by: TEAM.architect.name, note: 'גרסה ראשונה', file: f ? f.name.split('.').pop().toUpperCase().slice(0, 4) : 'PDF', size: f ? (f.size / 1048576).toFixed(1) + 'MB' : '—' }] });
        if (v.approve) Store.data.tasks.unshift({ id: 'k' + Date.now(), type: 'approval', title: `אישור ${v.title} V1`, sub: `ביקשה ${TEAM.architect.name} · ${fmtDateShort(TODAY)}`, ref: { page: 'plans', id }, level: 'red', done: false });
        Store.log(`העלה תכנית ${v.cat}: ${v.title} V1${v.approve ? ' וביקש אישור' : ''}`, TEAM.architect.name);
        Store.notify(`נוספה תכנית חדשה: ${v.title}`, 'plans');
        Store.save();
        return 'התכנית הועלתה והלקוח קיבל התראה';
      },
    });
  },
  version() {
    const plans = Store.data.plans;
    formModal({
      title: 'גרסה חדשה לתכנית', intro: 'הגרסה הקודמת נשמרת בהיסטוריה ולא נמחקת.',
      fields: [
        { id: 'id', label: 'תכנית', type: 'select', options: plans.map((p) => [p.id, `${p.cat} · ${p.title} (V${p.versions[0].v})`]) },
        { id: 'note', label: 'מה השתנה', type: 'textarea', required: true },
        { id: 'file', label: 'קובץ', type: 'file' },
        { id: 'approve', label: 'לבקש אישור מהלקוח', type: 'checkbox', value: true },
      ],
      submit: 'העלאת גרסה',
      onSave(v) {
        const p = plans.find((x) => x.id === v.id);
        const nv = p.versions[0].v + 1;
        p.versions.unshift({ v: nv, date: TODAY, by: TEAM.architect.name, note: v.note, file: p.versions[0].file, size: p.versions[0].size });
        p.status = v.approve ? 'pending' : 'new';
        if (v.approve) {
          Store.data.tasks.forEach((t) => { if (t.ref && t.ref.id === p.id) t.done = true; });
          Store.data.tasks.unshift({ id: 'k' + Date.now(), type: 'approval', title: `אישור ${p.title} V${nv}`, sub: `${v.note} · ${fmtDateShort(TODAY)}`, ref: { page: 'plans', id: p.id }, level: 'red', done: false });
        }
        Store.log(`העלה ${p.title} V${nv}`, TEAM.architect.name);
        Store.notify(`עודכנה תכנית: ${p.title} V${nv}${v.approve ? ' – נדרש אישורך' : ''}`, 'plans');
        Store.save();
        return `גרסה V${nv} הועלתה`;
      },
    });
  },
  approval() {
    const plans = Store.data.plans.filter((p) => p.status !== 'pending');
    formModal({
      title: 'בקשת אישור מהלקוח',
      fields: [
        { id: 'id', label: 'מה צריך לאשר', type: 'select', options: plans.map((p) => [p.id, `${p.title} V${p.versions[0].v}`]) },
        { id: 'sub', label: 'הסבר קצר ללקוח', placeholder: 'למשל: נדרש לפני הזמנת גופי התאורה' },
      ],
      submit: 'שליחת בקשה',
      onSave(v) {
        const p = Store.data.plans.find((x) => x.id === v.id);
        p.status = 'pending';
        Store.data.tasks.unshift({ id: 'k' + Date.now(), type: 'approval', title: `אישור ${p.title} V${p.versions[0].v}`, sub: v.sub || `נשלח ${fmtDateShort(TODAY)}`, ref: { page: 'plans', id: p.id }, level: 'red', done: false });
        Store.log(`ביקש אישור ל-${p.title} V${p.versions[0].v}`, TEAM.pm.name);
        Store.notify(`נדרש אישורך: ${p.title}`, 'tasks');
        Store.save();
        return 'הבקשה נשלחה ללקוח';
      },
    });
  },
  task() {
    formModal({
      title: 'משימה חדשה ללקוח',
      fields: [
        { id: 'title', label: 'משימה', required: true, placeholder: 'למשל: לבחור ידיות לארונות המטבח' },
        { id: 'sub', label: 'פרטים / תאריך יעד' },
        { id: 'level', label: 'דחיפות', type: 'select', options: [['red', 'דורש פעולה'], ['yellow', 'ממתין'], ['blue', 'לידיעה']] },
      ],
      onSave(v) {
        Store.data.tasks.unshift({ id: 'k' + Date.now(), type: 'info', title: v.title, sub: v.sub, ref: { page: 'tasks' }, level: v.level, done: false });
        Store.log(`פתח משימה ללקוח: ${v.title}`, TEAM.pm.name);
        Store.notify(`משימה חדשה: ${v.title}`, 'tasks');
        Store.save();
        return 'המשימה נוספה';
      },
    });
  },
  material() {
    formModal({
      title: 'הוספת חומר / פריט',
      fields: [
        { id: 'name', label: 'שם', required: true },
        { id: 'space', label: 'חלל', type: 'select', options: SPACES },
        { id: 'cat', label: 'קטגוריה', type: 'select', options: BUDGET_CATEGORIES },
        { id: 'maker', label: 'יצרן' }, { id: 'model', label: 'דגם' }, { id: 'sku', label: 'מק״ט' }, { id: 'color', label: 'גוון' },
        { id: 'supplier', label: 'ספק' }, { id: 'price', label: 'מחיר (לא חובה)', type: 'number' }, { id: 'warranty', label: 'אחריות' },
        { id: 'status', label: 'סטטוס', type: 'select', options: Object.keys(MATERIAL_STATUS) },
        { id: 'notes', label: 'הערות', type: 'textarea' },
      ],
      onSave(v) {
        Store.data.materials.push({ id: 'm' + Date.now(), ...v, price: v.price || null, unit: '', link: '', swatch: '#d8cfc0' });
        Store.log(`הוסיף חומר: ${v.name} (${v.space})`, TEAM.architect.name);
        Store.save();
        return 'הפריט נוסף לחומרים ובחירות';
      },
    });
  },
  photos() {
    formModal({
      title: 'עדכון תמונות ליומן',
      fields: [
        { id: 'title', label: 'כותרת', required: true },
        { id: 'stage', label: 'שלב', type: 'select', options: ['לפני', ...Store.data.timeline.map((s) => s.name)], value: Store.data.project.stage },
        { id: 'desc', label: 'תיאור קצר', type: 'textarea' },
        { id: 'files', label: 'תמונות (מהנייד או מהמחשב)', type: 'file', multiple: true, accept: 'image/*' },
      ],
      submit: 'פרסום',
      async onSave(v) {
        let photos = [];
        for (const f of [...v.files].slice(0, 6)) { const src = await readImage(f); if (src) photos.push(src); }
        if (!photos.length) photos = ['assets/img/j-28.jpg', 'assets/img/j-31.jpg'];
        Store.data.updates.unshift({ id: 'u' + Date.now(), date: TODAY, title: v.title, stage: v.stage, desc: v.desc, photos });
        Store.log(`העלה ${photos.length} תמונות: ${v.title}`, TEAM.pm.name);
        Store.notify(`נוספו ${photos.length} תמונות חדשות מהפרויקט`, 'photos');
        Store.save();
        return 'התמונות פורסמו ביומן הפרויקט';
      },
    });
  },
  doc() { uploadDocFlow(); },
  payment() {
    const open = Store.data.casaMilestones.filter((m) => !m.paid);
    if (!open.length) return toast('כל אבני הדרך שולמו');
    formModal({
      title: 'עדכון תשלום מהלקוח',
      fields: [
        { id: 'i', label: 'אבן דרך', type: 'select', options: open.map((m) => [Store.data.casaMilestones.indexOf(m), `${m.name} · ${ils(m.amount)}`]) },
        { id: 'date', label: 'תאריך תשלום', type: 'date', value: TODAY },
        { id: 'invoice', label: 'מספר חשבונית / קבלה', required: true },
      ],
      onSave(v) {
        const m = Store.data.casaMilestones[v.i];
        m.paid = v.date || TODAY;
        m.invoice = v.invoice;
        Store.data.expenses.find((e) => e.casa).payments.push({ date: m.paid, amount: m.amount });
        Store.log(`עדכן תשלום: ${m.name} ${ils(m.amount)}`, TEAM.office.name);
        Store.save();
        return 'התשלום נרשם';
      },
    });
  },
  change() {
    formModal({
      title: 'שינוי / תוספת לחוזה',
      fields: [
        { id: 'title', label: 'תיאור השינוי', required: true },
        { id: 'amount', label: 'עלות (₪)', type: 'number', required: true },
      ],
      submit: 'שליחה לאישור הלקוח',
      onSave(v) {
        const no = Math.max(0, ...Store.data.changes.map((c) => c.no)) + 1;
        const id = 'c' + Date.now();
        Store.data.changes.push({ id, no, title: v.title, amount: v.amount, status: 'pending', date: TODAY });
        Store.data.tasks.unshift({ id: 'k' + Date.now(), type: 'approval', title: `אישור שינוי #${no}: ${v.title}`, sub: `${ils(v.amount)} תוספת`, ref: { page: 'change', id }, level: 'yellow', done: false });
        Store.log(`הוסיף שינוי #${no} – ${v.title}`, TEAM.pm.name);
        Store.notify(`שינוי #${no} ממתין לאישורך`, 'tasks');
        Store.save();
        return `שינוי #${no} נשלח לאישור`;
      },
    });
  },
  pro() {
    formModal({
      title: 'בעל מקצוע / ספק',
      fields: [
        { id: 'cat', label: 'תחום', type: 'select', options: PRO_CATEGORIES },
        { id: 'name', label: 'שם', required: true }, { id: 'company', label: 'חברה' },
        { id: 'phone', label: 'טלפון', type: 'tel', required: true }, { id: 'warranty', label: 'אחריות עד (חודש)', type: 'month' },
        { id: 'note', label: 'הערה' },
      ],
      onSave(v) {
        Store.data.pros.push({ id: 'pr' + Date.now(), ...v });
        Store.log(`הוסיף בעל מקצוע: ${v.name} (${v.cat})`, TEAM.pm.name);
        Store.save();
        return 'בעל המקצוע נוסף';
      },
    });
  },
  ticket() {
    const open = Store.data.tickets.filter((t) => t.status !== 'נסגר');
    if (!open.length) return toast('אין פניות פתוחות');
    formModal({
      title: 'טיפול בפניית שירות',
      fields: [
        { id: 'id', label: 'פנייה', type: 'select', options: open.map((t) => [t.id, `#${t.no} ${t.title}`]) },
        { id: 'reply', label: 'תשובה ללקוח', type: 'textarea', required: true },
        { id: 'status', label: 'סטטוס', type: 'select', options: ['בטיפול', 'נסגר'] },
      ],
      onSave(v) {
        const t = Store.data.tickets.find((x) => x.id === v.id);
        t.reply = v.reply; t.status = v.status;
        Store.log(`עדכן פנייה #${t.no}: ${v.status}`, TEAM.pm.name);
        Store.notify(`עדכון בפנייה #${t.no}`, 'service');
        Store.save();
        return 'הפנייה עודכנה';
      },
    });
  },
  member() {
    formModal({
      title: 'הזמנת משתמש לפרויקט', intro: 'המשתמש יקבל קישור במייל או ב-SMS לבחירת סיסמה, ויראה רק את הפרויקט הזה.',
      fields: [
        { id: 'name', label: 'שם', required: true },
        { id: 'role', label: 'תפקיד', type: 'select', options: ['בעל הבית', 'בת/בן זוג', 'מעצב/ת מטעם המשפחה', 'בן משפחה נוסף', 'בעל מקצוע'] },
        { id: 'email', label: 'אימייל', type: 'email' }, { id: 'phone', label: 'טלפון', type: 'tel' },
      ],
      submit: 'שליחת הזמנה',
      onSave(v) {
        Store.data.members.push({ ...v, status: 'הוזמן' });
        Store.log(`הזמין את ${v.name} (${v.role}) לפרויקט`, TEAM.pm.name);
        Store.save();
        return `ההזמנה נשלחה ל${v.name}`;
      },
    });
  },
};

Pages['bo-project'] = () => {
  const d = Store.data;
  const p = d.project;
  const open = d.tasks.filter((t) => !t.done);
  return {
    title: p.name,
    html: `
      <div class="page-head">
        <div><a class="link-btn small" href="#/bo-home">← כל הפרויקטים</a><h1 style="margin-top:4px">${esc(p.name)}</h1><p>${esc(p.address)} · ${esc(TEAM[p.pm].name)}</p></div>
        <button class="btn btn-ghost" id="as-client">${icon('eye')}צפייה כלקוח</button>
      </div>
      <div class="kpis four">
        <div class="card stat"><div class="k">שלב</div><div class="v" style="font-size:20px">${esc(p.stage)}</div><div class="s">${p.progress}% התקדמות</div></div>
        <div class="card stat ${open.some((t) => t.level === 'red') ? 'alert' : ''}"><div class="k">ממתין ללקוח</div><div class="v">${open.length}</div><div class="s">${open.filter((t) => t.type === 'approval').length} אישורים</div></div>
        <div class="card stat"><div class="k">עדכון שבועי אחרון</div><div class="v" style="font-size:20px">${fmtDate(p.weekly.updated)}</div><div class="s">לפני ${daysBetween(p.weekly.updated, TODAY)} ימים</div></div>
        <div class="card stat"><div class="k">ניצול תקציב המשפחה</div><div class="v">${pct(financeModel(d).util)}</div></div>
      </div>
      <div class="section-title"><h2>פעולות</h2></div>
      <div class="actions-grid">
        ${PROJECT_ACTIONS.map(([k, ic, label]) => `<button class="action-tile" data-act="${k}">${icon(ic)}${esc(label)}</button>`).join('')}
      </div>
      <div class="grid md-2" style="margin-top:18px">
        <article class="card card-pad">
          <div class="card-head"><h3>ממתין ללקוח</h3></div>
          ${open.length ? `<ul class="action-list">${open.map((t) => `<li><span class="ico ${t.level}">${icon('clock')}</span><div class="txt"><b>${esc(t.title)}</b><span>${esc(t.sub)}</span></div></li>`).join('')}</ul>` : '<div class="empty">הלקוח סגר את כל המשימות</div>'}
        </article>
        <article class="card card-pad">
          <div class="card-head"><h3>יומן פעילות (Audit Log)</h3><a class="link-btn small" href="#/bo-audit">הכול</a></div>
          <ul class="audit">${d.audit.slice(0, 7).map((a) => `<li><span class="when">${fmtWhen(a.when)}</span><span class="what"><b>${esc(a.who)}</b> ${esc(a.what)}</span></li>`).join('')}</ul>
        </article>
      </div>`,
    mount(root) {
      root.querySelectorAll('[data-act]').forEach((b) => (b.onclick = () => ACTIONS[b.dataset.act]()));
      root.querySelector('#as-client').onclick = () => { Store.session.view = 'client'; Store.save(); App.go('home'); };
    },
  };
};

Pages['bo-audit'] = () => ({
  title: 'יומן פעילות',
  html: `
    <div class="page-head"><div><h1>יומן פעילות</h1><p>מי עשה מה ומתי בפרויקט בית אברהמי. הפעולות נשמרות ולא נמחקות.</p></div></div>
    <article class="card card-pad"><ul class="audit">${Store.data.audit.map((a) => `<li><span class="when">${fmtWhen(a.when)}</span><span class="what"><b>${esc(a.who)}</b> ${esc(a.what)}</span></li>`).join('')}</ul></article>`,
  mount() {},
});

/* ---------- פרויקט חדש ---------- */
Pages['bo-new'] = () => ({
  title: 'פרויקט חדש',
  html: `
    <div class="page-head"><div><a class="link-btn small" href="#/bo-home">← כל הפרויקטים</a><h1 style="margin-top:4px">פרויקט חדש</h1><p>אחרי השמירה אפשר לשלוח ללקוחות הזמנה לפתיחת משתמש</p></div></div>
    <form class="card card-pad" id="np" style="max-width:760px">
      <div class="form-grid two">
        <label class="field"><span>שם הפרויקט</span><input class="input" name="name" required placeholder="למשל: בית כהן"></label>
        <label class="field"><span>שם המשפחה</span><input class="input" name="family" required></label>
        <label class="field" style="grid-column:1/-1"><span>כתובת</span><input class="input" name="address"></label>
        <label class="field"><span>לקוח ראשי – שם</span><input class="input" name="c1"></label>
        <label class="field"><span>לקוח ראשי – אימייל / טלפון</span><input class="input" name="c1c"></label>
        <label class="field"><span>לקוח נוסף – שם</span><input class="input" name="c2"></label>
        <label class="field"><span>לקוח נוסף – אימייל / טלפון</span><input class="input" name="c2c"></label>
        <label class="field"><span>מנהל פרויקט</span><select class="input" name="pm"><option>רועי מזרחי</option><option>עדי פרידמן</option></select></label>
        <label class="field"><span>אדריכלית / מעצבת</span><select class="input" name="arch"><option>דנה לוין</option><option>שני ברק</option></select></label>
        <label class="field"><span>תאריך התחלה</span><input class="input" type="date" name="start" value="${TODAY}"></label>
        <label class="field"><span>תאריך יעד</span><input class="input" type="date" name="end"></label>
        <label class="field"><span>תקציב כולל של המשפחה (לא חובה)</span><input class="input" type="number" name="budget" inputmode="numeric"></label>
        <label class="field"><span>תמונה ראשית</span><input class="input" type="file" name="img" accept="image/*"></label>
      </div>
      <label class="check"><input type="checkbox" name="invite" checked><span>לשלוח ללקוחות הזמנה לפתיחת משתמש</span></label>
      <label class="check"><input type="checkbox" name="tpl" checked><span>ליצור לוח זמנים ותיקיות לפי התבנית הקבועה</span></label>
      <div class="row-actions"><button class="btn btn-primary" type="submit">${icon('check')}יצירת הפרויקט</button><a class="btn btn-ghost" href="#/bo-home">ביטול</a></div>
    </form>`,
  mount(root) {
    root.querySelector('#np').onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (!f.get('name') || !f.get('family')) return;
      Store.data.portfolio.push({ id: 'p' + Date.now(), name: f.get('name'), client: `משפחת ${f.get('family')}`, city: (f.get('address') || '').split(',').pop().trim() || '—', pm: f.get('pm'), stage: 'אפיון ופרוגרמה', progress: 0, openTasks: 0, pendingApprovals: 0, schedule: 'ok', alerts: 0, img: 'assets/img/t-102.jpg' });
      Store.log(`יצר פרויקט חדש: ${f.get('name')}`, TEAM.pm.name);
      Store.save();
      toast(f.get('invite') ? 'הפרויקט נוצר וההזמנות נשלחו ללקוחות' : 'הפרויקט נוצר');
      App.go('bo-home');
    };
  },
});

/* ---------- הרשאות ---------- */
Pages['bo-perms'] = () => {
  const roles = ['Admin', 'מנהל פרויקט', 'עובד / מעצבת', 'לקוח', 'בעל מקצוע / ספק'];
  const Y = '<span class="perm-yes">✓</span>', P = '<span class="perm-part">חלקי</span>', N = '<span class="perm-no">—</span>';
  const rows = [
    ['כל הפרויקטים', Y, N, N, N, N],
    ['הפרויקטים שבאחריותו', Y, Y, P, N, N],
    ['הפרויקט שלו בלבד', Y, Y, Y, Y, Y],
    ['יצירת פרויקט והזמנת לקוחות', Y, Y, N, N, N],
    ['העלאת תכניות וגרסאות', Y, Y, Y, N, N],
    ['אישור תכניות ושינויים', N, N, N, Y, N],
    ['תקציב הבית של המשפחה', Y, Y, N, Y, N],
    ['עלויות פנימיות ורווחיות', Y, P, N, N, N],
    ['עדכון תשלומים', Y, Y, N, P, N],
    ['תמונות ויומן', Y, Y, Y, Y, P],
    ['פניות שירות', Y, Y, P, Y, P],
    ['יומן פעילות (Audit Log)', Y, Y, N, N, N],
    ['חסימת משתמש / ניתוק גישה', Y, P, N, N, N],
  ];
  return {
    title: 'הרשאות',
    html: `
      <div class="page-head"><div><h1>הרשאות לפי תפקיד</h1><p>Role Based Permissions. לקוח ובעל מקצוע רואים רק את הפרויקט שלהם.</p></div></div>
      <article class="card"><div class="table-wrap"><table class="t perm-table">
        <thead><tr><th>יכולת</th>${roles.map((r) => `<th>${r}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${r[0]}</td>${r.slice(1).map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table></div></article>
      <div class="grid md-2" style="margin-top:14px">
        <article class="card card-pad"><h3 style="margin-bottom:8px">${icon('shield', 'xs')} אבטחה</h3>
          <ul class="ink-2" style="margin:0;padding-inline-start:18px">
            <li>הפרדה בין פרויקטים ברמת מסד הנתונים (Row Level Security), לא רק במסך</li>
            <li>קבצים בתיקייה פרטית, נפתחים רק דרך קישור זמני חתום</li>
            <li>תקשורת מוצפנת (HTTPS), סיסמאות מוצפנות, איפוס סיסמה במייל</li>
            <li>גיבוי יומי, יומן פעילות, חסימת משתמש בלחיצה</li>
          </ul></article>
        <article class="card card-pad"><h3 style="margin-bottom:8px">מה הלקוח לא רואה</h3>
          <ul class="ink-2" style="margin:0;padding-inline-start:18px">
            <li>עלויות פנימיות ומחירי קבלני משנה</li>
            <li>הערות פנימיות של הצוות</li>
            <li>פרויקטים של לקוחות אחרים</li>
            <li>טיוטות שעוד לא פורסמו</li>
          </ul></article>
      </div>`,
    mount() {},
  };
};
