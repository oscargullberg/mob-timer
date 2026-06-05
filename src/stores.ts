import { browser } from '$app/environment';
import { writable, derived } from 'svelte/store';
import {
	createDefaultTimerConfig,
	formatRemaining,
	normalizeMobsters,
	normalizeTimerConfig,
	parseStoredMobsters,
	parseStoredTimerConfig,
	rotateActiveMobster
} from './state';
import type { Mobster, TimerConfig } from './state';
import { readStoredItem, writeStoredJson } from './storage';

export type { Mobster, TimerConfig };

export type BroadcastState = {
	lastChange: number;
};

const mobstersKey = 'mobsters';
const timerConfigKey = 'timerConfig';
const defaultTimerConfig = createDefaultTimerConfig();

const storedMobsters = browser ? readStoredItem(localStorage, mobstersKey) : null;
const initialMobsters = parseStoredMobsters(storedMobsters);
const storedTimerConfig = browser ? readStoredItem(localStorage, timerConfigKey) : null;
const initialTimerConfig = storedTimerConfig
	? parseStoredTimerConfig(storedTimerConfig)
	: defaultTimerConfig;

export const timerConfig = writable<TimerConfig>(initialTimerConfig);
export const timer = writable<number>(initialTimerConfig.initialSeconds);
export const mobsters = createMobsterStore(initialMobsters);
export const broadcast = writable<BroadcastState>({
	lastChange: 0
});
export const remaining = derived(timer, formatRemaining);
export const activeMobster = derived(mobsters, ($mobsters) => $mobsters.find((m) => m.active));

if (browser) {
	mobsters.subscribe((m) => {
		if (m) {
			writeStoredJson(localStorage, mobstersKey, normalizeMobsters(m));
		}
	});
	timerConfig.subscribe((t) => {
		if (t) {
			writeStoredJson(localStorage, timerConfigKey, normalizeTimerConfig(t));
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
