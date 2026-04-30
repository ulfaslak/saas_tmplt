/**
 * Generate a URL-safe slug from an arbitrary string.
 *
 * Lowercases, replaces non-alphanumeric runs with single hyphens, trims
 * leading/trailing hyphens, and caps the length. The caller is responsible
 * for collision checks against the target table — this function only produces
 * a candidate.
 */
export function generateSlug(input: string, maxLength = 50): string {
	const slug = input
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, maxLength)
		.replace(/-+$/, '');
	return slug || 'org';
}

/** Returns true if the string is a valid lowercase, hyphenated slug under maxLength. */
export function isValidSlug(input: string, maxLength = 50): boolean {
	if (!input || input.length > maxLength) return false;
	return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(input);
}
