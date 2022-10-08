<script lang="ts">
	import Timer from './Timer.svelte';
</script>

<header>
	<ul>
		<li><h1>Write code, don't cry.</h1></li>
		<li>
			<Timer on:timerConfigUpdated />
		</li>
	</ul>
</header>

<style>
	header {
		width: 100%;
		display: block;
		background: var(--header-background-color);
		color: var(--header-text-color);
	}
	li {
		margin-left: var(--header-item-spacing);
		margin-right: var(--header-item-spacing);
	}
	li:first-of-type {
		margin-right: auto;
	}
	ul {
		display: flex;
	}
</style>
