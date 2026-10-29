// תזכורות יומיות. רץ מ־pg_cron כל בוקר (ראו migrations/20261029010000_weekly_cron.sql).
// אחריות על מוצרים שנרכשו: 90 יום לפני שהאחריות מסתיימת, המשפחה מקבלת מייל והתראה. על כל מוצר נשלחת תזכורת אחת.
// עבודות של קאסה פואבלו לא נכללות: רק פריטים בחומרים ובחירות שהוזן להם "אחריות עד".
// סודות: RESEND_API_KEY, MAIL_FROM, SITE_URL, CRON_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_URL') || 'https://itzik-max.github.io/casa-pueblo/';
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const fmt = (iso: string) => iso.slice(8, 10) + '.' + iso.slice(5, 7) + '.' + iso.slice(0, 4);

function ilToday() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false }).formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, hour: Number(p.hour) % 24 };
}
const days = (a: string, b: string) => Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5);

async function mail(to: string[], subject: string, html: string) {
  if (!to.length) return;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: Deno.env.get('MAIL_FROM') || 'Casa Pueblo <onboarding@resend.dev>', to, subject, html }),
  });
  if (!r.ok) throw new Error('mail failed: ' + (await r.text()).slice(0, 200));
}

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  const now = ilToday();
  if (now.hour !== 9) return Response.json({ skipped: `hour ${now.hour}` });
  const { data: rows } = await sb.from('projects').select('id, name, data, version').eq('archived', false);
  let sent = 0;
  for (const row of rows || []) {
    const d = row.data || {};
    const due = (d.materials || []).filter((m: any) => m.warrantyUntil && !m.warrantyNotified && days(now.date, m.warrantyUntil) <= 90 && days(now.date, m.warrantyUntil) >= 0);
    if (!due.length) continue;
    const { data: inv } = await sb.from('invites').select('email').eq('project_id', row.id);
    const to = (inv || []).map((x: any) => x.email);
    await mail(to, due.length === 1 ? `האחריות על ${due[0].name} מסתיימת בעוד פחות מ־3 חודשים` : `האחריות על ${due.length} מוצרים מסתיימת בקרוב`,
      `<div dir="rtl" style="font-family:Arial,sans-serif;background:#0c172a;padding:28px 14px;text-align:right"><div style="max-width:560px;margin:0 auto;background:#132440;border-radius:14px;padding:28px 24px;color:#f6f0e6;line-height:1.7">
        <h1 style="font-weight:400;font-size:22px;margin:0 0 8px">תזכורת אחריות</h1>
        <p style="color:#d8d2c7">האחריות על המוצרים האלה בבית שלכם מסתיימת בעוד פחות מ־3 חודשים. זה הזמן לבדוק שהכול תקין, ואם צריך, לפנות ליצרן או לספק.</p>
        <ul>${due.map((m: any) => `<li><b>${esc(m.name)}</b>${m.maker ? ` · ${esc(m.maker)}` : ''} · עד ${fmt(m.warrantyUntil)}${m.contactPhone ? ` · ${esc(m.contactName || '')} <span dir="ltr">${esc(m.contactPhone)}</span>` : ''}</li>`).join('')}</ul>
        <a href="${SITE}#/service" style="display:inline-block;background:#d4b483;color:#0c172a;text-decoration:none;font-weight:bold;padding:11px 22px;border-radius:10px">לפרטים באזור האישי</a>
      </div></div>`);
    due.forEach((m: any) => (m.warrantyNotified = now.date));
    d.notifications = d.notifications || [];
    d.notifications.unshift({ id: 'n' + Date.now(), text: `האחריות על ${due.map((m: any) => m.name).join(', ')} מסתיימת בעוד פחות מ־3 חודשים`, when: `${now.date} 09:00`, read: false, link: 'service' });
    await sb.from('projects').update({ data: d, version: row.version + 1, updated_at: new Date().toISOString() }).eq('id', row.id).eq('version', row.version);
    sent += due.length;
  }
  return Response.json({ sent });
});
