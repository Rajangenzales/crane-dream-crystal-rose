-- Monthly work OS schema. Soft-delete important business entities.

create table if not exists app_profiles (
  user_id text primary key,
  role text not null check (role in ('admin', 'viewer')),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

insert into app_settings (key, value) values
  ('agency_name', 'Genzales'),
  ('agency_tagline', 'Work first. Reports follow.'),
  ('currency', 'INR'),
  ('viewers_see_payments', 'true')
on conflict (key) do nothing;

create table if not exists clients (
  id text primary key,
  name text not null,
  company_name text not null default '',
  contact_person text not null default '',
  email text not null default '',
  phone text not null default '',
  notes text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists clients_active_name_idx on clients (is_active, name);

create table if not exists service_library (
  id text primary key,
  name text not null unique,
  is_active boolean not null default true,
  is_global boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into service_library (id, name, sort_order) values
  ('svc_website_dev', 'Website Development', 10),
  ('svc_website_maint', 'Website Maintenance', 20),
  ('svc_seo', 'SEO', 30),
  ('svc_aeo_geo', 'AEO / GEO', 40),
  ('svc_google_ads', 'Google Ads', 50),
  ('svc_meta_ads', 'Meta Ads', 60),
  ('svc_ad_campaigns', 'Ad Campaigns', 70),
  ('svc_social', 'Social Media', 80),
  ('svc_creative', 'Creative Design', 90),
  ('svc_posters', 'Posters', 100),
  ('svc_animated_posters', 'Animated Posters', 110),
  ('svc_video', 'Video Production', 120),
  ('svc_motion', 'Motion Graphics', 130),
  ('svc_logo', 'Logo Design', 140),
  ('svc_brand', 'Brand Identity', 150),
  ('svc_board', 'Board Design', 160),
  ('svc_packaging', 'Packaging Design', 170),
  ('svc_photo', 'Product Photography', 180),
  ('svc_content', 'Content Creation', 190),
  ('svc_landing', 'Landing Page', 200)
on conflict (name) do nothing;

create table if not exists client_services (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  service_id text not null references service_library(id),
  created_at timestamptz not null default now(),
  unique (client_id, service_id)
);

create index if not exists client_services_client_idx on client_services (client_id);

create table if not exists report_periods (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  year integer not null,
  month integer not null check (month >= 1 and month <= 12),
  title text not null default '',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (client_id, year, month)
);

create index if not exists report_periods_client_idx on report_periods (client_id, year, month);

create table if not exists report_sections (
  id text primary key,
  period_id text not null references report_periods(id) on delete cascade,
  service_id text references service_library(id),
  title text not null,
  is_manual boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_sections_period_idx on report_sections (period_id, sort_order);

create table if not exists activities (
  id text primary key,
  section_id text not null references report_sections(id) on delete cascade,
  activity_date date,
  title text not null,
  description text not null default '',
  quantity numeric,
  unit text not null default '',
  status text not null default 'planned',
  notes text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists activities_section_idx on activities (section_id, sort_order, activity_date);

create table if not exists payments (
  id text primary key,
  client_id text not null references clients(id) on delete cascade,
  period_id text references report_periods(id) on delete set null,
  year integer not null,
  month integer not null,
  status text not null default 'pending',
  amount numeric,
  payment_date date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_client_period_idx on payments (client_id, year, month);

create table if not exists report_exports (
  id text primary key,
  kind text not null,
  client_id text,
  year integer not null,
  month integer not null,
  client_ids text not null default '[]',
  generated_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id text primary key,
  user_id text not null,
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on audit_logs (created_at desc);

create table if not exists backups (
  id text primary key,
  created_by text not null,
  note text not null default '',
  payload text not null,
  created_at timestamptz not null default now()
);

create index if not exists backups_created_idx on backups (created_at desc);
