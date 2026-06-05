type ReadableStorage = {
	getItem(key: string): string | null;
};

type WritableStorage = {
	setItem(key: string, value: string): void;
};

export function readStoredItem(storage: ReadableStorage, key: string): string | null {
	try {
		return storage.getItem(key);
	} catch {
		return null;
	}
}

export function writeStoredJson(storage: WritableStorage, key: string, value: unknown): boolean {
	try {
		storage.setItem(key, JSON.stringify(value));
		return true;
	} catch {
		return false;
	}
}
