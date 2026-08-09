# MOB-10 — Native Production Build Readiness

MOB-10 turns the established Android and iOS application into an explicit, reproducible production-build contract. It does not publish the app, create a second backend environment or place signing credentials in source control.

The app now has release version metadata, established 3Bigha icon assets, explicit runtime-version and update policy, bounded Android permissions, and EAS profiles for development, internal preview and production. The Expo project ID is supplied through release environment configuration and is the same identifier used by the existing push-device lifecycle.

Production builds require the canonical HTTPS API origin, public Supabase URL and anonymous key, linked Expo project ID, platform signing credentials and store accounts. Service-role keys, passwords, certificates and provisioning material remain prohibited from the mobile source tree.

Repository validation covers resolved Expo configuration, package identities, release profiles, public-environment boundaries, icon assets, MOB-01 through MOB-10 authority assertions, strict TypeScript and Android/iOS exports. Physical-device authentication, live evidence capture, push receipt and store submission remain release-environment gates.
