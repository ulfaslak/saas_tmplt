<script lang="ts">
	import { page } from '$app/stores';
	import {
		SidebarProvider,
		Sidebar,
		SidebarHeader,
		SidebarContent,
		SidebarFooter,
		SidebarGroup,
		SidebarGroupContent,
		SidebarGroupLabel,
		SidebarMenu,
		SidebarMenuItem,
		SidebarMenuButton,
		SidebarInset,
		SidebarTrigger
	} from '$lib/components/ui/sidebar';
	import { Button } from '$lib/components/ui/button';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Building2 from '@lucide/svelte/icons/building-2';
	import Key from '@lucide/svelte/icons/key';
	import Users from '@lucide/svelte/icons/users';
	import UserCircle from '@lucide/svelte/icons/user-circle';
	import { canAccessRoute } from '$lib/permissions';

	let { children, data } = $props();
	let role = $derived(data.role);

	const allConnectionsItems = [{ title: 'API', href: '/connections/api', icon: Key }];

	const allSettingsItems = [
		{ title: 'Profile', href: '/settings/profile', icon: UserCircle },
		{ title: 'Organization', href: '/settings/organization', icon: Building2 },
		{ title: 'Team', href: '/settings/team', icon: Users }
	];

	let connectionsItems = $derived(allConnectionsItems.filter((i) => canAccessRoute(role, i.href)));
	let settingsItems = $derived(allSettingsItems.filter((i) => canAccessRoute(role, i.href)));

	function isActive(href: string): boolean {
		if (href === '/') return $page.url.pathname === '/';
		return $page.url.pathname.startsWith(href);
	}
</script>

<SidebarProvider>
	<Sidebar collapsible="icon">
		<SidebarHeader class="px-4 py-5">
			<a href="/" class="text-lg font-semibold">App</a>
		</SidebarHeader>
		<SidebarContent>
			{#if connectionsItems.length > 0}
				<SidebarGroup>
					<SidebarGroupLabel>Connections</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{#each connectionsItems as item (item.href)}
								<SidebarMenuItem>
									<SidebarMenuButton isActive={isActive(item.href)} tooltipContent={item.title}>
										{#snippet child({ props })}
											<a href={item.href} {...props}>
												<item.icon class="size-4" />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</SidebarMenuButton>
								</SidebarMenuItem>
							{/each}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			{/if}
			{#if settingsItems.length > 0}
				<hr class="mx-4 h-px border-0 bg-border" />
				<SidebarGroup>
					<SidebarGroupLabel>Settings</SidebarGroupLabel>
					<SidebarGroupContent>
						<SidebarMenu>
							{#each settingsItems as item (item.href)}
								<SidebarMenuItem>
									<SidebarMenuButton isActive={isActive(item.href)} tooltipContent={item.title}>
										{#snippet child({ props })}
											<a href={item.href} {...props}>
												<item.icon class="size-4" />
												<span>{item.title}</span>
											</a>
										{/snippet}
									</SidebarMenuButton>
								</SidebarMenuItem>
							{/each}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			{/if}
		</SidebarContent>
		<SidebarFooter class="border-t px-4 py-3">
			<div class="flex items-center gap-3">
				{#if data.session?.user?.image}
					<img src={data.session.user.image} alt="" class="size-8 shrink-0 rounded-full" />
				{:else}
					<div
						class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
					>
						{data.session?.user?.name?.[0]?.toUpperCase() ?? '?'}
					</div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium">{data.session?.user?.name ?? 'User'}</p>
					<p class="truncate text-xs text-muted-foreground">
						{data.session?.user?.email ?? ''}
					</p>
				</div>
				<form method="POST" action="/signout">
					<Button type="submit" variant="ghost" size="icon-sm" class="shrink-0" aria-label="Sign out">
						<LogOut class="size-4" />
					</Button>
				</form>
			</div>
		</SidebarFooter>
	</Sidebar>
	<SidebarInset>
		<SidebarTrigger class="absolute top-4 left-4 z-30" />
		<div class="mx-auto w-full max-w-[80%] px-6 py-8">
			{@render children()}
		</div>
	</SidebarInset>
</SidebarProvider>
