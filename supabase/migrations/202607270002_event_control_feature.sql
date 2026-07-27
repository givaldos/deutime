-- Enum values must be committed before they can be referenced by the contract
-- migration. No team is enabled by this expansion.

alter type public.feature_key add value if not exists 'event_control';
