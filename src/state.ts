export type TimerConfig = {
	running: boolean;
	initialSeconds: number;
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

export function parseStoredMobsters(value: string | null): Mobster[] {
	return normalizeMobsters(parseJson(value, []));
}

export function parseStoredTimerConfig(value: string | null): TimerConfig {
	return normalizeTimerConfig(parseJson(value, createDefaultTimerConfig()));
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
