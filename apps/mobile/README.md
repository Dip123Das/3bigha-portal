# 3Bigha Native Mobile

This is the MOB-01 native foundation for the 3Bigha Android and iOS apps.
It is an Expo React Native application and does not render the production web
portal in a WebView.

## Scope

- Android package: `com.threebigha.mobile`
- iOS bundle identifier: `com.threebigha.mobile`
- Expo Router native navigation foundation
- React Native New Architecture enabled
- phone and tablet-aware foundation screen
- no authentication or business authority duplicated in the app

Authentication, canonical identity, role routing, permissions and operational
capabilities are intentionally deferred to MOB-02 and later sprints. They must
be consumed from versioned backend contracts.

## Local verification

```sh
npm ci
npm run typecheck
npm run bundle:android
npm run bundle:ios
```

For local native development, use `npm run android` on an Android development
machine or `npm run ios` on macOS after configuring the platform toolchain.

## Production build contract

MOB-10 adds explicit EAS development, internal-preview and production build
profiles. Configure `EXPO_PROJECT_ID` with the linked Expo project's UUID and
store the three `EXPO_PUBLIC_*` values in the matching EAS environment. They
are public client configuration, but no service-role key or signing credential
belongs in the repository.

Before requesting a signed build, run `npm run config:check`, the mobile
typecheck, both platform exports and `npm run verify:foundation`.
Signing credentials, Apple/Google account access, physical-device validation
and store submission remain controlled release operations.

MOB-11 provides a human-controlled release-health surface. Preview and
production builds use their EAS channel and application-version runtime to
accept only compatible updates. Update checks and downloads never block sign-in
or work, and Expo's anti-bricking recovery remains enabled.

MOB-12 establishes the native accessibility contract. Interactive controls
carry explicit roles, labels and state; important status changes use live
announcements; headings provide screen-reader structure; and controls retain
usable touch targets and dynamic text scaling. Physical TalkBack, VoiceOver,
large-text and switch-control checks remain release-device gates.

MOB-13 contains unexpected native render failures behind a human-readable safe
recovery screen. Retry and deliberate reload choices preserve the current
session, while the boundary neither displays nor stores personal data, tokens,
raw exception messages or stack traces.

MOB-14 routes canonical mobile API traffic through one bounded request layer.
Personal responses are never cached; stalled requests time out; malformed and
unavailable responses use privacy-safe failure categories; and mutations are
never replayed automatically.

MOB-15 validates every native authentication callback against the exact
3Bigha scheme and route before a one-time PKCE code exchange. Callback URLs and
authorization codes are never logged or persisted, and a new sign-in attempt
deliberately resets the in-memory consumption gate.

MOB-16 replaces the entire rendered app with a privacy-safe surface whenever
the operating system marks it inactive or backgrounded. Recent-app snapshots
therefore contain no session, identity, verification, notification or business
content, while returning to the app preserves the existing authenticated tree.

MOB-17 keeps that privacy surface in place while a returning authenticated
session is refreshed against canonical Supabase authority. Invalid sessions
fall back to the existing signed-out gateway; temporary failures keep work
hidden and provide a deliberate retry without exposing cached business data.

MOB-18 keeps the same shield in place after an extended background interval
until the operating system verifies the returning person using enrolled
biometrics or the device's secure fallback. 3Bigha receives only the result,
stores no biometric material, and offers safe retry or local sign-out without
turning device authentication into identity or business authority.

MOB-19 applies the operating system's screen-capture protection across the
entire mounted native tree. Authenticated work and identity onboarding cannot
be copied through ordinary screenshots or screen recording while the app is
open. The guard stores and transmits nothing and is only a disclosure control.

MOB-20 pairs encrypted native session storage with a non-secret installation
sentinel. If ordinary app storage has been removed while encrypted Keychain
material survives, the old Supabase session is deleted before restoration and
the fresh installation starts signed out. Normal upgrades retain both markers
and preserve the session.

MOB-21 hides authenticated work after five minutes without local touch activity
while the app remains in the foreground. The existing operating-system device
verification must succeed before the mounted application tree is revealed again;
no interaction history is persisted or transmitted.

MOB-22 keeps a session restored during a new application process behind the
existing privacy shield until operating-system device verification succeeds.
A new sign-in completed after a signed-out start remains uninterrupted, and
the cold-start decision is held only in memory for that process.

MOB-23 revalidates the canonical Supabase session every five minutes while an
authenticated app remains continuously active. Mounted work stays behind the
existing privacy shield during each check; canonical rejection signs out
locally, while temporary failure remains fail-closed with a human-controlled
retry. The interval creates no mobile authentication authority.

MOB-24 closes the numbered Mobile Foundation series. Its consolidated verifier
runs every MOB-01 through MOB-24 source contract in order and rejects a missing,
duplicate or unapproved later milestone. Source verification is complete only
with root and native TypeScript, resolved Expo configuration, Android and iOS
exports, and the web production build. Signed-build, physical-device and store
operations remain release gates; they are not represented as completed source
work. MOB-25 must not be created without separate approval of a material new
requirement.

## Local authentication configuration

Copy `.env.example` to `.env.local` and provide the public Supabase URL,
anonymous key and canonical 3Bigha API origin. Never place the Supabase
service-role key or another server secret in the mobile environment.
