import type { ServerLoad } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export const load: ServerLoad = async ({ getClientAddress }: RequestEvent) => {
	//Start up get client IP address
	let clientIP = getClientAddress();
	console.log('Client IP:', clientIP);

	if (clientIP.startsWith('::ffff:')) {
		clientIP = clientIP.substring(7); //update the string to be easily compared to the results
	}

	//Next fetch the devices on pihole
	try {
		const response = await fetch('http://192.168.0.200/api/network/devices');

		if (!response.ok) {
			console.error(
				'Failed to fetch network devices from Pi-hole:',
				response.status,
				response.statusText
			);
			return {
				clientIP,
				networkDevices: null,
				clientMAC: null,
				clientGroups: null,
				error: `Failed to fetch network devices: ${response.statusText}`
			};
		}

		const networkDevicesData = await response.json();
		let clientMAC: string | null = null;
		let clientExists: boolean = false;
		const devices = networkDevicesData.devices || [];

		//Match client ip addess to device mac address WE WANT THE MAC ADDRESS INCASE OF IP CHANGES
		for (const device of devices) {
			if (device.ips && Array.isArray(device.ips)) {
				for (const ipObject of device.ips) {
					if (ipObject.ip === clientIP) {
						clientMAC = device.hwaddr || null;
						console.log('client MAC: ' + clientMAC?.toUpperCase()); //user mac
						break;
					}
				}
			}
			if (clientMAC) break;
		}

		//Now query the client to the  mac adress, to get their group list. If they dont have a group list make one
		let clientGroups: number[] | null = null;

		//Now query the client list to the mac address, to get their group list.
		if (clientMAC) {
			try {
				const clientRes = await fetch(`http://192.168.0.200/api/clients`);
				if (clientRes.ok) {
					const clientsData = await clientRes.json();
					const clientsArray = clientsData.clients;

					//Try and find a match of the client to list
					if (Array.isArray(clientsArray)) {
						const matchingClient = clientsArray.find(
							(clientObject: { client: string }) =>
								clientObject.client.toUpperCase() === clientMAC?.toUpperCase()
						);

						if (matchingClient) {
							clientGroups = matchingClient.groups || null;
							console.log('Client group IDs:', clientGroups); //list their group
							clientExists = true;
						} else {
							console.log('Client MAC address not found in the client list.');
							clientExists = false;
						}
					} else {
						console.error('Unexpected format for client list:', clientsData);
					}
				} else {
					console.error('Failed to fetch client list:', clientRes.status, clientRes.statusText);
				}
			} catch (err) {
				console.error('Error fetching client list:', err);
			}
		}

		//get the nondeafult list if they dont have a list then we gotta create one on the fly.
		let clientGroup: number | null = null;

		if (clientGroups && clientGroups.length === 2 && clientGroups.includes(0)) {
			// Normal case — extract non-default
			clientGroup = clientGroups.find((g) => g !== 0) ?? null;
		} else if (clientGroups && clientGroups.length === 1 && clientGroups[0] === 0 && clientMAC) {
			// Client is only in default group, we need to create a new one

			const groupName = `group-for-${clientMAC.replace(/:/g, '-')}`; // Safe name

			try {
				const createGroupResp = await fetch(`http://192.168.0.200/api/groups`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						name: groupName,
						comment: `Auto-created for ${clientMAC}`,
						enabled: true
					})
				});

				if (!createGroupResp.ok) {
					console.error('Failed to create new group:', createGroupResp.statusText);
				} else {
					const createdGroup = await createGroupResp.json();
					const newGroupId = createdGroup?.groups?.[0]?.id ?? null;

					if (newGroupId === null) {
						console.error('Failed to extract new group ID from creation response.');
					} else {
						// Now assign the client to group 0 and newGroupId
						const setGroupRes = await fetch(
							`http://192.168.0.200/api/clients/${clientMAC.toUpperCase()}`,
							{
								method: 'PUT',
								headers: { 'Content-Type': 'application/json' },
								body: JSON.stringify({
									groups: [0, newGroupId]
								})
							}
						);

						if (!setGroupRes.ok) {
							const err = await setGroupRes.text();
							console.error('Failed to assign new group to client:', setGroupRes.status, err);
						} else {
							clientGroup = newGroupId;
						}
					}

					// 2. Assign client to [0, newGroupId]
					const setGroupRes = await fetch(`http://192.168.0.200/api/clients/${clientMAC}`, {
						method: 'PUT',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							groups: [0, newGroupId]
						})
					});

					if (!setGroupRes.ok) {
						console.error('Failed to assign new group to client:', setGroupRes.statusText);
					} else {
						clientGroup = newGroupId;
					}
				}
			} catch (err) {
				console.error('Error creating or assigning group:', err);
			}
		}

		//Now group is obtained, yay. Next gotta add to the list and remove from the list!
		return {
			clientIP,
			networkDevices: devices,
			clientMAC,
			clientGroups,
			clientGroup,
			clientExists,
			error: null
		};
	} catch (error) {
		console.error('Error fetching network devices:', error);
		return {
			clientIP,
			networkDevices: null,
			clientMAC: null,
			clientGroups: null,
			error: `An error occurred: ${error}`
		};
	}
};
