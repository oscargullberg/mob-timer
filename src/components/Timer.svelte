<script lang="ts">
	import { isMainPeer, remaining, timerProgress, timerState } from '../stores';
	import {
		pauseTimer,
		resetTimer,
		sanitizeDurationMinutes,
		setTimerDuration,
		shouldFinishTurn,
		startTimer
	} from '../state';
	import { onMount } from 'svelte';

	type Props = {
		onTimerConfigUpdated?: () => void;
		onTurnFinished?: () => void;
		onTimerFinishedEffect?: () => void;
	};

	let { onTimerConfigUpdated, onTurnFinished, onTimerFinishedEffect }: Props = $props();
	let finishedTurnUpdatedAt: number | undefined;
	let oozeSeed = $state(createOozeSeed());

	const drainProgress = $derived(1 - $timerProgress);
	const flowStrength = $derived(Math.sin(drainProgress * Math.PI));
	const finalPhase = $derived(Math.max(0, Math.min(1, (drainProgress - 0.72) / 0.28)));
	const topSurfaceY = $derived(3 + drainProgress * 34);
	const topMassHeight = $derived(43 * $timerProgress * (1 - finalPhase));
	const topOpacity = $derived(
		Math.min(1, Math.max(0, ($timerProgress - 0.08) / 0.22)) * (1 - finalPhase)
	);
	const topHighlightOpacity = $derived(0.32 * topOpacity);
	const bottomScale = $derived(0.38 + drainProgress * 0.82);
	const bottomTranslate = $derived(22 - drainProgress * 28);
	const funnelHeight = $derived(5 + drainProgress * 10);
	const funnelOpacity = $derived((1 - finalPhase) * topOpacity * (0.08 + drainProgress * 0.26));
	const funnelScale = $derived(0.32 + drainProgress * 0.56);
	const residueOpacity = $derived(finalPhase * (1 - topOpacity));
	const flowActive = $derived(
		Math.min(1, Math.max(0, ($timerProgress - 0.08) / 0.16)) * (1 - finalPhase)
	);
	const neckWidth = $derived(5 + flowStrength * 5);
	const neckOpacity = $derived(flowActive * topOpacity * (0.42 + flowStrength * 0.38));
	const moundWidth = $derived(38 + drainProgress * 20);
	const moundHeight = $derived(44 + flowStrength * 28);
	const moundScaleX = $derived(0.45 + drainProgress * 0.74);
	const moundScaleY = $derived(0.36 + drainProgress * 0.86);
	const moundLift = $derived((1 - drainProgress) * 16);
	const moundOpacity = $derived(0.28 + drainProgress * 0.72);
	const poolGlareOpacity = $derived(0.18 + drainProgress * 0.24);
	const dropOpacity = $derived(flowActive * topOpacity * (0.74 + flowStrength * 0.2));
	const dropSplashOpacity = $derived(dropOpacity * 0.45);
	const dropWidth = $derived((8 + flowStrength * 5) * Number(oozeSeed.dropSize));
	const dropHeight = $derived((12 + flowStrength * 8) * Number(oozeSeed.dropSize));
	const timeText = $derived(`${$remaining.minutes}:${$remaining.seconds}`);

	onMount(() => {
		const intervalId = window.setInterval(() => {
			const now = Date.now();
			if (!shouldFinishTurn($timerState, $isMainPeer, now)) {
				return;
			}

			if (finishedTurnUpdatedAt === $timerState.updatedAt) {
				return;
			}

			finishedTurnUpdatedAt = $timerState.updatedAt;
			onTimerFinishedEffect?.();
			onTurnFinished?.();
		}, 250);

		const oozeIntervalId = window.setInterval(() => {
			if ($timerState.running) {
				oozeSeed = createOozeSeed();
			}
		}, 6200);

		return () => {
			window.clearInterval(intervalId);
			window.clearInterval(oozeIntervalId);
		};
	});

	async function handleToggleClick() {
		const now = Date.now();
		timerState.update((state) => (state.running ? pauseTimer(state, now) : startTimer(state, now)));
		if ('Notification' in window) {
			await Notification.requestPermission();
		}
		onTimerConfigUpdated?.();
	}

	function handleResetClick() {
		timerState.update((state) => resetTimer(state, Date.now()));
		oozeSeed = createOozeSeed();
		onTimerConfigUpdated?.();
	}

	function handleMinutesInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const minutes = sanitizeDurationMinutes(input.value);

		input.value = String(minutes);
		timerState.update((state) => setTimerDuration(state, minutes, Date.now()));
		oozeSeed = createOozeSeed();
		onTimerConfigUpdated?.();
	}

	function createOozeSeed() {
		return {
			dropSize: (0.82 + Math.random() * 0.36).toFixed(2),
			dropX: `${Math.round((Math.random() - 0.5) * 16)}px`,
			cycle: `${(2.4 + Math.random() * 0.8).toFixed(2)}s`
		};
	}
</script>

<div
	class="timer-card"
	class:running={$timerState.running}
	style={`--drain:${drainProgress}; --flow:${flowStrength}; --final-phase:${finalPhase}; --top-surface-y:${topSurfaceY}%; --top-mass-height:${topMassHeight}%; --top-opacity:${topOpacity}; --top-highlight-opacity:${topHighlightOpacity}; --funnel-height:${funnelHeight}%; --funnel-opacity:${funnelOpacity}; --funnel-scale:${funnelScale}; --residue-opacity:${residueOpacity}; --neck-width:${neckWidth}%; --neck-opacity:${neckOpacity}; --bottom-scale:${bottomScale}; --bottom-y:${bottomTranslate}px; --mound-width:${moundWidth}%; --mound-height:${moundHeight}%; --mound-scale-x:${moundScaleX}; --mound-scale-y:${moundScaleY}; --mound-lift:${moundLift}px; --mound-opacity:${moundOpacity}; --pool-glare-opacity:${poolGlareOpacity}; --drop-opacity:${dropOpacity}; --drop-splash-opacity:${dropSplashOpacity}; --drop-width:${dropWidth}%; --drop-height:${dropHeight}%; --drop-x:${oozeSeed.dropX}; --cycle:${oozeSeed.cycle};`}
>
	<svg aria-hidden="true" width="0" height="0" class="goo-filter">
		<filter id="contained-css-goo">
			<feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
			<feColorMatrix
				in="blur"
				mode="matrix"
				values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8"
				result="goo"
			/>
			<feBlend in="SourceGraphic" in2="goo" />
		</filter>
	</svg>

	<div class="hourglass-3d" aria-hidden="true">
		<div class="glass-outline"></div>
		<div class="glass-mask"></div>
		<div class="goo-layer">
			<div class="blob top-mass"></div>
			<div class="blob top-residue left"></div>
			<div class="blob top-residue right"></div>
			<div class="blob release-bridge"></div>
			<div class="blob drop"></div>
			<div class="blob bottom-pool"></div>
		</div>
		<div class="glass-glare"></div>
		<div class="cap top"></div>
		<div class="cap bottom"></div>
	</div>

	<div class="time-value" aria-label={`Time remaining ${timeText}`}>
		{#if !$timerState.running}
			<input
				class="time-minutes-input"
				type="number"
				value={$remaining.minutes}
				min="1"
				max="99"
				aria-label="Turn duration in minutes"
				oninput={handleMinutesInput}
			/><span>:</span><span>{$remaining.seconds}</span>
		{:else}
			{timeText}
		{/if}
	</div>
</div>

<div class="controls">
	<button
		type="button"
		onclick={handleToggleClick}
		aria-label={$timerState.running ? 'Pause timer' : 'Start timer'}
	>
		{$timerState.running ? 'Pause' : 'Start'}
	</button>
	<button type="button" onclick={handleResetClick} aria-label="Reset timer">Reset</button>
</div>

<style>
	.goo-filter {
		position: absolute;
	}
	.timer-card {
		position: relative;
		display: grid;
		grid-template-rows: 270px 104px;
		align-content: center;
		align-items: center;
		justify-items: center;
		gap: 16px;
		width: min(100%, 470px);
		min-height: 430px;
		overflow: hidden;
		border: 8px solid #f4f6ee;
		border-radius: 34px 28px 42px 24px;
		background:
			radial-gradient(circle at 50% 28%, rgba(169, 204, 69, 0.08), transparent 15rem), #090909;
		box-shadow:
			7px 8px 0 rgba(0, 0, 0, 0.72),
			inset 0 1px 0 rgba(255, 255, 255, 0.14);
		perspective: 900px;
	}
	.hourglass-3d {
		position: relative;
		width: min(76%, 310px);
		height: 270px;
		transform-style: preserve-3d;
		transform: rotateX(7deg) rotateY(-8deg);
		filter: drop-shadow(7px 9px 0 rgba(0, 0, 0, 0.68));
	}
	.glass-mask,
	.glass-outline,
	.glass-glare,
	.goo-layer {
		position: absolute;
		inset: 22px 42px 20px;
		clip-path: polygon(
			8% 0,
			92% 0,
			73% 39%,
			56% 50%,
			73% 61%,
			92% 100%,
			8% 100%,
			27% 61%,
			44% 50%,
			27% 39%
		);
	}
	.glass-mask {
		background:
			linear-gradient(
				90deg,
				rgba(255, 255, 255, 0.08),
				transparent 22% 78%,
				rgba(255, 255, 255, 0.06)
			),
			rgba(255, 255, 255, 0.035);
		transform: translateZ(3px);
	}
	.glass-outline {
		inset: 16px 34px 14px;
		background: #f4f6ee;
		transform: translateZ(24px);
	}
	.glass-outline::after {
		content: '';
		position: absolute;
		inset: 8px;
		clip-path: inherit;
		background: #090909;
	}
	.goo-layer {
		overflow: hidden;
		filter: url('#contained-css-goo');
		transform: translateZ(18px);
	}
	.glass-glare {
		pointer-events: none;
		transform: translateZ(28px);
		background:
			linear-gradient(
				102deg,
				transparent 0 30%,
				rgba(255, 255, 255, 0.26) 31% 36%,
				transparent 37%
			),
			linear-gradient(78deg, transparent 0 64%, rgba(255, 255, 255, 0.15) 65% 69%, transparent 70%);
		opacity: 0.68;
	}
	.cap {
		position: absolute;
		left: 11%;
		width: 78%;
		height: 30px;
		border: 6px solid #f4f6ee;
		border-radius: 999px;
		background: #151515;
		box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.7);
		transform: translateZ(34px);
	}
	.cap.top {
		top: -2px;
	}
	.cap.bottom {
		bottom: -2px;
	}
	.blob {
		position: absolute;
		background:
			radial-gradient(circle at 30% 24%, rgba(255, 255, 255, 0.32), transparent 0 21%),
			linear-gradient(145deg, #d8f45e, #a9cc45 55%, #71891f);
		box-shadow:
			inset -10px -14px 22px rgba(49, 69, 13, 0.45),
			inset 10px 8px 16px rgba(255, 255, 255, 0.14);
	}
	.top-mass {
		left: 5%;
		top: var(--top-surface-y);
		width: 90%;
		height: var(--top-mass-height);
		border-radius: 50% 50% 44% 56% / 16% 18% 66% 64%;
		transform: none;
		opacity: var(--top-opacity);
		transition:
			top 0.35s linear,
			height 0.35s linear,
			opacity 0.35s linear;
	}
	.top-mass::before {
		content: '';
		position: absolute;
		left: 27%;
		top: -3%;
		width: 46%;
		height: var(--funnel-height);
		border-radius: 50% 50% 46% 46% / 42% 42% 66% 66%;
		background:
			radial-gradient(
				ellipse at 50% 18%,
				rgba(5, 5, 5, 0.54),
				rgba(5, 5, 5, 0.24) 42%,
				transparent 70%
			),
			radial-gradient(ellipse at 50% 72%, rgba(77, 99, 20, 0.32), transparent 68%);
		opacity: var(--funnel-opacity);
		transform: scaleX(var(--funnel-scale));
		transform-origin: 50% 0;
	}
	.top-mass::after {
		content: '';
		position: absolute;
		left: 4%;
		top: -9%;
		width: 92%;
		height: 34%;
		border-radius: 50%;
		background:
			radial-gradient(ellipse at 50% 42%, rgba(255, 255, 255, 0.16), transparent 62%),
			radial-gradient(ellipse at 50% 70%, rgba(72, 92, 24, 0.24), transparent 66%);
		opacity: var(--top-highlight-opacity);
	}
	.top-residue {
		top: 16%;
		width: 16%;
		height: 22%;
		border-radius: 54% 46% 62% 38% / 42% 58% 42% 58%;
		opacity: var(--residue-opacity);
		transform: scale(0.72, 1);
		transition: opacity 0.35s linear;
	}
	.top-residue.left {
		left: 11%;
		transform: rotate(-12deg) scale(0.62, 1.08);
	}
	.top-residue.right {
		right: 11%;
		transform: rotate(10deg) scale(0.56, 0.94);
	}
	.release-bridge {
		left: 50%;
		top: 38%;
		width: var(--neck-width);
		min-width: 7px;
		height: 11%;
		border-radius: 44% 56% 58% 42% / 38% 40% 68% 66%;
		transform: translateX(-50%);
		transform-origin: 50% 0;
		opacity: var(--neck-opacity);
	}
	.drop {
		left: calc(45% + var(--drop-x));
		top: 39%;
		width: var(--drop-width);
		height: var(--drop-height);
		border-radius: 46% 54% 61% 39% / 40% 43% 63% 60%;
		opacity: 0;
		animation:
			ooze-drop var(--cycle) cubic-bezier(0.34, 0, 0.46, 1) infinite,
			drop-wobble calc(var(--cycle) / 4) ease-in-out infinite;
		animation-composition: replace, add;
	}
	.timer-card:not(.running) .release-bridge,
	.timer-card:not(.running) .drop {
		animation-play-state: paused;
		opacity: 0;
	}
	.bottom-pool {
		left: 4%;
		bottom: -3%;
		width: 92%;
		height: 39%;
		border-radius: 52% 48% 38% 62% / 34% 40% 58% 62%;
		transform: translateY(var(--bottom-y)) scale(1.02, var(--bottom-scale));
		transform-origin: 50% 82%;
		transition: transform 0.35s linear;
	}
	.bottom-pool::before {
		content: '';
		position: absolute;
		left: 31%;
		top: -28%;
		width: var(--mound-width);
		height: var(--mound-height);
		border-radius: 52% 48% 58% 42% / 42% 44% 68% 64%;
		background: inherit;
		transform: translateY(var(--mound-lift)) scale(var(--mound-scale-x), var(--mound-scale-y));
		transform-origin: 50% 100%;
		opacity: var(--mound-opacity);
	}
	.bottom-pool::after {
		content: '';
		position: absolute;
		left: 16%;
		top: 2%;
		width: 72%;
		height: 28%;
		border-radius: 50%;
		background: radial-gradient(ellipse at 50% 50%, rgba(255, 255, 255, 0.18), transparent 62%);
		opacity: var(--pool-glare-opacity);
	}
	.time-value {
		position: relative;
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 104px;
		color: #b8d84d;
		font-family: 'Cooper Black', 'Arial Rounded MT Bold', 'Trebuchet MS', 'Arial Black', sans-serif;
		font-size: clamp(78px, 11vw, 126px);
		font-weight: 1000;
		line-height: 0.82;
		letter-spacing: 0;
		-webkit-text-stroke: 3px #101010;
		filter: drop-shadow(-2px 0 0 rgba(244, 246, 238, 0.92))
			drop-shadow(2px 0 0 rgba(244, 246, 238, 0.92)) drop-shadow(0 -2px 0 rgba(244, 246, 238, 0.92))
			drop-shadow(0 2px 0 rgba(244, 246, 238, 0.92)) drop-shadow(7px 8px 0 rgba(0, 0, 0, 0.7));
		paint-order: stroke fill;
		text-shadow:
			-2px 0 0 #101010,
			2px 0 0 #101010,
			0 -2px 0 #101010,
			0 2px 0 #101010,
			3px 4px 0 #101010,
			5px 6px 0 rgba(0, 0, 0, 0.72);
	}
	.time-value span {
		display: block;
	}
	.time-minutes-input {
		width: 2ch;
		height: 1em;
		min-width: 0;
		border: 0;
		background: transparent;
		color: inherit;
		font: inherit;
		line-height: inherit;
		letter-spacing: 0;
		margin: 0;
		padding: 0;
		text-align: right;
		-webkit-text-stroke: inherit;
		text-shadow: inherit;
		appearance: textfield;
		outline: none;
	}
	.time-minutes-input::-webkit-inner-spin-button,
	.time-minutes-input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
	}
	.controls {
		display: flex;
		gap: 10px;
	}
	.controls button {
		min-width: 96px;
		border: 2px solid rgba(244, 246, 238, 0.9);
		border-radius: 6px;
		background: #111;
		padding: 11px 15px;
		color: #f4f6ee;
		font:
			850 13px/1 system-ui,
			sans-serif;
		text-align: center;
		text-transform: uppercase;
		box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.55);
	}
	.controls button:active {
		transform: translateY(1px);
	}
	@keyframes ooze-drop {
		0%,
		18% {
			transform: translateY(0) scale(0.12, 0.18);
			opacity: 0;
		}
		26% {
			transform: translateY(8px) scale(0.34, 1.28);
			opacity: var(--drop-opacity);
		}
		48% {
			transform: translateY(36px) scale(0.74, 1.16);
			opacity: var(--drop-opacity);
		}
		74% {
			transform: translateY(72px) scale(0.96, 0.9);
			opacity: var(--drop-opacity);
		}
		88% {
			transform: translateY(86px) scale(1.35, 0.34);
			opacity: var(--drop-splash-opacity);
		}
		100% {
			transform: translateY(90px) scale(1.45, 0.18);
			opacity: 0;
		}
	}
	@keyframes drop-wobble {
		0%,
		100% {
			rotate: -1.2deg;
		}
		50% {
			rotate: 1.2deg;
		}
	}
	@media (max-width: 760px) {
		.timer-card {
			grid-template-rows: 230px 84px;
			min-height: 360px;
		}
		.hourglass-3d {
			width: min(80%, 260px);
			height: 230px;
		}
		.time-value {
			height: 84px;
			font-size: clamp(64px, 18vw, 96px);
		}
	}
</style>
