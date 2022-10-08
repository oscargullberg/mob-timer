import { writable, derived } from 'svelte/store';

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
export const remaining = derived(timer, ($seconds) => ({
	minutes: Math.floor($seconds / 60)
		.toString()
		.padStart(2, '0'),
	seconds: Math.floor($seconds % 60)
		.toString()
		.padStart(2, '0')
}));
export const mobsters = writable<Mobster[]>([]);
export const lastUpdateSource = writable<string | undefined>();
export const broadcast = writable<BroadcastState>({
	lastChange: 0
});
