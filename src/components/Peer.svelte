<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { mobsters, timerConfig, timer, broadcast } from '../stores';
	import { parsePeerMessage } from '../peer-message';
	import { Peer } from 'peerjs';
	import type { DataConnection } from 'peerjs';
	import type { Mobster, TimerConfig } from '../state';

	type Props = {
		roomId: string;
	};

	let { roomId: routeRoomId }: Props = $props();
	const cleanedPathParam = $derived(routeRoomId.replace(/[^a-z0-9 -]/gi, ''));
	const peerRoomId = $derived(`${cleanedPathParam}-mob-bois-2k`);

	let peer: Peer | undefined;
	let isMainNode = $state(false);
	let peerList = $state(new Set<string>());
	let connections = $state<Record<string, DataConnection>>({});

	$effect(() => {
		$broadcast;
		untrack(() => broadcastState($mobsters, $timerConfig));
	});

	onMount(() => {
		void setupPeer();

		function handleBeforeUnload() {
			if (isMainNode) {
				broadcastPeerList();
			}
			peer?.destroy();
		}

		window.addEventListener('beforeunload', handleBeforeUnload);

		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			peer?.destroy();
		};
	});

	async function setupPeer() {
		peer = await createPeer();
		isMainNode = peer.id === peerRoomId;

		if (isMainNode) {
			setupMainPeer(peer);
		} else {
			setupRegularPeer(peer);
		}
	}

	function createPeer(): Promise<Peer> {
		return new Promise((resolve, reject) => {
			let mainPeerCandidate = new Peer(peerRoomId);
			mainPeerCandidate.once('error', (err) => {
				if (isPeerUnavailableError(err)) {
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
		peerList.add(peerRoomId);
		mainPeer.on('connection', (conn) => {
			conn.on('data', (data) => {
				const msg = parsePeerMessage(data);
				if (!msg) {
					return;
				}

				switch (msg.type) {
					case 'SET_APP_STATE':
						$mobsters = msg.payload.mobsters;
						$timerConfig = msg.payload.timerConfig;
						$timer = msg.payload.timer;

						broadcastState($mobsters, $timerConfig, [msg.payload.peerId]);
						break;
					case 'INIT':
						const { peerId } = msg.payload;
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
		const conn = regularPeer.connect(peerRoomId, { reliable: true });
		conn.on('open', () => {
			connections[peerRoomId] = conn;
			const msg = JSON.stringify({
				type: 'INIT',
				payload: {
					peerId: regularPeer.id
				}
			});
			conn.send(msg);
		});
		conn.on('data', (data) => {
			const msg = parsePeerMessage(data);
			if (!msg) {
				return;
			}
			console.debug('Received msg', msg);

			switch (msg.type) {
				case 'SET_APP_STATE':
					$mobsters = msg.payload.mobsters;
					$timerConfig = msg.payload.timerConfig;
					$timer = msg.payload.timer;
					break;
				case 'SET_PEERLIST':
					peerList = new Set(msg.payload.peerIds);
					console.debug('Set peerList', peerList);
					break;
			}
		});
		conn.on('close', () => onConnectionClose(conn));
	}

	function broadcastPeerList() {
		if (!peer) {
			return;
		}
		const currentPeerId = peer.id;

		const msg = {
			type: 'SET_PEERLIST',
			payload: { peerIds: Array.from(peerList) }
		};
		for (let conn of Object.entries(connections)
			.filter(([peerId, _]) => peerId != currentPeerId)
			.map(([_, conn]) => conn)) {
			conn.send(JSON.stringify(msg));
		}
	}

	function broadcastState(
		mobsters: Mobster[],
		timerConfig: TimerConfig,
		excludePeerIds: string[] = []
	) {
		if (!peer?.open) {
			return;
		}

		const excludedPeerIds = [...excludePeerIds, peer.id];
		const msg = {
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
			let mainPeerCandidate = new Peer(peerRoomId);
			mainPeerCandidate.once('error', (err) => {
				if (isPeerUnavailableError(err)) {
					console.debug('Main node id is unavailable. Not fast enough');
				}
			});
			mainPeerCandidate.once('open', (id) => {
				peer?.destroy();
				connections = {};
				peer = setupMainPeer(mainPeerCandidate);
				console.debug('Taking over main');
			});
		}
	}

	function isPeerUnavailableError(err: unknown) {
		return (
			typeof err === 'object' && err !== null && 'type' in err && err.type === 'unavailable-id'
		);
	}
</script>
