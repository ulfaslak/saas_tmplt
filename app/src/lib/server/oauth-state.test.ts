import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('$env/dynamic/private', () => ({
	env: { AUTH_SECRET: 'test-secret-at-least-32-chars-long!' }
}));

import { createState, verifyState } from './oauth-state';

describe('oauth-state', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('createState / verifyState roundtrip', () => {
		it('roundtrips successfully', () => {
			const state = createState('org-123');
			const result = verifyState(state);
			expect(result).toEqual({ orgId: 'org-123' });
		});

		it('state contains a dot separator', () => {
			const state = createState('org-123');
			expect(state).toContain('.');
		});
	});

	describe('verifyState error cases', () => {
		it('throws on tampered signature', () => {
			const state = createState('org-123');
			const dotIndex = state.indexOf('.');
			const payload = state.slice(0, dotIndex);
			const tamperedState = `${payload}.tampered-signature`;
			expect(() => verifyState(tamperedState)).toThrow('invalid state signature');
		});

		it('throws on tampered payload', () => {
			const state = createState('org-123');
			const dotIndex = state.indexOf('.');
			const signature = state.slice(dotIndex + 1);
			const tamperedPayload = Buffer.from(JSON.stringify({ orgId: 'org-999', exp: Date.now() + 600000 })).toString('base64url');
			const tamperedState = `${tamperedPayload}.${signature}`;
			expect(() => verifyState(tamperedState)).toThrow('invalid state signature');
		});

		it('throws on malformed state (no dot)', () => {
			expect(() => verifyState('nodothere')).toThrow('malformed state');
		});

		it('throws on expired state', () => {
			vi.useFakeTimers();
			const state = createState('org-123');
			vi.advanceTimersByTime(11 * 60 * 1000);
			expect(() => verifyState(state)).toThrow('state expired');
			vi.useRealTimers();
		});
	});
});
