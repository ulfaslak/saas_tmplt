<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();
	let saving = $state(false);

	let name = $state('');
	let slug = $state('');

	$effect(() => {
		name = data.org.name ?? '';
		slug = data.org.slug ?? '';
	});

	const hasChanges = $derived(
		name !== (data.org.name ?? '') || slug !== (data.org.slug ?? '')
	);
</script>

<div>
	<h1 class="text-3xl font-light">Organization</h1>
	<p class="text-muted-foreground mt-1">Manage your organization details.</p>
</div>

<form
	method="POST"
	action="?/save"
	use:enhance={() => {
		saving = true;
		return async ({ update }) => {
			await update();
			saving = false;
		};
	}}
	class="mt-6 max-w-2xl space-y-5"
>
	<div class="space-y-1.5">
		<label for="name" class="text-sm font-medium">Organization name</label>
		<Input id="name" name="name" bind:value={name} required />
	</div>

	<div class="space-y-1.5">
		<label for="slug" class="text-sm font-medium">Slug</label>
		<Input id="slug" name="slug" bind:value={slug} placeholder="e.g. acme-corp" />
		<p class="text-muted-foreground text-xs">
			Used in public URLs (e.g. <code>/legal/{slug || '<slug>'}</code>).
		</p>
	</div>

	{#if form && 'error' in form && form.error}
		<p class="text-destructive text-sm">{form.error}</p>
	{/if}
	{#if form && 'success' in form && form.success}
		<p class="text-sm text-green-600">Saved.</p>
	{/if}

	<div>
		<Button type="submit" disabled={!hasChanges || saving}>
			{saving ? 'Saving...' : 'Save'}
		</Button>
	</div>
</form>
