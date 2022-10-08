<script lang="ts">
	import SiteHeader from '../../components/SiteHeader.svelte';
	import Peer from '../../components/Peer.svelte';
	import Mobsters from '../../components/Mobsters.svelte';
	import { broadcast } from '../../stores';

	function updateBroadcastState() {
		$broadcast = {
			lastChange: Date.now()
		}
	}
</script>


<SiteHeader on:timerConfigUpdated={updateBroadcastState} />

<Peer />

<Mobsters on:mobstersUpdated={updateBroadcastState} />
