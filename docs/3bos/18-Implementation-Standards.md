# Implementation Standards

Before modifying an existing file:

1. Read the complete relevant file.
2. Identify its responsibility.
3. Review imports and dependencies.
4. Review database calls.
5. Review APIs and routes.
6. Review permission assumptions.
7. Review mobile and desktop effects.
8. Identify what must be preserved.
9. Define the smallest safe change.
10. Prepare validation and rollback.

Avoid duplicate logic, uncontrolled global CSS, blind replacement and unsafe
renaming. Preserve stable internal values through compatibility adapters.

Run type checks and production builds. Inspect the final diff before committing.
