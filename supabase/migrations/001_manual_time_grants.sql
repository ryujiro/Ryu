create table if not exists public.manual_time_grants (
  id uuid primary key, request_id uuid not null unique, send_id uuid not null unique,
  current_transfer_id text not null unique, session_id text not null,
  minutes integer not null check (minutes between 1 and 1440),
  seconds integer not null check (seconds between 60 and 86400),
  source_type text not null default 'manual' check (source_type = 'manual'),
  requested_by text not null,
  status text not null check (status in ('pending','sending','acknowledged','failed')),
  attempts integer not null default 0,
  response_text text check (char_length(response_text) <= 500),
  remaining_seconds integer check (remaining_seconds between 0 and 86400),
  actual_added_seconds integer check (actual_added_seconds between 0 and 86400),
  created_at timestamptz not null default now(), claimed_at timestamptz,
  acknowledged_at timestamptz, updated_at timestamptz not null default now()
);
create table if not exists public.current_device_status_cache (
  device_id text primary key, device_label text not null, last_seen_at timestamptz,
  firmware_version text, remaining_seconds integer check (remaining_seconds between 0 and 86400),
  timer_running boolean, last_result text
);
create table if not exists public.audit_logs (
  id bigint generated always as identity primary key, event_type text not null,
  actor text not null, grant_id uuid references public.manual_time_grants(id),
  high_duration boolean not null default false, created_at timestamptz not null default now()
);
alter table public.manual_time_grants enable row level security;
alter table public.current_device_status_cache enable row level security;
alter table public.audit_logs enable row level security;
