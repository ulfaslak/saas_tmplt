/** Reactive mobile-detection hook built on Svelte's MediaQuery. */
import { MediaQuery } from "svelte/reactivity";

const DEFAULT_MOBILE_BREAKPOINT = 768;

/** Matches viewports below the given breakpoint (default 768px). Read `.current` for the result. */
export class IsMobile extends MediaQuery {
	constructor(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
		super(`max-width: ${breakpoint - 1}px`);
	}
}
