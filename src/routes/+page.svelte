<script lang="ts">
	import SubscribedLists from "./subscribedLists.svelte";
	import type { PageData } from "./$types";
	export let data: PageData;
</script>

<svelte:head>
	<title>Pi-hole List Configuration</title>
</svelte:head>

<SubscribedLists {data}/> 




