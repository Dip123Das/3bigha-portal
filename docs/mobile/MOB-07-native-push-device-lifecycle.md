# MOB-07 — Native Push-Device Lifecycle

MOB-07 connects an installed Android or iOS app to the existing `user_push_tokens` registry and `notifyUser` delivery boundary. It creates no notification authority, user identity, role projection or parallel device table.

The native app asks for notification permission only after authentication and only when the person chooses **Enable important alerts**. Denial never blocks registration or dashboard access. A device-scoped identifier is stored in encrypted device storage so the same installation can inspect and disable only its own registration.

`GET`, `PUT` and `DELETE /api/v1/mobile/push-device` authenticate the canonical session, derive the user ID server-side, reject submitted roles and accept bounded non-authoritative device metadata. Writes use the existing trusted token helper because the repository does not expose direct client policies for the registry.

Expo push tokens support both Android and iOS through the existing `sendMobilePush` function. Existing Firebase tokens remain supported. Disabling one device does not sign out the account or change another device.

When the platform rotates a token, registration disables older tokens belonging to the same user and installation before activating the replacement, preventing duplicate delivery.

Physical-device receipt remains a release-environment verification step because it requires a linked Expo project, production credentials and an installed build. Root/mobile TypeScript, MOB-01 through MOB-07 assertions, and Android/iOS exports must pass before publication.
