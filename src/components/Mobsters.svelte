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
		width: min(100%, 28rem);
		background-color: #ffffff;
		border: 1px solid rgba(17, 24, 39, 0.08);
		border-radius: 8px;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.24);
		padding: 1.5rem;
		color: #171717;
	}
	.mobsters-header {
		font-size: 1.35rem;
		font-weight: 800;
		margin-bottom: 1.25rem;
	}
	.mobsters-add {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}
	.mobsters-add-input {
		width: 100%;
		min-width: 0;
		border: 1px solid #d4d7dd;
		border-radius: 6px;
		padding: 0.65rem 0.75rem;
		font: inherit;
	}
	.mobsters-add-input:focus {
		border-color: #5b8def;
		outline: none;
		box-shadow: 0 0 0 3px rgba(91, 141, 239, 0.18);
	}
	.mobsters-add-button {
		color: var(--button-text);
		background-color: #171717;
		padding: 0.65rem 0.9rem;
		border-radius: 6px;
		font-weight: 800;
		transition:
			background-color 0.2s ease-out,
			opacity 0.2s ease-out;
	}
	.mobsters-add-button:hover {
		background-color: #2d2d2d;
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
		color: #8a1f1f;
		transition: background-color 0.2s ease-out;
	}
	.mobster-delete-button:hover {
		background-color: #fee2e2;
	}
	.mobster-name-button {
		flex: 1;
		background: none;
		border: none;
		border-radius: 6px;
		padding: 0.35rem 0.5rem;
		text-align: left;
		transition: background-color 0.2s ease-out;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.active {
		background-color: #eef4ff;
		color: #214f9b;
		font-weight: bold;
	}
</style>
