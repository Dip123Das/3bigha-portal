# MOB-03 — Native Authentication and Session Security

## Decision

The native application authenticates directly with the existing Supabase Auth
project. It creates no mobile user table, role store, entitlement mechanism or
parallel identity authority.

## Supported human entry paths

- email magic link;
- phone OTP;
- Google OAuth.

These match the established portal providers. Registration and sign-in remain
one dignified entry surface; canonical registration state and required next
actions continue to come from the MOB-02 bootstrap contract.

## Session security

- Supabase Auth uses PKCE and does not infer a session from a browser URL.
- Native session material is stored with `expo-secure-store` and the
  `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility class.
- The access token is sent only as a Bearer credential to the versioned
  canonical backend endpoint.
- Tokens are never logged, placed in routes or treated as identity/role data.
- Automatic refresh runs only while the application is active and stops when
  it enters the background.
- Sign-out removes the session from the current device.

Web builds use browser local storage only for development/preview compatibility;
Android and iOS use encrypted platform storage.

## Deep-link contract

The Expo application scheme is `threebigha`. Supabase Auth must allow:

```text
threebigha://auth/callback
```

Expo development builds can produce an environment-specific callback through
`Linking.createURL`; that exact value must be allow-listed for development.
Production OAuth and magic links exchange only the returned PKCE code.

## Public configuration

The mobile build requires:

- `EXPO_PUBLIC_SUPABASE_URL`;
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`;
- `EXPO_PUBLIC_API_URL` (canonical portal origin).

No service-role key or private backend secret is permitted in `apps/mobile`.

## Deferred

- identity declaration and onboarding writes (MOB-04);
- native dashboard routing and capability screens (MOB-05);
- biometric re-authentication policy;
- account-wide remote sign-out and device management;
- release signing and store distribution.

## Verification gate

MOB-03 passes only when strict TypeScript, Android/iOS exports, MOB-01 and MOB-02
regressions, and the MOB-03 security assertions all pass. Real provider sign-in
must additionally be verified in a configured development build because this
workspace has no production Supabase credentials or physical device.

At implementation time, `npm audit` also reports transitive `image-size` and
`uuid` advisories inside the Expo/Metro build toolchain. The offered automated
resolution downgrades Expo across a breaking major boundary, so it is not
applied. These packages do not parse user-selected application content in the
MOB-03 runtime; they must be revisited when the compatible Expo line publishes
an upstream resolution.
