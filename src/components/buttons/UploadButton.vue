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
			<v-list density="compact">
				<v-list-item v-for="target in targets" :key="target.key"
							 :prepend-icon="target.icon"
							 :title="$t(target.label)" @click="pick(target)" />
			</v-list>
		</v-menu>

		<input ref="fileInput" type="file" multiple hidden @change="onFilesPicked" />

		<FirmwareUpdateDialog v-model:shown="firmwareDialog.shown" :plan="firmwareDialog.plan"
							  @confirmed="onFirmwareUpdateConfirmed" @cancelled="onFirmwareUpdateCancelled" />

		<ConfigUpdatedDialog v-model:shown="configUpdatedDialog.shown" />
	</div>
</template>

<script setup lang="ts">
import type { FirmwareUpdatePlan } from "@/composables/useFirmwareInstall";
import ConfigUpdatedDialog from "@/components/dialogs/ConfigUpdatedDialog.vue";
import FirmwareUpdateDialog from "@/components/dialogs/FirmwareUpdateDialog.vue";
import { PluginBundleDetectedError, useFirmwareInstall } from "@/composables/useFirmwareInstall";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { isPrinting } from "@/utils/enums";
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
const firmwareInstall = useFirmwareInstall();

const targets: Array<TargetMeta> = [
	{ key: "start", label: "button.upload.start.caption", icon: "mdi-play", accept: ".g,.gcode,.gc,.gco,.nc,.ngc,.tap", singleFile: true },
	{ key: "gcodes", label: "button.upload.gcodes.caption", icon: "mdi-file-code", accept: ".g,.gcode,.gc,.gco,.nc,.ngc,.tap" },
	{ key: "macros", label: "button.upload.macros.caption", icon: "mdi-polymer" },
	{ key: "filaments", label: "button.upload.filaments.caption", icon: "mdi-radiobox-marked", accept: ".zip" },
	{ key: "firmware", label: "button.upload.firmware.caption", icon: "mdi-package-down", accept: ".zip,.bin,.uf2,.deb" },
];

const fileInput = ref<HTMLInputElement | null>(null);
let pendingTarget: TargetMeta | null = null;

const firmwareDialog = reactive<{ shown: boolean; plan: FirmwareUpdatePlan | null }>({
	shown: false,
	plan: null,
});
const configUpdatedDialog = reactive({ shown: false });

function pick(target: TargetMeta) {
	pendingTarget = target;
	if (!fileInput.value) {
		return;
	}
	fileInput.value.accept = target.accept ?? "*";
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
			await runFirmwareUpload(files);
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

async function runFirmwareUpload(files: Array<File>) {
	let plan: FirmwareUpdatePlan;
	try {
		plan = await firmwareInstall.planFiles(files);
	} catch (e) {
		if (e instanceof PluginBundleDetectedError) {
			await machineStore.installPlugin(e.file.name, e.file, e.archive, true);
			return;
		}
		throw e;
	}

	if (plan.files.length > 0) {
		await machineStore.upload(plan.files);
	}

	if (firmwareInstall.hasPendingUpdates(plan)) {
		firmwareDialog.plan = plan;
		firmwareDialog.shown = true;
		return;
	}

	maybePromptConfigReset(plan);
	if (plan.webInterfaceTouched && machineStore.connector?.hostname === location.host) {
		location.reload();
	}
}

async function onFirmwareUpdateConfirmed(choices: { wifiServerSpiffs: boolean }) {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (!plan) {
		return;
	}
	try {
		await firmwareInstall.runUpdate(plan, choices);
	} finally {
		maybePromptConfigReset(plan);
	}
}

function onFirmwareUpdateCancelled() {
	const plan = firmwareDialog.plan;
	firmwareDialog.plan = null;
	if (plan) {
		maybePromptConfigReset(plan);
	}
}

function maybePromptConfigReset(plan: FirmwareUpdatePlan) {
	if (plan.configReplaced && !isPrinting(machineStore.model.state.status)) {
		configUpdatedDialog.shown = true;
	}
}
</script>
