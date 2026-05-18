<template>
	<v-btn :color="buttonColor" variant="elevated" :elevation="1" @click="clicked">
		<v-icon v-if="!isBusy" class="me-2">{{ buttonIcon }}</v-icon>
		<v-progress-circular v-else size="20" indeterminate class="me-2" />
		{{ caption }}
	</v-btn>
</template>

<script setup lang="ts">
import i18n from "@/i18n";
import { useMachineStore } from "@/stores/machine";
import { useUiStore } from "@/stores/ui";

const machineStore = useMachineStore();
const uiStore = useUiStore();

const isBusy = computed(() => machineStore.isConnecting || machineStore.isReconnecting || machineStore.isDisconnecting);

const buttonColor = computed(() => {
	if (isBusy.value) {
		return "warning";
	}
	return machineStore.isConnected ? "success" : "primary";
});

const buttonIcon = computed(() => machineStore.isConnected ? "mdi-close-circle-outline" : "mdi-power");

const caption = computed(() => {
	if (machineStore.isConnecting || machineStore.isReconnecting) {
		return i18n.global.t("button.connect.connecting");
	}
	if (machineStore.isDisconnecting) {
		return i18n.global.t("button.connect.disconnecting");
	}
	return machineStore.isConnected ? i18n.global.t("button.connect.disconnect") : i18n.global.t("button.connect.connect");
});

async function clicked() {
	if (isBusy.value) {
		return;
	}
	try {
		if (machineStore.isConnected) {
			await machineStore.disconnect();
		} else if (import.meta.env.DEV) {
			// Dev mode picks a hostname via the connect dialog instead of auto-targeting localhost
			uiStore.showConnectDialog = true;
		} else {
			await machineStore.connect();
		}
	} catch (e) {
		// The store already surfaces connect/disconnect failures through the connectError /
		// connectionError event bus; swallowing here just prevents the unhandled-rejection
		// console noise on the bare click handler
		console.warn(e);
	}
}
</script>
