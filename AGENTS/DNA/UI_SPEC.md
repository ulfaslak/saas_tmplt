# UI Spec

Conventions and guardrails for building UI. This document defines *patterns*, not pages — for actual page implementations, read the route files in `app/src/routes/`.

When building a new page or modifying an existing one, read 1-2 existing routes of similar complexity first. Match their patterns.

See [[DESIGN]] for the visual system — colors, typography, spacing, accessibility.

## Layout patterns

**Dashboard shell**: Sidebar (left, collapsible) + content area (right). Uses shadcn-svelte `Sidebar` component. All authenticated pages use this shell via the `(dashboard)` route group.

**Content area**: Max-width container with horizontal padding. Page title at top with optional subtitle in muted text.

**Auth pages** (login, onboard): Full-screen centered card on page background. No sidebar.

**Marketing pages**: `/(marketing)` route group. Own layout — no sidebar, no auth. *(Add these only when the product needs a public marketing surface.)*

## Component conventions

- **shadcn-svelte primitives** (`app/src/lib/components/ui/`) — do not modify these.
- **Forms**: submit via SvelteKit form actions with `use:enhance`. Save buttons disabled when no values have changed from loaded state.
- **Markdown editor** (when needed): a single reusable component for all content editing (Write/Preview toggle, default mode: Preview).
- **Diff view** (when needed): word-level diff component for text comparisons (additions: green background; deletions: red background with strikethrough).
- **Timestamps**: always relative (e.g. "2 hours ago"), never absolute.
- **Breadcrumbs**: top of detail/sub-pages, text trail with `/` separators (e.g. `Documents / Privacy Policy / Publishing`). All segments except the last are clickable links. Uses `Breadcrumbs` component from `$lib/components/breadcrumbs.svelte`.
- **Section group labels**: muted, xs, uppercase, medium weight, wide tracking.

## Badge conventions

> ⚠️ **Template placeholder.** Define your own status/risk badges as features land. Keep the mapping in one place so agents don't invent variants per page.

Example status badges:
- "Open" → `variant="outline"`
- "Resolved" / "Approved" → `variant="secondary"`
- "Dismissed" → `variant="secondary"`

## Interaction patterns

- **Empty states**: descriptive message + prominent CTA button when there's a natural next action.
- **Loading states**: button shows loading spinner during async operations.
- **Pagination**: "Previous / Next" buttons + "Page X of Y" label. Pick row counts per surface (e.g. 30 for tables, 20 for card grids) and use the same value everywhere similar.
- **Filter toggles**: rounded-full pill buttons. Active: filled primary background. Inactive: outlined muted text with hover.
- **Confirmation modals** for irreversible actions: AlertDialog before saves that trigger compliance/billing/delete flows. Pattern: intercept form submit → show AlertDialog → Cancel / Continue buttons.
- **Destructive actions**: inline confirmation within the dropdown — not a separate modal.
- **Action menus**: ellipsis dropdown in header area for entity-level actions (status changes, delete).
- **Clickable rows/cards**: `cursor-pointer` with hover effect when they navigate to a detail page.

## Save UX convention

Communicate save state through the Save button alone — no separate "Saved." text on the page.

- Disabled when there are no unsaved changes.
- "Saving..." while the form action is in flight.
- Returns to disabled "Save" after the server-refreshed values become the new baseline (the dirty state clears automatically with `use:enhance`).

## Table conventions

- `table-fixed` layout with explicit column widths.
- Main content column (e.g. Title) gets flexible width; all others fixed.
- Sorted by creation date descending by default.
- Truncate long text via CSS, not JS.

## Route groups

| Group | Purpose | Auth | Layout |
|---|---|---|---|
| `(dashboard)` | Authenticated app pages | Session auth | Sidebar shell |
| `(marketing)` | Public marketing pages | None | Own layout, no sidebar |
| `(public)` | Other public surfaces (e.g. hosted assets) | None | Standalone |
| `/api/webhooks/*` | Webhook endpoints | Signature verification | — |
| `/api/v1/*` | Public API | API key (Bearer token) | — |

## Responsive behavior

- Sidebar → sheet overlay on mobile (handled by shadcn sidebar component).
- Card grids → stack vertically on mobile.
- Tables remain horizontal (no responsive transformation — content truncates).

## Soft delete pattern

Entities that support soft delete: delete action sets `deleted_at`, redirects to parent list. Hard delete is never exposed in the UI.
