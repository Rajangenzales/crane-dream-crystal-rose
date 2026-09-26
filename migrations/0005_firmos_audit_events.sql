-- FirmOS tenant-scoped audit_events and error_events.
-- Monthly audit_logs is unchanged and remains the legacy listing source.
-- Idempotent: create if not exists.

create table if not exists audit_events (
  id uuid primary key,
  reference_id text not null unique,
  firm_id uuid not null references firms(id) on delete cascade,
  user_id text not null,
  membership_id uuid null references firm_memberships(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  detail text not null default '',
  before_payload jsonb null,
  after_payload jsonb null,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_firm_created_idx
  on audit_events (firm_id, created_at desc);

create table if not exists error_events (
  id uuid primary key,
  reference_id text not null unique,
  firm_id uuid null references firms(id) on delete set null,
  user_id text null,
  sanitized_message text not null,
  internal_detail text not null,
  created_at timestamptz not null default now()
);

create index if not exists error_events_reference_idx
  on error_events (reference_id);
