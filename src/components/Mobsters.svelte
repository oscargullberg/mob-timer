<script lang="ts">
	import { mobsters, timerConfig } from '../stores';
	import { createEventDispatcher } from 'svelte';
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

<ul>
	{#each $mobsters as mobster, i (mobster.id)}
		<li>
			<span on:click={() => setActive(mobster.id)} class:active={mobster.active}
				>{mobster.name}</span
			><button type="button" on:click={() => remove(mobster.id)}>[Delete]</button>
		</li>
	{/each}
</ul>

<input type="text" bind:value={newMobsterName}/><button
	type="button"
	on:click={() => add(newMobsterName)}>Add</button
>

<style>
	.active {
		font-weight: bold;
	}
</style>
