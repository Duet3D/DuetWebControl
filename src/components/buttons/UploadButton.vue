<template>
	<div>
		<v-menu>
			<template #activator="{ props: activatorProps }">
				<v-btn v-bind="activatorProps" :elevation="1"
					   :disabled="!machineStore.isConnected || uiStore.uiFrozen"
					   :title="$t('button.upload.start.caption')">
					<v-icon class="mr-1">mdi-cloud-upload</v-icon>
					<span class="d-none d-sm-inline">{{ $t("button.upload.start.caption") }}</span>
				</v-btn>
			</template>
			<v-list :density="controlDensity">
				<v-list-item v-for="target in targets" :key="target.key"
							 :prepend-icon="target.icon"
							 :title="$t(target.label)" @click="pick(target)" />
			</v-list>
		</v-menu>

		<input ref="fileInput" type="file" multiple hidden @change="onFilesPicked" />

		<FirmwareUpdateDialog v-model:shown="firmwareDialog.shown" :plan="firmwareDialog.plan"
							  @confirmed="firmwareController.onFirmwareUpdateConfirmed"
							  @cancelled="firmwareController.onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="configUpdatedDialog.shown" />
	</div>
</template>

<script setup lang="ts">
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import { useFirmwareInstallController } from "@/composables/useFirmwareInstallController";
import { useLargeButtons } from "@/composables/useLargeButtons";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import Path from "@/utils/path";

type UploadTarget = "start" | "gcodes" | "macros" | "filaments" | "firmware";

interface TargetMeta {
	key: UploadTarget;
	label: string;
	icon: string;
	accept?: string;
	singleFile?: boolean;
}

const machineStore = useMachineStore();
const uiStore = useUiStore();
const firmwareController = useFirmwareInstallController();
const { firmwareDialog, configUpdatedDialog } = firmwareController;
const { controlDensity } = useLargeButtons();

const targets: Array<TargetMeta> = [
	{ key: "start", label: "button.upload.start.caption", icon: "mdi-play", accept: ".g,.gcode,.gc,.gco,.nc,.ngc,.tap", singleFile: true },
	{ key: "gcodes", label: "button.upload.gcodes.caption", icon: "mdi-file-code", accept: ".g,.gcode,.gc,.gco,.nc,.ngc,.tap" },
	{ key: "macros", label: "button.upload.macros.caption", icon: "mdi-polymer" },
	{ key: "filaments", label: "button.upload.filaments.caption", icon: "mdi-radiobox-marked", accept: ".zip" },
	{ key: "firmware", label: "button.upload.firmware.caption", icon: "mdi-package-down" },
];

// .deb is only usable in SBC mode (installSystemPackage); .crt/.key are HTTPS certs
function firmwareAccept(): string {
	return machineStore.model.sbc !== null ? ".zip,.bin,.uf2,.deb,.crt,.key" : ".zip,.bin,.uf2,.crt,.key";
}

const fileInput = ref<HTMLInputElement | null>(null);
let pendingTarget: TargetMeta | null = null;

function pick(target: TargetMeta) {
	pendingTarget = target;
	if (!fileInput.value) {
		return;
	}
	fileInput.value.accept = target.key === "firmware" ? firmwareAccept() : (target.accept ?? "*");
	fileInput.value.multiple = !target.singleFile;
	fileInput.value.click();
}

async function onFilesPicked(event: Event) {
	const input = event.target as HTMLInputElement;
	const files = input.files ? Array.from(input.files) : [];
	input.value = "";
	const target = pendingTarget;
	pendingTarget = null;
	if (!target || files.length === 0) {
		return;
	}

	try {
		if (target.key === "firmware") {
			await firmwareController.runFirmwareUpload(files);
		} else {
			await runPlainUpload(target.key, files);
		}
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("button.upload.caption"));
	}
}

async function runPlainUpload(targetKey: Exclude<UploadTarget, "firmware">, files: Array<File>) {
	const directory = directoryForTarget(targetKey);
	const payload = files.map((file) => ({
		filename: Path.combine(directory, file.name),
		content: file,
	}));
	await machineStore.upload(payload);
	if (targetKey === "start" && files.length === 1) {
		const fullPath = Path.combine(directory, files[0].name);
		await machineStore.sendCode(`M32 "${Path.escapeFilename(fullPath)}"`);
	}
}

function directoryForTarget(target: Exclude<UploadTarget, "firmware">): string {
	const dirs = machineStore.model.directories;
	switch (target) {
		case "start":
		case "gcodes":
			return dirs.gCodes;
		case "macros":
			return dirs.macros;
		case "filaments":
			return dirs.filaments;
	}
}
</script>
