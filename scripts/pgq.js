// מריץ SQL על המסד של קאסה פואבלו. שימוש: node scripts/pgq.js <file.sql> | -e "<sql>"
// המזהה והסיסמה נקראים מ־~/.claude/settings.json (CASA_SUPABASE_REF, CASA_SUPABASE_DB_PASSWORD), לא נשמרים כאן.
const { Client } = require('pg');
const fs = require('fs');
const os = require('os');
const env = JSON.parse(fs.readFileSync(os.homedir() + '/.claude/settings.json', 'utf8')).env || {};
if (!env.CASA_SUPABASE_REF || !env.CASA_SUPABASE_DB_PASSWORD) { console.error('חסרים CASA_SUPABASE_REF / CASA_SUPABASE_DB_PASSWORD בהגדרות'); process.exit(1); }
const sql = process.argv[2] === '-e' ? process.argv[3] : fs.readFileSync(process.argv[2], 'utf8');
(async () => {
  for (const host of ['aws-1-eu-central-1.pooler.supabase.com', 'aws-0-eu-central-1.pooler.supabase.com', `db.${env.CASA_SUPABASE_REF}.supabase.co`]) {
    const user = host.startsWith('db.') ? 'postgres' : `postgres.${env.CASA_SUPABASE_REF}`;
    const c = new Client({ host, port: 5432, user, password: env.CASA_SUPABASE_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      await c.connect();
      const r = await c.query(sql);
      console.log('OK via', host, JSON.stringify(Array.isArray(r) ? r.map((x) => x.rows) : r.rows).slice(0, 3000));
      await c.end();
      return;
    } catch (e) { console.log('fail', host, e.message.slice(0, 160)); try { await c.end(); } catch { /* ignore */ } }
  }
  process.exit(1);
})();
