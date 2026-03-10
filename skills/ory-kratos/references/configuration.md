# Ory Kratos Configuration

## Use This Reference For

- Self-hosted setup and config review
- Cookie/domain/URL issues
- Enabled auth methods and self-service settings
- Courier, secrets, and deployment hardening
- Ory Actions / hooks
- Docker and Kubernetes deployment

## Configuration Approach

- Use the quickstart for a working baseline.
- Use the full configuration reference to inspect or change exact keys.
- Treat copied example config cautiously; many incidents come from stale example values surviving into production.
- See `assets/kratos.yml` for a complete development configuration template.

## Areas To Review First

### Public and browser URLs

Check:

- Kratos public URL exposure
- App/UI URLs used in self-service flows
- Allowed return URLs
- Cookie domain and same-site behavior implied by the deployment

These settings usually explain redirect loops, broken callbacks, and missing sessions.

### Secrets and environment separation

Check:

- Long-lived secrets (cookie, cipher)
- Per-environment config separation
- Secret rotation approach

Do not leave development secrets in shared or production environments.

### Self-service methods

Check which methods are enabled and how they map to the UI:

- password
- code
- passkey / webauthn
- oidc / social login
- totp
- profile/settings-related methods

When enabling or disabling methods, update frontend rendering and test the affected flows.

### Messaging and recovery

Check courier and any email/SMS dependencies if the task touches:

- verification
- recovery
- code delivery
- user notifications triggered from flows

## Ory Actions / Hooks

Use Ory Actions when the task requires business logic around self-service events such as:

- after registration
- before or after login
- profile or identity side effects
- syncing to app systems or external services

Review:

1. Which flow stage the action belongs to
2. What data Kratos provides at that stage
3. Whether failure should block the flow or be best-effort
4. Idempotency and retry behavior

Keep action logic narrow. Push heavy business workflows into app services.

## Production Review Checklist

1. Verify public/admin exposure and routing
2. Verify domain and cookie assumptions
3. Verify enabled methods match the UI
4. Verify schema files referenced by config exist and are current
5. Verify courier and action dependencies
6. Verify secrets handling and environment overrides

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DSN` | Database connection string | `sqlite:///db.sqlite`, `postgres://...` |
| `LOG_LEVEL` | Logging level | `debug`, `info`, `warn` |
| `SECRETS_COOKIE` | Cookie signing secret | 32+ chars |
| `SECRETS_CIPHER` | Encryption secret | 32+ chars |
| `COURIER_SMTP_CONNECTION_URI` | SMTP URI | `smtps://user:pass@host:587/` |
| `SERVE_PUBLIC_BASE_URL` | Public URL | `https://auth.example.com/` |

## Docker Deployment

```bash
# Start with quickstart
docker-compose -f quickstart.yml -f quickstart-standalone.yml up

# With PostgreSQL
docker-compose -f quickstart.yml -f quickstart-standalone.yml -f quickstart-postgres.yml up

# With MySQL
docker-compose -f quickstart.yml -f quickstart-standalone.yml -f quickstart-mysql.yml up

# Clean up
docker-compose -f quickstart.yml down -v
```

See `assets/docker-compose.yml` for a development compose template.

Services:
- Public API: `http://127.0.0.1:4433`
- Admin API: `http://127.0.0.1:4434`
- UI Example: `http://127.0.0.1:4455`
- MailSlurper: `http://127.0.0.1:4436`

## Kubernetes / Helm

```bash
# Install with Helm
helm repo add ory https://k8s.ory.sh/helm-charts
helm repo update

helm install kratos ory/kratos \
  --set 'kratos.config.secrets.cookie=["CHANGE-ME"]' \
  --set 'kratos.config.secrets.cipher=["CHANGE-ME"]' \
  --set 'kratos.config.dsn=postgres://...'

# Check pods
kubectl get pods -l app.kubernetes.io/name=kratos

# Port forward
kubectl port-forward svc/kratos-public 4433:80
kubectl port-forward svc/kratos-admin 4434:80

# Check logs
kubectl logs -l app.kubernetes.io/name=kratos -c kratos
```

## Ory CLI (Managed / Ory Network)

```bash
# Install
bash <(curl https://raw.githubusercontent.com/ory/meta/master/install.sh) -b . ory
sudo mv ./ory /usr/local/bin/

# Authenticate and create project
ory auth
ory create project --name "My App" --use-project

# Identity operations
ory list identities
ory get identity <id>
ory create identity --schema-id default --traits '{"email":"user@example.com"}'
ory delete identity <id>
ory import identities identities.json
```

---

## Common Errors and Solutions

### "csrf_token is missing"
Browser flows require CSRF token from flow initialization. API flows don't need CSRF tokens.

### "the login flow expired"
Flows have limited lifespan (configured in kratos.yml). Re-initialize the flow.

### "credentials are invalid"
Wrong password or identifier, or identity state is `inactive`.

### "session cookie is missing"
Ensure cookie domain matches configuration. Check `SameSite` cookie settings. Use `127.0.0.1` not `localhost`.

### "identity with same identifier exists"
Identifier (email/username) already in use. Use a different identifier or link to existing identity.

## Common Failure Modes

- Mismatched app URL and Kratos public URL.
- Broken cookie scope because of domain layout.
- Enabling a method in config without supporting it in UI.
- Forgetting recovery/verification dependencies.
- Overloading hooks/actions with business logic that belongs elsewhere.
