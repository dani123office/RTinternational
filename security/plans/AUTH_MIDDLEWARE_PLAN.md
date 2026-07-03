# AUTH_MIDDLEWARE PLAN

## Remediation Actions
- Changed auth to require RT_JWT_SECRET in production and generate ephemeral dev secret only for non-production.

## Verification Checklist
- [ ] Unset RT_JWT_SECRET with RT_ENV=production should fail startup; non-prod should start with ephemeral secret.
- [ ] Confirm no regression in related routes/components.
- [ ] Keep this category in recurring quarterly audit.
