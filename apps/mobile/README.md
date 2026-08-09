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
