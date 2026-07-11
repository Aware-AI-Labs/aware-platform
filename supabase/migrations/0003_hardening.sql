-- Security hardening from Supabase advisors.
create or replace function touch_updated_at()
returns trigger language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end $$;

revoke execute on function my_role() from anon;
revoke execute on function can_see_sensitive() from anon;
