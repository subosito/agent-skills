# Ory Hydra Integration

## Use This Reference For

- Login and consent app implementation
- Redirect and challenge handling
- Logout and session-adjacent behavior
- Separating Hydra from user authentication

## Core Model

- Hydra is an OAuth2 and OpenID Connect server.
- Hydra does not authenticate users by itself. It delegates end-user authentication and consent UX to external login and consent endpoints.
- The login/consent app decides whether the user is signed in, whether consent can be skipped, and what claims/scopes to grant.

## Login and Consent Pattern

Typical browser-based authorization flow:

1. A client starts an OAuth2/OIDC authorization request against Hydra.
2. Hydra redirects to the configured login endpoint with a `login_challenge`.
3. The login app authenticates the user and accepts or rejects the login request through Hydra's admin API.
4. Hydra continues to the consent endpoint with a `consent_challenge` unless consent can be skipped.
5. The consent app grants or denies requested scopes/audience and accepts or rejects the consent request through Hydra's admin API.
6. Hydra returns to the original client redirect URI with the authorization result.

## Challenge Handling Rules

- Preserve `login_challenge` and `consent_challenge` exactly.
- Handle them only in trusted app/backend code that can call Hydra admin APIs.
- Do not fabricate redirects locally without accepting or rejecting the challenge with Hydra.
- Investigate remembered login/consent state before assuming the UX is broken; skip behavior is often intentional.

## Login App Responsibilities

- Authenticate the end user.
- Establish the local app session if needed.
- Decide whether to reuse an existing login session.
- Accept or reject the login request.
- Redirect the browser to Hydra's returned redirect target.

## Consent App Responsibilities

- Inspect requested scopes and audience.
- Decide whether to show consent.
- Compute granted scopes/claims.
- Accept or reject the consent request.
- Redirect back to Hydra.

---

## Login Endpoint

### Fetch Login Request

```bash
curl http://127.0.0.1:4445/admin/oauth2/auth/requests/login?login_challenge=xxx
```

Response:
```json
{
  "challenge": "login-challenge-id",
  "client": {
    "client_id": "my-client",
    "client_name": "My Application",
    "redirect_uris": ["http://localhost:3000/callback"]
  },
  "oidc_context": {
    "acr_values": ["2fa"],
    "login_hint": "user@example.com",
    "ui_locales": ["en"]
  },
  "requested_scope": ["openid", "profile", "email"],
  "skip": false,
  "subject": "user-id-if-skip-true"
}
```

### Accept Login Request

```bash
curl -X PUT "http://127.0.0.1:4445/admin/oauth2/auth/requests/login/accept?login_challenge=xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "user-id",
    "remember": true,
    "remember_for": 3600,
    "acr": "2fa",
    "amr": ["pwd", "totp"],
    "context": {"department": "engineering"}
  }'
```

Response: `{"redirect_to": "http://127.0.0.1:4444/oauth2/auth?..."}`

### Reject Login Request

```bash
curl -X PUT "http://127.0.0.1:4445/admin/oauth2/auth/requests/login/reject?login_challenge=xxx" \
  -H "Content-Type: application/json" \
  -d '{"error": "invalid_request", "error_description": "User authentication failed"}'
```

---

## Consent Endpoint

### Fetch Consent Request

```bash
curl http://127.0.0.1:4445/admin/oauth2/auth/requests/consent?consent_challenge=xxx
```

Response:
```json
{
  "challenge": "consent-challenge-id",
  "client": {
    "client_id": "my-client",
    "client_name": "My Application",
    "logo_uri": "https://example.com/logo.png",
    "policy_uri": "https://example.com/privacy",
    "tos_uri": "https://example.com/tos"
  },
  "requested_scope": ["openid", "profile", "email"],
  "skip": false,
  "subject": "user-id"
}
```

### Accept Consent Request

```bash
curl -X PUT "http://127.0.0.1:4445/admin/oauth2/auth/requests/consent/accept?consent_challenge=xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "grant_scope": ["openid", "profile"],
    "grant_access_token_audience": ["api-1"],
    "remember": true,
    "remember_for": 86400,
    "session": {
      "access_token": {"department": "engineering", "role": "admin"},
      "id_token": {"email": "user@example.com", "email_verified": true}
    }
  }'
```

**Session data notes:**
- `access_token`: Claims added to access token (available via introspection or JWT).
- `id_token`: Claims added to ID token (must align with granted scopes).

### Reject Consent Request

```bash
curl -X PUT "http://127.0.0.1:4445/admin/oauth2/auth/requests/consent/reject?consent_challenge=xxx" \
  -H "Content-Type: application/json" \
  -d '{"error": "access_denied", "error_description": "User denied consent"}'
```

---

## Logout Endpoint

### Fetch Logout Request

```bash
curl http://127.0.0.1:4445/admin/oauth2/auth/requests/logout?logout_challenge=xxx
```

### Accept Logout Request

```bash
curl -X PUT "http://127.0.0.1:4445/admin/oauth2/auth/requests/logout/accept?logout_challenge=xxx"
```

### RP-Initiated Logout

```
http://127.0.0.1:4444/oauth2/sessions/logout?
  id_token_hint=optional-id-token&
  post_logout_redirect_uri=https://app.example.com/logged-out&
  state=random-state
```

---

## Implementation Pattern (Node.js/Express)

```javascript
const { Configuration, OAuth2Api } = require('@ory/hydra-client');
const hydraAdmin = new OAuth2Api(new Configuration({ basePath: 'http://127.0.0.1:4445' }));

// Login endpoint
app.get('/login', async (req, res) => {
  const { login_challenge } = req.query;
  const { data: loginRequest } = await hydraAdmin.getOAuth2LoginRequest({ loginChallenge: login_challenge });

  // If already authenticated, accept immediately
  if (loginRequest.skip) {
    const { data } = await hydraAdmin.acceptOAuth2LoginRequest({
      loginChallenge: login_challenge,
      acceptOAuth2LoginRequest: { subject: loginRequest.subject }
    });
    return res.redirect(data.redirect_to);
  }

  res.render('login', { challenge: login_challenge, client: loginRequest.client });
});

// Login submission
app.post('/login', async (req, res) => {
  const { login_challenge, email, password } = req.body;
  const user = await authenticateUser(email, password);  // Your auth logic

  const { data } = await hydraAdmin.acceptOAuth2LoginRequest({
    loginChallenge: login_challenge,
    acceptOAuth2LoginRequest: {
      subject: user.id,
      remember: true,
      remember_for: 3600,
      amr: ['pwd']
    }
  });
  res.redirect(data.redirect_to);
});

// Consent endpoint
app.get('/consent', async (req, res) => {
  const { consent_challenge } = req.query;
  const { data: consentRequest } = await hydraAdmin.getOAuth2ConsentRequest({ consentChallenge: consent_challenge });

  if (consentRequest.skip) {
    const { data } = await hydraAdmin.acceptOAuth2ConsentRequest({
      consentChallenge: consent_challenge,
      acceptOAuth2ConsentRequest: {
        grant_scope: consentRequest.requested_scope,
        grant_access_token_audience: consentRequest.requested_access_token_audience
      }
    });
    return res.redirect(data.redirect_to);
  }

  res.render('consent', { challenge: consent_challenge, scopes: consentRequest.requested_scope });
});
```

See `assets/login-consent-example.js` for a complete working example.

---

## Consent UI Best Practices

- Display client name and logo (who is requesting access).
- Show user-friendly scope descriptions.
- Include privacy policy/TOS links (required by OIDC).
- Validate challenge parameters.
- Use anti-CSRF tokens for forms.
- Only grant requested scopes.

## Hydra With Kratos

When paired with Kratos:
- Kratos authenticates the user and manages identity/session.
- Hydra consumes that outcome in the login app and continues OAuth2/OIDC.
- Keep the two systems decoupled; the login app is the integration point.

## Common Failure Modes

- Expecting Hydra to host the login page or user store.
- Using Hydra public endpoints where the admin API is required.
- Dropping the challenge parameter during redirects.
- Misreading automatic skip behavior as a broken flow.
- Mixing application session semantics with OAuth2 consent semantics without a clear boundary.
