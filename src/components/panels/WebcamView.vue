<style scoped>
.webcam-view {
	position: relative;
	overflow: hidden;
}

.media-link {
	position: absolute;
	inset: 0;
}

.webcam-view img,
.webcam-view video {
	width: 100%;
	height: 100%;
	object-fit: contain;
}

iframe {
	width: 100%;
	height: 100%;
	border: 0;
	overflow: hidden;
}

.flip-x {
	transform: scaleX(-1);
}

.flip-y {
	transform: scaleY(-1);
}

.rotate-90 {
	transform: rotate(90deg);
}

.rotate-180 {
	transform: rotate(180deg);
}

.rotate-270 {
	transform: rotate(270deg);
}
</style>

<template>
	<div class="webcam-view flex-grow-1">
		<v-responsive v-if="settingsStore.webcam.embedded" :aspect-ratio="16 / 9">
			<iframe :src="settingsStore.webcam.url" :class="classList" />
		</v-responsive>

		<a v-else-if="settingsStore.webcam.enabled" class="media-link"
		   :href="settingsStore.webcam.liveUrl || 'javascript:void(0)'">
			<video v-if="webcamIsRTC" ref="remoteVideo" autoplay playsinline :class="classList" />
			<img v-else :alt="$t('panel.webcam.alt')" :src="active ? url : ''" :class="classList">
		</a>

		<v-alert v-else type="info" variant="tonal" tile>
			{{ $t("panel.webcam.disabled") }}
		</v-alert>
	</div>
</template>

<script setup lang="ts">
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore, WebcamFlip } from "@/stores/settings";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();

const active = ref(false);
const url = ref("");
const remoteVideo = ref<HTMLVideoElement | null>(null);

const webcamIsRTC = computed(() => settingsStore.webcam.url.startsWith("ws:")
	|| settingsStore.webcam.url.startsWith("wss:"));

// Style classes derived from the flip + rotation settings
const classList = computed(() => {
	const result: Array<string> = [];
	const flip = settingsStore.webcam.flip;
	if (flip === WebcamFlip.X || flip === WebcamFlip.Both) {
		result.push("flip-x");
	}
	if (flip === WebcamFlip.Y || flip === WebcamFlip.Both) {
		result.push("flip-y");
	}
	switch (settingsStore.webcam.rotation) {
		case 90: result.push("rotate-90"); break;
		case 180: result.push("rotate-180"); break;
		case 270: result.push("rotate-270"); break;
	}
	return result;
});

let updateTimer: ReturnType<typeof setInterval> | null = null;

function update() {
	const connector = machineStore.connector;
	const hostname = connector ? connector.hostname : location.hostname;
	let urlValue = settingsStore.webcam.url.replace("[HOSTNAME]", hostname);

	if (webcamIsRTC.value) {
		// New URL -> new WebRTC session
		closeWebRTC();
		url.value = urlValue;
		connectWebRTC();
		return;
	}

	if (settingsStore.webcam.updateInterval > 0) {
		// Append a cache-busting suffix unless the user opted out (some cameras 404 on extra params)
		if (settingsStore.webcam.useFix) {
			urlValue += "_" + Math.random();
		} else {
			urlValue += (urlValue.indexOf("?") === -1 ? "?dummy=" : "&dummy=") + Math.random();
		}
		url.value = urlValue;
	} else {
		url.value = urlValue;
	}
}

// WebRTC plumbing - signaling over a plain WebSocket; the camera answers with SDP + ICE candidates
let signalingSocket: WebSocket | null = null;
let peerConnection: RTCPeerConnection | null = null;
let connectingRTC = false;

function connectWebRTC() {
	if (connectingRTC) {
		return;
	}
	connectingRTC = true;

	peerConnection = new RTCPeerConnection({});
	if (remoteVideo.value !== null) {
		const audioTrack = peerConnection.addTransceiver("audio", { direction: "recvonly" }).receiver.track;
		const videoTrack = peerConnection.addTransceiver("video", { direction: "recvonly" }).receiver.track;
		remoteVideo.value.srcObject = new MediaStream([audioTrack, videoTrack]);
	}

	signalingSocket = new WebSocket(url.value);
	signalingSocket.onerror = () => { connectingRTC = false; };
	signalingSocket.onopen = () => {
		connectingRTC = false;
		peerConnection!.addEventListener("icecandidate", (e) => {
			if (e.candidate && signalingSocket) {
				signalingSocket.send(JSON.stringify({ type: "webrtc/candidate", value: e.candidate.candidate }));
			}
		});
		peerConnection!.createOffer()
			.then(offer => peerConnection!.setLocalDescription(offer))
			.then(() => {
				signalingSocket!.send(JSON.stringify({
					type: "webrtc/offer",
					value: peerConnection!.localDescription?.sdp,
				}));
			});
	};
	signalingSocket.onmessage = (e) => {
		const msg = JSON.parse(e.data);
		if (msg.type === "webrtc/candidate") {
			peerConnection!.addIceCandidate({ candidate: msg.value, sdpMid: "0" });
		} else if (msg.type === "webrtc/answer") {
			peerConnection!.setRemoteDescription({ type: "answer", sdp: msg.value });
		}
	};
}

function closeWebRTC() {
	if (peerConnection !== null) {
		peerConnection.close();
		peerConnection = null;
	}
	if (signalingSocket !== null) {
		signalingSocket.close();
		signalingSocket = null;
	}
}

// Restart the polling timer with the current update interval. Called on mount and on every
// settings change so the user's "update interval" tweak from the Webcam settings tab takes
// effect immediately instead of after the next page visit
function restartPollingTimer() {
	if (updateTimer !== null) {
		clearInterval(updateTimer);
		updateTimer = null;
	}
	if (!settingsStore.webcam.embedded && !webcamIsRTC.value
			&& settingsStore.webcam.updateInterval > 0) {
		updateTimer = setInterval(update, settingsStore.webcam.updateInterval);
	}
}

onMounted(() => {
	active.value = true;
	if (!settingsStore.webcam.embedded) {
		update();
		restartPollingTimer();
	}
});

onBeforeUnmount(() => {
	closeWebRTC();
	if (updateTimer !== null) {
		clearInterval(updateTimer);
		updateTimer = null;
	}
	active.value = false;
});

// Re-render persistent images on any settings change; rebuild the polling timer whenever the
// update interval changes so the new cadence takes effect right away. Without this, changing
// the interval at runtime leaves the old timer firing at the old rate forever
watch(() => settingsStore.webcam, () => {
	if (settingsStore.webcam.updateInterval === 0) {
		update();
	} else {
		restartPollingTimer();
	}
}, { deep: true });
</script>
