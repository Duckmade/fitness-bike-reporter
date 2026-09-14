alter table public.centers
add column if not exists bike_type text;

alter table public.centers
drop constraint if exists centers_bike_type_check;

alter table public.centers
add constraint centers_bike_type_check
check (bike_type is null or bike_type in ('smart_plus', 'phantom'));

update public.centers
set bike_type = 'phantom'
where lower(trim(name)) in ('prismet', 'fitnessx prismet')
  and bike_type is null;
