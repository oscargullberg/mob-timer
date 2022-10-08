<script lang="ts">
	import { onMount } from 'svelte';
	import { mobsters, timerConfig, timer, broadcast } from '../stores';
	import { page } from '$app/stores';
	import { Peer } from 'peerjs';
	import type { DataConnection } from 'peerjs';

	type Message = {
		type: string;
		payload: any;
	};

	const cleanedPathParam = $page.params['roomId'].replace(/[^a-z0-9 -]/gi, '');
	const roomId = `${cleanedPathParam}-mob-bois-2k`;

	let peer: Peer;
	let isMainNode = false;
	let peerList: Set<string> = new Set();
	let connections: { [key: string]: DataConnection } = {};

	$: handleBroadcastStateUpdate($broadcast);

	onMount(async () => {
		await setupPeer();

		window.addEventListener('beforeunload', (e) => {
			e.preventDefault();
			if (isMainNode) {
				broadcastPeerList();
			}
			peer?.destroy();
		});
	});

	function handleBroadcastStateUpdate(_: any) {
		broadcastState($mobsters, $timerConfig);
	}

	async function setupPeer() {
		peer = await createPeer();
		isMainNode = peer.id === roomId;

		if (isMainNode) {
			setupMainPeer(peer);
		} else {
			setupRegularPeer(peer);
		}
	}

	function createPeer(): Promise<Peer> {
		return new Promise((resolve, reject) => {
			let mainPeerCandidate = new Peer(roomId);
			mainPeerCandidate.once('error', (err) => {
				if ((err as any)?.type == 'unavailable-id') {
					console.debug('Main already exists, creating new peer');
					const newPeer = new Peer();
					newPeer.once('open', () => {
						console.debug(`New peer created with id ${newPeer.id}`);
						resolve(newPeer);
					});
				} else reject(err);
			});
			mainPeerCandidate.once('open', (id) => {
				console.debug('Creating main peer');
				resolve(mainPeerCandidate);
			});
		});
	}

	function setupMainPeer(mainPeer: Peer) {
		peerList.add(roomId);
		mainPeer.on('connection', (conn) => {
			conn.on('data', (data) => {
				const msg = JSON.parse(data as string);
				const { type, payload } = msg;

				switch (type) {
					case 'SET_APP_STATE':
						$mobsters = payload.mobsters;
						$timerConfig = payload.timerConfig;
						$timer = payload.timer;

						broadcastState($mobsters, $timerConfig, [payload.peerId]);
						break;
					case 'INIT':
						const { peerId } = payload;
						console.debug(`Peer with peer id ${peerId} connected.`);
						connections[peerId] = conn;
						peerList.add(peerId);
						broadcastPeerList();
						conn.send(
							JSON.stringify({
								type: 'SET_APP_STATE',
								payload: {
									mobsters: $mobsters,
									timerConfig: $timerConfig,
									timer: $timer,
									peerId: mainPeer.id
								}
							})
						);
				}
			});
			conn.on('close', () => onConnectionClose(conn));
		});
		return mainPeer;
	}

	function setupRegularPeer(regularPeer: Peer) {
		const conn = regularPeer.connect(roomId, { reliable: true });
		conn.on('open', () => {
			connections[roomId] = conn;
			const msg = JSON.stringify({
				type: 'INIT',
				payload: {
					peerId: regularPeer.id
				}
			});
			conn.send(msg);
		});
		conn.on('data', (data) => {
			const msg = JSON.parse(data as string);
			const { type, payload } = msg;
			console.debug('Received msg', msg);

			switch (type) {
				case 'SET_APP_STATE':
					$mobsters = payload.mobsters;
					$timerConfig = payload.timerConfig;
					$timer = payload.timer;
					break;
				case 'SET_PEERLIST':
					peerList = new Set(payload.peerIds);
					console.debug('Set peerList', peerList);
					break;
			}
		});
		conn.on('close', () => onConnectionClose(conn));
	}

	function broadcastPeerList() {
		const msg = {
			type: 'SET_PEERLIST',
			payload: { peerIds: Array.from(peerList) }
		};
		for (let conn of Object.entries(connections)
			.filter(([peerId, _]) => peerId != peer.id)
			.map(([_, conn]) => conn)) {
			conn.send(JSON.stringify(msg));
		}
	}

	function broadcastState(mobsters: any, timerConfig: any, excludePeerIds: string[] = []) {
		if (!peer?.open) {
			return;
		}

		const excludedPeerIds = [...excludePeerIds, peer.id];
		const msg: Message = {
			type: 'SET_APP_STATE',
			payload: { mobsters, timerConfig, peerId: peer.id, timer: $timer }
		};

		for (let peerId of peerList.keys()) {
			if (excludedPeerIds.includes(peerId)) {
				continue;
			}

			const conn = connections[peerId];
			if (conn?.open) {
				conn.send(JSON.stringify(msg));
			} else {
				const newConn = peer.connect(peerId, { reliable: true }).on('open', () => {
					console.debug('Connected to peerid ' + peerId);
					connections[peerId] = newConn;
					newConn.send(JSON.stringify(msg));
				});
			}
		}
	}

	function onConnectionClose(connection: DataConnection) {
		if (isMainNode) {
			const peerId = Object.entries(connections).find(
				([_, conn]) => connection.connectionId == conn.connectionId
			)?.[0];
			console.debug(`Connection closed to peerId ${peerId}`);
			if (peerId) {
				console.debug(`Conn to ${peerId} closed`);
				peerList.delete(peerId);
				delete connections[peerId];
			}
			broadcastPeerList();
		} else {
			let mainPeerCandidate = new Peer(roomId);
			mainPeerCandidate.once('error', (err) => {
				if ((err as any)?.type == 'unavailable-id') {
					console.debug('Main node id is unavailable. Not fast enough');
				}
			});
			mainPeerCandidate.once('open', (id) => {
				peer.destroy();
				connections = {};
				peer = setupMainPeer(mainPeerCandidate);
				console.debug('Taking over main');
			});
		}
	}
</script>
