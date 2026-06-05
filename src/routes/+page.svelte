<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { createRoomId } from '../state';

	onMount(() => {
		const redirect = sessionStorage.redirect;
		delete sessionStorage.redirect;

		const roomId = createRoomId();
		const to = redirect && redirect !== location.pathname ? redirect : `${base}/${roomId}`;

		void goto(to);
	});
</script>
