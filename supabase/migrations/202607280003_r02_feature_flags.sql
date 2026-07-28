-- Enum values must be committed before the public-event contract references
-- them. No team is enabled by this expansion.

alter type public.feature_key
  add value if not exists 'public_event_page';
alter type public.feature_key
  add value if not exists 'event_capability_exchange';
alter type public.feature_key
  add value if not exists 'event_capability_rsvp';
