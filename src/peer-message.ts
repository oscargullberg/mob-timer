import { normalizeMobsters, normalizeTimerConfig } from './state.ts';
import type { Mobster, TimerConfig } from './state.ts';

export type PeerMessage =
	| {
			type: 'INIT';
			payload: {
				peerId: string;
			};
	  }
	| {
			type: 'SET_APP_STATE';
			payload: {
				mobsters: Mobster[];
				timerConfig: TimerConfig;
				timer: number;
				peerId: string;
			};
	  }
	| {
			type: 'SET_PEERLIST';
			payload: {
				peerIds: string[];
			};
	  };

export function parsePeerMessage(data: unknown): PeerMessage | undefined {
	if (typeof data !== 'string') {
		return undefined;
	}

	let message: unknown;
	try {
		message = JSON.parse(data);
	} catch {
		return undefined;
	}

	if (!isRecord(message) || typeof message.type !== 'string' || !isRecord(message.payload)) {
		return undefined;
	}

	switch (message.type) {
		case 'INIT':
			return parseInitMessage(message.payload);
		case 'SET_APP_STATE':
			return parseSetAppStateMessage(message.payload);
		case 'SET_PEERLIST':
			return parseSetPeerListMessage(message.payload);
		default:
			return undefined;
	}
}

function parseInitMessage(payload: Record<string, unknown>): PeerMessage | undefined {
	if (typeof payload.peerId !== 'string' || !payload.peerId.trim()) {
		return undefined;
	}

	return {
		type: 'INIT',
		payload: {
			peerId: payload.peerId
		}
	};
}

function parseSetAppStateMessage(payload: Record<string, unknown>): PeerMessage | undefined {
	if (typeof payload.peerId !== 'string' || !payload.peerId.trim()) {
		return undefined;
	}

	const timerConfig = normalizeTimerConfig(payload.timerConfig);
	const timer = normalizeTimerValue(payload.timer, timerConfig.initialSeconds);

	return {
		type: 'SET_APP_STATE',
		payload: {
			mobsters: normalizeMobsters(payload.mobsters),
			timerConfig,
			timer,
			peerId: payload.peerId
		}
	};
}

function parseSetPeerListMessage(payload: Record<string, unknown>): PeerMessage {
	const peerIds = Array.isArray(payload.peerIds)
		? payload.peerIds.filter(
				(peerId): peerId is string => typeof peerId === 'string' && !!peerId.trim()
			)
		: [];

	return {
		type: 'SET_PEERLIST',
		payload: {
			peerIds
		}
	};
}

function normalizeTimerValue(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) {
		return fallback;
	}

	return Math.max(0, Math.floor(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
