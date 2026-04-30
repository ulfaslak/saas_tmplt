/**
 * Transactional email via Resend. Silently no-ops when AUTH_RESEND_KEY is unset
 * (e.g. local dev without email configured) — logs a warning so the developer
 * sees the intended recipient in the console instead.
 */
import { env } from '$env/dynamic/private';
import { Resend } from 'resend';
import { logger } from '$lib/server/logger';

const APP_NAME = env.APP_NAME ?? 'App';
const FROM_ADDRESS = env.EMAIL_FROM_ADDRESS ?? `${APP_NAME} <noreply@example.com>`;

type InviteEmailParams = {
	to: string;
	inviterName: string;
	orgName: string;
	roleLabel: string;
	inviteUrl: string;
	expiresInDays: number;
};

/** Send a team-invite email. Throws when Resend itself fails; no-ops silently when key is missing. */
export async function sendInviteEmail(params: InviteEmailParams): Promise<void> {
	if (!env.AUTH_RESEND_KEY) {
		logger.warn(
			{ to: params.to, inviteUrl: params.inviteUrl },
			'sendInviteEmail: AUTH_RESEND_KEY unset — skipping email send (log shows intended recipient and link).'
		);
		return;
	}

	const resend = new Resend(env.AUTH_RESEND_KEY);
	const subject = `${params.inviterName} invited you to join ${params.orgName} on ${APP_NAME}`;

	const { error } = await resend.emails.send({
		from: FROM_ADDRESS,
		to: params.to,
		subject,
		html: renderInviteHtml(params),
		text: renderInviteText(params)
	});

	if (error) {
		logger.error({ err: error, to: params.to }, 'sendInviteEmail: Resend returned error');
		throw new Error(`Failed to send invite email: ${error.message}`);
	}
}

function renderInviteText(p: InviteEmailParams): string {
	return [
		`${p.inviterName} invited you to join ${p.orgName} on ${APP_NAME}.`,
		`You've been assigned the role: ${p.roleLabel}.`,
		'',
		`Accept the invite:`,
		p.inviteUrl,
		'',
		`This invite expires in ${p.expiresInDays} days. If you didn't expect this, you can ignore this email.`
	].join('\n');
}

function renderInviteHtml(p: InviteEmailParams): string {
	const escape = (s: string) =>
		s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	const inviter = escape(p.inviterName);
	const org = escape(p.orgName);
	const role = escape(p.roleLabel);
	const url = escape(p.inviteUrl);
	const app = escape(APP_NAME);

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>You're invited to join ${org} on ${app}</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#1c1917;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f4f4;padding:48px 16px;">
	<tr>
		<td align="center">
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background-color:#ffffff;border:1px solid #e6e6e6;border-radius:12px;">
				<tr><td style="padding:32px 32px 8px;">
					<div style="font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#78716c;">${app}</div>
				</td></tr>
				<tr><td style="padding:8px 32px 0;">
					<h1 style="margin:0;font-weight:500;font-size:24px;line-height:1.25;color:#1c1917;">
						${inviter} invited you to join ${org}
					</h1>
				</td></tr>
				<tr><td style="padding:20px 32px 0;font-size:15px;line-height:1.55;color:#1c1917;">
					<p style="margin:0 0 8px;">You've been assigned the role:</p>
					<p style="margin:0;font-weight:600;">${role}</p>
				</td></tr>
				<tr><td style="padding:28px 32px 0;">
					<a href="${url}" style="display:inline-block;background-color:#1c1917;color:#ffffff;text-decoration:none;font-weight:500;font-size:15px;padding:12px 22px;border-radius:6px;">Accept invite</a>
				</td></tr>
				<tr><td style="padding:24px 32px 0;font-size:13px;line-height:1.5;color:#78716c;">
					<p style="margin:0 0 12px;">Or open this link in your browser:</p>
					<p style="margin:0;word-break:break-all;"><a href="${url}" style="color:#78716c;text-decoration:underline;">${url}</a></p>
				</td></tr>
				<tr><td style="padding:28px 32px 32px;font-size:12px;line-height:1.5;color:#78716c;border-top:1px solid #e6e6e6;margin-top:24px;">
					<p style="margin:24px 0 0;">This invite expires in ${p.expiresInDays} days. If you didn't expect this, you can ignore this email.</p>
				</td></tr>
			</table>
		</td>
	</tr>
</table>
</body>
</html>`;
}
