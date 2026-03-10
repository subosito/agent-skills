# Ory Kratos Integration

## Use This Reference For

- Login, registration, settings, recovery, verification, and logout flows
- Custom UI integration
- Browser vs native/mobile flow selection
- Session checks in apps and APIs
- API endpoints and SDK usage

## Core Model

- Kratos is headless identity/authentication infrastructure. It exposes self-service and admin APIs; the application owns the UI.
- Browser flows and API flows are different products. Browser flows rely on redirects, cookies, and CSRF; API flows are for native apps and direct API clients.
- In browser setups, keep Kratos and the app UI on the same top-level domain so session cookies work as intended.

## Self-Service Flow Pattern

All user-facing flows are state machines with the same lifecycle:

```
Initialize (POST/GET) → Render (GET flow) → Submit (POST) → Complete (redirect/token)
```

For login, registration, settings, recovery, and verification:

1. Initialize the flow with the right endpoint and app return URL.
2. Receive a flow id or browser redirect.
3. Fetch the flow.
4. Render fields and messages from `ui.nodes`, `ui.messages`, and method-specific payload.
5. Submit the form to `ui.action` using the specified method and values.
6. Handle validation errors by re-rendering the returned flow.
7. Handle success via Kratos redirect, session cookie, or returned session/token for API flows.

## Browser Flow Checklist

- Start with browser initialization endpoints.
- Allow Kratos redirects.
- Forward cookies on all flow requests.
- Preserve the flow id across the form round-trip.
- Expect CSRF fields in `ui.nodes`.
- Use `/sessions/whoami` or the SDK equivalent to determine the current session.

Typical fit: SSR app, SPA using browser redirects and cookies, standard web login/registration/logout.

## API Flow Checklist

- Use only for native/mobile clients or direct API integrations.
- Expect explicit session token handling instead of browser cookie behavior.
- Avoid mixing browser cookies and API flow semantics in one UX without a clear boundary.

Typical fit: native mobile app, CLI, backend-for-backend auth flow.

## UI Implementation Notes

- Generate forms from Kratos flow payloads rather than freezing field assumptions in templates.
- Expect method-specific groups such as password, code, passkey, oidc, or profile depending on config.
- Keep app-specific profile fields aligned with the identity schema. The frontend should submit the names Kratos expects.
- Render and preserve hidden fields.

## Session Handling

- Browser apps typically rely on the Kratos session cookie.
- Backend APIs that sit behind browser auth can validate the session with `whoami`.
- Native/API clients commonly use session tokens returned by API flows.
- Distinguish authentication from authorization. Kratos establishes identity/session; app code still decides permissions.

---

## Flow Details

### Login Flow

**Initialize (Browser):**
```bash
# Redirects to UI URL with flow ID
curl -v http://127.0.0.1:4433/self-service/login/browser
# Response: 302 Location: http://127.0.0.1:4455/login?flow=xxx
```

**Initialize (API):**
```bash
curl http://127.0.0.1:4433/self-service/login/api
# Response: {"id": "flow-id", "type": "api", ...}
```

**Get Flow:**
```bash
curl http://127.0.0.1:4433/self-service/login/flows?id=flow-id
```

**Submit (API - JSON):**
```bash
curl -X POST "http://127.0.0.1:4433/self-service/login?flow=flow-id" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "method": "password",
    "identifier": "user@example.com",
    "password": "secret"
  }'
```

**Submit (Browser - Form):**
```bash
curl -X POST "http://127.0.0.1:4433/self-service/login?flow=flow-id" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "method=password&identifier=user@example.com&password=secret"
```

### Registration Flow

**Initialize:**
```bash
# Browser
curl http://127.0.0.1:4433/self-service/registration/browser
# API
curl http://127.0.0.1:4433/self-service/registration/api
```

**Submit (Password):**
```bash
curl -X POST "http://127.0.0.1:4433/self-service/registration?flow=flow-id" \
  -H "Content-Type: application/json" \
  -d '{
    "method": "password",
    "password": "secret",
    "traits": {
      "email": "user@example.com",
      "name": {"first": "John", "last": "Doe"}
    }
  }'
```

**Submit (OIDC):**
```bash
curl -X POST "http://127.0.0.1:4433/self-service/registration?flow=flow-id" \
  -d "method=oidc&provider=google"
```

### Settings Flow

Requires authenticated session.

```bash
# Initialize (API)
curl http://127.0.0.1:4433/self-service/settings/api \
  -H "Authorization: Bearer session-token"

# Update password
curl -X POST "http://127.0.0.1:4433/self-service/settings?flow=flow-id" \
  -H "Authorization: Bearer session-token" \
  -d '{"method": "password", "password": "newpassword"}'

# Update profile traits
curl -X POST "http://127.0.0.1:4433/self-service/settings?flow=flow-id" \
  -H "Authorization: Bearer session-token" \
  -d '{"method": "profile", "traits": {"email": "new@example.com"}}'

# Enable TOTP (returns QR code in flow response)
curl -X POST "http://127.0.0.1:4433/self-service/settings?flow=flow-id" \
  -H "Authorization: Bearer session-token" \
  -d '{"method": "totp"}'
```

### Recovery Flow

```bash
# Initialize
curl http://127.0.0.1:4433/self-service/recovery/browser

# Request recovery code
curl -X POST "http://127.0.0.1:4433/self-service/recovery?flow=flow-id" \
  -d "method=code&email=user@example.com"

# Submit recovery code
curl -X POST "http://127.0.0.1:4433/self-service/recovery?flow=flow-id" \
  -d "method=code&code=12345678"
```

### Verification Flow

```bash
# Initialize
curl http://127.0.0.1:4433/self-service/verification/browser

# Request verification code
curl -X POST "http://127.0.0.1:4433/self-service/verification?flow=flow-id" \
  -d "method=code&email=user@example.com"

# Submit verification code
curl -X POST "http://127.0.0.1:4433/self-service/verification?flow=flow-id" \
  -d "method=code&code=12345678"
```

### Session Management

```bash
# Get session (cookie)
curl http://127.0.0.1:4433/sessions/whoami -b cookies.txt

# Get session (token)
curl http://127.0.0.1:4433/sessions/whoami \
  -H "Authorization: Bearer <session-token>"

# Revoke all sessions
curl -X DELETE http://127.0.0.1:4433/sessions -b cookies.txt

# Revoke specific session
curl -X DELETE http://127.0.0.1:4433/sessions/<session-id> -b cookies.txt
```

---

## Flow Response Structure

```json
{
  "id": "flow-uuid",
  "type": "browser",
  "expires_at": "2024-01-01T00:00:00Z",
  "ui": {
    "action": "http://127.0.0.1:4433/self-service/login?flow=flow-id",
    "method": "POST",
    "nodes": [
      {
        "type": "input",
        "group": "default",
        "attributes": {
          "name": "csrf_token",
          "type": "hidden",
          "value": "...",
          "required": true
        }
      },
      {
        "type": "input",
        "group": "password",
        "attributes": {
          "name": "identifier",
          "type": "text",
          "required": true
        },
        "meta": {
          "label": {"text": "Email", "type": "info", "id": 1070004}
        }
      }
    ],
    "messages": []
  }
}
```

## Error Handling

Errors are returned in `ui.messages` or specific field errors:

```json
{
  "ui": {
    "messages": [
      {"id": 4000001, "text": "The login flow expired.", "type": "error"}
    ],
    "nodes": [
      {
        "attributes": {"name": "password"},
        "messages": [
          {"id": 4000005, "text": "The password is too short", "type": "error"}
        ]
      }
    ]
  }
}
```

Common error IDs:
- `4000001`: Flow expired
- `4000005`: Password policy violation
- `4000006`: Invalid credentials
- `4000007`: Identity not active

## Hooks

Configure hooks in `kratos.yml` to execute after flows:

```yaml
selfservice:
  flows:
    login:
      after:
        password:
          hooks:
            - hook: revoke_active_sessions
    registration:
      after:
        password:
          hooks:
            - hook: session  # Auto-login
            - hook: web_hook
              config:
                url: http://my-api/webhook
                method: POST
                body: file:///etc/config/kratos/webhook.jsonnet
```

Available hooks: `session`, `revoke_active_sessions`, `require_verified_address`, `web_hook`.

---

## API Endpoints

### Public API (Port 4433)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/self-service/login/browser` | Initialize browser login |
| GET | `/self-service/login/api` | Initialize API login |
| GET | `/self-service/login/flows` | Get login flow |
| POST | `/self-service/login` | Submit login |
| GET | `/self-service/registration/browser` | Initialize registration |
| GET | `/self-service/registration/api` | Initialize API registration |
| GET | `/self-service/registration/flows` | Get registration flow |
| POST | `/self-service/registration` | Submit registration |
| GET | `/self-service/settings/browser` | Initialize settings |
| GET | `/self-service/settings/api` | Initialize API settings |
| GET | `/self-service/settings/flows` | Get settings flow |
| POST | `/self-service/settings` | Submit settings |
| GET | `/self-service/recovery/browser` | Initialize recovery |
| GET | `/self-service/recovery/flows` | Get recovery flow |
| POST | `/self-service/recovery` | Submit recovery |
| GET | `/self-service/verification/browser` | Initialize verification |
| GET | `/self-service/verification/flows` | Get verification flow |
| POST | `/self-service/verification` | Submit verification |
| GET | `/self-service/logout/browser` | Initialize logout |
| POST | `/self-service/logout` | Submit logout |
| GET | `/sessions/whoami` | Check session |
| DELETE | `/sessions` | Revoke all sessions |
| DELETE | `/sessions/{id}` | Revoke specific session |

### Admin API (Port 4434)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/identities` | List identities |
| POST | `/admin/identities` | Create identity |
| GET | `/admin/identities/{id}` | Get identity |
| PUT | `/admin/identities/{id}` | Update identity |
| PATCH | `/admin/identities/{id}` | Patch identity |
| DELETE | `/admin/identities/{id}` | Delete identity |
| PATCH | `/admin/identities` | Batch patch identities |
| GET | `/admin/identities/{id}/sessions` | List identity sessions |
| DELETE | `/admin/identities/{id}/sessions` | Revoke identity sessions |

---

## SDK Examples

### JavaScript/TypeScript

```javascript
import { Configuration, FrontendApi, IdentityApi } from '@ory/kratos-client';

const frontend = new FrontendApi(new Configuration({ basePath: 'http://127.0.0.1:4433' }));
const admin = new IdentityApi(new Configuration({ basePath: 'http://127.0.0.1:4434' }));

const flow = await frontend.createBrowserLoginFlow();
const session = await frontend.toSession();
const identity = await admin.createIdentity({
  createIdentityBody: { schema_id: 'default', traits: { email: 'user@example.com' } }
});
```

### Go

```go
conf := kratos.NewConfiguration()
conf.Servers = kratos.ServerConfigurations{{URL: "http://127.0.0.1:4433"}}
client := kratos.NewAPIClient(conf)

flow, _, err := client.FrontendApi.CreateBrowserLoginFlow(context.Background()).Execute()
session, _, err := client.FrontendApi.ToSession(context.Background()).Execute()
```

### Python

```python
from ory_kratos_client import Configuration, ApiClient, FrontendApi

conf = Configuration(host="http://127.0.0.1:4433")
with ApiClient(conf) as client:
    api = FrontendApi(client)
    flow = api.create_browser_login_flow()
    session = api.to_session()
```

---

## Integration Patterns

### Session Validation Middleware (Express.js)

```javascript
async function requireAuth(req, res, next) {
  const session = await fetch('http://kratos:4433/sessions/whoami', {
    headers: { Cookie: req.headers.cookie, Authorization: req.headers.authorization }
  });
  if (session.status === 200) {
    req.identity = await session.json();
    next();
  } else {
    res.redirect('/login');
  }
}
```

## Common Failure Modes

- Using API flows in a browser app.
- Rendering a local form action instead of the `ui.action` value.
- Losing cookies or flow id between requests.
- Hosting UI and Kratos on incompatible domains for cookie-based auth.
- Hardcoding a small field subset and breaking when enabled methods or schema traits change.
- Calling admin endpoints from the public app path.
- Missing CSRF token in browser flow submissions.
- Using `localhost` instead of `127.0.0.1` (cookie domain issues).
