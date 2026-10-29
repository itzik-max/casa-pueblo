/* Live mode: the real system on Supabase (Auth + Postgres + Storage).
   Each project is one JSON document (same shape as seedData) in projects.data.
   Files live in the private "files" bucket under <project_id>/..., opened via signed URLs. */

const Live = {
  sb: null,
  user: null,      // { id, email, name, staff }
  rows: [],        // projects visible to this user
  version: 0,
  urls: {},        // storage path -> signed URL
  saving: null,
  dirty: false,

  // Live unless the config is empty or the visitor chose the demo.
  enabled() {
    return !!(window.CASA_CONFIG && CASA_CONFIG.url && CASA_CONFIG.key && window.supabase) && localStorage.getItem('casa-mode') !== 'demo';
  },

  async init() {
    this.sb = supabase.createClient(CASA_CONFIG.url, CASA_CONFIG.key, { auth: { persistSession: true, detectSessionInUrl: true } });
    const { data } = await this.sb.auth.getSession();
    if (!data.session) return false;
    const u = data.session.user;
    const { data: prof } = await this.sb.from('profiles').select('is_staff, full_name').eq('id', u.id).maybeSingle();
    this.user = { id: u.id, email: u.email, name: (prof && prof.full_name) || u.email.split('@')[0], staff: !!(prof && prof.is_staff) };
    await this.loadRows();
    return true;
  },

  async sendLink(email) {
    const { error } = await this.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + location.pathname } });
    if (error) throw error;
  },

  async signOut() {
    await this.sb.auth.signOut();
    this.user = null;
  },

  async loadRows() {
    const { data, error } = await this.sb.from('projects').select('id, name, family, data, version, updated_at').eq('archived', false).order('updated_at', { ascending: false });
    if (error) throw error;
    this.rows = data || [];
  },

  // Opens one project as Store.data. Staff also get the portfolio of all projects.
  async open(pid) {
    await this.loadRows();
    const row = this.rows.find((r) => r.id === pid) || this.rows[0];
    if (!row) { Store.data = null; return false; }
    Store.data = Object.assign(emptyProjectData({}), row.data);
    Store.data.project.id = row.id;
    Store.data.portfolio = this.portfolio();
    this.version = row.version;
    if (Store.data.team) Object.keys(TEAM).forEach((k) => Store.data.team[k] && Object.assign(TEAM[k], Store.data.team[k]));
    Store.session.pid = row.id;
    await this.signAll(Store.data);
    return true;
  },

  portfolio() {
    return this.rows.map((r) => {
      const d = r.data || {};
      const p = d.project || {};
      const tasks = (d.tasks || []).filter((t) => !t.done);
      const late = (d.timeline || []).some((s) => s.status === 'delay');
      return {
        id: r.id, name: r.name, client: p.client || `משפחת ${r.family || ''}`, city: (p.address || '').split(',').pop().trim() || '—',
        pm: (d.team && d.team.pm && d.team.pm.name) || '—', stage: p.stage || '—', progress: p.progress || 0,
        openTasks: tasks.length, pendingApprovals: tasks.filter((t) => t.type === 'approval').length,
        schedule: p.progress >= 100 ? 'done' : late ? 'delay' : 'ok', alerts: late ? 1 : 0, img: p.image || 'assets/img/hero-home.svg',
      };
    });
  },

  // Saves are queued so quick consecutive clicks become one write.
  queueSave() {
    this.dirty = true;
    clearTimeout(this._t);
    this._t = setTimeout(() => this.flush(), 400);
  },

  async flush() {
    if (!this.dirty || !Store.data) return;
    if (this.saving) { await this.saving; return this.flush(); }
    this.dirty = false;
    const pid = Store.data.project.id;
    const { portfolio, ...doc } = Store.data;
    this.saving = this.sb.rpc('save_project', { pid, new_data: doc, expected_version: this.version });
    const { data, error } = await this.saving;
    this.saving = null;
    if (error) {
      if (/version conflict/.test(error.message)) {
        toast('מישהו אחר עדכן את הפרויקט בדיוק עכשיו. טוענים את הגרסה העדכנית, כדאי לבדוק ולנסות שוב.');
      } else {
        toast('השמירה נכשלה: ' + error.message);
      }
      await this.open(pid);
      App.render();
      return;
    }
    this.version = data;
  },

  async createProject(data) {
    const { data: row, error } = await this.sb.from('projects').insert({ name: data.project.name, family: data.project.family, data }).select('id').single();
    if (error) throw error;
    return row.id;
  },

  async invite(pid, email, role) {
    const { data, error } = await this.sb.rpc('invite_member', { pid, member_email: email, member_role: role || 'בן משפחה' });
    if (error) throw error;
    await this.sendLink(email);
    return data;
  },

  async removeMember(pid, email) {
    const { error } = await this.sb.rpc('remove_member', { pid, member_email: email });
    if (error) throw error;
  },

  async invites(pid) {
    const { data } = await this.sb.from('invites').select('email, role, invited_at, accepted_at').eq('project_id', pid).order('invited_at');
    return data || [];
  },

  async staffList() {
    const { data } = await this.sb.from('staff_emails').select('email, name, added_at').order('added_at');
    return data || [];
  },

  async addStaff(email, name) {
    const { error } = await this.sb.from('staff_emails').insert({ email: email.toLowerCase(), name });
    if (error) throw error;
  },

  async removeStaff(email) {
    const { error } = await this.sb.from('staff_emails').delete().eq('email', email);
    if (error) throw error;
  },

  async auditLog(pid) {
    const { data } = await this.sb.from('audit_log').select('actor_email, action, detail, at').eq('project_id', pid).order('at', { ascending: false }).limit(200);
    return data || [];
  },

  // Uploads a file into the current project's folder and returns its "f:" reference.
  async upload(file, { internal = false } = {}) {
    const pid = Store.data.project.id;
    const safe = file.name.replace(/[^\w.\-]+/g, '_').slice(-80);
    const path = `${pid}/${internal ? 'internal/' : ''}${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${safe}`;
    const { error } = await this.sb.storage.from('files').upload(path, file, { contentType: file.type || undefined });
    if (error) throw error;
    const ref = 'f:' + path;
    await this.sign([ref]);
    return ref;
  },

  async sign(refs) {
    const paths = refs.filter((r) => typeof r === 'string' && r.startsWith('f:')).map((r) => r.slice(2));
    if (!paths.length) return;
    const { data } = await this.sb.storage.from('files').createSignedUrls(paths, 60 * 60 * 12);
    (data || []).forEach((x) => { if (x.signedUrl) this.urls['f:' + x.path] = x.signedUrl; });
  },

  async signAll(obj) {
    const refs = [];
    const walk = (v) => {
      if (typeof v === 'string') { if (v.startsWith('f:') && !this.urls[v]) refs.push(v); }
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(obj);
    for (let i = 0; i < refs.length; i += 100) await this.sign(refs.slice(i, i + 100));
  },
};

// Image / file source: signed URL for uploaded files, the path itself for bundled assets.
function media(src) {
  if (typeof src === 'string' && src.startsWith('f:')) return Live.urls[src] || '';
  return src || '';
}

// Opens an uploaded file in a new tab. Returns false when there is no real file (demo data).
function openFile(ref) {
  const url = media(ref);
  if (!ref || !url || !String(ref).startsWith('f:')) return false;
  window.open(url, '_blank', 'noopener');
  return true;
}

// Uploads in live mode; in the demo keeps only the metadata. Returns the "f:" reference or ''.
async function storeFile(file, opts) {
  if (!file || !Store.live) return '';
  try { return await Live.upload(file, opts); } catch (e) { toast('העלאת הקובץ נכשלה: ' + e.message); throw e; }
}
