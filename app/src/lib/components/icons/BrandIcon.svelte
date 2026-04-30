<script lang="ts" module>
	import githubSvg from './brands/github.svg?raw';
	import linearSvg from './brands/linear.svg?raw';
	import jiraSvg from './brands/jira.svg?raw';
	import reactSvg from './brands/react.svg?raw';
	import nextjsSvg from './brands/nextjs.svg?raw';
	import vueSvg from './brands/vue.svg?raw';
	import svelteSvg from './brands/svelte.svg?raw';
	import wordpressSvg from './brands/wordpress.svg?raw';
	import squarespaceSvg from './brands/squarespace.svg?raw';
	import wixSvg from './brands/wix.svg?raw';
	import webflowSvg from './brands/webflow.svg?raw';

	const ICONS = {
		github: githubSvg,
		linear: linearSvg,
		jira: jiraSvg,
		react: reactSvg,
		nextjs: nextjsSvg,
		vue: vueSvg,
		svelte: svelteSvg,
		wordpress: wordpressSvg,
		squarespace: squarespaceSvg,
		wix: wixSvg,
		webflow: webflowSvg
	} as const;

	export type BrandIconName = keyof typeof ICONS;
</script>

<script lang="ts">
	let {
		name,
		class: className = '',
		title
	}: { name: BrandIconName; class?: string; title?: string } = $props();
</script>

<span
	role="img"
	aria-label={title ?? name}
	class="inline-flex shrink-0 items-center justify-center {className}"
>
	{@html ICONS[name]}
</span>

<style>
	span :global(svg) {
		width: 100%;
		height: 100%;
	}
</style>
