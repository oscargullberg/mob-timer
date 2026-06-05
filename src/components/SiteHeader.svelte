<script lang="ts">
	import Timer from './Timer.svelte';

	type Props = {
		onTimerConfigUpdated?: () => void;
		onTurnFinished?: () => void;
	};

	let { onTimerConfigUpdated, onTurnFinished }: Props = $props();
</script>

<header>
	<ul>
		<li><h1>Write code, don't cry.</h1></li>
		<li>
			<Timer {onTimerConfigUpdated} {onTurnFinished} />
		</li>
	</ul>
</header>

<style>
	header {
		width: 100%;
		background: var(--header-background-color);
		color: var(--header-text-color);
		font-weight: 700;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}
	ul {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		min-height: 4.75rem;
		padding: 0.75rem clamp(1rem, 4vw, 2rem);
	}
	h1 {
		font-size: 1rem;
		font-weight: 800;
	}

	@media (max-width: 640px) {
		ul {
			align-items: flex-start;
			flex-direction: column;
		}
	}
</style>
