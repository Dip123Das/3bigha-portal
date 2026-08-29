begin;

-- ADMIN-06: durable user authentication events. Supabase Auth remains authoritative.
create table if not exists public.user_security_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  event_type text not null check (event_type in ('login_success','logout','session_refresh','auth_method_changed','security_notice')),
  auth_method text check (auth_method is null or char_length(auth_method) <= 80),
  client_platform text not null default 'web' check (client_platform in ('web','android','ios')),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  event_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(event_metadata) = 'object'),
  occurred_at timestamptz not null default now()
);
create index if not exists idx_user_security_events_user_occurred on public.user_security_events(user_id,occurred_at desc);
create index if not exists idx_user_security_events_type_occurred on public.user_security_events(event_type,occurred_at desc);
alter table public.user_security_events enable row level security;
drop policy if exists user_security_events_read_own on public.user_security_events;
create policy user_security_events_read_own on public.user_security_events for select to authenticated using(auth.uid()=user_id);
revoke all on table public.user_security_events from anon,authenticated;
grant select on table public.user_security_events to authenticated;

create or replace function public.record_authenticated_security_event(
 p_user_id uuid,p_event_type text,p_auth_method text default null,p_client_platform text default 'web',p_user_agent text default null,p_metadata jsonb default '{}'::jsonb
) returns uuid language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare recorded_id uuid;
begin
 if coalesce(auth.role(),'')<>'service_role' and session_user not in ('postgres','supabase_admin') then raise exception 'Trusted service required' using errcode='42501'; end if;
 if p_event_type not in ('login_success','logout','session_refresh','auth_method_changed','security_notice') or p_client_platform not in ('web','android','ios') then raise exception 'Unsupported security event' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_user_id) then raise exception 'User not found' using errcode='P0002'; end if;
 select id into recorded_id from public.user_security_events where user_id=p_user_id and event_type=p_event_type and coalesce(auth_method,'')=coalesce(nullif(btrim(p_auth_method),''),'') and client_platform=p_client_platform and occurred_at>=now()-interval '5 seconds' order by occurred_at desc limit 1;
 if recorded_id is not null then return recorded_id; end if;
 insert into public.user_security_events(user_id,event_type,auth_method,client_platform,user_agent,event_metadata) values(p_user_id,p_event_type,left(nullif(btrim(p_auth_method),''),80),p_client_platform,left(nullif(btrim(p_user_agent),''),500),coalesce(p_metadata,'{}'::jsonb)) returning id into recorded_id;
 return recorded_id;
end; $$;
revoke all on function public.record_authenticated_security_event(uuid,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_authenticated_security_event(uuid,text,text,text,text,jsonb) to service_role;
comment on table public.user_security_events is 'Durable Admin BOS security timeline; trusted application-service writes only.';

commit;
