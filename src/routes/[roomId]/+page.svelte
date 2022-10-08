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

<SiteHeader on:timerConfigUpdated={updateBroadcastState} />

<Peer />

<div class="main">
	<Mobsters on:mobstersUpdated={updateBroadcastState} />
</div>

<style>
	.main {
		display: flex;
		align-items: center;
		justify-content: center;
	}
</style>
