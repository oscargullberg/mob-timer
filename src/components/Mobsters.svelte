<script lang="ts">
	import { mobsters, timerConfig } from '../stores';
	import { createEventDispatcher } from 'svelte';
	import { blur } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	let newMobsterName = '';

	// Should be triggered by event
	$: if (!$timerConfig.running) {
		onTimerStop();
	}

	function onTimerStop() {
		const i = $mobsters.findIndex((m) => m.active);
		if (i >= 0) {
			$mobsters[i].active = false;
			$mobsters[i % $mobsters.length].active = true;
		}
	}

	function add(name: string) {
		$mobsters = [...$mobsters, { name, id: Date.now().toString(), active: !$mobsters.length }];
		newMobsterName = '';
		dispatch('mobstersUpdated');
	}
	function remove(id: string) {
		$mobsters = $mobsters.filter((m) => m.id !== id);
		dispatch('mobstersUpdated');
	}
	function setActive(id: string) {
		$mobsters = $mobsters.map((m) => ({ ...m, active: m.id === id }));
		dispatch('mobstersUpdated');
	}
</script>

<div class="mobsters">
	<h2 class="mobsters-header">Mobsters</h2>
	<ul>
		{#each $mobsters as mobster, i (mobster.id)}
			<li out:blur={{ duration: 500 }}>
				<span on:click={() => setActive(mobster.id)} class:active={mobster.active}
					>{mobster.name}</span
				><button
					class="mobster-delete"
					type="button"
					on:click={() => remove(mobster.id)}
					aria-label={`Remove ${mobster.name}`}>❌</button
				>
			</li>
		{/each}
	</ul>

	<div class="mobsters-add">
		<input type="text" bind:value={newMobsterName} class="mobsters-add-input" />
		<button
			class="mobsters-add-button"
			type="button"
			on:click={() => add(newMobsterName)}
			disabled={!newMobsterName.length}>Add</button
		>
	</div>
</div>

<style>
	.mobsters {
		display: flex;
		flex-direction: column;
	}
	.mobsters-header {
		margin-left: auto;
		margin-right: auto;
		font-size: 1.5rem;
	}
	.mobsters-add-button {
		display: flex;
	}
	.mobsters-add-input {
		width: 100%;
		margin-bottom: 1px;
	}
	.mobsters-add-button {
		margin-left: auto;
		margin-right: auto;
		color: var(--button-text);
		background-color: #0f0f0fa1;
		display: block;
		padding: 0.5rem;
		width: 100%;
		border-radius: 2px;
		text-transform: uppercase;
		font-weight: 900;
	}
	.mobster-delete {
		margin-left: auto;
	}
	li {
		display: flex;
	}
	.active {
		font-weight: bold;
	}
</style>
