# Ory Hydra Configuration

## Use This Reference For

- Self-hosted Hydra setup and deployment review
- Public/admin endpoint routing
- Issuer and callback consistency
- DSN, secrets, and environment configuration
- CLI-assisted client and config checks

## Configuration Approach

- Start from current deployment reality, not from example snippets alone.
- Confirm how Hydra is exposed: public endpoint, admin endpoint, issuer URL, reverse proxy, and login/consent URLs.
- Treat copied local-development settings as suspect in production incidents.
- See `assets/hydra.yml` for a complete development configuration template.

## Areas To Review First

### Public, admin, and issuer URLs

Check:

- Public endpoint exposure
- Admin endpoint exposure and trust boundary
- Issuer URL
- Reverse proxy headers and TLS termination assumptions
- Login, consent, and logout URLs

These settings explain many callback, token validation, and redirect errors.

### Database and persistence

Check:

- DSN and migration state
- Environment separation
- Durability expectations for deployment changes

### Secrets and key material

Check:

- System secrets (32+ characters)
- Signing/rotation practices
- Per-environment isolation
- Whether development secrets leaked into production

### Client management

Use the CLI or admin APIs to inspect actual client metadata instead of inferring from application code.

Verify: grants, response types, redirect URIs, scopes, token endpoint auth method, and client type expectations.

## Deployment Review Checklist

1. Verify public/admin/issuer URL consistency
2. Verify login and consent URLs point to the intended app
3. Verify client metadata matches the real flow
4. Verify DSN and migrations
5. Verify secrets and signing assumptions
6. Verify reverse proxy or ingress behavior around headers, TLS, and hostnames

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DSN` | Database connection string | `postgres://user:pass@host/db` |
| `SECRETS_SYSTEM` | System secret for encryption | 32+ characters |
| `URLS_SELF_ISSUER` | Issuer URL | `https://auth.example.com` |
| `URLS_LOGIN` | Login endpoint URL | `https://idp.example.com/login` |
| `URLS_CONSENT` | Consent endpoint URL | `https://idp.example.com/consent` |
| `URLS_LOGOUT` | Logout endpoint URL | `https://idp.example.com/logout` |
| `SERVE_PUBLIC_CORS_ENABLED` | Enable CORS | `true` |
| `TTL_ACCESS_TOKEN` | Access token lifespan | `1h` |
| `OIDC_SUBJECT_IDENTIFIERS_SUPPORTED_TYPES` | Subject ID types | `public,pairwise` |

## Docker Deployment

```bash
# Run with docker-compose
docker-compose -f quickstart.yml up

# Run Hydra directly with SQLite
docker run -d --name hydra -p 4444:4444 -p 4445:4445 \
  -e SECRETS_SYSTEM=change-me-32-chars!! \
  -e DSN=memory \
  oryd/hydra:v2.2.0 serve all --dev

# Run migrations
docker-compose -f quickstart.yml exec hydra hydra migrate sql --yes "$DSN"

# Clean up
docker-compose -f quickstart.yml down -v
```

See `assets/docker-compose.yml` for a development compose template.

Services:
- Public/OAuth2 API: `http://127.0.0.1:4444`
- Admin API: `http://127.0.0.1:4445`

## Kubernetes / Helm

```bash
helm repo add ory https://k8s.ory.sh/helm-charts
helm repo update

helm install hydra ory/hydra \
  --set 'hydra.config.secrets.system={CHANGE-ME-32-CHARS!!}' \
  --set 'hydra.config.dsn=postgres://...'

kubectl get pods -l app.kubernetes.io/name=hydra
kubectl port-forward svc/hydra-public 4444:4444
kubectl port-forward svc/hydra-admin 4445:4445
kubectl logs -l app.kubernetes.io/name=hydra -c hydra
```

## Ory CLI (Managed / Ory Network)

```bash
# Install
bash <(curl https://raw.githubusercontent.com/ory/meta/master/install.sh) -b . ory
sudo mv ./ory /usr/local/bin/

# Auth and project
ory auth
ory create project --name "My OAuth2 Server" --use-project

# Client management
ory create oauth2-client \
  --name "Web App" \
  --grant-type authorization_code,refresh_token \
  --response-type code \
  --scope openid,profile,email,offline_access \
  --redirect-uri http://localhost:3000/callback

ory list oauth2-clients
ory get oauth2-client <client-id>
ory delete oauth2-client <client-id>
ory rotate oauth2-client-secret <client-id>

# Token operations
ory perform client-credentials --client-id <id> --client-secret <secret>
ory perform authorization-code --client-id <id> --client-secret <secret>
ory introspect token <token> --client-id <id> --client-secret <secret>

# Config
ory get oauth2-config
ory patch oauth2-config --replace "/ttl/access_token=1h" --replace "/ttl/refresh_token=720h"
```

## Hydra CLI (Self-Hosted)

```bash
hydra serve all --config hydra.yml
hydra migrate sql --yes "$DSN"
hydra create client --endpoint http://127.0.0.1:4445 --grant-type authorization_code --response-type code --redirect-uri http://localhost:3000/callback
hydra list clients --endpoint http://127.0.0.1:4445
hydra perform client-credentials --endpoint http://127.0.0.1:4444 --client-id <id> --client-secret <secret>
hydra introspect token <token> --endpoint http://127.0.0.1:4445 --client-id <id> --client-secret <secret>
```

---

## Common Failure Modes

- Issuer mismatch between Hydra and downstream token validation.
- Exposing admin APIs too broadly.
- Stale client metadata after application changes.
- Broken callbacks because login/consent URLs or proxies are misconfigured.
- Environment drift between local, staging, and production.
