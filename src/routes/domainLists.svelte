<script lang="ts">
	type Domain = {
	id: number;
	domain: string;
	unicode?: string;
	comment: string | null;
	groups: number[];
	type: 'allow' | 'deny'; // was "block" before, should be "deny"
	kind: 'exact' | 'regex'; // new required field
	enabled: boolean;
	date_added?: number;
	date_modified?: number;
};

	import type { PageData } from './$types';
	import { onMount } from 'svelte';
	export let data: PageData;

	let domains: Domain[] = [];
	let newDomain = '';
	let newDomainComment = '';
	let domainSearchQuery = '';
	let currentDomainPage = 1;
	const domainsPerPage = 10;
	let isLoading = false;

	$: filteredDomains = domains.filter((d) =>
		d.domain.toLowerCase().includes(domainSearchQuery.toLowerCase()) ||
		(d.comment ?? '').toLowerCase().includes(domainSearchQuery.toLowerCase())
	);

	$: totalDomainPages = Math.max(1, Math.ceil(filteredDomains.length / domainsPerPage));
	$: paginatedDomains = filteredDomains.slice(
		(currentDomainPage - 1) * domainsPerPage,
		currentDomainPage * domainsPerPage
	);

	async function fetchDomains(clientGroup: PageData['clientGroup']) {
	try {
		const res = await fetch(`/api/domains`);
		if (res.ok) {
			const data = await res.json();
			// Filter domains based on clientGroup
			domains = data.domains.filter((d: Domain) =>
				d.groups.includes(Number(clientGroup))
			);
		} else {
			console.error('Failed to fetch domains:', res.statusText);
		}
	} catch (error) {
		console.error('Error fetching domains:', error);
	}
}

async function handleAddDomain(type: 'allow' | 'deny') {
	if (!newDomain || !data.clientGroup) {
		alert('Missing domain or group info.');
		return;
	}

	const domainPayload = {
		domain: newDomain,
		type: type,  // allow or deny
		kind: "exact", // exact match type
		comment: newDomainComment || null,
		groups: [Number(data.clientGroup)], // Ensure clientGroup is passed as an array
		enabled: true
	};

	try {
		const res = await fetch(`/api/domains/${type}/regex`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(domainPayload),
		});

		if (res.ok) {
			await fetchDomains(data.clientGroup);
			newDomain = '';
			newDomainComment = '';
		} else {
			const errorText = await res.text();
			console.error('Failed to add domain:', errorText);
		}
	} catch (err) {
		console.error('Failed to add domain:', err);
	}
}

    //allow deletion of domains too
    async function handleDeleteDomain(domain: Domain) {
	const encodedDomain = encodeURIComponent(domain.domain);
	const url = `/api/domains/${domain.type}/${domain.kind}/${encodedDomain}`;

	try {
		const res = await fetch(url, {
			method: 'DELETE',
			headers: {
				accept: 'application/json',
			},
		});

		if (res.ok) {
			await fetchDomains(data.clientGroup);
		} else {
			console.error('Failed to delete domain:', await res.text());
		}
	} catch (err) {
		console.error('Error during delete:', err);
	}
}


    //update for domains to come into effect
	async function triggerPiholeUpdate() {
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

	onMount(() => {
		if (data.clientGroup) {
			fetchDomains(data.clientGroup);
		}
	});
</script>

<!-- Add Domain Form -->
<div >
	<h2 class="box-title">Domains Configure</h2>

	<div class="box-body">
		<div class="form-group">
			<label for="new_domain">Domain:</label>
			<input
				id="new_domain"
				type="text"
				class="form-control"
				bind:value={newDomain}
				placeholder="example.com"
				autocomplete="off"
			/>
		</div>

		<div class="form-group">
			<label for="new_comment">Comment:</label>
			<input
				id="new_comment"
				type="text"
				class="form-control"
				bind:value={newDomainComment}
				placeholder="Optional comment"
			/>
		</div>

		<button class="btn-remove" on:click={() => handleAddDomain('deny')}>Add Denied Domain</button>
		<button class="btn-add" on:click={() => handleAddDomain('allow')}>Add Allow Domain</button>
		<button class="btn-update" on:click={() => triggerPiholeUpdate()}>Update Changes To Come Into Effect</button>
	</div>
</div>


<!-- Search -->
<div  style="font-size: 1.2rem; margin-top: 20px;" class="form-group">
	<label for="search">Search Domains:</label>
	<input
		id="search"
		type="text"
		class="form-control"
		bind:value={domainSearchQuery}
		placeholder="Enter domain or comment..."
	/>
</div>

<!-- Loading Indicator -->
{#if isLoading}
<div class="loading-indicator">⏳ Updating Pi-hole... Please wait.</div>
{/if}

<!-- Domain Table -->
<div >
	<div class="box-header with-border">
		<h3 class="box-title">Current Domains</h3>
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
				{#each paginatedDomains as domain}
					<tr>
						<td>{domain.domain}</td>
						<td>{domain.type === 'deny' ? '🚫 Deny' : '✅ Allow'}</td>
						<td>{domain.comment}</td>
						<td>
							<button class="btn-delete" on:click={() => handleDeleteDomain(domain)}>Delete</button>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Pagination -->
<div class="pagination">
	<button on:click={() => currentDomainPage--} disabled={currentDomainPage === 1}>Previous</button>
	<span>Page {currentDomainPage} of {totalDomainPages}</span>
	<button on:click={() => currentDomainPage++} disabled={currentDomainPage === totalDomainPages}>Next</button>
</div>
