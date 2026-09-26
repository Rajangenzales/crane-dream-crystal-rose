-- Platform and Technical permission catalog keys.
-- These are global vocabulary rows, not Firm roles and not operator identity tables.
-- Firm bootstrap must not grant these keys. Persistent Platform/Technical principal
-- storage is deferred.

insert into permissions (key, description) values
  ('platform.tenant.view', 'View platform tenant lifecycle metadata'),
  ('platform.tenant.suspend', 'Suspend a tenant at the platform layer'),
  ('platform.system.view', 'View platform system metadata'),
  ('platform.error.view', 'View platform-level error metadata'),
  ('platform.error.manage', 'Manage platform-level error metadata'),
  ('platform.integration.manage', 'Manage platform integrations'),
  ('platform.ai.manage', 'Manage platform AI configuration'),
  ('platform.health.view', 'View platform health metadata'),
  ('diagnostics.view', 'View technical diagnostics'),
  ('error_events.view', 'View technical error events')
on conflict (key) do nothing;
