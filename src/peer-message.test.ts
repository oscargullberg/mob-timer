import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePeerMessage } from './peer-message.ts';

describe('parsePeerMessage', () => {
	it('ignores malformed JSON and unknown message types', () => {
		assert.equal(parsePeerMessage('not json'), undefined);
		assert.equal(parsePeerMessage(JSON.stringify({ type: 'NOPE', payload: {} })), undefined);
	});

	it('normalizes canonical app state messages before applying them', () => {
		assert.deepEqual(
			parsePeerMessage(
				JSON.stringify({
					type: 'SET_APP_STATE',
					payload: {
						mobsters: [
							{ id: 'a', name: 'Ada', active: true },
							{ id: '', name: 'Broken', active: true }
						],
						timerState: {
							running: true,
							initialSeconds: 600,
							remainingSeconds: 590,
							updatedAt: 1000
						},
						version: { updatedAt: 2000, originPeerId: 'peer-a' },
						peerId: 'peer-a'
					}
				})
			),
			{
				type: 'SET_APP_STATE',
				payload: {
					mobsters: [{ id: 'a', name: 'Ada', active: true }],
					timerState: {
						running: true,
						initialSeconds: 600,
						remainingSeconds: 590,
						updatedAt: 1000
					},
					version: { updatedAt: 2000, originPeerId: 'peer-a' },
					peerId: 'peer-a'
				}
			}
		);
	});

	it('normalizes proposed app state messages before applying them', () => {
		assert.deepEqual(
			parsePeerMessage(
				JSON.stringify({
					type: 'PROPOSE_APP_STATE',
					payload: {
						mobsters: [{ id: 'a', name: 'Ada', active: true }],
						timerState: {
							running: false,
							initialSeconds: 600,
							remainingSeconds: 600,
							updatedAt: 1000
						},
						version: { updatedAt: 2000, originPeerId: 'peer-a' },
						peerId: 'peer-a'
					}
				})
			),
			{
				type: 'PROPOSE_APP_STATE',
				payload: {
					mobsters: [{ id: 'a', name: 'Ada', active: true }],
					timerState: {
						running: false,
						initialSeconds: 600,
						remainingSeconds: 600,
						updatedAt: 1000
					},
					version: { updatedAt: 2000, originPeerId: 'peer-a' },
					peerId: 'peer-a'
				}
			}
		);
	});

	it('normalizes gossiped app state messages before applying them', () => {
		assert.deepEqual(
			parsePeerMessage(
				JSON.stringify({
					type: 'GOSSIP_APP_STATE',
					payload: {
						mobsters: [{ id: 'a', name: 'Ada', active: true }],
						timerState: {
							running: true,
							initialSeconds: 600,
							remainingSeconds: 500,
							updatedAt: 1000
						},
						version: { updatedAt: 2000, originPeerId: 'peer-a' },
						peerId: 'peer-a'
					}
				})
			),
			{
				type: 'GOSSIP_APP_STATE',
				payload: {
					mobsters: [{ id: 'a', name: 'Ada', active: true }],
					timerState: {
						running: true,
						initialSeconds: 600,
						remainingSeconds: 500,
						updatedAt: 1000
					},
					version: { updatedAt: 2000, originPeerId: 'peer-a' },
					peerId: 'peer-a'
				}
			}
		);
	});

	it('rejects app state messages without a valid version', () => {
		assert.equal(
			parsePeerMessage(
				JSON.stringify({
					type: 'SET_APP_STATE',
					payload: {
						mobsters: [],
						timerState: {
							running: false,
							initialSeconds: 600,
							remainingSeconds: 600,
							updatedAt: 1000
						},
						version: { updatedAt: Number.NaN, originPeerId: 'peer-a' },
						peerId: 'peer-a'
					}
				})
			),
			undefined
		);
	});

	it('keeps only string peer ids in peer list messages', () => {
		assert.deepEqual(
			parsePeerMessage(
				JSON.stringify({ type: 'SET_PEERLIST', payload: { peerIds: ['a', 1, 'b'] } })
			),
			{
				type: 'SET_PEERLIST',
				payload: {
					peerIds: ['a', 'b']
				}
			}
		);
	});
});
