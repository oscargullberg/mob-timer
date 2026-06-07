<script lang="ts">
	import { mobsters, activeMobster } from '../stores';
	import { createMobster, removeMobster, setActiveMobster } from '../state';
	import { blur } from 'svelte/transition';

	type Props = {
		onMobstersUpdated?: () => void;
	};

	let { onMobstersUpdated }: Props = $props();
	let newMobsterName = $state('');

	function add(name: string) {
		const trimmedName = name.trim();
		if (!trimmedName) {
			return;
		}

		$mobsters = [...$mobsters, createMobster(trimmedName, !$activeMobster)];
		newMobsterName = '';
		onMobstersUpdated?.();
	}

	function remove(id: string) {
		$mobsters = removeMobster($mobsters, id);
		onMobstersUpdated?.();
	}

	function setActive(id: string) {
		$mobsters = setActiveMobster($mobsters, id);
		onMobstersUpdated?.();
	}
</script>

<div class="mobsters">
	<h2 class="mobsters-header">Mobsters</h2>
	<ul>
		{#each $mobsters as mobster, i (mobster.id)}
			<li out:blur={{ duration: 500 }}>
				<button
					class="mobster-name-button"
					class:active={mobster.active}
					type="button"
					onclick={() => setActive(mobster.id)}>{mobster.name}</button
				>
				<button
					class="mobster-delete-button"
					type="button"
					onclick={() => remove(mobster.id)}
					aria-label={`Remove ${mobster.name}`}>❌</button
				>
			</li>
		{/each}
	</ul>

	<form class="mobsters-add" onsubmit={(event) => (event.preventDefault(), add(newMobsterName))}>
		<input
			type="text"
			bind:value={newMobsterName}
			class="mobsters-add-input"
			aria-label="Mobster name"
			placeholder="Add a person"
			autocomplete="off"
		/>
		<button class="mobsters-add-button" type="submit" disabled={!newMobsterName.trim().length}
			>Add</button
		>
	</form>
</div>

<style>
	.mobsters {
		display: flex;
		flex-direction: column;
		width: min(100%, 22rem);
		color: #f4f6ee;
	}
	.mobsters-header {
		position: absolute;
		width: 1px;
		height: 1px;
		overflow: hidden;
		clip: rect(0 0 0 0);
		white-space: nowrap;
	}
	.mobsters-add {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
		margin-top: 0.75rem;
	}
	.mobsters-add-input {
		width: 100%;
		min-width: 0;
		border: 1px solid rgba(244, 246, 238, 0.28);
		border-radius: 6px;
		background: rgba(255, 255, 255, 0.045);
		padding: 0.65rem 0.75rem;
		color: #f4f6ee;
		font: inherit;
	}
	.mobsters-add-input::placeholder {
		color: rgba(244, 246, 238, 0.58);
	}
	.mobsters-add-input:focus {
		border-color: #a9cc45;
		outline: none;
		box-shadow: 0 0 0 3px rgba(169, 204, 69, 0.18);
	}
	.mobsters-add-button {
		color: #f4f6ee;
		background-color: #111;
		border: 2px solid rgba(244, 246, 238, 0.9);
		padding: 0.65rem 0.9rem;
		border-radius: 6px;
		font-weight: 800;
		text-transform: uppercase;
		transition:
			background-color 0.2s ease-out,
			opacity 0.2s ease-out;
	}
	.mobsters-add-button:hover {
		background-color: rgba(244, 246, 238, 0.12);
	}
	.mobsters-add-button:disabled {
		cursor: not-allowed;
		opacity: 0.45;
	}
	ul {
		display: grid;
		gap: 0.5rem;
	}
	.mobster-delete-button {
		margin-left: auto;
		border-radius: 6px;
		padding: 0.2rem 0.4rem;
		color: #f4f6ee;
		opacity: 0.65;
		transition: background-color 0.2s ease-out;
	}
	.mobster-delete-button:hover {
		background-color: rgba(244, 246, 238, 0.12);
		opacity: 1;
	}
	.mobster-name-button {
		flex: 1;
		background: none;
		border: 1px solid rgba(244, 246, 238, 0.14);
		border-radius: 6px;
		padding: 0.7rem 0.85rem;
		color: #f4f6ee;
		font-weight: 850;
		text-align: left;
		transition: background-color 0.2s ease-out;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.active {
		border-color: rgba(169, 204, 69, 0.72);
		background-color: rgba(169, 204, 69, 0.16);
		color: #cfe965;
		font-weight: bold;
	}
</style>
