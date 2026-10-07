/**
 * Standard rendered-layout probe (CLAUDE.md Phase 2, "rendered layout not
 * just DOM"). Run it on every touched surface at 390px AND desktop width —
 * it replaces the ad-hoc checks each session used to re-derive.
 *
 * How to drive it (Playwright MCP):
 *   1. `browser_resize` to 390x844, navigate to the surface.
 *   2. `browser_evaluate` with this file's contents wrapped as
 *      `() => { <file contents> return probeLayout(); }`
 *      — or paste the function and call `probeLayout()`.
 *   3. Repeat at desktop width (e.g. 1440x900). Open any dialog/popover you
 *      touched first — client-mounted surfaces aren't probed until mounted.
 *
 * What it asserts:
 *   - no horizontal page scroll (document wider than the viewport), reporting
 *     the widest in-flow offenders when it fires;
 *   - every visible text-bearing element has a nonzero rendered width
 *     (zero-width = collapsed/clipped text);
 *   - every visible in-flow element's rect stays inside its nearest scroll
 *     container (allowing the container's own scrollable overflow).
 * Skipped by design: anything `checkVisibility()` rules out (display:none
 * subtrees, visibility:hidden), SVG internals, <option>s, and elements with a
 * fixed/sticky ancestor (app chrome and off-canvas drawers position those
 * outside the flow legitimately). Returns { ok: true } or
 * { ok: false, failures: [...] }. A failure is a bug until explained.
 */
function probeLayout() {
	const failures = [];
	const vw = document.documentElement.clientWidth;
	const doc = document.documentElement;
	const path = (el) => {
		const parts = [];
		for (let n = el; n && n !== document.body && parts.length < 4; n = n.parentElement) {
			parts.unshift(
				n.tagName.toLowerCase() +
					(n.id
						? `#${n.id}`
						: n.className && typeof n.className === 'string'
							? '.' + n.className.split(/\s+/).slice(0, 2).join('.')
							: '')
			);
		}
		return parts.join(' > ');
	};
	const hasFixedAncestor = (el) => {
		for (let n = el; n && n !== document.body; n = n.parentElement) {
			const pos = getComputedStyle(n).position;
			if (pos === 'fixed' || pos === 'sticky') return true;
		}
		return false;
	};
	const scrollParent = (el) => {
		for (let n = el.parentElement; n; n = n.parentElement) {
			const s = getComputedStyle(n);
			if (/(auto|scroll|hidden)/.test(s.overflowX + s.overflowY)) return n;
		}
		return doc;
	};
	if (doc.scrollWidth > vw + 1) {
		const offenders = [...document.body.querySelectorAll('*')]
			.filter((el) => !hasFixedAncestor(el) && el.getBoundingClientRect().right > vw + 1)
			.sort((a, b) => b.getBoundingClientRect().right - a.getBoundingClientRect().right)
			.slice(0, 5)
			.map((el) => ({ el: path(el), right: Math.round(el.getBoundingClientRect().right) }));
		failures.push({ reason: 'horizontal page scroll', scrollWidth: doc.scrollWidth, viewport: vw, offenders });
	}
	for (const el of document.body.querySelectorAll('*')) {
		if (el.closest('svg') || el.tagName === 'OPTION' || el.tagName === 'OPTGROUP') continue;
		if (typeof el.checkVisibility === 'function' && !el.checkVisibility()) continue;
		if (hasFixedAncestor(el)) continue;
		const rect = el.getBoundingClientRect();
		const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
		if (hasText && el.clientWidth === 0 && rect.width === 0) {
			failures.push({ reason: 'zero-width text element', el: path(el) });
			continue;
		}
		if (rect.width === 0 && rect.height === 0) continue;
		const parent = scrollParent(el);
		const p = parent.getBoundingClientRect();
		// Right edge may extend into the parent's scrollable overflow; anything
		// past scrollWidth is genuinely painted outside the container.
		// 2px tolerance: clientWidth/scrollWidth are integer-truncated while
		// rects are fractional, so an honest row can read up to ~1.5px "outside".
		const maxRight = p.left + Math.max(parent.scrollWidth, parent.clientWidth) - parent.scrollLeft;
		if (rect.left < p.left - 2) {
			failures.push({ reason: 'escapes container (left)', el: path(el), left: Math.round(rect.left), containerLeft: Math.round(p.left) });
		} else if (rect.right > maxRight + 2) {
			failures.push({ reason: 'escapes container (right)', el: path(el), right: Math.round(rect.right), containerRight: Math.round(maxRight) });
		}
	}
	return failures.length === 0 ? { ok: true } : { ok: false, failures: failures.slice(0, 20) };
}
