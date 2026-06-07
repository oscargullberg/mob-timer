import { browser } from '$app/environment';
import { writable, derived, readable } from 'svelte/store';
import {
	createDefaultTimerState,
	formatRemaining,
	getTimerProgress,
	getTimerRemainingSeconds,
	normalizeMobsters,
	parseStoredMobsters,
	parseStoredTimerState,
	rotateActiveMobster
} from './state';
import type { Mobster, TimerState } from './state';
import { readStoredItem, writeStoredJson } from './storage';

export type { Mobster, TimerState };

export type BroadcastState = {
	lastChange: number;
};

const mobstersKey = 'mobsters';
const timerStateKey = 'timerState';
const legacyTimerConfigKey = 'timerConfig';
const defaultTimerState = createDefaultTimerState();

const storedMobsters = browser ? readStoredItem(localStorage, mobstersKey) : null;
const initialMobsters = parseStoredMobsters(storedMobsters);
const storedTimerState = browser
	? (readStoredItem(localStorage, timerStateKey) ??
		readStoredItem(localStorage, legacyTimerConfigKey))
	: null;
const initialTimerState = storedTimerState
	? parseStoredTimerState(storedTimerState)
	: defaultTimerState;

const currentTime = readable(Date.now(), (set) => {
	if (!browser) {
		return;
	}

	const intervalId = window.setInterval(() => set(Date.now()), 250);
	return () => window.clearInterval(intervalId);
});

export const timerState = writable<TimerState>(initialTimerState);
export const timer = derived([timerState, currentTime], ([$timerState, $currentTime]) =>
	getTimerRemainingSeconds($timerState, $currentTime)
);
export const timerProgress = derived([timerState, timer], ([$timerState, $timer]) =>
	getTimerProgress({ initialSeconds: $timerState.initialSeconds, remainingSeconds: $timer })
);
export const mobsters = createMobsterStore(initialMobsters);
export const broadcast = writable<BroadcastState>({
	lastChange: 0
});
export const isMainPeer = writable(false);
export const remaining = derived(timer, formatRemaining);
export const activeMobster = derived(mobsters, ($mobsters) => $mobsters.find((m) => m.active));

if (browser) {
	mobsters.subscribe((m) => {
		if (m) {
			writeStoredJson(localStorage, mobstersKey, normalizeMobsters(m));
		}
	});
	timerState.subscribe((t) => {
		if (t) {
			writeStoredJson(localStorage, timerStateKey, t);
		}
	});
}

function createMobsterStore(value: Mobster[]) {
	const { subscribe, set, update } = writable<Mobster[]>(value);
	return {
		subscribe,
		set,
		update,
		changeMobster: () =>
			update((mobsters) => {
				return rotateActiveMobster(mobsters);
			})
	};
}
