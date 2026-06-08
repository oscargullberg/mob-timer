import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getUmamiConfig, trackAnalyticsEvent } from './analytics.ts';

describe('umami analytics config', () => {
	it('stays disabled without a website id', () => {
		assert.equal(getUmamiConfig(undefined, undefined), undefined);
		assert.equal(getUmamiConfig('', undefined), undefined);
	});

	it('uses the cloud script by default when a website id is configured', () => {
		assert.deepEqual(getUmamiConfig('website-123', undefined), {
			scriptUrl: 'https://cloud.umami.is/script.js',
			websiteId: 'website-123'
		});
	});

	it('uses a custom script URL for self-hosted Umami', () => {
		assert.deepEqual(getUmamiConfig('website-123', 'https://stats.example.com/script.js'), {
			scriptUrl: 'https://stats.example.com/script.js',
			websiteId: 'website-123'
		});
	});
});

describe('umami event tracking', () => {
	it('does nothing when the tracker is unavailable', () => {
		withWindow(undefined, () => {
			assert.doesNotThrow(() => trackAnalyticsEvent('timer_start'));
		});
	});

	it('tracks an event with optional data when Umami is available', () => {
		const calls: unknown[][] = [];

		withWindow(
			{
				umami: {
					track(...args: unknown[]) {
						calls.push(args);
					}
				}
			},
			() => {
				trackAnalyticsEvent('timer_start', { duration_minutes: 15 });
			}
		);

		assert.deepEqual(calls, [['timer_start', { duration_minutes: 15 }]]);
	});

	it('does not let tracking failures break app behavior', () => {
		withWindow(
			{
				umami: {
					track() {
						throw new Error('blocked');
					}
				}
			},
			() => {
				assert.doesNotThrow(() => trackAnalyticsEvent('timer_start'));
			}
		);
	});
});

function withWindow(value: unknown | undefined, run: () => void) {
	const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');

	if (value === undefined) {
		delete (globalThis as { window?: unknown }).window;
	} else {
		Object.defineProperty(globalThis, 'window', {
			configurable: true,
			value,
			writable: true
		});
	}

	try {
		run();
	} finally {
		if (previous) {
			Object.defineProperty(globalThis, 'window', previous);
		} else {
			delete (globalThis as { window?: unknown }).window;
		}
	}
}
