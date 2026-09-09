-- Singleton used to make first-admin provisioning atomic (SEC-02).
-- Not part of business backup/restore.

create table if not exists app_bootstrap (
  id integer primary key check (id = 1),
  first_admin_user_id text not null,
  claimed_at timestamptz not null default now()
);
