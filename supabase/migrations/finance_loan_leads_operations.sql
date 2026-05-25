alter table public.finance_loan_leads
add column if not exists assigned_lender text,
add column if not exists assigned_lender_type text,
add column if not exists lead_score integer default 0,
add column if not exists sanction_probability integer default 0,
add column if not exists recommended_lender text,
add column if not exists priority text default 'normal',
add column if not exists document_checklist jsonb default '[]'::jsonb,
add column if not exists regional_guidance jsonb default '{}'::jsonb,
add column if not exists admin_notes text,
add column if not exists updated_at timestamptz default now();

create index if not exists finance_loan_leads_priority_idx
on public.finance_loan_leads (priority, status, created_at desc);