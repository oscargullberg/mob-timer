<script lang="ts">
	import SiteHeader from '../../components/SiteHeader.svelte';
	import Peer from '../../components/Peer.svelte';
	import Mobsters from '../../components/Mobsters.svelte';
	import { broadcast, remaining, mobsters, timerConfig, timer, activeMobster } from '../../stores';
	import { browser } from '$app/environment';

	$: title = [`[${$remaining.minutes}:${$remaining.seconds}]`, $activeMobster?.name, 'mob timer']
		.filter(Boolean)
		.join(' - ');
	const notificationAudio = new Audio('spooky-gong.mp3');

	if (browser) {
		tryRequestWakeLock().then(() => {
			document.onvisibilitychange = onVisibilityChange;
		});
	}

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
		if (Notification.permission === 'granted') {
			new Notification(`Rotate! ⏰`, {
				body: `${newMobsterName}, it's your turn!`,
				tag: 'newTurn',
				renotify: true,
				requireInteraction: true
			});
		}
		notificationAudio.play();
	}

	async function onVisibilityChange(ev: Event) {
		if (document.visibilityState === 'visible') {
			await tryRequestWakeLock();
		}
	}

	async function tryRequestWakeLock() {
		try {
			if ('wakeLock' in navigator) {
				await (navigator as any).wakeLock.request();
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
	<SiteHeader on:timerConfigUpdated={updateBroadcastState} on:turnFinished={onTurnFinished} />

	<Peer />

	<main class="main">
		<Mobsters on:mobstersUpdated={updateBroadcastState} />
	</main>
</div>

<style>
	.wrapper {
		background-color: #111;
	}
	.main {
		min-height: 93vh;
		display: flex;
		justify-content: center;
	}
</style>
