<script lang="ts">
	import { timer, timerConfig, remaining } from '../stores';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	let hover = false;
	$: toggleText = $timerConfig.running
		? '<span aria-label="pause timer">⏸️</span>'
		: '<span aria-label="start timer">▶️</span>';

	setInterval(() => {
		if ($timerConfig.running) {
			if ($timer > 0) {
				$timer -= 1;
			}
			if ($timer === 0) {
				$timerConfig.running = false;
				if (Notification.permission === 'granted') {
					new Notification(`Time to rotate!`, { tag: 'newTurn' });
				}
				dispatch('roundFinished');
			}
		}
	}, 1000);

	async function handleToggleClick() {
		$timerConfig.running = !$timerConfig.running;
		dispatch('timerConfigUpdated');

		if ($timerConfig.running) {
			await Notification?.requestPermission();
		}
	}
	function handleResetClick() {
		$timerConfig.running = false;
		$timer = $timerConfig.initialSeconds;
		dispatch('timerConfigUpdated');
	}
</script>

<div class="timer">
	<!-- svelte-ignore a11y-mouse-events-have-key-events -->
	<div class="timer-time" on:mouseover={() => (hover = true)} on:mouseleave={() => (hover = false)}>
		{#if !$timerConfig.running && hover}
			<input
				type="number"
				value={$remaining.minutes}
				min="1"
				max="99"
				on:input={(e) => {
					// @ts-ignore
					const newVal = e.target.value;
					$timer = newVal * 60;
					$timerConfig.initialSeconds = newVal * 60;
					dispatch('timerConfigUpdated');
				}}
			/>
		{:else}
			<span>{$remaining.minutes}</span>
		{/if}:<span>{$remaining.seconds}</span>
	</div>
	<div>
		<button class="timer-button" type="button" on:click={handleToggleClick}
			>{@html toggleText}</button
		>
		<button class="timer-button" type="button" on:click={handleResetClick} aria-label="stop timer"
			>⏹</button
		>
	</div>
</div>

<style>
	.timer {
		display: flex;
		font-size: 2rem;
	}
	.timer-time {
		display: flex;
	}
	.timer-button {
		font-size: 2rem;
		opacity: 0.85;
		transition: opacity 0.5s ease-out;
	}
	.timer-button:hover {
		opacity: 1;
	}
	.timer > * {
		margin-left: var(--header-item-spacing);
	}
	input[type='number'] {
		opacity: 0.9;
		font-size: 2rem;
		color: var(--header-text-color);
		background-color: var(--header-background-color);
		outline: none;
		border: none;
	}
</style>
