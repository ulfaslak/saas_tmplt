<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex flex-col items-center justify-center py-24 text-center">
	<h1 class="font-serif text-3xl font-bold tracking-tight">Something went wrong</h1>
	<p class="mt-3 max-w-md text-muted-foreground">
		{$page.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<div class="mt-6">
		<Button href="/">Go to dashboard</Button>
	</div>
</div>
