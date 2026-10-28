export const ORGANIZATION_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  USER: 'user',
  VIEWER: 'viewer',
} as const

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[keyof typeof ORGANIZATION_ROLES]

export const ROLE_HIERARCHY: Record<OrganizationRole, number> = {
  owner: 100,
  admin: 80,
  manager: 60,
  user: 40,
  viewer: 20,
}

export const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  owner: [
    'org:manage',
    'org:delete',
    'members:manage',
    'billing:manage',
    'clients:manage',
    'templates:manage',
    'campaigns:manage',
    'analytics:view',
    'settings:manage',
  ],
  admin: [
    'org:manage',
    'members:manage',
    'billing:view',
    'clients:manage',
    'templates:manage',
    'campaigns:manage',
    'analytics:view',
    'settings:manage',
  ],
  manager: [
    'clients:manage',
    'templates:manage',
    'campaigns:manage',
    'analytics:view',
  ],
  user: [
    'clients:view',
    'clients:edit',
    'templates:view',
    'templates:edit',
    'campaigns:view',
    'campaigns:edit',
    'analytics:view',
  ],
  viewer: [
    'clients:view',
    'templates:view',
    'campaigns:view',
    'analytics:view',
  ],
}

export function hasPermission(role: OrganizationRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function hasHigherOrEqualRole(role: OrganizationRole, targetRole: OrganizationRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[targetRole]
}

// Clerk organization role -> OrganizationRole. Webhooks and v1 session tokens send `org:admin` / `org:member`, v2
// session tokens (`o.rol`) drop the prefix, and older Clerk instances use `admin` / `basic_member` / `guest_member`.
const CLERK_ROLES: Record<string, OrganizationRole> = {
  'org:admin': 'admin',
  'org:member': 'user',
  admin: 'admin',
  member: 'user',
  basic_member: 'user',
  guest_member: 'viewer',
}

export function clerkRoleToOrganizationRole(clerkRole: string | null | undefined): OrganizationRole {
  return (clerkRole && CLERK_ROLES[clerkRole]) || 'user'
}

export function canManageRole(managerRole: OrganizationRole, targetRole: OrganizationRole): boolean {
  // Can only manage roles lower than yours (except owner can manage all)
  if (managerRole === 'owner') return true
  return ROLE_HIERARCHY[managerRole] > ROLE_HIERARCHY[targetRole]
}
