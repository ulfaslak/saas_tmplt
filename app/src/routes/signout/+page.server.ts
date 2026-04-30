/**
 * Sign-out page — delegates to the Auth.js sign-out handler as a form action.
 */
import { signOut } from '../../auth';
import type { Actions } from './$types';

export const actions: Actions = { default: signOut };
