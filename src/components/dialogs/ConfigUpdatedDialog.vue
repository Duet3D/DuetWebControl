<template>
	<v-dialog v-model="shown" persistent width="640" no-click-animation @keydown.escape="cancel">
		<v-card>
			<v-card-title>
				<v-icon class="mr-2">mdi-restart</v-icon>
				{{ $t("dialog.configUpdated.title") }}
			</v-card-title>

			<v-card-text>{{ $t("dialog.configUpdated.prompt") }}</v-card-text>

			<v-card-actions>
				<v-spacer />
				<v-btn color="dialog-action" variant="text" @click="cancel">
					{{ $t("generic.cancel") }}
				</v-btn>
				<v-btn color="dialog-action" variant="text" @click="reset">
					{{ $t("dialog.configUpdated.reset") }}
				</v-btn>
				<v-btn color="dialog-action" variant="text" autofocus @click="runConfig">
					{{ $t("dialog.configUpdated.runConfig") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const shown = defineModel<boolean>("shown", { required: true });

const machineStore = useMachineStore();
const uiStore = useUiStore();

function cancel() {
	shown.value = false;
}

async function reset() {
	shown.value = false;
	try {
		await machineStore.sendCode("M999");
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("generic.error"));
	}
}

async function runConfig() {
	shown.value = false;
	try {
		await machineStore.sendCode("M98 P\"config.g\"");
	} catch (e) {
		console.warn(e);
		uiStore.notifyError(e, i18n.global.t("generic.error"));
	}
}
</script>
