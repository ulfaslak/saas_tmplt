import { dev } from '$app/environment';
import { SvelteKitAuth } from '@auth/sveltekit';
import type { Provider } from '@auth/sveltekit/providers';
import Google from '@auth/sveltekit/providers/google';
import MicrosoftEntraID from '@auth/sveltekit/providers/microsoft-entra-id';
import GitHub from '@auth/sveltekit/providers/github';
import Resend from '@auth/sveltekit/providers/resend';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { users, accounts, sessions, verificationTokens } from '$lib/server/db/schema';

/** Auth.js requires at least 32 chars. Used only when `vite dev` runs without `AUTH_SECRET` set. */
const DEV_AUTH_SECRET_FALLBACK =
	'template-local-vite-dev-only-do-not-use-in-production-32';

const authSecret =
	typeof env.AUTH_SECRET === 'string' && env.AUTH_SECRET.trim().length > 0
		? env.AUTH_SECRET.trim()
		: dev
			? DEV_AUTH_SECRET_FALLBACK
			: undefined;

const providers: Provider[] = [];
if (env.AUTH_GOOGLE_ID) providers.push(Google({ allowDangerousEmailAccountLinking: true }));
if (env.AUTH_MICROSOFT_ENTRA_ID_ID)
	providers.push(
		MicrosoftEntraID({
			allowDangerousEmailAccountLinking: true,
			issuer: 'https://login.microsoftonline.com/common/v2.0'
		})
	);
if (env.AUTH_GITHUB_ID) providers.push(GitHub({ allowDangerousEmailAccountLinking: true }));
if (env.AUTH_RESEND_KEY) {
	const from = env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com';
	providers.push(Resend({ from }));
}

export const { handle, signIn, signOut } = SvelteKitAuth({
	secret: authSecret,
	trustHost: true,
	adapter: DrizzleAdapter(db, {
		usersTable: users,
		accountsTable: accounts,
		sessionsTable: sessions,
		verificationTokensTable: verificationTokens
	}),
	providers,
	pages: {
		verifyRequest: '/login/verify'
	},
	callbacks: {
		session({ session, user }) {
			session.user.id = user.id;
			return session;
		}
	}
});
