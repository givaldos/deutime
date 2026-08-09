-- Enum additions are isolated so the following migration can safely use the
-- value after this migration commits.

alter type public.feature_key
  add value if not exists 'whatsapp_reminders';
