# MOB-19 — Native Screen-Capture Protection

MOB-19 closes the active-screen disclosure gap that remains after background
privacy and returning-person verification. One root native guard asks Android
and iOS to prevent ordinary screenshots and screen recording for the full
lifetime of the mounted application tree, including sign-in, identity
onboarding, verification and authenticated business surfaces.

The protection is installed above authentication and navigation so a route or
session transition cannot temporarily remove it. The Expo-supported keyed hook
releases the operating-system guard only when the root protection component
unmounts; feature screens do not independently enable or disable capture.

No screenshot listener, media-library permission, image, recording, capture
event or diagnostic record is created. Screen-capture protection is only a
local disclosure safeguard. It cannot establish identity, role, verification,
approval, entitlement, session validity or business authority.

This milestone adds one Expo-supported native dependency and no backend API,
database, RLS policy, business mutation or workflow change. Root/mobile
TypeScript, resolved Expo configuration, MOB-01 through MOB-19 assertions, and
Android/iOS production exports must pass before publication. Physical Android
and iOS screenshot, recording and lifecycle checks remain release-device gates.
