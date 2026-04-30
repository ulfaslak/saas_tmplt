/**
 * Register pg-boss job handlers at queue startup.
 *
 * Add handlers as you build them. The queue is started by `hooks.server.ts`,
 * which calls this function once after the queue is up.
 *
 * Pattern:
 *
 *   import { getBoss } from '$lib/server/queue';
 *   import { handleFoo } from './foo';
 *
 *   export async function registerHandlers() {
 *     const boss = getBoss();
 *     await boss.work('foo.do-thing', handleFoo);
 *   }
 */
export async function registerHandlers(): Promise<void> {
	// No handlers registered yet. Add them here as you build features.
}
