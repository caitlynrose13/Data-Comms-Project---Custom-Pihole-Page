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
	import { onMount } from 'svelte';
	export let data: PageData;

	let searchQuery = '';
	let adlists: Adlist[] = [];
	let newAddress = '';
	let newComment = '';

	let currentPage = 1;
	const itemsPerPage = 10;

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
	async function fetchAdlists() {
		try {
			const res = await fetch('/api/lists');
			if (res.ok) {
				const data = await res.json();
				adlists = data.lists;

				//Filter Lists for client group only
				adlists= adlists.filter(list => list.groups.includes(data.clientGroup));

			} else {
				console.error('Failed to fetch adlists:', res.statusText);
			}
		} catch (error) {
			console.error('Error fetching adlists:', error);
		}
	}

	onMount(fetchAdlists);

	// Add a new adlist entry
	async function handleAdd(type: 'allow' | 'block') {
		if (!newAddress || !data.clientGroup) {
			alert('Missing domain or group info.');
			return;
		}

		const listPayload = {
			address: newAddress,
			type: type,
			comment: newComment || '',
			groups: [data.clientGroup],
			enabled: true
		};

		try {
			const res = await fetch('/api/lists', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify([listPayload])
			});

			if (res.ok) {
				await fetchAdlists(); // Refresh list after adding
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
				await fetchAdlists(); // Refresh list after deletion
			} else {
				console.error('Failed to delete list:', await res.text());
			}
		} catch (err) {
			console.error('Error during delete:', err);
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

<!-- Domain Input -->
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

</div>

<!-- Allow user to search through domains -->
<div class="form-group">
	<div class="page-header">

	</div>
	<label for="search">Search Domains:</label>
	<input
		id="search"
		type="text"
		class="form-control"
		bind:value={searchQuery}
		placeholder="Enter domain or comment..."
		autocomplete="off"
	/>
</div>
<!-- Table -->
<div class="box" id="lists-list">
	<div class="box-header with-border">
		<h3 class="box-title">Current Lists</h3>
	</div>

	<div class="box-body table-wrapper">
		<table>
			<thead>
				<tr>
					<th>Domain</th>
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
