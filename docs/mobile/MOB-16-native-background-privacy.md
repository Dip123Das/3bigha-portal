# MOB-16 — Native Background Privacy Shield

MOB-16 protects the visual surface of the installed application whenever the
operating system moves it away from the active foreground. The root native tree
is replaced for every inactive and background state, so recent-app previews and
transition snapshots do not retain authentication, identity, verification,
notification or business content.

The shield contains only fixed 3Bigha-owned language. It does not inspect,
render, log, store or transmit the current session, user identity, role,
notification action, server response, raw error or business data. Returning to
the active state restores the existing application tree without signing the
person out, replaying a mutation or creating a second authority.

This sprint adds no dependency, platform permission, endpoint, schema, RLS
policy, identity resolver, role rule, approval path or business mutation.
Physical Android and iOS recent-app snapshot checks remain release-device
gates. Root/mobile TypeScript, resolved Expo configuration, MOB-01 through
MOB-16 assertions, and Android/iOS production exports must pass.
