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

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select using (id = auth.uid() or public.is_staff());

drop policy if exists staff_emails_all on public.staff_emails;
create policy staff_emails_all on public.staff_emails for all using (public.is_staff()) with check (public.is_staff());

-- קריאה: צוות או חבר בפרויקט. כתיבה ישירה: רק צוות. לקוח שומר דרך save_project.
drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects for select using (public.is_staff() or public.is_member(id));
drop policy if exists projects_staff_write on public.projects;
create policy projects_staff_write on public.projects for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists members_read on public.project_members;
create policy members_read on public.project_members for select using (public.is_staff() or user_id = auth.uid());
drop policy if exists members_staff_write on public.project_members;
create policy members_staff_write on public.project_members for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists invites_staff on public.invites;
create policy invites_staff on public.invites for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists audit_staff_read on public.audit_log;
create policy audit_staff_read on public.audit_log for select using (public.is_staff());

-- ---------- שמירת פרויקט ----------
-- שומר את כל המסמך, עם בדיקת גרסה כדי שאיש צוות ולקוח לא ידרסו זה את זה.
-- לקוח לא יכול לשנות את פרטי הפרויקט, הצוות, לוח הזמנים, העדכונים ובעלי המקצוע.
create or replace function public.save_project(pid uuid, new_data jsonb, expected_version int)
returns int language plpgsql security definer set search_path = public as $$
declare
  cur projects%rowtype;
  k text;
  changed text[] := '{}';
  protected text[] := array['project', 'members', 'team', 'timeline', 'updates', 'pros', 'weeklySummaries'];
begin
  select * into cur from projects where id = pid for update;
  if not found then raise exception 'project not found'; end if;
  if not (is_staff() or is_member(pid)) then raise exception 'not allowed'; end if;
  if cur.version <> expected_version then raise exception 'version conflict' using errcode = '40001'; end if;

  for k in select jsonb_object_keys(cur.data || new_data) loop
    if (cur.data -> k) is distinct from (new_data -> k) then changed := changed || k; end if;
  end loop;

  if not is_staff() then
    if changed && protected then raise exception 'clients cannot change: %', array_to_string(changed, ', '); end if;
  end if;

  -- סטטוס ביצוע של תכנית וקטגוריות התכניות: רק חורחה (is_admin). תכנית חדשה או גרסה חדשה נכנסת כטיוטה.
  if not is_admin() then
    if (cur.data -> 'planCategories') is distinct from (new_data -> 'planCategories') then raise exception 'only the plan approver can change plan categories'; end if;
    if exists (
      select 1 from jsonb_array_elements(coalesce(new_data -> 'plans', '[]')) n
      left join jsonb_array_elements(coalesce(cur.data -> 'plans', '[]')) o on o ->> 'id' = n ->> 'id'
      where (o is null and coalesce(n ->> 'exec', 'draft') <> 'draft')
         or (o is not null and (n -> 'exec') is distinct from (o -> 'exec')
             and not (coalesce(n ->> 'exec', 'draft') = 'draft' and (n #> '{versions,0,v}') is distinct from (o #> '{versions,0,v}')))
    ) then raise exception 'only the plan approver can change a plan status'; end if;
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
  return cur.version + 1;
end $$;

-- הזמנת בן משפחה: אם כבר יש לו משתמש הוא מצורף מיד, ואם לא, כשייכנס בפעם הראשונה.
create or replace function public.invite_member(pid uuid, member_email text, member_role text default 'בן משפחה')
returns text language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  insert into invites (project_id, email, role) values (pid, lower(member_email), member_role)
  on conflict (project_id, email) do update set role = excluded.role;
  select id into uid from auth.users where lower(email) = lower(member_email);
  if uid is not null then
    insert into project_members (project_id, user_id, role) values (pid, uid, member_role) on conflict do nothing;
    update invites set accepted_at = now() where project_id = pid and email = lower(member_email);
    return 'added';
  end if;
  insert into audit_log (project_id, actor, action, detail) values (pid, auth.uid(), 'invite', jsonb_build_object('email', lower(member_email)));
  return 'invited';
end $$;

create or replace function public.remove_member(pid uuid, member_email text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  delete from invites where project_id = pid and email = lower(member_email);
  delete from project_members where project_id = pid and user_id in (select id from auth.users where lower(email) = lower(member_email));
end $$;

grant execute on function public.save_project(uuid, jsonb, int) to authenticated;
grant execute on function public.invite_member(uuid, text, text) to authenticated;
grant execute on function public.remove_member(uuid, text) to authenticated;
revoke execute on function public.save_project(uuid, jsonb, int) from anon;
revoke execute on function public.invite_member(uuid, text, text) from anon;
revoke execute on function public.remove_member(uuid, text) from anon;

-- ---------- קבצים ----------
-- bucket פרטי. כל קובץ בתיקייה של הפרויקט: <project_id>/...
-- קבצים פנימיים (<project_id>/internal/...) רק לצוות. לקוח יכול להעלות (מסמך, קבלה) אבל לא למחוק.
insert into storage.buckets (id, name, public, file_size_limit)
values ('files', 'files', false, 52428800)
on conflict (id) do nothing;

create or replace function public.can_read_file(path text) returns boolean
language sql stable security definer set search_path = public as $$
  select is_staff() or (
    (storage.foldername(path))[2] is distinct from 'internal'
    and case when (storage.foldername(path))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
             then is_member(((storage.foldername(path))[1])::uuid) else false end
  );
$$;

drop policy if exists files_read on storage.objects;
create policy files_read on storage.objects for select
  using (bucket_id = 'files' and public.can_read_file(name));
drop policy if exists files_insert on storage.objects;
create policy files_insert on storage.objects for insert
  with check (bucket_id = 'files' and public.can_read_file(name));
drop policy if exists files_staff_update on storage.objects;
create policy files_staff_update on storage.objects for update
  using (bucket_id = 'files' and public.is_staff());
drop policy if exists files_staff_delete on storage.objects;
create policy files_staff_delete on storage.objects for delete
  using (bucket_id = 'files' and public.is_staff());
