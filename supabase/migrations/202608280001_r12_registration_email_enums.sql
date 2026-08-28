-- R12 / WP-R12-04 — controles independentes para produzir e consumir avisos.
alter type public.runtime_control_key
  add value if not exists 'registration_email_alerts';

alter type public.runtime_control_key
  add value if not exists 'registration_email_delivery';
