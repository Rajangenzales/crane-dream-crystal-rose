-- Same-firm integrity for membership_roles.
--
-- Canonical membership table: firm_memberships.
-- User identity remains Better Auth "user"; this file does not add a FirmOS
-- users table and does not add firm_memberships.user_id → "user"(id) because
-- existing fixtures and preview identities are not guaranteed to have a
-- matching "user" row at insert time.
--
-- Idempotent: safe to apply twice (create if not exists / exception handlers).

create unique index if not exists firm_memberships_id_firm_id_uidx
  on firm_memberships (id, firm_id);

create unique index if not exists roles_id_firm_id_uidx
  on roles (id, firm_id);

alter table membership_roles
  add column if not exists firm_id uuid;

update membership_roles mr
set firm_id = m.firm_id
from firm_memberships m
where mr.membership_id = m.id
  and mr.firm_id is null;

-- Empty tables and backfilled rows can be marked NOT NULL.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_name = 'membership_roles'
      and column_name = 'firm_id'
      and is_nullable = 'YES'
  ) then
    alter table membership_roles alter column firm_id set not null;
  end if;
end
$$;

create or replace function firmos_membership_roles_align_firm()
returns trigger
language plpgsql
as $$
declare
  membership_firm uuid;
  role_firm uuid;
begin
  select firm_id into membership_firm
  from firm_memberships
  where id = new.membership_id;

  select firm_id into role_firm
  from roles
  where id = new.role_id;

  if membership_firm is null then
    raise exception 'membership_roles membership does not exist'
      using errcode = '23503';
  end if;

  if role_firm is null then
    raise exception 'membership_roles role does not exist'
      using errcode = '23503';
  end if;

  if membership_firm is distinct from role_firm then
    raise exception 'membership_roles cannot attach a role from another firm'
      using errcode = '23514';
  end if;

  new.firm_id := membership_firm;
  return new;
end;
$$;

drop trigger if exists trg_membership_roles_same_firm on membership_roles;
create trigger trg_membership_roles_same_firm
  before insert or update of membership_id, role_id, firm_id
  on membership_roles
  for each row
  execute function firmos_membership_roles_align_firm();

do $$
begin
  alter table membership_roles
    add constraint membership_roles_membership_firm_fk
    foreign key (membership_id, firm_id)
    references firm_memberships (id, firm_id)
    on delete cascade;
exception
  when duplicate_object then null;
end
$$;

do $$
begin
  alter table membership_roles
    add constraint membership_roles_role_firm_fk
    foreign key (role_id, firm_id)
    references roles (id, firm_id)
    on delete cascade;
exception
  when duplicate_object then null;
end
$$;
