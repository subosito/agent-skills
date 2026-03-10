# Ory Kratos Identities

## Use This Reference For

- Identity schemas and trait design
- User traits, identifiers, and credential types
- Verification and recovery addresses
- Admin identity CRUD and batch operations
- Migrations that change account shape

## Identity Model

- A Kratos identity is the user account record.
- Schema-driven traits define the profile shape.
- Credentials and recovery/verification addresses attach to identities according to enabled methods and schema configuration.
- Metadata can hold app-specific annotations that should not be user-editable traits.

Each identity has:
- **ID**: Unique UUID (immutable)
- **Schema ID**: References the JSON Schema for validating traits
- **Traits**: User data (email, name, etc.) validated against the schema
- **Credentials**: Authentication methods (password, OIDC, TOTP, etc.)
- **State**: `active` or `inactive`
- **Verifiable Addresses**: Email/phone for verification
- **Recovery Addresses**: Email/phone for account recovery
- **Metadata**: Public (visible to user) and admin (internal only)

## Schema Design Rules

Start by identifying:

1. Login identifiers
2. Profile traits
3. Required vs optional fields
4. Fields used for verification and recovery
5. Fields that should remain admin-only metadata

Then update the JSON Schema deliberately:

- Keep identifiers explicit and stable.
- Validate email, phone, and structured traits at the schema layer when possible.
- Avoid storing authorization roles in end-user-editable traits unless the system design explicitly requires it.
- Treat schema changes as compatibility changes for registration, settings, import, and admin tooling.

## Trait Change Checklist

When adding or changing a trait:

1. Update the schema
2. Update any UI that renders or labels the trait
3. Check registration and settings flows
4. Check verification/recovery targeting rules
5. Check any app logic that reads the trait
6. Plan data migration for existing identities if required

---

## Identity Schema

### Structure

```json
{
  "$id": "https://example.com/schemas/identity.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Identity",
  "type": "object",
  "properties": {
    "traits": {
      "type": "object",
      "properties": {
        // Your custom fields here
      }
    }
  }
}
```

### Ory Kratos Extensions (`ory.sh/kratos`)

**Email as Password Identifier:**
```json
{
  "email": {
    "type": "string",
    "format": "email",
    "ory.sh/kratos": {
      "credentials": { "password": { "identifier": true } },
      "verification": { "via": "email" },
      "recovery": { "via": "email" }
    }
  }
}
```

**WebAuthn/Passkey Identifier:**
```json
{
  "email": {
    "type": "string",
    "format": "email",
    "ory.sh/kratos": {
      "credentials": {
        "webauthn": { "identifier": true },
        "passkey": { "identifier": true }
      }
    }
  }
}
```

**Code (Passwordless) via SMS/Email:**
```json
{
  "phone": {
    "type": "string",
    "format": "tel",
    "ory.sh/kratos": {
      "credentials": { "code": { "identifier": true, "via": "sms" } }
    }
  },
  "email": {
    "type": "string",
    "format": "email",
    "ory.sh/kratos": {
      "credentials": { "code": { "identifier": true, "via": "email" } }
    }
  }
}
```

### Complete Schema Example

```json
{
  "$id": "https://example.com/schemas/user.json",
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "User",
  "type": "object",
  "properties": {
    "traits": {
      "type": "object",
      "properties": {
        "email": {
          "type": "string",
          "format": "email",
          "title": "E-Mail",
          "minLength": 3,
          "ory.sh/kratos": {
            "credentials": { "password": { "identifier": true } },
            "verification": { "via": "email" },
            "recovery": { "via": "email" }
          }
        },
        "name": {
          "type": "object",
          "properties": {
            "first": { "type": "string", "title": "First Name" },
            "last": { "type": "string", "title": "Last Name" }
          }
        },
        "newsletter": { "type": "boolean", "title": "Subscribe to newsletter" }
      },
      "required": ["email"]
    }
  }
}
```

### Multiple Schemas

```yaml
# kratos.yml
identity:
  schemas:
    - id: customer
      url: file:///etc/config/kratos/customer.schema.json
    - id: employee
      url: file:///etc/config/kratos/employee.schema.json
  default_schema_id: customer
```

### Schema Validation

Kratos validates traits against the schema on identity creation, update, registration, and settings flow updates. Validation errors are returned in `ui.messages`.

---

## Credential Types

| Type | Description |
|------|-------------|
| `password` | Username/email + password |
| `oidc` | Social sign-in (Google, GitHub, etc.) |
| `passkey` | WebAuthn passwordless authentication |
| `code` | One-time code via email/SMS |
| `totp` | Time-based OTP (authenticator apps) |
| `webauthn` | Hardware security keys (2FA) |
| `lookup_secret` | Recovery codes for 2FA |
| `saml` | SAML for B2B SSO |

### Password Configuration

```yaml
selfservice:
  methods:
    password:
      enabled: true
      config:
        haveibeenpwned_enabled: true
        min_password_length: 8
        identifier_similarity_check_enabled: true
```

### Importing Passwords

```bash
curl -X POST http://127.0.0.1:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {"email": "user@example.com"},
    "credentials": {
      "password": {
        "config": {
          "hashed_password": "$argon2id$v=19$m=65536,t=3,p=4$..."
        }
      }
    }
  }'
```

Supported hash formats: Argon2 (recommended), bcrypt, PBKDF2, scrypt, MD5/SHA (migration only).

### Password Migration Hook

```yaml
selfservice:
  methods:
    password:
      config:
        migrate_password_hook:
          url: http://legacy-auth/migrate
          method: POST
```

### OIDC (Social Sign-In)

```yaml
selfservice:
  methods:
    oidc:
      enabled: true
      config:
        providers:
          - id: google
            provider: google
            client_id: ${GOOGLE_CLIENT_ID}
            client_secret: ${GOOGLE_CLIENT_SECRET}
            mapper_url: file:///etc/config/kratos/oidc.google.jsonnet
            scope: [email, profile, openid]
```

JSONNet mapper example (see `assets/oidc.google.jsonnet`):
```jsonnet
local claims = std.extVar('claims');
{
  identity: {
    traits: {
      email: claims.email,
      name: { first: claims.given_name, last: claims.family_name }
    }
  }
}
```

### TOTP (2FA)

```yaml
selfservice:
  methods:
    totp:
      enabled: true
      config:
        issuer: MyApp
```

Setup: Initialize settings flow → submit `method=totp` to get QR code → user scans → submit `method=totp&totp_code=XXXXXX` to confirm.

### WebAuthn / Passkey

```yaml
selfservice:
  methods:
    passkey:  # or webauthn
      enabled: true
      config:
        rp:
          id: example.com
          origin: https://example.com
          display_name: My Application
```

### Code (Passwordless)

```yaml
selfservice:
  methods:
    code:
      enabled: true
      config:
        lifespan: 15m
```

### Authenticator Assurance Level (AAL)

| Level | Description |
|-------|-------------|
| `aal1` | Single factor (password, OIDC) |
| `aal2` | Two factors (password + TOTP/WebAuthn) |

Require AAL2 for sensitive operations:
```yaml
selfservice:
  flows:
    settings:
      required_aal: aal2
```

---

## Identity Object

```json
{
  "id": "9f425a8d-7efc-4768-8f23-7647a74fdf13",
  "schema_id": "default",
  "state": "active",
  "traits": {
    "email": "user@example.com",
    "name": { "first": "John", "last": "Doe" }
  },
  "verifiable_addresses": [
    { "value": "user@example.com", "verified": true, "via": "email", "status": "completed" }
  ],
  "recovery_addresses": [
    { "value": "user@example.com", "via": "email" }
  ],
  "metadata_public": { "role": "user" },
  "metadata_admin": { "internal_id": "12345" }
}
```

## Session Object

```json
{
  "id": "session-uuid",
  "active": true,
  "expires_at": "2024-01-08T00:00:00Z",
  "authenticator_assurance_level": "aal1",
  "authentication_methods": [
    { "method": "password", "completed_at": "2024-01-01T00:00:00Z" }
  ],
  "identity": { }
}
```

---

## Admin Operations

Admin APIs are appropriate for creating identities out of band, importing/migrating users, updating privileged fields, and managing identity lifecycle outside self-service UX.

### Identity CRUD

```bash
# List identities
curl http://127.0.0.1:4434/admin/identities

# Get identity
curl http://127.0.0.1:4434/admin/identities/<id>

# Create identity
curl -X POST http://127.0.0.1:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '{
    "schema_id": "default",
    "traits": {"email": "user@example.com", "name": {"first": "John", "last": "Doe"}}
  }'

# Update identity
curl -X PUT http://127.0.0.1:4434/admin/identities/<id> \
  -H "Content-Type: application/json" \
  -d '{"schema_id": "default", "state": "active", "traits": {"email": "new@example.com"}}'

# Delete identity
curl -X DELETE http://127.0.0.1:4434/admin/identities/<id>
```

### Batch Operations

```bash
curl -X PATCH http://127.0.0.1:4434/admin/identities \
  -H "Content-Type: application/json" \
  -d '[
    {"create": {"schema_id": "default", "traits": {"email": "user1@example.com"}}},
    {"create": {"schema_id": "default", "traits": {"email": "user2@example.com"}}}
  ]'
```

### Pagination and Filtering

```bash
GET /admin/identities?page=0&per_page=100
GET /admin/identities?ids=id1,id2,id3
```

---

## Common Failure Modes

- Changing schema traits without migrating existing identities.
- Making the login identifier ambiguous.
- Putting internal authorization data in editable user traits.
- Assuming verification/recovery configuration updates itself after schema changes.
- Forgetting to update forms and backend validation together.
- Using different schema IDs without planning migration for existing data.
