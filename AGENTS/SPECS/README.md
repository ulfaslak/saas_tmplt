# Design mock workflow

When the human asks for a **mock / mockup** — a standalone HTML preview of a design *before* it's implemented — follow this workflow. Don't hand-roll the app chrome from scratch each time, and don't ship a mock you haven't looked at.

Mocks live at `AGENTS/SPECS/<feature-slug>/<feature-slug>.html` — the file is **named after its directory slug**, not `mock.html`, so it's self-explanatory when sent to someone as a standalone file. They are the visual source-of-truth a future agent implements from, until the feature ships — after which the shipped components take over that role.

> ⚠️ **Template placeholder.** This directory needs a `_TEMPLATE/` seeded from
> **your app's real chrome** before the workflow below works: one
> `_TEMPLATE.html` carrying the actual sidebar/top bar/content grid, the app's
> CSS token set (copied from the real layout stylesheet), and ready-styled
> versions of the app's core components (badges, buttons, tabs, modal, toast),
> plus a dev-control bar and a Design-notes drawer. Build it once the design
> system has settled — copying real chrome is what keeps mocks from drifting
> from the product. Delete this admonition when `_TEMPLATE/` exists.

## Steps

1. **Copy the template, then name the mock after the slug.** `cp -r AGENTS/SPECS/_TEMPLATE AGENTS/SPECS/<feature-slug>` then `mv AGENTS/SPECS/<feature-slug>/_TEMPLATE.html AGENTS/SPECS/<feature-slug>/<feature-slug>.html`. The HTML filename must equal the directory slug — never `mock.html` — so the file stands on its own when shared.

2. **Match real fidelity.** Open the actual route/components you're mocking and read [[UI_SPEC]] + [[DESIGN]]. Get fonts, colours, corner radii, and spacing right. Pull real copy and real data shapes, not lorem. If you're mocking a specific screen the human screenshotted, rebuild *that* screen first so it's recognisable.

3. **Offer variants when the design is undecided.** Use the dev-control toggle to A/B options in-browser (e.g. modal vs toast) so the human can pick by looking. Keep it obviously a mock-only control.

4. **Fill in the Design notes drawer — this is the deliverable, not decoration.** The mock's pixels show *what it looks like*; the Design notes capture *everything else the implementer needs* so no detail the human asked for is lost between mock and merged code. Cover:
   - **Intent** — the problem + goal, in the human's words.
   - **States to build** — every status/role/phase/empty/error state, not just the happy path.
   - **Interactions** — what each action does, navigation, animation/timing, focus & keyboard.
   - **Copy** — exact strings.
   - **Components to reuse** — the real app components/routes to build on.
   - **Data** — where each value comes from (server `load`, fields, derived counts).
   - **Out of scope** — what not to build.
   - **Open questions** — anything still undecided for the human.
   If the human gave you detail (behaviours, edge cases, copy, "it should also do X"), it belongs here verbatim — that's the point.

5. **Render and verify before sharing.** Open the file and screenshot it — never present a mock you haven't seen. Preferred: Playwright MCP (`browser_navigate` to the `file://` path → `browser_take_screenshot`). Compare against the real UI. Iterate with the human until they're happy.

6. **The mock is the spec.** When the ticket is picked up, the implementing agent reads `<feature-slug>.html` (visual) **and** the Design notes (intent + all the details) and builds from both. A good mock makes the implementation a transcription job.

## Fidelity checklist

- [ ] Fonts loaded and applied per [[DESIGN]].
- [ ] Corner radii, spacing, and colours from the app's token set (no arbitrary hexes).
- [ ] Sidebar active item matches the page; top bar present.
- [ ] Real copy and realistic data — no lorem, no placeholder numbers where real ones matter.
- [ ] Every relevant state represented or noted (empty/error/role/status), not just the happy path.
- [ ] Design notes drawer fully filled in.
- [ ] Rendered and screenshotted; looks like the real app.

## Notes

- Mocks are **standalone HTML** — Google Fonts + icon CDNs are fine for a local file. No Tailwind; use the hand-rolled CSS classes / tokens in the template.
- Keep `_TEMPLATE/` generic. Improvements to the shared chrome/components/tokens go **there**; feature-specific content goes in the copy.
- Don't edit `_TEMPLATE/` from inside a feature mock. If you find the token set or a component drifting from the app's real stylesheet, fix the template in the same spirit as the DNA "don't let it drift" rule.
