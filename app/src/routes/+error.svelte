<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
	<h1 class="font-serif text-3xl font-bold tracking-tight text-foreground">Something went wrong</h1>
	<p class="mt-3 max-w-md text-muted-foreground">
		{$page.error?.message ?? 'An unexpected error occurred.'}
	</p>
	<div class="mt-6">
		<Button href="/">Go home</Button>
	</div>
</div>
