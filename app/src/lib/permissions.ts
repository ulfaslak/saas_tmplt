/**
 * Role-based access control. Defines which roles can access which routes and actions.
 *
 * Roles (ordered by privilege):
 *   super_admin — full access, DB-script-only creation
 *   admin       — everything in their org
 *   member      — standard user
 *
 * Add or remove roles to match your product. Keep ROLES, INVITABLE_ROLES,
 * ROLE_LABELS, and the routeAccess map in sync.
 */

export type Role = 'super_admin' | 'admin' | 'member';

export const ROLES: Role[] = ['super_admin', 'admin', 'member'];

/** Roles available for invite creation (super_admin is excluded). */
export const INVITABLE_ROLES: Role[] = ['admin', 'member'];

/** Human-readable role labels for UI and email copy. */
export const ROLE_LABELS: Record<Role, string> = {
	super_admin: 'Super Admin',
	admin: 'Admin',
	member: 'Member'
};

// ── Route access ────────────────────────────────────────────────────────

type RoutePrefix = string;

/**
 * Routes not listed below are accessible to all authenticated roles.
 * Matching is prefix-based: the most specific prefix wins.
 *
 * Add product-specific gates here as you build them.
 */
const routeAccess: Record<RoutePrefix, Role[]> = {
	'/settings/organization': ['super_admin', 'admin']
};

export function canAccessRoute(role: Role, pathname: string): boolean {
	const sorted = Object.keys(routeAccess).sort((a, b) => b.length - a.length);
	for (const prefix of sorted) {
		if (pathname.startsWith(prefix)) {
			return routeAccess[prefix].includes(role);
		}
	}
	return true;
}

// ── Action-level permissions ────────────────────────────────────────────

/** Can manage team: create invites, remove members, revoke invites, change roles. */
export function canManageTeam(role: Role): boolean {
	return role === 'super_admin' || role === 'admin';
}

/** Can edit organization settings. */
export function canEditOrganization(role: Role): boolean {
	return role === 'super_admin' || role === 'admin';
}

/** Can change another user's role. Cannot change super_admin users. */
export function canChangeRole(actorRole: Role, targetRole: Role): boolean {
	if (!canManageTeam(actorRole)) return false;
	if (targetRole === 'super_admin') return false;
	return true;
}

/** Can remove a member. Cannot remove super_admin users. */
export function canRemoveMember(actorRole: Role, targetRole: Role): boolean {
	if (!canManageTeam(actorRole)) return false;
	if (targetRole === 'super_admin') return false;
	return true;
}
