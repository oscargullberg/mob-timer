<script lang="ts">
	import { timer, timerConfig, remaining } from '../stores';
	import { secondsFromMinutes, sanitizeDurationMinutes } from '../state';
	import { onMount } from 'svelte';

	type Props = {
		onTimerConfigUpdated?: () => void;
		onTurnFinished?: () => void;
	};

	let { onTimerConfigUpdated, onTurnFinished }: Props = $props();

	onMount(() => {
		const intervalId = window.setInterval(() => {
			if (!$timerConfig.running) {
				return;
			}

			if ($timer > 0) {
				$timer -= 1;
			}

			if ($timer === 0) {
				onTurnFinished?.();
				$timerConfig.running = false;
			}
		}, 1000);

		return () => window.clearInterval(intervalId);
	});

	async function handleToggleClick() {
		$timerConfig.running = !$timerConfig.running;
		if ('Notification' in window) {
			await Notification.requestPermission();
		}
		onTimerConfigUpdated?.();
	}

	function handleResetClick() {
		$timerConfig.running = false;
		$timer = $timerConfig.initialSeconds;
		onTimerConfigUpdated?.();
	}

	function handleMinutesInput(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const minutes = sanitizeDurationMinutes(input.value);
		const seconds = secondsFromMinutes(minutes);

		input.value = String(minutes);
		$timer = seconds;
		$timerConfig.initialSeconds = seconds;
		onTimerConfigUpdated?.();
	}
</script>

<div class="timer">
	<div class="timer-time">
		{#if !$timerConfig.running}
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
			aria-label={$timerConfig.running ? 'Pause timer' : 'Start timer'}
			>{$timerConfig.running ? 'Pause' : 'Start'}</button
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
		width: 2.2ch;
		font: inherit;
		color: var(--header-text-color);
		background: transparent;
		outline: none;
		border: none;
		text-align: right;
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
