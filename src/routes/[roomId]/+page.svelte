<script lang="ts">
	import SiteHeader from '../../components/SiteHeader.svelte';
	import Peer from '../../components/Peer.svelte';
	import Mobsters from '../../components/Mobsters.svelte';
	import { broadcast, remaining } from '../../stores';

	$: title = `[${$remaining.minutes}:${$remaining.seconds}] - mob timer`;

	function updateBroadcastState() {
		$broadcast = {
			lastChange: Date.now()
		};
	}
</script>

<svelte:head>
	<title>{title}</title>
</svelte:head>

<div class="wrapper">
	<SiteHeader on:timerConfigUpdated={updateBroadcastState} />

	<Peer />

	<main class="main">
		<Mobsters on:mobstersUpdated={updateBroadcastState} />
	</main>
</div>

<style>
	.wrapper {
		background-color: #111;
	}
	.main {
		min-height: 93vh;
		display: flex;
		justify-content: center;
	}
</style>
