<style scoped>
.v-btn-group--vertical > .v-btn {
	width: 100%;
}
</style>

<template>
	<PanelCard icon="mdi-wrench" :title="$t('panel.jobControl.caption')">
		<v-card-text class="pt-0">
			<v-btn-group v-if="showFeedHold" direction="vertical" divided class="d-flex mt-3">
				<CodeButton color="warning" :urgent="isHeld"
							:disabled="!isPrinting || isPausing || isCancelling"
							:code="isPaused ? 'M24' : 'M25'">
					<v-icon start>{{ isPaused ? "mdi-play" : "mdi-pause" }}</v-icon>
					{{ pauseResumeText }}
				</CodeButton>
				<CodeButton color="warning" urgent
							:disabled="!canFeedHold"
							code="M25.1">
					<v-icon start>mdi-hand-back-left</v-icon>
					{{ $t("panel.jobControl.feedHold") }}
				</CodeButton>
			</v-btn-group>
			<CodeButton v-else color="warning" block class="mt-3" :urgent="isHeld"
						:disabled="!isPrinting || isPausing || isCancelling"
						:code="isPaused ? 'M24' : 'M25'">
				<v-icon start>{{ isPaused ? "mdi-play" : "mdi-pause" }}</v-icon>
				{{ pauseResumeText }}
			</CodeButton>

			<v-btn-group v-if="isHeld && jobFileName" direction="vertical" divided class="d-flex mt-3">
				<CodeButton color="error" code="M0" :disabled="isCancelling">
					<v-icon start>mdi-stop</v-icon>
					{{ cancelText }}
				</CodeButton>
				<CodeButton color="error" code="M25.1 S1" urgent :disabled="isCancelling">
					<v-icon start>mdi-cancel</v-icon>
					{{ $t("panel.jobControl.abortMotion") }}
				</CodeButton>
			</v-btn-group>
			<CodeButton v-else-if="isPaused && (jobFileName || isHeld)" block class="mt-3" color="error" :urgent="!jobFileName"
						:code="jobFileName ? 'M0' : 'M25.1 S1'" :disabled="isCancelling">
				<v-icon start>{{ jobFileName ? "mdi-stop" : "mdi-cancel" }}</v-icon>
				{{ jobFileName ? cancelText : $t("panel.jobControl.abortMotion") }}
			</CodeButton>

			<CodeButton v-if="!isPrinting && processAnotherCode" block class="mt-3" color="success"
						:code="processAnotherCode">
				<v-icon start>{{ processAnotherIcon }}</v-icon>
				{{ processAnotherText }}
			</CodeButton>
		</v-card-text>

		<template #settings>
			<v-select v-model="settings.feedHoldButton" :items="feedHoldButtonOptions"
					  item-title="label" item-value="value"
					  :label="$t('panel.jobControl.settings.feedHoldButton')"
					  v-hint="$t('panel.jobControl.settings.feedHoldButtonHint')"
					  variant="outlined" density="comfortable" hide-details />
		</template>
	</PanelCard>
</template>

<script setup lang="ts">
import { MachineMode, MachineStatus } from "@duet3d/objectmodel";

import CodeButton from "@/components/buttons/CodeButton.vue";
import PanelCard from "@/components/panels/PanelCard.vue";
import { useComponentSettings } from "@/composables/useComponentSettings";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { FeedHoldButton } from "@/stores/settings";
import { isPaused as isPausedEnum, isPrinting as isPrintingEnum } from "@/utils/enums";
import { escapeFilename } from "@/utils/path";

const machineStore = useMachineStore();

interface JobControlPanelSettings {
	// When to show the feed hold button under the pause button
	feedHoldButton: FeedHoldButton;
}

const settings = useComponentSettings<JobControlPanelSettings>({
	feedHoldButton: FeedHoldButton.cncOnly
});

const feedHoldButtonOptions = computed(() => [
	{ label: i18n.global.t("panel.jobControl.settings.feedHoldButtonOptions.cncOnly"), value: FeedHoldButton.cncOnly },
	{ label: i18n.global.t("panel.jobControl.settings.feedHoldButtonOptions.always"), value: FeedHoldButton.always },
	{ label: i18n.global.t("panel.jobControl.settings.feedHoldButtonOptions.never"), value: FeedHoldButton.never }
]);

const isSimulating = ref(false);

const status = computed(() => machineStore.model.state.status);
const machineMode = computed(() => machineStore.model.state.machineMode);

const isPrinting = computed(() => isPrintingEnum(status.value));
const isPaused = computed(() => isPausedEnum(status.value));
const isPausing = computed(() => status.value === MachineStatus.pausing);
const isCancelling = computed(() => status.value === MachineStatus.cancelling);
const isHeld = computed(() => status.value === MachineStatus.held);
const jobFileName = computed(() => machineStore.model.job.file.fileName);

// A feed hold applies to any motion and to a job between moves
const canFeedHold = computed(() => !isHeld.value && !isCancelling.value && (machineStore.model.move.currentMove.requestedSpeed > 0 || isPrinting.value));

const showFeedHold = computed(() => {
	const mode = settings.value.feedHoldButton;
	return mode === FeedHoldButton.always || (mode === FeedHoldButton.cncOnly && machineMode.value === MachineMode.cnc);
});

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
