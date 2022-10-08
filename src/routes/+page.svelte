<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const roomId = Date.now().toString(36);
	onMount(async () => goto(`/${roomId}`));
</script>
