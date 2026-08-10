# MOB-24 — Mobile Foundation Closure and Release Readiness

MOB-24 formally closes the numbered Mobile Foundation series after the
MOB-01–23 canonical native, security, privacy, accessibility, resilience and
release contracts. The audited baseline is merged `main` at `69b9e37c`.

## Source-complete

- MOB-01 through MOB-24 verifier sequence is contiguous and passing.
- Root and native TypeScript checks pass.
- Resolved Expo public configuration passes.
- Android and iOS production exports pass.
- The Next.js production source compiles, type-checks and completes its build
  when the deployment Supabase configuration is present.
- Mobile CI enforces native TypeScript, resolved configuration, both platform
  exports and the consolidated foundation verifier.
- No runtime feature, API, database, schema, RLS, identity, role, approval,
  entitlement or business-workflow change is introduced by MOB-24.

## Physical-device and release-environment gates

These gates require signed builds, real credentials, enrolled hardware and the
canonical backend. They are intentionally not recorded as completed source
work:

- Android and iOS install, launch, upgrade and reinstall checks.
- Email and Google authentication callback checks.
- Registration evidence, camera, document and live-location checks.
- Push permission, receipt, tap routing and offline device-choice delivery.
- Background snapshot shielding, screen-capture blocking, inactivity lock,
  biometric or device-credential return, cold-start lock and remote session
  revocation drills.
- TalkBack, VoiceOver, large-text, switch-control and supported phone/tablet
  layout checks.
- Preview-channel compatible update and anti-bricking recovery drill.

## App-store gates

- Link the Expo project and configure development, preview and production EAS
  environments without committing credentials.
- Provision Apple and Google signing credentials and produce signed candidates.
- Complete privacy disclosures, permission declarations, screenshots, listing
  metadata, age/content declarations and reviewer access instructions.
- Complete TestFlight and Google Play internal testing, then submit the approved
  release candidates for review.

The numbered Mobile Foundation is closed at MOB-24. MOB-25 must not be created
unless a separately approved, material requirement justifies reopening the
series. Later routine fixes and release operations do not create a new numbered
foundation milestone.
