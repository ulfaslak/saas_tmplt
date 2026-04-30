<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';

	let { data } = $props();

	const hasEmail = $derived(data.providers.includes('resend'));
	const oauthProviders = $derived(
		[
			{ id: 'google', label: 'Google' },
			{ id: 'microsoft-entra-id', label: 'Microsoft' },
			{ id: 'github', label: 'GitHub' }
		].filter((p) => data.providers.includes(p.id))
	);
	const hasOauth = $derived(oauthProviders.length > 0);
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="bg-card text-card-foreground w-full max-w-sm rounded-lg border p-8 shadow-sm">
		<h1 class="text-2xl font-bold tracking-tight">App</h1>
		<p class="text-muted-foreground mt-1 text-sm">Sign in to continue</p>

		{#if hasEmail}
			<form method="POST" class="mt-6">
				<input type="hidden" name="providerId" value="resend" />
				<input type="hidden" name="redirectTo" value={data.redirectTo} />
				<Input type="email" name="email" placeholder="you@company.com" required class="mb-3" />
				<Button type="submit" class="w-full">Send magic link</Button>
			</form>
		{/if}

		{#if hasEmail && hasOauth}
			<div class="my-6 flex items-center gap-3">
				<div class="bg-border h-px flex-1"></div>
				<span class="text-muted-foreground text-xs">or</span>
				<div class="bg-border h-px flex-1"></div>
			</div>
		{/if}

		{#if hasOauth}
			<div class="{hasEmail ? '' : 'mt-6'} space-y-2">
				{#each oauthProviders as provider}
					<form method="POST">
						<input type="hidden" name="providerId" value={provider.id} />
						<input type="hidden" name="redirectTo" value={data.redirectTo} />
						<Button type="submit" variant="outline" class="w-full">
							Sign in with {provider.label}
						</Button>
					</form>
				{/each}
			</div>
		{/if}
	</div>
</div>
