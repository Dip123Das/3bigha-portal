begin;

-- ADMIN-04: atomic human resolution over the existing Trusted Listing Media authority.
create or replace function public.admin_resolve_listing_media_verification(p_verification_id uuid,p_actor_user_id uuid,p_resolution_type text,p_notes text)
returns public.listing_media_verifications language plpgsql security definer set search_path=public,auth,pg_catalog as $$
declare current_row public.listing_media_verifications%rowtype; next_decision text; previous_decision text;
begin
 if coalesce(auth.role(),'')<>'service_role' and session_user not in ('postgres','supabase_admin') then raise exception 'Trusted admin service required' using errcode='42501'; end if;
 if not exists(select 1 from public.profiles where id=p_actor_user_id and role='master_admin' and coalesce(account_status,'active')='active') then raise exception 'Active master administrator required' using errcode='42501'; end if;
 if p_resolution_type not in ('approve_override','false_positive','correction_required','reject') then raise exception 'Unsupported moderation resolution' using errcode='22023'; end if;
 if length(btrim(coalesce(p_notes,'')))<10 then raise exception 'Rationale must contain at least 10 characters' using errcode='22023'; end if;
 select * into current_row from public.listing_media_verifications where id=p_verification_id for update;
 if not found then raise exception 'Verification not found' using errcode='P0002'; end if;
 if current_row.resolved_at is not null then raise exception 'Verification already resolved' using errcode='23505'; end if;
 previous_decision:=current_row.deterministic_decision;
 next_decision:=case p_resolution_type when 'correction_required' then 'correction_required' when 'reject' then 'reject' else 'overridden' end;
 update public.listing_media_verifications set deterministic_decision=next_decision,requires_admin_review=false,resolved_at=now(),resolved_by=p_actor_user_id,resolution_type=p_resolution_type where id=p_verification_id returning * into current_row;
 insert into public.listing_moderation_events(listing_entity_type,listing_entity_id,draft_token,actor_user_id,event_type,from_status,to_status,reason_code,notes,related_verification_id,event_metadata)
 values(current_row.listing_entity_type,current_row.listing_entity_id,current_row.draft_token,p_actor_user_id,'admin_media_moderation_decision',previous_decision,next_decision,p_resolution_type,btrim(p_notes),current_row.id,jsonb_build_object('authority','master_admin','ai_advisory',true));
 return current_row;
end; $$;
revoke all on function public.admin_resolve_listing_media_verification(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.admin_resolve_listing_media_verification(uuid,uuid,text,text) to service_role;
create index if not exists idx_listing_media_assets_duplicate_hash_review on public.listing_media_assets(sha256,owner_user_id,listing_entity_type) where sha256 is not null and deleted_at is null;

commit;
