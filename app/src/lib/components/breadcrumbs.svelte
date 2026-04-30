<script lang="ts">
	type Crumb = { label: string; href?: string };

	let { crumbs }: { crumbs: Crumb[] } = $props();
</script>

<nav class="flex items-center gap-1.5 text-sm">
	{#each crumbs as crumb, i}
		{#if i > 0}
			<span class="text-muted-foreground/60">/</span>
		{/if}
		{#if crumb.href && i < crumbs.length - 1}
			<a href={crumb.href} class="text-muted-foreground hover:text-foreground">{crumb.label}</a>
		{:else}
			<span class="text-foreground">{crumb.label}</span>
		{/if}
	{/each}
</nav>
