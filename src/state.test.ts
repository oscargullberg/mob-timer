import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
	compareAppStateVersions,
	createDefaultTimerConfig,
	createDefaultTimerState,
	createMobster,
	createMobsterId,
	createRoomId,
	formatRemaining,
	getTimerRemainingSeconds,
	isSameOrNewerAppStateVersion,
	isNewerAppStateVersion,
	normalizeAppStateVersion,
	normalizeMobsters,
	normalizeSyncedTimerState,
	normalizeTimerConfig,
	normalizeStoredTimerState,
	pauseTimer,
	parseStoredMobsters,
	parseStoredTimerConfig,
	removeMobster,
	resetTimer,
	rotateActiveMobster,
	sanitizeDurationMinutes,
	setActiveMobster,
	setTimerDuration,
	shouldFinishTurn,
	snapshotTimerState,
	startTimer
} from './state.ts';

describe('app state versions', () => {
	it('orders snapshots by timestamp and origin peer id', () => {
		const current = { updatedAt: 1000, originPeerId: 'peer-a' };

		assert.equal(compareAppStateVersions({ updatedAt: 1001, originPeerId: 'peer-a' }, current), 1);
		assert.equal(compareAppStateVersions({ updatedAt: 999, originPeerId: 'peer-z' }, current), -1);
		assert.equal(compareAppStateVersions({ updatedAt: 1000, originPeerId: 'peer-b' }, current), 1);
		assert.equal(compareAppStateVersions({ updatedAt: 1000, originPeerId: 'peer-a' }, current), 0);
	});

	it('distinguishes newer proposals from duplicate canonical snapshots', () => {
		const current = { updatedAt: 1000, originPeerId: 'peer-a' };
		const duplicate = { updatedAt: 1000, originPeerId: 'peer-a' };

		assert.equal(isNewerAppStateVersion(duplicate, current), false);
		assert.equal(isSameOrNewerAppStateVersion(duplicate, current), true);
	});

	it('normalizes valid app state versions and rejects malformed versions', () => {
		assert.deepEqual(normalizeAppStateVersion({ updatedAt: 1000.9, originPeerId: ' peer-a ' }), {
			updatedAt: 1000,
			originPeerId: 'peer-a'
		});
		assert.equal(
			normalizeAppStateVersion({ updatedAt: Number.NaN, originPeerId: 'peer-a' }),
			undefined
		);
		assert.equal(normalizeAppStateVersion({ updatedAt: 1000, originPeerId: '' }), undefined);
	});
});

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

	it('restores stored running timer state as paused at the computed remaining seconds', () => {
		assert.deepEqual(
			normalizeStoredTimerState(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				3500
			),
			{
				running: false,
				initialSeconds: 600,
				remainingSeconds: 298,
				updatedAt: 3500
			}
		);
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

	it('derives remaining seconds from running timer state', () => {
		assert.equal(
			getTimerRemainingSeconds(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 590,
					updatedAt: 1000
				},
				6500
			),
			585
		);
	});

	it('preserves running state when normalizing synced timer state', () => {
		assert.deepEqual(
			normalizeSyncedTimerState({
				running: true,
				initialSeconds: 600,
				remainingSeconds: 590,
				updatedAt: 1000
			}),
			{
				running: true,
				initialSeconds: 600,
				remainingSeconds: 590,
				updatedAt: 1000
			}
		);
	});

	it('creates a default paused timer state', () => {
		assert.deepEqual(
			createDefaultTimerState(() => 1234),
			{
				running: false,
				initialSeconds: 15 * 60,
				remainingSeconds: 15 * 60,
				updatedAt: 1234
			}
		);
	});

	it('starts a paused timer without changing remaining seconds', () => {
		assert.deepEqual(
			startTimer(
				{
					running: false,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				2000
			),
			{
				running: true,
				initialSeconds: 600,
				remainingSeconds: 300,
				updatedAt: 2000
			}
		);
	});

	it('pauses a running timer at the computed remaining seconds', () => {
		assert.deepEqual(
			pauseTimer(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				3500
			),
			{
				running: false,
				initialSeconds: 600,
				remainingSeconds: 298,
				updatedAt: 3500
			}
		);
	});

	it('resets and changes timer duration as paused canonical state', () => {
		assert.deepEqual(
			resetTimer(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				4000
			),
			{
				running: false,
				initialSeconds: 600,
				remainingSeconds: 600,
				updatedAt: 4000
			}
		);

		assert.deepEqual(
			setTimerDuration(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				8,
				5000
			),
			{
				running: false,
				initialSeconds: 480,
				remainingSeconds: 480,
				updatedAt: 5000
			}
		);
	});

	it('allows only the leader to finish an expired turn', () => {
		const expiredTimer = {
			running: true,
			initialSeconds: 600,
			remainingSeconds: 1,
			updatedAt: 1000
		};

		assert.equal(shouldFinishTurn(expiredTimer, true, 3000), true);
		assert.equal(shouldFinishTurn(expiredTimer, false, 3000), false);
	});

	it('snapshots running timer state at the current remaining seconds', () => {
		assert.deepEqual(
			snapshotTimerState(
				{
					running: true,
					initialSeconds: 600,
					remainingSeconds: 300,
					updatedAt: 1000
				},
				3500
			),
			{
				running: true,
				initialSeconds: 600,
				remainingSeconds: 298,
				updatedAt: 3500
			}
		);
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
