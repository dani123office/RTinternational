# RATE_LIMITING PLAN

## Remediation Actions
- Added stricter auth limiter (15/min) and safe x-forwarded-for parsing for client bucket selection.

## Verification Checklist
- [ ] Burst login attempts trigger 429 quickly; normal traffic unaffected.
- [ ] Confirm no regression in related routes/components.
- [ ] Keep this category in recurring quarterly audit.
