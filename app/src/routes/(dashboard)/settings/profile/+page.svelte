<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { ROLE_LABELS } from '$lib/permissions';

	let { data, form } = $props();
	let saving = $state(false);

	let name = $state('');
	let jobTitle = $state('');

	$effect(() => {
		name = data.user.name ?? '';
		jobTitle = data.user.jobTitle ?? '';
	});

	const hasChanges = $derived(
		name !== (data.user.name ?? '') || jobTitle !== (data.user.jobTitle ?? '')
	);
</script>

<div>
	<h1 class="text-3xl font-light">Profile</h1>
	<p class="text-muted-foreground mt-1">Your personal details.</p>
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
		<label for="name" class="text-sm font-medium">Name</label>
		<Input id="name" name="name" bind:value={name} required />
	</div>

	<div class="space-y-1.5">
		<label for="jobTitle" class="text-sm font-medium">Job title</label>
		<Input
			id="jobTitle"
			name="jobTitle"
			bind:value={jobTitle}
			placeholder="e.g. CTO, Head of Engineering"
		/>
		<p class="text-muted-foreground text-xs">
			Shown alongside your name in audit-trail entries and comments.
		</p>
	</div>

	<div class="space-y-1.5">
		<label for="email" class="text-sm font-medium">Email</label>
		<Input id="email" value={data.user.email ?? ''} readonly disabled />
	</div>

	<div class="space-y-1.5">
		<span class="text-sm font-medium">Role</span>
		<div>
			<Badge variant="outline">{ROLE_LABELS[data.role as keyof typeof ROLE_LABELS] ?? data.role}</Badge>
		</div>
	</div>

	{#if form?.error}
		<p class="text-sm text-destructive">{form.error}</p>
	{/if}

	{#if form?.success}
		<p class="text-muted-foreground text-sm">Saved.</p>
	{/if}

	<Button type="submit" disabled={!hasChanges || saving}>
		{saving ? 'Saving...' : 'Save'}
	</Button>
</form>
