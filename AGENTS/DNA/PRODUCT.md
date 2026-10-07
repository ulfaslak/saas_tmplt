# Product

> ⚠️ **Template placeholder.** This file describes *what* you're building and *for whom*. Replace each section with your product's actual content. Sections marked **[fill in]** are required for the agent workflow to function — don't skip them. The structure below is the minimum the rest of DNA assumes exists.

## 1. Product Vision

**[fill in]** — One paragraph: what the product is, what it replaces or improves, what the world looks like for users once it exists. Concrete enough that an agent reading this can sanity-check whether a proposed feature is on-mission.

## 2. Core Problem

**[fill in]** — The pain point your product solves. 2–4 sentences. Enumerate the symptoms users experience today, then summarize how the product addresses them.

## 3. Issue tracker

The project's issue tracker is the single source of truth for in-flight and planned work.

> ⚠️ **Template placeholder.** The workflow defaults to **GitHub Issues** — repo `<owner/repo>`, queried via `gh issue list`, with the claim-comment convention documented in CLAUDE.md § "Soft context". Fill in the repo path and delete this admonition.
>
> If you use Linear or Jira instead, document workspace/site, team/project, and ticket prefix here, and adapt the GitHub Issues paragraph in CLAUDE.md § "Soft context" to that tracker's states.

## 4. User Personas & Permissions

### Role-based access control

> ⚠️ **Template placeholder.** The template ships with a generic three-role baseline. Adjust to match your product. Roles are defined in `app/src/lib/permissions.ts`.

Roles, ordered by privilege:

- **super_admin** — full system access including ops surfaces (logs, billing, internal tooling). Created only via CLI (`pnpm create-super-admin <email>`). Not selectable in the invite flow.
- **admin** — everything in their org except super-admin-only surfaces. Can manage team, edit org settings, invite members.
- **member** — standard user. Can use the product but not manage the team or billing.

Users created via self-service onboarding receive the `admin` role for their own org. Invite links carry a role assigned on acceptance. Permissions are defined in `$lib/permissions.ts` with route-level guards in the dashboard layout and action-level guards on form actions.

> Add or remove roles as your product needs. Update `permissions.ts`, `invites` schema, and the invite flow at the same time — the three are coupled.

## 5. Feature Inventory

Complete list of shipped features. Used for tier scoping — keep it current when features are added or removed.

> ⚠️ **Template placeholder.** Below is the baseline the template ships with. Add your product's features as you build them, organized by category. Remove any baseline features you decide not to keep.

### Authentication & Onboarding

- **Multi-provider login** — Google OAuth, Microsoft Entra ID, GitHub OAuth, email magic link (Resend). Providers are conditionally registered based on env vars — only those with configured credentials appear on the login page.
- **Email verification** — token-based login flow for the email provider.
- **Organization creation** — new org setup during onboarding (org name).
- **Invite-based joining** — join an existing org via emailed invite link (`/invite/[token]`) with pre-assigned role; handles revoked, expired, already-a-member, and multi-org-conflict states.
- **Impersonation** — password-protected admin support feature, time-limited sessions. CLI-driven (`pnpm impersonate`).

### Settings & Administration

- **Organization settings** — name, optional metadata fields.
- **Team management** — member list with roles and join dates; email-based invite flow with 7-day expiry; revoke, resend, and remove actions.
- **API key management** — create keys, view masked keys, track last-used timestamps, revoke. Keys are SHA-256 hashed at rest.
- **RBAC** — see §4.

### Developer Tools

- **REST API** — `/api/v1/*` endpoints, Bearer-token authenticated.
- **Health endpoint** — `GET /api/health` with database connectivity check.

### Dashboard

- **Overview** — landing page after login. Add summary cards as features land.

## 6. Not Yet Built

Features discussed or planned but not shipped. Kept here so tier scoping can distinguish current from future.

> ⚠️ **Template placeholder.** Replace with your product's roadmap items as they emerge. Move shipped items into §5.
