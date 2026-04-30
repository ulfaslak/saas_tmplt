<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { ROLE_LABELS, type Role } from '$lib/permissions';

	let { data, form } = $props();
	let accepting = $state(false);
</script>

<div class="flex min-h-screen items-center justify-center px-4">
	<div class="bg-card text-card-foreground w-full max-w-md rounded-lg border p-8 shadow-sm">
		<h1 class="text-2xl font-bold tracking-tight">App</h1>

		{#if data.state.kind === 'acceptable'}
			<p class="text-muted-foreground mt-1 text-sm">You've been invited to join</p>
			<p class="mt-1 text-2xl">{data.state.orgName}</p>
			<p class="mt-4 text-sm">
				Assigned role:
				<span class="font-medium">{ROLE_LABELS[data.state.role as Role] ?? data.state.role}</span>
			</p>
			<p class="text-muted-foreground mt-1 text-xs">
				Invite sent to {data.state.email}.
				{#if data.userEmail && data.userEmail.toLowerCase() !== data.state.email.toLowerCase()}
					You're signed in as {data.userEmail}.
				{/if}
			</p>

			{#if form?.error}
				<p class="text-destructive mt-4 text-sm">{form.error}</p>
			{/if}

			<form
				method="POST"
				action="?/accept"
				class="mt-6"
				use:enhance={() => {
					accepting = true;
					return async ({ update }) => {
						await update();
						accepting = false;
					};
				}}
			>
				<Button type="submit" class="w-full" disabled={accepting}>
					{accepting ? 'Joining...' : 'Accept invite'}
				</Button>
			</form>
		{:else if data.state.kind === 'alreadyMemberHere'}
			<p class="text-muted-foreground mt-1 text-sm">
				You're already a member of <strong>{data.state.orgName}</strong>.
			</p>
			<Button href="/" class="mt-6 w-full">Go to dashboard</Button>
		{:else if data.state.kind === 'alreadyInOtherOrg'}
			<p class="text-muted-foreground mt-1 text-sm">Can't accept this invite</p>
			<p class="mt-4 text-sm">
				You already belong to <strong>{data.state.otherOrgName}</strong>. This app supports one
				organization per user, so you can't also join
				<strong>{data.state.inviteOrgName}</strong>.
			</p>
			<p class="text-muted-foreground mt-3 text-sm">
				Sign out and use a different account, or ask your admin to remove you before accepting.
			</p>
			<Button href="/" variant="outline" class="mt-6 w-full">Continue to dashboard</Button>
		{:else if data.state.kind === 'revoked'}
			<p class="text-muted-foreground mt-1 text-sm">This invite has been revoked</p>
			<p class="mt-4 text-sm">
				The admin for <strong>{data.state.orgName}</strong> revoked this invite. Ask them to send you a
				new one.
			</p>
		{:else if data.state.kind === 'expired'}
			<p class="text-muted-foreground mt-1 text-sm">This invite has expired</p>
			<p class="mt-4 text-sm">
				Ask the admin for <strong>{data.state.orgName}</strong> to resend it.
			</p>
		{:else if data.state.kind === 'usedByOther'}
			<p class="text-muted-foreground mt-1 text-sm">This invite has already been used</p>
			<p class="mt-4 text-sm">
				Someone else has already accepted this invite for <strong>{data.state.orgName}</strong>. Ask
				the admin to send you a new one.
			</p>
		{:else}
			<p class="text-muted-foreground mt-1 text-sm">Invite not found</p>
			<p class="mt-4 text-sm">
				This invite link is invalid. Double-check the link, or ask the admin to resend it.
			</p>
		{/if}
	</div>
</div>
