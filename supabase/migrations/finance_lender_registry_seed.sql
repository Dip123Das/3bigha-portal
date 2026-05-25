insert into public.finance_lender_registry (
  lender_name,
  lender_type,
  is_verified
)
values
('State Bank of India', 'public_bank', true),
('Punjab National Bank', 'public_bank', true),
('Bank of Baroda', 'public_bank', true),
('Canara Bank', 'public_bank', true),
('HDFC Bank', 'private_bank', true),
('ICICI Bank', 'private_bank', true),
('Axis Bank', 'private_bank', true),
('LIC Housing Finance', 'hfc', true),
('Bajaj Housing Finance', 'nbfc', true),
('West Bengal Gramin Bank', 'rrb', true),
('West Bengal State Cooperative Bank', 'cooperative', true)
on conflict do nothing;