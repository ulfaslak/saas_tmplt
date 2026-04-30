# Design

Design principles, visual direction, and aesthetic guardrails. See [[UI_SPEC]] for component conventions and interaction patterns.

> ⚠️ **Template placeholder.** This file is mostly product-specific — colors, fonts, and brand voice belong to your product, not the template. Replace each section below with your own. The sub-headings (Users, Brand Personality, Aesthetic Direction, Design Principles, Color Palette, Typography, Spacing & Radius, Accessibility) are a useful skeleton — keep them, fill them in.

## Users

**[fill in]** — Who uses this interface, what jobs they do, what tone of voice they expect, and what failure modes hurt them most. Two paragraphs is enough.

## Brand Personality

**[fill in]** — A few adjectives plus a one-line summary of the tone. Examples: *"Calm, precise, trustworthy. A quiet authority — like a well-organized library."* Or: *"Direct, energetic, opinionated. The interface has a point of view and isn't shy about it."*

## Aesthetic Direction

**[fill in]** — One paragraph on the visual direction (color, typography choice, decoration level), one paragraph naming an explicit reference site you want to feel like, and one paragraph of explicit anti-patterns ("not this kind of SaaS", "not gradients", "not gamified", etc.). Anti-patterns are the most useful part — they save the agent from defaulting to generic Tailwind soup.

## Design Principles

**[fill in]** — 4–6 numbered principles. Each is a short title plus one sentence of guidance. Principles are *for resolving ambiguity*: when an agent has two plausible design choices, the principles should tell it which one to pick.

Example principles to riff on:

1. **Content over chrome.** Decorative choices must serve readability. If a visual element doesn't help the user understand or act, remove it.
2. **Quiet confidence.** Restraint over flourish. Subtle shadows over drop shadows. Thin borders over heavy dividers.
3. **Typography as structure.** Use weight, size, and family to organize information before reaching for color.
4. **Generous breathing room.** Whitespace signals calm and control.
5. **Precision in details.** Consistent spacing, aligned baselines, uniform radii. Small inconsistencies erode trust.

## Color Palette

**[fill in]** — A table of named tokens to actual hex values, plus a one-line note on usage per token. The point is to lock the palette so agents don't invent new colors mid-feature.

| Token | Hex | Usage |
|-------|-----|-------|
| Background | `#______` | Page background |
| Foreground | `#______` | Primary text |
| Card | `#______` | Card surfaces |
| Primary | `#______` | Buttons, strong emphasis |
| Muted | `#______` | Secondary text, timestamps |
| Border | `#______` | Dividers, card borders |
| Destructive | `#______` | Errors, high-risk, delete actions |

Define extended scales (`brand-50` … `brand-950`) in `app/src/routes/layout.css` `@theme` if you want richer Tailwind utilities.

## Typography

**[fill in]** — Name your sans + serif (or whatever pairing), how each is loaded, and which classes/components use them. Be explicit about size scales — agents will otherwise default to `text-base` everywhere.

A good convention: define `m-type-*` classes in `layout.css` for marketing pages, and rely on shadcn-svelte tokens for the dashboard.

## Spacing & Radius

**[fill in]** — Lock the radius scale (e.g. `0.25rem`, `0.375rem`, `0.5rem`, `0.75rem`) and a small spacing vocabulary for forms and cards (e.g. `space-y-5` between form sections, `space-y-1.5` between label and input, `gap-6` for card internals). Shadows: pick a maximum (e.g. `shadow-xs` and `shadow-sm`) and forbid heavier ones unless explicitly approved.

## Accessibility

Standard best practices: semantic HTML, visible focus rings, sufficient contrast, aria attributes where needed. Pick a WCAG target if it matters for your audience; otherwise just commit to "comfortable readability for the typical user" and review per-feature.
