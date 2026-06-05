<script lang="ts">
	import SiteHeader from '../../components/SiteHeader.svelte';
	import Peer from '../../components/Peer.svelte';
	import Mobsters from '../../components/Mobsters.svelte';
	import { broadcast, remaining, mobsters, timerConfig, timer, activeMobster } from '../../stores';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	const roomId = $derived(page.params.roomId ?? '');
	const title = $derived(
		[`[${$remaining.minutes}:${$remaining.seconds}]`, $activeMobster?.name, 'mob timer']
			.filter(Boolean)
			.join(' - ')
	);

	let notificationAudio: HTMLAudioElement | undefined;
	let wakeLock: WakeLockSentinel | undefined;

	onMount(() => {
		notificationAudio = new Audio(`${base}/spooky-gong.mp3`);
		void tryRequestWakeLock();
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			void wakeLock?.release();
		};
	});

	function updateBroadcastState() {
		$broadcast = {
			lastChange: Date.now()
		};
	}

	function onTurnFinished() {
		mobsters.changeMobster();
		$timer = $timerConfig.initialSeconds;
		updateBroadcastState();

		const newMobsterName = $activeMobster?.name;
		if ('Notification' in window && Notification.permission === 'granted') {
			new Notification(`Rotate! ⏰`, {
				body: `${newMobsterName}, it's your turn!`,
				tag: 'newTurn',
				requireInteraction: true
			});
		}
		void notificationAudio?.play().catch((err) => console.warn('Could not play turn sound.', err));
	}

	async function onVisibilityChange() {
		if (document.visibilityState === 'visible') {
			await tryRequestWakeLock();
		}
	}

	async function tryRequestWakeLock() {
		try {
			if ('wakeLock' in navigator) {
				wakeLock = await navigator.wakeLock.request('screen');
			}
		} catch (err) {
			console.warn(err);
		}
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="wrapper">
	<SiteHeader onTimerConfigUpdated={updateBroadcastState} {onTurnFinished} />

	<Peer {roomId} />

	<main class="main">
		<Mobsters onMobstersUpdated={updateBroadcastState} />
	</main>
</div>

<style>
	.wrapper {
		min-height: 100vh;
		background:
			radial-gradient(circle at 20% 20%, rgba(91, 141, 239, 0.16), transparent 30rem),
			linear-gradient(135deg, #111318, #1c1f27 55%, #12141a);
	}
	.main {
		min-height: calc(100vh - 4.75rem);
		display: flex;
		justify-content: center;
		align-items: flex-start;
		padding: clamp(2rem, 6vw, 4rem) 1rem;
	}
</style>
