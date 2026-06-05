import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	createDefaultTimerConfig,
	createMobster,
	createMobsterId,
	createRoomId,
	formatRemaining,
	normalizeMobsters,
	normalizeTimerConfig,
	parseStoredMobsters,
	parseStoredTimerConfig,
	removeMobster,
	rotateActiveMobster,
	sanitizeDurationMinutes,
	setActiveMobster
} from './state.ts';

describe('stored mobsters', () => {
	it('falls back to an empty list when stored JSON is invalid', () => {
		assert.deepEqual(parseStoredMobsters('not json'), []);
	});

	it('keeps only valid mobsters and ensures one active mobster', () => {
		const mobsters = normalizeMobsters([
			{ id: 'a', name: 'Ada', active: false },
			{ id: 'b', name: 'Bob', active: true },
			{ id: 'c', name: 'Carla', active: true },
			{ id: '', name: 'No id', active: true },
			{ id: 'd', name: '   ', active: false }
		]);

		assert.deepEqual(mobsters, [
			{ id: 'a', name: 'Ada', active: false },
			{ id: 'b', name: 'Bob', active: true },
			{ id: 'c', name: 'Carla', active: false }
		]);
	});

	it('activates the first mobster when stored data has no active mobster', () => {
		assert.deepEqual(
			normalizeMobsters([
				{ id: 'a', name: 'Ada', active: false },
				{ id: 'b', name: 'Bob', active: false }
			]),
			[
				{ id: 'a', name: 'Ada', active: true },
				{ id: 'b', name: 'Bob', active: false }
			]
		);
	});
});

describe('stored timer config', () => {
	it('falls back to defaults when stored JSON is invalid', () => {
		assert.deepEqual(parseStoredTimerConfig('{'), createDefaultTimerConfig());
	});

	it('normalizes invalid durations and always restores a paused timer', () => {
		assert.deepEqual(normalizeTimerConfig({ running: true, initialSeconds: -10 }), {
			running: false,
			initialSeconds: 15 * 60
		});
	});
});

describe('timer state helpers', () => {
	it('clamps duration input to the supported range', () => {
		assert.equal(sanitizeDurationMinutes(''), 1);
		assert.equal(sanitizeDurationMinutes('0'), 1);
		assert.equal(sanitizeDurationMinutes('120'), 99);
		assert.equal(sanitizeDurationMinutes('8'), 8);
	});

	it('formats negative or invalid remaining time as zero', () => {
		assert.deepEqual(formatRemaining(-1), { minutes: '00', seconds: '00' });
		assert.deepEqual(formatRemaining(Number.NaN), { minutes: '00', seconds: '00' });
	});

	it('rotates the active mobster without mutating the original list', () => {
		const original = [
			{ id: 'a', name: 'Ada', active: true },
			{ id: 'b', name: 'Bob', active: false }
		];

		assert.deepEqual(rotateActiveMobster(original), [
			{ id: 'a', name: 'Ada', active: false },
			{ id: 'b', name: 'Bob', active: true }
		]);
		assert.equal(original[0].active, true);
	});
});

describe('mobster state helpers', () => {
	it('creates mobsters with trimmed names and a generated id', () => {
		assert.deepEqual(createMobster('  Ada  ', true, 'mobster-a'), {
			id: 'mobster-a',
			name: 'Ada',
			active: true
		});
	});

	it('generates unique fallback ids when random UUIDs are unavailable', () => {
		assert.notEqual(
			createMobsterId(undefined, () => 1000),
			createMobsterId(undefined, () => 1000)
		);
	});

	it('keeps one active mobster when removing the active mobster', () => {
		assert.deepEqual(
			removeMobster(
				[
					{ id: 'a', name: 'Ada', active: true },
					{ id: 'b', name: 'Bob', active: false }
				],
				'a'
			),
			[{ id: 'b', name: 'Bob', active: true }]
		);
	});

	it('keeps the existing active mobster when activating an unknown id', () => {
		assert.deepEqual(
			setActiveMobster(
				[
					{ id: 'a', name: 'Ada', active: true },
					{ id: 'b', name: 'Bob', active: false }
				],
				'unknown'
			),
			[
				{ id: 'a', name: 'Ada', active: true },
				{ id: 'b', name: 'Bob', active: false }
			]
		);
	});
});

describe('room state helpers', () => {
	it('generates unique fallback room ids when random UUIDs are unavailable', () => {
		assert.notEqual(
			createRoomId(undefined, () => 1000),
			createRoomId(undefined, () => 1000)
		);
	});
});
