begin;

alter table public.profiles
  add column display_name text not null default '';

update public.profiles as profile
set display_name = coalesce(
  nullif(trim(private_profile.display_name), ''),
  profile.user_tag
)
from public.private_profiles as private_profile
where private_profile.user_id = profile.user_id;

update public.profiles
set display_name = user_tag
where display_name = '';

alter table public.profiles
  add constraint profiles_display_name_length
  check (length(display_name) <= 200);

create or replace view public.public_profiles
with (security_invoker = true)
as
select user_id, user_tag, photo_url, updated_at, display_name
from public.profiles;

comment on view public.public_profiles is
  'Allowlisted anonymous profile projection containing public identity only; never add email or migration identity columns.';

create or replace function public.provision_user_profile(
  p_user_tag text,
  p_display_name text default '',
  p_photo_url text default ''
)
returns public.profiles
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  provisioned public.profiles;
begin
  if p_user_tag !~ '^[a-zA-Z0-9_]{3,30}$'
    or length(coalesce(p_display_name, '')) > 200
    or length(coalesce(p_photo_url, '')) > 2048 then
    raise exception 'invalid profile fields' using errcode = '22023';
  end if;

  provisioned := public.provision_user_profile_bounded_impl(
    p_user_tag,
    p_display_name,
    p_photo_url
  );

  update public.profiles
  set display_name = coalesce(
        nullif(trim(p_display_name), ''),
        nullif(trim(provisioned.display_name), ''),
        provisioned.user_tag
      ),
      updated_at = now()
  where user_id = provisioned.user_id
  returning * into provisioned;

  return provisioned;
end;
$$;

revoke all on function public.provision_user_profile(text, text, text) from public;
grant execute on function public.provision_user_profile(text, text, text) to authenticated;
grant select on public.public_profiles to anon, authenticated;

commit;
