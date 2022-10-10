<script lang="ts">
	import { mobsters, activeMobster } from '../stores';
	import { createEventDispatcher } from 'svelte';
	import { blur } from 'svelte/transition';

	const dispatch = createEventDispatcher();

	let newMobsterName = '';

	function add(name: string) {
		$mobsters = [...$mobsters, { name, id: Date.now().toString(), active: !$activeMobster }];
		newMobsterName = '';
		dispatch('mobstersUpdated');
	}
	function remove(id: string) {
		const newMobsters = $mobsters.filter((m) => m.id !== id);
		if ($activeMobster?.id == id && newMobsters.length) {
			newMobsters[0].active = true;
		}
		$mobsters = newMobsters;
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
					class="mobster-delete-button"
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
		background-color: #fff;
		height: 100%;
		border-radius: 7px;
		padding: 2rem;
	}
	.mobsters-header {
		margin-left: auto;
		margin-right: auto;
		font-size: 1.5rem;
		font-weight: 800;
		margin-bottom: 1rem;
	}
	.mobsters-add-input {
		width: 100%;
		margin-bottom: 1px;
	}
	.mobsters-add-button {
		display: flex;
		opacity: 0.7;
		margin-left: auto;
		margin-right: auto;
		color: var(--button-text);
		background-color: rgb(15, 15, 15);
		opacity: 0.6;
		display: block;
		padding: 0.5rem;
		width: 100%;
		border-radius: 2px;
		text-transform: uppercase;
		font-weight: 900;
		transition: opacity 0.5s ease-out;
	}
	.mobsters-add-button:hover {
		opacity: 0.7;
	}
	.mobster-delete-button {
		margin-left: auto;
		opacity: 0.7;
		transition: opacity 0.5s ease-out;
	}
	.mobster-delete-button:hover {
		opacity: 1;
	}
	li {
		display: flex;
	}
	.active {
		font-weight: bold;
	}
</style>
