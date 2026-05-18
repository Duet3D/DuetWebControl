<template>
	<router-view />
</template>

<script setup lang="ts">
import { MachineStatus } from "@duet3d/objectmodel";
import Piecon from "piecon";

import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useSettingsStore } from "@/stores/settings";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";

const machineStore = useMachineStore();
const settingsStore = useSettingsStore();
const uiStore = useUiStore();
const router = useRouter();

// Tune Piecon - blue progress wedge on a grey background, white outer ring; no title-bar
// fallback (we already overlay the percentage into document.title via the watcher below)
Piecon.setOptions({ color: "#1976D2", background: "#BBB", shadow: "#FFF", fallback: false });

// Attempt to connect straight away unless running in dev mode. Fire-and-forget; the store
// surfaces failures through the connectError / connectionError event bus. The .catch keeps the
// browser quiet about the unhandled rejection that would otherwise log on connect failures
if (!import.meta.env.DEV) {
	machineStore.connect().catch((e) => console.warn(e));
}

// #region Document title

const machineName = computed(() => machineStore.model.network.name || "Duet Web Control");
const status = computed(() => machineStore.model.state.status);
const jobProgress = computed(() => machineStore.jobProgress);

watch([machineName, status, jobProgress], () => {
	if (status.value === MachineStatus.disconnected) {
		document.title = `(${machineName.value})`;
		return;
	}
	const printing = isPrinting(status.value);
	const prefix = printing && jobProgress.value > 0
		? `(${(jobProgress.value * 100).toFixed(1)}%) `
		: "";
	const title = `${prefix}${machineName.value}`;
	if (document.title !== title) {
		document.title = title;
	}
}, { immediate: true });

// #endregion

// #region Favicon job progress (Piecon)

// Overlay a wedge on the favicon during prints; clear it when the print finishes. Watching
// the same machineStore.jobProgress that drives the title bar keeps the two indicators in sync
let wasPrinting = false;
watch([status, jobProgress], () => {
	const printing = isPrinting(status.value);
	if (printing && jobProgress.value > 0) {
		Piecon.setProgress(Math.min(100, Math.max(0, jobProgress.value * 100)));
	} else if (wasPrinting && !printing) {
		Piecon.reset();
	}
	wasPrinting = printing;
}, { immediate: true });

// #endregion

// #region Auto-switch to Job page on print start

// Watch the state.status edge from not-printing to printing. Gated on the user setting
// (Settings > General > Behaviour > Switch to Job page on print start). Only navigates when
// the user is on a page that doesn't already show full job controls - if they're already on
// /Job/Status or on /Job/Webcam (watching the print live) we leave them alone
let wasPrintingForNav = isPrinting(status.value);
watch(status, (current) => {
	const nowPrinting = isPrinting(current);
	if (!wasPrintingForNav && nowPrinting && settingsStore.behaviour.switchToJobOnPrintStart
		&& router.currentRoute.value.path !== "/Job/Status") {
		router.push("/Job/Status").catch(() => { /* navigation guard rejections are fine */ });
	}
	wasPrintingForNav = nowPrinting;
});

// #endregion

// #region Free-space warning on (re)connect

// Fires once when a freshly-connected machine reports a near-full SD volume (<5% free on the
// primary volume, ignoring tiny volumes under 256 MiB which trip on noise). Watching
// isConnecting catches both the initial connect and the reconnect path
const FREE_SPACE_RATIO_THRESHOLD = 0.05;
const FREE_SPACE_MIN_CAPACITY = 256 * 1024 * 1024;

watch(() => machineStore.isConnecting, (to, from) => {
	if (to || !from) {
		return;
	}
	const volumes = machineStore.model.volumes;
	if (volumes.length === 0) {
		return;
	}
	const firstVolume = volumes[0];
	const capacity = firstVolume.capacity;
	const freeSpace = firstVolume.freeSpace;
	if (capacity === null || freeSpace === null) {
		return;
	}
	const capacityNum = typeof capacity === "bigint" ? Number(capacity) : capacity;
	const freeSpaceNum = typeof freeSpace === "bigint" ? Number(freeSpace) : freeSpace;
	if (capacityNum > FREE_SPACE_MIN_CAPACITY && freeSpaceNum / capacityNum < FREE_SPACE_RATIO_THRESHOLD) {
		uiStore.log(LogLevel.warning,
			i18n.global.t("notification.freeSpaceWarning.title"),
			i18n.global.t("notification.freeSpaceWarning.message"));
	}
});

// #endregion

// #region Graceful disconnect on window unload

// Best-effort attempt to send a disconnect when the user closes the tab. `pagehide` fires only
// after the unload is committed - that way a `beforeunload` prompt the user cancels (e.g. when
// an editor still has unsaved changes) doesn't trigger a spurious disconnect that leaves the
// page connected-to-nothing. We don't await it - the browser doesn't give us time - but firing
// the request before tearing the page down lets the firmware drop the HTTP session immediately
// instead of waiting for the keep-alive timeout
window.addEventListener("pagehide", () => {
	if (machineStore.isConnected) {
		machineStore.disconnect(false).catch(() => { /* tab is going away */ });
	}
});

// #endregion
</script>
