<template>
	<div v-if="dragActive" class="upload-overlay">
		<UploadBackdrop />
	</div>

	<v-dialog v-model="destinationDialog" width="500">
		<v-card>
			<v-card-title>
				<v-icon class="mr-1">mdi-folder-question</v-icon>
				{{ $t("dialog.dropUpload.title") }}
			</v-card-title>
			<v-card-text>{{ destinationPrompt }}</v-card-text>
			<v-card-actions>
				<v-spacer />
				<v-btn color="blue-darken-1" variant="text" @click="destinationDialog = false">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-btn color="blue-darken-1" variant="text" @click="confirmDestination('system')">
					{{ $t("dialog.dropUpload.system") }}
				</v-btn>
				<v-btn color="blue-darken-1" variant="text" @click="confirmDestination('macro')">
					{{ $t("dialog.dropUpload.macro") }}
				</v-btn>
				<v-btn color="primary" variant="text" autofocus @click="confirmDestination('job')">
					{{ $t("dialog.dropUpload.job") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>

	<FirmwareUpdateDialog v-model:shown="firmwareController.firmwareDialog.shown"
						  :plan="firmwareController.firmwareDialog.plan"
						  @confirmed="firmwareController.onFirmwareUpdateConfirmed"
						  @cancelled="firmwareController.onFirmwareUpdateCancelled" />
	<ConfigUpdatedDialog v-model:shown="firmwareController.configUpdatedDialog.shown" />
</template>

<script setup lang="ts">
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import { useFileDrag } from "@/composables/useFileDrag";
import { useFirmwareInstallController } from "@/composables/useFirmwareInstallController";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import Path from "@/utils/path";

const machineStore = useMachineStore();
const uiStore = useUiStore();
const route = useRoute();
const firmwareController = useFirmwareInstallController();
const { draggingFiles } = useFileDrag();

// G-code job/macro/system files; anything in this set routes to one of the firmware-free targets
const GCODE_EXTENSIONS = [".g", ".gcode", ".gc", ".gco", ".nc", ".ngc", ".tap"];
// Update payloads: firmware bundles, raw binaries, SBC packages and HTTPS certificates. These
// are handed to the firmware-install pipeline, which classifies each one in detail
const UPDATE_EXTENSIONS = [".zip", ".bin", ".uf2", ".deb", ".crt", ".key"];
// A G-code file above this size is almost certainly a sliced print job; below it the file is
// just as likely a macro or a config file, so the user is asked where it should land
const JOB_SIZE_THRESHOLD = 100 * 1024;

const destinationDialog = ref(false);
const pendingFiles = ref<Array<File>>([]);

const destinationPrompt = computed(() => pendingFiles.value.length === 1
	? i18n.global.t("dialog.dropUpload.prompt")
	: i18n.global.t("dialog.dropUpload.promptMultiple"));

// The File Explorer runs its own per-directory drop handling (and the editor its overwrite /
// insert prompt), so the global overlay steps aside entirely while that route is open
function isExplorerRoute(): boolean {
	return route.path === "/Explorer" || route.path.startsWith("/Explorer/");
}

// Backdrop visibility follows the shared drag flag, minus the Explorer where the route shows
// its own backdrop
const dragActive = computed(() => draggingFiles.value && !isExplorerRoute());

function hasFiles(event: DragEvent): boolean {
	return !!event.dataTransfer && Array.from(event.dataTransfer.types).includes("Files");
}

function hasExtension(name: string, extensions: Array<string>): boolean {
	const lower = name.toLowerCase();
	return extensions.some((extension) => lower.endsWith(extension));
}

// App-bar height as published by Vuetify on <v-main> (64 px, larger on sm touchscreens); a drop
// landing above this is on the app bar, the one region excluded from the global upload action
function appBarHeight(): number {
	const main = document.querySelector(".v-main");
	const top = main ? parseInt(getComputedStyle(main).getPropertyValue("--v-layout-top")) : NaN;
	return Number.isFinite(top) ? top : 64;
}

function onDrop(event: DragEvent) {
	if (!hasFiles(event)) {
		return;
	}
	// preventDefault always runs so the browser never navigates to the dropped file
	event.preventDefault();
	// A drop on the app bar uploads nothing; one on the Explorer route is left to that route's
	// own file list / editor handlers, which see the event because propagation is not stopped
	if (event.clientY < appBarHeight() || isExplorerRoute()) {
		return;
	}
	// Everywhere else this handler is authoritative: stopPropagation keeps a page-level drop
	// zone (e.g. the Jobs file list) from also acting on the same drop
	event.stopPropagation();
	handleDroppedFiles(Array.from(event.dataTransfer!.files));
}

async function handleDroppedFiles(files: Array<File>) {
	if (files.length === 0) {
		return;
	}
	if (!machineStore.isConnected) {
		uiStore.makeNotification(LogLevel.warning, i18n.global.t("notification.upload.notConnectedTitle"),
			i18n.global.t("notification.upload.notConnected"));
		return;
	}

	if (files.every((file) => hasExtension(file.name, UPDATE_EXTENSIONS))) {
		await firmwareController.runFirmwareUpload(files);
		return;
	}

	if (files.every((file) => hasExtension(file.name, GCODE_EXTENSIONS))) {
		if (files.some((file) => file.size <= JOB_SIZE_THRESHOLD)) {
			pendingFiles.value = files;
			destinationDialog.value = true;
		} else {
			await uploadToDirectory(machineStore.model.directories.gCodes, files);
		}
		return;
	}

	uiStore.makeNotification(LogLevel.warning, i18n.global.t("notification.upload.ambiguousTitle"),
		i18n.global.t("notification.upload.ambiguous"));
}

async function confirmDestination(target: "job" | "macro" | "system") {
	destinationDialog.value = false;
	const files = pendingFiles.value;
	pendingFiles.value = [];
	if (files.length === 0) {
		return;
	}
	const directories = machineStore.model.directories;
	const directory = target === "job" ? directories.gCodes
		: target === "macro" ? directories.macros
		: directories.system;
	await uploadToDirectory(directory, files);
}

async function uploadToDirectory(directory: string, files: Array<File>) {
	try {
		const payload = files.map((file) => ({
			filename: Path.combine(directory, file.name),
			content: file,
		}));
		await machineStore.upload(payload);
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("button.upload.caption"));
	}
}

// The drop listener runs in the capture phase so it sees the event before any page-level drop
// zone and can claim it (stopPropagation) or stand aside on the Explorer route
onMounted(() => {
	window.addEventListener("drop", onDrop, true);
});

onBeforeUnmount(() => {
	window.removeEventListener("drop", onDrop, true);
});
</script>

<style scoped>
.upload-overlay {
	position: fixed;
	top: var(--v-layout-top, 64px);
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 2000;
	pointer-events: none;
}
</style>
