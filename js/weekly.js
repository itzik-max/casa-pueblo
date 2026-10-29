/* Weekly summary: what we did this week and what comes next.
   The team edits a draft during the week. On Friday at 15:00 Jorge gets an email to approve or fix it,
   and at 17:00 the approved summary is published and the family is notified (supabase/functions/weekly). */

const WEEKLY_STATUS = { draft: ['yellow', 'טיוטה'], approved: ['blue', 'אושר, יישלח ב־17:00'], sent: ['green', 'נשלח ללקוחות'] };

function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

// The Friday this week's summary belongs to (today when it is Friday; after Friday it is next week's).
function summaryFriday(today = TODAY) {
  const d = parseDate(today);
  d.setDate(d.getDate() + ((5 - d.getDay() + 7) % 7));
  return isoDate(d);
}

function weeklyList(d) { return d.weeklySummaries || (d.weeklySummaries = []); }
function weeklyFor(d, friday) { return weeklyList(d).find((w) => w.week === friday); }
function latestSentSummary(d) { return weeklyList(d).filter((w) => w.status === 'sent').sort((a, b) => b.week.localeCompare(a.week))[0]; }

// A first draft from what happened in the project this week. The team edits it before approval.
function weeklyDraft(d, friday) {
  const end = parseDate(friday);
  const start = new Date(+end - 6 * 864e5);
  const inWeek = (s) => s && parseDate(s) >= start && parseDate(s) <= end;
  const soon = (s) => s && parseDate(s) > end && parseDate(s) <= new Date(+end + 14 * 864e5);
  const done = [
    ...d.updates.filter((u) => inWeek(u.date)).map((u) => u.title + (u.desc ? `: ${u.desc.split('.')[0]}` : '')),
    ...d.timeline.filter((s) => inWeek(s.ae)).map((s) => `הסתיים שלב ${s.name}`),
    ...d.plans.filter((p) => inWeek(p.versions[0].date)).map((p) => `הועלתה ${p.title} (גרסה ${p.versions[0].v})`),
    ...d.changes.filter((c) => c.status === 'approved' && inWeek(c.date)).map((c) => `אושר שינוי #${c.no}: ${c.title}`),
  ];
  const next = [
    ...d.timeline.filter((s) => s.status === 'active' || s.status === 'delay').map((s) => `ממשיכים ב${s.name}${s.note ? ` (${s.note.split('.')[0]})` : ''}`),
    ...d.timeline.filter((s) => s.status === 'future' && soon(s.ps)).map((s) => `מתחילים את שלב ${s.name} ב־${fmtDateShort(s.ps)}`),
    ...d.tasks.filter((t) => !t.done && t.type === 'approval').map((t) => `מחכה לאישור שלכם: ${t.title.replace(/^אישור /, '')}`),
    ...d.casaMilestones.filter((m) => !m.paid && soon(m.due)).map((m) => `תשלום "${m.name}" ב־${fmtDateShort(m.due)}`),
  ];
  return { done: [...new Set(done)].slice(0, 8), next: [...new Set(next)].slice(0, 8) };
}

function bulletList(items) {
  return items.length ? `<ul class="wk-list">${items.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="small muted">—</p>';
}

// Marks a summary as sent: the family sees it on the home page and gets a notification.
function publishWeekly(d, w) {
  w.status = 'sent';
  w.sentAt = new Date().toISOString();
  d.project.weekly = { updated: TODAY, text: w.done[0] || d.project.weekly.text };
  Store.notify('הסיכום השבועי עלה: מה עשינו השבוע ומה הלאה', 'home');
  Store.log(`פרסם את הסיכום השבועי של ${fmtDateShort(w.week)}`);
}

/* ---------- Back Office ---------- */
Pages['bo-weekly'] = () => {
  const d = Store.data;
  if (d.empty) return Pages['bo-project']();
  const friday = summaryFriday();
  const w = weeklyFor(d, friday);
  const past = weeklyList(d).filter((x) => x !== w).sort((a, b) => b.week.localeCompare(a.week));
  const others = (d.portfolio || []).filter((p) => p.id !== d.project.id);
  return {
    title: 'סיכום שבועי',
    html: `
      <div class="page-head"><div><a class="link-btn small" href="#/bo-project">← ${esc(d.project.name)}</a><h1 style="margin-top:4px">סיכום שבועי · ${fmtDate(friday)}</h1>
        <p>ביום שישי ב־15:00 נשלח לחורחה מייל לאישור. ב־17:00 הסיכום שאושר עולה לאפליקציה, והמשפחה מקבלת התראה. סיכום שלא אושר לא נשלח.</p></div>
        ${w ? pill(...WEEKLY_STATUS[w.status]) : pill('gray', 'עוד לא נכתב')}</div>
      <article class="card card-pad" style="max-width:900px">
        <div class="form-grid two">
          <label class="field"><span>מה עשינו השבוע (שורה לכל נקודה)</span><textarea class="input" id="wk-done" rows="8">${esc((w ? w.done : []).join('\n'))}</textarea></label>
          <label class="field"><span>מה מתוכנן לשבוע הבא (שורה לכל נקודה)</span><textarea class="input" id="wk-next" rows="8">${esc((w ? w.next : []).join('\n'))}</textarea></label>
        </div>
        <div class="row-actions" style="flex-wrap:wrap">
          <button class="btn btn-ghost" id="wk-auto">${icon('edit')}מילוי אוטומטי ממה שקרה השבוע</button>
          <span class="spacer"></span>
          <button class="btn btn-ghost" id="wk-save">${isJorge() ? 'שמירת טיוטה' : 'שמירה (חורחה מאשר ושולח)'}</button>
          ${isJorge() ? `<button class="btn btn-primary" id="wk-approve">${icon('check')}אישור לשליחה ב־17:00</button>
          <button class="btn btn-accent" id="wk-now">${icon('send')}שליחה עכשיו</button>` : ''}
        </div>
        ${w && w.approvedBy ? `<p class="small muted" style="margin-bottom:0">אושר ע״י ${esc(w.approvedBy)}${w.approvedAt ? ` · ${fmtWhen(w.approvedAt.slice(0, 16).replace('T', ' '))}` : ''}</p>` : ''}
      </article>
      ${others.length ? `<div class="section-title" style="margin-top:22px"><h2>פרויקטים אחרים</h2></div>
        <div class="chips">${others.map((p) => `<button class="chip" data-wp="${p.id}">${esc(p.name)}</button>`).join('')}</div>` : ''}
      ${past.length ? `<div class="section-title" style="margin-top:22px"><h2>סיכומים קודמים</h2></div>
        <div class="grid md-2">${past.map((x) => `<article class="card card-pad"><div class="card-head"><h3>${fmtDate(x.week)}</h3>${pill(...WEEKLY_STATUS[x.status])}</div>
          <div class="small ink-2"><b>מה עשינו</b></div>${bulletList(x.done)}<div class="small ink-2"><b>מה הלאה</b></div>${bulletList(x.next)}</article>`).join('')}</div>` : ''}`,
    mount(root) {
      const lines = (id) => root.querySelector(id).value.split('\n').map((s) => s.replace(/^[\s•\-*]+/, '').trim()).filter(Boolean);
      const upsert = (status) => {
        let cur = weeklyFor(d, friday);
        if (!cur) { cur = { id: 'w' + Date.now(), week: friday, done: [], next: [], status: 'draft' }; weeklyList(d).unshift(cur); }
        cur.done = lines('#wk-done');
        cur.next = lines('#wk-next');
        cur.editedBy = currentUserName();
        if (status === 'approved' || status === 'now') { cur.status = 'approved'; cur.approvedBy = currentUserName(); cur.approvedAt = new Date().toISOString(); }
        else if (cur.status !== 'sent') cur.status = 'draft';
        return cur;
      };
      root.querySelector('#wk-auto').onclick = () => {
        const g = weeklyDraft(d, friday);
        if (!g.done.length && !g.next.length) return toast('לא מצאנו השבוע עדכונים, תכניות או שלבים. כותבים ידנית.');
        root.querySelector('#wk-done').value = g.done.join('\n');
        root.querySelector('#wk-next').value = g.next.join('\n');
        toast('הטיוטה מולאה. כדאי לעבור, לנסח ולמחוק מה שלא צריך.');
      };
      root.querySelector('#wk-save').onclick = () => { upsert('draft'); Store.log('עדכן את טיוטת הסיכום השבועי'); Store.save(); toast('הטיוטה נשמרה'); App.render(); };
      const ap = root.querySelector('#wk-approve');
      if (ap) ap.onclick = () => {
        const cur = upsert('approved');
        if (!cur.done.length) return toast('צריך לפחות נקודה אחת ב"מה עשינו"');
        Store.log('אישר את הסיכום השבועי');
        Store.save();
        toast('אושר. הסיכום יעלה ללקוחות ביום שישי ב־17:00');
        App.render();
      };
      const now = root.querySelector('#wk-now');
      if (now) now.onclick = async () => {
        const cur = upsert('now');
        if (!cur.done.length) return toast('צריך לפחות נקודה אחת ב"מה עשינו"');
        if (!confirm('לשלוח את הסיכום ללקוחות עכשיו?')) return;
        if (Store.live) {
          Store.save();
          await Live.flush();
          try { await Live.publishWeekly(d.project.id); await Live.open(d.project.id); toast('הסיכום נשלח, והמשפחה קיבלה מייל'); App.render(); return; }
          catch (e) { toast('שליחת המייל לא הצליחה (' + e.message + '). הסיכום עלה לאפליקציה בלי מייל.'); }
        }
        publishWeekly(d, cur);
        Store.save();
        App.render();
        if (!Store.live) toast('הסיכום עלה לאפליקציה, והמשפחה קיבלה התראה');
      };
      root.querySelectorAll('[data-wp]').forEach((b) => (b.onclick = () => {
        if (!Store.live) return toast('בהדגמה, רק "בית אברהמי" מלא בנתונים');
        Live.flush().then(() => Live.open(b.dataset.wp)).then(() => App.render());
      }));
    },
  };
};

/* ---------- Client: earlier summaries ---------- */
function openWeeklyHistory() {
  const list = weeklyList(Store.data).filter((w) => w.status === 'sent').sort((a, b) => b.week.localeCompare(a.week));
  openModal({
    title: 'הסיכומים השבועיים',
    wide: true,
    body: list.length ? list.map((w) => `<section style="margin-bottom:18px"><h3 style="margin:0 0 6px">שבוע שהסתיים ב־${fmtDate(w.week)}</h3>
      <div class="grid md-2"><div><div class="small ink-2"><b>מה עשינו</b></div>${bulletList(w.done)}</div><div><div class="small ink-2"><b>מה הלאה</b></div>${bulletList(w.next)}</div></div></section>`).join('<hr class="sep">')
      : '<div class="empty">עוד לא נשלחו סיכומים</div>',
  });
}
