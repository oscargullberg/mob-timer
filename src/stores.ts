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

const mobstersKey = 'mobsters';
const timerConfigKey = 'timerConfig';
const defaultTurnDurationMinutes = 15;
const defaultTimerConfig = {
	running: false,
	initialSeconds: defaultTurnDurationMinutes * 60
};

const storedMobsters = localStorage.getItem(mobstersKey);
const initialMobsters = storedMobsters ? JSON.parse(storedMobsters) : [];
const storedTimerConfig = localStorage.getItem(timerConfigKey);
const initialTimerConfig = storedTimerConfig ? JSON.parse(storedTimerConfig) : defaultTimerConfig;

export const timerConfig = writable<TimerConfig>(initialTimerConfig);
export const timer = writable<number>(initialTimerConfig.initialSeconds);
export const mobsters = createMobsterStore(initialMobsters);
export const broadcast = writable<BroadcastState>({
	lastChange: 0
});
export const remaining = derived(timer, ($seconds) => ({
	minutes: Math.floor($seconds / 60)
		.toString()
		.padStart(2, '0'),
	seconds: Math.floor($seconds % 60)
		.toString()
		.padStart(2, '0')
}));
export const activeMobster = derived(mobsters, ($mobsters) => $mobsters.find((m) => m.active));

mobsters.subscribe((m) => {
	if (m) {
		localStorage.setItem(mobstersKey, JSON.stringify(m));
	}
});
timerConfig.subscribe((t) => {
	if (t) {
		localStorage.setItem(timerConfigKey, JSON.stringify(t));
	}
});

function createMobsterStore(value: Mobster[]) {
	const { subscribe, set, update } = writable<Mobster[]>(value);
	return {
		subscribe,
		set,
		update,
		changeMobster: () =>
			update((mobsters) => {
				const activeI = mobsters.findIndex((m) => m.active);
				const newActiveI = activeI >= 0 ? (activeI + 1) % mobsters.length : 0;
				return mobsters.map((m, index) => ({
					...m,
					active: index === newActiveI
				}));
			})
	};
}
