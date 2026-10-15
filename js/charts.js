/* Finance model + lightweight HTML charts (no chart library). */

function expensePaid(e) { return e.payments.reduce((s, p) => s + p.amount, 0); }

function financeModel(d) {
  const exps = d.expenses.map((e) => ({ ...e, paid: expensePaid(e), remaining: e.total - expensePaid(e) }));
  const budget = d.project.budget;
  const commit = exps.reduce((s, e) => s + e.total, 0);
  const paid = exps.reduce((s, e) => s + e.paid, 0);

  const catNames = BUDGET_CATEGORIES.filter((c) => d.categoryBudgets[c] || exps.some((e) => e.cat === c));
  const cats = catNames.map((c) => {
    const list = exps.filter((e) => e.cat === c);
    const b = d.categoryBudgets[c] || 0;
    const cm = list.reduce((s, e) => s + e.total, 0);
    const pd = list.reduce((s, e) => s + e.paid, 0);
    return { name: c, budget: b, commit: cm, paid: pd, left: b - cm, over: cm > b, count: list.length };
  });

  // An expense tied to several spaces is split evenly between them.
  const spaceMap = {};
  exps.forEach((e) => {
    const share = e.total / e.spaces.length;
    const paidShare = e.paid / e.spaces.length;
    e.spaces.forEach((s) => {
      spaceMap[s] = spaceMap[s] || { name: s, commit: 0, paid: 0 };
      spaceMap[s].commit += share;
      spaceMap[s].paid += paidShare;
    });
  });
  const spaces = Object.values(spaceMap).sort((a, b) => b.commit - a.commit);

  const monthMap = {};
  exps.forEach((e) => e.payments.forEach((p) => { const k = p.date.slice(0, 7); monthMap[k] = (monthMap[k] || 0) + p.amount; }));
  const months = [];
  const start = parseDate(d.project.start);
  const end = parseDate(TODAY);
  for (let y = start.getFullYear(), m = start.getMonth(); y < end.getFullYear() || (y === end.getFullYear() && m <= end.getMonth()); m++) {
    if (m > 11) { m = 0; y++; }
    const k = `${y}-${String(m + 1).padStart(2, '0')}`;
    months.push({ key: k, label: HEB_MONTHS_SHORT[m], full: `${HEB_MONTHS[m]} ${y}`, amount: monthMap[k] || 0 });
  }

  const upcoming = exps.filter((e) => e.remaining > 0 && e.next).sort((a, b) => a.next.localeCompare(b.next));

  return {
    exps, cats, spaces, months, upcoming,
    budget, commit, paid,
    toPay: commit - paid,
    free: budget - commit,
    util: commit / budget * 100,
  };
}

function casaModel(d) {
  const ms = d.casaMilestones;
  const total = ms.reduce((s, m) => s + m.amount, 0);
  const paid = ms.filter((m) => m.paid).reduce((s, m) => s + m.amount, 0);
  const next = ms.find((m) => !m.paid);
  const approvedChanges = d.changes.filter((c) => c.status === 'approved').reduce((s, c) => s + c.amount, 0);
  return { ms, total, paid, left: total - paid, next, approvedChanges };
}

/* ---------- charts ---------- */

function legend(items) {
  return `<div class="legend">${items.map(([c, t]) => `<span><i class="sw" style="background:${c}"></i>${esc(t)}</span>`).join('')}</div>`;
}

// Budget vs commitment vs paid, one row per category. Nested bars on one axis.
function budgetVsActualChart(cats) {
  const rows = cats.filter((c) => c.budget || c.commit);
  const max = Math.max(...rows.map((c) => Math.max(c.budget, c.commit))) / 0.74; // leave room for the end label
  const w = (v) => (v / max * 100).toFixed(2) + '%';
  return `
    ${legend([['var(--c-budget)', 'תקציב'], ['var(--c-commit)', 'התחייבות'], ['var(--c-paid)', 'שולם בפועל'], ['var(--st-red)', 'חריגה מהתקציב']])}
    <div class="hbars">
      ${rows.map((c) => {
        const tip = `<b>${esc(c.name)}</b>
          <div class="r"><span><i class="sw" style="background:var(--c-budget)"></i> תקציב</span><span>${ils(c.budget)}</span></div>
          <div class="r"><span><i class="sw" style="background:var(--c-commit)"></i> התחייבות</span><span>${ils(c.commit)}</span></div>
          <div class="r"><span><i class="sw" style="background:var(--c-paid)"></i> שולם</span><span>${ils(c.paid)}</span></div>
          <div class="r"><span>${c.over ? 'חריגה' : 'יתרה'}</span><span>${ils(Math.abs(c.left))}</span></div>`;
        return `
        <div class="hbar">
          <div class="lab" title="${esc(c.name)}">${esc(c.name)}</div>
          <div class="trk" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(c.name)}: תקציב ${ils(c.budget)}, התחייבות ${ils(c.commit)}, שולם ${ils(c.paid)}">
            <i class="b budget" style="width:${w(c.budget)}"></i>
            <i class="b commit" style="width:${w(Math.min(c.commit, c.budget || c.commit))}"></i>
            ${c.over && c.budget ? `<i class="b over" style="right:${w(c.budget)};width:${w(c.commit - c.budget)};border-radius:0 0 0 0"></i>` : ''}
            <i class="b paid" style="width:${w(c.paid)}"></i>
            <span class="val" style="right:${w(Math.max(c.budget, c.commit))}">${c.over ? `<span class="neg">+${ilsShort(c.commit - c.budget)}</span>` : ilsShort(c.budget)}</span>
          </div>
        </div>`;
      }).join('')}
    </div>`;
}

// Share-of-total as ranked bars (replaces a pie: many slices read better as bars).
function shareChart(items, valueKey, total, opts = {}) {
  const max = Math.max(...items.map((i) => i[valueKey]));
  return `<div class="hbars">
    ${items.map((it) => {
      const v = it[valueKey];
      const share = v / total * 100;
      const tip = `<b>${esc(it.name)}</b><div class="r"><span>${opts.label || 'סכום'}</span><span>${ils(v)}</span></div><div class="r"><span>מתוך הסך</span><span>${pct(share)}</span></div>`;
      return `<div class="hbar">
        <div class="lab" title="${esc(it.name)}">${esc(it.name)}</div>
        <div class="trk" tabindex="0" data-tip="${esc(tip)}" aria-label="${esc(it.name)}: ${ils(v)}, ${pct(share)}">
          <i class="b single" style="width:${(v / max * 66).toFixed(2)}%"></i>
          <span class="val" style="right:${(v / max * 66).toFixed(2)}%">${ilsShort(v)} · ${pct(share, 0)}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function niceMax(v) {
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

function monthlyChart(months) {
  const peak = Math.max(...months.map((m) => m.amount));
  const top = niceMax(peak);
  const lines = [0.5, 1].map((f) => `<div class="gl" style="bottom:${f * 100 * (172 / 190)}%"><span>${ilsShort(top * f)}</span></div>`).join('');
  return `
    <div class="cols" role="img" aria-label="תשלומים בפועל לפי חודש">
      ${lines}
      <div style="width:30px;flex:none"></div>
      ${months.map((m) => `
        <div class="c ${m.amount === peak && peak > 0 ? 'peak' : ''}" tabindex="0"
          data-tip="${esc(`<b>${m.full}</b>${ils(m.amount)} שולמו`)}" aria-label="${m.full}: ${ils(m.amount)}">
          <i style="height:${(m.amount / top * 100).toFixed(1)}%"></i>
        </div>`).join('')}
    </div>
    <div class="col-labels">${months.map((m) => `<span>${m.label}</span>`).join('')}</div>`;
}

// Budget split into paid / committed-not-paid / free in one meter.
function budgetMeter(fm) {
  const p = (v) => (v / fm.budget * 100).toFixed(2) + '%';
  const over = fm.free < 0;
  return `
    <div class="meter" role="img" aria-label="שולם ${ils(fm.paid)}, התחייבויות פתוחות ${ils(fm.toPay)}, פנוי ${ils(Math.max(fm.free, 0))}">
      <i style="width:${p(fm.paid)};background:var(--c-paid)" data-tip="${esc(`<b>שולם בפועל</b>${ils(fm.paid)}`)}"></i>
      <i style="width:${p(fm.toPay)};background:var(--c-commit)" data-tip="${esc(`<b>התחייבות שטרם שולמה</b>${ils(fm.toPay)}`)}"></i>
      <i style="flex:1;background:${over ? 'var(--st-red)' : 'var(--c-budget)'}" data-tip="${esc(`<b>${over ? 'חריגה' : 'תקציב פנוי'}</b>${ils(Math.abs(fm.free))}`)}"></i>
    </div>
    <div class="meter-legend">
      <span><i class="sw" style="background:var(--c-paid)"></i>שולם בפועל · <b class="num">${ils(fm.paid)}</b></span>
      <span><i class="sw" style="background:var(--c-commit)"></i>התחייבות שטרם שולמה · <b class="num">${ils(fm.toPay)}</b></span>
      <span><i class="sw" style="background:var(--c-budget)"></i>תקציב פנוי · <b class="num">${ils(fm.free)}</b></span>
    </div>`;
}

function progressRing(value, size = 64, stroke = 6, color = '#fff', track = 'rgba(255,255,255,.25)') {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="התקדמות ${value}%">
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${track}" stroke-width="${stroke}"/>
    <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${(c * (1 - value / 100)).toFixed(1)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>
    <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" fill="${color}" font-family="Assistant" font-weight="700" font-size="${size * 0.26}">${value}%</text>
  </svg>`;
}
