# MOB-02 — Mobile Backend Contract Layer

## Decision

Native clients consume one versioned, authenticated bootstrap authority. They
do not query identity tables independently, reinterpret legacy roles, or decide
which primary dashboard a person receives.

## Endpoint

`GET /api/v1/mobile/bootstrap`

The endpoint supports both existing web cookie sessions and native
`Authorization: Bearer <access-token>` sessions. Both paths resolve the same
Supabase Auth user and use the authenticated Supabase client for RLS-aware
queries.

Responses are private and non-cacheable. The success envelope contains:

- person summary;
- canonical registration state and required next action;
- canonical identity and verification summary;
- semantic primary mobile dashboard key;
- primary web compatibility path;
- Unified Workspace path;
- authorised legacy and BOS operating capabilities.

Raw `profiles` and `business_profiles` records are deliberately excluded.

## Primary-dashboard contract

The established web resolver remains authoritative. MOB-02 translates its
result into a stable semantic key:

| Existing canonical destination | Mobile key |
|---|---|
| `/admin/dashboard` | `admin_home` |
| `/admin/blog` | `blog_admin_home` |
| `/dashboard/banker` | `banker_home` |
| `/dashboard/investor` | `investor_home` |
| `/dashboard/vendor` | `vendor_home` |
| `/blog/my` | `publisher_home` |
| buyer or neutral fallback | `buyer_home` |

Unified Workspace remains separate and never overrides this primary key.

## Authority boundary

`resolveAccessForUser` is now read-only. The previous compatibility grant
repair has been extracted into `repairCompatibilityGrantsForUser`, which is
invoked explicitly by the trusted bootstrap server boundary. Grant values are
still projected only from canonical identity master data.

The mobile contract contains no service-role credentials and accepts no role,
identity, entitlement, approval, or verification value from the client.

## Deferred to later sprints

- native Supabase session storage and login UI (MOB-03);
- identity declaration writes and onboarding UI (MOB-04);
- native role dashboards (MOB-05);
- dashboard aggregate data endpoints;
- push-device lifecycle;
- offline mutation queues.

## Verification

MOB-02 passes when:

1. root TypeScript compiles;
2. the MOB-01 no-WebView boundary still passes;
3. mobile TypeScript compiles;
4. the MOB-02 verifier confirms versioning, dual authentication, no-store
   response policy, semantic routing, limited DTO exposure and read-only access
   resolution.
