const DEFAULT_UMAMI_SCRIPT_URL = 'https://cloud.umami.is/script.js';

export type UmamiConfig = {
	scriptUrl: string;
	websiteId: string;
};

export type AnalyticsEventData = Record<string, boolean | number | string>;

type UmamiWindow = Window & {
	umami?: {
		track?: (eventName: string, eventData?: AnalyticsEventData) => void;
	};
};

export function getUmamiConfig(
	websiteId: string | undefined,
	scriptUrl: string | undefined
): UmamiConfig | undefined {
	const trimmedWebsiteId = websiteId?.trim();

	if (!trimmedWebsiteId) {
		return undefined;
	}

	return {
		scriptUrl: scriptUrl?.trim() || DEFAULT_UMAMI_SCRIPT_URL,
		websiteId: trimmedWebsiteId
	};
}

export function trackAnalyticsEvent(eventName: string, eventData?: AnalyticsEventData) {
	if (typeof window === 'undefined') {
		return;
	}

	const track = (window as UmamiWindow).umami?.track;
	if (typeof track !== 'function') {
		return;
	}

	try {
		if (eventData) {
			track(eventName, eventData);
			return;
		}

		track(eventName);
	} catch {
		// Analytics must never affect timer behavior.
	}
}
