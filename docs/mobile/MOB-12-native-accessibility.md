# MOB-12 — Native Accessibility and Inclusive Interaction Readiness

MOB-12 establishes an explicit accessibility contract across the existing
native authentication, onboarding, dashboard, notification and release-health
surfaces. It does not change their business behavior or server authority.

Interactive controls expose a native role, human-readable label and relevant
selected, checked, disabled or busy state. Inputs are associated with their
visible purpose. Screen-reader headings provide structure, loading states and
important results are announced, decorative arrows are hidden, and compact
controls receive additional touch area without changing the visual design.
React Native dynamic text scaling remains enabled; no fixed font-scale ceiling
or application-owned animation is introduced.

The repository verifier rejects unlabeled mobile pressables, text inputs that
lack accessible names, hidden dynamic-type overrides and milestone regression.
Root/mobile TypeScript, resolved Expo configuration, MOB-01 through MOB-12
assertions, and Android/iOS exports must pass before publication. TalkBack,
VoiceOver, large-text, keyboard/switch navigation and contrast checks on real
Android and iOS devices remain controlled release-environment gates.

This milestone introduces no API, schema, RLS policy, identity, role, grant,
approval, entitlement, verification decision or business mutation.
