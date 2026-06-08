import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('room analytics events', () => {
	it('tracks completed turns from the existing turn-finished flow', () => {
		const page = readFileSync(new URL('./[roomId]/+page.svelte', import.meta.url), 'utf8');

		assert.match(page, /trackAnalyticsEvent\('timer_finished',\s*\{\s*duration_minutes:/);
		assert.doesNotMatch(page, /trackAnalyticsEvent\([^)]*roomId/);
	});
});
