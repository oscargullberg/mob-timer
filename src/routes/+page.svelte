<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import { createRoomId } from '../state';

	onMount(() => {
		const redirect = sessionStorage.redirect;
		delete sessionStorage.redirect;

		const to =
			redirect && redirect !== location.pathname ? redirect : resolve(`/${createRoomId()}`);
		return goto(to);
	});
</script>
