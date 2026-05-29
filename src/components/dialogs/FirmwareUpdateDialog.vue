<template>
	<v-dialog v-model="shown" persistent width="720" no-click-animation @keydown.escape="cancel">
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-package-down</v-icon>
				{{ $t("dialog.update.title") }}
			</v-card-title>

			<v-card-text>
				<p>{{ $t("dialog.update.prompt") }}</p>

				<ul v-if="summaryLines.length > 0" class="mt-3 ml-4">
					<li v-for="(line, idx) in summaryLines" :key="idx">{{ line }}</li>
				</ul>

				<v-alert v-if="showSbcWarning" type="warning" variant="tonal" class="mt-3" density="compact">
					{{ $t("dialog.update.sbcWarning") }}
				</v-alert>
			</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="blue-darken-1" variant="text" @click="cancel">
					{{ $t("generic.no") }}
				</v-btn>
				<v-btn color="blue-darken-1" variant="text" @click="confirm">
					{{ $t("generic.yes") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import type { FirmwareUpdatePlan } from "@/composables/useFirmwareInstall";
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";

const props = defineProps<{
	plan: FirmwareUpdatePlan | null;
}>();

const shown = defineModel<boolean>("shown", { required: true });
const emit = defineEmits<{
	confirmed: [];
	cancelled: [];
}>();

const machineStore = useMachineStore();

const summaryLines = computed<Array<string>>(() => {
	const plan = props.plan;
	if (!plan) {
		return [];
	}

	const lines: Array<string> = [];
	const boards = plan.firmwareBoards.slice().sort((a, b) => a - b);
	if (boards.includes(0)) {
		lines.push(i18n.global.t("dialog.update.mainBoard"));
	}
	const expansion = boards.filter((b) => b > 0);
	for (const canAddress of expansion) {
		lines.push(i18n.global.t("dialog.update.expansionBoard", [canAddress]));
	}
	if (plan.wifiServer) {
		lines.push(i18n.global.t("dialog.update.wifiServer"));
	}
	if (plan.display) {
		lines.push(i18n.global.t("dialog.update.display"));
	}
	return lines;
});

// In SBC mode the Duet firmware is normally managed through the package manager, so flashing it from DWC
// should only be done when the firmware developers advise it; warn when connected to a Duet board via an SBC
const showSbcWarning = computed(() => {
	if (!machineStore.model.sbc) {
		return false;
	}
	const firstBoard = machineStore.model.boards.find((board) => board !== null);
	if (!firstBoard) {
		return false;
	}
	return firstBoard.firmwareFileName?.startsWith("Duet") ?? true;
});

function confirm() {
	shown.value = false;
	emit("confirmed");
}

function cancel() {
	shown.value = false;
	emit("cancelled");
}
</script>
