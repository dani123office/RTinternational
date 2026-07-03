# SECRETS_EXPOSURE PLAN

## Remediation Actions
- Redacted testsprite_tests/tmp/config.json and expanded .gitignore to ignore testsprite_tests/tmp/** and env files.
- Rotate any credential that may have appeared in git history (API keys, SMTP credentials, JWT secrets).
- Rewrite repository history to purge previously committed secrets using a history-rewrite tool, then force-push coordinated with collaborators.

## Verification Checklist
- [ ] Confirm no files under testsprite_tests/tmp and no .env files are tracked in git index, and keyword/pattern-based scans of tracked files show no live secrets.
- [ ] Secret scanner run over full history reports zero exposed active secrets.
- [ ] Rotated secrets are updated in deployment environments and old values are revoked.
- [ ] Confirm no regression in related routes/components.
- [ ] Keep this category in recurring quarterly audit.
