begin;

alter table public.centers
add column if not exists public_slug text;

with generated_slugs as (
  select
    id,
    trim(both '-' from regexp_replace(
      replace(replace(replace(lower(trim(name)), 'æ', 'ae'), 'ø', 'oe'), 'å', 'aa'),
      '[^a-z0-9]+',
      '-',
      'g'
    )) as base_slug
  from public.centers
  where public_slug is null
), ranked_slugs as (
  select
    id,
    base_slug,
    count(*) over (partition by base_slug) as slug_count
  from generated_slugs
)
update public.centers as centers
set public_slug = case
  when ranked_slugs.slug_count > 1
    then ranked_slugs.base_slug || '-' || left(centers.id::text, 8)
  else ranked_slugs.base_slug
end
from ranked_slugs
where centers.id = ranked_slugs.id;

create unique index if not exists centers_public_slug_unique
on public.centers (public_slug)
where public_slug is not null;

alter table public.centers
drop constraint if exists centers_public_slug_format_check;

alter table public.centers
add constraint centers_public_slug_format_check
check (public_slug is null or public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

alter table public.issue_reports
add column if not exists origin text not null default 'manual';

alter table public.issue_reports
drop constraint if exists issue_reports_origin_check;

alter table public.issue_reports
add constraint issue_reports_origin_check
check (origin in ('manual', 'public_report_page'));

create table if not exists public.public_form_visits (
  id uuid primary key default gen_random_uuid(),
  center_id uuid not null references public.centers(id) on delete cascade,
  session_id uuid not null,
  source text not null default 'public_report_page',
  visited_at timestamptz not null default now(),
  constraint public_form_visits_source_check
    check (source = 'public_report_page'),
  constraint public_form_visits_center_session_unique
    unique (center_id, session_id)
);

create index if not exists public_form_visits_center_visited_at_idx
on public.public_form_visits (center_id, visited_at desc);

alter table public.public_form_visits enable row level security;

revoke all on table public.public_form_visits from anon, authenticated;
grant select, insert on table public.public_form_visits to service_role;

commit;
