import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('timer ooze animation', () => {
	it('keeps the falling blob opaque until it reaches the lower pool', () => {
		const component = readFileSync(new URL('./Timer.svelte', import.meta.url), 'utf8');
		const contactFrame = component.match(/88%\s*\{(?<body>[^}]*)\}/)?.groups?.body;

		assert.ok(contactFrame);
		assert.match(contactFrame, /opacity:\s*var\(--drop-opacity\);/);
	});
});

describe('timer analytics events', () => {
	it('tracks core timer usage without user-entered data', () => {
		const component = readFileSync(new URL('./Timer.svelte', import.meta.url), 'utf8');

		assert.match(component, /trackAnalyticsEvent\('timer_start',\s*\{\s*duration_minutes:/);
		assert.match(component, /trackAnalyticsEvent\('timer_stop',\s*\{\s*duration_minutes:/);
		assert.match(component, /trackAnalyticsEvent\('timer_reset',\s*\{/);
		assert.match(component, /was_running:/);
		assert.match(
			component,
			/trackAnalyticsEvent\('duration_change',\s*\{\s*duration_minutes:\s*minutes/
		);
	});
});
