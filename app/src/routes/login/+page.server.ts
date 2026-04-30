import { redirect } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { signIn } from '../../auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	const redirectTo = event.url.searchParams.get('redirectTo') || '/';
	if (session?.user) throw redirect(303, redirectTo);

	const providers: string[] = [];
	if (env.AUTH_GOOGLE_ID) providers.push('google');
	if (env.AUTH_MICROSOFT_ENTRA_ID_ID) providers.push('microsoft-entra-id');
	if (env.AUTH_GITHUB_ID) providers.push('github');
	if (env.AUTH_RESEND_KEY) providers.push('resend');

	return { providers, redirectTo };
};

export const actions: Actions = { default: signIn };
