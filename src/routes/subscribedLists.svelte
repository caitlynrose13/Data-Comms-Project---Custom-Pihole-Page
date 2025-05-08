<script lang="ts">
	type Adlist = {
		id: number;
		address: string;
		comment: string | null;
		groups: number[];
		enabled: boolean;
		date_added: number;
		date_modified: number;
		date_updated: number;
		type: 'block';
		number: number;
		invalid_domains: number;
		abp_entries: number;
		status: number;
	};

	import type { PageData } from './$types';
	import Domains from "./domainLists.svelte";
	import { onMount } from 'svelte';
	export let data: PageData;

	let searchQuery = '';
	let adlists: Adlist[] = [];
	let newAddress = '';
	let newComment = '';

	let currentPage = 1;
	const itemsPerPage = 10;

	let isLoading = false; // to show when loading update

	let activeSection: 'lists' | 'domains' = 'lists'; //toggle to display either lists or domains

// Filter based on search query
$: filteredAdlists = adlists.filter((list) =>
	list.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
	(list.comment ?? '').toLowerCase().includes(searchQuery.toLowerCase())
);

// Recalculate pagination on filtered results
$: totalPages = Math.max(1, Math.ceil(filteredAdlists.length / itemsPerPage));

$: paginatedAdlists = filteredAdlists.slice(
	(currentPage - 1) * itemsPerPage,
	currentPage * itemsPerPage
);

	// Fetch adlists from the server
	async function fetchAdlists(clientGroup : PageData['clientGroup']) {
		try {
			const res = await fetch('/api/lists');
			if (res.ok) {
				const data = await res.json();
				adlists = data.lists;
				
				//Filter Lists for client group only
				adlists = adlists.filter(list => list.groups.includes(Number(clientGroup)))	;
				console.log(adlists)	
			} else {
				console.error('Failed to fetch adlists:', res.statusText);
			}
		} catch (error) {
			console.error('Error fetching adlists:', error);
		}
	}

	//update the onmount to have an if - to prevent undefined client group early execution
	onMount(() => {
    if (data.clientGroup) {
		console.log("Client group ", data.clientGroup)
      fetchAdlists(data.clientGroup);
    }
  });

	// Add a new adlist entry
	async function handleAdd(type: 'allow' | 'block') {
		if (!newAddress || !data.clientGroup) {
			alert('Missing domain or group info.');
			console.log(data.clientGroup)
			return;
		}

		const listPayload = {
			address: newAddress,
			type: type,
			comment: newComment || '',
			groups: [data.clientGroup],
			enabled: true
		};

		console.log(listPayload);
		try {
			const res = await fetch('/api/lists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(listPayload)
			});

			if (res.ok) {
				await fetchAdlists(data.clientGroup); // Refresh list after adding
				newAddress = '';
				newComment = '';
			} else {
				console.error('Failed to add domain:', await res.text());
			}
		} catch (err) {
			console.error('Failed to add domain:', err);
		}
	}

	// Delete an adlist entry
	async function handleDelete(list: Adlist) {
		const encodedAddress = encodeURIComponent(list.address);
		const url = `/api/lists/${encodedAddress}?type=${list.type}`;

		try {
			const res = await fetch(url, {
				method: 'DELETE',
				headers: {
					accept: 'application/json'
				}
			});

			if (res.ok) {
				await fetchAdlists(data.clientGroup); // Refresh list after deletion
			} else {
				console.error('Failed to delete list:', await res.text());
			}
		} catch (err) {
			console.error('Error during delete:', err);
		}
	}

	//update the gravity list on modficiation
	async function triggerPiholeUpdate() {
		isLoading = true;
		isLoading = true;
		try {
			const res = await fetch('http://192.168.0.200:3001/api/trigger-pihole-update', {
				method: 'POST'
			});

			if (!res.ok) {
				console.error('Failed to trigger Pi-hole update:', await res.text());
			}
		} catch (err) {
			console.error('Error triggering Pi-hole update:', err);
		} finally {
			isLoading = false;
		}	
}

</script>

<style>
	.page-header {
		margin-bottom: 2rem;
	}
</style>

<!-- Title -->
<div class="page-header">

</div>

<div class="section-toggle" style="margin-bottom: 1rem;">
	<button class:active-tab={activeSection === 'lists'} on:click={() => activeSection = 'lists'}>Adlists</button>
	<button class:active-tab={activeSection === 'domains'} on:click={() => activeSection = 'domains'}>Domains</button>
  </div>


<!-- Lists-->
<!-- Address Input -->
{#if activeSection === 'lists'}
<div class="box" id="add-group">
		<h2 class="box-title">List Configure</h2>

	<div class="box-body">
		<div class="form-group">
			<label for="new_address">Address:</label>
			<input
				id="new_address"
				type="text"
				class="form-control"
				bind:value={newAddress}
				placeholder="URL"
				autocomplete="off"
				spellcheck="false"
				autocapitalize="none"
				autocorrect="off"
			/>
		</div>

		<div class="form-group">
			<label for="new_comment">Comment:</label>
			<input
				id="new_comment"
				type="text"
				class="form-control"
				bind:value={newComment} 
				placeholder="List description (optional)"
			/>
		</div>

	</div>	
				<button class="btn-remove" on:click={() => handleAdd('block')}>Add Blocklist</button>
				<button class="btn-add" on:click={() => handleAdd('allow')}>Add Allowlist</button>
				<button class="btn-update" on:click={() => triggerPiholeUpdate()}>Update Changes To Come Into Effect </button>
</div>

<div style="font-size: 1.2rem; margin-top: 20px;">
	Visit <a href="https://firebog.net/" target="_blank" rel="noopener noreferrer">Firebog</a> for useful blocklists and resources.
  </div>
<!-- Allow user to search through domains -->
<div class="form-group">
	<div class="page-header">

	</div>
	<label for="search">Search Lists:</label>
	<input
		id="search"
		type="text"
		class="form-control"
		bind:value={searchQuery}
		placeholder="Enter domain or comment..."
		autocomplete="off"
	/>
</div>

<!-- Loader -->
{#if isLoading}
	<div class="loading-indicator">
		⏳ Updating Pi-hole... Please wait.
	</div>
{/if}

<!-- Table -->
<div class="box" id="lists-list">
	<div class="box-header with-border">
		<h3 class="box-title">Current Lists</h3>
	</div>

	<div class="box-body table-wrapper">
		<table>
			<thead>
				<tr>
					<th>Address</th>
					<th>Type</th>
					<th>Comment</th>
					<th></th>
				</tr>
			</thead>
			<tbody>
				{#each paginatedAdlists as list}
					<tr>
						<td>{list.address}</td>
						<td>{list.type === 'block' ? '🚫 Block' : '✅ Allow'}</td>
						<td>{list.comment}</td>
						<td>
							<button class="btn-delete" on:click={() => handleDelete(list)}>
								Delete
							</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
<div class="pagination">
	<button on:click={() => currentPage--} disabled={currentPage === 1}>Previous</button>
	<span>Page {currentPage} of {totalPages}</span>
	<button on:click={() => currentPage++} disabled={currentPage === totalPages}>Next</button>
</div>
{/if}

<!--Domains-->
{#if activeSection === 'domains'}
<Domains {data} />
{/if}

