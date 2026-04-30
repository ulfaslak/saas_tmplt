<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data, form } = $props();
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="bg-card text-card-foreground w-full max-w-sm rounded-lg border p-8 shadow-sm">
		<h1 class="font-serif text-2xl font-bold tracking-tight">Impersonate</h1>
		<p class="text-muted-foreground mt-1 text-sm">Enter the session password to continue</p>

		{#if form?.error}
			<p class="mt-4 text-sm text-red-600">{form.error}</p>
		{/if}

		<form method="POST" class="mt-6">
			<input type="hidden" name="token" value={data.token} />
			<Input type="password" name="password" placeholder="Password" required class="mb-3" />
			<Button type="submit" class="w-full">Enter</Button>
		</form>
	</div>
</div>
