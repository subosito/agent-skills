---
name: ory-hydra
description: Integrate, configure, extend, and troubleshoot Ory Hydra as an OAuth2 and OpenID Connect provider. Use when working on Ory Hydra or Ory Network OAuth2/OIDC for login and consent apps, OAuth2 clients, authorization code or client credentials flows, token handling, consent/session behavior, or self-hosted Hydra configuration and deployment.
---

# Ory Hydra

Use this skill to implement or debug Ory Hydra in applications and infrastructure. Prefer the focused references in `references/` over broad OAuth/OIDC documentation dumps.

## Quick Start

1. Identify the task shape:
   - Login/consent app integration
   - Browser authorization flow
   - Machine-to-machine flow
   - OAuth2 client creation or update
   - Token/introspection/revocation behavior
   - Self-hosted config or deployment issue
2. Read only the matching reference:
   - `references/integration.md` for login, consent, logout, challenge handling, and app boundary design.
   - `references/clients-and-flows.md` for grants, response types, scopes, redirect URIs, token behavior, and client management.
   - `references/configuration.md` for self-hosted Hydra deploy/config review.
3. Map the task to concrete Hydra roles:
   - authorization server,
   - login/consent app,
   - OAuth2 client,
   - resource server or relying party.
4. Keep protocol boundaries intact:
   - Hydra issues OAuth2/OIDC artifacts.
   - Hydra does not authenticate end users by itself.
   - The login/consent app owns user auth and approval UX.

## Workflow

### Implement or fix login and consent

1. Confirm which app handles end-user authentication.
2. Trace the redirect from Hydra to the login endpoint.
3. Read and preserve `login_challenge` and `consent_challenge`.
4. Accept or reject the challenge through Hydra admin APIs from the login/consent app.
5. Return the user to Hydra and continue the original OAuth2/OIDC flow.
6. If behavior is inconsistent, inspect remembered sessions, skip behavior, and client-specific consent settings.

Read `references/integration.md` first.

### Implement or debug a client flow

1. Identify the client type: confidential or public, browser/web app, SPA/native, machine-to-machine.
2. Verify the grant types and response types match the intended protocol flow.
3. Check redirect URIs, scopes, audience, and token endpoint auth method.
4. Test the exact flow shape before changing app code.
5. Separate Hydra responsibility from resource server authorization checks.

Read `references/clients-and-flows.md` first.

### Review self-hosted Hydra deployment

1. Start from current deployment config and exposed URLs.
2. Check public vs admin endpoint routing.
3. Check login, consent, and logout URLs.
4. Check DSN, secrets, issuer URL, and cookie/session assumptions.
5. If tokens or callbacks fail, verify client metadata and issuer consistency before changing application logic.

Read `references/configuration.md` first.

## Guardrails

- Treat Hydra as the OAuth2/OIDC server, not as the user database or general auth UI.
- Do not collapse the login/consent app into vague middleware without preserving the challenge/accept flow.
- Keep public and admin APIs distinct. Public API on port 4444, Admin API on port 4445.
- Match client grant types and redirect URIs precisely to the intended flow.
- Distinguish token issuance from resource authorization. Hydra mints and validates protocol artifacts; application services still enforce permissions.
- When Hydra is paired with Kratos, keep responsibilities separate: Kratos handles identity/authentication; Hydra handles OAuth2/OIDC.

## Deliverables

When completing a Hydra task, prefer to leave:

- the exact OAuth2/OIDC flow and client type used,
- the login/consent integration points,
- the client metadata or config keys changed,
- the public/admin/issuer URL assumptions,
- and any remaining deployment or callback step.
