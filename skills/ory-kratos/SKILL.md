---
name: ory-kratos
description: Integrate, configure, extend, and troubleshoot Ory Kratos identity and authentication flows. Use when working on Ory Kratos or Ory Identities for login, registration, logout, settings, recovery, verification, sessions, identity schemas, self-hosted config, custom UI integration, Ory Actions, or admin identity management.
---

# Ory Kratos

Use this skill to implement or debug Ory Kratos in applications and infrastructure. Prefer targeted reads from `references/` instead of browsing broad docs during the task.

## Quick Start

1. Identify the problem shape:
   - Browser or SPA auth flow
   - Native/mobile API flow
   - Identity schema or admin identity management
   - Session handling or authorization gate
   - Self-hosted configuration
   - Hooks / Ory Actions
2. Read only the matching reference file:
   - `references/integration.md` for self-service flows, custom UI, browser vs native, session handling, and API endpoints.
   - `references/identities.md` for schemas, traits, credentials, metadata, admin operations, and credential types.
   - `references/configuration.md` for self-hosted setup, config review, Ory Actions, and deployment.
3. Map the task to concrete Kratos endpoints, config keys, or UI flow steps before editing code.
4. Keep browser security constraints intact:
   - Use browser flows for browser apps.
   - Preserve redirects, CSRF cookies, and same-top-level-domain assumptions.
   - Do not replace Kratos flow state with ad hoc frontend state.

## Workflow

### Implement or fix a UI flow

1. Determine whether the app is browser-based or native.
2. Initialize the correct Kratos flow.
3. Fetch the flow payload and render UI from `ui.nodes`.
4. Submit to the Kratos `ui.action` target, not to an app-local imitation endpoint unless intentionally proxying.
5. On error, re-fetch the same flow and render returned messages.
6. On success, handle Kratos redirect or returned session/token shape.

Read `references/integration.md` first.

### Modify identity data or login identifiers

1. Inspect the existing identity schema and the traits in live identities.
2. Change schema traits deliberately, especially identifiers, verification targets, and recovery targets.
3. Verify that registration, settings, recovery, and verification flows still align with the schema.
4. Check whether admin-created identities, imports, or migrations also need updates.

Read `references/identities.md` first.

### Review self-hosted config or production issues

1. Start from the quickstart or current deployment config.
2. Separate example config from full reference config.
3. Trace relevant settings for courier, secrets, cookies, self-service URLs, and method enablement.
4. If the task involves post-login or post-registration business logic, review Ory Actions / hooks.

Read `references/configuration.md` first.

## Guardrails

- Treat Kratos as headless. Build or modify the app UI, not a nonexistent built-in UI.
- Do not use native/API flows for browser apps.
- Keep Kratos and the auth UI on the same top-level domain for browser cookie flows.
- Render form fields from Kratos flow payloads instead of hardcoding only a subset unless the task is intentionally narrow.
- Distinguish public/self-service endpoints from admin endpoints.
- When changing schemas, reason through downstream effects on verification, recovery, and account lookup.
- Always use `127.0.0.1` not `localhost` for local development (cookie domain handling).
- CSRF tokens are required for browser flows (not API flows).

## Deliverables

When completing a Kratos task, prefer to leave:

- the exact flow type and endpoints used,
- the schema or config files changed,
- any domain/cookie assumptions,
- and any remaining deployment or migration step.
