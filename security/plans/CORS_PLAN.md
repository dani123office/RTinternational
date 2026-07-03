# CORS PLAN

## Remediation Actions
- Introduced allow_origin_regex for Vercel preview domains and sanitized explicit origins list.

## Verification Checklist
- [ ] Allowed origins include localhost + production + regex preview matches only.
- [ ] Confirm no regression in related routes/components.
- [ ] Keep this category in recurring quarterly audit.
