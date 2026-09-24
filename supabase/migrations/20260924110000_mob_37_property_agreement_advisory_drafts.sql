/*
 * MOB-37 private property-agreement advisory-draft ledger.
 *
 * This migration creates private persistence and audit boundaries only.
 * It does not open confidential documents, call an AI provider, generate
 * an agreement, approve legal language, create a signature, register or
 * execute an agreement, collect payment, sell inventory, or transfer title.
 */

create table if not exists
  public.property_unit_booking_agreement_drafts (
    id uuid primary key default gen_random_uuid(),

    readiness_id uuid not null
      references
        public.property_unit_booking_agreement_readiness(id)
      on delete restrict,

    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,

    hold_id uuid not null
      references public.property_unit_booking_holds(id)
      on delete restrict,

    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,

    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,

    buyer_user_id uuid not null
      references auth.users(id)
      on delete restrict,

    owner_user_id uuid not null
      references auth.users(id)
      on delete restrict,

    version integer not null default 1
      check (version > 0),

    status text not null default 'generation_pending'
      check (
        status in (
          'generation_pending',
          'generated',
          'lawyer_review_pending',
          'lawyer_changes_requested',
          'lawyer_approved',
          'superseded',
          'cancelled',
          'generation_failed'
        )
      ),

    prompt_version text not null
      default 'property-agreement-ai-draft-v1'
      check (
        prompt_version =
          'property-agreement-ai-draft-v1'
      ),

    draft_format text not null
      default 'structured_json_v1'
      check (draft_format = 'structured_json_v1'),

    source_snapshot_sha256 text not null
      check (
        source_snapshot_sha256 ~ '^[0-9a-f]{64}$'
      ),

    draft_content_json jsonb,

    printable_text text,

    draft_content_sha256 text
      check (
        draft_content_sha256 is null
        or draft_content_sha256 ~ '^[0-9a-f]{64}$'
      ),

    ai_provider text,

    ai_model text,

    ai_request_reference text,

    generation_started_at timestamptz,

    generated_at timestamptz,

    generation_failed_at timestamptz,

    generation_failure_code text,

    lawyer_review_required boolean not null default true
      check (lawyer_review_required),

    advisory_only boolean not null default true
      check (advisory_only),

    legal_effect_created boolean not null default false
      check (not legal_effect_created),

    signing_allowed boolean not null default false
      check (not signing_allowed),

    registration_allowed boolean not null default false
      check (not registration_allowed),

    execution_allowed boolean not null default false
      check (not execution_allowed),

    creates_payment boolean not null default false
      check (not creates_payment),

    marks_inventory_sold boolean not null default false
      check (not marks_inventory_sold),

    transfers_title boolean not null default false
      check (not transfers_title),

    transfers_ownership boolean not null default false
      check (not transfers_ownership),

    lawyer_reviewer_user_id uuid
      references auth.users(id)
      on delete set null,

    lawyer_review_started_at timestamptz,

    lawyer_reviewed_at timestamptz,

    lawyer_review_note text,

    approved_at timestamptz,

    superseded_at timestamptz,

    cancelled_at timestamptz,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now(),

    constraint property_agreement_draft_parties_differ
      check (buyer_user_id <> owner_user_id),

    constraint property_agreement_draft_one_version
      unique (readiness_id, version),

    constraint property_agreement_draft_content_pair
      check (
        (
          draft_content_json is null
          and printable_text is null
          and draft_content_sha256 is null
        )
        or (
          draft_content_json is not null
          and jsonb_typeof(draft_content_json) = 'object'
          and nullif(btrim(printable_text), '') is not null
          and draft_content_sha256 is not null
        )
      ),

    constraint property_agreement_generated_content_required
      check (
        status not in (
          'generated',
          'lawyer_review_pending',
          'lawyer_changes_requested',
          'lawyer_approved',
          'superseded'
        )
        or (
          draft_content_json is not null
          and nullif(btrim(printable_text), '') is not null
          and draft_content_sha256 is not null
          and nullif(btrim(ai_provider), '') is not null
          and nullif(btrim(ai_model), '') is not null
          and generated_at is not null
        )
      ),

    constraint property_agreement_generation_failure_fields
      check (
        status <> 'generation_failed'
        or (
          generation_failed_at is not null
          and nullif(
            btrim(generation_failure_code),
            ''
          ) is not null
        )
      ),

    constraint property_agreement_lawyer_review_fields
      check (
        status not in (
          'lawyer_changes_requested',
          'lawyer_approved'
        )
        or (
          lawyer_reviewer_user_id is not null
          and lawyer_review_started_at is not null
          and lawyer_reviewed_at is not null
        )
      ),

    constraint property_agreement_approval_fields
      check (
        status <> 'lawyer_approved'
        or (
          approved_at is not null
          and lawyer_reviewer_user_id is not null
          and lawyer_reviewed_at is not null
        )
      ),

    constraint property_agreement_superseded_fields
      check (
        status <> 'superseded'
        or superseded_at is not null
      ),

    constraint property_agreement_cancelled_fields
      check (
        status <> 'cancelled'
        or cancelled_at is not null
      )
  );

create unique index if not exists
  property_agreement_one_live_draft_idx
on public.property_unit_booking_agreement_drafts(
  readiness_id
)
where status in (
  'generation_pending',
  'generated',
  'lawyer_review_pending',
  'lawyer_changes_requested'
);

create index if not exists
  property_agreement_drafts_application_idx
on public.property_unit_booking_agreement_drafts(
  application_id,
  created_at desc
);

create index if not exists
  property_agreement_drafts_unit_idx
on public.property_unit_booking_agreement_drafts(
  unit_id,
  created_at desc
);

create index if not exists
  property_agreement_drafts_buyer_idx
on public.property_unit_booking_agreement_drafts(
  buyer_user_id,
  created_at desc
);

create index if not exists
  property_agreement_drafts_owner_idx
on public.property_unit_booking_agreement_drafts(
  owner_user_id,
  created_at desc
);

create index if not exists
  property_agreement_drafts_lawyer_queue_idx
on public.property_unit_booking_agreement_drafts(
  status,
  created_at
)
where status = 'lawyer_review_pending';

create table if not exists
  public.property_unit_booking_agreement_draft_sources (
    id uuid primary key default gen_random_uuid(),

    draft_id uuid not null
      references
        public.property_unit_booking_agreement_drafts(id)
      on delete restrict,

    readiness_id uuid not null
      references
        public.property_unit_booking_agreement_readiness(id)
      on delete restrict,

    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,

    source_kind text not null
      check (
        source_kind in (
          'canonical_property_schedule',
          'buyer_confirmed_particulars',
          'owner_confirmed_particulars',
          'confidential_legal_document'
        )
      ),

    source_key text not null
      check (
        char_length(btrim(source_key))
          between 1 and 200
      ),

    document_id uuid
      references
        public.property_project_legal_documents(id)
      on delete restrict,

    source_sha256 text not null
      check (source_sha256 ~ '^[0-9a-f]{64}$'),

    included_in_generation boolean not null
      default false,

    included_at timestamptz,

    created_at timestamptz not null default now(),

    constraint property_agreement_draft_source_unique
      unique (draft_id, source_kind, source_key),

    constraint property_agreement_legal_source_document
      check (
        (
          source_kind = 'confidential_legal_document'
          and document_id is not null
        )
        or (
          source_kind <>
            'confidential_legal_document'
          and document_id is null
        )
      ),

    constraint property_agreement_source_inclusion_time
      check (
        (
          included_in_generation
          and included_at is not null
        )
        or (
          not included_in_generation
          and included_at is null
        )
      )
  );

create index if not exists
  property_agreement_draft_sources_draft_idx
on public.property_unit_booking_agreement_draft_sources(
  draft_id,
  created_at
);

create index if not exists
  property_agreement_draft_sources_document_idx
on public.property_unit_booking_agreement_draft_sources(
  document_id,
  created_at
)
where document_id is not null;

create table if not exists
  public.property_unit_booking_agreement_draft_events (
    id uuid primary key default gen_random_uuid(),

    draft_id uuid not null
      references
        public.property_unit_booking_agreement_drafts(id)
      on delete restrict,

    readiness_id uuid not null
      references
        public.property_unit_booking_agreement_readiness(id)
      on delete restrict,

    application_id uuid not null
      references public.property_unit_booking_applications(id)
      on delete restrict,

    unit_id uuid not null
      references public.builder_inventory_units(id)
      on delete restrict,

    project_id uuid not null
      references public.builder_projects(id)
      on delete restrict,

    actor_user_id uuid
      references auth.users(id)
      on delete set null,

    actor_role text not null
      check (
        actor_role in (
          'buyer',
          'owner',
          'legal_reviewer',
          'system'
        )
      ),

    event_kind text not null
      check (
        event_kind in (
          'generation_requested',
          'source_bound',
          'source_opened_for_generation',
          'generation_started',
          'draft_generated',
          'generation_failed',
          'lawyer_review_requested',
          'lawyer_review_started',
          'lawyer_changes_requested',
          'lawyer_approved',
          'draft_superseded',
          'draft_cancelled'
        )
      ),

    previous_status text,

    next_status text,

    document_id uuid
      references
        public.property_project_legal_documents(id)
      on delete restrict,

    metadata jsonb not null default '{}'::jsonb
      check (jsonb_typeof(metadata) = 'object'),

    created_at timestamptz not null default now(),

    constraint property_agreement_event_document_scope
      check (
        event_kind =
          'source_opened_for_generation'
        or document_id is null
      )
  );

create index if not exists
  property_agreement_draft_events_draft_created_idx
on public.property_unit_booking_agreement_draft_events(
  draft_id,
  created_at,
  id
);

create index if not exists
  property_agreement_draft_events_readiness_created_idx
on public.property_unit_booking_agreement_draft_events(
  readiness_id,
  created_at,
  id
);

alter table
  public.property_unit_booking_agreement_drafts
  enable row level security;

alter table
  public.property_unit_booking_agreement_draft_sources
  enable row level security;

alter table
  public.property_unit_booking_agreement_draft_events
  enable row level security;

revoke all on
  public.property_unit_booking_agreement_drafts
from public, anon, authenticated;

revoke all on
  public.property_unit_booking_agreement_draft_sources
from public, anon, authenticated;

revoke all on
  public.property_unit_booking_agreement_draft_events
from public, anon, authenticated;

grant select, insert, update on
  public.property_unit_booking_agreement_drafts
to service_role;

grant select, insert, update on
  public.property_unit_booking_agreement_draft_sources
to service_role;

grant select, insert on
  public.property_unit_booking_agreement_draft_events
to service_role;

comment on table
  public.property_unit_booking_agreement_drafts is
  'Private, versioned, advisory-only property-agreement draft ledger. Drafts require later lawyer review and have no legal, signing, registration, execution, payment, sale, title or ownership effect.';

comment on table
  public.property_unit_booking_agreement_draft_sources is
  'Private source manifest for advisory drafting. It records hashes and identifiers only; storage paths, signed URLs, raw files and AI prompt payloads must never be stored here.';

comment on table
  public.property_unit_booking_agreement_draft_events is
  'Append-only audit history for advisory drafting and later lawyer review. Signed URLs, raw document content, complete prompts and complete AI responses must never be stored in event metadata.';

comment on column
  public.property_unit_booking_agreement_drafts.draft_content_json is
  'Private structured advisory text. It is not legally approved merely because it was generated.';

comment on column
  public.property_unit_booking_agreement_drafts.printable_text is
  'Private advisory print text aligned later to the canonical readiness print-layout metadata.';

comment on column
  public.property_unit_booking_agreement_draft_sources.document_id is
  'Private reference only. Document storage paths and signed URLs are never copied into this ledger.';

comment on column
  public.property_unit_booking_agreement_drafts.ai_request_reference is
  'Opaque server-side correlation reference only. Provider credentials, signed URLs and confidential prompt payloads are forbidden.';
