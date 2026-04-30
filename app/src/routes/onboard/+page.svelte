<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="bg-card text-card-foreground w-full max-w-sm rounded-lg border p-8 shadow-sm">
		<h1 class="text-2xl font-bold tracking-tight">Set up your workspace</h1>
		<p class="text-muted-foreground mt-1 text-sm">Create your organization to get started.</p>

		{#if form?.createError}
			<p class="mt-4 text-sm text-red-600">{form.createError}</p>
		{/if}

		<form method="POST" action="?/createOrg" class="mt-6 space-y-4">
			<div>
				<label for="user-name" class="text-sm font-medium">
					Your name
					<span class="text-muted-foreground font-normal">(optional)</span>
				</label>
				<Input
					id="user-name"
					name="userName"
					type="text"
					maxlength={100}
					value={data.suggestedName}
					placeholder="Maria Jensen"
					class="mt-1"
				/>
			</div>
			<div>
				<label for="org-name" class="text-sm font-medium">Organization name</label>
				<Input
					id="org-name"
					name="name"
					type="text"
					required
					maxlength={100}
					placeholder="Acme Corp"
					class="mt-1"
				/>
			</div>
			<Button type="submit" class="w-full">Create organization</Button>
		</form>
	</div>
</div>
