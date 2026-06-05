<script lang="ts">
	import { isMainPeer, remaining, timerState } from '../stores';
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
	};

	let { onTimerConfigUpdated, onTurnFinished }: Props = $props();
	let finishedTurnUpdatedAt: number | undefined;

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
			onTurnFinished?.();
		}, 1000);

		return () => window.clearInterval(intervalId);
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
		onTimerConfigUpdated?.();
	}

	function handleMinutesInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const minutes = sanitizeDurationMinutes(input.value);

		input.value = String(minutes);
		timerState.update((state) => setTimerDuration(state, minutes, Date.now()));
		onTimerConfigUpdated?.();
	}
</script>

<div class="timer">
	<div class="timer-time">
		{#if !$timerState.running}
			<input
				class="timer-minutes-input"
				type="number"
				value={$remaining.minutes}
				min="1"
				max="99"
				aria-label="Turn duration in minutes"
				oninput={handleMinutesInput}
			/>
		{:else}
			<span>{$remaining.minutes}</span>
		{/if}:<span>{$remaining.seconds}</span>
	</div>
	<div class="timer-actions">
		<button
			class="timer-button"
			type="button"
			onclick={handleToggleClick}
			aria-label={$timerState.running ? 'Pause timer' : 'Start timer'}
			>{$timerState.running ? 'Pause' : 'Start'}</button
		>
		<button class="timer-button" type="button" onclick={handleResetClick} aria-label="Stop timer"
			>Reset</button
		>
	</div>
</div>

<style>
	.timer {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.timer-time {
		display: flex;
		align-items: center;
		min-width: 8ch;
		font-variant-numeric: tabular-nums;
		font-size: clamp(1.75rem, 4vw, 2.75rem);
		font-weight: 800;
		line-height: 1;
		letter-spacing: 0;
	}
	.timer-actions {
		display: flex;
		gap: 0.5rem;
	}
	.timer-button {
		min-width: 4.5rem;
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.12);
		padding: 0.55rem 0.75rem;
		font-size: 0.9rem;
		font-weight: 800;
		transition:
			background-color 0.2s ease-out,
			transform 0.2s ease-out;
	}
	.timer-button:hover {
		background: rgba(255, 255, 255, 0.2);
	}
	.timer-button:active {
		transform: translateY(1px);
	}
	.timer-minutes-input {
		width: 2.4ch;
		font: inherit;
		line-height: inherit;
		color: var(--header-text-color);
		background: transparent;
		appearance: textfield;
		outline: none;
		border: none;
		padding: 0;
		text-align: right;
	}
	.timer-minutes-input::-webkit-inner-spin-button,
	.timer-minutes-input::-webkit-outer-spin-button {
		margin: 0;
		appearance: none;
	}
	.timer-minutes-input:focus {
		border-radius: 4px;
		box-shadow: 0 0 0 2px rgba(91, 141, 239, 0.8);
	}

	@media (max-width: 640px) {
		.timer {
			width: 100%;
			justify-content: space-between;
		}
		.timer-actions {
			flex-wrap: wrap;
			justify-content: flex-end;
		}
	}
</style>
