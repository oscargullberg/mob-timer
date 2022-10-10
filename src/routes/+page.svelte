<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths'

	var redirect = sessionStorage.redirect;
    delete sessionStorage.redirect;
	const roomId = Date.now().toString(36);
	const to = redirect && redirect != location.pathname ? redirect : `${base}/${roomId}`;

	onMount(async () => goto(to));
</script>
