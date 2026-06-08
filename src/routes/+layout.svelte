<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getUmamiConfig } from '../analytics';

	let { children }: { children: Snippet } = $props();

	const umami = getUmamiConfig(
		import.meta.env.VITE_UMAMI_WEBSITE_ID,
		import.meta.env.VITE_UMAMI_SCRIPT_URL
	);
</script>

<svelte:head>
	{#if umami}
		<script defer src={umami.scriptUrl} data-website-id={umami.websiteId}></script>
	{/if}
</svelte:head>

{@render children()}
