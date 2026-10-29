// שולח קובץ מהמערכת כקובץ מצורף במייל (כפתור "מייל" בתכניות, במסמכים ובחומרים).
// הקובץ נקרא עם ההרשאות של המשתמש ששולח, כך שאי אפשר לשלוח קובץ שהוא לא רשאי לראות.
// סודות: RESEND_API_KEY, MAIL_FROM.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
const esc = (s: string) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function b64(buf: ArrayBuffer) {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const auth = req.headers.get('Authorization') || '';
    const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: 'not signed in' }, 401);

    const { path, title, ext, to, note } = await req.json();
    const list = (Array.isArray(to) ? to : [to]).map((x: string) => String(x).trim().toLowerCase()).filter((x: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 10);
    if (!path || !list.length) return json({ error: 'missing file or recipient' }, 400);

    const { data: blob, error } = await sb.storage.from('files').download(path);
    if (error || !blob) return json({ error: 'file not found or not allowed' }, 403);
    if (blob.size > 20 * 1024 * 1024) return json({ error: 'file too large for email (20MB)' }, 413);

    const filename = `${String(title || 'קובץ').replace(/[\\/:*?"<>|]+/g, ' ').trim()}.${String(ext || path.split('.').pop() || 'pdf').toLowerCase()}`;
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: Deno.env.get('MAIL_FROM') || 'Casa Pueblo <onboarding@resend.dev>',
        to: list,
        reply_to: u.user.email,
        subject: String(title || 'קובץ מקאסה פואבלו'),
        html: `<div dir="rtl" style="font-family:Arial,sans-serif;line-height:1.7">${note ? `<p>${esc(note).replace(/\n/g, '<br>')}</p>` : ''}<p>מצורף: <b>${esc(title)}</b></p><p style="color:#777;font-size:12px">נשלח מ־CASA | הבית שלי ע״י ${esc(u.user.email || '')}</p></div>`,
        attachments: [{ filename, content: b64(await blob.arrayBuffer()) }],
      }),
    });
    if (!r.ok) return json({ error: 'mail failed: ' + (await r.text()).slice(0, 200) }, 502);
    return json({ sent: list.length });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
