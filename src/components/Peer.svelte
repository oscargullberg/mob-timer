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
	let peerReady = $state(0);

	$effect(() => {
		const change = $broadcast;
		peerReady;
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
		peerReady++;
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
			registerConnection(conn.peer, conn, handleMainPeerData);
		});
		return mainPeer;
	}

	function handleMainPeerData(conn: DataConnection, data: unknown) {
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
						JSON.stringify(createSetAppStateMessage($mobsters, $timerState, currentStateVersion))
					);
					return;
				}

				applyAppStateSnapshot(msg.payload.mobsters, msg.payload.timerState, msg.payload.version);
				broadcastState($mobsters, $timerState, currentStateVersion);
				break;
			case 'GOSSIP_APP_STATE':
				if (conn.peer !== msg.payload.peerId) {
					return;
				}

				if (!isNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
					return;
				}

				applyAppStateSnapshot(msg.payload.mobsters, msg.payload.timerState, msg.payload.version);
				broadcastState($mobsters, $timerState, currentStateVersion);
				break;
			case 'INIT':
				const { peerId } = msg.payload;
				if (conn.peer !== peerId) {
					return;
				}

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
							peerId: peer?.id ?? ''
						}
					})
				);
		}
	}

	function setupRegularPeer(regularPeer: Peer) {
		const conn = regularPeer.connect(peerRoomId, { reliable: true });
		registerConnection(peerRoomId, conn, handleRegularPeerData);
		conn.on('open', () => {
			const msg = JSON.stringify({
				type: 'INIT',
				payload: {
					peerId: regularPeer.id
				}
			});
			conn.send(msg);
			peerReady++;
		});

		regularPeer.on('connection', (conn) => {
			registerConnection(conn.peer, conn, handleRegularPeerData);
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

				applyAppStateSnapshot(msg.payload.mobsters, msg.payload.timerState, msg.payload.version);
				break;
			case 'GOSSIP_APP_STATE':
				if (conn.peer !== msg.payload.peerId) {
					return;
				}

				if (!isNewerAppStateVersion(msg.payload.version, currentStateVersion)) {
					return;
				}

				applyAppStateSnapshot(msg.payload.mobsters, msg.payload.timerState, msg.payload.version);
				gossipStateToPeers($mobsters, $timerState, currentStateVersion, conn.peer);
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
		version: AppStateVersion,
		excludePeerId?: string
	) {
		if (!peer?.open) {
			return;
		}

		const msg = createAppStateMessage('GOSSIP_APP_STATE', mobsters, timerState, version);

		for (let peerId of peerList.keys()) {
			if (peerId === peer.id || peerId === peerRoomId || peerId === excludePeerId) {
				continue;
			}

			const conn = connections[peerId];
			if (conn?.open) {
				conn.send(JSON.stringify(msg));
			} else {
				const newConn = peer.connect(peerId, { reliable: true });
				registerConnection(peerId, newConn, handleRegularPeerData);
				newConn.on('open', () => {
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
				const newConn = peer.connect(peerId, { reliable: true });
				registerConnection(peerId, newConn, handleMainPeerData);
				newConn.on('open', () => {
					console.debug('Connected to peerid ' + peerId);
					newConn.send(JSON.stringify(msg));
				});
			}
		}
	}

	function registerConnection(
		peerId: string,
		conn: DataConnection,
		handleData: (conn: DataConnection, data: unknown) => void
	) {
		connections[peerId] = conn;
		conn.on('data', (data) => handleData(conn, data));
		conn.on('close', () => {
			if (isMainNode || peerId === peerRoomId) {
				onConnectionClose(conn);
			} else {
				delete connections[peerId];
			}
		});
	}

	function applyAppStateSnapshot(
		mobstersSnapshot: Mobster[],
		timerStateSnapshot: TimerState,
		version: AppStateVersion
	) {
		$mobsters = mobstersSnapshot;
		$timerState = {
			...timerStateSnapshot,
			updatedAt: Date.now()
		};
		currentStateVersion = version;
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
			delete connections[peerRoomId];
			let mainPeerCandidate = new Peer(peerRoomId);
			mainPeerCandidate.once('error', (err) => {
				if (isPeerUnavailableError(err)) {
					console.debug('Main node id is unavailable. Not fast enough');
				}
			});
			mainPeerCandidate.once('open', (id) => {
				peer?.destroy();
				connections = {};
				peerList = new Set([peerRoomId]);
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
