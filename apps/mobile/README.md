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
typecheck, both platform exports and the MOB-01 through MOB-12 verifiers.
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

## Local authentication configuration

Copy `.env.example` to `.env.local` and provide the public Supabase URL,
anonymous key and canonical 3Bigha API origin. Never place the Supabase
service-role key or another server secret in the mobile environment.
