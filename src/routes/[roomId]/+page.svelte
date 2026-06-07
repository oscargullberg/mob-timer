<script lang="ts">
	import Peer from '../../components/Peer.svelte';
	import Mobsters from '../../components/Mobsters.svelte';
	import Timer from '../../components/Timer.svelte';
	import { broadcast, remaining, mobsters, timerState, activeMobster } from '../../stores';
	import { resetTimer } from '../../state';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { onDestroy, onMount } from 'svelte';

	const roomId = $derived(page.params.roomId ?? '');
	const title = $derived(
		[`[${$remaining.minutes}:${$remaining.seconds}]`, $activeMobster?.name, 'mob timer']
			.filter(Boolean)
			.join(' - ')
	);

	let notificationAudio: HTMLAudioElement | undefined;
	let wakeLock: WakeLockSentinel | undefined;
	let finaleActive = $state(false);
	let finaleTimeoutId: number | undefined;

	onMount(() => {
		notificationAudio = new Audio(`${resolve('/spooky-gong.mp3')}`);
		void tryRequestWakeLock();
		document.addEventListener('visibilitychange', onVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', onVisibilityChange);
			void wakeLock?.release();
		};
	});

	onDestroy(() => {
		if (finaleTimeoutId) {
			window.clearTimeout(finaleTimeoutId);
		}
	});

	function updateBroadcastState() {
		$broadcast = {
			lastChange: Date.now()
		};
	}

	function triggerTimerFinishedEffect() {
		finaleActive = false;
		window.requestAnimationFrame(() => {
			finaleActive = true;
			if (finaleTimeoutId) {
				window.clearTimeout(finaleTimeoutId);
			}
			finaleTimeoutId = window.setTimeout(() => {
				finaleActive = false;
			}, 2800);
		});
	}

	function onTurnFinished() {
		mobsters.changeMobster();
		timerState.update((state) => resetTimer(state, Date.now()));
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

<div class="wrapper" class:finale={finaleActive}>
	<Peer {roomId} />

	<main class="main">
		<section class="app-stage">
			<div class="brand-panel">
				<div class="logo" aria-label="Mob Timer">
					<span>Mob</span>
					<span>Timer</span>
				</div>
				<div class="mobsters-slot">
					<Mobsters onMobstersUpdated={updateBroadcastState} />
				</div>
			</div>

			<div class="timer-panel">
				<Timer
					onTimerConfigUpdated={updateBroadcastState}
					{onTurnFinished}
					onTimerFinishedEffect={triggerTimerFinishedEffect}
				/>
			</div>
		</section>
	</main>
</div>

<style>
	.wrapper {
		position: relative;
		min-height: 100vh;
		background:
			radial-gradient(circle at 68% 28%, rgba(255, 255, 255, 0.12), transparent 19rem),
			linear-gradient(145deg, #191919, #050505 55%, #111);
		color: #f4f6ee;
		overflow: hidden;
	}
	.wrapper.finale {
		animation: timer-up-shake 1.25s linear;
	}
	.wrapper.finale::after {
		content: '';
		position: fixed;
		left: 50%;
		top: 50%;
		width: 180vmax;
		height: 180vmax;
		z-index: 20;
		pointer-events: none;
		background:
			repeating-conic-gradient(
				from 0deg,
				rgba(169, 204, 69, 0.42) 0deg 12deg,
				rgba(143, 85, 205, 0.38) 12deg 24deg,
				rgba(0, 0, 0, 0) 24deg 36deg
			),
			radial-gradient(
				circle,
				transparent 0 18%,
				rgba(169, 204, 69, 0.25) 19% 28%,
				transparent 29% 44%,
				rgba(143, 85, 205, 0.22) 45% 55%,
				transparent 56%
			);
		mix-blend-mode: screen;
		border-radius: 50%;
		clip-path: circle(50% at 50% 50%);
		mask: radial-gradient(circle, #000 0 42%, rgba(0, 0, 0, 0.75) 54%, transparent 68%);
		opacity: 0;
		transform: translate(-50%, -50%) scale(0.9) rotate(0deg);
		animation: timer-up-hypnosis 2.7s linear;
	}
	.main {
		min-height: 100vh;
		display: flex;
		justify-content: center;
		align-items: center;
		padding: clamp(4.5rem, 8vw, 6rem) clamp(1rem, 3vw, 2rem) clamp(1rem, 3vw, 2rem);
	}
	.app-stage {
		--panel-pad-y: clamp(1.5rem, 4vw, 3rem);
		--panel-pad-x: clamp(1rem, 3vw, 2rem);

		display: grid;
		grid-template-columns: minmax(17rem, 27rem) minmax(20rem, 1fr);
		width: min(100%, 92rem);
		min-height: min(48rem, calc(100vh - 4rem));
		overflow: visible;
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 8px;
		background:
			radial-gradient(circle at 68% 28%, rgba(255, 255, 255, 0.12), transparent 19rem),
			linear-gradient(145deg, #191919, #050505 55%, #111);
		box-shadow:
			0 24px 70px rgba(0, 0, 0, 0.64),
			inset 0 1px 0 rgba(255, 255, 255, 0.08);
	}
	.brand-panel,
	.timer-panel {
		display: grid;
		align-content: start;
		justify-items: center;
		padding: var(--panel-pad-y) var(--panel-pad-x);
	}
	.brand-panel {
		position: relative;
		justify-items: start;
		overflow: visible;
	}
	.timer-panel {
		gap: 1.5rem;
		border-left: 1px solid rgba(255, 255, 255, 0.08);
		background: rgba(0, 0, 0, 0.22);
	}
	.logo {
		position: absolute;
		left: var(--panel-pad-x);
		top: var(--panel-pad-y);
		z-index: 2;
		display: grid;
		justify-items: start;
		width: min(78%, 16.5rem);
		isolation: isolate;
		pointer-events: none;
		transform: rotate(-7deg) skewX(-3deg);
		filter: drop-shadow(-2px 0 0 rgba(244, 246, 238, 0.9))
			drop-shadow(2px 0 0 rgba(244, 246, 238, 0.9)) drop-shadow(0 -2px 0 rgba(244, 246, 238, 0.9))
			drop-shadow(0 2px 0 rgba(244, 246, 238, 0.9)) drop-shadow(7px 8px 0 rgba(0, 0, 0, 0.7));
	}
	.logo span {
		position: relative;
		z-index: 1;
		display: block;
		color: #9351cf;
		font-family: 'Cooper Black', 'Arial Rounded MT Bold', 'Trebuchet MS', 'Arial Black', sans-serif;
		font-size: clamp(2.35rem, 4.15vw, 3.9rem);
		font-weight: 1000;
		line-height: 0.74;
		letter-spacing: 0;
		text-transform: uppercase;
		-webkit-text-stroke: 3px #101010;
		paint-order: stroke fill;
		text-shadow:
			-2px 0 0 #101010,
			2px 0 0 #101010,
			0 -2px 0 #101010,
			0 2px 0 #101010,
			3px 4px 0 #101010,
			6px 7px 0 rgba(0, 0, 0, 0.68);
	}
	.logo span:first-child {
		margin-left: 0;
	}
	.logo span:last-child {
		margin-top: 0.18rem;
		margin-left: 0.75rem;
		transform: rotate(3deg);
	}
	.mobsters-slot {
		position: relative;
		z-index: 1;
		width: min(100%, 22rem);
		margin-top: 0;
		padding-top: clamp(6.6rem, 9.4vw, 8.35rem);
	}
	@media (min-width: 761px) {
		.logo {
			top: 0;
			transform: translateY(-48%) rotate(-7deg) skewX(-3deg);
		}

		.mobsters-slot {
			padding-top: clamp(6.9rem, 8.6vw, 8.3rem);
		}
	}
	@keyframes timer-up-shake {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		8% {
			transform: translate(-14px, 10px) rotate(-1.4deg);
		}
		16% {
			transform: translate(16px, -12px) rotate(1.55deg);
		}
		24% {
			transform: translate(-18px, -8px) rotate(-1.1deg);
		}
		32% {
			transform: translate(15px, 14px) rotate(1.2deg);
		}
		40% {
			transform: translate(-12px, 7px) rotate(-1deg);
		}
		48% {
			transform: translate(11px, -9px) rotate(0.95deg);
		}
		56% {
			transform: translate(-9px, -6px) rotate(-0.7deg);
		}
		64% {
			transform: translate(8px, 5px) rotate(0.55deg);
		}
		72% {
			transform: translate(-6px, 4px) rotate(-0.4deg);
		}
		80% {
			transform: translate(4px, -3px) rotate(0.25deg);
		}
	}
	@keyframes timer-up-hypnosis {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.9) rotate(0deg);
		}
		12% {
			opacity: 0.45;
		}
		45% {
			opacity: 0.38;
			transform: translate(-50%, -50%) scale(1.05) rotate(120deg);
		}
		100% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(1.22) rotate(300deg);
		}
	}

	@media (max-width: 760px) {
		.wrapper {
			overflow: auto;
		}
		.main {
			align-items: flex-start;
			padding: clamp(1rem, 3vw, 2rem);
		}
		.app-stage {
			grid-template-columns: 1fr;
			overflow: hidden;
		}
		.brand-panel {
			overflow: hidden;
		}
		.timer-panel {
			border-left: 0;
			border-top: 1px solid rgba(255, 255, 255, 0.08);
		}
	}
</style>
