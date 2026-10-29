// הסיכום השבועי. רץ מ־pg_cron בכל יום שישי (ראו migrations/20261029010000_weekly_cron.sql), ומכפתור "שליחה עכשיו".
// 15:00 (שעון ישראל): טיוטה לכל פרויקט שאין לו, ומייל לחורחה עם כל הסיכומים לאישור או לתיקון.
// 17:00: כל סיכום שאושר עולה לאפליקציה, ובני המשפחה מקבלים מייל והתראה. סיכום שלא אושר לא נשלח, וחורחה מקבל על כך הודעה.
// סודות (Edge Function Secrets): RESEND_API_KEY, MAIL_FROM, SITE_URL, CRON_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_URL') || 'https://itzik-max.github.io/casa-pueblo/';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Summary = { id: string; week: string; done: string[]; next: string[]; status: 'draft' | 'approved' | 'sent'; approvedBy?: string; approvedAt?: string; sentAt?: string };

// Israel local date/time parts.
function il(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24, weekday: p.weekday };
}
function friday(dateISO: string) {
  const d = new Date(dateISO + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + ((5 - d.getUTCDay() + 7) % 7));
  return d.toISOString().slice(0, 10);
}
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const short = (iso: string) => iso.slice(8, 10) + '.' + iso.slice(5, 7);

// Same idea as weeklyDraft() in js/weekly.js.
function draft(d: any, fri: string): Summary {
  const end = new Date(fri + 'T23:59:59Z'), start = new Date(+end - 7 * 864e5);
  const inWeek = (s?: string) => !!s && new Date(s) > start && new Date(s) <= end;
  const done = [
    ...(d.updates || []).filter((u: any) => inWeek(u.date)).map((u: any) => u.title),
    ...(d.timeline || []).filter((s: any) => inWeek(s.ae)).map((s: any) => `הסתיים שלב ${s.name}`),
    ...(d.plans || []).filter((p: any) => inWeek(p.versions?.[0]?.date)).map((p: any) => `הועלתה ${p.title} (גרסה ${p.versions[0].v})`),
  ];
  const next = [
    ...(d.timeline || []).filter((s: any) => s.status === 'active' || s.status === 'delay').map((s: any) => `ממשיכים ב${s.name}`),
    ...(d.tasks || []).filter((t: any) => !t.done && t.type === 'approval').map((t: any) => `מחכה לאישור שלכם: ${String(t.title).replace(/^אישור /, '')}`),
  ];
  return { id: 'w' + Date.now(), week: fri, done: [...new Set(done)].slice(0, 8), next: [...new Set(next)].slice(0, 8), status: 'draft' };
}

async function mail(to: string[], subject: string, html: string) {
  if (!to.length) return;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'Casa Pueblo <onboarding@resend.dev>', to, subject, html }),
  });
  if (!r.ok) throw new Error('mail failed: ' + (await r.text()).slice(0, 200));
}

const shell = (body: string) => `<div dir="rtl" style="font-family:Arial,sans-serif;background:#0c172a;padding:28px 14px;text-align:right">
  <div style="max-width:560px;margin:0 auto;background:#132440;border-radius:14px;padding:28px 24px;color:#f6f0e6;line-height:1.7">${body}</div>
  <p style="text-align:center;font-size:11.5px;color:#7d8798;margin-top:14px">קאסה פואבלו · מקבוצת אופטימו ק. בע"מ</p></div>`;
const list = (xs: string[]) => xs.length ? `<ul style="margin:6px 0 14px;padding-right:18px">${xs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p style="color:#a9b2c1">—</p>';
const button = (href: string, text: string) => `<a href="${href}" style="display:inline-block;background:#d4b483;color:#0c172a;text-decoration:none;font-weight:bold;padding:11px 22px;border-radius:10px">${text}</a>`;

async function projects(pid?: string) {
  let q = sb.from('projects').select('id, name, data, version').eq('archived', false);
  if (pid) q = q.eq('id', pid);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
async function saveData(row: any, data: any, action: string) {
  const { error } = await sb.from('projects').update({ data, version: row.version + 1, updated_at: new Date().toISOString() }).eq('id', row.id).eq('version', row.version);
  if (error) throw error;
  await sb.from('audit_log').insert({ project_id: row.id, action, detail: { by: 'weekly' } });
}
async function approvers(): Promise<string[]> {
  const { data } = await sb.from('app_settings').select('value').eq('key', 'approver_emails').maybeSingle();
  return (data?.value as string[]) || [];
}
async function familyEmails(pid: string): Promise<string[]> {
  const { data } = await sb.from('invites').select('email').eq('project_id', pid);
  return (data || []).map((x: any) => x.email);
}
function stamp() {
  const t = il();
  const m = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', minute: '2-digit' }).format(new Date());
  return `${t.date} ${String(t.hour).padStart(2, '0')}:${m.padStart(2, '0')}`;
}

// 15:00 — drafts for every project, one email to the approvers.
async function review(fri: string) {
  const rows = await projects();
  const items: string[] = [];
  for (const row of rows) {
    const d = row.data || {};
    d.weeklySummaries = d.weeklySummaries || [];
    let w: Summary | undefined = d.weeklySummaries.find((x: Summary) => x.week === fri);
    if (!w) { w = draft(d, fri); d.weeklySummaries.unshift(w); await saveData(row, d, 'weekly-draft'); }
    if (w.status === 'sent') continue;
    const link = `${SITE}#/bo-weekly`;
    items.push(`<h2 style="font-weight:400;font-size:20px;margin:22px 0 4px">${esc(row.name)} ${w.status === 'approved' ? '<span style="font-size:13px;color:#8fd19e">· אושר</span>' : ''}</h2>
      <div style="color:#d4b483;font-size:13px">מה עשינו השבוע</div>${list(w.done)}
      <div style="color:#d4b483;font-size:13px">מה הלאה</div>${list(w.next)}
      ${button(link, w.status === 'approved' ? 'לתיקון' : 'לאישור או לתיקון')}`);
  }
  if (!items.length) return { review: 0 };
  await mail(await approvers(), `הסיכומים השבועיים לאישור · ${short(fri)}`, shell(`<h1 style="font-weight:400;font-size:24px;margin:0">הסיכומים השבועיים לאישור</h1>
    <p style="color:#d8d2c7">ב־17:00 הסיכומים שאושרו יעלו לאפליקציה, ובני המשפחה יקבלו מייל. סיכום שלא יאושר עד אז לא יישלח.</p>${items.join('<hr style="border:0;border-top:1px solid #2a3b5a;margin:22px 0">')}`));
  return { review: items.length };
}

// 17:00 (or "send now") — approved summaries go out.
async function publish(fri: string, pid?: string) {
  const rows = await projects(pid);
  let sent = 0;
  const skipped: string[] = [];
  for (const row of rows) {
    const d = row.data || {};
    const w: Summary | undefined = (d.weeklySummaries || []).find((x: Summary) => x.week === fri);
    if (!w || w.status === 'sent') continue;
    if (w.status !== 'approved') { skipped.push(row.name); continue; }
    w.status = 'sent';
    w.sentAt = new Date().toISOString();
    d.project.weekly = { updated: il().date, text: w.done[0] || d.project.weekly?.text || '' };
    d.notifications = d.notifications || [];
    d.notifications.unshift({ id: 'n' + Date.now(), text: 'הסיכום השבועי עלה: מה עשינו השבוע ומה הלאה', when: stamp(), read: false, link: 'home' });
    await saveData(row, d, 'weekly-sent');
    await mail(await familyEmails(row.id), `הסיכום השבועי של ${row.name} עלה`, shell(`<h1 style="font-weight:400;font-size:24px;margin:0">הסיכום השבועי עלה</h1>
      <p style="color:#d8d2c7">מה עשינו השבוע בבית שלכם ומה מתוכנן לשבוע הבא. כל הפרטים והתמונות באזור האישי.</p>
      <div style="color:#d4b483;font-size:13px">מה עשינו השבוע</div>${list(w.done)}
      <div style="color:#d4b483;font-size:13px">מה הלאה</div>${list(w.next)}
      ${button(SITE, 'כניסה ל־הבית שלי')}`));
    sent++;
  }
  if (!pid && skipped.length) {
    await mail(await approvers(), 'סיכומים שבועיים שלא נשלחו', shell(`<p>הסיכומים של ${skipped.map(esc).join(', ')} לא אושרו, ולכן לא נשלחו ללקוחות. אפשר לאשר אותם עכשיו ולשלוח מיד מהמסך "סיכום שבועי".</p>${button(SITE + '#/bo-weekly', 'למסך הסיכום השבועי')}`));
  }
  return { sent, skipped };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const body = await req.json().catch(() => ({}));
    const now = il();
    const fri = friday(now.date);

    // From pg_cron: decides by the Israel clock, so it works in summer and winter time.
    if (req.headers.get('x-cron-secret')) {
      if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return json({ error: 'forbidden' }, 403);
      if (now.weekday !== 'Fri') return json({ skipped: 'not friday' });
      if (now.hour === 15) return json(await review(fri));
      if (now.hour === 17) return json(await publish(fri));
      return json({ skipped: `hour ${now.hour}` });
    }

    // From the Back Office ("שליחה עכשיו"): staff only.
    const jwt = (req.headers.get('Authorization') || '').replace(/^Bearer /, '');
    const { data: u } = await sb.auth.getUser(jwt);
    if (!u?.user) return json({ error: 'not signed in' }, 401);
    const { data: prof } = await sb.from('profiles').select('is_staff').eq('id', u.user.id).maybeSingle();
    if (!prof?.is_staff) return json({ error: 'staff only' }, 403);
    if (body.mode === 'publish' && body.pid) return json(await publish(fri, body.pid));
    if (body.mode === 'review') return json(await review(fri));
    return json({ error: 'unknown mode' }, 400);
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
