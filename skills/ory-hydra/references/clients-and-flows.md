# Ory Hydra Clients and Flows

## Use This Reference For

- Choosing the right OAuth2/OIDC flow
- OAuth2 client setup and management
- Redirect URI and grant mismatch debugging
- Token issuance, introspection, and revocation
- API endpoints and SDK usage

## Choose The Flow First

Start by classifying the client:

- Web app with browser redirects: authorization code flow
- SPA or native app: authorization code with PKCE
- Machine-to-machine service: client credentials
- Device with limited input: device authorization flow

Do not start from endpoints alone. Start from the client shape and required trust model.

## Client Review Checklist

For every client, inspect:

1. Grant types
2. Response types
3. Redirect URIs
4. Scopes and audience
5. Token endpoint auth method
6. Public vs confidential client assumptions

Most integration failures reduce to one of these being wrong.

---

## OAuth2 Flows

### Authorization Code Flow

The most secure flow for user authorization.

**1. Authorization Request:**
```
GET /oauth2/auth?
  client_id=my-client&
  response_type=code&
  scope=openid profile email&
  redirect_uri=http://localhost:3000/callback&
  state=random-state-value&
  code_challenge=BASE64URL(SHA256(code_verifier))&
  code_challenge_method=S256
```

**2. Token Exchange:**
```bash
curl -X POST http://127.0.0.1:4444/oauth2/token \
  -u "client-id:client-secret" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=auth-code-from-redirect" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "code_verifier=original-code-verifier"
```

**Response:**
```json
{
  "access_token": "opaque-or-jwt-token",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh-token",
  "scope": "openid profile email",
  "id_token": "eyJ..."
}
```

Typical failures: redirect URI mismatch, public client treated as confidential, missing PKCE, confusing Hydra redirect with app-local routing.

### Client Credentials Flow

For machine-to-machine authentication without user involvement.

```bash
curl -X POST http://127.0.0.1:4444/oauth2/token \
  -u "client-id:client-secret" \
  -d "grant_type=client_credentials" \
  -d "scope=api:read api:write"
```

No refresh token is issued. No user identity claims exist.

Typical failures: using for user-facing authorization, assuming identity claims exist, forgetting resource server-side authorization.

### Refresh Token Flow

```bash
curl -X POST http://127.0.0.1:4444/oauth2/token \
  -u "client-id:client-secret" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=refresh-token" \
  -d "scope=openid profile"
```

### Device Authorization Flow

For devices with limited input (smart TVs, IoT).

```bash
# Step 1: Request device code
curl -X POST http://127.0.0.1:4444/oauth2/device/auth \
  -u "client-id:client-secret" \
  -d "scope=openid profile"
# Returns: device_code, user_code, verification_uri

# Step 2: Display user_code and verification_uri to user

# Step 3: Poll for token
curl -X POST http://127.0.0.1:4444/oauth2/token \
  -u "client-id:client-secret" \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
  -d "device_code=ory_dc_xxx"
```

### Token Introspection

```bash
curl -X POST http://127.0.0.1:4445/oauth2/introspect \
  -u "client-id:client-secret" \
  -d "token=access-or-refresh-token"
```

Response: `{"active": true, "client_id": "my-client", "sub": "user-id", "scope": "openid profile", ...}`

### Token Revocation

```bash
curl -X POST http://127.0.0.1:4444/oauth2/revoke \
  -u "client-id:client-secret" \
  -d "token=token-to-revoke"
```

### PKCE Code Verifier Generation

```javascript
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return base64URLEncode(array);
}

async function generateCodeChallenge(verifier) {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64URLEncode(new Uint8Array(digest));
}

function base64URLEncode(buffer) {
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
```

---

## Client Management

### Client Types

**Web Application (Confidential):**
```bash
curl -X POST http://127.0.0.1:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Web Application",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": "openid profile email offline_access",
    "redirect_uris": ["https://app.example.com/callback"],
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

**Single Page Application (Public):**
```bash
curl -X POST http://127.0.0.1:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "SPA",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "scope": "openid profile",
    "redirect_uris": ["http://localhost:3000/callback"],
    "token_endpoint_auth_method": "none"
  }'
```

**Mobile/Native Application (Public):**
```bash
curl -X POST http://127.0.0.1:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "Mobile App",
    "grant_types": ["authorization_code", "refresh_token"],
    "response_types": ["code"],
    "redirect_uris": ["com.example.app:/callback"],
    "token_endpoint_auth_method": "none"
  }'
```

**Machine-to-Machine (Confidential):**
```bash
curl -X POST http://127.0.0.1:4445/admin/clients \
  -H "Content-Type: application/json" \
  -d '{
    "client_name": "API Service",
    "grant_types": ["client_credentials"],
    "scope": "api:read api:write",
    "token_endpoint_auth_method": "client_secret_basic"
  }'
```

### Token Endpoint Auth Methods

| Method | Description | Use Case |
|--------|-------------|----------|
| `client_secret_basic` | client_id:secret in Authorization header | Server apps |
| `client_secret_post` | client_id/secret in POST body | Legacy apps |
| `client_secret_jwt` | JWT signed with client secret | Enhanced security |
| `private_key_jwt` | JWT signed with private key | High security |
| `none` | No authentication | Public clients (PKCE required) |

### Client CRUD

```bash
# List clients
curl http://127.0.0.1:4445/admin/clients

# Get client
curl http://127.0.0.1:4445/admin/clients/<client-id>

# Update client (full)
curl -X PUT http://127.0.0.1:4445/admin/clients/<client-id> \
  -H "Content-Type: application/json" \
  -d '{"client_name": "Updated", "grant_types": ["authorization_code"]}'

# Patch client
curl -X PATCH http://127.0.0.1:4445/admin/clients/<client-id> \
  -H "Content-Type: application/json" \
  -d '[{"op": "replace", "path": "/client_name", "value": "New Name"}]'

# Delete client
curl -X DELETE http://127.0.0.1:4445/admin/clients/<client-id>

# Rotate secret
curl -X PUT http://127.0.0.1:4445/admin/clients/<client-id>/rotate-secret
```

### Per-Client Token Lifespans

| Field | Description |
|-------|-------------|
| `authorization_code_grant_access_token_lifespan` | Access token from auth code |
| `authorization_code_grant_refresh_token_lifespan` | Refresh token from auth code |
| `authorization_code_grant_id_token_lifespan` | ID token from auth code |
| `client_credentials_grant_access_token_lifespan` | Access token from client credentials |
| `refresh_token_grant_access_token_lifespan` | Access token from refresh |

```bash
curl -X PATCH http://127.0.0.1:4445/admin/clients/<id> \
  -d '{"authorization_code_grant_access_token_lifespan": "30m", "authorization_code_grant_refresh_token_lifespan": "168h"}'
```

### JWT Access Tokens

```yaml
# Enable globally
strategies:
  access_token: jwt  # or "opaque"

# Or per client
curl -X PATCH http://127.0.0.1:4445/admin/clients/<id> \
  -d '{"access_token_strategy": "jwt"}'
```

JWKS endpoint: `GET http://127.0.0.1:4444/.well-known/jwks.json`

---

## API Endpoints

### Public/OAuth2 API (Port 4444)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/.well-known/openid-configuration` | OIDC Discovery |
| GET | `/.well-known/jwks.json` | JWKS endpoint |
| GET | `/oauth2/auth` | Authorization endpoint |
| POST | `/oauth2/token` | Token endpoint |
| POST | `/oauth2/revoke` | Token revocation |
| GET | `/oauth2/userinfo` | UserInfo endpoint |
| GET | `/oauth2/sessions/logout` | OIDC Logout |
| POST | `/oauth2/device/auth` | Device authorization |

### Admin API (Port 4445)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/admin/clients` | List/Create clients |
| GET/PUT/PATCH/DELETE | `/admin/clients/{id}` | Client CRUD |
| PUT | `/admin/clients/{id}/rotate-secret` | Rotate secret |
| GET | `/admin/oauth2/auth/requests/login` | Get login request |
| PUT | `/admin/oauth2/auth/requests/login/accept` | Accept login |
| PUT | `/admin/oauth2/auth/requests/login/reject` | Reject login |
| GET | `/admin/oauth2/auth/requests/consent` | Get consent request |
| PUT | `/admin/oauth2/auth/requests/consent/accept` | Accept consent |
| PUT | `/admin/oauth2/auth/requests/consent/reject` | Reject consent |
| POST | `/oauth2/introspect` | Token introspection |

---

## SDK Examples

### JavaScript/TypeScript

```javascript
import { Configuration, OAuth2Api } from '@ory/hydra-client';
const adminApi = new OAuth2Api(new Configuration({ basePath: 'http://127.0.0.1:4445' }));

const client = await adminApi.createOAuth2Client({
  oAuth2Client: { clientName: 'My App', grantTypes: ['authorization_code'], redirectUris: ['http://localhost:3000/callback'] }
});

const loginRequest = await adminApi.getOAuth2LoginRequest({ loginChallenge: 'challenge-id' });
const { data } = await adminApi.acceptOAuth2LoginRequest({
  loginChallenge: 'challenge-id',
  acceptOAuth2LoginRequest: { subject: 'user-id' }
});
```

### Go

```go
conf := hydra.NewConfiguration()
conf.Servers = hydra.ServerConfigurations{{URL: "http://127.0.0.1:4445"}}
client := hydra.NewAPIClient(conf)

created, _, err := client.OAuth2Api.CreateOAuth2Client(context.Background()).
  OAuth2Client(hydra.OAuth2Client{ClientName: "My App", GrantTypes: []string{"authorization_code"}}).Execute()
```

---

## Token Handling Notes

- Hydra issues protocol artifacts; resource servers still decide what the token may do.
- Use introspection, JWKS-based verification, or other supported validation paths consistently across services.
- Keep issuer, audience, and scope assumptions aligned between Hydra and resource servers.

## Common Failure Modes

- Enabling the wrong grant types for the client.
- Mismatched redirect URIs between code and Hydra client config.
- Mixing OIDC expectations into a pure OAuth2 machine-to-machine setup.
- Assuming token issuance implies authorization.
- Debugging the resource server before verifying Hydra client metadata.
- `redirect_uri mismatch` — must be exact match including path.
- `invalid_grant` — authorization code expired or already used.
- `invalid_client` — wrong client secret or client doesn't exist.
