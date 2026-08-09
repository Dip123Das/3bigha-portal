# MOB-04 — Native Identity Declaration and Onboarding

## Constitutional boundary

MOB-04 presents a genuine Expo registration journey but does not establish mobile-owned identity, role, grant, approval, subscription, verification or dashboard authority. The authenticated adapter loads active identities from `identity_master`, calls `declare_operating_profile` and `sync_member_module_grants`, and submits member facts to the existing profile records and registration evaluator.

## Included journey

- Customer / Buyer quick setup with onboarding contract version 4.
- Business and Individual Skilled Professional pathways.
- Original name, contact, official State and District/City, and optional six-digit PIN.
- Canonical business details and `resolveLocation` LGD projection.
- Live-device GPS coordinates.
- Protected business proof upload.
- Mandatory live-camera selfie.
- Two live-camera work photographs for self-working professionals.
- Pending, correction, human-review and approved result presentation.

Gallery selection is intentionally unavailable for live evidence. A document picker is available only for business proof. Uploaded content is stored in the existing `vendor-media` bucket and referenced from canonical evidence fields.

## Authority and safety

The adapter rejects input keys related to roles, grants, approval, verification, subscriptions, dashboard activation, eligibility, scoring or decisions. It accepts only allowlisted member-supplied facts. Automated decisions come only from `evaluate_automated_registration_verification`; human review remains an authorised administrative action.

MOB-02 bootstrap now treats every completed onboarding contract version from version 2 onward as compatible, including the current version 4.

## Validation

Run root and native TypeScript, MOB-01 through MOB-04 verifiers, and Android and iOS production exports before publication.
