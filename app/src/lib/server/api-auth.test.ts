import { describe, it, expect } from 'vitest';

import { hashKey } from './api-auth';

describe('hashKey', () => {
	it('is deterministic', async () => {
		const a = await hashKey('test-key');
		const b = await hashKey('test-key');
		expect(a).toBe(b);
	});

	it('returns a 64-character hex string', async () => {
		const result = await hashKey('test-key');
		expect(result).toMatch(/^[0-9a-f]{64}$/);
	});

	it('produces the known SHA-256 of empty string', async () => {
		const result = await hashKey('');
		expect(result).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
	});
});
