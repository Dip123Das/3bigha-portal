# MOB-13 — Native Failure Containment and Safe Recovery

MOB-13 adds a top-level native render-failure boundary so an unexpected presentation failure cannot replace the whole application with a developer-oriented error surface. The person receives a dignified explanation, can retry the current native tree without signing out, and can deliberately reload the installed app when retrying is insufficient.

The recovery surface shows only the installed application version and build-owned release channel. It does not render, persist or transmit raw exception messages, stack traces, access tokens, identity facts, business data or server responses. It adds no monitoring vendor, network endpoint or diagnostic store.

Recovery cannot change authentication authority, canonical identity, roles, grants, approvals, verification, subscriptions or server-owned work. A reload failure remains non-blocking and explains that the person may close and reopen the app.

Root/mobile TypeScript, resolved Expo configuration, MOB-01 through MOB-13 assertions, and Android/iOS production exports must pass before publication. Physical-device forced-failure and recovery checks remain a release-device gate.
