<template>
	<v-btn v-bind="($props as any)" :color="buttonColor" :depressed="isBusy" @click="clicked">
		<v-icon v-show="!isBusy" v-text="buttonIcon" />
		<v-progress-circular size="20" v-show="isBusy" indeterminate />
		<span class="ml-2" v-text="caption"></span>
	</v-btn>
</template>

<script lang="ts">
import { mapState } from "pinia";
import { defineComponent } from "vue";
import { VBtn } from "vuetify/components/VBtn";

import { useMachineStore } from "@/store/machine";
import { useUiStore } from "@/store/ui";

export default defineComponent({
	computed: {
		...mapState(useMachineStore, ["isConnected"]),
		isBusy(): boolean {
			const machineStore = useMachineStore();
			return machineStore.isConnecting || machineStore.isReconnecting || machineStore.isDisconnecting
		},
		buttonColor(): string {
			return this.isBusy ? "warning" : (this.isConnected ? "success" : "primary");
		},
		buttonIcon(): string {
			return this.isConnected ? "mdi-close-circle-outline" : "mdi-power";
		},
		caption(): string {
			const machineStore = useMachineStore();
			return this.$t((machineStore.isConnecting || machineStore.isReconnecting) ? "button.connect.connecting"
				: machineStore.isDisconnecting ? "button.connect.disconnecting"
					: this.isConnected ? "button.connect.disconnect"
						: "button.connect.connect");
		}
	},
	methods: {
		async clicked() {
			if (this.isBusy) {
				// Cannot disable this button because that messes up the color
				return;
			}

			if (this.isConnected) {
				// Disconnect from the current machine
				const machineStore = useMachineStore();
				await machineStore.disconnect();
			} else if (process.env.NODE_ENV === "development") {
				// Ask user for hostname before connecting
				const uiStore = useUiStore();
				uiStore.showConnectDialog = true;
			} else {
				// Connect to the host this is running on
				const machineStore = useMachineStore();
				await machineStore.connect();
			}
		}
	}
});
</script>
