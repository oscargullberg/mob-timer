import { writable } from 'svelte/store';

export type TimerConfig = {
	running: boolean;
	initialSeconds: number;
};
export type Mobster = {
	id: string;
	name: string;
	active: boolean;
};

export type BroadcastState = {
	lastChange: number;
};

const defaultTurnDurationMinutes = 15;
const defaultTimerConfig = {
	running: false,
	initialSeconds: defaultTurnDurationMinutes * 60
};

export const timerConfig = writable<TimerConfig>(defaultTimerConfig);
export const timer = writable<number>(defaultTurnDurationMinutes * 60);
export const mobsters = writable<Mobster[]>([]);
export const lastUpdateSource = writable<string | undefined>();
export const broadcast = writable<BroadcastState>({
	lastChange: 0
});
