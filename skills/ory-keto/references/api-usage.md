# Ory Keto API Usage

## Use This Reference For

- Relation tuple writes and deletes
- Permission checks on request paths
- List and expand query patterns
- Debugging incorrect authorization results
- API endpoints and SDK usage

## Core Operations

Keto work usually falls into four operations:

1. **Write/delete tuples** — establish or remove authorization relationships
2. **Check** — determine whether a subject has a permission on a resource
3. **List** — find resources or subjects related by a permission
4. **Expand** — inspect the relation graph for debugging and model inspection

## Relation Tuple Format

```
<namespace>:<object>#<relation>@<subject>
```

Examples:
- `Document:report#owner@User:alice` — Alice owns the report
- `Document:report#viewer@Group:engineering#member` — Engineering members can view
- `Folder:projects#parent@Document:report` — Report is in projects folder

Subject types:
- **Direct subject**: `User:alice`, `ServiceAccount:my-service`
- **Subject set**: `Group:engineering#member`, `Organization:acme#owner`

---

## Tuple Write Guidance

- Write tuples as part of the same business workflow that creates or changes the underlying application relationship.
- Keep tuple lifecycle aligned with app lifecycle events (membership changes, ownership transfer, sharing, deletion).
- PUT is idempotent; safe to retry.

### Create Tuple

**CLI:**
```bash
echo "Document:report#owner@User:alice" | \
  ory parse relation-tuples --format=json - | \
  ory create relation-tuples -
```

**REST API:**
```bash
curl -X PUT http://127.0.0.1:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "Document",
    "object": "report",
    "relation": "owner",
    "subject": "User:alice"
  }'
```

### Create Multiple Tuples

```bash
cat << EOF | ory parse relation-tuples --format=json - | ory create relation-tuples -
Document:report#owner@User:alice
Document:report#viewer@User:bob
Document:report#viewer@Group:engineering#member
EOF
```

### Batch Operations

```bash
curl -X PATCH http://127.0.0.1:4467/admin/relation-tuples \
  -H "Content-Type: application/json" \
  -d '{
    "relation_tuples": [
      {"action": "INSERT", "tuple": {"namespace": "Document", "object": "report", "relation": "owner", "subject": "User:alice"}},
      {"action": "DELETE", "tuple": {"namespace": "Document", "object": "report", "relation": "owner", "subject": "User:bob"}}
    ]
  }'
```

### Delete Tuple

```bash
# Delete specific tuple
curl -X DELETE "http://127.0.0.1:4467/admin/relation-tuples?namespace=Document&object=report&relation=owner&subject=User:alice"

# Delete all tuples for an object
curl -X DELETE "http://127.0.0.1:4467/admin/relation-tuples?namespace=Document&object=report"
```

---

## Check Guidance

Perform permission checks on every critical path. Do not trust stale cached decisions for sensitive actions.

### Permission Check

**CLI:**
```bash
ory check permission Document:report view User:alice
```

**REST API:**
```bash
curl -X POST http://127.0.0.1:4466/permission/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "Document",
    "object": "report",
    "relation": "view",
    "subject": "User:alice"
  }'
```

Response: `{"allowed": true}`

**With Subject Set:**
```bash
curl -X POST http://127.0.0.1:4466/permission/check \
  -H "Content-Type: application/json" \
  -d '{
    "namespace": "Document",
    "object": "report",
    "relation": "view",
    "subject_set": {"namespace": "User", "object": "alice", "relation": ""}
  }'
```

---

## List Guidance

Use list-style queries when the app needs all resources a subject can access, all subjects that can access a resource, or filtered discovery based on authorization.

### Query Tuples

```bash
# All tuples
curl http://127.0.0.1:4466/relation-tuples

# Filter by subject
curl "http://127.0.0.1:4466/relation-tuples?subject=User:alice"

# Filter by object
curl "http://127.0.0.1:4466/relation-tuples?namespace=Document&object=report"

# Filter by relation
curl "http://127.0.0.1:4466/relation-tuples?namespace=Document&object=report&relation=owner"

# With pagination
curl "http://127.0.0.1:4466/relation-tuples?page_size=100&page_token=xxx"
```

---

## Expand Guidance

Use expand primarily for debugging model behavior, understanding inherited permissions, and explaining why a check resolved the way it did.

```bash
curl -X POST http://127.0.0.1:4466/permission/expand \
  -H "Content-Type: application/json" \
  -d '{"namespace": "Document", "object": "report", "relation": "view"}'
```

Response:
```json
{
  "tree": {
    "type": "union",
    "subject": "Document:report#view",
    "children": [
      {"type": "leaf", "tuple": {"namespace": "Document", "object": "report", "relation": "viewers", "subject": "User:alice"}},
      {"type": "union", "subject": "Document:report#edit", "children": [...]}
    ]
  }
}
```

---

## API Endpoints

### Read API (Port 4466)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/permission/check` | Check permission |
| POST | `/permission/expand` | Expand permission tree |
| GET | `/relation-tuples` | List relation tuples |
| GET | `/health/alive` | Liveness probe |
| GET | `/health/ready` | Readiness probe |

### Write API (Port 4467)

| Method | Endpoint | Description |
|--------|----------|-------------|
| PUT | `/admin/relation-tuples` | Create relation tuple |
| DELETE | `/admin/relation-tuples` | Delete relation tuple(s) |
| PATCH | `/admin/relation-tuples` | Batch tuple operations |

---

## Integration Patterns

### Middleware Pattern (Express.js)

```javascript
async function requirePermission(namespace, object, relation) {
  return async (req, res, next) => {
    const allowed = await ketoClient.checkPermission({
      namespace, object: req.params[object], relation, subject: `User:${req.user.id}`
    });
    if (allowed) next();
    else res.status(403).json({ error: 'Forbidden' });
  };
}

app.get('/documents/:docId', requirePermission('Document', 'docId', 'view'), handler);
```

### Service Layer Pattern

```javascript
class DocumentService {
  async getDocument(docId, userId) {
    const allowed = await this.permissions.check({
      namespace: 'Document', object: docId, relation: 'view', subject: `User:${userId}`
    });
    if (!allowed) throw new ForbiddenError('Cannot view this document');
    return this.db.documents.findById(docId);
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { Configuration, PermissionApi, WriteApi, ReadApi } from '@ory/keto-client';

const permissionApi = new PermissionApi(new Configuration({ basePath: 'http://127.0.0.1:4466' }));
const writeApi = new WriteApi(new Configuration({ basePath: 'http://127.0.0.1:4467' }));

const check = await permissionApi.postCheck({
  namespace: 'Document', object: 'report', relation: 'view', subject: 'User:alice'
});
console.log(check.data.allowed);

await writeApi.createRelationTuple({
  namespace: 'Document', object: 'report', relation: 'owner', subject: 'User:alice'
});
```

### Go

```go
check := keto.PostCheckBody{
  Namespace: "Document", Object: "report", Relation: "view", Subject: "User:alice",
}
result, _, err := client.PermissionApi.PostCheck(context.Background()).PostCheckBody(check).Execute()
```

### Python

```python
from ory_keto_client import Configuration, ApiClient, PermissionApi

with ApiClient(Configuration(host="http://127.0.0.1:4466")) as client:
    result = PermissionApi(client).post_check(
        namespace="Document", object="report", relation="view", subject="User:alice"
    )
    print(result.allowed)
```

---

## Debug Checklist

When a permission result looks wrong:

1. Inspect the namespace/relation names used by the app
2. Inspect the exact tuple data present
3. Inspect whether the subject should be direct or inherited via subject set
4. Run check and expand against the same target
5. Change the model only after verifying the data is correct

## Common Failure Modes

- Tuple writes lagging behind app state changes.
- Checking the wrong relation or namespace string.
- Using list/expand as a substitute for request-path checks.
- Assuming inherited access without the required subject-set tuple.
- Debugging model code when the real issue is missing tuple data.

## Error Responses

| Code | Error | Cause |
|------|-------|-------|
| 400 | `namespace not found` | Namespace not defined in OPL |
| 409 | `relation tuple already exists` | Duplicate INSERT |
| 404 | `not found` | Tuple doesn't exist (on delete) |
| - | `max depth reached` | Circular reference in hierarchy |
| - | `invalid subject` | Wrong format; should be `Namespace:id` or `Namespace:id#relation` |
