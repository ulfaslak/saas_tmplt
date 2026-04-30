<script lang="ts">
	import type { Snippet } from "svelte";
	import { Collapsible as CollapsiblePrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		open = $bindable(false),
		children,
		...restProps
	}: Omit<CollapsiblePrimitive.RootProps, 'children'> & {
		children?: Snippet<[{ open: boolean }]>;
	} = $props();
</script>

<CollapsiblePrimitive.Root bind:ref bind:open data-slot="collapsible" {...restProps}>
	{@render children?.({ open })}
</CollapsiblePrimitive.Root>
