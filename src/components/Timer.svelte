<script lang="ts">
	import { timer, timerConfig } from '../stores';
	import { createEventDispatcher } from 'svelte';
	const dispatch = createEventDispatcher();

	let hover = false;
	$: toggleText = $timerConfig.running ? 'Pause' : 'Start';
	$: remainingMinutes = Math.floor($timer / 60)
		.toString()
		.padStart(2, '0');
	$: remainingSeconds = Math.floor($timer % 60)
		.toString()
		.padStart(2, '0');

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
				value={remainingMinutes}
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
			<span>{remainingMinutes}</span>
		{/if}:<span>{remainingSeconds}</span>
	</div>
	<button type="button" on:click={handleToggleClick}>{toggleText}</button>
	<button type="button" on:click={handleResetClick}>Reset</button>
</div>

<style>
	.timer {
		display: flex;
	}

	.timer-time {
		display: flex;
	}

	.timer > * {
		margin-left: var(--header-item-spacing);
	}

	input[type='number'] {
		color: var(--header-text-color);
		background-color: var(--header-background-color);
		outline: none;
		border: none;
	}
</style>
