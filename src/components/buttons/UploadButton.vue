<template>
	<div>
		<v-btn :elevation="1" :disabled="!canUpload"
			   :color="dropActive ? 'success' : undefined"
			   :title="$t('button.upload.start.caption')" @click="pickFile"
			   @dragover.prevent="onDragOver" @dragleave="onDragLeave" @drop.prevent="onDrop">
			<v-icon class="mr-1">mdi-cloud-upload</v-icon>
			<span class="d-none d-sm-inline">{{ $t("button.upload.start.caption") }}</span>
		</v-btn>

		<input ref="fileInput" type="file" :accept="GCODE_ACCEPT" hidden @change="onFilePicked" />
	</div>
</template>

<script setup lang="ts">
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { LogLevel, useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
import Path from "@/utils/path";

const GCODE_ACCEPT = ".g,.gcode,.gc,.gco,.nc,.ngc,.tap";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const fileInput = ref<HTMLInputElement | null>(null);
const dropActive = ref(false);

// A live job cannot be replaced by another one, so the button stays disabled until it has finished
const canUpload = computed(() => machineStore.isConnected && !uiStore.uiFrozen && !isPrinting(machineStore.model.state.status));

function pickFile() {
	fileInput.value?.click();
}

async function onFilePicked(event: Event) {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0] ?? null;
	input.value = "";
	if (file !== null) {
		await uploadAndStart(file);
	}
}

function onDragOver() {
	dropActive.value = canUpload.value;
}

// dragleave also fires when the pointer crosses onto the icon or the caption, so the highlight is
// only cleared once the pointer has left the button subtree altogether
function onDragLeave(event: DragEvent) {
	if (!(event.currentTarget as Node).contains(event.relatedTarget as Node | null)) {
		dropActive.value = false;
	}
}

async function onDrop(event: DragEvent) {
	dropActive.value = false;

	const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : [];
	if (files.length === 0 || !canUpload.value) {
		return;
	}
	if (files.length > 1) {
		uiStore.makeNotification(LogLevel.warning, i18n.global.t("button.upload.start.caption"), i18n.global.t("notification.upload.startSingleFile"));
		return;
	}
	await uploadAndStart(files[0]);
}

// Both upload() and sendCode() report their own failures, so nothing is logged again here
async function uploadAndStart(file: File) {
	const filename = Path.combine(machineStore.model.directories.gCodes, file.name);
	try {
		await machineStore.upload({ filename, content: file });
		await machineStore.sendCode(`M32 "${Path.escapeFilename(filename)}"`);
	} catch (e) {
		console.warn(e);
	}
}
</script>
