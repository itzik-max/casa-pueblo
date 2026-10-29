// מייל לחורחה בכל פעם שעולה קובץ חדש (מסמך, תכנית או גרסה) ובכל פעם שהמשפחה מאשרת תכנית.
// נקרא מתוך save_project במסד (notify_jorge), לא מהדפדפן. הנמענים: app_settings.approver_emails.
// סודות: RESEND_API_KEY, MAIL_FROM, SITE_URL, CRON_SECRET.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const SITE = Deno.env.get('SITE_URL') || 'https://itzik-max.github.io/casa-pueblo/';
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const LABEL: Record<string, string> = { file: 'קובץ חדש', plan: 'תכנית חדשה או גרסה חדשה', approved: 'המשפחה אישרה תכנית' };

Deno.serve(async (req) => {
  if (req.headers.get('x-cron-secret') !== Deno.env.get('CRON_SECRET')) return new Response('forbidden', { status: 403 });
  const { pid, events = [], actor = '' } = await req.json();
  if (!events.length) return Response.json({ sent: 0 });
  const [{ data: proj }, { data: set }] = await Promise.all([
    sb.from('projects').select('name').eq('id', pid).maybeSingle(),
    sb.from('app_settings').select('value').eq('key', 'approver_emails').maybeSingle(),
  ]);
  const to = (set?.value as string[]) || [];
  if (!to.length) return Response.json({ sent: 0, reason: 'no approver' });
  const name = proj?.name || 'פרויקט';
  const approvedOnly = events.every((e: any) => e.kind === 'approved');
  const subject = approvedOnly ? `${name}: המשפחה אישרה ${events.length === 1 ? events[0].title : events.length + ' תכניות'}` : `${name}: ${events.length === 1 ? 'עלה ' + events[0].title : 'עלו ' + events.length + ' קבצים חדשים'}`;
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('MAIL_FROM') || 'Casa Pueblo <onboarding@resend.dev>',
      to,
      subject,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">
        <p><b>${esc(name)}</b>${actor ? ` · ${esc(actor)}` : ''}</p>
        <ul>${events.map((e: any) => `<li>${esc(LABEL[e.kind] || e.kind)}: <b>${esc(e.title)}</b>${e.cat ? ` (${esc(e.cat)})` : ''}</li>`).join('')}</ul>
        <p><a href="${SITE}">לכניסה ל־Back Office</a></p></div>`,
    }),
  });
  if (!r.ok) return Response.json({ error: (await r.text()).slice(0, 200) }, { status: 502 });
  return Response.json({ sent: events.length });
});
