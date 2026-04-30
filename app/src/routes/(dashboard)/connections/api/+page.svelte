<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { timeAgo } from '$lib/utils';

	let { data, form } = $props();

	let copied = $state(false);
	let name = $state('');
	let creating = $state(false);
	let revokingId = $state<string | null>(null);

	function copyKey() {
		if (form?.createdKey) {
			navigator.clipboard.writeText(form.createdKey);
			copied = true;
			setTimeout(() => (copied = false), 2000);
		}
	}

</script>

<div>
	<h1 class="font-serif text-3xl font-light">API</h1>
	<p class="text-muted-foreground mt-1">Manage API keys for external integrations.</p>
</div>

<div class="mt-6 max-w-2xl space-y-10">
	<section>
		<h2 class="text-base font-medium">Create API key</h2>
		<form
			method="POST"
			action="?/create"
			use:enhance={() => {
				creating = true;
				return async ({ update }) => {
					await update();
					creating = false;
					name = '';
				};
			}}
			class="mt-4 flex items-end gap-3"
		>
			<div class="flex-1">
				<label for="key-name" class="text-muted-foreground mb-1 block text-sm">Name</label>
				<Input
					id="key-name"
					name="name"
					bind:value={name}
					placeholder="e.g. Cursor, CI pipeline"
				/>
			</div>
			<Button type="submit" disabled={!name.trim() || creating}>
				{creating ? 'Creating...' : 'Create key'}
			</Button>
		</form>

		{#if form?.createdKey}
			<div class="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
				<p class="mb-2 text-sm font-medium">Copy this key now. You won't be able to see it again.</p>
				<div class="flex items-center gap-2">
					<Input value={form.createdKey} readonly class="font-mono text-xs" />
					<Button variant="outline" size="sm" onclick={copyKey} class="shrink-0">
						{copied ? 'Copied!' : 'Copy'}
					</Button>
				</div>
			</div>
		{/if}

		{#if form?.error}
			<p class="text-destructive mt-2 text-sm">{form.error}</p>
		{/if}
	</section>

	<section>
		<h2 class="text-base font-medium">API keys</h2>

		{#if data.keys.length === 0}
			<p class="text-muted-foreground mt-4 text-sm">No API keys yet.</p>
		{:else}
			<div class="mt-4 space-y-3">
				{#each data.keys as key (key.id)}
					<div class="flex items-center gap-3 rounded-md border px-4 py-3">
						<div class="min-w-0 flex-1">
							<p class="text-sm font-medium">{key.name}</p>
							<p class="text-muted-foreground font-mono text-xs">{key.keyPrefix}...</p>
						</div>
						<span class="text-muted-foreground shrink-0 text-xs">
							{#if key.lastUsedAt}
								Used {timeAgo(key.lastUsedAt)}
							{:else}
								Never used
							{/if}
						</span>
						<span class="text-muted-foreground shrink-0 text-xs">{timeAgo(key.createdAt)}</span>
						<form
							method="POST"
							action="?/revoke"
							use:enhance={() => {
								revokingId = key.id;
								return async ({ update }) => {
									await update();
									revokingId = null;
								};
							}}
						>
							<input type="hidden" name="keyId" value={key.id} />
							<Button type="submit" variant="ghost" size="sm" class="text-destructive shrink-0" disabled={revokingId === key.id}>
								{revokingId === key.id ? 'Revoking...' : 'Revoke'}
							</Button>
						</form>
					</div>
				{/each}
			</div>
		{/if}
	</section>
</div>
