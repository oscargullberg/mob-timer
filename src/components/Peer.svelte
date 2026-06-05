<script lang="ts">
	import { onMount, untrack } from 'svelte';
	import { broadcast, isMainPeer, mobsters, timerState } from '../stores';
	import { parsePeerMessage } from '../peer-message';
	import { Peer } from 'peerjs';
	import type { DataConnection } from 'peerjs';
	import {
		isNewerAppStateVersion,
		isSameOrNewerAppStateVersion,
		snapshotTimerState
	} from '../state';
	import type { AppStateVersion, Mobster, TimerState } from '../state';

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
	let currentStateVersion = $state<AppStateVersion>({ updatedAt: 0, originPeerId: '' });

	$effect(() => {
		const change = $broadcast;
		untrack(() => {
			const version = createLocalVersion(change.lastChange);
			if (version) {
				publishState($mobsters, $timerState, version);
			}
		});
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
			$isMainPeer = false;
			peer?.destroy();
		};
	});

	async function setupPeer() {
		peer = await createPeer();
		isMainNode = peer.id === peerRoomId;
		$isMainPeer = isMainNode;
		if (isMainNode) {
			currentStateVersion = { ...currentStateVersion, originPeerId: peer.id };
		}

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
					case 'PROPOSE_APP_STATE':
						if (conn.peer !== msg.payload.peerId) {
							return;
						}

						if (!isNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
							conn.send(
								JSON.stringify(
									createSetAppStateMessage($mobsters, $timerState, currentStateVersion)
								)
							);
							return;
						}

						$mobsters = msg.payload.mobsters;
						$timerState = {
							...msg.payload.timerState,
							updatedAt: Date.now()
						};
						currentStateVersion = msg.payload.version;

						broadcastState($mobsters, $timerState, currentStateVersion);
						break;
					case 'GOSSIP_APP_STATE':
						if (conn.peer !== msg.payload.peerId) {
							return;
						}

						if (!isNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
							return;
						}

						$mobsters = msg.payload.mobsters;
						$timerState = {
							...msg.payload.timerState,
							updatedAt: Date.now()
						};
						currentStateVersion = msg.payload.version;
						broadcastState($mobsters, $timerState, currentStateVersion);
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
									timerState: snapshotTimerState($timerState),
									version: currentStateVersion,
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
		conn.on('data', (data) => handleRegularPeerData(conn, data));
		conn.on('close', () => onConnectionClose(conn));

		regularPeer.on('connection', (conn) => {
			connections[conn.peer] = conn;
			conn.on('data', (data) => handleRegularPeerData(conn, data));
			conn.on('close', () => {
				delete connections[conn.peer];
			});
		});
	}

	function handleRegularPeerData(conn: DataConnection, data: unknown) {
		const msg = parsePeerMessage(data);
		if (!msg) {
			return;
		}
		console.debug('Received msg', msg);

		switch (msg.type) {
			case 'SET_APP_STATE':
				if (conn.peer !== peerRoomId || msg.payload.peerId !== peerRoomId) {
					return;
				}

				if (!isSameOrNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
					return;
				}

				$mobsters = msg.payload.mobsters;
				$timerState = msg.payload.timerState;
				currentStateVersion = msg.payload.version;
				break;
			case 'GOSSIP_APP_STATE':
				if (conn.peer !== msg.payload.peerId) {
					return;
				}

				if (!isNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
					return;
				}

				$mobsters = msg.payload.mobsters;
				$timerState = msg.payload.timerState;
				currentStateVersion = msg.payload.version;
				break;
			case 'SET_PEERLIST':
				if (conn.peer !== peerRoomId) {
					return;
				}

				peerList = new Set(msg.payload.peerIds);
				console.debug('Set peerList', peerList);
				break;
		}
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

	function publishState(mobsters: Mobster[], timerState: TimerState, version: AppStateVersion) {
		if (isMainNode) {
			currentStateVersion = version;
			broadcastState(mobsters, timerState, version);
		} else {
			currentStateVersion = version;
			sendStateToMainPeer(mobsters, timerState, version);
			gossipStateToPeers(mobsters, timerState, version);
		}
	}

	function sendStateToMainPeer(
		mobsters: Mobster[],
		timerState: TimerState,
		version: AppStateVersion
	) {
		if (!peer?.open) {
			return;
		}

		const conn = connections[peerRoomId];
		if (!conn?.open) {
			return;
		}

		conn.send(
			JSON.stringify(createAppStateMessage('PROPOSE_APP_STATE', mobsters, timerState, version))
		);
	}

	function gossipStateToPeers(
		mobsters: Mobster[],
		timerState: TimerState,
		version: AppStateVersion
	) {
		if (!peer?.open) {
			return;
		}

		const msg = createAppStateMessage('GOSSIP_APP_STATE', mobsters, timerState, version);

		for (let peerId of peerList.keys()) {
			if (peerId === peer.id || peerId === peerRoomId) {
				continue;
			}

			const conn = connections[peerId];
			if (conn?.open) {
				conn.send(JSON.stringify(msg));
			} else {
				const newConn = peer.connect(peerId, { reliable: true }).on('open', () => {
					connections[peerId] = newConn;
					newConn.send(JSON.stringify(msg));
				});
			}
		}
	}

	function broadcastState(mobsters: Mobster[], timerState: TimerState, version: AppStateVersion) {
		if (!peer?.open) {
			return;
		}

		const msg = createSetAppStateMessage(mobsters, timerState, version);

		for (let peerId of peerList.keys()) {
			if (peerId === peer.id) {
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

	function createSetAppStateMessage(
		mobsters: Mobster[],
		timerState: TimerState,
		version: AppStateVersion
	) {
		return createAppStateMessage('SET_APP_STATE', mobsters, timerState, version);
	}

	function createAppStateMessage(
		type: 'SET_APP_STATE' | 'PROPOSE_APP_STATE' | 'GOSSIP_APP_STATE',
		mobsters: Mobster[],
		timerState: TimerState,
		version: AppStateVersion
	) {
		return {
			type,
			payload: {
				mobsters,
				timerState: snapshotTimerState(timerState),
				version,
				peerId: peer?.id ?? ''
			}
		};
	}

	function createLocalVersion(requestedAt: number): AppStateVersion | undefined {
		if (!peer?.id || !requestedAt) {
			return undefined;
		}

		return {
			updatedAt: Math.max(requestedAt, Date.now(), currentStateVersion.updatedAt + 1),
			originPeerId: peer.id
		};
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
				isMainNode = true;
				$isMainPeer = true;
				peer = setupMainPeer(mainPeerCandidate);
				broadcastState($mobsters, $timerState, currentStateVersion);
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
