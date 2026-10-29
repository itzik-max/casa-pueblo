/* The family's to-do list (description, owner, deadline) with "add to my calendar",
   and the WhatsApp / email share buttons used for every file in the app. */

/* ---------- calendar ---------- */
function icsDate(iso) { return iso.replace(/-/g, ''); }
function nextDay(iso) { const d = parseDate(iso); d.setDate(d.getDate() + 1); return isoDate(d); }

function googleCalLink(t) {
  const p = new URLSearchParams({ action: 'TEMPLATE', text: t.title, dates: `${icsDate(t.due)}/${icsDate(nextDay(t.due))}`, details: [t.desc, t.owner ? `אחריות: ${t.owner}` : '', 'מתוך CASA | הבית שלי'].filter(Boolean).join('\n') });
  return `https://calendar.google.com/calendar/render?${p}`;
}

function icsFor(items) {
  const escI = (s) => String(s || '').replace(/[\\,;]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const ev = items.filter((t) => t.due).map((t) => [
    'BEGIN:VEVENT', `UID:${t.id}@casa-portal`, `DTSTAMP:${now}`,
    `DTSTART;VALUE=DATE:${icsDate(t.due)}`, `DTEND;VALUE=DATE:${icsDate(nextDay(t.due))}`,
    `SUMMARY:${escI(t.title)}`, `DESCRIPTION:${escI([t.desc, t.owner ? 'אחריות: ' + t.owner : ''].filter(Boolean).join('\n'))}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${escI(t.title)}`, 'END:VALARM', 'END:VEVENT',
  ].join('\r\n'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Casa Pueblo//Home//HE', 'CALSCALE:GREGORIAN', ...ev, 'END:VCALENDAR'].join('\r\n');
}

function downloadIcs(items, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([icsFor(items)], { type: 'text/calendar;charset=utf-8' }));
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}

/* ---------- to-do ---------- */
function todos(d) { return d.todos || (d.todos = []); }

function todoForm(t = null) {
  const d = Store.data;
  const owners = [...new Set([...d.members.map((m) => m.name).filter(Boolean), 'קאסה פואבלו'])];
  openModal({
    title: t ? 'עריכת מטלה' : 'מטלה חדשה',
    body: `<form id="tdf" class="form-grid">
      <label class="field"><span>המטלה</span><input class="input" name="title" value="${esc(t ? t.title : '')}" placeholder="למשל: לבחור ידיות למטבח" required></label>
      <label class="field"><span>תיאור</span><textarea class="input" name="desc">${esc(t ? t.desc : '')}</textarea></label>
      <label class="field"><span>באחריות</span><input class="input" name="owner" list="td-owners" value="${esc(t ? t.owner : (d.members[0] && d.members[0].name) || '')}"></label>
      <datalist id="td-owners">${owners.map((o) => `<option value="${esc(o)}">`).join('')}</datalist>
      <label class="field"><span>דד ליין</span><input class="input" type="date" name="due" value="${esc(t ? t.due : '')}"></label>
      <label class="check"><input type="checkbox" name="cal" ${t ? '' : 'checked'}><span>להוסיף ליומן שלי אחרי השמירה</span></label>
    </form><p class="form-hint" id="tdf-err" style="color:var(--st-red)"></p>`,
    foot: `<button class="btn btn-primary" id="tdf-save">${icon('check')}שמירה</button>${t ? `<button class="btn btn-quiet" id="tdf-del">מחיקה</button>` : ''}<button class="btn btn-ghost" data-close>ביטול</button>`,
    onOpen(el) {
      setTimeout(() => el.querySelector('[name=title]').focus(), 50);
      el.querySelector('#tdf-save').onclick = () => {
        const f = new FormData(el.querySelector('#tdf'));
        const title = String(f.get('title') || '').trim();
        if (!title) { el.querySelector('#tdf-err').textContent = 'צריך לכתוב את המטלה'; return; }
        const item = t || { id: 'td' + Date.now(), done: false, createdBy: currentUserName(), created: TODAY };
        Object.assign(item, { title, desc: String(f.get('desc') || '').trim(), owner: String(f.get('owner') || '').trim(), due: String(f.get('due') || '') });
        if (!t) todos(d).push(item);
        Store.log(`${t ? 'עדכן' : 'הוסיף'} מטלה: ${title}`);
        Store.save();
        closeModal();
        App.render();
        if (f.get('cal') && item.due) addToCalendarFlow(item);
      };
      const del = el.querySelector('#tdf-del');
      if (del) del.onclick = () => {
        if (!confirm('למחוק את המטלה?')) return;
        d.todos = todos(d).filter((x) => x !== t);
        Store.save();
        closeModal();
        App.render();
      };
    },
  });
}

function addToCalendarFlow(t) {
  openModal({
    title: 'הוספה ליומן',
    body: `<p class="ink-2" style="margin-top:0">"${esc(t.title)}" · ${fmtDate(t.due)}. ביומן תופיע גם תזכורת יום לפני.</p>
      <div class="cal-btns">
        <a class="btn btn-primary" href="${googleCalLink(t)}" target="_blank" rel="noopener">${icon('timeline')}יומן Google</a>
        <button class="btn btn-ghost" id="cal-ics">${icon('download')}אייפון / Outlook</button>
      </div>`,
    onOpen(el) { el.querySelector('#cal-ics').onclick = () => { downloadIcs([t], 'casa-task.ics'); closeModal(); }; },
  });
}

Pages.todo = () => {
  const d = Store.data;
  const list = todos(d);
  const open = list.filter((t) => !t.done).sort((a, b) => (a.due || '9').localeCompare(b.due || '9'));
  const done = list.filter((t) => t.done);
  const row = (t) => {
    const late = !t.done && t.due && t.due < TODAY;
    const left = t.due ? daysBetween(TODAY, t.due) : null;
    return `<li class="row todo-row ${t.done ? 'is-done' : ''}">
      <label class="todo-check"><input type="checkbox" data-done="${t.id}" ${t.done ? 'checked' : ''} aria-label="בוצע"></label>
      <div class="main-col" data-edit="${t.id}">
        <div class="title">${esc(t.title)}</div>
        <div class="sub">${t.owner ? `באחריות ${esc(t.owner)}` : 'ללא אחראי'}${t.due ? ` · עד ${fmtDate(t.due)}` : ''}${t.desc ? ` · ${esc(t.desc)}` : ''}</div>
      </div>
      <div class="end">${t.done ? pill('green', 'בוצע') : late ? pill('red', 'באיחור') : left !== null && left <= 3 ? pill('yellow', left === 0 ? 'היום' : `בעוד ${left} ימים`) : ''}
        ${t.due && !t.done ? `<button class="icon-btn" data-cal="${t.id}" aria-label="הוספה ליומן" title="הוספה ליומן">${icon('timeline')}</button>` : ''}</div>
    </li>`;
  };
  return {
    title: 'המטלות שלי',
    html: `
      <div class="page-head"><div><h1>המטלות שלי</h1><p>הרשימה שלכם: מה צריך לעשות, מי אחראי ועד מתי. כל מטלה אפשר להכניס ליומן.</p></div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${open.some((t) => t.due) ? `<button class="btn btn-ghost" id="td-ics">${icon('download')}כל המטלות ליומן</button>` : ''}
          <button class="btn btn-accent" id="td-add">${icon('plus')}מטלה חדשה</button>
        </div>
      </div>
      <article class="card"><ul class="rows">${open.map(row).join('') || '<li class="empty">אין מטלות פתוחות</li>'}</ul></article>
      ${done.length ? `<div class="section-title" style="margin-top:22px"><h2>בוצעו</h2></div><article class="card"><ul class="rows">${done.map(row).join('')}</ul></article>` : ''}`,
    mount(root) {
      root.querySelector('#td-add').onclick = () => todoForm();
      const all = root.querySelector('#td-ics');
      if (all) all.onclick = () => downloadIcs(open, 'casa-tasks.ics');
      root.querySelectorAll('[data-done]').forEach((c) => (c.onchange = () => {
        const t = list.find((x) => x.id === c.dataset.done);
        t.done = c.checked;
        if (t.done) Store.log(`סימן כבוצע: ${t.title}`);
        Store.save();
        App.render();
      }));
      root.querySelectorAll('[data-edit]').forEach((r) => (r.onclick = () => todoForm(list.find((x) => x.id === r.dataset.edit))));
      root.querySelectorAll('[data-cal]').forEach((b) => (b.onclick = () => addToCalendarFlow(list.find((x) => x.id === b.dataset.cal))));
    },
  };
};

/* ---------- share a file: WhatsApp / email ---------- */
function shareButtons(size = '', key = 'main') {
  const sm = size === 'sm' ? 'btn-sm' : '';
  return `<button type="button" class="btn ${sm} btn-ghost" data-wa="${key}">${icon('whatsapp')}וואטסאפ</button><button type="button" class="btn ${sm} btn-ghost" data-mail="${key}">${icon('mail')}מייל</button>`;
}

// Wires the buttons from shareButtons(). item = { title, ref, file }.
function bindShare(el, item, key = 'main') {
  const wa = el.querySelector(`[data-wa="${key}"]`);
  const ml = el.querySelector(`[data-mail="${key}"]`);
  if (wa) wa.onclick = (e) => { e.stopPropagation(); shareWhatsApp(item); };
  if (ml) ml.onclick = (e) => { e.stopPropagation(); shareEmailFlow(item); };
}

async function fileBlob(item) {
  const url = media(item.ref);
  if (!url || !String(item.ref).startsWith('f:')) return null;
  const r = await fetch(url);
  const b = await r.blob();
  const ext = (item.file || 'pdf').toLowerCase();
  return new File([b], `${item.title.replace(/[\\/:*?"<>|]+/g, ' ').trim()}.${ext}`, { type: b.type || 'application/octet-stream' });
}

// On phones the share sheet attaches the file itself (pick WhatsApp). Elsewhere: WhatsApp with a download link.
async function shareWhatsApp(item) {
  try {
    const f = await fileBlob(item);
    if (f && navigator.canShare && navigator.canShare({ files: [f] })) {
      await navigator.share({ files: [f], title: item.title, text: item.title });
      return;
    }
    const link = media(item.ref);
    if (!link || !String(item.ref).startsWith('f:')) { toast('בגרסה המלאה הקובץ עצמו מצורף להודעה'); window.open(`https://wa.me/?text=${encodeURIComponent(item.title)}`, '_blank', 'noopener'); return; }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${item.title}\n${link}`)}`, '_blank', 'noopener');
  } catch (e) { if (e.name !== 'AbortError') toast('השיתוף לא הצליח: ' + e.message); }
}

// Sends the file as a real attachment (edge function "send-file").
function shareEmailFlow(item) {
  const me = Store.live && Live.user ? Live.user.email : '';
  openModal({
    title: 'שליחה במייל',
    body: `<p class="ink-2" style="margin-top:0">"${esc(item.title)}" יישלח כקובץ מצורף.</p>
      <label class="field"><span>אל (אפשר כמה כתובות, מופרדות בפסיק)</span><input class="input" id="se-to" type="email" dir="ltr" multiple value="${esc(me)}"></label>
      <label class="field"><span>הודעה (לא חובה)</span><textarea class="input" id="se-note"></textarea></label>
      <p class="form-hint" id="se-err" style="color:var(--st-red)"></p>`,
    foot: `<button class="btn btn-primary" id="se-send">${icon('send')}שליחה</button><button class="btn btn-ghost" data-close>ביטול</button>`,
    onOpen(el) {
      el.querySelector('#se-send').onclick = async (ev) => {
        const to = el.querySelector('#se-to').value.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
        if (!to.length || to.some((x) => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x))) { el.querySelector('#se-err').textContent = 'צריך כתובת מייל תקינה'; return; }
        const note = el.querySelector('#se-note').value.trim();
        if (!Store.live || !String(item.ref || '').startsWith('f:')) { closeModal(); toast('בגרסה המלאה הקובץ יישלח כקובץ מצורף ל־' + to.join(', ')); return; }
        ev.target.disabled = true;
        try {
          await Live.sendFile({ ref: item.ref, title: item.title, file: item.file, to, note });
          Store.log(`שלח במייל: ${item.title} ל־${to.join(', ')}`);
          Store.save();
          closeModal();
          toast('נשלח במייל');
        } catch (e) {
          ev.target.disabled = false;
          // Fallback: the user's own mail app with a download link.
          location.href = `mailto:${to.join(',')}?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(`${note ? note + '\n\n' : ''}${item.title}\n${media(item.ref)}`)}`;
        }
      };
    },
  });
}
