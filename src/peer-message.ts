import { normalizeAppStateVersion, normalizeMobsters, normalizeSyncedTimerState } from './state.ts';
import type { AppStateVersion, Mobster, TimerState } from './state.ts';

type AppStatePayload = {
	mobsters: Mobster[];
	timerState: TimerState;
	version: AppStateVersion;
	peerId: string;
};

export type PeerMessage =
	| {
			type: 'INIT';
			payload: {
				peerId: string;
			};
	  }
	| {
			type: 'SET_APP_STATE';
			payload: AppStatePayload;
	  }
	| {
			type: 'PROPOSE_APP_STATE';
			payload: AppStatePayload;
	  }
	| {
			type: 'GOSSIP_APP_STATE';
			payload: AppStatePayload;
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
			return parseAppStateMessage('SET_APP_STATE', message.payload);
		case 'PROPOSE_APP_STATE':
			return parseAppStateMessage('PROPOSE_APP_STATE', message.payload);
		case 'GOSSIP_APP_STATE':
			return parseAppStateMessage('GOSSIP_APP_STATE', message.payload);
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

function parseAppStateMessage(
	type: 'SET_APP_STATE' | 'PROPOSE_APP_STATE' | 'GOSSIP_APP_STATE',
	payload: Record<string, unknown>
): PeerMessage | undefined {
	if (typeof payload.peerId !== 'string' || !payload.peerId.trim()) {
		return undefined;
	}

	const version = normalizeAppStateVersion(payload.version);
	if (!version) {
		return undefined;
	}

	return {
		type,
		payload: {
			mobsters: normalizeMobsters(payload.mobsters),
			timerState: normalizeSyncedTimerState(payload.timerState),
			version,
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}
