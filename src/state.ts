export type TimerConfig = {
	running: boolean;
	initialSeconds: number;
};

export type TimerState = {
	initialSeconds: number;
	remainingSeconds: number;
	running: boolean;
	updatedAt: number;
};

export type AppStateVersion = {
	updatedAt: number;
	originPeerId: string;
};

export type Mobster = {
	id: string;
	name: string;
	active: boolean;
};

const defaultTurnDurationMinutes = 15;
const minTurnDurationMinutes = 1;
const maxTurnDurationMinutes = 99;
let fallbackMobsterIdSequence = 0;
let fallbackRoomIdSequence = 0;

export function createDefaultTimerConfig(): TimerConfig {
	return {
		running: false,
		initialSeconds: defaultTurnDurationMinutes * 60
	};
}

export function createDefaultTimerState(now = Date.now): TimerState {
	const initialSeconds = defaultTurnDurationMinutes * 60;

	return {
		running: false,
		initialSeconds,
		remainingSeconds: initialSeconds,
		updatedAt: now()
	};
}

export function parseStoredMobsters(value: string | null): Mobster[] {
	return normalizeMobsters(parseJson(value, []));
}

export function parseStoredTimerConfig(value: string | null): TimerConfig {
	return normalizeTimerConfig(parseJson(value, createDefaultTimerConfig()));
}

export function parseStoredTimerState(value: string | null): TimerState {
	return normalizeStoredTimerState(parseJson(value, createDefaultTimerState()));
}

export function normalizeMobsters(value: unknown): Mobster[] {
	if (!Array.isArray(value)) {
		return [];
	}

	let hasActiveMobster = false;
	const mobsters = value.filter(isMobsterLike).map((mobster) => {
		const active = mobster.active === true && !hasActiveMobster;
		hasActiveMobster ||= active;

		return {
			id: mobster.id,
			name: mobster.name.trim(),
			active
		};
	});

	if (!hasActiveMobster && mobsters.length) {
		return [{ ...mobsters[0], active: true }, ...mobsters.slice(1)];
	}

	return mobsters;
}

export function normalizeTimerConfig(value: unknown): TimerConfig {
	if (!isRecord(value)) {
		return createDefaultTimerConfig();
	}

	const minutes = Number(value.initialSeconds) / 60;
	if (!Number.isFinite(minutes) || minutes < minTurnDurationMinutes) {
		return createDefaultTimerConfig();
	}

	return {
		running: false,
		initialSeconds: secondsFromMinutes(minutes)
	};
}

export function normalizeStoredTimerState(value: unknown, now = Date.now()): TimerState {
	const timerState = normalizeTimerState(value);

	return {
		...timerState,
		running: false,
		remainingSeconds: getTimerRemainingSeconds(timerState, now),
		updatedAt: now
	};
}

export function normalizeSyncedTimerState(value: unknown): TimerState {
	return normalizeTimerState(value);
}

export function normalizeAppStateVersion(value: unknown): AppStateVersion | undefined {
	if (!isRecord(value)) {
		return undefined;
	}

	if (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt)) {
		return undefined;
	}

	if (typeof value.originPeerId !== 'string' || !value.originPeerId.trim()) {
		return undefined;
	}

	return {
		updatedAt: Math.max(0, Math.floor(value.updatedAt)),
		originPeerId: value.originPeerId.trim()
	};
}

export function compareAppStateVersions(
	candidate: AppStateVersion,
	current: AppStateVersion
): number {
	if (candidate.updatedAt !== current.updatedAt) {
		return candidate.updatedAt > current.updatedAt ? 1 : -1;
	}

	if (candidate.originPeerId === current.originPeerId) {
		return 0;
	}

	return candidate.originPeerId > current.originPeerId ? 1 : -1;
}

export function isNewerAppStateVersion(
	candidate: AppStateVersion,
	current: AppStateVersion
): boolean {
	return compareAppStateVersions(candidate, current) > 0;
}

export function isSameOrNewerAppStateVersion(
	candidate: AppStateVersion,
	current: AppStateVersion
): boolean {
	return compareAppStateVersions(candidate, current) >= 0;
}

export function getTimerRemainingSeconds(timerState: TimerState, now = Date.now()): number {
	if (!timerState.running) {
		return clampTimerSeconds(timerState.remainingSeconds, timerState.initialSeconds);
	}

	const elapsedSeconds = Math.floor((now - timerState.updatedAt) / 1000);
	return clampTimerSeconds(timerState.remainingSeconds - elapsedSeconds, timerState.initialSeconds);
}

export function getTimerProgress({
	initialSeconds,
	remainingSeconds
}: Pick<TimerState, 'initialSeconds' | 'remainingSeconds'>): number {
	if (!Number.isFinite(initialSeconds) || initialSeconds <= 0) {
		return 1;
	}

	const safeRemaining = Number.isFinite(remainingSeconds)
		? Math.min(initialSeconds, Math.max(0, remainingSeconds))
		: 0;

	return safeRemaining / initialSeconds;
}

export function startTimer(timerState: TimerState, now = Date.now()): TimerState {
	return {
		...timerState,
		running: timerState.remainingSeconds > 0,
		updatedAt: now
	};
}

export function pauseTimer(timerState: TimerState, now = Date.now()): TimerState {
	return {
		...timerState,
		running: false,
		remainingSeconds: getTimerRemainingSeconds(timerState, now),
		updatedAt: now
	};
}

export function resetTimer(timerState: TimerState, now = Date.now()): TimerState {
	return {
		...timerState,
		running: false,
		remainingSeconds: timerState.initialSeconds,
		updatedAt: now
	};
}

export function setTimerDuration(
	timerState: TimerState,
	minutes: number,
	now = Date.now()
): TimerState {
	const initialSeconds = secondsFromMinutes(minutes);

	return {
		...timerState,
		running: false,
		initialSeconds,
		remainingSeconds: initialSeconds,
		updatedAt: now
	};
}

export function shouldFinishTurn(
	timerState: TimerState,
	isLeader: boolean,
	now = Date.now()
): boolean {
	return isLeader && timerState.running && getTimerRemainingSeconds(timerState, now) === 0;
}

export function snapshotTimerState(timerState: TimerState, now = Date.now()): TimerState {
	const remainingSeconds = getTimerRemainingSeconds(timerState, now);

	return {
		...timerState,
		running: timerState.running && remainingSeconds > 0,
		remainingSeconds,
		updatedAt: now
	};
}

export function sanitizeDurationMinutes(value: unknown): number {
	const minutes = typeof value === 'number' ? value : Number(value);
	if (!Number.isFinite(minutes)) {
		return minTurnDurationMinutes;
	}

	return Math.min(maxTurnDurationMinutes, Math.max(minTurnDurationMinutes, Math.floor(minutes)));
}

export function secondsFromMinutes(minutes: number): number {
	return sanitizeDurationMinutes(minutes) * 60;
}

export function formatRemaining(seconds: number) {
	const safeSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;

	return {
		minutes: Math.floor(safeSeconds / 60)
			.toString()
			.padStart(2, '0'),
		seconds: Math.floor(safeSeconds % 60)
			.toString()
			.padStart(2, '0')
	};
}

export function rotateActiveMobster(mobsters: Mobster[]): Mobster[] {
	if (!mobsters.length) {
		return [];
	}

	const activeIndex = mobsters.findIndex((mobster) => mobster.active);
	const newActiveIndex = activeIndex >= 0 ? (activeIndex + 1) % mobsters.length : 0;

	return mobsters.map((mobster, index) => ({
		...mobster,
		active: index === newActiveIndex
	}));
}

export function createMobster(name: string, active: boolean, id = createMobsterId()): Mobster {
	return {
		id,
		name: name.trim(),
		active
	};
}

export function createMobsterId(
	randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
	now = Date.now
): string {
	return randomUUID?.() ?? `${now().toString(36)}-${fallbackMobsterIdSequence++}`;
}

export function createRoomId(
	randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
	now = Date.now
): string {
	return (randomUUID?.() ?? `${now().toString(36)}-${fallbackRoomIdSequence++}`).replace(
		/[^a-z0-9-]/gi,
		''
	);
}

export function removeMobster(mobsters: Mobster[], id: string): Mobster[] {
	return normalizeMobsters(mobsters.filter((mobster) => mobster.id !== id));
}

export function setActiveMobster(mobsters: Mobster[], id: string): Mobster[] {
	if (!mobsters.some((mobster) => mobster.id === id)) {
		return normalizeMobsters(mobsters);
	}

	return mobsters.map((mobster) => ({
		...mobster,
		active: mobster.id === id
	}));
}

function parseJson(value: string | null, fallback: unknown): unknown {
	if (!value) {
		return fallback;
	}

	try {
		return JSON.parse(value);
	} catch (err) {
		return fallback;
	}
}

function normalizeTimerState(value: unknown): TimerState {
	if (!isRecord(value)) {
		return createDefaultTimerState();
	}

	const initialSeconds = normalizeInitialSeconds(value.initialSeconds);
	const remainingSeconds = normalizeRemainingSeconds(value.remainingSeconds, initialSeconds);
	const updatedAt = normalizeUpdatedAt(value.updatedAt);

	return {
		initialSeconds,
		remainingSeconds,
		running: value.running === true && remainingSeconds > 0,
		updatedAt
	};
}

function normalizeInitialSeconds(value: unknown): number {
	const minutes = Number(value) / 60;
	if (!Number.isFinite(minutes) || minutes < minTurnDurationMinutes) {
		return defaultTurnDurationMinutes * 60;
	}

	return secondsFromMinutes(minutes);
}

function normalizeRemainingSeconds(value: unknown, initialSeconds: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return initialSeconds;
	}

	return clampTimerSeconds(value, initialSeconds);
}

function normalizeUpdatedAt(value: unknown): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return Date.now();
	}

	return Math.max(0, Math.floor(value));
}

function clampTimerSeconds(value: number, max: number): number {
	return Math.min(max, Math.max(0, Math.floor(value)));
}

function isMobsterLike(value: unknown): value is Mobster {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		value.id.trim().length > 0 &&
		typeof value.name === 'string' &&
		value.name.trim().length > 0
	);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
