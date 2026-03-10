// Ory Permission Language (OPL) Configuration
// This file defines namespaces and permissions for Ory Keto
//
// To apply:
//   ory patch opl -f file://./namespaces.ts
//
// Or via curl:
//   curl -X PATCH http://localhost:4466/admin/namespaces \
//     -H "Content-Type: text/plain" \
//     --data-binary @namespaces.ts

import { Namespace, Context } from "@ory/keto-namespace-types"

// ============================================================================
// User Namespace
// ============================================================================

class User implements Namespace {}

// ============================================================================
// Group Namespace
// ============================================================================

class Group implements Namespace {
  related: {
    members: User[]
    admins: User[]
  }

  permits = {
    // Admins can manage the group
    admin: (ctx: Context): boolean =>
      this.related.admins.includes(ctx.subject),
    
    // Members include admins
    member: (ctx: Context): boolean =>
      this.permits.admin(ctx) ||
      this.related.members.includes(ctx.subject)
  }
}

// ============================================================================
// Role Namespace (for RBAC)
// ============================================================================

class Role implements Namespace {
  related: {
    members: User[]
  }
}

// ============================================================================
// Folder Namespace (hierarchical)
// ============================================================================

class Folder implements Namespace {
  related: {
    owners: User[]
    editors: User[]
    viewers: User[]
    viewerGroups: Group[]
    editorGroups: Group[]
    parents: Folder[]
  }

  permits = {
    // Full control
    own: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject),
    
    // Can modify folder and contents
    edit: (ctx: Context): boolean =>
      this.permits.own(ctx) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.editorGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((parent) => parent.permits.edit(ctx)),
    
    // Can view folder and contents
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.viewerGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((parent) => parent.permits.view(ctx))
  }
}

// ============================================================================
// Document Namespace
// ============================================================================

class Document implements Namespace {
  related: {
    // Direct user assignments
    owners: User[]
    editors: User[]
    viewers: User[]
    
    // Group assignments
    ownerGroups: Group[]
    editorGroups: Group[]
    viewerGroups: Group[]
    
    // Hierarchical - parent folders
    parents: Folder[]
  }

  permits = {
    // Owner has full control
    own: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.ownerGroups.traverse((g) => g.permits.member(ctx)),
    
    // Can edit document content
    edit: (ctx: Context): boolean =>
      this.permits.own(ctx) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.editorGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((parent) => parent.permits.edit(ctx)),
    
    // Can read document
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.viewerGroups.traverse((g) => g.permits.member(ctx)) ||
      this.related.parents.traverse((parent) => parent.permits.view(ctx)),
    
    // Can share with others
    share: (ctx: Context): boolean =>
      this.permits.edit(ctx),
    
    // Can delete document
    delete: (ctx: Context): boolean =>
      this.permits.own(ctx)
  }
}

// ============================================================================
// Project Namespace (multi-tenant)
// ============================================================================

class Organization implements Namespace {
  related: {
    owners: User[]
    members: User[]
    admins: User[]
  }

  permits = {
    // Full control over org
    own: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject),
    
    // Can manage org settings
    admin: (ctx: Context): boolean =>
      this.permits.own(ctx) ||
      this.related.admins.includes(ctx.subject),
    
    // Is a member of org
    member: (ctx: Context): boolean =>
      this.permits.admin(ctx) ||
      this.related.members.includes(ctx.subject)
  }
}

class Project implements Namespace {
  related: {
    owners: User[]
    editors: User[]
    viewers: User[]
    orgs: Organization[]
  }

  permits = {
    // Full control
    own: (ctx: Context): boolean =>
      this.related.owners.includes(ctx.subject) ||
      this.related.orgs.traverse((org) => org.permits.own(ctx)),
    
    // Can modify project
    edit: (ctx: Context): boolean =>
      this.permits.own(ctx) ||
      this.related.editors.includes(ctx.subject) ||
      this.related.orgs.traverse((org) => org.permits.admin(ctx)),
    
    // Can view project
    view: (ctx: Context): boolean =>
      this.permits.edit(ctx) ||
      this.related.viewers.includes(ctx.subject) ||
      this.related.orgs.traverse((org) => org.permits.member(ctx))
  }
}

// ============================================================================
// API Endpoint Namespace
// ============================================================================

class Endpoint implements Namespace {
  related: {
    // Who can call this endpoint
    allowList: User[]
    allowRoles: Role[]
    
    // Who is explicitly denied
    denyList: User[]
  }

  permits = {
    // Can call the endpoint
    call: (ctx: Context): boolean => {
      // Explicit deny takes precedence
      if (this.related.denyList.includes(ctx.subject)) {
        return false
      }
      
      // Check explicit allow
      if (this.related.allowList.includes(ctx.subject)) {
        return true
      }
      
      // Check role-based access
      if (this.related.allowRoles.traverse((role) =>
        role.related.members.includes(ctx.subject)
      )) {
        return true
      }
      
      return false
    }
  }
}

// ============================================================================
// Feature Flag Namespace
// ============================================================================

class Feature implements Namespace {
  related: {
    // Different release stages
    alphaUsers: User[]
    betaUsers: User[]
    allUsers: User[]
  }

  permits = {
    // Can use feature (any stage)
    use: (ctx: Context): boolean =>
      this.related.allUsers.includes(ctx.subject) ||
      this.related.betaUsers.includes(ctx.subject) ||
      this.related.alphaUsers.includes(ctx.subject),
    
    // Can use beta features
    beta: (ctx: Context): boolean =>
      this.related.alphaUsers.includes(ctx.subject) ||
      this.related.betaUsers.includes(ctx.subject),
    
    // Can use alpha features
    alpha: (ctx: Context): boolean =>
      this.related.alphaUsers.includes(ctx.subject)
  }
}
