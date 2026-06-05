import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readStoredItem, writeStoredJson } from './storage.ts';

describe('storage helpers', () => {
	it('returns null when storage reads fail', () => {
		const storage = {
			getItem() {
				throw new Error('blocked');
			}
		};

		assert.equal(readStoredItem(storage, 'mobsters'), null);
	});

	it('reports failed writes without throwing', () => {
		const storage = {
			setItem() {
				throw new Error('quota exceeded');
			}
		};

		assert.equal(writeStoredJson(storage, 'mobsters', []), false);
	});

	it('writes JSON when storage is available', () => {
		const values = new Map<string, string>();
		const storage = {
			setItem(key: string, value: string) {
				values.set(key, value);
			}
		};

		assert.equal(writeStoredJson(storage, 'mobsters', [{ id: 'a' }]), true);
		assert.equal(values.get('mobsters'), '[{"id":"a"}]');
	});
});
