<script lang="ts">
	import { Button } from '$lib/components/ui/button';
</script>

<div class="flex min-h-screen items-center justify-center">
	<div class="bg-card text-card-foreground w-full max-w-sm rounded-lg border p-8 shadow-sm">
		<h1 class="font-serif text-2xl font-bold tracking-tight">Check your email</h1>
		<p class="text-muted-foreground mt-2 text-sm">
			We sent you a sign-in link. Click the link in your email to continue.
		</p>
		<p class="text-muted-foreground mt-4 text-sm">You can close this tab after signing in.</p>
		<a href="/login" class="mt-6 block">
			<Button variant="outline" class="w-full">Back to sign in</Button>
		</a>
	</div>
</div>
