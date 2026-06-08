import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('mobster analytics events', () => {
	it('tracks add and remove counts without mobster names', () => {
		const component = readFileSync(new URL('./Mobsters.svelte', import.meta.url), 'utf8');

		assert.match(component, /trackAnalyticsEvent\('mobster_add',\s*\{\s*mobster_count:/);
		assert.match(component, /trackAnalyticsEvent\('mobster_remove',\s*\{\s*mobster_count:/);
		assert.doesNotMatch(component, /trackAnalyticsEvent\([^)]*name/i);
	});
});
