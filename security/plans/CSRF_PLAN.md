# CSRF PLAN

## Remediation Actions
- Documented guardrail: if cookie auth is added, enforce CSRF tokens + SameSite=strict/lax.

## Verification Checklist
- [ ] No session-cookie auth in backend currently.
- [ ] Confirm no regression in related routes/components.
- [ ] Keep this category in recurring quarterly audit.
