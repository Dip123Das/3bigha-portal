# Database Architecture

Database structure must support human identities and workflows without forcing
the interface to mirror technical tables.

The system must distinguish:

- authentication account;
- access role;
- person or organisation;
- human identities;
- business activities;
- workspace membership;
- capability entitlement;
- Growth Plan;
- team permissions;
- verification;
- marketplace records;
- operational records.

Existing structures including `profiles`, `business_profiles`,
`vendor_module_grants`, subscription fields and payment records remain
operational during migration.

No new table is created before schema, ownership, RLS, indexes, migration,
compatibility and rollback are reviewed.
