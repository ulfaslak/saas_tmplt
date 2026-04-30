<script lang="ts">
	import { enhance } from '$app/forms';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { timeAgo } from '$lib/utils';
	import { canChangeRole, type Role, ROLE_LABELS } from '$lib/permissions';

	let { data, form } = $props();

	let removingMemberId = $state<string | null>(null);
	let revokingId = $state<string | null>(null);
	let resendingId = $state<string | null>(null);
	let removingInviteId = $state<string | null>(null);
	let creatingInvite = $state(false);
	let inviteEmail = $state('');
	let inviteRole = $state('');
	let changingRoleId = $state<string | null>(null);

	// Clear the create-form on successful send.
	$effect(() => {
		if (form?.sent) {
			inviteEmail = '';
			inviteRole = '';
		}
	});

	const visibleInvites = $derived(
		data.invites.filter((inv) => inv.status !== 'accepted')
	);

	function statusVariant(status: string): 'outline' | 'secondary' {
		return status === 'pending' ? 'outline' : 'secondary';
	}

	function statusLabel(status: string): string {
		return status.charAt(0).toUpperCase() + status.slice(1);
	}
</script>

<div>
	<h1 class="font-serif text-3xl font-light">Team</h1>
	<p class="text-muted-foreground mt-1">Manage members and invite new users.</p>
</div>

{#if form?.error}
	<p class="text-destructive mt-4 text-sm">{form.error}</p>
{/if}

{#if form?.sent}
	<p class="mt-4 text-sm text-emerald-700">Invite sent to {form.email}.</p>
{/if}

<div class="mt-6 max-w-3xl space-y-10">
	<section>
		<h2 class="text-base font-medium">Members</h2>
		<div class="mt-4 space-y-3">
			{#each data.members as member (member.id)}
				<div class="flex items-center gap-3 rounded-md border px-4 py-3">
					{#if member.image}
						<img src={member.image} alt="" class="size-8 shrink-0 rounded-full" />
					{:else}
						<div
							class="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-medium"
						>
							{member.name?.[0]?.toUpperCase() ?? '?'}
						</div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium">
							{member.name ?? 'Unknown'}
							{#if member.userId === data.currentUserId}
								<span class="text-muted-foreground font-normal">(you)</span>
							{/if}
						</p>
						<p class="text-muted-foreground truncate text-xs">{member.email ?? ''}</p>
					</div>
					{#if data.canManage && member.userId !== data.currentUserId && canChangeRole(data.currentRole, member.role as Role)}
						<form
							method="POST"
							action="?/changeRole"
							use:enhance={() => {
								changingRoleId = member.id;
								return async ({ update }) => {
									await update();
									changingRoleId = null;
								};
							}}
						>
							<input type="hidden" name="membershipId" value={member.id} />
							<select
								name="role"
								class="bg-background h-8 rounded-md border px-2 text-xs"
								value={member.role}
								onchange={(e) => e.currentTarget.form?.requestSubmit()}
								disabled={changingRoleId === member.id}
							>
								{#each data.invitableRoles as r}
									<option value={r} selected={r === member.role}>{ROLE_LABELS[r]}</option>
								{/each}
							</select>
						</form>
					{:else}
						<Badge variant="outline" class="shrink-0">
							{ROLE_LABELS[member.role as Role] ?? member.role}
						</Badge>
					{/if}
					<span class="text-muted-foreground shrink-0 text-xs">{timeAgo(member.createdAt)}</span>
					{#if data.canManage && member.userId !== data.currentUserId && canChangeRole(data.currentRole, member.role as Role)}
						<form
							method="POST"
							action="?/removeMember"
							use:enhance={() => {
								removingMemberId = member.id;
								return async ({ update }) => {
									await update();
									removingMemberId = null;
								};
							}}
						>
							<input type="hidden" name="membershipId" value={member.id} />
							<Button
								type="submit"
								variant="ghost"
								size="sm"
								class="text-destructive shrink-0"
								disabled={removingMemberId === member.id}
							>
								{removingMemberId === member.id ? 'Removing...' : 'Remove'}
							</Button>
						</form>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	{#if data.canManage}
		<section>
			<h2 class="text-base font-medium">Invites</h2>
			<p class="text-muted-foreground mt-1 text-sm">
				Send an email invite. The recipient gets a link to join, valid for 7 days.
			</p>

			<form
				method="POST"
				action="?/createInvite"
				use:enhance={() => {
					creatingInvite = true;
					return async ({ update }) => {
						await update();
						creatingInvite = false;
					};
				}}
				class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
			>
				<Input
					type="email"
					name="email"
					placeholder="teammate@company.com"
					bind:value={inviteEmail}
					required
					class="sm:flex-1"
				/>
				<select
					name="role"
					class="bg-background h-9 rounded-md border px-3 text-sm"
					bind:value={inviteRole}
					required
				>
					<option value="" disabled>Select role...</option>
					{#each data.invitableRoles as r}
						<option value={r}>{ROLE_LABELS[r]}</option>
					{/each}
				</select>
				<Button type="submit" disabled={creatingInvite || !inviteEmail || !inviteRole}>
					{creatingInvite ? 'Sending...' : 'Send invite'}
				</Button>
			</form>

			{#if visibleInvites.length === 0}
				<p class="text-muted-foreground mt-4 text-sm">No pending invites.</p>
			{:else}
				<div class="mt-4 space-y-3">
					{#each visibleInvites as invite (invite.id)}
						<div class="flex items-center gap-3 rounded-md border px-4 py-3">
							<div class="min-w-0 flex-1">
								<p class="truncate text-sm font-medium">{invite.email}</p>
								<p class="text-muted-foreground truncate text-xs">
									Invited by {invite.createdByName ?? '—'} · {timeAgo(invite.createdAt)}
								</p>
							</div>
							<Badge variant="outline" class="shrink-0">
								{ROLE_LABELS[invite.role as Role] ?? invite.role}
							</Badge>
							<Badge variant={statusVariant(invite.status)} class="shrink-0">
								{statusLabel(invite.status)}
							</Badge>
							{#if invite.status === 'pending'}
								<form
									method="POST"
									action="?/revokeInvite"
									use:enhance={() => {
										revokingId = invite.id;
										return async ({ update }) => {
											await update();
											revokingId = null;
										};
									}}
								>
									<input type="hidden" name="inviteId" value={invite.id} />
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										class="text-destructive shrink-0"
										disabled={revokingId === invite.id}
									>
										{revokingId === invite.id ? 'Revoking...' : 'Revoke'}
									</Button>
								</form>
							{:else}
								<form
									method="POST"
									action="?/resendInvite"
									use:enhance={() => {
										resendingId = invite.id;
										return async ({ update }) => {
											await update();
											resendingId = null;
										};
									}}
								>
									<input type="hidden" name="inviteId" value={invite.id} />
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										class="shrink-0"
										disabled={resendingId === invite.id}
									>
										{resendingId === invite.id ? 'Resending...' : 'Resend'}
									</Button>
								</form>
								<form
									method="POST"
									action="?/removeInvite"
									use:enhance={() => {
										removingInviteId = invite.id;
										return async ({ update }) => {
											await update();
											removingInviteId = null;
										};
									}}
								>
									<input type="hidden" name="inviteId" value={invite.id} />
									<Button
										type="submit"
										variant="ghost"
										size="sm"
										class="text-muted-foreground shrink-0"
										disabled={removingInviteId === invite.id}
									>
										{removingInviteId === invite.id ? 'Removing...' : 'Remove'}
									</Button>
								</form>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</section>
	{/if}
</div>
