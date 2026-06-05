import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePeerMessage } from './peer-message.ts';

describe('parsePeerMessage', () => {
	it('ignores malformed JSON and unknown message types', () => {
		assert.equal(parsePeerMessage('not json'), undefined);
		assert.equal(parsePeerMessage(JSON.stringify({ type: 'NOPE', payload: {} })), undefined);
	});

	it('normalizes app state messages before applying them', () => {
		assert.deepEqual(
			parsePeerMessage(
				JSON.stringify({
					type: 'SET_APP_STATE',
					payload: {
						mobsters: [
							{ id: 'a', name: 'Ada', active: true },
							{ id: '', name: 'Broken', active: true }
						],
						timerConfig: { running: true, initialSeconds: 600 },
						timer: Number.NaN,
						peerId: 'peer-a'
					}
				})
			),
			{
				type: 'SET_APP_STATE',
				payload: {
					mobsters: [{ id: 'a', name: 'Ada', active: true }],
					timerConfig: { running: false, initialSeconds: 600 },
					timer: 600,
					peerId: 'peer-a'
				}
			}
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
