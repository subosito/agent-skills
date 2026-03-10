# Ory Keto Configuration

## Use This Reference For

- Self-hosted Keto setup and deployment review
- Read/write service exposure
- Datastore and rollout concerns
- Recursion/depth/performance review

## Configuration Approach

- Start from actual deployment topology: read service, write service, datastore, ingress, and namespace/OPL rollout path.
- Treat permission model deployment as a coordinated change with application code and tuple data.
- Verify whether the environment uses static config, config maps, or image-bundled models before proposing changes.
- See `assets/keto.yml` for a complete development configuration template.

## Areas To Review First

### Read and write endpoints

Check:

- Which endpoints are exposed publicly
- Which write paths are restricted to trusted services
- Network and auth boundaries around write operations

### Datastore and consistency

Check:

- Datastore type and connection settings
- Migration status
- Expected consistency/latency behavior
- Backup and rollback assumptions before major model changes

### Namespace / OPL rollout

Check:

- How authorization models are versioned
- How updates are promoted across environments
- Whether tuple backfills or migrations are coordinated with model changes

### Query shape and traversal limits

Check:

- Relation graph depth
- Repeated inherited edges
- Expensive list/expand patterns
- Any configuration that affects traversal or recursion

Do not widen limits first. Inspect whether the model is creating avoidable graph complexity.

## Deployment Review Checklist

1. Verify read/write exposure and trust boundaries
2. Verify datastore connectivity and migrations
3. Verify model rollout path across environments
4. Verify tuple migration/backfill plan for model changes
5. Verify query depth and performance assumptions

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DSN` | Database connection string | `postgres://user:pass@host/db` |
| `LOG_LEVEL` | Logging level | `debug`, `info`, `warn` |
| `SERVE_READ_HOST` | Read API host | `0.0.0.0` |
| `SERVE_READ_PORT` | Read API port | `4466` |
| `SERVE_WRITE_HOST` | Write API host | `0.0.0.0` |
| `SERVE_WRITE_PORT` | Write API port | `4467` |
| `NAMESPACES` | Namespace definitions (file path) | `/etc/config/namespaces.ts` |

## Docker Deployment

```bash
# Run with docker-compose
docker-compose -f quickstart.yml up

# Run Keto directly
docker run -d --name keto -p 4466:4466 -p 4467:4467 \
  -e DSN=memory oryd/keto:v0.12.0 serve

# View logs
docker logs -f keto

# Clean up
docker-compose -f quickstart.yml down -v
```

See `assets/docker-compose.yml` for a development compose template with PostgreSQL.

Services:
- Read/Check API: `http://127.0.0.1:4466`
- Write API: `http://127.0.0.1:4467`

## Kubernetes / Helm

```bash
helm repo add ory https://k8s.ory.sh/helm-charts
helm repo update

helm install keto ory/keto --set 'keto.config.dsn=postgres://...'

kubectl get pods -l app.kubernetes.io/name=keto
kubectl port-forward svc/keto-read 4466:4466
kubectl port-forward svc/keto-write 4467:4467
kubectl logs -l app.kubernetes.io/name=keto -c keto
```

## Ory CLI (Managed / Ory Network)

```bash
# Install
bash <(curl https://raw.githubusercontent.com/ory/meta/master/install.sh) -b . ory
sudo mv ./ory /usr/local/bin/

# Auth and project
ory auth
ory create project --name "My Permissions" --use-project

# OPL management
ory validate opl -f config.ts
ory patch opl -f file://./config.ts
ory get opl

# Relation tuples
echo "Document:report#owner@User:alice" | ory parse relation-tuples --format=json - | ory create relation-tuples -
ory list relation-tuples
ory list relation-tuples --namespace Document --subject User:alice
ory delete relation-tuples --namespace Document --object report --relation owner --subject User:alice

# Permission checks
ory check permission Document:report view User:alice
```

## Keto CLI (Self-Hosted)

```bash
keto serve --config keto.yml
keto migrate up --yes
keto relation-tuple create <tuple-file>
keto relation-tuple get --namespace Document
keto relation-tuple delete --namespace Document --object report
keto check User:alice view Document report
echo "Document:report#owner@User:alice" | keto relation-tuple parse -
```

---

## Common Errors and Solutions

### "namespace not found"
Namespace not defined in OPL. Check OPL configuration is applied.

### "relation tuple already exists"
Trying to create duplicate tuple. Use idempotent operations or check first.

### "invalid subject"
Subject format is wrong. Should be `Namespace:id` or `Namespace:id#relation`.

### "max depth reached"
Circular reference in hierarchy. Check for loops in parent relationships.

### "not found"
Tuple doesn't exist (on delete). Object doesn't exist in permission check.

## Common Failure Modes

- Exposing tuple-write capabilities too broadly.
- Changing namespaces/relations without tuple migration.
- Assuming authorization bugs are config bugs when the tuple data is wrong.
- Masking poor relation design by raising traversal limits.
- Environment drift between local, staging, and production models.
