<template>
	<v-card>
		<v-card-title class="d-flex align-center pb-1">
			<v-icon size="small" class="mr-1">mdi-wrench</v-icon>
			{{ $t("panel.jobControl.caption") }}
		</v-card-title>

		<v-card-text class="pt-0">
			<CodeButton color="warning" block :disabled="!isPrinting || isPausing || isCancelling"
						:code="isPaused ? 'M24' : 'M25'">
				<v-icon start>{{ isPaused ? "mdi-play" : "mdi-pause" }}</v-icon>
				{{ pauseResumeText }}
			</CodeButton>

			<CodeButton v-if="isPaused" block class="mt-3" color="error" code="M0" :disabled="isCancelling">
				<v-icon start>mdi-stop</v-icon>
				{{ cancelText }}
			</CodeButton>

			<CodeButton v-if="!isPrinting && processAnotherCode" block class="mt-3" color="success"
						:code="processAnotherCode">
				<v-icon start>{{ processAnotherIcon }}</v-icon>
				{{ processAnotherText }}
			</CodeButton>

			<v-menu v-if="validThumbnails.length > 0" location="bottom">
				<template #activator="{ props: activatorProps }">
					<v-btn v-bind="activatorProps" color="info" block class="mt-3" :disabled="uiStore.uiFrozen">
						<v-icon start>mdi-image</v-icon>
						{{ $t("panel.jobControl.showPreview") }}
					</v-btn>
				</template>
				<v-card>
					<v-carousel hide-delimiters height="auto" :show-arrows="validThumbnails.length > 1">
						<v-carousel-item v-for="thumbnail in validThumbnails"
										 :key="`${thumbnail.format}-${thumbnail.width}x${thumbnail.height}`">
							<div class="d-flex fill-height align-center">
								<ThumbnailImg :thumbnail="thumbnail" class="mx-auto" />
							</div>
						</v-carousel-item>
					</v-carousel>
				</v-card>
			</v-menu>
		</v-card-text>
	</v-card>
</template>

<script setup lang="ts">
import { MachineMode, MachineStatus, ThumbnailInfo } from "@duet3d/objectmodel";

import CodeButton from "@/components/buttons/CodeButton.vue";
import ThumbnailImg from "@/components/misc/ThumbnailImg.vue";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";
import { isPaused as isPausedEnum, isPrinting as isPrintingEnum } from "@/utils/enums";
import { escapeFilename } from "@/utils/path";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const isSimulating = ref(false);

const status = computed(() => machineStore.model.state.status);
const machineMode = computed(() => machineStore.model.state.machineMode);

const isPrinting = computed(() => isPrintingEnum(status.value));
const isPaused = computed(() => isPausedEnum(status.value));
const isPausing = computed(() => status.value === MachineStatus.pausing);
const isCancelling = computed(() => status.value === MachineStatus.cancelling);

const pauseResumeText = computed(() => {
	if (isSimulating.value) {
		return isPaused.value ? i18n.global.t("panel.jobControl.resumeSimulation") : i18n.global.t("panel.jobControl.pauseSimulation");
	}
	if (machineMode.value === MachineMode.fff) {
		return isPaused.value ? i18n.global.t("panel.jobControl.resumePrint") : i18n.global.t("panel.jobControl.pausePrint");
	}
	return isPaused.value ? i18n.global.t("panel.jobControl.resumeJob") : i18n.global.t("panel.jobControl.pauseJob");
});

const cancelText = computed(() => {
	if (isSimulating.value) {
		return i18n.global.t("panel.jobControl.cancelSimulation");
	}
	if (machineMode.value === MachineMode.fff) {
		return i18n.global.t("panel.jobControl.cancelPrint");
	}
	return i18n.global.t("panel.jobControl.cancelJob");
});

const processAnotherCode = computed(() => {
	const job = machineStore.model.job;
	if (job.lastFileName === null) {
		return "";
	}
	if (job.lastFileSimulated && (job.lastFileAborted || job.lastFileCancelled)) {
		return `M37 P"${escapeFilename(job.lastFileName)}"`;
	}
	return `M32 "${escapeFilename(job.lastFileName)}"`;
});

const processAnotherIcon = computed(() => {
	const job = machineStore.model.job;
	if (job.lastFileSimulated && !(job.lastFileAborted || job.lastFileCancelled)) {
		return (!machineMode.value || machineMode.value === MachineMode.fff) ? "mdi-printer" : "mdi-play";
	}
	return "mdi-restart";
});

const processAnotherText = computed(() => {
	const job = machineStore.model.job;
	if (job.lastFileSimulated) {
		if (job.lastFileAborted || job.lastFileCancelled) {
			return i18n.global.t("panel.jobControl.repeatSimulation");
		}
		return (!machineMode.value || machineMode.value === MachineMode.fff)
			? i18n.global.t("panel.jobControl.printNow")
			: i18n.global.t("panel.jobControl.startJob");
	}
	if (machineMode.value === MachineMode.fff) {
		return i18n.global.t("panel.jobControl.repeatPrint");
	}
	return i18n.global.t("panel.jobControl.repeatJob");
});

// Sort largest first - the carousel shows them in this order
const validThumbnails = computed<Array<ThumbnailInfo>>(() => {
	const job = machineStore.model.job;
	if (job.file === null) {
		return [];
	}
	return job.file.thumbnails
		.filter(thumbnail => !!thumbnail.data)
		.slice()
		.sort((a, b) => (b.width * b.height) - (a.width * a.height));
});

onMounted(() => {
	isSimulating.value = status.value === MachineStatus.simulating;
});

// Latch simulating-state when a job starts so the button labels survive the later "cancelled" state
watch(isPrinting, (to) => {
	if (to) {
		isSimulating.value = status.value === MachineStatus.simulating;
	} else {
		isSimulating.value = false;
	}
});
</script>
