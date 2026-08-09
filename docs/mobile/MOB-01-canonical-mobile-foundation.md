# MOB-01 — Canonical Mobile Foundation

## Decision

3Bigha mobile is a genuine Expo React Native interface for Android and iOS. It
does not use the existing Capacitor remote-WebView runtime as its architecture.

## Preserved canonical authorities

The mobile application does not define authentication, identity, role,
business, entitlement, inventory, RFQ, marketplace, billing, dispatch,
messaging, verification or notification authority. Those remain owned by the
existing 3Bigha backend and will be exposed through versioned contracts from
MOB-02 onward.

## Foundation boundary

MOB-01 provides:

- an isolated TypeScript mobile application under `apps/mobile`;
- stable Android and iOS application identifiers;
- Expo Router navigation;
- New Architecture configuration;
- adaptive phone/tablet presentation primitives;
- initial constitutional design tokens;
- independent mobile type and bundle checks.

MOB-01 does not provide:

- production login or token storage;
- canonical bootstrap or dashboard routing;
- business screens;
- API calls or Supabase clients;
- push notifications, deep links or device permissions;
- store signing or release submission.

## Compatibility posture

The existing Next.js portal, root Capacitor project and Android wrapper are not
modified by this sprint. The root TypeScript project explicitly excludes the
mobile source tree so web and native compilation remain independent during the
gradual repository transition.

## Verification gate

MOB-01 passes only when:

1. the mobile TypeScript project compiles in strict mode;
2. Expo resolves a valid Android configuration;
3. Expo resolves a valid iOS configuration;
4. Android and iOS JavaScript bundles export successfully;
5. repository inspection confirms no WebView dependency or remote runtime URL
   exists inside `apps/mobile`;
6. the existing web TypeScript check remains unaffected.

Physical-device development builds remain an environment verification step on
Android Studio/macOS Xcode infrastructure.
