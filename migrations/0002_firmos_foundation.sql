-- FirmOS foundation: tenant identity + role/permission model.
--
-- IDs are opaque UUIDs rather than sequential identifiers. They are identifiers,
-- not encrypted secrets. Sensitive values must still be protected at rest and
-- in transit by the deployment/storage layer.

create table if not exists firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  legal_name text,
  slug text not null unique,
  timezone text not null default 'Asia/Kolkata',
  currency_code text not null default 'INR',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists roles (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  name text not null,
  description text,
  is_system boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, name)
);

create table if not exists permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (role_id, permission_id)
);

create table if not exists firm_memberships (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  user_id text not null,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'removed')),
  display_name text,
  joined_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (firm_id, user_id)
);

create table if not exists membership_roles (
  membership_id uuid not null references firm_memberships(id) on delete cascade,
  role_id uuid not null references roles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (membership_id, role_id)
);

create index if not exists idx_roles_firm_id on roles(firm_id);
create index if not exists idx_firm_memberships_firm_id on firm_memberships(firm_id);
create index if not exists idx_firm_memberships_user_id on firm_memberships(user_id);
create index if not exists idx_membership_roles_role_id on membership_roles(role_id);

-- Stable permission vocabulary. Firms may compose these permissions into their
-- own roles without changing application code.
insert into permissions (key, description) values
  ('firm.view', 'View firm settings and identity'),
  ('firm.manage', 'Manage firm settings and configuration'),
  ('members.view', 'View firm members'),
  ('members.manage', 'Create, edit, suspend and remove firm members'),
  ('roles.view', 'View roles and permissions'),
  ('roles.manage', 'Create and manage firm roles and their permissions'),
  ('clients.view', 'View clients'),
  ('clients.manage', 'Create and manage clients'),
  ('services.view', 'View services'),
  ('services.manage', 'Create and manage services'),
  ('work.view', 'View assigned or permitted work'),
  ('work.manage', 'Create and manage work items and assignments'),
  ('work.assign', 'Assign work to firm members'),
  ('finance.view', 'View permitted financial records'),
  ('finance.manage', 'Create and manage financial records'),
  ('finance.correct', 'Correct financial records with audit trail'),
  ('reports.view', 'View permitted reports'),
  ('reports.generate', 'Generate reports'),
  ('reports.export', 'Export reports'),
  ('backup.manage', 'Create and restore firm backups'),
  ('audit.view', 'View firm audit events')
on conflict (key) do nothing;
