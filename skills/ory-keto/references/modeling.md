# Ory Keto Modeling

## Use This Reference For

- Namespace and OPL design
- Relation and permission modeling
- Subject and subject set semantics
- Permission model patterns (RBAC, ACL, hierarchical, multi-tenant)
- Tuple migration risk analysis

## Core Model

- Keto is a relation-based authorization system inspired by Zanzibar-style modeling.
- Permissions are derived from tuples and relation definitions, not from ad hoc role checks scattered through application code.
- The model should express who can do what on which resource, and how permissions inherit through groups, parents, or delegated access.

## Design Process

Start from concrete questions:

1. What are the protected resource types?
2. What actions must be authorized?
3. Who can act directly?
4. How can permissions be inherited or delegated?
5. What relations are first-class and worth modeling explicitly?

Then define: namespaces/resource types, relations per resource, subjects and subject sets, and any transitive or derived permissions.

## Subject and Subject Set Rules

- A **direct subject** is an individual actor or object reference (e.g., `User:alice`).
- A **subject set** points to another relation on another object and is how inheritance/delegation is expressed (e.g., `Group:engineering#member`).
- Use subject sets for group membership, parent-child resource permissions, and shared ownership patterns.
- Keep relation names precise; ambiguous names make checks harder to reason about and migrate.

## Modeling Checklist

When adding a new permission:

1. Define the resource namespace
2. Define the relation or permission
3. Decide whether access is direct, inherited, or both
4. Create representative tuples
5. Verify check, list, and expand behavior
6. Identify migration/backfill needs for existing objects

---

## OPL (Ory Permission Language)

### Basic Structure

```typescript
import { Namespace, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Document implements Namespace {
  related: {
    owners: User[]
    editors: User[]
    viewers: User[]
    parents: Folder[]
  }

  permits = {
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.editors.includes(ctx.subject),

    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.parents.traverse((parent) => parent.permits.view(ctx))
  }
}
```

### Permission Inheritance

Build permission hierarchies with `permits` references:

```typescript
permits = {
  edit: (ctx: Context): boolean =>
    this.related.editors.includes(ctx.subject),
  view: (ctx: Context): boolean =>
    this.permits.edit(ctx) || this.related.viewers.includes(ctx.subject)
}
```

### Subject Set Traversal

Grant permission based on group membership:

```typescript
permits = {
  admin: (ctx: Context): boolean =>
    this.related.admins.traverse((group) =>
      group.related.members.includes(ctx.subject)
    )
}
```

### Hierarchical Traversal

Permission inheritance through parent objects:

```typescript
permits = {
  view: (ctx: Context): boolean =>
    this.related.viewers.includes(ctx.subject) ||
    this.related.parents.traverse((parent) => parent.permits.view(ctx))
}
```

### Multiple Subject Types

```typescript
related: {
  users: User[]
  serviceAccounts: ServiceAccount[]
}
permits = {
  access: (ctx: Context): boolean =>
    this.related.users.includes(ctx.subject) ||
    this.related.serviceAccounts.includes(ctx.subject)
}
```

### OPL Validation

```bash
ory validate opl -f config.ts
ory patch opl -f file://./config.ts
```

---

## Permission Model Patterns

### RBAC (Role-Based Access Control)

```typescript
class User implements Namespace {}

class Role implements Namespace {
  related: { members: User[] }
}

class Resource implements Namespace {
  related: {
    admins: Role[]
    editors: Role[]
    viewers: Role[]
  }
  permits = {
    delete: (ctx: Context): boolean =>
      this.related.admins.traverse((role) => role.related.members.includes(ctx.subject)),
    edit: (ctx: Context): boolean =>
      this.permits.delete(ctx) ||
      this.related.editors.traverse((role) => role.related.members.includes(ctx.subject)),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.traverse((role) => role.related.members.includes(ctx.subject))
  }
}
```

Tuples:
```
Role:admin#member@User:alice
Role:editor#member@User:bob
Resource:doc#admins@Role:admin
Resource:doc#editors@Role:editor
```

### ACL (Access Control Lists)

Direct user-to-resource permissions:

```typescript
class File implements Namespace {
  related: { owners: User[]; editors: User[]; viewers: User[] }
  permits = {
    delete: (ctx: Context): boolean => this.related.owners.includes(ctx.subject),
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) || this.related.editors.includes(ctx.subject),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) || this.related.viewers.includes(ctx.subject)
  }
}
```

### Hierarchical / Inherited Permissions

```typescript
class Folder implements Namespace {
  related: { owners: User[]; editors: User[]; viewers: User[]; parents: Folder[] }
  permits = {
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.parents.traverse((parent) => parent.permits.edit(ctx)),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.parents.traverse((parent) => parent.permits.view(ctx))
  }
}

class File implements Namespace {
  related: { owners: User[]; parents: Folder[] }
  permits = {
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.parents.traverse((parent) => parent.permits.edit(ctx)),
    view: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.parents.traverse((parent) => parent.permits.view(ctx))
  }
}
```

Tuples:
```
Folder:root#owners@User:alice
Folder:projects#parents@Folder:root
File:report.txt#parents@Folder:projects
→ alice can edit and view File:report.txt via inheritance
```

### Multi-Tenant Permissions

```typescript
class Organization implements Namespace {
  related: { owners: User[]; members: User[] }
  permits = {
    member: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) || this.related.members.includes(ctx.subject)
  }
}

class Project implements Namespace {
  related: { owners: User[]; editors: User[]; viewers: User[]; orgs: Organization[] }
  permits = {
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.orgs.traverse((org) => org.permits.owner(ctx)),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.orgs.traverse((org) => org.permits.member(ctx))
  }
}
```

### Feature Flags

```typescript
class Feature implements Namespace {
  related: { alphaUsers: User[]; betaUsers: User[]; allUsers: User[] }
  permits = {
    use: (ctx: Context): boolean =>
      this.related.allUsers.includes(ctx.subject) ||
      this.related.betaUsers.includes(ctx.subject) ||
      this.related.alphaUsers.includes(ctx.subject),
    beta: (ctx: Context): boolean =>
      this.related.alphaUsers.includes(ctx.subject) ||
      this.related.betaUsers.includes(ctx.subject),
    alpha: (ctx: Context): boolean =>
      this.related.alphaUsers.includes(ctx.subject)
  }
}
```

### API Endpoint Permissions

```typescript
class Endpoint implements Namespace {
  related: { allowList: User[]; denyList: User[]; requireRole: Role[] }
  permits = {
    call: (ctx: Context): boolean => {
      if (this.related.denyList.includes(ctx.subject)) return false
      if (this.related.allowList.includes(ctx.subject)) return true
      return this.related.requireRole.traverse((role) => role.related.members.includes(ctx.subject))
    }
  }
}
```

---

## Complete Example: Document Management System

```typescript
import { Namespace, Context } from "@ory/keto-namespace-types"

class User implements Namespace {}

class Group implements Namespace {
  related: { members: User[]; admins: User[] }
  permits = {
    admin: (ctx: Context): boolean => this.related.admins.includes(ctx.subject),
    member: (ctx: Context): boolean =>
      this.permits.admin(ctx) || this.related.members.includes(ctx.subject)
  }
}

class Folder implements Namespace {
  related: { owners: User[]; editors: User[]; viewers: User[]; viewerGroups: Group[]; editorGroups: Group[]; parents: Folder[] }
  permits = {
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.editorGroups.traverse((g) => g.permits.member(ctx)),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.viewerGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((p) => p.permits.view(ctx))
  }
}

class Document implements Namespace {
  related: { owners: User[]; editors: User[]; viewers: User[]; viewerGroups: Group[]; editorGroups: Group[]; parents: Folder[] }
  permits = {
    delete: (ctx: Context): boolean => this.related.owners.includes(ctx.subject),
    edit: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.editorGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((p) => p.permits.edit(ctx)),
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.viewerGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((p) => p.permits.view(ctx)),
    share: (ctx: Context): boolean => this.permits.edit(ctx)
  }
}
```

See `assets/namespaces.ts` for a comprehensive OPL template including Organization, Project, Endpoint, and Feature namespaces.

---

## Best Practices

1. **Start simple** — add complexity only when needed.
2. **Consistent naming** — use clear, action-based permission names.
3. **Permission inheritance** — build hierarchies with `permits` references.
4. **Subject sets for groups** — manage access at scale via `Group:engineering#member`.
5. **Hierarchical traversal** — use `traverse()` for parent-child relationships.
6. **Least privilege** — default to denying, explicitly allow.
7. **Limit hierarchy depth** — avoid deep nesting that causes performance issues.
8. **Groups for broad access, direct for exceptions**.

## Common Failure Modes

- Starting from tuple writes before agreeing on the model.
- Flattening all access into coarse roles and losing resource specificity.
- Misusing direct subjects where subject sets are needed.
- Renaming relations without planning tuple migration.
- Encoding business exceptions in app code instead of the authorization model.
