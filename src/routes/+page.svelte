<script lang="ts">
	import SubscribedLists from "./subscribedLists.svelte";
	import type { PageData } from "./$types";
	export let data: PageData;


</script>

<svelte:head>
	<title>Pi-hole List Configuration</title>
</svelte:head>


{#if data.clientExists}
	<SubscribedLists {data} />
{:else}
	<p class="text-red-600 text-center mt-4">Client not found. Please connect to the network or try again later.</p>
{/if}




