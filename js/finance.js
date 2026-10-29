/* כספים ותשלומים: A) settlement with Casa Pueblo, B) whole-house budget. */

Pages.finance = (q) => {
  const tab = ['casa', 'budget', 'expenses'].includes(q.tab) ? q.tab : 'casa';
  const body = tab === 'casa' ? financeCasa() : tab === 'budget' ? financeBudget(q) : financeExpenses(q);
  return {
    title: 'כספים ותשלומים',
    html: `
      <div class="page-head"><div><h1>כספים ותקציב</h1><p>כל התמונה הכספית של הפרויקט במקום אחד</p></div>
        <button class="btn btn-accent" id="fx-add">${icon('plus')}הוספת הוצאה</button></div>
      <div class="tabs" role="tablist">
        <button role="tab" aria-selected="${tab === 'casa'}" data-tab="casa">תשלומים לקאסה פואבלו</button>
        <button role="tab" aria-selected="${tab === 'budget'}" data-tab="budget">תקציב הבית</button>
        <button role="tab" aria-selected="${tab === 'expenses'}" data-tab="expenses">הוצאות ורכישות</button>
      </div>
      ${body}`,
    mount(root) {
      root.querySelectorAll('[data-tab]').forEach((b) => (b.onclick = () => App.go('finance', { tab: b.dataset.tab })));
      root.querySelector('#fx-add').onclick = () => expenseForm();
      root.querySelectorAll('[data-exp]').forEach((r) => (r.onclick = () => expenseDetail(r.dataset.exp)));
      root.querySelectorAll('[data-view]').forEach((b) => (b.onclick = () => App.go('finance', { ...q, tab, view: b.dataset.view })));
      root.querySelectorAll('[data-fcat]').forEach((b) => (b.onclick = () => App.go('finance', { tab: 'expenses', cat: b.dataset.fcat })));
      bindTips(root);
    },
  };
};

function financeCasa() {
  const d = Store.data;
  const cm = casaModel(d);
  return `
    <div class="kpis five">
      <div class="card stat"><div class="k">סה״כ התקשרות</div><div class="v num">${ils(cm.total)}</div><div class="s">כולל שינויים מאושרים ${ils(cm.approvedChanges)}</div></div>
      <div class="card stat"><div class="k">שולם</div><div class="v num">${ils(cm.paid)}</div><div class="s">${pct(cm.paid / cm.total * 100, 0)} מההתקשרות</div></div>
      <div class="card stat"><div class="k">יתרה לתשלום</div><div class="v num">${ils(cm.left)}</div><div class="s">${cm.ms.filter((m) => !m.paid).length} אבני דרך פתוחות</div></div>
      <div class="card stat accent"><div class="k">התשלום הבא</div><div class="v num">${cm.next ? ils(cm.next.amount) : '—'}</div><div class="s">${cm.next ? esc(cm.next.name) : ''}</div></div>
      <div class="card stat"><div class="k">מועד התשלום הבא</div><div class="v">${cm.next ? fmtDate(cm.next.due) : '—'}</div><div class="s">${cm.next ? `בעוד ${daysBetween(TODAY, cm.next.due)} ימים` : ''}</div></div>
    </div>

    <div class="grid wide-left" style="margin-top:14px">
      <article class="card card-pad">
        <div class="card-head"><h3>אבני דרך לתשלום</h3><span class="small muted">${cm.ms.filter((m) => m.paid).length} מתוך ${cm.ms.length} שולמו</span></div>
        <div class="progress dark terra" style="margin-bottom:6px"><i style="width:${(cm.paid / cm.total * 100).toFixed(1)}%"></i></div>
        <ul class="milestones">
          ${cm.ms.map((m) => `
            <li class="${m.paid ? 'paid' : m === cm.next ? 'next' : ''}">
              <span class="mk">${m.paid ? icon('check') : ''}</span>
              <div><b>${esc(m.name)}</b><div class="small muted">${m.paid ? `שולם ${fmtDate(m.paid)} · ${esc(m.invoice)}` : `לתשלום עד ${fmtDate(m.due)}`}</div></div>
              <div class="num" style="font-weight:700">${ils(m.amount)}</div>
            </li>`).join('')}
        </ul>
      </article>
      <div class="stack">
        <article class="card">
          <div class="card-pad" style="padding-bottom:4px"><h3>חשבוניות, קבלות ואסמכתאות</h3></div>
          <ul class="rows">
            ${cm.ms.filter((m) => m.paid).slice().reverse().map((m) => `<li class="row compact">${fileIco('PDF')}
              <div class="main-col"><div class="title">${esc(m.invoice)}</div><div class="sub">${esc(m.name)} · ${fmtDate(m.paid)}</div></div>
              <div class="end"><b class="num small">${ils(m.amount)}</b></div></li>`).join('')}
          </ul>
        </article>
        <article class="card">
          <div class="card-pad" style="padding-bottom:4px"><h3>שינויים ותוספות</h3></div>
          <ul class="rows">
            ${d.changes.map((c) => `<li class="row compact"><div class="main-col"><div class="title">#${c.no} ${esc(c.title)}</div><div class="sub">${fmtDate(c.date)}</div></div>
              <div class="end"><span class="num small">${ils(c.amount)}</span>${c.status === 'approved' ? pill('green', 'אושר') : pill('yellow', 'ממתין')}</div></li>`).join('')}
          </ul>
        </article>
      </div>
    </div>`;
}

function financeBudget(q) {
  const fm = financeModel(Store.data);
  const view = q.view === 'table' ? 'table' : 'chart';
  const overs = fm.cats.filter((c) => c.over);
  return `
    <div class="kpis six">
      <div class="card stat"><div class="k">תקציב כולל</div><div class="v num">${ils(fm.budget)}</div></div>
      <div class="card stat"><div class="k">התחייבויות</div><div class="v num">${ils(fm.commit)}</div><div class="s">הזמנות וחוזים</div></div>
      <div class="card stat"><div class="k">שולם בפועל</div><div class="v num">${ils(fm.paid)}</div></div>
      <div class="card stat"><div class="k">יתרה לתשלום</div><div class="v num">${ils(fm.toPay)}</div><div class="s">התחייבויות שטרם שולמו</div></div>
      <div class="card stat ${fm.free < 0 ? 'alert' : ''}"><div class="k">תקציב פנוי</div><div class="v num">${ils(fm.free)}</div></div>
      <div class="card stat"><div class="k">ניצול תקציב</div><div class="v num">${pct(fm.util)}</div><div class="s">התחייבויות מתוך התקציב</div></div>
    </div>

    <article class="card card-pad" style="margin-top:14px">
      <div class="card-head"><h3>תקציב מול התחייבויות מול תשלום בפועל</h3></div>
      <p class="chart-sub">ההבדל בין כסף שכבר יצא לבין הזמנות שעוד ישולמו. לדוגמה, מטבח שהוזמן ב-₪120,000 עם מקדמה של ₪30,000 נספר כ-₪30,000 ששולמו ועוד ₪90,000 של התחייבות.</p>
      ${budgetMeter(fm)}
    </article>

    ${overs.length ? `<div class="card card-pad alert-card" style="margin-top:14px">
      <span class="ico">${icon('alert')}</span>
      <div><b>חריגה מהתקציב ב${overs.map((c) => esc(c.name)).join(', ')}</b>
        <div class="small ink-2">${overs.map((c) => `${esc(c.name)}: התחייבות ${ils(c.commit)} מול תקציב ${ils(c.budget)} (חריגה של ${ils(c.commit - c.budget)})`).join(' · ')}</div></div>
    </div>` : ''}

    <article class="card card-pad chart-card" style="margin-top:14px">
      <div class="card-head"><h3>תקציב מול ביצוע לפי קטגוריה</h3>
        <div class="seg" role="group" aria-label="תצוגה"><button aria-pressed="${view === 'chart'}" data-view="chart">גרף</button><button aria-pressed="${view === 'table'}" data-view="table">טבלה</button></div>
      </div>
      ${view === 'chart' ? budgetVsActualChart(fm.cats) : budgetTable(fm)}
    </article>

    <div class="grid md-2" style="margin-top:14px">
      <article class="card card-pad chart-card">
        <div class="card-head"><h3>חלוקת ההוצאות לפי קטגוריה</h3></div>
        <p class="chart-sub">איזה חלק מההתחייבויות הלך לכל תחום</p>
        ${shareChart(fm.cats.filter((c) => c.commit > 0).sort((a, b) => b.commit - a.commit), 'commit', fm.commit, { label: 'התחייבות' })}
      </article>
      <article class="card card-pad chart-card">
        <div class="card-head"><h3>כמה הושקע בכל חלל</h3></div>
        <p class="chart-sub">הוצאה ששויכה לכמה חללים מתחלקת ביניהם שווה בשווה</p>
        ${shareChart(fm.spaces, 'commit', fm.commit, { label: 'התחייבות' })}
      </article>
    </div>

    <article class="card card-pad chart-card" style="margin-top:14px">
      <div class="card-head"><h3>תשלומים לאורך זמן</h3><span class="small muted">החודש עם התשלום הגבוה ביותר מסומן</span></div>
      <p class="chart-sub">כמה כסף יצא בפועל בכל חודש</p>
      ${monthlyChart(fm.months)}
    </article>

    <article class="card" style="margin-top:14px">
      <div class="card-pad" style="padding-bottom:4px"><h3>תשלומים קרובים לספקים</h3></div>
      <ul class="rows">
        ${fm.upcoming.slice(0, 6).map((e) => `<li class="row clickable compact" data-exp="${e.id}">
          <div class="main-col"><div class="title">${esc(e.supplier)} · ${esc(e.item)}</div><div class="sub">${fmtDate(e.next)} · יתרה ${ils(e.remaining)}</div></div>
          <div class="end">${daysBetween(TODAY, e.next) < 0 ? pill('red', 'באיחור') : daysBetween(TODAY, e.next) <= 30 ? pill('yellow', 'החודש') : pill('gray', 'בהמשך')}</div></li>`).join('')}
      </ul>
    </article>`;
}

function budgetTable(fm) {
  const rows = fm.cats.filter((c) => c.budget || c.commit);
  const tot = rows.reduce((a, c) => ({ budget: a.budget + c.budget, commit: a.commit + c.commit, paid: a.paid + c.paid }), { budget: 0, commit: 0, paid: 0 });
  return `<div class="table-wrap"><table class="t">
    <thead><tr><th>קטגוריה</th><th class="n">תקציב</th><th class="n">התחייבות</th><th class="n">שולם</th><th class="n">יתרה</th></tr></thead>
    <tbody>
      ${rows.map((c) => `<tr class="${c.over ? 'over' : ''} clickable" data-fcat="${esc(c.name)}">
        <td>${esc(c.name)} ${c.over ? `<span class="over-flag">${icon('alert')}חריגה</span>` : ''}</td>
        <td class="n">${ils(c.budget)}</td><td class="n">${ils(c.commit)}</td><td class="n">${ils(c.paid)}</td>
        <td class="n ${c.left < 0 ? 'neg' : ''}">${ils(c.left)}</td></tr>`).join('')}
      <tr class="total"><td>סה״כ</td><td class="n">${ils(tot.budget)}</td><td class="n">${ils(tot.commit)}</td><td class="n">${ils(tot.paid)}</td><td class="n">${ils(tot.budget - tot.commit)}</td></tr>
    </tbody></table></div>`;
}

function financeExpenses(q) {
  const fm = financeModel(Store.data);
  const cat = q.cat || 'הכול';
  const cats = ['הכול', ...fm.cats.filter((c) => c.count).map((c) => c.name)];
  const list = fm.exps.filter((e) => cat === 'הכול' || e.cat === cat).sort((a, b) => b.date.localeCompare(a.date));
  const sum = list.reduce((a, e) => ({ total: a.total + e.total, paid: a.paid + e.paid }), { total: 0, paid: 0 });
  return `
    <div class="chips" role="group" aria-label="סינון לפי קטגוריה">
      ${cats.map((c) => `<button class="chip" aria-pressed="${c === cat}" data-fcat="${esc(c)}">${esc(c)}</button>`).join('')}
    </div>
    <article class="card">
      <div class="table-wrap"><table class="t">
        <thead><tr><th>תאריך</th><th>ספק</th><th>פריט</th><th>קטגוריה</th><th>חללים</th><th class="n">עלות</th><th class="n">שולם</th><th class="n">יתרה</th><th>סטטוס</th></tr></thead>
        <tbody>
          ${list.map((e) => `<tr class="clickable" data-exp="${e.id}">
            <td class="num">${fmtDate(e.date)}</td><td>${esc(e.supplier)}</td><td>${esc(e.item)}</td><td>${esc(e.cat)}</td>
            <td class="small">${e.spaces.map(esc).join(', ')}</td>
            <td class="n">${ils(e.total)}</td><td class="n">${ils(e.paid)}</td><td class="n">${ils(e.remaining)}</td>
            <td>${matPill(e.status)}</td></tr>`).join('')}
          <tr class="total"><td colspan="5">סה״כ ${list.length} הוצאות</td><td class="n">${ils(sum.total)}</td><td class="n">${ils(sum.paid)}</td><td class="n">${ils(sum.total - sum.paid)}</td><td></td></tr>
        </tbody>
      </table></div>
    </article>
    <p class="small muted">כל הוצאה נשמרת פעם אחת ומופיעה גם בחומרים, בבעלי המקצוע ובמסמכים, כך שלא צריך להזין אותה ארבע פעמים.</p>`;
}

function expenseDetail(id) {
  const e = Store.data.expenses.find((x) => x.id === id);
  const paid = expensePaid(e);
  const mat = e.material && Store.data.materials.find((m) => m.id === e.material);
  const docs = Store.data.documents.filter((x) => x.expense === e.id);
  const f = [
    ['תאריך', fmtDate(e.date)], ['ספק', e.supplier], ['קטגוריה', e.cat], ['חללים', e.spaces.join(', ')], ['פריט', e.item],
    ['יצרן/מותג', e.maker], ['דגם', e.model], ['מק״ט', e.sku], ['צבע / גוון', e.color],
    ['כמות', e.qty ? `${e.qty} ${e.unit || ''}` : ''], ['מחיר ליחידה', e.unitPrice ? ils(e.unitPrice) : ''],
    ['עלות כוללת', ils(e.total)], ['שולם בפועל', ils(paid)], ['יתרה לתשלום', ils(e.total - paid)],
    ['סטטוס', e.status], ['אמצעי תשלום', e.method], ['מועד תשלום הבא', e.next && paid < e.total ? fmtDate(e.next) : ''], ['מסמך מצורף', e.doc], ['הערות', e.notes],
  ].filter(([, v]) => v);
  openModal({
    title: e.item,
    body: `
      <dl class="kv">${f.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      <h3 style="margin:16px 0 6px;font-size:15px;color:var(--navy)">תשלומים</h3>
      <ul class="version-list">${e.payments.map((p) => `<li><span class="d">${fmtDate(p.date)}</span><b class="num">${ils(p.amount)}</b></li>`).join('')}</ul>
      <div class="card card-pad" style="margin-top:14px;background:var(--sand);box-shadow:none">
        <div class="small muted" style="margin-bottom:4px">${icon('link', 'xs')} הרשומה מופיעה גם ב:</div>
        <div class="small">כספים ← ${esc(e.cat)}</div>
        ${mat ? `<div class="small">חומרים ← ${esc(mat.space)} ← ${esc(mat.name)}</div>` : ''}
        <div class="small">ספקים ← ${esc(e.supplier)}</div>
        ${docs.length ? `<div class="small">מסמכים ← ${docs.map((x) => esc(x.cat)).join(', ')}</div>` : ''}
      </div>`,
    foot: e.total > paid ? `<button class="btn btn-primary" id="ex-pay">${icon('plus')}רישום תשלום</button>` : '',
    onOpen(el) {
      const b = el.querySelector('#ex-pay');
      if (b) b.onclick = () => { closeModal(); paymentForm(e.id); };
    },
  });
}

function paymentForm(id) {
  const e = Store.data.expenses.find((x) => x.id === id);
  const left = e.total - expensePaid(e);
  openModal({
    title: `רישום תשלום · ${e.supplier}`,
    body: `
      <label class="field"><span>סכום (₪)</span><input class="input num" id="pf-amt" type="number" inputmode="decimal" min="1" max="${left}" value="${left}"></label>
      <label class="field"><span>תאריך</span><input class="input" id="pf-date" type="date" value="${TODAY}"></label>
      <p class="form-hint">יתרה לתשלום: ${ils(left)}</p>`,
    foot: `<button class="btn btn-primary" id="pf-save">${icon('check')}שמירה</button>`,
    onOpen(el) {
      el.querySelector('#pf-save').onclick = () => {
        const amt = Math.min(Number(el.querySelector('#pf-amt').value) || 0, left);
        if (amt <= 0) return;
        e.payments.push({ date: el.querySelector('#pf-date').value || TODAY, amount: amt });
        Store.log(`רשם תשלום ${ils(amt)} ל${e.supplier}`);
        Store.save();
        closeModal();
        toast('התשלום נרשם, והתקציב עודכן');
        App.render();
      };
    },
  });
}

function expenseForm() {
  openModal({
    title: 'הוספת הוצאה / רכישה',
    body: `
      <div class="card card-pad" style="background:var(--sand);box-shadow:none;margin-bottom:14px;display:flex;gap:10px;align-items:center">
        ${icon('camera')}<div class="small">אפשר לצרף חשבונית, קבלה, הצעת מחיר או אישור הזמנה.<br><span class="muted">בשלב 2 המערכת תקרא את המסמך ותמלא את השדות לבד (OCR/AI).</span></div>
      </div>
      <label class="field"><span>מסמך מצורף</span><input class="input" type="file" id="xf-file" accept="image/*,application/pdf"></label>
      <div class="form-grid two">
        <label class="field"><span>תאריך</span><input class="input" type="date" id="xf-date" value="${TODAY}"></label>
        <label class="field"><span>ספק</span><input class="input" id="xf-sup" placeholder="למשל: נגב קרמיקה" list="xf-sups"></label>
        <label class="field"><span>פריט</span><input class="input" id="xf-item" placeholder="למשל: וילונות לסלון"></label>
        <label class="field"><span>קטגוריה</span><select class="input" id="xf-cat">${BUDGET_CATEGORIES.map((c) => `<option>${c}</option>`).join('')}</select></label>
        <label class="field"><span>יצרן / מותג</span><input class="input" id="xf-maker"></label>
        <label class="field"><span>דגם / מק״ט</span><input class="input" id="xf-model"></label>
        <label class="field"><span>עלות כוללת (₪)</span><input class="input num" type="number" inputmode="decimal" id="xf-total" min="0"></label>
        <label class="field"><span>שולם בפועל (₪)</span><input class="input num" type="number" inputmode="decimal" id="xf-paid" min="0" value="0"></label>
        <label class="field"><span>סטטוס</span><select class="input" id="xf-status"><option>הוזמן</option><option>בייצור</option><option>סופק</option><option>הותקן</option><option>הצעת מחיר</option></select></label>
        <label class="field"><span>אמצעי תשלום</span><select class="input" id="xf-method"><option>אשראי</option><option>העברה בנקאית</option><option>צ׳ק</option><option>מזומן</option></select></label>
        <label class="field"><span>מועד תשלום הבא</span><input class="input" type="date" id="xf-next"></label>
      </div>
      <div class="field"><span style="display:block;font-size:13px;font-weight:600;color:var(--ink-2);margin-bottom:6px">שיוך לחללים (אפשר לבחור כמה)</span>
        <div class="chips-input">${SPACES.map((s) => `<label><input type="checkbox" value="${esc(s)}"><span>${esc(s)}</span></label>`).join('')}</div></div>
      <label class="field"><span>הערות</span><input class="input" id="xf-notes" placeholder="למשל: כולל הובלה"></label>
      <label class="check"><input type="checkbox" id="xf-mat" checked><span>להוסיף גם ל"חומרים ובחירות"</span></label>
      <datalist id="xf-sups">${[...new Set(Store.data.expenses.map((e) => e.supplier))].map((s) => `<option value="${esc(s)}">`).join('')}</datalist>
      <p class="form-hint" id="xf-err" style="color:var(--st-red)"></p>`,
    foot: `<button class="btn btn-primary" id="xf-save">${icon('check')}שמירת ההוצאה</button>`,
    onOpen(el) {
      const $ = (s) => el.querySelector(s);
      $('#xf-save').onclick = async (ev) => {
        const total = Number($('#xf-total').value);
        const paid = Number($('#xf-paid').value) || 0;
        const item = $('#xf-item').value.trim();
        const sup = $('#xf-sup').value.trim();
        const spaces = [...el.querySelectorAll('.chips-input input:checked')].map((i) => i.value);
        if (!item || !sup || !(total > 0)) { $('#xf-err').textContent = 'צריך למלא ספק, פריט ועלות כוללת.'; return; }
        if (paid > total) { $('#xf-err').textContent = 'הסכום ששולם גבוה מהעלות הכוללת.'; return; }
        ev.target.disabled = true;
        let path = '';
        try { path = await storeFile($('#xf-file').files[0]); } catch (e) { ev.target.disabled = false; return; }
        const id = 'e' + Date.now();
        const cat = $('#xf-cat').value;
        const exp = {
          id, date: $('#xf-date').value || TODAY, supplier: sup, cat, spaces: spaces.length ? spaces : ['שטחים כלליים'], item,
          maker: $('#xf-maker').value.trim(), model: $('#xf-model').value.trim(), total, status: $('#xf-status').value,
          method: $('#xf-method').value, doc: $('#xf-file').files[0] ? 'חשבונית / הזמנה' : '', notes: $('#xf-notes').value.trim(),
          payments: paid ? [{ date: $('#xf-date').value || TODAY, amount: paid }] : [], next: $('#xf-next').value || '',
        };
        if ($('#xf-mat').checked) {
          const mid = 'm' + Date.now();
          Store.data.materials.push({ id: mid, name: item, cat, space: exp.spaces[0], maker: exp.maker, model: exp.model, sku: '', color: '', supplier: sup, price: null, unit: '', link: '', warranty: '', notes: exp.notes, status: exp.status === 'הצעת מחיר' ? 'נבחר' : exp.status, swatch: '#d8cfc0' });
          exp.material = mid;
        }
        if ($('#xf-file').files[0]) {
          Store.data.documents.unshift({ id: 'd' + Date.now(), cat: 'חשבוניות', title: `${sup} – ${item}`, date: exp.date, type: ($('#xf-file').files[0].name.split('.').pop() || 'PDF').toUpperCase().slice(0, 4), size: ($('#xf-file').files[0].size / 1048576).toFixed(1) + 'MB', expense: id, path });
        }
        Store.data.expenses.push(exp);
        Store.log(`הוסיף הוצאה: ${sup} – ${item} (${ils(total)})`);
        Store.save();
        closeModal();
        toast('ההוצאה נשמרה, והתקציב עודכן');
        App.go('finance', { tab: 'expenses' });
      };
    },
  });
}
