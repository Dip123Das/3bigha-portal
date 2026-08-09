# MOB-11 — Native Release Health and Safe Update Recovery

MOB-11 completes the in-app side of the production release contract. A person can inspect the installed application version and build channel, check for a compatible update, choose whether to download it, and restart only when convenient. Authentication and business work never wait for the update service.

Production and preview binaries derive their update URL from the configured Expo project ID. EAS channels separate development, preview and production, while the application-version runtime policy prevents a JavaScript update from crossing an incompatible native binary boundary. Automatic update downloads are disabled; Expo's anti-bricking and embedded-update emergency launch remain enabled.

If checking, downloading or restarting fails, the current application remains usable and the interface explains what happened. If Expo performs an emergency launch, the person is told that the embedded safe build has recovered. The app never overrides update URLs or request headers at runtime.

This milestone introduces no backend, schema, RLS policy, identity, role, grant, approval, entitlement or business mutation. Root/mobile TypeScript, resolved Expo configuration, MOB-01 through MOB-11 assertions, and Android/iOS production exports must pass before publication. A real preview-channel update and recovery drill remain physical release-environment gates.
