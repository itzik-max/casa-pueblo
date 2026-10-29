-- CASA | הבית שלי: המסד הראשון.
-- כל פרויקט (משפחה) נשמר כמסמך JSON אחד ב־projects.data, באותו מבנה של נתוני הדמה (seedData ב־js/data.js).
-- ההרשאות במסד: צוות רואה ועורך הכול. בן משפחה רואה רק פרויקט שהוא חבר בו, ומשנה רק את מה שמותר ללקוח.

-- ---------- פרופילים וצוות ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  is_staff boolean not null default false,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- מיילים של הצוות. מי שנכנס עם מייל מהרשימה מקבל הרשאת צוות אוטומטית.
create table if not exists public.staff_emails (
  email text primary key check (email = lower(email)),
  name text,
  admin boolean not null default false,  -- מאשר תכניות לביצוע ומנהל קטגוריות (חורחה)
  added_at timestamptz not null default now()
);

insert into public.staff_emails (email, name, admin) values ('casapueblo.ji@gmail.com', 'חורחה עברין', true), ('ozitzik@gmail.com', 'איציק עוז', false)
on conflict (email) do nothing;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_staff from profiles where id = auth.uid()), false);
$$;

-- ---------- פרויקטים וחברים ----------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  family text,
  data jsonb not null default '{}'::jsonb,
  version int not null default 1,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users
);

create table if not exists public.project_members (
  project_id uuid references public.projects on delete cascade,
  user_id uuid references auth.users on delete cascade,
  role text not null default 'בן משפחה',
  added_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

-- הזמנות לפי מייל. כשהמוזמן נכנס בפעם הראשונה הוא מצורף לפרויקט.
create table if not exists public.invites (
  project_id uuid references public.projects on delete cascade,
  email text not null check (email = lower(email)),
  role text not null default 'בן משפחה',
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (project_id, email)
);

create or replace function public.is_member(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from project_members where project_id = pid and user_id = auth.uid());
$$;

-- ---------- יומן פעילות (נכתב רק בצד השרת) ----------
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  project_id uuid references public.projects on delete cascade,
  actor uuid,
  actor_email text,
  action text not null,
  detail jsonb,
  at timestamptz not null default now()
);
create index if not exists audit_log_project_at on public.audit_log (project_id, at desc);

-- ---------- משתמש חדש: פרופיל, הרשאת צוות והזמנות ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, is_staff, is_admin)
  values (new.id, lower(new.email), exists (select 1 from staff_emails where email = lower(new.email)),
          coalesce((select admin from staff_emails where email = lower(new.email)), false))
  on conflict (id) do nothing;

  insert into project_members (project_id, user_id, role)
  select project_id, new.id, role from invites where email = lower(new.email)
  on conflict do nothing;
  update invites set accepted_at = now() where email = lower(new.email) and accepted_at is null;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- הוספה או הסרה של מייל מרשימת הצוות מעדכנת מיד את ההרשאה של מי שכבר נרשם.
create or replace function public.sync_staff() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    if old.email = lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'cannot remove yourself from staff'; end if;
    update profiles set is_staff = false, is_admin = false where email = old.email;
    return old;
  end if;
  update profiles set is_staff = true, is_admin = new.admin where email = new.email;
  return new;
end $$;

drop trigger if exists staff_emails_sync on public.staff_emails;
create trigger staff_emails_sync after insert or update or delete on public.staff_emails
  for each row execute function public.sync_staff();

-- ---------- RLS ----------
alter table public.profiles enable row level security;
alter table public.staff_emails enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.invites enable row level security;
alter table public.audit_log enable row level security;

-- ---------- רמות הרשאה (לפי שאלון ההרשאות של איציק, 29.10.2026) ----------
-- is_admin  = חורחה: פרויקט חדש, פרטי פרויקט, תשלומים, שינויים ותוספות, הזמנות, צוות, מחיקת מסמכים, מסמכים פנימיים, שליחת הסיכום השבועי.
-- is_project_staff = צוות, או מעצבת מטעם המשפחה בפרויקט שלה: סטטוס ביצוע של תכניות, לוח זמנים, עריכת הסיכום השבועי.
-- בן משפחה: כל השאר (תכניות, חומרים, מסמכים, תמונות, בעלי מקצוע, תקציב הבית, מטלות, אישור תכניות ושינויים).
create or replace function public.is_project_staff(pid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or exists (select 1 from project_members where project_id = pid and user_id = auth.uid() and role like 'מעצב%');
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_staff());

drop policy if exists staff_emails_all on public.staff_emails;
drop policy if exists staff_emails_read on public.staff_emails;
drop policy if exists staff_emails_admin on public.staff_emails;
create policy staff_emails_read on public.staff_emails for select using (public.is_staff());
create policy staff_emails_admin on public.staff_emails for all using (public.is_admin()) with check (public.is_admin());

-- קריאה: צוות או חבר בפרויקט. פרויקט חדש ומחיקה: רק חורחה. כל השמירות עוברות דרך save_project.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select using (public.is_staff() or public.is_member(id));
drop policy if exists projects_staff_write on public.projects;
drop policy if exists projects_admin_write on public.projects;
create policy projects_admin_write on public.projects for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists members_read on public.project_members;
create policy members_read on public.project_members for select using (public.is_staff() or user_id = auth.uid());
drop policy if exists members_staff_write on public.project_members;
drop policy if exists members_admin_write on public.project_members;
create policy members_admin_write on public.project_members for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists invites_staff on public.invites;
drop policy if exists invites_read on public.invites;
drop policy if exists invites_admin on public.invites;
create policy invites_read on public.invites for select using (public.is_staff());
create policy invites_admin on public.invites for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_staff_read on public.audit_log;
create policy audit_staff_read on public.audit_log for select using (public.is_staff());

-- ---------- מסמכים פנימיים: רק חורחה ----------
create table if not exists public.internal_docs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects on delete cascade,
  title text not null,
  cat text,
  type text,
  size text,
  path text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
alter table public.internal_docs enable row level security;
drop policy if exists internal_docs_admin on public.internal_docs;
create policy internal_docs_admin on public.internal_docs for all using (public.is_admin()) with check (public.is_admin());

-- ---------- מייל לחורחה (קובץ חדש, תכנית שאושרה) ----------
create or replace function public.notify_jorge(pid uuid, events jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare url text; secret text;
begin
  select decrypted_secret || 'notify' into url from vault.decrypted_secrets where name = 'functions_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'cron_secret';
  if url is null or secret is null then return; end if;
  perform net.http_post(url := url, headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', secret),
    body := jsonb_build_object('pid', pid, 'events', events, 'actor', (select email from profiles where id = auth.uid())), timeout_milliseconds := 30000);
exception when others then
  raise notice 'notify_jorge failed: %', sqlerrm;  -- שמירה לא נכשלת בגלל מייל
end $$;
revoke execute on function public.notify_jorge(uuid, jsonb) from public, anon, authenticated;

-- ---------- שמירת פרויקט ----------
-- שומר את כל המסמך, עם בדיקת גרסה כדי שאיש צוות ולקוח לא ידרסו זה את זה, ואוכף את ההרשאות לפי חלקי המסמך.
create or replace function public.save_project(pid uuid, new_data jsonb, expected_version int)
returns int language plpgsql security definer set search_path = public as $$
declare
  cur projects%rowtype;
  old_d jsonb;
  k text;
  changed text[] := '{}';
  client_locked text[] := array['members', 'team', 'timeline', 'weeklySummaries'];
  detail_keys text[] := array['name', 'family', 'address', 'client', 'start', 'handover', 'image', 'scope', 'area'];
  pstaff boolean := is_project_staff(pid);
  jorge boolean := is_admin();
  events jsonb := '[]';
begin
  select * into cur from projects where id = pid for update;
  if not found then raise exception 'project not found'; end if;
  if not (pstaff or is_member(pid)) then raise exception 'not allowed'; end if;
  if cur.version <> expected_version then raise exception 'version conflict' using errcode = '40001'; end if;
  old_d := cur.data;

  for k in select jsonb_object_keys(old_d || new_data) loop
    if (old_d -> k) is distinct from (new_data -> k) then changed := changed || k; end if;
  end loop;

  -- בן משפחה: לא נוגע בצוות, בחברים, בלוח הזמנים ובסיכומים השבועיים, ובפרויקט משנה רק את טקסט העדכון.
  if not pstaff then
    if changed && client_locked then raise exception 'clients cannot change: %', array_to_string(changed, ', '); end if;
    if (old_d -> 'project') - 'weekly' is distinct from (new_data -> 'project') - 'weekly' then raise exception 'clients cannot change the project details'; end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(new_data -> 'plans', '[]')) n
      left join jsonb_array_elements(coalesce(old_d -> 'plans', '[]')) o on o ->> 'id' = n ->> 'id'
      where (o is null and coalesce(n ->> 'exec', 'draft') <> 'draft')
         or (o is not null and (n -> 'exec') is distinct from (o -> 'exec')
             and not (coalesce(n ->> 'exec', 'draft') = 'draft' and (n #> '{versions,0,v}') is distinct from (o #> '{versions,0,v}')))
    ) then raise exception 'only the team can change a plan status'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(old_d -> 'materials', '[]')) o
               where not exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'materials', '[]')) n where n ->> 'id' = o ->> 'id'))
      then raise exception 'only the team can delete materials'; end if;
  end if;

  -- רק חורחה: פרטי הפרויקט, תשלומים לקאסה פואבלו, שינויים ותוספות חדשים, מחיקת מסמכים, אישור ושליחת סיכום שבועי.
  if not jorge then
    if exists (select 1 from unnest(detail_keys) dk where (old_d #> array['project', dk]) is distinct from (new_data #> array['project', dk]))
      then raise exception 'only Jorge can change the project details'; end if;
    if (select coalesce(jsonb_agg(jsonb_build_array(m -> 'paid', m -> 'invoice')), '[]') from jsonb_array_elements(coalesce(old_d -> 'casaMilestones', '[]')) m)
       is distinct from (select coalesce(jsonb_agg(jsonb_build_array(m -> 'paid', m -> 'invoice')), '[]') from jsonb_array_elements(coalesce(new_data -> 'casaMilestones', '[]')) m)
      then raise exception 'only Jorge can record payments'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'changes', '[]')) n
               where not exists (select 1 from jsonb_array_elements(coalesce(old_d -> 'changes', '[]')) o where o ->> 'id' = n ->> 'id'))
      then raise exception 'only Jorge can add a change'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(old_d -> 'documents', '[]')) o
               where not exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'documents', '[]')) n where n ->> 'id' = o ->> 'id'))
      then raise exception 'only Jorge can delete documents'; end if;
    if exists (select 1 from jsonb_array_elements(coalesce(new_data -> 'weeklySummaries', '[]')) n
               left join jsonb_array_elements(coalesce(old_d -> 'weeklySummaries', '[]')) o on o ->> 'id' = n ->> 'id'
               where n ->> 'status' in ('approved', 'sent') and (o -> 'status') is distinct from (n -> 'status'))
      then raise exception 'only Jorge can approve the weekly summary'; end if;
  end if;

  update projects set
    data = new_data,
    name = coalesce(new_data #>> '{project,name}', name),
    family = coalesce(new_data #>> '{project,family}', family),
    version = version + 1,
    updated_at = now(),
    updated_by = auth.uid()
  where id = pid;

  if array_length(changed, 1) > 0 then
    insert into audit_log (project_id, actor, actor_email, action, detail)
    values (pid, auth.uid(), (select email from profiles where id = auth.uid()), 'save', jsonb_build_object('changed', changed));
  end if;

  -- מייל לחורחה: כל קובץ חדש (מסמך, תכנית או גרסה) וכל תכנית שהמשפחה אישרה. לא כשחורחה עצמו עשה את זה.
  if not jorge then
    select coalesce(jsonb_agg(e), '[]') into events from (
      select jsonb_build_object('kind', 'file', 'title', n ->> 'title', 'cat', n ->> 'cat') e
        from jsonb_array_elements(coalesce(new_data -> 'documents', '[]')) n
        where not exists (select 1 from jsonb_array_elements(coalesce(old_d -> 'documents', '[]')) o where o ->> 'id' = n ->> 'id')
      union all
      select jsonb_build_object('kind', 'plan', 'title', (n ->> 'title') || ' · גרסה ' || (n #>> '{versions,0,v}'), 'cat', n ->> 'cat')
        from jsonb_array_elements(coalesce(new_data -> 'plans', '[]')) n
        left join jsonb_array_elements(coalesce(old_d -> 'plans', '[]')) o on o ->> 'id' = n ->> 'id'
        where o is null or (n #> '{versions,0,v}') is distinct from (o #> '{versions,0,v}')
      union all
      select jsonb_build_object('kind', 'approved', 'title', n ->> 'title', 'cat', n ->> 'cat')
        from jsonb_array_elements(coalesce(new_data -> 'plans', '[]')) n
        join jsonb_array_elements(coalesce(old_d -> 'plans', '[]')) o on o ->> 'id' = n ->> 'id'
        where n ->> 'status' = 'approved' and (o ->> 'status') is distinct from 'approved'
    ) x;
    if jsonb_array_length(events) > 0 then perform notify_jorge(pid, events); end if;
  end if;
  return cur.version + 1;
end $$;

-- הזמנת בן משפחה (רק חורחה): אם כבר יש לו משתמש הוא מצורף מיד, ואם לא, כשייכנס בפעם הראשונה.
create or replace function public.invite_member(pid uuid, member_email text, member_role text default 'בן משפחה')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  insert into invites (project_id, email, role) values (pid, lower(member_email), member_role)
  on conflict (project_id, email) do update set role = excluded.role;
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is not null then
    insert into project_members (project_id, user_id, role) values (pid, uid, member_role)
    on conflict (project_id, user_id) do update set role = excluded.role;
    update invites set accepted_at = now() where project_id = pid and email = lower(member_email);
    return 'added';
  end if;
  insert into audit_log (project_id, actor, action, detail) values (pid, auth.uid(), 'invite', jsonb_build_object('email', lower(member_email)));
  return 'invited';
end $$;

create or replace function public.remove_member(pid uuid, member_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not allowed'; end if;
  delete from invites where project_id = pid and email = lower(member_email);
  delete from project_members where project_id = pid and user_id in (select id from auth.users where lower(email) = lower(member_email));
end $$;

-- התפקיד שלי בכל פרויקט (כדי שמעצבת מטעם המשפחה תקבל במסך את כלי הצוות בפרויקט שלה).
create or replace function public.my_roles() returns table (project_id uuid, role text)
language sql stable security definer set search_path = public as $$
  select project_id, role from project_members where user_id = auth.uid();
$$;

grant execute on function public.save_project(uuid, jsonb, int) to authenticated;
grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.remove_member(uuid, text) to authenticated;
grant execute on function public.my_roles() to authenticated;
revoke execute on function public.save_project(uuid, jsonb, int) from anon;
revoke execute on function public.invite_member(uuid, text, text) from anon;
revoke execute on function public.remove_member(uuid, text) from anon;
revoke execute on function public.my_roles() from anon;

-- ---------- קבצים ----------
-- bucket פרטי. כל קובץ בתיקייה של הפרויקט: <project_id>/...
-- קבצים פנימיים (<project_id>/internal/...) רק לחורחה. כל מי שבפרויקט יכול להעלות. מחיקה: רק חורחה.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do nothing;

create or replace function public.can_read_file(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when (storage.foldername(path))[2] = 'internal' then is_admin()
    when is_staff() then true
    when (storage.foldername(path))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then is_member(((storage.foldername(path))[1])::uuid)
    else false end;
$$;

drop policy if exists files_read on storage.objects;
create policy files_read on storage.objects for select
  using (bucket_id = 'files' and public.can_read_file(name));
drop policy if exists files_insert on storage.objects;
create policy files_insert on storage.objects for insert
  with check (bucket_id = 'files' and public.can_read_file(name));
drop policy if exists files_staff_update on storage.objects;
drop policy if exists files_admin_update on storage.objects;
create policy files_admin_update on storage.objects for update
  using (bucket_id = 'files' and public.is_admin());
drop policy if exists files_staff_delete on storage.objects;
drop policy if exists files_admin_delete on storage.objects;
create policy files_admin_delete on storage.objects for delete
  using (bucket_id = 'files' and public.is_admin());
