---
name: ory-keto
description: Model, integrate, extend, and troubleshoot Ory Keto as a relation-based authorization system. Use when working on Ory Keto or Ory Permissions for permission models, relation tuples, OPL namespaces, check/list/expand APIs, authorization architecture, or self-hosted Keto configuration and deployment.
---

# Ory Keto

Use this skill to implement or debug Ory Keto permissions systems. Prefer the targeted references in `references/` instead of loading broad Zanzibar or product documentation.

## Quick Start

1. Identify the task shape:
   - Design or update the authorization model
   - Write or delete relation tuples
   - Implement permission checks in an app or API
   - Debug list or expand behavior
   - Review self-hosted config or deployment
2. Read only the matching reference:
   - `references/modeling.md` for OPL, namespaces, subjects, subject sets, schema design, and permission model examples.
   - `references/api-usage.md` for tuple writes, check/list/expand patterns, application integration, and API endpoints.
   - `references/configuration.md` for self-hosted deploy/config review.
3. Map the task to concrete Keto primitives:
   - namespace / OPL model
   - relation tuple
   - subject or subject set
   - check, list, expand, or write path
4. Preserve authorization boundaries:
   - Model permissions centrally.
   - Evaluate checks on critical paths.
   - Keep application data and authorization tuples consistent.

## Workflow

### Design or change a permissions model

1. Start from the resource types, actors, and actions the app actually needs.
2. Define namespaces and relations before writing tuples.
3. Model inheritance or delegation deliberately with subject sets, not ad hoc application logic.
4. Test representative checks, lists, and expand results against the model.
5. Review whether tuple migration or backfill is needed for existing data.

Read `references/modeling.md` first.

### Implement or debug authorization checks

1. Identify the app decision point that needs authorization.
2. Decide whether the app needs: boolean permission decision, subject/resource listing, or graph expansion for debugging.
3. Confirm the tuple shape and namespace names match the model exactly.
4. Put permission checks on every critical path instead of relying on stale assumptions.
5. If results look wrong, inspect the tuple data before changing the model.

Read `references/api-usage.md` first.

### Review self-hosted Keto deployment

1. Start from exposed read/write services and current config.
2. Check namespace/OPL loading strategy and rollout process.
3. Check data store, network exposure, and consistency assumptions.
4. If performance or recursion issues appear, inspect query shape and relation design before widening limits.

Read `references/configuration.md` first.

## Guardrails

- Treat Keto as authorization infrastructure, not as the application database.
- Do not encode permissions only in application code when the task belongs in the relation model.
- Keep tuple writes aligned with application lifecycle events.
- Avoid caching authorization results blindly on critical paths.
- Distinguish direct subjects from subject sets and inherited permissions.
- Change the model deliberately; relation renames and namespace changes usually imply tuple migration.
- Always check permissions before actions. Never assume permission based on client state.
- Use UUIDs for IDs. Avoid predictable object/subject IDs in production.

## Deliverables

When completing a Keto task, prefer to leave:

- the namespaces/relations or OPL model used,
- the tuple shapes written or queried,
- the exact check/list/expand calls affected,
- the consistency or deployment assumptions,
- and any remaining migration or backfill step.
