# Ionic frontend agent instructions

This Ionic/Angular application is a separate Git repository. It shares the NestJS backend with
the institutional dashboard. Preserve unrelated changes. For cross-repository work, consult the
canonical product and architecture documents in `../onehealth_backend/docs/project/` and the
backend constitution before changing backend code. Backend guards remain authoritative.

## Permanent security rules

- Apply security by default but proportionally: ordinary copy, styling and harmless refactors
  need secure coding and relevant tests, not a repository-wide scan.
- Treat authentication, authorization, roles, API calls, user input, uploads, filesystem access,
  external URLs, tokens, cookies, passwords, secrets, admin functions, webhooks, payments,
  containers, infrastructure, CI/CD and cloud configuration as security-sensitive. Inspect
  trust boundaries and realistic abuse cases, then review the Git diff.
- Authentication is not authorization. Client route guards and hidden controls cannot secure
  profiles, private chat, alerts or admin resources. Verify ownership, roles and permissions at
  the backend, including IDOR/BOLA and cross-user or privilege-escalation paths; deny by default.
- Treat user content, remote images, provider responses and Markdown as untrusted. Use Angular
  escaping and existing framework protections; assess XSS, injection, SSRF, path traversal,
  malicious uploads, mass assignment and unsafe deserialization where relevant. Keep CSP and
  service-worker security implications in view.
- Never commit or print passwords, API keys, access tokens, private keys, cloud credentials or
  production `.env` files. Provider secrets belong only in backend configuration, not browser
  bundles or logs. Minimize personal and health-sensitive information in responses and telemetry.
- Prefer maintained, necessary dependencies; do not implement cryptography or authentication
  primitives manually. `@openai/codex-security` is a global development tool, not a runtime
  dependency.

## Review and verification

1. For security-sensitive work, check auth separately from authorization, validate inputs,
   preserve least privilege, prevent sensitive exposure and consider realistic bypasses. Explain
   and avoid an obviously unsafe implementation.
2. Run focused tests and review the diff. Prefer targeted official `codex-security` review where
   useful. Full scans are for explicit requests, major releases, major auth/infrastructure changes
   or evidence of broader risk; do not repeat unchanged scans without reason.
3. Validate findings by proving attacker control, reachability, boundary, existing protections
   and impact. Distinguish **Confirmed vulnerability**, **Needs verification** and
   **Hardening recommendation**, avoiding pattern-only false positives.
4. Fix root causes with small safe changes and tests; check for new bypasses. Keep analysis
   efficient and final security review concise: authorization, validation, secrets, sensitive
   data and privileges.

Do not present community content as an official alert. Refer to `SECURITY.md` when present.
