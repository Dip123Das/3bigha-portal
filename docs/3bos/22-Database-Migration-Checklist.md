# Database Migration Checklist

## Before Migration

- [ ] Existing tables, columns and data were reviewed.
- [ ] Constraints, indexes, triggers and functions were reviewed.
- [ ] RLS status and policies were reviewed.
- [ ] Views and dependent APIs were reviewed.
- [ ] Existing distinct values were audited.
- [ ] A pre-change snapshot or backup is available.

## Migration Design

- [ ] The migration is backward compatible where possible.
- [ ] Existing production records remain valid.
- [ ] New constraints do not reject legitimate legacy data.
- [ ] Required indexes are included.
- [ ] New tables have ownership and RLS policies.
- [ ] Administrative and user permissions are separated.
- [ ] Data migration is auditable.
- [ ] Rollback SQL is prepared.

## Validation

- [ ] Expected tables and columns exist.
- [ ] Constraints and indexes exist.
- [ ] RLS and policies behave correctly.
- [ ] Existing workflows still read and write successfully.
- [ ] No unexpected nulls or duplicate records were introduced.
- [ ] Application type checking and build pass.
