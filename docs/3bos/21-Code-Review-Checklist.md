# Code Review Checklist

Every production change must pass this review.

## Architecture

- [ ] Existing files were reviewed before modification.
- [ ] The owning 3BOS Engine is identified.
- [ ] The owning capability is identified.
- [ ] Relevant identities and workspaces are identified.
- [ ] Growth Plan impact is documented.

## Dependencies

- [ ] Imports and shared components were reviewed.
- [ ] Database dependencies were reviewed.
- [ ] API dependencies were reviewed.
- [ ] Route and navigation dependencies were reviewed.
- [ ] Permission and RLS assumptions were reviewed.

## Human Experience

- [ ] The primary human task is clear.
- [ ] Language follows the 3BOS Language Dictionary.
- [ ] Human dignity is preserved.
- [ ] Unnecessary technical language is hidden.
- [ ] AI remains appropriately invisible.
- [ ] Loading, empty, error and success states are respectful.
- [ ] A first-time internet user can understand the journey.

## Devices and Accessibility

- [ ] Mobile behaviour was reviewed.
- [ ] Desktop behaviour was reviewed.
- [ ] Keyboard and screen-reader behaviour were considered.
- [ ] Important actions remain visible and understandable.

## Stability

- [ ] Existing functionality remains preserved.
- [ ] Type checking passed.
- [ ] Production build passed.
- [ ] Final diff was reviewed.
- [ ] Validation steps are documented.
- [ ] Rollback is available.
