# Permission Architecture

Permissions must distinguish:

1. Authentication
2. Internal access role
3. Human identity
4. Workspace membership
5. Capability entitlement
6. Growth Plan level
7. Team permission
8. Record ownership
9. Administrative authority

Human identity and Growth Plan must never grant administrative authority.

Users must not self-assign protected roles. Approval fields must be
server-controlled. Browser authority must remain minimal. Every new table
requires RLS review.
